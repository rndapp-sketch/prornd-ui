import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFrappePostCall } from "frappe-react-sdk";
import { ChevronRight, Plus, Loader2, Mail, RefreshCw, Search, Users } from "lucide-react";
import { getFileUrl } from "@/utils/fileUtils";
import { projectStaffDetailsAPI } from "@/services/apiService";

// The list endpoint returns a fixed field set; every column below is optional so the
// page keeps working if the backend adds or drops fields.
interface StaffRow {
    name: string;
    ps_emp_id?: string;
    ps_first_name?: string;
    ps_middle_name?: string;
    ps_last_name?: string;
    erp_mail?: string;
    ps_designation?: string;
    ps_department?: string;
    ps_photo?: string;
    project_no?: string;
    pstd_joining_date?: string;
    workflow_state?: string;
    docstatus?: number;
    [key: string]: unknown;
}

const fullName = (r: StaffRow) =>
    [r.ps_first_name, r.ps_middle_name, r.ps_last_name].filter(Boolean).join(" ").trim() ||
    String(r.ps_name ?? r.full_name ?? r.employee_name ?? "");

const PAGE_SIZES = [25, 50, 100];

const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg)$/i;

// Stable colour per person for the initials avatar.
const AVATAR_TONES = [
    "from-blue-500 to-blue-700",
    "from-emerald-500 to-emerald-700",
    "from-violet-500 to-violet-700",
    "from-amber-500 to-orange-600",
    "from-rose-500 to-rose-700",
    "from-cyan-500 to-cyan-700",
];

const toneFor = (key: string) => {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    return AVATAR_TONES[h % AVATAR_TONES.length];
};

const initialsOf = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "PS";

