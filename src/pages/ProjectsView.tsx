import { FRAPPE_BASE_URL, toSameOriginFileUrl } from "@/utils/frappeUrl";
import * as React from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  useFrappeGetDocList,
  useFrappeGetCall,
  useFrappeAuth,
  useFrappeGetDoc,
  useFrappePostCall,
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
import { overheadFundAPI } from "@/services/apiService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ProInvButton from "@/components/ProInvButton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import {
  ChevronRightIcon as ChevronRight,
  SearchIcon,
  ChevronsUpDown,
  CheckCircle2,
  DownloadIcon,
  Trash2,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FolderKanban } from "lucide-react";
import "@/pages/dashboards/projectStaffDashboard.css";
import { useUserRoles } from "../components/UserRole";
import { projectTypeTabLabel } from "@/utils/projectTypeMapping";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// --- LOGIC: Interfaces & Data ---
interface Task {
  id: string;
  projectNumber: string;
  projectTitle: string;
  status?: string;
  actionDate: string;
  assignedTo?: string;
  priority?: "Low" | "Medium" | "High" | "Urgent";
}

interface Project {
  name: string;
  project_title: string;
  workflow_state: string;
  pi_webmail: string;
  creation?: string;
  modified?: string;
  head_approver?: string;
  owner?: string;
  project_no?: string;
  project_type?: string;
}

interface UserDelegation {
  name: string;
  delegator_user?: string;
  delegate_user?: string;
  delegation_type?: string;
  scope_type?: string;
  project_names?: string;
  valid_from?: string;
  valid_to?: string;
  enabled?: number;
}

type ProjectTypeTab = 'Research' | 'Consultancy' | 'Others' | 'Overhead';
const PROJECT_TYPE_TABS: ProjectTypeTab[] = ['Research', 'Consultancy', 'Others', 'Overhead'];

/**
 * The institute's overhead funds, which are surfaced as projects so they can be spent
 * from and approved like any other. PDF and DPF exist today; IDF / SWF / STWF are
 * listed now so they join the same tab automatically when they follow.
 */
const OVERHEAD_PROJECT_TYPES = ['pdf', 'dpf', 'idf', 'swf', 'stwf'];

const normalizeProjectType = (raw?: string): ProjectTypeTab => {
  if (!raw) return 'Others';
  const lower = raw.toLowerCase().trim();
  if (lower.includes('research')) return 'Research';
  if (lower.includes('consult')) return 'Consultancy';
  // Checked before the Others fallback, so an overhead fund gets its own tab rather than
  // being lumped in with everything unclassified. This is the tab approvers
  // (staff/HoS/Dean, RnD) act on for overhead applications.
  if (OVERHEAD_PROJECT_TYPES.includes(lower)) return 'Overhead';
  return 'Others';
};

const DORND_SIGNATURE_SEAL_URL = `${FRAPPE_BASE_URL}/files/Sign_dornd_stamp_rnd.jpg`;

const normalizeEndorsementHtmlForDownload = (html: string, projectName: string) => {
  const parser = new DOMParser();
  const document = parser.parseFromString(html, "text/html");
  const refValue = document.querySelector(".ref-no .value");
  if (refValue) refValue.textContent = `IITG-${projectName}`;

  document.querySelectorAll("img").forEach((image) => {
    const src = image.getAttribute("src") || "";
    const alt = image.getAttribute("alt") || "";
    if (src.includes("Sign_dornd_stamp_rnd.jpg") || src.includes("rohit_fake_sign") || alt.toLowerCase() === "signature") {
      image.remove();
      return;
    }
    image.setAttribute("src", toSameOriginFileUrl(src));
  });

  document.querySelectorAll(".signature").forEach((signature) => {
    signature.innerHTML = "";
    const image = document.createElement("img");
    image.src = toSameOriginFileUrl(DORND_SIGNATURE_SEAL_URL);
    image.alt = "Signature with seal";
    image.setAttribute("style", "height:112px;width:auto;object-fit:contain;margin-bottom:8px;");
    const label = document.createElement("div");
    label.textContent = "Signature of the Dean (R&D)";
    label.setAttribute("style", "font-weight:bold;");
    signature.appendChild(image);
    signature.appendChild(label);
  });

  if (!document.querySelector(".signature")) {
    const container = document.querySelector(".print-container") || document.body;
    const signature = document.createElement("div");
    signature.className = "signature";
    signature.setAttribute("style", "margin-top:72px;display:flex;flex-direction:column;align-items:flex-end;");
    const image = document.createElement("img");
    image.src = toSameOriginFileUrl(DORND_SIGNATURE_SEAL_URL);
    image.alt = "Signature with seal";
    image.setAttribute("style", "height:112px;width:auto;object-fit:contain;margin-bottom:8px;");
    const label = document.createElement("div");
    label.textContent = "Signature of the Dean (R&D)";
    label.setAttribute("style", "font-weight:bold;");
    signature.appendChild(image);
    signature.appendChild(label);
    container.appendChild(signature);
  }

  return /<html[\s>]/i.test(html) ? `<!DOCTYPE html>\n${document.documentElement.outerHTML}` : document.body.innerHTML;
};

const getEndorsementSrcDoc = (html: string) =>
  /<html[\s>]/i.test(html)
    ? html
    : `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{margin:0;padding:16px;}@media print{@page{margin:10mm;}}</style></head><body>${html}</body></html>`;

const waitForDocumentAssets = async (document: Document) => {
  if (document.fonts?.ready) await document.fonts.ready.catch(() => undefined);
  await Promise.all(
    Array.from(document.images).map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
          image.onload = () => resolve();
          image.onerror = () => resolve();
        }),
    ),
  );
};

