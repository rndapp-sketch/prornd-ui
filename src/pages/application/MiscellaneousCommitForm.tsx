import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { Save, Send, UserIcon, IndianRupeeIcon, FolderOpen, X } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { miscellaneousCommitAPI, prepareFormDataForApi } from '@/services/apiService';
import { GlobalLoader } from '@/components/ui/global-loader';
import { DepartmentName } from '@/components/DepartmentName';
import ProjectDetailsOverview from '@/pages/ProjectDetailsOverview';
import { ErrorModal } from '../../components/ErrorModal';
import { parseFrappeError } from '../../utils/errorUtils';

// --- FIELD GROUP DEFINITIONS ---
const GROUP_A_FIELDS = new Set([
    'section_break_klxk', 'project_number',
    'applicant_webmail', 'applicant_department', 'applicant_designation',
]);
const GROUP_B_FIELDS = new Set([
    'commit_details_section', 'budget_head', 'commit_decommit', 'module',
    'commit_amount', 'commit_particular', 'linked_application',
]);

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
    };
}

// --- ASYNC SEARCH: Project Registration by project number / title ---
async function searchProjects(query: string): Promise<LinkOption[]> {
    const csrf = (window as any).csrf_token || '';
    const body: Record<string, any> = {
        doctype: 'Project Registration',
        fields: ['name', 'project_no', 'project_title'],
        order_by: 'project_no asc',
        limit_page_length: 50,
    };
    if (query) {
        body.or_filters = [
            ['project_no', 'like', `%${query}%`],
            ['project_title', 'like', `%${query}%`],
        ];
    }
    const res = await fetch('/api/method/frappe.client.get_list', {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': csrf,
            Accept: 'application/json',
        },
        body: JSON.stringify(body),
    })
        .then((r) => r.json())
        .catch(() => ({ message: [] }));
    return (res?.message ?? []).map((item: any) => ({
        value: item.name,
        label: item.project_no ? `${item.project_no} — ${item.project_title || ''}`.trim() : (item.project_title || item.name),
    }));
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

const InfoRow = ({ label, value, isDept }: { label: string; value: string; isDept?: boolean }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 min-h-[1.5rem]">
            {isDept && value ? <DepartmentName name={value} /> : (value || <span className="text-zinc-400">—</span>)}
        </p>
    </div>
);

