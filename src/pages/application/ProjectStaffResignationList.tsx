import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, PlusIcon, Search, Filter } from 'lucide-react';
import { resignationAPI } from '@/services/apiService';

// --- TYPE DEFINITIONS ---
interface Resignation {
    name: string;
    applicant_name: string;
    applicant_email_id: string;
    applicant_designation: string;
    applicant_department: string;
    resignation_date: string;
    docstatus: number;
    modified: string;
}

interface ResignationListResponse {
    message: {
        status: string;
        data: Resignation[];
    };
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white p-6 md:p-8 border border-gray-200 rounded-xl shadow-sm", className)}>
        {children}
    </div>
);

const ProjectStaffResignationList: React.FC = () => {
    const navigate = useNavigate();
    const [resignations, setResignations] = useState<Resignation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const { call: fetchResignations, result, error } = useFrappePostCall<ResignationListResponse>(resignationAPI.getList);

    useEffect(() => {
        fetchResignations({});
    }, [fetchResignations]);

    useEffect(() => {
        if (result?.message?.status === 'success') {
            setResignations(result.message.data || []);
            setLoading(false);
        } else if (error) {
            console.error("Failed to fetch resignations:", error);
            setLoading(false);
        }
    }, [result, error]);

    const filteredResignations = resignations.filter(r =>
        r.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.applicant_email_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusBadge = (docstatus: number) => {
        switch (docstatus) {
            case 0: return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">Draft</span>;
            case 1: return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Submitted</span>;
            case 2: return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Cancelled</span>;
            default: return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Unknown</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0EA5A4] border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-gray-700">Loading resignations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#F0F4F8] min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-8 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-gray-900" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Project Staff Resignations</h1>
                                <p className="text-gray-600 mt-1">View and manage resignation requests.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => navigate('/project-staff-resignation')}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm bg-[#0EA5A4] text-white hover:bg-[#0D9494] transition-all"
                        >
                            <PlusIcon className="h-4 w-4" />
                            New Resignation
                        </button>
                    </div>
                </header>

                <FrappeCard>
                    <div className="mb-6 flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, email, or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/20 focus:border-[#0EA5A4]"
                            />
                        </div>
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                            <Filter className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="py-3 px-4 text-sm font-semibold text-gray-600">ID</th>
                                    <th className="py-3 px-4 text-sm font-semibold text-gray-600">Applicant</th>
                                    <th className="py-3 px-4 text-sm font-semibold text-gray-600">Designation</th>
                                    <th className="py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                                    <th className="py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                                    <th className="py-3 px-4 text-sm font-semibold text-gray-600">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredResignations.length > 0 ? (
                                    filteredResignations.map((resignation) => (
                                        <tr key={resignation.name} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                            <td className="py-3 px-4 text-sm text-gray-900 font-medium">{resignation.name}</td>
                                            <td className="py-3 px-4">
                                                <div className="text-sm font-medium text-gray-900">{resignation.applicant_name}</div>
                                                <div className="text-xs text-gray-500">{resignation.applicant_email_id}</div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{resignation.applicant_designation}</td>
                                            <td className="py-3 px-4 text-sm text-gray-600">{resignation.resignation_date}</td>
                                            <td className="py-3 px-4">{getStatusBadge(resignation.docstatus)}</td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => navigate(`/project-staff-resignation?edit=${resignation.name}`)}
                                                    className="text-sm font-medium text-[#0EA5A4] hover:underline"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-gray-500">
                                            No resignations found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </FrappeCard>
            </main>
        </div>
    );
};

export default ProjectStaffResignationList;
