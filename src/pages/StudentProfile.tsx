import React from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { AlertCircle, CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import { studentAPI } from "@/services/apiService";

type ProfileData = Record<string, string>;

interface ProfileResponse {
    message: {
        is_student: boolean;
        is_complete: boolean;
        missing: string[];
        data: ProfileData;
    };
}

type FieldDef = {
    name: string;
    label: string;
    type: "text" | "date" | "select" | "textarea";
    options?: string[];
};

/** Mirrors STUDENT_PROFILE_FIELDS in student_api.py — the student-owned half of
 *  `student_details`. The project/pay section is filled by the PI's office. */
const FIELDS: FieldDef[] = [
    { name: "dob", label: "Date of Birth", type: "date" },
    { name: "gender", label: "Gender", type: "select", options: ["Male", "Female"] },
    { name: "contact_number", label: "Contact Number", type: "text" },
    { name: "qualification", label: "Qualification", type: "text" },
    { name: "father_name", label: "Father's Name", type: "text" },
    {
        name: "blood_group",
        label: "Blood Group",
        type: "select",
        options: ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"],
    },
    {
        name: "maritial_status",
        label: "Marital Status",
        type: "select",
        options: ["Married", "Unmarried"],
    },
    { name: "citizenship", label: "Citizenship", type: "text" },
    { name: "permanent_address", label: "Permanent Address", type: "textarea" },
    { name: "present_address", label: "Present Address", type: "text" },
    { name: "account_number", label: "Bank Account Number", type: "text" },
    { name: "pan", label: "PAN Number", type: "text" },
    { name: "aadhar_number", label: "Aadhaar Number", type: "text" },
];

const inputClass =
    "w-full min-w-0 rounded-lg border border-[#E4E4E7] bg-white px-3 py-2 text-sm text-[#3F3F46] " +
    "focus:border-[#D97757] focus:outline-none dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]";

export default function StudentProfile() {
    const { data, isLoading, mutate } = useFrappeGetCall<ProfileResponse>(
        studentAPI.getMyProfile,
        {},
    );
    const { call: saveProfile, loading: saving } = useFrappePostCall(studentAPI.saveMyProfile);

    const [form, setForm] = React.useState<ProfileData>({});
    const [error, setError] = React.useState("");
    const [saved, setSaved] = React.useState(false);

    // Seed the form once the existing values arrive.
    React.useEffect(() => {
        const existing = data?.message?.data;
        if (existing) {
            setForm((prev) =>
                Object.keys(prev).length ? prev : Object.fromEntries(
                    Object.entries(existing).map(([k, v]) => [k, v ?? ""]),
                ),
            );
        }
    }, [data]);

    const isComplete = data?.message?.is_complete ?? false;
    const missing = FIELDS.filter((f) => !(form[f.name] || "").trim()).map((f) => f.name);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        if (missing.length) {
            setError("Please fill every field before continuing.");
            return;
        }
        try {
            await saveProfile({ data: JSON.stringify(form) });
            setSaved(true);
            mutate();
            // Full reload so the completion gate re-evaluates and releases the app.
            setTimeout(() => window.location.assign("/dashboard"), 800);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Could not save your profile.";
            setError(msg);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
                <Loader2 className="h-6 w-6 animate-spin text-[#D97757]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FAFAF9] px-4 py-10 dark:bg-[#18181B]">
            <div className="mx-auto max-w-3xl">
                <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="flex items-start gap-3 px-6 py-5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF2FF] dark:bg-[#4A6CF7]/15">
                            <GraduationCap className="h-5 w-5 text-[#4A6CF7] dark:text-[#93C5FD]" />
                        </div>
                        <div>
                            <h1 className="text-[20px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                Complete your profile
                            </h1>
                            <p className="mt-0.5 text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                                {isComplete
                                    ? "Your details are on file. You can update them here."
                                    : "Fill in your details to continue to the portal. All fields are required."}
                            </p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {saved && (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Profile saved — taking you to the portal…</span>
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="mt-4 rounded-2xl border border-[#E4E4E7] bg-white p-6 shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]"
                >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {FIELDS.map((field) => (
                            <div
                                key={field.name}
                                className={field.type === "textarea" ? "sm:col-span-2" : ""}
                            >
                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#71717A] dark:text-[#A1A1AA]">
                                    {field.label} <span className="text-[#D97757]">*</span>
                                </label>
                                {field.type === "select" ? (
                                    <select
                                        className={inputClass}
                                        value={form[field.name] || ""}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, [field.name]: e.target.value }))
                                        }
                                    >
                                        <option value="">Select…</option>
                                        {field.options?.map((opt) => (
                                            <option key={opt} value={opt}>
                                                {opt}
                                            </option>
                                        ))}
                                    </select>
                                ) : field.type === "textarea" ? (
                                    <textarea
                                        rows={3}
                                        className={inputClass}
                                        value={form[field.name] || ""}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, [field.name]: e.target.value }))
                                        }
                                    />
                                ) : (
                                    <input
                                        type={field.type}
                                        className={inputClass}
                                        value={form[field.name] || ""}
                                        onChange={(e) =>
                                            setForm((p) => ({ ...p, [field.name]: e.target.value }))
                                        }
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3">
                        <span className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                            {missing.length
                                ? `${missing.length} field${missing.length === 1 ? "" : "s"} remaining`
                                : "All fields complete"}
                        </span>
                        <button
                            type="submit"
                            disabled={saving || missing.length > 0}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#D97757] px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#c66a4e] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save and continue
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
