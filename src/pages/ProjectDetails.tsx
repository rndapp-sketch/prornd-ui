// -=-=-=-=--= v4

import { getFileUrl } from "@/utils/fileUtils";
import React, {
    useState,
    useCallback,
    useImperativeHandle,
    forwardRef,
    useRef,
} from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useParams, useNavigate } from "react-router-dom";
import {
    useFrappeGetDoc,
    useFrappePostCall,
    useFrappeGetCall,
    useFrappeGetDocList,
    useFrappeAuth,
} from "frappe-react-sdk";
import { Textarea } from "@/components/ui/textarea"; // Assuming this can be styled via className
// import { AppSidebar } from "../components/RndSidebar";
import {
    ArrowLeftIcon,
    FileTextIcon,
    UsersIcon,
    IndianRupeeIcon,
    ShieldIcon,
    MessageSquareIcon,
    SettingsIcon,
    CalendarIcon,
    UserIcon,
    BuildingIcon,
    CreditCardIcon,
    UploadIcon,
    ShoppingCartIcon,
    UsersIcon as UsersGroupIcon,
    PlaneIcon,
    MapPinIcon,
    MailIcon,
    GlobeIcon,
    TargetIcon,
    ClockIcon,
    CheckCircleIcon,
    XCircleIcon,
    FileBadge,
    FolderOpenIcon,
    DownloadIcon,
    ExternalLinkIcon,
    PencilIcon,
    ChevronRight,
    CheckCircle2,
    XCircle,
    Clock,
    AlertTriangleIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { GlobalLoader } from "@/components/ui/global-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { DepartmentName } from "@/components/DepartmentName";
import { ProjectNumberGenerationForm } from "@/components/ProjectNumberGenerationForm";
import { useUserRoles } from "@/components/UserRole";
import { DeclarationFields } from "@/components/DeclarationFields";

// --- Interfaces (Unchanged) ---
interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}
interface ActivityStreamProps {
    doctype: string;
    docname: string;
}
interface ActivityStreamHandle {
    refetch: () => void;
}
interface ProjectDetailsProps {
    projectName?: string;
    backUrl?: string;
    backLabel?: string;
}

const DORND_SIGNATURE_SEAL_URL = "http://172.16.131.206:8000/files/Sign_dornd_stamp_rnd.jpg";

const waitForDocumentAssets = async (document: Document) => {
    if (document.fonts?.ready) {
        await document.fonts.ready.catch(() => undefined);
    }

    const images = Array.from(document.images);
    await Promise.all(
        images.map((image) =>
            image.complete
                ? Promise.resolve()
                : new Promise<void>((resolve) => {
                    image.onload = () => resolve();
                    image.onerror = () => resolve();
                }),
        ),
    );
};

const printEndorsementDocument = async (document: Document) => {
    await waitForDocumentAssets(document);
    document.defaultView?.focus();
    document.defaultView?.print();
};

const findWhitespaceCut = (
    canvas: HTMLCanvasElement,
    startY: number,
    targetY: number,
    maxY: number,
) => {
    if (maxY >= canvas.height) return canvas.height;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return Math.min(targetY, maxY);

    const searchStart = Math.max(startY + 180, targetY - 180);
    const searchEnd = Math.min(maxY - 40, targetY + 180);
    if (searchEnd <= searchStart) return Math.min(targetY, maxY);

    const width = canvas.width;
    const height = searchEnd - searchStart;
    const data = ctx.getImageData(0, searchStart, width, height).data;
    let bestY = targetY;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let localY = 0; localY < height; localY += 4) {
        let inkScore = 0;
        for (let x = 0; x < width; x += 12) {
            const index = (localY * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];
            if (a > 12 && (r < 245 || g < 245 || b < 245)) {
                inkScore += 1;
            }
        }

        const absoluteY = searchStart + localY;
        const distancePenalty = Math.abs(absoluteY - targetY) / 60;
        const score = inkScore + distancePenalty;
        if (score < bestScore) {
            bestScore = score;
            bestY = absoluteY;
        }
    }

    return Math.max(startY + 120, Math.min(bestY, maxY));
};

const downloadEndorsementDocumentPdf = async (document: Document, fileName: string) => {
    await waitForDocumentAssets(document);
    const target = document.querySelector(".print-container") as HTMLElement | null;
    if (!target) throw new Error("Printable endorsement container not found.");

    const style = document.createElement("style");
    style.setAttribute("data-download-print-emulation", "true");
    style.textContent = `
        body {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
            display: block !important;
        }
        .print-container {
            box-shadow: none !important;
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 auto !important;
        }
    `;
    document.head.appendChild(style);

    try {
        const canvas = await html2canvas(target, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            windowWidth: target.scrollWidth,
            windowHeight: target.scrollHeight,
            scrollX: 0,
            scrollY: 0,
        });

        const pdf = new jsPDF("p", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const marginX = 15;
        const marginY = 18;
        const imgWidth = pageWidth - marginX * 2;
        const pageContentHeight = pageHeight - marginY * 2;
        const pixelsPerMm = canvas.width / imgWidth;
        const targetSliceHeight = Math.floor(pageContentHeight * pixelsPerMm);

        let sourceY = 0;
        let pageIndex = 0;

        while (sourceY < canvas.height) {
            const remaining = canvas.height - sourceY;
            const idealCut = sourceY + Math.min(targetSliceHeight, remaining);
            const cutY =
                remaining <= targetSliceHeight
                    ? canvas.height
                    : findWhitespaceCut(
                        canvas,
                        sourceY,
                        idealCut,
                        Math.min(canvas.height, sourceY + Math.floor(targetSliceHeight * 1.12)),
                    );
            const sliceHeight = Math.max(1, cutY - sourceY);

            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;
            const pageCtx = pageCanvas.getContext("2d");
            if (!pageCtx) throw new Error("Could not prepare PDF page.");
            pageCtx.fillStyle = "#ffffff";
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageCtx.drawImage(
                canvas,
                0,
                sourceY,
                canvas.width,
                sliceHeight,
                0,
                0,
                canvas.width,
                sliceHeight,
            );

            if (pageIndex > 0) {
                pdf.addPage();
            }

            const sliceHeightMm = sliceHeight / pixelsPerMm;
            pdf.addImage(
                pageCanvas.toDataURL("image/png"),
                "PNG",
                marginX,
                marginY,
                imgWidth,
                Math.min(sliceHeightMm, pageContentHeight),
            );

            sourceY = cutY;
            pageIndex += 1;
        }

        if (pageIndex === 0) {
            pdf.addPage();
        }

        pdf.save(fileName);
    } finally {
        style.remove();
    }
};

const getIframeSrcDoc = (html: string) =>
    /<html[\s>]/i.test(html)
        ? html
        : `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{margin:0;padding:16px;}@media print{@page{margin:10mm;}}</style></head><body>${html}</body></html>`;

const printEndorsementHtml = async (html: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "0";
    iframe.style.top = "0";
    iframe.style.width = "794px";
    iframe.style.height = "1123px";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
    iframe.srcdoc = getIframeSrcDoc(html);
    document.body.appendChild(iframe);

    try {
        await new Promise<void>((resolve) => {
            iframe.onload = () => resolve();
        });
        const iframeDocument = iframe.contentDocument;
        if (!iframeDocument) throw new Error("Unable to prepare endorsement PDF.");
        await printEndorsementDocument(iframeDocument);
    } finally {
        setTimeout(() => iframe.remove(), 1000);
    }
};

const downloadEndorsementPdfFromHtml = async (html: string, fileName: string) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "794px";
    iframe.style.height = "1123px";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
    iframe.srcdoc = getIframeSrcDoc(html);
    document.body.appendChild(iframe);

    try {
        await new Promise<void>((resolve) => {
            iframe.onload = () => resolve();
        });
        const iframeDocument = iframe.contentDocument;
        if (!iframeDocument) throw new Error("Unable to prepare endorsement PDF.");
        await downloadEndorsementDocumentPdf(iframeDocument, fileName);
    } finally {
        iframe.remove();
    }
};

