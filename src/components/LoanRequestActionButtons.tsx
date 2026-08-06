import { useState } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { loanRequestAPI } from "@/services/apiService";
import { ChevronRight, RotateCcw, CheckCircle2, XCircle } from "lucide-react";
import { ErrorModal } from "./ErrorModal";
import { parseFrappeError } from "../utils/errorUtils";

interface LoanRequestActionButtonsProps {
    docname: string;
    onActionComplete: () => void;
    onBeforeAction?: (action: string) => Promise<Record<string, any> | null>;
}

// --- COMMENT MODAL (same pattern as other modules) ---
const CommentModal = ({
    isOpen,
    onClose,
    onSubmit,
    action,
    isLoading,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (comment: string) => void;
    action: string;
    isLoading: boolean;
}) => {
    const [comment, setComment] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Confirm: {action}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                    You may add an optional comment before confirming.
                </p>
                <textarea
                    className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(217,119,87,0.25)] focus:border-[#D97757] dark:bg-zinc-800 dark:text-zinc-100"
                    rows={4}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] hover:bg-[#c66a4e] text-white disabled:opacity-50"
                    >
                        {isLoading ? "Processing..." : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- ACTION BUTTON STYLE BY TYPE ---
const getActionStyle = (action: string): string => {
    const a = action.toLowerCase();
    if (a === "forward")
        return "bg-[#D97757] hover:bg-[#c66a4e] text-white border-[#c66a4e]";
    if (a.includes("put back") || a === "putback")
        return "bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
    if (a === "approve")
        return "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700";
    if (a === "reject")
        return "bg-red-600 hover:bg-red-700 text-white border-red-700";
    if (a === "submit" || a === "deposit loan")
        return "bg-[#D97757] hover:bg-[#c66a4e] text-white border-[#c66a4e]";
    return "bg-white hover:bg-zinc-50 text-zinc-700 border-zinc-200 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
};

const getActionIcon = (action: string) => {
    const a = action.toLowerCase();
    if (a === "forward") return <ChevronRight className="w-4 h-4" />;
    if (a.includes("put back")) return <RotateCcw className="w-4 h-4" />;
    if (a === "approve") return <CheckCircle2 className="w-4 h-4" />;
    if (a === "reject") return <XCircle className="w-4 h-4" />;
    return null;
};

// --- MAIN COMPONENT ---
const LoanRequestActionButtons = ({
    docname,
    onActionComplete,
    onBeforeAction,
}: LoanRequestActionButtonsProps) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{
        message: string[];
    }>(loanRequestAPI.getWorkflowActions, { docname });

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        loanRequestAPI.performAction,
    );

    const { call: addComment } = useFrappePostCall(
        'rndopsapp.rndopsapp.api.add_project_comment',
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Action Failed", message: "" });

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            let extraArgs: Record<string, any> = {};
            if (onBeforeAction) {
                const result = await onBeforeAction(selectedAction);
                if (result === null) {
                    setModalOpen(false);
                    return;
                }
                extraArgs = result;
            }

            const res: any = await performAction({ docname, action: selectedAction, ...extraArgs });
            if (res?.message?.status === "error") {
                setModalOpen(false);
                setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(res?.message) });
                return;
            }
            // Log comment as activity if provided
            if (comment && comment.trim()) {
                try {
                    await addComment({
                        doctype: "Loan Request",
                        docname,
                        content: `[${selectedAction}] ${comment.trim()}`,
                    });
                } catch (commentError) {
                    console.error("Error adding comment:", commentError);
                }
            }
            setModalOpen(false);
            onActionComplete();
        } catch (error: any) {
            console.error("Error performing action:", error);
            setModalOpen(false);
            setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(error) });
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            <div className="flex gap-2 flex-wrap p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                <p className="w-full text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Available Actions
                </p>
                {data.message.map((action) => (
                    <button
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={!!actionLoading}
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 border",
                            "focus:outline-none focus:ring-2 focus:ring-offset-1",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            getActionStyle(action),
                        )}
                    >
                        {getActionIcon(action)}
                        {actionLoading ? "Processing..." : action}
                    </button>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={!!actionLoading}
            />
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </>
    );
};

export default LoanRequestActionButtons;
