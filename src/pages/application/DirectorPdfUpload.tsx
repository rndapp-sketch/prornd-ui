import { useRef, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { FileTextIcon, UploadIcon, EyeIcon, RefreshCwIcon } from "lucide-react";
import { FrappeButton } from "@/components/ui/neo-brutalism";
import { selectionCommitteeReportAPI, icssAPI } from "@/services/apiService";
import { DepartmentName } from "@/components/DepartmentName";

type PendingDoc = {
    name: string;
    _doctype: "Selection Committee Report" | "Indent Cum Sanction Sheet";
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

const DirectorPdfUpload = () => {
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

    const isLoading = scrLoading || icssLoading;
    const error = scrError || icssError;

    const scrDocs: PendingDoc[] = (scrData?.message?.data ?? []).map((d) => ({
        ...d,
        _doctype: "Selection Committee Report" as const,
        _attachApi: selectionCommitteeReportAPI.attachDirectorPdf,
    }));

    const icssDocs: PendingDoc[] = (icssData?.message?.data ?? []).map((d) => ({
        ...d,
        _doctype: "Indent Cum Sanction Sheet" as const,
        _attachApi: icssAPI.attachDirectorPdf,
    }));

    const docs = [...icssDocs, ...scrDocs];

    const mutateAll = () => {
        scrMutate();
        icssMutate();
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <header className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                        Director-Signed PDF Upload
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Upload the Director-signed scan for documents pending Director approval.
                    </p>
                </div>
                <FrappeButton
                    onClick={mutateAll}
                    className="bg-zinc-700 hover:bg-zinc-800 text-white"
                >
                    <RefreshCwIcon className="w-4 h-4 mr-1.5 inline" /> Refresh
                </FrappeButton>
            </header>

            {isLoading && (
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    Loading…
                </div>
            )}
            {error && (
                <div className="text-sm text-red-600 dark:text-red-400">
                    Failed to load: {String((error as any).message || error)}
                </div>
            )}

            {!isLoading && !error && docs.length === 0 && (
                <div className="p-8 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    No pending Director PDF uploads.
                </div>
            )}

            <div className="grid gap-4">
                {docs.map((d) => (
                    <UploadCard key={`${d._doctype}-${d.name}`} doc={d} onDone={mutateAll} />
                ))}
            </div>
        </div>
    );
};

const UploadCard = ({ doc, onDone }: { doc: PendingDoc; onDone: () => void }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [errMsg, setErrMsg] = useState<string | null>(null);

    const uploaded = !!(doc.director_signed_pdf && doc.director_signed_pdf.trim());

    const onPick = () => inputRef.current?.click();

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
            const res = await fetch("/api/method/upload_file", {
                method: "POST",
                body: fd,
                credentials: "include",
                headers: csrfToken ? { "X-Frappe-CSRF-Token": csrfToken } : undefined,
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
            console.error("Director PDF upload failed", err);
            setErrMsg(err?.message || String(err));
        } finally {
            setIsUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
                <FileTextIcon className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                    {doc._doctype} · {doc.name}
                </span>
                {uploaded && (
                    <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Uploaded
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-zinc-600 dark:text-zinc-300 mb-3">
                {doc.project_number && (
                    <div>
                        <span className="text-zinc-400">Project Code: </span>
                        {doc.project_number}
                    </div>
                )}
                {doc.upfa_department && (
                    <div>
                        <span className="text-zinc-400">Department: </span>
                        <DepartmentName name={doc.upfa_department} />
                    </div>
                )}
                {doc.principal_investigator && (
                    <div>
                        <span className="text-zinc-400">PI: </span>
                        {doc.principal_investigator}
                    </div>
                )}
                {doc.interview_id && (
                    <div>
                        <span className="text-zinc-400">Interview Ref: </span>
                        {doc.interview_id}
                    </div>
                )}
                {doc.modified && (
                    <div>
                        <span className="text-zinc-400">Last modified: </span>
                        {new Date(doc.modified).toLocaleString()}
                    </div>
                )}
                {doc.project_name && (
                    <div className="md:col-span-2">
                        <span className="text-zinc-400">Title: </span>
                        {doc.project_name}
                    </div>
                )}
            </div>

            {errMsg && (
                <div className="text-xs text-red-600 dark:text-red-400 mb-2">
                    {errMsg}
                </div>
            )}

            <div className="flex gap-2 flex-wrap">
                <input
                    ref={inputRef}
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={onFile}
                />
                <FrappeButton
                    onClick={onPick}
                    disabled={isUploading}
                    className="bg-[#D97757] hover:bg-[#c66a4e] text-white"
                >
                    <UploadIcon className="w-4 h-4 mr-1.5 inline" />
                    {uploaded
                        ? isUploading ? "Replacing…" : "Replace PDF"
                        : isUploading ? "Uploading…" : "Upload PDF"}
                </FrappeButton>
                {uploaded && (
                    <FrappeButton
                        onClick={onView}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        <EyeIcon className="w-4 h-4 mr-1.5 inline" /> View current
                    </FrappeButton>
                )}
            </div>
        </div>
    );
};

export default DirectorPdfUpload;
