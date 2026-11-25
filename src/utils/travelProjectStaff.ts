import type { FormField } from '@/components/forms/DynamicFormRenderer';

// Faculty-only parts of the Travel form, hidden when project staff apply (on the form
// and on the details page): Special Casual Leave,
// additional administrative / academic responsibility, and arrangement for classes.
// Matched by fieldname and by section / field label, since the labels come from the DocType.
export const STAFF_HIDDEN_FIELDS = new Set([
    'travel_special_casual_leave',
    'travel_leave_from_date',
    'travel_leave_to_date',
    'travel_additional_responsibility',
    'travel_additional_responsibility_details',
    'selection_arrangement',
    'travel_classes_arrangement',
]);
export const STAFF_HIDDEN_LABEL = /special casual leave|additional administrative or academic responsibility|arrangement for classes/i;

export const hideForProjectStaff = (sourceFields: FormField[]): FormField[] => {
    let inHiddenSection = false;
    const marked = sourceFields.map((field) => {
        const matchesLabel = STAFF_HIDDEN_LABEL.test(String(field.label || ''));
        if (field.fieldtype === 'Section Break') {
            inHiddenSection = matchesLabel;
            return matchesLabel ? { ...field, hidden: 1 } : field;
        }
        // Supporting documents belong to the leave request when they depend on it.
        const dependsOnHidden = [...STAFF_HIDDEN_FIELDS].some((name) =>
            String(field.depends_on || '').includes(name),
        );
        return inHiddenSection || matchesLabel || dependsOnHidden || STAFF_HIDDEN_FIELDS.has(field.fieldname)
            ? { ...field, hidden: 1 }
            : field;
    });
    // A section left with nothing to show would still render its heading.
    return marked.map((field, idx) => {
        if (field.fieldtype !== 'Section Break' || field.hidden) return field;
        const next = marked.findIndex((f, i) => i > idx && f.fieldtype === 'Section Break');
        const body = marked
            .slice(idx + 1, next === -1 ? undefined : next)
            .filter((f) => f.fieldtype !== 'Column Break');
        return body.length > 0 && body.every((f) => f.hidden) ? { ...field, hidden: 1 } : field;
    });
};
