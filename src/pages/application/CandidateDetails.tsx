import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { CharLimitAlert } from "@/components/CharLimitAlert";
import { FIELD_CHAR_LIMITS } from "@/utils/fieldLimits";
import {
    ArrowLeft,
    Loader2,
    User,
    MapPin,
    GraduationCap,
    Briefcase,
    ClipboardCheck,
    FileText,
    Download,
    Mail,
    Phone,
    ExternalLink,
    Calendar,
    Building2,
    Inbox,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { candidateAPI } from "@/services/apiService";
import { ErrorModal } from "../../components/ErrorModal";
import { parseFrappeError } from "../../utils/errorUtils";

// --- Types ---
interface UserInfo {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
}

interface CandidateInfo {
    user_id: number;
    father_name: string;
    marital_status: string;
    gender: string;
    date_of_birth: string;
    citizenship: string;
    phone_number: string;
    cover_letter: string;
}

interface Address {
    addrId: number;
    candidate_id: number;
    addrType: string;
    houseNum: string;
    streetName: string;
    locality: string;
    city: string;
    district: string;
    state: string;
    country: string;
    pincode: string;
}

interface Application {
    id: number;
    application_number: string;
    recruitment_post_id: number;
    status: string;
    justification: string | null;
    submitted_at: string;
}

interface Education {
    id: number;
    candidate_id: number;
    level_of_edu: string;
    stream: string;
    boardName: string;
    examName: string;
    distinction: string;
    percentage: string;
    dateOfPassing: string;
}

interface Employment {
    id: number;
    candidate_id: number;
    organization: string;
    position: string;
    joiningDate: string;
    leavingDate: string | null;
    lastPay: string;
    scaleOfPay: string;
}

interface Document {
    id: number;
    document_name: string;
    document_type: string;
    mime_type: string;
    uploaded_at: string;
    file_data_base64: string;
}

interface CandidateProfile {
    user: UserInfo;
    candidate: CandidateInfo;
    address: Address[];
    applications: Application[];
    education: Education[];
    employment: Employment[];
    documents: Document[];
}

// --- Tab definitions ---
const TABS = [
    { key: "personal", label: "Personal", icon: User },
    { key: "address", label: "Address", icon: MapPin },
    { key: "education", label: "Education", icon: GraduationCap },
    { key: "employment", label: "Employment", icon: Briefcase },
    { key: "recruitment", label: "Recruitment", icon: ClipboardCheck },
    { key: "documents", label: "Documents", icon: FileText },
    { key: "review", label: "Review", icon: ClipboardCheck },
] as const;

// --- Field tile (label above value) ---
const Field = ({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) => (
    <div className={cn("min-w-0 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 px-3 py-1.5", className)}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</div>
        <div className="break-words text-sm font-medium text-zinc-900 dark:text-zinc-100">{value || "-"}</div>
    </div>
);

// --- Section heading inside a tab ---
const SectionTitle = ({ icon: Icon, title, hint }: { icon: React.ElementType; title: string; hint?: string }) => (
    <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-zinc-800 dark:text-zinc-100">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D97757]/10 text-[#D97757]">
                <Icon className="h-4 w-4" />
            </span>
            {title}
        </h3>
        {hint && <span className="text-xs text-zinc-400">{hint}</span>}
    </div>
);

// --- Empty state ---
const EmptyState = ({ text }: { text: string }) => (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 py-8 text-center">
        <Inbox className="h-7 w-7 text-zinc-300 dark:text-zinc-600" />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{text}</p>
    </div>
);

// --- Status Badge ---
const StatusBadge = ({ status }: { status: string }) => {
    const normalized = status?.toLowerCase() || "";
    return (
        <span
            className={cn(
                "inline-flex px-2.5 py-1 text-xs font-semibold rounded-full",
                normalized === "shortlisted" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                normalized === "under review" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
                (normalized === "rejected" || normalized === "not shortlisted") && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
                normalized === "submitted" && "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
                !["shortlisted", "under review", "rejected", "not shortlisted", "submitted"].includes(normalized) &&
                "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
            )}
        >
            {status}
        </span>
    );
};

// --- Format Date ---
const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return dateStr;
    }
};


