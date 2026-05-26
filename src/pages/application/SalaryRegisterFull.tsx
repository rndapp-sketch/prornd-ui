import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFrappePostCall, useFrappeAuth } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
    ArrowLeft, Loader2, Search, Download, RefreshCw,
    User, IndianRupee, AlertCircle, ChevronUp, ChevronDown,
    Calendar, Building2, Briefcase, X, RotateCcw,
    IndianRupeeIcon, Eye, Printer, Unlock,
} from "lucide-react";
import { DepartmentName } from "@/components/DepartmentName";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StaffRecord {
    docName: string;
    employee_id: string;
    first_name: string;
    email_id: string;
    department: string;
    designation: string;
    joining_date: string;
    term_completion_date: string;
    basic_salary: number;
    hra: number;
    medical_allowance: number;
    hostel: number;
    workflow_state: string;
}

interface EditableInputs {
    ta: number;
    otherDeduction: number;
    arrear: number;
    medicalDeduction: number;
    idCardCharge: number;
    electricityBill: number;
    comment: string;
    remarks: string;
}

const MONTHS = [
    { label: "January", value: 0 },
    { label: "February", value: 1 },
    { label: "March", value: 2 },
    { label: "April", value: 3 },
    { label: "May", value: 4 },
    { label: "June", value: 5 },
    { label: "July", value: 6 },
    { label: "August", value: 7 },
    { label: "September", value: 8 },
    { label: "October", value: 9 },
    { label: "November", value: 10 },
    { label: "December", value: 11 },
];

const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);
};

const YEARS = getYearOptions();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);

const fmtDate = (d: string) => {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    } catch { return d; }
};

const getDaysInMonth = (year: number, month: number): number =>
    new Date(year, month + 1, 0).getDate();

const calcWorkingDaysForPeriod = (joiningDate: string, termCompletionDate: string, year: number, month: number): number => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const daysInMonth = monthEnd.getDate();
    if (!joiningDate) return daysInMonth;
    try {
        const jd = new Date(joiningDate);
        jd.setHours(0, 0, 0, 0);
        if (jd.getTime() > monthEnd.getTime()) return 0;
        let start = monthStart.getTime();
        if (jd.getFullYear() === year && jd.getMonth() === month) start = jd.getTime();
        let end = monthEnd.getTime();
        if (termCompletionDate) {
            const tcd = new Date(termCompletionDate);
            tcd.setHours(0, 0, 0, 0);
            if (tcd.getTime() < monthStart.getTime()) return 0;
            if (tcd.getFullYear() === year && tcd.getMonth() === month) end = tcd.getTime();
        }
        if (end < start) return 0;
        return Math.min(Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1, daysInMonth);
    } catch { return daysInMonth; }
};

const calcProRataBasic = (basic: number, workingDays: number, daysInMonth: number): number =>
    (basic / daysInMonth) * workingDays;

