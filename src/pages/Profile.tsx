import { FRAPPE_BASE_URL, frappeUrl } from "@/utils/frappeUrl";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    useFrappeAuth,
    useFrappeGetCall,
    useFrappeGetDoc,
    useFrappePostCall,
} from "frappe-react-sdk";
import {
    BadgeCheck,
    Briefcase,
    Building2,
    Calendar,
    Camera,
    Mail,
    MapPin,
    Phone,
    Save,
    Shield,
    User,
    X,
} from "lucide-react";
import { useSWRConfig } from "swr";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DepartmentName } from "@/components/DepartmentName";
import { useUserRoles } from "@/components/UserRole";
import { studentAPI } from "@/services/apiService";
import { cn } from "@/lib/utils";

type UserDoc = {
    name: string;
    email?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    full_name?: string;
    username?: string;
    user_image?: string;
    pi_initials?: string;
    phone?: string;
    mobile_no?: string;
    location?: string;
    birth_date?: string;
    gender?: string;
    bio?: string;
    employee_id?: string;
    department_name?: string;
    designation_name?: string;
    empclass?: string;
    language?: string;
    time_zone?: string;
    enabled?: number;
    roles?: Array<{ name: string; role: string }>;
};

type ProfileForm = {
    first_name: string;
    middle_name: string;
    last_name: string;
    full_name: string;
    username: string;
    user_image: string;
    pi_initials: string;
    phone: string;
    mobile_no: string;
    location: string;
    birth_date: string;
    gender: string;
    bio: string;
};

type UploadedFileResponse = {
    message?: {
        file_url?: string;
        file_name?: string;
    };
};

/** The student-owned half of `student_details` — mirrors STUDENT_PROFILE_FIELDS
 *  in student_api.py. The project/pay half belongs to the PI's office. */
const STUDENT_PROFILE_FIELDS: Array<{
    name: string;
    label: string;
    icon: React.ElementType;
    type?: string;
    options?: string[];
    multiline?: boolean;
}> = [
    { name: "dob", label: "Date of Birth", icon: Calendar, type: "date" },
    { name: "gender", label: "Gender", icon: User, options: ["Male", "Female"] },
    { name: "contact_number", label: "Contact Number", icon: Phone },
    { name: "qualification", label: "Qualification", icon: BadgeCheck },
    { name: "father_name", label: "Father's Name", icon: User },
    {
        name: "blood_group",
        label: "Blood Group",
        icon: BadgeCheck,
        options: ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"],
    },
    {
        name: "maritial_status",
        label: "Marital Status",
        icon: User,
        options: ["Married", "Unmarried"],
    },
    { name: "citizenship", label: "Citizenship", icon: MapPin },
    { name: "permanent_address", label: "Permanent Address", icon: MapPin, multiline: true },
    { name: "present_address", label: "Present Address", icon: MapPin },
    { name: "account_number", label: "Bank Account Number", icon: BadgeCheck },
    { name: "pan", label: "PAN Number", icon: BadgeCheck },
    { name: "aadhar_number", label: "Aadhaar Number", icon: BadgeCheck },
];

const editableFields: Array<keyof ProfileForm> = [
    "first_name",
    "middle_name",
    "last_name",
    "full_name",
    "user_image",
    "phone",
    "mobile_no",
    "location",
    "birth_date",
    "gender",
    "bio",
];

const emptyForm: ProfileForm = {
    first_name: "",
    middle_name: "",
    last_name: "",
    full_name: "",
    username: "",
    user_image: "",
    pi_initials: "",
    phone: "",
    mobile_no: "",
    location: "",
    birth_date: "",
    gender: "",
    bio: "",
};

const getImageUrl = (image?: string) => {
    if (!image) return "";
    return frappeUrl(image);
};

const toForm = (user?: UserDoc): ProfileForm => ({
    first_name: user?.first_name || "",
    middle_name: user?.middle_name || "",
    last_name: user?.last_name || "",
    full_name: user?.full_name || "",
    username: user?.username || "",
    user_image: user?.user_image || "",
    pi_initials: user?.pi_initials || "",
    phone: user?.phone || "",
    mobile_no: user?.mobile_no || "",
    location: user?.location || "",
    birth_date: user?.birth_date || "",
    gender: user?.gender || "",
    bio: user?.bio || "",
});

const getErrorMessage = (error: unknown) => {
    if (error instanceof Error) return error.message;
    if (typeof error === "object" && error && "message" in error) {
        const message = (error as { message?: unknown }).message;
        if (typeof message === "string") return message;
    }
    return "Unknown error";
};

