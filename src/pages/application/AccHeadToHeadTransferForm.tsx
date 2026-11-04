import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeAuth, useFrappeGetCall, useSWR } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import {
    Save, Send, UserIcon, FolderOpen, X, FileTextIcon,
    ArrowLeftRight, AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { accHeadToHeadTransferAPI, loanSettlementAPI } from '@/services/apiService';
import { isOverheadProjectNo, fetchOverheadLedger, OVERHEAD_BUDGET_HEAD_ID } from '@/services/overheadLedger';
import { GlobalLoader } from '@/components/ui/global-loader';
import { DepartmentName } from '@/components/DepartmentName';
import ProjectDetailsOverview from '@/pages/ProjectDetailsOverview';
import { ErrorModal } from '../../components/ErrorModal';
import { parseFrappeError } from '../../utils/errorUtils';

// --- FIELD GROUP DEFINITIONS ---
// Applicant fields are all derived server-side, so they are shown as a read-only
// summary strip rather than through the renderer.
const PROJECT_FIELDS = new Set(['h2h_proj_code']);
const TRANSFER_FIELDS = new Set(['h2h_transfer_from', 'h2h_transfer_to', 'h2h_amount']);
const JUSTIFICATION_FIELDS = new Set(['h2h_justification', 'h2h_supporting_document', 'h2h_remarks']);

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        related_project_data?: Record<string, any>;
    };
}

/** A project's budget head with its balances as the Accounts ledger reports them. */
interface HeadBalance {
    docname: string;
    label: string;
    ledgerId: number | null;
    received: number;
    committed: number;
    paid: number;
    /** Loan taken against this head on loans the Accounts service still lists as open. */
    loan: number;
    /** Latest commitable balance — what is left after commitments. null: ledger unreadable. */
    available: number | null;
}

/** get_transfer_head_sanction_summary row: one head against the approved Fund Sanction. */
interface HeadSanction {
    sanctioned: number;
    received: number;
    transferred_in: number;
    transferred_out: number;
    pending_in: number;
    /** sanctioned − (received + transferred_in − transferred_out + pending_in) */
    room: number;
}

interface LedgerRow {
    transactionId?: number;
    transactionDate?: string;
    recordTime?: string;
    fundReceivedAmount?: number | null;
    commitAmount?: number | null;
    paymentAmount?: number | null;
    commitableBalance?: number | null;
}

/**
 * One head's ledger, summed. Available is the ledger's own running commitable balance
 * on its latest entry rather than something recomputed here, so it reflects whatever
 * the Accounts service counts (receipts, commitments, decommits) and nothing it doesn't.
 */
const summariseLedger = (rows: LedgerRow[]) => {
    const sorted = [...rows].sort((a, b) => {
        const ta = new Date(a.recordTime || a.transactionDate || 0).getTime();
        const tb = new Date(b.recordTime || b.transactionDate || 0).getTime();
        return ta === tb ? (a.transactionId ?? 0) - (b.transactionId ?? 0) : ta - tb;
    });
    return {
        received: rows.reduce((s, r) => s + (r.fundReceivedAmount || 0), 0),
        committed: rows.reduce((s, r) => s + (r.commitAmount || 0), 0),
        paid: rows.reduce((s, r) => s + (r.paymentAmount || 0), 0),
        available: sorted.length ? sorted[sorted.length - 1].commitableBalance ?? 0 : 0,
    };
};

// --- FILE UPLOAD HELPER ---
// The backend stores h2h_supporting_document as a plain file URL, so any File
// picked in the form is uploaded to Frappe before the document is saved.
const uploadFileToFrappe = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    fd.append('is_private', '0');
    const response = await fetch(`${FRAPPE_BASE_URL}/api/method/upload_file`, {
        method: 'POST',
        body: fd,
        headers: { 'X-Frappe-CSRF-Token': (window as any).csrf_token || '' },
        credentials: 'include',
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`File upload failed (${response.status}): ${text.slice(0, 200)}`);
    const fileUrl = JSON.parse(text)?.message?.file_url;
    if (!fileUrl) throw new Error('File upload did not return a valid file_url');
    return fileUrl;
};

