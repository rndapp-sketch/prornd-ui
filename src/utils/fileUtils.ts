/**
 * Utility for building correct file URLs from Frappe file_url values.
 *
 * Files uploaded through the custom MinIO-backed storage are stored by
 * Frappe with a path like:
 *   /Project_Registration/2026031901MeiTy000636/indent_general_form/.../file.pdf
 *
 * The browser NEVER talks to MinIO. Every MinIO object is read through the
 * authenticated Frappe route
 *   /api/method/rndopsapp.rndopsapp.file_api.get_file?file_url=<stored value>
 * which requires a logged-in session and checks read permission on the document the
 * object belongs to. <img src>, <a href> and window.open all send the session cookie,
 * so no auth header is needed.
 *
 * Standard Frappe-managed files use `/files/...` or `/private/files/...`
 * paths and are served from the Frappe backend directly.
 */

const MINIO_HOST = import.meta.env.VITE_MINIO_HOST || "172.16.134.179";
const MINIO_PORT = import.meta.env.VITE_MINIO_PORT || "9000";
const MINIO_ALT_PORT = import.meta.env.VITE_MINIO_ALT_PORT || "8081";
const MINIO_BUCKET = "prod-rnd-files";

// Object-key prefixes that indicate a MinIO-stored file. The first path segment of an object
// key is the owning {Doctype} (or a lowercase legacy folder); the route's own allow-list is
// the real gate, this list only decides which stored values are routed through it.
const MINIO_PATH_PREFIXES = [
    "Project_Registration",
    "Proforma_Invoice",
    "Employee_ID_Card",
    "indent_general_form",
    "indent_cum_sanction_sheet",
    "proprietary_purchase",
    "standerdized_purchase",
    "direct_purchase",
];

const FILE_API_METHOD = "rndopsapp.rndopsapp.file_api.get_file";

/**
 * The MinIO object key (no leading slash) a stored value refers to, or null when the value
 * is not a MinIO object (ordinary Frappe file, external URL, empty).
 *
 * Accepts every form the backend stores or that older records still hold:
 *   /Project_Registration/…                       object path
 *   Project_Registration/…                        object path, no leading slash
 *   /prod-rnd-files/Project_Registration/…        bucket-prefixed path
 *   http://<minio>:9000/prod-rnd-files/…          full MinIO URL
 *   http://<minio>:8081/[prod-rnd-files/]…        full MinIO URL via the alternate port
 */
export function getMinioKey(path: string | null | undefined): string | null {
    if (!path || typeof path !== "string") return null;
    const trimmed = path.trim();
    if (!trimmed) return null;

    let value = trimmed;
    let isMinioUrl = false;

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        let url: URL;
        try {
            url = new URL(trimmed);
        } catch {
            return null;
        }
        // A URL whose path starts with the bucket is a MinIO object whatever host it carries
        // (records keep the host they were written with, and it differs between environments).
        // Without the bucket, only the configured MinIO host counts; anything else is external.
        const hasBucketPath = url.pathname.startsWith(`/${MINIO_BUCKET}/`);
        const isConfiguredHost =
            url.hostname === MINIO_HOST && (url.port === MINIO_PORT || url.port === MINIO_ALT_PORT);
        if (!hasBucketPath && !isConfiguredHost) return null;
        // The URL's own path is the object key. Only the key is used — never the host.
        try {
            value = decodeURIComponent(url.pathname);
        } catch {
            value = url.pathname;
        }
        isMinioUrl = true;
    }

    let key = value.replace(/^\/+/, "");
    const hasBucket = key.startsWith(`${MINIO_BUCKET}/`);
    if (hasBucket) key = key.slice(MINIO_BUCKET.length + 1);

    // A full MinIO URL or a bucket-prefixed path is MinIO whatever its first segment; a bare
    // path must start with a known prefix, so ordinary Frappe paths ("/files/…") are never
    // mistaken for objects.
    if (isMinioUrl || hasBucket) return key || null;
    return MINIO_PATH_PREFIXES.some((prefix) => key.startsWith(`${prefix}/`)) ? key : null;
}

/** The authenticated Frappe route that serves a MinIO object key. */
export function getMinioFileUrl(key: string): string {
    // Encoded exactly once — the route does not decode a second time.
    return `${window.location.origin}/api/method/${FILE_API_METHOD}?file_url=${encodeURIComponent(`/${key.replace(/^\/+/, "")}`)}`;
}

// Paths Frappe itself serves; never treated as a MinIO object key.
const FRAPPE_PATH_PREFIXES = ["/files/", "/private/files/", "/assets/", "/app/", "/api/"];

/**
 * True for a bare object key such as `Employee_ID_Card/EIC-0001/photo.png` or the same with a
 * leading slash: at least {folder}/{document}/{file}, and not a path Frappe serves.
 */
const looksLikeObjectKey = (path: string): boolean => {
    if (/^(https?:|data:|blob:)/i.test(path)) return false;
    if (FRAPPE_PATH_PREFIXES.some((p) => path.startsWith(p))) return false;
    return path.replace(/^\/+/, "").split("/").filter(Boolean).length >= 3;
};

export interface GetFileUrlOptions {
    /**
     * For fields that can only ever hold an uploaded file (ID card photo / signature): a bare
     * {folder}/{document}/{file} path that isn't a Frappe path is a MinIO object, whatever its
     * folder is called — so it does not depend on the prefix list above.
     */
    assumeMinio?: boolean;
}

export function getFileUrl(path: string | null | undefined, options?: GetFileUrlOptions): string {
    if (!path || typeof path !== "string") return "";

    // In-memory previews (an image just picked in a form) are not server files.
    if (path.startsWith("data:") || path.startsWith("blob:")) return path;

    // MinIO object (path, bucket path or full MinIO URL) — read through the Frappe route.
    const minioKey = getMinioKey(path);
    if (minioKey) return getMinioFileUrl(minioKey);
    if (options?.assumeMinio && looksLikeObjectKey(path.trim())) {
        return getMinioFileUrl(path.trim());
    }

    // Already a full URL (other origins) — return as-is
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    // Standard Frappe file paths — made fully absolute (not left relative) because
    // print previews render inside a P11PrintModal iframe loaded from a blob: URL,
    // where a relative path like "/private/files/..." doesn't reliably resolve
    // against the real page origin the way it does on a normal page.
    if (path.startsWith("/files/") || path.startsWith("/private/files/")) {
        return `${window.location.origin}${path}`;
    }

    // Other path starting with "/" — avoid double slash
    if (path.startsWith("/")) {
        return `${window.location.origin}/files${path}`;
    }

    // Plain path without leading slash
    return `${window.location.origin}/files/${path}`;
}

/** An uploaded image (ID card photo / signature) — see GetFileUrlOptions.assumeMinio. */
export const getUploadedImageUrl = (path: string | null | undefined): string =>
    getFileUrl(path, { assumeMinio: true });
