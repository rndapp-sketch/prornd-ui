import React, { useMemo, useState } from "react";
import {
    Sparkles,
    CheckCircle2,
    Clock,
    AlertTriangle,
    ChevronDown,
    ChevronsDownUp,
    ChevronsUpDown,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    featureUpdates,
    type FeatureAccent,
    type FeatureStatus,
    type FeatureUpdate,
} from "@/data/featureUpdates";

const STATUS_META: Record<
    FeatureStatus,
    {
        label: string;
        icon: React.ElementType;
        className: string;
        /** fallback timeline colours when an entry has no accent of its own */
        dot: string;
        halo: string;
        time: string;
    }
> = {
    live: {
        label: "Live",
        icon: CheckCircle2,
        className:
            "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
        dot: "bg-emerald-500",
        halo: "ring-emerald-500/25",
        time: "text-emerald-600 dark:text-emerald-400",
    },
    "in-progress": {
        label: "In Progress",
        icon: Clock,
        className:
            "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
        dot: "bg-amber-500",
        halo: "ring-amber-500/25",
        time: "text-amber-600 dark:text-amber-400",
    },
    "frontend-only": {
        label: "Backend Pending",
        icon: AlertTriangle,
        className:
            "bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
        dot: "bg-[#4A6CF7]",
        halo: "ring-[#4A6CF7]/25",
        time: "text-[#4A6CF7] dark:text-[#93A8FF]",
    },
};

/** dot, its soft halo, the card's left bar, and the time text */
const ACCENTS: Record<FeatureAccent, { dot: string; halo: string; time: string }> = {
    indigo: { dot: "bg-[#4A6CF7]", halo: "ring-[#4A6CF7]/25", time: "text-[#4A6CF7] dark:text-[#93A8FF]" },
    violet: { dot: "bg-violet-500", halo: "ring-violet-500/25", time: "text-violet-600 dark:text-violet-400" },
    fuchsia: { dot: "bg-fuchsia-500", halo: "ring-fuchsia-500/25", time: "text-fuchsia-600 dark:text-fuchsia-400" },
    pink: { dot: "bg-pink-500", halo: "ring-pink-500/25", time: "text-pink-600 dark:text-pink-400" },
    rose: { dot: "bg-rose-500", halo: "ring-rose-500/25", time: "text-rose-600 dark:text-rose-400" },
    orange: { dot: "bg-[#D97757]", halo: "ring-[#D97757]/25", time: "text-[#C2603F] dark:text-[#F0A48A]" },
    amber: { dot: "bg-amber-500", halo: "ring-amber-500/25", time: "text-amber-600 dark:text-amber-400" },
    lime: { dot: "bg-lime-500", halo: "ring-lime-500/25", time: "text-lime-600 dark:text-lime-400" },
    emerald: { dot: "bg-emerald-500", halo: "ring-emerald-500/25", time: "text-emerald-600 dark:text-emerald-400" },
    teal: { dot: "bg-teal-500", halo: "ring-teal-500/25", time: "text-teal-600 dark:text-teal-400" },
    cyan: { dot: "bg-cyan-500", halo: "ring-cyan-500/25", time: "text-cyan-600 dark:text-cyan-400" },
    sky: { dot: "bg-sky-500", halo: "ring-sky-500/25", time: "text-sky-600 dark:text-sky-400" },
};

const formatDate = (dateStr: string) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });

/** "17:01" -> "5:01 PM". Returns null when the time isn't known. */
const formatTime = (time?: string): string | null => {
    if (!time) return null;
    const [h, m] = time.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

const monthLabel = (monthKey: string) =>
    new Date(monthKey + "-01T00:00:00").toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
    });

/** Newest first; entries without a time sort after timed ones on the same day. */
const byNewest = (a: FeatureUpdate, b: FeatureUpdate) =>
    `${b.date}T${b.time ?? "00:00"}`.localeCompare(`${a.date}T${a.time ?? "00:00"}`);

