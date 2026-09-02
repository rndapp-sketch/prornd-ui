import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    AlertTriangle,
    ArrowLeftIcon,
    Bell,
    BellRing,
    MessageCircle,
    Trash2,
} from "lucide-react";
import { GlobalLoader } from "@/components/ui/global-loader";
import { useAppwriteSession } from "@/hooks/useAppwriteSession";
import { useConversations } from "@/hooks/useConversations";
import { useConversationUnreadCounts } from "@/hooks/useConversationUnreadCounts";
import { sha256Hex } from "@/lib/sha256";
import {
    formatMessageUserDetail,
    useMessageUserProfiles,
} from "@/hooks/useMessageUserProfiles";
import { useMessages } from "@/hooks/useMessages";
import { ConversationList } from "./components/ConversationList";
import { MessageThread } from "./components/MessageThread";
import { MessageComposer } from "./components/MessageComposer";
import { ForwardMessageDialog } from "./components/ForwardMessageDialog";
import { GroupMembersDialog } from "./components/GroupMembersDialog";
import { NewConversationDialog } from "./components/NewConversationDialog";
import {
    createConversation,
    leaveConversation,
    updateTypingStatus,
    type Conversation,
    type Message,
} from "@/services/messagingService";
import { ErrorModal } from "../../components/ErrorModal";
import { parseFrappeError } from "../../utils/errorUtils";

const PRORND_ADMIN_CONTACT = {
    email: "prorndadmin@prornd.local",
    name: "ProRND Admin",
    subtitle: "Official Support Technical Team",
};

function normalizeEmail(value?: string | null) {
    return (value ?? "").trim().toLowerCase();
}

function getOldestDmByEmail(
    conversations: Conversation[],
    myEmail: string,
    otherEmail: string,
) {
    const myEmailLower = normalizeEmail(myEmail);
    const otherEmailLower = normalizeEmail(otherEmail);

    return conversations
        .filter((conversation) => {
            if (conversation.type !== "dm") return false;
            const emails = (conversation.member_emails ?? []).map(normalizeEmail);
            return emails.includes(myEmailLower) && emails.includes(otherEmailLower);
        })
        .sort(
            (a, b) =>
                new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime(),
        )[0];
}

async function deriveAppwriteUserId(email: string): Promise<string> {
    return (await sha256Hex(email.toLowerCase())).slice(0, 36);
}

function playNotificationPing() {
    if (typeof window === "undefined") return;

    const AudioContextCtor =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.exponentialRampToValueAtTime(660, now + 0.16);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.18);
    oscillator.onended = () => {
        void context.close();
    };
}

function showBrowserNotification(title: string, body: string) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    new Notification(title, {
        body,
        tag: "prornd-message",
        silent: true,
    });
}

