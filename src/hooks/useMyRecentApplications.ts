import { useEffect, useMemo, useState } from "react";
import { useFrappeGetCall, useFrappeGetDocList } from "frappe-react-sdk";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";

export interface LatestComment {
    /** Plain text (HTML stripped) */
    text: string;
    /** Commenter's display name */
    user: string;
    /** Commenter's role(s), e.g. "Dean, R&D" or "R&D Staff · PI"; falls back to their designation */
    role?: string;
    timestamp: string;
}

export interface RecentApplication {
    id: string;
    doctype: string;
    /** Human title when the doctype has one (projects) */
    title?: string;
    /** Project the application is booked against, e.g. 2627R-0225-CLEG0985 (resolved after the list loads) */
    projectNo?: string;
    /** Newest comment on the application, if any (resolved after the list loads) */
    latestComment?: LatestComment | null;
    workflow_state: string;
    creation: string;
    modified: string;
    route: string;
}

interface Source {
    doctype: string;
    /** Field that ties the document to the user */
    userField: "owner" | "pi_webmail";
    extraFields?: string[];
    route: (r: any) => string;
}

// Same application types and routes the Project Staff dashboard tracks, plus the PI's own projects.
const SOURCES: Source[] = [
    {
        doctype: "Project Registration",
        userField: "pi_webmail",
        extraFields: ["project_title", "project_no"],
        route: (r) =>
            r.workflow_state === "Approved" || r.workflow_state === "Proposal Approved"
                ? `/project-details-overview/${r.name}`
                : `/project-details/${r.name}`,
    },
    { doctype: "Direct Purchase", userField: "owner", route: (r) => `/direct-purchase/${r.name}` },
    { doctype: "Indent General Form", userField: "owner", route: (r) => `/indent-general-form-details/${r.name}` },
    { doctype: "Indent Cum Sanction Sheet", userField: "owner", route: (r) => `/indent-cum-sanction-sheet?edit=${r.name}` },
    { doctype: "Temporary Advance", userField: "owner", route: (r) => `/temporary-advance/${r.name}` },
    { doctype: "Advance Settlement", userField: "owner", route: (r) => `/advance-settlement/${r.name}` },
    { doctype: "Reimbursement", userField: "owner", route: (r) => `/reimbursement/${r.name}` },
    { doctype: "Travel", userField: "owner", route: (r) => `/travel/${r.name}` },
    { doctype: "TA DA Settlement", userField: "owner", route: (r) => `/ta-da-settlement?edit=${r.name}` },
];

const PER_TYPE = 8;

// Latest comment per application, from the same whitelisted activity method the Activity Log uses
// (entries come back with type "comment"). Cached per document for the page's lifetime.
const commentCache = new Map<string, LatestComment | null>();
const commentInflight = new Map<string, Promise<LatestComment | null>>();
const stripHtml = (html: string) =>
    html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

// Frappe role -> readable label, most senior first. Roles not listed here (e.g. All_ProRnd_User) are ignored.
const ROLE_LABELS: [string, string][] = [
    ["Director", "Director"],
    ["Dean, RnD", "Dean, R&D"],
    ["Ado_RnD", "Associate Dean, R&D"],
    ["Hos, RnD (Head of Section, RnD)", "Head of Section, R&D"],
    ["staff, RnD", "R&D Staff"],
    ["head_approver_1", "Head"],
    ["Permanent Employee", "PI"],
    ["IF - Inspired Faculty", "Inspired Faculty"],
    ["Independent Researcher", "Independent Researcher"],
    ["project staff", "Project Staff"],
    ["Student", "Student"],
];
function roleLabel(roles: string[]): string | undefined {
    const have = new Set(roles);
    const labels = ROLE_LABELS.filter(([role]) => have.has(role)).map(([, label]) => label);
    return labels.length ? labels.slice(0, 2).join(" · ") : undefined;
}

// Other users' roles can't be read directly ("Has Role" is System Manager only, and get_user_roles is meant for
// the signed-in user). Listing Users filtered by a role IS permitted, so for each role of interest we ask which
// of the commenters have it. Commenters asked for in the same moment are batched into one query per role.
const rolesCache = new Map<string, string[]>();
const roleWaiters = new Map<string, ((roles: string[]) => void)[]>();
let roleFlushTimer: ReturnType<typeof setTimeout> | undefined;

