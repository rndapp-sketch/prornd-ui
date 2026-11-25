
import React, { useState, useEffect } from 'react';
import { FaExclamationCircle, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import '@/pages/dashboards/projectStaffDashboard.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFrappeAuth, useFrappeGetCall, useFrappeGetDocList } from 'frappe-react-sdk';
import { useUserRoles } from '../components/UserRole';
import { GlobalLoader } from '@/components/ui/global-loader';
import { ModuleFilterSelect } from '@/components/ModuleFilterSelect';
import { ActivityLog } from '@/components/ActivityLog';
import { XIcon, ActivityIcon } from 'lucide-react';
import { ledgerService } from '@/services/ledgerService';
import { projectTypeTabLabel, withOverheadCategory, type ProjectCategory } from '@/utils/projectTypeMapping';

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
    // get_categorized_task_registry doesn't return `modified`, so the Modified column
    // falls back to "-".
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
    <div className={cn("psd-card !rounded-xl", className)}>
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
            "psd-focus inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-lg font-semibold text-[12px] transition-all duration-150",
            variant === 'primary' && "bg-[var(--psd-primary)] text-white hover:bg-[var(--psd-primary-hover)] shadow-sm border border-[var(--psd-primary)]",
            variant === 'ghost' && "bg-transparent text-[var(--psd-body)] hover:bg-[var(--psd-primary-light)] hover:text-[var(--psd-primary)]",
            variant === 'outline' && "bg-[var(--psd-surface)] border border-[var(--psd-border)] text-[var(--psd-heading)] hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]",
            variant === 'action' && "bg-[var(--psd-primary)] text-white font-bold hover:bg-[var(--psd-primary-hover)] shadow-sm active:scale-[0.98]",
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
    // R&D Staff issue the office order for approved extensions (Ext Order button); printing
    // moves the extension to Completed, and it stays listed here for reprints. The backend
    // re-checks the role.
    const canIssueExtOrder = roles.includes('staff, RnD') || roles.includes('System Manager');
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

    // Supplies the project title and funding agency shown for every row (project_type
    // comes pre-resolved from get_categorized_task_registry).
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
    const { prByName, prByNo } = React.useMemo(() => {
        const prByName = new Map<string, PRRow>();
        const prByNo = new Map<string, PRRow>();
        if (allProjectRegistrations) {
            allProjectRegistrations.forEach((p: PRRow) => {
                if (p.name) prByName.set(p.name, p);
                if (p.project_no) prByNo.set(p.project_no, p);
            });
        }
        return { prByName, prByNo };
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

    // App IDs whose commit already has a payment raised but is still open (the "Payment Pending"
    // rows in Payments). An approved task in this set has not cleared Accounts yet, so it reads "Pending Acc. Verification".
    const [unpaidCommitAppIds, setUnpaidCommitAppIds] = useState<Set<string>>(new Set());
    useEffect(() => {
        let cancelled = false;
        Promise.all([
            Promise.all(['COMMITTED', 'PARTIALLY_PAID', 'OVERPAYMENT'].map(s => ledgerService.getCommitsByStatus(s))),
            ledgerService.getAllPayments(),
        ])
            .then(([results, payments]) => {
                if (cancelled) return;
                const paidCommitNos = new Set<number>(
                    (Array.isArray(payments) ? payments : [])
                        .map((p: any) => p.transactionCommitNumber)
                        .filter((n: unknown): n is number => n != null),
                );
                const ids = new Set<string>();
                results.flat().forEach(c => {
                    if (c?.frapAppId && c.transactionCommitNumber != null && paidCommitNos.has(c.transactionCommitNumber)) {
                        ids.add(String(c.frapAppId));
                    }
                });
                setUnpaidCommitAppIds(ids);
            })
            .catch(() => { /* ledger unavailable: keep the workflow status as is */ });
        return () => { cancelled = true; };
    }, []);

    // ...

    // Transform API data into flattened tasks
    const allTasks: FlattenedTask[] = React.useMemo(() => {
        const tasks: FlattenedTask[] = [];

        if (data?.message) {
            const buckets: [ProjectCategory, CategorizedTaskRow[]][] = [
                ['Research', data.message.research ?? []],
                ['Consultancy', data.message.consultancy ?? []],
                ['Others', data.message.others ?? []],
                ['Overhead', data.message.overhead ?? []],
            ];
            buckets.forEach(([bucket_type, rows]) => rows.forEach((record) => {
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

        return tasks;
    }, [data]);

    const isPendingAccVerification = (task: FlattenedTask) =>
        task.doctype === 'Disbursal of Consultancy'
        && !!task.status?.toLowerCase().includes('approved')
        && unpaidCommitAppIds.has(task.id);

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
        let style = "bg-[var(--psd-info-bg)] text-[#2F5BC4] border-[var(--psd-info)]/35 dark:text-blue-300";
        if (["pending", "under review", "approval pending"].some(t => s?.includes(t))) {
            style = "bg-[var(--psd-review-bg)] text-[#B26A00] border-[var(--psd-review)]/40 dark:text-amber-300";
        } else if (s?.includes("approved")) {
            style = "bg-[var(--psd-approved-bg)] text-[#0A8A60] border-[var(--psd-approved)]/40 dark:text-emerald-300";
        } else if (s?.includes("draft")) {
            style = "bg-[var(--psd-bg)] text-[var(--psd-body)] border-[var(--psd-border)]";
        } else if (s?.includes("rejected")) {
            style = "bg-[var(--psd-returned-bg)] text-[#C02B3D] border-[var(--psd-returned)]/40 dark:text-rose-300";
        } else if (s?.includes("forwarded") || s?.includes("processed")) {
            style = "bg-[var(--psd-primary-light)] text-[var(--psd-primary)] border-[var(--psd-primary)]/35";
        }
        return cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10.5px] font-bold", style);
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
            <div className="psd-root flex h-screen items-center justify-center">
                <FrappeCard className="p-8 text-center">
                    <FaExclamationCircle className="h-10 w-10 text-[var(--psd-returned)] mx-auto mb-3" />
                    <h2 className="text-[17px] font-bold text-[var(--psd-heading)] mb-2">Error Loading Task Registry</h2>
                    <p className="text-[var(--psd-body)]">{error.message}</p>
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
            <div className="psd-root min-h-screen font-sans">
                <GlobalLoader isLoading={isLoading} />

                <main className="flex-1 px-0 pt-0 pb-4 w-full space-y-2.5">
                    {/* Header */}
                    <header className="psd-hero relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2">
                        <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                            <button
                                onClick={() => navigate(-1)}
                                className="psd-focus grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]"
                                aria-label="Go back"
                            >
                                <FaArrowLeft className="h-3.5 w-3.5" />
                            </button>
                            <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                                <ActivityIcon className="size-4" strokeWidth={1.8} />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">Records</div>
                                <h1 className="mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">Task Registry</h1>
                            </div>
                        </div>
                        <p className="relative z-10 hidden text-xs text-[var(--psd-body)] md:block">View processed and forwarded documents.</p>
                    </header>

                    {isLoading && (
                        <div role="status" aria-live="polite" className="space-y-1">
                            <div className="psd-loadbar" />
                            <p className="text-[11.5px] font-semibold text-[var(--psd-body)]">Fetching documents…</p>
                        </div>
                    )}

                    {/* Info banner */}
                    <div className="psd-card flex items-center gap-2.5 !rounded-xl border-l-[3px] !border-l-[var(--psd-review)] px-3 py-1.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--psd-review-bg)] text-[var(--psd-review)]">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                            </svg>
                        </div>
                        <p className="text-[12px] leading-snug text-[var(--psd-body)]">
                            <b className="font-bold text-[var(--psd-heading)]">This page is for record-keeping only — no actions can be performed here.</b>{" "}
                            Task Registry shows all forms processed by the concerned staff. To perform actions, approve, or forward any form, go to <b className="font-bold">Pending Tasks</b>.
                        </p>
                    </div>

                    {/* Project Type Filter */}
                    <div className="psd-card !rounded-xl px-3 py-2">
                        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--psd-body)]">
                            Project Type
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto">
                            {PROJECT_TYPE_TABS.map((tab) => {
                                const active = selectedProjectType === tab;
                                const tabColors: Record<ProjectTypeTab, string> = {
                                    Research: active ? 'bg-[#6842D9] border-[#6842D9] text-white shadow-sm' : 'border-[#6842D9]/35 bg-[#6842D9]/8 text-[#5632C5] hover:bg-[#6842D9]/15 dark:text-[#C9B8FA]',
                                    Consultancy: active ? 'bg-[#0DA875] border-[#0DA875] text-white shadow-sm' : 'border-[#0DA875]/35 bg-[#0DA875]/8 text-[#0A8A60] hover:bg-[#0DA875]/15 dark:text-[#7BE0BC]',
                                    Others: active ? 'bg-[#64748B] border-[#64748B] text-white shadow-sm' : 'border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] hover:bg-[var(--psd-bg)]',
                                    Overhead: active ? 'bg-[#F47721] border-[#F47721] text-white shadow-sm' : 'border-[#F47721]/35 bg-[#F47721]/8 text-[#C2570C] hover:bg-[#F47721]/15 dark:text-[#FDBA8C]',
                                };
                                const badgeColors: Record<ProjectTypeTab, string> = {
                                    Research: active ? 'bg-white/25 text-white' : 'bg-white/80 text-[#6842D9] dark:bg-[#18181B]/50',
                                    Consultancy: active ? 'bg-white/25 text-white' : 'bg-white/80 text-[#0A8A60] dark:bg-[#18181B]/50',
                                    Others: active ? 'bg-white/25 text-white' : 'bg-[var(--psd-bg)] text-[var(--psd-body)]',
                                    Overhead: active ? 'bg-white/25 text-white' : 'bg-white/80 text-[#C2570C] dark:bg-[#18181B]/50',
                                };
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => handleProjectTypeChange(tab)}
                                        className={cn(
                                            "flex h-8 flex-shrink-0 items-center gap-2 rounded-full border px-3 text-[11px] font-bold uppercase tracking-wide transition-all duration-150",
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
                    <div>
                        <FrappeCard className="px-3 py-2">
                            <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
                                <div className="flex flex-1 items-center gap-3 w-full flex-wrap">
                                    {/* Search Input */}
                                    <div className="relative w-full md:w-64">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaSearch className="text-[var(--psd-muted)]" />
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Search documents..."
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            className="h-9 w-full rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] pl-10 pr-4 text-[13px] text-[var(--psd-heading)] placeholder:text-[var(--psd-muted)] transition-colors focus:border-[var(--psd-primary)] focus:outline-none focus:ring-[3px] focus:ring-[var(--psd-primary)]/15"
                                        />
                                    </div>

                                    {/* Module Filter */}
                                    <div className="flex items-center gap-2">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--psd-body)] whitespace-nowrap hidden md:block">
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
                                                className="!text-[var(--psd-returned)] hover:!bg-[var(--psd-returned-bg)] border border-[var(--psd-returned)]/40"
                                            >
                                                Clear
                                            </FrappeButton>
                                        )}
                                    </div>
                                </div>

                                <div className="whitespace-nowrap text-[12px] font-bold text-[var(--psd-heading)]">
                                    Total: {totalCount} documents
                                </div>
                            </div>
                        </FrappeCard>
                    </div>

                    {/* Table */}
                    <FrappeCard className="overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-[#DCE6CD] dark:bg-[#34402B]">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Status</th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Module</th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Title/Document ID</th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Funding Agency</th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Document ID</th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Created</th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Modified</th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider border-r border-[#9DAE85]/50 dark:border-[#5C6D4D]">Owner</th>
                                        <th className="px-3 py-2 text-left text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--psd-border)] bg-[var(--psd-surface)] text-xs">
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
                                                    } else if (task.doctype === "Acc Head to Head Fund Transfer") {
                                                        navigate(`/head-to-head-transfer/${task.id}`);
                                                    } else if (task.doctype === "Miscellaneous Commit") {
                                                        navigate(`/miscellaneous-commit/${task.id}`);
                                                    } else if (task.doctype === "Loan Request") {
                                                        navigate(`/loan-request/${task.id}`);
                                                    } else if (task.doctype === "UC Request") {
                                                        navigate(`/uc-request/${task.id}`);
                                                    } else if (task.doctype === "Loan Settlement") {
                                                        navigate(`/loan-settlement/${task.id}`);
                                                    } else if (task.doctype === "Project Registration" && task.status?.toLowerCase().includes("approved")) {
                                                        navigate(`/task-registry/project-details-overview/${task.id}`, { state: { fromTaskRegistry: true } });
                                                    } else if (task.doctype === "Miscellaneous Commit") {
                                                        navigate(`/miscellaneous-commit/${task.id}`);
                                                    } else if (task.doctype === "Loan Request") {
                                                        navigate(`/loan-request/${task.id}`);
                                                    } else if (task.doctype === "UC Request") {
                                                        navigate(`/uc-request/${task.id}`);
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
                                                className="cursor-pointer transition-colors hover:bg-[var(--psd-primary-light)]/40"
                                            >
                                                <td className="px-3 py-2">
                                                    <span className={getStatusBadge(task.status)}>
                                                        {task.status}
                                                    </span>
                                                    {isPendingAccVerification(task) && (
                                                        <div className="mt-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                                                            Pending Acc. Verification
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 font-bold text-[var(--psd-heading)]">
                                                    {task.doctype}
                                                </td>
                                                <td className="px-3 py-2 font-semibold text-[var(--psd-heading)]">
                                                    <button
                                                        className="text-left hover:text-[var(--psd-primary)] transition-colors flex items-center gap-1.5 group"
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
                                                        <ActivityIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-[var(--psd-primary)] flex-shrink-0 transition-opacity" />
                                                    </button>
                                                </td>
                                                <td className="px-3 py-2 align-middle text-[var(--psd-body)]">
                                                    {(() => {
                                                        // Resolved through the task's own project, so this works for
                                                        // every application form, not just Project Registration.
                                                        const fundingAgen = prRowForTask(task)?.funding_agen;
                                                        if (!fundingAgen) return "-";
                                                        return fundingAgencyNameMap.get(fundingAgen) || fundingAgen;
                                                    })()}
                                                </td>
                                                <td className="px-3 py-2 font-mono text-[var(--psd-heading)]">
                                                    {task.doctype === "Fund Received" ? (
                                                        <div className="flex flex-col gap-0.5">
                                                            <span>{task.projectNo || (task.id.length > 25 ? `${task.id.substring(0, 25)}...` : task.id)}</span>
                                                            {task.depositSlip && (
                                                                <span className="text-[10px] text-[var(--psd-accent)] font-semibold">
                                                                    Deposit: {task.depositSlip}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        task.id.length > 25 ? `${task.id.substring(0, 25)}...` : task.id
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 font-mono text-[var(--psd-heading)]">
                                                    {task.creation ? new Date(task.creation).toLocaleDateString("en-IN") : "-"}
                                                </td>
                                                <td className="px-3 py-2 font-mono text-[var(--psd-heading)]">
                                                    {task.modified ? new Date(task.modified).toLocaleDateString("en-IN") : "-"}
                                                </td>
                                                <td className="px-3 py-2 text-[var(--psd-body)]">
                                                    {task.owner.length > 20 ? `${task.owner.substring(0, 20)}...` : task.owner}
                                                </td>
                                                <td className="px-3 py-2">
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
                                                            } else if (task.doctype === "Acc Head to Head Fund Transfer") {
                                                                navigate(`/head-to-head-transfer/${task.id}`);
                                                            } else if (task.doctype === "Miscellaneous Commit") {
                                                                navigate(`/miscellaneous-commit/${task.id}`);
                                                            } else if (task.doctype === "Loan Request") {
                                                                navigate(`/loan-request/${task.id}`);
                                                            } else if (task.doctype === "UC Request") {
                                                                navigate(`/uc-request/${task.id}`);
                                                            } else if (task.doctype === "Loan Settlement") {
                                                                navigate(`/loan-settlement/${task.id}`);
                                                            } else if (task.doctype === "Project Registration" && task.status?.toLowerCase().includes("approved")) {
                                                                navigate(`/task-registry/project-details-overview/${task.id}`, { state: { fromTaskRegistry: true } });
                                                            } else if (task.doctype === "Miscellaneous Commit") {
                                                                navigate(`/miscellaneous-commit/${task.id}`);
                                                            } else if (task.doctype === "Loan Request") {
                                                                navigate(`/loan-request/${task.id}`);
                                                            } else if (task.doctype === "UC Request") {
                                                                navigate(`/uc-request/${task.id}`);
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
                                                        className="text-[11px] !px-3 !py-1"
                                                    >
                                                        View
                                                    </FrappeButton>
                                                    {canIssueExtOrder
                                                        && task.doctype === "Project Staff Extension"
                                                        && ["approved", "completed"].includes(task.status?.toLowerCase() ?? "") && (
                                                        <FrappeButton
                                                            variant="outline"
                                                            onClick={(e) => {
                                                                e?.stopPropagation();
                                                                navigate(`/project-staff-extension/order/${encodeURIComponent(task.id)}`);
                                                            }}
                                                            className="ml-1.5 text-[11px] px-3 py-1.5"
                                                        >
                                                            Ext Order
                                                        </FrappeButton>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={9} className="p-8 text-center text-[var(--psd-body)] font-semibold">
                                                {isLoading ? "Loading documents..." : "No documents found matching your criteria."}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {allTasks.length > 0 && (
                            <div className="flex items-center justify-between border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-2">
                                <div>
                                    <div className="text-[12px] text-[var(--psd-body)]">
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
                                    else if (t.doctype === 'UC Request') navigate(`/uc-request/${t.docname}`);
                                    else if (t.doctype === 'Loan Settlement') navigate(`/loan-settlement/${t.docname}`);
                                    else navigate(`/task-registry/${t.doctype}/${t.docname}`);
                                }}
                                className="w-full rounded-lg bg-[var(--psd-primary)] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[var(--psd-primary-hover)]"
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
