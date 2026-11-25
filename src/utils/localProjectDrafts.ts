/**
 * Local (this browser only) copies of unfinished Project Registration forms, kept in IndexedDB.
 *
 * Nothing here talks to the server. A record exists only until the registration is saved or submitted
 * to the server, the user discards it, or it is 30 days old. One record per new registration (keyed by
 * the temporary id in /project-registration/new/<tempId>) and per signed-in user, so a shared computer
 * never shows one person's work to another.
 */

const DB_NAME = "ProRndLocalDrafts";
const DB_VERSION = 1;
const STORE = "projectRegistration";
const CHANGE_EVENT = "local-project-drafts-changed";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface LocalProjectDraft {
    id: string;
    user: string;
    title: string;
    projectType?: string;
    /** Active tab when last saved (0 = Project Details … 3 = Clearance) */
    activeTab: number;
    budgetYears: number[];
    formData: Record<string, any>;
    createdAt: number;
    savedAt: number;
}

export const isLocalDraftSupported = () => typeof indexedDB !== "undefined" && indexedDB !== null;

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!isLocalDraftSupported()) {
            reject(new Error("IndexedDB is not available"));
            return;
        }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE)) {
                const store = db.createObjectStore(STORE, { keyPath: "id" });
                store.createIndex("user", "user", { unique: false });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error("IndexedDB is blocked"));
    });
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
    return openDb().then(
        (db) =>
            new Promise<T | undefined>((resolve, reject) => {
                const tx = db.transaction(STORE, mode);
                const req = work(tx.objectStore(STORE));
                tx.oncomplete = () => {
                    db.close();
                    resolve(req ? (req.result as T) : undefined);
                };
                tx.onerror = () => {
                    db.close();
                    reject(tx.error);
                };
                tx.onabort = () => {
                    db.close();
                    reject(tx.error ?? new Error("Transaction aborted"));
                };
            }),
    );
}

const notify = () => {
    try {
        window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
        /* non-browser environment */
    }
};

/** Subscribe to any change in the saved drafts (also fires for changes made in this same tab). */
export function onLocalDraftsChanged(cb: () => void): () => void {
    window.addEventListener(CHANGE_EVENT, cb);
    return () => window.removeEventListener(CHANGE_EVENT, cb);
}

/**
 * A copy that IndexedDB can store: plain data and File/Blob objects are kept, anything it can't clone
 * (functions, DOM nodes, symbols) is dropped instead of failing the whole save.
 */
function cloneForStorage<T>(value: T, seen = new WeakSet<object>()): T {
    if (value === null || typeof value !== "object") {
        return (typeof value === "function" || typeof value === "symbol" ? undefined : value) as T;
    }
    if (value instanceof File || value instanceof Blob || value instanceof Date) return value;
    if (seen.has(value as object)) return undefined as T;
    seen.add(value as object);
    if (Array.isArray(value)) return value.map((v) => cloneForStorage(v, seen)) as unknown as T;
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
        const c = cloneForStorage(v, seen);
        if (c !== undefined) out[k] = c;
    });
    return out as T;
}

/** Has the user actually typed or chosen something (as opposed to the auto-filled PI details)? */
export function hasMeaningfulInput(fd: Record<string, any> | undefined | null): boolean {
    if (!fd) return false;
    const text = (v: unknown) => typeof v === "string" && v.trim() !== "";
    return !!(
        text(fd.project_title) ||
        text(fd.project_objective) ||
        text(fd.project_deliverables) ||
        text(fd.executive_summary) ||
        fd.funding_agen ||
        fd.project_duration_months ||
        fd.project_duration_days ||
        fd.upload_proj_prop ||
        (fd.upload_supporting_docs || []).length > 0 ||
        (fd.proposed_budget_breakup || []).some((r: any) => r?.head || (r?.years || []).some((y: unknown) => Number(y) > 0))
    );
}

/** Save (or update) a draft. Resolves false instead of throwing, so a storage problem never breaks the form. */
export async function saveLocalDraft(
    input: Omit<LocalProjectDraft, "createdAt" | "savedAt" | "title" | "projectType"> & { createdAt?: number },
): Promise<boolean> {
    try {
        const existing = await getLocalDraft(input.id, input.user);
        const now = Date.now();
        const record: LocalProjectDraft = {
            ...input,
            formData: cloneForStorage(input.formData),
            title: (input.formData?.project_title || "").toString().trim(),
            projectType: input.formData?.project_type || undefined,
            createdAt: existing?.createdAt ?? input.createdAt ?? now,
            savedAt: now,
        };
        await run("readwrite", (s) => s.put(record));
        notify();
        return true;
    } catch {
        return false;
    }
}

export async function getLocalDraft(id: string, user: string): Promise<LocalProjectDraft | undefined> {
    try {
        const rec = (await run<LocalProjectDraft | undefined>("readonly", (s) => s.get(id))) as LocalProjectDraft | undefined;
        return rec && rec.user === user ? rec : undefined;
    } catch {
        return undefined;
    }
}

export async function deleteLocalDraft(id: string): Promise<void> {
    try {
        await run("readwrite", (s) => s.delete(id));
        notify();
    } catch {
        /* nothing to clean up */
    }
}

/** This user's unfinished registrations, newest first. Records older than 30 days are removed. */
export async function listLocalDrafts(user: string): Promise<LocalProjectDraft[]> {
    try {
        const all = ((await run<LocalProjectDraft[]>("readonly", (s) => s.index("user").getAll(user))) ?? []) as LocalProjectDraft[];
        const cutoff = Date.now() - MAX_AGE_MS;
        const stale = all.filter((d) => d.savedAt < cutoff);
        if (stale.length) await Promise.all(stale.map((d) => deleteLocalDraft(d.id)));
        return all.filter((d) => d.savedAt >= cutoff).sort((a, b) => b.savedAt - a.savedAt);
    } catch {
        return [];
    }
}

/** Ask the browser not to evict our data under storage pressure (best effort; ignored if unsupported). */
export function requestPersistentStorage(): void {
    try {
        void navigator.storage?.persist?.();
    } catch {
        /* optional */
    }
}

export const TAB_NAMES = ["Project Details", "PI & Collaborators", "Budget", "Clearance"];
