import * as React from "react";
import { useFrappeAuth, useFrappeGetDoc, useFrappeGetDocList } from "frappe-react-sdk";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import {
    ChevronRightIcon,
    ChevronsUpDown,
    SearchIcon,
    UsersIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
    let className = "bg-zinc-100 text-zinc-800 border-zinc-200";

    if (s.includes("pending") || s.includes("review") || s.includes("process")) {
        className = "bg-amber-100 text-amber-800 border-amber-200";
    } else if (s.includes("approved") || s.includes("open")) {
        className = "bg-emerald-100 text-emerald-800 border-emerald-200";
    } else if (s.includes("rejected") || s.includes("closed")) {
        className = "bg-rose-100 text-rose-800 border-rose-200";
    }

    return (
        <Badge variant="outline" className={cn("border", className)}>
            {status || "Draft"}
        </Badge>
    );
};

export default function CoProjectView() {
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useFrappeAuth();
    const { data: userDoc } = useFrappeGetDoc("User", currentUser || "", {
        fields: ["full_name", "email", "username", "first_name", "last_name"],
        enabled: !!currentUser,
    });
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

    const [searchQuery, setSearchQuery] = React.useState(location.state?.searchQuery || "");
    const [sortField, setSortField] = React.useState<SortField>(location.state?.sortField || "creation");
    const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">(location.state?.sortOrder || "desc");
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
                const url = "/api/method/rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_co_projects";
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
                            const url = `/api/resource/Project%20Registration?${params.toString()}`;
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
                            const url = `/api/resource/Project%20Registration?${params.toString()}`;
                            const response = await fetch(url, { credentials: "include" });
                            return { response, url };
                        },
                    },
                    {
                        name: "method-child-doctype-filter",
                        request: async () => {
                            const url = "/api/method/frappe.client.get_list";
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
                            const url = "/api/method/frappe.client.get_list";
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
                                `/api/resource/Project%20Registration/${encodeURIComponent(projectName)}`,
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
        const state = {
            returnTo: location.pathname + location.search,
            searchQuery,
            sortField,
            sortOrder,
        };
        if (isApprovedProject(project)) {
            navigate(`/project-details-overview/${project.name}?coProject=1`, { state });
            return;
        }
        navigate(`/project-details/${project.name}`, { state });
    };

    return (
        <div className="w-full mx-auto space-y-5 animate-in fade-in duration-500">
            <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
                <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                <div className="flex flex-col gap-1 px-5 py-4">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
                        Project Registry
                    </span>
                    <h1 className="font-sans text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                        Co-Projects
                    </h1>
                    <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                        Projects where you are listed as an Additional PI or Co-Investigator.
                    </p>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-between items-center rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-3 shadow-sm">
                <div className="relative w-full sm:w-80">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]" />
                    <Input
                        placeholder="Search co-projects..."
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        className="h-9 pl-9 bg-[#FAFAF9] dark:bg-[#18181B] border-[#E4E4E7] dark:border-[#3F3F46] text-[13px]"
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Select value={sortField} onValueChange={(value) => setSortField(value as SortField)}>
                        <SelectTrigger className="h-9 w-[180px] bg-[#FAFAF9] dark:bg-[#18181B] border-[#E4E4E7] dark:border-[#3F3F46] text-[13px]">
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
                        className="h-9 w-9 bg-[#FAFAF9] dark:bg-[#18181B] border-[#E4E4E7] dark:border-[#3F3F46] shrink-0"
                    >
                        <ChevronsUpDown className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <Card className="border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden rounded-xl">
                <CardContent className="p-0">
                    <div className="flex items-center justify-between border-b border-[#E4E4E7] bg-[#FAFAF9] px-4 py-3 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <div className="flex items-center gap-2">
                            <UsersIcon className="h-4 w-4 text-[#4A6CF7]" />
                            <span className="text-[13px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                {filteredAndSortedProjects.length} Co-Project{filteredAndSortedProjects.length === 1 ? "" : "s"}
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto p-3">
                        <Table className="border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg overflow-hidden">
                            <TableHeader className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                                <TableRow className="border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 hover:bg-transparent">
                                    <TableHead className="w-[120px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                                        Number
                                    </TableHead>
                                    <TableHead className="min-w-[220px] px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                                        Project Title
                                    </TableHead>
                                    <TableHead className="w-[160px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                                        Funding Agency
                                    </TableHead>
                                    <TableHead className="w-[110px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                                        Date
                                    </TableHead>
                                    <TableHead className="w-[130px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                                        Status
                                    </TableHead>
                                    <TableHead className="text-right w-[70px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 5 }).map((_, index) => (
                                        <TableRow key={index}>
                                            {Array.from({ length: 6 }).map((__, cellIndex) => (
                                                <TableCell key={cellIndex} className="px-4 py-3">
                                                    <div className="h-4 w-full max-w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
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
                                            className="cursor-pointer hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]/40 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-b-0"
                                            onClick={() => openProject(project)}
                                        >
                                            <TableCell className="px-4 py-3 font-mono text-xs font-semibold text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                {project.project_no || project.name}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 font-semibold text-[#3F3F46] dark:text-[#E4E4E7] border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                <div className="line-clamp-2 min-w-[180px] max-w-[420px]" title={project.project_title}>
                                                    {project.project_title || "-"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-[#52525B] dark:text-[#A1A1AA] text-xs whitespace-nowrap border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                {fundingAgencyNameMap.get(project.funding_agen || "") || project.funding_agen || "-"}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-[#71717A] text-xs whitespace-nowrap border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                {project.creation ? format(new Date(project.creation), "MMM dd, yyyy") : "-"}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 whitespace-nowrap border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                                                {getStatusBadge(project.workflow_state)}
                                            </TableCell>
                                            <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
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
