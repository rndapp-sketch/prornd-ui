import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import React from "react";
import { GlobalLoader } from "@/components/ui/global-loader";
import { useFrappeAuth, useFrappeGetDocList, useFrappePostCall } from "frappe-react-sdk";
import {
    CheckCircle2,
    Clock,
    FileText,
    FolderKanban,
    Loader2,
    Plus,
    Search,
    ShieldCheck,
    Trash2,
    UserCheck,
    Users,
    X,
} from "lucide-react";
import { delegateUserAPI } from "@/services/apiService";
import { AutocompleteEmail } from "@/components/AutocompleteEmail";
import { cn } from "@/lib/utils";
import { DELEGABLE_APPLICATION_DOCTYPES } from "@/utils/applicationRoutes";
import { usePiLedgerData } from "@/hooks/usePiLedgerSummary";
import { FormSelect } from "@/components/FormSelect";
import "@/pages/dashboards/projectStaffDashboard.css";
import { useSearchParams } from "react-router-dom";
import RoleDelegation from "@/pages/RoleDelegation";
import { useActingProfile } from "@/hooks/useActingProfile";

type DelegateUserOption = {
    label: string;
    value: string;
    full_name?: string;
    email?: string;
};

type DelegationProject = {
    name: string;
    project_title?: string;
    project_no?: string;
    workflow_state?: string;
    pi_webmail?: string;
    owner?: string;
};

type DelegationApplication = {
    doctype: string;
    name: string;
    title?: string;
    project_name?: string;
    project_no?: string;
    workflow_state?: string;
    owner?: string;
};

type ActiveDelegation = {
    name: string;
    delegator_user?: string;
    delegate_user: string;
    delegate_user_name?: string;
    delegation_type?: string;
    scope_type?: "all" | "project" | "application";
    project_count?: number;
    application_count?: number;
    // getActiveDelegations returns already-parsed arrays; getDocList/REST
    // return the raw doctype field as a JSON-encoded string.
    project_names?: string | string[];
    applications?: string | DelegationApplication[];
    // Only for the "Specific Application" type: the doctypes the delegate may create
    allowed_doctypes?: string | string[];
    valid_from?: string;
    valid_to?: string;
    enabled?: number;
};

type ScopeResponse = {
    users?: DelegateUserOption[];
    projects?: DelegationProject[];
    applications?: DelegationApplication[];
};

const applicationKey = (app: DelegationApplication) => `${app.doctype}::${app.name}`;

const parseJsonApplicationArray = (raw?: string | DelegationApplication[]): DelegationApplication[] => {
    if (!raw) return [];
    try {
        // getActiveDelegations returns already-parsed arrays, while the raw
        // doctype field (via getDocList / REST) returns a JSON-encoded string.
        const parsed = Array.isArray(raw) ? raw : JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter(
                (value): value is DelegationApplication =>
                    !!value && typeof value === "object" && typeof value.doctype === "string" && typeof value.name === "string",
            )
            : [];
    } catch {
        return [];
    }
};

const removeFromJsonApplicationArray = (raw: string | DelegationApplication[] | undefined, target: DelegationApplication) =>
    JSON.stringify(
        parseJsonApplicationArray(raw).filter((item) => !(item.doctype === target.doctype && item.name === target.name)),
    );

const inputClasses =
    "h-10 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-3 text-[13px] font-medium text-[var(--psd-heading)] outline-none transition-colors focus:border-[var(--psd-primary)] focus:ring-[3px] focus:ring-[var(--psd-primary)]/15 placeholder:text-[var(--psd-muted)]";

const cardClasses =
    "psd-card !rounded-xl";

const parseJsonStringArray = (raw?: string | string[]): string[] => {
    if (!raw) return [];
    try {
        // getActiveDelegations returns already-parsed arrays, while the raw
        // doctype field (via getDocList / REST) returns a JSON-encoded string.
        const parsed = Array.isArray(raw) ? raw : JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [];
    } catch {
        return [];
    }
};

const removeFromJsonArray = (raw: string | string[] | undefined, value: string) =>
    JSON.stringify(parseJsonStringArray(raw).filter((item) => item !== value));

const toFrappeDateTime = (value: string) => {
    if (!value) return "";
    return value.replace("T", " ").length === 16 ? `${value.replace("T", " ")}:00` : value.replace("T", " ");
};

