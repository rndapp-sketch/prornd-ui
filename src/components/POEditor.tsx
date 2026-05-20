import React, {
    useState,
    useEffect,
    useRef,
    useCallback,
    useMemo,
} from "react";
import { createPortal } from "react-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
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
import {
    generatePOHtml,
    DEFAULT_TERMS,
    getAmcPoGrandTotal,
    getAmcPoGstAmount,
    getDefaultTermsForIndentType,
    getAmcPoTotal,
    getPoVariantCopy,
    getPoTableConfig,
    isAnnualMaintenanceContractIndent,
} from "@/utils/poPrint";
import { DepartmentName } from "@/components/DepartmentName";
import { BudgetHeadName } from "@/components/BudgetHeadName";
import { cn } from "@/lib/utils";

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
    onChange?: (poData: Record<string, any>) => void;
    onSave?: (poData: Record<string, any>) => Promise<void>;
    sourceLabel?: string;
    isSaved?: boolean;
    isDirty?: boolean;
    onUploadSignedPO?: (file: File) => Promise<void>;
}

const normalizePoDateValue = (value: unknown) => {
    if (!value) return "";
    const raw = String(value).trim();
    if (!raw) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        return raw;
    }

    const slashMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (slashMatch) {
        const [, day, month, year] = slashMatch;
        return `${year}-${month}-${day}`;
    }

    const dashMatch = raw.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dashMatch) {
        const [, day, month, year] = dashMatch;
        return `${year}-${month}-${day}`;
    }

    return raw;
};

const numberInWords = (number: number): string => {
    if (number < 0 || number > 999999999999) return "!!!";
    let num = number;
    const Gn = Math.floor(num / 10000000);
    num -= Gn * 10000000;
    const kn = Math.floor(num / 100000);
    num -= kn * 100000;
    const Hn = Math.floor(num / 1000);
    num -= Hn * 1000;
    const Dn = Math.floor(num / 100);
    num = num % 100;
    const tn = Math.floor(num / 10);
    const one = Math.floor(num % 10);

    let res = "";
    if (Gn > 0) res += numberInWords(Gn) + " Crore";
    if (kn > 0) res += (res === "" ? "" : " ") + numberInWords(kn) + " Lakh";
    if (Hn > 0) res += (res === "" ? "" : " ") + numberInWords(Hn) + " Thousand";
    if (Dn > 0) res += (res === "" ? "" : " ") + numberInWords(Dn) + " Hundred";

    const ones = [
        "",
        "One",
        "Two",
        "Three",
        "Four",
        "Five",
        "Six",
        "Seven",
        "Eight",
        "Nine",
        "Ten",
        "Eleven",
        "Twelve",
        "Thirteen",
        "Fourteen",
        "Fifteen",
        "Sixteen",
        "Seventeen",
        "Eighteen",
        "Nineteen",
    ];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

    if (tn > 0 || one > 0) {
        if (res !== "") res += " and ";
        if (tn < 2) {
            res += ones[tn * 10 + one];
        } else {
            res += tens[tn];
            if (one > 0) res += "-" + ones[one];
        }
    }

    if (res === "") res = "Zero";
    return res;
};

const convertAmountToWords = (numStr: string | number): string => {
    const num = parseFloat(String(numStr));
    if (isNaN(num)) return "";
    const integerPart = Math.floor(num);
    const decimalPartStr = String(num.toFixed(2)).split(".")[1] || "00";
    let words = "Rupees " + numberInWords(integerPart) + " Only";
    if (decimalPartStr !== "00") {
        const digits = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
        const p1 = digits[parseInt(decimalPartStr.charAt(0), 10)];
        const p2 = digits[parseInt(decimalPartStr.charAt(1), 10)];
        words = "Rupees " + numberInWords(integerPart) + " Point " + p1 + " " + p2 + " Paisa Only";
    }
    return words;
};

const getFallbackPrefillSections = (poData: Record<string, any>) => [
    {
        title: "Common ICSS Details",
        fields: [
            ["Applicant", poData.ss_applicant_name],
            ["Department", poData.ss_department_for_purchase],
            ["Account Head", poData.ss_account_head],
            ["Funding Agency", poData.ss_funding_agency],
            ["Firm(s)", poData.ss_name_of_firms],
            ["Project No.", poData.project_no],
            ["File No.", poData.ss_file_number],
            ["Committed Grand Total", poData.ss_grand_total],
        ]
            .filter(([, value]) => value !== undefined && value !== null && value !== "")
            .map(([label, value]) => ({ label, value })),
    },
];

