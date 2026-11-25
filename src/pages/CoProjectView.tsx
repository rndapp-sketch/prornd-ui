import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import * as React from "react";
import { useFrappeAuth, useFrappeGetDoc, useFrappeGetDocList } from "frappe-react-sdk";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
    ChevronRightIcon,
    ChevronsUpDown,
    SearchIcon,
    UsersIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import "@/pages/dashboards/projectStaffDashboard.css";

interface ProjectPerson {
    pi_name?: string;
    pi_email?: string;
    copi_name?: string;
    copi_email?: string;
    [key: string]: unknown;
}

interface Project {
    name: string;
    project_title?: string;
    project_no?: string;
    workflow_state?: string;
    project_type?: string;
    funding_agen?: string;
    creation?: string;
    modified?: string;
    additional_pi_table?: ProjectPerson[];
    co_investigator_table?: ProjectPerson[];
}

type SortField = "creation" | "modified" | "name" | "project_title" | "workflow_state";

const normalize = (value?: string | null) => (value || "").trim().toLowerCase();
const unique = <T,>(values: T[]) => Array.from(new Set(values));
const DEBUG_CO_PROJECTS = true;

const debugCoProjects = (...args: unknown[]) => {
    if (DEBUG_CO_PROJECTS) {
    }
};

const isStringValue = (value: unknown): value is string | number =>
    typeof value === "string" || typeof value === "number";

const rowMatchesCurrentUser = (row: ProjectPerson, candidates: Set<string>) => {
    const values = Object.values(row)
        .filter(isStringValue)
        .map((value) => normalize(String(value)))
        .filter(Boolean);

    return values.some((value) =>
        Array.from(candidates).some((candidate) => {
            if (!candidate) return false;
            if (value === candidate) return true;
            if (candidate.includes("@")) return value.includes(candidate);
            return value.includes(candidate) || candidate.includes(value);
        }),
    );
};

const getProjectCoPeopleRows = (project: Project) => {
    const rows: ProjectPerson[] = [
        ...(project.additional_pi_table ?? []),
        ...(project.co_investigator_table ?? []),
    ];

    Object.entries(project).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase();
        if (
            Array.isArray(value) &&
            (lowerKey.includes("additional") ||
                lowerKey.includes("co_investigator") ||
                lowerKey.includes("copi") ||
                lowerKey.includes("co_pi"))
        ) {
            rows.push(...(value as ProjectPerson[]));
        }
    });

    return rows;
};

const isApprovedProject = (project: Project) => {
    const status = normalize(project.workflow_state);
    return status.includes("approved");
};

const getStatusBadge = (status?: string) => {
    const s = normalize(status);
    let tone = "bg-[var(--psd-info-bg)] text-[#2F5BC4] dark:text-blue-300";
    let dot = "bg-[var(--psd-info)]";

    if (s.includes("pending") || s.includes("review") || s.includes("process")) {
        tone = "bg-[var(--psd-review-bg)] text-[#B45309] dark:text-amber-300";
        dot = "bg-[var(--psd-review)]";
    } else if (s.includes("approved") || s.includes("open")) {
        tone = "bg-[var(--psd-approved-bg)] text-[#0A7F58] dark:text-emerald-300";
        dot = "bg-[var(--psd-approved)]";
    } else if (s.includes("rejected") || s.includes("closed") || !s || s.includes("draft")) {
        tone = "bg-[var(--psd-returned-bg)] text-[#C42B3C] dark:text-rose-300";
        dot = "bg-[var(--psd-returned)]";
    }

    return (
        <span className={cn("inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", tone)}>
            <span className={cn("size-1.5 rounded-full", dot)} />
            {status || "Draft"}
        </span>
    );
};

