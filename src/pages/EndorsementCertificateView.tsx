import React from 'react';
import { useParams } from 'react-router-dom';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import { EndorsementCertificate } from '../components/EndorsementCertificate';
import { AppSidebar } from '@/components/RndSidebar';

const EndorsementCertificateView: React.FC = () => {
    const { name } = useParams<{ name: string }>();
    const { data, error, isLoading } = useFrappeGetDoc("Project Proposal", name || "");

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading Certificate...</div>;
    }

    if (error || !data) {
        return <div className="flex items-center justify-center min-h-screen text-red-600">Error loading data.</div>;
    }

    // Map data to props
    // Note: Adjust field names based on actual API response structure if different
    const props = {
        proposalId: data.name,
        piName: data.principal_investigator_name,
        piDesignation: data.designation,
        piDepartment: data.applicant_department,
        coPiName: data.co_investigator_table?.[0]?.copi_name || "N/A", // Taking first Co-PI if available
        coPiDesignation: data.co_investigator_table?.[0]?.copi_designation || "N/A",
        coPiDepartment: "Department Placeholder", // This might need to be fetched or added to the form
        projectTitle: data.project_title,
        fundingAgency: data.funding_agen,
    };

    return (
        <div className=" min-h-screen bg-gray-100 print:bg-white">
            {/* <AppSidebar /> */}

            <div className="print:hidden text-center mb-6">
                <button
                    onClick={() => window.print()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md font-bold shadow-md hover:bg-blue-700 transition-colors"
                >
                    Print / Save as PDF
                </button>
            </div>
            <EndorsementCertificate {...props} />

        </div>
    );
};

export default EndorsementCertificateView;
