import React, { useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import "@/pages/dashboards/projectStaffDashboard.css";
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
        return { bg: "bg-[var(--psd-returned-bg)]", text: "text-[#C02B3D] dark:text-rose-300", border: "border-[var(--psd-returned)]/40", solid: "bg-[var(--psd-returned)]" };
    }
    if (s.includes("approved") || s === "po generated" || s.includes("delivered") || s.includes("published")) {
        return { bg: "bg-[var(--psd-approved-bg)]", text: "text-[#0A8A60] dark:text-emerald-300", border: "border-[var(--psd-approved)]/40", solid: "bg-[var(--psd-approved)]" };
    }
    if (s.includes("draft")) {
        return { bg: "bg-[var(--psd-bg)]", text: "text-[var(--psd-body)]", border: "border-[var(--psd-border)]", solid: "bg-[var(--psd-muted)]" };
    }
    // Anything "Pending ..." / in-flight
    return { bg: "bg-[var(--psd-review-bg)]", text: "text-[#B26A00] dark:text-amber-300", border: "border-[var(--psd-review)]/40", solid: "bg-[var(--psd-review)]" };
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
            "psd-card overflow-hidden !rounded-xl",
            className,
        )}
    >
        {title && (
            <header className="flex items-center gap-2 border-b border-l-[3px] border-b-[var(--psd-border)] border-l-[var(--psd-accent)] bg-[var(--psd-bg)] px-3.5 py-2">
                {Icon && <Icon className="h-4 w-4 text-[var(--psd-accent)]" />}
                <h3 className="text-[12px] font-bold uppercase tracking-wider text-[var(--psd-heading)]">
                    {title}
                </h3>
                {action && <div className="ml-auto">{action}</div>}
            </header>
        )}
        <div className="p-3.5">{children}</div>
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
    <div className="psd-card min-w-0 !rounded-xl border-l-[3px] !border-l-[var(--psd-primary)] px-3 py-2.5">
        <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--psd-body)]">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[var(--psd-primary-light)]">
                <Icon className="h-3 w-3 text-[var(--psd-primary)]" />
            </span>
            {label}
        </p>
        <p className={cn("text-[13.5px] font-bold text-[var(--psd-heading)] truncate", mono && "font-mono")}>
            {value}
        </p>
        {sub && <p className="text-[11.5px] text-[var(--psd-body)] mt-0.5 truncate">{sub}</p>}
    </div>
);

const Chip = ({ children, tone = "indigo" }: { children: React.ReactNode; tone?: "indigo" | "zinc" }) => (
    <span
        className={cn(
            "px-2.5 py-1 rounded-full text-[11.5px] font-bold border",
            tone === "indigo"
                ? "bg-[var(--psd-primary-light)] text-[var(--psd-primary)] border-[var(--psd-primary)]/30"
                : "bg-[var(--psd-bg)] text-[var(--psd-body)] border-[var(--psd-border)]",
        )}
    >
        {children}
    </span>
);

