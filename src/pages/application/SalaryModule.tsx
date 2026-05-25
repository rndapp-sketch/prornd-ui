import React, { useMemo, useState } from "react";
import { useFrappeAuth } from "frappe-react-sdk";
import {
    ArrowRight,
    Banknote,
    CalendarDays,
    CheckCircle2,
    Download,
    FileSpreadsheet,
    IndianRupee,
    LockKeyhole,
    Search,
    ShieldCheck,
    UserRoundCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SalaryStage = "draft" | "review" | "approved" | "released";

type SalaryWorkItem = {
    title: string;
    owner: string;
    status: SalaryStage;
    period: string;
    amount: string;
};

const stageClasses: Record<SalaryStage, string> = {
    draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
    review: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
    approved: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    released: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
};

const workItems: SalaryWorkItem[] = [
    {
        title: "Project staff payroll",
        owner: "RnD Establishment",
        status: "review",
        period: "Current month",
        amount: "Pending",
    },
    {
        title: "Honorarium salary-linked payouts",
        owner: "Accounts",
        status: "approved",
        period: "Current month",
        amount: "Ready",
    },
    {
        title: "Bank transfer statement",
        owner: "Finance",
        status: "draft",
        period: "Current cycle",
        amount: "Not generated",
    },
];

const salaryAreas = [
    {
        title: "Payroll Preparation",
        detail: "Build monthly salary batches for project staff records.",
        icon: FileSpreadsheet,
        accent: "#2563EB",
    },
    {
        title: "Approval Queue",
        detail: "Track salary files waiting for establishment and finance review.",
        icon: ShieldCheck,
        accent: "#D97757",
    },
    {
        title: "Release Register",
        detail: "Review released salary statements and transfer references.",
        icon: Banknote,
        accent: "#059669",
    },
];

const formatPeriod = () => {
    const now = new Date();
    return now.toLocaleString("en-IN", { month: "long", year: "numeric" });
};

const StatCard = ({
    label,
    value,
    subtitle,
    icon: Icon,
    accent,
}: {
    label: string;
    value: string;
    subtitle: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: string;
}) => (
    <div className="relative flex min-h-[150px] flex-col overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-[#3F3F46] dark:bg-[#27272A]">
        <div
            className="pointer-events-none absolute bottom-0 right-0 h-[90px] w-[90px] translate-x-5 translate-y-5 rounded-full opacity-[0.07]"
            style={{ backgroundColor: accent }}
        />
        <div
            className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${accent}1A`, color: accent }}
        >
            <Icon className="h-[18px] w-[18px]" />
        </div>
        <div className="mb-1 text-[12px] font-extrabold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">
            {label}
        </div>
        <div className="text-[32px] font-extrabold leading-none tracking-tight" style={{ color: accent }}>
            {value}
        </div>
        <div className="mt-auto pt-3 text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
            {subtitle}
        </div>
    </div>
);

const SalaryModule: React.FC = () => {
    const { currentUser } = useFrappeAuth();
    const [query, setQuery] = useState("");
    const period = useMemo(() => formatPeriod(), []);
    const filteredItems = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return workItems;
        return workItems.filter((item) =>
            `${item.title} ${item.owner} ${item.period} ${item.status}`.toLowerCase().includes(q),
        );
    }, [query]);

    return (
        <div className="min-h-screen bg-[#FAFAF9] font-sans dark:bg-[#18181B]">
            <div className="mx-auto max-w-[1600px] px-6 pb-10 pt-7 md:px-8">
                <header className="mb-6 overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#2563EB] dark:bg-[#4A6CF7]/15 dark:text-[#93C5FD]">
                                <IndianRupee className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <div className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
                                    Payroll Workspace
                                </div>
                                <h1 className="truncate text-[22px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7]">
                                    Salary Module
                                </h1>
                                <p className="mt-0.5 truncate text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                    {period} · {currentUser || "Current user"}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] px-3 text-[12px] font-bold text-[#3F3F46] shadow-sm transition-colors hover:border-[#4A6CF7]/40 hover:bg-[#EEF2FF] hover:text-[#2563EB] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Export
                            </button>
                            <button
                                type="button"
                                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#D97757] px-4 text-[12px] font-bold text-white shadow-sm transition-colors hover:bg-[#c5684a]"
                            >
                                Open Register
                                <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="mb-6 grid gap-4 md:grid-cols-3">
                    <StatCard
                        label="Active Period"
                        value={period.split(" ")[0]}
                        subtitle={period}
                        icon={CalendarDays}
                        accent="#2563EB"
                    />
                    <StatCard
                        label="Ready Items"
                        value="2"
                        subtitle="Items ready for review or release"
                        icon={CheckCircle2}
                        accent="#059669"
                    />
                    <StatCard
                        label="Access Mode"
                        value="SSO"
                        subtitle="Uses authenticated ProRnD session"
                        icon={LockKeyhole}
                        accent="#D97757"
                    />
                </div>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
                    <section className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                        <div className="flex flex-col gap-3 border-b border-[#E4E4E7] bg-[#FAFAF9] px-[22px] py-[14px] dark:border-[#3F3F46] dark:bg-[#27272A] md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center gap-2 text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-[#2563EB] dark:bg-blue-950/20">
                                    <FileSpreadsheet className="h-3.5 w-3.5" />
                                </div>
                                Salary Work Queue
                            </div>
                            <div className="relative w-full md:w-72">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#A1A1AA]" />
                                <input
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="Search salary items"
                                    className="h-9 w-full rounded-lg border border-[#E4E4E7] bg-white pl-9 pr-3 text-[12px] font-semibold text-[#3F3F46] outline-none transition-colors placeholder:text-[#A1A1AA] focus:border-[#4A6CF7] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]"
                                />
                            </div>
                        </div>
                        <div className="divide-y divide-[#F4F4F5] dark:divide-[#3F3F46]">
                            {filteredItems.map((item) => (
                                <div
                                    key={item.title}
                                    className="grid gap-3 px-5 py-4 transition-colors hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] md:grid-cols-[minmax(0,1fr)_140px_120px]"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate text-[13px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                            {item.title}
                                        </p>
                                        <p className="mt-0.5 truncate text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA]">
                                            {item.owner} · {item.period}
                                        </p>
                                    </div>
                                    <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                        {item.amount}
                                    </div>
                                    <div>
                                        <span
                                            className={cn(
                                                "inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide",
                                                stageClasses[item.status],
                                            )}
                                        >
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    <aside className="space-y-5">
                        <section className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                            <div className="border-b border-[#E4E4E7] bg-[#FAFAF9] px-[22px] py-[14px] dark:border-[#3F3F46] dark:bg-[#27272A]">
                                <div className="flex items-center gap-2 text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20">
                                        <UserRoundCheck className="h-3.5 w-3.5" />
                                    </div>
                                    Salary Areas
                                </div>
                            </div>
                            <div className="space-y-3 p-[18px]">
                                {salaryAreas.map((area) => {
                                    const Icon = area.icon;
                                    return (
                                        <button
                                            key={area.title}
                                            type="button"
                                            className="flex w-full items-start gap-3 rounded-xl border border-[#E4E4E7] bg-white p-3 text-left transition-colors hover:border-[#4A6CF7]/40 hover:bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#18181B] dark:hover:bg-[#27272A]"
                                        >
                                            <span
                                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                                                style={{ backgroundColor: `${area.accent}1A`, color: area.accent }}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                    {area.title}
                                                </span>
                                                <span className="mt-0.5 block text-[11px] font-medium leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">
                                                    {area.detail}
                                                </span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default SalaryModule;
