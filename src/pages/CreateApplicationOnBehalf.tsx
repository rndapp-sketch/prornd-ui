import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDocList, useFrappePostCall } from "frappe-react-sdk";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Send, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FormSelect } from "@/components/FormSelect";
import { delegateUserAPI } from "@/services/apiService";
import { DELEGABLE_APPLICATION_DOCTYPES } from "@/utils/applicationRoutes";
import { getApplicationRoute } from "@/utils/applicationRoutes";
import { DynamicFormRenderer, type FormField, type LinkOption } from "@/components/forms/DynamicFormRenderer";

interface ReceivedDelegation {
    name: string;
    delegator_user: string;
    delegation_type?: string;
    scope_type?: "all" | "project" | "application";
    delegator_user_name?: string;
    // get_received_delegations returns resolved projects; "Specific Application" also lists the types allowed
    project_names?: Project[];
    allowed_doctypes?: string[];
    valid_from?: string;
    valid_to?: string;
}

interface Project {
    name: string;
    project_title?: string;
    project_no?: string;
}

interface FormDataResponse {
    message: {
        fields: FormField[];
        link_options: Record<string, LinkOption[]>;
        prefill_data: Record<string, any>;
        child_table_fields?: Record<string, any[]>;
    };
}

const cardClasses =
    "rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm";

const parseDelegationDateTime = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isDelegationWithinDateRange = (delegation: ReceivedDelegation, now = new Date()) => {
    const validFrom = parseDelegationDateTime(delegation.valid_from);
    const validTo = parseDelegationDateTime(delegation.valid_to);
    if (validFrom && validFrom > now) return false;
    if (validTo && validTo < now) return false;
    return true;
};

const getErrorMessage = (error: any, fallback: string) =>
    error?._server_messages || error?.exception || error?.message || error?.response?.data?.exception || fallback;

/** useFrappePostCall binds its method at hook-creation time, but here the method varies
 * per selected doctype — so this calls Frappe's whitelisted-method endpoint directly. */
