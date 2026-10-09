import { usePersistentPopups } from "@/lib/persistentPopups";
import { ProjectLedgerModal } from "@/components/ProjectLedgerModal";
import { ProjectPreviewModal } from "@/components/ViewProjectButton";

/** Renders popups that outlived the page which opened them. Mounted once, in App. */
export const PersistentPopups = () => {
    const { ledger, preview, setLedger, setPreview } = usePersistentPopups();
    return (
        <>
            {ledger && (
                <ProjectLedgerModal
                    isOpen
                    persistOnNavigate={false}
                    projectName={ledger.projectName}
                    budgetHeadList={ledger.budgetHeadList}
                    onClose={() => setLedger(null)}
                />
            )}
            {preview && (
                <ProjectPreviewModal projectName={preview} onClose={() => setPreview(null)} />
            )}
        </>
    );
};
