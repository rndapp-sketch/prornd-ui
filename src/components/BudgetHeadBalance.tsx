import React from "react";
import { useProjectBudget } from "@/hooks/useProjectBudget";

interface Props {
  projectNumber: string;
  headValue: string;
  headLabel?: string;
}

const inr = (n: number) => `₹ ${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

// Available balance of the selected budget head, shown before the PI approves.
const BudgetHeadBalance: React.FC<Props> = ({ projectNumber, headValue, headLabel }) => {
  const { headBalances, isLoading, error } = useProjectBudget(projectNumber);

  const bal =
    headBalances[headLabel || ""] ||
    headBalances[headValue] ||
    Object.values(headBalances).find((b) => String(b.id) === String(headValue));

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-3 text-xs">
      <div className="mb-2 font-semibold text-zinc-700 dark:text-zinc-200">
        Available balance — {headLabel || headValue}
      </div>
      {isLoading ? (
        <p className="text-zinc-500">Loading available balance…</p>
      ) : error || !bal ? (
        <p className="text-amber-600 dark:text-amber-400">Could not load the balance for this head.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Available to commit</div>
            <div className={`text-sm font-semibold ${bal.commitable < 0 ? "text-red-600" : "text-green-700 dark:text-green-400"}`}>
              {inr(bal.commitable)}
            </div>
          </div>
          <div className="rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-2">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Actual balance</div>
            <div className={`text-sm font-semibold ${bal.actual < 0 ? "text-red-600" : "text-zinc-800 dark:text-zinc-100"}`}>
              {inr(bal.actual)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetHeadBalance;
