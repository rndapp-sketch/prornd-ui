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
            "bg-white p-6 rounded-lg border border-gray-200 shadow-sm transition-all hover:shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:translate-x-[2px] hover:translate-y-[2px] cursor-pointer group flex flex-col",
            className
        )}
    >
        <div className="flex-shrink-0 flex items-center justify-center size-12 bg-black text-white rounded-lg border border-gray-200 mb-4">
            {icon}
        </div>
        <h3 className="text-xl font-bold mb-2 text-black uppercase">{title}</h3>
        <p className="text-neutral-700 flex-grow text-sm font-mono">{description}</p>
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
        className={cn("p-4 rounded-lg border border-gray-200", onClick ? 'cursor-pointer hover:bg-[#F0F4F8]' : '')}
    >
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-bold text-black uppercase">{title}</h3>
            <div className="text-black">{icon}</div>
        </div>
        <div className="text-3xl font-bold text-black">{value}</div>
        <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-neutral-600 font-mono">{subtitle}</div>
            {trend && (<div className={`text-xs font-bold ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>{trend}</div>)}
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
        <div className="font-mono text-sm text-neutral-700 text-right">
            <div>{time.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div>{time.toLocaleTimeString()}</div>
        </div>
    );
};