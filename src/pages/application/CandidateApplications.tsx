// import React, { useState, useEffect, useCallback } from "react";
// import { useSearchParams, useNavigate } from "react-router-dom";
// import { useFrappePostCall } from "frappe-react-sdk";
// import { cn } from "@/lib/utils";
// import { ArrowLeft, Loader2, Users, Eye } from "lucide-react";
// import { Card, CardContent } from "@/components/ui/card";
// import { candidateAPI } from "@/services/apiService";

// // --- Types ---
// interface CandidateApplication {
//     application_id: number;
//     application_number: string;
//     status: string;
//     refNumParent: string;
//     recruitment_post_id: number;
//     candidate_id: number;
//     first_name: string;
//     last_name: string;
//     email: string;
// }

// interface ApiResponse {
//     data: CandidateApplication[];
//     meta: {
//         total: number;
//         page: number;
//         limit: number;
//         totalPages: number;
//     };
// }

// // --- Styled Components (matching project patterns) ---
// const FrappeCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
//     <Card
//         className={cn(
//             "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] shadow-sm rounded-xl overflow-hidden",
//             className,
//         )}
//     >
//         <CardContent className="p-0">{children}</CardContent>
//     </Card>
// );

// // --- Status badge ---
// const StatusBadge = ({ status }: { status: string }) => {
//     const normalized = status?.toLowerCase() || "";
//     return (
//         <span
//             className={cn(
//                 "inline-flex px-2.5 py-1 text-xs font-semibold rounded-full border",
//                 (normalized === "shortlisted" || normalized === "appeared") &&
//                 "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50",
//                 normalized === "under review" &&
//                 "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800/50",
//                 (normalized === "rejected" || normalized === "not shortlisted") &&
//                 "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800/50",
//                 normalized === "submitted" &&
//                 "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
//                 !["shortlisted", "under review", "rejected", "not shortlisted", "submitted", "appeared"].includes(normalized) &&
//                 "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800/50",
//             )}
//         >
//             {status || "Unknown"}
//         </span>
//     );
// };

// // --- Main Component ---
// const CandidateApplications: React.FC = () => {
//     const [searchParams] = useSearchParams();
//     const navigate = useNavigate();
//     const refNum = searchParams.get("refNum") || "";

//     const [applications, setApplications] = useState<CandidateApplication[]>([]);
//     const [postDetailsCache, setPostDetailsCache] = useState<Record<string, string>>({});
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [filter, setFilter] = useState<string>("all");

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const { call: fetchFrappeDoc } = useFrappePostCall<{ message: any }>("frappe.client.get");

//     const fetchApplications = useCallback(async () => {
//         if (!refNum) {
//             setError("No reference number provided.");
//             setIsLoading(false);
//             return;
//         }
//         setIsLoading(true);
//         setError(null);
//         try {
//             const [appsResponse, recRes] = await Promise.all([
//                 fetch(candidateAPI.getApplications(refNum), { headers: { Accept: "application/json" } }),
//                 fetchFrappeDoc({ doctype: "Recruitment Adhoc Contractual", name: refNum }).catch(() => null),
//             ]);

//             if (!appsResponse.ok) throw new Error(`HTTP error! status: ${appsResponse.status}`);
//             const result: ApiResponse = await appsResponse.json();
//             setApplications(result.data || []);

//             // Build post cache from the child table rows (row.name === recruitment_post_id)
//             const postRows: any[] = recRes?.message?.upfa_post_details ?? [];
//             const cache: Record<string, string> = {};
//             for (const row of postRows) {
//                 if (row.name) cache[String(row.name)] = row.upfa_designation || "";
//             }
//             setPostDetailsCache(cache);
//         } catch (err: any) {
//             console.error("Error fetching candidate applications:", err);
//             setError(err.message || "Failed to fetch candidate applications.");
//             setApplications([]);
//         } finally {
//             setIsLoading(false);
//         }
//     }, [refNum, fetchFrappeDoc]);

//     useEffect(() => {
//         fetchApplications();
//     }, [fetchApplications]);

//     // Filter + sort by name so same-name candidates appear together
//     const filteredApplications = (
//         filter === "all"
//             ? applications
//             : applications.filter((app) => app.status?.toLowerCase() === filter.toLowerCase())
//     ).slice().sort((a, b) => {
//         const nameA = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
//         const nameB = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
//         return nameA.localeCompare(nameB);
//     });

