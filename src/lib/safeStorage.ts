// localStorage can throw (blocked cookies/site data, private mode, quota, sandboxed
// iframes). An uncaught throw during render or in a provider's initial state unmounts
// the whole React tree, leaving a blank page — so every access goes through here.
export const safeStorage = {
    getItem(key: string): string | null {
        try {
            return window.localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    setItem(key: string, value: string): void {
        try {
            window.localStorage.setItem(key, value);
        } catch {
            // best-effort persistence
        }
    },
    removeItem(key: string): void {
        try {
            window.localStorage.removeItem(key);
        } catch {
            // best-effort persistence
        }
    },
};
