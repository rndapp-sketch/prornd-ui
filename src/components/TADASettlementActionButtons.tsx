import React, { useState, useEffect } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import { tadaAPI } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ArrowRightCircle } from "lucide-react";

interface TADASettlementActionButtonsProps {
    docName: string;
    onActionComplete?: () => void;
}

const TADASettlementActionButtons: React.FC<
    TADASettlementActionButtonsProps
> = ({ docName, onActionComplete }) => {
    const [actions, setActions] = useState<string[]>([]);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);

    const {
        call: fetchActions,
        result: actionsData,
        loading: actionsLoading,
    } = useFrappePostCall<{ message: string[] }>(tadaAPI.getWorkflowActions);
    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        tadaAPI.performAction,
    );

    useEffect(() => {
        if (docName) {
            const payload = { docname: docName };
            console.log("get_ta_da_settlement_workflow_actions PAYLOAD:", payload);
            fetchActions(payload);
        }
    }, [docName]);

    useEffect(() => {
        if (actionsData) {
            console.log("get_ta_da_settlement_workflow_actions RESPONSE:", actionsData);
        }
        if (actionsData?.message) {
            // Ensure unique actions
            setActions([...new Set(actionsData.message)]);
        }
    }, [actionsData]);

    const handleActionClick = async (action: string) => {
        const confirmed = window.confirm(
            `Are you sure you want to perform the action "${action}" on this TA DA Settlement?`,
        );
        if (!confirmed) return;

        setSelectedAction(action);

        try {
            const response = await performAction({
                docname: docName,
                action: action,
            });

            if (response?.message?.status === "success") {
                setSelectedAction(null);
                if (onActionComplete) {
                    onActionComplete();
                }
                // Refresh actions
                fetchActions({ docname: docName });
            } else {
                alert(response?.message?.message || "Action failed");
            }
        } catch (error: unknown) {
            console.error("Action error:", error);
            alert("An error occurred while performing the action.");
        } finally {
            setSelectedAction(null);
        }
    };

    // Dynamic action icon based on action type
    const getActionIcon = (actionName: string) => {
        const lowerName = actionName.toLowerCase();
        if (lowerName.includes("approve") || lowerName.includes("submit")) {
            return <CheckCircle2 className="mr-2 h-4 w-4" />;
        }
        if (lowerName.includes("reject") || lowerName.includes("cancel")) {
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
        <div className="flex flex-wrap gap-3">
            {actions.map((action) => (
                <Button
                    key={action}
                    onClick={() => handleActionClick(action)}
                    className="bg-[#D97757] text-white hover:bg-opacity-90 transition-all duration-200"
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
    );
};

export default TADASettlementActionButtons;