// --- MAIN COMPONENT ---
const MiscellaneousCommitForm: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editDocName = searchParams.get('edit') || null;
    const projectParam = searchParams.get('project') || '';

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(editDocName);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [headerProjectCode, setHeaderProjectCode] = useState('');
    const [headerProjectName, setHeaderProjectName] = useState('');
    const [prPreviewName, setPrPreviewName] = useState<string | null>(null);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });

    const { currentUser } = useFrappeAuth();

    const { call: fetchFormData, result: formDataResult, error: formDataError } =
        useFrappePostCall<FormDataResponse>(miscellaneousCommitAPI.getFields);
    const { call: fetchDocument } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: saveForm } = useFrappePostCall<{ message: any }>(miscellaneousCommitAPI.save);
    const { call: submitDocument } = useFrappePostCall<{ message: any }>(miscellaneousCommitAPI.submit);

    useEffect(() => {
        if (!dataLoaded) fetchFormData(editDocName ? { doc_name: editDocName } : {});
    }, []);

    useEffect(() => {
        const load = async () => {
            if (dataLoaded) return;
            if (formDataResult?.message) {
                const { fields: apiFields, link_options, prefill_data } = formDataResult.message;

                if (editDocName) {
                    setFields(apiFields || []);
                    setLinkOptions(link_options || {});
                    try {
                        const doc = await fetchDocument({ doctype: 'Miscellaneous Commit', name: editDocName });
                        if (doc?.message) setFormData(doc.message);
                    } catch {
                        setFormData(prefill_data || {});
                    }
                    setDataLoaded(true);
                    setLoading(false);
                } else {
                    if (!currentUser) return;
                    setFields(apiFields || []);
                    setLinkOptions(link_options || {});

                    const prefill: Record<string, any> = { ...(prefill_data || {}) };
                    if (projectParam) prefill.project_number = projectParam;

                    setFormData(prefill);
                    setDataLoaded(true);
                    setLoading(false);
                }
            }
            if (formDataError) {
                console.error('Failed to load Miscellaneous Commit form:', formDataError);
                setLoading(false);
            }
        };
        load();
    }, [formDataResult, formDataError, currentUser, dataLoaded]);

    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    // Selecting a project fetches that project's PI and auto-fills their
    // Web-Mail Id, Department, and Designation onto the form.
    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        handleChange(fieldname, value);

        if (fieldname === 'project_number') {
            if (!value) return;
            try {
                const projectDoc = await fetchDocument({ doctype: 'Project Registration', name: value });
                const piWebmail = projectDoc?.message?.pi_webmail;
                if (!piWebmail) return;
                setFormData(prev => ({ ...prev, applicant_webmail: piWebmail }));

                const userDoc = await fetchDocument({ doctype: 'User', name: piWebmail });
                if (userDoc?.message) {
                    setFormData(prev => ({
                        ...prev,
                        applicant_department: userDoc.message.department_name || '',
                        applicant_designation: userDoc.message.designation_name || '',
                    }));
                }
            } catch (err) {
                console.warn('Could not fetch project/PI details:', err);
            }
        }
    }, [handleChange, fetchDocument]);

    const noOpFile = useCallback(() => { }, []);

    // Resolve project code + title for PageHeader whenever project_number changes.
    // Tries link_options first (populated by the async search result); falls back
    // to a backend fetch for cases where link_options don't cover the project yet
    // (edit mode, or form pre-filled from ?project= URL param).
    useEffect(() => {
        if (!formData.project_number) {
            setHeaderProjectCode('');
            setHeaderProjectName('');
            return;
        }
        const opt = linkOptions.project_number?.find(o => o.value === formData.project_number);
        if (opt?.label) {
            const sep = opt.label.indexOf(' — ');
            setHeaderProjectCode(sep > -1 ? opt.label.substring(0, sep) : opt.label);
            setHeaderProjectName(sep > -1 ? opt.label.substring(sep + 3) : '');
            return;
        }
        (async () => {
            try {
                const doc = await fetchDocument({ doctype: 'Project Registration', name: formData.project_number });
                if (doc?.message) {
                    setHeaderProjectCode(doc.message.project_no || formData.project_number);
                    setHeaderProjectName(doc.message.project_title || '');
                }
            } catch {
                setHeaderProjectCode(formData.project_number);
                setHeaderProjectName('');
            }
        })();
    }, [formData.project_number, linkOptions.project_number]);

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
            console.error('Save error:', err);
            setErrorModal({ open: true, title: 'Save Failed', message: parseFrappeError(err) });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
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
                alert('Miscellaneous Commit submitted successfully!');
                navigate(`/miscellaneous-commit/${docname}`);
            } else {
                throw new Error(submitRes?.message?.message || 'Submission failed');
            }
        } catch (err: any) {
            console.error('Submission error:', err);
            setErrorModal({ open: true, title: 'Submission Failed', message: parseFrappeError(err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Split fields into groups.
    // project_number is only forced read-only when it arrived pre-filled via
    // the project's own page (?project=...). Opened fresh from the sidebar
    // (staff, RnD path) it stays editable with project search + PI auto-fill.
    // applicant_webmail/department/designation are always derived (from the
    // selected project's PI, or the current user) rather than hand-typed.
    const READ_ONLY_A = useMemo(() => {
        const s = new Set(['applicant_webmail', 'applicant_department', 'applicant_designation']);
        if (projectParam) s.add('project_number');
        return s;
    }, [projectParam]);
    const groupA = useMemo(() =>
        fields.filter(f => GROUP_A_FIELDS.has(f.fieldname))
            .map(f => READ_ONLY_A.has(f.fieldname) ? { ...f, read_only: 1 } : f),
        [fields, READ_ONLY_A]);
    const groupB = useMemo(() => fields.filter(f => GROUP_B_FIELDS.has(f.fieldname)), [fields]);


    const commonRendererProps = {
        formData,
        linkOptions,
        onChange: handleChange,
        onFileChange: noOpFile,
        onTableRowChange: noOpFile,
        onTableFileChange: noOpFile,
        onAddTableRow: noOpFile,
        onDeleteTableRow: noOpFile,
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title="Miscellaneous Commit"
                    status={savedDocName ? 'Draft' : 'New'}
                    projectName={headerProjectName}
                    projectNumber={headerProjectCode}
                >
                    {formData.project_number && (
                        <FrappeButton
                            onClick={() => setPrPreviewName(formData.project_number)}
                            className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm"
                        >
                            <FolderOpen className="w-4 h-4" />
                            View Project
                        </FrappeButton>
                    )}
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
                        disabled={isSaving || isSubmitting}
                        className="bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </FrappeButton>
                </PageHeader>

                <div className="mt-6 space-y-5">
                    {/* GROUP A — Applicant Details & Project */}
                    <GroupCard icon={UserIcon} label="Applicant Details & Project" badge="A">
                        {formData.applicant_webmail && (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <InfoRow label="Webmail" value={formData.applicant_webmail} />
                                <InfoRow label="Department" value={formData.applicant_department} isDept />
                                <InfoRow label="Designation" value={formData.applicant_designation} />
                            </div>
                        )}
                        <DynamicFormRenderer
                            fields={groupA}
                            {...commonRendererProps}
                            autocompleteFields={['project_number']}
                            asyncSearchFields={{ project_number: searchProjects }}
                            onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
                        />
                    </GroupCard>

                    {/* GROUP B — Commit Details */}
                    <GroupCard icon={IndianRupeeIcon} label="Commit Details" badge="B">
                        <DynamicFormRenderer fields={groupB} {...commonRendererProps} />
                    </GroupCard>
                </div>
            </main>

            {/* Project Preview Modal */}
            {prPreviewName && (
                <div
                    className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
                    onClick={(e) => { if (e.target === e.currentTarget) setPrPreviewName(null); }}
                >
                    <div className="relative flex-1 mx-auto my-4 w-full max-w-7xl flex flex-col bg-claude-bg dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                            <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-[#D97757]" />
                                Project Registration Preview
                                <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 dark:bg-zinc-800 text-[#D97757] font-mono border border-orange-100 dark:border-zinc-700">
                                    {headerProjectCode || prPreviewName}
                                </span>
                            </span>
                            <button
                                onClick={() => setPrPreviewName(null)}
                                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                                aria-label="Close project preview"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            <ProjectDetailsOverview projectName={prPreviewName} embedded hideActions />
                        </div>
                    </div>
                </div>
            )}

            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default MiscellaneousCommitForm;