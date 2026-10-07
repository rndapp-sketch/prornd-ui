import * as React from "react";
import { createPortal } from "react-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { format } from "date-fns";
import { BellIcon, CalendarIcon, ClockIcon, MegaphoneIcon, XIcon } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { safeStorage } from "@/lib/safeStorage";
import { cn } from "@/lib/utils";

interface Announcement {
    name: string;
    title: string;
    message: string;
    start_date: string;
    end_date: string;
}

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

    const [seen, setSeen] = React.useState<string[]>(() => readSeen(user));
    const [selected, setSelected] = React.useState<Announcement | null>(null);
    const [menuOpen, setMenuOpen] = React.useState(false);

    const unreadCount = announcements.filter((a) => !seen.includes(a.name)).length;

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
            <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                            <button
                                className="relative h-8 w-8 flex items-center justify-center rounded-lg border border-transparent text-[#71717A] transition-all hover:border-[#D97757]/20 hover:bg-[#D97757]/10 hover:text-[#D97757] dark:hover:text-[#E88B6A]"
                                aria-label="Announcements"
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
                    <TooltipContent>Announcements</TooltipContent>
                </Tooltip>
                <DropdownMenuContent
                    align="end"
                    className="mt-2 w-80 overflow-hidden rounded-lg border-[#E4E4E7] bg-white p-0 shadow-xl dark:border-[#3F3F46] dark:bg-[#27272A]"
                >
                    <div className="flex items-center justify-between border-b border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2 dark:border-[#4A6CF7]/30 dark:bg-[#1E3A8A]/18">
                        <span className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wide text-[#1E3A8A] dark:text-[#C7D2FE]">
                            <MegaphoneIcon className="h-3.5 w-3.5" />
                            Announcements
                        </span>
                        {unreadCount > 0 && (
                            <span className="rounded-full bg-[#F97316] px-2 py-0.5 text-[10px] font-bold text-white">
                                {unreadCount} new
                            </span>
                        )}
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                        {announcements.length === 0 ? (
                            <p className="px-3 py-6 text-center text-[12px] text-[#71717A]">
                                No announcements right now.
                            </p>
                        ) : (
                            announcements.map((a) => {
                                const isNew = !seen.includes(a.name);
                                return (
                                    <button
                                        key={a.name}
                                        type="button"
                                        onClick={() => open(a)}
                                        className="flex w-full items-start gap-2 border-b border-[#F4F4F5] px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-[#EEF2FF] dark:border-[#3F3F46] dark:hover:bg-[#3F3F46]/40"
                                    >
                                        <span
                                            className={cn(
                                                "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                                                isNew ? "bg-[#F97316]" : "bg-transparent",
                                            )}
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span
                                                className={cn(
                                                    "block truncate text-[13px] text-[#3F3F46] dark:text-[#E4E4E7]",
                                                    isNew ? "font-bold" : "font-medium",
                                                )}
                                            >
                                                {a.title}
                                            </span>
                                            <span className="block text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                                {formatWhen(a.start_date)}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })
                        )}
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
                                    <MegaphoneIcon className="h-5 w-5" />
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
