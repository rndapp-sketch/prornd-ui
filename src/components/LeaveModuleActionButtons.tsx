import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFrappePostCall } from 'frappe-react-sdk';
import { leaveModuleAPI } from '@/services/apiService';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, ArrowRightCircle, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getActionButtonStyle } from '@/utils/workflowUtils';

interface LeaveModuleActionButtonsProps {
    docName: string;
    onActionComplete?: () => void;
    /** 'inline' renders a row of buttons (default); 'dropdown' collapses them into a single "Actions" menu — handy for a page header. */
    variant?: 'inline' | 'dropdown';
}

const LeaveModuleActionButtons: React.FC<LeaveModuleActionButtonsProps> = ({ docName, onActionComplete, variant = 'inline' }) => {
    const [actions, setActions] = useState<string[]>([]);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [showCommentDialog, setShowCommentDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [comment, setComment] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const toggleBtnRef = useRef<HTMLButtonElement>(null);
    const dropdownPortalRef = useRef<HTMLDivElement>(null);

    const { call: fetchActions, result: actionsData, loading: actionsLoading } =
        useFrappePostCall<{ message: string[] }>(leaveModuleAPI.getWorkflowActions);

    const { call: performAction, loading: actionLoading } =
        useFrappePostCall(leaveModuleAPI.performAction);

    useEffect(() => {
        if (docName) {
            fetchActions({ docname: docName });
        }
    }, [docName]);

    useEffect(() => {
        if (actionsData?.message) {
            setActions([...new Set(actionsData.message)]);
        }
    }, [actionsData]);

    useEffect(() => {
        if (!dropdownOpen) return;
        const handleOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (!toggleBtnRef.current?.contains(target) && !dropdownPortalRef.current?.contains(target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [dropdownOpen]);

    // Open the comment dialog when an action button is clicked
    const handleActionClick = (action: string) => {
        setDropdownOpen(false);
        setPendingAction(action);
        setComment('');
        setShowCommentDialog(true);
    };

    const handleToggleDropdown = () => {
        if (!dropdownOpen && toggleBtnRef.current) {
            const rect = toggleBtnRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
        }
        setDropdownOpen((o) => !o);
    };

    // Confirm and execute the action with the comment
    const handleConfirmAction = async () => {
        if (!pendingAction) return;

        setShowCommentDialog(false);
        setSelectedAction(pendingAction);

        try {
            const response = await performAction({
                docname: docName,
                action: pendingAction,
                comment: comment.trim() || undefined,
            });

            if (response?.message?.status === 'success') {
                setSelectedAction(null);
                if (onActionComplete) {
                    onActionComplete();
                }
                fetchActions({ docname: docName });
            } else {
                alert(response?.message?.message || "Action failed");
            }
        } catch (error: unknown) {
            console.error("Action error:", error);
            alert("An error occurred while performing the action.");
        } finally {
            setSelectedAction(null);
            setPendingAction(null);
            setComment('');
        }
    };

    const handleCancelDialog = () => {
        setShowCommentDialog(false);
        setPendingAction(null);
        setComment('');
    };

    const getActionIcon = (actionName: string) => {
        const lowerName = actionName.toLowerCase();
        if (lowerName.includes('approve') || lowerName.includes('submit')) {
            return <CheckCircle2 className="mr-2 h-4 w-4" />;
        }
        if (lowerName.includes('reject') || lowerName.includes('cancel')) {
            return <XCircle className="mr-2 h-4 w-4" />;
        }
        return <ArrowRightCircle className="mr-2 h-4 w-4" />;
    };

    if (actionsLoading) {
        return (
            <div className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading actions...
            </div>
        );
    }

    if (!actions.length) {
        return null;
    }

    const getActionCategory = (action: string): 'forward' | 'reject' | 'neutral' => {
        const a = action.toLowerCase();
        if (a.includes('approve') || a.includes('submit') || a.includes('forward')) return 'forward';
        if (a.includes('reject') || a.includes('cancel')) return 'reject';
        return 'neutral';
    };

    return (
        <>
            {variant === 'dropdown' ? (
                <div className="relative">
                    <button
                        ref={toggleBtnRef}
                        onClick={handleToggleDropdown}
                        disabled={actionLoading}
                        className={cn(
                            'inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all disabled:opacity-50',
                            dropdownOpen
                                ? 'bg-[#D97757] text-white border border-[#c66a4e]'
                                : 'bg-[#FFF7ED] dark:bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/40 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757]/30',
                        )}
                    >
                        {actionLoading ? 'Processing…' : 'Actions'}
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150', dropdownOpen && 'rotate-180')} />
                    </button>

                    {dropdownOpen && createPortal(
                        <div
                            ref={dropdownPortalRef}
                            style={{ position: 'absolute', top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
                            className="min-w-[210px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
                        >
                            <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-700">
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                                    Workflow Actions
                                </span>
                            </div>
                            {actions.map((action) => {
                                const category = getActionCategory(action);
                                const itemCls =
                                    category === 'forward'
                                        ? 'text-[#D97757] hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                        : category === 'reject'
                                            ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                                            : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700';
                                return (
                                    <button
                                        key={action}
                                        onClick={() => handleActionClick(action)}
                                        disabled={actionLoading}
                                        className={cn(
                                            'w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                                            itemCls,
                                        )}
                                    >
                                        {getActionIcon(action)}
                                        {action}
                                    </button>
                                );
                            })}
                        </div>,
                        document.body,
                    )}
                </div>
            ) : (
                <div className="flex flex-wrap gap-3">
                    {actions.map((action) => (
                        <Button
                            key={action}
                            onClick={() => handleActionClick(action)}
                            className={getActionButtonStyle(action)}
                            disabled={actionLoading}
                        >
                            {actionLoading && selectedAction === action ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                getActionIcon(action)
                            )}
                            {action}
                        </Button>
                    ))}
                </div>
            )}

            {/* Comment Dialog Overlay */}
            {showCommentDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                                {pendingAction}
                            </h3>
                            <button
                                onClick={handleCancelDialog}
                                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
                            Add a comment for this action (optional):
                        </p>

                        <Textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Enter your comment here..."
                            rows={3}
                            className="mb-4"
                        />

                        {/* Footer buttons */}
                        <div className="flex justify-end gap-3">
                            <Button
                                variant="outline"
                                onClick={handleCancelDialog}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleConfirmAction}
                                className={pendingAction ? getActionButtonStyle(pendingAction) : ''}
                            >
                                Confirm {pendingAction}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default LeaveModuleActionButtons;