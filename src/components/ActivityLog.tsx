import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
    PlusCircleIcon,
    PencilLineIcon,
    MessageSquareIcon,
    ActivityIcon,
    RefreshCwIcon,
    InfoIcon,
    BanIcon,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActivityLogEntry {
    type: "creation" | "edit" | "comment" | string;
    label: string;
    user: string;
    user_email: string;
    timestamp: string;
    content?: string;
}

export interface ActivityLogProps {
    doctype: string;
    docname: string;
    className?: string;
    /** Max height of the scrollable list. Defaults to 400px. */
    maxHeight?: string;
    fallbackOwner?: string;
    fallbackCreation?: string;
    fallbackOwnerName?: string;
    /** Show only comment-type entries, hiding creation/edit activity. */
    onlyComments?: boolean;
}

// ─── Module-level cache ───────────────────────────────────────────────────────
// Key: `${doctype}::${docname}` → entries array
const _cache = new Map<string, ActivityLogEntry[]>();

export function clearActivityLogCache(doctype: string, docname: string) {
    _cache.delete(`${doctype}::${docname}`);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cacheKey(doctype: string, docname: string) {
    return `${doctype}::${docname}`;
}

function formatTimestamp(ts: string): string {
    if (!ts) return "";
    try {
        const date = new Date(ts);
        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    } catch {
        return ts;
    }
}

// ─── Icon / colour per type ───────────────────────────────────────────────────

function typeConfig(type: string) {
    switch (type) {
        case "creation":
            return {
                Icon: PlusCircleIcon,
                dot: "bg-emerald-500 border-emerald-200",
                iconColor: "text-emerald-600 dark:text-emerald-400",
                badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
            };
        case "edit":
            return {
                Icon: PencilLineIcon,
                dot: "bg-blue-500 border-blue-200",
                iconColor: "text-blue-600 dark:text-blue-400",
                badge: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
            };
        case "comment":
            return {
                Icon: MessageSquareIcon,
                dot: "bg-[#D97757] border-orange-200",
                iconColor: "text-[#D97757]",
                badge: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800",
            };
        case "info":
            return {
                Icon: InfoIcon,
                dot: "bg-sky-500 border-sky-200",
                iconColor: "text-sky-600 dark:text-sky-400",
                badge: "bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800",
            };
        case "cancellation":
            return {
                Icon: BanIcon,
                dot: "bg-red-500 border-red-200",
                iconColor: "text-red-600 dark:text-red-400",
                badge: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
            };
        default:
            return {
                Icon: ActivityIcon,
                dot: "bg-zinc-400 border-zinc-200",
                iconColor: "text-zinc-500 dark:text-zinc-400",
                badge: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
            };
    }
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const LogSkeleton: React.FC = () => (
    <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 flex flex-col items-center">
                    <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                    {i < 2 && <div className="w-0.5 h-8 bg-zinc-200 dark:bg-zinc-700 mt-1" />}
                </div>
                <div className="flex-1 pt-0.5 space-y-1.5">
                    <div className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded w-3/4" />
                    <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded w-1/2" />
                </div>
            </div>
        ))}
    </div>
);

// ─── Single log entry ─────────────────────────────────────────────────────────

