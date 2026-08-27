
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
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("bg-white dark:bg-zinc-900 p-6 md:p-8 border-2 border-slate-800 rounded-lg shadow-[2px_2px_0px_rgba(20,20,30,0.1)]", className)}>
    {children}
  </div>
);

const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; className?: string; type?: "button" | "submit" }) => (
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
        <FrappeCard className="max-w-md text-center border-rose-800 bg-rose-50">
          <h2 className="text-2xl font-bold text-rose-800 mb-4">Error</h2>
          <p className="text-rose-700 mb-6">
            Doctype name is missing from the URL. Please provide a valid doctype.
          </p>
          <FrappeButton onClick={() => navigate(-1)}>
            Go Back
          </FrappeButton>
        </FrappeCard>
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
        alert('Failed to submit form');
      } finally {
        setIsSubmitting(false);
      }
    } else {
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
        <FrappeCard className="max-w-md text-center border-rose-800 bg-rose-50">
          <h2 className="text-2xl font-bold text-rose-800 mb-4">Error Loading Form</h2>
          <p className="text-rose-700 mb-6 font-mono">
            {formDataError?.message || 'Failed to load form fields. Please try again.'}
          </p>
          <FrappeButton onClick={() => navigate(-1)}>
            Go Back
          </FrappeButton>
        </FrappeCard>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 w-full overflow-hidden max-w-7xl mx-auto">
        {showBackButton && (
          <header className="mb-8 p-4 bg-white dark:bg-zinc-900 border-2 border-slate-800 rounded-lg shadow-[2px_2px_0px_rgba(20,20,30,0.1)]">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-3 bg-white dark:bg-zinc-900 border-2 border-slate-800 rounded-lg transition-all duration-150 hover:bg-slate-100 active:translate-y-0.5"
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