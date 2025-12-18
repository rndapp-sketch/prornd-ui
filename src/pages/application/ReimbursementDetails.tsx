import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../../components/RndSidebar";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, FileTextIcon, CalendarIcon, UserIcon } from "lucide-react";

// --- TYPE DEFINITIONS ---
interface ReimbursementData {
    name: string;
    owner: string;
    creation: string;
    modified: string;
    workflow_state: string;
    self_other: string | null;
    reimbursement_for_id: string;
    reimbursement_for_department: string;
    reimbursement_for_designation: string;
    applicant_webmail: string;
    applicant_department: string;
    applicant_designation: string;
    bank_name: string;
    account_holder_name: string;
    bank_account_number: string;
    ifsc_code: string;
    project_number: string;
    project_name: string;
    account_head: string;
    other_head: string;
    comment: string;
    dec1: number;
    dec2: number;
    dec3: number;
    dec4: number;
    [key: string]: any;
}

const ReimbursementDetails: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [data, setData] = useState<ReimbursementData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

    const { call: fetchDoc } = useFrappePostCall<{ message: ReimbursementData }>(
        'frappe.client.get'
    );

    const { call: fetchLinkValue } = useFrappePostCall<{ message: any }>(
        'frappe.client.get_value'
    );

    const { call: submitDoc } = useFrappePostCall<{ message: any }>(
        'rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.submit_reimbursement'
    );

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Function to resolve a link field ID to its display name
    const resolveLinkName = async (doctype: string, docId: string, fieldname: string) => {
        if (!docId) return '';
        try {
            console.log(`Resolving link: doctype=${doctype}, docId=${docId}, fieldname=${fieldname}`);
            const result = await fetchLinkValue({
                doctype: doctype,
                filters: { name: docId },
                fieldname: fieldname
            });
            console.log(`Resolve result for ${docId}:`, result);
            const resolvedValue = result?.message?.[fieldname] || docId;
            console.log(`Resolved value: ${resolvedValue}`);
            return resolvedValue;
        } catch (err) {
            console.error(`Error resolving ${doctype}/${docId}:`, err);
            return docId;
        }
    };

    // Handle submit for draft reimbursement
    const handleSubmit = async () => {
        if (!data || isSubmitting) return;

        if (!confirm('Are you sure you want to submit this reimbursement application? This action cannot be undone.')) {
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await submitDoc({
                docname: data.name
            });

            console.log('Submit response:', response);
            alert('Reimbursement submitted successfully!');

            // Reload the data to get updated status
            const refreshed = await fetchDoc({
                doctype: 'Reimbursement',
                name: data.name
            });
            if (refreshed?.message) {
                setData(refreshed.message);
            }
        } catch (err: any) {
            console.error('Error submitting reimbursement:', err);
            alert(`Failed to submit: ${err.message || 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            if (!id) {
                setError('No reimbursement ID provided');
                setLoading(false);
                return;
            }

            try {
                const response = await fetchDoc({
                    doctype: 'Reimbursement',
                    name: id
                });

                console.log('Reimbursement Details:', response?.message);

                if (response?.message) {
                    const docData = response.message;
                    setData(docData);

                    // Resolve linked field names
                    const nameMap: Record<string, string> = {};

                    // Resolve department names (Department_prornd doctype with dept_name field)
                    if (docData.reimbursement_for_department) {
                        nameMap.reimbursement_for_department = await resolveLinkName('Department_prornd', docData.reimbursement_for_department, 'dept_name');
                    }
                    if (docData.applicant_department) {
                        nameMap.applicant_department = await resolveLinkName('Department_prornd', docData.applicant_department, 'dept_name');
                    }

                    // Resolve account head name (Budget Head doctype with budget_head field)
                    if (docData.account_head) {
                        nameMap.account_head = await resolveLinkName('Budget Head', docData.account_head, 'budget_head');
                    }

                    setResolvedNames(nameMap);
                } else {
                    setError('Reimbursement not found');
                }
            } catch (err) {
                console.error('Error fetching reimbursement:', err);
                setError('Failed to load reimbursement details');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id, fetchDoc, fetchLinkValue]);

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Approved':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'Pending':
                return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Rejected':
                return 'bg-red-100 text-red-700 border-red-200';
            case 'Draft':
                return 'bg-gray-100 text-gray-700 border-gray-200';
            default:
                return 'bg-blue-100 text-blue-700 border-blue-200';
        }
    };

    // Card component
    const Card = ({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) => (
        <div className={cn("bg-white border border-gray-200 rounded-xl shadow-sm", className)}>
            <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            </div>
            <div className="p-6">
                {children}
            </div>
        </div>
    );

    // Detail row component
    const DetailRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
        <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
            <span className="text-sm text-gray-600">{label}</span>
            <span className="text-sm font-medium text-gray-900">{value || '-'}</span>
        </div>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5A4] mx-auto"></div>
                    <p className="mt-4 text-lg font-semibold text-gray-700">Loading reimbursement details...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-[#F0F4F8] min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <div className="text-center py-16">
                        <FileTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Reimbursement</h2>
                        <p className="text-gray-600 mb-6">{error || 'Reimbursement not found'}</p>
                        <button
                            onClick={() => navigate(-1)}
                            className="px-4 py-2 bg-[#0EA5A4] text-white rounded-lg hover:bg-[#0D9494] transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="bg-[#F0F4F8] min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <header className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 active:translate-y-0.5 transition-all"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-gray-900">{data.name}</h1>
                                    <span className={cn(
                                        "px-3 py-1 text-sm font-medium rounded-full border",
                                        getStatusColor(data.workflow_state)
                                    )}>
                                        {data.workflow_state || 'Draft'}
                                    </span>
                                </div>
                                <p className="text-gray-600 mt-1">Reimbursement Application</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <CalendarIcon className="w-4 h-4" />
                                    Created: {formatDate(data.creation)}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                    <UserIcon className="w-4 h-4" />
                                    By: {data.owner}
                                </div>
                            </div>
                            {/* Edit and Submit buttons - only show for Draft */}
                            {(data.workflow_state === 'Draft' || !data.workflow_state) && (
                                <>
                                    <button
                                        onClick={() => navigate(`/reimbursement?edit=${data.name}`)}
                                        className={cn(
                                            "px-6 py-2.5 rounded-lg font-semibold transition-all",
                                            "bg-white border border-gray-300 text-gray-700",
                                            "hover:bg-gray-50 hover:border-gray-400",
                                            "shadow-sm hover:shadow"
                                        )}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className={cn(
                                            "px-6 py-2.5 rounded-lg font-semibold text-white transition-all",
                                            "bg-[#0EA5A4] hover:bg-[#0D9494]",
                                            "disabled:opacity-50 disabled:cursor-not-allowed",
                                            "shadow-sm hover:shadow"
                                        )}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Applicant Details */}
                    <Card title="Applicant Details">
                        <div className="space-y-1">
                            <DetailRow label="Applicant Webmail" value={data.applicant_webmail} />
                            <DetailRow label="Department" value={resolvedNames.applicant_department || data.applicant_department} />
                            <DetailRow label="Designation" value={data.applicant_designation} />
                        </div>
                    </Card>

                    {/* Reimbursement For */}
                    <Card title="Reimbursement For">
                        <div className="space-y-1">
                            <DetailRow label="Webmail ID" value={data.reimbursement_for_id} />
                            <DetailRow label="Department" value={resolvedNames.reimbursement_for_department || data.reimbursement_for_department} />
                            <DetailRow label="Designation" value={data.reimbursement_for_designation} />
                        </div>
                    </Card>

                    {/* Bank Details */}
                    <Card title="Bank Details">
                        <div className="space-y-1">
                            <DetailRow label="Bank Name" value={data.bank_name} />
                            <DetailRow label="Account Holder" value={data.account_holder_name} />
                            <DetailRow label="Account Number" value={data.bank_account_number} />
                            <DetailRow label="IFSC Code" value={data.ifsc_code} />
                        </div>
                    </Card>

                    {/* Project Details */}
                    <Card title="Project Details">
                        <div className="space-y-1">
                            <DetailRow label="Project Number" value={data.project_number} />
                            <DetailRow label="Project Name" value={data.project_name} />
                            <DetailRow label="Account Head" value={resolvedNames.account_head || data.account_head} />
                            {data.other_head && <DetailRow label="Other Head" value={data.other_head} />}
                        </div>
                    </Card>

                    {/* Particulars of Items Table */}
                    {data.table_bosk && data.table_bosk.length > 0 && (
                        <Card title="Particulars of Items" className="lg:col-span-2">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Vendor's Name</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Particulars</th>
                                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Amount</th>
                                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Attachment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {data.table_bosk.map((item: any, index: number) => (
                                            <tr key={item.name || index} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {item.r_date ? new Date(item.r_date).toLocaleDateString('en-IN') : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.vendors_name || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.particulars || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                    ₹{(parseFloat(item.amount) || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {item.uploads ? (
                                                        <a
                                                            href={item.uploads}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[#0EA5A4] hover:underline"
                                                        >
                                                            View File
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400">No file</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">Total Amount:</td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                                                ₹{data.table_bosk.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString('en-IN')}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </Card>
                    )}

                    {/* Comments */}
                    {data.comment && (
                        <Card title="Comments" className="lg:col-span-2">
                            <p className="text-gray-700 whitespace-pre-wrap">{data.comment}</p>
                        </Card>
                    )}

                    {/* Declarations */}
                    <Card title="Declarations" className="lg:col-span-2">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center text-white text-xs",
                                    data.dec1 ? "bg-green-500" : "bg-gray-300"
                                )}>
                                    {data.dec1 ? "✓" : ""}
                                </div>
                                <span className="text-sm text-gray-700">Declaration 1 accepted</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center text-white text-xs",
                                    data.dec2 ? "bg-green-500" : "bg-gray-300"
                                )}>
                                    {data.dec2 ? "✓" : ""}
                                </div>
                                <span className="text-sm text-gray-700">Declaration 2 accepted</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center text-white text-xs",
                                    data.dec3 ? "bg-green-500" : "bg-gray-300"
                                )}>
                                    {data.dec3 ? "✓" : ""}
                                </div>
                                <span className="text-sm text-gray-700">Declaration 3 accepted</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "w-5 h-5 rounded flex items-center justify-center text-white text-xs",
                                    data.dec4 ? "bg-green-500" : "bg-gray-300"
                                )}>
                                    {data.dec4 ? "✓" : ""}
                                </div>
                                <span className="text-sm text-gray-700">Declaration 4 accepted</span>
                            </div>
                        </div>
                    </Card>

                    {/* Meta Information */}
                    <Card title="Meta Information" className="lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DetailRow label="Created" value={formatDate(data.creation)} />
                            <DetailRow label="Last Modified" value={formatDate(data.modified)} />
                            <DetailRow label="Owner" value={data.owner} />
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default ReimbursementDetails;
