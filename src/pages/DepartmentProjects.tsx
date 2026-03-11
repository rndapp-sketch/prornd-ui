import React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDocList } from "frappe-react-sdk";
import { AppSidebar } from "@/components/RndSidebar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
    ArrowLeft, SearchIcon, ChevronRight, Briefcase,
    CheckCircle2, Clock, AlertCircle, Layers, FileText
} from "lucide-react";

interface Project {
    name: string;
    project_title: string;
    workflow_state: string;
    pi_webmail: string;
    creation?: string;
    modified?: string;
    head_approver?: string;
    owner?: string;
    project_no?: string;
    funding_agen?: string;
}

const getStatusStyle = (status: string) => {
    const s = status?.toLowerCase() || "";
    if (["pending", "under review", "approval pending", "process"].some(t => s.includes(t)))
        return "bg-amber-50 text-amber-700 border-amber-200";
    if (s.includes("approved") || s.includes("open"))
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s.includes("draft"))
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
    if (s.includes("rejected") || s.includes("closed"))
        return "bg-red-50 text-red-700 border-red-200";
    if (s.includes("endorsed"))
        return "bg-purple-50 text-purple-700 border-purple-200";
    return "bg-blue-50 text-blue-700 border-blue-200";
};

export default function DepartmentProjects() {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const [searchQuery, setSearchQuery] = React.useState("");
    const [statusFilter, setStatusFilter] = React.useState("all");
    const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

    // Fetch projects where current user is the head_approver
    const { data: projects, isLoading, error } = useFrappeGetDocList<Project>(
        "Project Registration",
        {
            fields: ["name", "project_title", "workflow_state", "pi_webmail", "creation", "modified", "head_approver", "owner", "project_no", "funding_agen"],
            filters: currentUser ? [["head_approver", "=", currentUser]] : [["name", "=", "NON_EXISTENT_DOC"]],
            limit: 1000,
        }
    );

    // Computed stats
    const stats = React.useMemo(() => {
        if (!projects) return { total: 0, approved: 0, pending: 0, others: 0, statuses: {} as Record<string, number> };
        const statuses: Record<string, number> = {};
        let approved = 0, pending = 0, others = 0;
        projects.forEach(p => {
            const s = p.workflow_state?.toLowerCase() || "";
            statuses[p.workflow_state] = (statuses[p.workflow_state] || 0) + 1;
            if (s.includes("approved") || s.includes("open")) approved++;
            else if (["pending", "under review", "process"].some(t => s.includes(t))) pending++;
            else others++;
        });
        return { total: projects.length, approved, pending, others, statuses };
    }, [projects]);

    // Filter & sort
    const filteredProjects = React.useMemo(() => {
        if (!projects) return [];
        let filtered = projects;

        if (statusFilter !== "all") {
            filtered = filtered.filter(p => p.workflow_state === statusFilter);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                (p.project_title || "").toLowerCase().includes(q) ||
                (p.name || "").toLowerCase().includes(q) ||
                (p.project_no || "").toLowerCase().includes(q) ||
                (p.pi_webmail || "").toLowerCase().includes(q) ||
                (p.funding_agen || "").toLowerCase().includes(q)
            );
        }

        filtered.sort((a, b) => {
            const aVal = a.creation || "";
            const bVal = b.creation || "";
            return sortOrder === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        });

        return filtered;
    }, [projects, searchQuery, statusFilter, sortOrder]);

    const uniqueStatuses = React.useMemo(() => {
        if (!projects) return [];
        return [...new Set(projects.map(p => p.workflow_state).filter(Boolean))].sort();
    }, [projects]);

    return (
        <div className="min-h-screen bg-[#F8F6F3] dark:bg-zinc-900 font-sans">
            <AppSidebar />
            <div className="flex-1 p-4 md:p-8">
                <div className="w-full max-w-7xl mx-auto">

                    {/* Header */}
                    <header className="mb-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-[#D97757] mb-3 transition-colors"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                        </button>
                        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                            Department Projects
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Projects under your department's approval scope
                        </p>
                    </header>

                    {/* Summary Stats */}
                    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Layers className="h-4 w-4 text-[#D97757]" />
                                <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Total</span>
                            </div>
                            <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {isLoading ? "—" : stats.total}
                            </p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Approved</span>
                            </div>
                            <p className="text-2xl font-bold text-emerald-700">{isLoading ? "—" : stats.approved}</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-amber-600" />
                                <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Pending</span>
                            </div>
                            <p className="text-2xl font-bold text-amber-700">{isLoading ? "—" : stats.pending}</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <FileText className="h-4 w-4 text-blue-600" />
                                <span className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Others</span>
                            </div>
                            <p className="text-2xl font-bold text-blue-700">{isLoading ? "—" : stats.others}</p>
                        </div>
                    </section>

                    {/* Status Breakdown Mini Bar */}
                    {Object.keys(stats.statuses).length > 0 && (
                        <section className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-4 mb-6">
                            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wide mb-3">Status Breakdown</h3>
                            <div className="space-y-2">
                                {Object.entries(stats.statuses).sort(([, a], [, b]) => b - a).map(([status, count]) => (
                                    <div key={status} className="flex items-center gap-3">
                                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0", getStatusStyle(status))}>
                                            {status}
                                        </span>
                                        <div className="flex-1 bg-zinc-100 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-[#D97757] h-full rounded-full transition-all duration-700"
                                                style={{ width: `${(count / stats.total) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 w-8 text-right flex-shrink-0">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-4">
                        <div className="relative flex-1">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <input
                                type="text"
                                placeholder="Search by title, ID, PI, agency…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full h-10 pl-10 pr-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 shadow-sm"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="h-10 pl-4 pr-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 appearance-none shadow-sm cursor-pointer min-w-[180px]"
                        >
                            <option value="all">All Statuses</option>
                            {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button
                            onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}
                            className="h-10 px-4 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-sm transition-colors"
                        >
                            {sortOrder === "desc" ? "Newest first" : "Oldest first"}
                        </button>
                    </div>

                    {/* Project List */}
                    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
                        {isLoading ? (
                            <div className="p-12 text-center text-zinc-400">
                                <div className="w-6 h-6 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-sm">Loading department projects…</p>
                            </div>
                        ) : error ? (
                            <div className="p-12 text-center text-red-500">
                                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                                <p className="text-sm font-medium">Failed to load projects</p>
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="p-12 text-center text-zinc-400">
                                <Briefcase className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                                <p className="text-sm font-medium">No projects found</p>
                                {searchQuery && <p className="text-xs mt-1">Try a different search term</p>}
                            </div>
                        ) : (
                            <>
                                {/* Header Row */}
                                <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 text-xs font-bold text-zinc-500 uppercase tracking-wide border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                                    <span className="col-span-2">Project No</span>
                                    <span className="col-span-3">Title</span>
                                    <span className="col-span-2">PI</span>
                                    <span className="col-span-1">Agency</span>
                                    <span className="col-span-2">Status</span>
                                    <span className="col-span-1">Date</span>
                                    <span className="col-span-1 text-right">Action</span>
                                </div>
                                <div className="divide-y divide-zinc-100 dark:divide-zinc-700/50">
                                    {filteredProjects.map(p => (
                                        <button
                                            key={p.name}
                                            onClick={() => {
                                                const target = (p.workflow_state === "Approved" || p.workflow_state === "Proposal Approved")
                                                    ? `/project-details-overview/${p.name}`
                                                    : `/project-details/${p.name}`;
                                                navigate(target);
                                            }}
                                            className="w-full sm:grid grid-cols-12 gap-2 px-5 py-3.5 hover:bg-zinc-50 dark:hover:bg-zinc-700/30 transition-colors text-left group items-center"
                                        >
                                            <span className="col-span-2 text-xs font-mono font-bold text-zinc-900 dark:text-zinc-100 truncate block">
                                                {p.project_no || p.name}
                                            </span>
                                            <span className="col-span-3 text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate block">
                                                {p.project_title}
                                            </span>
                                            <span className="col-span-2 text-xs text-zinc-500 truncate block">
                                                {p.pi_webmail || "—"}
                                            </span>
                                            <span className="col-span-1 text-xs text-zinc-500 truncate block">
                                                {p.funding_agen || "—"}
                                            </span>
                                            <span className="col-span-2">
                                                <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold border inline-block", getStatusStyle(p.workflow_state))}>
                                                    {p.workflow_state}
                                                </span>
                                            </span>
                                            <span className="col-span-1 text-xs text-zinc-400 block">
                                                {p.creation ? format(new Date(p.creation), "dd MMM yy") : "—"}
                                            </span>
                                            <span className="col-span-1 flex justify-end">
                                                <ChevronRight className="h-4 w-4 text-zinc-300 group-hover:text-[#D97757] transition-colors" />
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                {/* Count */}
                                <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                                    <p className="text-xs text-zinc-500">
                                        Showing {filteredProjects.length} of {stats.total} projects
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
