import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import { createPortal } from "react-dom";
import {
    Printer,
    Download,
    Save,
    Upload,
    X,
    FileText,
    Loader2,
    CheckCircle2,
    Pencil,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { generatePOHtml, DEFAULT_TERMS } from "@/utils/poPrint";

// ── Terms Editor Modal ──────────────────────────────────────────────────────
const icons = {
    bold: (
        <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
        </svg>
    ),
    italic: (
        <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="19" y1="4" x2="10" y2="4" />
            <line x1="14" y1="20" x2="5" y2="20" />
            <line x1="15" y1="4" x2="9" y2="20" />
        </svg>
    ),
    underline: (
        <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
            <line x1="4" y1="21" x2="20" y2="21" />
        </svg>
    ),
    orderedList: (
        <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="10" y1="6" x2="21" y2="6" />
            <line x1="10" y1="12" x2="21" y2="12" />
            <line x1="10" y1="18" x2="21" y2="18" />
            <path d="M4 6h1v4" />
            <path d="M4 10h2" />
            <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
        </svg>
    ),
    unorderedList: (
        <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <circle cx="3" cy="6" r="1" fill="currentColor" />
            <circle cx="3" cy="12" r="1" fill="currentColor" />
            <circle cx="3" cy="18" r="1" fill="currentColor" />
        </svg>
    ),
    undo: (
        <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M21 9v6h-6" />
            <path d="M3 10a9 9 0 0 1 9-4.56V4l-4 4 4 4v-1.44A7 7 0 0 0 7.03 15" />
        </svg>
    ),
    redo: (
        <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M3 9v6h6" />
            <path d="M21 10a9 9 0 0 0-9-4.56V4l4 4-4 4v-1.44A7 7 0 0 1 16.97 15" />
        </svg>
    ),
};

const TBtn = ({
    cmd,
    title,
    children,
    active,
}: {
    cmd: string;
    title: string;
    children: React.ReactNode;
    active?: boolean;
}) => (
    <button
        onMouseDown={(e) => {
            e.preventDefault();
            document.execCommand(cmd, false, undefined);
        }}
        title={title}
        className={`p-1.5 rounded transition-colors ${active ? "bg-[#D97757]/20 text-[#D97757]" : "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"}`}
    >
        {children}
    </button>
);

const TermsEditorModal = ({
    isOpen,
    initialHtml,
    onClose,
    onSave,
}: {
    isOpen: boolean;
    initialHtml: string;
    onClose: () => void;
    onSave: (html: string) => void;
}) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const [active, setActive] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (isOpen && editorRef.current) {
            editorRef.current.innerHTML = initialHtml;
            editorRef.current.focus();
        }
    }, [isOpen, initialHtml]);

    useEffect(() => {
        if (!isOpen) return;
        const update = () => {
            setActive({
                bold: document.queryCommandState("bold"),
                italic: document.queryCommandState("italic"),
                underline: document.queryCommandState("underline"),
                insertOrderedList:
                    document.queryCommandState("insertOrderedList"),
                insertUnorderedList: document.queryCommandState(
                    "insertUnorderedList",
                ),
            });
        };
        document.addEventListener("selectionchange", update);
        return () => document.removeEventListener("selectionchange", update);
    }, [isOpen]);

    const handleSave = () => {
        onSave(editorRef.current?.innerHTML || "");
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Edit Terms &amp; Conditions
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1 px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 shrink-0">
                    <TBtn cmd="undo" title="Undo">
                        {icons.undo}
                    </TBtn>
                    <TBtn cmd="redo" title="Redo">
                        {icons.redo}
                    </TBtn>
                    <span className="w-px h-5 bg-zinc-300 dark:bg-zinc-600 mx-1" />
                    <TBtn cmd="bold" title="Bold" active={active.bold}>
                        {icons.bold}
                    </TBtn>
                    <TBtn cmd="italic" title="Italic" active={active.italic}>
                        {icons.italic}
                    </TBtn>
                    <TBtn
                        cmd="underline"
                        title="Underline"
                        active={active.underline}
                    >
                        {icons.underline}
                    </TBtn>
                    <span className="w-px h-5 bg-zinc-300 dark:bg-zinc-600 mx-1" />
                    <TBtn
                        cmd="insertOrderedList"
                        title="Ordered List"
                        active={active.insertOrderedList}
                    >
                        {icons.orderedList}
                    </TBtn>
                    <TBtn
                        cmd="insertUnorderedList"
                        title="Unordered List"
                        active={active.insertUnorderedList}
                    >
                        {icons.unorderedList}
                    </TBtn>
                </div>

                {/* Editable content */}
                <div className="flex-1 overflow-y-auto p-5">
                    <div
                        ref={editorRef}
                        contentEditable
                        suppressContentEditableWarning
                        className="outline-none min-h-[300px] text-sm text-zinc-900 dark:text-zinc-100 prose dark:prose-invert max-w-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                    />
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] hover:bg-[#c66a4e] text-white"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

// ── Types ──────────────────────────────────────────────────────────────────
interface POEditorProps {
    ssData: Record<string, any>;
    dpId: string;
    isStaffRnD?: boolean;
    isPIReadOnly?: boolean;
    sourceLabel?: string;
    isSaved?: boolean;
    isDirty?: boolean;
    onChange?: (nextPoData: Record<string, any>) => void;
    onSave?: (poData: Record<string, any>) => Promise<void>;
    onUploadSignedPO?: (file: File) => Promise<void>;
}

// ── Preview Modal (reuses P11PrintModal pattern) ───────────────────────────
const PreviewModal = ({
    isOpen,
    onClose,
    htmlContent,
    docName,
}: {
    isOpen: boolean;
    onClose: () => void;
    htmlContent: string;
    docName: string;
}) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const blobUrl = useMemo(() => {
        if (!isOpen || !htmlContent) return "";
        return URL.createObjectURL(
            new Blob([htmlContent], { type: "text/html" }),
        );
    }, [isOpen, htmlContent]);

    useEffect(() => {
        return () => {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
    }, [blobUrl]);

    const handlePrint = () => {
        iframeRef.current?.contentWindow?.print();
    };

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            // Render into an iframe so <style> and fonts are properly applied
            const iframe = document.createElement("iframe");
            iframe.style.cssText =
                "position:fixed;left:-99999px;top:0;width:794px;height:1123px;border:0;visibility:hidden;";
            document.body.appendChild(iframe);
            const iDoc = iframe.contentDocument!;
            iDoc.open();
            iDoc.write(htmlContent);
            iDoc.close();
            // Wait for fonts and images to load
            await new Promise((r) => setTimeout(r, 1200));
            try {
                await (iDoc as any).fonts?.ready;
            } catch { }

            const page =
                (iDoc.querySelector(".page") as HTMLElement) || iDoc.body;
            const canvas = await html2canvas(page, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                windowWidth: 794,
            });
            document.body.removeChild(iframe);

            const margin = 15; // mm
            const pdf = new jsPDF("p", "mm", "a4");
            const pageW = pdf.internal.pageSize.getWidth();
            const pageH = pdf.internal.pageSize.getHeight();
            const contentW = pageW - margin * 2;
            const contentH = pageH - margin * 2;
            // px per mm based on content width
            const pxPerMm = canvas.width / contentW;
            const contentHpx = Math.floor(contentH * pxPerMm);
            const totalPages = Math.ceil(canvas.height / contentHpx);

            for (let i = 0; i < totalPages; i++) {
                if (i > 0) pdf.addPage();
                const sliceH = Math.min(
                    contentHpx,
                    canvas.height - i * contentHpx,
                );
                const sliceCanvas = document.createElement("canvas");
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = sliceH;
                const ctx = sliceCanvas.getContext("2d")!;
                ctx.drawImage(
                    canvas,
                    0,
                    i * contentHpx,
                    canvas.width,
                    sliceH,
                    0,
                    0,
                    canvas.width,
                    sliceH,
                );
                const sliceImg = sliceCanvas.toDataURL("image/png");
                const sliceHmm = sliceH / pxPerMm;
                pdf.addImage(
                    sliceImg,
                    "PNG",
                    margin,
                    margin,
                    contentW,
                    sliceHmm,
                );
            }
            pdf.save(`PO-${docName || "form"}.pdf`);
        } catch (err) {
            console.error("PDF generation failed:", err);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 flex flex-col z-[99999]">
            <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">
                    Purchase Order Preview — {docName}
                </h3>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                    >
                        <Printer className="w-4 h-4" /> Print
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] hover:bg-[#c66a4e] text-white disabled:opacity-60"
                    >
                        <Download className="w-4 h-4" />
                        {isGeneratingPdf ? "Generating…" : "Download PDF"}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-auto bg-zinc-300">
                <iframe
                    ref={iframeRef}
                    src={blobUrl}
                    className="w-full h-full border-0"
                    title="PO Print Preview"
                />
            </div>
        </div>,
        document.body,
    );
};

