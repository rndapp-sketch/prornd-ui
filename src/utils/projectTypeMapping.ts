/**
 * Describes how each DocType links back to Project Registration.
 * Source: project_registration_links.md
 *
 * Strategies:
 *   self          – the record itself IS a Project Registration
 *   pr_name       – the named field stores the PR document `name` (auto-id)
 *   pr_project_no – the named field stores the human-readable PR `project_no`
 *   direct_type   – the named field already contains the project_type value
 *                   (populated via Frappe fetch_from on save)
 */
export type PRLinkStrategy =
    | { type: 'self' }
    | { type: 'pr_name'; field: string }
    | { type: 'pr_project_no'; field: string }
    | { type: 'direct_type'; field: string };

export interface DoctypePRLink {
    primary: PRLinkStrategy;
    fallback?: PRLinkStrategy;
}

/**
 * Complete mapping of every DocType that appears in the Pending Task module
 * (and related modules) to its Project Registration resolution strategy.
 */
export const DOCTYPE_PR_LINKS: Record<string, DoctypePRLink> = {
    // ── Self ────────────────────────────────────────────────────────────────
    'Project Registration': {
        primary: { type: 'self' },
    },

    // ── Direct Link DocTypes (field stores PR `name`) ────────────────────
    'Account Head Payment': {
        primary: { type: 'pr_name', field: 'project_ref_number' },
    },
    'Advance Settlement': {
        primary:  { type: 'pr_name',       field: 'project_name' },
        fallback: { type: 'pr_project_no', field: 'project_code' },
    },
    'Deposit slip': {
        primary: { type: 'pr_name', field: 'project_title' },
    },
    'Deposit Slip Project Credit': {
        primary: { type: 'pr_name', field: 'project_number' },
    },
    'Disbursement of Honorarium': {
        primary: { type: 'pr_name', field: 'project_number' },
    },
    'E Non Routine Deposit Slip': {
        primary: { type: 'pr_name', field: 'project_title' },
    },
    'Fund Received': {
        primary: { type: 'pr_name', field: 'prjreg_title' },
    },
    // Fund Sanction fetches project_type into project_type_linked — use that first
    'Fund Sanction': {
        primary:  { type: 'direct_type', field: 'project_type_linked' },
        fallback: { type: 'pr_name',     field: 'project_proposal' },
    },
    'Indent Cum Sanction Sheet': {
        primary:  { type: 'pr_name',       field: 'project_ref' },
        fallback: { type: 'pr_project_no', field: 'project_no' },
    },
    'Indent General Form': {
        primary:  { type: 'pr_name',       field: 'igf_project_title' },
        fallback: { type: 'pr_project_no', field: 'igf_project_code' },
    },
    'Loan Request': {
        primary:  { type: 'pr_name',       field: 'project_name' },
        fallback: { type: 'pr_project_no', field: 'project_number' },
    },
    'Miscellaneous Commit': {
        primary: { type: 'pr_name', field: 'project_number' },
    },
    'myProjects': {
        primary: { type: 'pr_name', field: 'project_proposal' },
    },
    'payments': {
        primary: { type: 'pr_name', field: 'project_id' },
    },
    'Project Extension': {
        primary:  { type: 'pr_name',       field: 'project_ref' },
        fallback: { type: 'pr_project_no', field: 'prj_num' },
    },
    'proprietary_purchase': {
        primary:  { type: 'pr_name',       field: 'project_ref' },
        fallback: { type: 'pr_project_no', field: 'project_no' },
    },
    'Rate Contract': {
        primary: { type: 'pr_name', field: 'project_number' },
    },
    'Reimbursement': {
        primary:  { type: 'pr_name',       field: 'project_name' },
        fallback: { type: 'pr_project_no', field: 'project_number' },
    },
    'Research Consultancy Deposit Slip': {
        primary:  { type: 'pr_name',       field: 'project_title' },
        fallback: { type: 'pr_project_no', field: 'project_number' },
    },
    'Research Deposit Slip': {
        primary:  { type: 'pr_name',       field: 'project_title' },
        fallback: { type: 'pr_project_no', field: 'project_no' },
    },
    'standerdized_purchase': {
        primary:  { type: 'pr_name',       field: 'project_ref' },
        fallback: { type: 'pr_project_no', field: 'project_no' },
    },
    'T Testing Deposit Slip': {
        primary: { type: 'pr_name', field: 'project_title' },
    },
    'Top Up Fellowship': {
        primary: { type: 'pr_name', field: 'project_code' },
    },
    'Travel': {
        primary:  { type: 'pr_name',       field: 'travel_project_title' },
        fallback: { type: 'pr_project_no', field: 'travel_project_number' },
    },
    'UC Request': {
        primary: { type: 'pr_name', field: 'project_id' },
    },

    // ── Indirect Data field only DocTypes ────────────────────────────────────
    // These fields store the PR `project_no` (human-readable). The async
    // filter lookup in the button handler resolves project_no → PR document name.
    // Do NOT add a pr_name fallback here with the same field — extractPRName would
    // return the project_no value as a PR document name, bypassing the async
    // lookup and causing a 404 on /api/resource/Project Registration/<project_no>.
    'Direct Purchase': {
        primary: { type: 'pr_project_no', field: 'project_no' },
    },
    'Disbursal of Consultancy': {
        primary: { type: 'pr_project_no', field: 'disbursal_project_number' },
    },
    'Disbursal of Honorarium': {
        primary: { type: 'pr_project_no', field: 'project_no' },
    },
    'Endorsement Data': {
        primary: { type: 'pr_project_no', field: 'project_no' },
    },
    'Extension Of Tenure Of Appointment': {
        primary: { type: 'pr_project_no', field: 'project_number' },
    },
    'P_11 Form': {
        primary: { type: 'pr_project_no', field: 'project_no' },
    },
    'Recruitment Adhoc Contractual': {
        primary: { type: 'pr_project_no', field: 'upfa_project_code' },
    },
    'Selection Committee Report': {
        primary: { type: 'pr_project_no', field: 'project_number' },
    },
    'repair_replacement': {
        primary: { type: 'pr_project_no', field: 'project_no' },
    },
    'sanction_sheet': {
        primary: { type: 'pr_project_no', field: 'project_no' },
    },
    // TA DA Settlement resolves via Travel → project_no
    'TA DA Settlement': {
        primary: { type: 'pr_project_no', field: 'project_no' },
    },
    'Temporary Advance': {
        primary: { type: 'pr_project_no', field: 'project_code' },
    },
};

