import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { travelAPI, commonAPI } from '@/services/apiService';
import { CommentModal } from '@/components/CommentModal';
import { CheckCircleIcon, XCircleIcon, ChevronRight, ChevronDown } from 'lucide-react';

interface TravelActionButtonsProps {
    docName: string;
    onActionComplete?: () => void;
    /** When true, "Forward" is disabled until a commitment exists (Staff RnD gate) */
    commitRequired?: boolean;
    /** Current workflow state — used to detect the Other-PI approval step */
    workflowState?: string;
    /** The PI this travel is charged to; only they may act at "Pending Other PI" */
    otherPiId?: string;
}

// Same grouping/style convention as Project Registration's workflow actions dropdown
const categorise = (action: string) => {
    const a = action.toLowerCase();
    if (a.includes('forward') || a.includes('approve') || a.includes('submit') || a.includes('director')) return 'forward';
    if (a.includes('reject')) return 'reject';
    return 'neutral';
};

const itemStyle = (action: string) => {
    const cat = categorise(action);
    if (cat === 'forward') return {
        icon: <CheckCircleIcon className="h-3.5 w-3.5" />,
        cls: 'text-[#D97757] hover:bg-orange-50 dark:hover:bg-orange-900/20',
        iconCls: 'text-[#D97757]',
    };
    if (cat === 'reject') return {
        icon: <XCircleIcon className="h-3.5 w-3.5" />,
        cls: 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
        iconCls: 'text-red-500',
    };
    return {
        icon: <ChevronRight className="h-3.5 w-3.5" />,
        cls: 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700',
        iconCls: 'text-zinc-400 dark:text-zinc-500',
    };
};

