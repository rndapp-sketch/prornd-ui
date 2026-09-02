import React, { useEffect, useState } from "react";
import { useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { ArrowRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

type FundDoc = any;

type FundDetailsProps = {
    project_title?: string;
    sanction_ref_no?: string;
    apiAuthHeader?: string; // "token KEY:SECRET" if required
    embedFiles?: boolean;
};

// --- COMMENT MODAL ---
const CommentModal = ({ isOpen, onClose, onSubmit, action, isLoading }: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (comment: string) => void;
    action: string;
    isLoading: boolean;
}) => {
    const [comment, setComment] = useState("");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">Confirm {action}</h3>
                <textarea
                    className="w-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757] placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
                    rows={4}
                    placeholder="Add a comment (optional)..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => { onSubmit(comment); setComment(""); }}
                        disabled={isLoading}
                        className="px-4 py-2 text-sm font-medium text-white bg-[#D97757] rounded-lg hover:bg-[#D97757] disabled:opacity-50"
                    >
                        {isLoading ? "Processing..." : "Confirm"}
                    </button>
                </div>
            </div>
        </div>
    );
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

const FundDetails: React.FC<FundDetailsProps> = ({ project_title, sanction_ref_no, apiAuthHeader, embedFiles = false }) => {
    const prjregTitle = project_title && project_title.trim() ? project_title.trim() : "";
    const useSdk = !apiAuthHeader;
    const navigate = useNavigate();

    const [directData, setDirectData] = useState<FundDoc[] | null>(null);
    const [directLoading, setDirectLoading] = useState(false);
    const [directError, setDirectError] = useState<Error | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedFundName, setSelectedFundName] = useState("");

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

    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");
    const { call: deleteDoc, loading: deleteLoading } = useFrappePostCall("frappe.client.delete");

    const handleSubmitClick = (docname: string) => {
        setSelectedFundName(docname);
        setModalOpen(true);
    };

    const handleConfirmSubmit = async (comment: string) => {
        try {
            await performAction({ docname: selectedFundName, action: "Submit" });

            if (comment && comment.trim()) {
                try {
                    await addComment({
                        doctype: "Fund Received",
                        docname: selectedFundName,
                        content: `[Submit] ${comment.trim()}`
                    });
                } catch (commentError) {
                }
            }

            setModalOpen(false);
            window.location.reload();
        } catch (error) {
            alert("Failed to submit fund received entry.");
        }
    };

    const handleDelete = async (docname: string) => {
        if (!confirm("Are you sure you want to delete this Draft Fund Received entry? This action cannot be undone.")) return;

        try {
            await deleteDoc({ doctype: 'Fund Received', name: docname });
            // Refresh data
            window.location.reload();
        } catch (error) {
            alert("Failed to delete fund received entry.");
        }
    };
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [prjregTitle, apiAuthHeader, embedFiles]);

    const isLoading = useSdk ? sdkLoading : directLoading;
    const error = useSdk ? (sdkError as unknown as Error | null) : directError;
    const rawMessage = useSdk ? sdkResponse ?? undefined : directData;
    const allFunds = normalizeResponse(rawMessage);


    const fundsForProject = allFunds;

    if (isLoading) {
        return (
            <div className="mt-6 p-4 border-2 border-zinc-300 dark:border-zinc-700 rounded-md bg-zinc-50 dark:bg-zinc-800/50 text-center">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-mono">Loading fund received data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="mt-6 p-4 border-2 border-red-300 dark:border-red-800 rounded-md bg-red-50 dark:bg-red-900/20 text-center">
                <p className="text-sm text-red-600 dark:text-red-400 font-mono">Error loading fund received data: {error.message}</p>
            </div>
        );
    }

    if (!Array.isArray(fundsForProject) || fundsForProject.length === 0) {
        return (
            <div className="mt-6 p-4 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-md bg-zinc-50 dark:bg-zinc-800/50 text-center">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 font-mono">
                    {sanction_ref_no
                        ? "No fund received records found for this project."
                        : "No fund received records found for this project."}
                </p>
            </div>
        );
    }

    return (
        <div className="mt-6 space-y-4">
            <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Fund Received History
            </h4>

            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">Fund ID</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">Status</th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-zinc-700 dark:text-zinc-300">Amount</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">Date</th>
                            <th className="px-4 py-3 text-center text-sm font-semibold text-zinc-700 dark:text-zinc-300">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {fundsForProject.map((fund: FundDoc) => (
                            <tr key={fund.name} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">{fund.name}</td>
                                <td className="px-4 py-3">
                                    <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", {
                                        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400": fund.workflow_state === "Draft",
                                        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400": fund.workflow_state === "Submitted" || fund.workflow_state?.includes("Pending"),
                                        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400": fund.workflow_state === "Approved",
                                        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400": fund.workflow_state?.includes("Generate"),
                                        "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300": !fund.workflow_state,
                                    })}>
                                        {fund.workflow_state || "Draft"}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-[#D97757] text-right">
                                    {(fund.fund_received_amt || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" })}
                                </td>
                                <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">{fund.modified?.split(" ")[0] || "-"}</td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => navigate(`/fund-received/${fund.name}`, { state: { prjreg_title: prjregTitle, sanction_ref_no: fund.sanction_ref_no || sanction_ref_no } })}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#D97757] hover:bg-[#D97757] rounded-lg shadow-sm transition-all"
                                    >
                                        View <ArrowRight className="h-3 w-3" />
                                    </button>
                                    {(!fund.workflow_state || fund.workflow_state === "Draft") && (
                                        <button
                                            onClick={() => handleSubmitClick(fund.name)}
                                            disabled={actionLoading}
                                            className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
                                        >
                                            Submit
                                        </button>
                                    )}
                                    {(!fund.workflow_state || fund.workflow_state === "Draft") && (
                                        <button
                                            onClick={() => handleDelete(fund.name)}
                                            disabled={deleteLoading}
                                            title="Delete Draft"
                                            className="ml-2 inline-flex items-center justify-center p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Comment Modal */}
            <CommentModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSubmit={handleConfirmSubmit}
                action="Submit Fund Received"
                isLoading={actionLoading}
            />
        </div>
    );
};

export default FundDetails;
