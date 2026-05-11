import { useEffect, useRef, useState } from "react";
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk";
import type { Models } from "appwrite";
import { appwriteAccount, appwriteConfig } from "@/lib/appwrite";

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
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(email.toLowerCase()));
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 36);
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
    const buf = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(`${salt}:${email.toLowerCase()}`),
    );
    return Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
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

    useEffect(() => {
        if (!currentUser) {
            setState({ status: "idle", user: null, error: null });
            return;
        }
        if (connectingRef.current) return;
        if (state.status === "ready" && state.user?.email?.toLowerCase() === currentUser.toLowerCase()) {
            return;
        }

        connectingRef.current = true;
        let cancelled = false;
        const fullName = (userDoc as { full_name?: string } | undefined)?.full_name || currentUser;
        const normalizedEmail = currentUser.toLowerCase();

        (async () => {
            try {
                setState((s) => ({ ...s, status: "connecting", error: null }));
                console.log("[appwrite] starting session bridge for", normalizedEmail);

                let sessionPromise = sessionPromises.get(normalizedEmail);
                if (!sessionPromise) {
                    sessionPromise = (async () => {
                        // 1. If a session already exists for this user, reuse it.
                        try {
                            console.log("[appwrite] step 1: check existing session");
                            const existing = await withTimeout("account.get", appwriteAccount.get());
                            if (existing.email?.toLowerCase() === normalizedEmail) {
                                console.log("[appwrite] reusing existing session", existing.$id);
                                return existing;
                            }
                            console.log("[appwrite] stale session for different user, signing out");
                            await appwriteAccount.deleteSession("current").catch(() => undefined);
                        } catch (e) {
                            console.log("[appwrite] no existing session:", getErrorMessage(e));
                        }

                        // 2. Try to log in. If the Appwrite user doesn't exist yet, create them.
                        const password = await deriveDevPassword(normalizedEmail);
                        try {
                            console.log("[appwrite] step 2: createEmailPasswordSession");
                            await withTimeout(
                                "createEmailPasswordSession",
                                appwriteAccount.createEmailPasswordSession(normalizedEmail, password),
                            );
                        } catch (loginError) {
                            console.log(
                                "[appwrite] login failed, will try to create user:",
                                getErrorMessage(loginError),
                            );
                            const userId = await deriveAppwriteUserId(normalizedEmail);
                            console.log("[appwrite] step 3: create user", userId);

                            try {
                                await withTimeout(
                                    "account.create",
                                    appwriteAccount.create(userId, normalizedEmail, password, fullName),
                                );
                            } catch (createError) {
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

                            console.log("[appwrite] step 4: createEmailPasswordSession after create");
                            await withTimeout(
                                "createEmailPasswordSession",
                                appwriteAccount.createEmailPasswordSession(normalizedEmail, password),
                            );
                        }

                        console.log("[appwrite] step 5: account.get to confirm session");
                        return await withTimeout("account.get", appwriteAccount.get());
                    })();
                    sessionPromises.set(normalizedEmail, sessionPromise);
                }

                const me = await sessionPromise;
                console.log("[appwrite] session ready", me.$id);
                if (!cancelled) setState({ status: "ready", user: me, error: null });
            } catch (err) {
                sessionPromises.delete(normalizedEmail);
                const message = err instanceof Error ? err.message : "Failed to connect to messaging";
                console.error("[appwrite] session error:", err);
                if (!cancelled) setState({ status: "error", user: null, error: message });
            } finally {
                connectingRef.current = false;
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentUser, userDoc, state.status, state.user?.email]);

    return state;
}
