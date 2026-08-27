import * as React from "react";
import {
    Printer,
    FileSpreadsheet,
    FileText,
    Users,
    Filter,
    BarChart3,
    ChevronDown,
    FileCheck2,
    Activity,
    Award
} from "lucide-react";
import { generateInstituteReportHtml } from "@/utils/instituteReportPrint";
import { format } from "date-fns";
import { useFrappeGetCall, useFrappeGetDocList } from "frappe-react-sdk";

// Live-corrects the sanctioned amount + start date for a single Ongoing row when the bulk
// Fund Sanction fetch didn't surface a matching amount (e.g. some migrated projects' Fund
// Sanction record isn't returned by the bulk list query for this user, even though the
// whitelisted per-project lookup finds it). Only fires for Ongoing rows whose bulk amount
// is 0 — not for every row — so this doesn't reintroduce a per-project fetch loop.
const SanctionOverride: React.FC<{
    projectName: string;
    isOngoing: boolean;
    bulkAmount: number;
    bulkDate: string | undefined;
    children: (amount: number, date: string | undefined) => React.ReactNode;
}> = ({ projectName, isOngoing, bulkAmount, bulkDate, children }) => {
    const shouldFetch = isOngoing && bulkAmount <= 0 && !!projectName;
    const { data } = useFrappeGetCall<{ message: any }>(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project",
        { project_name: projectName },
        shouldFetch ? undefined : null,
        { revalidateOnFocus: false },
    );

    let amount = bulkAmount;
    let date = bulkDate;
    if (shouldFetch && data) {
        const raw = data as any;
        let records: any[] = [];
        if (Array.isArray(raw?.message?.message)) records = raw.message.message;
        else if (Array.isArray(raw?.message)) records = raw.message;
        else if (Array.isArray(raw)) records = raw;
        else if (Array.isArray(raw?.data)) records = raw.data;
        else if (Array.isArray(raw?.message?.data)) records = raw.message.data;

        const approved = records.find((r: any) => (r.sanction_workflow_status || r.workflow_state || "").toLowerCase().includes("sanction approved")) || records[0];
        if (approved) {
            const amt = Number(approved.total_sanctioned_amount) || 0;
            if (amt > 0) amount = amt;
            if (approved.sanctioned_letter_date) date = approved.sanctioned_letter_date;
        }
    }

    return <>{children(amount, date)}</>;
};

// Same classification the "Project Category" filter uses — kept as one function so the
// Type column (table/Excel/print) can never drift out of sync with what the filter matches.
const getProjectCategory = (p: any): "Research" | "Consultancy" | "Others" => {
    const type = (p.project_type || "").toLowerCase();
    if (type.includes("research") || type === "r&d project") return "Research";
    if (type.includes("consult") || type === "testing") return "Consultancy";
    return "Others";
};

// Exact Year/Month/Day breakdown between two dates — adapts to whatever span the
// project actually has instead of always rounding to whole years (a 3-month project
// was previously showing as "0 Years").
const formatDuration = (startStr?: string, endStr?: string, fallbackMonths?: number): string => {
    const start = startStr ? new Date(startStr) : null;
    const end = endStr ? new Date(endStr) : null;
    const hasValidDates = start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()) && end > start;

    if (hasValidDates) {
        let years = end.getFullYear() - start.getFullYear();
        let months = end.getMonth() - start.getMonth();
        let days = end.getDate() - start.getDate();

        if (days < 0) {
            months -= 1;
            const prevMonthEnd = new Date(end.getFullYear(), end.getMonth(), 0);
            days += prevMonthEnd.getDate();
        }
        if (months < 0) {
            years -= 1;
            months += 12;
        }

        const parts: string[] = [];
        if (years > 0) parts.push(`${years} Year${years > 1 ? "s" : ""}`);
        if (months > 0) parts.push(`${months} Month${months > 1 ? "s" : ""}`);
        if (days > 0) parts.push(`${days} Day${days > 1 ? "s" : ""}`);

        return parts.length > 0 ? parts.join(" ") : "0 Days";
    }

    // No usable start/end date pair — fall back to the stored duration-in-months field
    // (no day-level precision available from that field, but still year/month adaptive).
    const months = Number(fallbackMonths) || 0;
    if (months <= 0) return "—";
    if (months < 12) return `${months} Month${months > 1 ? "s" : ""}`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    return rem > 0 ? `${years} Year${years > 1 ? "s" : ""} ${rem} Month${rem > 1 ? "s" : ""}` : `${years} Year${years > 1 ? "s" : ""}`;
};

