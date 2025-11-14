// import React, { useState, useEffect } from 'react';
// import { useFrappePostCall } from 'frappe-react-sdk';
// import { FormRender } from '../components/FormRender';
// import { ArrowLeftIcon } from 'lucide-react';
// import { useNavigate, useParams } from 'react-router-dom'; // Import useParams

// // --- TYPE DEFINITIONS ---
// interface Field {
//   fieldname: string;
//   label: string | null;
//   fieldtype: string;
//   mandatory: boolean;
//   read_only: boolean;
//   hidden: boolean;
//   options?: string | null;
//   description?: string | null;
// }

// interface LinkOption {
//   value: string;
//   label: string;
// }

// interface FormDataResponse {
//   message: { fields: any; link_options: any; };
//   fields: Field[];
//   link_options: Record<string, LinkOption[]>;
//   error?: string;
// }

// interface FormData {
//   [key: string]: any;
// }

// interface DynamicFormPageProps {
//   // doctype_name is now read from URL params, not props
//   title?: string;
//   submitButtonText?: string;
//   sections?: any[];
//   onSubmit?: (data: FormData) => Promise<void>;
//   showBackButton?: boolean;
// }

// // --- STYLES & UI COMPONENTS ---
// const NeoCard = ({ children, className }: any) => (
//   <div className={`bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)] ${className || ''}`}>
//     {children}
//   </div>
// );

// const NeoButton = ({ children, onClick, disabled, className, type = "button" }: any) => (
//   <button
//     type={type}
//     onClick={onClick}
//     disabled={disabled}
//     className={`px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed ${className || ''}`}
//   >
//     {children}
//   </button>
// );

// // --- MAIN COMPONENT ---
// const DynamicFormPage: React.FC<DynamicFormPageProps> = ({
//   title,
//   submitButtonText = 'Submit',
//   sections,
//   onSubmit,
//   showBackButton = true,
// }) => {
//   const navigate = useNavigate();
//   const { doctype_name } = useParams<{ doctype_name: string }>(); // Get doctype_name from URL params
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Handle case where doctype_name is not provided in URL
//   if (!doctype_name) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
//         <NeoCard className="max-w-md text-center">
//           <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
//           <p className="text-gray-700 mb-6">
//             Doctype name is missing from the URL. Please provide a valid doctype.
//           </p>
//           <NeoButton onClick={() => navigate(-1)} className="bg-blue-300">
//             Go Back
//           </NeoButton>
//         </NeoCard>
//       </div>
//     );
//   }

//   // Fetch form data from backend
//   const {
//     call: fetchFormData,
//     result: formDataResult,
//     error: formDataError,
//     loading: formDataLoading,
//   } = useFrappePostCall<FormDataResponse>('rndopsapp.rndopsapp.form_fields.get_dynamic_form_data');

//   const [fields, setFields] = useState<Field[]>([]);
//   const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//   const [loading, setLoading] = useState(true);

//   // Fetch form metadata when component mounts
//   useEffect(() => {
//     if (doctype_name) {
//       fetchFormData({ doctype_name });
//     }
//   }, [doctype_name, fetchFormData]); // Keep doctype_name in dependency array

//   // Process form data result
//   useEffect(() => {
//     if (formDataResult?.message) {
//       const { fields, link_options } = formDataResult.message;
//       setFields(fields || []);
//       setLinkOptions(link_options || {});
//       setLoading(false);
//     }

//     if (formDataError) {
//       console.error('Error fetching form data:', formDataError);
//       setLoading(false);
//     }
//   }, [formDataResult, formDataError]);

//   // Default submit handler
//   const handleSubmit = async (data: FormData) => {
//     if (onSubmit) {
//       setIsSubmitting(true);
//       try {
//         await onSubmit(data);
//         alert('Form submitted successfully!');
//       } catch (error) {
//         console.error('Submission error:', error);
//         alert('Failed to submit form');
//       } finally {
//         setIsSubmitting(false);
//       }
//     } else {
//       console.log('Form data:', data);
//       alert('Form submitted (check console for data)');
//     }
//   };

//   if (loading || formDataLoading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-4 border-black border-t-transparent mx-auto mb-4"></div>
//           <p className="text-lg font-semibold">Loading form...</p>
//         </div>
//       </div>
//     );
//   }

//   if (formDataError || !fields.length) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
//         <NeoCard className="max-w-md text-center">
//           <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Form</h2>
//           <p className="text-gray-700 mb-6">
//             {formDataError?.message || 'Failed to load form fields. Please try again.'}
//           </p>
//           <NeoButton onClick={() => navigate(-1)} className="bg-blue-300">
//             Go Back
//           </NeoButton>
//         </NeoCard>
//       </div>
//     );
//   }

