// import React, { useState, useEffect, useCallback } from "react";
// import { useSearchParams, useNavigate } from "react-router-dom";
// import { useFrappePostCall } from "frappe-react-sdk";
// import { cn } from "@/lib/utils";
// import { ArrowLeft, Loader2, Users, Eye, Download, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
//     phone_number?: string;
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
//     const [selectedPost, setSelectedPost] = useState<string>("all");
//     const [searchTerm, setSearchTerm] = useState<string>("");
//     const [currentPage, setCurrentPage] = useState<number>(1);
//     const [isExporting, setIsExporting] = useState<boolean>(false);
//     const itemsPerPage = 10;

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
//             const applicationsData = result.data || [];

//             setApplications(applicationsData);

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

//     // Reset to page 1 when filter, post, or search changes
//     useEffect(() => {
//         setCurrentPage(1);
//     }, [filter, selectedPost, searchTerm]);

//     // Derive unique post options from the loaded cache + applications
//     const postOptions = React.useMemo(() => {
//         const seen = new Set<string>();
//         const opts: { id: string; label: string }[] = [];
//         for (const app of applications) {
//             const id = String(app.recruitment_post_id);
//             const label = postDetailsCache[id];
//             if (label && !seen.has(id)) {
//                 seen.add(id);
//                 opts.push({ id, label });
//             }
//         }
//         return opts.sort((a, b) => a.label.localeCompare(b.label));
//     }, [applications, postDetailsCache]);

//     // Filter + sort by name so same-name candidates appear together
//     const filteredApplications = (
//         filter === "all"
//             ? applications
//             : applications.filter((app) => app.status?.toLowerCase() === filter.toLowerCase())
//     ).filter((app) => {
//         // Post filter
//         if (selectedPost !== "all" && String(app.recruitment_post_id) !== selectedPost) return false;
//         // Search filter
//         if (!searchTerm) return true;
//         const searchLower = searchTerm.toLowerCase();
//         const fullName = `${app.first_name || ""} ${app.last_name || ""}`.trim().toLowerCase();
//         const email = (app.email || "").toLowerCase();
//         return fullName.includes(searchLower) || email.includes(searchLower);
//     }).slice().sort((a, b) => {
//         const nameA = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
//         const nameB = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
//         return nameA.localeCompare(nameB);
//     });

//     const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
//     const paginatedApplications = filteredApplications.slice(
//         (currentPage - 1) * itemsPerPage,
//         currentPage * itemsPerPage
//     );

//     const handleExportCSV = async () => {
//         if (filteredApplications.length === 0) return;

//         setIsExporting(true);
//         try {
//             // Fetch phone numbers for export
//             const applicationsWithPhone = await Promise.all(
//                 filteredApplications.map(async (app) => {
//                     try {
//                         const profileRes = await fetch(candidateAPI.getProfile(app.candidate_id));
//                         if (profileRes.ok) {
//                             const profileData = await profileRes.json();
//                             return { ...app, phone_number: profileData?.candidate?.phone_number || "" };
//                         }
//                     } catch (e) {
//                         console.warn("Failed to fetch phone number for", app.candidate_id);
//                     }
//                     return { ...app, phone_number: "" };
//                 })
//             );

//             const headers = ["first_name", "last_name", "email", "phone_number", "status", "post Applied"];
//             const rows = applicationsWithPhone.map((app) => [
//                 app.first_name || "",
//                 app.last_name || "",
//                 app.email || "",
//                 app.phone_number || "",
//                 app.status || "",
//                 postDetailsCache[String(app.recruitment_post_id)] || "",
//             ]);

//             const csvContent = [
//                 headers.join(","),
//                 ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
//             ].join("\n");

