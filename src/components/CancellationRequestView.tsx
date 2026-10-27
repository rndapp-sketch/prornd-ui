import React from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { Building2, CalendarDays, FolderOpen, GitBranch, User, XCircle } from "lucide-react";
import { type FormField } from "@/components/forms/DynamicFormRenderer";
import { RegistryFormView } from "@/components/RegistryFormView";
import { resolveDepartmentLabel } from "@/utils/resolveDepartmentLabel";
import { resolveBudgetHeadLabel } from "@/utils/resolveBudgetHeadLabel";

const NAME_KEYS = ["title", "full_name", "department_name", "budget_head", "project_name", "employee_name"];

const fmtDate = (v?: string | null) =>
    v ? new Date(v).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : "";

/** The request's own form, in the task-registry card design (same as Disbursal of Honorarium). */
export const CancellationRequestView: React.FC<{
    data: Record<string, any>;
    onOpenOriginal?: (doctype: string, name: string) => void;
}> = ({ data }) => {
    const { data: metaRes, isLoading } = useFrappeGetCall<any>("frappe.desk.form.load.getdoctype", {
        doctype: "Cancellation Request",
        with_parent: 1,
    });
    const { call: getDoc } = useFrappePostCall<{ message: Record<string, any> }>("frappe.client.get");

    // DocType metadata -> the FormField shape the registry card renders (child tables carry their columns)
    const fields: FormField[] = React.useMemo(() => {
        const docs: any[] = metaRes?.docs || metaRes?.message?.docs || [];
        const byName = Object.fromEntries(docs.map((d) => [d.name, d]));
        const meta = byName["Cancellation Request"];
        // No metadata (e.g. no permission to read the DocType): fall back to the document's own keys
        if (!meta) {
            const skip = new Set(["name", "doctype", "docstatus", "idx", "owner", "creation", "modified", "modified_by", "workflow_state"]);
            return Object.entries(data)
                .filter(([k, v]) => !skip.has(k) && !k.startsWith("_") && !Array.isArray(v))
                .map(([k]) => ({
                    fieldname: k,
                    label: k.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
                    fieldtype: "Data",
                })) as FormField[];
        }
        return meta.fields.map((f: any) => ({
            fieldname: f.fieldname,
            label: f.label,
            fieldtype: f.fieldtype,
            options: f.options,
            hidden: f.hidden,
            depends_on: f.depends_on,
            description: f.description,
            child_fields:
                f.fieldtype === "Table"
                    ? (byName[f.options]?.fields || []).map((c: any) => ({
                        fieldname: c.fieldname, label: c.label, fieldtype: c.fieldtype, options: c.options, hidden: c.hidden,
                    }))
                    : undefined,
        }));
    }, [metaRes, data]);

    // Ids -> readable names, so the card never shows e.g. a random department id
    const [resolved, setResolved] = React.useState<Record<string, any>>({});
    React.useEffect(() => {
        let cancelled = false;
        const jobs: Promise<[string, string] | null>[] = [];
        for (const f of fields) {
            const v = data[f.fieldname];
            if (typeof v !== "string" || !v) continue;
            if (f.options === "Department_prornd" || /department/i.test(f.fieldname)) {
                jobs.push(resolveDepartmentLabel(v).then((l) => [f.fieldname, l] as [string, string]).catch(() => null));
            } else if (f.options === "Budget Head" || /account_head|budget_head/i.test(f.fieldname)) {
                jobs.push(resolveBudgetHeadLabel(v).then((l) => [f.fieldname, l] as [string, string]).catch(() => null));
            } else if (f.fieldtype === "Link" && f.options) {
                jobs.push(
                    getDoc({ doctype: f.options, name: v })
                        .then((r) => {
                            const doc = r?.message || {};
                            const hit =
                                NAME_KEYS.map((k) => doc[k]).find(Boolean) ||
                                Object.entries(doc).find(([k, x]) => /_name$/.test(k) && typeof x === "string" && x)?.[1];
                            return [f.fieldname, hit ? String(hit) : v] as [string, string];
                        })
                        .catch(() => null),
                );
            }
        }
        Promise.all(jobs).then((pairs) => {
            if (cancelled) return;
            const out: Record<string, string> = {};
            pairs.forEach((p) => { if (p && p[1] && p[1] !== "-") out[p[0]] = p[1]; });
            setResolved(out);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fields, data.name]);

    const values = React.useMemo(() => ({ ...data, ...resolved }), [data, resolved]);

    const refDoctype = data.reference_doctype || data.doctype_name || "";
    const refName = data.reference_name || data.reference_document || data.original_document || "";

    // Where the application being cancelled currently stands in its own workflow
    const { data: origState } = useFrappeGetCall<{ message: { workflow_state?: string } }>(
        "frappe.client.get_value",
        { doctype: refDoctype, filters: JSON.stringify({ name: refName }), fieldname: JSON.stringify(["workflow_state"]) },
        refDoctype && refName ? `orig-wf-${refDoctype}-${refName}` : null,
    );
    const originalState = origState?.message?.workflow_state;
    const state = data.workflow_state === "Approved" ? "Cancelled" : data.workflow_state || data.status;
    const amount = Number(data.total_amount ?? data.amount ?? 0);
    const kpis = [
        { icon: <User />, k: "Requested By", v: data.applicant_name || data.applicant || data.owner },
        { icon: <Building2 />, k: "Department", v: resolved.department ?? resolved.applicant_department ?? data.department },
        { icon: <FolderOpen />, k: "Project", v: data.project_no || data.project_name || data.project_code },
        { icon: <CalendarDays />, k: "Submitted On", v: fmtDate(data.creation) },
        { icon: <GitBranch />, k: `Original ${refDoctype || "Form"} Status`, v: originalState },
        ...(amount > 0 ? [{ icon: <XCircle />, k: "Amount", v: amount.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }) }] : []),
    ];

    if (isLoading) {
        return (
            <div className="flex items-center gap-3 rounded-xl border border-[#E4E4E7] bg-white p-6 text-sm text-zinc-500 dark:border-[#3F3F46] dark:bg-[#27272A]">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D97757] border-t-transparent" />
                Loading cancellation request…
            </div>
        );
    }

    return (
        <RegistryFormView
            kicker={`Cancellation Request${refDoctype ? ` · ${refDoctype}` : ""}`}
            name={String(data.name || "")}
            workflowState={state}
            fields={fields}
            values={values}
            linkOptions={{}}
            kpis={kpis}
            icon={<XCircle />}
        />
    );
};
