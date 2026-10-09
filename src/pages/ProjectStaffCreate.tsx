import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeGetDocList, useFrappePostCall } from "frappe-react-sdk";
import { ArrowLeft, Briefcase, FileText, Paperclip, CalendarDays, ChevronDown, Landmark, Loader2, Phone, User, UserPlus, FolderKanban } from "lucide-react";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import { commonAPI, projectStaffDetailsAPI } from "@/services/apiService";

type Values = Record<string, string>;

const FILE_FIELDS: { key: string; label: string }[] = [
    { key: "ps_photo", label: "Photo" },
    { key: "ps_signature", label: "Signature" },
    { key: "ps_medical_certificate", label: "Medical Certificate" },
];

const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file, file.name);
    fd.append("is_private", "0");
    const res = await fetch(`${FRAPPE_BASE_URL}/api/method/upload_file`, {
        method: "POST",
        body: fd,
        headers: { "X-Frappe-CSRF-Token": (window as any).csrf_token || "" },
        credentials: "include",
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`File upload failed (${res.status})`);
    const url = JSON.parse(text)?.message?.file_url;
    if (!url) throw new Error("File upload did not return a file URL");
    return url;
};

const REQUIRED: Record<string, string> = {
    pi_id: "PI Id",
    project_no: "Project Number",
    ps_department: "Department",
    ps_designation: "Designation",
    ps_first_name: "First Name",
    ps_last_name: "Last Name",
    ps_gender: "Gender",
    ps_joining_date: "Joining Date",
};

const inputCls =
    "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-100";

const TONES = {
    blue: { head: "bg-blue-50 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200", icon: "bg-blue-500" },
    violet: { head: "bg-violet-50 text-violet-800 dark:bg-violet-950/30 dark:text-violet-200", icon: "bg-violet-500" },
    emerald: { head: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200", icon: "bg-emerald-500" },
    amber: { head: "bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-200", icon: "bg-amber-500" },
    rose: { head: "bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200", icon: "bg-rose-500" },
};

const Section = ({
    title,
    tone,
    icon: Icon,
    children,
}: {
    title: string;
    tone: keyof typeof TONES;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
}) => {
    const t = TONES[tone];
    return (
        <section className={`rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-[#27272A]`}>
            <h2 className={`flex items-center gap-2 rounded-t-xl px-4 py-2 text-sm font-extrabold uppercase tracking-wider ${t.head}`}>
                <span className={`flex h-6 w-6 items-center justify-center rounded-md text-white ${t.icon}`}>
                    <Icon className="h-3.5 w-3.5" />
                </span>
                {title}
            </h2>
            <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
        </section>
    );
};

// Blocks copy/paste/cut/drop so the account number has to be typed out twice.
const block = (e: React.SyntheticEvent) => e.preventDefault();
const noClipboard = {
    onPaste: block,
    onCopy: block,
    onCut: block,
    onDrop: block,
    onContextMenu: block,
};

// ISO (YYYY-MM-DD, what Frappe stores) <-> dd/mm/yy (what the user sees and types).
const isoToDisplay = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
    return m ? `${m[3]}/${m[2]}/${m[1].slice(2)}` : iso;
};

const displayToIso = (text: string) => {
    const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/.exec(text.trim());
    if (!m) return "";
    const [d, mo] = [Number(m[1]), Number(m[2])];
    const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
    const dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return "";
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

// Typed dd/mm/yy text plus a calendar button; reports ISO via onChange ("" while incomplete/invalid).
const DateField = ({ value, onChange }: { value: string; onChange: (iso: string) => void }) => {
    const [text, setText] = useState(isoToDisplay(value));
    const picker = useRef<HTMLInputElement>(null);
    const invalid = text.trim() !== "" && !displayToIso(text);
    return (
        <div className="relative">
            <input
                className={`${inputCls} pr-9 ${invalid ? "border-red-400" : ""}`}
                value={text}
                placeholder="dd/mm/yy"
                inputMode="numeric"
                onChange={(e) => {
                    setText(e.target.value);
                    onChange(displayToIso(e.target.value));
                }}
                onBlur={() => {
                    const iso = displayToIso(text);
                    if (iso) setText(isoToDisplay(iso));
                }}
            />
            <button
                type="button"
                tabIndex={-1}
                onClick={() => picker.current?.showPicker?.()}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-800"
            >
                <CalendarDays className="h-4 w-4" />
            </button>
            <input
                ref={picker}
                type="date"
                tabIndex={-1}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setText(isoToDisplay(e.target.value));
                }}
                className="pointer-events-none absolute right-0 top-full h-0 w-0 opacity-0"
            />
            {invalid && <span className="text-[11px] text-red-600">Use dd/mm/yy</span>}
        </div>
    );
};

