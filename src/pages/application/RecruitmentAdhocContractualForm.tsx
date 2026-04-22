import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useFrappePostCall, useFrappeAuth } from "frappe-react-sdk";
import {
    DynamicFormRenderer,
    type FormField,
} from "@/components/forms/DynamicFormRenderer";
import {
    recruitmentAdhocContractualAPI,
    prepareFormDataForApi,
} from "@/services/apiService";
import { Loader2, ArrowLeft, Save, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useUserRoles } from "@/components/UserRole";
import { useProjectBudget } from '@/hooks/useProjectBudget';
import { BudgetHeadName } from '@/components/BudgetHeadName';

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

const RecruitmentAdhocContractualForm: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const editDocName = id || searchParams.get("edit");
    const projectParam = searchParams.get("project");
    const projectNoParam = searchParams.get("projectNo"); // Often used as well for the filter
    const { currentUser } = useFrappeAuth();

    // Role-based access
    const { roles } = useUserRoles(currentUser ?? null);
    const isDoRnd = roles.includes(DORND_ROLE);
    const isRnDStaff = roles.includes("staff, RnD");

    // Core States
    const [fields, setFields] = useState<FormField[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<LinkOptionsMap>({});
    const [isLoadingFields, setIsLoadingFields] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSavingRef = useRef(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(
        editDocName || null,
    );
    const savedDocNameRef = useRef<string | null>(editDocName || null);

    // Workflow States
    const [workflowState, setWorkflowState] = useState<string>("Draft");
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Commit / Payment state
    const [commitHead, setCommitHead] = useState("");
    const [commitAmount, setCommitAmount] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    const [stagedCommit, setStagedCommit] = useState<{ head: string; amount: number } | null>(null);
    const [allBudgetHeads, setAllBudgetHeads] = useState<{ uid: string; label: string; id: string }[]>([]);
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: string }[]>([]);

    // API Hooks
    const { call: getFieldsCall } = useFrappePostCall(
        recruitmentAdhocContractualAPI.getFields,
    );
    const { call: saveCall } = useFrappePostCall(
        recruitmentAdhocContractualAPI.save,
    );
    const { call: getActionsCall } = useFrappePostCall(
        recruitmentAdhocContractualAPI.getWorkflowActions,
    );
    const { call: performActionCall } = useFrappePostCall(
        recruitmentAdhocContractualAPI.performAction,
    );
    const { call: submitCommit, loading: isCommitting } = useFrappePostCall(
        'rndopsapp.rndopsapp.commitPayment.submit_commit_data',
    );
    const { call: submitPayment, loading: isPaying } = useFrappePostCall(
        'rndopsapp.rndopsapp.commitPayment.submit_payment_data',
    );
    const { call: fetchAccountHeads } = useFrappePostCall<{ message: any[] }>('frappe.client.get_list');
    const { call: updateChairpersonCall, loading: isUpdatingChairperson } = useFrappePostCall<{ message: any }>(
        "rndopsapp.rndopsapp.doctype.recruitment_adhoc_contractual.recruitment_adhoc_contractual.update_chairperson_fields",
    );
    // Hook to fetch piheadmentor_user_id from User doctype (client script logic)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>(
        "frappe.client.get_value",
    );

    // ============================================================
    // EDITED BY MKY | 2026-04-14 15:57 IST
    // START OF EDIT — Quick Entry state and API hook
    // Expanded state to track child table coordinates so "CREATE_NEW" works everywhere.
    // ============================================================
    const [racQuickEntry, setRacQuickEntry] = useState<{
        isOpen: boolean;
        pendingValue: string;
        isSubmitting: boolean;
        fieldName: string;
        tableName?: string;
        rowIndex?: number;
    } | null>(null);
    const { call: createRacCustomDesignation } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.recruitment_adhoc_contractual.recruitment_adhoc_contractual.create_custom_designation"
    );
    // END OF EDIT — MKY | 2026-04-14 15:57 IST
    // ============================================================

    // --- PROJECT BUDGET for commit/payment ---
    const projectCode = formData.upfa_project_code || formData.project_code || "";
    const { budgetData, actualBalance } = useProjectBudget(projectCode);
    const currentDocName = editDocName || savedDocName || "";
    const linkedCommitment = budgetData.find(
        (e) => (e.ref === currentDocName || e.frapAppId === currentDocName) && e.type === "commitment",
    );
    const isCommitted = !!linkedCommitment || !!stagedCommit;
    const displayCommitment = linkedCommitment
        ? { head: linkedCommitment.head, committed: linkedCommitment.committed }
        : stagedCommit
            ? { head: stagedCommit.head, committed: stagedCommit.amount }
            : null;
    const activeWorkflowState = formData.workflow_state || workflowState;
    const showCommitSection =
        isRnDStaff &&
        !!currentDocName &&
        !!activeWorkflowState &&
        !["Draft", "Rejected", "Cancelled"].includes(activeWorkflowState);

    const resolveChairpersonFromDepartment = useCallback(
        async (
            departmentId: string | null | undefined,
            optionsSource: LinkOptionsMap = {},
        ): Promise<Record<string, string>> => {
            if (!departmentId) return {};

            try {
                console.log("[dept→chairperson] fetching dept_head for department:", departmentId);
                const departmentRes = await fetchFrappeValue({
                    doctype: "Department_prornd",
                    name: departmentId,
                    fieldname: ["dept_head"],
                });
                console.log("[dept→chairperson] Department_prornd response:", departmentRes);
                const chairpersonEmail = departmentRes?.message?.dept_head;
                if (!chairpersonEmail) {
                    console.warn("[dept→chairperson] dept_head is empty for department:", departmentId);
                    return {};
                }

                console.log("[dept→chairperson] found dept_head email:", chairpersonEmail);
                let chairpersonName = getChairpersonLabel(chairpersonEmail, optionsSource) || "";

                if (!chairpersonName) {
                    // Fallback: fetch full_name from User doctype
                    try {
                        const nameRes = await fetchFrappeValue({
                            doctype: "User",
                            filters: { name: chairpersonEmail },
                            fieldname: "full_name",
                        });
                        chairpersonName = nameRes?.message?.full_name || "";
                        console.log("[dept→chairperson] fetched full_name from User:", chairpersonName);
                    } catch (e) {
                        console.error("[dept→chairperson] failed to fetch full_name", e);
                    }
                }

                return {
                    chairperson_webmail_id: chairpersonEmail,
                    chairperson_name: chairpersonName,
                    head: chairpersonEmail,
                };
            } catch (e) {
                console.error(
                    "[dept→chairperson] Failed to fetch department head for chairperson autofill",
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
                ];
                const filteredFields = (fetchedFields || []).filter(
                    (f: any) => !HIDDEN_FIELDS.includes(f.fieldname),
                );

                // ============================================================
                // EDITED BY MKY | 2026-04-14 15:35 IST
                // START OF EDIT — Removed custom_designation flatMap injection
                // We now use the Quick Entry Modal natively.
                // ============================================================
                const processedFields = filteredFields.map((f: FormField) => {
                    let transformed: FormField = f;
                    if (f.fieldname === "chairperson_name") {
                        transformed = { ...f, read_only: 1 };
                    } else if (f.fieldname === "chairperson_webmail_id" && !isDoRnd) {
                        transformed = { ...f, read_only: 1 };
                    } else if (f.fieldname === "webmail_id") {
                        transformed = { ...f, fieldtype: "Data" };
                    } else if (f.fieldtype === "Table" && f.child_fields) {
                        transformed = {
                            ...f,
                            child_fields: f.child_fields.map((cf) => {
                                if (f.fieldname === "upfa_selection_committee" && cf.fieldname === "upfa_member_name") {
                                    return { ...cf, read_only: 1 };
                                }
                                return cf;
                            })
                        };
                    }
                    return transformed;
                });
                // END OF EDIT — MKY | 2026-04-14 15:35 IST
                // ============================================================

                let finalLinkOptions = link_options ? { ...link_options } : {};

                // Mirror user options under "User" key so child table AutocompleteEmail can find them.
                // The backend sends them under "webmail_id" (the main form field name).
                if (!finalLinkOptions["User"] && finalLinkOptions["webmail_id"]) {
                    finalLinkOptions["User"] = finalLinkOptions["webmail_id"];
                }
                // Also mirror under the child field name so ChildTableComponent Link-fallback works.
                if (!finalLinkOptions["webmail_id__email"]) {
                    finalLinkOptions["webmail_id__email"] = finalLinkOptions["webmail_id"] || [];
                }

                // ============================================================
                // EDITED BY MKY | 2026-04-14 12:25 IST
                // START OF EDIT — Use get_filtered_designations (designation_type-aware)
                // Previously called get_project_staff_designations which walked
                // EmployeeClass_prornd → User → Designation_prornd (3 queries).
                // Now directly queries Designation_prornd filtered by designation_type.
                // Seeds from prefill_data.designation_type for existing docs, or
                // defaults to "Project Staff" for new forms.
                // "Other" is always appended by the backend.
                // ============================================================
                try {
                    const seedType = encodeURIComponent(
                        (prefill_data?.designation_type as string) || "Project Staff"
                    );
                    const desigRes = await fetch(
                        `/api/method/rndopsapp.rndopsapp.doctype.recruitment_adhoc_contractual.recruitment_adhoc_contractual.get_filtered_designations?designation_type=${seedType}`
                    );
                    const desigJson = await desigRes.json();
                    const designations = desigJson?.message?.data || desigJson?.data || [];
                    if (designations.length > 0) {
                        // Assign to all keys DynamicFormRenderer may look up
                        finalLinkOptions["project_staff_designation"] = designations;
                        finalLinkOptions["Designation_prornd"] = designations;
                        finalLinkOptions["designation"] = designations;
                    }
                } catch (e) {
                    console.error("Failed to fetch designations by type", e);
                }
                // END OF EDIT — MKY | 2026-04-14 12:25 IST
                // ============================================================

                try {
                    const headsRes = await fetchAccountHeads({
                        doctype: 'Budget Head',
                        fields: ['name', 'budget_head'],
                        limit_page_length: 0,
                    });
                    if (headsRes?.message) {
                        finalLinkOptions['account_head'] = headsRes.message.map((head: any) => ({
                            value: head.name,
                            label: head.budget_head || head.name,
                        }));
                    }
                } catch (e) {
                    console.error("Failed to fetch account heads", e);
                }

                setFields(processedFields);
                setLinkOptions(finalLinkOptions);

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

                    // Fallback: if chairperson_webmail_id was never saved, try to fetch from applicant's HOD (piheadmentor_user_id)
                    if (
                        existingData.webmail_id &&
                        !existingData.chairperson_webmail_id
                    ) {
                        try {
                            const headRes = await fetchFrappeValue({
                                doctype: "User",
                                filters: { name: existingData.webmail_id },
                                fieldname: "piheadmentor_user_id",
                            });
                            if (headRes?.message?.piheadmentor_user_id) {
                                existingData.chairperson_webmail_id = headRes.message.piheadmentor_user_id;
                            }
                        } catch (e) {
                            console.error("Failed to fetch HOD for auto-fill on existing doc:", e);
                        }
                    }

                    // Always re-derive chairperson_name (ignore any stale saved value)
                    if (existingData.chairperson_webmail_id) {
                        const labelFromOptions = getChairpersonLabel(
                            existingData.chairperson_webmail_id,
                            link_options || {},
                        );
                        if (labelFromOptions) {
                            existingData.chairperson_name = labelFromOptions;
                        } else {
                            // Fetch full_name manually if not in link_options
                            try {
                                const headNameRes = await fetchFrappeValue({
                                    doctype: "User",
                                    filters: { name: existingData.chairperson_webmail_id },
                                    fieldname: "full_name",
                                });
                                if (headNameRes?.message?.full_name) {
                                    existingData.chairperson_name = headNameRes.message.full_name;
                                }
                            } catch (e) {
                                console.error("Failed to fetch chairperson full_name:", e);
                                existingData.chairperson_name = existingData.chairperson_name || "";
                            }
                        }
                    }

                    setFormData(existingData);
                    setWorkflowState(prefill_data.workflow_state || "Draft");
                } else if (!currentDocName) {
                    // Pre-fill fields for a new form
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const initialData: Record<string, any> = { ...prefill_data };

                    // Client Script Logic: Auto-set webmail_id to current logged-in user
                    if (currentUser && !initialData.webmail_id) {
                        initialData.webmail_id = currentUser;
                    }

                    // Client Script Logic: Fetch piheadmentor_user_id for head field and chairperson fields
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
                                const hodEmail = headRes.message.piheadmentor_user_id;
                                initialData.head = hodEmail;
                                initialData.chairperson_webmail_id = hodEmail;

                                // Fetch HOD's full name
                                const headNameRes = await fetchFrappeValue({
                                    doctype: "User",
                                    filters: { name: hodEmail },
                                    fieldname: "full_name",
                                });
                                if (headNameRes?.message?.full_name) {
                                    initialData.chairperson_name = headNameRes.message.full_name;
                                }
                            }
                        } catch (e) {
                            console.error("Failed to fetch HOD details for new form", e);
                        }
                    }

                    // Attempt to prefill project fields from URL param
                    const projectCode = projectParam || projectNoParam;
                    if (projectCode && (!initialData.upfa_project_code || !initialData.project_code)) {
                        initialData.upfa_project_code = projectCode;
                        initialData.project_code = projectCode;

                        // Fetch implementation_department, project_title, and project_duration_months from Project Registration
                        try {
                            const projectRes = await fetchFrappeValue({
                                doctype: "Project Registration",
                                filters: { project_no: projectCode },
                                fieldname: [
                                    "implementation_department",
                                    "project_title",
                                    "project_duration_months",
                                    "project_duration_days",
                                    "prj_start_date",
                                    "prj_end_date",
                                    "head_approver"
                                ],
                            });
                            console.log("Project Res:", projectRes);
                            if (projectRes?.message) {
                                if (projectRes.message.head_approver) {
                                    initialData.head = projectRes.message.head_approver;
                                }
                                if (projectRes.message.implementation_department) {
                                    initialData.implementation_department = projectRes.message.implementation_department;
                                    initialData.upfa_department = projectRes.message.implementation_department;
                                    initialData.department = projectRes.message.implementation_department;
                                }
                                if (projectRes.message.project_title) {
                                    initialData.upfa_project_title = projectRes.message.project_title;
                                    initialData.project_title = projectRes.message.project_title;
                                }

                                const months = projectRes.message.project_duration_months || 0;
                                const days = projectRes.message.project_duration_days || 0;
                                const startDate = projectRes.message.prj_start_date;
                                const endDate = projectRes.message.prj_end_date;

                                let durationStr = "";
                                if (months > 0 || days > 0) {
                                    const parts = [];
                                    if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
                                    if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
                                    durationStr = parts.join(", ");
                                } else if (startDate && endDate) {
                                    // Fallback to formatting as dates if months/days are zero
                                    durationStr = `${startDate} to ${endDate}`;
                                }

                                if (durationStr) {
                                    initialData.upfa_project_duration = durationStr;
                                    initialData.project_duration = durationStr;
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
        fetchAccountHeads,
        projectParam,
        projectNoParam,
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

    // ============================================================
    // EDITED BY MKY | 2026-04-14 12:25 IST
    // START OF EDIT — Re-fetch designations when designation_type changes
    // When the user changes the designation_type field in the form,
    // this effect fires and pulls a fresh filtered list from the backend
    // for that type. The designation dropdown updates immediately.
    // "Other" is always in the returned list (appended server-side).
    // ============================================================
    useEffect(() => {
        if (!formData.designation_type) return;
        const refetchDesignations = async () => {
            try {
                const type = encodeURIComponent(formData.designation_type as string);
                const res = await fetch(
                    `/api/method/rndopsapp.rndopsapp.doctype.recruitment_adhoc_contractual.recruitment_adhoc_contractual.get_filtered_designations?designation_type=${type}`
                );
                const json = await res.json();
                const designations = json?.message?.data || json?.data || [];
                if (designations.length > 0) {
                    setLinkOptions((prev) => ({
                        ...prev,
                        project_staff_designation: designations,
                        Designation_prornd: designations,
                        designation: designations,
                    }));
                }
            } catch (e) {
                console.error("[designation_type] Failed to re-fetch designations:", e);
            }
        };
        refetchDesignations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.designation_type]);
    // END OF EDIT — MKY | 2026-04-14 12:25 IST
    // ============================================================

    // --- FORM HANDLERS ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFieldChange = useCallback((fieldname: string, value: any) => {
        // ============================================================
        // EDITED BY MKY | 2026-04-14 15:57 IST
        // START OF EDIT — Intercept CREATE_NEW at the root handler
        // ============================================================
        if (value === "CREATE_NEW") {
            setRacQuickEntry({ isOpen: true, pendingValue: "", isSubmitting: false, fieldName: fieldname });
            return;
        }
        // END OF EDIT — MKY | 2026-04-14 15:57 IST
        // ============================================================

        setFormData((prev) => ({ ...prev, [fieldname]: value }));
    }, []);

    // Client Script side-effect: when webmail_id or chairperson_webmail_id changes, re-fetch related fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleFieldChangeWithSideEffects = useCallback(
        async (fieldname: string, value: any) => {
            // ============================================================
            // EDITED BY MKY | 2026-04-14 15:57 IST
            // START OF EDIT — Redirect to root handler interception
            // ============================================================
            if (value === "CREATE_NEW") {
                handleFieldChange(fieldname, value);
                return;
            }
            // END OF EDIT — MKY | 2026-04-14 15:57 IST
            // ============================================================

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
                            const hodEmail = headRes.message.piheadmentor_user_id;
                            setFormData((prev) => ({
                                ...prev,
                                head: hodEmail,
                                chairperson_webmail_id: hodEmail,
                            }));
                            // Fetch HOD full name for chairperson_name
                            try {
                                const nameRes = await fetchFrappeValue({
                                    doctype: "User",
                                    filters: { name: hodEmail },
                                    fieldname: "full_name",
                                });
                                if (nameRes?.message?.full_name) {
                                    setFormData((prev) => ({
                                        ...prev,
                                        chairperson_name: nameRes.message.full_name,
                                    }));
                                }
                            } catch (e) {
                                console.error("Failed to fetch HOD full_name for chairperson", e);
                            }
                        }
                    } catch (e) {
                        console.error("Failed to fetch head for webmail_id change", e);
                    }
                } else {
                    // Clear head and chairperson if webmail_id is cleared or set to system user
                    setFormData((prev) => ({ ...prev, head: "", chairperson_webmail_id: "", chairperson_name: "" }));
                }
            }

            // Side-effect: when chairperson_webmail_id changes, auto-fill chairperson_name from linkOptions
            if (fieldname === "chairperson_webmail_id") {
                console.log("[chairperson] webmail changed →", value);
                if (value) {
                    const opts =
                        linkOptions["chairperson_webmail_id"] ||
                        linkOptions["User"] ||
                        [];
                    console.log("[chairperson] linkOptions available:", opts);
                    const match = opts.find((o) => o.value === value);
                    console.log("[chairperson] match from linkOptions:", match);
                    if (match?.label) {
                        console.log("[chairperson] filling name from cache →", match.label);
                        setFormData((prev) => ({
                            ...prev,
                            chairperson_name: match.label,
                        }));
                    } else {
                        // Fallback: fetch full_name from User doctype if not in cached linkOptions
                        console.log("[chairperson] not in cache, fetching full_name from API...");
                        try {
                            const nameRes = await fetchFrappeValue({
                                doctype: "User",
                                filters: { name: value },
                                fieldname: "full_name",
                            });
                            console.log("[chairperson] API response:", nameRes);
                            setFormData((prev) => ({
                                ...prev,
                                chairperson_name: nameRes?.message?.full_name || "",
                            }));
                        } catch (e) {
                            console.error("Failed to fetch chairperson full_name", e);
                            setFormData((prev) => ({ ...prev, chairperson_name: "" }));
                        }
                    }
                } else {
                    console.log("[chairperson] cleared");
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
            // ============================================================
            // EDITED BY MKY | 2026-04-14 15:57 IST
            // START OF EDIT — Check for CREATE_NEW inside child tables
            // ============================================================
            if (value === "CREATE_NEW") {
                setRacQuickEntry({ isOpen: true, pendingValue: "", isSubmitting: false, fieldName: fieldname, tableName, rowIndex });
                return;
            }
            // END OF EDIT — MKY | 2026-04-14 15:57 IST
            // ============================================================

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
                                // Precise name key for known tables; fall back to label-based search
                                let nameKey: string;
                                if (tableName === "upfa_selection_committee") {
                                    nameKey = "upfa_member_name";
                                } else {
                                    const tableField = fields.find(f => f.fieldname === tableName);
                                    nameKey = "name_of_the_committee_member"; // default
                                    if (tableField && tableField.child_fields) {
                                        const nameField = tableField.child_fields.find(cf =>
                                            cf.label?.toLowerCase().includes("name") &&
                                            !cf.label?.toLowerCase().includes("email") &&
                                            !cf.label?.toLowerCase().includes("webmail") &&
                                            !cf.label?.toLowerCase().includes("designation") &&
                                            !cf.label?.toLowerCase().includes("department")
                                        );
                                        if (nameField) nameKey = nameField.fieldname;
                                    }
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

    // ============================================================
    // EDITED BY MKY | 2026-04-14 15:57 IST
    // START OF EDIT — Quick Entry Handlers for Recruitment Adhoc Contractual
    // Extracted opening logic into the change handlers above.
    // ============================================================
    const handleRacQuickEntrySave = async () => {
        if (!racQuickEntry || !racQuickEntry.pendingValue.trim()) return;
        setRacQuickEntry(prev => prev ? { ...prev, isSubmitting: true } : null);
        try {
            const apiRes = await createRacCustomDesignation({
                designation_name: racQuickEntry.pendingValue,
                designation_type: "Project Staff"
            });
            const result = apiRes?.message;
            if (result?.status === "duplicate") {
                alert(`⚠️ Designation already exists: "${result.message || result.designation_name}". Please choose it from the dropdown or enter a different name.`);
                setRacQuickEntry(prev => prev ? { ...prev, isSubmitting: false } : null);
                return;
            }
            if (result?.status === "success") {
                const finalDesignation = result.designation_name;
                // Inject new designation into dropdown options
                setLinkOptions(prev => {
                    const current = prev["Designation_prornd"] || [];
                    if (!current.find((o: LinkOption) => String(o.value) === String(finalDesignation))) {
                        const updated = [...current, { value: finalDesignation, label: finalDesignation }];
                        return {
                            ...prev,
                            Designation_prornd: updated,
                            designation: updated,
                            project_staff_designation: updated,
                        };
                    }
                    return prev;
                });
                // Auto-select the new designation in the form or row
                if (racQuickEntry.tableName && racQuickEntry.rowIndex !== undefined) {
                    handleTableRowChange(racQuickEntry.tableName, racQuickEntry.rowIndex, racQuickEntry.fieldName, finalDesignation);
                } else {
                    handleFieldChange(racQuickEntry.fieldName, finalDesignation);
                }
                setRacQuickEntry(null);
            } else {
                alert(`Error: ${result?.message || 'Failed to create custom designation.'}`);
                setRacQuickEntry(prev => prev ? { ...prev, isSubmitting: false } : null);
            }
        } catch (e: any) {
            console.error("RAC Quick Entry error", e);
            alert("Failed to create custom designation. Please try again.");
            setRacQuickEntry(prev => prev ? { ...prev, isSubmitting: false } : null);
        }
    };
    // END OF EDIT — MKY | 2026-04-14 15:35 IST
    // ============================================================

    // Fetch budget heads when commit section is visible
    useEffect(() => {
        if (!showCommitSection) return;
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch(
                    '/api/v2/document/Budget%20Head?fields=["name","budget_head","id"]&order_by=id%20asc',
                    { credentials: "include" },
                );
                const result = await response.json();
                if (result?.data) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const mapped = result.data.map((item: any) => ({
                        uid: item.name,
                        label: item.budget_head,
                        id: item.id,
                    }));
                    setAllBudgetHeads(mapped);
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    setBudgetHeadList(mapped.map((h: any) => ({ name: h.label, id: h.id })));
                }
            } catch (err) {
                console.error("Failed to fetch Budget Heads:", err);
            }
        };
        fetchBudgetHeads();
    }, [showCommitSection]);

    // --- COMMIT / PAYMENT HANDLERS ---
    const handleCommit = async () => {
        if (!currentDocName) return;
        const resolvedHead = allBudgetHeads.find(h => h.uid === commitHead)?.label || commitHead;
        const amount = parseFloat(commitAmount);
        if (!resolvedHead || !amount) {
            alert("Please select a budget head and enter an amount.");
            return;
        }
        try {
            await submitCommit({
                doctype: "Recruitment Adhoc Contractual",
                frapAppId: currentDocName,
                name: currentDocName,
                project_name: projectCode,
                commit_amount: amount,
                budget_head: resolvedHead,
                bmr: "",
            });
            alert("Commitment submitted successfully!");
            setStagedCommit({ head: resolvedHead, amount });
        } catch (error: any) {
            alert(`Commitment failed: ${error.message || "Unknown error"}`);
        }
    };

    const handlePayment = async () => {
        if (!paymentAmount || !commitHead || !currentDocName) {
            alert("Please select a budget head and enter an amount.");
            return;
        }
        try {
            await submitPayment({
                doctype: "Recruitment Adhoc Contractual",
                name: currentDocName,
                project_name: projectCode,
                payment_amount: parseFloat(paymentAmount),
                budget_head: commitHead,
                bmr: "",
            });
            alert("Payment recorded successfully!");
            setPaymentAmount("");
            window.location.reload();
        } catch (error: any) {
            alert(`Payment failed: ${error.message || "Unknown error"}`);
        }
    };

    // --- ACTIONS ---
    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isSavingRef.current) {
            console.warn("[SAVE] BLOCKED — save already in progress");
            return;
        }
        isSavingRef.current = true;
        setIsSubmitting(true);

        const saveId = Date.now();
        console.log(`[SAVE #${saveId}] handleSave ENTERED`, {
            savedDocNameRef: savedDocNameRef.current,
            editDocName,
            savedDocName,
            isSavingRef: isSavingRef.current,
        });

        try {
            // Use ref for immediate read — state update may not have applied yet after first save + navigate
            const currentDocName = savedDocNameRef.current || editDocName;

            // ============================================================
            // EDITED BY MKY | 2026-04-14 15:35 IST
            // START OF EDIT — Custom designation logic removed
            // Endpoints handle "CREATE_NEW" natively via modal now.
            // ============================================================
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const resolvedFormData: Record<string, any> = { ...formData };
            // END OF EDIT — MKY | 2026-04-14 15:35 IST
            // ============================================================

            const preparedData = await prepareFormDataForApi({
                ...resolvedFormData,
                name: currentDocName,
            });

            console.log(`[SAVE #${saveId}] calling saveCall with name:`, currentDocName);
            const response = await saveCall({ data: preparedData });

            console.log(`[SAVE #${saveId}] response:`, response);

            if (response && response.message?.status === "success") {
                const newDocName = response.message.docname;
                console.log(`[SAVE #${saveId}] SUCCESS — created/updated docname:`, newDocName, "was currentDocName:", currentDocName);
                // Update ref IMMEDIATELY so any subsequent save knows the doc already exists
                if (newDocName) {
                    savedDocNameRef.current = newDocName;
                    setSavedDocName(newDocName);
                }
                alert("Draft saved successfully");

                if (!currentDocName) {
                    navigate(`/recruitment-adhoc-contractual/${newDocName}`, {
                        replace: true,
                    });
                } else {
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
            console.log(`[SAVE #${saveId}] FINALLY — releasing lock`);
            isSavingRef.current = false;
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

    const handleUpdateChairperson = async () => {
        const docNameToUse = savedDocName || editDocName;
        if (!docNameToUse) {
            alert("Please save the document first.");
            return;
        }
        try {
            const response = await updateChairpersonCall({
                docname: docNameToUse,
                chairperson_webmail_id: formData.chairperson_webmail_id || "",
                chairperson_name: formData.chairperson_name || "",
            });
            if (response?.message?.status === "success") {
                alert("Chairperson fields updated successfully.");
            } else {
                alert(response?.message?.message || "Failed to update chairperson fields.");
            }
        } catch (error: any) {
            console.error("Update chairperson error:", error);
            alert(error?.message || "An error occurred while updating chairperson fields.");
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
                            Recruitment Adhoc Contractual
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

                <div className={cn("grid gap-6", showCommitSection ? "grid-cols-1 lg:grid-cols-[1fr_360px]" : "grid-cols-1")}>
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
                            </div>

                            {/* Action Bar */}
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 p-6 flex items-center justify-between">
                                <div className="text-sm text-zinc-500">
                                    {(editDocName || savedDocName) &&
                                        `Last updated: ${new Date().toLocaleTimeString()}`}
                                </div>
                                <div className="flex gap-3">
                                    {/* DoRnD-only: update chairperson fields directly via dedicated API */}
                                    {isDoRnd && (savedDocName || editDocName) && (
                                        <FrappeButton
                                            variant="outline"
                                            onClick={handleUpdateChairperson}
                                            disabled={isUpdatingChairperson}
                                            className="bg-white dark:bg-zinc-800 shadow-sm"
                                        >
                                            {isUpdatingChairperson ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4 mr-2" />
                                            )}
                                            Update Chairperson
                                        </FrappeButton>
                                    )}
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

                    {/* Commit Payment Sidebar — visible to staff, RnD only */}
                    {showCommitSection && (
                        <aside className="space-y-5">
                            {/* Make a Commitment */}
                            {!isCommitted && (
                                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                    <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                        Make a Commitment
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                Budget Head
                                            </label>
                                            <select
                                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25"
                                                value={commitHead}
                                                onChange={(e) => setCommitHead(e.target.value)}
                                            >
                                                <option value="">Select...</option>
                                                {allBudgetHeads.map((h) => (
                                                    <option key={h.uid} value={h.uid}>
                                                        {h.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                Available:{" "}
                                                <span className="font-medium text-[#D97757]">
                                                    ₹ {actualBalance.toLocaleString("en-IN")}
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                Amount (₹)
                                            </label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25"
                                                value={commitAmount}
                                                onChange={(e) => setCommitAmount(e.target.value)}
                                                placeholder="e.g., 5000"
                                            />
                                        </div>
                                        <FrappeButton
                                            className="w-full"
                                            variant="primary"
                                            onClick={handleCommit}
                                            disabled={isCommitting || !commitHead || !commitAmount}
                                        >
                                            {isCommitting ? "Submitting..." : "Submit Commitment"}
                                        </FrappeButton>
                                    </div>
                                </div>
                            )}

                            {/* Commitment Details */}
                            {isCommitted && (
                                <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                    <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                        Commitment Details
                                    </h3>
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-1">
                                        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                                            Linked Commitment
                                        </p>
                                        <div className="flex justify-between items-end">
                                            <p className="text-sm font-medium text-blue-900">
                                                <BudgetHeadName id={displayCommitment?.head || ""} />
                                            </p>
                                            <p className="text-lg font-bold text-blue-700">
                                                ₹ {Number(displayCommitment?.committed || 0).toLocaleString("en-IN")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Record Payment */}
                            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                                    Record Payment
                                </h3>
                                {isCommitted ? (
                                    <div className="space-y-4">
                                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-1">
                                            <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                                                Linked Commitment
                                            </p>
                                            <div className="flex justify-between items-end">
                                                <p className="text-sm font-medium text-blue-900">
                                                    {displayCommitment?.head}
                                                </p>
                                                <p className="text-lg font-bold text-blue-700">
                                                    ₹ {Number(displayCommitment?.committed || 0).toLocaleString("en-IN")}
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                Payment Amount (₹)
                                            </label>
                                            <input
                                                type="number"
                                                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25"
                                                placeholder="e.g., 5000"
                                                value={paymentAmount}
                                                onChange={(e) => setPaymentAmount(e.target.value)}
                                                max={displayCommitment?.committed}
                                            />
                                            <p className="text-xs text-zinc-500 mt-1">
                                                Max: ₹ {Number(displayCommitment?.committed || 0).toLocaleString("en-IN")}
                                            </p>
                                        </div>
                                        <FrappeButton
                                            className="w-full"
                                            variant="outline"
                                            onClick={handlePayment}
                                            disabled={
                                                isPaying ||
                                                !paymentAmount ||
                                                parseFloat(paymentAmount) > (displayCommitment?.committed || 0)
                                            }
                                        >
                                            {isPaying ? "Processing..." : "Submit Payment"}
                                        </FrappeButton>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 px-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            Commitment Required
                                        </p>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Make a commitment above before recording payment.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </aside>
                    )}
                </div>

                {/* ============================================================
                    EDITED BY MKY | 2026-04-14 15:35 IST
                    START OF EDIT — RacQuickEntryModal JSX
                    ============================================================ */}
                {racQuickEntry?.isOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRacQuickEntry(null)} />

                        <div className="relative bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-zinc-200 dark:border-zinc-800 animate-in fade-in zoom-in-95 duration-200">
                            <h2 className="text-xl font-serif font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                                Add New Designation
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
                                Add a new custom project staff designation.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                        Designation Title <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        autoFocus
                                        className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm bg-transparent focus:outline-none focus:ring-2 focus:ring-[#D97757]/25"
                                        placeholder="e.g. Senior Hardware Architect"
                                        value={racQuickEntry.pendingValue}
                                        onChange={(e) => setRacQuickEntry(prev => prev ? { ...prev, pendingValue: e.target.value } : null)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" && !racQuickEntry.isSubmitting && racQuickEntry.pendingValue.trim()) {
                                                e.preventDefault();
                                                handleRacQuickEntrySave();
                                            }
                                        }}
                                    />
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setRacQuickEntry(null)}
                                        disabled={racQuickEntry.isSubmitting}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="default"
                                        className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                                        onClick={handleRacQuickEntrySave}
                                        disabled={!racQuickEntry.pendingValue.trim() || racQuickEntry.isSubmitting}
                                    >
                                        {racQuickEntry.isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Saving...
                                            </>
                                        ) : "Save Custom"}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* END OF EDIT — MKY | 2026-04-14 15:35 IST
                    ============================================================ */}

            </main>
        </div>
    );
};

export default RecruitmentAdhocContractualForm;
