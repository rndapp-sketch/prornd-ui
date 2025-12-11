import React, { useEffect, useState } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type FundDoc = any;
const DEFAULT_PRJREG_TITLE = "2025111101DST000103";

type FundDetailsProps = {
    project_title?: string;
    sanction_ref_no?: string;
    apiAuthHeader?: string; // "token KEY:SECRET" if required
    embedFiles?: boolean;
};

const normalizeResponse = (raw: any): FundDoc[] => {
    if (!raw) return [];
    // shape: { message: { message: [ ... ] } }
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
    // allow relative endpoint (browser) or absolute
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

const FundDetails: React.FC<FundDetailsProps> = ({ project_title, sanction_ref_no, apiAuthHeader, embedFiles = false }) => {
    const prjregTitle = project_title && project_title.trim() ? project_title.trim() : DEFAULT_PRJREG_TITLE;
    const useSdk = !apiAuthHeader;
    const navigate = useNavigate();

    const [directData, setDirectData] = useState<FundDoc[] | null>(null);
    const [directLoading, setDirectLoading] = useState(false);
    const [directError, setDirectError] = useState<Error | null>(null);

    const { data: sdkResponse, isLoading: sdkLoading, error: sdkError } = useFrappeGetCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg",
        {
            prjreg_title: prjregTitle,
            limit: 200,
            start: 0,
        }
    );

    const { call: performAction, loading: actionLoading } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.fund_received.fund_received.perform_fund_received_action"
    );

    const handleSubmit = async (docname: string) => {
        try {
            await performAction({ docname, action: "Submit" });
            // Refresh data
            if (useSdk) {
                // sdkResponse.mutate(); // If mutate is available, otherwise we might need to rely on re-render or window reload for now as simple fix
                window.location.reload();
            } else {
                // For direct call, we can just trigger a re-fetch by toggling a state or calling the fetch function again
                // But for simplicity and consistency with the SDK path in this context, reload is safest
                window.location.reload();
            }
        } catch (error) {
            console.error("Error submitting fund:", error);
            alert("Failed to submit fund received entry.");
        }
    };
    console.log("sdkResponse", sdkResponse);
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
                            // remove large blobs if present
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prjregTitle, apiAuthHeader, embedFiles]);

    const isLoading = useSdk ? sdkLoading : directLoading;
    const error = useSdk ? (sdkError as unknown as Error | null) : directError;
    const rawMessage = useSdk ? sdkResponse ?? undefined : directData;
    const allFunds = normalizeResponse(rawMessage);


    const fundsForProject = sanction_ref_no
        ? allFunds.filter((f: any) => f.sanction_ref_no === sanction_ref_no || !f.sanction_ref_no)
        : allFunds;

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
                <p className="text-sm text-gray-600 font-mono">
                    {sanction_ref_no
                        ? "No fund received records linked to this sanction."
                        : "No fund received records found for this project."}
                </p>
            </div>
        );
    }

    return (
        <div className="mt-6 space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                Fund Received History
            </h4>

            <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fund ID</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Amount</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {fundsForProject.map((fund: FundDoc) => (
                            <tr key={fund.name} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900">{fund.name}</td>
                                <td className="px-4 py-3">
                                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", {
                                        "bg-yellow-100 text-yellow-800": fund.workflow_state === "Draft",
                                        "bg-blue-100 text-blue-800": fund.workflow_state === "Submitted" || fund.workflow_state?.includes("Pending"),
                                        "bg-green-100 text-green-800": fund.workflow_state === "Approved",
                                        "bg-purple-100 text-purple-800": fund.workflow_state?.includes("Generate"),
                                        "bg-gray-100 text-gray-800": !fund.workflow_state,
                                    })}>
                                        {fund.workflow_state || "Draft"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-[#0EA5A4] text-right">
                                    {(fund.fund_received_amt || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600">{fund.modified?.split(" ")[0] || "-"}</td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => navigate(`/fund-received/${fund.name}`, { state: { prjreg_title: prjregTitle } })}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0EA5A4] hover:bg-[#0C8F8E] rounded-lg shadow-sm transition-all"
                                    >
                                        View <ArrowRight className="h-3 w-3" />
                                    </button>
                                    {(!fund.workflow_state || fund.workflow_state === "Draft") && (
                                        <button
                                            onClick={() => handleSubmit(fund.name)}
                                            disabled={actionLoading}
                                            className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
                                        >
                                            Submit
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default FundDetails;