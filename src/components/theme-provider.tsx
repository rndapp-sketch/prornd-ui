import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react"
import { safeStorage } from "@/lib/safeStorage"

type Theme = "dark" | "light" | "system"

type ThemeProviderProps = {
    children: React.ReactNode
    defaultTheme?: Theme
    storageKey?: string
}

type ThemeProviderState = {
    theme: Theme
    setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

const isTheme = (value: unknown): value is Theme =>
    value === "dark" || value === "light" || value === "system"

const applyThemeClass = (theme: Theme) => {
    const root = window.document.documentElement
    const systemTheme = window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
    const activeTheme = theme === "system" ? systemTheme : theme

    root.classList.remove("light", "dark")
    root.classList.add(activeTheme)
    root.style.colorScheme = activeTheme
}

export function ThemeProvider({
    children,
    defaultTheme = "system",
    storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(
        () => {
            const storedTheme = safeStorage.getItem(storageKey)
            return isTheme(storedTheme) ? storedTheme : defaultTheme
        }
    )

    useLayoutEffect(() => {
        applyThemeClass(theme)

        if (theme !== "system") {
            return
        }

        const media = window.matchMedia?.("(prefers-color-scheme: dark)")
        if (!media) return
        const handleSystemThemeChange = () => applyThemeClass("system")
        media.addEventListener("change", handleSystemThemeChange)

        return () => {
            media.removeEventListener("change", handleSystemThemeChange)
        }
    }, [theme])

    // Keep other tabs in sync, so one tab never holds a stale class/state.
    useLayoutEffect(() => {
        const handleStorage = (event: StorageEvent) => {
            if (event.key === storageKey && isTheme(event.newValue)) {
                setTheme(event.newValue)
            }
        }
        window.addEventListener("storage", handleStorage)
        return () => window.removeEventListener("storage", handleStorage)
    }, [storageKey])

    const updateTheme = useCallback(
        (next: Theme) => {
            safeStorage.setItem(storageKey, next)
            // Apply synchronously too, so the class is correct even before React re-renders.
            applyThemeClass(next)
            setTheme(next)
        },
        [storageKey]
    )

    const value = useMemo(() => ({ theme, setTheme: updateTheme }), [theme, updateTheme])

    return (
        <ThemeProviderContext.Provider value={value}>
            {children}
        </ThemeProviderContext.Provider>
    )
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext)

    if (context === undefined)
        throw new Error("useTheme must be used within a ThemeProvider")

    return context
}
