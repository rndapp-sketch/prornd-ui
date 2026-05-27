import React, { useState } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { disbursalOfHonorariumAPI } from "@/services/apiService";

interface DisbursalOfHonorariumActionButtonsProps {
  docname: string;
  onActionComplete: () => void;
  /** When true, all action buttons are disabled until a commitment exists (Staff RnD gate) */
  commitRequired?: boolean;
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
          Confirm {action}
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

const DisbursalOfHonorariumActionButtons = ({
  docname,
  onActionComplete,
  commitRequired = false,
}: DisbursalOfHonorariumActionButtonsProps) => {
  const { data, isLoading: actionsLoading } = useFrappeGetCall<{
    message: string[];
  }>(disbursalOfHonorariumAPI.getWorkflowActions, { docname });

  const { call: performAction, loading: actionLoading } = useFrappePostCall(
    disbursalOfHonorariumAPI.performAction,
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState("");

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
      {commitRequired && (
        <div className="mb-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 font-medium">
          A commitment must be submitted before forwarding this application.
        </div>
      )}
      <div className="flex gap-2 flex-wrap">
        {data.message.map((action) => (
          <button
            key={action}
            onClick={() => handleActionClick(action)}
            disabled={actionLoading || commitRequired}
            title={commitRequired ? "Submit a commitment first" : undefined}
            className={cn(
              "px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 border",
              commitRequired
                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700 cursor-not-allowed"
                : "bg-[#D97757] hover:bg-[#c66a4e] text-white",
              actionLoading && "opacity-50 cursor-not-allowed",
            )}
          >
            {actionLoading ? "Processing..." : action}
          </button>
        ))}
      </div>
      <CommentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleConfirmAction}
        action={selectedAction}
        isLoading={actionLoading ?? false}
      />
    </>
  );
};

export default DisbursalOfHonorariumActionButtons;
