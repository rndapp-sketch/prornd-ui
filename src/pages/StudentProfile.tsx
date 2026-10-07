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
    "w-full min-w-0 rounded-lg border border-[#D4D4D8] bg-white px-3 py-1.5 text-[13px] text-[#3F3F46] " +
    "focus:border-[#4A6CF7] focus:ring-2 focus:ring-[#4A6CF7]/20 focus:outline-none dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]";

export default function StudentProfile() {
    const { data, isLoading, mutate } = useFrappeGetCall<ProfileResponse>(
        studentAPI.getMyProfile,
        {},
    );
    const { call: saveProfile, loading: saving } = useFrappePostCall(studentAPI.saveMyProfile);

    const [form, setForm] = React.useState<ProfileData>({});
    const [error, setError] = React.useState("");
    const [saved, setSaved] = React.useState(false);

    // useFrappeGetCall's isLoading flips true on every background revalidation,
    // not just the true initial load (same quirk worked around in useUserRoles).
    // Using it raw below would swap the whole form out for a full-screen spinner
    // on every revalidation blip — visible as a flicker, even though the
    // underlying `form` state is untouched and the data you typed is still there.
    const hasEverLoadedRef = React.useRef(false);
    if (data !== undefined) hasEverLoadedRef.current = true;
    const showInitialLoader = isLoading && !hasEverLoadedRef.current;

    // Seed the form once the existing values arrive. Guarded by a ref rather
    // than checking Object.keys(prev).length — when the student has no
    // existing record yet, `existing` is `{}`, so a keys-length check never
    // "locks in" and re-seeds (with a fresh object reference) on every
    // render where `data` isn't referentially stable, causing a flicker loop.
    const seededRef = React.useRef(false);
    React.useEffect(() => {
        const existing = data?.message?.data;
        if (existing && !seededRef.current) {
            seededRef.current = true;
            setForm(Object.fromEntries(
                Object.entries(existing).map(([k, v]) => [k, v ?? ""]),
            ));
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

    if (showInitialLoader) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#FAFAF9] dark:bg-[#18181B]">
                <Loader2 className="h-6 w-6 animate-spin text-[#D97757]" />
            </div>
        );
    }

    return (
        <div className="w-full">
            <div className="w-full">
                <div className="overflow-hidden rounded-lg border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="flex items-center gap-3 px-4 py-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] dark:bg-[#4A6CF7]/15">
                            <GraduationCap className="h-5 w-5 text-[#4A6CF7] dark:text-[#93C5FD]" />
                        </div>
                        <div>
                            <h1 className="text-[18px] font-extrabold leading-tight text-[#3F3F46] dark:text-[#E4E4E7]">
                                Complete your profile
                            </h1>
                            <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                {isComplete
                                    ? "Your details are on file. You can update them here."
                                    : "Fill in your details to continue to the portal. All fields are required."}
                            </p>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-800/40 dark:bg-red-950/20 dark:text-red-300">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {saved && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>Profile saved — taking you to the portal…</span>
                    </div>
                )}

                <form
                    onSubmit={handleSubmit}
                    className="mt-3 overflow-hidden rounded-lg border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]"
                >
                    <div className="flex items-center justify-between gap-3 border-b border-[#C7D2FE] bg-[#EEF2FF] px-4 py-2 dark:border-[#4A6CF7]/30 dark:bg-[#1E3A8A]/18">
                        <h2 className="text-[13px] font-extrabold uppercase tracking-wide text-[#1E3A8A] dark:text-[#C7D2FE]">
                            Student details
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[#1E3A8A] dark:text-[#C7D2FE]">
                                {FIELDS.length - missing.length}/{FIELDS.length} complete
                            </span>
                            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white dark:bg-[#18181B]">
                                <div
                                    className="h-full rounded-full bg-[#4A6CF7] transition-all"
                                    style={{ width: `${((FIELDS.length - missing.length) / FIELDS.length) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                        {FIELDS.map((field) => (
                            <div
                                key={field.name}
                                className={field.type === "textarea" ? "sm:col-span-2 xl:col-span-3" : ""}
                            >
                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-[#52525B] dark:text-[#A1A1AA]">
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

                    <div className="flex items-center justify-between gap-3 border-t border-[#E4E4E7] bg-[#FAFAF9] px-4 py-2.5 dark:border-[#3F3F46] dark:bg-[#18181B]">
                        <span className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
                            {missing.length
                                ? `${missing.length} field${missing.length === 1 ? "" : "s"} remaining`
                                : "All fields complete"}
                        </span>
                        <button
                            type="submit"
                            disabled={saving || missing.length > 0}
                            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-1.5 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:opacity-50"
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
