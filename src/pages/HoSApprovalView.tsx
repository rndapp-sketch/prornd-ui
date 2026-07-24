import { ArrowLeft, FileText, Building2, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "@/components/ui/global-loader";
// import { AppSidebar } from "@/components/RndSidebar";
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
                {icon && <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">{icon}</div>}
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
                highlight && "text-[#D97757] text-base",
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

    const handlePrintDepositSlip = () => {
        window.print();
    };

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
    const [prjregProjectNo, setPrjregProjectNo] = useState<string>("");

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

    // Fetch project_no from Project Registration once fundReceived is available
    useEffect(() => {
        const prjregName = fundReceived?.prjreg_title || fundReceived?.project_reference;
        if (!prjregName) return;
        fetch(`/api/v2/document/Project%20Registration/${encodeURIComponent(prjregName)}?fields=["project_no"]`, {
            credentials: "include",
        })
            .then((r) => r.ok ? r.json() : null)
            .then((json) => {
                const no = json?.data?.project_no;
                if (no) setPrjregProjectNo(no);
            })
            .catch(() => {});
    }, [fundReceived]);

    // Fetch deposit slip by searching across all doctypes for fund_received_ref.
    // `fund_received_ref` is a plain Data field on the deposit slip doctypes, and depending on
    // when the record was created it may store either the Fund Received docname or the separate
    // `fund_received_ref_number` value (e.g. "124") — so both candidates must be checked.
    useEffect(() => {
        let cancelled = false;
        const fetchDepositSlip = async () => {
            if (!fundReceivedName) return;

            setSlipLoading(true);
            setSlipError(null);

            const csrfToken = (window as any).csrf_token || "";
            const refCandidates = [...new Set([fundReceivedName, fundReceived?.fund_received_ref_number].filter(Boolean))];

            for (const doctype of depositSlipDoctypes) {
                try {
                    // POST to frappe.client.get_list — same approach used in FundReceivedDetails (staff view)
                    const res = await fetch("/api/method/frappe.client.get_list", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Frappe-CSRF-Token": csrfToken,
                        },
                        credentials: "include",
                        body: JSON.stringify({
                            doctype,
                            filters: [["fund_received_ref", "in", refCandidates]],
                            fields: ["name"],
                            limit_page_length: 1,
                            order_by: "creation desc",
                        }),
                    });

                    if (!res.ok) {
                        console.log(`Skipping ${doctype}: ${res.status}`);
                        continue;
                    }

                    const json = await res.json();
                    if (json.message?.length > 0) {
                        const docName = json.message[0].name;
                        // Fetch full document via frappe.client.get
                        const docRes = await fetch("/api/method/frappe.client.get", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "X-Frappe-CSRF-Token": csrfToken,
                            },
                            credentials: "include",
                            body: JSON.stringify({ doctype, name: docName }),
                        });
                        if (docRes.ok) {
                            const docJson = await docRes.json();
                            if (!cancelled) {
                                setDepositSlip(docJson.message);
                                setDepositSlipDoctype(doctype);
                                setSlipLoading(false);
                            }
                            return;
                        }
                    }
                } catch (err) {
                    console.log(`Skipping ${doctype} due to error:`, err);
                }
            }

            // No deposit slip found in any doctype
            if (!cancelled) {
                setSlipLoading(false);
                setSlipError({ message: "No linked deposit slip found" });
            }
        };

        fetchDepositSlip();
        return () => { cancelled = true; };
    }, [fundReceivedName, fundReceived?.fund_received_ref_number]);

    // Resolve budget head names from account_head IDs (numeric id field)
    useEffect(() => {
        const resolveBudgetHeadNames = async () => {
            if (!fundReceived?.received_amt_breakup) return;
            try {
                const response = await fetch(
                    '/api/resource/Budget%20Head?fields=["budget_head","id"]&limit_page_length=0',
                    { credentials: "include" },
                );
                if (!response.ok) return;
                const json = await response.json();
                const nameMap: Record<string, string> = {};
                for (const bh of json.data || []) {
                    if (bh.id != null) nameMap[String(bh.id)] = bh.budget_head;
                    if (bh.name) nameMap[bh.name] = bh.budget_head;
                }
                setResolvedHeadNames(nameMap);
            } catch (err) {
                console.error("Failed to resolve budget head names", err);
            }
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
                {/* <AppSidebar /> */}
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
                {/* <AppSidebar /> */}
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
            <style>{`
                @media print {
                    @page { size: A4; margin: 12mm; }

                    html,
                    body,
                    #root {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        min-height: 0 !important;
                        height: auto !important;
                        overflow: visible !important;
                        background: white !important;
                    }

                    body * {
                        background: transparent !important;
                        box-shadow: none !important;
                    }

                    .enterprise-navbar,
                    .enterprise-navbar *,
                    button,
                    [role="button"],
                    input,
                    select,
                    textarea,
                    aside,
                    nav,
                    [data-sidebar],
                    [data-sidebar="sidebar"],
                    [data-sidebar="trigger"],
                    [data-sidebar="rail"],
                    [data-sidebar="wrapper"],
                    .deposit-slip-print-hidden,
                    .deposit-slip-print-hidden *,
                    .deposit-slip-non-print,
                    .deposit-slip-non-print * {
                        display: none !important;
                    }

                    [data-sidebar-inset],
                    [data-sidebar="inset"],
                    main {
                        display: block !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    .deposit-slip-print-area {
                        display: block !important;
                        position: static !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                        color: black !important;
                        box-shadow: none !important;
                        border: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .deposit-slip-print-area > div {
                        padding: 0 !important;
                        background: white !important;
                    }
                }
            `}</style>

            {/* Header / Title Area */}
            <div className="deposit-slip-print-hidden flex items-center justify-between mb-6">
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:block">
                {/* Formal Deposit Slip Document */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm overflow-hidden print:border-0 print:shadow-none print:rounded-none">
                    {/* Status Badge */}
                    <div className="deposit-slip-print-hidden px-6 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between gap-3">
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
                        <button
                            type="button"
                            onClick={handlePrintDepositSlip}
                            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#D97757] px-3 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:opacity-90"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            Print
                        </button>
                    </div>

                    {/* Deposit Slip Document */}
                    <div className="deposit-slip-print-area">
                        <DepositSlipDocument
                            depositSlip={{
                                ...depositSlip,
                                project_no: depositSlip.project_no
                                    || prjregProjectNo
                                    || depositSlip.project_registration,
                            }}
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
                </div>

                {/* RIGHT: Fund Received Details */}
                <div className="deposit-slip-non-print space-y-6">
                    <FrappeCard
                        title={`Fund Received - ${fundReceivedName}`}
                        icon={<Building2 className="h-4 w-4 text-[#D97757]" />}
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

            {/* <FrappeCard className="bg-zinc-50 dark:bg-zinc-800 border-[#D97757]">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-bold text-[#D97757] uppercase text-xs">Total Reconciliation</p>
                        <p className="text-sm text-zinc-700 dark:text-zinc-300">Compares Deposit Slip Total vs Fund Received Total</p>
                    </div>
                    <div className="text-right">
                        <p className="text-2xl font-extrabold text-[#D97757]">
                            {(depositSlip.amount_inclusive_gst_capital === fundReceived.fund_received_amt) ? "MATCHED" : "MISMATCH"}
                        </p>
                    </div>
                </div>
            </FrappeCard> */}
        </div>
    );
};
