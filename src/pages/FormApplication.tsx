import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    useFrappeAuth,
    useFrappeGetCall,
} from "frappe-react-sdk";
import {
    FileText,
    ClipboardList,
    XCircle,
    Search,
    ChevronDown,
    Clock,
    AlertTriangle,
    Ban,
    CheckCircle2,
} from "lucide-react";
import { FaArrowLeft } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { FormSelect } from "@/components/FormSelect";
import "@/pages/dashboards/projectStaffDashboard.css";
import { GlobalLoader } from "@/components/ui/global-loader";
import { CancellationModal } from "@/components/CancellationModal";
import { MyCancellationRequests, type CancellationRequestRow } from "@/components/MyCancellationRequests";
import { awaitingLabel } from "@/utils/cancellationLabels";

interface ApplicationRecord {
    name: string;
    title: string;
    status: string;
    creation: string;
    modified: string;
    owner: string;
    docstatus: number;
    has_pending_cancellation: boolean;
    cancellation?: {
        name: string;
        status: string;
        workflow_state: string;
        creation: string;
    } | null;
}

interface ApplicationGroup {
    doctype: string;
    count: number;
    records: ApplicationRecord[];
}

interface ApplicationsResponse {
    message: {
        success: boolean;
        user: string;
        total_applications: number;
        results: ApplicationGroup[];
    };
}