const LinkedDocDisplayName = ({
    doctype,
    fieldname,
    value,
}: {
    doctype: string;
    fieldname: string;
    value: any;
}) => {
    const resolvedValue = value == null ? "" : String(value);
    const { data, isLoading, error } = useFrappeGetCall<{ message: Record<string, any> }>(
        "frappe.client.get_value",
        {
            doctype,
            filters: { name: resolvedValue },
            fieldname,
        },
        undefined,
        {
            enabled: !!resolvedValue,
            revalidateOnFocus: false,
        },
    );

    if (!resolvedValue) return <span>—</span>;
    if (isLoading) return <span>{resolvedValue}</span>;
    if (error) return <span>{resolvedValue}</span>;

    return <span>{data?.message?.[fieldname] || resolvedValue}</span>;
};

const PrefillFieldValue = ({ label, value }: { label: string; value: any }) => {
    const resolvedValue = value == null ? "" : String(value);
    const normalizedLabel = String(label || "").trim().toLowerCase();

    if (!resolvedValue) return <span>—</span>;

    if (normalizedLabel === "department") {
        return <DepartmentName name={resolvedValue} />;
    }

    if (normalizedLabel === "account head") {
        return <BudgetHeadName value={resolvedValue} />;
    }

    if (normalizedLabel === "principal supplier") {
        return (
            <LinkedDocDisplayName
                doctype="Principal Supplier"
                fieldname="principal_supplier_name"
                value={resolvedValue}
            />
        );
    }

    if (normalizedLabel === "local supplier") {
        return (
            <LinkedDocDisplayName
                doctype="Local Supplier Detail"
                fieldname="local_supplier_name"
                value={resolvedValue}
            />
        );
    }

    return <span>{resolvedValue}</span>;
};

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
            } catch {}

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
    onChange,
    onSave,
    sourceLabel = "Sanction Sheet",
    isSaved = false,
    isDirty = false,
    onUploadSignedPO,
}) => {
    // Editable fields local to PO editor
    const [poData, setPoData] = useState<Record<string, any>>({});
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isTermsEditorOpen, setIsTermsEditorOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const poVariantCopy = useMemo(
        () =>
            getPoVariantCopy(
                ssData?.po_source_indent_type ||
                    ssData?.icss_indent_type ||
                    ssData?.indent_type,
            ),
        [ssData],
    );
    const prefillSections = useMemo(() => {
        if (
            Array.isArray(poData.po_prefill_sections) &&
            poData.po_prefill_sections.length > 0
        ) {
            return poData.po_prefill_sections;
        }

        return getFallbackPrefillSections(poData);
    }, [poData]);
    const poTableConfig = useMemo(
        () =>
            getPoTableConfig(
                poData.po_source_indent_type ||
                    poData.icss_indent_type ||
                    poData.indent_type,
            ),
        [poData.icss_indent_type, poData.indent_type, poData.po_source_indent_type],
    );
    const isAmcPo = useMemo(
        () =>
            isAnnualMaintenanceContractIndent(
                poData.po_source_indent_type ||
                    poData.icss_indent_type ||
                    poData.indent_type,
            ),
        [poData.icss_indent_type, poData.indent_type, poData.po_source_indent_type],
    );
    const amcPoTotalAmount = useMemo(
        () => getAmcPoTotal(poData),
        [poData],
    );
    const amcPoGstAmount = useMemo(
        () => getAmcPoGstAmount(poData),
        [poData],
    );
    const amcPoGrandTotal = useMemo(
        () => getAmcPoGrandTotal(poData),
        [poData],
    );
    const saveStatusLabel = isSaving
        ? "Saving..."
        : saveSuccess
          ? "Saved"
          : isDirty
            ? "Unsaved changes"
            : isSaved
              ? "Saved already"
              : "Not saved yet";
    const saveButtonLabel = isSaving
        ? "Saving..."
        : saveSuccess
          ? "Saved"
          : isDirty
            ? "Save Changes"
            : isSaved
              ? "Saved Already"
              : "Save";

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
                po_number: ssData.po_number || "",
                po_date: normalizePoDateValue(ssData.po_date),
                vendor_address:
                    ssData.vendor_address || ssData.ss_name_of_firms || "",
                quotation_no: ssData.quotation_no || "",
                signee_name: ssData.signee_name || "",
                signee_designation: ssData.signee_designation || "",
                amount_in_words: ssData.amount_in_words || "",
                terms_and_conditions:
                    ssData.terms_and_conditions ||
                    ssData.additional_terms_and_conditions_if_any ||
                    getDefaultTermsForIndentType(
                        ssData.po_source_indent_type ||
                            ssData.icss_indent_type ||
                            ssData.indent_type,
                    ),
            });
        }
    }, [ssData]);

    useEffect(() => {
        setPoData((prev) => {
            if (isAnnualMaintenanceContractIndent(
                prev.po_source_indent_type || prev.icss_indent_type || prev.indent_type,
            )) {
                const total = getAmcPoTotal(prev);
                if (total > 0) {
                    const gstAmount = getAmcPoGstAmount(prev);
                    const grandTotal = getAmcPoGrandTotal(prev);
                    const computed = convertAmountToWords(grandTotal);
                    if (
                        prev.ss_grand_total === grandTotal &&
                        prev.amc_po_total_amount === total &&
                        prev.gst_amount === gstAmount &&
                        prev.grand_total === grandTotal &&
                        prev.amount_in_words === computed &&
                        Array.isArray(prev.po_charge_summary) &&
                        prev.po_charge_summary[0]?.value === grandTotal
                    ) {
                        return prev;
                    }

                    return {
                        ...prev,
                        ss_grand_total: grandTotal,
                        amc_po_total_amount: total,
                        gst_amount: gstAmount,
                        grand_total: grandTotal,
                        amount_in_words: computed,
                        po_charge_summary: [
                            {
                                label: "Grand Total",
                                value: grandTotal,
                                emphasis: "strong",
                            },
                        ],
                    };
                }
            }

            if (prev.amount_in_words) return prev;
            const grandTotal = prev.ss_grand_total;
            if (grandTotal === undefined || grandTotal === null || grandTotal === "") {
                return prev;
            }
            const computed = convertAmountToWords(grandTotal);
            if (!computed) return prev;
            return { ...prev, amount_in_words: computed };
        });
    }, [poData.ss_grand_total, poData.amc_po_table, poData.add_of_gst_]);

    const handleFieldChange = useCallback(
        (field: string, value: string) => {
            setPoData((prev) => {
                const nextPoData = { ...prev, [field]: value };
                onChange?.(nextPoData);
                return nextPoData;
            });
        },
        [onChange],
    );

    const handleSave = async () => {
        if (!onSave) return;
        setIsSaving(true);
        setSaveSuccess(false);
        setSaveError(null);
        try {
            await onSave(poData);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error("Save failed:", err);
            const message =
                err instanceof Error
                    ? err.message
                    : "Failed to save PO draft.";
            setSaveError(message);
            alert(message);
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
        {
            key: "po_number",
            label: isAmcPo ? "AMC Job Order No. / P.O. Number" : "P.O. Number",
            type: "text" as const,
        },
        { key: "po_date", label: "P.O. Date", type: "date" as const },
        {
            key: "quotation_no",
            label: "Quotation Reference No.",
            type: "text" as const,
        },
        ...(isAmcPo
            ? [
                {
                    key: "amc_subject",
                    label: "Sub: AMC of",
                    type: "text" as const,
                },
            ]
            : []),
    ];
    const postTermsFields = [
        { key: "signee_name", label: "Signee Name", type: "text" as const },
        {
            key: "signee_designation",
            label: "Signee Designation",
            type: "text" as const,
        },
    ];

    const getPoTableCellValue = (row: Record<string, any>, columnKey: string, index: number) => {
        if (columnKey === "serial") return index + 1;
        if (columnKey === "item_cat_no") return row.item_cat_no || row.cat_no || "";
        if (columnKey === "item_page_no") return row.item_page_no || row.page_no || "";
        return row[columnKey];
    };

    const withAmcPoTotals = (
        baseData: Record<string, any>,
        rows: Record<string, any>[],
    ) => {
        const draftData = { ...baseData, amc_po_table: rows };
        const total = getAmcPoTotal(draftData);
        const gstAmount = getAmcPoGstAmount(draftData);
        const grandTotal = getAmcPoGrandTotal(draftData);

        return {
            ...baseData,
            amc_po_table: rows,
            amc_po_total_amount: total,
            gst_amount: gstAmount,
            grand_total: grandTotal,
            ss_grand_total: grandTotal || baseData.ss_grand_total,
            amount_in_words: grandTotal
                ? convertAmountToWords(grandTotal)
                : baseData.amount_in_words,
            po_charge_summary: grandTotal
                ? [
                    {
                        label: "Grand Total",
                        value: grandTotal,
                        emphasis: "strong",
                    },
                ]
                : baseData.po_charge_summary,
        };
    };

    const handleAmcPoRowChange = (
        rowIndex: number,
        fieldname: string,
        value: string,
    ) => {
        setPoData((prev) => {
            const rows = Array.isArray(prev.amc_po_table)
                ? [...prev.amc_po_table]
                : [];
            rows[rowIndex] = {
                ...(rows[rowIndex] || {}),
                [fieldname]: value,
            };
            const nextPoData = withAmcPoTotals(prev, rows);
            onChange?.(nextPoData);
            return nextPoData;
        });
    };

    const handleAmcPoGstChange = (value: string) => {
        setPoData((prev) => {
            const rows = Array.isArray(prev.amc_po_table)
                ? [...prev.amc_po_table]
                : [];
            const nextPoData = withAmcPoTotals(
                { ...prev, add_of_gst_: value },
                rows,
            );
            onChange?.(nextPoData);
            return nextPoData;
        });
    };

    const handleAddAmcPoRow = () => {
        setPoData((prev) => {
            const rows = Array.isArray(prev.amc_po_table)
                ? [...prev.amc_po_table]
                : [];
            const nextRows = [
                ...rows,
                {
                    sl_no: String(rows.length + 1),
                    description_of_items: "",
                    end_user: "",
                    year: "",
                    amc_from: "",
                    amc_to: "",
                    amc_amount: "",
                },
            ];
            const nextPoData = withAmcPoTotals(prev, nextRows);
            onChange?.(nextPoData);
            return nextPoData;
        });
    };

    const handleRemoveAmcPoRow = (rowIndex: number) => {
        setPoData((prev) => {
            const rows = Array.isArray(prev.amc_po_table)
                ? [...prev.amc_po_table]
                : [];
            const nextRows = rows
                .filter((_, index) => index !== rowIndex)
                .map((row, index) => ({
                    ...row,
                    sl_no: String(index + 1),
                }));
            const nextPoData = withAmcPoTotals(prev, nextRows);
            onChange?.(nextPoData);
            return nextPoData;
        });
    };

    return (
        <div className="space-y-6">
            {/* Action bar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                        Purchase Order
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-[#D97757] border border-orange-200 dark:bg-zinc-800 dark:text-orange-300 dark:border-zinc-700">
                        {ssData?.po_source_indent_type || ssData?.icss_indent_type || ssData?.indent_type || "ICSS"}
                    </span>
                    {isPIReadOnly && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            Read-only
                        </span>
                    )}
                </div>
                {isStaffRnD && (
                    <div className="flex items-center gap-3 flex-wrap">
                        {onSave && (
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60"
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : saveSuccess ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                {isSaving
                                    ? "Saving..."
                                    : saveButtonLabel}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setIsPreviewOpen(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
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
                        {onUploadSignedPO && (
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleFileSelected}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    disabled={isUploading}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
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
                        )}
                    </div>
                )}
            </div>
            {isStaffRnD && (
                <div
                    className={cn(
                        "rounded-lg border px-4 py-2 text-sm",
                        isDirty
                            ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                            : isSaved
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300",
                    )}
                >
                    {saveStatusLabel}. You can still edit the PO details and save again before generating PO.
                </div>
            )}
            {saveError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {saveError}
                </div>
            )}

            {uploadedFile && onUploadSignedPO && (
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
            {uploadedFile && isStaffRnD && onUploadSignedPO && (
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
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {editableFields.map(({ key, label, type }) => (
                        <div
                            key={key}
                            className={
                                type === "textarea" ? "md:col-span-2" : ""
                            }
                        >
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
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
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] resize-y disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-500"
                                />
                            ) : (
                                <input
                                    type={type}
                                    value={poData[key] || ""}
                                    onChange={(e) =>
                                        handleFieldChange(key, e.target.value)
                                    }
                                    disabled={isPIReadOnly}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-500"
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
                        Prefilled with Approved Indent Cum Sanction Sheet
                    </h4>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Indent Type: {poVariantCopy.headerNote}
                    </p>
                </div>
                <div className="p-5 space-y-6">
                    {prefillSections.map((section: any, sectionIndex: number) => (
                        <div key={`${section.title || "section"}-${sectionIndex}`}>
                            {section.title && (
                                <h5 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400 mb-3">
                                    {section.title}
                                </h5>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                                {(section.fields || []).map((field: any, fieldIndex: number) => (
                                    <div
                                        key={`${field.label || "field"}-${fieldIndex}`}
                                        className={String(field.value || "").length > 80 ? "sm:col-span-2 lg:col-span-3" : ""}
                                    >
                                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-0.5">
                                            {field.label}
                                        </p>
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 whitespace-pre-wrap break-words">
                                            <PrefillFieldValue
                                                label={field.label}
                                                value={field.value}
                                            />
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Items table */}
                {Array.isArray(poData.table_bttk) &&
                    poData.table_bttk.length > 0 && (
                        <div className="px-5 pb-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                                {poTableConfig.title}
                            </p>
                            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800">
                                        <tr>
                                            {poTableConfig.columns.map((column: any) => (
                                                <th
                                                    key={column.key}
                                                    className="px-3 py-2 text-left text-xs font-semibold uppercase text-zinc-500 dark:text-zinc-400"
                                                >
                                                    {column.label}
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
                                                    {poTableConfig.columns.map((column: any) => {
                                                        const value = getPoTableCellValue(
                                                            row,
                                                            column.key,
                                                            i,
                                                        );

                                                        return (
                                                            <td
                                                                key={`${column.key}-${i}`}
                                                                className={`px-3 py-2 align-top ${column.key === "serial" ? "text-zinc-500" : column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : ""} ${column.key === "dp_total_price" ? "font-medium" : ""}`}
                                                            >
                                                                {value || "—"}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ),
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                {isAmcPo && (
                    <div className="px-5 pb-5 space-y-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Details of AMC Services
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                    Rows are shown as cards to avoid horizontal scrolling.
                                </p>
                            </div>
                            {!isPIReadOnly && (
                                <button
                                    type="button"
                                    onClick={handleAddAmcPoRow}
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-[#D97757] text-white hover:opacity-90"
                                >
                                    Add Row
                                </button>
                            )}
                        </div>
                        {Array.isArray(poData.amc_po_table) &&
                        poData.amc_po_table.length > 0 ? (
                            <div className="space-y-4">
                                {poData.amc_po_table.map((row: any, index: number) => (
                                    <div
                                        key={index}
                                        className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-800/40 p-4"
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-4">
                                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                                                AMC Row {index + 1}
                                            </p>
                                            {!isPIReadOnly && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveAmcPoRow(index)}
                                                    className="px-2.5 py-1.5 rounded-md text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                                    SL No.
                                                </label>
                                                <input
                                                    type="text"
                                                    value={row.sl_no || ""}
                                                    onChange={(e) =>
                                                        handleAmcPoRowChange(index, "sl_no", e.target.value)
                                                    }
                                                    disabled={isPIReadOnly}
                                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
                                                />
                                            </div>
                                            <div className="md:col-span-5">
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                                    Description of items
                                                </label>
                                                <textarea
                                                    value={row.description_of_items || ""}
                                                    onChange={(e) =>
                                                        handleAmcPoRowChange(index, "description_of_items", e.target.value)
                                                    }
                                                    disabled={isPIReadOnly}
                                                    rows={3}
                                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm disabled:bg-zinc-50 dark:disabled:bg-zinc-950 resize-y"
                                                />
                                            </div>
                                            <div className="md:col-span-5">
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                                    End-user &amp; Location of the item at IIT Guwahati
                                                </label>
                                                <textarea
                                                    value={row.end_user || ""}
                                                    onChange={(e) =>
                                                        handleAmcPoRowChange(index, "end_user", e.target.value)
                                                    }
                                                    disabled={isPIReadOnly}
                                                    rows={3}
                                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm disabled:bg-zinc-50 dark:disabled:bg-zinc-950 resize-y"
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                                    Year
                                                </label>
                                                <input
                                                    type="text"
                                                    value={row.year || ""}
                                                    onChange={(e) =>
                                                        handleAmcPoRowChange(index, "year", e.target.value)
                                                    }
                                                    disabled={isPIReadOnly}
                                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                                    From
                                                </label>
                                                <input
                                                    type="date"
                                                    value={row.amc_from || ""}
                                                    onChange={(e) =>
                                                        handleAmcPoRowChange(index, "amc_from", e.target.value)
                                                    }
                                                    disabled={isPIReadOnly}
                                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                                    To
                                                </label>
                                                <input
                                                    type="date"
                                                    value={row.amc_to || ""}
                                                    onChange={(e) =>
                                                        handleAmcPoRowChange(index, "amc_to", e.target.value)
                                                    }
                                                    disabled={isPIReadOnly}
                                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
                                                />
                                            </div>
                                            <div className="md:col-span-3">
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                                    AMC Amount (INR)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={row.amc_amount || ""}
                                                    onChange={(e) =>
                                                        handleAmcPoRowChange(index, "amc_amount", e.target.value)
                                                    }
                                                    disabled={isPIReadOnly}
                                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                No AMC PO rows added yet.
                            </div>
                        )}
                        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 flex items-center justify-between gap-4">
                            <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                Total AMC Amount
                            </span>
                            <span className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                                ₹ {Number(amcPoTotalAmount || 0).toLocaleString("en-IN")}
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                    Add: GST @ (%)
                                </label>
                                <input
                                    type="number"
                                    value={poData.add_of_gst_ || ""}
                                    onChange={(e) => handleAmcPoGstChange(e.target.value)}
                                    disabled={isPIReadOnly}
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm disabled:bg-zinc-50 dark:disabled:bg-zinc-950"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                    GST Amount
                                </label>
                                <input
                                    type="number"
                                    value={poData.gst_amount ?? amcPoGstAmount}
                                    readOnly
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-700 dark:text-zinc-300"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                    Grand Total
                                </label>
                                <input
                                    type="number"
                                    value={poData.grand_total ?? amcPoGrandTotal}
                                    readOnly
                                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                                />
                            </div>
                        </div>
                    </div>
                )}
                {!isAmcPo &&
                    Array.isArray(poData.po_charge_summary) &&
                    poData.po_charge_summary.length > 0 && (
                        <div className="px-5 pb-5">
                            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2">
                                Amount Summary
                            </p>
                            <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 divide-y divide-zinc-100 dark:divide-zinc-800">
                                {poData.po_charge_summary.map((row: any, index: number) => (
                                    <div
                                        key={`${row.label || "charge"}-${index}`}
                                        className="flex items-center justify-between gap-4 px-4 py-3"
                                    >
                                        <p className={`text-sm ${row.emphasis === "strong" ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-300"}`}>
                                            {row.label}
                                        </p>
                                        <p className={`text-sm ${row.emphasis === "strong" ? "font-semibold text-zinc-900 dark:text-zinc-100" : "font-medium text-zinc-800 dark:text-zinc-200"}`}>
                                            {row.value || row.value === 0 ? row.value : "—"}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                <div className="px-5 pb-5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Amount in Words
                    </label>
                    <input
                        type="text"
                        value={poData.amount_in_words || ""}
                        onChange={(e) =>
                            handleFieldChange("amount_in_words", e.target.value)
                        }
                        disabled={isPIReadOnly}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-500"
                    />
                </div>
            </div>

            {/* Terms & Conditions */}
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Terms &amp; Conditions
                    </h4>
                    {!isPIReadOnly && (
                        <button
                            type="button"
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
                        __html:
                            poData.terms_and_conditions ||
                            getDefaultTermsForIndentType(
                                poData.po_source_indent_type ||
                                    poData.icss_indent_type ||
                                    poData.indent_type,
                            ) ||
                            DEFAULT_TERMS,
                    }}
                />
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                    <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        Signatory
                    </h4>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {postTermsFields.map(({ key, label, type }) => (
                        <div key={key} className={key === "amount_in_words" ? "md:col-span-2" : ""}>
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                                {label}
                            </label>
                            <input
                                type={type}
                                value={poData[key] || ""}
                                onChange={(e) => handleFieldChange(key, e.target.value)}
                                disabled={isPIReadOnly}
                                className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:cursor-not-allowed disabled:text-zinc-500"
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* Terms Editor Modal */}
            <TermsEditorModal
                isOpen={isTermsEditorOpen}
                initialHtml={
                    poData.terms_and_conditions ||
                    getDefaultTermsForIndentType(
                        poData.po_source_indent_type ||
                            poData.icss_indent_type ||
                            poData.indent_type,
                    ) ||
                    DEFAULT_TERMS
                }
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