const LogItem: React.FC<{ entry: ActivityLogEntry; isLast: boolean }> = ({
    entry,
    isLast,
}) => {
    const { Icon, dot, badge } = typeConfig(entry.type);
    const initials = (entry.user || entry.user_email || "?")
        .charAt(0)
        .toUpperCase();

    const [designation, setDesignation] = useState<string>("");
    const [fullName, setFullName] = useState<string>("");

    useEffect(() => {
        if (!entry.user_email) return;
        
        const email = encodeURIComponent(entry.user_email);

        fetch(`/api/resource/Employee?filters=[["user_id","=","${email}"]]&fields=["designation","employee_name"]`, { credentials: "include" })
            .then(res => res.json())
            .then(json => {
                let nameSet = false;
                if (json?.data && json.data.length > 0) {
                    if (json.data[0].designation) setDesignation(json.data[0].designation);
                    if (json.data[0].employee_name) {
                        setFullName(json.data[0].employee_name);
                        nameSet = true;
                    }
                }
                
                // Fallback to User doctype if Employee record doesn't exist
                if (!nameSet) {
                    fetch(`/api/resource/User/${email}?fields=["full_name"]`, { credentials: "include" })
                        .then(r => r.json())
                        .then(j => {
                            if (j?.data?.full_name) setFullName(j.data.full_name);
                        })
                        .catch(err => console.warn("Failed to fetch User name:", err));
                }
            })
            .catch(err => console.warn("Failed to fetch Employee designation:", err));
    }, [entry.user_email]);

    return (
        <div className="flex items-start gap-3 group">
            {/* Left column: dot + connector */}
            <div className="flex-shrink-0 flex flex-col items-center">
                <div
                    className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center border-2 shadow-sm flex-shrink-0",
                        dot,
                    )}
                    title={entry.type}
                >
                    <Icon className="w-3.5 h-3.5 text-white" />
                </div>
                {!isLast && (
                    <div className="w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-700 mt-1 min-h-[1.5rem]" />
                )}
            </div>

            {/* Right column: content */}
            <div className="flex-1 min-w-0 pb-4">
                {/* Header row */}
                <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    {/* Avatar initial */}
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        {initials}
                    </span>
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[130px]">
                        {fullName || entry.user || entry.user_email}
                    </span>
                    {designation && (
                        <span className="designation-text" style={{ display: "none" }}>
                            {designation}
                        </span>
                    )}
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {entry.label}
                    </span>
                    {/* Type badge */}
                    <span
                        className={cn(
                            "ml-auto flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border",
                            badge,
                        )}
                    >
                        {entry.type}
                    </span>
                </div>

                {/* Timestamp */}
                <p
                    className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-1"
                >
                    {formatTimestamp(entry.timestamp)}
                </p>

                {/* Comment content */}
                {entry.content && (
                    <div className="mt-1.5 p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed prose prose-xs dark:prose-invert max-w-none line-clamp-4"
                        dangerouslySetInnerHTML={{ __html: entry.content }}
                    />
                )}
            </div>
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const ActivityLog: React.FC<ActivityLogProps> = ({
    doctype,
    docname,
    className,
    maxHeight = "400px",
    fallbackOwner,
    fallbackCreation,
    fallbackOwnerName,
    onlyComments = false,
}) => {
    const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetchLogs = (dt: string, dn: string, force = false, fOwner?: string, fCreation?: string, fOwnerName?: string) => {
        if (!dt || !dn) return;

        const key = cacheKey(dt, dn);

        // Return cached data immediately (no loading flash for cached results)
        if (!force && _cache.has(key)) {
            setEntries(_cache.get(key)!);
            setLoading(false);
            setError(null);
            return;
        }

        // Abort any in-flight request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        const params = new URLSearchParams({ doctype: dt, docname: dn });
        const docActivityUrl = `/api/method/rndopsapp.rndopsapp.api.get_document_activity?${params}`;
        const projActivityUrl = `/api/method/rndopsapp.rndopsapp.api.get_project_activity?${params}`;

        Promise.all([
            fetch(docActivityUrl, { method: "GET", credentials: "include", signal: controller.signal }),
            fetch(projActivityUrl, { method: "GET", credentials: "include", signal: controller.signal }).catch(() => null)
        ])
            .then(async ([docRes, projRes]) => {
                if (!docRes.ok) throw new Error(`HTTP ${docRes.status}`);
                const docJson = await docRes.json();
                const projJson = projRes && projRes.ok ? await projRes.json() : { message: [] };

                const docEntries: ActivityLogEntry[] = (Array.isArray(docJson?.message)
                    ? docJson.message
                    : []
                ).filter((e: ActivityLogEntry) => e.type !== "share" && e.type !== "unshare");

                const commentEntries: ActivityLogEntry[] = (Array.isArray(projJson?.message) ? projJson.message : []).map((c: any) => ({
                    type: "comment",
                    label: "Added a comment",
                    user: c.owner,
                    user_email: c.owner,
                    timestamp: c.creation,
                    content: c.content
                }));

                const rawEntries: ActivityLogEntry[] = [...docEntries, ...commentEntries];
                
                // Deduplicate entries (both APIs might return the same comments/attachments)
                const uniqueEntriesMap = new Map<string, ActivityLogEntry>();
                rawEntries.forEach(entry => {
                    // Strip HTML tags to ensure plain text and hyperlinked versions of the same text match
                    const plainContent = (entry.content || "").replace(/<[^>]*>?/gm, "").trim().toLowerCase();
                    const ts = entry.timestamp ? new Date(entry.timestamp).getTime() : 0;
                    const userKey = (entry.user_email || entry.user || "").toLowerCase();
                    // Real comments: key on user + text alone, ignoring timestamp entirely.
                    // get_document_activity and get_project_activity can report the same
                    // underlying comment with a couple seconds of timestamp drift between
                    // them (different source fields), which slipped past the old 1-second
                    // bucket and showed up as two rows with the same text and time in the
                    // printed activity log. The same user posting identical text twice for
                    // real is rare enough that collapsing it is the safer default.
                    // System/workflow entries (no content) keep a timestamp bucket, widened
                    // to 10s, since two distinct actions by the same user with no comment
                    // are more plausible than two distinct real comments with identical text.
                    const fuzzyTs = Math.floor(ts / 10000);
                    const key = plainContent
                        ? `c_${userKey}_${plainContent}`
                        : `s_${fuzzyTs}_${userKey}_${entry.label}`;
                    
                    if (uniqueEntriesMap.has(key)) {
                        const existing = uniqueEntriesMap.get(key)!;
                        // Prefer the entry with a real name over an email address
                        if (existing.user === existing.user_email && entry.user !== entry.user_email) {
                            // If we replace, we might lose the HTML link if the new one doesn't have it.
                            // Let's copy the content from the existing one if it has HTML and the new one doesn't.
                            const hasHtml = /<[a-z][\s\S]*>/i.test(existing.content || "");
                            if (hasHtml && !/<[a-z][\s\S]*>/i.test(entry.content || "")) {
                                entry.content = existing.content;
                            }
                            uniqueEntriesMap.set(key, entry);
                        } else if (/<[a-z][\s\S]*>/i.test(entry.content || "") && !/<[a-z][\s\S]*>/i.test(existing.content || "")) {
                            // If we keep existing, but the new one has better HTML (like a link), update existing's content
                            existing.content = entry.content;
                        }
                    } else {
                        uniqueEntriesMap.set(key, entry);
                    }
                });

                // Sort just in case, newest first
                let sorted = Array.from(uniqueEntriesMap.values()).sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime(),
                );

                // Inject fallback creation if not present
                const hasCreation = sorted.some((e) => e.type === "creation");
                if (!hasCreation && fOwner && fCreation) {
                    sorted.push({
                        type: "creation",
                        label: "Submitted",
                        user: fOwnerName || "",
                        user_email: fOwner,
                        timestamp: fCreation,
                    });
                    sorted.sort(
                        (a, b) =>
                            new Date(b.timestamp).getTime() -
                            new Date(a.timestamp).getTime(),
                    );
                }

                _cache.set(key, sorted);
                setEntries(sorted);
                setLoading(false);
            })
            .catch((err) => {
                if (err.name === "AbortError") return; // cancelled — do nothing
                setError("Unable to load activity");
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchLogs(doctype, docname, false, fallbackOwner, fallbackCreation, fallbackOwnerName);
        return () => {
            abortRef.current?.abort();
        };
    }, [doctype, docname, fallbackOwner, fallbackCreation, fallbackOwnerName]);

    const handleRefresh = () => {
        const key = cacheKey(doctype, docname);
        _cache.delete(key); // bust cache
        fetchLogs(doctype, docname, true, fallbackOwner, fallbackCreation, fallbackOwnerName);
    };

    // ── Render ──────────────────────────────────────────────────────────────

    const visibleEntries = onlyComments
        ? entries.filter((e) => e.type === "comment")
        : entries;

    return (
        <div className={cn("space-y-3", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ActivityIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Activity Log
                    </h4>
                    {!loading && visibleEntries.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            {visibleEntries.length}
                        </span>
                    )}
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={loading}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    title="Refresh activity log"
                >
                    <RefreshCwIcon
                        className={cn("w-3.5 h-3.5", loading && "animate-spin")}
                    />
                </button>
            </div>

            {/* Content */}
            <div
                className="overflow-y-auto pr-0.5 custom-scrollbar"
                style={{ maxHeight }}
            >
                {loading ? (
                    <LogSkeleton />
                ) : error ? (
                    <div className="flex flex-col items-center py-6 text-center">
                        <ActivityIcon className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mb-2" />
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                            {error}
                        </p>
                        <button
                            onClick={handleRefresh}
                            className="mt-2 text-xs text-[#D97757] hover:underline"
                        >
                            Retry
                        </button>
                    </div>
                ) : visibleEntries.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                        <ActivityIcon className="w-8 h-8 text-zinc-200 dark:text-zinc-700 mb-2" />
                        <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                            {onlyComments ? "No comments yet" : "No activity yet"}
                        </p>
                        <p className="text-[11px] text-zinc-300 dark:text-zinc-600 mt-0.5">
                            Activity will appear here once actions are taken.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {visibleEntries.map((entry, idx) => (
                            <LogItem
                                key={`${entry.timestamp}-${idx}`}
                                entry={entry}
                                isLast={idx === visibleEntries.length - 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

ActivityLog.displayName = "ActivityLog";
