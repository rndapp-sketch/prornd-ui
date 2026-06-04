import React, { useState, useEffect } from "react";
import { useSWRConfig } from "swr";
import { useParams, useNavigate } from "react-router-dom";
import {
    useFrappeGetDoc,
    useFrappePostCall,
    useFrappeGetCall,
    useFrappeAuth,
} from "frappe-react-sdk";
import {
    ArrowLeftIcon,
    FileIcon,
    ExternalLinkIcon,
    LayoutGridIcon,
    ClipboardListIcon,
    FileTextIcon,
    ShoppingCartIcon,
    CheckCircle2Icon,
    XCircleIcon,
    PencilIcon,
    SaveIcon,
    XIcon,
    FolderOpenIcon,
    MessageSquareIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
// import { AppSidebar } from '@/components/RndSidebar';
import { FrappeButton } from "@/components/ui/neo-brutalism";
import { GlobalLoader } from "@/components/ui/global-loader";
import ProjectDetailsView from "./ProjectDetails";
import ProjectDetailsOverview from "./ProjectDetailsOverview";
import { DOCTYPE_PR_LINKS, type PRLinkStrategy } from "@/utils/projectTypeMapping";
import TemporaryAdvanceDetailsView from "./TemporaryAdvanceDetailsView";
import {
    DynamicFormRenderer,
    type FormField,
    type LinkOption,
} from "@/components/forms/DynamicFormRenderer";
import {
    travelAPI,
    advanceSettlementAPI,
    temporaryAdvanceAPI,
    directPurchaseAPI,
    tadaAPI,
    recruitmentAdhocContractualAPI,
} from "@/services/apiService";
import { DepartmentName } from "@/components/DepartmentName";
import { BudgetHeadName } from "@/components/BudgetHeadName";

import { ActivityLog } from "@/components/ActivityLog";
import { BudgetActionsSidebar } from "@/components/BudgetActionsSidebar";
import TemporaryAdvanceActionButtons from "@/components/TemporaryAdvanceActionButtons";
import TADASettlementActionButtons from "@/components/TADASettlementActionButtons";
import { useUserRoles } from "@/components/UserRole";
import { POEditor } from "@/components/POEditor";
import { DeclarationFields } from "@/components/DeclarationFields";
import { AutocompleteEmail } from "@/components/AutocompleteEmail";

// Fields to hide from the overview
const HIDDEN_FIELDS = [
    "total_first_year_budget_1",
    "total_second_year_budget_1",
    "total_third_year_budget_1",
    "total_fourth_year_budget_1",
    "total_fifth_year_budget_1",
    "grand_total_proposal_1",
    "total_first_year_budget",
    "total_second_year_budget",
    "total_third_year_budget",
    "total_fourth_year_budget",
    "total_fifth_year_budget",
    "grand_total_proposal",
    "amended_from",
    "workflow_state",
    "modified_by",
    // Top Up Fellowship internal flags / declaration checkboxes — not for display
    "send_to_faculty_admission",
    "checkbox1",
    "checkbox2",
    "checkbox3",
];

// Style constants for generic details
const labelClasses =
    "text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 block";
const valueClasses =
    "text-[15px] font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed break-words";

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
    const [comment, setComment] = React.useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Confirm {action}
                </h3>
                <textarea
                    className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(217,119,87,0.25)] focus:border-[#D97757]"
                    rows={4}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <FrappeButton
                        onClick={onClose}
                        className="bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:bg-zinc-700"
                        disabled={isLoading}
                    >
                        Cancel
                    </FrappeButton>
                    <FrappeButton
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading}
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
                    >
                        {isLoading ? "Processing..." : "Confirm"}
                    </FrappeButton>
                </div>
            </div>
        </div>
    );
};

