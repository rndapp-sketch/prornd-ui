import React, { useState, useRef } from 'react';
import { FaExclamationCircle, FaArrowLeft } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { FormSelect } from '@/components/FormSelect';
import '@/pages/dashboards/projectStaffDashboard.css';
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
    doctype?: string;
    workflow_state: string;
    modified: string;
    owner: string;
    docstatus: number;
    creation: string;
}

const getAppDoctype = (app: PendingApplicationRecord) => app.doctype || "Leave Module";

const getAppRoute = (app: PendingApplicationRecord) => {
    switch (getAppDoctype(app)) {
        case "Project Staff Extension":
            return `/project-staff-extension?edit=${encodeURIComponent(app.name)}`;
        case "Project Staff Resignation":
            return `/project-staff-resignation?edit=${encodeURIComponent(app.name)}`;
        // Other-PI forms: open the module's own detail page, where the PI
        // selects their project/account head and forwards.
        case "Travel":
            return `/travel/${app.name}`;
        case "Indent General Form":
            return `/indent-general-form-details/${app.name}`;
        case "Indent Cum Sanction Sheet":
            return `/indent-cum-sanction-sheet/${app.name}`;
        case "Reimbursement":
            return `/reimbursement/${app.name}`;
        case "Direct Purchase":
            return `/direct-purchase/${app.name}`;
        case "Project Registration":
            return `/pending-application/project-registration/${encodeURIComponent(app.name)}`;
        // Cancellation Request has no dedicated detail page — it renders inside the generic
        // Pending Task detail view (see PendingTaskDetails.tsx's "Cancellation Request" branch).
        // Previously fell through to the Leave Module default below, which 404'd since a
        // cancellation request is never a Leave Module document.
        case "Cancellation Request":
            return `/pending-tasks/${encodeURIComponent("Cancellation Request")}/${encodeURIComponent(app.name)}`;
        case "Leave Module":
        default:
            return `/leave-module/${app.name}`;
    }
};

interface PendingApplicationResponse {
    message: {
        user: string;
        results: PendingApplicationRecord[];
    };
}

