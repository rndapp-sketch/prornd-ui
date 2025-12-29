import React, { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useFrappeGetCall, useFrappeGetDoc, useFrappePostCall } from "frappe-react-sdk";
import { ArrowLeft, IndianRupee, FileText, CreditCard, Calculator, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/RndSidebar";
import { GlobalLoader } from "@/components/ui/global-loader";

// --- TYPE DEFINITIONS ---
interface Field {
    fieldname: string;
    label: string | null;
    fieldtype: string;
    options?: string | null;
    mandatory: number;
    hidden: number;
    read_only: number;
    description?: string | null;
    default?: any;
    depends_on?: string | null;
    depends_on_eval?: string | null;
}

interface LinkOption {
    value: string;
    label: string;
}

interface FormData {
    [key: string]: any;
}

// --- STYLED COMPONENTS ---
const FrappeCard = ({ title, children, className, icon }: { title?: string; children: React.ReactNode; className?: string; icon?: React.ReactNode }) => (
    <div className={cn("bg-white border border-gray-300 rounded-xl shadow-sm", className)}>
        {title && (
            <div className="px-6 py-4 border-b border-gray-300 flex items-center gap-3">
                {icon && <div className="p-2 bg-[#E0F7F6] rounded-lg">{icon}</div>}
                <h3 className="text-lg font-bold text-black uppercase tracking-tight">{title}</h3>
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

const FrappeButton = ({ children, onClick, disabled, className, variant = 'primary', type = 'button' }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
    variant?: 'primary' | 'ghost' | 'outline' | 'action';
    type?: 'button' | 'submit';
}) => (
    <button
        type={type}
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

// --- INPUT STYLES ---
const inputClasses = "w-full h-11 px-4 bg-white border border-gray-300 rounded-lg text-black font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/30 focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-50";
const selectClasses = "w-full h-11 px-4 bg-white border border-gray-300 rounded-lg text-black font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/30 focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100";

// --- HELPER: Evaluate depends_on condition ---
const evaluateDependsOn = (dependsOn: string | null | undefined, formData: FormData): boolean => {
    if (!dependsOn) return true;

    try {
        // Remove 'eval:' prefix if present
        let expression = dependsOn;
        if (expression.startsWith('eval:')) {
            expression = expression.substring(5);
        }

        // Create a safe evaluation context with 'doc' as formData
        const doc = formData;

        // Handle common patterns safely
        // Pattern: doc.fieldname=='value' or doc.fieldname=="value"
        const equalityMatch = expression.match(/doc\.([\w_]+)\s*[==]+\s*['"]([^'"]*)['"]/);
        if (equalityMatch) {
            const [, fieldName, expectedValue] = equalityMatch;
            return doc[fieldName] === expectedValue;
        }

        // Pattern: doc.fieldname!='value' or doc.fieldname!=="value"
        const notEqualMatch = expression.match(/doc\.([\w_]+)\s*!==?\s*['"]([^'"]*)['"]/);
        if (notEqualMatch) {
            const [, fieldName, expectedValue] = notEqualMatch;
            return doc[fieldName] !== expectedValue;
        }

        // Pattern: doc.fieldname.includes('value')
        const includesMatch = expression.match(/doc\.([\w_]+)\.includes\(['"]([^'"]*)['"]\)/);
        if (includesMatch) {
            const [, fieldName, searchValue] = includesMatch;
            const fieldValue = doc[fieldName];
            return typeof fieldValue === 'string' && fieldValue.includes(searchValue);
        }

        // Fallback: try eval (use with caution)
        return eval(expression);
    } catch (e) {
        console.warn('Failed to evaluate depends_on:', dependsOn, e);
        return true; // Show field if evaluation fails
    }
};

// --- FORM FIELD COMPONENT ---
const FormField = memo(({ field, value, options, onChange, formData }: {
    field: Field;
    value: any;
    options?: LinkOption[];
    onChange: (fieldname: string, value: any) => void;
    formData: FormData;
}) => {
    if (!field || field.hidden || !field.label) return null;

    // Check depends_on condition
    const dependsOn = field.depends_on || field.depends_on_eval;
    if (!evaluateDependsOn(dependsOn, formData)) {
        return null;
    }

    const commonProps = {
        id: field.fieldname,
        name: field.fieldname,
        readOnly: !!field.read_only,
        disabled: !!field.read_only,
        value: value ?? '',
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => onChange(field.fieldname, e.target.value)
    };

    const renderInput = () => {
        switch (field.fieldtype) {
            case "Link":
            case "Select":
                const selectOptions = field.fieldtype === "Select"
                    ? (field.options?.split('\n').filter(o => o) || []).map(opt => ({ value: opt, label: opt }))
                    : options || [];
                return (
                    <select {...commonProps} className={selectClasses}>
                        <option value="">Select...</option>
                        {selectOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );
            case "Currency":
            case "Float":
            case "Int":
                return <input type="number" {...commonProps} className={inputClasses} step={field.fieldtype === 'Int' ? '1' : 'any'} />;
            case "Date":
                return <input type="date" {...commonProps} className={inputClasses} />;
            case "Small Text":
            case "Text":
                return <textarea {...commonProps} rows={3} className={`${inputClasses} h-auto py-3`} />;
            default:
                return <input type="text" {...commonProps} className={inputClasses} />;
        }
    };

    return (
        <div className="space-y-2">
            <label htmlFor={field.fieldname} className="block font-bold text-black text-sm uppercase">
                {field.label}
                {!!field.mandatory && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderInput()}
            {field.description && <p className="text-xs text-gray-600">{field.description}</p>}
        </div>
    );
});

// --- WORKFLOW ACTIONS COMPONENT ---
const FundReceivedWorkflowActions = ({ docname, onActionComplete }: { docname: string; onActionComplete: () => void }) => {
    const { data, isLoading: actionsLoading } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_workflow_actions",
        { docname }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.perform_fund_received_action"
    );

    const handleAction = async (action: string) => {
        try {
            await performAction({ docname, action });
            onActionComplete();
        } catch (error) {
            console.error("Error performing action:", error);
        }
    };

    if (actionsLoading || !data?.message?.length) return null;

    return (
        <div className="flex gap-2">
            {data.message.map((action) => (
                <FrappeButton
                    key={action}
                    onClick={() => handleAction(action)}
                    disabled={actionLoading}
                    variant="action"
                >
                    {actionLoading ? "Processing..." : action}
                </FrappeButton>
            ))}
        </div>
    );
};

// --- DETAIL ROW COMPONENT ---
const DetailRow = ({ label, value, isCurrency = false }: { label: string; value: any; isCurrency?: boolean }) => (
    <div className="flex justify-between py-3 border-b border-gray-200 last:border-0">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={cn("text-sm font-bold", isCurrency ? "text-[#0EA5A4]" : "text-black")}>
            {isCurrency && value != null
                ? value.toLocaleString("en-IN", { style: "currency", currency: "INR" })
                : value || '-'}
        </span>
    </div>
);

// --- MAIN COMPONENT ---
const FundReceivedDetails = () => {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const prjreg_title = location.state?.prjreg_title;

    // Form state
    const [fields, setFields] = useState<Field[]>([]);
    const [formData, setFormData] = useState<FormData>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch deposit slip fields
    const { data: formFieldsData, isLoading: fieldsLoading } = useFrappeGetCall<{
        message: { fields: Field[]; prefill_data: FormData; link_options: Record<string, LinkOption[]> }
    }>("rndopsapp.rndopsapp.doctype.deposit_slip.deposit_slip.get_deposit_slip_fields", {});

    // Fetch fund received data (conditional fetch: only when prjreg_title exists)
    const { data: apiData, isLoading: listLoading, error: listError, mutate } = useFrappeGetCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
        prjreg_title ? { prjreg_title: prjreg_title, limit: 200, start: 0 } : undefined,
        prjreg_title || undefined
    );

    const { data: docData, isLoading: docLoading, error: docError } = useFrappeGetDoc("Fund Received", name || "");

    // Initialize form fields
    useEffect(() => {
        if (formFieldsData?.message) {
            const { fields: apiFields, prefill_data, link_options } = formFieldsData.message;
            setFields(apiFields || []);
            setLinkOptions(link_options || {});

            // Initialize form data with prefill and defaults
            const initialData: FormData = { ...prefill_data };
            apiFields?.forEach((field: Field) => {
                if (initialData[field.fieldname] === undefined) {
                    initialData[field.fieldname] = field.default ?? '';
                }
            });
            setFormData(initialData);
        }
    }, [formFieldsData]);

    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    // Normalize fund data
    const normalizeResponse = (raw: any) => {
        if (!raw) return [];
        if (raw.message?.message && Array.isArray(raw.message.message)) return raw.message.message;
        if (raw.message && Array.isArray(raw.message)) return raw.message;
        if (Array.isArray(raw)) return raw;
        return [];
    };

    const funds = normalizeResponse(apiData);
    const listData = funds.find((f: any) => f.name === name);
    const fundData = listData || docData;

    const isLoading = fieldsLoading || listLoading || (!listData && docLoading);
    const error = listError || (!listData && docError);

    if (isLoading) return <GlobalLoader isLoading={true} />;

    if (error || !fundData) {
        return (
            <div className="bg-gray-100 min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <FrappeCard className="text-center py-16">
                        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h2 className="text-xl font-bold text-black mb-2 uppercase">Fund Details Not Found</h2>
                        <p className="text-gray-900 mb-6">The requested fund details could not be loaded.</p>
                        <FrappeButton onClick={() => navigate(-1)}>Go Back</FrappeButton>
                    </FrappeCard>
                </main>
            </div>
        );
    }

    const { workflow_state, fund_received_amt, bank_account, received_amt_breakup, fund_transactions, sanction_ref_no } = fundData;

    // Group fields by sections with depends_on support
    const groupFieldsBySections = () => {
        const sections: { title: string; fields: Field[]; dependsOn?: string | null }[] = [];
        let currentSection: { title: string; fields: Field[]; dependsOn?: string | null } | null = null;

        for (const field of fields) {
            if (field.fieldtype === 'Section Break') {
                if (currentSection && currentSection.fields.length > 0) {
                    sections.push(currentSection);
                }
                currentSection = {
                    title: field.label || '',
                    fields: [],
                    dependsOn: field.depends_on || field.depends_on_eval
                };
            } else if (field.fieldtype !== 'Column Break' && field.fieldtype !== 'HTML' && !field.hidden && currentSection) {
                currentSection.fields.push(field);
            }
        }
        if (currentSection && currentSection.fields.length > 0) {
            sections.push(currentSection);
        }
        // Filter sections based on depends_on
        return sections.filter(s => s.fields.length > 0 && evaluateDependsOn(s.dependsOn, formData));
    };

    const sections = groupFieldsBySections();

    return (
        <div className="bg-gray-100 min-h-screen">
            <GlobalLoader isLoading={isSubmitting} />
            <AppSidebar />

            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <FrappeCard className="mb-6 p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                            >
                                <ArrowLeft className="h-5 w-5 text-gray-900" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-black uppercase tracking-tight">Fund Details & Deposit Slip</h1>
                                <p className="text-sm text-gray-700 font-medium mt-0.5">{name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <FundReceivedWorkflowActions docname={name || ""} onActionComplete={() => mutate()} />
                            <span className={cn("px-3 py-1.5 rounded-md border font-bold text-sm", {
                                "bg-amber-100 text-amber-800 border-amber-300": workflow_state === "Draft",
                                "bg-blue-100 text-blue-800 border-blue-300": workflow_state === "Submitted",
                                "bg-emerald-100 text-emerald-800 border-emerald-300": workflow_state === "Approved",
                                "bg-red-100 text-red-800 border-red-300": workflow_state === "Rejected",
                            })}>
                                {workflow_state}
                            </span>
                            <FrappeButton onClick={() => navigate(`/deposit-slip-new/${name}`)}>
                                <FileText className="h-4 w-4" />
                                Generate Deposit Slip
                            </FrappeButton>
                        </div>
                    </div>
                </FrappeCard>

                {/* Side by Side Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT SIDE: Deposit Slip Form */}
                    <div className="space-y-6">
                        <FrappeCard title="Deposit Slip Form" icon={<FileText className="h-4 w-4 text-[#0EA5A4]" />}>
                            <form className="space-y-6">
                                {sections.map((section, idx) => (
                                    <div key={idx} className="space-y-4">
                                        {section.title && (
                                            <h4 className="text-sm font-bold text-gray-900 uppercase border-b border-gray-200 pb-2">
                                                {section.title}
                                            </h4>
                                        )}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {section.fields.map(field => (
                                                <FormField
                                                    key={field.fieldname}
                                                    field={field}
                                                    value={formData[field.fieldname]}
                                                    options={linkOptions[field.options as string] || linkOptions[field.fieldname]}
                                                    onChange={handleChange}
                                                    formData={formData}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                    <FrappeButton variant="outline" onClick={() => navigate(-1)}>
                                        Cancel
                                    </FrappeButton>
                                    <FrappeButton type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? 'Saving...' : 'Save Deposit Slip'}
                                    </FrappeButton>
                                </div>
                            </form>
                        </FrappeCard>
                    </div>

                    {/* RIGHT SIDE: Fund Details */}
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <FrappeCard className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-[#E0F7F6] rounded-lg">
                                        <IndianRupee className="h-4 w-4 text-[#0EA5A4]" />
                                    </div>
                                    <span className="font-bold text-gray-700 text-xs uppercase">Total Amount</span>
                                </div>
                                <p className="text-xl font-bold text-[#0EA5A4]">
                                    {fund_received_amt?.toLocaleString("en-IN", { style: "currency", currency: "INR" }) || '₹0'}
                                </p>
                            </FrappeCard>
                            <FrappeCard className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-2 bg-[#E0F7F6] rounded-lg">
                                        <Building2 className="h-4 w-4 text-[#0EA5A4]" />
                                    </div>
                                    <span className="font-bold text-gray-700 text-xs uppercase">Bank Account</span>
                                </div>
                                <p className="text-lg font-bold text-black">{bank_account || "N/A"}</p>
                            </FrappeCard>
                        </div>

                        {/* Fund Info */}
                        <FrappeCard title="Fund Information" icon={<Calculator className="h-4 w-4 text-[#0EA5A4]" />}>
                            <div className="space-y-1">
                                <DetailRow label="Sanction Reference No." value={sanction_ref_no} />
                                <DetailRow label="Total Amount Received" value={fund_received_amt} isCurrency />
                                <DetailRow label="Bank Account" value={bank_account} />
                                <DetailRow label="Workflow State" value={workflow_state} />
                            </div>
                        </FrappeCard>

                        {/* Budget Breakup */}
                        <FrappeCard title="Budget Breakup" icon={<FileText className="h-4 w-4 text-[#0EA5A4]" />}>
                            <div className="overflow-x-auto border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-200">
                                        <tr className="divide-x divide-gray-300">
                                            <th className="px-3 py-2 text-left text-xs font-bold text-black uppercase">Account Head</th>
                                            <th className="px-3 py-2 text-right text-xs font-bold text-black uppercase">Amount</th>
                                            <th className="px-3 py-2 text-center text-xs font-bold text-black uppercase">Year</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300 bg-white">
                                        {received_amt_breakup?.map((item: any, idx: number) => (
                                            <tr key={item.name || idx} className="divide-x divide-gray-300 hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm font-medium text-black">{item.account_head}</td>
                                                <td className="px-3 py-2 text-sm text-right font-bold text-[#0EA5A4]">
                                                    {item.amount_received?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                                </td>
                                                <td className="px-3 py-2 text-sm text-center text-gray-900">{item.budget_year_funds_receive}</td>
                                            </tr>
                                        ))}
                                        {(!received_amt_breakup || received_amt_breakup.length === 0) && (
                                            <tr>
                                                <td colSpan={3} className="px-3 py-6 text-center text-gray-500">No breakup details</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </FrappeCard>

                        {/* Transactions */}
                        <FrappeCard title="Transactions" icon={<CreditCard className="h-4 w-4 text-[#0EA5A4]" />}>
                            <div className="overflow-x-auto border border-gray-300 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-300">
                                    <thead className="bg-gray-200">
                                        <tr className="divide-x divide-gray-300">
                                            <th className="px-3 py-2 text-left text-xs font-bold text-black uppercase">Date</th>
                                            <th className="px-3 py-2 text-left text-xs font-bold text-black uppercase">Transaction No</th>
                                            <th className="px-3 py-2 text-right text-xs font-bold text-black uppercase">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-300 bg-white">
                                        {fund_transactions?.map((item: any, idx: number) => (
                                            <tr key={item.name || idx} className="divide-x divide-gray-300 hover:bg-gray-50">
                                                <td className="px-3 py-2 text-sm font-mono text-gray-900">{item.transaction_date}</td>
                                                <td className="px-3 py-2 text-sm font-bold text-black">{item.transaction_number}</td>
                                                <td className="px-3 py-2 text-sm text-right font-bold text-[#0EA5A4]">
                                                    {item.amount?.toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                                </td>
                                            </tr>
                                        ))}
                                        {(!fund_transactions || fund_transactions.length === 0) && (
                                            <tr>
                                                <td colSpan={3} className="px-3 py-6 text-center text-gray-500">No transactions</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </FrappeCard>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default FundReceivedDetails;
