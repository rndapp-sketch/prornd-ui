/**
 * Utility for building correct file URLs from Frappe file_url values.
 *
 * Frappe stores file URLs with a leading slash, e.g.:
 *   /Project_Registration/2026031901MeiTy000636/proposal/abc123_file.pdf
 *
 * The correct browseable URL is:
 *   /files/Project_Registration/...
 *
 * Using `/files/${path}` when `path` already starts with `/` produces a
 * double slash (`/files//Project_Registration/...`), which is wrong.
 * This helper handles both cases correctly.
 */
export function getFileUrl(path: string | null | undefined): string {
    if (!path) return "";

    // Already a full URL (e.g. proxied MinIO direct link)
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    // MinIO path served via /rnd-files proxy — use as-is
    if (path.startsWith("/prod-rnd-files/")) {
        return path;
    }

    // Frappe stores paths starting with "/" -- avoid double slash
    if (path.startsWith("/")) {
        return `/files${path}`;
    }

    // Plain path without leading slash
    return `/files/${path}`;
}
