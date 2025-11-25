// import React, { useEffect, useState } from "react";
// import { useFrappeGetCall } from "frappe-react-sdk";
// import { DollarSignIcon } from "lucide-react";
// import { cn } from "@/lib/utils";

// type FundDoc = any;
// const DEFAULT_PRJREG_TITLE = "2025111101DST000103";

// const FundBreakupRows = ({ fund }: { fund: FundDoc }) => {
//     const breakup = fund?.received_amt_breakup || [];

//     if (Array.isArray(breakup) && breakup.length > 0) {
//         return (
//             <>
//                 {breakup.map((item: any, bkIndex: number) => (
//                     <tr
//                         key={`${fund.name}-${item.name || bkIndex}`}
//                         className="divide-x-2 divide-black hover:bg-[#CFD8DC]"
//                     >
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono">{fund.name}</td>
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono">{fund.sanction_ref_no || "N/A"}</td>
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono font-semibold">{item.account_head}</td>
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono font-bold">
//                             {(item.amount_received || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
//                         </td>
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono">{item.budget_year_funds_receive}</td>
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono">{item.remarks || "-"}</td>
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono">
//                             <span
//                                 className={cn("px-2 py-1 rounded text-xs font-bold uppercase", {
//                                     "bg-blue-100 text-blue-800": (fund.workflow_state || "").toLowerCase() === "draft",
//                                     "bg-yellow-100 text-yellow-800": (fund.workflow_state || "").toLowerCase() === "submitted",
//                                     "bg-green-100 text-green-800": (fund.workflow_state || "").toLowerCase() === "approved",
//                                 })}
//                             >
//                                 {fund.workflow_state || "Draft"}
//                             </span>
//                         </td>
//                     </tr>
//                 ))}
//             </>
//         );
//     }

//     return (
//         <tr key={fund.name} className="divide-x-2 divide-black hover:bg-[#CFD8DC] bg-gray-50">
//             <td className="px-4 py-3 text-sm text-gray-800 font-mono">{fund.name}</td>
//             <td className="px-4 py-3 text-sm text-gray-800 font-mono">{fund.sanction_ref_no || "N/A"}</td>
//             <td className="px-4 py-3 text-sm text-gray-500 font-mono italic" colSpan={5}>
//                 No budget breakup available
//             </td>
//         </tr>
//     );
// };

// type FundDetailsProps = {
//     project_title?: string;
//     apiAuthHeader?: string; // "token KEY:SECRET" if required
//     embedFiles?: boolean;
// };

// const normalizeResponse = (raw: any): FundDoc[] => {
//     if (!raw) return [];
//     // shape: { message: { message: [ ... ] } }
//     if (raw.message && raw.message.message && Array.isArray(raw.message.message)) return raw.message.message;
//     if (raw.message && Array.isArray(raw.message)) return raw.message;
//     if (Array.isArray(raw)) return raw;
//     if (raw.data && Array.isArray(raw.data)) return raw.data;
//     if (raw.results && Array.isArray(raw.results)) return raw.results;
//     if (raw.message && raw.message.data && Array.isArray(raw.message.data)) return raw.message.data;
//     return [];
// };

// const fetchViaDirect = async (
//     endpoint: string,
//     prjreg_title: string,
//     authHeader?: string,
//     limit = 200,
//     start = 0,
//     signal?: AbortSignal
// ) => {
//     // allow relative endpoint (browser) or absolute
//     const url = endpoint.startsWith("http") ? new URL(endpoint) : new URL(endpoint, window.location.origin);
//     url.searchParams.set("prjreg_title", prjreg_title);
//     url.searchParams.set("limit", String(limit));
//     url.searchParams.set("start", String(start));

//     const headers: Record<string, string> = { Accept: "application/json" };
//     if (authHeader) headers["Authorization"] = authHeader;

//     const res = await fetch(url.toString(), { method: "GET", headers, signal, credentials: authHeader ? "omit" : "include" });
//     if (!res.ok) {
//         const text = await res.text().catch(() => "");
//         const err = new Error(`Request failed: ${res.status} ${res.statusText} - ${text}`);
//         (err as any).status = res.status;
//         throw err;
//     }
//     return res.json();
// };

