

// -=-=-=-=-=-=

import React, { useState, useRef } from 'react';
import { FaExclamationCircle, FaArrowLeft } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { ActivityLog } from '@/components/ActivityLog';
import { XIcon, ActivityIcon } from 'lucide-react';

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFrappeGetCall, useFrappeAuth, useFrappeGetDocList, useFrappePostCall } from 'frappe-react-sdk';
import { GlobalLoader } from '@/components/ui/global-loader';
import { useUserRoles } from '../components/UserRole';
import { selectionCandidateDetailsAPI, selectionCommitteeReportAPI } from '@/services/apiService';
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
    projectNo: string;
    status: string;
    priority: string;
    creation: string;
    modified: string;
    owner: string;
    doctype: string;
    project_type: ProjectCategory;
}

type ProjectTypeTab = ProjectCategory;

type SCRCandidate = {
    name: string;
    candidate_name: string;
    application_id: string;
    candidate_id: string;
    category: string;
    selection_status: string;
    appointment_order_number: string;
    medical_report_number: string;
    joining_report_number: string;
    wl_number: string;
    /** True if a Project Staff Details (joining) doc for this candidate has docstatus >= 1. */
    joining_submitted?: boolean;
};

const parseCandidateRows = (value: unknown): any[] => {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const normalizeSCRCandidate = (row: any): SCRCandidate => {
    const selectionStatus = row.selection_status || row.recommendation || "";
    return {
        name: row.name || row.id || "",
        candidate_name: row.candidate_name || row.display_name || "",
        application_id: String(row.application_id || ""),
        candidate_id: String(row.candidate_id || ""),
        category: row.category || "",
        selection_status: selectionStatus,
        appointment_order_number: row.appointment_order_number || "",
        medical_report_number: row.medical_report_number || "",
        joining_report_number: row.joining_report_number || "",
        wl_number: row.wl_number || row.waitlist_no || "",
    };
};

// ─── Hierarchical workflow button ────────────────────────────────────────────
// Three canonical states drive the entire row: prior step incomplete -> disabled,
// step ready but not yet done -> available, step already done -> completed.
type WorkflowButtonState = 'disabled' | 'available' | 'completed';

const WORKFLOW_BUTTON_CLASSES: Record<WorkflowButtonState, string> = {
    disabled: 'bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 cursor-not-allowed shadow-none',
    available: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-md',
    completed: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
};

const WorkflowButton: React.FC<{
    state: WorkflowButtonState;
    label: string;
    onClick?: () => void;
    title?: string;
}> = ({ state, label, onClick, title }) => (
    <button
        type="button"
        onClick={state === 'disabled' ? undefined : onClick}
        disabled={state === 'disabled'}
        title={
            title ??
            (state === 'disabled'
                ? 'Complete the previous step first'
                : state === 'completed'
                    ? 'Already completed'
                    : undefined)
        }
        className={cn(
            'inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs h-8 rounded-lg font-semibold transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500',
            WORKFLOW_BUTTON_CLASSES[state],
        )}
    >
        {state === 'completed' && <span aria-hidden>✓</span>}
        {label}
    </button>
);

// Derive button states for one candidate. Add new steps here as the workflow grows.
const getCandidateWorkflow = (
    c: SCRCandidate,
): Record<'appOrder' | 'medReport' | 'join' | 'joiningReport', WorkflowButtonState> => {
    const appOrderDone = !!c.appointment_order_number;
    const medReportDone = !!c.medical_report_number;
    const joiningDone = !!c.joining_submitted;
    const joiningReportDone = !!c.joining_report_number;
    return {
        appOrder: appOrderDone ? 'completed' : 'available',
        medReport: !appOrderDone ? 'disabled' : medReportDone ? 'completed' : 'available',
        join: !appOrderDone ? 'disabled' : joiningDone ? 'completed' : 'available',
        // Joining Report is a printable office-order, enabled once the candidate
        // has joined. Marked completed once its reference number is saved on SCD.
        joiningReport: !joiningDone ? 'disabled' : joiningReportDone ? 'completed' : 'available',
    };
};

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
    const [searchParams, setSearchParams] = useSearchParams();
    const [currentPage, setCurrentPage] = useState(1);
    const selectedModule = searchParams.get('module') ?? 'all';
    const searchQuery = searchParams.get('q') ?? '';
    const selectedProjectType = (searchParams.get('type') as ProjectTypeTab) ?? 'Research';
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [itemsPerPage, setItemsPerPage] = useState<number>(10);
    // Activity peek panel state
    const [selectedTask, setSelectedTask] = useState<{ doctype: string; docname: string; title: string } | null>(null);

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isHeadApprover = roles?.includes("head_approver_1") ?? false;
    const isStaffRnD = roles?.includes("staff, RnD") ?? false;
    const isPermanentEmployee = roles?.includes("Permanent Employee") ?? false;
    const isHosRnd = roles?.includes("Hos, RnD (Head of Section, RnD)") ?? false;
    const isAdoRnd = roles?.includes("Ado_RnD") ?? false;
    const [orderModal, setOrderModal] = useState<{
        open: boolean;
        loading: boolean;
        error: string | null;
        scrName: string;
        candidates: SCRCandidate[];
    }>({ open: false, loading: false, error: null, scrName: '', candidates: [] });

    const { call: fetchCandidatesByInterview } = useFrappePostCall(selectionCandidateDetailsAPI.getByInterview);
    const { call: fetchSCRFields } = useFrappePostCall<{ message: any }>(selectionCommitteeReportAPI.getFields);
    const { call: fetchPSDList } = useFrappePostCall<{ message: Array<{
        ps_first_name?: string;
        ps_middle_name?: string;
        ps_last_name?: string;
        docstatus?: number;
        workflow_state?: string;
    }> }>('frappe.client.get_list');
    const { call: fetchSCDList } = useFrappePostCall<{ message: Array<{
        application_id?: string;
        candidate_id?: string;
        appointment_order_number?: string;
        medical_report_number?: string;
    }> }>('frappe.client.get_list');

    // Best-effort match: normalize spaces & case so "Anil  Kumar" === "anil kumar".
    const normalizeName = (...parts: Array<string | undefined>) =>
        parts.filter(Boolean).join(' ').toLowerCase().replace(/\s+/g, ' ').trim();

    const handleOrderClick = async (taskId: string) => {
        setOrderModal({ open: true, loading: true, error: null, scrName: taskId, candidates: [] });
        try {
            const res = await fetchCandidatesByInterview({ interview_id: taskId, selection_status: 'Recommended' });
            if (res?.message?.status === 'error') {
                setOrderModal(prev => ({ ...prev, loading: false, error: res.message.message || 'Failed to fetch candidates.' }));
                return;
            }
            let candidates: SCRCandidate[] = Array.isArray(res?.message?.data) ? res.message.data : [];

            if (candidates.length === 0) {
                try {
                    const scrRes = await fetchSCRFields({ doc_name: taskId });
                    const prefill = scrRes?.message?.prefill_data || {};
                    const savedRows = parseCandidateRows(prefill.candidates);
                    candidates = savedRows
                        .filter((row) => {
                            const status = String(row.recommendation || row.selection_status || "").trim().toLowerCase();
                            return status === "recommended";
                        })
                        .map(normalizeSCRCandidate);
                } catch (scrErr) {
                    console.error("Failed to fetch SCR candidate rows:", scrErr);
                }

                // Enrich fallback candidates with appointment_order_number and
                // medical_report_number from Selection Candidate Details, since
                // those fields are not stored on the SCR candidates table itself.
                if (candidates.length > 0) {
                    try {
                        const scdRes = await fetchSCDList({
                            doctype: 'Selection Candidate Details',
                            filters: JSON.stringify([['scr_id', '=', taskId]]),
                            fields: JSON.stringify(['application_id', 'candidate_id', 'appointment_order_number', 'medical_report_number']),
                            limit_page_length: 0,
                        });
                        const scdRows = scdRes?.message ?? [];
                        if (scdRows.length > 0) {
                            const byAppId = new Map(scdRows.map(r => [String(r.application_id ?? ''), r]));
                            const byCandId = new Map(scdRows.map(r => [String(r.candidate_id ?? ''), r]));
                            candidates = candidates.map(c => {
                                const scd = byAppId.get(String(c.application_id)) ?? byCandId.get(String(c.candidate_id));
                                if (!scd) return c;
                                return {
                                    ...c,
                                    appointment_order_number: scd.appointment_order_number || c.appointment_order_number,
                                    medical_report_number: scd.medical_report_number || c.medical_report_number,
                                };
                            });
                        }
                    } catch {
                        /* enrichment failure is non-fatal */
                    }
                }
            }

            // Enrich with joining-submitted status by name-matching Project Staff Details
            // rows that share this SCR. Falls back silently if the lookup fails.
            let enriched = candidates;
            try {
                const psdRes = await fetchPSDList({
                    doctype: 'Project Staff Details',
                    filters: JSON.stringify([['scr_id', '=', taskId]]),
                    fields: JSON.stringify(['ps_first_name', 'ps_middle_name', 'ps_last_name', 'docstatus', 'workflow_state']),
                    limit_page_length: 0,
                });
                // Joining started is enough to unlock the Joining Report. Frappe
                // workflows commonly keep docstatus=0 until final approval.
                const isJoiningSubmitted = (p: { docstatus?: number; workflow_state?: string }) =>
                    Number(p.docstatus) >= 1 ||
                    (!!p.workflow_state && p.workflow_state.toLowerCase() !== 'draft');
                const submitted = new Set<string>();
                for (const p of (psdRes?.message ?? [])) {
                    if (!isJoiningSubmitted(p)) continue;
                    const variants = [
                        normalizeName(p.ps_first_name, p.ps_middle_name, p.ps_last_name),
                        normalizeName(p.ps_first_name, p.ps_last_name),
                        normalizeName(p.ps_first_name),
                    ].filter(Boolean);
                    for (const v of variants) submitted.add(v);
                }
                if (submitted.size > 0) {
                    enriched = candidates.map(c => ({
                        ...c,
                        joining_submitted: submitted.has(normalizeName(c.candidate_name)),
                    }));
                }
            } catch {
                /* leave joining_submitted undefined */
            }

            setOrderModal(prev => ({ ...prev, loading: false, candidates: enriched }));
        } catch {
            setOrderModal(prev => ({ ...prev, loading: false, error: 'Failed to fetch candidates. Please try again.' }));
        }
    };

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

    // Fetch Leave Module names where pi matches current user (PI sees only their assigned leaves)
    const { data: piLeaveModules } = useFrappeGetDocList("Leave Module", {
        filters: [["pi", "=", currentUser ?? ""]],
        fields: ["name"],
        limit: 500,
    }, isPermanentEmployee && !!currentUser ? undefined : null);

    const allowedLeaveNames = React.useMemo(() => {
        if (!isPermanentEmployee || !piLeaveModules) return null;
        return new Set(piLeaveModules.map((l: { name: string }) => l.name));
    }, [isPermanentEmployee, piLeaveModules]);

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
            // HoS users: also include records from mod_vis=0 groups if status is "Pending HoS Approval"
            const shouldIncludeGroup = group.mod_vis || group.doctype === "Advance Settlement";
            group.records.forEach((record) => {
                const isHosPendingRecord = record.status === "Pending HoS Approval";
                // Include if: normal group OR HoS user with a HoS-specific record
                if (!shouldIncludeGroup && !(isHosRnd && isHosPendingRecord)) return;

                if (isHeadApprover && group.doctype === "Project Registration" && allowedProjectNames && !allowedProjectNames.has(record.name) && !(isHosRnd && isHosPendingRecord)) {
                    return;
                }
                if (isPermanentEmployee && group.doctype === "Leave Module" && record.status === "Pending PI Approval" && allowedLeaveNames && !allowedLeaveNames.has(record.name)) {
                    return;
                }
                if (record.status === "Endorsement Approved") {
                    return;
                }
                if (
                    record.status === "Sanction Approved" &&
                    group.doctype !== "Direct Purchase"
                ) {
                    return;
                }
                // HoS users should not see Associate Dean tasks
                if (isHosRnd && !isAdoRnd && record.status === "Pending Associate Dean") {
                    return;
                }
                // ADO users should not see HoS-only tasks
                if (isAdoRnd && !isHosRnd && record.status === "Pending HoS Approval") {
                    return;
                }
                const projectNo =
                    record.project_no ||
                    record.project_number ||
                    record.project_ref_number ||
                    record.project_code ||
                    record.project_id ||
                    record.prj_num ||
                    record.travel_project_number ||
                    record.igf_project_code ||
                    record.upfa_project_code ||
                    "";

                tasks.push({
                    id: record.name,
                    title: record.title,
                    "Project Number": record.name,
                    projectNo,
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
        });
        return tasks;
    }, [data, isHeadApprover, allowedProjectNames, prNameToType, prNoToType, isPermanentEmployee, allowedLeaveNames, isHosRnd, isAdoRnd]);

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

    // Phase-3: fetch director_signed_pdf for IGF rows at Pending Director Approval
    const [igfPdfStatus, setIgfPdfStatus] = React.useState<Map<string, boolean>>(new Map());
    React.useEffect(() => {
        const targets = allTasks.filter(
            t => t.doctype === "Indent General Form" && t.status === "Pending Director Approval",
        );
        if (!targets.length) return;
        const ids = targets.map(t => t.id);
        const params = new URLSearchParams({
            fields: JSON.stringify(["name", "director_signed_pdf"]),
            filters: JSON.stringify([["name", "in", ids.join(",")]]),
            limit: String(ids.length),
        });
        fetch(`/api/resource/Indent%20General%20Form?${params}`, { credentials: "include" })
            .then(r => r.json())
            .then(result => {
                const map = new Map<string, boolean>();
                (result?.data ?? result?.message ?? []).forEach((rec: any) => {
                    map.set(rec.name, !!rec.director_signed_pdf);
                });
                setIgfPdfStatus(map);
            })
            .catch(() => {});
    }, [allTasks]);

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
            tasks = tasks.filter(task => {
                const ownerUsername = task.owner?.split("@")[0]?.toLowerCase() ?? "";
                return (
                    task.title?.toLowerCase().includes(q) ||
                    task["Project Number"]?.toLowerCase().includes(q) ||
                    task.projectNo?.toLowerCase().includes(q) ||
                    task.owner?.toLowerCase().includes(q) ||
                    ownerUsername.includes(q) ||
                    task.doctype?.toLowerCase().includes(q)
                );
            });
        }
        return tasks;
    }, [visibleTasks, selectedProjectType, selectedModule, searchQuery]);

    const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
    const indexOfLastTask = currentPage * itemsPerPage;
    const indexOfFirstTask = indexOfLastTask - itemsPerPage;
    const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);

    const handlePageChange = (pageNumber: number) => setCurrentPage(pageNumber);

    const handleProjectTypeChange = (tab: ProjectTypeTab) => {
        setSearchParams(prev => { prev.set('type', tab); prev.delete('module'); prev.delete('q'); return prev; });
        setCurrentPage(1);
    };

    const handleModuleChange = (module: string) => {
        setSearchParams(prev => { module === 'all' ? prev.delete('module') : prev.set('module', module); return prev; });
        setCurrentPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchParams(prev => { e.target.value ? prev.set('q', e.target.value) : prev.delete('q'); return prev; });
        setCurrentPage(1);
    };

    const handleClearSearch = () => {
        setSearchParams(prev => { prev.delete('q'); return prev; });
        searchInputRef.current?.focus();
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

                {/* Info banner */}
                <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800/50 dark:bg-blue-950/30">
                    <div className="mt-0.5 flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
                        <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-[13px] font-bold text-blue-800 dark:text-blue-300">All form processing must be done from this page.</p>
                        <p className="mt-0.5 text-[12px] font-medium leading-5 text-blue-700 dark:text-blue-400">Approvals, forwarding, and all workflow actions are only available here in Pending Tasks. Open a task and use the action buttons to process it.</p>
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
                            const tabColors: Record<string, string> = {
                                Research: active ? 'bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A] shadow-sm shadow-[#4A6CF7]/10 dark:bg-[#4A6CF7]/18 dark:border-[#818CF8] dark:text-[#C7D2FE]' : 'border-[#C7D2FE] bg-[#EEF2FF]/55 text-[#1E3A8A] hover:bg-[#EEF2FF] dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/10 dark:text-[#C7D2FE]',
                                Consultancy: active ? 'bg-[#ECFDF5] border-[#10B981] text-[#065F46] shadow-sm shadow-[#10B981]/10 dark:bg-[#10B981]/15 dark:border-[#34D399] dark:text-[#A7F3D0]' : 'border-[#A7F3D0] bg-[#ECFDF5]/60 text-[#047857] hover:bg-[#ECFDF5] dark:border-[#10B981]/30 dark:bg-[#10B981]/10 dark:text-[#A7F3D0]',
                                Others: active ? 'bg-[#F4F4F5] border-[#71717A] text-[#3F3F46] shadow-sm dark:bg-[#3F3F46] dark:border-[#A1A1AA] dark:text-[#E4E4E7]' : 'border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8]',
                            };
                            const badgeColors: Record<string, string> = {
                                Research: active ? 'bg-[#4A6CF7] text-white' : 'bg-white/80 text-[#4A6CF7] dark:bg-[#18181B]/50',
                                Consultancy: active ? 'bg-[#10B981] text-white' : 'bg-white/80 text-[#059669] dark:bg-[#18181B]/50',
                                Others: active ? 'bg-[#71717A] text-white' : 'bg-[#F4F4F5] text-[#71717A] dark:bg-[#18181B]/50',
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
                                placeholder="Search by title, project no., owner…"
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
                                                {task.doctype === "Indent General Form" &&
                                                    task.status === "Pending Director Approval" &&
                                                    igfPdfStatus.get(task.id) && (
                                                    <span className="mt-1.5 flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                                                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        PDF Uploaded
                                                    </span>
                                                )}
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
                                            <td className="p-3 align-middle text-right">
                                                <div className="flex items-center justify-end gap-2">
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
                                                            } else if (task.doctype === "Project Staff Details") {
                                                                navigate(`/project-staff-joining?docname=${encodeURIComponent(task.id)}`);
                                                            } else if (task.doctype === "Project Staff Resignation") {
                                                                navigate(`/project-staff-resignation?edit=${encodeURIComponent(task.id)}`);
                                                            } else {
                                                                navigate(`/pending-tasks/${task.doctype}/${task.id}`);
                                                            }
                                                        }}
                                                        className="px-3 py-1.5 text-xs h-8 shadow-sm"
                                                    >
                                                        View
                                                    </FrappeButton>
                                                    {isStaffRnD &&
                                                        task.doctype === "Selection Committee Report" &&
                                                        task.status === "Approved" && (
                                                        <FrappeButton
                                                            variant="action"
                                                            onClick={() => handleOrderClick(task.id)}
                                                            className="px-3 py-1.5 text-xs h-8 shadow-sm"
                                                        >
                                                            More
                                                        </FrappeButton>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-zinc-500 dark:text-zinc-400">
                                            No pending tasks found matching your criteria.
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

        {/* Order Modal — Candidates from Approved SCR */}
        {orderModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 w-full max-w-4xl mx-4">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
                        <div>
                            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Candidates</h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                {orderModal.scrName}
                            </p>
                        </div>
                        <button
                            onClick={() => setOrderModal(prev => ({ ...prev, open: false }))}
                            className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
                        {orderModal.loading ? (
                            <div className="flex flex-col items-center gap-2 py-8 text-zinc-400">
                                <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                                <p className="text-sm">Loading candidates...</p>
                            </div>
                        ) : orderModal.error ? (
                            <p className="text-sm text-red-500 text-center py-8">{orderModal.error}</p>
                        ) : orderModal.candidates.length === 0 ? (
                            <p className="text-sm text-zinc-500 text-center py-8">No recommended candidates found.</p>
                        ) : (
                            orderModal.candidates.map((candidate, idx) => (
                                <div
                                    key={candidate.name || idx}
                                    className="flex items-center justify-between gap-4 p-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800"
                                >
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                                            {candidate.candidate_name}
                                        </p>
                                        {candidate.application_id && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">App ID: {candidate.application_id}</p>
                                        )}
                                        {candidate.category && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Category: {candidate.category}</p>
                                        )}
                                        {candidate.wl_number && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">WL No: {candidate.wl_number}</p>
                                        )}
                                        {candidate.appointment_order_number && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Order No: {candidate.appointment_order_number}</p>
                                        )}
                                        {candidate.medical_report_number && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Medical Report: {candidate.medical_report_number}</p>
                                        )}
                                        {candidate.joining_report_number && (
                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">Joining Report: {candidate.joining_report_number}</p>
                                        )}
                                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border bg-emerald-50 text-emerald-700 border-emerald-200">
                                            {candidate.selection_status}
                                        </span>
                                    </div>
                                    {(() => {
                                        const wf = getCandidateWorkflow(candidate);
                                        const qs = `scr=${orderModal.scrName}&candidate_id=${candidate.candidate_id}&application_id=${candidate.application_id}`;
                                        return (
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <WorkflowButton
                                                    state={wf.appOrder}
                                                    label="App Order"
                                                    onClick={() => navigate(`/appointment-order?${qs}`)}
                                                />
                                                <WorkflowButton
                                                    state={wf.medReport}
                                                    label="Med Report"
                                                    onClick={() => navigate(`/medical-report?${qs}`)}
                                                    title={wf.medReport === 'disabled' ? 'Save the Appointment Order number first' : undefined}
                                                />
                                                <WorkflowButton
                                                    state={wf.join}
                                                    label={wf.join === 'completed' ? 'Joined' : 'Join'}
                                                    onClick={() => navigate(`/project-staff-joining?${qs}`)}
                                                    title={wf.join === 'disabled' ? 'Save the Appointment Order number first' : undefined}
                                                />
                                                <WorkflowButton
                                                    state={wf.joiningReport}
                                                    label="Joining Report"
                                                    onClick={() => navigate(`/joining-report?${qs}`)}
                                                    title={wf.joiningReport === 'disabled' ? 'Save & submit the Joining form first' : undefined}
                                                />
                                            </div>
                                        );
                                    })()}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

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
                                if (selectedTask.doctype === "Project Staff Details") {
                                    navigate(`/project-staff-joining?docname=${encodeURIComponent(selectedTask.docname)}`);
                                } else if (selectedTask.doctype === "Project Staff Resignation") {
                                    navigate(`/project-staff-resignation?edit=${encodeURIComponent(selectedTask.docname)}`);
                                } else {
                                    navigate(`/pending-tasks/${encodeURIComponent(selectedTask.doctype)}/${selectedTask.docname}`);
                                }
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
