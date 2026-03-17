import { cn } from '@/lib/utils';
import { useState, useCallback, useEffect } from 'react';

interface DisbursalOfHonorariumActionButtonsProps {
    docname: string;
    onActionComplete: () => void;
    blockedActions?: {
        actions: string[];
        reason: string;
    };
}

// --- COMMENT MODAL ---
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
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Confirm {action}
                </h3>
                <textarea
                    className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] dark:bg-zinc-800 dark:text-zinc-100"
                    rows={4}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm disabled:opacity-50"
                    >
                        {isLoading ? "Processing..." : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// Get CSRF token from cookie
const getCsrfToken = (): string => {
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === 'csrf_token') return decodeURIComponent(value);
    }
    return '';
};

// Direct fetch helper for Frappe API calls
const frappeCall = async (method: string, args: Record<string, any>): Promise<any> => {
    const response = await fetch(`/api/method/${method}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Frappe-CSRF-Token': (window as any).csrf_token || getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify(args),
    });

    const result = await response.json();

    if (!response.ok) {
        let errMsg = 'Server error';
        if (result?._server_messages) {
            try {
                const msgs = JSON.parse(result._server_messages);
                const parsed = JSON.parse(msgs[0]);
                errMsg = parsed.message || parsed.toString();
            } catch {
                errMsg = result._server_messages;
            }
        } else if (result?.exception) {
            errMsg = result.exception;
        }
        throw new Error(errMsg);
    }

    return result;
};

// Fetch the full document from Frappe
const fetchFullDocument = async (docname: string): Promise<any> => {
    const response = await fetch(`/api/resource/Disbursal%20of%20Honorarium/${encodeURIComponent(docname)}`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
    });

    const result = await response.json();
    if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
    }
    return result?.data;
};

interface WorkflowTransition {
    action: string;
    next_state: string;
    allowed: string;
    [key: string]: any;
}

const DisbursalOfHonorariumActionButtons = ({ docname, onActionComplete, blockedActions }: DisbursalOfHonorariumActionButtonsProps) => {
    const [actions, setActions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");

    // Fetch available workflow actions
    const fetchActions = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            // Step 1: Fetch the FULL document from Frappe (critical for correct workflow_state)
            const fullDoc = await fetchFullDocument(docname);

            if (!fullDoc) {
                setActions([]);
                return;
            }

            // Step 2: Pass the full document to get_transitions so it uses the correct workflow_state
            const result = await frappeCall("frappe.model.workflow.get_transitions", {
                doc: fullDoc,
            });

            if (result?.message && Array.isArray(result.message)) {
                const actionNames = result.message.map(
                    (t: WorkflowTransition) => t.action
                );
                const uniqueActions = [...new Set(actionNames)] as string[];
                setActions(uniqueActions);
            } else {
                setActions([]);
            }
        } catch (err: any) {
            console.error("Error fetching workflow actions:", err);
            setFetchError(err.message || "Failed to load actions");
            setActions([]);
        } finally {
            setIsLoading(false);
        }
    }, [docname]);

    useEffect(() => {
        fetchActions();
    }, [fetchActions]);

    // Filter out "Submit" since the detail page has a dedicated Submit button for Draft state
    const filteredActions = actions.filter(
        (action) => action.toLowerCase() !== 'submit'
    );

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        setIsActionLoading(true);
        try {
            // Step 1: Fetch the FULL document again to ensure fresh state
            const fullDoc = await fetchFullDocument(docname);

            if (!fullDoc) {
                throw new Error("Could not fetch document");
            }

            // Step 2: Apply workflow with the FULL document object
            await frappeCall("frappe.model.workflow.apply_workflow", {
                doc: fullDoc,
                action: selectedAction,
            });

            // Step 3: Add comment if provided
            if (comment && comment.trim()) {
                try {
                    await frappeCall("rndopsapp.rndopsapp.api.add_project_comment", {
                        doctype: "Disbursal of Honorarium",
                        docname: docname,
                        content: `<strong>${selectedAction}</strong>: ${comment}`,
                    });
                } catch (commentErr) {
                    console.error("Failed to add comment:", commentErr);
                }
            }

            setModalOpen(false);
            onActionComplete();
        } catch (e: any) {
            console.error("Workflow action failed:", e);
            alert(`Failed to perform "${selectedAction}":\n\n${e.message || 'Unknown error'}`);
            setModalOpen(false);
        } finally {
            setIsActionLoading(false);
        }
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-zinc-300 dark:border-zinc-600 border-t-[#D97757] rounded-full"></div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading actions...</span>
            </div>
        );
    }

    // Don't render anything if no actions or error
    if (fetchError || filteredActions.length === 0) {
        return null;
    }

    // Button styling based on action type
    const getActionStyle = (actionName: string) => {
        const lowerAction = actionName.toLowerCase();

        if (lowerAction.includes('approve') || lowerAction.includes('submit') || lowerAction.includes('forward')) {
            return 'bg-[#D97757] hover:bg-[#c66a4e] text-white border-transparent shadow-sm hover:shadow-md';
        }
        if (lowerAction.includes('reject') || lowerAction.includes('cancel')) {
            return 'bg-white hover:bg-red-50 text-red-600 border-red-200 hover:border-red-300 dark:bg-zinc-900 dark:hover:bg-red-950/30 dark:text-red-400 dark:border-red-800';
        }
        if (lowerAction.includes('put back') || lowerAction.includes('return') || lowerAction.includes('revise')) {
            return 'bg-white hover:bg-amber-50 text-amber-600 border-amber-200 hover:border-amber-300 dark:bg-zinc-900 dark:hover:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800';
        }
        return 'bg-white hover:bg-zinc-50 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:text-zinc-900 dark:bg-zinc-900';
    };

    return (
        <>
            <div className="flex items-center gap-3 flex-wrap">
                {filteredActions.map((actionName, idx) => (
                    <button
                        key={actionName + idx}
                        onClick={() => {
                            if (blockedActions?.actions.includes(actionName)) {
                                alert(blockedActions.reason);
                                return;
                            }
                            handleActionClick(actionName);
                        }}
                        disabled={isActionLoading}
                        title={blockedActions?.actions.includes(actionName) ? blockedActions.reason : undefined}
                        className={cn(
                            "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border",
                            "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-zinc-300 dark:focus:ring-offset-zinc-900",
                            getActionStyle(actionName),
                            isActionLoading && "opacity-50 cursor-not-allowed",
                            blockedActions?.actions.includes(actionName) && "opacity-50 cursor-not-allowed !bg-zinc-200 !text-zinc-500 !border-zinc-300 dark:!bg-zinc-800 dark:!text-zinc-500"
                        )}
                    >
                        {isActionLoading ? 'Processing...' : actionName}
                    </button>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={isActionLoading}
            />
        </>
    );
};

export default DisbursalOfHonorariumActionButtons;
