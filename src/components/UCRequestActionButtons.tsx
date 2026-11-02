import { useState } from "react";
import { withCancellationLock } from "./CancellationLock";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { usePutBack, putBackLabel } from "@/components/PutBack";
import { cn } from "@/lib/utils";
import { ucRequestAPI } from "@/services/apiService";
import { ChevronRight, CheckCircle2, XCircle, Printer } from "lucide-react";
import { ErrorModal } from "./ErrorModal";
import { parseFrappeError } from "../utils/errorUtils";

// Workflow actions that confirm and print in one step. After the action
// succeeds the parent opens the print preview (onPrintAction).
export const UC_PRINT_ACTIONS = ["Verify & Print", "Print & Send to Registrar"];

const PRINT_ACTION_NOTE: Record<string, string> = {
    "Verify & Print":
        "By confirming, you verify the details of this Utilization Certificate request. The print preview opens next.",
    "Print & Send to Registrar":
        "Confirm that the Audited UC is being printed and sent to the Registrar for offline verification. The print preview opens next.",
};

interface UCRequestActionButtonsProps {
    docname: string;
    onActionComplete: () => void;
    onPrintAction?: (action: string) => void;
}

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
    const isPrintAction = UC_PRINT_ACTIONS.includes(action);
    const commentMissing = !isPrintAction && comment.trim().length === 0;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Confirm: {action}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                    {isPrintAction ? PRINT_ACTION_NOTE[action] : "A comment is required before confirming."}
                </p>
                <textarea
                    className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-1 resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(217,119,87,0.25)] focus:border-[#D97757] dark:bg-zinc-800 dark:text-zinc-100"
                    rows={4}
                    placeholder={isPrintAction ? "Comment (optional)" : "Enter your comment..."}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                {commentMissing && <p className="text-xs text-red-500 mb-3">Comment is required.</p>}
                <div className="flex justify-end gap-2 mt-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading || commentMissing}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] hover:bg-[#c66a4e] text-white disabled:opacity-50"
                    >
                        {isPrintAction && <Printer className="w-4 h-4" />}
                        {isLoading ? "Processing..." : isPrintAction ? "Confirm & Print" : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const getActionStyle = (action: string): string => {
    const a = action.toLowerCase();
    if (a === "approve") return "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700";
    if (a === "reject") return "bg-red-600 hover:bg-red-700 text-white border-red-700";
    return "bg-[#D97757] hover:bg-[#c66a4e] text-white border-[#c66a4e]";
};

const getActionIcon = (action: string) => {
    const a = action.toLowerCase();
    if (UC_PRINT_ACTIONS.includes(action)) return <Printer className="w-4 h-4" />;
    if (a === "approve") return <CheckCircle2 className="w-4 h-4" />;
    if (a === "reject") return <XCircle className="w-4 h-4" />;
    return <ChevronRight className="w-4 h-4" />;
};

const UCRequestActionButtons = ({ docname, onActionComplete, onPrintAction }: UCRequestActionButtonsProps) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        ucRequestAPI.getWorkflowActions,
        { docname },
    );
    const { call: performAction, loading: actionLoading } = useFrappePostCall(ucRequestAPI.performAction);
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");
    const putBack = usePutBack("UC Request", docname, onActionComplete);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({
        open: false, title: "Action Failed", message: "",
    });

    const handleConfirmAction = async (comment: string) => {
        try {
            const res: any = await performAction({ docname, action: selectedAction });
            if (res?.message?.status === "error") {
                setModalOpen(false);
                setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(res?.message) });
                return;
            }
            if (comment.trim()) {
                try {
                    await addComment({ doctype: "UC Request", docname, content: `[${selectedAction}] ${comment.trim()}` });
                } catch { /* comment is best-effort */ }
            }
            setModalOpen(false);
            onActionComplete();
            if (UC_PRINT_ACTIONS.includes(selectedAction)) onPrintAction?.(selectedAction);
        } catch (error: any) {
            setModalOpen(false);
            setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(error) });
        }
    };

    const actions = data?.message ?? [];
    const canPutBack = putBack.hasPutBack && actions.length > 0;
    if (actionsLoading || !actions.length) return null;

    return (
        <>
            <div className="flex gap-2 flex-wrap p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                <p className="w-full text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                    Available Actions
                </p>
                {actions.map((action) => (
                    <button
                        key={action}
                        onClick={() => { setSelectedAction(action); setModalOpen(true); }}
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
                {canPutBack && putBack.states.map((st) => (
                    <button
                        key={`pb-${st}`}
                        onClick={() => putBack.begin(st)}
                        disabled={putBack.loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-200 border border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Put to {putBackLabel(st)}
                    </button>
                ))}
            </div>
            {putBack.modal}
            <CommentModal
                key={selectedAction}
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

export default withCancellationLock(UCRequestActionButtons, "UC Request", (p) => p.docname);
