
// -=-=-=-=-=-=
import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from "lucide-react";

// --- TYPE DEFINITIONS ---
interface Field {
    description: any;
    fieldname: string;
    label: string | null;
    fieldtype: string;
    mandatory: number;
    read_only: number;
    hidden: number;
    options?: string | null;
    default?: any;
}
interface LinkOption {
    value: string;
    label: string;
}
interface FormDataResponse {
    message: {
        fields: Field[];
        link_options: { [key: string]: LinkOption[] };
        prefill_data: { [key: string]: any };
    }
}

// --- STYLES ---
const inputClasses = "w-full h-12 px-4 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.25)] focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-100";

// --- MEMOIZED FORM FIELD COMPONENT ---
const MemoizedFormField = memo(({
    field,
    value,
    linkOptions,
    onChange,
    onWebmailChange,
    hasLinkOptions,
    isWebmailField,
    webmailPrefix
}: {
    field: Field;
    value: any;
    linkOptions: LinkOption[];
    onChange: (fieldname: string, value: any) => void;
    onWebmailChange: (fieldname: string, value: string, prefix: string) => void;
    hasLinkOptions: boolean;
    isWebmailField: boolean;
    webmailPrefix: string;
}) => {
    if (!field || field.hidden || field.fieldtype === 'Section Break' || field.fieldtype === 'HTML') return null;
    if (!field.label) return null;

    const commonSelectProps = {
        id: field.fieldname,
        name: field.fieldname,
        className: inputClasses,
        required: field.mandatory === 1,
        disabled: field.read_only === 1,
        value: value || '',
    };

    const commonInputProps = {
        id: field.fieldname,
        name: field.fieldname,
        className: inputClasses,
        readOnly: field.read_only === 1,
        required: field.mandatory === 1,
        disabled: field.read_only === 1,
        value: value || '',
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            onChange(field.fieldname, e.target.value)
    };

    const renderInput = () => {
        // If field has link_options, render as dropdown
        if (hasLinkOptions) {
            return (
                <select
                    {...commonSelectProps}
                    onChange={(e) => {
                        if (isWebmailField) {
                            onWebmailChange(field.fieldname, e.target.value, webmailPrefix);
                        } else {
                            onChange(field.fieldname, e.target.value);
                        }
                    }}
                >
                    <option value="">Select...</option>
                    {linkOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {isWebmailField ? `${opt.label} (${opt.value})` : opt.label}
                        </option>
                    ))}
                </select>
            );
        }

        switch (field.fieldtype) {
            case "Link":
                return (
                    <select {...commonSelectProps} onChange={(e) => onChange(field.fieldname, e.target.value)}>
                        <option value="">Select...</option>
                        {linkOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );
            case "Select":
                const selectOpts = field.options?.split('\n').filter(o => o).map(o => ({ value: o, label: o })) || [];
                return (
                    <select {...commonSelectProps} onChange={(e) => onChange(field.fieldname, e.target.value)}>
                        <option value="">Select...</option>
                        {selectOpts.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                );
            case "Currency":
            case "Float":
                return <input type="number" step="0.01" {...commonInputProps} />;
            case "Int":
                return <input type="number" {...commonInputProps} />;
            case "Date":
                return <input type="date" {...commonInputProps} />;
            case "Text":
            case "Small Text":
                return <textarea {...commonInputProps} rows={4} className={`${inputClasses} h-auto py-3`} />;
            case "Check":
                return (
                    <input
                        type="checkbox"
                        id={field.fieldname}
                        name={field.fieldname}
                        checked={!!value}
                        onChange={(e) => onChange(field.fieldname, e.target.checked ? 1 : 0)}
                        disabled={field.read_only === 1}
                        className="w-5 h-5 rounded border-gray-300"
                    />
                );
            case "Attach":
                return (
                    <input
                        type="file"
                        id={field.fieldname}
                        name={field.fieldname}
                        className={`${inputClasses} py-2`}
                        disabled={field.read_only === 1}
                    />
                );
            case "Data":
            default:
                return <input type="text" {...commonInputProps} />;
        }
    };

    return (
        <div className='space-y-2'>
            <label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">
                {field.label}{field.mandatory === 1 && <span className="text-red-500">*</span>}
            </label>
            {renderInput()}
            {field.description && (
                <p className="text-sm text-gray-600 mt-1">{field.description}</p>
            )}
        </div>
    );
});

