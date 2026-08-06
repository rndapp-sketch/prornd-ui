import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { ChevronDown, CheckCircle, XCircle, ChevronRight, CornerUpLeft, FileDown } from "lucide-react";
import { ErrorModal } from "./ErrorModal";
import { parseFrappeError } from "../utils/errorUtils";

interface Props {
    docname: string;
    onActionComplete: () => void;
    commitRequired?: boolean;
    sentToFa?: boolean;
    hasFacultyPdf?: boolean;
    facultyPdfUrl?: string;
}

const CommentModal = ({
    isOpen, onClose, onSubmit, action, isLoading,
}: {
    isOpen: boolean; onClose: () => void;
    onSubmit: (comment: string) => void;
    action: string; isLoading: boolean;
}) => {
    const [comment, setComment] = useState("");
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                    Confirm: {action}
                </h3>
                <textarea
                    className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(217,119,87,0.25)] focus:border-[#D97757] dark:bg-zinc-800 dark:text-zinc-100"
                    rows={4}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] hover:bg-[#c66a4e] text-white disabled:opacity-50"
                    >
                        {isLoading ? "Processing..." : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
};

const TopUpFellowshipActionButtons: React.FC<Props> = ({
    docname,
    onActionComplete,
    commitRequired = false,
    sentToFa = false,
    hasFacultyPdf = false,
    facultyPdfUrl = "",
}) => {
    const { data: actionsData, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_top_up_fellowship_workflow_actions",
        { docname },
    );

    const { data: docData, isLoading: docLoading } = useFrappeGetCall<{ message: any }>(
        "frappe.client.get",
        { doctype: "Top Up Fellowship", name: docname },
    );

    const { data: backData, mutate: refreshBack } = useFrappeGetCall<{
        message: { actions: { target: string; label: string; next_state: string }[] };
    }>(
        "rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.get_available_back_actions",
        { docname },
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.perform_top_up_fellowship_action",
    );
    const { call: markSendToFa, loading: markLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.mark_send_to_faculty_admission",
    );
    const { call: putBack, loading: putBackLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.top_up_fellowship.top_up_fellowship.put_back",
    );

    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");
    const [isPutBack, setIsPutBack] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState("");
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });
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

    const handleToggleDropdown = () => {
        if (!dropdownOpen && toggleBtnRef.current) {
            const rect = toggleBtnRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
        }
        setDropdownOpen((o) => !o);
    };

    const handleWorkflowClick = (action: string) => {
        setDropdownOpen(false);
        setIsPutBack(false);
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handlePutBackClick = (target: string, label: string) => {
        setDropdownOpen(false);
        setIsPutBack(true);
        setSelectedTarget(target);
        setSelectedAction(label);
        setModalOpen(true);
    };

    const handleSendToFa = async () => {
        setDropdownOpen(false);
        try {
            const res: any = await markSendToFa({ docname });
            if (res?.message?.status === "error") {
                alert(res.message.message || "Could not mark as sent.");
                return;
            }
            const url = `/api/method/frappe.utils.print_format.download_pdf?doctype=${encodeURIComponent("Top Up Fellowship")}&name=${encodeURIComponent(docname)}&format=Standard&no_letterhead=0`;
            window.open(url, "_blank");
            onActionComplete();
        } catch (err: any) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(err) });
        }
    };

    const handleConfirmAction = async (comment: string) => {
        try {
            if (isPutBack) {
                const res: any = await putBack({ docname, target: selectedTarget, comment: comment || undefined });
                if (res?.message?.status === "error") {
                    alert(res.message.message || `${selectedAction} failed.`);
                    return;
                }
                refreshBack();
            } else {
                const res: any = await performAction({ docname, action: selectedAction, comment: comment || undefined });
                if (res?.message?.status === "error") {
                    alert(res.message.message || `Action "${selectedAction}" failed.`);
                    return;
                }
            }
            setModalOpen(false);
            onActionComplete();
        } catch (err: any) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(err) });
        }
    };

    const docState: string = docData?.message?.workflow_state || "";
    const isPendingStaff = docState === "Pending Staff Approval";
    const effectiveSentToFa = sentToFa || !!docData?.message?.send_to_faculty_admission;
    const effectiveFacultyPdfUrl = facultyPdfUrl || docData?.message?.faculty_admission_pdf || "";
    const effectiveHasFacultyPdf = hasFacultyPdf || !!(effectiveFacultyPdfUrl && String(effectiveFacultyPdfUrl).trim());

    const workflowActions: string[] = actionsData?.message || [];
    const backActions: { target: string; label: string; next_state: string }[] =
        (backData?.message as any)?.actions || [];

    const categorise = (action: string) => {
        const a = action.toLowerCase();
        if (a.includes("forward") || a.includes("approve") || a.includes("submit")) return "forward";
        if (a.includes("reject")) return "reject";
        return "neutral";
    };

    const itemStyle = (action: string) => {
        const cat = categorise(action);
        if (cat === "forward") return {
            icon: <CheckCircle className="h-3.5 w-3.5" />,
            cls: "text-[#D97757] hover:bg-orange-50 dark:hover:bg-orange-900/20",
            iconCls: "text-[#D97757]",
        };
        if (cat === "reject") return {
            icon: <XCircle className="h-3.5 w-3.5" />,
            cls: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
            iconCls: "text-red-500",
        };
        return {
            icon: <ChevronRight className="h-3.5 w-3.5" />,
            cls: "text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-zinc-700",
            iconCls: "text-zinc-400 dark:text-zinc-500",
        };
    };

    // For Pending Staff Approval — filter based on Faculty PDF stage
    const filteredActions = isPendingStaff
        ? workflowActions.filter((a) => {
            const al = a.toLowerCase();
            const isForwardLike = al === "forward" || al === "submit" || al === "approve";
            // Forward only allowed when faculty PDF is uploaded and commit is done
            if (isForwardLike && (!effectiveHasFacultyPdf || commitRequired)) return false;
            // Hide forward/approve if no FA PDF stage yet
            if (!effectiveSentToFa && isForwardLike) return false;
            return true;
        })
        : workflowActions;

    const forwardActions = filteredActions.filter((a) => categorise(a) === "forward");
    const neutralActions = filteredActions.filter((a) => categorise(a) === "neutral");
    const rejectActions = filteredActions.filter((a) => categorise(a) === "reject");

    const showSendToFa = isPendingStaff && !effectiveSentToFa;
    const showFacultyPdfLink = isPendingStaff && effectiveSentToFa && effectiveHasFacultyPdf;

    const isLoading = actionsLoading || docLoading || actionLoading || markLoading || putBackLoading;
    const hasActions =
        showSendToFa || forwardActions.length > 0 || neutralActions.length > 0 ||
        rejectActions.length > 0 || backActions.length > 0;

    if (!hasActions && !actionsLoading) return null;

    return (
        <>
            {showFacultyPdfLink && (
                <a
                    href={effectiveFacultyPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                >
                    <FileDown className="h-3.5 w-3.5" />
                    Faculty Admission PDF
                </a>
            )}

            <div className="relative">
                <button
                    ref={toggleBtnRef}
                    onClick={handleToggleDropdown}
                    disabled={isLoading}
                    className={cn(
                        "inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all disabled:opacity-50",
                        dropdownOpen
                            ? "bg-[#D97757] text-white border border-[#c66a4e]"
                            : "bg-[#FFF7ED] dark:bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/40 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757]/30",
                    )}
                >
                    {isLoading ? "Processing…" : "Actions"}
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-150", dropdownOpen && "rotate-180")} />
                </button>

                {dropdownOpen && createPortal(
                    <div
                        ref={dropdownPortalRef}
                        style={{ position: "absolute", top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
                        className="min-w-[220px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-700">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                                Actions
                            </span>
                        </div>

                        {commitRequired && (
                            <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                A commitment must be submitted before proceeding.
                            </div>
                        )}

                        {showSendToFa && (
                            <button
                                onClick={handleSendToFa}
                                disabled={markLoading}
                                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left text-[#D97757] hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                            >
                                <FileDown className="h-3.5 w-3.5 text-[#D97757]" />
                                Send to Faculty Admission
                            </button>
                        )}

                        {isPendingStaff && effectiveSentToFa && !effectiveHasFacultyPdf && (
                            <div className="mx-3 my-2 px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/40 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                                Waiting for Faculty Admission upload…
                            </div>
                        )}

                        {[forwardActions, neutralActions, rejectActions]
                            .filter((g) => g.length > 0)
                            .map((group, gi) => (
                                <React.Fragment key={gi}>
                                    {(gi > 0 || showSendToFa) && <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />}
                                    {group.map((action) => {
                                        const blockedByCommit = commitRequired && categorise(action) === "forward";
                                        const { icon, cls, iconCls } = itemStyle(action);
                                        return (
                                            <button
                                                key={action}
                                                onClick={() => { if (!blockedByCommit) handleWorkflowClick(action); }}
                                                disabled={actionLoading || blockedByCommit}
                                                className={cn(
                                                    "w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors",
                                                    blockedByCommit
                                                        ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                                                        : cls,
                                                )}
                                            >
                                                <span className={blockedByCommit ? "text-zinc-300 dark:text-zinc-600" : iconCls}>
                                                    {icon}
                                                </span>
                                                {action}
                                            </button>
                                        );
                                    })}
                                </React.Fragment>
                            ))}

                        {backActions.length > 0 && (
                            <>
                                <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />
                                <div className="px-4 py-1.5">
                                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                                        Put Back
                                    </span>
                                </div>
                                {backActions.map((ba) => (
                                    <button
                                        key={ba.target}
                                        onClick={() => handlePutBackClick(ba.target, ba.label)}
                                        disabled={putBackLoading}
                                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                                    >
                                        <CornerUpLeft className="h-3.5 w-3.5 text-zinc-400" />
                                        {ba.label}
                                    </button>
                                ))}
                            </>
                        )}
                    </div>,
                    document.body,
                )}
            </div>

            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmAction}
                action={selectedAction}
                isLoading={actionLoading || putBackLoading}
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

export default TopUpFellowshipActionButtons;
