import { useFrappeGetCall } from "frappe-react-sdk";

interface BudgetHeadNameProps {
    id: string;
}

export const BudgetHeadName = ({ id }: BudgetHeadNameProps) => {
    const { data, isLoading, error } = useFrappeGetCall<{ message: { budget_head: string } }>(
        "frappe.client.get_value",
        {
            doctype: "Budget Head",
            fieldname: "budget_head",
            filters: { name: id }
        },
        {
            enabled: !!id,
            revalidateOnFocus: false
        }
    );

    if (!id) return null;
    if (isLoading) return <span className="text-zinc-400">Loading...</span>;
    if (error) {
        console.error("BudgetHeadName error:", error);
        return <span>{id}</span>;
    }

    return <span>{data?.message?.budget_head || id}</span>;
};
