// import React, { useRef, useMemo } from 'react';
// import {
//     Bold, Italic, Underline, Strikethrough,
//     AlignLeft, AlignCenter, AlignRight, AlignJustify,
//     List, ListOrdered, Undo, Redo
// } from 'lucide-react';
// import { AppSidebar } from './RndSidebar';

// // Simple QR-style Square Barcode Generator Component
// const QRCode = ({ value, size = 60 }: { value: string; size?: number }) => {
//     const grid = useMemo(() => {
//         if (!value) return null;

//         const gridSize = 11; // 11x11 grid
//         const cells: boolean[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));

//         // Add finder patterns (3 corners)
//         const addFinderPattern = (startX: number, startY: number) => {
//             for (let y = 0; y < 3; y++) {
//                 for (let x = 0; x < 3; x++) {
//                     if (y === 1 && x === 1) cells[startY + y][startX + x] = true;
//                     else if (y === 0 || y === 2 || x === 0 || x === 2) cells[startY + y][startX + x] = true;
//                 }
//             }
//         };

//         addFinderPattern(0, 0);      // Top-left
//         addFinderPattern(gridSize - 3, 0);  // Top-right
//         addFinderPattern(0, gridSize - 3);  // Bottom-left

//         // Encode data in the remaining cells using character codes
//         let dataIndex = 0;
//         const dataChars = value.split('');

//         for (let y = 3; y < gridSize; y++) {
//             for (let x = 3; x < gridSize; x++) {
//                 if (dataIndex < dataChars.length) {
//                     const charCode = dataChars[dataIndex].charCodeAt(0);
//                     const bitPos = (y * gridSize + x) % 8;
//                     cells[y][x] = ((charCode >> bitPos) & 1) === 1;
//                 } else {
//                     // Checksum pattern for remaining cells
//                     cells[y][x] = ((x + y) % 3 === 0);
//                 }
//                 dataIndex = (dataIndex + 1) % dataChars.length;
//             }
//         }

//         return cells;
//     }, [value]);

//     if (!grid) return null;

//     const cellSize = size / grid.length;

//     return (
//         <div className="inline-block">
//             <svg
//                 width={size}
//                 height={size}
//                 className="inline-block border border-zinc-300 dark:border-zinc-700"
//                 viewBox={`0 0 ${size} ${size}`}
//             >
//                 {grid.map((row, y) =>
//                     row.map((cell, x) =>
//                         cell && (
//                             <rect
//                                 key={`${x}-${y}`}
//                                 x={x * cellSize}
//                                 y={y * cellSize}
//                                 width={cellSize}
//                                 height={cellSize}
//                                 fill="black"
//                             />
//                         )
//                     )
//                 )}
//             </svg>
//         </div>
//     );
// };

// // ... interface definition ...
// interface EndorsementCertificateProps {
//     proposalId?: string;
//     piName?: string;
//     piDesignation?: string;
//     piDepartment?: string;
//     coPiName?: string;
//     coPiDesignation?: string;
//     coPiDepartment?: string;
//     projectTitle?: string;
//     fundingAgency?: string;
//     duration?: string;
//     totalCost?: string;
// }

// // Print styles for A4 pagination with footer margin
// const printStyles = `
// @media print {
//     @page {
//         size: A4;
//         margin: 20mm 15mm 25mm 15mm; /* top right bottom left - 25mm footer margin */
//     }

//     body {
//         -webkit-print-color-adjust: exact !important;
//         print-color-adjust: exact !important;
//     }

//     .no-print {
//         display: none !important;
//     }

//     .print-container {
//         width: 100% !important;
//         min-height: auto !important;
//         padding: 0 !important;
//         margin: 0 !important;
//         box-shadow: none !important;
//     }

//     .page-break-before {
//         page-break-before: always;
//     }

//     .page-break-after {
//         page-break-after: always;
//     }

//     .avoid-break {
//         page-break-inside: avoid;
//     }
// }
// `;

// const Toolbar = () => {
//     const handleFormat = (command: string, value?: string) => {
//         document.execCommand(command, false, value);
//     };

