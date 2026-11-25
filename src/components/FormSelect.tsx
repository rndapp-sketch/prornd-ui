import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A drop-in replacement for a native <select>: same <option> children, same `value`, and `onChange`
 * receives an event-like object ({ target: { value } }), so existing handlers that read
 * `e.target.value` keep working unchanged. Only the look changes.
 *
 * The list is portalled to <body> (so it is never clipped by tables or cards), which means it uses literal
 * colours with dark: variants instead of the dashboard CSS variables.
 */
type ChangeLike = { target: { value: string; name?: string } };

interface FormSelectProps {
    value?: string;
    onChange?: (e: ChangeLike) => void;
    children?: React.ReactNode;
    id?: string;
    name?: string;
    required?: boolean;
    disabled?: boolean;
    /** Smaller trigger, for use inside tables */
    compact?: boolean;
    placeholder?: string;
    /** Anything else passed by the caller (className, readOnly, maxLength…) is ignored on purpose */
    [extra: string]: unknown;
}

interface Opt {
    value: string;
    label: string;
}

const SEARCH_THRESHOLD = 8;

export const FormSelect: React.FC<FormSelectProps> = ({
    value = "",
    onChange,
    children,
    id,
    name,
    required,
    disabled,
    compact,
    placeholder = "Select...",
}) => {
    // Read the <option> children, exactly what a native select would have shown
    const options = useMemo<Opt[]>(() => {
        const out: Opt[] = [];
        React.Children.toArray(children).forEach((child) => {
            if (!React.isValidElement(child)) return;
            const props = child.props as { value?: unknown; children?: React.ReactNode };
            const label = React.Children.toArray(props.children).join("");
            out.push({ value: String(props.value ?? label), label });
        });
        return out;
    }, [children]);

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number; maxH: number }>({ left: 0, width: 0, maxH: 280 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const current = options.find((o) => o.value === String(value ?? ""));
    const showSearch = options.length > SEARCH_THRESHOLD;
    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    }, [options, query]);

    const place = () => {
        const r = buttonRef.current?.getBoundingClientRect();
        if (!r) return;
        const below = window.innerHeight - r.bottom - 12;
        const above = r.top - 12;
        const openUp = below < 220 && above > below;
        setPos({
            left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 240) - 8)),
            width: Math.max(r.width, 240),
            ...(openUp ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
            maxH: Math.max(160, Math.min(320, openUp ? above : below)),
        });
    };

    const openList = () => {
        if (disabled) return;
        place();
        setQuery("");
        setActive(Math.max(0, options.findIndex((o) => o.value === String(value ?? ""))));
        setOpen(true);
    };

    const choose = (v: string) => {
        onChange?.({ target: { value: v, name } });
        setOpen(false);
        buttonRef.current?.focus();
    };

    // Close on outside click; follow the trigger on scroll/resize
    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (buttonRef.current?.contains(t) || listRef.current?.contains(t) || searchRef.current?.contains(t)) return;
            setOpen(false);
        };
        const onMove = () => place();
        document.addEventListener("mousedown", onDown);
        window.addEventListener("resize", onMove);
        window.addEventListener("scroll", onMove, true);
        if (showSearch) setTimeout(() => searchRef.current?.focus(), 0);
        return () => {
            document.removeEventListener("mousedown", onDown);
            window.removeEventListener("resize", onMove);
            window.removeEventListener("scroll", onMove, true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Keep the highlighted option in view
    useEffect(() => {
        if (!open) return;
        listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
    }, [active, open]);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (!open) {
            if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
                e.preventDefault();
                openList();
            }
            return;
        }
        if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            buttonRef.current?.focus();
        } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => Math.min(visible.length - 1, i + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => Math.max(0, i - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (visible[active]) choose(visible[active].value);
        } else if (e.key === "Tab") {
            setOpen(false);
        }
    };

    const list =
        open &&
        createPortal(
            <div
                style={{ position: "fixed", left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxH, zIndex: 10000 }}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#E5E7EF] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F5FF_55%,#F1F6EA_100%)] shadow-[0_18px_40px_-12px_rgba(21,27,50,0.35)] dark:border-[#3F3F46] dark:bg-[linear-gradient(180deg,#2B2B30_0%,#2A2838_60%,#2A3027_100%)]"
                onKeyDown={onKeyDown}
            >
                {showSearch && (
                    <div className="border-b border-[#E5E7EF]/80 p-2 dark:border-[#3F3F46]">
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#9299A9]" />
                            <input
                                ref={searchRef}
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setActive(0);
                                }}
                                placeholder="Search…"
                                className="h-8 w-full rounded-lg border border-[#E5E7EF] bg-white/80 pl-8 pr-2 text-[12.5px] text-[#151B32] outline-none placeholder:text-[#9299A9] focus:border-[#6842D9] focus:ring-2 focus:ring-[#6842D9]/15 dark:border-[#3F3F46] dark:bg-[#18181B]/60 dark:text-[#F4F4F5]"
                            />
                        </div>
                    </div>
                )}
                <ul ref={listRef} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1.5">
                    {visible.length === 0 ? (
                        <li className="px-3 py-3 text-center text-[12px] italic text-[#9299A9]">No matches</li>
                    ) : (
                        visible.map((o, i) => {
                            const selected = o.value === String(value ?? "");
                            return (
                                <li
                                    key={`${o.value}-${i}`}
                                    data-i={i}
                                    role="option"
                                    aria-selected={selected}
                                    onMouseEnter={() => setActive(i)}
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        choose(o.value);
                                    }}
                                    className={cn(
                                        "flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-[13px] transition-colors",
                                        o.value === "" ? "italic text-[#9299A9]" : "font-medium text-[#151B32] dark:text-[#F4F4F5]",
                                        i === active && "bg-[#6842D9]/10 text-[#5632C5] dark:bg-[#8B6CF0]/20 dark:text-[#D9CCFF]",
                                        selected && "font-bold",
                                    )}
                                >
                                    <span className="min-w-0 flex-1 break-words">{o.label}</span>
                                    {selected && <Check className="size-4 shrink-0 text-[#0DA875]" strokeWidth={2.5} />}
                                </li>
                            );
                        })
                    )}
                </ul>
            </div>,
            document.body,
        );

    return (
        <div className="relative w-full">
            <button
                ref={buttonRef}
                type="button"
                id={id}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => (open ? setOpen(false) : openList())}
                onKeyDown={onKeyDown}
                className={cn(
                    "flex w-full items-center justify-between gap-2 border text-left font-medium transition-all duration-150",
                    "border-[#E5E7EF] bg-[linear-gradient(180deg,#FFFFFF_0%,#F7F4FF_100%)] text-[#151B32] dark:border-[#3F3F46] dark:bg-[linear-gradient(180deg,#27272A_0%,#2A2838_100%)] dark:text-[#F4F4F5]",
                    "hover:border-[#6842D9]/45 focus:outline-none focus-visible:border-[#6842D9] focus-visible:ring-[3px] focus-visible:ring-[#6842D9]/15",
                    open && "border-[#6842D9] ring-[3px] ring-[#6842D9]/15",
                    disabled && "cursor-not-allowed opacity-60",
                    compact ? "h-9 rounded-lg px-2.5 text-[12.5px]" : "h-10 rounded-lg px-3 text-[13.5px]",
                )}
            >
                <span className={cn("min-w-0 flex-1 truncate", !current || current.value === "" ? "text-[#9299A9]" : "")}>
                    {current && current.value !== "" ? current.label : placeholder}
                </span>
                <ChevronDown className={cn("size-4 shrink-0 text-[#71717A] transition-transform duration-200", open && "rotate-180 text-[#6842D9]")} />
            </button>
            {/* Keeps the browser's own "required" check working, since a button can't be required */}
            {required && (
                <input
                    tabIndex={-1}
                    aria-hidden
                    required
                    value={String(value ?? "")}
                    onChange={() => undefined}
                    className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
                />
            )}
            {list}
        </div>
    );
};

export default FormSelect;