const TravelActionButtons: React.FC<TravelActionButtonsProps> = ({
    docName,
    onActionComplete,
    commitRequired = false,
    workflowState,
    otherPiId,
}) => {
    const [actions, setActions] = useState<string[]>([]);

    const { call: fetchActions, result: actionsData, loading: actionsLoading } =
        useFrappePostCall<{ message: string[] }>(travelAPI.getWorkflowActions);
    const { call: performAction, loading: actionLoading } = useFrappePostCall(travelAPI.performAction);
    const { call: addComment } = useFrappePostCall(commonAPI.addComment);
    const { call: fetchPiProjects } = useFrappePostCall(travelAPI.getPiProjects);
    const { call: fetchProjectHeads } = useFrappePostCall(travelAPI.getProjectAccountHeads);
    const { currentUser } = useFrappeAuth();

    // Other-PI approval step: only the assigned PI selects which of their own
    // projects to charge the travel to, plus that project's account head.
    const isPiStep =
        workflowState === "Pending Other PI" &&
        !!currentUser &&
        (otherPiId || "").toLowerCase() === currentUser.toLowerCase();

    const [projects, setProjects] = useState<any[]>([]);
    const [heads, setHeads] = useState<any[]>([]);
    const [selectedProject, setSelectedProject] = useState("");
    const [selectedHead, setSelectedHead] = useState("");

    useEffect(() => {
        if (!isPiStep) return;
        fetchPiProjects({})
            .then((res: any) => setProjects(res?.message || []))
            .catch(() => setProjects([]));
    }, [isPiStep]);

    useEffect(() => {
        setSelectedHead("");
        if (!selectedProject) { setHeads([]); return; }
        fetchProjectHeads({ project_name: selectedProject })
            .then((res: any) => setHeads(res?.message || []))
            .catch(() => setHeads([]));
    }, [selectedProject]);

    // Dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const toggleBtnRef = useRef<HTMLButtonElement>(null);
    const dropdownPortalRef = useRef<HTMLDivElement>(null);

    // Comment modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);

    useEffect(() => {
        if (docName) fetchActions({ docname: docName });
    }, [docName]);

    useEffect(() => {
        if (actionsData?.message) setActions([...new Set(actionsData.message)]);
    }, [actionsData]);

    useEffect(() => {
        if (!dropdownOpen) return;
        const handleOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (!toggleBtnRef.current?.contains(target) && !dropdownPortalRef.current?.contains(target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, [dropdownOpen]);

    const handleToggleDropdown = () => {
        if (!dropdownOpen && toggleBtnRef.current) {
            const rect = toggleBtnRef.current.getBoundingClientRect();
            setDropdownPos({ top: rect.bottom + window.scrollY + 4, right: window.innerWidth - rect.right });
        }
        setDropdownOpen((o) => !o);
    };

    const handleActionClick = (action: string) => {
        // At the Other-PI step the PI must choose their project + account head
        // before the travel can be forwarded/approved.
        const isForward = action.toLowerCase() === 'forward' || action.toLowerCase() === 'approve';
        if (isPiStep && isForward && (!selectedProject || !selectedHead)) {
            alert('Please select a project and account head before approving.');
            return;
        }
        setDropdownOpen(false);
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        if (!selectedAction) return;
        try {
            const payload: Record<string, any> = { docname: docName, action: selectedAction };
            const isForward =
                selectedAction.toLowerCase() === 'forward' || selectedAction.toLowerCase() === 'approve';
            if (isPiStep && isForward) {
                const proj = projects.find((p) => p.value === selectedProject);
                payload.extra_data = JSON.stringify({
                    project_name: selectedProject,
                    project_number: proj?.project_number || proj?.project_no || '',
                    account_head: selectedHead,
                });
            }
            const response = await performAction(payload);

            if (response?.message?.status && response.message.status !== 'success') {
                alert(response.message.message || 'Action failed');
                return;
            }

            if (comment.trim()) {
                try {
                    await addComment({
                        doctype: 'Travel',
                        docname: docName,
                        content: `[${selectedAction}] ${comment.trim()}`,
                    });
                } catch (commentError) {
                    console.error('Error adding comment:', commentError);
                }
            }

            setModalOpen(false);
            setSelectedAction(null);
            fetchActions({ docname: docName });
            onActionComplete?.();
        } catch (error: unknown) {
            console.error('Action error:', error);
            alert('An error occurred while performing the action.');
        }
    };

    if (actionsLoading) {
        return (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">Loading actions...</div>
        );
    }

    if (!actions.length) return null;

    const forwardActions = actions.filter((a) => categorise(a) === 'forward');
    const neutralActions = actions.filter((a) => categorise(a) === 'neutral');
    const rejectActions = actions.filter((a) => categorise(a) === 'reject');
    const groups = [forwardActions, neutralActions, rejectActions].filter((g) => g.length > 0);

    return (
        <div className="flex flex-col items-end gap-1">
            {isPiStep && (
                <div className="w-full sm:w-auto flex flex-col gap-2 mb-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        Approve against one of your projects
                    </span>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <select
                            value={selectedProject}
                            onChange={(e) => setSelectedProject(e.target.value)}
                            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
                        >
                            <option value="">Select project…</option>
                            {projects.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                        <select
                            value={selectedHead}
                            onChange={(e) => setSelectedHead(e.target.value)}
                            disabled={!selectedProject}
                            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                        >
                            <option value="">Select account head…</option>
                            {heads.map((h) => (
                                <option key={h.value} value={h.value}>{h.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}
            <div className="relative">
                <button
                    ref={toggleBtnRef}
                    onClick={handleToggleDropdown}
                    disabled={actionLoading}
                    className={cn(
                        'inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all disabled:opacity-50',
                        dropdownOpen
                            ? 'bg-[#D97757] text-white border border-[#c66a4e]'
                            : 'bg-[#FFF7ED] dark:bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/40 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757]/30',
                    )}
                >
                    {actionLoading ? 'Processing…' : 'Actions'}
                    <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-150', dropdownOpen && 'rotate-180')} />
                </button>

                {dropdownOpen && createPortal(
                    <div
                        ref={dropdownPortalRef}
                        style={{ position: 'absolute', top: dropdownPos.top, right: dropdownPos.right, zIndex: 9999 }}
                        className="min-w-[210px] bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-2xl overflow-hidden"
                    >
                        <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-100 dark:border-zinc-700">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                                Workflow Actions
                            </span>
                        </div>
                        {groups.map((group, gi) => (
                            <React.Fragment key={gi}>
                                {gi > 0 && <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />}
                                {group.map((action) => {
                                    const blocked = commitRequired && categorise(action) === 'forward';
                                    const { icon, cls, iconCls } = itemStyle(action);
                                    return (
                                        <div key={action} className="relative group/item">
                                            <button
                                                onClick={() => { if (!blocked) handleActionClick(action); }}
                                                disabled={actionLoading || blocked}
                                                className={cn(
                                                    'w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors disabled:cursor-not-allowed',
                                                    blocked ? 'opacity-40' : cls,
                                                )}
                                            >
                                                <span className={iconCls}>{icon}</span>
                                                {action}
                                                {blocked && (
                                                    <span className="ml-auto text-[10px] font-normal text-zinc-400">blocked</span>
                                                )}
                                            </button>
                                            {blocked && (
                                                <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/item:block z-[9999]">
                                                    <div className="bg-zinc-900 text-white text-[11px] rounded-lg px-3 py-1.5 shadow-lg whitespace-nowrap">
                                                        A commitment must be submitted before forwarding this application.
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        ))}
                    </div>,
                    document.body,
                )}
            </div>
            {commitRequired && (
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    A commitment must be submitted before forwarding.
                </p>
            )}

            <CommentModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedAction(null); }}
                onSubmit={handleConfirmAction}
                action={selectedAction || 'Action'}
                isLoading={actionLoading}
            />
        </div>
    );
};

export default TravelActionButtons;
