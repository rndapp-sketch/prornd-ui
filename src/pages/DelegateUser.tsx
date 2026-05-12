import React from "react";
import { useFrappeAuth, useFrappeGetDocList, useFrappePostCall } from "frappe-react-sdk";
import {
    CheckCircle2,
    Clock,
    FolderKanban,
    Loader2,
    Search,
    ShieldCheck,
    Trash2,
    UserCheck,
    Users,
    X,
    XCircle,
} from "lucide-react";
import { delegateUserAPI } from "@/services/apiService";
import { AutocompleteEmail } from "@/components/AutocompleteEmail";
import { useUserRoles } from "@/components/UserRole";
import { cn } from "@/lib/utils";

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

type ActiveDelegation = {
    name: string;
    delegator_user?: string;
    delegate_user: string;
    delegate_user_name?: string;
    delegation_type?: string;
    scope_type?: "all" | "project" | "application";
    project_count?: number;
    application_count?: number;
    project_names?: string;
    applications?: string;
    valid_from?: string;
    valid_to?: string;
    enabled?: number;
};

type ScopeResponse = {
    users?: DelegateUserOption[];
    projects?: DelegationProject[];
};

const inputClasses =
    "h-10 rounded-lg border-[1.5px] border-[#D4D4D8] dark:border-[#52525B] bg-white dark:bg-[#18181B] px-3 text-[13px] font-medium text-[#18181B] dark:text-[#E4E4E7] outline-none transition-colors focus:border-[#4A6CF7] focus:ring-[3px] focus:ring-[#4A6CF7]/12 placeholder:text-[#A1A1AA]";

const cardClasses =
    "rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm";

const parseJsonStringArray = (raw?: string): string[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
            : [];
    } catch {
        return [];
    }
};

const removeFromJsonArray = (raw: string | undefined, value: string) =>
    JSON.stringify(parseJsonStringArray(raw).filter((item) => item !== value));

const getErrorMessage = (error: any, fallback: string) =>
    error?._server_messages ||
    error?.exception ||
    error?.message ||
    error?.response?.data?.exception ||
    fallback;