//     return (
//         <div className="sticky top-8 self-start flex flex-col gap-3 p-3 bg-white dark:bg-zinc-900 border-2 border-zinc-300 dark:border-zinc-700 rounded-xl shadow-lg no-print z-10 h-fit">
//             {/* Text Formatting */}
//             <div className="flex flex-col gap-1 pb-3 border-b border-zinc-300 dark:border-zinc-700">
//                 <button onClick={() => handleFormat('bold')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Bold">
//                     <Bold className="w-5 h-5" />
//                 </button>
//                 <button onClick={() => handleFormat('italic')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Italic">
//                     <Italic className="w-5 h-5" />
//                 </button>
//                 <button onClick={() => handleFormat('underline')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Underline">
//                     <Underline className="w-5 h-5" />
//                 </button>
//                 <button onClick={() => handleFormat('strikeThrough')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Strikethrough">
//                     <Strikethrough className="w-5 h-5" />
//                 </button>
//             </div>

//             {/* Alignment */}
//             <div className="flex flex-col gap-1 pb-3 border-b border-zinc-300 dark:border-zinc-700">
//                 <button onClick={() => handleFormat('justifyLeft')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Align Left">
//                     <AlignLeft className="w-5 h-5" />
//                 </button>
//                 <button onClick={() => handleFormat('justifyCenter')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Align Center">
//                     <AlignCenter className="w-5 h-5" />
//                 </button>
//                 <button onClick={() => handleFormat('justifyRight')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Align Right">
//                     <AlignRight className="w-5 h-5" />
//                 </button>
//                 <button onClick={() => handleFormat('justifyFull')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Justify">
//                     <AlignJustify className="w-5 h-5" />
//                 </button>
//             </div>

//             {/* Lists */}
//             <div className="flex flex-col gap-1 pb-3 border-b border-zinc-300 dark:border-zinc-700">
//                 <button onClick={() => handleFormat('insertUnorderedList')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Bullet List">
//                     <List className="w-5 h-5" />
//                 </button>
//                 <button onClick={() => handleFormat('insertOrderedList')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Numbered List">
//                     <ListOrdered className="w-5 h-5" />
//                 </button>
//             </div>

//             {/* History */}
//             <div className="flex flex-col gap-1">
//                 <button onClick={() => handleFormat('undo')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Undo">
//                     <Undo className="w-5 h-5" />
//                 </button>
//                 <button onClick={() => handleFormat('redo')} className="p-2 hover:bg-zinc-100 dark:bg-zinc-800 rounded-lg transition-colors" title="Redo">
//                     <Redo className="w-5 h-5" />
//                 </button>
//             </div>
//         </div>
//     );
// };

// export const EndorsementCertificate: React.FC<EndorsementCertificateProps> = (props) => {
//     const bodyRef = useRef<HTMLDivElement>(null);

//     return (
//         <div className="bg-claude-bg min-h-screen">
//             <AppSidebar />
//             <main className="p-4 md:p-8 w-full">
//                 {/* Inject print styles */}
//                 <style>{printStyles}</style>

//                 {/* Flex container for toolbar and A4 paper - scrollable */}
//                 <div className="flex justify-center items-start gap-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
//                     {/* Floating Toolbar - sticky within the scroll container */}
//                     <div className="sticky top-4">
//                         <Toolbar />
//                     </div>

//                     <div className="print-container w-[210mm] min-h-[297mm] bg-white dark:bg-zinc-900 p-[20mm] shadow-lg text-zinc-900 dark:text-zinc-100 font-serif text-sm leading-relaxed relative">

