import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth } from "frappe-react-sdk";
import { CheckCircle2, CloudOff, HardDrive, History, Loader2, RotateCcw, Trash2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    TAB_NAMES,
    deleteLocalDraft,
    listLocalDrafts,
    onLocalDraftsChanged,
    type LocalProjectDraft,
} from "@/utils/localProjectDrafts";
import type { LocalSaveStatus } from "@/hooks/useLocalProjectDraft";
import "@/pages/dashboards/projectStaffDashboard.css";

const when = (ms: number) =>
    new Date(ms).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
const ago = (ms: number) => {
    const m = Math.floor((Date.now() - ms) / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h ago`;
    const d = Math.floor(h / 24);
    return d === 1 ? "yesterday" : `${d} days ago`;
};

// ── 1. Shown when the user comes back to a registration that has a saved copy (refresh / crash) ──────────────
export function LocalDraftRestoreDialog({
    draft,
    onRestore,
    onDiscard,
}: {
    draft: LocalProjectDraft | null;
    onRestore: () => void;
    onDiscard: () => void;
}) {
    if (!draft) return null;
    return createPortal(
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="restore-title">
            <div className="psd-root w-full max-w-md overflow-hidden rounded-2xl border border-[var(--psd-border)] bg-[var(--psd-surface)] shadow-2xl" style={{ background: "var(--psd-surface)" }}>
                <div className="flex items-center gap-3 m-2 rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2.5">
                    <span className="grid size-9 place-items-center rounded-xl bg-[var(--psd-accent)]/15 text-[var(--psd-accent)]">
                        <History className="size-5" />
                    </span>
                    <div>
                        <h3 id="restore-title" className="text-[14px] font-bold text-[var(--psd-heading)]">Continue your unfinished registration?</h3>
                        <p className="text-[11.5px] text-[var(--psd-body)]">Found on this computer, saved {ago(draft.savedAt)}</p>
                    </div>
                </div>
                <div className="space-y-3 px-5 py-4 text-[13px] text-[var(--psd-body)]">
                    <div className="rounded-xl border border-[var(--psd-border)] bg-[var(--psd-bg)] px-3 py-2.5">
                        <p className="font-bold text-[var(--psd-heading)]">{draft.title || "Untitled project"}</p>
                        <p className="mt-0.5 text-[12px]">
                            {draft.projectType ? `${draft.projectType} · ` : ""}last on “{TAB_NAMES[draft.activeTab] ?? "Project Details"}” · {when(draft.savedAt)}
                        </p>
                    </div>
                    <p className="leading-relaxed">Restoring brings back everything you had typed, including uploaded files, so you can carry on where you stopped.</p>
                    <p className="flex gap-2 rounded-lg bg-[var(--psd-review-bg)] px-3 py-2 text-[12px] leading-snug text-[#8A4B08] dark:text-amber-200">
                        <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                        <span>“Start fresh” deletes this saved copy for good.</span>
                    </p>
                </div>
                <div className="flex justify-end gap-2 border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-5 py-3">
                    <button
                        type="button"
                        onClick={onDiscard}
                        className="psd-focus rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-3.5 py-2 text-[12.5px] font-semibold text-[var(--psd-heading)] transition-colors hover:border-[var(--psd-returned)] hover:text-[var(--psd-returned)]"
                    >
                        Start fresh
                    </button>
                    <button
                        type="button"
                        onClick={onRestore}
                        className="psd-focus inline-flex items-center gap-1.5 rounded-lg bg-[var(--psd-primary)] px-3.5 py-2 text-[12.5px] font-bold text-white shadow-sm transition-all hover:bg-[var(--psd-primary-hover)] active:scale-[0.98]"
                    >
                        <RotateCcw className="size-3.5" /> Restore my work
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}

// ── 2. The notice inside the form: what is happening and what the limits are ─────────────────────────────
export function LocalDraftNotice({
    supported,
    status,
    lastSavedAt,
    hasInput,
}: {
    supported: boolean;
    status: LocalSaveStatus;
    lastSavedAt: number | null;
    hasInput: boolean;
}) {
    const broken = !supported || status === "error";
    return (
        <div
            role="status"
            className={cn(
                "mb-3 flex items-start gap-2.5 rounded-xl border px-3 py-2 text-[12px] leading-snug",
                broken
                    ? "border-[var(--psd-returned)]/35 bg-[var(--psd-returned-bg)] text-[#8F1F2D] dark:text-rose-200"
                    : "border-[var(--psd-info)]/30 bg-[linear-gradient(135deg,var(--psd-info-bg),var(--psd-surface))] text-[var(--psd-body)]",
            )}
        >
            <span className={cn("mt-0.5 shrink-0", broken ? "text-[var(--psd-returned)]" : "text-[var(--psd-info)]")}>
                {broken ? <CloudOff className="size-4" /> : status === "saving" ? <Loader2 className="size-4 animate-spin" /> : status === "saved" ? <CheckCircle2 className="size-4 text-[var(--psd-approved)]" /> : <HardDrive className="size-4" />}
            </span>
            <p>
                {broken ? (
                    <>
                        <b className="font-bold">Auto-save is not working in this browser</b> (a private window, or no storage space left). Do not refresh or close this page.
                        Use <b className="font-bold">Save As Draft</b> to keep your work on the server.
                    </>
                ) : (
                    <>
                        <b className="font-bold text-[var(--psd-heading)]">
                            {hasInput ? (status === "saving" ? "Saving on this computer…" : lastSavedAt ? `Saved on this computer at ${new Date(lastSavedAt).toLocaleTimeString("en-IN")}` : "Your entries are saved automatically on this computer") : "Your entries are saved automatically on this computer as you type"}
                        </b>
                        . This copy is <b className="font-bold">only in this browser</b>, not on the server. It is lost if you clear browser data, use another browser or computer, or close the tab with the “Leave site?” prompt.
                        Use <b className="font-bold">Save As Draft</b> to store it safely on the server.
                    </>
                )}
            </p>
        </div>
    );
}

// ── 3. Unfinished registrations on this computer: a compact button that opens a scrollable list ─────────
export function LocalDraftsButton({ className }: { className?: string }) {
    const { currentUser } = useFrappeAuth();
    const navigate = useNavigate();
    const [drafts, setDrafts] = useState<LocalProjectDraft[]>([]);
    const [open, setOpen] = useState(false);

    const load = useCallback(() => {
        if (currentUser) void listLocalDrafts(currentUser).then(setDrafts);
    }, [currentUser]);

    useEffect(() => {
        load();
        const off = onLocalDraftsChanged(load);
        window.addEventListener("focus", load);
        return () => {
            off();
            window.removeEventListener("focus", load);
        };
    }, [load]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    if (drafts.length === 0) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={cn(
                    "psd-focus inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--psd-accent)]/50 bg-[#FFF8F1] px-2.5 text-[12px] font-bold text-[#8A4B08] transition-colors hover:bg-[var(--psd-accent)]/15 dark:bg-zinc-800 dark:text-amber-200",
                    className,
                )}
            >
                <History className="size-3.5" />
                Unfinished
                <span className="rounded-full bg-[var(--psd-accent)] px-1.5 text-[11px] font-bold tabular-nums leading-[18px] text-white">{drafts.length}</span>
            </button>
            {open && createPortal(
                <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setOpen(false)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Unfinished registrations on this computer"
                        onMouseDown={(e) => e.stopPropagation()}
                        className="psd-root flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--psd-border)] shadow-2xl"
                        style={{ background: "var(--psd-surface)" }}
                    >
                        <div className="flex items-start gap-2.5 m-2 rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2.5">
                            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--psd-accent)]/15 text-[var(--psd-accent)]">
                                <History className="size-4" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h2 className="text-[14px] font-bold text-[var(--psd-heading)]">Unfinished registrations ({drafts.length})</h2>
                                <p className="text-[11.5px] leading-snug text-[var(--psd-body)]">Saved only on this computer and browser; clearing browser data deletes them. Finish one and use Save As Draft to keep it on the server.</p>
                            </div>
                            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="psd-focus grid size-7 shrink-0 place-items-center rounded-lg text-[var(--psd-muted)] hover:bg-[var(--psd-border)]/50">
                                <X className="size-4" />
                            </button>
                        </div>
                        <ul className="min-h-0 flex-1 divide-y divide-[var(--psd-border)] overflow-y-auto">
                            {drafts.map((d) => (
                                <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-bold text-[var(--psd-heading)]">{d.title || "Untitled project"}</p>
                                        <p className="truncate text-[11.5px] text-[var(--psd-body)]">
                                            {d.projectType ? `${d.projectType} · ` : ""}at “{TAB_NAMES[d.activeTab] ?? "Project Details"}” · saved {ago(d.savedAt)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpen(false);
                                            navigate(`/project-registration/new/${encodeURIComponent(d.id)}?resume=1`);
                                        }}
                                        className="psd-focus inline-flex items-center gap-1.5 rounded-lg bg-[var(--psd-primary)] px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition-all hover:bg-[var(--psd-primary-hover)] active:scale-[0.98]"
                                    >
                                        <RotateCcw className="size-3.5" /> Resume
                                    </button>
                                    <button
                                        type="button"
                                        aria-label={`Discard ${d.title || "untitled project"}`}
                                        onClick={() => {
                                            if (window.confirm("Delete this unfinished registration from this computer? This cannot be undone.")) void deleteLocalDraft(d.id);
                                        }}
                                        className="psd-focus grid size-8 place-items-center rounded-lg border border-[var(--psd-border)] text-[var(--psd-muted)] transition-colors hover:border-[var(--psd-returned)] hover:bg-[var(--psd-returned-bg)] hover:text-[var(--psd-returned)]"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}

// ── 4. "Start Registration" pressed while unfinished copies exist: resume one, or begin a new one ─────────
export function LocalDraftChooser({ open, onClose, onStartFresh }: { open: boolean; onClose: () => void; onStartFresh: () => void }) {
    const { currentUser } = useFrappeAuth();
    const navigate = useNavigate();
    const [drafts, setDrafts] = useState<LocalProjectDraft[]>([]);

    useEffect(() => {
        if (!open || !currentUser) return;
        void listLocalDrafts(currentUser).then(setDrafts);
        const off = onLocalDraftsChanged(() => void listLocalDrafts(currentUser).then(setDrafts));
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => {
            off();
            window.removeEventListener("keydown", onKey);
        };
    }, [open, currentUser, onClose]);

    if (!open) return null;
    return createPortal(
        <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="Resume or start fresh"
                onMouseDown={(e) => e.stopPropagation()}
                className="psd-root flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[var(--psd-border)] shadow-2xl"
                style={{ background: "var(--psd-surface)" }}
            >
                <div className="m-2 flex items-start gap-2.5 rounded-lg border-[2.5px] border-transparent px-3 py-2.5 [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box]">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--psd-accent)]/15 text-[var(--psd-accent)]">
                        <History className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[14px] font-bold text-[var(--psd-heading)]">You have unfinished registrations</h2>
                        <p className="text-[11.5px] leading-snug text-[var(--psd-body)]">Continue one of them, or start a new registration. Saved only on this computer and browser.</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Close" className="psd-focus grid size-7 shrink-0 place-items-center rounded-lg text-[var(--psd-muted)] hover:bg-[var(--psd-border)]/50">
                        <X className="size-4" />
                    </button>
                </div>
                <ul className="min-h-0 flex-1 divide-y divide-[var(--psd-border)] overflow-y-auto">
                    {drafts.map((d) => (
                        <li key={d.id} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] font-bold text-[var(--psd-heading)]">{d.title || "Untitled project"}</p>
                                <p className="truncate text-[11.5px] text-[var(--psd-body)]">
                                    {d.projectType ? `${d.projectType} · ` : ""}at “{TAB_NAMES[d.activeTab] ?? "Project Details"}” · saved {ago(d.savedAt)}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    navigate(`/project-registration/new/${encodeURIComponent(d.id)}?resume=1`);
                                }}
                                className="psd-focus inline-flex items-center gap-1.5 rounded-lg bg-[var(--psd-primary)] px-3 py-1.5 text-[12px] font-bold text-white shadow-sm transition-all hover:bg-[var(--psd-primary-hover)] active:scale-[0.98]"
                            >
                                <RotateCcw className="size-3.5" /> Resume
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="flex items-center justify-between gap-3 border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-3">
                    <p className="text-[11.5px] text-[var(--psd-body)]">Starting new keeps the saved ones; delete them from “Unfinished”.</p>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            onStartFresh();
                        }}
                        className="psd-focus shrink-0 rounded-lg border border-[var(--psd-primary)] bg-[var(--psd-surface)] px-3.5 py-2 text-[12.5px] font-bold text-[var(--psd-primary)] transition-colors hover:bg-[var(--psd-primary)] hover:text-white"
                    >
                        Start fresh
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