const Field = ({
    id,
    label,
    icon: Icon,
    children,
}: {
    id: string;
    label: string;
    icon: React.ElementType;
    children: React.ReactNode;
}) => (
    <div className="space-y-1">
        <Label htmlFor={id} className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-600 dark:text-zinc-400">
            <Icon className="h-3.5 w-3.5 text-[#2563EB]/70" />
            {label}
        </Label>
        {children}
    </div>
);

const SECTION_TONES = {
    blue: { head: "bg-[#EEF2FF] dark:bg-[#1E3A8A]/18", icon: "text-[#4A6CF7] dark:text-[#93C5FD]", title: "text-[#1E3A8A] dark:text-[#C7D2FE]" },
    emerald: { head: "bg-[#EEF2FF] dark:bg-[#1E3A8A]/18", icon: "text-[#4A6CF7] dark:text-[#93C5FD]", title: "text-[#1E3A8A] dark:text-[#C7D2FE]" },
    violet: { head: "bg-[#EEF2FF] dark:bg-[#1E3A8A]/18", icon: "text-[#4A6CF7] dark:text-[#93C5FD]", title: "text-[#1E3A8A] dark:text-[#C7D2FE]" },
    amber: { head: "bg-[#EEF2FF] dark:bg-[#1E3A8A]/18", icon: "text-[#4A6CF7] dark:text-[#93C5FD]", title: "text-[#1E3A8A] dark:text-[#C7D2FE]" },
    orange: { head: "bg-[#EEF2FF] dark:bg-[#1E3A8A]/18", icon: "text-[#4A6CF7] dark:text-[#93C5FD]", title: "text-[#1E3A8A] dark:text-[#C7D2FE]" },
};

const Section = ({
    title,
    icon: Icon,
    tone,
    children,
}: {
    title: string;
    icon: React.ElementType;
    tone: keyof typeof SECTION_TONES;
    children: React.ReactNode;
}) => (
    <section className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#27272A]">
        <header className={cn("flex items-center gap-2 border-b border-[#C7D2FE] px-4 py-2 dark:border-zinc-800", SECTION_TONES[tone].head)}>
            <Icon className={cn("h-4 w-4", SECTION_TONES[tone].icon)} />
            <h2 className={cn("text-[13px] font-extrabold uppercase tracking-wide", SECTION_TONES[tone].title)}>{title}</h2>
        </header>
        <div className="p-4">{children}</div>
    </section>
);

const ReadOnlyDetail = ({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ElementType;
    label: string;
    value?: React.ReactNode;
}) => (
    <div className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0">
            <dt className="text-[12px] font-semibold text-zinc-600 dark:text-zinc-400">{label}</dt>
            <dd className="mt-0.5 break-words text-[13px] font-medium text-zinc-900 dark:text-zinc-100">
                {value || <span className="font-normal text-zinc-400">Not set</span>}
            </dd>
        </div>
    </div>
);

const PERSONAL_FIELDS: Array<{
    name: keyof ProfileForm;
    label: string;
    icon: React.ElementType;
    type?: string;
    readOnly?: boolean;
    required?: boolean;
    options?: string[];
}> = [
    { name: "first_name", label: "First Name", icon: User },
    { name: "middle_name", label: "Middle Name", icon: User },
    { name: "last_name", label: "Last Name", icon: User },
    { name: "full_name", label: "Full Name", icon: BadgeCheck, required: true },
    { name: "username", label: "Username", icon: User, readOnly: true },
    { name: "pi_initials", label: "PI Initials", icon: BadgeCheck, readOnly: true },
    { name: "gender", label: "Gender", icon: User, options: ["Male", "Female", "Other"] },
    { name: "birth_date", label: "Birth Date", icon: Calendar, type: "date" },
];

const CONTACT_FIELDS: Array<{ name: keyof ProfileForm; label: string; icon: React.ElementType }> = [
    { name: "phone", label: "Phone", icon: Phone },
    { name: "mobile_no", label: "Mobile Number", icon: Phone },
    { name: "location", label: "Location", icon: MapPin },
];

