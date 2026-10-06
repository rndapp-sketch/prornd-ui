import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { cn } from "@/lib/utils";
import {
    Plus, ArrowLeftIcon, HelpCircle, X, ArrowRightLeft,
    CheckCircle2, Clock, IndianRupee, BookOpen, Search,
    ChevronLeft, ChevronRight,
} from "lucide-react";
import { GlobalLoader } from "@/components/ui/global-loader";

// --- HELP PANEL ---
const HelpPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-50 flex justify-end">
        <button
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close help"
        />
        <aside className="relative flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white dark:bg-[#27272A] shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-5 py-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D97757]/10 text-[#D97757]">
                        <HelpCircle className="h-4 w-4" />
                    </span>
                    <div>
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#D97757]">Guide</p>
                        <h2 className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                            Commit / De-Commit
                        </h2>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-[#71717A] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 px-5 py-5 space-y-5">

                {/* What is it */}
                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-3.5 h-3.5 text-[#4A6CF7]" />
                        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">What is this?</h3>
                    </div>
                    <p className="text-[13px] text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                        A <strong className="text-[#3F3F46] dark:text-[#E4E4E7]">Miscellaneous Commit</strong> is used to
                        reserve or release budget against a project's account head for a specific expenditure module
                        (e.g. Recruitment, Travel, Honorarium).
                    </p>
                </section>

                {/* Commit vs De-Commit */}
                <section className="space-y-2.5">
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-[#D97757]" />
                        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Commit vs De-Commit</h3>
                    </div>
                    <div className="rounded-xl border border-[#D97757]/20 bg-[#FFF7F4] dark:bg-[#D97757]/10 p-4">
                        <p className="text-[12px] font-extrabold text-[#D97757] mb-1">Commit</p>
                        <p className="text-[12.5px] text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                            Reserves a specific amount from the project budget head for a planned expenditure.
                            The committed amount is <em>locked</em> and cannot be used for other purposes until released.
                        </p>
                    </div>
                    <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
                        <p className="text-[12px] font-extrabold text-blue-700 dark:text-blue-400 mb-1">De-Commit</p>
                        <p className="text-[12.5px] text-[#52525B] dark:text-[#A1A1AA] leading-relaxed">
                            Releases a previously committed amount back to the available balance.
                            Use this when an expenditure was cancelled or the reserved amount is no longer needed.
                        </p>
                    </div>
                </section>

                {/* Key Fields */}
                <section>
                    <div className="flex items-center gap-2 mb-2">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Key Fields</h3>
                    </div>
                    <div className="space-y-2">
                        {[
                            { field: "Project Number", desc: "The project whose budget will be affected." },
                            { field: "Budget Head", desc: "The specific budget line (account head) to commit or de-commit from." },
                            { field: "Module", desc: "The expenditure category — e.g. Recruitment, Travel, Honorarium." },
                            { field: "Commit Amount", desc: "Amount in INR to reserve or release." },
                            { field: "Commit Particular", desc: "Brief description of what the commitment is for." },
                            { field: "Linked Application", desc: "Optional — the related application document (e.g. a Recruitment application ID)." },
                        ].map(({ field, desc }) => (
                            <div key={field} className="flex gap-2.5">
                                <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#D97757] mt-[7px]" />
                                <p className="text-[12.5px] text-[#52525B] dark:text-[#A1A1AA] leading-snug">
                                    <strong className="text-[#3F3F46] dark:text-[#E4E4E7]">{field}</strong> — {desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Workflow */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <h3 className="text-[11px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Approval Workflow</h3>
                    </div>
                    <div className="space-y-0">
                        {[
                            { stage: "Draft", desc: "You create and save the application.", color: "bg-zinc-400" },
                            { stage: "Pending HoS Approval", desc: "Forwarded to Head of Section (R&D) for review.", color: "bg-amber-400" },
                            { stage: "Pending Dean Approval", desc: "Forwarded to Dean, R&D for final approval.", color: "bg-blue-400" },
                            { stage: "Approved", desc: "Budget is committed or released on the project.", color: "bg-emerald-500" },
                        ].map(({ stage, desc, color }, i, arr) => (
                            <div key={stage} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <span className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0 mt-1", color)} />
                                    {i < arr.length - 1 && <span className="w-px flex-1 bg-zinc-200 dark:bg-zinc-700 my-1" />}
                                </div>
                                <div className="pb-3">
                                    <p className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{stage}</p>
                                    <p className="text-[11.5px] text-[#71717A] dark:text-[#A1A1AA]">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-[11px] text-[#A1A1AA] dark:text-[#71717A] mt-1 italic">
                        * Staff (R&D) submissions skip Pending Staff Approval and go directly to HoS.
                    </p>
                </section>

                {/* How to apply */}
                <section className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-[12px] font-extrabold text-emerald-700 dark:text-emerald-400">How to apply</p>
                    </div>
                    <ol className="space-y-1 list-decimal list-inside text-[12.5px] text-emerald-800 dark:text-emerald-300">
                        <li>Click <strong>Apply New</strong> (top right).</li>
                        <li>Select your project and fill in the commit details.</li>
                        <li>Click <strong>Save Draft</strong> to save, or <strong>Submit</strong> to send for approval.</li>
                        <li>Track progress from this list or via Pending Tasks.</li>
                    </ol>
                </section>
            </div>
        </aside>
    </div>
);

// --- TYPE DEFINITIONS ---
interface MiscellaneousCommitListItem {
    name: string;
    creation: string;
    workflow_state: string;
    commit_amount?: number;
    commit_decommit?: string;
    commit_particular?: string;
    project_number?: string;
    applicant_department?: string;
    applicant_webmail?: string;
    owner?: string;
}

// --- MAIN MISCELLANEOUS COMMIT LIST COMPONENT ---
const MiscellaneousCommit: React.FC = () => {
    const navigate = useNavigate();
    const [list, setList] = useState<MiscellaneousCommitListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [helpOpen, setHelpOpen] = useState(false);
    const [guideExpanded, setGuideExpanded] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 10;

    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(
                `${FRAPPE_BASE_URL}/api/resource/Miscellaneous Commit?fields=["name","creation","workflow_state","commit_amount","commit_decommit","commit_particular","project_number","applicant_department","applicant_webmail","owner"]&order_by=creation desc&limit_page_length=0`,
            );
            const data = await response.json();
            if (data.data) {
                setList(data.data);
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchList();
    }, [fetchList]);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // Searches across every field on each row, not just the visible columns.
    const filteredList = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return list;
        return list.filter((item) =>
            Object.values(item).some(
                (value) => value !== null && value !== undefined && String(value).toLowerCase().includes(query),
            ),
        );
    }, [list, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
    const paginatedList = useMemo(
        () => filteredList.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
        [filteredList, currentPage],
    );

    if (loading) {
        return <GlobalLoader isLoading={true} />;
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
         
            {/* pb-24: extra clearance so the pagination bar's Next button never
                sits under the floating "Module Guide" button (fixed bottom-8 right-7). */}
            <main className="flex-1 p-0 pb-4 w-full overflow-hidden">
                {/* Header */}
                <header className="mb-3 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <ArrowLeftIcon className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
                            </button>
                            <div>
                                <h1 className="text-[18px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                    Commit / De-Commit
                                </h1>
                                <p className="text-[12px] font-medium text-zinc-500 dark:text-zinc-400">
                                    View and manage Miscellaneous Commit applications
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate("/miscellaneous-commit-form")}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-[13px]",
                                "bg-[#2563EB] text-white hover:bg-[#1D4ED8]",
                                "shadow-sm transition-all duration-150",
                            )}
                        >
                            <Plus className="w-4 h-4" />
                            Apply New
                        </button>
                    </div>
                </header>

                {/* Search */}
                <div className="mb-3 relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search any field..."
                        className="w-full pl-9 pr-3 py-1.5 text-[13px] rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#D97757]/40"
                    />
                </div>

                {/* Table */}
                <div className="overflow-hidden rounded-lg border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                    {list.length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF2FF] dark:bg-[#4A6CF7]/15">
                                <Plus className="h-6 w-6 text-[#4A6CF7]" />
                            </div>
                            <h4 className="mb-1 text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">No applications yet</h4>
                            <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                Click "Apply New" to create your first application.
                            </p>
                        </div>
                    ) : filteredList.length === 0 ? (
                        <div className="p-10 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF2FF] dark:bg-[#4A6CF7]/15">
                                <Search className="h-6 w-6 text-[#4A6CF7]" />
                            </div>
                            <h4 className="mb-1 text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">No matching applications</h4>
                            <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">Try a different search term.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-full">
                                <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                    <tr className="border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30">
                                        {[
                                            ["Application ID", "text-left"],
                                            ["Date", "text-left"],
                                            ["Project", "text-left"],
                                            ["Type", "text-left"],
                                            ["Commit Particular", "text-left"],
                                            ["Amount", "text-right"],
                                            ["Status", "text-left"],
                                            ["Action", "text-right"],
                                        ].map(([label, align]) => (
                                            <th
                                                key={label}
                                                className={cn(
                                                    "whitespace-nowrap border-r border-[#C7D2FE]/70 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-[#1E3A8A] last:border-r-0 dark:border-[#4A6CF7]/25 dark:text-[#C7D2FE]",
                                                    align,
                                                )}
                                            >
                                                {label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedList.map((item) => {
                                        const state = item.workflow_state || "Draft";
                                        const isCommit = item.commit_decommit === "Commit";
                                        const cell = "border-r border-[#F4F4F5] px-3 py-2 align-middle text-[12px] last:border-r-0 dark:border-[#3F3F46]/80";
                                        return (
                                            <tr
                                                key={item.name}
                                                className="cursor-pointer border-b border-[#E4E4E7] even:bg-[#FAFAFA] last:border-b-0 hover:bg-[#EEF2FF] dark:border-[#3F3F46] dark:even:bg-[#27272A]/60 dark:hover:bg-[#3F3F46]/40"
                                                onClick={() => navigate(`/miscellaneous-commit/${item.name}`)}
                                            >
                                                <td className={cn(cell, "whitespace-nowrap font-mono font-semibold text-[#3F3F46] dark:text-[#E4E4E7]")}>
                                                    {item.name}
                                                </td>
                                                <td className={cn(cell, "whitespace-nowrap text-[#52525B] dark:text-[#A1A1AA]")}>
                                                    {formatDate(item.creation)}
                                                </td>
                                                <td className={cn(cell, "whitespace-nowrap font-medium text-[#3F3F46] dark:text-[#E4E4E7]")}>
                                                    {item.project_number || "-"}
                                                </td>
                                                <td className={cell}>
                                                    {item.commit_decommit ? (
                                                        <span
                                                            className={cn(
                                                                "inline-flex rounded-md border px-2 py-0.5 text-[11px] font-bold",
                                                                isCommit
                                                                    ? "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-400"
                                                                    : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-400",
                                                            )}
                                                        >
                                                            {item.commit_decommit}
                                                        </span>
                                                    ) : (
                                                        "-"
                                                    )}
                                                </td>
                                                <td className={cn(cell, "min-w-[16rem] whitespace-normal break-words text-[#3F3F46] dark:text-[#E4E4E7]")}>
                                                    {item.commit_particular || "-"}
                                                </td>
                                                <td className={cn(cell, "whitespace-nowrap text-right font-bold tabular-nums text-[#3F3F46] dark:text-[#E4E4E7]")}>
                                                    ₹{(item.commit_amount || 0).toLocaleString("en-IN")}
                                                </td>
                                                <td className={cell}>
                                                    <span
                                                        className={cn(
                                                            "inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                                                            state === "Approved" &&
                                                                "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400",
                                                            state === "Rejected" &&
                                                                "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400",
                                                            state === "Draft" &&
                                                                "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                                                            state.startsWith("Pending") &&
                                                                "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400",
                                                        )}
                                                    >
                                                        {state}
                                                    </span>
                                                </td>
                                                <td className={cn(cell, "text-right")}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/miscellaneous-commit/${item.name}`);
                                                        }}
                                                        className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] font-semibold text-[#4A6CF7] hover:underline"
                                                    >
                                                        View
                                                        <ChevronRight className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {filteredList.length > 0 && (
                    <div className="mt-3 flex items-center justify-between text-[13px] text-zinc-600 dark:text-zinc-400">
                        <p>
                            Showing {(currentPage - 1) * PAGE_SIZE + 1}
                            –{Math.min(currentPage * PAGE_SIZE, filteredList.length)} of {filteredList.length}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Prev
                            </button>
                            <span className="px-2 font-medium text-zinc-900 dark:text-zinc-100">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Floating help button — collapsible to just the icon via the
                chevron, so it takes up less room (e.g. next to pagination). */}
            <div className="fixed bottom-8 right-7 z-40 flex items-center gap-1.5">
                <button
                    onClick={() => setHelpOpen(true)}
                    className={cn(
                        "flex h-11 items-center gap-2 rounded-full border border-[#4A6CF7]/30 bg-white/95 text-[#1E3A8A] shadow-lg shadow-[#18181B]/10 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#4A6CF7]/50 hover:bg-[#EEF2FF] dark:border-[#4A6CF7]/35 dark:bg-[#27272A]/95 dark:text-[#C7D2FE]",
                        guideExpanded ? "px-3.5" : "w-11 justify-center px-0",
                    )}
                    aria-label="Help"
                    title="What is Commit / De-Commit?"
                >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4A6CF7] text-white shadow-sm">
                        <HelpCircle className="h-4 w-4" />
                    </span>
                    {guideExpanded && (
                        <span className="hidden text-[12px] font-extrabold uppercase tracking-wide md:block">
                            Module Guide
                        </span>
                    )}
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setGuideExpanded((v) => !v);
                    }}
                    className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#4A6CF7]/30 bg-white/95 text-[#4A6CF7] shadow-sm backdrop-blur transition-all hover:bg-[#EEF2FF] dark:border-[#4A6CF7]/35 dark:bg-[#27272A]/95 dark:hover:bg-[#27272A] md:flex"
                    aria-label={guideExpanded ? "Collapse module guide button" : "Expand module guide button"}
                    title={guideExpanded ? "Collapse" : "Expand"}
                >
                    {guideExpanded ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
                </button>
            </div>

            {helpOpen && <HelpPanel onClose={() => setHelpOpen(false)} />}
        </div>
    );
};

export default MiscellaneousCommit;