async function flushRoleBatch() {
    roleFlushTimer = undefined;
    const emails = [...roleWaiters.keys()];
    const waiters = new Map(roleWaiters);
    roleWaiters.clear();

    const byEmail = new Map<string, string[]>(emails.map((e) => [e, []]));
    await Promise.all(
        ROLE_LABELS.map(async ([role]) => {
            const params = new URLSearchParams({
                filters: JSON.stringify([["name", "in", emails], ["Has Role", "role", "=", role]]),
                fields: JSON.stringify(["name"]),
                limit_page_length: "0",
            });
            try {
                const res = await fetch(`${FRAPPE_BASE_URL}/api/resource/User?${params}`, { credentials: "include" });
                if (!res.ok) return;
                const json = await res.json();
                (json?.data ?? []).forEach((u: { name: string }) => byEmail.get(u.name)?.push(role));
            } catch {
                /* this role just isn't reported */
            }
        }),
    );
    emails.forEach((e) => {
        const roles = byEmail.get(e) ?? [];
        rolesCache.set(e, roles);
        waiters.get(e)?.forEach((resolve) => resolve(roles));
    });
}

function fetchRoles(email: string): Promise<string[]> {
    const cached = rolesCache.get(email);
    if (cached) return Promise.resolve(cached);
    return new Promise((resolve) => {
        roleWaiters.set(email, [...(roleWaiters.get(email) ?? []), resolve]);
        if (!roleFlushTimer) roleFlushTimer = setTimeout(flushRoleBatch, 40);
    });
}

/** Readable role label(s) for a user, e.g. "Dean, R&D" or "R&D Staff · PI". Shared with the Activity Log. */
export async function fetchRoleLabel(email: string): Promise<string | undefined> {
    if (!email.includes("@")) return undefined;
    return roleLabel(await fetchRoles(email));
}

const personCache = new Map<string, { name?: string; role?: string }>();
const personInflight = new Map<string, Promise<{ name?: string; role?: string }>>();

