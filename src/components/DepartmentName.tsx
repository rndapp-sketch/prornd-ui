import { useFrappeGetCall } from "frappe-react-sdk";
import { commonAPI } from "@/services/apiService";

interface DepartmentNameProps {
    name: string;
}

type DepartmentLookupResponse = {
    message?: string | {
        dept_name?: string | null;
        department_name?: string | null;
        name?: string | null;
    } | null;
};

export const DepartmentName = ({ name }: DepartmentNameProps) => {
    const { data, isLoading } = useFrappeGetCall<DepartmentLookupResponse>(
        commonAPI.getDepartmentName,
        { department_id: name },
        name ? undefined : null,
        { revalidateOnFocus: false },
    );
    const { data: fallbackData, isLoading: isFallbackLoading } = useFrappeGetCall<{ message?: { dept_name?: string | null } }>(
        "frappe.client.get_value",
        {
            doctype: "Department_prornd",
            filters: name,
            fieldname: "dept_name",
        },
        name ? `department_name_fallback_${name}` : null,
        { revalidateOnFocus: false },
    );

    if (!name) return null;
    if (isLoading && isFallbackLoading) return <span>Loading…</span>;

    const message = data?.message;
    const departmentName =
        typeof message === "string"
            ? message
            : message?.dept_name || message?.department_name || fallbackData?.message?.dept_name;

    return <span>{departmentName || name}</span>;
};
