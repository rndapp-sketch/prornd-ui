import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer, Download, X, Loader2, AlertTriangle, Paperclip } from "lucide-react";
import { buildPrintBundle, type BundleAttachment, type BundleResult } from "@/utils/pdfBundle";

/**
 * Print preview of a form merged with its uploaded documents into one PDF
 * (see buildPrintBundle). Each attachment can be left out before printing.
 */
export const PrintBundleModal = ({
    isOpen,
    onClose,
    htmlContent,
    attachments,
    docName,
    title = "Print Form + Documents",
}: {
    isOpen: boolean;
    onClose: () => void;
    htmlContent: string;
    attachments: BundleAttachment[];
    docName: string;
    title?: string;
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    // null until initialised for the current opening, so nothing is built twice
    const [selected, setSelected] = useState<string[] | null>(null);
    const [result, setResult] = useState<BundleResult | null>(null);
    const [blobUrl, setBlobUrl] = useState("");
    const [building, setBuilding] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Every attachment is selected each time the modal opens
    useEffect(() => {
        setSelected(isOpen ? attachments.map((a) => a.url) : null);
    }, [isOpen, attachments]);

    useEffect(() => {
        if (!isOpen || !htmlContent || !selected) return;
        let cancelled = false;
        let url = "";
        setBuilding(true);
        setError(null);
        buildPrintBundle(htmlContent, attachments.filter((a) => selected.includes(a.url)))
            .then((res) => {
                if (cancelled) return;
                url = URL.createObjectURL(res.blob);
                setResult(res);
                setBlobUrl(url);
            })
            .catch((err) => !cancelled && setError(err?.message || String(err)))
            .finally(() => !cancelled && setBuilding(false));
        return () => {
            cancelled = true;
            if (url) URL.revokeObjectURL(url);
        };
    }, [isOpen, htmlContent, attachments, selected]);

    const toggle = (url: string) =>
        setSelected((prev) => prev && (prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]));

    const handleDownload = () => {
        if (!blobUrl) return;
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = `${docName || "document"}-with-attachments.pdf`;
        a.click();
    };

    if (!isOpen) return null;

    const skippedUrls = new Set(result?.skipped.map((s) => s.attachment.url));

    return createPortal(
        <div className="fixed inset-0 bg-black/70 flex flex-col z-[99999]">
            <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{title} — {docName}</h3>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => iframeRef.current?.contentWindow?.print()}
                        disabled={building || !blobUrl}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                        onClick={handleDownload}
                        disabled={building || !blobUrl}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] hover:bg-[#c66a4e] text-white disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" /> Download PDF
                    </button>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="flex-1 flex min-h-0">
                <aside className="w-72 shrink-0 overflow-y-auto bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                    <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        Included in print
                    </p>
                    <label className="flex items-center gap-2 text-sm text-zinc-500">
                        <input type="checkbox" checked disabled /> Application form
                    </label>
                    {attachments.length === 0 && (
                        <p className="text-xs text-zinc-400 italic">No documents uploaded.</p>
                    )}
                    {attachments.map((a) => (
                        <label key={a.url} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                            <input
                                type="checkbox"
                                className="mt-0.5"
                                checked={!!selected?.includes(a.url)}
                                onChange={() => toggle(a.url)}
                                disabled={building}
                            />
                            <span className="min-w-0">
                                <span className="flex items-center gap-1 font-medium">
                                    <Paperclip className="w-3 h-3 shrink-0" /> {a.label}
                                </span>
                                <span className="block text-xs text-zinc-400 truncate">
                                    {decodeURIComponent(a.url.split("/").pop() || "")}
                                </span>
                                {!building && skippedUrls.has(a.url) && (
                                    <span className="flex items-center gap-1 text-xs text-amber-600">
                                        <AlertTriangle className="w-3 h-3" /> Could not be added — listed on last page
                                    </span>
                                )}
                            </span>
                        </label>
                    ))}
                </aside>
                <div className="flex-1 bg-zinc-300 relative">
                    {building && (
                        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm font-medium text-zinc-700 bg-zinc-300/80 z-10">
                            <Loader2 className="w-4 h-4 animate-spin" /> Preparing print…
                        </div>
                    )}
                    {error && (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-red-600 p-6 text-center">
                            Could not prepare the print: {error}
                        </div>
                    )}
                    {blobUrl && !error && (
                        <iframe ref={iframeRef} src={blobUrl} className="w-full h-full border-0" title="Print Preview" />
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
};
