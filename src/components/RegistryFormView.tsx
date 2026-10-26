import React from "react";
import { LayoutGridIcon, Printer, PackageIcon, ScrollTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { type FormField, type LinkOption } from "@/components/forms/DynamicFormRenderer";
import { isFieldVisible } from "@/utils/evalExpression";
import { getFileUrl } from "@/utils/fileUtils";

const isFilePath = (value: string) =>
    typeof value === "string" &&
    (value.startsWith("/private/files/") || value.startsWith("/files/") || /\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/i.test(value));
const getFileName = (path: string) => path.split("/").pop() || path;

// Card design shared by the task-registry detail pages and the cancellation request page.
export const ICSS_LAYOUT_TYPES = ['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Button', 'Heading'];
export const ICSS_NUMERIC_TYPES = ['Currency', 'Float', 'Int', 'Percent'];
export const ICSS_HIDDEN_KEYS = new Set([
    'doctype', 'docstatus', 'idx', 'owner', 'creation', 'modified', 'modified_by', 'workflow_state',
    'name', 'child_document', 'send_to_director', 'director_approval_required',
]);

export const IcssField = ({ label, value, wide }: { label: string; value: React.ReactNode; wide?: boolean }) => (
    <div className={cn('min-w-0 border-l-[3px] border-cyan-500 pl-3 dark:border-slate-500/40', wide && 'sm:col-span-2 lg:col-span-3')}>
        <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#0E7490] dark:text-cyan-300">{label}</div>
        <div className="mt-0.5 break-words border-b border-slate-300 pb-1 dark:border-slate-600 text-[13.5px] font-semibold leading-snug text-[#18181B] dark:text-[#F4F4F5]">{value}</div>
    </div>
);

export const IcssSection = ({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) => (
    <section className="px-5 py-4">
        <div className="mb-3.5 flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6EBD8] text-[#5A6B34] ring-1 ring-[#CBD5B0] dark:bg-[#A3B18A]/20 dark:text-[#C5D2A3] dark:ring-[#A3B18A]/30 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon ?? <LayoutGridIcon />}</span>
            <h3 className="rounded-md border border-[#CBD5B0] bg-[#E6EBD8] px-3 py-1 text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#4A5A28] dark:border-[#A3B18A]/30 dark:bg-[#A3B18A]/20 dark:text-[#D5E0B5]">{title}</h3>
            <span className="h-[2px] flex-1 bg-gradient-to-r from-[#A3B18A] to-[#F1F4E8] dark:from-[#A3B18A]/60 dark:to-transparent" />
        </div>
        {children}
    </section>
);

export const registryEmpty = (v: any) => v === null || v === undefined || v === '';

export const registryCell = (v: any, ft?: string, options?: LinkOption[]): React.ReactNode => {
    if (ft === 'Check') return <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-bold', v ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-600')}>{v ? 'Yes' : 'No'}</span>;
    if (registryEmpty(v)) return <span className="text-[#A1A1AA]">—</span>;
    if (options) {
        const hit = options.find(o => String(o.value) === String(v));
        if (hit?.label) return hit.label;
    }
    if (ft === 'Currency' && !isNaN(Number(v))) return Number(v).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
    if (typeof v === 'number') return v.toLocaleString('en-IN');
    if (typeof v === 'string' && isFilePath(v)) return <a href={getFileUrl(v)} target="_blank" rel="noreferrer" className="text-[#0E7490] underline">{getFileName(v)}</a>;
    return String(v);
};

// Terms / rules / declaration text lives in an HTML field's `options` (same source the form renderer uses).
export const RegistryHtml = ({ html }: { html: string }) => (
    <div
        className="prose prose-sm max-w-none rounded-lg border-l-[3px] border-cyan-500 bg-slate-50 px-4 py-3 text-[13px] leading-relaxed text-zinc-800 dark:bg-white/[0.06] dark:text-zinc-100 dark:prose-invert dark:[&_*]:!text-zinc-100"
        dangerouslySetInnerHTML={{ __html: html }}
    />
);

