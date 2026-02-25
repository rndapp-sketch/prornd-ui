import React from 'react';
import { cn } from '@/lib/utils';

// Frappe-styled card component (rounded-xl, soft border, subtle shadow)
export const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={cn("bg-white dark:bg-zinc-900 p-6 md:p-8 border border-zinc-300 dark:border-zinc-700 rounded-xl shadow-sm", className)}>
        {children}
    </div>
);

// Frappe-styled button with variants (primary teal, ghost, outline)
export const FrappeButton = ({
    children,
    onClick,
    disabled,
    className,
    type = "button",
    variant = "ghost"
}: {
    children: React.ReactNode;
    onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    className?: string;
    type?: "button" | "submit";
    variant?: "primary" | "ghost" | "outline" | "action";
}) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500",
            // Primary - Bold teal for main actions
            variant === "primary" && "bg-[#0EA5A4] text-white hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border border-[#0D9494]",
            // Ghost - Subtle for secondary actions
            variant === "ghost" && "bg-transparent text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:bg-zinc-700 hover:text-zinc-900 dark:text-zinc-100",
            // Outline - For cancel/back buttons
            variant === "outline" && "bg-white dark:bg-zinc-900 border-2 border-zinc-400 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 hover:border-[#0EA5A4] hover:text-[#0EA5A4] hover:bg-zinc-50 dark:bg-zinc-800/50",
            // Action - High visibility for View/Action buttons
            variant === "action" && "bg-[#0EA5A4] text-white font-bold hover:bg-[#0C8F8E] shadow-md hover:shadow-lg border-2 border-[#0D9494]",
            "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
            className
        )}
    >
        {children}
    </button>
);

// Legacy aliases for backward compatibility
export const NeoCard = FrappeCard;
export const NeoButton = FrappeButton;
