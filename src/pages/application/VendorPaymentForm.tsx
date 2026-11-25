import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFrappePostCall, useFrappeAuth, useFrappeGetCall } from 'frappe-react-sdk';
import { Info, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserRoles } from '@/components/UserRole';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { vendorPaymentAPI, prepareFormDataForApi } from '@/services/apiService';
import { useIsOverheadProject } from '@/hooks/useIsOverheadProject';
import { ErrorModal } from '@/components/ErrorModal';
import { parseFrappeError } from '@/utils/errorUtils';
import {
    APPROVAL_ATTACH, COMMITTEE_TABLE, ITEMS_TABLE, MIN_COMMITTEE_MEMBERS, STAFF_ROLE,
    formatINR, isDraftDoc, itemsTotal, newChildRow, projectOptionLabel,
    searchProjects, shapeVendorPaymentFields,
} from './vendorPaymentShared';

interface FieldsResponse {
    fields: FormField[];
    prefill_data: Record<string, any>;
    link_options: Record<string, LinkOption[]>;
    related_project_data: { name?: string; project_title?: string; project_no?: string };
}

const CHILD_DOCTYPES: Record<string, string> = {
    [ITEMS_TABLE]: 'Particulars of Items VP',
    [COMMITTEE_TABLE]: 'committee_members_VP',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-zinc-900 p-4 md:p-6 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className }: {
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
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#D97757]/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
        )}
    >
        {children}
    </button>
);

