import * as React from "react";
import { useFrappeAuth, useFrappeGetDocList } from "frappe-react-sdk";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
    Plane,
    Receipt,
    FileText,
    ClipboardList,
    SearchIcon,
    ChevronRightIcon,
    PlusCircle,
    UserCheck,
    AlertCircle,
    RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
        fields: ["name", "owner", "applicant_name", "webmail_id", "igf_other_pi_id", "workflow_state", "creation"],
        filters: [["igf_other_pi", "=", "Other"]],
        orFilters: [["owner", "=", currentUser || "__none__"], ["igf_other_pi_id", "=", currentUser || "__none__"]],
        limit: 100,
        orderBy: { field: "creation", order: "desc" },
    });

    // 4. Fetch Indent Cum Sanction Sheet documents with icss_other_pi == "Other"
    const { data: icssDocs, isLoading: loadingIcss, mutate: mutateIcss } = useFrappeGetDocList("Indent Cum Sanction Sheet", {
        fields: ["name", "owner", "applicant_name", "webmail_id", "icss_other_pi_id", "workflow_state", "creation"],
        filters: [["icss_other_pi", "=", "Other"]],
        orFilters: [["owner", "=", currentUser || "__none__"], ["icss_other_pi_id", "=", currentUser || "__none__"]],
        limit: 100,
        orderBy: { field: "creation", order: "desc" },
    });

    const isLoading = loadingTravel || loadingReimb || loadingIgf || loadingIcss;

    const handleRefreshAll = () => {
        mutateTravel();
        mutateReimb();
        mutateIgf();
        mutateIcss();
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
                    applicant: doc.applicant_name || doc.webmail_id || "N/A",
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
                    applicant: doc.applicant_name || doc.webmail_id || "N/A",
                    other_pi: doc.icss_other_pi_id || "N/A",
                    workflow_state: doc.workflow_state || "Draft",
                    creation: doc.creation,
                    detailRoute: `/indent-cum-sanction-sheet/${doc.name}`,
                });
            });
        }

        return list.sort((a, b) => {
            const dateA = a.creation ? new Date(a.creation).getTime() : 0;
            const dateB = b.creation ? new Date(b.creation).getTime() : 0;
            return dateB - dateA;
        });
    }, [travelDocs, reimbursementDocs, igfDocs, icssDocs]);

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
        if (lower.includes("approved")) {
            return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">Approved</Badge>;
        }
        if (lower.includes("rejected")) {
            return <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-medium">Rejected</Badge>;
        }
        if (lower.includes("pending other pi") || lower.includes("pending pi")) {
            return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 font-medium">{state}</Badge>;
        }
        if (lower.includes("pending")) {
            return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-medium">{state}</Badge>;
        }
        return <Badge variant="outline">{state}</Badge>;
    };

    return (
        <div className="container mx-auto space-y-8 p-4 md:p-8 max-w-7xl">
            {/* Header Section */}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <UserCheck className="h-8 w-8 text-primary" />
                        Other PI Applications & Forms
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        Submit and track applications charged to another Principal Investigator's project without navigating through "My Projects".
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshAll}
                    disabled={isLoading}
                    className="self-start md:self-auto gap-2"
                >
                    <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>

            {/* Quick Apply Action Cards */}
            <div className="space-y-3">
                <h2 className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-primary" />
                    Create New "Other PI" Application
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {FORM_TYPES.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Card
                                key={item.key}
                                className={cn(
                                    "relative overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer border bg-gradient-to-br",
                                    item.color
                                )}
                                onClick={() => navigate(item.route)}
                            >
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="p-2 rounded-lg bg-background/80 shadow-xs border">
                                            <Icon className="h-5 w-5" />
                                        </div>
                                    </div>
                                    <CardTitle className="text-base font-semibold mt-3">{item.label}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 space-y-3">
                                    <CardDescription className="text-xs line-clamp-2 text-muted-foreground">
                                        {item.desc}
                                    </CardDescription>
                                    <Button
                                        size="sm"
                                        className={cn("w-full text-xs font-medium gap-1 shadow-xs", item.btnColor)}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(item.route);
                                        }}
                                    >
                                        Apply Now
                                        <ChevronRightIcon className="h-3.5 w-3.5" />
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            {/* Applications Listing */}
            <Card className="border shadow-xs">
                <CardHeader className="p-6 border-b">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold">Other PI Applications Registry</CardTitle>
                            <CardDescription className="mt-1 text-xs">
                                All forms submitted or pending approval where travel or expenditure is charged to another PI's project.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by ID, applicant, or PI..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 text-xs"
                                />
                            </div>

                            <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                                <SelectTrigger className="w-[160px] text-xs">
                                    <SelectValue placeholder="Form Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Form Types</SelectItem>
                                    <SelectItem value="travel">Travel</SelectItem>
                                    <SelectItem value="reimbursement">Reimbursement</SelectItem>
                                    <SelectItem value="indent_general_form">General Indent</SelectItem>
                                    <SelectItem value="indent_cum_sanction_sheet">ICSS Sheet</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px] text-xs">
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
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-muted/40">
                            <TableRow>
                                <TableHead className="w-[140px]">Document ID</TableHead>
                                <TableHead className="w-[180px]">Form Type</TableHead>
                                <TableHead>Applicant</TableHead>
                                <TableHead>Designated Other PI</TableHead>
                                <TableHead>Workflow Status</TableHead>
                                <TableHead className="w-[140px]">Created Date</TableHead>
                                <TableHead className="text-right w-[100px]">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        <div className="flex items-center justify-center gap-2">
                                            <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                                            <span>Loading Other PI applications...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredDocs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center gap-2 py-4">
                                            <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                                            <p className="font-medium text-sm">No "Other PI" applications found.</p>
                                            <p className="text-xs text-muted-foreground">
                                                Use the cards above to submit a new Travel, Reimbursement, or Indent form under another PI.
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredDocs.map((doc) => (
                                    <TableRow key={doc.name} className="hover:bg-muted/30">
                                        <TableCell className="font-mono text-xs font-semibold">{doc.name}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-normal text-xs">
                                                {doc.doctype}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">{doc.applicant}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{doc.other_pi}</TableCell>
                                        <TableCell>{getStatusBadge(doc.workflow_state)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {doc.creation ? format(new Date(doc.creation), "dd MMM yyyy") : "N/A"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-xs gap-1"
                                                onClick={() => navigate(doc.detailRoute)}
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
                </CardContent>
            </Card>
        </div>
    );
}

export default OtherPIView;
