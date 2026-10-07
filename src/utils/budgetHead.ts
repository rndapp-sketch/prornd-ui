import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";

type BudgetHeadRow = { budget_head?: string; id?: number | string };

let budgetHeadsPromise: Promise<BudgetHeadRow[]> | null = null;

/** Budget Head records (budget_head, id), fetched once per session. */
function fetchBudgetHeads(): Promise<BudgetHeadRow[]> {
    if (!budgetHeadsPromise) {
        budgetHeadsPromise = fetch(
            `${FRAPPE_BASE_URL}/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0`,
            { credentials: "include" },
        )
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => (Array.isArray(json?.data) ? (json.data as BudgetHeadRow[]) : []))
            .catch(() => []);
        // Don't cache an empty/failed result for the rest of the session.
        budgetHeadsPromise.then((rows) => {
            if (rows.length === 0) budgetHeadsPromise = null;
        });
    }
    return budgetHeadsPromise;
}

/**
 * The Budget Head name used for consultancy disbursals, looked up from the
 * Budget Head doctype rather than hard-coded. Prefers an exact "Consultancy Fee",
 * then any head containing "consultancy"; falls back to "Consultancy Fee".
 */
export async function getConsultancyBudgetHead(): Promise<string> {
    const rows = await fetchBudgetHeads();
    const names = rows.map((r) => r.budget_head).filter((n): n is string => !!n);
    return (
        names.find((n) => n.trim().toLowerCase() === "consultancy fee") ??
        names.find((n) => n.toLowerCase().includes("consultancy")) ??
        "Consultancy Fee"
    );
}