const findWhitespaceCut = (
  canvas: HTMLCanvasElement,
  startY: number,
  targetY: number,
  maxY: number,
) => {
  if (maxY >= canvas.height) return canvas.height;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return Math.min(targetY, maxY);

  const searchStart = Math.max(startY + 180, targetY - 220);
  const searchEnd = Math.min(maxY - 40, targetY + 220);
  if (searchEnd <= searchStart) return Math.min(targetY, maxY);

  const width = canvas.width;
  const height = searchEnd - searchStart;
  const data = ctx.getImageData(0, searchStart, width, height).data;
  let bestY = targetY;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let localY = 0; localY < height; localY += 4) {
    let inkScore = 0;
    for (let x = 0; x < width; x += 12) {
      const index = (localY * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const a = data[index + 3];
      if (a > 12 && (r < 245 || g < 245 || b < 245)) {
        inkScore += 1;
      }
    }

    const absoluteY = searchStart + localY;
    const distancePenalty = Math.abs(absoluteY - targetY) / 60;
    const score = inkScore + distancePenalty;
    if (score < bestScore) {
      bestScore = score;
      bestY = absoluteY;
    }
  }

  return Math.max(startY + 120, Math.min(bestY, maxY));
};

const downloadEndorsementPdfFromHtml = async (html: string, projectName: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.width = "794px";
  iframe.style.height = "1123px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.setAttribute("sandbox", "allow-same-origin allow-modals");
  iframe.srcdoc = getEndorsementSrcDoc(html);
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
    });
    const iframeDocument = iframe.contentDocument;
    const target = iframeDocument?.querySelector(".print-container") as HTMLElement | null;
    if (!iframeDocument || !target) throw new Error("Printable endorsement container not found.");
    await waitForDocumentAssets(iframeDocument);

    const style = iframeDocument.createElement("style");
    style.textContent = `body{background:#fff!important;padding:0!important;margin:0!important;display:block!important}.print-container{box-shadow:none!important;width:210mm!important;min-height:297mm!important;margin:0 auto!important}`;
    iframeDocument.head.appendChild(style);

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      windowWidth: target.scrollWidth,
      windowHeight: target.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 15;
    const marginY = 18;
    const imgWidth = pageWidth - marginX * 2;
    const pageContentHeight = pageHeight - marginY * 2;
    const pixelsPerMm = canvas.width / imgWidth;
    const targetSliceHeight = Math.floor(pageContentHeight * pixelsPerMm);
    let sourceY = 0;
    let pageIndex = 0;

    while (sourceY < canvas.height) {
      const remaining = canvas.height - sourceY;
      const idealCut = sourceY + Math.min(targetSliceHeight, remaining);
      const cutY =
        remaining <= targetSliceHeight
          ? canvas.height
          : findWhitespaceCut(
            canvas,
            sourceY,
            idealCut,
            Math.min(canvas.height, sourceY + Math.floor(targetSliceHeight * 1.12)),
          );
      const sliceHeight = Math.max(1, cutY - sourceY);
      const pageCanvas = document.createElement("canvas");
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;
      const ctx = pageCanvas.getContext("2d");
      if (!ctx) throw new Error("Could not prepare PDF page.");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, sourceY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(
        pageCanvas.toDataURL("image/png"),
        "PNG",
        marginX,
        marginY,
        imgWidth,
        Math.min(sliceHeight / pixelsPerMm, pageContentHeight),
      );
      sourceY = cutY;
      pageIndex += 1;
    }

    pdf.save(`Endorsement_${projectName}.pdf`);
  } finally {
    iframe.remove();
  }
};

const parseDelegatedProjectNames = (raw?: string): string[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0);
    }
  } catch {
    return [];
  }
  return [];
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


interface ProjectsViewProps {
  initialTab?: string;
}

const pendingTasksData: Record<string, Task[]> = {
  "Temp Adv": [
    {
      id: "TA-001",
      projectNumber: "PRJ-2024-001",
      projectTitle: "Research Equipment Purchase",
      status: "Pending Approval",
      actionDate: "2024-01-15",
      assignedTo: "Finance Dept",
      priority: "High",
    },
  ],
  Travel: [
    {
      id: "TR-001",
      projectNumber: "PRJ-2024-003",
      projectTitle: "International Conference - Singapore",
      status: "Approval Pending",
      actionDate: "2024-01-20",
      assignedTo: "Travel Desk",
      priority: "High",
    },
  ],
  Leave: [
    {
      id: "LV-001",
      projectNumber: "N/A",
      projectTitle: "Medical Leave Application",
      status: "Pending",
      actionDate: "2024-01-12",
      assignedTo: "HR Manager",
      priority: "Medium",
    },
  ],
  "Rate Contract": [
    {
      id: "RC-001",
      projectNumber: "CON-2024-001",
      projectTitle: "Software License Renewal",
      status: "Under Negotiation",
      actionDate: "2024-01-18",
      assignedTo: "Procurement",
      priority: "High",
    },
  ],
};

