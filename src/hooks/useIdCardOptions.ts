import { useMemo } from "react";
import { useFrappeGetCall, useFrappeGetDocList } from "frappe-react-sdk";

// Same endpoint the Recruitment Adhoc Contractual form uses for its designation dropdown:
// it reads Designation_prornd filtered by designation_type, and the backend appends "Other".
const DESIGNATIONS_METHOD =
    "rndopsapp.rndopsapp.doctype.recruitment_adhoc_contractual.recruitment_adhoc_contractual.get_filtered_designations";

const uniqueSorted = (values: Array<string | undefined | null>): string[] =>
    Array.from(new Set(values.map((v) => (v ?? "").trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
    );

/**
 * Dropdown choices for the Employee ID Card form: project-staff designations and the
 * department master. Either list can come back empty (no permission, endpoint failure);
 * IdCardOptionSelect falls back to a plain text box in that case, so a failure here never
 * blocks the form.
 */
export const useIdCardOptions = () => {
    const { data: designationResp } = useFrappeGetCall<{
        message?: { data?: Array<{ value?: string; label?: string }> };
    }>(DESIGNATIONS_METHOD, { designation_type: "Project Staff" }, "id-card-designations", {
        revalidateOnFocus: false,
    });

    const { data: departmentRows } = useFrappeGetDocList<{ name: string; dept_name?: string }>(
        "Department_prornd",
        { fields: ["name", "dept_name"], limit: 0 },
        "id-card-departments",
    );

    // "Other" is appended server-side; IdCardOptionSelect adds its own "Other" entry, so it is
    // dropped here to avoid showing it twice.
    const designations = useMemo(
        () =>
            uniqueSorted(
                (designationResp?.message?.data ?? []).map((d) => d.label || d.value),
            ).filter((d) => d.toLowerCase() !== "other"),
        [designationResp],
    );

    // The ID card stores the department's display name (what the staff record prefills).
    const departments = useMemo(
        () => uniqueSorted((departmentRows ?? []).map((d) => d.dept_name || d.name)),
        [departmentRows],
    );

    return { designations, departments };
};
