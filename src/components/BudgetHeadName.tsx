import { useFrappeGetCall } from "frappe-react-sdk";

interface BudgetHeadNameProps {
    /** account_head value — numeric string/number uses id filter, hash string uses name filter */
    value: string | number | undefined | null;
}

const isNumericId = (v: string | number) =>
    typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v.trim()));

export const BudgetHeadName = ({ value }: BudgetHeadNameProps) => {
    const hasValue = value != null && value !== "";
    const numeric = hasValue && isNumericId(value!);
    const filters = numeric
        ? [["id", "=", Number(value)]]
        : [["name", "=", value]];
    const fallback = String(value ?? "");

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
