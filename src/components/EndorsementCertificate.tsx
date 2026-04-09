

// -=-=-=-=-=

import React, { useRef, useEffect } from 'react';
import {
    Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered, Undo, Redo, FileCode
} from 'lucide-react';
import { useFrappeAuth } from "frappe-react-sdk";


interface EndorsementCertificateProps {
    proposalId?: string;
    /** Stable ID used as the IndexedDB storage key (use a temp ID for new projects). */
    sessionId?: string;
    piName?: string;
    piDesignation?: string;
    piDepartment?: string;
    piDepartmentName?: string;
    coPiName?: string;
    coPiDesignation?: string;
    coPiDepartment?: string;
    coPiDepartmentName?: string;
    projectTitle?: string;
    fundingAgency?: string;
    duration?: string;
    totalCost?: string;
    onHtmlChange?: (html: string) => void;
}

// Print styles for A4 pagination with footer margin
const printStyles = `
@media print {
    @page {
        size: A4;
        margin: 20mm 15mm 25mm 15mm;
    }

    body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
    }

    .no-print {
        display: none !important;
    }

    .print-container {
        width: 100% !important;
        min-height: auto !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
    }

    .page-break-before {
        page-break-before: always;
    }

    .page-break-after {
        page-break-after: always;
    }

    .avoid-break {
        page-break-inside: avoid;
    }
}

[contenteditable][data-placeholder]:empty:before {
    content: attr(data-placeholder);
    color: #a1a1aa;
    pointer-events: none;
    font-style: italic;
}
`;

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
const IDB_NAME = 'prornd_endorsements';
const IDB_STORE = 'drafts';

function openIDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbGet(key: string): Promise<string | undefined> {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function idbPut(key: string, value: string): Promise<void> {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
        const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    });
}

/** Read the saved endorsement body for a given session + user. */
export function getEndorsementDraft(sessionId: string, currentUser: string): Promise<string | undefined> {
    return idbGet(`endorsement__${sessionId}__${currentUser || 'guest'}`);
}

