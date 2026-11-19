import { useFrappeGetDocList } from "frappe-react-sdk";

interface PfmsProbeRow {
    name: string;
    project_no?: string;
    is_the_account_type_pfms?: string;
}

/** Travel on a PFMS project may not draw an advance — checked again by Travel.validate. */
export const PFMS_NO_ADVANCE_MESSAGE = "Advance is not allowed for PFMS projects.";

/**
 * Whether a project is a PFMS account (`is_the_account_type_pfms = "Yes"`). A blank value
 * counts as non-PFMS.
 *
 * Like useIsOverheadProject, accepts either the Project Registration docname or its
 * project_no, since forms store one or the other. Returns false while the lookup is in
 * flight; the backend check still blocks a save that slips through in that window.
 */
export const useIsPfmsProject = (projectRef?: string | null): boolean => {
    const ref = (projectRef || "").trim();

    const { data } = useFrappeGetDocList<PfmsProbeRow>(
        "Project Registration",
        {
            fields: ["name", "is_the_account_type_pfms"],
            orFilters: [
                ["name", "=", ref],
                ["project_no", "=", ref],
            ],
            limit: 1,
        },
        ref ? `pfms-project-check-${ref}` : null,
    );

    return data?.[0]?.is_the_account_type_pfms === "Yes";
};

/**
 * The PFMS projects among a list of Project Registration docnames — for pickers that must
 * disable PFMS entries (the Other PI step of a Travel that asked for an advance).
 */
export const usePfmsProjectNames = (projectNames: string[]): Set<string> => {
    const names = projectNames.filter(Boolean);

    const { data } = useFrappeGetDocList<PfmsProbeRow>(
        "Project Registration",
        {
            fields: ["name", "project_no", "is_the_account_type_pfms"],
            filters: [
                ["name", "in", names.length ? names : ["__none__"]],
                ["is_the_account_type_pfms", "=", "Yes"],
            ],
            limit: 500,
        },
        names.length ? `pfms-project-list-${names.join(",")}` : null,
    );

    return new Set((data || []).flatMap((p) => [p.name, p.project_no || ""]).filter(Boolean));
};
