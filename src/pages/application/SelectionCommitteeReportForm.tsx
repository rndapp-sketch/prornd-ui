

// ===================print


import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useFrappePostCall, useFrappeAuth, useFrappeGetCall } from "frappe-react-sdk";
import {
    DynamicFormRenderer,
    type FormField,
} from "@/components/forms/DynamicFormRenderer";
import {
    selectionCommitteeReportAPI,
    prepareFormDataForApi,
    candidateAPI,
} from "@/services/apiService";
import { Loader2, Save, Send, CheckCircle2, Printer, EyeIcon, MessageSquare, X } from "lucide-react";
import ViewProjectButton from "@/components/ViewProjectButton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserRoles } from "@/components/UserRole";
import { DepartmentName } from "@/components/DepartmentName";
import { ActivityStream } from "@/components/ActivityStream";
import { PageHeader } from "@/components/common/PageHeader";
import { GlobalLoader } from "@/components/ui/global-loader";

type LinkOption = {
    value: string;
    label: string;
};

type LinkOptionsMap = Record<string, LinkOption[]>;

type CandidateRecord = {
    application_id: string;
    recruitment_post_id: string;
    candidate_id: string;
    status: string;
    display_name: string;
    post_designation: string;
};

type CommitteeMemberRow = {
    id: string;
    sl_no: number;
    email: string;
    name: string;
    designation: string;
    is_chairperson?: boolean;
};

const COMMITTEE_DESIGNATION_OPTIONS = [
    "PI & Convener",
    "Expert Member",
    "External Expert",
] as const;

type CandidateRow = {
    id: string;
    candidate_name: string;
    application_id: string;
    recruitment_post_id: string;
    candidate_id: string;
    applied_post: string;
    basic_pay: number | string;
    hra: string;
    medical_required: string;
    total_amount: number | string;
    upfa_duration_months: number | string;
    recommendation: string;
    waitlist_no: number | string;
    justification: string;
};