// const JsonPreview = ({ data }: { data: any }) => {
//     return (
//         <pre className="whitespace-pre-wrap text-xs font-mono bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
//             {JSON.stringify(data, null, 2)}
//         </pre>
//     );
// };

// const FundDetails: React.FC<FundDetailsProps> = ({ project_title, apiAuthHeader, embedFiles = false }) => {
//     const prjregTitle = project_title && project_title.trim() ? project_title.trim() : DEFAULT_PRJREG_TITLE;
//     const useSdk = !apiAuthHeader;

//     const [directData, setDirectData] = useState<FundDoc[] | null>(null);
//     const [directLoading, setDirectLoading] = useState(false);
//     const [directError, setDirectError] = useState<Error | null>(null);
//     // local state for toggling raw JSON per row
//     const [openRaw, setOpenRaw] = useState<Record<string, boolean>>({});

//     const { data: sdkResponse, isLoading: sdkLoading, error: sdkError } = useFrappeGetCall(
//         "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
//         {
//             prjreg_title: prjregTitle,
//             limit: 200,
//             start: 0,
//         }
//     );

//     useEffect(() => {
//         if (!useSdk) {
//             const controller = new AbortController();
//             setDirectLoading(true);
//             setDirectError(null);
//             setDirectData(null);

//             const DIRECT_ENDPOINT = "/api/method/rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg";

//             fetchViaDirect(DIRECT_ENDPOINT, prjregTitle, apiAuthHeader, 200, 0, controller.signal)
//                 .then((json) => {
//                     const normalized = normalizeResponse(json);
//                     if (!embedFiles) {
//                         normalized.forEach((d: any) => {
//                             // remove large blobs if present
//                             if (d.document_upload_file_data) delete d.document_upload_file_data;
//                             if (Array.isArray(d.received_amt_breakup)) {
//                                 d.received_amt_breakup.forEach((r: any) => {
//                                     if (r.file_data) delete r.file_data;
//                                 });
//                             }
//                         });
//                     }
//                     setDirectData(normalized);
//                 })
//                 .catch((err) => {
//                     if (err.name === "AbortError") return;
//                     setDirectError(err);
//                 })
//                 .finally(() => setDirectLoading(false));

//             return () => controller.abort();
//         }
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [prjregTitle, apiAuthHeader, embedFiles]);

//     const isLoading = useSdk ? sdkLoading : directLoading;
//     const error = useSdk ? (sdkError as unknown as Error | null) : directError;
//     const rawMessage = useSdk ? sdkResponse ?? undefined : directData;
//     const fundsForProject = normalizeResponse(rawMessage);

//     if (isLoading) {
//         return (
//             <div className="mt-6 p-4 border-2 border-gray-300 rounded-md bg-gray-50 text-center">
//                 <p className="text-sm text-gray-600 font-mono">Loading fund received data...</p>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <div className="mt-6 p-4 border-2 border-red-300 rounded-md bg-red-50 text-center">
//                 <p className="text-sm text-red-600 font-mono">Error loading fund received data: {error.message}</p>
//             </div>
//         );
//     }

//     if (!Array.isArray(fundsForProject) || fundsForProject.length === 0) {
//         return (
//             <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 text-center">
//                 <p className="text-sm text-gray-600 font-mono">No fund received records found for this project.</p>
//             </div>
//         );
//     }



//     return (
//         <div className="mt-6 space-y-6">
//             <h4 className="text-lg font-bold text-black uppercase flex items-center gap-2">
//                 <DollarSignIcon className="h-5 w-5" />
//                 Fund Received Budget Breakup — Full data
//             </h4>

