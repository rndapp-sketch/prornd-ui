import { useFrappeGetCall } from "frappe-react-sdk";

interface BudgetHeadOption {
    name: string;
    budget_head: string;
    id?: string | number;
}

interface BudgetHeadNameProps {
    /** The account_head value — stored as Frappe Budget Head document name or id */
    value?: string | number | null;
    /** Legacy alias */
    ID?: string;
    /** Legacy alias */
    id?: string | number;
    className?: string;
    /**
     * Pre-loaded budget head list (name, budget_head, id).
     * When provided the component resolves the display name client-side
     * without making an additional API call.
     */
    options?: BudgetHeadOption[];
}

export const BudgetHeadName = ({ value, ID, id, className, options }: BudgetHeadNameProps) => {
    const resolved = value ?? ID ?? id;
    const hasValue = resolved != null && resolved !== "";
    const fallback = String(resolved ?? "");

    // Fast client-side lookup when the caller already has the list loaded.
    // Matches by name first (Frappe doc name), then by id (custom numeric field).
    if (options && hasValue) {
        const key = String(resolved);
        const match = options.find(o => String(o.name) === key || String(o.id) === key);
        return <span className={className}>{match?.budget_head || fallback}</span>;
    }

    // Fallback: per-row API call (used when no options prop is passed).
    return <BudgetHeadNameApi resolved={resolved} hasValue={hasValue} fallback={fallback} className={className} />;
};

const BudgetHeadNameApi = ({ resolved, hasValue, fallback, className }: {
    resolved: string | number | null | undefined;
    hasValue: boolean;
    fallback: string;
    className?: string;
}) => {
    const { data, isLoading } = useFrappeGetCall<{ message: Record<string, any>[] }>(
        "frappe.client.get_list",
        {
            doctype: "Budget Head",
            filters: [["name", "=", String(resolved)]],
            fields: ["budget_head"],
            limit_page_length: 1,
        },
        hasValue ? undefined : null,
        { revalidateOnFocus: false },
    );

    if (!hasValue) return null;
    if (isLoading) return <span className={className}>…</span>;

    const displayName = data?.message?.[0]?.budget_head;
    return <span className={className}>{displayName || fallback}</span>;
};
