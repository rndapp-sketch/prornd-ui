/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useFrappePostCall, useFrappeAuth } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { Save, Send, ArrowLeft, CheckCircle2 } from "lucide-react";
import { AppSidebar } from "@/components/RndSidebar";
import { PageHeader } from "@/components/common/PageHeader";
import {
    DynamicFormRenderer,
    type FormField,
    type LinkOption,
} from "@/components/forms/DynamicFormRenderer";
import { isFieldVisible } from "@/utils/evalExpression";
import { indentGeneralFormAPI, commonAPI, prepareFormDataForApi } from "@/services/apiService";
import { ErrorModal } from "../../components/ErrorModal";
import { parseFrappeError } from "../../utils/errorUtils";

// ---------------------------------------------------------------------------
// Submit-confirmation modal shown after a successful save
// ---------------------------------------------------------------------------
const SubmitConfirmModal: React.FC<{
    onSubmit: () => void;
    onDismiss: () => void;
    isLoading: boolean;
}> = ({ onSubmit, onDismiss, isLoading }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 flex-shrink-0" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Draft Saved Successfully
                </h2>
            </div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-5">
                Would you like to submit this form for approval now?
            </p>
            <div className="flex gap-3 justify-end">
                <button
                    onClick={onDismiss}
                    disabled={isLoading}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 transition-all"
                >
                    Not Now
                </button>
                <button
                    onClick={onSubmit}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#D97757] text-white hover:bg-[#c66a4e] disabled:opacity-50 transition-all"
                >
                    <Send className="w-4 h-4" />
                    {isLoading ? "Submitting…" : "Submit"}
                </button>
            </div>
        </div>
    </div>
);
import { GlobalLoader } from "@/components/ui/global-loader";

// --- UI Helpers ---
const GroupCard = ({
    label,
    children,
    className,
}: {
    label: string;
    children: React.ReactNode;
    className?: string;
}) => (
    <div
        className={cn(
            "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden",
            className,
        )}
    >
        <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <h3 className="text-xs font-extrabold text-[#27272A] dark:text-[#F4F4F5] uppercase tracking-widest">
                {label}
            </h3>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

const FrappeButton = ({
    children,
    onClick,
    disabled,
    className,
}: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-[#D97757]/20",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className,
        )}
    >
        {children}
    </button>
);

