// Multi-Doctype Deposit Slip Form
import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import { cn } from '@/lib/utils';
import { ArrowLeftIcon, ChevronDown } from "lucide-react";

// --- DEPOSIT SLIP TYPE CONFIGURATION ---
const DEPOSIT_SLIP_TYPES: Record<string, {
    label: string;
    getFields: string;
    save: string;
    submit: string;
    getWorkflowActions: string;
    performAction: string;
}> = {
    t_testing: {
        label: "T Testing Deposit Slip",
        getFields: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.get_t_testing_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.save_t_testing_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.submit_t_testing_deposit_slip",
        getWorkflowActions: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.get_t_testing_deposit_slip_workflow_actions",
        performAction: "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.perform_t_testing_deposit_slip_workflow_action"
    },
    research_consultancy: {
        label: "Research Consultancy Deposit Slip",
        getFields: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.get_research_consultancy_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.save_research_consultancy_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.submit_research_consultancy_deposit_slip",
        getWorkflowActions: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.get_research_consultancy_deposit_slip_workflow_actions",
        performAction: "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.perform_research_consultancy_deposit_slip_workflow_action"
    },
    other_event: {
        label: "Other Event Deposit Slip",
        getFields: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.get_other_event_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.save_other_event_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.submit_other_event_deposit_slip",
        getWorkflowActions: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.get_other_event_deposit_slip_workflow_actions",
        performAction: "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.perform_other_event_deposit_slip_workflow_action"
    },
    e_non_routine: {
        label: "E Non Routine Deposit Slip",
        getFields: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.get_e_non_routine_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.save_e_non_routine_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.submit_e_non_routine_deposit_slip",
        getWorkflowActions: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.get_e_non_routine_deposit_slip_workflow_actions",
        performAction: "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.perform_e_non_routine_deposit_slip_workflow_action"
    },
    d_consultancy: {
        label: "D Consultancy Deposit Slip",
        getFields: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.get_d_consultancy_deposit_slip_fields",
        save: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.save_d_consultancy_deposit_slip",
        submit: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.submit_d_consultancy_deposit_slip",
        getWorkflowActions: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.get_d_consultancy_deposit_slip_workflow_actions",
        performAction: "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.perform_d_consultancy_deposit_slip_workflow_action"
    }
};

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