// Shows the staff photo when the list returns one, otherwise coloured initials.
const Avatar = ({ row }: { row: StaffRow }) => {
    const name = fullName(row);
    const photo = typeof row.ps_photo === "string" && IMAGE_RE.test(row.ps_photo) ? getFileUrl(row.ps_photo) : "";
    const [broken, setBroken] = useState(false);
    if (photo && !broken) {
        return (
            <img
                src={photo}
                alt={name}
                onError={() => setBroken(true)}
                className="h-7 w-7 shrink-0 rounded-full border border-zinc-200 object-cover dark:border-zinc-700"
            />
        );
    }
    return (
        <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-bold text-white ${toneFor(row.name)}`}
        >
            {initialsOf(name)}
        </div>
    );
};

const stateTone = (state?: string, docstatus?: number) => {
    const label = state || (docstatus === 1 ? "Submitted" : docstatus === 2 ? "Cancelled" : "Draft");
    const cls = /approved/i.test(label)
        ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900"
        : /reject|cancel/i.test(label)
          ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900"
          : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900";
    return { label, cls };
};

const StatCard = ({ label, value, tone }: { label: string; value: number; tone: string }) => (
    <div className={`rounded-lg border px-4 py-2.5 ${tone}`}>
        <p className="text-[12px] font-bold opacity-80">{label}</p>
        <p className="text-xl font-extrabold leading-tight">{value}</p>
    </div>
);

export default function ProjectStaffDetailsList() {
    const navigate = useNavigate();
    const [rows, setRows] = useState<StaffRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState("");
    const [search, setSearch] = useState("");
    const [pageSize, setPageSize] = useState(25);
    const [page, setPage] = useState(0);

    const { call: fetchList } = useFrappePostCall<{ message: { status: string; data?: StaffRow[]; message?: string } }>(
        projectStaffDetailsAPI.getList,
    );

    const load = async () => {
        setLoading(true);
        setErrorMsg("");
        try {
            const res = await fetchList({});
            const msg = res?.message;
            if (msg?.status === "success" || Array.isArray(msg?.data)) {
                setRows(msg?.data ?? []);
            } else {
                setErrorMsg(msg?.message || "Could not load project staff details.");
            }
        } catch (e: any) {
            setErrorMsg(e?.message || "Could not load project staff details.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((r) =>
            [fullName(r), r.ps_emp_id, r.erp_mail, r.name].some((v) =>
                String(v ?? "").toLowerCase().includes(q),
            ),
        );
    }, [rows, search]);

    useEffect(() => setPage(0), [search, pageSize]);

    const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    const visible = filtered.slice(page * pageSize, page * pageSize + pageSize);

    const openRecord = (name: string) =>
        navigate(`/project-staff-details/${encodeURIComponent(name)}`);

    const counts = useMemo(() => {
        const approved = rows.filter((r) => /approved/i.test(r.workflow_state || "")).length;
        const draft = rows.filter((r) => !r.workflow_state || /draft/i.test(r.workflow_state)).length;
        return { total: rows.length, approved, draft, other: rows.length - approved - draft };
    }, [rows]);

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
            <main className="w-full space-y-3 p-0">
                <header className="flex flex-col gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-2 shadow-sm dark:border-zinc-800 dark:bg-[#27272A] md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#D97757] text-white shadow-sm">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#09090B] dark:text-white">Project Staff Details</h1>
                            <p className="mt-0.5 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                View and update the records of project staff.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate("/project-staff-details/new")}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
                    >
                        <Plus className="h-4 w-4" /> Create New
                    </button>
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
                    </button>
                    </div>
                </header>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard label="Total Staff" value={counts.total} tone="border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200" />
                    <StatCard label="Approved" value={counts.approved} tone="border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200" />
                    <StatCard label="Draft" value={counts.draft} tone="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200" />
                    <StatCard label="In Workflow / Other" value={counts.other} tone="border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200" />
                </div>

                <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#27272A]">
                    <div className="flex flex-col gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
                        <div className="relative w-full sm:max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name, employee ID or ERP mail"
                                className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-100"
                            />
                        </div>
                        <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                            {filtered.length} {filtered.length === 1 ? "record" : "records"}
                        </span>
                    </div>

                    {errorMsg && (
                        <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{errorMsg}</div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800/50">
                                    {["Staff", "Employee ID", "Designation", "Project", "Status", ""].map((h, i) => (
                                        <th key={i} className="whitespace-nowrap px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#D97757]" />
                                        </td>
                                    </tr>
                                ) : visible.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-16 text-center text-sm font-medium text-zinc-600">
                                            No project staff found.
                                        </td>
                                    </tr>
                                ) : (
                                    visible.map((r) => {
                                        const st = stateTone(r.workflow_state, r.docstatus);
                                        return (
                                            <tr
                                                key={r.name}
                                                onClick={() => openRecord(r.name)}
                                                className="cursor-pointer border-b border-zinc-100 transition-colors hover:bg-blue-50/50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                                            >
                                                <td className="px-3 py-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <Avatar row={r} />
                                                        <div className="min-w-0">
                                                            <p className="truncate text-[13px] font-bold leading-tight text-[#09090B] dark:text-white">{fullName(r) || "—"}</p>
                                                            {r.erp_mail && r.erp_mail !== "NA" && (
                                                                <p className="flex items-center gap-1 truncate text-[11px] font-medium leading-tight text-zinc-600 dark:text-zinc-400">
                                                                    <Mail className="h-3 w-3" />
                                                                    {r.erp_mail}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-1.5 font-mono text-[12px] font-semibold text-blue-800 dark:text-blue-300">
                                                    {r.ps_emp_id || "—"}
                                                </td>
                                                <td className="px-3 py-1.5 text-[13px] font-medium text-zinc-800 dark:text-zinc-200">{r.ps_designation || "—"}</td>
                                                <td className="px-3 py-1.5 text-[13px] font-medium text-zinc-800 dark:text-zinc-200">{r.project_no || "—"}</td>
                                                <td className="px-3 py-1.5">
                                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset ${st.cls}`}>
                                                        {st.label}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-1.5 text-right">
                                                    <span className="inline-flex items-center gap-0.5 text-[12px] font-bold text-[#D97757]">
                                                        Open <ChevronRight className="h-4 w-4" />
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-2 text-[13px] font-medium text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
                        <label className="flex items-center gap-2">
                            Rows per page
                            <select
                                value={pageSize}
                                onChange={(e) => setPageSize(Number(e.target.value))}
                                className="rounded-md border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-transparent"
                            >
                                {PAGE_SIZES.map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={page === 0}
                                onClick={() => setPage((p) => p - 1)}
                                className="rounded-md border border-zinc-300 px-3 py-1 font-semibold hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
                            >
                                Previous
                            </button>
                            <span>
                                Page {page + 1} of {pageCount}
                            </span>
                            <button
                                type="button"
                                disabled={page >= pageCount - 1}
                                onClick={() => setPage((p) => p + 1)}
                                className="rounded-md border border-zinc-300 px-3 py-1 font-semibold hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:hover:bg-zinc-800"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
