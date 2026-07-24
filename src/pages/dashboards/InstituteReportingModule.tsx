import * as React from "react";
import {
    FileDown,
    Printer,
    FileSpreadsheet,
    FileText,
    Calendar,
    Building2,
    Users,
    Search,
    Filter,
    BarChart3,
    PieChart,
    ChevronDown,
    FileCheck2,
    Activity,
    Award
} from "lucide-react";
import { useFrappeGetDocList } from "frappe-react-sdk";
import { generateInstituteReportHtml } from "@/utils/instituteReportPrint";
import { format } from "date-fns";

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
    const [selectedFundingAgency, setSelectedFundingAgency] = React.useState("All Agencies");
    const [selectedSchemes, setSelectedSchemes] = React.useState<string[]>([]);
    const [isSchemeDropdownOpen, setIsSchemeDropdownOpen] = React.useState(false);
    const schemeDropdownRef = React.useRef<HTMLDivElement>(null);
    const [dataValidation, setDataValidation] = React.useState("All Records");

    const [sanctionDateMap, setSanctionDateMap] = React.useState<Map<string, string>>(new Map());
    const [isSyncingDates, setIsSyncingDates] = React.useState(false);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (schemeDropdownRef.current && !schemeDropdownRef.current.contains(event.target as Node)) {
                setIsSchemeDropdownOpen(false);
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
            if (selectedFundingAgency !== "All Agencies" && agency !== selectedFundingAgency) {
                return;
            }
            const scheme = p.funding_agency_schemes || p.scheme_name || "";
            if (scheme && scheme.trim() !== "" && scheme !== "—") {
                schemes.add(normalizeSchemeName(scheme));
            }
        });
        return Array.from(schemes).sort();
    }, [projects, selectedFundingAgency, normalizeSchemeName]);

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
    const [sanctionStateMap, setSanctionStateMap] = React.useState<Map<string, string>>(new Map());
    const [isSyncingFunds, setIsSyncingFunds] = React.useState(false);

    React.useEffect(() => {
        let isCancelled = false;
        
        const syncFunds = async () => {
            setIsSyncingFunds(true);
            
            const map = new Map<string, boolean>();
            // Only query projects that are ongoing or approved and have a sanctioned amount
            const projectsToFetch = projects.filter(p => {
                const isOngoingOrApproved = (ongoingIds && (ongoingIds.has(p.name) || ongoingIds.has(p.project_no))) || 
                                            (p.workflow_state || "").toLowerCase() === "approved" ||
                                            (p.workflow_state || "").toLowerCase().includes("sanction");
                return isOngoingOrApproved && (p.total_budget_amount > 0 || p.grand_total_proposal > 0);
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

    // ── Sanction Date Sync ──
    React.useEffect(() => {
        if (!projects || projects.length === 0) return;
        
        let isCancelled = false;
        
        const syncDates = async () => {
            setIsSyncingDates(true);
            const headers = { "Content-Type": "application/json" };
            const map = new Map<string, string>();
            const stateMap = new Map<string, string>();
            
            const projectsToFetch = projects.filter(p => {
                if (!ongoingIds) return true;
                if (ongoingIds.has(p.name) || ongoingIds.has(p.project_no)) return true;
                const s = (p.workflow_state || "").toLowerCase();
                return s === "approved" || s.includes("sanction");
            });
            
            const chunkSize = 3;
            for (let i = 0; i < projectsToFetch.length; i += chunkSize) {
                if (isCancelled) break;
                const chunk = projectsToFetch.slice(i, i + chunkSize);
                
                await Promise.all(chunk.map(async (p) => {
                    try {
                        const res = await fetch(`/api/method/rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project?project_name=${encodeURIComponent(p.name)}`, { headers }).then(r => r.json()).catch(() => null);
                        const raw = res;
                        let sanctionRecords: any[] = [];
                        if (raw) {
                            if (raw.message && raw.message.message && Array.isArray(raw.message.message)) sanctionRecords = raw.message.message;
                            else if (raw.message && Array.isArray(raw.message)) sanctionRecords = raw.message;
                            else if (Array.isArray(raw)) sanctionRecords = raw;
                            else if (raw.data && Array.isArray(raw.data)) sanctionRecords = raw.data;
                            else if (raw.message && raw.message.data && Array.isArray(raw.message.data)) sanctionRecords = raw.message.data;
                        }
                        const validSanctions = sanctionRecords;
                        if (validSanctions.length > 0) {
                            const rec = validSanctions[0];
                            if (rec.sanctioned_letter_date) {
                                map.set(p.name, rec.sanctioned_letter_date);
                                if (p.project_no) map.set(p.project_no, rec.sanctioned_letter_date);
                            }
                            const st = rec.sanction_workflow_status || rec.workflow_state;
                            if (st) {
                                stateMap.set(p.name, st);
                                if (p.project_no) stateMap.set(p.project_no, st);
                            }
                        }
                    } catch (e) {
                        // pass
                    }
                }));

                // Progressively update UI
                if (!isCancelled) {
                    setSanctionDateMap(new Map(map));
                    setSanctionStateMap(new Map(stateMap));
                }
            }
            if (!isCancelled) setIsSyncingDates(false);
        };

        syncDates();
        return () => { isCancelled = true; };
    }, [ongoingIds, projects]);



    const getProjectStatusLabel = React.useCallback((p: any) => {
        const isOngoingOrApproved = (ongoingIds && (ongoingIds.has(p.name) || ongoingIds.has(p.project_no))) || 
                                    (p.workflow_state || "").toLowerCase() === "approved" ||
                                    (p.workflow_state || "").toLowerCase().includes("sanction");

        if (isOngoingOrApproved) {
            const fund = p.total_budget_amount || p.grand_total_proposal || 0;
            const hasSanctionAmt = fund > 0;
            const hasStartDate = !!(sanctionDateMap.get(p.name) || sanctionDateMap.get(p.project_no) || p.sanctioned_letter_date);
            const sanctionState = sanctionStateMap.get(p.name) || sanctionStateMap.get(p.project_no) || "";
            const hasSanctionApproved = sanctionState.toLowerCase().includes("sanction approved");
            
            if (!hasSanctionAmt) return "Pending Sanction";
            
            // If the background sync has completed checking this project:
            if (fundStatusMap.has(p.name)) {
                const hasFundReceived = fundStatusMap.get(p.name);
                if (hasSanctionApproved && hasFundReceived) return "● Active";
                if (hasSanctionApproved) return "Pending Fund Received";
                return "Pending Sanction";
            }
            
            // Fallback while syncing: rely on heuristic
            if (hasSanctionApproved) return "Pending Fund Received";
            return "Pending Sanction";
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
                const pDate = sanctionDateMap.get(p.name) || sanctionDateMap.get(p.project_no) || p.sanctioned_letter_date;
                if (!pDate) return true; // If no date, let it pass or fail by other filters
                const d = new Date(pDate);
                if (isNaN(d.getTime())) return true;
                
                if (financialYear === "2025-2026") {
                    return d >= new Date("2025-04-01") && d <= new Date("2026-03-31T23:59:59");
                }
                if (financialYear === "2024-2025") {
                    return d >= new Date("2024-04-01") && d <= new Date("2025-03-31T23:59:59");
                }
                if (financialYear === "2023-2024") {
                    return d >= new Date("2023-04-01") && d <= new Date("2024-03-31T23:59:59");
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
                if (filterStatus === "active") return computed.includes("active");
                if (filterStatus === "pending fund received") return computed === "pending fund received";
                if (filterStatus === "pending sanction") return computed === "pending sanction";
                if (filterStatus === "completed") return computed.includes("complet");
                if (filterStatus === "closed") return computed.includes("clos");
                if (filterStatus === "cancelled") return computed.includes("cancel");
                
                // These check our calculated computed badge
                if (filterStatus === "approved fund received") return computed.includes("active");
                if (filterStatus === "approved sanction") return computed.includes("active") || computed === "pending fund received";
                
                return computed.includes(filterStatus);
            });
        }
        if (projectCategory && projectCategory !== "All Projects") {
            list = list.filter((p) => {
                const type = (p.project_type || "").toLowerCase();
                if (projectCategory === "Research") return type.includes("research") || type === "r&d project";
                if (projectCategory === "Consultancy") return type.includes("consult") || type === "testing";
                if (projectCategory === "Others") return !type.includes("research") && type !== "r&d project" && !type.includes("consult") && type !== "testing";
                return true;
            });
        }
        if (selectedPI && selectedPI !== "All Investigators") {
            list = list.filter((p) => {
                const rawEmail = p.pi_webmail || p.pi_name || "";
                return rawEmail.toLowerCase() === selectedPI.toLowerCase();
            });
        }
        if (selectedFundingAgency && selectedFundingAgency !== "All Agencies") {
            list = list.filter((p) => {
                const agency = getAgency(p);
                return agency === selectedFundingAgency;
            });
        }
        if (selectedSchemes && selectedSchemes.length > 0) {
            list = list.filter((p) => {
                const scheme = p.funding_agency_schemes || p.scheme_name || "";
                return selectedSchemes.includes(normalizeSchemeName(scheme));
            });
        }
        if (dataValidation && dataValidation !== "All Records") {
            list = list.filter((p) => {
                const hasProjectNo = !!(p.project_no && p.project_no !== "—" && p.project_no.trim() !== "");
                const sanctioned = Number(p.total_budget_amount || p.grand_total_proposal) || 0;
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
    }, [projects, selectedDepartment, getDeptName, projectStatus, getProjectStatusLabel, projectCategory, selectedPI, selectedFundingAgency, selectedSchemes, normalizeSchemeName, dataValidation, financialYear, customStartDate, customEndDate]);

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
            _overrideStartDate: sanctionDateMap.get(p.name) || sanctionDateMap.get(p.project_no) || p.sanctioned_letter_date,
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
            const calculateDuration = (start: string, end: string) => {
                if (!start || !end) return "";
                const d1 = new Date(start);
                const d2 = new Date(end);
                const months = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
                if (months <= 0) return "";
                if (months < 12) return `${months} Months`;
                const years = Math.floor(months / 12);
                const rem = months % 12;
                return rem > 0 ? `${years}y ${rem}m` : `${years} Years`;
            };
            const headers = ["Sl.", "Project No.", "PI Name", "PI Email", "Department", "Project Title", "Funding Agency", "Scheme", "Sanctioned (INR)", "Start Date", "Creation Date", "Duration", "Status"];
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
                    `"${String(p.project_title || "").replace(/"/g, '""')}"`,
                    `"${String(agency).replace(/"/g, '""')}"`,
                    `"${String(scheme).replace(/"/g, '""')}"`,
                    p.total_budget_amount || p.grand_total_proposal || 0,
                    `"${formatDate(sanctionDateMap.get(p.name) || sanctionDateMap.get(p.project_no) || p.sanctioned_letter_date)}"`,
                    `"${formatDate(p.creation)}"`,
                    `"${calculateDuration(sanctionDateMap.get(p.name) || sanctionDateMap.get(p.project_no) || p.sanctioned_letter_date, p.prj_end_date)}"`,
                    `"${getProjectStatusLabel(p)}"`
                ].join(",");
            });
            const csvString = [headers.join(","), ...rows].join("\n");
            const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `${reportType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
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
                                <select 
                                    value={reportType}
                                    onChange={(e) => setReportType(e.target.value)}
                                    className="w-full appearance-none pl-3 pr-10 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                >
                                    <option>Annual Report</option>
                                    <option>Director's Report</option>
                                    <option>Board Report</option>
                                    <option>Accreditation Report (NAAC/NBA)</option>
                                    <option>Ranking Report (NIRF)</option>
                                    <option>Department-wise Analytics</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />
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
                                    {financialYear === "Custom Date Range" ? "Date Range" : "Financial Year"}
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
                                        <option value="2025-2026">2025-2026</option>
                                        <option value="2024-2025">2024-2025</option>
                                        <option value="2023-2024">2023-2024</option>
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
                                    <option>Active</option>
                                    <option>Pending Fund Received</option>
                                    <option>Pending Sanction</option>
                                    <option>Completed</option>
                                    <option>Closed</option>
                                    <option>Cancelled</option>
                                    <option>Approved Sanction</option>
                                    <option>Approved Fund Received</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider">Funding Agency</label>
                            <div className="relative">
                                <select 
                                    value={selectedFundingAgency}
                                    onChange={(e) => {
                                        setSelectedFundingAgency(e.target.value);
                                        setSelectedSchemes([]);
                                    }}
                                    className="w-full appearance-none pl-3 pr-10 py-2.5 bg-white dark:bg-[#27272A] border border-[#E4E4E7] dark:border-[#3F3F46] rounded-xl text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] outline-none transition-all focus:border-[#2563eb] focus:ring-1 focus:ring-[#2563eb]"
                                >
                                    <option value="All Agencies">All Agencies</option>
                                    {availableAgencies.map((agency) => (
                                        <option key={agency} value={agency}>{agency}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#A1A1AA] pointer-events-none" size={14} />
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
                                    {selectedSchemes.length === 0 
                                        ? "All Schemes" 
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
                                                checked={selectedSchemes.length === 0}
                                                onChange={() => setSelectedSchemes([])}
                                                className="w-3.5 h-3.5 rounded-sm border-gray-300 text-[#2563eb] focus:ring-0 accent-[#2563eb] cursor-pointer"
                                            />
                                            <span className="ml-2.5 text-[13px] text-gray-800 dark:text-[#E4E4E7] font-normal">All Schemes</span>
                                        </label>
                                        
                                        {availableSchemes.map((scheme) => (
                                            <label key={scheme} className="flex items-start px-2 py-1.5 hover:bg-[#e5e5e5] dark:hover:bg-[#3F3F46] cursor-pointer">
                                                <input 
                                                    type="checkbox"
                                                    checked={selectedSchemes.includes(scheme)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedSchemes([...selectedSchemes, scheme]);
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
                const totalSanctioned = filteredProjects.reduce((sum, p) => sum + (Number(p.total_budget_amount || p.grand_total_proposal) || 0), 0);
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
                                            <td colSpan={9} className="px-6 py-16 text-center text-[#71717A] dark:text-[#A1A1AA] text-[13px]">
                                                No projects found matching the selected criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProjects.map((p, index) => {
                                            const deptId = p.implementation_department || p.department;
                                            const deptName = getDeptName && deptId ? getDeptName(deptId) : (deptId || "—");
                                            const rawEmail = p.pi_webmail || p.pi_name || "";
                                            const resolvedName = getPiName && rawEmail ? getPiName(rawEmail) : "—";
                                            const agency = p.select_funding_agency || p.funding_agency_name || p.funding_agency || p.origin_of_funding_agency || p.funding_agency_other || "—";
                                            const status = getProjectStatusLabel(p);
                                            const sanctioned = Number(p.total_budget_amount || p.grand_total_proposal) || 0;
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
                                                    <td className="px-4 py-3 text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] max-w-[320px] leading-snug line-clamp-2" title={p.project_title || ""}>{p.project_title || "—"}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="text-[11px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] leading-tight line-clamp-2 max-w-[120px]" title={getAgency(p) || "—"}>{getAgency(p) || "—"}</div>
                                                        {scheme && scheme !== "—" && (
                                                            <div className="text-[10px] font-bold text-[#2563eb] mt-0.5 max-w-[120px] truncate" title={scheme}>{scheme}</div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-[12px] font-extrabold text-emerald-600 dark:text-emerald-400 text-right whitespace-nowrap">{formatLakhsCr(sanctioned)}</td>
                                                    <td className="px-4 py-3 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA] text-center whitespace-nowrap">
                                                        {formatDate(sanctionDateMap.get(p.name) || sanctionDateMap.get(p.project_no) || p.sanctioned_letter_date)}
                                                    </td>
                                                    <td className="px-4 py-3 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA] text-center whitespace-nowrap">
                                                        {formatDate(p.creation)}
                                                    </td>
                                                    <td className="px-4 py-3 text-[11px] font-semibold text-[#71717A] dark:text-[#A1A1AA] text-center whitespace-nowrap">
                                                        {p.project_duration_months
                                                            ? `${Math.round(Number(p.project_duration_months) / 12)} Years`
                                                            : "—"}
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
                    </div>
                </div>
                );
            })()}
        </div>
    );
}
