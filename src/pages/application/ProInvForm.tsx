import React, { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
// import { AppSidebar } from "@/components/RndSidebar";
import { ToWords } from "to-words";
import {
    useFrappeGetDoc,
    useFrappeGetCall,
    useFrappePostCall,
    useFrappeAuth,
} from "frappe-react-sdk";
import {
    ArrowLeft,
    Printer,
    Download,
    Save,
    Plus,
    Trash,
    FileText,
    Loader2,
    Send,
    CheckCircle2,
    XCircle,
    Clock,
    Lock,
} from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { CharLimitAlert } from "@/components/CharLimitAlert";
import { FIELD_CHAR_LIMITS } from "@/utils/fieldLimits";
import { useUserRoles } from "@/components/UserRole";
import { getFileUrl } from "@/utils/fileUtils";
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";

// ── ToWords Configuration ───────────────────────────────────────────────────
const toWords = new ToWords({
    localeCode: "en-IN",
    converterOptions: {
        currency: true,
        ignoreDecimal: false,
        ignoreZeroCurrency: false,
        doNotAddOnly: false,
        currencyOptions: {
            name: "Rupee",
            plural: "Rupees",
            symbol: "₹",
            fractionalUnit: {
                name: "Paisa",
                plural: "Paise",
                symbol: "",
            },
        },
    },
});

interface InvoiceItem {
    id: string;
    description: string;
    sac: string;
    taxableValue: number;
    cgstRate: string;
    cgstAmt: number;
    sgstRate: string;
    sgstAmt: number;
    igstRate: string;
    igstAmt: number;
}

// ── Approval workflow (mirrors Project Proposal endorsement) ────────────────
// The Project Proposal endorsement goes: submit → "Pending Approval" (routed to
// Dean, RnD) → "Approved", and its print format renders the approver signature
// only under {% if endorsement_status == 'Approved' %}. The Proforma Invoice
// (ProInv) follows the same procedure with two changes requested:
//   1. It is routed to the Head of Section (HoS) → "Pending HoS Approval".
//   2. The signatory image is affixed only after the HoS approves.
//
// NOTE: the *exact* endorsement procedure is backend-driven (a doctype + Frappe
// workflow + a ToDo assigned to the HoS role + a server-signed PDF), all of
// which live in the `rndopsapp` app. That backend has no ProInv doctype yet, so
// this page implements the same state machine on the frontend: the status +
// approver are persisted locally (keyed by project), the HoS Approve/Reject
// actions are gated to the HoS role, and the signature is gated on approval.
// When a ProInv doctype exists in rndopsapp, swap the localStorage persistence
// for SDK calls to its submit/process methods — the UI logic stays the same.
const HOS_ROLE = "Hos, RnD (Head of Section, RnD)";

// Placeholder embedded in the stored invoice HTML at the signatory position. The
// backend print format swaps it for the signature (only when workflow_state ==
// 'Approved'); the frontend swaps it too when displaying/printing (see
// renderStored). Keeping it a slot — rather than baking the signature at save
// time — is what lets the signature appear *after* HoS approval.
const SIGNATURE_SLOT = "<!--SIGNATURE_SLOT-->";

// Official IITG emblem used on the Endorsement Certificate (see
// EndorsementCertificate.tsx). Shown in the invoice header next to the existing
// top-left logo.
const ENDORSEMENT_LOGO_URL = `http://${import.meta.env.VITE_APP_BACKEND_HOST || "172.16.131.206"}:${import.meta.env.VITE_APP_BACKEND_PORT || "8000"}/files/IITG_logo.png`;

// Backend API (rndopsapp `proforma_invoice` doctype). The form now persists to
// these instead of localStorage so the invoice enters the real workflow and
// surfaces in the HoS dashboard's pending-task list.
const API = {
    getByProject: "rndopsapp.rndopsapp.doctype.proforma_invoice.proforma_invoice.get_proforma_invoice",
    getByName: "rndopsapp.rndopsapp.doctype.proforma_invoice.proforma_invoice.get_proforma_invoice_by_name",
    save: "rndopsapp.rndopsapp.doctype.proforma_invoice.proforma_invoice.save_proforma_invoice",
    submit: "rndopsapp.rndopsapp.doctype.proforma_invoice.proforma_invoice.submit_proforma_for_approval",
    action: "rndopsapp.rndopsapp.doctype.proforma_invoice.proforma_invoice.process_proforma_action",
};

interface ProformaBackendDoc {
    name: string;
    project_no: string;
    workflow_state: ProInvStatus;
    invoice_content: string;
    invoice_attachment: string | null;
    approver_name: string | null;
    approver_email: string | null;
    approver_date: string | null;
    approver_signature: string | null;
}

type ProInvStatus = "Draft" | "Pending HoS Approval" | "Approved";

// Extract a human-readable message from a Frappe SDK error.
const errText = (e: unknown): string => {
    if (typeof e === "string") return e;
    if (e && typeof e === "object") {
        const o = e as Record<string, unknown>;
        const m = o.message || o.exception || o._server_messages;
        if (typeof m === "string" && m) return m.replace(/<[^>]*>/g, "");
    }
    return "Please try again.";
};

// When true, the whole document is submitted/approved and the inline fields
// render read-only. Inline editors read this via context so call sites are
// untouched.
const LockContext = React.createContext(false);

// ── Inline Editable Input Elements ─────────────────────────────────────────
const InlineInput = ({
    value,
    onChange,
    placeholder,
    className = "",
    type = "text",
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
    type?: string;
}) => {
    const locked = React.useContext(LockContext);
    // Numeric fields (taxable value, tax amounts) render as type="number" —
    // browsers ignore maxLength on that input type, so only cap free text.
    const maxLength = type === "number" ? undefined : FIELD_CHAR_LIMITS.Data;
    return (
        <div className="w-full">
            <input
                type={type}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                readOnly={locked}
                maxLength={maxLength}
                className={`bg-transparent border-b outline-none transition-all px-1 py-0.5 rounded font-medium text-inherit w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${locked ? "border-transparent cursor-default text-zinc-700 dark:text-zinc-300" : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-[#D97757] focus:bg-zinc-50 dark:focus:bg-zinc-800/40"} ${className}`}
            />
            {!locked && <CharLimitAlert value={value} maxLength={maxLength} className="mt-0.5" />}
        </div>
    );
};

const InlineTextarea = ({
    value,
    onChange,
    placeholder,
    className = "",
}: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    className?: string;
}) => {
    const locked = React.useContext(LockContext);
    return (
    <div className="w-full">
        <textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            readOnly={locked}
            rows={3}
            maxLength={FIELD_CHAR_LIMITS.Text}
            className={`bg-transparent border-b outline-none transition-all px-1 py-0.5 rounded font-medium text-inherit resize-none w-full ${locked ? "border-transparent cursor-default text-zinc-700 dark:text-zinc-300" : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-[#D97757] focus:bg-zinc-50 dark:focus:bg-zinc-800/40"} ${className}`}
        />
        {!locked && <CharLimitAlert value={value} maxLength={FIELD_CHAR_LIMITS.Text} className="mt-0.5" />}
    </div>
    );
};

const InlineSelect = ({
    value,
    onChange,
    options,
    className = "",
}: {
    value: string;
    onChange: (val: string) => void;
    options: { value: string; label: string }[];
    className?: string;
}) => {
    const locked = React.useContext(LockContext);
    return (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={locked}
        className={`bg-transparent border-b outline-none transition-all px-1 py-0.5 rounded font-medium text-inherit ${locked ? "border-transparent cursor-default text-zinc-700 dark:text-zinc-300" : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-[#D97757] focus:bg-zinc-50 dark:focus:bg-zinc-800/40 cursor-pointer"} ${className}`}
    >
        {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                {opt.label}
            </option>
        ))}
    </select>
    );
};

