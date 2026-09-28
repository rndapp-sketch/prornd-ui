import React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeAuth, useFrappeGetDoc, useFrappeGetCall } from "frappe-react-sdk";
import { CurrentTime } from "../../components/DashboardCards";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
    Briefcase, AlertCircle,
    Mail, LayoutGrid, ArrowUpRight,
    PlusCircle, Building2, CheckCircle2, FileClock,
} from "lucide-react";

// --- Interfaces ---
interface ProjectSummary {
    name: string;
    project_title?: string;
    project_no?: string;
    status?: string;
}

interface IndependentResearcherDashboardData {
    projects?: ProjectSummary[];
    total_projects?: number;
}

// --- Helpers ---
const initialsOf = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "?";

const STATUS_CHART_COLORS: Record<string, string> = {
    draft: "#A1A1AA",
    pending: "#D97757",
    active: "#4A6CF7",
    approved: "#10B981",
    completed: "#10B981",
    rejected: "#EF4444",
    other: "#8B5CF6",
};

const bucketStatus = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("draft")) return "draft";
    if (s.includes("reject")) return "rejected";
    if (s.includes("approve") || s.includes("complete")) return "approved";
    if (s.includes("pending") || s.includes("review")) return "pending";
    if (s.includes("active") || s.includes("progress")) return "active";
    return "other";
};

// Small, uniform tile used for both quick actions and stats
const MiniCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value?: string;
    hint?: string;
    accentColor: string;
    onClick?: () => void;
}> = ({ icon, label, value, hint, accentColor, onClick }) => (
    <div
        onClick={onClick}
        className={cn(
            "bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46]",
            "rounded-lg p-4 flex flex-col gap-3 min-h-[104px] transition-all duration-150",
            onClick && "cursor-pointer hover:border-[#D4D4D8] dark:hover:border-[#52525B] hover:-translate-y-px group",
        )}
    >
        <div className="flex items-center justify-between">
            <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `color-mix(in srgb, ${accentColor} 12%, transparent)`, color: accentColor }}
            >
                {icon}
            </div>
            {onClick && (
                <ArrowUpRight className="h-4 w-4 text-[#D4D4D8] group-hover:text-[#A1A1AA] transition-colors" />
            )}
        </div>
        <div>
            {value !== undefined ? (
                <div className="text-2xl font-extrabold leading-none text-[#3F3F46] dark:text-[#E4E4E7]">{value}</div>
            ) : null}
            <div className={cn("text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]", value !== undefined && "mt-1.5 font-semibold text-[#71717A] dark:text-[#A1A1AA]")}>
                {label}
            </div>
            {hint && <div className="text-[11px] text-[#A1A1AA] mt-0.5 truncate">{hint}</div>}
        </div>
    </div>
);