//                         {/* Header Section */}
//                         <table className="w-full border-collapse mb-8 avoid-break">
//                             <tbody>
//                                 <tr>
//                                     <td className="w-[100px] align-top">
//                                         <img
//                                             src="http://172.16.135.27:8000/files/IITG_logo.png"
//                                             alt="IITG Logo"
//                                             className="w-[90px] h-auto"
//                                         />
//                                     </td>
//                                     <td className="align-top pl-4">
//                                         <div className="font-bold text-lg">Indian Institute of Technology Guwahati,</div>
//                                         {/* <div className="font-bold text-lg"></div> */}
//                                         <div className="mt-1">Guwahati 781039, Assam, India.</div>
//                                     </td>
//                                     <td className="align-top pl-4 text-right whitespace-nowrap">
//                                         <div><span className="font-semibold">Phone Nos:</span> +91-361- 258 2082</div>
//                                         <div><span className="font-semibold">Mob.no:</span> +91-99548 25080</div>
//                                         <div>
//                                             <span className="font-semibold">E-mail:</span>{" "}
//                                             <a href="mailto:dornd@iitg.ernet.in" className="text-zinc-900 dark:text-zinc-100 hover:underline">
//                                                 dornd@iitg.ernet.in
//                                             </a>
//                                         </div>
//                                         {/* QR Code */}
//                                         <div className="mt-3">
//                                             <QRCode value={props.proposalId || "IITG-RND"} size={55} />
//                                         </div>
//                                     </td>
//                                     <td className="align-top pl-4">
//                                         <img
//                                             src="http://172.16.135.27:8000/files/yellow_office_name.png"
//                                             alt="Office of R&D"
//                                             className="h-[150px] w-auto"
//                                         />
//                                     </td>
//                                 </tr>
//                             </tbody>
//                         </table>

//                         {/* Dean Info */}
//                         <div className="mb-8 avoid-break">
//                             <div className="font-bold">Prof. Rohit Sinha</div>
//                             <div>Dean (Research and Development),</div>
//                             <div>Professor of Electronics and Electrical Engineering</div>
//                             {/* Reference Number */}
//                             <div className="mt-3 font-semibold">
//                                 <span className="text-zinc-600 dark:text-zinc-400">Ref. No.:</span>{" "}
//                                 <span className="font-bold">{props.proposalId || "IITG/RND/____"}</span>
//                             </div>
//                             <div className="text-sm text-zinc-600 dark:text-zinc-400">
//                                 Date: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
//                             </div>
//                         </div>

//                         {/* Title */}
//                         <h3 className="text-center font-bold underline text-lg mb-6 uppercase avoid-break">
//                             Endorsement Certificate from the Host Institute
//                         </h3>

//                         {/* Body Content - Editable */}
//                         <div
//                             ref={bodyRef}
//                             contentEditable
//                             className="outline-none focus:bg-zinc-50 dark:bg-zinc-800/50 p-2 -ml-2 rounded transition-colors [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
//                             suppressContentEditableWarning
//                             onKeyDown={(e) => {
//                                 if (e.key === 'Tab') {
//                                     e.preventDefault();
//                                     document.execCommand('insertText', false, '\u00a0\u00a0\u00a0\u00a0');
//                                 }
//                             }}
//                             dangerouslySetInnerHTML={{
//                                 __html: `
//                                     <p class="mb-4">This is to certify that:</p>
//                                     <ol class="list-decimal pl-8 space-y-4 text-justify">
//                                         <li>
//                                             The applicants, <strong>${props.piName || "..."}</strong>, working as ${props.piDesignation || "..."} in the Department of ${props.piDepartment || "..."}${props.coPiName ? `, and <strong>${props.coPiName}</strong>, working as ${props.coPiDesignation || "..."} in the Department of ${props.coPiDepartment || "..."}` : ""}, are regular faculty members of the Indian Institute of Technology Guwahati.
//                                         </li>
//                                         <li>
//                                             <strong>${props.piName || "..."}</strong> is endorsed to submit the project titled "<strong>${props.projectTitle || "..."}</strong>" under the ${props.fundingAgency || "..."} program as the <strong>Principal Investigator (PI)</strong>${props.coPiName ? `, and <strong>${props.coPiName}</strong> is endorsed as the <strong>Co-Principal Investigator (Co-PI)</strong>` : ""}.
//                                         </li>
//                                         <li>
//                                             The applicants will assume full responsibility for implementing the project as PI and Co-PI, respectively.
//                                         </li>
//                                         <li>
//                                             The grant-in-aid for the project from ${props.fundingAgency || "..."}, through IIT Kharagpur will be used to meet the expenditure on the project and for the period for which the project has been sanctioned as indicated in the sanction letter/ order.
//                                         </li>
//                                         <li>
//                                             No administrative or other liability will be attached to Ministry of Education or IIT Kharagpur at the end of the Research Award.
//                                         </li>
//                                         <li>
//                                             The Institute will provide basic infrastructure and other required facilities to the investigator for undertaking the research objectives.
//                                         </li>
//                                         <li>
//                                             The Institute will assume to undertake the financial and other management responsibilities of the project.
//                                         </li>
//                                         <li>
//                                             The Institute shall settle the financial accounts to IIT Kharagpur as per the prescribed guidelines within one month from the date of termination of the Research Award.
//                                         </li>
//                                         <li>
//                                             PFMS Code of the Institute: IITG
//                                         </li>
//                                     </ol>
//                                 `
//                             }}
//                         />

