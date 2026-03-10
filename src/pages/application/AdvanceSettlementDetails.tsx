import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../../components/RndSidebar";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { FileTextIcon, CalendarIcon, UserIcon, DownloadIcon } from "lucide-react";
import { PageHeader } from '@/components/common/PageHeader';
import { GlobalLoader } from '@/components/ui/global-loader';
import { advanceSettlementAPI } from '@/services/apiService';
import { useUserRoles } from '../../components/UserRole';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useProjectBudget } from '@/hooks/useProjectBudget';
import { ProjectLedgerModal } from '../../components/ProjectLedgerModal';
import { Wallet as WalletIcon, CheckCircle2 } from 'lucide-react';

// --- TYPE DEFINITIONS ---
interface AdvanceSettlementData {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    workflow_state: string;
    project_name: string;
    project_code: string;
    account_head: string;
    total_amount: number;
    temporary_advance_application: string;
    bank_account_number: string;
    bank_account_holders_name: string;
    docstatus: number;
    expenditure_details: Array<{
        expenditure_date: string;
        description: string;
        particulars: string;
        amount: number;
        amount_in_rs: number;
        [key: string]: any;
    }>;
    [key: string]: any;
}

// Frappe-styled components
const FrappeCard = ({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm", className)}>
        {title && (
            <div className="px-6 py-4 border-b border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">{title}</h3>
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
            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 disabled:opacity-50 disabled:cursor-not-allowed",
            variant === 'primary' && "bg-[#D97757] text-white hover:bg-[#D97757] shadow-sm hover:shadow-md",
            variant === 'ghost' && "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
            variant === 'outline' && "bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800",
            className
        )}
    >
        {children}
    </button>
);

const AdvanceSettlementDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<AdvanceSettlementData | null>(null);
    const [budgetHeadName, setBudgetHeadName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { call: fetchDoc } = useFrappePostCall<{ message: AdvanceSettlementData }>('frappe.client.get');
    const { call: fetchBudgetHead } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: submitForm } = useFrappePostCall(advanceSettlementAPI.submit);
    const { call: submitCommit, loading: isCommitting } = useFrappePostCall("rndopsapp.rndopsapp.commitPayment.submit_commit_data");
    const { call: submitPayment, loading: isPaying } = useFrappePostCall("rndopsapp.rndopsapp.commitPayment.submit_payment_data");


    // Auth & Roles
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isRnDStaff = roles.some(r =>
        r === "RnD Staff" || r === "R&D Staff" || r === "Research and Development Staff" || r === "System Manager" || r === "staff, RnD" || r === "Hos, RnD (Head of Section, RnD)"
    );

    // Budget & Payment State
    const [commitAmount, setCommitAmount] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");

    const [commitHead, setCommitHead] = useState("");
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string; uid?: string }[]>([]);

    // Fetch Budget Heads for Ledger (reusing logic pattern)
    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch('/api/v2/document/Budget%20Head?fields=["budget_head","id","name"]&order_by=id%20asc');
                const result = await response.json();
                if (result?.data) {
                    setBudgetHeadList(result.data.map((item: any) => ({
                        name: item.budget_head,
                        id: item.id,
                        uid: item.name
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch Budget Heads:", err);
            }
        };
        fetchBudgetHeads();
    }, []);

    // Load Project Budget Data
    const projectTitle = data?.project_code || "";
    const { budgetData, heads: budgetHeads } = useProjectBudget(projectTitle);

    // Auto-select head/amount if already committed
    const linkedCommitment = budgetData.find(e => e.ref === (id || "") && e.type === 'commitment');
    const isCommitted = !!linkedCommitment;

    useEffect(() => {
        if (data?.account_head) {
            // Check if budgetHeadList has loaded and we need to resolve ID to Name
            const resolvedHead = budgetHeadList.find(
                h => h.uid === data.account_head || h.id === data.account_head || h.name === data.account_head
            );
            if (resolvedHead) {
                setCommitHead(resolvedHead.name);
            } else {
                setCommitHead(data.account_head);
            }
        } else if (budgetHeads.length > 0 && !commitHead) {
            setCommitHead(budgetHeads[0]);
        }

        if (data?.total_amount) {
            setCommitAmount(prev => prev || String(data.total_amount));
        }
    }, [budgetHeads, data, budgetHeadList]);

    useEffect(() => {
        if (linkedCommitment) {
            setCommitHead(linkedCommitment.head || "");
            if (!paymentAmount) setPaymentAmount(String(linkedCommitment.committed));
        }
    }, [linkedCommitment]);

    // Handlers
    const handleCommit = async () => {
        if (!commitAmount || !commitHead || !id || !data) {
            alert("Please select a budget head and enter an amount.");
            return;
        }
        try {
            // Fetch TID of parent Temporary Advance from ledger
            let parentTid: string = "";
            try {
                const projectCode = data.project_code || '';
                const headEntry = budgetHeadList.find(h => h.name === commitHead || h.uid === commitHead);
                const accountHeadId = headEntry?.id || commitHead;
                const parentAppId = data.temporary_advance_application || '';
                const ledgerUrl = `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectCode)}&accountHeadId=${encodeURIComponent(String(accountHeadId))}`;
                console.log('=== FETCHING PARENT TID ===', { parentAppId, ledgerUrl });
                const ledgerRes = await fetch(ledgerUrl);
                if (ledgerRes.ok) {
                    const ledgerData = await ledgerRes.json();
                    const entries = Array.isArray(ledgerData) ? ledgerData : [];
                    const parentEntry = entries.find((entry: any) => entry.frapAppId === parentAppId);
                    if (parentEntry) {
                        parentTid = String(parentEntry.transactionId);
                        console.log('Parent TID found:', parentTid, 'from entry:', parentEntry);
                    } else {
                        console.log('No parent entry found for frapAppId:', parentAppId, 'in', entries.length, 'entries');
                    }
                }
            } catch (ledgerErr) {
                console.error('Failed to fetch parent TID from ledger:', ledgerErr);
            }

            if (!parentTid) {
                alert("Could not find the parent Temporary Advance TID in the ledger. Please ensure the Temporary Advance has been committed first.");
                return;
            }

            const commitPayload = {
                doctype: "Advance Settlement",
                frapAppId: id,
                name: id,
                project_name: data.project_name,
                commit_amount: parseFloat(commitAmount),
                budget_head: commitHead,
                bmr: "",
                refDetails: parentTid
            };
            console.log('=== COMMIT PAYLOAD ===', JSON.stringify(commitPayload, null, 2));
            await submitCommit(commitPayload);

            // Query ledger to get the TID for this commitment
            let tid: number | string | null = null;
            try {
                const projectCode = data.project_code || '';
                // Look up the numeric budget head ID from the list
                const headEntry = budgetHeadList.find(h => h.name === commitHead || h.uid === commitHead);
                const accountHeadId = headEntry?.id || commitHead;
                const ledgerUrl = `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectCode)}&accountHeadId=${encodeURIComponent(String(accountHeadId))}`;
                const ledgerRes = await fetch(ledgerUrl);
                if (ledgerRes.ok) {
                    const ledgerData = await ledgerRes.json();
                    const entries = Array.isArray(ledgerData) ? ledgerData : [];
                    // Find the entry matching our frapAppId
                    const matchingEntry = entries.find((entry: any) => entry.frapAppId === id);
                    if (matchingEntry) {
                        tid = matchingEntry.transactionId;
                        console.log('=== COMMIT TID FOUND ===');
                        console.log('TID:', tid);
                        console.log('refDetails:', matchingEntry.refDetails);
                        console.log('Full entry:', matchingEntry);
                    }
                }
            } catch (ledgerErr) {
                console.error('Failed to fetch TID from ledger:', ledgerErr);
            }

            alert(`Commitment submitted successfully!${tid ? ` TID: ${tid}` : ''}`);
            setCommitAmount("");
            // window.location.reload();
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
                doctype: "Advance Settlement",
                name: id,
                project_name: data.project_name,
                payment_amount: parseFloat(paymentAmount),
                budget_head: commitHead,
                bmr: "",
                frapAppId: id,
                moduleName: "Advance Settlement"
            });
            alert("Payment recorded successfully!");
            setPaymentAmount("");
            window.location.reload();
        } catch (error: any) {
            console.error("Payment failed:", error);
            alert(`Payment failed: ${error.message || "Unknown error"}`);
        }
    };


    useEffect(() => {
        const loadData = async () => {
            if (!id) {
                setError('No Settlement ID provided');
                setLoading(false);
                return;
            }

            try {
                const response = await fetchDoc({
                    doctype: 'Advance Settlement',
                    name: id
                });

                if (response?.message) {
                    const doc = response.message;
                    setData(doc);

                    // Fetch Budget Head Name if available
                    if (doc.account_head) {
                        try {
                            const bhResponse = await fetchBudgetHead({
                                doctype: 'Budget Head',
                                name: doc.account_head
                            });
                            console.log('>>> Budget Head Response:', bhResponse); // Debug log

                            if (bhResponse?.message) {
                                const bh = bhResponse.message;
                                // Try in order of likelihood
                                const name = bh.budget_head || bh.budget_head_name || bh.head_name || bh.name;
                                if (name) setBudgetHeadName(name);
                            }
                        } catch (e) {
                            console.warn("Could not fetch budget head details", e);
                        }
                    }
                } else {
                    setError('Settlement not found');
                }
            } catch (err) {
                console.error('Error fetching settlement:', err);
                setError('Failed to load settlement details');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, fetchDoc, fetchBudgetHead]);

    const handleSubmit = async () => {
        if (!data) return;
        if (!window.confirm("Are you sure you want to submit this settlement? This action cannot be undone.")) return;

        setIsSubmitting(true);
        try {
            await submitForm({ docname: data.name });
            // Refresh data
            window.location.reload();
        } catch (err) {
            console.error("Error submitting settlement:", err);
            alert("Failed to submit settlement. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };



    // Generate HTML for download/print
    const generateDownloadHTML = () => {
        if (!data) return '';

        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const formattedTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

        const displayStatus = data.workflow_state || (data.docstatus === 1 ? 'Submitted' : 'Draft');

        // Generate expenditure rows
        const expenditureRows = data.expenditure_details?.map((item: any, index: number) => `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${item.expenditure_date ? new Date(item.expenditure_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                <td>${item.description || item.particulars || '-'}</td>
                <td style="text-align: center;">${(parseFloat(item.amount || item.amount_in_rs) || 0).toLocaleString('en-IN')}</td>
            </tr>
        `).join('') || '<tr><td colspan="4" style="text-align: center;">No items</td></tr>';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advance Settlement - ${data.name}</title>
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

    <h2 class="main-title">Advance Settlement</h2>

    <div class="details-grid">
        <div class="details-section">
            <div class="section-header">Project Details</div>
            <div class="info-row"><div class="info-label">Project Name:</div><div class="info-value">${data.project_name || '-'}</div></div>
            <div class="info-row"><div class="info-label">Project Code:</div><div class="info-value">${data.project_code || '-'}</div></div>
            <div class="info-row"><div class="info-label">Budget Head:</div><div class="info-value">${budgetHeadName || data.account_head || '-'}</div></div>
            <div class="info-row"><div class="info-label">Reference Advance:</div><div class="info-value">${data.temporary_advance_application || '-'}</div></div>
            <div class="info-row"><div class="info-label">Account Name:</div><div class="info-value">${data.bank_account_holders_name || '-'}</div></div>
             <div class="info-row"><div class="info-label">Account No:</div><div class="info-value">${data.bank_account_number || '-'}</div></div>
        </div>
    </div>
    
    <div style="margin-top: 15px; margin-bottom: 15px; border-top: 1px dashed #ccc;"></div>

    <h3 style="text-align: center; margin-top: 10px;">Expenditure Details</h3>
    
    <table>
        <thead>
            <tr>
                <th>Sl No.</th>
                <th>Date</th>
                <th>Particulars</th>
                <th>Amount (Rs.)</th>
            </tr>
        </thead>
        <tbody>
            ${expenditureRows}
            <tr style="font-weight: bold; background-color: #f9f9f9;">
                <td colspan="3" style="text-align: right;">Total</td>
                <td style="text-align: center;">${(data.total_amount || 0).toLocaleString('en-IN')}</td>
            </tr>
        </tbody>
    </table>

    <div class="footer-info">
        <p>Application Status: ${displayStatus}</p>
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

    const handleDownload = () => {
        const htmlContent = generateDownloadHTML();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    if (loading) {
        return <GlobalLoader isLoading={true} />;
    }

    if (error || !data) {
        return (
            <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <FrappeCard className="text-center py-16">
                        <FileTextIcon className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 uppercase">Error Loading Settlement</h2>
                        <p className="text-zinc-900 dark:text-zinc-100 mb-6">{error || 'Settlement not found'}</p>
                        <FrappeButton variant="primary" onClick={() => navigate(-1)}>
                            Go Back
                        </FrappeButton>
                    </FrappeCard>
                </main>
            </div>
        );
    }

    // Determine display status (prefer workflow_state, fallback to docstatus map)
    const displayStatus = data.workflow_state || (data.docstatus === 1 ? 'Submitted' : data.docstatus === 2 ? 'Cancelled' : 'Draft');
    const isDraft = (!data.workflow_state || data.workflow_state === 'Draft') && data.docstatus === 0;

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                {/* Header */}
                <PageHeader
                    title={data.name}
                    status={displayStatus}
                    projectName={data.project_name}
                    projectNumber={data.project_code}
                >
                    <div className="flex items-center gap-3">
                        <div className="text-right text-sm text-zinc-900 dark:text-zinc-100 mr-2 hidden md:block">
                            <div className="flex items-center justify-end gap-1 font-medium">
                                <CalendarIcon className="w-4 h-4 text-zinc-400" />
                                {formatDate(data.creation)}
                            </div>
                            <div className="flex items-center justify-end gap-1 mt-1 font-medium text-zinc-500">
                                <UserIcon className="w-4 h-4 text-zinc-400" />
                                {data.owner}
                            </div>
                        </div>

                        {/* Submit Button - only for Draft */}
                        {isDraft && (
                            <FrappeButton
                                variant="primary"
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600 text-white"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Settlement'}
                            </FrappeButton>
                        )}

                        {/* Edit button - only for Draft */}
                        {isDraft && (
                            <FrappeButton
                                variant="outline"
                                onClick={() => navigate(`/advance-settlement?edit=${data.name}`)}
                            >
                                Edit
                            </FrappeButton>
                        )}

                        {/* Download button - always visible */}
                        <FrappeButton
                            variant="outline"
                            onClick={handleDownload}
                            className="px-3"
                        >
                            <DownloadIcon className="w-4 h-4" />
                        </FrappeButton>
                    </div>
                </PageHeader>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Project & Advance Info */}
                        <FrappeCard title="Details">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Project Name</label>
                                    <p className="text-zinc-900 dark:text-zinc-100 font-medium text-sm leading-relaxed">{data.project_name}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Project Code</label>
                                    <p className="text-zinc-900 dark:text-zinc-100 font-medium font-mono text-sm">{data.project_code || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Temporary Advance Ref</label>
                                    <p className="text-zinc-900 dark:text-zinc-100 font-medium text-sm text-blue-600 dark:text-blue-400">{data.temporary_advance_application || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Budget Head</label>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-zinc-400"></div>
                                        <p className="text-zinc-900 dark:text-zinc-100 font-medium">{budgetHeadName || data.account_head || '-'}</p>
                                    </div>
                                    {budgetHeadName && data.account_head !== budgetHeadName && (
                                        <p className="text-xs text-zinc-400 ml-4">{data.account_head}</p>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Account Holder</label>
                                    <p className="text-zinc-900 dark:text-zinc-100 font-medium">{data.bank_account_holders_name || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Account Number</label>
                                    <p className="text-zinc-900 dark:text-zinc-100 font-medium font-mono tracking-wide">{data.bank_account_number || '-'}</p>
                                </div>
                            </div>
                        </FrappeCard>

                        {/* Expenditure Table */}
                        <FrappeCard title="Expenditure Breakdown">
                            {data.expenditure_details?.length > 0 ? (
                                <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-zinc-50 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 uppercase font-semibold text-xs">
                                            <tr>
                                                <th className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">Date</th>
                                                <th className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">Particulars</th>
                                                <th className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                            {data.expenditure_details.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                    <td className="px-4 py-3 text-zinc-900 dark:text-zinc-100 font-medium whitespace-nowrap">
                                                        {item.expenditure_date ? formatDate(item.expenditure_date) : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                                                        {item.description || item.particulars}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                                        ₹ {Number(item.amount || item.amount_in_rs || 0).toLocaleString('en-IN')}
                                                    </td>
                                                </tr>
                                            ))}
                                            <tr className="bg-zinc-50/80 dark:bg-zinc-800/30 font-bold">
                                                <td colSpan={2} className="px-4 py-3 text-right text-zinc-600 dark:text-zinc-400 uppercase text-xs tracking-wider">Total Expenditure</td>
                                                <td className="px-4 py-3 text-right text-emerald-600 dark:text-emerald-400 text-base">
                                                    ₹ {(data.total_amount || 0).toLocaleString('en-IN')}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
                                    <p className="text-zinc-500 dark:text-zinc-400">No expenditure details recorded.</p>
                                </div>
                            )}
                        </FrappeCard>
                    </div>

                    <div className="space-y-6">
                        {/* Bank Details */}
                        {/* Staff Action Section */}
                        {isRnDStaff && (
                            <FrappeCard title="Advance Settlement Processing (Staff Only)" className="border-l-4 border-l-blue-500">
                                <div className="space-y-6">
                                    {/* Action Buttons */}
                                    <div className="flex gap-3">
                                        <FrappeButton
                                            onClick={() => setIsLedgerOpen(true)}
                                            variant="outline"
                                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                        >
                                            <WalletIcon className="w-4 h-4" />
                                            Check Ledger
                                        </FrappeButton>
                                    </div>

                                    {/* Commitment Section */}
                                    <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                                            1. Commitment
                                            {isCommitted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Budget Head</label>
                                                <select
                                                    value={commitHead}
                                                    onChange={(e) => setCommitHead(e.target.value)}
                                                    className="w-full p-2 text-sm border border-zinc-300 rounded-md bg-white dark:bg-zinc-900 dark:border-zinc-700"
                                                    disabled={isCommitted}
                                                >
                                                    <option value="">Select Head</option>
                                                    {budgetHeads.map(h => <option key={h} value={h}>{h}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Amount</label>
                                                <input
                                                    type="number"
                                                    value={commitAmount}
                                                    onChange={(e) => setCommitAmount(e.target.value)}
                                                    className="w-full p-2 text-sm border border-zinc-300 rounded-md bg-white dark:bg-zinc-900 dark:border-zinc-700"
                                                    placeholder="Enter amount"
                                                    disabled={isCommitted}
                                                />
                                            </div>
                                            <FrappeButton
                                                onClick={handleCommit}
                                                disabled={isCommitting || isCommitted || !commitAmount}
                                                variant="primary"
                                                className="w-full bg-blue-600 hover:bg-blue-700 border-blue-600"
                                            >
                                                {isCommitting ? "Committing..." : isCommitted ? "Committed" : "Commit Funds"}
                                            </FrappeButton>
                                        </div>
                                    </div>

                                    {/* Payment Section */}
                                    {/* <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-3">2. Payment Processing</h4>
                                        <div className="space-y-3">
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Budget Head</label>
                                                <input
                                                    type="text"
                                                    value={budgetHeadList.find(h => h.id === commitHead || h.name === commitHead)?.name || commitHead}
                                                    disabled
                                                    className="w-full p-2 text-sm border border-zinc-200 rounded-md bg-zinc-100 text-zinc-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-semibold text-zinc-500 mb-1 block">Payment Amount</label>
                                                <input
                                                    type="number"
                                                    value={paymentAmount}
                                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                                    className="w-full p-2 text-sm border border-zinc-300 rounded-md bg-white dark:bg-zinc-900 dark:border-zinc-700"
                                                    placeholder="Enter payment amount"
                                                />
                                            </div>
                                            <FrappeButton
                                                onClick={handlePayment}
                                                disabled={isPaying || !isCommitted || !paymentAmount}
                                                variant="primary"
                                                className="w-full bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                                            >
                                                {isPaying ? "Processing..." : "Record Payment"}
                                            </FrappeButton>
                                        </div>
                                    </div> */}
                                </div>
                            </FrappeCard>
                        )}

                        {/* Declarations (if needed) */}
                        <div className="px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
                            <div className="flex gap-3">
                                <FileTextIcon className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200">Declarations</h4>
                                    <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                                        The settlement against this advance is submitted within the stipulated period. All purchases followed standard institute procedures and do not exceed the approved advance amount.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Ledger Modal */}
                <ProjectLedgerModal
                    isOpen={isLedgerOpen}
                    onClose={() => setIsLedgerOpen(false)}
                    projectName={data.project_code}
                    budgetHeadList={budgetHeadList}
                />
            </main>
        </div>
    );
};

export default AdvanceSettlementDetails;