//     const filters = [
//         { key: "all", label: "All Candidates", icon: "fas fa-list" },
//         { key: "Shortlisted", label: "Shortlisted", icon: "fas fa-check-circle" },
//         { key: "Not Shortlisted", label: "Not Shortlisted", icon: "fas fa-times-circle" },
//         { key: "Under Review", label: "Under Review", icon: "fas fa-hourglass-half" },
//     ];

//     return (
//         <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
//             <main className="max-w-8xl mx-auto p-4 md:p-8 w-full overflow-hidden">
//                 {/* Header */}
//                 <div className="flex items-center gap-4 mb-8">
//                     <button
//                         onClick={() => navigate(-1)}
//                         className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
//                     >
//                         <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
//                     </button>
//                     <div>
//                         <h1 className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
//                             <Users className="w-6 h-6 text-[#D97757]" />
//                             Candidate Applications
//                         </h1>
//                         <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
//                             Interview ID: {refNum}
//                         </p>
//                     </div>
//                 </div>

//                 {/* Filter Buttons */}
//                 <div className="flex flex-wrap gap-3 mb-6">
//                     {filters.map((f) => (
//                         <button
//                             key={f.key}
//                             onClick={() => setFilter(f.key)}
//                             className={cn(
//                                 "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
//                                 "border transition-all duration-150 shadow-sm",
//                                 filter === f.key
//                                     ? "bg-[#D97757] text-white border-[#D97757] shadow-md"
//                                     : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-[#D97757]/30 hover:text-[#D97757]",
//                             )}
//                         >
//                             {f.label}
//                         </button>
//                     ))}
//                 </div>

//                 {/* Table */}
//                 <FrappeCard>
//                     {isLoading ? (
//                         <div className="p-12 text-center">
//                             <Loader2 className="w-8 h-8 animate-spin text-[#D97757] mx-auto" />
//                             <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
//                                 Loading candidate applications...
//                             </p>
//                         </div>
//                     ) : error ? (
//                         <div className="p-12 text-center">
//                             <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
//                         </div>
//                     ) : filteredApplications.length > 0 ? (
//                         <div className="overflow-x-auto">
//                             <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
//                                 <thead className="bg-zinc-50 dark:bg-zinc-800/50">
//                                     <tr>
//                                         <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
//                                             Sl. No.
//                                         </th>
//                                         <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
//                                             Candidate Name
//                                         </th>
//                                         <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
//                                             Email
//                                         </th>
//                                         <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
//                                             Applied Post
//                                         </th>
//                                         <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
//                                             Status
//                                         </th>
//                                         <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
//                                             Actions
//                                         </th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
//                                     {filteredApplications.map((app, index) => (
//                                         <tr
//                                             key={app.application_id || index}
//                                             className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
//                                         >
//                                             <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
//                                                 {index + 1}
//                                             </td>
//                                             <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
//                                                 {`${app.first_name || ""} ${app.last_name || ""}`.trim() || "-"}
//                                             </td>
//                                             <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
//                                                 {app.email || "-"}
//                                             </td>
//                                             <td className="px-4 py-3 text-sm">
//                                                 {postDetailsCache[String(app.recruitment_post_id)] ? (
//                                                     <span className="inline-block text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded font-medium">
//                                                         {postDetailsCache[String(app.recruitment_post_id)]}
//                                                     </span>
//                                                 ) : (
//                                                     <span className="text-zinc-400 dark:text-zinc-600">—</span>
//                                                 )}
//                                             </td>
//                                             <td className="px-4 py-3">
//                                                 <div className="flex items-center gap-3">
//                                                     <StatusBadge status={app.status} />
//                                                 </div>
//                                             </td>
//                                             <td className="px-4 py-3">
//                                                 <div className="flex gap-3">
//                                                     <button
//                                                         onClick={() =>
//                                                             navigate(
//                                                                 `/candidate-details/${app.candidate_id}?refNum=${refNum}&applicationId=${app.application_id}`
//                                                             )
//                                                         }
//                                                         className="inline-flex items-center gap-1.5 text-sm text-[#D97757] hover:underline whitespace-nowrap"
//                                                     >
//                                                         <Eye className="w-3.5 h-3.5" />
//                                                         View
//                                                     </button>
//                                                 </div>
//                                             </td>
//                                         </tr>
//                                     ))}
//                                 </tbody>
//                             </table>
//                         </div>
//                     ) : (
//                         <div className="p-12 text-center">
//                             <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
//                                 <Users className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
//                             </div>
//                             <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
//                                 No candidates found
//                             </h4>
//                             <p className="text-sm text-zinc-500 dark:text-zinc-400">
//                                 {filter !== "all"
//                                     ? `No candidates with status "${filter}" for this recruitment.`
//                                     : "No candidate applications found for this recruitment."}
//                             </p>
//                         </div>
//                     )}
//                 </FrappeCard>
//             </main>
//         </div>
//     );
// };