// --- Main Component ---
export function IndependentResearcherDashboard() {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();
    const { data: userData } = useFrappeGetDoc("User", currentUser ?? "", currentUser ? undefined : null);

    // Mentor: the current user's "piheadmentor_user_id" (User doctype) points at their mentor's user id
    const { data: mentorIdResp, isLoading: mentorIdLoading } = useFrappeGetCall<{
        message: { piheadmentor_user_id?: string };
    }>(
        "frappe.client.get_value",
        { doctype: "User", filters: currentUser, fieldname: "piheadmentor_user_id" },
        currentUser ? undefined : null,
        { revalidateOnFocus: false },
    );
    const mentorUserId = mentorIdResp?.message?.piheadmentor_user_id;
    const { data: mentorDoc, isLoading: mentorDocLoading } = useFrappeGetDoc(
        "User",
        mentorUserId ?? "",
        mentorUserId ? undefined : null,
    );
    const mentor = mentorUserId && mentorDoc
        ? {
            name: mentorUserId,
            full_name: mentorDoc.full_name,
            department: mentorDoc.department,
            email: mentorUserId,
        }
        : undefined;
    const mentorLoading = mentorIdLoading || (!!mentorUserId && mentorDocLoading);

    // Own-project summary
    const { data: dashboardResp, isLoading: dashboardLoading } = useFrappeGetCall<{
        message: IndependentResearcherDashboardData | null;
    }>(
        "rndopsapp.dashboard.get_independent_researcher_dashboard_data",
        { user: currentUser },
        currentUser ? undefined : null,
        { revalidateOnFocus: false },
    );
    const projects = React.useMemo(() => dashboardResp?.message?.projects ?? [], [dashboardResp]);

    const fullName = userData?.full_name || currentUser || "Guest";
    const totalProjects = dashboardResp?.message?.total_projects ?? projects.length;

    // Project status donut
    const projectStatusChart = React.useMemo(() => {
        const counts: Record<string, number> = {};
        projects.forEach((p) => {
            const bucket = bucketStatus(p.status);
            counts[bucket] = (counts[bucket] || 0) + 1;
        });
        return Object.entries(counts).map(([bucket, count]) => ({
            name: bucket.charAt(0).toUpperCase() + bucket.slice(1),
            value: count,
            color: STATUS_CHART_COLORS[bucket] || STATUS_CHART_COLORS.other,
        }));
    }, [projects]);

    const activeProjects = React.useMemo(
        () => projects.filter((p) => ["active", "pending"].includes(bucketStatus(p.status))).length,
        [projects],
    );
    const completedProjects = React.useMemo(
        () => projects.filter((p) => bucketStatus(p.status) === "approved").length,
        [projects],
    );

    const mentorName = mentor?.full_name || mentor?.name || "";

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans transition-colors duration-300">
            <main className="px-6 md:px-10 pt-7 pb-12 overflow-y-auto w-full">
                <div className="w-full max-w-[1600px] mx-auto">

                    {/* Header */}
                    <header className="mb-6 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#A1A1AA] mb-1">
                                Independent Researcher
                            </div>
                            <h1 className="text-xl font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                Welcome back, <span className="text-[#D97757]">{fullName}</span>
                            </h1>
                        </div>
                        <CurrentTime />
                    </header>

                    {/* Mentor strip */}
                    <section className="mb-6 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg px-5 py-4">
                        {mentorLoading ? (
                            <p className="text-xs text-[#A1A1AA]">Loading mentor details…</p>
                        ) : !mentor ? (
                            <div className="flex items-center gap-2.5 text-xs text-[#71717A] dark:text-[#A1A1AA]">
                                <AlertCircle className="h-4 w-4 text-[#D97757] flex-shrink-0" />
                                No mentor linked yet — every project you register must have a mentor.
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 flex-wrap">
                                <div className="w-9 h-9 rounded-full bg-[#D97757] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                    {initialsOf(mentorName)}
                                </div>
                                <div className="min-w-0 mr-auto">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-[9px] font-bold uppercase tracking-wide text-[#D97757]">Mentor</span>
                                        <span className="text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7] truncate">
                                            {mentorName || "—"}
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] truncate">
                                        {mentor.designation || "Permanent Employee"}
                                    </div>
                                </div>
                                {mentor.department && (
                                    <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                        <Building2 className="h-3 w-3" /> {mentor.department}
                                    </div>
                                )}
                                {mentor.email && (
                                    <div className="hidden md:flex items-center gap-1.5 text-[11px] text-[#71717A] dark:text-[#A1A1AA]">
                                        <Mail className="h-3 w-3" /> {mentor.email}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* Card grid: actions + stats */}
                    <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                        <MiniCard
                            icon={<PlusCircle className="h-[18px] w-[18px]" />}
                            label="Register Project"
                            accentColor="#D97757"
                            onClick={() => navigate("/project-registration")}
                        />
                        <MiniCard
                            icon={<LayoutGrid className="h-[18px] w-[18px]" />}
                            label="My Projects"
                            accentColor="#4A6CF7"
                            onClick={() => navigate("/projects-view")}
                        />
                        <MiniCard
                            icon={<Briefcase className="h-[18px] w-[18px]" />}
                            label="Total Projects"
                            value={dashboardLoading ? "—" : String(totalProjects)}
                            accentColor="#D97757"
                        />
                        <MiniCard
                            icon={<FileClock className="h-[18px] w-[18px]" />}
                            label="In Progress"
                            value={dashboardLoading ? "—" : String(activeProjects)}
                            accentColor="#4A6CF7"
                        />
                        <MiniCard
                            icon={<CheckCircle2 className="h-[18px] w-[18px]" />}
                            label="Completed"
                            value={dashboardLoading ? "—" : String(completedProjects)}
                            accentColor="#10B981"
                        />
                    </section>

                    {/* Project Status */}
                    <section className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg p-5">
                        <h3 className="text-[12px] font-bold uppercase tracking-wide text-[#71717A] dark:text-[#A1A1AA] mb-4">
                            Project Status
                        </h3>
                        {dashboardLoading ? (
                            <p className="text-xs text-[#A1A1AA] py-6">Loading…</p>
                        ) : projectStatusChart.length === 0 ? (
                            <p className="text-xs text-[#A1A1AA] py-6">No projects registered yet.</p>
                        ) : (
                            <div className="flex items-center gap-6">
                                <div className="w-[96px] h-[96px] flex-shrink-0 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={projectStatusChart}
                                                dataKey="value"
                                                nameKey="name"
                                                innerRadius={30}
                                                outerRadius={46}
                                                paddingAngle={2}
                                                stroke="none"
                                            >
                                                {projectStatusChart.map((entry) => (
                                                    <Cell key={entry.name} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <span className="text-base font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                            {totalProjects}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-wrap gap-x-6 gap-y-2">
                                    {projectStatusChart.map((entry) => (
                                        <div key={entry.name} className="flex items-center gap-2 text-xs">
                                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                                            <span className="text-[#71717A] dark:text-[#A1A1AA]">{entry.name}</span>
                                            <span className="font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Footer */}
                    <footer className="text-center text-[#A1A1AA] mt-6 pb-2">
                        <p className="text-[11px]">
                            For any query, e-mail to <a href="mailto:ernd@iitg.ac.in" className="text-[#D97757] hover:underline font-semibold">ernd@iitg.ac.in</a>
                        </p>
                    </footer>
                </div>
            </main>
        </div>
    );
}