const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("psd-card !rounded-xl", className)}>
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
            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-[12.5px] transition-all duration-200",
            "psd-focus",
            variant === 'primary' && "bg-[var(--psd-primary)] text-white hover:bg-[var(--psd-primary-hover)] shadow-sm active:scale-[0.98]",
            variant === 'ghost' && "bg-transparent text-[var(--psd-body)] hover:bg-[var(--psd-primary-light)] hover:text-[var(--psd-primary)]",
            variant === 'outline' && "bg-[var(--psd-surface)] border border-[var(--psd-border)] text-[var(--psd-heading)] hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]",
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
                getAppDoctype(app).toLowerCase().includes(q) ||
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
        cn("inline-flex items-center rounded-full border border-[var(--psd-review)]/40 bg-[var(--psd-review-bg)] px-2.5 py-0.5 text-[10.5px] font-bold text-[#B26A00] dark:text-amber-300");

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
        navigate(getAppRoute(app));
    };

    const selectedAppRecord = React.useMemo(
        () => allApplications.find((app) => app.name === selectedApp) ?? null,
        [allApplications, selectedApp],
    );

    if (error) {
        return (
            <div className="psd-root flex h-screen items-center justify-center">
                <FrappeCard className="p-12 text-center max-w-md w-full">
                    <div className="w-12 h-12 bg-[var(--psd-returned-bg)] rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaExclamationCircle className="h-6 w-6 text-[var(--psd-returned)]" />
                    </div>
                    <h2 className="text-[17px] font-bold text-[var(--psd-heading)] mb-2">Unable to Load Applications</h2>
                    <p className="text-[var(--psd-body)]">{error.message}</p>
                    <FrappeButton onClick={() => window.location.reload()} variant="outline" className="mt-6">
                        Retry
                    </FrappeButton>
                </FrappeCard>
            </div>
        );
    }

    return (
        <>
        <div className="psd-root min-h-screen font-sans">
            <GlobalLoader isLoading={isLoading} />

            <main className="flex-1 px-0 pt-0 pb-4 w-full space-y-2.5">
                {/* Header */}
                <header className="psd-hero relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2">
                    <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                        <button
                            onClick={() => navigate(-1)}
                            className="psd-focus grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]"
                            aria-label="Back to dashboard"
                        >
                            <FaArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                            <ClipboardCheck className="size-4" strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">PI Inbox</div>
                            <h1 className="mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">Pending Applications</h1>
                        </div>
                    </div>
                    <p className="relative z-10 hidden max-w-xl text-right text-xs text-[var(--psd-body)] md:block">Leave, extension and other-PI applications awaiting your approval as Principal Investigator.</p>
                </header>

                {isLoading && (
                    <div role="status" aria-live="polite" className="space-y-1">
                        <div className="psd-loadbar" />
                        <p className="text-[11.5px] font-semibold text-[var(--psd-body)]">Fetching pending applications…</p>
                    </div>
                )}

                {/* Info banner */}
                <div className="psd-card flex items-center gap-2.5 !rounded-xl border-l-[3px] !border-l-[var(--psd-info)] px-3 py-1.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--psd-info-bg)] text-[var(--psd-info)]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                    </div>
                    <p className="text-[12px] leading-snug text-[var(--psd-body)]">
                        <b className="font-bold text-[var(--psd-heading)]">Open an application to approve or reject it.</b>{" "}
                        Click a row's application number to peek at its activity log, or press View to review and act on it as PI.
                    </p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {[
                        { label: "Awaiting Approval", value: allApplications.length, icon: ClipboardCheck, color: "#d9830f", bg: "var(--psd-review-bg)" },
                        { label: "Applicants", value: uniqueApplicantCount, icon: Users2, color: "#6842d9", bg: "var(--psd-primary-light)" },
                        {
                            label: "Oldest Pending",
                            value: oldestApplication?.creation
                                ? new Date(oldestApplication.creation).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                : "-",
                            icon: CalendarClock,
                            color: "#d6364a",
                            bg: "var(--psd-returned-bg)",
                        },
                    ].map((k) => (
                        <FrappeCard key={k.label} className="flex items-center gap-3 border-l-[3px] px-3 py-2" >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: k.bg, color: k.color }}>
                                <k.icon className="h-[18px] w-[18px]" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--psd-body)]">{k.label}</p>
                                <p className="text-[19px] font-bold leading-tight tabular-nums text-[var(--psd-heading)]">{k.value}</p>
                            </div>
                        </FrappeCard>
                    ))}
                </div>

                {/* Filter Section */}
                <div className="psd-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 !rounded-xl px-3 py-2">
                    <div className="whitespace-nowrap text-[12px] font-medium text-[var(--psd-body)]">
                        Showing <span className="font-bold text-[var(--psd-heading)]">{filteredApplications.length}</span> applications
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--psd-muted)]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                id="application-search"
                                placeholder="Search by employee, type…"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="h-9 w-56 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] pl-9 pr-9 text-[13px] text-[var(--psd-heading)] placeholder:text-[var(--psd-muted)] transition-all focus:border-[var(--psd-primary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--psd-primary)]/15"
                            />
                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--psd-muted)] transition-colors hover:text-[var(--psd-heading)]"
                                    title="Clear search"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="hidden whitespace-nowrap text-[12px] font-semibold text-[var(--psd-body)] sm:inline">Rows:</span>
                            <div className="w-[72px]">
                                <FormSelect
                                    compact
                                    value={String(itemsPerPage)}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                </FormSelect>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <FrappeCard className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-[#DCE6CD] dark:bg-[#34402B]">
                                <tr>
                                    <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Status</th>
                                    <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Type</th>
                                    <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Application</th>
                                    <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Date</th>
                                    <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Employee</th>
                                    <th className="px-3 py-2 text-end text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--psd-border)] bg-[var(--psd-surface)] text-xs">
                                {isLoading ? (
                                    Array.from({ length: 6 }).map((_, i) => (
                                        <tr key={i} className="psd-row-in" style={{ animationDelay: `${i * 70}ms` }}>
                                            {[50, 45, 70, 45, 55, 30].map((w, c) => (
                                                <td key={c} className="px-3 py-2.5">
                                                    <div className="psd-shimmer h-4" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : currentApplications.length > 0 ? (
                                    currentApplications.map((app) => (
                                        <tr key={app.name} className="group transition-colors hover:bg-[var(--psd-primary-light)]/40">
                                            <td className="px-3 py-2 align-middle">
                                                <span className={getStatusBadge()}>
                                                    {app.workflow_state}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 align-middle text-[var(--psd-body)] font-medium">
                                                <span className="inline-block rounded-full border border-[var(--psd-primary)]/30 bg-[var(--psd-primary-light)] px-2.5 py-0.5 text-[10.5px] font-bold text-[var(--psd-primary)]">
                                                    {getAppDoctype(app)}
                                                </span>
                                                {app.leave_type && (
                                                    <div className="mt-1 text-[11px] text-[var(--psd-body)]">{app.leave_type}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 align-middle font-semibold text-[var(--psd-heading)]">
                                                <button
                                                    className={cn(
                                                        "text-left hover:text-[var(--psd-primary)] transition-colors flex items-center gap-1.5 group/title",
                                                        selectedApp === app.name && "text-[var(--psd-primary)]",
                                                    )}
                                                    onClick={() => setSelectedApp((prev) => (prev === app.name ? null : app.name))}
                                                    title="Click to open the floating activity log"
                                                >
                                                    {app.name}
                                                    <ActivityIcon className={cn(
                                                        "w-3.5 h-3.5 flex-shrink-0 transition-opacity text-[var(--psd-primary)]",
                                                        selectedApp === app.name ? "opacity-100" : "opacity-0 group-hover/title:opacity-100",
                                                    )} />
                                                </button>
                                            </td>
                                            <td className="px-3 py-2 align-middle text-[var(--psd-body)]">
                                                {app.creation ? new Date(app.creation).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-"}
                                            </td>
                                            <td className="px-3 py-2 align-middle text-[var(--psd-body)]">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--psd-primary-light)] text-xs font-bold text-[var(--psd-primary)]">
                                                        {(app.username || app.owner || "?").charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="truncate max-w-[140px]">{app.username || app.owner}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 align-middle text-right">
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
                                        <td colSpan={6} className="p-12 text-center text-[var(--psd-body)]">
                                            No applications pending your PI approval.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {filteredApplications.length > 0 && (
                        <div className="flex items-center justify-between border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-2">
                            <div className="text-[12px] text-[var(--psd-body)]">
                                Showing <span className="font-bold text-[var(--psd-heading)]">{indexOfFirstApp + 1}</span> to <span className="font-bold text-[var(--psd-heading)]">{Math.min(indexOfLastApp, filteredApplications.length)}</span> of {filteredApplications.length} entries
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
                                            "flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-semibold transition-colors",
                                            page === currentPage
                                                ? "bg-[var(--psd-primary)] text-white shadow-sm"
                                                : "text-[var(--psd-body)] hover:bg-[var(--psd-primary-light)]",
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
            <FloatingActivityLogButton
                key={selectedApp}
                doctype={selectedAppRecord ? getAppDoctype(selectedAppRecord) : "Leave Module"}
                docname={selectedApp}
            />
        )}
        </>
    );
};

export default PendingApplication;
