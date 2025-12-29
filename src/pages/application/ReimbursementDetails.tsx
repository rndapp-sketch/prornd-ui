import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../../components/RndSidebar";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, FileTextIcon, CalendarIcon, UserIcon } from "lucide-react";
import { GlobalLoader } from '@/components/ui/global-loader';

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

// Frappe-styled components
const FrappeCard = ({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white border border-gray-300 rounded-xl shadow-sm", className)}>
        {title && (
            <div className="px-6 py-4 border-b border-gray-300">
                <h3 className="text-lg font-bold text-black uppercase tracking-tight">{title}</h3>
            </div>
        )}
        <div className="p-6">
            {children}
        </div>
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-gray-400",
            variant === 'primary' && "bg-[#0EA5A4] text-white hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border border-[#0D9494]",
            variant === 'ghost' && "bg-transparent text-gray-900 hover:bg-gray-200 hover:text-black",
            variant === 'outline' && "bg-white border-2 border-gray-400 text-black hover:border-[#0EA5A4] hover:text-[#0EA5A4] hover:bg-gray-50",
            variant === 'action' && "bg-[#0EA5A4] text-white font-bold hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border-2 border-[#0D9494]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

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
            const result = await fetchLinkValue({
                doctype: doctype,
                filters: { name: docId },
                fieldname: fieldname
            });
            const resolvedValue = result?.message?.[fieldname] || docId;
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
                return 'bg-emerald-100 text-emerald-800 border-emerald-300';
            case 'Pending':
                return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'Rejected':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'Draft':
                return 'bg-slate-100 text-slate-800 border-slate-300';
            default:
                return 'bg-blue-100 text-blue-800 border-blue-300';
        }
    };

    // Detail row component
    const DetailRow = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
        <div className="flex justify-between py-2 border-b border-gray-200 last:border-0">
            <span className="text-sm font-medium text-gray-900">{label}</span>
            <span className="text-sm font-bold text-black">{value || '-'}</span>
        </div>
    );

    if (loading) {
        return <GlobalLoader isLoading={true} />;
    }

    if (error || !data) {
        return (
            <div className="bg-gray-100 min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <FrappeCard className="text-center py-16">
                        <FileTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h2 className="text-xl font-bold text-black mb-2 uppercase">Error Loading Reimbursement</h2>
                        <p className="text-gray-900 mb-6">{error || 'Reimbursement not found'}</p>
                        <FrappeButton variant="primary" onClick={() => navigate(-1)}>
                            Go Back
                        </FrappeButton>
                    </FrappeCard>
                </main>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 min-h-screen">
            <GlobalLoader isLoading={isSubmitting} />
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <FrappeCard className="mb-8 p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-3 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-gray-900" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-black uppercase tracking-tight">{data.name}</h1>
                                    <span className={cn(
                                        "px-3 py-1 text-sm font-bold rounded-md border",
                                        getStatusColor(data.workflow_state)
                                    )}>
                                        {data.workflow_state || 'Draft'}
                                    </span>
                                </div>
                                <p className="text-gray-900 mt-1 font-medium">Reimbursement Application</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right text-sm text-gray-900">
                                <div className="flex items-center gap-1 font-medium">
                                    <CalendarIcon className="w-4 h-4" />
                                    Created: {formatDate(data.creation)}
                                </div>
                                <div className="flex items-center gap-1 mt-1 font-medium">
                                    <UserIcon className="w-4 h-4" />
                                    By: {data.owner}
                                </div>
                            </div>
                            {/* Edit and Submit buttons - only show for Draft */}
                            {(data.workflow_state === 'Draft' || !data.workflow_state) && (
                                <>
                                    <FrappeButton
                                        variant="outline"
                                        onClick={() => navigate(`/reimbursement?edit=${data.name}`)}
                                    >
                                        Edit
                                    </FrappeButton>
                                    <FrappeButton
                                        variant="primary"
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                    >
                                        {isSubmitting ? 'Submitting...' : 'Submit'}
                                    </FrappeButton>
                                </>
                            )}
                        </div>
                    </div>
                </FrappeCard>

                {/* Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Applicant Details */}
                    <FrappeCard title="Applicant Details">
                        <div className="space-y-1">
                            <DetailRow label="Applicant Webmail" value={data.applicant_webmail} />
                            <DetailRow label="Department" value={resolvedNames.applicant_department || data.applicant_department} />
                            <DetailRow label="Designation" value={data.applicant_designation} />
                        </div>
                    </FrappeCard>

                    {/* Reimbursement For */}
                    <FrappeCard title="Reimbursement For">
                        <div className="space-y-1">
                            <DetailRow label="Webmail ID" value={data.reimbursement_for_id} />
                            <DetailRow label="Department" value={resolvedNames.reimbursement_for_department || data.reimbursement_for_department} />
                            <DetailRow label="Designation" value={data.reimbursement_for_designation} />
                        </div>
                    </FrappeCard>

                    {/* Bank Details */}
                    <FrappeCard title="Bank Details">
                        <div className="space-y-1">
                            <DetailRow label="Bank Name" value={data.bank_name} />
                            <DetailRow label="Account Holder" value={data.account_holder_name} />
                            <DetailRow label="Account Number" value={data.bank_account_number} />
                            <DetailRow label="IFSC Code" value={data.ifsc_code} />
                        </div>
                    </FrappeCard>

                    {/* Project Details */}
                    <FrappeCard title="Project Details">
                        <div className="space-y-1">
                            <DetailRow label="Project Number" value={data.project_number} />
                            <DetailRow label="Project Name" value={data.project_name} />
                            <DetailRow label="Account Head" value={resolvedNames.account_head || data.account_head} />
                            {data.other_head && <DetailRow label="Other Head" value={data.other_head} />}
                        </div>
                    </FrappeCard>

                    {/* Particulars of Items Table */}
                    {data.table_bosk && data.table_bosk.length > 0 && (
                        <FrappeCard title="Particulars of Items" className="lg:col-span-2">
                            <div className="overflow-x-auto border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-200">
                                        <tr className="divide-x divide-gray-300">
                                            <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase">Date</th>
                                            <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase">Vendor's Name</th>
                                            <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase">Particulars</th>
                                            <th className="px-4 py-3 text-right text-sm font-bold text-black uppercase">Amount</th>
                                            <th className="px-4 py-3 text-left text-sm font-bold text-black uppercase">Attachment</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300 bg-white">
                                        {data.table_bosk.map((item: any, index: number) => (
                                            <tr key={item.name || index} className="hover:bg-gray-50 divide-x divide-gray-300">
                                                <td className="px-4 py-3 text-sm text-gray-900 font-mono">
                                                    {item.r_date ? new Date(item.r_date).toLocaleDateString('en-IN') : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 font-medium">{item.vendors_name || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-900">{item.particulars || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-black font-bold text-right">
                                                    ₹{(parseFloat(item.amount) || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {item.uploads ? (
                                                        <a
                                                            href={item.uploads}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-[#0EA5A4] font-bold hover:underline"
                                                        >
                                                            View File
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-500">No file</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-3 text-sm font-bold text-black text-right uppercase">Total Amount:</td>
                                            <td className="px-4 py-3 text-sm font-bold text-black text-right">
                                                ₹{data.table_bosk.reduce((sum: number, item: any) => sum + (parseFloat(item.amount) || 0), 0).toLocaleString('en-IN')}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </FrappeCard>
                    )}

                    {/* Comments */}
                    {data.comment && (
                        <FrappeCard title="Comments" className="lg:col-span-2">
                            <p className="text-gray-900 whitespace-pre-wrap font-medium">{data.comment}</p>
                        </FrappeCard>
                    )}

                    {/* Declarations */}
                    <FrappeCard title="Declarations" className="lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2, 3, 4].map(num => (
                                <div key={num} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className={cn(
                                        "w-6 h-6 rounded flex items-center justify-center text-white text-sm font-bold",
                                        data[`dec${num}`] ? "bg-emerald-600" : "bg-gray-400"
                                    )}>
                                        {data[`dec${num}`] ? "✓" : ""}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">Declaration {num} {data[`dec${num}`] ? 'Accepted' : 'Not Accepted'}</span>
                                </div>
                            ))}
                        </div>
                    </FrappeCard>

                    {/* Meta Information */}
                    <FrappeCard title="Meta Information" className="lg:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <DetailRow label="Created" value={formatDate(data.creation)} />
                            <DetailRow label="Last Modified" value={formatDate(data.modified)} />
                            <DetailRow label="Owner" value={data.owner} />
                        </div>
                    </FrappeCard>
                </div>
            </main>
        </div>
    );
};

export default ReimbursementDetails;
