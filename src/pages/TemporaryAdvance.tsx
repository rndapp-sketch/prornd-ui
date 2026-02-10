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
    depends_on?: string | null;
    mandatory_depends_on?: string | null;
    read_only_depends_on?: string | null;
    depends_on_eval?: string | null;
    mandatory_depends_on_eval?: string | null;
    read_only_depends_on_eval?: string | null;
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

// --- HELPER FUNCTION: evaluateDependsOn ---
const evaluateDependsOn = (expression: string | null | undefined, doc: any): boolean => {
    if (!expression) return true;
    try {
        // Handle "eval:" prefix if present
        const cleanExpression = expression.startsWith('eval:') ? expression.substring(5) : expression;
        // eslint-disable-next-line no-new-func
        const result = new Function('doc', `return ${cleanExpression}`)(doc);
        return !!result;
    } catch (e) {
        console.warn('Error evaluating depends_on:', expression, e);
        return false; // Default to false (hidden) on error
    }
};

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
                    <label className="flex items-start gap-3 mt-4 cursor-pointer">
                        <input
                            type="checkbox"
                            id={field.fieldname}
                            name={field.fieldname}
                            checked={!!value}
                            onChange={(e) => onChange(field.fieldname, e.target.checked ? 1 : 0)}
                            disabled={field.read_only === 1}
                            className="mt-1 w-5 h-5 rounded border-gray-300 text-[#0EA5A4] focus:ring-[#0EA5A4]"
                        />
                        <span className="text-gray-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: field.description || field.label || '' }} />
                    </label>
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

    if (field.fieldtype === 'Check') {
        return renderInput();
    }

    return (
        <div className='space-y-2'>
            <label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">
                {field.label}{field.mandatory === 1 && <span className="text-red-500">*</span>}
            </label>
            {renderInput()}
            {field.description && field.fieldtype !== 'Check' && (
                <p className="text-sm text-gray-600 mt-1">{field.description}</p>
            )}
        </div>
    );
});

