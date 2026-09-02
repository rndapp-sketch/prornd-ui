import { useRef, useState, useMemo, useEffect } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import {
    UploadIcon,
    EyeIcon,
    RefreshCwIcon,
    SearchIcon,
    CheckCircle2Icon,
    ClockIcon,
    AlertCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { selectionCommitteeReportAPI, icssAPI, indentGeneralFormAPI, travelAPI, disbursalOfHonorariumAPI } from "@/services/apiService";
import { DepartmentName } from "@/components/DepartmentName";

type PendingDoc = {
    name: string;
    _doctype: "Selection Committee Report" | "Indent Cum Sanction Sheet" | "Indent General Form" | "Travel" | "Disbursal of Honorarium";
    _attachApi: string;
    interview_id?: string;
    principal_investigator?: string;
    project_number?: string;
    project_name?: string;
    upfa_department?: string;
    director_signed_pdf?: string;
    workflow_state?: string;
    modified?: string;
};

type ModuleFilter = "" | "Indent Cum Sanction Sheet" | "Selection Committee Report" | "Indent General Form" | "Travel" | "Disbursal of Honorarium";

const ITEMS_PER_PAGE = 10;

const MODULE_OPTIONS: { label: string; short: string; value: ModuleFilter }[] = [
    { label: "All Modules", short: "All", value: "" },
    { label: "Indent Cum Sanction Sheet", short: "ICSS", value: "Indent Cum Sanction Sheet" },
    { label: "Selection Committee Report", short: "SCR", value: "Selection Committee Report" },
    { label: "Indent General Form", short: "IGF", value: "Indent General Form" },
    { label: "Travel", short: "Travel", value: "Travel" },
    { label: "Disbursal of Honorarium", short: "Honorarium", value: "Disbursal of Honorarium" },
];

const MODULE_BADGE: Record<string, { bg: string; text: string }> = {
    "Indent Cum Sanction Sheet": {
        bg: "bg-violet-100 dark:bg-violet-900/40",
        text: "text-violet-700 dark:text-violet-300",
    },
    "Selection Committee Report": {
        bg: "bg-blue-100 dark:bg-blue-900/40",
        text: "text-blue-700 dark:text-blue-300",
    },
    "Indent General Form": {
        bg: "bg-emerald-100 dark:bg-emerald-900/40",
        text: "text-emerald-700 dark:text-emerald-300",
    },
    "Travel": {
        bg: "bg-orange-100 dark:bg-orange-900/40",
        text: "text-orange-700 dark:text-orange-300",
    },
    "Disbursal of Honorarium": {
        bg: "bg-pink-100 dark:bg-pink-900/40",
        text: "text-pink-700 dark:text-pink-300",
    },
};

const MODULE_SHORT: Record<string, string> = {
    "Indent Cum Sanction Sheet": "ICSS",
    "Selection Committee Report": "SCR",
    "Indent General Form": "IGF",
    "Travel": "Travel",
    "Disbursal of Honorarium": "Honorarium",
};

const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm", className)}>
        {children}
    </div>
);

