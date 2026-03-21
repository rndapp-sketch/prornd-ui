import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Printer, Download, X } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const P11PrintModal = ({
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
        if (!isOpen || !htmlContent) return '';
        return URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' }));
    }, [isOpen, htmlContent]);

    useEffect(() => {
        return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
    }, [blobUrl]);

    const handlePrint = () => {
        iframeRef.current?.contentWindow?.print();
    };

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed;left:-99999px;top:0;width:794px;height:1123px;border:0;visibility:hidden;';
            document.body.appendChild(iframe);
            const iDoc = iframe.contentDocument!;
            iDoc.open(); iDoc.write(htmlContent); iDoc.close();
            await new Promise(r => setTimeout(r, 1200));
            try { await (iDoc as any).fonts?.ready; } catch {}

            const page = iDoc.querySelector('.page') as HTMLElement || iDoc.body;
            const canvas = await html2canvas(page, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                windowWidth: 794,
            });
            document.body.removeChild(iframe);

            const margin = 15; // mm
            const pdf = new jsPDF('p', 'mm', 'a4');
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
                const sliceCanvas = document.createElement('canvas');
                sliceCanvas.width = canvas.width;
                sliceCanvas.height = sliceH;
                const ctx = sliceCanvas.getContext('2d')!;
                ctx.drawImage(canvas, 0, i * contentHpx, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
                pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', margin, margin, contentW, sliceH / pxPerMm);
            }
            pdf.save(`P11-${docName || 'form'}.pdf`);
        } catch (err) {
            console.error('PDF generation failed:', err);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/70 flex flex-col z-[99999]">
            <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">P-11 Form Preview — {docName}</h3>
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
                        {isGeneratingPdf ? 'Generating…' : 'Download PDF'}
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
                    title="P-11 Print Preview"
                />
            </div>
        </div>,
        document.body,
    );
};
