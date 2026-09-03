import { ArrowLeft, FileText, Building2, Printer, Pencil, Save, X, Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GlobalLoader } from "@/components/ui/global-loader";
// import { AppSidebar } from "@/components/RndSidebar";
import { DepositSlipDocument, computeENonRoutine, computeDConsultancy } from "@/components/DepositSlipDocument";
import { useUserRoleChecks } from "@/components/UserRoleCheck";
import { BudgetHeadName } from "@/components/BudgetHeadName";

// Server-side method that persists field edits for each deposit slip doctype
const UPDATE_METHOD_BY_DOCTYPE: Record<string, string> = {
    "Research Deposit Slip": "rndopsapp.rndopsapp.doctype.research_deposit_slip.research_deposit_slip.update_research_deposit_slip_fields",
    "T Testing Deposit Slip": "rndopsapp.rndopsapp.doctype.t_testing_deposit_slip.t_testing_deposit_slip.update_t_testing_deposit_slip_fields",
    "D Consultancy Deposit Slip": "rndopsapp.rndopsapp.doctype.d_consultancy_deposit_slip.d_consultancy_deposit_slip.update_d_consultancy_deposit_slip_fields",
    "Other Event Deposit Slip": "rndopsapp.rndopsapp.doctype.other_event_deposit_slip.other_event_deposit_slip.update_other_event_deposit_slip_fields",
    "E Non Routine Deposit Slip": "rndopsapp.rndopsapp.doctype.e_non_routine_deposit_slip.e_non_routine_deposit_slip.update_e_non_routine_deposit_slip_fields",
    "Research Consultancy Deposit Slip": "rndopsapp.rndopsapp.doctype.research_consultancy_deposit_slip.research_consultancy_deposit_slip.update_research_consultancy_deposit_slip_fields",
};

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

type FormulaStepKind = "input" | "derived";
interface FormulaStepData {
    ref?: string;
    title: string;
    formula?: string;
    note?: string;
    kind: FormulaStepKind;
}

