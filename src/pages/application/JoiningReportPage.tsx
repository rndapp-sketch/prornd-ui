import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useFrappePostCall } from "frappe-react-sdk";
import {
  selectionCommitteeReportAPI,
  selectionCandidateDetailsAPI,
} from "@/services/apiService";
import { Loader2, Printer, ArrowLeft } from "lucide-react";

// ─── Styles (shared with AppointmentOrderPage / MedicalReportPage) ────────────
const styles = `
.ao-input {
    border: none;
    border-bottom: 1px dashed #ef4444;
    outline: none;
    background: #fee2e2;
    padding: 2px 4px;
    font-family: inherit;
    font-size: inherit;
    color: #991b1b;
    min-width: 60px;
    border-radius: 2px;
}
.ao-input::placeholder { color: #f87171; opacity: 1; }
.ao-input:focus { border-bottom: 1px solid #dc2626; background: #fecdd3; color: #7f1d1d; }
textarea.ao-input { display: block; width: 100%; resize: none; }

@media print {
    @page { size: A4; margin: 0; }

    * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
        --sidebar-width: 0px !important;
        --sidebar-width-mobile: 0px !important;
        --sidebar-width-icon: 0px !important;
    }

    .ao-toolbar { display: none !important; }

    .ao-input {
        border: none !important;
        background: transparent !important;
        color: #000 !important;
        box-shadow: none !important;
        padding: 0 !important;
    }
    .ao-input::placeholder { color: transparent !important; }
    textarea.ao-input { resize: none !important; }

    .no-print, header, aside, .sidebar,
    [data-sidebar="sidebar"], [data-sidebar], nav, button {
        display: none !important;
    }

    html, body, #root, .App, main,
    [data-sidebar-inset], .SidebarProvider,
    [data-sidebar="inset"], [data-sidebar="wrapper"] {
        background: white !important;
        margin: 0 !important; padding: 0 !important;
        border: 0 !important; width: 100% !important;
        max-width: 100% !important; height: auto !important;
        overflow: visible !important; min-height: 0 !important;
        display: block !important; inset: 0 !important;
        transform: none !important; box-sizing: border-box !important;
        position: static !important;
    }

    body > div, #root > div, #root > div > div {
        margin: 0 !important; padding: 0 !important;
        display: block !important; width: 100% !important;
        max-width: 100% !important; background: white !important;
    }

    .ao-page-wrapper { background: white !important; padding: 0 !important; }

    .ao-document {
        box-shadow: none !important;
        width: 100% !important;
        min-height: 0 !important;
        overflow: visible !important;
    }
}
`;

// ─── Types ────────────────────────────────────────────────────────────────────
type Candidate = {
  candidate_name: string;
  candidate_surname: string;
  application_id: string;
  recruitment_post_id: string;
  candidate_id: string;
  applied_post: string;
  basic_pay: number | string;
  hra: string | number;
};

type PostDetail = {
  name: string;
  upfa_designation: string;
  upfa_duration_months: number;
};

const capitalize = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");

const formatDateLong = (raw: string): string => {
  if (!raw) return "";
  // Frappe date is YYYY-MM-DD
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  const dd = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleString("en-US", { month: "short" });
  return `${dd} ${month}, ${d.getFullYear()}`;
};

