import React, { useState, forwardRef, useImperativeHandle } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { Textarea } from "@/components/ui/textarea";
import { FrappeButton } from '@/components/ui/neo-brutalism';
import { ActivityIcon, ClockIcon, MessageSquareIcon } from "lucide-react";

export interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}

export interface ActivityStreamProps {
    doctype: string;
    docname: string;
    /** When true, only user-typed comments are shown (no workflow/attachment/system entries). */
    commentsOnly?: boolean;
}

export interface ActivityStreamHandle {
    refetch: () => void;
}

export const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
    ({ doctype, docname, commentsOnly = false }, ref) => {
        const [newComment, setNewComment] = useState("");
        const [isSubmitting, setIsSubmitting] = useState(false);
        const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
            "rndopsapp.rndopsapp.api.get_project_activity",
            { doctype, docname },
            doctype && docname ? undefined : null
        );
        const visibleActivity = commentsOnly
            ? (activityData?.message ?? []).filter((item) => item.comment_type === "Comment")
            : (activityData?.message ?? []);
        const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

        useImperativeHandle(ref, () => ({ refetch() { refetchActivity(); } }));

        const handleCommentSubmit = async () => {
            if (!newComment.trim()) return;
            setIsSubmitting(true);
            try {
                await addComment({
                    doctype: doctype,
                    docname: docname,
                    content: newComment,
                });
                setNewComment("");
                refetchActivity();
            } catch (error) {
            } finally {
                setIsSubmitting(false);
            }
        };

        const handleKeyPress = (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleCommentSubmit();
            }
        };

        return (
            <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-[#FAFAF9] px-5 py-4 dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-[#2563EB] dark:bg-blue-950/20">
                            <ActivityIcon className="h-3.5 w-3.5" />
                        </div>
                        <h2 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Activity Log</h2>
                    </div>
                    {!!visibleActivity.length && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            {visibleActivity.length}
                        </span>
                    )}
                </div>

                <div className="space-y-5 p-5">
                    <div className="rounded-xl border border-zinc-200 bg-[#FAFAF9] p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                        <label htmlFor="comment-textarea" className="mb-3 flex items-center gap-2 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                            <MessageSquareIcon className="h-4 w-4 text-[#D97757]" />
                            Add a comment
                        </label>
                        <Textarea
                            id="comment-textarea"
                            placeholder="Type here... (Ctrl+Enter to submit)"
                            value={newComment}
                            maxLength={1000}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={isSubmitting}
                            className="min-h-[100px] w-full resize-none rounded-lg border-[#E4E4E7] bg-white text-sm dark:border-[#3F3F46] dark:bg-[#27272A]"
                            rows={4}
                        />
                        <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{newComment.length}/1000</span>
                            <FrappeButton onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()} className="bg-[#D97757] text-white hover:bg-[#c66a4e] disabled:opacity-50">
                                {isSubmitting ? "Submitting..." : "Submit"}
                            </FrappeButton>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {visibleActivity.map((item, index) => (
                            <div
                                key={`${item.creation}-${index}`}
                                className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
                            >
                                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#D97757]/10 text-base font-bold text-[#D97757]">
                                    {item.owner?.charAt(0).toUpperCase() || "U"}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                        <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">{item.owner || "Unknown User"}</p>
                                        <p className="flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                            <ClockIcon className="h-3.5 w-3.5" />
                                            {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
                                        </p>
                                    </div>
                                    <div className="prose prose-sm max-w-none text-sm leading-relaxed text-zinc-700 dark:prose-invert dark:text-zinc-300"
                                        dangerouslySetInnerHTML={{ __html: item.content || "No content" }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
);
ActivityStream.displayName = "ActivityStream";
