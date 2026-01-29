import React, { useState, useEffect, useCallback } from 'react';
import { FaExclamationCircle, FaArrowLeft, FaSearch } from 'react-icons/fa';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppSidebar } from '@/components/RndSidebar';
import { useNavigate } from 'react-router-dom';
import { GlobalLoader } from '@/components/ui/global-loader';

// Define interfaces for payments
interface PaymentRecord {
    name: string;
    project_ref_number: string;
    budget_head: string;
    payment_amount: number;
    payment_date: string;
    payment_status: string;
    payment_bmr: string;
    payment_particular: string;
    owner: string;
    creation: string;
    modified: string;
    doctype?: string;  // Module/Doctype name
}

// Frappe-styled components
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white rounded-xl border border-gray-300 shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'ghost' }: {
    children: React.ReactNode;
    onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all duration-150",
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

const Payments: React.FC = () => {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [selectedDoctype, setSelectedDoctype] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const itemsPerPage = 10;

    // Payment Modal State
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
    const [paymentFormData, setPaymentFormData] = useState<Record<string, any>>({});
    const [paymentFieldDefs, setPaymentFieldDefs] = useState<any[]>([]);
    const [paymentLinkOptions, setPaymentLinkOptions] = useState<Record<string, any[]>>({});
    const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Fetch payments data
    const fetchPayments = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/method/rndopsapp.rndopsapp.doctype.accountheadpayment.accountheadpayment.get_all_payments', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });
            const result = await response.json();
            if (result?.message) {
                setPayments(result.message || []);
            } else {
                setPayments([]);
            }
        } catch (err: any) {
            console.error('Failed to fetch payments:', err);
            setError(err.message || 'Failed to load payments');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPayments();
    }, [fetchPayments]);

    // Client-side filtering
    const filteredPayments = React.useMemo(() => {
        let result = payments;

        if (debouncedSearch) {
            const lowerSearch = debouncedSearch.toLowerCase();
            result = result.filter(p =>
                p.name?.toLowerCase().includes(lowerSearch) ||
                p.project_ref_number?.toLowerCase().includes(lowerSearch) ||
                p.payment_particular?.toLowerCase().includes(lowerSearch) ||
                p.owner?.toLowerCase().includes(lowerSearch)
            );
        }

        if (selectedStatus) {
            result = result.filter(p => p.payment_status === selectedStatus);
        }

        if (selectedDoctype) {
            result = result.filter(p => p.doctype === selectedDoctype);
        }

        return result;
    }, [payments, debouncedSearch, selectedStatus, selectedDoctype]);

    // Client-side pagination
    const paginatedPayments = React.useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredPayments.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredPayments, currentPage, itemsPerPage]);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
    };

    const handleStatusChange = (status: string) => {
        setSelectedStatus(status);
        setCurrentPage(1);
    };

    const handleDoctypeChange = (doctype: string) => {
        setSelectedDoctype(doctype);
        setCurrentPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const getStatusBadge = (status: string) => {
        const s = status?.toLowerCase();
        let style = "bg-blue-100 text-blue-800 border-blue-300";
        if (s === "pending") {
            style = "bg-amber-100 text-amber-800 border-amber-300";
        } else if (s === "paid") {
            style = "bg-emerald-100 text-emerald-800 border-emerald-300";
        } else if (s === "rejected") {
            style = "bg-red-100 text-red-800 border-red-300";
        } else if (s === "rectification") {
            style = "bg-purple-100 text-purple-800 border-purple-300";
        }
        return cn("px-2.5 py-1 rounded-md text-xs font-bold border uppercase", style);
    };

    const getPageNumbers = () => {
        const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
        const pages: (number | string)[] = [];
        const maxButtons = 3;

        if (totalPages <= maxButtons) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }
        return pages;
    };

    // Open payment modal for editing
    const openPaymentModal = useCallback(async (payment: PaymentRecord) => {
        setSelectedPayment(payment);
        try {
            const response = await fetch(`/api/method/rndopsapp.rndopsapp.commitPayment.get_account_head_payment_fields?doc_name=${payment.name}`);
            const result = await response.json();
            if (result?.message) {
                const { fields, prefill_data, link_options } = result.message;
                setPaymentFieldDefs(fields || []);
                setPaymentLinkOptions(link_options || {});
                setPaymentFormData({
                    ...prefill_data,
                    name: payment.name,
                    project_ref_number: payment.project_ref_number,
                    payment_amount: payment.payment_amount,
                    budget_head: payment.budget_head,
                    payment_bmr: payment.payment_bmr,
                    payment_date: payment.payment_date,
                    payment_particular: payment.payment_particular,
                    payment_status: payment.payment_status,
                });
            }
            setPaymentModalOpen(true);
        } catch (err) {
            console.error('Failed to fetch payment fields:', err);
            alert('Failed to load payment form. Please try again.');
        }
    }, []);

    const handlePaymentFieldChange = (fieldname: string, value: any) => {
        setPaymentFormData(prev => ({ ...prev, [fieldname]: value }));
    };

    const handleSubmitPayment = useCallback(async () => {
        if (!selectedPayment) return;
        setIsPaymentSubmitting(true);
        try {
            const response = await fetch('/api/method/rndopsapp.rndopsapp.doctype.accountheadpayment.accountheadpayment.submit_payment_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    doctype: 'AccountHeadPayment',
                    name: selectedPayment.name,
                    ...paymentFormData
                })
            });
            const result = await response.json();
            if (result.exc || result.exception) {
                throw new Error(result.exc || result.exception);
            }
            setPaymentModalOpen(false);
            setSelectedPayment(null);
            setPaymentFormData({});
            fetchPayments(); // Refresh list
            alert('Payment updated successfully!');
        } catch (err: any) {
            console.error('Payment submission failed:', err);
            alert('Failed to submit payment: ' + (err.message || 'Unknown error'));
        } finally {
            setIsPaymentSubmitting(false);
        }
    }, [selectedPayment, paymentFormData, fetchPayments]);

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <FrappeCard className="p-8 text-center">
                    <FaExclamationCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-black mb-2">Error Loading Payments</h2>
                    <p className="text-gray-900">{error}</p>
                    <FrappeButton variant="primary" onClick={fetchPayments} className="mt-4">
                        Retry
                    </FrappeButton>
                </FrappeCard>
            </div>
        );
    }

    const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 0;
    const totalCount = filteredPayments.length;
    const currentCount = paginatedPayments.length;
    const indexOfFirstPayment = (currentPage - 1) * itemsPerPage;

    return (
        <div className="bg-gray-100 min-h-screen">
            <GlobalLoader isLoading={isLoading} />
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                {/* Header */}
                <FrappeCard className="mb-6 p-5">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                            aria-label="Go back"
                        >
                            <FaArrowLeft className="h-5 w-5 text-gray-900" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Payments</h1>
                            <p className="text-sm text-gray-900 mt-0.5">View and manage all payment records.</p>
                        </div>
                    </div>
                </FrappeCard>

                {/* Filter & Search Section */}
                <FrappeCard className="mb-4 p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-1 items-center gap-4 w-full flex-wrap">
                            {/* Search Input */}
                            <div className="relative w-full md:w-64">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaSearch className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search payments..."
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg text-sm focus:outline-none focus:border-gray-900 focus:ring-0 transition-colors"
                                />
                            </div>

                            {/* Doctype/Module Filter */}
                            <div className="flex items-center gap-2">
                                <label htmlFor="doctype-filter" className="font-bold text-black uppercase text-sm whitespace-nowrap hidden md:block">
                                    Module:
                                </label>
                                <select
                                    id="doctype-filter"
                                    value={selectedDoctype}
                                    onChange={(e) => handleDoctypeChange(e.target.value)}
                                    className="h-10 px-4 bg-white border-2 border-gray-400 rounded-lg font-bold text-sm text-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-900"
                                >
                                    <option value="">All Modules</option>
                                    <option value="AccountHeadPayment">AccountHeadPayment</option>
                                    <option value="Fund Received">Fund Received</option>
                                    <option value="Reimbursement">Reimbursement</option>
                                    <option value="Fund Sanction">Fund Sanction</option>
                                    <option value="Temporary Advance">Temporary Advance</option>
                                </select>
                            </div>

                            {/* Status Filter */}
                            <div className="flex items-center gap-2">
                                <label htmlFor="status-filter" className="font-bold text-black uppercase text-sm whitespace-nowrap hidden md:block">
                                    Status:
                                </label>
                                <select
                                    id="status-filter"
                                    value={selectedStatus}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    className="h-10 px-4 bg-white border-2 border-gray-400 rounded-lg font-bold text-sm text-black focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-900"
                                >
                                    <option value="">All Status</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="PAID">Paid</option>
                                    <option value="REJECTED">Rejected</option>
                                    <option value="RECTIFICATION">Rectification</option>
                                </select>
                            </div>

                            {/* Clear Filters Button */}
                            {(selectedStatus || selectedDoctype) && (
                                <FrappeButton
                                    onClick={() => {
                                        handleStatusChange('');
                                        handleDoctypeChange('');
                                    }}
                                    className="text-red-600 hover:bg-red-50 border border-red-200"
                                >
                                    Clear Filters
                                </FrappeButton>
                            )}
                        </div>

                        <div className="text-sm text-gray-900 font-bold whitespace-nowrap">
                            Total: {totalCount} payments
                        </div>
                    </div>
                </FrappeCard>

                {/* Table */}
                <FrappeCard className="overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-300">
                            <thead className="bg-gray-200">
                                <tr className="divide-x divide-gray-300">
                                    <th className="p-3 text-left font-bold text-black text-sm">Status</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Module</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Title</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Project Number</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Date</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Owner</th>
                                    <th className="p-3 text-left font-bold text-black text-sm">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {paginatedPayments.length > 0 ? (
                                    paginatedPayments.map((payment) => (
                                        <tr
                                            key={payment.name}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                        >
                                            <td className="p-4">
                                                <span className={getStatusBadge(payment.payment_status)}>
                                                    {payment.payment_status}
                                                </span>
                                            </td>
                                            <td className="p-4 font-bold text-black text-sm">
                                                {payment.doctype || 'AccountHeadPayment'}
                                            </td>
                                            <td className="p-4 font-medium text-gray-900 text-sm">
                                                {payment.payment_particular?.length > 30
                                                    ? `${payment.payment_particular.substring(0, 30)}...`
                                                    : payment.payment_particular || '-'}
                                            </td>
                                            <td className="p-4 text-sm font-mono text-gray-900">
                                                {payment.project_ref_number?.length > 25
                                                    ? `${payment.project_ref_number.substring(0, 25)}...`
                                                    : payment.project_ref_number || '-'}
                                            </td>
                                            <td className="p-4 text-sm font-mono text-gray-900">
                                                {payment.payment_date
                                                    ? new Date(payment.payment_date).toLocaleDateString("en-IN")
                                                    : "-"}
                                            </td>
                                            <td className="p-4 text-sm text-gray-900">
                                                {payment.owner?.length > 20
                                                    ? `${payment.owner.substring(0, 20)}...`
                                                    : payment.owner || '-'}
                                            </td>
                                            <td className="p-4">
                                                <FrappeButton
                                                    variant="action"
                                                    onClick={(e) => {
                                                        e?.stopPropagation();
                                                        openPaymentModal(payment);
                                                    }}
                                                    className="text-xs px-4 py-2"
                                                >
                                                    Payment
                                                </FrappeButton>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="p-8 text-center text-gray-900 font-bold">
                                            {isLoading ? "Loading payments..." : "No payments found matching your criteria."}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {payments.length > 0 && (
                        <div className="p-4 border-t border-gray-300 bg-gray-50 flex justify-between items-center">
                            <div>
                                <div className="text-sm text-gray-900 font-medium">
                                    Showing {indexOfFirstPayment + 1} to {indexOfFirstPayment + currentCount} of {totalCount} entries
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <FrappeButton
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    variant="outline"
                                >
                                    Previous
                                </FrappeButton>
                                {getPageNumbers().map((page, index) => (
                                    <FrappeButton
                                        key={index}
                                        onClick={() => typeof page === 'number' && handlePageChange(page)}
                                        disabled={typeof page !== 'number'}
                                        variant={page === currentPage ? "primary" : "outline"}
                                        className={cn(typeof page !== 'number' && "cursor-default")}
                                    >
                                        {page}
                                    </FrappeButton>
                                ))}
                                <FrappeButton
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage === totalPages}
                                    variant="outline"
                                >
                                    Next
                                </FrappeButton>
                            </div>
                        </div>
                    )}
                </FrappeCard>
            </main>

            {/* Payment Form Modal */}
            {paymentModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setPaymentModalOpen(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Process Payment</h2>
                                <p className="text-sm text-gray-600 mt-0.5">Update payment details</p>
                            </div>
                            <button onClick={() => setPaymentModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-gray-600" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-auto p-6 space-y-4">
                            {paymentFieldDefs.filter((f: any) => !f.hidden).map((field: any) => {
                                const value = paymentFormData[field.fieldname] || '';
                                const options = paymentLinkOptions[field.fieldname] || [];

                                if (field.fieldtype === 'Section Break') {
                                    return (
                                        <div key={field.fieldname} className="pt-4 border-t border-gray-200 first:border-0 first:pt-0">
                                            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{field.label}</h3>
                                        </div>
                                    );
                                }

                                return (
                                    <div key={field.fieldname}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {field.label} {field.mandatory ? <span className="text-red-500">*</span> : ''}
                                        </label>

                                        {(field.fieldtype === 'Select' || field.fieldtype === 'Link') ? (
                                            <select
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
                                                value={value}
                                                onChange={(e) => handlePaymentFieldChange(field.fieldname, e.target.value)}
                                                disabled={field.read_only}
                                            >
                                                <option value="">Select {field.label}...</option>
                                                {options.map((opt: any) => (
                                                    <option key={opt.value} value={opt.value}>
                                                        {opt.label || opt.value}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : field.fieldtype === 'Date' ? (
                                            <input
                                                type="date"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
                                                value={value}
                                                onChange={(e) => handlePaymentFieldChange(field.fieldname, e.target.value)}
                                                disabled={field.read_only}
                                            />
                                        ) : field.fieldtype === 'Currency' ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
                                                value={value}
                                                onChange={(e) => handlePaymentFieldChange(field.fieldname, parseFloat(e.target.value) || 0)}
                                                disabled={field.read_only}
                                                placeholder="0.00"
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4]"
                                                value={value}
                                                onChange={(e) => handlePaymentFieldChange(field.fieldname, e.target.value)}
                                                disabled={field.read_only}
                                                placeholder={field.description || ''}
                                            />
                                        )}
                                        {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
                                    </div>
                                );
                            })}

                            {/* Payment Info */}
                            {selectedPayment && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <h4 className="text-sm font-semibold text-blue-800 mb-2">Payment Details</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-blue-600">Document:</span> <span className="text-blue-900 font-mono">{selectedPayment.name}</span></div>
                                        <div><span className="text-blue-600">Amount:</span> <span className="font-bold text-blue-900">₹{selectedPayment.payment_amount?.toLocaleString('en-IN')}</span></div>
                                        <div><span className="text-blue-600">BMR:</span> <span className="text-blue-900">{selectedPayment.payment_bmr || '-'}</span></div>
                                        <div><span className="text-blue-600">Status:</span> <span className="text-blue-900">{selectedPayment.payment_status || '-'}</span></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setPaymentModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitPayment}
                                disabled={isPaymentSubmitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#0EA5A4] rounded-lg hover:bg-[#0D9494] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPaymentSubmitting ? 'Submitting...' : 'Submit Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Payments;
