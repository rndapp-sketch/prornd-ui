import { useEffect, useRef, useState } from "react";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import type { Models } from "appwrite";
import { appwriteAccount, appwriteConfig } from "@/lib/appwrite";
import { sha256Hex } from "@/lib/sha256";

type Status = "idle" | "connecting" | "ready" | "error";

interface AppwriteSessionState {
    status: Status;
    user: Models.User<Models.Preferences> | null;
    error: string | null;
}

interface AppwriteError extends Error {
    code?: number;
    type?: string;
}

const sessionPromises = new Map<string, Promise<Models.User<Models.Preferences>>>();

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function isConflict(error: unknown): boolean {
    const appwriteError = error as AppwriteError;
    return appwriteError?.code === 409 || /already exists|conflict/i.test(getErrorMessage(error));
}

function isUnauthorized(error: unknown): boolean {
    const appwriteError = error as AppwriteError;
    return appwriteError?.code === 401 || /unauthorized|missing scopes|invalid credentials/i.test(getErrorMessage(error));
}

function isRateLimited(error: unknown): boolean {
    const appwriteError = error as AppwriteError;
    return appwriteError?.code === 429 || /rate limit/i.test(getErrorMessage(error));
}

function getRateLimitError(): Error {
    return new Error(
        "Appwrite rejected the messaging login because too many attempts reached the server. Please refresh once after a short wait.",
    );
}

async function withTimeout<T>(label: string, promise: Promise<T>, ms = 8000): Promise<T> {
    return await Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(
                () =>
                    reject(
                        new Error(
                            `[appwrite] '${label}' timed out after ${ms}ms - endpoint unreachable?`,
                        ),
                    ),
                ms,
            ),
        ),
    ]);
}

/**
 * Derive a stable 36-char Appwrite userId from a Frappe email.
 * Appwrite userIds must match ^[a-zA-Z0-9._-]{1,36}$, but emails contain "@",
 * so we hash to keep it deterministic and within limits.
 */
async function deriveAppwriteUserId(email: string): Promise<string> {
    return (await sha256Hex(email.toLowerCase())).slice(0, 36);
}

/**
 * Deterministic password derived from Frappe email + project id.
 *
 * TODO(production): Replace with a server-side Frappe whitelisted method
 *   `rndopsapp.api.messaging.create_appwrite_token` that uses the Appwrite
 *   Server SDK to mint a one-shot Custom Token, then call
 *   `account.createSession(userId, secret)` on the client.
 *
 * This dev stop-gap relies on the fact that the Frappe session is already
 * authoritative — but anyone who learns a user's email could log into Appwrite
 * as them, so it MUST NOT ship to production as-is.
 */
async function deriveDevPassword(email: string): Promise<string> {
    const salt = `prornd-messaging-${appwriteConfig.projectId}`;
    return sha256Hex(`${salt}:${email.toLowerCase()}`);
}

export function useAppwriteSession(): AppwriteSessionState {
    const { currentUser } = useFrappeAuth();
    const { data: userDoc } = useFrappeGetDoc(
        "User",
        currentUser || "",
        currentUser ? undefined : null,
    );

    const [state, setState] = useState<AppwriteSessionState>({
        status: "idle",
        user: null,
        error: null,
    });

    const connectingRef = useRef(false);
    const attemptedEmailRef = useRef<string | null>(null);
    const stateRef = useRef(state);

    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        if (!appwriteConfig.endpoint || !appwriteConfig.projectId) {
            setState({
                status: "error",
                user: null,
                error:
                    "Messaging is not configured. Set VITE_APPWRITE_ENDPOINT and VITE_APPWRITE_PROJECT_ID, then rebuild the app.",
            });
            return;
        }

        if (!currentUser) {
            attemptedEmailRef.current = null;
            setState({ status: "idle", user: null, error: null });
            return;
        }
        const normalizedEmail = currentUser.toLowerCase();

        const currentState = stateRef.current;
        if (currentState.status === "ready" && currentState.user?.email?.toLowerCase() === normalizedEmail) {
            return;
        }

        if (currentState.status === "error" && attemptedEmailRef.current === normalizedEmail) {
            return;
        }

        if (connectingRef.current) return;
        connectingRef.current = true;
        attemptedEmailRef.current = normalizedEmail;
        let cancelled = false;
        const fullName = (userDoc as { full_name?: string } | undefined)?.full_name || currentUser;

        (async () => {
            try {
                setState((s) => ({ ...s, status: "connecting", error: null }));

                let sessionPromise = sessionPromises.get(normalizedEmail);
                if (!sessionPromise) {
                    sessionPromise = (async () => {
                        // 1. If a session already exists for this user, reuse it.
                        try {
                            const existing = await withTimeout("account.get", appwriteAccount.get());
                            if (existing.email?.toLowerCase() === normalizedEmail) {
                                return existing;
                            }
                            await appwriteAccount.deleteSession("current").catch(() => undefined);
                        } catch (e) {
                            if (isRateLimited(e)) throw getRateLimitError();
                        }

                        // 2. Try to log in. If the Appwrite user doesn't exist yet, create them.
                        const password = await deriveDevPassword(normalizedEmail);
                        try {
                            await withTimeout(
                                "createEmailPasswordSession",
                                appwriteAccount.createEmailPasswordSession(normalizedEmail, password),
                            );
                        } catch (loginError) {
                            if (isRateLimited(loginError)) throw getRateLimitError();
                            if (!isUnauthorized(loginError)) throw loginError;
                            const userId = await deriveAppwriteUserId(normalizedEmail);

                            try {
                                await withTimeout(
                                    "account.create",
                                    appwriteAccount.create(userId, normalizedEmail, password, fullName),
                                );
                            } catch (createError) {
                                if (isRateLimited(createError)) throw getRateLimitError();
                                if (isConflict(createError)) {
                                    throw new Error(
                                        "Appwrite user already exists, but the dev bridge password does not match. Delete this user in Appwrite Auth or switch to the planned server-side custom-token bridge.",
                                    );
                                }
                                if (isUnauthorized(createError)) {
                                    throw new Error(
                                        `Appwrite rejected client user creation. Enable Email/Password auth and registration for this project, then retry. Details: ${getErrorMessage(createError)}`,
                                    );
                                }
                                throw createError;
                            }

                            try {
                                await withTimeout(
                                    "createEmailPasswordSession",
                                    appwriteAccount.createEmailPasswordSession(normalizedEmail, password),
                                );
                            } catch (sessionAfterCreateError) {
                                if (isRateLimited(sessionAfterCreateError)) throw getRateLimitError();
                                throw sessionAfterCreateError;
                            }
                        }

                        try {
                            return await withTimeout("account.get", appwriteAccount.get());
                        } catch (confirmError) {
                            if (isRateLimited(confirmError)) throw getRateLimitError();
                            throw confirmError;
                        }
                    })();
                    sessionPromises.set(normalizedEmail, sessionPromise);
                }

                const me = await sessionPromise;
                if (!cancelled) setState({ status: "ready", user: me, error: null });
            } catch (err) {
                sessionPromises.delete(normalizedEmail);
                const message = err instanceof Error ? err.message : "Failed to connect to messaging";
                if (!cancelled) setState({ status: "error", user: null, error: message });
            } finally {
                if (!cancelled) {
                    connectingRef.current = false;
                }
            }
        })();

        return () => {
            cancelled = true;
            connectingRef.current = false;
        };
    }, [currentUser, userDoc]);

    return state;
}
