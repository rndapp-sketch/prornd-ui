import React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDocList } from "frappe-react-sdk";
import {
    ArrowUpRight,
    CheckCircle2,
    Clock,
    FileText,
    FolderKanban,
    Loader2,
    Share2,
    UserCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import "@/pages/dashboards/projectStaffDashboard.css";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import { delegateUserAPI } from "@/services/apiService";
import { getApplicationRoute } from "@/utils/applicationRoutes";
import CreateApplicationOnBehalf from "@/pages/CreateApplicationOnBehalf";

interface UserDelegation {
    name: string;
    delegator_user?: string;
    delegate_user?: string;
    delegation_type?: string;
    scope_type?: "all" | "project" | "application";
    project_names?: string;
    applications?: string;
    valid_from?: string;
    valid_to?: string;
    enabled?: number;
}

// From get_received_delegations: "Specific Application" rows carry the types the delegate may create and
// their projects already resolved (the delegate cannot read those projects directly).
interface ReceivedDelegationInfo {
    name: string;
    allowed_doctypes?: string[];
    project_names?: Project[];
}

interface Project {
    name: string;
    project_title?: string;
    project_no?: string;
    workflow_state?: string;
}

interface DelegatedApplication {
    doctype: string;
    name: string;
}

const cardClasses =
    "psd-card !rounded-xl";

const parseJsonArray = <T,>(raw?: string): T[] => {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
};

const parseDelegationDateTime = (value?: string) => {
    if (!value) return null;
    const parsed = new Date(value.replace(" ", "T"));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isDelegationWithinDateRange = (delegation: UserDelegation, now = new Date()) => {
    const validFrom = parseDelegationDateTime(delegation.valid_from);
    const validTo = parseDelegationDateTime(delegation.valid_to);
    if (validFrom && validFrom > now) return false;
    if (validTo && validTo < now) return false;
    return true;
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

const Badge = ({ children }: { children: React.ReactNode }) => (
    <span className="rounded-full border border-[var(--psd-primary)]/30 bg-[var(--psd-primary-light)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--psd-primary)]">
        {children}
    </span>
);

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

const EmptyState = ({ label }: { label: string }) => (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--psd-border)] bg-[var(--psd-bg)] p-4 text-center">
        <CheckCircle2 className="mb-2 h-5 w-5 text-[var(--psd-muted)]" />
        <p className="text-[12px] font-semibold text-[var(--psd-body)]">{label}</p>
    </div>
);

const DelegatedToMe: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const [activeTab, setActiveTab] = React.useState<"received" | "create">("received");

    const { data: receivedDelegations, isLoading: delegationsLoading } = useFrappeGetDocList<UserDelegation>(
        "User Delegation",
        {
            fields: [
                "name",
                "delegator_user",
                "delegate_user",
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
                    ["delegate_user", "=", currentUser],
                    ["enabled", "=", 1],
                ]
                : [["name", "=", "NON_EXISTENT_DOC"]],
            limit: 1000,
        },
    );

    const [receivedInfo, setReceivedInfo] = React.useState<Map<string, ReceivedDelegationInfo>>(new Map());
    React.useEffect(() => {
        if (!currentUser) return;
        let cancelled = false;
        fetch(`${FRAPPE_BASE_URL}/api/method/${delegateUserAPI.getReceivedDelegations}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": (window as any).csrf_token || "" },
            credentials: "include",
            body: "{}",
        })
            .then((res) => (res.ok ? res.json() : null))
            .then((json) => {
                if (cancelled || !Array.isArray(json?.message)) return;
                setReceivedInfo(new Map((json.message as ReceivedDelegationInfo[]).map((d) => [d.name, d])));
            })
            .catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [currentUser]);

    const activeDelegations = React.useMemo(() => {
        const now = new Date();
        return (receivedDelegations ?? []).filter((delegation) => isDelegationWithinDateRange(delegation, now));
    }, [receivedDelegations]);

    const delegatedProjectNames = React.useMemo(() => {
        const names = new Set<string>();
        activeDelegations.forEach((delegation) => {
            parseJsonArray<string>(delegation.project_names).forEach((name) => names.add(name));
        });
        return Array.from(names);
    }, [activeDelegations]);

    const { data: delegatedProjects, isLoading: projectsLoading } = useFrappeGetDocList<Project>(
        "Project Registration",
        {
            fields: ["name", "project_title", "project_no", "workflow_state"],
            filters: delegatedProjectNames.length
                ? [["name", "in", delegatedProjectNames]]
                : [["name", "=", "NON_EXISTENT_DOC"]],
            limit: 1000,
        },
    );

    const projectLookup = React.useMemo(() => {
        const map = new Map<string, Project>();
        (delegatedProjects ?? []).forEach((project) => map.set(project.name, project));
        return map;
    }, [delegatedProjects]);

    const totalDelegatedApplications = React.useMemo(
        () =>
            activeDelegations.reduce(
                (sum, delegation) => sum + parseJsonArray<DelegatedApplication>(delegation.applications).length,
                0,
            ),
        [activeDelegations],
    );

    const loading = delegationsLoading || (delegatedProjectNames.length > 0 && projectsLoading);

    if (loading) {
        return (
            <div className="psd-root flex min-h-[55vh] flex-col items-center justify-center gap-3">
                <div className="psd-loadbar w-56" />
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--psd-body)]">
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--psd-primary)]" />
                    Loading delegated access...
                </div>
            </div>
        );
    }

    return (
        <div className="psd-root space-y-2.5">
            <header className="psd-hero relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2">
                <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                    <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                        <Share2 className="size-4" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">Delegation</div>
                        <h1 className="mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">Delegated to Me</h1>
                    </div>
                </div>
                <p className="relative z-10 hidden max-w-xl text-xs text-[var(--psd-body)] lg:block">
                    Projects and applications that other users have shared access to. You can view and act on these based on the access level granted.
                </p>
                <div className="relative z-10 rounded-lg border border-[var(--psd-info)]/30 bg-[var(--psd-info-bg)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--psd-info)]">
                    Signed in as {currentUser}
                </div>
            </header>

            <div role="tablist" className="flex items-center gap-1.5">
                {([
                    ["received", "Received Delegations"],
                    ["create", "Create on Behalf"],
                ] as const).map(([key, label]) => {
                    const on = activeTab === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => setActiveTab(key)}
                            className={cn(
                                "psd-focus flex h-9 items-center rounded-full border px-3.5 text-[12.5px] font-bold transition-all duration-200",
                                on
                                    ? "border-transparent bg-[var(--psd-primary)] text-white shadow-sm"
                                    : "border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-body)] hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)]",
                            )}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {activeTab === "create" && <CreateApplicationOnBehalf hideHeader />}

            {activeTab === "received" && (
            <>
            <section className="grid gap-2.5 sm:grid-cols-3">
                <SummaryCard icon={UserCircle2} label="Delegators" value={activeDelegations.length} />
                <SummaryCard icon={FolderKanban} label="Delegated Projects" value={delegatedProjectNames.length} />
                <SummaryCard icon={FileText} label="Delegated Applications" value={totalDelegatedApplications} />
            </section>

            <section className="space-y-2.5">
                {activeDelegations.length === 0 ? (
                    <div className={cn(cardClasses, "p-3")}>
                        <EmptyState label="No one has delegated any projects or applications to you yet." />
                    </div>
                ) : (
                    activeDelegations.map((delegation) => {
                        const isSpecific = delegation.delegation_type === "Specific Application";
                        const info = receivedInfo.get(delegation.name);
                        const allowedDoctypes = info?.allowed_doctypes ?? [];
                        const projectNames = isSpecific
                            ? (info?.project_names ?? []).map((p) => p.name)
                            : parseJsonArray<string>(delegation.project_names);
                        const applications = parseJsonArray<DelegatedApplication>(delegation.applications);

                        return (
                            <div key={delegation.name} className={cn(cardClasses, "overflow-hidden")}>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-l-[3px] border-b-[var(--psd-border)] border-l-[var(--psd-accent)] bg-[var(--psd-bg)] px-4 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
                                            <UserCircle2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-[13px] font-bold text-[var(--psd-heading)]">
                                                {delegation.delegator_user}
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                <Badge>{delegation.delegation_type || "View Only"}</Badge>
                                                {isSpecific ? <Badge>create only</Badge> : <Badge>{delegation.scope_type || "project"} scope</Badge>}
                                            </div>
                                        </div>
                                    </div>
                                    {(delegation.valid_from || delegation.valid_to) && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--psd-body)]">
                                            <Clock className="h-3.5 w-3.5" />
                                            {formatDelegationDateTime(delegation.valid_from) || "Now"} to {formatDelegationDateTime(delegation.valid_to) || "No expiry"}
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-3 p-3 md:grid-cols-2">
                                    <div>
                                        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--psd-heading)]">
                                            <FolderKanban className="h-3.5 w-3.5 text-[var(--psd-primary)]" />
                                            Projects ({projectNames.length})
                                        </h3>
                                        {delegation.scope_type === "all" ? (
                                            <p className="text-[12px] text-[var(--psd-body)]">
                                                Full access to all of {delegation.delegator_user}'s projects.
                                            </p>
                                        ) : projectNames.length === 0 ? (
                                            <p className="text-[12px] text-[var(--psd-body)]">No projects in this delegation.</p>
                                        ) : (
                                            <ul className="space-y-1.5">
                                                {projectNames.map((projectName) => {
                                                    const project = isSpecific
                                                        ? info?.project_names?.find((p) => p.name === projectName)
                                                        : projectLookup.get(projectName);
                                                    return (
                                                        <li key={projectName}>
                                                            <button
                                                                type="button"
                                                                disabled={isSpecific}
                                                                onClick={() => navigate(`/project-details-overview/${projectName}`)}
                                                                className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-3 py-1.5 text-left transition-colors hover:border-[var(--psd-primary)]/50 hover:bg-[var(--psd-primary-light)]/40"
                                                            >
                                                                <span className="min-w-0">
                                                                    <span className="block truncate text-[12px] font-bold text-[var(--psd-heading)]">
                                                                        {project?.project_title || projectName}
                                                                    </span>
                                                                    <span className="block truncate text-[10px] font-semibold text-[var(--psd-body)]">
                                                                        {project?.project_no || projectName}
                                                                    </span>
                                                                </span>
                                                                {!isSpecific && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--psd-muted)]" />}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>

                                    {isSpecific ? (
                                    <div>
                                        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--psd-heading)]">
                                            <FileText className="h-3.5 w-3.5 text-[var(--psd-primary)]" />
                                            Application types you can create ({allowedDoctypes.length})
                                        </h3>
                                        {allowedDoctypes.length === 0 ? (
                                            <p className="text-[12px] text-[var(--psd-body)]">No application types in this delegation.</p>
                                        ) : (
                                            <ul className="space-y-1.5">
                                                {allowedDoctypes.map((doctype) => (
                                                    <li key={doctype} className="rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] px-3 py-2 text-[12px] font-bold text-[#18181B] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]">
                                                        {doctype}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        <p className="mt-2 text-[11px] text-[var(--psd-body)]">
                                            You can create these under the projects listed, on {delegation.delegator_user}'s behalf. Existing applications are not visible to you.
                                        </p>
                                    </div>
                                    ) : (
                                    <div>
                                        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--psd-heading)]">
                                            <FileText className="h-3.5 w-3.5 text-[var(--psd-primary)]" />
                                            Applications ({applications.length})
                                        </h3>
                                        {delegation.scope_type === "all" ? (
                                            <p className="text-[12px] text-[var(--psd-body)]">
                                                Full access to all of {delegation.delegator_user}'s applications.
                                            </p>
                                        ) : applications.length === 0 ? (
                                            <p className="text-[12px] text-[var(--psd-body)]">No applications in this delegation.</p>
                                        ) : (
                                            <ul className="space-y-1.5">
                                                {applications.map((app) => (
                                                    <li key={`${app.doctype}-${app.name}`}>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(getApplicationRoute(app.doctype, app.name))}
                                                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-3 py-1.5 text-left transition-colors hover:border-[var(--psd-primary)]/50 hover:bg-[var(--psd-primary-light)]/40"
                                                        >
                                                            <span className="min-w-0">
                                                                <span className="block truncate text-[12px] font-bold text-[var(--psd-heading)]">
                                                                    {app.name}
                                                                </span>
                                                                <span className="block truncate text-[10px] font-semibold text-[var(--psd-body)]">
                                                                    {app.doctype}
                                                                </span>
                                                            </span>
                                                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--psd-muted)]" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </section>
            </>
            )}
        </div>
    );
};

export default DelegatedToMe;
