import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import {
    ArrowLeftIcon,
    SearchIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
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

            // Sort by date ascending
            const sortedData = [...rawData].sort(
                (a: any, b: any) =>
                    new Date(a.transactionDate).getTime() -
                    new Date(b.transactionDate).getTime()
            );

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
            // Reverse for display (newest first) but keep balance calculation correct
            setLedgerTransactions(calculatedData.reverse());
        } catch (error) {
            console.error("Error fetching ledger:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Filter and Pagination Logic
    const filteredTransactions = useMemo(() => {
        const filtered = ledgerTransactions.filter((txn) =>
            txn.particulars.toLowerCase().includes(searchQuery.toLowerCase()) ||
            txn.refDetails?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            txn.bmr?.toLowerCase().includes(searchQuery.toLowerCase())
        );
        console.log("ProjectLedgerFull: Filtered Data Length:", filtered.length);
        return filtered;
    }, [ledgerTransactions, searchQuery]);

    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredTransactions, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

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
                            <div className="flex items-center gap-2 w-full md:w-auto">
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
                            </div>
                        </div>
                    </CardHeader>

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
                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} entries
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
                </Card>
            </div>
        </div>
    );
};

export default ProjectLedgerFull;
