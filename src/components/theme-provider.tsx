import { createContext, useContext, useLayoutEffect, useState } from "react"

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

const applyThemeClass = (theme: Theme) => {
    const root = window.document.documentElement
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
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
            const storedTheme = localStorage.getItem(storageKey) as Theme | null
            return storedTheme === "dark" || storedTheme === "light" || storedTheme === "system"
                ? storedTheme
                : defaultTheme
        }
    )

    useLayoutEffect(() => {
        applyThemeClass(theme)

        if (theme !== "system") {
            return
        }

        const media = window.matchMedia("(prefers-color-scheme: dark)")
        const handleSystemThemeChange = () => applyThemeClass("system")
        media.addEventListener("change", handleSystemThemeChange)

        return () => {
            media.removeEventListener("change", handleSystemThemeChange)
        }
    }, [theme])

    const value = {
        theme,
        setTheme: (theme: Theme) => {
            localStorage.setItem(storageKey, theme)
            setTheme(theme)
        },
    }

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
