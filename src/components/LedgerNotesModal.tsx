import { createPortal } from "react-dom";
import { NotebookPen, X } from "lucide-react";
import { useFloatingWindow } from "@/hooks/useFloatingWindow";
import { ResizeEdges } from "@/components/ResizeEdges";
import LedgerNotesEditor, { type NoteReference } from "@/components/LedgerNotesEditor";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    projectName: string;
    reference?: NoteReference | null;
}

/** Draggable, resizable floating notes window; the page behind stays usable. */
const LedgerNotesModal = ({ isOpen, onClose, projectName, reference }: Props) => {
    const { rect, moveHandlers, edgeHandlers } = useFloatingWindow({
        isOpen,
        persistKey: "ledger-notes",
        maxWidth: 640,
        minWidth: 360,
        minHeight: 320,
    });

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none" role="dialog" aria-modal="false">
            <div
                className="pointer-events-auto absolute flex flex-col rounded-xl overflow-hidden shadow-2xl bg-white dark:bg-[#27272A]"
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, border: "2px solid #A1A1AA" }}
            >
                <header
                    {...moveHandlers}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-move select-none touch-none border-b border-zinc-300 dark:border-zinc-600 bg-[#FAFAF9] dark:bg-zinc-900/60"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#D97757]/10 text-[#D97757]">
                            <NotebookPen className="w-4 h-4" />
                        </span>
                        <div className="min-w-0">
                            <h2 className="text-sm font-bold leading-tight text-zinc-900 dark:text-zinc-100">Ledger Notes</h2>
                            <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">{projectName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="h-8 w-8 flex items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors"
                        aria-label="Close notes"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </header>
                <div className="flex-1 min-h-0">
                    <LedgerNotesEditor embedded reference={reference} projectName={projectName} />
                </div>
                <ResizeEdges edgeHandlers={edgeHandlers} />
            </div>
        </div>,
        document.body,
    );
};

export default LedgerNotesModal;
