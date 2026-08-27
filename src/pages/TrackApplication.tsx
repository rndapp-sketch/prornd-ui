import React, { useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import {
    Search,
    Activity,
    FileText,
    CheckCircle2,
    Clock,
    User as UserIcon,
    MessageCircle,
    ClipboardCheck,
    PlusCircle,
    ArrowRight,
    AlertCircle,
    FolderKanban,
    Hash,
    Users as UsersIcon,
    UserCog,
} from "lucide-react";

interface PendingWith {
    state: string;
    roles: string[];
    specific_approvers: string[];
    assigned_to: string[];
    is_terminal: boolean;
}

interface ActivityEntry {
    user: string;
    timestamp: string;
    source: string;
    detail: string;
}

interface TrackApplicationResult {
    success: boolean;
    message?: string;
    doctype?: string;
    docname?: string;
    title?: string;
    project_no?: string;
    linked_project?: { name: string; project_no?: string } | null;
    current_status?: {
        workflow_state: string;
        docstatus: number;
        docstatus_label: string;
    };
    workflow_progress?: { previous_state: string; current_state: string };
    pending_with?: PendingWith;
    assignments?: string[];
    created?: { by: string; on: string };
    last_user?: string;
    last_action?: ActivityEntry;
    recent_activity?: ActivityEntry[];
}

const fmtDateTime = (d?: string) => {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return d;
    }
};

const sourceIcon = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes("comment")) return MessageCircle;
    if (s.includes("workflow")) return ClipboardCheck;
    if (s.includes("created")) return PlusCircle;
    return Activity;
};