// --- REUSABLE UI COMPONENTS ---
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
            const initForm = async () => {
                const { fields: apiFields, link_options, prefill_data } = result.message;

                console.log('=== TEMPORARY ADVANCE FORM DATA ===');
                console.log('API Result:', result);

                if (Array.isArray(apiFields)) {
                    // Initialize form data with defaults
                    const initialData: Record<string, any> = { ...prefill_data };

                    // Default 'applying_for_select' to 'No' if not set
                    if (!initialData.applying_for_select) {
                        initialData.applying_for_select = 'No';
                    }

                    apiFields.forEach(field => {
                        // Check if prefill data exists for this field
                        if (prefill_data?.[field.fieldname] !== undefined) {
                            initialData[field.fieldname] = prefill_data[field.fieldname];
                        } else if (field.default !== undefined && initialData[field.fieldname] === undefined) {
                            initialData[field.fieldname] = field.default;
                        }
                    });

                    // Set project if passed via URL
                    if (projectName && !initialData.project_code) {
                        initialData.project_code = projectName;
                    }

                    // CRITICAL: If applicant_webmail is present (e.g. from prefill), fetch and populate details
                    if (initialData.applicant_webmail) {
                        try {
                            console.log('Fetching initial user details for:', initialData.applicant_webmail);
                            const userRes = await fetchUserDetails({ user_email: initialData.applicant_webmail });
                            if (userRes?.message) {
                                const details = userRes.message;
                                initialData.applicant_department = details.department_name || '';
                                initialData.applicant_designation = details.designation_name || '';
                                initialData.applicant_category = details.empclass || '';
                            }
                        } catch (e) {
                            console.error("Failed to fetch initial user details", e);
                        }
                    }

                    setFields(apiFields);
                    setFormData(initialData);

                } else {
                    console.error("API did not return a valid 'fields' array.");
                }

                setLinkOptions(prev => ({ ...prev, ...(link_options || {}) }));
                setDataLoaded(true);
                setLoading(false);
            };

            initForm();
        }
        if (error) {
            console.error("Failed to load form data:", error);
            alert("Failed to load form data.");
            setLoading(false);
        }
    }, [result, error, projectName, dataLoaded, fetchUserDetails]);

    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => {
            let updated = { ...prev, [fieldname]: value };

            // Handle "Applying For" logic
            if (fieldname === 'applying_for_select') {
                if (value === 'No') {
                    // Applying for Self: Fetch Logged-in User details (which is usually prefilled in applicant_webmail)
                    // We trigger a re-fetch or reset based on initial prefill if available, or current user
                    // For simplicity, we assume the initial 'applicant_webmail' was the current user.
                    // Ideally we should call populate_self_details here.
                    // Let's call a side effect handler.
                } else {
                    // Applying for Someone: Clear Applicant fields
                    updated.applicant_category = '';
                    updated.applicant_department = '';
                    updated.applicant_designation = '';
                    updated.applicant_webmail = '';
                }
            }
            return updated;
        });

        // Trigger Side Effects after state update (using a separate effect or direct call)
        if (fieldname === 'applying_for_select') {
            if (value === 'No') {
                // Re-populate self details if we had them or fetch them
                // For now, we can rely on the user re-selecting or just existing data if not cleared
                // Better: Fetch current user details again
                fetchUserDetails({ user_email: 'self' }).then(r => { // 'self' or empty to imply current user? API needs to support it or we use session user
                    // The API `get_user_details` expects `user_email`. 
                    // We can use the initial prefill data for current user email if available.
                    // check result.message.prefill_data.applicant_webmail from state? 
                    // We don't have easy access to it here without refetching or storing it separately.
                    // Let's assume the user selects 'No' and we trigger self-pop logic.
                    // For now, let's just clear if 'Yes', and if 'No' and empty, user might need to fill or we handle it.
                });
            }
        }

    }, [fetchUserDetails]);

    // Handle webmail selection and auto-fill user details (Logic for both Self and Other)
    const handleWebmailChange = async (fieldname: string, value: string, prefix: string) => {
        // Update the field value first
        setFormData(prev => ({ ...prev, [fieldname]: value }));

        if (value) {
            try {
                console.log('Fetching user details for:', value);
                const response = await fetchUserDetails({ user_email: value });
                console.log('User Details API Response:', response);

                if (response?.message) {
                    const userDetails = response.message;
                    console.log('User Details:', userDetails);

                    setFormData(prev => {
                        const updated = {
                            ...prev,
                            [fieldname]: value,
                            [`${prefix}_department`]: userDetails.department_name || '',
                            [`${prefix}_designation`]: userDetails.designation_name || '',
                        };

                        // CRITICAL: Set 'applicant_category' based on the person we are applying for
                        // If applying for OTHER (advance_for_id), we set 'other_applicant_category' AND 'applicant_category'
                        if (prefix === 'advance_for') {
                            updated['other_applicant_category'] = userDetails.empclass || '';
                            updated['applicant_category'] = userDetails.empclass || ''; // Workflow uses this
                        }
                        // If applying for SELF (applicant_webmail), we set 'applicant_category'
                        else if (prefix === 'applicant') {
                            updated['applicant_category'] = userDetails.empclass || '';
                        }

                        return updated;
                    });
                }
            } catch (err) {
                console.error('Error fetching user details:', err);
            }
        }
    };

    // Effect to handle "Self" selection specifically (Reset to self details)
    useEffect(() => {
        if (formData.applying_for_select === 'No' && !formData.applicant_webmail && dataLoaded) {
            // If "No" is selected and no webmail, try to populate current user
            // We can use the prefilled data if we stored it, or fetch again. 
            // Since we don't have the session user explicitly separate check, let's assume prefill was correct.
            // If the user clears it, they can re-select. 
            if (result?.message?.prefill_data?.applicant_webmail) {
                handleWebmailChange('applicant_webmail', result.message.prefill_data.applicant_webmail, 'applicant');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.applying_for_select, dataLoaded]);


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;

        // Validations
        if (!formData.declaration_settlement) {
            alert("You must agree to the 45-day settlement rule.");
            return;
        }
        if (!formData.declaration_rate_contract) {
            alert("You must agree to the Rate Contract declaration.");
            return;
        }

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

        // Special logic: First group might not have a section break
        // We accumulate fields until we hit a Section Break
        let initialFields: Field[] = [];
        let hasStartedSections = false;

        fields.forEach(field => {
            // EVALUATE DEPENDS_ON LOGIC ---
            let isVisible = true;

            // Check depends_on_eval first (stronger)
            if (field.depends_on_eval) {
                isVisible = evaluateDependsOn(field.depends_on_eval, formData);
            }
            // Then check depends_on
            else if (field.depends_on) {
                isVisible = evaluateDependsOn(field.depends_on, formData);
            }

            // Handle hidden prop
            if (field.hidden) isVisible = false;

            // Always process Section Breaks to structure the form, but hide them if condition fails
            if (field.fieldtype === 'Section Break') {
                hasStartedSections = true;

                // If previous section exists, push it
                if (currentSection) {
                    sections.push(currentSection);
                }

                // Start new section
                currentSection = {
                    title: field.label || 'Details',
                    fields: []
                };

                // If the Section Break itself is hidden, we mark the whole section as effectively hidden 
                // (we can use a flag on the section object or just not add fields to it if we want strict hiding logic)
                // But typically, if section break is hidden, the fields under it might still be relevant if they don't have their own logic?
                // No, usually "Section Break depends_on" hides the whole section content.
                // let's attach a 'hidden' property to the section
                (currentSection as any).hidden = !isVisible;
            } else {
                // Regular Field
                if (!hasStartedSections) {
                    if (isVisible) initialFields.push(field);
                } else {
                    if (currentSection) {
                        // Only add field if the section itself is not hidden (cascading visibility)
                        //  OR if we interpret section visibility as just the header. 
                        // Frappe standard: if section is hidden, children are hidden.
                        if (!(currentSection as any).hidden && isVisible) {
                            currentSection.fields.push(field);
                        }
                    }
                }
            }
        });

        if (currentSection) {
            sections.push(currentSection);
        }

        // Add initial fields as a section if any
        if (initialFields.length > 0) {
            sections.unshift({
                title: 'Application Details',
                fields: initialFields
            });
        }

        return sections.filter(s => !(s as any).hidden && s.fields.length > 0); // Filter out empty or hidden sections
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

                                        // Evaluate read_only dependencies
                                        let isReadOnly = field.read_only === 1;
                                        if (field.read_only_depends_on || field.read_only_depends_on_eval) {
                                            const roExpr = field.read_only_depends_on_eval || field.read_only_depends_on;
                                            if (evaluateDependsOn(roExpr, formData)) {
                                                isReadOnly = true;
                                            }
                                        }

                                        // Evaluate mandatory dependencies
                                        let isMandatory = field.mandatory === 1;
                                        if (field.mandatory_depends_on || field.mandatory_depends_on_eval) {
                                            const mExpr = field.mandatory_depends_on_eval || field.mandatory_depends_on;
                                            if (evaluateDependsOn(mExpr, formData)) {
                                                isMandatory = true;
                                            }
                                        }

                                        // Apply dynamic properties to field object
                                        const effectiveField = {
                                            ...field,
                                            read_only: isReadOnly ? 1 : 0,
                                            mandatory: isMandatory ? 1 : 0
                                        };

                                        // Determine if this field has link options
                                        const autoFillOnlyFields = ['advance_for_department', 'applicant_department', 'advance_for_designation', 'applicant_designation'];
                                        const isAutoFillOnly = autoFillOnlyFields.includes(field.fieldname);
                                        const hasLinkOpts = !isAutoFillOnly && linkOptions[field.fieldname] && linkOptions[field.fieldname].length > 0;
                                        const isWebmail = field.fieldname === 'advance_for_id' || field.fieldname === 'applicant_webmail';
                                        const prefix = field.fieldname === 'advance_for_id' ? 'advance_for' : 'applicant';

                                        return (
                                            <MemoizedFormField
                                                key={field.fieldname}
                                                field={effectiveField}
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
