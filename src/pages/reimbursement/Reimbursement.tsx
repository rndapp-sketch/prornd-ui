// import React, { useState, useEffect, useCallback } from 'react';
// import { useNavigate, useSearchParams } from 'react-router-dom';
// // import { AppSidebar } from '@/components/RndSidebar';
// import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
// import { cn } from '@/lib/utils';
// // import { ArrowLeftIcon } from 'lucide-react';
// import { PageHeader } from '@/components/common/PageHeader';
// import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
// import { isFieldVisible } from '@/utils/evalExpression';
// import { prepareFormDataForApi } from '@/services/apiService';

// // --- TYPE DEFINITIONS ---
// interface FormDataResponse {
//     message: {
//         fields: FormField[];
//         link_options: Record<string, LinkOption[]>;
//         prefill_data: Record<string, any>;
//         child_table_fields?: Record<string, any[]>;
//     };
// }

// // --- STYLES & REUSABLE UI COMPONENTS ---
// const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
//     <div className={cn("bg-white dark:bg-zinc-900 p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm", className)}>
//         {children}
//     </div>
// );

// const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: {
//     children: React.ReactNode;
//     onClick?: () => void;
//     disabled?: boolean;
//     className?: string;
//     type?: "button" | "submit";
// }) => (
//     <button
//         type={type}
//         onClick={onClick}
//         disabled={disabled}
//         className={cn(
//             "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150",
//             "focus:outline-none focus:ring-2 focus:ring-[#D97757]/20",
//             "disabled:opacity-50 disabled:cursor-not-allowed",
//             className
//         )}
//     >
//         {children}
//     </button>
// );

// // Maps Frappe mandatory-error field names to readable labels using the loaded fields list.
// // Frappe error format: "[DocType, docname]: field1, field2"
// const parseFrappeError = (errMsg: string, fieldsList: FormField[]): string => {
//     const mandatoryMatch = errMsg.match(/\[.*?\]:\s*(.+)$/s);
//     if (mandatoryMatch) {
//         const rawFields = mandatoryMatch[1].split(',').map((f) => f.trim()).filter(Boolean);
//         const labels = rawFields.map((fn) => {
//             const found = fieldsList.find((f) => f.fieldname === fn);
//             return found?.label || fn.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
//         });
//         return `The following required fields are missing or incomplete:\n• ${labels.join('\n• ')}`;
//     }
//     return errMsg;
// };

// // --- MAIN REIMBURSEMENT COMPONENT ---
// const AUTOCOMPLETE_FIELDS = ['applicant_webmail', 'reimbursement_for_id'];

// const Reimbursement: React.FC = () => {
//     const navigate = useNavigate();
//     const [searchParams] = useSearchParams();
//     const editDocName = searchParams.get('edit');
//     const projectFromUrl = searchParams.get('project');
//     const projectTitleFromUrl = searchParams.get('projectTitle');
//     const { currentUser } = useFrappeAuth();

//     const [fields, setFields] = useState<FormField[]>([]);
//     const [formData, setFormData] = useState<Record<string, any>>({});
//     const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//     const [loading, setLoading] = useState(true);
//     const [isSubmitting, setIsSubmitting] = useState(false);
//     const [isSaved, setIsSaved] = useState(false);
//     const [savedDocName, setSavedDocName] = useState<string | null>(null);
//     const [dataLoaded, setDataLoaded] = useState(false);
//     const [projectTitle, setProjectTitle] = useState<string>('');
//     const [errorMsg, setErrorMsg] = useState<string | null>(null);

//     // --- API HOOKS ---
//     const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>('rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_reimbursement_fields');
//     const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
//     const { call: saveForm, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.save_reimbursement_data');
//     const { call: editForm, error: editError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.edit_reimbursement');
//     const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.submit_reimbursement');
//     const { call: fetchPiDetails } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');
//     const { call: fetchProjectDetails } = useFrappePostCall<{ message: any }>('frappe.client.get');

//     // --- DATA FETCHING ---
//     useEffect(() => {
//         if (!dataLoaded) {
//             fetchFormData({});
//         }
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, []);

//     useEffect(() => {
//         const loadFormAndDocument = async () => {
//             if (formDataResult?.message && !dataLoaded) {
//                 const { fields: apiFields, prefill_data, link_options, child_table_fields } = formDataResult.message;

