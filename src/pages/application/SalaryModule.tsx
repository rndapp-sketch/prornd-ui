
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFrappePostCall, useFrappeAuth } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
    ArrowLeft, Loader2, Search, Download, RefreshCw,
    User, IndianRupee, AlertCircle, ChevronUp, ChevronDown,
    Printer, Eye, Calendar, Building2, UserCheck, X,
    ChevronRight, Briefcase, Edit3, RotateCcw,
    TrendingDown, CalendarClock, Lock, Unlock, ExternalLink,
    FolderKanban, Tags, CheckCircle2, Clock
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { DepartmentName } from "@/components/DepartmentName";
import { PaymentForm } from "@/components/PaymentForm";

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
    hra_percent: number;
    medical_allowance: number;
    hostel: number;
    workflow_state: string;
    project_no?: string;
    bank_account_number?: string;
    ps_hostel?: string | number;
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
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Math.round(n));

const fmtDate = (d: string) => {
    if (!d) return "—";
    try { return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return d; }
};

/** Calculate days in selected month and year. */
const getDaysInMonth = (year: number, month: number): number => {
    return new Date(year, month + 1, 0).getDate();
};

/** Calculate working days dynamically based on joining date, term completion, and selected month/year. */
const calcWorkingDaysForPeriod = (joiningDate: string, termCompletionDate: string, year: number, month: number): number => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    const daysInMonth = monthEnd.getDate();

    if (!joiningDate) return daysInMonth;

    try {
        const jd = new Date(joiningDate);
        jd.setHours(0, 0, 0, 0);

        // If joining date is after the end of this month, 0 working days
        if (jd.getTime() > monthEnd.getTime()) {
            return 0;
        }

        // Determine effective start date in this month
        let start = monthStart.getTime();
        if (jd.getFullYear() === year && jd.getMonth() === month) {
            start = jd.getTime();
        }

        // Determine effective end date in this month
        let end = monthEnd.getTime();
        if (termCompletionDate) {
            const tcd = new Date(termCompletionDate);
            tcd.setHours(0, 0, 0, 0);
            if (tcd.getTime() < monthStart.getTime()) {
                return 0;
            }
            if (tcd.getFullYear() === year && tcd.getMonth() === month) {
                end = tcd.getTime();
            }
        }

        if (end < start) return 0;

        const diffMs = end - start;
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
        return Math.min(diffDays, daysInMonth);
    } catch {
        return daysInMonth;
    }
};

/** Pro-rata basic amount = round((basic / daysInMonth) * workingDays) */
const calcProRataBasic = (basic: number, workingDays: number, daysInMonth: number): number => {
    return Math.round((basic / daysInMonth) * workingDays);
};

/** Professional Tax (P-Tax) based on monthly basic salary.
 *  Assam Professional Tax slabs:
 *  Up to ₹15,000       → ₹0
 *  ₹15,001 – ₹25,000   → ₹180
 *  Above ₹25,000       → ₹208
 */
const calcPTax = (basicSalary: number): number => {
    if (basicSalary <= 15000) return 0;
    if (basicSalary <= 25000) return 180;
    return 208;
};

