import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { miscellaneousCommitAPI } from "@/services/apiService";
import {
    ChevronDown, ChevronRight, CheckCircle, XCircle, RotateCcw,
} from "lucide-react";
import { ErrorModal } from "./ErrorModal";
import { parseFrappeError } from "../utils/errorUtils";

interface MiscellaneousCommitActionButtonsProps {
    docname: string;
    onActionComplete: () => void;
}

// --- COMMENT MODAL ---
const CommentModal = ({
    isOpen, onClose, onSubmit, action, isLoading,
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 mb-1">
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

// --- CATEGORISE ACTION ---
const categorise = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes("forward") || a.includes("approve") || a.includes("submit")) return "forward";
    if (a.includes("reject")) return "reject";
    if (a.includes("put back")) return "putback";
    return "neutral";
};

const itemStyle = (action: string) => {
    const cat = categorise(action);
    if (cat === "forward") return {
        icon: <CheckCircle className="h-3.5 w-3.5" />,
        cls: "text-[#D97757] hover:bg-orange-50 dark:hover:bg-orange-900/20",
        iconCls: "text-[#D97757]",
    };
    if (cat === "reject") return {
        icon: <XCircle className="h-3.5 w-3.5" />,
        cls: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
        iconCls: "text-red-500",
    };
    if (cat === "putback") return {
        icon: <RotateCcw className="h-3.5 w-3.5" />,
        cls: "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20",
        iconCls: "text-amber-500",
    };
    return {
        icon: <ChevronRight className="h-3.5 w-3.5" />,
        cls: "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700",
        iconCls: "text-zinc-400 dark:text-zinc-500",
    };
};

// --- MAIN COMPONENT ---
const MiscellaneousCommitActionButtons = ({
    docname,
    onActionComplete,
}: MiscellaneousCommitActionButtonsProps) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{
        message: string[];
    }>(miscellaneousCommitAPI.getWorkflowActions, { docname });

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        miscellaneousCommitAPI.performAction,
    );
    const { call: addComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Action Failed", message: "" });
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const toggleBtnRef = useRef<HTMLButtonElement>(null);
    const dropdownPortalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!dropdownOpen) return;
        const handleOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (!toggleBtnRef.current?.contains(target) && !dropdownPortalRef.current?.contains(target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, [dropdownOpen]);

    const handleToggleDropdown = () => {
        if (!dropdownOpen && toggleBtnRef.current) {
            const rect = toggleBtnRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
        }
        setDropdownOpen(o => !o);
    };

    const handleActionClick = (action: string) => {
        setDropdownOpen(false);
        setSelectedAction(action);
        setModalOpen(true);
    };

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
                    await addComment({
                        doctype: "Miscellaneous Commit",
                        docname,
                        content: `[${selectedAction}] ${comment.trim()}`,
                    });
                } catch { /* non-fatal */ }
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

    const actions = data.message;
    const forwardActions = actions.filter(a => categorise(a) === "forward");
    const putbackActions = actions.filter(a => categorise(a) === "putback");
    const neutralActions = actions.filter(a => categorise(a) === "neutral");
    const rejectActions  = actions.filter(a => categorise(a) === "reject");
    const groups = [forwardActions, putbackActions, neutralActions, rejectActions].filter(g => g.length > 0);

    return (
        <>
            <div className="relative">
                <button
                    ref={toggleBtnRef}
                    onClick={handleToggleDropdown}
                    disabled={!!actionLoading}
                    className={cn(
                        "inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all disabled:opacity-50",
                        dropdownOpen
                            ? "bg-[#D97757] text-white border border-[#c66a4e]"
                            : "bg-[#FFF7ED] dark:bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/40 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757]/30",
                    )}
                >
                    {actionLoading ? "Processing…" : "Actions"}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && createPortal(
                    <div
                        ref={dropdownPortalRef}
                        style={{ position: "absolute", top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
                        className="min-w-[210px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-700">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                                Available Actions
                            </span>
                        </div>
                        {groups.map((group, gi) => (
                            <React.Fragment key={gi}>
                                {gi > 0 && <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />}
                                {group.map((action) => {
                                    const { icon, cls, iconCls } = itemStyle(action);
                                    return (
                                        <button
                                            key={action}
                                            onClick={() => handleActionClick(action)}
                                            disabled={!!actionLoading}
                                            className={cn(
                                                "w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                                cls,
                                            )}
                                        >
                                            <span className={iconCls}>{icon}</span>
                                            {action}
                                        </button>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>,
                    document.body,
                )}
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

export default MiscellaneousCommitActionButtons;
