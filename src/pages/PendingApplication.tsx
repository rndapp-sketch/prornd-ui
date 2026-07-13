import React, { useState, useRef } from 'react';
import { FaExclamationCircle, FaArrowLeft } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { ActivityIcon, ClipboardCheck, Users2, CalendarClock } from 'lucide-react';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFrappeGetCall } from 'frappe-react-sdk';
import { GlobalLoader } from '@/components/ui/global-loader';
import { FloatingActivityLogButton } from '@/components/FloatingActivityLogButton';

interface PendingApplicationRecord {
    name: string;
    username?: string;
    pi?: string;
    leave_type?: string;
    workflow_state: string;
    modified: string;
    owner: string;
    docstatus: number;
    creation: string;
}

interface PendingApplicationResponse {
    message: {
        user: string;
        results: PendingApplicationRecord[];
    };
}

const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline';
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
            variant === 'primary' && "bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm hover:shadow-md",
            variant === 'ghost' && "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
            variant === 'outline' && "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

const PendingApplication: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentPage, setCurrentPage] = useState(1);
    const searchQuery = searchParams.get('q') ?? '';
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const [selectedApp, setSelectedApp] = useState<string | null>(null);

    const { data, isLoading, error } = useFrappeGetCall<PendingApplicationResponse>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_application",
    );

    const allApplications = React.useMemo(() => data?.message?.results ?? [], [data]);

    const filteredApplications = React.useMemo(() => {
        if (!searchQuery.trim()) return allApplications;
        const q = searchQuery.toLowerCase().trim();
        return allApplications.filter((app) => {
            const ownerUsername = app.owner?.split("@")[0]?.toLowerCase() ?? "";
            return (
                app.name?.toLowerCase().includes(q) ||
                app.username?.toLowerCase().includes(q) ||
                app.leave_type?.toLowerCase().includes(q) ||
                app.owner?.toLowerCase().includes(q) ||
                ownerUsername.includes(q)
            );
        });
    }, [allApplications, searchQuery]);

    const uniqueApplicantCount = React.useMemo(() => {
        const names = new Set(allApplications.map((app) => app.username || app.owner));
        return names.size;
    }, [allApplications]);

    const oldestApplication = React.useMemo(() => {
        if (!allApplications.length) return null;
        return [...allApplications].sort(
            (a, b) => new Date(a.creation).getTime() - new Date(b.creation).getTime()
        )[0];
    }, [allApplications]);

    const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
    const indexOfLastApp = currentPage * itemsPerPage;
    const indexOfFirstApp = indexOfLastApp - itemsPerPage;
    const currentApplications = filteredApplications.slice(indexOfFirstApp, indexOfLastApp);

    const handlePageChange = (pageNumber: number) => setCurrentPage(pageNumber);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            setSearchParams(prev => { prev.set('q', e.target.value); return prev; });
        } else {
            setSearchParams(prev => { prev.delete('q'); return prev; });
        }
        setCurrentPage(1);
    };

    const handleClearSearch = () => {
        setSearchParams(prev => { prev.delete('q'); return prev; });
        searchInputRef.current?.focus();
    };

    const getStatusBadge = () =>
        cn("px-2 py-0.5 rounded-full text-[10px] font-medium border bg-amber-50 text-amber-700 border-amber-200");

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxButtons = 3;
        if (totalPages <= maxButtons) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            pages.push(1, 2, 3, '...', totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
        }
        return pages;
    };

    const navigateToApplication = (app: PendingApplicationRecord) => {
        navigate(`/leave-module/${app.name}`);
    };

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
                <FrappeCard className="p-12 text-center max-w-md w-full">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaExclamationCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <h2 className="text-[18px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] mb-2">Unable to Load Applications</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">{error.message}</p>
                    <FrappeButton onClick={() => window.location.reload()} variant="outline" className="mt-6">
                        Retry
                    </FrappeButton>
                </FrappeCard>
            </div>
        );
    }

    return (
        <>
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans text-[#3F3F46] dark:text-[#E4E4E7]">
            <GlobalLoader isLoading={isLoading} />

            <main className="flex-1 px-6 md:px-8 pt-7 pb-10 w-full overflow-hidden">
                {/* Header */}
                <div className="mb-5 overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="flex items-start gap-3 px-5 py-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#D97757] hover:border-[#D97757]/30 hover:bg-[#D97757]/10 transition-colors"
                            aria-label="Back to dashboard"
                        >
                            <FaArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4A6CF7] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD]">
                            <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">PI Inbox</span>
                            <h1 className="mt-1 font-sans text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">Pending Applications</h1>
                            <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">Leave applications awaiting your approval as Principal Investigator.</p>
                        </div>
                    </div>
                </div>

                {/* Info banner */}
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
                    <div className="mt-0.5 flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                        <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-blue-800 dark:text-blue-300">Open an application to approve or reject it.</p>
                        <p className="mt-0.5 text-[12px] font-medium leading-5 text-blue-700 dark:text-blue-400">Click a row's application number to peek at its activity log, or press View to review and act on it as PI.</p>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <FrappeCard className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                            <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Awaiting Approval</p>
                            <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">{allApplications.length}</p>
                        </div>
                    </FrappeCard>
                    <FrappeCard className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400">
                            <Users2 className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Applicants</p>
                            <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">{uniqueApplicantCount}</p>
                        </div>
                    </FrappeCard>
                    <FrappeCard className="flex items-center gap-3 p-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
                            <CalendarClock className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Oldest Pending</p>
                            <p className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                                {oldestApplication?.creation
                                    ? new Date(oldestApplication.creation).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                    : "-"}
                            </p>
                        </div>
                    </FrappeCard>
                </div>

                {/* Filter Section */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-3 shadow-sm">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                        Showing <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{filteredApplications.length}</span> applications
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                id="application-search"
                                placeholder="Search by employee, leave type…"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="h-10 pl-9 pr-9 w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 shadow-sm transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                    title="Clear search"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap hidden sm:inline">Rows:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="h-8 pl-2 pr-8 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <FrappeCard className="overflow-hidden p-3">
                    <div className="overflow-x-auto rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                        <table className="w-full">
                            <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Status</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Leave Type</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Application</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Date</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Employee</th>
                                    <th className="px-4 py-3 text-end text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-800 text-xs">
                                {currentApplications.length > 0 ? (
                                    currentApplications.map((app) => (
                                        <tr key={app.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group">
                                            <td className="p-3 align-middle">
                                                <span className={getStatusBadge()}>
                                                    {app.workflow_state}
                                                </span>
                                            </td>
                                            <td className="p-3 align-middle text-zinc-600 dark:text-zinc-400 font-medium">
                                                {app.leave_type || "-"}
                                            </td>
                                            <td className="p-3 align-middle font-medium text-zinc-900 dark:text-zinc-200">
                                                <button
                                                    className={cn(
                                                        "text-left hover:text-[#D97757] transition-colors flex items-center gap-1.5 group/title",
                                                        selectedApp === app.name && "text-[#D97757]",
                                                    )}
                                                    onClick={() => setSelectedApp((prev) => (prev === app.name ? null : app.name))}
                                                    title="Click to open the floating activity log"
                                                >
                                                    {app.name}
                                                    <ActivityIcon className={cn(
                                                        "w-3.5 h-3.5 flex-shrink-0 transition-opacity text-[#D97757]",
                                                        selectedApp === app.name ? "opacity-100" : "opacity-0 group-hover/title:opacity-100",
                                                    )} />
                                                </button>
                                            </td>
                                            <td className="p-3 align-middle text-zinc-500 dark:text-zinc-400">
                                                {app.creation ? new Date(app.creation).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-"}
                                            </td>
                                            <td className="p-3 align-middle text-zinc-600 dark:text-zinc-400">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                                                        {(app.username || app.owner || "?").charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="truncate max-w-[140px]">{app.username || app.owner}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 align-middle text-right">
                                                <FrappeButton
                                                    variant="primary"
                                                    onClick={() => navigateToApplication(app)}
                                                    className="px-3 py-1.5 text-xs h-8 shadow-sm"
                                                >
                                                    View
                                                </FrappeButton>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                                            No applications pending your PI approval.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {filteredApplications.length > 0 && (
                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-white dark:bg-zinc-800">
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                Showing <span className="font-medium text-zinc-900 dark:text-zinc-200">{indexOfFirstApp + 1}</span> to <span className="font-medium text-zinc-900 dark:text-zinc-200">{Math.min(indexOfLastApp, filteredApplications.length)}</span> of {filteredApplications.length} entries
                            </div>
                            <div className="flex gap-1">
                                <FrappeButton
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    variant="outline"
                                    className="px-3"
                                >
                                    Previous
                                </FrappeButton>
                                {getPageNumbers().map((page, index) => (
                                    <button
                                        key={index}
                                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                                        disabled={typeof page !== 'number'}
                                        className={cn(
                                            "w-9 h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-center",
                                            page === currentPage
                                                ? "bg-zinc-900 text-white shadow-sm"
                                                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700",
                                            typeof page !== 'number' && "cursor-default hover:bg-transparent"
                                        )}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <FrappeButton
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    variant="outline"
                                    className="px-3"
                                >
                                    Next
                                </FrappeButton>
                            </div>
                        </div>
                    )}
                </FrappeCard>
            </main>
        </div>

        {/* Floating Activity Log — appears once an application row is selected */}
        {selectedApp && (
            <FloatingActivityLogButton key={selectedApp} doctype="Leave Module" docname={selectedApp} />
        )}
        </>
    );
};

export default PendingApplication;
