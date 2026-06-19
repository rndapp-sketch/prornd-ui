import { useFrappeGetCall } from "frappe-react-sdk";

interface BudgetHeadNameProps {
    /** The account_head value — stored as Frappe Budget Head document name */
    value?: string | number | null;
    /** Legacy alias */
    ID?: string;
    /** Legacy alias */
    id?: string | number;
    className?: string;
}

export const BudgetHeadName = ({ value, ID, id, className }: BudgetHeadNameProps) => {
    const resolved = value ?? ID ?? id;
    const hasValue = resolved != null && resolved !== "";
    const fallback = String(resolved ?? "");

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
