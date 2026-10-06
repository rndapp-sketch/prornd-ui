import { useEffect, useState } from "react";
import { ExternalLink, Globe, X } from "lucide-react";

const OFFICIAL_URL = "https://pragati.iitg.ac.in/";

// localhost, 127.x, or a bare IPv4 address (e.g. 172.16.135.118) — anything that isn't the domain.
const isLocalOrIpHost = (hostname: string) =>
    hostname === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

/**
 * Slide-in reminder (top right) shown when the app is opened through localhost or a raw IP
 * address instead of the official domain. Closable; it is a reminder, so it comes back on every
 * page load (a refresh or a new visit) and is only hidden for the current page view.
 */
export function DomainReminder() {
    const [visible, setVisible] = useState(false);
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        if (!isLocalOrIpHost(window.location.hostname)) return;
        // Small delay so the slide-in is noticed after the page paints.
        const t = window.setTimeout(() => setVisible(true), 600);
        return () => window.clearTimeout(t);
    }, []);

    const close = () => {
        setLeaving(true);
        window.setTimeout(() => setVisible(false), 250);
    };

    if (!visible) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={
                "fixed right-4 top-4 z-[200] w-[23rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border-2 border-amber-400 bg-amber-50 shadow-2xl shadow-amber-500/30 ring-4 ring-amber-300/40 transition-all duration-300 dark:border-amber-500 dark:bg-[#2A2418] dark:ring-amber-500/20 " +
                (leaving
                    ? "translate-x-8 opacity-0"
                    : "animate-in slide-in-from-right-8 fade-in duration-300")
            }
        >
            <div className="flex items-center gap-2 bg-amber-400 px-4 py-2 text-amber-950">
                <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-900/60" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-900" />
                </span>
                <p className="flex-1 text-[12px] font-extrabold uppercase tracking-wider">Important notice</p>
                <button
                    type="button"
                    onClick={close}
                    aria-label="Dismiss"
                    className="-mr-1 flex h-6 w-6 items-center justify-center rounded-md text-amber-950/80 hover:bg-amber-950/10 hover:text-amber-950"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            <div className="flex gap-3 p-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                    <Globe className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-zinc-900 dark:text-zinc-50">Please use the official address</p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-zinc-700 dark:text-zinc-300">
                        You opened this site using{" "}
                        <span className="rounded bg-amber-200/70 px-1 font-mono font-semibold text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                            {window.location.host}
                        </span>
                        . For the best experience and secure access, open PRAGATI from the domain.
                    </p>
                    <a
                        href={OFFICIAL_URL}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-sm transition-colors hover:bg-[#1D4ED8]"
                    >
                        Open pragati.iitg.ac.in <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                </div>
            </div>
        </div>
    );
}
