import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  FrappeContext,
  useFrappeAuth,
  useFrappeGetDocList,
  useSWR,
} from "frappe-react-sdk";
import { BellRing, ChevronDown, ChevronUp, ArrowRight, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import { loanSettlementAPI } from "@/services/apiService";

/**
 * Reminder on the PI home page that one or more of the PI's projects still has an
 * outstanding loan. Hidden entirely when there is nothing pending.
 *
 * Outstanding balances come from the Accounts service via get_active_loan_for_project,
 * which costs one request per loan — so it is only asked about projects that have an
 * approved Loan Request, not every project the PI owns.
 */

interface PiProject {
  name: string;
  project_no?: string;
  project_title?: string;
}

interface PendingLoan {
  ledger_loan_number: number;
  loan_reference: string;
  loan_amount: number;
  outstanding_amount: number | null;
  balance_unavailable?: boolean;
  loan_status: string;
  loan_received_date?: string;
}

interface ProjectLoans {
  project: PiProject;
  loans: PendingLoan[];
}

const fmtINR = (v: number) =>
  `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// LOAN_APPROVED / ACTIVE / PARTIALLY_SETTLED → "Loan Approved" / "Active" / "Partially Settled"
const humanStatus = (s: string) =>
  (s || "")
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const COLLAPSED_ROWS = 3;

export const PendingLoansAlert: React.FC = () => {
  const navigate = useNavigate();
  const frappe = React.useContext(FrappeContext);
  const { currentUser } = useFrappeAuth();
  const [expanded, setExpanded] = React.useState(false);

  const { data: projects } = useFrappeGetDocList<PiProject>(
    "Project Registration",
    {
      fields: ["name", "project_no", "project_title"],
      filters: [["pi_webmail", "=", currentUser ?? ""]],
      limit: 1000,
    },
    currentUser ? `pi-loan-projects-${currentUser}` : null,
  );

  const { data: approvedLoanRequests } = useFrappeGetDocList<{
    project_name?: string;
    project_number?: string;
  }>(
    "Loan Request",
    {
      fields: ["project_name", "project_number"],
      filters: [["workflow_state", "=", "Approved"]],
      limit: 0,
    },
    currentUser ? `pi-approved-loan-requests-${currentUser}` : null,
  );

  // Same loose matching as the project page's Loan tab: a Loan Request may carry
  // either the registration docname or the project number in either field.
  const projectsWithLoans = React.useMemo(() => {
    if (!projects?.length || !approvedLoanRequests?.length) return [];
    const refs = new Set<string>();
    approvedLoanRequests.forEach((lr) => {
      if (lr.project_name) refs.add(lr.project_name);
      if (lr.project_number) refs.add(lr.project_number);
    });
    return projects.filter(
      (p) => refs.has(p.name) || (!!p.project_no && refs.has(p.project_no)),
    );
  }, [projects, approvedLoanRequests]);

  const { data: pending } = useSWR<ProjectLoans[]>(
    frappe && projectsWithLoans.length
      ? ["pi-pending-loans", ...projectsWithLoans.map((p) => p.name)]
      : null,
    async () => {
      // One failing project must not hide the others' reminders.
      const results = await Promise.allSettled(
        projectsWithLoans.map((p) =>
          frappe!.call.get<{ message: { data: PendingLoan[] } }>(
            loanSettlementAPI.getActiveLoansForProject,
            { project_name: p.project_no || p.name },
          ),
        ),
      );
      return projectsWithLoans
        .map((project, i) => {
          const r = results[i];
          return {
            project,
            loans: r.status === "fulfilled" ? r.value?.message?.data ?? [] : [],
          };
        })
        .filter((x) => x.loans.length > 0);
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );

  if (!pending?.length) return null;

  const rows = pending.flatMap(({ project, loans }) =>
    loans.map((loan) => ({ project, loan })),
  );
  const totalOutstanding = rows.reduce(
    (s, r) => s + (r.loan.outstanding_amount ?? 0),
    0,
  );
  const anyUnknown = rows.some(
    (r) => r.loan.balance_unavailable || r.loan.outstanding_amount == null,
  );
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);

  return (
    <div
      role="status"
      className="relative mb-3 overflow-hidden rounded-lg border border-[#D97757]/50 bg-gradient-to-r from-[#FFF7ED] via-white to-[#FFF7ED] dark:from-[#D97757]/15 dark:via-[#27272A] dark:to-[#D97757]/10 shadow-sm"
    >
      {/* Accent strip so it reads as a notification, not another stat card */}
      <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-[#D97757] to-[#F59E0B]" />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pl-5 pr-4 py-3">
        <div className="relative shrink-0">
          <div className="size-10 rounded-full bg-[#D97757] text-white flex items-center justify-center shadow-md shadow-[#D97757]/30">
            <BellRing size={19} className="motion-safe:animate-[pulse_2s_ease-in-out_infinite]" />
          </div>
          <span className="absolute -top-0.5 -right-0.5 flex size-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75 motion-safe:animate-ping" />
            <span className="relative inline-flex size-3 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#27272A]" />
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[14px] font-extrabold text-[#9A3412] dark:text-[#F7B79B]">
              {rows.length === 1
                ? "You have a pending loan"
                : `You have ${rows.length} pending loans`}
            </h3>
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#D97757] text-white">
              Action needed
            </span>
          </div>
          <p className="text-[12px] text-[#9A3412]/80 dark:text-[#F7B79B]/80 font-medium mt-0.5">
            {pending.length === 1
              ? "A project of yours has a loan that is not yet settled."
              : `${pending.length} of your projects have loans that are not yet settled.`}{" "}
            It will be settled from the next Fund Received on that project.
          </p>
        </div>

        <div className="sm:text-right shrink-0">
          <div className="text-[10px] uppercase tracking-widest font-extrabold text-[#9A3412]/70 dark:text-[#F7B79B]/70">
            Total outstanding
          </div>
          <div className="text-[22px] font-extrabold leading-none text-[#D97757]">
            {fmtINR(totalOutstanding)}
            {anyUnknown && <span className="text-[14px] align-top">*</span>}
          </div>
        </div>
      </div>

      <div className="mx-4 mb-3 ml-5 rounded-lg border border-[#D97757]/25 bg-white/80 dark:bg-[#18181B]/60 divide-y divide-[#D97757]/15">
        {visible.map(({ project, loan }) => {
          const unknown = loan.balance_unavailable || loan.outstanding_amount == null;
          return (
            <div
              key={`${project.name}-${loan.ledger_loan_number}`}
              className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 px-3 py-2"
            >
              <div className="flex items-start gap-2.5 flex-1 min-w-0">
                <Landmark size={15} className="text-[#D97757] mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                    {project.project_no || project.name}
                    {project.project_title && (
                      <span className="font-medium text-[#71717A] dark:text-[#A1A1AA]">
                        {" "}· {project.project_title}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-2 flex-wrap">
                    <span className="font-mono">{loan.loan_reference}</span>
                    <span>Loan {fmtINR(loan.loan_amount)}</span>
                    {loan.loan_received_date && <span>since {loan.loan_received_date}</span>}
                    <span className="px-1.5 py-px rounded bg-[#FFF7ED] dark:bg-[#D97757]/15 text-[#9A3412] dark:text-[#F7B79B] font-semibold">
                      {humanStatus(loan.loan_status)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 md:justify-end shrink-0 pl-6 md:pl-0">
                <div className="text-right">
                  <div className={cn("text-[14px] font-extrabold", unknown ? "text-amber-600 dark:text-amber-400" : "text-[#D97757]")}>
                    {unknown ? "Balance unavailable" : fmtINR(loan.outstanding_amount ?? 0)}
                  </div>
                  {!unknown && (
                    <div className="text-[10px] uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA] font-bold">
                      outstanding
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate(`/project-details-overview/${project.name}?tab=overview`)
                  }
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-[11px] font-bold uppercase tracking-wide text-white bg-[#D97757] hover:bg-[#c5684a] transition-colors"
                >
                  View project
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {(rows.length > COLLAPSED_ROWS || anyUnknown) && (
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pl-5 -mt-1">
          <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
            {anyUnknown &&
              "* Excludes loans whose balance the Accounts service couldn't report right now."}
          </span>
          {rows.length > COLLAPSED_ROWS && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#D97757] hover:text-[#9A3412] transition-colors"
            >
              {expanded ? (
                <>
                  Show less <ChevronUp size={13} />
                </>
              ) : (
                <>
                  Show all {rows.length} <ChevronDown size={13} />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PendingLoansAlert;
