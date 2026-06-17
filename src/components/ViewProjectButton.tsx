import { useState } from 'react';
import { FolderOpenIcon, XIcon } from 'lucide-react';
import ProjectDetailsOverview from '@/pages/ProjectDetailsOverview';
import { DOCTYPE_PR_LINKS, type PRLinkStrategy } from '@/utils/projectTypeMapping';

function extractPRName(doctype: string, data: Record<string, any>): string | null {
    const mapping = DOCTYPE_PR_LINKS[doctype];
    if (!mapping) return null;
    const tryStrategy = (s: PRLinkStrategy): string | null => {
        if (s.type === 'self') return (data['name'] as string) || null;
        if (s.type === 'pr_name') return (data[s.field] as string) || null;
        return null;
    };
    return tryStrategy(mapping.primary) ?? (mapping.fallback ? tryStrategy(mapping.fallback) : null);
}

const ProjectPreviewModal = ({ projectName, onClose }: { projectName: string; onClose: () => void }) => (
    <div
        className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
        <div className="relative flex-1 mx-auto my-4 w-full max-w-7xl flex flex-col bg-claude-bg dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                    <FolderOpenIcon className="w-4 h-4 text-[#D97757]" />
                    Project Registration Preview
                    <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 dark:bg-zinc-800 text-[#D97757] font-mono border border-orange-100 dark:border-zinc-700">
                        {projectName}
                    </span>
                </span>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                    aria-label="Close project preview"
                >
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto">
                <ProjectDetailsOverview projectName={projectName} embedded />
            </div>
        </div>
    </div>
);

const ViewProjectButton = ({
    doctype,
    data,
}: {
    doctype: string;
    data: Record<string, any> | null | undefined;
}) => {
    const [prPreviewName, setPrPreviewName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    if (!data) return null;

    const handleClick = async () => {
        const directName = extractPRName(doctype, data);
        if (directName) {
            setPrPreviewName(directName);
            return;
        }

        const mapping = DOCTYPE_PR_LINKS[doctype];
        const noField =
            mapping?.primary?.type === 'pr_project_no'
                ? mapping.primary.field
                : mapping?.fallback?.type === 'pr_project_no'
                    ? (mapping.fallback as Extract<PRLinkStrategy, { type: 'pr_project_no' }>).field
                    : null;
        const projectNo = noField ? data[noField] : null;
        if (!projectNo) return;

        setLoading(true);
        try {
            // Strategy 1: filter by project_no field
            const params = new URLSearchParams({
                filters: JSON.stringify([['project_no', '=', projectNo]]),
                fields: JSON.stringify(['name']),
                limit: '1',
            });
            const res = await fetch(
                `/api/resource/Project%20Registration?${params}`,
                { credentials: 'include' }
            ).then(r => r.json()).catch(() => null);
            const prName = (res?.data ?? res?.message ?? [])[0]?.name;
            if (prName) { setPrPreviewName(prName); return; }

            // Strategy 2: direct lookup by name (when value is the PR doc name / autoname)
            const directRes = await fetch(
                `/api/resource/Project%20Registration/${encodeURIComponent(projectNo)}`,
                { credentials: 'include' }
            ).then(r => r.json()).catch(() => null);
            const directDocName = directRes?.data?.name ?? directRes?.message?.name;
            if (directDocName) { setPrPreviewName(directDocName); return; }

            // Strategy 3: filter by name field
            const nameParams = new URLSearchParams({
                filters: JSON.stringify([['name', '=', projectNo]]),
                fields: JSON.stringify(['name']),
                limit: '1',
            });
            const res3 = await fetch(
                `/api/resource/Project%20Registration?${nameParams}`,
                { credentials: 'include' }
            ).then(r => r.json()).catch(() => null);
            const prName3 = (res3?.data ?? res3?.message ?? [])[0]?.name;
            if (prName3) setPrPreviewName(prName3);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handleClick}
                disabled={loading}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 h-fit rounded-md text-xs font-medium border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-[#D97757] hover:text-[#D97757] transition-colors disabled:opacity-60"
            >
                <FolderOpenIcon className="w-3.5 h-3.5" />
                {loading ? 'Loading…' : 'View Project'}
            </button>
            {prPreviewName && (
                <ProjectPreviewModal
                    projectName={prPreviewName}
                    onClose={() => setPrPreviewName(null)}
                />
            )}
        </>
    );
};

export default ViewProjectButton;
