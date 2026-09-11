import React from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { leaveModuleAPI } from "@/services/apiService";

interface BalancePayload {
    el: number;
    cl: number;
    emp_id?: string;
    username?: string;
    leave_type?: string;
    days_applied?: number;
    balance_before?: number;
    balance_after?: number;
}

/**
 * The applicant's leave position, shown to every approver in the chain.
 *
 * The deduction happens when the applicant submits, so the stored figure is
 * already the post-application balance. Showing before / applied / after makes
 * the effect of this particular request explicit rather than leaving an
 * approver to work it out.
 */
export const ApplicantLeaveBalance: React.FC<{ docname?: string }> = ({ docname }) => {
    const { data } = useFrappeGetCall<{ message: BalancePayload | null }>(
        leaveModuleAPI.getApplicantBalance,
        { docname },
        docname ? undefined : null,
    );

    const b = data?.message;
    if (!b) return null;

    const type = b.leave_type === "EL" ? "Earned Leave" : "Casual Leave";
    const applied = b.days_applied ?? 0;
    const before = b.balance_before ?? 0;
    const after = b.balance_after ?? 0;

    const Stat = ({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "used" }) => (
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {label}
            </p>
            <p
                className={
                    "text-xl font-bold tabular-nums " +
                    (tone === "used"
                        ? "text-[#D97757]"
                        : "text-zinc-800 dark:text-zinc-100")
                }
            >
                {value}
            </p>
        </div>
    );

    return (
        <div className="rounded-xl border border-[#C7D2FE] bg-[#EEF2FF] p-4 dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/10">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#1E3A8A] dark:text-[#C7D2FE]">
                    Applicant&rsquo;s leave balance
                </p>
                {b.emp_id && (
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {b.username ? `${b.username} · ` : ""}
                        {b.emp_id}
                    </span>
                )}
            </div>

            {applied > 0 ? (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                    <Stat label={`${type} before`} value={before} />
                    <Stat label="Applied for" value={`− ${applied}`} tone="used" />
                    <Stat label={`${type} after`} value={after} />
                </div>
            ) : (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                    <Stat label="Casual Leave" value={b.cl ?? 0} />
                    <Stat label="Earned Leave" value={b.el ?? 0} />
                </div>
            )}

            {applied > 0 && (
                <p className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Deducted when the application was submitted — the balance after already
                    reflects this request.
                </p>
            )}
        </div>
    );
};
