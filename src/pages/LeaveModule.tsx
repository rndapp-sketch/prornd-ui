import { useState, useEffect } from "react";
import { useFrappeAuth, useFrappeGetCall } from "frappe-react-sdk";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Clock, CheckCircle, XCircle, CalendarDays, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { leaveModuleAPI } from "@/services/apiService";

const LeaveModule = () => {
  const { currentUser } = useFrappeAuth();
  const navigate = useNavigate();
  const [totalAbsents, setTotalAbsents] = useState<number | null>(null);

  // Fetch Leave Data balance via whitelisted API (bypasses permissions)
  const { data: leaveBalanceData } = useFrappeGetCall<{
    message: { el: number; cl: number; emp_id: string; emp_class: string } | null;
  }>(
    leaveModuleAPI.getLeaveBalance,
    {},
    {
      enabled: !!currentUser,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  const leaveBalance = leaveBalanceData?.message;

  // Fetch total absents from attendance API
  useEffect(() => {
    if (!currentUser) return;
    const username = currentUser.split("@")[0];
    fetch(`/attendance-api/attendance/absents/${username}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.success && result.data) {
          setTotalAbsents(result.data.totalAbsents);
        }
      })
      .catch(() => {
        // silently ignore – card just won't show
      });
  }, [currentUser]);

  // Fetch leave applications
  const { data, error, isLoading } = useFrappeGetCall(
    leaveModuleAPI.getMyLeaves,
    { limit: 50, start: 0 },
    currentUser ? `my-leaves-${currentUser}` : null
  );

  const leaves: any[] = data?.message || [];

  const getStatusBadge = (state: string) => {
    switch (state) {
      case "Draft":
        return { color: "bg-gray-100 text-gray-700", icon: FileText };
      case "Approved":
        return { color: "bg-green-100 text-green-700", icon: CheckCircle };
      case "Rejected":
        return { color: "bg-red-100 text-red-700", icon: XCircle };
      default:
        return { color: "bg-yellow-100 text-yellow-700", icon: Clock };
    }
  };

  // Get display dates for a leave entry
  const getLeaveDates = (leave: any) => {
    if (leave.leave_type === "CL") {
      const clDates = leave.cl_dates_table;
      if (clDates && clDates.length > 0) {
        const formatted = clDates.map((row: any) =>
          row.cl_date ? format(new Date(row.cl_date), "dd MMM yyyy") : null
        ).filter(Boolean);
        if (formatted.length === 1) return formatted[0];
        if (formatted.length <= 3) return formatted.join(", ");
        return `${formatted[0]} + ${formatted.length - 1} more`;
      }
      return null;
    }
    // EL / On Duty Leave
    if (leave.from_date) {
      const from = format(new Date(leave.from_date), "dd MMM yyyy");
      const to = leave.to_date ? format(new Date(leave.to_date), "dd MMM yyyy") : null;
      return to ? `${from} — ${to}` : from;
    }
    return null;
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Leave Applications
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            View and manage your leave requests
          </p>
        </div>
        <Button
          onClick={() => navigate("/leave-module/new")}
          className="bg-teal-600 hover:bg-teal-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Leave Application
        </Button>
      </div>

      {/* Leave Balance Cards */}
      {(leaveBalance || totalAbsents !== null) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {leaveBalance && (
            <>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Earned Leave (EL)</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{leaveBalance.el ?? 0}</p>
                </div>
              </div>
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Casual Leave (CL)</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{leaveBalance.cl ?? 0}</p>
                </div>
              </div>
            </>
          )}
          {totalAbsents !== null && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <UserX className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">Total Absent</p>
                <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{totalAbsents}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-red-500 text-center py-10">
          Failed to load leave applications. Please try again.
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && leaves.length === 0 && (
        <div className="text-center py-20 text-zinc-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No leave applications yet</p>
          <p className="text-sm mt-1">Click "New Leave Application" to get started.</p>
        </div>
      )}

      {/* Leave list */}
      {!isLoading && leaves.length > 0 && (
        <div className="space-y-3">
          {leaves.map((leave: any) => {
            const badge = getStatusBadge(leave.workflow_state || "Draft");
            const StatusIcon = badge.icon;
            const dates = getLeaveDates(leave);
            const appliedOn = leave.creation
              ? format(new Date(leave.creation), "dd MMM yyyy")
              : null;

            return (
              <div
                key={leave.name}
                onClick={() => navigate(`/leave-module/${leave.name}`)}
                className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer hover:shadow-sm transition-shadow"
              >
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {leave.name}
                  </p>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    {leave.leave_type || "—"} &middot;{" "}
                    {leave.reason_for_leave
                      ? leave.reason_for_leave.substring(0, 60)
                      : "No reason provided"}
                  </p>
                  {appliedOn && (
                    <p className="text-xs text-zinc-400 mt-1">
                      Applied on {appliedOn}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {dates && (
                    <span className="text-xs text-zinc-400">
                      {dates}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badge.color}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {leave.workflow_state || "Draft"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LeaveModule;
