/**
 * Utility for building correct file URLs from Frappe file_url values.
 *
 * Files uploaded through the custom MinIO-backed storage are stored by
 * Frappe with a path like:
 *   /Project_Registration/2026031901MeiTy000636/indent_general_form/.../file.pdf
 *
 * These must be served from MinIO directly:
 *   http://172.16.135.118:9000/prod-rnd-files/Project_Registration/...
 *
 * Standard Frappe-managed files use `/files/...` or `/private/files/...`
 * paths and are served from the Frappe backend.
 */

const MINIO_HOST = import.meta.env.VITE_MINIO_HOST || "172.16.135.118";
const MINIO_PORT = import.meta.env.VITE_MINIO_PORT || "9000";
const MINIO_ALT_PORT = import.meta.env.VITE_MINIO_ALT_PORT || "8081";
const MINIO_BASE = `http://${MINIO_HOST}:${MINIO_PORT}/prod-rnd-files`;
const MINIO_HOST_8081 = `http://${MINIO_HOST}:${MINIO_ALT_PORT}/`;
const MINIO_BUCKET = "prod-rnd-files";

// Path prefixes that indicate a MinIO-stored file
const MINIO_PATH_PREFIXES = [
    "/Project_Registration/",
    "/indent_general_form/",
    "/indent_cum_sanction_sheet/",
    "/proprietary_purchase/",
];

export function getFileUrl(path: string | null | undefined): string {
    if (!path) return "";

    // Port-8081 URL that already contains the bucket — serve as-is
    if (path.startsWith(`${MINIO_HOST_8081}${MINIO_BUCKET}/`)) {
        return path;
    }

    // Port-8081 URL missing the bucket prefix — insert it
    if (path.startsWith(MINIO_HOST_8081)) {
        const objectPath = path.slice(MINIO_HOST_8081.length);
        return `${MINIO_HOST_8081}${MINIO_BUCKET}/${objectPath}`;
    }

    // Already a full URL (other origins) — return as-is
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    // Already a MinIO proxy path — prepend the MinIO base
    if (path.startsWith("/prod-rnd-files/")) {
        return `http://${MINIO_HOST}:${MINIO_PORT}${path}`;
    }

    // MinIO-stored file referenced by its object path (no bucket prefix)
    if (MINIO_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
        return `${MINIO_BASE}${path}`;
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