// --- ASYNC SEARCH: Project Registration by project number / title ---
async function searchProjects(query: string): Promise<LinkOption[]> {
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
    const res = await fetch(`${FRAPPE_BASE_URL}/api/method/frappe.client.get_list`, {
        method: 'POST',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': (window as any).csrf_token || '',
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
    icon: Icon, label, badge, children, className,
}: {
    icon: React.ElementType;
    label: string;
    badge: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden',
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

const InfoRow = ({ label, value, isDept }: { label: string; value?: string; isDept?: boolean }) => (
    <div className="space-y-1">
        <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 min-h-[1.5rem]">
            {isDept && value ? <DepartmentName name={value} /> : (value || <span className="text-zinc-400">—</span>)}
        </p>
    </div>
);

const inr = (n: number) =>
    Number(n || 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2 });

// --- MAIN COMPONENT ---
const AccHeadToHeadTransferForm: React.FC = () => {
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
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: 'Submission Failed', message: '' });

    const { currentUser } = useFrappeAuth();

    const { call: fetchFormData, result: formDataResult, error: formDataError } =
        useFrappePostCall<FormDataResponse>(accHeadToHeadTransferAPI.getFields);
    const { call: fetchDocument } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: saveForm } = useFrappePostCall<{ message: any }>(accHeadToHeadTransferAPI.save);
    const { call: submitDocument } = useFrappePostCall<{ message: any }>(accHeadToHeadTransferAPI.submit);
    const { call: fetchAmountInWords } = useFrappePostCall<{ message: string }>(accHeadToHeadTransferAPI.getAmountInWords);

    useEffect(() => {
        if (dataLoaded) return;
        const args: Record<string, string> = {};
        if (editDocName) args.docname = editDocName;
        if (projectParam) args.doc_name = projectParam;
        fetchFormData(args);
    }, []);

    useEffect(() => {
        const load = async () => {
            if (dataLoaded) return;
            if (formDataResult?.message) {
                const { fields: apiFields, link_options, prefill_data } = formDataResult.message;
                if (!editDocName && !currentUser) return;

                setFields(apiFields || []);
                setLinkOptions(link_options || {});
                setFormData({ ...(prefill_data || {}) });
                setDataLoaded(true);
                setLoading(false);
            }
            if (formDataError) {
                console.error('Failed to load Head to Head Transfer form:', formDataError);
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

    // Selecting a project pulls its number/title/PI and the account heads that
    // already carry sanctioned and received money on that project.
    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        handleChange(fieldname, value);

        if (fieldname === 'h2h_proj_code') {
            if (!value) {
                setFormData(prev => ({ ...prev, h2h_proj_num: '', h2h_proj_title: '', h2h_pi_webmail: '' }));
                return;
            }
            try {
                const projectDoc = await fetchDocument({ doctype: 'Project Registration', name: value });
                if (projectDoc?.message) {
                    setFormData(prev => ({
                        ...prev,
                        h2h_proj_num: projectDoc.message.project_no || '',
                        h2h_proj_title: projectDoc.message.project_title || '',
                        h2h_pi_webmail: projectDoc.message.pi_webmail || '',
                    }));
                }
            } catch (err) {
                console.warn('Could not fetch project details:', err);
            }
        }

        // Keep the two heads distinct — clear the counterpart when they collide.
        if (fieldname === 'h2h_transfer_to') {
            setFormData(prev => (prev.h2h_transfer_from && prev.h2h_transfer_from === value
                ? { ...prev, h2h_transfer_to: '' }
                : prev));
        }
        if (fieldname === 'h2h_transfer_from') {
            setFormData(prev => (prev.h2h_transfer_to && prev.h2h_transfer_to === value
                ? { ...prev, h2h_transfer_from: '' }
                : prev));
        }
    }, [handleChange, fetchDocument]);

    // --- head balances, from the Accounts service ---
    // The project's heads (docname, label and ledger id in one row, so the same head
    // never shows twice), each head's ledger, and any open loans drawn against them.
    const projectNo: string = formData.h2h_proj_num || '';

    const { data: projectHeadsResult } = useFrappeGetCall<{
        message: { name: string; id: number | null; budget_head: string }[];
    }>(
        'rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_heads_by_project',
        { project_no: projectNo },
        projectNo ? `project-budget-heads-${projectNo}` : null,
    );
    const projectHeads = useMemo(() => projectHeadsResult?.message ?? [], [projectHeadsResult]);

    const { data: openLoansResult } = useFrappeGetCall<{
        message: { data: { budget_heads?: { account_head_id: number | null; account_head: string | null; loan_amount: number }[] }[] };
    }>(
        loanSettlementAPI.getActiveLoansForProject,
        { project_name: projectNo },
        projectNo ? `active-loans-${projectNo}` : null,
        { revalidateOnFocus: false, revalidateOnReconnect: false },
    );

    const {
        data: ledgerByHead,
        isValidating: ledgerLoading,
        mutate: reloadLedger,
    } = useSWR(
        projectNo && projectHeads.length ? ['h2h-head-ledger', projectNo, projectHeads.map((h) => h.name).join(',')] : null,
        async () => {
            // A head whose ledger can't be read is recorded as null, never as 0 — an
            // unknown balance must not look like an empty one.
            const out: Record<string, ReturnType<typeof summariseLedger> | null> = {};
            if (isOverheadProjectNo(projectNo)) {
                try {
                    const summary = summariseLedger((await fetchOverheadLedger(projectNo)) as LedgerRow[]);
                    projectHeads.forEach((h) => {
                        out[h.name] = Number(h.id) === Number(OVERHEAD_BUDGET_HEAD_ID) ? summary : null;
                    });
                } catch {
                    projectHeads.forEach((h) => { out[h.name] = null; });
                }
                return out;
            }
            await Promise.all(projectHeads.map(async (h) => {
                if (h.id == null) { out[h.name] = null; return; }
                try {
                    const res = await fetch(`/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectNo)}&accountHeadId=${encodeURIComponent(String(h.id))}`);
                    const data = res.ok ? await res.json() : null;
                    out[h.name] = Array.isArray(data) ? summariseLedger(data) : null;
                } catch {
                    out[h.name] = null;
                }
            }));
            return out;
        },
        { revalidateOnFocus: false },
    );

    const headBalances: HeadBalance[] = useMemo(() => {
        const loanByHead: Record<string, number> = {};
        (openLoansResult?.message?.data ?? []).forEach((loan) =>
            (loan.budget_heads ?? []).forEach((bh) => {
                const key = bh.account_head_id != null ? `id:${bh.account_head_id}` : `name:${bh.account_head}`;
                loanByHead[key] = (loanByHead[key] || 0) + (bh.loan_amount || 0);
            }),
        );
        return projectHeads.map((h) => {
            const ledger = ledgerByHead?.[h.name];
            return {
                docname: h.name,
                label: h.budget_head || h.name,
                ledgerId: h.id,
                received: ledger?.received ?? 0,
                committed: ledger?.committed ?? 0,
                paid: ledger?.paid ?? 0,
                loan: (h.id != null ? loanByHead[`id:${h.id}`] : 0) || loanByHead[`name:${h.name}`] || 0,
                available: ledgerByHead ? ledger?.available ?? null : null,
            };
        });
    }, [projectHeads, ledgerByHead, openLoansResult]);

    // Dropdown values may be the Budget Head docname, its label or its ledger id.
    const findHead = useCallback(
        (value: string) =>
            value
                ? headBalances.find((h) => h.docname === value || h.label === value || String(h.ledgerId) === String(value))
                : undefined,
        [headBalances],
    );
    const fromHead = findHead(formData.h2h_transfer_from);

    // Amount in words, debounced so typing doesn't hammer the backend.
    useEffect(() => {
        const amount = Number(formData.h2h_amount);
        if (!amount) {
            setFormData(prev => (prev.h2h_amount_in_words ? { ...prev, h2h_amount_in_words: '' } : prev));
            return;
        }
        const t = setTimeout(async () => {
            try {
                const res = await fetchAmountInWords({ amount });
                setFormData(prev => ({ ...prev, h2h_amount_in_words: res?.message || '' }));
            } catch { /* display-only field */ }
        }, 400);
        return () => clearTimeout(t);
    }, [formData.h2h_amount]);

    // Resolve project code + title for the page header.
    useEffect(() => {
        if (!formData.h2h_proj_code) {
            setHeaderProjectCode('');
            setHeaderProjectName('');
            return;
        }
        if (formData.h2h_proj_num || formData.h2h_proj_title) {
            setHeaderProjectCode(formData.h2h_proj_num || formData.h2h_proj_code);
            setHeaderProjectName(formData.h2h_proj_title || '');
            return;
        }
        const opt = linkOptions.h2h_proj_code?.find(o => o.value === formData.h2h_proj_code);
        if (opt?.label) {
            const sep = opt.label.indexOf(' — ');
            setHeaderProjectCode(sep > -1 ? opt.label.substring(0, sep) : opt.label);
            setHeaderProjectName(sep > -1 ? opt.label.substring(sep + 3) : '');
        }
    }, [formData.h2h_proj_code, formData.h2h_proj_num, formData.h2h_proj_title, linkOptions.h2h_proj_code]);

    // --- validation ---
    const validationError = useMemo(() => {
        if (!formData.h2h_proj_code) return 'Select a project before saving.';
        if (!formData.h2h_transfer_from) return 'Select the account head to transfer from.';
        if (!formData.h2h_transfer_to) return 'Select the account head to transfer to.';
        if (formData.h2h_transfer_from === formData.h2h_transfer_to)
            return 'The source and destination account heads must be different.';
        if (!Number(formData.h2h_amount) || Number(formData.h2h_amount) <= 0)
            return 'Amount to Transfer must be greater than zero.';
        if (!formData.h2h_justification) return 'Justification for Transfer is mandatory.';
        return null;
    }, [formData]);

    // Per head, against the approved Fund Sanction: what is sanctioned, and how much of
    // it is already taken by receipts and transfers (pending ones into the head included).
    const { data: sanctionSummaryResult } = useFrappeGetCall<{ message: Record<string, HeadSanction> }>(
        accHeadToHeadTransferAPI.getHeadSanctionSummary,
        { project_code: formData.h2h_proj_code, docname: savedDocName || '' },
        formData.h2h_proj_code ? `h2h-head-sanction-${formData.h2h_proj_code}-${savedDocName || ''}` : null,
        { revalidateOnFocus: false },
    );
    const sanctionByHead = sanctionSummaryResult?.message;
    const toHead = findHead(formData.h2h_transfer_to);
    const toSanction = toHead ? sanctionByHead?.[toHead.docname] : undefined;

    // Two limits, both blocking Submit (a draft may still be saved); the backend enforces
    // the same at Submit and again at approval:
    //  1. the From head can only give what it has left after commitments;
    //  2. the To head can never end up holding more than it was sanctioned.
    const transferLimitError = useMemo(() => {
        if (!projectNo) return null;
        const amount = Number(formData.h2h_amount) || 0;

        if (formData.h2h_transfer_from) {
            const name = fromHead?.label || formData.h2h_transfer_from;
            if (!ledgerByHead) return ledgerLoading ? `Checking the available balance of ${name}…` : null;
            if (!fromHead) return `${name} has no funds on this project to transfer.`;
            if (fromHead.available == null)
                return `Couldn't read the available balance of ${name} from the Accounts service. Try again shortly.`;
            if (fromHead.available <= 0) return `${name} has no available balance to transfer.`;
            if (amount > fromHead.available + 0.009)
                return `Amount exceeds the available balance of ${name} (${inr(fromHead.available)}).`;
        }

        if (formData.h2h_transfer_to && sanctionByHead) {
            const name = toHead?.label || formData.h2h_transfer_to;
            if (!toSanction || toSanction.sanctioned <= 0)
                return `${name} has no approved sanction on this project, so nothing can be transferred into it.`;
            if (amount > toSanction.room + 0.009) {
                const held = toSanction.received + toSanction.transferred_in - toSanction.transferred_out;
                return `${name} can receive at most ${inr(Math.max(toSanction.room, 0))}: sanctioned ${inr(toSanction.sanctioned)}, ` +
                    `already received ${inr(held)}` +
                    (toSanction.pending_in > 0 ? `, pending transfers in ${inr(toSanction.pending_in)}` : '') + '.';
            }
        }
        return null;
    }, [formData.h2h_transfer_from, formData.h2h_transfer_to, formData.h2h_amount, projectNo, fromHead, ledgerByHead, ledgerLoading, sanctionByHead, toHead, toSanction]);

    const buildPayload = useCallback(async () => {
        const payload: Record<string, any> = {
            h2h_app_webmail: formData.h2h_app_webmail,
            h2h_proj_code: formData.h2h_proj_code,
            h2h_transfer_from: formData.h2h_transfer_from,
            h2h_transfer_to: formData.h2h_transfer_to,
            h2h_amount: Number(formData.h2h_amount) || 0,
            h2h_justification: formData.h2h_justification || '',
            h2h_remarks: formData.h2h_remarks || '',
        };
        const doc = formData.h2h_supporting_document;
        payload.h2h_supporting_document = doc instanceof File ? await uploadFileToFrappe(doc) : (doc || '');
        if (savedDocName) payload.name = savedDocName;
        return payload;
    }, [formData, savedDocName]);

    const handleSave = async () => {
        if (validationError) {
            setErrorModal({ open: true, title: 'Cannot Save', message: validationError });
            return;
        }
        setIsSaving(true);
        try {
            const payload = await buildPayload();
            const res = await saveForm({ data: JSON.stringify(payload) });
            if (res?.message?.status === 'success') {
                const docname = res.message.docname || savedDocName;
                if (docname && !savedDocName) setSavedDocName(docname);
                if (res.message.doc) setFormData(prev => ({ ...prev, ...res.message.doc }));
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
        if (validationError || transferLimitError) {
            setErrorModal({ open: true, title: 'Cannot Submit', message: (validationError || transferLimitError)! });
            return;
        }
        setIsSubmitting(true);
        try {
            const payload = await buildPayload();
            const saveRes = await saveForm({ data: JSON.stringify(payload) });
            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || 'Save failed');
            }
            const docname = saveRes.message.docname || savedDocName;
            if (docname && !savedDocName) setSavedDocName(docname);

            const submitRes = await submitDocument({ docname });
            if (submitRes?.message?.status === 'success') {
                alert('Head to Head Transfer submitted successfully!');
                navigate(`/head-to-head-transfer/${docname}`);
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

    // --- field grouping ---
    // Project code is locked when the form was opened from a project page.
    const projectGroup = useMemo(() =>
        fields
            .filter(f => PROJECT_FIELDS.has(f.fieldname))
            .map(f => (projectParam && f.fieldname === 'h2h_proj_code' ? { ...f, read_only: 1 } : f)),
        [fields, projectParam]);

    const transferGroup = useMemo(() => fields.filter(f => TRANSFER_FIELDS.has(f.fieldname)), [fields]);
    const justificationGroup = useMemo(() => fields.filter(f => JUSTIFICATION_FIELDS.has(f.fieldname)), [fields]);

    // Keep the two head dropdowns mutually exclusive.
    const scopedLinkOptions = useMemo(() => {
        const base = { ...linkOptions };
        const all = linkOptions.h2h_transfer_from || [];
        // Once balances are known, only heads with money left can be transferred from.
        // The current choice stays listed so a saved draft still shows what it holds.
        base.h2h_transfer_from = all.filter(o =>
            o.value !== formData.h2h_transfer_to &&
            (!ledgerByHead || o.value === formData.h2h_transfer_from || (findHead(o.value)?.available ?? 0) > 0));
        // Only the project's own heads can receive, and only those with an approved
        // sanction — anything else would be refused by the sanction check anyway.
        base.h2h_transfer_to = all.filter(o => {
            if (o.value === formData.h2h_transfer_from) return false;
            if (o.value === formData.h2h_transfer_to) return true;
            const head = findHead(o.value);
            if (!head) return !headBalances.length;
            return !sanctionByHead || (sanctionByHead[head.docname]?.sanctioned ?? 0) > 0;
        });
        return base;
    }, [linkOptions, formData.h2h_transfer_from, formData.h2h_transfer_to, ledgerByHead, findHead, headBalances.length, sanctionByHead]);

    const noOp = useCallback(() => { }, []);

    const commonRendererProps = {
        formData,
        linkOptions: scopedLinkOptions,
        onChange: handleChange,
        onFileChange: handleFileChange,
        onTableRowChange: noOp,
        onTableFileChange: noOp,
        onAddTableRow: noOp,
        onDeleteTableRow: noOp,
    };

    const headLabel = (value: string) =>
        linkOptions.h2h_transfer_from?.find(o => o.value === value)?.label || value;

    if (loading) return <GlobalLoader isLoading={true} />;

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title="Head to Head Transfer"
                    status={savedDocName ? (formData.workflow_state || 'Draft') : 'New'}
                    projectName={headerProjectName}
                    projectNumber={headerProjectCode}
                >
                    {formData.h2h_proj_code && (
                        <FrappeButton
                            onClick={() => setPrPreviewName(formData.h2h_proj_code)}
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
                        disabled={isSaving || isSubmitting || !!transferLimitError}
                        className="bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm"
                    >
                        <Send className="w-4 h-4" />
                        {isSubmitting ? 'Submitting...' : 'Submit'}
                    </FrappeButton>
                </PageHeader>

                <div className="mt-6 space-y-5">
                    {/* GROUP A — Applicant */}
                    <GroupCard icon={UserIcon} label="Applicant Details" badge="A">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                            <InfoRow label="Webmail" value={formData.h2h_app_webmail} />
                            <InfoRow label="Name" value={formData.h2h_app_name} />
                            <InfoRow label="Designation" value={formData.h2h_app_designation} />
                            <InfoRow label="Department" value={formData.h2h_dept} isDept />
                            <InfoRow label="Category" value={formData.h2h_app_category} />
                        </div>
                        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                            Applicant details are derived from your user record and cannot be edited here.
                        </p>
                    </GroupCard>

                    {/* GROUP B — Project */}
                    <GroupCard icon={FolderOpen} label="Project Details" badge="B">
                        <DynamicFormRenderer
                            fields={projectGroup}
                            {...commonRendererProps}
                            autocompleteFields={['h2h_proj_code']}
                            asyncSearchFields={{ h2h_proj_code: searchProjects }}
                            onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
                        />
                        {(formData.h2h_proj_num || formData.h2h_proj_title || formData.h2h_pi_webmail) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <InfoRow label="Project Number" value={formData.h2h_proj_num} />
                                <InfoRow label="Project Title" value={formData.h2h_proj_title} />
                                <InfoRow label="PI Webmail" value={formData.h2h_pi_webmail} />
                            </div>
                        )}
                    </GroupCard>

                    {/* GROUP C — Fund Transfer */}
                    <GroupCard icon={ArrowLeftRight} label="Fund Transfer Details" badge="C">
                        <DynamicFormRenderer
                            fields={transferGroup}
                            {...commonRendererProps}
                            onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
                        />

                        {formData.h2h_amount_in_words && (
                            <div className="mt-4 px-4 py-3 rounded-lg bg-[#FFF7F4] dark:bg-[#D97757]/10 border border-[#D97757]/20">
                                <p className="text-[10.5px] font-bold uppercase tracking-wider text-[#A1A1AA]">Amount in Words</p>
                                <p className="text-sm font-semibold text-[#D97757]">{formData.h2h_amount_in_words}</p>
                            </div>
                        )}

                        {formData.h2h_transfer_from && formData.h2h_transfer_to && (
                            <div className="mt-4 flex flex-wrap items-center gap-3 px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                    {headLabel(formData.h2h_transfer_from)}
                                </span>
                                <ArrowLeftRight className="w-4 h-4 text-[#D97757]" />
                                <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                    {headLabel(formData.h2h_transfer_to)}
                                </span>
                                {Number(formData.h2h_amount) > 0 && (
                                    <span className="ml-auto text-sm font-bold text-[#D97757]">
                                        {inr(Number(formData.h2h_amount))}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* What the From head can give, and why the transfer is held back. */}
                        {fromHead && fromHead.available != null && (
                            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                                <span className="text-zinc-600 dark:text-zinc-400">
                                    Available in <strong className="text-zinc-900 dark:text-zinc-100">{fromHead.label}</strong>:{' '}
                                    <strong className="text-[#D97757]">{inr(fromHead.available)}</strong>
                                </span>
                                {fromHead.available > 0 && Number(formData.h2h_amount) !== fromHead.available && (
                                    <button
                                        type="button"
                                        onClick={() => handleChange('h2h_amount', String(fromHead.available))}
                                        className="text-xs font-semibold text-[#D97757] hover:underline"
                                    >
                                        Use full amount
                                    </button>
                                )}
                            </div>
                        )}
                        {toHead && toSanction && toSanction.sanctioned > 0 && (
                            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                                <strong className="text-zinc-900 dark:text-zinc-100">{toHead.label}</strong> can still receive{' '}
                                <strong className="text-[#D97757]">{inr(Math.max(toSanction.room, 0))}</strong>{' '}
                                <span className="text-xs">(sanctioned {inr(toSanction.sanctioned)})</span>
                            </p>
                        )}
                        {transferLimitError && (
                            <div className="mt-3 flex items-start gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                <AlertCircle className="w-4 h-4 mt-0.5 text-red-600 dark:text-red-400 shrink-0" />
                                <p className="flex-1 text-sm text-red-700 dark:text-red-300">{transferLimitError}</p>
                                {fromHead?.available == null && ledgerByHead && (
                                    <button
                                        type="button"
                                        onClick={() => reloadLedger()}
                                        className="text-xs font-semibold text-red-700 dark:text-red-300 hover:underline"
                                    >
                                        Retry
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Project account heads — balances as the Accounts ledger reports them */}
                        {headBalances.length > 0 && (
                            <div className="mt-5 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                        <tr>
                                            {['Account Head', 'Sanctioned', 'Received', ...(headBalances.some(h => h.loan > 0) ? ['Loan (open)'] : []), 'Committed', 'Paid', 'Available', 'Room to receive'].map((h, i) => (
                                                <th
                                                    key={h}
                                                    className={cn(
                                                        'px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400',
                                                        i === 0 ? 'text-left' : 'text-right',
                                                    )}
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {headBalances.map((h) => {
                                            const isFrom = fromHead?.docname === h.docname;
                                            return (
                                                <tr key={h.docname} className={cn('bg-white dark:bg-zinc-900', isFrom && 'bg-[#FFF7F4] dark:bg-[#D97757]/10')}>
                                                    <td className="px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100">{h.label}</td>
                                                    <td className="px-4 py-2.5 text-sm text-right text-zinc-600 dark:text-zinc-400">
                                                        {sanctionByHead ? inr(sanctionByHead[h.docname]?.sanctioned ?? 0) : '—'}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm text-right text-zinc-600 dark:text-zinc-400">{inr(h.received)}</td>
                                                    {headBalances.some(x => x.loan > 0) && (
                                                        <td className="px-4 py-2.5 text-sm text-right text-amber-700 dark:text-amber-400">{h.loan > 0 ? inr(h.loan) : '—'}</td>
                                                    )}
                                                    <td className="px-4 py-2.5 text-sm text-right text-zinc-600 dark:text-zinc-400">{inr(h.committed)}</td>
                                                    <td className="px-4 py-2.5 text-sm text-right text-zinc-600 dark:text-zinc-400">{inr(h.paid)}</td>
                                                    <td className="px-4 py-2.5 text-sm text-right font-semibold text-zinc-900 dark:text-zinc-100">
                                                        {h.available == null
                                                            ? <span className="text-xs font-medium text-amber-600 dark:text-amber-400">{ledgerLoading ? 'Loading…' : 'Unavailable'}</span>
                                                            : inr(h.available)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm text-right text-zinc-600 dark:text-zinc-400">
                                                        {sanctionByHead?.[h.docname]
                                                            ? inr(Math.max(sanctionByHead[h.docname].room, 0))
                                                            : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <p className="px-4 py-2 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800">
                                    Received, Committed, Paid and Available are from the Accounts ledger. Available is the balance left after commitments; only that much can be transferred out of a head.
                                    {' '}Sanctioned is from the approved Fund Sanction; Room to receive is how much more a head can take before it exceeds its sanction (transfers still awaiting approval count against it).
                                    {headBalances.some(h => h.loan > 0) && ' Loan (open) is loan money drawn against the head that has not yet been settled.'}
                                </p>
                            </div>
                        )}
                    </GroupCard>

                    {/* GROUP D — Justification */}
                    <GroupCard icon={FileTextIcon} label="Justification" badge="D">
                        <DynamicFormRenderer fields={justificationGroup} {...commonRendererProps} />
                    </GroupCard>

                    {validationError && (
                        <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <p className="text-sm text-amber-800 dark:text-amber-300">{validationError}</p>
                        </div>
                    )}
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

export default AccHeadToHeadTransferForm;