export const RegistryTable = ({ cols, rows, linkOptions }: { cols: any[]; rows: any[]; linkOptions?: Record<string, LinkOption[]> }) => (
    <div className="overflow-x-auto rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
        <table className="w-full border-collapse text-[12.5px]">
            <thead>
                <tr className="bg-slate-200 dark:bg-slate-700/60">
                    <th className="w-8 px-3 py-2 text-left text-[11px] font-extrabold text-[#0F172A] dark:text-slate-200">#</th>
                    {cols.map(c => (
                        <th key={c.fieldname} className={cn('px-3 py-2.5 text-[10.5px] font-extrabold uppercase tracking-wide text-[#0F172A] dark:text-slate-200', ICSS_NUMERIC_TYPES.includes(c.fieldtype) ? 'whitespace-nowrap text-right' : 'text-left')}>{c.label}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((r, ri) => (
                    <tr key={ri} className="border-t border-[#EEF2FF] align-top odd:bg-white even:bg-slate-50/70 dark:border-[#3F3F46] dark:odd:bg-transparent dark:even:bg-white/[0.03]">
                        <td className="px-3 py-2 text-[#A1A1AA]">{ri + 1}</td>
                        {cols.map(c => (
                            <td key={c.fieldname} className={cn('px-3 py-2 font-medium text-[#18181B] dark:text-[#F4F4F5]', ICSS_NUMERIC_TYPES.includes(c.fieldtype) ? 'whitespace-nowrap text-right tabular-nums' : 'min-w-[110px] max-w-[300px] break-words')}>
                                {registryCell(r[c.fieldname], c.fieldtype, linkOptions?.[c.options] || linkOptions?.[c.fieldname])}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// Same card design as the ICSS view, driven by a doctype's field metadata.
export const RegistryFormView = ({ kicker, name, workflowState, fields, values, linkOptions, kpis, icon, onPrint }: {
    kicker: string; name: string; workflowState?: string;
    fields: FormField[]; values: Record<string, any>; linkOptions: Record<string, LinkOption[]>;
    kpis?: { icon: React.ReactNode; k: string; v: any }[]; icon?: React.ReactNode; onPrint?: () => void;
}) => {
    const sections: { title: string; fields: FormField[] }[] = [];
    let cur: { title: string; fields: FormField[] } | null = null;
    fields.forEach(f => {
        if (f.hidden || !isFieldVisible(f, values)) return;
        if (f.fieldtype === 'Section Break') { cur = { title: f.label || 'Details', fields: [] }; sections.push(cur); return; }
        if (ICSS_LAYOUT_TYPES.includes(f.fieldtype) && !(f.fieldtype === 'HTML' && f.options)) return;
        if (!cur) { cur = { title: 'Details', fields: [] }; sections.push(cur); }
        cur.fields.push(f);
    });
    const optionsFor = (f: FormField) => linkOptions[f.options as string] || linkOptions[f.fieldname];
    const grid = 'grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3';
    const shownKpis = (kpis || []).filter(x => !registryEmpty(x.v));

    return (
        <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
            <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-amber-50 to-white px-5 py-4 text-[#18181B] dark:border-slate-500/20 dark:from-slate-950/40 dark:via-amber-950/30 dark:to-transparent dark:text-white">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-sm [&_svg]:h-5 [&_svg]:w-5">{icon ?? <ScrollTextIcon />}</span>
                    <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-slate-300">{kicker}</div>
                        <div className="text-[18px] font-extrabold leading-tight tracking-tight">{name}</div>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                        {onPrint && (
                            <button
                                onClick={onPrint}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-bold text-[#334155] shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-500/30 dark:bg-white/5 dark:text-slate-200"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Print / PDF
                            </button>
                        )}
                        {workflowState && <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] font-extrabold text-white shadow-sm">{workflowState}</span>}
                    </div>
                </div>
                {shownKpis.length > 0 && (
                    <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {shownKpis.map(x => (
                            <div key={x.k} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm dark:border-slate-500/20 dark:bg-white/5">
                                <span className="text-[#475569] dark:text-slate-300 [&_svg]:h-4 [&_svg]:w-4">{x.icon}</span>
                                <div className="min-w-0">
                                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#475569] dark:text-slate-200">{x.k}</div>
                                    <div className="truncate text-[13px] font-bold">{x.v}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div>
                {sections.map((sec, si) => {
                    const plain = sec.fields.filter(f => f.fieldtype !== 'Table' && f.fieldtype !== 'HTML' && !registryEmpty(values[f.fieldname]) && !(f.fieldtype === 'Check' && !values[f.fieldname]));
                    const tables = sec.fields.filter(f => f.fieldtype === 'Table' && (values[f.fieldname] || []).length > 0);
                    const htmls = sec.fields.filter(f => f.fieldtype === 'HTML' && f.options);
                    if (plain.length === 0 && tables.length === 0 && htmls.length === 0) return null;
                    return (
                        <IcssSection key={si} title={sec.title} icon={tables.length > 0 ? <PackageIcon /> : <ScrollTextIcon />}>
                            {plain.length > 0 && (
                                <div className={grid}>
                                    {plain.map(f => {
                                        const v = values[f.fieldname];
                                        const long = f.fieldtype === 'Text' || f.fieldtype === 'Small Text' || f.fieldtype === 'Long Text' || (typeof v === 'string' && v.length > 70);
                                        return <IcssField key={f.fieldname} label={f.label || f.fieldname} value={registryCell(v, f.fieldtype, optionsFor(f))} wide={long} />;
                                    })}
                                </div>
                            )}
                            {tables.map(t => (
                                <div key={t.fieldname} className={cn(plain.length > 0 && 'mt-4')}>
                                    {t.label && t.label !== sec.title && <div className="mb-1.5 text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{t.label}</div>}
                                    <RegistryTable
                                        cols={((t.child_fields || []) as any[]).filter(c => !c.hidden && !ICSS_LAYOUT_TYPES.includes(c.fieldtype))}
                                        rows={values[t.fieldname]}
                                        linkOptions={linkOptions}
                                    />
                                </div>
                            ))}
                            {htmls.map(h => (
                                <div key={h.fieldname} className={cn((plain.length > 0 || tables.length > 0) && 'mt-4')}>
                                    <RegistryHtml html={h.options as string} />
                                </div>
                            ))}
                        </IcssSection>
                    );
                })}
            </div>
        </div>
    );
};

