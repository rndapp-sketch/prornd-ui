import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { LayersIcon, ChevronDownIcon, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleFilterSelectProps {
    /** Currently selected module, or `allValue` when no filter is applied. */
    value: string;
    onChange: (value: string) => void;
    modules: string[];
    /** Per-module task count, used for the small count badge next to each option. */
    counts: Record<string, number>;
    /** Total across every module, shown next to "All Modules". */
    totalCount: number;
    /** The value that means "no filter" — pages differ ('all' vs ''). */
    allValue: string;
    className?: string;
}

// Radix Select reserves the empty string internally for "no selection", so it refuses an
// <Item value=""> outright — TaskRegistry's allValue is "". Every "all modules" selection is
// carried over the wire as this sentinel instead, and translated back at the onChange boundary.
const ALL_SENTINEL = "__all_modules__";

/**
 * A purpose-built module filter for the Pending Task / Task Registry tables —
 * a plain <select> can't show per-module counts or brand styling, and the
 * generic ui/select.tsx is too neutral for this page's frappe-card look.
 */
export const ModuleFilterSelect: React.FC<ModuleFilterSelectProps> = ({
    value,
    onChange,
    modules,
    counts,
    totalCount,
    allValue,
    className,
}) => {
    const isAll = value === allValue;
    const displayLabel = isAll ? "All Modules" : value;

    return (
        <SelectPrimitive.Root
            value={isAll ? ALL_SENTINEL : value}
            onValueChange={(next) => onChange(next === ALL_SENTINEL ? allValue : next)}
        >
            <SelectPrimitive.Trigger
                className={cn(
                    "group inline-flex h-10 min-w-[180px] items-center gap-2 rounded-lg border pl-3 pr-2.5",
                    "bg-white dark:bg-zinc-800 text-sm font-semibold",
                    "border-zinc-200 dark:border-zinc-600 text-zinc-700 dark:text-zinc-200",
                    "shadow-sm transition-all duration-150",
                    "hover:border-[#D97757]/50 hover:shadow-md",
                    "focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757]",
                    "data-[state=open]:border-[#D97757] data-[state=open]:ring-2 data-[state=open]:ring-[#D97757]/30",
                    className,
                )}
            >
                <LayersIcon className="h-3.5 w-3.5 flex-shrink-0 text-[#D97757]" />
                <SelectPrimitive.Value asChild>
                    <span className="flex-1 truncate text-left">{displayLabel}</span>
                </SelectPrimitive.Value>
                <SelectPrimitive.Icon asChild>
                    <ChevronDownIcon className="h-3.5 w-3.5 flex-shrink-0 text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180 group-data-[state=open]:text-[#D97757]" />
                </SelectPrimitive.Icon>
            </SelectPrimitive.Trigger>

            <SelectPrimitive.Portal>
                <SelectPrimitive.Content
                    position="popper"
                    sideOffset={6}
                    className={cn(
                        "z-50 min-w-[240px] max-h-80 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-600",
                        "bg-white dark:bg-zinc-900 shadow-xl shadow-zinc-900/10 dark:shadow-black/40",
                        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
                        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
                        "data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1",
                    )}
                >
                    <div className="px-3 py-2.5 border-b border-zinc-100 dark:border-zinc-800 bg-[#EEF2FF]/60 dark:bg-[#1E3A8A]/10">
                        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#1E3A8A] dark:text-[#C7D2FE]">
                            Filter by Module
                        </p>
                    </div>
                    <SelectPrimitive.Viewport className="p-1.5 max-h-64 overflow-y-auto">
                        <SelectItem value={ALL_SENTINEL} count={totalCount} label="All Modules" isAllOption />
                        {modules.map((module) => (
                            <SelectItem key={module} value={module} count={counts[module] ?? 0} label={module} />
                        ))}
                    </SelectPrimitive.Viewport>
                </SelectPrimitive.Content>
            </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
    );
};

const SelectItem: React.FC<{ value: string; label: string; count: number; isAllOption?: boolean }> = ({
    value,
    label,
    count,
    isAllOption,
}) => (
    <SelectPrimitive.Item
        value={value}
        className={cn(
            "relative flex cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-sm outline-none",
            "text-zinc-700 dark:text-zinc-300",
            "data-[highlighted]:bg-[#FFF3ED] dark:data-[highlighted]:bg-[#D97757]/10 data-[highlighted]:text-[#D97757]",
            "data-[state=checked]:font-semibold data-[state=checked]:text-[#D97757]",
            isAllOption && "mb-1 border-b border-zinc-100 dark:border-zinc-800 pb-2.5 rounded-b-none",
        )}
    >
        <span className="flex items-center gap-2 min-w-0">
            <span className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center">
                <SelectPrimitive.ItemIndicator asChild>
                    <CheckIcon className="h-3.5 w-3.5" />
                </SelectPrimitive.ItemIndicator>
            </span>
            <span className="truncate">
                <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
            </span>
        </span>
        <span
            className={cn(
                "flex-shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
            )}
        >
            {count}
        </span>
    </SelectPrimitive.Item>
);