/** Name and designation for a user, the same lookups the Activity Log uses. Cached per user. */
export async function fetchPerson(email: string): Promise<{ name?: string; role?: string }> {
    if (!email.includes("@")) return {};
    const cached = personCache.get(email);
    if (cached) return cached;
    const pending = personInflight.get(email);
    if (pending) return pending;
    const params = new URLSearchParams({
        filters: JSON.stringify([["user_id", "=", email]]),
        fields: JSON.stringify(["employee_name", "designation"]),
        limit_page_length: "1",
    });
    const p = fetch(`${FRAPPE_BASE_URL}/api/resource/Employee?${params}`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then(async (json) => {
            const emp = json?.data?.[0];
            let name: string | undefined = emp?.employee_name || undefined;
            if (!name) {
                const u = await fetch(`${FRAPPE_BASE_URL}/api/resource/User/${encodeURIComponent(email)}?fields=${encodeURIComponent('["full_name"]')}`, { credentials: "include" })
                    .then((res) => (res.ok ? res.json() : null))
                    .catch(() => null);
                name = u?.data?.full_name || undefined;
            }
            // Roles come first (what the person can do in the portal); designation is the fallback
            const roles = await fetchRoles(email);
            const out = { name, role: roleLabel(roles) || emp?.designation || undefined };
            personCache.set(email, out);
            return out;
        })
        .catch(() => ({}) as { name?: string; role?: string })
        .finally(() => personInflight.delete(email));
    personInflight.set(email, p);
    return p;
}

async function fetchLatestComment(doctype: string, id: string): Promise<LatestComment | null> {
    const key = `${doctype}::${id}`;
    if (commentCache.has(key)) return commentCache.get(key) ?? null;
    const pending = commentInflight.get(key);
    if (pending) return pending;
    const params = new URLSearchParams({ doctype, docname: id });
    const p = fetch(`${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.api.get_document_activity?${params}`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then(async (json) => {
            if (!json) return null; // request failed: not cached, may succeed next time
            const list: any[] = Array.isArray(json.message) ? json.message : [];
            // A put-back is logged on the workflow entry for some forms (and as a comment for others), so
            // those entries count as comments here; on a tie the put-back wins so it is not hidden by the reason comment.
            const isPutBack = (e: any) => /put\s*back/i.test(stripHtml(String(e.content ?? "")).slice(0, 40));
            const latest = list
                .filter((e) => e.content && stripHtml(String(e.content)) && (e.type === "comment" || isPutBack(e)))
                .sort((a, b) => {
                    const dt = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
                    if (Math.abs(dt) > 60_000) return dt;
                    return Number(isPutBack(b)) - Number(isPutBack(a)) || dt;
                })[0];
            let found: LatestComment | null = null;
            if (latest) {
                const email: string = latest.user_email || latest.user || "";
                const person = await fetchPerson(email);
                // The activity feed may already carry a display name; otherwise use the looked-up one
                const given: string = latest.user && latest.user !== email ? latest.user : "";
                found = {
                    text: stripHtml(String(latest.content)),
                    user: given || person.name || email.replace(/@.*/, ""),
                    role: person.role,
                    timestamp: latest.timestamp,
                };
            }
            commentCache.set(key, found);
            return found;
        })
        .catch(() => null)
        .finally(() => commentInflight.delete(key));
    commentInflight.set(key, p);
    return p;
}

// Project numbers look like 2627R-0225-CLEG0985. The field that holds one differs per doctype (and asking
// Frappe for a field a doctype lacks fails the whole list), so the full document is read for the few rows
// shown and the value that has this shape is picked, whatever the field is called. Cached per document.
const PROJECT_NO = /^\d{4}[A-Z]-\d{3,4}-[A-Z0-9]+$/;
const projectNoCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();

async function fetchProjectNo(doctype: string, id: string): Promise<string | null> {
    const key = `${doctype}::${id}`;
    if (projectNoCache.has(key)) return projectNoCache.get(key) ?? null;
    const pending = inflight.get(key);
    if (pending) return pending;
    const p = fetch(`${FRAPPE_BASE_URL}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(id)}`, { credentials: "include" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
            const doc = json?.data;
            if (!doc) return null;
            const hit = Object.values(doc).find((v) => typeof v === "string" && PROJECT_NO.test(v.trim())) as string | undefined;
            const found = hit ? hit.trim() : null;
            projectNoCache.set(key, found);
            return found;
        })
        .catch(() => null) // not cached: may succeed next time
        .finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
}

/**
 * The user's latest created/modified applications across all application types, newest first.
 * One failing doctype (e.g. no read permission) is skipped; `error` is true only when every source fails.
 */
export function useMyRecentApplications(user?: string | null, limit = 8, scan = 30) {
    // SOURCES is a module constant, so the hook count is stable across renders.
    const results = SOURCES.map((s) =>
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useFrappeGetDocList<any>(
            s.doctype,
            {
                fields: ["name", "workflow_state", "modified", "creation", ...(s.extraFields ?? [])],
                filters: [[s.userField, "=", user ?? ""]],
                orderBy: { field: "modified", order: "desc" },
                limit: PER_TYPE,
            },
            user ? undefined : null,
            { revalidateOnFocus: false },
        ),
    );

    // A project sent back can be older than the PER_TYPE most recent ones, so returned projects are asked for directly
    const returnedProjectQueries = ["%Correction%", "%Put Back%"].map((pattern) =>
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useFrappeGetDocList<any>(
            "Project Registration",
            {
                fields: ["name", "workflow_state", "modified", "creation", "project_title", "project_no"],
                filters: [["pi_webmail", "=", user ?? ""], ["workflow_state", "like", pattern]],
                orderBy: { field: "modified", order: "desc" },
                limit: 20,
            },
            user ? undefined : null,
            { revalidateOnFocus: false },
        ),
    );
    const returnedProjects = useMemo(
        () => returnedProjectQueries.flatMap((q) => q.data ?? []),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [...returnedProjectQueries.map((q) => q.data)],
    );

    // Extensions waiting for this PI (the PI inbox): not owned by the PI, so they come from the pending-application list
    const { data: pendingPi } = useFrappeGetCall<{ message: { results: any[] } }>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_application",
        {},
        user ? `pi-inbox-extensions-${user}` : null,
        { revalidateOnFocus: false },
    );
    const extensionRows = useMemo(
        () => (pendingPi?.message?.results ?? []).filter((r: any) => r.doctype === "Project Staff Extension"),
        [pendingPi],
    );

    const loadedOnce = results.some((r) => r.data !== undefined);
    const isLoading = !!user && !loadedOnce && results.some((r) => r.isLoading);
    const error = !!user && results.every((r) => !!r.error);

    // Fixed length (one entry per source, undefined until loaded) so the dependency list never changes size.
    const dataKey = results.map((r) => r.data);
    const items = useMemo<RecentApplication[]>(() => {
        const all: RecentApplication[] = [];
        SOURCES.forEach((s, i) => {
            (results[i].data ?? []).forEach((r: any) =>
                all.push({
                    id: r.name,
                    doctype: s.doctype,
                    title: r.project_title || undefined,
                    projectNo: r.project_no && r.project_no !== r.name ? String(r.project_no) : undefined,
                    workflow_state: r.workflow_state || "Draft",
                    creation: r.creation,
                    modified: r.modified,
                    route: s.route(r),
                }),
            );
        });
        const projectSource = SOURCES[0];
        returnedProjects.forEach((r: any) => {
            if (all.some((a) => a.doctype === projectSource.doctype && a.id === r.name)) return;
            all.push({
                id: r.name,
                doctype: projectSource.doctype,
                title: r.project_title || undefined,
                projectNo: r.project_no && r.project_no !== r.name ? String(r.project_no) : undefined,
                workflow_state: r.workflow_state || "Draft",
                creation: r.creation,
                modified: r.modified,
                route: projectSource.route(r),
            });
        });
        extensionRows.forEach((r: any) =>
            all.push({
                id: r.name,
                doctype: "Project Staff Extension",
                workflow_state: r.workflow_state || "Pending PI Approval",
                creation: r.creation,
                modified: r.modified,
                route: `/project-staff-extension?edit=${encodeURIComponent(r.name)}`,
            }),
        );
        // `scan` rows get their latest comment looked up (so put-backs beyond the first few are still found)
        return all.sort((a, b) => (a.modified < b.modified ? 1 : -1)).slice(0, Math.max(limit, scan));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...dataKey, extensionRows, returnedProjects, limit, scan]);

    // Fill in each row's project number (projects already carry theirs)
    const [resolved, setResolved] = useState<Record<string, string | null>>({});
    useEffect(() => {
        let cancelled = false;
        items.forEach((it) => {
            const key = `${it.doctype}::${it.id}`;
            if (it.projectNo || key in resolved) return;
            fetchProjectNo(it.doctype, it.id).then((no) => {
                if (!cancelled) setResolved((cur) => (key in cur ? cur : { ...cur, [key]: no }));
            });
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    const [comments, setComments] = useState<Record<string, LatestComment | null>>({});
    useEffect(() => {
        let cancelled = false;
        items.forEach((it) => {
            const key = `${it.doctype}::${it.id}`;
            if (key in comments) return;
            fetchLatestComment(it.doctype, it.id).then((c) => {
                if (!cancelled) setComments((cur) => (key in cur ? cur : { ...cur, [key]: c }));
            });
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    const withProjectNo = useMemo(
        () =>
            items.map((it) => {
                const key = `${it.doctype}::${it.id}`;
                return {
                    ...it,
                    projectNo: it.projectNo ?? resolved[key] ?? undefined,
                    // undefined = still loading, null = no comment
                    latestComment: key in comments ? comments[key] : undefined,
                };
            }),
        [items, resolved, comments],
    );

    // Applications whose latest comment is a put-back, wherever they fall in the scanned list
    const putBacks = useMemo(
        () =>
            withProjectNo.filter(
                (it) =>
                    // Projects (and some forms) are put back by moving the workflow to a "Put Back" / "Needs Correction (...)" state
                    /put\s*back|needs\s*correction/i.test(it.workflow_state) ||
                    (it.latestComment && /put\s*back/i.test(it.latestComment.text.slice(0, 40))),
            ),
        [withProjectNo],
    );

    // Put-backs are listed on their own, so the recent-activity list leaves them out
    const putBackIds = new Set(putBacks.map((it) => `${it.doctype}::${it.id}`));
    const items2 = withProjectNo.filter((it) => !putBackIds.has(`${it.doctype}::${it.id}`)).slice(0, limit);

    return { items: items2, putBacks, isLoading, error };
}