const formatDelegationDateTime = (value?: string) => {
    if (!value) return "";
    const parsed = new Date(value.replace(" ", "T"));
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const getErrorMessage = (error: any, fallback: string) =>
    error?._server_messages ||
    error?.exception ||
    error?.message ||
    error?.response?.data?.exception ||
    fallback;

const DelegateUserForm: React.FC = () => {
    const { currentUser } = useFrappeAuth();

    const { call: searchUsers } = useFrappePostCall<{ message: DelegateUserOption[] }>(delegateUserAPI.searchUsers);
    const { call: getScope } = useFrappePostCall<{ message: ScopeResponse }>(delegateUserAPI.getScope);
    const { call: getActiveDelegations } = useFrappePostCall<{ message: ActiveDelegation[] }>(delegateUserAPI.getActiveDelegations);
    const { call: delegateUser } = useFrappePostCall(delegateUserAPI.delegate);
    const { call: undelegateUser } = useFrappePostCall(delegateUserAPI.undelegate);
    const { call: updateDelegationField } = useFrappePostCall("frappe.client.set_value");

    const [userOptions, setUserOptions] = React.useState<DelegateUserOption[]>([]);
    const [delegateEmail, setDelegateEmail] = React.useState("");
    const [delegationType, setDelegationType] = React.useState<"View Only" | "View and Edit" | "Workflow Action" | "Specific Application">("View Only");
    const [scopeType, setScopeType] = React.useState<"all" | "project" | "application">("all");
    const [validFrom, setValidFrom] = React.useState("");
    const [validTo, setValidTo] = React.useState("");
    const [projects, setProjects] = React.useState<DelegationProject[]>([]);
    const [selectedProjects, setSelectedProjects] = React.useState<Set<string>>(new Set());
    const [selectedDoctypes, setSelectedDoctypes] = React.useState<Set<string>>(new Set());
    const [applications, setApplications] = React.useState<DelegationApplication[]>([]);
    const [selectedApplications, setSelectedApplications] = React.useState<Set<string>>(new Set());
    const [activeDelegations, setActiveDelegations] = React.useState<ActiveDelegation[]>([]);
    const [query, setQuery] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState<string | null>(null);
    const [activeDelegationDetails, setActiveDelegationDetails] = React.useState<Record<string, ActiveDelegation>>({});
    const [selectedDelegationName, setSelectedDelegationName] = React.useState<string | null>(null);

    const { data: activeDelegationDocs } = useFrappeGetDocList<ActiveDelegation>("User Delegation", {
        fields: [
            "name",
            "delegator_user",
            "delegate_user",
            "delegate_user_name",
            "delegation_type",
            "scope_type",
            "project_names",
            "applications",
            "valid_from",
            "valid_to",
            "enabled",
        ],
        filters: currentUser
            ? [
                ["delegator_user", "=", currentUser],
                ["enabled", "=", 1],
            ]
            : [["name", "=", "NON_EXISTENT_DOC"]],
        limit: 1000,
    });

    const loadPage = React.useCallback(async () => {
        if (!currentUser) return;
        setLoading(true);
        setError(null);
        try {
            const [scopeRes, activeRes, usersRes] = await Promise.all([
                getScope({}),
                getActiveDelegations({}),
                searchUsers({ query: "" }),
            ]);

            setProjects(scopeRes?.message?.projects || []);
            setApplications(scopeRes?.message?.applications || []);
            setActiveDelegations(activeRes?.message || []);
            setUserOptions(usersRes?.message || []);
        } catch (e: any) {
            setError(e?.message || "Unable to load delegation data. Please confirm backend delegation APIs are available.");
        } finally {
            setLoading(false);
        }
    }, [currentUser, getActiveDelegations, getScope, searchUsers]);

    React.useEffect(() => {
        loadPage();
    }, [loadPage]);

    React.useEffect(() => {
        let cancelled = false;

        const fetchDetails = async () => {
            if (!activeDelegations.length) {
                setActiveDelegationDetails({});
                return;
            }

            const detailEntries = await Promise.all(
                activeDelegations.map(async (delegation) => {
                    try {
                        const response = await fetch(
                            `${FRAPPE_BASE_URL}/api/resource/User%20Delegation/${encodeURIComponent(delegation.name)}`,
                            { credentials: "include" },
                        );
                        if (!response.ok) return [delegation.name, null] as const;
                        const result = await response.json();
                        return [delegation.name, result?.data || null] as const;
                    } catch {
                        return [delegation.name, null] as const;
                    }
                }),
            );

            if (cancelled) return;

            const next: Record<string, ActiveDelegation> = {};
            detailEntries.forEach(([name, detail]) => {
                if (detail) next[name] = detail as ActiveDelegation;
            });
            setActiveDelegationDetails(next);
        };

        fetchDetails();

        return () => {
            cancelled = true;
        };
    }, [activeDelegations]);

    const filteredProjects = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return projects;
        return projects.filter((project) =>
            [project.name, project.project_no, project.project_title, project.workflow_state]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q)),
        );
    }, [projects, query]);

    const isSpecificApplication = delegationType === "Specific Application";

    // Specific Application can only be tied to approved projects that have funds (read from the ledger)
    const { projects: ledgerProjects, isLoading: ledgerLoading } = usePiLedgerData(currentUser);
    const projectEligibility = React.useCallback(
        (project: DelegationProject): { ok: boolean; reason?: string } => {
            if (project.workflow_state !== "Approved") return { ok: false, reason: "Project is not approved" };
            if (ledgerLoading && !ledgerProjects) return { ok: false, reason: "Checking funds..." };
            const l = ledgerProjects?.find((x) => x.name === project.name);
            if (!l || l.failed) return { ok: false, reason: "Funds could not be checked" };
            if (!(l.commitable > 0 || l.actualBalance > 0)) return { ok: false, reason: "No funds available" };
            return { ok: true };
        },
        [ledgerProjects, ledgerLoading],
    );

    // Projects that count as selected (a project picked earlier may not qualify for Specific Application)
    const effectiveSelectedProjects = React.useMemo(
        () =>
            Array.from(selectedProjects).filter((name) => {
                if (!isSpecificApplication) return true;
                const project = projects.find((p) => p.name === name);
                return !!project && projectEligibility(project).ok;
            }),
        [selectedProjects, isSpecificApplication, projects, projectEligibility],
    );

    const selectedProjectCount = effectiveSelectedProjects.length;

    const filteredApplications = React.useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return applications;
        return applications.filter((app) =>
            [app.name, app.doctype, app.title, app.workflow_state, app.project_name, app.project_no]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(q)),
        );
    }, [applications, query]);

    const selectedApplicationCount = selectedApplications.size;

    const projectLookup = React.useMemo(() => {
        const map = new Map<string, DelegationProject>();
        projects.forEach((project) => map.set(project.name, project));
        return map;
    }, [projects]);

    const applicationLookup = React.useMemo(() => {
        const map = new Map<string, DelegationApplication>();
        applications.forEach((app) => map.set(applicationKey(app), app));
        return map;
    }, [applications]);

    const enrichedActiveDelegations = React.useMemo(() => {
        const docMap = new Map<string, ActiveDelegation>();
        (activeDelegationDocs ?? []).forEach((delegation) => docMap.set(delegation.name, delegation));

        return activeDelegations.map((delegation) => ({
            ...docMap.get(delegation.name),
            ...activeDelegationDetails[delegation.name],
            ...delegation,
            project_names:
                delegation.project_names ||
                activeDelegationDetails[delegation.name]?.project_names ||
                docMap.get(delegation.name)?.project_names,
            applications:
                delegation.applications ||
                activeDelegationDetails[delegation.name]?.applications ||
                docMap.get(delegation.name)?.applications,
        }));
    }, [activeDelegationDetails, activeDelegationDocs, activeDelegations]);

    const totalDelegatedProjects = React.useMemo(
        () => enrichedActiveDelegations.reduce((sum, delegation) => sum + parseJsonStringArray(delegation.project_names).length, 0),
        [enrichedActiveDelegations],
    );

    const totalDelegatedApplications = React.useMemo(
        () => enrichedActiveDelegations.reduce((sum, delegation) => sum + parseJsonApplicationArray(delegation.applications).length, 0),
        [enrichedActiveDelegations],
    );

    const selectedDelegation = React.useMemo(
        () => enrichedActiveDelegations.find((delegation) => delegation.name === selectedDelegationName) || null,
        [enrichedActiveDelegations, selectedDelegationName],
    );

    const toggleProject = (name: string) => {
        setSelectedProjects((prev) => {
            const next = new Set(prev);
            next.has(name) ? next.delete(name) : next.add(name);
            return next;
        });
    };

    const toggleApplication = (key: string) => {
        setSelectedApplications((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    // Specific Application needs a project and at least one application type before it can be delegated
    const specificApplicationIncomplete = isSpecificApplication && (selectedProjectCount === 0 || selectedDoctypes.size === 0);

    const toggleDoctype = (doctype: string) => {
        setSelectedDoctypes((prev) => {
            const next = new Set(prev);
            next.has(doctype) ? next.delete(doctype) : next.add(doctype);
            return next;
        });
    };

    const handleDelegate = async () => {
        if (!delegateEmail) {
            setError("Select a user to delegate to.");
            return;
        }
        if (delegateEmail === currentUser) {
            setError("You cannot delegate to yourself.");
            return;
        }
        if (scopeType === "project" && selectedProjectCount === 0) {
            setError("Select at least one project — scope is set to 'Selected Projects'.");
            return;
        }
        if (isSpecificApplication && selectedProjectCount === 0) {
            setError("Select at least one project the delegate may create applications under.");
            return;
        }
        if (isSpecificApplication && selectedDoctypes.size === 0) {
            setError("Select at least one application type the delegate may create.");
            return;
        }
        if (scopeType === "application" && selectedApplicationCount === 0) {
            setError("Select at least one application — scope is set to 'Selected Applications'.");
            return;
        }
        if (validFrom && validTo && new Date(validTo) < new Date(validFrom)) {
            setError("Valid to must be later than valid from.");
            return;
        }

        const existing = enrichedActiveDelegations.find((delegation) => delegation.delegate_user === delegateEmail);
        if (existing && existing.scope_type === "all" && scopeType !== "all") {
            const proceed = confirm(
                `This will restrict ${delegateEmail}'s access to only the selected ${scopeType === "project" ? "projects" : "applications"}. They will no longer see your other records. Continue?`,
            );
            if (!proceed) return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const selectedApplicationPayload = Array.from(selectedApplications)
                .map((key) => applicationLookup.get(key))
                .filter((app): app is DelegationApplication => !!app)
                .map((app) => ({ doctype: app.doctype, name: app.name }));

            await delegateUser({
                delegate_user: delegateEmail,
                delegation_type: delegationType,
                scope_type: scopeType,
                project_names: JSON.stringify(scopeType === "project" ? effectiveSelectedProjects : []),
                applications: JSON.stringify(scopeType === "application" ? selectedApplicationPayload : []),
                // Specific Application: the delegate can only create these types (no access to existing records)
                ...(isSpecificApplication ? { allowed_doctypes: JSON.stringify(Array.from(selectedDoctypes)) } : {}),
                valid_from: toFrappeDateTime(validFrom),
                valid_to: toFrappeDateTime(validTo),
            });
            setSuccess(`Delegation created for ${delegateEmail}.`);
            setDelegateEmail("");
            setValidFrom("");
            setValidTo("");
            setSelectedProjects(new Set());
            setSelectedApplications(new Set());
            setSelectedDoctypes(new Set());
            await loadPage();
        } catch (e: any) {
            setError(e?.message || "Failed to create delegation.");
        } finally {
            setSaving(false);
        }
    };

    const handleUndelegate = async (delegationName: string) => {
        if (!confirm("Remove this delegation?")) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await undelegateUser({ delegation_name: delegationName });
            setSuccess("Delegation removed.");
            await loadPage();
        } catch (e: any) {
            setError(e?.message || "Failed to remove delegation.");
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveDelegatedItem = async (delegationName: string, itemValue: string) => {
        if (!confirm(`Remove ${itemValue} from this delegation?`)) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const existing = enrichedActiveDelegations.find((delegation) => delegation.name === delegationName);
            if (!existing) {
                throw new Error("Delegation record is not loaded.");
            }

            const updatedValue = removeFromJsonArray(existing.project_names, itemValue);

            if (existing.delegation_type === "Specific Application") {
                // Goes through the API so the server keeps at least one project; delegation_type picks the right row
                await delegateUser({
                    delegate_user: existing.delegate_user,
                    delegation_type: "Specific Application",
                    remove_project_names: JSON.stringify([itemValue]),
                });
            } else {
                await updateDelegationField({
                    doctype: "User Delegation",
                    name: delegationName,
                    fieldname: "project_names",
                    value: updatedValue,
                });
            }
            setActiveDelegationDetails((prev) => {
                return {
                    ...prev,
                    [delegationName]: {
                        ...existing,
                        project_names: updatedValue,
                    },
                };
            });
            setSuccess(`${itemValue} removed from delegation.`);
            await loadPage();
        } catch (e: any) {
            setError(getErrorMessage(e, `Failed to remove ${itemValue}.`));
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveAllowedDoctype = async (delegationName: string, doctype: string) => {
        if (!confirm(`Stop allowing ${doctype} in this delegation?`)) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const existing = enrichedActiveDelegations.find((delegation) => delegation.name === delegationName);
            if (!existing) throw new Error("Delegation record is not loaded.");
            await delegateUser({
                delegate_user: existing.delegate_user,
                delegation_type: "Specific Application",
                remove_allowed_doctypes: JSON.stringify([doctype]),
            });
            setActiveDelegationDetails((prev) => ({
                ...prev,
                [delegationName]: {
                    ...existing,
                    allowed_doctypes: parseJsonStringArray(existing.allowed_doctypes).filter((d) => d !== doctype),
                },
            }));
            setSuccess(`${doctype} removed from delegation.`);
            await loadPage();
        } catch (e: any) {
            setError(getErrorMessage(e, `Failed to remove ${doctype}.`));
        } finally {
            setSaving(false);
        }
    };

    const handleAddAllowedDoctypes = async (delegationName: string, doctypes: string[]) => {
        if (!doctypes.length) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const existing = enrichedActiveDelegations.find((delegation) => delegation.name === delegationName);
            if (!existing) throw new Error("Delegation record is not loaded.");
            // New types are added to the existing ones; delegation_type picks the Specific Application row
            await delegateUser({
                delegate_user: existing.delegate_user,
                delegation_type: "Specific Application",
                allowed_doctypes: JSON.stringify(doctypes),
            });
            setActiveDelegationDetails((prev) => ({
                ...prev,
                [delegationName]: {
                    ...existing,
                    allowed_doctypes: Array.from(new Set([...parseJsonStringArray(existing.allowed_doctypes), ...doctypes])),
                },
            }));
            setSuccess(`${doctypes.join(", ")} added to delegation.`);
            await loadPage();
        } catch (e: any) {
            setError(getErrorMessage(e, "Failed to add application types."));
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveDelegatedApplication = async (delegationName: string, app: DelegationApplication) => {
        if (!confirm(`Remove ${app.name} from this delegation?`)) return;
        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const existing = enrichedActiveDelegations.find((delegation) => delegation.name === delegationName);
            if (!existing) {
                throw new Error("Delegation record is not loaded.");
            }

            await delegateUser({
                delegate_user: existing.delegate_user,
                remove_applications: JSON.stringify([{ doctype: app.doctype, name: app.name }]),
            });

            const updatedValue = removeFromJsonApplicationArray(existing.applications, app);
            setActiveDelegationDetails((prev) => ({
                ...prev,
                [delegationName]: {
                    ...existing,
                    applications: updatedValue,
                },
            }));
            setSuccess(`${app.name} removed from delegation.`);
            await loadPage();
        } catch (e: any) {
            setError(getErrorMessage(e, `Failed to remove ${app.name}.`));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <GlobalLoader isLoading delay={0} />;

    return (
        <div className="psd-root space-y-2.5">
            <header className="psd-hero relative overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box]">
                <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                        <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                            <UserCheck className="size-4" strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">Delegation</div>
                            <h1 className="mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">Delegate User Access</h1>
                        </div>
                    </div>
                    <p className="hidden max-w-xl text-xs text-[var(--psd-body)] lg:block">
                        Delegate your projects and applications to another user. Visibility follows the visible-as model: your delegate can only see the items you select.
                    </p>
                    <div className="rounded-lg border border-[var(--psd-info)]/30 bg-[var(--psd-info-bg)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--psd-info)]">
                        Signed in as {currentUser}
                    </div>
                </div>
            </header>

            {(error || success) && (
                <div
                    className={cn(
                        "rounded-xl border px-3.5 py-2 text-[12.5px] font-semibold",
                        error
                            ? "border-[var(--psd-returned)]/40 bg-[var(--psd-returned-bg)] text-[#C02B3D] dark:text-rose-300"
                            : "border-[var(--psd-approved)]/40 bg-[var(--psd-approved-bg)] text-[#0A8A60] dark:text-emerald-300",
                    )}
                >
                    {error || success}
                </div>
            )}

            <section className="grid gap-2.5 md:grid-cols-3">
                <SummaryCard icon={Users} label="Active Delegates" value={enrichedActiveDelegations.length} />
                <SummaryCard icon={FolderKanban} label="Delegated Projects" value={totalDelegatedProjects} />
                <SummaryCard icon={FileText} label="Delegated Applications" value={totalDelegatedApplications} />
            </section>

            <section className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className={cn(cardClasses, "overflow-hidden")}>
                    <div className="border-b border-l-[3px] border-b-[var(--psd-border)] border-l-[var(--psd-accent)] bg-[var(--psd-bg)] px-4 py-2.5">
                        <h2 className="text-[13.5px] font-bold text-[var(--psd-heading)]">
                            Create or Update Delegation
                        </h2>
                        <p className="text-[11.5px] text-[var(--psd-body)]">
                            Pick a user, choose the access level, then select the projects and/or applications to share.
                        </p>
                    </div>
                    <div className="p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--psd-body)]">
                                Delegate to user
                            </label>
                            <AutocompleteEmail
                                options={userOptions}
                                value={delegateEmail}
                                onChange={setDelegateEmail}
                                className={inputClasses}
                                variant="psd"
                                placeholder="Search user by name or email"
                                searchByLabel
                                showAllOnFocus
                                strictMatch
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--psd-body)]">
                                Permission
                            </label>
                            <FormSelect
                                value={delegationType}
                                onChange={(e) => {
                                    const next = e.target.value as typeof delegationType;
                                    setDelegationType(next);
                                    // Specific Application is always tied to selected projects
                                    if (next === "Specific Application") setScopeType("project");
                                }}
                            >
                                <option value="View Only">View Only</option>
                                <option value="View and Edit">View and Edit</option>
                                <option value="Specific Application">Specific Application</option>
                                {/* <option value="Workflow Action">Workflow Action</option> */}
                            </FormSelect>
                            <p className="mt-1.5 rounded-lg border border-l-[3px] border-r-[3px] border-sky-200 border-l-sky-500 border-r-sky-500 bg-sky-50 px-3 py-2 text-[11.5px] font-semibold leading-snug text-sky-800 dark:border-sky-900/50 dark:border-l-sky-400 dark:border-r-sky-400 dark:bg-sky-950/30 dark:text-sky-200">
                                {delegationType === "View Only"
                                    ? "The delegate can view the selected projects and applications, but cannot change anything."
                                    : delegationType === "View and Edit"
                                        ? "The delegate can view and edit the selected projects and applications, and can create new applications on your behalf."
                                        : delegationType === "Specific Application"
                                            ? "The delegate can create only the application types you select, only under the projects you select below. They will not see any existing applications."
                                            : "The delegate can view, edit and take workflow actions (approve, reject, submit) on the selected items on your behalf."}
                            </p>
                        </div>
                    </div>
                    {!isSpecificApplication && (
                    <div className="mt-4">
                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--psd-body)]">
                            Scope
                        </label>
                        <div className="w-full sm:w-72">
                            <FormSelect
                                value={scopeType}
                                onChange={(e) => setScopeType(e.target.value as "all" | "project" | "application")}
                            >
                                <option value="all">All Projects &amp; Applications</option>
                                <option value="project">Selected Projects</option>
                                {!isSpecificApplication && <option value="application">Selected Applications</option>}
                            </FormSelect>
                        </div>
                        <p className="mt-1.5 text-[11.5px] text-[var(--psd-body)]">
                            {scopeType === "all"
                                ? "The delegate will see everything you own."
                                : scopeType === "project"
                                    ? "The delegate will only see the projects you select below (and their applications)."
                                    : "The delegate will only see the specific applications you select below."}
                        </p>
                    </div>
                    )}
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--psd-body)]">
                                Valid from
                            </label>
                            <input
                                type="datetime-local"
                                className={cn(inputClasses, "w-full")}
                                value={validFrom}
                                onChange={(e) => setValidFrom(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--psd-body)]">
                                Valid to
                            </label>
                            <input
                                type="datetime-local"
                                className={cn(inputClasses, "w-full")}
                                value={validTo}
                                min={validFrom || undefined}
                                onChange={(e) => setValidTo(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 border-t border-[var(--psd-border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--psd-muted)]" />
                            <input
                                className={cn(inputClasses, "w-full pl-9")}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search projects or applications"
                            />
                        </div>
                        <button
                            onClick={handleDelegate}
                            disabled={saving || specificApplicationIncomplete}
                            title={specificApplicationIncomplete ? "Select at least one project and one application type first" : undefined}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--psd-primary)] px-5 text-[12.5px] font-bold text-white shadow-sm transition-all hover:bg-[var(--psd-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Delegate
                        </button>
                    </div>

                    {scopeType === "project" && (
                    <div className="mt-5">
                        <ScopePanel
                            title="Projects"
                            icon={FolderKanban}
                            count={filteredProjects.length}
                            selectedCount={selectedProjectCount}
                        >
                            {filteredProjects.length === 0 ? (
                                <EmptyState label="No projects found" />
                            ) : (
                                filteredProjects.map((project) => {
                                    const eligibility = isSpecificApplication ? projectEligibility(project) : { ok: true as boolean, reason: undefined };
                                    const disabled = !eligibility.ok;
                                    return (
                                    <label key={project.name} className={cn("flex items-start gap-3 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] p-2.5 transition-colors", disabled ? "cursor-not-allowed opacity-50 grayscale" : "cursor-pointer hover:border-[var(--psd-primary)]/50 hover:bg-[var(--psd-primary-light)]/40")} title={disabled ? eligibility.reason : undefined}>
                                        <input
                                            type="checkbox"
                                            disabled={disabled}
                                            checked={!disabled && selectedProjects.has(project.name)}
                                            onChange={() => toggleProject(project.name)}
                                            className="mt-1 h-4 w-4 accent-[#6842D9]"
                                        />
                                        <div className="min-w-0">
                                            <div className="truncate text-[13px] font-bold text-[var(--psd-heading)]">
                                                {project.project_title || project.name}
                                            </div>
                                            <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--psd-body)]">
                                                <span>{project.project_no || project.name}</span>
                                                {project.workflow_state && <span>{project.workflow_state}</span>}
                                                {disabled && <span className="text-[#B45309]">{eligibility.reason}</span>}
                                            </div>
                                        </div>
                                    </label>
                                    );
                                })
                            )}


                        </ScopePanel>
                    </div>
                    )}

                    {isSpecificApplication && selectedProjectCount > 0 && (
                    <div className="mt-5">
                        <ScopePanel
                            title="Application types the delegate can create"
                            icon={FileText}
                            count={DELEGABLE_APPLICATION_DOCTYPES.length}
                            selectedCount={selectedDoctypes.size}
                        >
                            {DELEGABLE_APPLICATION_DOCTYPES.map((d) => (
                                <label key={d.doctype} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] p-2.5 transition-colors hover:border-[var(--psd-primary)]/50 hover:bg-[var(--psd-primary-light)]/40">
                                    <input
                                        type="checkbox"
                                        checked={selectedDoctypes.has(d.doctype)}
                                        onChange={() => toggleDoctype(d.doctype)}
                                        className="mt-1 h-4 w-4 accent-[#6842D9]"
                                    />
                                    <div className="min-w-0">
                                        <div className="truncate text-[13px] font-bold text-[var(--psd-heading)]">{d.doctype}</div>
                                    </div>
                                </label>
                            ))}
                        </ScopePanel>
                    </div>
                    )}

                    {scopeType === "application" && (
                    <div className="mt-5">
                        <ScopePanel
                            title="Applications"
                            icon={FileText}
                            count={filteredApplications.length}
                            selectedCount={selectedApplicationCount}
                        >
                            {filteredApplications.length === 0 ? (
                                <EmptyState label="No applications found" />
                            ) : (
                                filteredApplications.map((app) => {
                                    const key = applicationKey(app);
                                    return (
                                        <label key={key} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] p-2.5 transition-colors hover:border-[var(--psd-primary)]/50 hover:bg-[var(--psd-primary-light)]/40">
                                            <input
                                                type="checkbox"
                                                checked={selectedApplications.has(key)}
                                                onChange={() => toggleApplication(key)}
                                                className="mt-1 h-4 w-4 accent-[#6842D9]"
                                            />
                                            <div className="min-w-0">
                                                <div className="truncate text-[13px] font-bold text-[var(--psd-heading)]">
                                                    {app.title || app.name}
                                                </div>
                                                <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] font-semibold text-[var(--psd-body)]">
                                                    <span>{app.doctype}</span>
                                                    <span>{app.name}</span>
                                                    {(app.project_no || app.project_name) && <span>{app.project_no || app.project_name}</span>}
                                                    {app.workflow_state && <span>{app.workflow_state}</span>}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })
                            )}
                        </ScopePanel>
                    </div>
                    )}
                    </div>
                </div>

                <aside className={cn(cardClasses, "h-fit overflow-hidden")}>
                    <div className="border-b border-l-[3px] border-b-[var(--psd-border)] border-l-[var(--psd-primary)] bg-[var(--psd-bg)] px-4 py-2.5">
                        <h2 className="flex items-center gap-2 text-[13px] font-bold text-[var(--psd-heading)]">
                            <Users className="h-4 w-4 text-[var(--psd-primary)]" />
                            Active Delegations
                        </h2>
                        <p className="text-[11.5px] text-[var(--psd-body)]">
                            Click a delegate to manage shared items.
                        </p>
                    </div>
                    <div className="max-h-[46rem] space-y-2 overflow-y-auto p-3">
                        {enrichedActiveDelegations.length === 0 ? (
                            <EmptyState label="No active delegations" />
                        ) : (
                            enrichedActiveDelegations.map((delegation) => {
                                const projectCount = parseJsonStringArray(delegation.project_names).length || delegation.project_count || 0;
                                const applicationCount = parseJsonApplicationArray(delegation.applications).length || delegation.application_count || 0;
                                const active = selectedDelegationName === delegation.name;

                                return (
                                    <button
                                        key={delegation.name}
                                        type="button"
                                        onClick={() => setSelectedDelegationName(delegation.name)}
                                        className={cn(
                                            "w-full rounded-xl border p-2.5 text-left transition-all",
                                            active
                                                ? "border-[var(--psd-primary)] bg-[var(--psd-primary-light)] shadow-sm"
                                                : "border-[var(--psd-border)] bg-[var(--psd-surface)] hover:border-[var(--psd-primary)]/50 hover:bg-[var(--psd-primary-light)]/40",
                                        )}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
                                                <UserCheck className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-[12.5px] font-bold text-[var(--psd-heading)]">
                                                    {delegation.delegate_user_name || delegation.delegate_user}
                                                </div>
                                                <div className="truncate text-[10.5px] font-semibold text-[var(--psd-body)]">
                                                    {delegation.delegate_user}
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    <Badge>{delegation.delegation_type || "View Only"}</Badge>
                                                    <Badge>{projectCount} projects</Badge>
                                                    {delegation.delegation_type === "Specific Application" ? (
                                                        <Badge>{parseJsonStringArray(delegation.allowed_doctypes).length} types</Badge>
                                                    ) : (
                                                        <Badge>{applicationCount} applications</Badge>
                                                    )}
                                                    {(delegation.valid_from || delegation.valid_to) && (
                                                        <Badge>
                                                            {formatDelegationDateTime(delegation.valid_from) || "Now"} to {formatDelegationDateTime(delegation.valid_to) || "No expiry"}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </aside>
            </section>

            {selectedDelegation && (
                <DelegationDetailsModal
                    delegation={selectedDelegation}
                    projectLookup={projectLookup}
                    saving={saving}
                    onClose={() => setSelectedDelegationName(null)}
                    onRevoke={() => handleUndelegate(selectedDelegation.name)}
                    onRemoveItem={(value) => handleRemoveDelegatedItem(selectedDelegation.name, value)}
                    onRemoveApplication={(app) => handleRemoveDelegatedApplication(selectedDelegation.name, app)}
                    onRemoveDoctype={(doctype) => handleRemoveAllowedDoctype(selectedDelegation.name, doctype)}
                    onAddDoctypes={(doctypes) => handleAddAllowedDoctypes(selectedDelegation.name, doctypes)}
                />
            )}
        </div>
    );
};

const DelegationDetailsModal = ({
    delegation,
    projectLookup,
    saving,
    onClose,
    onRevoke,
    onRemoveItem,
    onRemoveApplication,
    onRemoveDoctype,
    onAddDoctypes,
}: {
    delegation: ActiveDelegation;
    projectLookup: Map<string, DelegationProject>;
    saving: boolean;
    onClose: () => void;
    onRevoke: () => void;
    onRemoveItem: (value: string) => void;
    onRemoveApplication: (app: DelegationApplication) => void;
    onRemoveDoctype: (doctype: string) => void;
    onAddDoctypes: (doctypes: string[]) => void;
}) => {
    const [typesToAdd, setTypesToAdd] = React.useState<Set<string>>(new Set());
    const isSpecific = delegation.delegation_type === "Specific Application";
    const allowedDoctypes = parseJsonStringArray(delegation.allowed_doctypes);
    const projectNames = parseJsonStringArray(delegation.project_names);
    const applicationItems = parseJsonApplicationArray(delegation.applications);

    return (
        <div className="psd-root fixed inset-0 z-[9999] flex items-center justify-center !bg-black/45 px-4 py-6 backdrop-blur-[2px]">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[var(--psd-border)] bg-[var(--psd-surface)] shadow-2xl">
                <div className="m-2 flex items-start justify-between gap-4 rounded-lg border-[2.5px] border-transparent px-3.5 py-2.5 [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box]">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                            <UserCheck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-[15px] font-bold text-[var(--psd-heading)]">
                                {delegation.delegate_user_name || delegation.delegate_user}
                            </h2>
                            <p className="mt-0.5 truncate text-[12px] font-semibold text-[var(--psd-body)]">
                                {delegation.delegate_user}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Badge>{delegation.delegation_type || "View Only"}</Badge>
                                <Badge>{delegation.scope_type || "project"}</Badge>
                                <Badge>{projectNames.length || delegation.project_count || 0} projects</Badge>
                                {delegation.delegation_type === "Specific Application" ? (
                                    parseJsonStringArray(delegation.allowed_doctypes).map((d) => <Badge key={d}>{d}</Badge>)
                                ) : (
                                    <Badge>{applicationItems.length || delegation.application_count || 0} applications</Badge>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-[var(--psd-muted)] transition-colors hover:bg-[var(--psd-bg)] hover:text-[var(--psd-heading)]"
                        title="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-3 overflow-y-auto p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl border border-[var(--psd-border)] border-l-[3px] border-l-[var(--psd-primary)] bg-[var(--psd-surface)] px-3.5 py-2">
                            <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-[var(--psd-body)]">
                                <FolderKanban className="h-4 w-4" />
                                Delegated Projects
                            </div>
                            <div className="mt-1 text-[22px] font-bold leading-tight tabular-nums text-[var(--psd-heading)]">
                                {projectNames.length || delegation.project_count || 0}
                            </div>
                        </div>
                        <div className="rounded-xl border border-[var(--psd-border)] border-l-[3px] border-l-[var(--psd-primary)] bg-[var(--psd-surface)] px-3.5 py-2">
                            <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-[var(--psd-body)]">
                                <FileText className="h-4 w-4" />
                                {isSpecific ? "Allowed Application Types" : "Delegated Applications"}
                            </div>
                            <div className="mt-1 text-[22px] font-bold leading-tight tabular-nums text-[var(--psd-heading)]">
                                {isSpecific ? allowedDoctypes.length : applicationItems.length || delegation.application_count || 0}
                            </div>
                        </div>
                    </div>

                    <DelegatedDetailList
                        title="Projects"
                        icon={FolderKanban}
                        emptyLabel={
                            (delegation.project_count || 0) > 0
                                ? "Project ids are not available from the backend response"
                                : "No project ids in this delegation"
                        }
                        items={projectNames.map((projectName) => {
                            const project = projectLookup.get(projectName);
                            return {
                                id: projectName,
                                title: project?.project_title || projectName,
                                meta: [project?.project_no, project?.workflow_state].filter(Boolean).join(" · "),
                            };
                        })}
                        onRemove={onRemoveItem}
                    />

                    {isSpecific ? (
                        <>
                        <DelegatedDetailList
                            title="Application types the delegate can create"
                            icon={FileText}
                            emptyLabel="No application types in this delegation"
                            items={allowedDoctypes.map((d) => ({ id: d, title: d, meta: "Create only" }))}
                            onRemove={onRemoveDoctype}
                        />
                        {(() => {
                            const remaining = DELEGABLE_APPLICATION_DOCTYPES.filter((d) => !allowedDoctypes.includes(d.doctype));
                            if (remaining.length === 0) return null;
                            return (
                                <div className="overflow-hidden rounded-xl border border-[var(--psd-border)] bg-[var(--psd-surface)]">
                                    <div className="flex items-center justify-between border-b border-l-[3px] border-r-[3px] border-b-[var(--psd-border)] border-l-[var(--psd-accent)] border-r-[var(--psd-accent)] bg-[var(--psd-bg)] px-3.5 py-2">
                                        <div className="text-[12px] font-bold uppercase tracking-wide text-[var(--psd-heading)]">
                                            Add application types
                                        </div>
                                        <button
                                            type="button"
                                            disabled={saving || typesToAdd.size === 0}
                                            onClick={() => {
                                                onAddDoctypes(Array.from(typesToAdd));
                                                setTypesToAdd(new Set());
                                            }}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--psd-primary)] px-3 text-[11.5px] font-bold text-white transition-all hover:bg-[var(--psd-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                            Add {typesToAdd.size > 0 ? `(${typesToAdd.size})` : ""}
                                        </button>
                                    </div>
                                    <div className="grid gap-1.5 p-2.5 sm:grid-cols-2">
                                        {remaining.map((d) => (
                                            <label key={d.doctype} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] p-2.5 transition-colors hover:border-[var(--psd-primary)]/50 hover:bg-[var(--psd-primary-light)]/40">
                                                <input
                                                    type="checkbox"
                                                    checked={typesToAdd.has(d.doctype)}
                                                    onChange={() =>
                                                        setTypesToAdd((prev) => {
                                                            const next = new Set(prev);
                                                            next.has(d.doctype) ? next.delete(d.doctype) : next.add(d.doctype);
                                                            return next;
                                                        })
                                                    }
                                                    className="h-4 w-4 accent-[#6842D9]"
                                                />
                                                <span className="truncate text-[13px] font-bold text-[var(--psd-heading)]">{d.doctype}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })()}
                        </>
                    ) : (
                    <DelegatedDetailList
                        title="Applications"
                        icon={FileText}
                        emptyLabel={
                            (delegation.application_count || 0) > 0
                                ? "Application details are not available from the backend response"
                                : "No applications in this delegation"
                        }
                        items={applicationItems.map((app) => ({
                            id: applicationKey(app),
                            title: app.title || app.name,
                            meta: [app.doctype, app.workflow_state].filter(Boolean).join(" · "),
                        }))}
                        onRemove={(id) => {
                            const app = applicationItems.find((item) => applicationKey(item) === id);
                            if (app) onRemoveApplication(app);
                        }}
                    />
                    )}
                </div>

                {(delegation.valid_from || delegation.valid_to) && (
                    <div className="mx-4 mb-3 flex items-center gap-1.5 rounded-lg bg-[var(--psd-bg)] px-3 py-2 text-[11.5px] font-semibold text-[var(--psd-body)]">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDelegationDateTime(delegation.valid_from) || "Now"} to {formatDelegationDateTime(delegation.valid_to) || "No expiry"}
                    </div>
                )}

                <div className="flex justify-end gap-2 border-t border-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-4 text-[12px] font-bold text-[var(--psd-heading)] transition-colors hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={onRevoke}
                        disabled={saving}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--psd-returned)] px-4 text-[12px] font-bold text-white transition-all hover:brightness-90 active:scale-[0.98] disabled:opacity-50"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                        Revoke Delegation
                    </button>
                </div>
            </div>
        </div>
    );
};

const SummaryCard = ({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value: number;
}) => (
    <div className={cn(cardClasses, "flex items-center gap-3 border-l-[3px] border-r-[3px] !border-l-[var(--psd-primary)] !border-r-[var(--psd-primary)] px-3 py-2")}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
            <Icon className="h-[18px] w-[18px]" />
        </div>
        <div>
            <div className="text-[19px] font-bold leading-tight tabular-nums text-[var(--psd-heading)]">{value}</div>
            <div className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--psd-body)]">{label}</div>
        </div>
    </div>
);

const DelegatedDetailList = ({
    title,
    icon: Icon,
    items,
    emptyLabel,
    onRemove,
}: {
    title: string;
    icon: React.ElementType;
    items: Array<{ id: string; title: string; meta?: string }>;
    emptyLabel: string;
    onRemove?: (id: string) => void;
}) => (
    <div className="overflow-hidden rounded-xl border border-[var(--psd-border)] bg-[var(--psd-surface)]">
        <div className="flex items-center justify-between border-b border-l-[3px] border-b-[var(--psd-border)] border-l-[var(--psd-accent)] bg-[var(--psd-bg)] px-3.5 py-2">
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-[var(--psd-heading)]">
                <Icon className="h-4 w-4 text-[var(--psd-accent)]" />
                {title}
            </div>
            <span className="rounded-full bg-[var(--psd-surface)] px-2.5 py-0.5 text-[11px] font-bold text-[var(--psd-body)] ring-1 ring-[var(--psd-border)]">
                {items.length}
            </span>
        </div>
        <div className="max-h-[22rem] overflow-y-auto">
            {items.length === 0 ? (
                <div className="m-3 rounded-lg border border-dashed border-[var(--psd-border)] px-3 py-8 text-center text-[12px] font-semibold text-[var(--psd-muted)]">
                    {emptyLabel}
                </div>
            ) : (
                <div className="min-w-full">
                    <div className="grid grid-cols-[minmax(12rem,1.5fr)_minmax(12rem,1fr)_minmax(8rem,0.8fr)_3rem] border-b border-[#9DAE85]/50 bg-[#DCE6CD] px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-[#33441F] dark:bg-[#34402B] dark:text-[#D5E2C2]">
                        <div>Name</div>
                        <div>Reference</div>
                        <div>Details</div>
                        <div className="text-right">Remove</div>
                    </div>
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="grid grid-cols-[minmax(12rem,1.5fr)_minmax(12rem,1fr)_minmax(8rem,0.8fr)_3rem] items-center border-b border-[var(--psd-border)] px-4 py-2 last:border-b-0 even:bg-[var(--psd-bg)]/50 hover:bg-[var(--psd-primary-light)]/40"
                        >
                            <div className="min-w-0 pr-3">
                                <div className="truncate text-[13px] font-bold text-[var(--psd-heading)]">
                                    {item.title}
                                </div>
                            </div>
                            <div className="min-w-0 pr-3">
                                <div className="truncate font-mono text-[11px] font-semibold text-[var(--psd-body)]">
                                    {item.id}
                                </div>
                            </div>
                            <div className="min-w-0 pr-3">
                                <div className="truncate text-[11px] font-semibold text-[var(--psd-body)]">
                                    {item.meta || "-"}
                                </div>
                            </div>
                            <div className="flex justify-end">
                                {onRemove && (
                                    <button
                                        type="button"
                                        onClick={() => onRemove(item.id)}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--psd-muted)] transition-colors hover:bg-[var(--psd-returned-bg)] hover:text-[var(--psd-returned)]"
                                        title="Remove from delegation"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);

const ScopePanel = ({
    title,
    icon: Icon,
    count,
    selectedCount,
    muted,
    children,
}: {
    title: string;
    icon: React.ElementType;
    count: number;
    selectedCount: number;
    muted?: boolean;
    children: React.ReactNode;
}) => (
    <div className={cn("overflow-hidden rounded-xl border border-[var(--psd-border)]", muted && "opacity-55")}>
        <div className="flex items-center justify-between border-b border-l-[3px] border-b-[var(--psd-border)] border-l-[var(--psd-info)] bg-[var(--psd-bg)] px-3.5 py-2">
            <h2 className="flex items-center gap-2 text-[13px] font-bold text-[var(--psd-heading)]">
                <Icon className="h-4 w-4 text-[var(--psd-info)]" />
                {title}
            </h2>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--psd-body)]">
                <span>{count}</span>
                <span className="rounded-full bg-[var(--psd-primary-light)] px-2 py-0.5 text-[var(--psd-primary)]">
                    {selectedCount} selected
                </span>
            </div>
        </div>
        <div className="max-h-[34rem] space-y-1.5 overflow-y-auto p-2.5">{children}</div>
    </div>
);

const EmptyState = ({ label }: { label: string }) => (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--psd-border)] bg-[var(--psd-bg)] p-4 text-center">
        <CheckCircle2 className="mb-2 h-5 w-5 text-[var(--psd-muted)]" />
        <p className="text-[12px] font-semibold text-[var(--psd-body)]">{label}</p>
    </div>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="rounded-full border border-[var(--psd-primary)]/30 bg-[var(--psd-primary-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--psd-primary)]">
        {children}
    </span>
);

/** Delegate User page: share documents (existing form) or give access to your account (role delegation). */
const DelegateUser: React.FC = () => {
    const [params, setParams] = useSearchParams();
    const { isActing } = useActingProfile();
    const tab = params.get("tab") === "account" ? "account" : "documents";
    const [visited, setVisited] = React.useState({ documents: tab === "documents", account: true }); // account tab is preloaded in the background (no full-screen loader)
    React.useEffect(() => {
        setVisited((v) => (v[tab] ? v : { ...v, [tab]: true }));
    }, [tab]);
    const TabBtn = ({ id, label }: { id: "documents" | "account"; label: string }) => (
        <button
            type="button"
            onClick={() => setParams(id === "account" ? { tab: "account" } : {})}
            className={cn(
                "rounded-xl px-5 py-2 text-[13px] font-bold transition-all duration-300",
                tab === id
                    ? "bg-gradient-to-r from-[#6842D9] to-[#4775E8] text-white shadow-md shadow-violet-500/25"
                    : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-white/10",
            )}
        >
            {label}
        </button>
    );
    return (
        // Same violet theme on both tabs; the switcher is a frosted-glass pill.
        <div className="-m-1 rounded-2xl bg-gradient-to-br from-violet-100/70 via-indigo-50/60 to-transparent p-3 dark:from-violet-950/30 dark:via-indigo-950/20">
            <div className="mb-3 inline-flex gap-1 rounded-2xl border border-white/60 bg-white/40 p-1 shadow-[0_8px_30px_rgba(31,38,135,0.10)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                <TabBtn id="documents" label="Delegate User" />
                <TabBtn id="account" label="Delegate Account Access" />
            </div>
            {isActing ? (
                <div className="p-6 text-[14px] font-semibold text-zinc-600 dark:text-zinc-300">
                    Delegation is not available while acting on a delegated profile. Switch back to your own profile first.
                </div>
            ) : (
                // Both tabs stay mounted once opened (just hidden), so switching back is instant
                // instead of reloading each tab's data and showing the loader again.
                <>
                    {visited.documents && <div hidden={tab !== "documents"}><DelegateUserForm /></div>}
                    {visited.account && <div hidden={tab !== "account"}><RoleDelegation /></div>}
                </>
            )}
        </div>
    );
};

export default DelegateUser;