/** Convert number to words in Indian Numbering System (INR) */
const numToWords = (num: number): string => {
    const a = [
        "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
        "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    ];
    const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (num === 0) return "Zero";
    let n = Math.floor(num);

    const helper = (val: number): string => {
        let str = "";
        if (val >= 100) {
            str += a[Math.floor(val / 100)] + " Hundred ";
            val %= 100;
        }
        if (val >= 20) {
            str += b[Math.floor(val / 10)] + " ";
            val %= 10;
        }
        if (val > 0) {
            str += a[val] + " ";
        }
        return str.trim();
    };

    let words = "";

    // Crore
    if (n >= 10000000) {
        words += helper(Math.floor(n / 10000000)) + " Crore ";
        n %= 10000000;
    }
    // Lakh
    if (n >= 100000) {
        words += helper(Math.floor(n / 100000)) + " Lakh ";
        n %= 100000;
    }
    // Thousand
    if (n >= 1000) {
        words += helper(Math.floor(n / 1000)) + " Thousand ";
        n %= 1000;
    }
    // Remaining
    if (n > 0) {
        words += helper(n);
    }

    return words.trim() + " Rupees Only";
};

// Map raw Frappe row → StaffRecord using exact ps_* field names
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getHRADeduction = (r: StaffRecord, proRataHRA: number): number => {
    if (!r.ps_hostel) return 0;
    const raw = String(r.ps_hostel).trim().toLowerCase();
    if (raw === "0" || raw === "no" || raw === "false" || raw === "") return 0;
    return proRataHRA;
};

const mapRow = (row: any): StaffRecord => {
    const basic = Math.round(parseFloat(row.ps_basic_salary || 0) || 0);

    // HRA is stored as a percentage string e.g. "20%" — calculate amount
    const hraRaw = String(row.ps_hra || "0").replace("%", "").trim();
    const hraPercent = parseFloat(hraRaw) || 0;
    const hraAmount = Math.round(hraPercent > 1 ? (basic * hraPercent) / 100 : hraPercent > 0 ? basic * hraPercent : 0);

    // Medical Allowance: "yes"/"no" or numeric
    const maRaw = String(row.ps_ma || "").toLowerCase();
    const maAmount = maRaw === "yes" || maRaw === "1" || maRaw === "true"
        ? 1250
        : Math.round(parseFloat(row.ps_ma || "0") > 0 ? parseFloat(row.ps_ma) : 0);

    // Hostel: "yes"/"no" or numeric
    const hostelRaw = String(row.ps_hostel || "").toLowerCase();
    const hostelAmount = hostelRaw === "yes" || hostelRaw === "1" || hostelRaw === "true"
        ? Math.round(parseFloat(row.ps_hostel_amount || "0") || 0)
        : Math.round(parseFloat(row.ps_hostel || "0") > 0 ? parseFloat(row.ps_hostel) : 0);

    // Full name from parts
    const nameParts = [row.ps_first_name, row.ps_middle_name, row.ps_last_name]
        .map(p => (p && p !== "null" ? String(p).trim() : ""))
        .filter(Boolean);
    const fullName = nameParts.join(" ") || "—";

    return {
        docName: row.name || "",
        employee_id: row.ps_emp_id || row.name || "—",
        first_name: fullName,
        email_id: row.erp_mail || row.ps_email_id || "—",
        department: row.ps_department || "—",
        designation: row.ps_designation || "—",
        joining_date: row.ps_joining_date || "",
        term_completion_date: row.ps_term_completion_date || "",
        basic_salary: basic,
        hra: hraAmount,
        hra_percent: hraPercent,
        medical_allowance: maAmount,
        hostel: hostelAmount,
        workflow_state: row.workflow_state || "Approved",
        project_no: row.project_no || "—",
        bank_account_number: row.bank_account_number || "—",
        ps_hostel: row.ps_hostel !== undefined ? row.ps_hostel : "",
    };
};

type SortKey = keyof StaffRecord;

// ─── Component ────────────────────────────────────────────────────────────────

const SalaryModule: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();

    const [records, setRecords] = useState<StaffRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<SortKey>("department");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

    // Dynamic Period State
    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

    // Filter states
    const [deptFilter, setDeptFilter] = useState<string>("All");
    const [desigFilter, setDesigFilter] = useState<string>("All");
    const [projectFilter, setProjectFilter] = useState<string>("All");
    const [schemeFilter, setSchemeFilter] = useState<string>("All");
    const [departmentLabels, setDepartmentLabels] = useState<Record<string, string>>({});
    const [schemeMap, setSchemeMap] = useState<Record<string, string>>({});
    const [schemeNumberMap, setSchemeNumberMap] = useState<Record<string, string>>({});

    // Pay slip modal state
    const [selectedSlipRecord, setSelectedSlipRecord] = useState<StaffRecord | null>(null);

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedPaymentName, setSelectedPaymentName] = useState<string | null>(null);
    const [selectedCommit, setSelectedCommit] = useState<any>(null);
    const [budgetHeadMap, setBudgetHeadMap] = useState<Record<string, string>>({});
    const [loadingEmpId, setLoadingEmpId] = useState<string | null>(null);

    // ─── Checkbox Selection & Scheme-wise BMR Modal ───────────────────────
    const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set());
    const [bmrModalOpen, setBmrModalOpen] = useState(false);
    const [bmrInput, setBmrInput] = useState("");
    const [bmrSubmitting, setBmrSubmitting] = useState(false);
    const [bmrError, setBmrError] = useState<string | null>(null);
    // Stores the pre-built commit payloads for all selected staff, keyed by employee_id
    const [pendingBulkCommits, setPendingBulkCommits] = useState<Record<string, any>>({});

    // Editable Inputs state mapped by record's docName (storing only overrides!)
    const [overrides, setOverrides] = useState<Record<string, Partial<EditableInputs>>>({});

    // Prepared status for monthly salary cycles (stored in localStorage)
    const [preparedCycles, setPreparedCycles] = useState<Record<string, boolean>>(() => {
        const saved = localStorage.getItem("rnd_prepared_salary_cycles");
        if (saved) {
            try { return JSON.parse(saved); } catch (e) { }
        }
        // Default: past and current months (up to May 2026) are prepared
        return {
            "2026-0": true, // Jan
            "2026-1": true, // Feb
            "2026-2": true, // Mar
            "2026-3": true, // Apr
            "2026-4": true, // May
        };
    });

    const cycleKey = `${selectedYear}-${selectedMonth}`;
    const isPrepared = !!preparedCycles[cycleKey];

    // ─── Salary Processing Status ─────────────────────────────────────────
    const [activeTab, setActiveTab] = useState<"pending" | "processed">("pending");
    const [processedEmployees, setProcessedEmployees] = useState<Set<string>>(new Set());
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);

    // Reset tab when period changes
    useEffect(() => {
        setProcessedEmployees(new Set());
        setActiveTab("pending");
        setSelectedEmpIds(new Set());
    }, [selectedYear, selectedMonth]);

    // Mark an employee as processed (optimistic, within current session)
    const markAsProcessed = useCallback((empId: string) => {
        setProcessedEmployees(prev => {
            const next = new Set(prev);
            next.add(empId);
            return next;
        });
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { call: getList } = useFrappePostCall<{ message: any[] }>("frappe.client.get_list");

    // ── Build commit payload for a single staff record (shared by single-pay & bulk-pay) ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buildCommitData = useCallback(async (r: StaffRecord, netPay: number): Promise<any | null> => {
        const salary_year_month = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
        const daysInMonthVal = getDaysInMonth(selectedYear, selectedMonth);

        // Use getRowInputs directly — NOTE: getRowInputs is defined later but hoisted fine here
        // We re-compute inline to avoid circular dependency ordering issues
        const record = r;
        const dim = getDaysInMonth(selectedYear, selectedMonth);
        const wd = calcWorkingDaysForPeriod(record.joining_date, record.term_completion_date, selectedYear, selectedMonth);
        const defaultMedical = Math.round((record.medical_allowance / dim) * wd);
        const rowOverrides = overrides[r.docName] || {};
        const inputs: EditableInputs = {
            ta: rowOverrides.ta ?? 0,
            otherDeduction: rowOverrides.otherDeduction ?? 0,
            arrear: rowOverrides.arrear ?? 0,
            medicalDeduction: rowOverrides.medicalDeduction ?? defaultMedical,
            idCardCharge: rowOverrides.idCardCharge ?? 0,
            electricityBill: rowOverrides.electricityBill ?? 0,
            comment: rowOverrides.comment ?? "",
            remarks: rowOverrides.remarks ?? "",
        };

        const workingDays = wd;
        const proRataBasic = calcProRataBasic(r.basic_salary, workingDays, daysInMonthVal);
        const proRataHRA = Math.round((r.hra / daysInMonthVal) * workingDays);
        const proRataMedical = Math.round((r.medical_allowance / daysInMonthVal) * workingDays);
        const grossPay = proRataBasic + proRataHRA + proRataMedical + inputs.arrear;
        const pTax = calcPTax(r.basic_salary);
        const hraDed = getHRADeduction(r, proRataHRA);
        const totalDed = hraDed + inputs.medicalDeduction + pTax + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;

        const salary_user_details = {
            employee_id: r.employee_id,
            first_name: r.first_name,
            email_id: r.email_id,
            department: r.department,
            designation: r.designation,
            joining_date: r.joining_date,
            term_completion_date: r.term_completion_date,
            basic_salary: Math.round(r.basic_salary),
            hra: Math.round(r.hra),
            working_days: workingDays,
            pro_rata_basic: Math.round(proRataBasic),
            pro_rata_hra: Math.round(proRataHRA),
            pro_rata_medical: Math.round(proRataMedical),
            arrear: Math.round(inputs.arrear),
            gross_pay: Math.round(grossPay),
            hra_deduction: Math.round(hraDed),
            medical_deduction: Math.round(inputs.medicalDeduction),
            p_tax: Math.round(pTax),
            ta: Math.round(inputs.ta),
            id_card_charge: Math.round(inputs.idCardCharge),
            electricity_bill: Math.round(inputs.electricityBill),
            other_deduction: Math.round(inputs.otherDeduction),
            total_deduction: Math.round(totalDed),
            net_pay: Math.round(netPay),
            comment: inputs.comment,
            remarks: inputs.remarks,
        };

        const salary_backend_details = {
            ps_emp_id: r.employee_id,
            scr_id: "",
            project_no: r.project_no || "",
            interview_id: "",
            tenure_details: "",
            current_basic_salary: r.basic_salary,
            active_basic_salary: r.basic_salary,
        };

        // Try salary_payment_data API first
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let commitFromApi: any = null;
        try {
            const response = await fetch(
                `/api/method/rndopsapp.rndopsapp.commitPayment.salary_payment_data?ps_emp_id=${r.employee_id}&salary_year_month=${salary_year_month}`,
                { credentials: "include" }
            );
            if (response.ok) {
                const json = await response.json();
                if (json?.message && Array.isArray(json.message) && json.message.length > 0) {
                    commitFromApi = json.message[0];
                }
            }
        } catch { /* silent */ }

        if (commitFromApi) {
            return {
                projectNumber: r.project_no || commitFromApi.projectNumber || "",
                accountHeadId: commitFromApi.accountHeadId || 1,
                moduleId: commitFromApi.moduleId || 11,
                // Use employee_id, not the RAC doc name, to avoid the backend calling
                // frappe.get_doc() on the RAC document which triggers mandatory-field validation.
                // The actual RAC doc name is preserved in salary_backend_details.scr_id.
                frapAppId: r.employee_id,
                commitDate: commitFromApi.commitDate || new Date().toISOString().split("T")[0],
                commitParticular: `Salary payment for ${r.first_name} (${r.employee_id}) - ${MONTHS[selectedMonth].label} ${selectedYear}`,
                refDetails: commitFromApi.refDetails || `Employee ID: ${r.employee_id}`,
                commitAmount: Math.round(netPay),
                transactionCommitNumber: commitFromApi.transactionCommitNumber || 0,
                salary_year_month,
                salary_user_details,
                salary_backend_details: { ...salary_backend_details, scr_id: commitFromApi.frapAppId || "" },
            };
        }

        // Fallback: virtual commit
        return {
            projectNumber: r.department || "",
            accountHeadId: 1,
            moduleId: 11,
            frapAppId: r.employee_id,
            commitDate: new Date().toISOString().split("T")[0],
            commitParticular: `Salary payment for ${r.first_name} (${r.employee_id}) - ${MONTHS[selectedMonth].label} ${selectedYear}`,
            refDetails: `Employee ID: ${r.employee_id}`,
            commitAmount: Math.round(netPay),
            transactionCommitNumber: 0,
            salary_year_month,
            salary_user_details,
            salary_backend_details,
        };
    }, [selectedYear, selectedMonth, overrides]);

    // ── Open BMR modal: build all commit payloads for selected pending staff ──
    const handlePaySelected = useCallback(async (selectedRecords: StaffRecord[]) => {
        if (selectedRecords.length === 0) return;

        // All selected must share the same scheme number (not project_no —
        // multiple project_nos can map to the same scheme e.g. 4211)
        const schemeNumbers = new Set(
            selectedRecords.map(r => schemeNumberMap[r.project_no || ""] || r.project_no || "")
        );
        if (schemeNumbers.size > 1) {
            alert("Please select staff from only one scheme at a time. The selected staff belong to different schemes.");
            return;
        }

        setLoadingEmpId("__bulk__");
        try {
            const commits: Record<string, any> = {};
            for (const r of selectedRecords) {
                const dim = getDaysInMonth(selectedYear, selectedMonth);
                const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
                const defaultMedical = Math.round((r.medical_allowance / dim) * wd);
                const rowOverrides = overrides[r.docName] || {};
                const inputs: EditableInputs = {
                    ta: rowOverrides.ta ?? 0,
                    otherDeduction: rowOverrides.otherDeduction ?? 0,
                    arrear: rowOverrides.arrear ?? 0,
                    medicalDeduction: rowOverrides.medicalDeduction ?? defaultMedical,
                    idCardCharge: rowOverrides.idCardCharge ?? 0,
                    electricityBill: rowOverrides.electricityBill ?? 0,
                    comment: rowOverrides.comment ?? "",
                    remarks: rowOverrides.remarks ?? "",
                };
                const proRataBasic = calcProRataBasic(r.basic_salary, wd, dim);
                const proRataHRA = Math.round((r.hra / dim) * wd);
                const proRataMedical = Math.round((r.medical_allowance / dim) * wd);
                const grossPay = proRataBasic + proRataHRA + proRataMedical + inputs.arrear;
                const hraDed = getHRADeduction(r, proRataHRA);
                const totalDed = hraDed + inputs.medicalDeduction + calcPTax(r.basic_salary) + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
                const netPay = Math.round(grossPay - totalDed);
                const commit = await buildCommitData(r, netPay);
                if (commit) commits[r.employee_id] = commit;
            }
            setPendingBulkCommits(commits);
            setBmrInput("");
            setBmrError(null);
            setBmrModalOpen(true);
        } finally {
            setLoadingEmpId(null);
        }
    }, [selectedYear, selectedMonth, overrides, buildCommitData]);


    const getRowInputs = useCallback((docName: string): { inputs: EditableInputs; isEdited: Record<keyof EditableInputs, boolean> } => {
        const record = records.find(r => r.docName === docName);
        const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
        const workingDays = record ? calcWorkingDaysForPeriod(record.joining_date, record.term_completion_date, selectedYear, selectedMonth) : daysInMonth;
        const defaultMedical = record ? Math.round((record.medical_allowance / daysInMonth) * workingDays) : 0;

        const rowOverrides = overrides[docName] || {};

        const inputs: EditableInputs = {
            ta: rowOverrides.ta ?? 0,
            otherDeduction: rowOverrides.otherDeduction ?? 0,
            arrear: rowOverrides.arrear ?? 0,
            medicalDeduction: rowOverrides.medicalDeduction ?? defaultMedical,
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

    const handleInputChange = (docName: string, field: keyof EditableInputs, value: string | number) => {
        setOverrides(prev => {
            const currentOverrides = prev[docName] || {};

            // Check if value is different from default
            let shouldStoreOverride = true;
            if (field === "ta" || field === "otherDeduction" || field === "arrear" || field === "idCardCharge" || field === "electricityBill") {
                if (!value || parseInt(value as string, 10) === 0 || isNaN(parseInt(value as string, 10))) {
                    shouldStoreOverride = false;
                }
            } else if (field === "comment" || field === "remarks") {
                if (value === "") {
                    shouldStoreOverride = false;
                }
            } else if (field === "medicalDeduction") {
                const record = records.find(r => r.docName === docName);
                const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
                const workingDays = record ? calcWorkingDaysForPeriod(record.joining_date, record.term_completion_date, selectedYear, selectedMonth) : daysInMonth;
                const defaultMedical = record ? Math.round((record.medical_allowance / daysInMonth) * workingDays) : 0;
                if (Math.round(Number(value)) === defaultMedical) {
                    shouldStoreOverride = false;
                }
            }

            const updatedOverrides = { ...currentOverrides };
            if (shouldStoreOverride) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                updatedOverrides[field] = value as any;
            } else {
                delete updatedOverrides[field];
            }

            const result = { ...prev };
            if (Object.keys(updatedOverrides).length > 0) {
                result[docName] = updatedOverrides;
            } else {
                delete result[docName];
            }
            return result;
        });
    };

    const resetOverrides = () => {
        if (window.confirm("Are you sure you want to reset all manual edits for this period?")) {
            setOverrides({});
        }
    };

    const fetchData = useCallback(async () => {
        if (!currentUser) return;
        setIsLoading(true);
        setError(null);

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            let rows: any[] = [];

            // Try: filter by owner + Approved
            try {
                const res = await getList({
                    doctype: "Project Staff Details",
                    filters: [["owner", "=", currentUser], ["workflow_state", "=", "Approved"]],
                    fields: ["*"],
                    limit_page_length: 500,
                });
                rows = res?.message ?? [];
            } catch { /* try next */ }

            // Try: other PI fields + Approved
            if (rows.length === 0) {
                for (const f of ["webmail_id", "pi_webmail", "pi_email", "principal_investigator"]) {
                    try {
                        const res = await getList({
                            doctype: "Project Staff Details",
                            filters: [[f, "=", currentUser], ["workflow_state", "=", "Approved"]],
                            fields: ["*"],
                            limit_page_length: 1000000,
                        });
                        rows = res?.message ?? [];
                        if (rows.length > 0) break;
                    } catch { /* skip */ }
                }
            }

            // Fallback: all Approved, filter client-side
            if (rows.length === 0) {
                try {
                    const res = await getList({
                        doctype: "Project Staff Details",
                        filters: [["workflow_state", "=", "Approved"]],
                        fields: ["*"],
                        limit_page_length: 500,
                    });
                    const all = res?.message ?? [];
                    rows = all.filter((r: any) =>
                        r.owner === currentUser || r.webmail_id === currentUser
                        || r.pi_webmail === currentUser || r.pi_email === currentUser
                    );
                    if (rows.length === 0) rows = all;
                } catch { /* ignore */ }
            }

            // Safety net: client-side Approved filter
            rows = rows.filter((r: any) =>
                (r.workflow_state || "").toLowerCase() === "approved"
            );

            setRecords(rows.map(mapRow));
        } catch (err: any) {
            setError(err?.exception || err?.message || String(err));
        } finally {
            setIsLoading(false);
        }
    }, [getList, currentUser]);

    // ── Submit all pending commits with the entered BMR number ──
    const handleBmrSubmit = useCallback(async () => {
        const bmr = bmrInput.trim();
        if (!bmr) { setBmrError("Please enter a BMR number before submitting."); return; }
        setBmrSubmitting(true);
        setBmrError(null);
        const paymentEndpoint = "/api/method/rndopsapp.rndopsapp.commitPayment.submit_payment_data";
        const failed: string[] = [];
        for (const [empId, commitData] of Object.entries(pendingBulkCommits)) {
            try {
                const body = {
                    ...commitData,
                    doctype: "Recruitment Adhoc Contractual",
                    moduleName: "Recruitment Adhoc Contractual",
                    moduleId: "11",
                    project_name: commitData.projectNumber,
                    payment_amount: commitData.commitAmount,
                    budget_head: commitData.budget_head ?? String(commitData.accountHeadId ?? ""),
                    payment_particular: commitData.commitParticular,
                    payment_date: new Date().toISOString().split("T")[0],
                    payment_status: "PENDING",
                    bmr,
                    frapAppId: commitData.frapAppId,
                    salary_year_month: commitData.salary_year_month,
                    salary_user_details: commitData.salary_user_details,
                    salary_backend_details: commitData.salary_backend_details,
                };
                const res = await fetch(paymentEndpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    credentials: "include",
                    body: JSON.stringify(body),
                });
                const result = await res.json();
                const msg = result?.message;
                if (msg?.status === "error") throw new Error(msg?.message || "Salary staging failed");
                if (result.exc || result.exception) throw new Error(result.exc || result.exception);
                markAsProcessed(empId);
            } catch (err: any) {
                console.error(`Payment failed for ${empId}:`, err);
                failed.push(empId);
            }
        }
        setBmrSubmitting(false);
        setBmrModalOpen(false);
        setSelectedEmpIds(new Set());
        setPendingBulkCommits({});
        if (failed.length > 0) {
            alert(`Payment processing completed.\n\n⚠️ Failed for: ${failed.join(", ")}\n\nPlease retry the failed entries manually.`);
        } else {
            alert("✅ All selected salaries have been processed successfully!");
        }
        fetchData();
    }, [bmrInput, pendingBulkCommits, markAsProcessed, fetchData]);

    useEffect(() => { if (currentUser) fetchData(); }, [fetchData, currentUser]);

    // ── Fetch processed employees from Salary Staging (doc name = salary_year_month) ──
    const checkSalaryStatuses = useCallback(async () => {
        if (records.length === 0 || !isPrepared) return;
        setIsCheckingStatus(true);
        const salary_year_month = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
        try {
            // Fetch Salary Staging document by name (e.g. "2026-06")
            const response = await fetch(
                `/api/resource/Salary%20Staging/${encodeURIComponent(salary_year_month)}`,
                { credentials: "include", headers: { Accept: "application/json" } }
            );

            const processedEmpIds = new Set<string>();

            if (response.ok) {
                const json = await response.json();
                // salary_record is a JSON string array of payment records
                let salaryRecords: any[] = [];
                try {
                    const raw = json?.data?.salary_record ?? json?.message?.salary_record ?? "[]";
                    salaryRecords = typeof raw === "string" ? JSON.parse(raw) : raw;
                } catch { /* parse error — treat as empty */ }

                salaryRecords.forEach((rec: any) => {
                    // Primary: salary_backend_details.ps_emp_id
                    const empId =
                        rec?.salary_backend_details?.ps_emp_id ||
                        rec?.salary_user_details?.employee_id;
                    if (empId) processedEmpIds.add(empId);
                });
            }
            // If 404 (no doc for this month) — processedEmpIds stays empty, which is correct.

            // Stale-guard: discard if user switched months while request was in-flight.
            const currentSYM = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
            if (salary_year_month === currentSYM) {
                setProcessedEmployees(new Set(processedEmpIds));
            }
        } catch (err) {
            console.error("Salary Staging fetch failed:", err);
        } finally {
            setIsCheckingStatus(false);
        }
    }, [records, isPrepared, selectedYear, selectedMonth]);

    // ── Auto-reconcile processed status with server on every load / period change ──
    useEffect(() => {
        if (records.length > 0 && isPrepared) {
            checkSalaryStatuses();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [records, selectedYear, selectedMonth, isPrepared]);

    // Fetch Scheme mapping from Project Registration doctype
    const fetchSchemeMap = useCallback(async () => {
        const projectNos = Array.from(new Set(
            records.map(r => r.project_no).filter(p => p && p !== "—")
        )) as string[];
        if (projectNos.length === 0) {
            setSchemeMap({});
            return;
        }
        try {
            const res = await getList({
                doctype: "Project Registration",
                filters: [["project_no", "in", projectNos]],
                fields: ["project_no", "funding_agency_schemes", "enter_scheme_number"],
                limit_page_length: projectNos.length,
            });
            const map: Record<string, string> = {};
            const numberMap: Record<string, string> = {};
            (res?.message || []).forEach((row: any) => {
                if (row.project_no && row.funding_agency_schemes) {
                    map[row.project_no] = row.funding_agency_schemes;
                }
                if (row.project_no && row.enter_scheme_number) {
                    numberMap[row.project_no] = row.enter_scheme_number;
                }
            });
            setSchemeMap(map);
            setSchemeNumberMap(numberMap);
        } catch (err) {
            console.error("Failed to fetch scheme mapping:", err);
            setSchemeMap({});
            setSchemeNumberMap({});
        }
    }, [records, getList]);

    useEffect(() => {
        if (records.length > 0) fetchSchemeMap();
    }, [records, fetchSchemeMap]);

    // Fetch Budget Heads for mapping
    const fetchBudgetHeads = useCallback(async () => {
        try {
            const response = await fetch('/api/v2/document/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc', {
                credentials: "include",
                headers: { Accept: "application/json" },
            });
            const data = await response.json();
            if (data?.data) {
                const map: Record<string, string> = {};
                data.data.forEach((h: any) => {
                    map[String(h.id)] = h.budget_head;
                });
                setBudgetHeadMap(map);
            }
        } catch (err) {
            console.error('Failed to fetch budget heads:', err);
        }
    }, []);

    useEffect(() => {
        fetchBudgetHeads();
    }, [fetchBudgetHeads]);

    const handlePayClick = async (r: StaffRecord, rawNetPay: number) => {
        const confirm = window.confirm(`Are you sure you want to process the salary for ${r.first_name}?`);
        if (!confirm) return;

        const netPay = Math.round(rawNetPay);
        setLoadingEmpId(r.employee_id);
        const salary_year_month = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
        try {
            // 1. Fetch salary payment data (this returns a list containing the matched commit directly!)
            let commitFromApi: any = null;
            try {
                const response = await fetch(`/api/method/rndopsapp.rndopsapp.commitPayment.salary_payment_data?ps_emp_id=${r.employee_id}&salary_year_month=${salary_year_month}`, { credentials: 'include' });
                if (response.ok) {
                    const json = await response.json();
                    if (json?.message) {
                        if (!Array.isArray(json.message)) {
                            // Check if salary payment has already been initiated
                            if (json.message.message === "Salary already initiated" || json.message.status) {
                                const isSameMonth = !json.message.salary_year_month || json.message.salary_year_month === salary_year_month;
                                if (isSameMonth) {
                                    markAsProcessed(r.employee_id);
                                    alert(`Salary successfully processed.\n\nStatus: ${json.message.status || "Pending Approval"}`);
                                    return; // abort modal presentation!
                                }
                            }
                        } else if (json.message.length > 0) {
                            commitFromApi = json.message[0];
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch salary payment data:", err);
            }

            // Construct salary year month parameter (e.g. 2026_june) and detailed user & backend data
            const daysInMonthVal = getDaysInMonth(selectedYear, selectedMonth);
            const { inputs } = getRowInputs(r.docName);
            const workingDays = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
            const proRataBasic = calcProRataBasic(r.basic_salary, workingDays, daysInMonthVal);
            const proRataHRA = Math.round((r.hra / daysInMonthVal) * workingDays);
            const proRataMedical = Math.round((r.medical_allowance / daysInMonthVal) * workingDays);
            const grossPay = proRataBasic + proRataHRA + proRataMedical + inputs.arrear;
            const pTax = calcPTax(r.basic_salary);
            const hraDed = getHRADeduction(r, proRataHRA);
            const totalDed = hraDed + inputs.medicalDeduction + pTax + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;

            const salary_user_details = {
                employee_id: r.employee_id,
                first_name: r.first_name,
                email_id: r.email_id,
                department: r.department,
                designation: r.designation,
                joining_date: r.joining_date,
                term_completion_date: r.term_completion_date,
                basic_salary: Math.round(r.basic_salary),
                hra: Math.round(r.hra),
                working_days: workingDays,
                pro_rata_basic: Math.round(proRataBasic),
                pro_rata_hra: Math.round(proRataHRA),
                pro_rata_medical: Math.round(proRataMedical),
                arrear: Math.round(inputs.arrear),
                gross_pay: Math.round(grossPay),
                hra_deduction: Math.round(hraDed),
                medical_deduction: Math.round(inputs.medicalDeduction),
                p_tax: Math.round(pTax),
                ta: Math.round(inputs.ta),
                id_card_charge: Math.round(inputs.idCardCharge),
                electricity_bill: Math.round(inputs.electricityBill),
                other_deduction: Math.round(inputs.otherDeduction),
                total_deduction: Math.round(totalDed),
                net_pay: netPay,
                comment: inputs.comment,
                remarks: inputs.remarks
            };

            const salary_backend_details = {
                ps_emp_id: r.employee_id,
                scr_id: commitFromApi?.frapAppId || "",
                project_no: r.project_no || commitFromApi?.projectNumber || "",
                interview_id: commitFromApi?.frapAppId || "",
                tenure_details: "",
                current_basic_salary: r.basic_salary,
                active_basic_salary: r.basic_salary
            };

            let selectedCommitData: any = null;

            if (commitFromApi) {
                // Prefill using the directly matched commit returned by the salary_payment_data API
                selectedCommitData = {
                    projectNumber: r.project_no || commitFromApi.projectNumber || "",
                    accountHeadId: commitFromApi.accountHeadId || 1,
                    moduleId: commitFromApi.moduleId || 11,
                    frapAppId: r.employee_id,
                    commitDate: commitFromApi.commitDate || new Date().toISOString().split('T')[0],
                    commitParticular: `Salary payment for ${r.first_name} (${r.employee_id}) - ${MONTHS[selectedMonth].label} ${selectedYear}`,
                    refDetails: commitFromApi.refDetails || `Employee ID: ${r.employee_id}, Commit No: ${commitFromApi.transactionCommitNumber}`,
                    commitAmount: netPay, // Override amount with Net Pay
                    transactionCommitNumber: commitFromApi.transactionCommitNumber || 0,
                    salary_year_month,
                    salary_user_details,
                    salary_backend_details: { ...salary_backend_details, scr_id: commitFromApi.frapAppId || "" },
                };
            } else {
                // Fallback: Fetch pending commits from Ledger to query manually
                try {
                    const ledgerRes = await fetch(`/ledger-api/account-head-commit/by-status/COMMITTED`);
                    if (ledgerRes.ok) {
                        const commits = await ledgerRes.json();
                        // Try matching by project_no AND interview_id AND moduleId === 11 (Recruitment Adhoc Contractual)
                        let match = commits.find((c: any) =>
                            String(c.projectNumber).toLowerCase() === String(r.department || '').toLowerCase() &&
                            String(c.moduleId) === '11' &&
                            String(c.frapAppId).toLowerCase() === String(r.employee_id).toLowerCase()
                        );

                        // Fallback 1: match by moduleId === 11
                        if (!match) {
                            match = commits.find((c: any) =>
                                String(c.moduleId) === '11'
                            );
                        }

                        // Fallback 2: match by project number
                        if (!match) {
                            match = commits.find((c: any) =>
                                String(c.projectNumber).toLowerCase() === String(r.department || '').toLowerCase()
                            );
                        }

                        if (match) {
                            selectedCommitData = {
                                ...match,
                                commitAmount: netPay, // Override amount with Net Pay
                                commitParticular: `Salary payment for ${r.first_name} (${r.employee_id}) - ${MONTHS[selectedMonth].label} ${selectedYear}`,
                                salary_year_month,
                                salary_user_details,
                                salary_backend_details,
                            };
                        }
                    }
                } catch (ledgerErr) {
                    console.error("Ledger fallback fetch failed:", ledgerErr);
                }
            }

            if (!selectedCommitData) {
                // Fallback 3: Create a virtual commit to prefill the modal
                selectedCommitData = {
                    projectNumber: r.department || "",
                    accountHeadId: 1, // default budget head
                    moduleId: 11, // Recruitment Adhoc Contractual module id
                    frapAppId: r.employee_id,
                    commitDate: new Date().toISOString().split('T')[0],
                    commitParticular: `Salary payment for ${r.first_name} (${r.employee_id}) - ${MONTHS[selectedMonth].label} ${selectedYear}`,
                    refDetails: `Employee ID: ${r.employee_id}`,
                    commitAmount: netPay,
                    transactionCommitNumber: 0,
                    salary_year_month,
                    salary_user_details,
                    salary_backend_details,
                };
            }

            setSelectedPaymentName(null);
            setSelectedCommit(selectedCommitData);
            setPaymentModalOpen(true);
        } catch (err) {
            console.error("Failed to process payment data:", err);
            alert("Error preparing payment data. Please try again.");
        } finally {
            setLoadingEmpId(null);
        }
    };

    // Unique Departments & Designations for dropdown filters
    const departmentsList = useMemo(() => {
        const set = new Set<string>();
        records.forEach(r => { if (r.department && r.department !== "—") set.add(r.department); });
        return ["All", ...Array.from(set)].sort();
    }, [records]);

    useEffect(() => {
        const departmentIds = departmentsList.filter((d) => d !== "All");
        if (departmentIds.length === 0) {
            setDepartmentLabels({});
            return;
        }

        let cancelled = false;
        const fetchDepartmentLabels = async () => {
            try {
                const res = await getList({
                    doctype: "Department_prornd",
                    filters: [["name", "in", departmentIds]],
                    fields: ["name", "dept_name"],
                    limit_page_length: departmentIds.length,
                });
                if (cancelled) return;

                const labels: Record<string, string> = {};
                (res?.message || []).forEach((department: any) => {
                    if (department?.name) {
                        labels[department.name] = department.dept_name || department.name;
                    }
                });
                setDepartmentLabels(labels);
            } catch {
                if (!cancelled) setDepartmentLabels({});
            }
        };

        fetchDepartmentLabels();
        return () => {
            cancelled = true;
        };
    }, [departmentsList, getList]);

    const departmentOptions = useMemo(
        () =>
            departmentsList
                .map((value) => ({
                    value,
                    label: value === "All" ? "All" : departmentLabels[value] || value,
                }))
                .sort((a, b) => {
                    if (a.value === "All") return -1;
                    if (b.value === "All") return 1;
                    return a.label.localeCompare(b.label);
                }),
        [departmentsList, departmentLabels],
    );

    const designationsList = useMemo(() => {
        const set = new Set<string>();
        records.forEach(r => { if (r.designation && r.designation !== "—") set.add(r.designation); });
        return ["All", ...Array.from(set)].sort();
    }, [records]);

    const projectsList = useMemo(() => {
        const set = new Set<string>();
        records.forEach(r => { if (r.project_no && r.project_no !== "—") set.add(r.project_no); });
        return ["All", ...Array.from(set)].sort();
    }, [records]);

    const schemesList = useMemo(() => {
        const set = new Set<string>();
        Object.values(schemeNumberMap).forEach(s => { if (s) set.add(s); });
        return ["All", ...Array.from(set)].sort();
    }, [schemeNumberMap]);

    // Sort & filter
    const filtered = useMemo(() => {
        const q = search.toLowerCase();

        // Filter out employees who are not active in the selected period (working days is 0)
        let list = records.filter(r => {
            const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
            return wd > 0;
        });

        // Apply Text Search
        if (q) {
            list = list.filter(r =>
                r.first_name.toLowerCase().includes(q) ||
                r.employee_id.toLowerCase().includes(q) ||
                r.email_id.toLowerCase().includes(q) ||
                r.department.toLowerCase().includes(q) ||
                (departmentLabels[r.department] || "").toLowerCase().includes(q) ||
                r.designation.toLowerCase().includes(q)
            );
        }

        // Apply Dropdown Filters
        if (deptFilter !== "All") {
            list = list.filter(r => r.department === deptFilter);
        }
        if (desigFilter !== "All") {
            list = list.filter(r => r.designation === desigFilter);
        }
        if (projectFilter !== "All") {
            list = list.filter(r => r.project_no === projectFilter);
        }
        if (schemeFilter !== "All") {
            list = list.filter(r => schemeNumberMap[r.project_no || ""] === schemeFilter);
        }

        // Apply Sorting
        return [...list].sort((a, b) => {
            const getDepartmentName = (record: StaffRecord) =>
                departmentLabels[record.department] || record.department;
            const av = sortKey === "department" ? getDepartmentName(a) : a[sortKey];
            const bv = sortKey === "department" ? getDepartmentName(b) : b[sortKey];
            let cmp = 0;
            if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
            else cmp = String(av).localeCompare(String(bv));
            if (cmp === 0 && sortKey === "department") {
                cmp = a.first_name.localeCompare(b.first_name);
            }
            if (cmp === 0) {
                cmp = a.employee_id.localeCompare(b.employee_id);
            }
            return sortDir === "asc" ? cmp : -cmp;
        });
    }, [records, search, deptFilter, desigFilter, projectFilter, schemeFilter, schemeMap, sortKey, sortDir, selectedMonth, selectedYear, departmentLabels]);

    // Split filtered into pending vs processed
    const pendingRecords = useMemo(() =>
        filtered.filter(r => !processedEmployees.has(r.employee_id)),
        [filtered, processedEmployees]);

    const processedRecords = useMemo(() =>
        filtered.filter(r => processedEmployees.has(r.employee_id)),
        [filtered, processedEmployees]);

    const displayedRecords = activeTab === "pending" ? pendingRecords : processedRecords;

    const handleSort = (k: SortKey) => {
        if (sortKey === k) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(k); setSortDir("asc"); }
    };

    // Calculations based on dynamic Month/Year
    const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

    const totalBasic = filtered.reduce((s, r) => s + r.basic_salary, 0);
    const totalOriginalHRA = filtered.reduce((s, r) => s + r.hra, 0);

    const totalWorkingDays = filtered.reduce((s, r) =>
        s + calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth), 0);

    const totalProRataBasic = filtered.reduce((s, r) =>
        s + calcProRataBasic(r.basic_salary, calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth), daysInMonth), 0);

    const totalHRA = filtered.reduce((s, r) =>
        s + Math.round((r.hra / daysInMonth) * calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth)), 0);

    const totalMedical = filtered.reduce((s, r) =>
        s + Math.round((r.medical_allowance / daysInMonth) * calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth)), 0);

    const totalArrear = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.arrear, 0);
    const totalMedicalDed = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.medicalDeduction, 0);
    const totalPTax = filtered.reduce((s, r) => {
        // Use the contract basic salary for P‑Tax calculation (no pro‑rating)
        return s + calcPTax(r.basic_salary);
    }, 0);
    const totalTA = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.ta, 0);
    const totalIdCard = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.idCardCharge, 0);
    const totalElectricity = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.electricityBill, 0);
    const totalOtherDeduct = filtered.reduce((s, r) => s + getRowInputs(r.docName).inputs.otherDeduction, 0);

    const totalEarnings = useMemo(() => {
        return filtered.reduce((s, r) => {
            const { inputs } = getRowInputs(r.docName);
            const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
            const prb = calcProRataBasic(r.basic_salary, wd, daysInMonth);
            const proRataHRA = Math.round((r.hra / daysInMonth) * wd);
            const proRataMedical = Math.round((r.medical_allowance / daysInMonth) * wd);
            return s + (prb + proRataHRA + proRataMedical + inputs.arrear);
        }, 0);
    }, [filtered, getRowInputs, selectedMonth, selectedYear, daysInMonth]);

    const totalHRADed = useMemo(() => {
        return filtered.reduce((s, r) => {
            const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
            const proRataHRA = Math.round((r.hra / daysInMonth) * wd);
            return s + getHRADeduction(r, proRataHRA);
        }, 0);
    }, [filtered, selectedMonth, selectedYear, daysInMonth]);

    const totalDeductions = useMemo(() => {
        return filtered.reduce((s, r) => {
            const { inputs } = getRowInputs(r.docName);
            const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
            const proRataHRA = Math.round((r.hra / daysInMonth) * wd);
            const hraDed = getHRADeduction(r, proRataHRA);
            return s + (hraDed + inputs.medicalDeduction + calcPTax(r.basic_salary) + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction);
        }, 0);
    }, [filtered, getRowInputs, selectedMonth, selectedYear, daysInMonth]);

    const totalNetPay = useMemo(() => {
        return filtered.reduce((s, r) => {
            const { inputs } = getRowInputs(r.docName);
            const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
            const prb = calcProRataBasic(r.basic_salary, wd, daysInMonth);
            const proRataHRA = Math.round((r.hra / daysInMonth) * wd);
            const proRataMedical = Math.round((r.medical_allowance / daysInMonth) * wd);
            const grossPay = prb + proRataHRA + proRataMedical + inputs.arrear;
            const hraDed = getHRADeduction(r, proRataHRA);
            const deductions = hraDed + inputs.medicalDeduction + calcPTax(r.basic_salary) + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
            return s + (grossPay - deductions);
        }, 0);
    }, [filtered, getRowInputs, selectedMonth, selectedYear, daysInMonth]);

    // CSV export
    const exportCSV = () => {
        const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || "Month";
        const headers = [
            "Sl.No", "Employee Id", "First Name", "Email Id", "Department",
            "Designation", "Project No", "Scheme", "Bank Account Number", "Hostel", "Joining Date", "Term Completion Date",
            "Basic Salary", "HRA", "HRA (%)", "Total Working Days", "Amount (Working Days)",
            "HRA amt (W.Days)", "Medical amt (W.Days)", "Arrear", "Gross Pay",
            "HRA Ded", "Medical Ded.", "P-Tax", "TA", "ID Card Charge", "Electricity Bill", "Other Deduction",
            "Total Deduction", "Net Pay", "Comment", "Remarks"
        ];
        const rows = filtered.map((r, i) => {
            const { inputs } = getRowInputs(r.docName);
            const workingDays = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
            const proRataBasic = calcProRataBasic(r.basic_salary, workingDays, daysInMonth);
            const proRataHRA = Math.round((r.hra / daysInMonth) * workingDays);
            const proRataMedical = Math.round((r.medical_allowance / daysInMonth) * workingDays);
            const grossPay = proRataBasic + proRataHRA + proRataMedical + inputs.arrear;
            const pTax = calcPTax(r.basic_salary);
            const hraDed = getHRADeduction(r, proRataHRA);
            const deductions = hraDed + inputs.medicalDeduction + pTax + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
            const netPay = grossPay - deductions;
            const hostelStatus = (() => {
                if (!r.ps_hostel) return "No";
                const raw = String(r.ps_hostel).trim().toLowerCase();
                return (raw === "0" || raw === "no" || raw === "false" || raw === "") ? "No" : "Yes";
            })();
            return [
                i + 1, r.employee_id, r.first_name, r.email_id, r.department,
                r.designation, r.project_no || "—", schemeNumberMap[r.project_no || ""] || "—", r.bank_account_number || "—", hostelStatus, r.joining_date, r.term_completion_date,
                r.basic_salary, r.hra, `${r.hra_percent}%`, workingDays, proRataBasic,
                proRataHRA, proRataMedical, inputs.arrear, grossPay,
                hraDed, inputs.medicalDeduction, pTax, inputs.ta, inputs.idCardCharge, inputs.electricityBill, inputs.otherDeduction,
                deductions, netPay, inputs.comment, inputs.remarks
            ];
        });
        const csv = [headers, ...rows].map(row =>
            row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")
        ).join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        a.download = `Staff_Salary_Statement_${monthLabel}_${selectedYear}.csv`;
        a.click();
    };

    // Column header helper
    const TH = ({ label, k, align = "left", colSpan = 1, rowSpan = 1, className = "" }: { label: string; k?: SortKey; align?: "left" | "right" | "center"; colSpan?: number; rowSpan?: number; className?: string }) => (
        <th
            colSpan={colSpan}
            rowSpan={rowSpan}
            onClick={k ? () => handleSort(k) : undefined}
            className={cn(
                "whitespace-nowrap border-b border-[#C7D2FE]/70 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider transition-colors dark:border-[#4A6CF7]/25",
                align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
                k && "cursor-pointer hover:bg-[#C7D2FE]/40 hover:text-[#1E3A8A] dark:hover:bg-[#4A6CF7]/20 dark:hover:text-[#C7D2FE]",
                className
            )}
        >
            <span className="inline-flex items-center gap-1 justify-center">
                {label}
                {k && sortKey === k && (
                    sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-[#D97757]" /> : <ChevronDown className="w-3 h-3 text-[#D97757]" />
                )}
            </span>
        </th>
    );

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans text-[#3F3F46] dark:text-[#E4E4E7]">
            <main className="mx-auto max-w-[1780px] px-4 py-6 md:px-8 md:py-8 space-y-5">

                {/* Header */}
                <header className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="flex min-w-0 items-start gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] text-[#71717A] transition-colors hover:border-[#D97757]/30 hover:bg-[#D97757]/10 hover:text-[#D97757] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#A1A1AA]"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                            <div className="min-w-0">
                                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
                                        Payroll Workspace
                                    </span>
                                    <span className={cn(
                                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                        isPrepared
                                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                            : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
                                    )}>
                                        <span className={cn("h-[5px] w-[5px] rounded-full", isPrepared ? "bg-emerald-500" : "bg-amber-500")} />
                                        {isPrepared ? "Prepared & Locked" : "Not Prepared"}
                                    </span>
                                </div>
                                <h1 className="text-[22px] font-extrabold leading-tight tracking-normal text-[#3F3F46] dark:text-[#E4E4E7]">
                                    Salary Module
                                </h1>
                                <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                    Generate monthly salary registers and slips for approved project staff.
                                    {currentUser && (
                                        <span className="ml-2 font-mono text-[#2563EB] dark:text-[#60A5FA]">
                                            {currentUser}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Payout Cycle Selectors */}
                            <div className="flex h-10 items-center gap-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] px-2 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                <Calendar className="ml-1 h-4 w-4 text-[#2563EB] dark:text-[#60A5FA]" />
                                <select
                                    value={selectedMonth}
                                    onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                    className="h-8 bg-transparent pr-7 text-[12px] font-bold text-[#3F3F46] outline-none dark:text-[#E4E4E7]"
                                >
                                    {MONTHS.map(m => <option key={m.value} value={m.value} className="dark:bg-[#27272A]">{m.label}</option>)}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                                    className="h-8 border-l border-[#E4E4E7] bg-transparent pl-2 pr-7 text-[12px] font-bold text-[#3F3F46] outline-none dark:border-[#3F3F46] dark:text-[#E4E4E7]"
                                >
                                    {YEARS.map(y => <option key={y} value={y} className="dark:bg-[#27272A]">{y}</option>)}
                                </select>
                            </div>

                            {/* Unlock Payout Cycle Button */}
                            {isPrepared && (
                                <button
                                    onClick={() => {
                                        const confirm = window.confirm(`Are you sure you want to unlock the salary cycle for ${MONTHS[selectedMonth].label} ${selectedYear}? This will revert it to draft mode and reset any processed salaries for this cycle.`);
                                        if (!confirm) return;
                                        setPreparedCycles(prev => {
                                            const next = { ...prev };
                                            delete next[cycleKey];
                                            localStorage.setItem("rnd_prepared_salary_cycles", JSON.stringify(next));
                                            return next;
                                        });
                                        localStorage.removeItem(`rnd_processed_salaries_${selectedYear}-${selectedMonth}`);
                                        setProcessedEmployees(new Set());
                                    }}
                                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-white px-3 text-[12px] font-bold text-[#3F3F46] transition-all hover:bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8] dark:hover:bg-[#3F3F46]"
                                >
                                    <Unlock className="h-3.5 w-3.5" /> Unlock
                                </button>
                            )}

                            {/* Reset edits button */}
                            {Object.keys(overrides).length > 0 && (
                                <button onClick={resetOverrides}
                                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 text-[12px] font-bold text-red-700 transition-all hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                                </button>
                            )}

                            <button onClick={fetchData} disabled={isLoading}
                                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#E4E4E7] bg-white px-3 text-[12px] font-bold text-[#3F3F46] transition-all hover:bg-[#FAFAF9] disabled:opacity-50 dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8] dark:hover:bg-[#3F3F46]">
                                <RefreshCw className={cn("h-3.5 w-3.5 text-[#71717A]", isLoading && "animate-spin")} /> Refresh
                            </button>

                            <button onClick={exportCSV} disabled={filtered.length === 0 || isLoading || !isPrepared}
                                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#D97757] px-3 text-[12px] font-bold text-white shadow-sm transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:bg-[#F4F4F5] disabled:text-[#A1A1AA] dark:disabled:bg-[#3F3F46] dark:disabled:text-[#71717A]">
                                <Download className="h-3.5 w-3.5" /> Export CSV
                            </button>
                        </div>
                    </div>
                </header>

                {/* KPI Cards */}
                {!isLoading && !error && filtered.length > 0 && isPrepared && (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                label: "Staff Count",
                                value: filtered.length,
                                isCurrency: false,
                                desc: "Approved project employees",
                                accent: "#2563EB",
                                icon: <UserCheck className="h-3.5 w-3.5" />
                            },
                            {
                                label: "Gross Salary Payout",
                                value: totalEarnings,
                                isCurrency: true,
                                desc: "Basic + allowance + arrears",
                                accent: "#059669",
                                icon: <IndianRupee className="h-3.5 w-3.5" />
                            },
                            {
                                label: "Total Deductions",
                                value: totalDeductions,
                                isCurrency: true,
                                desc: "HRA, medical, taxes & other charges",
                                accent: "#DC2626",
                                icon: <TrendingDown className="h-3.5 w-3.5" />
                            },
                            {
                                label: "Net Payout",
                                value: totalNetPay,
                                isCurrency: true,
                                desc: "Final credit statement",
                                accent: "#D97757",
                                icon: <IndianRupee className="h-3.5 w-3.5" />
                            },
                        ].map((card) => (
                            <div
                                key={card.label}
                                className="relative flex min-h-[88px] flex-col overflow-hidden rounded-lg border border-[#E4E4E7] bg-white px-3 py-2.5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-[#3F3F46] dark:bg-[#27272A]"
                            >
                                <div
                                    className="pointer-events-none absolute bottom-0 right-0 h-12 w-12 translate-x-3 translate-y-3 rounded-full opacity-[0.07]"
                                    style={{ backgroundColor: card.accent }}
                                />
                                <div className="mb-1.5 flex h-6 w-6 items-center justify-center rounded-md"
                                    style={{
                                        color: card.accent,
                                        backgroundColor: `color-mix(in srgb, ${card.accent} 10%, transparent)`,
                                    }}
                                >
                                    {card.icon}
                                </div>
                                <div className="text-[9px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                                    {card.label}
                                </div>
                                <div
                                    className="mt-0.5 text-[18px] font-extrabold leading-none tracking-tight tabular-nums"
                                    style={{ color: card.accent }}
                                >
                                    {card.isCurrency ? fmt(card.value as number) : card.value}
                                </div>
                                <div className="mt-auto pt-1.5">
                                    <p className="text-[10px] font-semibold leading-tight text-[#71717A] dark:text-[#A1A1AA]">
                                        {card.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Filter Toolbar & Main Table (Conditional on isPrepared) */}
                {!isLoading && !error && filtered.length > 0 && isPrepared && (
                    <>
                        {/* Tab Switcher & Progress Bar */}
                        <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                            <div className="flex items-center justify-between">
                                <div className="flex">
                                    <button
                                        onClick={() => setActiveTab("pending")}
                                        className={cn(
                                            "relative flex items-center gap-2 px-5 py-3.5 text-[13px] font-bold transition-all border-b-2",
                                            activeTab === "pending"
                                                ? "text-[#D97757] border-[#D97757] bg-white dark:bg-[#27272A]"
                                                : "text-[#71717A] border-transparent hover:text-[#3F3F46] hover:bg-[#FAFAF9] dark:text-[#A1A1AA] dark:hover:text-[#E4E4E7] dark:hover:bg-[#3F3F46]/50"
                                        )}
                                    >
                                        <Clock className="h-4 w-4" />
                                        Salary To Be Processed
                                        <span className={cn(
                                            "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                                            activeTab === "pending"
                                                ? "bg-[#D97757]/10 text-[#D97757]"
                                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                        )}>
                                            {pendingRecords.length}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab("processed")}
                                        className={cn(
                                            "relative flex items-center gap-2 px-5 py-3.5 text-[13px] font-bold transition-all border-b-2",
                                            activeTab === "processed"
                                                ? "text-emerald-600 border-emerald-500 bg-white dark:bg-[#27272A] dark:text-emerald-400"
                                                : "text-[#71717A] border-transparent hover:text-[#3F3F46] hover:bg-[#FAFAF9] dark:text-[#A1A1AA] dark:hover:text-[#E4E4E7] dark:hover:bg-[#3F3F46]/50"
                                        )}
                                    >
                                        <CheckCircle2 className="h-4 w-4" />
                                        Salary Processed
                                        <span className={cn(
                                            "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                                            activeTab === "processed"
                                                ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400"
                                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                        )}>
                                            {processedRecords.length}
                                        </span>
                                    </button>
                                </div>
                                <div className="flex items-center gap-3 px-4">
                                    {isCheckingStatus && (
                                        <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Checking statuses...
                                        </span>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA]">
                                            {processedRecords.length}/{filtered.length} processed
                                        </span>
                                        <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
                                                style={{ width: `${filtered.length > 0 ? (processedRecords.length / filtered.length) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Filter Toolbar */}
                        <div className="flex flex-col items-stretch gap-3 rounded-2xl border border-[#E4E4E7] bg-white p-3.5 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A] lg:flex-row lg:items-center">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A1A1AA] dark:text-[#71717A]" />
                                <input
                                    type="text"
                                    placeholder="Search by employee details (ID, name, email)..."
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="h-10 w-full rounded-[0.4375rem] border-[1.5px] border-[#E4E4E7] bg-white py-2 pl-10 pr-4 text-[13px] text-[#3F3F46] transition-colors placeholder:text-[#A1A1AA] focus:border-[#4A6CF7] focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#E4E4E7] dark:placeholder:text-[#71717A]"
                                />
                            </div>

                            {/* Department Dropdown */}
                            <div className={cn("flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 transition-all", deptFilter !== "All" ? "border-[#4A6CF7] bg-[#EEF2FF] dark:border-[#4A6CF7]/60 dark:bg-[#4A6CF7]/10 ring-2 ring-[#4A6CF7]/10" : "border-[#E4E4E7] bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#18181B]")}>
                                <Building2 className={cn("h-4 w-4", deptFilter !== "All" ? "text-[#4A6CF7]" : "text-[#71717A] dark:text-[#A1A1AA]")} />
                                <span className={cn("whitespace-nowrap text-[11px] font-bold uppercase tracking-widest", deptFilter !== "All" ? "text-[#4A6CF7]" : "text-[#71717A] dark:text-[#A1A1AA]")}>Dept</span>
                                <select
                                    value={deptFilter}
                                    onChange={e => setDeptFilter(e.target.value)}
                                    className="max-w-[180px] bg-transparent py-0.5 pr-7 text-[12px] font-semibold text-[#3F3F46] outline-none dark:text-[#E4E4E7]"
                                >
                                    {departmentOptions.map((department) => (
                                        <option
                                            key={department.value}
                                            value={department.value}
                                            className="dark:bg-[#27272A]"
                                        >
                                            {department.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Designation Dropdown */}
                            <div className={cn("flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 transition-all", desigFilter !== "All" ? "border-[#4A6CF7] bg-[#EEF2FF] dark:border-[#4A6CF7]/60 dark:bg-[#4A6CF7]/10 ring-2 ring-[#4A6CF7]/10" : "border-[#E4E4E7] bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#18181B]")}>
                                <Briefcase className={cn("h-4 w-4", desigFilter !== "All" ? "text-[#4A6CF7]" : "text-[#71717A] dark:text-[#A1A1AA]")} />
                                <span className={cn("whitespace-nowrap text-[11px] font-bold uppercase tracking-widest", desigFilter !== "All" ? "text-[#4A6CF7]" : "text-[#71717A] dark:text-[#A1A1AA]")}>Role</span>
                                <select
                                    value={desigFilter}
                                    onChange={e => setDesigFilter(e.target.value)}
                                    className="max-w-[180px] bg-transparent py-0.5 pr-7 text-[12px] font-semibold text-[#3F3F46] outline-none dark:text-[#E4E4E7]"
                                >
                                    {designationsList.map(dg => <option key={dg} value={dg} className="dark:bg-[#27272A]">{dg}</option>)}
                                </select>
                            </div>

                            {/* Project Dropdown */}
                            <div className={cn("flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 transition-all", projectFilter !== "All" ? "border-[#4A6CF7] bg-[#EEF2FF] dark:border-[#4A6CF7]/60 dark:bg-[#4A6CF7]/10 ring-2 ring-[#4A6CF7]/10" : "border-[#E4E4E7] bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#18181B]")}>
                                <FolderKanban className={cn("h-4 w-4", projectFilter !== "All" ? "text-[#4A6CF7]" : "text-[#71717A] dark:text-[#A1A1AA]")} />
                                <span className={cn("whitespace-nowrap text-[11px] font-bold uppercase tracking-widest", projectFilter !== "All" ? "text-[#4A6CF7]" : "text-[#71717A] dark:text-[#A1A1AA]")}>Project</span>
                                <select
                                    value={projectFilter}
                                    onChange={e => setProjectFilter(e.target.value)}
                                    className="max-w-[180px] bg-transparent py-0.5 pr-7 text-[12px] font-semibold text-[#3F3F46] outline-none dark:text-[#E4E4E7]"
                                >
                                    {projectsList.map(pn => <option key={pn} value={pn} className="dark:bg-[#27272A]">{pn}</option>)}
                                </select>
                            </div>

                            {/* Scheme Dropdown */}
                            <div className={cn("flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 transition-all", schemeFilter !== "All" ? "border-[#4A6CF7] bg-[#EEF2FF] dark:border-[#4A6CF7]/60 dark:bg-[#4A6CF7]/10 ring-2 ring-[#4A6CF7]/10" : "border-[#E4E4E7] bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#18181B]")}>
                                <Tags className={cn("h-4 w-4", schemeFilter !== "All" ? "text-[#4A6CF7]" : "text-[#71717A] dark:text-[#A1A1AA]")} />
                                <span className={cn("whitespace-nowrap text-[11px] font-bold uppercase tracking-widest", schemeFilter !== "All" ? "text-[#4A6CF7]" : "text-[#71717A] dark:text-[#A1A1AA]")}>Scheme</span>
                                <select
                                    value={schemeFilter}
                                    onChange={e => setSchemeFilter(e.target.value)}
                                    className="max-w-[200px] bg-transparent py-0.5 pr-7 text-[12px] font-semibold text-[#3F3F46] outline-none dark:text-[#E4E4E7]"
                                >
                                    {schemesList.map(s => <option key={s} value={s} className="dark:bg-[#27272A]">{s}</option>)}
                                </select>
                            </div>

                            {/* Clear button with filter count */}
                            {(() => {
                                const activeCount = [search, deptFilter !== "All", desigFilter !== "All", projectFilter !== "All", schemeFilter !== "All"].filter(Boolean).length;
                                if (activeCount === 0) return null;
                                return (
                                    <button
                                        onClick={() => { setSearch(""); setDeptFilter("All"); setDesigFilter("All"); setProjectFilter("All"); setSchemeFilter("All"); }}
                                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-[12px] font-bold text-red-700 transition-all hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/30"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        Clear
                                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">{activeCount}</span>
                                    </button>
                                );
                            })()}
                        </div>

                        {/* Table Container */}
                        <Card className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                            <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-[#FAFAF9] px-[22px] py-[14px] dark:border-[#3F3F46] dark:bg-[#27272A]">
                                <div className="flex items-center gap-3 text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-[#2563EB] dark:bg-blue-950/20">
                                        <IndianRupee className="h-3.5 w-3.5" />
                                    </div>
                                    Salary Register
                                    <span className="ml-1 inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                                        {displayedRecords.length} {displayedRecords.length === 1 ? 'record' : 'records'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wide text-[#71717A] dark:text-[#A1A1AA]">
                                        {MONTHS[selectedMonth].label} {selectedYear}
                                    </span>
                                    {/* Open full-page in new tab */}
                                    <button
                                        onClick={() => window.open("/salary-module/register", "_blank", "noopener,noreferrer")}
                                        title="Open Salary Register in full page (new tab)"
                                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-white px-2.5 py-1.5 text-[11px] font-bold text-[#3F3F46] transition-all hover:border-[#4A6CF7]/40 hover:bg-[#EEF2FF] hover:text-[#2563EB] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8] dark:hover:border-[#4A6CF7]/40 dark:hover:bg-[#4A6CF7]/10 dark:hover:text-[#A5B4FC] shadow-sm"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                        Full Page
                                    </button>
                                </div>
                            </div>
                            <CardContent className="p-0">
                                {isLoading ? (
                                    <div className="py-24 text-center">
                                        <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#4A6CF7]" />
                                        <p className="mt-4 text-sm font-medium text-[#71717A] dark:text-[#A1A1AA]">Loading approved staff record profiles...</p>
                                    </div>
                                ) : error ? (
                                    <div className="py-16 text-center">
                                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-red-600 dark:text-red-400 mb-1">Failed to load staff list</p>
                                        <p className="text-xs text-red-400 max-w-md mx-auto break-all bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-900/30">{error}</p>
                                        <button onClick={fetchData} className="mt-5 text-sm text-[#D97757] hover:underline font-bold">Try again</button>
                                    </div>
                                ) : displayedRecords.length === 0 ? (
                                    <div className="py-24 text-center">
                                        {activeTab === "processed" ? (
                                            <>
                                                <CheckCircle2 className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                                                <p className="text-base font-bold text-zinc-900 dark:text-white mb-1">No processed salaries yet</p>
                                                <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-md mx-auto">
                                                    No salary payments have been processed for this period. Switch to the &ldquo;Salary To Be Processed&rdquo; tab to process payments.
                                                </p>
                                            </>
                                        ) : pendingRecords.length === 0 && processedRecords.length > 0 ? (
                                            <>
                                                <CheckCircle2 className="w-12 h-12 text-emerald-400 dark:text-emerald-500 mx-auto mb-3" />
                                                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 mb-1">All salaries processed!</p>
                                                <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-md mx-auto">
                                                    All {processedRecords.length} salary payments have been processed. Switch to the &ldquo;Salary Processed&rdquo; tab to review.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <User className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                                                <p className="text-base font-bold text-zinc-900 dark:text-white mb-1">No staff found</p>
                                                <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-md mx-auto">
                                                    {search || deptFilter !== "All" || desigFilter !== "All" || projectFilter !== "All" || schemeFilter !== "All"
                                                        ? "No staff matches the specified filters. Try clearing your parameters."
                                                        : `No approved Project Staff Details records found for ${currentUser || "your account"} in the selected period.`}
                                                </p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto scroll-smooth">
                                        <table className="min-w-[2400px] table-auto border-collapse divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                                            <thead className="sticky top-0 z-20 bg-[#EEF2FF] text-[10px] font-extrabold uppercase tracking-wider text-[#1E3A8A] dark:bg-[#1E3A8A]/18 dark:text-[#C7D2FE]">
                                                <tr className="border-b border-[#C7D2FE]/70 bg-[#EEF2FF] dark:border-[#4A6CF7]/25 dark:bg-[#1E3A8A]/18">
                                                    {/* Checkbox select-all — only shown on pending tab */}
                                                    {activeTab === "pending" && (
                                                        <th rowSpan={2} className="w-[44px] min-w-[44px] border-r border-[#C7D2FE]/70 px-3 py-4 text-center dark:border-[#4A6CF7]/25 sticky left-0 z-30 bg-[#EEF2FF] dark:bg-[#1e293b]">
                                                            <input
                                                                type="checkbox"
                                                                title="Select all pending"
                                                                checked={pendingRecords.length > 0 && pendingRecords.every(r => selectedEmpIds.has(r.employee_id))}
                                                                onChange={e => {
                                                                    if (e.target.checked) {
                                                                        setSelectedEmpIds(new Set(pendingRecords.map(r => r.employee_id)));
                                                                    } else {
                                                                        setSelectedEmpIds(new Set());
                                                                    }
                                                                }}
                                                                className="h-4 w-4 rounded border-zinc-300 text-[#4A6CF7] cursor-pointer"
                                                            />
                                                        </th>
                                                    )}
                                                    <th rowSpan={2} className={cn("min-w-[48px] border-r border-[#C7D2FE]/70 px-3 py-4 text-left dark:border-[#4A6CF7]/25 z-30 bg-[#EEF2FF] dark:bg-[#1e293b]", activeTab === "pending" ? "w-[48px] sticky left-[44px]" : "w-[48px] sticky left-0")}>#</th>
                                                    <th rowSpan={2} className={cn("w-[120px] min-w-[120px] border-r border-[#C7D2FE]/70 px-3 py-4 text-left dark:border-[#4A6CF7]/25 z-30 bg-[#EEF2FF] dark:bg-[#1e293b]", activeTab === "pending" ? "sticky left-[92px]" : "sticky left-[48px]")}>Emp ID</th>
                                                    <th rowSpan={2} className={cn("w-[200px] min-w-[200px] border-r border-[#C7D2FE]/70 px-3 py-4 text-left dark:border-[#4A6CF7]/25 z-30 bg-[#EEF2FF] dark:bg-[#1e293b] shadow-[4px_0_8px_-3px_rgba(0,0,0,0.1)]", activeTab === "pending" ? "sticky left-[212px]" : "sticky left-[168px]")}>Full Name</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left">Email ID</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left">Department</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left">Role</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left">Joining</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left">Exit Date</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left">Project No</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left">Scheme</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left">Bank A/C No</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-center">Hostel</th>

                                                    {/* Earnings section */}
                                                    <th colSpan={9} className="px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-center border-b border-zinc-200 dark:border-zinc-800">Earnings Details (₹)</th>

                                                    {/* Deductions section */}
                                                    <th colSpan={8} className="px-3 py-2 bg-red-50/50 dark:bg-red-950/20 text-red-800 dark:text-red-400 text-center border-b border-zinc-200 dark:border-zinc-800">Deductions Details (₹)</th>

                                                    <th rowSpan={2} className="px-4 py-4 text-right font-bold text-amber-800 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10 border-l border-r border-zinc-200 dark:border-zinc-800">Net Pay (₹)</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left">Comment</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left border-r border-zinc-200 dark:border-zinc-800">Remarks</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-center bg-zinc-50 dark:bg-zinc-950 shadow-sm min-w-[160px]">
                                                        {activeTab === "pending" && selectedEmpIds.size > 0 ? (
                                                            <button
                                                                onClick={() => handlePaySelected(pendingRecords.filter(r => selectedEmpIds.has(r.employee_id)))}
                                                                disabled={loadingEmpId === "__bulk__"}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-60"
                                                            >
                                                                {loadingEmpId === "__bulk__" ? <Loader2 className="w-3 h-3 animate-spin" /> : <IndianRupee className="w-3 h-3" />}
                                                                Pay {selectedEmpIds.size} Selected
                                                            </button>
                                                        ) : (
                                                            <span>Slip / Pay</span>
                                                        )}
                                                    </th>
                                                </tr>
                                                <tr className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                                    {/* Earnings sub-headers */}
                                                    <TH label="Basic" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                                    <TH label="HRA" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                                    <TH label="HRA (%)" align="center" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                                    <TH label="Days" align="center" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                                    <TH label="Amt (Days)" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                                    <TH label="HRA (Days)" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                                    <TH label="MA (Days)" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                                    <TH label="Arrear" align="right" className="bg-emerald-50/30 dark:bg-emerald-950/20 text-[#D97757] font-semibold" />
                                                    <TH label="Gross" align="right" className="bg-emerald-50/30 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold" />

                                                    {/* Deductions sub-headers */}
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
                                                {displayedRecords.map((r, i) => {
                                                    const { inputs, isEdited } = getRowInputs(r.docName);
                                                    const isProcessed = processedEmployees.has(r.employee_id);
                                                    const isChecked = selectedEmpIds.has(r.employee_id);
                                                    const workingDays = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
                                                    const proRataBasic = calcProRataBasic(r.basic_salary, workingDays, daysInMonth);
                                                    const proRataHRA = Math.round((r.hra / daysInMonth) * workingDays);
                                                    const proRataMedical = Math.round((r.medical_allowance / daysInMonth) * workingDays);
                                                    const grossPay = proRataBasic + proRataHRA + proRataMedical + inputs.arrear;
                                                    const pTax = calcPTax(r.basic_salary);
                                                    const hraDed = getHRADeduction(r, proRataHRA);
                                                    const totalDed = hraDed + inputs.medicalDeduction + pTax + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
                                                    const netPay = grossPay - totalDed;

                                                    return (
                                                        <tr key={r.docName || i} className={cn("transition-colors group", i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-slate-50/80 dark:bg-zinc-900/60", "hover:bg-blue-50/50 dark:hover:bg-[#27272A]", isChecked && "!bg-indigo-50/60 dark:!bg-indigo-950/20")}>
                                                            {/* Checkbox — only on pending tab */}
                                                            {activeTab === "pending" && (
                                                                <td className={cn("px-3 py-3 text-center border-r border-zinc-200 dark:border-zinc-800 sticky left-0 z-10 w-[44px] min-w-[44px]", i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-slate-50 dark:bg-zinc-900/80", "group-hover:!bg-blue-50/50 dark:group-hover:!bg-[#27272A]", isChecked && "!bg-indigo-50/60 dark:!bg-indigo-950/20")}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={isChecked}
                                                                        onChange={e => {
                                                                            setSelectedEmpIds(prev => {
                                                                                const next = new Set(prev);
                                                                                if (e.target.checked) next.add(r.employee_id);
                                                                                else next.delete(r.employee_id);
                                                                                return next;
                                                                            });
                                                                        }}
                                                                        className="h-4 w-4 rounded border-zinc-300 text-[#4A6CF7] cursor-pointer"
                                                                    />
                                                                </td>
                                                            )}

                                                            {/* # */}
                                                            <td className={cn("px-3 py-3 text-xs font-semibold text-zinc-400 border-r border-zinc-200 dark:border-zinc-800 z-10 w-[48px] min-w-[48px]", activeTab === "pending" ? "sticky left-[44px]" : "sticky left-0", i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-slate-50 dark:bg-zinc-900/80", "group-hover:!bg-blue-50/50 dark:group-hover:!bg-[#27272A]", isChecked && "!bg-indigo-50/60 dark:!bg-indigo-950/20")}>{i + 1}</td>

                                                            {/* Emp ID */}
                                                            <td className={cn("px-3 py-3 border-r border-zinc-200 dark:border-zinc-800 z-10 w-[120px] min-w-[120px]", activeTab === "pending" ? "sticky left-[92px]" : "sticky left-[48px]", i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-slate-50 dark:bg-zinc-900/80", "group-hover:!bg-blue-50/50 dark:group-hover:!bg-[#27272A]", isChecked && "!bg-indigo-50/60 dark:!bg-indigo-950/20")}>
                                                                <span className="text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-700/50">
                                                                    {r.employee_id}
                                                                </span>
                                                            </td>

                                                            {/* Full Name */}
                                                            <td className={cn("px-3 py-3 border-r border-zinc-200 dark:border-zinc-800 z-10 w-[200px] min-w-[200px] shadow-[4px_0_8px_-3px_rgba(0,0,0,0.07)]", activeTab === "pending" ? "sticky left-[212px]" : "sticky left-[168px]", i % 2 === 0 ? "bg-white dark:bg-zinc-900" : "bg-slate-50 dark:bg-zinc-900/80", "group-hover:!bg-blue-50/50 dark:group-hover:!bg-[#27272A]", isChecked && "!bg-indigo-50/60 dark:!bg-indigo-950/20")}>
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D97757]/20 to-orange-200/50 dark:from-[#D97757]/30 dark:to-orange-950/30 flex items-center justify-center shrink-0 border border-orange-500/10">
                                                                        <span className="text-[10px] font-bold text-[#D97757]">
                                                                            {r.first_name.charAt(0).toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-100 whitespace-nowrap">{r.first_name}</span>
                                                                </div>
                                                            </td>

                                                            <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">{r.email_id}</td>
                                                            <td className="px-3 py-3 text-xs font-medium text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                                                                {r.department && r.department !== "—" ? (
                                                                    <DepartmentName name={r.department} />
                                                                ) : (
                                                                    "—"
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-3">
                                                                <span className="text-[10px] bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50 px-2.5 py-0.5 rounded-full whitespace-nowrap font-semibold">
                                                                    {r.designation}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-500 whitespace-nowrap">{fmtDate(r.joining_date)}</td>
                                                            <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-500 whitespace-nowrap font-mono">{r.term_completion_date ? fmtDate(r.term_completion_date) : "—"}</td>
                                                            <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-500 whitespace-nowrap font-mono">{r.project_no || "—"}</td>
                                                            <td className="px-3 py-3 text-xs whitespace-nowrap">
                                                                {schemeNumberMap[r.project_no || ""] ? (
                                                                    <span className="text-[10px] font-semibold bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border border-violet-100 dark:border-violet-900/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                                                                        {schemeNumberMap[r.project_no || ""]}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-zinc-400">—</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-500 whitespace-nowrap font-mono">{r.bank_account_number || "—"}</td>
                                                            <td className="px-3 py-3 text-center whitespace-nowrap">
                                                                {(() => {
                                                                    if (!r.ps_hostel) return <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50 px-2 py-0.5 rounded-full">No</span>;
                                                                    const raw = String(r.ps_hostel).trim().toLowerCase();
                                                                    const isHostel = !(raw === "0" || raw === "no" || raw === "false" || raw === "");
                                                                    return isHostel
                                                                        ? <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40 px-2 py-0.5 rounded-full">Yes</span>
                                                                        : <span className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50 px-2 py-0.5 rounded-full">No</span>;
                                                                })()}
                                                            </td>

                                                            {/* Earnings values */}
                                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5 border-l border-zinc-100 dark:border-zinc-800">{fmt(r.basic_salary)}</td>
                                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">{fmt(r.hra)}</td>
                                                            <td className="px-3 py-3 text-center tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">
                                                                <span className="text-[10px] font-bold bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border border-violet-200/50 dark:border-violet-900/40 px-2 py-0.5 rounded-full">
                                                                    {r.hra_percent}%
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3 text-center tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">
                                                                <span className={cn(
                                                                    "text-xs font-bold px-2 py-0.5 rounded-full border",
                                                                    workingDays < daysInMonth
                                                                        ? "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/40"
                                                                        : "bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200/50 dark:border-zinc-700/50"
                                                                )}>
                                                                    {workingDays} / {daysInMonth}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">
                                                                <span className={cn(workingDays < daysInMonth && "text-amber-600 dark:text-amber-400 font-semibold")}>
                                                                    {fmt(proRataBasic)}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">{fmt(proRataHRA)}</td>
                                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">{fmt(proRataMedical)}</td>

                                                            {/* Arrear Input */}
                                                            <td className="px-2 py-1.5 bg-emerald-50/10 dark:bg-emerald-950/10 border-l border-zinc-100 dark:border-zinc-800">
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="number"
                                                                        value={inputs.arrear || ""}
                                                                        onChange={e => handleInputChange(r.docName, "arrear", parseInt(e.target.value, 10) || 0)}
                                                                        className={cn(
                                                                            "w-24 px-2.5 py-1.5 text-xs text-right bg-white dark:bg-zinc-800 border rounded-md focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] focus:outline-none transition-all tabular-nums",
                                                                            isEdited.arrear
                                                                                ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                                : "border-zinc-200 dark:border-zinc-700"
                                                                        )}
                                                                        placeholder="0"
                                                                        min="0"
                                                                        step="1"
                                                                    />
                                                                </div>
                                                            </td>

                                                            {/* Gross Pay */}
                                                            <td className="px-3 py-3 text-right font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-950/15 tabular-nums whitespace-nowrap border-l border-r border-zinc-200/50 dark:border-zinc-800/80">
                                                                {fmt(grossPay)}
                                                            </td>

                                                            {/* Deductions */}
                                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap bg-red-50/5 dark:bg-red-950/5">{fmt(hraDed)}</td>

                                                            {/* Medical Deduction Input */}
                                                            <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                                                <input
                                                                    type="number"
                                                                    value={inputs.medicalDeduction || ""}
                                                                    onChange={e => handleInputChange(r.docName, "medicalDeduction", parseInt(e.target.value, 10) || 0)}
                                                                    className={cn(
                                                                        "w-24 px-2.5 py-1.5 text-xs text-right bg-white dark:bg-zinc-800 border rounded-md focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] focus:outline-none transition-all tabular-nums",
                                                                        isEdited.medicalDeduction
                                                                            ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                            : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="0"
                                                                    min="0"
                                                                    step="1"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap bg-red-50/5 dark:bg-red-950/5">{fmt(pTax)}</td>

                                                            {/* TA Input */}
                                                            <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                                                <input
                                                                    type="number"
                                                                    value={inputs.ta || ""}
                                                                    onChange={e => handleInputChange(r.docName, "ta", parseInt(e.target.value, 10) || 0)}
                                                                    className={cn(
                                                                        "w-24 px-2.5 py-1.5 text-xs text-right bg-white dark:bg-zinc-800 border rounded-md focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] focus:outline-none transition-all tabular-nums",
                                                                        isEdited.ta
                                                                            ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                            : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="0"
                                                                    min="0"
                                                                    step="1"
                                                                />
                                                            </td>

                                                            {/* ID Card Input */}
                                                            <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                                                <input
                                                                    type="number"
                                                                    value={inputs.idCardCharge || ""}
                                                                    onChange={e => handleInputChange(r.docName, "idCardCharge", parseInt(e.target.value, 10) || 0)}
                                                                    className={cn(
                                                                        "w-24 px-2.5 py-1.5 text-xs text-right bg-white dark:bg-zinc-800 border rounded-md focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] focus:outline-none transition-all tabular-nums",
                                                                        isEdited.idCardCharge
                                                                            ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                            : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="0"
                                                                    min="0"
                                                                    step="1"
                                                                />
                                                            </td>

                                                            {/* Electricity Input */}
                                                            <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                                                <input
                                                                    type="number"
                                                                    value={inputs.electricityBill || ""}
                                                                    onChange={e => handleInputChange(r.docName, "electricityBill", parseInt(e.target.value, 10) || 0)}
                                                                    className={cn(
                                                                        "w-24 px-2.5 py-1.5 text-xs text-right bg-white dark:bg-zinc-800 border rounded-md focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] focus:outline-none transition-all tabular-nums",
                                                                        isEdited.electricityBill
                                                                            ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                            : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="0"
                                                                    min="0"
                                                                    step="1"
                                                                />
                                                            </td>

                                                            {/* Other Deduction Input */}
                                                            <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                                                <input
                                                                    type="number"
                                                                    value={inputs.otherDeduction || ""}
                                                                    onChange={e => handleInputChange(r.docName, "otherDeduction", parseInt(e.target.value, 10) || 0)}
                                                                    className={cn(
                                                                        "w-24 px-2.5 py-1.5 text-xs text-right bg-white dark:bg-zinc-800 border rounded-md focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] focus:outline-none transition-all tabular-nums",
                                                                        isEdited.otherDeduction
                                                                            ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                            : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="0"
                                                                    min="0"
                                                                    step="1"
                                                                />
                                                            </td>

                                                            {/* Total Deduction */}
                                                            <td className="px-3 py-3 text-right font-semibold text-rose-600 dark:text-rose-400 bg-red-50/10 dark:bg-red-950/15 tabular-nums whitespace-nowrap border-l border-r border-zinc-200/50 dark:border-zinc-800/80">
                                                                {fmt(totalDed)}
                                                            </td>

                                                            {/* Net Pay calculated */}
                                                            <td className="px-4 py-3 text-right font-bold text-amber-800 dark:text-amber-400 bg-amber-50/15 dark:bg-amber-950/10 border-l border-r border-zinc-200/80 dark:border-zinc-800/80 tabular-nums whitespace-nowrap">
                                                                {fmt(netPay)}
                                                            </td>

                                                            {/* Comments and Remarks */}
                                                            <td className="px-2 py-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={inputs.comment}
                                                                    onChange={e => handleInputChange(r.docName, "comment", e.target.value)}
                                                                    className={cn(
                                                                        "w-32 px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border rounded-md focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] focus:outline-none transition-all",
                                                                        isEdited.comment ? "border-amber-400 bg-amber-50/10" : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="Note..."
                                                                />
                                                            </td>
                                                            <td className="px-2 py-1.5 border-r border-zinc-100 dark:border-zinc-800">
                                                                <input
                                                                    type="text"
                                                                    value={inputs.remarks}
                                                                    onChange={e => handleInputChange(r.docName, "remarks", e.target.value)}
                                                                    className={cn(
                                                                        "w-32 px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-800 border rounded-md focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] focus:outline-none transition-all",
                                                                        isEdited.remarks ? "border-amber-400 bg-amber-50/10" : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="Remarks..."
                                                                />
                                                            </td>

                                                            {/* Payslip Action Button */}
                                                            <td className="px-3 py-3 text-center bg-white group-hover:bg-blue-50/50 dark:bg-zinc-900 dark:group-hover:bg-[#27272A]">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    <button
                                                                        onClick={() => setSelectedSlipRecord(r)}
                                                                        title="Generate Pay Slip"
                                                                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757] dark:hover:text-white transition-all shadow-sm active:scale-95 text-[10px] font-bold"
                                                                    >
                                                                        <Eye className="w-3 h-3" />
                                                                        Slip
                                                                    </button>
                                                                    {isProcessed ? (
                                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold tracking-wide">
                                                                            <CheckCircle2 className="w-3 h-3" />
                                                                            Paid
                                                                        </span>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => handlePayClick(r, netPay)}
                                                                            disabled={loadingEmpId !== null}
                                                                            title="Process Payment"
                                                                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50 text-[10px] font-bold"
                                                                        >
                                                                            {loadingEmpId === r.employee_id ? (
                                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                            ) : (
                                                                                <IndianRupee className="w-3 h-3" />
                                                                            )}
                                                                            Pay
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>

                                            {/* FOOTER */}
                                            <tfoot className="bg-zinc-50 dark:bg-zinc-955 sticky bottom-0 z-20 border-t-2 border-zinc-200 dark:border-zinc-700 font-bold text-xs uppercase tracking-wide">
                                                <tr className="bg-zinc-50 dark:bg-zinc-950">
                                                    {activeTab === "pending" && (
                                                        <td className="px-3 py-4 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 sticky left-0 z-30 w-[44px] min-w-[44px]"></td>
                                                    )}
                                                    <td className={cn("px-3 py-4 text-sm font-serif font-bold text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 z-30 w-[48px] min-w-[48px]", activeTab === "pending" ? "sticky left-[44px]" : "sticky left-0")}></td>
                                                    <td className={cn("px-3 py-4 text-sm font-serif font-bold text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 z-30 w-[120px] min-w-[120px] whitespace-nowrap", activeTab === "pending" ? "sticky left-[92px]" : "sticky left-[48px]")}>Total</td>
                                                    <td className={cn("px-3 py-4 text-sm font-serif font-bold text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 z-30 w-[200px] min-w-[200px] shadow-[4px_0_8px_-3px_rgba(0,0,0,0.1)] whitespace-nowrap", activeTab === "pending" ? "sticky left-[212px]" : "sticky left-[168px]")}>({displayedRecords.length} Staff)</td>
                                                    <td colSpan={8} className="px-3 py-4 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800"></td>

                                                    {/* Earnings totals */}
                                                    <td className="px-3 py-4 text-right text-emerald-800 dark:text-emerald-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10 border-l border-zinc-200 dark:border-zinc-800">{fmt(totalBasic)}</td>
                                                    <td className="px-3 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalOriginalHRA)}</td>
                                                    <td className="px-3 py-4 text-center text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">—</td>
                                                    <td className="px-3 py-4 text-center text-zinc-600 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{totalWorkingDays}</td>
                                                    <td className="px-3 py-4 text-right text-emerald-800 dark:text-emerald-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalProRataBasic)}</td>
                                                    <td className="px-3 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalHRA)}</td>
                                                    <td className="px-3 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalMedical)}</td>
                                                    <td className="px-3 py-4 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/15">{fmt(totalArrear)}</td>
                                                    <td className="px-3 py-4 text-right text-emerald-900 dark:text-emerald-300 bg-emerald-100/40 dark:bg-emerald-900/20 font-bold tabular-nums whitespace-nowrap border-l border-r border-zinc-200 dark:border-zinc-800">{fmt(totalEarnings)}</td>

                                                    {/* Deductions totals */}
                                                    <td className="px-3 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-rose-50/10 dark:bg-rose-950/10">{fmt(totalHRADed)}</td>
                                                    <td className="px-3 py-4 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-rose-50/15 dark:bg-rose-950/15">{fmt(totalMedicalDed)}</td>
                                                    <td className="px-3 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-rose-50/10 dark:bg-rose-950/10">{fmt(totalPTax)}</td>
                                                    <td className="px-3 py-4 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-rose-50/15 dark:bg-rose-950/15">{fmt(totalTA)}</td>
                                                    <td className="px-3 py-4 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-rose-50/15 dark:bg-rose-950/15">{fmt(totalIdCard)}</td>
                                                    <td className="px-3 py-4 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-rose-50/15 dark:bg-rose-950/15">{fmt(totalElectricity)}</td>
                                                    <td className="px-3 py-4 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-rose-50/15 dark:bg-rose-950/15">{fmt(totalOtherDeduct)}</td>
                                                    <td className="px-3 py-4 text-right text-rose-900 dark:text-rose-300 bg-rose-100/40 dark:bg-rose-900/20 font-bold tabular-nums whitespace-nowrap border-l border-r border-zinc-200 dark:border-zinc-800">{fmt(totalDeductions)}</td>

                                                    {/* Net payout total */}
                                                    <td className="px-4 py-4 text-right text-amber-900 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-900/20 font-bold tabular-nums whitespace-nowrap border-l border-r border-zinc-250 dark:border-zinc-700">{fmt(totalNetPay)}</td>

                                                    <td colSpan={2} className="px-3 py-4 border-r border-zinc-200 dark:border-zinc-800"></td>
                                                    <td className="px-3 py-4 bg-zinc-50 dark:bg-zinc-950"></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </>
                )}

                {/* Unprepared Salary Cycle Alert Banner */}
                {!isLoading && !error && filtered.length > 0 && !isPrepared && (
                    <div className="mx-auto my-10 max-w-2xl overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white text-center shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                        <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                        <div className="flex flex-col items-center px-8 py-10">
                            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800/60 dark:bg-amber-950/20 dark:text-amber-400">
                                <CalendarClock className="h-7 w-7" />
                            </div>
                            <h2 className="text-[18px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7]">Salary Cycle Not Prepared</h2>
                            <p className="mt-3 max-w-md text-sm font-medium leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">
                                The payroll register and pro-rata salary ledger for <strong className="text-[#3F3F46] dark:text-[#E4E4E7]">{MONTHS[selectedMonth].label} {selectedYear}</strong> have not been prepared or frozen yet.
                            </p>
                            <p className="mt-1.5 max-w-md text-xs font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                Initialize and prepare payroll entries to view computed amounts and generate slips.
                            </p>
                            <button
                                onClick={async (e) => {
                                    const confirm = window.confirm(`Are you sure you want to initialize and prepare the salary sheet for ${MONTHS[selectedMonth].label} ${selectedYear}?`);
                                    if (!confirm) return;

                                    const btn = e.currentTarget as HTMLButtonElement;
                                    if (btn) {
                                        btn.disabled = true;
                                        btn.innerHTML = `<svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Initializing Payroll...`;
                                    }

                                    await new Promise(resolve => setTimeout(resolve, 1200));

                                    setPreparedCycles(prev => {
                                        const next = { ...prev, [cycleKey]: true };
                                        localStorage.setItem("rnd_prepared_salary_cycles", JSON.stringify(next));
                                        return next;
                                    });
                                }}
                                className="mt-7 inline-flex h-10 items-center gap-2 rounded-lg bg-[#4A6CF7] px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#3558E8] hover:shadow-md hover:shadow-[#4A6CF7]/25"
                            >
                                <Lock className="h-3.5 w-3.5" />
                                Prepare {MONTHS[selectedMonth].label} {selectedYear} Salary
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Salary Slip Modal Component */}
            {selectedSlipRecord && (
                <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
                    <div className="relative my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 dark:border-[#3F3F46] dark:bg-[#27272A]">
                        <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757] print:hidden" />
                        {/* Control header bar - hidden during print */}
                        <div className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E4E7] bg-[#FAFAF9] px-6 py-4 print:hidden dark:border-[#3F3F46] dark:bg-[#27272A]">
                            <div className="flex min-w-0 items-center gap-2">
                                <IndianRupee className="h-5 w-5 text-[#D97757]" />
                                <h3 className="truncate font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Salary Slip Statement</h3>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                <button
                                    onClick={() => window.print()}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#D97757] px-3 text-xs font-bold text-white shadow-sm transition-all hover:opacity-90"
                                >
                                    <Printer className="w-3.5 h-3.5" /> Print / Save PDF
                                </button>
                                <button
                                    type="button"
                                    aria-label="Close salary slip"
                                    onClick={() => setSelectedSlipRecord(null)}
                                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-white px-3 text-xs font-bold text-[#3F3F46] transition-all hover:bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7] dark:hover:bg-[#3F3F46]"
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Close
                                </button>
                            </div>
                        </div>

                        {/* Printable Area */}
                        <div id="print-payslip-area" className="overflow-y-auto bg-white p-8 font-sans text-zinc-900 md:p-12 print:m-0 print:overflow-visible print:p-0">
                            {/* CSS Rules inside the printable element to enforce styles */}
                            <style>{`
                                @media print {
                                    /* Hide all page content during print */
                                    body * {
                                        visibility: hidden;
                                    }
                                    
                                    /* Keep only the print payslip area and its descendants visible */
                                    #print-payslip-area, #print-payslip-area * {
                                        visibility: visible !important;
                                    }
                                    
                                    /* Force parent layouts to be visible and un-clipped */
                                    #root, 
                                    .fixed, 
                                    .relative, 
                                    .overflow-hidden, 
                                    .backdrop-blur-sm,
                                    body, 
                                    html {
                                        visibility: visible !important;
                                        overflow: visible !important;
                                        position: static !important;
                                        height: auto !important;
                                        min-height: auto !important;
                                        margin: 0 !important;
                                        padding: 0 !important;
                                        background: transparent !important;
                                        box-shadow: none !important;
                                        border: none !important;
                                        transform: none !important;
                                        animation: none !important;
                                        backdrop-filter: none !important;
                                    }
                                    
                                    /* Style the print container to cover the full A4 page perfectly */
                                    #print-payslip-area {
                                        position: absolute !important;
                                        left: 0 !important;
                                        top: 0 !important;
                                        width: 100% !important;
                                        padding: 30px !important;
                                        margin: 0 !important;
                                        background: white !important;
                                        color: black !important;
                                        border: none !important;
                                        -webkit-print-color-adjust: exact !important;
                                        print-color-adjust: exact !important;
                                    }
                                    
                                    .dark #print-payslip-area {
                                        background: white !important;
                                        color: black !important;
                                    }
                                }
                            `}</style>

                            {/* Organization Header */}
                            <div className="text-center space-y-2 pb-6 border-b-2 border-zinc-800">
                                <div className="flex justify-center items-center gap-4 mb-2">
                                    <img src="/IITG_Large_Logo.gif" alt="IITG Logo" className="w-14 h-14 object-contain" />
                                    <div className="text-left">
                                        <h2 className="text-xl md:text-2xl font-serif font-bold tracking-tight text-zinc-950 uppercase">Indian Institute of Technology Guwahati</h2>
                                        <h3 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">Research & Development (R&D) Cell</h3>
                                    </div>
                                </div>
                                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 bg-zinc-100 py-1.5 px-4 rounded-full inline-block">
                                    Salary Statement for {MONTHS.find(m => m.value === selectedMonth)?.label} {selectedYear}
                                </p>
                            </div>

                            {/* Metadata / Employee Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 py-6 text-sm border-b border-zinc-200">
                                <div className="flex justify-between border-b border-zinc-100 py-1">
                                    <span className="text-zinc-500 font-medium">Employee Name:</span>
                                    <span className="font-bold text-zinc-950">{selectedSlipRecord.first_name}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-100 py-1">
                                    <span className="text-zinc-500 font-medium">Employee ID:</span>
                                    <span className="font-mono font-bold text-zinc-950">{selectedSlipRecord.employee_id}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-100 py-1">
                                    <span className="text-zinc-500 font-medium">Department:</span>
                                    <span className="font-semibold text-zinc-900">
                                        {selectedSlipRecord.department && selectedSlipRecord.department !== "—" ? (
                                            <DepartmentName name={selectedSlipRecord.department} />
                                        ) : (
                                            "—"
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-100 py-1">
                                    <span className="text-zinc-500 font-medium">Designation / Role:</span>
                                    <span className="font-semibold text-zinc-900">{selectedSlipRecord.designation}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-100 py-1">
                                    <span className="text-zinc-500 font-medium">Joining Date:</span>
                                    <span className="font-medium text-zinc-900">{fmtDate(selectedSlipRecord.joining_date)}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-100 py-1">
                                    <span className="text-zinc-500 font-medium">Worked Days this Cycle:</span>
                                    <span className="font-bold text-zinc-950">
                                        {calcWorkingDaysForPeriod(selectedSlipRecord.joining_date, selectedSlipRecord.term_completion_date, selectedYear, selectedMonth)} / {daysInMonth} Days
                                    </span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-100 py-1">
                                    <span className="text-zinc-500 font-medium">Project Number:</span>
                                    <span className="font-semibold text-zinc-900">{selectedSlipRecord.project_no || "—"}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-100 py-1">
                                    <span className="text-zinc-500 font-medium">Scheme:</span>
                                    <span className="font-semibold text-violet-700">{schemeMap[selectedSlipRecord.project_no || ""] || "—"}</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-100 py-1">
                                    <span className="text-zinc-500 font-medium">Bank Account Number:</span>
                                    <span className="font-mono font-bold text-zinc-950">{selectedSlipRecord.bank_account_number || "—"}</span>
                                </div>
                            </div>

                            {/* Earnings & Deductions Double Column Table */}
                            {(() => {
                                const { inputs } = getRowInputs(selectedSlipRecord.docName);
                                const workingDays = calcWorkingDaysForPeriod(selectedSlipRecord.joining_date, selectedSlipRecord.term_completion_date, selectedYear, selectedMonth);
                                const proRataBasic = calcProRataBasic(selectedSlipRecord.basic_salary, workingDays, daysInMonth);
                                const proRataHRA = Math.round((selectedSlipRecord.hra / daysInMonth) * workingDays);
                                const proRataMedical = Math.round((selectedSlipRecord.medical_allowance / daysInMonth) * workingDays);
                                const grossPay = proRataBasic + proRataHRA + proRataMedical + inputs.arrear;
                                const pTax = calcPTax(selectedSlipRecord.basic_salary);
                                const hraDed = getHRADeduction(selectedSlipRecord, proRataHRA);
                                const totalDed = hraDed + inputs.medicalDeduction + pTax + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
                                const netPay = grossPay - totalDed;

                                return (
                                    <div className="mt-6 space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 border border-zinc-300 rounded-xl overflow-hidden divide-y md:divide-y-0 md:divide-x divide-zinc-300">
                                            {/* Earnings Column */}
                                            <div className="flex flex-col h-full bg-emerald-50/5">
                                                <div className="bg-emerald-50 py-2.5 px-4 font-bold border-b border-zinc-300 text-emerald-800 text-sm tracking-wider uppercase">
                                                    Earnings Breakdown
                                                </div>
                                                <div className="p-4 flex-1 space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-600">Pro-Rata Basic Salary:</span>
                                                        <span className="font-semibold tabular-nums">{fmt(proRataBasic)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-600">House Rent Allowance (HRA):</span>
                                                        <span className="font-semibold tabular-nums">{fmt(proRataHRA)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-600">Medical Allowance:</span>
                                                        <span className="font-semibold tabular-nums">{fmt(proRataMedical)}</span>
                                                    </div>
                                                    {inputs.arrear > 0 && (
                                                        <div className="flex justify-between font-medium text-orange-600">
                                                            <span>Arrear Payout adjustments:</span>
                                                            <span className="font-bold tabular-nums">+{fmt(inputs.arrear)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-auto bg-emerald-50/40 border-t border-zinc-200 p-4 py-3 flex justify-between font-bold text-emerald-800 text-sm">
                                                    <span>Gross Earnings Total:</span>
                                                    <span className="tabular-nums">{fmt(grossPay)}</span>
                                                </div>
                                            </div>

                                            {/* Deductions Column */}
                                            <div className="flex flex-col h-full bg-red-50/5">
                                                <div className="bg-red-50 py-2.5 px-4 font-bold border-b border-zinc-300 text-red-800 text-sm tracking-wider uppercase">
                                                    Deductions & Deductibles
                                                </div>
                                                <div className="p-4 flex-1 space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-600">Hostel Rent / Campus Accommodation:</span>
                                                        <span className="font-semibold tabular-nums">{fmt(hraDed)}</span>
                                                    </div>
                                                    {inputs.medicalDeduction > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-zinc-600">Medical Deductions:</span>
                                                            <span className="font-semibold tabular-nums">{fmt(inputs.medicalDeduction)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between">
                                                        <span className="text-zinc-600">Professional Tax (PTAX Assam):</span>
                                                        <span className="font-semibold tabular-nums">{fmt(pTax)}</span>
                                                    </div>
                                                    {inputs.ta > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-zinc-600">Travel/TA Adjustments:</span>
                                                            <span className="font-semibold tabular-nums">{fmt(inputs.ta)}</span>
                                                        </div>
                                                    )}
                                                    {inputs.idCardCharge > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-zinc-600">ID Card Charges:</span>
                                                            <span className="font-semibold tabular-nums">{fmt(inputs.idCardCharge)}</span>
                                                        </div>
                                                    )}
                                                    {inputs.electricityBill > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-zinc-600">Electricity Bill:</span>
                                                            <span className="font-semibold tabular-nums">{fmt(inputs.electricityBill)}</span>
                                                        </div>
                                                    )}
                                                    {inputs.otherDeduction > 0 && (
                                                        <div className="flex justify-between">
                                                            <span className="text-zinc-600">Other Deductions:</span>
                                                            <span className="font-semibold tabular-nums">{fmt(inputs.otherDeduction)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="mt-auto bg-red-50/40 border-t border-zinc-200 p-4 py-3 flex justify-between font-bold text-red-800 text-sm">
                                                    <span>Total Deductions:</span>
                                                    <span className="tabular-nums">{fmt(totalDed)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payout Totals Bar */}
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

                                        {/* Comments Box if any */}
                                        {(inputs.comment || inputs.remarks) && (
                                            <div className="p-4 border border-dashed border-zinc-300 rounded-lg text-xs text-zinc-500 space-y-1">
                                                {inputs.comment && <p><span className="font-bold">Comment Note:</span> {inputs.comment}</p>}
                                                {inputs.remarks && <p><span className="font-bold">Remarks:</span> {inputs.remarks}</p>}
                                            </div>
                                        )}


                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {paymentModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPaymentModalOpen(false)}>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 border-b items-center justify-between">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                {selectedPaymentName ? "Edit Payment" : "Process Payment"}
                            </h2>
                            <button onClick={() => setPaymentModalOpen(false)} className="p-2 hover:bg-zinc-200 dark:bg-zinc-700 rounded-full transition-colors">
                                <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-0">
                            <PaymentForm
                                docName={selectedPaymentName || undefined}
                                commitData={selectedCommit || undefined}
                                resolvedBudgetHead={selectedCommit ? budgetHeadMap[String(selectedCommit.accountHeadId)] : undefined}
                                onSuccess={() => {
                                    setPaymentModalOpen(false);
                                    if (selectedCommit?.salary_user_details?.employee_id) {
                                        markAsProcessed(selectedCommit.salary_user_details.employee_id);
                                    }
                                    fetchData();
                                }}
                                onCancel={() => setPaymentModalOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Scheme-wise BMR Entry Modal ── */}
            {bmrModalOpen && (() => {
                const schemeName = (() => {
                    const empIds = Object.keys(pendingBulkCommits);
                    if (empIds.length === 0) return "—";
                    const firstRecord = records.find(r => r.employee_id === empIds[0]);
                    if (!firstRecord) return "—";
                    return schemeNumberMap[firstRecord.project_no || ""] || firstRecord.project_no || "—";
                })();
                const staffList = records.filter(r => pendingBulkCommits[r.employee_id]);
                return (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => !bmrSubmitting && setBmrModalOpen(false)}>
                        <div
                            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-2xl dark:border-[#3F3F46] dark:bg-[#1C1C1E] animate-in fade-in zoom-in-95 duration-200"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Color bar */}
                            <div className="h-[3px] bg-gradient-to-r from-emerald-400 via-emerald-500 to-[#D97757]" />

                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-[#FAFAF9] px-6 py-4 dark:border-[#3F3F46] dark:bg-[#27272A]">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-900/40">
                                        <IndianRupee className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">Enter BMR Number</h3>
                                        <p className="text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                            One BMR for all staff under scheme <span className="font-bold text-violet-600 dark:text-violet-400">{schemeName}</span>
                                        </p>
                                    </div>
                                </div>
                                {!bmrSubmitting && (
                                    <button onClick={() => setBmrModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E4E7] text-[#71717A] hover:bg-zinc-100 dark:border-[#3F3F46] dark:hover:bg-zinc-800 transition-colors">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {/* Staff list summary */}
                            <div className="max-h-52 overflow-y-auto px-6 py-4 space-y-2">
                                <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-2">
                                    {staffList.length} Staff Selected
                                </p>
                                {staffList.map((r, idx) => {
                                    const commit = pendingBulkCommits[r.employee_id];
                                    return (
                                        <div key={r.employee_id} className="flex items-center justify-between rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] px-3 py-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/30 text-[9px] font-bold text-emerald-700 dark:text-emerald-400">{idx + 1}</span>
                                                <div className="min-w-0">
                                                    <p className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate">{r.first_name}</p>
                                                    <p className="text-[10px] font-mono text-[#71717A] dark:text-[#A1A1AA]">{r.employee_id}</p>
                                                </div>
                                            </div>
                                            <span className="shrink-0 text-[12px] font-bold tabular-nums text-amber-700 dark:text-amber-400">
                                                {fmt(commit?.commitAmount || 0)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Total */}
                            <div className="mx-6 flex items-center justify-between rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 px-4 py-2.5">
                                <span className="text-[12px] font-bold text-emerald-800 dark:text-emerald-400">Total Net Payout</span>
                                <span className="text-[15px] font-extrabold tabular-nums text-emerald-900 dark:text-emerald-300">
                                    {fmt(Object.values(pendingBulkCommits).reduce((s, c) => s + (c?.commitAmount || 0), 0))}
                                </span>
                            </div>

                            {/* BMR input */}
                            <div className="px-6 pt-4 pb-2">
                                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-[#3F3F46] dark:text-[#E4E4E7] mb-1.5">
                                    BMR Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={bmrInput}
                                    onChange={e => { setBmrInput(e.target.value); setBmrError(null); }}
                                    onKeyDown={e => { if (e.key === "Enter" && !bmrSubmitting) handleBmrSubmit(); }}
                                    placeholder="Enter BMR number for this scheme..."
                                    autoFocus
                                    className="w-full rounded-lg border-2 border-[#E4E4E7] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#3F3F46] outline-none placeholder:text-[#A1A1AA] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15 transition-all dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#E4E4E7] dark:placeholder:text-[#71717A] dark:focus:border-emerald-500"
                                />
                                {bmrError && (
                                    <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400">
                                        <AlertCircle className="h-3 w-3" /> {bmrError}
                                    </p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-3 border-t border-[#E4E4E7] dark:border-[#3F3F46] px-6 py-4">
                                <button
                                    onClick={() => setBmrModalOpen(false)}
                                    disabled={bmrSubmitting}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4E4E7] bg-white px-4 text-[12px] font-bold text-[#3F3F46] transition-all hover:bg-[#FAFAF9] disabled:opacity-50 dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBmrSubmit}
                                    disabled={bmrSubmitting || !bmrInput.trim()}
                                    className="inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-[12px] font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {bmrSubmitting ? (
                                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing {staffList.length} salaries...</>
                                    ) : (
                                        <><CheckCircle2 className="h-3.5 w-3.5" /> Submit BMR &amp; Process All</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default SalaryModule;
