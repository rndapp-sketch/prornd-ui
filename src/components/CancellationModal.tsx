import React, { useState } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import { X, AlertTriangle, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CancellationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    doctype: string;
    docname: string;
    title?: string;
    currentStatus?: string;
}

export const CancellationModal: React.FC<CancellationModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    doctype,
    docname,
    title,
    currentStatus,
}) => {
    const [reason, setReason] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { call: createCancellation } = useFrappePostCall(
        "rndopsapp.rndopsapp.cancellation_api.create_cancellation_request"
    );

    const handleSubmit = async () => {
        if (!reason.trim()) {
            setError("Please provide a reason for cancellation.");
            return;
        }
        if (reason.trim().length < 10) {
            setError("Please provide a more detailed reason (at least 10 characters).");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await createCancellation({
                reference_doctype: doctype,
                reference_name: docname,
                cancellation_reason: reason.trim(),
            });

            if (res?.message?.status === "error") {
                setError(res.message.message || "Failed to create cancellation request.");
                setIsSubmitting(false);
                return;
            }

            // Success
            setReason("");
            setError(null);
            setIsSubmitting(false);
            onSuccess();
        } catch (err: any) {
            const msg =
                err?.message ||
                err?._server_messages?.[0] ||
                "An error occurred. Please try again.";
            // Try to parse Frappe server message
            let displayMsg = msg;
            try {
                const parsed = JSON.parse(msg);
                displayMsg = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
                // Frappe often wraps in another JSON
                try {
                    displayMsg = JSON.parse(displayMsg);
                } catch {
                    // already a string
                }
            } catch {
                // not JSON
            }
            setError(String(displayMsg));
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        if (isSubmitting) return;
        setReason("");
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg mx-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-2xl overflow-hidden">
                    {/* Top accent */}
                    <div className="h-[3px] bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />

                    {/* Header */}
                    <div className="flex items-start justify-between px-6 pt-5 pb-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-[16px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                    Request Cancellation
                                </h2>
                                <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                                    This will create a cancellation request that follows the same
                                    approval workflow.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="p-1.5 rounded-lg text-[#71717A] hover:text-[#3F3F46] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] transition-colors disabled:opacity-50"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Document Info */}
                    <div className="px-6 pb-4">
                        <div className="bg-[#FAFAF9] dark:bg-[#18181B] rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] p-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#A1A1AA]">
                                        Module
                                    </span>
                                    <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mt-0.5">
                                        {doctype}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#A1A1AA]">
                                        Current Status
                                    </span>
                                    <p className="mt-0.5">
                                        <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40">
                                            {currentStatus || "Pending"}
                                        </span>
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#A1A1AA]">
                                        Document
                                    </span>
                                    <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] mt-0.5 break-all">
                                        {title || docname}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Reason Input */}
                    <div className="px-6 pb-4">
                        <label
                            htmlFor="cancel-reason"
                            className="block text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-2"
                        >
                            Reason for Cancellation{" "}
                            <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="cancel-reason"
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                if (error) setError(null);
                            }}
                            placeholder="Please explain why you want to cancel this application..."
                            rows={4}
                            disabled={isSubmitting}
                            className={cn(
                                "w-full px-4 py-3 rounded-xl border text-[13px] font-medium",
                                "bg-white dark:bg-[#18181B] text-[#3F3F46] dark:text-[#E4E4E7]",
                                "placeholder:text-[#A1A1AA] dark:placeholder:text-[#52525B]",
                                "focus:outline-none focus:ring-2 transition-all resize-none",
                                error
                                    ? "border-red-300 dark:border-red-800 focus:ring-red-200 dark:focus:ring-red-900/50"
                                    : "border-[#E4E4E7] dark:border-[#3F3F46] focus:ring-[#4A6CF7]/20 dark:focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7] dark:focus:border-[#4A6CF7]",
                                "disabled:opacity-60 disabled:cursor-not-allowed"
                            )}
                        />
                        {error && (
                            <p className="mt-2 text-[12px] font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                                {error}
                            </p>
                        )}
                        <p className="mt-1.5 text-[11px] text-[#A1A1AA] dark:text-[#52525B]">
                            {reason.length}/500 characters
                        </p>
                    </div>

                    {/* Info Banner */}
                    <div className="px-6 pb-4">
                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/40 rounded-xl px-4 py-3">
                            <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
                                <strong>Note:</strong> Your cancellation request will go through
                                the same approval process as the original application. The
                                application will only be cancelled after all approvers have approved
                                the cancellation.
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                        <button
                            onClick={handleClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-[#3F3F46] dark:text-[#A1A1AA] bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !reason.trim()}
                            className={cn(
                                "inline-flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-bold transition-all",
                                "bg-red-600 text-white hover:bg-red-700 shadow-sm hover:shadow-md",
                                "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
                                "focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-800"
                            )}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Cancellation
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CancellationModal;