//   return (
//     <div className="bg-[#FDFCEC] min-h-screen">
//       <main className="flex-1 p-4 md:p-8 w-full overflow-hidden max-w-7xl mx-auto">
//         {/* Header */}
//         {showBackButton && (
//           <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
//             <div className="flex items-center gap-4">
//               <button
//                 onClick={() => navigate(-1)}
//                 className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform"
//               >
//                 <ArrowLeftIcon className="h-6 w-6" />
//               </button>
//               <div>
//                 <h1 className="text-3xl font-extrabold text-black uppercase">
//                   {title || doctype_name.replace(/_/g, ' ')}
//                 </h1>
//                 <p className="text-gray-700 font-mono mt-1">
//                   Doctype: {doctype_name}
//                 </p>
//               </div>
//             </div>
//           </header>
//         )}

//         {/* Form */}
//         <FormRender
//           fields={fields}
//           linkOptions={linkOptions}
//           initialData={{}}
//           onSubmit={handleSubmit}
//           submitButtonText={submitButtonText}
//           title={title || doctype_name.replace(/_/g, ' ')}
//           sections={sections}
//           isSubmitting={isSubmitting}
//         />
//       </main>
//     </div>
//   );
// };

// export default DynamicFormPage;

// // --- USAGE EXAMPLE ---
// /*
// import DynamicFormPage from '@/components/DynamicFormPage';

// // In your route or component:
// <DynamicFormPage
//   doctype_name="Department_prornd"
//   title="Department Information"
//   submitButtonText="Save Department"
//   onSubmit={async (data) => {
//     const response = await fetch('/api/method/your.save.method', {
//       method: 'POST',
//       body: JSON.stringify(data)
//     });
//     return response.json();
//   }}
//   showBackButton={true}
// />

// // With custom sections:
// <DynamicFormPage
//   doctype_name="Department_prornd"
//   title="Department Information"
//   sections={[
//     {
//       title: "Basic Information",
//       fields: ['department_name', 'department_code'],
//       type: 'default'
//     },
//     {
//       title: "Department Details",
//       fields: ['head_of_department', 'contact_person', 'email'],
//       type: 'default'
//     }
//   ]}
//   onSubmit={handleSubmit}
// />
// */



// -=-=-=-===-=-=- new

// import React, { useState, useEffect } from 'react';
// import { useFrappePostCall } from 'frappe-react-sdk';
// import { FormRender } from '../components/FormRender';
// import { ArrowLeftIcon } from 'lucide-react';
// import { useNavigate, useParams } from 'react-router-dom';
// import { AppSidebar } from '../components/RndSidebar'; // Added Sidebar import
// import useUserRoleCheck from '../components/UserRoleCheck'; // Added hook for sidebar prop
// import { cn } from '@/lib/utils';

// // --- TYPE DEFINITIONS ---
// interface Field {
//   fieldname: string;
//   label: string | null;
//   fieldtype: string;
//   mandatory: boolean;
//   read_only: boolean;
//   hidden: boolean;
//   options?: string | null;
//   description?: string | null;
// }

// interface LinkOption {
//   value: string;
//   label: string;
// }

// interface FormDataResponse {
//   message: { fields: Field[]; link_options: Record<string, LinkOption[]> };
// }

// interface FormData {
//   [key: string]: any;
// }

// interface DynamicFormPageProps {
//   title?: string;
//   submitButtonText?: string;
//   sections?: any[];
//   onSubmit?: (data: FormData) => Promise<void>;
//   showBackButton?: boolean;
// }

// // --- REFINED UI COMPONENTS ---
// const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
//   <div className={cn("bg-white p-6 md:p-8 border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.1)]", className)}>
//     {children}
//   </div>
// );

// const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => (
//     <button
//       type={type}
//       onClick={onClick}
//       disabled={disabled}
//       className={cn(
//         "px-5 py-2.5 border-2 border-gray-900 rounded-lg font-semibold text-gray-900 shadow-[2px_2px_0px_rgba(0,0,0,0.1)] transition-all duration-150",
//         "hover:bg-stone-50 hover:-translate-y-0.5",
//         "active:shadow-[1px_1px_0px_rgba(0,0,0,0.1)] active:translate-y-0",
//         "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 disabled:bg-stone-100",
//         className
//       )}
//     >
//       {children}
//     </button>
// );

// // --- MAIN COMPONENT ---
// const DynamicFormPage: React.FC<DynamicFormPageProps> = ({
//   title,
//   submitButtonText = 'Submit',
//   sections,
//   onSubmit,
//   showBackButton = true,
// }) => {
//   const navigate = useNavigate();
//   const { doctype_name } = useParams<{ doctype_name: string }>();
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const isPermanentEmployee = useUserRoleCheck(); // Hook for sidebar

