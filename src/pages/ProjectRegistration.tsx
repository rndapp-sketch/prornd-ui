
// -=-=-=-=-=-=-=-=-=-=-=-=-


import React, { useState, useEffect } from 'react';
import { AppSidebar } from "../components/RndSidebar";
import useUserRoleCheck from "../components/UserRoleCheck";
import { useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string;
    label: string;
    fieldtype: string;
    default?: any;
    mandatory: boolean;
    read_only: boolean;
    hidden: boolean;
    description?: string;
    options?: string;
}

interface LinkOption {
    value: string;
    label: string;
    designation?: string;
}

interface FormData {
    [key: string]: any;
    additional_pi_table?: (any & { id?: string })[];
    co_investigator_table?: (any & { id?: string })[];
    proposed_equipment_details?: (any & { id?: string })[];
    proposed_manpower_details?: (any & { id?: string })[];
    proposed_budget_breakup?: ({ head: string; years: (number | string)[]; id?: string })[];
    sanctioned_budget_breakup?: (any & { id?: string })[];
    sanction_related_files?: (any & { id?: string })[];
    fund_transactions?: (any & { id?: string })[];
}

const ProjectRegistration: React.FC = () => {
    // --- STATE MANAGEMENT & API HOOKS ---
    const [activeTab, setActiveTab] = useState(0);
    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [formData, setFormData] = useState<FormData>({});
    const [pendingFormData, setPendingFormData] = useState<FormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [docname, setDocname] = useState<string | null>(null);
    const [budgetYears, setBudgetYears] = useState([1]);
    const isPermanentEmployee = useUserRoleCheck();
    
    // API calls
    const { call: fetchFormData, result: formDataResult, error: formDataError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_project_form_data');
    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_data');
    const { call: saveDraft, result: saveResult, error: saveError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.save_project_draft');
    const { call: fetchPiDetails, result: piDetailsResult, error: piDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_user_details_for_pi');
    const { call: fetchAgencyDetails, result: agencyDetailsResult, error: agencyDetailsError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_funding_agency_details');
    const [isDraftSaved, setIsDraftSaved] = useState(false);

    // --- DATA FETCHING & INITIALIZATION ---
    useEffect(() => { 
        fetchFormData({}); 
    }, [fetchFormData]);
    
    useEffect(() => {
        if (formDataResult && formDataResult.message.fields) {
            const { fields: apiFields, link_options, prefill_data } = formDataResult.message;
            setFields(apiFields);
            setLinkOptions(link_options || {});
            const initialFormData = { 
                ...prefill_data, 
                is_additional_pi: prefill_data?.is_additional_pi || 'No', 
                has_co_pi: prefill_data?.has_co_pi || 'No', 
                needs_committee_clearance: prefill_data?.needs_committee_clearance || 'No', 
                have_sanction_details: prefill_data?.have_sanction_details || 'No', 
                have_fund_details: prefill_data?.have_fund_details || 'No',
                proposed_budget_breakup: (prefill_data?.proposed_budget_breakup || [{ head: '', years: [''] }]).map((row: any) => ({ ...row, id: row.id || (Date.now().toString() + Math.random().toString(36).substring(2, 9)) })),
                proposed_equipment_details: (prefill_data?.proposed_equipment_details || []).map((row: any) => ({ ...row, id: row.id || (Date.now().toString() + Math.random().toString(36).substring(2, 9)) })),
                proposed_manpower_details: (prefill_data?.proposed_manpower_details || []).map((row: any) => ({ ...row, id: row.id || (Date.now().toString() + Math.random().toString(36).substring(2, 9)) })),
                additional_pi_table: (prefill_data?.additional_pi_table || []).map((row: any) => ({ ...row, id: row.id || (Date.now().toString() + Math.random().toString(36).substring(2, 9)) })),
                co_investigator_table: (prefill_data?.co_investigator_table || []).map((row: any) => ({ ...row, id: row.id || (Date.now().toString() + Math.random().toString(36).substring(2, 9)) })),
                sanctioned_budget_breakup: (prefill_data?.sanctioned_budget_breakup || []).map((row: any) => ({ ...row, id: row.id || (Date.now().toString() + Math.random().toString(36).substring(2, 9)) })),
                sanction_related_files: (prefill_data?.sanction_related_files || []).map((row: any) => ({ ...row, id: row.id || (Date.now().toString() + Math.random().toString(36).substring(2, 9)) })),
                fund_transactions: (prefill_data?.fund_transactions || []).map((row: any) => ({ ...row, id: row.id || (Date.now().toString() + Math.random().toString(36).substring(2, 9)) }))
            };
            setFormData(initialFormData);
            setPendingFormData(initialFormData);
            setLoading(false);
            if (prefill_data && prefill_data.pi_webmail) {
                fetchPiDetails({ user_email: prefill_data.pi_webmail });
            }
        }
        if (formDataError || (formDataResult && formDataResult.message.error)) { 
            console.error("❌ Failed to fetch form data:", formDataError || formDataResult.message.error); 
            alert("Error fetching form data."); 
            setLoading(false); 
        }
    }, [formDataResult, formDataError, fetchPiDetails]);

    useEffect(() => { 
        if (agencyDetailsResult?.message?.all) { 
            const d = agencyDetailsResult.message.all; 
            setFormData(prev => ({ 
                ...prev, 
                funding_agency_type: d.funding_agency_type_1, 
                origin_of_funding_agency: d.origin_of_funding_agency, 
                funding_agency_ministry: d.ministry_funding_agency, 
                funding_agency_schemes: d.funding_agency_schemes, 
                address_street_village_locality: d.fundingagency_address, 
                address_state: d.fundingagency_state, 
                address_postal_code: d.fundingagency_postalcode, 
                address_country: d.fundingagency_country 
            })); 
            setPendingFormData(prev => ({
                ...prev,
                funding_agency_type: d.funding_agency_type_1, 
                origin_of_funding_agency: d.origin_of_funding_agency, 
                funding_agency_ministry: d.ministry_funding_agency, 
                funding_agency_schemes: d.funding_agency_schemes, 
                address_street_village_locality: d.fundingagency_address, 
                address_state: d.fundingagency_state, 
                address_postal_code: d.fundingagency_postalcode, 
                address_country: d.fundingagency_country 
            }));
        } 
    }, [agencyDetailsResult]);

    useEffect(() => {
        if (piDetailsResult && piDetailsResult.message) {
            const details = piDetailsResult.message;
            let departmentLinkValue = '';
            const departmentLabel = details.department || '';
            if (departmentLabel && linkOptions['applicant_department']) {
                const matchedOption = linkOptions['applicant_department'].find(opt => opt.label === departmentLabel || opt.value === departmentLabel);
                departmentLinkValue = matchedOption?.value || '';
            }
            setFormData(prev => ({ 
                ...prev, 
                pi_employee_id: details.pi_employee_id || '', 
                principal_investigator_name: details.principal_investigator_name || '', 
                designation: details.designation || '', 
                applicant_department: departmentLinkValue || prev.applicant_department 
            }));
            setPendingFormData(prev => ({
                ...prev,
                pi_employee_id: details.pi_employee_id || '', 
                principal_investigator_name: details.principal_investigator_name || '', 
                designation: details.designation || '', 
                applicant_department: departmentLinkValue || prev.applicant_department 
            }));
        }
    }, [piDetailsResult, linkOptions]);

    useEffect(() => { 
        if (activeTab === 1 && formData.pi_webmail && !formData.principal_investigator_name) { 
            fetchPiDetails({ user_email: formData.pi_webmail }); 
        } 
    }, [activeTab, formData.pi_webmail, formData.principal_investigator_name, fetchPiDetails]);

    useEffect(() => { 
        if (submitResult) { 
            alert(`Project registered: ${submitResult.message.docname}`); 
            setDocname(submitResult.message.docname); 
        } 
        if (submitError) { 
            alert(`Submission error: ${submitError.message}`); 
        } 
        setIsSubmitting(false); 
    }, [submitResult, submitError]);

    useEffect(() => { 
        if (saveResult) { 
            alert(`Draft saved: ${saveResult.message.docname}`); 
            setDocname(saveResult.message.docname); 
            setIsDraftSaved(true); 
        } 
        if (saveError) { 
            alert(`Draft save error: ${saveError.message}`); 
        } 
        setIsSavingDraft(false); 
    }, [saveResult, saveError]);

    // Apply pending changes when tab changes
    useEffect(() => {
        if (Object.keys(pendingFormData).length > 0) {
            setFormData(prev => ({ ...prev, ...pendingFormData }));
            setPendingFormData({});
        }
    }, [activeTab]);

    // --- MODIFIED EVENT HANDLERS ---
    const handleChange = (fieldname: string, value: any, type?: string) => { 
        setPendingFormData(prev => ({ 
            ...prev, 
            [fieldname]: type === 'checkbox' ? (value ? 1 : 0) : value 
        })); 
    };

    const handleFileChange = (fieldname: string, file: File | null) => { 
        setPendingFormData(prev => ({ ...prev, [fieldname]: file })); 
    };
    
    const handleTableRowChange = (tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setPendingFormData(prev => {
            const currentTable = prev[tableName] ? [...prev[tableName]] : (formData[tableName] ? [...formData[tableName]] : []);
            const updatedRow = { 
                ...currentTable[rowIndex], 
                [fieldname]: value 
            };
            
            const updatedTable = [
                ...currentTable.slice(0, rowIndex),
                updatedRow,
                ...currentTable.slice(rowIndex + 1)
            ];
            
            return {
                ...prev,
                [tableName]: updatedTable
            };
        });
    };

    const handleTableFileChange = (tableName: string, rowIndex: number, fieldname: string, file: File | null) => { 
        setPendingFormData(prev => { 
            const currentTable = prev[tableName] ? [...prev[tableName]] : (formData[tableName] ? [...formData[tableName]] : []);
            const t = [...currentTable]; 
            t[rowIndex] = { ...t[rowIndex], [fieldname]: file }; 
            return { ...prev, [tableName]: t }; 
        }); 
    };

    const addTableRow = (tableName: string, newRow: object) => {
        const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        setPendingFormData(prev => {
            const currentTable = prev[tableName] ? [...prev[tableName]] : (formData[tableName] ? [...formData[tableName]] : []);
            return {
                ...prev,
                [tableName]: [...currentTable, { ...newRow, id: newId }]
            };
        });
    };

    const deleteTableRow = (tableName: string, rowIndex: number) => { 
        setPendingFormData(prev => {
            const currentTable = prev[tableName] ? [...prev[tableName]] : (formData[tableName] ? [...formData[tableName]] : []);
            return { 
                ...prev, 
                [tableName]: currentTable.filter((_: any, i: number) => i !== rowIndex) 
            };
        }); 
    };

    // Modified handler to apply changes immediately when clicking Next button
    const handleNextButton = () => {
        if (Object.keys(pendingFormData).length > 0) {
            setFormData(prev => ({ ...prev, ...pendingFormData }));
            setPendingFormData({});
        }
        setActiveTab(activeTab + 1);
    };

    // Modified handler to apply changes immediately when clicking Previous button
    const handlePrevButton = () => {
        if (Object.keys(pendingFormData).length > 0) {
            setFormData(prev => ({ ...prev, ...pendingFormData }));
            setPendingFormData({});
        }
        setActiveTab(activeTab - 1);
    };

    // Get current field value (prioritizing pending changes, then formData)
    const getFieldValue = (fieldname: string) => {
        return pendingFormData[fieldname] !== undefined ? pendingFormData[fieldname] : formData[fieldname];
    };

    // Get current table data (prioritizing pending changes, then formData)
    const getTableData = (tableName: string) => {
        return pendingFormData[tableName] !== undefined ? pendingFormData[tableName] : formData[tableName];
    };

    const handlePiWebmailChange = (value: string) => { 
        handleChange('pi_webmail', value); 
        setPendingFormData(prev => ({ 
            ...prev, 
            pi_employee_id: '', 
            principal_investigator_name: '', 
            designation: '', 
            applicant_department: '' 
        })); 
        if (value) { 
            fetchPiDetails({ user_email: value }); 
        } 
    };

    const handleFundingAgencyChange = (agencyName: string) => { 
        handleChange('funding_agen', agencyName); 
        if (agencyName) { 
            fetchAgencyDetails({ agency_name: agencyName }); 
        } else { 
            setPendingFormData(prev => ({ 
                ...prev, 
                funding_agency_schemes: '', 
                funding_agency_type: '', 
                origin_of_funding_agency: '', 
                funding_agency_ministry: '', 
                address_country: '', 
                address_street_village_locality: '', 
                address_state: '', 
                address_postal_code: '' 
            })); 
        } 
    };

    const handleCollaboratorChange = (tableName: string, rowIndex: number, selectedUserEmail: string) => { 
        const user = (linkOptions['pi_webmail'] || []).find(c => c.value === selectedUserEmail); 
        setPendingFormData(prev => { 
            const currentTable = prev[tableName] ? [...prev[tableName]] : (formData[tableName] ? [...formData[tableName]] : []);
            const p = tableName === 'co_investigator_table' ? 'copi' : 'pi'; 
            const t = [...currentTable]; 
            t[rowIndex] = { 
                ...t[rowIndex], 
                [`${p}_name`]: user?.label, 
                [`${p}_email`]: user?.value, 
                [`${p}_designation`]: user?.designation 
            }; 
            return { ...prev, [tableName]: t }; 
        }); 
    };

    // --- FORM SUBMISSION ---
    const fileToBase64 = (file: File): Promise<{ file_name: string; file_data: string }> => new Promise((res, rej) => { 
        const r = new FileReader(); 
        r.readAsDataURL(file); 
        r.onload = () => res({ file_name: file.name, file_data: r.result as string }); 
        r.onerror = e => rej(e); 
    });

    const prepareDataForApi = async () => { 
        const data = JSON.parse(JSON.stringify(formData)); 
        if (docname) { 
            data.name = docname; 
        } 
        for (const k in formData) { 
            const v = formData[k]; 
            if (v instanceof File) { 
                data[k] = await fileToBase64(v); 
            } else if (Array.isArray(v)) { 
                for (let i = 0; i < v.length; i++) { 
                    for (const rk in v[i]) { 
                        if (v[i][rk] instanceof File) { 
                            data[k][i][rk] = await fileToBase64(v[i][rk]); 
                        } 
                    } 
                } 
            } 
        } 
        return data; 
    };

    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        if (isSubmitting || isSavingDraft) return; 
        setIsSubmitting(true); 
        try { 
            const data = await prepareDataForApi(); 
            await submitForm({ doc: data }); 
        } catch (err) { 
            alert("File processing error."); 
            setIsSubmitting(false); 
        } 
    };

    const handleSaveDraft = async () => { 
        if (isSavingDraft || isSubmitting) return; 
        setIsSavingDraft(true); 
        try { 
            const data = await prepareDataForApi(); 
            await saveDraft({ doc_data: JSON.stringify(data) }); 
        } catch (err) { 
            alert("File processing error."); 
            setIsSavingDraft(false); 
        } 
    };

    // --- FIXED BUDGET TABLE LOGIC ---
    const budgetTable = getTableData('proposed_budget_breakup') || [];
    const totalBudgetAmount = budgetTable.reduce((acc: any, row: { years: any; }) => acc + (row.years || []).reduce((sum: number, val: any) => sum + Number(val || 0), 0), 0);
    
    const addBudgetYear = () => { 
        if (budgetYears.length < 5) { 
            setBudgetYears(prev => [...prev, prev.length + 1]);
            setPendingFormData(prev => ({
                ...prev,
                proposed_budget_breakup: (prev.proposed_budget_breakup || formData.proposed_budget_breakup || []).map(row => ({
                    ...row,
                    years: [...(row.years || []), '']
                }))
            }));
        } else { 
            alert("Maximum of 5 years allowed."); 
        } 
    };

    const deleteLastBudgetYear = () => { 
        if (budgetYears.length > 1) {
            setBudgetYears(prev => prev.slice(0, -1));
            setPendingFormData(prev => ({
                ...prev,
                proposed_budget_breakup: (prev.proposed_budget_breakup || formData.proposed_budget_breakup || []).map(row => ({
                    ...row,
                    years: (row.years || []).slice(0, -1)
                }))
            }));
        }
    };

    const getYearTotal = (yearIndex: number) => budgetTable.reduce((sum: number, row: { years: any; }) => sum + Number((row.years || [])[yearIndex] || 0), 0);

    const addBudgetRow = () => {
        addTableRow('proposed_budget_breakup', { 
            head: '', 
            years: budgetYears.map(() => '') 
        });
    };

    const handleBudgetRowChange = (rowIndex: number, fieldname: string, value: any, yearIndex?: number) => {
        if (fieldname === 'years' && yearIndex !== undefined) {
            setPendingFormData(prev => {
                const currentTable = prev.proposed_budget_breakup ? [...prev.proposed_budget_breakup] : (formData.proposed_budget_breakup ? [...formData.proposed_budget_breakup] : []);
                const currentRow = currentTable[rowIndex] || { head: '', years: [] };
                const updatedYears = [...(currentRow.years || [])];
                updatedYears[yearIndex] = value;
                
                const updatedRow = { 
                    ...currentRow, 
                    years: updatedYears 
                };
                
                const updatedTable = [
                    ...currentTable.slice(0, rowIndex),
                    updatedRow,
                    ...currentTable.slice(rowIndex + 1)
                ];
                
                return {
                    ...prev,
                    proposed_budget_breakup: updatedTable
                };
            });
        } else {
            handleTableRowChange('proposed_budget_breakup', rowIndex, fieldname, value);
        }
    };

    // --- REUSABLE COMPONENTS ---
    const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => ( 
        <div className={cn("bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]", className)}>{children}</div> 
    );

    const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => ( 
        <button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:bg-gray-300", className)}>{children}</button> 
    );

    const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";
    const checkboxClasses = "size-6 shrink-0 appearance-none bg-white border-2 border-black rounded-sm shadow-[2px_2px_0px_rgba(0,0,0,0.25)] checked:bg-black checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat";

    // --- FIELD RENDERER ---
    const renderField = (fieldname: string) => {
        const field = fields.find(f => f.fieldname === fieldname);
        if (!field || field.hidden) return null;
        const value = getFieldValue(field.fieldname);
        const commonProps = { 
            id: field.fieldname, 
            name: field.fieldname, 
            className: inputClasses, 
            readOnly: field.read_only, 
            required: field.mandatory, 
            disabled: field.read_only 
        };
        
        if (field.read_only && value) {
            return (
                <div className='space-y-2'>
                    <label className="block font-bold text-black text-lg">{field.label}</label>
                    <p className="font-mono text-gray-800 text-base h-12 flex items-center px-1">{value}</p>
                </div>
            );
        }

        const renderInput = () => {
            switch (field.fieldtype) {
                case "Link":
                    return (
                        <select {...commonProps} value={value || ''} onChange={e => {
                            if(field.fieldname === 'pi_webmail') {
                                handlePiWebmailChange(e.target.value);
                            } else if(field.fieldname === 'funding_agen') {
                                handleFundingAgencyChange(e.target.value);
                            } else {
                                handleChange(field.fieldname, e.target.value);
                            }
                        }}>
                            <option value="">Select...</option>
                            {(linkOptions[field.fieldname] || []).map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    );
                case "Select":
                    return (
                        <select {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)}>
                            <option value="">Select...</option>
                            {(field.options?.split('\n').filter(o=>o) || []).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    );
                case "Text":
                case "Small Text":
                    return <textarea {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} rows={5} className={`${inputClasses} h-auto py-3`}></textarea>;
                case "Check":
                    return (
                        <label className="flex items-center gap-4 font-bold text-black text-lg cursor-pointer">
                            <input type="checkbox" className={checkboxClasses} checked={!!value} onChange={e => handleChange(field.fieldname, e.target.checked, 'checkbox')} disabled={field.read_only}/>
                            <span>{field.label}{field.mandatory && <span className="text-red-500">*</span>}</span>
                        </label>
                    );
                case "Date":
                    return <input type="date" {...commonProps} value={value || ''} onChange={e => handleChange(field.fieldname, e.target.value)} />;
                case "Attach":
                    return <input type="file" {...commonProps} className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:font-bold file:bg-[#A5D6A7] file:text-black hover:file:bg-[#8BC34A]`} onChange={e => handleFileChange(field.fieldname, e.target.files?.[0] || null)} />;
                default:handleChange
                    return <input type={(['Int', 'Currency', 'Float'].includes(field.fieldtype)) ? 'number' : 'text'} {...commonProps} value={value || ''} onChange={e => (field.fieldname, e.target.value)} />;
            }
        };

        if (field.fieldtype === 'Check') return renderInput();
        
        return (
            <div className='space-y-2'>
                <label htmlFor={field.fieldname} className="block font-bold text-black text-lg">
                    {field.label}{field.mandatory && <span className="text-red-500">*</span>}
                </label>
                {renderInput()}
                {field.description && <p className="text-sm text-gray-700 font-mono mt-2">{field.description}</p>}
            </div>
        );
    };

    // --- FIXED TABLE RENDERERS ---
    const renderGenericTable = (tableName: string, columns: { key: string, label: string, type: string }[], newRow: object) => {
        const tableData = getTableData(tableName) || [];
        
        return (
            <div>
                <div className="overflow-x-auto border-2 border-black rounded-md">
                    <table className="min-w-full divide-y-2 divide-black">
                        <thead className="bg-[#90A4AE]">
                            <tr className="divide-x-2 divide-black">
                                {[...columns, {key:'actions', label:'Actions', type:'action'}].map(c => (
                                    <th key={c.key} className="p-3 font-bold text-white uppercase">{c.label}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black bg-white">
                            {tableData.map((row: any, i: number) => (
                                <tr key={row.id} className="divide-x-2 divide-black">
                                    {columns.map(col => (
                                        <td key={col.key} className="p-2">
                                            {col.type === 'file' ? (
                                                <input 
                                                    type="file" 
                                                    className={`${inputClasses} !h-11 !py-2`} 
                                                    onChange={e => handleTableFileChange(tableName, i, col.key, e.target.files?.[0]||null)} 
                                                />
                                            ) : (
                                                <input 
                                                    type={col.type} 
                                                    className={`${inputClasses} !h-11`} 
                                                    value={row[col.key] || ''} 
                                                    onChange={e => { 
                                                        const value = col.key === 'salary' ? e.target.value.replace(/[^0-9]/g, '') : e.target.value; 
                                                        handleTableRowChange(tableName, i, col.key, value); 
                                                    }} 
                                                />
                                            )}
                                        </td>
                                    ))}
                                    <td className="p-2">
                                        <NeoButton onClick={() => deleteTableRow(tableName, i)} className="bg-red-500 text-white w-full text-sm !py-2">
                                            Delete
                                        </NeoButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <NeoButton onClick={() => addTableRow(tableName, newRow)} className="bg-[#A5D6A7] mt-4">
                    Add Row
                </NeoButton>
            </div>
        );
    };

    const renderCollaboratorTable = (tableName: string, title: string) => {
        const prefix = tableName === 'co_investigator_table' ? 'copi' : 'pi';
        const newRow = { 
            [`${prefix}_name`]: '', 
            [`${prefix}_email`]: '', 
            [`${prefix}_designation`]: '', 
            [`${prefix}_address`]: '', 
            [`${prefix}_contact`]: '' 
        };
        const tableData = getTableData(tableName) || [];
        
        return (
            <div>
                <h3 className="text-2xl font-bold uppercase text-black mb-4">{title}</h3>
                <div className="overflow-x-auto border-2 border-black rounded-md">
                    <table className="min-w-full divide-y-2 divide-black">
                        <thead className="bg-[#90A4AE]">
                            <tr className="divide-x-2 divide-black">
                                {["Name*", "Email ID*", "Designation*", "Address*", "Contact*", "Actions"].map(h => (
                                    <th key={h} className="p-3 font-bold text-white uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y-2 divide-black bg-white">
                            {tableData.map((row: any, i: number) => (
                                <tr key={row.id} className="divide-x-2 divide-black">
                                    <td className="p-2">
                                        <select 
                                            className={`${inputClasses} !h-11`} 
                                            value={row[`${prefix}_email`] || ''} 
                                            onChange={e => handleCollaboratorChange(tableName, i, e.target.value)}
                                        >
                                            <option value="">Select Person...</option>
                                            {(linkOptions['pi_webmail'] || []).map(o => (
                                                <option key={o.value} value={o.value}>{o.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <input type="email" readOnly className={`${inputClasses} !h-11 bg-gray-200`} value={row[`${prefix}_email`] || ''} />
                                    </td>
                                    <td className="p-2">
                                        <input type="text" readOnly className={`${inputClasses} !h-11 bg-gray-200`} value={row[`${prefix}_designation`] || ''} />
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            type="text" 
                                            placeholder="Institute/Address" 
                                            className={`${inputClasses} !h-11`} 
                                            value={row[`${prefix}_address`] || ''} 
                                            onChange={e => handleTableRowChange(tableName, i, `${prefix}_address`, e.target.value)} 
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            type="tel" 
                                            placeholder="10-digit #" 
                                            maxLength={10} 
                                            className={`${inputClasses} !h-11`} 
                                            value={row[`${prefix}_contact`] || ''} 
                                            onChange={e => handleTableRowChange(tableName, i, `${prefix}_contact`, e.target.value.replace(/[^0-9]/g, ''))} 
                                        />
                                    </td>
                                    <td className="p-2">
                                        <NeoButton onClick={() => deleteTableRow(tableName, i)} className="bg-red-500 text-white w-full text-sm !py-2">
                                            Delete
                                        </NeoButton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <NeoButton onClick={() => addTableRow(tableName, newRow)} className="bg-[#A5D6A7] mt-4">
                    Add Collaborator
                </NeoButton>
            </div>
        );
    };

    // --- FIXED BUDGET TABLE RENDERER ---
    const renderBudgetTable = () => (
        <div className="space-y-4">
            <div className="overflow-x-auto border-2 border-black rounded-md">
                <table className="min-w-full divide-y-2 divide-black">
                    <thead className="bg-[#90A4AE]">
                        <tr className="divide-x-2 divide-black">
                            <th className="p-3 font-bold text-white uppercase">Budget Head</th>
                            {budgetYears.map((year, index) => (
                                <th key={index} className="p-3 font-bold text-white uppercase">Year {year} (₹)</th>
                            ))}
                            <th className="p-3 font-bold text-white uppercase">Total (₹)</th>
                            <th className="p-3 font-bold text-white uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y-2 divide-black">
                        {budgetTable.map((row: { years: any; id: React.Key | null | undefined; head: any; }, rowIndex: number) => {
                            const rowTotal = (row.years || []).reduce((sum: number, val: any) => sum + Number(val || 0), 0);
                            return (
                                <tr key={row.id} className="divide-x-2 divide-black">
                                    <td className="p-2">
                                        <input
                                            type="text"
                                            className={`${inputClasses} !h-11`} 
                                            placeholder="e.g., Equipment" 
                                            value={row.head || ''} 
                                            onChange={(e) => handleBudgetRowChange(rowIndex, 'head', e.target.value)} 
                                        />
                                    </td>
                                    {budgetYears.map((_, yearIndex) => (
                                        <td key={yearIndex} className="p-2">
                                            <input 
                                                type="number" 
                                                className={`${inputClasses} !h-11`} 
                                                value={(row.years || [])[yearIndex] || ''} 
                                                onChange={(e) => handleBudgetRowChange(rowIndex, 'years', e.target.value, yearIndex)} 
                                            />
                                        </td>
                                    ))}
                                    <td className="p-2 font-mono font-bold text-right pr-4">
                                        {rowTotal.toFixed(2)}
                                    </td>
                                    <td className="p-2">
                                        <NeoButton 
                                            type="button" 
                                            className="bg-[#A1887F] hover:bg-red-600 text-white w-full !py-2 text-sm" 
                                            onClick={() => deleteTableRow('proposed_budget_breakup', rowIndex)}
                                        >
                                            Delete
                                        </NeoButton>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-200 border-t-2 border-black">
                        <tr className="divide-x-2 divide-black">
                            <th className="p-3 text-right font-bold text-black uppercase">Yearly Total</th>
                            {budgetYears.map((_, yearIndex) => (
                                <td key={yearIndex} className="p-3 font-bold text-black font-mono text-right pr-4">
                                    {Number(getYearTotal(yearIndex)).toFixed(2)}
                                </td>
                            ))}
                            <td className="p-3 font-bold text-black font-mono bg-gray-300 text-right pr-4">
                                {totalBudgetAmount.toFixed(2)}
                            </td>
                            <td className="p-3"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div className="flex flex-wrap gap-4">
                <NeoButton type="button" className="bg-[#A5D6A7]" onClick={addBudgetRow}>
                    Add Budget Row
                </NeoButton>
                <NeoButton type="button" className="bg-[#90A4AE] text-white" onClick={addBudgetYear} disabled={budgetYears.length >= 5}>
                    Add Year
                </NeoButton>
                <NeoButton type="button" className="bg-[#A1887F] text-white" onClick={deleteLastBudgetYear}>
                    Delete Last Year
                </NeoButton>
            </div>
            
            <div className="mt-6 flex justify-end">
                <div className="w-full md:w-1/3 space-y-2">
                    <label className="block text-xl font-bold text-black">Grand Total (₹)</label>
                    <input 
                        type="text" 
                        className={`${inputClasses} text-xl font-bold bg-gray-200`} 
                        readOnly 
                        value={totalBudgetAmount.toFixed(2)} 
                    />
                </div>
            </div>
        </div>
    );

    // --- RENDER ---
    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE] mx-auto"></div>
                <p className="mt-4 text-2xl font-bold text-black">LOADING REGISTRATION FORM...</p>
            </div>
        </div>
    );

    const tabButtons = ["Project Details", "PI & Collaborators", "Budget", "Clearance", "Sanction & Funds"];
    
    const renderNextPrevButtons = (showPrev: boolean, showNext: boolean, isLast = false) => (
        <div className="mt-8 flex justify-between items-center bg-white p-4 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
            <NeoButton onClick={handlePrevButton} className={cn("bg-white", !showPrev && 'invisible')}>
                Previous
            </NeoButton>
            {isLast ? (
                <div className="flex flex-col sm:flex-row gap-4">
                    <NeoButton onClick={handleSaveDraft} disabled={isSubmitting || isSavingDraft} className="bg-white">
                        {isSavingDraft ? 'SAVING...' : 'Save As Draft'}
                    </NeoButton>
                    <NeoButton type="submit" disabled={isSubmitting || isSavingDraft || !isDraftSaved} className="bg-[#A5D6A7] disabled:bg-gray-300">
                        {isSubmitting ? 'SUBMITTING...' : 'Submit Registration'}
                    </NeoButton>
                </div>
            ) : (
                <NeoButton onClick={handleNextButton} className={cn("bg-[#A5D6A7]", !showNext && 'invisible')}>
                    Next Section
                </NeoButton>
            )}
        </div>
    );

    return (
        <div className="bg-[#FDFCEC]">
            <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden bg-[#FDFCEC]]">
                <header className="mb-3">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight uppercase">
                        New Project Registration
                    </h1>
                    <p className="text-gray-700 mt-2 font-mono">
                        Fill all sections to register a new project.
                    </p>
                </header>

                <div className="border-b-2 border-black flex mb-8">
                    {tabButtons.map((title, index) => (
                        <button 
                            key={index} 
                            type="button" 
                            onClick={() => setActiveTab(index)}
                            className={cn(
                                "flex-1 py-4 px-2 font-bold text-black text-center transition-all border-r-2 border-black last:border-r-0 text-sm md:text-base",
                                activeTab === index ? "bg-[#B0BEC5] text-white" : "bg-white hover:bg-gray-100"
                            )}
                        >
                            {title}
                        </button>
                    ))}
                </div>
                
                <form id="project-registration-form" onSubmit={handleSubmit}>
                    {/* Tab 0: Project Details */}
                    <div className={activeTab === 0 ? 'block' : 'hidden'}>
                        <NeoCard className="space-y-8">
                            <h2 className="text-3xl font-bold uppercase text-black">1. Project Description</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {renderField("pi_webmail")}
                                {renderField("project_title")}
                            </div>
                            {renderField("project_type")}
                            {getFieldValue("project_type") === 'Consultancy' && renderField("consultancy_category")}
                            {getFieldValue("project_type") === 'Other' && renderField("other_project_type_name")}
                            {getFieldValue("project_type") === 'Research' && (
                                <div className='space-y-8'>
                                    <NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                                        <h3 className="text-2xl font-bold uppercase text-black">Funding Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {renderField("funding_agen")}
                                            {renderField("funding_agency_type")}
                                            {renderField("origin_of_funding_agency")}
                                            {renderField("funding_agency_ministry")}
                                            {renderField("funding_agency_schemes")}
                                        </div>
                                    </NeoCard>
                                    <NeoCard className="p-6 space-y-6 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                                        <h3 className="text-2xl font-bold uppercase text-black">Agency Address</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {renderField("address_street_village_locality")}
                                            {renderField("address_state")}
                                            {renderField("address_postal_code")}
                                            {renderField("address_country")}
                                        </div>
                                    </NeoCard>
                                </div>
                            )}
                            {renderField("project_objective")}
                            {renderField("project_deliverables")}
                            {renderField("executive_summary")}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {getFieldValue("project_type") !== 'Consultancy' ? 
                                    renderField("project_duration_months") : 
                                    renderField("project_duration_days")
                                }
                            </div>
                            {renderField("upload_proj_prop")}
                        </NeoCard>
                        {renderNextPrevButtons(false, true)}
                    </div>

                    {/* Tab 1: PI & Collaborators */}
                    <div className={activeTab === 1 ? 'block' : 'hidden'}>
                        <NeoCard className="space-y-10">
                            <h2 className="text-3xl font-bold uppercase text-black">2. Investigators & Collaborators</h2>
                            <div className="p-6 space-y-6 border-2 border-black rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                                <h3 className="text-2xl font-bold uppercase text-black">Principal Investigator (PI)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    {renderField("pi_employee_id")}
                                    {renderField("principal_investigator_name")}
                                    {renderField("designation")}
                                    {renderField("applicant_department")}
                                </div>
                            </div>
                            <div className="space-y-6">
                                {renderField("is_additional_pi")}
                                {renderField("has_co_pi")}
                            </div>
                            {getFieldValue("is_additional_pi") === 'Yes' && renderCollaboratorTable('additional_pi_table', 'Details of Additional PI(s)')}
                            {getFieldValue("has_co_pi") === 'Yes' && renderCollaboratorTable('co_investigator_table', 'Details of Co-PI(s)')}
                        </NeoCard>
                        {renderNextPrevButtons(true, true)}
                    </div>

                    {/* Tab 2: Budget - FIXED */}
                    <div className={activeTab === 2 ? 'block' : 'hidden'}>
                        <NeoCard className="space-y-8">
                            <h2 className="text-3xl font-bold uppercase text-black">3. Proposed Budget</h2>
                            <p className="font-mono text-gray-700">
                                Provide a detailed year-wise breakup of the proposed budget.
                            </p>
                            
                            {renderBudgetTable()}
                            
                            <div className="space-y-6 border-t-2 border-black pt-8">
                                {renderField("equipment_checkbox")}
                                {renderField("manpower_checkbox")}
                            </div>
                            
                            {getFieldValue("equipment_checkbox") && (
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-bold uppercase text-black">Proposed Equipment</h3>
                                    {renderGenericTable('proposed_equipment_details', [
                                        {key: 'item_name', label: 'Equipment Name*', type: 'text'}, 
                                        {key: 'cost', label: 'Cost (₹)', type: 'number'}
                                    ], {item_name: '', cost: 0})}
                                </div>
                            )}
                            
                            {getFieldValue("manpower_checkbox") && (
                                <div className="space-y-4">
                                    <h3 className="text-2xl font-bold uppercase text-black">Proposed Manpower</h3>
                                    {renderGenericTable('proposed_manpower_details', [
                                        {key: 'designation_name', label: 'Position*', type: 'text'}, 
                                        {key: 'salary', label: 'Salary (₹)', type: 'number'}
                                    ], {designation_name: '', salary: 0})}
                                </div>
                            )}
                        </NeoCard>
                        {renderNextPrevButtons(true, true)}
                    </div>

                    {/* Tab 3: Clearance */}
                    <div className={activeTab === 3 ? 'block' : 'hidden'}>
                        <NeoCard className="space-y-8">
                            <h2 className="text-3xl font-bold uppercase text-black">4. Clearance & Declaration</h2>
                            {renderField("needs_committee_clearance")}
                            {getFieldValue("needs_committee_clearance") === 'Yes' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {renderField("committees")}
                                    {getFieldValue("committees") === 'Other' && renderField("other_committee_specify")}
                                </div>
                            )}
                            {getFieldValue("committees") === 'Biosafety Committee' && (
                                <NeoCard className="!shadow-[2px_2px_0px_rgba(0,0,0,0.25)] space-y-4">
                                    <h3 className="text-2xl font-bold uppercase text-black">Declaration</h3>
                                    <div className="prose prose-sm max-w-none font-mono text-black border-2 border-black rounded-md p-4 bg-gray-100" 
                                         dangerouslySetInnerHTML={{__html: "<p><strong>Biosafety Categories:</strong></p><ul class='list-disc list-inside'><li><strong>Category I:</strong>...</li><li><strong>Category II:</strong>...</li><li><strong>Category III:</strong>...</li></ul><p>In case of a multi-department/centre project...</p>"}}/>
                                    {renderField("declaration_html")}
                                </NeoCard>
                            )}
                        </NeoCard>
                        {renderNextPrevButtons(true, true)}
                    </div>

                    {/* Tab 4: Sanction & Funds */}
                    <div className={activeTab === 4 ? 'block' : 'hidden'}>
                        <NeoCard className="space-y-10">
                            <h2 className="text-3xl font-bold uppercase text-black">5. Sanction & Funds</h2>
                            <div className="space-y-6">
                                {renderField("have_sanction_details")}
                                {getFieldValue("have_sanction_details") === 'Yes' && (
                                    <NeoCard className="space-y-8 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                                        <h3 className="text-2xl font-bold uppercase text-black">Sanction Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {renderField("total_sanctioned_amount")}
                                            {renderField("sanctioned_letter_no")}
                                            {renderField("sanctioned_letter_date")}
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-xl font-bold uppercase text-black">Sanctioned Budget</h4>
                                            {renderGenericTable('sanctioned_budget_breakup', [
                                                {key: 'head', label: 'Budget Head', type: 'text'}, 
                                                {key: 'amount', label: 'Amount (₹)', type: 'number'}
                                            ], {head: '', amount: 0})}
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-xl font-bold uppercase text-black">Sanction Files</h4>
                                            {renderGenericTable('sanction_related_files', [
                                                {key: 'file', label: 'File', type: 'file'}
                                            ], {file: null})}
                                        </div>
                                    </NeoCard>
                                )}
                            </div>
                            <div className="space-y-6">
                                {renderField("have_fund_details")}
                                {getFieldValue("have_fund_details") === 'Yes' && (
                                    <NeoCard className="space-y-8 !shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                                        <h3 className="text-2xl font-bold uppercase text-black">Fund Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            {renderField("amount_received")}
                                            {renderField("iitg_bank_account_number")}
                                            {renderField("is_gst_invoice_issued")}
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="text-xl font-bold uppercase text-black">Installment Details</h4>
                                            {renderGenericTable('fund_transactions', [
                                                {key: 'installmentNo', label: 'Installment No.', type: 'text'}, 
                                                {key: 'dateReceived', label: 'Date Received', type: 'date'}, 
                                                {key: 'amount', label: 'Amount (₹)', type: 'number'}
                                            ], {installmentNo: '', dateReceived: '', amount: 0})}
                                        </div>
                                    </NeoCard>
                                )}
                            </div>
                        </NeoCard>
                        {renderNextPrevButtons(true, false, true)}
                    </div>
                </form>
            </main>
        </div>
    );
};

export default ProjectRegistration;