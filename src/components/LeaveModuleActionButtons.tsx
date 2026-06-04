import React, { useState, useEffect } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { leaveModuleAPI } from '@/services/apiService';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle2, XCircle, ArrowRightCircle, X } from 'lucide-react';
import { getActionButtonStyle } from '@/utils/workflowUtils';

interface LeaveModuleActionButtonsProps {
    docName: string;
    onActionComplete?: () => void;
}

const LeaveModuleActionButtons: React.FC<LeaveModuleActionButtonsProps> = ({ docName, onActionComplete }) => {
    const [actions, setActions] = useState<string[]>([]);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [showCommentDialog, setShowCommentDialog] = useState(false);
    const [pendingAction, setPendingAction] = useState<string | null>(null);
    const [comment, setComment] = useState('');

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

    // Open the comment dialog when an action button is clicked
    const handleActionClick = (action: string) => {
        setPendingAction(action);
        setComment('');
        setShowCommentDialog(true);
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

    return (
        <>
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