import { useState, useEffect, useMemo, useCallback } from "react";
import type { ElementType } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";
import ProjectDetailsOverview from "@/pages/ProjectDetailsOverview";
import {
  Search, X, ChevronDown, ChevronUp, BookOpen,
  Calendar, User, Hash, Tag, FileSpreadsheet,
  ArrowUpDown, Layers, AlertCircle, FolderOpen,
} from "lucide-react";

// ─── Full-page project detail modal ─────────────────────────────────────────

function ProjectDetailModal({ projectName, onClose }: { projectName: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative flex-1 mx-auto my-4 w-full max-w-7xl flex flex-col bg-[#FAFAF9] dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <span className="text-[13px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#D97757]" />
            Project Registration
            <span className="px-2 py-0.5 rounded-full text-[11px] bg-orange-50 dark:bg-zinc-800 text-[#D97757] font-mono border border-orange-100 dark:border-zinc-700">
              {projectName}
            </span>
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <ProjectDetailsOverview projectName={projectName} embedded hideActions />
        </div>
      </div>
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Project {
  name: string;
  project_title: string;
  workflow_state: string;
  pi_webmail: string;
  project_no?: string;
  project_type?: string;
  creation?: string;
  modified?: string;
}

interface LedgerTransaction {
  transactionType: string;
  transactionId: number;
  transactionDate: string;
  particulars: string;
  refDetails: string;
  fundReceivedAmount: number | null;
  commitAmount: number | null;
  paymentAmount: number | null;
  commitableBalance: number;
  paymentBalance: number;
  balance: number;
  status: string;
  bmr: string | null;
  frapAppId?: string;
  recordTime?: string;
}

interface BudgetHead { name: string; id: number; }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtCurrency = (n: number | null) =>
  n == null ? "—" : new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const getFinancialYear = (dateStr: string) => {
  const d = new Date(dateStr);
  const m = d.getMonth();
  const y = d.getFullYear();
  const s = m >= 3 ? y : y - 1;
  return `${s}-${String(s + 1).slice(-2)}`;
};

const getStateStyle = (state: string) => {
  const s = state?.toLowerCase() || "";
  if (s.includes("approved") || s.includes("active"))
    return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40";
  if (s.includes("draft") || s.includes("pending"))
    return "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40";
  if (s.includes("reject") || s.includes("cancel"))
    return "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800/40";
  return "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40";
};

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div className={cn("border-2 border-[#E4E4E7] dark:border-[#3F3F46] border-t-[#71717A] rounded-full animate-spin", size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5")} />
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: ElementType; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center py-16 text-[#A1A1AA] dark:text-[#71717A]">
      <Icon className="h-10 w-10 mb-3 opacity-20" />
      <p className="text-[14px] font-semibold">{title}</p>
      {subtitle && <p className="text-[12px] mt-1 opacity-75">{subtitle}</p>}
    </div>
  );
}

// ─── Ledger Panel (inline, per-project) ──────────────────────────────────────

function ProjectLedgerPanel({ projectNo }: { projectNo: string }) {
  const [budgetHeads, setBudgetHeads] = useState<BudgetHead[]>([]);
  const [headsWithData, setHeadsWithData] = useState<Set<number>>(new Set());
  const [headsLoading, setHeadsLoading] = useState(true);
  const [checkingHeads, setCheckingHeads] = useState(false);
  const [activeHead, setActiveHead] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnError, setTxnError] = useState<string | null>(null);
  const [view, setView] = useState<"transactions" | "yearly">("transactions");
  const [selectedYear, setSelectedYear] = useState("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("oldest");
  const [showAllHeads, setShowAllHeads] = useState(false);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);

  // Fetch budget heads
  useEffect(() => {
    fetch('/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0')
      .then(r => r.json())
      .then(result => {
        if (result?.data) {
          setBudgetHeads(result.data.map((i: { budget_head: string; id: number }) => ({ name: i.budget_head, id: i.id })));
        }
      })
      .catch(() => {})
      .finally(() => setHeadsLoading(false));
  }, []);

  // Check which heads have data for this project
  useEffect(() => {
    if (headsLoading || budgetHeads.length === 0 || !projectNo) return;
    setCheckingHeads(true);
    const found = new Set<number>();
    Promise.all(
      budgetHeads.map(async h => {
        try {
          const r = await fetch(`/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectNo)}&accountHeadId=${h.id}`, { credentials: "include" });
          if (r.ok) {
            const d = await r.json();
            if (Array.isArray(d) && d.length > 0) found.add(h.id);
          }
        } catch { /* silent */ }
      })
    ).finally(() => {
      setHeadsWithData(found);
      setCheckingHeads(false);
    });
  }, [headsLoading, budgetHeads, projectNo]);

  // Set default active head once checking is done
  useEffect(() => {
    if (!checkingHeads && headsWithData.size > 0 && activeHead === null) {
      const first = budgetHeads.find(h => headsWithData.has(h.id));
      if (first) setActiveHead(first.id);
    }
  }, [checkingHeads, headsWithData, budgetHeads, activeHead]);

  // Fetch transactions for active head
  const fetchTransactions = useCallback(async (headId: number) => {
    setTxnLoading(true);
    setTxnError(null);
    try {
      const r = await fetch(`/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectNo)}&accountHeadId=${headId}`, { credentials: "include" });
      if (!r.ok) throw new Error(r.statusText);
      const raw: LedgerTransaction[] = await r.json();
      const sorted = [...(Array.isArray(raw) ? raw : [])].sort((a, b) =>
        new Date(a.recordTime || a.transactionDate).getTime() - new Date(b.recordTime || b.transactionDate).getTime()
      );
      let running = 0;
      const calculated = sorted.map(t => {
        running += (t.fundReceivedAmount || 0) - (t.paymentAmount || 0);
        return { ...t, paymentBalance: running };
      });
      setTransactions(calculated);
    } catch (e: unknown) {
      setTxnError(e instanceof Error ? e.message : "Failed to load ledger");
      setTransactions([]);
    } finally {
      setTxnLoading(false);
    }
  }, [projectNo]);

  useEffect(() => {
    if (activeHead !== null) fetchTransactions(activeHead);
  }, [activeHead, fetchTransactions]);

  const visibleHeads = useMemo(() =>
    showAllHeads ? budgetHeads : budgetHeads.filter(h => headsWithData.has(h.id)),
    [budgetHeads, headsWithData, showAllHeads]
  );

  const availableYears = useMemo(() => {
    const s = new Set<string>();
    transactions.forEach(t => { if (t.transactionDate) s.add(getFinancialYear(t.transactionDate)); });
    return [...s].sort().reverse();
  }, [transactions]);

  const yearlyData = useMemo(() => {
    const map = new Map<string, { totalReceived: number; totalPaid: number; totalCommitted: number; count: number; txns: LedgerTransaction[] }>();
    transactions.forEach(t => {
      const fy = t.transactionDate ? getFinancialYear(t.transactionDate) : "Unknown";
      if (!map.has(fy)) map.set(fy, { totalReceived: 0, totalPaid: 0, totalCommitted: 0, count: 0, txns: [] });
      const e = map.get(fy)!;
      e.totalReceived += t.fundReceivedAmount || 0;
      e.totalPaid += t.paymentAmount || 0;
      e.totalCommitted += t.commitAmount || 0;
      e.count += 1;
      e.txns.push(t);
    });
    const rows: { fy: string; openingBalance: number; totalReceived: number; totalPaid: number; totalCommitted: number; closingBalance: number; count: number; txns: LedgerTransaction[] }[] = [];
    let running = 0;
    [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).forEach(([fy, data]) => {
      const opening = running;
      const closing = opening + data.totalReceived - data.totalPaid;
      running = closing;
      rows.push({ fy, openingBalance: opening, ...data, closingBalance: closing });
    });
    return rows;
  }, [transactions]);

  const displayTxns = useMemo(() => {
    const filtered = selectedYear === "all" ? transactions : transactions.filter(t => t.transactionDate && getFinancialYear(t.transactionDate) === selectedYear);
    return sortOrder === "newest" ? [...filtered].reverse() : filtered;
  }, [transactions, selectedYear, sortOrder]);

  const isLoading = headsLoading || checkingHeads;

  return (
    <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#1C1C1F]">
      {/* Ledger toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
        <FileSpreadsheet className="h-3.5 w-3.5 text-[#D97757] flex-shrink-0" />
        <span className="text-[11px] font-extrabold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest">Project Ledger</span>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg p-0.5 ml-2">
          {(["transactions", "yearly"] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-2.5 py-1 rounded text-[10px] font-bold transition-colors capitalize",
                view === v ? "bg-[#D97757] text-white" : "text-[#71717A] dark:text-[#A1A1AA] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]"
              )}
            >
              {v === "transactions" ? "Transactions" : "Yearly"}
            </button>
          ))}
        </div>

        {view === "transactions" && (
          <>
            {/* Year filter */}
            {availableYears.length > 0 && (
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="text-[10px] font-bold bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2 py-1 text-[#3F3F46] dark:text-[#E4E4E7] outline-none cursor-pointer"
              >
                <option value="all">All Years</option>
                {availableYears.map(y => <option key={y} value={y}>FY {y}</option>)}
              </select>
            )}
            {/* Sort */}
            <button
              onClick={() => setSortOrder(s => s === "newest" ? "oldest" : "newest")}
              className="flex items-center gap-1 text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7] bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-2 py-1 transition-colors"
            >
              <ArrowUpDown className="h-2.5 w-2.5" />
              {sortOrder === "newest" ? "Newest" : "Oldest"}
            </button>
          </>
        )}
      </div>

      {/* Budget Head Tabs */}
      <div className="flex items-center gap-2 px-5 py-2.5 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex-wrap">
        {isLoading ? (
          <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA]">
            <Spinner size="sm" /> Checking budget heads…
          </div>
        ) : visibleHeads.length === 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#A1A1AA] dark:text-[#71717A]">No budget heads with data.</span>
            <button onClick={() => setShowAllHeads(true)} className="text-[11px] text-[#D97757] font-bold hover:underline">
              Show all heads
            </button>
          </div>
        ) : (
          <>
            {visibleHeads.map(h => (
              <button
                key={h.id}
                onClick={() => setActiveHead(h.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all",
                  activeHead === h.id
                    ? "bg-[#D97757]/10 text-[#D97757] border border-[#D97757]/30"
                    : "bg-white dark:bg-[#27272A] text-[#71717A] dark:text-[#A1A1AA] border border-[#E4E4E7] dark:border-[#3F3F46] hover:border-[#D97757]/40"
                )}
              >
                {h.name}
              </button>
            ))}
            {!showAllHeads && budgetHeads.length > visibleHeads.length && (
              <button onClick={() => setShowAllHeads(true)} className="text-[10px] text-[#4A6CF7] font-bold hover:underline">
                +{budgetHeads.length - visibleHeads.length} more
              </button>
            )}
          </>
        )}
      </div>

      {/* Ledger Content */}
      {view === "transactions" && (
        <div className="overflow-x-auto">
          {txnLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-[#A1A1AA]">
              <Spinner /> <span className="text-[12px]">Loading ledger…</span>
            </div>
          ) : txnError ? (
            <div className="flex flex-col items-center py-10">
              <p className="text-[12px] text-red-500 mb-2">{txnError}</p>
              {activeHead !== null && (
                <button onClick={() => fetchTransactions(activeHead)} className="text-[11px] text-[#D97757] font-bold hover:underline">
                  Retry
                </button>
              )}
            </div>
          ) : displayTxns.length === 0 ? (
            <EmptyState icon={FileSpreadsheet} title="No transactions found" subtitle={selectedYear !== "all" ? `No data for FY ${selectedYear}` : "Select a budget head above"} />
          ) : (
            <table className="w-full text-[11px]">
              <thead className="bg-[#EEF2FF] dark:bg-blue-950/20 border-b border-[#C7D2FE] dark:border-blue-900/40 sticky top-0">
                <tr>
                  {["Date / TID", "Particulars", "App ID", "BMR", "Received", "Committed", "Commit Bal", "Paid", "Actual Bal", "Status"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-[9px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200 whitespace-nowrap last:text-center">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F4F5] dark:divide-[#3F3F46]/50">
                {displayTxns.map((t, i) => (
                  <tr key={`${t.transactionId}-${i}`} className="hover:bg-white dark:hover:bg-[#27272A]/60 transition-colors">
                    <td className="px-3 py-2 whitespace-nowrap">
                      <div className="font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{t.transactionDate ? new Date(t.transactionDate).toLocaleDateString("en-GB") : "—"}</div>
                      <div className="text-[9px] text-[#A1A1AA] font-mono">TID {t.transactionId || "—"}</div>
                    </td>
                    <td className="px-3 py-2 max-w-[200px]">
                      <div className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate" title={t.particulars}>{t.particulars || "—"}</div>
                      {t.refDetails && <div className="text-[9px] text-[#A1A1AA] truncate">{t.refDetails}</div>}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#71717A] whitespace-nowrap">{t.frapAppId || "—"}</td>
                    <td className="px-3 py-2 text-[#71717A] whitespace-nowrap">{t.bmr || "—"}</td>
                    <td className="px-3 py-2 text-right font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">{t.fundReceivedAmount ? fmtCurrency(t.fundReceivedAmount) : "—"}</td>
                    <td className="px-3 py-2 text-right font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">{t.commitAmount ? fmtCurrency(t.commitAmount) : "—"}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap">{fmtCurrency(t.commitableBalance)}</td>
                    <td className="px-3 py-2 text-right font-bold text-red-600 dark:text-red-400 whitespace-nowrap">{t.paymentAmount ? fmtCurrency(t.paymentAmount) : "—"}</td>
                    <td className="px-3 py-2 text-right font-extrabold text-[#2563EB] dark:text-blue-400 whitespace-nowrap">{fmtCurrency(t.paymentBalance)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn(
                        "inline-flex px-1.5 py-0.5 rounded text-[9px] font-bold whitespace-nowrap",
                        t.status === "PAID" || t.status === "Settled" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" :
                          t.status === "PENDING" || t.status === "Pending" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" :
                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                      )}>
                        {t.status || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {view === "yearly" && (
        <div className="p-5 space-y-3">
          {txnLoading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-[#A1A1AA]">
              <Spinner /> <span className="text-[12px]">Loading…</span>
            </div>
          ) : yearlyData.length === 0 ? (
            <EmptyState icon={FileSpreadsheet} title="No yearly data" subtitle="Select a budget head" />
          ) : (
            <>
              {yearlyData.map(row => {
                const isExp = expandedYear === row.fy;
                return (
                  <div key={row.fy} className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] overflow-hidden">
                    <button
                      className="w-full px-4 py-3 text-left hover:bg-[#FAFAF9] dark:hover:bg-[#3F3F46]/20 transition-colors"
                      onClick={() => setExpandedYear(isExp ? null : row.fy)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                          <span className={cn("text-[10px] transition-transform duration-200", isExp && "rotate-90")}>▶</span>
                          FY {row.fy}
                        </div>
                        <span className="text-[10px] font-bold text-[#A1A1AA] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2 py-0.5 rounded">
                          {row.count} txns
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[
                          ["Opening", row.openingBalance, "text-[#71717A]"],
                          ["Received", row.totalReceived, "text-emerald-700 dark:text-emerald-400"],
                          ["Committed", row.totalCommitted, "text-orange-600 dark:text-orange-400"],
                          ["Paid", row.totalPaid, "text-red-600 dark:text-red-400"],
                          ["Closing", row.closingBalance, "text-[#2563EB] dark:text-blue-400"],
                        ].map(([label, value]) => (
                          <div key={String(label)}>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-0.5">{label}</div>
                            <div className={cn("text-[12px] font-extrabold", String(
                              label === "Opening" ? "text-[#71717A]" :
                              label === "Received" ? "text-emerald-700 dark:text-emerald-400" :
                              label === "Committed" ? "text-orange-600 dark:text-orange-400" :
                              label === "Paid" ? "text-red-600 dark:text-red-400" :
                              "text-[#2563EB] dark:text-blue-400"
                            ))}>
                              {(Number(value) === 0 && label !== "Opening" && label !== "Closing") ? "—" : fmtCurrency(Number(value))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </button>
                    {isExp && (
                      <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] divide-y divide-[#F4F4F5] dark:divide-[#3F3F46]/50">
                        {row.txns.map((t, i) => (
                          <div key={i} className="px-5 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[10px] text-[#A1A1AA] mb-0.5">
                                {t.transactionDate ? new Date(t.transactionDate).toLocaleDateString("en-GB") : "—"}
                                {t.bmr ? ` · BMR ${t.bmr}` : ""}
                              </div>
                              <div className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] truncate">{t.particulars}</div>
                              {t.refDetails && <div className="text-[10px] text-[#71717A] truncate">{t.refDetails}</div>}
                            </div>
                            <div className="flex items-center gap-4 text-right flex-shrink-0">
                              <span className="text-[11px] font-bold text-emerald-700">{t.fundReceivedAmount ? fmtCurrency(t.fundReceivedAmount) : "—"}</span>
                              <span className="text-[11px] font-bold text-red-600">{t.paymentAmount ? fmtCurrency(t.paymentAmount) : "—"}</span>
                              <span className="text-[11px] font-extrabold text-[#2563EB]">{fmtCurrency(t.paymentBalance)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Totals */}
              <div className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] px-4 py-3">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#71717A] mb-2">Overall Total</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ["Total Received", yearlyData.reduce((s, r) => s + r.totalReceived, 0), "text-emerald-700 dark:text-emerald-400"],
                    ["Total Committed", yearlyData.reduce((s, r) => s + r.totalCommitted, 0), "text-orange-600 dark:text-orange-400"],
                    ["Total Paid", yearlyData.reduce((s, r) => s + r.totalPaid, 0), "text-red-600 dark:text-red-400"],
                    ["Final Balance", yearlyData[yearlyData.length - 1]?.closingBalance || 0, "text-[#2563EB] dark:text-blue-400"],
                  ].map(([label, value, cls]) => (
                    <div key={String(label)}>
                      <div className="text-[9px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-0.5">{label}</div>
                      <div className={cn("text-[13px] font-extrabold", String(cls))}>{fmtCurrency(Number(value))}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, isExpanded, onToggle, onViewDetail }: {
  project: Project;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetail: () => void;
}) {

  return (
    <div className={cn(
      "bg-white dark:bg-[#27272A] rounded-xl border transition-all duration-150",
      isExpanded
        ? "border-[#D97757]/40 dark:border-[#D97757]/30 shadow-md"
        : "border-[#E4E4E7] dark:border-[#3F3F46] hover:border-[#D97757]/30 hover:shadow-sm"
    )}>
      {/* Card header row */}
      <div className="flex items-start gap-4 px-5 py-4">
        {/* Project icon */}
        <div className="w-9 h-9 bg-orange-50 dark:bg-orange-950/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
          <BookOpen className="h-4 w-4 text-[#D97757]" />
        </div>

        {/* Info — clicking toggles ledger */}
        <button onClick={onToggle} className="flex-1 min-w-0 text-left">
          {/* Title + state badge */}
          <div className="flex items-start gap-2 flex-wrap mb-1.5">
            <h3 className="text-[14px] font-bold text-[#27272A] dark:text-[#F4F4F5] leading-snug flex-1 min-w-0">
              {project.project_title || project.name}
            </h3>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 whitespace-nowrap", getStateStyle(project.workflow_state))}>
              {project.workflow_state}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
            {project.project_no && (
              <span className="flex items-center gap-1.5">
                <Hash className="h-3 w-3 flex-shrink-0" />
                {project.project_no}
              </span>
            )}
            {project.pi_webmail && (
              <span className="flex items-center gap-1.5">
                <User className="h-3 w-3 flex-shrink-0" />
                {project.pi_webmail}
              </span>
            )}
            {project.project_type && (
              <span className="flex items-center gap-1.5">
                <Tag className="h-3 w-3 flex-shrink-0" />
                {project.project_type}
              </span>
            )}
            {project.creation && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3 flex-shrink-0" />
                {fmtDate(project.creation)}
              </span>
            )}
          </div>
        </button>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          {/* View Detail button */}
          <button
            onClick={onViewDetail}
            className="flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 bg-[#F4F4F5] dark:bg-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] hover:bg-[#D97757] hover:text-white rounded-lg transition-all border border-transparent hover:border-[#D97757]"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">View Detail</span>
          </button>

          {/* Ledger toggle */}
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all",
              isExpanded
                ? "bg-[#D97757]/10 border-[#D97757]/30 text-[#D97757]"
                : "bg-[#F4F4F5] dark:bg-[#3F3F46] border-transparent text-[#71717A] dark:text-[#A1A1AA] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]"
            )}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ledger</span>
            {isExpanded
              ? <ChevronUp className="h-3 w-3" />
              : <ChevronDown className="h-3 w-3" />
            }
          </button>
        </div>
      </div>

      {/* Ledger panel — only when expanded */}
      {isExpanded && (
        <ProjectLedgerPanel projectNo={project.project_no || project.name} />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProjectSearch() {
  const [rawSearch, setRawSearch] = useState("");
  const [debouncedSearch] = useDebounce(rawSearch, 400);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [previewProject, setPreviewProject] = useState<string | null>(null);

  const isSearching = debouncedSearch.trim().length > 0;

  // Initial: latest 10 projects
  const { data: initialData, isLoading: initialLoading } = useFrappeGetCall<{ message: Project[] }>(
    "frappe.client.get_list",
    {
      doctype: "Project Registration",
      fields: '["name","project_title","workflow_state","pi_webmail","project_no","project_type","creation","modified"]',
      order_by: "creation desc",
      limit_page_length: 10,
    },
    !isSearching ? undefined : null  // disable when searching
  );

  // Search: or_filters across key fields
  const { data: searchData, isLoading: searchLoading } = useFrappeGetCall<{ message: Project[] }>(
    "frappe.client.get_list",
    {
      doctype: "Project Registration",
      fields: '["name","project_title","workflow_state","pi_webmail","project_no","project_type","creation","modified"]',
      or_filters: JSON.stringify([
        ["Project Registration", "project_no", "like", `%${debouncedSearch}%`],
        ["Project Registration", "project_title", "like", `%${debouncedSearch}%`],
        ["Project Registration", "pi_webmail", "like", `%${debouncedSearch}%`],
      ]),
      order_by: "creation desc",
      limit_page_length: 30,
    },
    isSearching ? undefined : null  // disable when not searching
  );

  const projects: Project[] = useMemo(() => {
    const raw = isSearching ? searchData?.message : initialData?.message;
    return Array.isArray(raw) ? raw : [];
  }, [isSearching, searchData, initialData]);

  const isLoading = isSearching ? searchLoading : initialLoading;

  const toggleProject = (name: string) => {
    setExpandedProject(v => v === name ? null : name);
  };

  return (
    <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
      <div className="px-4 md:px-6 xl:px-8 pt-6 pb-12">

        {/* ─── Header ─── */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 bg-[#D97757] rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0">
              <Search size={17} />
            </div>
            <div>
              <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-[#27272A] dark:text-[#F4F4F5] leading-none">
                Project Search
              </h1>
              <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                Search by project number, title, or PI name/email
              </p>
            </div>
          </div>
        </div>

        {/* ─── Search Bar ─── */}
        <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm p-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 bg-[#FAFAF9] dark:bg-[#1C1C1F] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl px-4 py-2.5 focus-within:border-[#D97757] dark:focus-within:border-[#D97757] transition-colors">
              <Search className="h-4 w-4 text-[#A1A1AA] dark:text-[#71717A] flex-shrink-0" />
              <input
                autoFocus
                value={rawSearch}
                onChange={e => setRawSearch(e.target.value)}
                placeholder="Search project number, title, PI email or username…"
                className="bg-transparent text-[13px] text-[#3F3F46] dark:text-[#E4E4E7] placeholder-[#A1A1AA] dark:placeholder-[#71717A] outline-none w-full"
              />
              {rawSearch && (
                <button onClick={() => setRawSearch("")} className="text-[#A1A1AA] hover:text-[#71717A] transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search hints */}
          <div className="flex items-center gap-3 mt-2.5 flex-wrap">
            {[
              { icon: Hash, label: "Project No." },
              { icon: BookOpen, label: "Title" },
              { icon: User, label: "PI Email / Username" },
            ].map(({ icon: Icon, label }) => (
              <span key={label} className="flex items-center gap-1 text-[10px] text-[#A1A1AA] dark:text-[#71717A]">
                <Icon className="h-2.5 w-2.5" /> {label}
              </span>
            ))}
            <span className="text-[10px] text-[#A1A1AA] dark:text-[#71717A] ml-auto">
              {isSearching
                ? isLoading ? "Searching…" : `${projects.length} result${projects.length !== 1 ? "s" : ""}`
                : "Showing latest 10 projects"}
            </span>
          </div>
        </div>

        {/* ─── Results ─── */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
              <div className="flex items-center justify-center py-16 gap-3 text-[#A1A1AA]">
                <Spinner /> <span className="text-[13px]">{isSearching ? "Searching…" : "Loading projects…"}</span>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
              <EmptyState
                icon={isSearching ? AlertCircle : Layers}
                title={isSearching ? "No projects found" : "No projects available"}
                subtitle={isSearching ? `No results for "${debouncedSearch}"` : "Start typing to search"}
              />
            </div>
          ) : (
            <>
              {/* Section label */}
              <div className="flex items-center gap-2.5 px-1">
                <span className="text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.1em] whitespace-nowrap">
                  {isSearching ? `Search Results` : "Latest Projects"}
                </span>
                <div className="flex-1 h-[1px] bg-[#E4E4E7] dark:bg-[#3F3F46]" />
                <span className="text-[10px] text-[#A1A1AA] font-mono whitespace-nowrap">{projects.length} projects</span>
              </div>

              {projects.map(p => (
                <ProjectCard
                  key={p.name}
                  project={p}
                  isExpanded={expandedProject === p.name}
                  onToggle={() => toggleProject(p.name)}
                  onViewDetail={() => setPreviewProject(p.name)}
                />
              ))}

              {isSearching && projects.length >= 30 && (
                <p className="text-center text-[11px] text-[#A1A1AA] pt-1">
                  Showing top 30 results. Refine your search for more specific results.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Full-page project detail modal */}
      {previewProject && (
        <ProjectDetailModal
          projectName={previewProject}
          onClose={() => setPreviewProject(null)}
        />
      )}
    </div>
  );
}
