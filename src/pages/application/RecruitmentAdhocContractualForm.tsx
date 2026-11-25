import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import { useCancellationFrozen } from "@/components/CancellationLock";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { useFrappePostCall, useFrappeAuth, useFrappeGetCall } from "frappe-react-sdk";
import {
    DynamicFormRenderer,
    type FormField,
} from "@/components/forms/DynamicFormRenderer";
import {
    recruitmentAdhocContractualAPI,
    prepareFormDataForApi,
    recruitmentAdvertismentAPI,
} from "@/services/apiService";
import { Loader2, ArrowLeft, Save, Send, CheckCircle2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import "@/pages/dashboards/projectStaffDashboard.css";
import { useUserRoles } from "@/components/UserRole";
import { useProjectBudget } from '@/hooks/useProjectBudget';
import { BudgetHeadName } from '@/components/BudgetHeadName';
import { CommitPayment } from '@/components/CommitPayment';
import { ActivityLog, clearActivityLogCache } from '@/components/ActivityLog';
import { P11PrintModal } from "@/components/P11PrintModal";
import { generateRecruitmentAdhocContractualHtml } from "@/utils/recruitmentAdhocContractualPrint";
import { useIsOverheadProject } from '@/hooks/useIsOverheadProject';
import { ErrorModal } from "../../components/ErrorModal";
import { parseFrappeError } from "../../utils/errorUtils";

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
// --- COMMENT MODAL ---
const CommentModal = ({
    isOpen,
    onClose,
    onSubmit,
    action,
    isLoading,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (comment: string) => void;
    action: string;
    isLoading: boolean;
}) => {
    const [comment, setComment] = useState("");

    useEffect(() => {
        if (isOpen) setComment("");
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-[#FFFFFF] dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] p-6 rounded-xl shadow-xl w-full max-w-md">
                <h3 className="text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] mb-2">
                    Confirm: {action}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
                    A comment is required before performing this action.
                </p>
                <textarea
                    className="w-full border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#3F3F46] dark:text-[#E4E4E7] p-3 rounded-lg text-sm mb-1 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] font-sans leading-relaxed"
                    rows={4}
                    placeholder="Enter your comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    autoFocus
                />
                {comment.trim().length === 0 && (
                    <p className="text-xs text-red-500 mb-3">Comment is required.</p>
                )}
                <div className="flex justify-end gap-3 mt-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-zinc-50 dark:hover:bg-[#3F3F46] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(comment)}
                        disabled={isLoading || comment.trim().length === 0}
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-[#D97757] text-white hover:opacity-90 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? "Processing..." : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FrappeCard = ({ children, className }: any) => (
    <Card
        className={cn(
            "psd-card !rounded-xl overflow-visible",
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
    // An overhead fund (PDF / DPF / IDF / SWF / STWF) is a single pool with no head
    // dimension — every spend books to "Overhead". This fixes and locks every Budget
    // Head selector on the form. Ordinary projects are untouched.
    const isOverheadProject = useIsOverheadProject(formData.upfa_project_code);
    const [linkOptions, setLinkOptions] = useState<LinkOptionsMap>({});
    // Full, unfiltered Account Head options (all Budget Heads). Kept around so the
    // dropdown can be restored if the project is cleared.
    const [allAccountHeadOptions, setAllAccountHeadOptions] = useState<LinkOption[]>([]);
    const [isLoadingFields, setIsLoadingFields] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPrintOpen, setIsPrintOpen] = useState(false);
    const activityLogContainerRef = useRef<HTMLDivElement>(null);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });
    const isSavingRef = useRef(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(
        editDocName || null,
    );
    const savedDocNameRef = useRef<string | null>(editDocName || null);

    // Workflow States
    const [workflowState, setWorkflowState] = useState<string>("Draft");
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Comment modal state
    const [commentModalOpen, setCommentModalOpen] = useState(false);
    const [pendingAction, setPendingAction] = useState<string>("");

    // Add comment state

    // Commit / Payment state
    // commitHead/commitAmount moved to CommitPayment; kept for Record Payment section
    const [commitHead, setCommitHead] = useState("");
    const [paymentAmount, setPaymentAmount] = useState("");
    // stagedCommit removed — CommitPayment handles commit tracking via Kafka Staging
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
    // commit moved to CommitPayment component
    const { call: submitPayment, loading: isPaying } = useFrappePostCall(
        'rndopsapp.rndopsapp.commitPayment.submit_payment_data',
    );
    const { call: fetchAccountHeads } = useFrappePostCall<{ message: any[] }>('frappe.client.get_list');
    const { call: addCommentCall } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );
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
    // Budget Heads actually sanctioned/received against the selected project, used to
    // narrow the Account Head dropdown down from the global Budget Head list.
    const { data: projectBudgetHeadsResult } = useFrappeGetCall<{
        message: { name: string; id: number | null; budget_head: string }[];
    }>(
        'rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_heads_by_project',
        { project_no: projectCode },
        projectCode ? `project-budget-heads-${projectCode}` : null,
    );
    const { budgetData, actualBalance, commitableBalance } = useProjectBudget(projectCode);
    const currentDocName = editDocName || savedDocName || "";
    // A pending/approved cancellation freezes the application: no payments either.
    const cancellationFrozen = useCancellationFrozen("Recruitment Adhoc Contractual", currentDocName);
    const linkedCommitment = budgetData.find(
        (e) => (e.ref === currentDocName || e.frapAppId === currentDocName) && e.type === "commitment",
    );
    const isCommitted = !!linkedCommitment;
    const displayCommitment = linkedCommitment
        ? { head: linkedCommitment.head, committed: linkedCommitment.committed }
        : null;
    const activeWorkflowState = formData.workflow_state || workflowState;
    const showCommitSection =
        isRnDStaff &&
        !!currentDocName &&
        !!activeWorkflowState &&
        !["Draft", "Rejected", "Cancelled"].includes(activeWorkflowState);

    // Track Kafka Commit Staging status to gate workflow action buttons for Staff RnD
    const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(null);
    // commitRequired: block forward buttons until committed
    const commitRequired = isRnDStaff && showCommitSection && isCommittedForGate === false;

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
                if (!chairpersonEmail) {
                    return {};
                }

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
                    } catch (e) {
                    }
                }

                return {
                    chairperson_webmail_id: chairpersonEmail,
                    chairperson_name: chairpersonName,
                    head: chairpersonEmail,
                };
            } catch (e) {
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

            const response = await getFieldsCall({ doc_name: currentDocName });
            if (response && response.message) {
                const {
                    fields: fetchedFields,
                    prefill_data,
                    link_options,
                } = response.message;

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
                        `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.doctype.recruitment_adhoc_contractual.recruitment_adhoc_contractual.get_filtered_designations?designation_type=${seedType}`
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
                        const headOpts = headsRes.message.map((head: any) => ({
                            value: head.name,
                            label: head.budget_head || head.name,
                        }));
                        finalLinkOptions['account_head'] = headOpts;
                        setAllAccountHeadOptions(headOpts);
                    }
                } catch (e) {
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

                    // Fallback: if chairperson_webmail_id or head was never saved, try to fetch from applicant's HOD (piheadmentor_user_id)
                    if (
                        existingData.webmail_id &&
                        (!existingData.chairperson_webmail_id || !existingData.head)
                    ) {
                        try {
                            const headRes = await fetchFrappeValue({
                                doctype: "User",
                                filters: { name: existingData.webmail_id },
                                fieldname: "piheadmentor_user_id",
                            });
                            if (headRes?.message?.piheadmentor_user_id) {
                                if (!existingData.chairperson_webmail_id) {
                                    existingData.chairperson_webmail_id = headRes.message.piheadmentor_user_id;
                                }
                                if (!existingData.head) {
                                    existingData.head = headRes.message.piheadmentor_user_id;
                                }
                            }
                        } catch (e) {
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
                        }
                    }

                    setFormData(initialData);
                    setWorkflowState("Draft");
                }
            }
        } catch (error) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(error) });
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
                setAvailableActions([]);
            }
        },
        [getActionsCall],
    );

    // Initial load orchestration
    useEffect(() => {
        fetchFormConfiguration();
    }, [fetchFormConfiguration]);

    // Narrow the Account Head dropdown to the Budget Heads actually sanctioned/received
    // for the selected project. Falls back to the full list once the project is cleared,
    // or while the project-scoped list hasn't loaded yet.
    useEffect(() => {
        if (isLoadingFields) return;

        if (!projectCode) {
            setLinkOptions(prev => ({ ...prev, account_head: allAccountHeadOptions }));
            return;
        }

        const heads = projectBudgetHeadsResult?.message;
        if (!heads) return;

        const filtered: LinkOption[] = heads.map(h => ({ value: h.name, label: h.budget_head }));
        setLinkOptions(prev => ({ ...prev, account_head: filtered }));
    }, [isLoadingFields, projectCode, projectBudgetHeadsResult, allAccountHeadOptions]);

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
                    `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.doctype.recruitment_adhoc_contractual.recruitment_adhoc_contractual.get_filtered_designations?designation_type=${type}`
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
                            }
                        }
                    } catch (e) {
                    }
                } else {
                    // Clear head and chairperson if webmail_id is cleared or set to system user
                    setFormData((prev) => ({ ...prev, head: "", chairperson_webmail_id: "", chairperson_name: "" }));
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
                    if (match?.label) {
                        setFormData((prev) => ({
                            ...prev,
                            chairperson_name: match.label,
                        }));
                    } else {
                        // Fallback: fetch full_name from User doctype if not in cached linkOptions
                        try {
                            const nameRes = await fetchFrappeValue({
                                doctype: "User",
                                filters: { name: value },
                                fieldname: "full_name",
                            });
                            setFormData((prev) => ({
                                ...prev,
                                chairperson_name: nameRes?.message?.full_name || "",
                            }));
                        } catch (e) {
                            setFormData((prev) => ({ ...prev, chairperson_name: "" }));
                        }
                    }
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
                }).catch(() => {});
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
                setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(result) });
                setRacQuickEntry(prev => prev ? { ...prev, isSubmitting: false } : null);
            }
        } catch (e: any) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(e) });
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
                    `${FRAPPE_BASE_URL}/api/resource/Budget%20Head?fields=["name","budget_head","id"]&order_by=id%20asc&limit_page_length=0`,
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
            }
        };
        fetchBudgetHeads();
    }, [showCommitSection]);

    // --- COMMIT / PAYMENT HANDLERS ---
    // handleCommit moved to CommitPayment component

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
            setErrorModal({ open: true, title: "Payment Failed", message: parseFrappeError(error) });
        }
    };

    // --- ACTIONS ---
    const handleSave = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (isSavingRef.current) {
            return;
        }
        isSavingRef.current = true;
        setIsSubmitting(true);

        const saveId = Date.now();

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

            const response = await saveCall({ data: preparedData });


            if (response && response.message?.status === "success") {
                const newDocName = response.message.docname;
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
                setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(response?.message, response) });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(error) });
        } finally {
            isSavingRef.current = false;
            setIsSubmitting(false);
        }
    };

    const handleWorkflowAction = (action: string) => {
        const docNameToUse = savedDocName || editDocName;
        if (!docNameToUse) {
            alert("Please save the document first.");
            return;
        }
        setPendingAction(action);
        setCommentModalOpen(true);
    };

    const handleConfirmWorkflowAction = async (comment: string) => {
        const docNameToUse = savedDocName || editDocName;
        if (!docNameToUse || !pendingAction) return;
        setCommentModalOpen(false);

        setIsActionLoading(true);
        try {
            let preparedData;
            if (workflowState === "Draft" || pendingAction === "Submit") {
                preparedData = await prepareFormDataForApi({
                    ...formData,
                    name: docNameToUse,
                });
            }

            const response = await performActionCall({
                docname: docNameToUse,
                action: pendingAction,
                updated_data: preparedData,
                comment: comment.trim() || undefined,
            });

            if (
                response &&
                response.message &&
                response.message.status === "success"
            ) {
                if (comment.trim()) {
                    try {
                        await addCommentCall({
                            doctype: "Recruitment Adhoc Contractual",
                            docname: docNameToUse,
                            content: comment.trim(),
                        });
                    } catch (e) {
                    }
                }
                alert(`Action "${pendingAction}" completed successfully`);
                setWorkflowState(response.message.workflow_state);
                clearActivityLogCache("Recruitment Adhoc Contractual", docNameToUse);
                fetchFormConfiguration();
                fetchWorkflowActions(docNameToUse);
            } else {
                setErrorModal({
                    open: true,
                    title: "Submission Failed",
                    message: parseFrappeError(response?.message, response) || `Failed to perform action ${pendingAction}`,
                });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(error) });
        } finally {
            setIsActionLoading(false);
            setPendingAction("");
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
                setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(response?.message, response) });
            }
        } catch (error: any) {
            setErrorModal({ open: true, title: "Submission Failed", message: parseFrappeError(error) });
        }
    };

    // Advertisement status (Recruitment Advertisment): published when a record with publish = Yes exists
    const { data: adResp, mutate: reloadAd } = useFrappeGetCall<{ message: { published: boolean; status: string; record: { modified?: string; project_no?: string } | null } }>(
        recruitmentAdvertismentAPI.get,
        currentDocName ? { recruitment_adhoc_contractual: currentDocName } : undefined,
        currentDocName && activeWorkflowState === "Approved" ? undefined : null,
    );
    const adStatus = adResp?.message;
    const { call: saveAdvertisement } = useFrappePostCall<{ message: any }>(recruitmentAdvertismentAPI.save);
    const [adBusy, setAdBusy] = useState(false);
    const [adError, setAdError] = useState<string | null>(null);
    const publishAdvertisement = async () => {
        setAdBusy(true);
        setAdError(null);
        try {
            const res = await saveAdvertisement({ recruitment_adhoc_contractual: currentDocName, publish: "Yes", ...(projectCode ? { project_no: projectCode } : {}) });
            if (res?.message?.status && res.message.status !== "success") throw new Error(res.message.message || "Could not publish");
            await reloadAd();
        } catch (e: any) {
            setAdError(String(e?.message || "Could not publish").replace(/<[^>]+>/g, ""));
        } finally {
            setAdBusy(false);
        }
    };

    // --- RENDER HELPERS ---
    const isFormReadOnly = workflowState !== "Draft" && workflowState !== "Pending";
    const isReadOnly = isFormReadOnly;
    const deanOverrideReadOnly = isDoRnd && isFormReadOnly;

    if (isLoadingFields) {
        return (
            <div className="psd-root flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="psd-loadbar w-56" />
                <Loader2 className="w-7 h-7 animate-spin text-[var(--psd-primary)]" />
                <p className="text-[var(--psd-body)] font-medium">
                    Loading form configuration...
                </p>
            </div>
        );
    }

    return (
        <div className="psd-root min-h-screen">
            <main className="max-w-8xl mx-auto p-0 w-full space-y-2.5">
                <header className="psd-hero relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2">
                    <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                        <button
                            onClick={() => navigate(-1)}
                            className="psd-focus grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                        <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                            <Send className="size-4" strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">Application Form</span>
                                {(editDocName || savedDocName) && (
                                    <span
                                        className={cn(
                                            "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                                            workflowState === "Approved"
                                                ? "border-[var(--psd-approved)]/40 bg-[var(--psd-approved-bg)] text-[#0A8A60] dark:text-emerald-300"
                                                : workflowState === "Draft"
                                                    ? "border-[var(--psd-border)] bg-[var(--psd-bg)] text-[var(--psd-body)]"
                                                    : "border-[var(--psd-review)]/40 bg-[var(--psd-review-bg)] text-[#B26A00] dark:text-amber-300",
                                        )}
                                    >
                                        {workflowState}
                                    </span>
                                )}
                                {adStatus && (
                                    <span
                                        title={adStatus.record?.modified ? `Advertisement updated ${new Date(adStatus.record.modified).toLocaleString("en-IN")}` : "No advertisement record yet"}
                                        className={cn(
                                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                                            adStatus.published
                                                ? "border-[var(--psd-approved)]/40 bg-[var(--psd-approved-bg)] text-[#0A8A60] dark:text-emerald-300"
                                                : "border-[var(--psd-review)]/40 bg-[var(--psd-review-bg)] text-[#B26A00] dark:text-amber-300",
                                        )}
                                    >
                                        <span className={cn("size-1.5 rounded-full", adStatus.published ? "bg-[var(--psd-approved)]" : "bg-[var(--psd-review)]")} />
                                        {adStatus.status}
                                    </span>
                                )}
                            </div>
                            <h1 className="mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">
                                Recruitment Adhoc Contractual
                            </h1>
                        </div>
                    </div>
                    <div className="relative z-10 flex items-center gap-3">
                        <p className="hidden font-mono text-xs text-[var(--psd-body)] md:block">
                            {editDocName || savedDocName ? `Application ID: ${editDocName || savedDocName}` : "New Application"}
                        </p>
                        {currentDocName && (
                            <button
                                type="button"
                                onClick={() => setIsPrintOpen(true)}
                                className="psd-focus inline-flex items-center gap-1.5 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-3 py-1.5 text-[12px] font-bold text-[var(--psd-heading)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]"
                                title="Print this document"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Print
                            </button>
                        )}
                    </div>
                </header>

                {adStatus && (
                    <div
                        role="status"
                        className={cn(
                            "flex flex-wrap items-center justify-between gap-3 rounded-xl border border-l-[4px] px-4 py-3",
                            adStatus.published
                                ? "border-[var(--psd-approved)]/40 border-l-[var(--psd-approved)] bg-[var(--psd-approved-bg)]"
                                : "border-[var(--psd-review)]/40 border-l-[var(--psd-review)] bg-[var(--psd-review-bg)]",
                        )}
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-white", adStatus.published ? "bg-[var(--psd-approved)]" : "bg-[var(--psd-review)]")}>
                                {adStatus.published ? <CheckCircle2 className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                            </span>
                            <div className="min-w-0">
                                <p className={cn("text-[14px] font-bold", adStatus.published ? "text-[#0A8A60] dark:text-emerald-300" : "text-[#B26A00] dark:text-amber-300")}>
                                    Advertisement: {adStatus.status}
                                </p>
                                <p className="text-[12px] text-[var(--psd-body)]">
                                    {adStatus.published
                                        ? `This recruitment has been advertised${adStatus.record?.modified ? ` (updated ${new Date(adStatus.record.modified).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })})` : ""}.`
                                        : "This recruitment is approved but its advertisement has not been published yet."}
                                </p>
                                {adError && <p className="mt-1 text-[12px] font-semibold text-[var(--psd-returned)]">{adError}</p>}
                            </div>
                        </div>
                        {showCommitSection && !adStatus.published && (
                            <button
                                type="button"
                                onClick={publishAdvertisement}
                                disabled={adBusy}
                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--psd-approved)] px-4 py-2 text-[12.5px] font-bold text-white shadow-sm transition-all hover:brightness-95 active:scale-[0.98] disabled:opacity-50"
                            >
                                {adBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Publish
                            </button>
                        )}
                        {showCommitSection && adStatus.published && (
                            <button type="button" onClick={() => navigate("/recruitment-advertisement")} className="shrink-0 text-[12px] font-bold text-[var(--psd-primary)] hover:underline">
                                Manage in Recruitment Advertisement →
                            </button>
                        )}
                    </div>
                )}

                <div className={cn("grid grid-cols-1 gap-2.5", showCommitSection && "xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start")}>
                    {/* Main Form Content */}
                    <div className="space-y-2.5">
                        <FrappeCard>
                            <div className="psd-uform p-3">
                                <DynamicFormRenderer
                                                                        overheadFund={isOverheadProject}
                                    fields={(() => {
                                        const DEAN_ONLY_FIELDS = ["chairperson_webmail_id", "chairperson_name"];
                                        const showDeanFields = isDoRnd || activeWorkflowState === "Approved";
                                        let visibleFields = showDeanFields ? fields : fields.filter(f => !DEAN_ONLY_FIELDS.includes(f.fieldname));

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
                            <div className="flex items-center justify-between gap-3 rounded-b-xl border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-2.5">
                                <div className="text-[12px] text-[var(--psd-body)]">
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
                                            className="!bg-[var(--psd-surface)] !border-[var(--psd-border)] !text-[var(--psd-heading)] shadow-sm hover:!border-[var(--psd-primary)] hover:!text-[var(--psd-primary)]"
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
                                                className="!bg-[var(--psd-surface)] !border-[var(--psd-border)] !text-[var(--psd-heading)] shadow-sm hover:!border-[var(--psd-primary)] hover:!text-[var(--psd-primary)]"
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
                                                    className="!bg-[var(--psd-primary)] hover:!bg-[var(--psd-primary-hover)] !text-white shadow-sm"
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
                                                    className="!bg-[var(--psd-primary)] hover:!bg-[var(--psd-primary-hover)] !text-white shadow-sm"
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
                                        <>
                                            {commitRequired && (
                                                <div className="w-full rounded-lg border border-[var(--psd-review)]/40 bg-[var(--psd-review-bg)] p-2 text-xs font-medium text-[#B26A00] dark:text-amber-300">
                                                    A commitment must be submitted before forwarding this application.
                                                </div>
                                            )}
                                            <div className="flex gap-2 flex-wrap">
                                                {availableActions.map((action) => (
                                                    <FrappeButton
                                                        key={action}
                                                        onClick={() => handleWorkflowAction(action)}
                                                        disabled={isActionLoading || commitRequired}
                                                        title={commitRequired ? "Submit a commitment first" : undefined}
                                                        className={cn(
                                                            "shadow-sm",
                                                            commitRequired
                                                                ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                                                                : action === "Approve"
                                                                    ? "!bg-[var(--psd-approved)] hover:brightness-95 !text-white"
                                                                    : action === "Reject"
                                                                        ? "!bg-[var(--psd-returned)] hover:brightness-95 !text-white"
                                                                        : "!bg-[var(--psd-primary)] hover:!bg-[var(--psd-primary-hover)] !text-white",
                                                        )}
                                                    >
                                                        {isActionLoading ? (
                                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        ) : null}
                                                        {action}
                                                    </FrappeButton>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </FrappeCard>
                    </div>

                    {/* Commit Payment — visible to staff, RnD only */}
                    {showCommitSection && (
                        <div className="flex flex-col gap-2.5 xl:sticky xl:top-3">
                            {/* Commit Payment — centralised component handles staging check + form/display card */}
                            <CommitPayment
                                doctype="Recruitment Adhoc Contractual"
                                docName={currentDocName}
                                projectName={projectCode}
                                budgetHeads={allBudgetHeads.map(h => h.label)}
                                actualBalance={actualBalance}
                                commitableBalance={commitableBalance}
                                onCommitSuccess={() => {}}
                                onStagingStatusChange={(committed) => setIsCommittedForGate(committed)}
                            />

                            {/* Commitment Details */}
                            {isCommitted && (
                                <div className="psd-card !rounded-xl overflow-hidden">
                                    <h3 className="border-b border-l-[3px] border-b-[var(--psd-border)] border-l-[var(--psd-accent)] bg-[var(--psd-bg)] px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-[var(--psd-heading)]">
                                        Commitment Details
                                    </h3>
                                    <div className="m-3 flex flex-col gap-1 rounded-lg border border-[var(--psd-info)]/30 bg-[var(--psd-info-bg)] p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--psd-info)]">
                                            Linked Commitment
                                        </p>
                                        <div className="flex justify-between items-end">
                                            <p className="text-sm font-medium text-[var(--psd-heading)]">
                                                <BudgetHeadName id={displayCommitment?.head || ""} />
                                            </p>
                                            <p className="text-lg font-bold text-[var(--psd-info)]">
                                                ₹ {Number(displayCommitment?.committed || 0).toLocaleString("en-IN")}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>

                {currentDocName && (
                    <FloatingActivityLogButton doctype="Recruitment Adhoc Contractual" docname={currentDocName} />
                )}

                <CommentModal
                    isOpen={commentModalOpen}
                    onClose={() => { setCommentModalOpen(false); setPendingAction(""); }}
                    onSubmit={handleConfirmWorkflowAction}
                    action={pendingAction}
                    isLoading={isActionLoading}
                />

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
                                        className="!bg-[var(--psd-primary)] hover:!bg-[var(--psd-primary-hover)] !text-white shadow-sm"
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

                <ErrorModal
                    open={errorModal.open}
                    title={errorModal.title}
                    message={errorModal.message}
                    onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
                />

                <div style={{ display: "none" }} ref={activityLogContainerRef}>
                    {currentDocName && (
                        <ActivityLog
                            doctype="Recruitment Adhoc Contractual"
                            docname={currentDocName}
                            fallbackOwner={formData.owner}
                            fallbackCreation={formData.creation}
                        />
                    )}
                </div>

                <P11PrintModal
                    title="Recruitment Adhoc Contractual Preview"
                    isOpen={isPrintOpen}
                    onClose={() => setIsPrintOpen(false)}
                    docName={currentDocName || "Draft"}
                    htmlContent={
                        isPrintOpen
                            ? generateRecruitmentAdhocContractualHtml(
                                formData,
                                fields,
                                linkOptions,
                                activityLogContainerRef.current
                            )
                            : ""
                    }
                />

            </main>
        </div>
    );
};

export default RecruitmentAdhocContractualForm;
