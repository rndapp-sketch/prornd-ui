import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { AlertCircle, AlertTriangle, BadgeCheck, CalendarDays, ChevronDown, FileClock, IndianRupee, Loader2, Receipt, TrendingDown, User, Wallet, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DepartmentName } from "@/components/DepartmentName";

type Row = Record<string, string | number | null | undefined>;

type SalaryRecord = Row & {
    salary_user_details?: Row;
    salary_backend_details?: Row;
};

interface SalaryMonth {
    salary_year_month: string;
    month_total: number;
    records: SalaryRecord[];
}

type StaffDetails = Row & {
    table_ymed?: Row[];
};

interface SalaryHistoryResponse {
    status?: string;
    message?: string;
    project_staff_details?: StaffDetails[];
    extension_history?: Row[];
    salary_history?: SalaryMonth[];
    total_months?: number;
    total_records?: number;
    total_amount?: number;
}

const isEmpty = (v: unknown) => v === null || v === undefined || v === "";

const inr = (n?: unknown) =>
    isEmpty(n) || Number.isNaN(Number(n))
        ? "—"
        : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Math.round(Number(n)));

const dt = (d?: unknown) => {
    if (isEmpty(d)) return "—";
    const parsed = new Date(String(d));
    return Number.isNaN(parsed.getTime())
        ? String(d)
        : parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const txt = (v?: unknown) => (isEmpty(v) ? "—" : String(v));

// "2026_july" -> "July 2026"
const monthLabel = (ym: string) => {
    const [year, month] = ym.split("_");
    if (!year || !month) return ym;
    return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
};

const statusTone = (status?: unknown) => {
    const s = String(status || "").toUpperCase();
    if (s.includes("PAID") || s === "PUBLISHED" || s === "SUCCESS" || s === "APPROVED") return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-400 dark:ring-emerald-400/20";
    if (s.includes("PENDING")) return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/30 dark:text-amber-400 dark:ring-amber-400/20";
    return "bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20";
};

const Badge = ({ value }: { value?: unknown }) =>
    isEmpty(value) ? <span className="text-slate-400">—</span> : (
        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset", statusTone(value))}>
            {String(value).replace(/_/g, " ")}
        </span>
    );

const Card = ({ icon, title, right, children, className }: { icon?: React.ReactNode; title: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) => (
    <section className={cn("overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900", className)}>
        <header className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/50">
            <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-zinc-300">
                {icon && <span className="text-slate-400 dark:text-zinc-500">{icon}</span>}
                {title}
            </h4>
            {right}
        </header>
        {children}
    </section>
);

const Fields = ({ items, cols = "sm:grid-cols-2 lg:grid-cols-3" }: { items: [string, React.ReactNode][]; cols?: string }) => (
    <dl className={cn("grid grid-cols-1 gap-x-6 gap-y-3.5 p-4", cols)}>
        {items.map(([k, v]) => (
            <div key={k} className="min-w-0">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">{k}</dt>
                <dd className="mt-0.5 break-words text-[13px] font-medium text-slate-800 dark:text-zinc-100">{v}</dd>
            </div>
        ))}
    </dl>
);

const Kpi = ({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string | number; hint?: string; tone: string }) => (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone)}>{icon}</div>
        <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-400">{label}</p>
            <p className="truncate text-lg font-bold leading-tight tabular-nums text-slate-900 dark:text-white">{value}</p>
            {hint && <p className="truncate text-[10px] text-slate-400 dark:text-zinc-500">{hint}</p>}
        </div>
    </div>
);

