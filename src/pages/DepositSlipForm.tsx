
// -=-=-=-=-=-=
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

const inputClasses = "w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.25)] focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-100";
const FrappeCard = ({ children, className }: any) => (<div className={cn("bg-white p-6 md:p-8 border border-gray-200 rounded-xl shadow-sm", className)}>{children}</div>);
const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: any) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-2.5 border border-gray-200 rounded-lg font-semibold text-gray-700 bg-white shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button>);
const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">{title}</h2>{children}</div>);

const DepositSlipForm: React.FC = () => {
    const navigate = useNavigate();
    // Use doc_name or fundReceivedName to prefill if coming from a context
    const { fundReceivedName } = useParams<{ fundReceivedName: string }>();

    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formValues, setFormValues] = useState<Record<string, any>>({});

    const tableRowsRef = useRef<{
        ecs_dates: string[];
    }>({ ecs_dates: [] });

    const containerRef = useRef<{ [key: string]: HTMLElement | null }>({});

    const { call: fetchFormData, result, error } = useFrappePostCall<FormDataResponse>('rndopsapp.rndopsapp.doctype.deposit_slip.deposit_slip.get_deposit_slip_fields');
    const { call: submitForm, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.deposit_slip.deposit_slip.save_deposit_slip');

    useEffect(() => {
        // IND-WORKAROUND: Temporarily disabled prefill fetch due to backend error 
        // (OperationalError: (1054, "Unknown column 'principal_investigator' in 'SELECT'"))
        // Pass empty object to just get fields without prefill data
        fetchFormData({});
        // fetchFormData({ doc_name: fundReceivedName });
    }, [fetchFormData, fundReceivedName]);

    useEffect(() => {
        if (result) {
            console.log("API Result:", result);
        }

        if (result?.message) {
            const { fields: apiFields, link_options, prefill_data } = result.message;

            if (Array.isArray(apiFields)) {

                const processedFields = apiFields.map(field => {
                    // Normalize Section Break type check
                    if (field.fieldtype === 'Section Break' || field.fieldtype === 'SectionBreak') return field;

                    // Priority: Prefill Data > Default Value > Empty
                    if (prefill_data && prefill_data[field.fieldname] !== undefined) {
                        return { ...field, default: prefill_data[field.fieldname] };
                    }
                    return field;
                });

                setFields(processedFields);
                console.log("Form Fields Loaded:", processedFields.map(f => f.fieldname));
                console.log("Form Fields Loaded (incl. virtual):", processedFields.map(f => f.fieldname));
            } else {
                console.error("API did not return a valid 'fields' array.", result);
            }

            setLinkOptions(prev => ({ ...prev, ...(link_options || {}) }));
            setLoading(false);
        }
        if (error) {
            console.error("Failed to load form data:", error);
            // alert("Failed to load form data."); 
            setLoading(false);
        }
    }, [result, error, fundReceivedName]);


    useEffect(() => {
        if (fields.length > 0) {
            const initialValues: Record<string, any> = {};
            fields.forEach(f => {
                if (f.default) initialValues[f.fieldname] = f.default;
            });
            // Merge with prefill if any (though currently disabled, logic remains valid)
            setFormValues(prev => ({ ...prev, ...initialValues }));
        }
    }, [fields]);

    const handleFieldChange = (fieldname: string, value: any) => {
        console.log(`Field Changed: ${fieldname} = ${value}, Category: ${formValues.category}`);

        setFormValues(prev => {
            const newValues = { ...prev, [fieldname]: value };

            // Auto-calculation logic based on Category
            const category = (newValues.category || '').toLowerCase();

            if (category.includes('research')) {
                // Research Calculations
                // Check multiple possible field names for the main amount
                if (['amount_inclusive_gst', 'total_amount', 'amount', 'capital_component_cost', 'category'].includes(fieldname)) {
                    // Try to get amount from any of the likely fields
                    const amountVal = newValues.amount_inclusive_gst || newValues.total_amount || newValues.amount || newValues.capital_component_cost;
                    const amount = parseFloat(amountVal) || 0;

                    // Assuming 18% GST inclusive
                    const baseAmount = amount / 1.18;
                    const gst = amount - baseAmount;
                    const cgst = gst / 2;
                    const sgst = gst / 2;
                    const projectBalance = baseAmount;
                    const overhead = projectBalance * 0.15; // 15% overhead

                    newValues.cgst_amount = cgst.toFixed(2);
                    newValues.cgst = cgst.toFixed(2); // Also update non-suffixed version
                    newValues.sgst_amount = sgst.toFixed(2);
                    newValues.sgst = sgst.toFixed(2); // Also update non-suffixed version
                    newValues.project_balance = projectBalance.toFixed(2);
                    newValues.project_balance_amount = projectBalance.toFixed(2); // Also update suffixed version
                    newValues.overhead_amount = overhead.toFixed(2);
                    newValues.overhead = overhead.toFixed(2); // Also update non-suffixed version
                    console.log("Research Calc Updated:", { cgst, sgst, projectBalance, overhead });
                }
            } else if (['consultancy', 'testing', 'non routine'].some(c => category.includes(c))) {
                // Consultancy Calculations
                const amountVal = newValues.amount_inclusive_gst || newValues.total_amount || newValues.amount;
                const amountIncl = parseFloat(amountVal || '0');

                const consultYVal = newValues.consultancy_charge_y || newValues.consultancy_fee;
                const consultY = parseFloat(consultYVal || '0');

                const operationalZVal = newValues.operational_charge_z || newValues.operational_charge;
                const operationalZ = parseFloat(operationalZVal || '0');

                // Trigger on relevant fields
                if (['amount_inclusive_gst', 'total_amount', 'amount', 'consultancy_charge_y', 'consultancy_fee', 'operational_charge_z', 'operational_charge', 'category'].includes(fieldname)) {

                    // 1. IGST @ 18% (or CGST/SGST 9%)
                    const baseFromIncl = amountIncl / 1.18;
                    const igst = amountIncl - baseFromIncl;
                    newValues.igst_amount = igst.toFixed(2);
                    newValues.igst = igst.toFixed(2); // Also update non-suffixed version

                    const tds = baseFromIncl * 0.02;
                    newValues.tds_amount = tds.toFixed(2);
                    newValues.tds = tds.toFixed(2); // Also update non-suffixed version

                    const amountRecv = amountIncl - tds;
                    newValues.amount_received = amountRecv.toFixed(2);
                    newValues.amount_received_amount = amountRecv.toFixed(2); // Also update suffixed version

                    const totalCostX = baseFromIncl;
                    newValues.total_cost_x = totalCostX.toFixed(2);
                    newValues.total_cost_x_amount = totalCostX.toFixed(2); // Also update suffixed version
                    console.log("Consultancy Base Calc Updated:", { igst, tds, amountRecv, totalCostX });
                }

                if (['consultancy_charge_y', 'consultancy_fee', 'operational_charge_z', 'operational_charge', 'category'].includes(fieldname)) {
                    const ohY = consultY * 0.10;
                    const ohZ = operationalZ * 0.10;
                    const totalOh = ohY + ohZ;
                    const instShare = consultY * 0.20;

                    newValues.overhead_from_y = ohY.toFixed(2);
                    newValues.overhead_from_y_amount = ohY.toFixed(2); // Map to backend field

                    newValues.overhead_from_z = ohZ.toFixed(2);
                    newValues.overhead_from_z_amount = ohZ.toFixed(2); // Map to backend field

                    newValues.total_overhead = totalOh.toFixed(2);
                    newValues.total_overhead_amount = totalOh.toFixed(2); // Map to backend field

                    newValues.institute_share = instShare.toFixed(2);
                    newValues.institute_share_amount = instShare.toFixed(2); // Map to backend field

                    newValues.overhead_plus_inst_share = (totalOh + instShare).toFixed(2);
                    console.log("Consultancy Overhead Calc Updated:", { ohY, ohZ, totalOh, instShare });
                }
            }

            return newValues;
        });
    };

    const checkDependency = (field: Field | null | undefined) => {
        if (!field || !field['depends_on']) return true;

        // Frappe 'depends_on' can be "eval:..." or just a fieldname sometimes, 
        // but here we see "eval:" from the user request
        const dep = field['depends_on'] as string;
        if (!dep) return true;

        if (dep.startsWith('eval:')) {
            const expression = dep.replace('eval:', '').trim();
            const doc = formValues; // alias for eval context

            try {
                // Handle: doc.category=='Research'
                if (expression.includes("==")) {
                    const [lhs, rhsraw] = expression.split("==");
                    const key = lhs.replace("doc.", "").trim();
                    const val = rhsraw.replace(/['"]/g, "").trim();
                    // loose equality
                    return doc[key] == val;
                }

                // Handle: doc.category!=='Research' or !=
                if (expression.includes("!==") || expression.includes("!=")) {
                    const operator = expression.includes("!==") ? "!==" : "!=";
                    const [lhs, rhsraw] = expression.split(operator);
                    const key = lhs.replace("doc.", "").trim();
                    const val = rhsraw.replace(/['"]/g, "").trim();
                    return doc[key] != val;
                }

                // Handle: doc.category.includes('Consultancy')
                if (expression.includes(".includes(")) {
                    const [keyPart, rest] = expression.split(".includes(");
                    const key = keyPart.replace("doc.", "").trim();
                    const valueToCheck = rest.replace(")", "").replace(/['"]/g, "").trim();
                    return doc[key]?.includes(valueToCheck);
                }

            } catch (e) {
                console.warn("Failed to parse dependency:", dep, e);
                return true;
            }
        }
        return true;
    };

    const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)} `;

    const addTableRow = useCallback((tableName: keyof typeof tableRowsRef.current) => {
        const newId = generateId();
        tableRowsRef.current[tableName].push(newId);
        renderTableRows(tableName, newId);
    }, []);

    const removeTableRow = useCallback((tableName: keyof typeof tableRowsRef.current, id: string) => {
        tableRowsRef.current[tableName] = tableRowsRef.current[tableName].filter(rowId => rowId !== id);
        const row = containerRef.current[tableName]?.querySelector(`[data-id="${id}"]`);
        if (row) row.remove();
    }, []);

    const renderTableRows = (tableName: keyof typeof tableRowsRef.current, rowId: string) => {
        const container = containerRef.current[tableName];
        if (!container) return;

        const inputClasses = "w-full h-10 px-3 bg-white border border-gray-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#90A4AE]";
        const neoButtonClasses = "px-5 py-2 !bg-red-200 hover:!bg-red-300 border border-gray-200 rounded-md font-semibold text-black shadow-sm transition-all hover:shadow-xs hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]";

        const newRow = document.createElement("tr");
        newRow.setAttribute("data-id", rowId);
        newRow.className = "divide-x divide-gray-100";

        if (tableName === 'ecs_dates') {
            newRow.innerHTML = `
                <td class="p-2"><input type="date" name="ecs_date_${rowId}" class="${inputClasses}" /></td>
                <td class="p-2"><input type="number" step="0.01" name="amount_${rowId}" class="${inputClasses}" placeholder="0.00" /></td>
                <td class="p-2"><input type="text" name="remarks_${rowId}" class="${inputClasses}" placeholder="Remarks" /></td>
                <td class="p-2 text-center"><button type="button" class="${neoButtonClasses} delete-btn" data-table="${tableName}" data-id="${rowId}">Delete</button></td>
`;
        }

        container.appendChild(newRow);

        const delBtn = newRow.querySelector('.delete-btn');
        delBtn?.addEventListener('click', () => removeTableRow(tableName, rowId));
    };


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const formElement = e.currentTarget;
            const form = new FormData(formElement);
            const dataToSubmit: { [key: string]: any } = {};

            // Collect regular fields
            fields.forEach(field => {
                if (field.fieldtype !== 'Table' && field.fieldtype !== 'Section Break' && !field.hidden) {
                    const value = form.get(field.fieldname);
                    if (value !== null) {
                        dataToSubmit[field.fieldname] = value;
                    }
                }
            });

            // Process ECS Dates table
            dataToSubmit.ecs_dates = tableRowsRef.current.ecs_dates.map(id => {
                const ecs_date = form.get(`ecs_date_${id} `);
                const amount = form.get(`amount_${id} `);
                const remarks = form.get(`remarks_${id} `);

                if (!ecs_date && (!amount || parseFloat(amount as string) === 0)) return null;

                return {
                    ecs_date: ecs_date || "",
                    amount: amount ? parseFloat(amount as string) : 0,
                    remarks: remarks || "",
                };
            }).filter(row => row !== null);

            console.log('Submitting Deposit Slip:', dataToSubmit);

            const result = await submitForm({ doc_data: JSON.stringify(dataToSubmit) });
            console.log('Submission result:', result);

            alert("Deposit Slip saved successfully!");
            navigate(-1);
        } catch (err: any) {
            console.error('Submission error:', submitError || err);
            alert(`Submission Failed: ${err.message || 'Unknown Error'} `);
        } finally {
            setIsSubmitting(false);
        }
    };



    const renderFormField = (field: Field) => {
        // Check dependency first
        if (!checkDependency(field)) return null;

        // Handle hidden fields and Section Breaks (which are handled by grouping)
        if (!field || field.hidden || field.fieldtype === 'Section Break' || field.fieldtype === 'SectionBreak' || field.fieldtype === 'Column Break' || field.fieldtype === 'ColumnBreak') return null;

        // Hide backend configuration fields (Multipliers, Labels)
        if (field.fieldname.endsWith('_multiplier') || field.fieldname.endsWith('_label')) return null;

        // Skip Tables as they are rendered separately or need specific custom handling
        if (field.fieldtype === 'Table') return null;

        const commonProps = {
            id: field.fieldname,
            name: field.fieldname,
            className: inputClasses,
            readOnly: field.read_only === 1,
            required: field.mandatory === 1,
            disabled: field.read_only === 1,
            defaultValue: undefined, // Controlled component must not have defaultValue
            value: formValues[field.fieldname] || '',
            onChange: (e: any) => handleFieldChange(field.fieldname, e.target.value)
        };

        const renderInput = () => {
            if (field.fieldtype === "Link") {
                let opts = linkOptions[field.fieldname] || [];

                // Fallback logic for common missing link options
                if (opts.length === 0) {
                    if (field.fieldname === 'project_title' || field.fieldname === 'research_project') {
                        if (linkOptions['project_ref_no']) opts = linkOptions['project_ref_no'];
                        else if (linkOptions['project_registration']) opts = linkOptions['project_registration'];
                    }
                    else if (field.fieldname === 'principal_investigator') {
                        if (linkOptions['pi']) opts = linkOptions['pi'];
                    }
                    else if (field.fieldname === 'consultancy_title' || field.fieldname === 'consultancy_event') {
                        if (linkOptions['consultancy_ref_no']) opts = linkOptions['consultancy_ref_no'];
                    }

                    if (opts.length === 0) {
                        console.warn(`No link options found for field: ${field.fieldname} `);
                    }
                }

                return (
                    <select {...commonProps}>
                        <option value="">Select...</option>
                        {opts.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );
            }
            if (field.fieldtype === "Select") {
                const selectOpts = typeof field.options === 'string'
                    ? field.options.split('\n').filter(o => o).map(o => ({ value: o, label: o }))
                    : [];
                return (
                    <select {...commonProps}>
                        <option value="">Select...</option>
                        {selectOpts.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );
            }
            if (field.fieldtype === "Date") return <input type="date" {...commonProps} />;
            if (field.fieldtype === "Currency" || field.fieldtype === "Float" || field.fieldtype === "Int") return <input type="number" step={field.fieldtype === 'Int' ? "1" : "0.01"} {...commonProps} />;
            if (field.fieldtype === "HTML") return <div dangerouslySetInnerHTML={{ __html: field.options || '' }} className="prose text-sm text-gray-600" />;

            return <input type="text" {...commonProps} />;
        };

        return (
            <div key={field.fieldname} className='space-y-1.5'>
                <label htmlFor={field.fieldname} className="block text-sm font-medium text-gray-700">
                    {field.label}{field.mandatory === 1 && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderInput()}
                {field.description && <p className="text-xs text-gray-500 mt-1">{field.description}</p>}
            </div>
        );
    };

    // Simple grouping: assumes structure
    const groupFieldsBySection = () => {
        const sections: { title: string; fields: Field[]; sectionField?: Field }[] = [];
        let currentSection: { title: string; fields: Field[]; sectionField?: Field } | null = null;

        // Start a default section if first field isn't a break
        if (fields.length > 0 && fields[0].fieldtype !== 'Section Break' && fields[0].fieldtype !== 'SectionBreak') {
            currentSection = { title: 'General Information', fields: [] };
        }

        fields.forEach(field => {
            if (field.fieldtype === 'Section Break' || field.fieldtype === 'SectionBreak') {
                if (currentSection) sections.push(currentSection);
                currentSection = { title: field.label || 'Section', fields: [], sectionField: field };
            } else if (currentSection && !field.hidden && field.fieldtype !== 'Table' && field.fieldtype !== 'Column Break' && field.fieldtype !== 'ColumnBreak') {
                // Skip tables here
                currentSection.fields.push(field);
            }
        });
        if (currentSection) sections.push(currentSection);
        return sections;
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b border-gray-200 mx-auto"></div>
                    <p className="mt-4 text-lg font-semibold">Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
                <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-red-200 max-w-md">
                    <div className="text-red-500 text-xl font-bold mb-2">Error Loading Form</div>
                    <p className="text-gray-600 mb-4">{error.message || JSON.stringify(error)}</p>
                    <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg">Go Back</button>
                    <button onClick={() => window.location.reload()} className="ml-4 px-5 py-2.5 bg-[#0EA5A4] text-white hover:bg-[#0C8F8E] rounded-lg">Retry</button>
                </div>
            </div>
        );
    }

    if (fields.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8]">
                <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-yellow-200 max-w-md">
                    <div className="text-yellow-600 text-xl font-bold mb-2">No Form Fields Found</div>
                    <p className="text-gray-600 mb-4">The API returned no fields for this form. Please check the backend configuration.</p>
                    <div className="text-xs text-gray-400 font-mono mb-4 text-left bg-gray-50 p-2 rounded max-h-40 overflow-auto">
                        Result: {JSON.stringify(result, null, 2)}
                    </div>
                    <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg">Go Back</button>
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
                        <button onClick={() => navigate(-1)} className="p-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-transform">
                            <ArrowLeftIcon className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">New Deposit Slip</h1>
                        </div>
                    </div>
                </header>

                <form onSubmit={handleSubmit}>
                    <FrappeCard className="space-y-12">
                        {sections.map((section, index) => {
                            if (section.sectionField && !checkDependency(section.sectionField)) return null;

                            return (
                                <NeoSection key={index} title={section.title}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {section.fields.map(renderFormField)}
                                    </div>
                                </NeoSection>
                            );
                        })}



                        <NeoSection title="ECS Dates">
                            <div className="overflow-x-auto border border-gray-200 rounded-md">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr className="divide-x divide-gray-100">
                                            {['Date', 'Amount (₹)', 'Remarks', ''].map((h) => (
                                                <th key={h} className="p-3 font-semibold text-gray-700 text-sm text-left">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody ref={el => { if (el) containerRef.current['ecs_dates'] = el; }} className="divide-y divide-gray-200 bg-white" />
                                </table>
                            </div>
                            <FrappeButton onClick={() => addTableRow('ecs_dates')} className="bg-[#A5D6A7] hover:bg-[#81C784] mt-4">
                                + Add Row
                            </FrappeButton>
                        </NeoSection>

                        {/* Credits / Breakup Table based on HTML Reference */}
                        {(formValues.category === 'Research' || formValues.category?.includes('Consultancy')) && (
                            <NeoSection title="Credit as follows (Calculated)">
                                <div className="overflow-x-auto border border-gray-200 rounded-md bg-white">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="p-3 text-left text-sm font-semibold text-gray-700">Label</th>
                                                <th className="p-3 text-left text-sm font-semibold text-gray-700">% of Overhead</th>
                                                <th className="p-3 text-left text-sm font-semibold text-gray-700">Amount (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {formValues.category === 'Research' ? (
                                                <>
                                                    <tr>
                                                        <td className="p-3 text-sm">IDF (Overhead + Institute Share)</td>
                                                        <td className="p-3 text-sm">40%</td>
                                                        <td className="p-3 text-sm">{((parseFloat(formValues.overhead_amount) || 0) * 0.40).toFixed(2)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-3 text-sm">DPF / Department</td>
                                                        <td className="p-3 text-sm">25%</td>
                                                        <td className="p-3 text-sm">{((parseFloat(formValues.overhead_amount) || 0) * 0.25).toFixed(2)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-3 text-sm">Student Welfare Board</td>
                                                        <td className="p-3 text-sm">5%</td>
                                                        <td className="p-3 text-sm">{((parseFloat(formValues.overhead_amount) || 0) * 0.05).toFixed(2)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-3 text-sm">Staff Welfare Board</td>
                                                        <td className="p-3 text-sm">5%</td>
                                                        <td className="p-3 text-sm">{((parseFloat(formValues.overhead_amount) || 0) * 0.05).toFixed(2)}</td>
                                                    </tr>
                                                    {/* PDF Dynamic Row logic could go here, for now static breakdown for main items */}
                                                </>
                                            ) : (
                                                <>
                                                    <tr>
                                                        <td className="p-3 text-sm">IDF (Overhead + Institute Share)</td>
                                                        <td className="p-3 text-sm">40%</td>
                                                        <td className="p-3 text-sm">{((parseFloat(formValues.total_overhead) || 0) * 0.40).toFixed(2)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-3 text-sm">DPF / Department</td>
                                                        <td className="p-3 text-sm">50%</td>
                                                        <td className="p-3 text-sm">{((parseFloat(formValues.total_overhead) || 0) * 0.50).toFixed(2)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-3 text-sm">Student Welfare Board</td>
                                                        <td className="p-3 text-sm">5%</td>
                                                        <td className="p-3 text-sm">{((parseFloat(formValues.total_overhead) || 0) * 0.05).toFixed(2)}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="p-3 text-sm">Staff Welfare Board</td>
                                                        <td className="p-3 text-sm">5%</td>
                                                        <td className="p-3 text-sm">{((parseFloat(formValues.total_overhead) || 0) * 0.05).toFixed(2)}</td>
                                                    </tr>
                                                </>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </NeoSection>
                        )}

                    </FrappeCard>

                    <div className="mt-8 flex justify-end gap-4">
                        <FrappeButton type="button" onClick={() => navigate(-1)} className="bg-gray-200 hover:bg-gray-300">Cancel</FrappeButton>
                        <FrappeButton type="submit" disabled={isSubmitting} className="bg-green-300 hover:bg-green-400 disabled:bg-gray-300">{isSubmitting ? 'Saving...' : 'Save Deposit Slip'}</FrappeButton>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default DepositSlipForm;