const ChangeLogRow: React.FC<{
    item: FeatureUpdate;
    open: boolean;
    onToggle: () => void;
}> = ({ item, open, onToggle }) => {
    const meta = STATUS_META[item.status];
    const StatusIcon = meta.icon;
    const color = item.accent ? ACCENTS[item.accent] : meta;
    const time = formatTime(item.time);
    const headerId = `wn-head-${item.id}`;
    const panelId = `wn-panel-${item.id}`;

    return (
        <li className="relative pl-6 sm:pl-8">
            {/* timeline dot */}
            <span
                aria-hidden
                className={cn(
                    "absolute left-px top-[21px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-white ring-4 transition-all duration-200 dark:border-[#18181B]",
                    color.dot,
                    open ? cn(color.halo, "scale-110") : "ring-transparent",
                )}
            />

            <div
                className={cn(
                    "overflow-hidden rounded-xl border bg-white shadow-sm transition-all dark:bg-[#27272A]",
                    open
                        ? "border-zinc-200 shadow-md dark:border-zinc-600"
                        : "border-zinc-200 hover:border-zinc-300 hover:shadow dark:border-zinc-700 dark:hover:border-zinc-600",
                )}
            >
                <button
                    type="button"
                    id={headerId}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={onToggle}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]/40 sm:gap-4"
                >
                    {/* date + time */}
                    <div className="w-[88px] shrink-0 sm:w-[104px]">
                        <div className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                            {formatDate(item.date)}
                        </div>
                        <div
                            className={cn("mt-0.5 flex items-center gap-1 text-[11px] font-semibold", color.time)}
                            title={time ? `${formatDate(item.date)}, ${time} IST` : undefined}
                        >
                            {time ? (
                                <>
                                    <Clock className="h-3 w-3" />
                                    {time}
                                </>
                            ) : null}
                        </div>
                    </div>

                    {/* title + preview */}
                    <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-bold leading-snug text-zinc-800 dark:text-zinc-100">
                            {item.title}
                        </h3>
                        {!open && (
                            <p className="mt-0.5 line-clamp-1 text-[13px] text-zinc-500 dark:text-zinc-400">
                                {item.summary}
                            </p>
                        )}
                    </div>

                    <Badge
                        variant="outline"
                        className={cn("hidden shrink-0 gap-1 sm:inline-flex", meta.className)}
                    >
                        <StatusIcon className="h-3 w-3" />
                        {meta.label}
                    </Badge>

                    <ChevronDown
                        aria-hidden
                        className={cn(
                            "mt-0.5 h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-200 motion-reduce:transition-none",
                            open && "rotate-180 text-[#D97757]",
                        )}
                    />
                </button>

                {/* details: grid-rows 0fr -> 1fr animates the height without measuring it */}
                <div
                    id={panelId}
                    role="region"
                    aria-labelledby={headerId}
                    aria-hidden={!open}
                    className={cn(
                        "grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none",
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                    )}
                >
                    <div className="overflow-hidden">
                        <div className="border-t border-zinc-100 px-4 pb-4 pt-3 dark:border-zinc-700/60">
                            <div className="mb-3 flex flex-wrap items-center gap-1.5">
                                <Badge
                                    variant="outline"
                                    className={cn("gap-1 sm:hidden", meta.className)}
                                >
                                    <StatusIcon className="h-3 w-3" />
                                    {meta.label}
                                </Badge>
                                {item.tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-[10px]">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>

                            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
                                {item.summary}
                            </p>

                            <ul className="space-y-1.5">
                                {item.highlights.map((h, i) => (
                                    <li
                                        key={i}
                                        className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-400"
                                    >
                                        <span
                                            aria-hidden
                                            className={cn("mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full", color.dot)}
                                        />
                                        <span>{h}</span>
                                    </li>
                                ))}
                            </ul>

                            {item.note && (
                                <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-900/20">
                                    <p className="text-xs text-amber-800 dark:text-amber-300">
                                        {item.note}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </li>
    );
};

const WhatsNew: React.FC = () => {
    const sorted = useMemo(() => [...featureUpdates].sort(byNewest), []);

    // Group by month, keeping the newest-first order.
    const groups = useMemo(() => {
        const map = new Map<string, FeatureUpdate[]>();
        sorted.forEach((item) => {
            const key = item.date.slice(0, 7);
            map.set(key, [...(map.get(key) ?? []), item]);
        });
        return Array.from(map.entries());
    }, [sorted]);

    // The latest change log starts open; everything else is collapsed.
    const [openIds, setOpenIds] = useState<Set<string>>(
        () => new Set(sorted.length ? [sorted[0].id] : []),
    );

    const toggle = (id: string) =>
        setOpenIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const allOpen = openIds.size === sorted.length;

    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-8">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#D97757]" />
                    <h1 className="text-xl font-extrabold text-zinc-800 dark:text-zinc-100">
                        What's New
                    </h1>
                </div>
                <button
                    type="button"
                    onClick={() =>
                        setOpenIds(allOpen ? new Set() : new Set(sorted.map((i) => i.id)))
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-bold text-zinc-600 transition-colors hover:border-[#D97757]/50 hover:text-[#D97757] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D97757]/40 dark:border-zinc-700 dark:bg-[#27272A] dark:text-zinc-300"
                >
                    {allOpen ? (
                        <ChevronsDownUp className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronsUpDown className="h-3.5 w-3.5" />
                    )}
                    {allOpen ? "Collapse all" : "Expand all"}
                </button>
            </div>
            <p className="mb-8 text-sm text-zinc-500 dark:text-zinc-400">
                Change log of recently added features and changes across the portal, newest first.
                Click an entry to see the details.
            </p>

            <div className="space-y-8">
                {groups.map(([monthKey, items]) => (
                    <section key={monthKey} aria-label={monthLabel(monthKey)}>
                        <h2 className="mb-3 flex items-center text-[11px] font-extrabold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                            <span aria-hidden className="mr-2 h-3.5 w-1 rounded-full bg-gradient-to-b from-[#4A6CF7] to-[#D97757]" />
                            {monthLabel(monthKey)}
                            <span className="ml-2 font-semibold normal-case tracking-normal">
                                · {items.length} {items.length === 1 ? "update" : "updates"}
                            </span>
                        </h2>
                        <ol className="relative ml-1.5 space-y-3 before:absolute before:bottom-0 before:left-0 before:top-0 before:w-0.5 before:rounded-full before:bg-gradient-to-b before:from-[#4A6CF7] before:via-[#D97757]/60 before:to-transparent">
                            {items.map((item) => (
                                <ChangeLogRow
                                    key={item.id}
                                    item={item}
                                    open={openIds.has(item.id)}
                                    onToggle={() => toggle(item.id)}
                                />
                            ))}
                        </ol>
                    </section>
                ))}
            </div>
        </div>
    );
};

export default WhatsNew;
