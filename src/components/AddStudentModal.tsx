import React from "react";
import { X, Search, Loader2, GraduationCap, CheckCircle2, AlertCircle } from "lucide-react";
import { useFrappePostCall, useFrappeGetCall } from "frappe-react-sdk";
import { studentAPI } from "@/services/apiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface AddStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface StudentData {
    sname: string;
    email_id: string;
    roll_no: string;
    d_name: string;
    hostel_name: string | null;
    dob: string;
    sex: string;
    category_id: string;
}

interface PiProject {
    name: string;
    project_title: string;
}

const extractError = (err: any): string => {
    const serverMessages = err?._server_messages;
    if (serverMessages) {
        try {
            const parsed = JSON.parse(serverMessages);
            const first = JSON.parse(parsed[0]);
            if (first?.message) return first.message;
        } catch {
            /* fall through */
        }
    }
    return err?.message || err?.exc || "Something went wrong. Please try again.";
};

export const AddStudentModal: React.FC<AddStudentModalProps> = ({ isOpen, onClose }) => {
    const [email, setEmail] = React.useState("");
    const [student, setStudent] = React.useState<StudentData | null>(null);
    const [selectedProjects, setSelectedProjects] = React.useState<string[]>([]);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState<string | null>(null);

    const { call: fetchStudent, loading: fetching } = useFrappePostCall<{
        message: { status: string; data: StudentData };
    }>(studentAPI.getByEmail);

    const { call: submitStudent, loading: submitting } = useFrappePostCall<{
        message: { status: string; docname: string; message: string };
    }>(studentAPI.addStudent);

    // Load the PI's own projects once the modal is open.
    const { data: projectsResp, isLoading: loadingProjects } = useFrappeGetCall<{
        message: { status: string; data: PiProject[] };
    }>(studentAPI.getPiProjects, undefined, isOpen ? undefined : null);

    const piProjects = projectsResp?.message?.data ?? [];

    // Reset everything when the modal is closed.
    React.useEffect(() => {
        if (!isOpen) {
            setEmail("");
            setStudent(null);
            setSelectedProjects([]);
            setError(null);
            setSuccess(null);
        }
    }, [isOpen]);

    const handleFetch = async () => {
        setError(null);
        setSuccess(null);
        setStudent(null);
        if (!email.trim()) {
            setError("Please enter a student email id.");
            return;
        }
        try {
            const res = await fetchStudent({ email: email.trim() });
            setStudent(res?.message?.data ?? null);
        } catch (err) {
            setError(extractError(err));
        }
    };

    const toggleProject = (name: string) => {
        setSelectedProjects((prev) =>
            prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name],
        );
    };

    const handleSubmit = async () => {
        setError(null);
        setSuccess(null);
        if (!student) {
            setError("Please fetch the student details first.");
            return;
        }
        if (selectedProjects.length === 0) {
            setError("Please attach at least one project.");
            return;
        }
        try {
            const res = await submitStudent({
                email: email.trim(),
                projects: selectedProjects,
            });
            setSuccess(res?.message?.message || "Student added successfully.");
            setStudent(null);
            setEmail("");
            setSelectedProjects([]);
        } catch (err) {
            setError(extractError(err));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col rounded-2xl bg-white dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#EEF2FF] dark:bg-[#4A6CF7]/15 text-[#4A6CF7] dark:text-[#93C5FD]">
                            <GraduationCap className="w-[18px] h-[18px]" />
                        </div>
                        <div>
                            <h2 className="text-[15px] font-bold text-[#18181B] dark:text-[#E4E4E7] leading-tight">
                                Add Student
                            </h2>
                            <p className="text-[11px] text-[#71717A] leading-tight">
                                Register a student under your projects
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-[#71717A] hover:bg-[#F4F4F5] dark:hover:bg-[#27272A] hover:text-[#18181B] dark:hover:text-[#E4E4E7] transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {/* Email field */}
                    <div className="space-y-1.5">
                        <Label htmlFor="student-email" className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#A1A1AA]">
                            Student Email ID
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="student-email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleFetch()}
                                placeholder="e.g. a.sumit"
                                className="flex-1 h-9 text-[13px]"
                                disabled={fetching || submitting}
                            />
                            <Button
                                onClick={handleFetch}
                                disabled={fetching || submitting}
                                className="h-9 px-3 gap-1.5 text-[12px]"
                            >
                                {fetching ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Search className="w-3.5 h-3.5" />
                                )}
                                Fetch
                            </Button>
                        </div>
                    </div>

                    {/* Fetched student details */}
                    {student && (
                        <div className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAFA] dark:bg-[#27272A]/40 p-3.5">
                            <div className="text-[13px] font-bold text-[#18181B] dark:text-[#E4E4E7] mb-2">
                                {student.sname}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11.5px]">
                                <DetailRow label="Roll No" value={student.roll_no} />
                                <DetailRow label="Email" value={student.email_id} />
                                <DetailRow label="Department" value={student.d_name} />
                                <DetailRow label="Gender" value={student.sex} />
                                <DetailRow label="DOB" value={student.dob} />
                                <DetailRow label="Category" value={student.category_id} />
                            </div>
                        </div>
                    )}

                    {/* Project picker */}
                    {student && (
                        <div className="space-y-1.5">
                            <Label className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#A1A1AA]">
                                Attach Project(s)
                            </Label>
                            {loadingProjects ? (
                                <div className="flex items-center gap-2 text-[12px] text-[#71717A] py-2">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading your projects…
                                </div>
                            ) : piProjects.length === 0 ? (
                                <p className="text-[12px] text-[#71717A] py-2">
                                    You don't have any projects to attach.
                                </p>
                            ) : (
                                <div className="max-h-44 overflow-y-auto rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] divide-y divide-[#F4F4F5] dark:divide-[#27272A]">
                                    {piProjects.map((proj) => {
                                        const checked = selectedProjects.includes(proj.name);
                                        return (
                                            <label
                                                key={proj.name}
                                                className={cn(
                                                    "flex items-start gap-2.5 px-3 py-2.5 cursor-pointer transition-colors",
                                                    checked
                                                        ? "bg-[#EEF2FF] dark:bg-[#4A6CF7]/10"
                                                        : "hover:bg-[#F4F4F5] dark:hover:bg-[#27272A]",
                                                )}
                                            >
                                                <Checkbox
                                                    checked={checked}
                                                    onCheckedChange={() => toggleProject(proj.name)}
                                                    className="mt-0.5"
                                                />
                                                <div className="min-w-0">
                                                    <div className="text-[12px] font-semibold text-[#18181B] dark:text-[#E4E4E7] truncate">
                                                        {proj.project_title || proj.name}
                                                    </div>
                                                    <div className="text-[10.5px] text-[#71717A] truncate">
                                                        {proj.name}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error / success */}
                    {error && (
                        <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 px-3 py-2.5 text-[12px] text-red-700 dark:text-red-400">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </div>
                    )}
                    {success && (
                        <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/40 px-3 py-2.5 text-[12px] text-green-700 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>{success}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#E4E4E7] dark:border-[#3F3F46]">
                    <Button variant="outline" onClick={onClose} className="h-9 text-[12px]" disabled={submitting}>
                        Close
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!student || submitting || selectedProjects.length === 0}
                        className="h-9 text-[12px] gap-1.5"
                    >
                        {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Add Student
                    </Button>
                </div>
            </div>
        </div>
    );
};

const DetailRow: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wide text-[#A1A1AA]">{label}</span>
        <span className="text-[#18181B] dark:text-[#E4E4E7] font-medium truncate">{value || "—"}</span>
    </div>
);