//             const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
//             const url = URL.createObjectURL(blob);
//             const link = document.createElement("a");
//             link.setAttribute("href", url);
//             link.setAttribute("download", `candidate_applications_${refNum}.csv`);
//             link.style.visibility = "hidden";
//             document.body.appendChild(link);
//             link.click();
//             document.body.removeChild(link);
//         } finally {
//             setIsExporting(false);
//         }
//     };

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
//                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
//                     <div className="flex items-center gap-4">
//                         <button
//                             onClick={() => navigate(-1)}
//                             className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
//                         >
//                             <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
//                         </button>
//                         <div>
//                             <h1 className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
//                                 <Users className="w-6 h-6 text-[#D97757]" />
//                                 Candidate Applications
//                             </h1>
//                             <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
//                                 Interview ID: {refNum}
//                             </p>
//                         </div>
//                     </div>
//                     <button
//                         onClick={handleExportCSV}
//                         disabled={filteredApplications.length === 0 || isExporting}
//                         className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm active:scale-95"
//                     >
//                         {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
//                         {isExporting ? "Exporting..." : "Export to CSV"}
//                     </button>
//                 </div>

//                 {/* Filters and Search */}
//                 <div className="flex flex-col gap-4 mb-6">
//                     {/* Top row: status filter buttons + post dropdown */}
//                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
//                         {/* Status Filter Buttons */}
//                         <div className="flex flex-wrap gap-3">
//                             {filters.map((f) => (
//                                 <button
//                                     key={f.key}
//                                     onClick={() => setFilter(f.key)}
//                                     className={cn(
//                                         "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
//                                         "border transition-all duration-150 shadow-sm",
//                                         filter === f.key
//                                             ? "bg-[#D97757] text-white border-[#D97757] shadow-md"
//                                             : "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:border-[#D97757]/30 hover:text-[#D97757]",
//                                     )}
//                                 >
//                                     {f.label}
//                                 </button>
//                             ))}
//                         </div>

//                         {/* Post Dropdown Filter */}
//                         {postOptions.length > 0 && (
//                             <div className="flex items-center gap-2">
//                                 <label
//                                     htmlFor="post-filter"
//                                     className="text-sm font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap"
//                                 >
//                                     Filter by Post:
//                                 </label>
//                                 <select
//                                     id="post-filter"
//                                     value={selectedPost}
//                                     onChange={(e) => setSelectedPost(e.target.value)}
//                                     className="block w-full sm:w-64 py-2.5 pl-3 pr-8 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/50 focus:border-[#D97757] transition-all shadow-sm cursor-pointer"
//                                 >
//                                     <option value="all">All Posts</option>
//                                     {postOptions.map((opt) => (
//                                         <option key={opt.id} value={opt.id}>
//                                             {opt.label}
//                                         </option>
//                                     ))}
//                                 </select>
//                             </div>
//                         )}
//                     </div>

//                     {/* Bottom row: Search Box */}
//                     <div className="relative w-full lg:w-80">
//                         <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                             <Search className="h-4 w-4 text-zinc-400" />
//                         </div>
//                         <input
//                             type="text"
//                             placeholder="Search by name or email..."
//                             value={searchTerm}
//                             onChange={(e) => setSearchTerm(e.target.value)}
//                             className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#D97757]/50 focus:border-[#D97757] sm:text-sm transition-all shadow-sm"
//                         />
//                     </div>
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
//                                     {paginatedApplications.map((app, index) => (
//                                         <tr
//                                             key={app.application_id || index}
//                                             className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
//                                         >
//                                             <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
//                                                 {(currentPage - 1) * itemsPerPage + index + 1}
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

