import React, { useEffect, useState } from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { ArrowRight, Calendar, FileText } from "lucide-react";
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
        ? allFunds.filter((f: any) => f.sanction_ref_no === sanction_ref_no)
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
        <div className="mt-6 space-y-6">
            <h4 className="text-lg font-bold text-black uppercase flex items-center gap-2">
                {/* <DollarSignIcon className="h-5 w-5" /> */}
                Fund Received History
            </h4>

            <div className="grid grid-cols-1 gap-4">
                {fundsForProject.map((fund: FundDoc) => (
                    <div
                        key={fund.name}
                        className="group bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_rgba(0,0,0,0.25)] transition-all cursor-pointer p-4"
                        onClick={() => navigate(`/fund-received/${fund.name}`, { state: { prjreg_title: prjregTitle } })}
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className={cn("px-2 py-0.5 rounded text-xs font-bold uppercase border border-black", {
                                        "bg-yellow-200": fund.workflow_state === "Draft",
                                        "bg-blue-200": fund.workflow_state === "Submitted",
                                        "bg-green-200": fund.workflow_state === "Approved",
                                    })}>
                                        {fund.workflow_state || "Draft"}
                                    </span>
                                    <span className="text-xs font-mono text-gray-500">{fund.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        {/* <DollarSignIcon className="h-4 w-4 text-green-600" /> */}
                                        <span className="font-bold font-mono text-lg">
                                            {(fund.fund_received_amt || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                        </span>
                                    </div>
                                    {fund.sanction_ref_no && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <FileText className="h-4 w-4" />
                                            <span className="text-sm font-mono">{fund.sanction_ref_no}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-4">
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-gray-500 text-xs">
                                        <Calendar className="h-3 w-3" />
                                        <span>{fund.modified?.split(" ")[0]}</span>
                                    </div>
                                </div>
                                <div className="bg-black text-white p-2 rounded-full group-hover:bg-gray-800 transition-colors">
                                    <ArrowRight className="h-4 w-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FundDetails;