import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import { AppSidebar } from '../components/RndSidebar';

const FundSanctionView: React.FC = () => {
    const navigate = useNavigate();
    const { sanctionName } = useParams<{ sanctionName: string }>();
    const { data, isLoading } = useFrappeGetDoc('Fund Sanction', sanctionName);

    if (isLoading) return <div>Loading Sanction...</div>;

    return (
        <div className="flex min-h-screen w-full bg-[#FDFCEC]">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8">
                <header className="mb-8 p-4 flex justify-between items-center bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div>
                        <h1 className="text-3xl font-extrabold text-black">
                            Sanction: {data?.sanctioned_letter_no}
                        </h1>
                        <p className="font-mono text-gray-600">Project: {data?.project_proposal}</p>
                    </div>
                    <button
                        onClick={() => navigate(`/add-fund-received/${sanctionName}`)}
                        className="px-4 py-2 bg-sky-200 border-2 border-black rounded-md font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_rgba(0,0,0,0.25)] transition-all"
                    >
                        Add Received Fund
                    </button>
                </header>

                <div className="bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)] p-6">
                    {/* Display Sanction Details Here */}
                    <p className="font-mono font-bold">Total Sanctioned: {data?.total_sanctioned_amount}</p>
                    {/* Display budget table data, etc. */}
                </div>

                <div className="mt-8 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)] p-6">
                    <h2 className="text-2xl font-bold mb-4">Received Funds Log</h2>
                    {/* List all linked Fund Received documents here */}
                    <p className="text-gray-500 italic">No received funds linked yet.</p>
                </div>
            </main>
        </div>
    );
};

export default FundSanctionView;