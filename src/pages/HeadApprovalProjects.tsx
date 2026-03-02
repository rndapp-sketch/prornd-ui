import React, { useState, useMemo, useEffect } from "react";
import {
  useFrappeGetDocList,
  useFrappeAuth,
} from "frappe-react-sdk";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "../components/RndSidebar";
import {
  FileSearchIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon as ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Interfaces & Types ---
interface Project {
  name: string;
  project_title: string;
  workflow_state: string;
  pi_webmail: string;
  creation?: string;
  modified?: string;
  implementation_department: string;
}

interface Department {
  name: string;
}

// --- Reusable UI Components ---
const FrappeButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "px-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md font-bold text-zinc-900 dark:text-zinc-100 shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all",
      "hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px]",
      "active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
      "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:bg-zinc-200 dark:bg-zinc-700 disabled:translate-x-0 disabled:translate-y-0",
      className
    )}
    {...props}
  >
    {children}
  </button>
));
FrappeButton.displayName = "FrappeButton";

const FrappeCard = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-sm",
      className
    )}
  >
    {children}
  </div>
);

const getStatusBadge = (status: string) => {
  const s = status?.toLowerCase();
  let style = "bg-sky-300";
  if (["pending", "under review", "approval pending", "pending head approval"].some(t => s?.includes(t))) style = "bg-amber-300";
  else if (s?.includes("approved")) style = "bg-green-300";
  else if (s?.includes("draft")) style = "bg-slate-300";
  else if (s?.includes("rejected")) style = "bg-red-500 text-white";
  return cn("inline-block px-2.5 py-1 rounded-md text-xs font-bold border border-zinc-200 dark:border-zinc-800", style);
};


