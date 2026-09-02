import { useState, useEffect, useMemo, useRef } from "react";
import { useFrappeAuth, useFrappeGetCall } from "frappe-react-sdk";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import {
    Plus, FileText, CalendarDays, UserX, AlertTriangle, ShieldCheck, ActivityIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/RndSidebar";
import { GlobalLoader } from "@/components/ui/global-loader";
import { getStateBadgeStyle } from "@/utils/workflowUtils";
import { format } from "date-fns";
import { leaveModuleAPI } from "@/services/apiService";

interface LeaveRecord {
    name: string;
    leave_type?: string;
    workflow_state?: string;
    reason_for_leave?: string;
    creation?: string;
    from_date?: string;
    to_date?: string;
    cl_dates_table?: { cl_date?: string }[];
    [key: string]: unknown;
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

const StatTile = ({ icon: Icon, label, value, hint, tone = 'default' }: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    hint?: string;
    tone?: 'default' | 'danger' | 'success';
}) => {
    const toneClasses = {
        default: { bg: 'bg-[#EEF2FF] dark:bg-[#4A6CF7]/15', icon: 'text-[#4A6CF7] dark:text-[#93C5FD]', value: 'text-zinc-900 dark:text-zinc-100' },
        danger: { bg: 'bg-red-50 dark:bg-red-900/20', icon: 'text-red-600 dark:text-red-400', value: 'text-red-600 dark:text-red-400' },
        success: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', icon: 'text-emerald-600 dark:text-emerald-400', value: 'text-emerald-700 dark:text-emerald-300' },
    }[tone];

    return (
        <FrappeCard className="flex items-center gap-3 p-4">
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", toneClasses.bg)}>
                <Icon className={cn("h-5 w-5", toneClasses.icon)} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{label}</p>
                <p className={cn("text-lg font-extrabold", toneClasses.value)}>{value}</p>
                {hint && <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{hint}</p>}
            </div>
        </FrappeCard>
    );
};

const LeaveModule = () => {
    const { currentUser } = useFrappeAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    const searchQuery = searchParams.get('q') ?? '';
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [totalAbsents, setTotalAbsents] = useState<number | null>(null);

    // Fetch Leave Data balance via whitelisted API (bypasses permissions)
    const { data: leaveBalanceData } = useFrappeGetCall<{
        message: { el: number; cl: number; emp_id: string; emp_class: string } | null;
    }>(
        leaveModuleAPI.getLeaveBalance,
        {},
        {
            enabled: !!currentUser,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        }
    );

    const leaveBalance = leaveBalanceData?.message;

    // --- Compute actual CL and EL after deducting absents ---
    // Absents are deducted from CL first; if CL is exhausted, remainder is deducted from EL
    const { actualCL, actualEL, canApplyLeave } = useMemo(() => {
        const rawCL = leaveBalance?.cl ?? 0;
        const rawEL = leaveBalance?.el ?? 0;
        const absents = totalAbsents ?? 0;

        let remainingAbsents = absents;
        let computedCL = rawCL;
        let computedEL = rawEL;

        // Step 1: Deduct absents from CL first
        if (remainingAbsents > 0) {
            const clDeduction = Math.min(remainingAbsents, rawCL);
            computedCL = rawCL - clDeduction;
            remainingAbsents -= clDeduction;
        }

        // Step 2: If absents still remain, deduct from EL
        if (remainingAbsents > 0) {
            computedEL = rawEL - Math.ceil(remainingAbsents);
        }

        // Can only apply leave if both actual balances are > 0
        const allowed = computedCL > 0 || computedEL > 0;

        return { actualCL: computedCL, actualEL: computedEL, canApplyLeave: allowed };
    }, [leaveBalance, totalAbsents]);

    // Fetch total absents from attendance API
    useEffect(() => {
        if (!currentUser) return;
        const username = currentUser.split("@")[0];
        fetch(`/attendance-api/attendance/absents/${username}`)
            .then((res) => res.json())
            .then((result) => {
                if (result.success && result.data) {
                    setTotalAbsents(result.data.totalAbsents);
                }
            })
            .catch(() => {
                // silently ignore – card just won't show
            });
    }, [currentUser]);

    // Fetch leave applications
    const { data, error, isLoading } = useFrappeGetCall(
        leaveModuleAPI.getMyLeaves,
        { limit: 50, start: 0 },
        currentUser ? `my-leaves-${currentUser}` : null
    );

    const leaves: LeaveRecord[] = useMemo(() => (data as { message?: LeaveRecord[] })?.message || [], [data]);

    const blockApply = !canApplyLeave && leaveBalance !== undefined && totalAbsents !== null;

    // Get display dates for a leave entry
    const getLeaveDates = (leave: LeaveRecord) => {
        if (leave.leave_type === "CL") {
            const clDates = leave.cl_dates_table;
            if (clDates && clDates.length > 0) {
                const formatted = clDates
                    .map((row) => (row.cl_date ? format(new Date(row.cl_date), "dd MMM yyyy") : null))
                    .filter(Boolean);
                if (formatted.length === 1) return formatted[0];
                if (formatted.length <= 3) return formatted.join(", ");
                return `${formatted[0]} + ${formatted.length - 1} more`;
            }
            return null;
        }
        // EL / On Duty Leave
        if (leave.from_date) {
            const from = format(new Date(leave.from_date), "dd MMM yyyy");
            const to = leave.to_date ? format(new Date(leave.to_date), "dd MMM yyyy") : null;
            return to ? `${from} — ${to}` : from;
        }
        return null;
    };

    const filteredLeaves = useMemo(() => {
        if (!searchQuery.trim()) return leaves;
        const q = searchQuery.toLowerCase().trim();
        return leaves.filter((leave) =>
            leave.name?.toLowerCase().includes(q) ||
            leave.leave_type?.toLowerCase().includes(q) ||
            leave.workflow_state?.toLowerCase().includes(q) ||
            leave.reason_for_leave?.toLowerCase().includes(q)
        );
    }, [leaves, searchQuery]);

    const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage);
    const indexOfLast = currentPage * itemsPerPage;
    const indexOfFirst = indexOfLast - itemsPerPage;
    const currentLeaves = filteredLeaves.slice(indexOfFirst, indexOfLast);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchParams(prev => {
            if (e.target.value) {
                prev.set('q', e.target.value);
            } else {
                prev.delete('q');
            }
            return prev;
        });
        setCurrentPage(1);
    };

    const handleClearSearch = () => {
        setSearchParams(prev => { prev.delete('q'); return prev; });
        searchInputRef.current?.focus();
    };

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

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <AppSidebar />
            <main className="flex-1 px-6 md:px-8 pt-7 pb-10 w-full overflow-hidden">
                {/* Header */}
                <div className="mb-5 overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-5 py-4">
                        <div className="flex items-start gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#D97757] hover:border-[#D97757]/30 hover:bg-[#D97757]/10 transition-colors"
                                aria-label="Go back"
                            >
                                <FaArrowLeft className="h-3.5 w-3.5" />
                            </button>
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#4A6CF7] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD]">
                                <CalendarDays className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">My Leaves</span>
                                <h1 className="mt-1 font-sans text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">Leave Applications</h1>
                                <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">View and manage your leave requests.</p>
                            </div>
                        </div>
                        <FrappeButton
                            variant="primary"
                            onClick={() => navigate("/leave-module/new")}
                            disabled={blockApply}
                            className="h-10 shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            New Leave Application
                        </FrappeButton>
                    </div>
                </div>

                {/* Warning banner when leave is exhausted */}
                {blockApply && (
                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-800/50 dark:bg-red-950/30">
                        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-400" />
                        <p className="text-[13px] font-medium text-red-700 dark:text-red-300">
                            <strong className="font-bold">Leave application disabled.</strong> Your actual leave balance (after deducting absents) is exhausted. Please contact your PI or Admin.
                        </p>
                    </div>
                )}

                {/* Leave Balance Cards */}
                {(leaveBalance || totalAbsents !== null) && (
                    <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {leaveBalance && (
                            <>
                                <StatTile icon={CalendarDays} label="Earned Leave (EL)" value={leaveBalance.el ?? 0} />
                                <StatTile icon={CalendarDays} label="Casual Leave (CL)" value={leaveBalance.cl ?? 0} />
                            </>
                        )}
                        {totalAbsents !== null && (
                            <StatTile icon={UserX} label="Total Absent" value={totalAbsents} tone="danger" />
                        )}
                        {leaveBalance && totalAbsents !== null && totalAbsents > 0 && (
                            <>
                                <StatTile
                                    icon={ShieldCheck}
                                    label="Actual CL Available"
                                    value={actualCL}
                                    tone={actualCL <= 0 ? 'danger' : 'success'}
                                    hint={`${leaveBalance.cl ?? 0} CL − ${Math.min(totalAbsents, leaveBalance.cl ?? 0)} absents`}
                                />
                                <StatTile
                                    icon={ShieldCheck}
                                    label="Actual EL Available"
                                    value={actualEL}
                                    tone={actualEL <= 0 ? 'danger' : 'success'}
                                    hint={Math.ceil(Math.max(0, totalAbsents - (leaveBalance.cl ?? 0))) > 0
                                        ? `${leaveBalance.el ?? 0} EL − ${Math.ceil(Math.max(0, totalAbsents - (leaveBalance.cl ?? 0)))} overflow absents`
                                        : undefined}
                                />
                            </>
                        )}
                    </div>
                )}

                {/* Filter Section */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-3 shadow-sm">
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                        Showing <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{filteredLeaves.length}</span> applications
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                placeholder="Search by type, status, reason…"
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
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
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
                    <GlobalLoader isLoading={isLoading} />

                    {error ? (
                        <div className="p-12 text-center text-red-500">
                            Failed to load leave applications. Please try again.
                        </div>
                    ) : !isLoading && leaves.length === 0 ? (
                        <div className="p-16 text-center text-zinc-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p className="text-lg font-medium">No leave applications yet</p>
                            <p className="text-sm mt-1">Click "New Leave Application" to get started.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                                <table className="w-full">
                                    <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Status</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Leave Type</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Application</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Dates</th>
                                            <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Applied On</th>
                                            <th className="px-4 py-3 text-end text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-800 text-xs">
                                        {currentLeaves.length > 0 ? (
                                            currentLeaves.map((leave) => {
                                                const state = leave.workflow_state || "Draft";
                                                const dates = getLeaveDates(leave);
                                                const appliedOn = leave.creation ? format(new Date(leave.creation), "dd MMM yyyy") : "-";
                                                return (
                                                    <tr key={leave.name} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group">
                                                        <td className="p-3 align-middle">
                                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", getStateBadgeStyle(state))}>
                                                                {state}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 align-middle text-zinc-600 dark:text-zinc-400 font-medium">
                                                            {leave.leave_type || "-"}
                                                        </td>
                                                        <td className="p-3 align-middle font-medium text-zinc-900 dark:text-zinc-200">
                                                            <button
                                                                className="text-left hover:text-[#D97757] transition-colors flex items-center gap-1.5 group/title"
                                                                onClick={() => navigate(`/leave-module/${leave.name}`)}
                                                            >
                                                                <span className="max-w-[220px] truncate">
                                                                    {leave.name}
                                                                    <span className="block text-[11px] font-normal text-zinc-400 dark:text-zinc-500 truncate">
                                                                        {leave.reason_for_leave ? leave.reason_for_leave.substring(0, 60) : "No reason provided"}
                                                                    </span>
                                                                </span>
                                                                <ActivityIcon className="w-3.5 h-3.5 opacity-0 group-hover/title:opacity-100 text-[#D97757] flex-shrink-0 transition-opacity" />
                                                            </button>
                                                        </td>
                                                        <td className="p-3 align-middle text-zinc-500 dark:text-zinc-400">
                                                            {dates || "-"}
                                                        </td>
                                                        <td className="p-3 align-middle text-zinc-500 dark:text-zinc-400">
                                                            {appliedOn}
                                                        </td>
                                                        <td className="p-3 align-middle text-right">
                                                            <FrappeButton
                                                                variant="primary"
                                                                onClick={() => navigate(`/leave-module/${leave.name}`)}
                                                                className="px-3 py-1.5 text-xs h-8 shadow-sm"
                                                            >
                                                                View
                                                            </FrappeButton>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                                                    No leave applications found matching your search.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {filteredLeaves.length > 0 && (
                                <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-white dark:bg-zinc-800">
                                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                        Showing <span className="font-medium text-zinc-900 dark:text-zinc-200">{indexOfFirst + 1}</span> to <span className="font-medium text-zinc-900 dark:text-zinc-200">{Math.min(indexOfLast, filteredLeaves.length)}</span> of {filteredLeaves.length} entries
                                    </div>
                                    <div className="flex gap-1">
                                        <FrappeButton
                                            onClick={() => setCurrentPage(p => p - 1)}
                                            disabled={currentPage === 1}
                                            variant="outline"
                                            className="px-3"
                                        >
                                            Previous
                                        </FrappeButton>
                                        {getPageNumbers().map((page, index) => (
                                            <button
                                                key={index}
                                                onClick={() => typeof page === 'number' && setCurrentPage(page)}
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
                                            onClick={() => setCurrentPage(p => p + 1)}
                                            disabled={currentPage === totalPages}
                                            variant="outline"
                                            className="px-3"
                                        >
                                            Next
                                        </FrappeButton>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </FrappeCard>
            </main>
        </div>
    );
};

export default LeaveModule;
