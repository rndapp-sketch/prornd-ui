import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, CheckCircle2 as CheckCircleIcon, XCircle as XCircleIcon, ChevronRight } from 'lucide-react';

interface TemporaryAdvanceActionButtonsProps {
    docname: string;
    onActionComplete: () => void;
    commitRequired?: boolean;
}

const TemporaryAdvanceActionButtons = ({ docname, onActionComplete, commitRequired = false }: TemporaryAdvanceActionButtonsProps) => {
    const { data: actionsData, isLoading, mutate: refetchActions } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.get_temporary_advance_workflow_actions",
        { docname }
    );

    const { call: performAction, loading: isActionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.perform_temporary_advance_action"
    );

    const actions: string[] = (actionsData?.message || []).map((a: any) =>
        typeof a === "string" ? a : a.action || a.workflow_action || a.label || ""
    ).filter(Boolean);

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const toggleBtnRef = useRef<HTMLButtonElement>(null);
    const dropdownPortalRef = useRef<HTMLDivElement>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState("");
    const [comment, setComment] = useState("");
    const [isPerforming, setIsPerforming] = useState(false);

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
        setPendingAction(action);
        setComment("");
        setModalOpen(true);
    };

    const handleConfirm = async () => {
        setIsPerforming(true);
        try {
            await performAction({ docname, action: pendingAction, comment: comment.trim() });
            await refetchActions();
            setModalOpen(false);
            onActionComplete();
        } catch (e: any) {
            alert(`Failed to perform action: ${e.message || "Unknown error"}`);
        } finally {
            setIsPerforming(false);
        }
    };

    if (isLoading) return (
        <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-zinc-300 dark:border-zinc-600 border-t-[#D97757] rounded-full" />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Loading…</span>
        </div>
    );

    if (!actions.length) return null;

    const categorise = (a: string) => {
        const l = a.toLowerCase();
        if (l.includes("forward") || l.includes("approve") || l.includes("submit") || l.includes("recommend")) return "forward";
        if (l.includes("reject") || l.includes("cancel")) return "reject";
        return "neutral";
    };

    const itemStyle = (a: string) => {
        const cat = categorise(a);
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

    const forwardActions = actions.filter(a => categorise(a) === "forward");
    const neutralActions = actions.filter(a => categorise(a) === "neutral");
    const rejectActions  = actions.filter(a => categorise(a) === "reject");
    const groups = [forwardActions, neutralActions, rejectActions].filter(g => g.length > 0);

    return (
        <>
            <div className="flex flex-col items-end gap-1">
                <div className="relative">
                    <button
                        ref={toggleBtnRef}
                        onClick={handleToggleDropdown}
                        disabled={isActionLoading || isPerforming}
                        className={cn(
                            "inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all disabled:opacity-50",
                            dropdownOpen
                                ? "bg-[#D97757] text-white border border-[#c66a4e]"
                                : "bg-[#FFF7ED] dark:bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/40 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757]/30",
                        )}
                    >
                        {isActionLoading || isPerforming ? "Processing…" : "Actions"}
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
                                    {group.map((actionName) => {
                                        const blocked = commitRequired && categorise(actionName) === "forward";
                                        const { icon, cls, iconCls } = itemStyle(actionName);
                                        return (
                                            <div key={actionName} className="relative group/item">
                                                <button
                                                    onClick={() => { if (!blocked) handleActionClick(actionName); }}
                                                    disabled={isActionLoading || isPerforming || blocked}
                                                    className={cn(
                                                        "w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors disabled:cursor-not-allowed",
                                                        blocked ? "opacity-40" : cls,
                                                    )}
                                                >
                                                    <span className={iconCls}>{icon}</span>
                                                    {actionName}
                                                    {blocked && <span className="ml-auto text-[10px] font-normal text-zinc-400">blocked</span>}
                                                </button>
                                                {blocked && (
                                                    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/item:block z-[9999]">
                                                        <div className="bg-zinc-900 text-white text-[11px] rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap">
                                                            A commitment must be submitted before forwarding.
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </React.Fragment>
                            ))}
                        </div>,
                        document.body,
                    )}
                </div>
                {commitRequired && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        A commitment must be submitted before forwarding.
                    </p>
                )}
            </div>

            {/* Inline comment modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md mx-4 overflow-hidden">
                        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Confirm: {pendingAction}</h3>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Optionally add a comment before proceeding.</p>
                        </div>
                        <div className="px-6 py-4">
                            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Comment (optional)</label>
                            <textarea
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Add a remark or note…"
                                rows={3}
                                className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-800 dark:text-zinc-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/40"
                            />
                        </div>
                        <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
                            <button
                                onClick={() => { setModalOpen(false); setPendingAction(""); setComment(""); }}
                                className="px-4 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirm}
                                disabled={isPerforming}
                                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#D97757] text-white hover:bg-[#c5694d] transition-colors disabled:opacity-50"
                            >
                                {isPerforming ? "Processing…" : pendingAction}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default TemporaryAdvanceActionButtons;
