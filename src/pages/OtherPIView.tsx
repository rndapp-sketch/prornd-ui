import * as React from "react";
import { useFrappeAuth, useFrappeGetDocList } from "frappe-react-sdk";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
    Plane,
    Receipt,
    FileText,
    ClipboardList,
    ShoppingCart,
    SearchIcon,
    ChevronRightIcon,
    PlusCircle,
    UserCheck,
    AlertCircle,
    RefreshCw,
    ReceiptText,
} from "lucide-react";
import { isTravelAdvancePaid, travelRequestedAdvance } from "@/services/travelSettlement";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import "@/pages/dashboards/projectStaffDashboard.css";

interface OtherPIFormDoc {
    name: string;
    doctype: string;
    title: string;
    applicant: string;
    other_pi: string;
    workflow_state: string;
    creation?: string;
    detailRoute: string;
}

interface SettleTravelRow {
    name: string;
    owner?: string;
    webmail_id_travel?: string;
    workflow_state?: string;
    travel_financial_assistance?: string;
    do_you_need_advance?: string;
    travel_project_number?: string;
}

const FORM_TYPES = [
    {
        key: "travel",
        label: "Travel Application",
        icon: Plane,
        color: "from-blue-500/20 to-indigo-500/20 text-blue-500 dark:text-blue-400 border-blue-500/30",
        btnColor: "bg-blue-600 hover:bg-blue-700 text-white",
        desc: "Apply for travel funded by another PI's project budget.",
        route: "/travel?other_pi=1",
    },
    {
        key: "reimbursement",
        label: "Reimbursement",
        icon: Receipt,
        color: "from-emerald-500/20 to-teal-500/20 text-emerald-500 dark:text-emerald-400 border-emerald-500/30",
        btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
        desc: "Claim expense reimbursements charged to another PI's project.",
        route: "/reimbursement?other_pi=1",
    },
    {
        key: "igf",
        label: "Indent General Form",
        icon: FileText,
        color: "from-amber-500/20 to-orange-500/20 text-amber-500 dark:text-amber-400 border-amber-500/30",
        btnColor: "bg-amber-600 hover:bg-amber-700 text-white",
        desc: "General purchase requisitions under another PI's account.",
        route: "/indent-general-form?other_pi=1",
    },
    {
        key: "icss",
        label: "Indent Cum Sanction Sheet",
        icon: ClipboardList,
        color: "from-purple-500/20 to-pink-500/20 text-purple-500 dark:text-purple-400 border-purple-500/30",
        btnColor: "bg-purple-600 hover:bg-purple-700 text-white",
        desc: "Composite sanction sheet & PO for high-value items.",
        route: "/indent-cum-sanction-sheet?other_pi=1",
    },
    {
        key: "direct_purchase",
        label: "Direct Purchase",
        icon: ShoppingCart,
        color: "from-rose-500/20 to-red-500/20 text-rose-500 dark:text-rose-400 border-rose-500/30",
        btnColor: "bg-rose-600 hover:bg-rose-700 text-white",
        desc: "Direct purchases charged to another PI's project.",
        route: "/direct-purchase?other_pi=1",
    },
];

