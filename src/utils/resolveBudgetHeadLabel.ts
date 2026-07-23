/**
 * Resolves a Budget Head reference (either the Frappe doc `name` or the
 * legacy short custom `id` field — the same two formats the app stores
 * account_head/ta_da_account_head under depending on the doctype) to its
 * human-readable `budget_head` label.
 *
 * Mirrors the dual-lookup strategy already used by the <BudgetHeadName>
 * component, but as a plain async function so it can run outside React
 * (e.g. inside print-PDF generators, which build a plain HTML string).
 */
export async function resolveBudgetHeadLabel(
    value?: string | number | null,
): Promise<string> {
    if (value === null || value === undefined || value === "") return "-";
    const key = String(value);

    const byDocName = async (): Promise<string | null> => {
        try {
            const res = await fetch(
                `/api/resource/Budget%20Head/${encodeURIComponent(key)}`,
                { credentials: "include" },
            );
            if (!res.ok) return null;
            const json = await res.json();
            return json?.data?.budget_head || null;
        } catch {
            return null;
        }
    };

    const byCustomId = async (): Promise<string | null> => {
        try {
            const params = new URLSearchParams({
                fields: JSON.stringify(["budget_head"]),
                filters: JSON.stringify([["id", "=", key]]),
                limit_page_length: "1",
            });
            const res = await fetch(
                `/api/resource/Budget%20Head?${params.toString()}`,
                { credentials: "include" },
            );
            if (!res.ok) return null;
            const json = await res.json();
            return json?.data?.[0]?.budget_head || null;
        } catch {
            return null;
        }
    };

    // Short values (<=3 chars) are almost always the custom id field; longer
    // values are the Frappe doc name — try the likely one first, then fall
    // back to the other strategy before giving up and showing the raw value.
    const [first, second] = key.length > 3 ? [byDocName, byCustomId] : [byCustomId, byDocName];

    return (await first()) || (await second()) || key;
}
