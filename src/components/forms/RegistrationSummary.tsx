import React from "react";
import { Paperclip } from "lucide-react";
import { isFieldVisible } from "@/utils/evalExpression";
import { getFileUrl } from "@/utils/fileUtils";
import type { FormField, LinkOption } from "./DynamicFormRenderer";
import "@/pages/dashboards/projectStaffDashboard.css";

/**
 * A compact, read-only summary of a saved document (instead of the full form). Display only:
 * it reads the same fields, form data and link options the form uses and changes nothing.
 */
const SECTION_COLORS = ["#6842d9", "#0da875", "#4775e8", "#d9830f", "#c9418f"];
const SKIP_TYPES = new Set(["Section Break", "Column Break", "Tab Break", "HTML", "Button", "Hidden", "Heading"]);
const FILE_TYPES = new Set(["Attach", "Attach Image"]);

const labelOf = (f: { fieldname: string; label?: string | null }) =>
    f.label || f.fieldname.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const isEmpty = (v: unknown) =>
    v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

const formatDate = (v: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
};

interface Props {
    fields: FormField[];
    formData: Record<string, any>;
    linkOptions: Record<string, LinkOption[]>;
}

export const RegistrationSummary: React.FC<Props> = ({ fields, formData, linkOptions }) => {
    // Group by Section Break, the same way the form does
    const sections: { title: string; fields: FormField[] }[] = [];
    let current: { title: string; fields: FormField[] } | null = null;
    for (const f of fields) {
        if (f.fieldtype === "Section Break") {
            if (current && current.fields.length) sections.push(current);
            current = { title: f.label || "", fields: [] };
        } else if (!SKIP_TYPES.has(f.fieldtype)) {
            if (!current) current = { title: "", fields: [] };
            current.fields.push(f);
        }
    }
    if (current && current.fields.length) sections.push(current);

    const display = (f: { fieldname: string; fieldtype: string }, raw: unknown): React.ReactNode => {
        if (f.fieldtype === "Check") return raw ? "Yes" : "No";
        if (f.fieldtype === "Date" && typeof raw === "string") return formatDate(raw);
        if (FILE_TYPES.has(f.fieldtype) && typeof raw === "string") {
            return (
                <a
                    href={getFileUrl(raw)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-[var(--psd-approved)]/40 bg-[var(--psd-approved-bg)] px-2 py-0.5 text-[11.5px] font-bold text-[var(--psd-approved)] hover:underline"
                    title={raw.split("/").pop()}
                >
                    <Paperclip className="h-3 w-3 shrink-0" />
                    <span className="truncate">{raw.split("/").pop()}</span>
                </a>
            );
        }
        const opts = linkOptions?.[f.fieldname];
        if (opts) {
            const hit = opts.find((o) => o.value === raw);
            if (hit) return hit.label;
        }
        return String(raw);
    };

    return (
        <div className="space-y-2.5">
            {sections.map((sec, si) => {
                const color = SECTION_COLORS[si % SECTION_COLORS.length];
                const visible = sec.fields.filter((f) => isFieldVisible(f, formData));
                const simple = visible.filter((f) => f.fieldtype !== "Table" && !isEmpty(formData[f.fieldname]));
                const tables = visible.filter((f) => f.fieldtype === "Table" && !isEmpty(formData[f.fieldname]));
                if (simple.length === 0 && tables.length === 0) return null;
                return (
                    <section key={si} className="overflow-hidden rounded-xl border border-[var(--psd-border)] bg-[var(--psd-surface)]">
                        {sec.title && (
                            <h3
                                className="border-l-4 px-3 py-1.5 text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--psd-heading)]"
                                style={{ borderLeftColor: color, background: `linear-gradient(90deg, color-mix(in srgb, ${color} 14%, var(--psd-surface)), var(--psd-surface))` }}
                            >
                                {sec.title}
                            </h3>
                        )}
                        {simple.length > 0 && (
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-3 py-2 sm:grid-cols-2 lg:grid-cols-4">
                                {simple.map((f) => (
                                    <div key={f.fieldname} className="min-w-0">
                                        <dt className="truncate text-[10.5px] font-bold uppercase tracking-wide text-[var(--psd-muted)]">{labelOf(f)}</dt>
                                        <dd className="break-words text-[13px] font-semibold text-[var(--psd-heading)]">{display(f, formData[f.fieldname])}</dd>
                                    </div>
                                ))}
                            </dl>
                        )}
                        {tables.map((t) => {
                            const rows: Record<string, any>[] = formData[t.fieldname];
                            const cols = (t.child_fields || []).filter(
                                (c) => !SKIP_TYPES.has(c.fieldtype) && !(c.hidden === 1 || c.hidden === true) && rows.some((r) => !isEmpty(r?.[c.fieldname])),
                            );
                            if (cols.length === 0) return null;
                            return (
                                <div key={t.fieldname} className="border-t border-[var(--psd-border)] px-3 py-2">
                                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide" style={{ color }}>
                                        {labelOf(t)} <span className="font-normal text-[var(--psd-muted)]">({rows.length})</span>
                                    </p>
                                    <div className="overflow-x-auto rounded-lg border border-[var(--psd-border)]">
                                        <table className="w-full text-[12px]">
                                            <thead>
                                                <tr style={{ background: `color-mix(in srgb, ${color} 10%, var(--psd-surface))` }}>
                                                    {cols.map((c) => (
                                                        <th key={c.fieldname} className="whitespace-nowrap px-2.5 py-1 text-left text-[10.5px] font-bold uppercase tracking-wide text-[var(--psd-heading)]">{labelOf(c)}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--psd-border)]">
                                                {rows.map((r, ri) => (
                                                    <tr key={ri} className="even:bg-[var(--psd-bg)]">
                                                        {cols.map((c) => (
                                                            <td key={c.fieldname} className="px-2.5 py-1 align-top text-[var(--psd-heading)]">
                                                                {isEmpty(r?.[c.fieldname]) ? <span className="text-[var(--psd-muted)]">—</span> : display(c, r[c.fieldname])}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                );
            })}
        </div>
    );
};

export default RegistrationSummary;
