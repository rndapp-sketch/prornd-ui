import type { CSSProperties, ElementType, KeyboardEvent } from "react";
import { AlertCircle } from "lucide-react";
import "./KpiCard.css";

export type KpiTone = "violet" | "amber" | "emerald" | "coral" | "blue";

// Each tone only supplies three tokens; every other style lives in KpiCard.css.
export const KPI_TONES: Record<KpiTone, { primary: string; light: string; accent: string }> = {
    violet: { primary: "#6842D9", light: "#F0EBFF", accent: "#F7F3FF" },
    amber: { primary: "#E99A16", light: "#FFF3D9", accent: "#FFFAEF" },
    emerald: { primary: "#0DA875", light: "#E3F7EF", accent: "#F0FBF6" },
    coral: { primary: "#E94B60", light: "#FFE9ED", accent: "#FFF5F6" },
    blue: { primary: "#4775E8", light: "#EEF3FF", accent: "#F5F8FF" },
};

export interface KpiCardProps {
    title: string;
    /** undefined / NaN renders an em dash */
    value?: number | null;
    /** Pre-formatted value (e.g. "₹1.2Cr", "82%"); shown instead of `value` when given. */
    valueText?: string;
    description: string;
    icon: ElementType;
    tone: KpiTone;
    loading?: boolean;
    /** The data behind this KPI failed to load */
    error?: boolean;
    /** Only pass when the card really navigates somewhere — it becomes a button. */
    onClick?: () => void;
    /** Only pass when real historical data backs it, e.g. "+3 this week". Never fabricate. */
    trend?: string;
    /** Slim single-line card (icon, title, value). The description is kept as a hover tooltip. */
    compact?: boolean;
    /** With `compact`: keep the slim card but use larger title and value text. */
    bigText?: boolean;
}

export function KpiCard({ title, value, valueText, description, icon: Icon, tone, loading, error, onClick, trend, compact, bigText }: KpiCardProps) {
    const t = KPI_TONES[tone];
    const style = {
        "--kpi-primary": t.primary,
        "--kpi-light": t.light,
        "--kpi-accent": t.accent,
    } as CSSProperties;

    const hasValue = valueText !== undefined || (typeof value === "number" && Number.isFinite(value));
    const clickable = !!onClick;

    return (
        <div
            className="kpi-card"
            style={style}
            data-clickable={clickable}
            data-compact={compact ? "true" : undefined}
            data-bigtext={compact && bigText ? "true" : undefined}
            title={compact ? description : undefined}
            role={clickable ? "button" : "group"}
            tabIndex={clickable ? 0 : undefined}
            aria-label={`${title}: ${loading ? "loading" : error ? "unavailable" : hasValue ? (valueText ?? value) : "no data"}`}
            onClick={onClick}
            onKeyDown={clickable ? (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
        >
            <span className="kpi-icon"><Icon className="size-3" strokeWidth={2} /></span>

            <div className="min-w-0 flex-1">
                <span className="kpi-title block truncate">{title}</span>
                {error ? (
                    <span data-error className="kpi-desc inline-flex items-center gap-1 !text-[#E94B60]">
                        <AlertCircle className="size-3" /> Couldn't load
                    </span>
                ) : (
                    <span className="kpi-desc block truncate">{description}</span>
                )}
            </div>

            <div className="flex shrink-0 flex-col items-end gap-0.5">
                {loading ? (
                    <div className="h-5 w-8 animate-pulse rounded-md bg-zinc-200/80 dark:bg-zinc-700/60" />
                ) : (
                    <div className="kpi-value">{error || !hasValue ? "—" : (valueText ?? value)}</div>
                )}
                {trend && !loading && !error && <span className="kpi-trend">{trend}</span>}
            </div>
        </div>
    );
}