const calcPTax = (basicSalary: number): number => {
    if (basicSalary <= 15000) return 0;
    if (basicSalary <= 25000) return 180;
    return 208;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapRow = (row: any): StaffRecord => {
    const basic = parseFloat(row.ps_basic_salary || 0) || 0;
    const hraRaw = String(row.ps_hra || "0").replace("%", "").trim();
    const hraPercent = parseFloat(hraRaw) || 0;
    const hraAmount = hraPercent > 1 ? (basic * hraPercent) / 100 : hraPercent > 0 ? basic * hraPercent : 0;
    const maRaw = String(row.ps_ma || "").toLowerCase();
    const maAmount = maRaw === "yes" || maRaw === "1" || maRaw === "true"
        ? 1250 : parseFloat(row.ps_ma || "0") > 0 ? parseFloat(row.ps_ma) : 0;
    const hostelRaw = String(row.ps_hostel || "").toLowerCase();
    const hostelAmount = hostelRaw === "yes" || hostelRaw === "1" || hostelRaw === "true"
        ? parseFloat(row.ps_hostel_amount || "0") || 0
        : parseFloat(row.ps_hostel || "0") > 0 ? parseFloat(row.ps_hostel) : 0;
    const nameParts = [row.ps_first_name, row.ps_middle_name, row.ps_last_name]
        .map(p => (p && p !== "null" ? String(p).trim() : "")).filter(Boolean);
    return {
        docName: row.name || "",
        employee_id: row.ps_emp_id || row.name || "—",
        first_name: nameParts.join(" ") || "—",
        email_id: row.ps_email_id || "—",
        department: row.ps_department || "—",
        designation: row.ps_designation || "—",
        joining_date: row.ps_joining_date || "",
        term_completion_date: row.ps_term_completion_date || "",
        basic_salary: basic,
        hra: hraAmount,
        medical_allowance: maAmount,
        hostel: hostelAmount,
        workflow_state: row.workflow_state || "Approved",
    };
};

// localStorage key — shared with SalaryModule so edits are synced
const LS_OVERRIDES_KEY = "rnd_salary_overrides";

// ─── numToWords ──────────────────────────────────────────────────────────────
const numToWords = (num: number): string => {
    const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    if (num === 0) return "Zero";
    let n = Math.floor(num);
    const helper = (val: number): string => {
        let str = "";
        if (val >= 100) { str += a[Math.floor(val / 100)] + " Hundred "; val %= 100; }
        if (val >= 20) { str += b[Math.floor(val / 10)] + " "; val %= 10; }
        if (val > 0) str += a[val] + " ";
        return str.trim();
    };
    let words = "";
    if (n >= 10000000) { words += helper(Math.floor(n / 10000000)) + " Crore "; n %= 10000000; }
    if (n >= 100000) { words += helper(Math.floor(n / 100000)) + " Lakh "; n %= 100000; }
    if (n >= 1000) { words += helper(Math.floor(n / 1000)) + " Thousand "; n %= 1000; }
    if (n > 0) words += helper(n);
    const paisa = Math.round((num % 1) * 100);
    return words.trim() + (paisa > 0 ? " and " + helper(paisa) + " Paisa" : "") + " Rupees Only";
};

type SortKey = keyof StaffRecord;

// ─── Component ────────────────────────────────────────────────────────────────

const SalaryRegisterFull: React.FC = () => {
    const { currentUser } = useFrappeAuth();
    const navigate = useNavigate();

    const [records, setRecords] = useState<StaffRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("department");
    const [selectedSlipRecord, setSelectedSlipRecord] = useState<StaffRecord | null>(null);
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
    const [preparedCycles, setPreparedCycles] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem("rnd_prepared_salary_cycles");
        if (saved) {
            try { return JSON.parse(saved); } catch { }
        }
        return {
            "2026-0": true,
            "2026-1": true,
            "2026-2": true,
            "2026-3": true,
            "2026-4": true,
        };
    });

    const [deptFilter, setDeptFilter] = useState<string>("All");
    const [desigFilter, setDesigFilter] = useState<string>("All");
    const [departmentLabels, setDepartmentLabels] = useState<Record<string, string>>({});
    const cycleKey = `${selectedYear}-${selectedMonth}`;
    const isPrepared = !!preparedCycles[cycleKey];

    // ── Overrides — read/write localStorage so they stay in sync with SalaryModule ──
    const [overrides, setOverrides] = useState<Record<string, Partial<EditableInputs>>>(() => {
        const saved = localStorage.getItem(LS_OVERRIDES_KEY);
        if (saved) { try { return JSON.parse(saved); } catch { } }
        return {};
    });

    // Persist overrides to localStorage on every change
    useEffect(() => {
        localStorage.setItem(LS_OVERRIDES_KEY, JSON.stringify(overrides));
    }, [overrides]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { call: getList } = useFrappePostCall<{ message: any[] }>("frappe.client.get_list");

    // ── getRowInputs — same logic as SalaryModule ──────────────────────────────
    const getRowInputs = useCallback((docName: string): { inputs: EditableInputs; isEdited: Record<keyof EditableInputs, boolean> } => {
        const record = records.find(r => r.docName === docName);
        const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
        const workingDays = record
            ? calcWorkingDaysForPeriod(record.joining_date, record.term_completion_date, selectedYear, selectedMonth)
            : daysInMonth;
        const defaultMedical = record ? (record.medical_allowance / daysInMonth) * workingDays : 0;
        const rowOverrides = overrides[docName] || {};

        const inputs: EditableInputs = {
            ta: rowOverrides.ta ?? 0,
            otherDeduction: rowOverrides.otherDeduction ?? 0,
            arrear: rowOverrides.arrear ?? 0,
            medicalDeduction: rowOverrides.medicalDeduction ?? parseFloat(defaultMedical.toFixed(2)),
            idCardCharge: rowOverrides.idCardCharge ?? 0,
            electricityBill: rowOverrides.electricityBill ?? 0,
            comment: rowOverrides.comment ?? "",
            remarks: rowOverrides.remarks ?? "",
        };

        const isEdited: Record<keyof EditableInputs, boolean> = {
            ta: rowOverrides.ta !== undefined,
            otherDeduction: rowOverrides.otherDeduction !== undefined,
            arrear: rowOverrides.arrear !== undefined,
            medicalDeduction: rowOverrides.medicalDeduction !== undefined,
            idCardCharge: rowOverrides.idCardCharge !== undefined,
            electricityBill: rowOverrides.electricityBill !== undefined,
            comment: rowOverrides.comment !== undefined,
            remarks: rowOverrides.remarks !== undefined,
        };

        return { inputs, isEdited };
    }, [overrides, records, selectedYear, selectedMonth]);

    // ── handleInputChange — mirrors SalaryModule logic ─────────────────────────
    const handleInputChange = (docName: string, field: keyof EditableInputs, value: string | number) => {
        setOverrides(prev => {
            const currentOverrides = prev[docName] || {};
            let shouldStore = true;

            if (field === "ta" || field === "otherDeduction" || field === "arrear" || field === "idCardCharge" || field === "electricityBill") {
                if (parseFloat(value as string) === 0 || value === "") shouldStore = false;
            } else if (field === "comment" || field === "remarks") {
                if (value === "") shouldStore = false;
            } else if (field === "medicalDeduction") {
                const record = records.find(r => r.docName === docName);
                const dim = getDaysInMonth(selectedYear, selectedMonth);
                const wd = record ? calcWorkingDaysForPeriod(record.joining_date, record.term_completion_date, selectedYear, selectedMonth) : dim;
                const defaultMed = record ? parseFloat(((record.medical_allowance / dim) * wd).toFixed(2)) : 0;
                if (parseFloat(value as string) === defaultMed) shouldStore = false;
            }

            const updated = { ...currentOverrides };
            if (shouldStore) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                updated[field] = value as any;
            } else {
                delete updated[field];
            }

            const result = { ...prev };
            if (Object.keys(updated).length > 0) {
                result[docName] = updated;
            } else {
                delete result[docName];
            }
            return result;
        });
    };

    const resetOverrides = () => {
        if (window.confirm("Reset all manual edits for this period?")) {
            setOverrides({});
        }
    };

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setError(null);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let rows: any[] = [];
            try {
                const res = await getList({ doctype: "Project Staff Details", filters: [["owner", "=", currentUser], ["workflow_state", "=", "Approved"]], fields: ["*"], limit_page_length: 500 });
                rows = res?.message ?? [];
            } catch { /* fallback */ }

            if (rows.length === 0) {
                for (const f of ["webmail_id", "pi_webmail", "pi_email", "principal_investigator"]) {
                    try {
                        const res = await getList({ doctype: "Project Staff Details", filters: [[f, "=", currentUser], ["workflow_state", "=", "Approved"]], fields: ["*"], limit_page_length: 500 });
                        rows = res?.message ?? [];
                        if (rows.length > 0) break;
                    } catch { /* skip */ }
                }
            }

            if (rows.length === 0) {
                try {
                    const res = await getList({ doctype: "Project Staff Details", filters: [["workflow_state", "=", "Approved"]], fields: ["*"], limit_page_length: 500 });
                    const all = res?.message ?? [];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    rows = all.filter((r: any) => r.owner === currentUser || r.webmail_id === currentUser || r.pi_webmail === currentUser || r.pi_email === currentUser);
                    if (rows.length === 0) rows = all;
                } catch { /* ignore */ }
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            rows = rows.filter((r: any) => (r.workflow_state || "").toLowerCase() === "approved");
            setRecords(rows.map(mapRow));
        } catch (err: unknown) {
            const e = err as { exception?: string; message?: string };
            setError(e?.exception || e?.message || String(err));
        } finally {
            setIsLoading(false);
        }
    }, [getList, currentUser]);

    useEffect(() => { if (currentUser) fetchData(); }, [fetchData, currentUser]);

    // ── Department labels ─────────────────────────────────────────────────────
    const departmentsList = useMemo(() => {
        const set = new Set<string>();
        records.forEach(r => { if (r.department && r.department !== "—") set.add(r.department); });
        return ["All", ...Array.from(set)].sort();
    }, [records]);

    useEffect(() => {
        const ids = departmentsList.filter(d => d !== "All");
        if (ids.length === 0) { setDepartmentLabels({}); return; }
        let cancelled = false;
        (async () => {
            try {
                const res = await getList({ doctype: "Department_prornd", filters: [["name", "in", ids]], fields: ["name", "dept_name"], limit_page_length: ids.length });
                if (cancelled) return;
                const labels: Record<string, string> = {};
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (res?.message || []).forEach((d: any) => { if (d?.name) labels[d.name] = d.dept_name || d.name; });
                setDepartmentLabels(labels);
            } catch { if (!cancelled) setDepartmentLabels({}); }
        })();
        return () => { cancelled = true; };
    }, [departmentsList, getList]);

    const departmentOptions = useMemo(() =>
        departmentsList.map(v => ({ value: v, label: v === "All" ? "All" : departmentLabels[v] || v }))
            .sort((a, b) => { if (a.value === "All") return -1; if (b.value === "All") return 1; return a.label.localeCompare(b.label); }),
        [departmentsList, departmentLabels]
    );

    const designationsList = useMemo(() => {
        const set = new Set<string>();
        records.forEach(r => { if (r.designation && r.designation !== "—") set.add(r.designation); });
        return ["All", ...Array.from(set)].sort();
    }, [records]);

    // ── Filtered + sorted list ────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        let list = records.filter(r => calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth) > 0);
        if (q) list = list.filter(r =>
            r.first_name.toLowerCase().includes(q) || r.employee_id.toLowerCase().includes(q) ||
            r.email_id.toLowerCase().includes(q) || r.department.toLowerCase().includes(q) ||
            (departmentLabels[r.department] || "").toLowerCase().includes(q) || r.designation.toLowerCase().includes(q)
        );
        if (deptFilter !== "All") list = list.filter(r => r.department === deptFilter);
        if (desigFilter !== "All") list = list.filter(r => r.designation === desigFilter);
        return [...list].sort((a, b) => {
            const getDepartmentName = (record: StaffRecord) =>
                departmentLabels[record.department] || record.department;
            const av = sortKey === "department" ? getDepartmentName(a) : a[sortKey];
            const bv = sortKey === "department" ? getDepartmentName(b) : b[sortKey];
            let cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
            if (cmp === 0 && sortKey === "department") cmp = a.first_name.localeCompare(b.first_name);
            if (cmp === 0) cmp = a.employee_id.localeCompare(b.employee_id);
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [records, search, deptFilter, desigFilter, sortKey, sortDir, selectedMonth, selectedYear, departmentLabels]);

    const handleSort = (k: SortKey) => {
        if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(k); setSortDir("asc"); }
    };

    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

    // ── Totals ────────────────────────────────────────────────────────────────
    const totalBasic = filtered.reduce((s, r) => s + r.basic_salary, 0);
    const totalOriginalHRA = filtered.reduce((s, r) => s + r.hra, 0);
    const totalWorkingDays = filtered.reduce((s, r) => s + calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth), 0);
    const totalProRataBasic = filtered.reduce((s, r) => s + calcProRataBasic(r.basic_salary, calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth), daysInMonth), 0);
    const totalHRA = filtered.reduce((s, r) => s + (r.hra / daysInMonth) * calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth), 0);
    const totalMedical = filtered.reduce((s, r) => s + (r.medical_allowance / daysInMonth) * calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth), 0);
    const totalArrear = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.arrear, 0);
    const totalMedicalDed = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.medicalDeduction, 0);
    const totalPTax = filtered.reduce((s, r) => s + calcPTax(r.basic_salary), 0);
    const totalTA = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.ta, 0);
    const totalIdCard = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.idCardCharge, 0);
    const totalElectricity = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.electricityBill, 0);
    const totalOtherDeduct = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.otherDeduction, 0);

    const totalEarnings = useMemo(() => filtered.reduce((s, r) => {
        const { inputs } = getRowInputs(r.docName);
        const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
        return s + calcProRataBasic(r.basic_salary, wd, daysInMonth) + (r.hra / daysInMonth) * wd + (r.medical_allowance / daysInMonth) * wd + inputs.arrear;
    }, 0), [filtered, getRowInputs, selectedMonth, selectedYear, daysInMonth]);

    const totalDeductions = useMemo(() => filtered.reduce((s, r) => {
        const { inputs } = getRowInputs(r.docName);
        const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
        return s + (r.hra / daysInMonth) * wd + inputs.medicalDeduction + calcPTax(r.basic_salary) + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
    }, 0), [filtered, getRowInputs, selectedMonth, selectedYear, daysInMonth]);

    const totalNetPay = useMemo(() => filtered.reduce((s, r) => {
        const { inputs } = getRowInputs(r.docName);
        const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
        const gross = calcProRataBasic(r.basic_salary, wd, daysInMonth) + (r.hra / daysInMonth) * wd + (r.medical_allowance / daysInMonth) * wd + inputs.arrear;
        const ded = (r.hra / daysInMonth) * wd + inputs.medicalDeduction + calcPTax(r.basic_salary) + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
        return s + (gross - ded);
    }, 0), [filtered, getRowInputs, selectedMonth, selectedYear, daysInMonth]);

    // ── CSV Export ────────────────────────────────────────────────────────────
    const exportCSV = () => {
        const ml = MONTHS.find(m => m.value === selectedMonth)?.label || "Month";
        const headers = ["Sl.No", "Employee Id", "First Name", "Email Id", "Department", "Designation", "Joining Date", "Term Completion Date", "Basic Salary", "HRA", "Total Working Days", "Amount (Working Days)", "HRA amt (W.Days)", "Medical amt (W.Days)", "Arrear", "Gross Pay", "HRA amt (W.Days) [Deduction]", "Medical Ded.", "P-Tax", "TA", "ID Card Charge", "Electricity Bill", "Other Deduction", "Total Deduction", "Net Pay", "Comment", "Remarks"];
        const rows = filtered.map((r, i) => {
            const { inputs } = getRowInputs(r.docName);
            const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
            const prb = calcProRataBasic(r.basic_salary, wd, daysInMonth);
            const pHRA = (r.hra / daysInMonth) * wd;
            const pMA = (r.medical_allowance / daysInMonth) * wd;
            const gross = prb + pHRA + pMA + inputs.arrear;
            const pt = calcPTax(r.basic_salary);
            const ded = pHRA + inputs.medicalDeduction + pt + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
            return [i + 1, r.employee_id, r.first_name, r.email_id, r.department, r.designation, r.joining_date, r.term_completion_date, r.basic_salary, r.hra, wd, prb.toFixed(2), pHRA.toFixed(2), pMA.toFixed(2), inputs.arrear, gross.toFixed(2), pHRA.toFixed(2), inputs.medicalDeduction, pt, inputs.ta, inputs.idCardCharge, inputs.electricityBill, inputs.otherDeduction, ded.toFixed(2), (gross - ded).toFixed(2), inputs.comment, inputs.remarks];
        });
        const csv = [headers, ...rows].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `Staff_Salary_Statement_${ml}_${selectedYear}.csv`;
        a.click();
    };

    // ── Table header helper ───────────────────────────────────────────────────
    const TH = ({ label, k, align = "left", colSpan = 1, rowSpan = 1, className = "" }: {
        label: string; k?: SortKey; align?: "left" | "right" | "center"; colSpan?: number; rowSpan?: number; className?: string;
    }) => (
        <th colSpan={colSpan} rowSpan={rowSpan} onClick={k ? () => handleSort(k) : undefined}
            className={cn("whitespace-nowrap border-b border-[#C7D2FE]/70 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider transition-colors dark:border-[#4A6CF7]/25",
                align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
                k && "cursor-pointer hover:bg-[#C7D2FE]/40 hover:text-[#1E3A8A] dark:hover:bg-[#4A6CF7]/20 dark:hover:text-[#C7D2FE]", className)}>
            <span className="inline-flex items-center gap-1 justify-center">
                {label}
                {k && sortKey === k && (sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-[#D97757]" /> : <ChevronDown className="w-3 h-3 text-[#D97757]" />)}
            </span>
        </th>
    );

    // Shared editable input style
    const editInputCls = (edited: boolean) => cn(
        "px-2 py-1 text-xs text-right bg-white dark:bg-zinc-800 border rounded focus:ring-2 focus:ring-[#D97757]/30 focus:outline-none transition-all tabular-nums",
        edited ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold" : "border-zinc-200 dark:border-zinc-700"
    );

    const hasOverrides = Object.keys(overrides).length > 0;
    const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || "";

    return (
        <div className="h-screen flex flex-col bg-[#FAFAF9] dark:bg-[#18181B] font-sans text-[#3F3F46] dark:text-[#E4E4E7] overflow-hidden">

            {/* ── Search Toolbar ── */}
            <header className="shrink-0 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
                <div className="h-[2.5px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <button
                        onClick={() => navigate("/salary-module")}
                        aria-label="Back to salary module"
                        title="Back to salary module"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] text-[#71717A] transition-colors hover:border-[#D97757]/30 hover:bg-[#D97757]/10 hover:text-[#D97757] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#A1A1AA]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>

                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A1A1AA]" />
                        <input
                            type="text"
                            placeholder="Search salary register by employee ID, name, email, department, or role..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="h-9 w-full rounded-lg border border-[#E4E4E7] bg-white py-2 pl-9 pr-9 text-[12px] text-[#3F3F46] placeholder:text-[#A1A1AA] focus:border-[#4A6CF7] focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/15 dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#E4E4E7]"
                        />
                        {search && (
                            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#3F3F46]">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="hidden shrink-0 text-right text-[11px] font-bold uppercase tracking-wide text-[#71717A] dark:text-[#A1A1AA] sm:block">
                        {monthLabel} {selectedYear} · {filtered.length} staff
                    </div>

                    {isPrepared && (
                        <button
                            onClick={() => {
                                const confirm = window.confirm(`Are you sure you want to unlock the salary cycle for ${monthLabel} ${selectedYear}? This will revert it to draft mode.`);
                                if (!confirm) return;
                                setPreparedCycles(prev => {
                                    const next = { ...prev };
                                    delete next[cycleKey];
                                    localStorage.setItem("rnd_prepared_salary_cycles", JSON.stringify(next));
                                    return next;
                                });
                            }}
                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-white px-3 text-[12px] font-bold text-[#3F3F46] transition-all hover:bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8] dark:hover:bg-[#3F3F46]"
                        >
                            <Unlock className="h-3.5 w-3.5" />
                            Unlock
                        </button>
                    )}

                    <button
                        onClick={fetchData}
                        disabled={isLoading}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-white px-3 text-[12px] font-bold text-[#3F3F46] transition-all hover:bg-[#FAFAF9] disabled:opacity-50 dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8] dark:hover:bg-[#3F3F46]"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5 text-[#71717A]", isLoading && "animate-spin")} />
                        Refresh
                    </button>

                    <button
                        onClick={exportCSV}
                        disabled={filtered.length === 0 || isLoading || !isPrepared}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-[#D97757] px-3 text-[12px] font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#F4F4F5] disabled:text-[#A1A1AA] dark:disabled:bg-[#3F3F46] dark:disabled:text-[#71717A]"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Export CSV
                    </button>
                </div>
            </header>

            {/* ── Table area (scrollable) ── */}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-[#4A6CF7]" />
                        <p className="text-sm font-medium text-[#71717A]">Loading approved staff records...</p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 px-6">
                        <AlertCircle className="h-12 w-12 text-red-500" />
                        <p className="text-sm font-bold text-red-600">Failed to load staff list</p>
                        <p className="text-xs text-red-400 max-w-lg text-center break-all bg-red-50 p-3 rounded-lg border border-red-200">{error}</p>
                        <button onClick={fetchData} className="text-sm text-[#D97757] hover:underline font-bold">Try again</button>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                        <User className="h-14 w-14 text-zinc-300 dark:text-zinc-600" />
                        <p className="text-base font-bold text-zinc-900 dark:text-white">No approved staff found</p>
                        <p className="text-sm text-zinc-400 max-w-md text-center">
                            {search || deptFilter !== "All" || desigFilter !== "All"
                                ? "No staff matches the specified filters."
                                : `No approved Project Staff Details records found for ${currentUser || "your account"} in the selected period.`}
                        </p>
                    </div>
                ) : (
                    <table className="min-w-[2600px] table-auto border-collapse w-full">
                        <thead className="sticky top-0 z-20 bg-[#EEF2FF] text-[10px] font-extrabold uppercase tracking-wider text-[#1E3A8A] dark:bg-[#1E3A8A]/18 dark:text-[#C7D2FE]">
                            <tr className="border-b border-[#C7D2FE]/70 bg-[#EEF2FF] dark:border-[#4A6CF7]/25 dark:bg-[#1E3A8A]/18">
                                <th rowSpan={2} className="w-10 border-r border-[#C7D2FE]/70 px-3 py-4 text-left dark:border-[#4A6CF7]/25">#</th>
                                <th rowSpan={2} className="border-r border-[#C7D2FE]/70 px-3 py-4 text-left dark:border-[#4A6CF7]/25">Emp ID</th>
                                <th rowSpan={2} className="border-r border-[#C7D2FE]/70 px-3 py-4 text-left dark:border-[#4A6CF7]/25">Full Name</th>
                                <th rowSpan={2} className="px-3 py-4 text-left">Email ID</th>
                                <th rowSpan={2} className="px-3 py-4 text-left">Department</th>
                                <th rowSpan={2} className="px-3 py-4 text-left">Role</th>
                                <th rowSpan={2} className="px-3 py-4 text-left">Joining</th>
                                <th rowSpan={2} className="px-3 py-4 text-left">Exit Date</th>
                                <th colSpan={8} className="px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-center border-b border-zinc-200 dark:border-zinc-800">Earnings Details (₹)</th>
                                <th colSpan={8} className="px-3 py-2 bg-red-50/50 dark:bg-red-950/20 text-red-800 dark:text-red-400 text-center border-b border-zinc-200 dark:border-zinc-800">Deductions Details (₹)</th>
                                <th rowSpan={2} className="px-4 py-4 text-right font-bold text-amber-800 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10 border-l border-r border-zinc-200 dark:border-zinc-800">Net Pay (₹)</th>
                                <th rowSpan={2} className="px-3 py-4 text-left">Comment</th>
                                <th rowSpan={2} className="px-3 py-4 text-left border-r border-zinc-200 dark:border-zinc-800">Remarks</th>
                                <th rowSpan={2} className="px-3 py-4 text-center bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800">Slip</th>
                            </tr>
                            <tr className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                <TH label="Basic" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                <TH label="HRA" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                <TH label="Days" align="center" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                <TH label="Amt (Days)" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                <TH label="HRA (Days)" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                <TH label="MA (Days)" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                <TH label="Arrear" align="right" className="bg-emerald-50/30 dark:bg-emerald-950/20 text-[#D97757] font-semibold" />
                                <TH label="Gross" align="right" className="bg-emerald-50/30 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold" />
                                <TH label="HRA Ded" align="right" className="bg-rose-50/10 dark:bg-rose-950/10 text-rose-700 dark:text-rose-400" />
                                <TH label="Medical" align="right" className="bg-rose-50/30 dark:bg-rose-950/20 text-[#D97757] font-semibold" />
                                <TH label="P-Tax" align="right" className="bg-rose-50/10 dark:bg-rose-950/10 text-rose-700 dark:text-rose-400" />
                                <TH label="TA" align="right" className="bg-rose-50/30 dark:bg-rose-950/20 text-[#D97757] font-semibold" />
                                <TH label="ID Card" align="right" className="bg-rose-50/30 dark:bg-rose-950/20 text-[#D97757] font-semibold" />
                                <TH label="Electr." align="right" className="bg-rose-50/30 dark:bg-rose-950/20 text-[#D97757] font-semibold" />
                                <TH label="Other" align="right" className="bg-rose-50/30 dark:bg-rose-950/20 text-[#D97757] font-semibold" />
                                <TH label="Total Ded" align="right" className="bg-rose-50/30 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 font-bold" />
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-sm">
                            {filtered.map((r, i) => {
                                const { inputs, isEdited } = getRowInputs(r.docName);
                                const workingDays = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
                                const proRataBasic = calcProRataBasic(r.basic_salary, workingDays, daysInMonth);
                                const proRataHRA = (r.hra / daysInMonth) * workingDays;
                                const proRataMedical = (r.medical_allowance / daysInMonth) * workingDays;
                                const grossPay = proRataBasic + proRataHRA + proRataMedical + inputs.arrear;
                                const pTax = calcPTax(r.basic_salary);
                                const totalDed = proRataHRA + inputs.medicalDeduction + pTax + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
                                const netPay = grossPay - totalDed;

                                return (
                                    <tr key={r.docName || i} className="hover:bg-zinc-50 dark:hover:bg-zinc-850/50 transition-colors group">
                                        {/* # */}
                                        <td className="px-3 py-2.5 text-xs text-zinc-400 bg-white group-hover:bg-zinc-50 dark:bg-zinc-900 dark:group-hover:bg-zinc-850 border-r border-zinc-200 dark:border-zinc-800">{i + 1}</td>

                                        {/* Emp ID */}
                                        <td className="px-3 py-2.5 bg-white group-hover:bg-zinc-50 dark:bg-zinc-900 dark:group-hover:bg-zinc-850 border-r border-zinc-200 dark:border-zinc-800">
                                            <span className="text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-700/50">{r.employee_id}</span>
                                        </td>

                                        {/* Full Name */}
                                        <td className="px-3 py-2.5 bg-white group-hover:bg-zinc-50 dark:bg-zinc-900 dark:group-hover:bg-zinc-850 border-r border-zinc-200 dark:border-zinc-800">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#D97757]/20 to-orange-200/50 dark:from-[#D97757]/30 dark:to-orange-950/30 flex items-center justify-center shrink-0 border border-orange-500/10">
                                                    <span className="text-[9px] font-bold text-[#D97757]">{r.first_name.charAt(0).toUpperCase()}</span>
                                                </div>
                                                <span className="text-xs font-semibold text-zinc-950 dark:text-zinc-100 whitespace-nowrap">{r.first_name}</span>
                                            </div>
                                        </td>

                                        <td className="px-3 py-2.5 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.email_id}</td>
                                        <td className="px-3 py-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                                            {r.department && r.department !== "—" ? <DepartmentName name={r.department} /> : "—"}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 px-2 py-0.5 rounded-full whitespace-nowrap font-semibold">{r.designation}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-zinc-500 whitespace-nowrap">{fmtDate(r.joining_date)}</td>
                                        <td className="px-3 py-2.5 text-xs text-zinc-500 whitespace-nowrap font-mono">{r.term_completion_date ? fmtDate(r.term_completion_date) : "—"}</td>

                                        {/* Earnings */}
                                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5 border-l border-zinc-100 dark:border-zinc-800">{fmt(r.basic_salary)}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">{fmt(r.hra)}</td>
                                        <td className="px-3 py-2.5 text-center tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">
                                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border",
                                                workingDays < daysInMonth ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200/50")}>
                                                {workingDays} / {daysInMonth}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">
                                            <span className={cn(workingDays < daysInMonth && "text-amber-600 dark:text-amber-400 font-semibold")}>{fmt(proRataBasic)}</span>
                                        </td>
                                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">{fmt(proRataHRA)}</td>
                                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">{fmt(proRataMedical)}</td>

                                        {/* Arrear — editable */}
                                        <td className="px-2 py-1.5 bg-emerald-50/10 dark:bg-emerald-950/10 border-l border-zinc-100 dark:border-zinc-850">
                                            <input type="number" value={inputs.arrear || ""} min="0" placeholder="0"
                                                onChange={e => handleInputChange(r.docName, "arrear", parseFloat(e.target.value) || 0)}
                                                className={cn(editInputCls(isEdited.arrear), "w-20")} />
                                        </td>

                                        {/* Gross Pay */}
                                        <td className="px-3 py-2.5 text-right font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-950/15 tabular-nums whitespace-nowrap border-l border-r border-zinc-200/50 dark:border-zinc-800/80">{fmt(grossPay)}</td>

                                        {/* HRA Deduction (static) */}
                                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap bg-red-50/5 dark:bg-red-950/5">{fmt(proRataHRA)}</td>

                                        {/* Medical Deduction — editable */}
                                        <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                            <input type="number" value={inputs.medicalDeduction || ""} min="0" placeholder="0"
                                                onChange={e => handleInputChange(r.docName, "medicalDeduction", parseFloat(e.target.value) || 0)}
                                                className={cn(editInputCls(isEdited.medicalDeduction), "w-16")} />
                                        </td>

                                        {/* P-Tax (static) */}
                                        <td className="px-3 py-2.5 text-right tabular-nums whitespace-nowrap bg-red-50/5 dark:bg-red-950/5">{fmt(pTax)}</td>

                                        {/* TA — editable */}
                                        <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                            <input type="number" value={inputs.ta || ""} min="0" placeholder="0"
                                                onChange={e => handleInputChange(r.docName, "ta", parseFloat(e.target.value) || 0)}
                                                className={cn(editInputCls(isEdited.ta), "w-16")} />
                                        </td>

                                        {/* ID Card — editable */}
                                        <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                            <input type="number" value={inputs.idCardCharge || ""} min="0" placeholder="0"
                                                onChange={e => handleInputChange(r.docName, "idCardCharge", parseFloat(e.target.value) || 0)}
                                                className={cn(editInputCls(isEdited.idCardCharge), "w-16")} />
                                        </td>

                                        {/* Electricity — editable */}
                                        <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                            <input type="number" value={inputs.electricityBill || ""} min="0" placeholder="0"
                                                onChange={e => handleInputChange(r.docName, "electricityBill", parseFloat(e.target.value) || 0)}
                                                className={cn(editInputCls(isEdited.electricityBill), "w-16")} />
                                        </td>

                                        {/* Other Deduction — editable */}
                                        <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                            <input type="number" value={inputs.otherDeduction || ""} min="0" placeholder="0"
                                                onChange={e => handleInputChange(r.docName, "otherDeduction", parseFloat(e.target.value) || 0)}
                                                className={cn(editInputCls(isEdited.otherDeduction), "w-16")} />
                                        </td>

                                        {/* Total Deduction */}
                                        <td className="px-3 py-2.5 text-right font-semibold text-rose-600 dark:text-rose-400 bg-red-50/10 dark:bg-red-950/15 tabular-nums whitespace-nowrap border-l border-r border-zinc-200/50 dark:border-zinc-800/80">{fmt(totalDed)}</td>

                                        {/* Net Pay */}
                                        <td className="px-4 py-2.5 text-right font-bold text-amber-800 dark:text-amber-400 bg-amber-50/15 dark:bg-amber-950/10 border-l border-r border-zinc-200/80 dark:border-zinc-800/80 tabular-nums whitespace-nowrap">{fmt(netPay)}</td>

                                        {/* Comment — editable */}
                                        <td className="px-2 py-1.5">
                                            <input type="text" value={inputs.comment} placeholder="Note..." maxLength={120}
                                                onChange={e => handleInputChange(r.docName, "comment", e.target.value)}
                                                className={cn("w-28 px-2 py-1 text-xs bg-white dark:bg-zinc-800 border rounded focus:ring-2 focus:ring-[#D97757]/30 focus:outline-none transition-all",
                                                    isEdited.comment ? "border-amber-400 bg-amber-50/10" : "border-zinc-200 dark:border-zinc-700")} />
                                        </td>

                                        {/* Remarks — editable */}
                                        <td className="px-2 py-1.5 border-r border-zinc-100 dark:border-zinc-800">
                                            <input type="text" value={inputs.remarks} placeholder="Remarks..." maxLength={120}
                                                onChange={e => handleInputChange(r.docName, "remarks", e.target.value)}
                                                className={cn("w-28 px-2 py-1 text-xs bg-white dark:bg-zinc-800 border rounded focus:ring-2 focus:ring-[#D97757]/30 focus:outline-none transition-all",
                                                    isEdited.remarks ? "border-amber-400 bg-amber-50/10" : "border-zinc-200 dark:border-zinc-700")} />
                                        </td>

                                        {/* Payslip View Button */}
                                        <td className="px-3 py-2.5 text-center bg-white group-hover:bg-zinc-50 dark:bg-zinc-900 dark:group-hover:bg-zinc-850 border-r border-zinc-200 dark:border-zinc-800">
                                            <button
                                                onClick={() => setSelectedSlipRecord(r)}
                                                title="View Pay Slip"
                                                className="p-1.5 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757] dark:hover:text-white transition-all shadow-sm active:scale-90"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* FOOTER totals row */}
                            <tr className="bg-zinc-50 dark:bg-zinc-950 sticky bottom-0 z-10 border-t-2 border-zinc-200 dark:border-zinc-700 font-bold text-xs uppercase tracking-wide">
                                <td colSpan={8} className="px-3 py-3.5 text-sm font-serif font-bold text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shadow-sm">
                                    Total ({filtered.length} Staff)
                                </td>
                                <td className="px-3 py-3.5 text-right text-emerald-800 dark:text-emerald-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10 border-l border-zinc-200 dark:border-zinc-800">{fmt(totalBasic)}</td>
                                <td className="px-3 py-3.5 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalOriginalHRA)}</td>
                                <td className="px-3 py-3.5 text-center text-zinc-600 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{totalWorkingDays}</td>
                                <td className="px-3 py-3.5 text-right text-emerald-800 dark:text-emerald-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalProRataBasic)}</td>
                                <td className="px-3 py-3.5 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalHRA)}</td>
                                <td className="px-3 py-3.5 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalMedical)}</td>
                                <td className="px-3 py-3.5 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/15">{fmt(totalArrear)}</td>
                                <td className="px-3 py-3.5 text-right text-emerald-900 dark:text-emerald-300 bg-emerald-100/40 dark:bg-emerald-900/20 font-bold tabular-nums whitespace-nowrap border-l border-r border-zinc-200 dark:border-zinc-800">{fmt(totalEarnings)}</td>
                                <td className="px-3 py-3.5 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-rose-50/10 dark:bg-rose-950/10">{fmt(totalHRA)}</td>
                                <td className="px-3 py-3.5 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-rose-50/15 dark:bg-rose-950/15">{fmt(totalMedicalDed)}</td>
                                <td className="px-3 py-3.5 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-rose-50/10 dark:bg-rose-950/10">{fmt(totalPTax)}</td>
                                <td className="px-3 py-3.5 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-rose-50/15 dark:bg-rose-950/15">{fmt(totalTA)}</td>
                                <td className="px-3 py-3.5 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-rose-50/15 dark:bg-rose-950/15">{fmt(totalIdCard)}</td>
                                <td className="px-3 py-3.5 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-rose-50/15 dark:bg-rose-950/15">{fmt(totalElectricity)}</td>
                                <td className="px-3 py-3.5 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-rose-50/15 dark:bg-rose-950/15">{fmt(totalOtherDeduct)}</td>
                                <td className="px-3 py-3.5 text-right text-rose-900 dark:text-rose-300 bg-rose-100/40 dark:bg-rose-900/20 font-bold tabular-nums whitespace-nowrap border-l border-r border-zinc-200 dark:border-zinc-800">{fmt(totalDeductions)}</td>
                                <td className="px-4 py-3.5 text-right text-amber-900 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/20 font-bold tabular-nums whitespace-nowrap border-l border-r border-zinc-250 dark:border-zinc-700">{fmt(totalNetPay)}</td>
                                <td colSpan={2} className="px-3 py-3.5 border-r border-zinc-200 dark:border-zinc-800" />
                                <td className="px-3 py-3.5 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800" />
                            </tr>
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Floating Totals Bar (pinned at very bottom, below table scroll) ── */}
            {!isLoading && !error && filtered.length > 0 && (
                <div className="shrink-0 border-t-2 border-[#4A6CF7]/30 bg-white/95 dark:bg-[#27272A]/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)]">
                    <div className="flex items-stretch overflow-x-auto">
                        {/* Label */}
                        <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] bg-[#EEF2FF] dark:bg-[#1E3A8A]/20">
                            <IndianRupee className="h-4 w-4 text-[#2563EB]" />
                            <div>
                                <p className="text-[9px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Summary</p>
                                <p className="text-[11px] font-bold text-[#1E3A8A] dark:text-[#C7D2FE]">{filtered.length} Staff</p>
                            </div>
                        </div>
                        {[
                            { label: "Gross Pay", value: fmt(totalEarnings), color: "text-emerald-800 dark:text-emerald-300 font-bold", bg: "bg-emerald-100/40 dark:bg-emerald-900/20" },
                            { label: "Total Ded.", value: fmt(totalDeductions), color: "text-rose-700 dark:text-rose-300 font-bold", bg: "bg-rose-100/40 dark:bg-rose-900/20" },
                            { label: "Net Pay", value: fmt(totalNetPay), color: "text-amber-800 dark:text-amber-300 font-extrabold text-[13px]", bg: "bg-amber-100/60 dark:bg-amber-900/25" },
                            { label: "Basic (Total)", value: fmt(totalBasic), color: "text-emerald-700 dark:text-emerald-400", bg: "" },
                            { label: "Pro-Rata Basic", value: fmt(totalProRataBasic), color: "text-emerald-700 dark:text-emerald-400", bg: "" },
                            { label: "HRA (Days)", value: fmt(totalHRA), color: "text-zinc-500", bg: "" },
                            { label: "MA (Days)", value: fmt(totalMedical), color: "text-zinc-500", bg: "" },
                            { label: "Arrear", value: fmt(totalArrear), color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50/20 dark:bg-orange-950/10" },
                            { label: "Med Ded.", value: fmt(totalMedicalDed), color: "text-orange-600 dark:text-orange-400", bg: "" },
                            { label: "P-Tax", value: fmt(totalPTax), color: "text-zinc-500", bg: "" },
                            { label: "TA", value: fmt(totalTA), color: "text-orange-600 dark:text-orange-400", bg: "" },
                            { label: "ID Card", value: fmt(totalIdCard), color: "text-orange-600 dark:text-orange-400", bg: "" },
                            { label: "Electricity", value: fmt(totalElectricity), color: "text-orange-600 dark:text-orange-400", bg: "" },
                            { label: "Other Ded.", value: fmt(totalOtherDeduct), color: "text-orange-600 dark:text-orange-400", bg: "" },
                        ].map((item, idx) => (
                            <div key={idx} className={cn("shrink-0 flex flex-col justify-center px-3 py-2 border-r border-[#E4E4E7] dark:border-[#3F3F46] min-w-[90px]", item.bg)}>
                                <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#A1A1AA] dark:text-[#71717A] whitespace-nowrap">{item.label}</span>
                                <span className={cn("text-[12px] tabular-nums whitespace-nowrap mt-0.5", item.color)}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Payslip Modal ── */}
            {selectedSlipRecord && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
                    <div className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-2xl dark:border-[#3F3F46] dark:bg-[#27272A]">
                        <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757] print:hidden" />

                        {/* Modal header */}
                        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E4E7] bg-[#FAFAF9] px-6 py-4 print:hidden dark:border-[#3F3F46] dark:bg-[#27272A]">
                            <div className="flex min-w-0 items-center gap-2">
                                <IndianRupee className="h-5 w-5 text-[#D97757]" />
                                <h3 className="truncate font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Salary Slip Statement</h3>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button onClick={() => window.print()}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#D97757] px-3 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90">
                                    <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                                </button>
                                <button type="button" aria-label="Close salary slip"
                                    onClick={() => setSelectedSlipRecord(null)}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-white px-3 text-xs font-bold text-[#3F3F46] transition-all hover:bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]">
                                    <X className="h-3.5 w-3.5" /> Close
                                </button>
                            </div>
                        </div>

                        {/* Printable area */}
                        <div id="print-payslip-area" className="overflow-y-auto bg-white p-8 font-sans text-zinc-900 md:p-12 print:m-0 print:overflow-visible print:p-0">
                            <style>{`
                                @media print {
                                    body * { visibility: hidden; }
                                    #print-payslip-area, #print-payslip-area * { visibility: visible !important; }
                                    #root, .fixed, .relative, .overflow-hidden, .backdrop-blur-sm, body, html {
                                        visibility: visible !important; overflow: visible !important;
                                        position: static !important; height: auto !important;
                                        min-height: auto !important; margin: 0 !important;
                                        padding: 0 !important; background: transparent !important;
                                        box-shadow: none !important; border: none !important;
                                        transform: none !important; animation: none !important;
                                        backdrop-filter: none !important;
                                    }
                                    #print-payslip-area {
                                        position: absolute !important; left: 0 !important; top: 0 !important;
                                        width: 100% !important; padding: 30px !important; margin: 0 !important;
                                        background: white !important; color: black !important;
                                        border: none !important;
                                        -webkit-print-color-adjust: exact !important;
                                        print-color-adjust: exact !important;
                                    }
                                    .dark #print-payslip-area { background: white !important; color: black !important; }
                                }
                            `}</style>

                            {/* Org Header */}
                            <div className="text-center space-y-2 pb-6 border-b-2 border-zinc-800">
                                <div className="flex justify-center items-center gap-4 mb-2">
                                    <img src="/IITG_Large_Logo.gif" alt="IITG Logo" className="w-14 h-14 object-contain" />
                                    <div className="text-left">
                                        <h2 className="text-xl md:text-2xl font-serif font-bold tracking-tight text-zinc-950 uppercase">Indian Institute of Technology Guwahati</h2>
                                        <h3 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">Research &amp; Development (R&amp;D) Cell</h3>
                                    </div>
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 py-1.5 px-4 rounded-full inline-block">
                                    Salary Statement for {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
                                </p>
                            </div>

                            {/* Employee details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 py-6 text-sm border-b border-zinc-200">
                                {[
                                    ["Employee Name", selectedSlipRecord.first_name],
                                    ["Employee ID", selectedSlipRecord.employee_id],
                                    ["Designation / Role", selectedSlipRecord.designation],
                                    ["Joining Date", fmtDate(selectedSlipRecord.joining_date)],
                                    ["Worked Days this Cycle", `${calcWorkingDaysForPeriod(selectedSlipRecord.joining_date, selectedSlipRecord.term_completion_date, selectedYear, selectedMonth)} / ${daysInMonth} Days`],
                                ].map(([label, value]) => (
                                    <div key={label} className="flex justify-between border-b border-zinc-100 py-1">
                                        <span className="text-zinc-500 font-medium">{label}:</span>
                                        <span className="font-bold text-zinc-950">{value}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between border-b border-zinc-100 py-1">
                                    <span className="text-zinc-500 font-medium">Department:</span>
                                    <span className="font-semibold text-zinc-900">
                                        {selectedSlipRecord.department && selectedSlipRecord.department !== "—"
                                            ? <DepartmentName name={selectedSlipRecord.department} />
                                            : "—"}
                                    </span>
                                </div>
                            </div>

                            {/* Earnings & Deductions */}
                            {(() => {
                                const { inputs } = getRowInputs(selectedSlipRecord.docName);
                                const wd = calcWorkingDaysForPeriod(selectedSlipRecord.joining_date, selectedSlipRecord.term_completion_date, selectedYear, selectedMonth);
                                const prb = calcProRataBasic(selectedSlipRecord.basic_salary, wd, daysInMonth);
                                const pHRA = (selectedSlipRecord.hra / daysInMonth) * wd;
                                const pMA = (selectedSlipRecord.medical_allowance / daysInMonth) * wd;
                                const gross = prb + pHRA + pMA + inputs.arrear;
                                const pTax = calcPTax(selectedSlipRecord.basic_salary);
                                const totalDed = pHRA + inputs.medicalDeduction + pTax + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
                                const netPay = gross - totalDed;
                                return (
                                    <div className="mt-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 border border-zinc-300 rounded-xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-zinc-300">
                                            {/* Earnings */}
                                            <div className="flex flex-col h-full">
                                                <div className="bg-emerald-50 py-2.5 px-4 font-bold border-b border-zinc-300 text-emerald-800 text-sm tracking-wider uppercase">Earnings Breakdown</div>
                                                <div className="p-4 flex-1 space-y-2 text-sm">
                                                    <div className="flex justify-between"><span className="text-zinc-600">Pro-Rata Basic Salary:</span><span className="font-semibold tabular-nums">{fmt(prb)}</span></div>
                                                    <div className="flex justify-between"><span className="text-zinc-600">House Rent Allowance (HRA):</span><span className="font-semibold tabular-nums">{fmt(pHRA)}</span></div>
                                                    <div className="flex justify-between"><span className="text-zinc-600">Medical Allowance:</span><span className="font-semibold tabular-nums">{fmt(pMA)}</span></div>
                                                    {inputs.arrear > 0 && (
                                                        <div className="flex justify-between font-medium text-orange-600">
                                                            <span>Arrear Payout adjustments:</span>
                                                            <span className="font-bold tabular-nums">+{fmt(inputs.arrear)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-auto bg-emerald-50/40 border-t border-zinc-200 p-4 py-3 flex justify-between font-bold text-emerald-800 text-sm">
                                                    <span>Gross Earnings Total:</span><span className="tabular-nums">{fmt(gross)}</span>
                                                </div>
                                            </div>
                                            {/* Deductions */}
                                            <div className="flex flex-col h-full">
                                                <div className="bg-red-50 py-2.5 px-4 font-bold border-b border-zinc-300 text-red-800 text-sm tracking-wider uppercase">Deductions &amp; Deductibles</div>
                                                <div className="p-4 flex-1 space-y-2 text-sm">
                                                    <div className="flex justify-between"><span className="text-zinc-600">Hostel Rent / Campus Accommodation:</span><span className="font-semibold tabular-nums">{fmt(pHRA)}</span></div>
                                                    {inputs.medicalDeduction > 0 && <div className="flex justify-between"><span className="text-zinc-600">Medical Deductions:</span><span className="font-semibold tabular-nums">{fmt(inputs.medicalDeduction)}</span></div>}
                                                    <div className="flex justify-between"><span className="text-zinc-600">Professional Tax (PTAX Assam):</span><span className="font-semibold tabular-nums">{fmt(pTax)}</span></div>
                                                    {inputs.ta > 0 && <div className="flex justify-between"><span className="text-zinc-600">Travel/TA Adjustments:</span><span className="font-semibold tabular-nums">{fmt(inputs.ta)}</span></div>}
                                                    {inputs.idCardCharge > 0 && <div className="flex justify-between"><span className="text-zinc-600">ID Card Charges:</span><span className="font-semibold tabular-nums">{fmt(inputs.idCardCharge)}</span></div>}
                                                    {inputs.electricityBill > 0 && <div className="flex justify-between"><span className="text-zinc-600">Electricity Bill:</span><span className="font-semibold tabular-nums">{fmt(inputs.electricityBill)}</span></div>}
                                                    {inputs.otherDeduction > 0 && <div className="flex justify-between"><span className="text-zinc-600">Other Deductions:</span><span className="font-semibold tabular-nums">{fmt(inputs.otherDeduction)}</span></div>}
                                                </div>
                                                <div className="mt-auto bg-red-50/40 border-t border-zinc-200 p-4 py-3 flex justify-between font-bold text-red-800 text-sm">
                                                    <span>Total Deductions:</span><span className="tabular-nums">{fmt(totalDed)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Net pay bar */}
                                        <div className="p-6 bg-zinc-100 rounded-xl border border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1">Net Pay Credited to Account</p>
                                                <p className="text-sm font-semibold text-zinc-700 italic">In Words: {numToWords(netPay)}</p>
                                            </div>
                                            <div className="text-center sm:text-right shrink-0">
                                                <span className="text-xs font-bold text-zinc-400 block uppercase">Net Disbursed</span>
                                                <span className="text-2xl font-black font-serif text-zinc-950 tabular-nums tracking-tight">{fmt(netPay)}</span>
                                            </div>
                                        </div>

                                        {/* Comment / Remarks */}
                                        {(inputs.comment || inputs.remarks) && (
                                            <div className="p-4 border border-dashed border-zinc-300 rounded-lg text-xs text-zinc-500 space-y-1">
                                                {inputs.comment && <p><span className="font-bold">Comment Note:</span> {inputs.comment}</p>}
                                                {inputs.remarks && <p><span className="font-bold">Remarks:</span> {inputs.remarks}</p>}
                                            </div>
                                        )}

                                        {/* Signatures */}
                                        <div className="grid grid-cols-3 gap-4 pt-16 text-center text-xs font-bold">
                                            {["Prepared / Checked By", "Principal Investigator (PI)", "Associate Dean / Dean (R&D)"].map(label => (
                                                <div key={label} className="space-y-4">
                                                    <div className="border-b border-zinc-400 max-w-[180px] mx-auto" />
                                                    <p className="text-zinc-500">{label}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalaryRegisterFull;
