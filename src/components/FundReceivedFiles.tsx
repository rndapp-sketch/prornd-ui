import React from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { ExternalLink, FileText } from "lucide-react";
import { getFileUrl } from "@/utils/fileUtils";

/** One object returned by rndopsapp.rndopsapp.file_api.list_files */
export interface ProjectFile {
    file_name: string;
    folder: string;
    file_url: string;
    size?: number;
    content_type?: string;
    last_modified?: string;
}

export const FUND_FOLDERS = ["fund_received", "fundreceived"];

const fmtSize = (n?: number) => {
    if (!n && n !== 0) return "—";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * The files MinIO holds for a project's Fund Received uploads
 * (Project_Registration/<project>/<fund_received|fundreceived>/<file>), read with file_api.list_files and
 * opened through file_api.get_file. `project` is the Project Registration name, e.g. 2026032801SERB000040.
 */
export const FundReceivedFiles: React.FC<{ project?: string | null }> = ({ project }) => {
    const { data, isLoading, error } = useFrappeGetCall<{
        message: { files?: ProjectFile[]; folders?: Record<string, number> };
    }>(
        "rndopsapp.rndopsapp.file_api.list_files",
        project ? { docname: project } : undefined,
        project ? undefined : null,
    );

    const files = React.useMemo(
        () => (data?.message?.files ?? []).filter((f) => FUND_FOLDERS.includes((f.folder || "").toLowerCase())),
        [data],
    );

    if (!project) return null;

    return (
        <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
            <div className="flex items-center gap-2 border-b border-[#E4E4E7] bg-[#FAFAF9] px-5 py-3 dark:border-[#3F3F46] dark:bg-[#27272A]">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#EEF2FF] text-[#4A6CF7] dark:bg-[#4A6CF7]/15">
                    <FileText className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Fund Received Files</h3>
                <span className="rounded-md bg-[#EEF2FF] px-2 py-0.5 font-mono text-[11px] font-bold text-[#3730A3] dark:bg-[#4A6CF7]/15 dark:text-[#C7D2FE]" title="Project docname">
                    {project}
                </span>
                <span className="ml-auto text-[11px] font-bold text-[#71717A]">
                    {isLoading ? "Loading…" : `${files.length} ${files.length === 1 ? "file" : "files"}`}
                </span>
            </div>
            <div className="divide-y divide-[#F4F4F5] dark:divide-[#3F3F46]/80">
                {isLoading ? (
                    <div className="px-5 py-5 text-center text-[13px] text-[#A1A1AA]">Fetching files…</div>
                ) : error ? (
                    <div className="px-5 py-5 text-center text-[13px] text-red-600 dark:text-red-400">Could not load files.</div>
                ) : files.length === 0 ? (
                    <div className="flex flex-col items-center gap-1 px-5 py-6 text-center">
                        <FileText className="h-6 w-6 text-[#D4D4D8] dark:text-[#52525B]" />
                        <p className="text-[13px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">No fund received files</p>
                    </div>
                ) : files.map((f) => (
                    <div key={`${f.folder}/${f.file_name}`} className="flex items-center gap-3 px-5 py-2.5">
                        <FileText className="h-4 w-4 shrink-0 text-[#4A6CF7]" />
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]" title={f.file_name}>{f.file_name}</p>
                            <p className="text-[11px] text-[#71717A]">
                                {f.folder} · {fmtSize(f.size)}
                                {f.last_modified ? ` · ${new Date(f.last_modified).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}` : ""}
                            </p>
                        </div>
                        <a
                            href={getFileUrl(f.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-[#4A6CF7] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#3558E8]"
                        >
                            <ExternalLink className="h-3 w-3" /> View
                        </a>
                        <a
                            href={getFileUrl(f.file_url)}
                            download={f.file_name}
                            className="inline-flex items-center rounded-lg border border-[#E4E4E7] px-3 py-1.5 text-[11px] font-bold text-[#52525B] transition-colors hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:text-[#D4D4D8] dark:hover:bg-[#3F3F46]"
                        >
                            Download
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FundReceivedFiles;
