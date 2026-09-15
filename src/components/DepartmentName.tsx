import { useFrappeGetDoc, useFrappeGetCall } from "frappe-react-sdk";

interface DepartmentNameProps {
    name: string;
}

export const DepartmentName = ({ name }: DepartmentNameProps) => {
    if (!name) return null;
    return <DepartmentNameResolver name={name} />;
};

// A department reference can be either the Frappe doc `name` or the short custom
// `dept_id` field, and length alone isn't a reliable signal — some Department_prornd
// docnames are short hash-style autonames (e.g. "otg9mgi2qo") that read as a dept_id
// under a length heuristic but aren't one, leaving the raw id on screen instead of the
// resolved name. Try both lookups and use whichever resolves, falling back to the raw
// value only if neither does. Mirrors the same dual-lookup fallback in resolveDepartmentLabel.ts.
const DepartmentNameResolver = ({ name }: { name: string }) => {
    const { data: byDocName, isLoading: loadingDocName } = useFrappeGetDoc<{ dept_name: string }>(
        "Department_prornd",
        name,
        undefined,
        { revalidateOnFocus: false }
    );
    const { data: byDeptId, isLoading: loadingDeptId } = useFrappeGetCall<{ message: { dept_name: string }[] }>(
        "frappe.client.get_list",
        { doctype: "Department_prornd", filters: [["dept_id", "=", name]], fields: ["dept_name"], limit_page_length: 1 },
        undefined,
        { revalidateOnFocus: false }
    );

    if (loadingDocName || loadingDeptId) return <span>…</span>;

    const resolved = byDocName?.dept_name || byDeptId?.message?.[0]?.dept_name;
    return <span>{resolved || name}</span>;
};
