import { useEffect, useState } from "react";
import { useFrappeAuth, useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { useUserRoles } from "@/components/UserRole";

/**
 * Project staff apply on their PI's behalf. They do not choose the project or the
 * account head — the form is raised through the existing "Other PI" route with the
 * staff member's PI as the Other PI, and the PI picks the project and head at the
 * "Pending Other PI" / "Pending PI Approval" step before forwarding it.
 *
 * The PI is the "piheadmentor_user_id" on the staff member's own User record. Older
 * records without it fall back to Project Staff Details (pi_id), then the project's pi_webmail.
 */

const BASIC_DETAILS_METHOD =
    "rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.get_my_basic_details";

// Same precedence as the dashboard redirect: these roles win over "project staff",
// so their holders keep applying against their own projects as usual.
const OUTRANKING_ROLES = ["Permanent Employee", "Student", "staff, RnD"];

export const isProjectStaffApplicant = (roles: string[] | undefined) =>
    !!roles?.includes("project staff") && !roles.some((r) => OUTRANKING_ROLES.includes(r));

export interface ProjectStaffApplicant {
    /** The current user applies as project staff (project / account head are left to the PI). */
    isProjectStaff: boolean;
    /** Roles, basic details or the PI lookup are still loading. */
    isLoading: boolean;
    /** Project the staff member is engaged on, from their Project Staff Details. */
    projectNo: string;
    /** That project's PI. Empty if it could not be resolved — the form then asks for it. */
    piEmail: string;
}

export function useProjectStaffApplicant(): ProjectStaffApplicant {
    const { currentUser } = useFrappeAuth();
    const { roles, isLoading: rolesLoading } = useUserRoles(currentUser ?? null);
    const isProjectStaff = isProjectStaffApplicant(roles);

    const { data: basicResp, isLoading: basicLoading } = useFrappeGetCall<{
        message: { project_no?: string; pi_id?: string } | null;
    }>(BASIC_DETAILS_METHOD, undefined, isProjectStaff && currentUser ? undefined : null);
    const projectNo = basicResp?.message?.project_no || "";
    const { data: userPiResp, isLoading: userPiLoading } = useFrappeGetCall<{
        message?: { piheadmentor_user_id?: string };
    }>(
        "frappe.client.get_value",
        { doctype: "User", filters: currentUser, fieldname: "piheadmentor_user_id" },
        isProjectStaff && currentUser ? `project-staff-pi-${currentUser}` : null,
    );
    // The staff member's own records are always readable by them.
    const recordedPi = (userPiResp?.message?.piheadmentor_user_id || basicResp?.message?.pi_id || "").trim();

    const { call: getValue } = useFrappePostCall<{ message?: { pi_webmail?: string } }>(
        "frappe.client.get_value",
    );
    // The PI together with the project it was looked up for, so a lookup that has not
    // started yet still counts as loading.
    const [pi, setPi] = useState<{ projectNo: string; email: string }>({ projectNo: "", email: "" });

    // Fallback only: the project's PI, if the staff record carries none.
    useEffect(() => {
        if (!projectNo || recordedPi) return;
        let cancelled = false;
        // project_no is usually the Project Registration docname; fall back to the field.
        const lookup = async () => {
            for (const filters of [{ name: projectNo }, { project_no: projectNo }]) {
                try {
                    const res = await getValue({ doctype: "Project Registration", filters, fieldname: "pi_webmail" });
                    if (res?.message?.pi_webmail) return res.message.pi_webmail;
                } catch { /* no access or no match — try the next filter */ }
            }
            return "";
        };
        lookup().then((email) => {
            if (!cancelled) setPi({ projectNo, email });
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectNo, recordedPi]);

    const piLoading = !recordedPi && !!projectNo && pi.projectNo !== projectNo;

    return {
        isProjectStaff,
        isLoading: rolesLoading || (isProjectStaff && (userPiLoading || basicLoading || piLoading)),
        projectNo,
        piEmail: recordedPi || (piLoading ? "" : pi.email),
    };
}