const DirectorPdfUpload = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [moduleFilter, setModuleFilter] = useState<ModuleFilter>("");
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const {
        data: scrData,
        isLoading: scrLoading,
        error: scrError,
        mutate: scrMutate,
    } = useFrappeGetCall<{ message: { status: string; data: any[] } }>(
        selectionCommitteeReportAPI.getPendingDirectorUploads,
        {},
    );

    const {
        data: icssData,
        isLoading: icssLoading,
        error: icssError,
        mutate: icssMutate,
    } = useFrappeGetCall<{ message: { status: string; data: any[] } }>(
        icssAPI.getPendingDirectorUploads,
        {},
    );

    const {
        data: igfData,
        isLoading: igfLoading,
        error: igfError,
        mutate: igfMutate,
    } = useFrappeGetCall<{ message: { status: string; data: any[] } }>(
        indentGeneralFormAPI.getPendingDirectorUploads,
        {},
    );

    const {
        data: travelData,
        isLoading: travelLoading,
        error: travelError,
        mutate: travelMutate,
    } = useFrappeGetCall<{ message: { status: string; data: any[] } }>(
        travelAPI.getPendingDirectorUploads,
        {},
    );

    const {
        data: honorariumData,
        isLoading: honorariumLoading,
        error: honorariumError,
        mutate: honorariumMutate,
    } = useFrappeGetCall<{ message: { status: string; data: any[] } }>(
        disbursalOfHonorariumAPI.getPendingDirectorUploads,
        {},
    );

    const isLoading = scrLoading || icssLoading || igfLoading || travelLoading || honorariumLoading;
    // Only block the whole page if every module failed — a single module's
    // endpoint being down (e.g. Indent General Form's director-approval
    // backend isn't implemented yet) shouldn't hide data from the others.
    const error = scrError && icssError && igfError && travelError && honorariumError;
    const partiallyFailedModules = [
        scrError && "Selection Committee Report",
        icssError && "Indent Cum Sanction Sheet",
        igfError && "Indent General Form",
        travelError && "Travel",
        honorariumError && "Disbursal of Honorarium",
    ].filter(Boolean) as string[];

    const allDocs: PendingDoc[] = useMemo(() => [
        ...(icssData?.message?.data ?? []).map((d: any) => ({
            ...d,
            _doctype: "Indent Cum Sanction Sheet" as const,
            _attachApi: icssAPI.attachDirectorPdf,
            project_number: d.project_no || d.project_code || d.project_number,
            project_name: d.project_title || d.funding_agency || d.project_name,
            principal_investigator: d.icss_applicant_name || d.applicant_name || d.principal_investigator,
            upfa_department: d.icss_applicant_department__centre__section || d.department || d.upfa_department,
        })),
        ...(scrData?.message?.data ?? []).map((d: any) => ({
            ...d,
            _doctype: "Selection Committee Report" as const,
            _attachApi: selectionCommitteeReportAPI.attachDirectorPdf,
        })),
        ...(igfData?.message?.data ?? []).map((d: any) => ({
            ...d,
            _doctype: "Indent General Form" as const,
            _attachApi: indentGeneralFormAPI.attachDirectorPdf,
            principal_investigator: d.igf_indenter,
            project_number: d.igf_project_code,
            project_name: d.igf_project_title,
            upfa_department: d.igf_department_centre_section,
        })),
        ...(travelData?.message?.data ?? []).map((d: any) => ({
            ...d,
            _doctype: "Travel" as const,
            _attachApi: travelAPI.attachDirectorPdf,
            principal_investigator: d.applicant_name_travel,
            project_number: d.travel_project_number,
            upfa_department: d.department_travel,
        })),
        ...(honorariumData?.message?.data ?? []).map((d: any) => ({
            ...d,
            _doctype: "Disbursal of Honorarium" as const,
            _attachApi: disbursalOfHonorariumAPI.attachDirectorPdf,
            principal_investigator: d.name_of_applicant || d.webmail_id,
            project_number: d.project_no || d.project_number,
            upfa_department: d.applicant_department || d.upfa_department,
        })),
    ], [icssData, scrData, igfData, travelData, honorariumData]);

    const { call: fetchProjectTitles } = useFrappePostCall<{ message: any[] }>("frappe.client.get_list");
    const [projectTitleMap, setProjectTitleMap] = useState<Record<string, string>>({});
    const [projectDeptMap, setProjectDeptMap] = useState<Record<string, string>>({});

    const uniqueProjectNos = useMemo(() => {
        const nos = new Set<string>();
        allDocs.forEach((d) => { if (d.project_number?.trim()) nos.add(d.project_number.trim()); });
        return [...nos];
    }, [allDocs]);

    useEffect(() => {
        if (uniqueProjectNos.length === 0) return;
        fetchProjectTitles({
            doctype: "Project Registration",
            filters: [["project_no", "in", uniqueProjectNos]],
            fields: ["project_no", "project_title", "implementation_department"],
            limit: uniqueProjectNos.length + 10,
        }).then((res) => {
            const titleMap: Record<string, string> = {};
            const deptMap: Record<string, string> = {};
            (res?.message ?? []).forEach((r: any) => {
                if (r.project_no && r.project_title) titleMap[r.project_no] = r.project_title;
                if (r.project_no && r.implementation_department) deptMap[r.project_no] = r.implementation_department;
            });
            setProjectTitleMap(titleMap);
            setProjectDeptMap(deptMap);
        }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [uniqueProjectNos.join(",")]);

    const resolvedDocs = useMemo(() =>
        allDocs.map((d) => {
            const pno = d.project_number?.trim();
            return {
                ...d,
                project_name: d.project_name || (pno ? projectTitleMap[pno] : undefined),
                upfa_department: d.upfa_department || (pno ? projectDeptMap[pno] : undefined),
            };
        }),
        [allDocs, projectTitleMap, projectDeptMap],
    );

    const uploadedCount = resolvedDocs.filter((d) => d.director_signed_pdf?.trim()).length;
    const pendingCount = resolvedDocs.length - uploadedCount;

    const filteredDocs = useMemo(() => {
        let docs = resolvedDocs;
        if (moduleFilter) docs = docs.filter((d) => d._doctype === moduleFilter);
        if (debouncedSearch) {
            const q = debouncedSearch.toLowerCase();
            docs = docs.filter(
                (d) =>
                    d.name.toLowerCase().includes(q) ||
                    d.project_name?.toLowerCase().includes(q) ||
                    d.project_number?.toLowerCase().includes(q) ||
                    d.principal_investigator?.toLowerCase().includes(q) ||
                    d.interview_id?.toLowerCase().includes(q),
            );
        }
        return docs;
    }, [resolvedDocs, moduleFilter, debouncedSearch]);

    const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE) || 1;
    const paginatedDocs = filteredDocs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    );

    const mutateAll = () => {
        scrMutate();
        icssMutate();
        igfMutate();
        travelMutate();
        honorariumMutate();
    };

    const handleModuleChange = (val: ModuleFilter) => {
        setModuleFilter(val);
        setCurrentPage(1);
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (currentPage <= 3) {
            pages.push(1, 2, 3, "…", totalPages);
        } else if (currentPage >= totalPages - 2) {
            pages.push(1, "…", totalPages - 2, totalPages - 1, totalPages);
        } else {
            pages.push(1, "…", currentPage - 1, currentPage, currentPage + 1, "…", totalPages);
        }
        return pages;
    };

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
            <main className="px-6 md:px-8 pt-7 pb-10 w-full">
                {/* Page header */}
                <FrappeCard className="mb-5 overflow-hidden p-0">
                    <div className="h-[3px] bg-gradient-to-r from-[#D97757] via-[#c66a4e] to-[#4A6CF7]" />
                    <div className="flex items-center justify-between px-5 py-4">
                        <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
                                R&amp;D Staff
                            </span>
                            <h1 className="mt-1 text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                Director-Signed PDF Upload
                            </h1>
                            <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                Upload Director-signed scans for documents awaiting approval.
                            </p>
                        </div>
                        <button
                            onClick={mutateAll}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA] hover:text-[#D97757] hover:border-[#D97757]/40 transition-colors"
                        >
                            <RefreshCwIcon className="w-3.5 h-3.5" /> Refresh
                        </button>
                    </div>
                </FrappeCard>

                {/* Partial-failure notice — one module's endpoint being down
                    shouldn't hide data from the others */}
                {!isLoading && !error && partiallyFailedModules.length > 0 && (
                    <div className="mb-5 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-[12px] font-medium text-amber-800 dark:text-amber-300">
                        <AlertCircleIcon className="w-4 h-4 shrink-0" />
                        Could not load: {partiallyFailedModules.join(", ")}. Other modules are shown below.
                    </div>
                )}

                {/* Stat row */}
                {!isLoading && !error && (
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <StatPill label="Total" value={allDocs.length} color="text-[#3F3F46] dark:text-[#E4E4E7]" bg="bg-white dark:bg-[#27272A] border-[#E4E4E7] dark:border-[#3F3F46]" />
                        <StatPill label="Pending Upload" value={pendingCount} color="text-amber-700 dark:text-amber-400" bg="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" icon={<ClockIcon className="w-4 h-4 text-amber-500" />} />
                        <StatPill label="Uploaded" value={uploadedCount} color="text-emerald-700 dark:text-emerald-400" bg="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" icon={<CheckCircle2Icon className="w-4 h-4 text-emerald-500" />} />
                    </div>
                )}

                {/* Filter toolbar */}
                <FrappeCard className="mb-4 p-3">
                    <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
                        <div className="flex items-center gap-3 flex-wrap w-full">
                            {/* Module filter tabs */}
                            <div className="flex items-center gap-1.5">
                                {MODULE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => handleModuleChange(opt.value)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wide border transition-all",
                                            moduleFilter === opt.value
                                                ? "bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A] dark:bg-[#4A6CF7]/18 dark:border-[#818CF8] dark:text-[#C7D2FE]"
                                                : "bg-white dark:bg-[#27272A] border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] hover:border-[#4A6CF7]/40",
                                        )}
                                    >
                                        {opt.short}
                                        {opt.value !== "" && (
                                            <span className="ml-1.5 text-[10px] font-bold opacity-70">
                                                {resolvedDocs.filter((d) => d._doctype === opt.value).length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative w-full md:w-64">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A1A1AA]" />
                                <input
                                    type="text"
                                    placeholder="Search doc ID, project, PI…"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-9 w-full pl-9 pr-8 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[12px] text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#4A6CF7] focus:ring-[3px] focus:ring-[#4A6CF7]/12 transition-colors"
                                />
                                {search && (
                                    <button
                                        onClick={() => setSearch("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A1A1AA] hover:text-[#71717A]"
                                    >
                                        <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>

                        <span className="text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA] whitespace-nowrap shrink-0">
                            {filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </FrappeCard>

                {/* Table */}
                <FrappeCard className="overflow-hidden p-3">
                    {isLoading && (
                        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#71717A] dark:text-[#A1A1AA]">
                            <RefreshCwIcon className="w-4 h-4 animate-spin" /> Loading documents…
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 py-8 px-4 text-[13px] text-red-600 dark:text-red-400">
                            <AlertCircleIcon className="w-4 h-4 shrink-0" />
                            Failed to load: {String((error as any).message || error)}
                        </div>
                    )}

                    {!isLoading && !error && (
                        <div className="overflow-x-auto rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                            <table className="w-full text-xs">
                                <thead className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                    <tr>
                                        {["Module", "Document ID", "Project Code", "Project Title", "PI / Interview Ref", "Department", "Workflow State", "Last Modified", "Upload Status", "Actions"].map((h) => (
                                            <th
                                                key={h}
                                                className="px-3 py-2.5 text-left text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25 last:border-r-0 whitespace-nowrap"
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                                    {paginatedDocs.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="py-14 text-center text-[#A1A1AA] dark:text-[#71717A]">
                                                <CheckCircle2Icon className="w-7 h-7 mx-auto mb-2 text-emerald-400" />
                                                No documents match the current filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedDocs.map((doc) => (
                                            <TableRow key={`${doc._doctype}-${doc.name}`} doc={doc} onDone={mutateAll} />
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!isLoading && !error && filteredDocs.length > ITEMS_PER_PAGE && (
                        <div className="flex items-center justify-between mt-4 px-1">
                            <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredDocs.length)} of {filteredDocs.length}
                            </span>
                            <div className="flex items-center gap-1">
                                <PagBtn
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                >
                                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                                </PagBtn>
                                {getPageNumbers().map((p, i) =>
                                    typeof p === "string" ? (
                                        <span key={`ellipsis-${i}`} className="px-1 text-[#A1A1AA]">…</span>
                                    ) : (
                                        <PagBtn
                                            key={p}
                                            active={p === currentPage}
                                            onClick={() => setCurrentPage(p)}
                                        >
                                            {p}
                                        </PagBtn>
                                    ),
                                )}
                                <PagBtn
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                >
                                    <ChevronRightIcon className="w-3.5 h-3.5" />
                                </PagBtn>
                            </div>
                        </div>
                    )}
                </FrappeCard>
            </main>
        </div>
    );
};

const StatPill = ({
    label,
    value,
    color,
    bg,
    icon,
}: {
    label: string;
    value: number;
    color: string;
    bg: string;
    icon?: React.ReactNode;
}) => (
    <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl border", bg)}>
        {icon}
        <div>
            <div className={cn("text-xl font-extrabold leading-none", color)}>{value}</div>
            <div className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5 font-medium">{label}</div>
        </div>
    </div>
);

const PagBtn = ({
    children,
    onClick,
    disabled,
    active,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    active?: boolean;
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "h-7 min-w-[28px] px-1.5 rounded-md text-[11px] font-bold border transition-all",
            active
                ? "bg-[#4A6CF7] border-[#4A6CF7] text-white"
                : "bg-white dark:bg-[#27272A] border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] hover:border-[#4A6CF7]/50",
            disabled && "opacity-40 cursor-not-allowed",
        )}
    >
        {children}
    </button>
);

const TableRow = ({ doc, onDone }: { doc: PendingDoc; onDone: () => void }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);

    const uploaded = !!(doc.director_signed_pdf?.trim());
    const badge = MODULE_BADGE[doc._doctype];
    const short = MODULE_SHORT[doc._doctype] ?? doc._doctype;

    const onView = () => {
        if (doc.director_signed_pdf) window.open(doc.director_signed_pdf, "_blank");
    };

    const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        setErrMsg(null);
        try {
            const fd = new FormData();
            fd.append("file", file, file.name);
            fd.append("is_private", "0");
            fd.append("doctype", doc._doctype);
            fd.append("docname", doc.name);
            fd.append("fieldname", "director_signed_pdf");

            const csrfToken = (window as Window & { csrf_token?: string }).csrf_token;
            const headers = csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : undefined;

            const res = await fetch("/api/method/upload_file", {
                method: "POST",
                body: fd,
                credentials: "include",
                headers,
            });
            if (!res.ok) throw new Error(await res.text());
            const j = await res.json();
            const fileUrl: string | undefined = j?.message?.file_url;
            if (!fileUrl) throw new Error("Upload returned no file_url");

            const bindRes = await fetch(`/api/method/${doc._attachApi}`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    ...(csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : {}),
                },
                body: JSON.stringify({ docname: doc.name, file_url: fileUrl }),
            });
            if (!bindRes.ok) throw new Error(await bindRes.text());
            onDone();
        } catch (err: any) {
            setErrMsg(err?.message || String(err));
        } finally {
            setIsUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <tr className="hover:bg-[#FAFAF9] dark:hover:bg-[#1E1E24] transition-colors">
            {/* Module */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46]">
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold", badge?.bg, badge?.text)}>
                    {short}
                </span>
            </td>

            {/* Doc ID */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] font-mono text-[11px] text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap">
                {doc.name}
            </td>

            {/* Project Code */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap">
                {doc.project_number ?? <span className="text-[#A1A1AA]">—</span>}
            </td>

            {/* Project Title */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] max-w-[200px]">
                <span className="line-clamp-2 leading-snug">
                    {doc.project_name ?? <span className="text-[#A1A1AA]">—</span>}
                </span>
            </td>

            {/* PI / Interview Ref */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap">
                {doc.principal_investigator ?? doc.interview_id ?? <span className="text-[#A1A1AA]">—</span>}
            </td>

            {/* Department */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap">
                {doc.upfa_department
                    ? <DepartmentName name={doc.upfa_department} />
                    : <span className="text-[#A1A1AA]">—</span>}
            </td>

            {/* Workflow State */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] whitespace-nowrap">
                {doc.workflow_state
                    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">{doc.workflow_state}</span>
                    : <span className="text-[#A1A1AA]">—</span>}
            </td>

            {/* Last Modified */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] dark:text-[#A1A1AA] whitespace-nowrap">
                {doc.modified
                    ? new Date(doc.modified).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
                    : <span className="text-[#A1A1AA]">—</span>}
            </td>

            {/* Upload Status */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] whitespace-nowrap">
                {uploaded ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 w-fit">
                        <CheckCircle2Icon className="w-3 h-3" /> Uploaded
                    </span>
                ) : (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 w-fit">
                        <ClockIcon className="w-3 h-3" /> Pending
                    </span>
                )}
            </td>

            {/* Actions */}
            <td className="px-3 py-2.5 whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                    <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={onFile} />
                    <button
                        onClick={() => inputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-[#D97757] hover:bg-[#c66a4e] text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <UploadIcon className="w-3 h-3" />
                        {uploaded
                            ? isUploading ? "Replacing…" : "Replace"
                            : isUploading ? "Uploading…" : "Upload"}
                    </button>
                    {uploaded && (
                        <button
                            onClick={onView}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                        >
                            <EyeIcon className="w-3 h-3" /> View
                        </button>
                    )}
                    {errMsg && (
                        <span className="text-[10px] text-red-500 flex items-center gap-0.5 max-w-[120px] truncate" title={errMsg}>
                            <AlertCircleIcon className="w-3 h-3 shrink-0" /> {errMsg}
                        </span>
                    )}
                </div>
            </td>
        </tr>
    );
};

export default DirectorPdfUpload;
