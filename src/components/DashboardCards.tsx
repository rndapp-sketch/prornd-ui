import * as React from "react";
import { cn } from "@/lib/utils";

// KPI / Analytics card — matches DirectorDashboard KpiCard pattern exactly
export const AnalyticsCard: React.FC<{
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    trend?: string;
    onClick?: () => void;
    accentColor?: string;
    /** Optional badge row (dot + label + count chips below the value) */
    badges?: Array<{
        label: string;
        count: number | string;
        dotColor: string;
        bgClass: string;
        textClass: string;
    }>;
}> = ({ title, value, subtitle, icon, trend, onClick, accentColor = "#2563EB", badges }) => (
    <div
        onClick={onClick}
        className={cn(
            "bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46]",
            "rounded-2xl p-6 relative overflow-hidden flex flex-col min-h-[160px]",
            "transition-all duration-150",
            onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md select-none"
        )}
    >
        {/* Decorative circle — bottom-right, low opacity, matches DirectorDashboard */}
        <div
            className="absolute bottom-0 right-0 w-[90px] h-[90px] rounded-full translate-x-5 translate-y-5 pointer-events-none"
            style={{ backgroundColor: accentColor, opacity: 0.07 }}
        />

        {/* Icon */}
        <div
            className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 shrink-0"
            style={{
                backgroundColor: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
                color: accentColor,
            }}
        >
            {icon}
        </div>

        {/* Label */}
        <div className="text-[12px] font-extrabold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-widest mb-0.5">
            {title}
        </div>

        {/* Value */}
        <div
            className="text-[32px] font-extrabold tracking-tight leading-none mb-2"
            style={{ color: accentColor }}
        >
            {value}
        </div>

        {/* Badges or subtext */}
        <div className="mt-auto pt-3 w-full">
            {badges && badges.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                    {badges.map((b) => (
                        <span
                            key={b.label}
                            className={cn(
                                "inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-1 rounded-md",
                                "shadow-sm border border-black/5 dark:border-white/5",
                                b.bgClass, b.textClass
                            )}
                        >
                            <span className={cn("w-2 h-2 rounded-full", b.dotColor)} />
                            {b.count} {b.label}
                        </span>
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    <div className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] font-semibold leading-tight">
                        {subtitle || " "}
                    </div>
                    {trend && (
                        <div className={cn(
                            "text-[11px] font-bold px-2 py-0.5 rounded-full",
                            trend.startsWith("+")
                                ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20"
                                : "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20"
                        )}>
                            {trend}
                        </div>
                    )}
                </div>
            )}
        </div>
    </div>
);

// Action card for quick-navigation tiles on dashboards
export const ActionCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    className?: string;
    accentColor?: string;
}> = ({ icon, title, description, onClick, className, accentColor = "#2563EB" }) => (
    <div
        onClick={onClick}
        className={cn(
            "relative bg-white dark:bg-[#27272A] rounded-2xl",
            "border border-[#E4E4E7] dark:border-[#3F3F46]",
            "shadow-sm hover:shadow-md transition-all duration-150 cursor-pointer group",
            "hover:-translate-y-0.5 overflow-hidden",
            className
        )}
    >
        {/* Top-edge accent line on hover */}
        <div
            className="absolute top-0 left-0 right-0 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{ background: `linear-gradient(90deg, ${accentColor}, transparent)` }}
        />
        <div className="p-5 flex flex-col h-full">
            <div
                className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl mb-4 transition-transform duration-200 group-hover:scale-105"
                style={{
                    background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
                    color: accentColor,
                }}
            >
                {icon}
            </div>
            <h3 className="text-sm font-bold mb-1.5 text-[#3F3F46] dark:text-[#E4E4E7] tracking-tight">
                {title}
            </h3>
            <p className="text-[#71717A] dark:text-[#A1A1AA] flex-grow text-xs leading-relaxed">
                {description}
            </p>
        </div>
    </div>
);

// Live clock widget — matches DirectorDashboard header clock
export const CurrentTime = () => {
    const [time, setTime] = React.useState(new Date());
    React.useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return (
        <div className="flex items-center gap-1.5 text-[11px] text-[#71717A] dark:text-[#A1A1AA] font-mono bg-white dark:bg-[#27272A] px-3 py-1.5 rounded-full border border-[#E4E4E7] dark:border-[#3F3F46]">
            {time.toLocaleTimeString()}
            <span className="hidden sm:inline text-[#A1A1AA] dark:text-[#71717A]">
                · {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
        </div>
    );
};

// Section divider — matches DirectorDashboard SectionDivider exactly
export const SectionDivider: React.FC<{ title: string; className?: string }> = ({ title, className }) => (
    <div className={cn("flex items-center gap-2.5 mb-3 mt-1", className)}>
        <span className="text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.1em] whitespace-nowrap">
            {title}
        </span>
        <div className="flex-1 h-[1px] bg-[#E4E4E7] dark:bg-[#3F3F46]" />
    </div>
);
