import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: string;
    projectNumber?: string;
    projectName?: string;
    status?: string;
    showBack?: boolean;
    children?: React.ReactNode;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    projectNumber,
    projectName,
    status,
    showBack = true,
    children,
    className
}) => {
    const navigate = useNavigate();

    const getStatusStyle = (s: string) => {
        const lower = s?.toLowerCase() || "";
        if (lower === 'approved' || lower === 'completed' || lower === 'submitted' || lower.includes('open'))
            return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400';
        if (lower === 'pending' || lower.includes('review') || lower.includes('process') || lower.includes('approval'))
            return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400';
        if (lower === 'rejected' || lower === 'cancelled' || lower.includes('reject'))
            return 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400';
        if (lower === 'draft')
            return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';
        if (lower.includes('forward') || lower.includes('endorse'))
            return 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-400';
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400';
    };

    const getStatusDot = (s: string) => {
        const lower = s?.toLowerCase() || "";
        if (lower === 'approved' || lower === 'completed' || lower === 'submitted' || lower.includes('open')) return 'bg-emerald-500';
        if (lower === 'pending' || lower.includes('review') || lower.includes('process') || lower.includes('approval')) return 'bg-amber-500';
        if (lower === 'rejected' || lower === 'cancelled') return 'bg-red-500';
        if (lower === 'draft') return 'bg-zinc-400';
        if (lower.includes('forward') || lower.includes('endorse')) return 'bg-violet-500';
        return 'bg-blue-500';
    };

    return (
        <header className={cn(
            "mb-6 bg-white dark:bg-[#27272A] border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] rounded-2xl shadow-sm overflow-hidden",
            className
        )}>
            {/* Top accent bar */}
            <div className="h-[3px] bg-gradient-to-r from-[#2563EB] via-[#4A6CF7] to-transparent" />

            <div className="px-6 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        {showBack && (
                            <button
                                onClick={() => navigate(-1)}
                                className="mt-0.5 p-2 rounded-xl border-[1.5px] border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] hover:bg-[#EFF6FF] dark:hover:bg-[#2563EB]/10 hover:border-[#2563EB]/40 transition-all duration-150 flex-shrink-0 shadow-sm"
                                title="Go Back"
                            >
                                <ArrowLeftIcon className="h-4 w-4 text-[#2563EB] dark:text-[#60A5FA]" />
                            </button>
                        )}
                        <div>
                            <div className="flex items-center gap-3 flex-wrap">
                                <h1 className="text-[20px] font-extrabold tracking-[-0.02em] text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                    {title}
                                </h1>
                                {status && (
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[9px] font-bold rounded-full uppercase tracking-widest",
                                        getStatusStyle(status)
                                    )}>
                                        <span className={cn("w-[5px] h-[5px] rounded-full flex-shrink-0", getStatusDot(status))} />
                                        {status}
                                    </span>
                                )}
                            </div>

                            {(projectName || projectNumber) ? (
                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                                    {projectName && (
                                        <span className="text-[13px] font-medium text-[#71717A] dark:text-[#A1A1AA]">{projectName}</span>
                                    )}
                                    {projectName && projectNumber && (
                                        <span className="text-[#D4D4D8] dark:text-[#52525B] text-sm">·</span>
                                    )}
                                    {projectNumber && (
                                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-[#EFF6FF] dark:bg-[#2563EB]/10 px-2.5 py-0.5 rounded-lg text-[#2563EB] dark:text-[#60A5FA] border border-[#2563EB]/20 dark:border-[#2563EB]/20 tracking-tight">
                                            {projectNumber}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <p className="text-[#A1A1AA] dark:text-[#71717A] mt-1 text-[11px] font-medium">
                                    Fill in the details below and save.
                                </p>
                            )}
                        </div>
                    </div>

                    {children && (
                        <div className="flex items-center gap-2.5 flex-wrap self-end md:self-center">
                            {children}
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};
