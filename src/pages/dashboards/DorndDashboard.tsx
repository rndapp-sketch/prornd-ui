import { ClipboardCheck, Layers, Users } from "lucide-react";
import { ApproverDashboard } from "@/components/dashboard/ApproverDashboard";

const QUICK_LINKS = [
  { label: "Final Approvals", description: "Requests awaiting your final approval", path: "/pending-task", icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: "Institute Analytics", description: "Browse all processed documents", path: "/task-registry", icon: <Users className="h-4 w-4" /> },
  { label: "Projects", description: "View and manage all projects", path: "/projects", icon: <Layers className="h-4 w-4" /> },
];

export function DorndDashboard() {
  return <ApproverDashboard title="Dean's R&D Dashboard" queueLabel="Final Approvals" quickLinks={QUICK_LINKS} />;
}
