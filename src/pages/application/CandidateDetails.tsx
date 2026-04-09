import React, { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    Loader2,
    User,
    MapPin,
    GraduationCap,
    Briefcase,
    ClipboardCheck,
    FileText,
    ChevronDown,
    Download,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

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

// --- Collapsible Card ---
const CollapsibleCard = ({
    title,
    icon: Icon,
    children,
    defaultOpen = true,
}: {
    title: string;
    icon: React.ElementType;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] shadow-sm rounded-xl overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-6 py-4 bg-[#D97757] text-white cursor-pointer select-none"
            >
                <div className="flex items-center gap-2.5 font-semibold text-sm">
                    <Icon className="w-4.5 h-4.5" />
                    {title}
                </div>
                <ChevronDown
                    className={cn(
                        "w-4.5 h-4.5 transition-transform duration-200",
                        !isOpen && "-rotate-90"
                    )}
                />
            </button>
            <div
                className={cn(
                    "transition-all duration-300 overflow-hidden",
                    isOpen ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
                )}
            >
                <CardContent className="p-6">{children}</CardContent>
            </div>
        </Card>
    );
};

// --- Info Row ---
const InfoRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex border-b border-zinc-100 dark:border-zinc-800 last:border-0">
        <div className="w-[35%] px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
            {label}
        </div>
        <div className="flex-1 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
            {value || "-"}
        </div>
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

// --- Document Row (fetches binary from API and creates blob URLs) ---
const DocumentRow = ({ doc }: { doc: Document }) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [isLoadingDoc, setIsLoadingDoc] = useState(false);

    useEffect(() => {
        let objectUrl: string | null = null;

        const fetchDocBlob = async () => {
            setIsLoadingDoc(true);
            try {
                const resp = await fetch(
                    `http://172.16.134.191:3000/api/documents/${doc.id}`,
                    { headers: { Accept: "application/json" } }
                );
                if (!resp.ok) throw new Error("Failed to fetch document");
                const jsonResp = await resp.json();
                
                // The API returns { success: true, document: { file_data_base64: ... } }
                const docData = jsonResp.document || jsonResp;
                const raw: string = docData.file_data_base64;
                if (!raw) return;

                // Convert the raw binary string to a Uint8Array
                const bytes = new Uint8Array(raw.length);
                for (let i = 0; i < raw.length; i++) {
                    bytes[i] = raw.charCodeAt(i) & 0xff;
                }
                const blob = new Blob([bytes], { type: doc.mime_type || "application/octet-stream" });
                objectUrl = URL.createObjectURL(blob);
                setBlobUrl(objectUrl);
            } catch (err) {
                console.error("Error fetching document blob:", err);
            } finally {
                setIsLoadingDoc(false);
            }
        };

        fetchDocBlob();

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, [doc.id, doc.mime_type]);

    const handleDownload = () => {
        if (!blobUrl) return;
        const a = window.document.createElement("a");
        a.href = blobUrl;
        a.download = doc.document_name || "document";
        window.document.body.appendChild(a);
        a.click();
        window.document.body.removeChild(a);
    };

    const handlePreview = () => {
        if (blobUrl) window.open(blobUrl, "_blank");
    };

    return (
        <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
            <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                {doc.document_name || "-"}
            </td>
            <td className="px-4 py-3">
                <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {doc.document_type || "-"}
                </span>
            </td>
            <td className="px-4 py-3">
                {isLoadingDoc ? (
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                ) : blobUrl && doc.mime_type?.startsWith("image") ? (
                    <img
                        src={blobUrl}
                        alt={doc.document_name}
                        onClick={handlePreview}
                        className="w-16 h-16 object-contain rounded border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:opacity-80 transition-opacity"
                    />
                ) : (
                    <button
                        onClick={handlePreview}
                        disabled={!blobUrl}
                        className="text-zinc-400 hover:text-[#D97757] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FileText className="w-8 h-8" />
                    </button>
                )}
            </td>
            <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                {formatDate(doc.uploaded_at)}
            </td>
            <td className="px-4 py-3">
                <button
                    onClick={handleDownload}
                    disabled={!blobUrl}
                    className="inline-flex items-center gap-1.5 text-sm text-[#D97757] hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Download className="w-3.5 h-3.5" />
                    Download
                </button>
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
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Status update state
    const [selectedStatus, setSelectedStatus] = useState("");
    const [justification, setJustification] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    const fetchProfile = useCallback(async () => {
        if (!candidateId) {
            setError("No candidate ID provided.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `http://172.16.134.191:3000/api/candidates/${candidateId}/profile`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" },
                }
            );
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const result: CandidateProfile = await response.json();
            setProfile(result);

            // Pre-fill status from the matching application
            const matchingApp = result.applications?.find(
                (a) => String(a.id) === applicationId
            );
            if (matchingApp?.status) {
                setSelectedStatus(matchingApp.status);
            }
        } catch (err: any) {
            console.error("Error fetching candidate profile:", err);
            setError(err.message || "Failed to load candidate profile.");
        } finally {
            setIsLoading(false);
        }
    }, [candidateId, applicationId]);

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
                `http://172.16.134.191:3000/api/applications/${applicationId}/review`,
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
            console.error("Error updating status:", err);
            alert(`Failed to update status: ${err.message}`);
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

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <main className="max-w-5xl mx-auto p-4 md:p-8 w-full">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                                <User className="w-6 h-6 text-[#D97757]" />
                                Candidate Details
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                {fullName}
                            </p>
                        </div>
                    </div>
                    <span className="px-4 py-1.5 rounded-full bg-[#D97757] text-white text-sm font-semibold">
                        ID: {candidateId}
                    </span>
                </div>

                {/* Cards */}
                <div className="space-y-6">
                    {/* Personal Information */}
                    <CollapsibleCard title="Personal Information" icon={User} defaultOpen={true}>
                        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                            <InfoRow label="Full Name" value={fullName} />
                            <InfoRow label="Email" value={user.email} />
                            <InfoRow label="Father's Name" value={candidate.father_name} />
                            <InfoRow label="Gender" value={candidate.gender} />
                            <InfoRow label="Date of Birth" value={formatDate(candidate.date_of_birth)} />
                            <InfoRow label="Marital Status" value={candidate.marital_status} />
                            <InfoRow label="Citizenship" value={candidate.citizenship} />
                            <InfoRow label="Phone Number" value={candidate.phone_number} />
                            {candidate.cover_letter && (
                                <InfoRow label="Cover Letter" value={candidate.cover_letter} />
                            )}
                        </div>
                    </CollapsibleCard>

                    {/* Address Information */}
                    <CollapsibleCard title="Address Information" icon={MapPin} defaultOpen={false}>
                        {address && address.length > 0 ? (
                            <div className="space-y-4">
                                {address.map((addr) => (
                                    <div
                                        key={addr.addrId}
                                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                                    >
                                        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                                            <span className="text-sm font-semibold text-[#D97757] flex items-center gap-2">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {addr.addrType} Address
                                            </span>
                                        </div>
                                        <InfoRow label="House No" value={addr.houseNum} />
                                        <InfoRow label="Street" value={addr.streetName} />
                                        <InfoRow label="Locality" value={addr.locality} />
                                        <InfoRow label="City" value={addr.city} />
                                        <InfoRow label="District" value={addr.district} />
                                        <InfoRow label="State" value={addr.state} />
                                        <InfoRow label="Country" value={addr.country} />
                                        <InfoRow label="Pincode" value={addr.pincode} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 italic text-center py-6">
                                No address information provided.
                            </p>
                        )}
                    </CollapsibleCard>

                    {/* Educational Qualifications */}
                    <CollapsibleCard title="Educational Qualifications" icon={GraduationCap} defaultOpen={false}>
                        {education && education.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                        <tr>
                                            {["Board/University", "Specialization", "Division", "Exam", "Percentage", "Date of Passing"].map((h) => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {education.map((edu) => (
                                            <tr key={edu.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                                <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">{edu.boardName || "-"}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{edu.examName || "-"}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{edu.distinction || "-"}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{edu.level_of_edu || "-"}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{edu.percentage || "-"}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{formatDate(edu.dateOfPassing)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 italic text-center py-6">
                                No educational qualifications provided.
                            </p>
                        )}
                    </CollapsibleCard>

                    {/* Employment History */}
                    <CollapsibleCard title="Employment History" icon={Briefcase} defaultOpen={false}>
                        {employment && employment.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                        <tr>
                                            {["Organization", "Position", "From - To", "Last Pay", "Scale"].map((h) => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {employment.map((emp) => (
                                            <tr key={emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                                                <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">{emp.organization || "-"}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{emp.position || "-"}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                    {formatDate(emp.joiningDate)} - {emp.leavingDate ? formatDate(emp.leavingDate) : "Present"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{emp.lastPay || "-"}</td>
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{emp.scaleOfPay || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 italic text-center py-6">
                                No employment history provided.
                            </p>
                        )}
                    </CollapsibleCard>

                    {/* Recruitment Info */}
                    <CollapsibleCard title="Recruitment Info" icon={ClipboardCheck} defaultOpen={false}>
                        {applications && applications.length > 0 ? (
                            <div className="space-y-4">
                                {applications.map((app) => (
                                    <div
                                        key={app.id}
                                        className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                                    >
                                        <InfoRow label="Application Number" value={app.application_number} />
                                        <InfoRow label="Status" value={<StatusBadge status={app.status} />} />
                                        <InfoRow label="Submitted At" value={formatDate(app.submitted_at)} />
                                        {app.justification && (
                                            <InfoRow label="Justification" value={app.justification} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 italic text-center py-6">
                                No recruitment information available.
                            </p>
                        )}
                    </CollapsibleCard>

                    {/* Uploaded Documents */}
                    <CollapsibleCard title="Uploaded Documents" icon={FileText} defaultOpen={false}>
                        {documents && documents.length > 0 ? (
                            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                        <tr>
                                            {["Document", "Type", "Preview", "Uploaded", "Action"].map((h) => (
                                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                        {documents.map((doc) => (
                                            <DocumentRow key={doc.id} doc={doc} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 italic text-center py-6">
                                No documents uploaded.
                            </p>
                        )}
                    </CollapsibleCard>

                    {/* Status Update Form */}
                    <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] shadow-sm rounded-xl overflow-hidden">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-5">
                                Update Application Status
                            </h3>
                            <form onSubmit={handleStatusUpdate}>
                                <div className="mb-4">
                                    <label htmlFor="status-select" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                                        Status
                                    </label>
                                    <select
                                        id="status-select"
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757]"
                                        required
                                    >
                                        <option value="">Select Status</option>
                                        <option value="Submitted">Submitted</option>
                                        <option value="Under Review">Under Review</option>
                                        <option value="Shortlisted">Shortlisted</option>
                                        <option value="Not Shortlisted">Not Shortlisted</option>
                                    </select>
                                </div>

                                {(selectedStatus === "Shortlisted" || selectedStatus === "Not Shortlisted") && (
                                    <div className="mb-4">
                                        <label htmlFor="justification" className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                                            Justification <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            id="justification"
                                            value={justification}
                                            onChange={(e) => setJustification(e.target.value)}
                                            rows={4}
                                            placeholder="Provide detailed justification for your decision..."
                                            className="w-full px-4 py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] resize-none"
                                            required
                                        />
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
                                    {isUpdating ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <ClipboardCheck className="w-4 h-4" />
                                    )}
                                    {isUpdating ? "Updating..." : "Update Status"}
                                </button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
        </div>
    );
};

export default CandidateDetails;
