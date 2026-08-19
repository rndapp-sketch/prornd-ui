import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { isFieldVisible } from '@/utils/evalExpression';
import { prepareFormDataForApi } from '@/services/apiService';
import {
    HelpCircle, X, BookOpen, IndianRupee, Clock, CheckCircle2,
} from 'lucide-react';
import { ErrorModal } from "../../components/ErrorModal";
import { parseFrappeError } from "../../utils/errorUtils";

// --- HELP PANEL ---
const HelpPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-50 flex justify-end">
        <button
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close help"
        />
        <aside className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white dark:bg-[#27272A] shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-5 py-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D97757]/10 text-[#D97757]">
                        <HelpCircle className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#D97757]">Guide</p>
                        <h2 className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                            Top Up Fellowship
                        </h2>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 px-5 py-5 space-y-5">

                {/* What is it */}
                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-3.5 h-3.5 text-[#4A6CF7]" />
                        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">What is this?</h3>
                    </div>
                    <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                        A <strong className="text-[#3F3F46] dark:text-[#E4E4E7]">Top Up Fellowship</strong> application is used to request
                        an additional monthly payment for students working on a project, on top of any existing honorarium,
                        stipend, or scholarship they receive.
                    </p>
                </section>

                {/* Key Fields */}
                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Key Fields</h3>
                    </div>
                    <div className="space-y-2">
                        {[
                            { field: "Project Code", desc: "The project funding the top-up. Auto-fills the project title." },
                            { field: "Student (Email)", desc: "Pick the student — roll number, department, and name auto-fill." },
                            { field: "Stipend / Scholarship", desc: "Mark 'Yes' if the student already receives one — this lowers their monthly cap." },
                            { field: "Period From", desc: "The month the top-up applies to — used to check the monthly cap." },
                            { field: "Hours per Month / Rate per Hour", desc: "Used to auto-calculate the total amount per month." },
                        ].map(({ field, desc }) => (
                            <div key={field} className="flex gap-2.5">
                                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#D97757] mt-[7px]" />
                                <p className="text-[12.5px] text-[#52525B] dark:text-[#A1A1AA] leading-snug">
                                    <strong className="text-[#3F3F46] dark:text-[#E4E4E7]">{field}</strong> — {desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Monthly Cap */}
                <section className="space-y-2.5">
                    <div className="flex items-center gap-2 mb-2">
                        <IndianRupee className="w-3.5 h-3.5 text-[#D97757]" />
                        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Monthly Cap Rules</h3>
                    </div>
                    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                        <p className="text-[12.5px] text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                            Each student's <strong className="text-[#3F3F46] dark:text-[#E4E4E7]">Honorarium + Top Up</strong> total
                            for a given month cannot exceed the backend-set cap. Students already on a stipend or scholarship
                            have a lower cap. The "Monthly Limit Status" table on the form shows how much each student has
                            already received and how much is remaining before you save.
                        </p>
                    </div>
                </section>

                {/* Workflow */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Approval Workflow</h3>
                    </div>
                    <div className="space-y-0">
                        {[
                            { stage: "Draft", desc: "You create and save the application.", color: "bg-zinc-400" },
                            { stage: "Pending Approval", desc: "Forwarded to the approving authority for review.", color: "bg-amber-400" },
                            { stage: "Approved", desc: "Top-up amount is sanctioned for the students listed.", color: "bg-emerald-500" },
                        ].map(({ stage, desc, color }, i, arr) => (
                            <div key={stage} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <span className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1", color)} />
                                    {i < arr.length - 1 && <span className="w-px flex-1 bg-zinc-200 dark:bg-zinc-700 my-1" />}
                                </div>
                                <div className="pb-3">
                                    <p className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{stage}</p>
                                    <p className="text-[11.5px] text-[#71717A] dark:text-[#A1A1AA]">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* How to apply */}
                <section className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-[12px] font-extrabold text-emerald-700 dark:text-emerald-400">How to apply</p>
                    </div>
                    <ol className="space-y-1 list-decimal list-inside text-[12.5px] text-emerald-800 dark:text-emerald-300">
                        <li>Fill in the project and general details.</li>
                        <li>Add each student row and select their email — details auto-fill.</li>
                        <li>Enter Period From, hours, and rate — check the Monthly Limit Status table stays within cap.</li>
                        <li>Tick all declaration checkboxes.</li>
                        <li>Click <strong>Save Draft</strong> to save, then <strong>Submit Application</strong> to send for approval.</li>
                    </ol>
                </section>
            </div>
        </aside>
    </div>
);

interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_fields?: Record<string, any[]>;
    };
}

const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-zinc-900 p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit";
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#D97757]/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
        )}
    >
        {children}
    </button>
);

const TopUpFellowshipForm: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editDocName = searchParams.get('edit');
    const projectFromUrl = searchParams.get('project');
    const projectTitleFromUrl = searchParams.get('projectTitle');
    const { currentUser } = useFrappeAuth();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [projectTitle, setProjectTitle] = useState<string>(projectTitleFromUrl || '');
    const [helpOpen, setHelpOpen] = useState(false);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });

    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_top_up_fellowship_fields'
    );
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchProjectDetails } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchDepartments } = useFrappePostCall<{ message: any[] }>('frappe.client.get_list');
    const { call: saveForm, error: saveError } = useFrappePostCall(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.save_top_up_fellowship_data'
    );
    const { call: submitForm, error: submitError } = useFrappePostCall(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.submit_top_up_fellowship'
    );
    const { call: fetchStudentDetails } = useFrappePostCall<{ message: any }>(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_student_details'
    );
    const { call: fetchMonthlySummary } = useFrappePostCall<{ message: any }>(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_students_monthly_summary'
    );

    // Per-student monthly status, keyed by `${email}|${YYYY-MM}`
    type MonthlyStatus = { honorarium: number; top_up: number; total: number; remaining: number };
    const [monthlyStatus, setMonthlyStatus] = useState<Record<string, MonthlyStatus>>({});
    // Backend-driven cap (rndopsapp...get_students_monthly_summary returns { cap, summary }) —
    // seeded with the last-known value and kept in sync with whatever the server reports.
    // This is the cap for students with no stipend/scholarship; students who are already
    // on a stipend or scholarship are capped lower regardless of what the server reports.
    const [monthlyCap, setMonthlyCap] = useState<number>(50000);
    const STIPEND_OR_SCHOLARSHIP_CAP = 25000;
    // stipend_or_scholarship is a doctype Select field with options "\nYes\nNo" — not a boolean.
    const isOnStipendOrScholarship = (row: any) => String(row?.stipend_or_scholarship || '').trim().toLowerCase() === 'yes';
    const capForRow = useCallback(
        (row: any) => (isOnStipendOrScholarship(row) ? STIPEND_OR_SCHOLARSHIP_CAP : monthlyCap),
        [monthlyCap],
    );

    const refreshMonthlyStatus = useCallback(async (email: string, periodFrom: string | null | undefined) => {
        if (!email) return;
        // Derive month/year. Prefer the row's period_from; fall back to today.
        const ref = periodFrom ? new Date(periodFrom) : new Date();
        if (isNaN(ref.getTime())) return;
        const month = ref.getMonth() + 1;
        const year = ref.getFullYear();
        const key = `${email}|${year}-${String(month).padStart(2, '0')}`;
        try {
            const res = await fetchMonthlySummary({
                emails: JSON.stringify([email]),
                month,
                year,
                exclude_docname: editDocName || savedDocName || '',
            });
            if (typeof res?.message?.cap === 'number') {
                setMonthlyCap(res.message.cap);
            }
            const data = res?.message?.summary?.[email];
            if (data) {
                setMonthlyStatus(prev => ({ ...prev, [key]: data }));
            }
        } catch (err) {
        }
    }, [fetchMonthlySummary, editDocName, savedDocName]);

    // After data loads, hydrate monthly status for any students already in the table
    useEffect(() => {
        if (!dataLoaded) return;
        const rows = Array.isArray(formData.students) ? formData.students : [];
        rows.forEach((row: any) => {
            if (row?.email_of_student) {
                refreshMonthlyStatus(row.email_of_student, row.period_from);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataLoaded]);

    const monthKeyFor = useCallback((email: string, periodFrom: string | null | undefined) => {
        const ref = periodFrom ? new Date(periodFrom) : new Date();
        if (isNaN(ref.getTime())) return null;
        return `${email}|${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`;
    }, []);

    useEffect(() => {
        if (!dataLoaded) {
            fetchFormData({ doc_name: projectFromUrl || '' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const loadFormAndDocument = async () => {
            if (formDataResult?.message && !dataLoaded) {
                const { fields: apiFields, prefill_data, link_options, child_table_fields } = formDataResult.message;

                // Merge child_fields into Table fields. Also upgrade pi_webmail
                // from Data → Link so DynamicFormRenderer renders the searchable
                // autocomplete dropdown of Permanent Employees.
                const enhancedFields = (apiFields || [])
                    .filter((f: FormField) => f.fieldname !== 'amended_from')
                    .map((field: FormField) => {
                        if (field.fieldtype === 'Table' && child_table_fields?.[field.fieldname]) {
                            const childFields = child_table_fields[field.fieldname].map((cf: any) =>
                                cf.fieldname === 'dept_centre' ? { ...cf, read_only: 0 } : cf
                            );
                            return { ...field, child_fields: childFields };
                        }
                        if (field.fieldname === 'pi_webmail') {
                            return { ...field, fieldtype: 'Link' };
                        }
                        return field;
                    });
                setFields(enhancedFields);

                // Fetch Department_prornd list and inject as linkOptions for dept_centre
                const mergedLinkOptions = { ...(link_options || {}) };
                try {
                    const deptRes = await fetchDepartments({
                        doctype: 'Department_prornd',
                        fields: JSON.stringify(['name', 'dept_name']),
                        limit_page_length: 0,
                    });
                    if (Array.isArray(deptRes?.message)) {
                        mergedLinkOptions['dept_centre'] = deptRes.message.map((d: any) => ({
                            value: d.name,
                            label: d.dept_name || d.name,
                        }));
                    }
                } catch (err) {
                }
                setLinkOptions(mergedLinkOptions);

                let initialData: Record<string, any> = { ...prefill_data };

                if (editDocName) {
                    try {
                        const existingDoc = await fetchExistingDoc({
                            doctype: 'Top Up Fellowship',
                            name: editDocName,
                        });
                        if (existingDoc?.message) {
                            initialData = { ...initialData, ...existingDoc.message };
                        }
                    } catch (err) {
                        alert('Failed to load document for editing');
                    }
                }

                // Apply defaults
                enhancedFields.forEach((field: FormField) => {
                    if (initialData[field.fieldname] === undefined && field.default !== undefined) {
                        initialData[field.fieldname] = field.default;
                    }
                });

                // Note: pi_webmail (Supervisor / Faculty Adviser) is intentionally
                // left blank — user picks from the Permanent Employee dropdown.

                // Pre-fill project_code with project_no from Project Registration when
                // opened from a project context (e.g. ?project=<frappe-doc-id>).
                // Always overrides whatever the backend prefill returned for project_code.
                if (projectFromUrl && !editDocName) {
                    try {
                        const projectDoc = await fetchProjectDetails({
                            doctype: 'Project Registration',
                            name: projectFromUrl,
                        });
                        if (projectDoc?.message) {
                            const doc = projectDoc.message;
                            const projectNo = doc.project_no || doc.name || projectFromUrl;
                            initialData.project_no = projectNo;
                            initialData.project_number = projectNo;
                            const title = doc.project_title || doc.title || '';
                            if (title) {
                                initialData.project_title = title;
                                setProjectTitle(title);
                            }
                            if (doc.pi_webmail) {
                                initialData.coordinating_pi_webmail = initialData.coordinating_pi_webmail || doc.pi_webmail;
                            }
                        }
                    } catch (err) {
                    }
                }

                // Start the table empty so the user explicitly adds rows
                if (!initialData.students) initialData.students = [];

                setFormData(initialData);
                if (initialData.project_title) setProjectTitle(initialData.project_title);
                setDataLoaded(true);
                setLoading(false);
            }
            if (formDataError) {
                alert('Error: Could not load the Top Up Fellowship form.');
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, editDocName, fetchExistingDoc, fetchDepartments, dataLoaded, currentUser]);

    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

    // Parent-level field side effects (project_code -> auto-fill project_title)
    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        handleChange(fieldname, value);

        if (fieldname === 'project_code') {
            if (!value) {
                setProjectTitle('');
                setFormData(prev => ({ ...prev, project_title: '' }));
                return;
            }
            // Look up title in linkOptions immediately
            const option = linkOptions['project_code']?.find(opt => opt.value === value);
            if (option?.label) {
                setProjectTitle(option.label);
                setFormData(prev => ({ ...prev, project_title: option.label }));
            }
            try {
                const projectDoc = await fetchProjectDetails({
                    doctype: 'Project Registration',
                    name: value,
                });
                if (projectDoc?.message) {
                    const doc = projectDoc.message;
                    const apiTitle = doc.project_title || doc.title || '';
                    if (apiTitle) {
                        setProjectTitle(apiTitle);
                        setFormData(prev => ({ ...prev, project_title: apiTitle }));
                    }
                    // Store project_no for ledger API use on the details page
                    const projectNo = doc.project_no || doc.name || value;
                    setFormData(prev => ({ ...prev, project_no: projectNo, project_number: projectNo }));
                    if (doc.pi_webmail) {
                        setFormData(prev => ({
                            ...prev,
                            coordinating_pi_webmail: prev.coordinating_pi_webmail || doc.pi_webmail,
                        }));
                    }
                }
            } catch (err) {
            }
        }
    }, [handleChange, fetchProjectDetails, linkOptions]);

    // Child-table row handlers
    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            const updatedRow = { ...table[rowIndex], [fieldname]: value };
            // Auto-compute per-row total = hours * rate when either changes
            if (tableName === 'students' && (fieldname === 'hours_per_month' || fieldname === 'rate_per_hour')) {
                const hours = Number(fieldname === 'hours_per_month' ? value : updatedRow.hours_per_month) || 0;
                const rate = Number(fieldname === 'rate_per_hour' ? value : updatedRow.rate_per_hour) || 0;
                updatedRow.total_amount_per_month = hours * rate;
            }
            table[rowIndex] = updatedRow;
            // When period_from changes, refresh monthly status for this student
            if (tableName === 'students' && fieldname === 'period_from' && updatedRow.email_of_student) {
                refreshMonthlyStatus(updatedRow.email_of_student, value);
            }
            return { ...prev, [tableName]: table };
        });
    }, [refreshMonthlyStatus]);

    const handleTableFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
            return { ...prev, [tableName]: table };
        });
    }, []);

    const addTableRow = useCallback((tableName: string, newRow: Record<string, any>) => {
        setFormData(prev => ({
            ...prev,
            [tableName]: [...(prev[tableName] || []), newRow],
        }));
    }, []);

    const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
        setFormData(prev => ({
            ...prev,
            [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex),
        }));
    }, []);

    // When email_of_student changes, fetch & cascade student details.
    // NOTE: the backend's get_student_details does NOT read from the "User" doctype —
    // it looks up "Academic Student Info" by email_id and returns roll_no/d_name/sname,
    // mapped here to roll_number/dept_centre/name_of_the_student. The doctype JSON's
    // fetch_from annotations (email_of_student.employee_id etc.) are not honoured by
    // this custom RPC or by _serialize_field (which doesn't export fetch_from at all),
    // so this manual cascade is the only thing populating these fields.
    const handleTableLinkChange = useCallback(async (tableName: string, rowIndex: number, fieldname: string, value: string) => {
        if (tableName !== 'students' || fieldname !== 'email_of_student') {
            handleTableRowChange(tableName, rowIndex, fieldname, value);
            return;
        }

        if (!value) {
            setFormData(prev => {
                const table = [...(prev[tableName] || [])];
                table[rowIndex] = {
                    ...table[rowIndex],
                    email_of_student: '',
                    roll_number: '',
                    dept_centre: '',
                    name_of_the_student: '',
                };
                return { ...prev, [tableName]: table };
            });
            return;
        }

        try {
            const res = await fetchStudentDetails({ email: value });
            const details = res?.message || {};

            // dept_centre is a Link to Department_prornd (value = doc name, label = dept_name),
            // but get_student_details returns Academic Student Info's free-text department name —
            // resolve it to the matching option's value so the <select> actually shows it selected.
            const deptRaw = String(details.dept_centre || '').trim();
            const deptOptions = linkOptions.dept_centre || [];
            const matchedDept = deptOptions.find(
                (o: any) => o.value === deptRaw || (o.label || '').trim().toLowerCase() === deptRaw.toLowerCase()
            );
            const resolvedDept = matchedDept ? matchedDept.value : deptRaw;

            let periodFrom = '';
            setFormData(prev => {
                const table = [...(prev[tableName] || [])];
                periodFrom = table[rowIndex]?.period_from || '';
                table[rowIndex] = {
                    ...table[rowIndex],
                    email_of_student: value,
                    roll_number: details.roll_number || table[rowIndex]?.roll_number || '',
                    dept_centre: resolvedDept || table[rowIndex]?.dept_centre || '',
                    name_of_the_student: details.full_name || table[rowIndex]?.name_of_the_student || '',
                };
                return { ...prev, [tableName]: table };
            });
            // Fetch monthly status for this newly-selected student
            refreshMonthlyStatus(value, periodFrom);
        } catch (err) {
        }
    }, [fetchStudentDetails, refreshMonthlyStatus, linkOptions.dept_centre, handleTableRowChange]);

    const effectiveDocName = editDocName || savedDocName;

    const handleSave = async () => {
        if (isSubmitting) return;

        const uncheckedFields = fields.filter(f =>
            f.fieldtype === 'Check' &&
            isFieldVisible(f, formData) &&
            !(formData[f.fieldname] === 1 || formData[f.fieldname] === '1' || formData[f.fieldname] === true)
        );
        if (uncheckedFields.length > 0) {
            const names = uncheckedFields.map(f => f.label || f.fieldname).join(', ');
            alert(`Please tick all declaration checkboxes before saving: ${names}`);
            return;
        }

        if (!Array.isArray(formData.students) || formData.students.length === 0) {
            alert('Please add at least one student before saving.');
            return;
        }

        // Enforce the per-student monthly cap — lower for students already on a
        // stipend/scholarship, otherwise the backend-reported default cap.
        const capViolations: string[] = [];
        for (const row of formData.students) {
            const email = row?.email_of_student;
            if (!email) continue;
            const key = monthKeyFor(email, row?.period_from);
            const status = key ? monthlyStatus[key] : undefined;
            const proposed = Number(row?.total_amount_per_month) || 0;
            const existing = status?.total ?? 0;
            const cap = capForRow(row);
            if (existing + proposed > cap) {
                const over = existing + proposed - cap;
                capViolations.push(
                    `${email}: already ₹${existing.toLocaleString('en-IN')} this month, requesting ₹${proposed.toLocaleString('en-IN')} more — exceeds the ₹${cap.toLocaleString('en-IN')} cap${isOnStipendOrScholarship(row) ? ' (stipend/scholarship)' : ''} by ₹${over.toLocaleString('en-IN')}.`
                );
            }
        }
        if (capViolations.length > 0) {
            alert(`Monthly limit exceeded for:\n\n${capViolations.join('\n')}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);
            if (effectiveDocName) data.name = effectiveDocName;

            const res = await saveForm({ data: JSON.stringify(data) });
            if (res?.message?.status === 'success') {
                setIsSaved(true);
                const newDocName = res.message.docname || effectiveDocName;
                if (newDocName) setSavedDocName(newDocName);
                alert(effectiveDocName ? 'Top Up Fellowship updated successfully!' : 'Draft saved successfully!');
            } else {
                throw new Error(res?.message?.message || 'Save failed');
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(saveError, err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);
            if (effectiveDocName) data.name = effectiveDocName;

            const saveRes = await saveForm({ data: JSON.stringify(data) });
            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || 'Save failed during submission');
            }

            const docname = saveRes.message.docname || effectiveDocName;
            if (docname) setSavedDocName(docname);

            const submitRes = await submitForm({ docname });
            if (submitRes?.message?.status === 'success') {
                alert('Top Up Fellowship submitted successfully!');
                navigate(-1);
            } else {
                throw new Error(submitRes?.message?.message || 'Submission failed');
            }
        } catch (err: any) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(submitError, err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">Loading form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={editDocName ? 'Edit Top Up Fellowship' : 'Top Up Fellowship Application'}
                    projectName={projectTitle || formData.project_code || ''}
                    projectNumber={formData.project_code || ''}
                    status={editDocName ? 'Editing' : 'New'}
                    showBack={true}
                />

                <form onSubmit={handleSubmit}>
                    <FrappeCard className="space-y-12">
                        {Array.isArray(formData.students) && formData.students.length > 0 && (
                            <div className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]/40 p-4 md:p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-3 w-1 rounded-full bg-[#4A6CF7]" />
                                    <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-[#93C5FD]">
                                        Monthly Limit Status (₹{monthlyCap.toLocaleString('en-IN')} cap per student, ₹{STIPEND_OR_SCHOLARSHIP_CAP.toLocaleString('en-IN')} if on stipend/scholarship)
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[12px]">
                                        <thead>
                                            <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                                <th className="py-2 pr-3">Student</th>
                                                <th className="py-2 pr-3">Stipend / Scholarship?</th>
                                                <th className="py-2 pr-3">Honorarium this month</th>
                                                <th className="py-2 pr-3">Top Up this month</th>
                                                <th className="py-2 pr-3">Already Received</th>
                                                <th className="py-2 pr-3">Requesting now</th>
                                                <th className="py-2 pr-3">Max Allowed Now</th>
                                                <th className="py-2">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.students.map((row: any, idx: number) => {
                                                const email = row?.email_of_student;
                                                if (!email) {
                                                    return (
                                                        <tr key={idx} className="border-b border-dashed border-[#E4E4E7]/60 dark:border-[#3F3F46]/60">
                                                            <td className="py-2 pr-3 italic text-[#A1A1AA]">Row #{idx + 1} — pick a student</td>
                                                            <td colSpan={7} />
                                                        </tr>
                                                    );
                                                }
                                                const key = monthKeyFor(email, row?.period_from);
                                                const status = key ? monthlyStatus[key] : undefined;
                                                const proposed = Number(row?.total_amount_per_month) || 0;
                                                const existing = status?.total ?? 0;
                                                const cap = capForRow(row);
                                                const remaining = Math.max(0, cap - existing);
                                                const after = existing + proposed;
                                                const over = after - cap;
                                                const ok = after <= cap;
                                                const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
                                                return (
                                                    <tr key={idx} className="border-b border-dashed border-[#E4E4E7]/60 dark:border-[#3F3F46]/60 last:border-0">
                                                        <td className="py-2 pr-3 font-medium text-[#27272A] dark:text-[#F4F4F5]">{email}</td>
                                                        <td className="py-2 pr-3">
                                                            <span className={cn(
                                                                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                                                                isOnStipendOrScholarship(row)
                                                                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/50'
                                                                    : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-700',
                                                            )}>
                                                                {row?.stipend_or_scholarship || 'No'}
                                                            </span>
                                                        </td>
                                                        <td className="py-2 pr-3">{status ? fmt(status.honorarium) : '—'}</td>
                                                        <td className="py-2 pr-3">{status ? fmt(status.top_up) : '—'}</td>
                                                        <td className="py-2 pr-3 font-semibold">{status ? fmt(existing) : '—'}</td>
                                                        <td className="py-2 pr-3">{fmt(proposed)}</td>
                                                        <td className="py-2 pr-3 font-bold text-[#4A6CF7]">{status ? fmt(remaining) : '—'}</td>
                                                        <td className="py-2">
                                                            {status === undefined ? (
                                                                <span className="text-[#A1A1AA]">loading…</span>
                                                            ) : ok ? (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/50">
                                                                    Within cap
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:bg-red-900/30 dark:text-red-300 dark:ring-red-800/50">
                                                                    Over by {fmt(over)}
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="mt-3 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                    Counts only <strong>Submitted</strong> Honorarium &amp; Top Up Fellowship rows whose period overlaps the month derived from each row's <em>Period From</em> (defaults to today if unset). Drafts are not included. Mark <strong>Stipend / Scholarship</strong> for students already receiving one — their monthly cap drops to ₹{STIPEND_OR_SCHOLARSHIP_CAP.toLocaleString('en-IN')}.
                                </p>
                            </div>
                        )}
                        <DynamicFormRenderer
                            fields={fields}
                            formData={formData}
                            linkOptions={linkOptions}
                            onChange={handleChange}
                            onFileChange={handleFileChange}
                            onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
                            onTableRowChange={handleTableRowChange}
                            onTableFileChange={handleTableFileChange}
                            onAddTableRow={addTableRow}
                            onDeleteTableRow={deleteTableRow}
                            onTableLinkChange={handleTableLinkChange}
                            autocompleteFields={['pi_webmail']}
                            readOnly={formData.docstatus === 1}
                        />
                    </FrappeCard>

                    {(!editDocName || formData.docstatus === 0) && (
                        <div className="mt-8 flex justify-end gap-4">
                            <FrappeButton
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Draft'}
                            </FrappeButton>
                            <FrappeButton
                                type="submit"
                                disabled={isSubmitting || !isSaved}
                                className="bg-[#D97757] text-white hover:bg-[#D97757]"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            </FrappeButton>
                        </div>
                    )}
                </form>
            </main>

            {/* Floating help button */}
            <button
                onClick={() => setHelpOpen(true)}
                className="fixed bottom-8 right-7 z-40 flex h-11 items-center gap-2 rounded-full border border-[#4A6CF7]/30 bg-white/95 px-3.5 text-[#1E3A8A] shadow-lg shadow-[#18181B]/10 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#4A6CF7]/50 hover:bg-[#EEF2FF] dark:border-[#4A6CF7]/35 dark:bg-[#27272A]/95 dark:text-[#C7D2FE]"
                aria-label="Help"
                title="How to fill Top Up Fellowship?"
            >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4A6CF7] text-white shadow-sm">
                    <HelpCircle className="h-4 w-4" />
                </span>
                <span className="hidden text-[12px] font-extrabold uppercase tracking-wide md:block">
                    Module Guide
                </span>
            </button>

            {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}

            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default TopUpFellowshipForm;
