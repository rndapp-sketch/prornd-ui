import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { Save, Send, UserIcon, IndianRupeeIcon, TableIcon, FileTextIcon } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { loanRequestAPI, prepareFormDataForApi } from '@/services/apiService';
import { GlobalLoader } from '@/components/ui/global-loader';
import { DepartmentName } from '@/components/DepartmentName';

// --- FIELD GROUP DEFINITIONS ---
const GROUP_A_FIELDS = new Set([
    'section_break_aadt', 'self_other', 'applying_for_section',
    'loan_for_webmail_id', 'loan_for_name', 'loan_for_department', 'loan_for_designation',
    'applicant_details_section', 'applicant_webmail', 'applicant_department', 'applicant_designation',
    'project_details_section', 'project_name', 'project_number',
]);
const GROUP_B_FIELDS = new Set([
    'loan_details_section', 'loan_account_type',
    'section_break_hzoo', 'section_break_voiw', 'loan_amount',
]);
const GROUP_C_FIELDS = new Set(['account_head_fund_breakup']);
const GROUP_D_FIELDS = new Set([
    'loan_agreements_section', 'agreement_no_1', 'agreement_no_2', 'project_copi',
    'section_break_fqlm', 'witness_attachment',
]);

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_fields?: Record<string, any[]>;
    };
}

