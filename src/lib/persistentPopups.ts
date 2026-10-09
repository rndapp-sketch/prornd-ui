import { create } from "zustand";

export interface PersistedLedger {
    projectName: string;
    budgetHeadList: { name: string; id: number | string }[];
}

interface PersistentPopupsState {
    ledger: PersistedLedger | null;
    preview: string | null;
    setLedger: (v: PersistedLedger | null) => void;
    setPreview: (v: string | null) => void;
}

/**
 * Floating popups (Project Budget Ledger, View Project) that stay open when the user
 * navigates to another page. A popup whose page unmounts while it is open hands itself
 * over here, and <PersistentPopups /> (mounted once in App) keeps rendering it until the
 * user closes it.
 */
export const usePersistentPopups = create<PersistentPopupsState>((set) => ({
    ledger: null,
    preview: null,
    setLedger: (ledger) => set({ ledger }),
    setPreview: (preview) => set({ preview }),
}));
