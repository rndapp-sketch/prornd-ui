import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Loader2, AlertTriangle, Activity, SlidersHorizontal, X, ArrowRight, Lightbulb, ScrollText, Package, Clock, Briefcase, Layers, Copy, Printer, Check, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { cn } from "@/lib/utils";
import { IcssField, IcssSection } from "@/components/RegistryFormView";
import { fetchKafkaTrace, type KafkaTrace as KafkaTraceData, type KafkaTraceEvent, type KafkaTraceReference } from "@/utils/kafkaTraceApi";

const BORDER = "border border-[#E4E4E7] dark:border-[#3F3F46]";
const CARD = `rounded-xl bg-white shadow-sm dark:bg-[#27272A] ${BORDER}`;
const INPUT = `h-10 px-3 text-[13px] rounded-lg bg-white dark:bg-[#18181B] ${BORDER} outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-400/25`;
const LABEL = "flex flex-col gap-1 text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#71717A]";
const EYEBROW = "text-[11px] font-bold uppercase tracking-wider text-[#475569] dark:text-slate-300";
const TIMELINE_PAGE = 50;

type Tone = "red" | "amber" | "green" | "neutral";

const fmtTime = (t?: string | null) => (t ? t.slice(0, 19).replace("T", " ") : "—");

const toneOf = (status?: string | null): Tone => {
    const s = (status || "").toUpperCase();
    if (["SUCCESS", "PUBLISHED", "INFO", "CONSUMED"].includes(s)) return "green";
    if (["FAILED", "ERROR", "DLQ"].includes(s)) return "red";
    if (["REVERTED", "PENDING_APPROVAL", "WARNING", "SKIPPED"].includes(s)) return "amber";
    return "neutral";
};

const TONE_PILL: Record<Tone, string> = {
    green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    red: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    neutral: "bg-[#F4F4F5] text-[#52525B] dark:bg-[#3F3F46] dark:text-[#D4D4D8]",
};
const TONE_DOT: Record<Tone, string> = {
    green: "bg-emerald-500", red: "bg-rose-500", amber: "bg-amber-500", neutral: "bg-[#A1A1AA]",
};
const TONE_PANEL: Record<Tone, string> = {
    red: "border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-900/20 text-rose-900 dark:text-rose-100",
    amber: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100",
    green: "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-100",
    neutral: "border-[#E4E4E7] bg-[#FAFAF9] dark:bg-[#18181B] dark:border-[#3F3F46]",
};

const severityTone = (sev: string): Tone => {
    switch (sev.toLowerCase()) {
        case "high": case "critical": return "red";
        case "medium": case "warning": return "amber";
        default: return "neutral";
    }
};

const Pill: React.FC<{ text?: string | null; tone?: Tone }> = ({ text, tone }) =>
    text ? <span className={cn("px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap", TONE_PILL[tone ?? toneOf(text)])}>{text}</span> : null;

const Chip: React.FC<{ active?: boolean; onClick?: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button type="button" onClick={onClick}
        className={cn("px-2.5 py-1 rounded-full text-[12px] font-bold transition-colors", BORDER,
            active ? "bg-slate-800 text-white border-slate-800" : "bg-white dark:bg-[#27272A] hover:bg-[#FAFAF9] dark:hover:bg-[#3F3F46]")}>
        {children}
    </button>
);

// caused_by / led_to / depends_on aren't a fixed shape: accept strings, objects or lists of either.
const refText = (v: unknown): string => {
    if (v == null || v === "") return "";
    if (Array.isArray(v)) return v.map(refText).filter(Boolean).join("; ");
    if (typeof v === "object") {
        const o = v as Record<string, unknown>;
        const name = [o.reference_doctype ?? o.doctype, o.reference_name ?? o.name].filter(Boolean).join(" ")
            || [o.source, o.id].filter(Boolean).join(" ");
        const extra = [o.kind, o.time, o.state ?? o.current_state ?? o.status].filter(Boolean).join(", ");
        return name || extra ? `${name}${extra ? ` (${extra})` : ""}` : JSON.stringify(v);
    }
    return String(v);
};

const hasProblem = (r: KafkaTraceReference) => r.in_dlq || r.reverted || r.failed > 0 || !!r.findings?.length;

// --- Verdict ---------------------------------------------------------------

