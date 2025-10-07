import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { FC, ReactNode, ChangeEvent, FormEvent } from 'react';

// --- Type Definitions for TypeScript ---

// Declare jspdf and html2canvas on the window object to avoid TypeScript errors
// These are loaded via script tags in the useEffect hook.
declare global {
    interface Window {
        jspdf: any;
        html2canvas: any;
    }
}

interface Field {
  fieldname: string;
  fieldtype: 'Data' | 'Link' | 'Text' | 'Long Text' | 'Check' | 'Int' | 'Float';
  label: string;
  reqd?: number;
  options?: string;
  default?: string;
  precision?: string;
  section: string;
}

interface FormSchema {
  fields: Field[];
}

interface FormData {
  [key: string]: string | number | boolean | File[];
  files: File[];
}

interface Section {
    title: string;
    description: string;
    icon: ReactNode;
}

// --- Helper Data from JSON Schema ---
const formSchema: FormSchema = {
  fields: [
    { fieldname: "project_number", fieldtype: "Data", label: "Project Number", reqd: 1, section: "Core Details" },
    { fieldname: "ref_num", fieldtype: "Data", label: "Reference Number", reqd: 1, section: "Core Details" },
    { fieldname: "project_title", fieldtype: "Text", label: "Project Title", reqd: 1, section: "Core Details" },
    { fieldname: "project_type", fieldtype: "Data", label: "Project Type", section: "Core Details" },
    { fieldname: "project_category", fieldtype: "Data", label: "Project Category", section: "Core Details" },
    { fieldname: "other_project_category_name", fieldtype: "Data", label: "Other Project Category", section: "Core Details" },
    { fieldname: "employee_id", fieldtype: "Link", label: "Employee ID", options: "loginuser_", section: "PI Information" },
    { fieldname: "initiated_employee_id", fieldtype: "Link", label: "Initiated By Employee ID", options: "loginuser_", section: "PI Information" },
    { fieldname: "name_of_registrant", fieldtype: "Data", label: "Registrant Name", section: "PI Information" },
    { fieldname: "project_registered_by", fieldtype: "Data", label: "Project Registered By", section: "PI Information" },
    { fieldname: "pi_webmail", fieldtype: "Data", label: "PI Webmail", options: "Email", section: "PI Information" },
    { fieldname: "designation", fieldtype: "Data", label: "Designation", section: "PI Information" },
    { fieldname: "department_id", fieldtype: "Int", label: "Department ID", section: "PI Information" },
    { fieldname: "project_objectives", fieldtype: "Long Text", label: "Project Objectives", section: "Scope & Funding" },
    { fieldname: "project_deliverables", fieldtype: "Long Text", label: "Project Deliverables", section: "Scope & Funding" },
    { fieldname: "project_executive_summery", fieldtype: "Long Text", label: "Executive Summary", section: "Scope & Funding" },
    { fieldname: "funding_agency_type", fieldtype: "Data", label: "Funding Agency Type", section: "Scope & Funding" },
    { fieldname: "funding_agency", fieldtype: "Link", label: "Funding Agency", options: "fundingagency_", section: "Scope & Funding" },
    { fieldname: "project_scheme", fieldtype: "Data", label: "Project Scheme", section: "Scope & Funding" },
    { fieldname: "gstin_number", fieldtype: "Data", label: "GSTIN Number", section: "Scope & Funding" },
    { fieldname: "pi_from_iitg", fieldtype: "Check", label: "PI from IITG", default: "0", section: "Scope & Funding" },
    { fieldname: "has_copi", fieldtype: "Check", label: "Has Co-PI", default: "0", section: "Scope & Funding" },
    { fieldname: "collaborating_institute", fieldtype: "Data", label: "Collaborating Institute", section: "Scope & Funding" },
    { fieldname: "total_budget_amount", fieldtype: "Float", label: "Total Budget Amount", precision: "2", section: "Budget & Duration" },
    { fieldname: "overhead_amount_percentage", fieldtype: "Float", label: "Overhead Percentage", precision: "2", section: "Budget & Duration" },
    { fieldname: "overhead_amount", fieldtype: "Float", label: "Overhead Amount", precision: "2", section: "Budget & Duration" },
    { fieldname: "budget_with_overhead_amount", fieldtype: "Float", label: "Budget with Overhead", precision: "2", section: "Budget & Duration" },
    { fieldname: "gst", fieldtype: "Float", label: "GST", precision: "2", section: "Budget & Duration" },
    { fieldname: "grand_total", fieldtype: "Float", label: "Grand Total", precision: "2", section: "Budget & Duration" },
    { fieldname: "duration_in_month", fieldtype: "Data", label: "Duration (Months)", section: "Budget & Duration" },
    { fieldname: "duration_in_days", fieldtype: "Data", label: "Duration (Days)", section: "Budget & Duration" },
    { fieldname: "project_implementation_location", fieldtype: "Data", label: "Implementation Location", section: "Logistics" },
    { fieldname: "clearance_required", fieldtype: "Data", label: "Clearance Required", section: "Logistics" },
    { fieldname: "clearance_ethics_committee", fieldtype: "Data", label: "Ethics Committee Clearance", section: "Logistics" },
    { fieldname: "international_travel", fieldtype: "Check", label: "International Travel Required", default: "0", section: "Logistics" },
    { fieldname: "space_required", fieldtype: "Check", label: "Space Required", default: "0", section: "Logistics" },
  ]
};