//             <div className="overflow-x-auto border-2 border-black rounded-md">
//                 <table className="min-w-full divide-y-2 divide-black">
//                     <thead className="bg-[#78909C]">
//                         <tr className="divide-x-2 divide-black">
//                             <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Fund Received ID</th>
//                             <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Sanction Ref No</th>
//                             <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Account Head</th>
//                             <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Amount Received</th>
//                             <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Budget Year</th>
//                             <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Remarks</th>
//                             <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Workflow State</th>
//                         </tr>
//                     </thead>
//                     <tbody className="divide-y-2 divide-black bg-white">
//                         {fundsForProject.map((fund: FundDoc) => (
//                             <React.Fragment key={fund.name}>
//                                 <FundBreakupRows fund={fund} />
//                                 {/* Row with actions */}
//                                 <tr className="bg-white">
//                                     <td colSpan={7} className="px-4 py-2">
//                                         <div className="flex items-center justify-between gap-4">
//                                             <div className="text-xs text-gray-600 font-mono">
//                                                 Owner: {fund.owner} • Modified: {fund.modified}
//                                             </div>
//                                             <div className="flex items-center gap-2">
//                                                 <button
//                                                     onClick={() =>
//                                                         setOpenRaw((s) => ({ ...s, [fund.name]: !s[fund.name] }))
//                                                     }
//                                                     className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 border"
//                                                 >
//                                                     {openRaw[fund.name] ? "Hide JSON" : "Show JSON"}
//                                                 </button>
//                                                 <a
//                                                     href={`/desk#Form/Fund Received/${encodeURIComponent(fund.name)}`}
//                                                     className="px-3 py-1 text-xs rounded bg-blue-700 text-white hover:opacity-90"
//                                                 >
//                                                     Open in Desk
//                                                 </a>
//                                             </div>
//                                         </div>
//                                         {openRaw[fund.name] && (
//                                             <div className="mt-3">
//                                                 <JsonPreview data={fund} />
//                                             </div>
//                                         )}
//                                     </td>
//                                 </tr>
//                             </React.Fragment>
//                         ))}
//                     </tbody>
//                 </table>
//             </div>
//         </div>
//     );
// };

// export default FundDetails;



// -=-=-=-=-=-=-==--=-=-=

// import React, { useEffect, useState } from "react";
// import { useFrappeGetCall } from "frappe-react-sdk";
// import { DollarSignIcon } from "lucide-react";
// import { cn } from "@/lib/utils";

// type FundDoc = any;
// const DEFAULT_PRJREG_TITLE = "2025111101DST000103";

// const FundBreakupRows = ({ fund }: { fund: FundDoc }) => {
//     const breakup = fund?.received_amt_breakup || [];

//     if (Array.isArray(breakup) && breakup.length > 0) {
//         return (
//             <>
//                 {breakup.map((item: any, bkIndex: number) => (
//                     <tr
//                         key={`${fund.name}-${item.name || bkIndex}`}
//                         className="divide-x-2 divide-black hover:bg-[#CFD8DC]"
//                     >
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono">{bkIndex + 1}</td>
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono font-semibold">{item.account_head}</td>
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono font-bold">
//                             {(item.amount_received || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
//                         </td>
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono">{item.budget_year_funds_receive}</td>
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono">{item.remarks || "-"}</td>
//                         <td className="px-4 py-3 text-sm text-gray-800 font-mono">
//                             <span
//                                 className={cn("px-2 py-1 rounded text-xs font-bold uppercase", {
//                                     "bg-blue-100 text-blue-800": (fund.workflow_state || "").toLowerCase() === "draft",
//                                     "bg-yellow-100 text-yellow-800": (fund.workflow_state || "").toLowerCase() === "submitted",
//                                     "bg-green-100 text-green-800": (fund.workflow_state || "").toLowerCase() === "approved",
//                                 })}
//                             >
//                                 {fund.workflow_state || "Draft"}
//                             </span>
//                         </td>
//                     </tr>
//                 ))}
//             </>
//         );
//     }

//     return (
//         <tr key={fund.name} className="divide-x-2 divide-black hover:bg-[#CFD8DC] bg-gray-50">
//             <td className="px-4 py-3 text-sm text-gray-800 font-mono" colSpan={6}>
//                 <span className="text-gray-500 italic">No budget breakup available</span>
//             </td>
//         </tr>
//     );
// };

// type FundDetailsProps = {
//     project_title?: string;
//     apiAuthHeader?: string;
//     embedFiles?: boolean;
// };

