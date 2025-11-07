import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppSidebar } from '@/components/RndSidebar'; // Adjust path if needed
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';
import { cn } from '@/lib/utils';
import { ArrowLeftIcon } from 'lucide-react';

// --- Type Interfaces (similar to AddFundSanction) ---
interface Field {
    fieldname: string;
    label: string;
    fieldtype: string;
    options?: string;
    mandatory?: boolean;
    hidden?: boolean;
    read_only?: boolean;
    description?: string;
}

interface FormMetadataResponse {
    message: {
        fields: Field[];
    }
}

// --- Reusable Neo-Brutalism Components ---
const NeoSection = ({ title, children, description }: { title: string; children: React.ReactNode; description?: string }) => (
    <div className="space-y-4">
        <div className="border-b-2 border-black pb-3">
            <h2 className="text-2xl font-extrabold text-black uppercase tracking-tight">{title}</h2>
            {description && <p className="font-mono text-gray-700 mt-1">{description}</p>}
        </div>
        {children}
    </div>
);

const NeoButton = ({ children, onClick, disabled, type = "button", className = "" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit", className?: string }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "px-5 py-3 bg-white border-2 border-black rounded-md font-bold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
            "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
            "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-300",
            className
        )}
    >
        {children}
    </button>
);

const Reimbursement: React.FC = () => {
    const navigate = useNavigate();
    const [fields, setFields] = useState<Field[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Replace with your actual endpoint to get form fields
    const { data, error } = useFrappeGetCall<FormMetadataResponse>(
        'rndopsapp.rndopsapp.api.get_reimbursement_form_fields'
    );
    
    // Replace with your actual endpoint to submit form data
    const { call: submitReimbursement } = useFrappePostCall(
        'rndopsapp.rndopsapp.api.submit_reimbursement_form'
    );

    useEffect(() => {
        if (data?.message.fields) {
            setFields(data.message.fields);
            setLoading(false);
        }
        if (error) {
            console.error("Failed to load form metadata:", error);
            setLoading(false);
        }
    }, [data, error]);

    const renderFormField = (field: Field) => {
        if (field.hidden) return null;
        const commonClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:bg-gray-200";

        switch (field.fieldtype) {
            case 'Select':
                return (
                    <select name={field.fieldname} className={commonClasses} required={field.mandatory} disabled={field.read_only}>
                        {field.options?.split('\n').map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                );
            case 'Small Text':
                return <textarea name={field.fieldname} className={`${commonClasses} h-24 py-2`} required={field.mandatory} disabled={field.read_only}></textarea>;
            case 'Check':
                 return (
                    <div className="flex items-center gap-3 bg-stone-100 p-3 border-2 border-black rounded-md">
                        <input type="checkbox" id={field.fieldname} name={field.fieldname} className="h-6 w-6 accent-black border-2 border-black" required={field.mandatory} disabled={field.read_only} />
                        <label htmlFor={field.fieldname} className="font-semibold text-black">{field.label}</label>
                    </div>
                 );
            // Add cases for other field types like Date, Currency, etc. if needed
            default: // Handles 'Data' and other text-like fields
                return <input type="text" name={field.fieldname} className={commonClasses} required={field.mandatory} disabled={field.read_only} />;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.target as HTMLFormElement);
        const formDataObject = Object.fromEntries(formData.entries());
        
        try {
            await submitReimbursement(formDataObject);
            alert("Reimbursement submitted successfully!");
            navigate(-1); // Go back to the previous page
        } catch (err) {
            console.error("Submission failed:", err);
            alert("Failed to submit reimbursement.");
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading) return <div className="text-center p-10 font-bold">Loading Form...</div>;

    const rulesContent = fields.find(f => f.fieldname === 'rules_content');
    const mainFields = fields.filter(f => !['Section Break', 'HTML', 'Table', 'Check'].includes(f.fieldtype));
    const declarationFields = fields.filter(f => f.fieldtype === 'Check');
    
    return (
        <div className="bg-[#FDFCEC] min-h-screen">
            <AppSidebar isPermanentEmployee={true} />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform">
                            <ArrowLeftIcon className="h-6 w-6" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-extrabold text-black">Reimbursement Application</h1>
                            <p className="text-gray-700 font-mono mt-1">Fill out the details below to apply for reimbursement.</p>
                        </div>
                    </div>
                </header>
                
                <form onSubmit={handleSubmit}>
                    <div className="bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)] space-y-12">
                        {rulesContent && (
                            <div className="prose prose-sm max-w-none text-gray-800 font-mono p-4 bg-amber-100 border-2 border-black rounded-md"
                                 dangerouslySetInnerHTML={{ __html: rulesContent.options || '' }}
                            />
                        )}

                        <NeoSection title="Applicant & Project Details">
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {mainFields.map(field => (
                                    <div key={field.fieldname}>
                                        <label htmlFor={field.fieldname} className="block font-bold text-black text-lg mb-2 uppercase">{field.label}</label>
                                        {renderFormField(field)}
                                    </div>
                                ))}
                            </div>
                        </NeoSection>
                        
                        <NeoSection title="Particulars of Items">
                            <p className="font-mono">Item details table will be implemented here.</p>
                            {/* Placeholder for table component */}
                        </NeoSection>
                        
                        <NeoSection title="Declarations">
                            <div className="space-y-4">
                                {declarationFields.map(field => (
                                    <div key={field.fieldname}>
                                        {renderFormField(field)}
                                    </div>
                                ))}
                            </div>
                        </NeoSection>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <NeoButton type="submit" disabled={isSubmitting} className="bg-[#A5D6A7] hover:bg-[#81C784]">
                            {isSubmitting ? 'Submitting...' : 'Submit Application'}
                        </NeoButton>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default Reimbursement;