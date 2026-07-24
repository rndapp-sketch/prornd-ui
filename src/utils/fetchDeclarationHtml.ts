/**
 * Fetches the "Declarations" content the <DeclarationFields> widget shows
 * on-screen (all fieldtype="HTML" DocFields on a doctype, keyed by fieldname)
 * as a plain async function, so print-PDF generators (which build a plain
 * HTML string, outside React) can include the same content instead of
 * silently omitting it.
 *
 * Goes through the whitelisted rndopsapp.rndopsapp.api.get_declaration_html
 * method rather than calling frappe.client.get_list("DocField", ...) directly —
 * "DocField" has no DocPerm rows of its own, so a direct call 403s for any
 * role other than System Manager (e.g. Dean, RnD), silently leaving the
 * Declaration section blank in the print for everyone else.
 */
export async function fetchDeclarationFields(doctype: string): Promise<Record<string, string>> {
    try {
        const params = new URLSearchParams({ doctype });
        const res = await fetch(
            `/api/method/rndopsapp.rndopsapp.api.get_declaration_html?${params.toString()}`,
            { credentials: "include" },
        );
        if (!res.ok) return {};
        const json = await res.json();
        return json?.message?.fields || {};
    } catch {
        return {};
    }
}

/**
 * Convenience wrapper: joins every HTML-fieldtype field's content on
 * `doctype`, excluding any fieldnames in `excludeFieldnames` (e.g. a
 * doctype-specific field that belongs in a different print section, not
 * under "Declaration" — see fields param usage in the Travel print).
 */
export async function fetchDeclarationHtml(
    doctype: string,
    excludeFieldnames: string[] = [],
): Promise<string> {
    const fields = await fetchDeclarationFields(doctype);
    return Object.entries(fields)
        .filter(([fieldname]) => !excludeFieldnames.includes(fieldname))
        .map(([, html]) => html)
        .join("");
}
