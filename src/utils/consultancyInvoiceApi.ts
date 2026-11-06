import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import { parseFrappeError } from "@/utils/errorUtils";

const INVOICE_API = `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.doctype.consultancy_invoice.consultancy_invoice`;

export interface InvoiceRow {
    key: string;
    projectNo: string;
    projectName: string;
    projectTitle: string;
    fundName: string;
    fundRef: string;
    amount: number;
    date: string;
    invoiceName: string | null;
    invoiceNo: string | null;
    slips: LinkedDepositSlip[];
    fundState: string;
    fundRefNumber: string;
}

export const csrf = () => (window as Window & { csrf_token?: string }).csrf_token || "";

export const frappeJson = async (url: string, init?: RequestInit) => {
    const res = await fetch(url, { credentials: "include", ...init });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        // The API puts its message in _server_messages, or only in `exception` ("pkg.Error: text").
        const parsed = json?._server_messages || json?.message ? parseFrappeError(json) : "";
        const exception = typeof json?.exception === "string" ? json.exception.replace(/^[\w.]+:\s*/, "") : "";
        throw new Error(parsed || exception || `Request failed (HTTP ${res.status} ${res.statusText})`);
    }
    return json?.message;
};

export const getInvoice = async (projectNo: string, fundRef: string) => {
    const qs = new URLSearchParams({ project_no: projectNo, fund_received_ref: fundRef });
    const msg = await frappeJson(`${INVOICE_API}.get_con_invoice?${qs}`);
    // Invoices are keyed by the Fund Received docname; invoice_no is the list of numbers entered for it.
    const raw = msg?.invoice_no;
    const numbers: string[] = Array.isArray(raw) ? raw.filter(Boolean) : typeof raw === "string" && raw ? [raw] : [];
    return { name: (msg?.name as string | null) ?? null, invoice_no: numbers };
};

export const saveInvoice = async (projectNo: string, fundRef: string, invoiceNo: string) =>
    frappeJson(`${INVOICE_API}.save_con_invoice`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf() },
        body: JSON.stringify({ project_no: projectNo, fund_received_ref: fundRef, invoice_no: invoiceNo }),
    });

export interface ApprovedFundsProject {
    project: string;
    project_no: string;
    project_title: string;
    workflow_state: string;
    fund_received: {
        name: string;
        fund_received_ref_number?: string;
        fund_received_amt?: number;
        workflow_state?: string;
        creation?: string;
        deposit_slips?: LinkedDepositSlip[];
    }[];
}

export interface ApprovedFundsPage {
    data: ApprovedFundsProject[];
    total: number;
    has_next: boolean;
    has_previous: boolean;
    next_id: string | null;
    previous_id: string | null;
}

// Cursor-paged: pass the previous page's next_id / previous_id as paginationId.
export const fetchApprovedFunds = async (opts: { projectNo?: string; paginationId?: string | null; pageSize?: number }): Promise<ApprovedFundsPage> => {
    const qs = new URLSearchParams({ page_size: String(opts.pageSize ?? 10) });
    if (opts.projectNo) qs.set("project_no", opts.projectNo);
    if (opts.paginationId) qs.set("pagination_id", opts.paginationId);
    return frappeJson(`${INVOICE_API}.get_approved_consultancy_funds?${qs}`);
};

