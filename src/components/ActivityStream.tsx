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
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <label htmlFor="comment-textarea" className="block text-sm font-medium text-gray-700 mb-3">
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
                        <span className="text-xs text-[#6B7280]">{newComment.length}/1000</span>
                        <FrappeButton onClick={handleCommentSubmit} disabled={isSubmitting || !newComment.trim()} className="bg-[#0EA5A4] text-white hover:bg-[#0C8F8E]">
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </FrappeButton>
                    </div>
                </div>
                <div className="space-y-3">
                    {activityData?.message?.map((item, index) => (
                        <div
                            key={`${item.creation}-${index}`}
                            className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[#E0F7F6] flex items-center justify-center font-semibold text-[#0EA5A4] text-lg">
                                {item.owner?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-semibold text-gray-900">{item.owner || "Unknown User"}</p>
                                    <p className="text-xs text-[#6B7280] flex items-center gap-1">
                                        <ClockIcon className="h-3.5 w-3.5" />
                                        {item.creation ? new Date(item.creation).toLocaleString() : "N/A"}
                                    </p>
                                </div>
                                <div className="text-sm text-gray-700 prose prose-sm max-w-none leading-relaxed"
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
