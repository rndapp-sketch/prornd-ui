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
