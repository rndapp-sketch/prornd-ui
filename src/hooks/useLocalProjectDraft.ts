import { useCallback, useEffect, useRef, useState } from "react";
import {
    deleteLocalDraft,
    getLocalDraft,
    hasMeaningfulInput,
    isLocalDraftSupported,
    requestPersistentStorage,
    saveLocalDraft,
    type LocalProjectDraft,
} from "@/utils/localProjectDrafts";

type Mode = "checking" | "pending" | "restoring" | "ready";
export type LocalSaveStatus = "idle" | "saving" | "saved" | "error";

interface Options {
    /** Temporary id from /project-registration/new/<tempId>. Autosave only runs for new (not yet server-saved) forms. */
    tempId?: string;
    docname: string | null;
    user?: string | null;
    /** ?resume=1 in the URL (opened from the "unfinished registrations" list): restore without asking */
    resumeRequested: boolean;

    formData: Record<string, any>;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    budgetYears: number[];
    setBudgetYears: React.Dispatch<React.SetStateAction<number[]>>;
    activeTab: number;
    setActiveTab: (n: number) => void;
    setEntryStep: (s: "instructions" | "form") => void;

    /** The form's fields have loaded and its own defaults have been applied */
    formReady: boolean;
    isEditMode: boolean;
    /** The registration has been saved or submitted to the server: the local copy is no longer needed */
    serverSaved: boolean;
    /** The form's own logic for showing/hiding the per-year total fields, given the duration in months */
    restoreYears: (durationMonths: number) => void;
}

/**
 * Keeps an unfinished new Project Registration safe in this browser (IndexedDB) and lets the user continue it
 * after a refresh or crash. It only READS the form's state and, on restore, writes it back through the form's own
 * setters; none of the form's handlers, validation or API calls are touched.
 */
export function useLocalProjectDraft(o: Options) {
    const active = !!o.tempId && !o.docname && !!o.user;
    const supported = isLocalDraftSupported();

    const [mode, setMode] = useState<Mode>("checking");
    const [found, setFound] = useState<LocalProjectDraft | null>(null);
    const [status, setStatus] = useState<LocalSaveStatus>("idle");
    const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
    const appliedRef = useRef(false);
    const askedPersistRef = useRef(false);

    // 1) On arrival: is there a saved copy for this very URL (the refresh / crash case)?
    useEffect(() => {
        appliedRef.current = false;
        setFound(null);
        if (!active || !supported) {
            setMode("ready");
            return;
        }
        setMode("checking");
        let cancelled = false;
        getLocalDraft(o.tempId as string, o.user as string).then((d) => {
            if (cancelled) return;
            if (!d) {
                setMode("ready");
                return;
            }
            setFound(d);
            if (o.resumeRequested) {
                o.setEntryStep("form");
                setMode("restoring");
            } else {
                setMode("pending");
            }
        });
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, o.tempId, o.user, o.resumeRequested]);

    // 2) Restore: once the form has finished loading, lay the saved values on top of it
    useEffect(() => {
        if (mode !== "restoring" || !found || !o.formReady || appliedRef.current) return;
        appliedRef.current = true;
        const months = parseInt(found.formData?.project_duration_months) || 0;
        if (months > 0) o.restoreYears(months);
        o.setFormData((prev: Record<string, any>) => ({ ...prev, ...found.formData }));
        o.setBudgetYears(found.budgetYears?.length ? found.budgetYears : [1]);
        o.setActiveTab(found.activeTab || 0);
        o.setEntryStep("form");
        setStatus("saved");
        setLastSavedAt(found.savedAt);
        setMode("ready");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, found, o.formReady]);

    const latest = useRef({ formData: o.formData, activeTab: o.activeTab, budgetYears: o.budgetYears });
    latest.current = { formData: o.formData, activeTab: o.activeTab, budgetYears: o.budgetYears };

    const canSave = active && supported && mode === "ready" && o.formReady && o.isEditMode && !o.serverSaved;

    const doSave = useCallback(async () => {
        const { formData, activeTab, budgetYears } = latest.current;
        if (!hasMeaningfulInput(formData)) return;
        setStatus("saving");
        if (!askedPersistRef.current) {
            askedPersistRef.current = true;
            requestPersistentStorage();
        }
        const ok = await saveLocalDraft({ id: o.tempId as string, user: o.user as string, activeTab, budgetYears, formData });
        setStatus(ok ? "saved" : "error");
        if (ok) setLastSavedAt(Date.now());
    }, [o.tempId, o.user]);

    // 3) Autosave a moment after the user stops typing
    useEffect(() => {
        if (!canSave || !hasMeaningfulInput(o.formData)) return;
        const t = setTimeout(doSave, 1200);
        return () => clearTimeout(t);
    }, [o.formData, o.activeTab, o.budgetYears, canSave, doSave]);

    // 4) ...and right away when the tab is hidden or closing
    useEffect(() => {
        if (!canSave) return;
        const flush = () => {
            if (document.visibilityState === "hidden") void doSave();
        };
        const onHide = () => void doSave();
        document.addEventListener("visibilitychange", flush);
        window.addEventListener("pagehide", onHide);
        return () => {
            document.removeEventListener("visibilitychange", flush);
            window.removeEventListener("pagehide", onHide);
        };
    }, [canSave, doSave]);

    // 5) Saved or submitted to the server: the local copy has done its job
    useEffect(() => {
        // `active` turns false once a docname exists, so only the server-saved flag is checked here
        if (o.serverSaved && o.tempId) {
            void deleteLocalDraft(o.tempId);
            setStatus("idle");
            setLastSavedAt(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [o.serverSaved]);

    // 6) Warn before the tab is closed or reloaded while there is work that only exists in this browser
    const unsaved = active && !o.serverSaved && mode === "ready" && o.isEditMode && hasMeaningfulInput(o.formData);
    useEffect(() => {
        if (!unsaved) return;
        const onBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = ""; // browsers show their own generic "Leave site?" text
            return "";
        };
        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [unsaved]);

    const accept = useCallback(() => {
        o.setEntryStep("form");
        setMode("restoring");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const discard = useCallback(() => {
        if (o.tempId) void deleteLocalDraft(o.tempId);
        setFound(null);
        setMode("ready");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [o.tempId]);

    return { active, supported, mode, found, status, lastSavedAt, unsaved, accept, discard };
}