// Toolbar
const Toolbar = ({ onDownload }: { onDownload: () => void }) => {
    const handleFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };

    return (
        <div className="sticky top-8 self-start flex flex-col gap-3 p-3 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded-xl shadow-lg no-print z-10 h-fit">
            {/* Download HTML Button */}
            <div className="flex flex-col gap-1 pb-3 border-b border-zinc-300 dark:border-zinc-700">
                <button
                    onClick={onDownload}
                    className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors flex items-center justify-center"
                    title="Download HTML"
                >
                    <FileCode className="w-5 h-5" />
                </button>
            </div>

            {/* Text Formatting */}
            <div className="flex flex-col gap-1 pb-3 border-b border-zinc-300 dark:border-zinc-700">
                <button onClick={() => handleFormat('bold')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Bold">
                    <Bold className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('italic')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Italic">
                    <Italic className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('underline')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Underline">
                    <Underline className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('strikeThrough')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Strikethrough">
                    <Strikethrough className="w-5 h-5" />
                </button>
            </div>

            {/* Alignment */}
            <div className="flex flex-col gap-1 pb-3 border-b border-zinc-300 dark:border-zinc-700">
                <button onClick={() => handleFormat('justifyLeft')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Align Left">
                    <AlignLeft className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('justifyCenter')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Align Center">
                    <AlignCenter className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('justifyRight')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Align Right">
                    <AlignRight className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('justifyFull')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Justify">
                    <AlignJustify className="w-5 h-5" />
                </button>
            </div>

            {/* Lists */}
            <div className="flex flex-col gap-1 pb-3 border-b border-zinc-300 dark:border-zinc-700">
                <button onClick={() => handleFormat('insertUnorderedList')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Bullet List">
                    <List className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('insertOrderedList')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Numbered List">
                    <ListOrdered className="w-5 h-5" />
                </button>
            </div>

            {/* History */}
            <div className="flex flex-col gap-1">
                <button onClick={() => handleFormat('undo')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Undo">
                    <Undo className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('redo')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Redo">
                    <Redo className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

/**
 * Generates a complete HTML string for the Endorsement Certificate with raw inline CSS.
 * This is used to send to the backend for PDF generation.
 * If bodyHtml is provided, it replaces the default cert-body content (for edited endorsements).
 */
export const getEndorsementHtml = (props: EndorsementCertificateProps & { bodyHtml?: string }): string => {
    const currentDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Endorsement Certificate - ${props.proposalId || 'IITG'}</title>
    <style>
        @page {
            size: A4;
            margin: 20mm 15mm 25mm 15mm;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Times New Roman', serif;
            font-size: 14px;
            line-height: 1.6;
            color: #000;
            background: #f3f4f6;
            padding: 40px;
            display: flex;
            justify-content: center;
        }
        .print-container {
            width: 210mm;
            min-height: 297mm;
            background: white;
            padding: 20mm;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            position: relative;
        }
        .header-table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        .header-table td { vertical-align: top; }
        .logo { width: 90px; height: auto; }
        .office-logo { height: 150px; width: auto; }
        .institute-name { font-weight: bold; font-size: 18px; }
        .contact-info { text-align: right; white-space: nowrap; }
        .contact-info span { font-weight: 600; }
        .qr-code { margin-top: 12px; }
        .dean-info { margin-bottom: 32px; }
        .dean-info .name { font-weight: bold; }
        .ref-no { margin-top: 12px; font-weight: 600; }
        .ref-no .label { color: #4b5563; }
        .ref-no .value { font-weight: bold; }
        .date { font-size: 14px; color: #4b5563; }
        .title {
            text-align: center;
            font-weight: bold;
            text-decoration: underline;
            font-size: 18px;
            margin-bottom: 24px;
            text-transform: uppercase;
        }
        .cert-body { padding: 8px; }
        .cert-body p { margin-bottom: 16px; }
        .cert-body ol { padding-left: 32px; margin: 0; }
        .cert-body li { margin-bottom: 16px; text-align: justify; }
        .signature { margin-top: 96px; display: flex; flex-direction: column; align-items: flex-end; }
        .signature .label { font-weight: bold; }
        .signature img { height: 64px; width: auto; margin-top: 16px; }
        @media print {
            body { background: white; padding: 0; }
            .print-container { box-shadow: none; width: 100%; min-height: auto; padding: 0; margin: 0; }
        }
    </style>
</head>
<body>
    <div class="print-container">
        <table class="header-table">
            <tr>
                <td style="width:100px;">
                    <img src="http://172.16.131.206:8000/files/IITG_logo.png" alt="IITG Logo" class="logo"/>
                </td>
                <td style="padding-left:16px;">
                    <div class="institute-name">Indian Institute of Technology Guwahati,</div>
                    <div style="margin-top:4px;">Guwahati 781039, Assam, India.</div>
                </td>
                <td class="contact-info" style="padding-left:16px;">
                    <div><span>Phone Nos:</span> +91-361- 258 2082</div>
                    <div><span>Mob.no:</span> +91-99548 25080</div>
                    <div><span>E-mail:</span> <a href="mailto:dornd@iitg.ernet.in" style="color:#000;">dornd@iitg.ernet.in</a></div>

                </td>
                <td style="padding-left:16px;">
                    <img src="http://172.16.131.206:8000/files/yellow_office_name.png" alt="Office of R&D" class="office-logo"/>
                </td>
            </tr>
        </table>

        <div class="dean-info">
            <div class="name">Prof. Rohit Sinha</div>
            <div>Dean (Research and Development),</div>
            <div>Professor of Electronics and Electrical Engineering</div>
            <div class="ref-no">
                <span class="label">Ref. No.:</span> <span class="value">${props.proposalId || "IITG/RND/____"}</span>
            </div>
            <div class="date">Date: ${currentDate}</div>
        </div>

        <h3 class="title">Endorsement Certificate from the Host Institute</h3>

        <div class="cert-body">
            ${props.bodyHtml || ""}
        </div>

        <div class="signature">
            <div class="label">Signature of the Dean (R&D)</div>
            <img src="http://172.16.117.39:8000/files/rohit_fake_sign.png" alt="Signature"/>
        </div>
    </div>
</body>
</html>`;
};
{/* <img src="http://172.16.131.206:8000/files/rohit_fake_sign.png" alt="Signature"/> */ }

export const EndorsementCertificate: React.FC<EndorsementCertificateProps> = (props) => {
    const bodyRef = useRef<HTMLDivElement>(null);
    const documentRef = useRef<HTMLDivElement>(null);
    const hasInitialized = useRef(false);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Always-current mirror of the editor HTML — safe to read during unmount cleanup
    const latestHtml = useRef<string>('');
    // Always-current storage key — avoids stale closures in unmount/save effects
    const storageKeyRef = useRef<string>('');

    const { currentUser } = useFrappeAuth();

    // Keep the key ref up to date every render
    storageKeyRef.current = currentUser
        ? `endorsement__${props.sessionId || props.proposalId || 'new'}__${currentUser}`
        : '';

    // Restore from IndexedDB once currentUser is available and DOM is ready
    useEffect(() => {
        if (!currentUser || hasInitialized.current || !bodyRef.current) return;
        hasInitialized.current = true;

        idbGet(storageKeyRef.current).then((saved) => {
            if (!bodyRef.current) return;
            if (saved) {
                bodyRef.current.innerHTML = saved;
                latestHtml.current = saved;
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser]);

    // On unmount (modal close): flush to IndexedDB immediately using the ref — no stale closure.
    useEffect(() => {
        return () => {
            if (saveTimer.current) clearTimeout(saveTimer.current);
            if (latestHtml.current && storageKeyRef.current) {
                idbPut(storageKeyRef.current, latestHtml.current);
            }
        };
    }, []); // empty deps — reads from refs which are always current

    const handleContentChange = () => {
        if (!bodyRef.current) return;
        const html = bodyRef.current.innerHTML;
        latestHtml.current = html;

        if (!storageKeyRef.current) return;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            idbPut(storageKeyRef.current, html);
        }, 500);
    };

    const getFullHtml = () => {
        if (!documentRef.current) return '';
        let content = documentRef.current.innerHTML;
        content = content.replace(/contenteditable="true"/gi, '');
        content = content.replace(/outline-none focus:bg-zinc-50 dark:bg-zinc-800\/50/gi, '');

        // Just build the wrapper around the actual content
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Endorsement Certificate - ${props.proposalId || 'IITG'}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        /* Embed print styles */
        ${printStyles}

        body {
            font-family: 'Times New Roman', serif;
            background-color: #f3f4f6;
            padding: 40px;
            display: flex;
            justify-content: center;
        }
        .print-container {
            background-color: white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
    </style>
</head>
<body>
    <div class="print-container w-[210mm] min-h-[297mm] bg-white dark:bg-zinc-900 p-[20mm] text-zinc-900 dark:text-zinc-100 font-serif text-sm leading-relaxed relative">
        ${content}
    </div>
    <script>
        // Auto-print on open (optional)
        // window.onload = function() { window.print(); }
    </script>
</body>
</html>`;
    };

    const handleDownloadHtml = () => {
        const fullHtml = getFullHtml();
        if (!fullHtml) return;

        const blob = new Blob([fullHtml], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Endorsement_${props.proposalId || 'certificate'}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="bg-claude-bg min-h-screen">

            <main className="p-4 md:p-8 w-full">
                {/* Inject print styles */}
                <style>{printStyles}</style>

                {/* Flex container for toolbar and A4 paper - scrollable */}
                <div className="flex justify-center items-start gap-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
                    {/* Floating Toolbar - sticky within the scroll container */}
                    <div className="sticky top-4">
                        <Toolbar onDownload={handleDownloadHtml} />
                    </div>

                    {/* Certificate Container */}
                    <div
                        ref={documentRef}
                        className="print-container w-[210mm] min-h-[297mm] bg-white dark:bg-zinc-900 p-[20mm] shadow-lg text-zinc-900 dark:text-zinc-100 font-serif text-sm leading-relaxed relative"
                    >

                        {/* Header Section - IMAGES RESTORED */}
                        <table className="w-full border-collapse mb-8 avoid-break">
                            <tbody>
                                <tr>
                                    <td className="w-[100px] align-top">
                                        <img
                                            src="http://172.16.131.206:8000/files/IITG_logo.png"
                                            alt="IITG Logo"
                                            className="w-[90px] h-auto"
                                        />
                                    </td>
                                    <td className="align-top pl-4">
                                        <div className="font-bold text-lg">Indian Institute of Technology Guwahati,</div>
                                        <div className="mt-1">Guwahati 781039, Assam, India.</div>
                                    </td>
                                    <td className="align-top pl-4 text-right whitespace-nowrap">
                                        <div><span className="font-semibold">Phone Nos:</span> +91-361- 258 2082</div>
                                        <div><span className="font-semibold">Mob.no:</span> +91-99548 25080</div>
                                        <div>
                                            <span className="font-semibold">E-mail:</span>{" "}
                                            <a href="mailto:dornd@iitg.ernet.in" className="text-zinc-900 dark:text-zinc-100 hover:underline">
                                                dornd@iitg.ac.in
                                            </a>
                                        </div>

                                    </td>
                                    {/* <td className="align-top pl-4">
                                        <img
                                            src="http://172.16.131.206:8000/files/yellow_office_name.png"
                                            alt="Office of R&D"
                                            className="h-[150px] w-auto"
                                        />
                                    </td> */}
                                </tr>
                            </tbody>
                        </table>

                        {/* Dean Info */}
                        <div className="mb-8 avoid-break">
                            <div className="font-bold">Prof. Rohit Sinha</div>
                            <div>Dean (Research and Development),</div>
                            <div>Professor of Electronics and Electrical Engineering</div>
                            {/* Reference Number */}
                            <div className="mt-3 font-semibold">
                                <span className="text-zinc-600 dark:text-zinc-400">Ref. No.:</span>{" "}
                                <span className="font-bold">{props.proposalId || "IITG/RND/____"}</span>
                            </div>
                            <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                            </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-center font-bold underline text-lg mb-6 uppercase avoid-break">
                            Endorsement Certificate from the Host Institute
                        </h3>

                        {/* Body Content - Editable */}
                        <div
                            ref={bodyRef}
                            contentEditable
                            data-placeholder="Click here to type the certificate body..."
                            className="outline-none focus:bg-zinc-50 dark:bg-zinc-800/50 p-2 -ml-2 rounded transition-colors [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                            suppressContentEditableWarning
                            onInput={handleContentChange}
                            onBlur={handleContentChange}
                            onKeyDown={(e) => {
                                if (e.key === 'Tab') {
                                    e.preventDefault();
                                    document.execCommand('insertText', false, '\u00a0\u00a0\u00a0\u00a0');
                                }
                            }}
                        />

                        {/* Signatures */}
                        <div className="mt-24 flex flex-col items-end avoid-break">
                            <div className="font-bold">Signature of the Dean (R&D)</div>
                            {/* <div className="mt-4">
                                <img
                                    src="http://172.16.131.206:8000/files/rohit_fake_sign.png"
                                    alt="Signature"
                                    className="h-16 w-auto"
                                />
                            </div> */}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