const EndorsementModal = ({
    isOpen,
    onClose,
    html,
    isLoading,
}: {
    isOpen: boolean;
    onClose: () => void;
    html: string | null;
    isLoading: boolean;
}) => {
    const iframeRef = React.useRef<HTMLIFrameElement>(null);
    const [isDownloadingPdf, setIsDownloadingPdf] = React.useState(false);

    if (!isOpen) return null;

    const srcDoc = html ? getIframeSrcDoc(html) : "";

    const handlePrint = () => {
        iframeRef.current?.contentWindow?.print();
    };

    const handleDownloadPdf = async () => {
        const iframeDocument = iframeRef.current?.contentDocument;
        if (!iframeDocument) return;

        setIsDownloadingPdf(true);
        try {
            await downloadEndorsementDocumentPdf(iframeDocument, "Endorsement_Certificate.pdf");
        } catch (error) {
            console.error("Endorsement PDF download failed:", error);
            alert("Could not generate PDF. Please use Print and save as PDF.");
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className="relative z-10 w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col"
                style={{ height: "88vh" }}
            >
                {/* Header */}
                <div className="flex-none flex items-center justify-between px-4 py-2.5 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                    <div className="flex items-center gap-2">
                        <FileBadge className="h-4 w-4 text-[#D97757]" />
                        <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            Endorsement Certificate
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <XCircleIcon className="h-4 w-4" />
                    </button>
                </div>

                {/* Body — iframe renders HTML with full style isolation */}
                <div className="flex-1 min-h-0 bg-white">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <div className="animate-spin rounded-full h-7 w-7 border-2 border-[#D97757] border-t-transparent" />
                            <p className="text-xs text-zinc-500">Loading endorsement…</p>
                        </div>
                    ) : html ? (
                        <iframe
                            ref={iframeRef}
                            srcDoc={srcDoc}
                            title="Endorsement Certificate"
                            className="w-full h-full border-0"
                            sandbox="allow-same-origin allow-modals"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800">
                                <FileBadge className="h-6 w-6 text-zinc-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-zinc-500">No endorsement found</p>
                                <p className="text-xs text-zinc-400 mt-1">No endorsement data is linked to this project.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex-none flex items-center justify-end gap-2 px-4 py-2.5 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800">
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors"
                    >
                        Close
                    </button>
                    {html && (
                        <>
                            <button
                                onClick={handleDownloadPdf}
                                disabled={isDownloadingPdf}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-white dark:bg-zinc-700 border border-zinc-300 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-600 transition-colors disabled:opacity-60"
                            >
                                <DownloadIcon className="h-3 w-3" />
                                {isDownloadingPdf ? "Generating..." : "Download PDF"}
                            </button>
                            <button
                                onClick={handlePrint}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-[#D97757] hover:bg-[#c4673e] text-white transition-colors"
                            >
                                <ExternalLinkIcon className="h-3 w-3" />
                                Print
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const toSameOriginFileUrl = (src: string) => {
    try {
        const url = new URL(src, window.location.origin);
        if (
            url.hostname === "172.16.131.206" ||
            url.hostname === window.location.hostname
        ) {
            return `${url.pathname}${url.search}${url.hash}`;
        }
    } catch {
        return src;
    }
    return src;
};

const normalizeEndorsementHtmlForProject = (html: string, projectName?: string, workflowState?: string) => {
    if (!projectName) return html;
    const refNo = `IITG-${projectName}`;
    const shouldShowSignatureSeal = workflowState === "Endorsement Approved";
    const isFullDocument = /<html[\s>]/i.test(html);
    const parser = new DOMParser();
    const document = parser.parseFromString(html, "text/html");

    const refValue = document.querySelector(".ref-no .value");
    if (refValue) {
        refValue.textContent = refNo;
    }

    document.querySelectorAll("img").forEach((image) => {
        const src = image.getAttribute("src") || "";
        const alt = image.getAttribute("alt") || "";
        if (
            src.includes("Sign_dornd_stamp_rnd.jpg") ||
            src.includes("rohit_fake_sign") ||
            alt.toLowerCase() === "signature"
        ) {
            image.remove();
            return;
        }
        image.setAttribute("src", toSameOriginFileUrl(src));
    });

    document.querySelectorAll(".signature").forEach((signature) => {
        signature.innerHTML = "";

        if (shouldShowSignatureSeal) {
            const image = document.createElement("img");
            image.src = toSameOriginFileUrl(DORND_SIGNATURE_SEAL_URL);
            image.alt = "Signature with seal";
            image.style.height = "112px";
            image.style.width = "auto";
            image.style.objectFit = "contain";
            image.style.marginBottom = "8px";
            signature.appendChild(image);
        } else {
            const emptySpace = document.createElement("div");
            emptySpace.style.height = "112px";
            emptySpace.style.marginBottom = "8px";
            signature.appendChild(emptySpace);
        }

        const label = document.createElement("div");
        label.textContent = "Signature of the Dean (R&D)";
        label.style.fontWeight = "bold";
        signature.appendChild(label);
    });

    if (shouldShowSignatureSeal && !document.querySelector(".signature")) {
        const container = document.querySelector(".print-container") || document.body;
        const signature = document.createElement("div");
        signature.className = "signature";
        signature.setAttribute("style", "margin-top:72px;display:flex;flex-direction:column;align-items:flex-end;");

        const image = document.createElement("img");
        image.src = toSameOriginFileUrl(DORND_SIGNATURE_SEAL_URL);
        image.alt = "Signature with seal";
        image.setAttribute("style", "height:112px;width:auto;object-fit:contain;margin-bottom:8px;");

        const label = document.createElement("div");
        label.textContent = "Signature of the Dean (R&D)";
        label.setAttribute("style", "font-weight:bold;");

        signature.appendChild(image);
        signature.appendChild(label);
        container.appendChild(signature);
    }

    return isFullDocument
        ? `<!DOCTYPE html>\n${document.documentElement.outerHTML}`
        : document.body.innerHTML;
};

const CommentModal = ({
    isOpen,
    onClose,
    onSubmit,
    action,
    isLoading,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (comment: string) => void;
    action: string;
    isLoading: boolean;
}) => {
    const [comment, setComment] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-sm font-bold mb-4 capitalize text-zinc-900 dark:text-zinc-100">
                    Confirm {action}
                </h3>
                <p className="mb-4 text-zinc-600 dark:text-zinc-400">
                    Please provide a comment for this action.
                </p>
                <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter your comment here..."
                    className="mb-4 min-h-[100px] border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-[#D97757]/20"
                />
                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading || !comment.trim()}
                    >
                        {isLoading ? "Submit..." : "Submit"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// --- DESIGN: FieldDisplay Component ---
const FieldDisplay = ({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: any;
    icon?: any;
}) => {
    if (!value && value !== 0 && value !== "No") return null;
    return (
        <div className="rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-3 py-2.5 min-h-[74px]">
            <div className="flex items-center gap-2 mb-1.5">
                {Icon && (
                    <Icon className="h-3.5 w-3.5 text-[#4A6CF7] dark:text-[#93C5FD]" />
                )}
                <p className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.12em] font-sans">
                    {label}
                </p>
            </div>
            <div className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] leading-snug break-words">
                {value}
            </div>
        </div>
    );
};

const ProjectStatusBadge = ({ status }: { status?: string }) => {
    const normalized = (status || "Draft").toLowerCase();
    const className = normalized.includes("approved")
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
        : normalized.includes("reject") || normalized.includes("correction")
            ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
            : normalized.includes("draft")
                ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";

    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold leading-none", className)}>
            {status || "Draft"}
        </span>
    );
};

// --- Frappe Styled Helper Components ---
const HtmlContent = ({
    title,
    htmlString,
    icon: Icon,
}: {
    title: string;
    htmlString: string | undefined;
    icon?: any;
}) => {
    if (!htmlString) return null;
    return (
        <Card className="border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden rounded-xl">
            <CardHeader className="py-3 px-5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-3.5 w-3.5 text-[#4A6CF7] dark:text-[#93C5FD]" />}
                    <CardTitle className="font-sans text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-[0.1em]">
                        {title}
                    </CardTitle>
                </div>
            </CardHeader>
            <CardContent className="p-5">
                <div
                    className="prose prose-sm max-w-none text-[#3F3F46] dark:text-[#D4D4D8] leading-relaxed dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: htmlString }}
                />
            </CardContent>
        </Card>
    );
};

const TableDisplay = ({
    label,
    data,
    columns,
    icon: Icon,
    budgetHeadList = [],
}: {
    label: string;
    data: any[] | undefined;
    columns: { fieldname: string; label: string; render?: (value: any) => React.ReactNode }[];
    icon?: any;
    budgetHeadList?: { name: string; id: number }[];
}) => {
    if (!data || data.length === 0) return null;

    // Check if this is a budget table (has numeric year fields)
    const isBudgetTable = columns.some(
        (col) =>
            col.fieldname.includes("year_budget") ||
            col.fieldname.includes("budget"),
    );

    // Helper function to get budget head name from ID or name
    const getBudgetHeadName = (accountHeadValue: string | number): string => {
        // If it's already a string name (not a number), return it
        if (
            typeof accountHeadValue === "string" &&
            isNaN(Number(accountHeadValue))
        ) {
            return accountHeadValue;
        }
        // Otherwise, try to find the name from budgetHeadList
        const budgetHead = budgetHeadList.find(
            (bh) =>
                bh.id === Number(accountHeadValue) ||
                bh.name === accountHeadValue,
        );
        return budgetHead?.name || String(accountHeadValue);
    };

    // Calculate row totals for budget tables
    const getRowTotal = (row: any) => {
        if (!isBudgetTable) return null;
        return columns
            .filter((col) => col.fieldname !== "account_head")
            .reduce(
                (sum, col) => sum + (parseFloat(row[col.fieldname]) || 0),
                0,
            );
    };

    // Calculate column totals for budget tables
    const getColumnTotal = (fieldname: string) => {
        if (!isBudgetTable || fieldname === "account_head") return null;
        return data.reduce(
            (sum, row) => sum + (parseFloat(row[fieldname]) || 0),
            0,
        );
    };

    // Calculate grand total
    const grandTotal = isBudgetTable
        ? data.reduce((sum, row) => {
            const rowTotal = getRowTotal(row);
            return sum + (rowTotal || 0);
        }, 0)
        : null;

    return (
        <Card className="border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden rounded-xl">
            <CardHeader className="py-3 px-5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-3.5 w-3.5 text-[#4A6CF7] dark:text-[#93C5FD]" />}
                    <CardTitle className="font-sans text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-[0.1em]">
                        {label}
                    </CardTitle>
                </div>
            </CardHeader>
            <div className="overflow-x-auto p-3">
                <Table className="border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg overflow-hidden">
                    <TableHeader className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                        <TableRow className="border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 hover:bg-transparent">
                            {columns.map((col) => (
                                <TableHead
                                    key={col.fieldname}
                                    className={cn(
                                        "px-4 py-3 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider h-9 border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25 last:border-r-0",
                                        col.fieldname === "account_head" ||
                                            !isBudgetTable
                                            ? "text-left"
                                            : "text-right",
                                    )}
                                >
                                    {col.label}
                                </TableHead>
                            ))}
                            {isBudgetTable && (
                                <TableHead className="px-4 py-3 text-right text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider h-9">
                                    Total
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row, index) => {
                            const rowTotal = getRowTotal(row);
                            return (
                                <TableRow
                                    key={index}
                                    className="hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]/40 transition-colors border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-b-0"
                                >
                                    {columns.map((col) => (
                                        <TableCell
                                            key={col.fieldname}
                                            className={cn(
                                                "px-4 py-3 text-xs border-r border-[#F4F4F5] dark:border-[#3F3F46]/80 last:border-r-0 align-top",
                                                col.fieldname === "account_head"
                                                    ? "text-zinc-900 dark:text-zinc-100 font-medium text-left font-mono"
                                                    : isBudgetTable
                                                        ? "text-zinc-600 dark:text-zinc-300 text-right tabular-nums"
                                                        : "text-zinc-700 dark:text-zinc-300 text-left",
                                            )}
                                        >
                                            {col.fieldname === "account_head"
                                                ? getBudgetHeadName(
                                                    row[col.fieldname],
                                                )
                                                : isBudgetTable
                                                    ? (
                                                        parseFloat(
                                                            row[col.fieldname],
                                                        ) || 0
                                                    ).toLocaleString("en-IN")
                                                    : col.render
                                                        ? col.render(row[col.fieldname])
                                                        : row[col.fieldname]}
                                        </TableCell>
                                    ))}
                                    {isBudgetTable && rowTotal !== null && (
                                        <TableCell className="px-4 py-3 text-xs font-bold text-zinc-900 dark:text-zinc-100 text-right tabular-nums font-mono align-top">
                                            {rowTotal.toLocaleString("en-IN")}
                                        </TableCell>
                                    )}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    {isBudgetTable && (
                        <tfoot className="bg-[#FAFAF9] dark:bg-[#18181B] border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                            <tr>
                                <td className="px-4 py-3 text-xs font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                    TOTAL
                                </td>
                                {columns
                                    .filter(
                                        (col) =>
                                            col.fieldname !== "account_head",
                                    )
                                    .map((col) => {
                                        const colTotal = getColumnTotal(
                                            col.fieldname,
                                        );
                                        return (
                                            <td
                                                key={col.fieldname}
                                                className="px-4 py-3 text-xs font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap tabular-nums border-r border-[#F4F4F5] dark:border-[#3F3F46]/80"
                                            >
                                                {colTotal !== null
                                                    ? colTotal.toLocaleString(
                                                        "en-IN",
                                                    )
                                                    : "-"}
                                            </td>
                                        );
                                    })}
                                <td className="px-4 py-3 text-xs font-bold text-[#D97757] text-right whitespace-nowrap tabular-nums font-mono">
                                    ₹{" "}
                                    {grandTotal !== null
                                        ? grandTotal.toLocaleString("en-IN")
                                        : "-"}
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </Table>
            </div>
        </Card>
    );
};

const FrappeButton = ({
    children,
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <Button
        variant="outline"
        className={cn(
            "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200",
            className,
        )}
        {...props}
    >
        {children}
    </Button>
);

// --- QuickActions Component with Frappe Colors ---
const QuickActions = () => {
    const ActionButton = ({
        children,
        className,
    }: {
        children: React.ReactNode;
        className?: string;
    }) => (
        <FrappeButton
            className={cn(
                "w-full justify-start text-xs h-auto py-2",
                className,
            )}
        >
            {children}
        </FrappeButton>
    );
    const Section = ({
        title,
        icon: Icon,
        children,
    }: {
        title: string;
        icon: any;
        children: React.ReactNode;
    }) => (
        <div className="p-3 pb-4 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2 text-xs uppercase tracking-wide">
                <Icon className="h-3.5 w-3.5 text-[#D97757]" />
                {title}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {children}
            </div>
        </div>
    );
    return (
        <div className="space-y-4">
            <Section title="Advance" icon={CreditCardIcon}>
                <ActionButton className="bg-sky-50 hover:bg-sky-100 text-sky-700">
                    Reimbursement
                </ActionButton>
                <ActionButton className="bg-sky-50 hover:bg-sky-100 text-sky-700">
                    Temporary Advance Apply
                </ActionButton>
                <ActionButton className="bg-sky-50 hover:bg-sky-100 text-sky-700">
                    Temporary Advance Settle
                </ActionButton>
            </Section>
            <Section title="Disbursal" icon={UploadIcon}>
                {/* <ActionButton className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700">
          One Time Assistantship
        </ActionButton> */}
                <ActionButton className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700">
                    Top Up Fellowship
                </ActionButton>
            </Section>
            <Section title="Purchase" icon={ShoppingCartIcon}>
                <ActionButton className="bg-amber-50 hover:bg-amber-100 text-amber-700">
                    Direct Purchase
                </ActionButton>
                <ActionButton className="bg-amber-50 hover:bg-amber-100 text-amber-700">
                    General Indent
                </ActionButton>
                <ActionButton className="bg-amber-50 hover:bg-amber-100 text-amber-700">
                    Generate NIQ
                </ActionButton>
                <ActionButton className="bg-amber-50 hover:bg-amber-100 text-amber-700">
                    Indent cum Sanction
                </ActionButton>
                <ActionButton className="bg-amber-50 hover:bg-amber-100 text-amber-700">
                    Rate Contract
                </ActionButton>
            </Section>
            <Section title="Recruitment" icon={UsersGroupIcon}>
                <ActionButton className="bg-rose-50 hover:bg-rose-100 text-rose-700">
                    Adhoc
                </ActionButton>
                <ActionButton className="bg-rose-50 hover:bg-rose-100 text-rose-700">
                    Committee Member Change
                </ActionButton>
                <ActionButton className="bg-rose-50 hover:bg-rose-100 text-rose-700">
                    Contractual
                </ActionButton>
                <ActionButton className="bg-rose-50 hover:bg-rose-100 text-rose-700">
                    Selection Committee Report
                </ActionButton>
            </Section>
            <Section title="Travel" icon={PlaneIcon}>
                <ActionButton className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700">
                    Apply
                </ActionButton>
                <ActionButton className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700">
                    TA-DA Settle
                </ActionButton>
            </Section>
            <Section title="Utilities" icon={SettingsIcon}>
                <ActionButton className="bg-slate-100 hover:bg-slate-200 text-slate-700">
                    Add New User
                </ActionButton>
                <ActionButton className="bg-slate-100 hover:bg-slate-200 text-slate-700">
                    Application History
                </ActionButton>
                <ActionButton className="bg-slate-100 hover:bg-slate-200 text-slate-700">
                    Form Tracking
                </ActionButton>
                <ActionButton className="bg-slate-100 hover:bg-slate-200 text-slate-700">
                    Incharge Assignment
                </ActionButton>
            </Section>
        </div>
    );
};

// --- Activity Stream Component (Unchanged logic, updated styles) ---
const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
    ({ doctype, docname }, ref) => {
        const [newComment, setNewComment] = useState("");
        const [isSubmitting, setIsSubmitting] = useState(false);
        const {
            data: activityData,
            mutate: refetchActivity,
            error: activityError,
            isLoading: isActivityLoading,
        } = useFrappeGetCall<{ message: ActivityItem[] }>(
            "rndopsapp.rndopsapp.api.get_project_activity",
            { doctype, docname },
            {
                enabled: !!docname,
                revalidateOnFocus: false,
                revalidateOnReconnect: false,
            },
        );
        const { call: addComment } = useFrappePostCall(
            "rndopsapp.rndopsapp.api.add_project_comment",
        );
        const handleCommentSubmit = async () => {
            if (!newComment.trim()) return;
            setIsSubmitting(true);
            try {
                await addComment({
                    doctype,
                    docname,
                    content: newComment.trim(),
                });
                setNewComment("");
                await refetchActivity();
            } catch (err: any) {
                console.error("Failed to add comment:", err);
                alert("Error: Could not post comment.");
            } finally {
                setIsSubmitting(false);
            }
        };
        const handleKeyPress = (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleCommentSubmit();
            }
        };
        useImperativeHandle(ref, () => ({
            refetch() {
                refetchActivity();
            },
        }));
        return (
            <div className="space-y-6">
                <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <label
                        htmlFor="comment-textarea"
                        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3"
                    >
                        Add a comment
                    </label>
                    <Textarea
                        id="comment-textarea"
                        placeholder="Type here... (Ctrl+Enter to submit)"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleKeyPress}
                        disabled={isSubmitting}
                        className="resize-none bg-white dark:bg-zinc-900 p-3 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                        rows={4}
                    />
                    <div className="flex items-center justify-between mt-4">
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                            {newComment.length}/1000
                        </span>
                        <FrappeButton
                            onClick={handleCommentSubmit}
                            disabled={isSubmitting || !newComment.trim()}
                            className="bg-[#D97757] hover:bg-[#D97757] text-white"
                        >
                            {isSubmitting ? "Submitting..." : "Submit"}
                        </FrappeButton>
                    </div>
                </div>
                <div className="space-y-4">
                    {isActivityLoading && (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent"></div>
                        </div>
                    )}
                    {activityError && (
                        <div className="text-center p-6 text-red-700 border border-red-200 rounded-xl bg-red-50">
                            <p className="font-medium">
                                Failed to load activities
                            </p>
                        </div>
                    )}
                    {activityData?.message && activityData.message.length > 0
                        ? activityData.message.map((item, index) => (
                            <div
                                key={`${item.creation}-${index}`}
                                className="flex items-start gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm"
                            >
                                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-zinc-50 dark:bg-zinc-800 dark:bg-[#D97757]/20 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center font-semibold text-[#D97757] text-sm">
                                    {item.owner?.charAt(0).toUpperCase() ||
                                        "U"}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                            {item.owner || "Unknown User"}
                                        </p>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                            <ClockIcon className="h-3 w-3" />
                                            {item.creation
                                                ? new Date(
                                                    item.creation,
                                                ).toLocaleString()
                                                : "N/A"}
                                        </p>
                                    </div>
                                    <div
                                        className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm max-w-none leading-relaxed"
                                        dangerouslySetInnerHTML={{
                                            __html:
                                                item.content || "No content",
                                        }}
                                    />
                                </div>
                            </div>
                        ))
                        : !isActivityLoading && (
                            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900">
                                <MessageSquareIcon className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                                <p className="font-medium text-zinc-600 dark:text-zinc-400">
                                    No activity yet.
                                </p>
                                <p className="text-sm mt-1">
                                    Be the first to add a comment.
                                </p>
                            </div>
                        )}
                </div>
            </div>
        );
    },
);
ActivityStream.displayName = "ActivityStream";

// --- Workflow Actions Component (Unchanged) ---
const WorkflowActions = ({
    docname,
    onAction,
    isLoading,
    projectNo,
    status,
    isStaffRnD,
    accountDetails,
}: {
    docname: string;
    onAction: (action: string) => void;
    isLoading: boolean;
    projectNo?: string;
    status?: string;
    isStaffRnD?: boolean;
    accountDetails?: {
        is_the_account_type_pfms?: string;
        scheme_name?: string;
        enter_scheme_number?: string;
        account_number?: string;
        bank_name?: string;
    };
}) => {
    const {
        data,
        error,
        isLoading: isActionsLoading,
    } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions",
        { docname },
    );
    if (isActionsLoading) {
        return (
            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Loading actions...
            </div>
        );
    }
    if (error || !data?.message || data.message.length === 0) {
        return null;
    }

    const accountTypeSet = !!accountDetails?.is_the_account_type_pfms?.trim();
    const accountDetailsFilled = accountTypeSet && (
        accountDetails?.is_the_account_type_pfms === "Yes"
            ? !!(accountDetails?.scheme_name?.trim() && accountDetails?.enter_scheme_number?.trim())
            : !!(accountDetails?.account_number?.trim() && accountDetails?.bank_name?.trim())
    );

    const isForwardBlocked =
        isStaffRnD &&
        status === "Pending Staff Approval" &&
        (!projectNo?.trim() || !accountDetailsFilled);

    return (
        <div className="flex items-center gap-2">
            {data.message
                .filter((actionString: string) => actionString !== "Submit")
                .map((actionString: string) => {
                const isForward = actionString.toLowerCase() === "forward";
                const blocked = isForward && isForwardBlocked;
                return (
                    <div key={actionString} className="relative group">
                        <Button
                            onClick={() => onAction(actionString)}
                            variant={
                                actionString.toLowerCase().includes("approve") ||
                                    actionString.toLowerCase().includes("submit") ||
                                    actionString.toLowerCase().includes("register")
                                    ? "default"
                                    : actionString.toLowerCase().includes("reject")
                                        ? "destructive"
                                        : "secondary"
                            }
                            className={cn(
                                "flex items-center gap-2 h-9 px-4 text-xs font-medium rounded-lg shadow-sm transition-all",
                                {
                                    "bg-[#D97757] hover:bg-[#c96a46] text-white border-transparent":
                                        actionString.toLowerCase().includes("approve") ||
                                        actionString.toLowerCase().includes("submit") ||
                                        actionString.toLowerCase().includes("register"),
                                    "bg-red-500 hover:bg-red-600 text-white border-transparent":
                                        actionString.toLowerCase().includes("reject"),
                                    "bg-white dark:bg-zinc-900 hover:bg-zinc-50 text-zinc-700 border border-zinc-200":
                                        !["approve", "reject", "submit", "register"].some((term) =>
                                            actionString.toLowerCase().includes(term),
                                        ),
                                    "opacity-50 cursor-not-allowed": blocked,
                                },
                            )}
                            disabled={isLoading || blocked}
                        >
                            {actionString.toLowerCase().includes("approve") && (
                                <CheckCircleIcon className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {actionString.toLowerCase().includes("reject") && (
                                <XCircleIcon className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            {isLoading ? "Processing..." : actionString}
                        </Button>
                        {blocked && (
                            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 w-max max-w-xs">
                                <div className="bg-zinc-900 text-white text-xs rounded px-2.5 py-1.5 shadow-lg">
                                    {!projectNo?.trim() && (
                                        <div>Project Number is required before forwarding.</div>
                                    )}
                                    {!accountDetailsFilled && (
                                        <div>Account Details (Account Type &amp; related fields) must be saved before forwarding.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// --- WORKFLOW TIMELINE ---
type StageStatus = 'completed' | 'in-progress' | 'pending' | 'rejected' | 'draft';

function buildTimelineStages(currentState: string, mainStages: string[]): { label: string; status: StageStatus }[] {
    const isApproved = currentState === 'Approved';
    const isErrorState = currentState === 'Rejected' || currentState === 'Needs Correction';
    const isPutBack = currentState === 'Put Back';
    let normalizedState = isPutBack ? 'Pending Staff Approval' : currentState;

    // Normalize Head/HoD discrepancies between workflow states and document state
    if (normalizedState === 'Pending Head Approval' && !mainStages.includes('Pending Head Approval') && mainStages.includes('Pending HoD Approval')) {
        normalizedState = 'Pending HoD Approval';
    } else if (normalizedState === 'Pending HoD Approval' && !mainStages.includes('Pending HoD Approval') && mainStages.includes('Pending Head Approval')) {
        normalizedState = 'Pending Head Approval';
    }

    const currentIdx = mainStages.findIndex(s => s === normalizedState);

    return mainStages.map((stage, idx) => {
        if (isApproved) return { label: stage, status: 'completed' };
        if (isErrorState) {
            if (idx < mainStages.length - 1) return { label: stage, status: idx < currentIdx ? 'completed' : idx === currentIdx ? 'rejected' : 'pending' };
            return { label: currentState, status: 'rejected' };
        }
        if (idx < currentIdx) return { label: stage, status: 'completed' };
        if (idx === currentIdx) return { label: isPutBack ? `${stage} (Put Back)` : stage, status: 'in-progress' };
        return { label: stage, status: 'pending' };
    });
}

function useProjectWorkflowStages() {
    const { data: workflowDoc } = useFrappeGetCall<{ message: any[] }>(
        "frappe.client.get_list",
        {
            doctype: "Workflow",
            filters: { document_type: "Project Registration" },
            fields: ["name"],
        }
    );
    const workflowName = workflowDoc?.message?.[0]?.name;

    const { data: fullWorkflow, isLoading } = useFrappeGetCall<{ message: any }>(
        "frappe.client.get",
        {
            doctype: "Workflow",
            name: workflowName
        },
        workflowName ? `workflow-doc-${workflowName}` : null
    );

    const mainStages = React.useMemo(() => {
        if (!fullWorkflow?.message?.states) return [];
        const sortedStates = [...fullWorkflow.message.states]
            .sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0))
            .map(s => s.state);
        // Deduplicate in case Frappe states table has repeats
        return sortedStates.filter((val, index, arr) => arr.indexOf(val) === index);
    }, [fullWorkflow]);

    return { mainStages, isLoading };
}

const getPendingAgeLabel = (createdAt?: string) => {
    if (!createdAt) return null;
    const normalized = createdAt.includes("T") ? createdAt : createdAt.replace(" ", "T");
    const createdTime = new Date(normalized).getTime();
    if (Number.isNaN(createdTime)) return null;
    const days = Math.max(0, Math.floor((Date.now() - createdTime) / (1000 * 60 * 60 * 24)));
    return `${days} ${days === 1 ? "day" : "days"}`;
};

const WorkflowTimeline: React.FC<{ currentState: string, createdAt?: string, userRoles?: string[], rolesLoading?: boolean }> = ({ currentState, createdAt, userRoles = [], rolesLoading = false }) => {
    const { mainStages, isLoading } = useProjectWorkflowStages();

    // Fallback if loading or empty
    let stagesToUse = mainStages.length > 0 ? mainStages : ['Draft', 'Pending...', 'Approved'];

    // Map HoD to Head natively to fix timeline naming discrepancies
    stagesToUse = stagesToUse.map(stage => stage === 'Pending HoD Approval' ? 'Pending Head Approval' : stage);

    // Dedup again since mapping might have created duplicates if both existed
    stagesToUse = stagesToUse.filter((val, index, arr) => arr.indexOf(val) === index);

    // Filter out error/conditional states if they are not the current state
    stagesToUse = stagesToUse.filter(stage => {
        if (stage === 'Pending Mentor Approval') {
            // Mentor approval is bypassed for PE and project staff based on the transitions sheet
            if (userRoles.includes('Permanent Employee') || userRoles.includes('project staff')) {
                return stage === currentState;
            }
        }

        const s = stage.toLowerCase();
        if (s.includes('rejected') || s.includes('correction') || s.includes('endorsement')) {
            return stage === currentState;
        }
        return true;
    });

    const stages = buildTimelineStages(currentState, stagesToUse);
    const pendingAgeLabel = getPendingAgeLabel(createdAt);

    const iconForStatus = (status: StageStatus) => {
        if (status === 'completed') return <CheckCircle2 className="w-2.5 h-2.5 text-white" />;
        if (status === 'in-progress') return <Clock className="w-2.5 h-2.5 text-white" />;
        if (status === 'rejected') return <XCircle className="w-2.5 h-2.5 text-white" />;
        return <span className="w-1.5 h-1.5 rounded-full bg-white/60" />;
    };

    const bgForStatus = (status: StageStatus) => {
        if (status === 'completed') return 'bg-emerald-500';
        if (status === 'in-progress') return 'bg-[#D97757]';
        if (status === 'rejected') return 'bg-red-500';
        return 'bg-zinc-300 dark:bg-zinc-600';
    };

    const connectorColor = (status: StageStatus) =>
        status === 'completed' ? 'bg-emerald-400' : 'bg-zinc-200 dark:bg-zinc-700';

    if (isLoading || rolesLoading) {
        return <div className="animate-pulse h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl" />;
    }

    return (
        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl shadow-sm px-4 py-2 w-full overflow-hidden">
            <h3 className="text-[9px] font-extrabold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.12em] mb-2">
                Workflow Progress
            </h3>
            <div className="flex items-start overflow-x-auto scrollbar-thin">
                {stages.map((stage, idx) => (
                    <React.Fragment key={stage.label + idx}>
                        <div className="flex flex-col items-center min-w-[54px] max-w-[72px]">
                            <div className={cn(
                                'w-5 h-5 rounded-full flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-[#27272A] flex-shrink-0 transition-all duration-300',
                                bgForStatus(stage.status),
                            )}>
                                {iconForStatus(stage.status)}
                            </div>
                            <p className={cn(
                                'mt-1 text-center text-[9px] leading-tight px-1 transition-all duration-300',
                                stage.status === 'in-progress' ? 'font-bold text-[#D97757]' : '',
                                stage.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400 font-medium' : '',
                                stage.status === 'pending' ? 'text-zinc-400 dark:text-zinc-500' : '',
                                stage.status === 'rejected' ? 'text-red-500 font-bold' : '',
                            )}>
                                {stage.label}
                            </p>
                            {stage.status === 'in-progress' && (
                                <span className="mt-0.5 flex-shrink-0 text-[8px] font-bold text-white bg-[#D97757] px-1.5 py-[1px] rounded-full leading-none">
                                    {pendingAgeLabel ? `${pendingAgeLabel}` : "Pending"}
                                </span>
                            )}
                        </div>
                        {idx < stages.length - 1 && (
                            <div className="flex-1 flex items-center pt-2 min-w-[16px]">
                                <div className={cn('h-0.5 w-full rounded transition-all duration-300', connectorColor(stage.status))} />
                                <ChevronRight className="w-2.5 h-2.5 text-zinc-400 flex-shrink-0 -ml-[2px]" />
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
            {/* Pending at text */}
            {currentState && currentState !== 'Draft' && currentState !== 'Approved' && currentState !== 'Rejected' && (
                <div className="mt-1.5 pt-1.5 border-t border-[#F4F4F5] dark:border-[#3F3F46]">
                    <p className="text-[9px] text-[#71717A] dark:text-[#A1A1AA] transition-all duration-300">
                        Currently pending at:{' '}
                        <span className="font-semibold text-[#D97757]">{currentState}</span>
                        {pendingAgeLabel && (
                            <span className="font-semibold text-[#D97757]"> · {pendingAgeLabel} pending</span>
                        )}
                    </p>
                </div>
            )}
        </div>
    );
};

// --- Main Component ---
const ProjectDetailsView: React.FC<ProjectDetailsProps> = ({
    projectName: propProjectName,
    backUrl = "/projects-view",
    backLabel = "Back to Projects",
}) => {
    // --- LOGIC: All hooks and handlers remain unchanged ---
    const { projectName: paramProjectName } = useParams<{
        projectName: string;
    }>();
    const projectName = propProjectName || paramProjectName;

    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");
    const activityStreamRef = useRef<ActivityStreamHandle>(null);
    const { currentUser } = useFrappeAuth();
    const { roles, isLoading: isRolesLoading } = useUserRoles(currentUser ?? null);
    const isRnDStaff = roles.some(r => r === "staff, RnD");

    const { data, error, isLoading, mutate } = useFrappeGetDoc(
        "Project Registration",
        projectName ?? "",
        { enabled: !!projectName, cacheTime: 0 },
    );

    const MINIO_BASE = "http://172.16.135.118:9000";
    const attachmentsPath = `${MINIO_BASE}/prod-rnd-files/Project_Registration/${projectName}/attachments`;

    const { data: frappeFiles } = useFrappeGetDocList("File", {
        filters: [
            ["attached_to_doctype", "=", "Project Registration"],
            ["attached_to_name", "=", projectName ?? ""],
        ],
        fields: ["file_name", "file_url", "file_size", "attached_to_field", "creation"],
        limit: 200,
    }, projectName ? undefined : null);

    // Auto-switch to endorsement tab when status is "Endorsement Pending at Dean"
    React.useEffect(() => {
        if (data?.workflow_state === "Endorsement Pending at Dean") {
            setActiveTab("endorsement");
        }
    }, [data?.workflow_state]);

    // Fetch Budget Heads for mapping
    const [budgetHeadList, setBudgetHeadList] = React.useState<
        { name: string; id: number }[]
    >([]);
    React.useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch(
                    '/api/v2/document/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc',
                );
                const result = await response.json();
                if (result?.data) {
                    setBudgetHeadList(
                        result.data.map((item: any) => ({
                            name: item.budget_head,
                            id: item.id,
                        })),
                    );
                }
            } catch (err) {
                console.error("Failed to fetch Budget Heads:", err);
            }
        };
        fetchBudgetHeads();
    }, []);

    // Fetch Funding Agency master details
    const { data: fundingAgencyResult } = useFrappeGetCall<{ message: Record<string, any> }>(
        "frappe.client.get_value",
        data?.funding_agen
            ? {
                doctype: "fundingagency_",
                filters: data.funding_agen,
                fieldname: JSON.stringify([
                    "funding_agency_id",
                    "funding_agency_name",
                    "funding_agency_initials",
                    "funding_agency_type_1",
                    "origin_of_funding_agency",
                    "gstin_of_funding_agency",
                    "ministry_funding_agency",
                    "fundingagency_address",
                    "fundingagency_country",
                    "fundingagency_state",
                    "fundingagency_postalcode",
                ]),
            }
            : undefined,
        data?.funding_agen ? `funding-agency-${data.funding_agen}` : null,
        { revalidateOnFocus: false, revalidateOnReconnect: false, refreshInterval: 0, dedupingInterval: 60000 },
    );
    const fundingAgencyData = fundingAgencyResult?.message;

    const { call: triggerWorkflowAction, loading: isActionLoading } =
        useFrappePostCall(
            "rndopsapp.rndopsapp.doctype.project_registration.project_registration.handle_dynamic_workflow_action",
        );
    const { call: submitProjectRegistration } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.submit_project_registration",
    );

    // const { call: viewEndorsementFile, loading: isViewingEndorsement } =
    //     useFrappePostCall(
    //         "rndopsapp.rndopsapp.doctype.project_registration.project_registration.view_endorsement_file",
    //     );
    const { call: fetchEndorsementData, loading: isFetchingEndorsementHtml } =
        useFrappePostCall("frappe.client.get_list");
    const { call: updatePfmsFields } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.update_project_fields');
    const [pfmsForm, setPfmsForm] = useState({
        is_the_account_type_pfms: "",
        scheme_name: "",
        enter_scheme_number: "",
        account_number: "",
        bank_name: "",
    });
    const [isSavingPfms, setIsSavingPfms] = useState(false);

    // Sync pfmsForm with loaded data
    React.useEffect(() => {
        if (data) {
            setPfmsForm({
                is_the_account_type_pfms: data.is_the_account_type_pfms || "",
                scheme_name: data.scheme_name || "",
                enter_scheme_number: data.enter_scheme_number || "",
                account_number: data.account_number || "",
                bank_name: data.bank_name || "",
            });
        }
    }, [data]);

    const handleSavePfms = useCallback(async () => {
        if (!projectName) return;
        setIsSavingPfms(true);
        try {
            await updatePfmsFields({
                docname: projectName,
                is_the_account_type_pfms: pfmsForm.is_the_account_type_pfms,
                scheme_name: pfmsForm.scheme_name,
                enter_scheme_number: pfmsForm.enter_scheme_number,
                account_number: pfmsForm.account_number,
                bank_name: pfmsForm.bank_name,
            });
            await mutate();
            alert("Account details saved successfully.");
        } catch (e: any) {
            alert("Failed to save account details: " + (e?.message || "Unknown error"));
        } finally {
            setIsSavingPfms(false);
        }
    }, [projectName, pfmsForm, updatePfmsFields, mutate]);

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAction, setSelectedAction] = useState("");
    const [endorsementModalOpen, setEndorsementModalOpen] = useState(false);
    const [endorsementHtml, setEndorsementHtml] = useState<string | null>(null);
    const [isDownloadingEndorsementCertificate, setIsDownloadingEndorsementCertificate] = useState(false);

    const fetchNormalizedEndorsementHtml = useCallback(async () => {
        if (!projectName) return null;
        const res = await fetchEndorsementData({
            doctype: "Endorsement Data",
            filters: JSON.stringify([
                ["project_ref_num", "=", projectName],
            ]),
            fields: JSON.stringify(["endorsement_html"]),
            limit_page_length: 1,
        });
        const records = res?.message;
        if (records?.length > 0 && records[0].endorsement_html) {
            return normalizeEndorsementHtmlForProject(
                records[0].endorsement_html,
                projectName,
                data?.workflow_state,
            );
        }
        return null;
    }, [data?.workflow_state, fetchEndorsementData, projectName]);

    const handleWorkflowAction = useCallback((action: string) => {
        setSelectedAction(action);
        setModalOpen(true);
    }, []);

    const handleConfirmAction = useCallback(
        (comment: string) => {
            const action = selectedAction;
            const apiCall =
                action.toLowerCase() === "submit"
                    ? submitProjectRegistration({ docname: projectName }) // Submit might not need comment, or backend might not support it yet. But generic workflow usually does.
                    : triggerWorkflowAction({
                        doctype: "Project Registration",
                        docname: projectName,
                        action: action,
                        comment: comment, // Passing comment here
                    });
            apiCall
                .then(() => {
                    setModalOpen(false);
                    window.location.reload();
                })
                .catch((err: any) =>
                    console.error(`Error during workflow action:`, err),
                );
        },
        [
            triggerWorkflowAction,
            submitProjectRegistration,
            mutate,
            projectName,
            selectedAction,
        ],
    );

    const tabs = [
        // { id: "quick-actions", label: "Available Services", icon: SettingsIcon },
        {
            id: "overview",
            label: "Overview",
            icon: FileTextIcon,
            activeClass: "bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A] shadow-sm shadow-[#4A6CF7]/10 dark:bg-[#4A6CF7]/18 dark:border-[#818CF8] dark:text-[#C7D2FE]",
            inactiveClass: "border-[#C7D2FE] bg-[#EEF2FF]/55 text-[#1E3A8A] hover:bg-[#EEF2FF] dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/10 dark:text-[#C7D2FE]",
            iconClass: "text-[#4A6CF7] dark:text-[#A5B4FC]",
        },
        {
            id: "investigators",
            label: "Investigators",
            icon: UsersIcon,
            activeClass: "bg-[#ECFDF5] border-[#10B981] text-[#065F46] shadow-sm shadow-[#10B981]/10 dark:bg-[#10B981]/15 dark:border-[#34D399] dark:text-[#A7F3D0]",
            inactiveClass: "border-[#A7F3D0] bg-[#ECFDF5]/60 text-[#047857] hover:bg-[#ECFDF5] dark:border-[#10B981]/30 dark:bg-[#10B981]/10 dark:text-[#A7F3D0]",
            iconClass: "text-[#059669] dark:text-[#6EE7B7]",
        },
        {
            id: "funding",
            label: "Funding & Budget",
            icon: IndianRupeeIcon,
            activeClass: "bg-[#FFF7ED] border-[#F97316] text-[#9A3412] shadow-sm shadow-[#F97316]/10 dark:bg-[#F97316]/15 dark:border-[#FB923C] dark:text-[#FED7AA]",
            inactiveClass: "border-[#FED7AA] bg-[#FFF7ED]/65 text-[#C2410C] hover:bg-[#FFF7ED] dark:border-[#F97316]/30 dark:bg-[#F97316]/10 dark:text-[#FED7AA]",
            iconClass: "text-[#EA580C] dark:text-[#FDBA74]",
        },
        {
            id: "clearance",
            label: "Clearance",
            icon: ShieldIcon,
            activeClass: "bg-[#FDF2F8] border-[#DB2777] text-[#9D174D] shadow-sm shadow-[#DB2777]/10 dark:bg-[#DB2777]/15 dark:border-[#F472B6] dark:text-[#FBCFE8]",
            inactiveClass: "border-[#FBCFE8] bg-[#FDF2F8]/65 text-[#BE185D] hover:bg-[#FDF2F8] dark:border-[#DB2777]/30 dark:bg-[#DB2777]/10 dark:text-[#FBCFE8]",
            iconClass: "text-[#DB2777] dark:text-[#F9A8D4]",
        },
        {
            id: "endorsement",
            label: "Endorsement",
            icon: FileBadge,
            activeClass: "bg-[#F5F3FF] border-[#8B5CF6] text-[#5B21B6] shadow-sm shadow-[#8B5CF6]/10 dark:bg-[#8B5CF6]/15 dark:border-[#A78BFA] dark:text-[#DDD6FE]",
            inactiveClass: "border-[#DDD6FE] bg-[#F5F3FF]/65 text-[#6D28D9] hover:bg-[#F5F3FF] dark:border-[#8B5CF6]/30 dark:bg-[#8B5CF6]/10 dark:text-[#DDD6FE]",
            iconClass: "text-[#7C3AED] dark:text-[#C4B5FD]",
        },
        {
            id: "files",
            label: "Files",
            icon: FolderOpenIcon,
            activeClass: "bg-[#F0FDFA] border-[#14B8A6] text-[#115E59] shadow-sm shadow-[#14B8A6]/10 dark:bg-[#14B8A6]/15 dark:border-[#2DD4BF] dark:text-[#99F6E4]",
            inactiveClass: "border-[#99F6E4] bg-[#F0FDFA]/65 text-[#0F766E] hover:bg-[#F0FDFA] dark:border-[#14B8A6]/30 dark:bg-[#14B8A6]/10 dark:text-[#99F6E4]",
            iconClass: "text-[#0D9488] dark:text-[#5EEAD4]",
        },
        {
            id: "activity",
            label: "Activity Log",
            icon: MessageSquareIcon,
            activeClass: "bg-[#F4F4F5] border-[#71717A] text-[#3F3F46] shadow-sm dark:bg-[#3F3F46] dark:border-[#A1A1AA] dark:text-[#E4E4E7]",
            inactiveClass: "border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8]",
            iconClass: "text-[#71717A] dark:text-[#A1A1AA]",
        },
    ];

    const needsProjectNumberGeneration =
        data?.workflow_state === "Pending Staff Approval" && isRnDStaff;

    const renderContent = () => {
        if (!projectName) {
            return (
                <div className="flex items-center justify-center p-4 min-h-screen">
                    <div className="text-center p-8 max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm">
                        <FileTextIcon className="h-16 w-16 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                            No Project Selected
                        </h2>
                        <p className="text-zinc-700 dark:text-zinc-300 mb-6 font-mono">
                            Select a project to see details.
                        </p>
                        <FrappeButton
                            onClick={() => navigate(backUrl)}
                            className="bg-cyan-300 hover:bg-cyan-400"
                        >
                            {backLabel}
                        </FrappeButton>
                    </div>
                </div>
            );
        }
        if (isLoading) {
            return <GlobalLoader isLoading delay={0} />;
        }
        if (error) {
            return (
                <div className="flex items-center justify-center p-4 min-h-screen">
                    <div className="text-center p-8 max-w-md w-full bg-red-50 border border-red-200 rounded-xl">
                        <h2 className="text-xl font-semibold text-red-800 mb-2">
                            Error Loading Project
                        </h2>
                        <p className="text-[#D97757] mb-6 text-sm">
                            {error.message}
                        </p>
                        {/* <FrappeButton
                            onClick={() => navigate(backUrl)}
                            className="bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:bg-zinc-800"
                        >
                            {backLabel}
                        </FrappeButton> */}
                    </div>
                </div>
            );
        }

        const acctTypeSet = !!data?.is_the_account_type_pfms?.trim();
        const acctDetailsFilled = acctTypeSet && (
            data?.is_the_account_type_pfms === "Yes"
                ? !!(data?.scheme_name?.trim() && data?.enter_scheme_number?.trim())
                : !!(data?.account_number?.trim() && data?.bank_name?.trim())
        );

        return (
            <>
                <header className="mb-5 overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="p-5">
                    <div className="flex items-start justify-between flex-col xl:flex-row gap-5">
                        <div className="flex items-start gap-4 min-w-0">
                            <button
                                onClick={() => navigate(backUrl)}
                                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#D97757] hover:border-[#D97757]/30 hover:bg-[#D97757]/10 transition-colors"
                            >
                                <ArrowLeftIcon className="h-4 w-4" />
                            </button>
                            <div className="min-w-0">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
                                        Project Details
                                    </span>
                                    <ProjectStatusBadge status={data?.workflow_state} />
                                </div>
                                <h1 className="font-sans text-[18px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                    {data?.project_title || "Project Details"}
                                </h1>
                                <p className="mt-1 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                    ID: <span className="font-mono text-[#3F3F46] dark:text-[#E4E4E7]">{projectName}</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {((data?.workflow_state === 'Draft' || !data?.workflow_state) ||
                                (data?.workflow_state === 'Needs Correction (PE)' && currentUser === data?.pi_userid)) && (
                                    <button
                                        onClick={() => navigate(`/project-registration?docname=${projectName}&edit=true`)}
                                        className="inline-flex h-8 items-center gap-1.5 px-3 rounded-lg bg-[#D97757] hover:bg-[#c66a4e] text-white text-[12px] font-semibold shadow-sm transition-colors"
                                    >
                                        <PencilIcon className="h-3.5 w-3.5" /> Edit
                                    </button>
                                )}
                            <WorkflowActions
                                docname={projectName}
                                onAction={handleWorkflowAction}
                                isLoading={isActionLoading}
                                projectNo={data?.project_no}
                                status={data?.workflow_state}
                                isStaffRnD={isRnDStaff}
                                accountDetails={{
                                    is_the_account_type_pfms: data?.is_the_account_type_pfms,
                                    scheme_name: data?.scheme_name,
                                    enter_scheme_number: data?.enter_scheme_number,
                                    account_number: data?.account_number,
                                    bank_name: data?.bank_name,
                                }}
                            />
                        </div>
                    </div>
                    </div>
                </header>
                <CommentModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    onSubmit={handleConfirmAction}
                    action={selectedAction}
                    isLoading={isActionLoading}
                />
                <EndorsementModal
                    isOpen={endorsementModalOpen}
                    onClose={() => setEndorsementModalOpen(false)}
                    html={endorsementHtml}
                    isLoading={isFetchingEndorsementHtml}
                />
                <div className="mb-5">
                    <WorkflowTimeline currentState={data?.workflow_state || 'Draft'} createdAt={data?.creation} userRoles={roles} rolesLoading={isRolesLoading} />
                </div>
                {isRnDStaff && data?.workflow_state === "Pending Staff Approval" && !data?.project_no?.trim() && (
                    <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
                        <AlertTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Project Number Not Generated</p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                A project number must be generated before this project can be forwarded. Please generate it using the form on the right.
                            </p>
                        </div>
                    </div>
                )}
                {isRnDStaff && data?.workflow_state === "Pending Staff Approval" && !acctDetailsFilled && (
                    <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700">
                        <AlertTriangleIcon className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Account Details Incomplete</p>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                Account Type and all related account fields must be saved before this project can be forwarded. Please fill them in using the form on the right.
                            </p>
                        </div>
                    </div>
                )}
                <div className="border-t-2 border-[#4A6CF7]/35 pt-4 dark:border-[#818CF8]/35">
                <div className="bg-white dark:bg-[#27272A] border border-[#D4D4D8] dark:border-[#52525B] rounded-xl shadow-sm overflow-hidden">
                    <div className="border-b border-[#D4D4D8] dark:border-[#52525B] bg-[#FAFAF9] dark:bg-[#27272A]">
                        <nav className="flex items-center gap-1 p-2 overflow-x-auto">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex-shrink-0 flex h-8 items-center gap-1.5 px-2.5 font-bold text-[11px] uppercase tracking-wide rounded-lg border transition-all",
                                        activeTab === tab.id ? tab.activeClass : tab.inactiveClass,
                                    )}
                                >
                                    <tab.icon className={cn("h-3.5 w-3.5", tab.iconClass)} />
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                    <div className="bg-[#F4F4F5] dark:bg-[#18181B] p-4 md:p-5">
                        <div
                            className={`grid grid-cols-1 ${(needsProjectNumberGeneration || isRnDStaff) ? "lg:grid-cols-3" : "lg:grid-cols-1"} gap-6`}
                        >
                            <div
                                className={
                                    (needsProjectNumberGeneration || isRnDStaff)
                                        ? "lg:col-span-2"
                                        : ""
                                }
                            >
                                {activeTab === "overview" && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                                                <FieldDisplay
                                                    label="Project Type"
                                                    value={data?.project_type}
                                                    icon={FileTextIcon}
                                                />
                                                <FieldDisplay
                                                    label="Project No"
                                                    value={data?.project_no}
                                                    icon={FileTextIcon}
                                                />
                                                <FieldDisplay
                                                    label="Implementation Dept"
                                                    value={
                                                        data?.implementation_department ? (
                                                            <DepartmentName
                                                                name={
                                                                    data?.implementation_department
                                                                }
                                                            />
                                                        ) : null
                                                    }
                                                    icon={BuildingIcon}
                                                />
                                                <FieldDisplay
                                                    label="Status"
                                                    value={data?.workflow_state}
                                                    icon={TargetIcon}
                                                />
                                                <FieldDisplay
                                                    label="Project Duration"
                                                    value={`${data?.project_duration_months}m ${data?.project_duration_days ||
                                                        0
                                                        }d`}
                                                    icon={CalendarIcon}
                                                />
                                                <FieldDisplay
                                                    label="Start Date"
                                                    value={data?.prj_start_date}
                                                    icon={CalendarIcon}
                                                />
                                                <FieldDisplay
                                                    label="End Date"
                                                    value={data?.prj_end_date}
                                                    icon={CalendarIcon}
                                                />
                                                <FieldDisplay
                                                    label="International Travel"
                                                    value={
                                                        data?.involves_international_travel
                                                    }
                                                    icon={PlaneIcon}
                                                />
                                                {data?.upload_proj_prop && (
                                                    <div className="py-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <FileTextIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                                                Project Proposal
                                                            </p>
                                                        </div>
                                                        <a
                                                            href={`http://172.16.135.118:9000/prod-rnd-files/Project_Registration/${projectName}/attachments/${data.upload_proj_prop.split("/").pop()}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-sm font-medium text-[#D97757] hover:underline flex items-center gap-1"
                                                        >
                                                            <ExternalLinkIcon className="h-3 w-3" />{" "}
                                                            {data.upload_proj_prop
                                                                .split("/")
                                                                .pop()}
                                                        </a>
                                                    </div>
                                                )}
                                                {data?.upload_supporting_docs?.length > 0 && (
                                                    <div className="py-3 col-span-full">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <FileTextIcon className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
                                                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                                                Upload Supporting Docs ( Project Proposal / Invitation Letter)
                                                            </p>
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                                                                <thead className="bg-zinc-100 dark:bg-zinc-800">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300 w-8">No.</th>
                                                                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300">File</th>
                                                                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300">Description</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {data.upload_supporting_docs.map((row: any, idx: number) => {
                                                                        const filePath = row.project_file || '';
                                                                        const fileName = filePath.split('/').pop() || filePath;
                                                                        const fileUrl = fileName ? `${attachmentsPath}/${fileName}` : null;
                                                                        return (
                                                                            <tr key={idx} className="border-t border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                                                                <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">{idx + 1}</td>
                                                                                <td className="px-3 py-2">
                                                                                    {fileUrl ? (
                                                                                        <a
                                                                                            href={fileUrl}
                                                                                            target="_blank"
                                                                                            rel="noopener noreferrer"
                                                                                            className="text-[#D97757] hover:underline flex items-center gap-1 truncate max-w-xs"
                                                                                        >
                                                                                            <ExternalLinkIcon className="h-3 w-3 flex-shrink-0" />
                                                                                            <span className="truncate">{fileName}</span>
                                                                                        </a>
                                                                                    ) : (
                                                                                        <span className="text-zinc-400">—</span>
                                                                                    )}
                                                                                </td>
                                                                                <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">{row.file_description || '—'}</td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Account Details */}
                                        {data?.is_the_account_type_pfms && (
                                            <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                                                    Account Details
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                                                    <FieldDisplay
                                                        label="Account Type"
                                                        value={data.is_the_account_type_pfms === "Yes" ? "PFMS" : "Bank Account"}
                                                        icon={CreditCardIcon}
                                                    />
                                                    {data.is_the_account_type_pfms === "Yes" && (
                                                        <>
                                                            <FieldDisplay
                                                                label="Scheme Name"
                                                                value={data.scheme_name}
                                                                icon={FileTextIcon}
                                                            />
                                                            <FieldDisplay
                                                                label="Scheme Number"
                                                                value={data.enter_scheme_number}
                                                                icon={FileTextIcon}
                                                            />
                                                        </>
                                                    )}
                                                    {data.is_the_account_type_pfms === "No" && (
                                                        <>
                                                            <FieldDisplay
                                                                label="Account Number"
                                                                value={data.account_number}
                                                                icon={CreditCardIcon}
                                                            />
                                                            <FieldDisplay
                                                                label="Bank Name"
                                                                value={data.bank_name}
                                                                icon={BuildingIcon}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {/* Consultancy Details */}
                                        {data?.project_type ===
                                            "Consultancy" && (
                                                <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                                                        Consultancy Details
                                                    </h3>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                                                        <FieldDisplay
                                                            label="Consultancy Category"
                                                            value={
                                                                data?.consultancy_category
                                                            }
                                                            icon={FileTextIcon}
                                                        />
                                                        <FieldDisplay
                                                            label="GSTIN"
                                                            value={
                                                                data?.consultancy_gstin
                                                            }
                                                            icon={FileTextIcon}
                                                        />
                                                        <FieldDisplay
                                                            label="GST Rate"
                                                            value={
                                                                data?.consultancy_gst_rate
                                                            }
                                                            icon={IndianRupeeIcon}
                                                        />

                                                        {data?.consultancy_category?.startsWith(
                                                            "Category D",
                                                        ) && (
                                                                <>
                                                                    <FieldDisplay
                                                                        label="Category D Note"
                                                                        value={
                                                                            data?.category_d_note
                                                                        }
                                                                        icon={
                                                                            FileTextIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="Total Cost (Excl. GST)"
                                                                        value={
                                                                            data?.cat_d_project_cost_excl_gst
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="Consultancy Fee"
                                                                        value={
                                                                            data?.cat_d_consultancy_fee_input
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="Operational Expense (+OH)"
                                                                        value={
                                                                            data?.operational_expense_input_inc_10_oh
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="Institute Share"
                                                                        value={
                                                                            data?.cat_d_institute_share
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="Total Overhead"
                                                                        value={
                                                                            data?.cat_d_total_overhead
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="GST Amount"
                                                                        value={
                                                                            data?.cat_d_gst_amt
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="Grand Total"
                                                                        value={
                                                                            data?.cat_d_grand_total_calc
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                </>
                                                            )}

                                                        {!data?.consultancy_category?.startsWith(
                                                            "Category D",
                                                        ) &&
                                                            data?.consultancy_category && (
                                                                <>
                                                                    <FieldDisplay
                                                                        label="Category Note"
                                                                        value={
                                                                            data?.category_e_note ||
                                                                            data?.category_t_note
                                                                        }
                                                                        icon={
                                                                            FileTextIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="Total Amount"
                                                                        value={
                                                                            data?.cat_ef_total_amount
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="Honorarium"
                                                                        value={
                                                                            data?.cat_ef_honorarium
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="Institute Share"
                                                                        value={
                                                                            data?.cat_ef_institute_share
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="GST"
                                                                        value={
                                                                            data?.cat_ef_gst
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                    <FieldDisplay
                                                                        label="Grand Total"
                                                                        value={
                                                                            data?.cat_ef_grand_total
                                                                        }
                                                                        icon={
                                                                            IndianRupeeIcon
                                                                        }
                                                                    />
                                                                </>
                                                            )}
                                                    </div>
                                                </div>
                                            )}
                                        {/* Other Project Type */}
                                        {data?.project_type === "Other" && (
                                            <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                                                    <FieldDisplay
                                                        label="Other Project Type"
                                                        value={
                                                            data?.other_project_type_name
                                                        }
                                                        icon={FileTextIcon}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                                                Funding Agency
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                                                <FieldDisplay
                                                    label="Agency Name"
                                                    value={fundingAgencyData?.funding_agency_name}
                                                    icon={BuildingIcon}
                                                />
                                                <FieldDisplay
                                                    label="Agency ID"
                                                    value={fundingAgencyData?.funding_agency_id}
                                                    icon={BuildingIcon}
                                                />
                                                <FieldDisplay
                                                    label="Initials"
                                                    value={fundingAgencyData?.funding_agency_initials}
                                                    icon={FileTextIcon}
                                                />
                                                <FieldDisplay
                                                    label="Agency Type"
                                                    value={fundingAgencyData?.funding_agency_type_1 ?? data?.funding_agency_type}
                                                    icon={UsersIcon}
                                                />
                                                <FieldDisplay
                                                    label="Origin"
                                                    value={fundingAgencyData?.origin_of_funding_agency ?? data?.origin_of_funding_agency}
                                                    icon={GlobeIcon}
                                                />
                                                <FieldDisplay
                                                    label="GSTIN"
                                                    value={fundingAgencyData?.gstin_of_funding_agency}
                                                    icon={CreditCardIcon}
                                                />
                                                <FieldDisplay
                                                    label="Ministry"
                                                    value={fundingAgencyData?.ministry_funding_agency ?? data?.funding_agency_ministry}
                                                    icon={BuildingIcon}
                                                />
                                                <FieldDisplay
                                                    label="Scheme"
                                                    value={data?.funding_agency_schemes}
                                                    icon={FileTextIcon}
                                                />
                                                <FieldDisplay
                                                    label="Address"
                                                    value={[
                                                        fundingAgencyData?.fundingagency_address ?? data?.address_street_village_locality,
                                                        fundingAgencyData?.fundingagency_state ?? data?.address_state,
                                                        fundingAgencyData?.fundingagency_country ?? data?.address_country,
                                                        fundingAgencyData?.fundingagency_postalcode ?? data?.address_postal_code,
                                                    ].filter(Boolean).join(", ")}
                                                    icon={MapPinIcon}
                                                />
                                            </div>
                                        </div>
                                        <HtmlContent
                                            title="Executive Summary"
                                            htmlString={data?.executive_summary}
                                            icon={FileTextIcon}
                                        />
                                        <HtmlContent
                                            title="Project Objective"
                                            htmlString={data?.project_objective}
                                            icon={TargetIcon}
                                        />
                                        <HtmlContent
                                            title="Project Deliverables"
                                            htmlString={
                                                data?.project_deliverables
                                            }
                                            icon={CheckCircleIcon}
                                        />
                                        <TableDisplay
                                            label="Additional PIs"
                                            data={data?.additional_pi_table}
                                            columns={[
                                                {
                                                    fieldname: "pi_name",
                                                    label: "Name",
                                                },
                                                {
                                                    fieldname: "pi_designation",
                                                    label: "Designation",
                                                },
                                                {
                                                    fieldname: "pi_department",
                                                    label: "Department",
                                                    render: (v) => <DepartmentName name={v} />,
                                                },
                                                {
                                                    fieldname: "pi_email",
                                                    label: "Email",
                                                },
                                                {
                                                    fieldname: "pi_address",
                                                    label: "Address",
                                                },
                                                {
                                                    fieldname: "pi_contact",
                                                    label: "Contact",
                                                },
                                            ]}
                                            icon={UsersIcon}
                                        />
                                        <TableDisplay
                                            label="Co-Investigators"
                                            data={data?.co_investigator_table}
                                            columns={[
                                                {
                                                    fieldname: "copi_name",
                                                    label: "Name",
                                                },
                                                {
                                                    fieldname:
                                                        "copi_designation",
                                                    label: "Designation",
                                                },
                                                {
                                                    fieldname: "copi_department",
                                                    label: "Department",
                                                    render: (v) => <DepartmentName name={v} />,
                                                },
                                                {
                                                    fieldname: "copi_email",
                                                    label: "Email",
                                                },
                                                {
                                                    fieldname: "copi_address",
                                                    label: "Address",
                                                },
                                                {
                                                    fieldname: "copi_contact",
                                                    label: "Contact",
                                                },
                                            ]}
                                            icon={UsersIcon}
                                        />
                                    </div>
                                )}
                                {activeTab === "investigators" && (
                                    <div className="space-y-6">
                                        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                                                Principal Investigator (PI)
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                                                <FieldDisplay
                                                    label="Name"
                                                    value={
                                                        data?.principal_investigator_name
                                                    }
                                                    icon={UserIcon}
                                                />
                                                <FieldDisplay
                                                    label="Email"
                                                    value={data?.pi_webmail}
                                                    icon={MailIcon}
                                                />
                                                <FieldDisplay
                                                    label="Employee ID"
                                                    value={data?.pi_employee_id}
                                                    icon={UserIcon}
                                                />
                                                <FieldDisplay
                                                    label="Designation"
                                                    value={data?.designation}
                                                    icon={UsersIcon}
                                                />
                                                <FieldDisplay
                                                    label="Department"
                                                    value={
                                                        data?.applicant_department ? (
                                                            <DepartmentName
                                                                name={
                                                                    data?.applicant_department
                                                                }
                                                            />
                                                        ) : null
                                                    }
                                                    icon={BuildingIcon}
                                                />
                                            </div>
                                        </div>
                                        <TableDisplay
                                            label="Additional PIs"
                                            data={data?.additional_pi_table}
                                            columns={[
                                                {
                                                    fieldname: "pi_name",
                                                    label: "Name",
                                                },
                                                {
                                                    fieldname: "pi_designation",
                                                    label: "Designation",
                                                },
                                                {
                                                    fieldname: "pi_department",
                                                    label: "Department",
                                                    render: (v) => <DepartmentName name={v} />,
                                                },
                                                {
                                                    fieldname: "pi_email",
                                                    label: "Email",
                                                },
                                                {
                                                    fieldname: "pi_address",
                                                    label: "Address",
                                                },
                                                {
                                                    fieldname: "pi_contact",
                                                    label: "Contact",
                                                },
                                            ]}
                                            icon={UsersIcon}
                                        />
                                        <TableDisplay
                                            label="Co-Investigators"
                                            data={data?.co_investigator_table}
                                            columns={[
                                                {
                                                    fieldname: "copi_name",
                                                    label: "Name",
                                                },
                                                {
                                                    fieldname:
                                                        "copi_designation",
                                                    label: "Designation",
                                                },
                                                {
                                                    fieldname: "copi_department",
                                                    label: "Department",
                                                    render: (v) => <DepartmentName name={v} />,
                                                },
                                                {
                                                    fieldname: "copi_email",
                                                    label: "Email",
                                                },
                                                {
                                                    fieldname: "copi_address",
                                                    label: "Address",
                                                },
                                                {
                                                    fieldname: "copi_contact",
                                                    label: "Contact",
                                                },
                                            ]}
                                            icon={UsersIcon}
                                        />
                                    </div>
                                )}
                                {activeTab === "funding" && (
                                    <div className="space-y-6">
                                        <TableDisplay
                                            label="Proposed Budget Breakup"
                                            data={data?.proposed_budget_breakup}
                                            columns={(() => {
                                                // Dynamically determine year columns based on project duration
                                                const durationMonths =
                                                    parseInt(
                                                        data?.project_duration_months,
                                                    ) || 0;
                                                const durationDays =
                                                    parseInt(
                                                        data?.project_duration_days,
                                                    ) || 0;
                                                let totalMonths =
                                                    durationMonths;
                                                if (
                                                    !totalMonths &&
                                                    durationDays > 0
                                                ) {
                                                    totalMonths = Math.ceil(
                                                        durationDays / 30,
                                                    );
                                                }
                                                const yearCount =
                                                    totalMonths <= 12
                                                        ? 1
                                                        : totalMonths <= 24
                                                            ? 2
                                                            : totalMonths <= 36
                                                                ? 3
                                                                : totalMonths <= 48
                                                                    ? 4
                                                                    : 5;

                                                // Also check actual data for non-zero values in higher years
                                                const yearFields = [
                                                    {
                                                        fieldname:
                                                            "first_year_budget",
                                                        label: "Year 1",
                                                    },
                                                    {
                                                        fieldname:
                                                            "second_year_budget",
                                                        label: "Year 2",
                                                    },
                                                    {
                                                        fieldname:
                                                            "third_year_budget",
                                                        label: "Year 3",
                                                    },
                                                    {
                                                        fieldname:
                                                            "fourth_year_budget",
                                                        label: "Year 4",
                                                    },
                                                    {
                                                        fieldname:
                                                            "fifth_year_budget",
                                                        label: "Year 5",
                                                    },
                                                ];

                                                // Use the max of duration-based count and data-based count
                                                let dataBasedCount = 0;
                                                if (
                                                    data?.proposed_budget_breakup
                                                ) {
                                                    data.proposed_budget_breakup.forEach(
                                                        (row: any) => {
                                                            yearFields.forEach(
                                                                (yf, idx) => {
                                                                    if (
                                                                        parseFloat(
                                                                            row[
                                                                            yf
                                                                                .fieldname
                                                                            ],
                                                                        ) > 0
                                                                    ) {
                                                                        dataBasedCount =
                                                                            Math.max(
                                                                                dataBasedCount,
                                                                                idx +
                                                                                1,
                                                                            );
                                                                    }
                                                                },
                                                            );
                                                        },
                                                    );
                                                }

                                                const finalCount = Math.max(
                                                    yearCount,
                                                    dataBasedCount,
                                                    1,
                                                );
                                                return [
                                                    {
                                                        fieldname:
                                                            "account_head",
                                                        label: "Budget Head",
                                                    },
                                                    ...yearFields.slice(
                                                        0,
                                                        finalCount,
                                                    ),
                                                ];
                                            })()}
                                            icon={IndianRupeeIcon}
                                            budgetHeadList={budgetHeadList}
                                        />
                                        {data?.equipment_checkbox === 1 && (
                                            <TableDisplay
                                                label="Proposed Equipment"
                                                data={
                                                    data?.proposed_equipment_details
                                                }
                                                columns={[
                                                    {
                                                        fieldname: "item_name",
                                                        label: "Equipment Name",
                                                    },
                                                    {
                                                        fieldname:
                                                            "equip_total_unit_cost",
                                                        label: "Cost",
                                                    },
                                                ]}
                                                icon={ShoppingCartIcon}
                                            />
                                        )}
                                        {data?.manpower_checkbox === 1 && (
                                            <TableDisplay
                                                label="Proposed Manpower"
                                                data={
                                                    data?.proposed_manpower_details
                                                }
                                                columns={[
                                                    {
                                                        fieldname:
                                                            "designation_name",
                                                        label: "Position",
                                                    },
                                                    {
                                                        fieldname:
                                                            "manpower_salary",
                                                        label: "Salary",
                                                    },
                                                ]}
                                                icon={UsersGroupIcon}
                                            />
                                        )}
                                    </div>
                                )}
                                {activeTab === "clearance" && (
                                    <div className="space-y-6">
                                        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                                                <FieldDisplay
                                                    label="Needs Committee Clearance"
                                                    value={
                                                        data?.needs_committee_clearance
                                                    }
                                                    icon={ShieldIcon}
                                                />
                                                <FieldDisplay
                                                    label="Committee"
                                                    value={data?.committees}
                                                    icon={UsersIcon}
                                                />
                                                <FieldDisplay
                                                    label="Ethics Committee Details"
                                                    value={
                                                        data?.ethics_committee_details
                                                    }
                                                    icon={FileTextIcon}
                                                />
                                                <FieldDisplay
                                                    label="Biosafety Category"
                                                    value={
                                                        data?.biosafety_category
                                                    }
                                                    icon={ShieldIcon}
                                                />
                                                <FieldDisplay
                                                    label="Needs Endorsement"
                                                    value={
                                                        data?.need_endorsement_copy
                                                    }
                                                    icon={CheckCircleIcon}
                                                />
                                            </div>
                                        </div>
                                        {/* Declarations */}
                                        <DeclarationFields doctype="Project Registration" />
                                    </div>
                                )}
                                {activeTab === "activity" && (
                                    <ActivityStream
                                        ref={activityStreamRef}
                                        doctype="Project Registration"
                                        docname={projectName}
                                    />
                                )}
                                {activeTab === "endorsement" && (
                                    <div className="space-y-6">
                                        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                            <div className="flex items-center gap-2 mb-4">
                                                <FileBadge className="h-5 w-5 text-[#D97757]" />
                                                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                                    Endorsement Details
                                                </h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                                                <FieldDisplay
                                                    label="Needs Endorsement"
                                                    value={
                                                        data?.need_endorsement_copy
                                                    }
                                                    icon={CheckCircleIcon}
                                                />
                                                <FieldDisplay
                                                    label="Endorsement Status"
                                                    value={
                                                        data?.endorsement_status ||
                                                        "Pending"
                                                    }
                                                    icon={FileTextIcon}
                                                />
                                                <FieldDisplay
                                                    label="Principal Investigator"
                                                    value={
                                                        data?.principal_investigator_name
                                                    }
                                                    icon={UserIcon}
                                                />
                                                <FieldDisplay
                                                    label="Department"
                                                    value={
                                                        data?.applicant_department ? (
                                                            <DepartmentName
                                                                name={
                                                                    data?.applicant_department
                                                                }
                                                            />
                                                        ) : null
                                                    }
                                                    icon={BuildingIcon}
                                                />
                                                <FieldDisplay
                                                    label="Project Title"
                                                    value={data?.project_title}
                                                    icon={FileTextIcon}
                                                />
                                                <FieldDisplay
                                                    label="Funding Agency"
                                                    value={fundingAgencyData?.funding_agency_name || data?.funding_agen}
                                                    icon={BuildingIcon}
                                                />
                                            </div>
                                            <div className="mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <button
                                                        onClick={async () => {
                                                            setEndorsementHtml(null);
                                                            setEndorsementModalOpen(true);
                                                            try {
                                                                setEndorsementHtml(await fetchNormalizedEndorsementHtml());
                                                            } catch (e: any) {
                                                                console.error("Fetch endorsement error:", e);
                                                            }
                                                        }}
                                                        disabled={isFetchingEndorsementHtml}
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-[#D97757] hover:bg-[#D97757] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <ExternalLinkIcon className="h-4 w-4" />
                                                        {isFetchingEndorsementHtml ? "Loading..." : "View Endorsement"}
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            setIsDownloadingEndorsementCertificate(true);
                                                            try {
                                                                const html = await fetchNormalizedEndorsementHtml();
                                                                if (!html) {
                                                                    alert("No endorsement certificate found for this project.");
                                                                    return;
                                                                }
                                                                await downloadEndorsementPdfFromHtml(
                                                                    html,
                                                                    `Endorsement_${projectName || "Certificate"}.pdf`,
                                                                );
                                                            } catch (error) {
                                                                console.error("Download endorsement certificate error:", error);
                                                                alert("Could not download endorsement certificate. Please open the preview and use Print.");
                                                            } finally {
                                                                setIsDownloadingEndorsementCertificate(false);
                                                            }
                                                        }}
                                                        disabled={
                                                            isFetchingEndorsementHtml ||
                                                            isDownloadingEndorsementCertificate
                                                        }
                                                        className="flex items-center gap-2 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 dark:bg-[#D97757]/20 hover:bg-[#B2EBF2] text-[#D97757] rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <DownloadIcon className="h-4 w-4" />
                                                        {isDownloadingEndorsementCertificate ? "Downloading..." : "Download Certificate"}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeTab === "files" && (
                                    <div className="space-y-6">
                                        <div className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                            <div className="flex items-center gap-2 mb-4">
                                                <FolderOpenIcon className="h-5 w-5 text-[#D97757]" />
                                                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                                                    Project Files
                                                </h3>
                                                {frappeFiles && (
                                                    <span className="ml-auto text-xs text-zinc-400 dark:text-zinc-500">
                                                        {frappeFiles.length} file{frappeFiles.length !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </div>
                                            {frappeFiles && frappeFiles.length > 0 ? (
                                                <div className="space-y-3">
                                                    {frappeFiles.map((file: { file_name: string; file_url?: string; file_size?: number; attached_to_field?: string; creation?: string }) => {
                                                        const fname = file.file_name;
                                                        const url = `${attachmentsPath}/${fname}`;
                                                        return (
                                                            <div
                                                                key={fname}
                                                                className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <FileTextIcon className="h-5 w-5 text-zinc-500 dark:text-zinc-400 flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                                                            {fname}
                                                                        </p>
                                                                        {file.attached_to_field && (
                                                                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{file.attached_to_field}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <a
                                                                    href={url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#D97757] bg-zinc-50 dark:bg-zinc-800 dark:bg-[#D97757]/20 rounded-lg hover:bg-[#B2EBF2] transition-colors flex-shrink-0"
                                                                >
                                                                    <DownloadIcon className="h-4 w-4" />
                                                                    Download
                                                                </a>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ) : (
                                                <div className="text-center py-12 text-zinc-500 dark:text-zinc-400 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl">
                                                    <FolderOpenIcon className="h-12 w-12 text-zinc-300 dark:text-zinc-600 mx-auto mb-4" />
                                                    <p className="font-medium text-zinc-600 dark:text-zinc-400">
                                                        No files attached yet.
                                                    </p>
                                                    <p className="text-sm mt-1">
                                                        Files related to this project will appear here.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {activeTab === "quick-actions" && (
                                    <QuickActions />
                                )}
                            </div>

                            {/* Right Column for Staff RnD */}
                            {(needsProjectNumberGeneration || isRnDStaff) && (
                                <div className="lg:col-span-1">
                                    <div className="sticky top-6 space-y-4">
                                        {needsProjectNumberGeneration && (
                                            <ProjectNumberGenerationForm
                                                projectData={data}
                                                onSuccess={() => mutate()}
                                            />
                                        )}
                                        {isRnDStaff && (
                                            <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-4">
                                                <h3 className="text-sm font-bold uppercase text-zinc-900 dark:text-zinc-100 tracking-wide">
                                                    Account Details
                                                </h3>
                                                <div className="space-y-3">
                                                    <div className="space-y-1">
                                                        <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                                                            Account Type
                                                        </label>
                                                        <select
                                                            className="w-full h-8 px-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                                                            value={pfmsForm.is_the_account_type_pfms}
                                                            onChange={e => setPfmsForm(p => ({ ...p, is_the_account_type_pfms: e.target.value }))}
                                                        >
                                                            <option value="">Select...</option>
                                                            <option value="Yes">PFMS</option>
                                                            <option value="No">Bank Account</option>
                                                        </select>
                                                    </div>
                                                    {pfmsForm.is_the_account_type_pfms === "Yes" && (
                                                        <>
                                                            <div className="space-y-1">
                                                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Scheme Name</label>
                                                                <input
                                                                    type="text"
                                                                    className="w-full h-8 px-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                                                                    value={pfmsForm.scheme_name}
                                                                    onChange={e => setPfmsForm(p => ({ ...p, scheme_name: e.target.value }))}
                                                                    placeholder="Enter scheme name"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Scheme Number</label>
                                                                <input
                                                                    type="text"
                                                                    className="w-full h-8 px-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                                                                    value={pfmsForm.enter_scheme_number}
                                                                    onChange={e => setPfmsForm(p => ({ ...p, enter_scheme_number: e.target.value }))}
                                                                    placeholder="Enter scheme number"
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                    {pfmsForm.is_the_account_type_pfms === "No" && (
                                                        <>
                                                            <div className="space-y-1">
                                                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Account Number</label>
                                                                <input
                                                                    type="text"
                                                                    className="w-full h-8 px-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                                                                    value={pfmsForm.account_number}
                                                                    onChange={e => setPfmsForm(p => ({ ...p, account_number: e.target.value }))}
                                                                    placeholder="Enter account number"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Bank Name</label>
                                                                <input
                                                                    type="text"
                                                                    className="w-full h-8 px-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757]"
                                                                    value={pfmsForm.bank_name}
                                                                    onChange={e => setPfmsForm(p => ({ ...p, bank_name: e.target.value }))}
                                                                    placeholder="Enter bank name"
                                                                />
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={handleSavePfms}
                                                    disabled={isSavingPfms}
                                                    className="w-full py-2 text-xs font-semibold bg-[#D97757] hover:bg-[#c96a46] text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isSavingPfms ? "Saving..." : "Save Account Details"}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                </div>
            </>
        );
    };

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            {/*<AppSidebar />*/}
            <main className="flex-1 w-full overflow-hidden">
                {renderContent()}
            </main>
        </div>
    );
};

export default ProjectDetailsView;
