import { useFrappeGetCall } from "frappe-react-sdk";

interface UserFullNameProps {
    email?: string | null;
    showEmail?: boolean;
}

export const UserFullName = ({ email, showEmail }: UserFullNameProps) => {
    const { data, isLoading, error } = useFrappeGetCall<{ message: { full_name: string } }>(
        "frappe.client.get_value",
        {
            doctype: "User",
            filters: email,
            fieldname: "full_name",
        },
        email ? undefined : null,
        { revalidateOnFocus: false },
    );

    if (!email) return null;
    if (isLoading) return <span>Loading...</span>;
    if (error) return <span>{email}</span>;

    const fullName = data?.message?.full_name || email;
    if (showEmail && data?.message?.full_name) {
        return <span>{fullName} ({email})</span>;
    }
    return <span>{fullName}</span>;
};
