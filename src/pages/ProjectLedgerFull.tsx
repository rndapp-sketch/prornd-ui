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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
                const response = await fetch('/api/v2/document/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc');
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
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 p-4 lg:p-8">
            <div className="mx-auto w-full space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={() => navigate(-1)}
                        className="h-10 w-10 rounded-full border-zinc-200 dark:border-zinc-800"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                            Project Ledger
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            {projectName} • {projectTitle}
                        </p>
                    </div>
                </div>

                <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 pb-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Budget Head Selector */}
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-500 whitespace-nowrap">
                                    {isHeadsLoading || isCheckingHeads ? "Loading Heads..." : "Budget Head:"}
                                </span>
                                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                                    {isHeadsLoading || isCheckingHeads ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-24 bg-zinc-100 animate-pulse rounded-full"></div>
                                            <div className="h-8 w-24 bg-zinc-100 animate-pulse rounded-full"></div>
                                        </div>
                                    ) : headsError ? (
                                        <div className="text-red-500 text-sm">Error loading heads</div>
                                    ) : ledgerHeads.length > 0 ? (
                                        ledgerHeads.map((head) => (
                                            <button
                                                key={head.id}
                                                onClick={() => setActiveLedgerHeadId(head.id)}
                                                className={`
                        px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
                        ${activeLedgerHeadId === head.id
                                                        ? "bg-[#E0F7F6] text-[#0EA5A4] ring-1 ring-[#0EA5A4] shadow-sm dark:bg-[#0EA5A4]/20"
                                                        : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 dark:hover:bg-zinc-800"
                                                    }
                      `}
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
                            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                                {/* View Toggle */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setLedgerView('transactions')}
                                        className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                            ledgerView === 'transactions' ? "bg-[#D97757] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                                        )}
                                    >Transactions</button>
                                    <button
                                        onClick={() => setLedgerView('yearly')}
                                        className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                                            ledgerView === 'yearly' ? "bg-[#D97757] text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200"
                                        )}
                                    >Yearly Summary</button>
                                </div>
                                {ledgerView === 'transactions' && (
                                    <>
                                        <div className="relative flex-1 md:w-64">
                                            <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
                                            <Input
                                                placeholder="Search transactions..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                                            />
                                        </div>
                                        <Select
                                            value={selectedYear}
                                            onValueChange={(val) => { setSelectedYear(val); setCurrentPage(1); }}
                                        >
                                            <SelectTrigger className="w-[130px]">
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
                                            <SelectTrigger className="w-[100px]">
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
                                            className="flex items-center gap-1.5 whitespace-nowrap"
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
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                                        <TableRow>
                                            <TableHead className="w-[100px]">Data</TableHead>
                                            <TableHead>Particulars</TableHead>
                                            <TableHead>BMR / Ref</TableHead>
                                            <TableHead className="text-right text-emerald-600 font-medium">
                                                Received
                                            </TableHead>
                                            <TableHead className="text-right text-orange-600 font-medium">
                                                Committed
                                            </TableHead>
                                            <TableHead className="text-right text-zinc-600 font-medium">
                                                Commit Bal
                                            </TableHead>
                                            <TableHead className="text-right text-red-600 font-medium">
                                                Paid
                                            </TableHead>
                                            <TableHead className="text-right text-blue-600 font-medium">
                                                Actual Bal
                                            </TableHead>
                                            <TableHead className="w-[100px] text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-32 text-center">
                                                    <div className="flex items-center justify-center text-zinc-500">
                                                        Loading ledger data...
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : paginatedTransactions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-32 text-center text-zinc-500">
                                                    No transactions found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            paginatedTransactions.map((txn, index) => (
                                                <TableRow key={index} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                                    <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                                                        {formatDate(txn.transactionDate)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                                {txn.particulars}
                                                            </span>
                                                            {txn.refDetails && (
                                                                <span className="text-xs text-zinc-500">
                                                                    Ref: {txn.refDetails}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-zinc-500 text-xs font-mono">
                                                        {txn.bmr || "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-emerald-600">
                                                        {txn.fundReceivedAmount ? formatCurrency(txn.fundReceivedAmount) : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-orange-600">
                                                        {txn.commitAmount ? formatCurrency(txn.commitAmount) : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right text-zinc-600">
                                                        {formatCurrency(txn.commitableBalance)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-red-600">
                                                        {txn.paymentAmount ? formatCurrency(txn.paymentAmount) : "-"}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium text-blue-600">
                                                        {formatCurrency(txn.paymentBalance)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={`
                                    capitalize
                                    ${txn.status === "Settled" ? "bg-green-50 text-green-700 border-green-200" : ""}
                                    ${txn.status === "Pending" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : ""}
                                  `}
                                                        >
                                                            {txn.status || "Completed"}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>

                            {/* Pagination Footer */}
                            <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 flex items-center justify-between">
                                <div className="text-sm text-zinc-500">
                                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedTransactions.length)} of {sortedTransactions.length} entries
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeftIcon className="h-4 w-4" />
                                        Previous
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        Next
                                        <ChevronRightIcon className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}

                    {ledgerView === 'yearly' && (
                        <CardContent className="p-4">
                            <table className="w-full text-sm">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600 uppercase">Financial Year</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-600 uppercase">Opening</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-emerald-600 uppercase">Received</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-orange-600 uppercase">Committed</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-red-600 uppercase">Paid</th>
                                        <th className="px-3 py-2 text-right text-xs font-semibold text-blue-600 uppercase">Closing</th>
                                        <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-600 uppercase">Txns</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {yearlyLedgerData.map((row) => {
                                        const isExp = expandedYear === row.fy;
                                        return (
                                            <React.Fragment key={row.fy}>
                                                <tr
                                                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer"
                                                    onClick={() => setExpandedYear(isExp ? null : row.fy)}
                                                >
                                                    <td className="px-3 py-2 font-bold text-zinc-900 dark:text-zinc-100">
                                                        <span className="inline-flex items-center gap-1.5">
                                                            <span className={`text-xs transition-transform duration-200 ${isExp ? 'rotate-90' : ''}`}>▶</span>
                                                            {row.fy}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-right text-xs text-zinc-600">{row.openingBalance ? `₹${row.openingBalance.toLocaleString("en-IN")}` : "₹0"}</td>
                                                    <td className="px-3 py-2 text-right text-xs font-medium text-emerald-600">{row.totalReceived > 0 ? `₹${row.totalReceived.toLocaleString("en-IN")}` : "-"}</td>
                                                    <td className="px-3 py-2 text-right text-xs font-medium text-orange-600">{row.totalCommitted > 0 ? `₹${row.totalCommitted.toLocaleString("en-IN")}` : "-"}</td>
                                                    <td className="px-3 py-2 text-right text-xs font-medium text-red-600">{row.totalPaid > 0 ? `₹${row.totalPaid.toLocaleString("en-IN")}` : "-"}</td>
                                                    <td className="px-3 py-2 text-right text-xs font-bold text-blue-600">{`₹${row.closingBalance.toLocaleString("en-IN")}`}</td>
                                                    <td className="px-3 py-2 text-center text-xs text-zinc-500">{row.count}</td>
                                                </tr>
                                                {isExp && (
                                                    <tr>
                                                        <td colSpan={7} className="p-0 bg-zinc-50 dark:bg-zinc-900/60">
                                                            <div className="border-l-4 border-[#D97757] ml-6">
                                                                <table className="w-full text-xs">
                                                                    <thead>
                                                                        <tr className="bg-zinc-100 dark:bg-zinc-800/80">
                                                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-zinc-500 uppercase">Date</th>
                                                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-zinc-500 uppercase">Particulars</th>
                                                                            <th className="px-3 py-1.5 text-left text-[10px] font-semibold text-zinc-500 uppercase">BMR</th>
                                                                            <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-emerald-600 uppercase">Received</th>
                                                                            <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-orange-600 uppercase">Commit</th>
                                                                            <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-red-600 uppercase">Paid</th>
                                                                            <th className="px-3 py-1.5 text-right text-[10px] font-semibold text-blue-600 uppercase">Balance</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700">
                                                                        {row.txns.map((txn, i) => (
                                                                            <tr key={i} className="hover:bg-zinc-100 dark:hover:bg-zinc-800/50">
                                                                                <td className="px-3 py-1.5 whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                                                                                    {txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString("en-GB") : "-"}
                                                                                </td>
                                                                                <td className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">
                                                                                    <div>{txn.particulars}</div>
                                                                                    {txn.refDetails && <div className="text-[10px] text-zinc-400">{txn.refDetails}</div>}
                                                                                </td>
                                                                                <td className="px-3 py-1.5 text-zinc-500 font-mono">{txn.bmr || "-"}</td>
                                                                                <td className="px-3 py-1.5 text-right text-emerald-600">{txn.fundReceivedAmount ? `₹${txn.fundReceivedAmount.toLocaleString("en-IN")}` : "-"}</td>
                                                                                <td className="px-3 py-1.5 text-right text-orange-600">{txn.commitAmount ? `₹${txn.commitAmount.toLocaleString("en-IN")}` : "-"}</td>
                                                                                <td className="px-3 py-1.5 text-right text-red-600">{txn.paymentAmount ? `₹${txn.paymentAmount.toLocaleString("en-IN")}` : "-"}</td>
                                                                                <td className="px-3 py-1.5 text-right font-bold text-blue-600">{`₹${txn.paymentBalance.toLocaleString("en-IN")}`}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                    {/* Totals row */}
                                    {yearlyLedgerData.length > 0 && (
                                        <tr className="bg-zinc-100 dark:bg-zinc-800 font-bold border-t-2 border-zinc-300 dark:border-zinc-600">
                                            <td className="px-3 py-2 text-xs uppercase text-zinc-800 dark:text-zinc-100">Total</td>
                                            <td className="px-3 py-2 text-right text-xs text-zinc-500">—</td>
                                            <td className="px-3 py-2 text-right text-xs text-emerald-700">{`₹${yearlyLedgerData.reduce((s, r) => s + r.totalReceived, 0).toLocaleString("en-IN")}`}</td>
                                            <td className="px-3 py-2 text-right text-xs text-orange-700">{`₹${yearlyLedgerData.reduce((s, r) => s + r.totalCommitted, 0).toLocaleString("en-IN")}`}</td>
                                            <td className="px-3 py-2 text-right text-xs text-red-700">{`₹${yearlyLedgerData.reduce((s, r) => s + r.totalPaid, 0).toLocaleString("en-IN")}`}</td>
                                            <td className="px-3 py-2 text-right text-xs text-blue-700">{`₹${(yearlyLedgerData[yearlyLedgerData.length - 1]?.closingBalance || 0).toLocaleString("en-IN")}`}</td>
                                            <td className="px-3 py-2 text-center text-xs text-zinc-600">{yearlyLedgerData.reduce((s, r) => s + r.count, 0)}</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default ProjectLedgerFull;