// ── Lookup helpers ───────────────────────────────────────────────────────────

export type ProjectCategory = 'Research' | 'Consultancy' | 'Others';

export function normalizeProjectType(raw: string | undefined | null): ProjectCategory {
    const t = (raw ?? '').toLowerCase();
    if (t.includes('research'))  return 'Research';
    if (t.includes('consult'))   return 'Consultancy';
    return 'Others';
}

/**
 * Resolves the project category for a pending-task record using the
 * DOCTYPE_PR_LINKS mapping plus the two pre-built lookup maps.
 *
 * @param record        Raw record object from the pending-task API response
 * @param doctype       The Frappe DocType of the record
 * @param prNameToType  Map: PR document `name` → raw project_type string
 * @param prNoToType    Map: PR `project_no`   → raw project_type string
 */
export function resolveProjectCategory(
    record: Record<string, unknown>,
    doctype: string,
    prNameToType: Map<string, string>,
    prNoToType: Map<string, string>,
): ProjectCategory {
    const mapping = DOCTYPE_PR_LINKS[doctype];
    if (!mapping) return 'Others';

    const applyStrategy = (strategy: PRLinkStrategy): string | undefined => {
        if (strategy.type === 'self') {
            return prNameToType.get(record['name'] as string);
        }
        if (strategy.type === 'direct_type') {
            return (record[strategy.field] as string | undefined) || undefined;
        }
        if (strategy.type === 'pr_name') {
            const val = record[strategy.field] as string | undefined;
            return val ? prNameToType.get(val) : undefined;
        }
        if (strategy.type === 'pr_project_no') {
            const val = record[strategy.field] as string | undefined;
            return val ? prNoToType.get(val) : undefined;
        }
    };

    const primary = applyStrategy(mapping.primary);
    if (primary) return normalizeProjectType(primary);

    if (mapping.fallback) {
        const fallback = applyStrategy(mapping.fallback);
        if (fallback) return normalizeProjectType(fallback);
    }

    return 'Others';
}
