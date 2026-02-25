import { ArrowLeft, FileText, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "@/components/ui/global-loader";
import { AppSidebar } from "@/components/RndSidebar";
import { DepositSlipDocument } from "@/components/DepositSlipDocument";

const FrappeCard = ({
    title,
    children,
    className,
    icon,
    onClick,
}: {
    title?: string;
    children: React.ReactNode;
    className?: string;
    icon?: React.ReactNode;
    onClick?: () => void;
}) => (
    <div
        className={cn(
            "bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm",
            className,
        )}
        onClick={onClick}
    >
        {title && (
            <div className="px-6 py-4 border-b border-zinc-300 dark:border-zinc-700 flex items-center gap-3">
                {icon && <div className="p-2 bg-[#E0F7F6] rounded-lg">{icon}</div>}
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                    {title}
                </h3>
            </div>
        )}
        <div className="p-6">{children}</div>
    </div>
);

const DetailRow = ({
    label,
    value,
    isCurrency = false,
    highlight = false,
}: {
    label: string;
    value: any;
    isCurrency?: boolean;
    highlight?: boolean;
}) => (
    <div className="flex justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <span className="text-zinc-600 dark:text-zinc-400 font-medium text-sm">
            {label}
        </span>
        <span
            className={cn(
                "font-bold text-zinc-900 dark:text-zinc-100 text-sm",
                highlight && "text-[#0EA5A4] text-base",
            )}
        >
            {isCurrency
                ? typeof value === "number"
                    ? value.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                    })
                    : value
                : value || "-"}
        </span>
    </div>
);

interface HoSApprovalViewProps {
    fundReceivedName: string;
}

