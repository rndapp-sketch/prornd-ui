import { useFrappeGetCall } from "frappe-react-sdk";

interface DepartmentNameProps {
    name: string;
}

export const DepartmentName = ({ name }: DepartmentNameProps) => {
    console.log("DepartmentName render:", { name });
    const { data, isLoading, error } = useFrappeGetCall<{ message: { dept_name: string } }>(
        "frappe.client.get_value",
        {
            doctype: "Department_prornd",
            fieldname: "dept_name",
            filters: { name: name }
        },
        {
            enabled: !!name,
            revalidateOnFocus: false
        }
    );
    console.log("DepartmentName hook state:", { name, data, isLoading, error });

    if (!name) return null;
    if (isLoading) return <span>Loading...</span>;
    if (error) {
        console.error("DepartmentName error:", error);
        return <span>{name}</span>;
    }

    return <span>{data?.message?.dept_name || name}</span>;
};