const ReimbursementWorkflowActions = ({
    docname,
    onActionComplete,
}: {
    docname: string;
    onActionComplete: () => void;
}) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{
        message: string[];
    }>(
        "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_reimbursement_workflow_actions",
        { docname },
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.perform_reimbursement_action",
    );

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            <div className="flex gap-2">
                {data.message.map((action) => (
                    <FrappeButton
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={actionLoading}
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
                    >
                        {action}
                    </FrappeButton>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};

const FundSanctionWorkflowActions = ({
    docname,
    onActionComplete,
    blockForward = false,
}: {
    docname: string;
    onActionComplete: () => void;
    blockForward?: boolean;
}) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{
        message: string[];
    }>(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_workflow_actions",
        { docname },
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.perform_fund_sanction_action",
    );

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    // "Add Fund" belongs on the Fund Received page, not the pending-task detail view
    const visibleActions = (data?.message || []).filter(
        (action) => action !== "Add Fund",
    );

    if (actionsLoading || !visibleActions.length) return null;

    return (
        <>
            <div className="flex gap-2 flex-wrap">
                {visibleActions.map((action) => {
                    const isForward = action.toLowerCase().includes("forward");
                    const isBlocked = blockForward && isForward;
                    return (
                        <div key={action} className="relative group">
                            <FrappeButton
                                onClick={() => !isBlocked && handleActionClick(action)}
                                disabled={actionLoading || isBlocked}
                                className={isBlocked
                                    ? "opacity-50 cursor-not-allowed bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-600"
                                    : "bg-[#D97757] hover:bg-[#c66a4e] text-white"
                                }
                            >
                                {action}
                            </FrappeButton>
                            {isBlocked && (
                                <div className="absolute bottom-full left-0 mb-1.5 hidden group-hover:block z-20 w-64 p-2.5 bg-zinc-900 text-white text-[11px] leading-relaxed rounded-lg shadow-xl pointer-events-none">
                                    Account details must be saved in the fund sanction form before forwarding.
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};

const TravelWorkflowActions = ({
    docname,
    onActionComplete,
}: {
    docname: string;
    onActionComplete: () => void;
}) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{
        message: string[];
    }>(
        "rndopsapp.rndopsapp.doctype.travel.travel.get_travel_workflow_actions",
        {
            docname,
        },
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.travel.travel.perform_travel_action",
    );

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            <div className="flex gap-2">
                {data.message.map((action) => (
                    <FrappeButton
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={actionLoading}
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
                    >
                        {action}
                    </FrappeButton>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};

const DirectPurchaseWorkflowActions = ({
    docname,
    onActionComplete,
    onAfterAction,
}: {
    docname: string;
    onActionComplete: () => void;
    onAfterAction?: (action: string) => void;
}) => {
    const [actions, setActions] = React.useState<string[]>([]);
    const [actionsLoading, setActionsLoading] = React.useState(true);
    const isMountedRef = React.useRef(true);

    const { call: fetchActions } = useFrappePostCall<{
        message: string[];
    }>(directPurchaseAPI.getWorkflowActions);

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        directPurchaseAPI.performAction,
    );

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const loadActions = React.useCallback(async () => {
        setActionsLoading(true);
        try {
            const response = await fetchActions({ docname });
            if (!isMountedRef.current) return;
            console.log("[DirectPurchaseWorkflowActions] fetched actions", {
                docname,
                endpoint: directPurchaseAPI.getWorkflowActions,
                actions: response?.message,
            });
            setActions(
                Array.isArray(response?.message) ? response.message : [],
            );
        } catch (error) {
            if (isMountedRef.current) {
                console.error(
                    "Error fetching direct purchase workflow actions:",
                    error,
                );
                setActions([]);
            }
        } finally {
            if (isMountedRef.current) {
                setActionsLoading(false);
            }
        }
    }, [docname, fetchActions]);

    React.useEffect(() => {
        isMountedRef.current = true;
        loadActions();

        return () => {
            isMountedRef.current = false;
        };
    }, [loadActions]);

    const handleActionClick = (action: string) => {
        console.log("[DirectPurchaseWorkflowActions] action clicked", {
            docname,
            action,
            endpoint: directPurchaseAPI.performAction,
        });
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            console.log("[DirectPurchaseWorkflowActions] submitting action", {
                docname,
                action: selectedAction,
                comment,
                endpoint: directPurchaseAPI.performAction,
            });
            const response = await performAction({
                docname,
                action: selectedAction,
                comment,
            });
            console.log("[DirectPurchaseWorkflowActions] action response", {
                docname,
                action: selectedAction,
                endpoint: directPurchaseAPI.performAction,
                response,
            });
            await loadActions();
            setModalOpen(false);
            onActionComplete();
            onAfterAction?.(selectedAction);
        } catch (error) {
            console.error("[DirectPurchaseWorkflowActions] action failed", {
                docname,
                action: selectedAction,
                endpoint: directPurchaseAPI.performAction,
                error,
            });
        }
    };

    if (actionsLoading || !actions.length) return null;

    return (
        <>
            <div className="flex gap-2">
                {actions.map((action) => (
                    <FrappeButton
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={actionLoading}
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
                    >
                        {action}
                    </FrappeButton>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};

const TopUpFellowshipWorkflowActions = ({
    docname,
    onActionComplete,
    commitRequired = false,
}: {
    docname: string;
    onActionComplete: () => void;
    commitRequired?: boolean;
}) => {
    // Live doc — needed to know workflow_state, send_to_faculty_admission flag
    // and faculty_admission_pdf URL.
    const { data: docResp, isLoading: docLoading } = useFrappeGetCall<{
        message: any;
    }>("frappe.client.get", { doctype: "Top Up Fellowship", name: docname });

    const { data: actionsResp, isLoading: actionsLoading } = useFrappeGetCall<{
        message: string[];
    }>(
        "rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_top_up_fellowship_workflow_actions",
        { docname },
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.perform_top_up_fellowship_action",
    );

    const { call: markSendToFa, loading: markLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.mark_send_to_faculty_admission",
    );

    // Dynamic put-back engine (backend-driven; replaces Workflow Transition rows).
    const { data: backResp, mutate: refreshBackActions } = useFrappeGetCall<{
        message: { actions: { target: string; label: string; next_state: string }[] };
    }>(
        "rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_available_back_actions",
        { docname },
    );
    const { call: putBack, loading: putBackLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.put_back",
    );
    const backActions = backResp?.message?.actions || [];

    const handlePutBack = async (target: string, label: string) => {
        const comment = window.prompt(`${label}\n\nAdd a comment (optional):`, "");
        if (comment === null) return;
        try {
            const res: any = await putBack({ docname, target, comment: comment || undefined });
            if (res?.message?.status === "error") {
                alert(res.message.message || `${label} failed.`);
                return;
            }
            refreshBackActions();
            onActionComplete();
        } catch (err: any) {
            console.error("put_back failed:", err);
            alert(err?.message || `${label} failed.`);
        }
    };

    const renderBackButtons = () =>
        backActions.map((b) => (
            <FrappeButton
                key={b.target}
                onClick={() => handlePutBack(b.target, b.label)}
                disabled={putBackLoading}
                className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-100"
            >
                {b.label}
            </FrappeButton>
        ));

    const doc = docResp?.message;
    const workflowState: string = doc?.workflow_state || "";
    const sentToFa: boolean = !!doc?.send_to_faculty_admission;
    const facultyPdfUrl: string = doc?.faculty_admission_pdf || "";
    const hasFacultyPdf = !!(facultyPdfUrl && String(facultyPdfUrl).trim());

    const isPendingStaff = workflowState === "Pending Staff Approval";

    const downloadGeneratedPdf = () => {
        const url = `/api/method/frappe.utils.print_format.download_pdf?doctype=${encodeURIComponent("Top Up Fellowship")}&name=${encodeURIComponent(docname)}&format=Standard&no_letterhead=0`;
        window.open(url, "_blank");
    };

    const handleSendToFa = async () => {
        if (!window.confirm("Download the application PDF and mark it as sent to Faculty Admission?")) return;
        try {
            const res: any = await markSendToFa({ docname });
            if (res?.message?.status === "error") {
                alert(res.message.message || "Could not mark as sent.");
                return;
            }
            downloadGeneratedPdf();
            onActionComplete();
        } catch (err: any) {
            console.error("Send-to-Faculty-Admission failed:", err);
            alert(err?.message || "Could not mark as sent.");
        }
    };

    const handleActionClick = async (action: string) => {
        const confirmMsg = action.toLowerCase() === "reject"
            ? "Reject this Top Up Fellowship? This cannot be undone."
            : `Perform "${action}"?`;
        if (!window.confirm(confirmMsg)) return;
        try {
            const res: any = await performAction({ docname, action });
            if (res?.message?.status === "error") {
                alert(res.message.message || `Action "${action}" failed.`);
                return;
            }
            onActionComplete();
        } catch (err: any) {
            console.error("Top Up Fellowship action failed:", err);
            alert(err?.message || `Action "${action}" failed.`);
        }
    };

    if (docLoading || actionsLoading) return null;
    const actions = actionsResp?.message || [];

    // 3-stage Pending Staff Approval flow (mirrors SCR Dean→Director).
    if (isPendingStaff && actions.length > 0) {
        // Stage 1 — staff hasn't sent to Faculty Admission yet.
        if (!sentToFa) {
            const stageOneActions = actions.filter((a) => {
                const al = a.toLowerCase();
                return al !== "forward" && al !== "submit" && al !== "approve";
            });
            return (
                <div className="flex gap-2 flex-wrap">
                    <FrappeButton
                        onClick={handleSendToFa}
                        disabled={markLoading}
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
                    >
                        Send to Faculty Admission
                    </FrappeButton>
                    {renderBackButtons()}
                    {stageOneActions.map((action) => {
                        const al = action.toLowerCase();
                        const isReject = al === "reject";
                        return (
                            <FrappeButton
                                key={action}
                                onClick={() => handleActionClick(action)}
                                disabled={actionLoading}
                                className={
                                    isReject
                                        ? "bg-red-600 hover:bg-red-700 text-white"
                                        : "bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-zinc-100"
                                }
                            >
                                {action}
                            </FrappeButton>
                        );
                    })}
                </div>
            );
        }
        // Stage 2 — sent, but signed PDF not yet uploaded.
        if (!hasFacultyPdf) {
            return (
                <div className="flex gap-2 flex-wrap">
                    <FrappeButton
                        disabled
                        className="bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300 cursor-not-allowed"
                    >
                        Waiting for Faculty Admission Upload
                    </FrappeButton>
                    {renderBackButtons()}
                </div>
            );
        }
        // Stage 3 — PDF uploaded → view + real workflow actions.
        return (
            <div className="flex flex-col items-end gap-2">
                <div className="flex gap-2 flex-wrap">
                    <FrappeButton
                        onClick={() => window.open(facultyPdfUrl, "_blank")}
                        className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-300"
                    >
                        View Faculty Admission Signed PDF
                    </FrappeButton>
                    {renderBackButtons()}
                    {actions.map((action) => {
                        const isForwardLike =
                            action.toLowerCase() === "forward" ||
                            action.toLowerCase() === "submit" ||
                            action.toLowerCase() === "approve";
                        const disabled =
                            actionLoading || (commitRequired && isForwardLike);
                        return (
                            <FrappeButton
                                key={action}
                                onClick={() => {
                                    if (commitRequired && isForwardLike) {
                                        alert(
                                            "Please submit the commit (budget head + amount) before forwarding to HoS.",
                                        );
                                        return;
                                    }
                                    handleActionClick(action);
                                }}
                                disabled={disabled}
                                className={
                                    disabled
                                        ? "bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300 cursor-not-allowed"
                                        : "bg-[#D97757] hover:bg-[#c66a4e] text-white"
                                }
                            >
                                {action}
                            </FrappeButton>
                        );
                    })}
                </div>
                {commitRequired && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        A commitment must be submitted before forwarding.
                    </p>
                )}
            </div>
        );
    }

    // Default: any state outside Pending Staff Approval — render all available
    // workflow actions normally, plus any dynamic put-back actions.
    if (!actions.length && !backActions.length) return null;
    return (
        <div className="flex gap-2 flex-wrap">
            {actions.map((action) => (
                <FrappeButton
                    key={action}
                    onClick={() => handleActionClick(action)}
                    disabled={actionLoading}
                    className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
                >
                    {action}
                </FrappeButton>
            ))}
            {renderBackButtons()}
        </div>
    );
};

// const CancellationRequestWorkflowActions = ({
//     docname,
//     onActionComplete,
// }: {
//     docname: string;
//     onActionComplete: () => void;
// }) => {
//     const { data, isLoading: actionsLoading } = useFrappeGetCall<{
//         message: string[];
//     }>(
//         "rndopsapp.rndopsapp.doctype.cancellation_request.cancellation_request.get_cancellation_request_workflow_actions",
//         { docname },
//     );

//     const { call: performAction, loading: actionLoading } = useFrappePostCall(
//         "rndopsapp.rndopsapp.doctype.cancellation_request.cancellation_request.perform_cancellation_request_action",
//     );

//     const [modalOpen, setModalOpen] = React.useState(false);
//     const [selectedAction, setSelectedAction] = React.useState("");

//     const handleActionClick = (action: string) => {
//         setSelectedAction(action);
//         setModalOpen(true);
//     };

//     const handleConfirmAction = async (comment: string) => {
//         try {
//             await performAction({ docname, action: selectedAction, comment });
//             setModalOpen(false);
//             onActionComplete();
//         } catch (error) {
//             console.error("Error performing cancellation request action:", error);
//         }
//     };

//     if (actionsLoading || !data?.message?.length) return null;

//     return (
//         <>
//             <div className="flex gap-2">
//                 {data.message.map((action) => (
//                     <FrappeButton
//                         key={action}
//                         onClick={() => handleActionClick(action)}
//                         disabled={actionLoading}
//                         className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
//                     >
//                         {action}
//                     </FrappeButton>
//                 ))}
//             </div>
//             <CommentModal
//                 isOpen={modalOpen}
//                 onClose={() => setModalOpen(false)}
//                 onSubmit={handleConfirmAction}
//                 action={selectedAction}
//                 isLoading={actionLoading}
//             />
//         </>
//     );
// };

const RecruitmentAdhocContractualWorkflowActions = ({
    docname,
    onActionComplete,
    commitRequired = false,
}: {
    docname: string;
    onActionComplete: () => void;
    commitRequired?: boolean;
}) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{
        message: string[];
    }>(recruitmentAdhocContractualAPI.getWorkflowActions, { docname });

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        recruitmentAdhocContractualAPI.performAction,
    );

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    if (commitRequired) {
        return (
            <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 font-medium">
                A commitment must be submitted before forwarding this application.
            </div>
        );
    }

    return (
        <>
            <div className="flex gap-2">
                {data.message.map((action) => (
                    <FrappeButton
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={actionLoading}
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
                    >
                        {action}
                    </FrappeButton>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
        </>
    );
};

// ─── Project Preview Modal ────────────────────────────────────────────────────

/**
 * Returns the PR document `name` (auto-id) from a record, using the
 * DOCTYPE_PR_LINKS mapping.  Returns null when only a project_no is available
 * (caller should do an async lookup in that case).
 */
function extractPRName(doctype: string, data: Record<string, any>): string | null {
    const mapping = DOCTYPE_PR_LINKS[doctype];
    if (!mapping) return null;

    const tryStrategy = (s: PRLinkStrategy): string | null => {
        if (s.type === 'self') return (data['name'] as string) || null;
        if (s.type === 'pr_name') return (data[s.field] as string) || null;
        if (s.type === 'direct_type') return null; // value is project_type, not PR name
        if (s.type === 'pr_project_no') return null; // only has project_no, needs async lookup
        return null;
    };

    return tryStrategy(mapping.primary) ?? (mapping.fallback ? tryStrategy(mapping.fallback) : null);
}

const ProjectPreviewModal = ({
    projectName,
    onClose,
}: {
    projectName: string;
    onClose: () => void;
}) => (
    <div
        className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
        <div className="relative flex-1 mx-auto my-4 w-full max-w-7xl flex flex-col bg-claude-bg dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
            {/* Close bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <FolderOpenIcon className="w-4 h-4 text-[#D97757]" />
                    Project Registration Preview
                    <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 dark:bg-zinc-800 text-[#D97757] font-mono border border-orange-100 dark:border-zinc-700">
                        {projectName}
                    </span>
                </span>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    aria-label="Close project preview"
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
                <ProjectDetailsOverview projectName={projectName} embedded />
            </div>
        </div>
    </div>
);

// Helper to check if a value is a file path
const isFilePath = (value: string) => {
    if (typeof value !== "string") return false;
    return (
        value.startsWith("/private/files/") ||
        value.startsWith("/files/") ||
        value.match(/\.(pdf|jpg|jpeg|png|doc|docx|xls|xlsx)$/i)
    );
};

// Function to get filename from path
const getFileName = (path: string) => path.split("/").pop() || path;

// ─── Direct Purchase Tab View ─────────────────────────────────────────────────

type DPTabId = "details" | "p11" | "sanction" | "po";

const DP_EXCLUDED = [
    "doctype",
    "docstatus",
    "idx",
    "owner",
    "creation",
    "modified",
    "modified_by",
    "_user_tags",
    "_comments",
    "_assign",
    "_liked_by",
    "name",
    "workflow_state",
    "_seen",
    "parent",
    "parenttype",
    "parentfield",
];

const dpFormatFieldName = (key: string) =>
    key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

const dpIsAmountField = (key: string) =>
    /amount|total|price|estimate|budget|salary|fee|cost/i.test(key);

const dpIsBoolCheck = (key: string, val: any) =>
    (val === 0 || val === 1) &&
    (key.startsWith("dec_") ||
        key.startsWith("is_") ||
        key.startsWith("has_") ||
        key.startsWith("declaration_"));

const dpFormatINR = (val: any) =>
    Number(val).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    });

// Smart document viewer for Direct Purchase details panel
const DPDocumentViewer = ({
    data,
    doctype: viewerDoctype,
}: {
    data: Record<string, any>;
    doctype?: string;
}) => {
    const allScalar = Object.entries(data).filter(([key, value]) => {
        if (DP_EXCLUDED.includes(key)) return false;
        if (key.startsWith("_")) return false;
        if (Array.isArray(value)) return false;
        if (value === null || value === undefined || value === "") return false;
        return true;
    });

    const childTables = Object.entries(data).filter(
        ([, value]) => Array.isArray(value) && (value as any[]).length > 0,
    );

    const fileFields = allScalar.filter(
        ([k, v]) => isFilePath(String(v)) || k.startsWith("upload_"),
    );
    const boolFields = allScalar.filter(([k, v]) => dpIsBoolCheck(k, v));
    const amountFields = allScalar.filter(
        ([k, v]) =>
            dpIsAmountField(k) &&
            !isFilePath(String(v)) &&
            !dpIsBoolCheck(k, v),
    );
    const infoFields = allScalar.filter(
        ([k, v]) =>
            !isFilePath(String(v)) &&
            !dpIsBoolCheck(k, v) &&
            !dpIsAmountField(k) &&
            !k.startsWith("upload_"),
    );

    const renderVal = (key: string, value: any): React.ReactNode => {
        if (value === null || value === undefined || value === "")
            return (
                <span className="text-[#71717A] dark:text-[#A1A1AA]">—</span>
            );

        if (isFilePath(String(value))) {
            return (
                <a
                    href={String(value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800 text-[#D97757] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors text-sm font-medium max-w-full"
                >
                    <FileIcon className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">
                        {getFileName(String(value))}
                    </span>
                    <ExternalLinkIcon className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
            );
        }

        if (dpIsBoolCheck(key, value)) {
            return value === 1 ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2Icon className="w-3.5 h-3.5" />
                    Yes
                </span>
            ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-[#71717A] dark:text-[#A1A1AA] border border-[#E4E4E7] dark:border-[#3F3F46]">
                    <XCircleIcon className="w-3.5 h-3.5" />
                    No
                </span>
            );
        }

        if (dpIsAmountField(key) && !isNaN(Number(value))) {
            return (
                <span className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                    {dpFormatINR(value)}
                </span>
            );
        }

        if (key === "applicant_department")
            return <DepartmentName name={String(value)} />;
        if (key === "account_head")
            return <BudgetHeadName id={String(value)} />;

        return String(value);
    };

    if (allScalar.length === 0 && childTables.length === 0) {
        return (
            <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] italic">
                No data to display.
            </p>
        );
    }

    const kpiAmounts = amountFields.slice(0, 3);

    return (
        <div className="space-y-8">
            {/* Financial KPI strip */}
            {kpiAmounts.length > 0 && (
                <div
                    className={cn(
                        "grid gap-4",
                        kpiAmounts.length === 1 && "grid-cols-1 max-w-xs",
                        kpiAmounts.length === 2 && "grid-cols-2",
                        kpiAmounts.length >= 3 && "grid-cols-3",
                    )}
                >
                    {kpiAmounts.map(([key, value]) => (
                        <div
                            key={key}
                            className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-zinc-800/50 px-5 py-4"
                        >
                            <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-1.5">
                                {dpFormatFieldName(key)}
                            </p>
                            <p className="text-xl font-serif font-medium text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
                                {!isNaN(Number(value))
                                    ? dpFormatINR(value)
                                    : String(value)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Info fields */}
            {infoFields.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-4 pb-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                        Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                        {infoFields.map(([key, value]) => (
                            <div key={key} className="flex flex-col gap-1">
                                <p className="text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]">
                                    {dpFormatFieldName(key)}
                                </p>
                                <p className="text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-relaxed">
                                    {renderVal(key, value)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Declarations */}
            {viewerDoctype && <DeclarationFields doctype={viewerDoctype} />}

            {/* Attachments */}
            {fileFields.length > 0 && (
                <div>
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-4 pb-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                        Attachments
                    </h4>
                    <div className="flex flex-col gap-2">
                        {fileFields.map(([key, value]) => (
                            <div key={key} className="flex items-center gap-3">
                                <span className="text-xs text-[#71717A] dark:text-[#A1A1AA] w-36 shrink-0 font-medium uppercase tracking-wider">
                                    {dpFormatFieldName(key)}
                                </span>
                                {renderVal(key, value)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Child tables */}
            {childTables.map(([key, rows]) => {
                const cols = Object.keys((rows as any[])[0] || {}).filter(
                    (k) => !k.startsWith("_") && !DP_EXCLUDED.includes(k),
                );
                const colTotals: Record<string, number> = {};
                const hasAmountCols = cols.some((c) => dpIsAmountField(c));
                if (hasAmountCols) {
                    cols.forEach((c) => {
                        if (dpIsAmountField(c))
                            colTotals[c] = (rows as any[]).reduce(
                                (s, r) => s + (parseFloat(r[c]) || 0),
                                0,
                            );
                    });
                }
                return (
                    <div key={key}>
                        <h4 className="text-xs font-semibold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-3 pb-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                            {dpFormatFieldName(key)}
                        </h4>
                        <div className="overflow-x-auto rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50/80 dark:bg-zinc-800/50">
                                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] w-10">
                                            #
                                        </th>
                                        {cols.map((col) => (
                                            <th
                                                key={col}
                                                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]"
                                            >
                                                {dpFormatFieldName(col)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(rows as any[]).map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className={cn(
                                                "border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-0 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors",
                                                idx % 2 === 1 &&
                                                "bg-[#FAFAF9]/60 dark:bg-zinc-800/20",
                                            )}
                                        >
                                            <td className="px-4 py-3 text-xs text-[#71717A] dark:text-[#A1A1AA] font-mono">
                                                {idx + 1}
                                            </td>
                                            {cols.map((k) => (
                                                <td
                                                    key={k}
                                                    className="px-4 py-3 text-[#3F3F46] dark:text-[#E4E4E7]"
                                                >
                                                    {dpIsAmountField(k) &&
                                                        !isNaN(Number(row[k])) ? (
                                                        <span className="font-medium">
                                                            {dpFormatINR(
                                                                row[k],
                                                            )}
                                                        </span>
                                                    ) : row[k] != null ? (
                                                        String(row[k])
                                                    ) : (
                                                        "—"
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                    {hasAmountCols && (
                                        <tr className="border-t-2 border-[#E4E4E7] dark:border-[#3F3F46] bg-zinc-50 dark:bg-zinc-800/60 font-semibold">
                                            <td className="px-4 py-3" />
                                            {cols.map((c) => (
                                                <td
                                                    key={c}
                                                    className="px-4 py-3 text-[#3F3F46] dark:text-[#E4E4E7]"
                                                >
                                                    {colTotals[c] != null ? (
                                                        <span className="font-semibold text-[#D97757]">
                                                            {dpFormatINR(
                                                                colTotals[c],
                                                            )}
                                                        </span>
                                                    ) : (
                                                        ""
                                                    )}
                                                </td>
                                            ))}
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// Fetches & renders a single linked Frappe document inside a tab
const DPLinkedDocTab = ({
    doctype,
    filterField,
    filterValue,
    emptyTitle,
    emptyDescription,
}: {
    doctype: string;
    filterField: string;
    filterValue: string;
    emptyTitle: string;
    emptyDescription: string;
}) => {
    const { data: listData, isLoading: listLoading } = useFrappeGetCall<{
        message: { name: string }[];
    }>("frappe.client.get_list", {
        doctype,
        filters: JSON.stringify([[filterField, "=", filterValue]]),
        fields: JSON.stringify(["name"]),
        limit: 1,
    });
    const docName = listData?.message?.[0]?.name || "";
    const { data: docData, isLoading: docLoading } = useFrappeGetDoc<
        Record<string, any>
    >(doctype, docName);

    if (listLoading || docLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D97757] border-t-transparent" />
            </div>
        );
    }

    if (!docName || !docData) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
                <FileTextIcon className="h-10 w-10 text-[#E4E4E7] dark:text-[#3F3F46]" />
                <p className="font-serif text-base font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
                    {emptyTitle}
                </p>
                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-xs">
                    {emptyDescription}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="mb-5">
                <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[#71717A] dark:text-[#A1A1AA] border border-[#E4E4E7] dark:border-[#3F3F46]">
                    {docName}
                </span>
            </div>
            <DPDocumentViewer data={docData} doctype={doctype} />
        </div>
    );
};

const DP_TABS = [
    {
        id: "details" as DPTabId,
        label: "Details",
        icon: <LayoutGridIcon className="w-4 h-4" />,
    },
    {
        id: "p11" as DPTabId,
        label: "P-11 Form",
        icon: <ClipboardListIcon className="w-4 h-4" />,
    },
    {
        id: "sanction" as DPTabId,
        label: "Sanction Sheet",
        icon: <FileTextIcon className="w-4 h-4" />,
    },
    {
        id: "po" as DPTabId,
        label: "Purchase Order",
        icon: <ShoppingCartIcon className="w-4 h-4" />,
    },
];

const DirectPurchaseTabView = ({
    data,
    docName,
    activeTab,
    setActiveTab,
}: {
    data: Record<string, any>;
    docName: string;
    activeTab: DPTabId;
    setActiveTab: (tab: DPTabId) => void;
}) => {
    const [isOpeningSanctionSheet, setIsOpeningSanctionSheet] = useState(false);
    const [poSanctionData, setPoSanctionData] = useState<Record<
        string,
        any
    > | null>(null);
    const [isLoadingPOData, setIsLoadingPOData] = useState(false);
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isStaffRnD = roles.some((r) =>
        ["staff, RnD", "Staff RnD", "RnD Staff", "System Manager"].includes(r),
    );
    const isPermanentEmployee = roles.some((r) => r === "Permanent Employee");

    // Fetch sanction sheet data for PO editor when PO tab is active
    useEffect(() => {
        if (activeTab !== "po" || !docName) return;
        if (poSanctionData) return;

        const fetchSSData = async () => {
            setIsLoadingPOData(true);
            try {
                const filters = JSON.stringify([["app_id", "=", docName]]);
                const listRes = await fetch(
                    `/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=${encodeURIComponent('["name"]')}`,
                    {
                        credentials: "include",
                        headers: { Accept: "application/json" },
                    },
                )
                    .then((r) => r.json())
                    .catch(() => ({ data: [] }));

                const ssName = listRes?.data?.[0]?.name;
                if (ssName) {
                    const docRes = await fetch(
                        `/api/method/frappe.client.get`,
                        {
                            method: "POST",
                            credentials: "include",
                            headers: {
                                "Content-Type": "application/json",
                                Accept: "application/json",
                                "X-Frappe-CSRF-Token":
                                    (window as any).csrf_token || "",
                            },
                            body: JSON.stringify({
                                doctype: "sanction_sheet",
                                name: ssName,
                            }),
                        },
                    )
                        .then((r) => r.json())
                        .catch(() => null);
                    if (docRes?.message) {
                        setPoSanctionData(docRes.message);
                    }
                }
            } catch (err) {
                console.error("Error fetching sanction sheet for PO:", err);
            } finally {
                setIsLoadingPOData(false);
            }
        };
        fetchSSData();
    }, [activeTab, docName, poSanctionData]);

    const handleOpenSanctionSheet = async () => {
        setIsOpeningSanctionSheet(true);
        try {
            const filters = JSON.stringify([["app_id", "=", docName]]);
            const res = await fetch(
                `/api/v2/document/sanction_sheet?filters=${encodeURIComponent(filters)}&fields=["name"]`,
                {
                    credentials: "include",
                    headers: { Accept: "application/json" },
                },
            );
            if (res.ok) {
                const result = await res.json();
                const existing = result.data?.[0];
                if (existing?.name) {
                    navigate(`/sanction-sheet?edit=${existing.name}`);
                    return;
                }
            }
            const projectNo = data.project_no || data.project || "";
            navigate(
                `/sanction-sheet?app_id=${docName}&project_no=${encodeURIComponent(projectNo)}`,
            );
        } catch {
            const projectNo = data.project_no || data.project || "";
            navigate(
                `/sanction-sheet?app_id=${docName}&project_no=${encodeURIComponent(projectNo)}`,
            );
        } finally {
            setIsOpeningSanctionSheet(false);
        }
    };

    return (
        <div className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden">
            {/* Tab bar with workflow status */}
            <div className="flex items-center justify-between border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-zinc-800/30 pr-4">
                <div className="flex items-center overflow-x-auto">
                    {DP_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "inline-flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150",
                                activeTab === tab.id
                                    ? "border-[#D97757] text-[#D97757]"
                                    : "border-transparent text-[#71717A] dark:text-[#A1A1AA] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7] hover:border-[#E4E4E7] dark:hover:border-[#3F3F46]",
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
                {data.workflow_state && (
                    <span className="shrink-0 text-xs font-semibold px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                        {data.workflow_state}
                    </span>
                )}
            </div>

            {/* Tab content */}
            <div className="p-6">
                {activeTab === "details" && (
                    <DPDocumentViewer data={data} doctype="Direct Purchase" />
                )}

                {activeTab === "p11" && (
                    <DPLinkedDocTab
                        doctype="P_11 Form"
                        filterField="app_id"
                        filterValue={docName}
                        emptyTitle="No P-11 Form Generated Yet"
                        emptyDescription="The P-11 Form is generated after the Direct Purchase is approved."
                    />
                )}

                {activeTab === "sanction" && (
                    <>
                        {data.workflow_state === "RDP-11 Verified" &&
                            isStaffRnD && (
                                <div className="mb-5">
                                    <button
                                        onClick={handleOpenSanctionSheet}
                                        disabled={isOpeningSanctionSheet}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] hover:bg-[#c66a4e] text-white disabled:opacity-60"
                                    >
                                        {isOpeningSanctionSheet
                                            ? "Opening…"
                                            : "Sanction Sheet"}
                                    </button>
                                </div>
                            )}
                        <DPLinkedDocTab
                            doctype="sanction_sheet"
                            filterField="app_id"
                            filterValue={docName}
                            emptyTitle="No Sanction Sheet Generated Yet"
                            emptyDescription="The Sanction Sheet is created by RnD Staff after the P-11 Form is verified and approved."
                        />
                    </>
                )}

                {activeTab === "po" && (
                    <>
                        {isLoadingPOData ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#D97757] border-t-transparent" />
                            </div>
                        ) : poSanctionData && (isStaffRnD || data?.workflow_state === "POGenerated") ? (
                            <POEditor
                                ssData={poSanctionData}
                                dpId={docName}
                                isStaffRnD={isStaffRnD}
                                isPIReadOnly={isPermanentEmployee && !isStaffRnD}
                                onUploadSignedPO={async (file: File) => {
                                    const formData = new FormData();
                                    formData.append("file", file, file.name);
                                    formData.append(
                                        "docname",
                                        poSanctionData.name,
                                    );
                                    formData.append("app_id", docName);
                                    formData.append(
                                        "project_no",
                                        poSanctionData.project_no || "",
                                    );
                                    const res = await fetch(
                                        "/api/method/rndopsapp.rndopsapp.doctype.direct_purchase.direct_purchase.upload_po_document",
                                        {
                                            method: "POST",
                                            credentials: "include",
                                            headers: {
                                                "X-Frappe-CSRF-Token":
                                                    (window as any)
                                                        .csrf_token || "",
                                            },
                                            body: formData,
                                        },
                                    );
                                    const json = await res
                                        .json()
                                        .catch(() => ({}));
                                    if (
                                        !res.ok ||
                                        json?.message?.status === false
                                    )
                                        throw new Error(
                                            json?.message?.message ||
                                            "Upload failed",
                                        );
                                }}
                            />
                        ) : poSanctionData ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                <ShoppingCartIcon className="h-10 w-10 text-[#E4E4E7] dark:text-[#3F3F46]" />
                                <p className="font-serif text-base font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
                                    Purchase Order Not Yet Generated
                                </p>
                                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-xs">
                                    The Purchase Order has not been generated by
                                    staff yet. Please check back later.
                                </p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                                <ShoppingCartIcon className="h-10 w-10 text-[#E4E4E7] dark:text-[#3F3F46]" />
                                <p className="font-serif text-base font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
                                    No Sanction Sheet Available
                                </p>
                                <p className="text-sm text-[#71717A] dark:text-[#A1A1AA] max-w-xs">
                                    The Purchase Order is generated once the
                                    Sanction Sheet is approved.
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

const PendingTaskDetails: React.FC = () => {
    const { doctype: rawDoctype, name } = useParams<{
        doctype: string;
        name: string;
    }>();
    const navigate = useNavigate();
    // Decode the doctype URL parameter
    const doctype = rawDoctype ? decodeURIComponent(rawDoctype) : "";

    const { data, isLoading, error, mutate } = useFrappeGetDoc(
        doctype || "",
        name || "",
    );
    // Fund Sanction: fetch linked Project Registration to get project_no
    const fsProjectRegName = doctype === 'Fund Sanction' && data?.project_proposal
        ? data.project_proposal
        : null;
    const { data: fsProjectRegData, mutate: mutateFsProjectReg } = useFrappeGetDoc(
        'Project Registration',
        fsProjectRegName ?? undefined,
        fsProjectRegName,
    );

    const { mutate: globalMutate } = useSWRConfig();
    const refreshAll = () => {
        mutate();
        // Revalidate workflow action keys so buttons update
        globalMutate(
            (key: any) => typeof key === "string" && key.includes("workflow"),
            undefined,
            { revalidate: true },
        );
    };

    // Auth & Roles
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isRnDStaff = roles.some(
        (r) =>
            r === "RnD Staff" ||
            r === "R&D Staff" ||
            r === "Research and Development Staff" ||
            r === "System Manager" ||
            r === "staff, RnD" ||
            r === "Hos, RnD (Head of Section, RnD)",
    );
    const isDoRnd = roles.includes("Dean, RnD");

    // Fund Sanction — editable account details
    const [fsAcctPfms, setFsAcctPfms] = useState('');
    const [fsAcctSchemeName, setFsAcctSchemeName] = useState('');
    const [fsAcctSchemeNum, setFsAcctSchemeNum] = useState('');
    const [fsAcctAccountNum, setFsAcctAccountNum] = useState('');
    const [fsAcctBankName, setFsAcctBankName] = useState('');
    const [isSavingAcctDetails, setIsSavingAcctDetails] = useState(false);

    useEffect(() => {
        if (doctype !== 'Fund Sanction') return;
        if (!fsProjectRegData) return;
        setFsAcctPfms(fsProjectRegData.is_the_account_type_pfms || '');
        setFsAcctSchemeName(fsProjectRegData.scheme_name || '');
        setFsAcctSchemeNum(fsProjectRegData.enter_scheme_number || '');
        setFsAcctAccountNum(fsProjectRegData.account_number || '');
        setFsAcctBankName(fsProjectRegData.bank_name || '');
    }, [doctype, fsProjectRegData]);

    const handleSaveFsAcctDetails = async () => {
        const projectRegName = data?.project_proposal;
        if (!projectRegName) {
            alert('No linked Project Registration found for this Fund Sanction.');
            return;
        }
        setIsSavingAcctDetails(true);
        try {
            const res = await fetch(
                '/api/method/rndopsapp.rndopsapp.doctype.project_registration.project_registration.update_project_fields',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Frappe-CSRF-Token': (window as any).csrf_token || '',
                    },
                    body: JSON.stringify({
                        docname: projectRegName,
                        is_the_account_type_pfms: fsAcctPfms,
                        scheme_name: fsAcctSchemeName,
                        enter_scheme_number: fsAcctSchemeNum,
                        account_number: fsAcctAccountNum,
                        bank_name: fsAcctBankName,
                    }),
                },
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.exception || json?.message || `HTTP ${res.status}`);

            await Promise.all([mutate(), mutateFsProjectReg()]);
            globalMutate(
                (key: any) => typeof key === 'string' && key.includes('workflow'),
                undefined,
                { revalidate: true },
            );
            alert('Account details saved successfully.');
        } catch (e: any) {
            alert('Failed to save account details: ' + (e?.message || 'Unknown error'));
        } finally {
            setIsSavingAcctDetails(false);
        }
    };

    // Redirect dedicated detail pages
    useEffect(() => {
        if (doctype === "Disbursal of Honorarium" && name) {
            navigate(`/disbursal-of-honorarium/${name}`, { replace: true });
        }
        if (doctype === "Disbursal of Consultancy" && name) {
            navigate(`/disbursal-of-consultancy/${name}`, { replace: true });
        }
        if (doctype === "Travel" && name) {
            navigate(`/travel/${name}`, { replace: true });
        }
        if (doctype === "Loan Request" && name) {
            navigate(`/loan-request/${name}`, { replace: true });
        }
        if (doctype === "Indent General Form" && name) {
            navigate(`/indent-general-form-details/${name}`, { replace: true });
        }
        if (doctype === "Indent Cum Sanction Sheet" && name) {
            navigate(`/indent-cum-sanction-sheet/${name}`, { replace: true });
        }
        if (doctype === "Selection Committee Report" && name) {
            navigate(`/selection-committee-report/${name}`, { replace: true });
        }
    }, [doctype, name]);

    // Additional state for Travel Dynamic Form
    const [travelFields, setTravelFields] = useState<FormField[]>([]);
    const [travelLinkOptions, setTravelLinkOptions] = useState<
        Record<string, LinkOption[]>
    >({});
    const [isTravelLoading, setIsTravelLoading] = useState(false);

    // State for Advance Settlement Fields
    const [advanceSettlementFields, setAdvanceSettlementFields] = useState<
        FormField[]
    >([]);
    const [advanceSettlementLinkOptions, setAdvanceSettlementLinkOptions] =
        useState<Record<string, LinkOption[]>>({});
    const [isAdvanceSettlementLoading, setIsAdvanceSettlementLoading] =
        useState(false);

    // State for Temporary Advance Fields
    const [temporaryAdvanceFields, setTemporaryAdvanceFields] = useState<
        FormField[]
    >([]);
    const [temporaryAdvanceLinkOptions, setTemporaryAdvanceLinkOptions] =
        useState<Record<string, LinkOption[]>>({});
    const [isTemporaryAdvanceLoading, setIsTemporaryAdvanceLoading] =
        useState(false);

    // State for TA DA Settlement Fields
    const [tadaFields, setTadaFields] = useState<FormField[]>([]);
    const [tadaLinkOptions, setTadaLinkOptions] = useState<
        Record<string, LinkOption[]>
    >({});
    const [isTadaLoading, setIsTadaLoading] = useState(false);

    // State for Recruitment Adhoc Contractual Fields
    const [recruitmentFields, setRecruitmentFields] = useState<FormField[]>([]);
    const [recruitmentLinkOptions, setRecruitmentLinkOptions] = useState<
        Record<string, LinkOption[]>
    >({});
    const [isRecruitmentLoading, setIsRecruitmentLoading] = useState(false);
    // Chairperson inline-edit state (DoRnD only)
    const [chairpersonEditMode, setChairpersonEditMode] = useState(false);
    const [editChairpersonEmail, setEditChairpersonEmail] = useState("");
    const [editChairpersonName, setEditChairpersonName] = useState("");
    const [isSavingChairperson, setIsSavingChairperson] = useState(false);

    // Project preview modal state
    const [prPreviewName, setPrPreviewName] = useState<string | null>(null);
    const [prPreviewLoading, setPrPreviewLoading] = useState(false);
    const [isActivityOpen, setIsActivityOpen] = useState(false);

    // Kafka Staging Commit Status Gate
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);

    // Top Up Fellowship → Students.dept_centre is a Link to Department_prornd.
    // Resolve IDs to dept_name so the table shows the readable name.
    const [topUpDeptNames, setTopUpDeptNames] = useState<Record<string, string>>({});
    const { call: fetchDeptNames } = useFrappePostCall<{ message: { name: string; dept_name: string }[] }>(
        "frappe.client.get_list",
    );
    useEffect(() => {
        if (doctype !== "Top Up Fellowship") return;
        const students = (data as any)?.students || [];
        const ids = Array.from(
            new Set(
                students
                    .map((s: any) => s?.dept_centre)
                    .filter((v: any) => typeof v === "string" && v.trim() && !(v in topUpDeptNames))
            )
        ) as string[];
        if (ids.length === 0) return;
        fetchDeptNames({
            doctype: "Department_prornd",
            filters: JSON.stringify([["name", "in", ids]]),
            fields: JSON.stringify(["name", "dept_name"]),
            limit_page_length: 0,
        })
            .then((res: any) => {
                const rows = res?.message || [];
                if (!rows.length) return;
                setTopUpDeptNames((prev) => {
                    const next = { ...prev };
                    for (const r of rows) next[r.name] = r.dept_name || r.name;
                    return next;
                });
            })
            .catch((err: any) => console.error("Failed to resolve dept_centre names:", err));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doctype, (data as any)?.students]);

    // Direct Purchase tab state — restore from sessionStorage after reload
    const [dpActiveTab, setDpActiveTab] = useState<DPTabId>(() => {
        if (name) {
            const saved = sessionStorage.getItem(
                `dp_tab_${name}`,
            ) as DPTabId | null;
            if (saved) {
                sessionStorage.removeItem(`dp_tab_${name}`);
                return saved;
            }
        }
        return "details";
    });

    const { call: fetchTravelFields } = useFrappePostCall<{
        message: { fields: FormField[]; link_options: any };
    }>(travelAPI.getFields);
    const { call: fetchAdvanceSettlementFields } = useFrappePostCall<{
        message: {
            fields: FormField[];
            link_options: any;
            child_table_meta?: any;
        };
    }>(advanceSettlementAPI.getFields);
    const { call: fetchTemporaryAdvanceFields } = useFrappePostCall<{
        message: { fields: FormField[]; link_options: any };
    }>(temporaryAdvanceAPI.getFields);
    const { call: fetchTadaFields } = useFrappePostCall<{
        message: {
            fields: FormField[];
            link_options: any;
            child_table_meta?: any;
        };
    }>(tadaAPI.getFields);
    const { call: fetchRecruitmentFields } = useFrappePostCall<{
        message: {
            fields: FormField[];
            link_options: any;
            child_table_meta?: any;
        };
    }>(recruitmentAdhocContractualAPI.getFields);
    const { call: updateChairpersonFields } = useFrappePostCall<{ message: any }>(
        "rndopsapp.rndopsapp.doctype.recruitment_adhoc_contractual.recruitment_adhoc_contractual.update_chairperson_fields",
    );
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>(
        "frappe.client.get_value",
    );
    // State for display data (to handle ID resolution)
    const [displayData, setDisplayData] = useState<Record<string, any>>({});

    // Update displayData when data changes
    useEffect(() => {
        if (data) {
            setDisplayData(data);
        }
    }, [data]);

    // Helper to resolve Linked fields to readable names
    const resolveLinkFields = async (
        fields: FormField[],
        currentData: Record<string, any>,
    ) => {
        const fieldsToResolve = fields.filter(
            (f) =>
                (f.fieldname === "applicant_department" ||
                    f.fieldname === "applicant_category" ||
                    f.fieldname.includes("department") ||
                    f.fieldname.includes("category")) &&
                f.fieldtype === "Link" &&
                f.options &&
                currentData[f.fieldname],
        );

        if (fieldsToResolve.length === 0) return;

        const updates: Record<string, any> = {};

        await Promise.all(
            fieldsToResolve.map(async (field) => {
                const value = currentData[field.fieldname];
                if (!value) return;

                try {
                    // Fetch the linked document
                    // We use a specific call or generic get_value if possible, but get_doc is safer without specific API
                    const response = await (window as any).frappe?.call({
                        method: "frappe.client.get",
                        args: {
                            doctype: field.options,
                            name: value,
                        },
                    });

                    if (response?.message) {
                        const doc = response.message;
                        // Try to find a readable field
                        // Common readable fields: title, department_name, employee_category_name, name (if not hash-like)
                        // We can also check if the doc has a 'meta' title_field, but we don't have that here.

                        let readable = value;
                        if (doc.title) readable = doc.title;
                        else if (doc.department_name)
                            readable = doc.department_name;
                        else if (doc.employee_category_name)
                            readable = doc.employee_category_name;
                        else if (doc.designation_name)
                            readable = doc.designation_name;
                        else if (doc.name && doc.name !== value)
                            readable = doc.name; // If name is different from ID (unlikely in Frappe unless custom)

                        // Special case for our known hashes
                        if (
                            field.options === "Department" &&
                            doc.department_name
                        )
                            readable = doc.department_name;
                        if (field.options === "Employee Category" && doc.name)
                            readable = doc.name; // Often Category name IS the ID if readable, but here it's a hash
                        // If Employee Category uses 'name' as human readable but we see a hash, then maybe the field is different.
                        // Let's look for any likely field.
                        if (readable === value) {
                            // Fallback: look for any string field that isn't the ID
                            const potential = Object.values(doc).find(
                                (v) =>
                                    typeof v === "string" &&
                                    v !== value &&
                                    (v as string).length > 2 &&
                                    (v as string).length < 50,
                            );
                            if (potential) readable = potential as string;
                        }

                        updates[field.fieldname] = readable;
                    }
                } catch (e) {
                    console.warn(
                        `Failed to resolve link for ${field.fieldname}`,
                        e,
                    );
                }
            }),
        );

        if (Object.keys(updates).length > 0) {
            setDisplayData((prev) => ({ ...prev, ...updates }));
        }
    };

    // Resolve IDs for Advance Settlement
    useEffect(() => {
        if (
            doctype === "Advance Settlement" &&
            advanceSettlementFields.length > 0 &&
            data
        ) {
            resolveLinkFields(advanceSettlementFields, data);
        }
    }, [advanceSettlementFields, data, doctype]);

    // Resolve IDs for Temporary Advance
    useEffect(() => {
        if (
            doctype === "Temporary Advance" &&
            temporaryAdvanceFields.length > 0 &&
            data
        ) {
            resolveLinkFields(temporaryAdvanceFields, data);
        }
    }, [temporaryAdvanceFields, data, doctype]);

    // Use displayData for rendering forms
    // const formDataToUse = displayData;

    useEffect(() => {
        if (doctype === "Travel" && name) {
            setIsTravelLoading(true);
            fetchTravelFields({ doc_name: name })
                .then((res) => {
                    if (res?.message) {
                        setTravelFields(res.message.fields || []);
                        setTravelLinkOptions(res.message.link_options || {});
                    }
                })
                .catch((err) =>
                    console.error("Error fetching travel fields", err),
                )
                .finally(() => setIsTravelLoading(false));
        }
    }, [doctype, name, fetchTravelFields]);

    // Fetch Advance Settlement Fields
    useEffect(() => {
        if (doctype === "Advance Settlement" && name) {
            setIsAdvanceSettlementLoading(true);
            fetchAdvanceSettlementFields({ doc_name: name })
                .then((res) => {
                    if (res?.message) {
                        // Handle child table meta if present
                        let fields = res.message.fields || [];
                        const childMeta = res.message.child_table_meta;

                        if (childMeta) {
                            fields = fields.map((field) => {
                                if (
                                    field.fieldtype === "Table" &&
                                    field.fieldname &&
                                    childMeta[field.fieldname]
                                ) {
                                    const childFields = childMeta[
                                        field.fieldname
                                    ].fields.map((cf: any) => ({
                                        ...cf,
                                        label: cf.label || cf.fieldname || "",
                                    }));
                                    return {
                                        ...field,
                                        child_fields: childFields,
                                    };
                                }
                                return field;
                            });
                        }

                        setAdvanceSettlementFields(fields);
                        setAdvanceSettlementLinkOptions(
                            res.message.link_options || {},
                        );
                    }
                })
                .catch((err) =>
                    console.error(
                        "Error fetching advance settlement fields",
                        err,
                    ),
                )
                .finally(() => setIsAdvanceSettlementLoading(false));
        }
    }, [doctype, name, fetchAdvanceSettlementFields]);

    // Fetch Temporary Advance Fields
    useEffect(() => {
        if (doctype === "Temporary Advance" && name) {
            setIsTemporaryAdvanceLoading(true);
            fetchTemporaryAdvanceFields({ doc_name: name })
                .then((res) => {
                    if (res?.message) {
                        setTemporaryAdvanceFields(res.message.fields || []);
                        setTemporaryAdvanceLinkOptions(
                            res.message.link_options || {},
                        );
                    }
                })
                .catch((err) =>
                    console.error(
                        "Error fetching temporary advance fields",
                        err,
                    ),
                )
                .finally(() => setIsTemporaryAdvanceLoading(false));
        }
    }, [doctype, name, fetchTemporaryAdvanceFields]);

    // Fetch TA DA Settlement Fields
    useEffect(() => {
        if (doctype === "TA DA Settlement" && name) {
            setIsTadaLoading(true);
            fetchTadaFields({ doc_name: name })
                .then((res) => {
                    if (res?.message) {
                        let fields = res.message.fields || [];
                        const childMeta = (res.message as any).child_table_meta;

                        if (childMeta) {
                            fields = fields.map((field) => {
                                if (
                                    field.fieldtype === "Table" &&
                                    field.fieldname &&
                                    childMeta[field.fieldname]
                                ) {
                                    const childFields = childMeta[
                                        field.fieldname
                                    ].fields.map((cf: any) => ({
                                        ...cf,
                                        label: cf.label || cf.fieldname || "",
                                    }));
                                    return {
                                        ...field,
                                        child_fields: childFields,
                                    };
                                }
                                return field;
                            });
                        }

                        setTadaFields(fields);
                        setTadaLinkOptions(res.message.link_options || {});
                    }
                })
                .catch((err) =>
                    console.error(
                        "Error fetching TA DA Settlement fields",
                        err,
                    ),
                )
                .finally(() => setIsTadaLoading(false));
        }
    }, [doctype, name, fetchTadaFields]);

    // Fetch Recruitment Adhoc Contractual Fields
    useEffect(() => {
        if (doctype === "Recruitment Adhoc Contractual" && name) {
            setIsRecruitmentLoading(true);
            fetchRecruitmentFields({ doc_name: name })
                .then((res) => {
                    if (res?.message) {
                        let fields = res.message.fields || [];
                        const childMeta = (res.message as any).child_table_meta;

                        if (childMeta) {
                            fields = fields.map((field) => {
                                if (
                                    field.fieldtype === "Table" &&
                                    field.fieldname &&
                                    childMeta[field.fieldname]
                                ) {
                                    const childFields = childMeta[
                                        field.fieldname
                                    ].fields.map((cf: any) => ({
                                        ...cf,
                                        label: cf.label || cf.fieldname || "",
                                    }));
                                    return {
                                        ...field,
                                        child_fields: childFields,
                                    };
                                }
                                return field;
                            });
                        }

                        setRecruitmentFields(fields);
                        setRecruitmentLinkOptions(
                            res.message.link_options || {},
                        );
                    }
                })
                .catch((err) =>
                    console.error(
                        "Error fetching Recruitment Adhoc Contractual fields",
                        err,
                    ),
                )
                .finally(() => setIsRecruitmentLoading(false));
        }
    }, [doctype, name, fetchRecruitmentFields]);

    if (doctype === "Project Registration") {
        return (
            <ProjectDetailsView
                projectName={name}
                backUrl="/pending-task"
                backLabel="Back to Pending Tasks"
            />
        );
    }

    if (isLoading) {
        return <GlobalLoader isLoading delay={0} />;
    }

    if (doctype === "Temporary Advance") {
        return (
            <TemporaryAdvanceDetailsView
                docName={name}
                backUrl="/pending-task"
                backLabel="Back to Pending Tasks"
            />
        );
    }

    if (error || !data) {
        return (
            <div className="flex h-screen items-center justify-center bg-claude-bg dark:bg-zinc-900">
                <div className="text-zinc-600 dark:text-zinc-400 font-medium text-xl">
                    Task not found
                </div>
            </div>
        );
    }

    // Default Render Logic (for non-Travel or fallback)
    const renderGenericDetails = () => {
        const simpleFields = Object.entries(data).filter(([key, value]) => {
            if (HIDDEN_FIELDS.includes(key)) return false;
            return (
                !Array.isArray(value) &&
                (typeof value !== "object" || value === null) &&
                !key.startsWith("_") &&
                key !== "docstatus" &&
                key !== "idx" &&
                key !== "creation" &&
                key !== "modified" &&
                key !== "owner" &&
                key !== "name" &&
                key !== "doctype"
            );
        });

        const tableFields = Object.entries(data).filter(([key, value]) => {
            return Array.isArray(value) && !key.startsWith("_");
        });

        return (
            <div className="space-y-6">
                <div className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm p-6 lg:p-8">
                    <h2 className="text-lg font-serif font-semibold text-zinc-900 dark:text-zinc-100 mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-700">
                        Overview
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-6">
                        {simpleFields.map(([key, value]) => {
                            const isFile = isFilePath(String(value));
                            const displayValue = isFile
                                ? getFileName(String(value))
                                : String(value);

                            return (
                                <div key={key} className="flex flex-col">
                                    <span className={labelClasses}>
                                        {key
                                            .replace(/_/g, " ")
                                            .replace(/\b\w/g, (l) =>
                                                l.toUpperCase(),
                                            )}
                                    </span>

                                    {isFile ? (
                                        <a
                                            href={String(value)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group flex items-center gap-2 mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-700/50 text-[#D97757] rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium border border-zinc-200 dark:border-zinc-700"
                                        >
                                            <FileIcon className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate text-sm">
                                                {displayValue}
                                            </span>
                                            <ExternalLinkIcon className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    ) : (
                                        <div className={valueClasses}>
                                            {value === null ||
                                                value === undefined ? (
                                                <span className="text-zinc-400 dark:text-zinc-600">
                                                    -
                                                </span>
                                            ) : (
                                                displayValue
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {tableFields.map(([key, value]) => {
                    const rows = value as any[];
                    if (rows.length === 0) return null;

                    const isBudgetTable =
                        key.toLowerCase().includes("budget") ||
                        key.toLowerCase().includes("breakup");
                    const budgetYearColumns = [
                        "first_year_budget",
                        "second_year_budget",
                        "third_year_budget",
                        "fourth_year_budget",
                        "fifth_year_budget",
                    ];
                    const hiddenTableColumns = [
                        "is_total_row",
                        "doctype",
                        "total_proposal_of_heads",
                    ];
                    const headers = Object.keys(rows[0]).filter(
                        (k) =>
                            !k.startsWith("_") &&
                            k !== "name" &&
                            k !== "owner" &&
                            k !== "creation" &&
                            k !== "modified" &&
                            k !== "modified_by" &&
                            k !== "docstatus" &&
                            k !== "idx" &&
                            k !== "parent" &&
                            k !== "parentfield" &&
                            k !== "parenttype" &&
                            !hiddenTableColumns.includes(k.toLowerCase()),
                    );

                    const getRowTotal = (row: any) =>
                        budgetYearColumns.reduce(
                            (sum, col) => sum + (parseFloat(row[col]) || 0),
                            0,
                        );
                    const columnTotals: Record<string, number> = {};
                    if (isBudgetTable) {
                        budgetYearColumns.forEach((col) => {
                            columnTotals[col] = rows.reduce(
                                (sum, row) => sum + (parseFloat(row[col]) || 0),
                                0,
                            );
                        });
                    }
                    const grandTotal = Object.values(columnTotals).reduce(
                        (sum, val) => sum + val,
                        0,
                    );

                    return (
                        <div
                            key={key}
                            className="bg-white dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden"
                        >
                            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/80">
                                <h3 className="text-base font-serif font-semibold text-zinc-900 dark:text-zinc-100">
                                    {key
                                        .replace(/_/g, " ")
                                        .replace(/\b\w/g, (l) =>
                                            l.toUpperCase(),
                                        )}
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-zinc-200 dark:border-zinc-700">
                                            {headers.map((header) => (
                                                <th
                                                    key={header}
                                                    className="p-4 text-left font-semibold text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider"
                                                >
                                                    {header
                                                        .replace(/_/g, " ")
                                                        .replace(/\b\w/g, (l) =>
                                                            l.toUpperCase(),
                                                        )}
                                                </th>
                                            ))}
                                            {isBudgetTable && (
                                                <th className="p-4 text-left font-semibold text-zinc-500 dark:text-zinc-400 text-xs uppercase tracking-wider bg-orange-50/50 dark:bg-orange-500/10 text-[#D97757]">
                                                    Row Total
                                                </th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/50 text-sm">
                                        {rows.map((row, idx) => (
                                            <tr
                                                key={idx}
                                                className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                                            >
                                                {headers.map((header) => (
                                                    <td
                                                        key={header}
                                                        className="p-4 align-middle text-zinc-700 dark:text-zinc-300"
                                                    >
                                                        {budgetYearColumns.includes(
                                                            header,
                                                        )
                                                            ? (
                                                                parseFloat(
                                                                    row[
                                                                    header
                                                                    ],
                                                                ) || 0
                                                            ).toLocaleString(
                                                                "en-IN",
                                                                {
                                                                    style: "currency",
                                                                    currency:
                                                                        "INR",
                                                                    maximumFractionDigits: 0,
                                                                },
                                                            )
                                                            : (() => {
                                                                let v = row[header];
                                                                if (
                                                                    doctype === "Top Up Fellowship" &&
                                                                    key === "students" &&
                                                                    header === "dept_centre" &&
                                                                    typeof v === "string" &&
                                                                    topUpDeptNames[v]
                                                                ) {
                                                                    v = topUpDeptNames[v];
                                                                }
                                                                return String(v || "-");
                                                            })()}
                                                    </td>
                                                ))}
                                                {isBudgetTable && (
                                                    <td className="p-4 align-middle font-medium text-[#D97757] bg-orange-50/30 dark:bg-orange-500/5">
                                                        {getRowTotal(
                                                            row,
                                                        ).toLocaleString(
                                                            "en-IN",
                                                            {
                                                                style: "currency",
                                                                currency: "INR",
                                                                maximumFractionDigits: 0,
                                                            },
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                        {isBudgetTable && (
                                            <tr className="bg-zinc-50 dark:bg-zinc-700/50 font-medium">
                                                {headers.map((header) => (
                                                    <td
                                                        key={header}
                                                        className="p-4 align-middle text-zinc-900 dark:text-zinc-100"
                                                    >
                                                        {header ===
                                                            "account_head"
                                                            ? "Total"
                                                            : budgetYearColumns.includes(
                                                                header,
                                                            )
                                                                ? (
                                                                    columnTotals[
                                                                    header
                                                                    ] || 0
                                                                ).toLocaleString(
                                                                    "en-IN",
                                                                    {
                                                                        style: "currency",
                                                                        currency:
                                                                            "INR",
                                                                        maximumFractionDigits: 0,
                                                                    },
                                                                )
                                                                : ""}
                                                    </td>
                                                ))}
                                                <td className="p-4 align-middle font-bold text-white bg-[#D97757]">
                                                    {grandTotal.toLocaleString(
                                                        "en-IN",
                                                        {
                                                            style: "currency",
                                                            currency: "INR",
                                                            maximumFractionDigits: 0,
                                                        },
                                                    )}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen text-zinc-900 dark:text-zinc-100">
            {/* <AppSidebar /> */}

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-6 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:bg-zinc-800 transition-colors"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                            </button>
                            <div>
                                {/*<h1 className="text-2xl md:text-3xl font-serif text-zinc-900 dark:text-zinc-50 tracking-tight">Task Details</h1>*/}
                                <h1 className="text-sm md:text-base text-zinc-500 dark:text-zinc-400 mt-1">
                                    {doctype} ·{" "}
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 dark:bg-zinc-800 text-[#D97757] dark:text-[#E28362] ml-1">
                                        {name}
                                    </span>
                                </h1>
                                {data?.workflow_state && (
                                    <span className={cn(
                                        "mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                                        data.workflow_state === "Approved"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                                            : data.workflow_state === "Draft"
                                                ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                                                : data.workflow_state === "Rejected"
                                                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800/50"
                                                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50",
                                    )}>
                                        {data.workflow_state}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap items-center">
                            {/* View linked Project Registration */}
                            {doctype !== "Project Registration" && data && (
                                <button
                                    onClick={async () => {
                                        const directName = extractPRName(doctype, data);
                                        if (directName) {
                                            setPrPreviewName(directName);
                                            return;
                                        }
                                        // Fallback: lookup PR by project_no stored in the record
                                        const mapping = DOCTYPE_PR_LINKS[doctype];
                                        const noField = mapping?.primary?.type === 'pr_project_no'
                                            ? mapping.primary.field
                                            : mapping?.fallback?.type === 'pr_project_no'
                                                ? (mapping.fallback as any).field
                                                : null;
                                        const projectNo = noField ? data[noField] : null;
                                        if (!projectNo) return;
                                        setPrPreviewLoading(true);
                                        try {
                                            const params = new URLSearchParams({
                                                filters: JSON.stringify([['project_no', '=', projectNo]]),
                                                fields: JSON.stringify(['name']),
                                                limit: '1',
                                            });
                                            const res = await fetch(`/api/resource/Project%20Registration?${params}`, { credentials: 'include' }).then(r => r.json());
                                            const prName = (res?.data ?? res?.message ?? [])[0]?.name;
                                            if (prName) setPrPreviewName(prName);
                                        } finally {
                                            setPrPreviewLoading(false);
                                        }
                                    }}
                                    disabled={prPreviewLoading}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 h-fit rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-[#D97757] hover:text-[#D97757] transition-colors disabled:opacity-60"
                                >
                                    <FolderOpenIcon className="w-3.5 h-3.5" />
                                    {prPreviewLoading ? 'Loading…' : 'View Project'}
                                </button>
                            )}
                            {doctype === "Reimbursement" && name && (
                                <ReimbursementWorkflowActions
                                    docname={name}
                                    onActionComplete={() =>
                                        window.location.reload()
                                    }
                                />
                            )}
                            {doctype === "Fund Sanction" && name && (
                                <FundSanctionWorkflowActions
                                    docname={name}
                                    onActionComplete={() =>
                                        window.location.reload()
                                    }
                                    blockForward={isRnDStaff && !(data?.is_the_account_type_pfms || fsProjectRegData?.is_the_account_type_pfms)}
                                />
                            )}
                            {doctype === "Travel" && name && (
                                <TravelWorkflowActions
                                    docname={name}
                                    onActionComplete={() =>
                                        window.location.reload()
                                    }
                                />
                            )}
                            {doctype === "Temporary Advance" && name && (
                                <TemporaryAdvanceActionButtons
                                    docname={name}
                                    onActionComplete={() =>
                                        window.location.reload()
                                    }
                                />
                            )}
                            {doctype === "Direct Purchase" && name && (
                                <DirectPurchaseWorkflowActions
                                    docname={name}
                                    onActionComplete={() => { }}
                                    onAfterAction={(action) => {
                                        if (
                                            action
                                                .toLowerCase()
                                                .includes("verify")
                                        ) {
                                            setDpActiveTab("sanction");
                                        }
                                        refreshAll();
                                    }}
                                />
                            )}
                            {doctype === "TA DA Settlement" && name && (
                                <TADASettlementActionButtons
                                    docName={name}
                                    onActionComplete={() =>
                                        window.location.reload()
                                    }
                                />
                            )}
                            {doctype === "Recruitment Adhoc Contractual" &&
                                name && (
                                    <RecruitmentAdhocContractualWorkflowActions
                                        docname={name}
                                        onActionComplete={() =>
                                            window.location.reload()
                                        }
                                        commitRequired={isRnDStaff && isCommittedForGate === false}
                                    />
                                )}
                            {doctype === "Top Up Fellowship" && name && (
                                <TopUpFellowshipWorkflowActions
                                    docname={name}
                                    onActionComplete={() =>
                                        window.location.reload()
                                    }
                                    commitRequired={isRnDStaff && isCommittedForGate === false}
                                />
                            )}
                            {/* {doctype === "Cancellation Request" && name && (
                                <CancellationRequestWorkflowActions
                                    docname={name}
                                    onActionComplete={() => window.location.reload()}
                                />
                            )} */}
                        </div>
                    </div>
                </header>

                {/* Content Grid with Sidebar */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Left Column: Main Detail View */}
                    <div className="lg:col-span-3 space-y-6">
                        {doctype === "Travel" ? (
                            isTravelLoading ? (
                                <div className="flex h-64 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757]"></div>
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                                            Loading details...
                                        </p>
                                    </div>
                                </div>
                            ) : travelFields.length > 0 ? (
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                                    <DynamicFormRenderer
                                        fields={travelFields}
                                        formData={data}
                                        linkOptions={travelLinkOptions}
                                        onChange={() => { }}
                                        onFileChange={() => { }}
                                        onTableRowChange={() => { }}
                                        onTableFileChange={() => { }}
                                        onAddTableRow={() => { }}
                                        onDeleteTableRow={() => { }}
                                        readOnly={true}
                                    />
                                </div>
                            ) : (
                                renderGenericDetails()
                            )
                        ) : doctype === "Advance Settlement" ? (
                            isAdvanceSettlementLoading ? (
                                <div className="flex h-64 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757]"></div>
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                                            Loading details...
                                        </p>
                                    </div>
                                </div>
                            ) : advanceSettlementFields.length > 0 ? (
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                                    <DynamicFormRenderer
                                        fields={advanceSettlementFields}
                                        formData={displayData}
                                        linkOptions={
                                            advanceSettlementLinkOptions
                                        }
                                        onChange={() => { }}
                                        onFileChange={() => { }}
                                        onTableRowChange={() => { }}
                                        onTableFileChange={() => { }}
                                        onAddTableRow={() => { }}
                                        onDeleteTableRow={() => { }}
                                        readOnly={true}
                                    />
                                </div>
                            ) : (
                                renderGenericDetails()
                            )
                        ) : doctype === "Temporary Advance" ? (
                            isTemporaryAdvanceLoading ? (
                                <div className="flex h-64 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757]"></div>
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                                            Loading details...
                                        </p>
                                    </div>
                                </div>
                            ) : temporaryAdvanceFields.length > 0 ? (
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                                    <DynamicFormRenderer
                                        fields={temporaryAdvanceFields}
                                        formData={displayData}
                                        linkOptions={
                                            temporaryAdvanceLinkOptions
                                        }
                                        onChange={() => { }}
                                        onFileChange={() => { }}
                                        onTableRowChange={() => { }}
                                        onTableFileChange={() => { }}
                                        onAddTableRow={() => { }}
                                        onDeleteTableRow={() => { }}
                                        readOnly={true}
                                    />
                                </div>
                            ) : (
                                renderGenericDetails()
                            )
                        ) : doctype === "TA DA Settlement" ? (
                            isTadaLoading ? (
                                <div className="flex h-64 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757]"></div>
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                                            Loading details...
                                        </p>
                                    </div>
                                </div>
                            ) : tadaFields.length > 0 ? (
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                                    <DynamicFormRenderer
                                        fields={tadaFields}
                                        formData={displayData}
                                        linkOptions={tadaLinkOptions}
                                        onChange={() => { }}
                                        onFileChange={() => { }}
                                        onTableRowChange={() => { }}
                                        onTableFileChange={() => { }}
                                        onAddTableRow={() => { }}
                                        onDeleteTableRow={() => { }}
                                        readOnly={true}
                                    />
                                </div>
                            ) : (
                                renderGenericDetails()
                            )
                        ) : doctype === "Recruitment Adhoc Contractual" ? (
                            isRecruitmentLoading ? (
                                <div className="flex h-64 items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757]"></div>
                                        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
                                            Loading details...
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* DoRnD: Inline chairperson editor */}
                                    {isDoRnd && name && (
                                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                                                    Chairperson Fields
                                                </h3>
                                                {!chairpersonEditMode && (
                                                    <button
                                                        onClick={() => {
                                                            setEditChairpersonEmail(displayData.chairperson_webmail_id || "");
                                                            setEditChairpersonName(displayData.chairperson_name || "");
                                                            setChairpersonEditMode(true);
                                                        }}
                                                        className="flex items-center gap-1.5 text-xs font-medium text-[#D97757] hover:text-[#c66a4e] transition-colors"
                                                    >
                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                        Edit
                                                    </button>
                                                )}
                                            </div>

                                            {chairpersonEditMode ? (
                                                <div className="space-y-3">
                                                    <div>
                                                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                                            Chairperson Webmail ID
                                                        </label>
                                                        <AutocompleteEmail
                                                            options={
                                                                recruitmentLinkOptions["chairperson_webmail_id"] ||
                                                                recruitmentLinkOptions["User"] ||
                                                                recruitmentLinkOptions["webmail_id"] ||
                                                                []
                                                            }
                                                            value={editChairpersonEmail}
                                                            onChange={(val) => {
                                                                setEditChairpersonEmail(val);
                                                                // Auto-fill name from matched option label
                                                                const opts =
                                                                    recruitmentLinkOptions["chairperson_webmail_id"] ||
                                                                    recruitmentLinkOptions["User"] ||
                                                                    recruitmentLinkOptions["webmail_id"] ||
                                                                    [];
                                                                const match = opts.find((o) => o.value === val);
                                                                if (match?.label) {
                                                                    setEditChairpersonName(match.label);
                                                                } else {
                                                                    // Fallback: fetch full_name from backend
                                                                    fetchFrappeValue({
                                                                        doctype: "User",
                                                                        filters: { name: val },
                                                                        fieldname: "full_name",
                                                                    })
                                                                        .then((res) => {
                                                                            if (res?.message?.full_name) {
                                                                                setEditChairpersonName(res.message.full_name);
                                                                            }
                                                                        })
                                                                        .catch(() => { });
                                                                }
                                                            }}
                                                            placeholder="Search by name or email..."
                                                            showAllOnFocus
                                                            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                                            Chairperson Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                                                            value={editChairpersonName}
                                                            readOnly
                                                        />
                                                    </div>
                                                    <div className="flex gap-2 pt-1">
                                                        <button
                                                            onClick={async () => {
                                                                setIsSavingChairperson(true);
                                                                try {
                                                                    const res = await updateChairpersonFields({
                                                                        docname: name,
                                                                        chairperson_webmail_id: editChairpersonEmail,
                                                                        chairperson_name: editChairpersonName,
                                                                    });
                                                                    if (res?.message?.status === "success") {
                                                                        setDisplayData((prev: any) => ({
                                                                            ...prev,
                                                                            chairperson_webmail_id: editChairpersonEmail,
                                                                            chairperson_name: editChairpersonName,
                                                                        }));
                                                                        setChairpersonEditMode(false);
                                                                    } else {
                                                                        alert(res?.message?.message || "Failed to update chairperson fields.");
                                                                    }
                                                                } catch (err: any) {
                                                                    alert(err?.message || "An error occurred.");
                                                                } finally {
                                                                    setIsSavingChairperson(false);
                                                                }
                                                            }}
                                                            disabled={isSavingChairperson}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#D97757] hover:bg-[#c66a4e] text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-60"
                                                        >
                                                            <SaveIcon className="w-3.5 h-3.5" />
                                                            {isSavingChairperson ? "Saving..." : "Save"}
                                                        </button>
                                                        <button
                                                            onClick={() => setChairpersonEditMode(false)}
                                                            disabled={isSavingChairperson}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-medium rounded-lg transition-colors"
                                                        >
                                                            <XIcon className="w-3.5 h-3.5" />
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <span className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                                            Chairperson Webmail ID
                                                        </span>
                                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                            {displayData.chairperson_webmail_id || <span className="text-zinc-400">—</span>}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                                                            Chairperson Name
                                                        </span>
                                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                                            {displayData.chairperson_name || <span className="text-zinc-400">—</span>}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {recruitmentFields.length > 0 ? (
                                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                                            <DynamicFormRenderer
                                                fields={recruitmentFields}
                                                formData={displayData}
                                                linkOptions={recruitmentLinkOptions}
                                                onChange={() => { }}
                                                onFileChange={() => { }}
                                                onTableRowChange={() => { }}
                                                onTableFileChange={() => { }}
                                                onAddTableRow={() => { }}
                                                onDeleteTableRow={() => { }}
                                                readOnly={true}
                                            />
                                        </div>
                                    ) : (
                                        renderGenericDetails()
                                    )}
                                </div>
                            )
                        ) : doctype === "Direct Purchase" && data && name ? (
                            <DirectPurchaseTabView
                                data={data}
                                docName={name}
                                activeTab={dpActiveTab}
                                setActiveTab={setDpActiveTab}
                            />
                        ) : doctype === "Fund Sanction" && data ? (
                            <div className="space-y-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5">
                                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Total Sanctioned</p>
                                        <p className="text-2xl font-bold text-[#D97757]">
                                            {(data.total_sanctioned_amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5">
                                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Letter No</p>
                                        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{data.sanctioned_letter_no || '—'}</p>
                                    </div>
                                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5">
                                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Letter Date</p>
                                        <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{data.sanctioned_letter_date || '—'}</p>
                                    </div>
                                </div>

                                {/* Core Details */}
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">
                                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Sanction Details</h3>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                                        {[
                                            { label: "Project", value: data.project_proposal || data.refnum_prj_num },
                                            { label: "Project No", value: fsProjectRegData?.project_no },
                                            { label: "Project Title", value: data.project_title || fsProjectRegData?.project_title },
                                            { label: "Funding Agency", value: data.funding_agency },
                                            { label: "Sanctioned Date", value: data.date_of_sanction || data.sanctioned_letter_date },
                                            { label: "Sanction Order No", value: data.sanction_order_no || data.sanctioned_letter_no },
                                            { label: "Duration (Months)", value: data.duration_of_project },
                                            { label: "Start Date", value: data.start_date },
                                            { label: "End Date", value: data.end_date },
                                            { label: "Principal Investigator", value: data.principal_investigator || data.pi_name },
                                            { label: "Department", value: data.department },
                                            { label: "Remarks", value: data.remarks },
                                        ].filter(f => f.value != null && f.value !== "").map(({ label, value }) => (
                                            <div key={label} className="flex flex-col">
                                                <span className={labelClasses}>{label}</span>
                                                <span className={valueClasses}>{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Budget Breakup Table */}
                                {data.sanctioned_budget_breakup?.length > 0 && (
                                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                                        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">
                                            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Sanctioned Budget Breakup</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-zinc-100 dark:divide-zinc-800">
                                                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                                    <tr>
                                                        <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Account Head</th>
                                                        <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Year 1</th>
                                                        <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Year 2</th>
                                                        <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Year 3</th>
                                                        <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Year 4</th>
                                                        <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Year 5</th>
                                                        <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                                    {data.sanctioned_budget_breakup.map((row: any, idx: number) => {
                                                        const rowTotal = ['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget']
                                                            .reduce((s, k) => s + (parseFloat(row[k]) || 0), 0);
                                                        return (
                                                            <tr key={idx} className={cn("hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors", row.is_total_row ? "bg-zinc-50 dark:bg-zinc-800/40 font-semibold" : "")}>
                                                                <td className="px-5 py-3 text-sm text-zinc-900 dark:text-zinc-100">{row.account_head}</td>
                                                                {['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'].map(k => (
                                                                    <td key={k} className="px-5 py-3 text-sm text-right tabular-nums text-zinc-600 dark:text-zinc-300">
                                                                        {parseFloat(row[k]) ? Number(row[k]).toLocaleString('en-IN') : '—'}
                                                                    </td>
                                                                ))}
                                                                <td className="px-5 py-3 text-sm text-right tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                                                                    {rowTotal ? rowTotal.toLocaleString('en-IN') : '—'}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                {/* Grand total footer */}
                                                {(() => {
                                                    const years = ['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'];
                                                    const colTotals = years.map(k => data.sanctioned_budget_breakup.reduce((s: number, r: any) => s + (parseFloat(r[k]) || 0), 0));
                                                    const grand = colTotals.reduce((a: number, b: number) => a + b, 0);
                                                    return (
                                                        <tfoot>
                                                            <tr className="bg-[#D97757] text-white">
                                                                <td className="px-5 py-3 text-sm font-bold">Grand Total</td>
                                                                {colTotals.map((t: number, i: number) => (
                                                                    <td key={i} className="px-5 py-3 text-sm font-bold text-right tabular-nums">
                                                                        {t ? t.toLocaleString('en-IN') : '—'}
                                                                    </td>
                                                                ))}
                                                                <td className="px-5 py-3 text-sm font-bold text-right tabular-nums">{grand.toLocaleString('en-IN')}</td>
                                                            </tr>
                                                        </tfoot>
                                                    );
                                                })()}
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Attached Sanction Letter */}
                                {data.sanction_letter && (
                                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-5">
                                        <p className={labelClasses}>Sanction Letter</p>
                                        <a
                                            href={data.sanction_letter}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 mt-2 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium text-[#D97757] hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                        >
                                            <FileIcon className="h-4 w-4" />
                                            {data.sanction_letter.split('/').pop() || 'View Document'}
                                            <ExternalLinkIcon className="h-3.5 w-3.5 ml-1 opacity-60" />
                                        </a>
                                    </div>
                                )}

                                {/* Account Details — editable form for staff; read-only display for others */}
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">
                                        <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide">Account Details</h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {isRnDStaff ? (
                                            <>
                                                <div className="space-y-1.5">
                                                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                                        Is Account Type PFMS?
                                                    </label>
                                                    <select
                                                        className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[13px] font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757]"
                                                        value={fsAcctPfms}
                                                        onChange={e => setFsAcctPfms(e.target.value)}
                                                    >
                                                        <option value="">Select...</option>
                                                        <option value="Yes">Yes</option>
                                                        <option value="No">No</option>
                                                    </select>
                                                </div>
                                                {fsAcctPfms === 'Yes' && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Scheme Name</label>
                                                            <input type="text" className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[13px] font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757]" value={fsAcctSchemeName} onChange={e => setFsAcctSchemeName(e.target.value)} />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Scheme Number</label>
                                                            <input type="text" className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[13px] font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757]" value={fsAcctSchemeNum} onChange={e => setFsAcctSchemeNum(e.target.value)} />
                                                        </div>
                                                    </div>
                                                )}
                                                {fsAcctPfms === 'No' && (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Account Number</label>
                                                            <input type="text" className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[13px] font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757]" value={fsAcctAccountNum} onChange={e => setFsAcctAccountNum(e.target.value)} />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Bank Name</label>
                                                            <input type="text" className="w-full h-10 px-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-[13px] font-medium text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757]" value={fsAcctBankName} onChange={e => setFsAcctBankName(e.target.value)} />
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex justify-end pt-1">
                                                    <button
                                                        type="button"
                                                        onClick={handleSaveFsAcctDetails}
                                                        disabled={isSavingAcctDetails || !fsAcctPfms}
                                                        className="h-9 px-5 bg-[#D97757] hover:bg-[#c5684a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[12px] uppercase tracking-wide rounded-lg transition-colors"
                                                    >
                                                        {isSavingAcctDetails ? 'Saving...' : 'Save Account Details'}
                                                    </button>
                                                </div>
                                            </>
                                        ) : (
                                            fsAcctPfms ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                                                    {[
                                                        { label: "Account Type PFMS", value: fsAcctPfms },
                                                        ...(fsAcctPfms === "Yes"
                                                            ? [
                                                                { label: "Scheme Name", value: fsAcctSchemeName },
                                                                { label: "Scheme Number", value: fsAcctSchemeNum },
                                                            ]
                                                            : [
                                                                { label: "Account Number", value: fsAcctAccountNum },
                                                                { label: "Bank Name", value: fsAcctBankName },
                                                            ]),
                                                    ].filter(f => f.value).map(({ label, value }) => (
                                                        <div key={label} className="flex flex-col">
                                                            <span className={labelClasses}>{label}</span>
                                                            <span className={valueClasses}>{value}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-[12px] text-zinc-400 dark:text-zinc-500">No account details available.</p>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : doctype === "Cancellation Request" && data ? (
                            <div className="space-y-5">
                                {/* Reference Document Banner */}
                                <div className="relative overflow-hidden rounded-xl border border-amber-200 dark:border-amber-800/40 bg-gradient-to-br from-amber-50 via-orange-50/60 to-amber-50/30 dark:from-amber-900/10 dark:via-orange-900/5 dark:to-zinc-900/0 p-5 sm:p-6">
                                    <div className="absolute top-0 right-0 w-56 h-56 bg-amber-100/40 dark:bg-amber-800/10 rounded-full -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                                    <div className="relative flex items-start gap-4">
                                        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/30 border border-amber-200/70 dark:border-amber-700/40 flex items-center justify-center shadow-sm">
                                            <XCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-[0.16em] mb-1.5">
                                                Cancellation Request
                                            </p>
                                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 leading-snug">
                                                Requesting cancellation of{" "}
                                                <span className="text-[#D97757]">
                                                    {data.reference_doctype || data.doctype_name || "document"}
                                                </span>
                                            </p>
                                            {(data.reference_document || data.original_document) && (
                                                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg bg-white/80 dark:bg-zinc-900/60 border border-amber-200/60 dark:border-amber-800/30">
                                                    <span className="font-mono text-xs text-[#D97757] font-semibold tracking-tight">
                                                        {data.reference_document || data.original_document}
                                                    </span>
                                                    {data.reference_doctype && (
                                                        <button
                                                            onClick={() => navigate(`/pending-tasks/${encodeURIComponent(data.reference_doctype)}/${data.reference_document || data.original_document}`)}
                                                            className="p-0.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                                                            title="View original document"
                                                        >
                                                            <ExternalLinkIcon className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {data.total_amount != null && Number(data.total_amount) > 0 && (
                                            <div className="flex-shrink-0 text-right">
                                                <p className="text-[10px] font-semibold text-amber-500 dark:text-amber-400 uppercase tracking-wider mb-0.5">Amount</p>
                                                <p className="text-xl font-bold text-amber-800 dark:text-amber-200 tabular-nums">
                                                    {Number(data.total_amount).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Reason for Cancellation */}
                                {(data.reason || data.cancellation_reason || data.remarks) && (
                                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm p-6">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="w-1 h-4 rounded-full bg-[#D97757]" />
                                            <h3 className="text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">
                                                Reason for Cancellation
                                            </h3>
                                        </div>
                                        <p className="text-[13.5px] text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap bg-zinc-50 dark:bg-zinc-800/50 rounded-lg px-4 py-3 border border-zinc-100 dark:border-zinc-700/60">
                                            {data.reason || data.cancellation_reason || data.remarks}
                                        </p>
                                    </div>
                                )}

                                {/* Request Details */}
                                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                                    <div className="px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">
                                        <h3 className="text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">
                                            Request Details
                                        </h3>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                                        {[
                                            { label: "Applicant", value: data.applicant_name || data.applicant },
                                            { label: "Department", value: data.department || data.applicant_department },
                                            { label: "Project", value: data.project_no || data.project_name || data.project_code },
                                            { label: "Submitted On", value: data.creation ? new Date(data.creation).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : null },
                                            { label: "Last Updated", value: data.modified ? new Date(data.modified).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" }) : null },
                                            { label: "Submitted By", value: data.owner },
                                        ].filter((f) => f.value != null && f.value !== "").map(({ label, value }) => (
                                            <div key={label} className="flex flex-col gap-1">
                                                <span className={labelClasses}>{label}</span>
                                                <span className={valueClasses}>{String(value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Additional scalar fields not already shown */}
                                {(() => {
                                    const shown = new Set([
                                        "name", "doctype", "docstatus", "idx", "owner", "creation", "modified", "modified_by",
                                        "_user_tags", "_comments", "_assign", "_liked_by", "_seen", "workflow_state",
                                        "reference_doctype", "reference_document", "original_document", "doctype_name",
                                        "reason", "cancellation_reason", "remarks",
                                        "applicant_name", "applicant", "department", "applicant_department",
                                        "project_no", "project_name", "project_code",
                                        "total_amount", "amount",
                                        ...HIDDEN_FIELDS,
                                    ]);
                                    const extras = Object.entries(data).filter(
                                        ([key, value]) =>
                                            !shown.has(key) &&
                                            !key.startsWith("_") &&
                                            !Array.isArray(value) &&
                                            value !== null &&
                                            value !== undefined &&
                                            value !== "",
                                    );
                                    if (extras.length === 0) return null;
                                    return (
                                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                                            <div className="px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">
                                                <h3 className="text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">
                                                    Additional Information
                                                </h3>
                                            </div>
                                            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-6">
                                                {extras.map(([key, value]) => {
                                                    const isFile = isFilePath(String(value));
                                                    return (
                                                        <div key={key} className="flex flex-col gap-1">
                                                            <span className={labelClasses}>
                                                                {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                                            </span>
                                                            {isFile ? (
                                                                <a
                                                                    href={String(value)}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="group flex items-center gap-2 mt-1 px-3 py-2 bg-zinc-50 dark:bg-zinc-700/50 text-[#D97757] rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors font-medium border border-zinc-200 dark:border-zinc-700"
                                                                >
                                                                    <FileIcon className="h-4 w-4 flex-shrink-0" />
                                                                    <span className="truncate text-sm">{getFileName(String(value))}</span>
                                                                    <ExternalLinkIcon className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                </a>
                                                            ) : (
                                                                <span className={valueClasses}>{String(value)}</span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Child tables */}
                                {Object.entries(data)
                                    .filter(([key, value]) => Array.isArray(value) && (value as any[]).length > 0 && !key.startsWith("_"))
                                    .map(([key, rows]) => {
                                        const cols = Object.keys((rows as any[])[0] || {}).filter(
                                            (k) => !k.startsWith("_") && !DP_EXCLUDED.includes(k),
                                        );
                                        return (
                                            <div key={key} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
                                                <div className="px-6 py-3.5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-800/30">
                                                    <h3 className="text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 uppercase tracking-widest">
                                                        {key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                                    </h3>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50">
                                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 w-10">#</th>
                                                                {cols.map((col) => (
                                                                    <th key={col} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                                                        {col.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                            {(rows as any[]).map((row, idx) => (
                                                                <tr key={idx} className={cn("hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors", idx % 2 === 1 && "bg-zinc-50/40 dark:bg-zinc-800/10")}>
                                                                    <td className="px-4 py-3 text-xs text-zinc-400 font-mono">{idx + 1}</td>
                                                                    {cols.map((k) => (
                                                                        <td key={k} className="px-4 py-3 text-[13px] text-zinc-700 dark:text-zinc-300">
                                                                            {row[k] != null ? String(row[k]) : "—"}
                                                                        </td>
                                                                    ))}
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        ) : (
                            renderGenericDetails()
                        )}
                    </div>

                    {/* Right Column: Activity Stream Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="sticky top-6 space-y-6">
                            {/* Budget Actions */}
                            {/* Setup for Travel */}
                            {doctype === "Travel" &&
                                data?.travel_project_title && (
                                    <BudgetActionsSidebar
                                        projectName={data.travel_project_title}
                                        isStaff={true}
                                        docName={name}
                                        doctype={doctype}
                                    />
                                )}
                            {/* Setup for Advance Settlement */}
                            {doctype === "Advance Settlement" &&
                                data?.project_name && (
                                    <BudgetActionsSidebar
                                        projectName={data.project_name}
                                        isStaff={true}
                                        docName={name}
                                        doctype={doctype}
                                    />
                                )}
                            {/* Setup for Temporary Advance */}
                            {doctype === "Temporary Advance" &&
                                (data?.project_name || data?.project_code) && (
                                    <BudgetActionsSidebar
                                        projectName={
                                            data.project_name ||
                                            data.project_code
                                        }
                                        isStaff={true}
                                        docName={name}
                                        doctype={doctype}
                                    />
                                )}
                            {/* Setup for TA DA Settlement */}
                            {doctype === "TA DA Settlement" &&
                                isRnDStaff &&
                                (data?.project_no ||
                                    data?.ta_da_project_code) && (
                                    <BudgetActionsSidebar
                                        projectName={
                                            data.project_no ||
                                            data.ta_da_project_code
                                        }
                                        isStaff={true}
                                        docName={name}
                                        doctype={doctype}
                                        parentAppId={data?.ta_da_travel_application || undefined}
                                        billAmount={data?.net_claimed ?? data?.ta_da_net_claimed ?? undefined}
                                    />
                                )}
                            {/* Setup for Direct Purchase */}
                            {doctype === "Direct Purchase" &&
                                isRnDStaff &&
                                data?.workflow_state ===
                                "Pending Staff Approval" &&
                                (data?.project_no || data?.project_name) && (
                                    <BudgetActionsSidebar
                                        projectName={
                                            data.project_no || data.project_name
                                        }
                                        isStaff={true}
                                        docName={name}
                                        doctype={doctype}
                                    />
                                )}
                            {/* Setup for Recruitment Adhoc Contractual */}
                            {doctype === "Recruitment Adhoc Contractual" &&
                                (data?.upfa_project_code || data?.project_code) && (
                                    <BudgetActionsSidebar
                                        projectName={
                                            data.upfa_project_code || data.project_code
                                        }
                                        isStaff={true}
                                        docName={name}
                                        doctype={doctype}
                                        onStagingStatusChange={setIsCommittedForGate}
                                    />
                                )}
                            {/* Setup for Top Up Fellowship */}
                            {doctype === "Top Up Fellowship" &&
                                isRnDStaff &&
                                data?.workflow_state === "Pending Staff Approval" &&
                                data?.project_code && (
                                    <BudgetActionsSidebar
                                        projectName={data.project_code}
                                        isStaff={true}
                                        docName={name}
                                        doctype={doctype}
                                        onStagingStatusChange={setIsCommittedForGate}
                                    />
                                )}

                        </div>
                    </div>
                </div>

                {name && doctype && (
                    <>
                        <button
                            type="button"
                            onClick={() => setIsActivityOpen(true)}
                            className="fixed bottom-6 right-6 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-[#C7D2FE] bg-[#2563EB] px-4 text-[12px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#1D4ED8] focus:outline-none focus:ring-4 focus:ring-[#4A6CF7]/20 dark:border-[#4A6CF7]/40"
                            aria-label="Open Activity Log"
                        >
                            <MessageSquareIcon className="h-4 w-4" />
                            Activity Log
                        </button>

                        {isActivityOpen && (
                            <div className="fixed inset-0 z-50 flex justify-end">
                                <div
                                    className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
                                    onClick={() => setIsActivityOpen(false)}
                                />
                                <div className="relative h-full w-full max-w-[420px] overflow-y-auto border-l border-[#E4E4E7] bg-white p-5 shadow-2xl dark:border-[#3F3F46] dark:bg-[#18181B]">
                                    <div className="mb-4 flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#D97757]">
                                                Pending Task
                                            </p>
                                            <h2 className="text-lg font-extrabold text-[#27272A] dark:text-[#F4F4F5]">
                                                Activity Log
                                            </h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsActivityOpen(false)}
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4E4E7] text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#27272A] dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#F4F4F5]"
                                            aria-label="Close Activity Log"
                                        >
                                            <XIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <ActivityLog doctype={doctype} docname={name} />
                                </div>
                            </div>
                        )}
                    </>
                )}

                <div className="flex justify-end gap-3 pb-8 mt-6">
                    <FrappeButton
                        className="bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800"
                        onClick={() => navigate(-1)}
                    >
                        Back to List
                    </FrappeButton>
                </div>
            </main>

            {/* Project Registration Preview Modal */}
            {prPreviewName && (
                <ProjectPreviewModal
                    projectName={prPreviewName}
                    onClose={() => setPrPreviewName(null)}
                />
            )}
        </div>
    );
};

export default PendingTaskDetails;
