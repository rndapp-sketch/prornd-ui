import { useFrappeGetCall } from "frappe-react-sdk";

interface DepartmentNameProps {
    name: string;
}

export const DepartmentName = ({ name }: DepartmentNameProps) => {
    const { data, isLoading, error } = useFrappeGetCall<{ message: { dept_name: string } }>(
        "frappe.client.get_value",
        {
            doctype: "Department_prornd",
            filters: name,
            fieldname: "dept_name",
        },
        name ? undefined : null,
        {
            revalidateOnFocus: false
        }
    );
    if (!name) return null;
    if (isLoading) return <span>Loading...</span>;
    if (error) return <span>{name}</span>;

    return <span>{data?.message?.dept_name || name}</span>;
};

