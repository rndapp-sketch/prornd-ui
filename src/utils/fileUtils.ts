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
const MINIO_HOST_8081 = "http://172.16.135.118:8081/";
const MINIO_BUCKET = "prod-rnd-files";

// Path prefixes that indicate a MinIO-stored file
const MINIO_PATH_PREFIXES = [
    "/Project_Registration/",
    "/indent_general_form/",
    "/indent_cum_sanction_sheet/",
    "/standerdized_purchase/",
    "/direct_purchase/",
    "/proprietary_purchase/"
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
        return `http://172.16.135.118:9000${path}`;
    }

    // Handle paths that got the /files/ prefix from Frappe but actually belong in MinIO
    if (path.startsWith("/files/standerdized_purchase/") || 
        path.startsWith("/files/direct_purchase/") || 
        path.startsWith("/files/indent_cum_sanction_sheet/")) {
        return `/prod-rnd-files/${path.replace(/^\/files\//, "")}`;
    }

    // MinIO-stored file referenced by its object path (no bucket prefix)
    if (MINIO_PATH_PREFIXES.some((prefix) => path.startsWith(prefix))) {
        return `${MINIO_BASE}${path}`;
    }

    // Standard Frappe file paths are already complete — serve as-is
    if (path.startsWith("/files/") || path.startsWith("/private/files/")) {
        return path;
    }

    // Other path starting with "/" — avoid double slash
    if (path.startsWith("/")) {
        return `/files${path}`;
    }

    // Plain path without leading slash
    return `/files/${path}`;
}
