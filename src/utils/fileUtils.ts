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

const MINIO_BASE = "http://172.16.135.118:9000/prod-rnd-files";

// Path prefixes that indicate a MinIO-stored file
const MINIO_PATH_PREFIXES = [
    "/Project_Registration/",
    "/indent_general_form/",
];

export function getFileUrl(path: string | null | undefined): string {
    if (!path) return "";

    // Already a full URL — return as-is
    if (path.startsWith("http://") || path.startsWith("https://")) {
        return path;
    }

    // Already a MinIO proxy path — prepend the MinIO base
    if (path.startsWith("/prod-rnd-files/")) {
        return `http://172.16.135.118:9000${path}`;
    }

    // MinIO-stored file referenced by its object path (no bucket prefix)
    if (MINIO_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
        return `${MINIO_BASE}${path}`;
    }

    // Standard Frappe file path starting with "/" — avoid double slash
    if (path.startsWith("/")) {
        return `/files${path}`;
    }

    // Plain path without leading slash
    return `/files/${path}`;
}