const Verdict: React.FC<{ trace: KafkaTraceData }> = ({ trace }) => {
    const s = trace.summary;
    const high = trace.findings?.filter((f) => severityTone(f.severity) === "red").length ?? 0;
    const total = trace.findings?.length ?? 0;
    const tone: Tone = high > 0 ? "red" : total > 0 ? "amber" : "green";
    const verdict = high > 0 ? `${high} serious ${high === 1 ? "problem" : "problems"}` : total > 0 ? `${total} ${total === 1 ? "issue" : "issues"} to review` : "No problems";
    const problemDocs = trace.references.filter(hasProblem).length;

    const tiles: { icon: React.ReactNode; k: string; v: string }[] = [
        { icon: <Briefcase />, k: "Project", v: trace.project?.project_no || trace.project_number },
        { icon: <Layers />, k: "Documents", v: `${s.documents}${problemDocs ? ` · ${problemDocs} need attention` : ""}` },
        { icon: <Activity />, k: "Events", v: String(s.events) },
        { icon: <Clock />, k: "Period", v: `${fmtTime(s.first_at).slice(0, 10)} → ${fmtTime(s.last_at).slice(0, 10)}` },
    ];
    const facts: [string, number, boolean][] = [
        ["published", s.published, false],
        ["failed publishes", s.failed_publishes, true],
        ["in DLQ", s.dlq, true],
        ["reverted", s.reverted, true],
        ["pending commits", s.pending_commits, false],
        ["errors", s.errors, true],
        ["failed consumes", s.failed_consumes ?? 0, true],
        ["skipped consumes", s.skipped_consumes ?? 0, true],
    ];

    return (
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 via-amber-50 to-white px-5 py-4 text-[#18181B] dark:border-slate-500/20 dark:from-slate-950/40 dark:via-amber-950/30 dark:to-transparent dark:text-white">
            <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-sm"><ScrollText className="h-5 w-5" /></span>
                <div className="min-w-0">
                    <div className={EYEBROW}>Kafka Trace</div>
                    <div className="text-[18px] font-extrabold leading-tight tracking-tight break-words">
                        {trace.project?.project_title || trace.project?.project_no || trace.project_number}
                    </div>
                </div>
                <div className="ml-auto">
                    <span className={cn("rounded-full px-3 py-1 text-[11px] font-extrabold shadow-sm", tone === "green" ? "bg-emerald-600 text-white" : tone === "amber" ? "bg-amber-500 text-white" : "bg-rose-600 text-white")}>{verdict}</span>
                </div>
            </div>
            <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {tiles.map((x) => (
                    <div key={x.k} className="flex min-w-0 items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm dark:border-slate-500/20 dark:bg-white/5">
                        <span className="text-[#475569] dark:text-slate-300 [&_svg]:h-4 [&_svg]:w-4">{x.icon}</span>
                        <div className="min-w-0">
                            <div className="text-[10px] font-bold uppercase tracking-wide text-[#475569] dark:text-slate-200">{x.k}</div>
                            <div className="truncate text-[13px] font-bold">{x.v}</div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
                {facts.filter(([, v, bad]) => v > 0 || !bad).map(([label, v, bad]) => (
                    <span key={label} className={cn(bad && v > 0 && "font-black text-rose-700 dark:text-rose-300")}><b className="text-[15px]">{v}</b> {label}</span>
                ))}
            </div>
        </div>
    );
};

// --- Summary report ---------------------------------------------------------

interface ReportSection { title: string; lines: string[] }

const PROBLEM_STATUSES = ["DLQ", "FAILED", "ERROR", "REVERTED", "SKIPPED"];

// One structure feeds the on-screen report, the copied text and the printout.
const buildReport = (trace: KafkaTraceData): { heading: string; sections: ReportSection[] } => {
    const s = trace.summary;
    const findings = trace.findings ?? [];
    const high = findings.filter((f) => severityTone(f.severity) === "red").length;
    const problemDocs = trace.references.filter(hasProblem);
    const projectLabel = [trace.project?.project_no || trace.project_number, trace.project?.project_title].filter(Boolean).join(" — ");

    const overview = [
        `Period: ${fmtTime(s.first_at)} to ${fmtTime(s.last_at)}.`,
        `${s.events} events across ${s.documents} documents.`,
        findings.length === 0
            ? "No problems were detected for this project."
            : `${findings.length} finding${findings.length === 1 ? "" : "s"}${high ? `, ${high} serious` : ""}; ${problemDocs.length} document${problemDocs.length === 1 ? "" : "s"} need attention.`,
    ];

    const counts = ([
        ["Published", s.published], ["Failed publishes", s.failed_publishes], ["In DLQ", s.dlq], ["Reverted", s.reverted],
        ["Pending commits", s.pending_commits], ["Errors", s.errors], ["Consumed", s.consumed], ["Failed consumes", s.failed_consumes],
        ["Skipped consumes", s.skipped_consumes], ["Unlinked events", s.unlinked_events],
    ] as [string, number | undefined][]).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}: ${v}`);

    const problems = findings.map((f, i) => {
        const parts = [`${i + 1}. [${f.severity.toUpperCase()}] ${f.title || f.code}${f.reference_name ? ` (${f.reference_name})` : ""}`, `   ${f.message}`];
        if (f.hint) parts.push(`   Action: ${f.hint}`);
        return parts.join("\n");
    });

    const docs = trace.references.map((r) => {
        const flags = [r.in_dlq && "in DLQ", r.reverted && "reverted", r.failed > 0 && "failed", r.pending_commits > 0 && "commit pending"].filter(Boolean).join(", ");
        return `${r.reference_doctype || "Document"} ${r.reference_name}: ${r.stage || r.current_state || r.last_status || "no status"}${flags ? ` [${flags}]` : ""}`;
    });

    const keyEvents = trace.timeline
        .filter((e) => PROBLEM_STATUSES.includes((e.status || "").toUpperCase()))
        .slice(0, 8)
        .map((e) => `${fmtTime(e.time)}  ${e.status}  ${e.reference_doctype ?? ""} ${e.reference_name ?? ""}  ${e.message ?? ""}`.replace(/\s+/g, " ").trim());

    const sections: ReportSection[] = [
        { title: "Overview", lines: overview },
        { title: "Key numbers", lines: [counts.join("  ·  ")] },
        ...(problems.length ? [{ title: "What is wrong and what to do", lines: problems }] : []),
        { title: "Document status", lines: docs.length ? docs : ["No documents."] },
        ...(keyEvents.length ? [{ title: "Latest problem events", lines: keyEvents }] : []),
        ...(trace.not_available?.length ? [{ title: "Not available", lines: trace.not_available }] : []),
    ];
    return { heading: `Kafka Trace Summary — ${projectLabel}`, sections };
};

const reportText = (rep: ReturnType<typeof buildReport>) =>
    [rep.heading, "", ...rep.sections.flatMap((sec) => [sec.title.toUpperCase(), ...sec.lines, ""])].join("\n");

const escapeHtml = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const printReport = (rep: ReturnType<typeof buildReport>) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><title>${escapeHtml(rep.heading)}</title><style>
        body{font:13px/1.5 system-ui,sans-serif;color:#18181b;margin:32px}
        h1{font-size:18px;margin:0 0 16px}
        h2{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#4a5a28;border-bottom:2px solid #cbd5b0;padding-bottom:4px;margin:20px 0 8px}
        pre{font:inherit;white-space:pre-wrap;margin:0 0 6px}
    </style></head><body><h1>${escapeHtml(rep.heading)}</h1>${rep.sections
        .map((sec) => `<h2>${escapeHtml(sec.title)}</h2>${sec.lines.map((l) => `<pre>${escapeHtml(l)}</pre>`).join("")}`)
        .join("")}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
};

const SummaryReport: React.FC<{ trace: KafkaTraceData; onShowDoc: (name: string) => void }> = ({ trace, onShowDoc }) => {
    const rep = useMemo(() => buildReport(trace), [trace]);
    const [copied, setCopied] = useState(false);
    const copy = async () => {
        await navigator.clipboard.writeText(reportText(rep));
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };
    const btn = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-bold text-[#334155] shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-500/30 dark:bg-white/5 dark:text-slate-200";

    const findings = trace.findings ?? [];
    const serious = findings.filter((f) => severityTone(f.severity) === "red");
    // Lead with the most specific serious finding: generic "rejected" ones only say to look further.
    const focus = serious.find((f) => f.code !== "REJECTED_BY_LEDGER" && f.hint) ?? serious[0] ?? findings[0];
    const others = findings.filter((f) => f !== focus);
    // Oldest first, so the row reads as the order things were sent and shows where it stopped.
    const chain = [...trace.references].sort((x, y) => (x.first_at ?? "").localeCompare(y.first_at ?? ""));
    const tone = focus ? severityTone(focus.severity) : "green";

    return (
        <IcssSection title="Problem" icon={<AlertTriangle />}>
            <div className="mb-3 flex justify-end gap-2">
                <button type="button" onClick={copy} className={btn}>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{copied ? "Copied" : "Copy report"}</button>
                <button type="button" onClick={() => printReport(rep)} className={btn}><Printer className="h-3.5 w-3.5" />Print / PDF</button>
            </div>

            {focus ? (
                <div className={cn("rounded-xl border-2 p-4 shadow-sm", TONE_PANEL[tone])}>
                    <div className="text-[11px] font-black uppercase tracking-wider opacity-70">
                        {serious.length > 1 ? `Main problem (${serious.length} serious found)` : "Problem"}
                    </div>
                    <p className="mt-1 text-[16px] font-black leading-snug">{focus.title || focus.code}</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed">{focus.message}</p>
                    {focus.hint && (
                        <div className="mt-3 flex items-start gap-2 rounded-lg bg-white/80 p-3 text-[13px] dark:bg-black/25">
                            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                            <span><b>What to do:</b> {focus.hint}</span>
                        </div>
                    )}
                    {focus.reference_name && (
                        <button type="button" onClick={() => onShowDoc(focus.reference_name!)} className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold hover:underline">
                            Show events for {focus.reference_name}<ArrowRight className="h-3 w-3" />
                        </button>
                    )}
                </div>
            ) : (
                <div className={cn("rounded-xl border-2 p-4 text-[14px] font-bold shadow-sm", TONE_PANEL.green)}>No problems detected for this project.</div>
            )}

            {chain.length > 0 && (
                <div className="mt-4">
                    <div className={cn(EYEBROW, "mb-2")}>Where it stopped</div>
                    <div className="flex flex-wrap items-stretch gap-y-2">
                        {chain.map((r, i) => {
                            const bad = hasProblem(r);
                            return (
                                <React.Fragment key={`${r.reference_doctype}:${r.reference_name}`}>
                                    {i > 0 && <ArrowRight className="mx-1.5 h-4 w-4 shrink-0 self-center text-[#A1A1AA]" />}
                                    <button type="button" onClick={() => onShowDoc(r.reference_name)} title={r.reference_name}
                                        className={cn("max-w-[260px] rounded-lg border-2 px-3 py-2 text-left text-[12px] transition-colors",
                                            bad ? "border-rose-400 bg-rose-50 text-rose-900 hover:bg-rose-100 dark:border-rose-700 dark:bg-rose-900/25 dark:text-rose-100"
                                                : "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/15 dark:text-emerald-100")}>
                                        <div className="flex items-center gap-1.5 font-black">
                                            {bad ? <X className="h-3.5 w-3.5 shrink-0" /> : <Check className="h-3.5 w-3.5 shrink-0" />}
                                            <span className="truncate">{r.reference_doctype}</span>
                                        </div>
                                        <div className="mt-0.5 truncate font-medium opacity-80">{r.stage || r.current_state || r.last_status || "—"}</div>
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            )}

            {others.length > 0 && (
                <div className="mt-4">
                    <div className={cn(EYEBROW, "mb-2")}>Also found ({others.length})</div>
                    <ul className="divide-y divide-[#E4E4E7] overflow-hidden rounded-lg border border-[#E4E4E7] dark:divide-[#3F3F46] dark:border-[#3F3F46]">
                        {others.map((f, i) => (
                            <li key={i} className="flex gap-3 px-3 py-2.5 text-[13px]">
                                <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", TONE_DOT[severityTone(f.severity)])} />
                                <div className="min-w-0">
                                    <div className="font-bold">{f.title || f.code}{f.reference_name && <span className="ml-2 font-mono text-[12px] font-normal text-[#71717A]">{f.reference_name}</span>}</div>
                                    <div className="text-[#52525B] dark:text-[#A1A1AA]">{f.message}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </IcssSection>
    );
};

// Secondary detail stays closed until asked for, so the answer above isn't buried.
const Collapsible: React.FC<{ id?: string; title: string; icon: React.ReactNode; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({ id, title, icon, open, onToggle, children }) => (
    <div id={id}>
        <button type="button" onClick={onToggle} aria-expanded={open}
            className="flex w-full items-center gap-2.5 px-5 py-3 text-left hover:bg-[#FAFAF9] dark:hover:bg-white/5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E6EBD8] text-[#5A6B34] ring-1 ring-[#CBD5B0] dark:bg-[#A3B18A]/20 dark:text-[#C5D2A3] [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>
            <span className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#4A5A28] dark:text-[#D5E0B5]">{title}</span>
            <ChevronDown className={cn("ml-auto h-4 w-4 text-[#71717A] transition-transform", open && "rotate-180")} />
        </button>
        {open && <div className="px-5 pb-4">{children}</div>}
    </div>
);

// --- Documents -------------------------------------------------------------

const DocumentCard: React.FC<{ r: KafkaTraceReference; onShowEvents: () => void }> = ({ r, onShowEvents }) => {
    const bad = hasProblem(r);
    const depends = (Array.isArray(r.depends_on) ? r.depends_on : r.depends_on ? [r.depends_on] : []) as Record<string, unknown>[];
    return (
        <div className={cn("rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-4 text-[13px]", bad && "border-l-4 border-l-rose-500")}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                    <div className={EYEBROW}>{r.reference_doctype || "Unknown document"}</div>
                    <div className="font-mono font-bold break-all">{r.reference_name}</div>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                    {r.in_dlq && <Pill text="DLQ" />}
                    {r.reverted && <Pill text="REVERTED" />}
                    {r.failed > 0 && <Pill text="FAILED" />}
                    {r.pending_commits > 0 && <Pill text="PENDING_APPROVAL" />}
                    {!bad && <Pill text={r.last_status || "OK"} tone={r.last_status ? undefined : "green"} />}
                </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {r.stage && <IcssField label="Stage" value={r.stage} />}
                {r.current_state && <IcssField label="State" value={r.current_state} />}
                {r.fund_received_ref_number !== undefined && (
                    <IcssField label="Accounts ref" value={r.fund_received_ref_number || <span className="font-bold text-rose-600">not confirmed</span>} />
                )}
                <IcssField label="Activity" value={`${r.events} events · ${fmtTime(r.first_at)} → ${fmtTime(r.last_at)}`} />
                {r.topics.length > 0 && <IcssField label="Topics" value={<span className="font-mono text-[12px]">{r.topics.join(", ")}</span>} />}
                {depends.length > 0 && (
                    <IcssField label="Depends on" wide value={
                        <div className="space-y-1">
                            {depends.map((d, i) => (
                                <div key={i} className="break-words">
                                    <b>{String(d.reference_doctype ?? "")}</b> <span className="font-mono">{String(d.reference_name ?? refText(d))}</span>
                                    {d.current_state != null && <span className="text-[#71717A]"> · {String(d.current_state)}</span>}
                                    {"fund_received_ref_number" in d && !d.fund_received_ref_number && <span className="font-bold text-rose-600"> · no accounts ref</span>}
                                    {d.published === false && <span className="font-bold text-rose-600"> · not published</span>}
                                </div>
                            ))}
                        </div>
                    } />
                )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                    {r.findings?.map((c) => <span key={c} className={cn("px-1.5 py-0.5 rounded font-mono text-[10px]", BORDER)}>{c}</span>)}
                </div>
                <button type="button" onClick={onShowEvents} className="inline-flex items-center gap-1 text-[12px] font-bold text-[#0E7490] dark:text-cyan-300 hover:underline">
                    View events<ArrowRight className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

// --- Timeline --------------------------------------------------------------

const asText = (v: unknown): string => {
    if (typeof v !== "string") return JSON.stringify(v, null, 2);
    try { return JSON.stringify(JSON.parse(v), null, 2); } catch { return v; }
};

// The backend may name the body payload, payload_preview, etc.; show whichever is present.
const payloadOf = (ev: KafkaTraceEvent): unknown =>
    ev.payload ?? ev.payload_preview ?? ev.message_payload ?? ev.body ?? ev.value ?? null;

const EventItem: React.FC<{ ev: KafkaTraceEvent; payloadOpen?: boolean }> = ({ ev, payloadOpen }) => {
    const tone = toneOf(ev.status);
    const links = (["caused_by", "led_to", "resolved_by"] as const)
        .map((k) => [k, refText(ev[k])] as const)
        .filter(([, t]) => t);
    const meta = [ev.handler, ev.error_type, ev.from_dlq_topic && `from ${ev.from_dlq_topic}`].filter(Boolean).join(" · ");
    return (
        <li className="relative pl-7 pb-5 last:pb-0">
            <span className="absolute left-[7px] top-2 bottom-0 w-px bg-[#E4E4E7] dark:bg-[#3F3F46]" aria-hidden />
            <span className={cn("absolute left-0 top-1.5 w-[15px] h-[15px] rounded-full ring-4 ring-white dark:ring-[#27272A]", TONE_DOT[tone])} aria-hidden />
            <div className="text-[12px] flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-mono text-[#71717A]">{fmtTime(ev.time)}</span>
                <Pill text={ev.status} />
                <span className="font-mono font-bold">{ev.source}{ev.file ? ` · ${ev.file}` : ""}</span>
                {ev.topic && <span className="font-mono text-[#71717A] break-all">{ev.topic}</span>}
                {ev.id && <span className="font-mono text-[#A1A1AA]">#{ev.id}</span>}
            </div>
            {(ev.reference_name || ev.reference_doctype) && (
                <div className="mt-0.5 text-[12px]"><b>{ev.reference_doctype}</b> <span className="font-mono text-[#71717A] break-all">{ev.reference_name}</span></div>
            )}
            {ev.message && <p className="mt-1 text-[13px] break-words">{ev.message}</p>}
            {(ev.why || (typeof ev.reason === "string" && ev.reason)) && (
                <p className="mt-1 text-[12px] text-amber-700 dark:text-amber-300"><b>Not linked because:</b> {ev.why || String(ev.reason)}</p>
            )}
            {links.map(([k, t]) => (
                <p key={k} className="mt-1 text-[12px] text-[#71717A]"><b>{k.replace("_", " ")}:</b> <span className="font-mono break-all">{t}</span></p>
            ))}
            {meta && <p className="mt-1 text-[11px] text-[#71717A] font-mono">{meta}{ev.duration_ms != null ? ` · ${ev.duration_ms} ms` : ""}</p>}
            {ev.processing_log && (
                <details className="mt-1.5" open={payloadOpen}>
                    <summary className="cursor-pointer text-[12px] font-bold text-[#0E7490] dark:text-cyan-300">Processing log</summary>
                    <pre className="mt-1 p-2 rounded-lg bg-[#F4F4F5] dark:bg-[#18181B] text-[11px] whitespace-pre-wrap break-all max-h-60 overflow-auto">{ev.processing_log}</pre>
                </details>
            )}
            {ev.details && Object.keys(ev.details).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(ev.details).map(([k, v]) => (
                        <span key={k} className={cn("px-1.5 py-0.5 rounded font-mono text-[11px]", BORDER)}>{k}: <b>{String(v)}</b></span>
                    ))}
                </div>
            )}
            {payloadOf(ev) != null && (
                <details className="mt-1.5" open={payloadOpen}>
                    <summary className="cursor-pointer text-[12px] font-bold text-[#0E7490] dark:text-cyan-300">Payload</summary>
                    <pre className="mt-1 p-2 rounded-lg bg-[#F4F4F5] dark:bg-[#18181B] text-[11px] whitespace-pre-wrap break-all max-h-96 overflow-auto">{asText(payloadOf(ev))}</pre>
                </details>
            )}
            <details className="mt-1">
                <summary className="cursor-pointer text-[11px] text-[#A1A1AA]">Raw event</summary>
                <pre className="mt-1 p-2 rounded-lg bg-[#F4F4F5] dark:bg-[#18181B] text-[11px] whitespace-pre-wrap break-all max-h-96 overflow-auto">{JSON.stringify(ev, null, 2)}</pre>
            </details>
        </li>
    );
};

const TimelineList: React.FC<{ events: KafkaTraceEvent[]; empty: string; includePayload: boolean }> = ({ events, empty, includePayload }) => {
    const [shown, setShown] = useState(TIMELINE_PAGE);
    useEffect(() => setShown(TIMELINE_PAGE), [events]);
    if (events.length === 0) return <div className="py-10 text-center text-[13px] text-[#71717A]">{empty}</div>;
    return (
        <>
            <ul>{events.slice(0, shown).map((ev, i) => <EventItem key={`${ev.time}-${ev.source}-${i}`} ev={ev} payloadOpen={includePayload} />)}</ul>
            {shown < events.length && (
                <button type="button" onClick={() => setShown((n) => n + TIMELINE_PAGE)}
                    className={cn("mt-4 w-full py-2 rounded-lg text-[13px] font-bold hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]", BORDER)}>
                    Show {Math.min(TIMELINE_PAGE, events.length - shown)} more ({events.length - shown} left)
                </button>
            )}
        </>
    );
};

// --- Page ------------------------------------------------------------------

const KafkaTrace: React.FC = () => {
    const [params, setParams] = useSearchParams();
    const [projectNo, setProjectNo] = useState(params.get("project") ?? "");
    const [includePayload, setIncludePayload] = useState(true);
    const [fromDate, setFromDate] = useState("");
    const [limit, setLimit] = useState(200);
    const [showOptions, setShowOptions] = useState(false);

    const [trace, setTrace] = useState<KafkaTraceData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [openDocs, setOpenDocs] = useState(false);
    const [openTimeline, setOpenTimeline] = useState(false);
    const [openUnlinked, setOpenUnlinked] = useState(false);
    const [onlyProblems, setOnlyProblems] = useState(false);
    const [sourceFilter, setSourceFilter] = useState<string | null>(null);
    const [docFilter, setDocFilter] = useState<string | null>(null);

    const run = useCallback(async (no: string) => {
        no = no.trim();
        if (!no) return;
        setLoading(true);
        setError("");
        try {
            const data = await fetchKafkaTrace({ projectNo: no, includePayload, limit, fromDate: fromDate || undefined });
            setTrace(data);
            setSourceFilter(null);
            setDocFilter(null);
            setOnlyProblems(false);
            setOpenDocs(false);
            setOpenTimeline(false);
            setOpenUnlinked(false);
            setParams({ project: no }, { replace: true });
        } catch (err) {
            setTrace(null);
            setError(err instanceof Error ? err.message : "Failed to load Kafka trace");
        } finally {
            setLoading(false);
        }
    }, [includePayload, limit, fromDate, setParams]);

    // Opening a shared link (?project=...) runs the trace straight away.
    useEffect(() => {
        const initial = params.get("project");
        if (initial) run(initial);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const showDocEvents = (name: string) => {
        setDocFilter(name);
        setSourceFilter(null);
        setOpenTimeline(true);
        setTimeout(() => document.getElementById("kafka-timeline")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    };

    const refs = useMemo(() => (trace?.references ?? []).filter((r) => !onlyProblems || hasProblem(r)), [trace, onlyProblems]);
    const problemCount = useMemo(() => (trace?.references ?? []).filter(hasProblem).length, [trace]);

    const sources = useMemo(() => {
        const counts: Record<string, number> = {};
        trace?.timeline.forEach((e) => { counts[e.source] = (counts[e.source] ?? 0) + 1; });
        return Object.entries(counts);
    }, [trace]);

    const events = useMemo(
        () => (trace?.timeline ?? []).filter((e) => (!sourceFilter || e.source === sourceFilter) && (!docFilter || e.reference_name === docFilter)),
        [trace, sourceFilter, docFilter],
    );

    const unlinked = trace?.unlinked ?? [];
    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] p-4 md:p-6 space-y-4 font-sans">
            <PageHeader title="Kafka Trace" backFallback="/dashboard" />

            <form onSubmit={(e) => { e.preventDefault(); run(projectNo); }} className={cn(CARD, "p-3 space-y-3")}>
                <div className="flex flex-wrap gap-2">
                    <div className="relative grow min-w-[240px]">
                        <Search className="w-4 h-4 absolute left-3 top-3 text-[#A1A1AA]" />
                        <input className={cn(INPUT, "w-full pl-9")} value={projectNo} onChange={(e) => setProjectNo(e.target.value)}
                            placeholder="Project number, e.g. 2627C-0389-CIEN0207ACHA" aria-label="Project number" autoFocus />
                    </div>
                    <button type="button" onClick={() => setShowOptions((v) => !v)} aria-expanded={showOptions}
                        className={cn("h-10 px-3 inline-flex items-center gap-2 rounded-lg text-[13px] font-bold", BORDER, showOptions && "bg-[#F4F4F5] dark:bg-[#3F3F46]")}>
                        <SlidersHorizontal className="w-4 h-4" />Options
                    </button>
                    <button type="submit" disabled={loading || !projectNo.trim()}
                        className="h-10 px-5 inline-flex items-center gap-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-[13px] font-bold shadow-sm disabled:opacity-40">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                        {loading ? "Tracing…" : "Trace"}
                    </button>
                </div>
                {showOptions && (
                    <div className="flex flex-wrap items-end gap-4 pt-1">
                        <label className={LABEL}>From date
                            <input type="date" className={INPUT} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                        </label>
                        <label className={LABEL}>Events per source
                            <input type="number" min={1} max={1000} className={cn(INPUT, "w-28")} value={limit}
                                onChange={(e) => setLimit(Math.min(1000, Math.max(1, Number(e.target.value) || 200)))} />
                        </label>
                        <label className="flex items-center gap-2 h-10 text-[13px] font-bold">
                            <input type="checkbox" checked={includePayload} onChange={(e) => setIncludePayload(e.target.checked)} />
                            Include full payloads
                        </label>
                    </div>
                )}
            </form>

            {error && (
                <div role="alert" className="flex items-start gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 text-[13px]">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{error}
                </div>
            )}

            {!trace && !error && !loading && (
                <div className={cn(CARD, "p-12 text-center text-[13px] text-[#71717A]")}>
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Enter a project number to see what was published, what came back, and what went wrong.
                </div>
            )}

            {loading && !trace && (
                <div className="space-y-3 animate-pulse" aria-busy>
                    <div className="h-28 rounded-xl bg-[#E4E4E7] dark:bg-[#3F3F46]" />
                    <div className="h-40 rounded-xl bg-[#E4E4E7] dark:bg-[#3F3F46]" />
                </div>
            )}

            {trace && (
                <div className={cn("space-y-3 transition-opacity", loading && "opacity-50 pointer-events-none")}>
                    <div className="overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                        <Verdict trace={trace} />

                        <div className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                            <SummaryReport trace={trace} onShowDoc={showDocEvents} />

                            <Collapsible title={`Documents (${trace.references.length})`} icon={<Package />} open={openDocs} onToggle={() => setOpenDocs((v) => !v)}>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-[12px] text-[#71717A]">{problemCount} of {trace.references.length} documents need attention</p>
                                        <Chip active={onlyProblems} onClick={() => setOnlyProblems((v) => !v)}>Only problems</Chip>
                                    </div>
                                    {refs.length === 0 && <div className="py-8 text-center text-[13px] text-[#71717A]">No documents to show.</div>}
                                    {refs.map((r) => (
                                        <DocumentCard key={`${r.reference_doctype}:${r.reference_name}`} r={r} onShowEvents={() => showDocEvents(r.reference_name)} />
                                    ))}
                                </div>
                            </Collapsible>

                            <Collapsible id="kafka-timeline" title={`Timeline (${trace.timeline.length})`} icon={<Clock />} open={openTimeline} onToggle={() => setOpenTimeline((v) => !v)}>
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Chip active={!sourceFilter} onClick={() => setSourceFilter(null)}>All</Chip>
                                        {sources.map(([src, n]) => (
                                            <Chip key={src} active={sourceFilter === src} onClick={() => setSourceFilter(sourceFilter === src ? null : src)}>
                                                {src} <span className="opacity-60">{n}</span>
                                            </Chip>
                                        ))}
                                    </div>
                                    {docFilter && (
                                        <div className="flex items-center gap-2 text-[12px]">
                                            Showing events for <span className="font-mono font-bold break-all">{docFilter}</span>
                                            <button type="button" onClick={() => setDocFilter(null)} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]">
                                                <X className="w-3 h-3" />Clear
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-[12px] text-[#71717A]">Newest first · {events.length} events</p>
                                    <TimelineList events={events} includePayload={includePayload} empty="No events match these filters." />
                                </div>
                            </Collapsible>

                            {unlinked.length > 0 && (
                                <Collapsible title={`Unlinked events (${unlinked.length})`} icon={<Search />} open={openUnlinked} onToggle={() => setOpenUnlinked((v) => !v)}>
                                    <p className="mb-3 text-[12px] text-[#71717A]">These events could not be tied to a document. The reason is shown on each one.</p>
                                    <TimelineList events={unlinked} includePayload={includePayload} empty="Nothing unlinked." />
                                </Collapsible>
                            )}
                        </div>
                    </div>

                    {!!trace.not_available?.length && (
                        <ul className="text-[12px] text-[#71717A] list-disc pl-5">
                            {trace.not_available.map((n) => <li key={n}>{n}</li>)}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

export default KafkaTrace;
