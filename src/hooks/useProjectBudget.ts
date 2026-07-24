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
        // 1. Fetch Budget Heads
        const headRes = await fetch(
          '/api/resource/Budget%20Head?fields=["budget_head","name"]&order_by=name%20asc&limit_page_length=0',
          { credentials: "include", headers: { Accept: "application/json" } },
        );
        const headData = await headRes.json();
        const availableHeads = headData?.data || [];

        const headNames = availableHeads.map((h: any) => h.budget_head);
        setHeads(headNames);

        console.log("[useProjectBudget] Fetching for project:", projectCode);
        console.log("[useProjectBudget] Available heads:", availableHeads);

        // 2. Fetch Ledger Data for EACH head
        // Using Promise.all to fetch concurrently
        const promises = availableHeads.map((head: any) => {
          const apiUrl = `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectCode)}&accountHeadId=${encodeURIComponent(String(head.name))}`;
          console.log(`[useProjectBudget] Fetching: ${apiUrl}`);

          return fetch(apiUrl, { credentials: "include" })
            .then((res) => res.json())
            .then((data) => {
              console.log(
                `[useProjectBudget] Response for ${head.budget_head}:`,
                data,
              );
              if (Array.isArray(data) && data.length > 0) {
                console.log(
                  `[useProjectBudget] First item sample for ${head.budget_head}:`,
                  data[0],
                );
              }
              return {
                head: head.budget_head,
                headId: head.name,
                data: Array.isArray(data) ? data : [],
              };
            })
            .catch((err) => {
              console.error(
                `Failed to fetch ledger for ${head.budget_head}`,
                err,
              );
              return { head: head.budget_head, headId: head.name, data: [] };
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
            (sum: number, item: any) => sum + (item.commitAmount || 0),
            0,
          );
          const headPayment = data.reduce(
            (sum: number, item: any) => sum + (item.paymentAmount || 0),
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
        console.log("[useProjectBudget] Project:", projectCode);
        console.log("[useProjectBudget] Total Actual Balance:", totalActual);
        console.log(
          "[useProjectBudget] Total Commitable Balance:",
          totalCommitable,
        );
        console.log("[useProjectBudget] All Entries Count:", allEntries.length);
        console.log("[useProjectBudget] Head Balances:", balances);
      } catch (err: any) {
        console.error("Error in useProjectBudget:", err);
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
