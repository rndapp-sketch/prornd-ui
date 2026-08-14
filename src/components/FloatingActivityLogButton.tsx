import React, { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";
import { ActivityLog, clearActivityLogCache } from "@/components/ActivityLog";
import { useFrappePostCall } from "frappe-react-sdk";

interface FloatingActivityLogButtonProps {
  doctype: string;
  docname: string;
}

export const FloatingActivityLogButton: React.FC<FloatingActivityLogButtonProps> = ({
  doctype,
  docname,
}) => {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { call: addComment } = useFrappePostCall(
    "rndopsapp.rndopsapp.api.add_project_comment"
  );

  const handleSubmit = async () => {
    if (!comment.trim() || !docname) return;
    setIsSubmitting(true);
    try {
      await addComment({ doctype, docname, content: comment.trim() });
      setComment("");
      clearActivityLogCache(doctype, docname);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-8 right-7 z-40 flex h-11 items-center gap-2 rounded-full border border-[#4A6CF7]/30 bg-white/95 px-3.5 text-[#1E3A8A] shadow-lg shadow-[#18181B]/10 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-[#4A6CF7]/50 hover:bg-[#EEF2FF] dark:border-[#4A6CF7]/35 dark:bg-[#27272A]/95 dark:text-[#C7D2FE]"
        aria-label="Open Activity Log"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4A6CF7] text-white shadow-sm">
          <MessageSquare className="h-4 w-4" />
        </span>
        <span className="hidden text-[12px] font-extrabold uppercase tracking-wide md:block">
          Activity Log
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="Close Activity Log"
          />
          <aside className="relative flex h-full w-full max-w-md animate-in slide-in-from-right duration-300 flex-col overflow-hidden bg-white shadow-2xl dark:bg-[#27272A]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-[#FAFAF9] p-4 dark:border-[#3F3F46] dark:bg-[#18181B]">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-[#2563EB] dark:bg-blue-950/30 dark:text-blue-300">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                  Activity Log
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-[#71717A] transition-colors hover:bg-zinc-100 hover:text-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#3F3F46] dark:hover:text-[#E4E4E7]"
                aria-label="Close Activity Log"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Activity list */}
            <div className="flex-1 overflow-y-auto bg-[#FAFAF9] p-4 dark:bg-[#18181B]">
              <ActivityLog key={refreshKey} doctype={doctype} docname={docname} maxHeight="100%" />
            </div>

            {/* Add comment */}
            <div className="border-t border-[#E4E4E7] bg-white p-4 dark:border-[#3F3F46] dark:bg-[#27272A]">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] mb-2">
                Add Comment
              </p>
              <textarea
                rows={3}
                placeholder="Type your comment…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit();
                }}
                disabled={isSubmitting}
                className="w-full resize-none rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-3 py-2 text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#A1A1AA] focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/25 focus:border-[#4A6CF7] transition-colors disabled:opacity-60 mb-2"
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !comment.trim()}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#4A6CF7] px-4 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#3B5CF5] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
                {isSubmitting ? "Submitting…" : "Submit Comment"}
              </button>
              <p className="mt-1.5 text-center text-[10px] text-zinc-400 dark:text-zinc-600">
                Ctrl + Enter to submit
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default FloatingActivityLogButton;