// ── Main PO Editor ─────────────────────────────────────────────────────────
export const POEditor: React.FC<POEditorProps> = ({
    ssData,
    dpId,
    isStaffRnD = false,
    isPIReadOnly = false,
    sourceLabel: _sourceLabel,
    isSaved: _isSaved,
    isDirty: _isDirty,
    onChange,
    onSave,
    onUploadSignedPO,
}) => {
    // Editable fields local to PO editor
    const [poData, setPoData] = useState<Record<string, any>>({});
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isTermsEditorOpen, setIsTermsEditorOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync uploadedFile from ssData.file_path
    useEffect(() => {
        if (ssData?.file_path) {
            setUploadedFile(ssData.file_path);
        }
    }, [ssData?.file_path]);

    // Initialize PO data from sanction sheet
    useEffect(() => {
        if (ssData && Object.keys(ssData).length > 0) {
            setPoData({
                ...ssData,
                po_number: ssData.name || "",
                po_date: new Date().toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                }),
                vendor_address: ssData.ss_name_of_firms || "",
                quotation_no: "",
                signee_name: "",
                signee_designation: "",
                amount_in_words: "",
                terms_and_conditions:
                    ssData.terms_and_conditions || DEFAULT_TERMS,
            });
        }
    }, [ssData]);

    const handleFieldChange = useCallback((field: string, value: string) => {
        setPoData((prev) => {
            const next = { ...prev, [field]: value };
            onChange?.(next);
            return next;
        });
    }, [onChange]);

    const handleSave = async () => {
        if (!onSave) return;
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await onSave(poData);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Save failed:", err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = async (
        e: React.ChangeEvent<HTMLInputElement>,
    ) => {
        const file = e.target.files?.[0];
        if (!file || !onUploadSignedPO) return;

        const allowed = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/jpg",
        ];
        if (!allowed.includes(file.type)) {
            alert("Please upload a PDF, JPG, or PNG file.");
            return;
        }

        setIsUploading(true);
        try {
            await onUploadSignedPO(file);
            setUploadedFile(file.name);
        } catch (err) {
            console.error("Upload failed:", err);
        } finally {
            setIsUploading(false);
            e.target.value = "";
        }
    };

    // Editable fields config
    const editableFields = [
        {
            key: "vendor_address",
            label: "Vendor Name / Address (TO:)",
            type: "textarea" as const,
        },
        { key: "po_number", label: "P.O. Number", type: "text" as const },
        { key: "po_date", label: "P.O. Date", type: "text" as const },
        {
            key: "quotation_no",
            label: "Quotation Reference No.",
            type: "text" as const,
        },
        {
            key: "amount_in_words",
            label: "Amount in Words",
            type: "text" as const,
        },
        { key: "signee_name", label: "Signee Name", type: "text" as const },
        {
            key: "signee_designation",
            label: "Signee Designation",
            type: "text" as const,
        },
    ];

    return (
        <div className="space-y-5 min-w-0 overflow-x-hidden">
            {/* Action bar */}
            <div className="flex items-center justify-between flex-wrap gap-3 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className="text-[15px] font-extrabold text-zinc-900 dark:text-zinc-100">
                        Purchase Order
                    </h3>
                    {isPIReadOnly && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            Read-only
                        </span>
                    )}
                </div>
                {isStaffRnD && (
                    <div className="flex items-center gap-2 flex-wrap">
                        {onSave && (
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : saveSuccess ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isSaving
                                    ? "Saving…"
                                    : saveSuccess
                                        ? "Saved"
                                        : "Save"}
                            </button>
                        )}
                        <button
                            onClick={() => setIsPreviewOpen(true)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                        >
                            <FileText className="w-4 h-4" /> Preview & Print
                        </button>
                        {/*<button
                            onClick={async () => {
                                const html = generatePOHtml(poData);
                                const iframe = document.createElement("iframe");
                                iframe.style.cssText = "position:fixed;left:-99999px;top:0;width:794px;height:1123px;border:0;visibility:hidden;";
                                document.body.appendChild(iframe);
                                const iDoc = iframe.contentDocument!;
                                iDoc.open(); iDoc.write(html); iDoc.close();
                                await new Promise((r) => setTimeout(r, 1200));
                                try { await (iDoc as any).fonts?.ready; } catch {}
                                const page = iDoc.querySelector(".page") as HTMLElement || iDoc.body;
                                const canvas = await html2canvas(page, { scale: 2, useCORS: true, allowTaint: true, logging: false, windowWidth: 794 });
                                document.body.removeChild(iframe);
                                const margin = 15;
                                const pdf = new jsPDF("p", "mm", "a4");
                                const pageW = pdf.internal.pageSize.getWidth();
                                const pageH = pdf.internal.pageSize.getHeight();
                                const contentW = pageW - margin * 2;
                                const contentH = pageH - margin * 2;
                                const pxPerMm = canvas.width / contentW;
                                const contentHpx = Math.floor(contentH * pxPerMm);
                                const totalPages = Math.ceil(canvas.height / contentHpx);
                                for (let i = 0; i < totalPages; i++) {
                                    if (i > 0) pdf.addPage();
                                    const sliceH = Math.min(contentHpx, canvas.height - i * contentHpx);
                                    const sliceCanvas = document.createElement("canvas");
                                    sliceCanvas.width = canvas.width;
                                    sliceCanvas.height = sliceH;
                                    const ctx = sliceCanvas.getContext("2d")!;
                                    ctx.drawImage(canvas, 0, i * contentHpx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
                                    pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", margin, margin, contentW, sliceH / pxPerMm);
                                }
                                pdf.save(`PO-${poData.po_number || dpId || "form"}.pdf`);
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] hover:bg-[#c66a4e] text-white"
                        >
                            <Download className="w-4 h-4" /> Download PDF
                        </button>*/}
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileSelected}
                                className="hidden"
                            />
                            <button
                                onClick={handleUploadClick}
                                disabled={isUploading}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                            >
                                {isUploading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Upload className="w-4 h-4" />
                                )}
                                {isUploading
                                    ? "Uploading…"
                                    : "Upload Signed PO"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {uploadedFile && (
                <div className="flex items-center justify-between flex-wrap gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="font-medium">
                            Signed PO document uploaded
                        </span>
                    </div>
                    <a
                        href={
                            uploadedFile.startsWith("/")
                                ? uploadedFile
                                : `/${uploadedFile}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        download
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Download Signed PO
                    </a>
                </div>
            )}
            {uploadedFile && isStaffRnD && (
                <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
                    <svg
                        className="w-4 h-4 mt-0.5 shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>
                        The signed PO has been uploaded. Please click the <strong>Generate PO</strong> to notify the PI to proceed.
                    </span>
                </div>
            )}

            {/* PO Details Fields */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        PO Details
                    </h4>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {editableFields.map(({ key, label, type }) => (
                        <div
                            key={key}
                            className={
                                type === "textarea" ? "md:col-span-2" : ""
                            }
                        >
                            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                {label}
                            </label>
                            {type === "textarea" ? (
                                <textarea
                                    value={poData[key] || ""}
                                    onChange={(e) =>
                                        handleFieldChange(key, e.target.value)
                                    }
                                    rows={
                                        key === "terms_and_conditions" ? 6 : 3
                                    }
                                    disabled={isPIReadOnly}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[12px] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] resize-y disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-500"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={poData[key] || ""}
                                    onChange={(e) =>
                                        handleFieldChange(key, e.target.value)
                                    }
                                    disabled={isPIReadOnly}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[12px] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-500"
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Read-only Prefilled Data */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Prefilled from Sanction Sheet
                    </h4>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3">
                    {[
                        ["Applicant", poData.ss_applicant_name],
                        ["Department", poData.ss_department_for_purchase],
                        ["Account Head", poData.ss_account_head],
                        ["Funding Agency", poData.ss_funding_agency],
                        ["Firm(s)", poData.ss_name_of_firms],
                        ["Project No.", poData.project_no],
                        ["File No.", poData.ss_file_number],
                        ["Grand Total", poData.ss_grand_total],
                    ].map(([label, value]) => (
                        <div key={label as string}>
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">
                                {label}
                            </p>
                            <p className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 break-words">
                                {value || "—"}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Items table */}
                {Array.isArray(poData.table_bttk) &&
                    poData.table_bttk.length > 0 && (
                        <div className="px-4 pb-4">
                            <p className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                                Items
                            </p>
                            <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <table className="w-full table-fixed text-[11px]">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                                        <tr>
                                            {[
                                                "#",
                                                "Item",
                                                "Make",
                                                "Model",
                                                "Qty",
                                                "Unit Price",
                                                "Discount",
                                                "GST",
                                                "Total",
                                            ].map((h) => (
                                                <th
                                                    key={h}
                                                    className="px-2 py-2 text-left text-[10px] font-extrabold uppercase text-zinc-500 dark:text-zinc-400 break-words"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {poData.table_bttk.map(
                                            (row: any, i: number) => (
                                                <tr
                                                    key={i}
                                                    className="border-t border-zinc-100 dark:border-zinc-800"
                                                >
                                                    <td className="px-2 py-2 align-top text-zinc-500">
                                                        {i + 1}
                                                    </td>
                                                    <td className="px-2 py-2 align-top break-words">
                                                        {row.item_name}
                                                    </td>
                                                    <td className="px-2 py-2 align-top break-words">
                                                        {row.item_make}
                                                    </td>
                                                    <td className="px-2 py-2 align-top break-words">
                                                        {row.item_model}
                                                    </td>
                                                    <td className="px-2 py-2 align-top break-words">
                                                        {row.item_quantity}
                                                    </td>
                                                    <td className="px-2 py-2 align-top break-words">
                                                        {row.item_unit_price}
                                                    </td>
                                                    <td className="px-2 py-2 align-top break-words">
                                                        {row.item_discount}
                                                    </td>
                                                    <td className="px-2 py-2 align-top break-words">
                                                        {row.item_gst}
                                                    </td>
                                                    <td className="px-2 py-2 align-top font-medium break-words">
                                                        {row.dp_total_price}
                                                    </td>
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
            </div>

            {/* Terms & Conditions */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Terms &amp; Conditions
                    </h4>
                    {!isPIReadOnly && (
                        <button
                            onClick={() => setIsTermsEditorOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                        >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                    )}
                </div>
                <div
                    className="p-5 text-sm text-zinc-900 dark:text-zinc-100 prose dark:prose-invert max-w-none [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
                    dangerouslySetInnerHTML={{
                        __html: poData.terms_and_conditions || DEFAULT_TERMS,
                    }}
                />
            </div>

            {/* Terms Editor Modal */}
            <TermsEditorModal
                isOpen={isTermsEditorOpen}
                initialHtml={poData.terms_and_conditions || DEFAULT_TERMS}
                onClose={() => setIsTermsEditorOpen(false)}
                onSave={(html) =>
                    handleFieldChange("terms_and_conditions", html)
                }
            />

            {/* Preview Modal */}
            <PreviewModal
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                htmlContent={isPreviewOpen ? generatePOHtml(poData) : ""}
                docName={poData.po_number || dpId || ""}
            />
        </div>
    );
};