export function HeadApprovalProjects() {
  // --- State Management ---
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"creation" | "name" | "project_title" | "workflow_state">("creation");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [userDepartments, setUserDepartments] = useState<string[]>([]);

  const navigate = useNavigate();
  const { currentUser } = useFrappeAuth();

  // --- Data Fetching ---

  // Step 1: Fetch the departments where the current user is the head approver.
  const { data: departmentsData, isLoading: departmentsLoading } = useFrappeGetDocList<Department>(
    "Department_prornd",
    {
      fields: ["name"],
      filters: [["head_approver", "=", currentUser || ""]],
      limit: 1000,
    },
    // **FIX**: `enabled` is passed as a second argument (query options)
    { enabled: !!currentUser }
  );

  useEffect(() => {
    if (departmentsData) {
      setUserDepartments(departmentsData.map(d => d.name));
    }
  }, [departmentsData]);

  const projectFilters = useMemo(() => {
    if (userDepartments.length === 0) return [["name", "=", "NON_EXISTENT_DOC"]];
    return [
      ["implementation_department", "in", userDepartments],
      ["workflow_state", "in", ["Pending Head Approval", "Approved"]],
    ];
  }, [userDepartments]);


  // Step 2: Fetch projects using the combined filters.
  const {
    data: projects,
    isLoading: projectsLoading,
    error: projectsError,
  } = useFrappeGetDocList<Project>(
    "Project Registration",
    {
      fields: ["name", "project_title", "workflow_state", "pi_webmail", "creation", "modified", "implementation_department"],
      filters: projectFilters as any,
      limit: 1000,
    },
    // **FIX**: `enabled` is passed as a second argument (query options)
    { enabled: !!currentUser && !departmentsLoading && userDepartments.length > 0 }
  );

  const isLoading = departmentsLoading || projectsLoading;

  // --- Filtering and Sorting (Client-side) ---
  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return [];
    let filtered = projects.filter((p) =>
      Object.values(p).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortField] ?? "";
      const bVal = (b as any)[sortField] ?? "";
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [projects, searchQuery, sortField, sortOrder]);

  // --- Pagination ---
  const totalPages = Math.ceil(filteredAndSortedProjects.length / itemsPerPage);
  const paginatedProjects = filteredAndSortedProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- Handlers ---
  const handleSortChange = (field: "creation" | "name" | "project_title" | "workflow_state") => {
    setSortField(field);
    setSortOrder(sortField === field && sortOrder === "desc" ? "asc" : "desc");
    setCurrentPage(1);
  };
  const getSortIcon = (field: string) => sortField === field ? (sortOrder === "asc" ? "↑" : "↓") : "";

  // --- Render Function for the Table ---
  const renderProjectsTable = () => (
    <div className="space-y-8">
      <FrappeCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 dark:text-zinc-400" />
            <Input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-10 h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400 font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)]"
            />
          </div>
          <div className="flex gap-3">
            <Select value={sortField} onValueChange={(v: any) => handleSortChange(v)}>
              <SelectTrigger className="h-12 w-full sm:w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                <SelectItem value="creation">Latest</SelectItem>
                <SelectItem value="name">Project Number</SelectItem>
                <SelectItem value="project_title">Project Title</SelectItem>
                <SelectItem value="workflow_state">Status</SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
              <SelectTrigger className="h-12 w-full sm:w-32 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md font-bold shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                <SelectValue placeholder="Show" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-[2px_2px_0px_rgba(0,0,0,0.25)]">
                {[5, 10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>Show {n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </FrappeCard>
      <FrappeCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <Table className="divide-y-2 divide-zinc-100 dark:divide-zinc-800">
            <TableHeader>
              <TableRow className="divide-x-2 divide-zinc-100 dark:divide-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                {(["Project Number", "Project Title", "Status"] as const).map(
                  (field) => {
                    const fieldKey = field === "Project Number" ? "name" : field === "Project Title" ? "project_title" : "workflow_state";
                    return (
                      <TableHead key={field} className="p-3 font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider cursor-pointer hover:bg-[#A5B4FC]" onClick={() => handleSortChange(fieldKey)}>
                        {field} {getSortIcon(fieldKey)}
                      </TableHead>
                    );
                  }
                )}
                <TableHead className="p-3 font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y-2 divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
              {isLoading && (<TableRow><TableCell colSpan={4} className="h-32 text-center font-bold">LOADING PROJECTS...</TableCell></TableRow>)}
              {projectsError && (<TableRow><TableCell colSpan={4} className="h-32 text-center font-bold text-red-600">ERROR LOADING PROJECTS</TableCell></TableRow>)}
              {!isLoading && !projectsError && paginatedProjects.length > 0 ? paginatedProjects.map((p) => (
                <TableRow key={p.name} className="divide-x-2 divide-zinc-100 dark:divide-zinc-800 hover:bg-slate-100">
                  <TableCell className="p-4 font-mono font-bold">{p.name}</TableCell>
                  <TableCell className="p-4">{p.project_title}</TableCell>
                  <TableCell className="p-4"><span className={getStatusBadge(p.workflow_state)}>{p.workflow_state}</span></TableCell>
                  <TableCell className="p-4 text-right">
                    <FrappeButton onClick={() => navigate(`/project-details/${p.name}`)} className="text-sm">
                      View Details
                    </FrappeButton>
                  </TableCell>
                </TableRow>
              )) : !projectsError && !isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <FileSearchIcon className="h-16 w-16 text-zinc-400 dark:text-zinc-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">NO PROJECTS FOUND</h3>
                    <p className="text-zinc-700 dark:text-zinc-300 font-mono mt-2">There are no projects matching your criteria at this time.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </FrappeCard>
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">PAGE {currentPage} OF {totalPages}</div>
          <div className="flex items-center gap-2">
            <FrappeButton onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1}><ChevronLeftIcon className="h-4 w-4" /></FrappeButton>
            <FrappeButton onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></FrappeButton>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-claude-bg">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
        <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight uppercase mb-8">
          Projects for Head Approval
        </h1>
        {renderProjectsTable()}
      </main>
    </div>
  );
}

export default HeadApprovalProjects;