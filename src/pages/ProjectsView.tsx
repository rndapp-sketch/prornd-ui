import * as React from "react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom"; // Import useNavigate
import { AppSidebar } from "../components/RndSidebar";
import { useSidebar } from "@/components/ui/sidebar"; // Import useSidebar
import { useFrappeAuth, useFrappeGetDoc } from "frappe-react-sdk"; // Import useFrappeAuth and useFrappeGetDoc
import { useUserRoles } from "../components/UserRole"; // Import useUserRoles
import { WorkflowTimeline, type IWorkflowStage } from "../components/WorkflowTimeline"; // Import WorkflowTimeline and IWorkflowStage as type
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react"; // Import icons for dropdown

// ✅ Interfaces
interface Task {
  projectNumber: string;
  projectTitle: string;
  status?: string; // Optional: only used in pending tasks
  actionDate: string;
}

interface Project {
  name: string;
  project_title: string;
  workflow_state: string;
}

interface ProjectsViewProps {
  setActiveView?: (view: string) => void; // Made optional
  setSelectedProject?: (projectName: string | null) => void; // Made optional
  initialTab?: string;
}

// ✅ Strongly typed mock data (can be replaced with real data fetching)
const pendingTasks: Task[] = [];
const applicationsUnderReview: Task[] = [];

export function ProjectsView({ setActiveView, setSelectedProject, initialTab }: ProjectsViewProps) {
  const { state: sidebarState } = useSidebar();
  const [activeTab, setActiveTab] = React.useState(initialTab || "pending");
  const [openPipeline, setOpenPipeline] = React.useState<string | null>(null); // State to manage open pipeline
  const navigate = useNavigate(); // Initialize useNavigate

  const { currentUser } = useFrappeAuth();
  const { data: userData, isLoading: isUserLoading } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["roles"],
    enabled: !!currentUser,
  });

  let isPermanentEmployee = false;
  if (userData) {
    if (Array.isArray(userData.roles) && userData.roles.length > 0) {
      if (typeof userData.roles[0] === 'string') {
        isPermanentEmployee = userData.roles.includes("Permanent Employee");
      } else if (typeof userData.roles[0] === 'object' && userData.roles[0] !== null && 'role' in userData.roles[0]) {
        isPermanentEmployee = userData.roles.some((role: any) => role.role === "Permanent Employee");
      }
    }
  }

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const {
    data: myProjects,
    isLoading: myProjectsLoading,
    error: myProjectsError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["name", "project_title", "workflow_state"],
    limit: 100,
  });

  const renderContent = () => {
    switch (activeTab) {
      case "pending":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Number</TableHead>
                <TableHead>Project Title</TableHead>
                <TableHead>Application Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingTasks.length > 0 ? (
                pendingTasks.map((task: Task) => (
                  <TableRow key={task.projectNumber}>
                    <TableCell className="font-medium">{task.projectNumber}</TableCell>
                    <TableCell>{task.projectTitle}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${
                          task.status === "Under Review"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {task.status}
                      </span>
                    </TableCell>
                    <TableCell>{task.actionDate}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate(`/project-details/${task.projectNumber}`);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No pending tasks.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );

      case "myProjects":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Number</TableHead>
                <TableHead>Project Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myProjectsLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading projects...
                  </TableCell>
                </TableRow>
              )}
              {myProjectsError && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-red-500">
                    Error loading projects.
                  </TableCell>
                </TableRow>
              )}
              {!myProjectsError && myProjects && myProjects.length > 0 ? (
                myProjects.map((project: Project) => (
                  <React.Fragment key={project.name}>
                    <TableRow
                      onClick={() => setOpenPipeline(openPipeline === project.name ? null : project.name)}
                      className="cursor-pointer hover:bg-gray-50"
                    >
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.project_title}</TableCell>
                      <TableCell>{project.workflow_state}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click from triggering
                            navigate(`/project-details/${project.name}`);
                          }}
                        >
                          View
                        </Button>
                        {openPipeline === project.name ? (
                          <ChevronDownIcon className="ml-2 h-4 w-4 inline-block" />
                        ) : (
                          <ChevronRightIcon className="ml-2 h-4 w-4 inline-block" />
                        )}
                      </TableCell>
                    </TableRow>
                    {openPipeline === project.name && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <div className="p-4 bg-gray-50 rounded-md">
                            <h5 className="font-semibold mb-2">Workflow Pipeline for {project.project_title}</h5>
                            <WorkflowTimeline
                              stages={[
                                { id: 1, title: 'Draft', status: 'completed', description: 'Project created' },
                                { id: 2, title: 'Submitted', status: 'in-progress', description: 'Awaiting review' },
                                { id: 3, title: 'Approved', status: 'pending', description: 'Ready for execution' },
                                { id: 4, title: 'Completed', status: 'pending', description: 'Project finished' },
                              ]}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                !myProjectsError && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No projects found.
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        );

      case "underReview":
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Number</TableHead>
                <TableHead>Project Title</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applicationsUnderReview.length > 0 ? (
                applicationsUnderReview.map((task: Task) => (
                  <TableRow key={task.projectNumber}>
                    <TableCell className="font-medium">{task.projectNumber}</TableCell>
                    <TableCell>{task.projectTitle}</TableCell>
                    <TableCell>{task.actionDate}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigate(`/project-details/${task.projectNumber}`);
                        }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No applications under review.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <AppSidebar isPermanentEmployee={isPermanentEmployee} />
      <div className={`flex-1 ${sidebarState === 'collapsed' ? 'p-4 md:p-6' : ''}`}>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("pending")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "pending"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pending Tasks
            </button>
            <button
              onClick={() => setActiveTab("myProjects")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "myProjects"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Project Registered
            </button>
            <button
              onClick={() => setActiveTab("underReview")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "underReview"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Application Under Review
            </button>
          </nav>
        </div>

        <div className="mt-6">
          <div className="rounded-lg border bg-white shadow-sm">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectsView;
