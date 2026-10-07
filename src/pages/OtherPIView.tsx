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
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
        fields: ["name", "owner", "applicant_name_travel", "webmail_id_travel", "travel_other_pi_id", "workflow_state", "creation"],
        filters: [["travel_other_pi", "=", "Other"]],
        orFilters: [["owner", "=", currentUser || "__none__"], ["travel_other_pi_id", "=", currentUser || "__none__"]],
        limit: 100,
        orderBy: { field: "creation", order: "desc" },
    });

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
        const base = "text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap";
        if (lower.includes("approved")) {
            return <Badge className={cn(base, "bg-emerald-50 text-emerald-700 border-emerald-200")}>Approved</Badge>;
        }
        if (lower.includes("rejected")) {
            return <Badge className={cn(base, "bg-rose-50 text-rose-700 border-rose-200")}>Rejected</Badge>;
        }
        if (lower.includes("pending other pi") || lower.includes("pending pi")) {
            return <Badge className={cn(base, "bg-purple-50 text-purple-700 border-purple-200")}>{state}</Badge>;
        }
        if (lower.includes("pending")) {
            return <Badge className={cn(base, "bg-amber-50 text-amber-700 border-amber-200")}>{state}</Badge>;
        }
        return <Badge variant="outline" className={base}>{state}</Badge>;
    };

    const thClass =
        "px-3 py-2 h-9 whitespace-nowrap text-[11px] font-extrabold uppercase tracking-wider text-[#1E3A8A] dark:text-[#C7D2FE] border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25 last:border-r-0";
    const tdClass = "px-3 py-2 text-[12px] border-r border-[#F4F4F5] dark:border-[#3F3F46]/80 last:border-r-0";

    return (
        <div className="w-full space-y-3 animate-in fade-in duration-500">
            {/* Header */}
            <div className="overflow-hidden rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
                <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                <div className="flex flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4A6CF7] dark:bg-[#4A6CF7]/15">
                            <UserCheck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">Other PI Projects</span>
                            <h1 className="font-sans text-[18px] font-extrabold leading-tight text-[#3F3F46] dark:text-[#E4E4E7]">
                                Other PI Applications &amp; Forms
                            </h1>
                            <p className="text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                Submit and track applications charged to another Principal Investigator's project.
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshAll}
                        disabled={isLoading}
                        className="h-8 self-start gap-2 text-[12px] md:self-auto"
                    >
                        <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Quick apply */}
            <div className="space-y-2">
                <h2 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-wide text-[#3F3F46] dark:text-[#E4E4E7]">
                    <PlusCircle className="h-4 w-4 text-[#4A6CF7]" />
                    Create new "Other PI" application
                </h2>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {FORM_TYPES.map((item) => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.key}
                                type="button"
                                onClick={() => navigate(item.route)}
                                className={cn(
                                    "group flex flex-col gap-2 rounded-lg border bg-gradient-to-br p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                                    item.color,
                                )}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background/80">
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <span className="text-[13px] font-bold leading-tight text-[#3F3F46] dark:text-[#E4E4E7]">{item.label}</span>
                                </div>
                                <p className="line-clamp-2 text-[12px] leading-snug text-[#52525B] dark:text-[#A1A1AA]">{item.desc}</p>
                                <span className={cn("mt-auto inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-[12px] font-semibold", item.btnColor)}>
                                    Apply Now
                                    <ChevronRightIcon className="h-3.5 w-3.5" />
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Registry */}
            <div className="rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden">
                <div className="flex flex-col gap-2 border-b border-[#E4E4E7] dark:border-[#3F3F46] px-3 py-2 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0">
                        <h2 className="text-[14px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                            Other PI Applications Registry
                            <span className="ml-2 rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-bold text-[#1E3A8A] dark:bg-[#4A6CF7]/15 dark:text-[#C7D2FE]">
                                {filteredDocs.length}
                            </span>
                        </h2>
                        <p className="text-[12px] text-[#71717A] dark:text-[#A1A1AA]">
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
                                className="h-8 bg-[#FAFAF9] pl-8 text-[12px] dark:bg-[#18181B]"
                            />
                        </div>
                        <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                            <SelectTrigger className="h-8 w-[150px] bg-[#FAFAF9] text-[12px] dark:bg-[#18181B]">
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
                            <SelectTrigger className="h-8 w-[130px] bg-[#FAFAF9] text-[12px] dark:bg-[#18181B]">
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
                        <TableHeader className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                            <TableRow className="border-b border-[#C7D2FE] hover:bg-transparent dark:border-[#4A6CF7]/30">
                                <TableHead className={cn(thClass, "w-[140px]")}>Document ID</TableHead>
                                <TableHead className={cn(thClass, "w-[180px]")}>Form Type</TableHead>
                                <TableHead className={thClass}>Applicant</TableHead>
                                <TableHead className={thClass}>Designated Other PI</TableHead>
                                <TableHead className={thClass}>Workflow Status</TableHead>
                                <TableHead className={cn(thClass, "w-[130px]")}>Created</TableHead>
                                <TableHead className={cn(thClass, "w-[90px] text-right")}>Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-[#71717A]">
                                        <div className="flex items-center justify-center gap-2 text-[13px]">
                                            <RefreshCw className="h-4 w-4 animate-spin text-[#4A6CF7]" />
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
                                        className="cursor-pointer border-b border-[#E4E4E7] even:bg-[#FAFAFA] hover:bg-[#EEF2FF] dark:border-[#3F3F46] dark:even:bg-[#27272A]/60 dark:hover:bg-[#3F3F46]/40"
                                        onClick={() => navigate(doc.detailRoute)}
                                    >
                                        <TableCell className={cn(tdClass, "font-mono font-semibold text-[#3F3F46] dark:text-[#E4E4E7] whitespace-nowrap")}>{doc.name}</TableCell>
                                        <TableCell className={tdClass}>
                                            <Badge variant="secondary" className="text-[11px] font-medium whitespace-nowrap">
                                                {doc.doctype}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className={cn(tdClass, "font-medium text-[#3F3F46] dark:text-[#E4E4E7]")}>{doc.applicant}</TableCell>
                                        <TableCell className={cn(tdClass, "text-[#52525B] dark:text-[#A1A1AA]")}>{doc.other_pi}</TableCell>
                                        <TableCell className={tdClass}>{getStatusBadge(doc.workflow_state)}</TableCell>
                                        <TableCell className={cn(tdClass, "whitespace-nowrap text-[#52525B] dark:text-[#A1A1AA]")}>
                                            {doc.creation ? format(new Date(doc.creation), "dd MMM yyyy") : "N/A"}
                                        </TableCell>
                                        <TableCell className={cn(tdClass, "text-right")}>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 gap-1 px-2 text-[12px] font-semibold text-[#4A6CF7]"
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
