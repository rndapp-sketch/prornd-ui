import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, FileText, Calendar, MapPin, User, Building, Download, ExternalLink } from 'lucide-react';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { travelAPI } from '@/services/apiService';
import TravelActionButtons from '@/components/TravelActionButtons';
import { getStateBadgeStyle } from '@/utils/workflowUtils';

// --- TYPE DEFINITIONS ---
interface TravelDoc {
    name: string;
    workflow_state: string;
    docstatus: number;
    applicant_name_travel?: string;
    webmail_id_travel?: string;
    travel_project_title?: string;
    from_date?: string;
    to_date?: string;
    destination?: string;
    nature_of_travel?: string;
    [key: string]: any;
}

interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
    };
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white p-6 md:p-8 border border-gray-200 rounded-xl shadow-sm", className)}>
        {children}
    </div>
);

// --- STATUS BADGE COMPONENT (DYNAMIC) ---
const StatusBadge = ({ status }: { status: string }) => {
    return (
        <span className={cn(
            "px-3 py-1 rounded-full text-sm font-medium border",
            getStateBadgeStyle(status)
        )}>
            {status || 'Draft'}
        </span>
    );
};


// --- MAIN COMPONENT ---
const TravelDetails: React.FC = () => {
    const navigate = useNavigate();
    const { docName } = useParams<{ docName: string }>();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>(travelAPI.getFields);
    const { call: fetchDocument } = useFrappePostCall<{ message: TravelDoc }>('frappe.client.get');

    // --- DATA FETCHING ---
    useEffect(() => {
        if (docName) {
            fetchFormData({ doc_name: docName });
        }
    }, [docName, refreshKey]);

    useEffect(() => {
        const loadDocument = async () => {
            if (formDataResult?.message && docName) {
                const { fields: apiFields, link_options } = formDataResult.message;
                setFields(apiFields || []);
                setLinkOptions(link_options || {});

                try {
                    const doc = await fetchDocument({
                        doctype: 'Travel',
                        name: docName
                    });

                    if (doc?.message) {
                        setFormData(doc.message);
                    }
                } catch (err) {
                    console.error('Error fetching document:', err);
                    alert('Failed to load Travel document');
                }

                setLoading(false);
            }
            if (formDataError) {
                console.error("Failed to load form data:", formDataError);
                alert("Error: Could not load the Travel document.");
                setLoading(false);
            }
        };

        loadDocument();
    }, [formDataResult, formDataError, docName, fetchDocument]);

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
        setLoading(true);
    };

    // Placeholder handlers for read-only mode
    const noOp = () => { };
    const noOpFile = () => { };
    const noOpTable = () => { };

    // --- RENDER LOGIC ---
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#0EA5A4] border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-gray-700">Loading document...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#F0F4F8] min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                {/* Header */}
                <header className="mb-8 p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <ArrowLeftIcon className="h-5 w-5 text-gray-900" />
                            </button>
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-gray-900">Travel: {docName}</h1>
                                    <StatusBadge status={formData.workflow_state} />
                                </div>
                                <p className="text-gray-600 mt-1">
                                    {formData.applicant_name_travel && (
                                        <span className="flex items-center gap-2">
                                            <User className="h-4 w-4" />
                                            {formData.applicant_name_travel}
                                            {formData.travel_project_title && ` • ${formData.travel_project_title}`}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <TravelActionButtons
                            docName={docName || ''}
                            onActionComplete={handleRefresh}
                        />
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Main Content - 3 columns */}
                    <div className="lg:col-span-3">
                        <FrappeCard className="space-y-8">
                            <DynamicFormRenderer
                                fields={fields}
                                formData={formData}
                                linkOptions={linkOptions}
                                onChange={noOp}
                                onFileChange={noOpFile}
                                onTableRowChange={noOpTable}
                                onTableFileChange={noOpTable}
                                onAddTableRow={noOp}
                                onDeleteTableRow={noOp}
                                readOnly={true}
                            />
                        </FrappeCard>
                    </div>

                    {/* Sidebar - 1 column */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Quick Info Card */}
                        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 p-6 rounded-xl border border-teal-100">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-teal-600" />
                                Travel Summary
                            </h3>
                            <div className="space-y-3 text-sm">
                                {formData.nature_of_travel && (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-gray-500" />
                                        <span className="text-gray-600">{formData.nature_of_travel}</span>
                                    </div>
                                )}
                                {formData.from_date && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-gray-500" />
                                        <span className="text-gray-600">
                                            {formData.from_date} to {formData.to_date}
                                        </span>
                                    </div>
                                )}
                                {formData.destination && (
                                    <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-gray-500" />
                                        <span className="text-gray-600">{formData.destination}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Attachments Card */}
                        {(formData.travel_supporting_docs || formData.travel_attachment) && (
                            <div className="bg-white p-6 rounded-xl border border-gray-200">
                                <h3 className="font-bold text-gray-900 mb-4">Attachments</h3>
                                <div className="space-y-2">
                                    {formData.travel_supporting_docs && (
                                        <a
                                            href={formData.travel_supporting_docs}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
                                        >
                                            <Download className="h-4 w-4" />
                                            Supporting Documents
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                    {formData.travel_attachment && (
                                        <a
                                            href={formData.travel_attachment}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
                                        >
                                            <Download className="h-4 w-4" />
                                            Attachment
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Status History */}
                        <div className="bg-white p-6 rounded-xl border border-gray-200">
                            <h3 className="font-bold text-gray-900 mb-4">Status</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Current State</span>
                                    <StatusBadge status={formData.workflow_state} />
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Doc Status</span>
                                    <span className="font-medium">
                                        {formData.docstatus === 0 ? 'Draft' :
                                            formData.docstatus === 1 ? 'Submitted' : 'Cancelled'}
                                    </span>
                                </div>
                                {formData.modified && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Last Modified</span>
                                        <span className="font-medium">{new Date(formData.modified).toLocaleDateString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TravelDetails;
