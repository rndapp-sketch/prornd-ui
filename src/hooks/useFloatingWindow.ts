import { useEffect, useRef, useState } from "react";
import type React from "react";

type Rect = { x: number; y: number; w: number; h: number };
export type ResizeEdge = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type Mode = "move" | ResizeEdge;

const savedRects = new Map<string, Rect>();

interface Options {
    isOpen: boolean;
    /** Remembers the window's position/size under this key, so a re-created window reopens where it was left. */
    persistKey?: string;
    maxWidth?: number;
    minWidth?: number;
    minHeight?: number;
}

/**
 * Geometry + pointer handlers for a draggable, resizable floating window.
 * Spread `moveHandlers` on the title bar and `edgeHandlers(edge)` on edge/corner grips (see ResizeEdges);
 * apply `rect` as left/top/width/height on a `position: absolute|fixed` element.
 */
export function useFloatingWindow({ isOpen, persistKey, maxWidth = 1500, minWidth = 640, minHeight = 360 }: Options) {
    const [rect, setRectState] = useState<Rect>(
        () => (persistKey && savedRects.get(persistKey)) || { x: 0, y: 0, w: 1200, h: 600 },
    );
    const gesture = useRef<{ mode: Mode; px: number; py: number; r: Rect } | null>(null);

    // Only user gestures write to the saved map; mounting must never overwrite it.
    const setRect = (r: Rect) => {
        if (persistKey) savedRects.set(persistKey, r);
        setRectState(r);
    };

    useEffect(() => {
        if (!isOpen) return;
        const saved = persistKey ? savedRects.get(persistKey) : undefined;
        if (saved) {
            setRectState(saved);
            return;
        }
        const w = Math.min(maxWidth, window.innerWidth * 0.96);
        const h = window.innerHeight * 0.88;
        setRectState({ x: (window.innerWidth - w) / 2, y: (window.innerHeight - h) / 2, w, h });
    }, [isOpen, maxWidth, persistKey]);

    const start = (mode: Mode) => (e: React.PointerEvent<HTMLElement>) => {
        if ((e.target as HTMLElement).closest("button")) return;
        gesture.current = { mode, px: e.clientX, py: e.clientY, r: rect };
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
    };

    const move = (e: React.PointerEvent<HTMLElement>) => {
        const g = gesture.current;
        if (!g) return;
        const dx = e.clientX - g.px;
        const dy = e.clientY - g.py;
        if (g.mode === "move") {
            setRect({
                ...g.r,
                x: Math.min(Math.max(g.r.x + dx, 80 - g.r.w), window.innerWidth - 80),
                y: Math.min(Math.max(g.r.y + dy, 0), window.innerHeight - 48),
            });
        } else {
            const maxR = window.innerWidth;
            const maxB = window.innerHeight;
            let { x, y, w, h } = g.r;
            if (g.mode.includes("e")) w = Math.min(Math.max(g.r.w + dx, minWidth), maxR - g.r.x);
            if (g.mode.includes("s")) h = Math.min(Math.max(g.r.h + dy, minHeight), maxB - g.r.y);
            if (g.mode.includes("w")) {
                const nx = Math.min(Math.max(g.r.x + dx, 0), g.r.x + g.r.w - minWidth);
                w = g.r.w + (g.r.x - nx);
                x = nx;
            }
            if (g.mode.includes("n")) {
                const ny = Math.min(Math.max(g.r.y + dy, 0), g.r.y + g.r.h - minHeight);
                h = g.r.h + (g.r.y - ny);
                y = ny;
            }
            setRect({ x, y, w, h });
        }
    };

    const end = (e: React.PointerEvent<HTMLElement>) => {
        gesture.current = null;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const handlers = (mode: Mode) => ({
        onPointerDown: start(mode),
        onPointerMove: move,
        onPointerUp: end,
        onPointerCancel: end,
    });

    return { rect, moveHandlers: handlers("move"), edgeHandlers: (edge: ResizeEdge) => handlers(edge) };
}
