import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { Save, Send, FolderIcon, FileCheck2, PaperclipIcon, MessageSquareIcon } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { ucRequestAPI, prepareFormDataForApi } from '@/services/apiService';
import { GlobalLoader } from '@/components/ui/global-loader';
import { ErrorModal } from '../../components/ErrorModal';
import { parseFrappeError } from '../../utils/errorUtils';
import { UC_TYPES, GroupCard, FileField, UCProjectDetails, labelCls, inputCls } from '@/components/UCRequestShared';

const FrappeButton = ({
    children, onClick, disabled, className,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}) => (
    <button
        type="button"
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

// --- MAIN COMPONENT ---
const UCRequestForm: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editDocName = searchParams.get('edit') || null;
    const projectParam = searchParams.get('project') || '';

    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(editDocName);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });

    const { currentUser } = useFrappeAuth();
    const { call: fetchDocument } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: fetchProjectDetails } = useFrappePostCall<{ message: any }>(ucRequestAPI.getProjectDetails);
    const { call: saveForm } = useFrappePostCall<{ message: any }>(ucRequestAPI.save);
    const { call: submitDocument } = useFrappePostCall<{ message: any }>(ucRequestAPI.submit);

    useEffect(() => {
        if (!currentUser) return;
        const load = async () => {
            try {
                if (editDocName) {
                    const doc = await fetchDocument({ doctype: 'UC Request', name: editDocName });
                    setFormData(doc?.message || {});
                    return;
                }
                if (!projectParam) {
                    setLoadError('Open the UC Request from a project — no project was given.');
                    return;
                }
                const res = await fetchProjectDetails({ project: projectParam });
                if (res?.message?.status !== 'success') {
                    setLoadError(res?.message?.message || 'Project not found.');
                    return;
                }
                let applicantName = '';
                try {
                    const user = await fetchDocument({ doctype: 'User', name: currentUser });
                    applicantName = user?.message?.full_name || '';
                } catch { /* ignore */ }
                setFormData({ ...res.message.data, pi_name: applicantName });
            } catch (err) {
                setLoadError(parseFrappeError(err));
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, editDocName, projectParam]);

    const handleChange = (fieldname: string, value: any) =>
        setFormData(prev => ({ ...prev, [fieldname]: value }));

    const saveDraft = async (): Promise<string> => {
        const data = await prepareFormDataForApi(formData);
        if (savedDocName) data.name = savedDocName;
        const res = await saveForm({ doc_data: JSON.stringify(data) });
        if (res?.message?.status !== 'success') throw new Error(res?.message?.message || 'Save failed');
        const docname = res.message.docname || savedDocName;
        if (docname && !savedDocName) setSavedDocName(docname);
        return docname;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await saveDraft();
            alert('Draft saved successfully!');
        } catch (err: any) {
            setErrorModal({ open: true, title: 'Save Failed', message: parseFrappeError(err) });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.uc_type) {
            alert('Please select the UC Type before submitting.');
            return;
        }
        setIsSubmitting(true);
        try {
            const docname = await saveDraft();
            const submitRes = await submitDocument({ docname });
            if (submitRes?.message?.status !== 'success') {
                throw new Error(submitRes?.message?.message || 'Submission failed');
            }
            alert('UC Request submitted successfully!');
            navigate(`/uc-request/${docname}`);
        } catch (err: any) {
            setErrorModal({ open: true, title: 'Submission Failed', message: parseFrappeError(err) });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    if (loadError) {
        return (
            <div className="p-6">
                <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300">
                    {loadError}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <main className="flex-1 p-0 w-full overflow-hidden">
                <PageHeader
                    title="UC Request"
                    status={savedDocName ? 'Draft' : 'New'}
                    projectName={formData.project_title}
                    projectNumber={formData.project_no}
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
                        disabled={isSaving || isSubmitting || !formData.uc_type}
                        className="bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </FrappeButton>
                </PageHeader>

                <div className="mt-6 space-y-5">
                    {/* GROUP A — Project (read-only, from the project) */}
                    <GroupCard icon={FolderIcon} label="Project Details" badge="A">
                        <UCProjectDetails data={formData} />
                    </GroupCard>

                    {/* GROUP B — UC details */}
                    <GroupCard icon={FileCheck2} label="Utilization Certificate" badge="B">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className={labelCls}>Name of the Applicant</label>
                                <input
                                    type="text"
                                    value={formData.pi_name || ''}
                                    onChange={(e) => handleChange('pi_name', e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                            <div>
                                <label className={labelCls}>Select UC Type <span className="text-red-500">*</span></label>
                                <select
                                    value={formData.uc_type || ''}
                                    onChange={(e) => handleChange('uc_type', e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="">Select…</option>
                                    {UC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {formData.uc_type === 'Audited UC' && (
                                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                                        Audited UCs are sent to the Registrar for offline verification before Dean approval.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className={labelCls}>Total Sanctioned Amount</label>
                                <p className="px-3 py-2 text-sm font-bold text-[#D97757] bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                                    ₹ {(Number(formData.total_sanction_amount) || 0).toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>
                    </GroupCard>

                    {/* GROUP C — Uploads */}
                    <GroupCard icon={PaperclipIcon} label="File Upload" badge="C">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FileField
                                label="Upload Previous UC (if applicable)"
                                value={formData.prev_uc}
                                onChange={(f) => handleChange('prev_uc', f)}
                            />
                            <FileField
                                label="Upload Format (if applicable)"
                                value={formData.uc_format}
                                onChange={(f) => handleChange('uc_format', f)}
                            />
                        </div>
                    </GroupCard>

                    {/* GROUP D — Comment */}
                    <GroupCard icon={MessageSquareIcon} label="Comment" badge="D">
                        <label className={labelCls}>Comment, If Any</label>
                        <textarea
                            value={formData.uc_comment_if_any || ''}
                            onChange={(e) => handleChange('uc_comment_if_any', e.target.value)}
                            rows={5}
                            placeholder="Enter any comments..."
                            className={cn(inputCls, 'resize-none')}
                        />
                    </GroupCard>
                </div>
            </main>

            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default UCRequestForm;
