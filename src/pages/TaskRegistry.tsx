
import React, { useState, useEffect } from 'react';
import { FaExclamationCircle, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFrappeAuth, useFrappeGetCall, useFrappeGetDocList } from 'frappe-react-sdk';
import { useUserRoles } from '../components/UserRole';
import { GlobalLoader } from '@/components/ui/global-loader';
import { ModuleFilterSelect } from '@/components/ModuleFilterSelect';
import { ActivityLog } from '@/components/ActivityLog';
import { XIcon, ActivityIcon } from 'lucide-react';
import { resolveProjectCategory, projectTypeTabLabel, withOverheadCategory, type ProjectCategory } from '@/utils/projectTypeMapping';

/** The Project Registration fields this page reads, fetched once for every PR. */
interface PRRow {
    name: string;
    project_no?: string;
    project_type?: string;
    project_title?: string;
    funding_agen?: string;
}
// import { debounce } from 'lodash';

// Row shape returned by get_categorized_task_registry, already bucketed into
// research/consultancy/others and resolved server-side via DOCTYPE_PR_LINKS
// (see rndopsapp/project_type_links.py, the backend's single source of truth).
// mod_vis is always null here — get_task_registry has no such concept.
interface CategorizedTaskRow {
    status: string;
    module: string;
    title: string;
    project_no: string;
    date: string;
    owner: string;
    doctype: string;
    name: string;
    mod_vis: number | null;
    deposit_slip?: string;
}

interface CategorizedTaskRegistryResponse {
    message: {
        research: CategorizedTaskRow[];
        consultancy: CategorizedTaskRow[];
        others: CategorizedTaskRow[];
        // Not returned today — overhead tasks arrive in one of the three buckets above and
        // are moved by project number (see withOverheadCategory). Read if the backend ever
        // starts bucketing them itself.
        overhead?: CategorizedTaskRow[];
    };
}

// Interface for the flattened task structure
interface FlattenedTask {
    id: string;
    title: string;
    status: string;
    creation: string;
    // Only populated for the client-merged Recruitment Adhoc Contractual rows below —
    // get_categorized_task_registry doesn't return `modified`, so the Modified column
    // falls back to "-" for every other row.
    modified?: string;
    owner: string;
    doctype: string;
    project_type: ProjectCategory;
    projectNo: string;
    depositSlip?: string;
}

type ProjectTypeTab = ProjectCategory;

const PROJECT_TYPE_TABS: ProjectTypeTab[] = ['Research', 'Consultancy', 'Others', 'Overhead'];
const HIDDEN_OTHERS_DOCTYPES = new Set(['Kafka Commit Staging', 'Project Number Generation']);

// Frappe-styled components
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
    children: React.ReactNode;
    onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
            variant === 'primary' && "bg-[#D97757] text-white hover:bg-[#D97757] shadow-md hover:shadow-lg border border-[#D97757]",
            variant === 'ghost' && "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 hover:text-zinc-900 dark:text-zinc-100",
            variant === 'outline' && "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 rounded-lg dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800",
            variant === 'action' && "bg-[#D97757] text-white font-bold hover:bg-[#D97757] shadow-md hover:shadow-lg border-2 border-[#D97757]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

