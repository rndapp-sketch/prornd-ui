import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";

/**
 * Resolves a Department_prornd reference (either the Frappe doc `name` or the
 * short custom `dept_id` field — the same dual-format ambiguity as Budget
 * Head) to its human-readable `dept_name` label.
 *
 * Mirrors the dual-lookup strategy used by the <DepartmentName> component,
 * but as a plain async function so it can run outside React (e.g. inside
 * print-PDF generators, which build a plain HTML string).
 */
// Department names effectively never change, so each one is looked up at most once per
// page load: resolved labels are kept here, and concurrent callers share one in-flight request.
const resolved = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();
// Unresolved values (unknown department / transient error) are not re-requested for a minute.
const unresolvedUntil = new Map<string, number>();
const RETRY_AFTER_MS = 60_000;

/** Already-resolved label for this reference, or undefined if it hasn't been looked up yet. */
export function peekDepartmentLabel(value?: string | number | null): string | undefined {
    return value === null || value === undefined || value === "" ? undefined : resolved.get(String(value));
}

export function resolveDepartmentLabel(value?: string | number | null): Promise<string> {
    if (value === null || value === undefined || value === "") return Promise.resolve("-");
    const key = String(value);
    const hit = resolved.get(key);
    if (hit !== undefined) return Promise.resolve(hit);
    if ((unresolvedUntil.get(key) ?? 0) > Date.now()) return Promise.resolve(key);
    const pending = inflight.get(key);
    if (pending) return pending;

    const p = lookupDepartmentLabel(key).then((label) => {
        // Only remember real answers; an unresolved value (network error / unknown) may succeed later.
        if (label !== key) resolved.set(key, label);
        else unresolvedUntil.set(key, Date.now() + RETRY_AFTER_MS);
        return label;
    }).finally(() => inflight.delete(key));
    inflight.set(key, p);
    return p;
}

async function lookupDepartmentLabel(key: string): Promise<string> {

    const byDocName = async (): Promise<string | null> => {
        try {
            const res = await fetch(
                `${FRAPPE_BASE_URL}/api/resource/Department_prornd/${encodeURIComponent(key)}`,
                { credentials: "include" },
            );
            if (!res.ok) return null;
            const json = await res.json();
            return json?.data?.dept_name || null;
        } catch {
            return null;
        }
    };

    const byDeptId = async (): Promise<string | null> => {
        try {
            const params = new URLSearchParams({
                fields: JSON.stringify(["dept_name"]),
                filters: JSON.stringify([["dept_id", "=", key]]),
                limit_page_length: "1",
            });
            const res = await fetch(
                `${FRAPPE_BASE_URL}/api/resource/Department_prornd?${params.toString()}`,
                { credentials: "include" },
            );
            if (!res.ok) return null;
            const json = await res.json();
            return json?.data?.[0]?.dept_name || null;
        } catch {
            return null;
        }
    };

    // Short values (<=3 chars) are almost always the custom dept_id field;
    // longer values are the Frappe doc name — try the likely one first, then
    // fall back to the other strategy before giving up and showing the raw value.
    const [first, second] = key.length > 3 ? [byDocName, byDeptId] : [byDeptId, byDocName];

    return (await first()) || (await second()) || key;
}
