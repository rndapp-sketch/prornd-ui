import { useFrappeGetDocList } from "frappe-react-sdk";

import { isOverheadProjectNo, OVERHEAD_BUDGET_HEAD } from "@/services/overheadLedger";

export { OVERHEAD_BUDGET_HEAD };

interface OverheadProbeRow {
    name: string;
    is_overhead_project?: number;
}

/**
 * Whether an application is being raised against an overhead fund (PDF / DPF / IDF / SWF /
 * STWF) rather than an ordinary project.
 *
 * Application forms hold their project in different shapes — `travel_project_title` keeps
 * the Project Registration **docname**, `project_code` and `project_no` keep the
 * **project_no** — so both are accepted.
 *
 * Two steps, cheapest first:
 *
 *   1. A `PDF…` / `DPF…` prefix on a project_no answers it with no request at all, which is
 *      the common case since that is what most forms store.
 *   2. Otherwise one lookup on `is_overhead_project`, the same database flag the backend
 *      gates on. Needed because a docname (`2026083001002330`) carries no hint of the fund.
 *
 * Returns false while the lookup is in flight, so a form never briefly treats an ordinary
 * project as overhead — the cost of being wrong that way round is much higher.
 */
export const useIsOverheadProject = (projectRef?: string | null): boolean => {
    const ref = (projectRef || "").trim();
    const matchesPrefix = isOverheadProjectNo(ref);

    // Skipped entirely when the prefix already settled it, or there is no project yet.
    const shouldProbe = !!ref && !matchesPrefix;

    const { data } = useFrappeGetDocList<OverheadProbeRow>(
        "Project Registration",
        {
            fields: ["name", "is_overhead_project"],
            orFilters: [
                ["name", "=", ref],
                ["project_no", "=", ref],
            ],
            limit: 1,
        },
        shouldProbe ? `overhead-project-check-${ref}` : null,
    );

    if (matchesPrefix) return true;
    return Boolean(data?.[0]?.is_overhead_project);
};

export interface HeadOption {
    value: string;
    label: string;
}

/**
 * The "Overhead" entry from a form's account-head dropdown, or null.
 *
 * Every application form builds these options the same way — `{ value: <Budget Head
 * docname>, label: <budget_head title> }` — so the head is matched on its *label*, which is
 * the human name, while the value that gets submitted stays the docname the form expects.
 */
export const pickOverheadHeadOption = <T extends HeadOption>(options: T[] | undefined | null): T | null =>
    (options ?? []).find((o) => (o.label || "").trim() === OVERHEAD_BUDGET_HEAD) ?? null;

// ---------------------------------------------------------------------------
// Fixing the account head on an overhead application
// ---------------------------------------------------------------------------
//
// Shared by all three field renderers — DynamicFormRenderer, and the hand-rolled field
// loops in TemporaryAdvance and DirectPurchase — so the rule cannot drift between them.

/**
 * Head fieldnames used across the application doctypes, for forms whose own metadata does
 * not say "Budget Head".
 *
 * `igf_account_head` is deliberately absent: on the doctype it is a Select over
 * Consumable / Contingency / Equipments / Other. Indent General Form rewrites it to a
 * Link on "Budget Head" before rendering, so the metadata rule below already catches it —
 * and if that rewrite ever goes away, matching it by name would set a Budget Head docname
 * into a field that cannot hold one.
 */
export const HEAD_FIELDNAMES = new Set([
    "account_head",
    "budget_head",
    "icss_account_head",
    "ta_da_account_head",
]);

export interface HeadFieldMeta {
    fieldname: string;
    // Deliberately loose: FormField types `fieldtype` as a union of the fieldtypes the
    // renderer handles, and the callers pass their own field shapes.
    fieldtype?: string | null;
    options?: string | null;
}

/** Which fields on this form are Budget Head selectors. */
export const budgetHeadFieldnamesOf = (
    fields: HeadFieldMeta[] | undefined | null,
    linkOptions: Record<string, HeadOption[]> | undefined | null,
): string[] =>
    (fields ?? [])
        .filter((f) => {
            // The clean signal: a Link straight to the Budget Head doctype.
            if (f.fieldtype === "Link" && (f.options || "").trim() === "Budget Head") return true;
            // Forms that declare the head as Data and turn it into a dropdown client-side
            // carry no such metadata, so they are matched by name — but only once real
            // options exist, so a genuinely free-text head is left alone.
            return (
                HEAD_FIELDNAMES.has(f.fieldname) &&
                ((linkOptions ?? {})[f.fieldname]?.length ?? 0) > 0
            );
        })
        .map((f) => f.fieldname);

/**
 * What to store in a head field for an overhead fund.
 *
 * A Link to Budget Head stores the Budget Head **docname** while "Overhead" is its title,
 * so the option is matched on its label and its value returned. A plain Data head (Temporary
 * Advance) has no options at all and simply takes the name.
 */
export const overheadHeadValue = (
    fieldname: string,
    linkOptions: Record<string, HeadOption[]> | undefined | null,
): string => {
    const options = (linkOptions ?? {})[fieldname] ?? [];
    if (!options.length) return OVERHEAD_BUDGET_HEAD;
    return pickOverheadHeadOption(options)?.value ?? OVERHEAD_BUDGET_HEAD;
};

/**
 * The head values this form still needs set, or an empty object when it is already correct.
 *
 * Returning only the *pending* changes is what keeps the callers' effects from looping.
 */
export const overheadHeadUpdates = (
    fields: HeadFieldMeta[] | undefined | null,
    linkOptions: Record<string, HeadOption[]> | undefined | null,
    formData: Record<string, any> | undefined | null,
): Record<string, string> => {
    const updates: Record<string, string> = {};
    for (const fieldname of budgetHeadFieldnamesOf(fields, linkOptions)) {
        const value = overheadHeadValue(fieldname, linkOptions);
        if ((formData ?? {})[fieldname] !== value) updates[fieldname] = value;
    }
    return updates;
};
