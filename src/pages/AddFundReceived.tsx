// -=-=-=-=-=-=
import React, { useState, useEffect, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";

import { useFrappePostCall, useFrappeGetCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { ArrowLeftIcon, LightbulbIcon, AlertCircleIcon } from "lucide-react";
import { AutocompleteEmail } from "../components/AutocompleteEmail";
import { ErrorModal } from "../components/ErrorModal";
import { parseFrappeError } from "../utils/errorUtils";
import { loanSettlementAPI } from "@/services/apiService";

// --- TYPE DEFINITIONS ---
interface Field {
    description: any;
    fieldname: string;
    label: string | null;
    fieldtype: string;
    mandatory: number;
    read_only: number;
    hidden: number;
    options?: string | null;
    default?: any;
}
interface LinkOption {
    value: string;
    label: string;
    project_proposal?: string;
    refnum_prj_num?: string;
}
interface FormDataResponse {
    message: {
        fields: Field[];
        link_options: { [key: string]: LinkOption[] };
        prefill_data: { [key: string]: any };
        related_project_data: { [key: string]: any };
    };
}

interface FormData {
    [key: string]: any;
    fund_transactions?: (any & { id?: string })[];
    received_amt_breakup?: (any & { id?: string })[];
}

// --- STYLES & REUSABLE UI COMPONENTS ---
const inputClasses =
    "w-full h-10 px-3 bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-medium text-[#3F3F46] dark:text-[#E4E4E7] focus:outline-none focus:ring-2 focus:ring-[#4A6CF7]/20 focus:border-[#4A6CF7] disabled:opacity-70 disabled:bg-[#F4F4F5] dark:disabled:bg-zinc-800/40 read-only:bg-[#F4F4F5] dark:read-only:bg-zinc-800/40";
const FrappeCard = ({ children, className }: any) => (
    <div
        className={cn(
            "bg-white dark:bg-[#27272A] p-5 md:p-6 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm",
            className,
        )}
    >
        {children}
    </div>
);
const FrappeButton = ({
    children,
    onClick,
    disabled,
    className,
    type = "button",
}: any) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "h-10 px-4 border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl font-bold text-[11px] uppercase tracking-wide text-[#3F3F46] dark:text-[#E4E4E7] bg-white dark:bg-[#27272A] shadow-sm transition-all hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] disabled:opacity-50 disabled:cursor-not-allowed",
            className,
        )}
    >
        {children}
    </button>
);
const NeoSection = ({ title, children }: any) => (
    <div className="space-y-4 rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20">
            <div className="w-1 h-5 rounded-full bg-[#4A6CF7]" />
            <h2 className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#1E3A8A] dark:text-blue-200">{title}</h2>
        </div>
        <div className="p-4">{children}</div>
    </div>
);

