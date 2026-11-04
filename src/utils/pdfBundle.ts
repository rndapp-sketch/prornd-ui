import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getFileUrl } from "@/utils/fileUtils";

export interface BundleAttachment {
    label: string;
    url: string;
}

export interface BundleResult {
    blob: Blob;
    included: BundleAttachment[];
    skipped: { attachment: BundleAttachment; reason: string }[];
}

const A4 = { w: 595.28, h: 841.89 }; // points

/** Render a print-format HTML string (with a `.page` root) to PDF bytes. */
async function htmlToPdfBytes(html: string): Promise<ArrayBuffer> {
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:-99999px;top:0;width:794px;height:1123px;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    try {
        const iDoc = iframe.contentDocument!;
        iDoc.open(); iDoc.write(html); iDoc.close();
        await new Promise((r) => setTimeout(r, 800));
        try { await (iDoc as any).fonts?.ready; } catch { /* ignore */ }

        const page = (iDoc.querySelector(".page") as HTMLElement) || iDoc.body;
        // Screen-only chrome of the template (shadow, grey margin) shouldn't land on paper
        page.style.margin = "0";
        page.style.boxShadow = "none";
        const canvas = await html2canvas(page, { scale: 2, useCORS: true, allowTaint: true, logging: false, windowWidth: 794 });

        const pdf = new jsPDF("p", "pt", "a4");
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const pxPerPt = canvas.width / pageW;
        const pageHpx = Math.floor(pageH * pxPerPt);
        const totalPages = Math.max(1, Math.ceil(canvas.height / pageHpx));

        for (let i = 0; i < totalPages; i++) {
            if (i > 0) pdf.addPage();
            const sliceH = Math.min(pageHpx, canvas.height - i * pageHpx);
            const slice = document.createElement("canvas");
            slice.width = canvas.width;
            slice.height = sliceH;
            slice.getContext("2d")!.drawImage(canvas, 0, i * pageHpx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
            pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pageW, sliceH / pxPerPt);
        }
        return pdf.output("arraybuffer");
    } finally {
        document.body.removeChild(iframe);
    }
}

const sniff = (bytes: Uint8Array): "pdf" | "png" | "jpg" | null => {
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) return "pdf";
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return "jpg";
    return null;
};

/**
 * One printable PDF: the form page(s) followed by every attachment. PDFs are
 * appended page by page, images get an A4 page each; anything that cannot be
 * fetched or isn't a PDF/PNG/JPEG is listed on a closing page instead.
 */
export async function buildPrintBundle(formHtml: string, attachments: BundleAttachment[]): Promise<BundleResult> {
    const out = await PDFDocument.load(await htmlToPdfBytes(formHtml));
    const included: BundleAttachment[] = [];
    const skipped: BundleResult["skipped"] = [];

    for (const att of attachments) {
        try {
            const res = await fetch(getFileUrl(att.url), { credentials: "include" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const bytes = new Uint8Array(await res.arrayBuffer());
            const kind = sniff(bytes);

            if (kind === "pdf") {
                const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
                const pages = await out.copyPages(src, src.getPageIndices());
                pages.forEach((p) => out.addPage(p));
            } else if (kind === "png" || kind === "jpg") {
                const img = kind === "png" ? await out.embedPng(bytes) : await out.embedJpg(bytes);
                const margin = 28;
                const scale = Math.min((A4.w - margin * 2) / img.width, (A4.h - margin * 2) / img.height, 1);
                const w = img.width * scale;
                const h = img.height * scale;
                out.addPage([A4.w, A4.h]).drawImage(img, { x: (A4.w - w) / 2, y: (A4.h - h) / 2, width: w, height: h });
            } else {
                throw new Error("Unsupported file type (only PDF, PNG and JPEG can be printed)");
            }
            included.push(att);
        } catch (err: any) {
            skipped.push({ attachment: att, reason: err?.message || String(err) });
        }
    }

    if (skipped.length) {
        const font = await out.embedFont(StandardFonts.Helvetica);
        const bold = await out.embedFont(StandardFonts.HelveticaBold);
        const page = out.addPage([A4.w, A4.h]);
        // Helvetica is WinAnsi-only — drop characters it can't encode
        const safe = (s: string) => s.replace(/[^\x20-\x7E]/g, "?");
        let y = A4.h - 60;
        page.drawText("Attachments not included in this print", { x: 50, y, size: 14, font: bold });
        y -= 28;
        for (const { attachment, reason } of skipped) {
            const name = decodeURIComponent(attachment.url.split("/").pop() || attachment.url);
            page.drawText(safe(`${attachment.label}: ${name}`), { x: 50, y, size: 10, font: bold, maxWidth: A4.w - 100 });
            y -= 14;
            page.drawText(safe(reason), { x: 62, y, size: 9, font, color: rgb(0.4, 0.4, 0.4), maxWidth: A4.w - 112 });
            y -= 22;
        }
    }

    const bytes = await out.save();
    return { blob: new Blob([bytes as BlobPart], { type: "application/pdf" }), included, skipped };
}
