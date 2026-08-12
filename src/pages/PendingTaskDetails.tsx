import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useSWRConfig } from "swr";
import { useParams, useNavigate, Navigate } from "react-router-dom";
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
    CheckCircleIcon,
    PencilIcon,
    SaveIcon,
    XIcon,
    FolderOpenIcon,
    ChevronDown,
    ChevronRight,
    Printer,
    CreditCardIcon,
    AlertTriangleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ErrorModal } from "../components/ErrorModal";
import { parseFrappeError } from "../utils/errorUtils";
import { AppSidebar } from '@/components/RndSidebar';
import { PageHeader } from "@/components/common/PageHeader";
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
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
import TravelApplicantSummary from "@/components/TravelApplicantSummary";

import { ActivityLog } from "@/components/ActivityLog";
import { BudgetActionsSidebar } from "@/components/BudgetActionsSidebar";
import TemporaryAdvanceActionButtons from "@/components/TemporaryAdvanceActionButtons";
import TADASettlementActionButtons from "@/components/TADASettlementActionButtons";
import LeaveModuleActionButtons from "@/components/LeaveModuleActionButtons";
import { generateTemporaryAdvanceHtml } from "@/utils/temporaryAdvancePrint";
import { useUserRoles } from "@/components/UserRole";
import { POEditor } from "@/components/POEditor";
import { DeclarationFields } from "@/components/DeclarationFields";
import { AutocompleteEmail } from "@/components/AutocompleteEmail";
import { getFileUrl } from "@/utils/fileUtils";
import { resolveBudgetHeadLabel } from "@/utils/resolveBudgetHeadLabel";

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

    React.useEffect(() => {
        if (isOpen) setComment("");
    }, [isOpen]);

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
    workflowState,
    reimbursementForId,
}: {
    docname: string;
    onActionComplete: () => void;
    /** Current workflow state — used to detect the Other-PI approval step */
    workflowState?: string;
    /** The PI the claim is charged to; only they act at "Pending PI Approval" */
    reimbursementForId?: string;
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
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");
    const { call: fetchPiProjects } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_pi_projects",
    );
    const { call: fetchProjectHeads } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_project_account_heads",
    );
    const { currentUser } = useFrappeAuth();

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    // The Other-PI approval step: only the assigned PI selects which of their
    // own projects to charge and the corresponding account head.
    const isPiStep =
        workflowState === "Pending PI Approval" &&
        !!currentUser &&
        (reimbursementForId || "").toLowerCase() === currentUser.toLowerCase();

    const [projects, setProjects] = React.useState<any[]>([]);
    const [heads, setHeads] = React.useState<any[]>([]);
    const [selectedProject, setSelectedProject] = React.useState("");
    const [selectedHead, setSelectedHead] = React.useState("");

    React.useEffect(() => {
        if (!isPiStep) return;
        fetchPiProjects({})
            .then((res: any) => setProjects(res?.message || []))
            .catch(() => setProjects([]));
    }, [isPiStep]);

    React.useEffect(() => {
        setSelectedHead("");
        if (!selectedProject) { setHeads([]); return; }
        fetchProjectHeads({ project_name: selectedProject })
            .then((res: any) => setHeads(res?.message || []))
            .catch(() => setHeads([]));
    }, [selectedProject]);

    const handleActionClick = (action: string) => {
        if (isPiStep && action === "Approve" && (!selectedProject || !selectedHead)) {
            alert("Please select a project and account head before approving.");
            return;
        }
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            const payload: Record<string, any> = { docname, action: selectedAction, comment };
            if (isPiStep && selectedAction === "Approve") {
                const proj = projects.find((p) => p.value === selectedProject);
                payload.extra_data = JSON.stringify({
                    project_name: selectedProject,
                    project_number: proj?.project_number || proj?.project_no || "",
                    account_head: selectedHead,
                });
            }
            await performAction(payload);
            if (comment.trim()) {
                addComment({ doctype: "Reimbursement", docname, content: comment.trim() }).catch(() => {});
            }
            setModalOpen(false);
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <>
            {isPiStep && (
                <div className="flex flex-col gap-2 mb-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        Approve against one of your projects
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
                        >
                            <option value="">Select project…</option>
                            {projects.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                        <select
                            value={selectedHead}
                            onChange={(e) => setSelectedHead(e.target.value)}
                            disabled={!selectedProject}
                            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                        >
                            <option value="">Select account head…</option>
                            {heads.map((h) => (
                                <option key={h.value} value={h.value}>{h.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
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

const CancellationRequestWorkflowActions = ({
    docname,
    onActionComplete,
}: {
    docname: string;
    onActionComplete: () => void;
}) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{
        message: string[];
    }>(
        "rndopsapp.workflow_pipeline.get_available_workflow_actions",
        { docname, doctype: "Cancellation Request" },
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.workflow_pipeline.perform_workflow_action",
    );

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");
    const [errorModal, setErrorModal] = React.useState<{
        open: boolean;
        title: string;
        message: string;
    }>({ open: false, title: "Action Failed", message: "" });

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({
                docname,
                action: selectedAction,
                comment,
                doctype: "Cancellation Request",
            });
            setModalOpen(false);
            onActionComplete();
        } catch (err: any) {
            setErrorModal({
                open: true,
                title: "Action Failed",
                message: parseFrappeError(err),
            });
        }
    };

    const actions = data?.message || [];

    if (actionsLoading || actions.length === 0) return null;

    return (
        <>
            <div className="flex gap-2">
                {actions.map((action) => (
                    <button
                        key={action}
                        onClick={() => handleActionClick(action)}
                        disabled={actionLoading}
                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm hover:shadow transition-all disabled:opacity-60"
                    >
                        {action}
                    </button>
                ))}
            </div>
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading}
            />
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
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
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [dropdownPos, setDropdownPos] = React.useState({ top: 0, right: 0 });
    const toggleBtnRef = React.useRef<HTMLButtonElement>(null);
    const dropdownPortalRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
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

    const handleActionClick = (action: string) => {
        setDropdownOpen(false);
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            if (comment.trim()) {
                addComment({ doctype: "Fund Sanction", docname, content: comment.trim() }).catch(() => {});
            }
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

    const categorise = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes("forward") || a.includes("approve") || a.includes("submit")) return "forward";
        if (a.includes("reject")) return "reject";
        return "neutral";
    };

    const forwardActions = visibleActions.filter(a => categorise(a) === "forward");
    const neutralActions = visibleActions.filter(a => categorise(a) === "neutral");
    const rejectActions  = visibleActions.filter(a => categorise(a) === "reject");
    const groups = [forwardActions, neutralActions, rejectActions].filter(g => g.length > 0);

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

    const handleToggleDropdown = () => {
        if (!dropdownOpen && toggleBtnRef.current) {
            const rect = toggleBtnRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
        }
        setDropdownOpen(o => !o);
    };

    return (
        <>
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
                                    const isForward = action.toLowerCase().includes("forward");
                                    const blocked = blockForward && isForward;
                                    const { icon, cls, iconCls } = itemStyle(action);
                                    return (
                                        <div key={action} className="relative group/item">
                                            <button
                                                onClick={() => { if (!blocked) handleActionClick(action); }}
                                                disabled={actionLoading || blocked}
                                                className={cn(
                                                    "w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors disabled:cursor-not-allowed",
                                                    blocked ? "opacity-40" : cls,
                                                )}
                                            >
                                                <span className={iconCls}>{icon}</span>
                                                {action}
                                                {blocked && (
                                                    <span className="ml-auto text-[10px] font-normal text-zinc-400">blocked</span>
                                                )}
                                            </button>
                                            {blocked && (
                                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/item:block z-[9999]">
                                                    <div className="bg-zinc-900 text-white text-[11px] rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap">
                                                        Account details and Sanctioned Letter No. must be filled before forwarding.
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
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");

    const handleActionClick = (action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            if (comment.trim()) {
                addComment({ doctype: "Travel", docname, content: comment.trim() }).catch(() => {});
            }
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
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

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

    const [actionModalOpen, setActionModalOpen] = React.useState(false);
    const [selectedTufAction, setSelectedTufAction] = React.useState("");
    const [backModalOpen, setBackModalOpen] = React.useState(false);
    const [pendingBack, setPendingBack] = React.useState<{ target: string; label: string } | null>(null);
    const [errorModal, setErrorModal] = React.useState<{
        open: boolean;
        title: string;
        message: string;
    }>({ open: false, title: "Action Failed", message: "" });

    const handlePutBack = (target: string, label: string) => {
        setPendingBack({ target, label });
        setBackModalOpen(true);
    };

    const handleConfirmPutBack = async (comment: string) => {
        if (!pendingBack) return;
        try {
            const res: any = await putBack({ docname, target: pendingBack.target, comment: comment || undefined });
            if (res?.message?.status === "error") {
                setErrorModal({
                    open: true,
                    title: "Action Failed",
                    message: parseFrappeError({ message: res.message.message || `${pendingBack.label} failed.` }, res?.message),
                });
                return;
            }
            setBackModalOpen(false);
            setPendingBack(null);
            refreshBackActions();
            onActionComplete();
        } catch (err: any) {
            console.error("put_back failed:", err);
            setErrorModal({
                open: true,
                title: "Action Failed",
                message: parseFrappeError(err),
            });
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
                setErrorModal({
                    open: true,
                    title: "Could Not Mark As Sent",
                    message: parseFrappeError({ message: res.message.message || "Could not mark as sent." }, res?.message),
                });
                return;
            }
            downloadGeneratedPdf();
            onActionComplete();
        } catch (err: any) {
            console.error("Send-to-Faculty-Admission failed:", err);
            setErrorModal({
                open: true,
                title: "Could Not Mark As Sent",
                message: parseFrappeError(err),
            });
        }
    };

    const handleActionClick = (action: string) => {
        setSelectedTufAction(action);
        setActionModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            const res: any = await performAction({ docname, action: selectedTufAction, comment: comment || undefined });
            if (res?.message?.status === "error") {
                setErrorModal({
                    open: true,
                    title: "Action Failed",
                    message: parseFrappeError({ message: res.message.message || `Action "${selectedTufAction}" failed.` }, res?.message),
                });
                return;
            }
            if (comment?.trim()) {
                addComment({ doctype: "Top Up Fellowship", docname, content: comment.trim() }).catch(() => {});
            }
            setActionModalOpen(false);
            onActionComplete();
        } catch (err: any) {
            console.error("Top Up Fellowship action failed:", err);
            setErrorModal({
                open: true,
                title: "Action Failed",
                message: parseFrappeError(err),
            });
        }
    };

    if (docLoading || actionsLoading) return null;
    const actions = actionsResp?.message || [];

    const modals = (
        <>
            <CommentModal
                isOpen={actionModalOpen}
                onClose={() => setActionModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedTufAction}
                isLoading={actionLoading}
            />
            <CommentModal
                isOpen={backModalOpen}
                onClose={() => { setBackModalOpen(false); setPendingBack(null); }}
                onSubmit={handleConfirmPutBack}
                action={pendingBack?.label || "Put Back"}
                isLoading={putBackLoading}
            />
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </>
    );

    // 3-stage Pending Staff Approval flow (mirrors SCR Dean→Director).
    if (isPendingStaff && actions.length > 0) {
        // Stage 1 — staff hasn't sent to Faculty Admission yet.
        if (!sentToFa) {
            const stageOneActions = actions.filter((a) => {
                const al = a.toLowerCase();
                return al !== "forward" && al !== "submit" && al !== "approve";
            });
            return (
                <>
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
                    {modals}
                </>
            );
        }
        // Stage 2 — sent, but signed PDF not yet uploaded.
        if (!hasFacultyPdf) {
            return (
                <>
                    <div className="flex gap-2 flex-wrap">
                        <FrappeButton
                            disabled
                            className="bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300 cursor-not-allowed"
                        >
                            Waiting for Faculty Admission Upload
                        </FrappeButton>
                        {renderBackButtons()}
                    </div>
                    {modals}
                </>
            );
        }
        // Stage 3 — PDF uploaded → view + real workflow actions.
        return (
            <>
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
                {modals}
            </>
        );
    }

    // Default: any state outside Pending Staff Approval — render all available
    // workflow actions normally, plus any dynamic put-back actions.
    if (!actions.length && !backActions.length) return null;
    return (
        <>
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
            {modals}
        </>
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
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    const [modalOpen, setModalOpen] = React.useState(false);
    const [selectedAction, setSelectedAction] = React.useState("");
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [dropdownPos, setDropdownPos] = React.useState({ top: 0, right: 0 });
    const toggleBtnRef = React.useRef<HTMLButtonElement>(null);
    const dropdownPortalRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
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

    const handleActionClick = (action: string) => {
        setDropdownOpen(false);
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            await performAction({ docname, action: selectedAction, comment });
            if (comment.trim()) {
                addComment({ doctype: "Recruitment Adhoc Contractual", docname, content: comment.trim() }).catch(() => {});
            }
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

    const categorise = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes("forward") || a.includes("approve") || a.includes("submit")) return "forward";
        if (a.includes("reject")) return "reject";
        return "neutral";
    };

    const visibleActions = data.message;
    const forwardActions = visibleActions.filter(a => categorise(a) === "forward");
    const neutralActions = visibleActions.filter(a => categorise(a) === "neutral");
    const rejectActions  = visibleActions.filter(a => categorise(a) === "reject");
    const groups = [forwardActions, neutralActions, rejectActions].filter(g => g.length > 0);

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

    const handleToggleDropdown = () => {
        if (!dropdownOpen && toggleBtnRef.current) {
            const rect = toggleBtnRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
        }
        setDropdownOpen(o => !o);
    };

    return (
        <>
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

function getOriginalApplicationRoute(refDoctype: string, refName: string): string {
    if (!refDoctype || !refName) return "";
    const name = encodeURIComponent(refName);
    
    switch (refDoctype) {
        case "Reimbursement":
            return `/reimbursement/${name}`;
        case "Disbursal of Honorarium":
            return `/disbursal-of-honorarium/${name}`;
        case "Disbursal of Consultancy":
            return `/disbursal-of-consultancy/${name}`;
        case "Travel":
            return `/travel/${name}`;
        case "Loan Request":
            return `/loan-request/${name}`;
        case "Miscellaneous Commit":
            return `/miscellaneous-commit/${name}`;
        case "Indent General Form":
            return `/indent-general-form-details/${name}`;
        case "Indent Cum Sanction Sheet":
            return `/indent-cum-sanction-sheet/${name}`;
        case "Selection Committee Report":
            return `/selection-committee-report/${name}`;
        case "Temporary Advance":
            return `/temporary-advance/${name}`;
        case "Direct Purchase":
            return `/direct-purchase/${name}`;
        case "Advance Settlement":
            return `/advance-settlement/${name}`;
        default:
            return `/pending-tasks/${encodeURIComponent(refDoctype)}/${name}`;
    }
}

const OriginalCommitmentModal = ({
    record,
    onClose,
}: {
    record: any;
    onClose: () => void;
}) => {
    let payloadObj: Record<string, any> = {};
    try {
        const raw = record.payload ?? record.commit_payload ?? "{}";
        payloadObj = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
        payloadObj = {};
    }

    const commitAmount = payloadObj.commit_amount ?? payloadObj.commitAmount;
    const budgetHead = payloadObj.budget_head ?? payloadObj.budgetHead;
    const projectName = payloadObj.project_name ?? payloadObj.projectName;
    const particulars = payloadObj.commit_particular ?? payloadObj.commitParticular;

    const rawStatus: string = record.status ?? "";
    const displayStatus = rawStatus === "PUBLISHED" ? "Committed" : rawStatus;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="relative w-full max-w-lg flex flex-col bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <div className="flex items-center gap-2.5">
                        <CreditCardIcon className="w-5 h-5 text-[#D97757]" />
                        <h2 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                            Commitment Details
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                        aria-label="Close separate window"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">
                    <div className="text-center py-4 bg-orange-50/50 dark:bg-zinc-800/30 rounded-xl border border-orange-100/50 dark:border-zinc-800">
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider mb-1">Commit Amount</p>
                        <p className="text-3xl font-extrabold text-[#D97757]">
                            ₹{commitAmount !== undefined ? Number(commitAmount).toLocaleString("en-IN") : "0"}
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Reference ID</span>
                            <span className="col-span-2 text-xs font-mono font-bold text-zinc-800 dark:text-zinc-200 text-right break-all">
                                {record.reference_name}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Reference Type</span>
                            <span className="col-span-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 text-right">
                                {record.reference_doctype}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Budget Head</span>
                            <span className="col-span-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 text-right break-all">
                                {budgetHead || "-"}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Project Name</span>
                            <span className="col-span-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 text-right break-all">
                                {projectName || "-"}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Staging Status</span>
                            <div className="col-span-2 text-right">
                               <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    displayStatus === "Committed"
                                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                                        : "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400"
                                }`}>
                                    {displayStatus}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Staging ID</span>
                            <span className="col-span-2 text-xs font-mono font-semibold text-zinc-500 dark:text-zinc-400 text-right break-all">
                                {record.name}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5 border-b border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Modified By</span>
                            <span className="col-span-2 text-xs text-zinc-800 dark:text-zinc-200 text-right break-all">
                                {record.modified_by || "-"}
                            </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 py-2.5">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Modified</span>
                            <span className="col-span-2 text-xs text-zinc-800 dark:text-zinc-200 text-right">
                                {record.modified ? new Date(record.modified).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                            </span>
                        </div>
                    </div>

                    {particulars && (
                        <div className="flex flex-col gap-1.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                            <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">Particulars / Comments</span>
                            <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
                                {particulars}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const OriginalCommitmentSidebar = ({ refName, refDoctype }: { refName?: string; refDoctype?: string }) => {
    const [record, setRecord] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (!refName) return;
        setLoading(true);
        const fetchStaging = async () => {
            try {
                const url = `/api/method/rndopsapp.rndopsapp.cancellation_api.get_original_commitment?reference_doctype=${encodeURIComponent(refDoctype || '')}&reference_name=${encodeURIComponent(refName)}`;
                const res = await fetch(url, { credentials: "include" });
                if (res.ok) {
                    const json = await res.json();
                    const record = json?.message || null;
                    if (record) {
                        setRecord(record);
                    }
                }
            } catch (err) {
                console.error("Error fetching original commitment:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStaging();
    }, [refName, refDoctype]);

    if (loading) {
        return (
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#D97757] border-t-transparent" />
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Loading original commitment…</span>
            </div>
        );
    }

    if (!record) {
        return (
            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                    <CreditCardIcon className="w-4 h-4 text-zinc-400" />
                    <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Original Commitment
                    </h3>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    No active budget commitment was found for the original application <span className="font-semibold">{refName}</span>.
                </p>
            </div>
        );
    }

    let payloadObj: Record<string, any> = {};
    try {
        const raw = record.payload ?? record.commit_payload ?? "{}";
        payloadObj = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
        payloadObj = {};
    }

    const commitAmount = payloadObj.commit_amount ?? payloadObj.commitAmount;
    const budgetHead = payloadObj.budget_head ?? payloadObj.budgetHead;
    const projectName = payloadObj.project_name ?? payloadObj.projectName;
    const particulars = payloadObj.commit_particular ?? payloadObj.commitParticular;

    return (
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
                <CheckCircle2Icon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Original Commitment
                </h3>
            </div>

            <div className="space-y-3 text-sm">
                {commitAmount !== undefined && (
                    <div className="flex justify-between items-center gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Commit Amount</span>
                        <span className="font-bold text-[#D97757] text-right">
                            ₹{Number(commitAmount).toLocaleString("en-IN")}
                        </span>
                    </div>
                )}
                {budgetHead && (
                    <div className="flex justify-between items-center gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Budget Head</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-right break-all">
                            {budgetHead}
                        </span>
                    </div>
                )}
                {projectName && (
                    <div className="flex justify-between items-center gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Project Name</span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-right break-all">
                            {projectName}
                        </span>
                    </div>
                )}
                {particulars && (
                    <div className="flex flex-col gap-1 py-1.5">
                        <span className="text-zinc-500 dark:text-zinc-400 text-xs font-medium">Particulars</span>
                        <span className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-lg mt-1 border border-zinc-100 dark:border-zinc-800/80">
                            {particulars}
                        </span>
                    </div>
                )}
                <div className="flex justify-between items-center gap-2 pt-2 text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Status</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 font-bold uppercase text-[10px]">
                        {record.status === "PUBLISHED" ? "Committed" : record.status}
                    </span>
                </div>

                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
                    <button
                        type="button"
                        onClick={() => setIsModalOpen(true)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800/50 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors border border-zinc-200/60 dark:border-zinc-800"
                    >
                        <ExternalLinkIcon className="w-3.5 h-3.5" />
                        Open in Separate Window
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <OriginalCommitmentModal
                    record={record}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};

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
        value.startsWith("http://172.16.135.118:8081/") ||
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
                        {data?.workflow_state === "Sanction Sheet Generated" && (
                            <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3.5 dark:border-amber-700/60 dark:bg-amber-950/40 shadow-sm">
                                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
                                    <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[13px] font-bold text-amber-800 dark:text-amber-300">
                                        Purchase Order Locked
                                    </p>
                                    <p className="mt-0.5 text-[12px] leading-5 text-amber-700 dark:text-amber-400">
                                        The Purchase Order is locked. The Sanction Sheet has not been printed yet
                                        {(data?.applicant_name || data?.applicant || data?.owner) && (
                                            <> by <span className="font-semibold">{data?.applicant_name || data?.applicant || data?.owner}</span></>
                                        )}
                                        . Once the PI prints the Sanction Sheet, this form will move to{" "}
                                        <span className="font-semibold">"Sanction Sheet Printed"</span>{" "}
                                        status, then RnD staff can process the form and the Purchase Order will be enabled.
                                    </p>
                                </div>
                            </div>
                        )}
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

    // Top Up Fellowship has its own dedicated details page
    if (doctype === "Top Up Fellowship" && name) {
        return <Navigate to={`/top-up-fellowship/${name}`} replace />;
    }

    const { data, isLoading, error, mutate } = useFrappeGetDoc(
        doctype || "",
        name || "",
    );

    const [errorModal, setErrorModal] = useState<{
        open: boolean;
        title: string;
        message: string;
    }>({ open: false, title: "Submission Failed", message: "" });

    const { data: cancellationStatus } = useFrappeGetCall<{
        message: {
            has_pending: boolean;
            has_cancellation: boolean;
            cancellation_requests: any[];
        };
    }>(
        "rndopsapp.rndopsapp.cancellation_api.get_cancellation_status",
        {
            reference_doctype: doctype,
            reference_name: name,
        },
        doctype && name && doctype !== "Cancellation Request" ? undefined : null
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
    const canEditFsAccountDetails = roles.some(
        (r) => r === "staff, RnD" || r === "System Manager",
    );

    // TA DA Settlement — "For Office Use" section: staff, RnD only, and only
    // while the settlement sits at "Pending Staff Approval". Hidden from the
    // applicant entirely; visible read-only to approvers further down the chain.
    const TADA_OFFICE_USE_SECTION_FIELDNAME = "for_office_use_section";
    const TADA_OFFICE_USE_INPUT_FIELDNAMES = [
        "railways_air_steamer_busfare",
        "road_mileage",
        "local_conveyance",
        "food_charges",
        "cccommodation_charges",
        "registration_fee_other",
        "less_advance_paid_to_applicant",
    ];
    const TADA_OFFICE_USE_COMPUTED_FIELDNAMES = ["total_admissible_amount", "net_amount"];
    const TADA_OFFICE_USE_FIELDNAMES = new Set([
        ...TADA_OFFICE_USE_INPUT_FIELDNAMES,
        ...TADA_OFFICE_USE_COMPUTED_FIELDNAMES,
    ]);
    const TADA_OFFICE_USE_CHARGE_FIELDNAMES = TADA_OFFICE_USE_INPUT_FIELDNAMES.filter(
        (f) => f !== "less_advance_paid_to_applicant",
    );
    const TADA_OFFICE_USE_VIEW_ONLY_ROLES = [
        "Hos, RnD (Head of Section, RnD)",
        "Ado_RnD",
        "Dean, RnD",
        "Director",
    ];
    const canEditTadaOfficeUse = roles.some(
        (r) => r === "staff, RnD" || r === "System Manager",
    );
    const isTadaOfficeUseViewer =
        canEditTadaOfficeUse || roles.some((r) => TADA_OFFICE_USE_VIEW_ONLY_ROLES.includes(r));
    const isTadaPendingStaffApproval = data?.workflow_state === "Pending Staff Approval";
    const tadaOfficeUseEditable = canEditTadaOfficeUse && isTadaPendingStaffApproval;

    const { call: saveTadaOfficeUse } = useFrappePostCall<{ message: any }>(tadaAPI.save);

    // Local draft of the "For Office Use" figures — kept separate from `displayData`
    // (which gets clobbered by every SWR revalidation of `data`) so in-progress
    // edits aren't lost mid-typing.
    const [tadaOfficeUseDraft, setTadaOfficeUseDraft] = useState<Record<string, any>>({});
    const [isSavingTadaOfficeUse, setIsSavingTadaOfficeUse] = useState(false);

    useEffect(() => {
        if (doctype !== "TA DA Settlement" || !data) return;
        const draft: Record<string, any> = {};
        for (const fieldname of TADA_OFFICE_USE_INPUT_FIELDNAMES) {
            draft[fieldname] = (data as any)[fieldname] ?? "";
        }
        draft.total_admissible_amount = (data as any).total_admissible_amount ?? 0;
        draft.net_amount = (data as any).net_amount ?? 0;
        setTadaOfficeUseDraft(draft);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doctype, (data as any)?.name, (data as any)?.modified]);

    // Recalculate Total Admissible Amount / Net Amount as staff types
    useEffect(() => {
        if (!tadaOfficeUseEditable) return;
        const totalAdmissible = TADA_OFFICE_USE_CHARGE_FIELDNAMES.reduce(
            (sum, fieldname) => sum + (parseFloat(tadaOfficeUseDraft[fieldname]) || 0),
            0,
        );
        if (tadaOfficeUseDraft.total_admissible_amount !== totalAdmissible) {
            setTadaOfficeUseDraft((prev) => ({ ...prev, total_admissible_amount: totalAdmissible }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tadaOfficeUseEditable, ...TADA_OFFICE_USE_CHARGE_FIELDNAMES.map((f) => tadaOfficeUseDraft[f])]);

    useEffect(() => {
        if (!tadaOfficeUseEditable) return;
        const totalAdmissible = parseFloat(tadaOfficeUseDraft.total_admissible_amount) || 0;
        const advancePaid = parseFloat(tadaOfficeUseDraft.less_advance_paid_to_applicant) || 0;
        const net = totalAdmissible - advancePaid;
        if (tadaOfficeUseDraft.net_amount !== net) {
            setTadaOfficeUseDraft((prev) => ({ ...prev, net_amount: net }));
        }
    }, [tadaOfficeUseEditable, tadaOfficeUseDraft.total_admissible_amount, tadaOfficeUseDraft.less_advance_paid_to_applicant]);

    const handleTadaOfficeUseChange = (fieldname: string, value: any) => {
        setTadaOfficeUseDraft((prev) => ({ ...prev, [fieldname]: value }));
    };

    const handleSaveTadaOfficeUse = async () => {
        if (!name) return;
        setIsSavingTadaOfficeUse(true);
        try {
            const payload: Record<string, any> = { name };
            for (const fieldname of TADA_OFFICE_USE_INPUT_FIELDNAMES) {
                payload[fieldname] = tadaOfficeUseDraft[fieldname];
            }
            const res = await saveTadaOfficeUse({ doc_data: JSON.stringify(payload) });
            if ((res as any)?.message?.status !== "success") {
                throw new Error((res as any)?.message?.message || "Save failed");
            }
            await mutate();
            refreshAll();
            alert("Office Use details saved successfully.");
        } catch (e: any) {
            setErrorModal({
                open: true,
                title: "Save Failed",
                message: parseFrappeError(e),
            });
        } finally {
            setIsSavingTadaOfficeUse(false);
        }
    };

    // Fund Sanction — editable account details
    const [fsAcctPfms, setFsAcctPfms] = useState('');
    const [fsAcctSchemeName, setFsAcctSchemeName] = useState('');
    const [fsAcctSchemeNum, setFsAcctSchemeNum] = useState('');
    const [fsAcctAccountNum, setFsAcctAccountNum] = useState('');
    const [fsAcctBankName, setFsAcctBankName] = useState('');
    const [isSavingAcctDetails, setIsSavingAcctDetails] = useState(false);

    // Fund Sanction — sanctioned budget breakup editing (staff, RnD only)
    type SanctionBudgetRow = {
        account_head: string;
        first_year_budget: number;
        second_year_budget: number;
        third_year_budget: number;
        fourth_year_budget: number;
        fifth_year_budget: number;
    };
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [editBudgetRows, setEditBudgetRows] = useState<SanctionBudgetRow[]>([]);
    const [isSavingBudget, setIsSavingBudget] = useState(false);
    const [budgetMsg, setBudgetMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [budgetHeadList, setBudgetHeadList] = useState<string[]>([]);
    const [showBudgetCommentModal, setShowBudgetCommentModal] = useState(false);

    useEffect(() => {
        if (doctype !== 'Fund Sanction') return;
        fetch('/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0')
            .then(r => r.json())
            .then(j => { if (j?.data) setBudgetHeadList(j.data.map((x: any) => x.budget_head).filter(Boolean)); })
            .catch(() => {});
    }, [doctype]);

    const startEditBudget = () => {
        setEditBudgetRows(
            (data?.sanctioned_budget_breakup ?? []).map((r: any) => ({
                account_head: r.account_head ?? '',
                first_year_budget: parseFloat(r.first_year_budget) || 0,
                second_year_budget: parseFloat(r.second_year_budget) || 0,
                third_year_budget: parseFloat(r.third_year_budget) || 0,
                fourth_year_budget: parseFloat(r.fourth_year_budget) || 0,
                fifth_year_budget: parseFloat(r.fifth_year_budget) || 0,
            }))
        );
        setIsEditingBudget(true);
        setBudgetMsg(null);
    };

    const cancelEditBudget = () => {
        setIsEditingBudget(false);
        setEditBudgetRows([]);
        setBudgetMsg(null);
    };

    const saveBudget = async (comment: string) => {
        setIsSavingBudget(true);
        setShowBudgetCommentModal(false);
        setBudgetMsg(null);
        try {
            const res = await fetch(
                '/api/method/rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.update_sanctioned_budget_breakup',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Frappe-CSRF-Token': (window as any).csrf_token || '',
                    },
                    body: JSON.stringify({ docname: name, rows: editBudgetRows, username: currentUser ?? '' }),
                },
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.exception || `HTTP ${res.status}`);

            if (comment.trim()) {
                await fetch('/api/method/rndopsapp.rndopsapp.api.add_project_comment', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Frappe-CSRF-Token': (window as any).csrf_token || '',
                    },
                    body: JSON.stringify({
                        doctype: 'Fund Sanction',
                        docname: name,
                        content: comment.trim(),
                    }),
                }).catch(() => {});
            }

            mutate();
            setIsEditingBudget(false);
            setEditBudgetRows([]);
            setBudgetMsg({ type: 'success', text: 'Budget breakup updated successfully.' });
        } catch (e: any) {
            setBudgetMsg({ type: 'error', text: e?.message || 'Failed to save budget breakup.' });
        } finally {
            setIsSavingBudget(false);
        }
    };

    // Fund Sanction — sanction_related_files management (staff, RnD only)
    type FsFileRow = {
        _key: string;
        description: string;
        sanction_file: string;
        filename?: string;
        content?: string;
        is_new: boolean;
    };
    const [fsFiles, setFsFiles] = useState<FsFileRow[]>([]);
    const [isSavingFsFiles, setIsSavingFsFiles] = useState(false);
    const [fsFilesMsg, setFsFilesMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const fsFileInputRef = useRef<HTMLInputElement>(null);

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
            setErrorModal({
                open: true,
                title: "Save Failed",
                message: parseFrappeError(e),
            });
        } finally {
            setIsSavingAcctDetails(false);
        }
    };

    // Sync sanction_related_files from doc into local editable state
    useEffect(() => {
        if (doctype !== 'Fund Sanction') return;
        const rows: any[] = (data as any)?.sanction_related_files || [];
        setFsFiles(rows.map((r: any, i: number) => ({
            _key: `existing-${i}-${r.sanction_file || i}`,
            description: r.description || '',
            sanction_file: r.sanction_file || '',
            is_new: false,
        })));
    }, [doctype, (data as any)?.sanction_related_files]);

    const handleFsFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            setFsFilesMsg({ type: 'error', text: `"${file.name}" exceeds the 10 MB limit.` });
            e.target.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
            setFsFiles(prev => [...prev, {
                _key: `new-${Date.now()}-${file.name}`,
                description: '',
                sanction_file: '',
                filename: file.name,
                content: base64,
                is_new: true,
            }]);
            setFsFilesMsg(null);
        };
        reader.onerror = () => setFsFilesMsg({ type: 'error', text: 'Failed to read file.' });
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const handleSaveFsFiles = async () => {
        if (!name) return;
        setIsSavingFsFiles(true);
        setFsFilesMsg(null);
        try {
            const existingFiles = fsFiles
                .filter(f => !f.is_new)
                .map(f => ({ sanction_file: f.sanction_file, description: f.description }));
            const newFiles = fsFiles
                .filter(f => f.is_new)
                .map(f => ({
                    filename: f.filename || 'file',
                    content: f.content || '',
                    description: f.description,
                    is_private: 1,
                    fieldname: '',
                }));
            const res = await fetch(
                '/api/method/rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.update_fund_sanction_files',
                {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Frappe-CSRF-Token': (window as any).csrf_token || '',
                    },
                    body: JSON.stringify({
                        docname: name,
                        files: newFiles,
                        existing_files: existingFiles,
                        project_reg: (data as any)?.project_proposal || undefined,
                        replace: true,
                    }),
                },
            );
            const json = await res.json().catch(() => ({}));
            if (!res.ok || json?.message?.status === 'error') {
                throw new Error(json?.message?.message || json?.exception || `HTTP ${res.status}`);
            }
            await mutate();
            const total = json?.message?.total_file_rows ?? fsFiles.length;
            setFsFilesMsg({ type: 'success', text: `Saved successfully. ${total} file${total !== 1 ? 's' : ''} on record.` });
        } catch (e: any) {
            setFsFilesMsg({ type: 'error', text: e?.message || 'Failed to save files.' });
        } finally {
            setIsSavingFsFiles(false);
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
        if (doctype === "Miscellaneous Commit" && name) {
            navigate(`/miscellaneous-commit/${name}`, { replace: true });
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
    // Kafka Staging Commit Status Gate
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);

    // Comment handler for action buttons

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

    // TA DA Settlement — merge the staff, RnD "For Office Use" draft on top of
    // displayData so live edits/computed totals show immediately.
    const tadaDisplayData = useMemo(
        () => ({ ...displayData, ...tadaOfficeUseDraft }),
        [displayData, tadaOfficeUseDraft],
    );

    const tadaProcessedFields = useMemo(() => {
        return tadaFields.map((field) => {
            // "Select Travel Application" links the settlement to a specific Travel
            // record — never user-editable, regardless of who's viewing.
            if (field.fieldname === "ta_da_travel_application") {
                return { ...field, read_only: 1 };
            }

            if (
                field.fieldname !== TADA_OFFICE_USE_SECTION_FIELDNAME &&
                !TADA_OFFICE_USE_FIELDNAMES.has(field.fieldname)
            ) {
                // The global `readOnly` prop is turned off while staff, RnD is
                // editing the office-use section (so those fields unlock) — force
                // every other field to stay locked instead of unlocking with it.
                return tadaOfficeUseEditable ? { ...field, read_only: 1 } : field;
            }
            const f = { ...field };
            if (!isTadaOfficeUseViewer) {
                f.hidden = 1;
                return f;
            }
            f.hidden = 0;
            if (TADA_OFFICE_USE_COMPUTED_FIELDNAMES.includes(field.fieldname)) {
                f.read_only = 1;
            } else {
                f.read_only = tadaOfficeUseEditable ? 0 : 1;
            }
            return f;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tadaFields, isTadaOfficeUseViewer, tadaOfficeUseEditable]);

    const [resolvedAccountHead, setResolvedAccountHead] = useState<string>("");
    const [resolvedProjectTitle, setResolvedProjectTitle] = useState<string>("");
    const [resolvedApplicantName, setResolvedApplicantName] = useState<string>("");
    // Resolved label for TA DA Settlement's "Account Head from Travel" — used to
    // pre-select the same Budget Head in staff, RnD's "Make a Commitment" widget.
    const [resolvedTadaAccountHead, setResolvedTadaAccountHead] = useState<string>("");
    useEffect(() => {
        if (doctype !== "TA DA Settlement" || !data?.ta_da_account_head) {
            setResolvedTadaAccountHead("");
            return;
        }
        let cancelled = false;
        resolveBudgetHeadLabel(data.ta_da_account_head).then((label) => {
            if (!cancelled) setResolvedTadaAccountHead(label);
        });
        return () => {
            cancelled = true;
        };
    }, [doctype, data?.ta_da_account_head]);

    useEffect(() => {
        if (doctype === "Temporary Advance" && data) {
            // Account Head
            if (data.account_head) {
                fetch(`/api/v2/document/Budget%20Head/${data.account_head}`)
                    .then(r => r.json())
                    .then(res => {
                        if (res.data) setResolvedAccountHead(res.data.budget_head || res.data.name);
                    })
                    .catch(err => console.error("Failed to resolve budget head", err));
            }

            // Department — resolve raw ID to human-readable name for print
            const deptId = data.applicant_department;
            if (deptId) {
                fetch(`/api/v2/document/Department_prornd/${encodeURIComponent(deptId)}`, { credentials: "include" })
                    .then(r => r.json())
                    .then(res => {
                        const name = res.data?.dept_name;
                        if (name) setDisplayData(prev => ({ ...prev, applicant_department: name }));
                    })
                    .catch(() => {});
            }

            // Applicant full name — applicant_name may store email; resolve from User
            const email = data.applicant_webmail || data.owner || "";
            if (email) {
                fetch(`/api/method/frappe.client.get_value?doctype=User&filters=${encodeURIComponent(email)}&fieldname=full_name`, { credentials: "include" })
                    .then(r => r.json())
                    .then(res => {
                        const fullName = res.message?.full_name;
                        if (fullName) setResolvedApplicantName(fullName);
                    })
                    .catch(() => {});
            }

            // Project Title — project_code/project_no is the project number, NOT the Frappe doc name.
            // Must search by project_no filter, not fetch by document name.
            const projectRef = data.project_code || data.project_no;
            if (projectRef) {
                const resolveProjectTitle = async () => {
                    const opts = temporaryAdvanceLinkOptions[data.project_code ? 'project_code' : 'project_no']
                        || temporaryAdvanceLinkOptions['Project Registration']
                        || temporaryAdvanceLinkOptions['Project Proposal'] || [];
                    const fromOpts = (opts as any[]).find((o) => o.value === projectRef);
                    if (fromOpts?.label && fromOpts.label !== projectRef) {
                        setResolvedProjectTitle(fromOpts.label);
                        setDisplayData(prev => ({ ...prev, project_name: fromOpts.label }));
                        return;
                    }
                    try {
                        const postOpts = { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include" as RequestCredentials };
                        let res = await fetch("/api/method/frappe.client.get_list", { ...postOpts, body: JSON.stringify({ doctype: "Project Registration", filters: { project_no: projectRef }, fields: ["project_title"], limit_page_length: 1 }) });
                        let json = await res.json();
                        let title = json?.message?.[0]?.project_title || "";
                        if (!title) {
                            res = await fetch("/api/method/frappe.client.get_list", { ...postOpts, body: JSON.stringify({ doctype: "Project Proposal", filters: { project_no: projectRef }, fields: ["project_title"], limit_page_length: 1 }) });
                            json = await res.json();
                            title = json?.message?.[0]?.project_title || "";
                        }
                        if (title) {
                            setResolvedProjectTitle(title);
                            setDisplayData(prev => ({ ...prev, project_name: title }));
                        } else if (data.project_name) {
                            setResolvedProjectTitle(data.project_name);
                        }
                    } catch (err) {
                        console.error("Failed to resolve project", err);
                        if (data.project_name) setResolvedProjectTitle(data.project_name);
                    }
                };
                resolveProjectTitle();
            }
        }
    }, [data, doctype, temporaryAdvanceLinkOptions]);

    const handlePrintTemporaryAdvance = () => {
        if (!data) return;
        const html = generateTemporaryAdvanceHtml(displayData, resolvedProjectTitle, resolvedAccountHead, resolvedApplicantName);
        const printWindow = window.open("", "_blank");
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

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
                    // Fetch the linked document using standard fetch API
                    const res = await fetch(`/api/v2/document/${encodeURIComponent(field.options ?? '')}/${encodeURIComponent(String(value))}`, {
                        credentials: "include",
                        headers: { Accept: "application/json" },
                    });
                    if (!res.ok) return;
                    const json = await res.json();
                    if (json?.data) {
                        const doc = json.data;
                        // Try to find a readable field
                        let readable = value;
                        if (doc.title) readable = doc.title;
                        else if (doc.dept_name) readable = doc.dept_name;
                        else if (doc.department_name) readable = doc.department_name;
                        else if (doc.employee_category_name)
                            readable = doc.employee_category_name;
                        else if (doc.employee_category)
                            readable = doc.employee_category;
                        else if (doc.category_name)
                            readable = doc.category_name;
                        else if (doc.designation_name)
                            readable = doc.designation_name;
                        else if (doc.name && doc.name !== value)
                            readable = doc.name;

                        // Special case for our known doctypes
                        if (
                            (field.options === "Department" || field.options === "Department_prornd") &&
                            (doc.dept_name || doc.department_name)
                        )
                            readable = doc.dept_name || doc.department_name;
                        if (
                            field.options === "Employee Category" &&
                            (doc.employee_category || doc.employee_category_name)
                        )
                            readable = doc.employee_category || doc.employee_category_name;

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
                                                doctype === "Cancellation Request" && key === "reference_name" && data?.reference_doctype ? (
                                                    <button
                                                        onClick={() => {
                                                            const route = getOriginalApplicationRoute(
                                                                data.reference_doctype,
                                                                String(value),
                                                            );
                                                            if (route) navigate(route);
                                                        }}
                                                        className="text-left font-semibold text-[#D97757] hover:underline hover:text-[#c66a4e] transition-colors inline-flex items-center gap-1"
                                                    >
                                                        {displayValue}
                                                        <ExternalLinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                                    </button>
                                                ) : (
                                                    (doctype === "Cancellation Request" && key === "status" && value === "Approved")
                                                        ? "Cancelled"
                                                        : displayValue
                                                )
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
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                {cancellationStatus?.message?.has_pending && (
                    <div className="mb-6 p-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 flex items-center gap-3 shadow-sm">
                        <AlertTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
                        <div className="text-sm font-medium">
                            This application has a pending cancellation request. No further workflow actions can be performed on it.
                        </div>
                    </div>
                )}
                <PageHeader
                    title={name || ''}
                    projectName={doctype}
                    status={(doctype === "Cancellation Request" && data?.workflow_state === "Approved") ? "Cancelled" : data?.workflow_state}
                >
                    {/* View linked Project Registration */}
                    {doctype !== "Project Registration" && data && (
                        <button
                            onClick={async () => {
                                const directName = extractPRName(doctype, data);
                                if (directName) {
                                    setPrPreviewName(directName);
                                    return;
                                }
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
                    {doctype === "Cancellation Request" && data?.reference_doctype && data?.reference_name && (
                        <button
                            onClick={() => {
                                const route = getOriginalApplicationRoute(
                                    data.reference_doctype,
                                    data.reference_name,
                                );
                                if (route) navigate(route);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 h-fit rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-[#D97757] hover:text-[#D97757] transition-colors"
                        >
                            <ExternalLinkIcon className="w-3.5 h-3.5" />
                            View Original Application
                        </button>
                    )}
                    {doctype === "Reimbursement" && name && !cancellationStatus?.message?.has_pending && (
                        <ReimbursementWorkflowActions
                            docname={name}
                            onActionComplete={() => window.location.reload()}
                            workflowState={data?.workflow_state}
                            reimbursementForId={data?.reimbursement_for_id}
                        />
                    )}
                    {doctype === "Cancellation Request" && name && (
                        <CancellationRequestWorkflowActions
                            docname={name}
                            onActionComplete={() => window.location.reload()}
                        />
                    )}
                    {doctype === "Fund Sanction" && name && !cancellationStatus?.message?.has_pending && (
                        <FundSanctionWorkflowActions
                            docname={name}
                            onActionComplete={() => window.location.reload()}
                            blockForward={isRnDStaff && (!(data?.is_the_account_type_pfms || fsProjectRegData?.is_the_account_type_pfms) || !data?.sanctioned_letter_no)}
                        />
                    )}
                    {doctype === "Travel" && name && !cancellationStatus?.message?.has_pending && (
                        <TravelWorkflowActions
                            docname={name}
                            onActionComplete={() => window.location.reload()}
                        />
                    )}
                    {doctype === "Temporary Advance" && name && !cancellationStatus?.message?.has_pending && (
                        <div className="flex items-center gap-3">
                            {isRnDStaff && (
                                <button
                                    onClick={handlePrintTemporaryAdvance}
                                    className="inline-flex items-center justify-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-sm transition-all"
                                    title="Print Temporary Advance"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print
                                </button>
                            )}
                            <TemporaryAdvanceActionButtons
                                docname={name}
                                onActionComplete={() => window.location.reload()}
                                commitRequired={isRnDStaff && isCommittedForGate === false}
                            />
                        </div>
                    )}
                    {doctype === "Direct Purchase" && name && !cancellationStatus?.message?.has_pending && (
                        <DirectPurchaseWorkflowActions
                            docname={name}
                            onActionComplete={() => { }}
                            onAfterAction={(action) => {
                                if (action.toLowerCase().includes("verify")) {
                                    setDpActiveTab("sanction");
                                }
                                refreshAll();
                            }}
                        />
                    )}
                    {doctype === "TA DA Settlement" && name && !cancellationStatus?.message?.has_pending && (
                        <TADASettlementActionButtons
                            docName={name}
                            onActionComplete={() => window.location.reload()}
                        />
                    )}
                    {doctype === "Recruitment Adhoc Contractual" && name && !cancellationStatus?.message?.has_pending && (
                        <RecruitmentAdhocContractualWorkflowActions
                            docname={name}
                            onActionComplete={() => window.location.reload()}
                            commitRequired={isRnDStaff && isCommittedForGate === false}
                        />
                    )}
                    {doctype === "Top Up Fellowship" && name && (
                        <TopUpFellowshipWorkflowActions
                            docname={name}
                            onActionComplete={() => window.location.reload()}
                            commitRequired={isRnDStaff && isCommittedForGate === false}
                        />
                    )}
                    {doctype === "Leave Module" && name && (
                        <LeaveModuleActionButtons
                            docName={name}
                            onActionComplete={() => window.location.reload()}
                        />
                    )}
                </PageHeader>

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
                                    <TravelApplicantSummary
                                        className="mb-6"
                                        webmail={data?.webmail_id_travel}
                                        fullName={data?.applicant_name_travel}
                                        department={data?.department_travel}
                                        designation={data?.designation_travel}
                                        projectNo={data?.travel_project_number}
                                    />
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
                                        fields={temporaryAdvanceFields.filter(f => f.fieldname !== 'applying_for_select')}
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
                                        fields={tadaProcessedFields}
                                        formData={tadaDisplayData}
                                        linkOptions={tadaLinkOptions}
                                        onChange={handleTadaOfficeUseChange}
                                        onFileChange={() => { }}
                                        onTableRowChange={() => { }}
                                        onTableFileChange={() => { }}
                                        onAddTableRow={() => { }}
                                        onDeleteTableRow={() => { }}
                                        readOnly={!tadaOfficeUseEditable}
                                    />
                                    {tadaOfficeUseEditable && (
                                        <div className="mt-6 flex flex-col items-end gap-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                                            <button
                                                onClick={handleSaveTadaOfficeUse}
                                                disabled={isSavingTadaOfficeUse}
                                                className="inline-flex items-center justify-center gap-2 h-9 px-5 text-xs font-bold uppercase tracking-wide rounded-lg bg-[#D97757] text-white hover:bg-opacity-90 shadow-sm transition-all disabled:opacity-50"
                                            >
                                                {isSavingTadaOfficeUse ? "Saving..." : "Save Office Use Details"}
                                            </button>
                                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                                Save these figures before forwarding this settlement.
                                            </p>
                                        </div>
                                    )}
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
                                                                        setErrorModal({
                                                                            open: true,
                                                                            title: "Update Failed",
                                                                            message: parseFrappeError({ message: res?.message?.message || "Failed to update chairperson fields." }, res?.message),
                                                                        });
                                                                    }
                                                                } catch (err: any) {
                                                                    setErrorModal({
                                                                        open: true,
                                                                        title: "Update Failed",
                                                                        message: parseFrappeError(err),
                                                                    });
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
                                    <div className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-5 py-4">
                                        <p className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.12em] mb-1.5">Total Sanctioned</p>
                                        <p className="text-2xl font-bold text-[#D97757]">
                                            {(data.total_sanctioned_amount || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-5 py-4">
                                        <p className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.12em] mb-1.5">Letter No</p>
                                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{data.sanctioned_letter_no || '—'}</p>
                                    </div>
                                    <div className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-5 py-4">
                                        <p className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.12em] mb-1.5">Letter Date</p>
                                        <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">{data.sanctioned_letter_date || '—'}</p>
                                    </div>
                                </div>

                                {/* Core Details */}
                                <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                                        <h3 className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-[0.1em]">Sanction Details</h3>
                                    </div>
                                    <div className="p-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
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
                                            <div key={label} className="rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-3 py-2.5 min-h-[64px]">
                                                <p className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.12em] mb-1">{label}</p>
                                                <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] leading-snug break-words">{String(value)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Budget Breakup Table */}
                                {(data.sanctioned_budget_breakup?.length > 0 || canEditFsAccountDetails) && (
                                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] flex items-center justify-between">
                                            <h3 className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-[0.1em]">Sanctioned Budget Breakup</h3>
                                            {canEditFsAccountDetails && !isEditingBudget && (
                                                <button
                                                    type="button"
                                                    onClick={startEditBudget}
                                                    className="inline-flex items-center gap-1.5 h-7 px-3 text-[11px] font-bold uppercase tracking-wide rounded-lg bg-[#D97757]/10 hover:bg-[#D97757]/20 text-[#D97757] border border-[#D97757]/30 transition-colors"
                                                >
                                                    <PencilIcon className="h-3 w-3" />
                                                    Edit
                                                </button>
                                            )}
                                            {canEditFsAccountDetails && isEditingBudget && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={cancelEditBudget}
                                                        disabled={isSavingBudget}
                                                        className="inline-flex items-center gap-1 h-7 px-3 text-[11px] font-bold uppercase tracking-wide rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors"
                                                    >
                                                        <XIcon className="h-3 w-3" />
                                                        Cancel
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowBudgetCommentModal(true)}
                                                        disabled={isSavingBudget}
                                                        className="inline-flex items-center gap-1 h-7 px-3 text-[11px] font-bold uppercase tracking-wide rounded-lg bg-[#D97757] hover:bg-[#c5684a] text-white disabled:opacity-50 transition-colors"
                                                    >
                                                        <SaveIcon className="h-3 w-3" />
                                                        {isSavingBudget ? 'Saving…' : 'Save'}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="p-4 space-y-3">
                                            {budgetMsg && (
                                                <div className={`px-3 py-2 rounded-lg text-[12px] font-medium ${budgetMsg.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'}`}>
                                                    {budgetMsg.text}
                                                </div>
                                            )}
                                            {isEditingBudget ? (
                                                <div className="space-y-3">
                                                    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                                        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                                                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                                                <tr>
                                                                    <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Budget Head</th>
                                                                    {(['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5']).map(y => (
                                                                        <th key={y} className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">{y}</th>
                                                                    ))}
                                                                    <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Total</th>
                                                                    <th className="px-3 py-2 w-8" />
                                                                </tr>
                                                            </thead>
                                                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                                                                {editBudgetRows.map((row, idx) => {
                                                                    const yearKeys = ['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'] as const;
                                                                    const rowTotal = yearKeys.reduce((s, k) => s + (row[k] || 0), 0);
                                                                    return (
                                                                        <tr key={idx}>
                                                                            <td className="px-2 py-1.5">
                                                                                <select
                                                                                    className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1 text-xs"
                                                                                    value={row.account_head}
                                                                                    onChange={e => {
                                                                                        const updated = [...editBudgetRows];
                                                                                        updated[idx] = { ...updated[idx], account_head: e.target.value };
                                                                                        setEditBudgetRows(updated);
                                                                                    }}
                                                                                >
                                                                                    <option value="">— Select —</option>
                                                                                    {budgetHeadList.map(bh => <option key={bh} value={bh}>{bh}</option>)}
                                                                                </select>
                                                                            </td>
                                                                            {yearKeys.map(k => (
                                                                                <td key={k} className="px-2 py-1.5">
                                                                                    <input
                                                                                        type="text"
                                                                                        inputMode="numeric"
                                                                                        className="w-24 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1 text-xs text-right"
                                                                                        value={row[k] || ''}
                                                                                        onChange={e => {
                                                                                            const updated = [...editBudgetRows];
                                                                                            updated[idx] = { ...updated[idx], [k]: Number(e.target.value) };
                                                                                            setEditBudgetRows(updated);
                                                                                        }}
                                                                                    />
                                                                                </td>
                                                                            ))}
                                                                            <td className="px-2 py-1.5 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                                                                {rowTotal.toLocaleString('en-IN')}
                                                                            </td>
                                                                            <td className="px-2 py-1.5">
                                                                                <button
                                                                                    type="button"
                                                                                    className="text-zinc-400 hover:text-red-500"
                                                                                    onClick={() => setEditBudgetRows(editBudgetRows.filter((_, i) => i !== idx))}
                                                                                >
                                                                                    <XIcon className="h-3.5 w-3.5" />
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                            <tfoot className="bg-zinc-100 dark:bg-zinc-800">
                                                                <tr>
                                                                    <td className="px-3 py-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">Total</td>
                                                                    {(['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'] as const).map(k => (
                                                                        <td key={k} className="px-3 py-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 text-right">
                                                                            {editBudgetRows.reduce((s, r) => s + (r[k] || 0), 0).toLocaleString('en-IN')}
                                                                        </td>
                                                                    ))}
                                                                    <td className="px-3 py-2 text-xs font-bold text-[#D97757] text-right">
                                                                        ₹ {editBudgetRows.reduce((s, r) => s + r.first_year_budget + r.second_year_budget + r.third_year_budget + r.fourth_year_budget + r.fifth_year_budget, 0).toLocaleString('en-IN')}
                                                                    </td>
                                                                    <td />
                                                                </tr>
                                                            </tfoot>
                                                        </table>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditBudgetRows([...editBudgetRows, { account_head: '', first_year_budget: 0, second_year_budget: 0, third_year_budget: 0, fourth_year_budget: 0, fifth_year_budget: 0 }])}
                                                        className="inline-flex items-center gap-1 h-7 px-3 text-[11px] font-bold uppercase tracking-wide rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                                    >
                                                        + Add Row
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg overflow-hidden">
                                                        <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                                            <tr className="border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30">
                                                                <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Account Head</th>
                                                                {['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Total'].map(h => (
                                                                    <th key={h} className="px-4 py-3 text-right text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25 last:border-r-0">{h}</th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(data.sanctioned_budget_breakup || []).map((row: any, idx: number) => {
                                                                const rowTotal = ['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget']
                                                                    .reduce((s, k) => s + (parseFloat(row[k]) || 0), 0);
                                                                return (
                                                                    <tr key={idx} className="hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]/40 transition-colors border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-b-0">
                                                                        <td className="px-4 py-3 text-xs font-medium text-zinc-900 dark:text-zinc-100 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80 font-mono">{row.account_head}</td>
                                                                        {['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'].map(k => (
                                                                            <td key={k} className="px-4 py-3 text-xs text-right tabular-nums text-zinc-600 dark:text-zinc-300 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                                                {parseFloat(row[k]) ? Number(row[k]).toLocaleString('en-IN') : '—'}
                                                                            </td>
                                                                        ))}
                                                                        <td className="px-4 py-3 text-xs text-right tabular-nums font-bold text-zinc-900 dark:text-zinc-100">
                                                                            {rowTotal ? rowTotal.toLocaleString('en-IN') : '—'}
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                        {(() => {
                                                            const years = ['first_year_budget', 'second_year_budget', 'third_year_budget', 'fourth_year_budget', 'fifth_year_budget'];
                                                            const colTotals = years.map(k => (data.sanctioned_budget_breakup || []).reduce((s: number, r: any) => s + (parseFloat(r[k]) || 0), 0));
                                                            const grand = colTotals.reduce((a: number, b: number) => a + b, 0);
                                                            return (
                                                                <tfoot className="bg-[#FAFAF9] dark:bg-[#18181B] border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                                                    <tr>
                                                                        <td className="px-4 py-3 text-xs font-bold text-zinc-900 dark:text-zinc-100 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">TOTAL</td>
                                                                        {colTotals.map((t: number, i: number) => (
                                                                            <td key={i} className="px-4 py-3 text-xs font-bold text-right tabular-nums text-zinc-900 dark:text-zinc-100 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                                                {t ? t.toLocaleString('en-IN') : '—'}
                                                                            </td>
                                                                        ))}
                                                                        <td className="px-4 py-3 text-xs font-bold text-right tabular-nums text-[#D97757] font-mono">₹ {grand.toLocaleString('en-IN')}</td>
                                                                    </tr>
                                                                </tfoot>
                                                            );
                                                        })()}
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <CommentModal
                                    isOpen={showBudgetCommentModal}
                                    onClose={() => setShowBudgetCommentModal(false)}
                                    onSubmit={saveBudget}
                                    action="Save Budget Breakup"
                                    isLoading={isSavingBudget}
                                />

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
                                <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl shadow-sm overflow-hidden">
                                    <div className="px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                                        <h3 className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-[0.1em]">Account Details</h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {canEditFsAccountDetails ? (
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

                                {/* Sanction Files — editable only for staff, RnD */}
                                {canEditFsAccountDetails && (
                                    <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl shadow-sm overflow-hidden">
                                        <div className="px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] flex items-center justify-between">
                                            <h3 className="text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-[0.1em]">Sanction Files</h3>
                                            <button
                                                type="button"
                                                onClick={() => fsFileInputRef.current?.click()}
                                                className="inline-flex items-center gap-1.5 h-8 px-3 text-[11px] font-bold uppercase tracking-wide rounded-lg bg-[#D97757]/10 hover:bg-[#D97757]/20 text-[#D97757] border border-[#D97757]/30 transition-colors"
                                            >
                                                <PencilIcon className="h-3 w-3" />
                                                Add File
                                            </button>
                                            <input
                                                ref={fsFileInputRef}
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                                onChange={handleFsFileAdd}
                                            />
                                        </div>
                                        <div className="p-5 space-y-3">
                                            {fsFilesMsg && (
                                                <div className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium",
                                                    fsFilesMsg.type === 'success'
                                                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                                                        : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800",
                                                )}>
                                                    {fsFilesMsg.text}
                                                </div>
                                            )}
                                            {fsFiles.length === 0 ? (
                                                <p className="text-[12px] text-zinc-400 dark:text-zinc-500 py-2">No sanction files attached. Click "Add File" to upload.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {fsFiles.map((row, idx) => (
                                                        <div key={row._key} className="flex items-start gap-2 p-3 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                                            <FileIcon className="h-4 w-4 text-[#D97757] mt-0.5 shrink-0" />
                                                            <div className="flex-1 min-w-0 space-y-1">
                                                                {row.is_new ? (
                                                                    <p className="text-[12px] font-mono text-zinc-600 dark:text-zinc-300 truncate">{row.filename}</p>
                                                                ) : (
                                                                    <a
                                                                        href={getFileUrl(row.sanction_file)}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-1 text-[12px] font-medium text-[#D97757] hover:underline truncate"
                                                                    >
                                                                        {row.sanction_file.split('/').pop() || row.sanction_file}
                                                                        <ExternalLinkIcon className="h-3 w-3 opacity-60 shrink-0" />
                                                                    </a>
                                                                )}
                                                                <input
                                                                    type="text"
                                                                    placeholder="Description (optional)"
                                                                    value={row.description}
                                                                    onChange={e => setFsFiles(prev => prev.map((f, i) => i === idx ? { ...f, description: e.target.value } : f))}
                                                                    className="w-full h-7 px-2 text-[12px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-[#D97757]/30 focus:border-[#D97757]"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => setFsFiles(prev => prev.filter((_, i) => i !== idx))}
                                                                className="p-1 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
                                                                title="Remove file"
                                                            >
                                                                <XIcon className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="flex justify-end pt-1">
                                                <button
                                                    type="button"
                                                    onClick={handleSaveFsFiles}
                                                    disabled={isSavingFsFiles}
                                                    className="h-9 px-5 bg-[#D97757] hover:bg-[#c5684a] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-[12px] uppercase tracking-wide rounded-lg transition-colors"
                                                >
                                                    {isSavingFsFiles ? 'Saving…' : 'Save Files'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
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
                                data?.project_code && (
                                    <BudgetActionsSidebar
                                        projectName={data.project_code}
                                        isStaff={true}
                                        docName={name}
                                        doctype={doctype}
                                        onStagingStatusChange={setIsCommittedForGate}
                                        showPayment={false}
                                        billAmount={data.amount ?? data.amount_applied}
                                        defaultBudgetHead={resolvedAccountHead || data.account_head}
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
                                        billAmount={data?.ta_da_total_claimed ?? data?.total_claimed ?? undefined}
                                        defaultBudgetHead={resolvedTadaAccountHead || undefined}
                                        commitAmountNote="For TA/DA Settlement, the commitment amount is the new total commitment amount (Total Amount Claimed), not the difference from the amount already committed at the time of travel advance."
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
                            {/* Original Commitment Display for Cancellation Requests */}
                            {doctype === "Cancellation Request" && (
                                <OriginalCommitmentSidebar
                                    refName={data?.reference_name}
                                    refDoctype={data?.reference_doctype}
                                />
                            )}

                        </div>
                    </div>
                </div>

            </main>

            {name && doctype && (
                <FloatingActivityLogButton doctype={doctype} docname={name} />
            )}

            {/* Project Registration Preview Modal */}
            {prPreviewName && (
                <ProjectPreviewModal
                    projectName={prPreviewName}
                    onClose={() => setPrPreviewName(null)}
                />
            )}

            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default PendingTaskDetails;
