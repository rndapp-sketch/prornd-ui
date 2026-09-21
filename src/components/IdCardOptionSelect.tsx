import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface IdCardOptionSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: string[];
    placeholder: string;
    disabled?: boolean;
    /**
     * Lets the user use text that isn't in the list: when a search matches nothing, a `Use "…"`
     * entry appears. For values a master list doesn't cover yet (e.g. a new designation).
     */
    allowOther?: boolean;
    /** "md" for the request form, "sm" for the compact HR edit panel. */
    size?: "md" | "sm";
    maxLength?: number;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits `text` around the search tokens so the matches can be emphasised. */
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return <>{text}</>;
    const pattern = new RegExp(`(${tokens.map(escapeRegExp).join("|")})`, "gi");
    const lowered = tokens.map((t) => t.toLowerCase());
    return (
        <>
            {text.split(pattern).map((part, i) =>
                lowered.includes(part.toLowerCase()) ? (
                    <mark
                        key={i}
                        className="rounded-sm bg-transparent font-bold text-[#4A6CF7] dark:text-[#93A8FF]"
                    >
                        {part}
                    </mark>
                ) : (
                    <React.Fragment key={i}>{part}</React.Fragment>
                ),
            )}
        </>
    );
};

const PANEL_MAX_HEIGHT = 340;

/**
 * A searchable dropdown for the ID card's Designation / Department.
 *
 * - Type to filter (every word must match, so "comp sci" finds "Computer Science…").
 * - Full keyboard support: ↑ ↓ to move, Enter to pick, Esc to close.
 * - The list is rendered in a portal, so it is never clipped by a card or modal edge, and it
 *   opens upward when there is no room below.
 * - The current value is never lost: a value that isn't in the list still shows in the field.
 * - With no options at all (loading, no permission, endpoint failure) it degrades to a plain
 *   text box so the form can always be completed.
 */
