import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeGetCall, useFrappeGetDoc, useFrappeGetDocList, useFrappePostCall } from "frappe-react-sdk";
import { DepartmentName } from "@/components/DepartmentName";
import { BudgetHeadName } from "@/components/BudgetHeadName";
import { ArrowLeft, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, ExternalLink, FolderKanban, Loader2, Megaphone, ShieldCheck, Search, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { recruitmentAdvertismentAPI } from "@/services/apiService";
import "@/pages/dashboards/projectStaffDashboard.css";

/**
 * Staff, RnD: advertise approved recruitments.
 * A recruitment is published when a Recruitment Advertisment record with publish = Yes exists for it;
 * otherwise it is "Not yet published". This page lists the approved Recruitment Adhoc Contractual documents,
 * lets staff open one, Publish it (or Save it for later), and moves it to the Published tab.
 */
const SKIP_KEYS = new Set(["doctype", "docstatus", "idx", "owner", "creation", "modified", "modified_by", "parent", "parenttype", "parentfield", "_user_tags", "_comments", "_assign", "_liked_by"]);
const LABELS: Record<string, string> = {
    name: "Recruitment ID",
    workflow_state: "Status",
    webmail_id: "Applicant Webmail",
    head: "Head of Department",
    pi_contact: "PI Contact",
    last_date_of_appllication: "Last Date of Application",
    last_date_of_application: "Last Date of Application",
    chairperson_webmail_id: "Chairperson Webmail",
    chairperson_name: "Chairperson",
    declaration_pi: "PI declaration",
    declaration_any: "No other benefit declaration",
    declaration_if: "Conditional declaration",
    declaration_advertisement: "Advertisement declaration",
    upfa_project_code: "Project Code",
    upfa_project_title: "Project Title",
};
const prettyLabel = (k: string) =>
    LABELS[k] ?? k.replace(/^upfa_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

type Section = { title: string; icon: React.ElementType; color: string; keys: string[] };
const SECTIONS: Section[] = [
    { title: "Recruitment", icon: Megaphone, color: "#6842d9", keys: ["name", "workflow_state", "appointment_type", "designation_type", "project_staff_designation", "designation", "no_of_posts", "number_of_posts", "walk_in"] },
    { title: "Project", icon: FolderKanban, color: "#0da875", keys: ["project_title", "upfa_project_title", "project_code", "upfa_project_code", "department", "implementation_department", "project_duration", "account_head", "funds_sanctioned", "funds_received"] },
    { title: "People", icon: User, color: "#4775e8", keys: ["webmail_id", "head", "pi_contact", "chairperson_name", "chairperson_webmail_id"] },
    { title: "Interview & Application", icon: CalendarClock, color: "#d9830f", keys: ["interview_date", "interview_time", "mode_of_interview", "interview_venue", "last_date_of_appllication", "last_date_of_application"] },
];
const DECLARATION_KEYS = ["declaration_pi", "declaration_any", "declaration_if", "declaration_advertisement"];
const CHECK_KEYS = new Set(["walk_in"]);

/** Field names differ between records (upfa_department, department_ ...); match on the plain name. */
const baseKey = (k: string) => k.replace(/^upfa_/, "").replace(/_+$/, "");
const departmentKeyOf = (doc: Record<string, any>) =>
    Object.keys(doc).find((k) => baseKey(k) === "department" && typeof doc[k] === "string" && doc[k]) ??
    Object.keys(doc).find((k) => baseKey(k) === "implementation_department" && typeof doc[k] === "string" && doc[k]);

const fmtValue = (rawKey: string, v: any): React.ReactNode => {
    const k = baseKey(rawKey);
    const str = String(v);
    if (k === "department" || k === "implementation_department") return <DepartmentName name={str} />;
    if (k === "account_head" || k === "head_of_account") return <BudgetHeadName value={str} />;
    if (/^funds_|amount|budget/.test(k) && !isNaN(Number(str))) return `₹ ${Number(str).toLocaleString("en-IN")}`;
    if (/time$/.test(k) && /^\d{2}:\d{2}/.test(str)) {
        const [h, m] = str.split(":").map(Number);
        return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
    }
    if (/(date|appllication|application)$/.test(k) || /^\d{4}-\d{2}-\d{2}/.test(str)) {
        const d = new Date(str.replace(" ", "T"));
        if (!isNaN(d.getTime())) {
            const hasTime = /\d{2}:\d{2}/.test(str);
            return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", ...(hasTime ? { hour: "2-digit", minute: "2-digit", hour12: true } : {}) });
        }
    }
    if (/webmail|email|^head$/.test(k) && str.includes("@")) return <a className="text-[var(--psd-primary)] hover:underline" href={`mailto:${str}`}>{str}</a>;
    if (/contact|phone|mobile/.test(k)) return <a className="text-[var(--psd-primary)] hover:underline" href={`tel:${str}`}>{str}</a>;
    return str;
};
const yesNo = (v: any) => (v === 1 || v === "1" || v === true || String(v).toLowerCase() === "yes" ? "Yes" : "No");
type TypeFilter = "All" | "Research" | "Consultancy" | "Others";
const TYPE_TABS: TypeFilter[] = ["All", "Research", "Consultancy", "Others"];
const TYPE_STYLES: Record<TypeFilter, { on: string; off: string }> = {
    All: { on: "bg-[#6842D9] border-[#6842D9] text-white", off: "border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] hover:bg-[var(--psd-bg)]" },
    Research: { on: "bg-[#6842D9] border-[#6842D9] text-white", off: "border-[#6842D9]/35 bg-[#6842D9]/8 text-[#5632C5] hover:bg-[#6842D9]/15 dark:text-[#C9B8FA]" },
    Consultancy: { on: "bg-[#0DA875] border-[#0DA875] text-white", off: "border-[#0DA875]/35 bg-[#0DA875]/8 text-[#0A8A60] hover:bg-[#0DA875]/15 dark:text-[#7BE0BC]" },
    Others: { on: "bg-[#64748B] border-[#64748B] text-white", off: "border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] hover:bg-[var(--psd-bg)]" },
};
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

/** One row of list_approved_recruitments */
interface ListRow {
    recruitment: string;
    type: "Research" | "Consultancy" | "Others";
    project_no?: string;
    project_title?: string;
    approved_on?: string;
    advertisement?: string;
    published?: boolean;
}
interface ListResponse {
    summary?: { total_pending: number; research: number; consultancy: number; others: number; published: number };
    pagination?: { page: number; page_length: number; total: number; total_pages: number; has_next: boolean; has_prev: boolean };
    data?: ListRow[];
}

/** All the details of one recruitment, grouped, with links resolved and values formatted (display only). */
const RecruitmentDetails: React.FC<{ name: string; fallback: any }> = ({ name, fallback }) => {
    const { data: full, isLoading } = useFrappeGetDoc<any>("Recruitment Adhoc Contractual", name);
    const doc: Record<string, any> = full ?? fallback;
    // A section key matches a document field by its plain name, so upfa_department / department_ both count
    const actual = (k: string) => (doc[k] !== undefined ? k : Object.keys(doc).find((dk) => baseKey(dk) === k));
    const has = (k: string) => {
        const a = actual(k);
        return a !== undefined && doc[a] !== undefined && doc[a] !== null && String(doc[a]).trim() !== "";
    };
    const used = new Set<string>([...SECTIONS.flatMap((x) => x.keys), ...DECLARATION_KEYS].map((k) => actual(k) ?? k));
    const others = Object.keys(doc).filter(
        (k) => !used.has(k) && !SKIP_KEYS.has(k) && has(k) && (typeof doc[k] === "string" || typeof doc[k] === "number") && !k.startsWith("_"),
    );
    const tables = Object.entries(doc).filter(([, v]) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object") as [string, Record<string, any>[]][];

    const Field = ({ k }: { k: string }) => (
        <div className="min-w-0">
            <dt className="truncate text-[10.5px] font-bold uppercase tracking-wide text-[var(--psd-muted)]">{prettyLabel(k)}</dt>
            <dd className="break-words text-[13px] font-semibold text-[var(--psd-heading)]">
                {CHECK_KEYS.has(baseKey(k)) ? yesNo(doc[actual(k) ?? k]) : fmtValue(actual(k) ?? k, doc[actual(k) ?? k])}
            </dd>
        </div>
    );
    const Card: React.FC<{ title: string; icon: React.ElementType; color: string; children: React.ReactNode }> = ({ title, icon: Icon, color, children }) => (
        <section className="overflow-hidden rounded-xl border border-[var(--psd-border)] bg-[var(--psd-surface)]">
            <h3
                className="flex items-center gap-2 border-l-4 px-3 py-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--psd-heading)]"
                style={{ borderLeftColor: color, background: `linear-gradient(90deg, color-mix(in srgb, ${color} 14%, var(--psd-surface)), var(--psd-surface))` }}
            >
                <Icon className="h-3.5 w-3.5" style={{ color }} /> {title}
            </h3>
            <div className="px-3 py-2">{children}</div>
        </section>
    );

    return (
        <>
            {isLoading && <p className="text-[11.5px] text-[var(--psd-muted)]">Loading full details…</p>}
            {SECTIONS.map((sec) => {
                const keys = sec.keys.filter(has);
                if (!keys.length) return null;
                return (
                    <Card key={sec.title} title={sec.title} icon={sec.icon} color={sec.color}>
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                            {keys.map((k) => (
                                <div key={k} className={cn(/title|venue/.test(k) && "sm:col-span-2")}><Field k={k} /></div>
                            ))}
                        </dl>
                    </Card>
                );
            })}
            {DECLARATION_KEYS.some((k) => doc[k] !== undefined) && (
                <Card title="Declarations" icon={ShieldCheck} color="#c9418f">
                    <ul className="space-y-1">
                        {DECLARATION_KEYS.filter((k) => doc[k] !== undefined).map((k) => {
                            const on = yesNo(doc[k]) === "Yes";
                            return (
                                <li key={k} className="flex items-center justify-between gap-3 text-[12.5px]">
                                    <span className="text-[var(--psd-body)]">{prettyLabel(k)}</span>
                                    <span className={cn("rounded-full border px-2 py-0.5 text-[10.5px] font-bold", on ? "border-[var(--psd-approved)]/40 bg-[var(--psd-approved-bg)] text-[#0A8A60] dark:text-emerald-300" : "border-[var(--psd-border)] bg-[var(--psd-bg)] text-[var(--psd-muted)]")}>
                                        {on ? "Yes" : "No"}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </Card>
            )}
            {tables.map(([tName, rows]) => {
                const cols = Object.keys(rows[0]).filter((c) => !SKIP_KEYS.has(c) && c !== "name" && rows.some((r) => r[c] !== null && r[c] !== undefined && String(r[c]).trim() !== ""));
                return (
                    <Card key={tName} title={`${prettyLabel(tName)} (${rows.length})`} icon={FolderKanban} color="#6842d9">
                        <div className="overflow-x-auto rounded-lg border border-[var(--psd-border)]">
                            <table className="w-full text-[12px]">
                                <thead>
                                    <tr className="bg-[#DCE6CD] dark:bg-[#34402B]">
                                        {cols.map((c) => <th key={c} className="whitespace-nowrap px-2.5 py-1 text-left text-[10.5px] font-bold uppercase tracking-wide text-[#33441F] dark:text-[#D5E2C2]">{prettyLabel(c)}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--psd-border)]">
                                    {rows.map((r, i) => (
                                        <tr key={i} className="even:bg-[var(--psd-bg)]">
                                            {cols.map((c) => (
                                                <td key={c} className="px-2.5 py-1 align-top text-[var(--psd-heading)]">
                                                    {r[c] === null || r[c] === undefined || r[c] === "" ? <span className="text-[var(--psd-muted)]">-</span> : fmtValue(c, r[c])}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                );
            })}
            {others.length > 0 && (
                <Card title="Other details" icon={Megaphone} color="#64748b">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                        {others.map((k) => <Field key={k} k={k} />)}
                    </dl>
                </Card>
            )}
        </>
    );
};

const RecruitmentAdvertisement: React.FC = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState<"pending" | "published">("pending");
    const [query, setQuery] = useState("");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("All");
    const [page, setPage] = useState(1);
    const [openName, setOpenName] = useState<string | null>(null);
    const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    // The server filters by tab (published), type and page; the summary counts do not change with the filters
    const { data: resp, isLoading, error, mutate: reload } = useFrappeGetCall<{ message: ListResponse }>(recruitmentAdvertismentAPI.listApproved, {
        page,
        published: tab === "published" ? 1 : 0,
        ...(typeFilter !== "All" ? { type: typeFilter } : {}),
    });
    const list = resp?.message;
    const summary = list?.summary;
    const pagination = list?.pagination;
    const allRows = list?.data ?? [];

    // The list rows carry no department, so read it from the recruitments on this page (one request, <= 50 names)
    const pageNames = useMemo(() => allRows.map((r) => r.recruitment), [allRows]);
    const { data: deptDocs } = useFrappeGetDocList<any>(
        "Recruitment Adhoc Contractual",
        { fields: ["*"], filters: [["name", "in", pageNames]], limit: 100 },
        pageNames.length ? undefined : null,
    );
    const deptByName = useMemo(() => {
        const m = new Map<string, string>();
        (deptDocs ?? []).forEach((d: any) => {
            const k = departmentKeyOf(d);
            if (k) m.set(d.name, d[k]);
        });
        return m;
    }, [deptDocs]);

    // Tab counts follow the selected type. The current tab's count is the list's own total; the other tab's
    // count is the summary (pending, by type) or one tiny request (published, by type).
    const { data: publishedByTypeResp } = useFrappeGetCall<{ message: ListResponse }>(
        recruitmentAdvertismentAPI.listApproved,
        { page: 1, page_length: 1, published: 1, type: typeFilter },
        tab === "pending" && typeFilter !== "All" ? undefined : null,
    );
    const pendingByType = (t: TypeFilter): number | undefined =>
        !summary ? undefined : t === "All" ? summary.total_pending : t === "Research" ? summary.research : t === "Consultancy" ? summary.consultancy : summary.others;
    const pendingTabCount = tab === "pending" ? pagination?.total : pendingByType(typeFilter);
    const publishedTabCount =
        tab === "published" ? pagination?.total : typeFilter === "All" ? summary?.published : publishedByTypeResp?.message?.pagination?.total;

    const { call: saveAd } = useFrappePostCall<{ message: any }>(recruitmentAdvertismentAPI.save);

    const goTab = (t: "pending" | "published") => { setTab(t); setPage(1); };
    const goType = (t: TypeFilter) => { setTypeFilter(t); setPage(1); };

    // The search box filters the rows on the current page
    const rows = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return allRows;
        return allRows.filter((r) => [r.recruitment, r.project_no, r.project_title, r.type].some((v) => (v ?? "").toLowerCase().includes(q)));
    }, [allRows, query]);

    // Type pill counts are the pending counts; the published tab has no per-type numbers
    const typeCount = (t: TypeFilter): number | null => {
        if (!summary) return null;
        if (tab === "published") return t === "All" ? summary.published : null;
        return t === "All" ? summary.total_pending : t === "Research" ? summary.research : t === "Consultancy" ? summary.consultancy : summary.others;
    };

    const open = allRows.find((r) => r.recruitment === openName) ?? null;

    const act = async (row: ListRow, publish: "Yes" | "No") => {
        setBusy(`${row.recruitment}:${publish}`);
        setMessage(null);
        try {
            const res = await saveAd({ recruitment_adhoc_contractual: row.recruitment, publish, ...(row.project_no ? { project_no: row.project_no } : {}) });
            if (res?.message?.status && res.message.status !== "success") throw new Error(res.message.message || "Could not save");
            await reload();
            setMessage({ kind: "ok", text: publish === "Yes" ? `${row.recruitment} is published.` : `${row.recruitment} is no longer published.` });
            setOpenName(null);
            if (publish === "Yes") goTab("published");
        } catch (e: any) {
            const text = e?._server_messages
                ? (() => {
                      try {
                          return JSON.parse(JSON.parse(e._server_messages)[0]).message;
                      } catch {
                          return e.message;
                      }
                  })()
                : e?.message || "Could not save";
            setMessage({ kind: "err", text: String(text).replace(/<[^>]+>/g, "") });
        } finally {
            setBusy(null);
        }
    };

    const pageNumbers = useMemo(() => {
        const total = pagination?.total_pages ?? 1;
        const cur = pagination?.page ?? page;
        const out: (number | "…")[] = [];
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || Math.abs(i - cur) <= 1) out.push(i);
            else if (out[out.length - 1] !== "…") out.push("…");
        }
        return out;
    }, [pagination, page]);

    return (
        <div className="psd-root min-h-screen font-sans">
            <main className="w-full space-y-2.5 pb-4">
                <header className="psd-hero relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2">
                    <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                        <button
                            onClick={() => navigate(-1)}
                            aria-label="Go back"
                            className="psd-focus grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                            <Megaphone className="size-4" strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">Task Management</div>
                            <h1 className="mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">Recruitment Advertisement</h1>
                        </div>
                    </div>
                    <p className="relative z-10 hidden text-xs text-[var(--psd-body)] md:block">Publish approved recruitments. A recruitment with no advertisement record is “Not yet published”.</p>
                </header>

                {isLoading && (
                    <div role="status" aria-live="polite" className="space-y-1">
                        <div className="psd-loadbar" />
                        <p className="text-[11.5px] font-semibold text-[var(--psd-body)]">Fetching recruitments…</p>
                    </div>
                )}

                {message && (
                    <div
                        role="status"
                        className={cn(
                            "flex items-center justify-between gap-2 rounded-xl border px-3.5 py-2 text-[12.5px] font-semibold",
                            message.kind === "ok"
                                ? "border-[var(--psd-approved)]/40 bg-[var(--psd-approved-bg)] text-[#0A8A60] dark:text-emerald-300"
                                : "border-[var(--psd-returned)]/40 bg-[var(--psd-returned-bg)] text-[#C02B3D] dark:text-rose-300",
                        )}
                    >
                        <span>{message.text}</span>
                        <button onClick={() => setMessage(null)} aria-label="Dismiss" className="opacity-70 hover:opacity-100"><X className="h-4 w-4" /></button>
                    </div>
                )}

                <div className="psd-card !rounded-xl px-3 py-2">
                    <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--psd-body)]">Project Type</div>
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {TYPE_TABS.map((t) => {
                            const on = typeFilter === t;
                            const n = typeCount(t);
                            return (
                                <button
                                    key={t}
                                    onClick={() => goType(t)}
                                    className={cn(
                                        "flex h-8 flex-shrink-0 items-center gap-2 rounded-full border px-3 text-[11px] font-bold uppercase tracking-wide transition-all duration-150",
                                        on ? `${TYPE_STYLES[t].on} shadow-sm` : TYPE_STYLES[t].off,
                                    )}
                                >
                                    {t}
                                    {n !== null && (
                                        <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-bold leading-none", on ? "bg-white/25 text-white" : "bg-white/80 text-[var(--psd-body)] dark:bg-[#18181B]/50")}>
                                            {n}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div role="tablist" className="flex items-center gap-1.5">
                        {([
                            ["pending", "Pending", pendingTabCount],
                            ["published", "Published", publishedTabCount],
                        ] as const).map(([key, label, count]) => {
                            const on = tab === key;
                            return (
                                <button
                                    key={key}
                                    role="tab"
                                    aria-selected={on}
                                    onClick={() => goTab(key)}
                                    className={cn(
                                        "psd-focus flex h-9 items-center gap-2 rounded-full border px-3.5 text-[12.5px] font-bold transition-all duration-200",
                                        on
                                            ? "border-transparent bg-[var(--psd-primary)] text-white shadow-sm"
                                            : "border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]",
                                    )}
                                >
                                    {label}
                                    {count !== undefined && <span className={cn("rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums", on ? "bg-white/25" : "bg-[var(--psd-bg)]")}>{count}</span>}
                                </button>
                            );
                        })}
                    </div>
                    <div className="relative w-full sm:w-72">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--psd-muted)]" />
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search this page…"
                            className="h-9 w-full rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] pl-9 pr-3 text-[13px] text-[var(--psd-heading)] placeholder:text-[var(--psd-muted)] focus:border-[var(--psd-primary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--psd-primary)]/15"
                        />
                    </div>
                </div>

                <div className="psd-card overflow-hidden !rounded-xl p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#DCE6CD] dark:bg-[#34402B]">
                                <tr>
                                    {["Recruitment", "Type", "Project", "Department", "Approved On", "Advertisement", "Action"].map((h, i, a) => (
                                        <th key={h} className={cn("px-3 py-2 text-left text-[10.5px] font-bold uppercase tracking-wider text-[#33441F] dark:text-[#D5E2C2]", i < a.length - 1 && "border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]", i === a.length - 1 && "text-right")}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--psd-border)] bg-[var(--psd-surface)] text-xs">
                                {isLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="psd-row-in" style={{ animationDelay: `${i * 70}ms` }}>
                                            {[60, 30, 55, 40, 35, 40, 25].map((w, c) => (
                                                <td key={c} className="px-3 py-2.5"><div className="psd-shimmer h-4" style={{ width: `${w}%` }} /></td>
                                            ))}
                                        </tr>
                                    ))
                                ) : error ? (
                                    <tr><td colSpan={7} className="p-10 text-center text-[var(--psd-returned)]">Could not load recruitments. {(error as any)?.message}</td></tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-10 text-center text-[var(--psd-body)]">
                                            {tab === "pending" ? "No approved recruitments are waiting to be published." : "Nothing has been published yet."}
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((r) => (
                                        <tr key={r.recruitment} onClick={() => setOpenName(r.recruitment)} className="cursor-pointer transition-colors hover:bg-[var(--psd-primary-light)]/40">
                                            <td className="px-3 py-2 font-mono font-semibold text-[var(--psd-heading)]">{r.recruitment}</td>
                                            <td className="px-3 py-2">
                                                <span className={cn(
                                                    "rounded-full px-2 py-0.5 text-[10.5px] font-bold ring-1",
                                                    r.type === "Research" ? "bg-[#6842D9]/10 text-[#5632C5] ring-[#6842D9]/30 dark:text-[#C9B8FA]"
                                                        : r.type === "Consultancy" ? "bg-[#0DA875]/10 text-[#0A8A60] ring-[#0DA875]/30 dark:text-[#7BE0BC]"
                                                            : "bg-[var(--psd-bg)] text-[var(--psd-body)] ring-[var(--psd-border)]",
                                                )}>{r.type}</span>
                                            </td>
                                            <td className="px-3 py-2 text-[var(--psd-body)]">
                                                <div className="font-semibold text-[var(--psd-heading)]">{r.project_no || "-"}</div>
                                                {r.project_title && <div className="max-w-[320px] truncate" title={r.project_title}>{r.project_title}</div>}
                                            </td>
                                            <td className="px-3 py-2 text-[var(--psd-body)]">
                                                {deptByName.get(r.recruitment) ? <DepartmentName name={deptByName.get(r.recruitment) as string} /> : "-"}
                                            </td>
                                            <td className="px-3 py-2 text-[var(--psd-body)]">{fmtDate(r.approved_on)}</td>
                                            <td className="px-3 py-2">
                                                <span className={cn(
                                                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold",
                                                    r.published
                                                        ? "border-[var(--psd-approved)]/40 bg-[var(--psd-approved-bg)] text-[#0A8A60] dark:text-emerald-300"
                                                        : "border-[var(--psd-review)]/40 bg-[var(--psd-review-bg)] text-[#B26A00] dark:text-amber-300",
                                                )}>
                                                    {r.advertisement || (r.published ? "Published" : "Not yet published")}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setOpenName(r.recruitment); }}
                                                    className="rounded-lg bg-[var(--psd-primary)] px-3 py-1 text-[11px] font-bold text-white shadow-sm transition-all hover:bg-[var(--psd-primary-hover)] active:scale-[0.98]"
                                                >
                                                    Open
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {pagination && pagination.total > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-2">
                            <div className="text-[12px] text-[var(--psd-body)]">
                                Showing <b className="text-[var(--psd-heading)]">{(pagination.page - 1) * pagination.page_length + 1}</b> to{" "}
                                <b className="text-[var(--psd-heading)]">{Math.min(pagination.page * pagination.page_length, pagination.total)}</b> of {pagination.total}
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={!pagination.has_prev}
                                    aria-label="Previous page"
                                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-heading)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                {pageNumbers.map((n, i) =>
                                    n === "…" ? (
                                        <span key={`e${i}`} className="px-1 text-[var(--psd-muted)]">…</span>
                                    ) : (
                                        <button
                                            key={n}
                                            onClick={() => setPage(n)}
                                            className={cn("h-8 w-8 rounded-lg text-[12px] font-semibold transition-colors", n === pagination.page ? "bg-[var(--psd-primary)] text-white shadow-sm" : "text-[var(--psd-body)] hover:bg-[var(--psd-primary-light)]")}
                                        >
                                            {n}
                                        </button>
                                    ),
                                )}
                                <button
                                    onClick={() => setPage((p) => p + 1)}
                                    disabled={!pagination.has_next}
                                    aria-label="Next page"
                                    className="grid h-8 w-8 place-items-center rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-heading)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {open && (
                <div className="fixed inset-0 z-[10050] flex justify-end bg-black/40" onMouseDown={() => setOpenName(null)}>
                    <aside
                        role="dialog"
                        aria-modal="true"
                        aria-label={`Recruitment ${open.recruitment}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="psd-root flex h-full w-full max-w-xl flex-col border-l border-[var(--psd-border)] shadow-2xl"
                        style={{ background: "var(--psd-surface)" }}
                    >
                        <div className="m-2 flex items-start justify-between gap-3 rounded-lg border-[2.5px] border-transparent px-3 py-2.5 [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box]">
                            <div className="min-w-0">
                                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--psd-body)]">Recruitment</div>
                                <h2 className="truncate font-mono text-[15px] font-bold text-[var(--psd-heading)]">{open.recruitment}</h2>
                                <span className={cn("mt-1 inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold", open.published ? "border-[var(--psd-approved)]/40 bg-[var(--psd-approved-bg)] text-[#0A8A60] dark:text-emerald-300" : "border-[var(--psd-review)]/40 bg-[var(--psd-review-bg)] text-[#B26A00] dark:text-amber-300")}>
                                    {open.advertisement || (open.published ? "Published" : "Not yet published")}
                                </span>
                            </div>
                            <button onClick={() => setOpenName(null)} aria-label="Close" className="rounded-lg p-1.5 text-[var(--psd-muted)] hover:bg-[var(--psd-bg)] hover:text-[var(--psd-heading)]"><X className="h-4 w-4" /></button>
                        </div>

                        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-4 pb-3">
                            <RecruitmentDetails name={open.recruitment} fallback={{ name: open.recruitment, project_no: open.project_no, project_title: open.project_title }} />
                            <button
                                onClick={() => navigate(`/recruitment-adhoc-contractual/${encodeURIComponent(open.recruitment)}`)}
                                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[var(--psd-primary)] hover:underline"
                            >
                                <ExternalLink className="h-3.5 w-3.5" /> Open the full recruitment form
                            </button>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-3">
                            {open.published ? (
                                <button
                                    onClick={() => act(open, "No")}
                                    disabled={!!busy}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--psd-returned)]/40 px-4 py-2 text-[12.5px] font-bold text-[var(--psd-returned)] transition-colors hover:bg-[var(--psd-returned-bg)] disabled:opacity-50"
                                >
                                    {busy === `${open.recruitment}:No` && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Unpublish
                                </button>
                            ) : (
                                <button
                                    onClick={() => act(open, "Yes")}
                                    disabled={!!busy}
                                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--psd-approved)] px-4 py-2 text-[12.5px] font-bold text-white shadow-sm transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-50"
                                >
                                    {busy === `${open.recruitment}:Yes` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Publish
                                </button>
                            )}
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
};

export default RecruitmentAdvertisement;
