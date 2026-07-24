import * as React from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  useFrappeGetDocList,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ChevronRightIcon as ChevronRight,
  SearchIcon,
  ChevronsUpDown,
  CheckCircle2,
  DownloadIcon,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRoles } from "../components/UserRole";
import { format } from "date-fns";

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

type ProjectTypeTab = 'Research' | 'Consultancy' | 'Others';
const PROJECT_TYPE_TABS: ProjectTypeTab[] = ['Research', 'Consultancy', 'Others'];

const normalizeProjectType = (raw?: string): ProjectTypeTab => {
  if (!raw) return 'Others';
  const lower = raw.toLowerCase();
  if (lower.includes('research')) return 'Research';
  if (lower.includes('consult')) return 'Consultancy';
  return 'Others';
};

const DORND_SIGNATURE_SEAL_URL = "http://172.16.131.206:8000/files/Sign_dornd_stamp_rnd.jpg";

const toSameOriginFileUrl = (src: string) => {
  try {
    const url = new URL(src, window.location.origin);
    if (url.hostname === "172.16.131.206" || url.hostname === window.location.hostname) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    return src;
  }
  return src;
};

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
  const navigate = useNavigate();
  const location = useLocation();

  // --- LOGIC: State initialized with location.state for restoration ---
  const [activeTab, setActiveTab] = React.useState(
    location.state?.activeTab || initialTab || "myProjects",
  );
  // const [openPipeline, setOpenPipeline] = React.useState<string | null>(null); // Unused
  const [searchQuery, setSearchQuery] = React.useState(location.state?.searchQuery || "");
  const [sortField, setSortField] = React.useState<
    | "creation"
    | "name"
    | "project_title"
    | "workflow_state"
    | "modified"
    | "owner"
  >(location.state?.sortField || "creation");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">(location.state?.sortOrder || "desc");
  const [currentPage, setCurrentPage] = React.useState(location.state?.currentPage || 1);
  const [itemsPerPage, setItemsPerPage] = React.useState(10); // Unused set, but kept for future or consistency
  const [activeTaskTab, setActiveTaskTab] = React.useState(
    location.state?.activeTaskTab || Object.keys(pendingTasksData)[0],
  );
  const [selectedProjectType, setSelectedProjectType] = React.useState<ProjectTypeTab>(location.state?.selectedProjectType || 'Research');
  const { currentUser } = useFrappeAuth();
  const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", {
    fields: ["*"],
    enabled: !!currentUser,
  });
  const {
    roles: fetchedRoles,
    isLoading: isRolesLoading,
    error: rolesError,
  } = useUserRoles(currentUser ?? null);

  const { isAdministrator, isPermanentEmployee } = React.useMemo(() => {
    const roles =
      fetchedRoles?.length > 0
        ? fetchedRoles
        : (userData?.roles?.map((r: any) => r.role) ?? []);
    return {
      isAdministrator: roles.includes("Administrator"),
      isPermanentEmployee: roles.includes("Permanent Employee"),
    };
  }, [userData, fetchedRoles]);

  React.useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
    if ((location.state as any)?.filter === "Application Under Process") {
      setActiveTab("pending");
    }
  }, [initialTab, location.state]);

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
      console.error("Download endorsement certificate error:", error);
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
    if (isHosRnd) {
      return {
        myProjects: hosAprovalProjects,
        isLoading: hosLoading,
        error: hosError,
      };
    }
    if (isRndStaff) {
      return {
        myProjects: rndstaffAprovalProjects,
        isLoading: rndstaffLoading,
        error: rndstaffError,
      };
    }
    if (isAdministrator) {
      return {
        myProjects: allProjectsForAdmin,
        isLoading: adminLoading,
        error: adminError,
      };
    }
    if (isDoRnd) {
      return {
        myProjects: doRndApprovalProjects,
        isLoading: doRndLoading,
        error: doRndError,
      };
    }

    const combined = [
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

    return {
      myProjects: uniqueProjects,
      isLoading: createdLoading || ownedLoading,
      error: createdError || ownedError,
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
    hosAprovalProjects,
    hosLoading,
    hosError,
    isRndStaff,
    rndstaffAprovalProjects,
    rndstaffLoading,
    rndstaffError,
  ]);

  const projectTypeCounts = React.useMemo(() => ({
    Research: ((activeTab === "delegated" ? visibleDelegatedProjects : myProjects) ?? []).filter(p => normalizeProjectType((p as any).project_type) === 'Research').length,
    Consultancy: ((activeTab === "delegated" ? visibleDelegatedProjects : myProjects) ?? []).filter(p => normalizeProjectType((p as any).project_type) === 'Consultancy').length,
    Others: ((activeTab === "delegated" ? visibleDelegatedProjects : myProjects) ?? []).filter(p => normalizeProjectType((p as any).project_type) === 'Others').length,
  }), [activeTab, visibleDelegatedProjects, myProjects]);

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
    const s = status?.toLowerCase();
    let className =
      "bg-zinc-100 text-zinc-800 hover:bg-zinc-200 border-zinc-200"; // Default/Draft

    if (
      ["pending", "under review", "approval pending", "process"].some(
        (t) => s?.includes(t),
      )
    ) {
      className =
        "bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200"; // Pending
    } else if (s?.includes("approved") || s?.includes("open")) {
      className =
        "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200"; // Success
    } else if (s?.includes("rejected") || s?.includes("closed")) {
      className =
        "bg-rose-100 text-rose-800 hover:bg-rose-200 border-rose-200"; // Error/Closed
    }

    return (
      <Badge variant="outline" className={cn("border", className)}>
        {status}
      </Badge>
    );
  };

  const { data: allSanctions } = useFrappeGetDocList("Fund Sanction", {
    fields: ["refnum_prj_num", "sanctioned_letter_date", "workflow_state"],
    limit: 5000,
  });

  const sanctionedProjectsSet = React.useMemo(() => {
    const sSet = new Set<string>();
    (allSanctions ?? []).forEach((doc: any) => {
      const s = (doc.workflow_state || "").toLowerCase();
      if (doc.refnum_prj_num && s.includes("sanction approved")) {
        sSet.add(doc.refnum_prj_num);
      }
    });
    return sSet;
  }, [allSanctions]);

  const sanctionDateMap = React.useMemo(() => {
    const map = new Map<string, string>();
    (allSanctions ?? []).forEach((doc: any) => {
      if (doc.refnum_prj_num && doc.sanctioned_letter_date) {
        map.set(doc.refnum_prj_num, doc.sanctioned_letter_date);
      }
    });
    return map;
  }, [allSanctions]);

  // p.name == Fund Sanction.refnum_prj_num
  const hasSanction = (p: any) => {
    return sanctionedProjectsSet.has(p.name);
  };

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
                        className="h-24 text-center text-zinc-500"
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
                                console.log(
                                  "View clicked for",
                                  task.id,
                                );
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

  const renderProjectsTable = () => (
    <div className="space-y-4 animate-in fade-in duration-500">
      <>
        {/* Project Type Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {PROJECT_TYPE_TABS.map((tab) => {
            const active = selectedProjectType === tab;
            const tabColors: Record<string, string> = {
              Research: active ? 'bg-[#EEF2FF] border-[#4A6CF7] text-[#1E3A8A] shadow-sm shadow-[#4A6CF7]/10 dark:bg-[#4A6CF7]/18 dark:border-[#818CF8] dark:text-[#C7D2FE]' : 'border-[#C7D2FE] bg-[#EEF2FF]/55 text-[#1E3A8A] hover:bg-[#EEF2FF] dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/10 dark:text-[#C7D2FE]',
              Consultancy: active ? 'bg-[#ECFDF5] border-[#10B981] text-[#065F46] shadow-sm shadow-[#10B981]/10 dark:bg-[#10B981]/15 dark:border-[#34D399] dark:text-[#A7F3D0]' : 'border-[#A7F3D0] bg-[#ECFDF5]/60 text-[#047857] hover:bg-[#ECFDF5] dark:border-[#10B981]/30 dark:bg-[#10B981]/10 dark:text-[#A7F3D0]',
              Others: active ? 'bg-[#F4F4F5] border-[#71717A] text-[#3F3F46] shadow-sm dark:bg-[#3F3F46] dark:border-[#A1A1AA] dark:text-[#E4E4E7]' : 'border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8]',
            };
            const badgeColors: Record<string, string> = {
              Research: active ? 'bg-[#4A6CF7] text-white' : 'bg-white/80 text-[#4A6CF7] dark:bg-[#18181B]/50',
              Consultancy: active ? 'bg-[#10B981] text-white' : 'bg-white/80 text-[#059669] dark:bg-[#18181B]/50',
              Others: active ? 'bg-[#71717A] text-white' : 'bg-[#F4F4F5] text-[#71717A] dark:bg-[#18181B]/50',
            };
            return (
              <button
                key={tab}
                onClick={() => { setSelectedProjectType(tab); setCurrentPage(1); }}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-2 rounded-lg border px-3 text-[12px] font-extrabold uppercase tracking-wide transition-all duration-150",
                  tabColors[tab]
                )}
              >
                {tab}
                <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-bold leading-none", badgeColors[tab])}>
                  {projectTypeCounts[tab]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-3 shadow-sm">
          <div className="relative w-full sm:w-72">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717A]" />
            <Input
              placeholder="Search projects by ID, title..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 pl-9 bg-[#FAFAF9] dark:bg-[#18181B] border-[#E4E4E7] dark:border-[#3F3F46] text-[13px]"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select
              value={sortField}
              onValueChange={(v: any) => handleSortChange(v)}
            >
              <SelectTrigger className="h-9 w-[180px] bg-[#FAFAF9] dark:bg-[#18181B] border-[#E4E4E7] dark:border-[#3F3F46] text-[13px]">
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
              className="h-9 w-9 bg-[#FAFAF9] dark:bg-[#18181B] border-[#E4E4E7] dark:border-[#3F3F46] shrink-0"
            >
              <ChevronsUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden rounded-xl">
          <CardContent className="p-0">
            <div className="overflow-x-auto p-3">
              <Table className="border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg overflow-hidden">
                <TableHeader className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                  <TableRow className="border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 hover:bg-transparent">
                    <TableHead className="w-[80px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                      Number
                    </TableHead>
                    <TableHead className="min-w-[150px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                      Project Title
                    </TableHead>
                    <TableHead className="w-[120px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                      Funding Agency
                    </TableHead>
                    <TableHead className="w-[90px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                      Start Date
                    </TableHead>
                    <TableHead className="w-[90px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                      Creation Date
                    </TableHead>
                    <TableHead className="w-[100px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25">
                      Status
                    </TableHead>
                    <TableHead className="text-right w-[60px] whitespace-nowrap px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider">
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
                        colSpan={9}
                        className="h-24 text-center text-red-500"
                      >
                        Error loading projects. Please try
                        again.
                      </TableCell>
                    </TableRow>
                  ) : paginatedProjects.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="h-24 text-center text-zinc-500"
                      >
                        No projects found matching your
                        criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedProjects.map((p: any) => (
                      <TableRow
                        key={p.name}
                        className="cursor-pointer hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]/40 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-b-0"
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
                              returnTo: location.pathname + location.search,
                              activeTab,
                              searchQuery,
                              sortField,
                              sortOrder,
                              currentPage,
                              activeTaskTab,
                              selectedProjectType,
                            }
                          });
                        }}
                      >
                        <TableCell className="px-4 py-3 font-mono text-xs font-semibold text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                          {p.project_no || p.name}
                        </TableCell>
                        <TableCell className="px-4 py-3 font-semibold text-[#3F3F46] dark:text-[#E4E4E7] border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                          <div
                            className="line-clamp-2 min-w-[150px] max-w-[300px]"
                            title={p.project_title}
                          >
                            {p.project_title}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-[#52525B] dark:text-[#A1A1AA] text-xs whitespace-nowrap border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                          {fundingAgencyNameMap.get(p.funding_agen) || p.funding_agen || "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-[#71717A] text-xs whitespace-nowrap border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                          {(() => {
                              const d = sanctionDateMap.get(p.name) || sanctionDateMap.get(p.project_no) || p.sanctioned_letter_date;
                              return d ? format(new Date(d), "MMM dd, yyyy") : "-";
                          })()}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-[#71717A] text-xs whitespace-nowrap border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                          {p.creation
                            ? format(
                              new Date(p.creation),
                              "MMM dd, yyyy",
                            )
                            : "-"}
                        </TableCell>
                        <TableCell className="px-4 py-3 whitespace-nowrap border-r border-[#F4F4F5] dark:border-[#3F3F46]/80">
                          <div className="flex flex-col gap-0.5">
                            {getStatusBadge(p.workflow_state)}
                            {p.workflow_state === "Approved" && (
                              hasSanction(p) ? (
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  (Sanction Approved)
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  (Pending Sanction)
                                </span>
                              )
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {p.workflow_state === "Draft" &&
                              p.owner === currentUser && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
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
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2 text-xs"
                                  disabled={downloadingEndorsementProject === p.name}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDownloadEndorsement(p);
                                  }}
                                >
                                  <DownloadIcon className="mr-1 h-3.5 w-3.5" />
                                  {downloadingEndorsementProject === p.name ? "Downloading..." : "Download"}
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(
                                      `/project-registration?docname=${p.name}&isApprovedEndorsement=true`,
                                    );
                                  }}
                                >
                                  Register Project
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <ChevronRight className="h-4 w-4" />
                                <span className="sr-only">View</span>
                              </Button>
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
          <div className="flex items-center justify-between py-4">
            <div className="text-sm text-zinc-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p: number) => Math.max(1, p - 1))
                }
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p: number) =>
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
    <div className="w-full mx-auto space-y-5 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
        <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
        <div className="flex flex-col gap-1 px-5 py-4">
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
            Project Registry
          </span>
          <h1 className="font-sans text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
            Projects
          </h1>
          <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
            Manage and track all your research projects.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-[#E4E4E7] bg-white p-2 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
        {[
          { id: "myProjects", label: "My Projects", count: myProjects?.length || 0 },
          { id: "delegated", label: "Delegated", count: visibleDelegatedProjects.length },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
              className={cn(
                "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[12px] font-extrabold uppercase tracking-wide transition-all",
                active
                  ? "bg-[#EEF2FF] text-[#1E3A8A] shadow-sm dark:bg-[#4A6CF7]/15 dark:text-[#C7D2FE]"
                  : "text-[#52525B] hover:bg-[#F4F4F5] dark:text-[#A1A1AA] dark:hover:bg-[#3F3F46]",
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                  active
                    ? "bg-[#4A6CF7] text-white"
                    : "bg-[#F4F4F5] text-[#71717A] dark:bg-[#18181B]",
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t-2 border-[#4A6CF7]/35 pt-4 dark:border-[#818CF8]/35">
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
