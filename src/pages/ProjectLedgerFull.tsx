import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import {
    ArrowLeftIcon,
    SearchIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Interface for Ledger Transaction
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
    bankTransactionNumber: string | null;
    bankTransactionDate: string | null;
    recordTime?: string;
    moduleCode?: string;
    frapAppId?: string;
}

const ProjectLedgerFull = () => {
    const { projectName } = useParams<{ projectName: string }>();
    const navigate = useNavigate();

    const [activeLedgerHeadId, setActiveLedgerHeadId] = useState<string | number>("");
    const [ledgerTransactions, setLedgerTransactions] = useState<LedgerTransaction[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [selectedYear, setSelectedYear] = useState<string>("all");
    const [ledgerView, setLedgerView] = useState<'transactions' | 'yearly'>('transactions');
    const [expandedYear, setExpandedYear] = useState<string | null>(null);

    // Fetch Project Details for context (Title, etc.)
    const { data: projectData } = useFrappeGetCall<{ message: any[] }>(
        "frappe.client.get_list",
        {
            doctype: "Project Registration",
            filters: [["project_no", "=", projectName]],
            fields: '["name", "project_title"]',
            limit_page_length: 1
        }
    );

    const projectTitle = projectData?.message?.[0]?.project_title || projectName;

    // Fetch Budget Heads
    const [budgetHeadList, setBudgetHeadList] = useState<{ name: string; id: number }[]>([]);
    const [isHeadsLoading, setIsHeadsLoading] = useState(true);
    const [headsError, setHeadsError] = useState<string | null>(null);

    // Track which heads have data
    const [headsWithData, setHeadsWithData] = useState<Set<number>>(new Set());
    const [isCheckingHeads, setIsCheckingHeads] = useState(false);

    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch('/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0');
                const result = await response.json();
                if (result?.data) {
                    setBudgetHeadList(result.data.map((item: any) => ({
                        name: item.budget_head,
                        id: item.id
                    })));
                }
            } catch (err) {
                console.error("Failed to fetch Budget Heads:", err);
                setHeadsError("Failed to load budget heads");
            } finally {
                setIsHeadsLoading(false);
            }
        };
        fetchBudgetHeads();
    }, []);

    // Check for data in heads
    useEffect(() => {
        const checkHeadsWithData = async () => {
            if (!projectName || budgetHeadList.length === 0) return;

            setIsCheckingHeads(true);
            const headsSet = new Set<number>();

            try {
                const promises = budgetHeadList.map(async (head) => {
                    try {
                        const response = await fetch(`/ledger-api/commit-payment-transactions?projectNumber=${projectName}&accountHeadId=${head.id}`);
                        if (response.ok) {
                            const data = await response.json();
                            if (Array.isArray(data) && data.length > 0) {
                                headsSet.add(head.id);
                            }
                        }
                    } catch (err) {
                        console.error(`Failed to check data for head ${head.name}:`, err);
                    }
                });

                await Promise.all(promises);
                setHeadsWithData(headsSet);
            } catch (err) {
                console.error("Failed to check heads with data:", err);
            } finally {
                setIsCheckingHeads(false);
            }
        };

        checkHeadsWithData();
    }, [projectName, budgetHeadList]);

    const ledgerHeads = useMemo(() => {
        return budgetHeadList.filter(head => headsWithData.has(head.id));
    }, [budgetHeadList, headsWithData]);

    // Set default active head
    useEffect(() => {
        if (!isCheckingHeads && ledgerHeads.length > 0) {
            // Only set if not already set or if current selection is invalid (though filtering handles validity visually)
            // Check if activeLedgerHeadId is still valid
            const isValid = ledgerHeads.some(h => h.id === activeLedgerHeadId);
            if (!activeLedgerHeadId || !isValid) {
                setActiveLedgerHeadId(ledgerHeads[0].id);
            }
        }
    }, [ledgerHeads, isCheckingHeads, activeLedgerHeadId]);

    // Fetch Ledger Data
    useEffect(() => {
        console.log("ProjectLedgerFull: useEffect triggered", { projectName, activeLedgerHeadId });
        if (projectName && activeLedgerHeadId) {
            fetchLedgerData(activeLedgerHeadId);
        }
    }, [projectName, activeLedgerHeadId]);

    const fetchLedgerData = async (headId: string | number) => {
        setIsLoading(true);
        try {
            const url = `/ledger-api/commit-payment-transactions?projectNumber=${projectName}&accountHeadId=${headId}`;
            console.log("ProjectLedgerFull: Fetching URL:", url);
            const response = await fetch(url);
            console.log("ProjectLedgerFull: Response status:", response.status);

            if (!response.ok) throw new Error("Failed to fetch ledger data");

            const result = await response.json();
            console.log("ProjectLedgerFull: API Result:", result);

            const rawData = Array.isArray(result) ? result : [];
            let runningPaymentBalance = 0;

            // Sort by recordTime (with fallback to transactionDate) ascending
            const sortedData = [...rawData].sort((a: any, b: any) => {
                const timeA = new Date(a.recordTime || a.transactionDate).getTime();
                const timeB = new Date(b.recordTime || b.transactionDate).getTime();
                return timeA - timeB;
            });

            const calculatedData = sortedData.map((txn: any) => {
                const received = txn.fundReceivedAmount || 0;
                const paid = txn.paymentAmount || 0;
                runningPaymentBalance = runningPaymentBalance + received - paid;
                return {
                    ...txn,
                    paymentBalance: runningPaymentBalance,
                };
            });

            console.log("ProjectLedgerFull: Calculated Data:", calculatedData);
            // Store in ascending order; display sort is handled separately
            setLedgerTransactions(calculatedData);
        } catch (error) {
            console.error("Error fetching ledger:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Get financial year string from a date (Apr-Mar). e.g. "2025-06-15" → "2025-26"
    const getFinancialYear = (dateStr: string): string => {
        const d = new Date(dateStr);
        const month = d.getMonth(); // 0-indexed: 0=Jan, 3=Apr
        const year = d.getFullYear();
        const startYear = month >= 3 ? year : year - 1; // Apr(3)–Dec → same year; Jan–Mar → prev year
        return `${startYear}-${String(startYear + 1).slice(-2)}`;
    };

    // Extract unique financial years from transactions
    const availableYears = useMemo(() => {
        const years = new Set<string>();
        ledgerTransactions.forEach((txn) => {
            if (txn.transactionDate) years.add(getFinancialYear(txn.transactionDate));
        });
        return Array.from(years).sort().reverse();
    }, [ledgerTransactions]);

    const yearlyLedgerData = useMemo(() => {
        if (ledgerTransactions.length === 0) return [];
        const fyMap = new Map<string, { totalReceived: number; totalCommitted: number; totalPaid: number; count: number; txns: LedgerTransaction[] }>();
        ledgerTransactions.forEach((txn) => {
            const fy = txn.transactionDate ? getFinancialYear(txn.transactionDate) : "Unknown";
            if (!fyMap.has(fy)) fyMap.set(fy, { totalReceived: 0, totalCommitted: 0, totalPaid: 0, count: 0, txns: [] });
            const entry = fyMap.get(fy)!;
            entry.totalReceived += txn.fundReceivedAmount || 0;
            entry.totalCommitted += txn.commitAmount || 0;
            entry.totalPaid += txn.paymentAmount || 0;
            entry.count += 1;
            entry.txns.push(txn);
        });
        const rows: { fy: string; openingBalance: number; totalReceived: number; totalCommitted: number; totalPaid: number; closingBalance: number; count: number; txns: LedgerTransaction[] }[] = [];
        let runningBalance = 0;
        Array.from(fyMap.entries()).sort(([a], [b]) => a.localeCompare(b)).forEach(([fy, data]) => {
            const opening = runningBalance;
            const closing = opening + data.totalReceived - data.totalPaid;
            runningBalance = closing;
            rows.push({ fy, openingBalance: opening, ...data, closingBalance: closing });
        });
        return rows;
    }, [ledgerTransactions]);

    // Filter and Pagination Logic
    const filteredTransactions = useMemo(() => {
        const filtered = ledgerTransactions.filter((txn) => {
            // Year filter
            if (selectedYear !== "all" && txn.transactionDate) {
                if (getFinancialYear(txn.transactionDate) !== selectedYear) return false;
            }
            // Search filter
            const q = searchQuery.toLowerCase();
            return (
                txn.particulars.toLowerCase().includes(q) ||
                txn.refDetails?.toLowerCase().includes(q) ||
                txn.bmr?.toLowerCase().includes(q)
            );
        });
        return filtered;
    }, [ledgerTransactions, searchQuery, selectedYear]);

    // Apply sort order for display
    const sortedTransactions = useMemo(() => {
        return sortOrder === 'newest' ? [...filteredTransactions].reverse() : filteredTransactions;
    }, [filteredTransactions, sortOrder]);

    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedTransactions, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

    const formatCurrency = (amount: number | null) => {
        if (amount === null || amount === undefined) return "-";
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("en-GB");
    };

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans px-6 md:px-8 pt-7 pb-10 overflow-x-hidden">
            <div className="mx-auto w-full max-w-[1600px] space-y-6 min-w-0">
                {/* Header */}
                <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm">
                    <div className="h-1.5 bg-[linear-gradient(to_right,#4A6CF7,#2563EB,#D97757)]" />
                    <div className="px-5 md:px-6 py-5 flex items-start gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="h-10 w-10 rounded-xl border-[#E4E4E7] dark:border-[#3F3F46] shrink-0"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#71717A] dark:text-[#A1A1AA] mb-1">
                            Project Account
                        </div>
                        <h1 className="text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                            Project Ledger
                        </h1>
                        <p className="text-[13px] text-[#71717A] dark:text-[#A1A1AA] font-medium mt-1 break-words">
                            {projectName} • {projectTitle}
                        </p>
                    </div>
                    </div>
                </div>

                <Card className="border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm rounded-2xl overflow-hidden bg-white dark:bg-[#27272A] min-w-0">
                    <CardHeader className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-[18px]">
                        <div className="flex flex-col gap-4 min-w-0">
                            {/* Budget Head Selector */}
                            <div className="flex flex-col gap-2 min-w-0">
                                <span className="text-[11px] font-bold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">
                                    {isHeadsLoading || isCheckingHeads ? "Loading Heads..." : "Budget Head:"}
                                </span>
                                <div className="flex flex-wrap gap-2 min-w-0">
                                    {isHeadsLoading || isCheckingHeads ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-9 w-24 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl"></div>
                                            <div className="h-9 w-24 bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl"></div>
                                        </div>
                                    ) : headsError ? (
                                        <div className="text-red-500 text-sm">Error loading heads</div>
                                    ) : ledgerHeads.length > 0 ? (
                                        ledgerHeads.map((head) => (
                                            <button
                                                key={head.id}
                                                onClick={() => setActiveLedgerHeadId(head.id)}
                                                className={cn(
                                                    "px-3 py-2 rounded-xl text-[12px] font-bold transition-all",
                                                    activeLedgerHeadId === head.id
                                                        ? "bg-blue-50 dark:bg-blue-950/20 text-[#2563EB] dark:text-blue-400"
                                                        : "bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]",
                                                )}
                                            >
                                                {head.name}
                                            </button>
                                        ))
                                    ) : (
                                        <div className="text-zinc-400 text-sm italic">No budget heads with data found</div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 w-full flex-wrap min-w-0">
                                {/* View Toggle */}
                                <div className="flex items-center gap-1 rounded-xl bg-[#FAFAF9] dark:bg-[#18181B] p-1">
                                    <button
                                        onClick={() => setLedgerView('transactions')}
                                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                            ledgerView === 'transactions' ? "bg-[#D97757] text-white" : "text-[#71717A] dark:text-[#A1A1AA] hover:bg-white dark:hover:bg-[#27272A]"
                                        )}
                                    >Transactions</button>
                                    <button
                                        onClick={() => setLedgerView('yearly')}
                                        className={cn("px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                            ledgerView === 'yearly' ? "bg-[#D97757] text-white" : "text-[#71717A] dark:text-[#A1A1AA] hover:bg-white dark:hover:bg-[#27272A]"
                                        )}
                                    >Yearly Summary</button>
                                </div>
                                {ledgerView === 'transactions' && (
                                    <>
                                        <div className="relative flex-1 min-w-[220px]">
                                            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                                            <Input
                                                placeholder="Search transactions..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9 h-10 bg-[#FAFAF9] dark:bg-[#18181B] border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl"
                                            />
                                        </div>
                                        <Select
                                            value={selectedYear}
                                            onValueChange={(val) => { setSelectedYear(val); setCurrentPage(1); }}
                                        >
                                            <SelectTrigger className="w-[130px] h-10 rounded-xl border-[#E4E4E7] dark:border-[#3F3F46]">
                                                <SelectValue placeholder="Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Years</SelectItem>
                                                {availableYears.map((yr) => (
                                                    <SelectItem key={yr} value={yr}>FY {yr}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Select
                                            value={itemsPerPage.toString()}
                                            onValueChange={(val) => setItemsPerPage(Number(val))}
                                        >
                                            <SelectTrigger className="w-[110px] h-10 rounded-xl border-[#E4E4E7] dark:border-[#3F3F46]">
                                                <SelectValue placeholder="Rows" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="10">10 rows</SelectItem>
                                                <SelectItem value="20">20 rows</SelectItem>
                                                <SelectItem value="50">50 rows</SelectItem>
                                                <SelectItem value="100">100 rows</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setSortOrder(prev => prev === 'newest' ? 'oldest' : 'newest')}
                                            className="h-10 rounded-xl flex items-center gap-1.5 whitespace-nowrap border-[#E4E4E7] dark:border-[#3F3F46] text-[12px] font-bold"
                                        >
                                            <ArrowUpDown className="h-3.5 w-3.5" />
                                            {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    {ledgerView === 'transactions' && (
                        <>
                            <CardContent className="p-1 min-w-0">
                                {isLoading ? (
                                    <div className="h-40 flex items-center justify-center text-[#71717A] dark:text-[#A1A1AA] font-medium">
                                        Loading ledger data...
                                    </div>
                                ) : paginatedTransactions.length === 0 ? (
                                    <div className="h-40 flex items-center justify-center text-[#71717A] dark:text-[#A1A1AA] font-medium">
                                        No transactions found.
                                    </div>
                                ) : (
                                    <div className="min-w-0">
                                        <div className="hidden xl:grid grid-cols-[repeat(11,minmax(0,1fr))] rounded-t-lg bg-[#EEF2FF] dark:bg-blue-950/20 border border-[#C7D2FE] dark:border-blue-900/40 text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200 overflow-hidden">
                                            <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40">Date / TID</div>
                                            <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40">Particulars</div>
                                            <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40">Module</div>
                                            <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40">App ID</div>
                                            <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40">BMR</div>
                                            <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40 text-right">Received</div>
                                            <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40 text-right">Committed</div>
                                            <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40 text-right">Commit Bal</div>
                                            <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40 text-right">Paid</div>
                                            <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40 text-right">Actual Bal</div>
                                            <div className="px-1.5 py-1.5 text-center">Status</div>
                                        </div>
                                        {paginatedTransactions.map((txn, index) => (
                                            <div
                                                key={`${txn.transactionId}-${index}`}
                                                className="grid grid-cols-2 xl:grid-cols-[repeat(11,minmax(0,1fr))] items-center border-x border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] min-w-0"
                                            >
                                                <div className="min-w-0 px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46]">
                                                    <div className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{formatDate(txn.transactionDate)}</div>
                                                    <div className="text-[10px] font-semibold text-[#A1A1AA] break-words leading-tight">TID {txn.transactionId || "-"}</div>
                                                </div>
                                                <div className="col-span-2 xl:col-span-1 min-w-0 px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46]">
                                                    <div className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-tight">{txn.particulars || "-"}</div>
                                                    {txn.refDetails && <div className="text-[10px] font-medium text-[#71717A] dark:text-[#A1A1AA] break-words leading-tight">Ref: {txn.refDetails}</div>}
                                                </div>
                                                <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] break-words">{txn.moduleCode || txn.transactionType || "-"}</div>
                                                <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] break-words">{txn.frapAppId || "-"}</div>
                                                <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] break-words">{txn.bmr || "-"}</div>
                                                <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] xl:text-right font-extrabold text-emerald-700 break-words">{txn.fundReceivedAmount ? formatCurrency(txn.fundReceivedAmount) : "-"}</div>
                                                <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] xl:text-right font-extrabold text-orange-700 break-words">{txn.commitAmount ? formatCurrency(txn.commitAmount) : "-"}</div>
                                                <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] xl:text-right font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] break-words">{formatCurrency(txn.commitableBalance)}</div>
                                                <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] xl:text-right font-extrabold text-red-700 break-words">{txn.paymentAmount ? formatCurrency(txn.paymentAmount) : "-"}</div>
                                                <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] xl:text-right font-extrabold text-[#2563EB] dark:text-blue-400 break-words">{formatCurrency(txn.paymentBalance)}</div>
                                                <div className="px-1.5 py-1.5 xl:text-center">
                                                    <span className={cn(
                                                        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold",
                                                        txn.status === "Settled" || txn.status === "PAID"
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : txn.status === "Pending" || txn.status === "PENDING"
                                                              ? "bg-amber-50 text-amber-700"
                                                              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
                                                    )}>
                                                        {txn.status || "Completed"}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>

                            {/* Pagination Footer */}
                            <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedTransactions.length)} of {sortedTransactions.length} entries
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="rounded-xl"
                                    >
                                        <ChevronLeftIcon className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="rounded-xl"
                                    >
                                        Next
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {ledgerView === 'yearly' && (
                        <CardContent className="p-[18px] space-y-3 min-w-0">
                            {yearlyLedgerData.map((row) => {
                                const isExp = expandedYear === row.fy;
                                return (
                                    <div key={row.fy} className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] overflow-hidden">
                                        <button
                                            className="w-full p-4 text-left"
                                            onClick={() => setExpandedYear(isExp ? null : row.fy)}
                                        >
                                            <div className="flex items-center justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-2 text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                    <span className={`text-xs transition-transform duration-200 ${isExp ? "rotate-90" : ""}`}>▶</span>
                                                    FY {row.fy}
                                                </div>
                                                <span className="px-2 py-1 rounded-full bg-white dark:bg-[#27272A] text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA]">
                                                    {row.count} txns
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                                                {[
                                                    ["Opening", row.openingBalance ? `₹${row.openingBalance.toLocaleString("en-IN")}` : "₹0", "text-[#71717A]"],
                                                    ["Received", row.totalReceived > 0 ? `₹${row.totalReceived.toLocaleString("en-IN")}` : "-", "text-emerald-700"],
                                                    ["Committed", row.totalCommitted > 0 ? `₹${row.totalCommitted.toLocaleString("en-IN")}` : "-", "text-orange-700"],
                                                    ["Paid", row.totalPaid > 0 ? `₹${row.totalPaid.toLocaleString("en-IN")}` : "-", "text-red-700"],
                                                    ["Closing", `₹${row.closingBalance.toLocaleString("en-IN")}`, "text-[#2563EB] dark:text-blue-400"],
                                                ].map(([label, value, color]) => (
                                                    <div key={label} className="min-w-0">
                                                        <div className="text-[10px] font-bold uppercase tracking-widest text-[#A1A1AA] mb-1">{label}</div>
                                                        <div className={cn("text-[13px] font-extrabold break-words", color)}>{value}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </button>

                                        {isExp && (
                                            <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] p-4 space-y-2">
                                                {row.txns.map((txn, i) => (
                                                    <div key={i} className="rounded-xl bg-white dark:bg-[#27272A] p-3">
                                                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <div className="text-[11px] font-bold text-[#A1A1AA] mb-1">
                                                                    {txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString("en-GB") : "-"} · BMR {txn.bmr || "-"}
                                                                </div>
                                                                <div className="text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] break-words">{txn.particulars}</div>
                                                                {txn.refDetails && <div className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] break-words">{txn.refDetails}</div>}
                                                            </div>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-right min-w-0">
                                                                <span className="text-[11px] font-bold text-emerald-700">{txn.fundReceivedAmount ? `₹${txn.fundReceivedAmount.toLocaleString("en-IN")}` : "-"}</span>
                                                                <span className="text-[11px] font-bold text-orange-700">{txn.commitAmount ? `₹${txn.commitAmount.toLocaleString("en-IN")}` : "-"}</span>
                                                                <span className="text-[11px] font-bold text-red-700">{txn.paymentAmount ? `₹${txn.paymentAmount.toLocaleString("en-IN")}` : "-"}</span>
                                                                <span className="text-[11px] font-bold text-[#2563EB]">{`₹${txn.paymentBalance.toLocaleString("en-IN")}`}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {yearlyLedgerData.length > 0 && (
                                <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-4">
                                    <div className="text-[12px] font-bold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA] mb-3">Total</div>
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                        <div className="text-[13px] font-extrabold text-emerald-700">{`₹${yearlyLedgerData.reduce((s, r) => s + r.totalReceived, 0).toLocaleString("en-IN")}`}</div>
                                        <div className="text-[13px] font-extrabold text-orange-700">{`₹${yearlyLedgerData.reduce((s, r) => s + r.totalCommitted, 0).toLocaleString("en-IN")}`}</div>
                                        <div className="text-[13px] font-extrabold text-red-700">{`₹${yearlyLedgerData.reduce((s, r) => s + r.totalPaid, 0).toLocaleString("en-IN")}`}</div>
                                        <div className="text-[13px] font-extrabold text-[#2563EB]">{`₹${(yearlyLedgerData[yearlyLedgerData.length - 1]?.closingBalance || 0).toLocaleString("en-IN")}`}</div>
                                        <div className="text-[13px] font-extrabold text-[#71717A]">{yearlyLedgerData.reduce((s, r) => s + r.count, 0)} transactions</div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ProjectLedgerFull;