type PostDetail = {
    upfa_designation: string;
    upfa_basic_pay: number;
    upfa_hra_percent: string;
    upfa_medical_required: number | boolean;
    upfa_total_amount: number;
    upfa_duration_months: number | string;
};

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
    const [isActivityOpen, setIsActivityOpen] = useState(false);

    // Workflow States
    const [workflowState, setWorkflowState] = useState<string>("Draft");
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Candidates feature
    const [candidatesList, setCandidatesList] = useState<CandidateRecord[]>([]);
    const [postDetailsCache, setPostDetailsCache] = useState<Record<string, PostDetail>>({});
    const [isFetchingCandidates, setIsFetchingCandidates] = useState(false);
    const recruitmentDocRef = useRef<any>(null);

    // Committee members: true when auto-filled from Recruitment Adhoc Contractual (read-only)
    const [isCommitteeFromRecruitment, setIsCommitteeFromRecruitment] = useState(false);


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
    const { call: callUpdateSendToDirector, loading: isUpdatingSendToDirector } = useFrappePostCall(
        selectionCommitteeReportAPI.updateSendToDirector,
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
    const fetchCandidatesWithPostDetails = useCallback(async (interviewId: string) => {
        setIsFetchingCandidates(true);
        try {
            const res = await fetch(candidateAPI.getApplications(interviewId));
            if (!res.ok) return;
            const data = await res.json();
            const rawList = Array.isArray(data) ? data : (data?.data || []);
            console.log("[SCR] first application record keys:", rawList[0] ? Object.keys(rawList[0]) : "empty", rawList[0]);
            const records: CandidateRecord[] = rawList.map((app: any) => ({
                application_id: String(app.application_id || ""),
                recruitment_post_id: String(app.recruitment_post_id || ""),
                candidate_id: String(app.candidate_id || ""),
                status: app.status || "",
                display_name: `${(app.first_name || "").trim()} ${(app.last_name || "").trim()}`.trim(),
                post_designation: app.post_title || app.designation || app.applied_for || app.post_name || app.recruitment_post_title || app.position || "",
            }));
            setCandidatesList(records);

            const uniquePostIds = [...new Set(records.map(r => r.recruitment_post_id).filter(Boolean))];
            const entries = await Promise.all(
                uniquePostIds.map(async (postId) => {
                    try {
                        const postRes = await fetch(candidateAPI.getPost(postId));
                        if (!postRes.ok) return null;
                        const postData = await postRes.json();
                        const p = postData?.data ?? postData;
                        console.log("[SCR] post record keys:", Object.keys(p), p);
                        return [postId, {
                            upfa_designation: p.designation || p.upfa_designation || p.post_name || p.title || p.position || "",
                            upfa_basic_pay: p.basic_pay ?? p.upfa_basic_pay ?? 0,
                            upfa_hra_percent: p.hra_percent ?? p.upfa_hra_percent ?? p.hra ?? "",
                            upfa_medical_required: p.medical_required ?? p.upfa_medical_required ?? 0,
                            upfa_total_amount: p.total_amount ?? p.upfa_total_amount ?? 0,
                            upfa_duration_months: p.duration_months ?? p.upfa_duration_months ?? "",
                        }] as [string, PostDetail];
                    } catch { return null; }
                })
            );
            const cache: Record<string, PostDetail> = {};
            for (const entry of entries) {
                if (entry) cache[entry[0]] = entry[1];
            }
            setPostDetailsCache(cache);

            // Patch post_designation from cache or recruitment doc for any candidates that didn't have it in the application response
            setCandidatesList(prev => prev.map(r => ({
                ...r,
                post_designation: r.post_designation ||
                    cache[r.recruitment_post_id]?.upfa_designation ||
                    recruitmentDocRef.current?.upfa_post_details?.find((p: any) => p.name === r.recruitment_post_id)?.upfa_designation ||
                    "",
            })));
        } catch (e) {
            console.error("Failed to fetch candidates:", e);
        } finally {
            setIsFetchingCandidates(false);
        }
    }, []);

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
            const currentDocName = editDocName || savedDocName;
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
                    "candidates",
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

                    // Extract chairperson from saved committee_members (embedded as id="1")
                    if (!existingData.chairperson_webmail_id && existingData.committee_members) {
                        try {
                            const cmRows: CommitteeMemberRow[] = typeof existingData.committee_members === "string"
                                ? JSON.parse(existingData.committee_members)
                                : existingData.committee_members;
                            const chairRow = cmRows.find(r => r.is_chairperson);
                            if (chairRow) {
                                existingData.chairperson_webmail_id = chairRow.email;
                                existingData.chairperson_name = chairRow.name;
                            }
                        } catch { /* ignore */ }
                    }

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

                    // Resolve pi_full_name for existing docs if not already saved
                    if (!existingData.pi_full_name) {
                        const piEmail = existingData.principal_investigator || existingData.webmail_id;
                        if (piEmail && piEmail.includes('@')) {
                            try {
                                const piRes = await fetchFrappeValue({
                                    doctype: "User",
                                    filters: { name: piEmail },
                                    fieldname: "full_name",
                                });
                                if (piRes?.message?.full_name) {
                                    existingData.pi_full_name = piRes.message.full_name;
                                }
                            } catch { /* ignore */ }
                        }
                    }

                    setFormData(existingData);
                    setWorkflowState(prefill_data.workflow_state || "Draft");

                    // Fetch candidates list so dropdown options are available for existing docs
                    const existingInterviewId = existingData.interview_id || interviewIdParam;
                    if (existingInterviewId) {
                        if (!recruitmentDocRef.current) {
                            try {
                                const recRes = await fetchFrappeDoc({
                                    doctype: "Recruitment Adhoc Contractual",
                                    name: existingInterviewId,
                                });
                                if (recRes?.message) {
                                    recruitmentDocRef.current = recRes.message;
                                    if (recRes.message.upfa_selection_committee?.length > 0) {
                                        setIsCommitteeFromRecruitment(true);
                                    }
                                }
                            } catch (e) {
                                console.error("Failed to fetch recruitment doc for existing doc:", e);
                            }
                        }
                        await fetchCandidatesWithPostDetails(existingInterviewId);
                    }
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
                                // Debug: log all rec keys to find chairperson field names
                                console.log("[SCR] rec keys:", Object.keys(rec));
                                console.log("[SCR] rec chairperson candidates:", {
                                    chairperson_webmail_id: rec.chairperson_webmail_id,
                                    upfa_chairperson_webmail_id: rec.upfa_chairperson_webmail_id,
                                    upfa_chairperson: rec.upfa_chairperson,
                                    chairperson: rec.chairperson,
                                    chairperson_name: rec.chairperson_name,
                                    upfa_chairperson_name: rec.upfa_chairperson_name,
                                    upfa_department: rec.upfa_department,
                                });

                                // Try to read chairperson directly from recruitment doc fields
                                const recChairpersonEmail =
                                    rec.chairperson_webmail_id ||
                                    rec.upfa_chairperson_webmail_id ||
                                    rec.upfa_chairperson ||
                                    rec.chairperson ||
                                    "";
                                const recChairpersonName =
                                    rec.chairperson_name ||
                                    rec.upfa_chairperson_name ||
                                    "";

                                if (recChairpersonEmail) {
                                    initialData.chairperson_webmail_id = recChairpersonEmail;
                                    initialData.chairperson_name =
                                        recChairpersonName ||
                                        getChairpersonLabel(recChairpersonEmail, link_options || "") || "";
                                } else if (rec.upfa_department) {
                                    // Fallback: resolve from department head
                                    Object.assign(
                                        initialData,
                                        await resolveChairpersonFromDepartment(rec.upfa_department, link_options || {}),
                                    );
                                }
                                if (rec.owner && !initialData.principal_investigator) {
                                    // Store the email in principal_investigator (it's a Link-to-User field)
                                    initialData.principal_investigator = rec.owner;
                                    // Separately resolve and store the PI's full name for display in print
                                    try {
                                        const ownerRes = await fetchFrappeValue({
                                            doctype: "User",
                                            filters: { name: rec.owner },
                                            fieldname: "full_name",
                                        });
                                        initialData.pi_full_name = ownerRes?.message?.full_name || rec.owner;
                                    } catch {
                                        initialData.pi_full_name = rec.owner;
                                    }
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
                                if (rec.upfa_selection_committee && Array.isArray(rec.upfa_selection_committee) && !initialData.committee_members) {
                                    const committeeData = rec.upfa_selection_committee.map((row: any, idx: number) => ({
                                        id: String(idx),
                                        sl_no: idx + 1,
                                        email: row.webmail_id__email || "",
                                        name: row.upfa_member_name || "",
                                        designation: row.upfa_member_designation || "",
                                    }));
                                    initialData.committee_members = JSON.stringify(committeeData);
                                    if (committeeData.length > 0) {
                                        setIsCommitteeFromRecruitment(true);
                                    }
                                }

                                // Cache recruitment doc, then load candidates list for dropdown
                                recruitmentDocRef.current = rec;
                                await fetchCandidatesWithPostDetails(interviewIdParam);

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

                    // Fall back to the PI's webmail only if no department head was resolved
                    if (prefill_data?.webmail_id && !initialData.chairperson_webmail_id) {
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
        fetchCandidatesWithPostDetails,
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
        ],
    );

    const handleFileChange = useCallback(
        (fieldname: string, file: File | null) => {
            setFormData((prev) => ({ ...prev, [fieldname]: file }));
        },
        [],
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleTableRowChange = useCallback(
        (tableName: string, rowIndex: number, fieldname: string, value: any) => {
            setFormData((prev) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    const updatedRow = { ...tableData[rowIndex], [fieldname]: value };

                    // Auto Calculation Logic for Project Staff Designation
                    const keys = Object.keys(updatedRow);
                    const basicPayKey = keys.find(k => k.includes('basic_pay'));
                    const hraKey = keys.find(k => k.includes('hra'));
                    const medicalKey = keys.find(k => k.includes('medical'));
                    const totalKey = keys.find(k => k.includes('total'));

                    if ((fieldname === basicPayKey || fieldname === hraKey || fieldname === medicalKey) && totalKey) {
                        const basic = parseFloat(updatedRow[basicPayKey as string]) || 0;
                        const hraStr = String(updatedRow[hraKey as string] || "0").replace('%', '');
                        const hraPercent = parseFloat(hraStr) || 0;
                        const hraAmount = (basic * hraPercent) / 100;

                        let medicalAmount = 0;
                        if (medicalKey) {
                            const medicalVal = updatedRow[medicalKey];
                            if (medicalVal === 1 || medicalVal === '1' || medicalVal === true || String(medicalVal).toLowerCase() === 'yes') {
                                medicalAmount = 1250;
                            } else if (medicalVal) {
                                const parsedStr = String(medicalVal).replace(/[^0-9.-]+/g, "");
                                const parsed = parseFloat(parsedStr);
                                if (!isNaN(parsed) && parsed > 0) {
                                    medicalAmount = parsed === 1 ? 1250 : parsed;
                                }
                            }
                        }

                        updatedRow[totalKey] = basic + hraAmount + medicalAmount;
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
                        setFormData((prev) => {
                            const tData = [...(prev[tableName] || [])];
                            if (tData[rowIndex]) {
                                // Find the fieldname corresponding to "Name" in the current table schema
                                const tableField = fields.find(f => f.fieldname === tableName);
                                let nameKey = "name_of_the_committee_member"; // default guess
                                if (tableField && tableField.child_fields) {
                                    const nameField = tableField.child_fields.find(cf => cf.label?.toLowerCase().includes("name") && !cf.label?.toLowerCase().includes("email") && !cf.label?.toLowerCase().includes("webmail") && !cf.label?.toLowerCase().includes("designation") && !cf.label?.toLowerCase().includes("department"));
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

    const handleTableFileChange = useCallback(
        (
            tableName: string,
            rowIndex: number,
            fieldname: string,
            file: File | null,
        ) => {
            setFormData((prev) => {
                const tableData = [...(prev[tableName] || [])];
                if (tableData[rowIndex]) {
                    tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: file };
                }
                return { ...prev, [tableName]: tableData };
            });
        },
        [],
    );

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

    // --- CANDIDATES TABLE HELPERS ---
    const getCandidateRows = useCallback((): CandidateRow[] => {
        try {
            const val = formData.candidates;
            if (!val) return [];
            if (Array.isArray(val)) return val as CandidateRow[];
            if (typeof val === "string") return JSON.parse(val) as CandidateRow[];
            return [];
        } catch { return []; }
    }, [formData.candidates]);

    const updateCandidateRow = useCallback((rowIndex: number, updates: Partial<CandidateRow>) => {
        setFormData(prev => {
            let rows: CandidateRow[];
            try {
                const val = prev.candidates;
                if (!val) rows = [];
                else if (Array.isArray(val)) rows = [...val];
                else rows = JSON.parse(val);
            } catch { rows = []; }
            return { ...prev, candidates: rows.map((r, i) => i === rowIndex ? { ...r, ...updates } : r) };
        });
    }, []);

    // --- COMMITTEE MEMBERS TABLE HELPERS ---
    const getCommitteeRows = useCallback((): CommitteeMemberRow[] => {
        try {
            const val = formData.committee_members;
            if (!val) return [];
            const rows: CommitteeMemberRow[] = Array.isArray(val) ? val : JSON.parse(val);
            return rows.filter(r => !r.is_chairperson);
        } catch { return []; }
    }, [formData.committee_members]);

    const updateCommitteeRow = useCallback((rowIndex: number, updates: Partial<CommitteeMemberRow>) => {
        setFormData(prev => {
            let rows: CommitteeMemberRow[];
            try {
                const val = prev.committee_members;
                if (!val) rows = [];
                else if (Array.isArray(val)) rows = [...val];
                else rows = JSON.parse(val);
            } catch { rows = []; }
            return { ...prev, committee_members: rows.map((r, i) => i === rowIndex ? { ...r, ...updates } : r) };
        });
    }, []);

    const handleCommitteeEmailSelect = useCallback((rowIndex: number, email: string) => {
        const userOpts = linkOptions["chairperson_webmail_id"] || linkOptions["User"] || [];
        const match = userOpts.find(o => o.value === email);
        updateCommitteeRow(rowIndex, {
            email,
            name: match?.label || "",
        });
    }, [linkOptions, updateCommitteeRow]);

    const handleCandidateSelect = useCallback(async (rowIndex: number, applicationId: string) => {
        const candidate = candidatesList.find(c => c.application_id === applicationId);
        if (!candidate) return;

        // Deduplication check: same candidate + same post (same application_id) is a duplicate;
        // same candidate applying for a different post (different application_id) is allowed.
        const rows = getCandidateRows();
        const isDuplicate = rows.some((r, i) => i !== rowIndex && r.application_id === candidate.application_id);
        if (isDuplicate) {
            alert(`This candidate application is already selected in another row.`);
            return;
        }

        // Use post details cache (populated when candidates list loaded), fallback to Frappe doc
        const cached = postDetailsCache[candidate.recruitment_post_id];
        const recDoc = recruitmentDocRef.current;
        const frappePostDetail = recDoc?.upfa_post_details?.find((p: any) => p.name === candidate.recruitment_post_id);
        const postDetail: PostDetail | undefined = cached ?? (frappePostDetail ? {
            upfa_designation: frappePostDetail.upfa_designation || "",
            upfa_basic_pay: frappePostDetail.upfa_basic_pay ?? 0,
            upfa_hra_percent: frappePostDetail.upfa_hra_percent || "",
            upfa_medical_required: frappePostDetail.upfa_medical_required ?? 0,
            upfa_total_amount: frappePostDetail.upfa_total_amount ?? 0,
            upfa_duration_months: frappePostDetail.upfa_duration_months ?? "",
        } : undefined);

        updateCandidateRow(rowIndex, {
            candidate_name: candidate.display_name,
            application_id: candidate.application_id,
            recruitment_post_id: candidate.recruitment_post_id,
            candidate_id: candidate.candidate_id,
            applied_post: postDetail?.upfa_designation || "",
            basic_pay: postDetail?.upfa_basic_pay ?? 0,
            hra: postDetail?.upfa_hra_percent || "",
            medical_required: postDetail?.upfa_medical_required ? "Yes" : "No",
            total_amount: postDetail?.upfa_total_amount ?? 0,
            upfa_duration_months: postDetail?.upfa_duration_months ?? "",
        });
    }, [candidatesList, getCandidateRows, updateCandidateRow, postDetailsCache]);

    // Build committee_members JSON: chairperson as id="1", others as "2","3",...
    const buildCommitteeMembersPayload = useCallback((currentFormData: Record<string, any>): string => {
        let rows: CommitteeMemberRow[] = [];
        try {
            const val = currentFormData.committee_members;
            if (val) {
                const parsed: CommitteeMemberRow[] = Array.isArray(val) ? val : JSON.parse(val);
                rows = parsed.filter(r => !r.is_chairperson);
            }
        } catch { /* keep empty */ }

        const allRows: CommitteeMemberRow[] = [];
        if (currentFormData.chairperson_webmail_id) {
            allRows.push({
                id: "1",
                sl_no: 1,
                email: currentFormData.chairperson_webmail_id,
                name: currentFormData.chairperson_name || "",
                designation: "Chairperson",
                is_chairperson: true,
            });
        }
        rows.forEach(r => {
            allRows.push({ ...r, id: String(allRows.length + 1), sl_no: allRows.length + 1 });
        });
        return JSON.stringify(allRows);
    }, []);

    // --- ACTIONS ---
    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // Candidates table is required before saving
        const candidateRows = getCandidateRows();
        if (candidateRows.length === 0) {
            alert("Please add at least one candidate in the Candidates & Recommendations table before saving.");
            return;
        }
        if (candidateRows.some(r => !r.candidate_name)) {
            alert("All candidate rows must have a candidate selected.");
            return;
        }
        if (candidateRows.some(r => !r.recommendation)) {
            alert("All candidates must have a recommendation (Recommended / Not Recommended / Waiting List) selected.");
            return;
        }

        setIsSubmitting(true);
        try {
            const candidatesVal = formData.candidates;
            const preparedData = await prepareFormDataForApi({
                ...formData,
                name: savedDocName || editDocName,
                candidates: Array.isArray(candidatesVal)
                    ? JSON.stringify(candidatesVal)
                    : (candidatesVal || "[]"),
                committee_members: buildCommitteeMembersPayload(formData),
            });

            console.log("Saving Selection Committee Report:", preparedData);
            const response = await saveCall({ data: preparedData });

            if (response && response.message?.status === "success") {
                const newDocName = response.message.docname;
                alert("Draft saved successfully");

                if (!savedDocName && !editDocName) {
                    // New doc: navigate to the edit URL. The URL change triggers a
                    // re-render which fires the useEffect → fetchFormConfiguration
                    // with the correct editDocName from the new URL param.
                    setSavedDocName(newDocName);
                    navigate(`/selection-committee-report/${newDocName}`, {
                        replace: true,
                    });
                } else {
                    // Existing doc: no URL change, so manually refresh
                    fetchFormConfiguration();
                }
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
                const candidatesVal = formData.candidates;
                preparedData = await prepareFormDataForApi({
                    ...formData,
                    name: docNameToUse,
                    candidates: Array.isArray(candidatesVal)
                        ? JSON.stringify(candidatesVal)
                        : (candidatesVal || "[]"),
                    committee_members: buildCommitteeMembersPayload(formData),
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
        return <GlobalLoader isLoading delay={0} />;
    }

    const handlePrint = () => {
        const originalTitle = document.title;
        document.title = 'Selection_Committee_Report';
        window.print();
        document.title = originalTitle;
    };
    const activityDocName = savedDocName || editDocName;

    return (
        <>
            <style>{`
            @media print {
                @page { size: A4; margin: 0; }

                /* === Step 1: Hide app shell (navbar/sidebar) via visibility === */
                body { visibility: hidden !important; background: #fff !important; margin: 0; }

                /* === Step 2: Collapse wrapper height so min-h-screen doesn't create a blank page === */
                #scr-print-root { min-height: 0 !important; }
                #scr-print-root > main { padding: 0 !important; min-height: 0 !important; }

                /* === Step 3: Remove interactive form from document FLOW (fixes blank pages) === */
                /* display:none removes them from layout entirely — no extra page height */
                .scr-page-header  { display: none !important; }
                .scr-form-content { display: none !important; }
                .scr-action-bar   { display: none !important; }

                /* === Step 3: Show only the print layout in normal flow === */
                .scr-print-layout,
                .scr-print-layout * { visibility: visible !important; }
                .scr-print-layout {
                    position: static !important;   /* stays in flow → natural pagination */
                    display: block !important;
                    width: 100% !important;
                    background: #fff !important;
                }

                /* Each section (header + table) stays together — never orphan the dark title bar */
                .scr-section { page-break-inside: avoid !important; break-inside: avoid !important; }

                /* Signature block stays on one page */
                .scr-sig-block { page-break-inside: avoid !important; }

                /* Per-page footer — position:fixed repeats on every printed page */
                .scr-page-footer {
                    position: fixed !important;
                    bottom: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    border-top: 1px solid #bbb;
                    background: #fff !important;
                    padding: 3px 12mm;
                    font-size: 7.5pt;
                    color: #555 !important;
                    display: flex !important;
                    justify-content: space-between;
                }

                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }

            @media screen {
                .scr-print-layout { display: none; }
                .scr-page-footer  { display: none; }
            }
        `}</style>
            <div id="scr-print-root" className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
                <main className="max-w-8xl mx-auto p-4 md:p-8 w-full overflow-hidden">
                    {/* ============================================================
                     PRINT-ONLY PROFESSIONAL DOCUMENT LAYOUT
                     Hidden on screen, shown only during window.print()
                ============================================================ */}
                    {(() => {
                        const committeeRows = getCommitteeRows();
                        const candidateRows = getCandidateRows();
                        const postDetails: any[] = Array.isArray(formData.post_details) ? formData.post_details : [];
                        const cell = (ex?: React.CSSProperties): React.CSSProperties => ({ border: '1px solid #555', padding: '3px 5px', fontSize: '8pt', verticalAlign: 'top', ...ex });
                        const hCell = (ex?: React.CSSProperties): React.CSSProperties => ({ ...cell(), background: '#e8e8e8', fontWeight: 700, ...ex });
                        const tbl: React.CSSProperties = { width: '100%', borderCollapse: 'collapse' };
                        const printDate = new Date().toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
                        const docDate = formData.date_of_interview ? new Date(formData.date_of_interview).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                        // Group candidates by applied_post
                        const postGroups: Record<string, CandidateRow[]> = {};
                        candidateRows.forEach(r => { const k = r.applied_post || 'Unknown Post'; if (!postGroups[k]) postGroups[k] = []; postGroups[k].push(r); });
                        return (
                            <div className="scr-print-layout" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '9pt', color: '#000', background: '#fff', padding: '8mm 12mm' }}>
                                {/* Fixed footer */}
                                <div className="scr-page-footer" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{editDocName || savedDocName || ''}</span>
                                    <span>{printDate}</span>
                                </div>
                                {/* Letterhead */}
                                <table style={{ ...tbl, border: '1px solid #000', marginBottom: '4px' }}>
                                    <tbody><tr>
                                        <td style={{ width: '14%', padding: '4px', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #000' }}>
                                            <img src="http://172.16.131.206:8000/files/IITG_logo.png" alt="IITG" style={{ width: '52px', height: 'auto' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                        </td>
                                        <td style={{ padding: '4px 8px', textAlign: 'center', verticalAlign: 'middle' }}>
                                            <div style={{ fontSize: '12pt', fontWeight: 900 }}>भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
                                            <div style={{ fontSize: '11pt', fontWeight: 900 }}>INDIAN INSTITUTE OF TECHNOLOGY GUWAHATI</div>
                                            <div style={{ fontSize: '9pt', fontWeight: 700, letterSpacing: '1px' }}>RESEARCH AND DEVELOPMENT CELL</div>
                                        </td>
                                    </tr></tbody>
                                </table>
                                {/* Date row */}
                                <div style={{ textAlign: 'right', fontSize: '8.5pt', marginBottom: '2px' }}><strong>Date:</strong> {docDate}</div>
                                {/* Title */}
                                <div style={{ textAlign: 'center', fontSize: '13pt', fontWeight: 700, textDecoration: 'underline', margin: '5px 0 8px' }}>Selection Committee Report</div>
                                {/* Two-column: Applicant Details | Form Details */}
                                <div className="scr-section">
                                    <table style={{ ...tbl, marginBottom: '6px' }}><tbody><tr>
                                        <td style={{ width: '50%', verticalAlign: 'top', paddingRight: '3px' }}>
                                            <table style={tbl}><tbody>
                                                <tr><td colSpan={2} style={{ ...hCell(), textAlign: 'center', background: '#ccc' }}>Applicant Details</td></tr>
                                                <tr><td style={hCell({ width: '36%' })}>Name:</td><td style={cell()}>{formData.pi_full_name || formData.principal_investigator || '—'}</td></tr>
                                                <tr><td style={hCell()}>Department:</td><td style={cell()}>{(() => { const d = formData.upfa_department || formData.implementation_department; return d ? <DepartmentName name={d} /> : '—'; })()}</td></tr>
                                                <tr><td style={hCell()}>Employee ID:</td><td style={cell()}>{formData.employee_id || formData.webmail_id || '—'}</td></tr>
                                            </tbody></table>
                                        </td>
                                        <td style={{ width: '50%', verticalAlign: 'top', paddingLeft: '3px' }}>
                                            <table style={tbl}><tbody>
                                                <tr><td colSpan={2} style={{ ...hCell(), textAlign: 'center', background: '#ccc' }}>Form Details</td></tr>
                                                <tr><td style={hCell({ width: '44%' })}>Interview Id:</td><td style={cell()}>{formData.interview_id || '—'}</td></tr>
                                                <tr><td style={hCell()}>Project Name:</td><td style={cell()}>{formData.project_name || formData.upfa_project_title || '—'}</td></tr>
                                                <tr><td style={hCell()}>Project Number:</td><td style={cell()}>{formData.project_number || formData.upfa_project_code || '—'}</td></tr>
                                                <tr><td style={hCell()}>Recruitment Type:</td><td style={{ ...cell(), color: formData.recruitment_type ? '#c00' : undefined }}>{formData.recruitment_type || '—'}</td></tr>
                                                <tr><td style={hCell()}>Date of Interview:</td><td style={cell()}>{formData.date_of_interview || '—'}</td></tr>
                                                <tr><td style={hCell()}>Sponsoring Agency:</td><td style={cell()}>{formData.sponsoring_agency || <span style={{ display: 'inline-block', width: '80%', borderBottom: '1px dotted #999' }}>&nbsp;</span>}</td></tr>
                                            </tbody></table>
                                        </td>
                                    </tr></tbody></table>
                                </div>
                                {/* Post Details Summary */}
                                {postDetails.length > 0 && (
                                    <div className="scr-section" style={{ marginBottom: '8px' }}>
                                        <div style={{ fontWeight: 700, fontSize: '8.5pt', marginBottom: '2px' }}>Post Details</div>
                                        <table style={tbl}><thead>
                                            <tr><th style={{ ...hCell(), textAlign: 'center' }}>Name</th><th style={{ ...hCell(), width: '30%', textAlign: 'center' }}>Number of Posts</th></tr>
                                        </thead><tbody>
                                                {postDetails.map((row: any, i: number) => (
                                                    <tr key={i}><td style={cell()}>{row.upfa_designation || row.designation || '—'}</td><td style={{ ...cell(), textAlign: 'center' }}>{String(row.upfa_vacancies ?? row.vacancies ?? 1).padStart(2, '0')}</td></tr>
                                                ))}
                                                <tr>
                                                    <td style={{ ...cell(), textAlign: 'right', fontWeight: 700 }}>Total Posts:</td>
                                                    <td style={{ ...cell(), textAlign: 'center', fontWeight: 700 }}>{String(postDetails.reduce((s: number, r: any) => s + (parseInt(r.upfa_vacancies ?? r.vacancies ?? 1) || 0), 0)).padStart(2, '0')}</td>
                                                </tr>
                                            </tbody></table>
                                    </div>
                                )}
                                {/* Per-post candidate sections */}
                                {Object.entries(postGroups).map(([postName, rows]) => {
                                    const waitlisted = rows.filter(r => r.recommendation === 'Waiting List');
                                    return (
                                        <div key={postName} className="scr-section" style={{ marginBottom: '10px' }}>
                                            <table style={{ ...tbl, marginBottom: '2px' }}><tbody><tr>
                                                <td style={{ fontWeight: 700, fontSize: '8.5pt', padding: '2px 0' }}>Post: {postName}</td>
                                                <td style={{ textAlign: 'right', fontSize: '8.5pt', padding: '2px 0' }}>Recommended Candidates:</td>
                                            </tr></tbody></table>
                                            <table style={tbl}><thead>
                                                <tr>{['Sl\nNo.', 'Name', 'Applied\nfor\nPosition', 'Basic Pay\nRecommended', 'Increment\n(If Any)', 'HRA\nRequired\n3515 FD', 'Medical\nRequired', 'Total\nAmount', 'Period of\nAppointment\n(In months)', 'Selection\nStatus', 'Justification', 'Candidate\nDetails'].map((h, i) => (
                                                    <th key={i} style={{ ...hCell(), textAlign: 'center', fontSize: '7pt', whiteSpace: 'pre-line', padding: '2px 3px', width: i === 0 ? '4%' : i === 1 ? '10%' : undefined }}>{h}</th>
                                                ))}</tr>
                                            </thead><tbody>
                                                    {rows.length === 0 ? (
                                                        <tr><td colSpan={12} style={{ ...cell(), textAlign: 'center' }}>No candidates</td></tr>
                                                    ) : rows.map((row, i) => (
                                                        <tr key={row.id || i}>
                                                            <td style={{ ...cell(), textAlign: 'center', fontSize: '7.5pt' }}>{i + 1}</td>
                                                            <td style={{ ...cell(), fontSize: '7.5pt' }}>{row.candidate_name?.replace(/\s*\(Shortlisted\)$/i, '') || '—'}</td>
                                                            <td style={{ ...cell(), fontSize: '7.5pt' }}>{row.applied_post || postName}</td>
                                                            <td style={{ ...cell(), textAlign: 'right', fontSize: '7.5pt' }}>{row.basic_pay ? Number(row.basic_pay).toLocaleString('en-IN') : '—'}</td>
                                                            <td style={{ ...cell(), textAlign: 'center', fontSize: '7.5pt' }}>0</td>
                                                            <td style={{ ...cell(), textAlign: 'center', fontSize: '7.5pt' }}>{row.hra || '—'}</td>
                                                            <td style={{ ...cell(), textAlign: 'center', fontSize: '7.5pt' }}>{row.medical_required || 'No'}</td>
                                                            <td style={{ ...cell(), textAlign: 'right', fontSize: '7.5pt' }}>{row.total_amount ? Number(row.total_amount).toLocaleString('en-IN') : '—'}</td>
                                                            <td style={{ ...cell(), textAlign: 'center', fontSize: '7.5pt' }}>{row.upfa_duration_months || postDetailsCache[row.recruitment_post_id]?.upfa_duration_months || (recruitmentDocRef.current?.upfa_post_details?.find((p: any) => p.name === row.recruitment_post_id)?.upfa_duration_months) || formData.upfa_project_duration || '—'}</td>
                                                            <td style={{ ...cell(), textAlign: 'center', fontSize: '7.5pt' }}>{row.recommendation || '—'}</td>
                                                            <td style={{ ...cell(), fontSize: '7.5pt' }}>{row.justification || '—'}</td>
                                                            <td style={{ ...cell(), textAlign: 'center', fontSize: '7.5pt' }}></td>
                                                        </tr>
                                                    ))}
                                                </tbody></table>
                                            <div style={{ fontSize: '8pt', marginTop: '4px' }}>
                                                <strong>Wait Listed Candidates:</strong>
                                                <span style={{ marginLeft: '8px' }}>{waitlisted.length === 0 ? 'NIL' : waitlisted.map((r, i) => `${i + 1}. ${r.candidate_name?.replace(/\s*\(Shortlisted\)$/i, '')}`).join(', ')}</span>
                                            </div>
                                            <hr style={{ border: 'none', borderTop: '1px solid #999', margin: '4px 0' }} />
                                            <hr style={{ border: 'none', borderTop: '1px solid #999', margin: '0 0 2px' }} />
                                        </div>
                                    );
                                })}
                                {candidateRows.length === 0 && (
                                    <div style={{ textAlign: 'center', color: '#666', fontSize: '8pt', padding: '8px', border: '1px dashed #aaa', marginBottom: '8px' }}>No candidates recorded</div>
                                )}
                                {/* Committee Member Details */}
                                <div className="scr-sig-block">
                                    <div style={{ fontWeight: 700, fontSize: '8.5pt', marginBottom: '2px' }}>Committee Member Details</div>
                                    <table style={tbl}><thead>
                                        <tr>
                                            <th style={{ ...hCell(), width: '7%', textAlign: 'center' }}>Sl No.</th>
                                            <th style={{ ...hCell(), textAlign: 'center' }}>Name</th>
                                            <th style={{ ...hCell(), textAlign: 'center' }}>Designation</th>
                                            <th style={{ ...hCell(), textAlign: 'center' }}>Email Id</th>
                                            <th style={{ ...hCell(), width: '22%', textAlign: 'center' }}>Signature</th>
                                        </tr>
                                    </thead><tbody>
                                            {(formData.chairperson_webmail_id || formData.chairperson_name) && (
                                                <tr>
                                                    <td style={{ ...cell(), textAlign: 'center' }}>1</td>
                                                    <td style={{ ...cell(), fontWeight: 700 }}>{formData.chairperson_name || '—'}</td>
                                                    <td style={cell()}>Chairperson</td>
                                                    <td style={cell()}>{formData.chairperson_webmail_id || '—'}</td>
                                                    <td style={{ ...cell(), height: '30px' }}></td>
                                                </tr>
                                            )}
                                            {committeeRows.map((row, i) => (
                                                <tr key={row.id || i}>
                                                    <td style={{ ...cell(), textAlign: 'center' }}>{i + (formData.chairperson_webmail_id ? 2 : 1)}</td>
                                                    <td style={cell()}>{row.name || '—'}</td>
                                                    <td style={cell()}>{row.designation || '—'}</td>
                                                    <td style={cell()}>{row.email || '—'}</td>
                                                    <td style={{ ...cell(), height: '30px' }}></td>
                                                </tr>
                                            ))}
                                            {committeeRows.length === 0 && !formData.chairperson_webmail_id && (
                                                <tr><td colSpan={5} style={{ ...cell(), textAlign: 'center', color: '#666' }}>No committee members recorded</td></tr>
                                            )}
                                        </tbody></table>
                                </div>
                            </div>
                        );
                    })()}



                    <div className="scr-page-header">
                        <PageHeader
                            title="Selection Committee Report"
                            projectName={formData.project_name || formData.upfa_project_title || "Selection committee application"}
                            projectNumber={activityDocName || "New Application"}
                            status={(editDocName || savedDocName) ? workflowState : undefined}
                            showBack
                        >
                            <ViewProjectButton doctype="Selection Committee Report" data={formData} />
                        </PageHeader>
                    </div>

                    <div className="scr-form-content grid grid-cols-1 gap-6">
                        {/* Main Form Content */}
                        <div className="space-y-6">
                            <FrappeCard>
                                <div className="p-8">
                                    <DynamicFormRenderer
                                        fields={(() => {
                                            const DEAN_ONLY_FIELDS = ["chairperson_webmail_id", "chairperson_name"];
                                            let visibleFields = isDoRnd ? fields : fields.filter(f => !DEAN_ONLY_FIELDS.includes(f.fieldname));

                                            // For Dean in non-Draft states: mark all fields except chairperson as read_only
                                            if (deanOverrideReadOnly) {
                                                visibleFields = visibleFields.map(f =>
                                                    DEAN_ONLY_FIELDS.includes(f.fieldname)
                                                        ? { ...f, read_only: 0, read_only_depends_on: undefined, fieldtype: f.fieldtype === "Read Only" ? "Data" : f.fieldtype }
                                                        : { ...f, read_only: 1 }
                                                );
                                            }

                                            // Stop before the "Uploads and Check List" section
                                            const uploadIdx = visibleFields.findIndex(
                                                f => f.fieldtype === "Section Break" &&
                                                    (f.label?.toLowerCase().includes("upload") || f.label?.toLowerCase().includes("check list"))
                                            );
                                            return uploadIdx >= 0 ? visibleFields.slice(0, uploadIdx) : visibleFields;
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

                                    {/* Committee Members Table */}
                                    {(() => {
                                        const committeeRows = getCommitteeRows();
                                        const userOpts = linkOptions["chairperson_webmail_id"] || linkOptions["User"] || [];
                                        const cellCls = "w-full h-9 px-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#D97757] disabled:opacity-70 disabled:bg-zinc-100 dark:disabled:bg-zinc-800";
                                        // Table is read-only when the workflow form is read-only OR when
                                        // committee was sourced from the Recruitment Adhoc Contractual doc
                                        const committeeReadOnly = isReadOnly || isCommitteeFromRecruitment;

                                        return (
                                            <div className="mt-8">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                                                        Committee Members
                                                        {isCommitteeFromRecruitment && (
                                                            <span className="ml-2 text-xs font-normal text-zinc-400 dark:text-zinc-500">(auto-filled from recruitment)</span>
                                                        )}
                                                    </h3>
                                                    {!committeeReadOnly && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const rows = getCommitteeRows();
                                                                const newRow: CommitteeMemberRow = {
                                                                    id: Date.now().toString(),
                                                                    sl_no: rows.length + 1,
                                                                    email: "",
                                                                    name: "",
                                                                    designation: "",
                                                                };
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    committee_members: [...rows, newRow],
                                                                }));
                                                            }}
                                                            className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-dashed border-[#D97757]/50 text-[#D97757] rounded-lg hover:bg-[#D97757]/5 transition-colors"
                                                        >
                                                            + Add Row
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-xl">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 w-10">#</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[240px]">Webmail ID</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[180px]">Name</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[180px]">Designation</th>
                                                                {!committeeReadOnly && <th className="px-3 py-2.5 w-20" />}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {/* Pinned chairperson row */}
                                                            {(formData.chairperson_webmail_id || formData.chairperson_name) && (
                                                                <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-amber-50/40 dark:bg-amber-900/10">
                                                                    <td className="px-3 py-2 text-center">
                                                                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">★</span>
                                                                    </td>
                                                                    <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200 text-sm">
                                                                        {formData.chairperson_webmail_id || '—'}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200 font-medium text-sm">
                                                                        {formData.chairperson_name || '—'}
                                                                    </td>
                                                                    <td className="px-3 py-2">
                                                                        <span className="inline-block text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/50 px-2 py-1 rounded font-semibold">
                                                                            Chairperson
                                                                        </span>
                                                                    </td>
                                                                    {!committeeReadOnly && <td />}
                                                                </tr>
                                                            )}
                                                            {committeeRows.map((row, idx) => (
                                                                <tr key={row.id || idx} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                                                                    <td className="px-3 py-2 text-zinc-500 text-center text-xs">{idx + 1}</td>

                                                                    {/* Webmail ID */}
                                                                    <td className="px-3 py-2">
                                                                        {committeeReadOnly ? (
                                                                            <span className="text-zinc-800 dark:text-zinc-200">{row.email || '—'}</span>
                                                                        ) : (
                                                                            <>
                                                                                <input
                                                                                    type="text"
                                                                                    list={`committee-user-options-${idx}`}
                                                                                    className={cellCls}
                                                                                    value={row.email}
                                                                                    placeholder="Search user or email…"
                                                                                    onChange={e => handleCommitteeEmailSelect(idx, e.target.value)}
                                                                                />
                                                                                <datalist id={`committee-user-options-${idx}`}>
                                                                                    {userOpts.map(o => (
                                                                                        <option key={o.value} value={o.value} label={o.label} />
                                                                                    ))}
                                                                                </datalist>
                                                                            </>
                                                                        )}
                                                                    </td>

                                                                    {/* Name — auto-populated */}
                                                                    <td className="px-3 py-2">
                                                                        <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                                                                            {row.name || '—'}
                                                                        </span>
                                                                    </td>

                                                                    {/* Designation */}
                                                                    <td className="px-3 py-2">
                                                                        {committeeReadOnly ? (
                                                                            <span className="inline-block text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded font-medium">
                                                                                {row.designation || '—'}
                                                                            </span>
                                                                        ) : (
                                                                            <select
                                                                                className={cellCls}
                                                                                value={row.designation}
                                                                                onChange={e => updateCommitteeRow(idx, { designation: e.target.value })}
                                                                            >
                                                                                <option value="">Select designation…</option>
                                                                                {COMMITTEE_DESIGNATION_OPTIONS.map(d => (
                                                                                    <option key={d} value={d}>{d}</option>
                                                                                ))}
                                                                            </select>
                                                                        )}
                                                                    </td>

                                                                    {/* Remove */}
                                                                    {!committeeReadOnly && (
                                                                        <td className="px-3 py-2 text-center">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const rows = getCommitteeRows();
                                                                                    setFormData(prev => ({
                                                                                        ...prev,
                                                                                        committee_members: rows.filter((_, i) => i !== idx).map((r, i) => ({ ...r, sl_no: i + 1 })),
                                                                                    }));
                                                                                }}
                                                                                className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))}

                                                            {committeeRows.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={committeeReadOnly ? 4 : 5} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                                                                        No members added. Click &quot;+ Add Row&quot; to add one.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Candidates & Recommendations Table */}
                                    {(() => {
                                        const candidateRows = getCandidateRows();
                                        const cellCls = "w-full h-9 px-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-[#D97757] disabled:opacity-70 disabled:bg-zinc-100 dark:disabled:bg-zinc-800";

                                        return (
                                            <div className="mt-8">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
                                                            Candidates &amp; Recommendations
                                                            <span className="text-red-500 ml-1">*</span>
                                                        </h3>
                                                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                                                            Only shortlisted candidates will appear in the selection below.
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        {isFetchingCandidates && (
                                                            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
                                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                Loading candidates…
                                                            </span>
                                                        )}
                                                        {!isReadOnly && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setFormData(prev => {
                                                                        let rows: CandidateRow[];
                                                                        try {
                                                                            const v = prev.candidates;
                                                                            rows = !v ? [] : Array.isArray(v) ? [...v] : JSON.parse(v);
                                                                        } catch { rows = []; }
                                                                        const newRow: CandidateRow = {
                                                                            id: Date.now().toString(),
                                                                            candidate_name: "",
                                                                            application_id: "",
                                                                            recruitment_post_id: "",
                                                                            candidate_id: "",
                                                                            applied_post: "",
                                                                            basic_pay: 0,
                                                                            hra: "",
                                                                            medical_required: "",
                                                                            total_amount: 0,
                                                                            upfa_duration_months: "",
                                                                            recommendation: "Not Recommended",
                                                                            waitlist_no: "",
                                                                            justification: "",
                                                                        };
                                                                        return { ...prev, candidates: [...rows, newRow] };
                                                                    });
                                                                }}
                                                                className="px-3 py-1.5 text-sm bg-white dark:bg-zinc-800 border border-dashed border-[#D97757]/50 text-[#D97757] rounded-lg hover:bg-[#D97757]/5 transition-colors"
                                                            >
                                                                + Add Row
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-xl">
                                                    <table className="w-full text-sm">
                                                        <thead>
                                                            <tr className="bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 w-10">#</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[220px]">Candidate Name <span className="text-red-500">*</span></th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[130px]">Applied Post</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[100px]">Basic Pay</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[70px]">HRA</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[80px]">Medical</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[100px]">Total</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[100px]">Duration (Months)</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[170px]">Recommendation <span className="text-red-500">*</span></th>
                                                                <th className="px-3 py-2.5 text-center font-semibold text-zinc-700 dark:text-zinc-300 w-20">WL No.</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 min-w-[180px]">Justification</th>
                                                                <th className="px-3 py-2.5 text-left font-semibold text-zinc-700 dark:text-zinc-300 w-20">Details</th>
                                                                {!isReadOnly && <th className="px-3 py-2.5 w-20" />}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {candidateRows.map((row, idx) => (
                                                                <tr key={row.id || idx} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30">
                                                                    <td className="px-3 py-2 text-zinc-500 text-center text-xs">{idx + 1}</td>

                                                                    {/* Candidate Name */}
                                                                    <td className="px-3 py-2">
                                                                        {isReadOnly ? (
                                                                            <span className="text-zinc-800 dark:text-zinc-200 font-medium">{row.candidate_name?.replace(/\s*\(Shortlisted\)$/i, '') || '—'}</span>
                                                                        ) : (
                                                                            <select
                                                                                className={cellCls}
                                                                                value={row.application_id}
                                                                                onChange={e => handleCandidateSelect(idx, e.target.value)}
                                                                            >
                                                                                <option value="">Select candidate…</option>
                                                                                {/* Preserve saved value as option while candidatesList is still loading */}
                                                                                {row.application_id && !candidatesList.find(c => c.application_id === row.application_id) && (
                                                                                    <option value={row.application_id}>{row.candidate_name?.replace(/\s*\(Shortlisted\)$/i, '')}</option>
                                                                                )}
                                                                                {candidatesList.filter(c => c.status?.toLowerCase() === "shortlisted").map(c => {
                                                                                    const postDesignation =
                                                                                        c.post_designation ||
                                                                                        postDetailsCache[c.recruitment_post_id]?.upfa_designation ||
                                                                                        recruitmentDocRef.current?.upfa_post_details?.find((p: any) => p.name === c.recruitment_post_id)?.upfa_designation ||
                                                                                        "";
                                                                                    const label = postDesignation
                                                                                        ? `${c.display_name} (${postDesignation})`
                                                                                        : c.display_name;
                                                                                    return (
                                                                                        <option key={c.application_id} value={c.application_id}>
                                                                                            {label}
                                                                                        </option>
                                                                                    );
                                                                                })}
                                                                            </select>
                                                                        )}
                                                                    </td>

                                                                    {/* Applied Post — read-only */}
                                                                    <td className="px-3 py-2">
                                                                        <span className="inline-block text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded font-medium">
                                                                            {row.applied_post || '—'}
                                                                        </span>
                                                                    </td>

                                                                    {/* Basic Pay — read-only */}
                                                                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300 tabular-nums">
                                                                        {row.basic_pay ? `₹${Number(row.basic_pay).toLocaleString('en-IN')}` : '—'}
                                                                    </td>

                                                                    {/* HRA — read-only */}
                                                                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                                                                        {row.hra || '—'}
                                                                    </td>

                                                                    {/* Medical Required — read-only */}
                                                                    <td className="px-3 py-2">
                                                                        {row.medical_required ? (
                                                                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                                                                                row.medical_required === 'Yes'
                                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                                                    : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                                                                            )}>
                                                                                {row.medical_required}
                                                                            </span>
                                                                        ) : '—'}
                                                                    </td>

                                                                    {/* Total Amount — read-only */}
                                                                    <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200 font-semibold tabular-nums">
                                                                        {row.total_amount ? `₹${Number(row.total_amount).toLocaleString('en-IN')}` : '—'}
                                                                    </td>

                                                                    {/* Duration (Months) — read-only */}
                                                                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                                                                        {row.upfa_duration_months || postDetailsCache[row.recruitment_post_id]?.upfa_duration_months || (recruitmentDocRef.current?.upfa_post_details?.find((p: any) => p.name === row.recruitment_post_id)?.upfa_duration_months) || '—'}
                                                                    </td>

                                                                    {/* Recommendation — editable select */}
                                                                    <td className="px-3 py-2">
                                                                        {isReadOnly ? (
                                                                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full",
                                                                                row.recommendation === 'Recommended'
                                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                                                                    : row.recommendation === 'Waiting List'
                                                                                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                                                                                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                                                            )}>
                                                                                {row.recommendation || 'Not Recommended'}
                                                                            </span>
                                                                        ) : (
                                                                            <select
                                                                                className={cn(cellCls,
                                                                                    row.recommendation === 'Recommended'
                                                                                        ? 'border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400'
                                                                                        : row.recommendation === 'Waiting List'
                                                                                            ? 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
                                                                                            : 'border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                                                                )}
                                                                                value={row.recommendation || 'Not Recommended'}
                                                                                onChange={e => updateCandidateRow(idx, {
                                                                                    recommendation: e.target.value,
                                                                                    ...(e.target.value !== 'Waiting List' ? { waitlist_no: "" } : {}),
                                                                                })}
                                                                                required
                                                                            >
                                                                                <option value="Recommended">Recommended</option>
                                                                                <option value="Not Recommended">Not Recommended</option>
                                                                                <option value="Waiting List">Waiting List</option>
                                                                            </select>
                                                                        )}
                                                                    </td>

                                                                    {/* Waiting List Number */}
                                                                    <td className="px-3 py-2 text-center">
                                                                        {isReadOnly ? (
                                                                            row.recommendation === 'Waiting List' && row.waitlist_no
                                                                                ? <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/50">#{row.waitlist_no}</span>
                                                                                : <span className="text-zinc-400">—</span>
                                                                        ) : (
                                                                            row.recommendation === 'Waiting List' ? (
                                                                                <input
                                                                                    type="number"
                                                                                    min={1}
                                                                                    className={cn(cellCls, "w-16 text-center text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700")}
                                                                                    placeholder="#"
                                                                                    value={row.waitlist_no || ""}
                                                                                    onChange={e => updateCandidateRow(idx, { waitlist_no: e.target.value })}
                                                                                />
                                                                            ) : (
                                                                                <span className="text-zinc-400">—</span>
                                                                            )
                                                                        )}
                                                                    </td>

                                                                    {/* Justification */}
                                                                    <td className="px-3 py-2">
                                                                        {isReadOnly ? (
                                                                            <span className="text-zinc-700 dark:text-zinc-300 text-xs">{row.justification || '—'}</span>
                                                                        ) : (
                                                                            <input
                                                                                type="text"
                                                                                className={cellCls}
                                                                                placeholder="Enter justification…"
                                                                                value={row.justification || ""}
                                                                                onChange={e => updateCandidateRow(idx, { justification: e.target.value })}
                                                                            />
                                                                        )}
                                                                    </td>

                                                                    {/* Details */}
                                                                    <td className="px-3 py-2 text-center">
                                                                        {row.candidate_id && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => navigate(
                                                                                    `/candidate-details/${row.candidate_id}?refNum=${encodeURIComponent(formData.interview_id || interviewIdParam || "")}&applicationId=${row.application_id}`
                                                                                )}
                                                                                className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 transition-colors whitespace-nowrap"
                                                                            >
                                                                                View
                                                                            </button>
                                                                        )}
                                                                    </td>

                                                                    {/* Remove */}
                                                                    {!isReadOnly && (
                                                                        <td className="px-3 py-2 text-center">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setFormData(prev => {
                                                                                    let rows: CandidateRow[];
                                                                                    try {
                                                                                        const v = prev.candidates;
                                                                                        rows = !v ? [] : Array.isArray(v) ? [...v] : JSON.parse(v);
                                                                                    } catch { rows = []; }
                                                                                    return { ...prev, candidates: rows.filter((_, i) => i !== idx) };
                                                                                })}
                                                                                className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                                                                            >
                                                                                Remove
                                                                            </button>
                                                                        </td>
                                                                    )}
                                                                </tr>
                                                            ))}

                                                            {candidateRows.length === 0 && (
                                                                <tr>
                                                                    <td colSpan={isReadOnly ? 11 : 12} className="px-4 py-8 text-center text-zinc-500 dark:text-zinc-400">
                                                                        {isFetchingCandidates
                                                                            ? 'Loading candidates…'
                                                                            : 'No candidates added. Click "+ Add Row" to add one.'}
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Uploads and Check List section — rendered after candidates */}
                                    {(() => {
                                        const DEAN_ONLY_FIELDS = ["chairperson_webmail_id", "chairperson_name"];
                                        let visibleFields = isDoRnd ? fields : fields.filter(f => !DEAN_ONLY_FIELDS.includes(f.fieldname));
                                        if (deanOverrideReadOnly) {
                                            visibleFields = visibleFields.map(f =>
                                                DEAN_ONLY_FIELDS.includes(f.fieldname)
                                                    ? { ...f, read_only: 0, read_only_depends_on: undefined, fieldtype: f.fieldtype === "Read Only" ? "Data" : f.fieldtype }
                                                    : { ...f, read_only: 1 }
                                            );
                                        }
                                        const uploadIdx = visibleFields.findIndex(
                                            f => f.fieldtype === "Section Break" &&
                                                (f.label?.toLowerCase().includes("upload") || f.label?.toLowerCase().includes("check list"))
                                        );
                                        if (uploadIdx < 0) return null;
                                        return (
                                            <div className="mt-6 scr-uploads-section">
                                                <DynamicFormRenderer
                                                    fields={visibleFields.slice(uploadIdx)}
                                                    formData={formData}
                                                    linkOptions={linkOptions}
                                                    onChange={handleFieldChange}
                                                    onFileChange={handleFileChange}
                                                    onTableRowChange={handleTableRowChange}
                                                    onTableFileChange={handleTableFileChange}
                                                    onAddTableRow={handleAddTableRow}
                                                    onDeleteTableRow={handleDeleteTableRow}
                                                    onFieldChangeWithSideEffects={handleFieldChangeWithSideEffects}
                                                    readOnly={deanOverrideReadOnly ? false : isReadOnly}
                                                />
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Action Bar */}
                                <div className="scr-action-bar bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                                    <div className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl">
                                        {workflowState === "Draft" && (
                                        <div className="bg-blue-50 text-blue-800 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50 px-3 py-2 rounded-lg mb-2">
                                            <span className="font-semibold">Note:</span> Please first click on <strong>"Save Draft"</strong>, then proceed to <strong>"Print"</strong>, and finally click on <strong>"Submit Application"</strong> to complete the process.
                                        </div>
                                        )}
                                        {(editDocName || savedDocName) && (
                                            <div className="text-xs text-zinc-400">
                                                Last updated: {new Date().toLocaleTimeString()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-3 flex-wrap">
                                        {/* DoRND Send to Director Controls */}
                                        {isDoRnd && formData.recruitment_type === "Contractual" && workflowState !== "Draft" && workflowState !== "Approved" && workflowState !== "Rejected" && (
                                            <div className="flex items-center gap-2 mr-2 bg-[#F0EDE4] dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700">
                                                <Checkbox
                                                    id="send-to-director"
                                                    checked={!!formData.send_to_director}
                                                    onCheckedChange={async (checked) => {
                                                        const newVal = checked ? 1 : 0;
                                                        setFormData(prev => ({ ...prev, send_to_director: newVal }));
                                                        if (savedDocName) {
                                                            try {
                                                                await callUpdateSendToDirector({
                                                                    docname: savedDocName,
                                                                    send_to_director: newVal
                                                                });
                                                            } catch (err) {
                                                                console.error("Failed to update send to director", err);
                                                                setFormData(prev => ({ ...prev, send_to_director: formData.send_to_director }));
                                                            }
                                                        }
                                                    }}
                                                    disabled={isUpdatingSendToDirector}
                                                />
                                                <label htmlFor="send-to-director" className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none">
                                                    Send to Director
                                                </label>
                                                {isUpdatingSendToDirector && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />}
                                            </div>
                                        )}

                                        {/* View Director PDF if available */}
                                        {formData.recruitment_type === "Contractual" && formData.director_signed_pdf && (
                                            <FrappeButton
                                                variant="outline"
                                                onClick={() => window.open(formData.director_signed_pdf, '_blank')}
                                                className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-300 dark:hover:bg-emerald-900/40 shadow-sm"
                                            >
                                                <EyeIcon className="w-4 h-4 mr-2" />
                                                View Director Signed PDF
                                            </FrappeButton>
                                        )}

                                        {/* Download PDF Button — always available */}
                                        <FrappeButton
                                            variant="outline"
                                            onClick={handlePrint}
                                            className="bg-white dark:bg-zinc-800 shadow-sm"
                                            title="Print or Download this report as PDF"
                                        >
                                            <Printer className="w-4 h-4 mr-2" />
                                            Download PDF
                                        </FrappeButton>
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
                                            availableActions.map((action) => {
                                                const isApproveAction = action === "Approve" || action === "Recommend";
                                                const isDisabledByPdf = isDoRnd && isApproveAction && formData.recruitment_type === "Contractual" && !formData.director_signed_pdf;
                                                return (
                                                <FrappeButton
                                                    key={action}
                                                    onClick={() => handleWorkflowAction(action)}
                                                    disabled={isActionLoading || isDisabledByPdf}
                                                    title={isDisabledByPdf ? "Director Signed PDF must be uploaded first" : undefined}
                                                    className={cn(
                                                        "shadow-sm",
                                                        action === "Approve"
                                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                            : action === "Reject"
                                                                ? "bg-red-600 hover:bg-red-700 text-white"
                                                                : "bg-[#D97757] hover:opacity-90 text-white",
                                                        isDisabledByPdf && "opacity-50 cursor-not-allowed"
                                                    )}
                                                >
                                                    {isActionLoading ? (
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    ) : null}
                                                    {action}
                                                </FrappeButton>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            </FrappeCard>

                        </div>
                    </div>
                </main>

                {activityDocName && (
                    <>
                        <button
                            type="button"
                            onClick={() => setIsActivityOpen(true)}
                            className="scr-form-content fixed bottom-6 right-6 z-40 inline-flex h-12 items-center gap-2 rounded-full border border-[#C7D2FE] bg-[#2563EB] px-4 text-[12px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-[#1D4ED8] focus:outline-none focus:ring-4 focus:ring-[#4A6CF7]/20 dark:border-[#4A6CF7]/40"
                            aria-label="Open Activity Log"
                        >
                            <MessageSquare className="h-4 w-4" />
                            Activity Log
                        </button>

                        {isActivityOpen && (
                            <div className="scr-form-content fixed inset-0 z-50 flex justify-end">
                                <div
                                    className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
                                    onClick={() => setIsActivityOpen(false)}
                                />
                                <aside className="relative h-full w-full max-w-[460px] overflow-y-auto border-l border-[#E4E4E7] bg-[#FAFAF9] p-5 shadow-2xl dark:border-[#3F3F46] dark:bg-[#18181B]">
                                    <div className="mb-4 flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#D97757]">
                                                Selection Committee Report
                                            </p>
                                            <h2 className="mt-1 text-[18px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                Activity Log
                                            </h2>
                                            <p className="mt-0.5 truncate font-mono text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                                {activityDocName}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsActivityOpen(false)}
                                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] dark:border-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#27272A] dark:hover:text-[#E4E4E7]"
                                            aria-label="Close Activity Log"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <ActivityStream
                                        doctype="Selection Committee Report"
                                        docname={activityDocName}
                                    />
                                </aside>
                            </div>
                        )}
                    </>
                )}
            </div>
        </>
    );
};

export default SelectionCommitteeReportForm;