const inputClasses = "w-full h-10 px-3 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.25)] focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-100";
const FrappeCard = ({ children, className }: any) => (<div className={cn("bg-white p-6 md:p-8 border border-gray-200 rounded-xl shadow-sm", className)}>{children}</div>);
const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: any) => (<button type={type} onClick={onClick} disabled={disabled} className={cn("px-5 py-2.5 border border-gray-200 rounded-lg font-semibold text-gray-700 bg-white shadow-sm transition-all hover:bg-gray-50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed", className)}>{children}</button>);
const NeoSection = ({ title, children }: any) => (<div className="space-y-6"><h2 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-3">{title}</h2>{children}</div>);

const DepositSlipForm: React.FC = () => {
    const navigate = useNavigate();
    const { fundReceivedName } = useParams<{ fundReceivedName: string }>();

    // Selected deposit slip type
    const [selectedType, setSelectedType] = useState<string>("");
    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formValues, setFormValues] = useState<Record<string, any>>({});

    const tableRowsRef = useRef<{
        ecs_dates: string[];
        credit_distribution: string[];
    }>({ ecs_dates: [], credit_distribution: [] });

    const containerRef = useRef<{ [key: string]: HTMLElement | null }>({});

    // Handle type change - fetch new fields
    const handleTypeChange = async (type: string) => {
        setSelectedType(type);
        setFields([]);
        setFormValues({});
        setLoading(true);

        if (!type || !DEPOSIT_SLIP_TYPES[type]) {
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`/api/method/${DEPOSIT_SLIP_TYPES[type].getFields}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ doc_name: fundReceivedName || undefined })
            });
            const result = await response.json();

            if (result?.message) {
                const { fields: apiFields, link_options, prefill_data } = result.message;

                if (Array.isArray(apiFields)) {
                    const processedFields = apiFields.map(field => {
                        if (field.fieldtype === 'Section Break' || field.fieldtype === 'SectionBreak') return field;
                        if (prefill_data && prefill_data[field.fieldname] !== undefined) {
                            return { ...field, default: prefill_data[field.fieldname] };
                        }
                        return field;
                    });
                    setFields(processedFields);

                    // Initialize form values with defaults
                    const initialValues: Record<string, any> = {};
                    processedFields.forEach(f => {
                        if (f.default) initialValues[f.fieldname] = f.default;
                    });
                    setFormValues(initialValues);
                }
                setLinkOptions(prev => ({ ...prev, ...(link_options || {}) }));
            }
        } catch (err) {
            console.error("Failed to load form fields:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFieldChange = (fieldname: string, value: any) => {
        setFormValues(prev => ({ ...prev, [fieldname]: value }));
    };

    const checkDependency = (field: Field | null | undefined) => {
        if (!field || !field['depends_on']) return true;
        const dep = field['depends_on'] as string;
        if (!dep) return true;

        if (dep.startsWith('eval:')) {
            const expression = dep.replace('eval:', '').trim();
            const doc = formValues;

            try {
                if (expression.includes("==")) {
                    const [lhs, rhsraw] = expression.split("==");
                    const key = lhs.replace("doc.", "").trim();
                    const val = rhsraw.replace(/['"]/g, "").trim();
                    return doc[key] == val;
                }
                if (expression.includes("!==") || expression.includes("!=")) {
                    const operator = expression.includes("!==") ? "!==" : "!=";
                    const [lhs, rhsraw] = expression.split(operator);
                    const key = lhs.replace("doc.", "").trim();
                    const val = rhsraw.replace(/['"]/g, "").trim();
                    return doc[key] != val;
                }
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

    const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
        const neoButtonClasses = "px-5 py-2 !bg-red-200 hover:!bg-red-300 border border-gray-200 rounded-md font-semibold text-black shadow-sm transition-all";

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
        } else if (tableName === 'credit_distribution') {
            newRow.innerHTML = `
                <td class="p-2"><input type="text" name="credit_label_${rowId}" class="${inputClasses}" placeholder="Label" /></td>
                <td class="p-2"><input type="number" step="0.01" name="credit_percentage_${rowId}" class="${inputClasses}" placeholder="%" /></td>
                <td class="p-2"><input type="number" step="0.01" name="credit_amount_${rowId}" class="${inputClasses}" placeholder="Amount" /></td>
                <td class="p-2 text-center"><button type="button" class="${neoButtonClasses} delete-btn" data-table="${tableName}" data-id="${rowId}">Delete</button></td>
            `;
        }

        container.appendChild(newRow);

        const delBtn = newRow.querySelector('.delete-btn');
        delBtn?.addEventListener('click', () => removeTableRow(tableName, rowId));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting || !selectedType) return;
        setIsSubmitting(true);

        try {
            const formElement = e.currentTarget;
            const form = new FormData(formElement);
            const dataToSubmit: { [key: string]: any } = {};

            // Collect regular fields
            fields.forEach(field => {
                if (field.fieldtype !== 'Table' && field.fieldtype !== 'Section Break' && !field.hidden) {
                    const value = formValues[field.fieldname];
                    if (value !== undefined && value !== null) {
                        dataToSubmit[field.fieldname] = value;
                    }
                }
            });

            // Process ECS Dates table
            dataToSubmit.ecs_dates = tableRowsRef.current.ecs_dates.map(id => {
                const ecs_date = form.get(`ecs_date_${id}`);
                const amount = form.get(`amount_${id}`);
                const remarks = form.get(`remarks_${id}`);

                if (!ecs_date && (!amount || parseFloat(amount as string) === 0)) return null;

                return {
                    ecs_date: ecs_date || "",
                    amount: amount ? parseFloat(amount as string) : 0,
                    remarks: remarks || "",
                };
            }).filter(row => row !== null);

            // Process Credit Distribution table
            dataToSubmit.credit_distribution = tableRowsRef.current.credit_distribution.map(id => {
                const label = form.get(`credit_label_${id}`);
                const percentage = form.get(`credit_percentage_${id}`);
                const amount = form.get(`credit_amount_${id}`);

                if (!label && !percentage && !amount) return null;

                return {
                    label: label || "",
                    percentage: percentage ? parseFloat(percentage as string) : 0,
                    amount: amount ? parseFloat(amount as string) : 0,
                };
            }).filter(row => row !== null);

            console.log('Submitting Deposit Slip:', dataToSubmit);

            // Use the correct save API based on selected type
            const response = await fetch(`/api/method/${DEPOSIT_SLIP_TYPES[selectedType].save}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ doc_data: JSON.stringify(dataToSubmit) })
            });
            const result = await response.json();
            console.log('Save result:', result);

            if (result?.message?.name) {
                alert(`Deposit Slip saved successfully! Document: ${result.message.name}`);
            } else {
                alert("Deposit Slip saved successfully!");
            }
            navigate(-1);
        } catch (err: any) {
            console.error('Submission error:', err);
            alert(`Submission Failed: ${err.message || 'Unknown Error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderFormField = (field: Field) => {
        if (!checkDependency(field)) return null;
        if (!field || field.hidden || field.fieldtype === 'Section Break' || field.fieldtype === 'SectionBreak' || field.fieldtype === 'Column Break' || field.fieldtype === 'ColumnBreak') return null;
        if (field.fieldname.endsWith('_multiplier') || field.fieldname.endsWith('_label')) return null;
        if (field.fieldtype === 'Table') return null;

        const commonProps = {
            id: field.fieldname,
            name: field.fieldname,
            className: inputClasses,
            readOnly: field.read_only === 1,
            required: field.mandatory === 1,
            disabled: field.read_only === 1,
            value: formValues[field.fieldname] || '',
            onChange: (e: any) => handleFieldChange(field.fieldname, e.target.value)
        };

        const renderInput = () => {
            if (field.fieldtype === "Link") {
                let opts = linkOptions[field.fieldname] || [];
                if (opts.length === 0) {
                    if (field.fieldname === 'project_title' || field.fieldname === 'research_project') {
                        if (linkOptions['project_ref_no']) opts = linkOptions['project_ref_no'];
                        else if (linkOptions['project_registration']) opts = linkOptions['project_registration'];
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

    const groupFieldsBySection = () => {
        const sections: { title: string; fields: Field[]; sectionField?: Field }[] = [];
        let currentSection: { title: string; fields: Field[]; sectionField?: Field } | null = null;

        if (fields.length > 0 && fields[0].fieldtype !== 'Section Break' && fields[0].fieldtype !== 'SectionBreak') {
            currentSection = { title: 'General Information', fields: [] };
        }

        fields.forEach(field => {
            if (field.fieldtype === 'Section Break' || field.fieldtype === 'SectionBreak') {
                if (currentSection) sections.push(currentSection);
                currentSection = { title: field.label || 'Section', fields: [], sectionField: field };
            } else if (currentSection && !field.hidden && field.fieldtype !== 'Table' && field.fieldtype !== 'Column Break' && field.fieldtype !== 'ColumnBreak') {
                currentSection.fields.push(field);
            }
        });
        if (currentSection) sections.push(currentSection);
        return sections;
    };

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
                            {selectedType && <p className="text-sm text-gray-500 mt-1">{DEPOSIT_SLIP_TYPES[selectedType]?.label}</p>}
                        </div>
                    </div>
                </header>

                {/* Deposit Slip Type Selector */}
                <FrappeCard className="mb-6">
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-800">
                            Select Deposit Slip Type <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                value={selectedType}
                                onChange={(e) => handleTypeChange(e.target.value)}
                                className="w-full h-12 px-4 pr-10 bg-white border-2 border-gray-300 rounded-lg text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/25 focus:border-[#0EA5A4] appearance-none"
                            >
                                <option value="">-- Select Deposit Slip Type --</option>
                                {Object.entries(DEPOSIT_SLIP_TYPES).map(([key, config]) => (
                                    <option key={key} value={key}>{config.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                        </div>
                    </div>
                </FrappeCard>

                {/* Loading State */}
                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="text-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5A4] mx-auto"></div>
                            <p className="mt-4 text-lg font-semibold text-gray-600">Loading form fields...</p>
                        </div>
                    </div>
                )}

                {/* Form Content */}
                {!loading && selectedType && fields.length > 0 && (
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

                            {/* ECS Dates Table */}
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

                            {/* Credit Distribution Table */}
                            <NeoSection title="Credit Distribution">
                                <div className="overflow-x-auto border border-gray-200 rounded-md">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr className="divide-x divide-gray-100">
                                                {['Label', 'Percentage (%)', 'Amount (₹)', ''].map((h) => (
                                                    <th key={h} className="p-3 font-semibold text-gray-700 text-sm text-left">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody ref={el => { if (el) containerRef.current['credit_distribution'] = el; }} className="divide-y divide-gray-200 bg-white" />
                                    </table>
                                </div>
                                <FrappeButton onClick={() => addTableRow('credit_distribution')} className="bg-[#A5D6A7] hover:bg-[#81C784] mt-4">
                                    + Add Row
                                </FrappeButton>
                            </NeoSection>
                        </FrappeCard>

                        <div className="mt-8 flex justify-end gap-4">
                            <FrappeButton type="button" onClick={() => navigate(-1)} className="bg-gray-200 hover:bg-gray-300">Cancel</FrappeButton>
                            <FrappeButton type="submit" disabled={isSubmitting} className="bg-[#0EA5A4] text-white hover:bg-[#0C8F8E] disabled:bg-gray-300">{isSubmitting ? 'Saving...' : 'Save Deposit Slip'}</FrappeButton>
                        </div>
                    </form>
                )}

                {/* No Type Selected */}
                {!loading && !selectedType && (
                    <div className="text-center py-20 text-gray-500">
                        <p className="text-lg">Please select a deposit slip type to continue.</p>
                    </div>
                )}

                {/* No Fields Loaded */}
                {!loading && selectedType && fields.length === 0 && (
                    <div className="text-center py-20 text-yellow-600">
                        <p className="text-lg font-semibold">No form fields found for this deposit slip type.</p>
                        <p className="text-sm text-gray-500 mt-2">Please check the backend API configuration.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DepositSlipForm;
