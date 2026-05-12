import { useMemo, useState } from "react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import type { Filter, FrappeDoc } from "frappe-js-sdk/lib/db/types";
import { useDebounce } from "use-debounce";
import { Check, MessageSquare, SearchIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { sha256Hex } from "@/lib/sha256";
import {
    createConversation,
    type Conversation,
} from "@/services/messagingService";

interface FrappeUser {
    name: string;       // email / id
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

interface SelectedUser {
    email: string;
    fullName: string;
    appwriteUserId: string;
}

interface NewConversationDialogProps {
    me: { userId: string; email: string };
    existingConversations: Conversation[];
    onClose: () => void;
    onCreated: (c: Conversation) => void;
}

function getOldestExistingDm(
    conversations: Conversation[],
    myEmail: string,
    otherEmail: string,
) {
    const myEmailLower = myEmail.toLowerCase();
    const otherEmailLower = otherEmail.toLowerCase();

    return conversations
        .filter((conversation) => {
            if (conversation.type !== "dm") return false;
            const emails = (conversation.member_emails ?? []).map((email) => email.toLowerCase());
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

export function NewConversationDialog({
    me,
    existingConversations,
    onClose,
    onCreated,
}: NewConversationDialogProps) {
    const [search, setSearch] = useState("");
    const [debounced] = useDebounce(search, 250);
    const [selected, setSelected] = useState<SelectedUser[]>([]);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const searchQuery = debounced.trim();
    const shouldSearchUsers = searchQuery.length >= 2;

    const filters = useMemo<FrappeUserFilter[]>(() => [
        ["enabled", "=", "1"],
        ["name", "!=", me.email],
        ["name", "!=", "Administrator"],
        ["name", "!=", "Guest"],
    ], [me.email]);

    const orFilters = useMemo<FrappeUserFilter[] | undefined>(() => {
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
        shouldSearchUsers ? undefined : null,
    );

    const visibleUsers = useMemo(() => {
        const seen = new Set<string>();
        const myEmail = normalizeEmail(me.email);
        return (users ?? []).filter((user) => {
            if (!shouldSearchUsers) return false;
            const key = normalizeEmail(user.email || user.name);
            const userName = normalizeEmail(user.name);
            if (!key || key === myEmail || userName === myEmail) return false;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [me.email, shouldSearchUsers, users]);

    const toggle = async (u: FrappeUser) => {
        const email = normalizeEmail(u.email || u.name);
        if (!email || email === normalizeEmail(me.email)) return;
        const exists = selected.find((s) => s.email.toLowerCase() === email);
        if (exists) {
            setSelected((curr) =>
                curr.filter((s) => s.email.toLowerCase() !== email),
            );
            return;
        }
        const appwriteUserId = await deriveAppwriteUserId(email);
        setSelected((curr) => [
            ...curr,
            {
                email,
                fullName:
                    u.full_name ||
                    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                    u.username ||
                    email,
                appwriteUserId,
            },
        ]);
    };

    const handleCreate = async () => {
        if (selected.length === 0) return;
        if (selected.some((user) => normalizeEmail(user.email) === normalizeEmail(me.email))) {
            setError("You cannot start a chat with yourself.");
            return;
        }
        setIsCreating(true);
        setError(null);
        try {
            if (selected.length === 1) {
                const existingDm = getOldestExistingDm(
                    existingConversations,
                    me.email,
                    selected[0].email,
                );
                if (existingDm) {
                    onCreated(existingDm);
                    return;
                }
            }

            const conv = await createConversation({
                me,
                others: selected.map((s) => ({
                    userId: s.appwriteUserId,
                    email: s.email,
                })),
            });
            onCreated(conv);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create conversation");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] bg-white dark:bg-[#27272A] shadow-2xl">
                <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />

                <div className="px-6 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                    <h2 className="text-[14px] font-extrabold text-[#18181B] dark:text-[#E4E4E7] flex items-center gap-2.5">
                        <span className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-[#4A6CF7]/15 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="w-3.5 h-3.5 text-[#4A6CF7] dark:text-[#93C5FD]" />
                        </span>
                        New conversation
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] text-[#71717A] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="px-6 py-4 space-y-3">
                    {selected.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {selected.map((s) => (
                                <span
                                    key={s.email}
                                    className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-[#EEF2FF] px-2 py-1 text-[11px] font-semibold text-[#1E3A8A] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD]"
                                >
                                    <span className="truncate">
                                        {s.fullName || s.email}
                                    </span>
                                    <button
                                        onClick={() =>
                                            setSelected((curr) =>
                                                curr.filter(
                                                    (x) =>
                                                        x.email.toLowerCase() !==
                                                        s.email.toLowerCase(),
                                                ),
                                            )
                                        }
                                        className="text-[#1E3A8A]/70 hover:text-[#1E3A8A]"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="relative">
                        <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A1A1AA]" />
                        <input
                            autoFocus
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search users by name…"
                            className="frappe-input h-10 w-full pl-11 text-[13px]"
                            style={{ paddingLeft: "2.75rem" }}
                        />
                    </div>

                    <div className="max-h-72 overflow-y-auto custom-scrollbar border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                        {!shouldSearchUsers && (
                            <div className="px-4 py-6 text-center text-[12px] text-[#71717A]">
                                Type at least 2 characters to search users.
                            </div>
                        )}
                        {shouldSearchUsers && isLoading && (
                            <div className="px-4 py-3 text-[12px] text-[#71717A]">Searching…</div>
                        )}
                        {shouldSearchUsers && !isLoading && visibleUsers.length === 0 && (
                            <div className="px-4 py-6 text-center text-[12px] text-[#71717A]">
                                No users match.
                            </div>
                        )}
                        {shouldSearchUsers &&
                            !isLoading &&
                            visibleUsers.map((u) => {
                                const email = (u.email || u.name).toLowerCase();
                                const displayName =
                                    u.full_name ||
                                    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                                    u.username ||
                                    email;
                                const picked = selected.find(
                                    (s) => s.email.toLowerCase() === email,
                                );
                                return (
                                    <button
                                        key={u.name}
                                        type="button"
                                        onClick={() => toggle(u)}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                                            picked
                                                ? "bg-[#EEF2FF] dark:bg-[#4A6CF7]/15"
                                                : "hover:bg-[#FAFAF9] dark:hover:bg-[#27272A]/50",
                                        )}
                                    >
                                        <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gradient-to-br from-[#EEF2FF] to-[#C7D2FE] text-[#4A6CF7] dark:from-[#4A6CF7]/20 dark:to-[#1E3A8A]/30 dark:text-[#93C5FD] border border-[#C7D2FE] dark:border-[#4A6CF7]/30 flex items-center justify-center text-[11px] font-bold">
                                            {displayName.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                                                {displayName}
                                            </p>
                                            <p className="text-[11px] text-[#71717A] truncate">
                                                {email}
                                            </p>
                                        </div>
                                        {picked && (
                                            <Check className="w-4 h-4 text-[#4A6CF7] flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })}
                    </div>

                    {error && (
                        <p className="text-[11px] font-semibold text-red-600">{error}</p>
                    )}
                </div>

                <div className="px-6 py-3 border-t border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-end gap-2 bg-[#FAFAF9] dark:bg-[#27272A]">
                    <button onClick={onClose} className="btn-neutral">
                        Cancel
                    </button>
                    <button
                        onClick={handleCreate}
                        disabled={selected.length === 0 || isCreating}
                        className={cn(
                            "btn-primary-accent",
                            (selected.length === 0 || isCreating) &&
                                "opacity-50 cursor-not-allowed",
                        )}
                    >
                        {isCreating ? "Creating…" : "Start conversation"}
                    </button>
                </div>
            </div>
        </div>
    );
}
