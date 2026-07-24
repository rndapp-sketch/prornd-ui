// -=-=-=-=-=-=
import React, { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/common/PageHeader';
import { ToWords } from 'to-words';

// Initialize ToWords converter
const toWords = new ToWords({
    localeCode: 'en-IN',
    converterOptions: {
        ignoreDecimal: false
    }
});

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
const inputClasses = "w-full h-10 px-3 bg-white dark:bg-[#27272A] border-[1.5px] border-[#E4E4E7] dark:border-[#3F3F46] rounded-[0.4375rem] text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] placeholder:text-[#A1A1AA] dark:placeholder:text-[#71717A] focus:outline-none focus:ring-[3px] focus:ring-[#4A6CF7]/12 focus:border-[#4A6CF7] disabled:bg-[#EEECEA] dark:disabled:bg-[#2A2A2E] disabled:text-[#27272A] dark:disabled:text-[#D4D4D8] disabled:border-[#D4D0CA] dark:disabled:border-[#3F3F46] disabled:cursor-default read-only:bg-[#EEECEA] dark:read-only:bg-[#2A2A2E] transition-colors duration-150";

const formatFieldLabel = (label?: string | null, fieldname?: string) => {
    const raw = label || fieldname || "";
    return raw
        .replace(/_/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const FieldLabel = ({ field }: { field: Pick<Field, "fieldname" | "label" | "mandatory"> }) => (
    <label
        htmlFor={field.fieldname}
        className="inline-flex w-fit max-w-full items-center rounded-md bg-white px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#2563EB] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-blue-300 dark:ring-[#3F3F46]"
    >
        <span className="truncate">{formatFieldLabel(field.label, field.fieldname)}</span>
        {field.mandatory === 1 && <span className="ml-1 font-bold normal-case text-red-500">*</span>}
    </label>
);

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
                return (
                    <input
                        type="text"
                        inputMode="decimal"
                        title="Enter a positive amount"
                        {...commonInputProps}
                        onChange={(e) => {
                            const raw = e.target.value;
                            // Allow empty, digits, and a single decimal point
                            if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
                                onChange(field.fieldname, raw);
                            }
                        }}
                    />
                );
            case "Int":
                return <input type="number" min="0" title="Enter a positive whole number" {...commonInputProps} onKeyDown={(e) => { if (["e", "E", "+", "-"].includes(e.key) || /[a-zA-Z]/.test(e.key)) e.preventDefault(); }} />;
            case "Date":
                return <input type="date" {...commonInputProps} />;
            case "Text":
            case "Small Text":
                return <textarea {...commonInputProps} rows={4} className={`${inputClasses} h-auto py-3`} />;
            case "Check":
                return (
                    <label className="flex items-start gap-3 rounded-md border border-[#E4E4E7] bg-white px-3 py-2.5 cursor-pointer dark:border-[#3F3F46] dark:bg-[#27272A]">
                        <input
                            type="checkbox"
                            id={field.fieldname}
                            name={field.fieldname}
                            checked={!!value}
                            onChange={(e) => onChange(field.fieldname, e.target.checked ? 1 : 0)}
                            disabled={field.read_only === 1}
                            className="mt-1 w-5 h-5 rounded border-zinc-300 dark:border-zinc-700 text-[#4A6CF7] focus:ring-[#4A6CF7]"
                        />
                        <span className="text-[#3F3F46] dark:text-[#E4E4E7] text-[13px] font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: field.description || field.label || '' }} />
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
            <FieldLabel field={field} />
            {renderInput()}
            {field.description && field.fieldtype !== 'Check' && (
                <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-1 leading-relaxed">{field.description}</p>
            )}
        </div>
    );
});

// --- REUSABLE UI COMPONENTS ---

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
            "inline-flex h-9 items-center justify-center gap-2 rounded-[0.4375rem] border px-5 text-[12px] font-bold uppercase tracking-wide transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed",
            className
        )}
    >
        {children}
    </button>
);

const NeoSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="border-b border-[#E4E4E7] bg-[#FAFAF9] px-5 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
            <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-[#3F3F46] dark:text-[#E4E4E7]">{title}</h2>
        </div>
        <div className="p-4 sm:p-5">
            {children}
        </div>
    </div>
);

// Resolve project title from a project code/no.
// Tries: (1) fetch by document name, (2) filter by project_no — across both doctypes.
async function resolveProjectTitle(projectCode: string): Promise<string> {
    for (const doctype of ["Project Registration", "Project Proposal"]) {
        // Try fetching by document name (primary key)
        try {
            const r = await fetch(
                `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(projectCode)}`,
                { credentials: "include" }
            );
            if (r.ok) {
                const json = await r.json();
                const title = json?.data?.project_title || json?.data?.title || "";
                if (title && title !== projectCode) return title;
            }
        } catch { /* try next strategy */ }

        // Try querying by project_no field
        try {
            const r = await fetch("/api/method/frappe.client.get_list", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    doctype,
                    filters: { project_no: projectCode },
                    fields: ["project_title"],
                    limit_page_length: 1,
                }),
            });
            if (r.ok) {
                const json = await r.json();
                const title = json?.message?.[0]?.project_title || "";
                if (title) return title;
            }
        } catch { /* try next doctype */ }
    }
    return "";
}

