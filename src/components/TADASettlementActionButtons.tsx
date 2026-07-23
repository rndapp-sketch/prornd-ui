import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { tadaAPI, commonAPI } from "@/services/apiService";
import { CommentModal } from "@/components/CommentModal";
import { CheckCircleIcon, XCircleIcon, ChevronRight, ChevronDown } from "lucide-react";

interface TADASettlementActionButtonsProps {
    docName: string;
    onActionComplete?: () => void;
}

// Same grouping/style convention as Project Registration's workflow actions dropdown
const categorise = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes("forward") || a.includes("approve") || a.includes("submit")) return "forward";
    if (a.includes("reject")) return "reject";
    return "neutral";
};

const itemStyle = (action: string) => {
    const cat = categorise(action);
    if (cat === "forward") return {
        icon: <CheckCircleIcon className="h-3.5 w-3.5" />,
        cls: "text-[#D97757] hover:bg-orange-50 dark:hover:bg-orange-900/20",
        iconCls: "text-[#D97757]",
    };
    if (cat === "reject") return {
        icon: <XCircleIcon className="h-3.5 w-3.5" />,
        cls: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
        iconCls: "text-red-500",
    };
    return {
        icon: <ChevronRight className="h-3.5 w-3.5" />,
        cls: "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700",
        iconCls: "text-zinc-400 dark:text-zinc-500",
    };
};

const TADASettlementActionButtons: React.FC<TADASettlementActionButtonsProps> = ({
    docName,
    onActionComplete,
}) => {
    const [actions, setActions] = useState<string[]>([]);

    const { call: fetchActions, result: actionsData, loading: actionsLoading } =
        useFrappePostCall<{ message: string[] }>(tadaAPI.getWorkflowActions);
    const { call: performAction, loading: actionLoading } = useFrappePostCall(tadaAPI.performAction);
    const { call: addComment } = useFrappePostCall(commonAPI.addComment);

    // Dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const toggleBtnRef = useRef<HTMLButtonElement>(null);
    const dropdownPortalRef = useRef<HTMLDivElement>(null);

    // Comment modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);

    useEffect(() => {
        if (docName) fetchActions({ docname: docName });
    }, [docName]);

    useEffect(() => {
        if (actionsData?.message) setActions([...new Set(actionsData.message)]);
    }, [actionsData]);

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
        setDropdownOpen((o) => !o);
    };

    const handleActionClick = (action: string) => {
        setDropdownOpen(false);
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        if (!selectedAction) return;
        try {
            const response = await performAction({ docname: docName, action: selectedAction });

            if (response?.message?.status && response.message.status !== "success") {
                alert(response.message.message || "Action failed");
                return;
            }

            if (comment.trim()) {
                try {
                    await addComment({
                        doctype: "TA DA Settlement",
                        docname: docName,
                        content: `[${selectedAction}] ${comment.trim()}`,
                    });
                } catch (commentError) {
                    console.error("Error adding comment:", commentError);
                }
            }

            setModalOpen(false);
            setSelectedAction(null);
            fetchActions({ docname: docName });
            onActionComplete?.();
        } catch (error: unknown) {
            console.error("Action error:", error);
            alert("An error occurred while performing the action.");
        }
    };

    if (actionsLoading) {
        return (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading actions...</div>
        );
    }

    if (!actions.length) return null;

    const forwardActions = actions.filter((a) => categorise(a) === "forward");
    const neutralActions = actions.filter((a) => categorise(a) === "neutral");
    const rejectActions = actions.filter((a) => categorise(a) === "reject");
    const groups = [forwardActions, neutralActions, rejectActions].filter((g) => g.length > 0);

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="relative">
                <button
                    ref={toggleBtnRef}
                    onClick={handleToggleDropdown}
                    disabled={actionLoading}
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
                                Workflow Actions
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
                                            disabled={actionLoading}
                                            className={cn(
                                                "w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors disabled:cursor-not-allowed",
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
                onClose={() => { setModalOpen(false); setSelectedAction(null); }}
                onSubmit={handleConfirmAction}
                action={selectedAction || "Action"}
                isLoading={actionLoading}
            />
        </div>
    );
};

export default TADASettlementActionButtons;
