import { useMemo } from "react";
import { useFrappeAuth } from "frappe-react-sdk";
import { ExternalLink } from "lucide-react";

// Project Staff SSO is an independent app; it is embedded here as-is.
// Over https it must itself be served over https, or the browser blocks the frame.
const ATTENDANCE_SSO_URL = (
    import.meta.env.VITE_ATTENDANCE_SSO_URL ||
    `http://${import.meta.env.VITE_ATTENDANCE_HOST || "172.16.135.27"}:${import.meta.env.VITE_ATTENDANCE_SSO_PORT || "7079"}`
).replace(/\/+$/, "");

export default function ProjectStaffAttendance() {
    const { currentUser } = useFrappeAuth();

    const url = useMemo(() => {
        if (!currentUser) return null;
        const username = currentUser.split("@")[0];
        const json = JSON.stringify({ username, projectCodes: [], timestamp: Date.now() });
        const token = btoa(
            Array.from(new TextEncoder().encode(json), (b) => String.fromCharCode(b)).join(""),
        );
        return `${ATTENDANCE_SSO_URL}/sso?token=${token}`;
    }, [currentUser]);

    if (!url) return null;

    // An http:// frame inside an https:// page is blocked as mixed active content, but a
    // new tab is a top-level navigation and is allowed — so fall back to a launcher.
    const frameBlocked = window.location.protocol === "https:" && url.startsWith("http:");

    if (frameBlocked) {
        return (
            <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
                <div className="max-w-md rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <h2 className="mb-2 text-lg font-semibold">Project Staff</h2>
                    <p className="mb-5 text-sm text-zinc-600 dark:text-zinc-400">
                        This application opens in a separate tab.
                    </p>
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#D97757] px-5 text-xs font-bold uppercase tracking-wide text-white shadow-sm hover:bg-[#c66a4e]"
                    >
                        <ExternalLink className="h-4 w-4" /> Open Project Staff
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-4rem)] flex-col">
            <div className="flex items-center justify-between border-b px-4 py-2">
                <span className="text-sm font-semibold">Project Staff</span>
                <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                    <ExternalLink className="h-4 w-4" /> Open in new tab
                </a>
            </div>
            <iframe title="Project Staff" src={url} className="w-full flex-1 border-0" />
        </div>
    );
}
