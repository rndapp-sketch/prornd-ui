import { useMemo } from "react";
import useSWR from "swr";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";

// ── Detailed ledger data ─────────────────────────────────────────────────────

export interface LedgerTx {
    project_no: string;
    project_title: string;
    head: string;
    transactionId?: number;
    date: string;
    /** FUND_RECEIVED / COMMIT / PAYMENT … as returned by the ledger */
    type: string;
    particulars: string;
    ref: string;
    bmr: string;
    bankTransactionNumber: string;
    frapAppId: string;
    status: string;
    received: number;
    committed: number;
    payment: number;
    commitableBalance: number;
    paymentBalance: number;
}

export interface ProjectLedger {
    /** Project Registration document name (used in project URLs) */
    name: string;
    project_no: string;
    project_title: string;
    workflow_state?: string;
    received: number;
    committed: number;
    paid: number;
    commitable: number;
    actualBalance: number;
    utilization: number;
    heads: string[];
    rows: LedgerTx[];
    /** The ledger could not be read for this project */
    failed?: boolean;
}

// Overhead funds (PDF / DPF) are served by a whitelisted method and must never go through the open
// /ledger-api proxy (see useProjectBudget), so they are left out of this roll-up.
const isOverhead = (code: string) => /^(PDF|DPF)/.test(code);

const getJson = async (url: string) => {
    const res = await fetch(url, { credentials: "include", headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
};

async function loadProject(p: { name: string; project_no: string; project_title: string; workflow_state?: string }): Promise<ProjectLedger> {
    const headJson = await getJson(
        `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.doctype.budget_head.budget_head.get_budget_heads_by_project?project_no=${encodeURIComponent(p.project_no)}`,
    );
    const heads: { id: number | null; budget_head: string }[] = (headJson?.message || []).filter((h: any) => h.id != null);

    const perHead = await Promise.all(
        heads.map(async (h) => ({
            head: h.budget_head,
            rows: await getJson(
                `/ledger-api/commit-payment-transactions?projectNumber=${encodeURIComponent(p.project_no)}&accountHeadId=${h.id}`,
            ),
        })),
    );

    const rows: LedgerTx[] = [];
    let received = 0, committed = 0, paid = 0;
    perHead.forEach(({ head, rows: list }) => {
        (Array.isArray(list) ? list : []).forEach((r: any) => {
            const cancelled = r.status === "CANCELLED";
            received += r.fundReceivedAmount || 0;
            if (!cancelled) {
                committed += r.commitAmount || 0;
                paid += r.paymentAmount || 0;
            }
            rows.push({
                project_no: p.project_no,
                project_title: p.project_title,
                head,
                transactionId: r.transactionId,
                date: r.transactionDate || "",
                type: r.transactionType || "",
                particulars: r.particulars || "",
                ref: r.refDetails || "",
                bmr: r.bmr || "",
                bankTransactionNumber: r.bankTransactionNumber || "",
                frapAppId: r.frapAppId || "",
                status: r.status || "",
                received: r.fundReceivedAmount || 0,
                committed: r.commitAmount || 0,
                payment: r.paymentAmount || 0,
                commitableBalance: r.commitableBalance ?? 0,
                paymentBalance: r.paymentBalance ?? 0,
            });
        });
    });

    return {
        name: p.name,
        project_no: p.project_no,
        project_title: p.project_title,
        workflow_state: p.workflow_state,
        received,
        committed,
        paid,
        commitable: received - committed,
        actualBalance: received - paid,
        utilization: received > 0 ? Math.round((committed / received) * 100) : 0,
        heads: heads.map((h) => h.budget_head),
        rows,
    };
}

/**
 * The PI's own funded projects (project number set) with their full ledger records, read from the ledger
 * for every budget head. Cached for a few minutes since it fans out to one request per project head; the
 * home page summary and the financial dashboard share this one fetch.
 */
export function usePiLedgerData(user?: string | null) {
    const { data: projects, error: projectsError, isLoading: projectsLoading } = useFrappeGetDocList<{
        name: string;
        project_no?: string;
        project_title?: string;
        workflow_state?: string;
    }>(
        "Project Registration",
        {
            fields: ["name", "project_no", "project_title", "workflow_state"],
            filters: [["pi_webmail", "=", user ?? ""], ["project_no", "!=", ""]],
            limit: 200,
        },
        user ? undefined : null,
        { revalidateOnFocus: false },
    );

    const targets = useMemo(() => {
        const seen = new Set<string>();
        const out: { name: string; project_no: string; project_title: string; workflow_state?: string }[] = [];
        (projects ?? []).forEach((p) => {
            const code = (p.project_no || "").trim();
            if (!code || isOverhead(code) || seen.has(code)) return;
            seen.add(code);
            out.push({ name: p.name, project_no: code, project_title: p.project_title || code, workflow_state: p.workflow_state });
        });
        return out;
    }, [projects]);

    const { data, error, isLoading, mutate } = useSWR<ProjectLedger[]>(
        projects && user ? ["pi-ledger", user, targets.map((t) => t.project_no).join("|")] : null,
        async () => {
            const settled = await Promise.allSettled(targets.map(loadProject));
            const ledgers = settled.map((s, i): ProjectLedger =>
                s.status === "fulfilled"
                    ? s.value
                    : {
                          ...targets[i],
                          received: 0, committed: 0, paid: 0, commitable: 0, actualBalance: 0, utilization: 0,
                          heads: [], rows: [], failed: true,
                      },
            );
            if (targets.length > 0 && ledgers.every((l) => l.failed)) throw new Error("Could not read the ledger for any project");
            return ledgers;
        },
        { revalidateOnFocus: false, dedupingInterval: 5 * 60 * 1000, shouldRetryOnError: false },
    );

    return {
        projects: data,
        isLoading: !!user && (projectsLoading || (!!projects && !data && !error && isLoading)),
        error: !!projectsError || !!error,
        refresh: () => mutate(),
    };
}

// ── Overall summary (home page) ──────────────────────────────────────────────

export interface PiLedgerSummary {
    received: number;
    committed: number;
    paid: number;
    /** received − committed: what can still be committed */
    commitable: number;
    /** received − paid: the actual balance */
    actualBalance: number;
    /** committed − paid */
    awaitingPayment: number;
    utilization: number;
    projectsWithFunds: number;
    projectsTotal: number;
    /** Some projects could not be read, so totals may be understated */
    partial: boolean;
}

export function summarize(projects: ProjectLedger[]): PiLedgerSummary {
    const ok = projects.filter((p) => !p.failed);
    const received = ok.reduce((n, p) => n + p.received, 0);
    const committed = ok.reduce((n, p) => n + p.committed, 0);
    const paid = ok.reduce((n, p) => n + p.paid, 0);
    return {
        received,
        committed,
        paid,
        commitable: received - committed,
        actualBalance: received - paid,
        awaitingPayment: Math.max(committed - paid, 0),
        utilization: received > 0 ? Math.round((committed / received) * 100) : 0,
        projectsWithFunds: ok.filter((p) => p.received > 0).length,
        projectsTotal: projects.length,
        partial: ok.length < projects.length,
    };
}

export function usePiLedgerSummary(user?: string | null) {
    const { projects, isLoading, error } = usePiLedgerData(user);
    const summary = useMemo(() => (projects ? summarize(projects) : undefined), [projects]);
    return { summary, isLoading, error };
}
