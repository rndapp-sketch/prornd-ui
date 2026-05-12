import { useMemo, useState } from "react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import type { Filter, FrappeDoc } from "frappe-js-sdk/lib/db/types";
import { useDebounce } from "use-debounce";
import { Check, Forward, SearchIcon, SendHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { sha256Hex } from "@/lib/sha256";
import type { MessageUserProfile } from "@/hooks/useMessageUserProfiles";
import {
    createConversation,
    sendMessage,
    type Conversation,
    type Message,
} from "@/services/messagingService";

interface FrappeUser {
    name: string;
    email: string;
    full_name: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    user_image?: string;
    enabled: 0 | 1;
}

type FrappeUserFilter = Filter<FrappeDoc<FrappeUser>>;
const USER_FETCH_LIMIT = 10000;
const normalizeEmail = (value?: string | null) => (value ?? "").trim().toLowerCase();

interface ForwardMessageDialogProps {
    message: Message;
    conversations: Conversation[];
    currentConversationId: string;
    sender: { userId: string; email: string };
    myEmail: string;
    userProfiles: Record<string, MessageUserProfile>;
    onClose: () => void;
    onForwarded: () => void;
}

async function deriveAppwriteUserId(email: string): Promise<string> {
    return (await sha256Hex(email.toLowerCase())).slice(0, 36);
}

function getConversationTitle(
    conversation: Conversation,
    myEmail: string,
    userProfiles: Record<string, MessageUserProfile>,
) {
    if (conversation.type !== "dm") return conversation.title;
    const otherEmail =
        conversation.member_emails.find(
            (email) => email.toLowerCase() !== myEmail.toLowerCase(),
        ) ?? "";
    return userProfiles[otherEmail.toLowerCase()]?.fullName || otherEmail || conversation.title;
}

function getConversationDetail(
    conversation: Conversation,
    myEmail: string,
) {
    if (conversation.type !== "dm") return `${conversation.members.length} members`;
    const otherEmail =
        conversation.member_emails.find(
            (email) => email.toLowerCase() !== myEmail.toLowerCase(),
        ) ?? "";
    return otherEmail;
}

export function ForwardMessageDialog({
    message,
    conversations,
    currentConversationId,
    sender,
    myEmail,
    userProfiles,
    onClose,
    onForwarded,
}: ForwardMessageDialogProps) {
    const [search, setSearch] = useState("");
    const [debounced] = useDebounce(search, 250);
    const [selectedConversationIds, setSelectedConversationIds] = useState<string[]>([]);
    const [selectedUserEmails, setSelectedUserEmails] = useState<string[]>([]);
    const [isForwarding, setIsForwarding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const searchQuery = debounced.trim();
    const shouldSearchUsers = searchQuery.length >= 2;

    const userFilters = useMemo<FrappeUserFilter[]>(() => [
        ["enabled", "=", "1"],
        ["name", "!=", myEmail],
        ["name", "!=", "Administrator"],
        ["name", "!=", "Guest"],
    ], [myEmail]);

    const userOrFilters = useMemo<FrappeUserFilter[] | undefined>(() => {
        const query = searchQuery;
        if (!shouldSearchUsers) return undefined;
        return [
            ["full_name", "like", `%${query}%`],
            ["email", "like", `%${query}%`],
            ["name", "like", `%${query}%`],
            ["username", "like", `%${query}%`],
            ["first_name", "like", `%${query}%`],
            ["last_name", "like", `%${query}%`],
        ];
    }, [searchQuery, shouldSearchUsers]);

    const { data: users, isLoading: isLoadingUsers } = useFrappeGetDocList<FrappeUser>(
        "User",
        {
            fields: [
                "name",
                "email",
                "full_name",
                "username",
                "first_name",
                "last_name",
                "user_image",
                "enabled",
            ],
            filters: userFilters,
            orFilters: userOrFilters,
            limit: USER_FETCH_LIMIT,
            orderBy: { field: "full_name", order: "asc" },
        },
        shouldSearchUsers ? undefined : null,
    );

    const candidateConversations = useMemo(
        () => conversations.filter((conversation) => conversation.$id !== currentConversationId),
        [conversations, currentConversationId],
    );
    const dmConversationByEmail = useMemo(() => {
        const map = new Map<string, Conversation>();
        conversations.forEach((conversation) => {
            if (conversation.type !== "dm") return;
            const memberEmails = (conversation.member_emails ?? []).map(normalizeEmail);
            const uniqueMemberEmails = Array.from(new Set(memberEmails.filter(Boolean)));
            if (
                uniqueMemberEmails.length <= 1 &&
                uniqueMemberEmails[0] === normalizeEmail(myEmail)
            ) {
                return;
            }
            const otherEmail = conversation.member_emails.find(
                (email) => normalizeEmail(email) !== normalizeEmail(myEmail),
            );
            if (!otherEmail) return;

            const key = normalizeEmail(otherEmail);
            const existing = map.get(key);
            if (
                !existing ||
                new Date(conversation.$createdAt).getTime() <
                    new Date(existing.$createdAt).getTime()
            ) {
                map.set(key, conversation);
            }
        });
        return map;
    }, [conversations, myEmail]);
    const visibleUsers = useMemo(() => {
        const seen = new Set<string>();
        const currentUserEmail = normalizeEmail(myEmail);
        return (users ?? []).filter((user) => {
            if (!shouldSearchUsers) return false;
            const email = normalizeEmail(user.email || user.name);
            const userName = normalizeEmail(user.name);
            if (email === currentUserEmail || userName === currentUserEmail) return false;
            if (!email || seen.has(email)) return false;
            if (dmConversationByEmail.has(email)) return false;
            seen.add(email);
            return true;
        });
    }, [dmConversationByEmail, myEmail, shouldSearchUsers, users]);
    const filteredConversations = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return candidateConversations;
        return candidateConversations.filter((conversation) => {
            const title = getConversationTitle(conversation, myEmail, userProfiles);
            const detail = getConversationDetail(conversation, myEmail);
            const haystack = `${title} ${detail} ${conversation.member_emails.join(" ")}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [candidateConversations, myEmail, search, userProfiles]);

    const selectedConversations = useMemo(
        () =>
            candidateConversations.filter((conversation) =>
                selectedConversationIds.includes(conversation.$id),
            ),
        [candidateConversations, selectedConversationIds],
    );
    const selectedCount = selectedConversationIds.length + selectedUserEmails.length;

    const toggleConversation = (conversationId: string) => {
        setSelectedConversationIds((current) =>
            current.includes(conversationId)
                ? current.filter((id) => id !== conversationId)
                : [...current, conversationId],
        );
    };
    const toggleUser = (email: string) => {
        if (normalizeEmail(email) === normalizeEmail(myEmail)) return;
        setSelectedUserEmails((current) =>
            current.includes(email)
                ? current.filter((value) => value !== email)
                : [...current, email],
        );
    };

    const handleForward = async () => {
        if (selectedCount === 0) return;
        if (selectedUserEmails.some((email) => normalizeEmail(email) === normalizeEmail(myEmail))) {
            setError("You cannot forward a message to yourself.");
            return;
        }
        setIsForwarding(true);
        setError(null);
        try {
            const newConversations = await Promise.all(
                selectedUserEmails.map(async (email) => {
                    const existingDm = dmConversationByEmail.get(email.toLowerCase());
                    if (existingDm) return existingDm;
                    const userId = await deriveAppwriteUserId(email);
                    return createConversation({
                        me: sender,
                        others: [{ userId, email }],
                    });
                }),
            );
            const targets = [...selectedConversations, ...newConversations];
            await Promise.all(
                targets.map((conversation) =>
                    sendMessage({
                        conversation,
                        sender,
                        body: message.body || "",
                        attachmentFileIds: message.attachment_file_ids ?? [],
                    }),
                ),
            );
            onForwarded();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to forward message");
        } finally {
            setIsForwarding(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border-[1.5px] border-[#D4D4D8] bg-white shadow-2xl dark:border-[#52525B] dark:bg-[#27272A]">
                <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                <div className="flex items-center justify-between border-b border-[#E4E4E7] px-6 py-4 dark:border-[#3F3F46]">
                    <h2 className="flex items-center gap-2.5 text-[14px] font-extrabold text-[#18181B] dark:text-[#E4E4E7]">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] dark:bg-[#4A6CF7]/15">
                            <Forward className="h-3.5 w-3.5 text-[#4A6CF7] dark:text-[#93C5FD]" />
                        </span>
                        Forward message
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#71717A] transition-colors hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-3 px-6 py-4">
                    <div className="rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3 py-2 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">
                            Message
                        </div>
                        <p className="line-clamp-3 whitespace-pre-wrap text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                            {message.body || "Attachment"}
                        </p>
                        {(message.attachment_file_ids ?? []).length > 0 && (
                            <p className="mt-1 text-[10px] font-bold text-[#D97757]">
                                {(message.attachment_file_ids ?? []).length} attachment
                                {(message.attachment_file_ids ?? []).length === 1 ? "" : "s"}
                            </p>
                        )}
                    </div>

                    <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A1A1AA]" />
                        <input
                            autoFocus
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search conversations..."
                            className="frappe-input h-10 w-full pl-11 text-[13px]"
                            style={{ paddingLeft: "2.75rem" }}
                        />
                    </div>

                    <div className="max-h-72 overflow-y-auto rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                        {filteredConversations.length === 0 && (
                            <div className="border-b border-[#F4F4F5] px-4 py-3 text-[12px] text-[#71717A] dark:border-[#3F3F46]">
                                No existing conversations match.
                            </div>
                        )}

                        {filteredConversations.map((conversation) => {
                            const title = getConversationTitle(conversation, myEmail, userProfiles);
                            const detail = getConversationDetail(conversation, myEmail);
                            const isSelected = selectedConversationIds.includes(conversation.$id);

                            return (
                                <button
                                    key={conversation.$id}
                                    type="button"
                                    onClick={() => toggleConversation(conversation.$id)}
                                    className={cn(
                                        "flex w-full items-center gap-3 border-b border-[#F4F4F5] px-3 py-2.5 text-left transition-colors last:border-b-0 dark:border-[#3F3F46]",
                                        isSelected
                                            ? "bg-[#EEF2FF] dark:bg-[#4A6CF7]/15"
                                            : "hover:bg-[#FAFAF9] dark:hover:bg-[#18181B]",
                                    )}
                                >
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#C7D2FE] bg-gradient-to-br from-[#EEF2FF] to-[#C7D2FE] text-[12px] font-bold text-[#4A6CF7] dark:border-[#4A6CF7]/30 dark:from-[#4A6CF7]/20 dark:to-[#1E3A8A]/30 dark:text-[#93C5FD]">
                                        {title.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                            {title}
                                        </p>
                                        <p className="truncate text-[11px] font-semibold text-[#71717A]">
                                            {detail}
                                        </p>
                                    </div>
                                    {isSelected && (
                                        <Check className="h-4 w-4 flex-shrink-0 text-[#4A6CF7]" />
                                    )}
                                </button>
                            );
                        })}

                        {!shouldSearchUsers && (
                            <div className="px-4 py-3 text-[12px] text-[#71717A]">
                                Type at least 2 characters to search users.
                            </div>
                        )}

                        {shouldSearchUsers && isLoadingUsers && (
                            <div className="px-4 py-3 text-[12px] text-[#71717A]">
                                Loading users...
                            </div>
                        )}

                        {shouldSearchUsers &&
                            !isLoadingUsers &&
                            visibleUsers.map((user) => {
                                const email = (user.email || user.name).toLowerCase();
                                const title =
                                    user.full_name ||
                                    [user.first_name, user.last_name].filter(Boolean).join(" ") ||
                                    user.username ||
                                    email;
                                const isSelected = selectedUserEmails.includes(email);

                                return (
                                    <button
                                        key={`user-${email}`}
                                        type="button"
                                        onClick={() => toggleUser(email)}
                                        className={cn(
                                            "flex w-full items-center gap-3 border-b border-[#F4F4F5] px-3 py-2.5 text-left transition-colors last:border-b-0 dark:border-[#3F3F46]",
                                            isSelected
                                                ? "bg-[#EEF2FF] dark:bg-[#4A6CF7]/15"
                                                : "hover:bg-[#FAFAF9] dark:hover:bg-[#18181B]",
                                        )}
                                    >
                                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#FED7AA] bg-[#FFF7ED] text-[12px] font-bold text-[#D97757] dark:border-[#D97757]/30 dark:bg-[#D97757]/15 dark:text-[#FDBA74]">
                                            {title.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                            {title}
                                        </p>
                                        <p className="truncate text-[11px] font-semibold text-[#71717A]">
                                            {email}
                                        </p>
                                        </div>
                                        <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#D97757] dark:bg-[#D97757]/15 dark:text-[#FDBA74]">
                                            User
                                        </span>
                                        {isSelected && (
                                            <Check className="h-4 w-4 flex-shrink-0 text-[#4A6CF7]" />
                                        )}
                                    </button>
                                );
                            })}

                        {shouldSearchUsers &&
                            !isLoadingUsers &&
                            filteredConversations.length === 0 &&
                            visibleUsers.length === 0 && (
                                <div className="px-4 py-8 text-center text-[12px] text-[#71717A]">
                                    No users or conversations match.
                                </div>
                            )}
                    </div>

                    {error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-[#E4E4E7] bg-[#FAFAF9] px-6 py-3 dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <div className="truncate text-[11px] font-bold text-[#71717A]">
                        {selectedCount} selected
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="btn-neutral">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleForward}
                            disabled={selectedCount === 0 || isForwarding}
                            className={cn(
                                "btn-primary-accent inline-flex items-center gap-1.5",
                                (selectedCount === 0 || isForwarding) &&
                                    "cursor-not-allowed opacity-50",
                            )}
                        >
                            <SendHorizontal className="h-3.5 w-3.5" />
                            {isForwarding ? "Forwarding..." : "Forward"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