export const HoSApprovalView = ({ fundReceivedName }: HoSApprovalViewProps) => {
    const navigate = useNavigate();

    // State for resolved budget head names
    const [resolvedHeadNames, setResolvedHeadNames] = useState<
        Record<string, string>
    >({});

    // State for deposit slip
    const [depositSlip, setDepositSlip] = useState<any>(null);
    const [depositSlipDoctype, setDepositSlipDoctype] = useState<string>("");
    const [slipLoading, setSlipLoading] = useState(true);
    const [slipError, setSlipError] = useState<any>(null);

    // Deposit slip doctypes to search
    const depositSlipDoctypes = [
        "Research Consultancy Deposit Slip",
        "D Consultancy Deposit Slip",
        "E Non Routine Deposit Slip",
        "T Testing Deposit Slip",
        "Other Event Deposit Slip",
        "Research Deposit Slip",
    ];

    const [fundReceived, setFundReceived] = useState<any>(null);
    const [fundLoading, setFundLoading] = useState(true);
    const [fundError, setFundError] = useState<any>(null);

    // Replace useFrappeGetDoc with manual fetch for better control and debugging
    useEffect(() => {
        const fetchFundReceived = async () => {
            if (!fundReceivedName) return;
            setFundLoading(true);
            try {
                // Fetch using v2 API to ensure we get exactly what the server returns
                const response = await fetch(
                    `/api/v2/document/Fund%20Received/${encodeURIComponent(fundReceivedName)}`,
                    {
                        credentials: "include",
                    },
                );

                if (!response.ok) {
                    throw new Error(`Failed to fetch Fund Received: ${response.status}`);
                }

                const result = await response.json();
                console.log("[HoSApprovalView] Fetched fund data:", result.data);

                if (result.data) {
                    setFundReceived(result.data);

                    // Log breakup specifically
                    if (result.data.received_amt_breakup) {
                        console.log(
                            "[HoSApprovalView] Breakup rows:",
                            result.data.received_amt_breakup,
                        );
                        result.data.received_amt_breakup.forEach((row: any, i: number) => {
                            console.log(`[HoSApprovalView] Row ${i} remarks:`, row.remarks);
                        });
                    }
                }
            } catch (err: any) {
                console.error("Error fetching fund received:", err);
                setFundError(err);
            } finally {
                setFundLoading(false);
            }
        };

        fetchFundReceived();
    }, [fundReceivedName]);

    // Fetch deposit slip by searching across all doctypes for fund_received_ref
    useEffect(() => {
        const fetchDepositSlip = async () => {
            if (!fundReceivedName) return;

            setSlipLoading(true);
            setSlipError(null);

            for (const doctype of depositSlipDoctypes) {
                try {
                    // Use /api/v2/document/ endpoint for filtering
                    const response = await fetch(
                        `/api/v2/document/${encodeURIComponent(doctype)}?filters=[["fund_received_ref","=","${fundReceivedName}"]]&order_by=creation desc&limit_page_length=1`,
                        { credentials: "include" },
                    );

                    // Skip if not found or error (some doctypes may not have fund_received_ref field)
                    if (!response.ok) {
                        console.log(`Skipping ${doctype}: ${response.status}`);
                        continue;
                    }

                    const result = await response.json();
                    if (result.data && result.data.length > 0) {
                        // Found a matching deposit slip, fetch full document
                        const docName = result.data[0].name;
                        const docResponse = await fetch(
                            `/api/v2/document/${encodeURIComponent(doctype)}/${encodeURIComponent(docName)}`,
                            { credentials: "include" },
                        );
                        if (docResponse.ok) {
                            const docResult = await docResponse.json();
                            setDepositSlip(docResult.data);
                            setDepositSlipDoctype(doctype);
                            setSlipLoading(false);
                            return; // Found it, stop searching
                        }
                    }
                } catch (err) {
                    console.log(`Skipping ${doctype} due to error:`, err);
                    // Continue to next doctype
                }
            }

            // No deposit slip found in any doctype
            setSlipLoading(false);
            setSlipError({ message: "No linked deposit slip found" });
        };

        fetchDepositSlip();
    }, [fundReceivedName]);

    // Resolve budget head names from account_head IDs
    useEffect(() => {
        const resolveBudgetHeadNames = async () => {
            if (!fundReceived?.received_amt_breakup) return;

            const breakup = fundReceived.received_amt_breakup;
            const uniqueHeadIds = [
                ...new Set(breakup.map((row: any) => row.account_head).filter(Boolean)),
            ];

            const nameMap: Record<string, string> = {}; // { id: name }

            for (const headId of uniqueHeadIds) {
                try {
                    // Optimized: Check if we can get it from v2 API first (simpler)
                    const response = await fetch(
                        `/api/v2/document/Budget%20Head/${headId}`,
                        {
                            credentials: "include",
                        },
                    );

                    if (response.ok) {
                        const json = await response.json();
                        if (json.data) {
                            nameMap[headId as string] =
                                json.data.budget_head || json.data.name;
                            continue;
                        }
                    }

                    // Fallback to get_list for robust search
                    const listResp = await fetch("/api/method/frappe.client.get_list", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            doctype: "Budget Head",
                            filters: { name: headId },
                            fields: ["name", "budget_head"],
                            limit_page_length: 1,
                        }),
                    });

                    if (listResp.ok) {
                        const result = await listResp.json();
                        const list = result.message;
                        if (list && list.length > 0) {
                            const d = list[0];
                            nameMap[headId as string] = d.budget_head || d.name;
                        }
                    }
                } catch (err) {
                    console.error(`Failed to resolve budget head: ${headId}`, err);
                }
            }
            setResolvedHeadNames(nameMap);
        };
        resolveBudgetHeadNames();
    }, [fundReceived]);

    // Debug: Log the received data to check if remarks field exists
    useEffect(() => {
        if (fundReceived?.received_amt_breakup) {
            console.log("[HoSApprovalView] fundReceived data:", fundReceived);
            console.log(
                "[HoSApprovalView] received_amt_breakup:",
                fundReceived.received_amt_breakup,
            );
            console.log(
                "[HoSApprovalView] First row remarks:",
                fundReceived.received_amt_breakup[0]?.remarks,
            );
        }
    }, [fundReceived]);

    if (fundLoading || slipLoading) return <GlobalLoader isLoading={true} />;

    if (fundError || !fundReceived) {
        return (
            <div className="bg-zinc-100 dark:bg-zinc-800 min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <FrappeCard className="text-center py-16">
                        <FileText className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 uppercase">
                            Fund Received Not Found
                        </h2>
                        <p className="text-zinc-900 dark:text-zinc-100 mb-4">
                            Could not load fund received record.
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                            Reference: {fundReceivedName}
                        </p>
                        <button
                            onClick={() => navigate(-1)}
                            className="text-blue-600 underline"
                        >
                            Go Back
                        </button>
                    </FrappeCard>
                </main>
            </div>
        );
    }

    if (slipError || !depositSlip) {
        return (
            <div className="bg-zinc-100 dark:bg-zinc-800 min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4 md:p-8">
                    <FrappeCard className="text-center py-16">
                        <FileText className="w-16 h-16 mx-auto text-zinc-400 dark:text-zinc-500 mb-4" />
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2 uppercase">
                            Deposit Slip Not Found
                        </h2>
                        <p className="text-zinc-900 dark:text-zinc-100 mb-4">
                            Linked deposit slip could not be found for this fund record.
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                            Searched in: {depositSlipDoctypes.join(", ")}
                        </p>
                        <button
                            onClick={() => navigate(-1)}
                            className="text-blue-600 underline"
                        >
                            Go Back
                        </button>
                    </FrappeCard>
                </main>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Title Area */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:bg-zinc-700 transition-colors border border-zinc-300 dark:border-zinc-700"
                    >
                        <ArrowLeft className="h-5 w-5 text-zinc-900 dark:text-zinc-100" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
                            Deposit Slip & Fund Overview
                        </h1>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mt-0.5">
                            {fundReceivedName}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Formal Deposit Slip Document */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm overflow-hidden">
                    {/* Status Badge */}
                    <div className="px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
                        <span
                            className={cn(
                                "px-2 py-1 rounded text-xs font-bold border",
                                depositSlip.workflow_state === "Approved"
                                    ? "bg-green-100 text-green-800 border-green-300"
                                    : "bg-yellow-100 text-yellow-800 border-yellow-300",
                            )}
                        >
                            {depositSlip.workflow_state}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            {depositSlip.name}
                        </span>
                    </div>

                    {/* Deposit Slip Document */}
                    <DepositSlipDocument
                        depositSlip={depositSlip}
                        type={(() => {
                            // Detect deposit type from the actual doctype that was found
                            switch (depositSlipDoctype) {
                                case "D Consultancy Deposit Slip":
                                    return "consultancy_d";
                                case "E Non Routine Deposit Slip":
                                    return "consultancy_e";
                                case "T Testing Deposit Slip":
                                    return "consultancy_t";
                                case "Other Event Deposit Slip":
                                    return "other_event";
                                case "Research Consultancy Deposit Slip":
                                    return "consultancy_research";
                                case "Research Deposit Slip":
                                    return "research_rnd";
                                default:
                                    return "research_rnd";
                            }
                        })()}
                    />
                </div>

                {/* RIGHT: Fund Received Details */}
                <div className="space-y-6">
                    <FrappeCard
                        title={`Fund Received - ${fundReceivedName}`}
                        icon={<Building2 className="h-4 w-4 text-[#0EA5A4]" />}
                    >
                        <div className="mb-4">
                            <span
                                className={cn(
                                    "px-2 py-1 rounded text-xs font-bold border",
                                    fundReceived.workflow_state === "Approved"
                                        ? "bg-green-100 text-green-800 border-green-300"
                                        : "bg-yellow-100 text-yellow-800 border-yellow-300",
                                )}
                            >
                                {fundReceived.workflow_state}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <DetailRow
                                    label="Project Ref"
                                    value={
                                        fundReceived.project_reference || fundReceived.prjreg_title
                                    }
                                />
                                <DetailRow
                                    label="Sanction Ref"
                                    value={fundReceived.sanction_ref_no}
                                />
                                <DetailRow
                                    label="Bank Account"
                                    value={fundReceived.bank_account}
                                />
                                <DetailRow
                                    label="Amount Received"
                                    value={fundReceived.fund_received_amt}
                                    isCurrency
                                    highlight
                                />
                            </div>

                            {/* Budget Breakup */}
                            {fundReceived.received_amt_breakup &&
                                fundReceived.received_amt_breakup.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-xs mb-2">
                                            Budget Breakup
                                        </h4>
                                        <table className="w-full text-sm border-collapse border border-zinc-200 dark:border-zinc-800">
                                            <thead className="bg-zinc-100 dark:bg-zinc-800">
                                                <tr>
                                                    <th className="border p-2 text-left">Head</th>
                                                    <th className="border p-2 text-right">Amount</th>
                                                    <th className="border p-2 text-left">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fundReceived.received_amt_breakup.map(
                                                    (row: any, i: number) => (
                                                        <tr key={i}>
                                                            <td className="border p-2">
                                                                {resolvedHeadNames[row.account_head] ||
                                                                    row.budget_head ||
                                                                    row.account_head}
                                                            </td>
                                                            <td className="border p-2 text-right">
                                                                {(row.amount_received || 0).toLocaleString(
                                                                    "en-IN",
                                                                    { style: "currency", currency: "INR" },
                                                                )}
                                                            </td>
                                                            <td className="border p-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                                {row.remarks}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                            {/* Transactions */}
                            {fundReceived.fund_transactions &&
                                fundReceived.fund_transactions.length > 0 && (
                                    <div className="mt-4">
                                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 uppercase text-xs mb-2">
                                            Transactions
                                        </h4>
                                        <table className="w-full text-sm border-collapse border border-zinc-200 dark:border-zinc-800">
                                            <thead className="bg-zinc-100 dark:bg-zinc-800">
                                                <tr>
                                                    <th className="border p-2 text-left">Txn #</th>
                                                    <th className="border p-2 text-left">Date</th>
                                                    <th className="border p-2 text-right">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {fundReceived.fund_transactions.map(
                                                    (row: any, i: number) => (
                                                        <tr key={i}>
                                                            <td className="border p-2">
                                                                {row.transaction_number}
                                                            </td>
                                                            <td className="border p-2">
                                                                {row.transaction_date}
                                                            </td>
                                                            <td className="border p-2 text-right">
                                                                {(row.amount || 0).toLocaleString("en-IN", {
                                                                    style: "currency",
                                                                    currency: "INR",
                                                                })}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                        </div>
                    </FrappeCard>
                </div>
            </div>

            {/* <FrappeCard className="bg-[#E0F7F6] border-[#0EA5A4]">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-bold text-[#0EA5A4] uppercase text-xs">Total Reconciliation</p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">Compares Deposit Slip Total vs Fund Received Total</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-extrabold text-[#0EA5A4]">
                            {(depositSlip.amount_inclusive_gst_capital === fundReceived.fund_received_amt) ? "MATCHED" : "MISMATCH"}
                        </p>
                    </div>
                </div>
            </FrappeCard> */}
        </div>
    );
};