//                 // Merge child_fields into the Table fields
//                 const enhancedFields = (apiFields || []).map((field: FormField) => {
//                     if (field.fieldtype === 'Table' && child_table_fields && child_table_fields[field.fieldname]) {
//                         return { ...field, child_fields: child_table_fields[field.fieldname] };
//                     }
//                     return field;
//                 });

//                 setFields(enhancedFields);
//                 setLinkOptions(link_options || {});
//                 console.log("link_options keys:", Object.keys(link_options || {}));
//                 console.log("link_options:", link_options);
//                 let initialData = { ...prefill_data };

//                 // If editing, fetch existing document data
//                 if (editDocName) {
//                     try {
//                         const existingDoc = await fetchExistingDoc({
//                             doctype: 'Reimbursement',
//                             name: editDocName
//                         });

//                         if (existingDoc?.message) {
//                             initialData = { ...initialData, ...existingDoc.message };
//                         }
//                     } catch (err) {
//                         console.error('Error fetching existing document:', err);
//                         alert('Failed to load document for editing');
//                     }
//                 }

//                 // Auto-fill project from URL if provided
//                 if (projectFromUrl && !editDocName) {
//                     try {
//                         const projectDoc = await fetchProjectDetails({
//                             doctype: 'Project Registration',
//                             name: projectFromUrl
//                         });
//                         if (projectDoc?.message) {
//                             const pData = projectDoc.message;
//                             initialData.project_number = pData.project_no || pData.name || projectFromUrl;
//                             // Use doc name (ID) for the Link field so the dropdown can match it
//                             initialData.project_name = pData.name || projectFromUrl;
//                             setProjectTitle(projectTitleFromUrl || pData.project_title || '');
//                         } else {
//                             // Fallback if fetch fails or no message
//                             initialData.project_name = projectFromUrl;
//                             initialData.project_number = projectFromUrl;
//                             if (projectTitleFromUrl) setProjectTitle(projectTitleFromUrl);
//                         }
//                     } catch (err) {
//                         console.warn('Could not fetch project details for auto-fill:', err);
//                         initialData.project_name = projectFromUrl;
//                         initialData.project_number = projectFromUrl;
//                         if (projectTitleFromUrl) setProjectTitle(projectTitleFromUrl);
//                     }
//                 }

//                 // Set defaults for any missing fields
//                 enhancedFields.forEach((field: FormField) => {
//                     if (initialData[field.fieldname] === undefined && field.default !== undefined) {
//                         initialData[field.fieldname] = field.default;
//                     }
//                 });

//                 // Default applicant_webmail to current logged-in user if not already set
//                 if (!initialData.applicant_webmail && !editDocName && currentUser) {
//                     initialData.applicant_webmail = currentUser;
//                 }

//                 // Auto-fill applicant details if webmail is prefilled
//                 if (initialData.applicant_webmail && !editDocName) {
//                     try {
//                         const result = await fetchPiDetails({ user_email: initialData.applicant_webmail });
//                         if (result?.message) {
//                             const details = result.message;
//                             initialData.applicant_designation = details.designation || "";
//                             initialData.applicant_department = details.applicant_department || "";
//                         }
//                     } catch (err) {
//                         console.warn('Could not fetch applicant details:', err);
//                     }
//                 }

//                 setFormData(initialData);
//                 setDataLoaded(true);
//                 setLoading(false);
//             }
//             if (formDataError) {
//                 console.error("Failed to load form data:", formDataError);
//                 alert("Error: Could not load the reimbursement form.");
//                 setLoading(false);
//             }
//         };

//         loadFormAndDocument();
//     }, [formDataResult, formDataError, editDocName, fetchExistingDoc, projectFromUrl, dataLoaded, fetchProjectDetails, currentUser]);

//     // Resolve project title after data is loaded
//     useEffect(() => {
//         if (!dataLoaded || projectTitle) return;
//         const projectNameValue = formData.project_name;
//         if (!projectNameValue) return;

//         // First try linkOptions lookup
//         const option = linkOptions['project_name']?.find(opt => opt.value === projectNameValue);
//         if (option?.label) {
//             setProjectTitle(option.label);
//             return;
//         }

