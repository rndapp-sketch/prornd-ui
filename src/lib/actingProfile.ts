/**
 * Role delegation / profile switching (docs/role_delegation_implementation_plan.md, Part B).
 *
 * The logged-in user never changes; only the server-side "acting" profile does. The active
 * profile is kept IN MEMORY, PER TAB (never localStorage) so a stale tab keeps its old value
 * and the server can detect it (ProfileMismatch). Every request to the Frappe backend then
 * carries `X-Acting-Delegation: <grant id>` while acting, added in ONE place: patched
 * window.fetch and XMLHttpRequest (frappe-react-sdk / axios uses XHR), so no call site changes.
 */
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import { getBasePath } from "@/utils/basePath";

const API = `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.api`;
export const ACTING_HEADER = "X-Acting-Delegation";
const CHANNEL = "pragati-acting-profile";

export interface ActingProfile {
  id: string; // "self" or a grant id
  label: string;
  delegator?: string;
  delegator_name?: string;
  roles?: string[];
  valid_till?: string; // "YYYY-MM-DD HH:mm:ss" server time
}

export interface ActingState {
  enabled: boolean;
  current: string; // "self" or grant id
  profiles: ActingProfile[];
}

export type ActingErrorType = "ProfileMismatch" | "DelegationEnded";

const EMPTY: ActingState = { enabled: false, current: "self", profiles: [] };
let state: ActingState = EMPTY;
const listeners = new Set<() => void>();

function setState(next: ActingState) {
  state = next;
  listeners.forEach((l) => l());
}
export const subscribeActing = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const getActingState = () => state;

/** Grant id while acting, otherwise null. */
export const getActingDelegation = (): string | null =>
  state.enabled && state.current && state.current !== "self" ? state.current : null;

const isLoggedIn = () => {
  const m = document.cookie.match(/(?:^|;\s*)user_id=([^;]*)/);
  const u = m ? decodeURIComponent(m[1]) : "";
  return !!u && u !== "Guest";
};

// ---------------------------------------------------------------------------------------------
// Errors (409 ProfileMismatch / DelegationEnded) - one message even if several requests fail
// ---------------------------------------------------------------------------------------------
let errorRaised = false;
export function raiseActingError(type: ActingErrorType) {
  if (errorRaised) return;
  errorRaised = true;
  window.dispatchEvent(new CustomEvent("acting-profile-error", { detail: type }));
}

function inspect409(status: number, body: string) {
  if (status !== 409) return;
  try {
    const t = JSON.parse(body)?.exc_type;
    if (t === "ProfileMismatch" || t === "DelegationEnded") raiseActingError(t);
  } catch { /* not JSON */ }
}

// ---------------------------------------------------------------------------------------------
// Header layer
// ---------------------------------------------------------------------------------------------
const isFrappeUrl = (url: string) => {
  try {
    const abs = new URL(url, window.location.href).href;
    return abs === FRAPPE_BASE_URL || abs.startsWith(`${FRAPPE_BASE_URL}/`);
  } catch { return false; }
};

let installed = false;
export function installActingHeader() {
  if (installed) return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (!isFrappeUrl(url)) return nativeFetch(input, init);
    const id = getActingDelegation();
    let req: RequestInfo | URL = input;
    let reqInit = init;
    if (id) {
      const headers = new Headers(input instanceof Request ? input.headers : undefined);
      new Headers(init?.headers).forEach((v, k) => headers.set(k, v));
      headers.set(ACTING_HEADER, id);
      if (input instanceof Request) {
        req = new Request(input, { headers });
        reqInit = init ? { ...init, headers } : undefined; // init.headers would replace ours wholesale
      } else {
        reqInit = { ...init, headers };
      }
    }
    const res = await nativeFetch(req, reqInit);
    if (res.status === 409) res.clone().text().then((t) => inspect409(409, t)).catch(() => {});
    return res;
  };

  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest & { _actingUrl?: string }, method: string, url: string | URL, ...rest: any[]) {
    this._actingUrl = String(url);
    return (open as any).call(this, method, url, ...rest);
  } as typeof open;
  XMLHttpRequest.prototype.send = function (this: XMLHttpRequest & { _actingUrl?: string }, body?: any) {
    if (this._actingUrl && isFrappeUrl(this._actingUrl)) {
      const id = getActingDelegation();
      if (id) this.setRequestHeader(ACTING_HEADER, id);
      this.addEventListener("loadend", () => {
        if (this.status === 409) {
          try { inspect409(409, this.responseType === "" || this.responseType === "text" ? this.responseText : JSON.stringify(this.response)); } catch { /* ignore */ }
        }
      });
    }
    return send.call(this, body);
  };
}

