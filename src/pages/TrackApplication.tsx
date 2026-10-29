import React, { useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { ThinkingOrbs } from "@/components/ui/thinking-orbs";
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
    HelpCircle,
    Info,
    BookOpen,
    ChevronDown,
    ChevronUp,
    History,
    X,
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

const RECENT_KEY = "track-application-recent";
const loadRecent = (): string[] => {
    try {
        const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
        return Array.isArray(raw) ? raw.filter((x) => typeof x === "string").slice(0, 5) : [];
    } catch {
        return [];
    }
};

const Panel = ({
    title,
    icon: Icon,
    children,
    className,
    action,
}: {
    title?: string;
    icon?: React.ElementType;
    children: React.ReactNode;
    className?: string;
    action?: React.ReactNode;
}) => (
    <section
        className={cn(
            "bg-white dark:bg-[#27272A] rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden",
            className,
        )}
    >
        {title && (
            <header className="px-4 py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center gap-2 bg-[#F8FAFF] dark:bg-black/10">
                {Icon && <Icon className="w-4 h-4 text-[#4F46E5] dark:text-[#A5B4FC]" />}
                <h3 className="text-[12.5px] font-extrabold uppercase tracking-wider text-[#1E3A8A] dark:text-[#C7D2FE]">
                    {title}
                </h3>
                {action && <div className="ml-auto">{action}</div>}
            </header>
        )}
        <div className="p-4">{children}</div>
    </section>
);

const StatTile = ({
    label,
    value,
    sub,
    icon: Icon,
    mono = false,
}: {
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    icon: React.ElementType;
    mono?: boolean;
}) => (
    <div className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] px-3.5 py-3 shadow-sm min-w-0">
        <p className="flex items-center gap-1.5 text-[#71717A] dark:text-[#A1A1AA] font-bold uppercase text-[10px] tracking-wider mb-1.5">
            <span className="w-5 h-5 rounded-md bg-[#EEF2FF] dark:bg-[#4A6CF7]/15 flex items-center justify-center">
                <Icon className="w-3 h-3 text-[#4F46E5] dark:text-[#A5B4FC]" />
            </span>
            {label}
        </p>
        <p className={cn("text-[13.5px] font-extrabold text-[#18181B] dark:text-[#FAFAF9] truncate", mono && "font-mono")}>
            {value}
        </p>
        {sub && <p className="text-[11.5px] font-medium text-[#71717A] dark:text-[#A1A1AA] mt-0.5 truncate">{sub}</p>}
    </div>
);

const Chip = ({ children, tone = "indigo" }: { children: React.ReactNode; tone?: "indigo" | "zinc" }) => (
    <span
        className={cn(
            "px-2.5 py-1 rounded-full text-[11.5px] font-bold border",
            tone === "indigo"
                ? "bg-[#EEF2FF] dark:bg-[#4A6CF7]/15 text-[#3730A3] dark:text-[#C7D2FE] border-[#C7D2FE] dark:border-[#4A6CF7]/30"
                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
        )}
    >
        {children}
    </span>
);

const PersonList = ({ label, icon: Icon, items }: { label: string; icon?: React.ElementType; items: string[] }) => (
    <div>
        <p className="flex items-center gap-1 text-[10.5px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider mb-2">
            {Icon && <Icon className="w-3 h-3" />} {label}
        </p>
        <div className="space-y-1.5">
            {items.map((a) => (
                <p
                    key={a}
                    className="text-[12px] font-mono font-semibold text-[#27272A] dark:text-[#F4F4F5] bg-[#F8FAFF] dark:bg-[#18181B]/60 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2.5 py-1.5 truncate"
                >
                    {a}
                </p>
            ))}
        </div>
    </div>
);

const GUIDE_STEPS = [
    { n: 1, title: "Find the document ID", body: "Copy the reference from your submission receipt or dashboard." },
    { n: 2, title: "Search", body: "Paste it above and press Track or Enter." },
    { n: 3, title: "Read the progress", body: "See the workflow state, who it is pending with, and the activity trail." },
];