//         // Fallback: fetch from API
//         fetchProjectDetails({
//             doctype: 'Project Registration',
//             name: projectNameValue
//         }).then(res => {
//             if (res?.message) {
//                 const title = res.message.project_title || res.message.title || '';
//                 if (title) {
//                     setProjectTitle(title);
//                     // Also inject it into linkOptions so the DynamicFormRenderer can use it!
//                     setLinkOptions(prev => {
//                         const existingOpts = prev['project_name'] || [];
//                         if (!existingOpts.find(opt => opt.value === projectNameValue)) {
//                             return {
//                                 ...prev,
//                                 'project_name': [...existingOpts, { value: projectNameValue, label: title }]
//                             };
//                         }
//                         return prev;
//                     });
//                 }
//             }
//         }).catch(() => {});
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [dataLoaded, formData.project_name, projectTitle]);

//     // --- EVENT HANDLERS ---
//     const handleChange = useCallback((fieldname: string, value: any) => {
//         setFormData(prev => ({ ...prev, [fieldname]: value }));
//     }, []);

//     const handleFileChange = useCallback((fieldname: string, file: File | null) => {
//         setFormData(prev => ({ ...prev, [fieldname]: file }));
//     }, []);

//     // Handle cascading field changes with side effects (PI details, etc.)
//     // Use a ref so the callback always sees the latest linkOptions without re-creating
//     const linkOptionsRef = React.useRef(linkOptions);
//     linkOptionsRef.current = linkOptions;

//     const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
//         handleChange(fieldname, value);

//         try {
//             if (fieldname === 'reimbursement_for_id' && value) {
//                 const result = await fetchPiDetails({ user_email: value });
//                 if (result?.message) {
//                     const details = result.message;
//                     setFormData(prev => ({
//                         ...prev,
//                         reimbursement_for_id: value,
//                         reimbursement_for_designation: details.designation || "",
//                         reimbursement_for_department: details.applicant_department || ""
//                     }));
//                 }
//             } else if (fieldname === 'reimbursement_for_id' && !value) {
//                 setFormData(prev => ({ ...prev, reimbursement_for_id: "", reimbursement_for_designation: "", reimbursement_for_department: "" }));
//             }

//             if (fieldname === 'applicant_webmail' && value) {
//                 const result = await fetchPiDetails({ user_email: value });
//                 if (result?.message) {
//                     const details = result.message;
//                     setFormData(prev => ({
//                         ...prev,
//                         applicant_webmail: value,
//                         applicant_designation: details.designation || "",
//                         applicant_department: details.applicant_department || ""
//                     }));
//                 }
//             } else if (fieldname === 'applicant_webmail' && !value) {
//                 setFormData(prev => ({ ...prev, applicant_webmail: "", applicant_designation: "", applicant_department: "" }));
//             }


//             // When project_name is selected from dropdown → auto-fill project_number
//             // project_name is a Link field (dropdown, value = Project ID)
//             // project_number is a Data field (needs text value)
//             if (fieldname === 'project_name') {
//                 // Immediately look up label from linkOptions for the header
//                 const selectedOption = linkOptionsRef.current['project_name']?.find(opt => opt.value === value);
//                 if (selectedOption?.label) {
//                     setProjectTitle(selectedOption.label);
//                 }

//                 // Immediately set project_number to the selected ID (value)
//                 setFormData(prev => ({
//                     ...prev,
//                     project_name: value,
//                     project_number: value
//                 }));

//                 if (value) {
//                     try {
//                         const projectDoc = await fetchProjectDetails({
//                             doctype: 'Project Registration',
//                             name: value
//                         });
//                         if (projectDoc?.message) {
//                             const pData = projectDoc.message;
//                             // If project_no is different from name/ID, update project_number
//                             if (pData.project_no && pData.project_no !== value) {
//                                 setFormData(prev => ({
//                                     ...prev,
//                                     project_number: pData.project_no
//                                 }));
//                             }
//                             // Use project_title from API (overrides linkOptions label if available)
//                             const apiTitle = pData.project_title || pData.title;
//                             if (apiTitle) {
//                                 setProjectTitle(apiTitle);
//                             }
//                         }
//                     } catch (err) {
//                         console.warn('Could not fetch project details for auto-fill:', err);
//                     }
//                 } else {
//                     setProjectTitle('');
//                 }
//             }

//         } catch (error) {
//             console.error(`Error handling field change for ${fieldname}:`, error);
//         }
//     }, [handleChange, fetchPiDetails, fetchProjectDetails]);

