import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFrappePostCall, useFrappeAuth } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
    ArrowLeft, Loader2, Search, Download, RefreshCw,
    User, IndianRupee, AlertCircle, ChevronUp, ChevronDown,
    Printer, Eye, Calendar, Building2, UserCheck, X,
    ChevronRight, Briefcase, Edit3, RotateCcw,
    TrendingDown, CalendarClock, Lock, Unlock, ExternalLink
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

/** Pro-rata basic amount = (basic / daysInMonth) * workingDays */
const calcProRataBasic = (basic: number, workingDays: number, daysInMonth: number): number => {
    return (basic / daysInMonth) * workingDays;
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

    const paisa = Math.round((num % 1) * 100);
    let paisaStr = "";
    if (paisa > 0) {
        paisaStr = " and " + helper(paisa) + " Paisa";
    }

    return words.trim() + paisaStr + " Rupees Only";
};

// Map raw Frappe row → StaffRecord using exact ps_* field names
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapRow = (row: any): StaffRecord => {
    const basic = parseFloat(row.ps_basic_salary || 0) || 0;

    // HRA is stored as a percentage string e.g. "20%" — calculate amount
    const hraRaw = String(row.ps_hra || "0").replace("%", "").trim();
    const hraPercent = parseFloat(hraRaw) || 0;
    const hraAmount = hraPercent > 1 ? (basic * hraPercent) / 100 : hraPercent > 0 ? basic * hraPercent : 0;

    // Medical Allowance: "yes"/"no" or numeric
    const maRaw = String(row.ps_ma || "").toLowerCase();
    const maAmount = maRaw === "yes" || maRaw === "1" || maRaw === "true"
        ? 1250
        : parseFloat(row.ps_ma || "0") > 0 ? parseFloat(row.ps_ma) : 0;

    // Hostel: "yes"/"no" or numeric
    const hostelRaw = String(row.ps_hostel || "").toLowerCase();
    const hostelAmount = hostelRaw === "yes" || hostelRaw === "1" || hostelRaw === "true"
        ? parseFloat(row.ps_hostel_amount || "0") || 0
        : parseFloat(row.ps_hostel || "0") > 0 ? parseFloat(row.ps_hostel) : 0;

    // Full name from parts
    const nameParts = [row.ps_first_name, row.ps_middle_name, row.ps_last_name]
        .map(p => (p && p !== "null" ? String(p).trim() : ""))
        .filter(Boolean);
    const fullName = nameParts.join(" ") || "—";

    return {
        docName: row.name || "",
        employee_id: row.ps_emp_id || row.name || "—",
        first_name: fullName,
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
    const [departmentLabels, setDepartmentLabels] = useState<Record<string, string>>({});

    // Pay slip modal state
    const [selectedSlipRecord, setSelectedSlipRecord] = useState<StaffRecord | null>(null);

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { call: getList } = useFrappePostCall<{ message: any[] }>("frappe.client.get_list");

    const getRowInputs = useCallback((docName: string): { inputs: EditableInputs; isEdited: Record<keyof EditableInputs, boolean> } => {
        const record = records.find(r => r.docName === docName);
        const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
        const workingDays = record ? calcWorkingDaysForPeriod(record.joining_date, record.term_completion_date, selectedYear, selectedMonth) : daysInMonth;
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

    const handleInputChange = (docName: string, field: keyof EditableInputs, value: string | number) => {
        setOverrides(prev => {
            const currentOverrides = prev[docName] || {};

            // Check if value is different from default
            let shouldStoreOverride = true;
            if (field === "ta" || field === "otherDeduction" || field === "arrear" || field === "idCardCharge" || field === "electricityBill") {
                if (parseFloat(value as string) === 0 || value === "") {
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
                const defaultMedical = record ? parseFloat(((record.medical_allowance / daysInMonth) * workingDays).toFixed(2)) : 0;
                if (parseFloat(value as string) === defaultMedical) {
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

    useEffect(() => { if (currentUser) fetchData(); }, [fetchData, currentUser]);

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
    }, [records, search, deptFilter, desigFilter, sortKey, sortDir, selectedMonth, selectedYear, departmentLabels]);

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
        s + (r.hra / daysInMonth) * calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth), 0);

    const totalMedical = filtered.reduce((s, r) =>
        s + (r.medical_allowance / daysInMonth) * calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth), 0);

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
            const proRataHRA = (r.hra / daysInMonth) * wd;
            const proRataMedical = (r.medical_allowance / daysInMonth) * wd;
            return s + (prb + proRataHRA + proRataMedical + inputs.arrear);
        }, 0);
    }, [filtered, getRowInputs, selectedMonth, selectedYear, daysInMonth]);

    const totalDeductions = useMemo(() => {
        return filtered.reduce((s, r) => {
            const { inputs } = getRowInputs(r.docName);
            const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
            const proRataHRA = (r.hra / daysInMonth) * wd;
            return s + (proRataHRA + inputs.medicalDeduction + calcPTax(r.basic_salary) + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction);
        }, 0);
    }, [filtered, getRowInputs, selectedMonth, selectedYear, daysInMonth]);

    const totalNetPay = useMemo(() => {
        return filtered.reduce((s, r) => {
            const { inputs } = getRowInputs(r.docName);
            const wd = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
            const prb = calcProRataBasic(r.basic_salary, wd, daysInMonth);
            const proRataHRA = (r.hra / daysInMonth) * wd;
            const proRataMedical = (r.medical_allowance / daysInMonth) * wd;
            const grossPay = prb + proRataHRA + proRataMedical + inputs.arrear;
            const deductions = proRataHRA + inputs.medicalDeduction + calcPTax(r.basic_salary) + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
            return s + (grossPay - deductions);
        }, 0);
    }, [filtered, getRowInputs, selectedMonth, selectedYear, daysInMonth]);

    // CSV export
    const exportCSV = () => {
        const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || "Month";
        const headers = [
            "Sl.No", "Employee Id", "First Name", "Email Id", "Department",
            "Designation", "Joining Date", "Term Completion Date",
            "Basic Salary", "HRA", "Total Working Days", "Amount (Working Days)",
            "HRA amt (W.Days)", "Medical amt (W.Days)", "Arrear", "Gross Pay",
            "HRA amt (W.Days) [Deduction]", "Medical Ded.", "P-Tax", "TA", "ID Card Charge", "Electricity Bill", "Other Deduction",
            "Total Deduction", "Net Pay", "Comment", "Remarks"
        ];
        const rows = filtered.map((r, i) => {
            const { inputs } = getRowInputs(r.docName);
            const workingDays = calcWorkingDaysForPeriod(r.joining_date, r.term_completion_date, selectedYear, selectedMonth);
            const proRataBasic = calcProRataBasic(r.basic_salary, workingDays, daysInMonth);
            const proRataHRA = (r.hra / daysInMonth) * workingDays;
            const proRataMedical = (r.medical_allowance / daysInMonth) * workingDays;
            const grossPay = proRataBasic + proRataHRA + proRataMedical + inputs.arrear;
            const pTax = calcPTax(r.basic_salary);
            const deductions = proRataHRA + inputs.medicalDeduction + pTax + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
            const netPay = grossPay - deductions;
            return [
                i + 1, r.employee_id, r.first_name, r.email_id, r.department,
                r.designation, r.joining_date, r.term_completion_date,
                r.basic_salary, r.hra, workingDays, proRataBasic.toFixed(2),
                proRataHRA.toFixed(2), proRataMedical.toFixed(2), inputs.arrear, grossPay.toFixed(2),
                proRataHRA.toFixed(2), inputs.medicalDeduction, pTax, inputs.ta, inputs.idCardCharge, inputs.electricityBill, inputs.otherDeduction,
                deductions.toFixed(2), netPay.toFixed(2), inputs.comment, inputs.remarks
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
                                        const confirm = window.confirm(`Are you sure you want to unlock the salary cycle for ${MONTHS[selectedMonth].label} ${selectedYear}? This will revert it to draft mode.`);
                                        if (!confirm) return;
                                        setPreparedCycles(prev => {
                                            const next = { ...prev };
                                            delete next[cycleKey];
                                            localStorage.setItem("rnd_prepared_salary_cycles", JSON.stringify(next));
                                            return next;
                                        });
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
                            <div className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] px-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                <Building2 className="h-4 w-4 text-[#71717A] dark:text-[#A1A1AA]" />
                                <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Dept</span>
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
                            <div className="flex h-10 shrink-0 items-center gap-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] px-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                <Briefcase className="h-4 w-4 text-[#71717A] dark:text-[#A1A1AA]" />
                                <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Role</span>
                                <select
                                    value={desigFilter}
                                    onChange={e => setDesigFilter(e.target.value)}
                                    className="max-w-[180px] bg-transparent py-0.5 pr-7 text-[12px] font-semibold text-[#3F3F46] outline-none dark:text-[#E4E4E7]"
                                >
                                    {designationsList.map(dg => <option key={dg} value={dg} className="dark:bg-[#27272A]">{dg}</option>)}
                                </select>
                            </div>

                            {/* Clear button */}
                            {(search || deptFilter !== "All" || desigFilter !== "All") && (
                                <button
                                    onClick={() => { setSearch(""); setDeptFilter("All"); setDesigFilter("All"); }}
                                    className="h-10 shrink-0 rounded-lg border border-[#E4E4E7] bg-white px-4 text-[12px] font-bold text-[#3F3F46] transition-all hover:bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8] dark:hover:bg-[#3F3F46]"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>

                        {/* Table Container */}
                        <Card className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                            <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-[#FAFAF9] px-[22px] py-[14px] dark:border-[#3F3F46] dark:bg-[#27272A]">
                                <div className="flex items-center gap-2 text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-[#2563EB] dark:bg-blue-950/20">
                                        <IndianRupee className="h-3.5 w-3.5" />
                                    </div>
                                    Salary Register
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
                                ) : filtered.length === 0 ? (
                                    <div className="py-24 text-center">
                                        <User className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-3" />
                                        <p className="text-base font-bold text-zinc-900 dark:text-white mb-1">No approved staff found</p>
                                        <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-md mx-auto">
                                            {search || deptFilter !== "All" || desigFilter !== "All"
                                                ? "No staff matches the specified filters. Try clearing your parameters."
                                                : `No approved Project Staff Details records found for ${currentUser || "your account"} in the selected period.`}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto max-h-[640px] overflow-y-auto">
                                        <table className="min-w-[2400px] table-auto border-collapse divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
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

                                                    {/* Earnings section */}
                                                    <th colSpan={8} className="px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-center border-b border-zinc-200 dark:border-zinc-800">Earnings Details (₹)</th>

                                                    {/* Deductions section */}
                                                    <th colSpan={8} className="px-3 py-2 bg-red-50/50 dark:bg-red-950/20 text-red-800 dark:text-red-400 text-center border-b border-zinc-200 dark:border-zinc-800">Deductions Details (₹)</th>

                                                    <th rowSpan={2} className="px-4 py-4 text-right font-bold text-amber-800 dark:text-amber-400 bg-amber-50/20 dark:bg-amber-950/10 border-l border-r border-zinc-200 dark:border-zinc-800">Net Pay (₹)</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left">Comment</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-left border-r border-zinc-200 dark:border-zinc-800">Remarks</th>
                                                    <th rowSpan={2} className="px-3 py-4 text-center bg-zinc-50 dark:bg-zinc-950 shadow-sm">Slip</th>
                                                </tr>
                                                <tr className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                                    {/* Earnings sub-headers */}
                                                    <TH label="Basic" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
                                                    <TH label="HRA" align="right" className="bg-emerald-50/10 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-400" />
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
                                                            <td className="px-3 py-3 text-xs text-zinc-400 bg-white group-hover:bg-zinc-50 dark:bg-zinc-900 dark:group-hover:bg-zinc-850 border-r border-zinc-200 dark:border-zinc-800">{i + 1}</td>

                                                            {/* Emp ID */}
                                                            <td className="px-3 py-3 bg-white group-hover:bg-zinc-50 dark:bg-zinc-900 dark:group-hover:bg-zinc-850 border-r border-zinc-200 dark:border-zinc-800">
                                                                <span className="text-xs font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-0.5 rounded border border-zinc-200/50 dark:border-zinc-700/50">
                                                                    {r.employee_id}
                                                                </span>
                                                            </td>

                                                            {/* Full Name */}
                                                            <td className="px-3 py-3 bg-white group-hover:bg-zinc-50 dark:bg-zinc-900 dark:group-hover:bg-zinc-850 border-r border-zinc-200 dark:border-zinc-800">
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
                                                            <td className="px-3 py-3 text-xs text-zinc-500 dark:text-zinc-550 whitespace-nowrap font-mono">{r.term_completion_date ? fmtDate(r.term_completion_date) : "—"}</td>

                                                            {/* Earnings values */}
                                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5 border-l border-zinc-100 dark:border-zinc-800">{fmt(r.basic_salary)}</td>
                                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap bg-emerald-50/5 dark:bg-emerald-950/5">{fmt(r.hra)}</td>
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
                                                            <td className="px-2 py-1.5 bg-emerald-50/10 dark:bg-emerald-950/10 border-l border-zinc-100 dark:border-zinc-850">
                                                                <div className="relative flex items-center">
                                                                    <input
                                                                        type="number"
                                                                        value={inputs.arrear || ""}
                                                                        onChange={e => handleInputChange(r.docName, "arrear", parseFloat(e.target.value) || 0)}
                                                                        className={cn(
                                                                            "w-20 px-2 py-1 text-xs text-right bg-white dark:bg-zinc-800 border rounded focus:ring-2 focus:ring-[#D97757]/30 focus:outline-none transition-all tabular-nums",
                                                                            isEdited.arrear
                                                                                ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                                : "border-zinc-200 dark:border-zinc-700"
                                                                        )}
                                                                        placeholder="0"
                                                                        min="0"
                                                                    />
                                                                </div>
                                                            </td>

                                                            {/* Gross Pay */}
                                                            <td className="px-3 py-3 text-right font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50/10 dark:bg-emerald-950/15 tabular-nums whitespace-nowrap border-l border-r border-zinc-200/50 dark:border-zinc-800/80">
                                                                {fmt(grossPay)}
                                                            </td>

                                                            {/* Deductions */}
                                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap bg-red-50/5 dark:bg-red-950/5">{fmt(proRataHRA)}</td>

                                                            {/* Medical Deduction Input */}
                                                            <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                                                <input
                                                                    type="number"
                                                                    value={inputs.medicalDeduction || ""}
                                                                    onChange={e => handleInputChange(r.docName, "medicalDeduction", parseFloat(e.target.value) || 0)}
                                                                    className={cn(
                                                                        "w-16 px-2 py-1 text-xs text-right bg-white dark:bg-zinc-800 border rounded focus:ring-2 focus:ring-[#D97757]/30 focus:outline-none transition-all tabular-nums",
                                                                        isEdited.medicalDeduction
                                                                            ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                            : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="0"
                                                                    min="0"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-3 text-right tabular-nums whitespace-nowrap bg-red-50/5 dark:bg-red-950/5">{fmt(pTax)}</td>

                                                            {/* TA Input */}
                                                            <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                                                <input
                                                                    type="number"
                                                                    value={inputs.ta || ""}
                                                                    onChange={e => handleInputChange(r.docName, "ta", parseFloat(e.target.value) || 0)}
                                                                    className={cn(
                                                                        "w-16 px-2 py-1 text-xs text-right bg-white dark:bg-zinc-800 border rounded focus:ring-2 focus:ring-[#D97757]/30 focus:outline-none transition-all tabular-nums",
                                                                        isEdited.ta
                                                                            ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                            : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="0"
                                                                    min="0"
                                                                />
                                                            </td>

                                                            {/* ID Card Input */}
                                                            <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                                                <input
                                                                    type="number"
                                                                    value={inputs.idCardCharge || ""}
                                                                    onChange={e => handleInputChange(r.docName, "idCardCharge", parseFloat(e.target.value) || 0)}
                                                                    className={cn(
                                                                        "w-16 px-2 py-1 text-xs text-right bg-white dark:bg-zinc-800 border rounded focus:ring-2 focus:ring-[#D97757]/30 focus:outline-none transition-all tabular-nums",
                                                                        isEdited.idCardCharge
                                                                            ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                            : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="0"
                                                                    min="0"
                                                                />
                                                            </td>

                                                            {/* Electricity Input */}
                                                            <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                                                <input
                                                                    type="number"
                                                                    value={inputs.electricityBill || ""}
                                                                    onChange={e => handleInputChange(r.docName, "electricityBill", parseFloat(e.target.value) || 0)}
                                                                    className={cn(
                                                                        "w-16 px-2 py-1 text-xs text-right bg-white dark:bg-zinc-800 border rounded focus:ring-2 focus:ring-[#D97757]/30 focus:outline-none transition-all tabular-nums",
                                                                        isEdited.electricityBill
                                                                            ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                            : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="0"
                                                                    min="0"
                                                                />
                                                            </td>

                                                            {/* Other Deduction Input */}
                                                            <td className="px-2 py-1.5 bg-red-50/10 dark:bg-red-950/10">
                                                                <input
                                                                    type="number"
                                                                    value={inputs.otherDeduction || ""}
                                                                    onChange={e => handleInputChange(r.docName, "otherDeduction", parseFloat(e.target.value) || 0)}
                                                                    className={cn(
                                                                        "w-16 px-2 py-1 text-xs text-right bg-white dark:bg-zinc-800 border rounded focus:ring-2 focus:ring-[#D97757]/30 focus:outline-none transition-all tabular-nums",
                                                                        isEdited.otherDeduction
                                                                            ? "border-amber-400 dark:border-amber-600 bg-amber-50/20 dark:bg-amber-900/10 text-amber-900 dark:text-amber-200 font-bold"
                                                                            : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="0"
                                                                    min="0"
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
                                                                        "w-28 px-2 py-1 text-xs bg-white dark:bg-zinc-800 border rounded focus:ring-2 focus:ring-[#D97757]/30 focus:outline-none transition-all",
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
                                                                        "w-28 px-2 py-1 text-xs bg-white dark:bg-zinc-800 border rounded focus:ring-2 focus:ring-[#D97757]/30 focus:outline-none transition-all",
                                                                        isEdited.remarks ? "border-amber-400 bg-amber-50/10" : "border-zinc-200 dark:border-zinc-700"
                                                                    )}
                                                                    placeholder="Remarks..."
                                                                />
                                                            </td>

                                                            {/* Payslip Action Button */}
                                                            <td className="px-3 py-3 text-center bg-white group-hover:bg-zinc-50 dark:bg-zinc-900 dark:group-hover:bg-zinc-850">
                                                                <button
                                                                    onClick={() => setSelectedSlipRecord(r)}
                                                                    title="Generate Pay Slip"
                                                                    className="p-1.5 rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757] dark:hover:text-white transition-all shadow-sm active:scale-90"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>

                                            {/* FOOTER */}
                                            <tfoot className="bg-zinc-50 dark:bg-zinc-955 sticky bottom-0 z-20 border-t-2 border-zinc-200 dark:border-zinc-700 font-bold text-xs uppercase tracking-wide">
                                                <tr className="bg-zinc-50 dark:bg-zinc-950">
                                                    <td colSpan={8} className="px-3 py-4 text-sm font-serif font-bold text-zinc-900 dark:text-white bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 shadow-sm">
                                                        Total ({filtered.length} Staff Profiled)
                                                    </td>

                                                    {/* Earnings totals */}
                                                    <td className="px-3 py-4 text-right text-emerald-800 dark:text-emerald-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10 border-l border-zinc-200 dark:border-zinc-800">{fmt(totalBasic)}</td>
                                                    <td className="px-3 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalOriginalHRA)}</td>
                                                    <td className="px-3 py-4 text-center text-zinc-600 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{totalWorkingDays}</td>
                                                    <td className="px-3 py-4 text-right text-emerald-800 dark:text-emerald-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalProRataBasic)}</td>
                                                    <td className="px-3 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalHRA)}</td>
                                                    <td className="px-3 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/10">{fmt(totalMedical)}</td>
                                                    <td className="px-3 py-4 text-right text-orange-600 dark:text-orange-400 tabular-nums whitespace-nowrap bg-emerald-50/10 dark:bg-emerald-950/15">{fmt(totalArrear)}</td>
                                                    <td className="px-3 py-4 text-right text-emerald-900 dark:text-emerald-300 bg-emerald-100/40 dark:bg-emerald-900/20 font-bold tabular-nums whitespace-nowrap border-l border-r border-zinc-200 dark:border-zinc-800">{fmt(totalEarnings)}</td>

                                                    {/* Deductions totals */}
                                                    <td className="px-3 py-4 text-right text-zinc-500 dark:text-zinc-400 tabular-nums whitespace-nowrap bg-rose-50/10 dark:bg-rose-950/10">{fmt(totalHRA)}</td>
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
                            </div>

                            {/* Earnings & Deductions Double Column Table */}
                            {(() => {
                                const { inputs } = getRowInputs(selectedSlipRecord.docName);
                                const workingDays = calcWorkingDaysForPeriod(selectedSlipRecord.joining_date, selectedSlipRecord.term_completion_date, selectedYear, selectedMonth);
                                const proRataBasic = calcProRataBasic(selectedSlipRecord.basic_salary, workingDays, daysInMonth);
                                const proRataHRA = (selectedSlipRecord.hra / daysInMonth) * workingDays;
                                const proRataMedical = (selectedSlipRecord.medical_allowance / daysInMonth) * workingDays;
                                const grossPay = proRataBasic + proRataHRA + proRataMedical + inputs.arrear;
                                const pTax = calcPTax(selectedSlipRecord.basic_salary);
                                const totalDed = proRataHRA + inputs.medicalDeduction + pTax + inputs.ta + inputs.idCardCharge + inputs.electricityBill + inputs.otherDeduction;
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
                                                        <span className="font-semibold tabular-nums">{fmt(proRataHRA)}</span>
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

                                        {/* Signature Pad Details */}
                                        <div className="grid grid-cols-3 gap-4 pt-16 text-center text-xs font-bold">
                                            <div className="space-y-4">
                                                <div className="border-b border-zinc-400 max-w-[180px] mx-auto"></div>
                                                <p className="text-zinc-500">Prepared / Checked By</p>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="border-b border-zinc-400 max-w-[180px] mx-auto"></div>
                                                <p className="text-zinc-500">Principal Investigator (PI)</p>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="border-b border-zinc-400 max-w-[180px] mx-auto"></div>
                                                <p className="text-zinc-500">Associate Dean / Dean (R&D)</p>
                                            </div>
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

export default SalaryModule;
