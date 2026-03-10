import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this utility exists based on other files

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved':
            case 'Completed':
            case 'Submitted':
                return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800';
            case 'Pending':
            case 'Processing':
                return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800';
            case 'Rejected':
            case 'Cancelled':
                return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
            case 'Draft':
                return 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
        }
    };

    return (
        <header className={cn("mb-8 p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm", className)}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                    {showBack && (
                        <button
                            onClick={() => navigate(-1)}
                            className="p-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            title="Go Back"
                        >
                            <ArrowLeftIcon className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                        </button>
                    )}
                    <div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
                            {status && (
                                <span className={cn(
                                    "px-3 py-1 text-sm font-bold rounded-md border",
                                    getStatusColor(status)
                                )}>
                                    {status}
                                </span>
                            )}
                        </div>

                        {(projectName || projectNumber) ? (
                            <div className="mt-2 space-y-1">
                                {projectName && (
                                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{projectName}</span>
                                    </div>
                                )}
                                {projectNumber && (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">Project No:</span>
                                        <span className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 w-fit">{projectNumber}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
                                Please fill in the details below.
                            </p>
                        )}
                    </div>
                </div>

                {children && (
                    <div className="flex items-center gap-3 self-end md:self-center">
                        {children}
                    </div>
                )}
            </div>
        </header>
    );
};
