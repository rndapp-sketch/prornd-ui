import { AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { awaitingLabel } from "@/utils/cancellationLabels";

export interface CancellationRequestInfo {
    name?: string;
    status?: string;
    workflow_state?: string;
    requested_by?: string;
    request_date?: string;
    creation?: string;
    cancellation_reason?: string;
}

const formatWhen = (value?: string): string | null => {
    if (!value) return null;
    const d = new Date(value.replace(" ", "T"));
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

interface Props {
    requests?: CancellationRequestInfo[];
    /** Frappe user id of the person viewing the page. */
    currentUser?: string | null;
}

/**
 * Tells the requester where their cancellation request currently sits, instead
 * of only that one exists. Renders nothing when there is no request to show.
 */
export function CancellationStatusBanner({ requests, currentUser }: Props) {
    const list = requests || [];
    const req =
        list.find((r) => (r.status || "").toLowerCase() === "pending") || list[0];
    if (!req) return null;

    const status = (req.status || "Pending").trim();
    const isApproved = /approved/i.test(status);
    const isRejected = /rejected|declined/i.test(status);
    const pendingWith = awaitingLabel(req.workflow_state);
    const raisedOn = formatWhen(req.request_date || req.creation);
    const mine =
        !!currentUser &&
        (req.requested_by || "").toLowerCase() === currentUser.toLowerCase();

    const tone = isApproved
        ? "border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300"
        : isRejected
          ? "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/40 text-zinc-700 dark:text-zinc-300"
          : "border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300";

    const Icon = isApproved ? CheckCircle2 : isRejected ? XCircle : AlertTriangle;

    return (
        <div className={`mb-6 p-4 rounded-xl border ${tone} flex items-start gap-3 shadow-sm`}>
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm min-w-0">
                <div className="font-medium">
                    {mine
                        ? isApproved
                            ? "Your cancellation request was approved."
                            : isRejected
                              ? "Your cancellation request was rejected."
                              : "Your cancellation request is in progress."
                        : isApproved
                          ? "The cancellation request for this application was approved."
                          : isRejected
                            ? "The cancellation request for this application was rejected."
                            : "This application has a pending cancellation request. No further workflow actions can be performed on it."}
                </div>

                {!isApproved && !isRejected && pendingWith && (
                    <div className="mt-1.5 flex items-center gap-1.5 font-semibold">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Currently awaiting: {pendingWith}</span>
                    </div>
                )}

                <div className="mt-1 text-xs opacity-80 break-words">
                    {req.name ? <span>Request {req.name}</span> : null}
                    {req.name && (raisedOn || req.requested_by) ? " · " : null}
                    {!mine && req.requested_by ? <span>raised by {req.requested_by}</span> : null}
                    {!mine && req.requested_by && raisedOn ? " · " : null}
                    {raisedOn ? <span>raised on {raisedOn}</span> : null}
                    {req.workflow_state ? <span> · status: {req.workflow_state}</span> : null}
                </div>

                {req.cancellation_reason ? (
                    <div className="mt-1 text-xs opacity-80 break-words">
                        Reason: {req.cancellation_reason}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