// --- MAIN COMPONENT ---
const IndentGeneralForm: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const editDocName = id || searchParams.get("edit") || null;
    // project_no  → igf_project_code (Data field)
    // project_name → igf_project_title (Link → Project Registration, stores doc name)
    const projectNoParam = searchParams.get("project_no") || searchParams.get("project") || "";
    const projectNameParam = searchParams.get("project_name") || projectNoParam;
    const projectTitleParam = searchParams.get("projectTitle") || "";

    const { currentUser } = useFrappeAuth();

    const [fields, setFields] = useState<FormField[]>([]);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const isSavingRef = useRef(false);
    const [savedDocName, setSavedDocName] = useState<string | null>(editDocName);
    const savedDocNameRef = useRef<string | null>(editDocName);
    const [workflowState, setWorkflowState] = useState<string>("Draft");
    const [availableActions, setAvailableActions] = useState<string[]>([]);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [docStatus, setDocStatus] = useState<number>(0);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });

    const { call: fetchFields } = useFrappePostCall<{ message: any }>(indentGeneralFormAPI.getFields);
    const { call: saveForm } = useFrappePostCall<{ message: any }>(indentGeneralFormAPI.save);
    const { call: getActionsCall } = useFrappePostCall<{ message: any }>(indentGeneralFormAPI.getWorkflowActions);
    const { call: performActionCall } = useFrappePostCall<{ message: any }>(indentGeneralFormAPI.performAction);
    const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>("frappe.client.get_value");
    const { call: fetchUserDetails } = useFrappePostCall<{ message: any }>(commonAPI.getUserDetailsByEmail);

    // ------ Client-script logic (mirrors Frappe's IGF client script) ------
    const applyClientScript = useCallback((data: Record<string, any>): Record<string, any> => {
        const updated = { ...data };

        // Calculate igf_estimated_amount per row and igf_total_estimate
        if (Array.isArray(updated.igf_items)) {
            let total = 0;
            updated.igf_items = updated.igf_items.map((row: any) => {
                const qty = parseFloat(row.igf_quantity) || 0;
                const rate = parseFloat(row.igf_estimated_rate) || 0;
                const amount = qty * rate;
                total += amount;
                return { ...row, igf_estimated_amount: amount };
            });
            updated.igf_total_estimate = total;
        }

        // Tender type logic
        if (updated.igf_tender_type === "Open Tender") {
            updated.igf_number_of_bids = "Double Bid (separate technical and price bids)";
            // We'll mark vendor list hidden via field override
        }

        return updated;
    }, []);

    // ------ Field overrides based on client script rules ------
    const getEffectiveFields = useCallback(
        (baseFields: FormField[], data: Record<string, any>): FormField[] => {
            return baseFields.map((f) => {
                // Auto-filled fields — always read-only
                if (
                    f.fieldname === "igf_department_centre_section" ||
                    f.fieldname === "igf_employee_code"
                ) {
                    return { ...f, read_only: 1 };
                }
                // Replace hardcoded Select with Budget Head dynamic Link dropdown
                if (f.fieldname === "igf_account_head" || f.fieldname === "budget_head") {
                    return { ...f, fieldtype: "Link", options: "Budget Head" };
                }
                // Lock igf_number_of_bids when Open Tender is selected
                if (f.fieldname === "igf_number_of_bids" && data.igf_tender_type === "Open Tender") {
                    return { ...f, read_only: 1 };
                }
                // Hide igf_upload_vendor_list unless Limited Tender
                if (f.fieldname === "igf_upload_vendor_list") {
                    if (data.igf_tender_type !== "Limited Tender") {
                        return { ...f, hidden: 1 } as any;
                    }
                    return { ...f, hidden: 0 } as any;
                }
                return f;
            });
        },
        [],
    );

    // ------ Fetch workflow actions ------
    const fetchWorkflowActions = useCallback(async (docname: string) => {
        try {
            const res = await getActionsCall({ docname });
            const msg = res?.message;
            setAvailableActions(Array.isArray(msg?.actions) ? msg.actions : []);
        } catch (e) {
            console.error("Error fetching workflow actions:", e);
        }
    }, [getActionsCall]);

    // ------ Auto-fill PI committee member ------
    const addPICommitteeMember = useCallback(
        async (prefill: Record<string, any>, user: string): Promise<Record<string, any>> => {
            const webmail = user.replace("@iitg.ac.in", "");
            let fullName = "";
            try {
                const res = await fetchFrappeValue({ doctype: "User", filters: { name: user }, fieldname: "full_name" });
                fullName = res?.message?.full_name || "";
            } catch { /* ignore */ }

            const existing: any[] = prefill.igf_committee_members || [];
            if (existing.length === 0) {
                return {
                    ...prefill,
                    igf_committee_members: [
                        { igf_webmail_id: webmail, igf_member_name: fullName, igf_designation: "PI" },
                    ],
                };
            }
            return prefill;
        },
        [fetchFrappeValue],
    );

    // ------ Load form ------
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                // Fetch budget heads, form fields, and user list in parallel
                const [res, budgetHeadRes, userRes] = await Promise.all([
                    fetchFields({ doc_name: editDocName || null }),
                    fetch('/api/resource/Budget%20Head?fields=["name","budget_head"]&order_by=budget_head asc&limit_page_length=0', {
                        credentials: "include",
                        headers: { Accept: "application/json" },
                    }).then((r) => r.json()).catch(() => ({ data: [] })),
                    fetch('/api/resource/User?fields=["name","full_name"]&filters=[["enabled","=",1]]&limit_page_length=0', {
                        credentials: "include",
                        headers: { Accept: "application/json" },
                    }).then((r) => r.json()).catch(() => ({ data: [] })),
                ]);

                if (!res?.message) return;

                const budgetHeadOptions: LinkOption[] = (budgetHeadRes?.data || []).map((h: any) => ({
                    value: h.budget_head || h.name,
                    label: h.budget_head || h.name,
                }));

                // User options for committee member webmail autocomplete
                const userOptions: LinkOption[] = (userRes?.data || [])
                    .filter((u: any) => u.name !== "Administrator" && u.name !== "Guest")
                    .map((u: any) => ({ value: u.name, label: u.full_name || u.name }));

                const { fields: apiFields, link_options, prefill_data } = res.message;

                const HIDDEN = ["section_break_bu6z", "amended_from"];
                const filtered = (apiFields || []).filter(
                    (f: FormField) => !HIDDEN.includes(f.fieldname),
                );
                setFields(filtered);

                const mergedLinkOptions: Record<string, any[]> = {
                    ...(link_options || {}),
                    igf_account_head: budgetHeadOptions,
                    budget_head: budgetHeadOptions,
                    "Budget Head": budgetHeadOptions,
                    // Keys ChildTableComponent looks up for email/webmail autocomplete
                    User: userOptions,
                    webmail_id: userOptions,
                };

                if (editDocName) {
                    // Editing existing doc
                    const data = prefill_data || {};

                    // Fetch project title label + department for the Link field display
                    if (data.igf_project_title) {
                        try {
                            const ptRes = await fetchFrappeValue({
                                doctype: "Project Registration",
                                filters: { name: data.igf_project_title },
                                fieldname: ["project_title", "implementation_department"],
                            });
                            const title = ptRes?.message?.project_title;
                            if (title) {
                                mergedLinkOptions.igf_project_title = [
                                    ...(mergedLinkOptions.igf_project_title || []),
                                    { value: data.igf_project_title, label: title },
                                ];
                            }
                            const dept = ptRes?.message?.implementation_department;
                            if (dept && !data.igf_department_centre_section) {
                                data.igf_department_centre_section = dept;
                            }
                        } catch { /* ignore */ }
                    }

                    setLinkOptions(mergedLinkOptions);
                    setFormData(applyClientScript(data));
                    setWorkflowState(data.workflow_state || "Draft");
                    setDocStatus(data.docstatus || 0);
                    await fetchWorkflowActions(editDocName);
                } else {
                    // New doc – prefill
                    let prefill: Record<string, any> = { ...(prefill_data || {}) };

                    // Set webmail / project
                    if (currentUser && !["Administrator", "Guest"].includes(currentUser)) {
                        prefill.igf_webmail_id = currentUser;
                        prefill.igf_webmail_user_id = currentUser.replace("@iitg.ac.in", "");
                        try {
                            const uRes = await fetchUserDetails({ user_email: currentUser });
                            if (uRes?.message) {
                                prefill.igf_indenter = uRes.message.full_name || "";
                                prefill.igf_indenter_designation = uRes.message.designation_name || "";
                                prefill.igf_employee_code = uRes.message.employee_id || "";
                            }
                        } catch { /* ignore */ }

                        prefill = await addPICommitteeMember(prefill, currentUser);
                    }

                    if (projectNameParam) {
                        // Link field stores the Project Registration doc name
                        prefill.igf_project_title = projectNameParam;

                        // Fetch project_title label + implementation_department
                        try {
                            const ptRes = await fetchFrappeValue({
                                doctype: "Project Registration",
                                filters: { name: projectNameParam },
                                fieldname: ["project_title", "implementation_department"],
                            });
                            const title = ptRes?.message?.project_title;
                            if (title) {
                                mergedLinkOptions.igf_project_title = [
                                    ...(mergedLinkOptions.igf_project_title || []),
                                    { value: projectNameParam, label: title },
                                ];
                            }
                            const dept = ptRes?.message?.implementation_department;
                            if (dept) {
                                prefill.igf_department_centre_section = dept;
                            }
                        } catch { /* ignore */ }
                    }
                    if (projectNoParam) {
                        // Data field stores the project number/code
                        prefill.igf_project_code = projectNoParam;
                    }

                    setLinkOptions(mergedLinkOptions);
                    setFormData(applyClientScript(prefill));
                }
            } catch (e) {
                console.error("Failed to load Indent General Form:", e);
            } finally {
                setLoading(false);
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editDocName, currentUser]);

    const handleChange = useCallback(
        (fieldname: string, value: any) => {
            setFormData((prev) => {
                const updated = applyClientScript({ ...prev, [fieldname]: value });
                return updated;
            });
        },
        [applyClientScript],
    );

    const handleFileChange = useCallback((fieldname: string, file: File | null) => {
        setFormData((prev) => ({ ...prev, [fieldname]: file }));
    }, []);

    const handleTableRowChange = useCallback(
        (tableName: string, rowIndex: number, fieldname: string, value: any) => {
            // Auto-fill name + designation when committee member webmail is selected
            if (tableName === "igf_committee_members" && fieldname === "igf_webmail_id" && value) {
                const emailValue = value.includes("@") ? value : `${value}@iitg.ac.in`;

                // Sync: fill name immediately from cached user list
                const userOpt = linkOptions["User"]?.find(
                    (o) => o.value === value || o.value === emailValue,
                );
                setFormData((prev) => {
                    const tableData = Array.isArray(prev[tableName]) ? [...prev[tableName]] : [];
                    tableData[rowIndex] = {
                        ...tableData[rowIndex],
                        igf_webmail_id: value,
                        ...(userOpt ? { igf_member_name: userOpt.label } : {}),
                    };
                    return applyClientScript({ ...prev, [tableName]: tableData });
                });

                // Async: fetch full name + designation from employee record
                fetchUserDetails({ user_email: emailValue })
                    .then((res: any) => {
                        if (res?.message) {
                            setFormData((prev) => {
                                const tableData = Array.isArray(prev[tableName])
                                    ? [...prev[tableName]]
                                    : [];
                                tableData[rowIndex] = {
                                    ...tableData[rowIndex],
                                    ...(res.message.full_name
                                        ? { igf_member_name: res.message.full_name }
                                        : {}),
                                    ...(res.message.designation_name
                                        ? { igf_designation: res.message.designation_name }
                                        : {}),
                                };
                                return applyClientScript({ ...prev, [tableName]: tableData });
                            });
                        }
                    })
                    .catch(() => {/* ignore */ });
                return;
            }

            setFormData((prev) => {
                const tableData = Array.isArray(prev[tableName]) ? [...prev[tableName]] : [];
                tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: value };
                return applyClientScript({ ...prev, [tableName]: tableData });
            });
        },
        [applyClientScript, linkOptions, fetchUserDetails],
    );

    const handleAddTableRow = useCallback(
        (tableName: string, newRow: Record<string, any>) => {
            setFormData((prev) => {
                const rows = [...(Array.isArray(prev[tableName]) ? prev[tableName] : []), newRow];
                return applyClientScript({ ...prev, [tableName]: rows });
            });
        },
        [applyClientScript],
    );

    const handleDeleteTableRow = useCallback(
        (tableName: string, rowIndex: number) => {
            setFormData((prev) => {
                const rows = Array.isArray(prev[tableName]) ? [...prev[tableName]] : [];
                rows.splice(rowIndex, 1);
                return applyClientScript({ ...prev, [tableName]: rows });
            });
        },
        [applyClientScript],
    );

    const handleSave = useCallback(async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // ── Declaration validation ───────────────────────────────────────
        const decl1 = formData.igf_declaration_text;
        const decl2 = formData.igf_decl_inr_confirmation;
        if (!decl1 || !decl2) {
            // Scroll declaration section into view
            const declSection = document.getElementById('igf-declaration-section');
            declSection?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            alert(
                'Please accept both declarations before saving:\n\n' +
                (!decl1 ? '• Declaration text must be acknowledged\n' : '') +
                (!decl2 ? '• INR confirmation must be acknowledged' : '')
            );
            return;
        }

        if (isSavingRef.current) {
            console.warn("[SAVE] BLOCKED — save already in progress");
            return;
        }

        const saveId = Date.now();
        console.log(`[SAVE #${saveId}] handleSave ENTERED`, {
            savedDocNameRef: savedDocNameRef.current,
            editDocName,
            savedDocName,
            isSavingRef: isSavingRef.current,
        });

        isSavingRef.current = true;
        setIsSaving(true);
        try {
            const currentDocName = savedDocNameRef.current || editDocName || savedDocName;

            // Log raw formData file fields before conversion
            const rawFileFields = Object.entries(formData).filter(([, v]) => v instanceof File);
            console.log(`[SAVE #${saveId}] Raw File fields in formData:`, rawFileFields.map(([k, v]) => ({ field: k, name: (v as File).name, size: (v as File).size, type: (v as File).type })));

            // Use prepareFormDataForApi — converts all File objects (including table rows) to base64 in-place
            const cleanData = await prepareFormDataForApi({ ...formData });
            if (currentDocName) cleanData.name = currentDocName;

            // Extract top-level file fields into a separate `files` array for the new backend API.
            // Any field whose value is { file_name, file_data } was a File upload — pull it out
            // and strip it from cleanData so the backend receives files via the dedicated parameter.
            const filesArray: Array<{ file_name: string; file_data: string }> = [];
            for (const key of Object.keys(cleanData)) {
                const val = cleanData[key];
                if (
                    val &&
                    typeof val === "object" &&
                    !Array.isArray(val) &&
                    typeof (val as any).file_name === "string" &&
                    typeof (val as any).file_data === "string"
                ) {
                    const fileVal = val as { file_name: string; file_data: string };
                    console.log(`[SAVE #${saveId}] Extracted file from field "${key}":`, { file_name: fileVal.file_name, file_data_length: fileVal.file_data.length, file_data_prefix: fileVal.file_data.slice(0, 50) });
                    filesArray.push(fileVal);
                    delete cleanData[key];
                }
            }

            console.log(`[SAVE #${saveId}] filesArray built:`, filesArray.map((f) => ({ file_name: f.file_name, file_data_length: f.file_data.length })));
            console.log(`[SAVE #${saveId}] cleanData keys:`, Object.keys(cleanData));

            const callArgs: Record<string, string> = { data: JSON.stringify(cleanData) };
            if (filesArray.length > 0) {
                callArgs.files = JSON.stringify(filesArray);
            }

            console.log(`[SAVE #${saveId}] Calling saveForm with args:`, { data_length: callArgs.data.length, files: callArgs.files ? `${filesArray.length} file(s)` : "none" });

            const res = await saveForm(callArgs);
            console.log(`[SAVE #${saveId}] saveForm response:`, res);

            if (res?.message?.status === "success") {
                const docname = res.message.docname || currentDocName;
                if (docname) {
                    savedDocNameRef.current = docname;
                    setSavedDocName(docname);
                }
                if (docname && !currentDocName) {
                    navigate(`/indent-general-form/${docname}`, { replace: true });
                } else if (docname) {
                    await fetchWorkflowActions(docname);
                }
                // Show submit confirmation modal instead of alert
                setShowSubmitModal(true);
            } else {
                throw new Error(res?.message?.message || "Save failed");
            }
        } catch (err: any) {
            console.error("Save error:", err);
            setErrorModal({ open: true, title: "Save Failed", message: parseFrappeError(err) });
        } finally {
            isSavingRef.current = false;
            setIsSaving(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, editDocName, savedDocName, saveForm, fetchWorkflowActions, navigate]);

    const handlePerformAction = async (action: string) => {
        const docname = savedDocNameRef.current || savedDocName;
        if (!docname) {
            alert("Please save the form first before performing workflow actions.");
            return;
        }
        setShowSubmitModal(false);
        setIsActionLoading(true);
        try {
            await performActionCall({ docname, action });
            navigate(`/indent-general-form-details/${docname}`);
        } catch (err: any) {
            console.error("Action error:", err);
            setErrorModal({ open: true, title: "Action Failed", message: parseFrappeError(err) });
        } finally {
            setIsActionLoading(false);
        }
    };

    const isReadOnly = docStatus === 1 || docStatus === 2;
    const effectiveFields = getEffectiveFields(fields, formData);

    const commonRendererProps = {
        formData,
        linkOptions,
        onChange: handleChange,
        onFileChange: handleFileChange,
        onTableRowChange: handleTableRowChange,
        onTableFileChange: handleTableRowChange,
        onAddTableRow: handleAddTableRow,
        onDeleteTableRow: handleDeleteTableRow,
        hideSectionHeaders: true,
        hideTableLabels: true,
    };

    if (loading) return <GlobalLoader isLoading={true} />;

    return (
        <div className="bg-claude-bg dark:bg-zinc-900 min-h-screen">
            {/* Full-page blocking overlay during save — prevents any pointer event from reaching buttons */}
            {isSaving && <div className="fixed inset-0 z-[99] cursor-wait" aria-hidden="true" />}
            <GlobalLoader isLoading={isSaving} />
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <PageHeader
                    title="Indent General Form"
                    status={workflowState}
                    projectName={projectTitleParam || projectNoParam}
                    projectNumber={projectNoParam}
                >
                    {!isReadOnly && (
                        <FrappeButton
                            onClick={handleSave}
                            disabled={isSaving || isActionLoading}
                            className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? "Saving..." : "Save Draft"}
                        </FrappeButton>
                    )}
                    {/* Submit actions only available after the doc has been saved */}
                    {savedDocName && availableActions.map((action) => (
                        <FrappeButton
                            key={action}
                            onClick={() => handlePerformAction(action)}
                            disabled={isSaving || isActionLoading}
                            className="bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm"
                        >
                            <Send className="w-4 h-4" />
                            {isActionLoading ? "Processing..." : action}
                        </FrappeButton>
                    ))}
                    {isReadOnly && availableActions.length === 0 && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {workflowState}
                        </span>
                    )}
                </PageHeader>

                {/* Submit confirmation modal — shown after a successful save */}
                {showSubmitModal && (
                    <SubmitConfirmModal
                        onSubmit={() => handlePerformAction("Submit")}
                        onDismiss={() => setShowSubmitModal(false)}
                        isLoading={isActionLoading}
                    />
                )}

                <div className="mt-6 space-y-5">
                    {/* Indenter & Project Details */}
                    <GroupCard label="Purchase General Form — Indenter &amp; Project Details">
                        <DynamicFormRenderer
                            fields={effectiveFields.filter((f) =>
                                [
                                    "igf_purchase_general_form",
                                    "igf_indenter_details",
                                    "igf_webmail_id",
                                    "igf_indenter",
                                    "igf_indenter_designation",
                                    "igf_webmail_user_id",
                                    "igf_employee_code",
                                    "section_break_nvnk",
                                    "igf_project_details",
                                    "igf_project_title",
                                    "igf_project_code",
                                    "igf_account_head",
                                    "budget_head",
                                    "igf_department_centre_section",
                                ].includes(f.fieldname),
                            )}
                            {...commonRendererProps}
                        />
                    </GroupCard>

                    {/* Items Table */}
                    <GroupCard label="Details of Items to be Purchased">
                        <DynamicFormRenderer
                            fields={effectiveFields.filter((f) =>
                                [
                                    "details_of_items_to_be_purchased_section",
                                    "igf_items",
                                    "igf_total_estimate",
                                    "igf_sanctioned_by_agency",
                                ].includes(f.fieldname),
                            )}
                            {...commonRendererProps}
                        />
                    </GroupCard>

                    {/* Vendors Table — only shown when the table field is actually visible */}
                    {effectiveFields.some(
                        (f) =>
                            ["igf_details_of_vendors", "igf_vendors"].includes(f.fieldname) &&
                            !f.hidden &&
                            isFieldVisible(f, formData),
                    ) && (
                            <GroupCard label="Details of Vendors">
                                <DynamicFormRenderer
                                    fields={effectiveFields.filter((f) =>
                                        [
                                            "igf_details_of_vendors",
                                            "igf_vendors",
                                        ].includes(f.fieldname),
                                    )}
                                    {...commonRendererProps}
                                />
                            </GroupCard>
                        )}

                    {/* Purchase Committee */}
                    <GroupCard label="Purchase Committee (Minimum 3 Members)">
                        <DynamicFormRenderer
                            fields={effectiveFields.filter((f) =>
                                [
                                    "igf_purchase_committee",
                                    "igf_committee_members",
                                    "igf_committee_note",
                                ].includes(f.fieldname),
                            )}
                            {...commonRendererProps}
                        />
                        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                            <strong>*Note:</strong> If the member is from outside, provide their full email. Otherwise
                            provide the webmail ID excluding <code>@iitg.ac.in</code>.
                        </p>
                    </GroupCard>

                    {/* Tender Details */}
                    <GroupCard label="Tender Details">
                        <DynamicFormRenderer
                            fields={effectiveFields.filter((f) =>
                                [
                                    "igf_tender_details",
                                    "igf_tender_type",
                                    "igf_number_of_bids",
                                ].includes(f.fieldname),
                            )}
                            {...commonRendererProps}
                        />
                    </GroupCard>

                    {/* File Upload */}
                    <GroupCard label="File Upload Section">
                        <DynamicFormRenderer
                            fields={effectiveFields.filter((f) =>
                                [
                                    "igf_file_upload_section",
                                    "igf_upload_detailed_specification",
                                    "igf_upload_vendor_list",
                                ].includes(f.fieldname),
                            )}
                            {...commonRendererProps}
                        />
                    </GroupCard>

                    {/* Declaration */}
                    <div id="igf-declaration-section">
                        <GroupCard label="Declaration">
                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                    For non-sanctioned items, the PI will be responsible for any financial obligations that may arise.
                                    All prices / amounts mentioned in the form are in Indian Rupee (INR).
                                </p>
                            </div>
                            <DynamicFormRenderer
                                fields={effectiveFields.filter((f) =>
                                    [
                                        "igf_declaration_section",
                                        "igf_declaration_text",
                                        "igf_decl_inr_confirmation",
                                    ].includes(f.fieldname),
                                )}
                                {...commonRendererProps}
                            />
                        </GroupCard>
                    </div>

                </div>

                {/* Bottom action bar */}
                {!isReadOnly && (
                    <div className="mt-8 flex justify-end gap-3 pb-8">
                        <FrappeButton
                            onClick={() => navigate(-1)}
                            className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </FrappeButton>
                        <FrappeButton
                            onClick={handleSave}
                            disabled={isSaving || isActionLoading}
                            className="bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 shadow-sm"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? "Saving..." : "Save Draft"}
                        </FrappeButton>
                        {/* Submit actions only available after the doc has been saved */}
                        {savedDocName && availableActions.map((action) => (
                            <FrappeButton
                                key={action}
                                onClick={() => handlePerformAction(action)}
                                disabled={isSaving || isActionLoading}
                                className="bg-[#D97757] text-white hover:bg-[#c66a4e] shadow-sm"
                            >
                                <Send className="w-4 h-4" />
                                {isActionLoading ? "Processing..." : action}
                            </FrappeButton>
                        ))}
                    </div>
                )}
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

export default IndentGeneralForm;
