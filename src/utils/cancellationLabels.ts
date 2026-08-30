/**
 * "Pending Head Approval" -> "Head".
 *
 * Cancellation workflows mirror whichever source workflow the document uses, so
 * the set of states is open-ended — strip the boilerplate rather than keeping a
 * fixed map. Returns null for states that name no approver (Draft, and the
 * terminal states).
 */
export const awaitingLabel = (state?: string | null): string | null => {
    const s = (state || "").trim();
    if (!s || /^draft$/i.test(s)) return null;
    const who = s.replace(/^pending\s+/i, "").replace(/\s+approval$/i, "").trim();
    if (!who || /^(approved|rejected|cancelled)$/i.test(who)) return null;
    return who;
};
