import { useFrappeGetCall } from "frappe-react-sdk";

interface BudgetHeadOption {
    name: string;
    budget_head: string;
    id?: string | number;
}

interface BudgetHeadNameProps {
    value?: string | number | null;
    ID?: string;
    id?: string | number;
    className?: string;
    options?: BudgetHeadOption[];
}

export const BudgetHeadName = ({ value, ID, id, className, options }: BudgetHeadNameProps) => {
    const resolved = value ?? ID ?? id;
    const hasValue = resolved != null && resolved !== "";
    const fallback = String(resolved ?? "");

    // Fast client-side lookup when the caller already has the list loaded.
    if (options && hasValue) {
        const key = String(resolved);
        const match = options.find(o => String(o.name) === key || String(o.id) === key);
        return <span className={className}>{match?.budget_head || fallback}</span>;
    }

    if (!hasValue) return null;

    const key = fallback;
    // Short values (≤3 chars) are the custom integer id field; longer values are the Frappe doc name.
    return key.length > 3
        ? <BHByDocName name={key} fallback={fallback} className={className} />
        : <BHById id={key} fallback={fallback} className={className} />;
};

// Long value → Frappe doc name → use get_list with name filter (more reliable than get_doc)
const BHByDocName = ({ name, fallback, className }: { name: string; fallback: string; className?: string }) => {
    const { data, isLoading } = useFrappeGetCall<{ message: { budget_head: string }[] }>(
        "frappe.client.get_list",
        { doctype: "Budget Head", filters: [["name", "=", name]], fields: ["budget_head"], limit_page_length: 1 },
        name ? `bh-byname-${name}` : null,
        { revalidateOnFocus: false }
    );
    if (isLoading) return <span className={className}>…</span>;
    return <span className={className}>{data?.message?.[0]?.budget_head || fallback}</span>;
};

// Short value → custom integer id field → list query
const BHById = ({ id, fallback, className }: { id: string; fallback: string; className?: string }) => {
    const { data, isLoading } = useFrappeGetCall<{ message: { budget_head: string }[] }>(
        "frappe.client.get_list",
        { doctype: "Budget Head", filters: [["id", "=", id]], fields: ["budget_head"], limit_page_length: 1 },
        id ? undefined : null,
        { revalidateOnFocus: false }
    );
    if (isLoading) return <span className={className}>…</span>;
    return <span className={className}>{data?.message?.[0]?.budget_head || fallback}</span>;
};
