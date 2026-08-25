import React, { useEffect, useMemo, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import {
    AlertCircleIcon,
    ArchiveIcon,
    DownloadIcon,
    FileSpreadsheetIcon,
    Loader2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface LegacyFile {
    file_name: string;
    rel_path: string;
    file_ext: string;
}

export interface LegacyMapping {
    source_system: string;
    old_project_number: string;
    old_project_title: string;
    old_pi_name: string;
    old_status: string;
    match_method: string;
    title_similarity: number;
}

export interface LegacyFilesResponse {
    has_mapping: boolean;
    mapping?: LegacyMapping;
    files: LegacyFile[];
}

interface LegacySheet {
    name: string;
    rows: (string | number | boolean | null)[][];
    truncated: boolean;
    column_count: number;
}

interface LegacyFileData {
    file_name: string;
    source_system: string;
    size: number;
    sheets: LegacySheet[];
}

/**
 * SWR dedupes this against the identical call in ProjectDetailsOverview (which
 * uses it to decide whether the tab is shown at all), so the tab costs no extra
 * request.
 */
export const useLegacyFiles = (docname?: string) =>
    useFrappeGetCall<{ message: LegacyFilesResponse }>(
        "rndopsapp.legacy.api.get_legacy_files",
        { docname },
        docname ? undefined : null,
    );

const buildDownloadUrl = (docname: string, relPath: string) => {
    let baseUrl = import.meta.env.VITE_FRAPPE_URL;
    if (!baseUrl) {
        baseUrl = window.location.origin;
    } else if (baseUrl.startsWith("/")) {
        baseUrl = `${window.location.origin}${baseUrl}`;
    }
    const params = new URLSearchParams({ docname, rel_path: relPath });
    return `${baseUrl.replace(/\/$/, "")}/api/method/rndopsapp.legacy.api.download_legacy_file?${params}`;
};

const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatCell = (value: string | number | boolean | null) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    return String(value);
};

const DetailItem: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
    <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wide text-[#71717A] dark:text-[#A1A1AA]">
            {label}
        </div>
        <div className="mt-0.5 text-sm text-[#27272A] dark:text-[#E4E4E7] break-words">
            {value || <span className="text-[#A1A1AA]">&mdash;</span>}
        </div>
    </div>
);

const LegacyProjectExcel: React.FC<{ docname: string }> = ({ docname }) => {
    const { data, error, isLoading } = useLegacyFiles(docname);
    const payload = data?.message;
    const files = useMemo(() => payload?.files ?? [], [payload]);

    const [selectedPath, setSelectedPath] = useState<string>("");
    const [activeSheet, setActiveSheet] = useState(0);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (files.length && !files.some((file) => file.rel_path === selectedPath)) {
            setSelectedPath(files[0].rel_path);
        }
    }, [files, selectedPath]);

    useEffect(() => setActiveSheet(0), [selectedPath]);

    const {
        data: sheetData,
        error: sheetError,
        isLoading: isSheetLoading,
    } = useFrappeGetCall<{ message: LegacyFileData }>(
        "rndopsapp.legacy.api.get_legacy_file_data",
        { docname, rel_path: selectedPath },
        docname && selectedPath ? undefined : null,
    );

    const selectedFile = files.find((file) => file.rel_path === selectedPath);
    const workbook = sheetData?.message;
    const sheet = workbook?.sheets?.[activeSheet];

    const handleDownload = async () => {
        if (!selectedFile || isDownloading) return;
        setIsDownloading(true);
        try {
            const response = await fetch(buildDownloadUrl(docname, selectedFile.rel_path), {
                method: "GET",
                headers: { Accept: "*/*" },
                credentials: "include",
            });
            if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = selectedFile.file_name;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch {
            alert("Could not download this file. The legacy file server may be unreachable.");
        } finally {
            setIsDownloading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 p-6 text-sm text-[#71717A] dark:text-[#A1A1AA]">
                <Loader2Icon className="h-4 w-4 animate-spin" /> Loading legacy record&hellip;
            </div>
        );
    }

    if (error || !payload?.has_mapping) {
        return (
            <div className="flex items-start gap-2 p-6 text-sm text-[#71717A] dark:text-[#A1A1AA]">
                <AlertCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>No legacy record is linked to this project.</span>
            </div>
        );
    }

    const mapping = payload.mapping;

    return (
        <div className="space-y-4 p-1">
            <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB]/70 p-4 dark:border-[#F59E0B]/30 dark:bg-[#F59E0B]/10">
                <div className="mb-3 flex items-center gap-2">
                    <ArchiveIcon className="h-4 w-4 text-[#B45309] dark:text-[#FCD34D]" />
                    <h3 className="text-[11px] font-bold uppercase tracking-wide text-[#B45309] dark:text-[#FCD34D]">
                        Migrated from {mapping?.source_system}
                    </h3>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <DetailItem label="Old Project Number" value={mapping?.old_project_number} />
                    <DetailItem label="Old PI" value={mapping?.old_pi_name} />
                    <DetailItem label="Old Status" value={mapping?.old_status} />
                    <DetailItem
                        label="Match Confidence"
                        value={
                            mapping?.title_similarity
                                ? `${mapping.title_similarity}% (${mapping.match_method})`
                                : mapping?.match_method
                        }
                    />
                    <div className="sm:col-span-2 lg:col-span-4">
                        <DetailItem label="Old Project Title" value={mapping?.old_project_title} />
                    </div>
                </div>
            </div>

            {files.length === 0 ? (
                <div className="flex items-start gap-2 rounded-xl border border-[#D4D4D8] p-6 text-sm text-[#71717A] dark:border-[#52525B] dark:text-[#A1A1AA]">
                    <AlertCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                        This project was migrated from {mapping?.source_system}, but no legacy Excel
                        sheet was found for it on the file server.
                    </span>
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-[#D4D4D8] dark:border-[#52525B]">
                    <div className="flex flex-wrap items-center gap-2 border-b border-[#D4D4D8] bg-[#FAFAF9] p-2 dark:border-[#52525B] dark:bg-[#27272A]">
                        {files.length > 1 ? (
                            <select
                                value={selectedPath}
                                onChange={(event) => setSelectedPath(event.target.value)}
                                className="h-8 min-w-0 max-w-full flex-1 rounded-lg border border-[#D4D4D8] bg-white px-2 text-xs font-medium text-[#27272A] dark:border-[#52525B] dark:bg-[#18181B] dark:text-[#E4E4E7]"
                            >
                                {files.map((file) => (
                                    <option key={file.rel_path} value={file.rel_path}>
                                        {file.file_name}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex min-w-0 flex-1 items-center gap-1.5 text-xs font-bold text-[#27272A] dark:text-[#E4E4E7]">
                                <FileSpreadsheetIcon className="h-3.5 w-3.5 flex-shrink-0 text-[#059669]" />
                                <span className="truncate">{selectedFile?.file_name}</span>
                            </div>
                        )}

                        {workbook && (
                            <span className="text-[10px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                {formatBytes(workbook.size)}
                            </span>
                        )}

                        <button
                            onClick={handleDownload}
                            disabled={isDownloading || !selectedFile}
                            className="flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 text-[11px] font-bold uppercase tracking-wide text-[#047857] transition-colors hover:bg-[#D1FAE5] disabled:opacity-50 dark:border-[#10B981]/30 dark:bg-[#10B981]/10 dark:text-[#A7F3D0]"
                        >
                            {isDownloading ? (
                                <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <DownloadIcon className="h-3.5 w-3.5" />
                            )}
                            Download
                        </button>
                    </div>

                    {workbook && workbook.sheets.length > 1 && (
                        <div className="flex gap-1 overflow-x-auto border-b border-[#D4D4D8] bg-white p-1.5 dark:border-[#52525B] dark:bg-[#18181B]">
                            {workbook.sheets.map((item, index) => (
                                <button
                                    key={item.name}
                                    onClick={() => setActiveSheet(index)}
                                    className={cn(
                                        "flex-shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-bold transition-colors",
                                        index === activeSheet
                                            ? "border-[#059669] bg-[#059669] text-white"
                                            : "border-[#D4D4D8] bg-white text-[#52525B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8]",
                                    )}
                                >
                                    {item.name}
                                </button>
                            ))}
                        </div>
                    )}

                    {isSheetLoading && (
                        <div className="flex items-center gap-2 p-6 text-sm text-[#71717A] dark:text-[#A1A1AA]">
                            <Loader2Icon className="h-4 w-4 animate-spin" /> Reading sheet&hellip;
                        </div>
                    )}

                    {sheetError && (
                        <div className="flex items-start gap-2 p-6 text-sm text-[#B91C1C] dark:text-[#FCA5A5]">
                            <AlertCircleIcon className="mt-0.5 h-4 w-4 flex-shrink-0" />
                            <span>
                                {(sheetError as { message?: string })?.message ||
                                    "This sheet could not be read. Try downloading the file instead."}
                            </span>
                        </div>
                    )}

                    {sheet && !isSheetLoading && !sheetError && (
                        <>
                            <div className="max-h-[60vh] overflow-auto">
                                <table className="w-full border-collapse text-xs">
                                    <tbody>
                                        {sheet.rows.map((row, rowIndex) => (
                                            <tr
                                                key={rowIndex}
                                                className={cn(
                                                    rowIndex % 2 === 1 &&
                                                        "bg-[#FAFAF9] dark:bg-[#27272A]/50",
                                                )}
                                            >
                                                <td className="sticky left-0 z-10 w-10 border border-[#E4E4E7] bg-[#F4F4F5] px-1.5 py-1 text-center text-[10px] font-bold text-[#A1A1AA] dark:border-[#3F3F46] dark:bg-[#27272A]">
                                                    {rowIndex + 1}
                                                </td>
                                                {row.map((cell, cellIndex) => (
                                                    <td
                                                        key={cellIndex}
                                                        className="max-w-[260px] whitespace-pre-wrap break-words border border-[#E4E4E7] px-2 py-1 align-top text-[#27272A] dark:border-[#3F3F46] dark:text-[#E4E4E7]"
                                                    >
                                                        {formatCell(cell)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {sheet.truncated && (
                                <div className="border-t border-[#D4D4D8] bg-[#FFFBEB] px-3 py-2 text-[11px] font-medium text-[#B45309] dark:border-[#52525B] dark:bg-[#F59E0B]/10 dark:text-[#FCD34D]">
                                    Showing the first {sheet.rows.length} rows only &mdash; download
                                    the file to see the rest.
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default LegacyProjectExcel;
