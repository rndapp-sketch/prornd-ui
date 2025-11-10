import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFrappeGetDoc } from 'frappe-react-sdk'; // Use GetDoc for viewing
// ... other imports

const FundSanctionView: React.FC = () => {
    const navigate = useNavigate();
    const { sanctionName } = useParams<{ sanctionName: string }>();
    const { data, isLoading } = useFrappeGetDoc('Fund Sanction', sanctionName);
    // You'd also fetch the list of linked 'Fund Received' docs here

    if (isLoading) return <div>Loading Sanction...</div>;

    return (
        <div className="bg-[#FDFCEC]">
            <AppSidebar isPermanentEmployee={true} />
            <main className="flex-1 p-4 md:p-8">
                <header className="mb-8 p-4 flex justify-between items-center bg-white ...">
                    <div>
                        <h1 className="text-3xl font-extrabold text-black">
                            Sanction: {data?.sanctioned_letter_no}
                        </h1>
                        <p>Project: {data?.project_proposal}</p>
                    </div>
                    <NeoButton 
                        onClick={() => navigate(`/add-fund-received/${sanctionName}`)}
                        className="bg-sky-200"
                    >
                        Add Received Fund
                    </NeoButton>
                </header>

                <NeoCard>
                    {/* Display Sanction Details Here */}
                    <p>Total Sanctioned: {data?.total_sanctioned_amount}</p>
                    {/* Display budget table data, etc. */}
                </NeoCard>

                <NeoCard className="mt-8">
                    <h2 className="text-2xl font-bold">Received Funds Log</h2>
                    {/* List all linked Fund Received documents here */}
                </NeoCard>
            </main>
        </div>
    );
};

export default FundSanctionView;