import * as React from "react";
import { createPortal } from "react-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { BellIcon, CalendarIcon, ClockIcon, MegaphoneIcon, RotateCcwIcon, XIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { safeStorage } from "@/lib/safeStorage";
import { cn } from "@/lib/utils";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";

interface Announcement {
    name: string;
    title: string;
    message: string;
    start_date: string;
    end_date: string;
}

// Unread "put back" rows from Put Back Registry (see put_back_action.py).
// Field names are read defensively since the payload is the raw registry row.
interface PutBackNotification {
    name?: string;
    [key: string]: any;
}

const PUT_BACK_NOTIFICATIONS = "rndopsapp.rndopsapp.put_back_action.get_my_put_back_notifications";

const pick = (n: PutBackNotification, keys: string[]): string => {
    for (const k of keys) if (n[k]) return String(n[k]);
    return "";
};

const putBackRoute = (doctype: string, name: string): string | null => {
    const id = encodeURIComponent(name);
    switch (doctype) {
        case "Indent Cum Sanction Sheet": return `/indent-cum-sanction-sheet/${id}`;
        case "Indent General Form": return `/indent-general-form-details/${id}`;
        case "Travel": return `/travel/${id}`;
        case "Reimbursement": return `/reimbursement/${id}`;
        case "Direct Purchase": return `/direct-purchase/${id}`;
        case "Project Staff Extension": return `/project-staff-extension?edit=${id}`;
        case "Project Staff Resignation": return `/project-staff-resignation?edit=${id}`;
        default: return null;
    }
};

const initials = (name: string) =>
    name.replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

// Facebook-style round avatar with a small coloured type badge at the bottom-right.
function NotifAvatar({ label, badge, tone }: { label?: string; badge: React.ReactNode; tone: string }) {
    return (
        <span className="relative h-7 w-7 shrink-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E4E6EB] text-[10px] font-bold text-[#65676B] dark:bg-[#3A3B3C] dark:text-[#E4E6EB]">
                {label ?? badge}
            </span>
            {label !== undefined && (
                <span className={cn("absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white text-white dark:border-[#242526]", tone)}>
                    {badge}
                </span>
            )}
        </span>
    );
}

const UnreadDot = () => <span className="h-2 w-2 shrink-0 self-center rounded-full bg-[#0866FF]" />;

const rowClass = "flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-[#F2F2F2] dark:hover:bg-[#3A3B3C]";

const SEEN_KEY = "prornd_seen_announcements";

