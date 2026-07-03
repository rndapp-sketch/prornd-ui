import { useRef, useState, useMemo, useEffect } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import {
    FileTextIcon,
    UploadIcon,
    EyeIcon,
    RefreshCwIcon,
    DownloadIcon,
    SearchIcon,
    CheckCircle2Icon,
    ClockIcon,
    AlertCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { topUpFellowshipAPI } from "@/services/apiService";

type TopUpDoc = {
    name: string;
    project_code?: string;
    project_title?: string;
    pi_webmail?: string;
    coordinating_pi_webmail?: string;
    faculty_admission_pdf?: string;
    workflow_state?: string;
    modified?: string;
};

const DOCTYPE = "Top Up Fellowship";
const ITEMS_PER_PAGE = 10;

const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm", className)}>
        {children}
    </div>
);

const TopUpFellowshipFacultyAdmission = () => {
    const [currentPage, setCurrentPage] = useState(1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 350);
        return () => clearTimeout(t);
    }, [search]);

    const { data, isLoading, error, mutate } = useFrappeGetCall<{
        message: { status: string; data: TopUpDoc[] };
    }>(topUpFellowshipAPI.getPendingFacultyAdmissionUploads, {});

    const allDocs: TopUpDoc[] = data?.message?.data ?? [];
    const uploadedCount = allDocs.filter((d) => d.faculty_admission_pdf?.trim()).length;
    const pendingCount = allDocs.length - uploadedCount;

    const filteredDocs = useMemo(() => {
        if (!debouncedSearch) return allDocs;
        const q = debouncedSearch.toLowerCase();
        return allDocs.filter(
            (d) =>
                d.name.toLowerCase().includes(q) ||
                d.project_code?.toLowerCase().includes(q) ||
                d.project_title?.toLowerCase().includes(q) ||
                d.pi_webmail?.toLowerCase().includes(q) ||
                d.coordinating_pi_webmail?.toLowerCase().includes(q),
        );
    }, [allDocs, debouncedSearch]);

    const totalPages = Math.ceil(filteredDocs.length / ITEMS_PER_PAGE) || 1;
    const paginatedDocs = filteredDocs.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE,
    );

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
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#7C3AED] to-[#D97757]" />
                    <div className="flex items-center justify-between px-5 py-4">
                        <div>
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#4A6CF7]">
                                R&amp;D Staff
                            </span>
                            <h1 className="mt-1 text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                Faculty Admission PDF Upload
                            </h1>
                            <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                Download the application PDF, get it signed by Faculty Admission, and upload the signed scan. Forwarding to HoS is blocked until the signed PDF is uploaded.
                            </p>
                        </div>
                        <button
                            onClick={() => mutate()}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA] hover:text-[#4A6CF7] hover:border-[#4A6CF7]/40 transition-colors"
                        >
                            <RefreshCwIcon className="w-3.5 h-3.5" /> Refresh
                        </button>
                    </div>
                </FrappeCard>

                {/* Stat row */}
                {!isLoading && !error && (
                    <div className="grid grid-cols-3 gap-3 mb-5">
                        <StatPill
                            label="Total"
                            value={allDocs.length}
                            color="text-[#3F3F46] dark:text-[#E4E4E7]"
                            bg="bg-white dark:bg-[#27272A] border-[#E4E4E7] dark:border-[#3F3F46]"
                        />
                        <StatPill
                            label="Pending Upload"
                            value={pendingCount}
                            color="text-amber-700 dark:text-amber-400"
                            bg="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
                            icon={<ClockIcon className="w-4 h-4 text-amber-500" />}
                        />
                        <StatPill
                            label="Uploaded"
                            value={uploadedCount}
                            color="text-emerald-700 dark:text-emerald-400"
                            bg="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                            icon={<CheckCircle2Icon className="w-4 h-4 text-emerald-500" />}
                        />
                    </div>
                )}

                {/* Search toolbar */}
                <FrappeCard className="mb-4 p-3">
                    <div className="flex items-center gap-3 justify-between">
                        <div className="relative w-full md:w-72">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A1A1AA]" />
                            <input
                                type="text"
                                placeholder="Search doc ID, project, PI webmail…"
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
                                        {[
                                            "Document ID",
                                            "Project Code",
                                            "Project Title",
                                            "Supervisor (PI)",
                                            "Coordinating PI",
                                            "Workflow State",
                                            "Last Modified",
                                            "Upload Status",
                                            "Actions",
                                        ].map((h) => (
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
                                            <td colSpan={9} className="py-14 text-center text-[#A1A1AA] dark:text-[#71717A]">
                                                <CheckCircle2Icon className="w-7 h-7 mx-auto mb-2 text-emerald-400" />
                                                No documents match the current filter.
                                            </td>
                                        </tr>
                                    ) : (
                                        paginatedDocs.map((doc) => (
                                            <TableRow key={doc.name} doc={doc} onDone={() => mutate()} />
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
                                <PagBtn disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>
                                    <ChevronLeftIcon className="w-3.5 h-3.5" />
                                </PagBtn>
                                {getPageNumbers().map((p, i) =>
                                    typeof p === "string" ? (
                                        <span key={`e-${i}`} className="px-1 text-[#A1A1AA]">…</span>
                                    ) : (
                                        <PagBtn key={p} active={p === currentPage} onClick={() => setCurrentPage(p)}>
                                            {p}
                                        </PagBtn>
                                    ),
                                )}
                                <PagBtn disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>
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

const TableRow = ({ doc, onDone }: { doc: TopUpDoc; onDone: () => void }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);

    const uploaded = !!(doc.faculty_admission_pdf?.trim());

    const onDownload = () => {
        const url = `/api/method/frappe.utils.print_format.download_pdf?doctype=${encodeURIComponent(DOCTYPE)}&name=${encodeURIComponent(doc.name)}&format=Standard&no_letterhead=0`;
        window.open(url, "_blank");
    };

    const onView = () => {
        if (doc.faculty_admission_pdf) window.open(doc.faculty_admission_pdf, "_blank");
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
            fd.append("doctype", DOCTYPE);
            fd.append("docname", doc.name);
            fd.append("fieldname", "faculty_admission_pdf");

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

            const bindRes = await fetch(`/api/method/${topUpFellowshipAPI.attachFacultyAdmissionPdf}`, {
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
            console.error("Faculty Admission PDF upload failed", err);
            setErrMsg(err?.message || String(err));
        } finally {
            setIsUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <tr className="hover:bg-[#FAFAF9] dark:hover:bg-[#1E1E24] transition-colors">
            {/* Doc ID */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] font-mono text-[11px] text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                    <FileTextIcon className="w-3.5 h-3.5 text-[#A1A1AA] shrink-0" />
                    {doc.name}
                </div>
            </td>

            {/* Project Code */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap">
                {doc.project_code ?? <span className="text-[#A1A1AA]">—</span>}
            </td>

            {/* Project Title */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] max-w-[200px]">
                <span className="line-clamp-2 leading-snug">
                    {doc.project_title ?? <span className="text-[#A1A1AA]">—</span>}
                </span>
            </td>

            {/* Supervisor PI */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap">
                {doc.pi_webmail ?? <span className="text-[#A1A1AA]">—</span>}
            </td>

            {/* Coordinating PI */}
            <td className="px-3 py-2.5 border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap">
                {doc.coordinating_pi_webmail ?? <span className="text-[#A1A1AA]">—</span>}
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
                <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                        onClick={onDownload}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-bold bg-[#4A6CF7] hover:bg-[#3B5CF5] text-white transition-colors"
                        title="Download PDF for Faculty Admission"
                    >
                        <DownloadIcon className="w-3 h-3" /> Download
                    </button>

                    <input
                        ref={inputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={onFile}
                    />
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

export default TopUpFellowshipFacultyAdmission;
