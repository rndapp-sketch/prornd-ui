import type React from "react";
import type { ResizeEdge } from "@/hooks/useFloatingWindow";

type Props = { edgeHandlers: (edge: ResizeEdge) => React.HTMLAttributes<HTMLElement> };

const EDGES: { edge: ResizeEdge; cls: string }[] = [
    { edge: "n", cls: "top-0 left-3 right-3 h-1.5 cursor-ns-resize" },
    { edge: "s", cls: "bottom-0 left-3 right-3 h-1.5 cursor-ns-resize" },
    { edge: "w", cls: "left-0 top-3 bottom-3 w-1.5 cursor-ew-resize" },
    { edge: "e", cls: "right-0 top-3 bottom-3 w-1.5 cursor-ew-resize" },
    { edge: "nw", cls: "top-0 left-0 h-3 w-3 cursor-nwse-resize" },
    { edge: "ne", cls: "top-0 right-0 h-3 w-3 cursor-nesw-resize" },
    { edge: "sw", cls: "bottom-0 left-0 h-3 w-3 cursor-nesw-resize" },
];

/** Invisible edge/corner grips plus a visible grip at the bottom-right, for a floating window. */
export const ResizeEdges = ({ edgeHandlers }: Props) => (
    <>
        {EDGES.map(({ edge, cls }) => (
            <div key={edge} {...edgeHandlers(edge)} className={`absolute z-20 touch-none ${cls}`} />
        ))}
        <div
            {...edgeHandlers("se")}
            title="Drag to resize"
            className="absolute bottom-0 right-0 z-20 h-5 w-5 cursor-nwse-resize touch-none"
        >
            <svg viewBox="0 0 20 20" className="h-5 w-5 text-zinc-400">
                <path d="M6 18 L18 6 M11 18 L18 11 M16 18 L18 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
        </div>
    </>
);
