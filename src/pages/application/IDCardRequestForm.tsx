import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useFrappeAuth,
  useFrappeGetCall,
  useFrappePostCall,
  useFrappeGetDocList,
} from "frappe-react-sdk";
import {
  AlertCircle,
  IdCard,
  User as UserIcon,
  Phone,
  MapPin,
  Calendar,
  Droplets,
  Heart,
  Briefcase,
  Building2,
  Save,
  Send,
  ArrowLeft,
  Camera,
  PenTool,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/RndSidebar";
import { PageHeader } from "@/components/common/PageHeader";
import { employeeIdCardAPI, fileToBase64 } from "@/services/apiService";
import { ErrorModal } from "@/components/ErrorModal";
import { parseFrappeError } from "@/utils/errorUtils";

// -----------------------------------------------------------------------
// ID Card Request Form
//
// FLOW:
// 1. On mount → call get_my_basic_details (Project Staff Details API)
//    to auto-populate form fields from the existing staff record.
// 2. User can review/edit all fields and add missing ones (emergency phone,
//    spouse name, photo, signature).
// 3. Save Draft → creates/updates Employee ID Card doc as Draft
// 4. Submit → transitions to "Submitted" for HR review
//
// FIELDNAME CONVENTION:
// All Frappe fieldnames use the __ suffix (e.g., project_number__,
// full_name__, blood_group__) as per the project's naming convention.
// -----------------------------------------------------------------------

interface BasicDetailsRecord {
  name: string;
  erp_mail?: string;
  ps_first_name?: string;
  ps_middle_name?: string;
  ps_last_name?: string;
  ps_gender?: string;
  ps_date_of_birth?: string;
  ps_blood_group?: string;
  ps_maritial_status?: string;
  ps_citizenship?: string;
  ps_phone_number?: string;
  ps_email_id?: string;
  ps_present_address?: string;
  ps_permanent_address?: string;
  ps_department?: string;
  ps_department_name?: string;
  ps_designation?: string;
  ps_emp_id?: string;
  project_no?: string;
  ps_joining_date?: string;
  ps_term_completion_date?: string;
  ps_photo?: string;
  ps_aadhar_number?: string;
  ps_pan?: string;
  username?: string;
  full_name?: string;
  email?: string;
}

interface IDCardFormData {
  emp_id__: string;
  project_number__: string;
  full_name__: string;
  dob__: string;
  blood_group__: string;
  phone__: string;
  emergency_phone__: string;
  marital_status__: string;
  spouse_name__: string;
  designation__: string;
  department_name__: string;
  valid_upto__: string;
  issue_date__: string;
  present_address__: string;
  permanent_address__: string;
  photo_path__: File | string | null;
  sign_path__: File | string | null;
}

// Styled components (consistent with project design system)
const FrappeCard = ({
  children,
  className,
  title,
  icon: Icon,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  icon?: typeof UserIcon;
}) => (
  <div
    className={cn(
      "bg-white dark:bg-[#27272A] p-5 md:p-6 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm",
      className,
    )}
  >
    {title && (
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-zinc-100 dark:border-zinc-700">
        {Icon && (
          <div className="p-2 bg-[#4A6CF7]/10 dark:bg-[#4A6CF7]/20 rounded-lg">
            <Icon className="h-4 w-4 text-[#4A6CF7]" />
          </div>
        )}
        <h3 className="font-bold text-[#27272A] dark:text-[#E4E4E7] text-sm">
          {title}
        </h3>
      </div>
    )}
    {children}
  </div>
);

const FormField = ({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn("space-y-1.5", className)}>
    <label className="block text-xs font-semibold text-[#52525B] dark:text-[#A1A1AA] uppercase tracking-wider">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    {children}
  </div>
);

const inputClass =
  "w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-[#27272A] dark:text-[#E4E4E7] placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/30 focus:border-[#4A6CF7] transition-all";
const selectClass = cn(inputClass, "appearance-none cursor-pointer");

const FrappeButton = ({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: {
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
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4A6CF7]/50 disabled:pointer-events-none disabled:opacity-50 h-10 px-5",
      className,
    )}
  >
    {children}
  </button>
);

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const MARITAL_STATUSES = ["Single", "Married", "Divorced", "Widowed"];

const IDCardRequestForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editDocName = searchParams.get("edit") || null;
  const { currentUser } = useFrappeAuth();

  // State
  const [formData, setFormData] = useState<IDCardFormData>({
    emp_id__: "",
    project_number__: "",
    full_name__: "",
    dob__: "",
    blood_group__: "",
    phone__: "",
    emergency_phone__: "",
    marital_status__: "",
    spouse_name__: "",
    designation__: "",
    department_name__: "",
    valid_upto__: "",
    issue_date__: new Date().toISOString().split("T")[0],
    present_address__: "",
    permanent_address__: "",
    photo_path__: null,
    sign_path__: null,
  });
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [savedDocName, setSavedDocName] = useState<string | null>(editDocName);
  const [errorModal, setErrorModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: "Error",
    message: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [signPreview, setSignPreview] = useState<string | null>(null);
  const [autoFetched, setAutoFetched] = useState(false);
  const [hrRemarks, setHrRemarks] = useState<string | null>(null);
  const [existingState, setExistingState] = useState<string | null>(null);

  // Form is locked (read-only) if already submitted to HR (state is not Draft)
  const isReadOnly = useMemo(() => {
    return Boolean(existingState && existingState !== "Draft");
  }, [existingState]);

  // Fetch existing user ID card request (if any)
  const { data: myCardResp } = useFrappeGetCall<any>(
    "rndopsapp.rndopsapp.doctype.employee_id_card.employee_id_card.get_my_id_card_details",
    undefined,
    currentUser && !editDocName ? undefined : null,
  );

  const myCardList = useMemo(() => {
    if (Array.isArray(myCardResp?.message)) return myCardResp.message;
    if (Array.isArray(myCardResp)) return myCardResp;
    return [];
  }, [myCardResp]);

  const fetchKey = currentUser ? `get_my_basic_details_${currentUser}` : null;
  const { data: basicResp, isLoading: basicLoading } = useFrappeGetCall<{
    message: BasicDetailsRecord | null;
  }>(
    "rndopsapp.rndopsapp.doctype.project_staff_details.project_staff_details.get_my_basic_details",
    {},
    fetchKey,
  );

  const { call: saveForm, error: saveError } = useFrappePostCall(
    employeeIdCardAPI.save,
  );
  const { call: submitForm, error: submitError } = useFrappePostCall(
    employeeIdCardAPI.submit,
  );
  const { call: fetchCardFields } = useFrappePostCall<{
    message: { prefill_data: Record<string, any> };
  }>(
    "rndopsapp.rndopsapp.doctype.employee_id_card.employee_id_card.get_employee_id_card_fields",
  );

  // Auto-load existing user request if available
  useEffect(() => {
    if (editDocName || !myCardList || myCardList.length === 0) return;
    const doc = myCardList[0];
    if (!doc) return;

    setSavedDocName(doc.name);
    setExistingState(doc.workflow_state || "Draft");
    setHrRemarks(doc.remarks || doc.hr_comments || null);

    setFormData({
      emp_id__: doc.emp_id__ || "",
      project_number__: doc.project_number__ || "",
      full_name__: doc.full_name__ || "",
      dob__: doc.dob__ || "",
      blood_group__: doc.blood_group__ || "",
      phone__: doc.phone__ || "",
      emergency_phone__: doc.emergency_phone__ || "",
      marital_status__: doc.marital_status__ || "",
      spouse_name__: doc.spouse_name__ || "",
      designation__: doc.designation__ || "",
      department_name__: doc.department_name__ || "",
      valid_upto__: doc.valid_upto__ || "",
      issue_date__: doc.issue_date__ || new Date().toISOString().split("T")[0],
      present_address__: doc.present_address__ || "",
      permanent_address__: doc.permanent_address__ || "",
      photo_path__: doc.photo_path__ || null,
      sign_path__: doc.sign_path__ || null,
    });
    if (doc.photo_path__) setPhotoPreview(doc.photo_path__);
    if (doc.sign_path__) setSignPreview(doc.sign_path__);

    setAutoFetched(true);
    setLoading(false);
  }, [myCardList, editDocName]);

  // Auto-fetch from Project Staff Details fallback if no existing doc
  useEffect(() => {
    if (autoFetched || editDocName || (myCardList && myCardList.length > 0))
      return;
    if (basicLoading || basicResp === undefined) return;

    const basic = basicResp?.message;
    if (basic) {
      const rawParts = [
        basic.ps_first_name,
        basic.ps_middle_name,
        basic.ps_last_name,
      ].filter(Boolean);
      const fullName =
        rawParts.length > 0 ? rawParts.join(" ") : basic.full_name || "";

      const userSign =
        (basic as any)?.ps_signature ||
        (basic as any)?.ps_sign ||
        (basic as any)?.signature ||
        null;

      setFormData((prev) => ({
        ...prev,
        emp_id__: basic.ps_emp_id || prev.emp_id__,
        project_number__: basic.project_no || prev.project_number__,
        full_name__: fullName || prev.full_name__,
        dob__: basic.ps_date_of_birth || prev.dob__,
        blood_group__: basic.ps_blood_group || prev.blood_group__,
        phone__: basic.ps_phone_number || prev.phone__,
        marital_status__: basic.ps_maritial_status || prev.marital_status__,
        designation__: basic.ps_designation || prev.designation__,
        department_name__:
          basic.ps_department_name ||
          basic.ps_department ||
          prev.department_name__,
        valid_upto__: basic.ps_term_completion_date || prev.valid_upto__,
        present_address__: basic.ps_present_address || prev.present_address__,
        permanent_address__:
          basic.ps_permanent_address || prev.permanent_address__,
        photo_path__: basic.ps_photo || prev.photo_path__,
        sign_path__: userSign,
      }));

      if (basic.ps_photo) {
        setPhotoPreview(basic.ps_photo);
      }
      if (userSign) {
        setSignPreview(userSign);
      }
    }
    setAutoFetched(true);
    setLoading(false);
  }, [basicResp, basicLoading, autoFetched, editDocName]);

  // Load existing document if editing
  useEffect(() => {
    if (!editDocName) return;
    fetchCardFields({ doc_name: editDocName })
      .then((res) => {
        const doc = res?.message?.prefill_data || {};
        if (doc && doc.name) {
          setFormData({
            emp_id__: doc.emp_id__ || "",
            project_number__: doc.project_number__ || "",
            full_name__: doc.full_name__ || "",
            dob__: doc.dob__ || "",
            blood_group__: doc.blood_group__ || "",
            phone__: doc.phone__ || "",
            emergency_phone__: doc.emergency_phone__ || "",
            marital_status__: doc.marital_status__ || "",
            spouse_name__: doc.spouse_name__ || "",
            designation__: doc.designation__ || "",
            department_name__: doc.department_name__ || "",
            valid_upto__: doc.valid_upto__ || "",
            issue_date__:
              doc.issue_date__ || new Date().toISOString().split("T")[0],
            present_address__: doc.present_address__ || "",
            permanent_address__: doc.permanent_address__ || "",
            photo_path__: doc.photo_path__ || null,
            sign_path__: doc.sign_path__ || null,
          });
          if (doc.photo_path__) setPhotoPreview(doc.photo_path__);
          if (doc.sign_path__) setSignPreview(doc.sign_path__);
          setExistingState(doc.workflow_state || "Draft");
          if (doc.remarks || doc.hr_comments) {
            setHrRemarks(doc.remarks || doc.hr_comments);
          }
        }
      })
      .catch(() => {
        setErrorModal({
          open: true,
          title: "Load Error",
          message: "Could not load the existing ID card request.",
        });
      })
      .finally(() => {
        setLoading(false);
        setAutoFetched(true);
      });
  }, [editDocName, fetchCardFields]);

  // Handlers
  const handleChange = useCallback(
    (field: keyof IDCardFormData, value: string) => {
      if (field === "phone__" || field === "emergency_phone__") {
        value = value
          .replace(/\D/g, "")
          .slice(0, field === "emergency_phone__" ? 12 : 10);
      }
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleFileChange = useCallback(
    (field: "photo_path__" | "sign_path__", file: File | null) => {
      setFormData((prev) => ({ ...prev, [field]: file }));
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (field === "photo_path__")
            setPhotoPreview(reader.result as string);
          else setSignPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        if (field === "photo_path__") setPhotoPreview(null);
        else setSignPreview(null);
      }
    },
    [],
  );

  // Validation
  const validateForm = useCallback((): boolean => {
    const errors: string[] = [];
    if (!formData.emp_id__) errors.push("Employee ID is required.");
    if (!formData.project_number__) errors.push("Project Number is required.");
    if (!formData.full_name__) errors.push("Full Name is required.");
    if (!formData.dob__) errors.push("Date of Birth is required.");
    if (!formData.blood_group__) errors.push("Blood Group is required.");
    if (!formData.phone__) errors.push("Phone number is required.");
    else if (!/^\d{10}$/.test(formData.phone__))
      errors.push("Phone must be exactly 10 digits.");
    if (!formData.emergency_phone__)
      errors.push("Emergency Phone is required.");
    if (!formData.marital_status__) errors.push("Marital Status is required.");
    if (formData.marital_status__ === "Married" && !formData.spouse_name__) {
      errors.push("Spouse Name is required when marital status is Married.");
    }
    if (!formData.designation__) errors.push("Designation is required.");
    if (!formData.department_name__)
      errors.push("Department Name is required.");
    if (!formData.valid_upto__) errors.push("Valid Upto date is required.");
    if (!formData.present_address__)
      errors.push("Present Address is required.");
    if (!formData.permanent_address__)
      errors.push("Permanent Address is required.");

    setValidationErrors(errors);
    return errors.length === 0;
  }, [formData]);

  // Save Draft
  const handleSave = async () => {
    if (isSubmitting) return;
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const data: Record<string, any> = { ...formData };

      // Handle file conversions for photo and signature
      if (formData.photo_path__ instanceof File) {
        data.photo_path__ = await fileToBase64(formData.photo_path__);
      }
      if (formData.sign_path__ instanceof File) {
        data.sign_path__ = await fileToBase64(formData.sign_path__);
      }

      if (savedDocName) data.name = savedDocName;

      const res = await saveForm({ data: JSON.stringify(data) });
      if (res?.message?.status === "success") {
        setSavedDocName(res.message.docname);
        alert("Draft saved successfully!");
      } else {
        throw new Error(res?.message?.message || "Save failed");
      }
    } catch (err: any) {
      setErrorModal({
        open: true,
        title: "Save Failed",
        message: parseFrappeError(saveError, err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const data: Record<string, any> = { ...formData };
      if (formData.photo_path__ instanceof File) {
        data.photo_path__ = await fileToBase64(formData.photo_path__);
      }
      if (formData.sign_path__ instanceof File) {
        data.sign_path__ = await fileToBase64(formData.sign_path__);
      }
      if (savedDocName) data.name = savedDocName;

      const saveRes = await saveForm({ data: JSON.stringify(data) });
      if (saveRes?.message?.status !== "success") {
        throw new Error(
          saveRes?.message?.message || "Save failed during submission",
        );
      }
      const docname = saveRes.message.docname;

      const submitRes = await submitForm({ docname });
      if (submitRes?.message?.status === "success") {
        setHrRemarks(null);
        setExistingState("Submitted");
        alert(
          "ID Card request submitted successfully! HR will review your request.",
        );
        navigate("/project-staff-dashboard?tab=tracking");
      } else {
        throw new Error(submitRes?.message?.message || "Submission failed");
      }
    } catch (err: any) {
      setErrorModal({
        open: true,
        title: "Submission Failed",
        message: parseFrappeError(submitError, err),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showSpouseField = formData.marital_status__ === "Married";

  // Loading state
  if (loading || basicLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#4A6CF7] border-t-transparent mx-auto" />
          <p className="mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Loading ID Card form...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
        <PageHeader
          title={
            editDocName
              ? `Edit ID Card Request — ${editDocName}`
              : "New ID Card Request"
          }
        />

        {/* HR Return Remarks Banner (Only shown if in Draft / Put Back state) */}
        {hrRemarks && (existingState === "Draft" || !existingState) && (
          <div className="mb-6 p-5 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-400 dark:border-amber-600 rounded-xl flex items-start gap-3.5 shadow-md animate-pulse">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-100 text-base">
                Action Required: Returned by HR for Correction
              </h4>
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 mt-1.5 bg-amber-100/90 dark:bg-amber-900/60 p-3 rounded-lg border border-amber-300 dark:border-amber-700">
                HR Reason: "{hrRemarks}"
              </p>
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-2">
                Please update the necessary information below and click "Submit
                for HR Review" at the bottom of this form.
              </p>
            </div>
          </div>
        )}

        {/* Submitted / Verified / Generated status notice if form is non-Draft */}
        {existingState && existingState !== "Draft" && (
          <div
            className={cn(
              "mb-6 p-4 rounded-xl flex items-start gap-3 shadow-sm border",
              existingState === "Verified" || existingState === "HR Verified"
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
                : existingState === "Generated" ||
                    existingState === "ID Generated" ||
                    existingState === "ID Card Generated"
                  ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                  : "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
            )}
          >
            {existingState === "Verified" || existingState === "HR Verified" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            ) : existingState === "Generated" ||
              existingState === "ID Generated" ||
              existingState === "ID Card Generated" ? (
              <IdCard className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            ) : (
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            )}

            <div>
              <h4
                className={cn(
                  "font-bold text-sm",
                  existingState === "Verified" ||
                    existingState === "HR Verified"
                    ? "text-emerald-900 dark:text-emerald-200"
                    : existingState === "Generated" ||
                        existingState === "ID Generated" ||
                        existingState === "ID Card Generated"
                      ? "text-blue-900 dark:text-blue-200"
                      : "text-amber-900 dark:text-amber-200",
                )}
              >
                {existingState === "Verified" || existingState === "HR Verified"
                  ? "Status: HR Verified"
                  : existingState === "Generated" ||
                      existingState === "ID Generated" ||
                      existingState === "ID Card Generated"
                    ? "Status: ID Card Generated."
                    : `Status: ${existingState}`}
              </h4>
              <p
                className={cn(
                  "text-sm mt-0.5 whitespace-pre-line",
                  existingState === "Verified" ||
                    existingState === "HR Verified"
                    ? "text-emerald-800 dark:text-emerald-300"
                    : existingState === "Generated" ||
                        existingState === "ID Generated" ||
                        existingState === "ID Card Generated"
                      ? "text-blue-800 dark:text-blue-300"
                      : "text-amber-800 dark:text-amber-300",
                )}
              >
                {existingState === "Verified" || existingState === "HR Verified"
                  ? "Your ID card request has been Verified by the HR."
                  : existingState === "Generated" ||
                      existingState === "ID Generated" ||
                      existingState === "ID Card Generated"
                    ? "Your ID card got Generated. Please collect you ID Card"
                    : "Your ID card request has been submitted and is currently under review by HR."}
              </p>
            </div>
          </div>
        )}

        {/* Auto-fetch notice */}
        {/* {!editDocName && autoFetched && basicResp?.message && (
                    <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-2">
                        <IdCard className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Your details have been auto-filled from your Project Staff record. Please review and complete any missing information.
                        </p>
                    </div>
                )} */}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-xl">
            <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2 text-sm">
              <AlertCircle className="h-4 w-4" />
              Please fix the following errors:
            </h4>
            <ul className="list-disc list-inside text-red-700 dark:text-red-400 space-y-1 text-sm">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
          {/* Section 1: Basic Identity */}
          <FrappeCard title="Personal Information" icon={UserIcon}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField label="Employee ID" required>
                <input
                  type="text"
                  value={formData.emp_id__}
                  onChange={(e) => handleChange("emp_id__", e.target.value)}
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                  placeholder="e.g., PS-001"
                  maxLength={20}
                />
              </FormField>

              <FormField label="Project Number" required>
                <input
                  type="text"
                  value={formData.project_number__}
                  onChange={(e) =>
                    handleChange("project_number__", e.target.value)
                  }
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                  placeholder="e.g., 2026031901MeiTy000636"
                  maxLength={25}
                />
              </FormField>

              <FormField label="Full Name" required>
                <input
                  type="text"
                  value={formData.full_name__}
                  onChange={(e) => handleChange("full_name__", e.target.value)}
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                  placeholder="Full name as on records"
                  maxLength={255}
                />
              </FormField>

              <FormField label="Date of Birth" required>
                <input
                  type="date"
                  value={formData.dob__}
                  onChange={(e) => handleChange("dob__", e.target.value)}
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                />
              </FormField>

              <FormField label="Blood Group" required>
                <select
                  value={formData.blood_group__}
                  onChange={(e) =>
                    handleChange("blood_group__", e.target.value)
                  }
                  disabled={isReadOnly}
                  className={cn(
                    selectClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                >
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Marital Status" required>
                <select
                  value={formData.marital_status__}
                  onChange={(e) =>
                    handleChange("marital_status__", e.target.value)
                  }
                  disabled={isReadOnly}
                  className={cn(
                    selectClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                >
                  <option value="">Select Status</option>
                  {MARITAL_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </FormField>

              {showSpouseField && (
                <FormField label="Spouse Name" required>
                  <input
                    type="text"
                    value={formData.spouse_name__}
                    onChange={(e) =>
                      handleChange("spouse_name__", e.target.value)
                    }
                    disabled={isReadOnly}
                    className={cn(
                      inputClass,
                      isReadOnly &&
                        "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                    )}
                    placeholder="Spouse full name"
                    maxLength={255}
                  />
                </FormField>
              )}
            </div>
          </FrappeCard>

          {/* Section 2: Contact Details */}
          <FrappeCard title="Contact Details" icon={Phone}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Phone Number" required>
                <input
                  type="tel"
                  value={formData.phone__}
                  onChange={(e) => handleChange("phone__", e.target.value)}
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                />
              </FormField>

              <FormField label="Emergency Phone" required>
                <input
                  type="tel"
                  value={formData.emergency_phone__}
                  onChange={(e) =>
                    handleChange("emergency_phone__", e.target.value)
                  }
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                  placeholder="Emergency contact number"
                  maxLength={12}
                />
              </FormField>
            </div>
          </FrappeCard>

          {/* Section 3: Employment Details */}
          <FrappeCard title="Employment Details" icon={Briefcase}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Designation" required>
                <input
                  type="text"
                  value={formData.designation__}
                  onChange={(e) =>
                    handleChange("designation__", e.target.value)
                  }
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                  placeholder="e.g., Junior Research Fellow"
                  maxLength={150}
                />
              </FormField>

              <FormField label="Department" required>
                <input
                  type="text"
                  value={formData.department_name__}
                  onChange={(e) =>
                    handleChange("department_name__", e.target.value)
                  }
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                  placeholder="e.g., Computer Science & Engineering"
                  maxLength={150}
                />
              </FormField>

              <FormField label="Issue Date" required>
                <input
                  type="date"
                  value={formData.issue_date__}
                  onChange={(e) => handleChange("issue_date__", e.target.value)}
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                />
              </FormField>

              <FormField label="Valid Upto" required>
                <input
                  type="date"
                  value={formData.valid_upto__}
                  onChange={(e) => handleChange("valid_upto__", e.target.value)}
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                />
              </FormField>
            </div>
          </FrappeCard>

          {/* Section 4: Address */}
          <FrappeCard title="Address Details" icon={MapPin}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Present Address" required>
                <textarea
                  value={formData.present_address__}
                  onChange={(e) =>
                    handleChange("present_address__", e.target.value)
                  }
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    "min-h-[80px] resize-y",
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                  placeholder="Enter your current address"
                />
              </FormField>

              <FormField label="Permanent Address" required>
                <textarea
                  value={formData.permanent_address__}
                  onChange={(e) =>
                    handleChange("permanent_address__", e.target.value)
                  }
                  disabled={isReadOnly}
                  className={cn(
                    inputClass,
                    "min-h-[80px] resize-y",
                    isReadOnly &&
                      "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed",
                  )}
                  placeholder="Enter your permanent address"
                />
              </FormField>
            </div>
          </FrappeCard>

          {/* Section 5: Photo & Signature */}
          <FrappeCard title="Photo & Signature" icon={Camera}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo Upload */}
              <FormField label="Passport Size Photo">
                <div className="flex items-start gap-4">
                  <div className="w-24 h-28 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-800 flex-shrink-0">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Photo preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Camera className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      disabled={isReadOnly}
                      onChange={(e) =>
                        handleFileChange(
                          "photo_path__",
                          e.target.files?.[0] || null,
                        )
                      }
                      className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#4A6CF7]/10 file:text-[#4A6CF7] hover:file:bg-[#4A6CF7]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1.5">
                      JPEG/PNG, max 2MB. Passport size preferred.
                    </p>
                  </div>
                </div>
              </FormField>

              {/* Signature Upload */}
              <FormField label="Signature">
                <div className="flex items-start gap-4">
                  <div className="w-32 h-16 rounded-lg border-2 border-dashed border-zinc-300 dark:border-zinc-600 flex items-center justify-center overflow-hidden bg-zinc-50 dark:bg-zinc-800 flex-shrink-0">
                    {signPreview ? (
                      <img
                        src={signPreview}
                        alt="Signature preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <PenTool className="h-6 w-6 text-zinc-300 dark:text-zinc-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg"
                      disabled={isReadOnly}
                      onChange={(e) =>
                        handleFileChange(
                          "sign_path__",
                          e.target.files?.[0] || null,
                        )
                      }
                      className="block w-full text-xs text-zinc-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#4A6CF7]/10 file:text-[#4A6CF7] hover:file:bg-[#4A6CF7]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1.5">
                      JPEG/PNG, max 1MB. Sign on white background.
                    </p>
                  </div>
                </div>
              </FormField>
            </div>
          </FrappeCard>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 pb-8">
            <FrappeButton
              onClick={() => navigate(-1)}
              className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </FrappeButton>

            {isReadOnly && (
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700">
                Application Submitted ({existingState}) — Form editing and
                resubmission are locked while under review.
              </p>
            )}

            <div className="flex gap-3">
              <FrappeButton
                onClick={handleSave}
                disabled={isSubmitting || isReadOnly}
                className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {isSubmitting ? "Saving..." : "Save Draft"}
              </FrappeButton>
              <FrappeButton
                type="submit"
                disabled={isSubmitting || !savedDocName || isReadOnly}
                className="bg-[#4A6CF7] text-white hover:bg-[#3b5cf6] shadow-sm shadow-[#4A6CF7]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isSubmitting ? "Submitting..." : "Submit for HR Review"}
              </FrappeButton>
            </div>
          </div>
        </form>
      </main>

      <ErrorModal
        open={errorModal.open}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default IDCardRequestForm;