// const normalizeResponse = (raw: any): FundDoc[] => {
//     if (!raw) return [];
//     if (raw.message && raw.message.message && Array.isArray(raw.message.message)) return raw.message.message;
//     if (raw.message && Array.isArray(raw.message)) return raw.message;
//     if (Array.isArray(raw)) return raw;
//     if (raw.data && Array.isArray(raw.data)) return raw.data;
//     if (raw.results && Array.isArray(raw.results)) return raw.results;
//     if (raw.message && raw.message.data && Array.isArray(raw.message.data)) return raw.message.data;
//     return [];
// };

// const fetchViaDirect = async (
//     endpoint: string,
//     prjreg_title: string,
//     authHeader?: string,
//     limit = 200,
//     start = 0,
//     signal?: AbortSignal
// ) => {
//     const url = endpoint.startsWith("http") ? new URL(endpoint) : new URL(endpoint, window.location.origin);
//     url.searchParams.set("prjreg_title", prjreg_title);
//     url.searchParams.set("limit", String(limit));
//     url.searchParams.set("start", String(start));

//     const headers: Record<string, string> = { Accept: "application/json" };
//     if (authHeader) headers["Authorization"] = authHeader;

//     const res = await fetch(url.toString(), { method: "GET", headers, signal, credentials: authHeader ? "omit" : "include" });
//     if (!res.ok) {
//         const text = await res.text().catch(() => "");
//         const err = new Error(`Request failed: ${res.status} ${res.statusText} - ${text}`);
//         (err as any).status = res.status;
//         throw err;
//     }
//     return res.json();
// };

// const JsonPreview = ({ data }: { data: any }) => {
//     return (
//         <pre className="whitespace-pre-wrap text-xs font-mono bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
//             {JSON.stringify(data, null, 2)}
//         </pre>
//     );
// };

// const FundDetails: React.FC<FundDetailsProps> = ({ project_title, apiAuthHeader, embedFiles = false }) => {
//     const prjregTitle = project_title && project_title.trim() ? project_title.trim() : DEFAULT_PRJREG_TITLE;
//     const useSdk = !apiAuthHeader;

//     const [directData, setDirectData] = useState<FundDoc[] | null>(null);
//     const [directLoading, setDirectLoading] = useState(false);
//     const [directError, setDirectError] = useState<Error | null>(null);
//     const [openRaw, setOpenRaw] = useState<Record<string, boolean>>({});

//     const { data: sdkResponse, isLoading: sdkLoading, error: sdkError } = useFrappeGetCall(
//         "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
//         {
//             prjreg_title: prjregTitle,
//             limit: 200,
//             start: 0,
//         }
//     );

//     useEffect(() => {
//         if (!useSdk) {
//             const controller = new AbortController();
//             setDirectLoading(true);
//             setDirectError(null);
//             setDirectData(null);

//             const DIRECT_ENDPOINT = "/api/method/rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg";

//             fetchViaDirect(DIRECT_ENDPOINT, prjregTitle, apiAuthHeader, 200, 0, controller.signal)
//                 .then((json) => {
//                     const normalized = normalizeResponse(json);
//                     if (!embedFiles) {
//                         normalized.forEach((d: any) => {
//                             if (d.document_upload_file_data) delete d.document_upload_file_data;
//                             if (Array.isArray(d.received_amt_breakup)) {
//                                 d.received_amt_breakup.forEach((r: any) => {
//                                     if (r.file_data) delete r.file_data;
//                                 });
//                             }
//                         });
//                     }
//                     setDirectData(normalized);
//                 })
//                 .catch((err) => {
//                     if (err.name === "AbortError") return;
//                     setDirectError(err);
//                 })
//                 .finally(() => setDirectLoading(false));

//             return () => controller.abort();
//         }
//     }, [prjregTitle, apiAuthHeader, embedFiles]);

//     const isLoading = useSdk ? sdkLoading : directLoading;
//     const error = useSdk ? (sdkError as unknown as Error | null) : directError;
//     const rawMessage = useSdk ? sdkResponse ?? undefined : directData;
//     const fundsForProject = normalizeResponse(rawMessage);

//     if (isLoading) {
//         return (
//             <div className="mt-6 p-4 border-2 border-gray-300 rounded-md bg-gray-50 text-center">
//                 <p className="text-sm text-gray-600 font-mono">Loading fund received data...</p>
//             </div>
//         );
//     }

