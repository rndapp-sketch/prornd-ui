// import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils';
// import { useEffect } from 'react';

// interface TemporaryAdvanceActionButtonsProps {
//     docname: string;
//     onActionComplete: () => void;
// }

// const TemporaryAdvanceActionButtons = ({ docname, onActionComplete }: TemporaryAdvanceActionButtonsProps) => {
//     console.log('🎯 TemporaryAdvanceActionButtons mounted with docname:', docname);

//     // Simple pattern matching ReimbursementWorkflowActions - just method and params
//     const { data: actionsData, error: fetchError, isLoading, mutate: refetchActions } = useFrappeGetCall<{ message: string[] }>(
//         "rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.get_temporary_advance_workflow_actions",
//         { docname }
//     );

//     // Use the specific Temporary Advance action API
//     const { call: performAction, loading: isActionLoading } = useFrappePostCall(
//         "rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.perform_temporary_advance_action"
//     );

//     // Extract actions from the API response
//     const actions = actionsData?.message || [];

//     // Log the fetched data for debugging
//     useEffect(() => {
//         console.log('🔍 TemporaryAdvanceActionButtons Debug Info:');
//         console.log('  📌 docname:', docname);
//         console.log('  📊 Raw actionsData:', JSON.stringify(actionsData, null, 2));
//         console.log('  📋 actions array:', actions);
//         console.log('  📏 actions.length:', actions?.length);
//         console.log('  🔧 isLoading:', isLoading);
//         console.log('  ❓ fetchError:', fetchError);
//         if (fetchError) {
//             console.error('❌ Full error details:', JSON.stringify(fetchError, null, 2));
//         }
//         // Check if the API returned an unexpected format
//         if (actionsData && !actionsData.message) {
//             console.warn('⚠️ API response missing "message" key. Full response:', actionsData);
//         }
//     }, [docname, actionsData, actions, fetchError, isLoading]);

//     const onAction = async (action: string) => {
//         if (!confirm(`Are you sure you want to ${action} this temporary advance?`)) return;

//         try {
//             // Call the perform_temporary_advance_action API with docname and action
//             const response = await performAction({
//                 docname: docname,
//                 action: action
//             });

//             // Debug: Log full response
//             console.log('🎬 Action response:', JSON.stringify(response, null, 2));

//             // Check for error status in response (backend returns {status: 'error', message: '...'})
//             if (response?.message?.status === 'error') {
//                 alert(`✗ Action failed: ${response.message.message || 'Unknown error'}`);
//                 return;
//             }

//             // Show success message
//             if (response?.message?.status === 'success') {
//                 alert(`✓ ${response.message.message || `Action "${action}" completed successfully`}`);
//             } else {
//                 alert(`✓ Action "${action}" completed`);
//             }

//             // Refresh actions by revalidating the GET request
//             await refetchActions();

//             // Refresh parent component
//             onActionComplete();
//         } catch (e: any) {
//             console.error("Workflow action failed", e);
//             alert(`✗ Failed to perform action: ${e.message || 'Unknown error'}`);
//         }
//     };

//     // Show loading state
//     if (isLoading) {
//         return (
//             <div className="flex items-center gap-2">
//                 <div className="animate-spin h-5 w-5 border-2 border-zinc-300 dark:border-zinc-600 border-t-[#D97757] rounded-full"></div>
//                 <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading actions...</span>
//             </div>
//         );
//     }

//     // Show error state
//     if (fetchError) {
//         return (
//             <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
//                 <span className="text-xs text-red-600 dark:text-red-400 font-medium">Error loading actions</span>
//             </div>
//         );
//     }

//     // Show message when no actions available
//     if (!actions || actions.length === 0) {
//         return (
//             <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
//                 <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">No actions available</span>
//             </div>
//         );
//     }

//     // Helper function to determine button color based on action
//     const getActionStyle = (actionName: string) => {
//         const lowerAction = actionName.toLowerCase();

//         if (lowerAction.includes('approve') || lowerAction.includes('submit')) {
//             return 'bg-green-600 hover:bg-green-700 text-white border-green-700';
//         }
//         if (lowerAction.includes('reject') || lowerAction.includes('cancel')) {
//             return 'bg-red-600 hover:bg-red-700 text-white border-red-700';
//         }
//         if (lowerAction.includes('return') || lowerAction.includes('revise')) {
//             return 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700';
//         }
//         // Default style
//         return 'bg-[#D97757] hover:bg-[#D97757] text-white border-[#D97757]';
//     };

//     return (
//         <div className="flex items-center gap-3 flex-wrap">
//             {actions.map((action: any, idx: number) => {
//                 let actionName = typeof action === 'string' ? action : '';
//                 if (typeof action === 'object' && action !== null) {
//                     // Only use specific action-related keys. Avoid 'name' as it might be a document ID.
//                     actionName = action.action || action.workflow_action || action.label || action.transition_name || action.name || '';