const PersonList = ({ label, icon: Icon, items }: { label: string; icon?: React.ElementType; items: string[] }) => (
    <div>
        <p className="flex items-center gap-1 text-[10.5px] font-bold text-[var(--psd-body)] uppercase tracking-wider mb-2">
            {Icon && <Icon className="w-3 h-3" />} {label}
        </p>
        <div className="space-y-1.5">
            {items.map((a) => (
                <p
                    key={a}
                    className="text-[12px] font-mono font-semibold text-[var(--psd-heading)] bg-[var(--psd-bg)] border border-[var(--psd-border)] rounded-lg px-2.5 py-1.5 truncate"
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
        <div className="psd-root min-h-screen font-sans">
            <main className="flex-1 pb-6 w-full space-y-2.5">
                {/* Hero: title + search */}
                <header className="psd-hero relative overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                            <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                                <Activity className="size-4" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">Application Tracking</div>
                                <h1 className="mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">Track Application</h1>
                            </div>
                        </div>
                        <p className="hidden text-xs text-[var(--psd-body)] lg:block">Enter a document number to see its status, who it is pending with, and its recent activity.</p>
                        <button
                            onClick={() => setShowGuide((prev) => !prev)}
                            className="psd-focus inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-3 py-1.5 text-[12px] font-bold text-[var(--psd-heading)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]"
                        >
                            <HelpCircle className="h-3.5 w-3.5" />
                            {showGuide ? "Hide guide" : "How to use"}
                            {showGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                    </div>

                    <div className="mt-3 flex max-w-3xl flex-col items-stretch gap-2 sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--psd-muted)]" />
                            <input
                                type="text"
                                value={docname}
                                onChange={(e) => setDocname(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Document number, e.g. 2026082110002856"
                                className="h-10 w-full rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] pl-9 pr-3 font-mono text-[13.5px] font-semibold text-[var(--psd-heading)] transition-colors placeholder:font-sans placeholder:font-normal placeholder:text-[var(--psd-muted)] focus:border-[var(--psd-primary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--psd-primary)]/15"
                            />
                        </div>
                        <button
                            onClick={() => handleTrack()}
                            disabled={loading || !docname.trim()}
                            className={cn(
                                "flex h-10 shrink-0 items-center justify-center rounded-lg bg-[var(--psd-primary)] px-6 text-[13.5px] font-bold text-white shadow-sm transition-all hover:bg-[var(--psd-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed",
                                !loading && "disabled:opacity-50",
                                loading ? "w-20" : "min-w-[96px]",
                            )}
                        >
                            {loading ? <ThinkingOrbs /> : "Track"}
                        </button>
                    </div>

                    {recent.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[10.5px] font-bold uppercase tracking-wider text-[var(--psd-body)]">
                                <History className="h-3 w-3" /> Recent
                            </span>
                            {recent.map((r) => (
                                <button
                                    key={r}
                                    onClick={() => handleTrack(r)}
                                    disabled={loading}
                                    className="rounded-full border border-[var(--psd-primary)]/30 bg-[var(--psd-primary-light)] px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-[var(--psd-primary)] transition-colors hover:bg-[var(--psd-primary)] hover:text-white"
                                >
                                    {r}
                                </button>
                            ))}
                            <button
                                onClick={forgetRecent}
                                aria-label="Clear recent searches"
                                className="rounded-full p-1 text-[var(--psd-muted)] transition-colors hover:bg-[var(--psd-bg)] hover:text-[var(--psd-heading)]"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </header>

                {showGuide && (
                    <Panel title="How it works" icon={BookOpen}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {GUIDE_STEPS.map((step) => (
                                <div
                                    key={step.n}
                                    className="flex items-start gap-3 rounded-xl border border-[var(--psd-border)] bg-[var(--psd-bg)] p-3"
                                >
                                    <span className="w-7 h-7 rounded-full bg-[var(--psd-primary)] text-white font-bold text-[13px] flex items-center justify-center shrink-0">
                                        {step.n}
                                    </span>
                                    <div>
                                        <h5 className="text-[13px] font-bold text-[var(--psd-heading)]">{step.title}</h5>
                                        <p className="text-[12px] text-[var(--psd-body)] leading-snug mt-0.5">{step.body}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="mt-2.5 flex items-center gap-1.5 text-[11.5px] text-[var(--psd-body)]">
                            <Info className="w-3.5 h-3.5 text-[var(--psd-info)]" />
                            You will see the workflow state, pending approvers, the linked project and the activity trail.
                        </p>
                    </Panel>
                )}

                {error && (
                    <div className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl border border-[var(--psd-returned)]/40 bg-[var(--psd-returned-bg)] text-[13px] font-semibold text-[#C02B3D] dark:text-rose-300">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {loading && (
                    <div className="py-10 text-center">
                        <div className="psd-loadbar mx-auto mb-4 max-w-xs" />
                        <ThinkingOrbs size="w-3.5 h-3.5" color="bg-[#6842D9]" className="gap-2.5 mb-3" />
                        <p className="text-[13px] font-semibold text-[var(--psd-body)]">
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
                                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--psd-primary)]">
                                        {result.doctype || "Application"}
                                    </p>
                                    <p className="text-[19px] font-bold font-mono tracking-tight text-[var(--psd-heading)] break-all">
                                        {result.docname}
                                    </p>
                                    {result.title && (
                                        <p className="text-[12.5px] text-[var(--psd-body)] mt-0.5">{result.title}</p>
                                    )}
                                </div>
                                {result.current_status && (
                                    <span
                                        className={cn(
                                            "inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-[12.5px] font-bold border",
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
                                <div className="mt-3 pt-3 border-t border-[var(--psd-border)] flex items-center gap-2.5 flex-wrap">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--psd-muted)]">Progress</span>
                                    <Chip tone="zinc">{result.workflow_progress.previous_state}</Chip>
                                    <ArrowRight className="w-4 h-4 text-[var(--psd-muted)]" />
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
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
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

                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5 items-start">
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
                                                        <div className="w-8 h-8 rounded-full bg-[var(--psd-primary-light)] border border-[var(--psd-primary)]/30 flex items-center justify-center shrink-0">
                                                            <Icon className="w-4 h-4 text-[var(--psd-primary)]" />
                                                        </div>
                                                        {!isLast && <div className="w-px flex-1 bg-[var(--psd-border)] my-1" />}
                                                    </div>
                                                    <div className={cn("pb-4 min-w-0", isLast && "pb-0")}>
                                                        <p className="text-[13px] text-[var(--psd-body)]">
                                                            <span className="font-bold text-[var(--psd-heading)]">{entry.user}</span>{" "}
                                                            <span>{entry.detail}</span>
                                                        </p>
                                                        <p className="text-[11px] font-semibold text-[var(--psd-muted)] mt-0.5">
                                                            {entry.source} · {fmtDateTime(entry.timestamp)}
                                                        </p>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ol>
                                ) : (
                                    <p className="text-[12.5px] text-[var(--psd-body)]">No activity recorded yet.</p>
                                )}
                            </Panel>

                            {/* Pending with */}
                            {result.pending_with && (
                                <Panel title="Pending with" icon={UserIcon}>
                                    <div className="space-y-4">
                                        <div className={cn("rounded-xl border px-3.5 py-3", pendingColors.bg, pendingColors.border)}>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--psd-body)] mb-1">State</p>
                                            <p className={cn("text-[15px] font-extrabold", pendingColors.text)}>{result.pending_with.state}</p>
                                        </div>

                                        {!!result.pending_with.roles?.length && (
                                            <div>
                                                <p className="flex items-center gap-1 text-[10.5px] font-bold text-[var(--psd-body)] uppercase tracking-wider mb-2">
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
                                            <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#0A8A60] dark:text-emerald-300">
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
                    <div className="py-10 px-6 text-center psd-card !rounded-xl border-dashed">
                        <FileText className="w-9 h-9 mx-auto mb-3 text-[var(--psd-primary)]" />
                        <h3 className="text-[15px] font-bold text-[var(--psd-heading)]">No application loaded</h3>
                        <p className="text-[12.5px] text-[var(--psd-body)] max-w-md mx-auto mt-1">
                            Enter a document number above to see where it stands.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TrackApplication;