//     if (error) {
//         return (
//             <div className="mt-6 p-4 border-2 border-red-300 rounded-md bg-red-50 text-center">
//                 <p className="text-sm text-red-600 font-mono">Error loading fund received data: {error.message}</p>
//             </div>
//         );
//     }

//     if (!Array.isArray(fundsForProject) || fundsForProject.length === 0) {
//         return (
//             <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 text-center">
//                 <p className="text-sm text-gray-600 font-mono">No fund received records found for this project.</p>
//             </div>
//         );
//     }

//     return (
//         <div className="mt-6 space-y-6">
//             <h4 className="text-lg font-bold text-black uppercase flex items-center gap-2">
//                 <DollarSignIcon className="h-5 w-5" />
//                 Fund Received Budget Breakup — Full data
//             </h4>

//             <div className="space-y-4">
//                 {fundsForProject.map((fund: FundDoc) => (
//                     <div key={fund.name} className="border-2 border-black rounded-md overflow-hidden">
//                         {/* Fund Header */}
//                         <div className="bg-[#607D8B] px-4 py-3 border-b-2 border-black">
//                             <div className="flex items-center justify-between">
//                                 <div className="text-white">
//                                     <span className="text-xs font-bold uppercase">Fund ID:</span>
//                                     <span className="ml-2 text-sm font-mono font-bold">{fund.name}</span>
//                                     {fund.sanction_ref_no && (
//                                         <>
//                                             <span className="mx-2">•</span>
//                                             <span className="text-xs font-bold uppercase">Sanction Ref:</span>
//                                             <span className="ml-2 text-sm font-mono">{fund.sanction_ref_no}</span>
//                                         </>
//                                     )}
//                                 </div>
//                             </div>
//                         </div>

//                         <div className="overflow-x-auto">
//                             <table className="min-w-full divide-y-2 divide-black">
//                                 <thead className="bg-[#78909C]">
//                                     <tr className="divide-x-2 divide-black">
//                                         <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">#</th>
//                                         <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Account Head</th>
//                                         <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Amount Received</th>
//                                         <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Budget Year</th>
//                                         <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Remarks</th>
//                                         <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Workflow State</th>
//                                     </tr>
//                                 </thead>
//                                 <tbody className="divide-y-2 divide-black bg-white">
//                                     <FundBreakupRows fund={fund} />
//                                 </tbody>
//                             </table>
//                         </div>

//                         <div className="bg-white border-t-2 border-black px-4 py-3">
//                             <div className="flex items-center justify-between gap-4">
//                                 <div className="text-xs text-gray-600 font-mono">
//                                     Owner: {fund.owner} • Modified: {fund.modified}
//                                 </div>
//                                 <div className="flex items-center gap-2">
//                                     <button
//                                         onClick={() =>
//                                             setOpenRaw((s) => ({ ...s, [fund.name]: !s[fund.name] }))
//                                         }
//                                         className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 border"
//                                     >
//                                         {openRaw[fund.name] ? "Hide JSON" : "Show JSON"}
//                                     </button>
//                                     <a
//                                         href={`/desk#Form/Fund Received/${encodeURIComponent(fund.name)}`}
//                                         className="px-3 py-1 text-xs rounded bg-blue-700 text-white hover:opacity-90"
//                                     >
//                                         Open in Desk
//                                     </a>
//                                 </div>
//                             </div>
//                             {openRaw[fund.name] && (
//                                 <div className="mt-3">
//                                     <JsonPreview data={fund} />
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// };

// export default FundDetails;



// -=-=-=-=-=-=-=