//                         {/* Signatures */}
//                         <div className="mt-24 flex flex-col items-end avoid-break">
//                             <div className="font-bold">Signature of the Head of Institute</div>
//                             <div className="mt-4">
//                                 <img
//                                     src="http://172.16.135.27:8000/files/rohit_fake_sign.png"
//                                     alt="Signature"
//                                     className="h-16 w-auto"
//                                 />
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </main>
//         </div>
//     );
// };



// -=-=-=-=-=

import React, { useRef, useMemo, useEffect } from 'react';
import {
    Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered, Undo, Redo, FileCode
} from 'lucide-react';
import { AppSidebar } from './RndSidebar';

// Simple QR-style Square Barcode Generator Component
const QRCode = ({ value, size = 60 }: { value: string; size?: number }) => {
    const grid = useMemo(() => {
        if (!value) return null;

        const gridSize = 11; // 11x11 grid
        const cells: boolean[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));

        // Add finder patterns (3 corners)
        const addFinderPattern = (startX: number, startY: number) => {
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    if (y === 1 && x === 1) cells[startY + y][startX + x] = true;
                    else if (y === 0 || y === 2 || x === 0 || x === 2) cells[startY + y][startX + x] = true;
                }
            }
        };

        addFinderPattern(0, 0);      // Top-left
        addFinderPattern(gridSize - 3, 0);  // Top-right
        addFinderPattern(0, gridSize - 3);  // Bottom-left

        // Encode data in the remaining cells using character codes
        let dataIndex = 0;
        const dataChars = value.split('');

        for (let y = 3; y < gridSize; y++) {
            for (let x = 3; x < gridSize; x++) {
                if (dataIndex < dataChars.length) {
                    const charCode = dataChars[dataIndex].charCodeAt(0);
                    const bitPos = (y * gridSize + x) % 8;
                    cells[y][x] = ((charCode >> bitPos) & 1) === 1;
                } else {
                    // Checksum pattern for remaining cells
                    cells[y][x] = ((x + y) % 3 === 0);
                }
                dataIndex = (dataIndex + 1) % dataChars.length;
            }
        }

        return cells;
    }, [value]);

    if (!grid) return null;

    const cellSize = size / grid.length;

    return (
        <div className="inline-block">
            <svg
                width={size}
                height={size}
                className="inline-block border border-zinc-300 dark:border-zinc-700"
                viewBox={`0 0 ${size} ${size}`}
            >
                {grid.map((row, y) =>
                    row.map((cell, x) =>
                        cell && (
                            <rect
                                key={`${x}-${y}`}
                                x={x * cellSize}
                                y={y * cellSize}
                                width={cellSize}
                                height={cellSize}
                                fill="black"
                            />
                        )
                    )
                )}
            </svg>
        </div>
    );
};