//                             {/* Pagination Controls */}
//                             {totalPages > 1 && (
//                                 <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 sm:px-6">
//                                     <div className="flex flex-1 justify-between sm:hidden">
//                                         <button
//                                             onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
//                                             disabled={currentPage === 1}
//                                             className="relative inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                                         >
//                                             Previous
//                                         </button>
//                                         <button
//                                             onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
//                                             disabled={currentPage === totalPages}
//                                             className="relative ml-3 inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                                         >
//                                             Next
//                                         </button>
//                                     </div>
//                                     <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
//                                         <div>
//                                             <p className="text-sm text-zinc-700 dark:text-zinc-300">
//                                                 Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredApplications.length)}</span> of <span className="font-medium">{filteredApplications.length}</span> results
//                                             </p>
//                                         </div>
//                                         <div>
//                                             <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
//                                                 <button
//                                                     onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
//                                                     disabled={currentPage === 1}
//                                                     className="relative inline-flex items-center rounded-l-md px-2 py-2 text-zinc-400 dark:text-zinc-500 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                                                 >
//                                                     <span className="sr-only">Previous</span>
//                                                     <ChevronLeft className="h-5 w-5" aria-hidden="true" />
//                                                 </button>
//                                                 <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 focus:outline-offset-0 bg-white dark:bg-zinc-900">
//                                                     Page {currentPage} of {totalPages}
//                                                 </span>
//                                                 <button
//                                                     onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
//                                                     disabled={currentPage === totalPages}
//                                                     className="relative inline-flex items-center rounded-r-md px-2 py-2 text-zinc-400 dark:text-zinc-500 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
//                                                 >
//                                                     <span className="sr-only">Next</span>
//                                                     <ChevronRight className="h-5 w-5" aria-hidden="true" />
//                                                 </button>
//                                             </nav>
//                                         </div>
//                                     </div>
//                                 </div>
//                             )}
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
//                                 {selectedPost !== "all"
//                                     ? `No candidates found for the selected post${filter !== "all" ? ` with status "${filter}"` : ""}.`
//                                     : filter !== "all"
//                                         ? `No candidates with status "${filter}" for this recruitment.`
//                                         : "No candidate applications found for this recruitment."}
//                             </p>
//                         </div>
//                     )}
//                 </FrappeCard>
//             </main>
//         </div>
//     );
// };

// export default CandidateApplications;




// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-



import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useFrappePostCall } from "frappe-react-sdk";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2, Users, Eye, Download, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Briefcase, FileArchive } from "lucide-react";
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

interface PostGroup {
    postId: string;
    postLabel: string;
    candidates: CandidateApplication[];
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

// --- Per-post pagination state helper ---
const PostGroupTable: React.FC<{
    group: PostGroup;
    refNum: string;
    navigate: ReturnType<typeof useNavigate>;
    defaultExpanded: boolean;
}> = ({ group, refNum, navigate, defaultExpanded }) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [page, setPage] = useState(1);
    const perPage = 10;

    const totalPages = Math.ceil(group.candidates.length / perPage);
    const paginated = group.candidates.slice((page - 1) * perPage, page * perPage);

    // Reset page when candidates change (e.g. filter changes)
    useEffect(() => {
        setPage(1);
    }, [group.candidates.length]);

    return (
        <FrappeCard className="mb-6">
            {/* Post Group Header */}
            <button
                onClick={() => setIsExpanded((prev) => !prev)}
                className="w-full flex items-center justify-between px-5 py-4 bg-gradient-to-r from-zinc-50 to-white dark:from-zinc-800/80 dark:to-zinc-800/40 hover:from-zinc-100 hover:to-zinc-50 dark:hover:from-zinc-800 dark:hover:to-zinc-700/40 transition-all duration-200 cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#D97757]/10 dark:bg-[#D97757]/20 flex items-center justify-center">
                        <Briefcase className="w-4.5 h-4.5 text-[#D97757]" />
                    </div>
                    <div className="text-left">
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                            {group.postLabel}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {group.candidates.length} candidate{group.candidates.length !== 1 ? "s" : ""} applied
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center min-w-[1.75rem] h-7 px-2 rounded-full bg-[#D97757] text-white text-xs font-bold">
                        {group.candidates.length}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
                    )}
                </div>
            </button>

