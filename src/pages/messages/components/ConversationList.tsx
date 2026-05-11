import { formatDistanceToNow } from "date-fns";
import { ChevronsLeft, ChevronsRight, MessageCircle, Plus, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    formatMessageUserDetail,
    type MessageUserProfile,
} from "@/hooks/useMessageUserProfiles";
import type { Conversation } from "@/services/messagingService";

interface ConversationListProps {
    conversations: Conversation[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
    isLoading: boolean;
    searchTerm: string;
    onSearch: (v: string) => void;
    myUserId: string;
    myEmail: string;
    unreadCounts: Record<string, number>;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
    userProfiles?: Record<string, MessageUserProfile>;
    pinnedAdmin?: {
        email: string;
        name: string;
        subtitle: string;
    };
    onSelectPinnedAdmin?: () => void;
}

const normalizeEmail = (value?: string | null) => (value ?? "").trim().toLowerCase();

function getOldestConversation(a: Conversation, b: Conversation) {
    return new Date(a.$createdAt).getTime() <= new Date(b.$createdAt).getTime() ? a : b;
}

export function ConversationList({
    conversations,
    activeId,
    onSelect,
    onNew,
    isLoading,
    searchTerm,
    onSearch,
    myUserId,
    myEmail,
    unreadCounts,
    isCollapsed,
    onToggleCollapse,
    userProfiles = {},
    pinnedAdmin,
    onSelectPinnedAdmin,
}: ConversationListProps) {
    const uniqueConversations = conversations.reduce<Conversation[]>((acc, conversation) => {
        if (conversation.type !== "dm") {
            acc.push(conversation);
            return acc;
        }

        const memberEmails = (conversation.member_emails ?? []).map(normalizeEmail);
        const uniqueMemberEmails = Array.from(new Set(memberEmails.filter(Boolean)));
        if (
            uniqueMemberEmails.length <= 1 &&
            uniqueMemberEmails[0] === normalizeEmail(myEmail)
        ) {
            return acc;
        }

        const otherEmail = (conversation.member_emails ?? []).find(
            (email) => normalizeEmail(email) !== normalizeEmail(myEmail),
        );
        const key = normalizeEmail(otherEmail);
        if (!key) {
            return acc;
        }

        const existingIndex = acc.findIndex((item) => {
            if (item.type !== "dm") return false;
            const itemOtherEmail = (item.member_emails ?? []).find(
                (email) => normalizeEmail(email) !== normalizeEmail(myEmail),
            );
            return normalizeEmail(itemOtherEmail) === key;
        });

        if (existingIndex === -1) {
            acc.push(conversation);
            return acc;
        }

        acc[existingIndex] = getOldestConversation(acc[existingIndex], conversation);
        return acc;
    }, []);

    const pinnedAdminEmail = normalizeEmail(pinnedAdmin?.email);
    const pinnedAdminConversation = pinnedAdminEmail
        ? uniqueConversations.find((conversation) => {
              if (conversation.type !== "dm") return false;
              const otherEmail = (conversation.member_emails ?? []).find(
                  (email) => normalizeEmail(email) !== normalizeEmail(myEmail),
              );
              return normalizeEmail(otherEmail) === pinnedAdminEmail;
          })
        : undefined;
    const shouldShowPinnedAdmin =
        Boolean(pinnedAdmin) && normalizeEmail(myEmail) !== pinnedAdminEmail;

    const listConversations = pinnedAdminConversation
        ? uniqueConversations.filter((conversation) => conversation.$id !== pinnedAdminConversation.$id)
        : uniqueConversations;

    const filtered = searchTerm
        ? listConversations.filter((c) => {
              const haystack = (
                  c.title +
                  " " +
                  (c.member_emails ?? []).join(" ") +
                  " " +
                  (c.last_message_preview ?? "")
              ).toLowerCase();
              return haystack.includes(searchTerm.toLowerCase());
          })
        : listConversations;

    return (
        <aside
            className={cn(
                "flex h-full flex-col border-r border-[#E4E4E7] bg-white transition-[width] duration-200 dark:border-[#3F3F46] dark:bg-[#27272A]",
                isCollapsed ? "w-[76px]" : "w-full max-w-[320px]",
            )}
        >
            {/* Header */}
            <div
                className={cn(
                    "flex items-center border-b border-[#E4E4E7] bg-[#FAFAF9] py-[14px] dark:border-[#3F3F46] dark:bg-[#27272A]",
                    isCollapsed ? "flex-col gap-2 px-2" : "justify-between px-[18px]",
                )}
            >
                <div className="flex items-center gap-2 text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center bg-blue-50 dark:bg-blue-950/20 text-[#2563EB]">
                        <MessageCircle className="w-3.5 h-3.5" />
                    </div>
                    {!isCollapsed && "Conversations"}
                </div>
                <div className={cn("flex items-center gap-1.5", isCollapsed && "flex-col")}>
                    <button
                        onClick={onNew}
                        title="New conversation"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#4A6CF7] hover:bg-[#3558E8] text-white transition-colors shadow-sm"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={onToggleCollapse}
                        title={isCollapsed ? "Expand conversations" : "Collapse conversations"}
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#E4E4E7] bg-white text-[#71717A] transition-colors hover:text-[#4A6CF7] dark:border-[#3F3F46] dark:bg-[#18181B]"
                    >
                        {isCollapsed ? (
                            <ChevronsRight className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronsLeft className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Search */}
            {!isCollapsed && (
                <div className="px-3 py-2.5 border-b border-[#F4F4F5] dark:border-[#3F3F46]">
                    <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A1A1AA]" />
                        <input
                            value={searchTerm}
                            onChange={(e) => onSearch(e.target.value)}
                            placeholder="Search messages…"
                            className="frappe-input h-8 w-full pl-7 text-[12px]"
                            style={{ paddingLeft: "2.5rem" }}
                        />
                    </div>
                </div>
            )}

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                {isLoading && (
                    <div className="px-4 py-6 text-[12px] text-[#71717A]">
                        {isCollapsed ? "…" : "Loading…"}
                    </div>
                )}

                {!isCollapsed && !isLoading && filtered.length === 0 && (
                    <div className="px-4 py-10 text-center text-[12px] text-[#71717A]">
                        {conversations.length === 0
                            ? "No conversations yet. Start a new one."
                            : "No conversations match your search."}
                    </div>
                )}

                {shouldShowPinnedAdmin && pinnedAdmin && (
                    <button
                        type="button"
                        onClick={() =>
                            pinnedAdminConversation
                                ? onSelect(pinnedAdminConversation.$id)
                                : onSelectPinnedAdmin?.()
                        }
                        title={isCollapsed ? pinnedAdmin.name : undefined}
                        className={cn(
                            "w-full text-left transition-colors flex border-l-[3px]",
                            isCollapsed
                                ? "justify-center px-2 py-3"
                                : "items-start gap-3 px-4 py-3",
                            pinnedAdminConversation?.$id === activeId
                                ? "border-[#4A6CF7] bg-[#EEF2FF] dark:bg-[#4A6CF7]/15"
                                : "border-[#4A6CF7] bg-[#F8FAFF] hover:bg-[#EEF2FF] dark:bg-[#4A6CF7]/10 dark:hover:bg-[#4A6CF7]/15",
                        )}
                    >
                        <div className="relative flex-shrink-0">
                            <div
                                className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-bold",
                                    pinnedAdminConversation?.$id === activeId
                                        ? "border-[#4A6CF7] bg-white text-[#1E3A8A]"
                                        : "border-[#C7D2FE] bg-[#EEF2FF] text-[#4A6CF7]",
                                )}
                            >
                                P
                            </div>
                            {pinnedAdminConversation &&
                                (unreadCounts[pinnedAdminConversation.$id] ?? 0) > 0 && (
                                    <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D97757] px-1 text-[9px] font-extrabold text-white shadow-sm">
                                        {(unreadCounts[pinnedAdminConversation.$id] ?? 0) > 99
                                            ? "99+"
                                            : unreadCounts[pinnedAdminConversation.$id]}
                                    </span>
                                )}
                        </div>
                        {!isCollapsed && (
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="truncate text-[13px] font-extrabold text-[#1E3A8A] dark:text-[#93C5FD]">
                                        {pinnedAdmin.name}
                                    </span>
                                    <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#4A6CF7] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD]">
                                        Admin
                                    </span>
                                </div>
                                <p className="mt-0.5 truncate text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                    {pinnedAdminConversation?.last_message_preview ||
                                        pinnedAdmin.subtitle}
                                </p>
                                <p className="mt-0.5 truncate text-[10px] font-semibold text-[#A16207] dark:text-[#FDBA74]">
                                    {pinnedAdmin.email}
                                </p>
                            </div>
                        )}
                    </button>
                )}

                {filtered.map((conv) => {
                    const isActive = conv.$id === activeId;
                    const unreadCount = unreadCounts[conv.$id] ?? 0;
                    const hasUnread = unreadCount > 0;
                    const subtitle =
                        conv.last_message_preview ||
                        (conv.type === "dm"
                            ? `Direct message`
                            : `${conv.members.length} members`);

                    const when = conv.last_message_at
                        ? formatDistanceToNow(new Date(conv.last_message_at), {
                              addSuffix: false,
                          })
                        : "";

                    const otherEmail = (conv.member_emails ?? []).find(
                        (e) => e.toLowerCase() !== myEmail.toLowerCase(),
                    );
                    const otherProfile = otherEmail
                        ? userProfiles[otherEmail.toLowerCase()]
                        : undefined;
                    const displayTitle =
                        conv.type === "dm"
                            ? otherProfile?.fullName || otherEmail || conv.title
                            : conv.title;
                    const userDetail =
                        conv.type === "dm" ? formatMessageUserDetail(otherProfile) : "";

                    return (
                        <button
                            key={conv.$id}
                            onClick={() => onSelect(conv.$id)}
                            title={isCollapsed ? displayTitle : undefined}
                            className={cn(
                                "w-full text-left transition-colors flex border-l-[3px]",
                                isCollapsed
                                    ? "justify-center px-2 py-3"
                                    : "items-start gap-3 px-4 py-3",
                                isActive
                                    ? "border-[#4A6CF7] bg-[#EEF2FF] dark:bg-[#4A6CF7]/15"
                                    : hasUnread
                                      ? "border-[#D97757] bg-[#FFF7ED] hover:bg-[#FFEDD5] dark:bg-[#3F2A22] dark:hover:bg-[#4A3127]"
                                      : "border-transparent hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50",
                            )}
                        >
                            <div className="relative flex-shrink-0">
                                <div
                                    className={cn(
                                        "flex h-9 w-9 items-center justify-center rounded-full border text-[12px] font-bold",
                                        isActive
                                            ? "border-[#4A6CF7] bg-white text-[#1E3A8A]"
                                            : hasUnread
                                              ? "border-[#D97757]/40 bg-[#D97757] text-white"
                                              : "border-[#E4E4E7] dark:border-[#3F3F46] bg-gradient-to-br from-[#EEF2FF] to-[#C7D2FE] text-[#4A6CF7] dark:from-[#4A6CF7]/20 dark:to-[#1E3A8A]/30 dark:text-[#93C5FD]",
                                    )}
                                >
                                    {displayTitle?.charAt(0)?.toUpperCase() ?? "?"}
                                </div>
                                {isCollapsed && hasUnread && (
                                    <span className="absolute -right-1.5 -top-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D97757] px-1 text-[9px] font-extrabold text-white shadow-sm">
                                        {unreadCount > 99 ? "99+" : unreadCount}
                                    </span>
                                )}
                            </div>
                            {!isCollapsed && (
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span
                                            className={cn(
                                                "truncate text-[13px] font-semibold",
                                                isActive
                                                    ? "text-[#1E3A8A] dark:text-[#93C5FD]"
                                                    : "text-[#3F3F46] dark:text-[#E4E4E7]",
                                            )}
                                        >
                                            {displayTitle}
                                        </span>
                                        <div className="flex flex-shrink-0 items-center gap-1.5">
                                            {when && (
                                                <span
                                                    className={cn(
                                                        "text-[10px] font-medium",
                                                        hasUnread
                                                            ? "text-[#A16207] dark:text-[#FDBA74]"
                                                            : "text-[#A1A1AA]",
                                                    )}
                                                >
                                                    {when}
                                                </span>
                                            )}
                                            {hasUnread && (
                                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D97757] px-1.5 text-[10px] font-extrabold text-white shadow-sm">
                                                    {unreadCount > 99 ? "99+" : unreadCount}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p
                                        className={cn(
                                            "mt-0.5 truncate text-[11px]",
                                            hasUnread
                                                ? "font-bold text-[#3F3F46] dark:text-[#F4F4F5]"
                                                : "text-[#71717A] dark:text-[#A1A1AA]",
                                        )}
                                    >
                                        {conv.last_sender_id === myUserId ? "You: " : ""}
                                        {subtitle}
                                    </p>
                                    {userDetail && (
                                        <p className="mt-0.5 truncate text-[10px] font-semibold text-[#A16207] dark:text-[#FDBA74]">
                                            {userDetail}
                                        </p>
                                    )}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </aside>
    );
}