// Searchable dropdown: filters as you type, lists every option, accepts only listed values.
const SearchSelect = ({
    value,
    options,
    onChange,
    placeholder,
}: {
    value: string;
    options: string[];
    onChange: (v: string) => void;
    placeholder?: string;
}) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState("");
    const filtered = options.filter((o) => o.toLowerCase().includes(q.trim().toLowerCase()));
    return (
        <div className="relative" onBlur={() => setTimeout(() => setOpen(false), 150)}>
            <input
                className={`${inputCls} pr-8`}
                value={open ? q : value}
                placeholder={placeholder}
                onFocus={() => {
                    setQ("");
                    setOpen(true);
                }}
                onChange={(e) => setQ(e.target.value)}
            />
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            {open && (
                <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-[#27272A]">
                    {filtered.length === 0 ? (
                        <li className="px-3 py-2 text-[13px] text-zinc-500">No matches</li>
                    ) : (
                        filtered.map((o) => (
                            <li
                                key={o}
                                onMouseDown={() => {
                                    onChange(o);
                                    setOpen(false);
                                }}
                                className={`cursor-pointer px-3 py-2 text-[13px] hover:bg-blue-50 dark:hover:bg-zinc-800 ${o === value ? "font-bold text-[#2563EB]" : ""}`}
                            >
                                {o}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
};

export default function ProjectStaffCreate() {
    const navigate = useNavigate();
    const [v, setV] = useState<Values>({ ps_citizenship: "Indian" });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");
    const [files, setFiles] = useState<Record<string, File | null>>({});
    const [bankConfirm, setBankConfirm] = useState("");
    const [bankConfirmTouched, setBankConfirmTouched] = useState(false);
    // Flag a mismatch once the user leaves the re-enter box (or it is as long as the original), not while typing.
    const bankMismatch =
        bankConfirm.length > 0 &&
        bankConfirm !== (v.bank_account_number ?? "") &&
        (bankConfirmTouched || bankConfirm.length >= (v.bank_account_number ?? "").length);
    const [nextEmpId, setNextEmpId] = useState("");
    const [projectHits, setProjectHits] = useState<any[]>([]);
    const [showHits, setShowHits] = useState(false);
    const [userHits, setUserHits] = useState<{ email: string; name: string }[]>([]);
    const [showUserHits, setShowUserHits] = useState(false);
    const userDebounce = useRef<ReturnType<typeof setTimeout>>();
    const debounce = useRef<ReturnType<typeof setTimeout>>();

    const { data: depts } = useFrappeGetDocList("Department_prornd", {
        fields: ["name", "dept_name"],
        limit: 0,
        orderBy: { field: "dept_name", order: "asc" },
    });
    const { data: desigRows } = useFrappeGetDocList("Designation_prornd", {
        fields: ["name"],
        limit: 0,
        orderBy: { field: "name", order: "asc" },
    });
    const designations = Array.from(new Set((desigRows ?? []).map((d: any) => d.name))).filter(Boolean) as string[];
    const { call: getNextEmpId } = useFrappePostCall<{ message: string }>(projectStaffDetailsAPI.getNextEmpId);
    const { call: searchProjects } = useFrappePostCall<{ message: any }>(projectStaffDetailsAPI.searchProjects);
    const { call: fetchUserProfile } = useFrappePostCall<{ message: any }>(commonAPI.getUserRegistrationProfile);
    const { call: setValue } = useFrappePostCall<{ message: any }>("frappe.client.set_value");
    const { call: createEntry } = useFrappePostCall<{ message: any }>(projectStaffDetailsAPI.createEntry);

    useEffect(() => {
        getNextEmpId({}).then((r) => setNextEmpId(r?.message || "")).catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const set = (k: string, val: string) => {
        setV((p) => ({ ...p, [k]: val }));
        if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
    };

    // Searches Users + Universal Registration profiles; the chosen email becomes pi_id.
    const onPiChange = (val: string) => {
        set("pi_id", val);
        clearTimeout(userDebounce.current);
        if (val.trim().length < 2) {
            setUserHits([]);
            return;
        }
        userDebounce.current = setTimeout(async () => {
            try {
                const res = await fetchUserProfile({ search: val.trim() });
                const list: any[] = Array.isArray(res?.message) ? res.message : res?.message ? [res.message] : [];
                setUserHits(
                    list
                        .map((p) => ({
                            email: p.email || p.email_address_u_r || p.name || "",
                            name: p.full_name || p.full_name_u_r || "",
                        }))
                        .filter((u) => u.email),
                );
                setShowUserHits(true);
            } catch {
                setUserHits([]);
            }
        }, 300);
    };

    const onProjectChange = (val: string) => {
        set("project_no", val);
        clearTimeout(debounce.current);
        if (val.trim().length < 2) {
            setProjectHits([]);
            return;
        }
        debounce.current = setTimeout(async () => {
            try {
                const res = await searchProjects({ query: val.trim(), page_size: 15 });
                setProjectHits(res?.message?.results ?? []);
                setShowHits(true);
            } catch {
                setProjectHits([]);
            }
        }, 300);
    };

    const field = (k: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
        <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-zinc-700 dark:text-zinc-300">
                {label}
                {REQUIRED[k] && <span className="text-red-600"> *</span>}
            </span>
            <input
                className={inputCls}
                value={v[k] ?? ""}
                onChange={(e) => set(k, e.target.value)}
                name={`psd_${k}`}
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore
                {...props}
            />
            {errors[k] && <span className="text-[11px] text-red-600">{errors[k]}</span>}
        </label>
    );

    const select = (k: string, label: string, options: { value: string; label?: string }[]) => (
        <label className="block">
            <span className="mb-1 block text-[12px] font-bold text-zinc-700 dark:text-zinc-300">
                {label}
                {REQUIRED[k] && <span className="text-red-600"> *</span>}
            </span>
            <select className={inputCls} value={v[k] ?? ""} onChange={(e) => set(k, e.target.value)}>
                <option value="">Select</option>
                {options.map((o) => (
                    <option key={o.value} value={o.value}>{o.label ?? o.value}</option>
                ))}
            </select>
            {errors[k] && <span className="text-[11px] text-red-600">{errors[k]}</span>}
        </label>
    );

    const yesNo = [{ value: "Yes" }, { value: "No" }];

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        Object.entries(REQUIRED).forEach(([k, label]) => {
            if (!(v[k] ?? "").trim()) errs[k] = `${label} is required`;
        });
        if ((v.bank_account_number ?? "") !== bankConfirm) errs.bank_confirm = "Account numbers do not match";
        setErrors(errs);
        setFormError("");
        if (Object.keys(errs).length) {
            setFormError("Please fill all required fields");
            return;
        }
        const data: Values = {};
        Object.entries(v).forEach(([k, val]) => {
            if (val !== "" && val != null) data[k] = val.trim();
        });
        if (!data.erp_mail && data.ps_email_id) data.erp_mail = data.ps_email_id;
        if (data.ifsc_code) data.ifsc_code = data.ifsc_code.toUpperCase();
        if (data.ps_ta !== "Yes") delete data.ps_ta_amount;

        setSaving(true);
        try {
            for (const { key } of FILE_FIELDS) {
                const f = files[key];
                if (f) data[key] = await uploadFile(f);
            }
            const res = await createEntry({ data });
            const m = res?.message;
            // The create endpoint's documented field list omits order numbers and attachments,
            // so write them explicitly in case it dropped them.
            const extra: Values = {};
            ["ps_aon", "ps_mro", "ps_jrn", ...FILE_FIELDS.map((f) => f.key)].forEach((k) => {
                if (data[k]) extra[k] = data[k];
            });
            if (m?.docname && Object.keys(extra).length) {
                try {
                    await setValue({ doctype: "Project Staff Details", name: m.docname, fieldname: extra });
                } catch {
                    /* record already created; extras may have been saved by the endpoint */
                }
            }
            navigate(m?.docname ? `/project-staff-details/${encodeURIComponent(m.docname)}` : "/project-staff-details");
        } catch (err: any) {
            setFormError(err?.message || err?.exception || "Could not create project staff record");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B]">
            <form onSubmit={submit} className="w-full space-y-3">
                <header className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-2 shadow-sm dark:border-zinc-800 dark:bg-[#27272A]">
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#2563EB] to-[#D97757] text-white">
                            <UserPlus className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-extrabold tracking-tight text-[#09090B] dark:text-white">New Project Staff</h1>
                            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                Next Employee ID (preview): <span className="font-mono font-bold">{nextEmpId || "—"}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate("/project-staff-details")}
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                </header>

                <Section title="Project" tone="blue" icon={FolderKanban}>
                    <label className="relative block">
                        <span className="mb-1 block text-[12px] font-bold text-zinc-700 dark:text-zinc-300">
                            PI Id (email) <span className="text-red-600">*</span>
                        </span>
                        <input
                            className={inputCls}
                            value={v.pi_id ?? ""}
                            onChange={(e) => onPiChange(e.target.value)}
                            onFocus={() => setShowUserHits(true)}
                            onBlur={() => setTimeout(() => setShowUserHits(false), 150)}
                            placeholder="Search PI by name or email"
                            name="psd_pi_search"
                            autoComplete="off"
                            data-lpignore="true"
                            data-1p-ignore
                        />
                        {errors.pi_id && <span className="text-[11px] text-red-600">{errors.pi_id}</span>}
                        {showUserHits && userHits.length > 0 && (
                            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-[#27272A]">
                                {userHits.map((u) => (
                                    <li
                                        key={u.email}
                                        onMouseDown={() => {
                                            set("pi_id", u.email);
                                            setShowUserHits(false);
                                        }}
                                        className="cursor-pointer px-3 py-2 text-[13px] hover:bg-blue-50 dark:hover:bg-zinc-800"
                                    >
                                        <span className="font-bold">{u.name || u.email}</span>
                                        {u.name && <span className="block truncate text-[11px] text-zinc-600 dark:text-zinc-400">{u.email}</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </label>
                    <label className="relative block">
                        <span className="mb-1 block text-[12px] font-bold text-zinc-700 dark:text-zinc-300">
                            Project Number <span className="text-red-600">*</span>
                        </span>
                        <input
                            className={inputCls}
                            value={v.project_no ?? ""}
                            onChange={(e) => onProjectChange(e.target.value)}
                            onFocus={() => setShowHits(true)}
                            onBlur={() => setTimeout(() => setShowHits(false), 150)}
                            placeholder="Type to search projects"
                            autoComplete="off"
                        />
                        {errors.project_no && <span className="text-[11px] text-red-600">{errors.project_no}</span>}
                        {showHits && projectHits.length > 0 && (
                            <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-[#27272A]">
                                {projectHits.map((p) => (
                                    <li
                                        key={p.project_no}
                                        onMouseDown={() => {
                                            set("project_no", p.project_no);
                                            setShowHits(false);
                                        }}
                                        className="cursor-pointer px-3 py-2 text-[13px] hover:bg-blue-50 dark:hover:bg-zinc-800"
                                    >
                                        <span className="font-bold">{p.project_no}</span>
                                        {p.project_title && <span className="block truncate text-[11px] text-zinc-600 dark:text-zinc-400">{p.project_title}</span>}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </label>
                    {field("scr_id", "SCR Id")}
                    {select("ps_department", "Department", (depts ?? []).map((d: any) => ({ value: d.dept_name, label: d.dept_name })))}
                    <label className="block">
                        <span className="mb-1 block text-[12px] font-bold text-zinc-700 dark:text-zinc-300">
                            Designation <span className="text-red-600">*</span>
                        </span>
                        <SearchSelect
                            value={v.ps_designation ?? ""}
                            options={designations}
                            onChange={(val) => set("ps_designation", val)}
                            placeholder="Search designation"
                        />
                        {errors.ps_designation && <span className="text-[11px] text-red-600">{errors.ps_designation}</span>}
                    </label>
                </Section>

                <Section title="Personal Details" tone="violet" icon={User}>
                    {field("ps_first_name", "First Name")}
                    {field("ps_middle_name", "Middle Name")}
                    {field("ps_last_name", "Last Name")}
                    {select("ps_gender", "Gender", [{ value: "Male" }, { value: "Female" }])}
                    {field("ps_date_of_birth", "Date of Birth", { type: "date" })}
                    {field("ps_fathers_name", "Father's Name")}
                    {select("ps_blood_group", "Blood Group", ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"].map((value) => ({ value })))}
                    {select("ps_maritial_status", "Marital Status", [{ value: "Single" }, { value: "Married" }])}
                    {field("ps_citizenship", "Citizenship")}
                </Section>

                <Section title="Contact" tone="emerald" icon={Phone}>
                    {field("ps_phone_number", "Phone Number", { type: "tel" })}
                    {field("ps_email_id", "Email Id", { type: "email" })}
                    {field("erp_mail", "ERP Mail", { type: "email", placeholder: "Defaults to Email Id" })}
                    {field("ps_present_address", "Present Address")}
                    {field("ps_permanent_address", "Permanent Address")}
                </Section>

                <Section title="Bank & Identity" tone="amber" icon={Landmark}>
                    <label className="block">
                        <span className="mb-1 block text-[12px] font-bold text-zinc-700 dark:text-zinc-300">Bank Account Number</span>
                        <input
                            className={inputCls}
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            data-lpignore="true"
                            data-1p-ignore
                            style={{ WebkitTextSecurity: "disc" } as React.CSSProperties}
                            value={v.bank_account_number ?? ""}
                            onChange={(e) => set("bank_account_number", e.target.value.trim())}
                            {...noClipboard}
                        />
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[12px] font-bold text-zinc-700 dark:text-zinc-300">Re-enter Bank Account Number</span>
                        <input
                            className={`${inputCls} ${bankMismatch ? "border-red-400" : ""}`}
                            type="text"
                            autoComplete="off"
                            value={bankConfirm}
                            onBlur={() => setBankConfirmTouched(true)}
                            onChange={(e) => {
                                setBankConfirm(e.target.value.trim());
                                if (errors.bank_confirm) setErrors((er) => ({ ...er, bank_confirm: "" }));
                            }}
                            {...noClipboard}
                        />
                        {bankMismatch ? (
                            <span className="text-[11px] text-red-600">Account numbers do not match</span>
                        ) : (
                            errors.bank_confirm && <span className="text-[11px] text-red-600">{errors.bank_confirm}</span>
                        )}
                    </label>
                    {field("ifsc_code", "IFSC Code", { style: { textTransform: "uppercase" } })}
                    {field("ps_pan", "PAN")}
                    {field("ps_aadhar_number", "Aadhar Number")}
                </Section>

                <Section title="Employment & Salary" tone="rose" icon={Briefcase}>
                    <label className="block">
                        <span className="mb-1 block text-[12px] font-bold text-zinc-700 dark:text-zinc-300">
                            Joining Date <span className="text-red-600">*</span>
                        </span>
                        <DateField value={v.ps_joining_date ?? ""} onChange={(iso) => set("ps_joining_date", iso)} />
                        {errors.ps_joining_date && <span className="text-[11px] text-red-600">{errors.ps_joining_date}</span>}
                    </label>
                    <label className="block">
                        <span className="mb-1 block text-[12px] font-bold text-zinc-700 dark:text-zinc-300">Term Completion Date</span>
                        <DateField value={v.ps_term_completion_date ?? ""} onChange={(iso) => set("ps_term_completion_date", iso)} />
                    </label>
                    {field("ps_basic_salary", "Basic Salary", { type: "number", min: 0 })}
                    {select("ps_hra", "HRA", [{ value: "16%" }, { value: "18%" }, { value: "20%" }])}
                    {field("ps_ma", "Medical Allowance")}
                    {select("ps_hostel", "Hostel", yesNo)}
                    {select("ps_ta", "Travel Allowance Needed", yesNo)}
                    {v.ps_ta === "Yes" && field("ps_ta_amount", "Travel Allowance Amount", { type: "number", min: 0 })}
                </Section>

                <Section title="Order Numbers" tone="violet" icon={FileText}>
                    {field("ps_aon", "Appointment Order Number")}
                    {field("ps_mro", "Medical Report Number")}
                    {field("ps_jrn", "Joining Report Number")}
                </Section>

                <Section title="Uploads" tone="blue" icon={Paperclip}>
                    {FILE_FIELDS.map(({ key, label }) => (
                        <label key={key} className="block">
                            <span className="mb-1 block text-[12px] font-bold text-zinc-700 dark:text-zinc-300">{label}</span>
                            <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                onChange={(e) => setFiles((p) => ({ ...p, [key]: e.target.files?.[0] ?? null }))}
                                className="w-full rounded-lg border border-zinc-300 bg-white text-sm file:mr-3 file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold dark:border-zinc-700 dark:bg-transparent dark:file:bg-zinc-800"
                            />
                        </label>
                    ))}
                </Section>

                {formError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
                )}

                <div className="flex justify-end gap-2 pb-6">
                    <button
                        type="button"
                        onClick={() => navigate("/project-staff-details")}
                        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-60"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Staff Record
                    </button>
                </div>
            </form>
        </div>
    );
}
