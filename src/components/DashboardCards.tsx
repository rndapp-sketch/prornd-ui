import * as React from "react";
import { cn } from "@/lib/utils";

// Reusable Action Card for primary dashboard actions
export const ActionCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    onClick: () => void;
    className?: string;
}> = ({ icon, title, description, onClick, className }) => (
    <div
        onClick={onClick}
        className={cn(
            "bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm transition-all hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 cursor-pointer group flex flex-col",
            className
        )}
    >
        <div className="flex-shrink-0 flex items-center justify-center size-12 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg border border-zinc-200 dark:border-zinc-700 mb-4 group-hover:bg-[#D97757] group-hover:text-white group-hover:border-[#D97757] transition-all duration-300">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-2 text-zinc-900 dark:text-zinc-100 uppercase">{title}</h3>
        <p className="text-zinc-600 dark:text-zinc-400 flex-grow text-sm font-medium">{description}</p>
    </div>
);

// Reusable Analytics Card for KPIs and stats
export const AnalyticsCard: React.FC<{
    title: string;
    value: string;
    subtitle: string;
    icon: React.ReactNode;
    trend?: string;
    onClick?: () => void;
}> = ({ title, value, subtitle, icon, trend, onClick }) => (
    <div
        onClick={onClick}
        className={cn("p-4 rounded-lg border border-zinc-200 dark:border-zinc-800", onClick ? 'cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800' : '')}
    >
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 uppercase">{title}</h3>
            <div className="text-zinc-500 dark:text-zinc-400">{icon}</div>
        </div>
        <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">{value}</div>
        <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-zinc-600 dark:text-zinc-400 font-medium">{subtitle}</div>
            {trend && (<div className={`text-xs font-bold ${trend.startsWith('+') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{trend}</div>)}
        </div>
    </div>
);

// Reusable Time component
export const CurrentTime = () => {
    const [time, setTime] = React.useState(new Date());
    React.useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);
    return (
        <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 text-right">
            <div>{time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div>{time.toLocaleTimeString()}</div>
        </div>
    );
};