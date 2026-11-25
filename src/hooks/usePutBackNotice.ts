import { useEffect, useState } from "react";
import useSWR from "swr";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";

export interface PutBackNotice {
    content: string;
    timestamp: string;
    label?: string;
}

/**
 * The "[Put Back]" entry of a document (logged on the workflow entry or as a comment), only while the
 * workflow has not moved on since: a later state change removes the notice. Read-only, from the same
 * activity feed as the document's Activity Log.
 */
export async function fetchLatestPutBack(doctype: string, docname: string): Promise<PutBackNotice | null> {
    try {
        const res = await fetch(
            `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.api.get_document_activity?doctype=${encodeURIComponent(doctype)}&docname=${encodeURIComponent(docname)}`,
            { credentials: "include" },
        );
        if (!res.ok) return null;
        const json = await res.json();
        const entries: any[] = Array.isArray(json?.message) ? json.message : [];
        const time = (e: any) => new Date(e.timestamp).getTime();
        const isPutBack = (e: any) => String(e?.content ?? "").toLowerCase().includes("[put back]");
        // The put-back is logged on the workflow entry (and sometimes as a comment): take the newest one
        const putBack = entries.filter(isPutBack).sort((x, y) => time(y) - time(x))[0];
        if (!putBack) return null;
        // It stays active until the workflow moves on: a later state change that is not the put-back itself
        const movedOn = entries.some(
            (e) => e.type === "workflow" && !isPutBack(e) && time(e) > time(putBack) + 10_000,
        );
        if (movedOn) return null;
        return { content: putBack.content || "", timestamp: putBack.timestamp, label: putBack.label };
    } catch {
        return null;
    }
}

/** The put-back notice of one document (null when there is none). */
export function usePutBackNotice(doctype: string, docname?: string | null): PutBackNotice | null {
    const [notice, setNotice] = useState<PutBackNotice | null>(null);
    useEffect(() => {
        if (!docname) {
            setNotice(null);
            return;
        }
        let cancelled = false;
        fetchLatestPutBack(doctype, docname).then((n) => !cancelled && setNotice(n));
        return () => {
            cancelled = true;
        };
    }, [doctype, docname]);
    return notice;
}

/** How many of these documents currently carry a put-back notice (for the sidebar badge). */
export function usePutBackCount(doctype: string, names: string[], enabled: boolean): number {
    const key = enabled && names.length ? ["put-back-count", doctype, ...names.slice(0, 40)] : null;
    const { data } = useSWR(
        key,
        async () => {
            const results = await Promise.all(names.slice(0, 40).map((n) => fetchLatestPutBack(doctype, n)));
            return results.filter(Boolean).length;
        },
        { revalidateOnFocus: false, dedupingInterval: 60_000 },
    );
    return enabled ? (data ?? 0) : 0;
}