export default function ProInvForm() {
    const { projectName, docname: routeDocname } = useParams<{ projectName: string; docname: string }>();
    const navigate = useNavigate();
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Review mode: opened from the HoS dashboard by the invoice's own name. The
    // structured editor is bypassed — the stored invoice HTML is rendered read-only
    // with Approve/Reject actions.
    const isReviewMode = !!routeDocname;

    // ── Fetch Project Data ───────────────────────────────────────────────────
    const { data: projectData, isLoading: isProjectLoading } = useFrappeGetDoc(
        "Project Registration", projectName ?? "", projectName ? undefined : null,
        { revalidateOnFocus: false, refreshInterval: 0 },
    );
    const { data: fundingAgencyResult } = useFrappeGetCall<{ message: Record<string, any> }>(
        "frappe.client.get_value",
        projectData?.funding_agen ? {
            doctype: "fundingagency_", filters: projectData.funding_agen,
            fieldname: JSON.stringify(["funding_agency_name","gstin_of_funding_agency","fundingagency_address","fundingagency_state","fundingagency_country","fundingagency_postalcode"]),
        } : undefined,
        projectData?.funding_agen ? `proinv-fa-${projectData.funding_agen}` : null,
        { revalidateOnFocus: false, refreshInterval: 0 },
    );
    const fa = fundingAgencyResult?.message;

    // States for inline editing of billing details
    const [clientNameState, setClientNameState] = useState("");
    const [clientAddressState, setClientAddressState] = useState("");
    const [clientGstinState, setClientGstinState] = useState("");

    // ── Approval workflow state (backed by the rndopsapp Proforma_Invoice doc) ──
    const [status, setStatus] = useState<ProInvStatus>("Draft");
    const [approverName, setApproverName] = useState("");
    const [approverDate, setApproverDate] = useState("");
    // The HoS signature image URL, stamped by the backend on approval (sourced
    // from the approver's User "Digital Signature"). Only set once approved.
    const [approverSignature, setApproverSignature] = useState<string | null>(null);
    const [docName, setDocName] = useState<string | null>(routeDocname ?? null);
    // Rendered invoice HTML stored on the backend — used to display a submitted /
    // approved invoice (and the whole review view) without the structured editor.
    const [reviewHtml, setReviewHtml] = useState<string>("");
    const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
    const [isBusy, setIsBusy] = useState(false);
    // Once the backend doc (or seed) has loaded, don't let the projectData/funding
    // -agency seed effects clobber the fields.
    const restoredRef = useRef(false);

    const { currentUser } = useFrappeAuth();
    const { roles } = useUserRoles(currentUser ?? null);
    const isHos = roles.includes(HOS_ROLE);

    // Stable project key used to key the backend Proforma record. project_no can be
    // blank on some Project Registrations, so fall back to the (unique) reg name.
    const projectKey = (projectData as { project_no?: string } | undefined)?.project_no || projectName || "";

    // ── Backend calls ────────────────────────────────────────────────────────
    const { call: callSave } = useFrappePostCall<{ message: ProformaBackendDoc }>(API.save);
    const { call: callSubmit } = useFrappePostCall<{ message: ProformaBackendDoc }>(API.submit);
    const { call: callAction } = useFrappePostCall<{ message: ProformaBackendDoc }>(API.action);

    const applyBackendDoc = React.useCallback((doc: ProformaBackendDoc | null) => {
        if (!doc) return;
        restoredRef.current = true;
        setDocName(doc.name);
        setStatus(doc.workflow_state || "Draft");
        setReviewHtml(doc.invoice_content || "");
        setAttachmentUrl(doc.invoice_attachment || null);
        setApproverName(doc.approver_name || "");
        setApproverDate(doc.approver_date ? String(doc.approver_date).slice(0, 10) : "");
        setApproverSignature(doc.approver_signature || null);
    }, []);

    // Review mode → load by the invoice's own name (HoS dashboard entry point).
    const { data: byNameResp, isLoading: byNameLoading } = useFrappeGetCall<{ message: ProformaBackendDoc | null }>(
        API.getByName, { docname: routeDocname }, isReviewMode ? `proinv-name-${routeDocname}` : null,
        { revalidateOnFocus: false },
    );
    const reviewLoading = isReviewMode && (byNameLoading || !reviewHtml);
    // Author mode → load any existing invoice for this project.
    const { data: byProjectResp } = useFrappeGetCall<{ message: ProformaBackendDoc | null }>(
        API.getByProject, { project_no: projectKey },
        !isReviewMode && projectKey ? `proinv-proj-${projectKey}` : null,
        { revalidateOnFocus: false },
    );
    useEffect(() => { applyBackendDoc(byNameResp?.message ?? null); }, [byNameResp, applyBackendDoc]);
    useEffect(() => { applyBackendDoc(byProjectResp?.message ?? null); }, [byProjectResp, applyBackendDoc]);

    // Submitted (Pending) or Approved → the document is locked for editing;
    // Approved → the signatory image is affixed.
    const locked = status !== "Draft";
    const isApproved = status === "Approved";

    // Render the stored invoice HTML (instead of the structured editor) when the
    // HoS opened it for review, or whenever a submitted/approved invoice is loaded
    // and we have its rendered content (the structured line-items aren't persisted).
    const showRenderedHtml = (isReviewMode || locked) && !!reviewHtml;

    // Initialize states from fetched data
    useEffect(() => {
        if (restoredRef.current) return;
        if (projectData) {
            const derivedName = fa?.funding_agency_name || projectData?.funding_agen || "";
            const derivedAddress = [
                fa?.fundingagency_address ?? projectData?.address_street_village_locality,
                fa?.fundingagency_state ?? projectData?.address_state,
                fa?.fundingagency_country ?? projectData?.address_country,
                fa?.fundingagency_postalcode ?? projectData?.address_postal_code
            ].filter(Boolean).join(", ");
            const derivedGstin = fa?.gstin_of_funding_agency || "";

            setClientNameState(derivedName);
            setClientAddressState(derivedAddress);
            setClientGstinState(derivedGstin);
        }
    }, [projectData, fa]);

    // GSTIN starts with 18 or empty → intra (CGST+SGST editable), else → inter (IGST editable)
    const isIntraState = clientGstinState.startsWith("18") || !clientGstinState;

    // ── Invoice State ────────────────────────────────────────────────────────
    const [invoiceNo, setInvoiceNo] = useState("IISI/0149/26-27");
    const [invoiceDate, setInvoiceDate] = useState(() => {
        const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    });
    const [clientRef, setClientRef] = useState("");
    const [reverseCharge, setReverseCharge] = useState("NIL");
    const [items, setItems] = useState<InvoiceItem[]>([
        { id: "1", description: "", sac: "998393", taxableValue: 0,
          cgstRate: "9%", cgstAmt: 0, sgstRate: "9%", sgstAmt: 0, igstRate: "", igstAmt: 0 },
    ]);
    const [itemsSeeded, setItemsSeeded] = useState(false);

    const calculateTaxAmount = (taxableValue: number, rateStr: string): number => {
        const rate = parseFloat(rateStr.replace("%", ""));
        if (isNaN(rate)) return 0;
        return Math.round(taxableValue * (rate / 100));
    };

    // Persistence is backend-driven (see the get/save/submit/action calls above);
    // an existing invoice is loaded via applyBackendDoc, which sets restoredRef so
    // the seed effect below won't overwrite loaded values.

    // Seed first item & synchronize taxes when projectData or isIntraState changes
    useEffect(() => {
        if (restoredRef.current) return;
        if (!projectData) return;

        setItems((prev) => {
            const updated = [...prev];
            // Seed first item description if not done
            if (!itemsSeeded && updated[0]) {
                updated[0] = {
                    ...updated[0],
                    description: projectData.project_title || projectName || "",
                };
                setItemsSeeded(true);
            }
            
            // Adjust tax rates/amounts for all items based on state
            return updated.map((item) => {
                const taxableVal = Number(item.taxableValue) || 0;
                if (isIntraState) {
                    const cgRate = item.cgstRate || "9%";
                    const sgRate = item.sgstRate || "9%";
                    return {
                        ...item,
                        cgstRate: cgRate,
                        cgstAmt: calculateTaxAmount(taxableVal, cgRate),
                        sgstRate: sgRate,
                        sgstAmt: calculateTaxAmount(taxableVal, sgRate),
                        igstRate: "",
                        igstAmt: 0,
                    };
                } else {
                    const igRate = item.igstRate || "18%";
                    return {
                        ...item,
                        cgstRate: "",
                        cgstAmt: 0,
                        sgstRate: "",
                        sgstAmt: 0,
                        igstRate: igRate,
                        igstAmt: calculateTaxAmount(taxableVal, igRate),
                    };
                }
            });
        });
    }, [projectData, isIntraState]);

    // ── Calculations ─────────────────────────────────────────────────────────
    const totals = useMemo(() => {
        let totalTaxable = 0, totalCgst = 0, totalSgst = 0, totalIgst = 0;
        items.forEach((item) => { 
            totalTaxable += Number(item.taxableValue)||0; 
            totalCgst += Number(item.cgstAmt)||0; 
            totalSgst += Number(item.sgstAmt)||0; 
            totalIgst += Number(item.igstAmt)||0; 
        });
        const grandTotal = totalTaxable + totalCgst + totalSgst + totalIgst;
        let totalInWords = ""; 
        try { 
            const words = toWords.convert(Math.round(grandTotal)); 
            totalInWords = words.charAt(0).toUpperCase() + words.slice(1).toLowerCase().replace(/only$/, "only.");
        } catch { 
            totalInWords = "Zero rupees only."; 
        }
        return { totalTaxable, totalCgst, totalSgst, totalIgst, grandTotal, totalInWords };
    }, [items]);

    const handleAddItem = () => { 
        setItems([
            ...items, 
            { 
                id: Date.now().toString(),
                description: projectData?.project_title || "",
                sac: "998393",
                taxableValue: 0,
                cgstRate: isIntraState ? "9%" : "", 
                cgstAmt: 0, 
                sgstRate: isIntraState ? "9%" : "", 
                sgstAmt: 0, 
                igstRate: !isIntraState ? "18%" : "", 
                igstAmt: 0 
            }
        ]); 
    };

    const handleRemoveItem = (id: string) => { 
        if (items.length === 1) return; 
        setItems(items.filter((i) => i.id !== id)); 
    };

    const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => { 
        setItems(items.map((item) => {
            if (item.id !== id) return item;
            const updated = { ...item, [field]: value };
            
            // Auto-calculate tax amounts if taxableValue or rates change
            if (field === "taxableValue" || field === "cgstRate" || field === "sgstRate" || field === "igstRate") {
                const taxableVal = Number(updated.taxableValue) || 0;
                if (isIntraState) {
                    if (field === "taxableValue" || field === "cgstRate") {
                        updated.cgstAmt = calculateTaxAmount(taxableVal, updated.cgstRate);
                    }
                    if (field === "taxableValue" || field === "sgstRate") {
                        updated.sgstAmt = calculateTaxAmount(taxableVal, updated.sgstRate);
                    }
                    // Clear IGST
                    updated.igstRate = "";
                    updated.igstAmt = 0;
                } else {
                    if (field === "taxableValue" || field === "igstRate") {
                        updated.igstAmt = calculateTaxAmount(taxableVal, updated.igstRate);
                    }
                    // Clear CGST/SGST
                    updated.cgstRate = "";
                    updated.cgstAmt = 0;
                    updated.sgstRate = "";
                    updated.sgstAmt = 0;
                }
            }
            return updated;
        }));
    };

    // ── Approval workflow actions (backed by rndopsapp Proforma_Invoice APIs) ──

    // Save Draft — persist the rendered invoice HTML to a Draft backend record.
    const handleSaveDraft = async () => {
        if (isBusy) return;
        setIsBusy(true);
        try {
            const res = await callSave({
                project_no: projectKey,
                invoice_content: generateHtml(),
                docname: docName || undefined,
            });
            applyBackendDoc(res?.message ?? null);
            alert("Proforma Invoice draft saved.");
        } catch (e) {
            alert(`Could not save draft: ${errText(e)}`);
        } finally {
            setIsBusy(false);
        }
    };

    // Submit for HoS Approval — moves the invoice to "Pending HoS Approval",
    // generates the unsigned PDF, and raises a ToDo for the HoS role (backend),
    // which is what makes it surface in the HoS dashboard. An optional comment is
    // recorded on the document timeline.
    const handleSubmitForApproval = async (comment = "") => {
        if (isBusy) return;
        setIsBusy(true);
        try {
            const res = await callSubmit({
                docname: docName || undefined,
                project_no: projectKey,
                invoice_content: generateHtml(),
                comment,
            });
            applyBackendDoc(res?.message ?? null);
            alert("Submitted to the Head of Section. The signature will appear once the HoS approves.");
        } catch (e) {
            alert(`Could not submit: ${errText(e)}`);
        } finally {
            setIsBusy(false);
        }
    };

    // HoS Approve / Reject via the backend workflow action, with an optional note.
    const runHosAction = async (action: "Approve" | "Reject", comment = "") => {
        if (isBusy || !docName) return;
        setIsBusy(true);
        try {
            const res = await callAction({ docname: docName, action, comment });
            applyBackendDoc(res?.message ?? null);
            alert(action === "Approve"
                ? "Proforma Invoice approved. The signed invoice is now finalized."
                : "Proforma Invoice sent back to Draft for correction.");
        } catch (e) {
            alert(`Action failed: ${errText(e)}`);
        } finally {
            setIsBusy(false);
        }
    };

    // ── Comment modal ────────────────────────────────────────────────────────
    // Submit / Approve / Reject open a modal to capture an optional note, which is
    // then passed to the backend and recorded on the document timeline.
    const [commentModal, setCommentModal] = useState<null | { action: "Submit" | "Approve" | "Reject" }>(null);
    const [commentText, setCommentText] = useState("");

    const openCommentModal = (action: "Submit" | "Approve" | "Reject") => {
        if (isBusy) return;
        if (action === "Submit") {
            if (!clientNameState.trim()) {
                alert("Please fill in the client billing details before submitting.");
                return;
            }
            if (totals.grandTotal <= 0) {
                alert("Add at least one item with a taxable value before submitting.");
                return;
            }
        }
        setCommentText("");
        setCommentModal({ action });
    };

    const confirmCommentAction = async () => {
        const action = commentModal?.action;
        const comment = commentText.trim();
        setCommentModal(null);
        if (action === "Submit") await handleSubmitForApproval(comment);
        else if (action) await runHosAction(action, comment);
    };

    // Format an ISO date (YYYY-MM-DD) as DD.MM.YYYY for display.
    const formatDisplayDate = (iso: string) => {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
    };

    // Signature block that replaces SIGNATURE_SLOT at display/print time: the HoS
    // signature image + approver line once approved, otherwise a "pending" note.
    const signatureBlockHtml = () => {
        if (isApproved && approverSignature) {
            const src = getFileUrl(approverSignature);
            return `<img src="${src}" class="signature-img" alt="Authorised Signatory" />`
                + `<div style="margin-top:4px;font-weight:normal;color:#374151;font-size:10px;">Approved by ${approverName || "Head of Section"}${approverDate ? ` on ${formatDisplayDate(approverDate)}` : ""}</div>`;
        }
        return `<div style="height: 50px; display: flex; align-items: flex-end; font-style: italic; color: #6b7280; font-size: 10px;">(Signature to be affixed after approval by the Head of Section, R&amp;D)</div>`;
    };

    // Swap the signature slot in any stored/generated invoice HTML before it is
    // shown in the preview iframe or printed client-side.
    const renderStored = (html: string) => html.split(SIGNATURE_SLOT).join(signatureBlockHtml());

    // ── Print & PDF HTML template ─────────────────────────────────────────────
    const generateHtml = () => {
        const d = new Date(invoiceDate);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        const formattedDate = `${day}.${month}.${year}`;

        const itemRowsHtml = items
            .map((item, index) => {
                const taxVal = Number(item.taxableValue) || 0;
                return `
                <tr>
                    <td style="text-align: center; border: 1px solid #000; padding: 6px; font-size: 10px; vertical-align: top;">${String(index + 1).padStart(2, "0")}</td>
                    <td style="border: 1px solid #000; padding: 6px; font-size: 10px; vertical-align: top; white-space: pre-wrap;">${item.description}</td>
                    <td style="text-align: center; border: 1px solid #000; padding: 6px; font-size: 10px; vertical-align: top;">${item.sac}</td>
                    <td style="text-align: right; border: 1px solid #000; padding: 6px; font-size: 10px; vertical-align: top;">${taxVal.toLocaleString("en-IN")}</td>
                    
                    <td style="text-align: center; border: 1px solid #000; padding: 6px; font-size: 10px; vertical-align: top;">${item.cgstRate || ""}</td>
                    <td style="text-align: right; border: 1px solid #000; padding: 6px; font-size: 10px; vertical-align: top;">${item.cgstAmt ? Math.round(item.cgstAmt).toLocaleString("en-IN") : ""}</td>
                    
                    <td style="text-align: center; border: 1px solid #000; padding: 6px; font-size: 10px; vertical-align: top;">${item.sgstRate || ""}</td>
                    <td style="text-align: right; border: 1px solid #000; padding: 6px; font-size: 10px; vertical-align: top;">${item.sgstAmt ? Math.round(item.sgstAmt).toLocaleString("en-IN") : ""}</td>
                    
                    <td style="text-align: center; border: 1px solid #000; padding: 6px; font-size: 10px; vertical-align: top;">${item.igstRate || ""}</td>
                    <td style="text-align: right; border: 1px solid #000; padding: 6px; font-size: 10px; vertical-align: top;">${item.igstAmt ? Math.round(item.igstAmt).toLocaleString("en-IN") : ""}</td>
                </tr>
            `;
            })
            .join("");

        return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Proforma Invoice</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    color: #000;
                    background-color: #fff;
                    /* Keep the coloured logo and yellow badge when printing from the
                       browser dialog (backgrounds/colours are dropped by default). */
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .invoice-container {
                    padding: 40px;
                    max-width: 800px;
                    margin: auto;
                    box-sizing: border-box;
                }
                .header-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 25px;
                    position: relative;
                }
                .header-left {
                    flex: 1;
                }
                .header-logo {
                    height: 65px;
                    width: 65px;
                    margin-bottom: 8px;
                    display: block;
                }
                .inst-hindi {
                    font-weight: bold;
                    font-size: 13px;
                    color: #000;
                    margin-top: 5px;
                }
                .inst-english {
                    font-weight: bold;
                    font-size: 13px;
                    color: #000;
                }
                .header-meta {
                    font-size: 11px;
                    color: #000;
                    margin-top: 5px;
                }
                .underline-text {
                    text-decoration: underline;
                    font-weight: bold;
                }
                .bold-text {
                    font-weight: bold;
                }
                .header-right {
                    text-align: right;
                    margin-right: 15px;
                    margin-top: 15px;
                    font-size: 11px;
                    line-height: 1.4;
                    color: #000;
                }
                .office-badge {
                    background-color: #fcc21b;
                    width: 35px;
                    height: 130px;
                    position: relative;
                    border-radius: 2px;
                    box-sizing: border-box;
                }
                /* Rotate the text instead of using writing-mode: neither wkhtmltopdf
                   (backend PDF) nor html2canvas (client PDF) support writing-mode, so
                   the badge would print horizontally. A CSS transform works in both. */
                .office-badge-text {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    -webkit-transform: translate(-50%, -50%) rotate(90deg);
                    transform: translate(-50%, -50%) rotate(90deg);
                    white-space: nowrap;
                    font-weight: bold;
                    font-size: 14px;
                    color: #000;
                    letter-spacing: 0.5px;
                }
                .title-block {
                    text-align: center;
                    font-weight: bold;
                    text-decoration: underline;
                    font-size: 16px;
                    margin-top: 20px;
                    margin-bottom: 25px;
                    color: #000;
                }
                .billing-date-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    font-size: 11px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #000;
                }
                .details-row {
                    display: flex;
                    justify-content: space-between;
                    font-size: 11px;
                    margin-bottom: 20px;
                    color: #000;
                }
                .details-left {
                    flex: 1;
                }
                .details-right {
                    width: 250px;
                    text-align: left;
                    padding-top: 2px;
                }
                .item-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                    margin-bottom: 20px;
                    border: 1px solid #000;
                    font-size: 11px;
                }
                .item-table th {
                    border: 1px solid #000;
                    padding: 6px;
                    font-weight: bold;
                    background-color: #fff;
                }
                .item-table td {
                    border: 1px solid #000;
                    padding: 6px;
                }
                .totals-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 15px;
                    margin-bottom: 25px;
                    font-size: 11px;
                    font-weight: bold;
                    line-height: 1.6;
                }
                .totals-table td {
                    padding: 2px 6px;
                }
                .signatory-block {
                    margin-top: 30px;
                    margin-bottom: 25px;
                    text-align: left;
                    color: #1f4096;
                    font-size: 11px;
                    line-height: 1.4;
                }
                .signature-img {
                    height: 50px;
                    object-fit: contain;
                    display: block;
                    margin-bottom: 4px;
                }
                .payment-section {
                    font-size: 10px;
                    line-height: 1.5;
                    color: #000;
                    border-top: 1px solid #ccc;
                    padding-top: 12px;
                    margin-top: 25px;
                }
                .bullet-row {
                    margin-top: 8px;
                    display: flex;
                    align-items: flex-start;
                }
                .bullet-dot {
                    font-size: 12px;
                    margin-right: 5px;
                    line-height: 1;
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <!-- Title -->
                <div class="title-block">PROFORMA INVOICE</div>

                <!-- Header -->
                <div class="header-container">
                    <div class="header-left">
                        <img src="${ENDORSEMENT_LOGO_URL}" class="header-logo" alt="IITG Logo" />
                        <div class="inst-hindi">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
                        <div class="inst-english">Indian Institute of Technology Guwahati</div>
                        <div class="header-meta">
                            GSTIN: <span class="underline-text">18AAAJI0130P1Z8</span>
                        </div>
                        <div class="header-meta">
                            PAN: <span class="bold-text">AAAJI0130P</span>
                        </div>
                    </div>
                    
                    <div class="header-right">
                        <div class="bold-text">गुवाहाटी-781039, भारत</div>
                        <div class="bold-text">Guwahati-781039, India</div>
                        <div style="margin-top: 5px;">E-mail: hosiisi@iitg.ac.in</div>
                        <div>Phone: +91-361-258 2948</div>
                    </div>

                    <div class="office-badge">
                        <div class="office-badge-text">Office of R&D</div>
                    </div>
                </div>

                <!-- Billing details header line -->
                <div class="billing-date-row">
                    <div>Billing details</div>
                    <div>Date: ${formattedDate}</div>
                </div>

                <!-- Details row -->
                <div class="details-row">
                    <div class="details-left">
                        <div style="font-weight: bold; margin-bottom: 3px;">To</div>
                        <div style="font-weight: bold;">${clientNameState}</div>
                        <div style="line-height: 1.4; color: #374151; white-space: pre-wrap; margin-top: 2px;">${clientAddressState}</div>
                        ${clientGstinState ? `<div style="margin-top: 10px; font-weight: bold;">GSTIN: ${clientGstinState}</div>` : ""}
                    </div>
                    <div class="details-right">
                        <div style="margin-top: 15px;">
                            <span style="font-weight: bold;">Proforma Invoice No.:</span> ${invoiceNo}
                        </div>
                        <div style="margin-top: 4px;">
                            <span style="font-weight: bold;">Your Ref. No.:</span> ${clientRef || ""}
                        </div>
                    </div>
                </div>

                <!-- Items Table -->
                <table class="item-table">
                    <thead>
                        <tr>
                            <th rowspan="2" style="width: 4%;">Sl<br/>no.</th>
                            <th rowspan="2" style="text-align: left; width: 22%;">Item Description</th>
                            <th rowspan="2" style="text-align: center; width: 8%;">SAC</th>
                            <th rowspan="2" style="text-align: right; width: 18%;">Taxable Value</th>
                            <th colspan="2" style="text-align: center; width: 16%;">CGST</th>
                            <th colspan="2" style="text-align: center; width: 16%;">SGST</th>
                            <th colspan="2" style="text-align: center; width: 16%;">IGST</th>
                        </tr>
                        <tr>
                            <th style="text-align: center; font-size: 10px; font-weight: bold; width: 5%;">Rate</th>
                            <th style="text-align: right; font-size: 10px; font-weight: bold; width: 11%;">Amnt.</th>
                            <th style="text-align: center; font-size: 10px; font-weight: bold; width: 5%;">Rate</th>
                            <th style="text-align: right; font-size: 10px; font-weight: bold; width: 11%;">Amnt.</th>
                            <th style="text-align: center; font-size: 10px; font-weight: bold; width: 5%;">Rate</th>
                            <th style="text-align: right; font-size: 10px; font-weight: bold; width: 11%;">Amnt.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRowsHtml}
                        <!-- TOTAL Row -->
                        <tr style="font-weight: bold;">
                            <td colspan="3" style="text-align: right; font-weight: bold;">TOTAL</td>
                            <td style="text-align: right;">${totals.totalTaxable.toLocaleString("en-IN")}</td>
                            
                            <td style="text-align: center; font-size: 10px;">${isIntraState ? (items[0]?.cgstRate || "") : ""}</td>
                            <td style="text-align: right;">${isIntraState && totals.totalCgst > 0 ? totals.totalCgst.toLocaleString("en-IN") : ""}</td>
                            
                            <td style="text-align: center; font-size: 10px;">${isIntraState ? (items[0]?.sgstRate || "") : ""}</td>
                            <td style="text-align: right;">${isIntraState && totals.totalSgst > 0 ? totals.totalSgst.toLocaleString("en-IN") : ""}</td>
                            
                            <td style="text-align: center; font-size: 10px;">${!isIntraState ? (items[0]?.igstRate || "") : ""}</td>
                            <td style="text-align: right;">${!isIntraState && totals.totalIgst > 0 ? totals.totalIgst.toLocaleString("en-IN") : ""}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- Summary Totals -->
                <table class="totals-table">
                    <tr>
                        <td style="width: 50%; text-align: right; color: #374151;">Total Invoice Value (In figure):</td>
                        <td style="width: 50%; text-align: left; padding-left: 15px;">Rs. ${totals.grandTotal.toLocaleString("en-IN")}/-</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; text-align: right; color: #374151;">Total Invoice Value (In words):</td>
                        <td style="width: 50%; text-align: left; padding-left: 15px; font-weight: normal;">${totals.totalInWords}</td>
                    </tr>
                    <tr>
                        <td style="width: 50%; text-align: right; color: #374151;">Amount of Tax subject to Reverse Charge:</td>
                        <td style="width: 50%; text-align: left; padding-left: 15px;">${reverseCharge}</td>
                    </tr>
                </table>

                <!-- Signatory Section — SIGNATURE_SLOT is swapped for the HoS
                     signature only after approval (backend print format & renderStored) -->
                <div class="signatory-block">
                    ${SIGNATURE_SLOT}
                    <div style="text-decoration: underline; font-weight: bold; font-size: 11px; margin-bottom: 8px; margin-top: 8px;">Authorised Signatory</div>
                    <div style="font-weight: bold; font-size: 12px; margin-top: 15px;">Head of Section</div>
                    <div style="font-weight: bold;">Research and Development Section</div>
                    <div style="font-weight: bold;">Indian Institute of Technology Guwahati</div>
                </div>

                <!-- Payment Details -->
                <div class="payment-section">
                    <div>Payments are to be made by either by ECS (details below) or Cheque/DD in favour of "IIT Guwahati II&SI A/c" payable at Guwahati.</div>
                    <div class="bullet-row">
                        <span class="bullet-dot">•</span>
                        <div>
                            <strong>A/c Name:</strong> IIT Guwahati II and SI A/c, 
                            <strong>A/c No.:</strong> 8652101030326, 
                            <strong>Bank:</strong> Canara Bank, IIT Guwahati Branch Guwahati-781039, 
                            <strong>IFSC:</strong> CNRB0008652 
                            <strong>MICR Code:</strong> 781015008, 
                            <strong>Swift Code:</strong> CNRBINBBBFD
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    };

    const handlePrint = () => {
        // In review mode the structured editor isn't populated — print the stored HTML.
        // renderStored swaps the signature slot so an approved print shows the signature.
        const htmlContent = renderStored(showRenderedHtml && reviewHtml ? reviewHtml : generateHtml());
        const iframe = iframeRef.current;
        if (!iframe) return;

        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc) return;

        doc.open();
        doc.write(htmlContent);
        doc.close();

        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        }, 300);
    };

    const handleDownloadPdf = async () => {
        // Once submitted/approved the backend holds the authoritative (and, when
        // approved, signed) PDF — open that instead of re-rendering client-side.
        if (attachmentUrl) {
            window.open(attachmentUrl, "_blank");
            return;
        }
        const htmlContent = renderStored(generateHtml());
        const iframe = document.createElement("iframe");
        iframe.style.cssText =
            "position:fixed;left:-99999px;top:0;width:800px;height:1100px;border:0;visibility:hidden;";
        document.body.appendChild(iframe);
        const iDoc = iframe.contentDocument!;
        iDoc.open();
        iDoc.write(htmlContent);
        iDoc.close();

        await new Promise((r) => setTimeout(r, 800));

        try {
            const page = iDoc.querySelector(".invoice-container") as HTMLElement || iDoc.body;
            const canvas = await html2canvas(page, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                logging: false,
                windowWidth: 800,
            });
            document.body.removeChild(iframe);

            const pdf = new jsPDF("p", "mm", "a4");
            const imgData = canvas.toDataURL("image/png");
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const margin = 10;
            const contentWidth = pdfWidth - 2 * margin;
            const contentHeight = (canvas.height * contentWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", margin, margin, contentWidth, contentHeight);
            pdf.save(`Proforma-Invoice-${invoiceNo.replace(/\//g, "-")}.pdf`);
        } catch (err) {
            alert("Could not generate PDF. Please try again.");
            if (document.body.contains(iframe)) {
                document.body.removeChild(iframe);
            }
        }
    };

    // Small pill reflecting the current workflow status.
    const StatusBadge = () => {
        if (status === "Approved") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" /> Approved by HoS
                </span>
            );
        }
        if (status === "Pending HoS Approval") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-[10px] font-bold">
                    <Clock className="w-3 h-3" /> Pending HoS Approval
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-bold">
                Draft
            </span>
        );
    };

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen font-sans overflow-x-hidden flex">
          

            {/* Hidden IFrame for printing */}
            <iframe ref={iframeRef} style={{ display: "none" }} title="Print Handler" />

            {/* Right-side activity log (comments/workflow timeline), like other modules */}
            {docName && <FloatingActivityLogButton doctype="Proforma_Invoice" docname={docName} />}

            {/* Comment modal — captures an optional note on Submit / Approve / Reject */}
            {commentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-md">
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                            {commentModal.action === "Submit" ? "Submit for HoS Approval"
                                : commentModal.action === "Approve" ? "Approve Proforma Invoice"
                                : "Reject Proforma Invoice"}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                            Add a comment (optional). It will be recorded on the document timeline.
                        </p>
                        <textarea
                            className="w-full border border-zinc-300 dark:border-zinc-700 p-3 rounded-lg text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-[rgba(217,119,87,0.25)] focus:border-[#D97757] dark:bg-zinc-800 dark:text-zinc-100"
                            rows={4}
                            autoFocus
                            placeholder="Add a comment..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setCommentModal(null)}
                                disabled={isBusy}
                                className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmCommentAction}
                                disabled={isBusy}
                                className={`px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-50 ${commentModal.action === "Reject" ? "bg-red-600 hover:bg-red-700" : commentModal.action === "Approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600"}`}
                            >
                                {isBusy ? "Processing..." : `Confirm ${commentModal.action}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-grow flex flex-col min-w-0">
                {/* Header Action Bar */}
                <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-10 shadow-sm select-none">
                    <div className="space-y-0.5">
                        <button
                            onClick={() => navigate(-1)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#71717A] dark:text-[#A1A1AA] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]"
                        >
                            <ArrowLeft className="w-3.5 h-3.5" /> Back to Project
                        </button>
                        <h1 className="text-base font-extrabold tracking-tight text-zinc-950 dark:text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#D97757]" /> {isReviewMode ? "Proforma Invoice — Review" : "Proforma Invoice Editor"}
                        </h1>
                        <p className="text-[11px] text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-2 flex-wrap">
                            <span>{isReviewMode ? "Invoice" : "Project"}: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{projectName || docName || "Proforma Invoice"}</span></span>
                            <StatusBadge />
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Draft: edit, save, and submit to the HoS (author only) */}
                        {status === "Draft" && !isReviewMode && (
                            <>
                                <button
                                    onClick={handleSaveDraft}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
                                >
                                    <Save className="w-3.5 h-3.5 text-emerald-600" /> Save Draft
                                </button>
                                <button
                                    onClick={() => openCommentModal("Submit")}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
                                >
                                    <Send className="w-3.5 h-3.5" /> Submit for HoS Approval
                                </button>
                            </>
                        )}

                        {/* Pending: only the HoS can act; others just see the wait state */}
                        {status === "Pending HoS Approval" && (
                            isHos ? (
                                <>
                                    <button
                                        onClick={() => openCommentModal("Approve")}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                    </button>
                                    <button
                                        onClick={() => openCommentModal("Reject")}
                                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors shadow-sm"
                                    >
                                        <XCircle className="w-3.5 h-3.5" /> Reject
                                    </button>
                                </>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                                    <Lock className="w-3.5 h-3.5" /> Locked — awaiting Head of Section approval
                                </span>
                            )
                        )}

                        <button
                            onClick={handlePrint}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-sm"
                        >
                            <Printer className="w-3.5 h-3.5 text-sky-600" /> Print
                        </button>
                        <button
                            onClick={handleDownloadPdf}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D97757] hover:bg-[#c66a4e] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" /> Download PDF{isApproved ? " (Signed)" : ""}
                        </button>
                    </div>
                </div>

                {/* Single Page A4 Document Editor */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center gap-3 bg-[#F4F4F5] dark:bg-[#18181B]">
                    {locked && (
                        <div className="w-full max-w-[850px] flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 px-4 py-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            {isApproved
                                ? `Approved by the Head of Section${approverName ? ` (${approverName})` : ""}. The invoice is finalized and the signature is affixed.`
                                : "Submitted for HoS approval — editing is locked. The signature will be affixed once the Head of Section approves."}
                        </div>
                    )}
                    <LockContext.Provider value={locked}>
                    {reviewLoading ? (
                    <div className="w-full max-w-[850px] bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 rounded-xl min-h-[1100px] flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-[#D97757]" />
                    </div>
                    ) : showRenderedHtml ? (
                    <div className="w-full max-w-[850px] bg-white shadow-xl border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                        <iframe
                            title="Proforma Invoice"
                            srcDoc={renderStored(reviewHtml)}
                            className="w-full min-h-[1100px] border-0 bg-white"
                        />
                    </div>
                    ) : (
                    <div className="w-full max-w-[850px] bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 md:p-12 text-zinc-900 dark:text-zinc-100 min-h-[1100px] flex flex-col justify-between select-text">

                        <div className="space-y-6">
                            {/* Document Title at the very top */}
                            <div className="text-center font-bold text-base md:text-lg tracking-wider text-zinc-950 dark:text-zinc-50 underline mb-4">
                                PROFORMA INVOICE
                            </div>

                            {/* Document Header */}
                            <div className="flex justify-between items-start pb-5 relative border-b border-zinc-100 dark:border-zinc-800">
                                <div className="flex-1 space-y-1">
                                    {/* Top-left logo — the coloured emblem used on the Endorsement Certificate */}
                                    <img src={ENDORSEMENT_LOGO_URL} alt="IITG Logo" className="h-16 w-16 mb-2 object-contain" />

                                    <div className="text-sm md:text-base font-bold text-zinc-950 dark:text-zinc-50">
                                        भारतीय प्रौद्योगिकी संस्थान गुवाहाटी
                                    </div>
                                    <div className="text-xs md:text-sm font-bold text-zinc-950 dark:text-zinc-50">
                                        Indian Institute of Technology Guwahati
                                    </div>
                                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 pt-1">
                                        GSTIN: <span className="underline font-bold text-zinc-950 dark:text-zinc-50">18AAAJI0130P1Z8</span>
                                    </div>
                                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                                        PAN: <span className="font-bold text-zinc-950 dark:text-zinc-50">AAAJI0130P</span>
                                    </div>
                                </div>
                                
                                {/* Right Address info */}
                                <div className="text-right mr-4 mt-16 text-[11px] leading-relaxed text-zinc-950 dark:text-zinc-50">
                                    <div className="font-bold">गुवाहाटी-781039, भारत</div>
                                    <div className="font-bold">Guwahati-781039, India</div>
                                    <div className="mt-1">E-mail: hosiisi@iitg.ac.in</div>
                                    <div>Phone: +91-361-258 2948</div>
                                </div>

                                {/* Office of R&D vertical banner */}
                                <div className="bg-[#fcc21b] w-8 h-32 flex items-center justify-center rounded-sm shrink-0 shadow-sm border border-yellow-400 select-none">
                                    <span style={{ writingMode: "vertical-rl", textOrientation: "mixed" }} className="font-bold text-xs text-zinc-950 tracking-wider">
                                        Office of R&D
                                    </span>
                                </div>
                            </div>

                            {/* Billing Details header line */}
                            <div className="flex justify-between items-center pt-2">
                                <div className="font-extrabold text-zinc-950 dark:text-zinc-50 text-[13px]">Billing details</div>
                                <div className="flex items-center gap-1.5 text-xs text-zinc-950 dark:text-zinc-50 font-bold">
                                    <span>Date:</span>
                                    <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} readOnly={locked}
                                        className={`bg-transparent border-b border-transparent outline-none transition-all px-1 py-0.5 rounded font-bold text-xs w-[120px] ${locked ? "cursor-default" : "hover:border-zinc-300 focus:border-[#D97757]"}`} />
                                </div>
                            </div>

                            {/* Billing & Invoice Info Section */}
                            <div className="grid grid-cols-2 gap-x-12 text-xs">
                                {/* Left Column: Billing To */}
                                <div className="space-y-1">
                                    <div className="font-bold text-zinc-950 dark:text-zinc-50">To</div>
                                    <div className="font-bold text-zinc-950 dark:text-zinc-50">
                                        <InlineInput value={clientNameState} onChange={setClientNameState} placeholder="Client Name" className="font-bold" />
                                    </div>
                                    <div className="text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap leading-relaxed">
                                        <InlineTextarea value={clientAddressState} onChange={setClientAddressState} placeholder="Client Address" />
                                    </div>
                                    <div className="pt-2 font-bold text-zinc-950 dark:text-zinc-50 flex items-center gap-2">
                                        <span>GSTIN:</span>
                                        <InlineInput value={clientGstinState} onChange={setClientGstinState} placeholder="GSTIN" className="font-bold text-xs" />
                                    </div>
                                </div>
                                {/* Right Column: Invoice Info */}
                                <div className="space-y-3 pt-4">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-zinc-950 dark:text-zinc-50 w-[140px] shrink-0">Proforma Invoice No.:</span>
                                        <InlineInput value={invoiceNo} onChange={setInvoiceNo} placeholder="Invoice Number" className="font-bold text-xs" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-zinc-950 dark:text-zinc-50 w-[140px] shrink-0">Your Ref. No.:</span>
                                        <InlineInput value={clientRef} onChange={setClientRef} placeholder="Your Reference" className="text-xs" />
                                    </div>
                                </div>
                            </div>

                            {/* Table */}
                            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                                <table className="w-full table-fixed text-left border-collapse text-[11px]">
                                    <thead>
                                        <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200">
                                            <th rowSpan={2} className="px-2 py-2 text-center font-bold border-r border-b border-zinc-200 dark:border-zinc-800 w-[4%]">Sl no.</th>
                                            <th rowSpan={2} className="px-2 py-2 font-bold border-r border-b border-zinc-200 dark:border-zinc-800 w-[22%]">Item Description</th>
                                            <th rowSpan={2} className="px-2 py-2 text-center font-bold border-r border-b border-zinc-200 dark:border-zinc-800 w-[10%]">SAC</th>
                                            <th rowSpan={2} className="px-2 py-2 text-right font-bold border-r border-b border-zinc-200 dark:border-zinc-800 w-[16%]">Taxable Value</th>
                                            <th colSpan={2} className="px-2 py-1 text-center font-bold border-r border-b border-zinc-200 dark:border-zinc-800 w-[16%]">CGST</th>
                                            <th colSpan={2} className="px-2 py-1 text-center font-bold border-r border-b border-zinc-200 dark:border-zinc-800 w-[16%]">SGST</th>
                                            <th colSpan={2} className="px-2 py-1 text-center border-b border-zinc-200 dark:border-zinc-800 w-[16%]">IGST</th>
                                        </tr>
                                        <tr className="bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                                            <th className="px-1 py-1 text-center font-semibold border-r border-zinc-200 dark:border-zinc-800 text-[10px] w-[5%]">Rate</th>
                                            <th className="px-1 py-1 text-right font-semibold border-r border-zinc-200 dark:border-zinc-800 text-[10px] w-[11%]">Amnt.</th>
                                            <th className="px-1 py-1 text-center font-semibold border-r border-zinc-200 dark:border-zinc-800 text-[10px] w-[5%]">Rate</th>
                                            <th className="px-1 py-1 text-right font-semibold border-r border-zinc-200 dark:border-zinc-800 text-[10px] w-[11%]">Amnt.</th>
                                            <th className="px-1 py-1 text-center font-semibold border-r border-zinc-200 dark:border-zinc-800 text-[10px] w-[5%]">Rate</th>
                                            <th className="px-1 py-1 text-right font-semibold text-[10px] w-[11%]">Amnt.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => {
                                            const taxVal = Number(item.taxableValue) || 0;
                                            return (
                                                <tr key={item.id} className="border-b border-zinc-200 dark:border-zinc-800 last:border-b-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10">
                                                    <td className="px-2 py-2 text-center border-r border-zinc-200 dark:border-zinc-800 text-zinc-500 font-mono align-top">
                                                        {String(index + 1).padStart(2, "0")}
                                                    </td>
                                                    <td className="px-2 py-2 border-r border-zinc-200 dark:border-zinc-800 align-top">
                                                        <InlineTextarea value={item.description} onChange={(val) => handleUpdateItem(item.id, "description", val)} placeholder="Item description" className="text-[11px]" />
                                                    </td>
                                                    <td className="px-2 py-2 text-center border-r border-zinc-200 dark:border-zinc-800 align-top">
                                                        <InlineInput value={item.sac} onChange={(val) => handleUpdateItem(item.id, "sac", val)} placeholder="SAC" className="text-center text-[11px]" />
                                                    </td>
                                                    <td className="px-2 py-2 text-right border-r border-zinc-200 dark:border-zinc-800 align-top">
                                                        <InlineInput type="number" value={String(item.taxableValue)} onChange={(val) => handleUpdateItem(item.id, "taxableValue", parseFloat(val) || 0)} placeholder="0" className="text-right font-bold text-[11px]" />
                                                    </td>
                                                    
                                                    {/* CGST Rate & Amount */}
                                                    <td className="px-1 py-2 text-center border-r border-zinc-200 dark:border-zinc-800 align-top">
                                                        {isIntraState ? (
                                                            <InlineInput value={item.cgstRate} onChange={(val) => handleUpdateItem(item.id, "cgstRate", val)} placeholder="0%" className="text-center text-[11px]" />
                                                        ) : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                                                    </td>
                                                    <td className="px-1 py-2 text-right border-r border-zinc-200 dark:border-zinc-800 align-top">
                                                        {isIntraState ? (
                                                            <InlineInput type="number" value={String(item.cgstAmt)} onChange={(val) => handleUpdateItem(item.id, "cgstAmt", parseFloat(val) || 0)} placeholder="0" className="text-right text-[11px]" />
                                                        ) : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                                                    </td>
                                                    
                                                    {/* SGST Rate & Amount */}
                                                    <td className="px-1 py-2 text-center border-r border-zinc-200 dark:border-zinc-800 align-top">
                                                        {isIntraState ? (
                                                            <InlineInput value={item.sgstRate} onChange={(val) => handleUpdateItem(item.id, "sgstRate", val)} placeholder="0%" className="text-center text-[11px]" />
                                                        ) : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                                                    </td>
                                                    <td className="px-1 py-2 text-right border-r border-zinc-200 dark:border-zinc-800 align-top">
                                                        {isIntraState ? (
                                                            <InlineInput type="number" value={String(item.sgstAmt)} onChange={(val) => handleUpdateItem(item.id, "sgstAmt", parseFloat(val) || 0)} placeholder="0" className="text-right text-[11px]" />
                                                        ) : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                                                    </td>
                                                    
                                                    {/* IGST Rate & Amount */}
                                                    <td className="px-1 py-2 text-center border-r border-zinc-200 dark:border-zinc-800 align-top">
                                                        {!isIntraState ? (
                                                            <InlineInput value={item.igstRate} onChange={(val) => handleUpdateItem(item.id, "igstRate", val)} placeholder="0%" className="text-center text-[11px]" />
                                                        ) : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                                                    </td>
                                                    <td className="px-1 py-2 text-right border-r border-zinc-200 dark:border-zinc-800 align-top">
                                                        {!isIntraState ? (
                                                            <InlineInput type="number" value={String(item.igstAmt)} onChange={(val) => handleUpdateItem(item.id, "igstAmt", parseFloat(val) || 0)} placeholder="0" className="text-right text-[11px]" />
                                                        ) : <span className="text-zinc-300 dark:text-zinc-700">—</span>}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {/* TOTAL Row */}
                                        <tr className="bg-zinc-50 dark:bg-zinc-800/30 font-bold border-t-2 border-zinc-300 dark:border-zinc-700">
                                            <td className="px-2 py-2 border-r border-zinc-200 dark:border-zinc-800 text-right" colSpan={3}>TOTAL</td>
                                            <td className="px-2 py-2 text-right border-r border-zinc-200 dark:border-zinc-800">{totals.totalTaxable.toLocaleString("en-IN")}</td>
                                            
                                            <td className="px-1 py-2 text-center border-r border-zinc-200 dark:border-zinc-800 text-[10px]">{isIntraState ? (items[0]?.cgstRate || "") : ""}</td>
                                            <td className="px-2 py-2 text-right border-r border-zinc-200 dark:border-zinc-800">{isIntraState && totals.totalCgst > 0 ? totals.totalCgst.toLocaleString("en-IN") : ""}</td>
                                            
                                            <td className="px-1 py-2 text-center border-r border-zinc-200 dark:border-zinc-800 text-[10px]">{isIntraState ? (items[0]?.sgstRate || "") : ""}</td>
                                            <td className="px-2 py-2 text-right border-r border-zinc-200 dark:border-zinc-800">{isIntraState && totals.totalSgst > 0 ? totals.totalSgst.toLocaleString("en-IN") : ""}</td>
                                            
                                            <td className="px-1 py-2 text-center border-r border-zinc-200 dark:border-zinc-800 text-[10px]">{!isIntraState ? (items[0]?.igstRate || "") : ""}</td>
                                            <td className="px-2 py-2 text-right border-r border-zinc-200 dark:border-zinc-800">{!isIntraState && totals.totalIgst > 0 ? totals.totalIgst.toLocaleString("en-IN") : ""}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Totals Block */}
                            <div className="flex justify-end mt-4">
                                <div className="w-[80%] max-w-[500px]">
                                    <table className="w-full text-xs font-bold border-collapse">
                                        <tbody>
                                            <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                                <td className="py-2 text-right pr-4 text-zinc-500 dark:text-zinc-400">Total Invoice Value (In figure):</td>
                                                <td className="py-2 text-left pl-4 text-zinc-950 dark:text-zinc-50 w-[180px]">
                                                    Rs. {totals.grandTotal.toLocaleString("en-IN")}/-
                                                </td>
                                            </tr>
                                            <tr className="border-b border-zinc-200 dark:border-zinc-800">
                                                <td className="py-2 text-right pr-4 text-zinc-500 dark:text-zinc-400">Total Invoice Value (In words):</td>
                                                <td className="py-2 text-left pl-4 text-zinc-950 dark:text-zinc-50 font-normal">
                                                    {totals.totalInWords}
                                                </td>
                                            </tr>
                                            <tr>
                                                <td className="py-2 text-right pr-4 text-zinc-500 dark:text-zinc-400">Amount of Tax subject to Reverse Charge:</td>
                                                <td className="py-2 text-left pl-4 text-zinc-950 dark:text-zinc-50">
                                                    <InlineInput value={reverseCharge} onChange={setReverseCharge} placeholder="NIL" className="font-bold text-xs" />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Signatory Section in blue — signature affixed only after HoS approval */}
                        <div className="text-[#1f4096] text-xs space-y-1 mt-8 max-w-[350px]">
                            <div className="h-16 flex items-end">
                                {isApproved && approverSignature ? (
                                    <img src={getFileUrl(approverSignature)} alt="Authorised Signatory" className="h-14 object-contain" />
                                ) : (
                                    <span className="italic text-zinc-400 dark:text-zinc-500 text-[11px] leading-snug">
                                        (Signature will be affixed here after approval by the Head of Section, R&amp;D)
                                    </span>
                                )}
                            </div>
                            <div className="font-bold text-[11px] underline">Authorised Signatory</div>
                            <div className="font-bold text-[12px] pt-3">Head of Section</div>
                            <div className="font-bold">Research and Development Section</div>
                            <div className="font-bold">Indian Institute of Technology Guwahati</div>
                            {isApproved && approverName && (
                                <div className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400 pt-1">
                                    Approved by {approverName}{approverDate ? ` on ${formatDisplayDate(approverDate)}` : ""}
                                </div>
                            )}
                        </div>

                        {/* Payment Instructions and Bank Details */}
                        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-4 mt-6 text-xs text-zinc-900 dark:text-zinc-100">
                            <div>
                                Payments are to be made by either by ECS (details below) or Cheque/DD in favour of <span className="font-semibold">"IIT Guwahati II&SI A/c"</span> payable at Guwahati.
                            </div>
                            <div className="mt-2 flex items-start">
                                <span className="mr-1 text-base leading-none">•</span>
                                <div className="text-[11px] leading-relaxed">
                                    <strong>A/c Name:</strong> IIT Guwahati II and SI A/c,{" "}
                                    <strong>A/c No.:</strong> 8652101030326,{" "}
                                    <strong>Bank:</strong> Canara Bank, IIT Guwahati Branch Guwahati-781039,{" "}
                                    <strong>IFSC:</strong> CNRB0008652{" "}
                                    <strong>MICR Code:</strong> 781015008,{" "}
                                    <strong>Swift Code:</strong> CNRBINBBBFD
                                </div>
                            </div>
                        </div>

                    </div>
                    )}
                    </LockContext.Provider>
                </div>
            </div>
        </div>
    );
}