const FormulaStep = ({ index, step }: { index: number; step: FormulaStepData }) => (
    <li className="flex gap-3">
        <div
            className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                step.kind === "input"
                    ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                    : "bg-[#D97757]/15 text-[#D97757]",
            )}
        >
            {step.ref ?? index}
        </div>
        <div className="flex-1 min-w-0 pb-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {step.title}
                </span>
                <span
                    className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide",
                        step.kind === "input"
                            ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                            : "bg-[#D97757]/10 text-[#D97757]",
                    )}
                >
                    {step.kind === "input" ? "Input" : "Formula"}
                </span>
            </div>
            {step.formula && (
                <code className="mt-1 block text-xs font-mono text-zinc-600 dark:text-zinc-400 break-words">
                    {step.formula}
                </code>
            )}
            {step.note && !step.formula && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{step.note}</p>
            )}
        </div>
    </li>
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

    const { isRndStaff } = useUserRoleChecks();

    // Edit mode for the deposit slip print format
    const [isEditingSlip, setIsEditingSlip] = useState(false);
    const [editedFields, setEditedFields] = useState<Record<string, string>>({});
    const [saveError, setSaveError] = useState<string | null>(null);
    const [savingSlip, setSavingSlip] = useState(false);

    const handleFieldChange = (field: string, value: string) => {
        setEditedFields((prev) => ({ ...prev, [field]: value }));
    };

    const handleCancelEdit = () => {
        setEditedFields({});
        setSaveError(null);
        setIsEditingSlip(false);
    };

    // Note: intentionally a raw fetch (not useFrappePostCall) — that hook memoizes its
    // `call` fn with an empty dep array, so it freezes whichever method URL was passed on
    // the FIRST render. Here the method must vary with depositSlipDoctype, which is only
    // known after the async doctype-detection effect resolves, so the SDK hook would keep
    // posting to a stale/wrong method forever.
    // Fields that feed the E Non Routine GST/overhead formula (see computeENonRoutine) —
    // if any of these were edited, the derived fields must be recomputed and saved alongside
    // them, otherwise the persisted doc drifts from what the print view just showed.
    const ENR_DRIVER_FIELDS = ["amount_inclusive_of_gst", "income_tax_tds", "gst_tds_2", "cgst_9", "sgst_9", "igst_18", "overhead_multiplier"];

    // Fields that feed the D Consultancy GST/overhead formula (see computeDConsultancy) — if any
    // of these were edited, the derived fields must be recomputed and saved alongside them.
    // cgst_9/sgst_9/igst_18_on_consultancy must be included: editing IGST alone (e.g. reverting
    // it back to 0) previously skipped this whole block, so total_gst/total_amount never got
    // included in that save's payload and were left stale in the doc.
    const DC_DRIVER_FIELDS = ["amount_inclusive_of_gst", "consultancy_charge_y", "operational_charge_z", "idf_percentage", "cgst_9", "sgst_9", "igst_18_on_consultancy"];

    const handleSaveSlip = async () => {
        const updateMethod = UPDATE_METHOD_BY_DOCTYPE[depositSlipDoctype];
        if (!depositSlip?.name || !updateMethod) return;
        if (Object.keys(editedFields).length === 0) {
            setIsEditingSlip(false);
            return;
        }
        setSaveError(null);
        setSavingSlip(true);
        try {
            const changes: Record<string, unknown> = { ...editedFields };
            const childTableChanges: Array<{ fieldname: string; updated: { name: string; changes: Record<string, unknown> }[] }> = [];

            if (
                depositSlipDoctype === "E Non Routine Deposit Slip" &&
                ENR_DRIVER_FIELDS.some((f) => f in editedFields)
            ) {
                const merged = { ...depositSlip, ...editedFields };
                const enr = computeENonRoutine(merged);
                changes.consultancy_fee_x = enr.consultancyFeeX;
                changes.overhead_amount = enr.overheadAmount;
                changes.balance_in_project = enr.balanceInProject;

                const rows: any[] = Array.isArray(merged.credit_distribution) ? merged.credit_distribution : [];
                if (rows.length > 0) {
                    const creditSum = rows.reduce(
                        (s: number, r: any) => s + enr.overheadAmount * ((r.percentage_of_overhead || r.percentage || 0) / 100),
                        0,
                    );
                    changes.total_budget = creditSum + enr.gstComponent + enr.balanceInProject;
                    childTableChanges.push({
                        fieldname: "credit_distribution",
                        updated: rows
                            .filter((r) => r.name)
                            .map((r) => ({
                                name: r.name,
                                changes: { amount: enr.overheadAmount * ((r.percentage_of_overhead || r.percentage || 0) / 100) },
                            })),
                    });
                }
            }

            if (
                depositSlipDoctype === "D Consultancy Deposit Slip" &&
                DC_DRIVER_FIELDS.some((f) => f in editedFields)
            ) {
                const merged = { ...depositSlip, ...editedFields };
                const dc = computeDConsultancy(merged);
                // dc.igstAmount is the untouched 18% formula (drives Total Cost X); the row can be
                // overridden independently (e.g. set to 0), so persist dc.igstDisplay — what the
                // print view actually shows — not the formula value, or a manual override gets
                // silently clobbered back on the very next save.
                changes.igst_18_on_consultancy = dc.igstDisplay;
                changes.amount_after_gst_tds = dc.amountAfterTds;
                changes.total_cost_x = dc.totalCostX;
                changes.consultancy_charge_y = dc.chargeY;
                changes.operational_charge_z = dc.chargeZ;
                changes.overhead_from_y_amount = dc.overheadFromY;
                changes.overhead_from_z_amount = dc.overheadFromZ;
                changes.total_overhead_amount = dc.totalOverhead;
                changes.institute_share_amount = dc.instituteShare;
                changes.total_overhead_institute_share = dc.totalOverheadAndShare;
                changes.idf_percentage = dc.idfPercentage;
                changes.idf_amount = dc.idfAmount;
                changes.staff_welfare_amount = dc.staffWelfareAmount;
                changes.student_welfare_amount = dc.studentWelfareAmount;
                changes.balance_consultancy_fee = dc.balanceConsultancyFee;
                changes.balance_operation_charge = dc.balanceOperationCharge;
                changes.total_gst = dc.totalGst;
                changes.total_amount = dc.totalAmount;

                const dpfRows: any[] = Array.isArray(merged.dpf_credit_distributions) ? merged.dpf_credit_distributions : [];
                if (dpfRows.length > 0) {
                    const dpfSumPct = dpfRows.reduce((s: number, r: any) => s + (parseFloat(r.dpf_percentage) || parseFloat(r.percentage) || 0), 0);
                    childTableChanges.push({
                        fieldname: "dpf_credit_distributions",
                        updated: dpfRows
                            .filter((r) => r.name)
                            .map((r) => {
                                const pct = parseFloat(r.dpf_percentage) || parseFloat(r.percentage) || 0;
                                const amount = dpfSumPct > 0 ? dc.dpfAmount * (pct / dpfSumPct) : dc.dpfAmount / dpfRows.length;
                                return { name: r.name, changes: { dpf_amount: amount } };
                            }),
                    });
                }
            }

            const csrfToken = (window as any).csrf_token || "";
            const res = await fetch(`/api/method/${updateMethod}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-Frappe-CSRF-Token": csrfToken,
                },
                credentials: "include",
                body: JSON.stringify({
                    docname: depositSlip.name,
                    changes,
                    child_table_changes: childTableChanges,
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                setSaveError(json?.message?.message || json?.exception || `Failed to save (${res.status})`);
                return;
            }
            if (json?.message?.status === "error") {
                setSaveError(json.message.message || "Failed to save changes");
                return;
            }
            setDepositSlip((prev: any) => ({ ...prev, ...changes }));
            setEditedFields({});
            setIsEditingSlip(false);
        } catch (err: any) {
            setSaveError(err?.message || "Failed to save changes");
        } finally {
            setSavingSlip(false);
        }
    };

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

                if (result.data) {
                    setFundReceived(result.data);

                    // Log breakup specifically
                    if (result.data.received_amt_breakup) {
                        result.data.received_amt_breakup.forEach((row: any, i: number) => {
                        });
                    }
                }
            } catch (err: any) {
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
            const baseCandidates = [...new Set([fundReceivedName, fundReceived?.fund_received_ref_number].filter(Boolean))];
            // Known naming-template bug: some deposit slips were created with `fund_received_ref`
            // literally storing "<real ref>-prjreg_refnum" — the `prjreg_refnum` token was never
            // substituted (e.g. "REC_0108262318-prjreg_refnum" instead of "REC_0108262318"). Add
            // this exact suffix as a candidate so those slips are still found.
            const refCandidates = [...new Set([...baseCandidates, ...baseCandidates.map((c) => `${c}-prjreg_refnum`)])];

            // Tries one filter against one doctype; on a hit, fetches the full doc,
            // sets state, and returns true so the caller can stop searching.
            const tryMatch = async (doctype: string, filters: any[]) => {
                try {
                    const res = await fetch("/api/method/frappe.client.get_list", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Frappe-CSRF-Token": csrfToken,
                        },
                        credentials: "include",
                        body: JSON.stringify({
                            doctype,
                            filters,
                            fields: ["name"],
                            limit_page_length: 1,
                            order_by: "creation desc",
                        }),
                    });

                    if (!res.ok) {
                        return false;
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
                            return true;
                        }
                    }
                } catch (err) {
                }
                return false;
            };

            // Pass 1: exact match against both candidates (Fund Received docname and
            // fund_received_ref_number).
            for (const doctype of depositSlipDoctypes) {
                if (await tryMatch(doctype, [["fund_received_ref", "in", refCandidates]])) return;
            }

            // Pass 2: trimmed-exact fallback. `fund_received_ref` is a plain Data field
            // that's sometimes hand-entered, so stray leading/trailing whitespace can
            // make an exact match miss a real link — retry with each candidate trimmed.
            // Deliberately NOT a substring/wildcard match: that previously caused false
            // positives, linking documents whose fund_received_ref merely contained the
            // candidate as a substring rather than equaling it.
            const trimmedCandidates = [...new Set(refCandidates.map((c) => String(c).trim()).filter(Boolean))]
                .filter((c) => !refCandidates.includes(c));
            if (trimmedCandidates.length > 0) {
                for (const doctype of depositSlipDoctypes) {
                    if (await tryMatch(doctype, [["fund_received_ref", "in", trimmedCandidates]])) return;
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

    // Debug: Log the received data to check if remarks field exists
    useEffect(() => {
        if (fundReceived?.received_amt_breakup) {
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

    // Detect deposit type from the actual doctype that was found
    const depositType = (() => {
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
    })();

    const mergedDepositSlip = {
        ...depositSlip,
        ...editedFields,
        project_no: depositSlip.project_no || prjregProjectNo || depositSlip.project_registration,
    };

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
                        <div className="ml-auto flex items-center gap-2">
                            {isEditingSlip ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleCancelEdit}
                                        disabled={savingSlip}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 text-[11px] font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300 shadow-sm transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveSlip}
                                        disabled={savingSlip}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#D97757] px-3 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
                                    >
                                        <Save className="h-3.5 w-3.5" />
                                        {savingSlip ? "Saving..." : "Save"}
                                    </button>
                                </>
                            ) : (
                                <>
                                    {isRndStaff && (
                                        <button
                                            type="button"
                                            onClick={() => setIsEditingSlip(true)}
                                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 text-[11px] font-bold uppercase tracking-wide text-zinc-700 dark:text-zinc-300 shadow-sm transition-all hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                            Edit
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handlePrintDepositSlip}
                                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#D97757] px-3 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm transition-all hover:opacity-90"
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        Print
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {saveError && (
                        <div className="deposit-slip-print-hidden px-6 py-2 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-900">
                            {saveError}
                        </div>
                    )}

                    {/* Deposit Slip Document */}
                    <div className="deposit-slip-print-area">
                        <DepositSlipDocument
                            editable={isEditingSlip}
                            onFieldChange={handleFieldChange}
                            depositSlip={mergedDepositSlip}
                            type={depositType}
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
                                                                <BudgetHeadName value={row.account_head || row.budget_head} />
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

                    {/* Formula Reference — explains how the derived rows above are computed, not a live recalculation */}
                    <FrappeCard
                        title="How These Numbers Are Calculated"
                        icon={<Calculator className="h-4 w-4 text-[#D97757]" />}
                    >
                        {(() => {
                            const steps: FormulaStepData[] = [];

                            if (depositType === "consultancy_e") {
                                steps.push(
                                    { ref: "09", title: "Amount Inclusive of GST towards Capital Component", note: "Entered directly — base amount received", kind: "input" },
                                    { ref: "10", title: "Income Tax TDS", note: "Entered directly — deducted at source", kind: "input" },
                                    { ref: "11", title: "GST TDS", note: "Entered directly — deducted at source", kind: "input" },
                                    { title: "Amount Actually Received", formula: "(09) Amount Incl. GST − (10) Income Tax TDS − (11) GST TDS", kind: "derived" },
                                    { title: "Consultancy Fee X", formula: "Amount Actually Received − IGST (or − CGST − SGST if no IGST)", kind: "derived" },
                                    { title: "Overhead Amount", formula: "Overhead Multiplier × Consultancy Fee X", kind: "derived" },
                                    { title: "Balance In Project", formula: "Consultancy Fee X − Overhead Amount", kind: "derived" },
                                    { title: "Total", formula: "Σ(Credit Distribution) + GST (IGST or CGST+SGST) + Balance In Project", kind: "derived" },
                                );
                            } else if (depositType === "consultancy_d") {
                                steps.push(
                                    { title: "Total Cost X", formula: "Amount Incl. GST − GST deducted", kind: "derived" },
                                    { title: "Total Overhead", formula: "0.1 × Consultancy Charge (Y) + 0.1 × Operational Charge (Z)", kind: "derived" },
                                    { title: "Institute Share", formula: "0.2 × Consultancy Charge (Y)", kind: "derived" },
                                    { title: "Overhead + Institute Share", formula: "Total Overhead + Institute Share", kind: "derived" },
                                );
                            } else if (depositType === "consultancy_t") {
                                steps.push(
                                    { title: "Overhead Amount", formula: "Overhead Multiplier (0.7) × Consultancy Fee X", kind: "derived" },
                                );
                            } else if (depositType === "research_rnd" || depositType === "consultancy_research") {
                                steps.push(
                                    { title: "Overhead Amount", formula: "15% of Amount Inclusive of GST", kind: "derived" },
                                );
                            }

                            steps.push({ title: "Each Credit Distribution row", formula: "row % share × Overhead Amount", kind: "derived" });

                            return (
                                <ol className="space-y-3">
                                    {steps.map((step, i) => (
                                        <FormulaStep key={i} index={i + 1} step={step} />
                                    ))}
                                </ol>
                            );
                        })()}
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
