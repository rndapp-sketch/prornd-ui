import { useFrappeGetCall } from "frappe-react-sdk";

interface FundingAgencyNameProps {
    value?: string | number | null;
}

export const FundingAgencyName = ({ value }: FundingAgencyNameProps) => {
    const hasValue = value != null && value !== "";
    const fallback = String(value ?? "");

    const { data, isLoading, error } = useFrappeGetCall<{ message: { funding_agency_name: string }[] }>(
        "frappe.client.get_list",
        {
            doctype: "fundingagency_",
            filters: [["name", "=", String(value)]],
            fields: ["name", "funding_agency_name"],
            limit_page_length: 1,
        },
        hasValue ? undefined : null,
        { revalidateOnFocus: false },
    );

    console.log("[FundingAgencyName] value:", value, "| isLoading:", isLoading, "| error:", error, "| data:", data);

    if (!hasValue) return null;
    if (isLoading) return <span className="text-zinc-400">Loading...</span>;
    if (error) { console.error("[FundingAgencyName] error:", error); return <span>{fallback}</span>; }

    const name = (data?.message as any)?.[0]?.funding_agency_name;
    console.log("[FundingAgencyName] resolved name:", name, "| raw message:", data?.message);
    return <span>{name || fallback}</span>;
};