interface EndorsementCertificateProps {
    proposalId?: string;
    piName?: string;
    piDesignation?: string;
    piDepartment?: string;
    coPiName?: string;
    coPiDesignation?: string;
    coPiDepartment?: string;
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
`;

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

    // Generate QR code SVG as string
    const generateQRCodeSvg = (value: string, size: number = 55): string => {
        if (!value) return '';

        const gridSize = 11;
        const cells: boolean[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(false));

        const addFinderPattern = (startX: number, startY: number) => {
            for (let y = 0; y < 3; y++) {
                for (let x = 0; x < 3; x++) {
                    if (y === 1 && x === 1) cells[startY + y][startX + x] = true;
                    else if (y === 0 || y === 2 || x === 0 || x === 2) cells[startY + y][startX + x] = true;
                }
            }
        };

        addFinderPattern(0, 0);
        addFinderPattern(gridSize - 3, 0);
        addFinderPattern(0, gridSize - 3);

        let dataIndex = 0;
        const dataChars = value.split('');

        for (let y = 3; y < gridSize; y++) {
            for (let x = 3; x < gridSize; x++) {
                if (dataIndex < dataChars.length) {
                    const charCode = dataChars[dataIndex].charCodeAt(0);
                    const bitPos = (y * gridSize + x) % 8;
                    cells[y][x] = ((charCode >> bitPos) & 1) === 1;
                } else {
                    cells[y][x] = ((x + y) % 3 === 0);
                }
                dataIndex = (dataIndex + 1) % dataChars.length;
            }
        }

        const cellSize = size / gridSize;
        let rects = '';
        cells.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    rects += `<rect x="${x * cellSize}" y="${y * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
                }
            });
        });

        return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="display:inline-block;border:1px solid #d1d5db;">${rects}</svg>`;
    };

    const coPiText = props.coPiName
        ? `, and <strong>${props.coPiName}</strong>, working as ${props.coPiDesignation || "..."} in the Department of ${props.coPiDepartment || "..."}`
        : "";

    const coPiEndorsementText = props.coPiName
        ? `, and <strong>${props.coPiName}</strong> is endorsed as the <strong>Co-Principal Investigator (Co-PI)</strong>`
        : "";

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
                    <img src="http://172.16.135.27:8000/files/IITG_logo.png" alt="IITG Logo" class="logo"/>
                </td>
                <td style="padding-left:16px;">
                    <div class="institute-name">Indian Institute of Technology Guwahati,</div>
                    <div style="margin-top:4px;">Guwahati 781039, Assam, India.</div>
                </td>
                <td class="contact-info" style="padding-left:16px;">
                    <div><span>Phone Nos:</span> +91-361- 258 2082</div>
                    <div><span>Mob.no:</span> +91-99548 25080</div>
                    <div><span>E-mail:</span> <a href="mailto:dornd@iitg.ernet.in" style="color:#000;">dornd@iitg.ernet.in</a></div>
                    <div class="qr-code">${generateQRCodeSvg(props.proposalId || "IITG-RND")}</div>
                </td>
                <td style="padding-left:16px;">
                    <img src="http://172.16.135.27:8000/files/yellow_office_name.png" alt="Office of R&D" class="office-logo"/>
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
            ${props.bodyHtml ? props.bodyHtml : `<p>This is to certify that:</p>
            <ol>
                <li>The applicants, <strong>${props.piName || "..."}</strong>, working as ${props.piDesignation || "..."} in the Department of ${props.piDepartment || "..."}${coPiText}, are regular faculty members of the Indian Institute of Technology Guwahati.</li>
                <li><strong>${props.piName || "..."}</strong> is endorsed to submit the project titled "<strong>${props.projectTitle || "..."}</strong>" under the ${props.fundingAgency || "..."} program as the <strong>Principal Investigator (PI)</strong>${coPiEndorsementText}.</li>
                <li>The applicants will assume full responsibility for implementing the project as PI and Co-PI, respectively.</li>
                <li>The grant-in-aid for the project from ${props.fundingAgency || "..."}, through IIT Kharagpur will be used to meet the expenditure on the project and for the period for which the project has been sanctioned as indicated in the sanction letter/ order.</li>
                <li>No administrative or other liability will be attached to Ministry of Education or IIT Kharagpur at the end of the Research Award.</li>
                <li>The Institute will provide basic infrastructure and other required facilities to the investigator for undertaking the research objectives.</li>
                <li>The Institute will assume to undertake the financial and other management responsibilities of the project.</li>
                <li>The Institute shall settle the financial accounts to IIT Kharagpur as per the prescribed guidelines within one month from the date of termination of the Research Award.</li>
                <li>PFMS Code of the Institute: IITG</li>
            </ol>`}
        </div>

        <div class="signature">
            <div class="label">Signature of the Head of Institute</div>
            <img src="http://172.16.135.27:8000/files/rohit_fake_sign.png" alt="Signature"/>
        </div>
    </div>
</body>
</html>`;
};

