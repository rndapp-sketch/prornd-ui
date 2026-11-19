import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";

const PROXY = `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.currency_proxy.proxy`;

export interface Rate {
    date: string;
    base: string;
    quote: string;
    rate: number;
}

export interface Currency {
    iso_code: string;
    name: string;
    symbol: string;
    type: string;
}

export class CurrencyApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.status = status;
    }
}

/** Calls the Frappe currency proxy. The body is returned as-is (no `.message` wrapper). */
export async function currencyApi<T>(path: string, params: Record<string, string | string[]> = {}): Promise<T> {
    const qs = new URLSearchParams({ path });
    for (const [k, v] of Object.entries(params)) (Array.isArray(v) ? v : [v]).forEach((x) => qs.append(k, x));
    const res = await fetch(`${PROXY}?${qs}`, { credentials: "include", cache: "no-store", headers: { Accept: "application/json" } });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
        const msg =
            res.status === 404 ? "Rate not available"
            : res.status === 403 ? "Session expired — please log in again"
            : res.status === 503 || res.status === 504 ? "Currency service is unavailable, try again later"
            : body?.message || `Currency service error (${res.status})`;
        throw new CurrencyApiError(msg, res.status);
    }
    return body as T;
}

/** Roles that get the currency icon in the top bar. */
export const CURRENCY_ROLES = [
    "staff, RnD",
    "Permanent Employee",
    "head_approver_1",
    "Dean, RnD",
    "Ado_RnD",
    "Associate Dean, RND",
];
