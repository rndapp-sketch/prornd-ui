import { useState, useEffect, useMemo } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { useDebounce } from "use-debounce";
import { Search, Download, Loader2, FileSpreadsheet, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "@/components/ui/global-loader";
import { fetchOverheadLedger, isOverheadProjectNo, OVERHEAD_BUDGET_HEAD_ID } from "@/services/overheadLedger";

interface ProjectOption {
    name: string;
    project_no?: string;
    project_title?: string;
}

interface BudgetHead {
    name: string;
    id: number;
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
    balance?: number;
    status: string;
    bmr: string | null;
    bankTransactionNumber: string | null;
    bankTransactionDate: string | null;
    recordTime?: string;
}

interface HeadLedger {
    head: BudgetHead;
    transactions: LedgerTransaction[];
}

const formatAmount = (value: number | null | undefined) =>
    value === null || value === undefined ? "" : value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SUMMARY_TONES: Record<string, { card: string; label: string; value: string }> = {
    emerald: {
        card: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20",
        label: "text-emerald-700 dark:text-emerald-300",
        value: "text-emerald-800 dark:text-emerald-200",
    },
    amber: {
        card: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20",
        label: "text-amber-700 dark:text-amber-300",
        value: "text-amber-800 dark:text-amber-200",
    },
    rose: {
        card: "border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900/20",
        label: "text-rose-700 dark:text-rose-300",
        value: "text-rose-800 dark:text-rose-200",
    },
    blue: {
        card: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20",
        label: "text-blue-700 dark:text-blue-300",
        value: "text-blue-800 dark:text-blue-200",
    },
};

const typeBadge = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("fund") || t.includes("receiv")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
    if (t.includes("payment")) return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
    if (t.includes("commit")) return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    return "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
};

const statusBadge = (status: string) => {
    const t = (status || "").toLowerCase();
    if (t.includes("reject") || t.includes("cancel") || t.includes("de-commit") || t.includes("decommit"))
        return "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300";
    if (t.includes("pending") || t.includes("process"))
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";
};

// Excel twins of typeBadge / statusBadge above (same hue per category).
const TONE_GREEN = { bg: "FFD1FAE5", fg: "FF047857" };
const TONE_RED = { bg: "FFFFE4E6", fg: "FFBE123C" };
const TONE_AMBER = { bg: "FFFEF3C7", fg: "FFB45309" };
const TONE_GREY = { bg: "FFF4F4F5", fg: "FF3F3F46" };

const typeTone_ = (type: string) => {
    const t = (type || "").toLowerCase();
    if (t.includes("fund") || t.includes("receiv")) return TONE_GREEN;
    if (t.includes("payment")) return TONE_RED;
    if (t.includes("commit")) return TONE_AMBER;
    return TONE_GREY;
};

const statusTone_ = (status: string) => {
    const t = (status || "").toLowerCase();
    if (t.includes("reject") || t.includes("cancel") || t.includes("de-commit") || t.includes("decommit")) return TONE_RED;
    if (t.includes("pending") || t.includes("process")) return TONE_AMBER;
    return TONE_GREEN;
};

// Excel sheet names: max 31 chars, none of  [ ] : * ? / \  , and must be unique.
const toSheetName = (name: string, used: Set<string>) => {
    const base = (name.replace(/[[\]:*?/\\]/g, " ").trim() || "Sheet").slice(0, 31);
    let candidate = base;
    let n = 2;
    while (used.has(candidate.toLowerCase())) {
        const suffix = ` (${n++})`;
        candidate = base.slice(0, 31 - suffix.length) + suffix;
    }
    used.add(candidate.toLowerCase());
    return candidate;
};

const withRunningBalance = (raw: LedgerTransaction[]): LedgerTransaction[] => {
    const sorted = [...raw].sort(
        (a, b) =>
            new Date(a.recordTime || a.transactionDate).getTime() -
            new Date(b.recordTime || b.transactionDate).getTime(),
    );
    let running = 0;
    return sorted.map((t) => {
        running += (t.fundReceivedAmount || 0) - (t.paymentAmount || 0);
        return { ...t, paymentBalance: running };
    });
};

