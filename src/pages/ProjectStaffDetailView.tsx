import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useFrappePostCall } from "frappe-react-sdk";
import { ArrowLeft, AtSign, Briefcase, CalendarCheck, CalendarClock, ExternalLink, IndianRupee, Loader2, Mail, Pencil, Phone, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DepartmentName } from "@/components/DepartmentName";
import ViewProjectButton from "@/components/ViewProjectButton";
import {
    DynamicFormRenderer,
    type FormField,
    type LinkOption,
} from "@/components/forms/DynamicFormRenderer";
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
import { prepareFormDataForApi, projectStaffDetailsAPI } from "@/services/apiService";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import { getFileUrl } from "@/utils/fileUtils";

type Row = Record<string, any>;

interface Section {
    key: string;
    title: string;
    fields: FormField[];
}

const LAYOUT_TYPES = new Set(["Section Break", "Column Break", "Tab Break", "HTML", "Button"]);
const IMAGE_RE = /\.(png|jpe?g|gif|webp|svg)$/i;
const FIELDS_SHOWN_IN_HEADER = new Set(["ps_first_name", "ps_middle_name", "ps_last_name"]);
// Server-owned: never editable from this page.
const LOCKED_FIELDS = new Set(["ps_emp_id", "scr_id", "pi_id", "project_no"]);

const toArray = (v: unknown): Row[] => {
    if (Array.isArray(v)) return v as Row[];
    if (typeof v === "string" && v.trim()) {
        try {
            const p = JSON.parse(v);
            return Array.isArray(p) ? p : [];
        } catch {
            return [];
        }
    }
    return [];
};