const TemporaryAdvance: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectName = searchParams.get('project') || '';
    const projectTitle = searchParams.get('projectTitle') || '';
    const editDocName = searchParams.get('edit') || '';

    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [draftComment, setDraftComment] = useState("");

    const { call: fetchFormData, result, error } = useFrappePostCall<FormDataResponse>(
        'rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.get_temporary_advance_fields'
    );
    const { call: submitForm, error: submitError } = useFrappePostCall<{ message: { name: string } }>(
        'rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.save_temporary_advance'
    );
    const { call: fetchUserDetails } = useFrappePostCall<{ message: any }>(
        'rndopsapp.rndopsapp.doctype.temporary_advance.temporary_advance.get_user_details'
    );
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>(
        'frappe.client.get'
    );

    // Initial data fetch - only run once
    useEffect(() => {
        if (!dataLoaded) {
            fetchFormData({ doc_name: editDocName || null, project_name: projectName });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectName, editDocName]);

    useEffect(() => {
        // Only process result once when data is first loaded
        if (result?.message && !dataLoaded) {
            const initForm = async () => {
                const { fields: apiFields, link_options, prefill_data } = result.message;

                console.log('=== TEMPORARY ADVANCE FORM DATA ===');
                console.log('API Result:', result);

                if (Array.isArray(apiFields)) {
                    // Initialize form data with defaults
                    let initialData: Record<string, any> = { ...prefill_data };

                    // If editing, fetch existing document data
                    if (editDocName) {
                        try {
                            const existingDoc = await fetchExistingDoc({
                                doctype: 'Temporary Advance',
                                name: editDocName
                            });
                            if (existingDoc?.message) {
                                initialData = { ...initialData, ...existingDoc.message };
                            }
                        } catch (err) {
                            console.error('Error fetching existing document:', err);
                            alert('Failed to load document for editing');
                        }
                    }

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

                    // Set project code from URL if not already set (new form)
                    if (projectName && !initialData.project_code) {
                        initialData.project_code = projectName;
                    }
                    // Keep both fields as plain text (never render as dropdowns)
                    delete link_options.project_code;
                    delete link_options.project_name;

                    // Resolve project title for both new form and edit mode.
                    // Use project_code from the doc (edit) or from the URL param (new).
                    const codeToResolve = initialData.project_code || projectName;
                    if (codeToResolve && (!initialData.project_name || initialData.project_name === codeToResolve)) {
                        const urlTitle = projectTitle && projectTitle !== codeToResolve ? projectTitle : '';
                        if (urlTitle) {
                            initialData.project_name = urlTitle;
                        } else {
                            const fetchedTitle = await resolveProjectTitle(codeToResolve);
                            if (fetchedTitle) initialData.project_name = fetchedTitle;
                        }
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
    }, [result, error, projectName, editDocName, dataLoaded, fetchUserDetails, fetchExistingDoc]);

    const handleChange = useCallback((fieldname: string, value: any) => {
        // When project_code changes, resolve and fill project_name
        if (fieldname === 'project_code') {
            setFormData(prev => ({ ...prev, project_code: value, project_name: '' }));
            if (value) {
                resolveProjectTitle(value).then(title => {
                    if (title) setFormData(prev => ({ ...prev, project_name: title }));
                });
            }
            return;
        }

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

            // Auto-calculate amount in words when amount field changes
            if (fieldname === 'amount' || fieldname === 'amount_applied') {
                const amountValue = parseFloat(value);
                if (!isNaN(amountValue) && amountValue > 0) {
                    updated.amount_in_words = toWords.convert(amountValue);
                } else {
                    updated.amount_in_words = '';
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
                fetchUserDetails({ user_email: 'self' }).then(() => { // 'self' or empty to imply current user? API needs to support it or we use session user
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

    // Fill amount_in_words once when prefilled data loads (handleChange covers live user input)
    useEffect(() => {
        if (!dataLoaded) return;
        const n = parseFloat(formData.amount || formData.amount_applied);
        if (!isNaN(n) && n > 0 && !formData.amount_in_words) {
            setFormData(prev => ({ ...prev, amount_in_words: toWords.convert(n) }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataLoaded]);



    const validateForm = (): string | null => {
        if (!formData.declaration_settlement) return "You must agree to the 45-day settlement rule.";
        if (!formData.declaration_rate_contract) return "You must agree to the Rate Contract declaration.";
        return null;
    };

    const handleSaveAndSubmit = async (comment: string) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setCommentModalOpen(false);
        setDraftComment("");
        try {
            const saveResult = await submitForm({ doc_data: JSON.stringify(formData) });
const msg = saveResult?.message;
            const docname: string =
                (typeof msg === "object" && msg !== null)
                    ? ((msg as any).docname || (msg as any).name || (msg as any).doc_name || "")
                    : (typeof msg === "string" ? msg : "");
            if (!docname) throw new Error(`Could not get document name after save. Raw response: ${JSON.stringify(saveResult)}`);

            // Patch fields the backend save may omit
            const patchFields: Record<string, any> = {};
            if (formData.declaration_settlement !== undefined) patchFields.declaration_settlement = formData.declaration_settlement;
            if (formData.declaration_rate_contract !== undefined) patchFields.declaration_rate_contract = formData.declaration_rate_contract;
            if (formData.amount_in_words) patchFields.amount_in_words = formData.amount_in_words;
            if (Object.keys(patchFields).length > 0) {
                await fetch("/api/method/frappe.client.set_value", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ doctype: "Temporary Advance", name: docname, fieldname: patchFields }),
                });
            }

            const params = new URLSearchParams({ autoSubmit: "1" });
            if (comment.trim()) params.set("comment", comment.trim());
            navigate(`/temporary-advance/${encodeURIComponent(docname)}?${params.toString()}`);
        } catch (err: any) {
            console.error('Submission error:', submitError || err);
            alert(`Save Failed: ${err.message || 'Unknown Error'}`);
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const validationError = validateForm();
        if (validationError) { alert(validationError); return; }
        setCommentModalOpen(true);
    };

    // Render HTML field content
    const renderHtmlField = (field: Field) => {
        if (field.fieldtype !== 'HTML' || !field.options) return null;
        return (
            <div key={field.fieldname} className="col-span-full">
                <div
                    className="text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm max-w-none"
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
            <div className="flex items-center justify-center min-h-screen bg-claude-bg dark:bg-zinc-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b border-zinc-200 dark:border-zinc-800 mx-auto"></div>
                    <p className="mt-4 text-lg font-semibold">Loading form data...</p>
                </div>
            </div>
        );
    }

    const sections = groupFieldsBySection();

    return (
        <div className="min-h-screen bg-[#FAFAF9] font-sans dark:bg-[#18181B]">
            <AppSidebar />
            <main className="flex-1 px-5 py-6 md:px-8 md:py-7">
                <PageHeader
                    title="Temporary Advance Application"
                    projectName={formData.project_name || projectTitle || ''}
                    projectNumber={projectName}
                />

                <form onSubmit={handleSubmit}>
                    <div className="space-y-5">
                        {sections.map((section, index) => (
                            <NeoSection key={index} title={section.title}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-5">
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

                                        // project_code and project_name are always read-only auto-fills
                                        if (field.fieldname === 'project_code' || field.fieldname === 'project_name') {
                                            isReadOnly = true;
                                        }
                                        // project_name renders as a multi-line text area
                                        if (field.fieldname === 'project_name') {
                                            field = { ...field, fieldtype: 'Small Text' };
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
                    </div>

                    {/* Action Button */}
                    <div className="mt-8 flex justify-end gap-3">
                        <FrappeButton
                            type="button"
                            onClick={() => navigate(-1)}
                            className="bg-white text-[#71717A] border-[#E4E4E7] hover:bg-[#FAFAF9] dark:bg-[#27272A] dark:text-[#A1A1AA] dark:border-[#3F3F46]"
                        >
                            Cancel
                        </FrappeButton>
                        <FrappeButton
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-[#D97757] text-white border-[#D97757] hover:bg-[#c5694d] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Temporary Advance'}
                        </FrappeButton>
                    </div>
                </form>

                {/* Comment Modal */}
                {commentModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-md mx-4 overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                                <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">Submit Temporary Advance</h3>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">Optionally add a comment before submitting.</p>
                            </div>
                            <div className="px-6 py-4">
                                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">Comment (optional)</label>
                                <textarea
                                    value={draftComment}
                                    onChange={e => setDraftComment(e.target.value)}
                                    placeholder="Add a note about this draft…"
                                    rows={3}
                                    className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-800 dark:text-zinc-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/40"
                                />
                            </div>
                            <div className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800/60 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-2">
                                <button
                                    onClick={() => { setCommentModalOpen(false); setDraftComment(""); }}
                                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => handleSaveAndSubmit(draftComment)}
                                    className="px-4 py-2 text-xs font-bold rounded-lg bg-[#D97757] text-white hover:bg-[#c5694d] transition-colors"
                                >
                                    Submit
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default TemporaryAdvance;