import React, { useEffect, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { DollarSignIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FundDoc = any;
const DEFAULT_PRJREG_TITLE = "2025111101DST000103";

const FundBreakupRows = ({ fund }: { fund: FundDoc }) => {
    const breakup = fund?.received_amt_breakup || [];

    if (Array.isArray(breakup) && breakup.length > 0) {
        return (
            <>
                {breakup.map((item: any, bkIndex: number) => (
                    <tr
                        key={`${fund.name}-${item.name || bkIndex}`}
                        className="divide-x-2 divide-black hover:bg-[#CFD8DC]"
                    >
                        <td className="px-4 py-3 text-sm text-gray-800 font-mono">{bkIndex + 1}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-mono font-semibold">{item.account_head}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-mono font-bold">
                            {(item.amount_received || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-mono">{item.budget_year_funds_receive}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-mono">{item.remarks || "-"}</td>
                        <td className="px-4 py-3 text-sm text-gray-800 font-mono">
                            <span
                                className={cn("px-2 py-1 rounded text-xs font-bold uppercase", {
                                    "bg-blue-100 text-blue-800": (fund.workflow_state || "").toLowerCase() === "draft",
                                    "bg-yellow-100 text-yellow-800": (fund.workflow_state || "").toLowerCase() === "submitted",
                                    "bg-green-100 text-green-800": (fund.workflow_state || "").toLowerCase() === "approved",
                                })}
                            >
                                {fund.workflow_state || "Draft"}
                            </span>
                        </td>
                    </tr>
                ))}
            </>
        );
    }

    return (
        <tr key={fund.name} className="divide-x-2 divide-black hover:bg-[#CFD8DC] bg-gray-50">
            <td className="px-4 py-3 text-sm text-gray-800 font-mono" colSpan={6}>
                <span className="text-gray-500 italic">No budget breakup available</span>
            </td>
        </tr>
    );
};

type FundDetailsProps = {
    project_title?: string;
    apiAuthHeader?: string;
    embedFiles?: boolean;
};

const normalizeResponse = (raw: any): FundDoc[] => {
    if (!raw) return [];
    if (raw.message && raw.message.message && Array.isArray(raw.message.message)) return raw.message.message;
    if (raw.message && Array.isArray(raw.message)) return raw.message;
    if (Array.isArray(raw)) return raw;
    if (raw.data && Array.isArray(raw.data)) return raw.data;
    if (raw.results && Array.isArray(raw.results)) return raw.results;
    if (raw.message && raw.message.data && Array.isArray(raw.message.data)) return raw.message.data;
    return [];
};

const fetchViaDirect = async (
    endpoint: string,
    prjreg_title: string,
    authHeader?: string,
    limit = 200,
    start = 0,
    signal?: AbortSignal
) => {
    const url = endpoint.startsWith("http") ? new URL(endpoint) : new URL(endpoint, window.location.origin);
    url.searchParams.set("prjreg_title", prjreg_title);
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("start", String(start));

    const headers: Record<string, string> = { Accept: "application/json" };
    if (authHeader) headers["Authorization"] = authHeader;

    const res = await fetch(url.toString(), { method: "GET", headers, signal, credentials: authHeader ? "omit" : "include" });
    if (!res.ok) {
        const text = await res.text().catch(() => "");
        const err = new Error(`Request failed: ${res.status} ${res.statusText} - ${text}`);
        (err as any).status = res.status;
        throw err;
    }
    return res.json();
};

const JsonPreview = ({ data }: { data: any }) => {
    return (
        <pre className="whitespace-pre-wrap text-xs font-mono bg-gray-50 p-3 rounded border border-gray-200 overflow-x-auto">
            {JSON.stringify(data, null, 2)}
        </pre>
    );
};

const FundDetails: React.FC<FundDetailsProps> = ({ project_title, apiAuthHeader, embedFiles = false }) => {
    const prjregTitle = project_title && project_title.trim() ? project_title.trim() : DEFAULT_PRJREG_TITLE;
    const useSdk = !apiAuthHeader;

    const [directData, setDirectData] = useState<FundDoc[] | null>(null);
    const [directLoading, setDirectLoading] = useState(false);
    const [directError, setDirectError] = useState<Error | null>(null);
    const [openRaw, setOpenRaw] = useState<Record<string, boolean>>({});

    const { data: sdkResponse, isLoading: sdkLoading, error: sdkError } = useFrappeGetCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
        {
            prjreg_title: prjregTitle,
            limit: 200,
            start: 0,
        }
    );

    useEffect(() => {
        if (!useSdk) {
            const controller = new AbortController();
            setDirectLoading(true);
            setDirectError(null);
            setDirectData(null);

            const DIRECT_ENDPOINT = "/api/method/rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg";

            fetchViaDirect(DIRECT_ENDPOINT, prjregTitle, apiAuthHeader, 200, 0, controller.signal)
                .then((json) => {
                    const normalized = normalizeResponse(json);
                    if (!embedFiles) {
                        normalized.forEach((d: any) => {
                            if (d.document_upload_file_data) delete d.document_upload_file_data;
                            if (Array.isArray(d.received_amt_breakup)) {
                                d.received_amt_breakup.forEach((r: any) => {
                                    if (r.file_data) delete r.file_data;
                                });
                            }
                        });
                    }
                    setDirectData(normalized);
                })
                .catch((err) => {
                    if (err.name === "AbortError") return;
                    setDirectError(err);
                })
                .finally(() => setDirectLoading(false));

            return () => controller.abort();
        }
    }, [prjregTitle, apiAuthHeader, embedFiles]);

    const isLoading = useSdk ? sdkLoading : directLoading;
    const error = useSdk ? (sdkError as unknown as Error | null) : directError;
    const rawMessage = useSdk ? sdkResponse ?? undefined : directData;
    const fundsForProject = normalizeResponse(rawMessage);

    if (isLoading) {
        return (
            <div className="mt-6 p-4 border-2 border-gray-300 rounded-md bg-gray-50 text-center">
                <p className="text-sm text-gray-600 font-mono">Loading fund received data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-6 p-4 border-2 border-red-300 rounded-md bg-red-50 text-center">
                <p className="text-sm text-red-600 font-mono">Error loading fund received data: {error.message}</p>
            </div>
        );
    }

    if (!Array.isArray(fundsForProject) || fundsForProject.length === 0) {
        return (
            <div className="mt-6 p-4 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 text-center">
                <p className="text-sm text-gray-600 font-mono">No fund received records found for this project.</p>
            </div>
        );
    }

    return (
        <div className="mt-6 space-y-6">
            <h4 className="text-lg font-bold text-black uppercase flex items-center gap-2">
                <DollarSignIcon className="h-5 w-5" />
                Fund Received Budget Breakup — Full data
            </h4>

            <div className="space-y-4">
                {fundsForProject.map((fund: FundDoc) => (
                    <div key={fund.name} className="border-2 border-black rounded-md overflow-hidden">
                        {/* Fund Header */}
                        <div className="bg-[#78909C] px-4 py-3 border-b-2 border-black">
                            <div className="flex items-center justify-between">
                                <div className="text-white">
                                    <span className="text-xs font-bold uppercase">Fund ID:</span>
                                    <span className="ml-2 text-sm font-mono font-bold">{fund.name}</span>
                                    {fund.sanction_ref_no && (
                                        <>
                                            <span className="mx-2">•</span>
                                            <span className="text-xs font-bold uppercase">Sanction Ref:</span>
                                            <span className="ml-2 text-sm font-mono">{fund.sanction_ref_no}</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y-2 divide-black">
                                <thead className="bg-[#78909C]">
                                    <tr className="divide-x-2 divide-black">
                                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">#</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Account Head</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Amount Received</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Budget Year</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Remarks</th>
                                        <th className="px-4 py-3 text-left text-xs font-bold text-black uppercase">Workflow State</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y-2 divide-black bg-white">
                                    <FundBreakupRows fund={fund} />
                                </tbody>
                            </table>
                        </div>

                        <div className="bg-white border-t-2 border-black px-4 py-3">
                            <div className="flex items-center justify-between gap-4">
                                <div className="text-xs text-gray-600 font-mono">
                                    Owner: {fund.owner} • Modified: {fund.modified}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() =>
                                            setOpenRaw((s) => ({ ...s, [fund.name]: !s[fund.name] }))
                                        }
                                        className="px-3 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 border"
                                    >
                                        {openRaw[fund.name] ? "Hide JSON" : "Show JSON"}
                                    </button>
                                    <a
                                        href={`/desk#Form/Fund Received/${encodeURIComponent(fund.name)}`}
                                        className="px-3 py-1 text-xs rounded bg-blue-700 text-white hover:opacity-90"
                                    >
                                        Open in Desk
                                    </a>
                                </div>
                            </div>
                            {openRaw[fund.name] && (
                                <div className="mt-3">
                                    <JsonPreview data={fund} />
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FundDetails;