export const IdCardOptionSelect: React.FC<IdCardOptionSelectProps> = ({
    value,
    onChange,
    options,
    placeholder,
    disabled = false,
    allowOther = false,
    size = "md",
    maxLength,
}) => {
    const listId = useId();
    const triggerRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [rect, setRect] = useState<{ left: number; top: number; bottom: number; width: number } | null>(null);

    const isCompact = size === "sm";
    const fieldBase = cn(
        "w-full rounded-lg border bg-white text-zinc-900 transition-all duration-150",
        "dark:bg-zinc-800 dark:text-[#E4E4E7]",
        isCompact ? "min-h-[34px] px-3 py-1.5 text-sm" : "min-h-[40px] px-3 py-2 text-sm",
    );

    // ── Filtering ─────────────────────────────────────────────────────────────
    const visible = useMemo(() => {
        const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
        if (tokens.length === 0) return options;
        const matches = options.filter((o) => {
            const lower = o.toLowerCase();
            return tokens.every((t) => lower.includes(t));
        });
        // Entries that start with the query come first.
        const q = query.trim().toLowerCase();
        return matches.sort((a, b) => {
            const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1;
            const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1;
            return aStarts - bStarts;
        });
    }, [options, query]);

    const trimmedQuery = query.trim();
    const hasExactMatch = options.some((o) => o.toLowerCase() === trimmedQuery.toLowerCase());
    // Offered only when nothing in the list matches, so it never clutters a normal search.
    const customEntry =
        allowOther && trimmedQuery && !hasExactMatch && visible.length === 0 ? trimmedQuery : null;
    const rowCount = visible.length + (customEntry ? 1 : 0);

    // ── Open / close ──────────────────────────────────────────────────────────
    const close = useCallback((refocus = true) => {
        setOpen(false);
        setQuery("");
        if (refocus) triggerRef.current?.focus();
    }, []);

    const openPanel = useCallback(() => {
        if (disabled) return;
        setOpen(true);
    }, [disabled]);

    const updateRect = useCallback(() => {
        const el = triggerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setRect({ left: r.left, top: r.top, bottom: r.bottom, width: r.width });
    }, []);

    // Keep the panel glued to the field while the page or a modal scrolls.
    useLayoutEffect(() => {
        if (!open) return;
        updateRect();
        window.addEventListener("resize", updateRect);
        window.addEventListener("scroll", updateRect, true);
        return () => {
            window.removeEventListener("resize", updateRect);
            window.removeEventListener("scroll", updateRect, true);
        };
    }, [open, updateRect]);

    // Focus the search box and start on the selected row.
    useEffect(() => {
        if (!open) return;
        const selectedAt = options.indexOf(value);
        setActive(selectedAt >= 0 ? selectedAt : 0);
        const t = window.setTimeout(() => searchRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Typing changes the list; go back to its top.
    useEffect(() => {
        setActive(0);
    }, [query]);

    // Close on an outside click.
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const target = e.target as Node;
            if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            close(false);
        };
        document.addEventListener("mousedown", onDown);
        return () => document.removeEventListener("mousedown", onDown);
    }, [open, close]);

    // Scroll the highlighted row into view while arrowing through a long list.
    useEffect(() => {
        if (!open) return;
        listRef.current
            ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
            ?.scrollIntoView({ block: "nearest" });
    }, [active, open]);

    const commit = (next: string) => {
        onChange(next);
        close();
    };

    const rowValue = (idx: number): string | null =>
        idx < visible.length ? visible[idx] : customEntry && idx === visible.length ? customEntry : null;

    const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (rowCount === 0 ? 0 : (i + 1) % rowCount));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (rowCount === 0 ? 0 : (i - 1 + rowCount) % rowCount));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const picked = rowValue(active);
            if (picked !== null) commit(picked);
        } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            close();
        } else if (e.key === "Tab") {
            close(false);
        }
    };

    const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            openPanel();
        }
    };

    // ── No list to choose from: behave like the plain text box ───────────────
    if (options.length === 0) {
        return (
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                placeholder={placeholder}
                maxLength={maxLength}
                className={cn(
                    fieldBase,
                    "border-zinc-200 dark:border-zinc-700 placeholder:text-zinc-400",
                    "focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7]",
                    disabled && "cursor-not-allowed bg-zinc-100 text-zinc-500 dark:bg-zinc-800",
                )}
            />
        );
    }

    const isListed = options.includes(value);
    const showsOutsideValue = value !== "" && !isListed;

    // Open upward when there is no room below.
    const spaceBelow = rect ? window.innerHeight - rect.bottom : PANEL_MAX_HEIGHT;
    const openUp = rect ? spaceBelow < 280 && rect.top > spaceBelow : false;
    const panelStyle: React.CSSProperties | undefined = rect
        ? {
              position: "fixed",
              left: rect.left,
              width: rect.width,
              ...(openUp
                  ? { bottom: window.innerHeight - rect.top + 6 }
                  : { top: rect.bottom + 6 }),
          }
        : undefined;

    return (
        <>
            {/* Field */}
            <div
                ref={triggerRef}
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={open ? listId : undefined}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : 0}
                onClick={() => (open ? close() : openPanel())}
                onKeyDown={onTriggerKeyDown}
                className={cn(
                    fieldBase,
                    "group flex cursor-pointer items-center gap-2 border-zinc-200 dark:border-zinc-700",
                    "hover:border-zinc-300 dark:hover:border-zinc-600",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6CF7]/30 focus-visible:border-[#4A6CF7]",
                    open && "border-[#4A6CF7] ring-2 ring-[#4A6CF7]/25 dark:border-[#4A6CF7]",
                    disabled &&
                        "cursor-not-allowed bg-zinc-100 text-zinc-500 hover:border-zinc-200 dark:bg-zinc-800 dark:hover:border-zinc-700",
                )}
            >
                <span
                    className={cn(
                        "min-w-0 flex-1 truncate",
                        !value && "text-zinc-400 dark:text-zinc-500",
                    )}
                >
                    {value || placeholder}
                </span>

                {showsOutsideValue && (
                    <span
                        className={cn(
                            "flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                            allowOther
                                ? "bg-[#EEF2FF] text-[#4A6CF7] dark:bg-[#4A6CF7]/20 dark:text-[#93A8FF]"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
                        )}
                    >
                        {allowOther ? "Custom" : "Not in list"}
                    </span>
                )}

                {value && !disabled && (
                    <button
                        type="button"
                        aria-label="Clear selection"
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange("");
                        }}
                        className="flex-shrink-0 rounded-full p-0.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-700 dark:hover:text-zinc-200"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                )}

                <ChevronDown
                    className={cn(
                        "h-4 w-4 flex-shrink-0 text-zinc-400 transition-transform duration-200",
                        open && "rotate-180 text-[#4A6CF7]",
                    )}
                />
            </div>

            {/* Panel (portal) */}
            {open &&
                panelStyle &&
                createPortal(
                    <div
                        ref={panelRef}
                        style={panelStyle}
                        className={cn(
                            "z-[10000] overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl",
                            "dark:border-zinc-700 dark:bg-[#27272A]",
                            "animate-in fade-in-0 zoom-in-95 duration-100",
                        )}
                    >
                        {/* Search */}
                        <div className="border-b border-zinc-100 p-2 dark:border-zinc-700">
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                <input
                                    ref={searchRef}
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={onSearchKeyDown}
                                    placeholder="Search…"
                                    aria-controls={listId}
                                    aria-autocomplete="list"
                                    maxLength={maxLength}
                                    aria-activedescendant={rowCount > 0 ? `${listId}-${active}` : undefined}
                                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-8 pr-14 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#4A6CF7] focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/25 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
                                />
                                <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400 dark:border-zinc-600 dark:bg-zinc-700">
                                    Esc
                                </kbd>
                            </div>
                        </div>

                        {/* Options */}
                        <div
                            ref={listRef}
                            id={listId}
                            role="listbox"
                            className="max-h-60 overflow-y-auto overscroll-contain p-1.5"
                        >
                            {rowCount === 0 ? (
                                <div className="px-3 py-8 text-center">
                                    <Search className="mx-auto mb-2 h-5 w-5 text-zinc-300 dark:text-zinc-600" />
                                    <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                                        No matches for “{trimmedQuery}”
                                    </p>
                                    <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                                        Try a different word.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {visible.map((o, idx) => {
                                        const isSelected = o === value;
                                        const isActive = idx === active;
                                        return (
                                            <div
                                                key={o}
                                                id={`${listId}-${idx}`}
                                                data-idx={idx}
                                                role="option"
                                                aria-selected={isSelected}
                                                onMouseEnter={() => setActive(idx)}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => commit(o)}
                                                className={cn(
                                                    "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                                                    isSelected
                                                        ? "bg-[#EEF2FF] font-semibold text-[#1E3A8A] dark:bg-[#4A6CF7]/20 dark:text-[#C7D2FE]"
                                                        : "text-zinc-700 dark:text-zinc-200",
                                                    isActive && !isSelected && "bg-zinc-100 dark:bg-zinc-700/60",
                                                )}
                                            >
                                                <span className="min-w-0 flex-1 truncate">
                                                    <Highlight text={o} query={query} />
                                                </span>
                                                {isSelected && <Check className="h-4 w-4 flex-shrink-0 text-[#4A6CF7]" />}
                                            </div>
                                        );
                                    })}

                                    {customEntry && (
                                        <div
                                            id={`${listId}-${visible.length}`}
                                            data-idx={visible.length}
                                            role="option"
                                            aria-selected={false}
                                            onMouseEnter={() => setActive(visible.length)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => commit(customEntry)}
                                            className={cn(
                                                "mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-2.5 py-2 text-sm transition-colors",
                                                "border-[#4A6CF7]/40 text-[#4A6CF7] dark:text-[#93A8FF]",
                                                active === visible.length
                                                    ? "bg-[#EEF2FF] dark:bg-[#4A6CF7]/20"
                                                    : "bg-transparent",
                                            )}
                                        >
                                            <Plus className="h-4 w-4 flex-shrink-0" />
                                            <span className="min-w-0 flex-1 truncate">
                                                Use “<span className="font-bold">{customEntry}</span>”
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/70 px-3 py-1.5 text-[11px] font-medium text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-500">
                            <span>
                                {trimmedQuery
                                    ? `${visible.length} of ${options.length}`
                                    : `${options.length} option${options.length === 1 ? "" : "s"}`}
                            </span>
                            <span className="hidden sm:inline">↑↓ navigate · Enter select</span>
                        </div>
                    </div>,
                    document.body,
                )}
        </>
    );
};
