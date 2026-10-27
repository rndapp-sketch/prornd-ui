import React, { useMemo, useRef, useState } from "react";
import { useFrappeAuth, useFrappeGetCall } from "frappe-react-sdk";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { ToWords } from "to-words";
import { AlertCircle, Download, FileText, Loader2, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { DepartmentName } from "@/components/DepartmentName";

type Row = Record<string, string | number | null | undefined>;
type SalaryRecord = Row & { salary_user_details?: Row };

interface SalaryMonth {
    salary_year_month: string;
    month_total: number;
    records: SalaryRecord[];
}

interface SalaryHistoryResponse {
    status?: string;
    message?: string;
    project_staff_details?: Row[];
    salary_history?: SalaryMonth[];
}

const MONTH_NAMES = [
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
];

const toWords = new ToWords({ localeCode: "en-IN", converterOptions: { currency: true, ignoreDecimal: true } });

const isEmpty = (v: unknown) => v === null || v === undefined || v === "";
const num = (v: unknown) => (isEmpty(v) || Number.isNaN(Number(v)) ? 0 : Number(v));
const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.round(n));
const fmtDate = (d?: unknown) => {
    if (isEmpty(d)) return "—";
    const parsed = new Date(String(d));
    return Number.isNaN(parsed.getTime())
        ? String(d)
        : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// "2026_july" -> { year: 2026, month: 6 }
const parseYearMonth = (ym: string) => {
    const [y, m] = ym.split("_");
    return { year: Number(y), month: MONTH_NAMES.indexOf((m || "").toLowerCase()) };
};
const monthLabel = (ym: string) => {
    const { year, month } = parseYearMonth(ym);
    if (month < 0 || Number.isNaN(year)) return ym;
    const name = MONTH_NAMES[month];
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
};

const PAYSLIP_ID = "my-payslip-area";
// Width the slip is rendered at for the PDF: stretched to the A4 content width this keeps the text a readable size
const PDF_SLIP_WIDTH_PX = 800;

// html2canvas cannot parse modern colour functions (Tailwind v4 palettes compute to oklch/oklab),
// so every colour on the cloned slip is rewritten to a plain rgb()/rgba() value before rendering.
const COLOR_PROPS = [
    "color", "backgroundColor", "borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor",
    "outlineColor", "textDecorationColor", "fill", "stroke",
] as const;
const MODERN_COLOR = /(oklch|oklab|lab|lch|color-mix|color)\(/i;

const toRgb = (() => {
    let ctx: CanvasRenderingContext2D | null = null;
    return (value: string): string => {
        if (!ctx) {
            const c = document.createElement("canvas");
            c.width = c.height = 1;
            ctx = c.getContext("2d", { willReadFrequently: true });
        }
        if (!ctx) return value;
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = value;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
        return `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
    };
})();

const flattenModernColors = (root: HTMLElement) => {
    const view = root.ownerDocument.defaultView;
    if (!view) return;
    [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))].forEach(node => {
        const cs = view.getComputedStyle(node);
        COLOR_PROPS.forEach(prop => {
            const v = cs[prop];
            if (v && MODERN_COLOR.test(v)) node.style[prop] = toRgb(v);
        });
        // Shadows / gradients are decorative only; drop them rather than risk another unsupported colour
        if (MODERN_COLOR.test(cs.boxShadow)) node.style.boxShadow = "none";
        if (MODERN_COLOR.test(cs.backgroundImage)) node.style.backgroundImage = "none";
    });
};

const AmountRow = ({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) => (
    <tr className="border-b border-zinc-200 last:border-b-0">
        <td className="px-3 py-1.5 text-zinc-700">{label}</td>
        <td className={cn("px-3 py-1.5 text-right font-semibold tabular-nums", )}>
            {highlight ? "+" : ""}{fmt(value)}
        </td>
    </tr>
);

const MySalarySlip: React.FC = () => {
    const { currentUser } = useFrappeAuth();
    const slipRef = useRef<HTMLDivElement>(null);
    const [selectedYm, setSelectedYm] = useState<string>("");
    const [downloading, setDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    // The endpoint resolves a login / email to the employee, so a project staff member only asks for themselves.
    const { data, error, isLoading } = useFrappeGetCall<{ message: SalaryHistoryResponse }>(
        "rndopsapp.rndopsapp.commitPayment.get_salary_history",
        { search: currentUser },
        currentUser ? `my-salary-slips-${currentUser}` : null,
    );

    const res = data?.message;
    const failed = !!error || (!!res && res.status !== "success");
    const staff = res?.project_staff_details?.[0];
    const ownId = String(staff?.ps_emp_id ?? "");

    // A staged record is the user's own when its employee ID (or the backend ps_emp_id) matches, ignoring case / spaces.
    const normId = (v: unknown) => String(v ?? "").trim().toUpperCase();
    // Otherwise the record's email is compared with the staff member's own emails, so a record staged
    // under a mistyped employee ID still reaches its owner.
    const ownEmails = [staff?.erp_mail, staff?.ps_email_id, currentUser].filter(v => !isEmpty(v)).map(v => String(v).trim().toLowerCase());
    const isOwnRecord = (r: SalaryRecord) => {
        const ids = [r.salary_user_details?.employee_id, (r as { salary_backend_details?: Row }).salary_backend_details?.ps_emp_id].filter(v => !isEmpty(v));
        if (ids.length === 0 || ids.some(v => normId(v) === normId(ownId))) return true;
        const email = String(r.salary_user_details?.email_id ?? "").trim().toLowerCase();
        return email !== "" && ownEmails.includes(email);
    };

    // One slip per staged month, newest first. Records staged under a different employee ID are never shown.
    const slips = useMemo(() => {
        const list: { ym: string; record: SalaryRecord }[] = [];
        (res?.salary_history ?? []).forEach(m => {
            const record = m.records.find(isOwnRecord);
            if (record) list.push({ ym: m.salary_year_month, record });
        });
        return list.reverse();
    }, [res, ownId]); // eslint-disable-line react-hooks/exhaustive-deps

    // Staged records that belong to a different employee ID (or extra records in an already-listed month) are not shown
    const skipped = useMemo(() => {
        const out: { ym: string; id: string }[] = [];
        (res?.salary_history ?? []).forEach(m => {
            m.records.forEach(r => {
                if (!isOwnRecord(r)) out.push({ ym: m.salary_year_month, id: String(r.salary_user_details?.employee_id ?? "?") });
            });
        });
        return out;
    }, [res, ownId]); // eslint-disable-line react-hooks/exhaustive-deps

    const active = slips.find(s => s.ym === selectedYm) ?? slips[0];
    const u: Row = active?.record.salary_user_details ?? {};

    const ym = active ? parseYearMonth(active.ym) : null;
    const daysInMonth = ym && ym.month >= 0 ? new Date(ym.year, ym.month + 1, 0).getDate() : 0;

    const proRataBasic = num(u.pro_rata_basic);
    const proRataHra = num(u.pro_rata_hra);
    const proRataMedical = num(u.pro_rata_medical);
    const arrear = num(u.arrear);
    const grossPay = isEmpty(u.gross_pay) ? proRataBasic + proRataHra + proRataMedical + arrear : num(u.gross_pay);

    const hostelRent = num(u.hra_deduction);
    const medicalDed = num(u.medical_deduction);
    const pTax = num(u.p_tax);
    const travel = num(u.ta);
    const idCard = num(u.id_card_charge);
    // The staged salary has no dedicated library-fine field yet, so "other deduction" fills that line.
    const libraryFine = isEmpty(u.library_fine) ? num(u.other_deduction) : num(u.library_fine);
    const electricity = num(u.electricity_bill);
    const listedDeductions = hostelRent + medicalDed + pTax + travel + idCard + libraryFine + electricity;
    const totalDeduction = isEmpty(u.total_deduction) ? listedDeductions : num(u.total_deduction);
    const netPay = isEmpty(u.net_pay) ? grossPay - totalDeduction : num(u.net_pay);

    const handleDownload = async () => {
        if (!slipRef.current || !active) return;
        setDownloading(true);
        setDownloadError(null);
        try {
            // Render a fixed-width copy so the PDF does not depend on the screen width; the
            // large windowWidth keeps the desktop (two-column) layout of the tables.
            const canvas = await html2canvas(slipRef.current, {
                scale: 3,
                backgroundColor: "#ffffff",
                useCORS: true,
                windowWidth: 1280,
                onclone: (_doc, el) => {
                    el.style.width = `${PDF_SLIP_WIDTH_PX}px`;
                    el.style.maxWidth = "none";
                    el.style.boxShadow = "none";
                    flattenModernColors(el);
                },
            });
            const pdf = new jsPDF("p", "mm", "a4");
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const maxW = pageW - margin * 2;
            const maxH = pageH - margin * 2;
            // Fill the A4 width; only shrink if the slip would run past the page height
            let w = maxW;
            let h = (canvas.height * w) / canvas.width;
            if (h > maxH) {
                h = maxH;
                w = (canvas.width * h) / canvas.height;
            }
            pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, w, h);
            pdf.save(`Salary_Slip_${ownId || "staff"}_${active.ym}.pdf`);
        } catch (e) {
            setDownloadError(e instanceof Error ? e.message : "Could not generate the PDF");
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAF9] font-sans text-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]">
            <style>{`
                @page { size: A4 portrait; margin: 10mm; }
                @media print {
                    html, body { background: #fff !important; }
                    body * { visibility: hidden; }
                    #${PAYSLIP_ID}, #${PAYSLIP_ID} * { visibility: visible !important; }
                    #${PAYSLIP_ID} {
                        position: absolute !important; left: 0 !important; top: 0 !important;
                        width: 100% !important; max-width: none !important; margin: 0 !important;
                        padding: 0 !important; border: none !important; box-shadow: none !important;
                        background: #fff !important; color: #000 !important;
                        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                        break-inside: avoid; page-break-inside: avoid;
                    }
                    #${PAYSLIP_ID} table, #${PAYSLIP_ID} tr { break-inside: avoid; page-break-inside: avoid; }
                }
            `}</style>

            <main className="w-full space-y-3 p-0">
                {/* Page header */}
                <header className="rounded-xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <div className="h-[3px] rounded-t-xl bg-gradient-to-r from-[#A3B18A] via-[#6B7C42] to-[#D97757]" />
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 bg-[#E6EBD8] text-[#5A6B34] dark:border-[#A3B18A]/30 dark:bg-[#A3B18A]/20 dark:text-[#C5D2A3]">
                                <FileText className="h-4 w-4" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold leading-tight">My Salary Slip</h1>
                                <p className="text-xs text-[#71717A] dark:text-[#A1A1AA]">
                                    {staff ? `${[staff.ps_first_name, staff.ps_last_name].filter(v => !isEmpty(v)).join(" ")} · ${ownId}` : "Download your monthly salary slip"}
                                </p>
                            </div>
                        </div>
                        {slips.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                                <select
                                    value={active?.ym ?? ""}
                                    onChange={e => setSelectedYm(e.target.value)}
                                    aria-label="Salary month"
                                    className="h-9 rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] px-3 text-xs font-bold text-[#3F3F46] outline-none focus:border-[#6B7C42] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]"
                                >
                                    {slips.map(s => <option key={s.ym} value={s.ym}>{monthLabel(s.ym)}</option>)}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4E4E7] bg-white px-3 text-xs font-bold text-[#3F3F46] hover:bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#E4E4E7] dark:hover:bg-[#3F3F46]"
                                >
                                    <Printer className="h-3.5 w-3.5" /> Print
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownload}
                                    disabled={downloading}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#5A6B34] px-4 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#4A5A28] disabled:opacity-60"
                                >
                                    {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                    Download PDF
                                </button>
                            </div>
                        )}
                    </div>
                    {skipped.length > 0 && (
                        <p className="flex items-start gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>
                                {skipped.length} staged salary record{skipped.length === 1 ? "" : "s"} ({skipped.map(k => `${monthLabel(k.ym)} → ${k.id}`).join(", ")}) {skipped.length === 1 ? "was" : "were"} saved under a different employee ID, so {skipped.length === 1 ? "it is" : "they are"} not listed. Please contact the R&D office.
                            </span>
                        </p>
                    )}
                    {downloadError && (
                        <p className="border-t border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700">{downloadError}</p>
                    )}
                </header>

                {isLoading || (!currentUser && !error) ? (
                    <div className="rounded-xl border border-[#E4E4E7] bg-white py-24 text-center dark:border-[#3F3F46] dark:bg-[#27272A]">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#6B7C42]" />
                        <p className="mt-3 text-sm text-[#71717A]">Loading your salary slips…</p>
                    </div>
                ) : failed ? (
                    <div className="rounded-xl border border-[#E4E4E7] bg-white py-20 text-center dark:border-[#3F3F46] dark:bg-[#27272A]">
                        <AlertCircle className="mx-auto mb-2 h-10 w-10 text-red-500" />
                        <p className="text-sm font-bold text-red-600">Could not load your salary slips</p>
                        <p className="mx-auto mt-1 max-w-md text-xs text-red-400">
                            {res?.message || (error as { message?: string } | undefined)?.message || "Unknown error"}
                        </p>
                    </div>
                ) : !active ? (
                    <div className="rounded-xl border border-dashed border-zinc-300 bg-white py-20 text-center dark:border-[#A3B18A]/30 dark:bg-[#27272A]">
                        <FileText className="mx-auto mb-2 h-10 w-10 text-[#A3B18A]" />
                        <p className="text-sm font-bold">No salary slips yet</p>
                        <p className="text-xs text-[#71717A]">Your salary slip appears here once your salary has been processed.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] bg-zinc-100 p-4 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A] md:p-6">
                        <div ref={slipRef} id={PAYSLIP_ID} className="w-full border border-zinc-400 bg-white p-6 font-sans text-[13px] leading-snug text-zinc-900 shadow-md md:p-8">
                            {/* Letterhead */}
                            <div className="flex items-center gap-4 border-b border-zinc-800 pb-3">
                                <img src={`${import.meta.env.BASE_URL}IITG_Large_Logo.gif`} alt="IITG Logo" className="h-16 w-16 shrink-0 object-contain" />
                                <div className="flex-1 text-center">
                                    <h2 className="font-serif text-lg font-bold uppercase tracking-wide text-zinc-950">Indian Institute of Technology Guwahati</h2>
                                    <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700">Research & Development (R&D) Cell</h3>
                                    <p className="text-[11px] text-zinc-500">Guwahati, Assam – 781039</p>
                                </div>
                                <div className="h-16 w-16 shrink-0" aria-hidden />
                            </div>

                            {/* Title strip */}
                            <div className="mt-10 grid grid-cols-3 items-center border-b border-zinc-800 py-2.5">
                                <span aria-hidden />
                                <span className="text-center text-sm font-bold uppercase tracking-[0.2em]">Salary Slip</span>
                                <span className="text-right text-sm font-semibold uppercase tracking-wider">{monthLabel(active.ym)}</span>
                            </div>

                            {/* Employee details */}
                            <table className="mt-3 w-full border-collapse border border-zinc-300 text-[12.5px]">
                                <tbody>
                                    {([
                                        [
                                            ["Employee Name", <b>{[staff?.ps_first_name, staff?.ps_middle_name, staff?.ps_last_name].filter(v => !isEmpty(v)).join(" ") || String(u.first_name ?? "") || "—"}</b>],
                                            ["Employee ID", <b className="font-mono">{ownId || "—"}</b>],
                                        ],
                                        [
                                            ["Department", isEmpty(u.department ?? staff?.ps_department) ? "—" : <DepartmentName name={String(u.department ?? staff?.ps_department)} />],
                                            ["Designation / Role", String(u.designation ?? staff?.ps_designation ?? "—")],
                                        ],
                                        [
                                            ["Joining Date", fmtDate(u.joining_date ?? staff?.ps_joining_date)],
                                            ["Worked Days this Cycle", <b>{isEmpty(u.working_days) ? "—" : `${u.working_days} / ${daysInMonth} Days`}</b>],
                                        ],
                                        [
                                            ["Project Number", String(u.project_no ?? staff?.project_no ?? "—")],
                                            ["Bank Account Number", <span className="font-mono">{String(staff?.bank_account_number || "—")}</span>],
                                        ],
                                    ] as [string, React.ReactNode][][]).map((pair, i) => (
                                        <tr key={i} className="border-b border-zinc-300 last:border-b-0">
                                            {pair.map(([k, v]) => (
                                                <React.Fragment key={k}>
                                                    <td className="w-[19%] border-r border-zinc-300 px-3 py-1.5 font-medium text-zinc-600">{k}</td>
                                                    <td className="w-[31%] border-r border-zinc-300 px-3 py-1.5 last:border-r-0">{v}</td>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Earnings & Deductions */}
                            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 print:grid-cols-2">
                                <table className="w-full border-collapse border border-zinc-300 text-[12.5px]">
                                    <thead>
                                        <tr className="border-b border-zinc-400 bg-zinc-100" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                                            <th className="px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider">Earnings Breakdown</th>
                                            <th className="px-3 py-1.5 text-right text-[11px] font-bold uppercase tracking-wider">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AmountRow label="Pro-Rata Basic Salary" value={proRataBasic} />
                                        <AmountRow label="House Rent Allowance (HRA)" value={proRataHra} />
                                        <AmountRow label="Medical Allowance" value={proRataMedical} />
                                        <AmountRow label="Arrear" value={arrear} highlight={arrear > 0} />
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-zinc-400 font-bold">
                                            <td className="px-3 py-2">Gross Earnings Total</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{fmt(grossPay)}</td>
                                        </tr>
                                    </tfoot>
                                </table>

                                <table className="w-full border-collapse border border-zinc-300 text-[12.5px]">
                                    <thead>
                                        <tr className="border-b border-zinc-400 bg-zinc-100" style={{ WebkitPrintColorAdjust: "exact", printColorAdjust: "exact" }}>
                                            <th className="px-3 py-1.5 text-left text-[11px] font-bold uppercase tracking-wider">Deductions & Deductibles</th>
                                            <th className="px-3 py-1.5 text-right text-[11px] font-bold uppercase tracking-wider">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <AmountRow label="Hostel Rent / Campus Accommodation" value={hostelRent} />
                                        <AmountRow label="Medical Deductions" value={medicalDed} />
                                        <AmountRow label="Professional Tax (PTAX Assam)" value={pTax} />
                                        <AmountRow label="Travel Allowance" value={travel} />
                                        <AmountRow label="ID Card" value={idCard} />
                                        <AmountRow label="Library Fine" value={libraryFine} />
                                        {electricity > 0 && <AmountRow label="Electricity Bill" value={electricity} />}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t border-zinc-400 font-bold">
                                            <td className="px-3 py-2">Total Deductions</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{fmt(totalDeduction)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Net pay */}
                            <div className="mt-4 flex items-center justify-between gap-4 border border-zinc-800 px-4 py-3">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Net Pay Credited to Account</p>
                                    <p className="mt-0.5 text-[12.5px] font-semibold italic text-zinc-700">In Words: {toWords.convert(Math.round(netPay))}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Net Disbursed</span>
                                    <span className="font-serif text-2xl font-black tabular-nums tracking-tight text-zinc-950">{fmt(netPay)}</span>
                                </div>
                            </div>

                            {(!isEmpty(u.comment) || !isEmpty(u.remarks)) && (
                                <div className="mt-3 space-y-1 border border-dashed border-zinc-300 p-3 text-xs text-zinc-600">
                                    {!isEmpty(u.comment) && <p><span className="font-bold">Comment Note:</span> {String(u.comment)}</p>}
                                    {!isEmpty(u.remarks) && <p><span className="font-bold">Remarks:</span> {String(u.remarks)}</p>}
                                </div>
                            )}

                            {/* Footer */}
                            <div className="mt-6 flex items-end justify-between border-t border-zinc-300 pt-3 text-[10.5px] text-zinc-500">
                                <p className="max-w-[70%]">
                                    This is a computer-generated salary statement and does not require a signature.
                                </p>
                                <p className="text-right">
                                    Generated on {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default MySalarySlip;
