import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../../components/RndSidebar";
import { useFrappePostCall, useFrappeGetCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, FileTextIcon, CalendarIcon, UserIcon, DownloadIcon, FileSpreadsheetIcon as LedgerIcon } from "lucide-react";
import { GlobalLoader } from '@/components/ui/global-loader';
import { useProjectBudget } from '@/hooks/useProjectBudget';
import { useUserRoles } from '../../components/UserRole';
import { Textarea } from '@/components/ui/textarea'; // Assuming this exists, if not use standard textarea

// --- TYPE DEFINITIONS ---
interface ReimbursementData {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    workflow_state: string;
    self_other: string | null;
    reimbursement_for_id: string;
    reimbursement_for_department: string;
    reimbursement_for_designation: string;
    applicant_webmail: string;
    applicant_department: string;
    applicant_designation: string;
    bank_name: string;
    account_holder_name: string;
    bank_account_number: string;
    ifsc_code: string;
    project_number: string;
    project_name: string;
    account_head: string;
    other_head: string;
    comment: string;
    dec1: number;
    dec2: number;
    dec3: number;
    dec4: number;
    [key: string]: any;
}

// Frappe-styled components
const FrappeCard = ({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white border border-gray-300 rounded-xl shadow-sm", className)}>
        {title && (
            <div className="px-6 py-4 border-b border-gray-300">
                <h3 className="text-lg font-bold text-black uppercase tracking-tight">{title}</h3>
            </div>
        )}
        <div className="p-6">
            {children}
        </div>
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-gray-400",
            variant === 'primary' && "bg-[#0EA5A4] text-white hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border border-[#0D9494]",
            variant === 'ghost' && "bg-transparent text-gray-900 hover:bg-gray-200 hover:text-black",
            variant === 'outline' && "bg-white border-2 border-gray-400 text-black hover:border-[#0EA5A4] hover:text-[#0EA5A4] hover:bg-gray-50",
            variant === 'action' && "bg-[#0EA5A4] text-white font-bold hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border-2 border-[#0D9494]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

// --- COMMENT MODAL ---
const CommentModal = ({ isOpen, onClose, onSubmit, action, isLoading }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (comment: string) => void;
    action: string;
    isLoading: boolean
}) => {
    const [comment, setComment] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm {action}</h3>
                <textarea
                    className="w-full border border-gray-300 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.25)] focus:border-[#0EA5A4]"
                    rows={4}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <FrappeButton variant="outline" onClick={onClose} disabled={isLoading}>Cancel</FrappeButton>
                    <FrappeButton
                        variant="primary"
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading}
                    >
                        {isLoading ? "Processing..." : "Confirm"}
                    </FrappeButton>
                </div>
            </div>
        </div>
    );
};

