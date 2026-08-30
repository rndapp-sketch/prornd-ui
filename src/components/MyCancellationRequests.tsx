import React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { Ban, CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
import { awaitingLabel } from "@/utils/cancellationLabels";

interface CancellationRequestRow {
    name: string;
    reference_doctype: string;
    reference_name: string;
    cancellation_reason?: string;
    status?: string;
    workflow_state?: string;
    request_date?: string;
    creation?: string;
    modified?: string;
    reference_state?: string | null;
}

interface Response {
    message: {
        success: boolean;
        count: number;
        requests: CancellationRequestRow[];
    };
}

const formatDate = (value?: string) => {
    if (!value) return "—";
    const d = new Date(String(value).replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
};

const outcomeOf = (row: CancellationRequestRow) => {
    const status = (row.status || "").toLowerCase();
    if (status === "approved") return "approved" as const;
    if (status === "rejected" || /reject/i.test(row.workflow_state || "")) return "rejected" as const;
    return "pending" as const;
};

export const MyCancellationRequests: React.FC = () => {
    const navigate = useNavigate();
    const { data, isLoading } = useFrappeGetCall<Response>(
        "rndopsapp.rndopsapp.cancellation_api.get_my_cancellation_requests",
        {},
    );

    const rows = data?.message?.requests || [];

    if (isLoading) {
        return (
            <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-16 text-center text-[13px] text-[#71717A] dark:text-[#A1A1AA]">
                Loading cancellation requests…
            </div>
        );
    }

    if (!rows.length) {
        return (
            <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-16 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EEF2FF] dark:bg-[#4A6CF7]/15">
                    <Ban className="h-7 w-7 text-[#4A6CF7] dark:text-[#93C5FD]" />
                </div>
                <p className="text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                    No cancellation requests
                </p>
                <p className="mt-1 text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                    Applications you ask to cancel will appear here with their approval progress.
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                            {["Outcome", "Module", "Document", "Reason", "Requested", "Progress"].map((h) => (
                                <th
                                    key={h}
                                    className="p-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-[#71717A] dark:text-[#A1A1AA]"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const outcome = outcomeOf(row);
                            const awaiting = awaitingLabel(row.workflow_state);
                            return (
                                <tr
                                    key={row.name}
                                    onClick={() =>
                                        navigate(
                                            `/pending-tasks/${encodeURIComponent("Cancellation Request")}/${row.name}`,
                                        )
                                    }
                                    className="cursor-pointer border-b border-[#F4F4F5] dark:border-[#3F3F46]/60 last:border-0 hover:bg-[#FAFAF9] dark:hover:bg-[#18181B]/60 transition-colors"
                                >
                                    <td className="p-3 align-middle">
                                        {outcome === "approved" ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-400">
                                                <CheckCircle2 className="h-3 w-3" /> Cancelled
                                            </span>
                                        ) : outcome === "rejected" ? (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                                <XCircle className="h-3 w-3" /> Rejected
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:border-amber-800/40 dark:bg-amber-950/30 dark:text-amber-400">
                                                <Clock className="h-3 w-3" /> Awaiting approval
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3 align-middle text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                                        <span className="inline-flex items-center gap-1.5">
                                            <FileText className="h-3 w-3 text-zinc-400" />
                                            {row.reference_doctype}
                                        </span>
                                    </td>
                                    <td className="p-3 align-middle">
                                        <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                            {row.reference_name}
                                        </div>
                                        <div className="text-[10px] text-[#A1A1AA]">
                                            {row.name}
                                            {row.reference_state ? ` · form is ${row.reference_state}` : ""}
                                        </div>
                                    </td>
                                    <td className="p-3 align-middle max-w-[260px]">
                                        <span className="block truncate text-[12px] text-[#71717A] dark:text-[#A1A1AA]" title={row.cancellation_reason || ""}>
                                            {row.cancellation_reason || "—"}
                                        </span>
                                    </td>
                                    <td className="p-3 align-middle whitespace-nowrap text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                        {formatDate(row.request_date || row.creation)}
                                    </td>
                                    <td className="p-3 align-middle text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                        {outcome === "pending" && awaiting ? (
                                            <>
                                                <span className="font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                    With {awaiting}
                                                </span>
                                                <div className="text-[10px]">needs their approval</div>
                                            </>
                                        ) : (
                                            <span>{row.workflow_state || "—"}</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
