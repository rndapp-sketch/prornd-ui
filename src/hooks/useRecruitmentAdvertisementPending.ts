import { useFrappeGetCall } from "frappe-react-sdk";
import { recruitmentAdvertismentAPI } from "@/services/apiService";

export interface RecruitmentPendingCounts {
    research: number;
    consultancy: number;
    others: number;
    total: number;
}

const NONE: RecruitmentPendingCounts = { research: 0, consultancy: 0, others: 0, total: 0 };

/**
 * How many approved recruitments are still "Not yet published", by project type, read from the summary of
 * list_approved_recruitments (a single small request: one row). Pass enabled = false (anyone but staff, RnD)
 * and nothing is fetched.
 */
export function useRecruitmentAdvertisementPending(enabled: boolean): RecruitmentPendingCounts {
    const { data } = useFrappeGetCall<{ message: { summary?: { total_pending: number; research: number; consultancy: number; others: number } } }>(
        recruitmentAdvertismentAPI.listApproved,
        { page: 1, page_length: 1 },
        enabled ? undefined : null,
    );
    const s = data?.message?.summary;
    if (!enabled || !s) return NONE;
    return { research: s.research ?? 0, consultancy: s.consultancy ?? 0, others: s.others ?? 0, total: s.total_pending ?? 0 };
}
