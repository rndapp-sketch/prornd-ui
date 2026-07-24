import { useFrappeGetDoc, useFrappeGetCall } from "frappe-react-sdk";

interface DepartmentNameProps {
    name: string;
}

export const DepartmentName = ({ name }: DepartmentNameProps) => {
    if (!name) return null;
    // Short values (≤3 chars) are the custom dept_id; longer values are the Frappe doc name.
    return name.length > 3
        ? <DeptByDocName name={name} />
        : <DeptById deptId={name} />;
};

// Long value → Frappe doc name → fetch document directly
const DeptByDocName = ({ name }: { name: string }) => {
    const { data, isLoading } = useFrappeGetDoc<{ dept_name: string }>(
        "Department_prornd",
        name,
        { revalidateOnFocus: false }
    );
    if (isLoading) return <span>…</span>;
    return <span>{data?.dept_name || name}</span>;
};

// Short value → custom dept_id field → list query
const DeptById = ({ deptId }: { deptId: string }) => {
    const { data, isLoading } = useFrappeGetCall<{ message: { dept_name: string }[] }>(
        "frappe.client.get_list",
        { doctype: "Department_prornd", filters: [["dept_id", "=", deptId]], fields: ["dept_name"], limit_page_length: 1 },
        deptId ? undefined : null,
        { revalidateOnFocus: false }
    );
    if (isLoading) return <span>…</span>;
    return <span>{data?.message?.[0]?.dept_name || deptId}</span>;
};
