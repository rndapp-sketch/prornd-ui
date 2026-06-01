import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { isFieldVisible } from '@/utils/evalExpression';
import { prepareFormDataForApi } from '@/services/apiService';

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

    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(
        'rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_top_up_fellowship_fields'
    );
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchProjectDetails } = useFrappePostCall<{ message: any }>('frappe.client.get');
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
    const MONTHLY_CAP = 25000;

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
            const data = res?.message?.summary?.[email];
            if (data) {
                setMonthlyStatus(prev => ({ ...prev, [key]: data }));
            }
        } catch (err) {
            console.warn('Monthly summary fetch failed:', err);
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
                            return { ...field, child_fields: child_table_fields[field.fieldname] };
                        }
                        if (field.fieldname === 'pi_webmail') {
                            return { ...field, fieldtype: 'Link' };
                        }
                        return field;
                    });
                setFields(enhancedFields);
                setLinkOptions(link_options || {});

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
                        console.error('Error fetching existing document:', err);
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

                // Start the table empty so the user explicitly adds rows
                if (!initialData.students) initialData.students = [];

                setFormData(initialData);
                if (initialData.project_title) setProjectTitle(initialData.project_title);
                setDataLoaded(true);
                setLoading(false);
            }
            if (formDataError) {
                console.error('Failed to load form data:', formDataError);
                alert('Error: Could not load the Top Up Fellowship form.');
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, editDocName, fetchExistingDoc, dataLoaded, currentUser]);

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
                    const apiTitle = projectDoc.message.project_title || projectDoc.message.title || '';
                    if (apiTitle) {
                        setProjectTitle(apiTitle);
                        setFormData(prev => ({ ...prev, project_title: apiTitle }));
                    }
                    if (projectDoc.message.pi_webmail) {
                        setFormData(prev => ({
                            ...prev,
                            coordinating_pi_webmail: prev.coordinating_pi_webmail || projectDoc.message.pi_webmail,
                        }));
                    }
                }
            } catch (err) {
                console.warn('Could not fetch project details:', err);
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

    // When a Link field in a child row changes (e.g. name_of_student), fetch details & cascade
    const handleTableLinkChange = useCallback(async (tableName: string, rowIndex: number, fieldname: string, value: string) => {
        if (tableName !== 'students' || fieldname !== 'email_of_student') return;

        if (!value) {
            setFormData(prev => {
                const table = [...(prev[tableName] || [])];
                table[rowIndex] = { ...table[rowIndex], email_of_student: '', roll_number: '', dept_centre: '' };
                return { ...prev, [tableName]: table };
            });
            return;
        }

        try {
            const res = await fetchStudentDetails({ email: value });
            const details = res?.message || {};
            let periodFrom = '';
            setFormData(prev => {
                const table = [...(prev[tableName] || [])];
                periodFrom = table[rowIndex]?.period_from || '';
                table[rowIndex] = {
                    ...table[rowIndex],
                    email_of_student: value,
                    roll_number: details.roll_number || table[rowIndex]?.roll_number || '',
                    dept_centre: details.dept_centre || table[rowIndex]?.dept_centre || '',
                };
                return { ...prev, [tableName]: table };
            });
            // Fetch monthly status for this newly-selected student
            refreshMonthlyStatus(value, periodFrom);
        } catch (err) {
            console.warn('Could not fetch student details:', err);
        }
    }, [fetchStudentDetails, refreshMonthlyStatus]);

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

        // Enforce ₹25,000 monthly cap per student
        const capViolations: string[] = [];
        for (const row of formData.students) {
            const email = row?.email_of_student;
            if (!email) continue;
            const key = monthKeyFor(email, row?.period_from);
            const status = key ? monthlyStatus[key] : undefined;
            const proposed = Number(row?.total_amount_per_month) || 0;
            const existing = status?.total ?? 0;
            if (existing + proposed > MONTHLY_CAP) {
                const over = existing + proposed - MONTHLY_CAP;
                capViolations.push(
                    `${email}: already ₹${existing.toLocaleString('en-IN')} this month, requesting ₹${proposed.toLocaleString('en-IN')} more — exceeds the ₹${MONTHLY_CAP.toLocaleString('en-IN')} cap by ₹${over.toLocaleString('en-IN')}.`
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
            console.error(saveError || err);
            alert(`Save failed: ${err.message || 'Unknown error'}`);
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
            console.error(submitError || err);
            alert(`Submission failed: ${err.message || 'Please check the console for details.'}`);
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
                                        Monthly Limit Status (₹{MONTHLY_CAP.toLocaleString('en-IN')} cap per student)
                                    </h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-[12px]">
                                        <thead>
                                            <tr className="text-left text-[10px] font-bold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                                <th className="py-2 pr-3">Student</th>
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
                                                            <td colSpan={6} />
                                                        </tr>
                                                    );
                                                }
                                                const key = monthKeyFor(email, row?.period_from);
                                                const status = key ? monthlyStatus[key] : undefined;
                                                const proposed = Number(row?.total_amount_per_month) || 0;
                                                const existing = status?.total ?? 0;
                                                const remaining = Math.max(0, MONTHLY_CAP - existing);
                                                const after = existing + proposed;
                                                const over = after - MONTHLY_CAP;
                                                const ok = after <= MONTHLY_CAP;
                                                const fmt = (n: number) => `₹${n.toLocaleString('en-IN')}`;
                                                return (
                                                    <tr key={idx} className="border-b border-dashed border-[#E4E4E7]/60 dark:border-[#3F3F46]/60 last:border-0">
                                                        <td className="py-2 pr-3 font-medium text-[#27272A] dark:text-[#F4F4F5]">{email}</td>
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
                                    Counts only <strong>Submitted</strong> Honorarium &amp; Top Up Fellowship rows whose period overlaps the month derived from each row's <em>Period From</em> (defaults to today if unset). Drafts are not included.
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
        </div>
    );
};

export default TopUpFellowshipForm;