// ---------------------------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------------------------
function csrfHeaders(): Record<string, string> {
  const t = (window as any).csrf_token;
  return t ? { "X-Frappe-CSRF-Token": t } : {};
}

async function call<T = any>(name: string, opts: { method?: "GET" | "POST"; body?: object } = {}): Promise<T> {
  const method = opts.method ?? "GET";
  const res = await fetch(`${API}.${name}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...csrfHeaders() },
    body: method === "POST" ? JSON.stringify(opts.body ?? {}) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(readMessage(data) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data.message as T;
}

export function readMessage(data: any): string {
  try {
    if (data?._server_messages) {
      const msgs = JSON.parse(data._server_messages).map((m: string) => JSON.parse(m).message);
      if (msgs.length) return msgs.join(" ").replace(/<[^>]+>/g, "");
    }
  } catch { /* fall through */ }
  const exc: string | undefined = data?.exception;
  if (exc && exc.includes(":")) return exc.split(":").slice(1).join(":").trim();
  return typeof data?.message === "string" ? data.message : "";
}

const normalize = (m: any): ActingState => ({
  enabled: m?.enabled !== false,
  current: m?.current || "self",
  profiles: Array.isArray(m?.profiles) ? m.profiles : [],
});

/** Load the profile state. Throws on failures that must not be guessed around. */
export async function loadActingProfiles(): Promise<ActingState> {
  if (!isLoggedIn()) { setState(EMPTY); return EMPTY; }
  try {
    const next = normalize(await call("get_acting_profiles"));
    setState(next);
    return next;
  } catch (e: any) {
    // Not logged in after all, or backend without the feature deployed: feature stays hidden.
    const msg = `${e?.data?.exception ?? ""} ${e?.message ?? ""}`;
    if (e?.status === 401 || e?.status === 403 || /has no attribute|Failed to get method/i.test(msg)) {
      setState(EMPTY);
      return EMPTY;
    }
    throw e;
  }
}

/** Refetch without throwing (dropdown open, end-time timer). Keeps the old state on failure. */
export async function refreshActingProfiles(): Promise<void> {
  try { await loadActingProfiles(); } catch { /* keep previous */ }
}

function reloadToDashboard() {
  try { new BroadcastChannel(CHANNEL).postMessage("switched"); } catch { /* unsupported */ }
  window.location.assign(`${getBasePath()}/dashboard`);
}

/** Ask the app to switch account; the confirmation modal (ActingBanner) handles the rest. */
export const SWITCH_REQUEST_EVENT = "acting-switch-request";
export function requestSwitch(id: string) {
  window.dispatchEvent(new CustomEvent(SWITCH_REQUEST_EVENT, { detail: id }));
}

export async function switchProfile(id: string): Promise<void> {
  if (id === "self") return switchToOwnProfile();
  await call("switch_profile", { method: "POST", body: { delegation: id } });
  reloadToDashboard();
}

export async function switchToOwnProfile(): Promise<void> {
  await call("switch_to_own_profile", { method: "POST" });
  reloadToDashboard();
}

export const getRoleDelegations = () =>
  call<{ given: RoleGrant[]; received: RoleGrant[]; delegable_roles: string[] }>("get_role_delegations");
export const createRoleDelegation = (body: { delegate: string; roles: string[]; from_datetime: string; to_datetime: string; reason: string }) =>
  call<RoleGrant>("create_role_delegation", { method: "POST", body });
export const revokeRoleDelegation = (delegation: string) =>
  call<RoleGrant>("revoke_role_delegation", { method: "POST", body: { delegation } });

export interface RoleGrant {
  name: string;
  delegator: string;
  delegator_name?: string;
  delegate: string;
  delegate_name?: string;
  roles: string[];
  from_datetime: string;
  to_datetime: string;
  reason: string;
  status: string;
  state: "scheduled" | "active" | "expired" | "revoked";
}

/** Other tabs of this browser reload when one tab switches profile (server check still protects missed ones). */
export function listenForSwitches() {
  try {
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = () => window.location.reload();
  } catch { /* unsupported */ }
}

/** Called once before the app renders. Retries; throws if the profile still cannot be determined. */
export async function bootstrapActingProfile(): Promise<void> {
  installActingHeader();
  listenForSwitches();
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    try { await loadActingProfiles(); return; } catch (e) { lastErr = e; await new Promise((r) => setTimeout(r, 800)); }
  }
  throw lastErr;
}

/** Drop the in-memory profile (logout) so the next login starts clean. */
export const clearActingState = () => setState(EMPTY);
