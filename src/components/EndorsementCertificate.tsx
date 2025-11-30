import React, { useEffect, useRef } from 'react';
import {
    Bold, Italic, Underline, Strikethrough,
    AlignLeft, AlignCenter, AlignRight, AlignJustify,
    List, ListOrdered, Undo, Redo
} from 'lucide-react';

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

const Toolbar = () => {
    const handleFormat = (command: string, value?: string) => {
        document.execCommand(command, false, value);
    };

    return (
        <div className="flex flex-wrap gap-2 mb-4 p-2 bg-gray-200 border border-gray-300 rounded-md no-print sticky top-0 z-10">
            {/* Text Formatting */}
            <div className="flex gap-1 border-r pr-2 border-gray-400">
                <button onClick={() => handleFormat('bold')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Bold">
                    <Bold className="w-4 h-4" />
                </button>
                <button onClick={() => handleFormat('italic')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Italic">
                    <Italic className="w-4 h-4" />
                </button>
                <button onClick={() => handleFormat('underline')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Underline">
                    <Underline className="w-4 h-4" />
                </button>
                <button onClick={() => handleFormat('strikeThrough')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Strikethrough">
                    <Strikethrough className="w-4 h-4" />
                </button>
            </div>

            {/* Alignment */}
            <div className="flex gap-1 border-r pr-2 border-gray-400">
                <button onClick={() => handleFormat('justifyLeft')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Align Left">
                    <AlignLeft className="w-4 h-4" />
                </button>
                <button onClick={() => handleFormat('justifyCenter')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Align Center">
                    <AlignCenter className="w-4 h-4" />
                </button>
                <button onClick={() => handleFormat('justifyRight')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Align Right">
                    <AlignRight className="w-4 h-4" />
                </button>
                <button onClick={() => handleFormat('justifyFull')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Justify">
                    <AlignJustify className="w-4 h-4" />
                </button>
            </div>

            {/* Lists */}
            <div className="flex gap-1 border-r pr-2 border-gray-400">
                <button onClick={() => handleFormat('insertUnorderedList')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Bullet List">
                    <List className="w-4 h-4" />
                </button>
                <button onClick={() => handleFormat('insertOrderedList')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Numbered List">
                    <ListOrdered className="w-4 h-4" />
                </button>
            </div>

            {/* History */}
            <div className="flex gap-1">
                <button onClick={() => handleFormat('undo')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Undo">
                    <Undo className="w-4 h-4" />
                </button>
                <button onClick={() => handleFormat('redo')} className="p-1.5 hover:bg-gray-300 rounded transition-colors" title="Redo">
                    <Redo className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export const EndorsementCertificate: React.FC<EndorsementCertificateProps> = (props) => {
    const bodyRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (bodyRef.current) {
            // Construct the initial HTML content
            const htmlContent = `
        <p class="mb-4">This is to certify that:</p>
        <ol class="list-decimal pl-8 space-y-4 text-justify">
          <li>
            The applicants, <strong>${props.piName || "..."}</strong>, working as ${props.piDesignation || "..."} in the Department of ${props.piDepartment || "..."}${props.coPiName ? `, and <strong>${props.coPiName}</strong>, working as ${props.coPiDesignation || "..."} in the Department of ${props.coPiDepartment || "..."}` : ""}, are regular faculty members of the Indian Institute of Technology Guwahati.
          </li>
          <li>
            <strong>${props.piName || "..."}</strong> is endorsed to submit the project titled “<strong>${props.projectTitle || "..."}</strong>” under the ${props.fundingAgency || "..."} program as the <strong>Principal Investigator (PI)</strong>${props.coPiName ? `, and <strong>${props.coPiName}</strong> is endorsed as the <strong>Co-Principal Investigator (Co-PI)</strong>` : ""}.
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
            bodyRef.current.innerHTML = htmlContent;
        }
    }, [props]);

    return (
        <div className="print-container w-[210mm] min-h-[297mm] mx-auto bg-white p-[20mm] shadow-lg text-black font-serif text-sm leading-relaxed relative">
            <Toolbar />

            {/* Header Section */}
            <table className="w-full border-collapse mb-8">
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
                        </td>
                        <td className="align-top pl-4">
                            <img
                                src="http://172.16.135.27:8000/files/yellow_office_name.png"
                                alt="Office of R&D"
                                className="h-[80px] w-auto"
                            />
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* Dean Info */}
            <div className="mb-8">
                <div className="font-bold">Prof. Rohit Sinha</div>
                <div>Dean (Research and Development),</div>
                <div>Professor of Electronics and Electrical Engineering</div>
            </div>

            {/* Title */}
            <h3 className="text-center font-bold underline text-lg mb-6 uppercase">
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
            />

            {/* Signatures */}
            <div className="mt-24 flex flex-col items-end page-break">
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
    );
};
