import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { indentGeneralFormAPI } from "@/services/apiService";
import { ChevronDown, CheckCircle, XCircle, ChevronRight, CornerUpLeft } from "lucide-react";

interface Props {
  docname: string;
  onActionComplete: () => void;
  commitRequired?: boolean;
  directorPdfBlocked?: boolean;
  hideForwardActions?: boolean;
}

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

const IndentGeneralFormActionButtons = ({
  docname,
  onActionComplete,
  commitRequired = false,
  directorPdfBlocked = false,
  hideForwardActions = false,
}: Props) => {
  const { data, isLoading: actionsLoading } = useFrappeGetCall<{
    message: string[] | { actions?: string[] };
  }>(indentGeneralFormAPI.getWorkflowActions, { docname });

  const { data: backData } = useFrappeGetCall<{
    message: { actions: { target: string; label: string; next_state: string }[] };
  }>(indentGeneralFormAPI.getAvailableBackActions, { docname });

  const { call: performAction, loading: actionLoading } = useFrappePostCall(
    indentGeneralFormAPI.performAction,
  );

  const { call: putBack, loading: putBackLoading } = useFrappePostCall(
    indentGeneralFormAPI.putBack,
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");
  const [isPutBack, setIsPutBack] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState("");
  const toggleBtnRef = React.useRef<HTMLButtonElement>(null);
  const dropdownPortalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !toggleBtnRef.current?.contains(target) &&
        !dropdownPortalRef.current?.contains(target)
      ) {
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

  const handleConfirmAction = async (comment: string) => {
    try {
      if (isPutBack) {
        await putBack({ docname, target: selectedTarget, comment });
      } else {
        await performAction({ docname, action: selectedAction, comment });
      }
      setModalOpen(false);
      onActionComplete();
    } catch (error) {
      console.error("Error performing action:", error);
    }
  };

  const raw = data?.message;
  const workflowActions: string[] = Array.isArray(raw)
    ? raw
    : (raw as any)?.actions || [];

  const backActions: { target: string; label: string; next_state: string }[] =
    (backData?.message as any)?.actions || [];

  const categorise = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes("forward") || a.includes("approve")) return "forward";
    if (a.includes("reject")) return "reject";
    return "neutral";
  };

  const forwardActions = hideForwardActions ? [] : workflowActions.filter((a) => categorise(a) === "forward");
  const neutralActions = workflowActions.filter((a) => categorise(a) === "neutral");
  const rejectActions = workflowActions.filter((a) => categorise(a) === "reject");

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

  const isLoading = actionsLoading || actionLoading || putBackLoading;
  const hasActions = forwardActions.length > 0 || neutralActions.length > 0 || rejectActions.length > 0 || backActions.length > 0;

  if (!hasActions && !actionsLoading) return null;

  return (
    <>
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
            className="min-w-[210px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
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

            {directorPdfBlocked && (
              <div className="mx-3 mt-3 mb-1 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                Director-signed PDF must be uploaded before approving.
              </div>
            )}

            {[forwardActions, neutralActions, rejectActions]
              .filter((g) => g.length > 0)
              .map((group, gi) => (
                <React.Fragment key={gi}>
                  {gi > 0 && <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />}
                  {group.map((action) => {
                    const blockedByCommit = commitRequired && categorise(action) === "forward";
                    const blockedByPdf = directorPdfBlocked && categorise(action) === "forward";
                    const blocked = blockedByCommit || blockedByPdf;
                    const { icon, cls, iconCls } = itemStyle(action);
                    return (
                      <button
                        key={action}
                        onClick={() => { if (!blocked) handleWorkflowClick(action); }}
                        disabled={actionLoading || blocked}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors",
                          blocked
                            ? "text-zinc-300 dark:text-zinc-600 cursor-not-allowed"
                            : cls,
                        )}
                      >
                        <span className={blocked ? "text-zinc-300 dark:text-zinc-600" : iconCls}>
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
    </>
  );
};

export default IndentGeneralFormActionButtons;
