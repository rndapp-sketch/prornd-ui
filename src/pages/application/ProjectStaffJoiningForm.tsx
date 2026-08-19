import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useFrappePostCall } from "frappe-react-sdk";
import { ArrowLeft, Eye, Loader2, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { DepartmentName } from "@/components/DepartmentName";
import { AppSidebar } from "@/components/RndSidebar";
import {
    DynamicFormRenderer,
    type FormField,
    type LinkOption,
} from "@/components/forms/DynamicFormRenderer";
import { CommentModal } from "@/components/CommentModal";
import { ActivityStream, type ActivityStreamHandle } from "@/components/ActivityStream";
import {
    prepareFormDataForApi,
    projectStaffDetailsAPI,
    selectionCommitteeReportAPI,
    selectionCandidateDetailsAPI,
} from "@/services/apiService";

const fallbackFields: FormField[] = [
    { fieldname: "appointment_details_section", label: "Appointment Details", fieldtype: "Section Break" },
    { fieldname: "ps_emp_id", label: "Employee ID", fieldtype: "Data", read_only: 1 },
    { fieldname: "scr_id", label: "Selection Committee Report", fieldtype: "Data", read_only: 1 },
    { fieldname: "pi_id", label: "Principal Investigator", fieldtype: "Data", read_only: 1 },
    { fieldname: "project_no", label: "Project Number", fieldtype: "Data", read_only: 1 },
    { fieldname: "ps_aon", label: "Appointment Order No.", fieldtype: "Data" },
    { fieldname: "ps_designation", label: "Designation", fieldtype: "Data", mandatory: 1 },
    { fieldname: "ps_department", label: "Department", fieldtype: "Data" },
    { fieldname: "ps_mro", label: "MRO", fieldtype: "Data" },
    { fieldname: "ps_joining_date", label: "Joining Date", fieldtype: "Date" },
    { fieldname: "ps_term_completion_date", label: "Term Completion Date", fieldtype: "Date" },
    { fieldname: "personal_details_section", label: "Personal Details", fieldtype: "Section Break" },
    { fieldname: "ps_first_name", label: "First Name", fieldtype: "Data", mandatory: 1 },
    { fieldname: "ps_middle_name", label: "Middle Name", fieldtype: "Data" },
    { fieldname: "ps_last_name", label: "Last Name", fieldtype: "Data", mandatory: 1 },
    { fieldname: "ps_date_of_birth", label: "Date of Birth", fieldtype: "Date" },
    { fieldname: "ps_fathers_name", label: "Father's Name", fieldtype: "Data" },
    { fieldname: "ps_blood_group", label: "Blood Group", fieldtype: "Select", options: "\nA+\nA-\nB+\nB-\nAB+\nAB-\nO+\nO-" },
    { fieldname: "ps_maritial_status", label: "Marital Status", fieldtype: "Select", options: "\nSingle\nMarried\nDivorced\nWidowed" },
    { fieldname: "ps_gender", label: "Gender", fieldtype: "Select", options: "\nMale\nFemale" },
    { fieldname: "ps_citizenship", label: "Citizenship", fieldtype: "Data" },
    { fieldname: "contact_details_section", label: "Contact Details", fieldtype: "Section Break" },
    { fieldname: "ps_email_id", label: "Email ID", fieldtype: "Data" },
    { fieldname: "erp_mail", label: "ERP Mail", fieldtype: "Data" },
    { fieldname: "ps_phone_number", label: "Phone Number", fieldtype: "Data" },
    { fieldname: "ps_present_address", label: "Present Address", fieldtype: "Small Text" },
    { fieldname: "ps_permanent_address", label: "Permanent Address", fieldtype: "Small Text" },
    { fieldname: "identity_documents_section", label: "Identity Documents", fieldtype: "Section Break" },
    { fieldname: "ps_pan", label: "PAN", fieldtype: "Data" },
    { fieldname: "ps_aadhar_number", label: "Aadhar Number", fieldtype: "Data" },
    { fieldname: "bank_account_number", label: "Bank Account Number", fieldtype: "Data" },
    { fieldname: "salary_details_section", label: "Salary Details", fieldtype: "Section Break" },
    { fieldname: "ps_basic_salary", label: "Basic Salary", fieldtype: "Currency" },
    { fieldname: "ps_hra", label: "HRA", fieldtype: "Data" },
    { fieldname: "ps_ma", label: "MA", fieldtype: "Data" },
    { fieldname: "ps_ta", label: "If Travel Allowance Needed", fieldtype: "Select", options: "\nYes\nNo" },
    { fieldname: "ps_ta_amount", label: "Travel Allowance Amount", fieldtype: "Data" },
    { fieldname: "ps_hostel", label: "Hostel", fieldtype: "Data" },
    {
        fieldname: "table_ymed",
        label: "Tenure Details",
        fieldtype: "Table",
        child_fields: [
            { fieldname: "pstd_joining_date", label: "Joining Date", fieldtype: "Date" },
            { fieldname: "pstd_term_completion_date", label: "Term Completion Date", fieldtype: "Date" },
            { fieldname: "pstd_basic_salary", label: "Basic Salary", fieldtype: "Currency" },
            { fieldname: "pstd_increment", label: "Increment", fieldtype: "Data" },
            { fieldname: "pstd_hra", label: "HRA", fieldtype: "Data" },
            { fieldname: "pstd_extension_sought", label: "Extension Sought", fieldtype: "Data" },
            { fieldname: "pstd_joining_number", label: "Joining Number", fieldtype: "Data" },
            { fieldname: "pstd_pi_extension_sought", label: "PI Extension Sought", fieldtype: "Data" },
            { fieldname: "pstd_staff_extension_sought", label: "Staff Extension Sought", fieldtype: "Data" },
            { fieldname: "pstd_tentative_joining_date", label: "Tentative Joining Date", fieldtype: "Date" },
        ],
    },
    { fieldname: "upload_section_section", label: "Upload Section", fieldtype: "Section Break" },
    { fieldname: "ps_photo", label: "Photo", fieldtype: "Attach" },
    { fieldname: "ps_signature", label: "Signature", fieldtype: "Attach" },
    { fieldname: "ps_medical_certificate", label: "Medical Certificate", fieldtype: "Attach" },
];

const GroupCard = ({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) => (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#27272A]">
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-[#27272A] dark:text-[#F4F4F5]">
                {label}
            </h3>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const normalizeRows = (value: unknown): Record<string, unknown>[] => {
    if (Array.isArray(value)) return value as Record<string, unknown>[];
    if (typeof value === "string" && value.trim()) {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};

const normalizeFields = (fields: FormField[]): FormField[] =>
    fields.map((field) => {
        if (field.fieldname === "ps_emp_id" || field.fieldname === "scr_id" || field.fieldname === "pi_id" || field.fieldname === "project_no") return { ...field, read_only: 1 };
        if (field.fieldname === "table_ymed") {
            return {
                ...field,
                label: field.label || "Tenure Details",
                fieldtype: "Table",
                child_fields: field.child_fields?.length
                    ? field.child_fields
                    : fallbackFields.find((f) => f.fieldname === "table_ymed")?.child_fields,
            };
        }
        return field;
    });

const ProjectStaffJoiningForm: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const scrName = searchParams.get("scr") || "";
    const candidateId = searchParams.get("candidate_id") || "";
    const applicationId = searchParams.get("application_id") || "";
    const docnameParam = searchParams.get("docname") || searchParams.get("name") || "";

    const [fields, setFields] = useState<FormField[]>(fallbackFields);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(docnameParam || null);
    const [candidateName, setCandidateName] = useState("");
    const [nextEmpId, setNextEmpId] = useState("Auto-generated");
    const [recruitmentPostId, setRecruitmentPostId] = useState("");
    const [viewOnlyNotice, setViewOnlyNotice] = useState(false);

    const { call: fetchFields } = useFrappePostCall<{ message: any }>(projectStaffDetailsAPI.getFields);
    const { call: fetchSCRFields } = useFrappePostCall<{ message: any }>(selectionCommitteeReportAPI.getFields);
    const { call: fetchCandidateByApplication } = useFrappePostCall<{ message: any }>(selectionCandidateDetailsAPI.getByApplication);
    const { call: fetchExistingJoining } = useFrappePostCall<{ message: any }>(projectStaffDetailsAPI.getByApplication);
    const { call: saveData } = useFrappePostCall<{ message: any }>(projectStaffDetailsAPI.save);
    const { call: fetchNextEmpId } = useFrappePostCall<{ message: string }>(projectStaffDetailsAPI.getNextEmpId);
    const { call: submitPSD } = useFrappePostCall<{ message: any }>(projectStaffDetailsAPI.submit);
    const { call: fetchPSDWorkflowActions } = useFrappePostCall<{ message: any }>(projectStaffDetailsAPI.getWorkflowActions);
    const { call: performPSDAction } = useFrappePostCall<{ message: any }>(projectStaffDetailsAPI.performAction);
    const { call: addProjectComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    const [workflowState, setWorkflowState] = useState<string>("");
    const [workflowActions, setWorkflowActions] = useState<string[]>([]);
    const [actionLoading, setActionLoading] = useState<string>("");
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [pendingWorkflowAction, setPendingWorkflowAction] = useState<string>("");
    const activityStreamRef = React.useRef<ActivityStreamHandle>(null);

    const canSave = (!workflowState || workflowState.toLowerCase() === "draft") && !viewOnlyNotice;

    useEffect(() => {
        let mounted = true;

        const load = async () => {
            setLoading(true);
            let nextId = "Auto-generated";
            let nextData: Record<string, any> = {};

            try {
                const empRes = await fetchNextEmpId({});
                nextId = empRes?.message || nextId;
                if (mounted) setNextEmpId(nextId);
            } catch {
                if (mounted) setNextEmpId(nextId);
            }

            // Single-submission guard: if this candidate already has a Joining Form,
            // load that record instead of starting a new one. A submitted record is
            // shown view-only.
            let effectiveDocName = savedDocName;
            if (!effectiveDocName && applicationId) {
                try {
                    const exRes = await fetchExistingJoining({ application_id: applicationId });
                    const ex = exRes?.message?.data;
                    if (ex?.docname) {
                        effectiveDocName = ex.docname;
                        if (mounted) {
                            setSavedDocName(ex.docname);
                            setViewOnlyNotice(!!ex.is_submitted);
                        }
                    }
                } catch {
                    /* proceed as a new form if the lookup fails */
                }
            }

            try {
                const res = await fetchFields({ doc_name: effectiveDocName });
                const msg = res?.message || {};
                if (Array.isArray(msg.fields) && msg.fields.length) {
                    setFields(normalizeFields(msg.fields));
                }
                if (msg.link_options && typeof msg.link_options === "object") {
                    setLinkOptions(msg.link_options);
                }
                if (msg.prefill_data && typeof msg.prefill_data === "object") {
                    nextData = {
                        ...nextData,
                        ...msg.prefill_data,
                        table_ymed: normalizeRows(msg.prefill_data.table_ymed),
                    };
                }
            } catch {
                setFields(fallbackFields);
            }

            // Fetch SCR and SCD in parallel
            const [scrRes, scdRes] = await Promise.all([
                scrName ? fetchSCRFields({ doc_name: scrName }).catch(() => null) : Promise.resolve(null),
                applicationId ? fetchCandidateByApplication({ application_id: applicationId }).catch(() => null) : Promise.resolve(null),
            ]);

            // ── SCR: project/pay/designation data ──
            if (scrRes) {
                try {
                    const prefill = scrRes?.message?.prefill_data;
                    const candidates = normalizeRows(prefill?.candidates);

                    if (prefill?.owner) {
                        nextData = { ...nextData, pi_id: nextData.pi_id || prefill.owner };
                    }
                    if (prefill?.project_number) {
                        nextData = { ...nextData, project_no: nextData.project_no || prefill.project_number };
                    }
                    const candidate = candidates.find((c) => String(c.candidate_id) === String(candidateId));

                    if (candidate) {
                        if (mounted && candidate.recruitment_post_id) {
                            setRecruitmentPostId(String(candidate.recruitment_post_id));
                        }
                        const fullName = String(candidate.candidate_name || "");
                        const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
                        const firstName = nameParts[0] || "";
                        const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : "";
                        const middleName = nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "";

                        if (mounted) setCandidateName(fullName);
                        nextData = {
                            ...nextData,
                            ps_first_name: nextData.ps_first_name || firstName,
                            ps_middle_name: nextData.ps_middle_name || middleName,
                            ps_last_name: nextData.ps_last_name || lastName,
                            ps_designation: nextData.ps_designation || candidate.applied_post || "",
                            ps_basic_salary: nextData.ps_basic_salary || candidate.basic_pay || "",
                            ps_hra: nextData.ps_hra || candidate.hra || "",
                            ps_department: nextData.ps_department || prefill?.upfa_department || "",
                        };
                    }
                } catch (e) {
                }
            }

            // ── SCD: contact/personal info overrides SCR ──
            const scdDocs = scdRes?.message?.data;
            if (Array.isArray(scdDocs) && scdDocs.length > 0) {
                const scd = scdDocs[0];

                // Name: SCD has candidate_name (first) + candidate_surname (last)
                const scdFirst = scd.candidate_name || "";
                const scdLast = scd.candidate_surname || "";
                if (scdFirst || scdLast) {
                    if (mounted) setCandidateName([scdFirst, scdLast].filter(Boolean).join(" "));
                }

                nextData = {
                    ...nextData,
                    ...(scdFirst && { ps_first_name: scdFirst }),
                    ...(scdLast && { ps_last_name: scdLast }),
                    ...(scd.email && { ps_email_id: scd.email }),
                    ...(scd.phone_number && { ps_phone_number: scd.phone_number }),
                    ...(scd.correspondence_address && { ps_present_address: scd.correspondence_address }),
                    ...(scd.permanent_address && { ps_permanent_address: scd.permanent_address }),
                    ...(scd.date_of_birth && { ps_date_of_birth: scd.date_of_birth }),
                    ...(scd.fathers_name && { ps_fathers_name: scd.fathers_name }),
                    ...(scd.blood_group && { ps_blood_group: scd.blood_group }),
                    ...(scd.marital_status && { ps_maritial_status: scd.marital_status }),
                    ...(scd.citizenship && { ps_citizenship: scd.citizenship }),
                    ...(scd.pan && { ps_pan: scd.pan }),
                    ...(scd.aadhar_number && { ps_aadhar_number: scd.aadhar_number }),
                    ...(scd.bank_account_number && { bank_account_number: scd.bank_account_number }),
                    ...(scd.appointment_order_number && { ps_aon: scd.appointment_order_number }),
                    ...(scd.basic_pay && { ps_basic_salary: scd.basic_pay }),
                    ...(scd.hra && { ps_hra: scd.hra }),
                    ...(scd.applied_post && { ps_designation: scd.applied_post }),
                };
            }

            nextData = {
                ps_emp_id: nextData.ps_emp_id || nextId,
                table_ymed: normalizeRows(nextData.table_ymed),
                ...nextData,
                scr_id: nextData.scr_id || scrName || "",
                pi_id: nextData.pi_id || "",
                project_no: nextData.project_no || "",
                application_id: nextData.application_id || applicationId || "",
            };

            if (mounted) {
                setFormData(nextData);
                setLoading(false);
            }
        };

        load();
        return () => {
            mounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scrName, candidateId, applicationId, savedDocName]);

    const handleFieldChange = useCallback((fieldname: string, value: any) => {
        setFormData((prev) => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData((prev) => ({ ...prev, [fieldname]: file }));
    }, []);

    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData((prev) => {
            const rows = Array.isArray(prev[tableName]) ? [...prev[tableName]] : [];
            rows[rowIndex] = { ...(rows[rowIndex] || {}), [fieldname]: value };
            return { ...prev, [tableName]: rows };
        });
    }, []);

    const handleTableFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
        handleTableRowChange(tableName, rowIndex, fieldname, file);
    }, [handleTableRowChange]);

    const handleAddTableRow = useCallback((tableName: string, newRow: Record<string, any>) => {
        setFormData((prev) => ({
            ...prev,
            [tableName]: [...(Array.isArray(prev[tableName]) ? prev[tableName] : []), newRow],
        }));
    }, []);

    const handleDeleteTableRow = useCallback((tableName: string, rowIndex: number) => {
        setFormData((prev) => ({
            ...prev,
            [tableName]: (Array.isArray(prev[tableName]) ? prev[tableName] : []).filter((_: unknown, idx: number) => idx !== rowIndex),
        }));
    }, []);

    const commonRendererProps = useMemo(() => ({
        formData,
        linkOptions,
        onChange: handleFieldChange,
        onFileChange: handleFileChange,
        onTableRowChange: handleTableRowChange,
        onTableFileChange: handleTableFileChange,
        onAddTableRow: handleAddTableRow,
        onDeleteTableRow: handleDeleteTableRow,
        hideSectionHeaders: true,
        hideTableLabels: false,
        readOnly: !canSave,
    }), [
        formData,
        linkOptions,
        handleFieldChange,
        handleFileChange,
        handleTableRowChange,
        handleTableFileChange,
        handleAddTableRow,
        handleDeleteTableRow,
        canSave,
    ]);

    const section = useCallback((names: string[]) =>
        fields.filter((field) => names.includes(field.fieldname)),
        [fields],
    );

    const loadWorkflowActions = useCallback(async (docname: string) => {
        try {
            const res = await fetchPSDWorkflowActions({ docname });
            const msg = res?.message || {};
            if (msg.status === "success") {
                setWorkflowState(msg.workflow_state || "");
                setWorkflowActions(Array.isArray(msg.actions) ? msg.actions : []);
            } else {
                setWorkflowState("");
                setWorkflowActions([]);
            }
        } catch (e) {
            setWorkflowActions([]);
        }
    }, [fetchPSDWorkflowActions]);

    const handleWorkflowAction = (action: string) => {
        if (!savedDocName) {
            alert("Please save the form before performing this action.");
            return;
        }
        setPendingWorkflowAction(action);
        setCommentModalOpen(true);
    };

    const handleConfirmWorkflowAction = async (comment: string) => {
        setCommentModalOpen(false);
        const action = pendingWorkflowAction;
        if (!action || !savedDocName) return;

        setActionLoading(action);
        try {
            const trimmedComment = comment.trim();
            const res = action === "Submit"
                ? await submitPSD({ docname: savedDocName, comment: trimmedComment || undefined })
                : await performPSDAction({ docname: savedDocName, action, comment: trimmedComment || undefined });
            const msg = res?.message;
            if (msg?.status === "error") {
                alert(msg?.message || `Failed to perform action: ${action}`);
            } else {
                // Persist the actor's note as a real comment so it shows in the Activity Log.
                if (trimmedComment) {
                    try {
                        await addProjectComment({
                            doctype: "Project Staff Details",
                            docname: savedDocName,
                            content: trimmedComment,
                        });
                    } catch (commentErr) {
                    }
                }
                if (action === "Submit") {
                    // The backend allocates the real Employee ID at Submit time via
                    // generate_emp_id() and writes it to ps_emp_id. Prefer the value
                    // returned in the submit response; if absent, refetch the doc.
                    let allottedEmpId: string =
                        msg?.ps_emp_id || msg?.doc?.ps_emp_id || msg?.data?.ps_emp_id || "";
                    if (!allottedEmpId) {
                        try {
                            const docRes = await fetchFields({ doc_name: savedDocName });
                            allottedEmpId = docRes?.message?.prefill_data?.ps_emp_id || "";
                        } catch (refetchErr) {
                        }
                    }
                    if (allottedEmpId) {
                        setFormData((prev) => ({ ...prev, ps_emp_id: allottedEmpId }));
                        alert(
                            `Project Staff Joining Form has been submitted for this staff.\nAllotted Employee ID: ${allottedEmpId}`,
                        );
                    } else {
                        alert("Project Staff Joining Form submitted successfully.");
                    }
                } else {
                    alert(`${action} successful.`);
                }
                await loadWorkflowActions(savedDocName);
                activityStreamRef.current?.refetch();
            }
        } catch (e: any) {
            alert(e?.message || `An error occurred while performing ${action}.`);
        } finally {
            setActionLoading("");
            setPendingWorkflowAction("");
        }
    };

    const actionButtonStyle = (action: string): string => {
        const a = action.toLowerCase();
        if (a === "submit") return "bg-emerald-600 text-white hover:bg-emerald-700";
        if (a === "forward" || a === "approve" || a === "recommend") return "bg-blue-600 text-white hover:bg-blue-700";
        if (a === "reject" || a === "return") return "bg-red-600 text-white hover:bg-red-700";
        return "bg-[#D97757] text-white hover:bg-[#c5684a]";
    };

    useEffect(() => {
        if (savedDocName) loadWorkflowActions(savedDocName);
    }, [savedDocName, loadWorkflowActions]);

    const handleSave = async () => {
        if (!formData.ps_first_name || !formData.ps_last_name) {
            alert("First Name and Last Name are required.");
            return;
        }

        setSaving(true);
        try {
            const prepared = await prepareFormDataForApi({
                ...formData,
                table_ymed: normalizeRows(formData.table_ymed),
            });
            if (savedDocName) prepared.name = savedDocName;

            const res = await saveData({ data: prepared });
            if (res?.message?.status === "success") {
                const docname = res.message.docname || savedDocName;
                setSavedDocName(docname);
                alert("Saved successfully!");
            } else {
                alert(res?.message?.message || "Failed to save.");
            }
        } catch (e: any) {
            alert(e?.message || "An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#FAFAF9] font-sans dark:bg-[#18181B]">
                <AppSidebar />
                <main className="flex min-h-screen items-center justify-center p-6 md:p-10">
                    <div className="flex items-center gap-3 rounded-2xl border border-[#E4E4E7] bg-white px-5 py-4 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                        <Loader2 className="h-5 w-5 animate-spin text-[#D97757]" />
                        <span className="text-sm font-semibold text-[#71717A] dark:text-[#A1A1AA]">Loading joining details</span>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAF9] font-sans dark:bg-[#18181B]">
            <AppSidebar />

            <main className="mx-auto max-w-[1600px] p-6 md:p-8">
                <div className="mb-6 overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
                        <div className="flex min-w-0 items-center gap-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] text-[#71717A] transition-colors hover:border-[#D97757]/30 hover:bg-[#D97757]/10 hover:text-[#D97757] dark:border-[#3F3F46] dark:bg-[#18181B]"
                                aria-label="Back"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                            <div className="min-w-0">
                                <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">Joining Form</span>
                                <h1 className="mt-1 text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7]">
                                    Project Staff Joining Details
                                </h1>
                                {candidateName && (
                                    <p className="mt-0.5 truncate text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                        {candidateName}
                                    </p>
                                )}
                                {viewOnlyNotice && (
                                    <span className="mt-1 inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                                        Already submitted - view only
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {savedDocName && (
                                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                                    Saved: {savedDocName}
                                </span>
                            )}
                            {candidateId && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        navigate(
                                            `/candidate-details/${candidateId}?refNum=${encodeURIComponent(recruitmentPostId)}&applicationId=${encodeURIComponent(applicationId)}`,
                                        )
                                    }
                                    className="flex items-center gap-2 rounded-lg border border-[#E4E4E7] bg-white px-4 py-2 text-sm font-bold text-[#3F3F46] shadow-sm transition-colors hover:border-[#D97757]/40 hover:bg-[#D97757]/10 hover:text-[#D97757] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]"
                                    title="View full candidate profile"
                                >
                                    <Eye className="h-4 w-4" />
                                    Candidate Details
                                </button>
                            )}
                            {canSave && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold shadow-sm transition-colors",
                                        saving
                                            ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                                            : "bg-[#D97757] text-white hover:bg-[#c5684a]",
                                    )}
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {saving ? "Saving..." : "Save"}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="grid gap-3 border-t border-[#E4E4E7] bg-[#FAFAF9]/70 px-5 py-4 text-sm dark:border-[#3F3F46] dark:bg-[#18181B]/40 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            ["Employee ID", formData.ps_emp_id || nextEmpId],
                            ["Designation", formData.ps_designation || "-"],
                        ].map(([label, value]) => (
                            <div key={label} className="min-w-0">
                                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">{label}</p>
                                <p className="mt-1 truncate font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{value}</p>
                            </div>
                        ))}
                        <div className="min-w-0">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">Department</p>
                            <p className="mt-1 truncate font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                {formData.ps_department ? <DepartmentName name={formData.ps_department} /> : "-"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
                    <div className="space-y-5">
                        <GroupCard label="Appointment Details">
                            <DynamicFormRenderer
                                fields={section(["appointment_details_section", "ps_emp_id", "scr_id", "pi_id", "project_no", "ps_designation", "ps_department", "ps_joining_date", "ps_term_completion_date"])}
                                {...commonRendererProps}
                            />
                        </GroupCard>

                        <GroupCard label="Personal Details">
                            <DynamicFormRenderer
                                fields={section([
                                    "personal_details_section",
                                    "ps_first_name",
                                    "ps_middle_name",
                                    "ps_last_name",
                                    "ps_date_of_birth",
                                    "ps_fathers_name",
                                    "ps_blood_group",
                                    "ps_maritial_status",
                                    "ps_gender",
                                    "ps_citizenship",
                                ])}
                                {...commonRendererProps}
                            />
                        </GroupCard>

                        <GroupCard label="Contact Details">
                            <DynamicFormRenderer
                                fields={section([
                                    "contact_details_section",
                                    "ps_email_id",
                                    "erp_mail",
                                    "ps_phone_number",
                                    "ps_present_address",
                                    "ps_permanent_address",
                                ])}
                                {...commonRendererProps}
                            />
                        </GroupCard>

                        <GroupCard label="Identity Documents">
                            <DynamicFormRenderer
                                fields={section(["identity_documents_section", "ps_pan", "ps_aadhar_number", "bank_account_number"])}
                                {...commonRendererProps}
                            />
                        </GroupCard>

                        <GroupCard label="Salary Details">
                            <DynamicFormRenderer
                                fields={section([
                                    "salary_details_section",
                                    "ps_basic_salary",
                                    "ps_hra",
                                    "ps_ma",
                                    "ps_ta",
                                    "ps_ta_amount",
                                    "ps_hostel",
                                ])}
                                {...commonRendererProps}
                            />
                        </GroupCard>

                        <GroupCard label="Uploads">
                            <DynamicFormRenderer
                                fields={section([
                                    "upload_section_section",
                                    "ps_photo",
                                    "ps_signature",
                                    "ps_medical_certificate",
                                ])}
                                {...commonRendererProps}
                            />
                        </GroupCard>

                        <div className="flex justify-end gap-3 pb-4">
                            {canSave && (
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={cn(
                                        "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold shadow-sm transition-colors",
                                        saving
                                            ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                                            : "bg-[#D97757] text-white hover:bg-[#c5684a]",
                                    )}
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                    {saving ? "Saving..." : "Save"}
                                </button>
                            )}
                            {workflowActions.map((action) => {
                                const busy = actionLoading === action;
                                const anyBusy = !!actionLoading;
                                return (
                                    <button
                                        key={action}
                                        onClick={() => handleWorkflowAction(action)}
                                        disabled={anyBusy || !savedDocName}
                                        title={workflowState ? `Current state: ${workflowState}` : undefined}
                                        className={cn(
                                            "flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold shadow-sm transition-colors",
                                            anyBusy || !savedDocName
                                                ? "bg-zinc-300 text-zinc-500 cursor-not-allowed"
                                                : actionButtonStyle(action),
                                        )}
                                    >
                                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        {busy ? `${action}ing...` : action}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {savedDocName && (
                        <div className="lg:sticky lg:top-6">
                            <ActivityStream
                                ref={activityStreamRef}
                                doctype="Project Staff Details"
                                docname={savedDocName}
                                commentsOnly
                            />
                        </div>
                    )}
                </div>
            </main>

            <CommentModal
                isOpen={commentModalOpen}
                onClose={() => { setCommentModalOpen(false); setPendingWorkflowAction(""); }}
                onSubmit={handleConfirmWorkflowAction}
                action={pendingWorkflowAction}
                isLoading={!!actionLoading}
            />
        </div>
    );
};

export default ProjectStaffJoiningForm;
