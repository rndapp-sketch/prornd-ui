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
import { indentGeneralFormAPI, fileToBase64, commonAPI, prepareFormDataForApi } from "@/services/apiService";
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
            <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
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
            if (res?.message?.status === "success") {
                setAvailableActions(res.message.actions || []);
            }
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
                // Fetch budget heads and form fields in parallel
                const [res, budgetHeadRes] = await Promise.all([
                    fetchFields({ doc_name: editDocName || null }),
                    fetch('/api/v2/document/Budget%20Head?fields=["name","budget_head"]&order_by=budget_head asc', {
                        credentials: "include",
                        headers: { Accept: "application/json" },
                    }).then((r) => r.json()).catch(() => ({ data: [] })),
                ]);

                if (!res?.message) return;

                const budgetHeadOptions: LinkOption[] = (budgetHeadRes?.data || []).map((h: any) => ({
                    value: h.budget_head || h.name,
                    label: h.budget_head || h.name,
                }));

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
            setFormData((prev) => {
                const tableData = Array.isArray(prev[tableName]) ? [...prev[tableName]] : [];
                tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: value };
                return applyClientScript({ ...prev, [tableName]: tableData });
            });
        },
        [applyClientScript],
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
            // Read from ref — always current even before React re-renders with new state
            // The document name mechanism (fallback from ref -> URL edit parameter -> state)
            const currentDocName = savedDocNameRef.current || editDocName || savedDocName;

            // Restore the specific legacy payload generator designed for this form's endpoint
            const FILE_FIELDS = ["igf_upload_detailed_specification", "igf_upload_vendor_list"] as const;
            const cleanData: Record<string, any> = { ...formData };
            if (currentDocName) cleanData.name = currentDocName;

            const fileArgs: Record<string, string> = {};
            for (const fieldname of FILE_FIELDS) {
                const val = formData[fieldname];
                if (val instanceof File) {
                    const b64 = await fileToBase64(val);
                    fileArgs[fieldname] = JSON.stringify(b64);
                    delete cleanData[fieldname];
                }
            }

            console.log(`[SAVE #${saveId}] calling saveForm with doc name:`, currentDocName);
            const res = await saveForm({
                data: JSON.stringify(cleanData),
                file: fileArgs["igf_upload_detailed_specification"] || fileArgs["igf_upload_vendor_list"] || undefined, // Map one of the uploads to the backend's `file=None` parameter
                ...fileArgs
            });
            console.log(`[SAVE #${saveId}] response:`, res);

            if (res?.message?.status === "success") {
                const docname = res.message.docname || currentDocName;
                // Update ref IMMEDIATELY before any alert/navigate so any retry uses the correct name
                if (docname) {
                    savedDocNameRef.current = docname;
                    setSavedDocName(docname);
                }
                alert("Draft saved successfully!");
                if (docname && !currentDocName) {
                    navigate(`/indent-general-form?edit=${docname}`, { replace: true });
                } else if (docname) {
                    await fetchWorkflowActions(docname);
                }
            } else {
                throw new Error(res?.message?.message || "Save failed");
            }
        } catch (err: any) {
            console.error(`[SAVE #${saveId}] Error:`, err);
            const errMsg = err.exc_type === "ValidationError" 
                ? JSON.parse(err._server_messages || "[]").map((m: string) => JSON.parse(m).message).join(", ")
                : err.message || "Unknown error";
            alert(`Save failed: ${errMsg}`);
        } finally {
            console.log(`[SAVE #${saveId}] FINALLY — releasing lock`);
            isSavingRef.current = false;
            setIsSaving(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, editDocName, savedDocName, saveForm, fetchWorkflowActions, navigate]);

    const handlePerformAction = async (action: string) => {
        const docname = savedDocName;
        if (!docname) {
            alert("Please save the form first before performing workflow actions.");
            return;
        }
        setIsActionLoading(true);
        try {
            const res = await performActionCall({ docname, action });
            if (res?.message?.status === "success") {
                const newState = res.message.workflow_state || workflowState;
                setWorkflowState(newState);
                setDocStatus(res.message.docstatus ?? docStatus);
                setAvailableActions(res.message.next_actions || []);
                alert(`Action "${action}" completed successfully!`);
                navigate(`/indent-general-form/${docname}`);
            } else {
                throw new Error(res?.message?.message || "Action failed");
            }
        } catch (err: any) {
            alert(`Action failed: ${err.message || "Unknown error"}`);
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
                    {availableActions.map((action) => (
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
                        {availableActions.map((action) => (
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
        </div>
    );
};

export default IndentGeneralForm;
