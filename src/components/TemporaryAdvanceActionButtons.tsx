import React from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';

interface TemporaryAdvanceActionButtonsProps {
    docname: string;
    onActionComplete: () => void;
}

const TemporaryAdvanceActionButtons = ({ docname, onActionComplete }: TemporaryAdvanceActionButtonsProps) => {
    const { data, isLoading, mutate } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.api.get_temporary_advance_workflow_actions",
        { docname },
        { revalidateOnFocus: false }
    );

    const { call: handleWorkflowAction, loading: isActionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.perform_temporary_advance_action"
    );

    const onAction = async (action: string) => {
        if (!confirm(`Are you sure you want to ${action}?`)) return;

        try {
            await handleWorkflowAction({
                docname: docname,
                action: action
            });
            // Refresh actions
            mutate();
            // Refresh parent list
            onActionComplete();
        } catch (e) {
            console.error("Workflow action failed", e);
            alert("Failed to perform action");
        }
    };

    if (isLoading || !data?.message || data.message.length === 0) return null;

    // Debug: Log the full response to investigate why objects are returned
    console.log('TemporaryAdvanceActionButtons Data:', JSON.stringify(data));

    return (
        <div className="flex items-center gap-2">
            {data.message.map((action: any, idx: number) => {
                let actionName = typeof action === 'string' ? action : '';
                if (typeof action === 'object' && action !== null) {
                    // Only use specific action-related keys. Avoid 'name' as it might be a document ID.
                    actionName = action.action || action.workflow_action || action.label || '';

                    // If empty, we can't render a button usefuly.
                    if (!actionName) {
                        console.warn('Invalid action object:', action);
                        return <span key={idx} className="text-xs text-red-400" title={JSON.stringify(action)}>Invalid Action</span>;
                    }
                }

                if (!actionName) return null;

                return (
                    <button
                        key={actionName}
                        onClick={() => onAction(actionName)}
                        disabled={isActionLoading}
                        className={cn(
                            "text-sm font-medium px-2 py-0.5 rounded border transition-colors",
                            "border-[#0EA5A4] text-[#0EA5A4] hover:bg-[#0EA5A4] hover:text-white",
                            isActionLoading && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        {isActionLoading ? 'Processing...' : actionName}
                    </button>
                );
            })}
        </div>
    );
};

export default TemporaryAdvanceActionButtons;
