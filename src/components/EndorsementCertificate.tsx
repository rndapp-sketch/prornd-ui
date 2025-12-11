import React, { useRef, useMemo } from 'react';
import {
    Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered, Undo, Redo
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
                className="inline-block border border-gray-300"
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

// ... interface definition ...
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
}

// Print styles for A4 pagination with footer margin
const printStyles = `
@media print {
    @page {
        size: A4;
        margin: 20mm 15mm 25mm 15mm; /* top right bottom left - 25mm footer margin */
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

const Toolbar = () => {
    const handleFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };

    return (
        <div className="sticky top-8 self-start flex flex-col gap-3 p-3 bg-white border-2 border-gray-300 rounded-xl shadow-lg no-print z-10 h-fit">
            {/* Text Formatting */}
            <div className="flex flex-col gap-1 pb-3 border-b border-gray-300">
                <button onClick={() => handleFormat('bold')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Bold">
                    <Bold className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('italic')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Italic">
                    <Italic className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('underline')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Underline">
                    <Underline className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('strikeThrough')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Strikethrough">
                    <Strikethrough className="w-5 h-5" />
                </button>
            </div>

            {/* Alignment */}
            <div className="flex flex-col gap-1 pb-3 border-b border-gray-300">
                <button onClick={() => handleFormat('justifyLeft')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Align Left">
                    <AlignLeft className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('justifyCenter')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Align Center">
                    <AlignCenter className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('justifyRight')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Align Right">
                    <AlignRight className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('justifyFull')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Justify">
                    <AlignJustify className="w-5 h-5" />
                </button>
            </div>

            {/* Lists */}
            <div className="flex flex-col gap-1 pb-3 border-b border-gray-300">
                <button onClick={() => handleFormat('insertUnorderedList')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Bullet List">
                    <List className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('insertOrderedList')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Numbered List">
                    <ListOrdered className="w-5 h-5" />
                </button>
            </div>

            {/* History */}
            <div className="flex flex-col gap-1">
                <button onClick={() => handleFormat('undo')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Undo">
                    <Undo className="w-5 h-5" />
                </button>
                <button onClick={() => handleFormat('redo')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Redo">
                    <Redo className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export const EndorsementCertificate: React.FC<EndorsementCertificateProps> = (props) => {
    const bodyRef = useRef<HTMLDivElement>(null);

    return (
        <div className="bg-[#F0F4F8] min-h-screen">
            <AppSidebar />
            <main className="p-4 md:p-8 w-full">
                {/* Inject print styles */}
                <style>{printStyles}</style>

                {/* Flex container for toolbar and A4 paper - scrollable */}
                <div className="flex justify-center items-start gap-4 max-h-[calc(100vh-4rem)] overflow-y-auto">
                    {/* Floating Toolbar - sticky within the scroll container */}
                    <div className="sticky top-4">
                        <Toolbar />
                    </div>

                    <div className="print-container w-[210mm] min-h-[297mm] bg-white p-[20mm] shadow-lg text-black font-serif text-sm leading-relaxed relative">

                        {/* Header Section */}
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
                                        {/* <div className="font-bold text-lg"></div> */}
                                        <div className="mt-1">Guwahati 781039, Assam, India.</div>
                                    </td>
                                    <td className="align-top pl-4 text-right whitespace-nowrap">
                                        <div><span className="font-semibold">Phone Nos:</span> +91-361- 258 2082</div>
                                        <div><span className="font-semibold">Mob.no:</span> +91-99548 25080</div>
                                        <div>
                                            <span className="font-semibold">E-mail:</span>{" "}
                                            <a href="mailto:dornd@iitg.ernet.in" className="text-black hover:underline">
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
                                <span className="text-gray-600">Ref. No.:</span>{" "}
                                <span className="font-bold">{props.proposalId || "IITG/RND/____"}</span>
                            </div>
                            <div className="text-sm text-gray-600">
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
                            className="outline-none focus:bg-gray-50 p-2 -ml-2 rounded transition-colors [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                            suppressContentEditableWarning
                            onKeyDown={(e) => {
                                if (e.key === 'Tab') {
                                    e.preventDefault();
                                    document.execCommand('insertText', false, '\u00a0\u00a0\u00a0\u00a0');
                                }
                            }}
                            dangerouslySetInnerHTML={{
                                __html: `
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
                                `
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
