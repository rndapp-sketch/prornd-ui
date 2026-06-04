import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
    useFrappeAuth,
    useFrappeGetCall,
} from "frappe-react-sdk";
import {
    FileText,
    XCircle,
    Search,
    ChevronDown,
    Clock,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";
import { FaArrowLeft } from "react-icons/fa";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "@/components/ui/global-loader";
// import { CancellationModal } from "@/components/CancellationModal";

interface ApplicationRecord {
    name: string;
    title: string;
    status: string;
    creation: string;
    modified: string;
    owner: string;
    docstatus: number;
    has_pending_cancellation: boolean;
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
    const [selectedModule, setSelectedModule] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Cancellation modal state
    // const [cancelModal, setCancelModal] = useState<{
    //     isOpen: boolean;
    //     doctype: string;
    //     docname: string;
    //     title: string;
    //     currentStatus: string;
    // }>({
    //     isOpen: false,
    //     doctype: "",
    //     docname: "",
    //     title: "",
    //     currentStatus: "",
    // });

    // Fetch applications
    const { data, isLoading, error } = useFrappeGetCall<ApplicationsResponse>(
        "rndopsapp.rndopsapp.cancellation_api.get_my_applications",
        {},
        currentUser ? undefined : null
    );

    const applicationGroups = data?.message?.results || [];
    const totalApplications = data?.message?.total_applications || 0;

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
        let style = "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/40";
        if (
            ["pending", "under review", "approval pending"].some((t) =>
                s.includes(t)
            )
        ) {
            style = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40";
        } else if (s.includes("submitted")) {
            style = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40";
        } else if (s.includes("verified") || s.includes("forwarded")) {
            style = "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800/40";
        } else if (s.includes("draft")) {
            style = "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700";
        }
        return cn(
            "inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border",
            style
        );
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    // const handleCancelClick = (record: ApplicationRecord & { doctype: string }) => {
    //     setCancelModal({
    //         isOpen: true,
    //         doctype: record.doctype,
    //         docname: record.name,
    //         title: record.title || record.name,
    //         currentStatus: record.status,
    //     });
    // };

    // const handleCancelSuccess = () => {
    //     setCancelModal((prev) => ({ ...prev, isOpen: false }));
    //     // Refresh the data
    //     mutate();
    // };

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
            <div className="flex h-[60vh] items-center justify-center">
                <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm p-12 text-center max-w-md w-full">
                    <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-[18px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] mb-2">
                        Unable to Load Applications
                    </h2>
                    <p className="text-[13px] text-[#71717A] dark:text-[#A1A1AA]">
                        {error.message || "An unexpected error occurred."}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-6 px-4 py-2 rounded-lg text-[13px] font-semibold bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#A1A1AA] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] transition-colors"
                    >
                        Retry
                    </button>
                </div>
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
                                aria-label="Go back"
                            >
                                <FaArrowLeft className="h-3.5 w-3.5" />
                            </button>
                            <div className="min-w-0 flex-1">
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
                                    My Submissions
                                </span>
                                <h1 className="mt-1 font-sans text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                    Form Application
                                </h1>
                                <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                    View and manage all your pending applications. Cancel
                                    applications that are no longer needed.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="px-3 py-1.5 rounded-xl bg-[#EEF2FF] dark:bg-[#4A6CF7]/15 border border-[#C7D2FE] dark:border-[#4A6CF7]/30">
                                    <span className="text-[20px] font-extrabold text-[#4A6CF7] dark:text-[#93C5FD]">
                                        {totalApplications}
                                    </span>
                                    <span className="text-[10px] font-bold text-[#4A6CF7] dark:text-[#93C5FD] ml-1.5 uppercase tracking-wider">
                                        Pending
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filter Section */}
                    <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <select
                                    id="module-filter"
                                    value={selectedModule}
                                    onChange={(e) => {
                                        setSelectedModule(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="h-10 pl-4 pr-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 appearance-none shadow-sm cursor-pointer min-w-[180px]"
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
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                                    <ChevronDown className="w-4 h-4" />
                                </div>
                            </div>

                            {selectedModule !== "all" && (
                                <>
                                    <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-700" />
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
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
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
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
                                    className="h-10 pl-9 pr-9 w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 shadow-sm transition-all"
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
                            <div className="flex items-center gap-3 border-r border-zinc-200 dark:border-zinc-700 pr-3 mr-1">
                                <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap hidden sm:inline">
                                    Rows:
                                </span>
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
                            <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                                Showing{" "}
                                <span className="text-zinc-900 dark:text-zinc-200 font-semibold">
                                    {filteredRecords.length}
                                </span>{" "}
                                applications
                            </div>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden p-3">
                        <div className="overflow-x-auto rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                            <table className="w-full">
                                <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                                            Module
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                                            Title / Document
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                                            Created
                                        </th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                                            Last Updated
                                        </th>
                                        <th className="px-4 py-3 text-end text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-800 text-xs">
                                    {currentRecords.length > 0 ? (
                                        currentRecords.map((record) => (
                                            <tr
                                                key={`${record.doctype}-${record.name}`}
                                                className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group"
                                            >
                                                <td className="p-3 align-middle">
                                                    <span
                                                        className={getStatusBadge(
                                                            record.status
                                                        )}
                                                    >
                                                        {record.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 align-middle text-zinc-600 dark:text-zinc-400 font-medium">
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                                                        {record.doctype}
                                                    </div>
                                                </td>
                                                <td className="p-3 align-middle font-medium text-zinc-900 dark:text-zinc-200">
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="truncate max-w-[250px]">
                                                            {record.title?.length > 45
                                                                ? `${record.title.substring(0, 45)}...`
                                                                : record.title || record.name}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                                                            {record.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3 align-middle text-zinc-500 dark:text-zinc-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3 h-3 text-zinc-400" />
                                                        {formatDate(record.creation)}
                                                    </div>
                                                </td>
                                                <td className="p-3 align-middle text-zinc-500 dark:text-zinc-400">
                                                    {formatDate(record.modified)}
                                                </td>
                                                <td className="p-3 align-middle text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => handleViewClick(record)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm hover:shadow-md transition-all"
                                                        >
                                                            View
                                                        </button>
                                                        {/* {record.has_pending_cancellation ? (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                Cancelling
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() =>
                                                                    handleCancelClick(record)
                                                                }
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white dark:bg-zinc-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/40 hover:bg-red-50 dark:hover:bg-red-950/20 hover:border-red-300 dark:hover:border-red-700 transition-all"
                                                            >
                                                                <Ban className="w-3 h-3" />
                                                                Cancel
                                                            </button>
                                                        )} */}
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
                                                    <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] dark:bg-[#4A6CF7]/15 flex items-center justify-center">
                                                        <CheckCircle2 className="w-7 h-7 text-[#4A6CF7] dark:text-[#93C5FD]" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                            {searchQuery || selectedModule !== "all"
                                                                ? "No applications found"
                                                                : "All caught up!"}
                                                        </p>
                                                        <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-1">
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
                            <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center">
                                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                    Showing{" "}
                                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
                                        {indexOfFirstRecord + 1}
                                    </span>{" "}
                                    to{" "}
                                    <span className="font-medium text-zinc-900 dark:text-zinc-200">
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
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                                                "w-9 h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-center",
                                                page === currentPage
                                                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-sm"
                                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700",
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
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Cancellation Modal */}
            {/* <CancellationModal
                isOpen={cancelModal.isOpen}
                onClose={() =>
                    setCancelModal((prev) => ({ ...prev, isOpen: false }))
                }
                onSuccess={handleCancelSuccess}
                doctype={cancelModal.doctype}
                docname={cancelModal.docname}
                title={cancelModal.title}
                currentStatus={cancelModal.currentStatus}
            /> */}
        </>
    );
};

export default FormApplication;