// --- MEMOIZED TABLE COMPONENTS ---
const MemoizedTransactionsTable = memo(
    ({ tableData, onRowChange, onFileChange, onAddRow, onDeleteRow, fundReceivedAmt }: any) => {
        const totalTransactionAmt = (tableData || []).reduce(
            (sum: number, row: any) =>
                sum + (row.amount ? parseFloat(row.amount) : 0),
            0,
        );
        const hasFundReceivedAmt =
            typeof fundReceivedAmt === "number" &&
            !isNaN(fundReceivedAmt) &&
            fundReceivedAmt > 0;
        const isMatch =
            hasFundReceivedAmt &&
            Math.abs(totalTransactionAmt - fundReceivedAmt) < 0.01;
        return (
            <div>
                <h3 className="inline-flex items-center rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1E3A8A] dark:text-blue-200 mb-3">
                    Transaction Details
                </h3>
                <div className="overflow-x-auto border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl">
                    <table className="min-w-full divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                        <thead className="bg-[#EEF2FF] dark:bg-blue-950/20">
                            <tr className="divide-x divide-[#C7D2FE] dark:divide-blue-900/40">
                                {[
                                    "Transaction Number",
                                    "Date",
                                    "Amount (₹)",
                                    "Attachment",
                                    "",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-3 py-2.5 font-extrabold text-[#1E3A8A] dark:text-blue-200 text-[10px] uppercase tracking-widest text-left"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46] bg-white dark:bg-[#27272A]">
                            {(tableData || []).map((row: any, i: number) => (
                                <tr
                                    key={row.id || i}
                                    className="divide-x divide-[#E4E4E7] dark:divide-[#3F3F46] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B]"
                                >
                                    <td className="px-2 py-1.5">
                                        <input
                                            type="text"
                                            className={`${inputClasses} !h-8`}
                                            value={row.transaction_number || ""}
                                            onChange={(e) =>
                                                onRowChange(
                                                    i,
                                                    "transaction_number",
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Transaction ID"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input
                                            type="date"
                                            className={`${inputClasses} !h-8`}
                                            value={row.transaction_date || ""}
                                            onChange={(e) =>
                                                onRowChange(
                                                    i,
                                                    "transaction_date",
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input
                                            type="number"
                                            className={`${inputClasses} !h-8`}
                                            value={row.amount || ""}
                                            onChange={(e) =>
                                                onRowChange(
                                                    i,
                                                    "amount",
                                                    e.target.value,
                                                )
                                            }
                                            onWheel={(e) =>
                                                e.currentTarget.blur()
                                            }
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="px-2 py-1.5">
                                        <input
                                            type="file"
                                            className={`${inputClasses} !h-8 file:mr-2 file:px-2 file:py-0.5 file:text-xs file:font-medium`}
                                            onChange={(e) =>
                                                onFileChange(
                                                    i,
                                                    "attachment",
                                                    e.target.files?.[0] || null,
                                                )
                                            }
                                        />
                                        {row.attachment_name && (
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 block">
                                                {row.attachment_name}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-2 py-1.5 text-center">
                                        <button type="button"
                                            onClick={() => onDeleteRow(i)}
                                            className="h-6 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <button type="button"
                    onClick={() =>
                        onAddRow({
                            transaction_number: "",
                            transaction_date: "",
                            amount: "",
                            attachment: null,
                        })
                    }
                    className="mt-2.5 h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wide text-white bg-[#D97757] border border-[#D97757] hover:bg-[#c5684a] transition-colors"
                >
                    + Add Transaction
                </button>
                {(tableData || []).length > 0 && (
                    <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                            Transaction Total
                        </span>
                        <span
                            className={`text-sm font-bold ${
                                hasFundReceivedAmt
                                    ? isMatch
                                        ? "text-green-600"
                                        : totalTransactionAmt > fundReceivedAmt
                                            ? "text-red-600"
                                            : "text-blue-600"
                                    : "text-zinc-800 dark:text-zinc-200"
                            }`}
                        >
                            ₹{totalTransactionAmt.toLocaleString("en-IN")}
                            {hasFundReceivedAmt && (
                                <span className="text-zinc-400 dark:text-zinc-500 font-medium">
                                    {" "}
                                    / ₹{fundReceivedAmt.toLocaleString("en-IN")}
                                </span>
                            )}
                        </span>
                    </div>
                )}
                {hasFundReceivedAmt && !isMatch && (
                    <p className="text-xs font-medium mt-1.5 text-blue-600 dark:text-blue-400">
                        {totalTransactionAmt < fundReceivedAmt
                            ? `₹${(fundReceivedAmt - totalTransactionAmt).toLocaleString("en-IN")} still unaccounted — add it as a transaction.`
                            : `Transaction total exceeds the Fund Received Amount by ₹${(totalTransactionAmt - fundReceivedAmt).toLocaleString("en-IN")} — reduce one of the entries.`}
                    </p>
                )}
                {hasFundReceivedAmt && isMatch && (
                    <p className="text-xs font-medium mt-1.5 text-green-600">
                        ✓ Transaction total matches Fund Received Amount.
                    </p>
                )}
            </div>
        );
    },
);

// Progress Bar Component
const ProgressBar = ({
    current,
    total,
    label,
    showWarning,
}: {
    current: number;
    total: number;
    label: string;
    showWarning: boolean;
}) => {
    const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
    const isOverLimit = current > total;

    return (
        <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-medium">
                <span
                    className={
                        isOverLimit
                            ? "text-red-600"
                            : "text-zinc-700 dark:text-zinc-300"
                    }
                >
                    {label}
                </span>
                <span
                    className={
                        isOverLimit
                            ? "text-red-600 font-bold"
                            : "text-zinc-600 dark:text-zinc-400"
                    }
                >
                    ₹{current.toLocaleString()} / ₹{total.toLocaleString()}
                </span>
            </div>
            <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2 overflow-hidden">
                <div
                    className={`h-2 rounded-full transition-all duration-300 ${isOverLimit
                        ? "bg-red-600"
                        : percentage > 90
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showWarning && isOverLimit && (
                <p className="text-[11px] text-red-600 font-semibold">
                    ⚠️ Exceeds limit by ₹{(current - total).toLocaleString()}
                </p>
            )}
        </div>
    );
};

// Validation Alert Component
const ValidationAlert = ({
    isValid,
    message,
}: {
    isValid: boolean;
    message: string;
    type?: "total" | "head";
}) => {
    if (!message || message === "No sanction selected") return null;

    return (
        <div
            className={`p-2.5 rounded-md border ${isValid
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300"
                : "bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-900/40 text-red-800 dark:text-red-300"
                }`}
        >
            <p className="text-xs font-medium">{message}</p>
        </div>
    );
};

const MemoizedBudgetBreakupTable = memo(
    ({
        tableData,
        onRowChange,
        onAddRow,
        onDeleteRow,
        budgetHeadOptions,
        hasEmptyAccountHead,
        usedAccountHeads,
        settlementHeads,
        settlementLocked,
    }: any) => {
        const options = budgetHeadOptions || [];
        // {label: amount} the loan settlements oblige this receipt to credit.
        const required: Record<string, number> = settlementHeads || {};
        return (
            <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="inline-flex items-center rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1E3A8A] dark:text-blue-200">
                        Budget Breakup of Received Amount
                    </h3>
                    {hasEmptyAccountHead && (
                        <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            ℹ All rows must have an Account Head selected before submitting.
                        </span>
                    )}
                </div>
                <div className="overflow-x-auto border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl">
                    <table className="min-w-full divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                        <thead className="bg-[#EEF2FF] dark:bg-blue-950/20">
                            <tr className="divide-x divide-[#C7D2FE] dark:divide-blue-900/40">
                                {[
                                    "Account Head",
                                    "Amount (₹)",
                                    "Remarks",
                                    "",
                                ].map((h) => (
                                    <th
                                        key={h}
                                        className="px-3 py-2.5 font-extrabold text-[#1E3A8A] dark:text-blue-200 text-[10px] uppercase tracking-widest text-left"
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46] bg-white dark:bg-[#27272A]">
                            {(tableData || []).map((row: any, i: number) => {
                                const otherSelected = (usedAccountHeads || []).filter(
                                    (_: string, j: number) => j !== i,
                                );
                                const isDuplicate =
                                    row.account_head &&
                                    otherSelected.includes(row.account_head);
                                const missingAmount =
                                    !row.amount_received ||
                                    parseFloat(row.amount_received) <= 0;
                                // Rows a loan settlement depends on: the head itself is
                                // never editable, and the amount is pinned too when the
                                // settlement is Partial (an exact figure, not a floor).
                                const requiredHere = required[row.account_head];
                                const isSettlementRow = requiredHere !== undefined;
                                const amountLocked = isSettlementRow && settlementLocked;
                                const belowRequired =
                                    isSettlementRow &&
                                    (parseFloat(row.amount_received) || 0) < requiredHere - 0.01;
                                return (
                                    <tr
                                        key={row.id || i}
                                        className={`divide-x divide-[#E4E4E7] dark:divide-[#3F3F46] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] ${isDuplicate ? "bg-red-50 dark:bg-red-950/20" : isSettlementRow ? "bg-[#FFF7ED] dark:bg-[#D97757]/10" : ""}`}
                                    >
                                        <td className="px-2 py-1.5">
                                            <select
                                                className={`${inputClasses} !h-8 ${isDuplicate ? "!border-red-400 !ring-red-300" : ""} ${isSettlementRow ? "cursor-not-allowed opacity-80" : ""}`}
                                                disabled={isSettlementRow}
                                                value={row.account_head || ""}
                                                onChange={(e) =>
                                                    onRowChange(
                                                        i,
                                                        "account_head",
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Select Account Head...
                                                </option>
                                                {options.map((opt: string) => {
                                                    const alreadyUsed =
                                                        otherSelected.includes(opt);
                                                    return (
                                                        <option
                                                            key={opt}
                                                            value={opt}
                                                            disabled={alreadyUsed}
                                                        >
                                                            {alreadyUsed
                                                                ? `${opt} (already added)`
                                                                : opt}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            {isDuplicate && (
                                                <p className="text-[10px] text-red-500 mt-0.5 font-semibold">
                                                    Duplicate account head
                                                </p>
                                            )}
                                            {isSettlementRow && (
                                                <p className="text-[10px] text-[#D97757] mt-0.5 font-semibold">
                                                    Required by loan settlement
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <input
                                                type="number"
                                                readOnly={amountLocked}
                                                disabled={amountLocked}
                                                className={`${inputClasses} !h-8 ${missingAmount && row.account_head ? "!border-red-400" : ""} ${belowRequired ? "!border-red-400" : ""} ${amountLocked ? "cursor-not-allowed opacity-80" : ""}`}
                                                value={row.amount_received || ""}
                                                onChange={(e) =>
                                                    onRowChange(
                                                        i,
                                                        "amount_received",
                                                        e.target.value,
                                                    )
                                                }
                                                onWheel={(e) =>
                                                    e.currentTarget.blur()
                                                }
                                                placeholder="0.00"
                                            />
                                            {belowRequired && (
                                                <p className="text-[10px] text-red-500 mt-0.5 font-semibold">
                                                    Must be at least ₹
                                                    {requiredHere.toLocaleString("en-IN")} for the
                                                    loan settlement.
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-2 py-1.5">
                                            <input
                                                type="text"
                                                className={`${inputClasses} !h-8`}
                                                value={row.remarks || ""}
                                                onChange={(e) =>
                                                    onRowChange(
                                                        i,
                                                        "remarks",
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Remarks"
                                            />
                                        </td>
                                        <td className="px-2 py-1.5 text-center">
                                            <button type="button"
                                                onClick={() => onDeleteRow(i)}
                                                disabled={isSettlementRow}
                                                title={
                                                    isSettlementRow
                                                        ? "This head is being returned to a loan and cannot be removed."
                                                        : undefined
                                                }
                                                className="h-6 px-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wide text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                <button type="button"
                    onClick={() =>
                        onAddRow({
                            account_head: "",
                            amount_received: "",
                            remarks: "",
                        })
                    }
                    className="mt-2.5 h-7 px-3 rounded-lg text-[10px] font-bold uppercase tracking-wide text-white bg-[#D97757] border border-[#D97757] hover:bg-[#c5684a] transition-colors"
                >
                    + Add Budget Item
                </button>
            </div>
        );
    },
);

// Validation state interface
interface ValidationState {
    totalValidation: {
        isValid: boolean;
        message: string;
        currentTotal: number;
        previousTotal: number;
        sanctionedTotal: number;
        remaining: number;
    };
    headValidations: Record<
        string,
        {
            isValid: boolean;
            message: string;
            currentTotal: number;
            previousTotal: number;
            sanctionedLimit: number;
            remaining: number;
        }
    >;
}

const HelpFloating: React.FC = () => {
    const [open, setOpen] = useState(false);
    return (
        <>
            <button type="button"
                onClick={() => setOpen((v) => !v)}
                className="fixed bottom-6 right-6 z-50 h-9 px-4 rounded-full bg-[#4A6CF7] text-white shadow-lg hover:bg-[#3b5ce4] transition-colors flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
                title="Help"
            >
                <LightbulbIcon className="h-4 w-4" />
                How to fill
            </button>
            {open && (
                <div className="fixed bottom-20 right-6 z-50 w-80 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20">
                        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1E3A8A] dark:text-blue-200">How to Add Fund Received</span>
                        <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg leading-none">×</button>
                    </div>
                    <div className="p-4 space-y-4 max-h-96 overflow-y-auto text-[12px] text-zinc-700 dark:text-zinc-300">
                        <div className="space-y-2">
                            <p className="font-bold text-[#1E3A8A] dark:text-blue-300 uppercase tracking-wide text-[10px]">Steps</p>
                            <ol className="space-y-2 list-none">
                                {[
                                    ["1", "Fill in the Fund Received Amount."],
                                    ["2", "Enter the Bank Account Number / Scheme — Name / Number where the funds were received."],
                                    ["3", "Add one or more Transaction Details (transaction number, date, amount, and optional attachment)."],
                                    ["4", "Enter the Budget Breakup — distribute the received amount across account heads."],
                                    ["5", "Before submitting, make sure the Transaction Details total AND the Budget Breakup total each equal the Fund Received Amount."],
                                ].map(([num, text]) => (
                                    <li key={num} className="flex gap-2.5 items-start">
                                        <span className="shrink-0 h-5 w-5 rounded-full bg-[#4A6CF7] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{num}</span>
                                        <span>{text}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>
                        <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] pt-3 space-y-2">
                            <p className="font-bold text-[#1E3A8A] dark:text-blue-300 uppercase tracking-wide text-[10px]">Validation Rules</p>
                            <ul className="space-y-1.5">
                                {[
                                    "Fund Received Amount = total of Transaction Details = total of Budget Breakup. All three must match exactly.",
                                    "Total funds received (including previous entries) cannot exceed the sanctioned amount.",
                                    "Each budget head amount cannot exceed its sanctioned limit.",
                                    "Duplicate account heads in the breakup are not allowed.",
                                ].map((rule, i) => (
                                    <li key={i} className="flex gap-2 items-start">
                                        <span className="shrink-0 text-[#4A6CF7] font-bold mt-0.5">·</span>
                                        <span>{rule}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="border-t border-[#E4E4E7] dark:border-[#3F3F46] pt-3 space-y-1.5">
                            <p className="font-bold text-[#1E3A8A] dark:text-blue-300 uppercase tracking-wide text-[10px]">Tips</p>
                            <ul className="space-y-1.5">
                                {[
                                    "Use the Sanction Details panel on the right to see year-wise budget breakup.",
                                    "The real-time validation panel updates as you type — check it before submitting.",
                                    "You can attach transaction receipts or bank slips for each transaction row.",
                                ].map((tip, i) => (
                                    <li key={i} className="flex gap-2 items-start">
                                        <span className="shrink-0 text-[#D97757] font-bold mt-0.5">·</span>
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// --- LOAN SETTLEMENT MODAL ---------------------------------------------------
// Shown when the project has one or more loans that aren't fully settled. The user
// either settles them (saved to the Loan Settlement doctype straight away, before
// this Fund Received is even submitted) or defers. See
// docs/loan-settlement-implementation.md.

/** A budget head the loan was drawn against, as the Accounts service reports it. */
interface LoanBudgetHead {
    account_head_id: number | null;
    /** Budget Head docname — canonical, but not what the breakup dropdown is keyed on. */
    account_head: string | null;
    /** Human label ("Manpower"); what the sanction-derived dropdown actually offers. */
    account_head_label: string | null;
    loan_amount: number;
}

interface ActiveLoan {
    ledger_loan_number: number;
    loan_reference: string;
    loan_amount: number;
    outstanding_amount: number | null;
    total_settled: number | null;
    /** True when the Accounts service's /summary call failed — balance unknown, cannot settle. */
    balance_unavailable?: boolean;
    loan_status: string;
    loan_received_date?: string;
    loan_type?: string;
    bmr?: string;
    project_number: string;
    budget_heads: LoanBudgetHead[];
}

interface LoanSelection {
    checked: boolean;
    settlementType: "" | "Full" | "Partial";
    amount: string;
    /** Head-wise return keyed by account_head_id. Only edited for Partial. */
    heads: Record<number, string>;
}

/** What the saved settlements oblige this Fund Received to carry. */
interface SettlementRequirements {
    total: number;
    /** {Budget Head docname: amount} */
    heads: Record<string, number>;
    /** {Budget Head docname: human label} */
    head_labels: Record<string, string>;
    /** true when every settlement is Partial: the figures are a target, not a floor. */
    exact: boolean;
    settlements: {
        name: string;
        loan_reference: string;
        settlement_type: string;
        settlement_amount: number;
        budget_breakup: {
            account_head: string | null;
            account_head_label: string | null;
            return_amount: number;
        }[];
    }[];
}

/**
 * Split `target` across heads in proportion to each head's loan amount, mirroring
 * _prorate() in loan_settlement.py so the modal previews exactly what the server will
 * store. The server's figures remain authoritative — this is display only.
 */
const prorate = (heads: LoanBudgetHead[], target: number): Record<number, number> => {
    const total = heads.reduce((s, h) => s + (h.loan_amount || 0), 0);
    if (!heads.length || total <= 0) return {};

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const parts = heads.map((h) => round2(((h.loan_amount || 0) * target) / total));

    const residue = round2(target - parts.reduce((s, p) => s + p, 0));
    if (residue) {
        let biggest = 0;
        heads.forEach((h, i) => {
            if ((h.loan_amount || 0) > (heads[biggest].loan_amount || 0)) biggest = i;
        });
        parts[biggest] = round2(parts[biggest] + residue);
    }

    return Object.fromEntries(
        heads.map((h, i) => [h.account_head_id ?? i, parts[i]]),
    );
};

const fmtINR = (v: number) =>
    `₹ ${Number(v || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const LoanSettlementModal: React.FC<{
    loans: ActiveLoan[];
    projectName: string;
    onSettle: (
        settlementNames: string[],
        requirements: SettlementRequirements | null,
        selections: Record<number, LoanSelection>,
    ) => void;
    /** Re-opened via "Edit" — restores the previous choices and offers a way out. */
    isEditing?: boolean;
    initialSelections?: Record<number, LoanSelection> | null;
    /** Settlements saved on the previous pass; discarded before new ones are created. */
    previousRefs?: string[];
    onCancelEdit?: () => void;
}> = ({ loans, projectName, onSettle, isEditing, initialSelections, previousRefs, onCancelEdit }) => {
    const [selections, setSelections] = useState<Record<number, LoanSelection>>(() =>
        Object.fromEntries(
            loans.map((l) => [
                l.ledger_loan_number,
                initialSelections?.[l.ledger_loan_number] ?? {
                    checked: false,
                    settlementType: "",
                    amount: "",
                    heads: {},
                },
            ]),
        ),
    );
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { call: saveRequests } = useFrappePostCall<{
        message: {
            status: string;
            data: string[];
            requirements?: SettlementRequirements;
        };
    }>(loanSettlementAPI.saveRequests);
    const { call: discardRequests } = useFrappePostCall<{
        message: { status: string; data: string[] };
    }>(loanSettlementAPI.discardRequests);

    /** Sum of what the user has typed head-wise for one loan. */
    const headTotal = (sel: LoanSelection) =>
        Object.values(sel.heads || {}).reduce((s, v) => s + (parseFloat(v) || 0), 0);

    const allChecked = loans.length > 0 && loans.every((l) => selections[l.ledger_loan_number]?.checked);

    const toggleAll = (checked: boolean) => {
        setSelections((prev) =>
            Object.fromEntries(
                loans.map((l) => [
                    l.ledger_loan_number,
                    { ...prev[l.ledger_loan_number], checked },
                ]),
            ),
        );
    };

    const update = (loanNo: number, patch: Partial<LoanSelection>) => {
        setSelections((prev) => ({ ...prev, [loanNo]: { ...prev[loanNo], ...patch } }));
    };

    const checkedLoans = loans.filter((l) => selections[l.ledger_loan_number]?.checked);

    // Enabled only once every checked loan has a complete, valid choice — including a
    // head-wise return that adds up to the amount being settled.
    const canSettle =
        checkedLoans.length > 0 &&
        checkedLoans.every((l) => {
            if (l.balance_unavailable || l.outstanding_amount == null) return false;
            if (!l.budget_heads?.length) return false;
            const sel = selections[l.ledger_loan_number];
            if (sel.settlementType === "Full") return true;
            if (sel.settlementType === "Partial") {
                const amt = parseFloat(sel.amount);
                if (isNaN(amt) || amt <= 0 || amt > l.outstanding_amount) return false;
                const overHead = l.budget_heads.some((h) => {
                    const v = parseFloat(sel.heads[h.account_head_id ?? -1] || "0") || 0;
                    return v < 0 || v > h.loan_amount;
                });
                return !overHead && Math.abs(headTotal(sel) - amt) < 0.01;
            }
            return false;
        });

    const handleSettle = async () => {
        setError(null);
        setSubmitting(true);
        try {
            const payload = checkedLoans.map((l) => {
                const sel = selections[l.ledger_loan_number];
                return {
                    loan_reference: l.loan_reference,
                    ledger_loan_number: l.ledger_loan_number,
                    settlement_type: sel.settlementType,
                    settlement_amount:
                        sel.settlementType === "Full" ? (l.outstanding_amount ?? 0) : parseFloat(sel.amount),
                    loan_amount: l.loan_amount,
                    project_number: l.project_number,
                    // Only sent for Partial — the server derives the Full split itself.
                    budget_breakup:
                        sel.settlementType === "Partial"
                            ? l.budget_heads.map((h) => ({
                                  account_head_id: h.account_head_id,
                                  account_head: h.account_head,
                                  return_amount:
                                      parseFloat(sel.heads[h.account_head_id ?? -1] || "0") || 0,
                              }))
                            : [],
                };
            });

            // Save the replacements BEFORE discarding the old ones. If the save fails, the
            // previous settlement is still intact and the user simply hasn't changed
            // anything — whereas discarding first would leave them with no settlement at
            // all on a failure, and settlement is mandatory here.
            //
            // Not an in-place edit, deliberately: loanSettlementNumber is an idempotency
            // key on the Accounts side, so revised figures must travel under a fresh
            // settlement number rather than reusing a doc.
            const res = await saveRequests({
                project_name: projectName,
                loans: JSON.stringify(payload),
            });

            if (res?.message?.status === "success") {
                if (previousRefs?.length) {
                    // Best-effort: these are unlinked, never-published drafts. If the
                    // cleanup fails they are inert clutter, which is a far better outcome
                    // than failing an edit the user has already successfully made.
                    try {
                        await discardRequests({
                            settlement_names: JSON.stringify(previousRefs),
                        });
                    } catch (discardErr) {
                        console.error("Could not discard superseded loan settlements", discardErr);
                    }
                }
                onSettle(res.message.data || [], res.message.requirements ?? null, selections);
            } else {
                setError("Could not save the loan settlement. Please try again.");
            }
        } catch (err: any) {
            // The backend re-validates against the Accounts service, so this is where a
            // loan that changed since the page loaded surfaces — while the user can still act.
            const serverMsg = err?._server_messages
                ? (() => {
                      try {
                          return JSON.parse(err._server_messages)
                              .map((m: string) => {
                                  try {
                                      return JSON.parse(m)?.message || m;
                                  } catch {
                                      return m;
                                  }
                              })
                              .join("\n");
                      } catch {
                          return null;
                      }
                  })()
                : null;
            setError(serverMsg || err?.message || "Could not save the loan settlement.");
        } finally {
            setSubmitting(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 w-full max-w-3xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-start gap-2.5 px-5 py-4 border-b border-zinc-200 dark:border-zinc-700">
                    <AlertCircleIcon className="w-5 h-5 text-[#D97757] flex-shrink-0 mt-0.5" />
                    <div>
                        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                            {isEditing
                                ? "Update loan settlement"
                                : loans.length === 1
                                    ? "This project has an outstanding loan"
                                    : `This project has ${loans.length} outstanding loans`}
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {isEditing
                                ? "Revise what is being settled. Saving replaces the settlement recorded earlier, and the Fund Received Amount and Budget Breakup are refreshed to match."
                                : `${loans.length === 1 ? "It" : "They"} must be settled from this fund receipt — choose how much comes back against each budget head.`}
                        </p>
                    </div>
                </div>

                {/* Loan list */}
                <div className="px-5 py-4 overflow-y-auto flex-1">
                    {loans.length > 1 && (
                        <label className="flex items-center gap-2 mb-3 pb-3 border-b border-zinc-100 dark:border-zinc-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={allChecked}
                                onChange={(e) => toggleAll(e.target.checked)}
                                className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-[#D97757] focus:ring-[#D97757]"
                            />
                            <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                Select all loans
                            </span>
                        </label>
                    )}

                    <div className="space-y-3">
                        {loans.map((loan) => {
                            const sel = selections[loan.ledger_loan_number];
                            const amt = parseFloat(sel.amount);
                            const unavailable =
                                !!loan.balance_unavailable || loan.outstanding_amount == null;
                            const amountInvalid =
                                sel.settlementType === "Partial" &&
                                sel.amount !== "" &&
                                (isNaN(amt) || amt <= 0 || amt > (loan.outstanding_amount ?? 0));
                            const allocated = headTotal(sel);
                            const headsBalanced =
                                !isNaN(amt) && Math.abs(allocated - amt) < 0.01;

                            return (
                                <div
                                    key={loan.ledger_loan_number}
                                    className={cn(
                                        "rounded-xl border p-3 transition-colors",
                                        unavailable
                                            ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20"
                                            : sel.checked
                                                ? "border-[#D97757] bg-[#FFF7ED] dark:bg-[#D97757]/10"
                                                : "border-zinc-200 dark:border-zinc-700",
                                    )}
                                >
                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={sel.checked}
                                            disabled={unavailable}
                                            onChange={(e) =>
                                                update(loan.ledger_loan_number, { checked: e.target.checked })
                                            }
                                            className="mt-0.5 w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-[#D97757] focus:ring-[#D97757] disabled:opacity-40 disabled:cursor-not-allowed"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                                                    {loan.loan_reference}
                                                </span>
                                                {unavailable ? (
                                                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
                                                        Balance unavailable
                                                    </span>
                                                ) : (
                                                    <span className="text-sm font-bold text-[#D97757]">
                                                        {fmtINR(loan.outstanding_amount ?? 0)}{" "}
                                                        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                                                            outstanding
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-1 flex items-center gap-3 flex-wrap text-[11px] text-zinc-500 dark:text-zinc-400">
                                                <span>Loan: {fmtINR(loan.loan_amount)}</span>
                                                {(loan.total_settled ?? 0) > 0 && (
                                                    <span>Settled: {fmtINR(loan.total_settled ?? 0)}</span>
                                                )}
                                                {loan.loan_type && <span>Type: {loan.loan_type}</span>}
                                                {loan.loan_received_date && (
                                                    <span>Received: {loan.loan_received_date}</span>
                                                )}
                                                <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-semibold">
                                                    {loan.loan_status}
                                                </span>
                                            </div>
                                        </div>
                                    </label>

                                    {unavailable && (
                                        <p className="mt-2 ml-7 text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                                            The Accounts service could not report this loan's outstanding
                                            balance right now, so it can't be settled from this receipt.
                                            The loan itself is still outstanding — you can settle it once
                                            the balance is available again.
                                        </p>
                                    )}

                                    {/* Per-loan Full/Partial */}
                                    {!unavailable && sel.checked && (
                                        <div className="mt-3 ml-7 pt-3 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
                                            <div className="flex items-center gap-4">
                                                {(["Full", "Partial"] as const).map((t) => (
                                                    <label
                                                        key={t}
                                                        className="flex items-center gap-1.5 cursor-pointer text-sm text-zinc-700 dark:text-zinc-300"
                                                    >
                                                        <input
                                                            type="radio"
                                                            name={`type-${loan.ledger_loan_number}`}
                                                            checked={sel.settlementType === t}
                                                            onChange={() => {
                                                                const full = t === "Full";
                                                                const target = loan.outstanding_amount ?? 0;
                                                                update(loan.ledger_loan_number, {
                                                                    settlementType: t,
                                                                    amount: full ? String(target) : "",
                                                                    // Full is fixed and shown read-only;
                                                                    // Partial starts blank for the user to fill.
                                                                    heads: full
                                                                        ? Object.fromEntries(
                                                                              Object.entries(
                                                                                  prorate(loan.budget_heads, target),
                                                                              ).map(([k, v]) => [k, String(v)]),
                                                                          )
                                                                        : {},
                                                                });
                                                            }}
                                                            className="text-[#D97757] focus:ring-[#D97757]"
                                                        />
                                                        {t} settlement
                                                    </label>
                                                ))}
                                            </div>

                                            {sel.settlementType === "Full" && (
                                                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                                    Settles the full outstanding balance of{" "}
                                                    <strong>{fmtINR(loan.outstanding_amount ?? 0)}</strong>.
                                                </p>
                                            )}

                                            {sel.settlementType === "Partial" && (
                                                <div>
                                                    <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 mb-1">
                                                        Total amount being returned
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={loan.outstanding_amount ?? undefined}
                                                        value={sel.amount}
                                                        onChange={(e) =>
                                                            update(loan.ledger_loan_number, {
                                                                amount: e.target.value,
                                                            })
                                                        }
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        placeholder={`Amount (max ${loan.outstanding_amount ?? 0})`}
                                                        className={cn(
                                                            "w-full max-w-xs px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2",
                                                            amountInvalid
                                                                ? "border-red-400 focus:ring-red-300/30"
                                                                : "border-zinc-300 dark:border-zinc-700 focus:ring-[#D97757]/25 focus:border-[#D97757]",
                                                        )}
                                                    />
                                                    {amountInvalid && (
                                                        <p className="mt-1 text-[11px] font-medium text-red-600 dark:text-red-400">
                                                            Enter an amount between 0 and{" "}
                                                            {fmtINR(loan.outstanding_amount ?? 0)}.
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            {/* Head-wise return. Read-only for Full (the split is
                                                derived); entered by the user for Partial. */}
                                            {sel.settlementType !== "" && (
                                                <div className="pt-1">
                                                    <div className="flex items-baseline justify-between gap-2 flex-wrap mb-1">
                                                        <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                                                            Return against budget heads
                                                        </span>
                                                        {sel.settlementType === "Partial" && (
                                                            <span
                                                                className={cn(
                                                                    "text-[11px] font-semibold",
                                                                    headsBalanced
                                                                        ? "text-green-600 dark:text-green-400"
                                                                        : "text-amber-600 dark:text-amber-400",
                                                                )}
                                                            >
                                                                Allocated {fmtINR(allocated)}
                                                                {!headsBalanced &&
                                                                    ` of ${fmtINR(parseFloat(sel.amount) || 0)}`}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {loan.budget_heads?.length ? (
                                                        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                                                            <table className="min-w-full text-[11px]">
                                                                <thead className="bg-zinc-50 dark:bg-zinc-800">
                                                                    <tr>
                                                                        <th className="px-2 py-1.5 text-left font-bold text-zinc-600 dark:text-zinc-300">
                                                                            Budget Head
                                                                        </th>
                                                                        <th className="px-2 py-1.5 text-right font-bold text-zinc-600 dark:text-zinc-300">
                                                                            Loan Taken
                                                                        </th>
                                                                        <th className="px-2 py-1.5 text-right font-bold text-zinc-600 dark:text-zinc-300">
                                                                            Return
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                                    {loan.budget_heads.map((h) => {
                                                                        const key = h.account_head_id ?? -1;
                                                                        const raw = sel.heads[key] ?? "";
                                                                        const val = parseFloat(raw) || 0;
                                                                        const over = val > h.loan_amount;
                                                                        return (
                                                                            <tr key={key}>
                                                                                <td className="px-2 py-1.5 text-zinc-800 dark:text-zinc-200">
                                                                                    {h.account_head_label ||
                                                                                        h.account_head ||
                                                                                        `Head ${key}`}
                                                                                </td>
                                                                                <td className="px-2 py-1.5 text-right text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                                                                                    {fmtINR(h.loan_amount)}
                                                                                </td>
                                                                                <td className="px-2 py-1.5 text-right">
                                                                                    {sel.settlementType === "Full" ? (
                                                                                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                                                                            {fmtINR(val)}
                                                                                        </span>
                                                                                    ) : (
                                                                                        <input
                                                                                            type="number"
                                                                                            min="0"
                                                                                            max={h.loan_amount}
                                                                                            value={raw}
                                                                                            onChange={(e) =>
                                                                                                update(
                                                                                                    loan.ledger_loan_number,
                                                                                                    {
                                                                                                        heads: {
                                                                                                            ...sel.heads,
                                                                                                            [key]: e.target.value,
                                                                                                        },
                                                                                                    },
                                                                                                )
                                                                                            }
                                                                                            onWheel={(e) =>
                                                                                                e.currentTarget.blur()
                                                                                            }
                                                                                            placeholder="0.00"
                                                                                            className={cn(
                                                                                                "w-28 px-2 py-1 border rounded-md text-[11px] text-right bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2",
                                                                                                over
                                                                                                    ? "border-red-400 focus:ring-red-300/30"
                                                                                                    : "border-zinc-300 dark:border-zinc-700 focus:ring-[#D97757]/25",
                                                                                            )}
                                                                                        />
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <p className="text-[11px] text-red-600 dark:text-red-400">
                                                            The Accounts service reports no budget head breakup for
                                                            this loan, so it cannot be settled head-wise.
                                                        </p>
                                                    )}

                                                    {sel.settlementType === "Partial" &&
                                                        !headsBalanced &&
                                                        (parseFloat(sel.amount) || 0) > 0 && (
                                                            <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                                                                {allocated < (parseFloat(sel.amount) || 0)
                                                                    ? `${fmtINR((parseFloat(sel.amount) || 0) - allocated)} still to be allocated across heads.`
                                                                    : `Head-wise return exceeds the total by ${fmtINR(allocated - (parseFloat(sel.amount) || 0))}.`}
                                                            </p>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {error && (
                        <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 whitespace-pre-line">
                            <AlertCircleIcon className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-zinc-200 dark:border-zinc-700">
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {checkedLoans.length > 0
                            ? `${checkedLoans.length} loan${checkedLoans.length > 1 ? "s" : ""} selected`
                            : "No loans selected"}
                    </span>
                    <div className="flex items-center gap-3">
                        {/* "Settle Later" is deliberately absent: an outstanding loan must be
                            settled from this receipt. Only the re-opened (Edit) modal offers a
                            way out, and that keeps the settlement already saved. */}
                        {isEditing && (
                            <button
                                type="button"
                                onClick={onCancelEdit}
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50"
                            >
                                Keep Existing
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleSettle}
                            disabled={!canSettle || submitting}
                            className="px-5 py-2 text-sm font-semibold text-white bg-[#D97757] hover:bg-[#c66a4e] rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting
                                ? "Saving…"
                                : isEditing
                                    ? "Update Settlement"
                                    : "Settle the Loan"}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
};

const AddFundReceived: React.FC = () => {
    const navigate = useNavigate();
    const { projectName } = useParams<{ projectName: string }>();
    const location = useLocation();
    const urlSearchParams = new URLSearchParams(location.search);
    const projectNoFromUrl = urlSearchParams.get("project_no") || "";
    const projectRegFromUrl = urlSearchParams.get("project_reg") || "";

    const [fields, setFields] = useState<Field[]>([]);
    const [formData, setFormData] = useState<FormData>({
        fund_transactions: [],
        received_amt_breakup: [],
    });
    const [linkOptions, setLinkOptions] = useState<
        Record<string, LinkOption[]>
    >({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorModal, setErrorModal] = useState<{
        open: boolean;
        title: string;
        message: string;
    }>({ open: false, title: "Submission Failed", message: "" });
    const [validationState, setValidationState] = useState<ValidationState>({
        totalValidation: {
            isValid: true,
            message: "",
            currentTotal: 0,
            previousTotal: 0,
            sanctionedTotal: 0,
            remaining: 0,
        },
        headValidations: {},
    });

    // ── Three-way total check ──
    // Fund Received Amount = Σ transaction amounts = Σ budget-breakup amounts.
    // The same money is described three times: the headline figure, how it actually
    // arrived (transactions), and where it is allocated (heads). Any two disagreeing
    // means one of the three is wrong, so all three must reconcile before submit.
    const totalBreakupAmt = (formData.received_amt_breakup || []).reduce(
        (sum: number, row: any) =>
            sum + (row.amount_received ? parseFloat(row.amount_received) : 0),
        0,
    );
    const totalTransactionAmt = (formData.fund_transactions || []).reduce(
        (sum: number, row: any) => sum + (row.amount ? parseFloat(row.amount) || 0 : 0),
        0,
    );
    const fundReceivedAmt = formData.fund_received_amt
        ? parseFloat(formData.fund_received_amt)
        : NaN;

    const amountsMatch = (a: number, b: number) => Math.abs(a - b) < 0.01;

    const fundReceivedAmtError: { type: "over" | "under"; remaining: number } | null = (() => {
        if (isNaN(fundReceivedAmt) || fundReceivedAmt === 0) return null;
        if (totalBreakupAmt > fundReceivedAmt)
            return { type: "over", remaining: totalBreakupAmt - fundReceivedAmt };
        if (totalBreakupAmt < fundReceivedAmt)
            return { type: "under", remaining: fundReceivedAmt - totalBreakupAmt };
        return null;
    })();

    const transactionAmtError: { type: "over" | "under"; remaining: number } | null = (() => {
        if (isNaN(fundReceivedAmt) || fundReceivedAmt === 0) return null;
        if (totalTransactionAmt > fundReceivedAmt)
            return { type: "over", remaining: totalTransactionAmt - fundReceivedAmt };
        if (totalTransactionAmt < fundReceivedAmt)
            return { type: "under", remaining: fundReceivedAmt - totalTransactionAmt };
        return null;
    })();

    // All three must be non-zero and equal before submit is allowed.
    const isFundAmtBreakupValid =
        !isNaN(fundReceivedAmt) &&
        fundReceivedAmt > 0 &&
        amountsMatch(totalBreakupAmt, fundReceivedAmt) &&
        amountsMatch(totalTransactionAmt, fundReceivedAmt);

    // Both amounts must be non-zero and exactly equal before submit is allowed.
    const isTransactionAmtValid =
        !isNaN(fundReceivedAmt) &&
        fundReceivedAmt > 0 &&
        Math.abs(totalTransactionAmt - fundReceivedAmt) < 0.01;

    const breakupRows: any[] = formData.received_amt_breakup || [];
    const usedAccountHeads = breakupRows
        .map((r: any) => r.account_head)
        .filter(Boolean);
    const hasDuplicateAccountHead =
        new Set(usedAccountHeads).size !== usedAccountHeads.length;
    const hasEmptyAccountHead =
        breakupRows.length === 0 ||
        hasDuplicateAccountHead ||
        breakupRows.some(
            (row: any) =>
                !row.account_head ||
                String(row.account_head).trim() === "" ||
                !row.amount_received ||
                parseFloat(row.amount_received) <= 0,
        );

    const {
        call: fetchFormData,
        result,
        error,
    } = useFrappePostCall<FormDataResponse>(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_fields",
    );
    const { call: submitForm, error: submitError } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.submit_fund_received",
    );

    const { data: sanctionData, isLoading: sanctionLoading } = useFrappeGetCall(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project",
        { project_name: projectName },
        undefined,
        { revalidateOnFocus: false },
    );

    // --- LOAN SETTLEMENT -------------------------------------------------
    // If this project has unsettled loans, block the form behind a modal asking
    // whether to settle them out of this receipt. Fails open: if the Accounts
    // service is unreachable the backend returns [], no modal, business as usual.
    const { data: activeLoansData } = useFrappeGetCall<{
        message: { status: string; data: ActiveLoan[] };
    }>(
        loanSettlementAPI.getActiveLoansForProject,
        { project_name: projectNoFromUrl || projectName },
        // 3rd arg is the SWR cache key, NOT options — a fresh object here would be a
        // new key every render, refetching in a loop. That matters more than usual
        // here: each call fans out to 1 + N requests against the Accounts service.
        projectNoFromUrl || projectName
            ? `active-loans-${projectNoFromUrl || projectName}`
            : null,
        { revalidateOnFocus: false, revalidateOnReconnect: false },
    );

    const activeLoans = activeLoansData?.message?.data ?? [];
    const [loanModalDismissed, setLoanModalDismissed] = useState(false);
    const [loanSettlementRefs, setLoanSettlementRefs] = useState<string[]>([]);
    const [settlementReq, setSettlementReq] = useState<SettlementRequirements | null>(null);
    // Kept so re-opening via "Edit" restores exactly what the user chose last time,
    // rather than making them re-enter every head from scratch.
    const [settlementSelections, setSettlementSelections] =
        useState<Record<number, LoanSelection> | null>(null);
    const [editingSettlement, setEditingSettlement] = useState(false);

    const showLoanModal =
        activeLoans.length > 0 && (!loanModalDismissed || editingSettlement);

    // When every settlement is Partial the user has already stated the exact amount and
    // its head-wise split, so the form is filled in and locked rather than re-typed.
    // With a Full settlement the receipt may legitimately be larger, so the prefilled
    // figures are only a starting point and stay editable (the backend enforces the floor).
    const settlementLocked = !!settlementReq && settlementReq.exact;

    // Re-keyed by label, because that is what the breakup rows and the dropdown use.
    const settlementHeadsByLabel: Record<string, number> = Object.fromEntries(
        Object.entries(settlementReq?.heads ?? {}).map(([docname, amount]) => [
            settlementReq?.head_labels?.[docname] || docname,
            amount,
        ]),
    );

    /**
     * Fill the receipt in from the settlements just saved.
     *
     * Heads are written using their label ("Manpower"), because that is the form the
     * sanction-derived dropdown offers; the backend resolves label, docname and numeric
     * id to the same Budget Head when it validates.
     */
    const applySettlementRequirements = (
        req: SettlementRequirements,
        /** The requirement being replaced, when re-opened via "Edit". */
        prevReq?: SettlementRequirements | null,
    ) => {
        setFormData((prev) => {
            let rows = [...(prev.received_amt_breakup || [])];

            // Back the previous settlement's contribution out first. Without this, a head
            // dropped from the settlement — or an amount revised downwards — would leave
            // its old money sitting in the breakup, silently inflating the total. Anything
            // the user added on top of the requirement is preserved; only the settlement's
            // own share is withdrawn, and a row emptied by that is dropped.
            if (prevReq) {
                Object.entries(prevReq.heads || {}).forEach(([docname, was]) => {
                    const label = prevReq.head_labels?.[docname] || docname;
                    const idx = rows.findIndex(
                        (r) => r.account_head === label || r.account_head === docname,
                    );
                    if (idx === -1) return;

                    const remaining = (parseFloat(rows[idx].amount_received) || 0) - was;
                    rows[idx] = {
                        ...rows[idx],
                        amount_received: remaining > 0.009 ? String(Math.round(remaining * 100) / 100) : "",
                    };
                });
                rows = rows.filter((r) => r.account_head && r.amount_received !== "");

                const afterRemoval = (parseFloat(prev.fund_received_amt) || 0) - prevReq.total;
                prev = {
                    ...prev,
                    fund_received_amt: afterRemoval > 0.009 ? String(Math.round(afterRemoval * 100) / 100) : "",
                };
            }

            Object.entries(req.heads).forEach(([docname, required]) => {
                const label = req.head_labels?.[docname] || docname;
                const idx = rows.findIndex(
                    (r) => r.account_head === label || r.account_head === docname,
                );

                if (idx === -1) {
                    rows.push({
                        id: `${Date.now()}-${docname}`,
                        account_head: label,
                        amount_received: String(required),
                        remarks: "",
                    });
                    return;
                }

                const existing = parseFloat(rows[idx].amount_received) || 0;
                // Exact: pinned. Floor: only raise a shortfall, never trim a larger entry.
                if (req.exact || existing < required) {
                    rows[idx] = { ...rows[idx], amount_received: String(required) };
                }
            });

            const currentAmt = parseFloat(prev.fund_received_amt) || 0;
            const fundAmt =
                req.exact || currentAmt < req.total ? String(req.total) : prev.fund_received_amt;

            return { ...prev, fund_received_amt: fundAmt, received_amt_breakup: rows };
        });
    };

    // Fetch previous Fund Received Data for validation — use project_no (not projectName)
    const { data: previousFundsData } = useFrappeGetCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
        { prjreg_title: projectNoFromUrl || projectName, limit: 1000 },
        undefined,
        {
            revalidateOnFocus: false,
            isPaused: () => !(projectNoFromUrl || projectName),
        },
    );

    useEffect(() => {
        if (projectName) {
            fetchFormData({ doc_name: projectName });
        }
    }, [fetchFormData, projectName]);


    // Handle Edit Mode
    const editSearchParams = new URLSearchParams(location.search);
    const editDocName = editSearchParams.get("id");

    // Fetch existing document for editing
    useEffect(() => {
        const loadExistingDoc = async () => {
            if (!editDocName || !result?.message) return;

            try {
                const response = await fetch(
                    `/api/v2/document/Fund%20Received/${encodeURIComponent(editDocName)}`,
                    {
                        credentials: "include",
                    },
                );
                if (response.ok) {
                    const json = await response.json();
                    const doc = json.data;

                    if (doc) {
                        setFormData((prev) => ({
                            ...prev,
                            // Map simple fields
                            ...doc,
                            // Map child tables specifically
                            fund_transactions: (
                                doc.fund_transactions || []
                            ).map((row: any) => ({
                                ...row,
                                id: row.name, // Use name as ID for existing rows
                                // Ensure attachment field is set if it exists
                                attachment: row.attachment || row.file || null,
                            })),
                            received_amt_breakup: (
                                doc.received_amt_breakup || []
                            ).map((row: any) => ({
                                ...row,
                                id: row.name,
                            })),
                            // Ensure project ref is set correctly
                            prjreg_title: doc.prjreg_title || prev.prjreg_title,
                            sanction_ref_no:
                                doc.sanction_ref_no || prev.sanction_ref_no,
                        }));
                    }
                }
            } catch (err) {
                alert("Failed to load document for editing");
            }
        };

        // Load doc only after form fields are initialized
        loadExistingDoc();
    }, [editDocName, result]); // depend on result (form fields loaded)

    useEffect(() => {
        if (result?.message) {
            const {
                fields: apiFields,
                link_options,
                prefill_data,
                related_project_data,
            } = result.message;

            if (Array.isArray(apiFields)) {
                const prefillData: { [key: string]: any } = {
                    ...(prefill_data || {}),
                    prjreg_title: related_project_data?.name || projectName,
                    prj_type: related_project_data?.project_type || "",
                    project_title: related_project_data?.project_title || "",
                };

                const processedFields = apiFields.map((field) => {
                    if (field.fieldtype === "Section Break") return field;
                    if (prefillData[field.fieldname] !== undefined) {
                        return {
                            ...field,
                            default: prefillData[field.fieldname],
                        };
                    }
                    if (
                        field.fieldname === "gst_invoice_issued" &&
                        !field.default
                    ) {
                        return { ...field, default: "No" };
                    }
                    return field;
                });

                setFields(processedFields);

                // Initialize formData with prefill values ONLY if not editing
                // If editing, the edit loading effect will override/merge.
                if (!editDocName) {
                    // Merge prefill data AND field defaults into formData
                    const defaultsFromFields: Record<string, any> = {};
                    processedFields.forEach((f) => {
                        if (
                            f.fieldtype !== "Section Break" &&
                            f.fieldtype !== "Table" &&
                            f.default !== undefined
                        ) {
                            defaultsFromFields[f.fieldname] = f.default;
                        }
                    });
                    setFormData((prev) => ({
                        ...prev,
                        ...defaultsFromFields,
                        ...prefillData,
                        fund_transactions: [],
                        received_amt_breakup: [],
                    }));
                }
            }
            setLinkOptions((prev) => ({ ...prev, ...(link_options || {}) }));
            setLoading(false);
        }
        if (error) {
            alert("Failed to load form data.");
            setLoading(false);
        }
    }, [result, error, projectName]);

    // GST invoice visibility handler
    useEffect(() => {
        const gstValue = formData.gst_invoice_issued;
        const invoiceContainer = document.getElementById(
            "invoice_no_container",
        );
        if (invoiceContainer) {
            invoiceContainer.style.display =
                gstValue === "Yes" ? "grid" : "none";
        }
    }, [formData.gst_invoice_issued]);

    // Real-time validation function
    const performValidation = useCallback(() => {
        const selectedSanction = formData.sanction_ref_no
            ? sanctionData?.message?.find(
                (s: any) => s.name === formData.sanction_ref_no,
            )
            : sanctionData?.message?.[0];

        if (!selectedSanction) {
            setValidationState({
                totalValidation: {
                    isValid: true,
                    message: "No sanction selected",
                    currentTotal: 0,
                    previousTotal: 0,
                    sanctionedTotal: 0,
                    remaining: 0,
                },
                headValidations: {},
            });
            return;
        }

        // 1. Calculate Previous Totals (Total & Per Head)
        let prevTotal = 0;
        const prevHeadTotals: Record<string, number> = {};

        const rawFunds =
            previousFundsData?.message?.message ||
            previousFundsData?.message ||
            [];
        const relevantFunds = Array.isArray(rawFunds)
            ? rawFunds.filter(
                (f: any) =>
                    f.sanction_ref_no === selectedSanction.name &&
                    f.name !== editDocName,
            ) // Exclude current doc if editing
            : [];

        relevantFunds.forEach((fund: any) => {
            if (
                fund.received_amt_breakup &&
                Array.isArray(fund.received_amt_breakup)
            ) {
                fund.received_amt_breakup.forEach((item: any) => {
                    const amt = item.amount_received || 0;
                    const head = item.account_head;
                    prevTotal += amt;
                    if (head) {
                        prevHeadTotals[head] =
                            (prevHeadTotals[head] || 0) + amt;
                    }
                });
            }
        });

        // 2. Calculate Current Totals from Form Data
        let currentTotal = 0;
        const currentHeadTotals: Record<string, number> = {};

        (formData.received_amt_breakup || []).forEach((row: any) => {
            const amt = row.amount_received
                ? parseFloat(row.amount_received)
                : 0;
            const head = row.account_head;
            currentTotal += amt;
            if (head) {
                currentHeadTotals[head] = (currentHeadTotals[head] || 0) + amt;
            }
        });

        // 3a. Build head-wise sanctioned map first (needed for total fallback)
        const sanctionedHeadMap: Record<string, number> = {};
        if (
            selectedSanction.sanctioned_budget_breakup &&
            Array.isArray(selectedSanction.sanctioned_budget_breakup)
        ) {
            const yearKeys = [
                "first_year_budget",
                "second_year_budget",
                "third_year_budget",
                "fourth_year_budget",
                "fifth_year_budget",
            ];
            selectedSanction.sanctioned_budget_breakup.forEach((row: any) => {
                const headTotalSanctioned = yearKeys.reduce(
                    (sum, key) => sum + (row[key] || 0),
                    0,
                );
                sanctionedHeadMap[row.account_head] = headTotalSanctioned;
            });
        }

        // 3b. Validate Total Amount
        // Use total_sanctioned_amount if available, otherwise derive from budget breakup rows
        const breakupTotal = Object.values(sanctionedHeadMap).reduce(
            (sum, v) => sum + v,
            0,
        );
        const totalSanctioned =
            (selectedSanction.total_sanctioned_amount || 0) > 0
                ? selectedSanction.total_sanctioned_amount
                : breakupTotal;
        const newTotalReceived = prevTotal + currentTotal;
        const remainingTotal = totalSanctioned - newTotalReceived;

        const totalValidation = {
            isValid:
                totalSanctioned === 0 || newTotalReceived <= totalSanctioned,
            message:
                totalSanctioned === 0
                    ? "⚠️ No sanctioned amount found"
                    : newTotalReceived > totalSanctioned
                        ? `⚠️ EXCEEDS sanctioned amount by ₹${(newTotalReceived - totalSanctioned).toLocaleString()}`
                        : remainingTotal > 0
                            ? `✓ ₹${remainingTotal.toLocaleString()} remaining`
                            : "✓ Full amount utilized",
            currentTotal,
            previousTotal: prevTotal,
            sanctionedTotal: totalSanctioned,
            remaining: remainingTotal,
        };

        // 4. Validate Head-wise Amount

        const headValidations: Record<string, any> = {};

        // Check all heads that have sanctioned amounts
        Object.keys(sanctionedHeadMap).forEach((head) => {
            const currentAmt = currentHeadTotals[head] || 0;
            const prevAmt = prevHeadTotals[head] || 0;
            const totalForHead = prevAmt + currentAmt;
            const limit = sanctionedHeadMap[head];
            const remaining = limit - totalForHead;

            headValidations[head] = {
                isValid: totalForHead <= limit,
                message:
                    totalForHead > limit
                        ? `⚠️ EXCEEDS by ₹${(totalForHead - limit).toLocaleString()}`
                        : remaining > 0
                            ? `✓ ₹${remaining.toLocaleString()} remaining`
                            : "✓ Fully utilized",
                currentTotal: currentAmt,
                previousTotal: prevAmt,
                sanctionedLimit: limit,
                remaining,
            };
        });

        setValidationState({
            totalValidation,
            headValidations,
        });
    }, [formData, sanctionData, previousFundsData]);

    // Trigger validation whenever form data changes
    useEffect(() => {
        performValidation();
    }, [performValidation]);

    // --- FORM HANDLERS ---
    const handleChange = useCallback((fieldname: string, value: any) => {
        setFormData((prev) => ({ ...prev, [fieldname]: value }));
    }, []);

    // --- TABLE HANDLERS ---
    const handleTransactionRowChange = useCallback(
        (rowIndex: number, fieldname: string, value: any) => {
            setFormData((prev) => {
                const table = [...(prev.fund_transactions || [])];
                table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
                return { ...prev, fund_transactions: table };
            });
        },
        [],
    );

    const handleTransactionFileChange = useCallback(
        (rowIndex: number, fieldname: string, file: File | null) => {
            setFormData((prev) => {
                const table = [...(prev.fund_transactions || [])];
                table[rowIndex] = {
                    ...table[rowIndex],
                    [fieldname]: file,
                    attachment_name: file?.name || "",
                };
                return { ...prev, fund_transactions: table };
            });
        },
        [],
    );

    const addTransactionRow = useCallback((newRow: object) => {
        const newId = Date.now().toString();
        setFormData((prev) => ({
            ...prev,
            fund_transactions: [
                ...(prev.fund_transactions || []),
                { ...newRow, id: newId },
            ],
        }));
    }, []);

    const deleteTransactionRow = useCallback((rowIndex: number) => {
        setFormData((prev) => ({
            ...prev,
            fund_transactions: (prev.fund_transactions || []).filter(
                (_: any, i: number) => i !== rowIndex,
            ),
        }));
    }, []);

    const handleBudgetRowChange = useCallback(
        (rowIndex: number, fieldname: string, value: any) => {
            setFormData((prev) => {
                const table = [...(prev.received_amt_breakup || [])];
                table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
                return { ...prev, received_amt_breakup: table };
            });
        },
        [],
    );

    const addBudgetRow = useCallback((newRow: object) => {
        const newId = Date.now().toString();
        setFormData((prev) => ({
            ...prev,
            received_amt_breakup: [
                ...(prev.received_amt_breakup || []),
                { ...newRow, id: newId },
            ],
        }));
    }, []);

    const deleteBudgetRow = useCallback((rowIndex: number) => {
        setFormData((prev) => ({
            ...prev,
            received_amt_breakup: (prev.received_amt_breakup || []).filter(
                (_: any, i: number) => i !== rowIndex,
            ),
        }));
    }, []);

    // Helper to upload file to Frappe
    const uploadFileToFrappe = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file, file.name);
        formData.append("is_private", "0"); // Public file
        // formData.append('doctype', 'Fund Transaction'); // Optional: Link to doctype if known, but generic upload is fine
        // formData.append('docname', ...); // We don't have the docname yet for new docs

        const response = await fetch("/api/method/upload_file", {
            method: "POST",
            body: formData,
            headers: {
                "X-Frappe-CSRF-Token": (window as any).csrf_token || "",
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `File upload failed: ${response.status} ${errorText}`,
            );
        }

        const result = await response.json();
        return result.message; // Returns file object including file_url
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        // --- ENHANCED VALIDATION LOGIC WITH DETAILED MESSAGES ---
        try {
            // ── Validate fund_received_amt vs transaction total ──
            if (!isTransactionAmtValid) {
                const diff = totalTransactionAmt - fundReceivedAmt;
                const isOver = diff > 0;
                const diffLine = isOver
                    ? `Exceeded By: ₹${diff.toLocaleString("en-IN")}`
                    : `Shortfall: ₹${Math.abs(diff).toLocaleString("en-IN")}`;
                const hint = isOver
                    ? `The total of all transaction entries must not exceed the Fund Received Amount.`
                    : `The total of all transaction entries must equal the Fund Received Amount.`;
                throw new Error(
                    `❌ TOTAL FUND VALIDATION FAILED\n\n` +
                    `Transaction Total: ₹${totalTransactionAmt.toLocaleString("en-IN")}\n` +
                    `Fund Received Amount: ₹${fundReceivedAmt.toLocaleString("en-IN")}\n` +
                    `${diffLine}\n\n` +
                    hint,
                );
            }

            // ── Validate fund_received_amt vs breakup total ──
            if (!isFundAmtBreakupValid) {
                const inr = (n: number) =>
                    `₹${(isNaN(n) ? 0 : n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                const mark = (ok: boolean) => (ok ? "✓" : "✗");

                const txOk = amountsMatch(totalTransactionAmt, fundReceivedAmt);
                const bkOk = amountsMatch(totalBreakupAmt, fundReceivedAmt);

                const gap = (label: string, total: number) => {
                    const diff = total - fundReceivedAmt;
                    return diff > 0
                        ? `   ${label} exceeds the Fund Received Amount by ${inr(diff)}.`
                        : `   ${label} falls short of the Fund Received Amount by ${inr(-diff)}.`;
                };

                const lines = [
                    `❌ TOTALS DO NOT MATCH`,
                    ``,
                    `These three must be equal:`,
                    ``,
                    `   Fund Received Amount    ${inr(fundReceivedAmt)}`,
                    `${mark(txOk)}  Transaction Details      ${inr(totalTransactionAmt)}`,
                    `${mark(bkOk)}  Budget Breakup           ${inr(totalBreakupAmt)}`,
                    ``,
                ];
                if (isNaN(fundReceivedAmt) || fundReceivedAmt <= 0) {
                    lines.push(`   Enter a Fund Received Amount greater than zero.`);
                } else {
                    if (!txOk) lines.push(gap("Transaction Details", totalTransactionAmt));
                    if (!bkOk) lines.push(gap("Budget Breakup", totalBreakupAmt));
                }

                throw new Error(lines.join("\n"));
            }

            // ── Validate against the loan settlements raised from this receipt ──
            // The backend re-checks all of this; doing it here just avoids a round-trip.
            if (settlementReq && settlementReq.total > 0) {
                const shortTotal = settlementReq.exact
                    ? Math.abs(fundReceivedAmt - settlementReq.total) >= 0.01
                    : fundReceivedAmt < settlementReq.total - 0.01;
                if (shortTotal) {
                    throw new Error(
                        `❌ LOAN SETTLEMENT VALIDATION FAILED\n\n` +
                        `Fund Received Amount must be ${settlementReq.exact ? "exactly" : "at least"} ` +
                        `₹${settlementReq.total.toLocaleString("en-IN")} to settle the selected loan(s).\n` +
                        `Current: ₹${(fundReceivedAmt || 0).toLocaleString("en-IN")}`,
                    );
                }

                const shortHeads = Object.entries(settlementHeadsByLabel)
                    .map(([label, req]) => {
                        const got = (formData.received_amt_breakup || [])
                            .filter((r) => r.account_head === label)
                            .reduce(
                                (s: number, r) => s + (parseFloat(r.amount_received) || 0),
                                0,
                            );
                        const bad = settlementReq.exact
                            ? Math.abs(got - req) >= 0.01
                            : got < req - 0.01;
                        return bad ? `• ${label}: ₹${got.toLocaleString("en-IN")} of ₹${req.toLocaleString("en-IN")}` : null;
                    })
                    .filter(Boolean);

                if (shortHeads.length > 0) {
                    throw new Error(
                        `❌ LOAN SETTLEMENT VALIDATION FAILED\n\n` +
                        `The Budget Breakup must credit ${settlementReq.exact ? "exactly" : "at least"} ` +
                        `the amount being returned to each head:\n\n${shortHeads.join("\n")}`,
                    );
                }
            }

            // Check if overall validation state is valid
            if (!validationState.totalValidation.isValid) {
                const { currentTotal, previousTotal, sanctionedTotal } =
                    validationState.totalValidation;
                const exceeded = currentTotal + previousTotal - sanctionedTotal;
                throw new Error(
                    `❌ TOTAL FUND VALIDATION FAILED\n\n` +
                    `Total Fund Received: ₹${(currentTotal + previousTotal).toLocaleString()}\n` +
                    `Sanctioned Amount: ₹${sanctionedTotal.toLocaleString()}\n` +
                    `Exceeded By: ₹${exceeded.toLocaleString()}\n\n` +
                    `Breakdown:\n` +
                    `- Previously Received: ₹${previousTotal.toLocaleString()}\n` +
                    `- Current Entry: ₹${currentTotal.toLocaleString()}\n\n` +
                    `Please reduce the current fund amount to stay within sanctioned limits.`,
                );
            }

            // Check head-wise validations (soft validation — warn but allow proceed)
            const invalidHeads = Object.entries(
                validationState.headValidations,
            ).filter(([_, validation]) => !validation.isValid);

            if (invalidHeads.length > 0) {
                const warningDetails = invalidHeads
                    .map(([head, validation]) => {
                        const exceeded =
                            validation.currentTotal +
                            validation.previousTotal -
                            validation.sanctionedLimit;
                        return (
                            `\n• ${head}:\n` +
                            `  Total: ₹${(validation.currentTotal + validation.previousTotal).toLocaleString()} ` +
                            `(Limit: ₹${validation.sanctionedLimit.toLocaleString()})\n` +
                            `  Exceeded by: ₹${exceeded.toLocaleString()}`
                        );
                    })
                    .join("\n");

                const proceed = window.confirm(
                    `⚠️ WARNING: Budget Head Limit Exceeded\n\n` +
                    `${invalidHeads.length} budget head(s) exceed their sanctioned limits:` +
                    warningDetails +
                    `\n\nThe overall total is within the sanctioned amount. Do you want to proceed anyway?`,
                );
                if (!proceed) {
                    throw new Error("CANCELLED");
                }
            }

            // Get selected sanction for final validation
            const selectedSanction = formData.sanction_ref_no
                ? sanctionData?.message?.find(
                    (s: any) => s.name === formData.sanction_ref_no,
                )
                : sanctionData?.message?.[0];

            if (!selectedSanction) {
                throw new Error(
                    "❌ No Sanction details found. Please select a sanction reference before submitting.",
                );
            }

            // Validation passed - log success
        } catch (validationError: any) {
            if (validationError.message !== "CANCELLED") {
                setErrorModal({
                    open: true,
                    title: "Validation Failed",
                    message: validationError.message,
                });
            }
            setIsSubmitting(false);
            return;
        }

        try {
            const dataToSubmit: { [key: string]: any } = {};

            // If editing, include the doc name so backend knows to update
            if (editDocName) {
                dataToSubmit.name = editDocName;
                dataToSubmit.doctype = "Fund Received"; // Required for frappe.client.save
            }

            // Collect regular form fields from formData state
            fields.forEach((field) => {
                if (
                    field.fieldtype !== "Table" &&
                    field.fieldtype !== "Section Break" &&
                    !field.hidden
                ) {
                    if (formData[field.fieldname] !== undefined) {
                        dataToSubmit[field.fieldname] =
                            formData[field.fieldname];
                    }
                }
            });

            // Process fund transactions table
            dataToSubmit.fund_transactions = await Promise.all(
                (formData.fund_transactions || []).map(async (row: any) => {
                    if (
                        !row.transaction_number &&
                        !row.transaction_date &&
                        (!row.amount || parseFloat(row.amount) === 0)
                    ) {
                        return null;
                    }

                    let attachmentUrl =
                        row.attachment instanceof File ? null : row.attachment;

                    // If it's a new File object, upload it
                    if (row.attachment instanceof File) {
                        try {
                            const uploadedFile = await uploadFileToFrappe(
                                row.attachment,
                            );
                            attachmentUrl = uploadedFile.file_url;
                        } catch (fileError) {
                            alert(
                                `Failed to upload attachment for transaction ${row.transaction_number || "partial"}. Proceeding without file.`,
                            );
                        }
                    }

                    const rowData: any = {
                        transaction_number: row.transaction_number || "",
                        transaction_date: row.transaction_date || "",
                        amount: row.amount ? parseFloat(row.amount) : 0,
                        sanction_ref_no: formData.sanction_ref_no || null,
                        attachment: attachmentUrl, // Standard field
                    };

                    // Use name if editing existing row
                    if (
                        editDocName &&
                        row.name &&
                        !String(row.name).startsWith("new-")
                    ) {
                        rowData.name = row.name;
                    }

                    return rowData;
                }),
            );
            dataToSubmit.fund_transactions =
                dataToSubmit.fund_transactions.filter((r: any) => r !== null);

            // Process received amount breakup table
            dataToSubmit.received_amt_breakup = (
                formData.received_amt_breakup || []
            )
                .map((row: any) => {
                    if (
                        !row.account_head &&
                        (!row.amount_received ||
                            parseFloat(row.amount_received) === 0)
                    ) {
                        return null;
                    }
                    const rowData: any = {
                        account_head: row.account_head || "",
                        amount_received: row.amount_received
                            ? parseFloat(row.amount_received)
                            : 0,
                        sanction_ref_no: formData.sanction_ref_no || null,
                        remarks: row.remarks || "",
                    };

                    // Use name if editing existing row
                    if (
                        editDocName &&
                        row.name &&
                        !String(row.name).startsWith("new-")
                    ) {
                        rowData.name = row.name;
                    }

                    return rowData;
                })
                .filter((r: any) => r !== null);


            await submitForm({
                doc_data: JSON.stringify(dataToSubmit),
                save: true,
                project_no: projectNoFromUrl,
                project_reg: projectRegFromUrl,
            });
            alert(
                editDocName
                    ? "Fund Received updated and submitted successfully!"
                    : "Fund Received submitted successfully!",
            );

            navigate(-1);
        } catch (err: any) {
            setErrorModal({
                open: true,
                title: "Submission Failed",
                message: parseFrappeError(submitError, err),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderFormField = (field: Field) => {
        if (!field || field.hidden || field.fieldtype === "Section Break")
            return null;

        // A partial settlement pins the receipt to the amount the user declared in the
        // modal, so the field is theirs to change there, not here.
        const lockedBySettlement =
            settlementLocked && field.fieldname === "fund_received_amt";

        const commonProps = {
            id: field.fieldname,
            name: field.fieldname,
            className: cn(inputClasses, lockedBySettlement && "bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed"),
            readOnly: field.read_only === 1 || lockedBySettlement,
            required: field.mandatory === 1,
            disabled: field.read_only === 1 || lockedBySettlement,
            value: formData[field.fieldname] ?? field.default ?? "",
            onChange: (
                e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
            ) => handleChange(field.fieldname, e.target.value),
        };

        const renderInput = () => {
            switch (field.fieldtype) {
                case "Link":
                    let linkOpts = linkOptions[field.fieldname] || [];
                    if (
                        field.fieldname === "prjreg_title" &&
                        linkOpts.length === 0 &&
                        linkOptions.prjreg_refnum
                    ) {
                        linkOpts = linkOptions.prjreg_refnum;
                    }
                    if (field.fieldname === "principal_investigator") {
                        return (
                            <AutocompleteEmail
                                id={field.fieldname}
                                name={field.fieldname}
                                className={inputClasses}
                                value={
                                    formData[field.fieldname] ??
                                    field.default ??
                                    ""
                                }
                                onChange={(value) =>
                                    handleChange(field.fieldname, value)
                                }
                                options={linkOpts}
                                placeholder="Search principal investigator..."
                                readOnly={field.read_only === 1}
                                required={field.mandatory === 1}
                                disabled={field.read_only === 1}
                                searchByLabel
                                showAllOnFocus
                                displayOnlyLabel
                            />
                        );
                    }
                    return (
                        <select {...commonProps}>
                            <option value="">Select..</option>
                            {linkOpts.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    );
                case "Select":
                    if (
                        field.fieldname === "sanction_ref_no" &&
                        linkOptions.sanction_ref_no
                    ) {
                        return (
                            <select {...commonProps}>
                                <option value="">
                                    Select Sanction Reference...
                                </option>
                                {linkOptions.sanction_ref_no.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label} ({opt.value})
                                    </option>
                                ))}
                            </select>
                        );
                    }
                    const selectOpts =
                        field.options
                            ?.split("\n")
                            .filter((o) => o)
                            .map((o) => ({ value: o, label: o })) || [];
                    return (
                        <select {...commonProps}>
                            <option value="">Select...</option>
                            {selectOpts.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    );
                case "Currency":
                    return (
                        <input
                            type="number"
                            {...commonProps}
                            onWheel={(e) => e.currentTarget.blur()}
                        />
                    );
                case "Date":
                    return <input type="date" {...commonProps} />;
                case "Data":
                default:
                    return (
                        <input
                            type="text"
                            {...commonProps}
                            maxLength={field.fieldname === "bank_account" ? 30 : undefined}
                        />
                    );
            }
        };

        // Inline error for fund_received_amt
        const isFundReceivedAmtField =
            field.fieldname === "fund_received_amt";
        const isBankAccountField = field.fieldname === "bank_account";
        const bankAccountValue = String(formData["bank_account"] ?? "");

        return (
            <div key={field.fieldname} className="space-y-1.5">
                <label
                    htmlFor={field.fieldname}
                    className="inline-flex items-center rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2 py-1 text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200"
                >
                    {field.label}
                    {field.mandatory === 1 && (
                        <span className="text-red-500">*</span>
                    )}
                </label>
                {/* The amount is driven by the loan settlement, so the way to change it is
                    to revise the settlement — not to type over the figure. */}
                {isFundReceivedAmtField && settlementReq && settlementReq.total > 0 ? (
                    <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">{renderInput()}</div>
                        <button
                            type="button"
                            onClick={() => setEditingSettlement(true)}
                            className="shrink-0 h-[38px] px-3 rounded-lg text-[11px] font-bold uppercase tracking-wide text-[#D97757] bg-[#FFF7ED] dark:bg-[#D97757]/10 border border-[#D97757]/50 hover:bg-[#D97757]/15 transition-colors"
                            title="Reopen the loan settlement to change the amount"
                        >
                            Edit
                        </button>
                    </div>
                ) : (
                    renderInput()
                )}
                {/* Character limit indicator for bank_account */}
                {isBankAccountField && (
                    <div className="flex items-center justify-between mt-1">
                        {bankAccountValue.length >= 30 ? (
                            <p className="text-xs font-medium text-red-600">
                                Maximum 30 characters allowed.
                            </p>
                        ) : bankAccountValue.length >= 25 ? (
                            <p className="text-xs font-medium text-amber-600">
                                {30 - bankAccountValue.length} character{30 - bankAccountValue.length !== 1 ? "s" : ""} remaining.
                            </p>
                        ) : (
                            <span />
                        )}
                        <span className={`text-xs font-medium ${bankAccountValue.length >= 30 ? "text-red-600" : bankAccountValue.length >= 25 ? "text-amber-600" : "text-zinc-400"}`}>
                            {bankAccountValue.length}/30
                        </span>
                    </div>
                )}
                {isFundReceivedAmtField && lockedBySettlement && (
                    <p className="text-xs font-medium mt-1 text-[#D97757]">
                        Fixed at the total of the partial loan settlement(s) raised from this
                        receipt. Use <strong>Edit</strong> to change what is being settled.
                    </p>
                )}
                {isFundReceivedAmtField &&
                    !lockedBySettlement &&
                    settlementReq &&
                    settlementReq.total > 0 && (
                        <p className="text-xs font-medium mt-1 text-[#D97757]">
                            Must be at least {fmtINR(settlementReq.total)} to settle the selected
                            loan(s) in full.
                        </p>
                    )}
                {/* Real-time: transaction total and breakup total must both equal this. */}
                {isFundReceivedAmtField && transactionAmtError && (
                    <p className="text-xs font-medium mt-1 text-blue-600 dark:text-blue-400">
                        {transactionAmtError.type === "under"
                            ? `₹${transactionAmtError.remaining.toLocaleString("en-IN")} not yet accounted for in Transaction Details.`
                            : `Transaction Details exceed the received amount by ₹${transactionAmtError.remaining.toLocaleString("en-IN")} — reduce one of the transactions.`}
                    </p>
                )}
                {isFundReceivedAmtField && fundReceivedAmtError && (
                    <p className="text-xs font-medium mt-1 text-blue-600 dark:text-blue-400">
                        {fundReceivedAmtError.type === "under"
                            ? `₹${fundReceivedAmtError.remaining.toLocaleString("en-IN")} still unallocated — add it to the budget breakup below.`
                            : `Budget breakup exceeds the received amount by ₹${fundReceivedAmtError.remaining.toLocaleString("en-IN")} — reduce one of the entries.`}
                    </p>
                )}
                {isFundReceivedAmtField &&
                    !isNaN(fundReceivedAmt) &&
                    fundReceivedAmt > 0 &&
                    !fundReceivedAmtError &&
                    !transactionAmtError && (
                        <p className="text-xs font-medium text-green-600 mt-1">
                            ✓ Transaction Details and Budget Breakup both match the Fund
                            Received Amount.
                        </p>
                    )}
                {field.description && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                        {field.description}
                    </p>
                )}
            </div>
        );
    };

    const groupFieldsBySection = () => {
        const sections: { title: string; fields: Field[] }[] = [];
        let currentSection: { title: string; fields: Field[] } | null = null;

        fields.forEach((field) => {
            if (field.fieldtype === "Section Break") {
                if (currentSection) sections.push(currentSection);
                currentSection = {
                    title: field.label || "Section",
                    fields: [],
                };
            } else if (currentSection && !field.hidden) {
                currentSection.fields.push(field);
            }
        });
        if (currentSection) sections.push(currentSection);
        return sections;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg dark:bg-zinc-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b border-[#E4E4E7] dark:border-[#3F3F46] mx-auto"></div>
                    <p className="mt-3 text-sm font-semibold">
                        Loading form data...
                    </p>
                </div>
            </div>
        );
    }

    const sections = groupFieldsBySection();
    const projectTitle =
        result?.message?.related_project_data?.project_title || projectName;

    // Get selected sanction details based on sanction_ref_no
    // Note: This logic is also duplicated in handleSubmit for validation.
    // Keeping it here for UI display.
    const selectedSanction = formData.sanction_ref_no
        ? sanctionData?.message?.find(
            (s: any) => s.name === formData.sanction_ref_no,
        )
        : sanctionData?.message?.[0];

    // Derive allowed account heads from the selected sanction's budget breakup
    const sanctionedAccountHeads: string[] = [
        ...new Set<string>([
            ...(selectedSanction?.sanctioned_budget_breakup
                ? selectedSanction.sanctioned_budget_breakup
                    .map((row: any) => row.account_head)
                    .filter(Boolean)
                : []),
            // A loan can be drawn against a head this sanction doesn't budget for. The row
            // still has to be shown and submitted, so keep it selectable; the existing
            // head-wise sanction check is what flags the overrun.
            ...Object.keys(settlementHeadsByLabel),
        ]),
    ];

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans">

            {showLoanModal && (
                <LoanSettlementModal
                    loans={activeLoans}
                    projectName={projectNoFromUrl || projectName || ""}
                    isEditing={editingSettlement}
                    initialSelections={settlementSelections}
                    previousRefs={loanSettlementRefs}
                    onCancelEdit={() => setEditingSettlement(false)}
                    onSettle={(names, requirements, selections) => {
                        setLoanSettlementRefs(names);
                        setSettlementSelections(selections);
                        if (requirements) {
                            applySettlementRequirements(
                                requirements,
                                editingSettlement ? settlementReq : null,
                            );
                            setSettlementReq(requirements);
                        }
                        setEditingSettlement(false);
                        setLoanModalDismissed(true);
                    }}
                />
            )}

            <main className="flex-1 px-6 md:px-8 pt-7 pb-10">
                {settlementReq && settlementReq.total > 0 && (
                    <div className="mb-5 rounded-2xl border border-[#D97757]/40 bg-[#FFF7ED] dark:bg-[#D97757]/10 p-4">
                        <div className="flex items-start justify-between gap-3 mb-1">
                            <h3 className="text-sm font-bold text-[#9A3412] dark:text-[#F7B79B]">
                                Loan settlement raised from this receipt
                            </h3>
                            <button
                                type="button"
                                onClick={() => setEditingSettlement(true)}
                                className="shrink-0 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide text-[#9A3412] dark:text-[#F7B79B] bg-white/70 dark:bg-black/20 border border-[#D97757]/50 hover:bg-white transition-colors"
                            >
                                Edit
                            </button>
                        </div>
                        <p className="text-xs text-[#9A3412]/90 dark:text-[#F7B79B]/90 mb-3">
                            {settlementReq.exact
                                ? "The Fund Received Amount and the highlighted budget heads are fixed at what you chose to return, and cannot be edited here."
                                : "This receipt must carry at least the amounts below. Anything above them is ordinary project funding and is yours to allocate."}
                        </p>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs">
                                <thead>
                                    <tr className="text-left text-[10px] uppercase tracking-wider text-[#9A3412]/70 dark:text-[#F7B79B]/70">
                                        <th className="pr-4 pb-1 font-bold">Loan</th>
                                        <th className="pr-4 pb-1 font-bold">Type</th>
                                        <th className="pr-4 pb-1 font-bold">Head</th>
                                        <th className="pb-1 font-bold text-right">Return</th>
                                    </tr>
                                </thead>
                                <tbody className="text-[#7C2D12] dark:text-[#F7B79B]">
                                    {settlementReq.settlements.flatMap((s) =>
                                        s.budget_breakup.map((b, bi) => (
                                            <tr key={`${s.name}-${b.account_head}-${bi}`}>
                                                <td className="pr-4 py-0.5 font-mono">
                                                    {bi === 0 ? s.loan_reference : ""}
                                                </td>
                                                <td className="pr-4 py-0.5">
                                                    {bi === 0 ? s.settlement_type : ""}
                                                </td>
                                                <td className="pr-4 py-0.5">
                                                    {b.account_head_label || b.account_head}
                                                </td>
                                                <td className="py-0.5 text-right font-semibold whitespace-nowrap">
                                                    {fmtINR(b.return_amount)}
                                                </td>
                                            </tr>
                                        )),
                                    )}
                                    <tr className="border-t border-[#D97757]/30 font-bold">
                                        <td className="pr-4 pt-1" colSpan={3}>
                                            Total
                                        </td>
                                        <td className="pt-1 text-right whitespace-nowrap">
                                            {fmtINR(settlementReq.total)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <header className="mb-6 overflow-hidden bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl shadow-sm">
                    <div className="h-1.5 bg-[linear-gradient(to_right,#4A6CF7,#2563EB,#D97757)]" />
                    <div className="p-5 flex items-center gap-3">
                        <button type="button"
                            onClick={() => navigate(-1)}
                            className="h-10 w-10 flex items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl hover:text-[#D97757] transition-colors"
                        >
                            <ArrowLeftIcon className="h-4 w-4" />
                        </button>
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#D97757] mb-1">Fund Received</div>
                            <h1 className="text-[22px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] tracking-normal">
                                {editDocName
                                    ? "Edit Received Fund"
                                    : "Record Received Fund"}
                            </h1>
                            <p className="text-[13px] text-[#71717A] dark:text-[#A1A1AA] font-medium mt-1 break-words">
                                For Project:{" "}
                                {projectNoFromUrl && (
                                    <strong>{projectNoFromUrl}</strong>
                                )}
                                {projectNoFromUrl ? " - " : ""}
                                {projectTitle}
                            </p>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-5">
                    {/* Left: Main Form */}
                    <div className="lg:col-span-3">
                        <form onSubmit={handleSubmit}>
                            <FrappeCard className="space-y-8">
                                {sections.map((section, index) => (
                                    <NeoSection
                                        key={index}
                                        title={section.title}
                                    >
                                        {section.title ===
                                            "Transaction & Budget Breakups" ? (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                                                    {section.fields
                                                        .filter((f) =>
                                                            [
                                                                "gst_invoice_issued",
                                                                "invoice_no",
                                                            ].includes(
                                                                f.fieldname,
                                                            ),
                                                        )
                                                        .map((field) =>
                                                            field.fieldname ===
                                                                "invoice_no" ? (
                                                                <div
                                                                    key={
                                                                        field.fieldname
                                                                    }
                                                                    id="invoice_no_container"
                                                                    style={{
                                                                        display:
                                                                            "none",
                                                                    }}
                                                                >
                                                                    {renderFormField(
                                                                        field,
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                renderFormField(
                                                                    field,
                                                                )
                                                            ),
                                                        )}
                                                </div>
                                                <MemoizedTransactionsTable
                                                    tableData={
                                                        formData.fund_transactions
                                                    }
                                                    onRowChange={
                                                        handleTransactionRowChange
                                                    }
                                                    onFileChange={
                                                        handleTransactionFileChange
                                                    }
                                                    onAddRow={addTransactionRow}
                                                    onDeleteRow={
                                                        deleteTransactionRow
                                                    }
                                                    fundReceivedAmt={
                                                        fundReceivedAmt
                                                    }
                                                />
                                                <MemoizedBudgetBreakupTable
                                                    tableData={
                                                        formData.received_amt_breakup
                                                    }
                                                    onRowChange={
                                                        handleBudgetRowChange
                                                    }
                                                    onAddRow={addBudgetRow}
                                                    onDeleteRow={
                                                        deleteBudgetRow
                                                    }
                                                    budgetHeadOptions={
                                                        sanctionedAccountHeads
                                                    }
                                                    hasEmptyAccountHead={hasEmptyAccountHead}
                                                    usedAccountHeads={usedAccountHeads}
                                                    settlementHeads={settlementHeadsByLabel}
                                                    settlementLocked={settlementLocked}
                                                />
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                                                {section.fields.map(
                                                    renderFormField,
                                                )}
                                            </div>
                                        )}
                                    </NeoSection>
                                ))}
                            </FrappeCard>

                            <div className="mt-6 flex justify-end gap-3 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-2xl p-3 shadow-sm">
                                <FrappeButton
                                    type="button"
                                    onClick={() => navigate(-1)}
                                    className="bg-white dark:bg-[#27272A] hover:bg-[#FAFAF9]"
                                >
                                    Cancel
                                </FrappeButton>
                                <FrappeButton
                                    type="submit"
                                    disabled={isSubmitting || !isFundAmtBreakupValid || !isTransactionAmtValid || hasEmptyAccountHead}
                                    className="bg-[#D97757] text-white border-[#D97757] hover:bg-[#c5684a] disabled:bg-zinc-300"
                                >
                                    {isSubmitting
                                        ? "Submitting..."
                                        : "Submit Fund Received"}
                                </FrappeButton>
                            </div>
                        </form>
                    </div>

                    {/* Right: Sanction Details Panel */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-4 space-y-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
                            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm p-4">
                                <h3 className="inline-flex items-center gap-2 rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1E3A8A] dark:text-blue-200 mb-3">
                                    <span className="p-1 rounded-md bg-zinc-50 dark:bg-zinc-800">
                                        📋
                                    </span>
                                    Sanction Details
                                </h3>

                                {sanctionLoading ? (
                                    <div className="text-center py-6">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757] mx-auto"></div>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                                            Loading...
                                        </p>
                                    </div>
                                ) : selectedSanction ? (
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                                                Sanction Reference
                                            </p>
                                            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                                {selectedSanction.name}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                                                Sanction Letter No
                                            </p>
                                            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                                {selectedSanction.sanction_letter_no ||
                                                    "-"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                                                Sanction Date
                                            </p>
                                            <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
                                                {selectedSanction.sanction_date ||
                                                    "-"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                                                Total Amount
                                            </p>
                                            <p className="text-base font-bold text-[#D97757]">
                                                ₹{" "}
                                                {(
                                                    selectedSanction.total_sanctioned_amount ||
                                                    0
                                                ).toLocaleString("en-IN")}
                                            </p>
                                        </div>

                                        {selectedSanction
                                            .sanctioned_budget_breakup?.length >
                                            0 &&
                                            (() => {
                                                // Determine which years have data
                                                const yearKeys = [
                                                    {
                                                        key: "first_year_budget",
                                                        label: "Y1",
                                                    },
                                                    {
                                                        key: "second_year_budget",
                                                        label: "Y2",
                                                    },
                                                    {
                                                        key: "third_year_budget",
                                                        label: "Y3",
                                                    },
                                                    {
                                                        key: "fourth_year_budget",
                                                        label: "Y4",
                                                    },
                                                    {
                                                        key: "fifth_year_budget",
                                                        label: "Y5",
                                                    },
                                                ];
                                                const activeYears =
                                                    yearKeys.filter((year) =>
                                                        selectedSanction.sanctioned_budget_breakup.some(
                                                            (row: any) =>
                                                                (row[
                                                                    year.key
                                                                ] || 0) > 0,
                                                        ),
                                                    );

                                                return (
                                                    <div className="pt-3 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                                                            Budget Breakup
                                                            (Year-wise)
                                                        </p>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-xs">
                                                                <thead>
                                                                    <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                                                        <th className="text-left py-2 font-semibold text-zinc-600 dark:text-zinc-400">
                                                                            Head
                                                                        </th>
                                                                        {activeYears.map(
                                                                            (
                                                                                year,
                                                                            ) => (
                                                                                <th
                                                                                    key={
                                                                                        year.key
                                                                                    }
                                                                                    className="text-right py-2 font-semibold text-zinc-600 dark:text-zinc-400"
                                                                                >
                                                                                    {
                                                                                        year.label
                                                                                    }
                                                                                </th>
                                                                            ),
                                                                        )}
                                                                        <th className="text-right py-2 font-bold text-zinc-700 dark:text-zinc-300">
                                                                            Total
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {selectedSanction.sanctioned_budget_breakup.map(
                                                                        (
                                                                            row: any,
                                                                            i: number,
                                                                        ) => {
                                                                            const total =
                                                                                activeYears.reduce(
                                                                                    (
                                                                                        sum,
                                                                                        year,
                                                                                    ) =>
                                                                                        sum +
                                                                                        (row[
                                                                                            year
                                                                                                .key
                                                                                        ] ||
                                                                                            0),
                                                                                    0,
                                                                                );
                                                                            return (
                                                                                <tr
                                                                                    key={
                                                                                        i
                                                                                    }
                                                                                    className="border-b border-zinc-100 dark:border-zinc-800"
                                                                                >
                                                                                    <td
                                                                                        className="py-1.5 text-zinc-700 dark:text-zinc-300 truncate max-w-[80px]"
                                                                                        title={
                                                                                            row.account_head
                                                                                        }
                                                                                    >
                                                                                        {
                                                                                            row.account_head
                                                                                        }
                                                                                    </td>
                                                                                    {activeYears.map(
                                                                                        (
                                                                                            year,
                                                                                        ) => {
                                                                                            const val =
                                                                                                row[
                                                                                                year
                                                                                                    .key
                                                                                                ] ||
                                                                                                0;
                                                                                            return (
                                                                                                <td
                                                                                                    key={
                                                                                                        year.key
                                                                                                    }
                                                                                                    className="py-1.5 text-right text-zinc-600 dark:text-zinc-400"
                                                                                                >
                                                                                                    {val >
                                                                                                        0
                                                                                                        ? (
                                                                                                            val /
                                                                                                            1000
                                                                                                        ).toFixed(
                                                                                                            0,
                                                                                                        ) +
                                                                                                        "k"
                                                                                                        : "-"}
                                                                                                </td>
                                                                                            );
                                                                                        },
                                                                                    )}
                                                                                    <td className="py-1.5 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                                                                                        {(
                                                                                            total /
                                                                                            1000
                                                                                        ).toFixed(
                                                                                            0,
                                                                                        )}
                                                                                        k
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        },
                                                                    )}
                                                                </tbody>
                                                                <tfoot className="bg-zinc-50 dark:bg-zinc-800/50">
                                                                    <tr>
                                                                        <td className="py-1.5 font-bold text-zinc-800 dark:text-zinc-200">
                                                                            Total
                                                                        </td>
                                                                        {activeYears.map(
                                                                            (
                                                                                year,
                                                                            ) => {
                                                                                const yearTotal =
                                                                                    selectedSanction.sanctioned_budget_breakup.reduce(
                                                                                        (
                                                                                            sum: number,
                                                                                            row: any,
                                                                                        ) =>
                                                                                            sum +
                                                                                            (row[
                                                                                                year
                                                                                                    .key
                                                                                            ] ||
                                                                                                0),
                                                                                        0,
                                                                                    );
                                                                                return (
                                                                                    <td
                                                                                        key={
                                                                                            year.key
                                                                                        }
                                                                                        className="py-1.5 text-right font-semibold text-zinc-700 dark:text-zinc-300"
                                                                                    >
                                                                                        {yearTotal >
                                                                                            0
                                                                                            ? (
                                                                                                yearTotal /
                                                                                                1000
                                                                                            ).toFixed(
                                                                                                0,
                                                                                            ) +
                                                                                            "k"
                                                                                            : "-"}
                                                                                    </td>
                                                                                );
                                                                            },
                                                                        )}
                                                                        <td className="py-1.5 text-right font-bold text-[#D97757]">
                                                                            {(
                                                                                selectedSanction.sanctioned_budget_breakup.reduce(
                                                                                    (
                                                                                        sum: number,
                                                                                        row: any,
                                                                                    ) =>
                                                                                        activeYears.reduce(
                                                                                            (
                                                                                                s,
                                                                                                y,
                                                                                            ) =>
                                                                                                s +
                                                                                                (row[
                                                                                                    y
                                                                                                        .key
                                                                                                ] ||
                                                                                                    0),
                                                                                            sum,
                                                                                        ),
                                                                                    0,
                                                                                ) /
                                                                                1000
                                                                            ).toFixed(
                                                                                0,
                                                                            )}
                                                                            k
                                                                        </td>
                                                                    </tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                    </div>
                                ) : (
                                    <div className="text-center py-6">
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                            No sanction details found.
                                        </p>
                                        <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
                                            Please add a sanction first.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Validation Summary Panel */}
                            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm p-4">
                                <h3 className="inline-flex items-center gap-2 rounded-md border border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20 px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#1E3A8A] dark:text-blue-200 mb-3">
                                    <span className="p-1 rounded-md bg-blue-100">
                                        ✓
                                    </span>
                                    Real-time Validation
                                </h3>

                                {/* Fund Received Amt vs Transaction Total */}
                                {!isNaN(fundReceivedAmt) &&
                                    fundReceivedAmt > 0 && (
                                        <div className="space-y-2 mb-4 pb-4 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                                                Fund Received Amount vs Transactions
                                            </p>
                                            <ProgressBar
                                                current={totalTransactionAmt}
                                                total={fundReceivedAmt}
                                                label="Transactions vs Received"
                                                showWarning={true}
                                            />
                                            <div className="grid grid-cols-2 gap-2 text-[11px] mt-1">
                                                <div className="bg-[#FAFAF9] dark:bg-[#18181B] p-2 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]">
                                                    <p className="text-zinc-500 dark:text-zinc-400">
                                                        Fund Received Amt
                                                    </p>
                                                    <p className="font-bold text-xs text-zinc-800 dark:text-zinc-200">
                                                        ₹
                                                        {fundReceivedAmt.toLocaleString(
                                                            "en-IN",
                                                        )}
                                                    </p>
                                                </div>
                                                <div className="bg-[#FAFAF9] dark:bg-[#18181B] p-2 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]">
                                                    <p className="text-zinc-500 dark:text-zinc-400">
                                                        Transaction Total
                                                    </p>
                                                    <p
                                                        className={`text-xs font-bold ${totalTransactionAmt >
                                                            fundReceivedAmt
                                                            ? "text-red-600"
                                                            : totalTransactionAmt ===
                                                                fundReceivedAmt
                                                                ? "text-green-600"
                                                                : "text-blue-600"
                                                            }`}
                                                    >
                                                        ₹
                                                        {totalTransactionAmt.toLocaleString(
                                                            "en-IN",
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            {transactionAmtError ? (
                                                <p className="text-[11px] font-medium mt-1 text-blue-600 dark:text-blue-400">
                                                    {transactionAmtError.type === "under"
                                                        ? `₹${transactionAmtError.remaining.toLocaleString("en-IN")} still unaccounted`
                                                        : `Exceeds by ₹${transactionAmtError.remaining.toLocaleString("en-IN")}`}
                                                </p>
                                            ) : (
                                                <p className="text-[11px] font-semibold text-green-600 mt-1">
                                                    ✓ Transaction total matches Fund Received Amount
                                                </p>
                                            )}
                                        </div>
                                    )}

                                {/* Fund Received Amt vs Breakup Total */}
                                {!isNaN(fundReceivedAmt) &&
                                    fundReceivedAmt > 0 && (
                                        <div className="space-y-2 mb-4 pb-4 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                                                Fund Received Amount
                                            </p>
                                            <ProgressBar
                                                current={totalBreakupAmt}
                                                total={fundReceivedAmt}
                                                label="Breakup vs Received"
                                                showWarning={true}
                                            />
                                            {/* All three totals side by side — the quickest
                                                way to see which one is out of step. */}
                                            <div className="space-y-1 text-[11px] mt-1">
                                                {[
                                                    {
                                                        label: "Fund Received Amt",
                                                        value: fundReceivedAmt,
                                                        err: null as typeof fundReceivedAmtError,
                                                    },
                                                    {
                                                        label: "Transaction Details",
                                                        value: totalTransactionAmt,
                                                        err: transactionAmtError,
                                                    },
                                                    {
                                                        label: "Budget Breakup",
                                                        value: totalBreakupAmt,
                                                        err: fundReceivedAmtError,
                                                    },
                                                ].map((r, ri) => (
                                                    <div
                                                        key={r.label}
                                                        className="flex items-center justify-between gap-2 bg-[#FAFAF9] dark:bg-[#18181B] px-2 py-1.5 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]"
                                                    >
                                                        <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                                                            {ri > 0 && (
                                                                <span
                                                                    className={
                                                                        r.err
                                                                            ? "text-blue-600 dark:text-blue-400"
                                                                            : "text-green-600"
                                                                    }
                                                                >
                                                                    {r.err ? "✗" : "✓"}
                                                                </span>
                                                            )}
                                                            {r.label}
                                                        </span>
                                                        <span
                                                            className={`text-xs font-bold ${ri === 0
                                                                ? "text-zinc-800 dark:text-zinc-200"
                                                                : r.err
                                                                    ? r.err.type === "over"
                                                                        ? "text-red-600"
                                                                        : "text-blue-600"
                                                                    : "text-green-600"
                                                                }`}
                                                        >
                                                            ₹{r.value.toLocaleString("en-IN")}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            {transactionAmtError && (
                                                <p className="text-[11px] font-medium mt-1 text-blue-600 dark:text-blue-400">
                                                    Transactions:{" "}
                                                    {transactionAmtError.type === "under"
                                                        ? `₹${transactionAmtError.remaining.toLocaleString("en-IN")} not yet entered`
                                                        : `exceeds by ₹${transactionAmtError.remaining.toLocaleString("en-IN")}`}
                                                </p>
                                            )}
                                            {fundReceivedAmtError && (
                                                <p className="text-[11px] font-medium mt-1 text-blue-600 dark:text-blue-400">
                                                    Breakup:{" "}
                                                    {fundReceivedAmtError.type === "under"
                                                        ? `₹${fundReceivedAmtError.remaining.toLocaleString("en-IN")} still unallocated`
                                                        : `exceeds by ₹${fundReceivedAmtError.remaining.toLocaleString("en-IN")}`}
                                                </p>
                                            )}
                                            {!transactionAmtError && !fundReceivedAmtError && (
                                                <p className="text-[11px] font-semibold text-green-600 mt-1">
                                                    ✓ All three totals match
                                                </p>
                                            )}
                                        </div>
                                    )}

                                {/* Total Budget Validation */}
                                <div className="space-y-3 mb-4">
                                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                                        Total Budget Status
                                    </p>
                                    <ProgressBar
                                        current={
                                            validationState.totalValidation
                                                .previousTotal +
                                            validationState.totalValidation
                                                .currentTotal
                                        }
                                        total={
                                            validationState.totalValidation
                                                .sanctionedTotal
                                        }
                                        label="Total Funds"
                                        showWarning={true}
                                    />
                                    <ValidationAlert
                                        isValid={
                                            validationState.totalValidation
                                                .isValid
                                        }
                                        message={
                                            validationState.totalValidation
                                                .message
                                        }
                                    />
                                    <div className="grid grid-cols-2 gap-2 text-[11px] mt-2">
                                        <div className="bg-[#FAFAF9] dark:bg-[#18181B] p-2 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]">
                                            <p className="text-zinc-500 dark:text-zinc-400">
                                                Previously Received
                                            </p>
                                            <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                                                ₹
                                                {validationState.totalValidation.previousTotal.toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="bg-[#FAFAF9] dark:bg-[#18181B] p-2 rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46]">
                                            <p className="text-zinc-500 dark:text-zinc-400">
                                                Current Entry
                                            </p>
                                            <p className="text-xs font-bold text-blue-600">
                                                ₹
                                                {validationState.totalValidation.currentTotal.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Budget Head-wise Validation */}
                                {Object.keys(validationState.headValidations)
                                    .length > 0 && (
                                        <div className="pt-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase mb-3">
                                                Budget Head Status
                                            </p>
                                            <div className="space-y-2.5 max-h-80 overflow-y-auto">
                                                {Object.entries(
                                                    validationState.headValidations,
                                                ).map(([head, validation]) => (
                                                    <div
                                                        key={head}
                                                        className="space-y-2 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-md"
                                                    >
                                                        <p className="font-semibold text-xs text-zinc-800 dark:text-zinc-200">
                                                            {head}
                                                        </p>
                                                        <ProgressBar
                                                            current={
                                                                validation.previousTotal +
                                                                validation.currentTotal
                                                            }
                                                            total={
                                                                validation.sanctionedLimit
                                                            }
                                                            label=""
                                                            showWarning={false}
                                                        />
                                                        <div className="flex justify-between text-[11px]">
                                                            <span
                                                                className={
                                                                    validation.isValid
                                                                        ? "text-green-600"
                                                                        : "text-red-600"
                                                                }
                                                            >
                                                                {validation.message}
                                                            </span>
                                                            <span className="text-zinc-600 dark:text-zinc-400">
                                                                Prev: ₹
                                                                {validation.previousTotal.toLocaleString()}{" "}
                                                                | Curr: ₹
                                                                {validation.currentTotal.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                {/* Overall Status Badge */}
                                <div className="mt-4 pt-4 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                                    {validationState.totalValidation.isValid &&
                                        isFundAmtBreakupValid &&
                                        isTransactionAmtValid &&
                                        Object.values(
                                            validationState.headValidations,
                                        ).every((v) => v.isValid) ? (
                                        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 rounded-md p-2.5 text-center">
                                            <p className="text-green-800 dark:text-green-300 text-sm font-semibold">
                                                ✓ Ready to Submit
                                            </p>
                                            <p className="text-[11px] text-green-600 dark:text-green-400 mt-1">
                                                All validations passed
                                            </p>
                                        </div>
                                    ) : isNaN(fundReceivedAmt) || fundReceivedAmt === 0 ? (
                                        <div className="bg-zinc-50 border border-zinc-200 dark:bg-zinc-800/30 dark:border-zinc-700 rounded-md p-2.5 text-center">
                                            <p className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                                                Fill in the fund details above to validate
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-md p-2.5 text-center">
                                            <p className="text-blue-800 dark:text-blue-300 text-sm font-semibold">
                                                ℹ Cannot Submit
                                            </p>
                                            <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                                                {!isTransactionAmtValid
                                                    ? "Transaction total must equal the Fund Received Amount"
                                                    : !isFundAmtBreakupValid
                                                    ? "Budget breakup total must equal the Fund Received Amount"
                                                    : !validationState.totalValidation.isValid
                                                        ? "Total funds exceed sanctioned amount"
                                                        : Object.values(validationState.headValidations).some((v) => !v.isValid)
                                                            ? "Some budget heads exceed their sanctioned limits"
                                                            : "Please fix validation errors above"
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Floating Help Button */}
            <HelpFloating />

            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() =>
                    setErrorModal((prev) => ({ ...prev, open: false }))
                }
            />
        </div>
    );
};

export default AddFundReceived;