// --- UI COMPONENTS ---
const GroupCard = ({
    icon: Icon,
    label,
    badge,
    children,
    className,
}: {
    icon: React.ElementType;
    label: string;
    badge: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn(
        "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden",
        className,
    )}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[#D97757]/10 text-[#D97757] font-bold text-xs">
                {badge}
            </span>
            <Icon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                {label}
            </h3>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const FrappeButton = ({
    children, onClick, disabled, className, type = 'button',
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: 'button' | 'submit';
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#D97757]/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            className,
        )}
    >
        {children}
    </button>
);

// Read-only field display used in Group A applicant info
const InfoRow = ({ label, value, isDept }: { label: string; value: string; isDept?: boolean }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 min-h-[1.5rem]">
            {isDept && value ? <DepartmentName name={value} /> : (value || <span className="text-zinc-400">—</span>)}
        </p>
    </div>
);

// --- MAIN COMPONENT ---
const LoanRequestForm: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editDocName = searchParams.get('edit') || null;
    const projectParam = searchParams.get('project') || '';
    const projectTitleParam = searchParams.get('projectTitle') || '';

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(editDocName);
    const [dataLoaded, setDataLoaded] = useState(false);

    const { currentUser } = useFrappeAuth();

    const { call: fetchFormData, result: formDataResult, error: formDataError } =
        useFrappePostCall<FormDataResponse>(loanRequestAPI.getFields);
    const { call: fetchDocument } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: saveForm } = useFrappePostCall<{ message: any }>(loanRequestAPI.save);
    const { call: submitDocument } = useFrappePostCall<{ message: any }>(loanRequestAPI.submit);

    useEffect(() => {
        if (!dataLoaded) fetchFormData({});
    }, []);

    useEffect(() => {
        const load = async () => {
            if (dataLoaded) return;
            if (formDataResult?.message) {
                const { fields: apiFields, link_options, prefill_data, child_table_fields } = formDataResult.message;

                const enhancedFields = (apiFields || []).map((field: FormField) => {
                    if (field.fieldtype === 'Table' && child_table_fields?.[field.fieldname]) {
                        return { ...field, child_fields: child_table_fields[field.fieldname] };
                    }
                    return field;
                });

                if (editDocName) {
                    setFields(enhancedFields);
                    setLinkOptions(link_options || {});
                    try {
                        const doc = await fetchDocument({ doctype: 'Loan Request', name: editDocName });
                        if (doc?.message) setFormData(doc.message);
                    } catch {
                        setFormData(prefill_data || {});
                    }
                    setDataLoaded(true);
                    setLoading(false);
                } else {
                    if (!currentUser) return;
                    setFields(enhancedFields);
                    setLinkOptions(link_options || {});

                    const prefill: Record<string, any> = { ...(prefill_data || {}) };
                    prefill.self_other = 'Self';
                    if (projectParam) {
                        prefill.project_number = projectParam;
                        // Resolve project_name (doc name) from link_options using project_no
                        const projectOptions = (link_options || {})['project_name'] || [];
                        const match = projectOptions.find(
                            (p: any) => p.project_no === projectParam || p.value === projectParam
                        );
                        if (match) {
                            prefill.project_name = match.value;
                        }
                    }
                    if (!prefill.applicant_webmail || prefill.applicant_webmail === '-') {
                        prefill.applicant_webmail = currentUser;
                    }
                    try {
                        const userDoc = await fetchDocument({ doctype: 'User', name: currentUser });
                        if (userDoc?.message) {
                            prefill.applicant_department = prefill.applicant_department || userDoc.message.department_name || '';
                            prefill.applicant_designation = prefill.applicant_designation || userDoc.message.designation_name || '';
                        }
                    } catch { /* ignore */ }

                    setFormData(prefill);
                    setDataLoaded(true);
                    setLoading(false);
                }
            }
            if (formDataError) {
                console.error('Failed to load Loan Request form:', formDataError);
                setLoading(false);
            }
        };
        load();
    }, [formDataResult, formDataError, currentUser, dataLoaded]);

    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

    const recalcLoanAmount = (rows: any[]) =>
        rows.reduce((sum: number, r: any) => sum + (parseFloat(r.account_head_amount) || 0), 0);

    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const tableData = Array.isArray(prev[tableName]) ? [...prev[tableName]] : [];
            tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: value };
            const updates: Record<string, any> = { [tableName]: tableData };
            if (tableName === 'account_head_fund_breakup') {
                updates.loan_amount = recalcLoanAmount(tableData);
            }
            return { ...prev, ...updates };
        });
    }, []);

    const handleAddTableRow = useCallback((tableName: string, newRow: Record<string, any>) => {
        setFormData(prev => {
            const newRows = [...(Array.isArray(prev[tableName]) ? prev[tableName] : []), newRow];
            const updates: Record<string, any> = { [tableName]: newRows };
            if (tableName === 'account_head_fund_breakup') {
                updates.loan_amount = recalcLoanAmount(newRows);
            }
            return { ...prev, ...updates };
        });
    }, []);

    const handleDeleteTableRow = useCallback((tableName: string, rowIndex: number) => {
        setFormData(prev => {
            const tableData = Array.isArray(prev[tableName]) ? [...prev[tableName]] : [];
            tableData.splice(rowIndex, 1);
            const updates: Record<string, any> = { [tableName]: tableData };
            if (tableName === 'account_head_fund_breakup') {
                updates.loan_amount = recalcLoanAmount(tableData);
            }
            return { ...prev, ...updates };
        });
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const data = await prepareFormDataForApi(formData);
            if (savedDocName) data.name = savedDocName;
            const res = await saveForm({ doc_data: JSON.stringify(data) });
            if (res?.message?.status === 'success') {
                const docname = res.message.docname || savedDocName;
                if (docname && !savedDocName) setSavedDocName(docname);
                alert('Draft saved successfully!');
            } else {
                throw new Error(res?.message?.message || 'Save failed');
            }
        } catch (err: any) {
            alert(`Save failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.agreement_no_1 || !formData.agreement_no_2) {
            alert('Both Loan Agreement checkboxes must be checked before submitting.');
            return;
        }
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);
            if (savedDocName) data.name = savedDocName;
            const saveRes = await saveForm({ doc_data: JSON.stringify(data) });
            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || 'Save failed');
            }
            const docname = saveRes.message.docname || savedDocName;
            if (docname && !savedDocName) setSavedDocName(docname);
            const submitRes = await submitDocument({ docname });
            if (submitRes?.message?.status === 'success') {
                alert('Loan Request submitted successfully!');
                navigate(`/loan-request/${docname}`);
            } else {
                throw new Error(submitRes?.message?.message || 'Submission failed');
            }
        } catch (err: any) {
            alert(`Submission failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Split fields into groups
    const READ_ONLY_A = new Set(['self_other', 'project_name', 'project_number']);
    const groupA = useMemo(() =>
        fields.filter(f => GROUP_A_FIELDS.has(f.fieldname))
              .map(f => READ_ONLY_A.has(f.fieldname) ? { ...f, read_only: 1 } : f),
    [fields]);
    const groupB = useMemo(() => {
        const base = fields.filter(f => GROUP_B_FIELDS.has(f.fieldname));
        // Make loan_amount read-only (auto-calculated from table)
        return base.map(f => f.fieldname === 'loan_amount' ? { ...f, read_only: 1 } : f);
    }, [fields]);
    const groupC = useMemo(() => fields.filter(f => GROUP_C_FIELDS.has(f.fieldname)), [fields]);
    const groupD = useMemo(() => fields.filter(f => GROUP_D_FIELDS.has(f.fieldname)), [fields]);

    const commonRendererProps = {
        formData,
        linkOptions,
        onChange: handleChange,
        onFileChange: handleFileChange,
        onTableRowChange: handleTableRowChange,
        onTableFileChange: handleTableRowChange,
        onAddTableRow: handleAddTableRow,
        onDeleteTableRow: handleDeleteTableRow,
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title="Loan Request"
                    status={savedDocName ? 'Draft' : 'New'}
                    projectName={projectTitleParam || projectParam}
                    projectNumber={projectParam}
                >
                    <FrappeButton
                        onClick={handleSave}
                        disabled={isSaving || isSubmitting}
                        className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Draft'}
                    </FrappeButton>
                    <FrappeButton
                        onClick={handleSubmit}
                        disabled={isSaving || isSubmitting || !formData.agreement_no_1 || !formData.agreement_no_2}
                        className="bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </FrappeButton>
                </PageHeader>

                <div className="mt-6 space-y-5">
                    {/* GROUP A — Applicant Details & Project Number */}
                    <GroupCard icon={UserIcon} label="Applicant Details & Project" badge="A">
                        {/* Applicant read-only info strip */}
                        {formData.applicant_webmail && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <InfoRow label="Webmail" value={formData.applicant_webmail} />
                                <InfoRow label="Department" value={formData.applicant_department} isDept />
                                <InfoRow label="Designation" value={formData.applicant_designation} />
                                <InfoRow label="Project No." value={formData.project_number} />
                            </div>
                        )}
                        <DynamicFormRenderer fields={groupA} {...commonRendererProps} />
                    </GroupCard>

                    {/* GROUP B — Loan Details */}
                    <GroupCard icon={IndianRupeeIcon} label="Loan Details" badge="B">
                        <DynamicFormRenderer fields={groupB} {...commonRendererProps} />
                    </GroupCard>

                    {/* GROUP C — Account Head Fund Breakup */}
                    <GroupCard icon={TableIcon} label="Account Head Fund Breakup" badge="C">
                        {groupC.length > 0 ? (
                            <DynamicFormRenderer fields={groupC} {...commonRendererProps} />
                        ) : (
                            <p className="text-sm text-zinc-500 italic">Fund breakup table not loaded.</p>
                        )}
                    </GroupCard>

                    {/* GROUP D — Agreements & Attachment */}
                    <GroupCard icon={FileTextIcon} label="Agreements & Attachment" badge="D">
                        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                Both agreement checkboxes below are mandatory before submission.
                            </p>
                        </div>
                        <DynamicFormRenderer fields={groupD} {...commonRendererProps} />
                        {/* Comments + Additional Attachment — side by side */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                    Comments, If Any
                                </label>
                                <textarea
                                    value={formData.comments_if_any || ''}
                                    onChange={(e) => handleChange('comments_if_any', e.target.value)}
                                    rows={8}
                                    placeholder="Enter any comments..."
                                    className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] resize-none"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                    Add Attachment, If Any
                                </label>
                                {formData.additional_attachment && typeof formData.additional_attachment === 'string' ? (
                                    <div className="flex flex-col gap-2">
                                        <a
                                            href={formData.additional_attachment}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md text-sm font-medium transition-colors"
                                        >
                                            {formData.additional_attachment.split('/').pop() || 'File'}
                                        </a>
                                        <input
                                            type="file"
                                            className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900"
                                            onChange={(e) => handleFileChange('additional_attachment', e.target.files?.[0] || null)}
                                        />
                                    </div>
                                ) : (
                                    <input
                                        type="file"
                                        className="w-full text-sm border border-zinc-300 dark:border-zinc-600 rounded-lg px-2 py-1.5 bg-white dark:bg-zinc-900"
                                        onChange={(e) => handleFileChange('additional_attachment', e.target.files?.[0] || null)}
                                    />
                                )}
                            </div>
                        </div>
                    </GroupCard>
                </div>
            </main>
        </div>
    );
};

export default LoanRequestForm;
