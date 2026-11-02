import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const INTERACTIVE = "input, button, select, textarea, a, label, [role='button'], [contenteditable='true']";

/**
 * A scroll container for very wide tables: drag the empty space to scroll sideways, or use the
 * arrows (shown only when there is something to scroll). Shift+wheel still works natively.
 * The arrows render into the element with id `controlsTargetId` (e.g. a toolbar) when it exists,
 * otherwise they float over the bottom-right corner.
 */
export function HScrollArea({ className, children, controlsTargetId }: { className?: string; children: ReactNode; controlsTargetId?: string }) {
    const [target, setTarget] = useState<HTMLElement | null>(null);
    useEffect(() => {
        setTarget(controlsTargetId ? document.getElementById(controlsTargetId) : null);
    }, [controlsTargetId]);

    const ref = useRef<HTMLDivElement>(null);
    const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
    const [edges, setEdges] = useState({ left: false, right: false });
    const [dragging, setDragging] = useState(false);

    const measure = useCallback(() => {
        const el = ref.current;
        if (!el) return;
        setEdges({
            left: el.scrollLeft > 4,
            right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
        });
    }, []);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(el);
        if (el.firstElementChild) ro.observe(el.firstElementChild);
        return () => ro.disconnect();
    }, [measure]);

    const scrollBy = (dir: 1 | -1) =>
        ref.current?.scrollBy({ left: dir * Math.max(320, (ref.current?.clientWidth ?? 800) * 0.6), behavior: "smooth" });

    const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 || (e.target as HTMLElement).closest(INTERACTIVE)) return;
        drag.current = { x: e.clientX, left: ref.current?.scrollLeft ?? 0, moved: false };
    };
    const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const d = drag.current;
        if (!d || !ref.current) return;
        const dx = e.clientX - d.x;
        if (!d.moved && Math.abs(dx) < 6) return;
        if (!d.moved) {
            d.moved = true;
            setDragging(true);
            ref.current.setPointerCapture(e.pointerId);
        }
        ref.current.scrollLeft = d.left - dx;
    };
    const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
        if (drag.current?.moved && ref.current?.hasPointerCapture(e.pointerId)) ref.current.releasePointerCapture(e.pointerId);
        drag.current = null;
        setDragging(false);
    };

    const arrows = (
        <div className={cn("flex gap-2.5", !target && "pointer-events-none absolute bottom-4 right-6 z-40")}>
            {([[-1, ChevronLeft, edges.left, "Scroll left"], [1, ChevronRight, edges.right, "Scroll right"]] as const).map(([dir, Icon, on, label]) => (
                <button
                    key={label}
                    type="button"
                    aria-label={label}
                    title={label}
                    disabled={!on}
                    onClick={() => scrollBy(dir)}
                    className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#1F4D2B] bg-[#1F4D2B] text-white shadow-md ring-2 ring-white/70 transition hover:scale-105 hover:bg-[#2F6B3F] active:scale-95 disabled:border-zinc-300 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none disabled:ring-0 disabled:hover:scale-100 dark:ring-zinc-900/70 dark:disabled:border-zinc-700 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                >
                    <Icon className="h-6 w-6" strokeWidth={3} />
                </button>
            ))}
        </div>
    );
    const showArrows = edges.left || edges.right;

    return (
        <div className="relative">
            {showArrows && target && createPortal(arrows, target)}
            <div
                ref={ref}
                onScroll={measure}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                // a drag must not end up as a click on whatever cell is under the pointer
                onClickCapture={(e) => { if (dragging) e.stopPropagation(); }}
                className={cn(className, dragging && "cursor-grabbing select-none !scroll-auto")}
            >
                {children}
            </div>
            {showArrows && !target && arrows}
        </div>
    );
}