export function ProjectLedgerExport() {
    const [input, setInput] = useState("");
    const [debouncedInput] = useDebounce(input, 300);
    const [showSuggestions, setShowSuggestions] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);
    const [loadedProjectNo, setLoadedProjectNo] = useState("");
    const [ledgers, setLedgers] = useState<HeadLedger[]>([]);
    const [activeHeadId, setActiveHeadId] = useState<number | null>(null);

    const query = debouncedInput.trim();
    const { data: suggestionData, isLoading: suggestionsLoading } = useFrappeGetCall<{ message: ProjectOption[] }>(
        "frappe.client.get_list",
        {
            doctype: "Project Registration",
            fields: '["name","project_no","project_title"]',
            filters: JSON.stringify([
                ["Project Registration", "project_no", "like", `%${query}%`],
            ]),
            order_by: "creation desc",
            limit_page_length: 10,
        },
        query.length > 0 ? undefined : null,
    );

    const suggestions = useMemo(
        () => (Array.isArray(suggestionData?.message) ? suggestionData.message.filter((p) => p.project_no) : []),
        [suggestionData],
    );

    // Anything typed after a ledger is loaded makes that ledger stale.
    useEffect(() => {
        if (loadedProjectNo && input.trim() !== loadedProjectNo) {
            setLedgers([]);
            setLoadedProjectNo("");
            setActiveHeadId(null);
        }
    }, [input, loadedProjectNo]);

    const fetchLedger = async (projectNoRaw: string) => {
        const projectNo = projectNoRaw.trim();
        if (!projectNo) return;

        setShowSuggestions(false);
        setLoading(true);
        setError(null);
        setLedgers([]);
        setLoadedProjectNo("");
        setActiveHeadId(null);

        try {
            if (isOverheadProjectNo(projectNo)) {
                const rows = await fetchOverheadLedger(projectNo);
                // Accounts' own balances — a running total here would ignore loans.
                const transactions = (rows as unknown as LedgerTransaction[]).map((t) => ({
                    ...t,
                    paymentBalance: t.balance ?? 0,
                }));
                if (transactions.length === 0) throw new Error(`No ledger transactions found for ${projectNo}`);
                setLedgers([{ head: { name: "Overhead Fund", id: OVERHEAD_BUDGET_HEAD_ID }, transactions }]);
                setActiveHeadId(OVERHEAD_BUDGET_HEAD_ID);
                setLoadedProjectNo(projectNo);
                return;
            }

            const headsResponse = await fetch(
                '/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0',
            );
            const headsResult = await headsResponse.json();
            const heads: BudgetHead[] = (headsResult?.data || []).map((h: { budget_head: string; id: number }) => ({
                name: h.budget_head,
                id: h.id,
            }));
            if (heads.length === 0) throw new Error("Could not load budget heads");

            const results = await Promise.all(
                heads.map(async (head): Promise<HeadLedger | null> => {
                    try {
                        const response = await fetch(
                            `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectNo)}&accountHeadId=${head.id}`,
                        );
                        if (!response.ok) return null;
                        const data = await response.json();
                        if (!Array.isArray(data) || data.length === 0) return null;
                        return { head, transactions: withRunningBalance(data) };
                    } catch {
                        return null;
                    }
                }),
            );

            const withData = results.filter((r): r is HeadLedger => r !== null);
            if (withData.length === 0) throw new Error(`No ledger transactions found for project ${projectNo}`);

            setLedgers(withData);
            setActiveHeadId(withData[0].head.id);
            setLoadedProjectNo(projectNo);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to fetch ledger");
        } finally {
            setLoading(false);
        }
    };

    const downloadExcel = async () => {
        if (ledgers.length === 0) return;
        setDownloading(true);
        try {
            const ExcelJS = (await import("exceljs")).default;
            const workbook = new ExcelJS.Workbook();
            const usedNames = new Set<string>();

            const columns = [
                { header: "Date", width: 14 },
                { header: "Type", width: 16 },
                { header: "Txn ID", width: 12 },
                { header: "Particulars", width: 40 },
                { header: "Ref Details", width: 28 },
                { header: "Fund Received", width: 16, amount: true, color: "FF047857", bold: false },
                { header: "Commit", width: 16, amount: true, color: "FFB45309", bold: false },
                { header: "Payment", width: 16, amount: true, color: "FFBE123C", bold: false },
                { header: "Commitable Balance", width: 20, amount: true, color: "FF1E3A8A", bold: true },
                { header: "Payment Balance", width: 18, amount: true, color: "FF1E3A8A", bold: true },
                { header: "Status", width: 16 },
                { header: "BMR", width: 16 },
                { header: "Bank Txn No", width: 20 },
                { header: "Bank Txn Date", width: 14 },
            ];
            const thinBorder = { style: "thin" as const, color: { argb: "FFA1A1AA" } };
            const allBorders = { top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder };

            ledgers.forEach(({ head, transactions }) => {
                const sheet = workbook.addWorksheet(toSheetName(head.name, usedNames));
                columns.forEach((c, i) => {
                    sheet.getColumn(i + 1).width = c.width;
                });

                // Header row, written explicitly as row 1 and styled cell by cell.
                const headerRow = sheet.addRow(columns.map((c) => c.header));
                headerRow.height = 24;
                headerRow.eachCell((cell, col) => {
                    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
                    // Same horizontal alignment as the column's data, so headers sit over their values.
                    cell.alignment = {
                        vertical: "middle",
                        horizontal: columns[col - 1]?.amount ? "right" : "left",
                        wrapText: true,
                    };
                    cell.border = allBorders;
                });

                transactions.forEach((t, rowIndex) => {
                    const row = sheet.addRow([
                        t.transactionDate ? t.transactionDate.slice(0, 10) : "",
                        t.transactionType,
                        t.transactionId,
                        t.particulars,
                        t.refDetails,
                        t.fundReceivedAmount ?? null,
                        t.commitAmount ?? null,
                        t.paymentAmount ?? null,
                        t.commitableBalance ?? null,
                        t.paymentBalance ?? null,
                        t.status,
                        t.bmr ?? "",
                        t.bankTransactionNumber ?? "",
                        t.bankTransactionDate ? t.bankTransactionDate.slice(0, 10) : "",
                    ]);
                    const zebra = rowIndex % 2 === 1;
                    row.eachCell({ includeEmpty: true }, (cell, col) => {
                        const column = columns[col - 1];
                        cell.border = allBorders;
                        cell.alignment = {
                            vertical: "top",
                            horizontal: column?.amount ? "right" : "left",
                        };
                        if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFAF9" } };
                        if (column?.amount) {
                            cell.numFmt = "#,##0.00";
                            cell.font = { bold: column.bold, color: { argb: column.color } };
                        }
                    });

                    // Type / Status pills become tinted cells, matching the on-screen badges.
                    const typeTone = typeTone_(t.transactionType);
                    const typeCell = row.getCell(2);
                    typeCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: typeTone.bg } };
                    typeCell.font = { bold: true, color: { argb: typeTone.fg } };
                    if (t.status) {
                        const statusTone = statusTone_(t.status);
                        const statusCell = row.getCell(11);
                        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: statusTone.bg } };
                        statusCell.font = { bold: true, color: { argb: statusTone.fg } };
                    }
                });

                const sum = (pick: (t: LedgerTransaction) => number | null) =>
                    transactions.reduce((acc, t) => acc + (pick(t) || 0), 0);
                const totals = sheet.addRow([
                    "", "", "", "Total", "",
                    sum((t) => t.fundReceivedAmount),
                    sum((t) => t.commitAmount),
                    sum((t) => t.paymentAmount),
                ]);
                totals.eachCell({ includeEmpty: true }, (cell, col) => {
                    if (col > columns.length) return;
                    cell.font = { bold: true, color: { argb: "FF1E3A8A" } };
                    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E7FF" } };
                    cell.border = allBorders;
                    if (columns[col - 1]?.amount) {
                        cell.numFmt = "#,##0.00";
                        cell.alignment = { horizontal: "right" };
                    }
                });

                sheet.views = [{ state: "frozen", ySplit: 1 }];
            });

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `Ledger_${loadedProjectNo.replace(/[^\w.-]+/g, "_")}.xlsx`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create Excel file");
        } finally {
            setDownloading(false);
        }
    };

    const activeLedger = ledgers.find((l) => l.head.id === activeHeadId);

    const totals = useMemo(() => {
        const txns = activeLedger?.transactions ?? [];
        return {
            received: txns.reduce((acc, t) => acc + (t.fundReceivedAmount || 0), 0),
            commit: txns.reduce((acc, t) => acc + (t.commitAmount || 0), 0),
            payment: txns.reduce((acc, t) => acc + (t.paymentAmount || 0), 0),
            balance: txns.length ? txns[txns.length - 1].paymentBalance : 0,
        };
    }, [activeLedger]);

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">
            <div className="px-4 md:px-6 xl:px-8 pt-6 pb-12">
                <div className="mb-6 flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#D97757] rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0">
                        <FileSpreadsheet size={17} />
                    </div>
                    <div>
                        <h1 className="text-[18px] font-extrabold tracking-[-0.02em] text-[#27272A] dark:text-[#F4F4F5] leading-none">
                            Ledger Export
                        </h1>
                        <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                            Fetch a project's ledger and download all budget heads in one Excel file
                        </p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm p-4 mb-5">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <div className="flex items-center gap-3 bg-[#FAFAF9] dark:bg-[#1C1C1F] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl px-4 py-2.5 focus-within:border-[#D97757] transition-colors">
                                <Search className="h-4 w-4 text-[#71717A] flex-shrink-0" />
                                <input
                                    value={input}
                                    onChange={(e) => {
                                        setInput(e.target.value);
                                        setShowSuggestions(true);
                                    }}
                                    onFocus={() => setShowSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") fetchLedger(input);
                                    }}
                                    placeholder="Type project number…"
                                    className="flex-1 bg-transparent outline-none text-[13px] font-medium text-[#27272A] dark:text-[#F4F4F5] placeholder:text-[#A1A1AA]"
                                />
                                {suggestionsLoading && <Loader2 className="h-4 w-4 animate-spin text-[#A1A1AA]" />}
                            </div>

                            {showSuggestions && query.length > 0 && suggestions.length > 0 && (
                                <ul className="absolute z-20 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-lg">
                                    {suggestions.map((p) => (
                                        <li key={p.name}>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setInput(p.project_no!);
                                                    fetchLedger(p.project_no!);
                                                }}
                                                className="w-full text-left px-4 py-2 hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46] transition-colors"
                                            >
                                                <span className="block text-[13px] font-bold text-[#27272A] dark:text-[#F4F4F5]">
                                                    {p.project_no}
                                                </span>
                                                {p.project_title && (
                                                    <span className="block text-[11px] text-[#71717A] dark:text-[#A1A1AA] truncate">
                                                        {p.project_title}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        <button
                            onClick={() => fetchLedger(input)}
                            disabled={!input.trim() || loading}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D97757] text-white text-[13px] font-bold hover:bg-[#C4694A] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                            Fetch Ledger
                        </button>

                        <button
                            onClick={downloadExcel}
                            disabled={ledgers.length === 0 || downloading}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            Download Excel
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 mb-5 px-4 py-3 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300 text-[13px] font-medium">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {error}
                    </div>
                )}

                <GlobalLoader isLoading={loading} delay={0} />

                {!loading && ledgers.length > 0 && activeLedger && (
                    <>
                        <div className="mb-4 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#52525B] dark:text-[#A1A1AA]">
                            <span className="inline-flex items-center rounded-full bg-[#1E3A8A] px-3 py-1 text-[12px] font-extrabold text-white shadow-sm">
                                {loadedProjectNo}
                            </span>
                            <span>
                                {ledgers.length} budget head{ledgers.length === 1 ? "" : "s"} with transactions · each becomes a sheet in the Excel file
                            </span>
                        </div>

                        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {[
                                { label: "Fund Received", value: totals.received, tone: "emerald" },
                                { label: "Committed", value: totals.commit, tone: "amber" },
                                { label: "Paid", value: totals.payment, tone: "rose" },
                                { label: "Balance", value: totals.balance, tone: "blue" },
                            ].map((card) => (
                                <div
                                    key={card.label}
                                    className={cn("rounded-2xl border p-4 shadow-sm", SUMMARY_TONES[card.tone].card)}
                                >
                                    <p className={cn("text-[10px] font-extrabold uppercase tracking-[0.12em]", SUMMARY_TONES[card.tone].label)}>
                                        {card.label}
                                    </p>
                                    <p className={cn("mt-1 text-[20px] font-extrabold tabular-nums leading-tight", SUMMARY_TONES[card.tone].value)}>
                                        ₹ {formatAmount(card.value) || "0.00"}
                                    </p>
                                    <p className="mt-0.5 text-[10px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                        {activeLedger.head.name}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                            <div className="flex flex-wrap gap-1.5 border-b border-[#E4E4E7] bg-[#FAFAF9] px-4 py-3 dark:border-[#3F3F46] dark:bg-[#1C1C1F]">
                                {ledgers.map(({ head, transactions }) => (
                                    <button
                                        key={head.id}
                                        onClick={() => setActiveHeadId(head.id)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold transition-all",
                                            head.id === activeHeadId
                                                ? "bg-[#1E3A8A] text-white shadow-sm"
                                                : "border border-[#E4E4E7] bg-white text-[#52525B] hover:border-[#1E3A8A]/40 hover:text-[#1E3A8A] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#A1A1AA] dark:hover:text-[#93C5FD]",
                                        )}
                                    >
                                        {head.name}
                                        <span
                                            className={cn(
                                                "rounded-full px-1.5 py-0.5 text-[10px] font-extrabold leading-none",
                                                head.id === activeHeadId
                                                    ? "bg-white/25 text-white"
                                                    : "bg-[#F4F4F5] text-[#52525B] dark:bg-[#3F3F46] dark:text-[#E4E4E7]",
                                            )}
                                        >
                                            {transactions.length}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="max-h-[60vh] overflow-auto">
                                <table className="w-full text-[12px]">
                                    <thead className="sticky top-0 z-10">
                                        <tr className="bg-[#1E3A8A] text-white">
                                            {[
                                                { h: "Date" },
                                                { h: "Type" },
                                                { h: "Particulars" },
                                                { h: "Ref Details" },
                                                { h: "Fund Received", right: true },
                                                { h: "Commit", right: true },
                                                { h: "Payment", right: true },
                                                { h: "Balance", right: true },
                                                { h: "Status" },
                                            ].map(({ h, right }) => (
                                                <th
                                                    key={h}
                                                    className={cn(
                                                        "whitespace-nowrap border-r border-white/25 px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider last:border-r-0",
                                                        right ? "text-right" : "text-left",
                                                    )}
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeLedger.transactions.map((t, i) => (
                                            <tr
                                                key={`${t.transactionId}-${i}`}
                                                className={cn(
                                                    "border-t border-[#E4E4E7] text-[#27272A] transition-colors hover:bg-[#EEF2FF] dark:border-[#3F3F46] dark:text-[#E4E4E7] dark:hover:bg-[#4A6CF7]/10",
                                                    i % 2 === 1 && "bg-[#FAFAF9] dark:bg-[#1C1C1F]/60",
                                                )}
                                            >
                                                <td className="border-r border-[#E4E4E7] dark:border-[#3F3F46] last:border-r-0 whitespace-nowrap px-3 py-2 font-medium">{t.transactionDate?.slice(0, 10)}</td>
                                                <td className="border-r border-[#E4E4E7] dark:border-[#3F3F46] last:border-r-0 whitespace-nowrap px-3 py-2">
                                                    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold", typeBadge(t.transactionType))}>
                                                        {t.transactionType}
                                                    </span>
                                                </td>
                                                <td className="border-r border-[#E4E4E7] dark:border-[#3F3F46] last:border-r-0 px-3 py-2">{t.particulars}</td>
                                                <td className="border-r border-[#E4E4E7] dark:border-[#3F3F46] last:border-r-0 px-3 py-2 text-[#52525B] dark:text-[#A1A1AA]">{t.refDetails}</td>
                                                <td className="border-r border-[#E4E4E7] dark:border-[#3F3F46] last:border-r-0 px-3 py-2 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                                                    {formatAmount(t.fundReceivedAmount)}
                                                </td>
                                                <td className="border-r border-[#E4E4E7] dark:border-[#3F3F46] last:border-r-0 px-3 py-2 text-right font-semibold tabular-nums text-amber-700 dark:text-amber-400">
                                                    {formatAmount(t.commitAmount)}
                                                </td>
                                                <td className="border-r border-[#E4E4E7] dark:border-[#3F3F46] last:border-r-0 px-3 py-2 text-right font-semibold tabular-nums text-rose-700 dark:text-rose-400">
                                                    {formatAmount(t.paymentAmount)}
                                                </td>
                                                <td className="border-r border-[#E4E4E7] dark:border-[#3F3F46] last:border-r-0 px-3 py-2 text-right font-extrabold tabular-nums text-[#1E3A8A] dark:text-[#93C5FD]">
                                                    {formatAmount(t.paymentBalance)}
                                                </td>
                                                <td className="border-r border-[#E4E4E7] dark:border-[#3F3F46] last:border-r-0 whitespace-nowrap px-3 py-2">
                                                    {t.status && (
                                                        <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold", statusBadge(t.status))}>
                                                            {t.status}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="sticky bottom-0">
                                        <tr className="bg-[#E0E7FF] font-extrabold text-[#1E3A8A] dark:bg-[#1E3A8A]/40 dark:text-[#DBEAFE]">
                                            <td colSpan={4} className="border-r border-[#A5B4FC] dark:border-[#4A6CF7]/40 px-3 py-2.5 text-right uppercase tracking-wider text-[11px]">Total</td>
                                            <td className="border-r border-[#A5B4FC] dark:border-[#4A6CF7]/40 px-3 py-2.5 text-right tabular-nums">{formatAmount(totals.received)}</td>
                                            <td className="border-r border-[#A5B4FC] dark:border-[#4A6CF7]/40 px-3 py-2.5 text-right tabular-nums">{formatAmount(totals.commit)}</td>
                                            <td className="border-r border-[#A5B4FC] dark:border-[#4A6CF7]/40 px-3 py-2.5 text-right tabular-nums">{formatAmount(totals.payment)}</td>
                                            <td className="border-r border-[#A5B4FC] dark:border-[#4A6CF7]/40 px-3 py-2.5 text-right tabular-nums">{formatAmount(totals.balance)}</td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default ProjectLedgerExport;
