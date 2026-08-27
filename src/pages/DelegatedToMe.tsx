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
    "rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm";

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
    <span className="rounded-full border border-[#C7D2FE] bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#1E3A8A] dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/15 dark:text-[#C7D2FE]">
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

const EmptyState = ({ label }: { label: string }) => (
    <div className="flex min-h-28 flex-col items-center justify-center rounded-lg border border-dashed border-[#D4D4D8] bg-[#FAFAF9] p-4 text-center dark:border-[#52525B] dark:bg-[#18181B]">
        <CheckCircle2 className="mb-2 h-5 w-5 text-[#A1A1AA]" />
        <p className="text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">{label}</p>
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
            <div className="flex min-h-[55vh] items-center justify-center">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                    <Loader2 className="h-4 w-4 animate-spin text-[#4A6CF7]" />
                    Loading delegated access...
                </div>
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
                                <Share2 className="h-4 w-4 text-[#4A6CF7] dark:text-[#93C5FD]" />
                            </span>
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#D97757]">Delegation</span>
                        </div>
                        <h1 className="text-[22px] font-extrabold tracking-normal text-[#18181B] dark:text-[#E4E4E7]">
                            Delegated to Me
                        </h1>
                        <p className="mt-1 max-w-3xl text-[13px] font-medium leading-6 text-[#71717A] dark:text-[#A1A1AA]">
                            Projects and applications that other users have shared access to. You can view and act on these based on the access level granted.
                        </p>
                    </div>
                    <div className="rounded-lg border border-[#C7D2FE] bg-[#EEF2FF] px-3 py-2 text-[12px] font-semibold text-[#1E3A8A] dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/15 dark:text-[#C7D2FE]">
                        Signed in as {currentUser}
                    </div>
                </div>
            </header>

            <div className="flex gap-2 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                <button
                    type="button"
                    onClick={() => setActiveTab("received")}
                    className={cn(
                        "px-3 py-2 text-[12px] font-bold transition-colors",
                        activeTab === "received"
                            ? "border-b-2 border-[#4A6CF7] text-[#4A6CF7]"
                            : "text-[#71717A] hover:text-[#18181B] dark:text-[#A1A1AA] dark:hover:text-[#E4E4E7]",
                    )}
                >
                    Received Delegations
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("create")}
                    className={cn(
                        "px-3 py-2 text-[12px] font-bold transition-colors",
                        activeTab === "create"
                            ? "border-b-2 border-[#4A6CF7] text-[#4A6CF7]"
                            : "text-[#71717A] hover:text-[#18181B] dark:text-[#A1A1AA] dark:hover:text-[#E4E4E7]",
                    )}
                >
                    Create on Behalf
                </button>
            </div>

            {activeTab === "create" && <CreateApplicationOnBehalf hideHeader />}

            {activeTab === "received" && (
            <>
            <section className="grid gap-4 sm:grid-cols-3">
                <SummaryCard icon={UserCircle2} label="Delegators" value={activeDelegations.length} />
                <SummaryCard icon={FolderKanban} label="Delegated Projects" value={delegatedProjectNames.length} />
                <SummaryCard icon={FileText} label="Delegated Applications" value={totalDelegatedApplications} />
            </section>

            <section className="space-y-4">
                {activeDelegations.length === 0 ? (
                    <div className={cn(cardClasses, "p-5")}>
                        <EmptyState label="No one has delegated any projects or applications to you yet." />
                    </div>
                ) : (
                    activeDelegations.map((delegation) => {
                        const projectNames = parseJsonArray<string>(delegation.project_names);
                        const applications = parseJsonArray<DelegatedApplication>(delegation.applications);

                        return (
                            <div key={delegation.name} className={cn(cardClasses, "overflow-hidden")}>
                                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4E4E7] bg-[#FAFAF9] px-4 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#4A6CF7] dark:bg-[#27272A] dark:text-[#93C5FD]">
                                            <UserCircle2 className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-[13px] font-extrabold text-[#18181B] dark:text-[#E4E4E7]">
                                                {delegation.delegator_user}
                                            </div>
                                            <div className="mt-1 flex flex-wrap gap-1.5">
                                                <Badge>{delegation.delegation_type || "View Only"}</Badge>
                                                <Badge>{delegation.scope_type || "project"} scope</Badge>
                                            </div>
                                        </div>
                                    </div>
                                    {(delegation.valid_from || delegation.valid_to) && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                            <Clock className="h-3.5 w-3.5" />
                                            {formatDelegationDateTime(delegation.valid_from) || "Now"} to {formatDelegationDateTime(delegation.valid_to) || "No expiry"}
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-4 p-4 md:grid-cols-2">
                                    <div>
                                        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#3F3F46] dark:text-[#D4D4D8]">
                                            <FolderKanban className="h-3.5 w-3.5 text-[#4A6CF7]" />
                                            Projects ({projectNames.length})
                                        </h3>
                                        {delegation.scope_type === "all" ? (
                                            <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                                Full access to all of {delegation.delegator_user}'s projects.
                                            </p>
                                        ) : projectNames.length === 0 ? (
                                            <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">No projects in this delegation.</p>
                                        ) : (
                                            <ul className="space-y-1.5">
                                                {projectNames.map((projectName) => {
                                                    const project = projectLookup.get(projectName);
                                                    return (
                                                        <li key={projectName}>
                                                            <button
                                                                type="button"
                                                                onClick={() => navigate(`/project-details-overview/${projectName}`)}
                                                                className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] px-3 py-2 text-left transition-colors hover:bg-white dark:border-[#3F3F46] dark:bg-[#18181B] dark:hover:bg-[#27272A]"
                                                            >
                                                                <span className="min-w-0">
                                                                    <span className="block truncate text-[12px] font-bold text-[#18181B] dark:text-[#E4E4E7]">
                                                                        {project?.project_title || projectName}
                                                                    </span>
                                                                    <span className="block truncate text-[10px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                                                        {project?.project_no || projectName}
                                                                    </span>
                                                                </span>
                                                                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide text-[#3F3F46] dark:text-[#D4D4D8]">
                                            <FileText className="h-3.5 w-3.5 text-[#4A6CF7]" />
                                            Applications ({applications.length})
                                        </h3>
                                        {delegation.scope_type === "all" ? (
                                            <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                                Full access to all of {delegation.delegator_user}'s applications.
                                            </p>
                                        ) : applications.length === 0 ? (
                                            <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">No applications in this delegation.</p>
                                        ) : (
                                            <ul className="space-y-1.5">
                                                {applications.map((app) => (
                                                    <li key={`${app.doctype}-${app.name}`}>
                                                        <button
                                                            type="button"
                                                            onClick={() => navigate(getApplicationRoute(app.doctype, app.name))}
                                                            className="flex w-full items-center justify-between gap-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] px-3 py-2 text-left transition-colors hover:bg-white dark:border-[#3F3F46] dark:bg-[#18181B] dark:hover:bg-[#27272A]"
                                                        >
                                                            <span className="min-w-0">
                                                                <span className="block truncate text-[12px] font-bold text-[#18181B] dark:text-[#E4E4E7]">
                                                                    {app.name}
                                                                </span>
                                                                <span className="block truncate text-[10px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                                                    {app.doctype}
                                                                </span>
                                                            </span>
                                                            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[#A1A1AA]" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
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