            {/* Candidate Table (collapsible) */}
            {isExpanded && (
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
                                    Status
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {paginated.map((app, index) => (
                                <tr
                                    key={app.application_id || index}
                                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                                >
                                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                        {(page - 1) * perPage + index + 1}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                        {`${app.first_name || ""} ${app.last_name || ""}`.trim() || "-"}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                        {app.email || "-"}
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusBadge status={app.status} />
                                    </td>
                                    <td className="px-4 py-3">
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
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Per-group Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 sm:px-6">
                            <div className="flex flex-1 justify-between sm:hidden">
                                <button
                                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={page === 1}
                                    className="relative inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={page === totalPages}
                                    className="relative ml-3 inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                                <p className="text-sm text-zinc-700 dark:text-zinc-300">
                                    Showing <span className="font-medium">{(page - 1) * perPage + 1}</span> to{" "}
                                    <span className="font-medium">{Math.min(page * perPage, group.candidates.length)}</span> of{" "}
                                    <span className="font-medium">{group.candidates.length}</span> candidates
                                </p>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-zinc-400 dark:text-zinc-500 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <span className="sr-only">Previous</span>
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 focus:outline-offset-0 bg-white dark:bg-zinc-900">
                                        Page {page} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                                        disabled={page === totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-zinc-400 dark:text-zinc-500 ring-1 ring-inset ring-zinc-300 dark:ring-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <span className="sr-only">Next</span>
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </FrappeCard>
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
    const [selectedPost, setSelectedPost] = useState<string>("all");
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [isDownloadingResumes, setIsDownloadingResumes] = useState<boolean>(false);
    const [resumeDownloadProgress, setResumeDownloadProgress] = useState<{ done: number; total: number } | null>(null);

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
            const applicationsData = result.data || [];

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

    // Derive unique post options from the loaded cache + applications
    const postOptions = React.useMemo(() => {
        const seen = new Set<string>();
        const opts: { id: string; label: string }[] = [];
        for (const app of applications) {
            const id = String(app.recruitment_post_id);
            const label = postDetailsCache[id];
            if (label && !seen.has(id)) {
                seen.add(id);
                opts.push({ id, label });
            }
        }
        return opts.sort((a, b) => a.label.localeCompare(b.label));
    }, [applications, postDetailsCache]);

    // Apply status + search filters
    const filteredApplications = React.useMemo(() => {
        return (
            filter === "all"
                ? applications
                : applications.filter((app) => app.status?.toLowerCase() === filter.toLowerCase())
        ).filter((app) => {
            // Post filter
            if (selectedPost !== "all" && String(app.recruitment_post_id) !== selectedPost) return false;
            // Search filter
            if (!searchTerm) return true;
            const searchLower = searchTerm.toLowerCase();
            const fullName = `${app.first_name || ""} ${app.last_name || ""}`.trim().toLowerCase();
            const email = (app.email || "").toLowerCase();
            return fullName.includes(searchLower) || email.includes(searchLower);
        }).slice().sort((a, b) => {
            const nameA = `${a.first_name || ""} ${a.last_name || ""}`.trim().toLowerCase();
            const nameB = `${b.first_name || ""} ${b.last_name || ""}`.trim().toLowerCase();
            return nameA.localeCompare(nameB);
        });
    }, [applications, filter, selectedPost, searchTerm]);

    // Group filtered applications by post
    const postGroups: PostGroup[] = React.useMemo(() => {
        const groupMap = new Map<string, CandidateApplication[]>();

        for (const app of filteredApplications) {
            const postId = String(app.recruitment_post_id);
            if (!groupMap.has(postId)) {
                groupMap.set(postId, []);
            }
            groupMap.get(postId)!.push(app);
        }

        const groups: PostGroup[] = [];
        for (const [postId, candidates] of groupMap) {
            groups.push({
                postId,
                postLabel: postDetailsCache[postId] || `Post #${postId}`,
                candidates,
            });
        }

        // Sort groups by post label alphabetically
        return groups.sort((a, b) => a.postLabel.localeCompare(b.postLabel));
    }, [filteredApplications, postDetailsCache]);

    const handleExportCSV = async () => {
        if (filteredApplications.length === 0) return;

        setIsExporting(true);
        try {
            // Fetch phone numbers for export
            const applicationsWithPhone = await Promise.all(
                filteredApplications.map(async (app) => {
                    try {
                        const profileRes = await fetch(candidateAPI.getProfile(app.candidate_id));
                        if (profileRes.ok) {
                            const profileData = await profileRes.json();
                            return { ...app, phone_number: profileData?.candidate?.phone_number || "" };
                        }
                    } catch (e) {
                        console.warn("Failed to fetch phone number for", app.candidate_id);
                    }
                    return { ...app, phone_number: "" };
                })
            );

            const headers = ["Post Applied", "first_name", "last_name", "email", "phone_number", "status"];
            const rows = applicationsWithPhone.map((app) => [
                postDetailsCache[String(app.recruitment_post_id)] || "",
                app.first_name || "",
                app.last_name || "",
                app.email || "",
                app.phone_number || "",
                app.status || "",
            ]);

            // Sort CSV rows by post name so exported data is grouped by post too
            rows.sort((a, b) => a[0].localeCompare(b[0]));

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
        } finally {
            setIsExporting(false);
        }
    };

    const MIME_EXTENSION_MAP: Record<string, string> = {
        "application/pdf": "pdf",
        "application/msword": "doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "image/jpeg": "jpg",
        "image/png": "png",
    };

    const guessExtension = (documentName: string, mimeType: string): string => {
        const nameMatch = /\.([a-zA-Z0-9]{2,5})$/.exec(documentName || "");
        if (nameMatch) return nameMatch[1].toLowerCase();
        return MIME_EXTENSION_MAP[(mimeType || "").toLowerCase()] || "pdf";
    };

    const sanitizeFileName = (name: string): string =>
        (name || "candidate").trim().replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "candidate";

    const handleDownloadAllResumes = async () => {
        const candidates = filteredApplications;
        if (candidates.length === 0) return;

        setIsDownloadingResumes(true);
        setResumeDownloadProgress({ done: 0, total: candidates.length });
        try {
            const zip = new JSZip();
            const usedNames = new Set<string>();
            let missingCount = 0;

            for (const app of candidates) {
                try {
                    const profileRes = await fetch(candidateAPI.getProfile(app.candidate_id));
                    if (!profileRes.ok) throw new Error(`HTTP ${profileRes.status}`);
                    const profileData = await profileRes.json();
                    const documents: Array<{ id: number; document_name?: string; mime_type?: string }> =
                        profileData?.documents || [];
                    const resumeDoc = documents.find((d) =>
                        (d.document_name || "").toLowerCase().includes("resume") ||
                        (d.document_name || "").toLowerCase().includes("cv")
                    );

                    if (!resumeDoc) {
                        missingCount += 1;
                        continue;
                    }

                    const fileRes = await fetch(candidateAPI.viewDocument(resumeDoc.id));
                    if (!fileRes.ok) throw new Error(`HTTP ${fileRes.status}`);
                    const blob = await fileRes.blob();

                    const ext = guessExtension(resumeDoc.document_name || "", resumeDoc.mime_type || blob.type);
                    const baseName = sanitizeFileName(`${app.first_name || ""}_${app.last_name || ""}`);
                    let fileName = `${baseName}.${ext}`;
                    let suffix = 1;
                    while (usedNames.has(fileName)) {
                        fileName = `${baseName}_${suffix}.${ext}`;
                        suffix += 1;
                    }
                    usedNames.add(fileName);

                    zip.file(fileName, blob);
                } catch (err) {
                    console.error(`Failed to fetch resume for candidate ${app.candidate_id}:`, err);
                    missingCount += 1;
                } finally {
                    setResumeDownloadProgress((prev) => (prev ? { ...prev, done: prev.done + 1 } : prev));
                }
            }

            if (usedNames.size === 0) {
                setError("No resumes found for the current candidate list.");
                return;
            }

            const zipBlob = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(zipBlob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `resumes_${refNum}.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            if (missingCount > 0) {
                console.warn(`${missingCount} candidate(s) had no resume/CV document and were skipped.`);
            }
        } catch (err: any) {
            console.error("Error downloading resumes:", err);
            setError(err.message || "Failed to download resumes.");
        } finally {
            setIsDownloadingResumes(false);
            setResumeDownloadProgress(null);
        }
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
                                {filteredApplications.length > 0 && (
                                    <span className="ml-3 text-zinc-400 dark:text-zinc-500">
                                        • {filteredApplications.length} total candidate{filteredApplications.length !== 1 ? "s" : ""} across {postGroups.length} post{postGroups.length !== 1 ? "s" : ""}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownloadAllResumes}
                            disabled={filteredApplications.length === 0 || isDownloadingResumes}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#D97757] hover:bg-[#c1633f] disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm active:scale-95"
                        >
                            {isDownloadingResumes ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileArchive className="w-4 h-4" />}
                            {isDownloadingResumes
                                ? `Downloading... (${resumeDownloadProgress?.done ?? 0}/${resumeDownloadProgress?.total ?? filteredApplications.length})`
                                : "Download All Resumes (ZIP)"}
                        </button>
                        <button
                            onClick={handleExportCSV}
                            disabled={filteredApplications.length === 0 || isExporting}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-sm font-semibold transition-all shadow-sm active:scale-95"
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            {isExporting ? "Exporting..." : "Export to CSV"}
                        </button>
                    </div>
                </div>

                {/* Filters and Search */}
                <div className="flex flex-col gap-4 mb-6">
                    {/* Top row: status filter buttons + post dropdown */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        {/* Status Filter Buttons */}
                        <div className="flex flex-wrap gap-3">
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

                        {/* Post Dropdown Filter */}
                        {postOptions.length > 0 && (
                            <div className="flex items-center gap-2">
                                <label
                                    htmlFor="post-filter"
                                    className="text-sm font-medium text-zinc-600 dark:text-zinc-400 whitespace-nowrap"
                                >
                                    Filter by Post:
                                </label>
                                <select
                                    id="post-filter"
                                    value={selectedPost}
                                    onChange={(e) => setSelectedPost(e.target.value)}
                                    className="block w-full sm:w-64 py-2.5 pl-3 pr-8 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/50 focus:border-[#D97757] transition-all shadow-sm cursor-pointer"
                                >
                                    <option value="all">All Posts</option>
                                    {postOptions.map((opt) => (
                                        <option key={opt.id} value={opt.id}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Bottom row: Search Box */}
                    <div className="relative w-full lg:w-80">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-zinc-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#D97757]/50 focus:border-[#D97757] sm:text-sm transition-all shadow-sm"
                        />
                    </div>
                </div>

                {/* Post-grouped Candidate Lists */}
                {isLoading ? (
                    <FrappeCard>
                        <div className="p-12 text-center">
                            <Loader2 className="w-8 h-8 animate-spin text-[#D97757] mx-auto" />
                            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                                Loading candidate applications...
                            </p>
                        </div>
                    </FrappeCard>
                ) : error ? (
                    <FrappeCard>
                        <div className="p-12 text-center">
                            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                        </div>
                    </FrappeCard>
                ) : postGroups.length > 0 ? (
                    <div className="space-y-0">
                        {postGroups.map((group) => (
                            <PostGroupTable
                                key={group.postId}
                                group={group}
                                refNum={refNum}
                                navigate={navigate}
                                defaultExpanded={postGroups.length === 1 || selectedPost !== "all"}
                            />
                        ))}
                    </div>
                ) : (
                    <FrappeCard>
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <Users className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                                No candidates found
                            </h4>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {selectedPost !== "all"
                                    ? `No candidates found for the selected post${filter !== "all" ? ` with status "${filter}"` : ""}.`
                                    : filter !== "all"
                                        ? `No candidates with status "${filter}" for this recruitment.`
                                        : "No candidate applications found for this recruitment."}
                            </p>
                        </div>
                    </FrappeCard>
                )}
            </main>
        </div>
    );
};

export default CandidateApplications;