export default function CoProjectView() {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const { data: userDoc } = useFrappeGetDoc("User", currentUser || "", currentUser ? undefined : null);
    const {
        data: projectStubs,
        isLoading: isProjectListLoading,
        error: projectListError,
    } = useFrappeGetDocList<Project>("Project Registration", {
        fields: ["name", "project_title", "project_no", "workflow_state", "project_type", "funding_agen", "creation", "modified"],
        filters: [],
        limit: 2000,
    });

    const { data: fundingAgencies } = useFrappeGetDocList("fundingagency_", {
        fields: ["name", "funding_agency_name"],
        limit: 0,
    } as any);

    const [searchQuery, setSearchQuery] = React.useState("");
    const [sortField, setSortField] = React.useState<SortField>("creation");
    const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
    const [projects, setProjects] = React.useState<Project[]>([]);
    const [isProjectDetailsLoading, setIsProjectDetailsLoading] = React.useState(false);
    const [projectDetailsError, setProjectDetailsError] = React.useState<string | null>(null);
    const [childMatchedProjectNames, setChildMatchedProjectNames] = React.useState<string[]>([]);
    const [isChildLookupLoading, setIsChildLookupLoading] = React.useState(false);
    const [childLookupError, setChildLookupError] = React.useState<string | null>(null);
    const [usedBackendMethod, setUsedBackendMethod] = React.useState(false);

    React.useEffect(() => {
        let cancelled = false;

        const fetchChildMatches = async () => {
            const candidateEmails = unique([currentUser, userDoc?.email].map(normalize).filter(Boolean));
            debugCoProjects("current user candidates", {
                currentUser,
                userEmail: userDoc?.email,
                candidateEmails,
            });
            if (!candidateEmails.length) {
                setChildMatchedProjectNames([]);
                setChildLookupError(null);
                setIsChildLookupLoading(false);
                return;
            }

            setIsChildLookupLoading(true);
            setChildLookupError(null);
            setUsedBackendMethod(false);

            const fetchBackendCoProjects = async () => {
                const url = `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_co_projects`;
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ user: currentUser }),
                });
                debugCoProjects("backend co-project method request", {
                    url,
                    status: response.status,
                    currentUser,
                });
                if (!response.ok) {
                    const body = await response.text();
                    debugCoProjects("backend co-project method failed", {
                        status: response.status,
                        body,
                    });
                    return null;
                }
                const result = await response.json();
                const docs = (result?.message?.projects || result?.message || result?.data || []) as Project[];
                debugCoProjects("backend co-project method result", {
                    count: Array.isArray(docs) ? docs.length : 0,
                    docs,
                });
                return Array.isArray(docs) ? docs : [];
            };

            const backendProjects = await fetchBackendCoProjects();
            if (backendProjects) {
                if (!cancelled) {
                    setProjects(backendProjects);
                    setChildMatchedProjectNames(backendProjects.map((project) => project.name).filter(Boolean));
                    setUsedBackendMethod(true);
                    setIsChildLookupLoading(false);
                }
                return;
            }

            const fetchParents = async (
                childDoctype: string,
                childTableFieldname: string,
                fieldname: string,
                email: string,
            ) => {
                const strategies = [
                    {
                        name: "rest-child-doctype-filter",
                        request: async () => {
                            const params = new URLSearchParams({
                                fields: JSON.stringify(["name"]),
                                filters: JSON.stringify([[childDoctype, fieldname, "=", email]]),
                                limit_page_length: "0",
                            });
                            const url = `${FRAPPE_BASE_URL}/api/resource/Project%20Registration?${params.toString()}`;
                            const response = await fetch(url, { credentials: "include" });
                            return { response, url };
                        },
                    },
                    {
                        name: "rest-child-table-dot-filter",
                        request: async () => {
                            const params = new URLSearchParams({
                                fields: JSON.stringify(["name"]),
                                filters: JSON.stringify([[`${childTableFieldname}.${fieldname}`, "=", email]]),
                                limit_page_length: "0",
                            });
                            const url = `${FRAPPE_BASE_URL}/api/resource/Project%20Registration?${params.toString()}`;
                            const response = await fetch(url, { credentials: "include" });
                            return { response, url };
                        },
                    },
                    {
                        name: "method-child-doctype-filter",
                        request: async () => {
                            const url = `${FRAPPE_BASE_URL}/api/method/frappe.client.get_list`;
                            const response = await fetch(url, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({
                                    doctype: "Project Registration",
                                    fields: ["name"],
                                    filters: [[childDoctype, fieldname, "=", email]],
                                    limit_page_length: 0,
                                }),
                            });
                            return { response, url };
                        },
                    },
                    {
                        name: "method-child-table-dot-filter",
                        request: async () => {
                            const url = `${FRAPPE_BASE_URL}/api/method/frappe.client.get_list`;
                            const response = await fetch(url, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                credentials: "include",
                                body: JSON.stringify({
                                    doctype: "Project Registration",
                                    fields: ["name"],
                                    filters: [[`${childTableFieldname}.${fieldname}`, "=", email]],
                                    limit_page_length: 0,
                                }),
                            });
                            return { response, url };
                        },
                    },
                ];

                const allParents: string[] = [];

                for (const strategy of strategies) {
                    const { response, url } = await strategy.request();
                    debugCoProjects("parent child-filter request", {
                        strategy: strategy.name,
                        childDoctype,
                        childTableFieldname,
                        fieldname,
                        email,
                        url,
                        status: response.status,
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        debugCoProjects("parent child-filter failed", {
                            strategy: strategy.name,
                            childDoctype,
                            childTableFieldname,
                            fieldname,
                            email,
                            status: response.status,
                            body: errorText,
                        });
                        continue;
                    }

                    const result = await response.json();
                    const rows = result?.data || result?.message || [];
                    const parents = rows
                        .map((row: any) => row.name)
                        .filter((parent: unknown): parent is string => typeof parent === "string" && parent.length > 0);

                    debugCoProjects("parent child-filter result", {
                        strategy: strategy.name,
                        childDoctype,
                        childTableFieldname,
                        fieldname,
                        email,
                        count: parents.length,
                        parents,
                        raw: rows,
                    });

                    allParents.push(...parents);
                }

                return unique(allParents);
            };

            try {
                const parentLists = await Promise.all(
                    candidateEmails.flatMap((email) => [
                        fetchParents("Project Co-Investigator", "co_investigator_table", "copi_email", email),
                        fetchParents("Project Additional PI", "additional_pi_table", "pi_email", email),
                    ]),
                );
                const matchedNames = unique(parentLists.flat());
                debugCoProjects("child matched parent project names", matchedNames);
                if (!cancelled) setChildMatchedProjectNames(matchedNames);
            } catch (error: any) {
                debugCoProjects("child lookup error", error);
                if (!cancelled) {
                    setChildMatchedProjectNames([]);
                    setChildLookupError(error?.message || "Failed to find co-project child rows.");
                }
            } finally {
                if (!cancelled) setIsChildLookupLoading(false);
            }
        };

        fetchChildMatches();

        return () => {
            cancelled = true;
        };
    }, [currentUser, userDoc?.email]);

    const projectNamesToLoad = React.useMemo(() => {
        if (usedBackendMethod) return [];
        if (childMatchedProjectNames.length > 0) return childMatchedProjectNames;
        return (projectStubs ?? []).map((project) => project.name);
    }, [childMatchedProjectNames, projectStubs, usedBackendMethod]);

    React.useEffect(() => {
        debugCoProjects("project names to load", {
            childMatchedProjectNames,
            projectStubCount: projectStubs?.length || 0,
            projectNamesToLoad,
        });
    }, [childMatchedProjectNames, projectNamesToLoad, projectStubs?.length]);

    React.useEffect(() => {
        let cancelled = false;

        const fetchProjectDetails = async () => {
            if (!projectNamesToLoad.length) {
                if (usedBackendMethod) {
                    setProjectDetailsError(null);
                    setIsProjectDetailsLoading(false);
                    return;
                }
                setProjects([]);
                setProjectDetailsError(null);
                setIsProjectDetailsLoading(false);
                return;
            }

            setIsProjectDetailsLoading(true);
            setProjectDetailsError(null);

            try {
                const docs = await Promise.all(
                    projectNamesToLoad.map(async (projectName) => {
                        try {
                            const response = await fetch(
                                `${FRAPPE_BASE_URL}/api/resource/Project%20Registration/${encodeURIComponent(projectName)}`,
                                { credentials: "include" },
                            );
                            debugCoProjects("project detail request", {
                                projectName,
                                status: response.status,
                            });
                            if (!response.ok) throw new Error(`HTTP ${response.status}`);
                            const result = await response.json();
                            debugCoProjects("project detail result", {
                                projectName,
                                hasAdditionalPiTable: Array.isArray(result?.data?.additional_pi_table),
                                additionalPiCount: result?.data?.additional_pi_table?.length || 0,
                                hasCoInvestigatorTable: Array.isArray(result?.data?.co_investigator_table),
                                coInvestigatorCount: result?.data?.co_investigator_table?.length || 0,
                                data: result?.data,
                            });
                            return (result?.data || { name: projectName }) as Project;
                        } catch (error) {
                            return { name: projectName } as Project;
                        }
                    }),
                );

                debugCoProjects("loaded project detail docs", {
                    count: docs.length,
                    names: docs.map((doc) => doc.name),
                });
                if (!cancelled) setProjects(docs);
            } catch (error: any) {
                debugCoProjects("project detail lookup error", error);
                if (!cancelled) {
                    setProjects([]);
                    setProjectDetailsError(error?.message || "Failed to load co-project details.");
                }
            } finally {
                if (!cancelled) setIsProjectDetailsLoading(false);
            }
        };

        fetchProjectDetails();

        return () => {
            cancelled = true;
        };
    }, [projectNamesToLoad, usedBackendMethod]);

    const currentUserNames = React.useMemo(
        () =>
            new Set(
                [
                    currentUser,
                    currentUser?.split("@")[0],
                    userDoc?.email,
                    userDoc?.username,
                    userDoc?.full_name,
                    userDoc?.first_name,
                    userDoc?.last_name,
                ]
                    .map(normalize)
                    .filter(Boolean),
            ),
        [
            currentUser,
            userDoc?.email,
            userDoc?.first_name,
            userDoc?.full_name,
            userDoc?.last_name,
            userDoc?.username,
        ],
    );

    const fundingAgencyNameMap = React.useMemo(() => {
        const map = new Map<string, string>();
        (fundingAgencies ?? []).forEach((agency: any) => {
            if (agency.name && agency.funding_agency_name) {
                map.set(agency.name, agency.funding_agency_name);
            }
        });
        return map;
    }, [fundingAgencies]);

    const coProjects = React.useMemo(() => {
        if (!projects || currentUserNames.size === 0) return [];

        if (childMatchedProjectNames.length > 0) {
            debugCoProjects("using child matched projects without in-memory row filter", {
                count: projects.length,
                names: projects.map((project) => project.name),
            });
            return projects;
        }

        const matched = projects.filter((project) => {
            const people = getProjectCoPeopleRows(project);
            const doesMatch = people.some((person) => rowMatchesCurrentUser(person, currentUserNames));
            debugCoProjects("fallback in-memory project match", {
                project: project.name,
                candidateUsers: Array.from(currentUserNames),
                people,
                doesMatch,
            });
            return people.some((person) => rowMatchesCurrentUser(person, currentUserNames));
        });
        debugCoProjects("fallback in-memory matched projects", {
            count: matched.length,
            names: matched.map((project) => project.name),
        });
        return matched;
    }, [childMatchedProjectNames.length, projects, currentUserNames]);

    const filteredAndSortedProjects = React.useMemo(() => {
        const q = normalize(searchQuery);
        const filtered = coProjects.filter((project) =>
            [
                project.name,
                project.project_no,
                project.project_title,
                project.workflow_state,
                project.project_type,
                fundingAgencyNameMap.get(project.funding_agen || ""),
                project.funding_agen,
            ].some((value) => normalize(value).includes(q)),
        );

        filtered.sort((a, b) => {
            const aVal = String((a as any)[sortField] ?? "");
            const bVal = String((b as any)[sortField] ?? "");
            if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
            if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [coProjects, fundingAgencyNameMap, searchQuery, sortField, sortOrder]);

    React.useEffect(() => {
        debugCoProjects("final visible co-projects", {
            totalCoProjects: coProjects.length,
            visibleAfterSearch: filteredAndSortedProjects.length,
            searchQuery,
            names: filteredAndSortedProjects.map((project) => project.name),
            childLookupError,
            projectDetailsError,
        });
    }, [childLookupError, coProjects, filteredAndSortedProjects, projectDetailsError, searchQuery]);

    const isLoading = isProjectListLoading || isChildLookupLoading || isProjectDetailsLoading;
    const error = projectDetailsError || (childMatchedProjectNames.length === 0 ? projectListError || childLookupError : null);

    const openProject = (project: Project) => {
        if (isApprovedProject(project)) {
            navigate(`/project-details-overview/${project.name}?coProject=1`);
            return;
        }
        navigate(`/project-details/${project.name}`);
    };

    return (
        <div className="psd-root w-full mx-auto space-y-2.5 animate-in fade-in duration-500">
            <header className="psd-hero relative flex items-center justify-between gap-3 overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2">
                <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                    <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                        <UsersIcon className="size-4" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">Project Registry</div>
                        <h1 className="mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">Co-Projects</h1>
                    </div>
                </div>
                <p className="relative z-10 hidden text-xs text-[var(--psd-body)] md:block">
                    Projects where you are listed as an Additional PI or Co-Investigator.
                </p>
            </header>

            {isLoading && (
                <div role="status" aria-live="polite" className="space-y-1">
                    <div className="psd-loadbar" />
                    <p className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--psd-body)]">
                        <span className="inline-flex gap-0.5" aria-hidden>
                            {[0, 1, 2].map((i) => (
                                <span key={i} className="size-1.5 animate-bounce rounded-full bg-[var(--psd-primary)]" style={{ animationDelay: `${i * 140}ms` }} />
                            ))}
                        </span>
                        Fetching your co-projects…
                    </p>
                </div>
            )}

            <div className="psd-card flex flex-col sm:flex-row gap-2.5 justify-between items-center !rounded-xl px-3 py-2">
                <div className="relative w-full sm:w-80">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]" />
                    <Input
                        placeholder="Search co-projects..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-8 pl-9 bg-[var(--psd-surface)] border-[var(--psd-border)] text-[13px] focus-visible:border-[var(--psd-primary)] focus-visible:ring-[var(--psd-primary)]/20"
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                        <SelectTrigger className="h-8 w-[175px] bg-[var(--psd-surface)] border-[var(--psd-border)] text-[13px]">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="creation">Creation Date</SelectItem>
                            <SelectItem value="modified">Modified Date</SelectItem>
                            <SelectItem value="name">Project Number</SelectItem>
                            <SelectItem value="project_title">Title</SelectItem>
                            <SelectItem value="workflow_state">Status</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                        className="h-8 w-8 bg-[var(--psd-surface)] border-[var(--psd-border)] shrink-0"
                    >
                        <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card className="psd-card overflow-hidden !rounded-xl !border-[var(--psd-border)] !bg-[var(--psd-surface)] !shadow-none">
                <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-[var(--psd-border)] px-3 py-2">
                        <div className="flex items-center gap-2">
                            <span className="grid size-6 place-items-center rounded-md bg-[var(--psd-primary-light)] text-[var(--psd-primary)]"><UsersIcon className="h-3.5 w-3.5" /></span>
                            <span className="text-[13px] font-bold text-[var(--psd-heading)]">
                                {filteredAndSortedProjects.length} Co-Project{filteredAndSortedProjects.length === 1 ? "" : "s"}
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <Table className="w-full">
                            <TableHeader className="bg-[#DCE6CD] dark:bg-[#34402B]">
                                <TableRow className="border-b border-[#BBC9A4] dark:border-[#4B5A3E] hover:bg-transparent">
                                    <TableHead className="w-[120px] whitespace-nowrap px-3 py-1.5 h-8 text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider relative after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D]">
                                        Number
                                    </TableHead>
                                    <TableHead className="min-w-[220px] px-3 py-1.5 h-8 text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider relative after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D]">
                                        Project Title
                                    </TableHead>
                                    <TableHead className="w-[160px] whitespace-nowrap px-3 py-1.5 h-8 text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider relative after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D]">
                                        Funding Agency
                                    </TableHead>
                                    <TableHead className="w-[110px] whitespace-nowrap px-3 py-1.5 h-8 text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider relative after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D]">
                                        Date
                                    </TableHead>
                                    <TableHead className="w-[130px] whitespace-nowrap px-3 py-1.5 h-8 text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider relative after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D]">
                                        Status
                                    </TableHead>
                                    <TableHead className="text-right w-[70px] whitespace-nowrap px-3 py-1.5 h-8 text-[10.5px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 6 }).map((_, index) => (
                                        <TableRow key={index} className="psd-row-in" style={{ animationDelay: `${index * 70}ms` }}>
                                            {[60, 90, 70, 55, 65, 30].map((w, cellIndex) => (
                                                <TableCell key={cellIndex} className="px-3 py-2.5">
                                                    <div className="psd-shimmer h-4" style={{ width: `${w}%`, animationDelay: `${index * 120}ms` }} />
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))
                                ) : error ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-red-500">
                                            Error loading co-projects. Please try again.
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAndSortedProjects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                                            No co-projects found for your user.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAndSortedProjects.map((project) => (
                                        <TableRow
                                            key={project.name}
                                            className="cursor-pointer border-b border-[var(--psd-border)] last:border-b-0 hover:bg-[var(--psd-primary-light)]/40"
                                            onClick={() => openProject(project)}
                                        >
                                            <TableCell className="px-3 py-2 font-mono text-xs font-bold text-[#7A46AE] dark:text-[#D3B4F0] bg-[#F1E8F9] dark:bg-[#33243F] whitespace-nowrap border-b border-[#D8C6EC] dark:border-[#4A3A5C] [tr:last-child_&]:border-b-0 relative after:absolute after:right-0 after:top-[22%] after:h-[56%] after:w-px after:rounded-full after:bg-[#DDD0EE] dark:after:bg-[#4A3A5C]">
                                                {project.project_no || project.name}
                                            </TableCell>
                                            <TableCell className="px-3 py-2 font-semibold text-[13px] text-[var(--psd-heading)] relative after:absolute after:right-0 after:top-[22%] after:h-[56%] after:w-px after:rounded-full after:bg-[#DDE3D2] dark:after:bg-[#3F4A36]">
                                                <div className="line-clamp-2 min-w-[180px] max-w-[420px] leading-snug" title={project.project_title}>
                                                    {project.project_title || "-"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-3 py-2 text-[var(--psd-body)] text-xs whitespace-nowrap relative after:absolute after:right-0 after:top-[22%] after:h-[56%] after:w-px after:rounded-full after:bg-[#DDE3D2] dark:after:bg-[#3F4A36]">
                                                {fundingAgencyNameMap.get(project.funding_agen || "") || project.funding_agen || "-"}
                                            </TableCell>
                                            <TableCell className="px-3 py-2 text-[var(--psd-body)] text-xs whitespace-nowrap relative after:absolute after:right-0 after:top-[22%] after:h-[56%] after:w-px after:rounded-full after:bg-[#DDE3D2] dark:after:bg-[#3F4A36]">
                                                {project.creation ? format(new Date(project.creation), "MMM dd, yyyy") : "-"}
                                            </TableCell>
                                            <TableCell className="px-3 py-2 whitespace-nowrap relative after:absolute after:right-0 after:top-[22%] after:h-[56%] after:w-px after:rounded-full after:bg-[#DDE3D2] dark:after:bg-[#3F4A36]">
                                                {getStatusBadge(project.workflow_state)}
                                            </TableCell>
                                            <TableCell className="px-3 py-2 text-right whitespace-nowrap">
                                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                                    <ChevronRightIcon className="h-4 w-4" />
                                                    <span className="sr-only">View</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