// Deterministic accent color per workflow state, so the same state always
// reads the same color across the badge, the Pending With panel, etc.
const stateColor = (state?: string) => {
    const s = (state || "").toLowerCase();
    if (s.includes("reject")) {
        return { bg: "bg-red-50 dark:bg-red-950/30", text: "text-red-700 dark:text-red-400", border: "border-red-200 dark:border-red-800", solid: "bg-red-600" };
    }
    if (s.includes("approved") || s === "po generated" || s.includes("delivered") || s.includes("published")) {
        return { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-400", border: "border-emerald-200 dark:border-emerald-800", solid: "bg-emerald-600" };
    }
    if (s.includes("draft")) {
        return { bg: "bg-zinc-100 dark:bg-zinc-800", text: "text-zinc-600 dark:text-zinc-400", border: "border-zinc-200 dark:border-zinc-700", solid: "bg-zinc-500" };
    }
    // Anything "Pending ..." / in-flight
    return { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-400", border: "border-amber-200 dark:border-amber-800", solid: "bg-amber-500" };
};

const FrappeCard = ({
    title,
    icon: Icon,
    accent = "border-t-[#D97757]",
    children,
    className,
}: {
    title?: string;
    icon?: React.ElementType;
    accent?: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div
        className={cn(
            "bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] border-t-4 shadow-sm overflow-hidden",
            accent,
            className,
        )}
    >
        {title && (
            <div className="px-5 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center gap-2.5 bg-[#FAFAF9]/70 dark:bg-black/10">
                {Icon && <Icon className="w-4.5 h-4.5 text-[#D97757]" />}
                <h3 className="text-[13.5px] font-extrabold text-[#27272A] dark:text-[#F4F4F5] tracking-tight">
                    {title}
                </h3>
            </div>
        )}
        <div className="p-5">{children}</div>
    </div>
);

// Three orbs pulsing/bouncing in sequence — used in place of plain
// "Tracking…" text while the lookup is in flight.
const ThinkingOrbs = ({
    size = "w-2 h-2",
    color = "bg-white",
    className,
}: {
    size?: string;
    color?: string;
    className?: string;
}) => (
    <span className={cn("inline-flex items-center gap-1", className)}>
        {[0, 1, 2].map((i) => (
            <span
                key={i}
                className={cn("rounded-full animate-bounce", size, color)}
                style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
            />
        ))}
    </span>
);

const InfoTile = ({
    label,
    value,
    icon: Icon,
    mono = true,
}: {
    label: string;
    value: React.ReactNode;
    icon?: React.ElementType;
    mono?: boolean;
}) => (
    <div className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]/60 px-3.5 py-3">
        <p className="flex items-center gap-1 text-[#A1A1AA] font-bold uppercase text-[10px] tracking-wider mb-1.5">
            {Icon && <Icon className="w-3 h-3" />}
            {label}
        </p>
        <p className={cn("text-[13px] font-bold text-[#27272A] dark:text-[#F4F4F5]", mono && "font-mono")}>
            {value}
        </p>
    </div>
);

const TrackApplication: React.FC = () => {
    const [docname, setDocname] = useState("");
    const [result, setResult] = useState<TrackApplicationResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const { call: trackApplication, loading } = useFrappePostCall<{
        message: TrackApplicationResult;
    }>("rndopsapp.dashboard.track_application");

    const handleTrack = async () => {
        const trimmed = docname.trim();
        if (!trimmed) return;
        setError(null);
        setResult(null);
        try {
            const res = await trackApplication({ docname: trimmed });
            const data = res?.message;
            if (!data) {
                setError("No response from server.");
                return;
            }
            if (!data.success) {
                setError(data.message || `No application found for "${trimmed}".`);
                return;
            }
            setResult(data);
        } catch (err) {
            const e = err as { message?: string; exception?: string };
            setError(
                e?.message ||
                e?.exception ||
                `Could not find an application matching "${trimmed}".`,
            );
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") handleTrack();
    };

    const statusColors = stateColor(result?.current_status?.workflow_state);
    const pendingColors = stateColor(result?.pending_with?.state);

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
            <main className="flex-1 px-6 md:px-8 pt-7 pb-10 w-full overflow-hidden">
                <div className="mb-5 rounded-2xl overflow-hidden shadow-sm border border-[#E4E4E7] dark:border-[#3F3F46]">
                    <div className="h-1.5 bg-gradient-to-r from-[#D97757] via-[#c66a4e] to-[#4A6CF7]" />
                    <div className="px-5 py-4 bg-white dark:bg-[#27272A]">
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
                            Track
                        </span>
                        <h1 className="mt-1 text-[24px] font-black tracking-tight text-[#18181B] dark:text-[#FAFAF9] leading-tight flex items-center gap-2.5">
                            <Activity className="w-5.5 h-5.5 text-[#D97757]" />
                            Track Application
                        </h1>
                        <p className="mt-1 text-[12.5px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                            Look up any application by its document number to see its current status,
                            who it's pending with, and its recent activity.
                        </p>
                    </div>
                </div>

                <FrappeCard className="mb-5" accent="border-t-[#4A6CF7]">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A1A1AA]" />
                            <input
                                type="text"
                                value={docname}
                                onChange={(e) => setDocname(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Enter document number, e.g. 2026082110002856"
                                className="h-11 w-full pl-9 pr-3 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[13.5px] font-mono font-semibold text-[#27272A] dark:text-[#F4F4F5] placeholder:text-[#A1A1AA] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-[#4A6CF7] focus:ring-[3px] focus:ring-[#4A6CF7]/12 transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleTrack}
                            disabled={loading || !docname.trim()}
                            className={cn(
                                "h-11 px-6 rounded-lg text-[13.5px] font-bold bg-[#D97757] hover:bg-[#c66a4e] text-white transition-colors disabled:cursor-not-allowed shrink-0 shadow-sm flex items-center justify-center",
                                !loading && "disabled:opacity-50",
                                loading ? "w-16" : "min-w-[76px]",
                            )}
                        >
                            {loading ? <ThinkingOrbs /> : "Track"}
                        </button>
                    </div>
                </FrappeCard>

                {error && (
                    <div className="mb-5 flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-[13px] font-semibold text-red-700 dark:text-red-400">
                        <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                        {error}
                    </div>
                )}

                {result && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                        <div className="xl:col-span-2 space-y-5">
                            {/* Overview */}
                            <FrappeCard title="Application" icon={FileText} accent="border-t-[#D97757]">
                                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                                    <div>
                                        <p className="text-[17px] font-black text-[#18181B] dark:text-[#FAFAF9] tracking-tight">
                                            {result.doctype || "—"}
                                        </p>
                                        <p className="text-[12.5px] font-mono font-semibold text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                                            {result.docname}
                                        </p>
                                    </div>
                                    {result.current_status && (
                                        <span
                                            className={cn(
                                                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-extrabold border",
                                                statusColors.bg,
                                                statusColors.text,
                                                statusColors.border,
                                            )}
                                        >
                                            <span className={cn("w-2 h-2 rounded-full", statusColors.solid)} />
                                            {result.current_status.workflow_state}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <InfoTile
                                        label="Project No"
                                        icon={Hash}
                                        value={result.project_no || result.linked_project?.project_no || "—"}
                                    />
                                    {result.linked_project?.name && (
                                        <InfoTile
                                            label="Linked Project"
                                            icon={FolderKanban}
                                            value={result.linked_project.name}
                                        />
                                    )}
                                </div>

                                {result.workflow_progress && (
                                    <div className="mt-4 flex items-center gap-2.5 flex-wrap">
                                        <span className="px-3 py-1.5 rounded-lg text-[12px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                            {result.workflow_progress.previous_state}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-[#A1A1AA]" />
                                        <span
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[12px] font-extrabold border",
                                                statusColors.bg,
                                                statusColors.text,
                                                statusColors.border,
                                            )}
                                        >
                                            {result.workflow_progress.current_state}
                                        </span>
                                    </div>
                                )}
                            </FrappeCard>

                            {/* Recent Activity */}
                            {!!result.recent_activity?.length && (
                                <FrappeCard title="Recent Activity" icon={Activity} accent="border-t-[#4A6CF7]">
                                    <div className="space-y-0">
                                        {result.recent_activity.map((entry, i) => {
                                            const Icon = sourceIcon(entry.source);
                                            const isLast = i === result.recent_activity!.length - 1;
                                            return (
                                                <div key={i} className="flex gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-[#D97757]/15 border border-orange-100 dark:border-[#D97757]/30 flex items-center justify-center shrink-0">
                                                            <Icon className="w-4 h-4 text-[#D97757]" />
                                                        </div>
                                                        {!isLast && (
                                                            <div className="w-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46] my-1" />
                                                        )}
                                                    </div>
                                                    <div className={cn("pb-4 min-w-0", isLast && "pb-0")}>
                                                        <p className="text-[13px] text-[#3F3F46] dark:text-[#E4E4E7]">
                                                            <span className="font-extrabold text-[#18181B] dark:text-[#FAFAF9]">{entry.user}</span>{" "}
                                                            <span className="text-[#52525B] dark:text-[#D4D4D8]">
                                                                {entry.detail}
                                                            </span>
                                                        </p>
                                                        <p className="text-[11px] font-semibold text-[#A1A1AA] mt-0.5">
                                                            {entry.source} · {fmtDateTime(entry.timestamp)}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </FrappeCard>
                            )}
                        </div>

                        <div className="space-y-5">
                            {/* Pending With */}
                            {result.pending_with && (
                                <FrappeCard title="Pending With" icon={UserIcon} accent="border-t-amber-400">
                                    <div className="space-y-4">
                                        <div
                                            className={cn(
                                                "rounded-xl border px-3.5 py-3",
                                                pendingColors.bg,
                                                pendingColors.border,
                                            )}
                                        >
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] mb-1">
                                                State
                                            </p>
                                            <p className={cn("text-[15px] font-extrabold", pendingColors.text)}>
                                                {result.pending_with.state}
                                            </p>
                                        </div>

                                        {!!result.pending_with.roles?.length && (
                                            <div>
                                                <p className="flex items-center gap-1 text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wide mb-2">
                                                    <UsersIcon className="w-3 h-3" /> Roles
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {result.pending_with.roles.map((r) => (
                                                        <span
                                                            key={r}
                                                            className="px-2.5 py-1 rounded-full text-[11.5px] font-bold bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-800"
                                                        >
                                                            {r}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {!!result.pending_with.specific_approvers?.length && (
                                            <div>
                                                <p className="flex items-center gap-1 text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wide mb-2">
                                                    <UserCog className="w-3 h-3" /> Approvers
                                                </p>
                                                <div className="space-y-1.5">
                                                    {result.pending_with.specific_approvers.map((a) => (
                                                        <p
                                                            key={a}
                                                            className="text-[12px] font-mono font-semibold text-[#27272A] dark:text-[#F4F4F5] bg-[#FAFAF9] dark:bg-[#18181B]/60 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2.5 py-1.5"
                                                        >
                                                            {a}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {!!result.pending_with.assigned_to?.length && (
                                            <div>
                                                <p className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wide mb-2">
                                                    Assigned To
                                                </p>
                                                <div className="space-y-1.5">
                                                    {result.pending_with.assigned_to.map((a) => (
                                                        <p
                                                            key={a}
                                                            className="text-[12px] font-mono font-semibold text-[#27272A] dark:text-[#F4F4F5] bg-[#FAFAF9] dark:bg-[#18181B]/60 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2.5 py-1.5"
                                                        >
                                                            {a}
                                                        </p>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {result.pending_with.is_terminal && (
                                            <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-emerald-700 dark:text-emerald-400 pt-1">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Final state — no further action pending
                                            </div>
                                        )}
                                    </div>
                                </FrappeCard>
                            )}

                            {/* Created / Last activity */}
                            <FrappeCard title="Timeline" icon={Clock} accent="border-t-zinc-400">
                                <div className="space-y-4">
                                    {result.created && (
                                        <div>
                                            <p className="text-[#A1A1AA] font-bold uppercase text-[10px] tracking-wider mb-1">
                                                Created By
                                            </p>
                                            <p className="text-[#18181B] dark:text-[#FAFAF9] font-extrabold text-[13px]">
                                                {result.created.by}
                                            </p>
                                            <p className="text-[#71717A] dark:text-[#A1A1AA] text-[11.5px] font-semibold mt-0.5">
                                                {fmtDateTime(result.created.on)}
                                            </p>
                                        </div>
                                    )}
                                    {result.last_action && (
                                        <div className="pt-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                            <p className="text-[#A1A1AA] font-bold uppercase text-[10px] tracking-wider mb-1">
                                                Last Action
                                            </p>
                                            <p className="text-[#18181B] dark:text-[#FAFAF9] font-extrabold text-[13px]">
                                                {result.last_action.user}
                                            </p>
                                            <p className="text-[#71717A] dark:text-[#A1A1AA] text-[11.5px] font-semibold mt-0.5">
                                                {result.last_action.detail} · {fmtDateTime(result.last_action.timestamp)}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </FrappeCard>
                        </div>
                    </div>
                )}

                {loading && (
                    <div className="py-20 text-center">
                        <ThinkingOrbs size="w-3.5 h-3.5" color="bg-[#D97757]" className="gap-2.5 mb-4" />
                        <p className="text-[13px] font-semibold text-[#A1A1AA]">
                            Tracking {docname.trim() || "application"}…
                        </p>
                    </div>
                )}

                {!result && !error && !loading && (
                    <div className="py-20 text-center">
                        <Search className="w-8 h-8 mx-auto mb-3 text-[#D4D4D8] dark:text-[#3F3F46]" />
                        <p className="text-[13px] text-[#A1A1AA]">
                            Enter a document number above to see its status.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TrackApplication;
