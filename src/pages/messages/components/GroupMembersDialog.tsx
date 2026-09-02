import { useMemo, useState } from "react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import type { Filter, FrappeDoc } from "frappe-js-sdk/lib/db/types";
import { useDebounce } from "use-debounce";
import { SearchIcon, Trash2, UserPlus, Users, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { sha256Hex } from "@/lib/sha256";
import type { MessageUserProfile } from "@/hooks/useMessageUserProfiles";
import {
    updateConversationMembers,
    type Conversation,
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

interface GroupMembersDialogProps {
    conversation: Conversation;
    myUserId: string;
    myEmail: string;
    adminEmail: string;
    userProfiles: Record<string, MessageUserProfile>;
    onClose: () => void;
    onUpdated: (conversation: Conversation) => void;
}

const USER_FETCH_LIMIT = 10000;
const normalizeEmail = (value?: string | null) => (value ?? "").trim().toLowerCase();

async function deriveAppwriteUserId(email: string): Promise<string> {
    return (await sha256Hex(email.toLowerCase())).slice(0, 36);
}

function getUserDisplayName(user: FrappeUser) {
    const email = normalizeEmail(user.email || user.name);
    return (
        user.full_name ||
        [user.first_name, user.last_name].filter(Boolean).join(" ") ||
        user.username ||
        email
    );
}

export function GroupMembersDialog({
    conversation: initialConversation,
    myUserId,
    myEmail,
    adminEmail,
    userProfiles,
    onClose,
    onUpdated,
}: GroupMembersDialogProps) {
    const [conversation, setConversation] = useState(initialConversation);
    const [search, setSearch] = useState("");
    const [debounced] = useDebounce(search, 250);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const searchQuery = debounced.trim();
    const shouldSearchUsers = searchQuery.length >= 2;
    const creatorUserId = conversation.members[0] ?? "";
    const creatorEmail = conversation.member_emails[0] ?? "";
    const isManager =
        myUserId === creatorUserId ||
        normalizeEmail(myEmail) === normalizeEmail(adminEmail);

    const memberEmailSet = useMemo(
        () => new Set((conversation.member_emails ?? []).map(normalizeEmail)),
        [conversation.member_emails],
    );

    const filters = useMemo<FrappeUserFilter[]>(() => [
        ["enabled", "=", "1"],
        ["name", "!=", myEmail],
        ["name", "!=", "Administrator"],
        ["name", "!=", "Guest"],
    ], [myEmail]);

    const orFilters = useMemo<FrappeUserFilter[] | undefined>(() => {
        if (!shouldSearchUsers) return undefined;
        return [
            ["full_name", "like", `%${searchQuery}%`],
            ["email", "like", `%${searchQuery}%`],
            ["name", "like", `%${searchQuery}%`],
            ["username", "like", `%${searchQuery}%`],
            ["first_name", "like", `%${searchQuery}%`],
            ["last_name", "like", `%${searchQuery}%`],
        ];
    }, [searchQuery, shouldSearchUsers]);

    const { data: users, isLoading } = useFrappeGetDocList<FrappeUser>(
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
            filters,
            orFilters,
            limit: USER_FETCH_LIMIT,
            orderBy: { field: "full_name", order: "asc" },
        },
        isManager && shouldSearchUsers ? undefined : null,
    );

    const visibleUsers = useMemo(() => {
        const seen = new Set<string>();
        return (users ?? []).filter((user) => {
            const email = normalizeEmail(user.email || user.name);
            const userName = normalizeEmail(user.name);
            if (!email || email === normalizeEmail(myEmail) || userName === normalizeEmail(myEmail)) {
                return false;
            }
            if (memberEmailSet.has(email) || seen.has(email)) return false;
            seen.add(email);
            return true;
        });
    }, [memberEmailSet, myEmail, users]);

    const saveMembers = async (members: { userId: string; email: string }[]) => {
        setIsSaving(true);
        setError(null);
        try {
            const updated = await updateConversationMembers(conversation, members);
            setConversation(updated);
            onUpdated(updated);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to update group members");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddUser = async (user: FrappeUser) => {
        if (!isManager || isSaving) return;
        const email = normalizeEmail(user.email || user.name);
        if (!email || memberEmailSet.has(email)) return;
        const userId = await deriveAppwriteUserId(email);
        await saveMembers([
            ...conversation.members.map((memberId, index) => ({
                userId: memberId,
                email: conversation.member_emails[index],
            })),
            { userId, email },
        ]);
        setSearch("");
    };

    const handleRemoveUser = async (email: string) => {
        if (!isManager || isSaving) return;
        if (normalizeEmail(email) === normalizeEmail(creatorEmail)) return;
        if (conversation.members.length <= 2) {
            setError("A group must have at least 2 members.");
            return;
        }
        await saveMembers(
            conversation.members
                .map((memberId, index) => ({
                    userId: memberId,
                    email: conversation.member_emails[index],
                }))
                .filter((member) => normalizeEmail(member.email) !== normalizeEmail(email)),
        );
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 px-4 backdrop-blur-[2px]">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border-[1.5px] border-[#D4D4D8] bg-white shadow-2xl dark:border-[#52525B] dark:bg-[#27272A]">
                <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                <div className="flex items-center justify-between border-b border-[#E4E4E7] px-6 py-4 dark:border-[#3F3F46]">
                    <h2 className="flex min-w-0 items-center gap-2.5 text-[14px] font-extrabold text-[#18181B] dark:text-[#E4E4E7]">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] dark:bg-[#4A6CF7]/15">
                            <Users className="h-3.5 w-3.5 text-[#4A6CF7] dark:text-[#93C5FD]" />
                        </span>
                        <span className="truncate">{conversation.title}</span>
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 text-[#71717A] transition-colors hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-3 px-6 py-4">
                    <div className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA]">
                        {conversation.member_emails.length} members
                        {isManager ? " · You can add or remove members" : ""}
                    </div>

                    <div className="max-h-56 overflow-y-auto rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                        {conversation.member_emails.map((email, index) => {
                            const normalizedEmail = normalizeEmail(email);
                            const profile = userProfiles[normalizedEmail];
                            const name = profile?.fullName || email;
                            const isCreator = index === 0;
                            const canRemove =
                                isManager &&
                                !isCreator &&
                                conversation.member_emails.length > 2;

                            return (
                                <div
                                    key={`${email}-${index}`}
                                    className="flex items-center gap-3 border-b border-[#F4F4F5] px-3 py-2.5 last:border-b-0 dark:border-[#3F3F46]"
                                >
                                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[#C7D2FE] bg-gradient-to-br from-[#EEF2FF] to-[#C7D2FE] text-[12px] font-bold text-[#4A6CF7] dark:border-[#4A6CF7]/30 dark:from-[#4A6CF7]/20 dark:to-[#1E3A8A]/30 dark:text-[#93C5FD]">
                                        {name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="truncate text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                {name}
                                            </p>
                                            {isCreator && (
                                                <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[#D97757] dark:bg-[#D97757]/15 dark:text-[#FDBA74]">
                                                    Creator
                                                </span>
                                            )}
                                        </div>
                                        <p className="truncate text-[11px] font-semibold text-[#71717A]">
                                            {email}
                                        </p>
                                    </div>
                                    {isManager && !isCreator && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveUser(email)}
                                            disabled={!canRemove || isSaving}
                                            title={canRemove ? "Remove member" : "A group needs at least 2 members"}
                                            className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] text-[#71717A] transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#3F3F46] dark:bg-[#18181B]"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {isManager && (
                        <>
                            <div className="relative">
                                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A1A1AA]" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search users to add..."
                                    className="frappe-input h-10 w-full pl-11 text-[13px]"
                                    style={{ paddingLeft: "2.75rem" }}
                                />
                            </div>

                            <div className="max-h-48 overflow-y-auto rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                                {!shouldSearchUsers && (
                                    <div className="px-4 py-4 text-center text-[12px] text-[#71717A]">
                                        Type at least 2 characters to search users.
                                    </div>
                                )}
                                {shouldSearchUsers && isLoading && (
                                    <div className="px-4 py-3 text-[12px] text-[#71717A]">
                                        Searching...
                                    </div>
                                )}
                                {shouldSearchUsers && !isLoading && visibleUsers.length === 0 && (
                                    <div className="px-4 py-4 text-center text-[12px] text-[#71717A]">
                                        No users match.
                                    </div>
                                )}
                                {shouldSearchUsers &&
                                    !isLoading &&
                                    visibleUsers.map((user) => {
                                        const email = normalizeEmail(user.email || user.name);
                                        const title = getUserDisplayName(user);

                                        return (
                                            <button
                                                key={email}
                                                type="button"
                                                onClick={() => handleAddUser(user)}
                                                disabled={isSaving}
                                                className={cn(
                                                    "flex w-full items-center gap-3 border-b border-[#F4F4F5] px-3 py-2.5 text-left transition-colors last:border-b-0 dark:border-[#3F3F46]",
                                                    "hover:bg-[#FAFAF9] disabled:cursor-not-allowed disabled:opacity-60 dark:hover:bg-[#18181B]",
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
                                                <UserPlus className="h-4 w-4 flex-shrink-0 text-[#4A6CF7]" />
                                            </button>
                                        );
                                    })}
                            </div>
                        </>
                    )}

                    {error && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] font-semibold text-red-700 dark:bg-red-950/30 dark:text-red-400">
                            {error}
                        </p>
                    )}
                </div>

                <div className="flex items-center justify-end border-t border-[#E4E4E7] bg-[#FAFAF9] px-6 py-3 dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <button onClick={onClose} className="btn-neutral">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