// --- WORKFLOW ACTIONS COMPONENT ---
const ReimbursementWorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_reimbursement_workflow_actions",
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.perform_reimbursement_action"
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
            alert("Failed to perform action. Please try again.");
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            <div className="flex gap-2">
                {data.message.map((action) => (
                    <FrappeButton
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={actionLoading}
                        variant="action"
                    >
                        {action}
                    </FrappeButton>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};

// --- Activity Stream Component ---
interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}

const ActivityStream = ({ doctype, docname }: { doctype: string; docname: string }) => {
    const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
        "rndopsapp.rndopsapp.api.get_project_activity",
        { doctype, docname }
    );

    // Initial refetch when mounted
    useEffect(() => {
        refetchActivity();
    }, [docname]);

    return (
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {activityData?.message && activityData.message.length > 0 ? (
                activityData.message.map((activity, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#E0F7F6] flex items-center justify-center font-bold text-[#0EA5A4] text-xs">
                            {activity.owner?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="min-w-0">
                            <div
                                className="text-sm text-gray-800 line-clamp-2 prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: activity.content }}
                            />
                            <p className="text-xs text-gray-500 mt-0.5">
                                {activity.owner} · {activity.creation ? new Date(activity.creation).toLocaleString() : ''}
                            </p>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-sm text-gray-500 italic">No recent activity found.</p>
            )}
        </div>
    );
};

const ReimbursementDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<ReimbursementData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

    const { call: fetchDoc } = useFrappePostCall<{ message: ReimbursementData }>(
        'frappe.client.get'
    );

    const { call: fetchLinkValue } = useFrappePostCall<{ message: any }>(
        'frappe.client.get_value'
    );

    const { call: submitDoc } = useFrappePostCall<{ message: any }>(
        'rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.submit_reimbursement'
    );

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Function to resolve a link field ID to its display name
    const resolveLinkName = async (doctype: string, docId: string, fieldname: string) => {
        if (!docId) return '';
        try {
            const result = await fetchLinkValue({
                doctype: doctype,
                filters: { name: docId },
                fieldname: fieldname
            });
            const resolvedValue = result?.message?.[fieldname] || docId;
            return resolvedValue;
        } catch (err) {
            console.error(`Error resolving ${doctype}/${docId}:`, err);
            return docId;
        }
    };

    // Handle submit for draft reimbursement
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);

    // Sidebar State
    const [sidebarComment, setSidebarComment] = useState("");
    const [isAddingComment, setIsAddingComment] = useState(false);
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    // Commitment Widget State
    const [commitHead, setCommitHead] = useState("");
    const [commitAmount, setCommitAmount] = useState("");
    const [paymentAmount, setPaymentAmount] = useState(""); // Payment State
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);

    // API Hooks for Commit/Payment
    const { call: submitCommit, loading: isCommitting } = useFrappePostCall("rndopsapp.rndopsapp.commitPayment.submit_commit_data");
    const { call: submitPayment, loading: isPaying } = useFrappePostCall("rndopsapp.rndopsapp.commitPayment.submit_payment_data");

    // Fetch Project Budget Data
    const projectTitle = data?.project_number || ""; // Use project_number as title/ID for budget fetch
    const { budgetData, heads: budgetHeads, headBalances, actualBalance, commitableBalance } = useProjectBudget(projectTitle);

    // Find existing commitment for this document
    const linkedCommitment = budgetData.find(e => e.ref === (id || "") && e.type === 'commitment');
    const isCommitted = !!linkedCommitment;

    // Set default commit head
    useEffect(() => {
        if (budgetHeads.length > 0 && !commitHead) {
            setCommitHead(budgetHeads[0]);
        }
    }, [budgetHeads]);

    // Set Payment defaults from Commitment
    useEffect(() => {
        if (linkedCommitment) {
            setCommitHead(linkedCommitment.head || ""); // Lock/Prefill head for visibility
            if (!paymentAmount) setPaymentAmount(String(linkedCommitment.committed));
        }
    }, [linkedCommitment]);

    // Role Check
    const isRnDStaff = roles.some(r =>
        r === "RnD Staff" || r === "R&D Staff" || r === "Research and Development Staff" || r === "System Manager" || r === "staff, RnD" || r === "Hos, RnD (Head of Section, RnD)"
    );
    // console.log("User Roles:", roles, "Is RnD Staff:", isRnDStaff, "Workflow State:", data?.workflow_state);

    const handleSidebarCommentSubmit = async () => {
        if (!sidebarComment.trim() || !id) return;
        setIsAddingComment(true);
        try {
            await addComment({
                doctype: "Reimbursement",
                docname: id,
                content: sidebarComment,
            });
            setSidebarComment("");
            // Ideally refetch activity stream here, but it polls or we can trigger a global verify
            window.location.reload(); // Simple refresh for now to show new comment in activity
        } catch (error) {
            console.error("Failed to add comment:", error);
            alert("Failed to submit comment.");
        } finally {
            setIsAddingComment(false);
        }
    };

    const handleCommit = async () => {
        if (!commitAmount || !commitHead || !id || !data) {
            alert("Please select a budget head and enter an amount.");
            return;
        }

        try {
            await submitCommit({
                doctype: "Reimbursement",
                name: id,
                project_name: data.project_name,
                commit_amount: parseFloat(commitAmount),
                budget_head: commitHead,
                bmr: "" // Optional BMR
            });
            alert("Commitment submitted successfully!");
            setCommitAmount("");
            // Trigger budget refresh if possible (e.g. reload or refetch hook)
            window.location.reload();
        } catch (error: any) {
            console.error("Commit failed:", error);
            alert(`Commitment failed: ${error.message || "Unknown error"}`);
        }
    };

    const handlePayment = async () => {
        if (!paymentAmount || !commitHead || !id || !data) {
            alert("Please select a budget head and enter an amount.");
            return;
        }

        try {
            await submitPayment({
                doctype: "Reimbursement",
                name: id,
                project_name: data.project_name,
                payment_amount: parseFloat(paymentAmount),
                budget_head: commitHead,
                bmr: "" // Optional BMR
            });
            alert("Payment recorded successfully!");
            setPaymentAmount("");
            window.location.reload();
        } catch (error: any) {
            console.error("Payment failed:", error);
            alert(`Payment failed: ${error.message || "Unknown error"}`);
        }
    };

    const handleSubmit = async () => {
        if (!data || isSubmitting) return;

        if (!confirm('Are you sure you want to submit this reimbursement application? This action cannot be undone.')) {
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await submitDoc({
                docname: data.name
            });

            console.log('Submit response:', response);
            alert('Reimbursement submitted successfully!');

            // Reload the data to get updated status
            const refreshed = await fetchDoc({
                doctype: 'Reimbursement',
                name: data.name
            });
            if (refreshed?.message) {
                setData(refreshed.message);
            }
        } catch (err: any) {
            console.error('Error submitting reimbursement:', err);
            alert(`Failed to submit: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            if (!id) {
                setError('No reimbursement ID provided');
                setLoading(false);
                return;
            }

            try {
                const response = await fetchDoc({
                    doctype: 'Reimbursement',
                    name: id
                });

                if (response?.message) {
                    const docData = response.message;
                    setData(docData);

                    // Resolve linked field names
                    const nameMap: Record<string, string> = {};

                    // Resolve department names (Department_prornd doctype with dept_name field)
                    if (docData.reimbursement_for_department) {
                        nameMap.reimbursement_for_department = await resolveLinkName('Department_prornd', docData.reimbursement_for_department, 'dept_name');
                    }
                    if (docData.applicant_department) {
                        nameMap.applicant_department = await resolveLinkName('Department_prornd', docData.applicant_department, 'dept_name');
                    }

                    // Resolve account head name (Budget Head doctype with budget_head field)
                    if (docData.account_head) {
                        nameMap.account_head = await resolveLinkName('Budget Head', docData.account_head, 'budget_head');
                    }

                    setResolvedNames(nameMap);
                } else {
                    setError('Reimbursement not found');
                }
            } catch (err) {
                console.error('Error fetching reimbursement:', err);
                setError('Failed to load reimbursement details');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, fetchDoc, fetchLinkValue]);

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'Pending':
                return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'Rejected':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'Draft':
                return 'bg-slate-100 text-slate-800 border-slate-300';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-300';
        }
    };

    // Generate HTML for download/print
    const generateDownloadHTML = () => {
        if (!data) return '';

        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const applicationDate = data.creation ? new Date(data.creation).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        }) : '-';

        // Calculate total amount from items
        const totalAmount = data.table_bosk?.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0) || 0;

        // Generate expenditure rows
        const expenditureRows = data.table_bosk?.map((item: any, index: number) => `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${item.r_date ? new Date(item.r_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                <td>${item.particulars || '-'}</td>
                <td>${item.vendors_name || '-'}</td>
                <td style="text-align: center;">${(parseFloat(item.amount) || 0).toLocaleString('en-IN')}</td>
                <td style="color: blue; text-decoration: underline;">${item.uploads ? 'Attached' : 'No file'}</td>
            </tr>
        `).join('') || '<tr><td colspan="6" style="text-align: center;">No items</td></tr>';

        // Declaration items
        const declarations = [
            'None of the items are purchased or under rate contract.',
            'The items purchased were approved by the funding agency and I have enclosed the original cash memo/ retail invoice/ money receipt initialed by the Drawer.',
            '"I, am personally satisfied that goods purchased are of the requisite quality and specification and have been purchased from a reliable supplier at a reasonable price."',
            'I stock entered the items, and entered the stock entry details on the reverse side of the cash memo/ money receipt with my signature.'
        ];

        const acceptedDeclarations = declarations
            .filter((_, i) => data[`dec${i + 1}`])
            .map((dec) => `<li>${dec}</li>`)
            .join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reimbursement - ${data.name}</title>
    <style>
        @page { size: A4; margin: 10mm; }
        * { box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; color: #333; margin: 0; padding: 10px; background-color: #f0f0f0; }
        .page { width: 190mm; max-width: 100%; margin: 0 auto; background-color: white; padding: 15px 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1); position: relative; min-height: 277mm; }
        .top-meta { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 8px; color: #666; }
        .header-box { border: 1px solid #000; padding: 8px 12px; display: flex; align-items: center; margin-bottom: 8px; }
        .logo-img { width: 60px; height: 60px; margin-right: 15px; object-fit: contain; }
        .header-text h1 { margin: 0; font-size: 16px; color: #2d3e8b; text-transform: uppercase; }
        .header-text h2 { margin: 0; font-size: 14px; color: #2d3e8b; }
        .header-text p { margin: 2px 0 0; font-weight: bold; font-size: 11px; }
        .barcode-container { margin-top: 5px; text-align: left; font-size: 10px; }
        .barcode { width: 150px; height: 25px; background: linear-gradient(90deg, #000 2%, transparent 2%, transparent 4%, #000 4%, #000 5%, transparent 5%, transparent 7%, #000 7%, #000 10%, transparent 10%, transparent 12%, #000 12%, #000 13%, transparent 13%, transparent 15%, #000 15%); background-size: 15px 100%; }
        .date-line { text-align: right; margin-bottom: 10px; font-size: 11px; }
        h2.main-title { text-align: center; font-weight: normal; font-size: 16px; margin: 10px 0 15px; }
        .details-grid { display: flex; gap: 20px; margin-bottom: 10px; }
        .details-section { flex: 1; }
        .section-header { border: 1px solid #000; text-align: center; font-weight: bold; padding: 4px; margin-bottom: 6px; background-color: #f5f5f5; font-size: 11px; }
        .info-row { display: flex; margin-bottom: 6px; font-size: 10px; }
        .info-label { width: 110px; font-weight: normal; color: #555; }
        .info-value { flex: 1; font-weight: 500; }
        .comments-box { border: 1px solid #000; margin-top: 10px; }
        .comment-content { padding: 6px 8px; font-size: 10px; }
        .comment-timestamp { text-align: right; padding: 2px 8px; color: #666; font-size: 9px; }
        .declaration-box { margin-top: 10px; border: 1px solid #000; }
        .declaration-content { padding: 6px 8px; font-size: 9px; }
        .declaration-content ol { padding-left: 15px; margin: 5px 0; }
        .declaration-content li { margin-bottom: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
        th, td { border: 1px solid #000; padding: 5px; text-align: left; vertical-align: top; }
        th { background-color: #f5f5f5; text-align: center; font-size: 10px; }
        .footer-info { margin-top: 15px; font-size: 10px; }
        .footer-info p { margin: 3px 0; }
        .bottom-meta { position: absolute; bottom: 8px; left: 20px; right: 20px; display: flex; justify-content: space-between; font-size: 9px; border-top: 1px solid #ddd; padding-top: 4px; color: #666; }
        @media print { 
            body { background: none; padding: 0; } 
            .page { box-shadow: none; margin: 0; width: 100%; min-height: auto; padding: 10mm; } 
        }
    </style>
</head>
<body>
<div class="page">
    <div class="top-meta">
        <span>${data.name}</span>
        <span>https://rndops.iitg.ac.in</span>
    </div>

    <div class="header-box">
        <img src="http://172.16.135.27:8000/files/IITG_logo.png" alt="IITG Logo" class="logo-img" />
        <div class="header-text">
            <h1>भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</h1>
            <h2>INDIAN INSTITUTE OF TECHNOLOGY GUWAHATI</h2>
            <p>RESEARCH AND DEVELOPMENT CELL</p>
        </div>
    </div>

    <div class="barcode-container">
        <div class="barcode"></div>
        <div>${data.name}</div>
    </div>

    <div class="date-line">Date: ${formattedDate}</div>

    <h2 class="main-title">Application for Reimbursement</h2>

    <div class="details-grid">
        <div class="details-section">
            <div class="section-header">Applicant Details</div>
            <div class="info-row"><div class="info-label">Name:</div><div class="info-value">${data.account_holder_name || data.applicant_webmail || '-'}</div></div>
            <div class="info-row"><div class="info-label">Department:</div><div class="info-value">${resolvedNames.applicant_department || data.applicant_department || '-'}</div></div>
            <div class="info-row"><div class="info-label">Designation:</div><div class="info-value">${data.applicant_designation || '-'}</div></div>
            <div class="info-row"><div class="info-label">Email ID:</div><div class="info-value">${data.applicant_webmail || '-'}</div></div>
            <div class="info-row"><div class="info-label">Application Initiated by:</div><div class="info-value">${data.owner || '-'}</div></div>

            ${data.comment ? `
            <div class="comments-box">
                <div class="section-header">Comments</div>
                <div class="comment-content">${data.comment}</div>
                <div class="comment-timestamp">${applicationDate} ➔</div>
            </div>` : ''}

            ${acceptedDeclarations ? `
            <div class="declaration-box">
                <div class="section-header">Applicant's Declaration</div>
                <div class="declaration-content">
                    <ol>${acceptedDeclarations}</ol>
                </div>
            </div>` : ''}
        </div>

        <div class="details-section">
            <div class="section-header">Form Details</div>
            <div class="info-row"><div class="info-label">Own/ Other Project:</div><div class="info-value">${data.self_other || 'Own'}</div></div>
            <div class="info-row"><div class="info-label">Project Number:</div><div class="info-value">${data.project_number || '-'}</div></div>
            <div class="info-row"><div class="info-label">Project Name:</div><div class="info-value">${data.project_name || '-'}</div></div>
            <div class="info-row"><div class="info-label">Account Head:</div><div class="info-value">${resolvedNames.account_head || data.account_head || '-'}</div></div>
            <div class="info-row"><div class="info-label">Total Amount (₹):</div><div class="info-value">${totalAmount.toLocaleString('en-IN')}</div></div>
            <div class="info-row"><div class="info-label">Date and Time:</div><div class="info-value">${applicationDate}</div></div>
            <div class="info-row"><div class="info-label">Bank Name:</div><div class="info-value">${data.bank_name || '-'}</div></div>
            <div class="info-row"><div class="info-label">Bank Account Number:</div><div class="info-value">${data.bank_account_number || '-'}</div></div>
            <div class="info-row"><div class="info-label">IFSC Code:</div><div class="info-value">${data.ifsc_code || '-'}</div></div>
            <div class="info-row"><div class="info-label">Status:</div><div class="info-value">${data.workflow_state || 'Draft'}</div></div>
        </div>
    </div>

    <h3 style="text-align: center; margin-top: 30px;">Expenditure Details</h3>
    
    <table>
        <thead>
            <tr>
                <th>Sl No.</th>
                <th>Date</th>
                <th>Particulars</th>
                <th>Vendors Name</th>
                <th>Amount (Rs.)</th>
                <th>Attachments</th>
            </tr>
        </thead>
        <tbody>
            ${expenditureRows}
        </tbody>
    </table>

    <div class="footer-info">
        <p>Application Status: ${data.workflow_state || 'Draft'}</p>
        <p>Approved By:</p>
        <p style="margin-top: 20px;">N.B. This is a system generated form. Signature is not required.</p>
    </div>

    <div class="bottom-meta">
        <span>1 of 1</span>
        <span>${formattedDate}, ${formattedTime}</span>
    </div>
</div>
</body>
</html>`;
    };

    // Handle download/print
    const handleDownload = () => {
        const htmlContent = generateDownloadHTML();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            // Auto-trigger print dialog after a short delay for rendering
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    // Detail row component
    const DetailRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
        <div className="flex justify-between py-2 border-b border-gray-200 last:border-0">
            <span className="text-sm font-medium text-gray-900">{label}</span>
            <span className="text-sm font-bold text-black">{value || '-'}</span>
        </div>
    );

    if (loading) {
        return <GlobalLoader isLoading={true} />;
    }

    if (error || !data) {
        return (
            <div className="bg-gray-100 min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <FrappeCard className="text-center py-16">
                        <FileTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h2 className="text-xl font-bold text-black mb-2 uppercase">Error Loading Reimbursement</h2>
                        <p className="text-gray-900 mb-6">{error || 'Reimbursement not found'}</p>
                        <FrappeButton variant="primary" onClick={() => navigate(-1)}>
                            Go Back
                        </FrappeButton>
                    </FrappeCard>
                </main>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen">
            <GlobalLoader isLoading={isSubmitting} />
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <FrappeCard className="mb-8 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-3 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-gray-900" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-black uppercase tracking-tight">{data.name}</h1>
                                    <span className={cn(
                                        "px-3 py-1 text-sm font-bold rounded-md border",
                                        getStatusColor(data.workflow_state)
                                    )}>
                                        {data.workflow_state || 'Draft'}
                                    </span>
                                </div>
                                <p className="text-gray-900 mt-1 font-medium">Reimbursement Application</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right text-sm text-gray-900">
                                <div className="flex items-center gap-1 font-medium">
                                    <CalendarIcon className="w-4 h-4" />
                                    Created: {formatDate(data.creation)}
                                </div>
                                <div className="flex items-center gap-1 mt-1 font-medium">
                                    <UserIcon className="w-4 h-4" />
                                    By: {data.owner}
                                </div>
                            </div>
                            {/* Edit and Submit buttons - only show for Draft */}
                            {(data.workflow_state === 'Draft' || !data.workflow_state) && (
                                <>
                                    <FrappeButton
                                        variant="outline"
                                        onClick={() => navigate(`/reimbursement?edit=${data.name}`)}
                                    >
                                        Edit
                                    </FrappeButton>
                                    <FrappeButton
                                        variant="primary"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit'}
                                    </FrappeButton>
                                </>
                            )}
                            {/* Download button - always visible */}
                            <FrappeButton
                                variant="outline"
                                onClick={handleDownload}
                            >
                                <DownloadIcon className="w-4 h-4" />
                                Download
                            </FrappeButton>
                            {/* Workflow Actions */}
                            {id && (
                                <ReimbursementWorkflowActions
                                    docname={id}
                                    onActionComplete={() => window.location.reload()}
                                />
                            )}
                        </div>
                    </div>
                </FrappeCard>

                {/* Content Grid with Sidebar */}
                <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    {/* Main Content (3 cols) */}
                    <div className="xl:col-span-3 space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Applicant Details */}
                            <FrappeCard title="Applicant Details">
                                <div className="space-y-1">
                                    <DetailRow label="Applicant Webmail" value={data.applicant_webmail} />
                                    <DetailRow label="Department" value={resolvedNames.applicant_department || data.applicant_department} />
                                    <DetailRow label="Designation" value={data.applicant_designation} />
                                </div>
                            </FrappeCard>

                            {/* Reimbursement For */}
                            <FrappeCard title="Reimbursement For">
                                <div className="space-y-1">
                                    <DetailRow label="Webmail ID" value={data.reimbursement_for_id} />
                                    <DetailRow label="Department" value={resolvedNames.reimbursement_for_department || data.reimbursement_for_department} />
                                    <DetailRow label="Designation" value={data.reimbursement_for_designation} />
                                </div>
                            </FrappeCard>

                            {/* Bank Details */}
                            <FrappeCard title="Bank Details">
                                <div className="space-y-1">
                                    <DetailRow label="Bank Name" value={data.bank_name} />
                                    <DetailRow label="Account Holder" value={data.account_holder_name} />
                                    <DetailRow label="Account Number" value={data.bank_account_number} />
                                    <DetailRow label="IFSC Code" value={data.ifsc_code} />
                                </div>
                            </FrappeCard>

                            {/* Project Details */}
                            <FrappeCard title="Project Details">
                                <div className="space-y-1">
                                    <DetailRow label="Project Number" value={data.project_number} />
                                    <DetailRow label="Project Name" value={data.project_name} />
                                    <DetailRow label="Account Head" value={resolvedNames.account_head || data.account_head} />
                                    {data.other_head && <DetailRow label="Other Head" value={data.other_head} />}
                                </div>
                            </FrappeCard>

                            {/* Particulars of Items Table */}
                            {data.table_bosk && data.table_bosk.length > 0 && (
                                <FrappeCard title="Particulars of Items" className="lg:col-span-2">
                                    <div className="overflow-x-auto border border-gray-300 rounded-lg">
                                        <table className="min-w-full divide-y divide-gray-300">
                                            <thead className="bg-gray-200">
                                                <tr className="divide-x divide-gray-300">
                                                    <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase">Date</th>
                                                    <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase">Vendor's Name</th>
                                                    <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase">Particulars</th>
                                                    <th className="px-4 py-3 text-right text-sm font-bold text-black uppercase">Amount</th>
                                                    <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase">Attachment</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-300 bg-white">
                                                {data.table_bosk.map((item: any, index: number) => (
                                                    <tr key={item.name || index} className="hover:bg-gray-50 divide-x divide-gray-300">
                                                        <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                                                            {item.r_date ? new Date(item.r_date).toLocaleDateString('en-IN') : '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.vendors_name || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900">{item.particulars || '-'}</td>
                                                        <td className="px-4 py-3 text-sm text-black font-bold text-right">
                                                            ₹{(parseFloat(item.amount) || 0).toLocaleString('en-IN')}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm">
                                                            {item.uploads ? (
                                                                <a
                                                                    href={item.uploads}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[#0EA5A4] font-bold hover:underline"
                                                                >
                                                                    View File
                                                                </a>
                                                            ) : (
                                                                <span className="text-gray-500">No file</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-3 text-sm font-bold text-black text-right uppercase">Total Amount:</td>
                                                    <td className="px-4 py-3 text-sm font-bold text-black text-right">
                                                        ₹{data.table_bosk.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString('en-IN')}
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </FrappeCard>
                            )}

                            {/* Comments */}
                            {data.comment && (
                                <FrappeCard title="Comments" className="lg:col-span-2">
                                    <p className="text-gray-900 whitespace-pre-wrap font-medium">{data.comment}</p>
                                </FrappeCard>
                            )}

                            {/* Declarations */}
                            <FrappeCard title="Declarations" className="lg:col-span-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map(num => (
                                        <div key={num} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <div className={cn(
                                                "w-6 h-6 rounded flex items-center justify-center text-white text-sm font-bold",
                                                data[`dec${num}`] ? "bg-emerald-600" : "bg-gray-400"
                                            )}>
                                                {data[`dec${num}`] ? "✓" : ""}
                                            </div>
                                            <span className="text-sm font-medium text-gray-900">Declaration {num} {data[`dec${num}`] ? 'Accepted' : 'Not Accepted'}</span>
                                        </div>
                                    ))}
                                </div>
                            </FrappeCard>

                            {/* Meta Information */}
                            <FrappeCard title="Meta Information" className="lg:col-span-2">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <DetailRow label="Created" value={formatDate(data.creation)} />
                                    <DetailRow label="Last Modified" value={formatDate(data.modified)} />
                                    <DetailRow label="Owner" value={data.owner} />
                                </div>
                            </FrappeCard>
                        </div>
                    </div>

                    {/* Right Sidebar (1 col) */}
                    <aside className="xl:col-span-1 space-y-6">
                        {/* Section 0: Project Budget Overview */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Project Budget</h3>
                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    <p className="text-sm font-semibold text-gray-700">Total Available</p>
                                    <p className="text-xl font-bold text-[#0EA5A4]">₹ {commitableBalance.toLocaleString('en-IN')}</p>
                                </div>
                                <button
                                    onClick={() => setIsLedgerOpen(true)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#E0F7F6] text-[#0EA5A4] font-bold text-sm hover:bg-[#B2DFDB] transition-colors"
                                >
                                    <LedgerIcon className="w-4 h-4" />
                                    View Project Ledger
                                </button>
                            </div>
                        </div>

                        {/* Section 1: Latest Activity */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center justify-between">
                                Latest Activity
                            </h3>
                            {id && <ActivityStream doctype="Reimbursement" docname={id} />}
                        </div>

                        {/* Section 2: Add Comment */}
                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-3">Add Comment</h3>
                            <Textarea
                                className="w-full border border-gray-300 p-3 rounded-lg text-sm mb-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
                                rows={3}
                                placeholder="Type your comment here..."
                                value={sidebarComment}
                                onChange={(e) => setSidebarComment(e.target.value)}
                            />
                            <FrappeButton
                                className="w-full"
                                variant="primary"
                                onClick={handleSidebarCommentSubmit}
                                disabled={isAddingComment}
                            >
                                {isAddingComment ? "Submitting..." : "Submit Comment"}
                            </FrappeButton>
                        </div>

                        {/* Section 3: Make a Commitment (Conditional) */}
                        {(data.workflow_state === "Approved" || data.workflow_state === "Pending Staff Approval") && isRnDStaff && !isCommitted && (
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Make a Commitment</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Budget Head</label>
                                        <select
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
                                            value={commitHead}
                                            onChange={(e) => setCommitHead(e.target.value)}
                                        >
                                            {budgetHeads.length > 0 ? (
                                                budgetHeads.map((head) => (
                                                    <option key={head} value={head}>{head}</option>
                                                ))
                                            ) : (
                                                <option value="">No Budget Heads</option>
                                            )}
                                        </select>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Available: <span className="font-medium text-[#0EA5A4]">₹ {actualBalance.toLocaleString('en-IN')}</span>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                                        <input
                                            type="number"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
                                            placeholder="e.g., 5000"
                                            value={commitAmount}
                                            onChange={(e) => setCommitAmount(e.target.value)}
                                        />
                                    </div>
                                    <FrappeButton
                                        className="w-full"
                                        variant="primary"
                                        onClick={handleCommit}
                                        disabled={isCommitting}
                                    >
                                        {isCommitting ? "Submitting..." : "Submit Commitment"}
                                    </FrappeButton>
                                </div>
                            </div>
                        )}

                        {/* Section 4: Record Payment (Conditional) */}
                        {(data.workflow_state === "Approved" || data.workflow_state === "Pending Staff Approval") && isRnDStaff && (
                            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-lg font-bold text-gray-900 mb-4">Record Payment</h3>
                                {isCommitted ? (
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-1">
                                            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">Linked Commitment</p>
                                            <div className="flex justify-between items-end">
                                                <p className="text-sm font-medium text-blue-900">{linkedCommitment?.head}</p>
                                                <p className="text-lg font-bold text-blue-700">₹ {linkedCommitment?.committed.toLocaleString('en-IN')}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹)</label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
                                                placeholder="e.g., 5000"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                max={linkedCommitment?.committed}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Paying against commitment. Max: ₹{linkedCommitment?.committed.toLocaleString('en-IN')}
                                            </p>
                                        </div>
                                        <FrappeButton
                                            className="w-full"
                                            variant="outline"
                                            onClick={handlePayment}
                                            disabled={isPaying || !paymentAmount || parseFloat(paymentAmount) > (linkedCommitment?.committed || 0)}
                                        >
                                            {isPaying ? "Processing..." : "Submit Payment"}
                                        </FrappeButton>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 px-4 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                                        <div className="mx-auto w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center mb-3 text-gray-400">
                                            <LedgerIcon className="w-5 h-5" />
                                        </div>
                                        <p className="text-sm font-medium text-gray-900">Commitment Required</p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Please make a commitment above before recording payment for this reimbursement.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </aside>
                </div>
            </main>

            {/* Budget Ledger Modal */}
            {isLedgerOpen && (
                <BudgetLedgerModal
                    isOpen={isLedgerOpen}
                    onClose={() => setIsLedgerOpen(false)}
                    budgetData={budgetData}
                    actualBalance={actualBalance}
                    commitableBalance={commitableBalance}
                    heads={budgetHeads}
                />
            )}
        </div>
    );
};

// --- BUDGET LEDGER MODAL ---
interface BudgetLedgerModalProps {
    isOpen: boolean;
    onClose: () => void;
    budgetData: any[];
    heads: string[];
    actualBalance: number;
    commitableBalance: number;
}

const BudgetLedgerModal = ({ isOpen, onClose, budgetData, heads, actualBalance, commitableBalance }: BudgetLedgerModalProps) => {
    const [activeLedgerTab, setActiveLedgerTab] = useState("All");
    const ledgerHeadTabs = ["All", ...heads];

    if (!isOpen) return null;

    // Filter data based on active tab
    const filteredLedgerData = activeLedgerTab === "All"
        ? budgetData
        : budgetData.filter((e: any) => (e.head || e.accountHead || "").trim().toLowerCase() === activeLedgerTab.trim().toLowerCase());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white w-full max-w-6xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Project Budget Ledger</h2>
                        <div className="flex gap-4 mt-1 text-sm">
                            <span className="text-gray-600">Actual: <span className="font-bold text-[#0EA5A4]">₹ {actualBalance.toLocaleString('en-IN')}</span></span>
                            <span className="text-gray-600">Commitable: <span className="font-bold text-gray-900">₹ {commitableBalance.toLocaleString('en-IN')}</span></span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <span className="sr-only">Close</span>
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Tabs */}
                    <div className="flex overflow-x-auto border-b border-gray-200 px-6 pt-4 gap-2 bg-white">
                        {ledgerHeadTabs.map((tab) => {
                            const tabEntries = tab === "All"
                                ? budgetData
                                : budgetData.filter((e: any) => (e.head || e.accountHead || "").trim().toLowerCase() === tab.trim().toLowerCase());
                            const lastEntryForHead = tabEntries.length > 0 ? tabEntries[tabEntries.length - 1] : null;
                            const tabBalance = tab === "All"
                                ? tabEntries.reduce((acc: number, e: any) => acc + (e.received || 0) - (e.committed || 0) - (e.payment || 0), 0)
                                : (lastEntryForHead?.commitableBalance || 0);

                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveLedgerTab(tab)}
                                    className={cn(
                                        "px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors pb-3",
                                        activeLedgerTab === tab
                                            ? "border-[#0EA5A4] text-[#0EA5A4]"
                                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                                    )}
                                >
                                    {tab} <span className="ml-1 text-xs opacity-70">({tabEntries.length})</span>
                                    {tab !== "All" && <span className="ml-2 font-mono text-xs opacity-90">₹{tabBalance.toLocaleString('en-IN')}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto p-6 bg-gray-50">
                        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-[#F9FAFB]">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">TID</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Date</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Particulars</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">BMR</th>
                                        <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs">Fund Received</th>
                                        <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs">Commit Amt</th>
                                        <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs">Commitable Bal</th>
                                        <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs">Payment Amt</th>
                                        <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs">Payment Bal</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredLedgerData.length > 0 ? (
                                        filteredLedgerData.map((row: any, index: number) => (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-500">{row.sl}</td>
                                                <td className="px-4 py-3 text-gray-900 whitespace-nowrap">{row.date}</td>
                                                <td className="px-4 py-3 text-gray-900 font-medium">
                                                    <div className="max-w-xs truncate" title={row.particulars}>{row.particulars}</div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500">{row.bmr || '-'}</td>
                                                <td className="px-4 py-3 text-right font-medium text-green-600">{row.received ? row.received.toLocaleString('en-IN') : '-'}</td>
                                                <td className="px-4 py-3 text-right font-medium text-red-600">{row.committed ? row.committed.toLocaleString('en-IN') : '-'}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-800">{row.commitableBalance?.toLocaleString('en-IN') || '-'}</td>
                                                <td className="px-4 py-3 text-right font-medium text-red-600">{row.payment ? row.payment.toLocaleString('en-IN') : '-'}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-800">
                                                    {activeLedgerTab === "All"
                                                        ? row.actualBalance?.toLocaleString('en-IN')
                                                        : (row as any).headActualBalance?.toLocaleString('en-IN')
                                                    }
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={row.status === 'Paid' ? 'text-green-600 font-medium' : row.status === 'Pending' ? 'text-amber-600 font-medium' : ''}>
                                                        {row.status || '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={10} className="px-4 py-12 text-center text-gray-500 italic">No ledger entries found for this selection.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReimbursementDetails;
