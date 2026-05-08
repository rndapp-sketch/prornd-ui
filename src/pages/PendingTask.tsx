

// -=-=-=-=-=-=

import React, { useState, useRef } from 'react';
import { FaExclamationCircle, FaArrowLeft } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { ActivityLog } from '@/components/ActivityLog';
import { XIcon, ActivityIcon } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { useFrappeGetCall, useFrappeAuth, useFrappeGetDocList } from 'frappe-react-sdk';
import { GlobalLoader } from '@/components/ui/global-loader';
import { useUserRoles } from '../components/UserRole';
import {
    resolveProjectCategory,
    DOCTYPE_PR_LINKS,
    type PRLinkStrategy,
    type ProjectCategory,
} from '@/utils/projectTypeMapping';

interface PendingTaskRecord {
    name: string;
    title: string;
    status: string;
    creation: string;
    modified: string;
    owner: string;
    head_approver?: string;
    // PR link fields — which ones are populated depends on the DocType
    prjreg_title?: string;
    project_name?: string;
    project_proposal?: string;
    project_type_linked?: string;
    project_ref_number?: string;
    project_number?: string;
    project_title?: string;
    project_ref?: string;
    project_no?: string;
    project_code?: string;
    project_id?: string;
    travel_project_title?: string;
    travel_project_number?: string;
    igf_project_title?: string;
    igf_project_code?: string;
    upfa_project_code?: string;
    prj_num?: string;
}

interface PendingTaskResult {
    doctype: string;
    records: PendingTaskRecord[];
    mod_vis?: number;
}

interface PendingTaskResponse {
    message: {
        page: string;
        status_value: string;
        results: PendingTaskResult[];
    };
}

interface FlattenedTask {
    id: string;
    title: string;
    "Project Number": string;
    status: string;
    priority: string;
    creation: string;
    modified: string;
    owner: string;
    doctype: string;
    project_type: ProjectCategory;
}

type ProjectTypeTab = ProjectCategory;

const PROJECT_TYPE_TABS: ProjectTypeTab[] = ['Research', 'Consultancy', 'Others'];
const HIDDEN_OTHERS_DOCTYPES = new Set(['Kafka Commit Staging', 'Project Number Generation']);

const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
            variant === 'primary' && "bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm hover:shadow-md",
            variant === 'ghost' && "bg-transparent text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100",
            variant === 'outline' && "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800",
            variant === 'action' && "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm hover:shadow-md",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

