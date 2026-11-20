import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import { fetchOverheadLedger, isOverheadProjectNo } from "@/services/overheadLedger";

interface LedgerRow {
    frapAppId?: string | null;
    refDetails?: string | null;
    transactionType?: string | null;
    paymentAmount?: number | null;
}

/**
 * Whether a Travel application actually asked for an advance.
 *
 * "Do you need Advance?" (`do_you_need_advance`) is only asked when "Do you require financial
 * assistance?" (`travel_financial_assistance`) is Yes, so both must be Yes. Financial assistance
 * alone does not mean an advance: such a travel may be settled without any advance payment.
 */
export const travelRequestedAdvance = (doc: {
    travel_financial_assistance?: string | null;
    do_you_need_advance?: string | null;
}): boolean =>
    String(doc?.travel_financial_assistance ?? "").trim().toLowerCase() === "yes" &&
    String(doc?.do_you_need_advance ?? "").trim().toLowerCase() === "yes";

/**
 * Whether a Travel's advance has been paid out, read from its project's ledger.
 *
 * A travel that asked for an advance may only be settled once that advance is paid — the
 * same rule TravelDetails applies to its "Settle Travel" button (a ledger row for this
 * travel that is not a commit and carries a payment). Shared so the Other PI registry and
 * the PI's project page enforce it too, instead of offering Settle on an unpaid advance.
 *
 * Fails closed: any lookup error reads as "not paid", which hides Settle rather than
 * offering it wrongly.
 */
export const isTravelAdvancePaid = async (
    travelName: string,
    projectNo: string,
): Promise<boolean> => {
    if (!travelName || !projectNo) return false;

    const isPaymentForTravel = (row: LedgerRow) =>
        (row?.frapAppId === travelName || row?.refDetails === travelName) &&
        row?.transactionType !== "COMMIT" &&
        row?.transactionType !== "Commitment" &&
        (Number(row?.paymentAmount) || 0) > 0;

    try {
        // An overhead fund's log must not travel over /ledger-api (unauthenticated proxy —
        // see services/overheadLedger); it is read through the whitelisted Frappe method.
        if (isOverheadProjectNo(projectNo)) {
            const rows = await fetchOverheadLedger(projectNo);
            return rows.some(isPaymentForTravel);
        }

        const headRes = await fetch(
            `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_heads_by_project?project_no=${encodeURIComponent(projectNo)}`,
            { credentials: "include", headers: { Accept: "application/json" } },
        );
        const headJson = await headRes.json();
        const headIds = ((headJson?.message || []) as { id: number | null }[])
            .map((h) => h.id)
            .filter((id): id is number => id != null);

        const perHead = await Promise.all(
            headIds.map((id) =>
                fetch(
                    `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(projectNo)}&accountHeadId=${id}`,
                    { credentials: "include" },
                )
                    .then((res) => res.json())
                    .then((data) => (Array.isArray(data) ? data : []))
                    .catch(() => []),
            ),
        );
        return perHead.some((rows) => rows.some(isPaymentForTravel));
    } catch {
        return false;
    }
};
