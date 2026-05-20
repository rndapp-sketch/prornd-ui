import React from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { ArrowLeft, ExternalLink, FileText, Loader2, RefreshCw, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { icssAPI } from "@/services/apiService";
import { getFileUrl } from "@/utils/fileUtils";
import { cn } from "@/lib/utils";

type DirectorUploadRecord = {
    name: string;
    workflow_state?: string;
    modified?: string;
    director_signed_pdf?: string;
    project_no?: string;
    project_number?: string;
    project_ref?: string;
    project_name?: string;
    icss_applicant_name?: string;
    applicant_name?: string;
    icss_applicant_department__centre__section?: string;
    department?: string;
    icss_indent_type?: string;
    indent_type?: string;
};

type DirectorUploadRow = {
    doctype: "Indent Cum Sanction Sheet";
    name: string;
    workflowState: string;
    modified: string;
    directorSignedPdf: string;
    projectCode: string;
    projectTitle: string;
    applicant: string;
    department: string;
    indentType: string;
};

const getRecords = (payload: any): DirectorUploadRecord[] => {
    const message = payload?.message;
    if (Array.isArray(message?.data)) return message.data;
    if (Array.isArray(message)) return message;
    if (Array.isArray(payload?.data)) return payload.data;
    return [];
};

const mapIcssRecord = (record: DirectorUploadRecord): DirectorUploadRow => ({
    doctype: "Indent Cum Sanction Sheet",
    name: record.name,
    workflowState: record.workflow_state || "Pending Dean Approval",
    modified: record.modified || "",
    directorSignedPdf: record.director_signed_pdf || "",
    projectCode: record.project_no || record.project_number || "",
    projectTitle: record.project_name || record.project_ref || "",
    applicant: record.icss_applicant_name || record.applicant_name || "",
    department: record.icss_applicant_department__centre__section || record.department || "",
    indentType: record.icss_indent_type || record.indent_type || "",
});

const formatDateTime = (value: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

export default function DirectorPdfUpload() {
    const navigate = useNavigate();
    const [uploadingDoc, setUploadingDoc] = React.useState("");
    const [message, setMessage] = React.useState("");
    const fileInputs = React.useRef<Record<string, HTMLInputElement | null>>({});

    const {
        data: icssUploadData,
        isLoading,
        error,
        mutate,
    } = useFrappeGetCall(icssAPI.getPendingDirectorUploads, {});

    const { call: attachDirectorPdf } = useFrappePostCall(icssAPI.attachDirectorPdf);

    const rows = React.useMemo(() => {
        return getRecords(icssUploadData)
            .map(mapIcssRecord)
            .sort((a, b) => String(b.modified).localeCompare(String(a.modified)));
    }, [icssUploadData]);

    const handleUpload = async (row: DirectorUploadRow, file?: File | null) => {
        if (!file) return;

        setUploadingDoc(row.name);
        setMessage("");
        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("is_private", "0");
            formData.append("doctype", row.doctype);
            formData.append("docname", row.name);
            formData.append("fieldname", "director_signed_pdf");

            const uploadResponse = await fetch("/api/method/upload_file", {
                method: "POST",
                credentials: "include",
                headers: {
                    "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
                },
                body: formData,
            });
            const uploadJson = await uploadResponse.json().catch(() => ({}));

            if (!uploadResponse.ok) {
                throw new Error(
                    uploadJson?._server_messages ||
                        uploadJson?.message ||
                        "Failed to upload Director-signed PDF.",
                );
            }

            const fileUrl = uploadJson?.message?.file_url || uploadJson?.file_url;
            if (!fileUrl) {
                throw new Error("Upload completed but file URL was not returned.");
            }

            const attachResponse = await attachDirectorPdf({
                docname: row.name,
                file_url: fileUrl,
            });

            if (attachResponse?.message?.status === "error") {
                throw new Error(
                    attachResponse.message.message || "Failed to attach Director PDF to ICSS.",
                );
            }

            setMessage(`Director-signed PDF uploaded for ${row.name}.`);
            await mutate();
        } catch (uploadError: any) {
            console.error("Director PDF upload failed:", uploadError);
            setMessage(uploadError?.message || "Director PDF upload failed.");
        } finally {
            setUploadingDoc("");
            const input = fileInputs.current[row.name];
            if (input) input.value = "";
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAF9] p-4 md:p-8 dark:bg-[#18181B]">
            <main className="mx-auto max-w-6xl space-y-6">
                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="rounded-lg border border-zinc-200 bg-zinc-50 p-2 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
                            >
                                <ArrowLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
                            </button>
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D97757]">
                                    Director Approval
                                </p>
                                <h1 className="font-serif text-2xl font-medium text-zinc-900 dark:text-zinc-100">
                                    Director-Signed PDF Upload
                                </h1>
                                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                    Upload scanned Director-signed ICSS PDFs received offline.
                                </p>
                            </div>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => mutate()}
                            disabled={isLoading}
                            className="bg-white shadow-sm dark:bg-zinc-800"
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                            )}
                            Refresh
                        </Button>
                    </div>
                </div>

                {message && (
                    <div
                        className={cn(
                            "rounded-xl border px-4 py-3 text-sm font-medium",
                            message.toLowerCase().includes("failed")
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700",
                        )}
                    >
                        {message}
                    </div>
                )}

                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        Failed to load pending Director PDF uploads. Please confirm the ICSS backend endpoints are deployed.
                    </div>
                )}

                {isLoading ? (
                    <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                        <Loader2 className="h-7 w-7 animate-spin text-[#D97757]" />
                    </div>
                ) : rows.length ? (
                    <div className="grid gap-4">
                        {rows.map((row) => {
                            const pdfUrl = getFileUrl(row.directorSignedPdf);
                            const isUploading = uploadingDoc === row.name;

                            return (
                                <Card
                                    key={`${row.doctype}-${row.name}`}
                                    className="overflow-hidden border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                                >
                                    <CardContent className="space-y-4 p-5">
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <FileText className="h-4 w-4 text-[#D97757]" />
                                                    <h2 className="font-serif text-lg font-medium text-zinc-900 dark:text-zinc-100">
                                                        {row.doctype} · {row.name}
                                                    </h2>
                                                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                                                        {row.workflowState}
                                                    </span>
                                                    {row.directorSignedPdf && (
                                                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                                                            Uploaded
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-300 md:grid-cols-2">
                                                    <p><span className="font-medium text-zinc-800 dark:text-zinc-100">Project:</span> {row.projectCode || "Not provided"}</p>
                                                    <p><span className="font-medium text-zinc-800 dark:text-zinc-100">Applicant:</span> {row.applicant || "Not provided"}</p>
                                                    <p><span className="font-medium text-zinc-800 dark:text-zinc-100">Department:</span> {row.department || "Not provided"}</p>
                                                    <p><span className="font-medium text-zinc-800 dark:text-zinc-100">Indent Type:</span> {row.indentType || "Not provided"}</p>
                                                    <p><span className="font-medium text-zinc-800 dark:text-zinc-100">Modified:</span> {formatDateTime(row.modified) || "Not available"}</p>
                                                    <p><span className="font-medium text-zinc-800 dark:text-zinc-100">Project Ref:</span> {row.projectTitle || "Not provided"}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2 lg:justify-end">
                                                {pdfUrl && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={() => window.open(pdfUrl, "_blank", "noopener,noreferrer")}
                                                        className="bg-white dark:bg-zinc-800"
                                                    >
                                                        <ExternalLink className="mr-2 h-4 w-4" />
                                                        View Current
                                                    </Button>
                                                )}
                                                <input
                                                    ref={(node) => {
                                                        fileInputs.current[row.name] = node;
                                                    }}
                                                    type="file"
                                                    accept="application/pdf,.pdf"
                                                    className="hidden"
                                                    onChange={(event) =>
                                                        handleUpload(row, event.target.files?.[0])
                                                    }
                                                />
                                                <Button
                                                    type="button"
                                                    onClick={() => fileInputs.current[row.name]?.click()}
                                                    disabled={isUploading}
                                                    className="bg-[#D97757] text-white hover:bg-[#C96745]"
                                                >
                                                    {isUploading ? (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Upload className="mr-2 h-4 w-4" />
                                                    )}
                                                    {row.directorSignedPdf ? "Replace PDF" : "Upload PDF"}
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-dashed border-zinc-300 bg-white p-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
                        <FileText className="mx-auto mb-3 h-8 w-8 text-zinc-400" />
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                            No ICSS documents waiting for Director PDF upload
                        </h2>
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            Documents appear here after Dean marks them for Director approval.
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