const PendingTask: React.FC = () => {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedModule, setSelectedModule] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedProjectType, setSelectedProjectType] = useState<ProjectTypeTab>('Research');
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    // Activity peek panel state
    const [selectedTask, setSelectedTask] = useState<{ doctype: string; docname: string; title: string } | null>(null);

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isHeadApprover = roles?.includes("head_approver_1") ?? false;

    const { data: headApproverProjects } = useFrappeGetDocList("Project Registration", {
        filters: [["head_approver", "=", currentUser ?? ""]],
        fields: ["name"],
        limit: 500,
    }, isHeadApprover && !!currentUser ? undefined : null);

    // Fetch all projects for project_type lookup (single source of truth)
    const { data: allProjectRegistrations } = useFrappeGetDocList("Project Registration", {
        fields: ["name", "project_no", "project_type"],
        limit: 1000,
    });

    const allowedProjectNames = React.useMemo(() => {
        if (!isHeadApprover || !headApproverProjects) return null;
        return new Set(headApproverProjects.map((p: { name: string }) => p.name));
    }, [isHeadApprover, headApproverProjects]);

    // prNameToType: PR document name (auto-id) → raw project_type
    // prNoToType:   PR project_no (human-readable) → raw project_type
    const { prNameToType, prNoToType } = React.useMemo(() => {
        const prNameToType = new Map<string, string>();
        const prNoToType = new Map<string, string>();
        if (allProjectRegistrations) {
            allProjectRegistrations.forEach((p: { name: string; project_no?: string; project_type?: string }) => {
                const raw = p.project_type || '';
                if (p.name) prNameToType.set(p.name, raw);
                if (p.project_no) prNoToType.set(p.project_no, raw);
            });
        }
        return { prNameToType, prNoToType };
    }, [allProjectRegistrations]);

    const { data, isLoading, error } = useFrappeGetCall<PendingTaskResponse>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_task",
        { page_name: "pending-task" }
    );

    const allTasks: FlattenedTask[] = React.useMemo(() => {
        if (!data?.message?.results) return [];

        const tasks: FlattenedTask[] = [];
        data.message.results.forEach((group) => {
            if (group.mod_vis || group.doctype === "Advance Settlement") {
                group.records.forEach((record) => {
                    if (isHeadApprover && group.doctype === "Project Registration" && allowedProjectNames && !allowedProjectNames.has(record.name)) {
                        return;
                    }
                    if (
                        record.status === "Endorsement Approved" ||
                        record.status === "Sanction Approved"
                    ) {
                        return;
                    }
                    tasks.push({
                        id: record.name,
                        title: record.title,
                        "Project Number": record.name,
                        status: record.status,
                        priority: 'Medium',
                        creation: record.creation,
                        modified: record.modified,
                        owner: record.owner,
                        doctype: group.doctype,
                        project_type: resolveProjectCategory(
                            record as unknown as Record<string, unknown>,
                            group.doctype,
                            prNameToType,
                            prNoToType,
                        ),
                    });
                });
            }
        });
        return tasks;
    }, [data, isHeadApprover, allowedProjectNames, prNameToType, prNoToType]);

    // Phase-2: secondary fetch to resolve project_type from each doctype's actual link fields.
    // The pending-task API only returns basic fields (name, title, status…), so link fields
    // like prjreg_title / project_name are absent. We batch-fetch per doctype to fill the gap.
    const [resolvedProjectTypes, setResolvedProjectTypes] = React.useState<Map<string, ProjectCategory>>(new Map());

    React.useEffect(() => {
        if (!allTasks.length) return;

        const byDoctype = new Map<string, string[]>();
        allTasks.forEach(task => {
            const mapping = DOCTYPE_PR_LINKS[task.doctype];
            if (!mapping || mapping.primary.type === 'self') return;
            if (!byDoctype.has(task.doctype)) byDoctype.set(task.doctype, []);
            byDoctype.get(task.doctype)!.push(task.id);
        });

        if (!byDoctype.size) return;

        const newMap = new Map<string, ProjectCategory>();
        const promises: Promise<void>[] = [];

        byDoctype.forEach((ids, doctype) => {
            const mapping = DOCTYPE_PR_LINKS[doctype]!;
            const fields = new Set<string>(['name']);
            const addField = (s: PRLinkStrategy) => { if (s.type !== 'self') fields.add(s.field); };
            addField(mapping.primary);
            if (mapping.fallback) addField(mapping.fallback);

            // Frappe v1 list API:
            //   filters  → JSON array of [field, op, value] triples
            //   fields   → JSON array of field names
            //   in-filter value must be a comma-separated string, NOT a nested array
            const filterValue = ids.join(',');
            const params = new URLSearchParams({
                filters: JSON.stringify([['name', 'in', filterValue]]),
                fields: JSON.stringify([...fields]),
                limit: String(ids.length),
            });

            const p = fetch(`/api/resource/${encodeURIComponent(doctype)}?${params}`)
                .then(r => r.json())
                .then(result => {
                    // Frappe v1 returns { data: [...] }
                    (result?.data ?? result?.message ?? []).forEach((rec: Record<string, unknown>) => {
                        const cat = resolveProjectCategory(rec, doctype, prNameToType, prNoToType);
                        newMap.set(rec['name'] as string, cat);
                    });
                })
                .catch(() => { /* silently skip on auth/network errors */ });

            promises.push(p);
        });

        Promise.all(promises).then(() => {
            if (newMap.size > 0) setResolvedProjectTypes(new Map(newMap));
        });
    }, [allTasks, prNameToType, prNoToType]);

    // Merge phase-1 results with phase-2 resolved types
    const resolvedTasks = React.useMemo(() =>
        allTasks.map(task => {
            const resolved = resolvedProjectTypes.get(task.id);
            return resolved ? { ...task, project_type: resolved } : task;
        }),
        [allTasks, resolvedProjectTypes]);

    const visibleTasks = React.useMemo(() =>
        resolvedTasks.filter(task => !(task.project_type === 'Others' && HIDDEN_OTHERS_DOCTYPES.has(task.doctype))),
        [resolvedTasks]);

    const tabCounts = React.useMemo(() => ({
        Research: visibleTasks.filter(t => t.project_type === 'Research').length,
        Consultancy: visibleTasks.filter(t => t.project_type === 'Consultancy').length,
        Others: visibleTasks.filter(t => t.project_type === 'Others').length,
    }), [visibleTasks]);

    // Module names scoped to current project type tab
    const moduleNames = React.useMemo(() => {
        const baseTasks = visibleTasks.filter(t => t.project_type === selectedProjectType);
        const uniqueModules = new Set(baseTasks.map(task => task.doctype));
        return Array.from(uniqueModules).sort();
    }, [visibleTasks, selectedProjectType]);

    const filteredTasks = React.useMemo(() => {
        let tasks = visibleTasks.filter(t => t.project_type === selectedProjectType);

        if (selectedModule !== 'all') {
            tasks = tasks.filter(task => task.doctype === selectedModule);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            tasks = tasks.filter(task =>
                task.title?.toLowerCase().includes(q) ||
                task["Project Number"]?.toLowerCase().includes(q) ||
                task.owner?.toLowerCase().includes(q) ||
                task.doctype?.toLowerCase().includes(q)
            );
        }
        return tasks;
    }, [visibleTasks, selectedProjectType, selectedModule, searchQuery]);

    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
    const indexOfLastTask = currentPage * itemsPerPage;
    const indexOfFirstTask = indexOfLastTask - itemsPerPage;
    const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);

    const handlePageChange = (pageNumber: number) => setCurrentPage(pageNumber);

    const handleProjectTypeChange = (tab: ProjectTypeTab) => {
        setSelectedProjectType(tab);
        setSelectedModule('all');
        setCurrentPage(1);
    };

    const handleModuleChange = (module: string) => {
        setSelectedModule(module);
        setCurrentPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        setCurrentPage(1);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        searchInputRef.current?.focus();
    };

    const getPriorityBadge = (priority: string) => {
        const styles: Record<string, string> = {
            High: 'bg-red-50 text-red-700 border-red-200',
            Medium: 'bg-amber-50 text-amber-700 border-amber-200',
            Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        };
        return cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", styles[priority] || 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700');
    };

    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase();
        let style = "bg-orange-50 text-orange-700 border-orange-200";
        if (["pending", "under review", "approval pending"].some(t => s?.includes(t))) {
            style = "bg-amber-50 text-amber-700 border-amber-200";
        } else if (s?.includes("approved")) {
            style = "bg-emerald-50 text-emerald-700 border-emerald-200";
        } else if (s?.includes("draft")) {
            style = "bg-zinc-100 text-zinc-600 border-zinc-200";
        } else if (s?.includes("rejected")) {
            style = "bg-red-50 text-red-700 border-red-200";
        }
        return cn("px-2 py-0.5 rounded-full text-[10px] font-medium border", style);
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxButtons = 3;
        if (totalPages <= maxButtons) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
                <FrappeCard className="p-12 text-center max-w-md w-full">
                    <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FaExclamationCircle className="h-6 w-6 text-red-600" />
                    </div>
                    <h2 className="text-[18px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] mb-2">Unable to Load Tasks</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">{error.message}</p>
                    <FrappeButton onClick={() => window.location.reload()} variant="outline" className="mt-6">
                        Retry
                    </FrappeButton>
                </FrappeCard>
            </div>
        );
    }

    return (
        <>
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans text-[#3F3F46] dark:text-[#E4E4E7]">
            <GlobalLoader isLoading={isLoading} />

            <main className="flex-1 px-6 md:px-8 pt-7 pb-10 w-full overflow-hidden">
                {/* Header */}
                <div className="mb-5 overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="flex items-start gap-3 px-5 py-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#D97757] hover:border-[#D97757]/30 hover:bg-[#D97757]/10 transition-colors"
                            aria-label="Back to dashboard"
                        >
                            <FaArrowLeft className="h-3.5 w-3.5" />
                        </button>
                        <div className="min-w-0">
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">Workflow Inbox</span>
                            <h1 className="mt-1 font-sans text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">Pending Tasks</h1>
                            <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">Manage and track pending approvals.</p>
                        </div>
                    </div>
                </div>

                {/* Project Type Tabs */}
                <div className="mb-4 flex items-center gap-2 border-t-2 border-[#4A6CF7]/35 pt-4 dark:border-[#818CF8]/35 overflow-x-auto">
                    {PROJECT_TYPE_TABS.map((tab) => {
                        const active = selectedProjectType === tab;
                        const tabColors: Record<string, string> = {
                            Research: active ? 'bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A] shadow-sm' : 'border-[#C7D2FE] bg-[#EEF2FF]/55 text-[#1E3A8A] hover:bg-[#EEF2FF]',
                            Consultancy: active ? 'bg-[#ECFDF5] border-[#10B981] text-[#065F46] shadow-sm' : 'border-[#A7F3D0] bg-[#ECFDF5]/60 text-[#047857] hover:bg-[#ECFDF5]',
                            Others: active ? 'bg-[#F4F4F5] border-[#71717A] text-[#3F3F46] shadow-sm' : 'border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F4F4F5]',
                        };
                        const badgeColors: Record<string, string> = {
                            Research: active ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                            Consultancy: active ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
                            Others: active ? 'bg-zinc-600 text-white' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400',
                        };
                        return (
                            <button
                                key={tab}
                                onClick={() => handleProjectTypeChange(tab)}
                                className={cn(
                                    "flex h-9 flex-shrink-0 items-center gap-2 rounded-lg border px-3 text-[11px] font-extrabold uppercase tracking-wide transition-all duration-150",
                                    tabColors[tab]
                                )}
                            >
                                {tab}
                                <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", badgeColors[tab])}>
                                    {tabCounts[tab]}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Filter Section */}
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <select
                                id="module-filter"
                                value={selectedModule}
                                onChange={(e) => handleModuleChange(e.target.value)}
                                className="h-10 pl-4 pr-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 appearance-none shadow-sm cursor-pointer min-w-[180px]"
                            >
                                <option value="all">All Modules</option>
                                {moduleNames.map((module) => (
                                    <option key={module} value={module}>
                                        {module}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                            </div>
                        </div>

                        {selectedModule !== 'all' && (
                            <>
                                <div className="h-6 w-px bg-zinc-300 dark:bg-zinc-700" />
                                <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{selectedModule}</span>
                                    <button
                                        onClick={() => handleModuleChange('all')}
                                        className="ml-1 text-zinc-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50 p-0.5"
                                        title="Clear filter"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                            </span>
                            <input
                                ref={searchInputRef}
                                type="text"
                                id="task-search"
                                placeholder="Search tasks..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="h-10 pl-9 pr-9 w-56 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 shadow-sm transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
                                    title="Clear search"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-3 border-r border-zinc-200 dark:border-zinc-700 pr-3 mr-1">
                            <span className="text-sm text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap hidden sm:inline">Rows:</span>
                            <select
                                value={itemsPerPage}
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="h-8 pl-2 pr-8 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded text-xs text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
                            >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 font-medium whitespace-nowrap">
                            Showing <span className="text-zinc-900 dark:text-zinc-200 font-semibold">{filteredTasks.length}</span> tasks
                        </div>
                    </div>
                </div>

                {/* Table */}
                <FrappeCard className="overflow-hidden p-3">
                    <div className="overflow-x-auto rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                        <table className="w-full">
                            <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                <tr>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Status</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Module</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Title</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Project No.</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Date</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Owner</th>
                                    <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Priority</th>
                                    <th className="px-4 py-3 text-end text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-800 text-xs">
                                {currentTasks.length > 0 ? (
                                    currentTasks.map((task) => (
                                        <tr key={task.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors group">
                                            <td className="p-3 align-middle">
                                                <span className={getStatusBadge(task.status)}>
                                                    {task.status}
                                                </span>
                                            </td>
                                            <td className="p-3 align-middle text-zinc-600 dark:text-zinc-400 font-medium">
                                                {task.doctype}
                                            </td>
                                            <td className="p-3 align-middle font-medium text-zinc-900 dark:text-zinc-200">
                                                <button
                                                    className="text-left hover:text-[#D97757] transition-colors flex items-center gap-1.5 group/title"
                                                    onClick={() => setSelectedTask({ doctype: task.doctype, docname: task.id, title: task.title })}
                                                    title="Click to preview activity log"
                                                >
                                                    {task.title.length > 40 ? `${task.title.substring(0, 40)}...` : task.title}
                                                    <ActivityIcon className="w-3.5 h-3.5 opacity-0 group-hover/title:opacity-100 text-[#D97757] flex-shrink-0 transition-opacity" />
                                                </button>
                                            </td>
                                            <td className="p-3 align-middle font-mono text-zinc-500 dark:text-zinc-400 text-xs">
                                                {task["Project Number"]}
                                            </td>
                                            <td className="p-3 align-middle text-zinc-500 dark:text-zinc-400">
                                                {task.creation ? new Date(task.creation).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "-"}
                                            </td>
                                            <td className="p-3 align-middle text-zinc-600 dark:text-zinc-400">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                                                        {task.owner.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="truncate max-w-[100px]">{task.owner}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 align-middle">
                                                <span className={getPriorityBadge(task.priority)}>
                                                    {task.priority}
                                                </span>
                                            </td>
                                            <td className="p-3 align-middle text-right">
                                                <FrappeButton
                                                    variant="primary"
                                                    onClick={() => {
                                                        if (task.doctype === "Fund Received") {
                                                            navigate(`/fund-received/${task.id}`);
                                                        } else if (task.doctype === "Reimbursement") {
                                                            navigate(`/reimbursement/${task.id}`);
                                                        } else if (task.doctype === "Advance Settlement") {
                                                            navigate(`/advance-settlement/${task.id}`);
                                                        } else if (task.doctype === "Temporary Advance") {
                                                            navigate(`/pending-tasks/${encodeURIComponent(task.doctype)}/${task.id}`);
                                                        } else if (task.doctype === "Direct Purchase") {
                                                            navigate(`/direct-purchase/${task.id}`);
                                                        } else if (task.doctype === "Disbursal of Consultancy") {
                                                            navigate(`/disbursal-of-consultancy/${task.id}`);
                                                        } else if (task.doctype === "Travel") {
                                                            navigate(`/travel/${task.id}`);
                                                        } else if (task.doctype === "Selection Committee Report") {
                                                            navigate(`/selection-committee-report/${task.id}`);
                                                        } else {
                                                            navigate(`/pending-tasks/${task.doctype}/${task.id}`);
                                                        }
                                                    }}
                                                    className="px-3 py-1.5 text-xs h-8 shadow-sm"
                                                >
                                                    View
                                                </FrappeButton>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={8} className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                                            {isLoading ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin"></div>
                                                    <p>Loading tasks...</p>
                                                </div>
                                            ) : (
                                                "No pending tasks found matching your criteria."
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {filteredTasks.length > 0 && (
                        <div className="p-4 border-t border-zinc-200 dark:border-zinc-700 flex justify-between items-center bg-white dark:bg-zinc-800">
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                Showing <span className="font-medium text-zinc-900 dark:text-zinc-200">{indexOfFirstTask + 1}</span> to <span className="font-medium text-zinc-900 dark:text-zinc-200">{Math.min(indexOfLastTask, filteredTasks.length)}</span> of {filteredTasks.length} entries
                            </div>
                            <div className="flex gap-1">
                                <FrappeButton
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    variant="outline"
                                    className="px-3"
                                >
                                    Previous
                                </FrappeButton>
                                {getPageNumbers().map((page, index) => (
                                    <button
                                        key={index}
                                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                                        disabled={typeof page !== 'number'}
                                        className={cn(
                                            "w-9 h-9 rounded-lg text-sm font-medium transition-colors flex items-center justify-center",
                                            page === currentPage
                                                ? "bg-zinc-900 text-white shadow-sm"
                                                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700",
                                            typeof page !== 'number' && "cursor-default hover:bg-transparent"
                                        )}
                                    >
                                        {page}
                                    </button>
                                ))}
                                <FrappeButton
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    variant="outline"
                                    className="px-3"
                                >
                                    Next
                                </FrappeButton>
                            </div>
                        </div>
                    )}
                </FrappeCard>
            </main>
        </div>

        {/* Activity Log Peek Panel */}
        {selectedTask && (
            <div
                className="fixed inset-0 z-40"
                onClick={() => setSelectedTask(null)}
            >
                <div
                    className="absolute right-0 top-0 h-full w-full max-w-sm bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-0.5">
                                {selectedTask.doctype}
                            </p>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {selectedTask.title}
                            </p>
                            <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 truncate">
                                {selectedTask.docname}
                            </p>
                        </div>
                        <button
                            onClick={() => setSelectedTask(null)}
                            className="ml-3 p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors flex-shrink-0"
                            aria-label="Close panel"
                        >
                            <XIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Activity log */}
                    <div className="flex-1 overflow-y-auto p-5">
                        <ActivityLog
                            doctype={selectedTask.doctype}
                            docname={selectedTask.docname}
                            maxHeight="100%"
                        />
                    </div>

                    {/* Footer: View Full Details */}
                    <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                        <button
                            onClick={() => {
                                setSelectedTask(null);
                                navigate(`/pending-tasks/${encodeURIComponent(selectedTask.doctype)}/${selectedTask.docname}`);
                            }}
                            className="w-full py-2.5 px-4 bg-[#D97757] text-white text-sm font-bold rounded-lg hover:bg-[#c66a4e] transition-colors"
                        >
                            View Full Details →
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default PendingTask;
