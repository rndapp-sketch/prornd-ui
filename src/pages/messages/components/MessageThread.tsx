import { useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { ChevronDown, Download, FileText, Forward, ImageIcon, Reply, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    formatMessageUserDetail,
    type MessageUserProfile,
} from "@/hooks/useMessageUserProfiles";
import {
    deleteMessageForEveryone,
    deleteMessageForMe,
    markMessageRead,
    toggleMessageReaction,
    getAttachmentPreviewUrl,
    getAttachmentViewUrl,
    type Conversation,
    type Message,
} from "@/services/messagingService";
import { ErrorModal } from "../../../components/ErrorModal";
import { parseFrappeError } from "../../../utils/errorUtils";

interface MessageThreadProps {
    conversation: Conversation | null;
    messages: Message[];
    isLoading: boolean;
    myUserId: string;
    typingEmails?: string[];
    userProfiles?: Record<string, MessageUserProfile>;
    onForward?: (message: Message) => void;
    onReply?: (message: Message) => void;
    onDeleted?: (messageId: string) => void;
    onUpdated?: (message: Message) => void;
}

const QUICK_REACTIONS = ["👍", "✅", "👀", "🔥", "🙏"];

function formatStamp(iso: string) {
    const d = new Date(iso);
    if (isToday(d)) return format(d, "p");
    if (isYesterday(d)) return `Yesterday ${format(d, "p")}`;
    return format(d, "MMM d, p");
}

function AttachmentPreview({ fileId, isMine }: { fileId: string; isMine: boolean }) {
    const previewUrl = getAttachmentPreviewUrl(fileId);
    const viewUrl = getAttachmentViewUrl(fileId);

    return (
        <a
            href={viewUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(
                "group block overflow-hidden rounded-lg border transition-colors",
                isMine
                    ? "border-white/20 bg-white/10 hover:bg-white/15"
                    : "border-[#E4E4E7] bg-[#FAFAF9] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#18181B] dark:hover:bg-[#27272A]",
            )}
        >
            <div className="relative aspect-[4/3] w-44 max-w-full overflow-hidden bg-[#F4F4F5] dark:bg-[#18181B]">
                <img
                    src={previewUrl}
                    alt="Attachment preview"
                    className="relative z-10 h-full w-full object-cover"
                    onError={(event) => {
                        event.currentTarget.style.display = "none";
                    }}
                />
                <div
                    className={cn(
                        "absolute inset-0 flex flex-col items-center justify-center gap-2",
                        isMine ? "text-white/85" : "text-[#71717A]",
                    )}
                >
                    <FileText className="h-8 w-8" />
                    <span className="text-[11px] font-semibold">Preview unavailable</span>
                </div>
                <div className="absolute right-2 top-2 rounded-md bg-black/55 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Download className="h-3.5 w-3.5" />
                </div>
            </div>
            <div
                className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-semibold",
                    isMine ? "text-white/95" : "text-[#3F3F46] dark:text-[#E4E4E7]",
                )}
            >
                <ImageIcon className="h-3.5 w-3.5" />
                Preview attachment
            </div>
        </a>
    );
}

