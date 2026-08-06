/**
 * Extracts a clean, human-readable message from a Frappe API error.
 * Handles nested/double-JSON-encoded `_server_messages` and strips HTML tags
 * (e.g. `<strong>...</strong>`) that Frappe sometimes embeds in messages.
 */
export function parseFrappeError(...sources: any[]): string {
    const messages: string[] = [];

    for (const source of sources) {
        const raw = source?._server_messages;
        if (!raw) continue;
        try {
            const parsedOuter =
                typeof raw === "string" ? JSON.parse(raw) : raw;
            (Array.isArray(parsedOuter) ? parsedOuter : [parsedOuter]).forEach(
                (m: any) => {
                    let text = m;
                    if (typeof m === "string") {
                        try {
                            text = JSON.parse(m).message || m;
                        } catch {
                            // m was already plain text
                        }
                    } else if (m && typeof m === "object") {
                        text = m.message || JSON.stringify(m);
                    }
                    messages.push(String(text).replace(/<\/?[^>]+(>|$)/g, "").trim());
                },
            );
        } catch {
            // ignore malformed _server_messages
        }
    }

    const fallback = sources.find((s) => s?.message)?.message;
    if (
        fallback &&
        !messages.some((m) => fallback.includes(m) || m.includes(fallback))
    ) {
        messages.push(fallback);
    }

    if (messages.length === 0) {
        messages.push("Unknown Error");
    }

    return messages.filter(Boolean).join("\n\n");
}