// --- REUSABLE UI COMPONENTS (defined outside to prevent recreation on each render) ---
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white p-6 md:p-8 border border-gray-200 rounded-xl shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit"
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "px-5 py-2.5 border border-gray-200 rounded-lg font-semibold text-gray-700 bg-white shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed",
            className
        )}
    >
        {children}
    </button>
);

const NeoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-800 border-b border-gray-200 pb-3">{title}</h2>
        {children}
    </div>
);

const TemporaryAdvance: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectName = searchParams.get('project') || '';

    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);

    const { call: fetchFormData, result, error } = useFrappePostCall<FormDataResponse>(
        'rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.get_temporary_advance_fields'
    );
    const { call: submitForm, error: submitError } = useFrappePostCall(
        'rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.save_temporary_advance'
    );
    const { call: fetchUserDetails } = useFrappePostCall<{ message: any }>(
        'rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.get_user_details'
    );

    // Initial data fetch - only run once
    useEffect(() => {
        if (!dataLoaded) {
            fetchFormData({ project_name: projectName });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectName]);

    useEffect(() => {
        // Only process result once when data is first loaded
        if (result?.message && !dataLoaded) {
            const { fields: apiFields, link_options, prefill_data } = result.message;

            // Debug logging
            console.log('=== TEMPORARY ADVANCE FORM DATA ===');
            console.log('API Result:', result);
            console.log('Fields:', apiFields);
            console.log('Link Options:', link_options);
            console.log('Prefill Data:', prefill_data);

            if (Array.isArray(apiFields)) {
                // Process fields with prefill data
                const processedFields = apiFields.map(field => {
                    if (field.fieldtype === 'Section Break') {
                        return field;
                    }
                    if (prefill_data?.[field.fieldname] !== undefined) {
                        return { ...field, default: prefill_data[field.fieldname] };
                    }
                    return field;
                });

                setFields(processedFields);

                // Initialize form data with defaults
                const initialData: Record<string, any> = { ...prefill_data };
                processedFields.forEach(field => {
                    if (field.default !== undefined && initialData[field.fieldname] === undefined) {
                        initialData[field.fieldname] = field.default;
                    }
                });
                // Set project if passed via URL
                if (projectName && !initialData.project_code) {
                    initialData.project_code = projectName;
                }
                setFormData(initialData);
            } else {
                console.error("API did not return a valid 'fields' array.");
            }

            setLinkOptions(prev => ({ ...prev, ...(link_options || {}) }));
            setDataLoaded(true);
            setLoading(false);
        }
        if (error) {
            console.error("Failed to load form data:", error);
            alert("Failed to load form data.");
            setLoading(false);
        }
    }, [result, error, projectName, dataLoaded]);

    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    // Handle webmail selection and auto-fill user details
    const handleWebmailChange = async (fieldname: string, value: string, prefix: string) => {
        handleChange(fieldname, value);

        if (value) {
            try {
                console.log('Fetching user details for:', value);
                const response = await fetchUserDetails({ user_email: value });
                console.log('User Details API Response:', response);

                if (response?.message) {
                    const userDetails = response.message;
                    console.log('User Details:', userDetails);

                    // Auto-fill the corresponding department and designation fields
                    // Using department_name and designation_name directly (text fields)
                    setFormData(prev => ({
                        ...prev,
                        [fieldname]: value,
                        [`${prefix}_department`]: userDetails.department_name || '',
                        [`${prefix}_designation`]: userDetails.designation_name || '',
                    }));
                }
            } catch (err) {
                console.error('Error fetching user details:', err);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const dataToSubmit = { ...formData };
            console.log('Submitting data:', dataToSubmit);

            const result = await submitForm({ doc_data: JSON.stringify(dataToSubmit) });
            console.log('Submission result:', result);

            alert("Temporary Advance entry saved successfully!");
            navigate(-1);
        } catch (err: any) {
            console.error('Submission error:', submitError || err);
            alert(`Submission Failed: ${err.message || 'Unknown Error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Render HTML field content
    const renderHtmlField = (field: Field) => {
        if (field.fieldtype !== 'HTML' || !field.options) return null;
        return (
            <div key={field.fieldname} className="col-span-full">
                <div
                    className="text-sm text-gray-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: field.options }}
                />
            </div>
        );
    };

    // Group fields by section based on section breaks
    const groupFieldsBySection = () => {
        const sections: { title: string; fields: Field[] }[] = [];
        let currentSection: { title: string; fields: Field[] } | null = null;

        fields.forEach(field => {
            if (field.fieldtype === 'Section Break') {
                if (currentSection) {
                    sections.push(currentSection);
                }
                currentSection = {
                    title: field.label || 'Details',
                    fields: []
                };
            } else if (currentSection && !field.hidden) {
                currentSection.fields.push(field);
            } else if (!currentSection && !field.hidden) {
                // Fields before first section break
                currentSection = { title: 'Advance Details', fields: [field] };
            }
        });

        if (currentSection) {
            sections.push(currentSection);
        }

        // If no sections found, create a default one
        if (sections.length === 0 && fields.length > 0) {
            sections.push({
                title: 'Advance Details',
                fields: fields.filter(f => !f.hidden && f.fieldtype !== 'Section Break')
            });
        }

        return sections;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b border-gray-200 mx-auto"></div>
                    <p className="mt-4 text-lg font-semibold">Loading form data...</p>
                </div>
            </div>
        );
    }

    const sections = groupFieldsBySection();

    return (
        <div className="bg-[#F0F4F8] min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8">
                <header className="mb-8 p-6 bg-white border border-gray-200 rounded-md shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 active:translate-y-1 transition-transform"
                        >
                            <ArrowLeftIcon className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-bold text-black">Temporary Advance Application</h1>
                            {projectName && (
                                <p className="text-gray-700 mt-1">
                                    For Project: <strong>{projectName}</strong>
                                </p>
                            )}
                        </div>
                    </div>
                </header>

                <form onSubmit={handleSubmit}>
                    <FrappeCard className="space-y-12">
                        {sections.map((section, index) => (
                            <NeoSection key={index} title={section.title}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {section.fields.map(field => {
                                        if (field.fieldtype === 'HTML') {
                                            return renderHtmlField(field);
                                        }

                                        // Determine if this field has link options
                                        const autoFillOnlyFields = ['advance_for_department', 'applicant_department', 'advance_for_designation', 'applicant_designation'];
                                        const isAutoFillOnly = autoFillOnlyFields.includes(field.fieldname);
                                        const hasLinkOpts = !isAutoFillOnly && linkOptions[field.fieldname] && linkOptions[field.fieldname].length > 0;
                                        const isWebmail = field.fieldname === 'advance_for_id' || field.fieldname === 'applicant_webmail';
                                        const prefix = field.fieldname === 'advance_for_id' ? 'advance_for' : 'applicant';

                                        return (
                                            <MemoizedFormField
                                                key={field.fieldname}
                                                field={field}
                                                value={formData[field.fieldname]}
                                                linkOptions={linkOptions[field.fieldname] || linkOptions[field.options || ''] || []}
                                                onChange={handleChange}
                                                onWebmailChange={handleWebmailChange}
                                                hasLinkOptions={hasLinkOpts}
                                                isWebmailField={isWebmail}
                                                webmailPrefix={prefix}
                                            />
                                        );
                                    })}
                                </div>
                            </NeoSection>
                        ))}
                    </FrappeCard>

                    {/* Submit Button */}
                    <div className="mt-8 flex justify-end gap-4">
                        <FrappeButton
                            type="button"
                            onClick={() => navigate(-1)}
                            className="bg-gray-200 hover:bg-gray-300"
                        >
                            Cancel
                        </FrappeButton>
                        <FrappeButton
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-green-300 hover:bg-green-400 disabled:bg-gray-300"
                        >
                            {isSubmitting ? 'Saving...' : 'Submit Temporary Advance'}
                        </FrappeButton>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default TemporaryAdvance;
