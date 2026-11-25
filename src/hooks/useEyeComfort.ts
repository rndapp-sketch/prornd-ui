import { useSyncExternalStore } from "react";

/**
 * App-wide "Eye comfort" mode: a softer, warmer look for long sessions. It is a look-only switch kept in this
 * browser (localStorage) and applied as a class on <html>, so it covers every page, the header and the sidebar.
 */
const KEY = "prornd-eye-comfort";
const LEVEL_KEY = "prornd-eye-comfort-level";
export const DEFAULT_EYE_LEVEL = 70; // percent
const BORDER_KEY = "prornd-eye-comfort-border";
export const DEFAULT_EYE_BORDER = 20; // percent
const CLASS = "eye-comfort";
const listeners = new Set<() => void>();

const read = (): boolean => {
    try {
        return localStorage.getItem(KEY) === "on";
    } catch {
        return false;
    }
};

const readLevel = (): number => {
    try {
        const v = parseInt(localStorage.getItem(LEVEL_KEY) || "", 10);
        return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : DEFAULT_EYE_LEVEL;
    } catch {
        return DEFAULT_EYE_LEVEL;
    }
};

let current = read();
const readBorder = (): number => {
    try {
        const v = parseInt(localStorage.getItem(BORDER_KEY) || "", 10);
        return Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : DEFAULT_EYE_BORDER;
    } catch {
        return DEFAULT_EYE_BORDER;
    }
};
let level = readLevel();
let border = readBorder();

// 0% = the usual pale grey line, 100% = near-black. Linear mix between the two.
const borderColor = (pct: number) => {
    const from = [0xd4, 0xd4, 0xd8];
    const to = [0x18, 0x18, 0x1b];
    const c = from.map((f, i) => Math.round(f + (to[i] - f) * (pct / 100)));
    return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};
const apply = () => {
    document.documentElement.classList.toggle(CLASS, current);
    document.documentElement.style.setProperty("--eye-level", String(level / 100));
    document.documentElement.style.setProperty("--eye-border", borderColor(border));
};
if (typeof document !== "undefined") apply(); // applied as soon as the app loads, before any page renders

export const setEyeComfort = (on: boolean) => {
    current = on;
    try {
        localStorage.setItem(KEY, on ? "on" : "off");
    } catch {
        /* optional */
    }
    apply();
    listeners.forEach((l) => l());
};

export const setEyeLevel = (v: number) => {
    level = Math.min(100, Math.max(0, Math.round(v)));
    try {
        localStorage.setItem(LEVEL_KEY, String(level));
    } catch {
        /* optional */
    }
    apply();
    listeners.forEach((l) => l());
};

export const setEyeBorder = (v: number) => {
    border = Math.min(100, Math.max(0, Math.round(v)));
    try {
        localStorage.setItem(BORDER_KEY, String(border));
    } catch {
        /* optional */
    }
    apply();
    listeners.forEach((l) => l());
};

// Keep other open tabs in step
if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
        if (e.key === KEY || e.key === LEVEL_KEY || e.key === BORDER_KEY) {
            current = read();
            level = readLevel();
            border = readBorder();
            apply();
            listeners.forEach((l) => l());
        }
    });
}

export function useEyeComfort(): [boolean, (on: boolean) => void, number, (v: number) => void, number, (v: number) => void] {
    const on = useSyncExternalStore(
        (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        () => current,
        () => false,
    );
    const lvl = useSyncExternalStore(
        (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        () => level,
        () => DEFAULT_EYE_LEVEL,
    );
    const bd = useSyncExternalStore(
        (cb) => {
            listeners.add(cb);
            return () => listeners.delete(cb);
        },
        () => border,
        () => DEFAULT_EYE_BORDER,
    );
    return [on, setEyeComfort, lvl, setEyeLevel, bd, setEyeBorder];
}
