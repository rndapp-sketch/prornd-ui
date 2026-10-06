import * as React from "react";
import { useFrappeAuth } from "frappe-react-sdk";
import { ClipboardCheck, Layers, Users } from "lucide-react";
import { useUserRoles } from "@/components/UserRole";
import { ApproverDashboard, type CategorizedTaskRow } from "@/components/dashboard/ApproverDashboard";

const QUICK_LINKS = [
  { label: "Section Approvals", description: "Forms awaiting your approval", path: "/pending-task", icon: <ClipboardCheck className="h-4 w-4" /> },
  { label: "Team's Queue", description: "View the team's processed documents", path: "/task-registry", icon: <Users className="h-4 w-4" /> },
  { label: "Projects", description: "View and manage all projects", path: "/projects", icon: <Layers className="h-4 w-4" /> },
];

export function HosRndDashboard() {
  const { currentUser } = useFrappeAuth();
  const { roles } = useUserRoles(currentUser ?? null);
  const isAdoRnd = roles?.includes("Ado_RnD") ?? false;

  // HoS sees its own "Pending HoS Approval" rows even without a module-visibility flag.
  // Associate Dean tasks are hidden from HoS; Ado_RnD must not see HoS-only tasks.
  const includePending = React.useCallback(
    (r: CategorizedTaskRow) => {
      const base = Boolean(r.mod_vis) || r.doctype === "Advance Settlement";
      const isHosPending = r.status === "Pending HoS Approval";
      if (!base && !isHosPending) return false;
      if (!isAdoRnd && r.status === "Pending Associate Dean") return false;
      if (isAdoRnd && r.status === "Pending HoS Approval") return false;
      return true;
    },
    [isAdoRnd],
  );

  return (
    <ApproverDashboard
      title="HoS R&D Dashboard"
      queueLabel="Section Approvals"
      quickLinks={QUICK_LINKS}
      includePending={includePending}
    />
  );
}