//     const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
//         setFormData(prev => {
//             const table = [...(prev[tableName] || [])];
//             table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
//             return { ...prev, [tableName]: table };
//         });
//     }, []);

//     const handleTableFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
//         setFormData(prev => {
//             const table = [...(prev[tableName] || [])];
//             table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
//             return { ...prev, [tableName]: table };
//         });
//     }, []);

//     const addTableRow = useCallback((tableName: string, newRow: Record<string, any>) => {
//         setFormData(prev => ({
//             ...prev,
//             [tableName]: [...(prev[tableName] || []), newRow]
//         }));
//     }, []);

//     const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
//         setFormData(prev => ({
//             ...prev,
//             [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex)
//         }));
//     }, []);

//     // The effective doc name: either from URL (?edit=) or from a previous save
//     const effectiveDocName = editDocName || savedDocName;

//     const handleSave = async () => {
//         if (isSubmitting) return;
//         setErrorMsg(null);

//         // Validate all visible declaration checkboxes are checked before saving
//         const uncheckedFields = fields.filter(f =>
//             f.fieldtype === 'Check' &&
//             isFieldVisible(f, formData) &&
//             !(formData[f.fieldname] === 1 || formData[f.fieldname] === '1' || formData[f.fieldname] === true)
//         );
//         if (uncheckedFields.length > 0) {
//             const names = uncheckedFields.map(f => f.label || f.fieldname).join(', ');
//             setErrorMsg(`Please select all declaration checkboxes before saving: ${names}`);
//             return;
//         }

//         setIsSubmitting(true);
//         try {
//             const data = await prepareFormDataForApi(formData);
//             let res;

//             if (effectiveDocName) {
//                 data.name = effectiveDocName;
//                 res = await editForm({ data: JSON.stringify(data) });
//             } else {
//                 res = await saveForm({ data: JSON.stringify(data) });
//             }