const FormApplication: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const [activeTab, setActiveTab] = useState<"applications" | "cancellations">("applications");
    const [selectedModule, setSelectedModule] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Cancellation modal state
    const [cancelModal, setCancelModal] = useState<{
        isOpen: boolean;
        doctype: string;
        docname: string;
        title: string;
        currentStatus: string;
    }>({
        isOpen: false,
        doctype: "",
        docname: "",
        title: "",
        currentStatus: "",
    });

    // Fetch applications
    const { data, isLoading, error, mutate } = useFrappeGetCall<ApplicationsResponse>(
        "rndopsapp.rndopsapp.cancellation_api.get_my_applications",
        {},
        currentUser ? undefined : null
    );

    const applicationGroups = data?.message?.results || [];

    // Flatten all records with doctype info
    const allRecords = React.useMemo(() => {
        const records: (ApplicationRecord & { doctype: string })[] = [];
        applicationGroups.forEach((group) => {
            group.records.forEach((record) => {
                records.push({ ...record, doctype: group.doctype });
            });
        });
        // Sort by modified date descending
        records.sort(
            (a, b) =>
                new Date(b.modified).getTime() - new Date(a.modified).getTime()
        );
        return records;
    }, [applicationGroups]);

    // "Cancellation Requests" tab rows — every application with a cancellation requested,
    // built straight from allRecords rather than a separate (unreliable) backend call.
    // get_my_applications sets has_pending_cancellation=true without always populating the
    // nested `cancellation` object (the Applications tab below degrades the same way — see
    // the disabled `!record.cancellation?.name` button at the "Cancellation requested" badge),
    // so rows without a real cancellation doc name get a synthetic key and aren't clickable.
    const cancellationRows = React.useMemo((): CancellationRequestRow[] =>
        allRecords
            .filter((r) => r.has_pending_cancellation || r.cancellation)
            .map((r) => ({
                name: r.cancellation?.name || `pending-${r.doctype}-${r.name}`,
                reference_doctype: r.doctype,
                reference_docname: r.name,
                reference_name: r.title || r.name,
                status: r.cancellation?.status,
                workflow_state: r.cancellation?.workflow_state,
                request_date: r.cancellation?.creation,
                creation: r.cancellation?.creation,
                reference_state: r.status,
                hasDetails: !!r.cancellation?.name,
            })),
        [allRecords]);

    // Module names for filter
    const moduleNames = React.useMemo(() => {
        const modules = new Set(allRecords.map((r) => r.doctype));
        return Array.from(modules).sort();
    }, [allRecords]);

    // Filtered records
    const filteredRecords = React.useMemo(() => {
        let records = allRecords;
        if (selectedModule !== "all") {
            records = records.filter((r) => r.doctype === selectedModule);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            records = records.filter(
                (r) =>
                    r.title?.toLowerCase().includes(q) ||
                    r.name?.toLowerCase().includes(q) ||
                    r.doctype?.toLowerCase().includes(q) ||
                    r.status?.toLowerCase().includes(q)
            );
        }
        return records;
    }, [allRecords, selectedModule, searchQuery]);

    // Pagination
    const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);
    const indexOfLastRecord = currentPage * itemsPerPage;
    const indexOfFirstRecord = indexOfLastRecord - itemsPerPage;
    const currentRecords = filteredRecords.slice(
        indexOfFirstRecord,
        indexOfLastRecord
    );

    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase() || "";
        let style = "bg-[var(--psd-review-bg)] text-[#B26A00] border-[var(--psd-review)]/40 dark:text-amber-300";
        if (["pending", "under review", "approval pending"].some((t) => s.includes(t))) {
            style = "bg-[var(--psd-review-bg)] text-[#B26A00] border-[var(--psd-review)]/40 dark:text-amber-300";
        } else if (s.includes("submitted")) {
            style = "bg-[var(--psd-info-bg)] text-[#2F5BC4] border-[var(--psd-info)]/35 dark:text-blue-300";
        } else if (s.includes("verified") || s.includes("forwarded")) {
            style = "bg-[var(--psd-primary-light)] text-[var(--psd-primary)] border-[var(--psd-primary)]/35";
        } else if (s.includes("draft")) {
            style = "bg-[var(--psd-bg)] text-[var(--psd-body)] border-[var(--psd-border)]";
        } else if (["approved", "completed"].some((t) => s.includes(t))) {
            style = "bg-[var(--psd-approved-bg)] text-[#0A8A60] border-[var(--psd-approved)]/40 dark:text-emerald-300";
        }
        return cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold", style);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    const handleCancelClick = (record: ApplicationRecord & { doctype: string }) => {
        setCancelModal({
            isOpen: true,
            doctype: record.doctype,
            docname: record.name,
            title: record.title || record.name,
            currentStatus: record.status,
        });
    };

    const handleCancelSuccess = () => {
        setCancelModal((prev) => ({ ...prev, isOpen: false }));
        // Refresh the data
        mutate();
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, "...", totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(
                    1,
                    "...",
                    currentPage - 1,
                    currentPage,
                    currentPage + 1,
                    "...",
                    totalPages
                );
            }
        }
        return pages;
    };

    // Navigation handler for viewing application details
    const handleViewClick = (record: ApplicationRecord & { doctype: string }) => {
        const dt = record.doctype;
        const id = record.name;
        if (dt === "Fund Received") {
            navigate(`/fund-received/${id}`);
        } else if (dt === "Reimbursement") {
            navigate(`/reimbursement/${id}`);
        } else if (dt === "Advance Settlement") {
            navigate(`/advance-settlement/${id}`);
        } else if (dt === "Temporary Advance") {
            navigate(`/pending-tasks/${encodeURIComponent(dt)}/${id}`);
        } else if (dt === "Direct Purchase") {
            navigate(`/direct-purchase/${id}`);
        } else if (dt === "Disbursal of Consultancy") {
            navigate(`/disbursal-of-consultancy/${id}`);
        } else if (dt === "Travel") {
            navigate(`/travel/${id}`);
        } else if (dt === "Selection Committee Report") {
            navigate(`/selection-committee-report/${id}`);
        } else if (dt === "Project Registration") {
            navigate(`/project-details/${id}`);
        } else {
            navigate(`/pending-tasks/${encodeURIComponent(dt)}/${id}`);
        }
    };

    if (error) {
        return (
            <div className="psd-root flex h-[60vh] items-center justify-center">
                <div className="psd-card !rounded-2xl p-10 text-center max-w-md w-full">
                    <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-[17px] font-bold text-[var(--psd-heading)] mb-2">
                        Unable to Load Applications
                    </h2>
                    <p className="text-[13px] text-[var(--psd-body)]">
                        {error.message || "An unexpected error occurred."}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 rounded-lg bg-[var(--psd-primary)] px-4 py-2 text-[13px] font-bold text-white transition-colors hover:bg-[var(--psd-primary-hover)]"
                    >
                        Retry
                    </button>
                </div>
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
                                aria-label="Go back"
                            >
                                <FaArrowLeft className="h-3.5 w-3.5" />
                            </button>
                            <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                                <ClipboardList className="size-4" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">My Submissions</div>
                                <h1 className="mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">Form Application</h1>
                            </div>
                        </div>
                        <p className="relative z-10 hidden text-xs text-[var(--psd-body)] md:block">
                            View and manage all your pending applications. Cancel applications that are no longer needed.
                        </p>
                    </header>

                    {isLoading && (
                        <div role="status" aria-live="polite" className="space-y-1">
                            <div className="psd-loadbar" />
                            <p className="text-[11.5px] font-semibold text-[var(--psd-body)]">Fetching your applications…</p>
                        </div>
                    )}

                    {/* Tabs */}
                    <div role="tablist" className="flex items-center gap-1.5">
                        {([
                            ["applications", "My Applications", allRecords.length],
                            ["cancellations", "Cancellation Requests", cancellationRows.length],
                        ] as const).map(([key, label, count]) => {
                            const on = activeTab === key;
                            return (
                                <button
                                    key={key}
                                    role="tab"
                                    aria-selected={on}
                                    onClick={() => setActiveTab(key)}
                                    className={cn(
                                        "psd-focus flex h-9 items-center gap-2 rounded-full border px-3.5 text-[12.5px] font-bold transition-all duration-200",
                                        on
                                            ? "border-transparent bg-[var(--psd-primary)] text-white shadow-sm"
                                            : "border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]",
                                    )}
                                >
                                    {label}
                                    <span className={cn("rounded-full px-1.5 text-[11px] leading-[18px] tabular-nums", on ? "bg-white/25" : "bg-[var(--psd-bg)]")}>{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {activeTab === "cancellations" ? (
                        <MyCancellationRequests rows={cancellationRows} />
                    ) : (
                    <>
                    {/* Filter Section */}
                    <div className="psd-card flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 !rounded-xl px-3 py-2">
                        <div className="flex items-center gap-3">
                            <div className="w-[210px]">
                                <FormSelect
                                    id="module-filter"
                                    compact
                                    value={selectedModule}
                                    onChange={(e) => {
                                        setSelectedModule(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="all">
                                        All Modules ({allRecords.length})
                                    </option>
                                    {moduleNames.map((module) => {
                                        const count = allRecords.filter(
                                            (r) => r.doctype === module
                                        ).length;
                                        return (
                                            <option key={module} value={module}>
                                                {module} ({count})
                                            </option>
                                        );
                                    })}
                                </FormSelect>
                            </div>

                            {selectedModule !== "all" && (
                                <>
                                    <div className="h-6 w-px bg-[var(--psd-border)]" />
                                    <div className="flex items-center gap-1.5">
                                        <span className="rounded-full bg-[var(--psd-primary-light)] px-2.5 py-0.5 text-[12px] font-bold text-[var(--psd-primary)]">
                                            {selectedModule}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setSelectedModule("all");
                                                setCurrentPage(1);
                                            }}
                                            className="ml-1 text-zinc-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-950/20 p-0.5"
                                            title="Clear filter"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--psd-muted)] pointer-events-none">
                                    <Search className="w-[15px] h-[15px]" />
                                </span>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    id="application-search"
                                    placeholder="Search applications..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="h-9 w-56 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] pl-9 pr-9 text-[13px] text-[var(--psd-heading)] placeholder:text-[var(--psd-muted)] transition-all focus:border-[var(--psd-primary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--psd-primary)]/15"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery("");
                                            searchInputRef.current?.focus();
                                        }}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                    >
                                        <XCircle className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 border-r border-[var(--psd-border)] pr-3 mr-1">
                                <span className="hidden whitespace-nowrap text-[12px] font-semibold text-[var(--psd-body)] sm:inline">
                                    Rows:
                                </span>
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
                            <div className="whitespace-nowrap text-[12px] font-medium text-[var(--psd-body)]">
                                Showing{" "}
                                <span className="font-bold text-[var(--psd-heading)]">
                                    {filteredRecords.length}
                                </span>{" "}
                                applications
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="psd-card overflow-hidden !rounded-xl p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#DCE6CD] dark:bg-[#34402B]">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">
                                            Status
                                        </th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">
                                            Module
                                        </th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">
                                            Title / Document
                                        </th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">
                                            Created
                                        </th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">
                                            Last Updated
                                        </th>
                                        <th className="px-3 py-2 text-end text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--psd-border)] bg-[var(--psd-surface)] text-xs">
                                    {isLoading ? (
                                        Array.from({ length: 6 }).map((_, i) => (
                                            <tr key={i} className="psd-row-in" style={{ animationDelay: `${i * 70}ms` }}>
                                                {[45, 40, 75, 45, 45, 50].map((w, c) => (
                                                    <td key={c} className="px-3 py-2.5">
                                                        <div className="psd-shimmer h-4" style={{ width: `${w}%`, animationDelay: `${i * 120}ms` }} />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : currentRecords.length > 0 ? (
                                        currentRecords.map((record) => (
                                            <tr
                                                key={`${record.doctype}-${record.name}`}
                                                className="transition-colors group hover:bg-[var(--psd-primary-light)]/40"
                                            >
                                                <td className="px-3 py-2 align-middle">
                                                    <span
                                                        className={getStatusBadge(
                                                            record.status
                                                        )}
                                                    >
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 align-middle text-[var(--psd-body)] font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-3.5 h-3.5 text-[var(--psd-primary)] flex-shrink-0" />
                                                        {record.doctype}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-middle font-semibold text-[var(--psd-heading)]">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="truncate max-w-[250px]">
                                                            {record.title?.length > 45
                                                                ? `${record.title.substring(0, 45)}...`
                                                                : record.title || record.name}
                                                        </span>
                                                        <span className="text-[10.5px] font-mono text-[var(--psd-muted)]">
                                                            {record.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-middle text-[var(--psd-body)]">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3 text-[var(--psd-muted)]" />
                                                        {formatDate(record.creation)}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-middle text-[var(--psd-body)]">
                                                    {formatDate(record.modified)}
                                                </td>
                                                <td className="px-3 py-2 align-middle text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleViewClick(record)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--psd-primary)] text-white hover:bg-[var(--psd-primary-hover)] shadow-sm transition-all active:scale-[0.98]"
                                                        >
                                                            View
                                                        </button>
                                                        {record.cancellation?.status === "Approved" ? (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[var(--psd-bg)] text-[var(--psd-body)] border border-[var(--psd-border)]">
                                                                <Ban className="w-3 h-3" />
                                                                Cancelled
                                                            </span>
                                                        ) : record.has_pending_cancellation ? (
                                                            <button
                                                                onClick={() =>
                                                                    navigate(
                                                                        `/pending-tasks/${encodeURIComponent("Cancellation Request")}/${record.cancellation?.name ?? ""}`,
                                                                    )
                                                                }
                                                                disabled={!record.cancellation?.name}
                                                                title={
                                                                    awaitingLabel(record.cancellation?.workflow_state)
                                                                        ? `Cancellation request awaiting approval from ${awaitingLabel(record.cancellation?.workflow_state)}`
                                                                        : "Cancellation request awaiting approval"
                                                                }
                                                                className="inline-flex flex-col items-start px-3 py-1 rounded-lg text-[11px] font-semibold bg-[var(--psd-review-bg)] text-[#B26A00] border border-[var(--psd-review)]/40 dark:text-amber-300 hover:brightness-95 transition-colors disabled:cursor-default"
                                                            >
                                                                <span className="inline-flex items-center gap-1">
                                                                    <Clock className="w-3 h-3" />
                                                                    Cancellation requested
                                                                </span>
                                                                {awaitingLabel(record.cancellation?.workflow_state) && (
                                                                    <span className="text-[9px] font-medium opacity-80 leading-tight">
                                                                        with {awaitingLabel(record.cancellation?.workflow_state)}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() =>
                                                                    handleCancelClick(record)
                                                                }
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-transparent text-[var(--psd-returned)] border border-[var(--psd-returned)]/40 hover:bg-[var(--psd-returned-bg)] hover:border-[var(--psd-returned)] transition-all"
                                                            >
                                                                <Ban className="w-3 h-3" />
                                                                Cancel
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="p-16 text-center"
                                            >
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-14 h-14 rounded-2xl bg-[var(--psd-approved-bg)] flex items-center justify-center">
                                                        <CheckCircle2 className="w-7 h-7 text-[var(--psd-approved)]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-bold text-[var(--psd-heading)]">
                                                            {searchQuery || selectedModule !== "all"
                                                                ? "No applications found"
                                                                : "All caught up!"}
                                                        </p>
                                                        <p className="text-[12px] text-[var(--psd-body)] mt-1">
                                                            {searchQuery || selectedModule !== "all"
                                                                ? "Try adjusting your search or filter criteria."
                                                                : "You don't have any pending applications at the moment."}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {filteredRecords.length > 0 && (
                            <div className="flex items-center justify-between border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-2">
                                <div className="text-[12px] text-[var(--psd-body)]">
                                    Showing{" "}
                                    <span className="font-bold text-[var(--psd-heading)]">
                                        {indexOfFirstRecord + 1}
                                    </span>{" "}
                                    to{" "}
                                    <span className="font-bold text-[var(--psd-heading)]">
                                        {Math.min(
                                            indexOfLastRecord,
                                            filteredRecords.length
                                        )}
                                    </span>{" "}
                                    of {filteredRecords.length} entries
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) => Math.max(1, p - 1))
                                        }
                                        disabled={currentPage === 1}
                                        className="rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--psd-heading)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    {getPageNumbers().map((page, index) => (
                                        <button
                                            key={index}
                                            onClick={() =>
                                                typeof page === "number" &&
                                                setCurrentPage(page)
                                            }
                                            disabled={typeof page !== "number"}
                                            className={cn(
                                                "flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-semibold transition-colors",
                                                page === currentPage
                                                    ? "bg-[var(--psd-primary)] text-white shadow-sm"
                                                    : "text-[var(--psd-body)] hover:bg-[var(--psd-primary-light)]",
                                                typeof page !== "number" &&
                                                    "cursor-default hover:bg-transparent"
                                            )}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() =>
                                            setCurrentPage((p) =>
                                                Math.min(totalPages, p + 1)
                                            )
                                        }
                                        disabled={currentPage === totalPages || totalPages === 0}
                                        className="rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-3 py-1.5 text-[12px] font-semibold text-[var(--psd-heading)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    </>
                    )}
                </main>
            </div>

            {/* Cancellation Modal */}
            <CancellationModal
                isOpen={cancelModal.isOpen}
                onClose={() =>
                    setCancelModal((prev) => ({ ...prev, isOpen: false }))
                }
                onSuccess={handleCancelSuccess}
                doctype={cancelModal.doctype}
                docname={cancelModal.docname}
                title={cancelModal.title}
                currentStatus={cancelModal.currentStatus}
            />
        </>
    );
};

export default FormApplication;