const VendorPaymentForm: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editDocName = searchParams.get('edit') || '';
    const projectParam = searchParams.get('project') || '';

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isStaff = roles.includes(STAFF_ROLE);

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [projectNo, setProjectNo] = useState('');
    const [projectTitle, setProjectTitle] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [errorModal, setErrorModal] = useState({ open: false, title: '', message: '' });
    // Fallback account heads from the fields API (project's sanctioned breakup), used when the
    // ledger-side lookup below returns nothing.
    const fallbackHeads = useRef<LinkOption[]>([]);

    const { call: fetchFields } = useFrappePostCall<{ message: FieldsResponse }>(vendorPaymentAPI.getFields);
    const { call: fetchDoc } = useFrappePostCall<{ message: any }>(vendorPaymentAPI.getDoc);
    const { call: fetchUserDetails } = useFrappePostCall<{ message: any }>(vendorPaymentAPI.getUserDetails);
    const { call: fetchValue } = useFrappePostCall<{ message: any }>('frappe.client.get_value');
    const { call: saveDoc } = useFrappePostCall<{ message: any }>(vendorPaymentAPI.save);

    const isOverheadProject = useIsOverheadProject(projectNo || formData.project_name);

    // --- Initial load: existing draft (edit) or a blank form, then field metadata for its project ---
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                let existing: Record<string, any> | null = null;
                if (editDocName) {
                    existing = (await fetchDoc({ docname: editDocName }))?.message ?? null;
                    if (existing && !isDraftDoc(existing)) {
                        navigate(`/vendor-payment/${encodeURIComponent(editDocName)}`, { replace: true });
                        return;
                    }
                }
                const projectRef = existing?.project_name || projectParam || null;
                const res = (await fetchFields({ doc_name: projectRef }))?.message;
                if (cancelled || !res) return;

                const project = res.related_project_data || {};
                const options: Record<string, LinkOption[]> = { ...(res.link_options || {}) };
                if (project.name) {
                    const current = { value: project.name, label: projectOptionLabel(project as any) };
                    options.project_name = [current, ...(options.project_name || []).filter((o) => o.value !== project.name)];
                }
                fallbackHeads.current = options.account_head || [];

                const initial: Record<string, any> = { ...(res.prefill_data || {}), ...(existing || {}) };
                (res.fields || []).forEach((f) => {
                    if (initial[f.fieldname] === undefined && f.default != null) initial[f.fieldname] = f.default;
                });
                initial[ITEMS_TABLE] = (initial[ITEMS_TABLE] || []).length
                    ? initial[ITEMS_TABLE]
                    : [newChildRow(CHILD_DOCTYPES[ITEMS_TABLE])];
                initial[COMMITTEE_TABLE] = (initial[COMMITTEE_TABLE] || []).length
                    ? initial[COMMITTEE_TABLE]
                    : Array.from({ length: MIN_COMMITTEE_MEMBERS }, () => newChildRow(CHILD_DOCTYPES[COMMITTEE_TABLE]));

                setFields(shapeVendorPaymentFields(res.fields || [], { lockProject: !!projectParam }));
                setLinkOptions(options);
                setFormData(initial);
                setProjectNo(project.project_no || initial.project_number || '');
                setProjectTitle(project.project_title || '');
            } catch (err) {
                if (!cancelled) setErrorModal({ open: true, title: 'Could not load form', message: parseFrappeError(err) });
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editDocName, projectParam]);

    // --- Account heads actually sanctioned/received on the selected project ---
    const { data: headsResult } = useFrappeGetCall<{ message: { name: string; budget_head: string }[] }>(
        'rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_heads_by_project',
        { project_no: projectNo },
        projectNo ? `vendor-payment-heads-${projectNo}` : null,
    );
    useEffect(() => {
        if (!projectNo) return;
        const scoped = (headsResult?.message || [])
            .filter((h) => h?.name)
            .map((h) => ({ value: h.name, label: h.budget_head || h.name }));
        setLinkOptions((prev) => ({ ...prev, account_head: scoped.length ? scoped : fallbackHeads.current }));
    }, [projectNo, headsResult]);

    // --- Handlers ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData((prev) => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        handleChange(fieldname, value);
        if (fieldname !== 'project_name') return;

        // A different project invalidates the account head and project number.
        setFormData((prev) => ({ ...prev, project_number: '', account_head: '' }));
        setProjectNo('');
        setProjectTitle('');
        fallbackHeads.current = [];
        if (!value) return;
        try {
            const res = await fetchValue({
                doctype: 'Project Registration',
                filters: { name: value },
                fieldname: ['project_no', 'project_title'],
            });
            const pr = res?.message || {};
            setFormData((prev) => ({ ...prev, project_number: pr.project_no || '' }));
            setProjectNo(pr.project_no || '');
            setProjectTitle(pr.project_title || '');
            setLinkOptions((prev) => {
                const list = prev.project_name || [];
                if (list.some((o) => o.value === value)) return prev;
                return { ...prev, project_name: [{ value, label: projectOptionLabel({ name: value, ...pr }) }, ...list] };
            });
        } catch {
            /* project number stays blank; the backend rejects the submission */
        }
    }, [handleChange, fetchValue]);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        if (file && fieldname === APPROVAL_ATTACH && !file.name.toLowerCase().endsWith('.pdf')) {
            setErrorModal({ open: true, title: 'PDF required', message: 'The procurement approval must be uploaded as a PDF file.' });
            return;
        }
        setFormData((prev) => ({ ...prev, [fieldname]: file }));
    }, []);

    // Committee rows: typing a full webmail id fills the member's name and designation.
    const lookupSeq = useRef(0);
    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData((prev) => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
            return { ...prev, [tableName]: table };
        });
        if (tableName !== COMMITTEE_TABLE || fieldname !== 'webmail_id') return;
        const email = String(value || '').trim();
        if (!EMAIL_RE.test(email)) return;
        const seq = ++lookupSeq.current;
        fetchUserDetails({ user_email: email })
            .then((res) => {
                const u = res?.message;
                if (!u || seq !== lookupSeq.current) return;
                setFormData((prev) => {
                    const table = [...(prev[COMMITTEE_TABLE] || [])];
                    if (String(table[rowIndex]?.webmail_id || '').trim() !== email) return prev;
                    table[rowIndex] = {
                        ...table[rowIndex],
                        name1: u.full_name || table[rowIndex].name1,
                        designation: u.designation_name || table[rowIndex].designation,
                    };
                    return { ...prev, [COMMITTEE_TABLE]: table };
                });
            })
            .catch(() => { /* not a registered user — the member is typed in by hand */ });
    }, [fetchUserDetails]);

    const handleTableFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
        setFormData((prev) => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
            return { ...prev, [tableName]: table };
        });
    }, []);

    const addTableRow = useCallback((tableName: string, newRow: Record<string, any>) => {
        setFormData((prev) => ({
            ...prev,
            [tableName]: [...(prev[tableName] || []), newChildRow(CHILD_DOCTYPES[tableName] || tableName, newRow)],
        }));
    }, []);

    const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
        setFormData((prev) => ({
            ...prev,
            [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex),
        }));
    }, []);

    const total = useMemo(() => itemsTotal(formData[ITEMS_TABLE]), [formData]);

    const handleSave = async () => {
        if (isSaving) return;
        if (!formData.project_name) {
            setErrorModal({ open: true, title: 'Project required', message: 'Select the project this payment is charged to.' });
            return;
        }
        setIsSaving(true);
        try {
            const data = await prepareFormDataForApi(formData);
            // Blank rows the form seeded but the applicant never filled.
            data[ITEMS_TABLE] = (data[ITEMS_TABLE] as any[] || []).filter((r) =>
                ['date', 'vendor_name', 'particulars', 'amount', 'attach'].some((k) => r?.[k]));
            data[COMMITTEE_TABLE] = (data[COMMITTEE_TABLE] as any[] || []).filter((r) =>
                ['webmail_id', 'name1', 'designation'].some((k) => String(r?.[k] || '').trim()));
            if (editDocName) data.name = editDocName;

            const res = await saveDoc({ data: JSON.stringify(data) });
            if (res?.message?.status !== 'success') throw new Error(res?.message?.message || 'Save failed');
            navigate(`/vendor-payment/${encodeURIComponent(res.message.docname)}`, { replace: true });
        } catch (err) {
            setErrorModal({ open: true, title: 'Save Failed', message: parseFrappeError(err) });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg dark:bg-zinc-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">Loading form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <main className="flex-1 p-0 w-full overflow-hidden">
                <PageHeader
                    title={editDocName ? `Vendor Payment: ${editDocName}` : 'New Vendor Payment'}
                    projectName={projectTitle}
                    projectNumber={projectNo}
                    status={formData.workflow_state || 'Draft'}
                />

                <div className="mb-4 flex gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                    <Info className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>
                        {isStaff
                            ? 'Save the draft, then commit the amount against the project on the next page. The form can be submitted once the commitment is made.'
                            : `Save the draft, then submit it from the next page. Before submitting, add at least one item, ${MIN_COMMITTEE_MEMBERS} committee members, the procurement approval (PDF) and accept the declarations.`}
                    </p>
                </div>

                <FrappeCard className="space-y-6">
                    <DynamicFormRenderer
                        fields={fields}
                        formData={formData}
                        linkOptions={linkOptions}
                        onChange={handleChange}
                        onFileChange={handleFileChange}
                        onTableRowChange={handleTableRowChange}
                        onTableFileChange={handleTableFileChange}
                        onAddTableRow={addTableRow}
                        onDeleteTableRow={deleteTableRow}
                        onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
                        autocompleteFields={['project_name', 'account_head']}
                        asyncSearchFields={isStaff && !projectParam ? { project_name: searchProjects } : undefined}
                        overheadFund={isOverheadProject}
                    />
                    <div className="flex justify-end border-t border-zinc-200 dark:border-zinc-800 pt-4">
                        <div className="text-right">
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Total Amount</p>
                            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">{formatINR(total)}</p>
                        </div>
                    </div>
                </FrappeCard>

                <div className="mt-8 flex flex-wrap justify-end gap-4">
                    <FrappeButton
                        onClick={() => navigate(-1)}
                        disabled={isSaving}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                        Cancel
                    </FrappeButton>
                    <FrappeButton onClick={handleSave} disabled={isSaving} className="bg-[#D97757] text-white hover:bg-[#c66a4e]">
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save Draft'}
                    </FrappeButton>
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

export default VendorPaymentForm;