const fmtDate = (v: unknown) => {
    if (!v || typeof v !== "string") return "";
    const d = new Date(v);
    return Number.isNaN(d.getTime())
        ? v
        : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtValue = (field: { fieldtype: string }, value: unknown): string => {
    if (value === null || value === undefined || value === "") return "";
    if (field.fieldtype === "Date") return fmtDate(value);
    if (field.fieldtype === "Currency") {
        const n = Number(value);
        return Number.isNaN(n) ? String(value) : `₹ ${n.toLocaleString("en-IN")}`;
    }
    if (field.fieldtype === "Check") return Number(value) ? "Yes" : "No";
    return String(value);
};

const stateTone = (state: string) =>
    /approved/i.test(state)
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
        : /reject|cancel/i.test(state)
          ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
          : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";

// Literal class names so Tailwind picks them up. Each section cycles through one accent.
const ACCENTS = [
    { head: "bg-blue-50 dark:bg-blue-950/30", title: "text-blue-800 dark:text-blue-300", label: "text-blue-900 dark:text-blue-200", value: "bg-blue-50/70 dark:bg-blue-950/20" },
    { head: "bg-emerald-50 dark:bg-emerald-950/30", title: "text-emerald-800 dark:text-emerald-300", label: "text-emerald-900 dark:text-emerald-200", value: "bg-emerald-50/70 dark:bg-emerald-950/20" },
    { head: "bg-violet-50 dark:bg-violet-950/30", title: "text-violet-800 dark:text-violet-300", label: "text-violet-900 dark:text-violet-200", value: "bg-violet-50/70 dark:bg-violet-950/20" },
    { head: "bg-amber-50 dark:bg-amber-950/30", title: "text-amber-800 dark:text-amber-300", label: "text-amber-900 dark:text-amber-200", value: "bg-amber-50/70 dark:bg-amber-950/20" },
    { head: "bg-rose-50 dark:bg-rose-950/30", title: "text-rose-800 dark:text-rose-300", label: "text-rose-900 dark:text-rose-200", value: "bg-rose-50/70 dark:bg-rose-950/20" },
    { head: "bg-cyan-50 dark:bg-cyan-950/30", title: "text-cyan-800 dark:text-cyan-300", label: "text-cyan-900 dark:text-cyan-200", value: "bg-cyan-50/70 dark:bg-cyan-950/20" },
];

const Card = ({
    title,
    accent,
    children,
}: {
    title: string;
    accent: (typeof ACCENTS)[number];
    children: React.ReactNode;
}) => (
    <div className={cn("overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#27272A]")}>
        <div className={cn("border-b border-zinc-200 px-6 py-3 dark:border-zinc-800", accent.head)}>
            <h3 className={cn("text-[14px] font-extrabold uppercase tracking-wider", accent.title)}>{title}</h3>
        </div>
        <div className="p-6">{children}</div>
    </div>
);

export default function ProjectStaffDetailView() {
    const { name = "" } = useParams<{ name: string }>();
    const navigate = useNavigate();

    const [fields, setFields] = useState<FormField[]>([]);
    const [linkOptions, setLinkOptions] = useState<Record<string, LinkOption[]>>({});
    const [data, setData] = useState<Row>({});
    const [draft, setDraft] = useState<Row>({});
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [saveOk, setSaveOk] = useState(false);

    const { call: fetchFields } = useFrappePostCall<{ message: any }>(projectStaffDetailsAPI.getFields);
    const { call: saveData } = useFrappePostCall<{ message: any }>(projectStaffDetailsAPI.save);

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError("");
        try {
            const [metaRes, docRes] = await Promise.all([
                fetchFields({ doc_name: name }),
                fetch(`${FRAPPE_BASE_URL}/api/resource/Project%20Staff%20Details/${encodeURIComponent(name)}`, {
                    credentials: "include",
                })
                    .then((r) => (r.ok ? r.json() : null))
                    .catch(() => null),
            ]);
            const msg = metaRes?.message || {};
            setFields(Array.isArray(msg.fields) ? msg.fields : []);
            setLinkOptions(msg.link_options && typeof msg.link_options === "object" ? msg.link_options : {});
            // prefill_data carries the tenure-corrected values, so it wins over the raw doc.
            const merged: Row = { ...(docRes?.data ?? {}), ...(msg.prefill_data ?? {}) };
            merged.table_ymed = toArray(merged.table_ymed);
            if (!Object.keys(merged).length || (!docRes?.data && !msg.prefill_data)) {
                setLoadError("This record could not be loaded.");
            }
            setData(merged);
        } catch (e: any) {
            setLoadError(e?.message || "This record could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, [fetchFields, name]);

    useEffect(() => {
        void load();
    }, [load]);

    const sections = useMemo<Section[]>(() => {
        const out: Section[] = [];
        let current: Section = { key: "general", title: "Details", fields: [] };
        for (const f of fields) {
            if (f.fieldtype === "Section Break") {
                if (current.fields.length) out.push(current);
                current = { key: f.fieldname, title: f.label || "Details", fields: [] };
            } else if (!LAYOUT_TYPES.has(f.fieldtype) && !f.hidden) {
                current.fields.push(f);
            }
        }
        if (current.fields.length) out.push(current);
        return out;
    }, [fields]);

    const fullName =
        [data.ps_first_name, data.ps_middle_name, data.ps_last_name].filter(Boolean).join(" ") || name;
    const state: string = data.workflow_state || (data.docstatus === 1 ? "Submitted" : "Draft");
    // The backend refuses edits on submitted / cancelled documents.
    const canEdit = data.docstatus === 0 || data.docstatus === undefined;
    const photo = typeof data.ps_photo === "string" && IMAGE_RE.test(data.ps_photo) ? getFileUrl(data.ps_photo) : "";
    const initials = fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p: string) => p[0]?.toUpperCase())
        .join("");

    const startEdit = () => {
        setDraft({ ...data });
        setSaveError("");
        setSaveOk(false);
        setEditing(true);
    };

    const handleSave = async () => {
        if (!draft.ps_first_name || !draft.ps_last_name) {
            setSaveError("First Name and Last Name are required.");
            return;
        }
        setSaving(true);
        setSaveError("");
        try {
            const prepared = await prepareFormDataForApi({ ...draft, table_ymed: toArray(draft.table_ymed) });
            prepared.name = name;
            const res = await saveData({ data: prepared });
            if (res?.message?.status === "success") {
                setEditing(false);
                setSaveOk(true);
                await load();
            } else {
                setSaveError(res?.message?.message || "Failed to save.");
            }
        } catch (e: any) {
            setSaveError(e?.message || e?._server_messages || "An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    const rendererProps = {
        formData: draft,
        linkOptions,
        onChange: (f: string, v: any) => setDraft((p) => ({ ...p, [f]: v })),
        onFileChange: (f: string, file: File | null) => setDraft((p) => ({ ...p, [f]: file })),
        onTableRowChange: (t: string, i: number, f: string, v: any) =>
            setDraft((p) => {
                const rows = [...toArray(p[t])];
                rows[i] = { ...(rows[i] || {}), [f]: v };
                return { ...p, [t]: rows };
            }),
        onTableFileChange: (t: string, i: number, f: string, file: File | null) =>
            setDraft((p) => {
                const rows = [...toArray(p[t])];
                rows[i] = { ...(rows[i] || {}), [f]: file };
                return { ...p, [t]: rows };
            }),
        onAddTableRow: (t: string, row: Row) => setDraft((p) => ({ ...p, [t]: [...toArray(p[t]), row] })),
        onDeleteTableRow: (t: string, i: number) =>
            setDraft((p) => ({ ...p, [t]: toArray(p[t]).filter((_, idx) => idx !== i) })),
        hideSectionHeaders: true,
        hideTableLabels: false,
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
                <Loader2 className="h-6 w-6 animate-spin text-[#D97757]" />
            </div>
        );
    }

    const renderValue = (f: FormField) => {
        const v = data[f.fieldname];
        if (f.fieldtype === "Attach" || f.fieldtype === "Attach Image") {
            if (!v) return <span className="text-zinc-400">—</span>;
            const url = getFileUrl(String(v));
            return IMAGE_RE.test(String(v)) ? (
                <a href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={f.label || ""} className="mt-1 h-24 w-auto rounded-lg border border-zinc-200 object-contain dark:border-zinc-700" />
                </a>
            ) : (
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold text-[#D97757] hover:underline">
                    View file <ExternalLink className="h-3.5 w-3.5" />
                </a>
            );
        }
        if (f.fieldname === "ps_department" && v) return <DepartmentName name={String(v)} />;
        const text = fmtValue(f, v);
        return text ? <span className="whitespace-pre-line">{text}</span> : <span className="text-zinc-400">—</span>;
    };

    return (
        <div className="min-h-screen bg-[#FAFAF9] font-sans dark:bg-[#18181B]">
            <main className="w-full space-y-3 p-0">
                {/* Header */}
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-[#27272A]">
                    <div className="relative h-14 bg-gradient-to-r from-[#1E3A8A] via-[#2563EB] to-[#D97757]">
                        <div className="absolute inset-0 opacity-20 [background:radial-gradient(circle_at_20%_20%,white,transparent_45%),radial-gradient(circle_at_85%_80%,white,transparent_40%)]" />
                        <button
                            onClick={() => navigate("/project-staff-details")}
                            className="absolute left-4 top-3 flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/30"
                            aria-label="Back to list"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back
                        </button>
                        <span className={cn("absolute right-4 top-3 rounded-full px-3.5 py-1.5 text-xs font-extrabold shadow-sm ring-1 ring-white/60", stateTone(state))}>
                            {state}
                        </span>
                    </div>

                    <div className="px-6 pb-5 md:px-8">
                        <div className="-mt-8 flex flex-wrap items-end justify-between gap-4">
                            <div className="flex min-w-0 flex-wrap items-end gap-5">
                                {photo ? (
                                    <img
                                        src={photo}
                                        alt={fullName}
                                        className="h-24 w-24 shrink-0 rounded-full border-4 border-white bg-white object-cover shadow-lg ring-2 ring-[#2563EB]/30 dark:border-[#27272A]"
                                    />
                                ) : (
                                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-[#4A6CF7] to-[#D97757] text-3xl font-extrabold text-white shadow-lg ring-2 ring-[#2563EB]/30 dark:border-[#27272A]">
                                        {initials || "PS"}
                                    </div>
                                )}
                                <div className="min-w-0 pt-9 pb-1">
                                    <h1 className="truncate text-2xl font-extrabold tracking-tight text-[#09090B] dark:text-white">{fullName}</h1>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        {data.ps_emp_id && (
                                            <span className="rounded-full bg-blue-600 px-3 py-1 font-mono text-xs font-bold text-white">{data.ps_emp_id}</span>
                                        )}
                                        {data.ps_designation && (
                                            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
                                                {data.ps_designation}
                                            </span>
                                        )}
                                        {data.ps_department && (
                                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                <DepartmentName name={String(data.ps_department)} />
                                            </span>
                                        )}
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm font-medium text-[#3F3F46] dark:text-[#D4D4D8]">
                                        {data.erp_mail && data.erp_mail !== "NA" && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <Mail className="h-4 w-4 text-blue-600" />
                                                {data.erp_mail}
                                            </span>
                                        )}
                                        {data.ps_email_id && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <AtSign className="h-4 w-4 text-rose-600" />
                                                {data.ps_email_id}
                                            </span>
                                        )}
                                        {data.ps_phone_number && (
                                            <span className="inline-flex items-center gap-1.5">
                                                <Phone className="h-4 w-4 text-emerald-600" />
                                                {data.ps_phone_number}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 pb-1">
                                {!editing && data.project_no && (
                                    <ViewProjectButton doctype="Project Staff Details" data={data} />
                                )}
                                {!editing && canEdit && (
                                    <button
                                        onClick={startEdit}
                                        className="flex items-center gap-2 rounded-lg bg-[#D97757] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#c5684a]"
                                    >
                                        <Pencil className="h-4 w-4" /> Update
                                    </button>
                                )}
                                {editing && (
                                    <>
                                        <button
                                            onClick={() => setEditing(false)}
                                            disabled={saving}
                                            className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-transparent dark:text-zinc-200"
                                        >
                                            <X className="h-4 w-4" /> Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className={cn(
                                                "flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold shadow-sm",
                                                saving ? "cursor-not-allowed bg-zinc-300 text-zinc-500" : "bg-emerald-600 text-white hover:bg-emerald-700",
                                            )}
                                        >
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                            {saving ? "Saving..." : "Save"}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                { label: "Project", value: data.project_no, tone: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200", Icon: Briefcase },
                                { label: "Joining Date", value: fmtDate(data.ps_joining_date), tone: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200", Icon: CalendarCheck },
                                { label: "Term Completion", value: fmtDate(data.ps_term_completion_date), tone: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200", Icon: CalendarClock },
                                { label: "Basic Salary", value: fmtValue({ fieldtype: "Currency" }, data.ps_basic_salary), tone: "border-violet-200 bg-violet-50 text-violet-900 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-200", Icon: IndianRupee },
                            ].map(({ label, value, tone, Icon }) => (
                                <div key={label} className={cn("flex items-center gap-3 rounded-xl border px-4 py-3", tone)}>
                                    <Icon className="h-5 w-5 shrink-0 opacity-80" />
                                    <div className="min-w-0">
                                        <p className="text-[12px] font-bold opacity-80">{label}</p>
                                        <p className="truncate text-[15px] font-extrabold">{value || "—"}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {loadError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>
                )}
                {saveError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
                )}
                {saveOk && !editing && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Saved successfully.</div>
                )}
                {!canEdit && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        This record is submitted, so its details can't be edited here.
                    </div>
                )}

                {/* Sections */}
                <div className="space-y-5">
                    {sections.map((section, sectionIndex) => {
                        const accent = ACCENTS[sectionIndex % ACCENTS.length];
                        const tables = section.fields.filter((f) => f.fieldtype === "Table");
                        const simple = section.fields.filter(
                            (f) => f.fieldtype !== "Table" && !(FIELDS_SHOWN_IN_HEADER.has(f.fieldname) && !editing),
                        );
                        if (!editing && !simple.length && !tables.length) return null;
                        return (
                            <Card key={section.key} title={section.title} accent={accent}>
                                {editing ? (
                                    <DynamicFormRenderer
                                        fields={section.fields.map((f) =>
                                            LOCKED_FIELDS.has(f.fieldname) ? { ...f, read_only: 1 } : f,
                                        )}
                                        {...rendererProps}
                                    />
                                ) : (
                                    <div className="space-y-6">
                                        {simple.length > 0 && (
                                            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                                                {simple.map((f) => (
                                                    <div key={f.fieldname} className="min-w-0">
                                                        <dt className={cn("text-[13px] font-bold", accent.label)}>
                                                            {f.label || f.fieldname}
                                                        </dt>
                                                        <dd className={cn("mt-1 break-words rounded-md px-3 py-2 text-[14px] font-semibold text-[#09090B] dark:text-white", accent.value)}>
                                                            {renderValue(f)}
                                                        </dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        )}
                                        {tables.map((t) => {
                                            const rows = toArray(data[t.fieldname]);
                                            const cols = (t.child_fields ?? []).filter((c) => !c.hidden);
                                            return (
                                                <div key={t.fieldname}>
                                                    <p className={cn("mb-2 text-[14px] font-extrabold", accent.title)}>{t.label}</p>
                                                    {rows.length === 0 ? (
                                                        <p className="text-sm text-zinc-400">No entries.</p>
                                                    ) : (
                                                        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
                                                            <table className="w-full border-collapse text-left text-sm">
                                                                <thead className={accent.head}>
                                                                    <tr>
                                                                        {cols.map((c) => (
                                                                            <th key={c.fieldname} className="whitespace-nowrap px-3 py-2 text-[12px] font-extrabold text-[#09090B] dark:text-zinc-100">
                                                                                {c.label || c.fieldname}
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {rows.map((row, i) => (
                                                                        <tr key={i} className="border-t border-zinc-100 dark:border-zinc-800">
                                                                            {cols.map((c) => (
                                                                                <td key={c.fieldname} className="px-3 py-2">
                                                                                    {fmtValue(c, row[c.fieldname]) || "—"}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>
            </main>

            <FloatingActivityLogButton doctype="Project Staff Details" docname={name} />
        </div>
    );
}
