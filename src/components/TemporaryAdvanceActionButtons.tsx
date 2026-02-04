import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface TemporaryAdvanceActionButtonsProps {
    docname: string;
    onActionComplete: () => void;
}

const TemporaryAdvanceActionButtons = ({ docname, onActionComplete }: TemporaryAdvanceActionButtonsProps) => {
    console.log('🎯 TemporaryAdvanceActionButtons mounted with docname:', docname);

    // Simple pattern matching ReimbursementWorkflowActions - just method and params
    const { data: actionsData, error: fetchError, isLoading, mutate: refetchActions } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.get_temporary_advance_workflow_actions",
        { docname }
    );

    // Use the specific Temporary Advance action API
    const { call: performAction, loading: isActionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.perform_temporary_advance_action"
    );

    // Extract actions from the API response
    const actions = actionsData?.message || [];

    // Log the fetched data for debugging
    useEffect(() => {
        console.log('🔍 TemporaryAdvanceActionButtons Debug Info:');
        console.log('  📌 docname:', docname);
        console.log('  📊 Raw actionsData:', JSON.stringify(actionsData, null, 2));
        console.log('  📋 actions array:', actions);
        console.log('  📏 actions.length:', actions?.length);
        console.log('  🔧 isLoading:', isLoading);
        console.log('  ❓ fetchError:', fetchError);
        if (fetchError) {
            console.error('❌ Full error details:', JSON.stringify(fetchError, null, 2));
        }
        // Check if the API returned an unexpected format
        if (actionsData && !actionsData.message) {
            console.warn('⚠️ API response missing "message" key. Full response:', actionsData);
        }
    }, [docname, actionsData, actions, fetchError, isLoading]);

    const onAction = async (action: string) => {
        if (!confirm(`Are you sure you want to ${action} this temporary advance?`)) return;

        try {
            // Call the perform_temporary_advance_action API with docname and action
            const response = await performAction({
                docname: docname,
                action: action
            });

            // Debug: Log full response
            console.log('🎬 Action response:', JSON.stringify(response, null, 2));

            // Check for error status in response (backend returns {status: 'error', message: '...'})
            if (response?.message?.status === 'error') {
                alert(`✗ Action failed: ${response.message.message || 'Unknown error'}`);
                return;
            }

            // Show success message
            if (response?.message?.status === 'success') {
                alert(`✓ ${response.message.message || `Action "${action}" completed successfully`}`);
            } else {
                alert(`✓ Action "${action}" completed`);
            }

            // Refresh actions by revalidating the GET request
            await refetchActions();

            // Refresh parent component
            onActionComplete();
        } catch (e: any) {
            console.error("Workflow action failed", e);
            alert(`✗ Failed to perform action: ${e.message || 'Unknown error'}`);
        }
    };

    // Show loading state
    if (isLoading) {
        return (
            <div className="flex items-center gap-2">
                <div className="animate-spin h-5 w-5 border-2 border-gray-300 border-t-[#0EA5A4] rounded-full"></div>
                <span className="text-sm text-gray-500">Loading actions...</span>
            </div>
        );
    }

    // Show error state
    if (fetchError) {
        return (
            <div className="px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-xs text-red-600 font-medium">Error loading actions</span>
            </div>
        );
    }

    // Show message when no actions available
    if (!actions || actions.length === 0) {
        return (
            <div className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs text-gray-500 font-medium">No actions available</span>
            </div>
        );
    }

    // Helper function to determine button color based on action
    const getActionStyle = (actionName: string) => {
        const lowerAction = actionName.toLowerCase();

        if (lowerAction.includes('approve') || lowerAction.includes('submit')) {
            return 'bg-green-600 hover:bg-green-700 text-white border-green-700';
        }
        if (lowerAction.includes('reject') || lowerAction.includes('cancel')) {
            return 'bg-red-600 hover:bg-red-700 text-white border-red-700';
        }
        if (lowerAction.includes('return') || lowerAction.includes('revise')) {
            return 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700';
        }
        // Default style
        return 'bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white border-[#0D9494]';
    };

    return (
        <div className="flex items-center gap-3 flex-wrap">
            {actions.map((action: any, idx: number) => {
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
                            "px-4 py-2 rounded-lg font-bold text-sm transition-all duration-150 border-2 shadow-md hover:shadow-lg",
                            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400",
                            getActionStyle(actionName),
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