export function ProjectsView({ initialTab }: ProjectsViewProps) {
  // --- LOGIC: All hooks and state management remain UNCHANGED ---
  const [activeTab, setActiveTab] = React.useState(
    initialTab || "myProjects",
  );
  // const [openPipeline, setOpenPipeline] = React.useState<string | null>(null); // Unused
  const [searchQuery, setSearchQuery] = React.useState("");
  const [sortField, setSortField] = React.useState<
    | "creation"
    | "name"
    | "project_title"
    | "workflow_state"
    | "modified"
    | "owner"
  >("creation");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");
  const [itemsPerPage, setItemsPerPage] = React.useState(10); // Unused set, but kept for future or consistency
  const [activeTaskTab, setActiveTaskTab] = React.useState(
    Object.keys(pendingTasksData)[0],
  );
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProjectType, setSelectedProjectType] = React.useState<ProjectTypeTab>(
    (searchParams.get('type') as ProjectTypeTab) ||
      (location.state as any)?.activeProjectType ||
      'Research',
  );
  const [currentPage, setCurrentPage] = React.useState(
    Number(searchParams.get('page')) || (location.state as any)?.currentPage || 1,
  );

  const updateProjectTypeTab = (tab: ProjectTypeTab) => {
    setSelectedProjectType(tab);
    setCurrentPage(1);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('type', tab);
    nextParams.set('page', '1');
    setSearchParams(nextParams, { replace: true });
  };

  const updateCurrentPage = (updater: (p: number) => number) => {
    setCurrentPage((p: number) => {
      const next = updater(p);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('page', String(next));
      setSearchParams(nextParams, { replace: true });
      return next;
    });
  };
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", currentUser ? undefined : null);
  const {
    roles: fetchedRoles,
    isLoading: isRolesLoading,
    error: rolesError,
  } = useUserRoles(currentUser ?? null);

  // The role list every check on this page uses. `useUserRoles` is the source of truth,
  // but it resolves asynchronously — the fallback keeps role-dependent rendering correct
  // on the first paint instead of briefly showing the wrong thing.
  const roles = React.useMemo<string[]>(
    () =>
      fetchedRoles?.length > 0
        ? fetchedRoles
        : (userData?.roles?.map((r: any) => r.role) ?? []),
    [userData, fetchedRoles],
  );

  const { isAdministrator, isPermanentEmployee } = React.useMemo(
    () => ({
      isAdministrator: roles.includes("Administrator"),
      isPermanentEmployee: roles.includes("Permanent Employee"),
    }),
    [roles],
  );

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if ((location.state as any)?.filter === "Application Under Process") {
      setActiveTab("pending");
    }
  }, [initialTab, location.state]);

  // Overhead funds: a PI with a credited PDF balance, and a department head whose
  // department has a credited DPF balance, each get an inbuilt pre-approved project.
  // Minted on first visit rather than in bulk, so nobody is handed an empty shell — the
  // backend skips any fund with no balance yet, and the call is a single indexed lookup
  // once the projects exist. One round trip covers every fund the user is entitled to.
  // See docs/pdf-project-implementation.md §5.1 / §10 and docs/dpf-project-implementation.md §5.1.
  const { call: ensureOverheadProjects } = useFrappePostCall<{
    message: { status: string; created: boolean; data: { pdf: string | null; dpf: string[] } };
  }>(overheadFundAPI.ensureProjects);

  const overheadEnsuredRef = React.useRef(false);

  const {
    data: myCreatedProjects,
    isLoading: createdLoading,
    error: createdError,
    mutate: mutateCreated,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: currentUser
      ? [["pi_webmail", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  React.useEffect(() => {
    if (!currentUser || overheadEnsuredRef.current) return;
    overheadEnsuredRef.current = true;

    ensureOverheadProjects({})
      .then((res) => {
        // Only refetch when something was actually created — the usual case is that the
        // projects already exist, or the user has no overhead balance and never gets one.
        if (res?.message?.created) mutateCreated();
      })
      .catch(() => {
        // Never let this block the project list. Someone with no overhead fund simply
        // doesn't see one; the backend already logs the reason.
      });
  }, [currentUser, ensureOverheadProjects, mutateCreated]);

  const {
    data: myApprovalProjects,
    isLoading: approvalLoading,
    error: approvalError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: currentUser
      ? [["head_approver", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    data: allProjectsForAdmin,
    isLoading: adminLoading,
    error: adminError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: [],
    limit: 1000,
  });

  const isHosRnd = fetchedRoles?.includes("Hos, RnD (Head of Section, RnD)");
  const isRndStaff = fetchedRoles?.includes("staff, RnD");
  const isDoRnd = fetchedRoles?.includes("Dean, RnD");

  // Pending Project Registrations actually routed to this user (same source as /pending-task).
  // Having the Dean/HoS/Staff role is not enough: the role-wide "Pending X Approval" queue
  // below also holds projects that are someone else's to approve.
  const { data: pendingTaskData } = useFrappeGetCall<{
    message: Record<string, Array<{ doctype?: string; name: string }> | undefined>;
  }>(
    isHosRnd || isRndStaff || isDoRnd
      ? "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_categorized_pending_task"
      : (null as unknown as string),
    { page_name: "pending-task" },
  );
  const assignedPendingProjectNames = React.useMemo(() => {
    if (!pendingTaskData?.message) return null;
    const names = new Set<string>();
    Object.values(pendingTaskData.message).forEach((rows) =>
      (rows ?? []).forEach((row) => {
        if (row?.doctype === "Project Registration") names.add(row.name);
      }),
    );
    return names;
  }, [pendingTaskData]);

  const {
    data: hosAprovalProjects,
    isLoading: hosLoading,
    error: hosError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: isHosRnd
      ? [["workflow_state", "=", "Pending HoS Approval"]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    data: doRndApprovalProjects,
    isLoading: doRndLoading,
    error: doRndError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: isDoRnd
      ? [["workflow_state", "=", "Pending Dean Approval"]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    data: rndstaffAprovalProjects,
    isLoading: rndstaffLoading,
    error: rndstaffError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: isRndStaff
      ? [["workflow_state", "=", "Pending Staff Approval"]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    data: myOwnedProjects,
    isLoading: ownedLoading,
    error: ownedError,
    mutate: mutateOwned,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: currentUser
      ? [["owner", "=", currentUser]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const {
    data: receivedDelegations,
    isLoading: delegatedRecordsLoading,
    error: delegatedRecordsError,
  } = useFrappeGetDocList<UserDelegation>("User Delegation", {
    fields: ["name", "delegator_user", "delegate_user", "delegation_type", "scope_type", "project_names", "valid_from", "valid_to", "enabled"],
    filters: currentUser
      ? [
        ["delegate_user", "=", currentUser],
        ["enabled", "=", 1],
        ["scope_type", "=", "project"],
      ]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });

  const delegatedProjectNames = React.useMemo(() => {
    const names = new Set<string>();
    const now = new Date();
    (receivedDelegations ?? []).forEach((delegation) => {
      if (!isDelegationWithinDateRange(delegation, now)) return;
      parseDelegatedProjectNames(delegation.project_names).forEach((name) => names.add(name));
    });
    return Array.from(names);
  }, [receivedDelegations]);

  const {
    data: delegatedProjects,
    isLoading: delegatedProjectsLoading,
    error: delegatedProjectsError,
  } = useFrappeGetDocList<Project>("Project Registration", {
    fields: ["*"],
    filters: delegatedProjectNames.length
      ? [["name", "in", delegatedProjectNames]]
      : [["name", "=", "NON_EXISTENT_DOC"]],
    limit: 1000,
  });
  const visibleDelegatedProjects = React.useMemo(
    () => (delegatedProjectNames.length ? (delegatedProjects ?? []) : []),
    [delegatedProjectNames.length, delegatedProjects],
  );

  // --- Delete draft state ---
  const [confirmDeleteProject, setConfirmDeleteProject] = React.useState<Project | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [downloadingEndorsementProject, setDownloadingEndorsementProject] = React.useState<string | null>(null);

  const { call: deleteDraft } = useFrappePostCall(
    "rndopsapp.rndopsapp.doctype.project_registration.project_registration.delete_draft_project",
  );
  const { call: fetchEndorsementData } = useFrappePostCall("frappe.client.get_list");

  const handleDownloadEndorsement = async (project: Project) => {
    setDownloadingEndorsementProject(project.name);
    try {
      const res = await fetchEndorsementData({
        doctype: "Endorsement Data",
        filters: JSON.stringify([["project_ref_num", "=", project.name]]),
        fields: JSON.stringify(["endorsement_html"]),
        limit_page_length: 1,
      });
      const html = res?.message?.[0]?.endorsement_html;
      if (!html) {
        alert("No endorsement certificate found for this project.");
        return;
      }
      await downloadEndorsementPdfFromHtml(
        normalizeEndorsementHtmlForDownload(html, project.name),
        project.name,
      );
    } catch (error) {
      alert("Could not download endorsement certificate.");
    } finally {
      setDownloadingEndorsementProject(null);
    }
  };

  const handleDeleteDraft = async () => {
    if (!confirmDeleteProject) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res: any = await deleteDraft({ docname: confirmDeleteProject.name });
      if (res?.message?.status === "success") {
        setConfirmDeleteProject(null);
        mutateCreated();
        mutateOwned();
      } else {
        setDeleteError(res?.message?.message || "Delete failed.");
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Delete failed.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const {
    myProjects,
    isLoading: myProjectsLoading,
    error: myProjectsError,
  } = React.useMemo(() => {
    if (isAdministrator) {
      return {
        myProjects: allProjectsForAdmin,
        isLoading: adminLoading,
        error: adminError,
      };
    }

    // HoS RnD / RnD Staff / Dean RnD: show their pending-approval queue, but
    // ALSO anything they're PI or owner of — an approver can also be the PI
    // on a project (e.g. dornd@iitg.ac.in), and once that project moves past
    // their approval stage (e.g. to "Approved") it must not disappear just
    // because it's no longer in their pending-approval workflow_state.
    const roleQueue = isHosRnd
      ? hosAprovalProjects
      : isRndStaff
        ? rndstaffAprovalProjects
        : isDoRnd
          ? doRndApprovalProjects
          : null;
    // Keep only the projects routed to this user; show the whole queue if that list can't be loaded.
    const roleApprovalQueue = assignedPendingProjectNames
      ? roleQueue?.filter((p) => assignedPendingProjectNames.has(p.name))
      : roleQueue;

    const combined = [
      ...(roleApprovalQueue ?? []),
      ...(myCreatedProjects ?? []),
      ...(myOwnedProjects ?? []),
    ];
    const uniqueProjectsMap = new Map<string, Project>();
    combined.forEach((project) => {
      // Allow all project applications to be listed so their progress can be tracked
      // from endorsement phase to project registration phase.
      uniqueProjectsMap.set(project.name, project);
    });

    const uniqueProjects = Array.from(uniqueProjectsMap.values());

    const roleQueueLoading = isHosRnd ? hosLoading : isRndStaff ? rndstaffLoading : isDoRnd ? doRndLoading : false;
    const roleQueueError = isHosRnd ? hosError : isRndStaff ? rndstaffError : isDoRnd ? doRndError : undefined;

    return {
      myProjects: uniqueProjects,
      isLoading: createdLoading || ownedLoading || roleQueueLoading,
      error: createdError || ownedError || roleQueueError,
    };
  }, [
    isAdministrator,
    allProjectsForAdmin,
    adminLoading,
    adminError,
    myCreatedProjects,
    createdLoading,
    createdError,
    myApprovalProjects,
    approvalLoading,
    approvalError,
    myOwnedProjects,
    ownedLoading,
    ownedError,
    isHosRnd,
    assignedPendingProjectNames,
    hosAprovalProjects,
    hosLoading,
    hosError,
    isRndStaff,
    rndstaffAprovalProjects,
    rndstaffLoading,
    rndstaffError,
    isDoRnd,
    doRndApprovalProjects,
    doRndLoading,
    doRndError,
  ]);

  // Counts for the tree: every scope (My Projects / Delegated) with its project-type children
  const scopeTypeCounts = React.useMemo(() => {
    const count = (list: any[] | undefined) =>
      PROJECT_TYPE_TABS.reduce(
        (acc, t) => ({ ...acc, [t]: (list ?? []).filter((p) => normalizeProjectType(p.project_type) === t).length }),
        {} as Record<ProjectTypeTab, number>,
      );
    return {
      myProjects: count(myProjects as any[] | undefined),
      delegated: count(visibleDelegatedProjects as any[] | undefined),
    };
  }, [myProjects, visibleDelegatedProjects]);

  const visibleProjects = activeTab === "delegated" ? visibleDelegatedProjects : myProjects;
  const visibleProjectsLoading = activeTab === "delegated"
    ? delegatedRecordsLoading || (delegatedProjectNames.length > 0 && delegatedProjectsLoading)
    : myProjectsLoading;
  const visibleProjectsError = activeTab === "delegated"
    ? delegatedRecordsError || delegatedProjectsError
    : myProjectsError;

  const filteredAndSortedProjects = React.useMemo(() => {
    if (!visibleProjects) return [];
    let filtered = visibleProjects.filter((p) =>
      normalizeProjectType((p as any).project_type) === selectedProjectType &&
      Object.values(p).some((val) =>
        String(val).toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    );
    filtered.sort((a, b) => {
      const aVal = (a as any)[sortField] ?? "";
      const bVal = (b as any)[sortField] ?? "";
      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [visibleProjects, searchQuery, sortField, sortOrder, selectedProjectType]);

  const totalPages = Math.ceil(
    filteredAndSortedProjects.length / itemsPerPage,
  );
  const paginatedProjects = filteredAndSortedProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  const handleSortChange = (
    field:
      | "creation"
      | "name"
      | "project_title"
      | "workflow_state"
      | "modified"
      | "owner",
  ) => {
    setSortField(field);
    setSortOrder(
      sortField === field && sortOrder === "desc" ? "asc" : "desc",
    );
    setCurrentPage(1);
  };

  // --- DESIGN: Badge Color Logic ---
  const getPriorityBadge = (priority: string) => {
    let variant = "outline";
    if (priority === "High" || priority === "Urgent")
      variant = "destructive";
    if (priority === "Medium") variant = "secondary";
    return <Badge variant={variant as any}>{priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() ?? "";
    let tone = "bg-[var(--psd-info-bg)] text-[#2F5BC4] dark:text-blue-300";
    let dot = "bg-[var(--psd-info)]";
    if (["pending", "under review", "approval pending", "process"].some((t) => s.includes(t))) {
      tone = "bg-[var(--psd-review-bg)] text-[#B45309] dark:text-amber-300";
      dot = "bg-[var(--psd-review)]";
    } else if (s.includes("approved") || s.includes("open")) {
      tone = "bg-[var(--psd-approved-bg)] text-[#0A7F58] dark:text-emerald-300";
      dot = "bg-[var(--psd-approved)]";
    } else if (s.includes("rejected") || s.includes("closed") || s.includes("draft")) {
      tone = "bg-[var(--psd-returned-bg)] text-[#C42B3C] dark:text-rose-300";
      dot = "bg-[var(--psd-returned)]";
    }
    return (
      <span className={cn("inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", tone)}>
        <span className={cn("size-1.5 rounded-full", dot)} />
        {status}
      </span>
    );
  };

  // --- Fetch all Fund Sanctions: only "Sanction Approved" ones hide the "(Pending Sanction)" label ---
  // Fund Sanction.refnum_prj_num stores the Project Registration name (p.name)
  const { data: allSanctions } = useFrappeGetDocList("Fund Sanction", {
    fields: ["refnum_prj_num"],
    filters: [["workflow_state", "=", "Sanction Approved"]],
    limit: 2000,
  });

  const sanctionedProjectsSet = React.useMemo(() => {
    const s = new Set<string>();
    (allSanctions ?? []).forEach((doc: any) => {
      if (doc.refnum_prj_num) s.add(doc.refnum_prj_num);
    });
    return s;
  }, [allSanctions]);

  // p.name == Fund Sanction.refnum_prj_num
  const hasSanction = (p: any) => {
    const result = sanctionedProjectsSet.has(p.name);
    return result;
  };

  // An overhead fund (PDF / DPF / IDF / SWF / STWF) is credited automatically when a
  // consultancy deposit slip distributes the institute share — it is never sanctioned,
  // and the Sanction tab and journey are hidden for it everywhere else. So the sanction
  // sub-label under the status badge has nothing to report: hasSanction() can only ever
  // be false, leaving every overhead project reading "(Pending Sanction)" forever, for a
  // sanction that is never coming. The workflow state on its own is the whole status.
  const showsSanctionState = (p: any) =>
    normalizeProjectType((p as any).project_type) !== 'Overhead';

  // --- Fetch Project Proposals ---
  const { data: projectProposals, isLoading: proposalsLoading } =
    useFrappeGetDocList("Project Registration", {
      fields: [
        "name",
        "project_title",
        "workflow_state",
        "creation",
        "modified",
        "pi_webmail",
      ],
      filters: currentUser
        ? [["pi_webmail", "=", currentUser]]
        : [["name", "=", "NON_EXISTENT_DOC"]],
      limit: 100,
    });

  // --- Fetch all Funding Agencies for name lookup ---
  const { data: allFundingAgencies } = useFrappeGetDocList("fundingagency_", {
    fields: ["name", "funding_agency_name"],
    limit: 0,
  } as any);

  const fundingAgencyNameMap = React.useMemo(() => {
    const map = new Map<string, string>();
    (allFundingAgencies ?? []).forEach((agency: any) => {
      if (agency.name && agency.funding_agency_name) {
        map.set(agency.name, agency.funding_agency_name);
      }
    });
    return map;
  }, [allFundingAgencies]);

  const allPendingTasks: Record<string, Task[]> = React.useMemo(() => {
    const proposals: Task[] = (projectProposals || []).map((p: any) => ({
      id: p.name,
      projectNumber: p.name,
      projectTitle: p.project_title || "Untitled Proposal",
      status: p.workflow_state || "Draft",
      actionDate: p.modified || p.creation,
      assignedTo: "R&D Admin", // Default or derived
      priority: "Medium",
    }));

    return {
      Endorsement: proposals,
      ...pendingTasksData,
    };
  }, [projectProposals]);

  // Ensure activeTaskTab is valid
  React.useEffect(() => {
    if (
      !allPendingTasks[activeTaskTab] &&
      Object.keys(allPendingTasks).length > 0
    ) {
      setActiveTaskTab(Object.keys(allPendingTasks)[0]);
    }
  }, [allPendingTasks, activeTaskTab]);

  // --- Render Functions ---
  const renderPendingTasks = () => {
    if (proposalsLoading) {
      return (
        <Card className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 mx-auto mb-4"></div>
          <p className="text-zinc-500 text-sm">Loading tasks...</p>
        </Card>
      );
    }

    const totalTasks = Object.values(allPendingTasks).flat().length;
    const taskCategories = Object.keys(allPendingTasks);
    const activeTasks = allPendingTasks[activeTaskTab] || [];

    if (totalTasks === 0) {
      return (
        <Card className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-zinc-900">
            No Pending Tasks
          </h3>
          <p className="text-zinc-500 text-sm mt-1">
            You're all caught up!
          </p>
        </Card>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-serif font-medium text-zinc-900 dark:text-zinc-100">
              Pending Actions
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Review and approve requests.
            </p>
          </div>
          <Badge variant="secondary">{totalTasks} Total</Badge>
        </div>

        <Card>
          <div className="border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex overflow-x-auto">
              {taskCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setActiveTaskTab(category)}
                  className={cn(
                    "px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
                    activeTaskTab === category
                      ? "border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-100"
                      : "border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300 dark:text-zinc-400 dark:hover:text-zinc-200",
                  )}
                >
                  {category}
                  <span className="ml-2 text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full text-zinc-600 dark:text-zinc-400">
                    {allPendingTasks[category]?.length || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px] whitespace-nowrap">
                      Task ID
                    </TableHead>
                    <TableHead className="min-w-[150px]">
                      Details
                    </TableHead>
                    <TableHead className="w-[100px] whitespace-nowrap">
                      Status
                    </TableHead>
                    <TableHead className="w-[80px] whitespace-nowrap">
                      Priority
                    </TableHead>
                    <TableHead className="w-[100px] whitespace-nowrap">
                      Assigned To
                    </TableHead>
                    <TableHead className="w-[90px] whitespace-nowrap">
                      Date
                    </TableHead>
                    <TableHead className="text-right w-[60px] whitespace-nowrap">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTasks.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="h-16 text-center text-sm text-zinc-500"
                      >
                        No active tasks in this
                        category.
                      </TableCell>
                    </TableRow>
                  ) : (
                    activeTasks.map((task) => (
                      <TableRow key={task.id}>
                        <TableCell className="font-mono text-xs whitespace-nowrap">
                          {task.id}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium whitespace-normal min-w-[150px] max-w-[300px]">
                            {task.projectTitle}
                          </div>
                          <div className="text-xs text-zinc-500 font-mono mt-0.5 whitespace-nowrap">
                            {task.projectNumber}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getStatusBadge(
                            task.status!,
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getPriorityBadge(
                            task.priority!,
                          )}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-xs whitespace-nowrap">
                          {task.assignedTo}
                        </TableCell>
                        <TableCell className="text-zinc-500 text-xs whitespace-nowrap">
                          {task.actionDate
                            ? format(
                              new Date(
                                task.actionDate,
                              ),
                              "MMM dd, yyyy",
                            )
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:text-zinc-900"
                            onClick={() => {
                              if (
                                activeTaskTab ===
                                "Endorsement"
                              ) {
                                navigate(
                                  `/project-proposal-details/${task.id}`,
                                );
                              } else {
                              }
                            }}
                          >
                            Review
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
  };

  const rowStripe = (state?: string) => {
    const t = (state || "").toLowerCase();
    if (t.includes("reject") || t.includes("draft") || t.includes("closed")) return "#F04455";
    if (t.includes("pending") || t.includes("under review")) return "#F59E0B";
    if (t.includes("approved") || t.includes("open")) return "#0DA875";
    return "#4775E8";
  };

  const renderProjectsTable = () => (
    <div className="space-y-2.5 animate-in fade-in duration-500">
      <>
        <div className="psd-card flex flex-col sm:flex-row gap-2.5 justify-between items-center !rounded-xl px-3 py-2">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]" />
            <Input
              placeholder="Search projects by ID, title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-8 pl-9 bg-[var(--psd-surface)] border-[var(--psd-border)] text-[13px] focus-visible:border-[var(--psd-primary)] focus-visible:ring-[var(--psd-primary)]/20"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select
              value={sortField}
              onValueChange={(v: any) => handleSortChange(v)}
            >
              <SelectTrigger className="h-8 w-[175px] bg-[var(--psd-surface)] border-[var(--psd-border)] text-[13px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="creation">
                  Creation Date
                </SelectItem>
                <SelectItem value="modified">
                  Modified Date
                </SelectItem>
                <SelectItem value="name">Project Number</SelectItem>
                <SelectItem value="project_title">Title</SelectItem>
                <SelectItem value="workflow_state">
                  Status
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setSortOrder(sortOrder === "asc" ? "desc" : "asc")
              }
              className="h-8 w-8 bg-[var(--psd-surface)] border-[var(--psd-border)] shrink-0"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="psd-card overflow-hidden !rounded-xl !border !border-[var(--psd-border)] !bg-[var(--psd-surface)] !shadow-none">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="w-full">
                <TableHeader className="bg-[#DCE6CD] dark:bg-[#34402B]">
                  <TableRow className="border-b border-[#BBC9A4] dark:border-[#4B5A3E] hover:bg-transparent">
                    <TableHead className="w-[80px] whitespace-nowrap px-3 py-1.5 h-8 text-[11px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider relative after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D]">
                      Number
                    </TableHead>
                    <TableHead className="w-full min-w-[260px] whitespace-nowrap px-3 py-1.5 h-8 text-[11px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider relative after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D]">
                      Project Title
                    </TableHead>
                    <TableHead className="min-w-[150px] whitespace-nowrap px-3 py-1.5 h-8 text-[11px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider relative after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D]">
                      Funding Agency
                    </TableHead>
                    <TableHead className="w-[90px] whitespace-nowrap px-3 py-1.5 h-8 text-[11px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider relative after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D]">
                      Date
                    </TableHead>
                    <TableHead className="w-[100px] whitespace-nowrap px-3 py-1.5 h-8 text-[11px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider relative after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D]">
                      Status
                    </TableHead>
                    <TableHead className="text-right w-[60px] whitespace-nowrap px-3 py-1.5 h-8 text-[11px] font-bold text-[#33441F] dark:text-[#D5E2C2] uppercase tracking-wider relative after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D]">
                      Action
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleProjectsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="h-4 w-20 bg-zinc-100 rounded animate-pulse" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-48 bg-zinc-100 rounded animate-pulse" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-24 bg-zinc-100 rounded animate-pulse" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-24 bg-zinc-100 rounded animate-pulse" />
                        </TableCell>
                        <TableCell>
                          <div className="h-4 w-16 bg-zinc-100 rounded animate-pulse" />
                        </TableCell>
                        <TableCell>
                          <div className="h-8 w-8 bg-zinc-100 rounded animate-pulse ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : visibleProjectsError ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-16 text-center text-sm text-red-500"
                      >
                        Error loading projects. Please try
                        again.
                      </TableCell>
                    </TableRow>
                  ) : paginatedProjects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="h-16 text-center text-sm text-zinc-500"
                      >
                        No projects found matching your
                        criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProjects.map((p: any) => (
                      <TableRow
                        key={p.name}
                        className="cursor-pointer border-b border-[var(--psd-border)] last:border-b-0 hover:bg-[var(--psd-primary-light)]/40"
                        style={{ boxShadow: `inset 3px 0 0 ${rowStripe(p.workflow_state)}` }}
                        onClick={() => {
                          const targetPath =
                            p.workflow_state ===
                              "Approved" ||
                              p.workflow_state ===
                              "Proposal Approved"
                              ? `/project-details-overview/${p.name}`
                              : `/project-details/${p.name}`;
                          navigate(targetPath, {
                            state: {
                              returnTo: "/projects-view",
                              activeProjectType: selectedProjectType,
                              currentPage,
                            },
                          });
                        }}
                      >
                        <TableCell className="px-3 py-2 font-mono text-xs font-bold text-[#7A46AE] dark:text-[#D3B4F0] bg-[#F1E8F9] dark:bg-[#33243F] whitespace-nowrap border-b border-[#D8C6EC] dark:border-[#4A3A5C] [tr:last-child_&]:border-b-0 relative after:absolute after:right-0 after:top-[22%] after:h-[56%] after:w-px after:rounded-full after:bg-[#C9D3BA] dark:after:bg-[#4B5A3E]">
                          {p.project_no || p.name}
                        </TableCell>
                        <TableCell className="px-3 py-2 font-semibold text-[var(--psd-heading)] relative after:absolute after:right-0 after:top-[22%] after:h-[56%] after:w-px after:rounded-full after:bg-[#C9D3BA] dark:after:bg-[#4B5A3E]">
                          <div
                            className="line-clamp-2 text-[13px] leading-snug"
                            title={p.project_title}
                          >
                            {p.project_title}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-[var(--psd-body)] text-xs whitespace-nowrap relative after:absolute after:right-0 after:top-[22%] after:h-[56%] after:w-px after:rounded-full after:bg-[#C9D3BA] dark:after:bg-[#4B5A3E]">
                          {fundingAgencyNameMap.get(p.funding_agen) || p.funding_agen || "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-[var(--psd-body)] text-xs whitespace-nowrap relative after:absolute after:right-0 after:top-[22%] after:h-[56%] after:w-px after:rounded-full after:bg-[#C9D3BA] dark:after:bg-[#4B5A3E]">
                          {p.creation
                            ? format(
                              new Date(p.creation),
                              "MMM dd, yyyy",
                            )
                            : "-"}
                        </TableCell>
                        <TableCell className="px-3 py-2 whitespace-nowrap relative after:absolute after:right-0 after:top-[22%] after:h-[56%] after:w-px after:rounded-full after:bg-[#C9D3BA] dark:after:bg-[#4B5A3E]">
                          <div className="flex flex-col gap-0.5">
                            {getStatusBadge(p.workflow_state)}
                            {p.workflow_state === "Approved" && showsSanctionState(p) && (
                              hasSanction(p) ? (
                                <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  (Sanction Approved)
                                </span>
                              ) : (
                                <span className="text-[10.5px] font-semibold text-amber-600 dark:text-amber-400">
                                  (Pending Sanction)
                                </span>
                              )
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-3 py-2 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {p.workflow_state === "Draft" &&
                              p.owner === currentUser && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDeleteProject(p);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              )}
                            {p.workflow_state === "Endorsement Approved" ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem
                                    disabled={downloadingEndorsementProject === p.name}
                                    onClick={() => handleDownloadEndorsement(p)}
                                  >
                                    <DownloadIcon className="mr-2 h-3.5 w-3.5" />
                                    {downloadingEndorsementProject === p.name ? "Downloading..." : "Download"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      navigate(
                                        `/project-registration?docname=${p.name}&isApprovedEndorsement=true`,
                                      )
                                    }
                                  >
                                    Register Project
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <>
                                {(p.workflow_state === "Approved" || p.workflow_state === "Proposal Approved") &&
                                  normalizeProjectType((p as any).project_type) === "Consultancy" && (
                                  <ProInvButton
                                    projectKey={p.project_no || p.name}
                                    size="sm"
                                    className="h-7 px-2 text-xs font-bold border-zinc-300 text-zinc-700 hover:text-[#D97757] hover:border-[#D97757] dark:text-zinc-300 dark:border-zinc-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/project-details-overview/${p.name}/proforma-invoice`);
                                    }}
                                  >
                                    Pro Inv
                                  </ProInvButton>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                  <span className="sr-only">View</span>
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between py-1">
            <div className="text-xs font-medium tabular-nums text-[var(--psd-body)]">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateCurrentPage((p) => Math.max(1, p - 1))
                }
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  updateCurrentPage((p) =>
                    Math.min(totalPages, p + 1),
                  )
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </>
    </div>
  );

  return (
    <div className="psd-root w-full mx-auto space-y-2.5 animate-in fade-in duration-500">
      {/* Header */}
      <header className="psd-hero relative flex flex-wrap items-center justify-between gap-3 overflow-hidden rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)]/70 px-3 py-2">
        <div aria-hidden className="absolute inset-x-0 top-0 z-10 h-[3px] bg-[linear-gradient(to_right,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)]" />
        <div className="relative z-10 flex min-w-0 items-center gap-2.5">
          <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
            <FolderKanban className="size-4" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">Research &amp; Development</div>
            <h1 className="mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">Projects</h1>
          </div>
          <span aria-hidden className="mx-1 hidden h-6 w-px bg-[var(--psd-border)] sm:block" />
          <div role="tablist" aria-label="Projects" className="inline-flex items-center rounded-lg border border-[var(--psd-border)] bg-[var(--psd-bg)] p-0.5">
            {[
              { id: "myProjects", label: "My Projects", total: myProjects?.length || 0 },
              { id: "delegated", label: "Delegated", total: visibleDelegatedProjects.length },
            ].map((scope) => {
              const active = activeTab === scope.id;
              return (
                <button
                  key={scope.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setActiveTab(scope.id);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "psd-focus inline-flex h-8 items-center gap-2 rounded-md px-3.5 text-[12.5px] font-semibold transition-all duration-200",
                    active
                      ? "bg-[var(--psd-primary)] font-bold text-white shadow-md shadow-[var(--psd-primary)]/35"
                      : "text-[var(--psd-body)] hover:text-[var(--psd-primary)]",
                  )}
                >
                  {scope.label}
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums", active ? "bg-white/25 text-white" : "bg-[var(--psd-surface)] text-[var(--psd-body)]")}>
                    {scope.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Project type toggle */}
      <div className="psd-card flex flex-wrap items-center gap-2 !rounded-xl px-2.5 py-2">
        <div role="tablist" aria-label="Project type" className="flex flex-wrap items-center gap-2">
          {PROJECT_TYPE_TABS.map((type) => {
            const count = scopeTypeCounts[activeTab === "delegated" ? "delegated" : "myProjects"][type];
            const selected = selectedProjectType === type;
            // Each type keeps its own colour: solid when selected, soft tint otherwise
            const look: Record<ProjectTypeTab, { solid: string; soft: string; badge: string }> = {
              Research: {
                solid: "bg-[#4A6CF7] text-white shadow-md shadow-[#4A6CF7]/40 ring-2 ring-[#4A6CF7]/40 ring-offset-2 ring-offset-[var(--psd-surface)]",
                soft: "bg-[#EEF2FF] text-[#2F47B8] hover:bg-[#E0E7FF] dark:bg-[#4A6CF7]/15 dark:text-[#C7D2FE]",
                badge: "bg-white/80 text-[#2F47B8] dark:bg-[#18181B]/50 dark:text-[#C7D2FE]",
              },
              Consultancy: {
                solid: "bg-[#10B981] text-white shadow-md shadow-[#10B981]/40 ring-2 ring-[#10B981]/40 ring-offset-2 ring-offset-[var(--psd-surface)]",
                soft: "bg-[#E6F8F1] text-[#047857] hover:bg-[#D3F2E6] dark:bg-[#10B981]/15 dark:text-[#A7F3D0]",
                badge: "bg-white/80 text-[#047857] dark:bg-[#18181B]/50 dark:text-[#A7F3D0]",
              },
              Others: {
                solid: "bg-[#71717A] text-white shadow-md shadow-[#71717A]/40 ring-2 ring-[#71717A]/40 ring-offset-2 ring-offset-[var(--psd-surface)]",
                soft: "bg-[#F1F1F3] text-[#52525B] hover:bg-[#E7E7EA] dark:bg-[#3F3F46] dark:text-[#E4E4E7]",
                badge: "bg-white/80 text-[#52525B] dark:bg-[#18181B]/50 dark:text-[#E4E4E7]",
              },
              Overhead: {
                solid: "bg-[#EA580C] text-white shadow-md shadow-[#EA580C]/40 ring-2 ring-[#EA580C]/40 ring-offset-2 ring-offset-[var(--psd-surface)]",
                soft: "bg-[#FFF1E6] text-[#C2410C] hover:bg-[#FFE4CC] dark:bg-[#EA580C]/15 dark:text-[#FED7AA]",
                badge: "bg-white/80 text-[#C2410C] dark:bg-[#18181B]/50 dark:text-[#FED7AA]",
              },
            };
            return (
              <button
                key={type}
                role="tab"
                aria-selected={selected}
                onClick={() => updateProjectTypeTab(type)}
                className={cn(
                  "psd-focus inline-flex h-8 items-center gap-2 rounded-full px-3.5 text-[12.5px] transition-all duration-200",
                  selected ? cn(look[type].solid, "scale-[1.06] font-extrabold") : cn(look[type].soft, "font-semibold opacity-80 hover:opacity-100"),
                  !selected && count === 0 && "!opacity-50",
                )}
              >
                {selected && <CheckCircle2 className="size-3.5" strokeWidth={2.5} />}
                {projectTypeTabLabel(type, roles)}
                <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] font-bold leading-none tabular-nums", selected ? "bg-white/30 text-white" : look[type].badge)}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        {activeTab === "pending"
          ? renderPendingTasks()
          : renderProjectsTable()}
      </div>

      {/* Delete confirmation dialog */}
      {confirmDeleteProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <Card className="w-full max-w-sm mx-4 p-6 space-y-4 shadow-xl">
            <div className="flex items-start gap-3">
              <Trash2 className="h-5 w-5 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Delete Draft Project
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {confirmDeleteProject.project_title || confirmDeleteProject.name}
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>
            {deleteError && (
              <p className="text-sm text-rose-600 bg-rose-50 dark:bg-rose-950 rounded px-3 py-2">
                {deleteError}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                disabled={deleteLoading}
                onClick={() => {
                  setConfirmDeleteProject(null);
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteLoading}
                onClick={handleDeleteDraft}
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default ProjectsView;