const postJson = (method: string, body: object) =>
    frappeJson(`${FRAPPE_BASE_URL}/api/method/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Frappe-CSRF-Token": csrf() },
        body: JSON.stringify(body),
    });

const SEARCH_LIMIT = 20;

// Free-form search: matches project no., project name/title, PI webmail, or a Fund Received
// docname / reference number. Each hit is re-read through the approved-funds endpoint, so only
// approved Consultancy projects that have a Fund Received come back, with their deposit slips.
export const searchApprovedFunds = async (text: string): Promise<ApprovedFundsProject[]> => {
    const like = `%${text}%`;
    const [projects, funds] = await Promise.all([
        postJson("frappe.client.get_list", {
            doctype: "Project Registration",
            fields: ["name"],
            filters: [["project_type", "=", "Consultancy"], ["workflow_state", "=", "Approved"], ["docstatus", "=", 1]],
            or_filters: [["name", "like", like], ["project_no", "like", like], ["project_title", "like", like], ["pi_webmail", "like", like]],
            order_by: "creation desc",
            limit_page_length: SEARCH_LIMIT,
        }) as Promise<{ name: string }[]>,
        postJson("frappe.client.get_list", {
            doctype: "Fund Received",
            fields: ["prjreg_title"],
            filters: [["docstatus", "<", 2]],
            or_filters: [["name", "like", like], ["fund_received_ref_number", "like", like]],
            limit_page_length: SEARCH_LIMIT,
        }).catch(() => []) as Promise<{ prjreg_title: string }[]>,
    ]);
    const names = [...new Set([...(projects ?? []).map((p) => p.name), ...(funds ?? []).map((f) => f.prjreg_title).filter(Boolean)])].slice(0, SEARCH_LIMIT);
    const pages = await Promise.all(names.map((n) => fetchApprovedFunds({ projectNo: n, pageSize: 1 }).catch(() => null)));
    return pages.flatMap((pg) => pg?.data ?? []);
};

// Turns a project's funds into invoice rows, looking up whether each already has an invoice.
export const rowsFromProject = (project: ApprovedFundsProject): Promise<InvoiceRow[]> =>
    Promise.all(
        (project.fund_received ?? [])
            .filter((f) => f.workflow_state !== "Cancelled")
            .map(async (f) => {
                const fundRef = f.name;
                const inv = await getInvoice(project.project_no, fundRef).catch(() => ({ name: null, invoice_no: [] as string[] }));
                return {
                    key: `${project.project}::${f.name}`,
                    projectNo: project.project_no,
                    projectName: project.project,
                    projectTitle: project.project_title || "",
                    fundName: f.name,
                    fundRef,
                    amount: f.fund_received_amt || 0,
                    date: (f.creation ?? f.deposit_slips?.[0]?.creation)?.split(" ")[0] || "",
                    invoiceName: inv.name,
                    invoiceNo: inv.invoice_no[0] ?? null,
                    slips: f.deposit_slips ?? [],
                    fundState: f.workflow_state || "-",
                    fundRefNumber: f.fund_received_ref_number || "",
                };
            }),
    );

export const findInvoiceRow = async (projectNo: string, fundRef: string): Promise<InvoiceRow | null> => {
    const page = await fetchApprovedFunds({ projectNo, pageSize: 1 });
    const project = page.data?.[0];
    if (!project) return null;
    return (await rowsFromProject(project)).find((r) => r.fundName === fundRef || r.fundRefNumber === fundRef) ?? null;
};

export interface SavedInvoice {
    name: string;
    invoice_no: string;
}

const META_KEYS = new Set(["name", "owner", "creation", "modified", "modified_by", "docstatus", "idx", "parent", "parentfield", "parenttype", "doctype"]);

// A Consultancy Invoice document holds the fund's invoice numbers in an "Invoice Number" child table.
// Read every row of it, whatever the table/field is called, and return the entered numbers.
export const fetchInvoiceNumbers = async (docName: string): Promise<SavedInvoice[]> => {
    try {
        const doc = await frappeJson(`${FRAPPE_BASE_URL}/api/method/frappe.client.get?${new URLSearchParams({ doctype: "Consultancy Invoice", name: docName })}`);
        const out: SavedInvoice[] = [];
        for (const value of Object.values(doc ?? {})) {
            if (!Array.isArray(value)) continue;
            for (const r of value as Record<string, unknown>[]) {
                if (!r || typeof r !== "object") continue;
                const preferred = ["invoice_number", "invoice_no", "invoice"].map((k) => r[k]).find((v) => typeof v === "string" && v);
                const fallback = Object.entries(r).find(([k, v]) => !META_KEYS.has(k) && typeof v === "string" && v)?.[1];
                const no = (preferred ?? fallback) as string | undefined;
                if (no) out.push({ name: docName, invoice_no: no });
            }
        }
        if (out.length > 0) return out;
        const top = (doc as Record<string, unknown> | undefined)?.invoice_no;
        return typeof top === "string" && top ? [{ name: docName, invoice_no: top }] : [];
    } catch {
        return [];
    }
};

export const listInvoices = async (row: InvoiceRow): Promise<SavedInvoice[]> => {
    const one = await getInvoice(row.projectNo, row.fundRef).catch(() => null);
    if (!one?.name) return [];
    return one.invoice_no.map((no) => ({ name: one.name as string, invoice_no: no }));
};

export interface LinkedDepositSlip {
    name: string;
    doctype: string;
    workflow_state?: string;
    docstatus?: number;
    creation?: string;
}


export interface GeneratedInvoice {
    name: string;
    projectNo: string;
    fundRef: string;
    created: string;
    numbers: string[];
}

export const GENERATED_PAGE_SIZE = 10;

// One page of generated invoices straight from the doctype, newest first. Only the requested
// page is fetched (plus a count), never the whole list.
export const fetchGeneratedPage = async (
    page: number,
    projectNo: string,
): Promise<{ items: GeneratedInvoice[]; total: number }> => {
    const post = postJson;
    let docs: Record<string, unknown>[];
    let total: number;
    if (projectNo) {
        // Free-form text: or_filters cannot be counted server-side, so take the matches (capped)
        // and page them here. Only the visible page then loads its invoice numbers.
        const like = `%${projectNo}%`;
        const all = (await post("frappe.client.get_list", {
            doctype: "Consultancy Invoice",
            fields: ["*"],
            or_filters: [["name", "like", like], ["project_no", "like", like], ["fund_received_ref", "like", like]],
            order_by: "creation desc",
            limit_page_length: 100,
        })) as Record<string, unknown>[];
        total = all.length;
        docs = all.slice(page * GENERATED_PAGE_SIZE, (page + 1) * GENERATED_PAGE_SIZE);
    } else {
        [docs, total] = await Promise.all([
            post("frappe.client.get_list", {
                doctype: "Consultancy Invoice",
                fields: ["*"],
                order_by: "creation desc",
                limit_start: page * GENERATED_PAGE_SIZE,
                limit_page_length: GENERATED_PAGE_SIZE,
            }) as Promise<Record<string, unknown>[]>,
            post("frappe.client.get_count", { doctype: "Consultancy Invoice" }) as Promise<number>,
        ]);
    }
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    const items = await Promise.all((docs ?? []).map(async (d) => ({
        name: str(d.name),
        projectNo: str(d.project_no) || str(d.project),
        fundRef: str(d.fund_received_ref) || str(d.fund_received),
        created: str(d.creation).split(" ")[0],
        numbers: (await fetchInvoiceNumbers(str(d.name))).map((i) => i.invoice_no),
    })));
    return { items, total: Number(total) || 0 };
};
