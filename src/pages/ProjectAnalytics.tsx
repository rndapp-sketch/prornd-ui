import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useFrappeAuth, useFrappeGetCall } from 'frappe-react-sdk';
import { AppSidebar } from "../components/RndSidebar";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { ArrowLeft, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";
import { GlobalLoader } from '@/components/ui/global-loader';

// --- Components ---

const StatCard = ({ title, value, icon, colorClass }: { title: string; value: string | number; icon: React.ReactNode; colorClass?: string }) => (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center justify-between">
        <div>
            <h3 className="text-sm font-bold text-neutral-600 uppercase mb-1">{title}</h3>
            <div className={cn("text-3xl font-black", colorClass)}>{value}</div>
        </div>
        <div className="p-3 bg-neutral-100 rounded-full border border-zinc-200 dark:border-zinc-800">
            {icon}
        </div>
    </div>
);

const ProjectAnalytics = () => {
    const navigate = useNavigate();
    const { currentUser } = useFrappeAuth();

    // Fetch analytics data from the backend
    const { data, isLoading: isAnalyticsLoading, error } = useFrappeGetCall<{
        message: {
            stats: { total: number; active: number; completed: number; pending: number };
            charts: {
                status: { name: string; value: number; color: string }[];
                year: { year: string; projects: number }[];
                funding: { name: string; value: number; color: string }[];
            };
        }
    }>('prornd.api.get_project_analytics', { user: currentUser });

    if (isAnalyticsLoading) {
        return <GlobalLoader isLoading={true} />;
    }

    if (error) {
        console.error("Error fetching analytics:", error);
        // Fallback or error state could be added here
    }

    const analyticsData = data?.message;
    const stats = analyticsData?.stats || { total: 0, active: 0, completed: 0, pending: 0 };
    const charts = analyticsData?.charts || { status: [], year: [], funding: [] };

    return (
        <div className="bg-claude-bg min-h-screen font-sans">
            <AppSidebar />
            <div className="flex-1 p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <header className="mb-8 flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-[2px_2px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                        >
                            <ArrowLeft className="size-6" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-extrabold text-zinc-900 dark:text-zinc-100 uppercase">Project Analytics</h1>
                            <p className="text-lg text-neutral-700 font-mono">Insights and performance metrics</p>
                        </div>
                    </header>

                    {/* Stats Grid */}
                    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard title="Total Projects" value={stats.total} icon={<FileText className="size-6" />} />
                        <StatCard title="Active Projects" value={stats.active} icon={<Clock className="size-6 text-green-600" />} colorClass="text-green-600" />
                        <StatCard title="Completed" value={stats.completed} icon={<CheckCircle className="size-6 text-blue-600" />} colorClass="text-blue-600" />
                        <StatCard title="Pending Review" value={stats.pending} icon={<AlertCircle className="size-6 text-amber-600" />} colorClass="text-amber-600" />
                    </section>

                    {/* Charts Section */}
                    <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

                        {/* Projects by Status (Pie Chart) */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 uppercase mb-6">Project Status Distribution</h3>
                            <div className="h-[300px] w-full">
                                {charts.status.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={charts.status}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                                                outerRadius={100}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {charts.status.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#000" strokeWidth={2} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: '2px solid #000', boxShadow: '4px 4px 0px rgba(0,0,0,0.25)' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 font-mono">No data available</div>
                                )}
                            </div>
                        </div>

                        {/* Projects Trend (Bar Chart) */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 uppercase mb-6">Projects Initiated by Year</h3>
                            <div className="h-[300px] w-full">
                                {charts.year.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={charts.year}
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                                            <XAxis dataKey="year" stroke="#000" tick={{ fill: '#000', fontWeight: 'bold' }} />
                                            <YAxis stroke="#000" tick={{ fill: '#000', fontWeight: 'bold' }} />
                                            <Tooltip
                                                cursor={{ fill: '#f3f4f6' }}
                                                contentStyle={{ borderRadius: '8px', border: '2px solid #000', boxShadow: '4px 4px 0px rgba(0,0,0,0.25)' }}
                                            />
                                            <Bar dataKey="projects" fill="#000" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 font-mono">No data available</div>
                                )}
                            </div>
                        </div>

                        {/* Funding Source (Pie Chart) */}
                        <div className="bg-white dark:bg-zinc-900 p-6 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-sm lg:col-span-2">
                            <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 uppercase mb-6">Funding Sources</h3>
                            <div className="h-[300px] w-full">
                                {charts.funding.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            layout="vertical"
                                            data={charts.funding}
                                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e5e5" />
                                            <XAxis type="number" stroke="#000" tick={{ fill: '#000', fontWeight: 'bold' }} />
                                            <YAxis dataKey="name" type="category" stroke="#000" tick={{ fill: '#000', fontWeight: 'bold' }} width={100} />
                                            <Tooltip
                                                cursor={{ fill: '#f3f4f6' }}
                                                contentStyle={{ borderRadius: '8px', border: '2px solid #000', boxShadow: '4px 4px 0px rgba(0,0,0,0.25)' }}
                                            />
                                            <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                                                {charts.funding.map((entry: any, index: number) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#000" strokeWidth={2} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="flex items-center justify-center h-full text-zinc-500 dark:text-zinc-400 font-mono">No data available</div>
                                )}
                            </div>
                        </div>

                    </section>
                </div>
            </div>
        </div>
    );
};

export default ProjectAnalytics;