//   if (!doctype_name) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-stone-50">
//         <NeoCard className="max-w-md text-center">
//           <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
//           <p className="text-gray-700 mb-6">
//             Doctype name is missing from the URL. Please provide a valid doctype.
//           </p>
//           <NeoButton onClick={() => navigate(-1)}>
//             Go Back
//           </NeoButton>
//         </NeoCard>
//       </div>
//     );
//   }

//   const {
//     call: fetchFormData,
//     result: formDataResult,
//     error: formDataError,
//     loading: formDataLoading,
//   } = useFrappePostCall<FormDataResponse>('rndopsapp.rndopsapp.form_fields.get_dynamic_form_data');

//   const [fields, setFields] = useState<Field[]>([]);
//   const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (doctype_name) {
//       fetchFormData({ doctype_name });
//     }
//   }, [doctype_name, fetchFormData]);

//   useEffect(() => {
//     if (formDataResult?.message) {
//       const { fields, link_options } = formDataResult.message;
//       setFields(fields || []);
//       setLinkOptions(link_options || {});
//       setLoading(false);
//     }
//     if (formDataError) {
//       console.error('Error fetching form data:', formDataError);
//       setLoading(false);
//     }
//   }, [formDataResult, formDataError]);

//   const handleSubmit = async (data: FormData) => {
//     if (onSubmit) {
//       setIsSubmitting(true);
//       try {
//         await onSubmit(data);
//         alert('Form submitted successfully!');
//       } catch (error) {
//         console.error('Submission error:', error);
//         alert('Failed to submit form');
//       } finally {
//         setIsSubmitting(false);
//       }
//     } else {
//       console.log('Form data (no-op):', data);
//       alert('Form submitted (check console for data)');
//     }
//   };

//   if (loading || formDataLoading) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-stone-50">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-slate-400 mx-auto mb-4"></div>
//           <p className="text-lg font-semibold text-gray-900">Loading form...</p>
//         </div>
//       </div>
//     );
//   }

//   if (formDataError || !fields.length) {
//     return (
//       <div className="flex items-center justify-center min-h-screen bg-stone-50">
//         <NeoCard className="max-w-md text-center">
//           <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Form</h2>
//           <p className="text-gray-700 mb-6 font-mono">
//             {formDataError?.message || 'Failed to load form fields. Please try again.'}
//           </p>
//           <NeoButton onClick={() => navigate(-1)}>
//             Go Back
//           </NeoButton>
//         </NeoCard>
//       </div>
//     );
//   }

//   return (
//     <div className=" min-h-screen bg-stone-50">
//       <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
//       <main className="flex-1 p-4 md:p-8 w-full overflow-hidden max-w-7xl mx-auto">
//         {showBackButton && (
//           <header className="mb-8 p-4 bg-white border-2 border-gray-900 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">
//             <div className="flex items-center gap-4">
//               <button
//                 onClick={() => navigate(-1)}
//                 className="p-3 bg-white border-2 border-gray-900 rounded-lg transition-all duration-150 hover:bg-stone-50 active:translate-y-0.5"
//               >
//                 <ArrowLeftIcon className="h-6 w-6" />
//               </button>
//               <div>
//                 <h1 className="text-3xl font-bold text-gray-900">
//                   {title || doctype_name.replace(/_/g, ' ')}
//                 </h1>
//                 <p className="text-gray-700 font-mono mt-1">
//                   Doctype: {doctype_name}
//                 </p>
//               </div>
//             </div>
//           </header>
//         )}

//         <FormRender
//           fields={fields}
//           linkOptions={linkOptions}
//           initialData={{}}
//           onSubmit={handleSubmit}
//           submitButtonText={submitButtonText}
//           title={title || doctype_name.replace(/_/g, ' ')}
//           sections={sections}
//           isSubmitting={isSubmitting}
//         />
//       </main>
//     </div>
//   );
// };

// export default DynamicFormPage;



// -=-=-=-=-=-=-=-= v2


import React, { useState, useEffect } from 'react';
import { useFrappePostCall } from 'frappe-react-sdk';
import { FormRender } from '../components/FormRender'; // Assuming FormRender is also updated
import { ArrowLeftIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from '../components/RndSidebar';
import useUserRoleCheck from '../components/UserRoleCheck';
import { cn } from '@/lib/utils';

// --- TYPE DEFINITIONS (Unchanged) ---
interface Field {
  fieldname: string;
  label: string | null;
  fieldtype: string;
  mandatory: boolean;
  read_only: boolean;
  hidden: boolean;
  options?: string | null;
  description?: string | null;
}

interface LinkOption {
  value: string;
  label: string;
}

interface FormDataResponse {
  message: { fields: Field[]; link_options: Record<string, LinkOption[]> };
}

interface FormData {
  [key: string]: any;
}

interface DynamicFormPageProps {
  title?: string;
  submitButtonText?: string;
  sections?: any[];
  onSubmit?: (data: FormData) => Promise<void>;
  showBackButton?: boolean;
}

// --- EYE-COMFORTABLE UI COMPONENTS ---
const NeoCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white p-6 md:p-8 border-2 border-slate-800 rounded-lg shadow-[2px_2px_0px_rgba(20,20,30,0.1)]", className)}>
    {children}
  </div>
);

const NeoButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-5 py-2.5 border-2 border-slate-800 rounded-lg font-semibold text-slate-800 shadow-[2px_2px_0px_rgba(20,20,30,0.1)] transition-all duration-150",
        "hover:bg-slate-100 hover:-translate-y-0.5",
        "active:shadow-[1px_1px_0px_rgba(20,20,30,0.1)] active:translate-y-0",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 disabled:bg-slate-100 disabled:text-slate-400",
        className
      )}
    >
      {children}
    </button>
);

// --- MAIN COMPONENT ---
const DynamicFormPage: React.FC<DynamicFormPageProps> = ({
  title,
  submitButtonText = 'Submit',
  sections,
  onSubmit,
  showBackButton = true,
}) => {
  const navigate = useNavigate();
  const { doctype_name } = useParams<{ doctype_name: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isPermanentEmployee = useUserRoleCheck();

  if (!doctype_name) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <NeoCard className="max-w-md text-center border-rose-800 bg-rose-50">
          <h2 className="text-2xl font-bold text-rose-800 mb-4">Error</h2>
          <p className="text-rose-700 mb-6">
            Doctype name is missing from the URL. Please provide a valid doctype.
          </p>
          <NeoButton onClick={() => navigate(-1)}>
            Go Back
          </NeoButton>
        </NeoCard>
      </div>
    );
  }

  const {
    call: fetchFormData,
    result: formDataResult,
    error: formDataError,
    loading: formDataLoading,
  } = useFrappePostCall<FormDataResponse>('rndopsapp.rndopsapp.form_fields.get_dynamic_form_data');

  const [fields, setFields] = useState<Field[]>([]);
  const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (doctype_name) {
      fetchFormData({ doctype_name });
    }
  }, [doctype_name, fetchFormData]);

  useEffect(() => {
    if (formDataResult?.message) {
      const { fields, link_options } = formDataResult.message;
      setFields(fields || []);
      setLinkOptions(link_options || {});
      setLoading(false);
    }
    if (formDataError) {
      console.error('Error fetching form data:', formDataError);
      setLoading(false);
    }
  }, [formDataResult, formDataError]);

  const handleSubmit = async (data: FormData) => {
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(data);
        alert('Form submitted successfully!');
      } catch (error) {
        console.error('Submission error:', error);
        alert('Failed to submit form');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      console.log('Form data (no-op):', data);
      alert('Form submitted (check console for data)');
    }
  };

  if (loading || formDataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-400 border-t-slate-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-slate-700">Loading form...</p>
        </div>
      </div>
    );
  }

  if (formDataError || !fields.length) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <NeoCard className="max-w-md text-center border-rose-800 bg-rose-50">
          <h2 className="text-2xl font-bold text-rose-800 mb-4">Error Loading Form</h2>
          <p className="text-rose-700 mb-6 font-mono">
            {formDataError?.message || 'Failed to load form fields. Please try again.'}
          </p>
          <NeoButton onClick={() => navigate(-1)}>
            Go Back
          </NeoButton>
        </NeoCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
      <main className="flex-1 p-4 md:p-8 w-full overflow-hidden max-w-7xl mx-auto">
        {showBackButton && (
          <header className="mb-8 p-4 bg-white border-2 border-slate-800 rounded-lg shadow-[2px_2px_0px_rgba(20,20,30,0.1)]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-3 bg-white border-2 border-slate-800 rounded-lg transition-all duration-150 hover:bg-slate-100 active:translate-y-0.5"
              >
                <ArrowLeftIcon className="h-6 w-6 text-slate-800" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  {title || doctype_name.replace(/_/g, ' ')}
                </h1>
                <p className="text-slate-600 font-mono mt-1">
                  Doctype: {doctype_name}
                </p>
              </div>
            </div>
          </header>
        )}

        <FormRender
          fields={fields}
          linkOptions={linkOptions}
          initialData={{}}
          onSubmit={handleSubmit}
          submitButtonText={submitButtonText}
          title={title || doctype_name.replace(/_/g, ' ')}
          sections={sections}
          isSubmitting={isSubmitting}
        />
      </main>
    </div>
  );
};

export default DynamicFormPage;