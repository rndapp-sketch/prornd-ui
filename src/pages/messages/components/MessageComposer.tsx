import { useEffect, useRef, useState } from "react";
import { Paperclip, SendHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    sendMessage,
    uploadAttachment,
    type Conversation,
    type Message,
} from "@/services/messagingService";

interface MessageComposerProps {
    conversation: Conversation;
    sender: { userId: string; email: string };
    onSent?: (message: Message) => void;
    onTypingChange?: (isTyping: boolean) => void;
}

export function MessageComposer({
    conversation,
    sender,
    onSent,
    onTypingChange,
}: MessageComposerProps) {
    const [body, setBody] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isTypingRef = useRef(false);
    const lastTypingSentAtRef = useRef(0);

    const canSend = (body.trim().length > 0 || files.length > 0) && !isSending;

    const handleSend = async () => {
        if (!canSend) return;
        setIsSending(true);
        setError(null);
        try {
            const attachmentFileIds: string[] = [];
            for (const f of files) {
                const id = await uploadAttachment(f, conversation.members);
                attachmentFileIds.push(id);
            }
            const message = await sendMessage({
                conversation,
                sender,
                body: body.trim(),
                attachmentFileIds,
            });
            setBody("");
            setFiles([]);
            if (isTypingRef.current) {
                isTypingRef.current = false;
                lastTypingSentAtRef.current = 0;
                onTypingChange?.(false);
            }
            onSent?.(message);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to send");
        } finally {
            setIsSending(false);
        }
    };

    useEffect(() => {
        if (!onTypingChange) return;

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        const hasText = body.trim().length > 0;
        const now = Date.now();
        if (hasText && (!isTypingRef.current || now - lastTypingSentAtRef.current > 1200)) {
            isTypingRef.current = true;
            lastTypingSentAtRef.current = now;
            onTypingChange(true);
        }

        typingTimeoutRef.current = setTimeout(() => {
            if (isTypingRef.current) {
                isTypingRef.current = false;
                lastTypingSentAtRef.current = 0;
                onTypingChange(false);
            }
        }, 3500);

        return () => {
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, [body, onTypingChange]);

    useEffect(() => {
        return () => {
            if (isTypingRef.current) onTypingChange?.(false);
        };
    }, [onTypingChange]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="border-t border-[#E4E4E7] bg-white/95 px-4 py-3 backdrop-blur dark:border-[#3F3F46] dark:bg-[#27272A]/95">
            {error && (
                <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                    {error}
                </p>
            )}

            {files.length > 0 && (
                <ul className="mb-2 flex flex-wrap gap-1.5">
                    {files.map((f, idx) => (
                        <li
                            key={`${f.name}-${idx}`}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#EEF2FF] dark:bg-[#4A6CF7]/15 text-[11px] font-semibold text-[#1E3A8A] dark:text-[#93C5FD]"
                        >
                            <Paperclip className="w-3 h-3" />
                            <span className="max-w-[160px] truncate">{f.name}</span>
                            <button
                                type="button"
                                onClick={() =>
                                    setFiles((curr) => curr.filter((_, i) => i !== idx))
                                }
                                className="ml-0.5 text-[#1E3A8A]/70 hover:text-[#1E3A8A]"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-[#E4E4E7] bg-[#FAFAF9] p-2 shadow-sm dark:border-[#3F3F46] dark:bg-[#18181B]">
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[#E4E4E7] bg-white text-[#71717A] transition-colors hover:border-[#4A6CF7]/40 hover:text-[#4A6CF7] dark:border-[#3F3F46] dark:bg-[#27272A]"
                    title="Attach files"
                >
                    <Paperclip className="w-4 h-4" />
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                        const picked = Array.from(e.target.files ?? []);
                        setFiles((curr) => [...curr, ...picked]);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                />

                <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message…"
                    rows={1}
                    className="min-h-[40px] max-h-[140px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-[13px] font-medium text-[#3F3F46] outline-none placeholder:text-[#A1A1AA] dark:text-[#E4E4E7]"
                />

                <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    className={cn(
                        "flex h-10 items-center gap-1.5 rounded-xl px-4 text-[12px] font-bold transition-all shadow-sm",
                        canSend
                            ? "bg-[#4A6CF7] hover:bg-[#3558E8] text-white hover:shadow-md hover:shadow-[#4A6CF7]/25"
                            : "bg-[#E4E4E7] dark:bg-[#3F3F46] text-[#71717A] cursor-not-allowed",
                    )}
                >
                    <SendHorizontal className="w-3.5 h-3.5" />
                    {isSending ? "Sending…" : "Send"}
                </button>
            </div>
        </div>
    );
}