export function MessageThread({
    conversation,
    messages,
    isLoading,
    myUserId,
    typingEmails = [],
    userProfiles = {},
    onForward,
    onReply,
    onDeleted,
    onUpdated,
}: MessageThreadProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [errorModal, setErrorModal] = useState<{
        open: boolean;
        title: string;
        message: string;
    }>({ open: false, title: "Error", message: "" });

    // Auto-scroll to bottom on new messages.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight;
    }, [messages.length, conversation?.$id, typingEmails.length]);

    // Mark unread messages as read when this thread is open.
    useEffect(() => {
        if (!conversation) return;
        messages.forEach((m) => {
            if (m.sender_id !== myUserId && !(m.read_by ?? []).includes(myUserId)) {
                void markMessageRead(m, myUserId);
            }
        });
    }, [messages, conversation, myUserId]);

    const handleDeleteForMe = async (message: Message) => {
        try {
            await deleteMessageForMe(message, myUserId);
            onDeleted?.(message.$id);
        } catch (error) {
            const messageText = error instanceof Error ? error.message : "";
            if (/unknown attribute:\s*"deleted_for_user_ids"/i.test(messageText)) {
                alert(
                    "Delete for me needs an Appwrite messages column: deleted_for_user_ids[] / String / Size 36 / Required No / Array Yes.",
                );
                return;
            }
            setErrorModal({
                open: true,
                title: "Delete Failed",
                message: parseFrappeError(error),
            });
        }
    };

    const handleDeleteForEveryone = async (message: Message) => {
        const ok = window.confirm("Delete this message for everyone?");
        if (!ok) return;
        try {
            const updated = await deleteMessageForEveryone(message, myUserId);
            onUpdated?.(updated);
        } catch (error) {
            const messageText = error instanceof Error ? error.message : "";
            if (/unknown attribute:\s*"deleted_/i.test(messageText)) {
                alert(
                    "Delete for everyone needs Appwrite message columns: deleted_for_everyone, deleted_by, deleted_at, deleted_for_user_ids[].",
                );
                return;
            }
            setErrorModal({
                open: true,
                title: "Delete Failed",
                message: parseFrappeError(error),
            });
        }
    };

    const handleReaction = async (message: Message, emoji: string) => {
        try {
            const updated = await toggleMessageReaction(message, myUserId, emoji);
            onUpdated?.(updated);
        } catch (error) {
            const messageText = error instanceof Error ? error.message : "";
            if (/unknown attribute:\s*"reactions"/i.test(messageText)) {
                alert(
                    "Reactions are not enabled in Appwrite yet. Add a messages table column: reactions[] / String / Size 100 / Required No / Array Yes.",
                );
                return;
            }
            setErrorModal({
                open: true,
                title: "Reaction Failed",
                message: parseFrappeError(error),
            });
        }
    };

    const getReactionGroups = (message: Message) => {
        return (message.reactions ?? []).reduce<Record<string, string[]>>((groups, reaction) => {
            const separatorIndex = reaction.lastIndexOf(":");
            if (separatorIndex <= 0) return groups;
            const emoji = reaction.slice(0, separatorIndex);
            const userId = reaction.slice(separatorIndex + 1);
            groups[emoji] = [...(groups[emoji] ?? []), userId];
            return groups;
        }, {});
    };

    if (!conversation) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
                <div className="text-center">
                    <p className="text-[14px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                        Select a conversation
                    </p>
                    <p className="mt-1 text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                        Choose a thread from the left, or start a new one.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
        <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto custom-scrollbar bg-[radial-gradient(circle_at_top_left,#EEF2FF_0,transparent_280px),#FAFAF9] px-5 py-5 dark:bg-[radial-gradient(circle_at_top_left,rgba(74,108,247,0.18)_0,transparent_300px),#18181B]"
        >
            {isLoading && (
                <div className="text-center text-[12px] text-[#71717A]">Loading messages…</div>
            )}

            {!isLoading && messages.length === 0 && (
                <div className="text-center text-[12px] text-[#71717A] py-10">
                    No messages yet. Say hello.
                </div>
            )}

            <div className="mx-auto max-w-[820px] space-y-4">
                {messages.map((m, idx) => {
                    const isMine = m.sender_id === myUserId;
                    const prev = messages[idx - 1];
                    const showSenderHeader =
                        !isMine && (!prev || prev.sender_id !== m.sender_id);
                    const otherMemberIds = conversation.members.filter((uid) => uid !== myUserId);
                    const seenByAll =
                        otherMemberIds.length > 0 &&
                        otherMemberIds.every((uid) => (m.read_by ?? []).includes(uid));
                    const isDeletedForEveryone = Boolean(m.deleted_for_everyone);
                    const reactionGroups = getReactionGroups(m);
                    const hasReactions =
                        !isDeletedForEveryone && Object.keys(reactionGroups).length > 0;
                    const senderProfile = userProfiles[m.sender_email?.toLowerCase()];
                    const senderName = senderProfile?.fullName || m.sender_email;
                    const senderDetail = formatMessageUserDetail(senderProfile);
                    const replySenderName =
                        userProfiles[m.reply_to_sender_email?.toLowerCase() ?? ""]?.fullName ||
                        m.reply_to_sender_email;

                    return (
                        <div
                            key={m.$id}
                            className={cn(
                                "flex flex-col",
                                isMine ? "items-end" : "items-start",
                            )}
                        >
                            {showSenderHeader && (
                                <div className="mb-1 px-1">
                                    <div className="text-[10px] font-bold uppercase tracking-wide text-[#71717A]">
                                        {senderName}
                                    </div>
                                    {senderDetail && (
                                        <div className="mt-0.5 text-[10px] font-semibold text-[#A16207] dark:text-[#FDBA74]">
                                            {senderDetail}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div
                                className={cn(
                                    "group flex w-full items-start gap-1.5",
                                    isMine ? "flex-row-reverse justify-start" : "justify-start",
                                )}
                            >
                                <div
                                    className={cn(
                                        "relative max-w-[78%] rounded-2xl px-3.5 py-2.5 shadow-sm",
                                        isMine
                                            ? "rounded-br-md bg-[#4A6CF7] text-white"
                                            : "rounded-bl-md border border-[#E4E4E7] bg-white text-[#3F3F46] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#E4E4E7]",
                                    )}
                                >
                                    {m.reply_to_message_id && (
                                        <div
                                            className={cn(
                                                "mb-2 rounded-lg border-l-2 px-2.5 py-1.5",
                                                isMine
                                                    ? "border-white/70 bg-white/10"
                                                    : "border-[#4A6CF7] bg-[#EEF2FF] dark:bg-[#18181B]",
                                            )}
                                        >
                                            <p
                                                className={cn(
                                                    "truncate text-[10px] font-extrabold uppercase tracking-wide",
                                                    isMine ? "text-white/85" : "text-[#4A6CF7]",
                                                )}
                                            >
                                                {replySenderName || "Replied message"}
                                            </p>
                                            <p
                                                className={cn(
                                                    "mt-0.5 line-clamp-2 whitespace-pre-wrap text-[11px] font-semibold leading-snug",
                                                    isMine
                                                        ? "text-white/80"
                                                        : "text-[#52525B] dark:text-[#D4D4D8]",
                                                )}
                                            >
                                                {m.reply_to_body || "Message"}
                                            </p>
                                        </div>
                                    )}
                                    {isDeletedForEveryone ? (
                                        <p className="text-[12px] italic leading-relaxed opacity-75">
                                            This message was deleted
                                        </p>
                                    ) : m.body && (
                                        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                                            {m.body}
                                        </p>
                                    )}
                                    {!isDeletedForEveryone && (m.attachment_file_ids ?? []).length > 0 && (
                                        <ul className={cn("mt-2 space-y-2", m.body ? "" : "mt-0")}>
                                            {(m.attachment_file_ids ?? []).map((fid) => (
                                                <li key={fid}>
                                                    <AttachmentPreview fileId={fid} isMine={isMine} />
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {hasReactions && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                            {Object.entries(reactionGroups).map(([emoji, userIds]) => {
                                                const selected = userIds.includes(myUserId);
                                                return (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => handleReaction(m, emoji)}
                                                        className={cn(
                                                            "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-bold transition-colors",
                                                            selected
                                                                ? "bg-[#D97757] text-white"
                                                                : isMine
                                                                  ? "bg-white/15 text-white hover:bg-white/25"
                                                                  : "bg-[#F4F4F5] text-[#3F3F46] hover:bg-[#EEF2FF] dark:bg-[#18181B] dark:text-[#E4E4E7]",
                                                        )}
                                                    >
                                                        <span>{emoji}</span>
                                                        <span>{userIds.length}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                <div className={cn("relative mt-1 opacity-0 transition-opacity group-hover:opacity-100")}>
                                    <button
                                        type="button"
                                        title="Message actions"
                                        className="peer inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#E4E4E7] bg-white text-[#71717A] shadow-sm transition-colors hover:border-[#4A6CF7]/30 hover:bg-[#EEF2FF] hover:text-[#4A6CF7] dark:border-[#3F3F46] dark:bg-[#27272A]"
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                    <div
                                        className={cn(
                                            "invisible absolute top-8 z-20 min-w-[150px] rounded-xl border border-[#E4E4E7] bg-white p-1.5 opacity-0 shadow-xl transition-all peer-hover:visible peer-hover:opacity-100 hover:visible hover:opacity-100 dark:border-[#3F3F46] dark:bg-[#27272A]",
                                            isMine ? "right-0" : "left-0",
                                        )}
                                    >
                                        {!isDeletedForEveryone && (
                                            <div className="flex items-center gap-1 border-b border-[#F4F4F5] pb-1.5 dark:border-[#3F3F46]">
                                                {QUICK_REACTIONS.map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        type="button"
                                                        onClick={() => handleReaction(m, emoji)}
                                                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[14px] transition-colors hover:bg-[#EEF2FF] dark:hover:bg-[#18181B]"
                                                        title={`React ${emoji}`}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        {!isDeletedForEveryone && (
                                            <button
                                                type="button"
                                                onClick={() => onForward?.(m)}
                                                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-bold text-[#3F3F46] transition-colors hover:bg-[#F4F4F5] dark:text-[#E4E4E7] dark:hover:bg-[#18181B]"
                                            >
                                                <Forward className="h-3.5 w-3.5" />
                                                Forward
                                            </button>
                                        )}
                                        {!isDeletedForEveryone && (
                                            <button
                                                type="button"
                                                onClick={() => onReply?.(m)}
                                                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-bold text-[#3F3F46] transition-colors hover:bg-[#F4F4F5] dark:text-[#E4E4E7] dark:hover:bg-[#18181B]"
                                            >
                                                <Reply className="h-3.5 w-3.5" />
                                                Reply
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteForMe(m)}
                                            className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-bold text-[#3F3F46] transition-colors hover:bg-[#F4F4F5] dark:text-[#E4E4E7] dark:hover:bg-[#18181B]"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Delete for me
                                        </button>
                                        {isMine && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteForEveryone(m)}
                                                className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] font-bold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Delete for everyone
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <span
                                className={cn(
                                    "mt-1 text-[10px] font-medium px-1",
                                    isMine
                                        ? "text-[#71717A]"
                                        : "text-[#A1A1AA] dark:text-[#71717A]",
                                )}
                            >
                                {formatStamp(m.$createdAt)}
                                {isMine && (
                                    <span className="ml-1.5 font-semibold">
                                        {seenByAll ? "Seen" : "Sent"}
                                    </span>
                                )}
                            </span>
                        </div>
                    );
                })}
                {typingEmails.length > 0 && (
                    <div className="flex items-start">
                        <div className="rounded-2xl rounded-bl-md border border-[#E4E4E7] bg-white px-3.5 py-2.5 text-[#71717A] shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#A1A1AA]">
                            <div className="mb-1 text-[10px] font-bold uppercase tracking-wide">
                                {typingEmails.join(", ")}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#4A6CF7]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#4A6CF7] [animation-delay:120ms]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#4A6CF7] [animation-delay:240ms]" />
                                <span className="ml-1 text-[11px] font-semibold">typing</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <ErrorModal
            open={errorModal.open}
            title={errorModal.title}
            message={errorModal.message}
            onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
        />
        </>
    );
}