const DataTable = ({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
            <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-zinc-800 dark:bg-zinc-800/30">
                    {head.map(h => (
                        <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                {rows.map((cells, i) => (
                    <tr key={i} className="transition-colors hover:bg-slate-50 dark:hover:bg-zinc-800/40">
                        {cells.map((c, j) => <td key={j} className="whitespace-nowrap px-4 py-2.5 text-slate-700 dark:text-zinc-200">{c}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const Line = ({ label, value, strong, tone }: { label: string; value: unknown; strong?: boolean; tone?: "red" | "green" }) => (
    <div className={cn("flex items-center justify-between gap-3 py-1.5 text-xs", strong ? "mt-1 border-t border-slate-200 pt-2 text-[13px] font-bold dark:border-zinc-700" : "border-b border-dashed border-slate-100 dark:border-zinc-800")}>
        <span className={cn(strong ? "text-slate-800 dark:text-zinc-100" : "text-slate-500 dark:text-zinc-400")}>{label}</span>
        <span className={cn("tabular-nums", tone === "red" && "text-rose-600 dark:text-rose-400", tone === "green" && "text-emerald-600 dark:text-emerald-400", !tone && "text-slate-800 dark:text-zinc-100")}>{inr(value)}</span>
    </div>
);

const Alert = ({ tone, children }: { tone: "red" | "amber"; children: React.ReactNode }) => (
    <p className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs font-medium",
        tone === "red"
            ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300"
            : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300",
    )}>
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{children}</span>
    </p>
);

const RecordCard = ({ r, searchedId }: { r: SalaryRecord; searchedId: string }) => {
    const u = r.salary_user_details ?? {};
    const b = r.salary_backend_details ?? {};
    const mismatch = !isEmpty(r.payment_amount) && !isEmpty(u.net_pay) && Math.round(Number(r.payment_amount)) !== Math.round(Number(u.net_pay));
    const otherEmp = !isEmpty(u.employee_id) && String(u.employee_id) !== searchedId;

    return (
        <div className="space-y-4 p-4">
            {(otherEmp || mismatch) && (
                <div className="space-y-2">
                    {otherEmp && (
                        <Alert tone="red">
                            This record was staged under a different employee: <b>{txt(u.first_name)}</b> ({txt(u.employee_id)}), not {searchedId}.
                        </Alert>
                    )}
                    {mismatch && (
                        <Alert tone="amber">
                            Staged payment amount (<b>{inr(r.payment_amount)}</b>) differs from net pay (<b>{inr(u.net_pay)}</b>).
                        </Alert>
                    )}
                </div>
            )}

            <div className="rounded-lg border border-slate-100 bg-slate-50/50 dark:border-zinc-800 dark:bg-zinc-800/20">
                <Fields
                    cols="sm:grid-cols-2 lg:grid-cols-4"
                    items={[
                        ["Employee ID", <span className="font-mono">{txt(u.employee_id)}</span>],
                        ["Name", txt(u.first_name)],
                        ["Email", txt(u.email_id)],
                        ["Department", isEmpty(u.department) ? "—" : <DepartmentName name={String(u.department)} />],
                        ["Designation", txt(u.designation)],
                        ["Joining", dt(u.joining_date)],
                        ["Term Completion", dt(u.term_completion_date)],
                        ["Project No", <span className="font-mono">{txt(u.project_no || r.projectNumber)}</span>],
                        ["Scheme", txt(u.scheme)],
                        ["Hostel", txt(u.hostel)],
                        ["IFSC", txt(u.ifsc_code)],
                        ["Working Days", txt(u.working_days)],
                    ]}
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 p-4 dark:border-zinc-700">
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                        <Wallet className="h-3.5 w-3.5" /> Earnings
                    </p>
                    <Line label="Basic salary" value={u.basic_salary} />
                    <Line label={`HRA${u.hra_percent ? ` (${u.hra_percent}%)` : ""}`} value={u.hra} />
                    <Line label="Pro-rata basic" value={u.pro_rata_basic} />
                    <Line label="Pro-rata HRA" value={u.pro_rata_hra} />
                    <Line label="Pro-rata medical" value={u.pro_rata_medical} />
                    <Line label="Arrear" value={u.arrear} />
                    <Line label="Gross pay" value={u.gross_pay} strong tone="green" />
                </div>
                <div className="rounded-lg border border-slate-200 p-4 dark:border-zinc-700">
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                        <TrendingDown className="h-3.5 w-3.5" /> Deductions
                    </p>
                    <Line label="HRA deduction" value={u.hra_deduction} />
                    <Line label="Medical deduction" value={u.medical_deduction} />
                    <Line label="Professional tax" value={u.p_tax} />
                    <Line label="TA" value={u.ta} />
                    <Line label="ID card charge" value={u.id_card_charge} />
                    <Line label="Electricity bill" value={u.electricity_bill} />
                    <Line label="Other deduction" value={u.other_deduction} />
                    <Line label="Total deduction" value={u.total_deduction} strong tone="red" />
                </div>
                <div className="flex flex-col rounded-lg border border-slate-200 p-4 dark:border-zinc-700">
                    <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
                        <Receipt className="h-3.5 w-3.5" /> Net Pay
                    </p>
                    <p className="mt-1 text-lg font-bold tabular-nums text-slate-900 dark:text-white">{inr(u.net_pay)}</p>
                    <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2 text-xs dark:border-zinc-800">
                        <p><span className="font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">Comment: </span><span className="text-slate-700 dark:text-zinc-200">{txt(u.comment)}</span></p>
                        <p><span className="font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">Remarks: </span><span className="text-slate-700 dark:text-zinc-200">{txt(u.remarks)}</span></p>
                    </div>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="Commit Details">
                    <Fields
                        cols="sm:grid-cols-2"
                        items={[
                            ["Commit Particular", txt(r.commitParticular)],
                            ["Commit Amount", inr(r.commitAmount)],
                            ["Commit Date", dt(r.commitDate)],
                            ["Commit No", txt(r.transactionCommitNumber ?? r.commit_id)],
                            ["Reference", txt(r.refDetails)],
                            ["FRAP App ID", <span className="font-mono">{txt(r.frapAppId)}</span>],
                            ["Account Head", txt(r.accountHeadId)],
                            ["Budget Head", txt(r.budget_head)],
                            ["Module", txt(r.moduleName)],
                            ["Module ID", txt(r.moduleId)],
                            ["Project Ref No", txt(r.project_ref_number)],
                            ["Doctype", txt(r.doctype)],
                        ]}
                    />
                </Card>
                <Card title="Payment Details">
                    <Fields
                        cols="sm:grid-cols-2"
                        items={[
                            ["Payment Particular", txt(r.payment_particular)],
                            ["Payment Amount", inr(r.payment_amount)],
                            ["Payment Date", dt(r.payment_date)],
                            ["BMR", <span className="font-mono">{txt(r.bmr)}</span>],
                            ["Payment Status", <Badge value={r.payment_status} />],
                            ["Staging Status", <Badge value={r.status} />],
                            ["Account Number", txt(r.account_number)],
                            ["Staging Record", txt(r.name)],
                            ["SCR ID", <span className="font-mono">{txt(b.scr_id)}</span>],
                            ["Backend Project", txt(b.project_no)],
                            ["Current Basic", inr(b.current_basic_salary)],
                            ["Active Basic", inr(b.active_basic_salary)],
                            ["Interview ID", txt(b.interview_id)],
                            ["Tenure Details", txt(b.tenure_details)],
                            ["Salary Gap", txt(r.salary_gap)],
                        ]}
                    />
                </Card>
            </div>
        </div>
    );
};

const MonthPanel = ({ m, searchedId }: { m: SalaryMonth; searchedId: string }) => {
    const [open, setOpen] = useState(false);
    return (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 bg-slate-50/80 px-3 py-1.5 text-left transition-colors hover:bg-slate-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-800"
            >
                <span className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-300" />
                    <span className="text-[13px] font-bold text-slate-900 dark:text-white">{monthLabel(m.salary_year_month)}</span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400">· {m.records.length} record{m.records.length === 1 ? "" : "s"}</span>
                </span>
                <span className="flex items-center gap-2">
                    <span className="text-[13px] font-bold tabular-nums text-slate-900 dark:text-white">{inr(m.month_total)}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", open && "rotate-180")} />
                </span>
            </button>
            {open && (
                <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-zinc-800 dark:border-zinc-800">
                    {m.records.map((r, i) => <RecordCard key={i} r={r} searchedId={searchedId} />)}
                </div>
            )}
        </section>
    );
};

type TabKey = "profile" | "tenure" | "salary";

interface SalaryHistoryModalProps {
    employeeId: string;
    employeeName?: string;
    onClose: () => void;
}

export const SalaryHistoryModal: React.FC<SalaryHistoryModalProps> = ({ employeeId, employeeName, onClose }) => {
    const [tab, setTab] = useState<TabKey>("salary");
    const [yearFilter, setYearFilter] = useState<string>("All");
    const { data, error, isLoading } = useFrappeGetCall<{ message: SalaryHistoryResponse }>(
        "rndopsapp.rndopsapp.commitPayment.get_salary_history",
        { search: employeeId },
        `salary-history-${employeeId}`,
    );

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const res = data?.message;
    const failed = !!error || (!!res && res.status !== "success");
    const staff = res?.project_staff_details?.find(s => s.ps_emp_id === employeeId) ?? res?.project_staff_details?.[0];
    // Latest month first (the backend returns oldest first)
    const months = useMemo(() => [...(res?.salary_history ?? [])].reverse(), [res]);
    const extensions = res?.extension_history ?? [];
    const tenures = staff?.table_ymed ?? [];
    const displayName = staff
        ? [staff.ps_first_name, staff.ps_middle_name, staff.ps_last_name].filter(v => !isEmpty(v)).join(" ")
        : "";
    const name = displayName || employeeName || employeeId;

    // payment_amount is not reliable (net in some months, gross in others), so the net total is
    // summed from each record's net_pay and shown alongside the staged amount as recorded.
    const years = useMemo(
        () => Array.from(new Set(months.map(m => m.salary_year_month.split("_")[0]))).sort((a, b) => b.localeCompare(a)),
        [months],
    );
    const visibleMonths = useMemo(
        () => (yearFilter === "All" ? months : months.filter(m => m.salary_year_month.startsWith(`${yearFilter}_`))),
        [months, yearFilter],
    );
    const visibleNet = useMemo(
        () => visibleMonths.reduce((sum, m) => sum + m.records.reduce((s, r) => s + Number(r.salary_user_details?.net_pay ?? 0), 0), 0),
        [visibleMonths],
    );

    const netTotal = useMemo(
        () => months.reduce((sum, m) => sum + m.records.reduce((s, r) => s + Number(r.salary_user_details?.net_pay ?? 0), 0), 0),
        [months],
    );

    const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
        { key: "salary", label: "Salary History", icon: <IndianRupee className="h-3.5 w-3.5" />, count: months.length },
        { key: "profile", label: "Staff Profile", icon: <User className="h-3.5 w-3.5" /> },
        { key: "tenure", label: "Tenure & Extensions", icon: <FileClock className="h-3.5 w-3.5" />, count: tenures.length + extensions.length },
    ];

    return createPortal(
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm" onClick={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={`Salary history for ${name}`}
                className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl ring-1 ring-black/10 dark:bg-zinc-950 dark:ring-white/10"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative border-b border-[#A3B18A] bg-gradient-to-r from-[#C9D4AA] via-[#D3DDB8] to-[#DEE6C8] px-6 py-4 text-[#2F3B16] dark:border-[#A3B18A]/30 dark:from-[#A3B18A]/25 dark:via-[#A3B18A]/15 dark:to-transparent dark:text-[#E3EAD0]">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6B7C42] text-lg font-bold text-white ring-2 ring-[#A3B18A]">
                                {name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <h3 className="truncate text-lg font-bold leading-tight">{name}</h3>
                                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#44541F] dark:text-[#C5D2A3]">
                                    <span className="rounded border border-[#A3B18A] bg-white/60 px-1.5 py-0.5 font-mono text-[11px] text-[#4A5A28] dark:border-[#A3B18A]/30 dark:bg-white/10 dark:text-[#E3EAD0]">{employeeId}</span>
                                    {staff?.ps_designation && <span>{String(staff.ps_designation)}</span>}
                                    {staff?.ps_department && (
                                        <span className="before:mr-2 before:content-['•']"><DepartmentName name={String(staff.ps_department)} /></span>
                                    )}
                                    {staff?.project_no && <span className="font-mono before:mr-2 before:font-sans before:content-['•']">{String(staff.project_no)}</span>}
                                </p>
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                            {staff?.workflow_state && (
                                <span className="hidden items-center gap-1 rounded-full bg-[#44541F] px-2.5 py-1 text-[11px] font-semibold text-white sm:inline-flex">
                                    <BadgeCheck className="h-3.5 w-3.5" /> {String(staff.workflow_state)}
                                </span>
                            )}
                            <button
                                type="button"
                                aria-label="Close salary history"
                                onClick={onClose}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#44541F] transition-colors hover:bg-[#A3B18A]/40 hover:text-[#2F3B16] dark:text-[#C5D2A3]"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
                        <p className="mt-3 text-sm text-slate-500 dark:text-zinc-400">Loading salary history…</p>
                    </div>
                ) : failed ? (
                    <div className="py-20 text-center">
                        <AlertCircle className="mx-auto mb-2 h-10 w-10 text-rose-500" />
                        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Could not load salary history</p>
                        <p className="mx-auto mt-1 max-w-md text-xs text-rose-400">
                            {res?.message || (error as { message?: string } | undefined)?.message || "Unknown error"}
                        </p>
                    </div>
                ) : (
                    <>
                        {/* KPI strip */}
                        <div className="grid grid-cols-2 gap-3 px-6 pt-4 lg:grid-cols-4">
                            <Kpi icon={<CalendarDays className="h-4 w-4" />} label="Months Paid" value={res?.total_months ?? months.length} tone="bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300" />
                            <Kpi icon={<Receipt className="h-4 w-4" />} label="Records" value={res?.total_records ?? 0} tone="bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300" />
                            <Kpi icon={<Wallet className="h-4 w-4" />} label="Net Pay Total" value={inr(netTotal)} hint="Sum of net pay per record" tone="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300" />
                            <Kpi icon={<IndianRupee className="h-4 w-4" />} label="Staged Amount" value={inr(res?.total_amount)} hint="As recorded in Salary Staging" tone="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300" />
                        </div>

                        {/* Tabs */}
                        <div className="mt-4 flex gap-1 border-b border-slate-200 px-6 dark:border-zinc-800" role="tablist">
                            {tabs.map(t => (
                                <button
                                    key={t.key}
                                    role="tab"
                                    aria-selected={tab === t.key}
                                    onClick={() => setTab(t.key)}
                                    className={cn(
                                        "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors",
                                        tab === t.key
                                            ? "border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300"
                                            : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-100",
                                    )}
                                >
                                    {t.icon} {t.label}
                                    {t.count !== undefined && (
                                        <span className={cn(
                                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                                            tab === t.key ? "bg-indigo-600 text-white dark:bg-indigo-500" : "bg-slate-200 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300",
                                        )}>{t.count}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4 overflow-y-auto p-6">
                            {tab === "salary" && (
                                months.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
                                        <CalendarDays className="mx-auto mb-2 h-10 w-10 text-slate-300 dark:text-zinc-600" />
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">No salary staged yet</p>
                                        <p className="text-xs text-slate-500">No salary has been processed for this employee.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                                            <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">
                                                Year
                                                <select
                                                    value={yearFilter}
                                                    onChange={e => setYearFilter(e.target.value)}
                                                    className="h-7 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold normal-case tracking-normal text-slate-800 outline-none focus:border-indigo-500 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                                                >
                                                    <option value="All">All years</option>
                                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </label>
                                            <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                                                {visibleMonths.length} month{visibleMonths.length === 1 ? "" : "s"} · Net pay <b className="tabular-nums text-slate-800 dark:text-zinc-100">{inr(visibleNet)}</b>
                                            </span>
                                        </div>
                                        {visibleMonths.map(m => (
                                            <MonthPanel key={m.salary_year_month} m={m} searchedId={employeeId} />
                                        ))}
                                    </div>
                                )
                            )}

                            {tab === "profile" && (staff ? (
                                <>
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <Card title="Personal" icon={<User className="h-3.5 w-3.5" />}>
                                            <Fields cols="sm:grid-cols-2" items={[
                                                ["Full Name", name],
                                                ["Date of Birth", dt(staff.ps_date_of_birth)],
                                                ["Gender", txt(staff.ps_gender)],
                                                ["Marital Status", txt(staff.ps_maritial_status)],
                                                ["Blood Group", txt(staff.ps_blood_group)],
                                                ["Citizenship", txt(staff.ps_citizenship)],
                                                ["Father's Name", txt(staff.ps_fathers_name)],
                                            ]} />
                                        </Card>
                                        <Card title="Contact">
                                            <Fields cols="sm:grid-cols-2" items={[
                                                ["Personal Email", txt(staff.ps_email_id)],
                                                ["ERP Email", txt(staff.erp_mail)],
                                                ["Phone", txt(staff.ps_phone_number)],
                                            ]} />
                                            <div className="grid gap-4 border-t border-slate-100 p-4 text-[13px] dark:border-zinc-800">
                                                <div>
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">Present Address</p>
                                                    <p className="mt-0.5 font-medium text-slate-800 dark:text-zinc-100">{txt(staff.ps_present_address)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">Permanent Address</p>
                                                    <p className="mt-0.5 font-medium text-slate-800 dark:text-zinc-100">{txt(staff.ps_permanent_address)}</p>
                                                </div>
                                            </div>
                                        </Card>
                                    </div>
                                    <div className="grid gap-4 lg:grid-cols-2">
                                        <Card title="Employment" right={<Badge value={staff.workflow_state} />}>
                                            <Fields cols="sm:grid-cols-2" items={[
                                                ["Employee ID", <span className="font-mono">{txt(staff.ps_emp_id)}</span>],
                                                ["Designation", txt(staff.ps_designation)],
                                                ["Department", isEmpty(staff.ps_department) ? "—" : <DepartmentName name={String(staff.ps_department)} />],
                                                ["Project No", <span className="font-mono">{txt(staff.project_no)}</span>],
                                                ["PI", txt(staff.pi_id)],
                                                ["SCR ID", <span className="font-mono">{txt(staff.scr_id)}</span>],
                                                ["Application ID", txt(staff.application_id)],
                                                ["Joining Date", dt(staff.ps_joining_date)],
                                                ["Term Completion", dt(staff.ps_term_completion_date)],
                                                ["AON / MRO / JRN", [staff.ps_aon, staff.ps_mro, staff.ps_jrn].map(txt).join(" / ")],
                                                ["Created", dt(staff.creation)],
                                                ["Last Modified", `${dt(staff.modified)} · ${txt(staff.modified_by)}`],
                                            ]} />
                                        </Card>
                                        <div className="space-y-4">
                                            <Card title="Compensation">
                                                <Fields cols="sm:grid-cols-2" items={[
                                                    ["Basic Salary", inr(staff.ps_basic_salary)],
                                                    ["HRA", txt(staff.ps_hra)],
                                                    ["Medical Allowance", inr(staff.ps_ma)],
                                                    ["Hostel", inr(staff.ps_hostel)],
                                                    ["TA", txt(staff.ps_ta)],
                                                    ["TA Amount", inr(staff.ps_ta_amount)],
                                                ]} />
                                            </Card>
                                            <Card title="Identity & Bank">
                                                <Fields cols="sm:grid-cols-2" items={[
                                                    ["PAN", <span className="font-mono">{txt(staff.ps_pan)}</span>],
                                                    ["Aadhaar", <span className="font-mono">{txt(staff.ps_aadhar_number)}</span>],
                                                    ["Bank Account", <span className="font-mono">{txt(staff.bank_account_number)}</span>],
                                                    ["IFSC", <span className="font-mono">{txt(staff.ifsc_code)}</span>],
                                                ]} />
                                            </Card>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="py-12 text-center text-sm text-slate-500">No staff profile found.</p>
                            ))}

                            {tab === "tenure" && (
                                <>
                                    <Card title={`Tenure History (${tenures.length})`} icon={<CalendarDays className="h-3.5 w-3.5" />}>
                                        {tenures.length === 0 ? (
                                            <p className="p-6 text-center text-xs text-slate-500">No tenure records.</p>
                                        ) : (
                                            <DataTable
                                                head={["#", "Joining", "Term Completion", "Basic", "Increment", "HRA", "Extension Sought", "PI Sought", "Staff Sought", "Joining No", "SCR ID", "Tentative Joining"]}
                                                rows={tenures.map((t, i) => [
                                                    t.idx ?? i + 1,
                                                    dt(t.pstd_joining_date),
                                                    dt(t.pstd_term_completion_date),
                                                    inr(t.pstd_basic_salary),
                                                    txt(t.pstd_increment),
                                                    txt(t.pstd_hra),
                                                    txt(t.pstd_extension_sought),
                                                    txt(t.pstd_pi_extension_sought),
                                                    txt(t.pstd_staff_extension_sought),
                                                    txt(t.pstd_joining_number),
                                                    txt(t.pstd_scr_id),
                                                    dt(t.pstd_tentative_joining_date),
                                                ])}
                                            />
                                        )}
                                    </Card>
                                    <Card title={`Extension History (${extensions.length})`} icon={<FileClock className="h-3.5 w-3.5" />}>
                                        {extensions.length === 0 ? (
                                            <p className="p-6 text-center text-xs text-slate-500">No extensions.</p>
                                        ) : (
                                            <>
                                                {extensions[0]?.ex_proj_name && (
                                                    <p className="border-b border-slate-100 px-4 py-2.5 text-xs text-slate-600 dark:border-zinc-800 dark:text-zinc-300">
                                                        <span className="font-semibold uppercase tracking-wider text-indigo-500 dark:text-indigo-300">Project </span>
                                                        {String(extensions[0].ex_proj_name)}
                                                    </p>
                                                )}
                                                <DataTable
                                                    head={["Extension", "Status", "Date of Joining", "Expiry", "Last Ext. Date", "Months Worked", "Period (PI / Staff / Final)", "Increment (PI / Staff)", "Computed New Joining", "Computed New Completion", "Final New Joining", "Final New Completion", "Current Basic", "Created", "Modified"]}
                                                    rows={extensions.map(x => [
                                                        <span className="font-mono">{txt(x.name)}</span>,
                                                        <Badge value={x.workflow_state} />,
                                                        dt(x.ex_doj),
                                                        dt(x.ex_date_of_expiry),
                                                        dt(x.ex_last_ex_date),
                                                        `${txt(x.ex_no_of_mon_worked)} mo ${txt(x.ex_no_of_days_worked)} d`,
                                                        `${txt(x.ex_period_pi)} / ${txt(x.ex_period_staff)} / ${txt(x.ex_period)}`,
                                                        `${txt(x.increment_by_pi)} / ${txt(x.increment_by_staff)}`,
                                                        dt(x.ex_computed_new_joining_date),
                                                        dt(x.ex_computed_new_completion_date),
                                                        dt(x.ex_final_new_joining_date),
                                                        dt(x.ex_final_new_completion_date),
                                                        inr(x.ex_current_basic),
                                                        dt(x.creation),
                                                        `${dt(x.modified)} · ${txt(x.modified_by)}`,
                                                    ])}
                                                />
                                            </>
                                        )}
                                    </Card>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body,
    );
};

export default SalaryHistoryModal;
