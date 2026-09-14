import { useState, useEffect } from "react";

/**
 * Hook to fetch Project Ledger data from the Go API service.
 * Refactored to use /ledger-api endpoints as requested.
 */

export interface BudgetEntry {
  sl: number;
  date: string;
  particulars: string;
  ref: string;
  received: number;
  committed: number;
  commitableBalance: number;
  bmr: string;
  payment: number;
  actualBalance: number;
  type: "commitment" | "transaction";
  head?: string;
  headActualBalance?: number;
  transactionId?: number;
  frapAppId?: string;
}

export interface HeadBalance {
  actual: number;
  commitable: number;
  received: number;
  committed: number;
  payment: number;
  id: number;
}

/**
 * The single budget head an overhead spend is booked against. These funds have no head
 * dimension — the balance is one pool — but an overhead commit still carries a real
 * account head. Budget Head id 1 is "Overhead".
 */
export const PDF_BUDGET_HEAD = "Overhead";
export const PDF_BUDGET_HEAD_ID = 1;

/**
 * Project number prefixes for the overhead funds surfaced as projects: `PDF{employee_id}`
 * and `DPF{dept_id}`.
 *
 * Declared here rather than imported from `@/services/overheadLedger` because that module
 * imports the budget-head constants above — going the other way would be a cycle.
 */
const OVERHEAD_PREFIXES = ["PDF", "DPF"];
const isOverheadProjectCode = (code: string) =>
  OVERHEAD_PREFIXES.some((p) => code.startsWith(p));

