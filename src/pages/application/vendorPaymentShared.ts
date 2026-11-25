import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import type { FormField, LinkOption } from "@/components/forms/DynamicFormRenderer";

export const VENDOR_PAYMENT_DOCTYPE = "Vendor Payment";
export const ITEMS_TABLE = "table_icoa";
export const COMMITTEE_TABLE = "committee_members";
export const APPROVAL_ATTACH = "upload_approval_for_the_procurement_upload_pdf";
export const MIN_COMMITTEE_MEMBERS = 3;
export const DRAFT_STATE = "Draft";
/** State a Permanent Employee's submission lands in — staff commit the amount here before forwarding. */
export const STAFF_COMMIT_STATE = "Pending Staff Approval";
export const STAFF_ROLE = "staff, RnD";

// Same list the backend enforces in validate_for_submission — marked here so the asterisks match.
const REQUIRED_FIELDS = new Set([
    "webmail_id", "acc_holder_name", "bank_name", "bank_acc_number", "ifsc_code",
    "project_name", "project_number", "account_head", "date", "invoice_bill_no",
    "name_of_vendor", APPROVAL_ATTACH,
]);
// Filled from the session user / the selected project, never typed.
const AUTO_FILLED_FIELDS = new Set(["webmail_id", "department", "designation", "project_number"]);
const REQUIRED_DECLARATIONS = new Set(["dec2", "dec3", "dec4"]);

/**
 * project_name / account_head are Data on the DocType (project_name holds the Project
 * Registration docname, account_head a Budget Head docname) — the renderer only offers
 * options for Link fields, so they are promoted to Link here.
 */
export const shapeVendorPaymentFields = (apiFields: FormField[], opts: { lockProject?: boolean } = {}): FormField[] =>
    apiFields
        .filter((f) => f.fieldname !== "amended_from")
        .map((f) => {
            const field: FormField = { ...f, rawLabel: true };
            if (REQUIRED_FIELDS.has(f.fieldname) || REQUIRED_DECLARATIONS.has(f.fieldname)) field.mandatory = 1;
            if (AUTO_FILLED_FIELDS.has(f.fieldname)) field.read_only = 1;
            if (f.fieldname === "project_name") {
                field.fieldtype = "Link";
                field.options = "Project Registration";
                if (opts.lockProject) field.read_only = 1;
            }
            if (f.fieldname === "account_head") {
                field.fieldtype = "Link";
                field.options = "Budget Head";
            }
            if (f.fieldname === COMMITTEE_TABLE) {
                field.label = `Committee Members (minimum ${MIN_COMMITTEE_MEMBERS})`;
            }
            return field;
        });

export const parseAmount = (value: unknown): number => {
    const n = parseFloat(String(value ?? "").replace(/,/g, "").trim());
    return Number.isFinite(n) ? n : 0;
};

export const itemsTotal = (rows: unknown): number =>
    (Array.isArray(rows) ? rows : []).reduce((sum: number, r: any) => sum + parseAmount(r?.amount), 0);

export const formatINR = (n: number) =>
    `₹ ${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const isDraftDoc = (doc: Record<string, any> | null | undefined) =>
    !!doc && (doc.docstatus ?? 0) === 0 && (doc.workflow_state || DRAFT_STATE) === DRAFT_STATE;

export const isApplicant = (doc: Record<string, any> | null | undefined, user?: string | null) => {
    if (!doc || !user) return false;
    const u = user.toLowerCase();
    return [doc.owner, doc.webmail_id].some((v) => String(v || "").toLowerCase() === u);
};

/** Actions that send a document back rather than forward — never gated behind a commitment. */
export const isBackwardAction = (action: string) => /reject|return|send back|put back|revert/i.test(action);

export const newChildRow = (doctype: string, values: Record<string, any> = {}) => ({
    doctype,
    name: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...values,
});

export const projectOptionLabel = (p: { name: string; project_no?: string; project_title?: string }) =>
    p.project_no ? `${p.project_no} — ${p.project_title || ""}`.replace(/ — $/, "") : p.project_title || p.name;

/** Project Registration search by number / title (staff can raise a Vendor Payment for any project). */
export async function searchProjects(query: string): Promise<LinkOption[]> {
    const body: Record<string, any> = {
        doctype: "Project Registration",
        fields: ["name", "project_no", "project_title"],
        order_by: "project_no asc",
        limit_page_length: 50,
    };
    if (query) {
        body.or_filters = [
            ["project_no", "like", `%${query}%`],
            ["project_title", "like", `%${query}%`],
        ];
    }
    const res = await fetch(`${FRAPPE_BASE_URL}/api/method/frappe.client.get_list`, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
            Accept: "application/json",
        },
        body: JSON.stringify(body),
    })
        .then((r) => r.json())
        .catch(() => ({ message: [] }));
    return (res?.message ?? []).map((p: any) => ({ value: p.name, label: projectOptionLabel(p) }));
}

export interface BudgetHeadRow { name: string; budget_head: string; id: number | string }

export async function fetchBudgetHeadList(): Promise<BudgetHeadRow[]> {
    try {
        const res = await fetch(
            `${FRAPPE_BASE_URL}/api/resource/Budget%20Head?fields=["name","budget_head","id"]&order_by=id%20asc&limit_page_length=0`,
            { credentials: "include", headers: { Accept: "application/json" } },
        );
        const json = await res.json();
        return json?.data ?? [];
    } catch {
        return [];
    }
}