//             if (res?.message?.status === 'success') {
//                 setIsSaved(true);
//                 const newDocName = res.message.docname || effectiveDocName;
//                 if (newDocName) setSavedDocName(newDocName);
//                 alert(effectiveDocName ? "Reimbursement updated successfully!" : "Draft saved successfully!");
//                 if (editDocName) {
//                     navigate(`/reimbursement/${editDocName}`);
//                 }
//             } else {
//                 throw new Error(res?.message?.message || "Save failed");
//             }
//         } catch (err: any) {
//             console.error(effectiveDocName ? editError : saveError || err);
//             setErrorMsg(parseFrappeError(err.message || "Unknown error", fields));
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     const handleSubmit = async (e: React.FormEvent) => {
//         e.preventDefault();
//         if (isSubmitting) return;
//         setErrorMsg(null);
//         setIsSubmitting(true);
//         try {
//             const data = await prepareFormDataForApi(formData);
//             let saveRes;

//             if (effectiveDocName) {
//                 data.name = effectiveDocName;
//                 saveRes = await editForm({ data: JSON.stringify(data) });
//             } else {
//                 saveRes = await saveForm({ data: JSON.stringify(data) });
//             }

//             if (saveRes?.message?.status !== 'success') {
//                 throw new Error(saveRes?.message?.message || "Save failed during submission");
//             }

//             const docname = saveRes.message.docname || effectiveDocName;
//             if (docname) setSavedDocName(docname);

//             const submitRes = await submitForm({ docname });
//             if (submitRes?.message?.status === 'success') {
//                 alert("Reimbursement application submitted successfully!");
//                 navigate(-1);
//             } else {
//                 throw new Error(submitRes?.message?.message || "Submission failed");
//             }
//         } catch (err: any) {
//             console.error(submitError || err);
//             setErrorMsg(parseFrappeError(err.message || "Please check the console for details.", fields));
//         } finally {
//             setIsSubmitting(false);
//         }
//     };

//     // --- RENDER LOGIC ---
//     if (loading) {
//         return (
//             <div className="flex items-center justify-center min-h-screen bg-claude-bg">
//                 <div className="text-center">
//                     <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent mx-auto"></div>
//                     <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">Loading form...</p>
//                 </div>
//             </div>
//         );
//     }

//     return (
//         <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
//             {/* <AppSidebar /> */}
//             <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
//                 <PageHeader
//                     title={editDocName ? `Edit Reimbursement` : 'Reimbursement Application'}
//                     projectName={projectTitle || linkOptions['project_name']?.find(opt => opt.value === formData.project_name)?.label || formData.project_name}
//                     projectNumber={formData.project_number}
//                     status={editDocName ? 'Editing' : 'New'}
//                     showBack={true}
//                 />

//                 <form onSubmit={handleSubmit}>
//                     <FrappeCard className="space-y-12">
//                         <DynamicFormRenderer
//                             fields={fields}
//                             formData={formData}
//                             linkOptions={linkOptions}
//                             onChange={handleChange}
//                             onFileChange={handleFileChange}
//                             onTableRowChange={handleTableRowChange}
//                             onTableFileChange={handleTableFileChange}
//                             onAddTableRow={addTableRow}
//                             onDeleteTableRow={deleteTableRow}
//                             onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
//                             readOnly={formData.docstatus === 1}
//                             autocompleteFields={AUTOCOMPLETE_FIELDS}
//                         />
//                     </FrappeCard>

//                     {errorMsg && (
//                         <div className="mt-6 p-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 text-sm font-medium whitespace-pre-line">
//                             {errorMsg}
//                         </div>
//                     )}

//                     {(!editDocName || formData.docstatus === 0) && (
//                         <div className="mt-8 flex justify-end gap-4">
//                             <FrappeButton
//                                 onClick={handleSave}
//                                 disabled={isSubmitting}
//                                 className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800/50"
//                             >
//                                 {isSubmitting ? 'Saving...' : 'Save Draft'}
//                             </FrappeButton>
//                             <FrappeButton
//                                 type="submit"
//                                 disabled={isSubmitting || !isSaved}
//                                 className="bg-[#D97757] text-white hover:bg-[#D97757]"
//                             >
//                                 {isSubmitting ? 'Submitting...' : 'Submit Application'}
//                             </FrappeButton>
//                         </div>
//                     )}
//                 </form>
//             </main>
//         </div>
//     );
// };

// export default Reimbursement;




// -=-=--=-=-=-=-=-=-=-=-=-=

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
// import { AppSidebar } from '@/components/RndSidebar';
import { useFrappePostCall, useFrappeAuth } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
// import { ArrowLeftIcon } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { DynamicFormRenderer, type FormField, type LinkOption } from '@/components/forms/DynamicFormRenderer';
import { isFieldVisible } from '@/utils/evalExpression';
import { prepareFormDataForApi } from '@/services/apiService';

// --- TYPE DEFINITIONS ---
interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_fields?: Record<string, any[]>;
    };
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-zinc-900 p-6 md:p-8 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm", className)}>
        {children}
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit";
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#D97757]/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
        )}
    >
        {children}
    </button>
);

// Maps Frappe mandatory-error field names to readable labels using the loaded fields list.
// Frappe error format: "[DocType, docname]: field1, field2"
const parseFrappeError = (errMsg: string, fieldsList: FormField[]): string => {
    const mandatoryMatch = errMsg.match(/\[.*?\]:\s*(.+)$/s);
    if (mandatoryMatch) {
        const rawFields = mandatoryMatch[1].split(',').map((f) => f.trim()).filter(Boolean);
        const labels = rawFields.map((fn) => {
            const found = fieldsList.find((f) => f.fieldname === fn);
            return found?.label || fn.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        });
        return `The following required fields are missing or incomplete:\n• ${labels.join('\n• ')}`;
    }
    return errMsg;
};

// --- MAIN REIMBURSEMENT COMPONENT ---
const AUTOCOMPLETE_FIELDS = ['applicant_webmail', 'reimbursement_for_id'];