// ─── Component ────────────────────────────────────────────────────────────────
const JoiningReportPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);

  const scrName = searchParams.get("scr") || "";
  const applicationId = searchParams.get("application_id") || "";

  // Fetched
  const [loading, setLoading] = useState(true);
  const [projectNumber, setProjectNumber] = useState("");
  const [projectName, setProjectName] = useState("");
  const [recruitmentType, setRecruitmentType] = useState("");
  const [piName, setPiName] = useState("");
  const [piDept, setPiDept] = useState("");
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [salutation, setSalutation] = useState("Mr.");
  const [duration, setDuration] = useState<number>(0);

  // Editable / overridable
  const [issueNumber, setIssueNumber] = useState("");
  const [address, setAddress] = useState("");
  const [empId, setEmpId] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [basicPay, setBasicPay] = useState<string>("");

  // Joining report number persistence (saved on Selection Candidate Details.joining_report_number)
  const [scdDocName, setScdDocName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  const { call: fetchSCRFields } = useFrappePostCall(
    selectionCommitteeReportAPI.getFields,
  );
  const { call: fetchCandidateByApplication } = useFrappePostCall(
    selectionCandidateDetailsAPI.getByApplication,
  );
  const { call: updateJoiningReportNumber } = useFrappePostCall(
    selectionCandidateDetailsAPI.updateJoiningReportNumber,
  );
  const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>(
    "frappe.client.get_value",
  );
  const { call: fetchPSDList } = useFrappePostCall<{
    message: Array<{
      name?: string;
      ps_emp_id?: string;
      ps_first_name?: string;
      ps_middle_name?: string;
      ps_last_name?: string;
      ps_joining_date?: string;
      ps_present_address?: string;
      ps_basic_salary?: string | number;
      ps_gender?: string;
      docstatus?: number;
    }>;
  }>("frappe.client.get_list");

  const normalizeName = (...parts: Array<string | undefined>) =>
    parts.filter(Boolean).join(" ").toLowerCase().replace(/\s+/g, " ").trim();

  useEffect(() => {
    if (!scrName && !applicationId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const [scrRes, scdRes] = await Promise.all([
          scrName
            ? fetchSCRFields({ doc_name: scrName })
            : Promise.resolve(null),
          applicationId
            ? fetchCandidateByApplication({ application_id: applicationId })
            : Promise.resolve(null),
        ]);

        // ── SCR: project / PI / pay / duration ──
        const prefill = scrRes?.message?.prefill_data;
        let foundCandidate: Candidate | null = null;
        if (prefill) {
          setProjectNumber(prefill.project_number || "");
          setProjectName(prefill.project_name || "");
          setRecruitmentType(prefill.recruitment_type || "");

          const candidates: Candidate[] =
            typeof prefill.candidates === "string"
              ? JSON.parse(prefill.candidates)
              : prefill.candidates || [];
          const postDetails: PostDetail[] = Array.isArray(prefill.post_details)
            ? prefill.post_details
            : [];

          foundCandidate =
            candidates.find(
              (c) => String(c.application_id) === String(applicationId),
            ) || null;
          if (foundCandidate) {
            setCandidate(foundCandidate);
            setBasicPay(String(foundCandidate.basic_pay ?? ""));
            const post = postDetails.find(
              (p) =>
                p.name === foundCandidate!.recruitment_post_id ||
                p.upfa_designation?.toLowerCase() ===
                  foundCandidate!.applied_post?.toLowerCase(),
            );
            if (post?.upfa_duration_months)
              setDuration(post.upfa_duration_months);
          }

          const piLookup = prefill.principal_investigator
            ? fetchFrappeValue({
                doctype: "User",
                filters: prefill.principal_investigator,
                fieldname: "full_name",
              }).catch(() => null)
            : Promise.resolve(null);
          const deptLookup = prefill.upfa_department
            ? fetchFrappeValue({
                doctype: "Department_prornd",
                filters: prefill.upfa_department,
                fieldname: "dept_name",
              }).catch(() => null)
            : Promise.resolve(null);
          const [piRes, deptRes] = await Promise.all([piLookup, deptLookup]);
          setPiName(
            piRes?.message?.full_name || prefill.principal_investigator || "",
          );
          setPiDept(
            deptRes?.message?.dept_name || prefill.upfa_department || "",
          );
        }

        // ── SCD: candidate contact info + joining-report number persistence ──
        const scdDocs = scdRes?.message?.data;
        if (Array.isArray(scdDocs) && scdDocs.length > 0) {
          const scd = scdDocs[0];
          if (scd.name) setScdDocName(scd.name);
          setCandidate((prev) =>
            prev
              ? {
                  ...prev,
                  candidate_name: scd.candidate_name || prev.candidate_name,
                  candidate_surname:
                    scd.candidate_surname || prev.candidate_surname,
                }
              : prev,
          );
          if (scd.recruitment_type) setRecruitmentType(scd.recruitment_type);
          if (scd.gender)
            setSalutation(
              String(scd.gender).toLowerCase() === "female" ? "Ms." : "Mr.",
            );
          if (scd.correspondence_address)
            setAddress(scd.correspondence_address);
          // Prefill the joining-report number (Ref), stripping the project_number prefix
          if (scd.joining_report_number) {
            const projNum = prefill?.project_number || "";
            const raw = String(scd.joining_report_number);
            const stripped =
              projNum && raw.startsWith(`${projNum}/`)
                ? raw.slice(projNum.length + 1)
                : raw.includes("/")
                  ? raw.split("/").slice(1).join("/")
                  : raw;
            setIssueNumber(stripped);
          }
        }

        // ── PSD: employee id, joining date, address (post-joining overrides) ──
        if (scrName || applicationId) {
          try {
            // Prefer the reliable application_id key; fall back to scr_id when absent.
            const psdFilters = applicationId
              ? [["application_id", "=", applicationId]]
              : [["scr_id", "=", scrName]];
            const psdRes = await fetchPSDList({
              doctype: "Project Staff Details",
              filters: JSON.stringify(psdFilters),
              fields: JSON.stringify([
                "name",
                "ps_emp_id",
                "ps_first_name",
                "ps_middle_name",
                "ps_last_name",
                "ps_joining_date",
                "ps_present_address",
                "ps_basic_salary",
                "ps_gender",
                "docstatus",
              ]),
              limit_page_length: 0,
            });
            const psds = psdRes?.message ?? [];
            const candidateFullName = foundCandidate
              ? normalizeName(foundCandidate.candidate_name)
              : "";
            // With application_id filter there is at most one row; otherwise match by name.
            const psd = applicationId
              ? psds[0]
              : psds.find(
                  (p) =>
                    candidateFullName &&
                    normalizeName(
                      p.ps_first_name,
                      p.ps_middle_name,
                      p.ps_last_name,
                    ) === candidateFullName,
                ) || psds[0];
            if (psd) {
              if (psd.ps_emp_id) setEmpId(psd.ps_emp_id);
              if (psd.ps_joining_date) setJoiningDate(psd.ps_joining_date);
              if (psd.ps_present_address)
                setAddress((prev) => prev || psd.ps_present_address!);
              if (psd.ps_basic_salary)
                setBasicPay((prev) => prev || String(psd.ps_basic_salary));
              if (psd.ps_gender)
                setSalutation(
                  String(psd.ps_gender).toLowerCase() === "female"
                    ? "Ms."
                    : "Mr.",
                );
            }
          } catch {
            // Best-effort; the page still renders with the SCR/SCD-only data.
          }
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrName, applicationId]);

  const fullName = candidate
    ? capitalize(
        [candidate.candidate_name, candidate.candidate_surname]
          .filter(Boolean)
          .join(" "),
      )
    : "";
  const today = (() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${d.getFullYear()}`;
  })();
  const appliedPost = candidate?.applied_post || "";
  const projectType = recruitmentType || "";
  const joiningDateLong = formatDateLong(joiningDate);

  const handleSave = async () => {
    if (!issueNumber) return;
    if (!scdDocName) {
      setSaveStatus("error");
      return;
    }
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await updateJoiningReportNumber({
        docname: scdDocName,
        joining_report_number: `${projectNumber}/${issueNumber}`,
      });
      setSaveStatus(res?.message?.status === "success" ? "success" : "error");
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans">
        <div className="flex items-center gap-3 rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] px-5 py-4 shadow-sm">
          <Loader2 className="w-5 h-5 animate-spin text-[#D97757]" />
          <span className="text-sm font-semibold text-[#71717A] dark:text-[#A1A1AA]">
            Loading joining report
          </span>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-[#FAFAF9] dark:bg-[#18181B] font-sans text-zinc-500">
        <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
            Could not load candidate data.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-3 text-xs font-bold uppercase tracking-wide text-[#D97757]"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] dark:bg-[#18181B] font-sans">
      <style>{styles}</style>

      {/* Toolbar */}
      <div className="ao-toolbar sticky top-0 z-20 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-white/95 dark:bg-[#27272A]/95 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-6 py-3 md:px-8">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-3 text-sm font-semibold text-[#71717A] transition-colors hover:border-[#D97757]/40 hover:bg-[#D97757]/10 hover:text-[#D97757]"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <div className="min-w-0 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
              Joining Report
            </p>
            <p className="truncate text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
              {fullName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !issueNumber}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-4 text-sm font-bold text-[#3F3F46] dark:text-[#E4E4E7] shadow-sm transition-colors hover:border-[#D97757]/40 hover:bg-[#D97757]/10 hover:text-[#D97757] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {saving
                ? "Saving…"
                : saveStatus === "success"
                  ? "Saved ✓"
                  : saveStatus === "error"
                    ? "Error ✗"
                    : "Save Joining Report Number"}
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#D97757] px-4 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#c66a4e]"
            >
              <Printer size={15} />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* A4 area */}
      <div className="ao-page-wrapper px-4 py-8 md:px-8">
        <div
          ref={printRef}
          className="ao-document"
          style={{
            backgroundColor: "white",
            boxShadow: "0 18px 48px rgba(24,24,27,0.14)",
            width: "210mm",
            minHeight: "297mm",
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: "12px",
            lineHeight: "1.55",
            color: "#000",
            padding: "12mm 15mm 14mm",
            margin: "0 auto",
          }}
        >
          {/* ── LETTERHEAD : logo + section + institute (same as Appointment Order) ── */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "6px 0 10px 0",
              borderBottom: "2px solid black",
            }}
          >
            <img
              src={`http://${import.meta.env.VITE_APP_BACKEND_HOST || '172.16.134.191'}:${import.meta.env.VITE_APP_BACKEND_PORT || '8000'}/files/IITG_logo.png`}
              alt="IITG"
              style={{ width: "55px", height: "auto", flexShrink: 0 }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <strong style={{ display: "block", fontSize: "12.5px" }}>
                Research and Development Section
              </strong>
              <strong
                style={{
                  display: "block",
                  fontSize: "11.5px",
                  marginTop: "3px",
                }}
              >
                Indian Institute of Technology Guwahati
                <br />
                Guwahati–781039, Assam, India
              </strong>
            </div>
          </div>

          {/* Contacts — original placement & style */}
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: "22px",
            }}
          >
            <tbody>
              <tr>
                <td style={{ verticalAlign: "top" }}>
                  <div style={{ fontWeight: "bold" }}>Prof. Rohit Sinha</div>
                  <div>Dean, R&amp;D</div>
                </td>
                <td
                  style={{
                    verticalAlign: "top",
                    textAlign: "right",
                    fontSize: "11.5px",
                  }}
                >
                  <div>Guwahati-781039</div>
                  <div>Phone : +91-361-2582131</div>
                  <div>Email Id: dornd@iitg.ac.in</div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Ref & Date */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginTop: "14px",
            }}
          >
            <span>
              <strong style={{ color: "#b00" }}>Ref:</strong> {projectNumber}/
              <input
                type="text"
                value={issueNumber}
                onChange={(e) => setIssueNumber(e.target.value)}
                placeholder="Issue Num"
                maxLength={140}
                className="ao-input"
                style={{ width: "100px" }}
              />
              {issueNumber.length >= 140 && (
                <span style={{ color: "#dc2626", fontSize: "10px", fontWeight: 700, marginLeft: "4px" }}>
                  (limit 140 reached)
                </span>
              )}
            </span>
            <span>
              <strong style={{ color: "#b00" }}>Date:</strong> {today}
            </span>
          </div>

          {/* Title */}
          <div
            style={{
              textAlign: "center",
              marginTop: "20px",
              fontWeight: "bold",
              fontSize: "14px",
              textDecoration: "underline",
            }}
          >
            कार्यालय-आदेश/OFFICE ORDER
          </div>

          {/* Body */}
          <p
            style={{
              marginTop: "22px",
              textAlign: "justify",
              lineHeight: "1.8",
            }}
          >
            <strong>
              {salutation} {fullName}
            </strong>
            {empId ? (
              <>
                (<strong>{empId}</strong>)
              </>
            ) : null}
            , {address || "____"}, joined in <strong>{projectType}</strong>{" "}
            Project titled "<strong>{projectName}</strong>" as a{" "}
            <strong>{appliedPost}</strong>, under <strong>{piName}</strong>, IIT
            Guwahati in the pay of Rs.
            <strong>{basicPay || "____"}</strong> /-p.m, with effect from
            forenoon <strong>{joiningDateLong || "____"}</strong>.
          </p>

          <p
            style={{
              marginTop: "12px",
              textAlign: "justify",
              lineHeight: "1.8",
            }}
          >
            The pay of <strong>{fullName}</strong> will be Rs.{" "}
            {basicPay || "____"} + HRA. No other benefits or allowances will be
            available.
          </p>

          <p
            style={{
              marginTop: "12px",
              textAlign: "justify",
              lineHeight: "1.8",
            }}
          >
            The appointment is on <strong>Contractual</strong> basis for{" "}
            <strong>{duration || "____"}</strong> Months or{" "}
            <strong>co-terminus with the project, whichever is earlier</strong>.
            The appointment will be terminated at the end of the period unless
            notified otherwise.
          </p>

          {/* Signature */}
          <div
            style={{ marginTop: "70px", textAlign: "right", lineHeight: 1.5 }}
          >
            <div style={{ height: "40px" }} />
            <div style={{ fontWeight: "bold" }}>Dean, R&amp;D</div>
          </div>

          {/* Optional copy-to / dept footer to match the spirit of the source */}
          <div style={{ marginTop: "40px", fontSize: "11.5px" }}>
            <strong>Copy to:</strong>
            <ol style={{ margin: "6px 0 0 2em" }}>
              <li>
                Principal Investigator — Prof. {piName}, Dept. of {piDept}
              </li>
              <li>The candidate concerned</li>
              <li>R&amp;D Cell, IIT Guwahati</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoiningReportPage;