//                     // If empty, we can't render a button usefuly.
//                     if (!actionName) {
//                         console.warn('Invalid action object:', action);
//                         return <span key={idx} className="text-xs text-red-400" title={JSON.stringify(action)}>Invalid Action</span>;
//                     }
//                 }

//                 if (!actionName) return null;

//                 return (
//                     <button
//                         key={actionName}
//                         onClick={() => onAction(actionName)}
//                         disabled={isActionLoading}
//                         className={cn(
//                             "px-4 py-2 rounded-lg font-bold text-sm transition-all duration-150 border-2 shadow-md hover:shadow-lg",
//                             "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-400 dark:focus:ring-offset-zinc-900",
//                             getActionStyle(actionName),
//                             isActionLoading && "opacity-50 cursor-not-allowed"
//                         )}
//                     >
//                         {isActionLoading ? 'Processing...' : actionName}
//                     </button>
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, CheckCircleIcon, XCircleIcon, ChevronRight } from 'lucide-react';

interface TemporaryAdvanceActionButtonsProps {
    docname: string;
    onActionComplete: () => void;
    /** When true, forward action buttons are disabled until a commitment exists (Staff R&D gate) */
    commitRequired?: boolean;
}

const TemporaryAdvanceActionButtons = ({ docname, onActionComplete, commitRequired = false }: TemporaryAdvanceActionButtonsProps) => {
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

    // Dropdown state
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

    // Log the fetched data for debugging
    useEffect(() => {
        console.log('🔍 TemporaryAdvanceActionButtons Debug Info:');
        console.log('  📌 docname:', docname);
        console.log('  📊 Raw actionsData:', JSON.stringify(actionsData, null, 2));
        console.log('  📋 actions array:', actions);
        console.log('  🔧 isLoading:', isLoading);
    }, [docname, actionsData, actions, isLoading]);

    const onAction = async (action: string) => {
        setDropdownOpen(false);
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
                <div className="animate-spin h-5 w-5 border-2 border-zinc-300 dark:border-zinc-600 border-t-[#D97757] rounded-full"></div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading actions...</span>
            </div>
        );
    }

    // Show error state
    if (fetchError) {
        return (
            <div className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">Error loading actions</span>
            </div>
        );
    }

    // Show message when no actions available
    if (!actions || actions.length === 0) {
        return (
            <div className="px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg">
                <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">No actions available</span>
            </div>
        );
    }

    const categorise = (actionName: string) => {
        const a = actionName.toLowerCase();
        if (a.includes("forward") || a.includes("approve") || a.includes("submit") || a.includes("recommend")) return "forward";
        if (a.includes("reject") || a.includes("cancel")) return "reject";
        return "neutral";
    };

    const itemStyle = (actionName: string) => {
        const cat = categorise(actionName);
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

    const forwardActions = actions.map(action => typeof action === 'string' ? action : action.action || action.workflow_action || action.label || '').filter(a => a && categorise(a) === "forward");
    const neutralActions = actions.map(action => typeof action === 'string' ? action : action.action || action.workflow_action || action.label || '').filter(a => a && categorise(a) === "neutral");
    const rejectActions  = actions.map(action => typeof action === 'string' ? action : action.action || action.workflow_action || action.label || '').filter(a => a && categorise(a) === "reject");
    const groups = [forwardActions, neutralActions, rejectActions].filter(g => g.length > 0);

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="relative">
                <button
                    ref={toggleBtnRef}
                    onClick={handleToggleDropdown}
                    disabled={isActionLoading}
                    className={cn(
                        "inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all disabled:opacity-50",
                        dropdownOpen
                            ? "bg-[#D97757] text-white border border-[#c66a4e]"
                            : "bg-[#FFF7ED] dark:bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/40 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757]/30",
                    )}
                >
                    {isActionLoading ? "Processing…" : "Actions"}
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
                                    const isForward = categorise(actionName) === "forward";
                                    const blocked = commitRequired && isForward;
                                    const { icon, cls, iconCls } = itemStyle(actionName);
                                    return (
                                        <div key={actionName} className="relative group/item">
                                            <button
                                                onClick={() => { if (!blocked) onAction(actionName); }}
                                                disabled={isActionLoading || blocked}
                                                className={cn(
                                                    "w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors disabled:cursor-not-allowed",
                                                    blocked ? "opacity-40" : cls,
                                                )}
                                            >
                                                <span className={iconCls}>{icon}</span>
                                                {actionName}
                                                {blocked && (
                                                    <span className="ml-auto text-[10px] font-normal text-zinc-400">blocked</span>
                                                )}
                                            </button>
                                            {blocked && (
                                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/item:block z-[9999]">
                                                    <div className="bg-zinc-900 text-white text-[11px] rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap">
                                                        A commitment must be submitted before forwarding this application.
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
    );
};

export default TemporaryAdvanceActionButtons;
