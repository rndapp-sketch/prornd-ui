/**
 * Builds the printable "Activity Log" section (approver name & designation —
 * comment — time) for a document, reusing the same backend endpoint the
 * on-screen <ActivityLog> widget uses (rndopsapp.rndopsapp.api.get_document_activity),
 * so the print matches what's shown in the app. Runs outside React (plain
 * fetch), for use by print-PDF generators that build a plain HTML string.
 */
interface ActivityEntry {
    type: string;
    label: string;
    user: string;
    user_email: string;
    timestamp: string;
    content?: string;
}

const esc = (val: any): string => {
    if (val === null || val === undefined || val === "") return "-";
    return String(val)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
};

// Print-only label override — "created this" (get_document_activity's generic
// label for the doc-creation entry) reads oddly for an application form;
// "Submitted" matches how this app's workflow docs actually get their start.
// Scoped to this print utility only, not the shared backend label, so the
// on-screen <ActivityLog> widget (used by non-workflow doctypes too) is unaffected.
const LABEL_OVERRIDES: Record<string, string> = {
    "created this": "Submitted",
};

const fmtTimestamp = (val: string): string => {
    if (!val) return "-";
    try {
        return new Date(val).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    } catch {
        return val;
    }
};

async function resolveDesignation(email: string): Promise<string> {
    if (!email) return "";
    try {
        // Goes through a whitelisted method rather than frappe.client.get_value
        // directly — "User" read permission is restricted to System Manager /
        // Permanent Employee, so a direct call 403s for other approver roles
        // (e.g. Dean, RnD), silently leaving the designation blank.
        const params = new URLSearchParams({ email });
        const res = await fetch(
            `/api/method/rndopsapp.rndopsapp.api.get_user_designation?${params.toString()}`,
            { credentials: "include" },
        );
        if (!res.ok) return "";
        const json = await res.json();
        return json?.message?.designation_name || "";
    } catch {
        return "";
    }
}

/**
 * Returns a full "Activity Log" section (title + table), or "" if the
 * document has no activity — safe to drop straight into a {{PLACEHOLDER}}.
 */
export async function fetchActivityLogHtml(doctype: string, docname: string): Promise<string> {
    if (!docname) return "";
    try {
        const params = new URLSearchParams({ doctype, docname });
        const res = await fetch(
            `/api/method/rndopsapp.rndopsapp.api.get_document_activity?${params.toString()}`,
            { credentials: "include" },
        );
        if (!res.ok) return "";
        const json = await res.json();
        const entries: ActivityEntry[] = Array.isArray(json?.message) ? json.message : [];
        if (!entries.length) return "";

        // Oldest first, so the printed table reads as a chronological story.
        // Exclude Administrator system entries (manual overrides, etc.) — they
        // are internal housekeeping and should not appear on printed copies.
        // "cancellation" entries are the linked Cancellation Request's own
        // timeline, merged in by get_document_activity for the on-screen widget;
        // they belong to a different document and are kept off printed copies.
        const sorted = [...entries]
            .filter((e) => e.type !== "cancellation")
            .filter((e) => e.user !== "Administrator" && e.user_email !== "Administrator")
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const designationCache = new Map<string, string>();
        const rows = await Promise.all(
            sorted.map(async (entry) => {
                const email = entry.user_email || "";
                let designation = designationCache.get(email);
                if (designation === undefined) {
                    designation = await resolveDesignation(email);
                    designationCache.set(email, designation);
                }
                const nameCell = designation
                    ? `${esc(entry.user || entry.user_email)}<span class="designation">${esc(designation)}</span>`
                    : esc(entry.user || entry.user_email);
                const comment = entry.content || LABEL_OVERRIDES[entry.label] || entry.label;
                return `<tr>
                    <td>${nameCell}</td>
                    <td>${esc(comment)}</td>
                    <td style="white-space:nowrap;">${esc(fmtTimestamp(entry.timestamp))}</td>
                </tr>`;
            }),
        );

        return `
        <div class="section-title">Activity Log</div>
        <table class="activity-table">
            <thead>
                <tr>
                    <th>Approver</th>
                    <th>Comment</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody>${rows.join("")}</tbody>
        </table>`;
    } catch {
        return "";
    }
}
