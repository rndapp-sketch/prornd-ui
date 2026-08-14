import React, { useState, useEffect, useCallback } from 'react';
import { FaExclamationCircle, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// import { AppSidebar } from '@/components/RndSidebar';
import { useNavigate } from 'react-router-dom';
import { GlobalLoader } from '@/components/ui/global-loader';

import { ledgerService } from '@/services/ledgerService';
import type { CommitRecord } from '@/types/ledgerTypes';
import { PaymentForm } from '@/components/PaymentForm';
import { useUserRoles } from '@/components/UserRole';
import { useFrappeAuth, useFrappePostCall } from 'frappe-react-sdk';

// Define interfaces for payments
interface PaymentRecord {
    name: string;
    project_ref_number: string;
    budget_head: string;
    payment_amount: number;
    payment_date: string;
    payment_status: string;
    payment_bmr: string;
    payment_particular: string;
    owner: string;
    creation: string;
    modified: string;
    doctype?: string;  // Module/Doctype name
}

// Frappe-styled components
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
    children: React.ReactNode;
    onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
            variant === 'primary' && "bg-[#D97757] text-white hover:bg-[#D97757] shadow-md hover:shadow-lg border border-[#D97757]",
            variant === 'ghost' && "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 hover:text-zinc-900 dark:text-zinc-100",
            variant === 'outline' && "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
            variant === 'action' && "bg-[#D97757] text-white font-bold hover:bg-[#D97757] shadow-md hover:shadow-lg border-2 border-[#D97757]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

// Module IDs surfaced on the Miscellaneous Commit tab instead of Pending Commits.
const MISC_TAB_MODULE_IDS: Record<string, 'Miscellaneous Commit' | 'Recruitment Adhoc Contractual'> = {
    '25': 'Miscellaneous Commit',
    '11': 'Recruitment Adhoc Contractual',
};

const Payments: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);

    // Comprehensive check for RnD Staff roles
    const isRnDStaff = roles?.some((r: string) =>
        r === "RnD Staff" || r === "R&D Staff" || r === "Research and Development Staff" ||
        r === "System Manager" || r === "staff, RnD" || r === "Hos, RnD (Head of Section, RnD)"
    );

    const [currentPage, setCurrentPage] = useState(1);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [selectedDoctype, setSelectedDoctype] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);

    // New State for Commits and Tabs
    const [pendingCommits, setPendingCommits] = useState<CommitRecord[]>([]);
    const [activeTab, setActiveTab] = useState<'history' | 'commits' | 'misc'>('commits'); // Default to commits context
    const [commitPage, setCommitPage] = useState(1);
    const commitsPerPage = 50;
    const itemsPerPage = 10;

    // Search + module filter for the Pending Commits tab
    const [commitSearchQuery, setCommitSearchQuery] = useState('');
    const [debouncedCommitSearch, setDebouncedCommitSearch] = useState('');
    const [selectedCommitModule, setSelectedCommitModule] = useState<string>('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedCommitSearch(commitSearchQuery);
            setCommitPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [commitSearchQuery]);

    // --- Miscellaneous Commit tab state ---
    // Sourced entirely from the ledger (pendingCommits) — Miscellaneous Commit (module 25)
    // and Recruitment Adhoc Contractual (module 11) commits are both filtered out of the
    // Pending Commits tab above; this tab surfaces them instead of dropping them.
    const [miscSearchQuery, setMiscSearchQuery] = useState('');
    const [debouncedMiscSearch, setDebouncedMiscSearch] = useState('');
    const [selectedMiscType, setSelectedMiscType] = useState<string>('');
    const [miscPage, setMiscPage] = useState(1);
    const miscPerPage = 50;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedMiscSearch(miscSearchQuery);
            setMiscPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [miscSearchQuery]);

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedPaymentName, setSelectedPaymentName] = useState<string | null>(null);
    const [selectedCommit, setSelectedCommit] = useState<CommitRecord | null>(null); // For new payments

    // Pay confirmation (with mandatory comment) — used on the Miscellaneous Commit tab
    // before opening the Payment Form, mirroring the workflow-action comment pattern.
    const [payConfirm, setPayConfirm] = useState<{ open: boolean; commit: CommitRecord | null }>({ open: false, commit: null });
    const [payConfirmComment, setPayConfirmComment] = useState('');
    const [isSubmittingPayConfirm, setIsSubmittingPayConfirm] = useState(false);
    const [payConfirmError, setPayConfirmError] = useState<string | null>(null);
    const { call: addPayConfirmComment } = useFrappePostCall('rndopsapp.rndopsapp.api.add_project_comment');

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);


    // Fetch Pending Commits
    const fetchPendingCommits = useCallback(async () => {
        try {
            // Fetch commits for each status
            // const statuses = ['COMMITTED', 'SETTLED', 'PARTIALLY_PAID', 'OVERPAYMENT'];
            const statuses = ['COMMITTED', 'PARTIALLY_PAID', 'OVERPAYMENT'];
            const promises = statuses.map(status => ledgerService.getCommitsByStatus(status));

            const results = await Promise.all(promises);
            // Flatten results and sort by date descending (latest first)
            const allCommits = results.flat();
            allCommits.sort((a, b) => {
                const dateA = a.commitDate ? new Date(a.commitDate).getTime() : 0;
                const dateB = b.commitDate ? new Date(b.commitDate).getTime() : 0;
                return dateB - dateA;
            });
            console.log("allCommits:", allCommits);
            setPendingCommits(allCommits);
        } catch (err) {
            console.error('Failed to fetch pending commits', err);
        }
    }, []);

    // State for Budget Head Mapping
    const [budgetHeadMap, setBudgetHeadMap] = useState<Record<string, string>>({});

    // State for Module Name Mapping (moduleId -> module name)
    const [moduleNameMap, setModuleNameMap] = useState<Record<string, string>>({});

    // Fetch Budget Heads for mapping
    const fetchBudgetHeads = useCallback(async () => {
        try {
            const response = await fetch('/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0', {
                credentials: "include",
                headers: { Accept: "application/json" },
            });
            const data = await response.json();
            if (data?.data) {
                const map: Record<string, string> = {};
                data.data.forEach((h: any) => {
                    map[String(h.id)] = h.budget_head;
                });
                setBudgetHeadMap(map);
            }
        } catch (err) {
            console.error('Failed to fetch budget heads:', err);
        }
    }, []);

    // Fetch Module Registry to map moduleId (idx) -> doctype_name
    const fetchModuleRegistry = useCallback(async () => {
        // Fallback map in case API fails or is missing rows (covers all known modules 1–25)
        const fallbackMap: Record<string, string> = {
            '1': 'Project Registration',
            '2': 'Project Proposal',
            '3': 'Fund Received',
            '4': 'Fund Sanction',
            '5': 'Reimbursement',
            '6': 'Travel',
            '7': 'Temporary Advance',
            '8': 'Advance Settlement',
            '9': 'Direct Purchase',
            '10': 'Disbursal of Honorarium',
            '11': 'Recruitment Adhoc Contractual',
            '12': 'Disbursal of Consultancy',
            '13': 'TA DA Settlement',
            '14': 'ICSS_PO',
            '15': 'Loan Request',
            '16': 'Indent General Form',
            '17': 'Indent Cum Sanction Sheet',
            '18': 'sanction_sheet',
            '19': 'Selection Committee Report',
            '20': 'P_11 Form',
            '21': 'Leave Module',
            '22': 'Top Up Fellowship',
            '23': 'Project Staff Details',
            '24': 'Cancellation Request',
            '25': 'Miscellaneous Commit',
        };
        try {
            // Use GET to avoid CSRF requirements in dev/proxy environments
            const response = await fetch(
                '/api/method/frappe.client.get?doctype=Module%20Registry&name=pending-task',
                { credentials: 'include', headers: { Accept: 'application/json' } },
            );
            const data = await response.json();
            const rows = data?.message?.doctype_name;
            const map: Record<string, string> = { ...fallbackMap };
            if (Array.isArray(rows)) {
                rows.forEach((item: any) => {
                    if (item.idx != null && item.doctype_name) {
                        map[String(item.idx)] = item.doctype_name;
                    }
                });
            }
            setModuleNameMap(map);
        } catch (err) {
            console.error('Failed to fetch module registry, using fallback:', err);
            setModuleNameMap(fallbackMap);
        }
    }, []);

    // Fetch Payments
    // NOTE: We do NOT depend on moduleNameMap here to avoid an infinite loop.
    // moduleNameMap changes when fetchModuleRegistry completes, which would
    // re-create fetchPayments, re-trigger the useEffect, and loop forever.
    // Instead, we resolve module names in a useMemo on the payments data.
    const fetchPayments = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await ledgerService.getAllPayments();
            if (data && Array.isArray(data)) {
                const loadedPayments: PaymentRecord[] = data.map((p: any) => ({
                    name: String(p.transactionPaymentNumber),
                    project_ref_number: p.projectNumber,
                    budget_head: String(p.accountHeadId),
                    payment_amount: p.paymentAmount,
                    payment_date: p.paymentDate,
                    payment_status: p.paymentStatus,
                    payment_bmr: p.bmr,
                    payment_particular: p.paymentParticular,
                    owner: '-',
                    creation: p.paymentDate,
                    modified: p.paymentDate,
                    doctype: String(p.moduleId || ''), // store raw moduleId; resolved later via useMemo
                }));
                // Sort descending by date
                loadedPayments.sort((a, b) => {
                    const dateA = a.payment_date ? new Date(a.payment_date).getTime() : 0;
                    const dateB = b.payment_date ? new Date(b.payment_date).getTime() : 0;
                    return dateB - dateA;
                });
                setPayments(loadedPayments);
            }
        } catch (err) {
            console.error('Failed to fetch payments:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Filter out commits that have module ID '11' or resolved/raw module name 'Recruitment Adhoc Contractual'
    const filteredPendingCommits = React.useMemo(() => {
        return pendingCommits.filter(commit => {
            const rawMod = String(commit.moduleId || '');
            if (rawMod === '11' || rawMod === 'Recruitment Adhoc Contractual') {
                return false;
            }
            const resolvedName = moduleNameMap[rawMod];
            if (resolvedName === 'Recruitment Adhoc Contractual' || resolvedName === '11') {
                return false;
            }
            return true;
        });
    }, [pendingCommits, moduleNameMap]);

    // Module names present in the pending commits, for the "filter by module" dropdown
    const commitModuleOptions = React.useMemo(() => {
        const names = new Set<string>();
        filteredPendingCommits.forEach(c => {
            const name = c.moduleId ? (moduleNameMap[String(c.moduleId)] || String(c.moduleId)) : null;
            if (name) names.add(name);
        });
        return Array.from(names).sort();
    }, [filteredPendingCommits, moduleNameMap]);

    // Search + module filter applied on top of filteredPendingCommits
    const searchedPendingCommits = React.useMemo(() => {
        let result = filteredPendingCommits;

        if (selectedCommitModule) {
            result = result.filter(c => {
                const name = c.moduleId ? (moduleNameMap[String(c.moduleId)] || String(c.moduleId)) : '';
                return name === selectedCommitModule;
            });
        }

        if (debouncedCommitSearch) {
            const q = debouncedCommitSearch.toLowerCase();
            result = result.filter(c => {
                const budgetHeadName = budgetHeadMap[String(c.accountHeadId)] || String(c.accountHeadId || '');
                const moduleName = c.moduleId ? (moduleNameMap[String(c.moduleId)] || String(c.moduleId)) : '';
                return (
                    String(c.projectNumber ?? '').toLowerCase().includes(q) ||
                    String(c.frapAppId ?? '').toLowerCase().includes(q) ||
                    String(c.commitParticular ?? '').toLowerCase().includes(q) ||
                    String(c.refDetails ?? '').toLowerCase().includes(q) ||
                    budgetHeadName.toLowerCase().includes(q) ||
                    moduleName.toLowerCase().includes(q)
                );
            });
        }

        return result;
    }, [filteredPendingCommits, debouncedCommitSearch, selectedCommitModule, budgetHeadMap, moduleNameMap]);

    // Resolve module names on payments using the moduleNameMap (runs reactively when either changes)
    // Filter out module name or id 11 or "Recruitment Adhoc Contractual"
    const resolvedPayments = React.useMemo(() => {
        const filtered = payments.filter(p => {
            const rawMod = String(p.doctype || '');
            if (rawMod === '11' || rawMod === 'Recruitment Adhoc Contractual') {
                return false;
            }
            return true;
        });
        if (Object.keys(moduleNameMap).length === 0) return filtered;
        return filtered.map(p => ({
            ...p,
            doctype: p.doctype && moduleNameMap[p.doctype] ? moduleNameMap[p.doctype] : (p.doctype || 'AccountHeadPayment'),
        })).filter(p => p.doctype !== 'Recruitment Adhoc Contractual' && p.doctype !== '11');
    }, [payments, moduleNameMap]);

    useEffect(() => {
        fetchPendingCommits();
        fetchBudgetHeads();
        fetchModuleRegistry();
        fetchPayments();
    }, [fetchPendingCommits, fetchBudgetHeads, fetchModuleRegistry, fetchPayments]);

    // Miscellaneous Commit (module 25) and Recruitment Adhoc Contractual (module 11)
    // commits ARE staged in the ledger, but both are excluded from the Pending Commits
    // tab above — surface them here instead of dropping them entirely.
    const combinedMiscTabRows = React.useMemo(() => {
        return pendingCommits
            .filter(c => {
                const rawMod = String(c.moduleId || '');
                const resolvedName = moduleNameMap[rawMod];
                return MISC_TAB_MODULE_IDS[rawMod] || resolvedName === 'Miscellaneous Commit' || resolvedName === 'Recruitment Adhoc Contractual';
            })
            .map(c => {
                const rawMod = String(c.moduleId || '');
                const type = MISC_TAB_MODULE_IDS[rawMod] || (moduleNameMap[rawMod] as 'Miscellaneous Commit' | 'Recruitment Adhoc Contractual');
                return {
                    key: `ledger-${c.frapAppId || c.transactionCommitNumber}`,
                    type,
                    projectNumber: c.projectNumber,
                    budgetHead: budgetHeadMap[String(c.accountHeadId)] || String(c.accountHeadId),
                    appId: c.frapAppId || '-',
                    date: c.commitDate,
                    particulars: c.commitParticular,
                    refDetails: c.refDetails,
                    amount: c.commitAmount,
                    status: c.status,
                    commit: c,
                };
            });
    }, [pendingCommits, moduleNameMap, budgetHeadMap]);

    const filteredMiscTabRows = React.useMemo(() => {
        let result = combinedMiscTabRows;
        if (selectedMiscType) {
            result = result.filter(r => r.type === selectedMiscType);
        }
        if (debouncedMiscSearch) {
            const q = debouncedMiscSearch.toLowerCase();
            result = result.filter(r =>
                r.projectNumber?.toLowerCase().includes(q) ||
                r.appId?.toLowerCase().includes(q) ||
                r.particulars?.toLowerCase().includes(q) ||
                r.budgetHead?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [combinedMiscTabRows, selectedMiscType, debouncedMiscSearch]);

    // Client-side filtering
    const filteredPayments = React.useMemo(() => {
        let result = resolvedPayments;

        if (debouncedSearch) {
            const lowerSearch = debouncedSearch.toLowerCase();
            result = result.filter(p =>
                p.name?.toLowerCase().includes(lowerSearch) ||
                p.project_ref_number?.toLowerCase().includes(lowerSearch) ||
                p.payment_particular?.toLowerCase().includes(lowerSearch) ||
                p.owner?.toLowerCase().includes(lowerSearch)
            );
        }

        if (selectedStatus) {
            result = result.filter(p => (p.payment_status || 'PENDING') === selectedStatus);
        }

        if (selectedDoctype) {
            result = result.filter(p => (p.doctype || 'AccountHeadPayment') === selectedDoctype);
        }

        return result;
    }, [resolvedPayments, debouncedSearch, selectedStatus, selectedDoctype]);

    // Client-side pagination
    const paginatedPayments = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPayments, currentPage, itemsPerPage]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status);
        setCurrentPage(1);
    };

    const handleDoctypeChange = (doctype: string) => {
        setSelectedDoctype(doctype);
        setCurrentPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const getStatusBadge = (status: string) => {
        const s = status?.toUpperCase();
        let style = "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700";
        if (s === "COMMITTED") {
            style = "bg-blue-100 text-blue-800 border-blue-300";
        } else if (s === "SETTLED") {
            style = "bg-emerald-100 text-emerald-800 border-emerald-300";
        } else if (s === "PARTIALLY_PAID") {
            style = "bg-amber-100 text-amber-800 border-amber-300";
        } else if (s === "OVERPAYMENT") {
            style = "bg-purple-100 text-purple-800 border-purple-300";
        } else if (s === "PENDING" || s === "DRAFT") {
            style = "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border-zinc-400 dark:border-zinc-600";
        }
        return cn("px-2.5 py-1 rounded-md text-xs font-bold border uppercase", style);
    };

    const getPageNumbers = () => {
        const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
        const pages: (number | string)[] = [];
        const maxButtons = 3;

        if (totalPages <= maxButtons) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    // Open payment modal for editing
    const openPaymentModal = useCallback((payment: PaymentRecord) => {
        setSelectedPaymentName(payment.name);
        setSelectedCommit(null);
        setPaymentModalOpen(true);
    }, []);

    // Create New Payment from Commit
    const initiatePaymentForCommit = useCallback((commit: CommitRecord) => {
        setSelectedPaymentName(null);
        setSelectedCommit(commit);
        setPaymentModalOpen(true);
    }, []);

    // Open the "confirm with comment" dialog before paying a Miscellaneous Commit / Recruitment tab row.
    // The comment itself always gets saved against the Miscellaneous Commit doctype (see confirmPayWithComment).
    const requestPayConfirmation = useCallback((commit: CommitRecord) => {
        setPayConfirmComment('');
        setPayConfirmError(null);
        setPayConfirm({ open: true, commit });
    }, []);

    const cancelPayConfirmation = useCallback(() => {
        if (isSubmittingPayConfirm) return;
        setPayConfirm({ open: false, commit: null });
        setPayConfirmComment('');
        setPayConfirmError(null);
    }, [isSubmittingPayConfirm]);

    const confirmPayWithComment = useCallback(async () => {
        const commit = payConfirm.commit;
        if (!commit) return;
        const trimmedComment = payConfirmComment.trim();
        if (!trimmedComment) {
            setPayConfirmError('A comment is required before proceeding.');
            return;
        }
        setIsSubmittingPayConfirm(true);
        setPayConfirmError(null);
        try {
            // This confirm-with-comment dialog is only ever opened for Miscellaneous Commit
            // rows (requestPayConfirmation routes Recruitment Adhoc Contractual rows straight
            // to payment instead), so the comment always targets that doctype.
            if (commit.frapAppId) {
                await addPayConfirmComment({
                    doctype: 'Miscellaneous Commit',
                    docname: commit.frapAppId,
                    content: trimmedComment,
                });
            }
            setPayConfirm({ open: false, commit: null });
            setPayConfirmComment('');
            initiatePaymentForCommit(commit);
        } catch (err: any) {
            console.error('Failed to add payment confirmation comment:', err);
            setPayConfirmError(err?.message || 'Failed to save comment. Please try again.');
        } finally {
            setIsSubmittingPayConfirm(false);
        }
    }, [payConfirm.commit, payConfirmComment, addPayConfirmComment, initiatePaymentForCommit]);


    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
                <FrappeCard className="p-8 text-center">
                    <FaExclamationCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Error Loading Payments</h2>
                    <p className="text-zinc-900 dark:text-zinc-100">{error}</p>
                    <FrappeButton variant="primary" onClick={() => window.location.reload()} className="mt-4">
                        Retry
                    </FrappeButton>
                </FrappeCard>
            </div>
        );
    }

    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 0;
    const totalCount = filteredPayments.length;
    const currentCount = paginatedPayments.length;
    const indexOfFirstPayment = (currentPage - 1) * itemsPerPage;

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
            <GlobalLoader isLoading={isLoading} />
            {/* <AppSidebar /> */}

            <main className="flex-1 px-6 md:px-8 pt-7 pb-10 w-full overflow-hidden">
                {/* Header */}
                <FrappeCard className="mb-5 overflow-hidden p-0">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="flex items-start gap-3 px-5 py-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#D97757] hover:border-[#D97757]/30 hover:bg-[#D97757]/10 transition-colors"
                            aria-label="Go back"
                        >
                            <FaArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <div className="min-w-0">
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">Finance Operations</span>
                            <h1 className="mt-1 text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">Payments</h1>
                            <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">View and manage payment records.</p>
                        </div>
                    </div>
                </FrappeCard>

                {/* Tabs */}
                <div className="mb-4 flex gap-2 border-t-2 border-[#4A6CF7]/35 pt-4 dark:border-[#818CF8]/35 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('commits')}
                        className={cn(
                            "h-9 flex-shrink-0 rounded-lg border px-3 text-[11px] font-extrabold uppercase tracking-wide transition-colors",
                            activeTab === 'commits'
                                ? "bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A]"
                                : "border-[#C7D2FE] bg-[#EEF2FF]/55 text-[#1E3A8A] hover:bg-[#EEF2FF]"
                        )}
                    >
                        Pending Commits
                    </button>
                    <button
                        onClick={() => setActiveTab('misc')}
                        className={cn(
                            "h-9 flex-shrink-0 rounded-lg border px-3 text-[11px] font-extrabold uppercase tracking-wide transition-colors",
                            activeTab === 'misc'
                                ? "bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A]"
                                : "border-[#C7D2FE] bg-[#EEF2FF]/55 text-[#1E3A8A] hover:bg-[#EEF2FF]"
                        )}
                    >
                        Miscellaneous Commit
                    </button>
                    {/* Payment History tab hidden temporarily */}
                </div>

                {activeTab === 'commits' && (
                    <FrappeCard className="overflow-hidden p-0">
                        <div className="bg-[#FAFAF9] dark:bg-[#27272A] p-4 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                            <p className="text-[12px] uppercase tracking-[0.12em] text-[#1E3A8A] dark:text-[#C7D2FE] font-extrabold">
                                Pending Commits from Ledger
                            </p>
                            <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                These are committed funds waiting for payment or settlement.
                            </p>
                        </div>

                        {/* Search + Module Filter */}
                        <div className="p-3 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex flex-1 items-center gap-4 w-full flex-wrap">
                                    <div className="relative w-full md:w-64">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaSearch className="text-zinc-400 dark:text-zinc-500" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search documents..."
                                            value={commitSearchQuery}
                                            onChange={(e) => setCommitSearchQuery(e.target.value)}
                                            className="h-9 w-full pl-10 pr-4 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#4A6CF7] focus:ring-[3px] focus:ring-[#4A6CF7]/12 transition-colors"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label htmlFor="commit-module-filter" className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-sm whitespace-nowrap hidden md:block">
                                            Module:
                                        </label>
                                        <select
                                            id="commit-module-filter"
                                            value={selectedCommitModule}
                                            onChange={(e) => { setSelectedCommitModule(e.target.value); setCommitPage(1); }}
                                            className="h-9 px-3 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg font-bold text-[12px] text-[#3F3F46] dark:text-[#E4E4E7] focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7]"
                                        >
                                            <option value="">All Modules</option>
                                            {commitModuleOptions.map((name) => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {(commitSearchQuery || selectedCommitModule) && (
                                        <FrappeButton
                                            onClick={() => { setCommitSearchQuery(''); setSelectedCommitModule(''); setCommitPage(1); }}
                                            className="text-red-600 hover:bg-red-50 border border-red-200"
                                        >
                                            Clear Filters
                                        </FrappeButton>
                                    )}
                                </div>

                                <div className="text-sm text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">
                                    Total: {searchedPendingCommits.length} commits
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto p-3">
                            <table className="w-full border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg overflow-hidden">
                                <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Project No.</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Account Head</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Module</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">App ID</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Date</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Particulars</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Ref Details</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Amount</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {searchedPendingCommits.length > 0 ? (
                                        searchedPendingCommits
                                            .slice((commitPage - 1) * commitsPerPage, commitPage * commitsPerPage)
                                            .map((commit, idx) => (
                                                <tr key={idx} className="hover:bg-zinc-50 dark:bg-zinc-800/50">
                                                    <td className="p-4 text-sm font-mono font-medium">{commit.projectNumber}</td>
                                                    <td className="p-4 text-sm text-zinc-700 dark:text-zinc-300 font-bold">
                                                        {budgetHeadMap[String(commit.accountHeadId)] || commit.accountHeadId}
                                                    </td>
                                                    <td className="p-4 text-sm text-zinc-700 dark:text-zinc-300">
                                                        {commit.moduleId ? (moduleNameMap[String(commit.moduleId)] || commit.moduleId) : '-'}
                                                    </td>
                                                    <td className="p-4 text-sm font-mono text-zinc-600 dark:text-zinc-400">
                                                        {commit.frapAppId || '-'}
                                                    </td>
                                                    <td className="p-4 text-sm">{commit.commitDate}</td>
                                                    <td className="p-4 text-sm">{commit.commitParticular}</td>
                                                    <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">{commit.refDetails}</td>
                                                    <td className="p-4 text-right font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                                        ₹{commit.commitAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex gap-2">
                                                            {isRnDStaff && (
                                                                <FrappeButton
                                                                    variant="primary"
                                                                    className="text-xs py-1 px-3"
                                                                    onClick={() => initiatePaymentForCommit(commit)}
                                                                >
                                                                    Pay
                                                                </FrappeButton>
                                                            )}
                                                            <FrappeButton
                                                                variant="outline"
                                                                className="text-xs py-1 px-3"
                                                                onClick={() => {
                                                                    const moduleName = commit.moduleId
                                                                        ? (moduleNameMap[String(commit.moduleId)] || '').toLowerCase()
                                                                        : '';
                                                                    const appId = commit.frapAppId;

                                                                    const routeMap: Record<string, string> = {
                                                                        'reimbursement': '/reimbursement',
                                                                        'travel': '/travel',
                                                                        'temporary advance': '/temporary-advance',
                                                                        'advance settlement': '/advance-settlement',
                                                                        'fund received': '/fund-received',
                                                                        'fund sanction': '/add-fund-sanction',
                                                                        'project registration': '/project-details',
                                                                        'project proposal': '/project-proposal-details',
                                                                    };

                                                                    const basePath = routeMap[moduleName];
                                                                    if (basePath && appId) {
                                                                        navigate(`${basePath}/${appId}`);
                                                                    }
                                                                }}
                                                            >
                                                                View
                                                            </FrappeButton>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                                                No pending commits found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Commits Pagination */}
                        {searchedPendingCommits.length > commitsPerPage && (
                            <div className="p-4 border-t border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
                                <div className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                    Showing {(commitPage - 1) * commitsPerPage + 1} to {Math.min(commitPage * commitsPerPage, searchedPendingCommits.length)} of {searchedPendingCommits.length} commits
                                </div>
                                <div className="flex gap-1">
                                    <FrappeButton
                                        onClick={() => setCommitPage(p => Math.max(1, p - 1))}
                                        disabled={commitPage === 1}
                                        variant="outline"
                                    >
                                        Previous
                                    </FrappeButton>
                                    <FrappeButton
                                        onClick={() => setCommitPage(p => p + 1)}
                                        disabled={commitPage * commitsPerPage >= searchedPendingCommits.length}
                                        variant="outline"
                                    >
                                        Next
                                    </FrappeButton>
                                </div>
                            </div>
                        )}
                    </FrappeCard>
                )}

                {activeTab === 'misc' && (
                    <FrappeCard className="overflow-hidden p-0">
                        <div className="bg-[#FAFAF9] dark:bg-[#27272A] p-4 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                            <p className="text-[12px] uppercase tracking-[0.12em] text-[#1E3A8A] dark:text-[#C7D2FE] font-extrabold">
                                Miscellaneous &amp; Recruitment Commits
                            </p>
                            <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                Miscellaneous Commit records (not staged to the ledger) and Recruitment Adhoc Contractual commits (excluded from Pending Commits above).
                            </p>
                        </div>

                        {/* Search + Type Filter */}
                        <div className="p-3 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex flex-1 items-center gap-4 w-full flex-wrap">
                                    <div className="relative w-full md:w-64">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaSearch className="text-zinc-400 dark:text-zinc-500" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search documents..."
                                            value={miscSearchQuery}
                                            onChange={(e) => setMiscSearchQuery(e.target.value)}
                                            className="h-9 w-full pl-10 pr-4 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#4A6CF7] focus:ring-[3px] focus:ring-[#4A6CF7]/12 transition-colors"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label htmlFor="misc-type-filter" className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-sm whitespace-nowrap hidden md:block">
                                            Type:
                                        </label>
                                        <select
                                            id="misc-type-filter"
                                            value={selectedMiscType}
                                            onChange={(e) => { setSelectedMiscType(e.target.value); setMiscPage(1); }}
                                            className="h-9 px-3 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg font-bold text-[12px] text-[#3F3F46] dark:text-[#E4E4E7] focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7]"
                                        >
                                            <option value="">All Types</option>
                                            <option value="Miscellaneous Commit">Miscellaneous Commit</option>
                                            <option value="Recruitment Adhoc Contractual">Recruitment Adhoc Contractual</option>
                                        </select>
                                    </div>

                                    {(miscSearchQuery || selectedMiscType) && (
                                        <FrappeButton
                                            onClick={() => { setMiscSearchQuery(''); setSelectedMiscType(''); setMiscPage(1); }}
                                            className="text-red-600 hover:bg-red-50 border border-red-200"
                                        >
                                            Clear Filters
                                        </FrappeButton>
                                    )}
                                </div>

                                <div className="text-sm text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">
                                    Total: {filteredMiscTabRows.length} records
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto p-3">
                            <table className="w-full border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg overflow-hidden">
                                <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Type</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Project No.</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Budget Head</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">App ID</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Date</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Particulars</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Ref / Linked App</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Amount</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Status</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {filteredMiscTabRows.length > 0 ? (
                                        filteredMiscTabRows
                                            .slice((miscPage - 1) * miscPerPage, miscPage * miscPerPage)
                                            .map((row) => (
                                                <tr key={row.key} className="hover:bg-zinc-50 dark:bg-zinc-800/50">
                                                    <td className="p-4 text-sm">
                                                        <span className={cn(
                                                            "px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                                            row.type === 'Miscellaneous Commit'
                                                                ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800"
                                                                : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
                                                        )}>
                                                            {row.type}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-sm font-mono font-medium">{row.projectNumber}</td>
                                                    <td className="p-4 text-sm text-zinc-700 dark:text-zinc-300 font-bold">{row.budgetHead}</td>
                                                    <td className="p-4 text-sm font-mono text-zinc-600 dark:text-zinc-400">{row.appId}</td>
                                                    <td className="p-4 text-sm">{row.date}</td>
                                                    <td className="p-4 text-sm">{row.particulars}</td>
                                                    <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">{row.refDetails}</td>
                                                    <td className="p-4 text-right font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                                        ₹{row.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={getStatusBadge(row.status)}>{row.status}</span>
                                                    </td>
                                                    <td className="p-4">
                                                        {isRnDStaff && (
                                                            <FrappeButton
                                                                variant="primary"
                                                                className="text-xs py-1 px-3"
                                                                onClick={() => requestPayConfirmation(row.commit)}
                                                            >
                                                                Pay
                                                            </FrappeButton>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                    ) : (
                                        <tr>
                                            <td colSpan={10} className="p-8 text-center text-zinc-500 dark:text-zinc-400">
                                                No miscellaneous or recruitment commit records found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {filteredMiscTabRows.length > miscPerPage && (
                            <div className="p-4 border-t border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
                                <div className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                    Showing {(miscPage - 1) * miscPerPage + 1} to {Math.min(miscPage * miscPerPage, filteredMiscTabRows.length)} of {filteredMiscTabRows.length} records
                                </div>
                                <div className="flex gap-1">
                                    <FrappeButton
                                        onClick={() => setMiscPage(p => Math.max(1, p - 1))}
                                        disabled={miscPage === 1}
                                        variant="outline"
                                    >
                                        Previous
                                    </FrappeButton>
                                    <FrappeButton
                                        onClick={() => setMiscPage(p => p + 1)}
                                        disabled={miscPage * miscPerPage >= filteredMiscTabRows.length}
                                        variant="outline"
                                    >
                                        Next
                                    </FrappeButton>
                                </div>
                            </div>
                        )}
                    </FrappeCard>
                )}

                {activeTab === 'history' && (
                    <>
                        {/* Filter & Search Section */}
                        <FrappeCard className="mb-4 p-3">
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex flex-1 items-center gap-4 w-full flex-wrap">
                                    {/* Search Input */}
                                    <div className="relative w-full md:w-64">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaSearch className="text-zinc-400 dark:text-zinc-500" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search payments..."
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            className="h-9 w-full pl-10 pr-4 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#4A6CF7] focus:ring-[3px] focus:ring-[#4A6CF7]/12 transition-colors"
                                        />
                                    </div>

                                    {/* Doctype/Module Filter */}
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="doctype-filter" className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-sm whitespace-nowrap hidden md:block">
                                            Module:
                                        </label>
                                        <select
                                            id="doctype-filter"
                                            value={selectedDoctype}
                                            onChange={(e) => handleDoctypeChange(e.target.value)}
                                            className="h-9 px-3 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg font-bold text-[12px] text-[#3F3F46] dark:text-[#E4E4E7] focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7]"
                                        >
                                            <option value="">All Modules</option>
                                            <option value="AccountHeadPayment">Account Head Payment</option>
                                            <option value="Reimbursement">Reimbursement</option>
                                            <option value="Advance">Advance</option>
                                            <option value="Disbursal">Disbursal</option>
                                            <option value="Purchase">Purchase</option>
                                            <option value="Recruitment">Recruitment</option>
                                            <option value="Travel">Travel</option>
                                            <option value="Utilities">Utilities</option>
                                        </select>
                                    </div>

                                    {/* Status Filter */}
                                    <div className="flex items-center gap-2">
                                        <label htmlFor="status-filter" className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-sm whitespace-nowrap hidden md:block">
                                            Status:
                                        </label>
                                        <select
                                            id="status-filter"
                                            value={selectedStatus}
                                            onChange={(e) => handleStatusChange(e.target.value)}
                                            className="h-9 px-3 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg font-bold text-[12px] text-[#3F3F46] dark:text-[#E4E4E7] focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7]"
                                        >
                                            <option value="">All Status</option>
                                            <option value="SETTLED">SETTLED</option>
                                            <option value="PARTIALLY_PAID">PARTIALLY_PAID</option>
                                            <option value="OVERPAYMENT">OVERPAYMENT</option>
                                            <option value="COMMITTED">COMMITTED</option>
                                        </select>
                                    </div>

                                    {/* Clear Filters Button */}
                                    {(selectedStatus || selectedDoctype) && (
                                        <FrappeButton
                                            onClick={() => {
                                                handleStatusChange('');
                                                handleDoctypeChange('');
                                            }}
                                            className="text-red-600 hover:bg-red-50 border border-red-200"
                                        >
                                            Clear Filters
                                        </FrappeButton>
                                    )}
                                </div>

                                <div className="text-sm text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">
                                    Total: {totalCount} payments
                                </div>
                            </div>
                        </FrappeCard>

                        {/* Table */}
                        <FrappeCard className="overflow-hidden p-3">
                            <div className="overflow-x-auto rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                                <table className="w-full">
                                    <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Status</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Module</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Particulars</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Project No.</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Date</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Owner</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Amount</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {paginatedPayments.length > 0 ? (
                                            paginatedPayments.map((payment) => (
                                                <tr
                                                    key={payment.name}
                                                    className="hover:bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer transition-colors"
                                                >
                                                    <td className="p-4">
                                                        <span className={getStatusBadge(payment.payment_status)}>
                                                            {payment.payment_status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                                        {payment.doctype || 'AccountHeadPayment'}
                                                    </td>
                                                    <td className="p-4 font-medium text-zinc-900 dark:text-zinc-100 text-sm">
                                                        {payment.payment_particular?.length > 30
                                                            ? `${payment.payment_particular.substring(0, 30)}...`
                                                            : payment.payment_particular || '-'}
                                                    </td>
                                                    <td className="p-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                                                        {payment.project_ref_number?.length > 25
                                                            ? `${payment.project_ref_number.substring(0, 25)}...`
                                                            : payment.project_ref_number || '-'}
                                                    </td>
                                                    <td className="p-4 text-sm font-mono text-zinc-900 dark:text-zinc-100">
                                                        {payment.payment_date
                                                            ? new Date(payment.payment_date).toLocaleDateString("en-IN")
                                                            : "-"}
                                                    </td>
                                                    <td className="p-4 text-sm text-zinc-900 dark:text-zinc-100">
                                                        {payment.owner?.length > 20
                                                            ? `${payment.owner.substring(0, 20)}...`
                                                            : payment.owner || '-'}
                                                    </td>
                                                    <td className="p-4 text-right font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                                                        ₹{payment.payment_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                                                    </td>
                                                    <td className="p-4">
                                                        {isRnDStaff && payment.payment_status !== 'PAID' && (
                                                            <FrappeButton
                                                                variant="action"
                                                                onClick={(e) => {
                                                                    e?.stopPropagation();
                                                                    openPaymentModal(payment);
                                                                }}
                                                                className="text-xs px-4 py-2"
                                                            >
                                                                Payment
                                                            </FrappeButton>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={8} className="p-8 text-center text-zinc-900 dark:text-zinc-100 font-bold">
                                                    {isLoading ? "Loading payments..." : "No payments found matching your criteria."}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination Controls */}
                            {payments.length > 0 && (
                                <div className="p-4 border-t border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
                                    <div>
                                        <div className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                            Showing {indexOfFirstPayment + 1} to {indexOfFirstPayment + currentCount} of {totalCount} entries
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <FrappeButton
                                            onClick={() => handlePageChange(currentPage - 1)}
                                            disabled={currentPage === 1}
                                            variant="outline"
                                        >
                                            Previous
                                        </FrappeButton>
                                        {getPageNumbers().map((page, index) => (
                                            <FrappeButton
                                                key={index}
                                                onClick={() => typeof page === 'number' && handlePageChange(page)}
                                                disabled={typeof page !== 'number'}
                                                variant={page === currentPage ? "primary" : "outline"}
                                                className={cn(typeof page !== 'number' && "cursor-default")}
                                            >
                                                {page}
                                            </FrappeButton>
                                        ))}
                                        <FrappeButton
                                            onClick={() => handlePageChange(currentPage + 1)}
                                            disabled={currentPage === totalPages}
                                            variant="outline"
                                        >
                                            Next
                                        </FrappeButton>
                                    </div>
                                </div>
                            )}
                        </FrappeCard>
                    </>
                )}
            </main>

            {payConfirm.open && payConfirm.commit && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4"
                    onClick={cancelPayConfirmation}
                >
                    <div
                        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700">
                            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Confirm Payment</h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                You're about to pay{' '}
                                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                                    ₹{payConfirm.commit.commitAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </span>{' '}
                                for <span className="font-mono">{payConfirm.commit.frapAppId || payConfirm.commit.projectNumber}</span>.
                                A comment is required before proceeding.
                            </p>
                        </div>
                        <div className="px-5 py-4 space-y-2">
                            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
                                Comment <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                rows={3}
                                value={payConfirmComment}
                                onChange={(e) => { setPayConfirmComment(e.target.value); if (payConfirmError) setPayConfirmError(null); }}
                                placeholder="Add a comment before confirming this payment..."
                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] resize-none"
                                autoFocus
                            />
                            {payConfirmError && (
                                <p className="text-xs font-medium text-red-600 dark:text-red-400">{payConfirmError}</p>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 px-5 py-4 border-t border-zinc-200 dark:border-zinc-700">
                            <button
                                onClick={cancelPayConfirmation}
                                disabled={isSubmittingPayConfirm}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmPayWithComment}
                                disabled={isSubmittingPayConfirm || !payConfirmComment.trim()}
                                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#D97757] hover:bg-[#c66a4e] text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmittingPayConfirm ? 'Confirming...' : 'Confirm & Pay'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {paymentModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPaymentModalOpen(false)}>
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex bg-zinc-50 dark:bg-zinc-800/50 px-6 py-4 border-b items-center justify-between">
                            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                {selectedPaymentName ? "Edit Payment" : "Process Payment"}
                            </h2>
                            <button onClick={() => setPaymentModalOpen(false)} className="p-2 hover:bg-zinc-200 dark:bg-zinc-700 rounded-full transition-colors">
                                <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-0">
                            <PaymentForm
                                docName={selectedPaymentName || undefined}
                                commitData={selectedCommit || undefined}
                                resolvedBudgetHead={selectedCommit ? budgetHeadMap[String(selectedCommit.accountHeadId)] : undefined}
                                onSuccess={() => {
                                    setPaymentModalOpen(false);
                                    fetchPendingCommits();
                                }}
                                onCancel={() => setPaymentModalOpen(false)}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payments;