export const useProjectBudget = (projectCode: string) => {
  const [budgetData, setBudgetData] = useState<BudgetEntry[]>([]);
  const [heads, setHeads] = useState<string[]>([]);
  const [headBalances, setHeadBalances] = useState<Record<string, HeadBalance>>(
    {},
  );
  const [actualBalance, setActualBalance] = useState(0);
  const [commitableBalance, setCommitableBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectCode) {
      setIsLoading(false);
      return;
    }

    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // An overhead fund project (PDF per employee, DPF per department) is a single pool
        // with no head dimension, and its data lives behind a whitelisted Frappe method —
        // never /ledger-api, which is an unauthenticated proxy and would expose one
        // employee's earnings, or one department's fund, to anybody
        // (see docs/pdf-project-implementation.md §5.6d). Handled first so the per-head
        // fan-out below never runs for an overhead fund.
        if (isOverheadProjectCode(projectCode)) {
          const res = await fetch(
            `/api/method/rndopsapp.rndopsapp.overhead_fund.get_overhead_balance?project_number=${encodeURIComponent(projectCode)}`,
            { credentials: "include", headers: { Accept: "application/json" } },
          );
          const payload = await res.json();
          const d = payload?.message?.data;
          if (!d) throw new Error(payload?.message?.message || "Could not load overhead fund balance");

          const commitable = Number(d.availableCommitAmount) || 0;
          const actual = Number(d.availablePaymentAmount) || 0;

          setHeads([PDF_BUDGET_HEAD]);
          setHeadBalances({
            [PDF_BUDGET_HEAD]: {
              received: Number(d.totalFundReceived) || 0,
              committed: Number(d.totalCommitted) || 0,
              payment: Number(d.totalPaid) || 0,
              actual,
              commitable,
              id: PDF_BUDGET_HEAD_ID,
            },
          });
          setActualBalance(actual);
          setCommitableBalance(commitable);
          setBudgetData([]);
          setIsLoading(false);
          return;
        }

        // 1. Fetch Budget Heads
        const headRes = await fetch(
          '/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0',
          { credentials: "include", headers: { Accept: "application/json" } },
        );
        const headData = await headRes.json();
        const availableHeads = headData?.data || [];

        const headNames = availableHeads.map((h: any) => h.budget_head);
        setHeads(headNames);


        // 2. Fetch Ledger Data for EACH head
        // Using Promise.all to fetch concurrently
        const promises = availableHeads.map((head: any) => {
          const apiUrl = `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectCode)}&accountHeadId=${head.id}`;

          return fetch(apiUrl, { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
              if (Array.isArray(data) && data.length > 0) {
              }
              return {
                head: head.budget_head,
                headId: head.id,
                data: Array.isArray(data) ? data : [],
              };
            })
            .catch((err) => {
              return { head: head.budget_head, headId: head.id, data: [] };
            });
        });

        const results = await Promise.all(promises);

        // 3. Process Results
        let allEntries: BudgetEntry[] = [];
        let totalActual = 0;
        let totalCommitable = 0;
        const balances: Record<string, HeadBalance> = {};

        results.forEach(({ head, headId, data }) => {
          // Calculate head totals
          const headReceived = data.reduce(
            (sum: number, item: any) => sum + (item.fundReceivedAmount || 0),
            0,
          );
          const headCommitted = data.reduce(
            (sum: number, item: any) =>
              item.status === "CANCELLED"
                ? sum
                : sum + (item.commitAmount || 0),
            0,
          );
          const headPayment = data.reduce(
            (sum: number, item: any) =>
              item.status === "CANCELLED"
                ? sum
                : sum + (item.paymentAmount || 0),
            0,
          );

          // Logic from ProjectDetailsOverview:
          // commitableBalance per row is typically running balance.
          // The API returns 'commitableBalance' and 'paymentBalance' in the object.
          // We take the last entry's balance as the current head balance
          // const lastEntry = data.length > 0 ? data[data.length - 1] : null;
          // const currentHeadActual = lastEntry ? lastEntry.paymentBalance : 0;
          // const currentHeadCommitable = lastEntry ? lastEntry.commitableBalance : 0;

          // HOWEVER, if we want to trust our own sum (safer if API pagination issues exist, but API seems to return all):
          // Let's rely on reducing the sums for robustness if API guarantees full history
          // const calcActual = headReceived - headPayment;
          // const calcCommitable = headReceived - headCommitted - headPayment;

          // ProjectDetailsOverview uses the API's provided balance fields primarily for row display
          // but calculates totals in summary view using reduce. Let's do the same.

          balances[head] = {
            received: headReceived,
            committed: headCommitted,
            payment: headPayment,
            actual: headReceived - headPayment, // Calculated Actual
            commitable: headReceived - headCommitted - headPayment, // Calculated Commitable
            id: headId,
          };

          totalActual += balances[head].actual;
          totalCommitable += balances[head].commitable;

          // Map API entries to BudgetEntry interface
          const mappedEntries = data.map((item: any, idx: number) => ({
            sl: idx + 1,
            date: item.transactionDate,
            particulars: item.particulars,
            ref: item.refDetails,
            received: item.fundReceivedAmount || 0,
            committed: item.commitAmount || 0,
            payment: item.paymentAmount || 0,

            // Use API provided balances for the ledger row
            commitableBalance: item.commitableBalance,
            actualBalance: item.paymentBalance,

            bmr: item.bmr,
            type:
              item.transactionType === "Commitment" ||
              item.transactionType === "COMMIT"
                ? "commitment"
                : "transaction",
            head: head,
            headActualBalance: item.paymentBalance,
            transactionId: item.transactionId,
            frapAppId: item.frapAppId,
          }));

          allEntries = [...allEntries, ...mappedEntries];
        });

        // Sort all entries by date for a unified "All" view (optional, but good for "All" tab)
        // Note: Sl No will be per-head in the combined view unless we regenerate IDs.
        // ReimbursementDetails ledger modal filters by head anyway.

        setBudgetData(allEntries);
        setHeadBalances(balances);
        setActualBalance(totalActual);
        setCommitableBalance(totalCommitable);

        // Debug logging
      } catch (err: any) {
        setError(err.message || "Failed to load budget data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [projectCode]);

  return {
    budgetData,
    heads,
    headBalances, // Exported for the summary widget
    actualBalance,
    commitableBalance,
    isLoading,
    error,
  };
};