const TaskRegistry: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentPage, setCurrentPage] = useState(1);
    // Only used to name the Overhead tab after the fund this user actually holds —
    // DPF for a department head, PDF for a PI. Nothing else on this page is role-aware.
    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    // Backed by the URL (like PendingTask.tsx) so the selected tab/module/search survive a
    // back-navigation from an opened task's detail page instead of resetting to Research/all.
    const selectedModule = searchParams.get('module') ?? '';
    const selectedProjectType = (searchParams.get('type') as ProjectTypeTab) ?? 'Research';
    const searchQuery = searchParams.get('q') ?? '';
    // Seeded from the URL too, so a restored `q` filters immediately instead of only after
    // the 500ms debounce below fires once on mount.
    const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') ?? '');
    const itemsPerPage = 10;

    // Activity peek panel state
    const [selectedTask, setSelectedTask] = useState<{ doctype: string; docname: string; title: string } | null>(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1); // Reset page on search
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch processed/forwarded documents, already categorized into research/consultancy/others
    const { data, isLoading, error } = useFrappeGetCall<CategorizedTaskRegistryResponse>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_categorized_task_registry",
        { debug: 1 }
    );

    // Categorizes the client-merged Recruitment Adhoc Contractual rows below (every other
    // doctype's project_type comes pre-resolved from get_categorized_task_registry), and
    // supplies the project title and funding agency shown for every row.
    const { data: allProjectRegistrations } = useFrappeGetDocList("Project Registration", {
        fields: ["name", "project_no", "project_type", "project_title", "funding_agen"],
        limit: 0,
    });

    // Funding agency id -> display name, same bulk-map pattern PendingTask uses.
    // NOTE the doctype is `fundingagency_` (trailing underscore) — there is no
    // "Funding Agency" doctype, and querying that name silently returns nothing.
    const { data: allFundingAgencies } = useFrappeGetDocList("fundingagency_", {
        fields: ["name", "funding_agency_name"],
        limit: 0,
    } as any);
    const fundingAgencyNameMap = React.useMemo(() => {
        const map = new Map<string, string>();
        (allFundingAgencies ?? []).forEach((agency: { name: string; funding_agency_name?: string }) => {
            if (agency.name && agency.funding_agency_name) map.set(agency.name, agency.funding_agency_name);
        });
        return map;
    }, [allFundingAgencies]);

    // prByName / prByNo: the whole PR row, keyed both ways, so a task can yield its project's
    // title AND funding agency whichever form of project reference its row carries.
    const { prNameToType, prNoToType, prByName, prByNo } = React.useMemo(() => {
        const prNameToType = new Map<string, string>();
        const prNoToType = new Map<string, string>();
        const prByName = new Map<string, PRRow>();
        const prByNo = new Map<string, PRRow>();
        if (allProjectRegistrations) {
            allProjectRegistrations.forEach((p: PRRow) => {
                const raw = p.project_type || '';
                if (p.name) prNameToType.set(p.name, raw);
                if (p.project_no) prNoToType.set(p.project_no, raw);
                if (p.name) prByName.set(p.name, p);
                if (p.project_no) prByNo.set(p.project_no, p);
            });
        }
        return { prNameToType, prNoToType, prByName, prByNo };
    }, [allProjectRegistrations]);

    /**
     * The Project Registration row behind a task. A Project Registration task *is* the row
     * (its id is the PR name); every other doctype points at it through the `project_no`
     * the server already resolved onto the row — a project_no for most, a PR docname for a
     * few, so both maps are tried. Overhead projects are hidden from non-owners, so this
     * can legitimately miss; callers fall back to the document's own title / "-".
     */
    const prRowForTask = React.useCallback((task: { id: string; doctype: string; projectNo: string }): PRRow | undefined => {
        if (task.doctype === "Project Registration") return prByName.get(task.id);
        if (!task.projectNo) return undefined;
        return prByNo.get(task.projectNo) ?? prByName.get(task.projectNo);
    }, [prByName, prByNo]);

    // Supplemental fetch: Recruitment Adhoc Contractual is not returned by the
    // task-registry endpoint, so fetch them directly and merge below.
    const { data: recData } = useFrappeGetDocList<{
        name: string;
        upfa_project_title?: string;
        upfa_project_code?: string;
        workflow_state?: string;
        creation: string;
        modified: string;
        owner: string;
    }>("Recruitment Adhoc Contractual", {
        fields: ["name", "upfa_project_title", "upfa_project_code", "workflow_state", "creation", "modified", "owner"],
        limit: 500,
        orderBy: { field: "modified", order: "desc" },
    });

    // import { debounce } from 'lodash'; // Removed unused import

    // ...

    // Transform API data into flattened tasks
    const allTasks: FlattenedTask[] = React.useMemo(() => {
        const existingIds = new Set<string>();
        const tasks: FlattenedTask[] = [];

        if (data?.message) {
            const buckets: [ProjectCategory, CategorizedTaskRow[]][] = [
                ['Research', data.message.research ?? []],
                ['Consultancy', data.message.consultancy ?? []],
                ['Others', data.message.others ?? []],
                ['Overhead', data.message.overhead ?? []],
            ];
            buckets.forEach(([bucket_type, rows]) => rows.forEach((record) => {
                existingIds.add(record.name);
                // Overhead funds (PDF/DPF/…) announce themselves in the project number, so the
                // task is moved into the Overhead tab whichever bucket the backend put it in.
                const project_type = withOverheadCategory(bucket_type, record.project_no);
                tasks.push({
                    id: record.name,
                    title: record.title,
                    status: record.status,
                    creation: record.date,
                    owner: record.owner,
                    doctype: record.doctype,
                    project_type,
                    projectNo: record.project_no || "",
                    depositSlip: record.deposit_slip,
                });
            }));
        }

        // Merge Recruitment Adhoc Contractual records not already in the registry response
        if (recData) {
            recData.forEach((rec) => {
                if (!existingIds.has(rec.name)) {
                    tasks.push({
                        id: rec.name,
                        title: rec.upfa_project_title || rec.name,
                        status: rec.workflow_state || '',
                        creation: rec.creation,
                        modified: rec.modified,
                        owner: rec.owner,
                        doctype: 'Recruitment Adhoc Contractual',
                        project_type: withOverheadCategory(
                            resolveProjectCategory(
                                rec as unknown as Record<string, unknown>,
                                'Recruitment Adhoc Contractual',
                                prNameToType,
                                prNoToType,
                            ),
                            rec.upfa_project_code,
                        ),
                        projectNo: rec.upfa_project_code || "",
                    });
                }
            });
        }

        return tasks;
    }, [data, recData, prNameToType, prNoToType]);

    const visibleTasks = React.useMemo(() =>
        allTasks.filter(task => !(task.project_type === 'Others' && HIDDEN_OTHERS_DOCTYPES.has(task.doctype))),
        [allTasks]);

    const tabCounts = React.useMemo(() => ({
        Research: visibleTasks.filter(t => t.project_type === 'Research').length,
        Consultancy: visibleTasks.filter(t => t.project_type === 'Consultancy').length,
        Others: visibleTasks.filter(t => t.project_type === 'Others').length,
        Overhead: visibleTasks.filter(t => t.project_type === 'Overhead').length,
    }), [visibleTasks]);

    const moduleNames = React.useMemo(() => {
        const baseTasks = visibleTasks.filter(t => t.project_type === selectedProjectType);
        return Array.from(new Set(baseTasks.map(task => task.doctype))).sort();
    }, [visibleTasks, selectedProjectType]);

    const moduleCounts = React.useMemo(() => {
        const baseTasks = visibleTasks.filter(t => t.project_type === selectedProjectType);
        const counts: Record<string, number> = {};
        baseTasks.forEach(task => { counts[task.doctype] = (counts[task.doctype] ?? 0) + 1; });
        return counts;
    }, [visibleTasks, selectedProjectType]);

    // Client-side filtering
    const filteredTasks = React.useMemo(() => {
        let tasks = visibleTasks.filter(t => t.project_type === selectedProjectType);

        if (debouncedSearch) {
            const lowerSearch = debouncedSearch.toLowerCase();
            tasks = tasks.filter(task =>
                task.title.toLowerCase().includes(lowerSearch) ||
                task.id.toLowerCase().includes(lowerSearch) ||
                task.owner.toLowerCase().includes(lowerSearch)
            );
        }

        if (selectedModule) {
            tasks = tasks.filter(task => task.doctype === selectedModule);
        }

        return tasks;
    }, [visibleTasks, selectedProjectType, debouncedSearch, selectedModule]);

    // Client-side pagination
    const paginatedTasks = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTasks.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTasks, currentPage, itemsPerPage]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const handleModuleChange = (module: string) => {
        setSearchParams(prev => { module ? prev.set('module', module) : prev.delete('module'); return prev; });
        setCurrentPage(1);
    };

    const handleProjectTypeChange = (tab: ProjectTypeTab) => {
        setSearchParams(prev => { prev.set('type', tab); prev.delete('module'); return prev; });
        setCurrentPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchParams(prev => { e.target.value ? prev.set('q', e.target.value) : prev.delete('q'); return prev; });
        setCurrentPage(1);
    };

    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase();
        let style = "bg-blue-100 text-blue-800 border-blue-300";
        if (["pending", "under review", "approval pending"].some(t => s?.includes(t))) {
            style = "bg-amber-100 text-amber-800 border-amber-300";
        } else if (s?.includes("approved")) {
            style = "bg-emerald-100 text-emerald-800 border-emerald-300";
        } else if (s?.includes("draft")) {
            style = "bg-slate-100 text-slate-800 border-slate-300";
        } else if (s?.includes("rejected")) {
            style = "bg-red-100 text-red-800 border-red-300";
        } else if (s?.includes("forwarded") || s?.includes("processed")) {
            style = "bg-purple-100 text-purple-800 border-purple-300";
        }
        return cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", style);
    };

    const getPageNumbers = () => {
        const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 1;
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
                <FrappeCard className="p-8 text-center">
                    <FaExclamationCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Error Loading Task Registry</h2>
                    <p className="text-zinc-900 dark:text-zinc-100">{error.message}</p>
                </FrappeCard>
            </div>
        );
    }

    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage) || 0;
    const totalCount = filteredTasks.length;
    const currentCount = paginatedTasks.length;
    const indexOfFirstTask = (currentPage - 1) * itemsPerPage;

    return (
        <>
            <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
                <GlobalLoader isLoading={isLoading} />

                <main className="flex-1 px-6 md:px-8 pt-7 pb-10 w-full overflow-hidden">
                    {/* Header */}
                    <FrappeCard className="mb-5 overflow-hidden p-0">
                        <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                        <div className="flex items-start gap-3 px-5 py-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#D97757] hover:border-[#D97757]/30 hover:bg-[#D97757]/10 transition-colors"
                                aria-label="Go back"
                            >
                                <FaArrowLeft className="h-3.5 w-3.5" />
                            </button>
                            <div className="min-w-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">Processed Documents</span>
                                <h1 className="mt-1 text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">Task Registry</h1>
                                <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">View processed and forwarded documents.</p>
                            </div>
                        </div>
                    </FrappeCard>

                    {/* Info banner */}
                    <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800/50 dark:bg-amber-950/30">
                        <div className="mt-0.5 flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/40">
                            <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-[13px] font-bold text-amber-800 dark:text-amber-300">This page is for record-keeping only — no actions can be performed here.</p>
                            <p className="mt-0.5 text-[12px] font-medium leading-5 text-amber-700 dark:text-amber-400">Task Registry shows all forms processed by the concerned staff. To perform actions, approve, or forward any form, go to <span className="font-bold">Pending Tasks</span>.</p>
                        </div>
                    </div>

                    {/* Project Type Filter */}
                    <div className="mb-4 border-t-2 border-[#4A6CF7]/35 pt-4 dark:border-[#818CF8]/35">
                        <div className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#71717A] dark:text-[#A1A1AA]">
                            Project Type
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto">
                            {PROJECT_TYPE_TABS.map((tab) => {
                                const active = selectedProjectType === tab;
                                const tabColors: Record<ProjectTypeTab, string> = {
                                    Research: active ? 'bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A] shadow-sm shadow-[#4A6CF7]/10 dark:bg-[#4A6CF7]/18 dark:border-[#818CF8] dark:text-[#C7D2FE]' : 'border-[#C7D2FE] bg-[#EEF2FF]/55 text-[#1E3A8A] hover:bg-[#EEF2FF] dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/10 dark:text-[#C7D2FE]',
                                    Consultancy: active ? 'bg-[#ECFDF5] border-[#10B981] text-[#065F46] shadow-sm shadow-[#10B981]/10 dark:bg-[#10B981]/15 dark:border-[#34D399] dark:text-[#A7F3D0]' : 'border-[#A7F3D0] bg-[#ECFDF5]/60 text-[#047857] hover:bg-[#ECFDF5] dark:border-[#10B981]/30 dark:bg-[#10B981]/10 dark:text-[#A7F3D0]',
                                    Others: active ? 'bg-[#F4F4F5] border-[#71717A] text-[#3F3F46] shadow-sm dark:bg-[#3F3F46] dark:border-[#A1A1AA] dark:text-[#E4E4E7]' : 'border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8]',
                                    Overhead: active ? 'bg-[#FFF7ED] border-[#EA580C] text-[#9A3412] shadow-sm shadow-[#EA580C]/10 dark:bg-[#EA580C]/18 dark:border-[#FB923C] dark:text-[#FED7AA]' : 'border-[#FED7AA] bg-[#FFF7ED]/60 text-[#C2410C] hover:bg-[#FFF7ED] dark:border-[#EA580C]/30 dark:bg-[#EA580C]/10 dark:text-[#FED7AA]',
                                };
                                const badgeColors: Record<ProjectTypeTab, string> = {
                                    Research: active ? 'bg-[#4A6CF7] text-white' : 'bg-white/80 text-[#4A6CF7] dark:bg-[#18181B]/50',
                                    Consultancy: active ? 'bg-[#10B981] text-white' : 'bg-white/80 text-[#059669] dark:bg-[#18181B]/50',
                                    Others: active ? 'bg-[#71717A] text-white' : 'bg-[#F4F4F5] text-[#71717A] dark:bg-[#18181B]/50',
                                    Overhead: active ? 'bg-[#EA580C] text-white' : 'bg-white/80 text-[#C2410C] dark:bg-[#18181B]/50',
                                };
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => handleProjectTypeChange(tab)}
                                        className={cn(
                                            "flex h-9 flex-shrink-0 items-center gap-2 rounded-lg border px-3 text-[11px] font-extrabold uppercase tracking-wide transition-all duration-150",
                                            tabColors[tab],
                                        )}
                                    >
                                        {projectTypeTabLabel(tab, roles)}
                                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold leading-none", badgeColors[tab])}>
                                            {tabCounts[tab]}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Filter & Search Section */}
                    <div className="mb-4">
                        <FrappeCard className="p-3">
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                                <div className="flex flex-1 items-center gap-3 w-full flex-wrap">
                                    {/* Search Input */}
                                    <div className="relative w-full md:w-64">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaSearch className="text-zinc-400 dark:text-zinc-500" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search documents..."
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            className="h-9 w-full pl-10 pr-4 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#4A6CF7] focus:ring-[3px] focus:ring-[#4A6CF7]/12 transition-colors"
                                        />
                                    </div>

                                    {/* Module Filter */}
                                    <div className="flex items-center gap-2">
                                        <label className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-sm whitespace-nowrap hidden md:block">
                                            Filter:
                                        </label>
                                        <ModuleFilterSelect
                                            value={selectedModule}
                                            onChange={handleModuleChange}
                                            modules={moduleNames}
                                            counts={moduleCounts}
                                            totalCount={visibleTasks.filter(t => t.project_type === selectedProjectType).length}
                                            allValue=""
                                        />
                                        {selectedModule && (
                                            <FrappeButton
                                                onClick={() => handleModuleChange('')}
                                                className="text-red-600 hover:bg-red-50 border border-red-200"
                                            >
                                                Clear
                                            </FrappeButton>
                                        )}
                                    </div>
                                </div>

                                <div className="text-sm text-zinc-900 dark:text-zinc-100 font-bold whitespace-nowrap">
                                    Total: {totalCount} documents
                                </div>
                            </div>
                        </FrappeCard>
                    </div>

                    {/* Table */}
                    <FrappeCard className="overflow-hidden p-3">
                        <div className="overflow-x-auto rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                            <table className="w-full">
                                <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Status</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Module</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Title/Document ID</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Funding Agency</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Document ID</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Created</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Modified</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">Owner</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                                    {paginatedTasks.length > 0 ? (
                                        paginatedTasks.map((task) => (
                                            <tr
                                                key={task.id}
                                                onClick={() => {
                                                    if (task.doctype === "Fund Received") {
                                                        navigate(`/fund-received/${task.id}`);
                                                    } else if (task.doctype === "Reimbursement") {
                                                        navigate(`/reimbursement/${task.id}`);
                                                    } else if (task.doctype === "Disbursal of Consultancy") {
                                                        navigate(`/disbursal-of-consultancy/${task.id}`);
                                                    } else if (task.doctype === "Travel") {
                                                        navigate(`/travel/${task.id}`);
                                                    } else if (task.doctype === "Miscellaneous Commit") {
                                                        navigate(`/miscellaneous-commit/${task.id}`);
                                                    } else if (task.doctype === "Loan Request") {
                                                        navigate(`/loan-request/${task.id}`);
                                                    } else if (task.doctype === "Loan Settlement") {
                                                        navigate(`/loan-settlement/${task.id}`);
                                                    } else if (task.doctype === "Project Registration" && task.status?.toLowerCase().includes("approved")) {
                                                        navigate(`/project-details-overview/${task.id}`, { state: { fromTaskRegistry: true } });
                                                    } else if (task.doctype === "Miscellaneous Commit") {
                                                        navigate(`/miscellaneous-commit/${task.id}`);
                                                    } else if (task.doctype === "Loan Request") {
                                                        navigate(`/loan-request/${task.id}`);
                                                    } else if (task.doctype === "Loan Settlement") {
                                                        navigate(`/loan-settlement/${task.id}`);
                                                    } else if (task.doctype === "Project Staff Extension") {
                                                        navigate(`/project-staff-extension?edit=${encodeURIComponent(task.id)}`);
                                                    } else if (task.doctype === "Project Staff Resignation") {
                                                        navigate(`/project-staff-resignation?edit=${encodeURIComponent(task.id)}`);
                                                    } else if (task.doctype === "Project Staff Details") {
                                                        navigate(`/project-staff-joining?docname=${encodeURIComponent(task.id)}`);
                                                    } else {
                                                        navigate(`/task-registry/${task.doctype}/${task.id}`);
                                                    }
                                                }}
                                                className="hover:bg-zinc-50 dark:bg-zinc-800/50 cursor-pointer transition-colors"
                                            >
                                                <td className="p-3">
                                                    <span className={getStatusBadge(task.status)}>
                                                        {task.status}
                                                    </span>
                                                </td>
                                                <td className="p-3 font-bold text-zinc-900 dark:text-zinc-100">
                                                    {task.doctype}
                                                </td>
                                                <td className="p-3 font-medium text-zinc-900 dark:text-zinc-100">
                                                    <button
                                                        className="text-left hover:text-[#D97757] transition-colors flex items-center gap-1.5 group"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTask({ doctype: task.doctype, docname: task.id, title: task.title });
                                                        }}
                                                        title="Click to preview activity log"
                                                    >
                                                        {(() => {
                                                            // Prefer the project's own title — the registry API's
                                                            // `title` is often the document id, which reads as noise.
                                                            const display = prRowForTask(task)?.project_title || task.title;
                                                            return display.length > 30 ? `${display.substring(0, 30)}...` : display;
                                                        })()}
                                                        <ActivityIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[#D97757] flex-shrink-0 transition-opacity" />
                                                    </button>
                                                </td>
                                                <td className="p-3 align-middle text-zinc-600 dark:text-zinc-400">
                                                    {(() => {
                                                        // Resolved through the task's own project, so this works for
                                                        // every application form, not just Project Registration.
                                                        const fundingAgen = prRowForTask(task)?.funding_agen;
                                                        if (!fundingAgen) return "-";
                                                        return fundingAgencyNameMap.get(fundingAgen) || fundingAgen;
                                                    })()}
                                                </td>
                                                <td className="p-3 font-mono text-zinc-900 dark:text-zinc-100">
                                                    {task.doctype === "Fund Received" ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span>{task.projectNo || (task.id.length > 25 ? `${task.id.substring(0, 25)}...` : task.id)}</span>
                                                            {task.depositSlip && (
                                                                <span className="text-[10px] text-[#D97757] font-semibold">
                                                                    Deposit: {task.depositSlip}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        task.id.length > 25 ? `${task.id.substring(0, 25)}...` : task.id
                                                    )}
                                                </td>
                                                <td className="p-3 font-mono text-zinc-900 dark:text-zinc-100">
                                                    {task.creation ? new Date(task.creation).toLocaleDateString("en-IN") : "-"}
                                                </td>
                                                <td className="p-3 font-mono text-zinc-900 dark:text-zinc-100">
                                                    {task.modified ? new Date(task.modified).toLocaleDateString("en-IN") : "-"}
                                                </td>
                                                <td className="p-3 text-zinc-900 dark:text-zinc-100">
                                                    {task.owner.length > 20 ? `${task.owner.substring(0, 20)}...` : task.owner}
                                                </td>
                                                <td className="p-3">
                                                    <FrappeButton
                                                        variant="action"
                                                        onClick={(e) => {
                                                            e?.stopPropagation();
                                                            if (task.doctype === "Fund Received") {
                                                                navigate(`/fund-received/${task.id}`);
                                                            } else if (task.doctype === "Reimbursement") {
                                                                navigate(`/reimbursement/${task.id}`);
                                                            } else if (task.doctype === "Disbursal of Consultancy") {
                                                                navigate(`/disbursal-of-consultancy/${task.id}`);
                                                            } else if (task.doctype === "Travel") {
                                                                navigate(`/travel/${task.id}`);
                                                            } else if (task.doctype === "Miscellaneous Commit") {
                                                                navigate(`/miscellaneous-commit/${task.id}`);
                                                            } else if (task.doctype === "Loan Request") {
                                                                navigate(`/loan-request/${task.id}`);
                                                            } else if (task.doctype === "Loan Settlement") {
                                                                navigate(`/loan-settlement/${task.id}`);
                                                            } else if (task.doctype === "Project Registration" && task.status?.toLowerCase().includes("approved")) {
                                                                navigate(`/project-details-overview/${task.id}`, { state: { fromTaskRegistry: true } });
                                                            } else if (task.doctype === "Miscellaneous Commit") {
                                                                navigate(`/miscellaneous-commit/${task.id}`);
                                                            } else if (task.doctype === "Loan Request") {
                                                                navigate(`/loan-request/${task.id}`);
                                                            } else if (task.doctype === "Loan Settlement") {
                                                                navigate(`/loan-settlement/${task.id}`);
                                                            } else if (task.doctype === "Project Staff Extension") {
                                                                navigate(`/project-staff-extension?edit=${encodeURIComponent(task.id)}`);
                                                            } else if (task.doctype === "Project Staff Resignation") {
                                                                navigate(`/project-staff-resignation?edit=${encodeURIComponent(task.id)}`);
                                                            } else if (task.doctype === "Project Staff Details") {
                                                                navigate(`/project-staff-joining?docname=${encodeURIComponent(task.id)}`);
                                                            } else {
                                                                navigate(`/task-registry/${task.doctype}/${task.id}`);
                                                            }
                                                        }}
                                                        className="text-[11px] px-3 py-1.5"
                                                    >
                                                        View
                                                    </FrappeButton>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-zinc-900 dark:text-zinc-100 font-bold">
                                                {isLoading ? "Loading documents..." : "No documents found matching your criteria."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {allTasks.length > 0 && (
                            <div className="p-4 border-t border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 flex justify-between items-center">
                                <div>
                                    <div className="text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                        Showing {indexOfFirstTask + 1} to {indexOfFirstTask + currentCount} of {totalCount} entries
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <FrappeButton
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        variant="outline"
                                    >
                                        Previous
                                    </FrappeButton>
                                    {getPageNumbers().map((page, index) => (
                                        <FrappeButton
                                            key={index}
                                            onClick={() => typeof page === 'number' && handlePageChange(page)}
                                            disabled={typeof page !== 'number'}
                                            variant={page === currentPage ? "primary" : "outline"}
                                            className={cn(typeof page !== 'number' && "cursor-default")}
                                        >
                                            {page}
                                        </FrappeButton>
                                    ))}
                                    <FrappeButton
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        variant="outline"
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

                        {/* Footer action */}
                        <div className="px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                            <button
                                onClick={() => {
                                    setSelectedTask(null);
                                    // Navigate based on same logic as existing rows
                                    const t = selectedTask;
                                    if (t.doctype === 'Fund Received') navigate(`/fund-received/${t.docname}`);
                                    else if (t.doctype === 'Reimbursement') navigate(`/reimbursement/${t.docname}`);
                                    else if (t.doctype === 'Disbursal of Consultancy') navigate(`/disbursal-of-consultancy/${t.docname}`);
                                    else if (t.doctype === 'Travel') navigate(`/travel/${t.docname}`);
                                    else if (t.doctype === 'Miscellaneous Commit') navigate(`/miscellaneous-commit/${t.docname}`);
                                    else if (t.doctype === 'Loan Request') navigate(`/loan-request/${t.docname}`);
                                    else if (t.doctype === 'Loan Settlement') navigate(`/loan-settlement/${t.docname}`);
                                    else navigate(`/task-registry/${t.doctype}/${t.docname}`);
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

export default TaskRegistry;
