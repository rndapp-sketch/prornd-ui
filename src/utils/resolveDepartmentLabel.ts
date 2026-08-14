/**
 * Resolves a Department_prornd reference (either the Frappe doc `name` or the
 * short custom `dept_id` field — the same dual-format ambiguity as Budget
 * Head) to its human-readable `dept_name` label.
 *
 * Mirrors the dual-lookup strategy used by the <DepartmentName> component,
 * but as a plain async function so it can run outside React (e.g. inside
 * print-PDF generators, which build a plain HTML string).
 */
export async function resolveDepartmentLabel(
    value?: string | number | null,
): Promise<string> {
    if (value === null || value === undefined || value === "") return "-";
    const key = String(value);

    const byDocName = async (): Promise<string | null> => {
        try {
            const res = await fetch(
                `/api/resource/Department_prornd/${encodeURIComponent(key)}`,
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
                `/api/resource/Department_prornd?${params.toString()}`,
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
