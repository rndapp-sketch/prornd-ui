import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface CommentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (comment: string) => void;
    action: string;
    isLoading: boolean;
    requireComment?: boolean;
}

export const CommentModal = ({
    isOpen,
    onClose,
    onSubmit,
    action,
    isLoading,
    requireComment = false,
}: CommentModalProps) => {
    const [comment, setComment] = useState("");

    // Reset comment when modal opens
    useEffect(() => {
        if (isOpen) setComment("");
    }, [isOpen]);

    if (!isOpen) return null;

    const canSubmit = !requireComment || comment.trim().length > 0;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md mx-4">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Confirm: {action}
                </h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                    {requireComment
                        ? "A comment is required to proceed."
                        : "Optionally add a comment before proceeding."}
                </p>
                <textarea
                    className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-1 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] dark:bg-zinc-800 dark:text-zinc-100"
                    rows={4}
                    placeholder={requireComment ? "Enter your comment..." : "Add a comment (optional)..."}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    autoFocus
                />
                {requireComment && comment.trim().length === 0 && (
                    <p className="text-xs text-red-500 mb-3">Comment is required.</p>
                )}
                <div className="flex justify-end gap-2 mt-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading || !canSubmit}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Processing..." : "Confirm"}
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};