export default function Profile() {
    const { currentUser } = useFrappeAuth();
    const { mutate } = useSWRConfig();
    const [form, setForm] = useState<ProfileForm>(emptyForm);
    const [isDirty, setIsDirty] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // const { roles, isLoading: isRolesLoading } = useUserRoles(
    //     currentUser || null,
    // );

    const {
        data: user,
        isLoading,
        error,
    } = useFrappeGetDoc<UserDoc>("User", currentUser || "", currentUser ? undefined : null);

    const { call: saveUser, loading: isSaving } = useFrappePostCall<{
        message: UserDoc;
    }>("frappe.client.set_value");

    const { call: fetchUserDetails } = useFrappePostCall<{ message: any }>(
        "rndopsapp.rndopsapp.api.get_user_details",
    );
    const [resolvedEmpclass, setResolvedEmpclass] = useState<string>("");

    // --- Student profile -----------------------------------------------------
    // For a student the useful record is their own `student_details` row, not
    // the sparse User doc — so show and edit that instead.
    const { data: studentProfile, mutate: refetchStudentProfile } = useFrappeGetCall<{
        message: {
            is_student: boolean;
            is_complete: boolean;
            data: Record<string, string>;
        };
    }>(studentAPI.getMyProfile, {});
    const { call: saveStudentProfile } = useFrappePostCall(studentAPI.saveMyProfile);

    const isStudent = studentProfile?.message?.is_student ?? false;
    const [studentForm, setStudentForm] = useState<Record<string, string>>({});
    const [studentDirty, setStudentDirty] = useState(false);
    const [studentSaving, setStudentSaving] = useState(false);

    useEffect(() => {
        const existing = studentProfile?.message?.data;
        if (!existing) return;
        setStudentForm(
            Object.fromEntries(Object.entries(existing).map(([k, v]) => [k, v ?? ""])),
        );
        setStudentDirty(false);
    }, [studentProfile]);

    const setStudentField = (key: string, value: string) => {
        setStudentForm((prev) => ({ ...prev, [key]: value }));
        setStudentDirty(true);
    };

    const handleStudentSave = async () => {
        setStudentSaving(true);
        try {
            await saveStudentProfile({ data: JSON.stringify(studentForm) });
            setStudentDirty(false);
            refetchStudentProfile();
        } catch {
            /* the endpoint reports its own validation errors */
        } finally {
            setStudentSaving(false);
        }
    };

    useEffect(() => {
        if (!currentUser) return;
        fetchUserDetails({ user_email: currentUser })
            .then((res) => setResolvedEmpclass(res?.message?.empclass || ""))
            .catch(() => { });
    }, [currentUser]);

    useEffect(() => {
        if (!user) return;
        setForm(toForm(user));
        setIsDirty(false);
    }, [user]);

    const initials = useMemo(() => {
        const name = form.full_name || currentUser || "User";
        return (
            name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part.charAt(0).toUpperCase())
                .join("") || "U"
        );
    }, [currentUser, form.full_name]);

    const updateField = (field: keyof ProfileForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleProfileImageUpload = async (file: File | undefined) => {
        if (!file) return;

        if (!currentUser) {
            alert("No logged-in user found.");
            return;
        }

        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            return;
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            alert("Profile picture must be 5 MB or smaller.");
            return;
        }

        setIsUploadingImage(true);
        try {
            const data = new FormData();
            data.append("file", file, file.name);
            data.append("is_private", "0");
            data.append("doctype", "User");
            data.append("docname", currentUser);
            data.append("fieldname", "user_image");

            const csrfToken = (window as Window & { csrf_token?: string })
                .csrf_token;
            const response = await fetch(`${FRAPPE_BASE_URL}/api/method/upload_file`, {
                method: "POST",
                body: data,
                credentials: "include",
                headers: csrfToken
                    ? { "X-Frappe-CSRF-Token": csrfToken }
                    : undefined,
            });

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const result = (await response.json()) as UploadedFileResponse;
            const fileUrl = result.message?.file_url;

            if (!fileUrl) {
                throw new Error(
                    "Upload succeeded but no file URL was returned.",
                );
            }

            updateField("user_image", fileUrl);
        } catch (err: unknown) {
            alert(`Failed to upload profile picture: ${getErrorMessage(err)}`);
        } finally {
            setIsUploadingImage(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const resetForm = () => {
        setForm(toForm(user));
        setIsDirty(false);
    };

    const handleSave = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!currentUser) {
            alert("No logged-in user found.");
            return;
        }

        if (!form.full_name.trim()) {
            alert("Full name is required.");
            return;
        }

        const values = editableFields.reduce<Record<string, string>>(
            (acc, field) => {
                acc[field] = form[field].trim();
                return acc;
            },
            {},
        );

        try {
            await saveUser({
                doctype: "User",
                name: currentUser,
                fieldname: values,
            });
            await mutate(() => true, undefined, { revalidate: true });
            setIsDirty(false);
            alert("Profile saved successfully.");
        } catch (err: unknown) {
            alert(`Failed to save profile: ${getErrorMessage(err)}`);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-3">
                <PageHeader title="Profile" showBack={false} />
                <div className="grid gap-3 lg:grid-cols-[320px_1fr]">
                    <div className="h-80 animate-pulse rounded-lg border border-[#E4E4E7] bg-white dark:border-[#3F3F46] dark:bg-[#27272A]" />
                    <div className="h-96 animate-pulse rounded-lg border border-[#E4E4E7] bg-white dark:border-[#3F3F46] dark:bg-[#27272A]" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                Failed to load profile: {error.message}
            </div>
        );
    }

    const dirty = isStudent ? studentDirty : isDirty;

    return (
        <div className="w-full text-[#3F3F46] dark:text-[#E4E4E7]">
            <form
                onSubmit={handleSave}
                className="w-full space-y-3 [&_input]:h-9 [&_input]:text-[13px] [&_select]:h-9 [&_select]:text-[13px] [&_textarea]:text-[13px]"
            >
                {/* Identity */}
                <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-[#27272A]">
                    <div className="h-[3px] bg-gradient-to-r from-[#2563EB] via-[#7C3AED] to-[#D97757]" />
                    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="relative shrink-0">
                                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-blue-200 bg-blue-50 text-lg font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                                    {form.user_image ? (
                                        <img
                                            src={getImageUrl(form.user_image)}
                                            alt={form.full_name || "Profile"}
                                            className="h-full w-full object-cover"
                                            onError={(event) => {
                                                event.currentTarget.style.display = "none";
                                            }}
                                        />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(event) => handleProfileImageUpload(event.target.files?.[0])}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingImage || isSaving}
                                    title="Change profile picture"
                                    className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 shadow-sm transition hover:text-[#2563EB] disabled:opacity-60 dark:border-zinc-600 dark:bg-[#27272A] dark:text-zinc-300"
                                >
                                    {isUploadingImage ? (
                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
                                    ) : (
                                        <Camera className="h-3 w-3" />
                                    )}
                                </button>
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h1 className="truncate text-[18px] font-extrabold text-zinc-900 dark:text-white">
                                        {form.full_name || "User"}
                                    </h1>
                                    <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", user?.enabled ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400")}>
                                        {user?.enabled ? "Active" : "Disabled"}
                                    </span>
                                </div>
                                <p className="mt-0.5 break-all text-[13px] text-zinc-500 dark:text-zinc-400">{currentUser}</p>
                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                    {user?.designation_name && (
                                        <span className="rounded bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                                            {user.designation_name}
                                        </span>
                                    )}
                                    {user?.department_name && (
                                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                                            <DepartmentName name={user.department_name} />
                                        </span>
                                    )}
                                    {user?.employee_id && (
                                        <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                                            {user.employee_id}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <span className={cn("text-[12px] font-medium", dirty ? "text-amber-700 dark:text-amber-400" : "text-zinc-400")}>
                            {dirty ? "Unsaved changes" : "All changes saved"}
                        </span>
                    </div>
                    {isDirty && form.user_image && !isStudent && (
                        <p className="border-t border-zinc-100 px-4 py-1.5 text-[12px] text-amber-700 dark:border-zinc-800 dark:text-amber-400">
                            Save the profile to apply the new picture.
                        </p>
                    )}
                </div>

                <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-3">
                        {isStudent ? (
                            <Section title="Student Details" icon={BadgeCheck} tone="orange">
                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                    {STUDENT_PROFILE_FIELDS.map((f) => (
                                        <Field key={f.name} id={f.name} label={f.label} icon={f.icon}>
                                            {f.options ? (
                                                <select
                                                    id={f.name}
                                                    className="flex h-10 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-[#18181B] dark:text-[#E4E4E7]"
                                                    value={studentForm[f.name] || ""}
                                                    onChange={(e) => setStudentField(f.name, e.target.value)}
                                                >
                                                    <option value="">Select…</option>
                                                    {f.options.map((o) => (
                                                        <option key={o} value={o}>{o}</option>
                                                    ))}
                                                </select>
                                            ) : f.multiline ? (
                                                <Textarea
                                                    id={f.name}
                                                    rows={3}
                                                    value={studentForm[f.name] || ""}
                                                    onChange={(e) => setStudentField(f.name, e.target.value)}
                                                />
                                            ) : (
                                                <Input
                                                    id={f.name}
                                                    type={f.type || "text"}
                                                    value={studentForm[f.name] || ""}
                                                    onChange={(e) => setStudentField(f.name, e.target.value)}
                                                />
                                            )}
                                        </Field>
                                    ))}
                                </div>
                                <div className="mt-4 flex items-center justify-end gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                                    <span className="mr-auto text-xs font-medium text-zinc-500">
                                        {studentDirty ? "You have unsaved changes" : "All changes saved"}
                                    </span>
                                    <Button
                                        type="button"
                                        onClick={handleStudentSave}
                                        disabled={!studentDirty || studentSaving}
                                        className="bg-[#D97757] font-semibold text-white hover:bg-[#c66a4e]"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {studentSaving ? "Saving..." : "Save Student Details"}
                                    </Button>
                                </div>
                            </Section>
                        ) : (
                            <>
                                <Section title="Personal Information" icon={User} tone="blue">
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {PERSONAL_FIELDS.map((f) => (
                                            <Field key={f.name} id={f.name} label={f.label} icon={f.icon}>
                                                {f.options ? (
                                                    <select
                                                        id={f.name}
                                                        value={form[f.name]}
                                                        onChange={(event) => updateField(f.name, event.target.value)}
                                                        className="flex h-9 w-full rounded-md border border-zinc-300 bg-white px-3 text-[13px] dark:border-zinc-700 dark:bg-[#18181B] dark:text-[#E4E4E7]"
                                                    >
                                                        <option value="">Select…</option>
                                                        {/* keep a stored value that isn't one of the standard options selectable */}
                                                        {form[f.name] && !f.options.includes(form[f.name]) && (
                                                            <option value={form[f.name]}>{form[f.name]}</option>
                                                        )}
                                                        {f.options.map((o) => (
                                                            <option key={o} value={o}>{o}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                <Input
                                                    id={f.name}
                                                    type={f.type || "text"}
                                                    value={form[f.name]}
                                                    readOnly={f.readOnly}
                                                    required={f.required}
                                                    onChange={(event) => updateField(f.name, event.target.value)}
                                                    className={f.readOnly ? "cursor-not-allowed bg-zinc-100 font-semibold text-zinc-500 dark:bg-[#18181B]" : undefined}
                                                />
                                                )}
                                            </Field>
                                        ))}
                                    </div>
                                </Section>

                                <Section title="Contact" icon={Phone} tone="emerald">
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {CONTACT_FIELDS.map((f) => (
                                            <Field key={f.name} id={f.name} label={f.label} icon={f.icon}>
                                                <Input
                                                    id={f.name}
                                                    value={form[f.name]}
                                                    onChange={(event) => updateField(f.name, event.target.value)}
                                                />
                                            </Field>
                                        ))}
                                    </div>
                                </Section>

                                <Section title="About" icon={User} tone="violet">
                                    <div className="space-y-4">
                                        <Field id="bio" label="Bio" icon={User}>
                                            <Textarea
                                                id="bio"
                                                value={form.bio}
                                                onChange={(event) => updateField("bio", event.target.value)}
                                                className="min-h-24 text-[13px]"
                                            />
                                        </Field>
                                    </div>
                                </Section>
                            </>
                        )}
                    </div>

                    <Section title="Account" icon={Shield} tone="amber">
                        <dl className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            <ReadOnlyDetail icon={Mail} label="Email" value={user?.email || user?.name || currentUser} />
                            <ReadOnlyDetail icon={Briefcase} label="Employee ID" value={user?.employee_id} />
                            <ReadOnlyDetail
                                icon={Building2}
                                label="Department"
                                value={user?.department_name ? <DepartmentName name={user.department_name} /> : null}
                            />
                            <ReadOnlyDetail icon={Briefcase} label="Designation" value={user?.designation_name} />
                            <ReadOnlyDetail icon={User} label="Employee Class" value={resolvedEmpclass || undefined} />
                            <ReadOnlyDetail icon={Calendar} label="Time Zone" value={user?.time_zone} />
                        </dl>
                    </Section>
                </div>

                {!isStudent && (
                    <div className="sticky bottom-2 flex flex-col-reverse gap-2 rounded-lg border border-zinc-200 bg-white/95 px-4 py-2.5 shadow-md backdrop-blur-sm dark:border-zinc-800 dark:bg-[#27272A]/95 sm:flex-row sm:items-center sm:justify-between">
                        <p className="hidden text-xs font-medium text-zinc-500 sm:block">
                            {isDirty ? "You have unsaved changes" : "All changes saved"}
                        </p>
                        <div className="flex flex-col-reverse gap-3 sm:flex-row">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                disabled={!isDirty || isSaving}
                                className="font-semibold"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Discard
                            </Button>
                            <Button
                                type="submit"
                                disabled={!isDirty || isSaving}
                                className="bg-[#2563EB] text-[13px] font-medium text-white hover:bg-[#1D4ED8]"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? "Saving..." : "Save Profile"}
                            </Button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}
