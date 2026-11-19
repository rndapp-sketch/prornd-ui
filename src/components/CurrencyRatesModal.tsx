import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useSWR from "swr";
import { ArrowLeftRight, Coins, Move, Loader2, RefreshCw, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ResizeEdges } from "@/components/ResizeEdges";
import { useFloatingWindow } from "@/hooks/useFloatingWindow";
import { useUserRoles } from "@/components/UserRole";
import { CURRENCY_ROLES, currencyApi, type Currency, type Rate } from "@/services/currencyApi";

const POPULAR = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "SGD", "CHF", "AED"];
const FALLBACK_NAMES: Record<string, string> = {
    USD: "US Dollar", EUR: "Euro", GBP: "Pound Sterling", JPY: "Japanese Yen", AUD: "Australian Dollar",
    CAD: "Canadian Dollar", SGD: "Singapore Dollar", CHF: "Swiss Franc", AED: "UAE Dirham", INR: "Indian Rupee",
};
const fmt = (n: number, d = 4) => n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: d });
// Local (not UTC) YYYY-MM-DD, so IST mornings don't get yesterday's date.
const todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fmtDate = (iso: string) => {
    const [y, m, d] = iso.split("-");
    return y && m && d ? `${d}/${m}/${y}` : iso;
};
// Currency → flag. ISO currency codes start with the country code (USD→US, JPY→JP); a few don't.
const FLAG_OVERRIDES: Record<string, string> = { EUR: "EU", ANG: "CW", XAF: "CM", XOF: "SN", XCD: "AG", XPF: "PF", GBP: "GB", SHP: "SH" };
const flagOf = (c: string) =>
    [...(FLAG_OVERRIDES[c] ?? c.slice(0, 2)).toUpperCase()].map((ch) => String.fromCodePoint(ch.charCodeAt(0) + 127397)).join("");
const FlagCircle = ({ code, size = "h-8 w-8 text-lg" }: { code: string; size?: string }) => (
    <span className={`flex shrink-0 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-600 bg-white dark:bg-zinc-800 shadow-sm leading-none ${size}`}>{flagOf(code)}</span>
);

// Rates change about once a day, but keep the window fresh: refetch on open and every 5 minutes.
const swrOpts = { revalidateOnFocus: false, revalidateOnReconnect: false, revalidateOnMount: true, dedupingInterval: 0, refreshInterval: 5 * 60 * 1000, shouldRetryOnError: false };