const callFrappeMethod = async (method: string, params: Record<string, any> = {}) => {
    const csrfToken = (window as any).csrf_token || "";
    const res = await fetch(`${FRAPPE_BASE_URL}/api/method/${method}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Frappe-CSRF-Token": csrfToken,
        },
        credentials: "include",
        body: JSON.stringify(params),
    });
    const json = await res.json();
    if (!res.ok) {
        throw new Error(json?.message?.message || json?.exception || `Request failed (${res.status})`);
    }
    return json;
};

const CreateApplicationOnBehalf: React.FC<{ hideHeader?: boolean }> = ({ hideHeader }) => {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();

    // Selected by delegation row: one delegator can have more than one (e.g. View and Edit plus Specific Application)
    const [selectedDelegationName, setSelectedDelegationName] = React.useState("");
    const [selectedDoctype, setSelectedDoctype] = React.useState("");
    const [selectedProjectName, setSelectedProjectName] = React.useState("");
    const [fields, setFields] = React.useState<FormField[]>([]);
    const [linkOptions, setLinkOptions] = React.useState<Record<string, LinkOption[]>>({});
    const [formData, setFormData] = React.useState<Record<string, any>>({});
    const [fieldsLoading, setFieldsLoading] = React.useState(false);
    const [fieldsError, setFieldsError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [submitError, setSubmitError] = React.useState<string | null>(null);
    const [createdMessage, setCreatedMessage] = React.useState<string | null>(null);

    const { call: createOnBehalf } = useFrappePostCall<{ message: { status: string; name: string } }>(
        delegateUserAPI.createOnBehalf,
    );

    const [receivedDelegations, setReceivedDelegations] = React.useState<ReceivedDelegation[]>([]);
    const [delegationsLoading, setDelegationsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!currentUser) return;
        let cancelled = false;
        setDelegationsLoading(true);
        callFrappeMethod(delegateUserAPI.getReceivedDelegations, {})
            .then((res) => !cancelled && setReceivedDelegations(Array.isArray(res?.message) ? res.message : []))
            .catch(() => !cancelled && setReceivedDelegations([]))
            .finally(() => !cancelled && setDelegationsLoading(false));
        return () => {
            cancelled = true;
        };
    }, [currentUser]);

    const usableDelegations = React.useMemo(() => {
        const now = new Date();
        return receivedDelegations.filter(
            (d) =>
                ["View and Edit", "Workflow Action", "Specific Application"].includes(d.delegation_type || "") &&
                isDelegationWithinDateRange(d, now),
        );
    }, [receivedDelegations]);

    const selectedDelegation = React.useMemo(
        () => usableDelegations.find((d) => d.name === selectedDelegationName) || null,
        [usableDelegations, selectedDelegationName],
    );
    const selectedDelegator = selectedDelegation?.delegator_user || "";
    const isSpecificApplication = selectedDelegation?.delegation_type === "Specific Application";

    const delegationProjectNames = React.useMemo(
        () => (selectedDelegation && !isSpecificApplication && Array.isArray(selectedDelegation.project_names) ? selectedDelegation.project_names.map((p) => p.name) : []),
        [selectedDelegation, isSpecificApplication],
    );

    // Projects for scope_type='project' — resolved directly from the delegation row.
    const { data: scopedProjects } = useFrappeGetDocList<Project>("Project Registration", {
        fields: ["name", "project_title", "project_no"],
        filters: delegationProjectNames.length ? [["name", "in", delegationProjectNames]] : [["name", "=", "NON_EXISTENT_DOC"]],
        limit: 1000,
    });

    // Projects for scope_type='all' — the delegator's own projects (visible to us via the 'all' delegation).
    const { data: delegatorOwnedProjects } = useFrappeGetDocList<Project>("Project Registration", {
        fields: ["name", "project_title", "project_no"],
        filters:
            selectedDelegation?.scope_type === "all" && !isSpecificApplication && selectedDelegator
                ? [["pi_webmail", "=", selectedDelegator]]
                : [["name", "=", "NON_EXISTENT_DOC"]],
        limit: 1000,
    });

    // Specific Application: the delegator's chosen projects come with the delegation (the delegate cannot read them directly)
    const projectOptions = isSpecificApplication
        ? Array.isArray(selectedDelegation?.project_names) ? selectedDelegation!.project_names! : []
        : selectedDelegation?.scope_type === "all" ? delegatorOwnedProjects ?? [] : scopedProjects ?? [];

    const allowedDoctypes = React.useMemo(() => {
        if (!selectedDelegation) return [];
        if (isSpecificApplication) {
            const allowed = new Set(selectedDelegation.allowed_doctypes ?? []);
            return DELEGABLE_APPLICATION_DOCTYPES.filter((d) => allowed.has(d.doctype));
        }
        if (selectedDelegation.scope_type === "application") return [];
        if (selectedDelegation.scope_type === "project") {
            return DELEGABLE_APPLICATION_DOCTYPES.filter((d) => !!d.projectField);
        }
        return DELEGABLE_APPLICATION_DOCTYPES;
    }, [selectedDelegation, isSpecificApplication]);

    const selectedDoctypeMeta = React.useMemo(
        () => allowedDoctypes.find((d) => d.doctype === selectedDoctype) || null,
        [allowedDoctypes, selectedDoctype],
    );

    // Specific Application always needs a project: the server fills the project fields of every type from it
    const requiresProject = isSpecificApplication ? !!selectedDoctypeMeta : !!selectedDoctypeMeta?.projectField;

    React.useEffect(() => {
        setSelectedDoctype("");
        setSelectedProjectName("");
        setFields([]);
        setFormData({});
    }, [selectedDelegationName]);

    // The chosen project is tracked separately (selectedProjectName) and
    // excluded from the rendered/submitted fields — it's sent to the backend
    // as its own `project_name` param, which sets the doctype's project link
    // field server-side. But DynamicFormRenderer's depends_on/mandatory_depends_on
    // evaluation (and any field whose Link options are scoped to the project,
    // e.g. account head) reads off `formData`, which never otherwise contains
    // this value under the doctype's real field name — so project-dependent
    // fields silently stayed hidden or unresolved. Mirror it into formData too.
    React.useEffect(() => {
        if (!selectedDoctypeMeta?.projectField) return;
        setFormData((prev) => ({ ...prev, [selectedDoctypeMeta.projectField as string]: selectedProjectName }));
    }, [selectedProjectName, selectedDoctypeMeta]);

    React.useEffect(() => {
        setSelectedProjectName("");
        setFields([]);
        setFormData({});
        setFieldsError(null);

        if (!selectedDoctypeMeta) return;

        let cancelled = false;
        setFieldsLoading(true);
        callFrappeMethod(selectedDoctypeMeta.getFieldsMethod, {})
            .then((res: FormDataResponse) => {
                if (cancelled) return;
                const message = res?.message;
                if (!message) {
                    setFieldsError("Unable to load fields for this application type.");
                    return;
                }
                const { fields: apiFields, link_options, prefill_data, child_table_fields } = message;
                const enhancedFields = (apiFields || []).map((field: FormField) => {
                    if (field.fieldtype === "Table" && child_table_fields?.[field.fieldname]) {
                        return { ...field, child_fields: child_table_fields[field.fieldname] };
                    }
                    return field;
                });
                setFields(enhancedFields);
                setLinkOptions(link_options || {});
                setFormData(prefill_data || {});
            })
            .catch(() => {
                if (!cancelled) setFieldsError("Unable to load fields for this application type automatically.");
            })
            .finally(() => {
                if (!cancelled) setFieldsLoading(false);
            });

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDoctypeMeta?.doctype]);

    const renderableFields = React.useMemo(() => {
        if (!selectedDoctypeMeta) return [];
        return fields.filter(
            (f) =>
                f.fieldname !== selectedDoctypeMeta.projectField &&
                f.fieldname !== selectedDoctypeMeta.ownerField &&
                !selectedDoctypeMeta.serverFilledProjectFields?.includes(f.fieldname) &&
                f.fieldtype !== "Attach" &&
                f.fieldtype !== "Attach Image",
        );
    }, [fields, selectedDoctypeMeta]);

    const handleChange = React.useCallback((fieldname: string, value: any) => {
        setFormData((prev) => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleFileChange = React.useCallback((fieldname: string, file: File | null) => {
        setFormData((prev) => ({ ...prev, [fieldname]: file }));
    }, []);

    const handleTableRowChange = React.useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData((prev) => {
            const tableData = Array.isArray(prev[tableName]) ? [...prev[tableName]] : [];
            tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: value };
            return { ...prev, [tableName]: tableData };
        });
    }, []);

    const handleAddTableRow = React.useCallback((tableName: string, newRow: Record<string, any>) => {
        setFormData((prev) => ({
            ...prev,
            [tableName]: [...(Array.isArray(prev[tableName]) ? prev[tableName] : []), newRow],
        }));
    }, []);

    const handleDeleteTableRow = React.useCallback((tableName: string, rowIndex: number) => {
        setFormData((prev) => {
            const tableData = Array.isArray(prev[tableName]) ? [...prev[tableName]] : [];
            tableData.splice(rowIndex, 1);
            return { ...prev, [tableName]: tableData };
        });
    }, []);

    const canSubmit =
        !!selectedDelegation && !!selectedDoctypeMeta && (!requiresProject || !!selectedProjectName) && !fieldsLoading;

    const handleSubmit = async () => {
        if (!selectedDoctypeMeta) return;
        setSubmitting(true);
        setSubmitError(null);
        setCreatedMessage(null);
        try {
            const payloadFields: Record<string, any> = {};
            renderableFields.forEach((field) => {
                if (formData[field.fieldname] !== undefined) {
                    payloadFields[field.fieldname] = formData[field.fieldname];
                }
            });

            const res = await createOnBehalf({
                doctype: selectedDoctypeMeta.doctype,
                delegator_user: selectedDelegator,
                project_name: requiresProject ? selectedProjectName : undefined,
                fields: JSON.stringify(payloadFields),
            });

            if (res?.message?.status === "success" && res.message.name && isSpecificApplication) {
                // The delegate cannot open a document created under this type: it now sits with the delegator as a draft
                setCreatedMessage(`${selectedDoctypeMeta.doctype} ${res.message.name} was created for ${selectedDelegator}. They can open it from their Drafts.`);
                setSelectedDoctype("");
            } else if (res?.message?.status === "success" && res.message.name) {
                navigate(getApplicationRoute(selectedDoctypeMeta.doctype, res.message.name));
            } else {
                throw new Error("Create failed.");
            }
        } catch (e: any) {
            setSubmitError(getErrorMessage(e, "Failed to create the application on behalf of this user."));
        } finally {
            setSubmitting(false);
        }
    };

    if (delegationsLoading) {
        return (
            <div className="flex min-h-[55vh] items-center justify-center">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#4A6CF7]" />
                    Loading...
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {!hideHeader && (
            <header className={cn(cardClasses, "overflow-hidden")}>
                <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                <div className="p-5">
                    <div className="mb-2 flex items-center gap-2">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] dark:bg-[#4A6CF7]/15">
                            <FileText className="h-4 w-4 text-[#4A6CF7] dark:text-[#93C5FD]" />
                        </span>
                        <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#D97757]">Delegation</span>
                    </div>
                    <h1 className="text-[22px] font-extrabold tracking-normal text-[#18181B] dark:text-[#E4E4E7]">
                        Create Application On Behalf
                    </h1>
                    <p className="mt-1 max-w-3xl text-[13px] font-medium leading-6 text-[#71717A] dark:text-[#A1A1AA]">
                        Create a new application for someone who has delegated View and Edit, Workflow Action or Specific Application access to you.
                        The application is attributed to them, not you.
                    </p>
                </div>
            </header>
            )}

            {usableDelegations.length === 0 ? (
                <div className={cn(cardClasses, "p-6 text-center")}>
                    <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-[#A1A1AA]" />
                    <p className="text-[13px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                        No one has delegated "View and Edit", "Workflow Action" or "Specific Application" access to you yet.
                    </p>
                </div>
            ) : (
                <div className={cn(cardClasses, "space-y-5 p-5")}>
                    {/* Step 1 — delegator */}
                    <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#D4D4D8]">
                            <UserCircle2 className="h-3.5 w-3.5 text-[#4A6CF7]" />
                            Step 1 — Create on behalf of
                        </label>
                        <div className="w-full max-w-md">
                            <FormSelect value={selectedDelegationName}
                                onChange={(e) => setSelectedDelegationName(e.target.value)}
                            >
                                <option value="">Select a delegator...</option>
                                {usableDelegations.map((d) => (
                                    <option key={d.name} value={d.name}>
                                        {d.delegator_user_name || d.delegator_user} ({d.delegation_type === "Specific Application" ? "specific applications" : `${d.scope_type || "all"} scope, ${d.delegation_type}`})
                                    </option>
                                ))}
                            </FormSelect>
                        </div>
                    </div>

                    {selectedDelegation?.scope_type === "application" && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-400">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            This delegation is scoped to specific pre-existing applications only — it does not cover creating
                            new ones. Ask {selectedDelegator} for an "all" or "project" scoped delegation instead.
                        </div>
                    )}

                    {/* Step 2 — doctype */}
                    {selectedDelegation && selectedDelegation.scope_type !== "application" && (
                        <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#D4D4D8]">
                                Step 2 — Application type
                            </label>
                            <div className="w-full max-w-md">
                                <FormSelect value={selectedDoctype}
                                    onChange={(e) => setSelectedDoctype(e.target.value)}
                                >
                                    <option value="">Select an application type...</option>
                                    {allowedDoctypes.map((d) => (
                                        <option key={d.doctype} value={d.doctype}>
                                            {d.doctype}
                                        </option>
                                    ))}
                                </FormSelect>
                            </div>
                            {isSpecificApplication ? (
                                <p className="mt-1.5 text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                    Only the application types {selectedDelegator} allowed for you are shown.
                                </p>
                            ) : selectedDelegation.scope_type === "project" && (
                                <p className="mt-1.5 text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                    Only application types tied to a project are shown — this delegation is project-scoped.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Step 3 — project */}
                    {requiresProject && (
                        <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#D4D4D8]">
                                Step 3 — Project
                            </label>
                            <div className="w-full max-w-md">
                                <FormSelect value={selectedProjectName}
                                    onChange={(e) => setSelectedProjectName(e.target.value)}
                                >
                                    <option value="">Select a project...</option>
                                    {projectOptions.map((p) => (
                                        <option key={p.name} value={p.name}>
                                            {p.project_title || p.name} ({p.project_no || p.name})
                                        </option>
                                    ))}
                                </FormSelect>
                            </div>
                            {projectOptions.length === 0 && (
                                <p className="mt-1.5 text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                    No projects found for this delegator.
                                </p>
                            )}
                        </div>
                    )}

                    {/* Step 4 — form fields */}
                    {selectedDoctypeMeta && (!requiresProject || selectedProjectName) && (
                        <div className="border-t border-[#E4E4E7] pt-5 dark:border-[#3F3F46]">
                            <label className="mb-3 block text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#D4D4D8]">
                                Step 4 — Application details
                            </label>

                            {fieldsLoading ? (
                                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                    <Loader2 className="h-4 w-4 animate-spin text-[#4A6CF7]" />
                                    Loading form fields...
                                </div>
                            ) : fieldsError ? (
                                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                                    {fieldsError}
                                </div>
                            ) : (
                                <>
                                    <p className="mb-3 text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                        File attachments aren't supported in this on-behalf flow yet — leave those fields
                                        out and attach them later on the created document.
                                    </p>
                                    <DynamicFormRenderer
                                        fields={renderableFields}
                                        formData={formData}
                                        linkOptions={linkOptions}
                                        onChange={handleChange}
                                        onFileChange={handleFileChange}
                                        onTableRowChange={handleTableRowChange}
                                        onTableFileChange={handleTableRowChange}
                                        onAddTableRow={handleAddTableRow}
                                        onDeleteTableRow={handleDeleteTableRow}
                                    />
                                </>
                            )}
                        </div>
                    )}

                    {createdMessage && (
                        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[12px] font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            {createdMessage}
                        </div>
                    )}

                    {submitError && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                            {submitError}
                        </div>
                    )}

                    {selectedDoctypeMeta && (!requiresProject || selectedProjectName) && !fieldsError && (
                        <div className="flex justify-end border-t border-[#E4E4E7] pt-4 dark:border-[#3F3F46]">
                            <button
                                onClick={handleSubmit}
                                disabled={!canSubmit || submitting}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4A6CF7] px-4 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-[#3558E8] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                Create for {selectedDelegator}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CreateApplicationOnBehalf;