export default function InstituteReportingModule({
    projects = [], 
    getDeptName,
    getPiName,
    ongoingIds,
    submittedIds,
    printedBy,
    isLoadingProjects
}: { 
    projects?: any[];
    getDeptName?: (id: string) => string;
    getPiName?: (email: string) => string;
    ongoingIds?: Set<string>;
    submittedIds?: Set<string>;
    printedBy?: string;
    isLoadingProjects?: boolean;
}) {
    const [reportType, setReportType] = React.useState("Annual Report");
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [hasGenerated, setHasGenerated] = React.useState(false);
    const [financialYear, setFinancialYear] = React.useState("All Time");
    const [customStartDate, setCustomStartDate] = React.useState("");
    const [customEndDate, setCustomEndDate] = React.useState("");
    const [selectedDepartment, setSelectedDepartment] = React.useState("All Departments");
    const [projectStatus, setProjectStatus] = React.useState("All Statuses");
    const [projectCategory, setProjectCategory] = React.useState("All Projects");
    const [selectedPI, setSelectedPI] = React.useState("All Investigators");
    const [selectedFundingAgencies, setSelectedFundingAgencies] = React.useState<string[]>([]);
    const [isAllAgenciesSelected, setIsAllAgenciesSelected] = React.useState(true);
    const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = React.useState(false);
    const agencyDropdownRef = React.useRef<HTMLDivElement>(null);
    const [selectedSchemes, setSelectedSchemes] = React.useState<string[]>([]);
    const [isAllSchemesSelected, setIsAllSchemesSelected] = React.useState(true);
    const [isSchemeDropdownOpen, setIsSchemeDropdownOpen] = React.useState(false);
    const schemeDropdownRef = React.useRef<HTMLDivElement>(null);
    const [dataValidation, setDataValidation] = React.useState("All Records");
    const [reportListPage, setReportListPage] = React.useState(1);
    const REPORT_LIST_PAGE_SIZE = 50;

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (schemeDropdownRef.current && !schemeDropdownRef.current.contains(event.target as Node)) {
                setIsSchemeDropdownOpen(false);
            }
            if (agencyDropdownRef.current && !agencyDropdownRef.current.contains(event.target as Node)) {
                setIsAgencyDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const normalizeSchemeName = React.useCallback((name: string) => {
        if (!name) return "";
        const lower = name.toLowerCase().trim();
        if (lower.includes("matrics")) return "MATRICS";
        if (lower.includes("pmecrg") || lower.includes("prime minister") || lower.includes("early career research grant")) return "Prime Minister Early Career Research Grant (PM-ECRG)";
        if (lower.includes("irg") || lower.includes("inclusivity")) return "Inclusivity Research Grant (IRG)";
        if (lower.includes("ecrg")) return "Early Career Research Grant (ECRG)";
        if (lower.includes("pre-proposal") || lower.includes("preproposal")) return "ARG Pre-proposal";
        if (lower.includes("arg") || lower.includes("advance research grant") || lower.includes("advanced research grant")) return "Advanced Research Grant (ARG)";
        if (lower.includes("basic core research")) return "Basic Core Research";
        if (lower.includes("maha") && lower.includes("water")) return "MAHA for Water";
        if (lower.includes("maha") && lower.includes("drone")) return "MAHA Drones";
        if (lower.includes("maha") && lower.includes("leapfrog")) return "MAHA Leapfrog";
        return name.trim();
    }, []);

    const getAgency = React.useCallback((p: any) => {
        let agency = p.funding_agency_name || p.select_funding_agency || p.funding_agency || p.funding_agency_other || "";
        if (!agency && (p.origin_of_funding_agency === "National" || p.origin_of_funding_agency === "International")) {
            // Do not use National/International as an agency name
            agency = "";
        } else if (!agency) {
            agency = p.origin_of_funding_agency || "";
        }
        
        if (!agency || agency.trim() === "" || agency === "—") {
            const scheme = (p.funding_agency_schemes || p.scheme_name || "").toUpperCase();
            if (scheme.includes("ANRF")) {
                agency = "ANRF - (Anusandhan National Research Foundation)";
            } else if (scheme.includes("SERB")) {
                agency = "SERB";
            } else if (scheme.includes("DST")) {
                agency = "Department Of Science and Technology";
            } else if (scheme.includes("DBT")) {
                agency = "DBT - Department of Biotechnology";
            }
        } else {
            // Normalize existing ANRF entries
            if (agency.trim().toUpperCase() === "ANRF") {
                agency = "ANRF - (Anusandhan National Research Foundation)";
            }
        }
        
        return agency.trim();
    }, []);

    // ── Sanction Dates / Amounts ──────────────────────────────────────────────
    // Fund Sanction supports bulk List-View access (confirmed working elsewhere in
    // this app), so this is a single request instead of the old per-project chunked
    // loop — it resolves once and stays resolved, instead of visibly "re-syncing"
    // every time this component re-renders or remounts.
    const { data: allFundSanctionList, isLoading: isSyncingDates } = useFrappeGetDocList(
        "Fund Sanction",
        {
            fields: ["refnum_prj_num", "sanctioned_letter_date", "total_sanctioned_amount", "workflow_state"],
            limit: 20000,
        }
    );

    const { sanctionDateMap, sanctionAmountMap } = React.useMemo(() => {
        // A project can have more than one Fund Sanction record (drafts, superseded
        // revisions, stray records from legacy-system migrations). Without an explicit
        // orderBy, an unordered query's row order isn't guaranteed stable across different
        // LIMIT values, so "first record wins" alone can non-deterministically pick a
        // stale record. Prefer the record whose workflow_state shows it's actually
        // approved; only fall back to an unapproved one if no approved record exists.
        const dateMap = new Map<string, string>();
        const amountMap = new Map<string, number>();
        const approvedDate = new Map<string, string>();
        const approvedAmount = new Map<string, number>();
        (allFundSanctionList || []).forEach((rec: any) => {
            if (!rec.refnum_prj_num) return;
            const isApproved = (rec.workflow_state || "").toLowerCase().includes("sanction approved");
            if (rec.sanctioned_letter_date) {
                if (!dateMap.has(rec.refnum_prj_num)) dateMap.set(rec.refnum_prj_num, rec.sanctioned_letter_date);
                if (isApproved && !approvedDate.has(rec.refnum_prj_num)) approvedDate.set(rec.refnum_prj_num, rec.sanctioned_letter_date);
            }
            const amt = Number(rec.total_sanctioned_amount) || 0;
            if (amt > 0) {
                if (!amountMap.has(rec.refnum_prj_num)) amountMap.set(rec.refnum_prj_num, amt);
                if (isApproved && !approvedAmount.has(rec.refnum_prj_num)) approvedAmount.set(rec.refnum_prj_num, amt);
            }
        });
        approvedDate.forEach((v, k) => dateMap.set(k, v));
        approvedAmount.forEach((v, k) => amountMap.set(k, v));
        return { sanctionDateMap: dateMap, sanctionAmountMap: amountMap };
    }, [allFundSanctionList]);

    // Falls back to the Fund Sanction record's amount when the Project Registration
    // doc's own budget fields are 0 — some legacy projects only carry the real
    // sanctioned amount on the sanction record.
    const getSanctionedAmount = React.useCallback((p: any) => {
        const own = Number(p.total_budget_amount || p.grand_total_proposal) || 0;
        if (own > 0) return own;
        return sanctionAmountMap.get(p.name) || sanctionAmountMap.get(p.project_no) || 0;
    }, [sanctionAmountMap]);

    // Fallback for projects with no sanction/start date on file: derive a date from the
    // "Dean approval" comment on the project's timeline. Bulk-fetched (single request,
    // Comment is a standard doctype) rather than per-project, to avoid re-introducing the
    // slow per-project sync loop. Best-effort match on comment text containing "dean".
    const { data: deanCommentList } = useFrappeGetDocList(
        "Comment",
        {
            fields: ["reference_name", "content", "creation"],
            filters: [
                ["reference_doctype", "=", "Project Registration"],
                ["content", "like", "%dean%"],
            ],
            orderBy: { field: "creation", order: "asc" },
            limit: 20000,
        }
    );

    const deanApprovalDateMap = React.useMemo(() => {
        const fallback = new Map<string, string>();
        const approved = new Map<string, string>();
        (deanCommentList || []).forEach((c: any) => {
            if (!c.reference_name || !c.creation) return;
            const text = (c.content || "").toLowerCase();
            if (!text.includes("dean")) return;
            // Prefer comments that read like an actual approval action over a mere mention
            if (/approv/.test(text)) {
                if (!approved.has(c.reference_name)) approved.set(c.reference_name, c.creation);
            } else if (!fallback.has(c.reference_name)) {
                fallback.set(c.reference_name, c.creation);
            }
        });
        approved.forEach((v, k) => fallback.set(k, v));
        return fallback;
    }, [deanCommentList]);

    // Single source of truth for a project's "effective" start date, walking the full
    // fallback chain: real sanction date → recorded start date → Dean approval comment → creation.
    const getEffectiveStartDate = React.useCallback((p: any) => {
        return sanctionDateMap.get(p.name) || sanctionDateMap.get(p.project_no)
            || p.sanctioned_letter_date || p.prj_start_date
            || deanApprovalDateMap.get(p.name) || deanApprovalDateMap.get(p.project_no)
            || p.creation;
    }, [sanctionDateMap, deanApprovalDateMap]);

    const availableAgencies = React.useMemo(() => {
        const agencies = new Set<string>();
        projects.forEach(p => {
            const agency = getAgency(p);
            if (agency && agency !== "—") agencies.add(agency);
        });
        return Array.from(agencies).sort();
    }, [projects]);

    const availableSchemes = React.useMemo(() => {
        const schemes = new Set<string>();
        projects.forEach(p => {
            const agency = getAgency(p);
            if (!isAllAgenciesSelected && !selectedFundingAgencies.includes(agency)) {
                return;
            }
            const scheme = p.funding_agency_schemes || p.scheme_name || "";
            if (scheme && scheme.trim() !== "" && scheme !== "—") {
                schemes.add(normalizeSchemeName(scheme));
            }
        });
        return Array.from(schemes).sort();
    }, [projects, selectedFundingAgencies, isAllAgenciesSelected, normalizeSchemeName]);

    const availableDepartments = React.useMemo(() => {
        const depts = new Set<string>();
        projects.forEach(p => {
            const deptId = p.implementation_department || p.department;
            const deptName = getDeptName && deptId ? getDeptName(deptId) : (deptId || "");
            if (deptName && deptName !== "—") depts.add(deptName);
        });
        return Array.from(depts).sort();
    }, [projects, getDeptName]);

    const availablePIs = React.useMemo(() => {
        const pis = new Map<string, { email: string, name: string }>();
        projects.forEach(p => {
            const deptId = p.implementation_department || p.department;
            const deptName = getDeptName && deptId ? getDeptName(deptId) : (deptId || "");
            if (selectedDepartment !== "All Departments" && !deptName.toLowerCase().includes(selectedDepartment.toLowerCase())) {
                return;
            }
            const rawEmail = p.pi_webmail || p.pi_name || "";
            if (rawEmail) {
                const resolvedName = getPiName && rawEmail ? getPiName(rawEmail) : "—";
                pis.set(rawEmail.toLowerCase(), { email: rawEmail, name: resolvedName });
            }
        });
        return Array.from(pis.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [projects, selectedDepartment, getDeptName, getPiName]);

    // ── Progressive Background Fund Sync ──
    // Because Frappe strictly blocks bulk List-View access to secure financial records,
    // we must fetch `Fund Received` dynamically via the allowed Python backend.
    // To prevent dev server freeze, we do this incrementally in the background.
    const [fundStatusMap, setFundStatusMap] = React.useState<Map<string, boolean>>(new Map());
    const [isSyncingFunds, setIsSyncingFunds] = React.useState(false);
    // Whatever the paginated table currently shows (current page + the next one, so
    // paging forward already has a head start) — kept live via a ref rather than a
    // useEffect dependency so updating it (e.g. as the user changes page) doesn't
    // restart the sync loop below. Read once at the start of each sync pass.
    const visibleProjectNamesRef = React.useRef<Set<string>>(new Set());

    React.useEffect(() => {
        let isCancelled = false;

        const syncFunds = async () => {
            setIsSyncingFunds(true);

            const map = new Map<string, boolean>();
            // ongoingIds (from get_director_dashboard_data) is authoritative: only those
            // projects have a submitted Fund Sanction and can possibly have a fund received.
            const unordered = projects.filter(p =>
                ongoingIds && (ongoingIds.has(p.name) || ongoingIds.has(p.project_no))
            );
            // Sync whatever's currently on screen first, so the visible page's Active/
            // Pending badges resolve before the rest of the (possibly much longer) list
            // finishes in the background — instead of syncing in arbitrary list order.
            const visible = visibleProjectNamesRef.current;
            const projectsToFetch = [...unordered].sort((a, b) => {
                const aVis = visible.has(a.name) ? 0 : 1;
                const bVis = visible.has(b.name) ? 0 : 1;
                return aVis - bVis;
            });

            // Fetch safely in tiny chunks of 3 to prevent Werkzeug single-thread lockup
            const chunkSize = 3;
            for (let i = 0; i < projectsToFetch.length; i += chunkSize) {
                if (isCancelled) break;
                const chunk = projectsToFetch.slice(i, i + chunkSize);
                
                await Promise.all(chunk.map(async (p) => {
                    try {
                        const csrf = (window as any).csrf_token || "";
                        const headers = { "X-Frappe-CSRF-Token": csrf, "Content-Type": "application/json" };
                        const res = await fetch(`/api/method/rndopsapp.rndopsapp.doctype.fund_received.fund_received.get_fund_received_by_prjreg?prjreg_title=${encodeURIComponent(p.name)}&limit=10&start=0`, { headers }).then(r => r.json()).catch(() => null);
                        
                        const fundsRaw = res?.message || res?.data || [];
                        const funds = Array.isArray(fundsRaw) ? fundsRaw : (fundsRaw.message || []);

                        const hasFund = funds.some((r: any) => {
                            const s = (r.workflow_state || r.status || "").toLowerCase();
                            return s === "approved" || s.includes("fund received");
                        });
                        map.set(p.name, hasFund);
                    } catch (e) {
                        map.set(p.name, false);
                    }
                }));

                // Progressively update UI so data streams in
                if (!isCancelled) {
                    setFundStatusMap(new Map(map));
                }
            }
            if (!isCancelled) setIsSyncingFunds(false);
        };

        syncFunds();
        return () => { isCancelled = true; };
    }, [ongoingIds, projects]);


    const getProjectStatusLabel = React.useCallback((p: any) => {
        // ongoingIds/submittedIds (from rndopsapp.dashboard.get_director_dashboard_data)
        // are the backend's authoritative classification: Ongoing = has a submitted
        // Fund Sanction record. No need to re-derive it from budget amount or
        // workflow_state text — see DASHBOARD_API_DOCUMENTATION.md.
        const isOngoing = ongoingIds && (ongoingIds.has(p.name) || ongoingIds.has(p.project_no));

        if (isOngoing) {
            const hasStartDate = !!(sanctionDateMap.get(p.name) || sanctionDateMap.get(p.project_no) || p.sanctioned_letter_date);
            const hasFundReceived = fundStatusMap.get(p.name) === true;
            if (hasFundReceived) return "● Active";
            if (hasStartDate) return "Pending Fund Received";
            return "Approved Sanction";
        }

        if (submittedIds && (submittedIds.has(p.name) || submittedIds.has(p.project_no))) return "Pending Sanction";

        const s = (p.workflow_state || "").toLowerCase();
        if (s.includes("draft")) return "Draft";
        if (s.includes("complet")) return "Completed";
        if (s.includes("cancel") || s.includes("reject")) return "Cancelled";
        if (p.workflow_state) return p.workflow_state;
        return "New Registered";
    }, [ongoingIds, submittedIds, sanctionDateMap, fundStatusMap]);
    

    const filteredProjects = React.useMemo(() => {
        let list = projects;
        if (financialYear && financialYear !== "All Time") {
            list = list.filter((p) => {
                // Same fallback chain as the Director Dashboard's year chart — falling
                // back to prj_start_date/creation means almost every project has some
                // date. A project with genuinely no date at all is excluded from a
                // specific-year filter (not included in every year, which previously
                // let undated "Ongoing" projects show up regardless of the year picked).
                const pDate = getEffectiveStartDate(p);
                if (!pDate) return false;
                const d = new Date(pDate);
                if (isNaN(d.getTime())) return false;

                if (/^\d{4}$/.test(financialYear)) {
                    return d.getFullYear().toString() === financialYear;
                }
                if (financialYear === "Custom Date Range") {
                    if (customStartDate) {
                        const start = new Date(`${customStartDate}T00:00:00`);
                        if (d < start) return false;
                    }
                    if (customEndDate) {
                        const end = new Date(`${customEndDate}T23:59:59`);
                        if (d > end) return false;
                    }
                    return true;
                }
                return true;
            });
        }
        if (selectedDepartment && selectedDepartment !== "All Departments") {
            list = list.filter((p) => {
                const deptId = p.implementation_department || p.department;
                const deptName = getDeptName && deptId ? getDeptName(deptId) : (deptId || "");
                return deptName.toLowerCase().includes(selectedDepartment.toLowerCase());
            });
        }
        if (projectStatus && projectStatus !== "All Statuses") {
            list = list.filter((p) => {
                const computed = getProjectStatusLabel(p).toLowerCase();
                const filterStatus = projectStatus.toLowerCase();

                // Exact stage matches — each option shows only that one stage, no overlap.
                if (filterStatus === "draft") return computed === "draft";
                if (filterStatus === "pending sanction") return computed === "pending sanction";
                // "Approved Sanction" means the sanction has been approved — covers the
                // narrow in-between stage plus Pending Fund Received and Active, since
                // fund-received status doesn't change whether the sanction is approved.
                if (filterStatus === "approved sanction") {
                    return computed === "approved sanction" || computed === "pending fund received" || computed.includes("active");
                }
                if (filterStatus === "pending fund received") return computed === "pending fund received";
                if (filterStatus === "approved fund received") return computed.includes("active");
                if (filterStatus === "completed") return computed.includes("complet");
                if (filterStatus === "closed") return computed.includes("clos");
                if (filterStatus === "cancelled") return computed.includes("cancel");

                // Broad buckets: "Ongoing" = sanction is approved, regardless of fund
                // status; "Submitted" = the backend's authoritative submittedIds set
                // (docstatus=1, not yet sanction-approved) — same definition
                // DirectorDashboard's year chart uses. NOT a negative match against the
                // computed label string: intermediate pre-approval workflow states (e.g.
                // "Pending HoS Approval", "Pending Dean Approval") aren't in submittedIds
                // yet (still effectively draft-like on the backend), so a negative match
                // was wrongly counting them as Submitted and inflating the total.
                if (filterStatus === "ongoing") {
                    return computed === "approved sanction" || computed === "pending fund received" || computed.includes("active");
                }
                if (filterStatus === "submitted") {
                    return computed === "pending sanction";
                }
                return computed.includes(filterStatus);
            });
        }
        if (projectCategory && projectCategory !== "All Projects") {
            list = list.filter((p) => getProjectCategory(p) === projectCategory);
        }
        if (selectedPI && selectedPI !== "All Investigators") {
            list = list.filter((p) => {
                const rawEmail = p.pi_webmail || p.pi_name || "";
                return rawEmail.toLowerCase() === selectedPI.toLowerCase();
            });
        }
        if (!isAllAgenciesSelected) {
            list = list.filter((p) => {
                const agency = getAgency(p);
                return selectedFundingAgencies.includes(agency);
            });
        }
        if (!isAllSchemesSelected) {
            list = list.filter((p) => {
                const scheme = p.funding_agency_schemes || p.scheme_name || "";
                return selectedSchemes.includes(normalizeSchemeName(scheme));
            });
        }
        if (dataValidation && dataValidation !== "All Records") {
            list = list.filter((p) => {
                const hasProjectNo = !!(p.project_no && p.project_no !== "—" && p.project_no.trim() !== "");
                const sanctioned = getSanctionedAmount(p);
                const hasSanctioned = sanctioned > 0;
                
                const rawAgency = getAgency(p);
                const hasAgency = !!(rawAgency && rawAgency !== "—");
                
                const rawScheme = p.funding_agency_schemes || p.scheme_name || "";
                const hasScheme = !!(rawScheme && rawScheme !== "—" && rawScheme.trim() !== "");
                
                const durationMonths = Number(p.project_duration_months) || 0;
                const hasDuration = durationMonths > 0;
                
                if (dataValidation === "Valid Projects Only") return hasProjectNo && hasSanctioned && hasAgency && hasScheme && hasDuration;
                if (dataValidation === "Missing Project No.") return !hasProjectNo;
                if (dataValidation === "Zero Sanctioned") return !hasSanctioned;
                if (dataValidation === "Missing Funding Agency") return !hasAgency;
                if (dataValidation === "Missing Scheme") return !hasScheme;
                if (dataValidation === "Missing/Zero Duration") return !hasDuration;
                
                return true;
            });
        }
        return list;
    }, [projects, selectedDepartment, getDeptName, projectStatus, getProjectStatusLabel, projectCategory, selectedPI, selectedFundingAgencies, isAllAgenciesSelected, selectedSchemes, isAllSchemesSelected, normalizeSchemeName, dataValidation, financialYear, customStartDate, customEndDate, getSanctionedAmount, getEffectiveStartDate]);

    // Jump back to page 1 whenever the filtered set changes underneath the pager,
    // so the user isn't stranded on a now-empty/out-of-range page.
    React.useEffect(() => {
        setReportListPage(1);
    }, [selectedDepartment, projectStatus, projectCategory, selectedPI, selectedFundingAgencies, isAllAgenciesSelected, selectedSchemes, isAllSchemesSelected, dataValidation, financialYear, customStartDate, customEndDate]);

    const totalReportListPages = Math.max(1, Math.ceil(filteredProjects.length / REPORT_LIST_PAGE_SIZE));
    const safeReportListPage = Math.min(reportListPage, totalReportListPages);
    const pagedProjects = filteredProjects.slice(
        (safeReportListPage - 1) * REPORT_LIST_PAGE_SIZE,
        safeReportListPage * REPORT_LIST_PAGE_SIZE
    );

    // Keep the fund-sync priority ref (declared above, near isSyncingFunds) pointed at
    // whatever's on screen now — current page plus the next one, so paging forward
    // already has a head start once the user gets there.
    React.useEffect(() => {
        const start = (safeReportListPage - 1) * REPORT_LIST_PAGE_SIZE;
        const end = start + REPORT_LIST_PAGE_SIZE * 2;
        visibleProjectNamesRef.current = new Set(filteredProjects.slice(start, end).map((p: any) => p.name));
    }, [filteredProjects, safeReportListPage, REPORT_LIST_PAGE_SIZE]);

    const getStatusHtml = (status: string) => {
        if (status === "● Active" || status === "Active") {
            return `<span style="padding: 2px 6px; background: #ecfdf5; color: #047857; border-radius: 4px; font-size: 8pt; font-weight: bold;">● Active</span>`;
        }
        if (status === "Pending Fund Received") {
            return `<span style="padding: 2px 6px; background: #eff6ff; color: #1d4ed8; border-radius: 4px; font-size: 8pt; font-weight: bold;">Pending Fund Received</span>`;
        }
        if (status === "Pending Sanction") {
            return `<span style="padding: 2px 6px; background: #fffbeb; color: #b45309; border-radius: 4px; font-size: 8pt; font-weight: bold;">Pending Sanction</span>`;
        }
        if (status === "Completed") {
            return `<span style="padding: 2px 6px; background: #ecfdf5; color: #047857; border-radius: 4px; font-size: 8pt; font-weight: bold;">Completed</span>`;
        }
        if (status === "Cancelled") {
            return `<span style="padding: 2px 6px; background: #fef2f2; color: #b91c1c; border-radius: 4px; font-size: 8pt; font-weight: bold;">Cancelled</span>`;
        }
        return `<span style="padding: 2px 6px; background: #f4f4f5; color: #3f3f46; border-radius: 4px; font-size: 8pt; font-weight: bold;">${status}</span>`;
    };

    const handlePrint = () => {
        const enrichedProjects = filteredProjects.map(p => ({
            ...p,
            _printStatusHtml: getStatusHtml(getProjectStatusLabel(p)),
            _overrideStartDate: getEffectiveStartDate(p),
            _overrideSanctionedAmount: getSanctionedAmount(p),
            _overrideDuration: formatDuration(getEffectiveStartDate(p), p.prj_end_date, p.project_duration_months),
            _projectCategory: getProjectCategory(p),
            _normalizedScheme: normalizeSchemeName(p.funding_agency_schemes || p.scheme_name || "")
        }));
        const htmlContent = generateInstituteReportHtml(enrichedProjects, reportType, getDeptName, getPiName, getAgency, printedBy);
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        if (iframe.contentWindow) {
            iframe.contentWindow.document.open();
            iframe.contentWindow.document.write(htmlContent);
            iframe.contentWindow.document.close();
            setTimeout(() => {
                if (iframe.contentWindow) {
                    iframe.contentWindow.focus();
                    iframe.contentWindow.print();
                }
                setTimeout(() => document.body.removeChild(iframe), 2000);
            }, 500);
        } else {
            alert("Could not create print frame.");
        }
    };

    const handleExport = (exportFormat: string) => {
        if (exportFormat === 'PDF') {
            handlePrint();
        } else if (exportFormat === 'Excel') {
            if (!filteredProjects || filteredProjects.length === 0) {
                alert("No projects to export.");
                return;
            }
            const formatDate = (dateStr: string) => {
                if (!dateStr) return "-";
                return format(new Date(dateStr), "MMM dd, yyyy");
            };
            const headers = ["Sl.", "Project No.", "PI Name", "PI Email", "Department", "Type", "Project Title", "Funding Agency", "Scheme", "Sanctioned (INR)", "Start Date", "Creation Date", "Duration", "Status"];
            const rows = filteredProjects.map((p, index) => {
                const deptId = p.implementation_department || p.department;
                const deptName = getDeptName && deptId ? getDeptName(deptId) : (deptId || "");
                const rawEmail = p.pi_webmail || p.pi_name || "";
                const resolvedName = getPiName && rawEmail ? getPiName(rawEmail) : "";
                const agency = getAgency(p) || "—";
                const scheme = normalizeSchemeName(p.funding_agency_schemes || p.scheme_name || "");
                return [
                    index + 1,
                    `"${p.project_no || ""}"`,
                    `"${resolvedName}"`,
                    `"${rawEmail}"`,
                    `"${deptName}"`,
                    `"${getProjectCategory(p)}"`,
                    `"${String(p.project_title || "").replace(/"/g, '""')}"`,
                    `"${String(agency).replace(/"/g, '""')}"`,
                    `"${String(scheme).replace(/"/g, '""')}"`,
                    getSanctionedAmount(p),
                    `"${formatDate(getEffectiveStartDate(p))}"`,
                    `"${formatDate(p.creation)}"`,
                    `"${formatDuration(getEffectiveStartDate(p), p.prj_end_date, p.project_duration_months)}"`,
                    `"${getProjectStatusLabel(p)}"`
                ].join(",");
            });
            const csvString = [headers.join(","), ...rows].join("\n");
            const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            // Report Type is now free text — strip characters that aren't safe in a filename
            // before using it, instead of just collapsing whitespace.
            const safeReportName = (reportType || "Report").trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "Report";
            link.setAttribute("download", `${safeReportName}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setHasGenerated(true);
        }, 1500);
    };

    const handleReset = () => {
        setHasGenerated(false);
        setIsGenerating(false);
    };

    return (
        <div>
            <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm mb-6 relative">
                {isSyncingFunds && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-indigo-50 dark:bg-indigo-900/30 overflow-hidden z-20">
                        <div className="h-full bg-indigo-500 animate-[progress_1.5s_ease-in-out_infinite] w-1/3 rounded-r-full"></div>
                    </div>
                )}
                <div className="p-6 border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                        <div>
                            <h2 className="text-[18px] font-extrabold tracking-tight text-[#3F3F46] dark:text-[#E4E4E7] flex items-center gap-2">
                                <FileCheck2 className="text-[#2563eb]" size={20} />
                                Comprehensive Reporting Engine
                            </h2>
                            <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA] mt-1 max-w-2xl">
                                Generate highly customizable administrative, financial, and departmental reports based on specific project metrics, timeframes, and funding categories.
                            </p>
                        </div>
                        {hasGenerated && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleExport('Excel')} className="flex items-center gap-2 px-3 py-1.5 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] text-[11px] font-bold rounded-lg hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors">
                                    <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
                                    Excel
                                </button>
                                <button onClick={() => handleExport('PDF')} className="flex items-center gap-2 px-3 py-1.5 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] text-[11px] font-bold rounded-lg hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors">
                                    <FileText size={14} className="text-red-600 dark:text-red-400" />
                                    PDF
                                </button>
                                <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-1.5 bg-[#FAFAF9] dark:bg-[#18181B] border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] text-[11px] font-bold rounded-lg hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors">
                                    <Printer size={14} className="text-blue-600 dark:text-blue-400" />
                                    Print
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-[#FAFAF9] dark:bg-[#18181B]/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Report Type</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value)}
                                    placeholder="e.g. Annual Report"
                                    className="w-full pl-3 pr-3 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Project Category</label>
                            <div className="relative">
                                <select 
                                    value={projectCategory}
                                    onChange={(e) => setProjectCategory(e.target.value)}
                                    className="w-full appearance-none pl-3 pr-10 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                >
                                    <option>All Projects</option>
                                    <option>Research</option>
                                    <option>Consultancy</option>
                                    <option>Others</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Department</label>
                            <div className="relative">
                                <select 
                                    value={selectedDepartment}
                                    onChange={(e) => {
                                        setSelectedDepartment(e.target.value);
                                        setSelectedPI("All Investigators");
                                    }}
                                    className="w-full appearance-none pl-3 pr-10 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                >
                                    <option>All Departments</option>
                                    {availableDepartments.map((dept) => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">
                                    {financialYear === "Custom Date Range" ? "Date Range" : "Year"}
                                </label>
                                {financialYear === "Custom Date Range" && (
                                    <button onClick={() => { setFinancialYear("All Time"); setCustomStartDate(""); setCustomEndDate(""); }} className="text-[10px] text-blue-600 hover:underline">Reset</button>
                                )}
                            </div>
                            
                            {financialYear === "Custom Date Range" ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="date" 
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="w-full appearance-none px-3 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]" 
                                    />
                                    <span className="text-[#A1A1AA] text-xs">to</span>
                                    <input 
                                        type="date" 
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="w-full appearance-none px-3 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]" 
                                    />
                                </div>
                            ) : (
                                <div className="relative">
                                    <select 
                                        value={financialYear}
                                        onChange={(e) => setFinancialYear(e.target.value)}
                                        className="w-full appearance-none pl-3 pr-10 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                    >
                                        <option value="All Time">All Time</option>
                                        <option value="2026">2026</option>
                                        <option value="2025">2025</option>
                                        <option value="2024">2024</option>
                                        <option value="2023">2023</option>
                                        <option value="2022">2022</option>
                                        <option value="2021">2021</option>
                                        <option value="2020">2020</option>
                                        <option value="2019">2019</option>
                                        <option value="Custom Date Range">Custom Date Range...</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Project Status</label>
                            <div className="relative">
                                <select 
                                    value={projectStatus}
                                    onChange={(e) => setProjectStatus(e.target.value)}
                                    className="w-full appearance-none pl-3 pr-10 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                >
                                    <option>All Statuses</option>
                                    <option>Draft</option>
                                    <option>Submitted</option>
                                    <option>Pending Sanction</option>
                                    <option>Approved Sanction</option>
                                    <option>Pending Fund Received</option>
                                    <option>Approved Fund Received</option>
                                    <option>Ongoing</option>
                                    <option>Completed</option>
                                    <option>Closed</option>
                                    <option>Cancelled</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />
                            </div>
                        </div>

                        <div className="space-y-1.5" ref={agencyDropdownRef}>
                            <label className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Funding Agency (Multiple)</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsAgencyDropdownOpen(!isAgencyDropdownOpen)}
                                    className="w-full appearance-none pl-3 pr-10 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] text-left truncate"
                                >
                                    {isAllAgenciesSelected
                                        ? "All Agencies"
                                        : selectedFundingAgencies.length === 0
                                            ? "No Agencies Selected"
                                            : selectedFundingAgencies.length === 1
                                                ? selectedFundingAgencies[0]
                                                : `${selectedFundingAgencies.length} agencies selected`}
                                </button>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />

                                {isAgencyDropdownOpen && (
                                    <div className="absolute z-50 min-w-[400px] max-w-[90vw] mt-1 bg-white dark:bg-[#27272A] border border-gray-300 dark:border-[#3F3F46] rounded shadow-md max-h-[450px] overflow-y-auto py-1">
                                        <label className="flex items-center px-2 py-1.5 hover:bg-[#e5e5e5] dark:hover:bg-[#3F3F46] cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isAllAgenciesSelected}
                                                onChange={(e) => {
                                                    setIsAllAgenciesSelected(e.target.checked);
                                                    setSelectedFundingAgencies([]);
                                                    setIsAllSchemesSelected(true);
                                                    setSelectedSchemes([]);
                                                }}
                                                className="w-3.5 h-3.5 rounded-sm border-gray-300 text-[#2563eb] focus:ring-0 accent-[#2563eb] cursor-pointer"
                                            />
                                            <span className="ml-2.5 text-[13px] text-gray-800 dark:text-[#E4E4E7] font-normal">All Agencies</span>
                                        </label>

                                        {availableAgencies.map((agency) => (
                                            <label key={agency} className="flex items-start px-2 py-1.5 hover:bg-[#e5e5e5] dark:hover:bg-[#3F3F46] cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllAgenciesSelected || selectedFundingAgencies.includes(agency)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            if (!isAllAgenciesSelected) {
                                                                setSelectedFundingAgencies([...selectedFundingAgencies, agency]);
                                                            }
                                                        } else if (isAllAgenciesSelected) {
                                                            setIsAllAgenciesSelected(false);
                                                            setSelectedFundingAgencies(availableAgencies.filter(a => a !== agency));
                                                        } else {
                                                            setSelectedFundingAgencies(selectedFundingAgencies.filter(a => a !== agency));
                                                        }
                                                        setIsAllSchemesSelected(true);
                                                        setSelectedSchemes([]);
                                                    }}
                                                    className="w-3.5 h-3.5 mt-0.5 rounded-sm border-gray-300 text-[#2563eb] focus:ring-0 accent-[#2563eb] cursor-pointer shrink-0"
                                                />
                                                <span className="ml-2.5 text-[13px] text-gray-800 dark:text-[#E4E4E7] font-normal leading-tight">{agency}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Principal Investigator</label>
                            <div className="relative">
                                <select 
                                    value={selectedPI}
                                    onChange={(e) => setSelectedPI(e.target.value)}
                                    className="w-full appearance-none pl-3 pr-10 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                >
                                    <option value="All Investigators">All Investigators</option>
                                    {availablePIs.map((pi) => (
                                        <option key={pi.email} value={pi.email}>{pi.name} ({pi.email})</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />
                            </div>
                        </div>

                        <div className="space-y-1.5" ref={schemeDropdownRef}>
                            <label className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Scheme (Multiple)</label>
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setIsSchemeDropdownOpen(!isSchemeDropdownOpen)}
                                    className="w-full appearance-none pl-3 pr-10 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] text-left truncate"
                                >
                                    {isAllSchemesSelected
                                        ? "All Schemes"
                                        : selectedSchemes.length === 0
                                            ? "No Schemes Selected"
                                            : selectedSchemes.length === 1
                                                ? selectedSchemes[0]
                                                : `${selectedSchemes.length} schemes selected`}
                                </button>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />

                                {isSchemeDropdownOpen && (
                                    <div className="absolute z-50 min-w-[400px] max-w-[90vw] mt-1 bg-white dark:bg-[#27272A] border border-gray-300 dark:border-[#3F3F46] rounded shadow-md max-h-[450px] overflow-y-auto py-1">
                                        <label className="flex items-center px-2 py-1.5 hover:bg-[#e5e5e5] dark:hover:bg-[#3F3F46] cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isAllSchemesSelected}
                                                onChange={(e) => {
                                                    setIsAllSchemesSelected(e.target.checked);
                                                    setSelectedSchemes([]);
                                                }}
                                                className="w-3.5 h-3.5 rounded-sm border-gray-300 text-[#2563eb] focus:ring-0 accent-[#2563eb] cursor-pointer"
                                            />
                                            <span className="ml-2.5 text-[13px] text-gray-800 dark:text-[#E4E4E7] font-normal">All Schemes</span>
                                        </label>

                                        {availableSchemes.map((scheme) => (
                                            <label key={scheme} className="flex items-start px-2 py-1.5 hover:bg-[#e5e5e5] dark:hover:bg-[#3F3F46] cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isAllSchemesSelected || selectedSchemes.includes(scheme)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            if (!isAllSchemesSelected) {
                                                                setSelectedSchemes([...selectedSchemes, scheme]);
                                                            }
                                                        } else if (isAllSchemesSelected) {
                                                            setIsAllSchemesSelected(false);
                                                            setSelectedSchemes(availableSchemes.filter(s => s !== scheme));
                                                        } else {
                                                            setSelectedSchemes(selectedSchemes.filter(s => s !== scheme));
                                                        }
                                                    }}
                                                    className="w-3.5 h-3.5 mt-0.5 rounded-sm border-gray-300 text-[#2563eb] focus:ring-0 accent-[#2563eb] cursor-pointer shrink-0"
                                                />
                                                <span className="ml-2.5 text-[13px] text-gray-800 dark:text-[#E4E4E7] font-normal leading-tight">{scheme}</span>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Data Validation</label>
                            <div className="relative">
                                <select 
                                    value={dataValidation}
                                    onChange={(e) => setDataValidation(e.target.value)}
                                    className="w-full appearance-none pl-3 pr-10 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                >
                                    <option value="All Records">All Records</option>
                                    <option value="Valid Projects Only">Valid Projects Only</option>
                                    <option value="Missing Project No.">Missing Project No.</option>
                                    <option value="Zero Sanctioned">Zero Sanctioned Amount</option>
                                    <option value="Missing Funding Agency">Missing Funding Agency</option>
                                    <option value="Missing Scheme">Missing Scheme</option>
                                    <option value="Missing/Zero Duration">Missing/Zero Duration</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />
                            </div>
                        </div>

                        <div className="flex items-end">
                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full h-[42px] flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-70 text-white text-[13px] font-bold rounded-xl shadow-sm transition-all"
                            >
                                {isGenerating ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Filter size={16} />
                                        Generate Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {hasGenerated && (() => {
                const totalSanctioned = filteredProjects.reduce((sum, p) => sum + getSanctionedAmount(p), 0);
                const formatLakhsCr = (amt: number) => {
                    if (amt >= 10000000) return `₹${(amt / 10000000).toFixed(2)} Cr`;
                    if (amt >= 100000) return `₹${(amt / 100000).toFixed(2)} L`;
                    return `₹${amt.toLocaleString("en-IN")}`;
                };
                const uniquePIs = new Set(filteredProjects.map(p => (p.pi_webmail || p.pi_name || "").toLowerCase()).filter(Boolean));
                const uniqueDepts = new Set(filteredProjects.map(p => {
                    const deptId = p.implementation_department || p.department;
                    return getDeptName && deptId ? getDeptName(deptId) : (deptId || "");
                }).filter(Boolean));

                const getStatusBadge = (status: string) => {
                    if (status === "● Active" || status === "Active") {
                        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">● Active</span>;
                    }
                    if (status === "Pending Fund Received") {
                        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">Pending Fund Received</span>;
                    }
                    if (status === "Pending Sanction") {
                        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">Pending Sanction</span>;
                    }
                    if (status === "Completed") {
                        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">Completed</span>;
                    }
                    if (status === "Cancelled") {
                        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400">Cancelled</span>;
                    }
                    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[#3F3F46] dark:text-[#E4E4E7]">{status}</span>;
                };

                const formatDate = (dateStr: string) => {
                    if (!dateStr) return "-";
                    return format(new Date(dateStr), "MMM dd, yyyy");
                };

                return (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-[15px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                            {reportType} — Preview
                        </h3>
                        <button onClick={handleReset} className="text-[12px] font-bold text-blue-600 hover:underline">
                            Clear Results
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <BarChart3 size={16} />
                                </div>
                                <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Total Projects</span>
                            </div>
                            <div className="text-[24px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">{filteredProjects.length}</div>
                        </div>
                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <Activity size={16} />
                                </div>
                                <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Total Sanctioned</span>
                            </div>
                            <div className="text-[24px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">{formatLakhsCr(totalSanctioned)}</div>
                        </div>
                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    <Award size={16} />
                                </div>
                                <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Departments</span>
                            </div>
                            <div className="text-[24px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">{uniqueDepts.size}</div>
                        </div>
                        <div className="bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <Users size={16} />
                                </div>
                                <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Investigators</span>
                            </div>
                            <div className="text-[24px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">{uniquePIs.size}</div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden mb-6">
                        <div className="p-5 border-b border-[#E4E4E7] dark:border-[#3F3F46] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <h3 className="text-[14px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Project Listing</h3>
                                <span className="text-[11px] font-semibold text-[#71717A] bg-[#F4F4F5] dark:bg-[#3F3F46] px-2 py-0.5 rounded-full">
                                    {filteredProjects.length} records
                                </span>
                                {isSyncingFunds && (
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1.5">
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Syncing Finance Data...
                                    </span>
                                )}
                                {isSyncingDates && (
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1.5">
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Syncing Sanction Dates...
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            {(isLoadingProjects || isSyncingDates) && projects.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-[#71717A]">
                                    <div className="w-8 h-8 border-2 border-[#2563eb]/30 border-t-[#2563eb] rounded-full animate-spin mb-3" />
                                    <div className="text-[13px] font-semibold">Loading project data…</div>
                                    <div className="text-[11px] text-[#A1A1AA] mt-1">Fetching all project records from the server</div>
                                </div>
                            ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA] text-[11px] font-extrabold uppercase tracking-widest border-b border-[#E4E4E7] dark:border-[#3F3F46]">
                                        <th className="px-4 py-3.5 w-[40px]">Sl.</th>
                                        <th className="px-4 py-3.5">Project No.</th>
                                        <th className="px-4 py-3.5">PI Name</th>
                                        <th className="px-4 py-3.5">Department</th>
                                        <th className="px-4 py-3.5">Type</th>
                                        <th className="px-4 py-3.5">Project Title</th>
                                        <th className="px-4 py-3.5">Funding Agency</th>
                                        <th className="px-4 py-3.5 text-right">Sanctioned</th>
                                        <th className="px-4 py-3.5 text-center">Start Date</th>
                                        <th className="px-4 py-3.5 text-center">Creation Date</th>
                                        <th className="px-4 py-3.5 text-center">Duration</th>
                                        <th className="px-4 py-3.5 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E4E4E7] dark:divide-[#3F3F46]">
                                    {filteredProjects.length === 0 ? (
                                        <tr>
                                            <td colSpan={11} className="px-6 py-16 text-center text-[#71717A] dark:text-[#A1A1AA] text-[13px]">
                                                No projects found matching the selected criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        pagedProjects.map((p, pageIndex) => {
                                            const index = (safeReportListPage - 1) * REPORT_LIST_PAGE_SIZE + pageIndex;
                                            const deptId = p.implementation_department || p.department;
                                            const deptName = getDeptName && deptId ? getDeptName(deptId) : (deptId || "—");
                                            const rawEmail = p.pi_webmail || p.pi_name || "";
                                            const resolvedName = getPiName && rawEmail ? getPiName(rawEmail) : "—";
                                            const status = getProjectStatusLabel(p);
                                            const sanctioned = getSanctionedAmount(p);
                                            const scheme = normalizeSchemeName(p.funding_agency_schemes || p.scheme_name || "");

                                            return (
                                                <tr key={p.name || index} className="hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] transition-colors">
                                                    <td className="px-4 py-3 text-[12px] font-mono font-semibold text-[#71717A] text-center">{index + 1}</td>
                                                    <td className="px-4 py-3 text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{p.project_no || "—"}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight group-hover:text-[#4f46e5] transition-colors">{resolvedName}</div>
                                                        {rawEmail && resolvedName.toLowerCase() !== rawEmail.toLowerCase() && (
                                                            <div className="text-[10px] font-medium text-[#71717A] dark:text-[#A1A1AA] mt-0.5">
                                                                {rawEmail}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-[12px] font-semibold text-[#71717A] dark:text-[#A1A1AA] max-w-[140px]">{deptName}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                                                            getProjectCategory(p) === "Research" ? "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400" :
                                                            getProjectCategory(p) === "Consultancy" ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" :
                                                            "bg-slate-100 dark:bg-slate-800 text-[#71717A] dark:text-[#A1A1AA]"
                                                        }`}>
                                                            {getProjectCategory(p)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] max-w-[320px] leading-snug line-clamp-2" title={p.project_title || ""}>{p.project_title || "—"}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-[11px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-2 max-w-[120px]" title={getAgency(p) || "—"}>{getAgency(p) || "—"}</div>
                                                        {scheme && scheme !== "—" && (
                                                            <div className="text-[10px] font-bold text-[#2563eb] mt-0.5 max-w-[120px] truncate" title={scheme}>{scheme}</div>
                                                        )}
                                                    </td>
                                                    <SanctionOverride
                                                        projectName={p.name}
                                                        isOngoing={!!(ongoingIds && (ongoingIds.has(p.name) || ongoingIds.has(p.project_no)))}
                                                        bulkAmount={sanctioned}
                                                        bulkDate={getEffectiveStartDate(p)}
                                                    >
                                                        {(amount, date) => (
                                                            <>
                                                                <td className="px-4 py-3 text-[12px] font-extrabold text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">{formatLakhsCr(amount)}</td>
                                                                <td className="px-4 py-3 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA] text-center whitespace-nowrap">
                                                                    {formatDate(date || "")}
                                                                </td>
                                                            </>
                                                        )}
                                                    </SanctionOverride>
                                                    <td className="px-4 py-3 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA] text-center whitespace-nowrap">
                                                        {formatDate(p.creation)}
                                                    </td>
                                                    <td className="px-4 py-3 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA] text-center whitespace-nowrap">
                                                        {formatDuration(getEffectiveStartDate(p), p.prj_end_date, p.project_duration_months)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">{getStatusBadge(status)}</td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                            )}
                        </div>
                        {filteredProjects.length > REPORT_LIST_PAGE_SIZE && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B]">
                                <span className="text-[11px] text-[#71717A] font-semibold">
                                    Showing {(safeReportListPage - 1) * REPORT_LIST_PAGE_SIZE + 1}–{Math.min(safeReportListPage * REPORT_LIST_PAGE_SIZE, filteredProjects.length)} of {filteredProjects.length} projects
                                </span>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => setReportListPage((p) => Math.max(1, p - 1))}
                                        disabled={safeReportListPage === 1}
                                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] disabled:opacity-40 hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors"
                                    >
                                        ‹ Prev
                                    </button>
                                    {Array.from({ length: Math.min(5, totalReportListPages) }, (_, i) => {
                                        const start = Math.max(1, Math.min(safeReportListPage - 2, totalReportListPages - 4));
                                        const page = start + i;
                                        return (
                                            <button
                                                key={page}
                                                onClick={() => setReportListPage(page)}
                                                className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-colors ${page === safeReportListPage
                                                    ? "bg-[#2563eb] text-white"
                                                    : "border border-[#E4E4E7] dark:border-[#3F3F46] text-[#71717A] hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46]"
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => setReportListPage((p) => Math.min(totalReportListPages, p + 1))}
                                        disabled={safeReportListPage === totalReportListPages}
                                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#E4E4E7] dark:border-[#3F3F46] text-[#3F3F46] dark:text-[#E4E4E7] disabled:opacity-40 hover:bg-[#E4E4E7] dark:hover:bg-[#3F3F46] transition-colors"
                                    >
                                        Next ›
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                );
            })()}
        </div>
    );
}
