import React, { useState, useEffect, useCallback } from 'react';
import { FaExclamationCircle, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

import { AppSidebar } from '@/components/RndSidebar';
import { useNavigate } from 'react-router-dom';
import { GlobalLoader } from '@/components/ui/global-loader';

import { ledgerService } from '@/services/ledgerService';
import type { CommitRecord } from '@/types/ledgerTypes';
import { PaymentForm } from '@/components/PaymentForm';
import { useUserRoles } from '@/components/UserRole';
import { useFrappeAuth } from 'frappe-react-sdk';

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
    <div className={cn("bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 shadow-sm", className)}>
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
            variant === 'primary' && "bg-[#0EA5A4] text-white hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border border-[#0D9494]",
            variant === 'ghost' && "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 hover:text-zinc-900 dark:text-zinc-100",
            variant === 'outline' && "bg-white dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:border-[#0EA5A4] hover:text-[#0EA5A4] hover:bg-zinc-50 dark:bg-zinc-800/50",
            variant === 'action' && "bg-[#0EA5A4] text-white font-bold hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border-2 border-[#0D9494]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

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
    const [activeTab, setActiveTab] = useState<'history' | 'commits'>('commits'); // Default to commits context
    const [commitPage, setCommitPage] = useState(1);
    const commitsPerPage = 50;
    const itemsPerPage = 10;

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedPaymentName, setSelectedPaymentName] = useState<string | null>(null);
    const [selectedCommit, setSelectedCommit] = useState<CommitRecord | null>(null); // For new payments

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
            const response = await fetch('/api/v2/document/Budget Head?fields=["budget_head","id"]&order_by=id asc');
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
        // Fallback map in case API fails
        const fallbackMap: Record<string, string> = {
            '1': 'Project Registration',
            '2': 'Project Proposal',
            '3': 'Fund Received',
            '4': 'Fund Sanction',
            '5': 'Reimbursement',
            '6': 'Travel',
            '7': 'Temporary Advance',
            '8': 'Advance Settlement',
        };
        try {
            const response = await fetch('/api/v2/document/Module%20Registry/pending-task', { credentials: 'include' });
            const data = await response.json();
            console.log('Module Registry response:', data);
            if (data?.data?.doctype_name && Array.isArray(data.data.doctype_name)) {
                const map: Record<string, string> = {};
                data.data.doctype_name.forEach((item: any) => {
                    map[String(item.idx)] = item.doctype_name;
                });
                console.log('Module name map:', map);
                setModuleNameMap(map);
            } else {
                console.warn('Module Registry: unexpected response, using fallback map');
                setModuleNameMap(fallbackMap);
            }
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

    // Resolve module names on payments using the moduleNameMap (runs reactively when either changes)
    const resolvedPayments = React.useMemo(() => {
        if (Object.keys(moduleNameMap).length === 0) return payments;
        return payments.map(p => ({
            ...p,
            doctype: p.doctype && moduleNameMap[p.doctype] ? moduleNameMap[p.doctype] : (p.doctype || 'AccountHeadPayment'),
        }));
    }, [payments, moduleNameMap]);

    useEffect(() => {
        fetchPendingCommits();
        fetchBudgetHeads();
        fetchModuleRegistry();
        fetchPayments();
    }, [fetchPendingCommits, fetchBudgetHeads, fetchModuleRegistry, fetchPayments]);

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


    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-100 dark:bg-zinc-800">
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
        <div className="bg-zinc-100 dark:bg-zinc-800 min-h-screen">
            <GlobalLoader isLoading={isLoading} />
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                {/* Header */}
                <FrappeCard className="mb-6 p-5">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700"
                            aria-label="Go back"
                        >
                            <FaArrowLeft className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Payments</h1>
                            <p className="text-sm text-zinc-900 dark:text-zinc-100 mt-0.5">View and manage all payment records.</p>
                        </div>
                    </div>
                </FrappeCard>

                {/* Tabs */}
                <div className="flex gap-4 mb-4 border-b border-zinc-300 dark:border-zinc-700 pb-2">
                    <button
                        onClick={() => setActiveTab('commits')}
                        className={cn(
                            "px-4 py-2 font-bold text-sm uppercase border-b-2 transition-colors",
                            activeTab === 'commits'
                                ? "text-[#0EA5A4] border-[#0EA5A4]"
                                : "text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-700 dark:text-zinc-300"
                        )}
                    >
                        Pending Commits
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={cn(
                            "px-4 py-2 font-bold text-sm uppercase border-b-2 transition-colors",
                            activeTab === 'history'
                                ? "text-[#0EA5A4] border-[#0EA5A4]"
                                : "text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-700 dark:text-zinc-300"
                        )}
                    >
                        Payment History
                    </button>
                </div>

                {activeTab === 'commits' && (
                    <FrappeCard className="overflow-hidden p-0">
                        <div className="bg-blue-50 p-4 border-b border-blue-100">
                            <p className="text-sm text-blue-800 font-bold">
                                Pending Commits from Ledger
                            </p>
                            <p className="text-xs text-blue-600">
                                These are committed funds waiting for payment or settlement.
                            </p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full divide-y divide-gray-300">
                                <thead className="bg-zinc-200 dark:bg-zinc-700">
                                    <tr>
                                        <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Project No.</th>
                                        <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Account Head</th>
                                        <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Module</th>
                                        <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">App ID</th>
                                        <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Date</th>
                                        <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Particulars</th>
                                        <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Ref Details</th>
                                        <th className="p-3 text-right font-bold text-zinc-900 dark:text-zinc-100 text-sm">Amount</th>
                                        <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {pendingCommits.length > 0 ? (
                                        pendingCommits
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
                        {pendingCommits.length > commitsPerPage && (
                            <div className="p-4 border-t border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
                                <div className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                    Showing {(commitPage - 1) * commitsPerPage + 1} to {Math.min(commitPage * commitsPerPage, pendingCommits.length)} of {pendingCommits.length} commits
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
                                        disabled={commitPage * commitsPerPage >= pendingCommits.length}
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
                        <FrappeCard className="mb-4 p-4">
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
                                            className="w-full pl-10 pr-4 py-2 border-2 border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-0 transition-colors"
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
                                            className="h-10 px-4 bg-white dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-600 rounded-lg font-bold text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-zinc-900 dark:focus:border-zinc-100"
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
                                            className="h-10 px-4 bg-white dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-600 rounded-lg font-bold text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-zinc-900 dark:focus:border-zinc-100"
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
                        <FrappeCard className="overflow-hidden p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full divide-y divide-gray-300">
                                    <thead className="bg-zinc-200 dark:bg-zinc-700">
                                        <tr className="divide-x divide-gray-300">
                                            <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Status</th>
                                            <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Module</th>
                                            <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Particulars</th>
                                            <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Project No.</th>
                                            <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Date</th>
                                            <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Owner</th>
                                            <th className="p-3 text-right font-bold text-zinc-900 dark:text-zinc-100 text-sm">Amount</th>
                                            <th className="p-3 text-left font-bold text-zinc-900 dark:text-zinc-100 text-sm">Action</th>
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
                                                        {isRnDStaff && (
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
                                                <td colSpan={7} className="p-8 text-center text-zinc-900 dark:text-zinc-100 font-bold">
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
