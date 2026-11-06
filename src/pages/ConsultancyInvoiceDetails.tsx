import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { Receipt, Loader2, HashIcon, WalletIcon, FolderOpenIcon, CalendarIcon, FileTextIcon, Plus, X, ArrowRight, ScrollTextIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/common/PageHeader";
import { IcssField, IcssSection, RegistryTable } from "@/components/RegistryFormView";
import { findInvoiceRow, saveInvoice, listInvoices, type InvoiceRow, type SavedInvoice } from "@/utils/consultancyInvoiceApi";

const money = (n: number) => n.toLocaleString("en-IN", { style: "currency", currency: "INR" });

const ConsultancyInvoiceDetails: React.FC = () => {
    const { projectNo = "", fundRef = "" } = useParams();
    const location = useLocation();
    const [row, setRow] = useState<InvoiceRow | null>((location.state as { row?: InvoiceRow } | null)?.row ?? null);
    const [loading, setLoading] = useState(!row);
    const navigate = useNavigate();
    const [saved, setSaved] = useState<SavedInvoice[]>([]);
    const [inputs, setInputs] = useState<string[]>([""]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (row) return;
        findInvoiceRow(projectNo, fundRef)
            .then(setRow)
            .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
            .finally(() => setLoading(false));
    }, [row, projectNo, fundRef]);

    useEffect(() => {
        if (!row) return;
        listInvoices(row).then(setSaved);
    }, [row]);

    const setInput = (i: number, v: string) => setInputs((prev) => prev.map((x, j) => (j === i ? v : x)));
    const removeInput = (i: number) => setInputs((prev) => (prev.length === 1 ? [""] : prev.filter((_, j) => j !== i)));

    // Every number is its own save call, so each becomes its own invoice record.
    const handleSave = async () => {
        if (!row) return;
        const pending = [...new Set(inputs.map((x) => x.trim()).filter(Boolean))];
        if (pending.length === 0) return;
        setSaving(true);
        setError("");
        const remaining: string[] = [];
        const failures: string[] = [];
        for (const no of pending) {
            try {
                await saveInvoice(row.projectNo, row.fundRef, no);
            } catch (e) {
                remaining.push(no);
                failures.push(`${no}: ${e instanceof Error ? e.message : "failed"}`);
            }
        }
        const fresh = await listInvoices(row);
        if (fresh.length > 0) setSaved(fresh);
        setInputs(remaining.length ? remaining : [""]);
        setError(failures.join("\n"));
        setSaving(false);
    };

    const generated = saved.length > 0;
    const kpis = row ? [
        { icon: <FolderOpenIcon />, k: "Project No", v: row.projectNo },
        { icon: <HashIcon />, k: "Fund Received", v: row.fundRef },
        { icon: <WalletIcon />, k: "Amount", v: money(row.amount) },
        { icon: <CalendarIcon />, k: "Date", v: row.date || "-" },
    ] : [];

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans p-3">
            <PageHeader
                title="Consultancy Invoice"
                status={row ? (generated ? "Completed" : "Pending") : undefined}
                projectName={row?.projectTitle}
                backFallback="/consultancy-invoice"
            />
            {loading ? (
                <div className="py-16 text-center text-[#71717A]"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
            ) : !row ? (
                <div className="py-16 text-center text-[#71717A]">{error || "Fund Received entry not found for this project."}</div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-amber-50 to-white px-5 py-4 text-[#18181B] dark:border-slate-500/20 dark:from-slate-950/40 dark:via-amber-950/30 dark:to-transparent dark:text-white">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-sm [&_svg]:h-5 [&_svg]:w-5"><Receipt /></span>
                            <div className="min-w-0">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-slate-300">Consultancy Invoice</div>
                                <div className="text-[18px] font-extrabold leading-tight tracking-tight">{row.fundName}</div>
                            </div>
                            <span className="ml-auto rounded-full bg-slate-800 px-3 py-1 text-[11px] font-extrabold text-white shadow-sm">{generated ? `${saved.length} Invoice${saved.length > 1 ? "s" : ""}` : "Pending"}</span>
                        </div>
                        <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            {kpis.map((x) => (
                                <div key={x.k} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm dark:border-slate-500/20 dark:bg-white/5">
                                    <span className="text-[#475569] dark:text-slate-300 [&_svg]:h-4 [&_svg]:w-4">{x.icon}</span>
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold uppercase tracking-wide text-[#475569] dark:text-slate-200">{x.k}</div>
                                        <div className="truncate text-[13px] font-bold">{x.v}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <IcssSection title="Project Details" icon={<FolderOpenIcon />}>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
                            <IcssField label="Project No" value={row.projectNo} />
                            <IcssField label="Project Registration" value={row.projectName} />
                            <IcssField label="Project Title" value={row.projectTitle || "-"} wide />
                        </div>
                    </IcssSection>

                    <IcssSection title="Fund Received" icon={<WalletIcon />}>
                        <div className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-3">
                            <IcssField label="Fund Received Entry" value={row.fundName} />
                            <IcssField label="Amount Received" value={money(row.amount)} />
                        </div>
                        <button
                            onClick={() => navigate(`/fund-received/${row.fundName}`)}
                            className="mt-3 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-[#2563EB] bg-[#EFF6FF] dark:bg-[#2563EB]/10 border border-[#2563EB]/30 hover:bg-[#DBEAFE] rounded-lg"
                        >
                            View Fund Received <ArrowRight className="w-3 h-3" />
                        </button>
                    </IcssSection>

                    <IcssSection title="Invoices" icon={<FileTextIcon />}>
                        {saved.length > 0 && (
                            <div className="mb-4 max-w-xl">
                                <div className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#0E7490] dark:text-cyan-300">
                                    Invoice Number{saved[0].name ? ` · ${saved[0].name}` : ""}
                                </div>
                                <RegistryTable
                                    cols={[{ fieldname: "invoice_no", label: "Invoice Number", fieldtype: "Data" }]}
                                    rows={saved.map((inv) => ({ invoice_no: inv.invoice_no }))}
                                />
                            </div>
                        )}
                        <div className="max-w-md space-y-2">
                            <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#0E7490] dark:text-cyan-300">
                                {saved.length > 0 ? "Add another invoice no" : "Invoice no"}
                            </div>
                            {inputs.map((v, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input
                                        value={v}
                                        onChange={(e) => setInput(i, e.target.value)}
                                        placeholder="e.g. IITG/06999/26-27"
                                        className="flex-1 px-3 py-2 text-sm rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#18181B] text-[#18181B] dark:text-[#F4F4F5] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
                                    />
                                    {inputs.length > 1 && (
                                        <button onClick={() => removeInput(i)} title="Remove" className="p-2 text-[#71717A] hover:text-red-500"><X className="w-4 h-4" /></button>
                                    )}
                                    {i === inputs.length - 1 && (
                                        <button
                                            onClick={() => setInputs((prev) => [...prev, ""])}
                                            title="Add another invoice"
                                            className="p-2 rounded-lg border border-[#2563EB]/30 text-[#2563EB] bg-[#EFF6FF] dark:bg-[#2563EB]/10 hover:bg-[#DBEAFE]"
                                        >
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {error && <p className="whitespace-pre-line text-xs text-red-500">{error}</p>}
                            <button
                                onClick={handleSave}
                                disabled={saving || inputs.every((x) => !x.trim())}
                                className="px-4 py-2 text-sm font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg shadow-sm disabled:opacity-50"
                            >
                                {saving ? "Saving…" : inputs.filter((x) => x.trim()).length > 1 ? "Save Invoices" : "Save Invoice"}
                            </button>
                        </div>
                    </IcssSection>

                    <IcssSection title="Deposit Slip" icon={<ScrollTextIcon />}>
                        {row.slips.length === 0 ? (
                            <p className="text-[13px] font-medium text-[#71717A]">No deposit slip is linked to this Fund Received yet.</p>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {row.slips.map((d) => (
                                    <div key={`${d.doctype}-${d.name}`} className="flex items-center justify-between gap-2 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] px-3 py-2.5">
                                        <div className="min-w-0">
                                            <div className="text-[10px] font-bold uppercase tracking-wide text-[#71717A]">{d.doctype}</div>
                                            <div className="truncate font-mono text-[13px] font-bold text-[#18181B] dark:text-[#F4F4F5]">{d.name}</div>
                                            {d.workflow_state && <div className="text-[11px] font-semibold text-[#2563EB] dark:text-[#60A5FA]">{d.workflow_state}</div>}
                                        </div>
                                        <button
                                            onClick={() => navigate(`/fund-received/${row.fundName}?tab=deposit_slip`)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg shrink-0"
                                        >
                                            View <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </IcssSection>
                </div>
            )}
        </div>
    );
};

export default ConsultancyInvoiceDetails;
