import * as React from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { Trophy, Zap, Clock, ChevronDown, BarChart3, CheckCircle, X, TrendingUp } from "lucide-react";
import { SectionDivider } from "./DashboardCards";

// Shared across every role dashboard (Director, Dean RnD, Hos RnD, Ado_RnD) —
// ranks approvers by how many applications they've processed, filterable by
// period/role/category. Self-contained: fetches its own data, owns its own
// filter state, and has no dependency on the page it's dropped into.
export function StaffLeaderboardCard() {
    const [leaderboardPeriod, setLeaderboardPeriod] = React.useState<"today" | "week" | "month" | "quarter" | "all">("month");
    const [leaderboardRole, setLeaderboardRole] = React.useState<string>("");
    const [leaderboardCategory, setLeaderboardCategory] = React.useState<string>("");

    const { data: leaderboardResp, isLoading: isLeaderboardLoading } = useFrappeGetCall<{
        message: {
            period: string;
            period_label: string;
            leaderboard: Array<{
                user: string;
                full_name: string;
                total_processed: number;
                approved: number;
                rejected: number;
                avg_time: number;
                approval_rate: number;
                rank: number;
            }>;
            total_processed: number;
            total_approved: number;
            total_rejected: number;
            overall_rate: number;
            top_staff: { user?: string; full_name?: string; total_processed?: number } | null;
            fastest: { user?: string; full_name?: string; avg_time?: number } | null;
            pending_by_role: Array<{ role: string; state: string; count: number }>;
        };
    }>(
        "frappe.www.rndops_leaderboard.get_leaderboard_data",
        {
            period: leaderboardPeriod,
            ...(leaderboardRole ? { role: leaderboardRole } : {}),
            ...(leaderboardCategory ? { category: leaderboardCategory } : {}),
        }
    );
    const leaderboardData = leaderboardResp?.message;

    // Not returned by the endpoint directly — the counterpart to "fastest" is
    // just the leaderboard row with the highest avg_time.
    const leaderboardSlowest = React.useMemo(() => {
        const rows = leaderboardData?.leaderboard;
        if (!rows || rows.length === 0) return null;
        return rows.reduce((slowest, row) => (row.avg_time > (slowest?.avg_time ?? -Infinity) ? row : slowest), rows[0]);
    }, [leaderboardData]);

    const LEADERBOARD_ROLE_OPTIONS = [
        "Director", "Dean, RnD", "Hos, RnD (Head of Section, RnD)", "head_approver_1", "Ado_RnD", "staff, RnD",
    ];
    const LEADERBOARD_CATEGORY_OPTIONS = [
        "Purchase", "Financial", "Project", "HR / Staff", "Deposits", "Travel", "IPR", "Other",
    ];

    const leaderboardRankStyle = (rank: number) => {
        if (rank === 1) return "bg-amber-400 dark:bg-amber-500 text-white"; // gold
        if (rank === 2) return "bg-zinc-400 dark:bg-zinc-500 text-white"; // silver
        if (rank === 3) return "bg-orange-600 dark:bg-orange-700 text-white"; // bronze
        return "bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA]";
    };

    // Subtle row wash for the top 3, so they pop without relying on the rank
    // badge alone to signal "this is the podium."
    const leaderboardRowStyle = (rank: number) => {
        if (rank === 1) return "bg-amber-50/60 dark:bg-amber-950/10";
        if (rank === 2) return "bg-zinc-50 dark:bg-zinc-800/20";
        if (rank === 3) return "bg-orange-50/60 dark:bg-orange-950/10";
        return "";
    };

    // Approval rate is a health signal, not just a number — color it like one
    // instead of a flat emerald bar regardless of how low it actually is.
    const leaderboardRateColor = (rate: number) => {
        if (rate >= 90) return { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" };
        if (rate >= 70) return { bar: "bg-amber-400", text: "text-amber-700 dark:text-amber-400" };
        return { bar: "bg-red-500", text: "text-red-600 dark:text-red-400" };
    };

    // Deterministic avatar color per staff, cycling a palette by name hash —
    // gives every row a distinct identity chip instead of a wall of plain text.
    const LEADERBOARD_AVATAR_PALETTE = [
        "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
        "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400",
        "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
        "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400",
        "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400",
        "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400",
        "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400",
        "bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400",
    ];
    const leaderboardAvatarStyle = (name: string) => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
        return LEADERBOARD_AVATAR_PALETTE[hash % LEADERBOARD_AVATAR_PALETTE.length];
    };
    const leaderboardInitials = (name: string) => {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return "?";
        return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
    };

    const LEADERBOARD_PAGE_SIZE = 10;
    const [leaderboardPage, setLeaderboardPage] = React.useState(1);
    React.useEffect(() => {
        setLeaderboardPage(1);
    }, [leaderboardPeriod, leaderboardRole, leaderboardCategory]);

    return (
        <>
            <SectionDivider title="Staff Leaderboard" />
            <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl overflow-hidden mb-6">
                <div className="p-[18px] px-[22px] pb-[14px] border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between flex-wrap gap-3">
                    <div className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30">
                            <Trophy size={15} strokeWidth={2.5} />
                        </div>
                        Staff Leaderboard
                        {leaderboardData?.period_label && (
                            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 normal-case tracking-normal">
                                {leaderboardData.period_label}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={leaderboardCategory}
                            onChange={(e) => setLeaderboardCategory(e.target.value)}
                            className="bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2 py-1 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none focus:border-[#2563eb] cursor-pointer"
                        >
                            <option value="">All Categories</option>
                            {LEADERBOARD_CATEGORY_OPTIONS.map((c) => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <select
                            value={leaderboardRole}
                            onChange={(e) => setLeaderboardRole(e.target.value)}
                            className="bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2 py-1 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none focus:border-[#2563eb] cursor-pointer"
                        >
                            <option value="">All Roles</option>
                            {LEADERBOARD_ROLE_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                        <div className="relative">
                            <select
                                value={leaderboardPeriod}
                                onChange={(e) => setLeaderboardPeriod(e.target.value as typeof leaderboardPeriod)}
                                className="appearance-none pl-2.5 pr-7 py-1 text-[11px] font-bold bg-[#F4F4F5] dark:bg-[#3F3F46] border border-[#E4E4E7] dark:border-[#52525B] text-[#3F3F46] dark:text-[#E4E4E7] rounded-lg outline-none cursor-pointer hover:bg-[#E4E4E7] dark:hover:bg-[#52525B] transition-colors"
                            >
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="quarter">This Quarter</option>
                                <option value="all">All Time</option>
                            </select>
                            <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" />
                        </div>
                    </div>
                </div>
                <div className="p-[18px] px-[22px]">
                    {isLeaderboardLoading ? (
                        <div className="h-[220px] flex flex-col items-center justify-center text-[#71717A] text-sm gap-3">
                            <div className="w-5 h-5 border-2 border-[#d97706] border-t-transparent rounded-full animate-spin"></div>
                            <span className="font-medium">Loading leaderboard…</span>
                        </div>
                    ) : !leaderboardData || leaderboardData.leaderboard.length === 0 ? (
                        <div className="h-[160px] flex items-center justify-center text-[#71717A] text-sm">
                            No approvals recorded for this filter yet.
                        </div>
                    ) : (
                        <>
                            {/* Summary strip */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
                                <div className="flex items-center gap-2 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg px-3 py-2 shadow-sm border border-black/5 dark:border-white/5">
                                    <BarChart3 size={14} strokeWidth={2.5} className="text-[#2563eb] shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest">Processed</div>
                                        <div className="text-[16px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tabular-nums leading-tight">{leaderboardData.total_processed}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg px-3 py-2 shadow-sm border border-black/5 dark:border-white/5">
                                    <CheckCircle size={14} strokeWidth={2.5} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest">Approved</div>
                                        <div className="text-[16px] font-extrabold text-emerald-700 dark:text-emerald-400 tabular-nums leading-tight">{leaderboardData.total_approved}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg px-3 py-2 shadow-sm border border-black/5 dark:border-white/5">
                                    <X size={14} strokeWidth={2.5} className="text-red-600 dark:text-red-400 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest">Rejected</div>
                                        <div className="text-[16px] font-extrabold text-red-600 dark:text-red-400 tabular-nums leading-tight">{leaderboardData.total_rejected}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 bg-[#FAFAF9] dark:bg-[#18181B] rounded-lg px-3 py-2 shadow-sm border border-black/5 dark:border-white/5">
                                    <TrendingUp size={14} strokeWidth={2.5} className="text-violet-600 dark:text-violet-400 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest">Overall Rate</div>
                                        <div className="text-[16px] font-extrabold text-violet-700 dark:text-violet-400 tabular-nums leading-tight">{leaderboardData.overall_rate}%</div>
                                    </div>
                                </div>
                            </div>

                            {/* Spotlight cards */}
                            {(leaderboardData.top_staff || leaderboardData.fastest || leaderboardSlowest) && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                                    {leaderboardData.top_staff && (
                                        <div className="relative overflow-hidden flex items-center gap-3 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 px-3.5 py-3">
                                            <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-amber-400 opacity-10" />
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm shadow-amber-500/30 z-10">
                                                <Trophy size={16} strokeWidth={2.5} />
                                            </div>
                                            <div className="min-w-0 z-10">
                                                <div className="text-[10px] font-bold text-amber-700/80 dark:text-amber-400/80 uppercase tracking-widest">Most Approvals</div>
                                                <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] truncate">{leaderboardData.top_staff.full_name || leaderboardData.top_staff.user}</div>
                                            </div>
                                            <div className="ml-auto text-[18px] font-extrabold text-amber-700 dark:text-amber-400 tabular-nums shrink-0 z-10">{leaderboardData.top_staff.total_processed}</div>
                                        </div>
                                    )}
                                    {leaderboardData.fastest && (
                                        <div className="relative overflow-hidden flex items-center gap-3 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-gradient-to-br from-sky-50 to-blue-50/50 dark:from-sky-950/20 dark:to-blue-950/10 px-3.5 py-3">
                                            <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-sky-400 opacity-10" />
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-sky-400 to-blue-500 text-white shadow-sm shadow-sky-500/30 z-10">
                                                <Zap size={16} strokeWidth={2.5} />
                                            </div>
                                            <div className="min-w-0 z-10">
                                                <div className="text-[10px] font-bold text-sky-700/80 dark:text-sky-400/80 uppercase tracking-widest">Fastest Time Taking</div>
                                                <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] truncate">{leaderboardData.fastest.full_name || leaderboardData.fastest.user}</div>
                                            </div>
                                            <div className="ml-auto text-[18px] font-extrabold text-sky-700 dark:text-sky-400 tabular-nums shrink-0 z-10">{leaderboardData.fastest.avg_time}h</div>
                                        </div>
                                    )}
                                    {leaderboardSlowest && (
                                        <div className="relative overflow-hidden flex items-center gap-3 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-gradient-to-br from-rose-50 to-red-50/50 dark:from-rose-950/20 dark:to-red-950/10 px-3.5 py-3">
                                            <div className="absolute -bottom-3 -right-3 w-16 h-16 rounded-full bg-rose-400 opacity-10" />
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-rose-400 to-red-500 text-white shadow-sm shadow-rose-500/30 z-10">
                                                <Clock size={16} strokeWidth={2.5} />
                                            </div>
                                            <div className="min-w-0 z-10">
                                                <div className="text-[10px] font-bold text-rose-700/80 dark:text-rose-400/80 uppercase tracking-widest">Most Time Taking</div>
                                                <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] truncate">{leaderboardSlowest.full_name || leaderboardSlowest.user}</div>
                                            </div>
                                            <div className="ml-auto text-[18px] font-extrabold text-rose-700 dark:text-rose-400 tabular-nums shrink-0 z-10">{leaderboardSlowest.avg_time}h</div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Ranked table */}
                            <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                            {["Rank", "Staff", "Processed", "Approved", "Rejected", "Avg. Time", "Approval Rate"].map((h) => (
                                                <th key={h} className="p-2.5 px-3.5 text-[11px] font-bold text-[#52525B] dark:text-[#D4D4D8] uppercase tracking-widest text-left whitespace-nowrap">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const totalLbPages = Math.max(1, Math.ceil(leaderboardData.leaderboard.length / LEADERBOARD_PAGE_SIZE));
                                            const safeLbPage = Math.min(leaderboardPage, totalLbPages);
                                            const lbPageSlice = leaderboardData.leaderboard.slice(
                                                (safeLbPage - 1) * LEADERBOARD_PAGE_SIZE,
                                                safeLbPage * LEADERBOARD_PAGE_SIZE
                                            );
                                            return lbPageSlice.map((row) => {
                                                const staffName = row.full_name || row.user;
                                                const rate = leaderboardRateColor(row.approval_rate);
                                                return (
                                                    <tr
                                                        key={row.user}
                                                        className={`border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors ${leaderboardRowStyle(row.rank)}`}
                                                    >
                                                        <td className="p-3 px-3.5 align-middle">
                                                            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-extrabold ${leaderboardRankStyle(row.rank)}`}>
                                                                {row.rank}
                                                            </span>
                                                        </td>
                                                        <td className="p-3 px-3.5 align-middle text-[12.5px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[9.5px] font-extrabold shrink-0 ${leaderboardAvatarStyle(staffName)}`}>
                                                                    {leaderboardInitials(staffName)}
                                                                </span>
                                                                {staffName}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 px-3.5 align-middle text-[12.5px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] tabular-nums">
                                                            {row.total_processed}
                                                        </td>
                                                        <td className="p-3 px-3.5 align-middle text-[12.5px] font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                                                            {row.approved}
                                                        </td>
                                                        <td className="p-3 px-3.5 align-middle text-[12.5px] font-bold text-red-600 dark:text-red-400 tabular-nums">
                                                            {row.rejected}
                                                        </td>
                                                        <td className="p-3 px-3.5 align-middle text-[12.5px] font-semibold text-[#71717A] dark:text-[#A1A1AA] tabular-nums whitespace-nowrap">
                                                            {row.avg_time}h
                                                        </td>
                                                        <td className="p-3 px-3.5 align-middle">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-16 h-1.5 rounded-full bg-[#E4E4E7] dark:bg-[#3F3F46] overflow-hidden shrink-0">
                                                                    <div
                                                                        className={`h-full rounded-full ${rate.bar}`}
                                                                        style={{ width: `${Math.max(0, Math.min(100, row.approval_rate))}%` }}
                                                                    />
                                                                </div>
                                                                <span className={`text-[11.5px] font-bold tabular-nums ${rate.text}`}>{row.approval_rate}%</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                    </tbody>
                                </table>
                            </div>

                            {/* Leaderboard pagination */}
                            {leaderboardData.leaderboard.length > LEADERBOARD_PAGE_SIZE && (() => {
                                const totalLbPages = Math.max(1, Math.ceil(leaderboardData.leaderboard.length / LEADERBOARD_PAGE_SIZE));
                                const safeLbPage = Math.min(leaderboardPage, totalLbPages);
                                return (
                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                        <span className="text-[12px] text-[#52525B] dark:text-[#D4D4D8] font-semibold">
                                            Showing {(safeLbPage - 1) * LEADERBOARD_PAGE_SIZE + 1}–{Math.min(safeLbPage * LEADERBOARD_PAGE_SIZE, leaderboardData.leaderboard.length)} of {leaderboardData.leaderboard.length} staff
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setLeaderboardPage((p) => Math.max(1, p - 1))}
                                                disabled={safeLbPage === 1}
                                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] disabled:opacity-40 hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors"
                                            >
                                                ‹ Prev
                                            </button>
                                            {Array.from({ length: Math.min(5, totalLbPages) }, (_, i) => {
                                                const start = Math.max(1, Math.min(safeLbPage - 2, totalLbPages - 4));
                                                const page = start + i;
                                                return (
                                                    <button
                                                        key={page}
                                                        onClick={() => setLeaderboardPage(page)}
                                                        className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-colors ${page === safeLbPage
                                                            ? "bg-[#2563eb] text-white"
                                                            : "border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46]"
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                );
                                            })}
                                            <button
                                                onClick={() => setLeaderboardPage((p) => Math.min(totalLbPages, p + 1))}
                                                disabled={safeLbPage === totalLbPages}
                                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] disabled:opacity-40 hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors"
                                            >
                                                Next ›
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Pending by role */}
                            {leaderboardData.pending_by_role && leaderboardData.pending_by_role.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                    <div className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mb-2">
                                        Pending Approvals by Role
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {leaderboardData.pending_by_role.map((p, i) => {
                                            // Role and state are often the same text for doctypes with no
                                            // distinct approver role — showing it twice just reads as a
                                            // stutter, so collapse to one label when they match.
                                            const sameText = p.role && p.state && p.role.trim().toLowerCase() === p.state.trim().toLowerCase();
                                            const label = sameText ? p.role : [p.role, p.state].filter(Boolean).join(" · ");
                                            return (
                                                <div
                                                    key={`${p.role}-${p.state}-${i}`}
                                                    className="flex items-center justify-between gap-2 bg-[#FAFAF9] dark:bg-[#18181B] border border-black/5 dark:border-white/5 rounded-lg px-3 py-2"
                                                >
                                                    <span className="text-[11.5px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate" title={label}>
                                                        {label}
                                                    </span>
                                                    <span className="shrink-0 text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 tabular-nums">
                                                        {p.count}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