// export default CandidateApplications;





// ======================================================excel download

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useFrappePostCall } from "frappe-react-sdk";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Users, Eye, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { candidateAPI } from "@/services/apiService";

// --- Types ---
interface CandidateApplication {
    application_id: number;
    application_number: string;
    status: string;
    refNumParent: string;
    recruitment_post_id: number;
    candidate_id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number?: string;
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
    const [postDetailsCache, setPostDetailsCache] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("all");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { call: fetchFrappeDoc } = useFrappePostCall<{ message: any }>("frappe.client.get");

    const fetchApplications = useCallback(async () => {
        if (!refNum) {
            setError("No reference number provided.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const [appsResponse, recRes] = await Promise.all([
                fetch(candidateAPI.getApplications(refNum), { headers: { Accept: "application/json" } }),
                fetchFrappeDoc({ doctype: "Recruitment Adhoc Contractual", name: refNum }).catch(() => null),
            ]);

            if (!appsResponse.ok) throw new Error(`HTTP error! status: ${appsResponse.status}`);
            const result: ApiResponse = await appsResponse.json();
            let applicationsData = result.data || [];

            // Fetch phone numbers for each candidate from their profile
            applicationsData = await Promise.all(
                applicationsData.map(async (app) => {
                    try {
                        const profileRes = await fetch(candidateAPI.getProfile(app.candidate_id));
                        if (profileRes.ok) {
                            const profileData = await profileRes.json();
                            app.phone_number = profileData?.candidate?.phone_number || "";
                        }
                    } catch (e) {
                        console.warn("Failed to fetch phone number for", app.candidate_id);
                    }
                    return app;
                })
            );

            setApplications(applicationsData);

            // Build post cache from the child table rows (row.name === recruitment_post_id)
            const postRows: any[] = recRes?.message?.upfa_post_details ?? [];
            const cache: Record<string, string> = {};
            for (const row of postRows) {
                if (row.name) cache[String(row.name)] = row.upfa_designation || "";
            }
            setPostDetailsCache(cache);
        } catch (err: any) {
            console.error("Error fetching candidate applications:", err);
            setError(err.message || "Failed to fetch candidate applications.");
            setApplications([]);
        } finally {
            setIsLoading(false);
        }
    }, [refNum, fetchFrappeDoc]);

    useEffect(() => {
        fetchApplications();
    }, [fetchApplications]);

    // Filter + sort by name so same-name candidates appear together
    const filteredApplications = (
        filter === "all"
            ? applications
            : applications.filter((app) => app.status?.toLowerCase() === filter.toLowerCase())
    ).slice().sort((a, b) => {
        const nameA = `${a.first_name} ${a.last_name}`.trim().toLowerCase();
        const nameB = `${b.first_name} ${b.last_name}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
    });

    const handleExportCSV = () => {
        if (filteredApplications.length === 0) return;

        const headers = ["first_name", "last_name", "email", "phone_number", "status", "post Applied"];
        const rows = filteredApplications.map((app) => [
            app.first_name || "",
            app.last_name || "",
            app.email || "",
            app.phone_number || "",
            app.status || "",
            postDetailsCache[String(app.recruitment_post_id)] || "",
        ]);

        const csvContent = [
            headers.join(","),
            ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `candidate_applications_${refNum}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-4">
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
                    <button
                        onClick={handleExportCSV}
                        disabled={filteredApplications.length === 0}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm active:scale-95"
                    >
                        <Download className="w-4 h-4" />
                        Export to CSV
                    </button>
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
                                            Applied Post
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
                                    {filteredApplications.map((app, index) => (
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
                                            <td className="px-4 py-3 text-sm">
                                                {postDetailsCache[String(app.recruitment_post_id)] ? (
                                                    <span className="inline-block text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded font-medium">
                                                        {postDetailsCache[String(app.recruitment_post_id)]}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400 dark:text-zinc-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    <StatusBadge status={app.status} />
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
                                    ))}
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
