import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useFrappePostCall, useFrappeAuth } from "frappe-react-sdk";
import {
    DynamicFormRenderer,
    type FormField,
} from "@/components/forms/DynamicFormRenderer";
import {
    selectionCommitteeReportAPI,
    prepareFormDataForApi,
} from "@/services/apiService";
import { Loader2, ArrowLeft, Save, Send, UserCheck, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserRoles } from "@/components/UserRole";

type LinkOption = {
    value: string;
    label: string;
};

type LinkOptionsMap = Record<string, LinkOption[]>;

const getChairpersonLabel = (
    email: string | null | undefined,
    optionsSource: LinkOptionsMap = {},
): string | null => {
    if (!email) return null;

    const opts: LinkOption[] =
        optionsSource["chairperson_webmail_id"] ||
        optionsSource["User"] ||
        [];
    const match = opts.find((o) => o.value === email);
    return match ? match.label : null;
};

// The Frappe role name for the DORND user who is allowed to edit chairperson fields
const DORND_ROLE = "Dean, RnD";

// --- FRAAPPE UI WRAPPERS ---
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FrappeCard = ({ children, className }: any) => (
    <Card
        className={cn(
            "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] shadow-sm rounded-xl overflow-hidden",
            className,
        )}
    >
        <CardContent className="p-0">{children}</CardContent>
    </Card>
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FrappeButton = ({
    children,
    className,
    variant = "primary",
    ...props
}: any) => (
    <Button
        variant={
            variant === "primary"
                ? "default"
                : variant === "ghost"
                    ? "ghost"
                    : "outline"
        }
        className={cn(className)}
        {...props}
    >
        {children}
    </Button>
);

const SelectionCommitteeReportForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const editDocName = id || searchParams.get("edit");
    const projectParam = searchParams.get("project");
    const projectNoParam = searchParams.get("projectNo"); // Often used as well for the filter
    const interviewIdParam = searchParams.get("interview_id");
    const candidateIdParam = searchParams.get("candidate_id");
    const { currentUser } = useFrappeAuth();

    // Role-based access
    const { roles } = useUserRoles(currentUser ?? null);
    const isDoRnd = roles.includes(DORND_ROLE);

    // Core States
    const [fields, setFields] = useState<FormField[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<LinkOptionsMap>({});
    const [isLoadingFields, setIsLoadingFields] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(
        editDocName || null,
    );

    // Workflow States
    const [workflowState, setWorkflowState] = useState<string>("Draft");
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // API Hooks
    const { call: getFieldsCall } = useFrappePostCall(
        selectionCommitteeReportAPI.getFields,
    );
    const { call: saveCall } = useFrappePostCall(
        selectionCommitteeReportAPI.save,
    );
    const { call: getActionsCall } = useFrappePostCall(
        selectionCommitteeReportAPI.getWorkflowActions,
    );
    const { call: performActionCall } = useFrappePostCall(
        selectionCommitteeReportAPI.performAction,
    );
    // Hook to fetch piheadmentor_user_id from User doctype (client script logic)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>(
        "frappe.client.get_value",
    );
    // Hook to fetch full document (including child tables)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { call: fetchFrappeDoc } = useFrappePostCall<{ message: any }>(
        "frappe.client.get",
    );

    const resolveChairpersonFromDepartment = useCallback(
        async (
            departmentId: string | null | undefined,
            optionsSource: LinkOptionsMap = {},
        ): Promise<Record<string, string>> => {
            if (!departmentId) return {};

            try {
                const departmentRes = await fetchFrappeValue({
                    doctype: "Department_prornd",
                    name: departmentId,
                    fieldname: ["dept_head"],
                });
                const chairpersonEmail = departmentRes?.message?.dept_head;
                if (!chairpersonEmail) return {};

                return {
                    chairperson_webmail_id: chairpersonEmail,
                    chairperson_name:
                        getChairpersonLabel(chairpersonEmail, optionsSource) || "",
                };
            } catch (e) {
                console.error(
                    "Failed to fetch department head for chairperson autofill",
                    e,
                );
                return {};
            }
        },
        [fetchFrappeValue],
    );

    // --- DATA FETCHING ---
    const fetchFormConfiguration = useCallback(async () => {
        setIsLoadingFields(true);
        try {
            let currentDocName = editDocName || savedDocName;

            // Auto-detect existing SCR when opened via ?interview_id=...
            // If no doc is loaded yet but we have an interview_id, check if an SCR already exists
            if (!currentDocName && interviewIdParam) {
                try {
                    const scrListRes = await fetch(
                        `/api/method/frappe.client.get_list`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Accept: "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                                doctype: "Selection Committee Report",
                                filters: { interview_id: interviewIdParam },
                                fields: ["name"],
                                limit_page_length: 1,
                            }),
                        }
                    );
                    if (scrListRes.ok) {
                        const scrListData = await scrListRes.json();
                        const existingSCRs = scrListData?.message || [];
                        if (existingSCRs.length > 0) {
                            const existingDocName = existingSCRs[0].name;
                            console.log("Auto-detected existing SCR:", existingDocName, "for interview_id:", interviewIdParam);
                            currentDocName = existingDocName;
                            setSavedDocName(existingDocName);
                        }
                    }
                } catch (detectErr) {
                    console.error("Failed to auto-detect existing SCR:", detectErr);
                }
            }

            console.log(
                "Fetching config for:",
                currentDocName ? `Doc: ${currentDocName}` : "New Document",
            );

            const response = await getFieldsCall({ doc_name: currentDocName });
            if (response && response.message) {
                const {
                    fields: fetchedFields,
                    prefill_data,
                    link_options,
                } = response.message;
                console.log("Fetched Form Fields:", fetchedFields);

                // WORKAROUND: The custom Python API `get_fields` drops the `hidden` property from the schema payload.
                // Filter out system/hidden fields that should not be rendered.
                const HIDDEN_FIELDS = [
                    "amended_from",
                    "section_break_e3vp",
                    "column_break_mlei",
                    "workflow_state",
                    "committee_members",
                ];
                const filteredFields = (fetchedFields || []).filter(
                    (f: any) => !HIDDEN_FIELDS.includes(f.fieldname),
                );

                // chairperson_name is always read-only (auto-derived, never manually typed).
                // chairperson_webmail_id is editable only for DoRND users.
                const processedFields = filteredFields.map((f: FormField) => {
                    if (f.fieldname === "chairperson_name") {
                        return { ...f, read_only: 1 };
                    }
                    if (f.fieldname === "chairperson_webmail_id" && !isDoRnd) {
                        return { ...f, read_only: 1 };
                    }
                    if (f.fieldname === "webmail_id") {
                        return { ...f, fieldtype: "Data" };
                    }
                    if (f.fieldtype === "Table" && f.child_fields) {
                        return {
                            ...f,
                            child_fields: f.child_fields.map((cf) => {
                                if (cf.fieldname === "webmail_id" || cf.fieldname === "email" || cf.fieldname === "member_email" || cf.label?.toLowerCase().includes("webmail") || cf.label?.toLowerCase().includes("email")) {
                                    return { ...cf, fieldtype: "Data" };
                                }
                                return cf;
                            })
                        };
                    }
                    return f;
                });

                setFields(processedFields);
                setLinkOptions(link_options || {});

                // Initialize Form Data
                if (currentDocName && prefill_data) {
                    // For existing docs: use saved data as-is for chairperson_webmail_id,
                    // but always re-derive chairperson_name from link_options to prevent stale values.
                    const existingData: Record<string, any> = { ...prefill_data };

                    // Prefer the implementation department head if chairperson was not saved.
                    const existingDepartment =
                        existingData.upfa_department ||
                        existingData.implementation_department;
                    if (!existingData.chairperson_webmail_id && existingDepartment) {
                        Object.assign(
                            existingData,
                            await resolveChairpersonFromDepartment(
                                existingDepartment,
                                link_options || {},
                            ),
                        );
                    }

                    // Final fallback: if chairperson_webmail_id was never saved, seed from webmail_id.
                    if (
                        prefill_data.webmail_id &&
                        !existingData.chairperson_webmail_id
                    ) {
                        existingData.chairperson_webmail_id = prefill_data.webmail_id;
                    }

                    // Always re-derive chairperson_name from link_options (ignore any stale saved value)
                    if (existingData.chairperson_webmail_id) {
                        existingData.chairperson_name =
                            getChairpersonLabel(
                                existingData.chairperson_webmail_id,
                                link_options || {},
                            ) || existingData.chairperson_name || "";
                    }

                    // Enrich candidates with post details from Recruitment Adhoc Contractual
                    const existingInterviewId = existingData.interview_id;
                    if (existingInterviewId && existingData.candidates) {
                        try {
                            const recruitmentRes = await fetchFrappeDoc({
                                doctype: "Recruitment Adhoc Contractual",
                                name: existingInterviewId,
                            });
                            if (recruitmentRes?.message) {
                                const rec = recruitmentRes.message;
                                const postDetails = rec.upfa_post_details || [];

                                let candidatesList: any[] = [];
                                try {
                                    candidatesList = typeof existingData.candidates === 'string'
                                        ? JSON.parse(existingData.candidates)
                                        : existingData.candidates;
                                } catch (parseErr) {
                                    console.error("Failed to parse existing candidates", parseErr);
                                }

                                if (Array.isArray(candidatesList) && candidatesList.length > 0 && postDetails.length > 0) {
                                    const enrichedCandidates = candidatesList.map((c: any, i: number) => {
                                        // If candidate already has post details populated, skip
                                        if (c.applied_for_position && c.upfa_basic_pay) return c;

                                        // Try to match by recruitment_post_id, or fall back to first post
                                        const post = postDetails.find((p: any) =>
                                            String(p.name) === String(c.recruitment_post_id) ||
                                            String(p.idx) === String(c.recruitment_post_id)
                                        ) || postDetails[0] || {};

                                        const basic = parseFloat(post.upfa_basic_pay) || 0;
                                        const hraStr = String(post.upfa_hra_percent || "0").replace('%', '');
                                        const hraPercent = parseFloat(hraStr) || 0;
                                        const medical = post.upfa_medical_required === 1 ? 1250 : (parseFloat(post.upfa_medical_required) || 0);
                                        const calculatedTotal = post.upfa_total_amount || (basic + (basic * hraPercent / 100) + medical);

                                        return {
                                            ...c,
                                            sl_no: c.sl_no || i + 1,
                                            applied_for_position: c.applied_for_position || post.upfa_designation || "",
                                            upfa_basic_pay: c.upfa_basic_pay || basic,
                                            upfa_hra_percent: c.upfa_hra_percent || post.upfa_hra_percent || "0%",
                                            upfa_medical_required: c.upfa_medical_required ?? medical,
                                            upfa_total_amount: c.upfa_total_amount || calculatedTotal,
                                            upfa_duration_months: c.upfa_duration_months || post.upfa_duration_months || 0,
                                            upfa_selection_status: c.upfa_selection_status || "",
                                            upfa_justification: c.upfa_justification || "",
                                        };
                                    });

                                    existingData.candidates = JSON.stringify(enrichedCandidates);
                                }

                                // Also enrich post_details if empty
                                if ((!existingData.post_details || existingData.post_details.length === 0) && postDetails.length > 0) {
                                    existingData.post_details = postDetails.map((row: any) => ({
                                        upfa_designation: row.upfa_designation || "",
                                        upfa_vacancies: row.upfa_vacancies || 0,
                                        upfa_basic_pay: row.upfa_basic_pay || 0,
                                        upfa_hra_percent: row.upfa_hra_percent || "",
                                        upfa_medical_required: row.upfa_medical_required || 0,
                                        upfa_total_amount: row.upfa_total_amount || 0,
                                        month_days: row.month_days || "",
                                        upfa_duration_months: row.upfa_duration_months || 0,
                                        upfa_qualification: row.upfa_qualification || "",
                                        upfa_justification: row.upfa_justification || "",
                                    }));
                                }
                            }
                        } catch (enrichErr) {
                            console.error("Failed to enrich candidates with Recruitment data:", enrichErr);
                        }

                        // Fetch candidate_id from applications API (same source as CandidateApplications page)
                        try {
                            const appUrl = `http://172.16.134.191:3000/api/applications?refNumParent=${existingInterviewId}`;
                            const appResponse = await fetch(appUrl);
                            if (appResponse.ok) {
                                const appResult = await appResponse.json();
                                const appsList = Array.isArray(appResult) ? appResult : (appResult.data || []);

                                let candidatesList: any[] = [];
                                try {
                                    candidatesList = typeof existingData.candidates === 'string'
                                        ? JSON.parse(existingData.candidates)
                                        : existingData.candidates;
                                } catch (parseErr) {
                                    console.error("Failed to parse candidates for candidate_id enrichment", parseErr);
                                }

                                if (Array.isArray(candidatesList) && candidatesList.length > 0) {
                                    const enrichedWithIds = candidatesList.map((c: any) => {
                                        if (c.candidate_id) return c; // Already has candidate_id
                                        // Match by application_id to find the correct candidate_id
                                        const matchedApp = appsList.find((app: any) =>
                                            String(app.application_id) === String(c.application_id)
                                        );
                                        return {
                                            ...c,
                                            candidate_id: matchedApp?.candidate_id || matchedApp?.id || "",
                                        };
                                    });
                                    existingData.candidates = JSON.stringify(enrichedWithIds);
                                }
                            }
                        } catch (appErr) {
                            console.error("Failed to fetch candidate_ids from applications API:", appErr);
                        }
                    }

                    setFormData(existingData);
                    setWorkflowState(prefill_data.workflow_state || "Draft");
                } else if (!currentDocName) {
                    // Pre-fill fields for a new form
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const initialData: Record<string, any> = { ...prefill_data };

                    if (interviewIdParam && !initialData.interview_id) {
                        initialData.interview_id = interviewIdParam;
                    }

                    // Auto-fill fields from the linked Recruitment Adhoc Contractual document
                    if (interviewIdParam) {
                        try {
                            const recruitmentRes = await fetchFrappeDoc({
                                doctype: "Recruitment Adhoc Contractual",
                                name: interviewIdParam,
                            });

                            if (recruitmentRes?.message) {
                                const rec = recruitmentRes.message;

                                if (rec.upfa_appointment_type && !initialData.recruitment_type) {
                                    initialData.recruitment_type = rec.upfa_appointment_type;
                                }
                                if (rec.upfa_project_code && !initialData.project_number) {
                                    initialData.project_number = rec.upfa_project_code;
                                }
                                if (rec.upfa_department && !initialData.upfa_department) {
                                    initialData.upfa_department = rec.upfa_department;
                                }
                                if (rec.owner && !initialData.principal_investigator) {
                                    initialData.principal_investigator = rec.owner;
                                }
                                if (rec.upfa_project_title && !initialData.project_name) {
                                    initialData.project_name = rec.upfa_project_title;
                                }
                                if (rec.upfa_interview_date && !initialData.date_of_interview) {
                                    initialData.date_of_interview = rec.upfa_interview_date;
                                }

                                // Auto-fill Post Details child table
                                if (rec.upfa_post_details && Array.isArray(rec.upfa_post_details) && rec.upfa_post_details.length > 0 && (!initialData.post_details || initialData.post_details.length === 0)) {
                                    initialData.post_details = rec.upfa_post_details.map((row: any) => ({
                                        upfa_designation: row.upfa_designation || "",
                                        upfa_vacancies: row.upfa_vacancies || 0,
                                        upfa_basic_pay: row.upfa_basic_pay || 0,
                                        upfa_hra_percent: row.upfa_hra_percent || "",
                                        upfa_medical_required: row.upfa_medical_required || 0,
                                        upfa_total_amount: row.upfa_total_amount || 0,
                                        month_days: row.month_days || "",
                                        upfa_duration_months: row.upfa_duration_months || 0,
                                        upfa_qualification: row.upfa_qualification || "",
                                        upfa_justification: row.upfa_justification || "",
                                    }));

                                    // Auto-fill Total Posts from sum of vacancies
                                    if (!initialData.total_posts) {
                                        initialData.total_posts = initialData.post_details.reduce(
                                            (sum: number, row: any) => sum + (parseInt(row.upfa_vacancies) || 0),
                                            0,
                                        );
                                    }
                                }

                                // Auto-fill Committee Members (JSON field rendered as table)
                                if (rec.upfa_selection_committee && Array.isArray(rec.upfa_selection_committee) && rec.upfa_selection_committee.length > 0 && !initialData.committee_members) {
                                    const committeeData = rec.upfa_selection_committee.map((row: any, idx: number) => ({
                                        sl_no: idx + 1,
                                        email: row.webmail_id__email || "",
                                        name: row.upfa_member_name || "",
                                        designation: row.upfa_member_designation || "",
                                    }));
                                    initialData.committee_members = JSON.stringify(committeeData);
                                }

                                // --- START: Fetch and Map Candidates Called for Interview ---
                                try {
                                    const appUrl = `http://172.16.134.191:3000/api/applications?refNumParent=${interviewIdParam}`;
                                    const appResponse = await fetch(appUrl);
                                    if (appResponse.ok) {
                                        const appResult = await appResponse.json();
                                        const appsList = Array.isArray(appResult) ? appResult : (appResult.data || []);

                                        // Filter for Shortlisted or Appeared candidates
                                        let interviewCandidates = appsList.filter((app: any) =>
                                            app.status?.toLowerCase() === "shortlisted" ||
                                            app.status?.toLowerCase() === "appeared"
                                        );

                                        // Option 2: If candidate_id is provided, show only that specific candidate
                                        console.log("Filtering candidates. URL candidate_id:", candidateIdParam);
                                        if (candidateIdParam) {
                                            interviewCandidates = interviewCandidates.filter((app: any) => {
                                                const matches = String(app.application_id) === candidateIdParam ||
                                                    String(app.id) === candidateIdParam;
                                                return matches;
                                            });
                                            console.log("Candidates after filtering:", interviewCandidates.map((c: any) => c.first_name));
                                        }

                                        if (interviewCandidates.length > 0) {
                                            console.log("Found interview candidates:", interviewCandidates);

                                            // THE FIELD IS named "candidates" and is a JSON string as per browser inspection.
                                            const candidatesFieldName = "candidates";

                                            // Only pre-fill if the table is currently empty
                                            if (!initialData[candidatesFieldName] || initialData[candidatesFieldName].length === 0) {
                                                const mappedCandidates = interviewCandidates.map((app: any) => {
                                                    // Find the corresponding post in recruitment doc
                                                    // Use String conversion to ensure matching even if types differ
                                                    const post = rec.upfa_post_details?.find((p: any) =>
                                                        String(p.name) === String(app.recruitment_post_id) ||
                                                        String(p.idx) === String(app.recruitment_post_id)
                                                    ) || {};

                                                    // Auto-calculate total for the initial map
                                                    const basic = parseFloat(post.upfa_basic_pay) || 0;
                                                    const hraStr = String(post.upfa_hra_percent || "0").replace('%', '');
                                                    const hraPercent = parseFloat(hraStr) || 0;
                                                    const medical = parseFloat(post.upfa_medical_required) || 0;
                                                    const calculatedTotal = basic + (basic * hraPercent / 100) + medical;

                                                    return {
                                                        sl_no: 0,
                                                        candidate_name: `${app.first_name || ""} ${app.last_name || ""}`.trim(),
                                                        candidate_id: app.candidate_id || app.id || "",
                                                        application_id: app.application_id || "",
                                                        applied_for_position: post.upfa_designation || "",
                                                        upfa_basic_pay: basic,
                                                        upfa_hra_percent: post.upfa_hra_percent || "0%",
                                                        upfa_medical_required: medical,
                                                        upfa_total_amount: post.upfa_total_amount || calculatedTotal,
                                                        upfa_duration_months: post.upfa_duration_months || 0,
                                                        upfa_selection_status: "",
                                                        upfa_justification: "",
                                                    };
                                                }).map((c: any, i: number) => ({ ...c, sl_no: i + 1 }));

                                                initialData[candidatesFieldName] = JSON.stringify(mappedCandidates);
                                            }
                                        }
                                    }
                                } catch (appError) {
                                    console.error("Failed to fetch candidate applications:", appError);
                                }
                                // --- END: Fetch and Map Candidates Called for Interview ---

                            }
                        } catch (e) {
                            console.error(
                                "Failed to fetch Recruitment Adhoc Contractual data for interview_id:",
                                interviewIdParam,
                                e,
                            );
                        }
                    }

                    // Client Script Logic: Auto-set webmail_id to current logged-in user
                    if (currentUser && !initialData.webmail_id) {
                        initialData.webmail_id = currentUser;
                    }

                    // Client Script Logic: Fetch piheadmentor_user_id for head field
                    if (
                        initialData.webmail_id &&
                        !["Administrator", "Guest"].includes(initialData.webmail_id)
                    ) {
                        try {
                            const headRes = await fetchFrappeValue({
                                doctype: "User",
                                filters: { name: initialData.webmail_id },
                                fieldname: "piheadmentor_user_id",
                            });
                            if (headRes?.message?.piheadmentor_user_id) {
                                initialData.head = headRes.message.piheadmentor_user_id;
                            }
                        } catch (e) {
                            console.error("Failed to fetch head (piheadmentor_user_id)", e);
                        }
                    }

                    // Always set chairperson_webmail_id from prefill_data.webmail_id for new forms
                    if (prefill_data?.webmail_id) {
                        initialData.chairperson_webmail_id = prefill_data.webmail_id;
                    }

                    // Always derive chairperson_name from link_options (never rely on prefill_data value)
                    const chairpersonEmail = initialData.chairperson_webmail_id;
                    if (chairpersonEmail) {
                        initialData.chairperson_name =
                            getChairpersonLabel(
                                chairpersonEmail,
                                link_options || {},
                            ) || initialData.chairperson_name || "";
                    }

                    // Attempt to prefill project fields from URL param
                    const projectCode = projectParam || projectNoParam;
                    if (projectCode && !initialData.upfa_project_code) {
                        initialData.upfa_project_code = projectCode;

                        // Fetch implementation_department, project_title, and project_duration_months from Project Registration
                        try {
                            const projectRes = await fetchFrappeValue({
                                doctype: "Project Registration",
                                filters: { project_no: projectCode },
                                fieldname: ["implementation_department", "project_title", "project_duration_months"],
                            });

                            if (projectRes?.message) {
                                if (projectRes.message.implementation_department && !initialData.implementation_department) {
                                    initialData.implementation_department = projectRes.message.implementation_department;
                                }
                                if (projectRes.message.implementation_department && !initialData.upfa_department) {
                                    initialData.upfa_department = projectRes.message.implementation_department;
                                }
                                if (projectRes.message.project_title && !initialData.upfa_project_title) {
                                    initialData.upfa_project_title = projectRes.message.project_title;
                                }
                                if (projectRes.message.project_duration_months && !initialData.upfa_project_duration) {
                                    initialData.upfa_project_duration = projectRes.message.project_duration_months;
                                }

                                Object.assign(
                                    initialData,
                                    await resolveChairpersonFromDepartment(
                                        projectRes.message.implementation_department,
                                        link_options || {},
                                    ),
                                );
                            }
                        } catch (e) {
                            console.error("Failed to fetch project details:", e);
                        }
                    }

                    setFormData(initialData);
                    setWorkflowState("Draft");
                }
            }
        } catch (error) {
            console.error("Error fetching form details:", error);
            alert("Failed to load form schema");
        } finally {
            setIsLoadingFields(false);
        }
    }, [
        editDocName,
        savedDocName,
        getFieldsCall,
        currentUser,
        isDoRnd,
        fetchFrappeValue,
        fetchFrappeDoc,
        projectParam,
        projectNoParam,
        interviewIdParam,
        resolveChairpersonFromDepartment,
    ]);

    const fetchWorkflowActions = useCallback(
        async (docName: string) => {
            try {
                const response = await getActionsCall({ docname: docName });
                if (response && response.message) {
                    setAvailableActions(response.message);
                }
            } catch (error) {
                console.error("Failed to fetch workflow actions:", error);
                setAvailableActions([]);
            }
        },
        [getActionsCall],
    );

    // Initial load orchestration
    useEffect(() => {
        fetchFormConfiguration();
    }, [fetchFormConfiguration]);

    // Fetch actions if we have a saved document (or if it's being edited)
    useEffect(() => {
        const docNameToUse = editDocName || savedDocName;
        if (docNameToUse) {
            fetchWorkflowActions(docNameToUse);
        }
    }, [editDocName, savedDocName, fetchWorkflowActions]);

    // --- FORM HANDLERS ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFieldChange = useCallback((fieldname: string, value: any) => {
        setFormData((prev) => ({ ...prev, [fieldname]: value }));
    }, []);

    // Client Script side-effect: when webmail_id or chairperson_webmail_id changes, re-fetch related fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFieldChangeWithSideEffects = useCallback(
        async (fieldname: string, value: any) => {
            handleFieldChange(fieldname, value);

            if (fieldname === "webmail_id") {
                if (value && !["Administrator", "Guest"].includes(value)) {
                    try {
                        const headRes = await fetchFrappeValue({
                            doctype: "User",
                            filters: { name: value },
                            fieldname: "piheadmentor_user_id",
                        });
                        if (headRes?.message?.piheadmentor_user_id) {
                            setFormData((prev) => ({
                                ...prev,
                                head: headRes.message.piheadmentor_user_id,
                            }));
                        }
                    } catch (e) {
                        console.error("Failed to fetch head for webmail_id change", e);
                    }
                } else {
                    // Clear head if webmail_id is cleared or set to system user
                    setFormData((prev) => ({ ...prev, head: "" }));
                }
            }

            // Side-effect: when chairperson_webmail_id changes, auto-fill chairperson_name from linkOptions
            if (fieldname === "chairperson_webmail_id") {
                if (value) {
                    const opts =
                        linkOptions["chairperson_webmail_id"] ||
                        linkOptions["User"] ||
                        [];
                    const match = opts.find((o) => o.value === value);
                    setFormData((prev) => ({
                        ...prev,
                        chairperson_name: match?.label || "",
                    }));
                } else {
                    // Clear chairperson_name if email is cleared
                    setFormData((prev) => ({ ...prev, chairperson_name: "" }));
                }
            }

            if (
                fieldname === "implementation_department" ||
                fieldname === "upfa_department"
            ) {
                const chairpersonData = await resolveChairpersonFromDepartment(
                    value,
                    linkOptions,
                );
                if (chairpersonData.chairperson_webmail_id) {
                    setFormData((prev) => ({
                        ...prev,
                        ...chairpersonData,
                    }));
                }
            }
        },
        [
            handleFieldChange,
            fetchFrappeValue,
            linkOptions,
            resolveChairpersonFromDepartment,
            candidateIdParam,
        ],
    );

    const handleFileChange = useCallback(
        (fieldname: string, file: File | null) => {
            setFormData((prev) => ({ ...prev, [fieldname]: file }));
        },
        [],
    );

    // Handler for table row changes (standard tables)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTableRowChange = useCallback(
        (tableName: string, rowIndex: number, fieldname: string, value: any) => {
            setFormData((prev: any) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    const updatedRow = { ...tableData[rowIndex], [fieldname]: value };

                    // Auto-calculation logic for basic, hra, medical -> total
                    const keys = Object.keys(updatedRow);
                    const bKey = keys.find(k => k.includes('basic_pay'));
                    const hKey = keys.find(k => k.includes('hra'));
                    const mKey = keys.find(k => k.includes('medical'));
                    const tKey = keys.find(k => k.includes('total'));

                    if ((fieldname === bKey || fieldname === hKey || fieldname === mKey) && tKey) {
                        const basic = parseFloat(updatedRow[bKey as string]) || 0;
                        const hraStr = String(updatedRow[hKey as string] || "0").replace('%', '');
                        const hraPercent = parseFloat(hraStr) || 0;
                        const hraAmount = (basic * hraPercent) / 100;

                        let medicalAmount = 0;
                        if (mKey) {
                            const medicalVal = updatedRow[mKey];
                            if (medicalVal === 1 || medicalVal === '1' || medicalVal === true || String(medicalVal).toLowerCase() === 'yes') {
                                medicalAmount = 1250;
                            } else if (medicalVal) {
                                const parsedStr = String(medicalVal).replace(/[^0-9.-]+/g, "");
                                const parsed = parseFloat(parsedStr);
                                if (!isNaN(parsed) && parsed > 0) {
                                    medicalAmount = (parsed === 1) ? 1250 : parsed;
                                }
                            }
                        }

                        updatedRow[tKey] = basic + hraAmount + medicalAmount;
                    }

                    tableData[rowIndex] = updatedRow;
                }
                return { ...prev, [tableName]: tableData };
            });

            // Side effect for Auto-fetching Name when Webmail ID is entered in child tables
            if ((fieldname.includes("webmail") || fieldname.includes("email")) && value && typeof value === 'string' && value.includes('@')) {
                fetchFrappeValue({
                    doctype: "User",
                    filters: { name: value },
                    fieldname: "full_name",
                }).then((res) => {
                    if (res?.message?.full_name) {
                        setFormData((prev: any) => {
                            const tData = [...(prev[tableName] || [])];
                            if (tData[rowIndex]) {
                                const tableField = fields.find(f => f.fieldname === tableName);
                                let nameKey = "name_of_the_committee_member";
                                if (tableField && tableField.child_fields) {
                                    const nameField = tableField.child_fields.find(cf =>
                                        cf.label?.toLowerCase().includes("name") &&
                                        !cf.label?.toLowerCase().includes("email") &&
                                        !cf.label?.toLowerCase().includes("webmail")
                                    );
                                    if (nameField) nameKey = nameField.fieldname;
                                }
                                tData[rowIndex] = { ...tData[rowIndex], [nameKey]: res.message.full_name };
                            }
                            return { ...prev, [tableName]: tData };
                        });
                    }
                }).catch(e => console.error("Auto fetch full name failed", e));
            }
        },
        [fetchFrappeValue, fields],
    );

    // Handler for table file changes
    const handleTableFileChange = useCallback(
        (tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
            setFormData((prev: any) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: file };
                }
                return { ...prev, [tableName]: tableData };
            });
        },
        [],
    );

    // Handler for the custom Candidates selection table (JSON text field storage)
    const handleCandidateRowChange = useCallback((idx: number, field: string, value: any) => {
        setFormData((prev: any) => {
            let candidatesList: any[] = [];
            try {
                if (prev.candidates) {
                    candidatesList = typeof prev.candidates === 'string'
                        ? JSON.parse(prev.candidates)
                        : prev.candidates;
                }
            } catch (e) {
                console.error("Parse error in candidates", e);
            }

            if (candidatesList[idx]) {
                candidatesList[idx] = { ...candidatesList[idx], [field]: value };

                // Auto-calculation for Candidates if values change
                if (field === 'upfa_basic_pay' || field === 'upfa_hra_percent' || field === 'upfa_medical_required') {
                    const basic = parseFloat(candidatesList[idx].upfa_basic_pay) || 0;
                    const hraStr = String(candidatesList[idx].upfa_hra_percent || "0").replace('%', '');
                    const hraPercent = parseFloat(hraStr) || 0;
                    const medical = parseFloat(candidatesList[idx].upfa_medical_required) || 0;
                    candidatesList[idx].upfa_total_amount = basic + (basic * hraPercent / 100) + medical;
                }
            }

            return { ...prev, candidates: JSON.stringify(candidatesList) };
        });
    }, []);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAddTableRow = useCallback(
        (tableName: string, newRow: Record<string, any>) => {
            setFormData((prev) => ({
                ...prev,
                [tableName]: [...(prev[tableName] || []), newRow],
            }));
        },
        [],
    );

    const handleDeleteTableRow = useCallback(
        (tableName: string, rowIndex: number) => {
            setFormData((prev) => ({
                ...prev,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                [tableName]: (prev[tableName] || []).filter(
                    (_: any, idx: number) => idx !== rowIndex,
                ),
            }));
        },
        [],
    );

    // --- ACTIONS ---
    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        setIsSubmitting(true);
        try {
            const preparedData = await prepareFormDataForApi({
                ...formData,
                name: savedDocName || editDocName, // Include name if updating
            });

            console.log("Saving Selection Committee Report:", preparedData);
            const response = await saveCall({ data: preparedData });

            if (response && response.message?.status === "success") {
                const newDocName = response.message.docname;
                alert("Draft saved successfully");

                if (!savedDocName && !editDocName) {
                    setSavedDocName(newDocName);
                    navigate(`/selection-committee-report/${newDocName}`, {
                        replace: true,
                    });
                }

                // Refresh config locally
                fetchFormConfiguration();
            } else {
                alert(response.message?.message || "Failed to save draft");
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error("Save error:", error);
            const errMsg =
                error.exc_type === "ValidationError"
                    ? JSON.parse(error._server_messages || "[]")
                        .map((m: string) => JSON.parse(m).message)
                        .join(", ")
                    : "An error occurred while saving";
            alert(errMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWorkflowAction = async (action: string) => {
        const docNameToUse = savedDocName || editDocName;
        if (!docNameToUse) {
            alert("Please save the document first.");
            return;
        }

        setIsActionLoading(true);
        try {
            let preparedData;
            if (workflowState === "Draft" || action === "Submit") {
                preparedData = await prepareFormDataForApi({
                    ...formData,
                    name: docNameToUse,
                });
            }

            const response = await performActionCall({
                docname: docNameToUse,
                action: action,
                updated_data: preparedData,
            });

            if (
                response &&
                response.message &&
                response.message.status === "success"
            ) {
                alert(`Action "${action}" completed successfully`);
                setWorkflowState(response.message.workflow_state);
                fetchFormConfiguration();
                fetchWorkflowActions(docNameToUse);
            } else {
                const errorDetail = response?.message?.message || (response?.message ? JSON.stringify(response.message) : "");
                alert(
                    errorDetail ? `Failed to perform action ${action}: ${errorDetail}` : `Failed to perform action ${action}`,
                );
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            console.error(`Workflow Action ${action} Error:`, error);

            let errMsg = `An error occurred while performing action: ${action}`;
            try {
                if (error.exc_type === "ValidationError" && error._server_messages) {
                    errMsg = JSON.parse(error._server_messages)
                        .map((m: string) => JSON.parse(m).message)
                        .join("\n");
                } else if (error.message) {
                    errMsg = error.message;
                }
            } catch (e) {
                console.error("Failed to parse server messages", e);
            }
            alert(errMsg);
        } finally {
            setIsActionLoading(false);
        }
    };

    // --- RENDER HELPERS ---
    const isFormReadOnly = workflowState !== "Draft" && workflowState !== "Pending";
    const isReadOnly = isFormReadOnly;
    const deanOverrideReadOnly = isDoRnd && isFormReadOnly;

    if (isLoadingFields) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#D97757]" />
                <p className="text-zinc-500 font-medium">
                    Loading form configuration...
                </p>
            </div>
        );
    }

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <main className="max-w-8xl mx-auto p-4 md:p-8 w-full overflow-hidden">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                            Selection Committee Report
                            {(editDocName || savedDocName) && (
                                <span
                                    className={cn(
                                        "text-xs font-sans px-2.5 py-1 rounded-full border",
                                        workflowState === "Approved"
                                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                                            : workflowState === "Draft"
                                                ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                                                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50",
                                    )}
                                >
                                    {workflowState}
                                </span>
                            )}
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            {editDocName || savedDocName
                                ? `Application ID: ${editDocName || savedDocName}`
                                : "New Application"}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* Main Form Content */}
                    <div className="space-y-6">
                        <FrappeCard>
                            <div className="p-8">
                                <DynamicFormRenderer
                                    fields={(() => {
                                        const INTERNAL_FIELDS = ["candidates"]; // Fields to hide as they have custom renderers
                                        const DEAN_ONLY_FIELDS = ["chairperson_webmail_id", "chairperson_name"];

                                        let visibleFields = isDoRnd ? fields : fields.filter(f => !DEAN_ONLY_FIELDS.includes(f.fieldname));

                                        // Filter out hidden internal fields
                                        visibleFields = visibleFields.filter(f => !INTERNAL_FIELDS.includes(f.fieldname));

                                        // For Dean in non-Draft states: mark all fields except chairperson as read_only
                                        if (deanOverrideReadOnly) {
                                            visibleFields = visibleFields.map(f =>
                                                DEAN_ONLY_FIELDS.includes(f.fieldname)
                                                    ? { ...f, read_only: 0, read_only_depends_on: undefined, fieldtype: f.fieldtype === "Read Only" ? "Data" : f.fieldtype }
                                                    : { ...f, read_only: 1 }
                                            );
                                        }

                                        return visibleFields;
                                    })()}
                                    formData={formData}
                                    linkOptions={linkOptions}
                                    onChange={handleFieldChange}
                                    onFileChange={handleFileChange}
                                    onTableRowChange={handleTableRowChange}
                                    onTableFileChange={handleTableFileChange}
                                    onAddTableRow={handleAddTableRow}
                                    onDeleteTableRow={handleDeleteTableRow}
                                    onFieldChangeWithSideEffects={
                                        handleFieldChangeWithSideEffects
                                    }
                                    readOnly={deanOverrideReadOnly ? false : isReadOnly}
                                />

                                {/* Custom Candidates Selection Table */}
                                {(() => {
                                    let candidateRows: any[] = [];
                                    try {
                                        if (formData.candidates) {
                                            candidateRows = typeof formData.candidates === 'string'
                                                ? JSON.parse(formData.candidates)
                                                : formData.candidates;
                                        }
                                    } catch (e) {
                                        console.error('Failed to parse candidates data', e);
                                    }

                                    if (!Array.isArray(candidateRows) || candidateRows.length === 0) return null;

                                    return (
                                        <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                                            <h3 className="text-xl font-serif font-medium text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-3">
                                                <UserCheck className="w-6 h-6 text-[#D97757]" />
                                                Candidates Called for Interview
                                            </h3>
                                            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-md bg-white dark:bg-zinc-900">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                                                            <th className="px-4 py-4 text-left font-bold text-zinc-700 dark:text-zinc-300 w-12">#</th>
                                                            <th className="px-4 py-4 text-left font-bold text-zinc-700 dark:text-zinc-300">Candidate Name</th>
                                                            <th className="px-4 py-4 text-left font-bold text-zinc-700 dark:text-zinc-300">Applied Position</th>
                                                            <th className="px-4 py-4 text-left font-bold text-zinc-700 dark:text-zinc-300 w-24">Basic Pay</th>
                                                            <th className="px-4 py-4 text-left font-bold text-zinc-700 dark:text-zinc-300 w-20">HRA %</th>
                                                            <th className="px-4 py-4 text-left font-bold text-zinc-700 dark:text-zinc-300 w-20">Medical</th>
                                                            <th className="px-4 py-4 text-left font-bold text-zinc-700 dark:text-zinc-300">Total Amount</th>
                                                            <th className="px-4 py-4 text-left font-bold text-zinc-700 dark:text-zinc-300 w-32 text-center">Selection Status</th>
                                                            <th className="px-4 py-4 text-left font-bold text-zinc-700 dark:text-zinc-300 min-w-[200px]">Justification</th>
                                                            <th className="px-4 py-4 text-center font-bold text-zinc-700 dark:text-zinc-300 w-36">Details</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                                        {candidateRows.map((row: any, idx: number) => (
                                                            <tr key={idx} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                                                <td className="px-4 py-4 text-zinc-500 font-medium">{idx + 1}</td>
                                                                <td className="px-4 py-4 font-semibold text-zinc-800 dark:text-zinc-200">{row.candidate_name}</td>
                                                                <td className="px-4 py-4 text-zinc-600 dark:text-zinc-400">{row.applied_for_position}</td>
                                                                <td className="px-4 py-4 text-zinc-800 dark:text-zinc-200">{row.upfa_basic_pay}</td>
                                                                <td className="px-4 py-4 text-zinc-800 dark:text-zinc-200">{row.upfa_hra_percent}</td>
                                                                <td className="px-4 py-4 text-zinc-800 dark:text-zinc-200">{row.upfa_medical_required}</td>
                                                                <td className="px-4 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                                                                    ₹{parseFloat(row.upfa_total_amount).toLocaleString('en-IN')}
                                                                </td>
                                                                <td className="px-2 py-4">
                                                                    <select
                                                                        value={row.upfa_selection_status || ''}
                                                                        onChange={(e) => handleCandidateRowChange(idx, 'upfa_selection_status', e.target.value)}
                                                                        disabled={isReadOnly}
                                                                        className="w-full bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-md py-1.5 px-2 text-sm focus:ring-2 focus:ring-[#D97757] outline-none"
                                                                    >
                                                                        <option value="">Select</option>
                                                                        <option value="Recommended">Recommended</option>
                                                                        <option value="Waiting">Waiting</option>
                                                                        <option value="Not Recommended">Not Recommended</option>
                                                                    </select>
                                                                </td>
                                                                <td className="px-2 py-4">
                                                                    <textarea
                                                                        value={row.upfa_justification || ''}
                                                                        onChange={(e) => handleCandidateRowChange(idx, 'upfa_justification', e.target.value)}
                                                                        disabled={isReadOnly}
                                                                        placeholder="Enter justification..."
                                                                        rows={1}
                                                                        className="w-full bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-md py-1.5 px-2 text-sm focus:ring-2 focus:ring-[#D97757] outline-none resize-none"
                                                                    />
                                                                </td>
                                                                <td className="px-2 py-4 text-center">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => navigate(`/candidate-details/${row.candidate_id || row.application_id}?refNum=${formData.interview_id || ''}&applicationId=${row.application_id}`)}
                                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#D97757]/10 text-[#D97757] hover:bg-[#D97757]/20 border border-[#D97757]/20 transition-colors"
                                                                    >
                                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                                        View Details
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}

                                {/* Custom Committee Members Table */}
                                {(() => {
                                    let committeeRows: any[] = [];
                                    try {
                                        if (formData.committee_members) {
                                            const parsed = typeof formData.committee_members === 'string'
                                                ? JSON.parse(formData.committee_members)
                                                : formData.committee_members;
                                            if (Array.isArray(parsed)) committeeRows = parsed;
                                        }
                                    } catch (e) {
                                        console.error('Failed to parse committee_members', e);
                                    }

                                    if (committeeRows.length === 0) return null;

                                    return (
                                        <div className="mt-8">
                                            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mb-4">Committee Members:</h3>
                                            <div className="overflow-x-auto border border-zinc-300 dark:border-zinc-700 rounded-lg">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-300 dark:border-zinc-700">
                                                            <th className="px-4 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 w-16">Sl No.</th>
                                                            <th className="px-4 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300">Email</th>
                                                            <th className="px-4 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300">Name</th>
                                                            <th className="px-4 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300">Designation</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {committeeRows.map((row: any, idx: number) => (
                                                            <tr key={idx} className="border-b border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                                                <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{row.sl_no || idx + 1}</td>
                                                                <td className="px-4 py-2.5 text-zinc-800 dark:text-zinc-200">{row.email || ''}</td>
                                                                <td className="px-4 py-2.5 text-zinc-800 dark:text-zinc-200">{row.name || ''}</td>
                                                                <td className="px-4 py-2.5 text-zinc-800 dark:text-zinc-200">{row.designation || ''}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Action Bar */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 p-6 flex items-center justify-between">
                                <div className="text-sm text-zinc-500">
                                    {(editDocName || savedDocName) &&
                                        `Last updated: ${new Date().toLocaleTimeString()}`}
                                </div>
                                <div className="flex gap-3">
                                    {workflowState === "Draft" ? (
                                        <>
                                            <FrappeButton
                                                variant="outline"
                                                onClick={handleSave}
                                                disabled={isSubmitting || isActionLoading}
                                                className="bg-white dark:bg-zinc-800 shadow-sm"
                                            >
                                                {isSubmitting ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : (
                                                    <Save className="w-4 h-4 mr-2" />
                                                )}
                                                Save Draft
                                            </FrappeButton>

                                            {/* We rely on workflow actions for submission if available, otherwise fallback */}
                                            {availableActions.includes("Submit") ? (
                                                <FrappeButton
                                                    onClick={() => handleWorkflowAction("Submit")}
                                                    disabled={isSubmitting || isActionLoading}
                                                    className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                                                >
                                                    {isActionLoading ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <Send className="w-4 h-4 mr-2" />
                                                    )}
                                                    Submit
                                                </FrappeButton>
                                            ) : (
                                                <FrappeButton
                                                    onClick={handleSave} // fallback to just save if no workflow submit configured yet manually
                                                    disabled={
                                                        isSubmitting ||
                                                        isActionLoading ||
                                                        !(savedDocName || editDocName)
                                                    }
                                                    className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                                                >
                                                    {isSubmitting ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : (
                                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    )}
                                                    Save & Continue
                                                </FrappeButton>
                                            )}
                                        </>
                                    ) : (
                                        /* Any Other Workflow Actions */
                                        availableActions.map((action) => (
                                            <FrappeButton
                                                key={action}
                                                onClick={() => handleWorkflowAction(action)}
                                                disabled={isActionLoading}
                                                className={cn(
                                                    "shadow-sm",
                                                    action === "Approve"
                                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        : action === "Reject"
                                                            ? "bg-red-600 hover:bg-red-700 text-white"
                                                            : "bg-[#D97757] hover:opacity-90 text-white",
                                                )}
                                            >
                                                {isActionLoading ? (
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                ) : null}
                                                {action}
                                            </FrappeButton>
                                        ))
                                    )}
                                </div>
                            </div>
                        </FrappeCard>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SelectionCommitteeReportForm;
