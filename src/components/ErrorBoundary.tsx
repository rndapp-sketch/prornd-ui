import React from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";

// A render error with no boundary unmounts the entire tree and leaves a blank white
// page. This renders with plain inline styles on purpose: it must work even when
// Tailwind/theme/providers are the thing that failed.
function Fallback({ error, onReset }: { error: unknown; onReset?: () => void }) {
    const message = isRouteErrorResponse(error)
        ? `${error.status} ${error.statusText}`
        : error instanceof Error
          ? error.message
          : String(error ?? "Unknown error");

    // A stale bundle after a deploy surfaces as a failed dynamic import / chunk load.
    const looksStale = /Loading chunk|dynamically imported module|Importing a module script failed/i.test(message);

    return (
        <div
            role="alert"
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: 24,
                fontFamily: "system-ui, sans-serif",
                textAlign: "center",
                background: "#FAFAF9",
                color: "#27272A",
            }}
        >
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Something went wrong</h1>
            <p style={{ maxWidth: 480, margin: 0, fontSize: 14, color: "#52525B" }}>
                {looksStale
                    ? "A new version of the app is available. Please reload the page."
                    : "The page hit an unexpected error. You can try again or reload."}
            </p>
            <pre
                style={{
                    maxWidth: 560,
                    whiteSpace: "pre-wrap",
                    fontSize: 12,
                    color: "#71717A",
                    margin: 0,
                }}
            >
                {message}
            </pre>
            <div style={{ display: "flex", gap: 8 }}>
                {onReset && !looksStale && (
                    <button
                        onClick={onReset}
                        style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #D4D4D8", background: "#fff", cursor: "pointer" }}
                    >
                        Try again
                    </button>
                )}
                <button
                    onClick={() => window.location.reload()}
                    style={{ padding: "8px 16px", borderRadius: 8, border: 0, background: "#4A6CF7", color: "#fff", cursor: "pointer" }}
                >
                    Reload
                </button>
            </div>
        </div>
    );
}

type Props = { children: React.ReactNode };
type State = { error: unknown; hasError: boolean };

export class ErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null, hasError: false };

    static getDerivedStateFromError(error: unknown): State {
        return { error, hasError: true };
    }

    componentDidCatch(error: unknown, info: React.ErrorInfo) {
        console.error("Unhandled render error:", error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return <Fallback error={this.state.error} onReset={() => this.setState({ error: null, hasError: false })} />;
        }
        return this.props.children;
    }
}

/** Route-level errorElement: used for errors thrown while rendering/loading a route. */
export function RouteErrorFallback() {
    const error = useRouteError();
    console.error("Route error:", error);
    return <Fallback error={error} />;
}