// --- Document Row ---
const DocumentRow = ({ doc, index }: { doc: Document; index: number }) => {
    const viewUrl = candidateAPI.viewDocument(doc.id);
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const resp = await fetch(viewUrl, { credentials: "include" });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = window.document.createElement("a");
            a.href = url;
            a.download = doc.document_name || `document-${doc.id}`;
            window.document.body.appendChild(a);
            a.click();
            window.document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            window.open(viewUrl, "_blank");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <td className="px-3 py-2 text-xs text-zinc-400">{index + 1}</td>
            <td className="px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <span className="inline-flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-[#D97757]" />
                    {doc.document_name || "-"}
                </span>
            </td>
            <td className="px-3 py-2">
                <span className="inline-flex rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {doc.document_type || "-"}
                </span>
            </td>
            <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{formatDate(doc.uploaded_at)}</td>
            <td className="px-3 py-2">
                <div className="flex justify-end gap-2">
                    <a
                        href={viewUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                    >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                    </a>
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#D97757] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#c5684a] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        {isDownloading ? "Downloading…" : "Download"}
                    </button>
                </div>
            </td>
        </tr>
    );
};

// === MAIN COMPONENT ===
const CandidateDetails: React.FC = () => {
    const { candidateId } = useParams<{ candidateId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const refNum = searchParams.get("refNum") || "";
    const applicationId = searchParams.get("applicationId") || "";

    const [profile, setProfile] = useState<CandidateProfile | null>(null);
    const [postDesignations, setPostDesignations] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { call: fetchFrappeDoc } = useFrappePostCall<{ message: any }>("frappe.client.get");

    const [activeTab, setActiveTab] = useState<typeof TABS[number]["key"]>("personal");

    // Status update state
    const [selectedStatus, setSelectedStatus] = useState("");
    const [justification, setJustification] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });

    const fetchProfile = useCallback(async () => {
        if (!candidateId) {
            setError("No candidate ID provided.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const [response, recRes] = await Promise.all([
                fetch(candidateAPI.getProfile(candidateId), { headers: { Accept: "application/json" } }),
                refNum ? fetchFrappeDoc({ doctype: "Recruitment Adhoc Contractual", name: refNum }).catch(() => null) : Promise.resolve(null),
            ]);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result: CandidateProfile = await response.json();
            setProfile(result);

            // Build post designation map from child table
            const postRows: any[] = recRes?.message?.upfa_post_details ?? [];
            const map: Record<string, string> = {};
            for (const row of postRows) {
                if (row.name) map[String(row.name)] = row.upfa_designation || "";
            }
            setPostDesignations(map);

            // Pre-fill status from the matching application
            const matchingApp = result.applications?.find((a) => String(a.id) === applicationId);
            if (matchingApp?.status) setSelectedStatus(matchingApp.status);
        } catch (err: any) {
            setError(err.message || "Failed to load candidate profile.");
        } finally {
            setIsLoading(false);
        }
    }, [candidateId, applicationId, refNum, fetchFrappeDoc]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleStatusUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStatus) {
            alert("Please select a status.");
            return;
        }
        setIsUpdating(true);
        try {
            const response = await fetch(
                candidateAPI.reviewApplication(applicationId),
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        status: selectedStatus,
                        justification: justification,
                    }),
                }
            );
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            alert("Status updated successfully!");
            fetchProfile();
        } catch (err: any) {
            setErrorModal({ open: true, title: "Status Update Failed", message: parseFrappeError(err) });
        } finally {
            setIsUpdating(false);
        }
    };

    // --- RENDER ---
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#D97757]" />
                <p className="text-zinc-500 font-medium">Loading candidate details...</p>
            </div>
        );
    }

    if (error || !profile) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <p className="text-red-600 dark:text-red-400 font-medium">{error || "Profile not found."}</p>
                <button onClick={() => navigate(-1)} className="text-[#D97757] hover:underline">
                    Go Back
                </button>
            </div>
        );
    }

    const { user, candidate, address, education, employment, documents, applications } = profile;
    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim();
    const initials = (`${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}` || fullName[0] || "?").toUpperCase();
    const currentApp = applications?.find((a) => String(a.id) === applicationId) ?? applications?.[0];
    const counts: Partial<Record<typeof TABS[number]["key"], number>> = {
        address: address?.length ?? 0,
        education: education?.length ?? 0,
        employment: employment?.length ?? 0,
        documents: documents?.length ?? 0,
    };

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <main className="p-0 w-full space-y-3">
                {/* Profile header */}
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] shadow-sm overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-[#D97757] via-[#E8A07F] to-[#4A6CF7]" />
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700"
                            aria-label="Go back"
                        >
                            <ArrowLeft className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                        </button>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#D97757]/12 text-base font-extrabold text-[#D97757]">
                            {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Candidate</div>
                            <h1 className="truncate text-xl font-bold text-zinc-900 dark:text-zinc-100">{fullName || "-"}</h1>
                            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {user.email && <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{user.email}</span>}
                                {candidate.phone_number && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{candidate.phone_number}</span>}
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            {currentApp?.status && <StatusBadge status={currentApp.status} />}
                            <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                ID: {candidateId}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] p-1 shadow-sm">
                    {TABS.map(({ key, label, icon: Icon }) => {
                        const active = activeTab === key;
                        const count = counts[key];
                        return (
                            <button
                                key={key}
                                onClick={() => setActiveTab(key)}
                                className={cn(
                                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold whitespace-nowrap transition-colors",
                                    active
                                        ? "bg-[#D97757] text-white shadow-sm"
                                        : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                                {count !== undefined && (
                                    <span className={cn(
                                        "min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold leading-none",
                                        active ? "bg-white/25 text-white" : "bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                                    )}>{count}</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Tab Content */}
                <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] shadow-sm rounded-xl overflow-hidden">
                    <CardContent className="p-4">

                        {/* Personal */}
                        {activeTab === "personal" && (
                            <div className="space-y-3">
                                <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 px-4 py-3">
                                    <dl className="grid grid-cols-2 gap-x-6 gap-y-2.5 md:grid-cols-4 xl:grid-cols-6">
                                        {([
                                            ["Full Name", fullName],
                                            ["Father's Name", candidate.father_name],
                                            ["Gender", candidate.gender],
                                            ["Date of Birth", formatDate(candidate.date_of_birth)],
                                            ["Marital Status", candidate.marital_status],
                                            ["Citizenship", candidate.citizenship],
                                            ["Email", user.email],
                                            ["Phone Number", candidate.phone_number],
                                        ] as [string, React.ReactNode][]).map(([label, value]) => (
                                            <div key={label} className="min-w-0">
                                                <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">{label}</dt>
                                                <dd className="break-words text-sm font-medium text-zinc-900 dark:text-zinc-100">{value || "-"}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </div>
                                {candidate.cover_letter && (
                                    <div>
                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">Cover letter</div>
                                        <div className="whitespace-pre-wrap rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 px-4 py-3 text-sm leading-6 text-zinc-800 dark:text-zinc-200">
                                            {candidate.cover_letter}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Address */}
                        {activeTab === "address" && (
                            address && address.length > 0 ? (
                                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                    {address.map((addr, i) => (
                                        <div key={addr.addrId} className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                            <div className="flex items-center gap-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#D97757] text-xs font-extrabold text-white">{i + 1}</span>
                                                <MapPin className="h-4 w-4 text-[#D97757]" />
                                                <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{addr.addrType || "-"} Address</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4">
                                                <Field label="House No" value={addr.houseNum} />
                                                <Field label="Street" value={addr.streetName} />
                                                <Field label="Locality" value={addr.locality} />
                                                <Field label="City" value={addr.city} />
                                                <Field label="District" value={addr.district} />
                                                <Field label="State" value={addr.state} />
                                                <Field label="Country" value={addr.country} />
                                                <Field label="Pincode" value={addr.pincode} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState text="No address information provided." />
                            )
                        )}

                        {/* Education */}
                        {activeTab === "education" && (
                            education && education.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">#</th>
                                                {["Board/University", "Specialization", "Division", "Exam", "Percentage", "Date of Passing"].map((h) => (
                                                    <th key={h} className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {education.map((edu, i) => (
                                                <tr key={edu.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                                    <td className="px-3 py-2 text-xs text-zinc-400">{i + 1}</td>
                                                    <td className="px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{edu.boardName || "-"}</td>
                                                    <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{edu.examName || "-"}</td>
                                                    <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{edu.distinction || "-"}</td>
                                                    <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{edu.level_of_edu || "-"}</td>
                                                    <td className="px-3 py-2 text-sm">
                                                        {edu.percentage ? (
                                                            <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">{edu.percentage}</span>
                                                        ) : "-"}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{formatDate(edu.dateOfPassing)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState text="No educational qualifications provided." />
                            )
                        )}

                        {/* Employment */}
                        {activeTab === "employment" && (
                            employment && employment.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">#</th>
                                                {["Organization", "Position", "From - To", "Last Pay", "Scale"].map((h) => (
                                                    <th key={h} className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {employment.map((emp, i) => (
                                                <tr key={emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                                    <td className="px-3 py-2 text-xs text-zinc-400">{i + 1}</td>
                                                    <td className="px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{emp.organization || "-"}</td>
                                                    <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{emp.position || "-"}</td>
                                                    <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                                        {formatDate(emp.joiningDate)} – {emp.leavingDate ? formatDate(emp.leavingDate) : "Present"}
                                                    </td>
                                                    <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{emp.lastPay || "-"}</td>
                                                    <td className="px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300">{emp.scaleOfPay || "-"}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState text="No employment history provided." />
                            )
                        )}

                        {/* Recruitment */}
                        {activeTab === "recruitment" && (() => {
                            const matchedApp = applications?.find((a) => String(a.id) === applicationId);
                            const displayApps = matchedApp ? [matchedApp] : (applications ?? []);
                            return displayApps.length > 0 ? (
                                <div className="space-y-4">
                                    {displayApps.map((app) => (
                                        <div key={app.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2">
                                                <div>
                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Application</div>
                                                    <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{app.application_number}</div>
                                                </div>
                                                <StatusBadge status={app.status} />
                                            </div>
                                            <div className="p-3 space-y-2">
                                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                                    {postDesignations[String(app.recruitment_post_id)] && (
                                                        <Field label="Applied Post" value={postDesignations[String(app.recruitment_post_id)]} />
                                                    )}
                                                    <Field label="Submitted At" value={formatDate(app.submitted_at)} />
                                                </div>
                                                {app.justification && (
                                                    <div>
                                                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">Justification</div>
                                                        <div className="whitespace-pre-wrap rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3 text-sm text-zinc-800 dark:text-zinc-200">
                                                            {app.justification}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <EmptyState text="No recruitment information available." />
                            );
                        })()}

                        {/* Documents */}
                        {activeTab === "documents" && (
                            documents && documents.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                    <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">#</th>
                                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Document</th>
                                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Type</th>
                                                <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Uploaded</th>
                                                <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                            {documents.map((doc, i) => (
                                                <DocumentRow key={doc.id} doc={doc} index={i} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState text="No documents uploaded." />
                            )
                        )}

                        {/* Review */}
                        {activeTab === "review" && (
                            <form onSubmit={handleStatusUpdate} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                <div className="lg:col-span-2 space-y-3">
                                    <SectionTitle icon={ClipboardCheck} title="Update application status" />
                                    <div>
                                        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status</div>
                                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
                                            {["Submitted", "Under Review", "Shortlisted", "Not Shortlisted"].map((st) => {
                                                const active = selectedStatus === st;
                                                return (
                                                    <button
                                                        key={st}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={active}
                                                        onClick={() => setSelectedStatus(st)}
                                                        className={cn(
                                                            "flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm font-semibold transition-colors",
                                                            active
                                                                ? "border-[#D97757] bg-[#D97757]/[0.07] ring-1 ring-[#D97757] text-zinc-900 dark:text-zinc-100"
                                                                : "border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                                                        )}
                                                    >
                                                        <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", active ? "border-[#D97757]" : "border-zinc-300 dark:border-zinc-600")}>
                                                            {active && <span className="h-2 w-2 rounded-full bg-[#D97757]" />}
                                                        </span>
                                                        {st}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    {(selectedStatus === "Shortlisted" || selectedStatus === "Not Shortlisted") && (
                                        <div>
                                            <label htmlFor="justification" className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                                Justification <span className="text-red-500">*</span>
                                            </label>
                                            <textarea
                                                id="justification"
                                                value={justification}
                                                onChange={(e) => setJustification(e.target.value)}
                                                rows={4}
                                                placeholder="Provide detailed justification for your decision..."
                                                maxLength={FIELD_CHAR_LIMITS.Text}
                                                className="w-full resize-y rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757]"
                                                required
                                            />
                                            <CharLimitAlert value={justification} maxLength={FIELD_CHAR_LIMITS.Text} className="mt-1" />
                                        </div>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isUpdating || !selectedStatus}
                                        className={cn(
                                            "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm text-white shadow-sm transition-all",
                                            "bg-[#D97757] hover:bg-[#c5684a]",
                                            "disabled:opacity-50 disabled:cursor-not-allowed"
                                        )}
                                    >
                                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
                                        {isUpdating ? "Updating..." : "Update Status"}
                                    </button>
                                </div>

                                <aside className="space-y-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/40 p-3 h-fit">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Current application</div>
                                    {currentApp ? (
                                        <>
                                            <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">{currentApp.application_number}</div>
                                            <StatusBadge status={currentApp.status} />
                                            {postDesignations[String(currentApp.recruitment_post_id)] && (
                                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                                    Applied for <span className="font-semibold text-zinc-700 dark:text-zinc-200">{postDesignations[String(currentApp.recruitment_post_id)]}</span>
                                                </div>
                                            )}
                                            <div className="text-xs text-zinc-500 dark:text-zinc-400">Submitted {formatDate(currentApp.submitted_at)}</div>
                                            {currentApp.justification && (
                                                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 text-xs text-zinc-600 dark:text-zinc-300">
                                                    <span className="font-semibold">Last note: </span>{currentApp.justification}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-xs text-zinc-500">No application found.</p>
                                    )}
                                </aside>
                            </form>
                        )}

                    </CardContent>
                </Card>
            </main>
            <ErrorModal
                open={errorModal.open}
                title={errorModal.title}
                message={errorModal.message}
                onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
            />
        </div>
    );
};

export default CandidateDetails;
