import { useFrappeGetCall } from "frappe-react-sdk";

interface BudgetHeadNameProps {
    /** Preferred: any account_head value — numeric uses id filter, hash string uses name filter */
    value?: string | number | null;
    /** Legacy alias for value (string name) */
    ID?: string;
    /** Legacy alias for value (any) */
    id?: string | number;
}


export const BudgetHeadName = ({ value, ID, id }: BudgetHeadNameProps) => {
    const resolved = value ?? ID ?? id;
    const hasValue = resolved != null && resolved !== "";
    const filters = [["name", "=", String(resolved)]];
    const fallback = String(resolved ?? "");

    const { data, isLoading, error } = useFrappeGetCall<{ message: { budget_head: string }[] }>(
        "frappe.client.get_list",
        {
            doctype: "Budget Head",
            filters,
            fields: ["budget_head"],
            limit_page_length: 1,
        },
        hasValue ? undefined : null,
        { revalidateOnFocus: false },
    );

    if (!hasValue) return null;
    if (isLoading) return <span className="text-zinc-400">Loading...</span>;
    if (error) return <span>{fallback}</span>;

    const name = (data?.message as any)?.[0]?.budget_head;
    return <span>{name || fallback}</span>;
};
