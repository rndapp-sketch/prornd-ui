import { AlertTriangleIcon, XIcon } from "lucide-react";

interface ErrorModalProps {
    open: boolean;
    title?: string;
    message: string;
    onClose: () => void;
}

export function ErrorModal({
    open,
    title = "Submission Failed",
    message,
    onClose,
}: ErrorModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-[#27272A] shadow-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-3 px-5 py-4 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900/40">
                    <AlertTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                    <h2 className="flex-1 text-sm font-extrabold uppercase tracking-wide text-red-800 dark:text-red-300">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-red-400 hover:text-red-600 dark:hover:text-red-200 shrink-0"
                    >
                        <XIcon className="h-4 w-4" />
                    </button>
                </div>
                <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
                    <p className="text-[13px] leading-relaxed text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap">
                        {message}
                    </p>
                </div>
                <div className="flex justify-end px-5 py-3 border-t border-zinc-200 dark:border-zinc-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-8 px-4 rounded-lg text-[11px] font-bold uppercase tracking-wide text-white bg-red-600 hover:bg-red-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
