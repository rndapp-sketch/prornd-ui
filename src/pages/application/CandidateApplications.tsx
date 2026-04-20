import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Users, Eye, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// --- Types ---
interface CandidateApplication {
    id?: number;
    application_id: number;
    application_number: string;
    status: string;
    refNumParent: string;
    recruitment_post_id: number;
    candidate_id: number;
    first_name: string;
    last_name: string;
    email: string;
}

interface ApiResponse {
    data: CandidateApplication[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// --- Styled Components (matching project patterns) ---
const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <Card
        className={cn(
            "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] shadow-sm rounded-xl overflow-hidden",
            className,
        )}
    >
        <CardContent className="p-0">{children}</CardContent>
    </Card>
);

// --- Status badge ---
const StatusBadge = ({ status }: { status: string }) => {
    const normalized = status?.toLowerCase() || "";
    return (
        <span
            className={cn(
                "inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border",
                (normalized === "shortlisted" || normalized === "appeared") &&
                    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50",
                normalized === "under review" &&
                    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50",
                (normalized === "rejected" || normalized === "not shortlisted") &&
                    "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50",
                normalized === "submitted" &&
                    "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
                !["shortlisted", "under review", "rejected", "not shortlisted", "submitted", "appeared"].includes(normalized) &&
                    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50",
            )}
        >
            {status || "Unknown"}
        </span>
    );
};

// --- Main Component ---
const CandidateApplications: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const refNum = searchParams.get("refNum") || "";

