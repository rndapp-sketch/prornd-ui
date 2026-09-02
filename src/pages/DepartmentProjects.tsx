import React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDocList } from "frappe-react-sdk";

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
        return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";
    if (s.includes("approved") || s.includes("open"))
        return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400";
    if (s.includes("draft"))
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
    if (s.includes("rejected") || s.includes("closed"))
        return "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400";
    if (s.includes("endorsed"))
        return "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400";
    return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400";
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
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans">
        
            <div className="flex-1 p-4 md:p-8">
                <div className="w-full max-w-7xl mx-auto">

                    {/* Header */}
                    <header className="mb-6">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-400 hover:text-[#4A6CF7] mb-3 transition-colors"
                        >
                            <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
                        </button>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-1 h-6 rounded-full bg-[#4A6CF7]" />
                            <h1 className="text-2xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
                                Department Projects
                            </h1>
                        </div>
                        <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] ml-3">
                            Projects under your department's approval scope
                        </p>
                    </header>

                    {/* Summary Stats */}
                    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
                        {[
                            { icon: <Layers className="h-4 w-4" />, label: "Total", value: stats.total, color: "#D97757", accent: "stat-card-amber" },
                            { icon: <CheckCircle2 className="h-4 w-4" />, label: "Approved", value: stats.approved, color: "#059669", accent: "stat-card-green" },
                            { icon: <Clock className="h-4 w-4" />, label: "Pending", value: stats.pending, color: "#D97706", accent: "stat-card-amber" },
                            { icon: <FileText className="h-4 w-4" />, label: "Others", value: stats.others, color: "#4A6CF7", accent: "stat-card-blue" },
                        ].map(({ icon, label, value, color, accent }) => (
                            <div key={label} className={cn("bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm p-4 stat-card", accent)}>
                                <div className="flex items-center gap-2 mb-2 pl-1">
                                    <span style={{ color }}>{icon}</span>
                                    <span className="text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest">{label}</span>
                                </div>
                                <p className="text-2xl font-extrabold pl-1" style={{ color: isLoading ? undefined : color }}>
                                    {isLoading ? "—" : value}
                                </p>
                            </div>
                        ))}
                    </section>

                    {/* Status Breakdown Mini Bar */}
                    {Object.keys(stats.statuses).length > 0 && (
                        <section className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden mb-5">
                            <div className="px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                                <h3 className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-widest">Status Breakdown</h3>
                            </div>
                            <div className="p-4 space-y-2.5">
                                {Object.entries(stats.statuses).sort(([, a], [, b]) => b - a).map(([status, count]) => (
                                    <div key={status} className="flex items-center gap-3">
                                        <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide flex-shrink-0 min-w-[80px]", getStatusStyle(status))}>
                                            {status}
                                        </span>
                                        <div className="flex-1 bg-[#F1F5F9] dark:bg-[#1E293B] rounded-full h-2 overflow-hidden">
                                            <div
                                                className="bg-[#4A6CF7] h-full rounded-full transition-all duration-700"
                                                style={{ width: `${(count / stats.total) * 100}%` }}
                                            />
                                        </div>
                                        <span className="text-[12px] font-extrabold text-zinc-700 dark:text-zinc-300 w-6 text-right flex-shrink-0">{count}</span>
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
                                className="w-full h-10 pl-10 pr-4 bg-white dark:bg-[#1E293B] border-[1.5px] border-[#D1D5DB] dark:border-[#334155] rounded-lg text-[13px] text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7] shadow-sm"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="h-10 pl-4 pr-10 bg-white dark:bg-[#1E293B] border-[1.5px] border-[#D1D5DB] dark:border-[#334155] rounded-lg text-[13px] text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7] appearance-none shadow-sm cursor-pointer min-w-[180px]"
                        >
                            <option value="all">All Statuses</option>
                            {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button
                            onClick={() => setSortOrder(o => o === "desc" ? "asc" : "desc")}
                            className="h-10 px-4 bg-white dark:bg-[#1E293B] border-[1.5px] border-[#D1D5DB] dark:border-[#334155] rounded-lg text-[11px] font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300 hover:bg-[#F9FAFB] dark:hover:bg-[#334155] shadow-sm transition-colors"
                        >
                            {sortOrder === "desc" ? "Newest First" : "Oldest First"}
                        </button>
                    </div>

                    {/* Project List */}
                    <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden">
                        {isLoading ? (
                            <div className="p-12 text-center text-zinc-400">
                                <div className="w-6 h-6 border-2 border-zinc-300 border-t-[#4A6CF7] rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-xs font-bold uppercase tracking-wide">Loading department projects…</p>
                            </div>
                        ) : error ? (
                            <div className="p-12 text-center text-red-500">
                                <AlertCircle className="h-7 w-7 mx-auto mb-2" />
                                <p className="text-xs font-bold uppercase tracking-wide">Failed to load projects</p>
                            </div>
                        ) : filteredProjects.length === 0 ? (
                            <div className="p-12 text-center text-zinc-400">
                                <Briefcase className="h-7 w-7 mx-auto mb-2 text-zinc-300" />
                                <p className="text-xs font-bold uppercase tracking-wide">No projects found</p>
                                {searchQuery && <p className="text-xs mt-1 text-zinc-300">Try a different search term</p>}
                            </div>
                        ) : (
                            <>
                                {/* Header Row */}
                                <div className="hidden sm:grid grid-cols-12 gap-2 px-5 py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#1C2434]">
                                    {["Project No", "Title", "PI", "Agency", "Status", "Date", ""].map((h, i) => (
                                        <span key={i} className={cn("text-[10px] font-bold text-[#A1A1AA] uppercase tracking-widest",
                                            i === 0 ? "col-span-2" : i === 1 ? "col-span-3" : i === 2 ? "col-span-2" : i === 3 ? "col-span-1" : i === 4 ? "col-span-2" : i === 5 ? "col-span-1" : "col-span-1 text-right")}>
                                            {h}
                                        </span>
                                    ))}
                                </div>
                                <div className="divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                                    {filteredProjects.map(p => (
                                        <button
                                            key={p.name}
                                            onClick={() => {
                                                const target = (p.workflow_state === "Approved" || p.workflow_state === "Proposal Approved")
                                                    ? `/project-details-overview/${p.name}`
                                                    : `/project-details/${p.name}`;
                                                navigate(target);
                                            }}
                                            className="w-full sm:grid grid-cols-12 gap-2 px-5 py-3.5 hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50 transition-colors text-left group items-center"
                                        >
                                            <span className="col-span-2 text-[11px] font-mono font-bold text-[#4A6CF7] dark:text-[#818CF8] truncate block">
                                                {p.project_no || p.name}
                                            </span>
                                            <span className="col-span-3 text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate block">
                                                {p.project_title}
                                            </span>
                                            <span className="col-span-2 text-[11px] text-[#71717A] dark:text-[#A1A1AA] truncate block">
                                                {p.pi_webmail || "—"}
                                            </span>
                                            <span className="col-span-1 text-[11px] text-[#71717A] dark:text-[#A1A1AA] truncate block">
                                                {p.funding_agen || "—"}
                                            </span>
                                            <span className="col-span-2">
                                                <span className={cn("px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide inline-block", getStatusStyle(p.workflow_state))}>
                                                    {p.workflow_state}
                                                </span>
                                            </span>
                                            <span className="col-span-1 text-[11px] text-zinc-400 block">
                                                {p.creation ? format(new Date(p.creation), "dd MMM yy") : "—"}
                                            </span>
                                            <span className="col-span-1 flex justify-end">
                                                <ChevronRight className="h-3.5 w-3.5 text-zinc-300 group-hover:text-[#4A6CF7] transition-colors" />
                                            </span>
                                        </button>
                                    ))}
                                </div>
                                {/* Count */}
                                <div className="px-5 py-3 border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#71717A] dark:text-[#A1A1AA]">
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
