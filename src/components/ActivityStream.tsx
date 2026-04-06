import React, { useState, forwardRef, useImperativeHandle } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { Textarea } from "@/components/ui/textarea";
import { FrappeButton } from '@/components/ui/neo-brutalism';
import { ClockIcon } from "lucide-react";

export interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}

export interface ActivityStreamProps {
    doctype: string;
    docname: string;
}

export interface ActivityStreamHandle {
    refetch: () => void;
}

export const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
    ({ doctype, docname }, ref) => {
        const [newComment, setNewComment] = useState("");
        const [isSubmitting, setIsSubmitting] = useState(false);
        const { data: activityData, mutate: refetchActivity } = useFrappeGetCall<{ message: ActivityItem[] }>(
            "rndopsapp.rndopsapp.api.get_project_activity",
            { doctype, docname }
        );
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
                console.error("Failed to add comment:", error);
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
            <div className="space-y-5">
                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <label htmlFor="comment-textarea" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                        Add a comment
                    </label>
                    <Textarea
                        id="comment-textarea"
                        placeholder="Type here... (Ctrl+Enter to submit)"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={isSubmitting}
                        className="w-full min-h-[100px]"
                        rows={4}
                    />
                    <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">{newComment.length}/1000</span>
                        <FrappeButton onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()} className="bg-[#D97757] text-white hover:bg-[#D97757]">
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </FrappeButton>
                    </div>
                </div>
                <div className="space-y-3">
                    {activityData?.message?.map((item, index) => (
                        <div
                            key={`${item.creation}-${index}`}
                            className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-50 dark:bg-zinc-800 dark:bg-[#D97757]/20 flex items-center justify-center font-semibold text-[#D97757] text-lg">
                                {item.owner?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap justify-between items-center gap-1 mb-1">
                                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[60%]">{item.owner || "Unknown User"}</p>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1 whitespace-nowrap">
                                        <ClockIcon className="h-3.5 w-3.5 flex-shrink-0" />
                                        {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
                                    </p>
                                </div>
                                <div className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm dark:prose-invert max-w-none leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: item.content || "No content" }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
);
ActivityStream.displayName = "ActivityStream";