    const [applications, setApplications] = useState<CandidateApplication[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("all");

    // Track which candidates have already been marked as "Appeared" in the SCR
    const [appearedCandidateIds, setAppearedCandidateIds] = useState<Set<string>>(new Set());
    const [isMarkingAppeared, setIsMarkingAppeared] = useState<string | null>(null); // application_id currently being marked

    // --- Fetch existing SCR to detect already-appeared candidates ---
    const fetchAppearedCandidates = useCallback(async () => {
        if (!refNum) return;
        try {
            // Query Frappe for Selection Committee Report docs with this interview_id
            const listRes = await fetch(
                `/api/method/frappe.client.get_list`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        doctype: "Selection Committee Report",
                        filters: { interview_id: refNum },
                        fields: ["name"],
                        limit_page_length: 1,
                    }),
                }
            );
            if (!listRes.ok) return;
            const listData = await listRes.json();
            const scrList = listData?.message || [];
            if (scrList.length === 0) return;

            const scrName = scrList[0].name;

            // Fetch the full SCR document to get the candidates JSON
            const docRes = await fetch(
                `/api/method/frappe.client.get`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        doctype: "Selection Committee Report",
                        name: scrName,
                    }),
                }
            );
            if (!docRes.ok) return;
            const docData = await docRes.json();
            const scrDoc = docData?.message;
            if (!scrDoc) return;

            // Parse the candidates JSON field
            let candidatesList: any[] = [];
            try {
                if (scrDoc.candidates) {
                    candidatesList = typeof scrDoc.candidates === "string"
                        ? JSON.parse(scrDoc.candidates)
                        : scrDoc.candidates;
                }
            } catch {
                candidatesList = [];
            }

            if (!Array.isArray(candidatesList)) return;

            // Auto-clean stale entries (those without application_id and email)
            const validCandidates = candidatesList.filter(
                (c: any) => c.application_id && c.email
            );

            // If stale entries were removed, save back the cleaned list
            if (validCandidates.length !== candidatesList.length) {
                try {
                    await fetch(
                        `/api/method/frappe.client.set_value`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json", Accept: "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                                doctype: "Selection Committee Report",
                                name: scrName,
                                fieldname: "candidates",
                                value: JSON.stringify(validCandidates),
                            }),
                        }
                    );
                    console.log(`Cleaned ${candidatesList.length - validCandidates.length} stale candidate entries from SCR`);
                } catch (cleanErr) {
                    console.error("Failed to clean stale candidates:", cleanErr);
                }
            }

            // Build set of appeared candidate application_ids
            const appearedIds = new Set<string>();
            validCandidates.forEach((c: any) => {
                if (c.application_id) {
                    appearedIds.add(String(c.application_id));
                }
            });
            setAppearedCandidateIds(appearedIds);
        } catch (err) {
            console.error("Error fetching appeared candidates from SCR:", err);
        }
    }, [refNum]);

    const fetchApplications = useCallback(async () => {
        if (!refNum) {
            setError("No reference number provided.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(
                `http://172.16.134.191:3000/api/applications?refNumParent=${encodeURIComponent(refNum)}`,
                {
                    method: "GET",
                    headers: { Accept: "application/json" },
                }
            );
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result: ApiResponse = await response.json();
            setApplications(result.data || []);
        } catch (err: any) {
            console.error("Error fetching candidate applications:", err);
            setError(err.message || "Failed to fetch candidate applications.");
            setApplications([]);
        } finally {
            setIsLoading(false);
        }
    }, [refNum]);

    // --- Handle "Mark Appeared" click: save candidate to SCR's candidates JSON ---
    const handleAppearedClick = async (app: CandidateApplication) => {
        if (!refNum) return;

        setIsMarkingAppeared(String(app.application_id));

        try {
            // 1. Find the existing SCR for this refNum, or auto-create one
            const listRes = await fetch(
                `/api/method/frappe.client.get_list`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        doctype: "Selection Committee Report",
                        filters: { interview_id: refNum },
                        fields: ["name"],
                        limit_page_length: 1,
                    }),
                }
            );
            if (!listRes.ok) throw new Error("Failed to find Selection Committee Report");
            const listData = await listRes.json();
            const scrList = listData?.message || [];

            let scrName: string;

            if (scrList.length === 0) {
                // Auto-create a new SCR for this recruitment
                console.log("No SCR found, auto-creating one for interview_id:", refNum);
                const createRes = await fetch(
                    `/api/method/rndopsapp.rndopsapp.doctype.selection_committee_report.selection_committee_report.save_selection_committee_report_data`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json", Accept: "application/json" },
                        credentials: "include",
                        body: JSON.stringify({
                            data: { interview_id: refNum },
                        }),
                    }
                );
                if (!createRes.ok) throw new Error("Failed to auto-create Selection Committee Report");
                const createData = await createRes.json();
                if (createData?.message?.status !== "success" || !createData?.message?.docname) {
                    throw new Error(createData?.message?.message || "Failed to auto-create Selection Committee Report");
                }
                scrName = createData.message.docname;
                console.log("Auto-created SCR:", scrName);
            } else {
                scrName = scrList[0].name;
            }

            // 2. Fetch the existing SCR document to get current candidates
            const docRes = await fetch(
                `/api/method/frappe.client.get`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        doctype: "Selection Committee Report",
                        name: scrName,
                    }),
                }
            );
            if (!docRes.ok) throw new Error("Failed to fetch Selection Committee Report");
            const docData = await docRes.json();
            const scrDoc = docData?.message;

            // 3. Parse existing candidates JSON
            let existingCandidates: any[] = [];
            try {
                if (scrDoc?.candidates) {
                    existingCandidates = typeof scrDoc.candidates === "string"
                        ? JSON.parse(scrDoc.candidates)
                        : scrDoc.candidates;
                }
            } catch {
                existingCandidates = [];
            }
            if (!Array.isArray(existingCandidates)) existingCandidates = [];

            // 4. Check for duplicate (skip if already exists)
            const isDuplicate = existingCandidates.some(
                (c: any) => String(c.application_id) === String(app.application_id)
            );
            if (isDuplicate) {
                // Already exists — just update the UI
                setAppearedCandidateIds((prev) => new Set(prev).add(String(app.application_id)));
                setIsMarkingAppeared(null);
                return;
            }

            // 5. Add the new candidate entry
            const candidateName = `${app.first_name || ""} ${app.last_name || ""}`.trim();
            const newCandidate = {
                sl_no: existingCandidates.length + 1,
                candidate_name: candidateName,
                candidate_id: app.candidate_id || app.id || "",
                email: app.email || "",
                application_id: String(app.application_id),
                application_number: app.application_number || "",
                status: "Appeared",
            };

            const updatedCandidates = [...existingCandidates, newCandidate];

            // 6. Save back to Frappe
            const saveRes = await fetch(
                `/api/method/frappe.client.set_value`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Accept: "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        doctype: "Selection Committee Report",
                        name: scrName,
                        fieldname: "candidates",
                        value: JSON.stringify(updatedCandidates),
                    }),
                }
            );

            if (!saveRes.ok) throw new Error("Failed to save candidate to Selection Committee Report");

            // 7. Update local state
            setAppearedCandidateIds((prev) => new Set(prev).add(String(app.application_id)));
            console.log(`Candidate "${candidateName}" marked as Appeared in SCR "${scrName}"`);
        } catch (err: any) {
            console.error("Error marking candidate as appeared:", err);
            alert(`Failed to mark candidate as appeared: ${err.message}`);
        } finally {
            setIsMarkingAppeared(null);
        }
    };

    useEffect(() => {
        fetchApplications();
        fetchAppearedCandidates();
    }, [fetchApplications, fetchAppearedCandidates]);

    // Filter logic
    const filteredApplications =
        filter === "all"
            ? applications
            : applications.filter(
                  (app) => app.status?.toLowerCase() === filter.toLowerCase()
              );

    const filters = [
        { key: "all", label: "All Candidates", icon: "fas fa-list" },
        { key: "Shortlisted", label: "Shortlisted", icon: "fas fa-check-circle" },
        { key: "Not Shortlisted", label: "Not Shortlisted", icon: "fas fa-times-circle" },
        { key: "Under Review", label: "Under Review", icon: "fas fa-hourglass-half" },
    ];

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <main className="max-w-8xl mx-auto p-4 md:p-8 w-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                            <Users className="w-6 h-6 text-[#D97757]" />
                            Candidate Applications
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                            Interview ID: {refNum}
                        </p>
                    </div>
                </div>

                {/* Filter Buttons */}
                <div className="flex flex-wrap gap-3 mb-6">
                    {filters.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
                                "border transition-all duration-150 shadow-sm",
                                filter === f.key
                                    ? "bg-[#D97757] text-white border-[#D97757] shadow-md"
                                    : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-[#D97757]/30 hover:text-[#D97757]",
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Table */}
                <FrappeCard>
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[#D97757] mx-auto" />
                            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                                Loading candidate applications...
                            </p>
                        </div>
                    ) : error ? (
                        <div className="p-12 text-center">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    ) : filteredApplications.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                            Sl. No.
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                            Candidate Name
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                            Email
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                            Application No.
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {filteredApplications.map((app, index) => {
                                        const isAppeared = appearedCandidateIds.has(String(app.application_id));
                                        const isCurrentlyMarking = isMarkingAppeared === String(app.application_id);
                                        const isShortlisted = app.status?.toLowerCase() === "shortlisted";

                                        return (
                                            <tr
                                                key={app.application_id || index}
                                                className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                            >
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                    {index + 1}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                                    {`${app.first_name || ""} ${app.last_name || ""}`.trim() || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                    {app.email || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                                    {app.application_number || "-"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        {/* If candidate is already appeared, show Appeared badge instead of original status */}
                                                        {isAppeared ? (
                                                            <StatusBadge status="Appeared" />
                                                        ) : (
                                                            <StatusBadge status={app.status} />
                                                        )}

                                                        {/* Show "Mark Appeared" button only for shortlisted candidates who aren't already appeared */}
                                                        {isShortlisted && !isAppeared && (
                                                            <button
                                                                onClick={() => handleAppearedClick(app)}
                                                                disabled={isCurrentlyMarking}
                                                                className={cn(
                                                                    "inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-all",
                                                                    isCurrentlyMarking
                                                                        ? "bg-zinc-400 text-white cursor-not-allowed"
                                                                        : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                                                                )}
                                                            >
                                                                {isCurrentlyMarking ? (
                                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                ) : (
                                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                                )}
                                                                {isCurrentlyMarking ? "Saving..." : "Mark Appeared"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-3">
                                                        <button
                                                            onClick={() =>
                                                                navigate(
                                                                    `/candidate-details/${app.candidate_id}?refNum=${refNum}&applicationId=${app.application_id}`
                                                                )
                                                            }
                                                            className="inline-flex items-center gap-1.5 text-sm text-[#D97757] hover:underline whitespace-nowrap"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                            View
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <Users className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                                No candidates found
                            </h4>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {filter !== "all"
                                    ? `No candidates with status "${filter}" for this recruitment.`
                                    : "No candidate applications found for this recruitment."}
                            </p>
                        </div>
                    )}
                </FrappeCard>
            </main>
        </div>
    );
};

export default CandidateApplications;