// --- SVG Icons ---
const FileSignatureIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 19.5v.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8.5L20 7.5V11" /><polyline points="14 2 14 8 20 8" /><path d="M15 18v2" /><path d="M12 18h6" /></svg> );
const CheckCircleIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>);
const InfoIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg> );
const UserIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> );
const BriefcaseIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg> );
const DollarSignIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> );
const SettingsIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg> );
const UploadCloudIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/></svg> );
const XIcon: FC<React.SVGProps<SVGSVGElement>> = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> );

// --- Reusable Components ---

interface FormInputProps {
  field: Field;
  value: string | number | boolean;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

const FormInput: FC<FormInputProps> = ({ field, value, onChange }) => {
  const { fieldname, fieldtype, label, reqd, options } = field;
  const commonClasses = "w-full px-4 py-2 mt-1 text-gray-700 bg-white border border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-indigo-500 focus:ring-opacity-50 transition duration-150 ease-in-out shadow-sm";
  const renderInput = () => {
    switch (fieldtype) {
      case 'Text': case 'Long Text': return <textarea id={fieldname} name={fieldname} value={value as string} onChange={onChange} required={!!reqd} className={`${commonClasses} h-28`} placeholder={`Enter ${label.toLowerCase()}...`} />;
      case 'Check': return ( <label htmlFor={fieldname} className="flex items-center space-x-3 h-10 mt-1 cursor-pointer"><input id={fieldname} name={fieldname} type="checkbox" checked={value as boolean} onChange={onChange} className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" /><span className="text-sm font-medium text-gray-800">{label}</span></label> );
      case 'Int': case 'Float': return <input id={fieldname} name={fieldname} type="number" value={value as string | number} onChange={onChange} required={!!reqd} className={commonClasses} step={fieldtype === 'Float' ? '0.01' : '1'} placeholder="0.00" />;
      default: const inputType = options === 'Email' ? 'email' : 'text'; return <input id={fieldname} name={fieldname} type={inputType} value={value as string} onChange={onChange} required={!!reqd} className={commonClasses} placeholder={`Enter ${label.toLowerCase()}`} />;
    }
  };
  if (fieldtype === 'Check') return <div className="md:col-span-2">{renderInput()}</div>;
  return ( <div className={fieldtype === 'Long Text' || fieldtype === 'Text' ? 'md:col-span-2' : ''}> <label htmlFor={fieldname} className="block text-sm font-medium text-gray-800"> {label} {reqd ? <span className="text-red-500">*</span> : ''} </label> {renderInput()} </div> );
};

interface FileUploadProps {
    files: File[];
    onFilesChange: (files: File[]) => void;
}

const FileUpload: FC<FileUploadProps> = ({ files, onFilesChange }) => {
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => { onFilesChange(e.target.files ? [...e.target.files] : []); };
    const removeFile = (indexToRemove: number) => { onFilesChange(files.filter((_, index) => index !== indexToRemove)); };
    return (
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-800 mb-1"> Attach Documents </label>
            <div className="mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-gray-300 border-dashed rounded-lg bg-gray-50">
                <div className="space-y-1 text-center">
                    <UploadCloudIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-gray-50 rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-gray-50 focus-within:ring-indigo-500">
                            <span>Upload files</span>
                            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                </div>
            </div>
            {files.length > 0 && (
                <div className="mt-4"><ul className="space-y-2">{files.map((file, index) => ( <li key={index} className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-gray-200 shadow-sm"><span className="text-sm text-gray-800 truncate font-medium">{file.name}</span><button type="button" onClick={() => removeFile(index)} className="text-gray-400 hover:text-red-600 transition-colors"><XIcon className="w-5 h-5" /></button></li> ))}</ul></div>
            )}
        </div>
    );
};

interface StepperProps {
    sections: Section[];
    currentSection: string;
    setCurrentSection: (section: string) => void;
}

const Stepper: FC<StepperProps> = ({ sections, currentSection, setCurrentSection }) => {
    const sectionIcons: {[key: string]: ReactNode} = { "Core Details": <InfoIcon className="w-5 h-5"/>, "PI Information": <UserIcon className="w-5 h-5"/>, "Scope & Funding": <BriefcaseIcon className="w-5 h-5"/>, "Budget & Duration": <DollarSignIcon className="w-5 h-5"/>, "Logistics": <SettingsIcon className="w-5 h-5"/>, "Documents": <UploadCloudIcon className="w-5 h-5"/> };
    const currentSectionIndex = sections.findIndex(s => s.title === currentSection);
    return (
        <aside className=" lg:col-span-1 p-6 bg-white rounded-xl shadow-md border border-gray-100 h-fit sticky top-8">
            <h2 className="text-lg font-bold text-gray-800 mb-1">Registration Progress</h2>
            <p className="text-sm text-gray-500 mb-6">Follow the steps to complete.</p>
            <nav><ul className="space-y-2">{sections.map((section, index) => { const isCompleted = index < currentSectionIndex; const isCurrent = index === currentSectionIndex; return ( <li key={section.title}><button type="button" onClick={() => setCurrentSection(section.title)} className={`w-full flex items-center text-left p-3 rounded-lg transition-all duration-200 ${ isCurrent ? 'bg-indigo-50 text-indigo-700 shadow-sm' : isCompleted ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed' }`} disabled={!isCurrent && !isCompleted}><div className={`flex items-center justify-center w-8 h-8 rounded-full mr-4 ${ isCurrent ? 'bg-indigo-600 text-white' : isCompleted ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500' }`}>{isCompleted ? <CheckCircleIcon className="w-5 h-5"/> : sectionIcons[section.title]}</div><div className="flex-grow"><p className={`font-bold text-sm ${isCurrent ? 'text-indigo-800' : 'text-gray-800'}`}>{section.title}</p><p className="text-xs text-gray-500">{section.description}</p></div></button></li> )})}</ul></nav>
        </aside>
    );
};

interface SubmissionReportProps {
    formData: FormData;
    sections: Section[];
    schema: FormSchema;
}

const SubmissionReport = React.forwardRef<HTMLDivElement, SubmissionReportProps>(({ formData, sections, schema }, ref) => {
    return (
        <div ref={ref} className="p-10 bg-white text-gray-800" style={{ width: '800px', fontFamily: 'sans-serif' }}>
            <div className="text-center mb-8 border-b-2 border-gray-200 pb-6">
                 <h1 className="text-3xl font-bold text-gray-900">Project Registration Summary</h1>
                 <p className="text-sm text-gray-500 mt-2">Date Generated: {new Date().toLocaleDateString()}</p>
            </div>
            {sections.map(section => {
                 if (section.title === 'Documents') return null;
                 const sectionFields = schema.fields.filter(f => f.section === section.title);
                 const hasData = sectionFields.some(field => formData[field.fieldname] && formData[field.fieldname] !== '');
                 if (!hasData) return null;

                 return (
                     <div key={section.title} className="mb-8 break-inside-avoid">
                         <h2 className="text-xl font-bold border-b-2 border-indigo-500 pb-2 mb-4 text-indigo-700">{section.title}</h2>
                         <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                             {sectionFields.map(field => {
                                 const value = formData[field.fieldname];
                                 if (value === '' || value === false || value === null || value === undefined) return null;
                                 return (
                                     <div key={field.fieldname} className={`flex flex-col ${field.fieldtype === 'Long Text' || field.fieldtype === 'Text' ? 'col-span-2' : ''}`}>
                                         <span className="text-sm font-semibold text-gray-500">{field.label}</span>
                                         <span className="text-md mt-1 text-gray-800 whitespace-pre-wrap">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                 );
            })}
             {formData.files && formData.files.length > 0 && (
                 <div className="mb-6 break-inside-avoid">
                      <h2 className="text-xl font-bold border-b-2 border-indigo-500 pb-2 mb-4 text-indigo-700">Attached Documents</h2>
                      <ul className="list-disc list-inside space-y-1">
                          {formData.files.map((file, index) => <li key={index} className="text-gray-800">{file.name}</li>)}
                      </ul>
                 </div>
             )}
        </div>
    );
});

const ProjectRegistration: FC = () => {
  const sections: Section[] = useMemo(() => [ { title: 'Core Details', description: "Project identification", icon: <InfoIcon/> }, { title: 'PI Information', description: "Registrant & leader details", icon: <UserIcon/> }, { title: 'Scope & Funding', description: "Goals & financial backing", icon: <BriefcaseIcon/> }, { title: 'Budget & Duration', description: "Financials & timeline", icon: <DollarSignIcon/> }, { title: 'Logistics', description: "Resources & clearances", icon: <SettingsIcon/> }, { title: 'Documents', description: "Attach supporting files", icon: <UploadCloudIcon/> } ], []);
  
  const getInitialState = (): FormData => {
      const initialState: FormData = { files: [] };
      formSchema.fields.forEach(field => {
          if (field.fieldtype === 'Check') {
              initialState[field.fieldname] = field.default === '1';
          } else {
              initialState[field.fieldname] = '';
          }
      });
      return initialState;
  };

  const [formData, setFormData] = useState<FormData>(getInitialState());
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [currentSection, setCurrentSection] = useState<string>(sections[0].title);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Script load error for ${src}`));
        document.body.appendChild(script);
      });
    };
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js').catch(err => console.error(err));
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js').catch(err => console.error(err));
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prevState => ({ ...prevState, [name]: type === 'checkbox' ? checked : value }));
  };
  
  const handleFilesChange = (selectedFiles: File[]) => { setFormData(prevState => ({...prevState, files: selectedFiles})); };
  const handleNext = () => { const currentIndex = sections.findIndex(s => s.title === currentSection); if (currentIndex < sections.length - 1) { setCurrentSection(sections[currentIndex + 1].title); } };
  const handleBack = () => { const currentIndex = sections.findIndex(s => s.title === currentSection); if (currentIndex > 0) { setCurrentSection(sections[currentIndex - 1].title); } };
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); console.log("Form Submitted:", formData); setSubmitted(true); };

  const handleDownloadPdf = async () => {
    if (!reportRef.current || typeof window.jspdf === 'undefined' || typeof window.html2canvas === 'undefined') {
        alert("PDF generation library is still loading. Please try again in a moment.");
        return;
    }
    setIsDownloading(true);
    try {
        const { jsPDF } = window.jspdf;
        const canvas = await window.html2canvas(reportRef.current, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = imgProps.height / imgProps.width;
        const imgHeight = pdfWidth * ratio;
        let heightLeft = imgHeight;
        let position = 0;
        
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
        }
        pdf.save('project-registration-summary.pdf');
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert("Sorry, an error occurred while generating the PDF.");
    } finally {
        setIsDownloading(false);
    }
  };
  
  const renderFieldsForSection = (sectionTitle: string) => { 
      const sectionFields = formSchema.fields.filter(field => field.section === sectionTitle);
      if (sectionTitle === 'Documents') { 
          return <FileUpload files={formData.files} onFilesChange={handleFilesChange} />; 
      } 
      return sectionFields.map(field => <FormInput key={field.fieldname} field={field} value={formData[field.fieldname] as string | number | boolean} onChange={handleChange} />); 
  };
  const currentSectionIndex = sections.findIndex(s => s.title === currentSection);

  if (submitted) {
    return (
      <>
        <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
            <SubmissionReport ref={reportRef} formData={formData} sections={sections} schema={formSchema} />
        </div>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center py-12 px-6 bg-white rounded-xl shadow-lg border border-gray-100">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4"/>
                <h2 className="text-3xl font-bold text-gray-800">Thank You!</h2>
                <p className="mt-2 text-gray-600">Your project registration has been submitted successfully.</p>
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                    <button onClick={handleDownloadPdf} disabled={isDownloading} className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 disabled:bg-indigo-400 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg w-full sm:w-auto">
                        {isDownloading ? 'Downloading...' : 'Download PDF'}
                    </button>
                    <button onClick={() => { setFormData(getInitialState()); setCurrentSection(sections[0].title); setSubmitted(false); }} className="px-6 py-2.5 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-500/20 transition-all duration-200 ease-in-out border border-gray-300 shadow-sm w-full sm:w-auto">
                      Register Another Project
                    </button>
                </div>
            </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-900">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-10 text-center">
            <div className="inline-flex items-center justify-center bg-indigo-100 p-4 rounded-full mb-4 ring-8 ring-indigo-50"><FileSignatureIcon className="h-10 w-10 text-indigo-600" /></div>
            <h1 className="text-4xl font-extrabold text-gray-800 tracking-tight">Project Registration Form</h1>
            <p className="text-gray-500 mt-2 max-w-2xl mx-auto">Please fill out all sections accurately to register your new project.</p>
        </header>
        <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-12">
            <Stepper sections={sections} currentSection={currentSection} setCurrentSection={setCurrentSection} />
            <div className="lg:col-span-3">
                <form onSubmit={handleSubmit}>
                    <div className="bg-white p-8 rounded-xl shadow-md border border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-800">{sections[currentSectionIndex].title}</h2>
                        <p className="text-sm text-gray-500 mt-1 mb-8">{sections[currentSectionIndex].description}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">{renderFieldsForSection(currentSection)}</div>
                    </div>
                    <div className="mt-8 pt-6 flex justify-between items-center border-t border-gray-200">
                        <button type="button" onClick={handleBack} disabled={currentSectionIndex === 0} className="px-6 py-2.5 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-gray-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out border border-gray-300 shadow-sm">Back</button>
                        {currentSectionIndex < sections.length - 1 ? (
                            <button type="button" onClick={handleNext} className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 transition-all duration-200 ease-in-out shadow-md hover:shadow-lg">Next Step</button>
                        ) : (
                            <button type="submit" className="px-8 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/50 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 duration-200 ease-in-out">Submit Registration</button>
                        )}
                    </div>
                </form>
            </div>
        </main>
      </div>
    </div>
  );
}

export default ProjectRegistration;
