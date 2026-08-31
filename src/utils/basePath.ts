// Detected at runtime rather than fixed to VITE_BASE_PATH so the same build works
// both accessed directly by IP:port (e.g. 172.16.134.106:8081/login) and through the
// pragati.iitg.ac.in/dev/ nginx front (which needs routes under /dev/, e.g. /dev/login)
// — whichever prefix the current URL actually has wins. Mirrors the basename logic in
// main.tsx's router config; keep both in sync.
export function getBasePath(): string {
    return window.location.pathname === "/dev" || window.location.pathname.startsWith("/dev/")
        ? "/dev"
        : import.meta.env.VITE_BASE_PATH || "";
}