export default function MessagesPage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeId = searchParams.get("c");

    const session = useAppwriteSession();
    const myUserId = session.user?.$id ?? null;
    const myEmail = session.user?.email ?? "";

    const { conversations, isLoading: convosLoading, refresh: refreshConvos } =
        useConversations(myUserId);
    const { unreadCounts, refresh: refreshUnreadCounts } =
        useConversationUnreadCounts(myUserId, conversations);
    const { messages, isLoading: msgsLoading, appendMessage, removeMessage, updateMessage } =
        useMessages(activeId, myUserId);
    const profileEmails = useMemo(() => {
        const emails = new Set<string>();
        if (myEmail) emails.add(myEmail);
        emails.add(PRORND_ADMIN_CONTACT.email);
        conversations.forEach((conversation) => {
            (conversation.member_emails ?? []).forEach((email) => emails.add(email));
            (conversation.typing_user_emails ?? []).forEach((email) => emails.add(email));
        });
        messages.forEach((message) => {
            if (message.sender_email) emails.add(message.sender_email);
        });
        return Array.from(emails);
    }, [conversations, messages, myEmail]);
    const userProfiles = useMessageUserProfiles(profileEmails);

    const [showNew, setShowNew] = useState(false);
    const [showGroupMembers, setShowGroupMembers] = useState(false);
    const [forwardMessage, setForwardMessage] = useState<Message | null>(null);
    const [replyMessage, setReplyMessage] = useState<Message | null>(null);
    const [isOpeningAdminChat, setIsOpeningAdminChat] = useState(false);
    const [search, setSearch] = useState("");
    const [isConversationListCollapsed, setIsConversationListCollapsed] = useState(false);
    const [isOnline, setIsOnline] = useState(
        typeof navigator === "undefined" ? true : navigator.onLine,
    );
    const [isDeletingChat, setIsDeletingChat] = useState(false);
    const [errorModal, setErrorModal] = useState<{
        open: boolean;
        title: string;
        message: string;
    }>({ open: false, title: "Error", message: "" });
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
        typeof window !== "undefined" && "Notification" in window
            ? Notification.permission
            : "denied",
    );
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const seenMessageIdsRef = useRef<Set<string>>(new Set());
    const unreadTotalRef = useRef<number | null>(null);
    const lastPingAtRef = useRef(0);

    const activeConversation = useMemo<Conversation | null>(
        () => conversations.find((c) => c.$id === activeId) ?? null,
        [conversations, activeId],
    );
    const activeTypingEmails = useMemo(() => {
        if (!activeConversation?.typing_updated_at) return [];
        const updatedAt = new Date(activeConversation.typing_updated_at).getTime();
        if (Number.isNaN(updatedAt) || Date.now() - updatedAt > 7000) return [];
        return (activeConversation.typing_user_emails ?? []).filter(
            (email) => email.toLowerCase() !== myEmail.toLowerCase(),
        );
    }, [activeConversation, myEmail]);
    const unreadTotal = useMemo(
        () => Object.values(unreadCounts).reduce((sum, count) => sum + count, 0),
        [unreadCounts],
    );

    const pingOnce = useCallback(() => {
        if (!notificationsEnabled) return;
        const now = Date.now();
        if (now - lastPingAtRef.current < 1200) return;
        lastPingAtRef.current = now;
        playNotificationPing();
    }, [notificationsEnabled]);

    const handleNotifyToggle = useCallback(async () => {
        if (!notificationsEnabled) {
            if (notificationPermission !== "granted") {
                const permission = await Notification.requestPermission();
                setNotificationPermission(permission);
                if (permission !== "granted") return;
            }
            setNotificationsEnabled(true);
            return;
        }
        setNotificationsEnabled(false);
    }, [notificationPermission, notificationsEnabled]);

    const selectConversation = useCallback((id: string) => {
        const next = new URLSearchParams(searchParams);
        next.set("c", id);
        setShowGroupMembers(false);
        setReplyMessage(null);
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const setOnline = () => setIsOnline(true);
        const setOffline = () => setIsOnline(false);
        window.addEventListener("online", setOnline);
        window.addEventListener("offline", setOffline);
        return () => {
            window.removeEventListener("online", setOnline);
            window.removeEventListener("offline", setOffline);
        };
    }, []);

    const activeTitle = useMemo(() => {
        if (!activeConversation) return "";
        if (activeConversation.type !== "dm") return activeConversation.title;
        const otherEmail =
            activeConversation.member_emails.find(
                (email) => normalizeEmail(email) !== normalizeEmail(myEmail),
            ) ?? "";
        if (normalizeEmail(otherEmail) === normalizeEmail(PRORND_ADMIN_CONTACT.email)) {
            return PRORND_ADMIN_CONTACT.name;
        }
        return userProfiles[otherEmail.toLowerCase()]?.fullName || otherEmail || activeConversation.title;
    }, [activeConversation, myEmail, userProfiles]);
    const activeUserDetail = useMemo(() => {
        if (!activeConversation || activeConversation.type !== "dm") return "";
        const otherEmail =
            activeConversation.member_emails.find(
                (email) => normalizeEmail(email) !== normalizeEmail(myEmail),
            ) ?? "";
        if (normalizeEmail(otherEmail) === normalizeEmail(PRORND_ADMIN_CONTACT.email)) {
            return PRORND_ADMIN_CONTACT.subtitle;
        }
        return formatMessageUserDetail(userProfiles[otherEmail.toLowerCase()]);
    }, [activeConversation, myEmail, userProfiles]);
    const activeTypingNames = useMemo(
        () =>
            activeTypingEmails.map(
                (email) => userProfiles[email.toLowerCase()]?.fullName || email,
            ),
        [activeTypingEmails, userProfiles],
    );

    const handleDeleteChat = async () => {
        if (!activeConversation || !myUserId) return;
        const ok = window.confirm("Delete this chat from your conversation list?");
        if (!ok) return;
        setIsDeletingChat(true);
        try {
            await leaveConversation(activeConversation, { userId: myUserId, email: myEmail });
            const next = new URLSearchParams(searchParams);
            next.delete("c");
            setSearchParams(next, { replace: true });
            refreshConvos();
            refreshUnreadCounts();
        } catch (error) {
            setErrorModal({
                open: true,
                title: "Delete Failed",
                message: parseFrappeError(error),
            });
        } finally {
            setIsDeletingChat(false);
        }
    };

    const handleTypingChange = useCallback(
        async (isTyping: boolean) => {
            if (!activeConversation || !myUserId || !myEmail) return;
            try {
                await updateTypingStatus(activeConversation, { userId: myUserId, email: myEmail }, isTyping);
                refreshConvos();
            } catch (error) {
                const message = error instanceof Error ? error.message : "";
                if (/unknown attribute:\s*"typing_/i.test(message)) return;
            }
        },
        [activeConversation, myEmail, myUserId, refreshConvos],
    );

    const openAdminConversation = useCallback(async () => {
        if (!myUserId || !myEmail || isOpeningAdminChat) return;
        if (normalizeEmail(myEmail) === normalizeEmail(PRORND_ADMIN_CONTACT.email)) return;

        setIsOpeningAdminChat(true);
        try {
            const existing = getOldestDmByEmail(
                conversations,
                myEmail,
                PRORND_ADMIN_CONTACT.email,
            );
            if (existing) {
                selectConversation(existing.$id);
                return;
            }

            const adminUserId = await deriveAppwriteUserId(PRORND_ADMIN_CONTACT.email);
            const conversation = await createConversation({
                me: { userId: myUserId, email: myEmail },
                others: [{ userId: adminUserId, email: PRORND_ADMIN_CONTACT.email }],
                title: PRORND_ADMIN_CONTACT.name,
            });
            refreshConvos();
            selectConversation(conversation.$id);
        } catch (error) {
            setErrorModal({
                open: true,
                title: "Unable to Open Chat",
                message: parseFrappeError(error),
            });
        } finally {
            setIsOpeningAdminChat(false);
        }
    }, [
        conversations,
        isOpeningAdminChat,
        myEmail,
        myUserId,
        refreshConvos,
        selectConversation,
    ]);

    useEffect(() => {
        const seen = seenMessageIdsRef.current;
        if (seen.size === 0) {
            messages.forEach((message) => seen.add(message.$id));
            return;
        }

        const hasNewIncoming = messages.some((message) => {
            const isNew = !seen.has(message.$id);
            seen.add(message.$id);
            return isNew && message.sender_id !== myUserId;
        });

        if (hasNewIncoming) {
            const latestIncoming = messages
                .slice()
                .reverse()
                .find((message) => message.sender_id !== myUserId);
            pingOnce();
            if (notificationsEnabled) {
                showBrowserNotification(
                    latestIncoming?.sender_email ?? "New message",
                    latestIncoming?.body || "Sent an attachment",
                );
            }
        }
    }, [messages, myUserId, notificationsEnabled, pingOnce]);

    useEffect(() => {
        const unreadTotal = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
        if (unreadTotalRef.current === null) {
            unreadTotalRef.current = unreadTotal;
            return;
        }
        if (unreadTotal > unreadTotalRef.current) {
            pingOnce();
            if (notificationsEnabled) {
                showBrowserNotification("New ProRnD message", `${unreadTotal} unread message${unreadTotal === 1 ? "" : "s"}`);
            }
        }
        unreadTotalRef.current = unreadTotal;
    }, [notificationsEnabled, unreadCounts, pingOnce]);

    /* ───── Session lifecycle states ───── */

    if (session.status === "connecting" || session.status === "idle") {
        return <GlobalLoader isLoading={true} />;
    }

    if (session.status === "error") {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-6">
                <div className="max-w-md bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-6 shadow-sm text-center">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
                    <h2 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-1">
                        Messaging unavailable
                    </h2>
                    <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mb-4">
                        {session.error}
                    </p>
                    <button onClick={() => navigate(-1)} className="btn-neutral">
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    if (!myUserId) return null;

    /* ───── Main UI ───── */

    return (
        <div className="w-full mx-auto space-y-4">
            <header className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] text-[#71717A] transition-colors hover:border-[#D97757]/30 hover:bg-[#D97757]/10 hover:text-[#D97757] dark:border-[#3F3F46] dark:bg-[#18181B]"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                        </button>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4A6CF7] text-white shadow-sm shadow-[#4A6CF7]/20">
                            <MessageCircle className="h-[18px] w-[18px]" />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
                                ProRnD Messaging
                            </div>
                            <h1 className="truncate font-sans text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7]">
                                Conversations
                            </h1>
                            <p className="mt-0.5 truncate text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                Focused project communication with files, reactions, read receipts, and unread tracking.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 md:flex md:items-center">
                        <div className="rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3 py-2 dark:border-[#3F3F46] dark:bg-[#18181B]">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">
                                Threads
                            </div>
                            <div className="text-[18px] font-extrabold leading-none text-[#2563EB]">
                                {conversations.length}
                            </div>
                        </div>
                        <div className="rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3 py-2 dark:border-[#3F3F46] dark:bg-[#18181B]">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">
                                Unread
                            </div>
                            <div className="text-[18px] font-extrabold leading-none text-[#D97757]">
                                {unreadTotal}
                            </div>
                        </div>
                        <div className="rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3 py-2 dark:border-[#3F3F46] dark:bg-[#18181B]">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">
                                Status
                            </div>
                            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                {isOnline ? "Online" : "Offline"}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleNotifyToggle}
                            className="rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] px-3 py-2 text-left transition-colors hover:border-[#4A6CF7]/40 hover:bg-[#EEF2FF] dark:border-[#3F3F46] dark:bg-[#18181B]"
                            title="Toggle message notifications"
                        >
                            <div className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA]">
                                Notify
                            </div>
                            <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
                                {notificationsEnabled && notificationPermission === "granted" ? (
                                    <BellRing className="h-3 w-3" />
                                ) : (
                                    <Bell className="h-3 w-3" />
                                )}
                                {notificationsEnabled && notificationPermission === "granted" ? "On" : "Off"}
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* Split view */}
            <div
                className="overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm flex"
                style={{ height: "calc(100vh - 220px)", minHeight: 480 }}
            >
                <ConversationList
                    conversations={conversations}
                    activeId={activeId}
                    onSelect={selectConversation}
                    onNew={() => setShowNew(true)}
                    isLoading={convosLoading}
                    searchTerm={search}
                    onSearch={setSearch}
                    myUserId={myUserId}
                    myEmail={myEmail}
                    unreadCounts={unreadCounts}
                    isCollapsed={isConversationListCollapsed}
                    onToggleCollapse={() =>
                        setIsConversationListCollapsed((isCollapsed) => !isCollapsed)
                    }
                    userProfiles={userProfiles}
                    pinnedAdmin={PRORND_ADMIN_CONTACT}
                    onSelectPinnedAdmin={openAdminConversation}
                />

                <div className="flex-1 flex flex-col">
                    {activeConversation && (
                        <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-white px-4 py-3 dark:border-[#3F3F46] dark:bg-[#27272A]">
                            <div className="min-w-0">
                                {activeConversation.type === "group" ? (
                                    <button
                                        type="button"
                                        onClick={() => setShowGroupMembers(true)}
                                        className="block max-w-full truncate text-left text-[13px] font-bold text-[#3F3F46] transition-colors hover:text-[#4A6CF7] dark:text-[#E4E4E7] dark:hover:text-[#93C5FD]"
                                        title="View group members"
                                    >
                                        {activeTitle}
                                    </button>
                                ) : (
                                    <div className="truncate text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                        {activeTitle}
                                    </div>
                                )}
                                {activeUserDetail && (
                                    <div className="mt-0.5 truncate text-[10px] font-semibold text-[#A16207] dark:text-[#FDBA74]">
                                        {activeUserDetail}
                                    </div>
                                )}
                                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-[#71717A]">
                                    <span
                                        className={
                                            isOnline
                                                ? "h-2 w-2 rounded-full bg-emerald-500"
                                                : "h-2 w-2 rounded-full bg-[#A1A1AA]"
                                        }
                                    />
                                    {activeTypingNames.length > 0
                                        ? `${activeTypingNames.join(", ")} typing...`
                                        : isOnline ? "Connected" : "Offline"}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDeleteChat}
                                disabled={isDeletingChat}
                                title="Delete chat"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] text-[#71717A] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#3F3F46] dark:bg-[#18181B]"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    <MessageThread
                        conversation={activeConversation}
                        messages={messages}
                        isLoading={msgsLoading}
                        myUserId={myUserId}
                        typingEmails={activeTypingEmails}
                        userProfiles={userProfiles}
                        onForward={setForwardMessage}
                        onReply={setReplyMessage}
                        onDeleted={(messageId) => {
                            removeMessage(messageId);
                            if (replyMessage?.$id === messageId) setReplyMessage(null);
                            refreshConvos();
                            refreshUnreadCounts();
                        }}
                        onUpdated={(message) => {
                            updateMessage(message);
                            refreshUnreadCounts();
                        }}
                    />
                    {activeConversation && (
                        <MessageComposer
                            conversation={activeConversation}
                            sender={{ userId: myUserId, email: myEmail }}
                            replyTo={replyMessage}
                            onCancelReply={() => setReplyMessage(null)}
                            onTypingChange={handleTypingChange}
                            onSent={(message) => {
                                appendMessage(message);
                                setReplyMessage(null);
                                refreshConvos();
                                refreshUnreadCounts();
                            }}
                        />
                    )}
                </div>
            </div>

            {showNew && (
                <NewConversationDialog
                    me={{ userId: myUserId, email: myEmail }}
                    existingConversations={conversations}
                    onClose={() => setShowNew(false)}
                    onCreated={(c) => {
                        setShowNew(false);
                        refreshConvos();
                        selectConversation(c.$id);
                    }}
                />
            )}

            {showGroupMembers && activeConversation?.type === "group" && (
                <GroupMembersDialog
                    conversation={activeConversation}
                    myUserId={myUserId}
                    myEmail={myEmail}
                    adminEmail={PRORND_ADMIN_CONTACT.email}
                    userProfiles={userProfiles}
                    onClose={() => setShowGroupMembers(false)}
                    onUpdated={() => {
                        refreshConvos();
                        refreshUnreadCounts();
                    }}
                />
            )}

            {forwardMessage && (
                <ForwardMessageDialog
                    message={forwardMessage}
                    conversations={conversations}
                    currentConversationId={activeConversation?.$id ?? ""}
                    sender={{ userId: myUserId, email: myEmail }}
                    myEmail={myEmail}
                    userProfiles={userProfiles}
                    onClose={() => setForwardMessage(null)}
                    onForwarded={() => {
                        refreshConvos();
                        refreshUnreadCounts();
                    }}
                />
            )}

            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
}
