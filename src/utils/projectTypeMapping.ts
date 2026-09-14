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
    'Project Staff Resignation': {
        primary: { type: 'pr_project_no', field: 'applicant_prj_num' },
    },
    'Project Staff Extension': {
        primary: { type: 'pr_project_no', field: 'ex_proj_no' },
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
    'Top Up Fellowship': {
        primary: { type: 'pr_project_no', field: 'project_no' },
    },
};

// ── Lookup helpers ───────────────────────────────────────────────────────────

export type ProjectCategory = 'Research' | 'Consultancy' | 'Others' | 'Overhead';

/**
 * The institute's overhead funds, surfaced as projects so they can be spent from and
 * approved like any other. PDF (per employee) and DPF (per department) exist today; the
 * institute-wide pools are listed now so they land in the same category automatically
 * when they follow.
 * See docs/pdf-project-implementation.md and docs/dpf-project-implementation.md.
 */
export const OVERHEAD_PROJECT_TYPES = ['pdf', 'dpf', 'idf', 'swf', 'stwf'];

/**
 * Roles whose overhead tab holds funds of more than one kind.
 *
 * An R&D approver's queue merges every PI's and every head's overhead applications, so
 * naming the tab after one fund would be wrong for them — they keep the generic label.
 * Checked first, because a Dean or Director may also hold one of the roles below.
 */
const OVERHEAD_MIXED_ROLES = [
    'staff, RnD',
    'Hos, RnD (Head of Section, RnD)',
    'Dean, RnD',
    'Director',
    'Ado_RnD',
];

/** Roles that own a Departmental Development Fund — the head of a department/centre/school. */
const OVERHEAD_DPF_ROLES = [
    'head_approver_1',
    'head_department_center_school',
    'HoD (Head of Department)',
    'HoC (Head of Center)',
    'HoS (Head of School)',
];

/** Roles that own a Personal Development Fund — a PI. */
const OVERHEAD_PDF_ROLES = ['Permanent Employee'];

/**
 * What to call the Overhead tab for this user.
 *
 * The tab holds every overhead fund, but almost nobody holds more than one kind: a
 * department head sees only their DPF, a PI only their PDF. Naming it after the fund they
 * actually have is more use than the umbrella term — so the label is cosmetic and
 * role-derived, while the category stays `'Overhead'` everywhere else.
 *
 * **Display only.** `ProjectCategory`, the tab filter, the counts map, the colour maps and
 * PendingTask's `?type=` URL parameter all remain keyed on `'Overhead'`; renaming the value
 * would break the deep links and every lookup that indexes by it.
 */
export function overheadTabLabel(roles: string[] | undefined | null): string {
    const held = new Set(roles ?? []);
    if (OVERHEAD_MIXED_ROLES.some((r) => held.has(r))) return 'Overhead';
    if (OVERHEAD_DPF_ROLES.some((r) => held.has(r))) return 'DPF';
    if (OVERHEAD_PDF_ROLES.some((r) => held.has(r))) return 'PDF';
    return 'Overhead';
}

/** The label for any tab: only `Overhead` varies, the rest are their own name. */
export function projectTypeTabLabel(tab: string, roles: string[] | undefined | null): string {
    return tab === 'Overhead' ? overheadTabLabel(roles) : tab;
}

export function normalizeProjectType(raw: string | undefined | null): ProjectCategory {
    const t = (raw ?? '').toLowerCase().trim();
    if (t.includes('research'))  return 'Research';
    if (t.includes('consult'))   return 'Consultancy';
    // Checked before the Others fallback, so an overhead fund gets its own tab rather
    // than being lumped in with everything unclassified.
    if (OVERHEAD_PROJECT_TYPES.includes(t)) return 'Overhead';
    return 'Others';
}

/**
 * How a record points at its Project Registration.
 *
 *   kind 'name'       – the value is a PR document name (auto-id)
 *   kind 'project_no' – the value is the human-readable PR project_no
 *
 * Returned so a caller can look up *anything* on the PR — title, funding agency,
 * project type — rather than only the category. `direct_type` links yield no ref:
 * that strategy stores a copied project_type string, not a pointer to a PR.
 */
export interface ProjectRef {
    kind: 'name' | 'project_no';
    value: string;
}

/**
 * The Project Registration a pending-task / task-registry record belongs to.
 *
 * Uses the same DOCTYPE_PR_LINKS strategies as resolveProjectCategory, including the
 * fallback, so every doctype that can resolve a category can also resolve a project —
 * which is what lets the Title and Funding Agency columns work for *all* application
 * forms rather than only Project Registration.
 */
export function resolveProjectRef(
    record: Record<string, unknown>,
    doctype: string,
): ProjectRef | undefined {
    const mapping = DOCTYPE_PR_LINKS[doctype];
    if (!mapping) return undefined;

    const applyStrategy = (strategy: PRLinkStrategy): ProjectRef | undefined => {
        if (strategy.type === 'self') {
            const name = record['name'] as string | undefined;
            return name ? { kind: 'name', value: name } : undefined;
        }
        if (strategy.type === 'pr_name') {
            const val = record[strategy.field] as string | undefined;
            return val ? { kind: 'name', value: val } : undefined;
        }
        if (strategy.type === 'pr_project_no') {
            const val = record[strategy.field] as string | undefined;
            return val ? { kind: 'project_no', value: val } : undefined;
        }
        // 'direct_type' carries a project_type value, not a project reference.
        return undefined;
    };

    return applyStrategy(mapping.primary)
        ?? (mapping.fallback ? applyStrategy(mapping.fallback) : undefined);
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
/**
 * Project-number prefixes for the overhead funds. Minted as `{FUND}{scope id}` —
 * `PDF1411` for employee 1411, `DPF4` for department 4.
 */
const OVERHEAD_PROJECT_NO_PREFIXES = ['PDF', 'DPF', 'IDF', 'SWF', 'STWF'];

/**
 * Whether a project number belongs to an overhead fund, judged from the number alone.
 *
 * This exists because the Project Registration lookup below can miss for a *legitimate*
 * reason: overhead projects are hidden from anyone who does not own them, so an approver
 * without a privileged role receives the application in their queue but cannot see its
 * project — and the task then fell into `Others`. The project number is already on the
 * record they can see, and it is enough to place the task in the right tab without
 * widening anyone's access to the fund itself.
 */
const looksLikeOverheadProjectNo = (value: unknown): boolean =>
    typeof value === 'string' &&
    OVERHEAD_PROJECT_NO_PREFIXES.some((prefix) => value.startsWith(prefix));

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

    // The project row was not visible (or not found). Before giving up, read the project
    // *number* off the record — an overhead fund announces itself in its own number.
    const overheadByNumber = [mapping.primary, mapping.fallback].some(
        (strategy) =>
            strategy?.type === 'pr_project_no' &&
            looksLikeOverheadProjectNo(record[strategy.field]),
    );
    if (overheadByNumber) return 'Overhead';

    if (mapping.fallback) {
        const fallback = applyStrategy(mapping.fallback);
        if (fallback) return normalizeProjectType(fallback);
    }

    return 'Others';
}