function CurrencyPicker({ value, options, onChange, className }: { value: string; options: Currency[]; onChange: (c: string) => void; className: string }) {
    const [q, setQ] = useState("");
    const [open, setOpen] = useState(false);
    const current = options.find((c) => c.iso_code === value);
    const needle = q.trim().toLowerCase();
    const list = needle ? options.filter((c) => c.iso_code.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle)) : options;
    return (
        <div className="relative">
            <input
                value={open ? q : `${value} — ${current?.name ?? FALLBACK_NAMES[value] ?? ""}`}
                placeholder="Search code or name…"
                onFocus={(e) => { setOpen(true); setQ(""); e.currentTarget.select(); }}
                onBlur={() => setOpen(false)}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && list[0]) { onChange(list[0].iso_code); e.currentTarget.blur(); }
                    if (e.key === "Escape") e.currentTarget.blur();
                }}
                className={className}
            />
            {open && (
                <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 shadow-lg">
                    {list.length === 0 && <li className="px-2.5 py-2 text-xs text-zinc-500">No match</li>}
                    {list.map((c) => (
                        <li
                            key={c.iso_code}
                            onMouseDown={(e) => { e.preventDefault(); onChange(c.iso_code); (document.activeElement as HTMLElement | null)?.blur(); }}
                            className={`cursor-pointer px-2.5 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 ${c.iso_code === value ? "bg-[#D97757]/10" : ""}`}
                        >
                            <span className="flex items-center gap-2"><FlagCircle code={c.iso_code} size="h-6 w-6 text-sm" /><span className="font-semibold">{c.iso_code}</span> <span className="text-zinc-500">{c.name}</span></span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function CurrencyWindow({ onClose }: { onClose: () => void }) {
    const { rect, moveHandlers, edgeHandlers } = useFloatingWindow({
        isOpen: true, persistKey: "currency-rates", maxWidth: 520, minWidth: 360, minHeight: 360, initialHeight: 600,
    });
    const [code, setCode] = useState("USD");
    const [amount, setAmount] = useState("1");
    const [toInr, setToInr] = useState(true);
    const [date, setDate] = useState(todayStr);
    const [filter, setFilter] = useState("");
    const [tab, setTab] = useState<"inr" | "cross">("inr");
    const [from, setFrom] = useState("USD");
    const [to, setTo] = useState("EUR");
    const scrollRef = useRef<HTMLDivElement>(null);

    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const { data: currencies } = useSWR<Currency[]>("currency-list", () => currencyApi<Currency[]>("/v2/currencies"), { ...swrOpts, refreshInterval: 0, dedupingInterval: 6 * 60 * 60 * 1000 });
    // One call for all popular currencies → INR (foreign→INR keeps the most significant digits).
    const { data: table, error: tableErr, isLoading: tableLoading, isValidating: tableBusy, mutate } = useSWR<Rate[]>(
        "currency-popular-inr",
        () => Promise.all(POPULAR.map((c) => currencyApi<Rate>(`/v2/rate/${c}/INR`).catch(() => null))).then((r) => r.filter(Boolean) as Rate[]),
        { ...swrOpts, onSuccess: () => setUpdatedAt(new Date()) },
    );
    const { data: pair, error: pairErr, isLoading: pairLoading, isValidating: pairBusy, mutate: mutatePair } = useSWR<Rate>(
        ["currency-pair", code, date],
        () => currencyApi<Rate>(`/v2/rate/${code}/INR`, date ? { date } : {}),
        swrOpts,
    );

    // Other → other goes through INR (foreign→INR rates keep the most significant digits): from/to = fromINR / toINR.
    const crossOn = tab === "cross";
    const { data: fromRate, error: fromErr, isLoading: fromLoading } = useSWR<Rate>(crossOn ? ["currency-pair", from, date] : null, () => currencyApi<Rate>(`/v2/rate/${from}/INR`, { date }), swrOpts);
    const { data: toRate, error: toErr, isLoading: toLoading } = useSWR<Rate>(crossOn ? ["currency-pair", to, date] : null, () => currencyApi<Rate>(`/v2/rate/${to}/INR`, { date }), swrOpts);
    const crossRate = fromRate && toRate ? fromRate.rate / toRate.rate : null;
    const crossLoading = fromLoading || toLoading;
    const crossErr = (fromErr || toErr) as Error | undefined;
    const options = useMemo(() => {
        const list = (currencies ?? []).filter((c) => c.type === "currency" && c.iso_code !== "INR");
        return list.length ? list : POPULAR.map((c) => ({ iso_code: c, name: c, symbol: "", type: "currency" }));
    }, [currencies]);

    const nameOf = (c: string) => (currencies ?? []).find((x) => x.iso_code === c)?.name || FALLBACK_NAMES[c] || c;
    // Popular rates plus the currently selected one (when it isn't already listed), filtered by the search box.
    const rows = useMemo(() => {
        const all = [...(table ?? [])];
        if (pair && (!date || date === todayStr()) && !all.some((r) => r.base === pair.base)) all.unshift(pair);
        const needle = filter.trim().toLowerCase();
        return needle ? all.filter((r) => r.base.toLowerCase().includes(needle) || nameOf(r.base).toLowerCase().includes(needle)) : all;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [table, pair, date, filter, currencies]);
    const busy = tableBusy || pairBusy;
    const refresh = async () => {
        await Promise.all([mutate(), mutatePair()]);
    };
    // Always pull fresh rates when the window opens (don't trust SWR's cached copy from a previous open).
    useEffect(() => { void refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
    const n = parseFloat(amount);
    const crossResult = crossRate != null && Number.isFinite(n) ? n * crossRate : null;
    const result = pair && Number.isFinite(n) ? (toInr ? n * pair.rate : n / pair.rate) : null;
    const field = "w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2.5 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900";

    const resultBox = "font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 min-h-[34px]";
    const dateField = (
        <label className="text-xs text-zinc-500 space-y-1">Rate on date
            <input type="date" value={date} max={todayStr()} onChange={(e) => setDate(e.target.value || todayStr())} className={field} />
        </label>
    );

    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none" role="dialog" aria-modal="false">
            <div
                className="pointer-events-auto absolute flex flex-col overflow-hidden rounded-xl bg-white dark:bg-zinc-900 shadow-2xl"
                style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, border: "2px solid #A78BFA" }}
            >
                <header {...moveHandlers} title="Drag to move" className="relative flex items-center justify-between gap-3 px-4 py-3 cursor-move active:cursor-grabbing select-none touch-none border-b border-zinc-300 dark:border-zinc-600 bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 text-white">
                    <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/25 text-white"><Coins className="h-5 w-5" /></span>
                        <div className="min-w-0">
                            <h2 className="text-base font-bold leading-tight text-white">Currency Rates</h2>
                            <p className="text-xs text-white/85">Reference rates to INR{pair ? ` · as of ${fmtDate(pair.date)}` : ""}</p>
                        </div>
                    </div>
                    <span className="pointer-events-none absolute left-1/2 top-1 h-1 w-10 -translate-x-1/2 rounded-full bg-white/60" aria-hidden />
                    <span className="pointer-events-none hidden sm:flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white/90">
                        <Move className="h-3 w-3" /> Drag to move
                    </span>
                    <button onClick={onClose} aria-label="Close" className="h-8 w-8 flex items-center justify-center rounded-full text-white hover:bg-white/25">
                        <X className="h-4 w-4" />
                    </button>
                </header>

                <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-5 text-zinc-900 dark:text-zinc-100">
                    {/* Converter */}
                    <section className="space-y-3 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50 via-sky-50 to-emerald-50 dark:from-indigo-950/40 dark:via-sky-950/30 dark:to-emerald-950/30 p-3">
                        <div className="flex gap-1 rounded-lg bg-white/70 dark:bg-zinc-800/70 p-1">
                            {([["inr", "INR ⇄ Other"], ["cross", "Other ⇄ Other"]] as const).map(([k, label]) => (
                                <button key={k} onClick={() => setTab(k)}
                                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-bold transition-colors ${tab === k ? "bg-indigo-500 text-white shadow" : "text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40"}`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                        {tab === "inr" ? (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="text-xs text-zinc-500 space-y-1">Currency
                                        <CurrencyPicker value={code} options={options} onChange={setCode} className={field} />
                                    </label>
                                    {dateField}
                                </div>
                                <div className="flex items-end gap-2">
                                    <label className="flex-1 text-xs text-zinc-500 space-y-1">Amount ({toInr ? nameOf(code) : "Indian Rupee"})
                                        <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
                                    </label>
                                    <button onClick={() => setToInr((v) => !v)} title="Swap direction" className="h-[34px] w-9 flex items-center justify-center rounded-md bg-indigo-500 text-white hover:bg-indigo-600">
                                        <ArrowLeftRight className="h-4 w-4" />
                                    </button>
                                    <div className="flex-1 text-xs text-zinc-500 space-y-1">{toInr ? "Indian Rupee" : nameOf(code)}
                                        <div className={`${field} ${resultBox}`}>{pairLoading ? "…" : result != null ? fmt(result, 2) : "—"}</div>
                                    </div>
                                </div>
                                <p className="text-xs text-zinc-500">
                                    {pairLoading ? "Loading rate…" : pairErr ? <span className="text-red-600">{(pairErr as Error).message}</span>
                                        : pair ? `1 ${pair.base} (${nameOf(pair.base)}) = ₹${fmt(pair.rate)} Indian Rupee (rate dated ${fmtDate(pair.date)})` : ""}
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
                                    <label className="text-xs text-zinc-500 space-y-1">From
                                        <CurrencyPicker value={from} options={options} onChange={setFrom} className={field} />
                                    </label>
                                    <button onClick={() => { setFrom(to); setTo(from); }} title="Swap currencies" className="h-[34px] w-9 flex items-center justify-center rounded-md bg-indigo-500 text-white hover:bg-indigo-600">
                                        <ArrowLeftRight className="h-4 w-4" />
                                    </button>
                                    <label className="text-xs text-zinc-500 space-y-1">To
                                        <CurrencyPicker value={to} options={options} onChange={setTo} className={field} />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="text-xs text-zinc-500 space-y-1">Amount ({nameOf(from)})
                                        <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
                                    </label>
                                    {dateField}
                                </div>
                                <div className="text-xs text-zinc-500 space-y-1">{nameOf(to)}
                                    <div className={`${field} ${resultBox}`}>{crossLoading ? "…" : crossResult != null ? fmt(crossResult, 4) : "—"}</div>
                                </div>
                                <p className="text-xs text-zinc-500">
                                    {crossLoading ? "Loading rates…" : crossErr ? <span className="text-red-600">{crossErr.message}</span>
                                        : crossRate != null && fromRate && toRate ? `1 ${from} = ${fmt(crossRate, 6)} ${to} (via INR; ${from} dated ${fmtDate(fromRate.date)}, ${to} dated ${fmtDate(toRate.date)})` : ""}
                                </p>
                            </>
                        )}
                    </section>

                    {/* Popular rates */}
                    <section className="space-y-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#D97757]">Latest rates</h3>
                            <button disabled={busy} onClick={refresh} className="flex items-center gap-1 rounded-full bg-[#D97757]/10 px-2.5 py-1 text-xs font-medium text-[#D97757] hover:bg-[#D97757]/20">
                                <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} /> {busy ? "Refreshing…" : "Refresh"}
                            </button>
                        </div>
                        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter rates by code or name…" className={field} />
                        {tableLoading && !table ? (
                            <div className="flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
                        ) : tableErr || !table?.length ? (
                            <p className="text-sm text-red-600">{(tableErr as Error)?.message || "Rates not available"}</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead><tr className="text-left text-xs text-white bg-zinc-700 dark:bg-zinc-600">
                                    <th className="py-1.5 px-2 font-medium rounded-tl-md">Currency</th><th className="font-medium text-right">1 unit in INR</th><th className="px-2 font-medium text-right rounded-tr-md">Date</th>
                                </tr></thead>
                                <tbody>
                                    {rows.length === 0 && <tr><td colSpan={3} className="py-3 text-center text-xs text-zinc-500">No currency matches “{filter}”</td></tr>}
                                    {rows.map((r) => (
                                        <tr key={r.base} onClick={() => { (tab === "cross" ? setFrom : setCode)(r.base); scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }} className={`cursor-pointer border-b border-zinc-100 dark:border-zinc-800 odd:bg-amber-50/50 dark:odd:bg-zinc-800/40 hover:bg-[#D97757]/10 ${r.base === (tab === "cross" ? from : code) ? "!bg-indigo-100 dark:!bg-indigo-900/40" : ""}`}>
                                            <td className="py-1.5 px-2"><div className="flex items-center gap-2"><FlagCircle code={r.base} /><div><span className="font-semibold">{r.base}</span><span className="block text-[11px] text-zinc-500">{nameOf(r.base)}</span></div></div></td>
                                            <td className="text-right tabular-nums font-bold text-emerald-700 dark:text-emerald-400">₹{fmt(r.rate)}</td>
                                            <td className="px-2 text-right text-xs text-sky-700 dark:text-sky-400">{fmtDate(r.date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <p className="text-[11px] text-zinc-500">{updatedAt ? `Updated ${updatedAt.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })} IST` : "Fetching latest rates…"} · Click a row to use it in the converter.</p>
                    </section>
                </div>
                <ResizeEdges edgeHandlers={edgeHandlers} />
            </div>
        </div>,
        document.body,
    );
}

/** Top-bar currency icon; opens a movable, resizable rates window. Shown only to eligible roles. */
export function CurrencyRatesButton({ user }: { user: string }) {
    const { roles } = useUserRoles(user);
    const [open, setOpen] = useState(false);
    if (!roles.some((r) => CURRENCY_ROLES.includes(r))) return null;
    return (
        <>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => setOpen((v) => !v)}
                        id={CURRENCY_BUTTON_ID}
                        aria-label="Currency rates"
                        className="h-8 w-8 flex items-center justify-center text-[#71717A] hover:text-[#D97757] hover:bg-[#D97757]/10 transition-all rounded-lg border border-transparent hover:border-[#D97757]/20"
                    >
                        <span className="text-[13px] font-extrabold leading-none tracking-tight" aria-hidden>$₹</span>
                    </button>
                </TooltipTrigger>
                <TooltipContent>Currency rates</TooltipContent>
            </Tooltip>
            {open && <CurrencyWindow onClose={() => setOpen(false)} />}
        </>
    );
}

/** "1 USD = ₹93.44 (as of 19/11/2026)" for a non-INR currency; nothing for INR / empty. */
export function CurrencyRateLine({ code }: { code: string }) {
    const on = !!code && code !== "INR";
    const { data, error, isLoading } = useSWR<Rate>(
        on ? ["hint-rate", code] : null,
        () => currencyApi<Rate>(`/v2/rate/${code}/INR`),
        { ...swrOpts, refreshInterval: 0 },
    );
    if (!on) return null;
    if (isLoading) return <span className="block font-semibold">Fetching {code} rate…</span>;
    if (error || !data) return <span className="block">{(error as Error | undefined)?.message || "Rate not available"}</span>;
    return (
        <span className="block font-bold">
            1 {data.base} = ₹{fmt(data.rate)} <span className="font-normal">(as of {fmtDate(data.date)})</span>
        </span>
    );
}

const CURRENCY_BUTTON_ID = "currency-rates-button";
const PULSE = ["ring-2", "ring-[#D97757]", "animate-pulse", "text-[#D97757]"];

/**
 * Slide-in notice from the right, just under the top bar, with an arrow pointing at the currency icon.
 * The icon pulses while it is shown. Renders nothing if the icon isn't on screen (user lacks the role).
 */
export function CurrencyHint({ show, children }: { show: boolean; children: React.ReactNode }) {
    const [dismissed, setDismissed] = useState(false);
    const [entered, setEntered] = useState(false);
    const [anchor, setAnchor] = useState<{ right: number; top: number; iconCenter: number } | null>(null);

    // A fresh "show" (e.g. switching No → Yes again) re-opens a dismissed notice.
    useEffect(() => { if (!show) { setDismissed(false); setEntered(false); } }, [show]);

    const visible = show && !dismissed;
    useLayoutEffect(() => {
        if (!visible) { setAnchor(null); return; }
        const place = () => {
            const el = document.getElementById(CURRENCY_BUTTON_ID);
            if (!el) { setAnchor(null); return; }
            const b = el.getBoundingClientRect();
            setAnchor({ right: 12, top: b.bottom + 12, iconCenter: b.left + b.width / 2 });
        };
        place();
        window.addEventListener("resize", place);
        return () => window.removeEventListener("resize", place);
    }, [visible]);

    // Pulse the icon, and stop once dismissed or the user opens the converter.
    useEffect(() => {
        const el = document.getElementById(CURRENCY_BUTTON_ID);
        if (!visible || !anchor || !el) return;
        el.classList.add(...PULSE);
        const onClick = () => setDismissed(true);
        el.addEventListener("click", onClick);
        return () => { el.classList.remove(...PULSE); el.removeEventListener("click", onClick); };
    }, [visible, anchor]);

    useEffect(() => {
        if (!anchor) return;
        const t = requestAnimationFrame(() => setEntered(true));
        return () => cancelAnimationFrame(t);
    }, [anchor]);

    if (!visible || !anchor) return null;
    const width = Math.min(340, window.innerWidth - 24);
    const arrowLeft = Math.min(Math.max(anchor.iconCenter - (window.innerWidth - anchor.right - width), 16), width - 16);
    return createPortal(
        <div
            role="status"
            style={{ top: anchor.top, right: anchor.right, width }}
            className={`fixed z-[9998] rounded-xl border border-orange-300 bg-orange-50 p-3 pr-8 text-sm text-orange-900 shadow-xl transition-all duration-500 ease-out dark:border-orange-800 dark:bg-orange-950 dark:text-orange-100 ${entered ? "translate-x-0 opacity-100" : "translate-x-[120%] opacity-0"}`}
        >
            {/* Arrow pointing up at the icon */}
            <span
                aria-hidden
                style={{ left: arrowLeft - 8 }}
                className="absolute -top-2 h-4 w-4 rotate-45 border-l border-t border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950"
            />
            <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="absolute right-1.5 top-1.5 rounded-full p-1 text-orange-700 hover:bg-orange-200/60 dark:text-orange-300">
                <X className="h-3.5 w-3.5" />
            </button>
            <p className="leading-snug">{children}</p>
            <button
                onClick={() => { setDismissed(true); document.getElementById(CURRENCY_BUTTON_ID)?.click(); }}
                className="mt-2 rounded-md bg-[#D97757] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#C8664A]"
            >
                Open converter
            </button>
        </div>,
        document.body,
    );
}
