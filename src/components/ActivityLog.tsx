import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
    PlusCircleIcon,
    PencilLineIcon,
    MessageSquareIcon,
    ActivityIcon,
    RefreshCwIcon,
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
                        {entry.user || entry.user_email}
                    </span>
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
}) => {
    const [entries, setEntries] = useState<ActivityLogEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const abortRef = useRef<AbortController | null>(null);

    const fetchLogs = (dt: string, dn: string, force = false) => {
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
        const url = `/api/method/rndopsapp.rndopsapp.api.get_document_activity?${params}`;

        fetch(url, {
            method: "GET",
            credentials: "include",
            signal: controller.signal,
        })
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((json) => {
                const rawEntries: ActivityLogEntry[] = Array.isArray(json?.message)
                    ? json.message
                    : [];
                // Already in reverse-chronological order from API;
                // Sort just in case, newest first
                const sorted = [...rawEntries].sort(
                    (a, b) =>
                        new Date(b.timestamp).getTime() -
                        new Date(a.timestamp).getTime(),
                );
                _cache.set(key, sorted);
                setEntries(sorted);
                setLoading(false);
            })
            .catch((err) => {
                if (err.name === "AbortError") return; // cancelled — do nothing
                console.warn("[ActivityLog] fetch failed:", err);
                setError("Unable to load activity");
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchLogs(doctype, docname);
        return () => {
            abortRef.current?.abort();
        };
    }, [doctype, docname]);

    const handleRefresh = () => {
        const key = cacheKey(doctype, docname);
        _cache.delete(key); // bust cache
        fetchLogs(doctype, docname, true);
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className={cn("space-y-3", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <ActivityIcon className="w-3.5 h-3.5 text-zinc-400" />
                    <h4 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Activity Log
                    </h4>
                    {!loading && entries.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            {entries.length}
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
                ) : entries.length === 0 ? (
                    <div className="flex flex-col items-center py-6 text-center">
                        <ActivityIcon className="w-8 h-8 text-zinc-200 dark:text-zinc-700 mb-2" />
                        <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                            No activity yet
                        </p>
                        <p className="text-[11px] text-zinc-300 dark:text-zinc-600 mt-0.5">
                            Activity will appear here once actions are taken.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-0">
                        {entries.map((entry, idx) => (
                            <LogItem
                                key={`${entry.timestamp}-${idx}`}
                                entry={entry}
                                isLast={idx === entries.length - 1}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

ActivityLog.displayName = "ActivityLog";