const Reimbursement: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const editDocName = searchParams.get('edit');
    const projectFromUrl = searchParams.get('project');
    const projectTitleFromUrl = searchParams.get('projectTitle');
    const { currentUser } = useFrappeAuth();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(null);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [projectTitle, setProjectTitle] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // --- API HOOKS ---
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall<FormDataResponse>('rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.get_reimbursement_fields');
    const { call: fetchExistingDoc } = useFrappePostCall<{ message: any }>('frappe.client.get');
    const { call: saveForm, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.save_reimbursement_data');
    const { call: editForm, error: editError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.edit_reimbursement');
    const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.reimbursement.reimbursement.submit_reimbursement');
    const { call: fetchPiDetails } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');
    const { call: fetchProjectDetails } = useFrappePostCall<{ message: any }>('frappe.client.get');

    // --- DATA FETCHING ---
    useEffect(() => {
        if (!dataLoaded) {
            fetchFormData({});
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const loadFormAndDocument = async () => {
            if (formDataResult?.message && !dataLoaded) {
                const { fields: apiFields, prefill_data, link_options, child_table_fields } = formDataResult.message;

                // Merge child_fields into the Table fields
                const enhancedFields = (apiFields || []).map((field: FormField) => {
                    if (field.fieldtype === 'Table' && child_table_fields && child_table_fields[field.fieldname]) {
                        return { ...field, child_fields: child_table_fields[field.fieldname] };
                    }
                    return field;
                });

                setFields(enhancedFields);
                setLinkOptions(link_options || {});
                console.log("link_options keys:", Object.keys(link_options || {}));
                console.log("link_options:", link_options);
                let initialData = { ...prefill_data };

                // If editing, fetch existing document data
                if (editDocName) {
                    try {
                        const existingDoc = await fetchExistingDoc({
                            doctype: 'Reimbursement',
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

                // Auto-fill project from URL if provided
                if (projectFromUrl && !editDocName) {
                    try {
                        const projectDoc = await fetchProjectDetails({
                            doctype: 'Project Registration',
                            name: projectFromUrl
                        });
                        if (projectDoc?.message) {
                            const pData = projectDoc.message;
                            initialData.project_number = pData.project_no || pData.name || projectFromUrl;
                            // Use doc name (ID) for the Link field so the dropdown can match it
                            initialData.project_name = pData.name || projectFromUrl;
                            setProjectTitle(projectTitleFromUrl || pData.project_title || '');
                        } else {
                            // Fallback if fetch fails or no message
                            initialData.project_name = projectFromUrl;
                            initialData.project_number = projectFromUrl;
                            if (projectTitleFromUrl) setProjectTitle(projectTitleFromUrl);
                        }
                    } catch (err) {
                        console.warn('Could not fetch project details for auto-fill:', err);
                        initialData.project_name = projectFromUrl;
                        initialData.project_number = projectFromUrl;
                        if (projectTitleFromUrl) setProjectTitle(projectTitleFromUrl);
                    }
                }

                // Set defaults for any missing fields
                enhancedFields.forEach((field: FormField) => {
                    if (initialData[field.fieldname] === undefined && field.default !== undefined) {
                        initialData[field.fieldname] = field.default;
                    }
                });

                // Default applicant_webmail to current logged-in user if not already set
                if (!initialData.applicant_webmail && !editDocName && currentUser) {
                    initialData.applicant_webmail = currentUser;
                }

                // Auto-fill applicant details if webmail is prefilled
                if (initialData.applicant_webmail && !editDocName) {
                    try {
                        const result = await fetchPiDetails({ user_email: initialData.applicant_webmail });
                        if (result?.message) {
                            const details = result.message;
                            initialData.applicant_designation = details.designation || "";
                            initialData.applicant_department = details.applicant_department || "";
                        }
                    } catch (err) {
                        console.warn('Could not fetch applicant details:', err);
                    }
                }

                setFormData(initialData);
                setDataLoaded(true);
                setLoading(false);
            }
            if (formDataError) {
                console.error("Failed to load form data:", formDataError);
                alert("Error: Could not load the reimbursement form.");
                setLoading(false);
            }
        };

        loadFormAndDocument();
    }, [formDataResult, formDataError, editDocName, fetchExistingDoc, projectFromUrl, dataLoaded, fetchProjectDetails, currentUser]);

    // Resolve project title after data is loaded
    useEffect(() => {
        if (!dataLoaded || projectTitle) return;
        const projectNameValue = formData.project_name;
        if (!projectNameValue) return;

        // First try linkOptions lookup
        const option = linkOptions['project_name']?.find(opt => opt.value === projectNameValue);
        if (option?.label) {
            setProjectTitle(option.label);
            return;
        }

        // Fallback: fetch from API
        fetchProjectDetails({
            doctype: 'Project Registration',
            name: projectNameValue
        }).then(res => {
            if (res?.message) {
                const title = res.message.project_title || res.message.title || '';
                if (title) {
                    setProjectTitle(title);
                    // Also inject it into linkOptions so the DynamicFormRenderer can use it!
                    setLinkOptions(prev => {
                        const existingOpts = prev['project_name'] || [];
                        if (!existingOpts.find(opt => opt.value === projectNameValue)) {
                            return {
                                ...prev,
                                'project_name': [...existingOpts, { value: projectNameValue, label: title }]
                            };
                        }
                        return prev;
                    });
                }
            }
        }).catch(() => { });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dataLoaded, formData.project_name, projectTitle]);

    // --- EVENT HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData(prev => ({ ...prev, [fieldname]: file }));
    }, []);

    // Handle cascading field changes with side effects (PI details, etc.)
    // Use a ref so the callback always sees the latest linkOptions without re-creating
    const linkOptionsRef = React.useRef(linkOptions);
    linkOptionsRef.current = linkOptions;

    const handleFieldChangeWithSideEffects = useCallback(async (fieldname: string, value: any) => {
        handleChange(fieldname, value);

        try {
            if (fieldname === 'reimbursement_for_id' && value) {
                const result = await fetchPiDetails({ user_email: value });
                if (result?.message) {
                    const details = result.message;
                    setFormData(prev => ({
                        ...prev,
                        reimbursement_for_id: value,
                        reimbursement_for_designation: details.designation || "",
                        reimbursement_for_department: details.applicant_department || ""
                    }));
                }
            } else if (fieldname === 'reimbursement_for_id' && !value) {
                setFormData(prev => ({ ...prev, reimbursement_for_id: "", reimbursement_for_designation: "", reimbursement_for_department: "" }));
            }

            if (fieldname === 'applicant_webmail' && value) {
                const result = await fetchPiDetails({ user_email: value });
                if (result?.message) {
                    const details = result.message;
                    setFormData(prev => ({
                        ...prev,
                        applicant_webmail: value,
                        applicant_designation: details.designation || "",
                        applicant_department: details.applicant_department || ""
                    }));
                }
            } else if (fieldname === 'applicant_webmail' && !value) {
                setFormData(prev => ({ ...prev, applicant_webmail: "", applicant_designation: "", applicant_department: "" }));
            }


            // When project_name is selected from dropdown → auto-fill project_number
            // project_name is a Link field (dropdown, value = Project ID)
            // project_number is a Data field (needs text value)
            if (fieldname === 'project_name') {
                // Immediately look up label from linkOptions for the header
                const selectedOption = linkOptionsRef.current['project_name']?.find(opt => opt.value === value);
                if (selectedOption?.label) {
                    setProjectTitle(selectedOption.label);
                }

                // Immediately set project_number to the selected ID (value)
                setFormData(prev => ({
                    ...prev,
                    project_name: value,
                    project_number: value
                }));

                if (value) {
                    try {
                        const projectDoc = await fetchProjectDetails({
                            doctype: 'Project Registration',
                            name: value
                        });
                        if (projectDoc?.message) {
                            const pData = projectDoc.message;
                            // If project_no is different from name/ID, update project_number
                            if (pData.project_no && pData.project_no !== value) {
                                setFormData(prev => ({
                                    ...prev,
                                    project_number: pData.project_no
                                }));
                            }
                            // Use project_title from API (overrides linkOptions label if available)
                            const apiTitle = pData.project_title || pData.title;
                            if (apiTitle) {
                                setProjectTitle(apiTitle);
                            }
                        }
                    } catch (err) {
                        console.warn('Could not fetch project details for auto-fill:', err);
                    }
                } else {
                    setProjectTitle('');
                }
            }

        } catch (error) {
            console.error(`Error handling field change for ${fieldname}:`, error);
        }
    }, [handleChange, fetchPiDetails, fetchProjectDetails]);

    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
            return { ...prev, [tableName]: table };
        });
    }, []);

    const handleTableFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
        setFormData(prev => {
            const table = [...(prev[tableName] || [])];
            table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
            return { ...prev, [tableName]: table };
        });
    }, []);

    const addTableRow = useCallback((tableName: string, newRow: Record<string, any>) => {
        setFormData(prev => ({
            ...prev,
            [tableName]: [...(prev[tableName] || []), newRow]
        }));
    }, []);

    const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
        setFormData(prev => ({
            ...prev,
            [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex)
        }));
    }, []);

    // The effective doc name: either from URL (?edit=) or from a previous save
    const effectiveDocName = editDocName || savedDocName;

    const handleSave = async () => {
        if (isSubmitting) return;
        setErrorMsg(null);

        // Validate all visible declaration checkboxes are checked before saving
        const uncheckedFields = fields.filter(f =>
            f.fieldtype === 'Check' &&
            isFieldVisible(f, formData) &&
            !(formData[f.fieldname] === 1 || formData[f.fieldname] === '1' || formData[f.fieldname] === true)
        );
        if (uncheckedFields.length > 0) {
            const names = uncheckedFields.map(f => f.label || f.fieldname).join(', ');
            setErrorMsg(`Please select all declaration checkboxes before saving: ${names}`);
            return;
        }

        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);
            let res;

            if (effectiveDocName) {
                data.name = effectiveDocName;
                res = await editForm({ data: JSON.stringify(data) });
            } else {
                res = await saveForm({ data: JSON.stringify(data) });
            }

            if (res?.message?.status === 'success') {
                setIsSaved(true);
                const newDocName = res.message.docname || effectiveDocName;
                if (newDocName) setSavedDocName(newDocName);
                alert(effectiveDocName ? "Reimbursement updated successfully!" : "Draft saved successfully!");
                if (editDocName) {
                    navigate(`/reimbursement/${editDocName}`);
                }
            } else {
                throw new Error(res?.message?.message || "Save failed");
            }
        } catch (err: any) {
            console.error(effectiveDocName ? editError : saveError || err);
            setErrorMsg(parseFrappeError(err.message || "Unknown error", fields));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setErrorMsg(null);
        setIsSubmitting(true);
        try {
            const data = await prepareFormDataForApi(formData);
            let saveRes;

            if (effectiveDocName) {
                data.name = effectiveDocName;
                saveRes = await editForm({ data: JSON.stringify(data) });
            } else {
                saveRes = await saveForm({ data: JSON.stringify(data) });
            }

            if (saveRes?.message?.status !== 'success') {
                throw new Error(saveRes?.message?.message || "Save failed during submission");
            }

            const docname = saveRes.message.docname || effectiveDocName;
            if (docname) setSavedDocName(docname);

            const submitRes = await submitForm({ docname });
            if (submitRes?.message?.status === 'success') {
                alert("Reimbursement application submitted successfully!");
                navigate(-1);
            } else {
                throw new Error(submitRes?.message?.message || "Submission failed");
            }
        } catch (err: any) {
            console.error(submitError || err);
            setErrorMsg(parseFrappeError(err.message || "Please check the console for details.", fields));
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDER LOGIC ---
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#D97757] border-t-transparent mx-auto"></div>
                    <p className="mt-4 text-lg font-medium text-zinc-700 dark:text-zinc-300">Loading form...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            {/* <AppSidebar /> */}
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title={editDocName ? `Edit Reimbursement` : 'Reimbursement Application'}
                    projectName={projectTitle || linkOptions['project_name']?.find(opt => opt.value === formData.project_name)?.label || formData.project_name}
                    projectNumber={formData.project_number}
                    status={editDocName ? 'Editing' : 'New'}
                    showBack={true}
                />

                <form onSubmit={handleSubmit}>
                    <FrappeCard className="space-y-12">
                        <DynamicFormRenderer
                            fields={fields}
                            formData={formData}
                            linkOptions={linkOptions}
                            onChange={handleChange}
                            onFileChange={handleFileChange}
                            onTableRowChange={handleTableRowChange}
                            onTableFileChange={handleTableFileChange}
                            onAddTableRow={addTableRow}
                            onDeleteTableRow={deleteTableRow}
                            onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
                            readOnly={formData.docstatus === 1}
                            autocompleteFields={AUTOCOMPLETE_FIELDS}
                        />
                    </FrappeCard>

                    {errorMsg && (
                        <div className="mt-6 p-4 rounded-xl border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300 text-sm font-medium whitespace-pre-line">
                            {errorMsg}
                        </div>
                    )}

                    {(!editDocName || formData.docstatus === 0) && (
                        <div className="mt-8 flex justify-end gap-4">
                            <FrappeButton
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800/50"
                            >
                                {isSubmitting ? 'Saving...' : 'Save Draft'}
                            </FrappeButton>
                            <FrappeButton
                                type="submit"
                                disabled={isSubmitting || !isSaved}
                                className="bg-[#D97757] text-white hover:bg-[#D97757]"
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Application'}
                            </FrappeButton>
                        </div>
                    )}
                </form>
            </main>
        </div>
    );
};

export default Reimbursement;