const TrackApplication: React.FC = () => {
    const [docname, setDocname] = useState("");
    const [result, setResult] = useState<TrackApplicationResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showGuide, setShowGuide] = useState(true);
    const [recent, setRecent] = useState<string[]>(loadRecent);

    const { call: trackApplication, loading } = useFrappePostCall<{
        message: TrackApplicationResult;
    }>("rndopsapp.dashboard.track_application");

    const remember = (value: string) => {
        const next = [value, ...recent.filter((r) => r !== value)].slice(0, 5);
        setRecent(next);
        try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
            /* storage unavailable: recent list just won't persist */
        }
    };

    const forgetRecent = () => {
        setRecent([]);
        try {
            localStorage.removeItem(RECENT_KEY);
        } catch {
            /* ignore */
        }
    };

    const handleTrack = async (override?: string) => {
        const trimmed = (override ?? docname).trim();
        if (!trimmed) return;
        if (override) setDocname(trimmed);
        setError(null);
        setResult(null);
        setShowGuide(false);
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
            remember(trimmed);
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
            <main className="flex-1 pb-6 w-full space-y-4">
                {/* Hero: title + search */}
                <div className="rounded-xl overflow-hidden border border-[#C7D2FE] dark:border-[#4A6CF7]/30 shadow-sm bg-gradient-to-br from-[#EEF2FF] via-white to-[#F8FAFF] dark:from-[#4A6CF7]/10 dark:via-[#27272A] dark:to-[#27272A]">
                    <div className="px-5 pt-4 pb-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4F46E5] dark:text-[#A5B4FC]">
                                    Application Tracking
                                </span>
                                <h1 className="text-[22px] font-black tracking-tight text-[#1E3A8A] dark:text-[#E0E7FF] leading-tight flex items-center gap-2.5">
                                    <Activity className="w-6 h-6 text-[#4F46E5] dark:text-[#A5B4FC]" />
                                    Track Application
                                </h1>
                                <p className="mt-1 text-[12.5px] font-medium text-[#52525B] dark:text-[#A1A1AA] max-w-xl">
                                    Enter a document number to see its status, who it is pending with, and its recent activity.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowGuide((prev) => !prev)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold border border-[#C7D2FE] dark:border-[#4A6CF7]/30 bg-white/80 dark:bg-[#18181B]/60 hover:bg-white text-[#3730A3] dark:text-[#C7D2FE] transition-colors shrink-0"
                            >
                                <HelpCircle className="w-3.5 h-3.5" />
                                {showGuide ? "Hide guide" : "How to use"}
                                {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        <div className="mt-4 flex flex-col sm:flex-row items-stretch gap-2.5 max-w-3xl">
                            <div className="relative flex-1">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#71717A]" />
                                <input
                                    type="text"
                                    value={docname}
                                    onChange={(e) => setDocname(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Document number, e.g. 2026082110002856"
                                    className="h-12 w-full pl-10 pr-3 rounded-xl border border-[#C7D2FE] dark:border-[#4A6CF7]/30 bg-white dark:bg-[#18181B] text-[14px] font-mono font-semibold text-[#27272A] dark:text-[#F4F4F5] placeholder:text-[#A1A1AA] placeholder:font-sans placeholder:font-normal focus:outline-none focus:border-[#4F46E5] focus:ring-[3px] focus:ring-[#4F46E5]/15 transition-colors"
                                />
                            </div>
                            <button
                                onClick={() => handleTrack()}
                                disabled={loading || !docname.trim()}
                                className={cn(
                                    "h-12 px-7 rounded-xl text-[14px] font-bold bg-[#4F46E5] hover:bg-[#3730A3] text-white transition-colors disabled:cursor-not-allowed shrink-0 shadow-sm flex items-center justify-center",
                                    !loading && "disabled:opacity-50",
                                    loading ? "w-20" : "min-w-[96px]",
                                )}
                            >
                                {loading ? <ThinkingOrbs /> : "Track"}
                            </button>
                        </div>

                        {recent.length > 0 && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                                    <History className="w-3 h-3" /> Recent
                                </span>
                                {recent.map((r) => (
                                    <button
                                        key={r}
                                        onClick={() => handleTrack(r)}
                                        disabled={loading}
                                        className="px-2.5 py-1 rounded-full text-[11.5px] font-mono font-semibold border border-[#C7D2FE] dark:border-[#4A6CF7]/30 bg-white/80 dark:bg-[#18181B]/60 text-[#3730A3] dark:text-[#C7D2FE] hover:bg-[#EEF2FF] dark:hover:bg-[#4A6CF7]/15 transition-colors"
                                    >
                                        {r}
                                    </button>
                                ))}
                                <button
                                    onClick={forgetRecent}
                                    aria-label="Clear recent searches"
                                    className="p-1 rounded-full text-[#71717A] hover:text-[#18181B] dark:hover:text-white hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {showGuide && (
                    <Panel title="How it works" icon={BookOpen}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {GUIDE_STEPS.map((step) => (
                                <div
                                    key={step.n}
                                    className="flex items-start gap-3 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#F8FAFF] dark:bg-[#18181B]/50 p-3.5"
                                >
                                    <span className="w-7 h-7 rounded-lg bg-[#4F46E5] text-white font-black text-[13px] flex items-center justify-center shrink-0">
                                        {step.n}
                                    </span>
                                    <div>
                                        <h5 className="text-[13px] font-bold text-[#18181B] dark:text-[#FAFAF9]">{step.title}</h5>
                                        <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] leading-relaxed mt-0.5">{step.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-[#71717A] dark:text-[#A1A1AA]">
                            <Info className="w-3.5 h-3.5 text-[#4F46E5]" />
                            You will see the workflow state, pending approvers, the linked project and the activity trail.
                        </p>
                    </Panel>
                )}

                {error && (
                    <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-[13px] font-semibold text-red-700 dark:text-red-400">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="py-16 text-center">
                        <ThinkingOrbs size="w-3.5 h-3.5" color="bg-[#4F46E5]" className="gap-2.5 mb-4" />
                        <p className="text-[13px] font-semibold text-[#71717A]">
                            Tracking {docname.trim() || "application"}…
                        </p>
                    </div>
                )}

                {result && (
                    <>
                        {/* Summary */}
                        <Panel>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4F46E5] dark:text-[#A5B4FC]">
                                        {result.doctype || "Application"}
                                    </p>
                                    <p className="text-[20px] font-black font-mono tracking-tight text-[#18181B] dark:text-[#FAFAF9] break-all">
                                        {result.docname}
                                    </p>
                                    {result.title && (
                                        <p className="text-[12.5px] font-medium text-[#71717A] dark:text-[#A1A1AA] mt-0.5">{result.title}</p>
                                    )}
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

                            {result.workflow_progress && (
                                <div className="mt-4 pt-4 border-t border-[#E4E4E7] dark:border-[#3F3F46] flex items-center gap-2.5 flex-wrap">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">Progress</span>
                                    <Chip tone="zinc">{result.workflow_progress.previous_state}</Chip>
                                    <ArrowRight className="w-4 h-4 text-[#A1A1AA]" />
                                    <span
                                        className={cn(
                                            "px-2.5 py-1 rounded-full text-[11.5px] font-extrabold border",
                                            statusColors.bg,
                                            statusColors.text,
                                            statusColors.border,
                                        )}
                                    >
                                        {result.workflow_progress.current_state}
                                    </span>
                                </div>
                            )}
                        </Panel>

                        {/* Key facts */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <StatTile
                                label="Project"
                                icon={Hash}
                                mono
                                value={result.project_no || result.linked_project?.project_no || "—"}
                                sub={result.linked_project?.name && (
                                    <span className="inline-flex items-center gap-1">
                                        <FolderKanban className="w-3 h-3" />
                                        {result.linked_project.name}
                                    </span>
                                )}
                            />
                            <StatTile
                                label="Pending with"
                                icon={UserIcon}
                                value={result.pending_with?.state || "—"}
                                sub={result.pending_with?.is_terminal ? "Final state" : result.pending_with?.roles?.join(", ")}
                            />
                            <StatTile
                                label="Created by"
                                icon={UserCog}
                                value={result.created?.by || "—"}
                                sub={result.created ? fmtDateTime(result.created.on) : undefined}
                            />
                            <StatTile
                                label="Last action"
                                icon={Clock}
                                value={result.last_action?.user || result.last_user || "—"}
                                sub={result.last_action ? fmtDateTime(result.last_action.timestamp) : undefined}
                            />
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-start">
                            {/* Activity */}
                            <Panel title="Recent activity" icon={Activity} className="xl:col-span-2">
                                {result.recent_activity?.length ? (
                                    <ol>
                                        {result.recent_activity.map((entry, i) => {
                                            const Icon = sourceIcon(entry.source);
                                            const isLast = i === result.recent_activity!.length - 1;
                                            return (
                                                <li key={i} className="flex gap-3">
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-8 h-8 rounded-full bg-[#EEF2FF] dark:bg-[#4A6CF7]/15 border border-[#C7D2FE] dark:border-[#4A6CF7]/30 flex items-center justify-center shrink-0">
                                                            <Icon className="w-4 h-4 text-[#4F46E5] dark:text-[#A5B4FC]" />
                                                        </div>
                                                        {!isLast && <div className="w-px flex-1 bg-[#E4E4E7] dark:bg-[#3F3F46] my-1" />}
                                                    </div>
                                                    <div className={cn("pb-4 min-w-0", isLast && "pb-0")}>
                                                        <p className="text-[13px] text-[#3F3F46] dark:text-[#E4E4E7]">
                                                            <span className="font-extrabold text-[#18181B] dark:text-[#FAFAF9]">{entry.user}</span>{" "}
                                                            <span className="text-[#52525B] dark:text-[#D4D4D8]">{entry.detail}</span>
                                                        </p>
                                                        <p className="text-[11px] font-semibold text-[#A1A1AA] mt-0.5">
                                                            {entry.source} · {fmtDateTime(entry.timestamp)}
                                                        </p>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                ) : (
                                    <p className="text-[12.5px] text-[#71717A] dark:text-[#A1A1AA]">No activity recorded yet.</p>
                                )}
                            </Panel>

                            {/* Pending with */}
                            {result.pending_with && (
                                <Panel title="Pending with" icon={UserIcon}>
                                    <div className="space-y-4">
                                        <div className={cn("rounded-xl border px-3.5 py-3", pendingColors.bg, pendingColors.border)}>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-[#71717A] mb-1">State</p>
                                            <p className={cn("text-[15px] font-extrabold", pendingColors.text)}>{result.pending_with.state}</p>
                                        </div>

                                        {!!result.pending_with.roles?.length && (
                                            <div>
                                                <p className="flex items-center gap-1 text-[10.5px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-wider mb-2">
                                                    <UsersIcon className="w-3 h-3" /> Roles
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {result.pending_with.roles.map((r) => (
                                                        <Chip key={r}>{r}</Chip>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {!!result.pending_with.specific_approvers?.length && (
                                            <PersonList label="Approvers" icon={UserCog} items={result.pending_with.specific_approvers} />
                                        )}
                                        {!!result.pending_with.assigned_to?.length && (
                                            <PersonList label="Assigned to" items={result.pending_with.assigned_to} />
                                        )}
                                        {result.pending_with.is_terminal && (
                                            <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-emerald-700 dark:text-emerald-400">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Final state — no further action pending
                                            </div>
                                        )}
                                    </div>
                                </Panel>
                            )}
                        </div>
                    </>
                )}

                {!result && !error && !loading && !showGuide && (
                    <div className="py-12 px-6 text-center bg-white dark:bg-[#27272A] rounded-xl border border-dashed border-[#C7D2FE] dark:border-[#4A6CF7]/30">
                        <FileText className="w-9 h-9 mx-auto mb-3 text-[#4F46E5] dark:text-[#A5B4FC]" />
                        <h3 className="text-[15px] font-extrabold text-[#18181B] dark:text-[#FAFAF9]">No application loaded</h3>
                        <p className="text-[12.5px] text-[#71717A] dark:text-[#A1A1AA] max-w-md mx-auto mt-1">
                            Enter a document number above to see where it stands.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TrackApplication;
