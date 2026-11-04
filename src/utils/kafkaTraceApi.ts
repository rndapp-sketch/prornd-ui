import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import { parseFrappeError } from "@/utils/errorUtils";

const frappeJson = async (url: string) => {
    const res = await fetch(url, { credentials: "include" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        // Frappe puts its message in _server_messages, or only in `exception` ("pkg.Error: text").
        const parsed = json?._server_messages || json?.message ? parseFrappeError(json) : "";
        const exception = typeof json?.exception === "string" ? json.exception.replace(/^[\w.]+:\s*/, "") : "";
        throw new Error(parsed || exception || `Request failed (HTTP ${res.status} ${res.statusText})`);
    }
    return json?.message;
};

const TRACE_API = `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.kafka.trace_api.get_kafka_trace`;

export interface KafkaTraceSummary {
    events: number;
    by_source: Record<string, number>;
    documents: number;
    published: number;
    failed_publishes: number;
    dlq: number;
    reverted: number;
    pending_commits: number;
    errors: number;
    consumed?: number;
    failed_consumes?: number;
    skipped_consumes?: number;
    linked_by_payload?: number;
    unlinked_events?: number;
    findings?: Record<string, number>;
    first_at?: string | null;
    last_at?: string | null;
}

export interface KafkaTraceReference {
    reference_name: string;
    reference_doctype?: string | null;
    events: number;
    sources: string[];
    topics: string[];
    first_at?: string | null;
    last_at?: string | null;
    last_status?: string | null;
    published: number;
    failed: number;
    in_dlq: boolean;
    reverted: boolean;
    pending_commits: number;
    current_state?: string | null;
    docstatus?: number | null;
    modified?: string | null;
    owner?: string | null;
    fund_received_ref_number?: string | null;
    stage?: string | null;
    // Shape not fixed by the backend: rendered defensively (string, object, or a list of either).
    depends_on?: unknown;
    findings?: string[];
}

export interface KafkaTraceFinding {
    severity: string;
    code: string;
    reference_name?: string | null;
    title?: string;
    message: string;
    hint?: string | null;
    evidence?: unknown;
}

export interface KafkaTraceEvent {
    time: string;
    source: string;
    status?: string | null;
    kind?: string | null;
    reference_doctype?: string | null;
    reference_name?: string | null;
    topic?: string | null;
    message?: string | null;
    // Full body when include_payload=1, otherwise a short preview; may be a string or parsed JSON.
    payload?: unknown;
    details?: Record<string, unknown> | null;
    // Links between a publish and the rejection/reply it caused; shape rendered defensively.
    id?: string;
    why?: string | null;
    processing_log?: string | null;
    duration_ms?: number | null;
    caused_by?: unknown;
    led_to?: unknown;
    resolved_by?: string | null;
    handler?: string | null;
    error_type?: string | null;
    from_dlq_topic?: string | null;
    file?: string;
    [extra: string]: unknown;
}

export interface KafkaTrace {
    project_number: string;
    project?: { name: string; project_no: string; project_title?: string } | null;
    summary: KafkaTraceSummary;
    findings?: KafkaTraceFinding[];
    references: KafkaTraceReference[];
    timeline: KafkaTraceEvent[];
    unlinked?: KafkaTraceEvent[];
    not_available?: string[];
}

export interface KafkaTraceParams {
    projectNo: string;
    includePayload?: boolean;
    limit?: number;
    fromDate?: string;
}

export const fetchKafkaTrace = async ({ projectNo, includePayload, limit, fromDate }: KafkaTraceParams): Promise<KafkaTrace> => {
    const qs = new URLSearchParams({ project_number: projectNo });
    if (includePayload) qs.set("include_payload", "1");
    if (limit) qs.set("limit", String(limit));
    if (fromDate) qs.set("from_date", fromDate);
    return frappeJson(`${TRACE_API}?${qs}`);
};