const readSeen = (user: string): string[] => {
    try {
        const parsed = JSON.parse(safeStorage.getItem(`${SEEN_KEY}:${user}`) || "[]");
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const formatWhen = (value?: string) => {
    if (!value) return "";
    const date = new Date(value.replace(" ", "T"));
    return Number.isNaN(date.getTime()) ? value : format(date, "dd MMM yyyy, hh:mm a");
};

/**
 * Header bell for "Announcement Pragati" docs. The list comes from the
 * server-side `get_visible_announcements` (already filtered by date window,
 * disabled flag and the user's roles). "Unread" is tracked per user in
 * localStorage — opening an announcement marks it as seen.
 */
export function AnnouncementBell({ user }: { user: string }) {
    const { data } = useFrappeGetCall<{ message: Announcement[] }>(
        "rndopsapp.rndopsapp.doctype.announcement_pragati.announcement_pragati.get_visible_announcements",
        undefined,
        user ? `announcements-${user}` : null,
        { revalidateOnFocus: true, refreshInterval: 5 * 60 * 1000 },
    );
    const announcements = data?.message ?? [];

    const navigate = useNavigate();
    const { data: putBackData, mutate: refreshPutBack } = useFrappeGetCall<{
        message: { status: string; count: number; notifications: PutBackNotification[] };
    }>(PUT_BACK_NOTIFICATIONS, { mark_read: 0 }, user ? `put-back-${user}` : null, {
        revalidateOnFocus: true,
        refreshInterval: 5 * 60 * 1000,
    });
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [tab, setTab] = React.useState<"new" | "history">("new");
    // History = every put back for the user (read ones included); needs include_read=1 on the backend.
    const { data: historyData } = useFrappeGetCall<{
        message: { notifications: PutBackNotification[] };
    }>(PUT_BACK_NOTIFICATIONS, { mark_read: 0, include_read: 1 }, user && tab === "history" && menuOpen ? `put-back-history-${user}` : null);
    const history = historyData?.message?.notifications ?? [];
    const putBacks = putBackData?.message?.notifications ?? [];
    const putBackCount = putBackData?.message?.count ?? putBacks.length;

    const [seen, setSeen] = React.useState<string[]>(() => readSeen(user));
    const [selected, setSelected] = React.useState<Announcement | null>(null);

    const unreadCount = announcements.filter((a) => !seen.includes(a.name)).length + putBackCount;

    // Opening the menu shows the list as fetched, marks the put backs read on the
    // server, and refreshes once closed so the badge clears.
    const handleMenuOpenChange = async (next: boolean) => {
        setMenuOpen(next);
        if (next && putBackCount > 0) {
            try {
                await fetch(`${FRAPPE_BASE_URL}/api/method/${PUT_BACK_NOTIFICATIONS}?mark_read=1`, { credentials: "include" });
            } catch { /* stays unread */ }
        } else if (!next) {
            refreshPutBack();
        }
    };

    const openPutBack = (n: PutBackNotification) => {
        const route = putBackRoute(
            pick(n, ["application_doctype", "doctype_name", "reference_doctype", "document_type"]),
            pick(n, ["application_docname", "docname", "reference_name", "document_name"]),
        );
        handleMenuOpenChange(false);
        if (route) navigate(route);
    };

    const renderPutBacks = (list: PutBackNotification[], allUnread: boolean) => (
        <>
            {list.map((n, i) => {
                const dt = pick(n, ["application_doctype", "doctype_name", "reference_doctype", "document_type"]);
                const dn = pick(n, ["application_docname", "docname", "reference_name", "document_name"]);
                const by = pick(n, ["put_back_by_name", "put_back_by", "session_user"]);
                const toState = pick(n, ["to_state"]);
                const reason = pick(n, ["reason"]);
                const unread = allUnread || !n.is_read;
                return (
                    <button
                        key={n.name ?? `${dn}-${i}`}
                        type="button"
                        onClick={() => openPutBack(n)}
                        className={rowClass}
                    >
                        <NotifAvatar label={initials(by)} badge={<RotateCcwIcon className="h-2 w-2" />} tone="bg-[#F02849]" />
                        <span className="min-w-0 flex-1">
                            <span className="block text-[11.5px] leading-snug text-[#050505] dark:text-[#E4E6EB]">
                                <b>{by || "Someone"}</b> put back your {dt} <b>{dn}</b>
                                {toState ? <> to <b>{toState}</b></> : null}
                                {reason ? <>: <span className="text-[#65676B] dark:text-[#B0B3B8]">“{reason}”</span></> : null}
                            </span>
                            <span className={cn("mt-0 block text-[10px]", unread ? "font-semibold text-[#0866FF]" : "text-[#65676B] dark:text-[#B0B3B8]")}>
                                {formatWhen(pick(n, ["timestamp", "creation"]))}
                            </span>
                        </span>
                        {unread && <UnreadDot />}
                    </button>
                );
            })}
        </>
    );

    const open = (announcement: Announcement) => {
        setMenuOpen(false);
        setSelected(announcement);
        if (!seen.includes(announcement.name)) {
            const next = [...seen, announcement.name];
            setSeen(next);
            safeStorage.setItem(`${SEEN_KEY}:${user}`, JSON.stringify(next));
        }
    };

    return (
        <>
            <DropdownMenu open={menuOpen} onOpenChange={handleMenuOpenChange}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="relative h-8 w-8 flex items-center justify-center rounded-lg border border-transparent text-[#71717A] transition-all hover:border-[#D97757]/20 hover:bg-[#D97757]/10 hover:text-[#D97757] dark:hover:text-[#E88B6A]"
                                aria-label="Notifications"
                            >
                                <BellIcon className="h-4 w-4" />
                                {unreadCount > 0 && (
                                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#F97316] px-1 text-[10px] font-bold leading-none text-white">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                )}
                            </button>
                        </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                    align="end"
                    sideOffset={10}
                    className="relative w-[260px] overflow-visible rounded-xl border-0 bg-white p-0 shadow-[0_12px_28px_rgba(0,0,0,0.2),0_2px_4px_rgba(0,0,0,0.1)] dark:bg-[#242526]"
                >
                    {/* Arrow pointing at the bell */}
                    <span className="pointer-events-none absolute -top-1 right-[11px] h-2.5 w-2.5 rotate-45 rounded-[2px] bg-white dark:bg-[#242526]" />
                    <div className="relative overflow-hidden rounded-xl">
                    <div className="px-3 pb-1 pt-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[14px] font-bold leading-5 text-[#050505] dark:text-[#E4E6EB]">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="rounded-full bg-[#0866FF] px-1.5 py-px text-[10px] font-bold text-white">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        <div className="mt-1.5 flex gap-1.5">
                            {(["new", "history"] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setTab(t)}
                                    className={cn(
                                        "rounded-full px-2 py-0.5 text-[11px] font-semibold transition-colors",
                                        tab === t
                                            ? "bg-[#E7F3FF] text-[#0866FF] dark:bg-[#263951] dark:text-[#2D88FF]"
                                            : "text-[#050505] hover:bg-[#F2F2F2] dark:text-[#E4E6EB] dark:hover:bg-[#3A3B3C]",
                                    )}
                                >
                                    {t === "new" ? "Latest" : "History"}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="max-h-[50vh] overflow-y-auto px-1.5 pb-1.5">
                        {tab === "history" ? (
                            history.length === 0 ? (
                                <p className="px-3 py-6 text-center text-[12px] text-[#65676B] dark:text-[#B0B3B8]">
                                    No notification history.
                                </p>
                            ) : (
                                <>
                                    <p className="px-1.5 pb-0.5 pt-1 text-[12px] font-semibold text-[#050505] dark:text-[#E4E6EB]">Earlier</p>
                                    {renderPutBacks(history, false)}
                                </>
                            )
                        ) : announcements.length === 0 && putBacks.length === 0 ? (
                            <p className="px-3 py-6 text-center text-[12px] text-[#65676B] dark:text-[#B0B3B8]">
                                No notifications right now.
                            </p>
                        ) : (
                            <>
                                <p className="px-1.5 pb-0.5 pt-1 text-[12px] font-semibold text-[#050505] dark:text-[#E4E6EB]">New</p>
                                {renderPutBacks(putBacks, true)}
                                {announcements.map((a) => {
                                    const isNew = !seen.includes(a.name);
                                    return (
                                        <button key={a.name} type="button" onClick={() => open(a)} className={rowClass}>
                                            <NotifAvatar badge={<MegaphoneIcon className="h-3.5 w-3.5" />} tone="" />
                                            <span className="min-w-0 flex-1">
                                                <span className={cn("block text-[11.5px] leading-snug text-[#050505] dark:text-[#E4E6EB]", isNew && "font-semibold")}>
                                                    {a.title}
                                                </span>
                                                <span className={cn("mt-0 block text-[10px]", isNew ? "font-semibold text-[#0866FF]" : "text-[#65676B] dark:text-[#B0B3B8]")}>
                                                    {formatWhen(a.start_date)}
                                                </span>
                                            </span>
                                            {isNew && <UnreadDot />}
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </div>
                    </div>
                </DropdownMenuContent>
            </DropdownMenu>

            {selected &&
                createPortal(
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-150"
                    onClick={() => setSelected(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label={selected.title}
                        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-2xl animate-in zoom-in-95 duration-150 dark:border-[#3F3F46] dark:bg-[#27272A]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Banner */}
                        <div className="relative border-b border-[#E4E4E7] bg-white px-5 pb-3 pt-4 dark:border-[#3F3F46] dark:bg-[#27272A]">
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                aria-label="Close"
                                className="absolute right-3 top-3 rounded-md p-1 text-[#71717A] transition-colors hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]"
                            >
                                <XIcon className="h-4 w-4" />
                            </button>
                            <div className="flex items-start gap-3 pr-6">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4A6CF7] dark:bg-[#4A6CF7]/15">
                                    <MegaphoneIcon className="h-3.5 w-3.5" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#D97757]">
                                        Announcement
                                    </span>
                                    <h2 className="text-[18px] font-extrabold leading-tight text-[#3F3F46] dark:text-[#E4E4E7]">{selected.title}</h2>
                                </div>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#F4F4F5] px-2.5 py-1 text-[#52525B] dark:bg-[#3F3F46] dark:text-[#D4D4D8]">
                                    <CalendarIcon className="h-3 w-3" />
                                    From {formatWhen(selected.start_date)}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-[#F4F4F5] px-2.5 py-1 text-[#52525B] dark:bg-[#3F3F46] dark:text-[#D4D4D8]">
                                    <ClockIcon className="h-3 w-3" />
                                    Until {formatWhen(selected.end_date)}
                                </span>
                            </div>
                        </div>

                        {/* Message */}
                        <div className="flex-1 overflow-y-auto bg-[#FAFAF9] px-5 py-4 dark:bg-[#18181B]">
                            <div className="rounded-lg border border-[#E4E4E7] bg-white p-4 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                                <div
                                    className="announcement-body"
                                    dangerouslySetInnerHTML={{ __html: selected.message }}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end border-t border-[#E4E4E7] bg-white px-5 py-3 dark:border-[#3F3F46] dark:bg-[#27272A]">
                            <button
                                type="button"
                                onClick={() => setSelected(null)}
                                className="h-9 rounded-lg bg-[#2563EB] px-5 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            ,
                    document.body,
                )}
        </>
    );
}