export function OtherPIView() {
    const { currentUser } = useFrappeAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedDocType, setSelectedDocType] = React.useState<string>("all");
    const [statusFilter, setStatusFilter] = React.useState<string>("all");

    // 1. Fetch Travel documents with travel_other_pi == "Other"
    const { data: travelDocs, isLoading: loadingTravel, mutate: mutateTravel } = useFrappeGetDocList("Travel", {
        fields: ["name", "owner", "applicant_name_travel", "webmail_id_travel", "travel_other_pi_id", "workflow_state", "creation", "travel_financial_assistance", "do_you_need_advance", "travel_project_number"],
        filters: [["travel_other_pi", "=", "Other"]],
        orFilters: [["owner", "=", currentUser || "__none__"], ["travel_other_pi_id", "=", currentUser || "__none__"]],
        limit: 100,
        orderBy: { field: "creation", order: "desc" },
    });

    // Settle for the applicant who initiated an Other PI travel. The PI settles from their
    // project page, which the applicant cannot reach, so the registry offers it here under
    // the same rule as TravelDetails: Approved, no TA/DA Settlement yet, and — when an
    // advance was asked for — only once that advance has been paid.
    const ownApprovedTravels = React.useMemo(
        () =>
            ((travelDocs || []) as SettleTravelRow[]).filter(
                (doc) =>
                    doc.workflow_state === "Approved" &&
                    !!currentUser &&
                    String(doc.webmail_id_travel || doc.owner || "").toLowerCase() === currentUser.toLowerCase(),
            ),
        [travelDocs, currentUser],
    );
    const ownApprovedNames = ownApprovedTravels.map((doc) => doc.name);

    const { data: tadaDocs, isLoading: loadingTada } = useFrappeGetDocList("TA DA Settlement", {
        fields: ["name", "ta_da_travel_application"],
        filters: [["ta_da_travel_application", "in", ownApprovedNames.length ? ownApprovedNames : ["__none__"]]],
        limit: 500,
    });
    const settlementByTravel = React.useMemo(() => {
        const map: Record<string, string> = {};
        ((tadaDocs || []) as { name: string; ta_da_travel_application?: string }[]).forEach((s) => {
            if (s.ta_da_travel_application && !map[s.ta_da_travel_application]) {
                map[s.ta_da_travel_application] = s.name;
            }
        });
        return map;
    }, [tadaDocs]);

    const [settleableTravels, setSettleableTravels] = React.useState<Record<string, boolean>>({});
    React.useEffect(() => {
        if (loadingTada) return;
        let cancelled = false;
        const candidates = ownApprovedTravels.filter((doc) => !settlementByTravel[doc.name]);
        Promise.all(
            candidates.map(async (doc) => {
                const needsAdvance = travelRequestedAdvance(doc);
                const ok = needsAdvance
                    ? await isTravelAdvancePaid(doc.name, doc.travel_project_number || "")
                    : true;
                return [doc.name, ok] as const;
            }),
        ).then((entries) => {
            if (!cancelled) setSettleableTravels(Object.fromEntries(entries));
        });
        return () => {
            cancelled = true;
        };
    }, [ownApprovedTravels, settlementByTravel, loadingTada]);
    const travelByName = React.useMemo(() => {
        const map: Record<string, SettleTravelRow> = {};
        ((travelDocs || []) as SettleTravelRow[]).forEach((doc) => { map[doc.name] = doc; });
        return map;
    }, [travelDocs]);

    // 2. Fetch Reimbursement documents with pi_webmail_id
    const { data: reimbursementDocs, isLoading: loadingReimb, mutate: mutateReimb } = useFrappeGetDocList("Reimbursement", {
        fields: ["name", "owner", "applicant_webmail", "reimbursement_for_id", "workflow_state", "creation"],
        filters: [["self_other", "=", "Other"]],
        orFilters: [["owner", "=", currentUser || "__none__"], ["reimbursement_for_id", "=", currentUser || "__none__"]],
        limit: 100,
        orderBy: { field: "creation", order: "desc" },
    });

    // 3. Fetch Indent General Form documents with igf_other_pi == "Other"
    const { data: igfDocs, isLoading: loadingIgf, mutate: mutateIgf } = useFrappeGetDocList("Indent General Form", {
        fields: ["name", "owner", "igf_indenter", "igf_webmail_id", "igf_other_pi_id", "workflow_state", "creation"],
        filters: [["igf_other_pi", "=", "Other"]],
        orFilters: [["owner", "=", currentUser || "__none__"], ["igf_other_pi_id", "=", currentUser || "__none__"]],
        limit: 100,
        orderBy: { field: "creation", order: "desc" },
    });

    // 4. Fetch Indent Cum Sanction Sheet documents with icss_other_pi == "Other"
    const { data: icssDocs, isLoading: loadingIcss, mutate: mutateIcss } = useFrappeGetDocList("Indent Cum Sanction Sheet", {
        fields: ["name", "owner", "icss_applicant_name", "icss_applicant_webmail_id", "icss_other_pi_id", "workflow_state", "creation"],
        filters: [["icss_other_pi", "=", "Other"]],
        orFilters: [["owner", "=", currentUser || "__none__"], ["icss_other_pi_id", "=", currentUser || "__none__"]],
        limit: 100,
        orderBy: { field: "creation", order: "desc" },
    });

    // 5. Fetch Direct Purchase documents with dp_other_pi == "Other"
    const { data: dpDocs, isLoading: loadingDp, mutate: mutateDp } = useFrappeGetDocList("Direct Purchase", {
        fields: ["name", "owner", "applicant_name", "dp_other_pi_id", "workflow_state", "creation"],
        filters: [["dp_other_pi", "=", "Other"]],
        orFilters: [["owner", "=", currentUser || "__none__"], ["dp_other_pi_id", "=", currentUser || "__none__"]],
        limit: 100,
        orderBy: { field: "creation", order: "desc" },
    });

    const isLoading = loadingTravel || loadingReimb || loadingIgf || loadingIcss || loadingDp;

    const handleRefreshAll = () => {
        mutateTravel();
        mutateReimb();
        mutateIgf();
        mutateIcss();
        mutateDp();
    };

    // Combine all docs into a single normalized list
    const combinedDocs = React.useMemo(() => {
        const list: OtherPIFormDoc[] = [];

        if (travelDocs) {
            travelDocs.forEach((doc: any) => {
                list.push({
                    name: doc.name,
                    doctype: "Travel",
                    title: `Travel Application (${doc.name})`,
                    applicant: doc.applicant_name_travel || doc.webmail_id_travel || "N/A",
                    other_pi: doc.travel_other_pi_id || "N/A",
                    workflow_state: doc.workflow_state || "Draft",
                    creation: doc.creation,
                    detailRoute: `/travel/${doc.name}`,
                });
            });
        }

        if (reimbursementDocs) {
            reimbursementDocs.forEach((doc: any) => {
                list.push({
                    name: doc.name,
                    doctype: "Reimbursement",
                    title: `Reimbursement (${doc.name})`,
                    applicant: doc.applicant_webmail || "N/A",
                    other_pi: doc.reimbursement_for_id || "N/A",
                    workflow_state: doc.workflow_state || "Draft",
                    creation: doc.creation,
                    detailRoute: `/reimbursement/${doc.name}`,
                });
            });
        }

        if (igfDocs) {
            igfDocs.forEach((doc: any) => {
                list.push({
                    name: doc.name,
                    doctype: "Indent General Form",
                    title: `General Indent (${doc.name})`,
                    applicant: doc.igf_indenter || doc.igf_webmail_id || "N/A",
                    other_pi: doc.igf_other_pi_id || "N/A",
                    workflow_state: doc.workflow_state || "Draft",
                    creation: doc.creation,
                    detailRoute: `/indent-general-form-details/${doc.name}`,
                });
            });
        }

        if (icssDocs) {
            icssDocs.forEach((doc: any) => {
                list.push({
                    name: doc.name,
                    doctype: "Indent Cum Sanction Sheet",
                    title: `ICSS Sanction Sheet (${doc.name})`,
                    applicant: doc.icss_applicant_name || doc.icss_applicant_webmail_id || "N/A",
                    other_pi: doc.icss_other_pi_id || "N/A",
                    workflow_state: doc.workflow_state || "Draft",
                    creation: doc.creation,
                    detailRoute: `/indent-cum-sanction-sheet/${doc.name}`,
                });
            });
        }

        if (dpDocs) {
            dpDocs.forEach((doc: any) => {
                list.push({
                    name: doc.name,
                    doctype: "Direct Purchase",
                    title: `Direct Purchase (${doc.name})`,
                    applicant: doc.applicant_name || doc.owner || "N/A",
                    other_pi: doc.dp_other_pi_id || "N/A",
                    workflow_state: doc.workflow_state || "Draft",
                    creation: doc.creation,
                    detailRoute: `/direct-purchase/${doc.name}`,
                });
            });
        }

        return list.sort((a, b) => {
            const dateA = a.creation ? new Date(a.creation).getTime() : 0;
            const dateB = b.creation ? new Date(b.creation).getTime() : 0;
            return dateB - dateA;
        });
    }, [travelDocs, reimbursementDocs, igfDocs, icssDocs, dpDocs]);

    // Filter by search, doctype, and status
    const filteredDocs = React.useMemo(() => {
        return combinedDocs.filter((doc) => {
            const matchesSearch =
                !searchTerm ||
                doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.applicant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.other_pi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                doc.workflow_state.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesDocType =
                selectedDocType === "all" || doc.doctype.toLowerCase().replace(/\s+/g, "_") === selectedDocType.toLowerCase();

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "pending" && doc.workflow_state.toLowerCase().includes("pending")) ||
                (statusFilter === "approved" && doc.workflow_state.toLowerCase().includes("approved")) ||
                (statusFilter === "rejected" && doc.workflow_state.toLowerCase().includes("rejected"));

            return matchesSearch && matchesDocType && matchesStatus;
        });
    }, [combinedDocs, searchTerm, selectedDocType, statusFilter]);

    const getStatusBadge = (state: string) => {
        const lower = state.toLowerCase();
        const pill = (tone: string, dot: string, label: string) => (
            <span className={cn("inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", tone)}>
                <span className={cn("size-1.5 rounded-full", dot)} />
                {label}
            </span>
        );
        if (lower.includes("approved")) return pill("bg-[var(--psd-approved-bg)] text-[#0A7F58] dark:text-emerald-300", "bg-[var(--psd-approved)]", "Approved");
        if (lower.includes("rejected")) return pill("bg-[var(--psd-returned-bg)] text-[#C42B3C] dark:text-rose-300", "bg-[var(--psd-returned)]", "Rejected");
        if (lower.includes("pending other pi") || lower.includes("pending pi")) return pill("bg-[var(--psd-primary-light)] text-[var(--psd-primary)]", "bg-[var(--psd-primary)]", state);
        if (lower.includes("pending")) return pill("bg-[var(--psd-review-bg)] text-[#B45309] dark:text-amber-300", "bg-[var(--psd-review)]", state);
        return pill("bg-[var(--psd-info-bg)] text-[#2F5BC4] dark:text-blue-300", "bg-[var(--psd-info)]", state);
    };

    const thClass =
        "relative px-3 py-1.5 h-8 whitespace-nowrap text-[10.5px] font-bold uppercase tracking-wider text-[#33441F] dark:text-[#D5E2C2] after:absolute after:right-0 after:top-[25%] after:h-1/2 after:w-px after:rounded-full after:bg-[#9DAE85] dark:after:bg-[#5C6D4D] last:after:hidden";
    const tdClass =
        "relative px-3 py-2 text-[12.5px] after:absolute after:right-0 after:top-[22%] after:h-[56%] after:w-px after:rounded-full after:bg-[#DDE3D2] dark:after:bg-[#3F4A36] last:after:hidden";

    // One colour per application type for the quick-apply cards
    const TYPE_HEX: Record<string, string> = {
        travel: "#4775E8",
        reimbursement: "#0DA875",
        igf: "#E99A16",
        icss: "#6842D9",
        direct_purchase: "#E94B60",
    };

    return (
        <div className="psd-root w-full space-y-3 animate-in fade-in duration-500">
            {/* Header */}
            <header className="psd-hero relative flex flex-col gap-2 overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box] px-3 py-2 md:flex-row md:items-center md:justify-between">
                <div className="relative z-10 flex min-w-0 items-center gap-2.5">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
                        <UserCheck className="size-4" strokeWidth={1.8} />
                    </div>
                    <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">Other PI Projects</div>
                        <h1 className="mt-0.5 text-[17px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">
                            Other PI Applications &amp; Forms
                        </h1>
                    </div>
                </div>
                <p className="relative z-10 hidden text-xs text-[var(--psd-body)] lg:block">
                    Submit and track applications charged to another Principal Investigator's project.
                </p>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshAll}
                    disabled={isLoading}
                    className="psd-focus relative z-10 h-8 gap-2 self-start border-[var(--psd-border)] bg-[var(--psd-surface)] text-[12px] font-semibold hover:border-[var(--psd-primary)] hover:text-[var(--psd-primary)] md:self-auto"
                >
                    <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </header>

            {/* Quick apply */}
            <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-[var(--psd-body)]">
                    <PlusCircle className="h-4 w-4 text-[var(--psd-primary)]" />
                    Create new "Other PI" application
                    <span className="h-px flex-1 bg-[var(--psd-border)]" />
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {FORM_TYPES.map((item) => {
                        const Icon = item.icon;
                        const c = TYPE_HEX[item.key] ?? "#6842D9";
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => navigate(item.route)}
                                // Same tinted gradient as the PI Home quick-action cards (mixed with the surface, so it suits dark mode too)
                                style={{
                                    backgroundImage: `linear-gradient(135deg, color-mix(in srgb, ${c} 16%, var(--psd-surface)), color-mix(in srgb, ${c} 32%, var(--psd-surface)))`,
                                    borderColor: `color-mix(in srgb, ${c} 45%, transparent)`,
                                }}
                                className="psd-focus group flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                            >
                                <span
                                    className="grid size-8 shrink-0 place-items-center rounded-md bg-[var(--psd-surface)] shadow-sm transition-transform duration-200 group-hover:scale-110"
                                    style={{ color: c }}
                                >
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[12.5px] font-bold leading-tight text-[var(--psd-heading)]">{item.label}</span>
                                    <span className="line-clamp-2 text-[10.5px] font-medium leading-snug text-[var(--psd-heading)]/75">{item.desc}</span>
                                </span>
                                <ChevronRightIcon className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: c }} />
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Registry */}
            <div className="psd-card overflow-hidden !rounded-xl">
                <div className="flex flex-col gap-2 border-b border-[var(--psd-border)] px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-[14px] font-bold text-[var(--psd-heading)]">
                            Other PI Applications Registry
                            <span className="ml-2 rounded-full bg-[var(--psd-primary-light)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--psd-primary)]">
                                {filteredDocs.length}
                            </span>
                        </h2>
                        <p className="text-[12px] text-[var(--psd-body)]">
                            Forms where travel or expenditure is charged to another PI's project.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="relative w-full sm:w-64">
                            <SearchIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#71717A]" />
                            <Input
                                placeholder="Search by ID, applicant, or PI..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-8 border-[var(--psd-border)] bg-[var(--psd-surface)] pl-8 text-[12px] focus-visible:border-[var(--psd-primary)] focus-visible:ring-[var(--psd-primary)]/20"
                            />
                        </div>
                        <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                            <SelectTrigger className="h-8 w-[150px] border-[var(--psd-border)] bg-[var(--psd-surface)] text-[12px]">
                                <SelectValue placeholder="Form Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Form Types</SelectItem>
                                <SelectItem value="travel">Travel</SelectItem>
                                <SelectItem value="reimbursement">Reimbursement</SelectItem>
                                <SelectItem value="indent_general_form">General Indent</SelectItem>
                                <SelectItem value="indent_cum_sanction_sheet">ICSS Sheet</SelectItem>
                                <SelectItem value="direct_purchase">Direct Purchase</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-8 w-[130px] border-[var(--psd-border)] bg-[var(--psd-surface)] text-[12px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-[#DCE6CD] dark:bg-[#34402B]">
                            <TableRow className="border-b border-[#BBC9A4] hover:bg-transparent dark:border-[#4B5A3E]">
                                <TableHead className={cn(thClass, "w-[140px]")}>Document ID</TableHead>
                                <TableHead className={cn(thClass, "w-[180px]")}>Form Type</TableHead>
                                <TableHead className={thClass}>Applicant</TableHead>
                                <TableHead className={thClass}>Designated Other PI</TableHead>
                                <TableHead className={thClass}>Workflow Status</TableHead>
                                <TableHead className={cn(thClass, "w-[130px]")}>Created</TableHead>
                                <TableHead className={cn(thClass, "w-[90px] text-right whitespace-nowrap")}>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-[#71717A]">
                                        <div className="flex items-center justify-center gap-2 text-[13px]">
                                            <RefreshCw className="h-4 w-4 animate-spin text-[var(--psd-primary)]" />
                                            <span>Loading Other PI applications...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredDocs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-28 text-center">
                                        <div className="flex flex-col items-center justify-center gap-1">
                                            <AlertCircle className="h-7 w-7 text-[#A1A1AA]" />
                                            <p className="text-[13px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">No "Other PI" applications found.</p>
                                            <p className="text-[12px] text-[#71717A]">
                                                Use the cards above to submit a new Travel, Reimbursement, or Indent form under another PI.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDocs.map((doc) => (
                                    <TableRow
                                        key={doc.name}
                                        className="cursor-pointer border-b border-[var(--psd-border)] transition-colors hover:bg-[var(--psd-primary-light)]/40"
                                        onClick={() => navigate(doc.detailRoute)}
                                    >
                                        <TableCell className={cn(tdClass, "bg-[#F1E8F9] font-mono font-bold text-[#7A46AE] dark:bg-[#33243F] dark:text-[#D3B4F0] whitespace-nowrap")}>{doc.name}</TableCell>
                                        <TableCell className={tdClass}>
                                            <span className="inline-flex whitespace-nowrap rounded-md bg-[var(--psd-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--psd-body)] ring-1 ring-[var(--psd-border)]">
                                                {doc.doctype}
                                            </span>
                                        </TableCell>
                                        <TableCell className={cn(tdClass, "font-semibold text-[var(--psd-heading)]")}>{doc.applicant}</TableCell>
                                        <TableCell className={cn(tdClass, "text-[var(--psd-body)]")}>{doc.other_pi}</TableCell>
                                        <TableCell className={tdClass}>{getStatusBadge(doc.workflow_state)}</TableCell>
                                        <TableCell className={cn(tdClass, "whitespace-nowrap text-[var(--psd-body)]")}>
                                            {doc.creation ? format(new Date(doc.creation), "dd MMM yyyy") : "N/A"}
                                        </TableCell>
                                        <TableCell className={cn(tdClass, "text-right whitespace-nowrap")}>
                                            {doc.doctype === "Travel" && settleableTravels[doc.name] && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 gap-1 px-2 text-[12px] font-semibold text-[#B45309]"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const projectNo = travelByName[doc.name]?.travel_project_number || "";
                                                        navigate(`/ta-da-settlement?project=${encodeURIComponent(projectNo)}&travel_ref=${encodeURIComponent(doc.name)}`);
                                                    }}
                                                >
                                                    <ReceiptText className="h-3.5 w-3.5" />
                                                    Settle
                                                </Button>
                                            )}
                                            {doc.doctype === "Travel" && settlementByTravel[doc.name] && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 gap-1 px-2 text-[12px] font-semibold text-[var(--psd-body)]"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/ta-da-settlement?edit=${encodeURIComponent(settlementByTravel[doc.name])}`);
                                                    }}
                                                >
                                                    Settlement
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 gap-1 px-2 text-[12px] font-semibold text-[var(--psd-primary)]"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(doc.detailRoute);
                                                }}
                                            >
                                                View
                                                <ChevronRightIcon className="h-3.5 w-3.5" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

export default OtherPIView;
