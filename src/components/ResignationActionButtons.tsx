import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { CommentModal } from '@/components/CommentModal';
import { CheckCircleIcon, XCircleIcon, ChevronRight, ChevronDown } from 'lucide-react';

interface ResignationActionButtonsProps {
    actions: string[];
    onAction: (action: string, comment: string) => void | Promise<void>;
    isBusy?: boolean;
    /** When true, forward-type actions are disabled until a commitment exists (Staff RnD gate) */
    commitRequired?: boolean;
    commitBlockedMessage?: string;
}

// Same grouping/style convention as Travel/Project Registration's workflow actions dropdown
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

const ResignationActionButtons: React.FC<ResignationActionButtonsProps> = ({
    actions,
    onAction,
    isBusy = false,
    commitRequired = false,
    commitBlockedMessage = 'A commitment must be submitted before forwarding this application.',
}) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const toggleBtnRef = useRef<HTMLButtonElement>(null);
    const dropdownPortalRef = useRef<HTMLDivElement>(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState<string | null>(null);

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
        setDropdownOpen(false);
        setSelectedAction(action);
        setModalOpen(true);
    };

    const handleConfirmAction = async (comment: string) => {
        if (!selectedAction) return;
        await onAction(selectedAction, comment);
        setModalOpen(false);
        setSelectedAction(null);
    };

    if (!actions.length) return null;

    const forwardActions = actions.filter((a) => categorise(a) === 'forward');
    const neutralActions = actions.filter((a) => categorise(a) === 'neutral');
    const rejectActions = actions.filter((a) => categorise(a) === 'reject');
    const groups = [forwardActions, neutralActions, rejectActions].filter((g) => g.length > 0);

    return (
        <div className="flex flex-col items-end gap-1">
            <div className="relative">
                <button
                    ref={toggleBtnRef}
                    onClick={handleToggleDropdown}
                    disabled={isBusy}
                    className={cn(
                        'inline-flex items-center gap-2 h-9 px-4 text-xs font-bold uppercase tracking-wide rounded-lg shadow-sm transition-all disabled:opacity-50',
                        dropdownOpen
                            ? 'bg-[#D97757] text-white border border-[#c66a4e]'
                            : 'bg-[#FFF7ED] dark:bg-[#D97757]/15 text-[#D97757] border border-[#D97757]/40 hover:bg-[#D97757] hover:text-white dark:hover:bg-[#D97757]/30',
                    )}
                >
                    {isBusy ? 'Processing…' : 'Actions'}
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
                                                disabled={isBusy || blocked}
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
                                                        {commitBlockedMessage}
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
                    {commitBlockedMessage}
                </p>
            )}

            <CommentModal
                isOpen={modalOpen}
                onClose={() => { setModalOpen(false); setSelectedAction(null); }}
                onSubmit={handleConfirmAction}
                action={selectedAction || 'Action'}
                isLoading={isBusy}
                requireComment
            />
        </div>
    );
};

export default ResignationActionButtons;