export const EndorsementCertificate: React.FC<EndorsementCertificateProps> = (props) => {
    const bodyRef = useRef<HTMLDivElement>(null);
    const documentRef = useRef<HTMLDivElement>(null);

    // Initialize the content only once on mount
    useEffect(() => {
        if (bodyRef.current && !bodyRef.current.innerHTML) {
            bodyRef.current.innerHTML = `
                <p class="mb-4">This is to certify that:</p>
                <ol class="list-decimal pl-8 space-y-4 text-justify">
                    <li>
                        The applicants, <strong>${props.piName || "..."}</strong>, working as ${props.piDesignation || "..."} in the Department of ${props.piDepartment || "..."}${props.coPiName ? `, and <strong>${props.coPiName}</strong>, working as ${props.coPiDesignation || "..."} in the Department of ${props.coPiDepartment || "..."}` : ""}, are regular faculty members of the Indian Institute of Technology Guwahati.
                    </li>
                    <li>
                        <strong>${props.piName || "..."}</strong> is endorsed to submit the project titled "<strong>${props.projectTitle || "..."}</strong>" under the ${props.fundingAgency || "..."} program as the <strong>Principal Investigator (PI)</strong>${props.coPiName ? `, and <strong>${props.coPiName}</strong> is endorsed as the <strong>Co-Principal Investigator (Co-PI)</strong>` : ""}.
                    </li>
                    <li>
                        The applicants will assume full responsibility for implementing the project as PI and Co-PI, respectively.
                    </li>
                    <li>
                        The grant-in-aid for the project from ${props.fundingAgency || "..."}, through IIT Kharagpur will be used to meet the expenditure on the project and for the period for which the project has been sanctioned as indicated in the sanction letter/ order.
                    </li>
                    <li>
                        No administrative or other liability will be attached to Ministry of Education or IIT Kharagpur at the end of the Research Award.
                    </li>
                    <li>
                        The Institute will provide basic infrastructure and other required facilities to the investigator for undertaking the research objectives.
                    </li>
                    <li>
                        The Institute will assume to undertake the financial and other management responsibilities of the project.
                    </li>
                    <li>
                        The Institute shall settle the financial accounts to IIT Kharagpur as per the prescribed guidelines within one month from the date of termination of the Research Award.
                    </li>
                    <li>
                        PFMS Code of the Institute: IITG
                    </li>
                </ol>
            `;
            // Trigger an initial save of the HTML
            handleContentChange();
        }
    }, [props]);

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

        // Create a blob and trigger download
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

    const handleContentChange = () => {
        if (props.onHtmlChange && bodyRef.current) {
            // Only pass the editable body content, NOT the full DOM-processed HTML.
            // The full HTML will be reconstructed at submission time using getEndorsementHtml()
            // to avoid DOM innerHTML stripping <!DOCTYPE>, <html>, <head>, <body> tags.
            props.onHtmlChange(bodyRef.current.innerHTML);
        }
    };

    return (
        <div className="bg-claude-bg min-h-screen">
            <AppSidebar />
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
                                            src="http://172.16.135.27:8000/files/IITG_logo.png"
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
                                                dornd@iitg.ernet.in
                                            </a>
                                        </div>
                                        {/* QR Code */}
                                        <div className="mt-3">
                                            <QRCode value={props.proposalId || "IITG-RND"} size={55} />
                                        </div>
                                    </td>
                                    <td className="align-top pl-4">
                                        <img
                                            src="http://172.16.135.27:8000/files/yellow_office_name.png"
                                            alt="Office of R&D"
                                            className="h-[150px] w-auto"
                                        />
                                    </td>
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
                            <div className="font-bold">Signature of the Head of Institute</div>
                            <div className="mt-4">
                                <img
                                    src="http://172.16.135.27:8000/files/rohit_fake_sign.png"
                                    alt="Signature"
                                    className="h-16 w-auto"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};