const DelegateUser: React.FC = () => {
    const { currentUser } = useFrappeAuth();
    const { roles, isLoading: rolesLoading } = useUserRoles(currentUser ?? null);
    const isPermanentEmployee = roles.includes("Permanent Employee");

    const { call: searchUsers } = useFrappePostCall<{ message: DelegateUserOption[] }>(delegateUserAPI.searchUsers);
    const { call: getScope } = useFrappePostCall<{ message: ScopeResponse }>(delegateUserAPI.getScope);
    const { call: getActiveDelegations } = useFrappePostCall<{ message: ActiveDelegation[] }>(delegateUserAPI.getActiveDelegations);
    const { call: delegateUser } = useFrappePostCall(delegateUserAPI.delegate);
    const { call: undelegateUser } = useFrappePostCall(delegateUserAPI.undelegate);
    const { call: updateDelegationField } = useFrappePostCall("frappe.client.set_value");

    const [userOptions, setUserOptions] = React.useState<DelegateUserOption[]>([]);
    const [delegateEmail, setDelegateEmail] = React.useState("");
    const [delegationType, setDelegationType] = React.useState<"View Only" | "View and Edit" | "Workflow Action">("View Only");
    const [projects, setProjects] = React.useState<DelegationProject[]>([]);
    const [selectedProjects, setSelectedProjects] = React.useState<Set<string>>(new Set());
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
                            `/api/resource/User%20Delegation/${encodeURIComponent(delegation.name)}`,
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

    const selectedProjectCount = selectedProjects.size;

    const projectLookup = React.useMemo(() => {
        const map = new Map<string, DelegationProject>();
        projects.forEach((project) => map.set(project.name, project));
        return map;
    }, [projects]);

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
        }));
    }, [activeDelegationDetails, activeDelegationDocs, activeDelegations]);

    const totalDelegatedProjects = React.useMemo(
        () => enrichedActiveDelegations.reduce((sum, delegation) => sum + parseJsonStringArray(delegation.project_names).length, 0),
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

    const handleDelegate = async () => {
        if (!delegateEmail) {
            setError("Select a user to delegate to.");
            return;
        }
        if (delegateEmail === currentUser) {
            setError("You cannot delegate to yourself.");
            return;
        }
        if (selectedProjectCount === 0) {
            setError("Select at least one project to delegate.");
            return;
        }

        setSaving(true);
        setError(null);
        setSuccess(null);
        try {
            await delegateUser({
                delegate_user: delegateEmail,
                delegation_type: delegationType,
                // Application-level delegation is paused for now. Keep every new delegation project-scoped.
                scope_type: "project",
                project_names: JSON.stringify(Array.from(selectedProjects)),
                applications: JSON.stringify([]),
            });
            setSuccess(`Delegation created for ${delegateEmail}.`);
            setDelegateEmail("");
            setSelectedProjects(new Set());
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

            await updateDelegationField({
                doctype: "User Delegation",
                name: delegationName,
                fieldname: "project_names",
                value: updatedValue,
            });
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

    if (rolesLoading || loading) {
        return (
            <div className="flex min-h-[55vh] items-center justify-center">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#4A6CF7]" />
                    Loading delegation workspace...
                </div>
            </div>
        );
    }

    if (!isPermanentEmployee) {
        return (
            <div className={cn(cardClasses, "mx-auto max-w-xl p-6 text-center")}>
                <XCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
                <h1 className="text-[18px] font-extrabold text-[#18181B] dark:text-[#E4E4E7]">Access Restricted</h1>
                <p className="mt-2 text-[13px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                    Delegate user management is currently enabled only for Permanent Employee role.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <header className={cn(cardClasses, "overflow-hidden")}>
                <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EEF2FF] dark:bg-[#4A6CF7]/15">
                                <UserCheck className="h-4 w-4 text-[#4A6CF7] dark:text-[#93C5FD]" />
                            </span>
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#D97757]">Delegation</span>
                        </div>
                        <h1 className="text-[22px] font-extrabold tracking-normal text-[#18181B] dark:text-[#E4E4E7]">
                            Delegate User Access
                        </h1>
                        <p className="mt-1 max-w-3xl text-[13px] font-medium leading-6 text-[#71717A] dark:text-[#A1A1AA]">
                            Delegate your projects to another user. Visibility follows the visible-as model: your delegate can see project records assigned to you.
                        </p>
                    </div>
                    <div className="rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2 text-[12px] font-semibold text-[#1E3A8A] dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/15 dark:text-[#C7D2FE]">
                        Signed in as {currentUser}
                    </div>
                </div>
            </header>

            {(error || success) && (
                <div
                    className={cn(
                        "rounded-xl border px-4 py-3 text-[13px] font-semibold",
                        error
                            ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-400",
                    )}
                >
                    {error || success}
                </div>
            )}

            <section className="grid gap-4 md:grid-cols-2">
                <SummaryCard icon={Users} label="Active Delegates" value={enrichedActiveDelegations.length} />
                <SummaryCard icon={FolderKanban} label="Delegated Projects" value={totalDelegatedProjects} />
            </section>

            <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className={cn(cardClasses, "p-5")}>
                    <div className="mb-5">
                        <h2 className="text-[15px] font-extrabold text-[#18181B] dark:text-[#E4E4E7]">
                            Create or Update Delegation
                        </h2>
                        <p className="mt-1 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                            Pick a user, choose the access level, then select the projects to share.
                        </p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
                        <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#D4D4D8]">
                                Delegate to user
                            </label>
                            <AutocompleteEmail
                                options={userOptions}
                                value={delegateEmail}
                                onChange={setDelegateEmail}
                                className={inputClasses}
                                placeholder="Search user by name or email"
                                searchByLabel
                                showAllOnFocus
                                strictMatch
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#D4D4D8]">
                                Permission
                            </label>
                            <select className={cn(inputClasses, "w-full")} value={delegationType} onChange={(e) => setDelegationType(e.target.value as any)}>
                                <option>View Only</option>
                                <option>View and Edit</option>
                                <option>Workflow Action</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-col gap-3 border-t border-[#E4E4E7] pt-4 dark:border-[#3F3F46] sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-sm">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A1A1AA]" />
                            <input
                                className={cn(inputClasses, "w-full pl-9")}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search projects"
                            />
                        </div>
                        <button
                            onClick={handleDelegate}
                            disabled={saving}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#4A6CF7] px-4 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-[#3558E8] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                            Delegate
                        </button>
                    </div>

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
                                filteredProjects.map((project) => (
                                    <label key={project.name} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] p-3 transition-colors hover:bg-white dark:border-[#3F3F46] dark:bg-[#18181B] dark:hover:bg-[#27272A]">
                                        <input
                                            type="checkbox"
                                            checked={selectedProjects.has(project.name)}
                                            onChange={() => toggleProject(project.name)}
                                            className="mt-1 h-4 w-4 accent-[#4A6CF7]"
                                        />
                                        <div className="min-w-0">
                                            <div className="truncate text-[13px] font-bold text-[#18181B] dark:text-[#E4E4E7]">
                                                {project.project_title || project.name}
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                                <span>{project.project_no || project.name}</span>
                                                {project.workflow_state && <span>{project.workflow_state}</span>}
                                            </div>
                                        </div>
                                    </label>
                                ))
                            )}
                        </ScopePanel>
                    </div>
                </div>

                <aside className={cn(cardClasses, "h-fit overflow-hidden")}>
                    <div className="border-b border-[#E4E4E7] bg-[#FAFAF9] px-4 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-[#18181B] dark:text-[#E4E4E7]">
                            <Users className="h-4 w-4 text-[#4A6CF7]" />
                            Active Delegations
                        </h2>
                        <p className="mt-1 text-[11px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                            Click a delegate to manage shared items.
                        </p>
                    </div>
                    <div className="max-h-[46rem] space-y-2 overflow-y-auto p-3">
                        {enrichedActiveDelegations.length === 0 ? (
                            <EmptyState label="No active delegations" />
                        ) : (
                            enrichedActiveDelegations.map((delegation) => {
                                const projectCount = parseJsonStringArray(delegation.project_names).length || delegation.project_count || 0;
                                const active = selectedDelegationName === delegation.name;

                                return (
                                    <button
                                        key={delegation.name}
                                        type="button"
                                        onClick={() => setSelectedDelegationName(delegation.name)}
                                        className={cn(
                                            "w-full rounded-xl border p-3 text-left transition-all",
                                            active
                                                ? "border-[#4A6CF7] bg-[#EEF2FF] shadow-sm dark:bg-[#4A6CF7]/15"
                                                : "border-[#E4E4E7] bg-[#FAFAF9] hover:bg-white dark:border-[#3F3F46] dark:bg-[#18181B] dark:hover:bg-[#27272A]",
                                        )}
                                    >
                                        <div className="flex items-start gap-2.5">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#4A6CF7] dark:bg-[#27272A] dark:text-[#93C5FD]">
                                                <UserCheck className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate text-[12px] font-extrabold text-[#18181B] dark:text-[#E4E4E7]">
                                                    {delegation.delegate_user_name || delegation.delegate_user}
                                                </div>
                                                <div className="truncate text-[10px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                                    {delegation.delegate_user}
                                                </div>
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    <Badge>{delegation.delegation_type || "View Only"}</Badge>
                                                    <Badge>{projectCount} projects</Badge>
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
}: {
    delegation: ActiveDelegation;
    projectLookup: Map<string, DelegationProject>;
    saving: boolean;
    onClose: () => void;
    onRevoke: () => void;
    onRemoveItem: (value: string) => void;
}) => {
    const projectNames = parseJsonStringArray(delegation.project_names);

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-[2px]">
            <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-2xl dark:border-[#3F3F46] dark:bg-[#27272A]">
                <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                <div className="flex items-start justify-between gap-4 border-b border-[#E4E4E7] bg-[#FAFAF9] px-5 py-4 dark:border-[#3F3F46] dark:bg-[#18181B]">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4A6CF7] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD]">
                            <UserCheck className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-[16px] font-extrabold text-[#18181B] dark:text-[#E4E4E7]">
                                {delegation.delegate_user_name || delegation.delegate_user}
                            </h2>
                            <p className="mt-0.5 truncate text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                {delegation.delegate_user}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                <Badge>{delegation.delegation_type || "View Only"}</Badge>
                                <Badge>project</Badge>
                                <Badge>{projectNames.length || delegation.project_count || 0} projects</Badge>
                            </div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#18181B] dark:hover:bg-[#3F3F46] dark:hover:text-[#E4E4E7]"
                        title="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-5 overflow-y-auto p-5">
                    <div className="grid gap-3">
                        <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] px-4 py-3 dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/15">
                            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wide text-[#1E3A8A] dark:text-[#C7D2FE]">
                                <FolderKanban className="h-4 w-4" />
                                Delegated Projects
                            </div>
                            <div className="mt-2 text-[24px] font-extrabold text-[#18181B] dark:text-[#E4E4E7]">
                                {projectNames.length || delegation.project_count || 0}
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
                </div>

                {(delegation.valid_from || delegation.valid_to) && (
                    <div className="mx-5 mb-4 flex items-center gap-1.5 rounded-lg bg-[#F4F4F5] px-3 py-2 text-[11px] font-semibold text-[#71717A] dark:bg-[#18181B] dark:text-[#A1A1AA]">
                        <Clock className="h-3.5 w-3.5" />
                        {delegation.valid_from || "Now"} to {delegation.valid_to || "No expiry"}
                    </div>
                )}

                <div className="flex justify-end gap-2 border-t border-[#E4E4E7] px-5 py-4 dark:border-[#3F3F46]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-9 rounded-lg border border-[#D4D4D8] bg-white px-4 text-[12px] font-bold text-[#3F3F46] transition-colors hover:bg-[#F4F4F5] dark:border-[#52525B] dark:bg-[#18181B] dark:text-[#D4D4D8] dark:hover:bg-[#3F3F46]"
                    >
                        Close
                    </button>
                    <button
                        type="button"
                        onClick={onRevoke}
                        disabled={saving}
                        className="inline-flex h-9 items-center gap-2 rounded-lg bg-red-600 px-4 text-[12px] font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
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
    <div className={cn(cardClasses, "flex items-center gap-3 p-4")}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4A6CF7] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD]">
            <Icon className="h-5 w-5" />
        </div>
        <div>
            <div className="text-[20px] font-extrabold text-[#18181B] dark:text-[#E4E4E7]">{value}</div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-[#71717A] dark:text-[#A1A1AA]">{label}</div>
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
    <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-[#FAFAF9] px-4 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
            <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wide text-[#3F3F46] dark:text-[#D4D4D8]">
                <Icon className="h-4 w-4 text-[#4A6CF7]" />
                {title}
            </div>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#71717A] dark:bg-[#27272A] dark:text-[#A1A1AA]">
                {items.length}
            </span>
        </div>
        <div className="max-h-[22rem] overflow-y-auto">
            {items.length === 0 ? (
                <div className="m-3 rounded-lg border border-dashed border-[#D4D4D8] px-3 py-8 text-center text-[12px] font-semibold text-[#A1A1AA] dark:border-[#52525B]">
                    {emptyLabel}
                </div>
            ) : (
                <div className="min-w-full">
                    <div className="grid grid-cols-[minmax(12rem,1.5fr)_minmax(12rem,1fr)_minmax(8rem,0.8fr)_3rem] border-b border-[#E4E4E7] bg-white px-4 py-2 text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#A1A1AA]">
                        <div>Name</div>
                        <div>Reference</div>
                        <div>Details</div>
                        <div className="text-right">Remove</div>
                    </div>
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className="grid grid-cols-[minmax(12rem,1.5fr)_minmax(12rem,1fr)_minmax(8rem,0.8fr)_3rem] items-center border-b border-[#F4F4F5] px-4 py-3 last:border-b-0 dark:border-[#3F3F46]/80"
                        >
                            <div className="min-w-0 pr-3">
                                <div className="truncate text-[13px] font-bold text-[#18181B] dark:text-[#E4E4E7]">
                                    {item.title}
                                </div>
                            </div>
                            <div className="min-w-0 pr-3">
                                <div className="truncate font-mono text-[11px] font-semibold text-[#52525B] dark:text-[#D4D4D8]">
                                    {item.id}
                                </div>
                            </div>
                            <div className="min-w-0 pr-3">
                                <div className="truncate text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                    {item.meta || "-"}
                                </div>
                            </div>
                            <div className="flex justify-end">
                                {onRemove && (
                                    <button
                                        type="button"
                                        onClick={() => onRemove(item.id)}
                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#A1A1AA] transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
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
    <div className={cn("rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]", muted && "opacity-55")}>
        <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-[#FAFAF9] px-4 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
            <h2 className="flex items-center gap-2 text-[13px] font-extrabold text-[#18181B] dark:text-[#E4E4E7]">
                <Icon className="h-4 w-4 text-[#4A6CF7]" />
                {title}
            </h2>
            <div className="flex items-center gap-2 text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA]">
                <span>{count}</span>
                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[#1E3A8A] dark:bg-[#4A6CF7]/15 dark:text-[#C7D2FE]">
                    {selectedCount} selected
                </span>
            </div>
        </div>
        <div className="max-h-[34rem] space-y-2 overflow-y-auto p-3">{children}</div>
    </div>
);

const EmptyState = ({ label }: { label: string }) => (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-[#D4D4D8] bg-[#FAFAF9] p-4 text-center dark:border-[#52525B] dark:bg-[#18181B]">
        <CheckCircle2 className="mb-2 h-5 w-5 text-[#A1A1AA]" />
        <p className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">{label}</p>
    </div>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1E3A8A] dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/15 dark:text-[#C7D2FE]">
        {children}
    </span>
);

export default DelegateUser;
