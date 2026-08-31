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
    ImageIcon,
    Mail,
    MapPin,
    Phone,
    Save,
    Shield,
    Upload,
    User,
    X,
} from "lucide-react";
import { useSWRConfig } from "swr";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    if (image.startsWith("http")) return image;
    return image;
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
    <div className="space-y-1.5">
        <Label
            htmlFor={id}
            className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#E4E4E7]"
        >
            <Icon className="h-3.5 w-3.5 text-[#4A6CF7]" />
            {label}
        </Label>
        {children}
    </div>
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
    <div className="flex items-start gap-3 rounded-lg border border-[#E5E7EB] bg-zinc-50/50 p-3 dark:border-[#374151] dark:bg-[#27272A]/60">
        <Icon className="mt-0.5 h-4 w-4 text-[#4A6CF7] dark:text-[#818CF8] flex-shrink-0" />
        <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#71717A] dark:text-[#A1A1AA]">
                {label}
            </p>
            <p className="mt-1 break-words text-sm font-medium text-[#3F3F46] dark:text-[#E4E4E7]">
                {value || "Not set"}
            </p>
        </div>
    </div>
);

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
    } = useFrappeGetDoc<UserDoc>("User", currentUser || "", {
        fields: [
            "name",
            "email",
            "first_name",
            "middle_name",
            "last_name",
            "full_name",
            "username",
            "user_image",
            "pi_initials",
            "phone",
            "mobile_no",
            "location",
            "birth_date",
            "gender",
            "bio",
            "employee_id",
            "department_name",
            "designation_name",
            "empclass",
            "language",
            "time_zone",
            "enabled",
            "roles",
        ],
        enabled: !!currentUser,
    });

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
            const response = await fetch("/api/method/upload_file", {
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
            <div className="space-y-6">
                <PageHeader title="Profile" showBack={false} />
                <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                    <div className="h-80 animate-pulse rounded-2xl border border-[#E4E4E7] bg-white dark:border-[#3F3F46] dark:bg-[#27272A]" />
                    <div className="h-96 animate-pulse rounded-2xl border border-[#E4E4E7] bg-white dark:border-[#3F3F46] dark:bg-[#27272A]" />
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

    return (
        <div className="space-y-6 text-[#3F3F46] dark:text-[#E4E4E7] min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] -m-6 p-6">
            <PageHeader title="Profile" showBack={false}>
                <div
                    className={cn(
                        "rounded-md border px-3 py-1 text-sm font-bold",
                        isDirty
                            ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                            : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
                    )}
                >
                    {isDirty ? "Unsaved changes" : "Up to date"}
                </div>
            </PageHeader>

            <form
                onSubmit={handleSave}
                className="grid gap-6 lg:grid-cols-[320px_1fr]"
            >
                <div className="space-y-6">
                    <Card className="overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm bg-white dark:bg-[#27272A]">
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-[3px] border-[#4A6CF7]/30 bg-[#EEF2FF] text-2xl font-bold text-[#4A6CF7] dark:border-[#4A6CF7]/40 dark:bg-[#1C2434] dark:text-[#818CF8]">
                                    {form.user_image ? (
                                        <img
                                            src={getImageUrl(form.user_image)}
                                            alt={form.full_name || "Profile"}
                                            className="h-full w-full object-cover"
                                            onError={(event) => {
                                                event.currentTarget.style.display =
                                                    "none";
                                            }}
                                        />
                                    ) : (
                                        initials
                                    )}
                                </div>
                                <h2 className="mt-4 text-xl font-bold">
                                    {form.full_name || "User"}
                                </h2>
                                <p className="mt-1 break-all text-sm font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                    {currentUser}
                                </p>
                                <div
                                    className={cn(
                                        "mt-4 rounded-md border px-3 py-1 text-xs font-bold",
                                        user?.enabled
                                            ? "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                                            : "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300",
                                    )}
                                >
                                    {user?.enabled ? "Enabled" : "Disabled"}
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(event) =>
                                        handleProfileImageUpload(
                                            event.target.files?.[0],
                                        )
                                    }
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="mt-5 w-full"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    disabled={isUploadingImage || isSaving}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {isUploadingImage
                                        ? "Uploading..."
                                        : "Upload Profile Picture"}
                                </Button>
                                {isDirty && form.user_image && (
                                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300">
                                        Save profile to apply the uploaded
                                        picture.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/*<Card className="rounded-lg shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between gap-2 text-base font-bold">
                                <span className="flex items-center gap-2">
                                    <Shield className="h-4 w-4" />
                                    Assigned Roles
                                </span>
                                <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-bold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
                                    {roles.length}
                                </span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {isRolesLoading ? (
                                <p className="text-sm font-medium text-zinc-500">
                                    Loading roles...
                                </p>
                            ) : roles.length ? (
                                roles.map((role) => (
                                    <div
                                        key={role}
                                        className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold dark:border-zinc-800 dark:bg-zinc-800/50"
                                    >
                                        {role}
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm font-medium text-zinc-500">
                                    No roles assigned.
                                </p>
                            )}
                        </CardContent>
                    </Card>*/}
                </div>

                <div className="space-y-6">
                    {/* Students edit their own `student_details` record here; the
                        User-doc fields below are hidden for them. */}
                    {isStudent && (
                        <Card className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm bg-white dark:bg-[#27272A]">
                            <CardHeader className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] px-6 py-4">
                                <CardTitle className="flex items-center gap-2.5 text-base font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                    <div className="w-1 h-5 rounded-full bg-[#D97757]" />
                                    Student Details
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="grid gap-5 md:grid-cols-2">
                                    {STUDENT_PROFILE_FIELDS.map((f) => (
                                        <Field key={f.name} id={f.name} label={f.label} icon={f.icon}>
                                            {f.options ? (
                                                <select
                                                    id={f.name}
                                                    className="flex h-10 w-full rounded-md border border-[#E4E4E7] bg-white px-3 py-2 text-sm dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]"
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
                                <div className="mt-6 flex items-center justify-end gap-3">
                                    <span className="mr-auto text-xs font-medium text-[#A1A1AA] dark:text-[#71717A]">
                                        {studentDirty ? "You have unsaved changes" : "All changes saved"}
                                    </span>
                                    <Button
                                        type="button"
                                        onClick={handleStudentSave}
                                        disabled={!studentDirty || studentSaving}
                                        className="bg-[#D97757] hover:bg-[#c66a4e] text-white font-semibold"
                                    >
                                        <Save className="mr-2 h-4 w-4" />
                                        {studentSaving ? "Saving..." : "Save Student Details"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {!isStudent && (
                    <Card className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm bg-white dark:bg-[#27272A]">
                        <CardHeader className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] px-6 py-4">
                            <CardTitle className="flex items-center gap-2.5 text-base font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                <div className="w-1 h-5 rounded-full bg-[#4A6CF7]" />
                                Editable Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="grid gap-5 md:grid-cols-2">
                                <Field
                                    id="first_name"
                                    label="First Name"
                                    icon={User}
                                >
                                    <Input
                                        id="first_name"
                                        value={form.first_name}
                                        onChange={(event) =>
                                            updateField(
                                                "first_name",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field
                                    id="middle_name"
                                    label="Middle Name"
                                    icon={User}
                                >
                                    <Input
                                        id="middle_name"
                                        value={form.middle_name}
                                        onChange={(event) =>
                                            updateField(
                                                "middle_name",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field
                                    id="last_name"
                                    label="Last Name"
                                    icon={User}
                                >
                                    <Input
                                        id="last_name"
                                        value={form.last_name}
                                        onChange={(event) =>
                                            updateField(
                                                "last_name",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field
                                    id="full_name"
                                    label="Full Name"
                                    icon={BadgeCheck}
                                >
                                    <Input
                                        id="full_name"
                                        value={form.full_name}
                                        onChange={(event) =>
                                            updateField(
                                                "full_name",
                                                event.target.value,
                                            )
                                        }
                                        required
                                    />
                                </Field>
                                <Field
                                    id="username"
                                    label="Username"
                                    icon={User}
                                >
                                    <Input
                                        id="username"
                                        value={form.username}
                                        readOnly
                                        className="bg-[#F1F5F9] dark:bg-[#18181B] font-semibold text-[#71717A] dark:text-[#A1A1AA] cursor-not-allowed border-[#D1D5DB] dark:border-[#334155]"
                                    />
                                </Field>
                                <Field id="gender" label="Gender" icon={User}>
                                    <Input
                                        id="gender"
                                        value={form.gender}
                                        onChange={(event) =>
                                            updateField(
                                                "gender",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field
                                    id="pi_initials"
                                    label="PI Initials"
                                    icon={BadgeCheck}
                                >
                                    <Input
                                        id="pi_initials"
                                        value={form.pi_initials}
                                        readOnly
                                        className="bg-muted cursor-not-allowed opacity-70"
                                    />
                                </Field>
                                <Field id="phone" label="Phone" icon={Phone}>
                                    <Input
                                        id="phone"
                                        value={form.phone}
                                        onChange={(event) =>
                                            updateField(
                                                "phone",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field
                                    id="mobile_no"
                                    label="Mobile Number"
                                    icon={Phone}
                                >
                                    <Input
                                        id="mobile_no"
                                        value={form.mobile_no}
                                        onChange={(event) =>
                                            updateField(
                                                "mobile_no",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field
                                    id="birth_date"
                                    label="Birth Date"
                                    icon={Calendar}
                                >
                                    <Input
                                        id="birth_date"
                                        type="date"
                                        value={form.birth_date}
                                        onChange={(event) =>
                                            updateField(
                                                "birth_date",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <Field
                                    id="location"
                                    label="Location"
                                    icon={MapPin}
                                >
                                    <Input
                                        id="location"
                                        value={form.location}
                                        onChange={(event) =>
                                            updateField(
                                                "location",
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>
                                <div className="md:col-span-2">
                                    <Field
                                        id="user_image"
                                        label="Profile Image Path"
                                        icon={ImageIcon}
                                    >
                                        <Input
                                            id="user_image"
                                            value={form.user_image}
                                            onChange={(event) =>
                                                updateField(
                                                    "user_image",
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="/files/profile.jpg"
                                        />
                                    </Field>
                                </div>
                                <div className="md:col-span-2">
                                    <Field id="bio" label="Bio" icon={User}>
                                        <Textarea
                                            id="bio"
                                            value={form.bio}
                                            onChange={(event) =>
                                                updateField(
                                                    "bio",
                                                    event.target.value,
                                                )
                                            }
                                            className="min-h-28"
                                        />
                                    </Field>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    )}

                    <Card className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm bg-white dark:bg-[#27272A]">
                        <CardHeader className="border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A] px-6 py-4">
                            <CardTitle className="flex items-center gap-2.5 text-base font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                <div className="w-1 h-5 rounded-full bg-[#4A6CF7]" />
                                Account Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
                            <ReadOnlyDetail
                                icon={Mail}
                                label="Email"
                                value={user?.email || user?.name || currentUser}
                            />
                            <ReadOnlyDetail
                                icon={Briefcase}
                                label="Employee ID"
                                value={user?.employee_id}
                            />
                            <ReadOnlyDetail
                                icon={Building2}
                                label="Department"
                                value={
                                    user?.department_name ? (
                                        <DepartmentName
                                            name={user.department_name}
                                        />
                                    ) : null
                                }
                            />
                            <ReadOnlyDetail
                                icon={Briefcase}
                                label="Designation"
                                value={user?.designation_name}
                            />
                            <ReadOnlyDetail
                                icon={User}
                                label="Employee Class"
                                value={resolvedEmpclass || undefined}
                            />
                            <ReadOnlyDetail
                                icon={Calendar}
                                label="Time Zone"
                                value={user?.time_zone}
                            />
                        </CardContent>
                    </Card>

                    <div className="sticky bottom-4 flex flex-col-reverse gap-3 rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white/95 dark:bg-[#27272A]/95 px-4 py-3 shadow-lg shadow-black/5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                        <p className="hidden sm:block text-xs font-medium text-[#A1A1AA] dark:text-[#71717A]">
                            {isDirty ? "You have unsaved changes" : "All changes saved"}
                        </p>
                        <div className="flex gap-3 sm:flex-row flex-col-reverse">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={resetForm}
                                disabled={!isDirty || isSaving}
                                className="border-[#E4E4E7] dark:border-[#3F3F46] text-zinc-600 dark:text-zinc-300 hover:bg-[#F1F5F9] dark:hover:bg-[#1E293B] font-semibold"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Discard
                            </Button>
                            <Button
                                type="submit"
                                disabled={!isDirty || isSaving}
                                className="bg-[#4A6CF7] hover:bg-[#3558E8] text-white font-semibold shadow-sm hover:shadow-md hover:shadow-[#4A6CF7]/25 transition-all"
                            >
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? "Saving..." : "Save Profile"}
                            </Button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
