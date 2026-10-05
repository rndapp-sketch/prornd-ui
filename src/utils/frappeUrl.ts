// Single source of truth for where the Frappe backend lives. Every Frappe
// request (/api/..., /files/..., /private/files/..., /assets/..., /login)
// must go through this prefix — never the site root, which belongs to this SPA.
//
// VITE_FRAPPE_BASE_URL may be absolute (https://pragati.iitg.ac.in/bk-api) or
// root-relative (/bk-api); it is normalized to an absolute URL with no trailing
// slash so it also works inside blob: iframes and print windows.
const RAW_BASE = (import.meta.env.VITE_FRAPPE_BASE_URL as string | undefined) || "/bk-api";

function resolveBase(raw: string): string {
    const trimmed = raw.replace(/\/+$/, "");
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
}

export const FRAPPE_BASE_URL = resolveBase(RAW_BASE);

/** Path-only form of the prefix (e.g. "/bk-api"), for matching/stripping. */
export const FRAPPE_BASE_PATH = (() => {
    try {
        return new URL(FRAPPE_BASE_URL).pathname.replace(/\/+$/, "");
    } catch {
        return "/bk-api";
    }
})();

/** Frappe Login page. */
export const FRAPPE_LOGIN_URL = `${FRAPPE_BASE_URL}/login`;

/**
 * Turn a root-relative Frappe path ("/files/x.pdf", "/api/method/...") into a
 * full URL under the Frappe base. Absolute URLs and already-prefixed paths are
 * returned unchanged.
 */
export function frappeUrl(path: string): string {
    if (!path) return path;
    if (/^(https?:|blob:|data:)/i.test(path)) return path;
    if (FRAPPE_BASE_PATH && (path === FRAPPE_BASE_PATH || path.startsWith(`${FRAPPE_BASE_PATH}/`))) {
        return `${window.location.origin}${path}`;
    }
    return `${FRAPPE_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export const FRAPPE_BASE_PLACEHOLDER = "__FRAPPE_BASE_URL__";

/**
 * Print templates are static `.html?raw` text and can't read import.meta.env,
 * so they reference Frappe assets as `__FRAPPE_BASE_URL__/files/...`; resolve
 * that placeholder here.
 */
export function withFrappeBase(html: string): string {
    return html.split(FRAPPE_BASE_PLACEHOLDER).join(FRAPPE_BASE_URL);
}
