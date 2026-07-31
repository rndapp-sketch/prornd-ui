import { getFileUrl } from "@/utils/fileUtils";
import React, {
    useState,
    useCallback,
    useImperativeHandle,
    forwardRef,
    useRef,
    useEffect,
    useMemo,
} from "react";
import { useParams, useNavigate } from "react-router-dom";

import { createPortal } from "react-dom";
import {
    useFrappeGetDoc,
    useFrappePostCall,
    useFrappeGetCall,
    useFrappeAuth,
} from "frappe-react-sdk";
import { useSearchParams } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";

import FundDetails from "../components/FundDetails";
// Disbursal of Honorarium moved to separate page
import {
    ArrowLeftIcon,
    FileTextIcon,
    UsersIcon,
    IndianRupeeIcon,
    ShieldIcon,
    MessageSquareIcon,
    DownloadIcon,
    CalendarIcon,
    UserIcon,
    BuildingIcon,
    CreditCardIcon,
    ShoppingCartIcon,
    UsersIcon as UsersGroupIcon,
    PlaneIcon,
    PlusIcon,
    MapPinIcon,
    MailIcon,
    GlobeIcon,
    TargetIcon,
    ClockIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    CreditCard,
    Upload,
    ShoppingCart,
    Plane,
    ZapIcon,
    Users,
    Settings,
    FileSpreadsheet as LedgerIcon,
    ExternalLinkIcon,
    ChevronRight,
    Plus,
    X,
    ArrowUpDown,
    Pencil,
    Save,
    Trash2,
    BookOpenIcon,
    ArrowRightIcon,
    LockIcon,
    UnlockIcon,
    CircleDotIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { DepartmentName } from "@/components/DepartmentName";
import { useUserRoles } from "../components/UserRole";

// --- Ledger Interfaces ---
interface LedgerTransaction {
    transactionType: string;
    transactionId: number;
    transactionDate: string;
    particulars: string;
    refDetails: string;
    fundReceivedAmount: number | null;
    commitAmount: number | null;
    paymentAmount: number | null;
    commitableBalance: number;
    paymentBalance: number;
    balance: number;
    status: string;
    bmr: string | null;
    bankTransactionNumber: string | null;
    bankTransactionDate: string | null;
    moduleCode?: string;
    frapAppId?: string;
    // Fields to match BudgetEntry structure
    sl: number;
    date: string;
    ref: string;
    received: number;
    committed: number;
    payment: number;
    actualBalance?: number;
    type: "commitment" | "transaction";
    head?: string;
}

// --- Interfaces ---
interface ActivityItem {
    owner: string;
    creation: string;
    content: string;
    comment_type: string;
}
interface ActivityStreamProps {
    doctype: string;
    docname: string;
}
interface ActivityStreamHandle {
    refetch: () => void;
}
interface ProjectDetailsProps {
    projectName?: string;
    embedded?: boolean;
    hideActions?: boolean;
}

interface BudgetEntry {
    sl: number;
    date: string;
    particulars: string;
    ref: string;
    received: number;
    committed: number;
    commitableBalance: number;
    bmr: string | null;
    payment: number;
    paymentBalance: number;
    actualBalance?: number;
    type: "commitment" | "transaction";
    moduleCode?: string;
    frapAppId?: string;
}

// --- Section Wrapper Component for better organization ---
const SectionWrapper = ({
    title,
    children,
    icon: Icon,
    className,
    action,
}: {
    title: string;
    children: React.ReactNode;
    icon: any;
    className?: string;
    action?: React.ReactNode;
}) => (
    <Card
        className={cn(
            "border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden rounded-xl",
            className,
        )}
    >
        <CardHeader className="py-3 px-5 border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#27272A]">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="h-3.5 w-3.5 text-[#4A6CF7] dark:text-[#93C5FD]" />}
                    <CardTitle className="font-sans text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] uppercase tracking-[0.1em]">
                        {title}
                    </CardTitle>
                </div>
                {action && <div>{action}</div>}
            </div>
        </CardHeader>
        <CardContent className="p-5">{children}</CardContent>
    </Card>
);

const FieldDisplay = ({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: any;
    icon?: any;
}) => {
    if (!value && value !== 0 && value !== "No") return null;
    return (
        <div className="rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] px-3 py-2 min-h-[60px]">
            <div className="flex items-center gap-2 mb-1">
                {Icon && (
                    <Icon className="h-3.5 w-3.5 text-[#4A6CF7] dark:text-[#93C5FD]" />
                )}
                <p className="text-[10px] font-bold text-[#71717A] dark:text-[#A1A1AA] uppercase tracking-[0.12em] font-sans">
                    {label}
                </p>
            </div>
            <div className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7] leading-snug break-words">
                {value}
            </div>
        </div>
    );
};

const ProjectStatusBadge = ({ status }: { status?: string }) => {
    const normalized = (status || "Draft").toLowerCase();
    const className = normalized.includes("approved")
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
        : normalized.includes("reject") || normalized.includes("correction")
            ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
            : normalized.includes("draft")
                ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400";

    return (
        <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold leading-none", className)}>
            {status || "Draft"}
        </span>
    );
};

// --- FrappeCard Component ---
const FrappeCard = ({ children, className }: any) => (
    <Card
        className={cn(
            "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm",
            className,
        )}
    >
        <CardContent className="p-6">{children}</CardContent>
    </Card>
);

const HtmlContent = ({
    title,
    htmlString,
    icon: Icon,
}: {
    title: string;
    htmlString: string | undefined;
    icon?: any;
}) => {
    if (!htmlString) return null;
    return (
        <SectionWrapper title={title} icon={Icon}>
            <div
                className="prose prose-sm max-w-none text-[#3F3F46] dark:text-[#D4D4D8] leading-relaxed dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: htmlString }}
            />
        </SectionWrapper>
    );
};

const TableDisplay = ({
    label,
    data,
    columns,
    icon: Icon,
}: {
    label: string;
    data: any[] | undefined;
    columns: {
        fieldname: string;
        label: string;
        render?: (value: any) => React.ReactNode;
    }[];
    icon?: any;
}) => {
    if (!data || data.length === 0) return null;
    return (
        <SectionWrapper title={label} icon={Icon}>
            <div className="overflow-x-auto p-3 rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46]">
                <Table className="border border-[#E4E4E7] dark:border-[#3F3F46] rounded-lg overflow-hidden">
                    <TableHeader className="bg-[#EEF2FF] dark:bg-[#1E3A8A]/18">
                        <TableRow className="border-b border-[#C7D2FE] dark:border-[#4A6CF7]/30 hover:bg-transparent">
                            {columns.map((col) => (
                                <TableHead
                                    key={col.fieldname}
                                    className="px-4 py-3 h-9 text-[10px] font-extrabold text-[#1E3A8A] dark:text-[#C7D2FE] uppercase tracking-wider border-r border-[#C7D2FE]/70 dark:border-[#4A6CF7]/25 last:border-r-0"
                                >
                                    {col.label}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow
                                key={index}
                                className="hover:bg-[#F4F4F5] dark:hover:bg-[#3F3F46]/40 border-b border-[#E4E4E7] dark:border-[#3F3F46] last:border-b-0"
                            >
                                {columns.map((col) => (
                                    <TableCell
                                        key={col.fieldname}
                                        className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-300 border-r border-[#F4F4F5] dark:border-[#3F3F46]/80 last:border-r-0 align-top"
                                    >
                                        {col.render
                                            ? col.render(row[col.fieldname])
                                            : row[col.fieldname]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </SectionWrapper>
    );
};

// Frappe-style Button Component
const FrappeButton = ({
    children,
    className,
    variant = "primary",
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "ghost" | "outline";
}) => (
    // Use Button from ui/button with variants mapped
    <Button
        variant={
            variant === "primary"
                ? "default"
                : variant === "ghost"
                    ? "ghost"
                    : "outline"
        }
        className={cn(
            className,
            variant === "primary" &&
            "bg-[#D97757] hover:bg-[#D97757] text-white",
            variant === "outline" &&
            "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800",
        )}
        {...props}
    >
        {children}
    </Button>
);

// --- COMMENT MODAL for Sanction/Workflow Actions ---
const CommentModal = ({
    isOpen,
    onClose,
    onSubmit,
    action,
    isLoading,
}: {
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
                <h3 className="text-sm font-bold mb-4 capitalize text-zinc-900 dark:text-zinc-100">
                    Confirm {action}
                </h3>
                <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter your comment here..."
                    className="mb-4 min-h-[100px] border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-500"
                />
                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            onSubmit(comment);
                            setComment("");
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? "Submit..." : "Submit"}
                    </Button>
                </div>
            </div>
        </div>
    );
};

const AdvanceSettlementModal = ({
    isOpen,
    onClose,
    settlements,
    onConvertNew,
    onNavigate,
}: {
    isOpen: boolean;
    onClose: () => void;
    settlements: any[];
    onConvertNew: () => void;
    onNavigate: (path: string) => void;
}) => {
    useEffect(() => {
        if (isOpen) {
            console.log(
                ">>> AdvanceSettlementModal MOUNTED/OPENED with settlements:",
                settlements,
            );
        }
    }, [isOpen, settlements]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-lg relative z-[100000]">
                <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                    Existing Settlements Found
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    There are already settlement(s) created for this advance.
                    You can view/edit an existing one or create a new partial
                    settlement.
                </p>

                <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto">
                    {settlements.map((settlement) => (
                        <div
                            key={settlement.name}
                            className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                        >
                            <div>
                                <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                    {settlement.name}
                                </p>
                                <p className="text-xs text-zinc-500">
                                    {settlement.workflow_state} · ₹{" "}
                                    {settlement.total_amount}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-xs px-2 py-1 rounded-full border ${settlement.workflow_state === "Approved"
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                        : settlement.workflow_state ===
                                            "Submitted"
                                            ? "bg-blue-100 text-blue-800 border-blue-200"
                                            : "bg-zinc-100 text-zinc-800 border-zinc-200"
                                        }`}
                                >
                                    {settlement.workflow_state || "Draft"}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        onClose();
                                        onNavigate(
                                            `/advance-settlement/${settlement.name}`,
                                        );
                                    }}
                                >
                                    View
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={onConvertNew}
                        className="bg-[#D97757] hover:bg-[#D97757] text-white"
                    >
                        Create New Settlement
                    </Button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

const TADASettlementModal = ({
    isOpen,
    onClose,
    settlements,
    onConvertNew,
    onNavigate,
}: {
    isOpen: boolean;
    onClose: () => void;
    settlements: any[];
    onConvertNew: () => void;
    onNavigate: (path: string) => void;
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-lg relative z-[100000]">
                <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                    Existing TA DA Settlements Found
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    There are already TA DA settlement(s) created for this
                    travel application. You can view/edit an existing one or
                    create a new settlement.
                </p>

                <div className="space-y-3 mb-6 max-h-[200px] overflow-y-auto">
                    {settlements.map((settlement) => (
                        <div
                            key={settlement.name}
                            className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                        >
                            <div>
                                <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                    {settlement.name}
                                </p>
                                <p className="text-xs text-zinc-500">
                                    {settlement.workflow_state} · ₹{" "}
                                    {settlement.ta_da_total_claimed ||
                                        settlement.ta_da_net_claimed ||
                                        0}
                                </p>
                                <p className="text-xs text-zinc-400 mt-1">
                                    {settlement.creation
                                        ? new Date(
                                            settlement.creation,
                                        ).toLocaleDateString()
                                        : ""}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-xs px-2 py-1 rounded-full border ${settlement.workflow_state === "Approved"
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                        : settlement.workflow_state ===
                                            "Submitted"
                                            ? "bg-blue-100 text-blue-800 border-blue-200"
                                            : "bg-zinc-100 text-zinc-800 border-zinc-200"
                                        }`}
                                >
                                    {settlement.workflow_state || "Draft"}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        onClose();
                                        onNavigate(
                                            `/ta-da-settlement?edit=${settlement.name}`,
                                        );
                                    }}
                                >
                                    View
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={onConvertNew}
                        className="bg-[#D97757] hover:bg-[#D97757] text-white"
                    >
                        Create New Settlement
                    </Button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

const P11FormModal = ({
    isOpen,
    onClose,
    forms,
    onCreateNew,
    onNavigate,
}: {
    isOpen: boolean;
    onClose: () => void;
    forms: any[];
    onCreateNew: () => void;
    onNavigate: (path: string) => void;
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-lg relative z-[100000]">
                <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                    P-11 Forms
                </h3>
                {forms.length > 0 ? (
                    <>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                            Existing P-11 form(s) found for this Direct
                            Purchase. Open an existing form or create a new one.
                        </p>
                        <div className="space-y-3 mb-6 max-h-[280px] overflow-y-auto">
                            {forms.map((form) => (
                                <div
                                    key={form.name}
                                    className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                                >
                                    <div>
                                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                            {form.name}
                                        </p>
                                        <p className="text-xs text-zinc-500">
                                            {form.workflow_state} · ₹{" "}
                                            {form.grand_total ?? 0}
                                        </p>
                                        <p className="text-xs text-zinc-400 mt-0.5">
                                            {form.creation
                                                ? new Date(
                                                    form.creation,
                                                ).toLocaleDateString()
                                                : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full border ${form.workflow_state ===
                                                "Approved"
                                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                                : form.workflow_state ===
                                                    "Submitted"
                                                    ? "bg-blue-100 text-blue-800 border-blue-200"
                                                    : "bg-zinc-100 text-zinc-800 border-zinc-200"
                                                }`}
                                        >
                                            {form.workflow_state || "Draft"}
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                onClose();
                                                onNavigate(
                                                    `/p11-form?edit=${form.name}&view=true`,
                                                );
                                            }}
                                        >
                                            Open
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
                        No P-11 forms found for this Direct Purchase. Create a
                        new one to get started.
                    </p>
                )}
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={onCreateNew}
                        className="bg-[#D97757] hover:bg-[#D97757] text-white"
                    >
                        Create New P-11 Form
                    </Button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

const ScrModal = ({
    isOpen,
    onClose,
    scrs,
    onCreateNew,
    onNavigate,
}: {
    isOpen: boolean;
    onClose: () => void;
    scrs: any[];
    onCreateNew: () => void;
    onNavigate: (path: string) => void;
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl shadow-lg w-full max-w-lg relative z-[100000]">
                <h3 className="text-lg font-bold mb-4 text-zinc-900 dark:text-zinc-100">
                    Existing Selection Committee Report(s) Found
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    A Selection Committee Report already exists for this
                    interview. You can open an existing report or create a new
                    one.
                </p>
                <div className="space-y-3 mb-6 max-h-[280px] overflow-y-auto">
                    {scrs.map((scr) => (
                        <div
                            key={scr.name}
                            className="flex items-center justify-between p-3 border border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
                        >
                            <div>
                                <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                                    {scr.name}
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {scr.creation
                                        ? new Date(
                                            scr.creation,
                                        ).toLocaleDateString()
                                        : ""}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span
                                    className={`text-xs px-2 py-1 rounded-full border ${scr.workflow_state === "Approved"
                                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                        : scr.workflow_state === "Submitted"
                                            ? "bg-blue-100 text-blue-800 border-blue-200"
                                            : "bg-zinc-100 text-zinc-800 border-zinc-200"
                                        }`}
                                >
                                    {scr.workflow_state || "Draft"}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        onClose();
                                        onNavigate(
                                            `/selection-committee-report/${scr.name}`,
                                        );
                                    }}
                                >
                                    View
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={onCreateNew}
                        className="bg-[#D97757] hover:bg-[#D97757] text-white"
                    >
                        Create New SCR
                    </Button>
                </div>
            </div>
        </div>,
        document.body,
    );
};

// --- START: REFACTORED QuickActions COMPONENT ---

interface QuickActionsProps {
    projectName: string;
    projectNo?: string;
    projectTitle?: string;
    onNavigate: (path: string) => void;
    embedded?: boolean;
    hasSanction?: boolean;
    hasFunds?: boolean;
}

const QuickActions = ({
    projectName,
    projectNo,
    projectTitle,
    onNavigate,
    embedded = false,
    hasSanction = false,
    hasFunds = false,
}: QuickActionsProps) => {
    const [searchParams, setSearchParams] = useSearchParams();

    const defaultSubtab = searchParams.get("subtab") || "Reimbursement";
    const defaultApp = searchParams.get("app");

    const [activeTab, setActiveTab] = useState(defaultSubtab);
    const [selectedApplication, setSelectedApplication] = useState<
        string | null
    >(defaultApp || null);
    const [applicationData, setApplicationData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // QuickActions doesn't share scope with the outer component — call hooks independently here.
    const { currentUser: quickActionsCurrentUser } = useFrappeAuth();
    const { roles: quickActionsRoles } = useUserRoles(quickActionsCurrentUser ?? null);
    const isStaffRnDForCommit = quickActionsRoles.includes("staff, RnD");

    // Settle Modal State (Advance)
    const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
    const [existingSettlements, setExistingSettlements] = useState<any[]>([]);
    const [selectedAdvanceForSettle, setSelectedAdvanceForSettle] =
        useState<any>(null);

    // TA DA Settle Modal State (Travel)
    const [isTADASettleModalOpen, setIsTADASettleModalOpen] = useState(false);
    const [existingTADASettlements, setExistingTADASettlements] = useState<
        any[]
    >([]);
    const [selectedTravelForSettle, setSelectedTravelForSettle] =
        useState<any>(null);

    const [deletingDraftName, setDeletingDraftName] = useState<string | null>(null);

    // P-11 Form Modal State
    const [isP11ModalOpen, setIsP11ModalOpen] = useState(false);
    const [existingP11Forms, setExistingP11Forms] = useState<any[]>([]);
    const [selectedDirectPurchaseForP11, setSelectedDirectPurchaseForP11] =
        useState<any>(null);

    // SCR Modal State
    const [isScrModalOpen, setIsScrModalOpen] = useState(false);
    const [existingScrs, setExistingScrs] = useState<any[]>([]);
    const [selectedItemForScr, setSelectedItemForScr] = useState<any>(null);

    const handleSettleClick = async (item: any) => {
        setIsLoading(true);
        console.log(">>> handleSettleClick triggered for:", item.name);
        try {
            // Check for existing settlements
            console.log(
                "Fetching ALL Advance Settlements to debug filter (client-side filtering enabled)",
            );
            const response = await fetchReimbursements({
                doctype: "Advance Settlement",
                fields: [
                    "name",
                    "total_amount",
                    "creation",
                    "temporary_advance_application",
                    "owner",
                    "docstatus",
                ],
                order_by: "creation desc",
                limit_page_length: 50,
            });

            console.log(">>> ALL Advance Settlements (last 50):", response);
            const allSettlements = (response?.message || []).map((s: any) => ({
                ...s,
                workflow_state:
                    s.workflow_state ||
                    (s.docstatus === 1
                        ? "Submitted"
                        : s.docstatus === 2
                            ? "Cancelled"
                            : "Draft"),
            }));

            // Client-side filter
            const settlements = allSettlements.filter(
                (s: any) => s.temporary_advance_application === item.name,
            );

            console.log(">>> Match candidate ID:", item.name);
            console.log(">>> Filtered Settlements (Client-Side):", settlements);

            if (settlements.length > 0) {
                setExistingSettlements(settlements);
                setSelectedAdvanceForSettle(item);
                setIsSettleModalOpen(true);
                console.log(">>> Opening Modal (Client-Side Match)");
            } else {
                console.log(">>> No settlements found, navigating to new form");
                // No existing settlements, go straight to new form
                onNavigate(
                    `/advance-settlement?advance=${item.name}&project=${projectName}`,
                );
            }
        } catch (error) {
            console.error("Error checking for settlements:", error);
            // Fallback: just go to new form
            onNavigate(
                `/advance-settlement?advance=${item.name}&project=${projectName}`,
            );
        } finally {
            setIsLoading(false);
        }
    };
    const handleTravelSettleClick = async (item: any) => {
        setIsLoading(true);
        console.log(">>> handleTravelSettleClick triggered for:", item.name);

        try {
            // Direct fetch to v2 document API for the filtered settlement records
            const apiUrl = `/api/v2/document/TA DA Settlement?filters=[["ta_da_travel_application","=","${item.name}"]]&fields=["*"]`;

            const response = await fetch(apiUrl, {
                method: "GET",
                headers: { Accept: "application/json" },
                credentials: "include", // Ensure session cookies are sent
            });

            if (!response.ok) {
                throw new Error(
                    `API error: ${response.status} ${response.statusText}`,
                );
            }

            const result = await response.json();
            console.log(">>> TA DA Settlement raw API response:", result);

            const fetchedSettlements = result.data || [];

            // Add workflow status mappings
            const mappedSettlements = fetchedSettlements.map((s: any) => ({
                ...s,
                workflow_state:
                    s.workflow_state ||
                    (s.docstatus === 1
                        ? "Submitted"
                        : s.docstatus === 2
                            ? "Cancelled"
                            : "Draft"),
                // Normalize amount property so that the existing modal component displays it correctly
                total_amount: s.ta_da_total_claimed || s.ta_da_net_claimed || 0,
            }));

            console.log(">>> Mapped TA DA Settlements:", mappedSettlements);

            if (mappedSettlements.length > 0) {
                setExistingTADASettlements(mappedSettlements);
                setSelectedTravelForSettle(item);
                setIsTADASettleModalOpen(true);
                console.log(">>> Opening Modal with existing settlements");
            } else {
                console.log(">>> No settlements found, navigating to new form");
                onNavigate(
                    `/ta-da-settlement?project=${projectNo}&travel_ref=${item.name}`,
                );
            }
        } catch (error) {
            console.error(
                "Error fetching TA DA settlements via v2 API:",
                error,
            );
            // Fallback: navigate directly to form
            onNavigate(
                `/ta-da-settlement?project=${projectNo}&travel_ref=${item.name}`,
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleP11FormClick = async (item: any) => {
        setIsLoading(true);
        try {
            const filters = JSON.stringify([
                ["project_no", "=", projectNo || projectName],
                ["app_id", "=", item.name],
            ]);
            const apiUrl = `/api/v2/document/P_11 Form?filters=${encodeURIComponent(filters)}&fields=["*"]`;

            const response = await fetch(apiUrl, {
                method: "GET",
                headers: { Accept: "application/json" },
                credentials: "include",
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();
            const forms = (result.data || [])
                .filter((f: any) => f.docstatus !== 2)
                .map((f: any) => ({
                    ...f,
                    workflow_state:
                        f.workflow_state ||
                        (f.docstatus === 1 ? "Submitted" : "Draft"),
                }));

            setExistingP11Forms(forms);
        } catch (error) {
            console.error("Error fetching P_11 forms:", error);
            setExistingP11Forms([]);
        } finally {
            setSelectedDirectPurchaseForP11(item);
            setIsP11ModalOpen(true);
            setIsLoading(false);
        }
    };

    const handleDeleteDraftDirectPurchase = async (item: any) => {
        if (!confirm(`Are you sure you want to delete draft "${item.name}"? This cannot be undone.`)) return;
        setDeletingDraftName(item.name);
        try {
            const res = await fetch(`/api/resource/Direct Purchase/${item.name}`, {
                method: "DELETE",
                headers: { Accept: "application/json" },
                credentials: "include",
            });
            if (res.ok) {
                setApplicationData((prev: any[]) => prev.filter((row) => row.name !== item.name));
            } else {
                const data = await res.json().catch(() => ({}));
                alert(data?.exc_type || "Failed to delete draft.");
            }
        } catch (error) {
            console.error("Error deleting Direct Purchase draft:", error);
            alert("Failed to delete draft.");
        } finally {
            setDeletingDraftName(null);
        }
    };

    const handleScrClick = async (item: any) => {
        setIsLoading(true);
        try {
            const response = await fetchReimbursements({
                doctype: "Selection Committee Report",
                filters: [["interview_id", "=", item.name]],
                fields: ["name", "workflow_state", "creation"],
                order_by: "creation desc",
                limit_page_length: 20,
            });
            const scrs = (response?.message || []).map((s: any) => ({
                ...s,
                workflow_state:
                    s.workflow_state ||
                    (s.docstatus === 1
                        ? "Submitted"
                        : s.docstatus === 2
                            ? "Cancelled"
                            : "Draft"),
            }));
            setExistingScrs(scrs);
            setSelectedItemForScr(item);
            if (scrs.length > 0) {
                setIsScrModalOpen(true);
            } else {
                onNavigate(
                    `/selection-committee-report?interview_id=${item.name}`,
                );
            }
        } catch (error) {
            console.error("Error checking for existing SCRs:", error);
            onNavigate(`/selection-committee-report?interview_id=${item.name}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Lock all groups except Loan and Recruitment when project has no available fund balance
    const isModuleLocked = !hasFunds;
    const unlockedGroups = ["Loan", "Recruitment"];
    const unlockedApplications = ["Loan Request", "Adhoc/Contractual"];

    // Auto-redirect to Loan tab when modules are locked; clear selectedApplication so the banner is visible
    useEffect(() => {
        if (isModuleLocked && !unlockedGroups.includes(activeTab)) {
            setActiveTab("Loan");
            setSelectedApplication(null);
            setApplicationData([]);
        }
    }, [isModuleLocked]);

    const groups = [
        {
            title: "Reimbursement",
            icon: IndianRupeeIcon,
            items: ["Reimbursement"],
        },
        {
            title: "Advance",
            icon: CreditCard,
            items: ["Temporary Advance Apply"],
        },
        {
            title: "Disbursal",
            icon: Upload,
            items: [
                "Top Up Fellowship",
                "Disbursal of Honorarium",
                "Disbursal of Consultancy",
            ],
        },
        {
            title: "Purchase",
            icon: ShoppingCart,
            items: [
                "Direct Purchase",
                "Indent General Form",
                // "Generate NIQ",
                "Indent cum Sanction",
                // "Rate Contract",
            ],
        },
        {
            title: "Recruitment",
            icon: Users,
            items: [
                "Adhoc/Contractual",
                // "Committee Member Change",
                // "Selection Committee Report",
                // "Project Staff Resignation",
            ],
        },
        { title: "Travel", icon: Plane, items: ["Travel"] },
        { title: "Loan", icon: CreditCardIcon, items: ["Loan Request"] },
        ...(isStaffRnDForCommit ? [{
            title: "Commit / De-Commit",
            icon: CreditCardIcon,
            items: ["Miscellaneous Commit"],
        }] : []),
        // {
        //   title: "Utilities",
        //   icon: Settings,
        //   items: [
        //     "Add New User",
        //     "Application History",
        //     "Form Tracking",
        //     "Incharge Assignment",
        //   ],
        // },
    ];

    // Frappe SDK hooks for fetching data
    const { call: fetchReimbursements } = useFrappePostCall<{ message: any[] }>(
        "frappe.client.get_list",
    );

    // Fetch data when application is selected
    const fetchApplicationData = useCallback(async () => {
        console.log(
            ">>> fetchApplicationData triggered. selectedApplication:",
            selectedApplication,
            "projectName:",
            projectName,
        );

        if (!selectedApplication || !projectName) {
            console.log(
                ">>> Early return - missing selectedApplication or projectName",
            );
            setApplicationData([]);
            return;
        }

        // Temporary Advance is handled here with manual fetch
        // if (selectedApplication === "Temporary Advance Apply") { ... }

        setIsLoading(true);
        try {
            let data: any[] = [];

            if (selectedApplication === "Reimbursement") {
                console.log("=== FETCHING REIMBURSEMENTS ===");
                console.log("Project Name from URL:", projectName);

                try {
                    // Use direct fetch to Frappe REST API with cache-busting
                    const timestamp = Date.now();
                    const apiUrl = `/api/resource/Reimbursement?fields=["name","creation","workflow_state","owner","project_name","project_number","applicant_webmail","comment"]&order_by=creation desc&limit_page_length=0&_=${timestamp}`;

                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });

                    if (!fetchResponse.ok) {
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status} `,
                        );
                    }

                    const result = await fetchResponse.json();
                    console.log("API Response:", result);

                    const allReimbursements = result?.data || [];
                    console.log(
                        "All Reimbursements count:",
                        allReimbursements.length,
                    );
                    console.log("All Reimbursements data:", allReimbursements);

                    // Log first few items to see field values
                    if (allReimbursements.length > 0) {
                        console.log(
                            "Sample reimbursement items:",
                            allReimbursements.slice(0, 3).map((item: any) => ({
                                name: item.name,
                                project_name: item.project_name,
                                project_number: item.project_number,
                            })),
                        );
                    }

                    // Filter client-side: match project_name OR project_number (case-insensitive, partial match)
                    const projectNameLower = projectName?.toLowerCase() || "";
                    data = allReimbursements.filter((item: any) => {
                        const itemProjectName = (
                            item.project_name || ""
                        ).toLowerCase();
                        const itemProjectNumber = (
                            item.project_number || ""
                        ).toLowerCase();

                        // Check for exact match or contains
                        const matches =
                            itemProjectName === projectNameLower ||
                            itemProjectNumber === projectNameLower ||
                            itemProjectName.includes(projectNameLower) ||
                            itemProjectNumber.includes(projectNameLower) ||
                            projectNameLower.includes(itemProjectName) ||
                            projectNameLower.includes(itemProjectNumber);

                        return matches;
                    });
                    console.log("Filtered Reimbursement data:", data);
                } catch (fetchError) {
                    console.error("Direct fetch error:", fetchError);
                    data = [];
                }
            } else if (selectedApplication === "Temporary Advance Apply") {
                try {
                    console.log("=== FETCHING TEMPORARY ADVANCE (V2) ===");
                    const timestamp = Date.now();
                    const projectCode = projectNo || projectName;
                    // Filter at API level by project_code
                    const filters = projectCode
                        ? `&filters=[["project_code","=","${projectCode}"]]`
                        : "";
                    const apiUrl = `/api/v2/document/Temporary Advance?fields=["*"]&limit_page_length=0${filters}&_=${timestamp}`;

                    console.log(
                        "Fetching with project_code filter:",
                        projectCode,
                    );

                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });

                    if (!fetchResponse.ok)
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status}`,
                        );

                    const result = await fetchResponse.json();
                    data = result?.data || [];
                    console.log(
                        `Fetched ${data.length} Temporary Advance items for project_code: ${projectCode}`,
                    );

                    // Map for display consistency
                    data = data.map((item: any) => ({
                        ...item,
                        workflow_state:
                            item.workflow_state ||
                            item.status ||
                            (item.docstatus === 1
                                ? "Submitted"
                                : item.docstatus === 2
                                    ? "Cancelled"
                                    : "Draft"),
                        applicant_webmail: item.applicant_webmail || item.owner,
                    }));

                    console.log(
                        `Mapped ${data.length} Temporary Advance items`,
                    );
                } catch (fetchError) {
                    console.error("Temporary Advance fetch error:", fetchError);
                    data = [];
                }
            } else if (selectedApplication === "Project Staff Resignation") {
                const response = await fetchReimbursements({
                    doctype: "Project Staff Resignation",
                    filters: { project_name: projectName },
                    fields: [
                        "name",
                        "creation",
                        "docstatus",
                        "owner",
                        "applicant_name",
                        "applicant_email_id",
                    ],
                    order_by: "creation desc",
                    limit_page_length: 50,
                });
                data = (response?.message || []).map((item: any) => ({
                    ...item,
                    workflow_state:
                        item.docstatus === 1
                            ? "Submitted"
                            : item.docstatus === 2
                                ? "Cancelled"
                                : "Draft",
                    applicant_webmail: item.applicant_email_id, // Map for display consistency
                }));
            } else if (selectedApplication === "Project Staff Extension") {
                const response = await fetchReimbursements({
                    doctype: "Project Staff Extension",
                    filters: { ex_proj_name: projectName },
                    fields: [
                        "name",
                        "creation",
                        "docstatus",
                        "owner",
                        "ex_name",
                        "ex_emp_id",
                    ],
                    order_by: "creation desc",
                    limit_page_length: 50,
                });
                data = (response?.message || []).map((item: any) => ({
                    ...item,
                    workflow_state:
                        item.docstatus === 1
                            ? "Submitted"
                            : item.docstatus === 2
                                ? "Cancelled"
                                : "Draft",
                    applicant_name: item.ex_name,
                    applicant_webmail: item.ex_emp_id, // Map for display consistency
                }));
            } else if (selectedApplication === "Rate Contract") {
                try {
                    const apiUrl = `/api/resource/Rate Contract?fields=["name","creation","workflow_state","owner","project_name","email_id"]&order_by=creation desc&limit_page_length=0`;
                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });
                    if (!fetchResponse.ok)
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status} `,
                        );
                    const result = await fetchResponse.json();
                    const allItems = result?.data || [];
                    data = allItems
                        .filter(
                            (item: any) => item.project_name === projectName,
                        )
                        .map((item: any) => ({
                            ...item,
                            applicant_webmail: item.email_id,
                        }));
                } catch (e) {
                    console.error(e);
                    data = [];
                }
            } else if (selectedApplication === "Rate Contract") {
                try {
                    const apiUrl = `/api/resource/Rate Contract?fields=["name","creation","workflow_state","owner","project_name","email_id"]&order_by=creation desc&limit_page_length=0`;
                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });
                    if (!fetchResponse.ok)
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status} `,
                        );
                    const result = await fetchResponse.json();
                    const allItems = result?.data || [];
                    data = allItems
                        .filter(
                            (item: any) => item.project_name === projectName,
                        )
                        .map((item: any) => ({
                            ...item,
                            applicant_webmail: item.email_id,
                        }));
                } catch (e) {
                    console.error(e);
                    data = [];
                }
            } else if (selectedApplication === "Travel") {
                try {
                    // Use v2 API which works correctly
                    const travelPromise = fetch(
                        `/api/v2/document/Travel?fields=["name","creation","workflow_state","owner","travel_project_title","travel_project_number","webmail_id_travel","applicant_name_travel"]&order_by=creation desc&limit_page_length=0`,
                        {
                            method: "GET",
                            headers: { Accept: "application/json" },
                            credentials: "include",
                        },
                    ).then((res) => (res.ok ? res.json() : { data: [] }));

                    const settlementPromise = fetch(
                        `/api/resource/TA%20DA%20Settlement?fields=["name","creation","workflow_state","owner","ta_da_project_code","ta_da_name","ta_da_travel_application","ta_da_total_claimed","ta_da_net_claimed","docstatus"]&filters=[["ta_da_project_code","=","${projectName}"]]&order_by=creation desc&limit_page_length=0`,
                        {
                            method: "GET",
                            headers: { Accept: "application/json" },
                            credentials: "include",
                        },
                    ).then((res) => (res.ok ? res.json() : { data: [] }));

                    const [travelRes, settlementRes] = await Promise.all([
                        travelPromise,
                        settlementPromise,
                    ]);

                    console.log(
                        "[Travel Fetch] Raw travelRes.data:",
                        travelRes.data,
                    );
                    console.log(
                        "[Travel Fetch] Filtering by travel_project_title:",
                        projectName,
                    );

                    // Filter by travel_project_title which contains the project ID
                    const travelItems = (travelRes.data || [])
                        .filter(
                            (item: any) =>
                                item.travel_project_title === projectName,
                        )
                        .map((item: any) => ({
                            ...item,
                            applicant_webmail: item.webmail_id_travel,
                            type: "Travel Apply",
                        }));

                    console.log(
                        "[Travel Fetch] Filtered travelItems:",
                        travelItems.length,
                        "items",
                    );

                    const settlementItems = (settlementRes.data || [])
                        .filter(
                            (item: any) =>
                                item.ta_da_project_code === projectName,
                        )
                        .map((item: any) => ({
                            ...item,
                            applicant_webmail: item.ta_da_name,
                            type: "TA DA Settlement",
                        }));

                    // Combine and sort by creation date desc
                    data = [...travelItems, ...settlementItems].sort(
                        (a: any, b: any) =>
                            new Date(b.creation).getTime() -
                            new Date(a.creation).getTime(),
                    );
                    console.log(
                        "[Travel Fetch] Combined data:",
                        data.length,
                        "items",
                    );
                } catch (fetchError) {
                    console.error("Travel combined fetch error:", fetchError);
                    data = [];
                }
            } else if (selectedApplication === "Top Up Fellowship") {
                try {
                    const timestamp = Date.now();
                    const tufProjectNo = projectNo || projectName;
                    const apiUrl = `/api/resource/Top%20Up%20Fellowship?fields=["name","creation","workflow_state","owner","project_no","project_title","pi_webmail","coordinating_pi_webmail","docstatus"]&filters=[["project_no","=","${tufProjectNo}"]]&order_by=creation desc&limit_page_length=0&_=${timestamp}`;
                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });
                    if (!fetchResponse.ok)
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status}`,
                        );
                    const result = await fetchResponse.json();
                    const allItems = result?.data || [];

                    data = allItems.map((item: any) => ({
                            ...item,
                            workflow_state:
                                item.workflow_state ||
                                (item.docstatus === 1
                                    ? "Submitted"
                                    : item.docstatus === 2
                                        ? "Cancelled"
                                        : "Draft"),
                            applicant_webmail: item.pi_webmail || item.owner,
                        }));
                    console.log(
                        `Top Up Fellowship: fetched ${allItems.length} for project_no ${tufProjectNo}`,
                    );
                } catch (fetchError) {
                    console.error("Top Up Fellowship fetch error:", fetchError);
                    data = [];
                }
            } else if (selectedApplication === "Disbursal of Honorarium") {
                try {
                    const timestamp = Date.now();
                    // Use v2 document API to avoid 403 permission issues and include project fields for filtering
                    const apiUrl = `/api/v2/document/Disbursal of Honorarium?fields=["name","creation","modified","name_of_applicant","webmail_id","owner","workflow_state","total_amount","project_no"]&order_by=creation desc&limit_page_length=0&_=${timestamp}`;
                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });

                    if (!fetchResponse.ok)
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status}`,
                        );

                    const result = await fetchResponse.json();
                    const allHonorariums = result?.data || [];

                    // Filter by project_no matching either the projectNo or projectName (doc ID fallback)
                    const projectNoLower = (
                        projectNo ||
                        projectName ||
                        ""
                    ).toLowerCase();

                    data = allHonorariums
                        .filter((item: any) => {
                            const itemNo = (
                                item.project_no || ""
                            ).toLowerCase();
                            return projectNoLower && itemNo === projectNoLower;
                        })
                        .map((item: any) => ({
                            ...item,
                            applicant_webmail:
                                item.name_of_applicant ||
                                item.webmail_id ||
                                item.owner,
                        }));

                    console.log(
                        `Disbursal of Honorarium: fetched ${allHonorariums.length}, filtered to ${data.length}`,
                    );
                } catch (fetchError) {
                    console.error(
                        "Disbursal of Honorarium fetch error:",
                        fetchError,
                    );
                    data = [];
                }
            } else if (selectedApplication === "Disbursal of Consultancy") {
                try {
                    const timestamp = Date.now();
                    const apiUrl = `/api/resource/Disbursal of Consultancy?fields=["name","creation","workflow_state","owner","total_disbursal_amount","disbursal_project_number","project_title","webmail_id","pi_name"]&order_by=creation desc&limit_page_length=0&_=${timestamp}`;
                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });
                    if (!fetchResponse.ok)
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status}`,
                        );
                    const result = await fetchResponse.json();
                    // Exact same client-side filter approach resilient to backend schema issues
                    const projectNameLower = projectName?.toLowerCase() || "";
                    const projectNoLower = projectNo?.toLowerCase() || "";

                    data = (result?.data || [])
                        .filter((item: any) => {
                            const itemProjectName = (
                                item.project_title || ""
                            ).toLowerCase();
                            const itemProjectNumber = (
                                item.disbursal_project_number || ""
                            ).toLowerCase();
                            return (
                                itemProjectName === projectNameLower ||
                                itemProjectNumber === projectNameLower ||
                                itemProjectName === projectNoLower ||
                                itemProjectNumber === projectNoLower ||
                                (projectNameLower &&
                                    itemProjectName.includes(
                                        projectNameLower,
                                    )) ||
                                (projectNameLower &&
                                    itemProjectNumber.includes(
                                        projectNameLower,
                                    )) ||
                                (projectNoLower &&
                                    itemProjectName.includes(projectNoLower)) ||
                                (projectNoLower &&
                                    itemProjectNumber.includes(projectNoLower))
                            );
                        })
                        .map((item: any) => ({
                            ...item,
                            applicant_webmail:
                                item.pi_name || item.webmail_id || item.owner,
                            total_amount: item.total_disbursal_amount,
                        }));
                } catch (fetchError) {
                    console.error(
                        "Disbursal of Consultancy fetch error:",
                        fetchError,
                    );
                    data = [];
                }
            } else if (selectedApplication === "Direct Purchase") {
                try {
                    const timestamp = Date.now();
                    const projectFilter = projectNo || projectName;
                    const apiUrl = `/api/resource/Direct%20Purchase?fields=["name","creation","workflow_state","owner","project_no","applicant_name","docstatus"]&filters=[["project_no","=","${projectFilter}"]]&order_by=creation desc&limit_page_length=0&_=${timestamp}`;
                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });
                    if (!fetchResponse.ok)
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status}`,
                        );
                    const result = await fetchResponse.json();
                    const allItems = result?.data || [];

                    data = allItems.map((item: any) => ({
                        ...item,
                        workflow_state:
                            item.workflow_state ||
                            (item.docstatus === 1
                                ? "Submitted"
                                : item.docstatus === 2
                                    ? "Cancelled"
                                    : "Draft"),
                        applicant_webmail: item.applicant_name || item.owner,
                    }));
                } catch (fetchError) {
                    console.error("Direct Purchase fetch error:", fetchError);
                    data = [];
                }
            } else if (selectedApplication === "Adhoc/Contractual") {
                try {
                    const timestamp = Date.now();
                    const apiUrl = `/api/resource/Recruitment%20Adhoc%20Contractual?fields=["name","creation","workflow_state","owner","upfa_project_code","upfa_project_title","upfa_department","upfa_appointment_type","webmail_id","docstatus"]&order_by=creation desc&limit_page_length=0&_=${timestamp}`;
                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });
                    if (!fetchResponse.ok)
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status}`,
                        );
                    const result = await fetchResponse.json();
                    const allItems = result?.data || [];

                    data = allItems
                        .filter((item: any) => {
                            const matchesProject =
                                item.upfa_project_code === projectName ||
                                item.upfa_project_code === projectNo;
                            return matchesProject;
                        })
                        .map((item: any) => ({
                            ...item,
                            workflow_state:
                                item.workflow_state ||
                                (item.docstatus === 1
                                    ? "Submitted"
                                    : item.docstatus === 2
                                        ? "Cancelled"
                                        : "Draft"),
                            applicant_webmail: item.webmail_id || item.owner,
                        }));
                } catch (fetchError) {
                    console.error("Adhoc/Contractual fetch error:", fetchError);
                    data = [];
                }
            } else if (selectedApplication === "Indent General Form") {
                try {
                    const timestamp = Date.now();
                    const filters = encodeURIComponent(
                        JSON.stringify([
                            ["igf_project_code", "=", projectNo],
                            ["docstatus", "in", [0, 1]],
                        ]),
                    );
                    const apiUrl = `/api/resource/Indent%20General%20Form?fields=["name","creation","workflow_state","owner","igf_project_title","igf_project_code","igf_webmail_user_id","docstatus","igf_total_estimate","igf_tender_type"]&filters=${filters}&order_by=creation desc&limit_page_length=0&_=${timestamp}`;
                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });
                    if (!fetchResponse.ok)
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status}`,
                        );
                    const result = await fetchResponse.json();
                    const allItems = result?.data || [];

                    data = allItems.map((item: any) => ({
                        ...item,
                        workflow_state:
                            item.workflow_state ||
                            (item.docstatus === 1 ? "Submitted" : "Draft"),
                        applicant_webmail:
                            item.igf_webmail_user_id || item.owner,
                    }));
                } catch (fetchError) {
                    console.error(
                        "Indent General Form fetch error:",
                        fetchError,
                    );
                    data = [];
                }
            } else if (selectedApplication === "Indent cum Sanction") {
                try {
                    const timestamp = Date.now();
                    const apiUrl = `/api/resource/Indent%20Cum%20Sanction%20Sheet?fields=["name","creation","modified","workflow_state","owner","project_ref","project_no","icss_indent_type","icss_applicant_webmail_id","icss_applicant_name","send_to_director","director_signed_pdf","docstatus"]&order_by=creation desc&limit_page_length=0&_=${timestamp}`;
                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });
                    if (!fetchResponse.ok)
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status}`,
                        );
                    const result = await fetchResponse.json();
                    const allItems = result?.data || [];
                    const projectKeys = [projectNo, projectName]
                        .filter(Boolean)
                        .map((value) => String(value).toLowerCase());

                    const icssItems = allItems
                        .filter((item: any) => {
                            const itemProjectNo = String(
                                item.project_no || item.project_code || "",
                            ).toLowerCase();
                            const itemProjectRef = String(
                                item.project_ref || "",
                            ).toLowerCase();

                            return projectKeys.some(
                                (projectKey) =>
                                    itemProjectNo === projectKey ||
                                    itemProjectRef === projectKey,
                            );
                        })
                        .map((item: any) => ({
                            ...item,
                            workflow_state:
                                item.workflow_state ||
                                (item.docstatus === 1
                                    ? "Submitted"
                                    : item.docstatus === 2
                                        ? "Cancelled"
                                        : "Draft"),
                            applicant_webmail:
                                item.icss_applicant_name ||
                                item.icss_applicant_webmail_id ||
                                item.owner,
                            display_workflow_state:
                                item.workflow_state === "Pending Dean Approval" &&
                                    Number(item.send_to_director || 0)
                                    ? "Pending Director Approval"
                                    : item.workflow_state ||
                                    (item.docstatus === 1
                                        ? "Submitted"
                                        : item.docstatus === 2
                                            ? "Cancelled"
                                            : "Draft"),
                        }));
                    data = await Promise.all(
                        icssItems.map(async (item: any) => {
                            if (
                                !["PO Generated", "Approved"].includes(
                                    item.workflow_state || "",
                                )
                            ) {
                                return item;
                            }

                            try {
                                const fileFilters = encodeURIComponent(
                                    JSON.stringify([
                                        ["attached_to_doctype", "=", "Indent Cum Sanction Sheet"],
                                        ["attached_to_name", "=", item.name],
                                    ]),
                                );
                                const fileFields = encodeURIComponent(
                                    JSON.stringify(["file_name", "file_url", "creation"]),
                                );
                                const fileResponse = await fetch(
                                    `/api/resource/File?filters=${fileFilters}&fields=${fileFields}&order_by=creation%20desc&limit_page_length=10`,
                                    {
                                        method: "GET",
                                        headers: { Accept: "application/json" },
                                        credentials: "include",
                                    },
                                );

                                if (!fileResponse.ok) return item;

                                const fileJson = await fileResponse.json();
                                const files = Array.isArray(fileJson?.data)
                                    ? fileJson.data
                                    : [];
                                const signedPoFile =
                                    files.find((file: any) =>
                                        String(file.file_name || "")
                                            .toLowerCase()
                                            .includes("signed"),
                                    ) || files[0];

                                return {
                                    ...item,
                                    signed_po_file_url: signedPoFile?.file_url || "",
                                    workflow_state: signedPoFile?.file_url
                                        ? "PO Delivered"
                                        : item.workflow_state,
                                    display_workflow_state: signedPoFile?.file_url
                                        ? "PO Delivered"
                                        : item.display_workflow_state,
                                    actual_workflow_state: item.workflow_state,
                                };
                            } catch (fileError) {
                                console.error(
                                    "ICSS signed PO attachment fetch error:",
                                    fileError,
                                );
                                return item;
                            }
                        }),
                    );
                } catch (fetchError) {
                    console.error(
                        "Indent cum Sanction fetch error:",
                        fetchError,
                    );
                    data = [];
                }
            } else if (selectedApplication === "Loan Request") {
                try {
                    const timestamp = Date.now();
                    const apiUrl = `/api/v2/document/Loan%20Request?fields=["name","creation","workflow_state","docstatus","owner","project_name","project_number","applicant_webmail","loan_account_type","loan_amount"]&order_by=creation desc&limit_page_length=0&_=${timestamp}`;
                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });
                    if (!fetchResponse.ok)
                        throw new Error(
                            `HTTP error! status: ${fetchResponse.status}`,
                        );
                    const result = await fetchResponse.json();
                    const allItems = result?.data || [];
                    data = allItems
                        .filter((item: any) => {
                            return (
                                item.project_name === projectName ||
                                item.project_name === projectNo ||
                                item.project_number === projectNo ||
                                item.project_number === projectName
                            );
                        })
                        .map((item: any) => ({
                            ...item,
                            workflow_state:
                                item.workflow_state ||
                                (item.docstatus === 1
                                    ? "Submitted"
                                    : item.docstatus === 2
                                        ? "Cancelled"
                                        : "Draft"),
                        }));
                } catch (fetchError) {
                    console.error("Loan Request fetch error:", fetchError);
                    data = [];
                }
            } else if (selectedApplication === "Miscellaneous Commit") {
                try {
                    const timestamp = Date.now();
                    const apiUrl = `/api/v2/document/Miscellaneous%20Commit?fields=["name","creation","workflow_state","docstatus","owner","project_number","commit_decommit","commit_amount","budget_head"]&order_by=creation desc&limit_page_length=0&_=${timestamp}`;
                    const fetchResponse = await fetch(apiUrl, {
                        method: "GET",
                        headers: { Accept: "application/json" },
                        credentials: "include",
                    });
                    if (!fetchResponse.ok)
                        throw new Error(`HTTP error! status: ${fetchResponse.status}`);
                    const result = await fetchResponse.json();
                    const allItems = result?.data || [];
                    data = allItems
                        .filter((item: any) => {
                            return (
                                item.project_number === projectName ||
                                item.project_number === projectNo
                            );
                        })
                        .map((item: any) => ({
                            ...item,
                            workflow_state: item.workflow_state || "Draft",
                        }));
                } catch (fetchError) {
                    console.error("Miscellaneous Commit fetch error:", fetchError);
                    data = [];
                }
            }
            setApplicationData(data);
        } catch (error) {
            console.error("Error fetching application data:", error);
            setApplicationData([]);
        } finally {
            setIsLoading(false);
        }
    }, [selectedApplication, projectName, projectNo, fetchReimbursements]);

    useEffect(() => {
        fetchApplicationData();
    }, [fetchApplicationData]);

    const ActionButton = ({
        children,
        onClick,
    }: {
        children: React.ReactNode;
        onClick?: () => void;
    }) => (
        <button
            onClick={onClick}
            className={cn(
                "w-full justify-start text-left text-sm font-medium text-zinc-700 dark:text-zinc-300",
                "px-4 py-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
                "shadow-sm transition-all duration-150",
                "hover:shadow-md hover:border-[#D97757]/20 hover:text-[#D97757]",
                "focus:outline-none focus:ring-2 focus:ring-[#D97757]/20",
            )}
        >
            {children}
        </button>
    );

    const activeGroup = groups.find((g) => g.title === activeTab);

    // Handle tab change - auto-select for single-item tabs
    const handleTabChange = (tabTitle: string) => {
        setActiveTab(tabTitle);
        const group = groups.find((g) => g.title === tabTitle);

        const newParams = new URLSearchParams(searchParams);
        newParams.set("subtab", tabTitle);

        if (group && group.items.length === 1) {
            // Auto-select the only item in this tab
            setSelectedApplication(group.items[0]);
            newParams.set("app", group.items[0]);
        } else {
            // Reset selection for multi-item tabs
            setSelectedApplication(null);
            newParams.delete("app");
            setApplicationData([]);
        }
        if (!embedded) setSearchParams(newParams);
    };

    const handleApplicationClick = (item: string) => {
        setSelectedApplication(item);
        const newParams = new URLSearchParams(searchParams);
        newParams.set("app", item);
        if (!embedded) setSearchParams(newParams);
    };

    const handleBack = () => {
        const group = groups.find((g) => g.title === activeTab);
        if (group && group.items.length === 1) {
            // For single-item tabs, don't clear - stay on the view
            return;
        }
        setSelectedApplication(null);
        setApplicationData([]);
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("app");
        if (!embedded) setSearchParams(newParams);
    };

    const handleApplyNew = () => {
        // Use projectNo if available, otherwise fallback to projectName (compatibility)
        const projectParam = projectNo || projectName;

        // Navigate based on application type
        switch (selectedApplication) {
            // case "One Time Assistantship":
            case "Top Up Fellowship":
                // Use projectName (Project Registration doc ID) — that's what
                // project_code links to. projectParam = projectNo is the
                // human-readable code which isn't a valid Link value.
                onNavigate(
                    `/top-up-fellowship?project=${projectName}${projectTitle ? `&projectTitle=${encodeURIComponent(projectTitle)}` : ""}`,
                );
                break;
            case "Disbursal of Honorarium":
                onNavigate(
                    `/disbursal-of-honorarium-form?project=${projectParam}${projectTitle ? `&project_name=${encodeURIComponent(projectTitle)}` : ""}`,
                );
                break;
            case "Disbursal of Consultancy":
                onNavigate(
                    `/disbursal-of-consultancy-form?project=${projectParam}`,
                );
                break;
            case "Reimbursement":
                // Use projectName (Document ID like 2026...) instead of projectParam (project_no like 26RBS...)
                // so that the Reimbursement form can successfully fetch the project document.
                onNavigate(
                    `/reimbursement?project=${projectName}${projectTitle ? `&projectTitle=${encodeURIComponent(projectTitle)}` : ""}`,
                );
                break;
            case "Temporary Advance Apply":
                onNavigate(
                    `/temporary-advance?project=${projectParam}&projectTitle=${encodeURIComponent(projectTitle || "")}`,
                );
                break;
            case "Advance Settlement":
                onNavigate(`/advance-settlement?project=${projectParam}`);
                break;
            case "Rate Contract":
                onNavigate(`/rate-contract?project=${projectParam}`);
                break;
            case "Travel Apply":
                onNavigate(`/travel?project=${projectParam}`);
                break;
            case "Travel":
                onNavigate(`/travel?project=${projectParam}`);
                break;
            case "TA DA Settlement":
                onNavigate(`/ta-da-settlement?project=${projectParam}`);
                break;
            case "Loan Request":
                onNavigate(
                    `/loan-request?project=${projectParam}&projectTitle=${encodeURIComponent(projectTitle || "")}`,
                );
                break;
            case "Project Staff Resignation":
                onNavigate(
                    `/project-staff-resignation?project=${projectParam}`,
                );
                break;
            case "Project Staff Extension":
                onNavigate(
                    `/project-staff-extension?project=${projectParam}`,
                );
                break;
            case "Miscellaneous Commit":
                onNavigate(
                    `/miscellaneous-commit-form?project=${projectName}`,
                );
                break;
            case "Direct Purchase":
                onNavigate(`/direct-purchase?project_no=${projectParam}`);
                break;
            case "Adhoc/Contractual":
                onNavigate(
                    `/recruitment-adhoc-contractual?project=${projectParam}`,
                );
                break;
            case "Indent General Form":
                onNavigate(
                    `/indent-general-form?project_no=${projectParam}&project_name=${projectName}${projectTitle ? `&projectTitle=${encodeURIComponent(projectTitle)}` : ""}`,
                );
                break;
            case "Indent cum Sanction":
                onNavigate(
                    `/indent-cum-sanction-sheet?project=${projectParam}`,
                );
                break;
            default:
                alert(
                    `Apply New: ${selectedApplication} - Route not configured yet`,
                );
        }
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    // Table view for selected application
    if (selectedApplication) {
        // Check if current tab is single-item (hide back button for these)
        const currentGroup = groups.find((g) => g.title === activeTab);
        const isSingleItemTab = currentGroup && currentGroup.items.length === 1;

        return (
            <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
                {/* Lock notice banner */}
                {isModuleLocked && (
                    <div className="mb-4 flex gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                        <AlertCircleIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                            <p className="font-semibold">Applications are currently locked</p>
                            <p>
                                This project has no available fund balance.
                                All application modules are disabled until funds are received.
                            </p>
                            <p className="mt-1">
                                Only <strong>Loan Request</strong> and <strong>Recruitment (Adhoc/Contractual)</strong> applications are available at this stage.
                            </p>
                        </div>
                    </div>
                )}

                {/* Tab Header - Always visible */}
                <div className="mb-5">
                    <nav
                        className="frappe-tabs"
                        aria-label="Quick actions tabs"
                    >
                        {groups.map((group) => {
                            const Icon = group.icon;
                            const isActive = activeTab === group.title;
                            const tabLocked = isModuleLocked && !unlockedGroups.includes(group.title);
                            return (
                                <button
                                    key={group.title}
                                    onClick={() => !tabLocked && handleTabChange(group.title)}
                                    aria-selected={isActive}
                                    disabled={tabLocked}
                                    title={tabLocked ? "Locked: Fund Sanction must be approved and funds received before using this module" : undefined}
                                    className={cn(
                                        "frappe-tab flex items-center gap-2 font-bold",
                                        isActive && "active",
                                        tabLocked && "opacity-40 cursor-not-allowed pointer-events-none",
                                    )}
                                >
                                    <Icon className="w-4 h-4" />
                                    <span>{group.title}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Header with back button and Apply New */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        {!isSingleItemTab && (
                            <button
                                onClick={handleBack}
                                className="p-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-zinc-600 dark:text-zinc-400 rotate-180" />
                            </button>
                        )}
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {selectedApplication}
                        </h3>
                    </div>

                    {(!isModuleLocked ||
                        (selectedApplication &&
                            unlockedApplications.includes(selectedApplication))) && (
                            <button
                                onClick={handleApplyNew}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
                                    "bg-[#D97757] text-white hover:bg-[#D97757]",
                                    "shadow-sm transition-all duration-150",
                                )}
                            >
                                <Plus className="w-4 h-4" />
                                Apply New
                            </button>
                        )}
                </div>

                {/* Applications Table */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757] mx-auto"></div>
                            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                                Loading applications...
                            </p>
                        </div>
                    ) : applicationData.length > 0 ? (
                        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                        Application ID
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                        Applicant
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {applicationData.map(
                                    (item: any, index: number) => (
                                        <tr
                                            key={item.name || index}
                                            className="hover:bg-zinc-50 dark:bg-zinc-800/50"
                                        >
                                            <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 font-medium">
                                                {item.name}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                                                {formatDate(item.creation)}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">
                                                {item.applicant_webmail ||
                                                    item.owner}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    {(() => {
                                                        const displayStatus =
                                                            item.signed_po_file_url &&
                                                                selectedApplication ===
                                                                "Indent cum Sanction"
                                                                ? "PO Delivered"
                                                                : item.display_workflow_state ||
                                                                item.workflow_state;
                                                        return (
                                                            <span
                                                                className={cn(
                                                                    "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                                                                    displayStatus ===
                                                                    "Approved" &&
                                                                    "bg-green-100 text-green-700",
                                                                    displayStatus ===
                                                                    "PO Delivered" &&
                                                                    "bg-green-100 text-green-700",
                                                                    displayStatus ===
                                                                    "Pending" &&
                                                                    "bg-yellow-100 text-yellow-700",
                                                                    displayStatus ===
                                                                    "Rejected" &&
                                                                    "bg-red-100 text-red-700",
                                                                    displayStatus ===
                                                                    "Draft" &&
                                                                    "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
                                                                    ![
                                                                        "Approved",
                                                                        "PO Delivered",
                                                                        "Pending",
                                                                        "Rejected",
                                                                        "Draft",
                                                                    ].includes(
                                                                        displayStatus,
                                                                    ) &&
                                                                    "bg-blue-100 text-blue-700",
                                                                )}
                                                            >
                                                                {displayStatus ||
                                                                    "Draft"}
                                                            </span>
                                                        );
                                                    })()}
                                                    {/* Show linked TA/DA Settlement status for Travel Apply rows */}
                                                    {selectedApplication ===
                                                        "Travel" &&
                                                        item.type ===
                                                        "Travel Apply" &&
                                                        applicationData
                                                            .filter(
                                                                (s: any) =>
                                                                    s.type ===
                                                                    "TA DA Settlement" &&
                                                                    s.ta_da_travel_application ===
                                                                    item.name,
                                                            )
                                                            .slice(0, 1)
                                                            .map(
                                                                (
                                                                    settlement: any,
                                                                ) => (
                                                                    <span
                                                                        key={
                                                                            settlement.name
                                                                        }
                                                                        className={cn(
                                                                            "inline-flex px-2 py-1 text-xs font-medium rounded-full",
                                                                            settlement.workflow_state ===
                                                                            "Approved" &&
                                                                            "bg-green-100 text-green-700",
                                                                            settlement.workflow_state ===
                                                                            "Rejected" &&
                                                                            "bg-red-100 text-red-700",
                                                                            settlement.workflow_state ===
                                                                            "Draft" &&
                                                                            "bg-zinc-100 text-zinc-700",
                                                                            ![
                                                                                "Approved",
                                                                                "Rejected",
                                                                                "Draft",
                                                                            ].includes(
                                                                                settlement.workflow_state,
                                                                            ) &&
                                                                            "bg-blue-100 text-blue-700",
                                                                        )}
                                                                        title={`Settlement: ${settlement.name}`}
                                                                    >
                                                                        Settled:{" "}
                                                                        {
                                                                            settlement.workflow_state
                                                                        }
                                                                    </span>
                                                                ),
                                                            )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => {
                                                            switch (
                                                            selectedApplication
                                                            ) {
                                                                case "Project Staff Resignation":
                                                                    onNavigate(
                                                                        `/project-staff-resignation?edit=${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Project Staff Extension":
                                                                    onNavigate(
                                                                        `/project-staff-extension?edit=${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Temporary Advance Apply":
                                                                    // Navigate to the new details page
                                                                    onNavigate(
                                                                        `/temporary-advance/${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Rate Contract":
                                                                    onNavigate(
                                                                        `/rate-contract?edit=${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Reimbursement":
                                                                    onNavigate(
                                                                        `/reimbursement/${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Travel": // Fallback
                                                                case "Travel Apply":
                                                                    onNavigate(
                                                                        `/travel/${item.name}`,
                                                                    );
                                                                    break;
                                                                case "TA DA Settlement":
                                                                    onNavigate(
                                                                        `/ta-da-settlement?edit=${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Disbursal of Honorarium":
                                                                    onNavigate(
                                                                        `/disbursal-of-honorarium-form/${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Top Up Fellowship":
                                                                    onNavigate(
                                                                        `/top-up-fellowship/${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Disbursal of Consultancy":
                                                                    onNavigate(
                                                                        `/disbursal-of-consultancy-form/${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Direct Purchase":
                                                                    onNavigate(
                                                                        `/direct-purchase/${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Adhoc/Contractual":
                                                                    onNavigate(
                                                                        `/recruitment-adhoc-contractual?edit=${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Loan Request":
                                                                    onNavigate(
                                                                        `/loan-request/${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Miscellaneous Commit":
                                                                    onNavigate(
                                                                        `/miscellaneous-commit/${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Indent General Form":
                                                                    onNavigate(
                                                                        `/indent-general-form-details/${item.name}`,
                                                                    );
                                                                    break;
                                                                case "Indent cum Sanction":
                                                                    onNavigate(
                                                                        `/indent-cum-sanction-sheet/${item.name}`,
                                                                    );
                                                                    break;
                                                                default:
                                                                    // Check item.type for Travel consolidated view
                                                                    if (
                                                                        item.type ===
                                                                        "Travel Apply"
                                                                    ) {
                                                                        onNavigate(
                                                                            `/travel/${item.name}`,
                                                                        );
                                                                    } else if (
                                                                        item.type ===
                                                                        "TA DA Settlement"
                                                                    ) {
                                                                        onNavigate(
                                                                            `/ta-da-settlement?edit=${item.name}`,
                                                                        );
                                                                    } else if (
                                                                        item.type ===
                                                                        "Advance Settlement"
                                                                    ) {
                                                                        onNavigate(
                                                                            `/advance-settlement/${item.name}`,
                                                                        );
                                                                    } else {
                                                                        onNavigate(
                                                                            `/reimbursement/${item.name}`,
                                                                        );
                                                                    }
                                                                    break;
                                                            }
                                                        }}
                                                        className="text-sm text-[#D97757] hover:underline whitespace-nowrap"
                                                    >
                                                        View
                                                    </button>
                                                    {selectedApplication ===
                                                        "Indent cum Sanction" &&
                                                        item.signed_po_file_url && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    window.open(
                                                                        getFileUrl(
                                                                            item.signed_po_file_url,
                                                                        ),
                                                                        "_blank",
                                                                        "noopener,noreferrer",
                                                                    );
                                                                }}
                                                                className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/35 whitespace-nowrap"
                                                            >
                                                                View Signed PO
                                                            </button>
                                                        )}
                                                    {/* NIQ Form — Indent General Form, Approved, Limited Tender, below ₹50 lakh */}
                                                    {selectedApplication ===
                                                        "Indent General Form" &&
                                                        item.workflow_state ===
                                                        "Approved" &&
                                                        Number(
                                                            item.igf_total_estimate,
                                                        ) < 5000000 &&
                                                        item.igf_tender_type ===
                                                        "Limited Tender" && (
                                                            <button
                                                                onClick={() =>
                                                                    onNavigate(
                                                                        `/niq-form/${item.name}`,
                                                                    )
                                                                }
                                                                className="text-sm text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 hover:underline whitespace-nowrap font-medium"
                                                                title="Generate NIQ Form"
                                                            >
                                                                NIQ
                                                            </button>
                                                        )}
                                                    {selectedApplication ===
                                                        "Adhoc/Contractual" &&
                                                        item.workflow_state ===
                                                        "Approved" && (
                                                            <>
                                                                <button
                                                                    onClick={() =>
                                                                        onNavigate(
                                                                            `/candidate-applications?refNum=${item.name}`,
                                                                        )
                                                                    }
                                                                    className="text-sm text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 hover:underline whitespace-nowrap"
                                                                >
                                                                    Add
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        handleScrClick(
                                                                            item,
                                                                        )
                                                                    }
                                                                    className="text-sm text-green-600 hover:text-green-800 dark:text-green-500 hover:underline whitespace-nowrap"
                                                                >
                                                                    SCR
                                                                </button>
                                                            </>
                                                        )}
                                                    {selectedApplication ===
                                                        "Direct Purchase" &&
                                                        item.workflow_state ===
                                                        "Approved" && (
                                                            <button
                                                                onClick={() =>
                                                                    handleP11FormClick(
                                                                        item,
                                                                    )
                                                                }
                                                                className="text-sm text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 hover:underline whitespace-nowrap"
                                                            >
                                                                P-11-Form
                                                            </button>
                                                        )}
                                                    {selectedApplication ===
                                                        "Direct Purchase" &&
                                                        item.workflow_state ===
                                                        "Draft" && (
                                                            <button
                                                                onClick={() =>
                                                                    handleDeleteDraftDirectPurchase(
                                                                        item,
                                                                    )
                                                                }
                                                                disabled={
                                                                    deletingDraftName ===
                                                                    item.name
                                                                }
                                                                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 hover:underline whitespace-nowrap disabled:opacity-50"
                                                            >
                                                                {deletingDraftName ===
                                                                    item.name
                                                                    ? "Deleting..."
                                                                    : "Delete"}
                                                            </button>
                                                        )}
                                                    {selectedApplication ===
                                                        "Temporary Advance Apply" && (
                                                            <button
                                                                onClick={() =>
                                                                    handleSettleClick(
                                                                        item,
                                                                    )
                                                                }
                                                                className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:underline whitespace-nowrap"
                                                            >
                                                                Settle
                                                            </button>
                                                        )}
                                                    {selectedApplication ===
                                                        "Travel" &&
                                                        item.type ===
                                                        "Travel Apply" &&
                                                        item.workflow_state ===
                                                        "Approved" && (
                                                            <button
                                                                onClick={() =>
                                                                    handleTravelSettleClick(
                                                                        item,
                                                                    )
                                                                }
                                                                className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:text-zinc-100 hover:underline whitespace-nowrap"
                                                            >
                                                                Settle
                                                            </button>
                                                        )}
                                                </div>
                                            </td>
                                        </tr>
                                    ),
                                )}
                            </tbody>
                        </table>
                    ) : (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                                <FileTextIcon className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
                            </div>
                            <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                                No applications yet
                            </h4>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                You haven't submitted any{" "}
                                {selectedApplication?.toLowerCase()}{" "}
                                applications for this project.
                            </p>
                            <button
                                onClick={handleApplyNew}
                                className={cn(
                                    "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm",
                                    "bg-[#D97757] text-white hover:bg-[#D97757]",
                                    "shadow-sm transition-all duration-150",
                                )}
                            >
                                <Plus className="w-4 h-4" />
                                Apply New
                            </button>
                        </div>
                    )}
                </div>

                <AdvanceSettlementModal
                    isOpen={isSettleModalOpen}
                    onClose={() => setIsSettleModalOpen(false)}
                    settlements={existingSettlements}
                    onConvertNew={() => {
                        setIsSettleModalOpen(false);
                        if (selectedAdvanceForSettle) {
                            onNavigate(
                                `/advance-settlement?advance=${selectedAdvanceForSettle.name}&project=${projectName}`,
                            );
                        }
                    }}
                    onNavigate={onNavigate}
                />
                <TADASettlementModal
                    isOpen={isTADASettleModalOpen}
                    onClose={() => setIsTADASettleModalOpen(false)}
                    settlements={existingTADASettlements}
                    onConvertNew={() => {
                        setIsTADASettleModalOpen(false);
                        if (selectedTravelForSettle) {
                            onNavigate(
                                `/ta-da-settlement?project=${projectNo}&travel_ref=${selectedTravelForSettle.name}`,
                            );
                        }
                    }}
                    onNavigate={onNavigate}
                />
                <P11FormModal
                    isOpen={isP11ModalOpen}
                    onClose={() => setIsP11ModalOpen(false)}
                    forms={existingP11Forms}
                    onCreateNew={() => {
                        setIsP11ModalOpen(false);
                        if (selectedDirectPurchaseForP11) {
                            onNavigate(
                                `/p11-form?project_no=${projectNo || projectName}&app_id=${selectedDirectPurchaseForP11.name}`,
                            );
                        }
                    }}
                    onNavigate={onNavigate}
                />
                <ScrModal
                    isOpen={isScrModalOpen}
                    onClose={() => setIsScrModalOpen(false)}
                    scrs={existingScrs}
                    onCreateNew={() => {
                        setIsScrModalOpen(false);
                        if (selectedItemForScr) {
                            onNavigate(
                                `/selection-committee-report?interview_id=${selectedItemForScr.name}`,
                            );
                        }
                    }}
                    onNavigate={onNavigate}
                />
            </div>
        );
    }

    // Category selection view
    return (
        <div className="p-5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
            {/* Lock notice banner */}
            {isModuleLocked && (
                <div className="mb-4 flex gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                    <AlertCircleIcon className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                        <p className="font-semibold">Applications are currently locked</p>
                        <p>
                            This project has no available fund balance.
                            All application modules are disabled until funds are received.
                        </p>
                        <p className="mt-1">
                            Only <strong>Loan Request</strong> and <strong>Recruitment (Adhoc/Contractual)</strong> applications are available at this stage.
                        </p>
                    </div>
                </div>
            )}

            {/* Tab Header */}
            <div className="mb-5">
                <nav className="frappe-tabs" aria-label="Quick actions tabs">
                    {groups.map((group) => {
                        const Icon = group.icon;
                        const isActive = activeTab === group.title;
                        const tabLocked = isModuleLocked && !unlockedGroups.includes(group.title);
                        return (
                            <button
                                key={group.title}
                                onClick={() => !tabLocked && handleTabChange(group.title)}
                                aria-selected={isActive}
                                disabled={tabLocked}
                                title={tabLocked ? "Locked: Fund Sanction must be approved and funds received before using this module" : undefined}
                                className={cn(
                                    "frappe-tab flex items-center gap-2 font-bold",
                                    isActive && "active",
                                    tabLocked && "opacity-40 cursor-not-allowed pointer-events-none",
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{group.title}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="p-5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
                {isModuleLocked && !unlockedGroups.includes(activeTab) ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                        <AlertCircleIcon className="w-9 h-9 text-amber-400" />
                        <div className="text-center space-y-1 max-w-sm">
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                This module is locked
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                                This project has no available fund balance.
                                Ensure funds are received under the
                                <strong className="text-zinc-600 dark:text-zinc-300"> Sanction Details</strong> tab
                                to unlock application modules.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {activeGroup?.items.map((item) => (
                            <ActionButton
                                key={item}
                                onClick={() => handleApplicationClick(item)}
                            >
                                {item}
                            </ActionButton>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
// --- END: REFACTORED QuickActions COMPONENT ---

// --- Activity Stream Component ---
const ActivityStream = forwardRef<ActivityStreamHandle, ActivityStreamProps>(
    ({ doctype, docname }, ref) => {
        const [newComment, setNewComment] = useState("");
        const [isSubmitting, setIsSubmitting] = useState(false);
        const { data: activityData, mutate: refetchActivity } =
            useFrappeGetCall<{
                message: ActivityItem[];
            }>("rndopsapp.rndopsapp.api.get_project_activity", {
                doctype,
                docname,
            });
        const { call: addComment } = useFrappePostCall(
            "rndopsapp.rndopsapp.api.add_project_comment",
        );

        useImperativeHandle(ref, () => ({
            refetch() {
                refetchActivity();
            },
        }));

        const handleCommentSubmit = async () => {
            if (!newComment.trim()) return;
            setIsSubmitting(true);
            try {
                await addComment({
                    doctype: doctype,
                    docname: docname,
                    content: newComment,
                });
                setNewComment("");
                refetchActivity();
            } catch (error) {
                console.error("Failed to add comment:", error);
            } finally {
                setIsSubmitting(false);
            }
        };

        const handleKeyPress = (e: React.KeyboardEvent) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                handleCommentSubmit();
            }
        };

        const items: ActivityItem[] = activityData?.message ?? [];

        return (
            <div className="space-y-4">
                {/* Comment input */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-3">
                    <Textarea
                        placeholder="Add a comment… (Ctrl+Enter to submit)"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={handleKeyPress}
                        className="resize-none text-sm min-h-[80px]"
                    />
                    <div className="flex justify-end">
                        <button
                            onClick={handleCommentSubmit}
                            disabled={isSubmitting || !newComment.trim()}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#D97757] text-white text-sm font-semibold hover:bg-[#c4664a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmitting ? "Posting…" : "Post Comment"}
                        </button>
                    </div>
                </div>

                {/* Activity list */}
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {items.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-14 text-zinc-400 dark:text-zinc-500 gap-2">
                            <MessageSquareIcon className="w-8 h-8" />
                            <p className="text-sm">No activity yet.</p>
                        </div>
                    ) : (
                        items.map((item, idx) => (
                            <div key={idx} className="flex gap-3 px-4 py-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-bold uppercase">
                                    {item.owner?.[0] ?? "?"}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                                            {item.owner}
                                        </span>
                                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                                            {new Date(item.creation).toLocaleString("en-IN", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </span>
                                        {item.comment_type && item.comment_type !== "Comment" && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-medium">
                                                {item.comment_type}
                                            </span>
                                        )}
                                    </div>
                                    <p
                                        className="text-sm text-zinc-600 dark:text-zinc-300 mt-0.5 leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: item.content }}
                                    />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    },
);
ActivityStream.displayName = "ActivityStream";

// --- Workflow Actions Component ---
const WorkflowActions = ({
    docname,
    onAction,
    isLoading,
    projectNo,
    status,
    isStaffRnD,
}: {
    docname: string;
    onAction: (action: string) => void;
    isLoading: boolean;
    projectNo?: string;
    status?: string;
    isStaffRnD?: boolean;
}) => {
    const { data } = useFrappeGetCall<{ message: string[] }>(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.get_available_workflow_actions",
        { docname },
    );
    if (!data?.message || data.message.length === 0) return null;

    const isForwardBlocked =
        isStaffRnD && status === "Pending Staff Approval" && !projectNo?.trim();

    return (
        <div className="flex items-center gap-2">
            {data.message.map((actionString: string) => {
                const isForward = actionString.toLowerCase() === "forward";
                const blocked = isForward && isForwardBlocked;
                return (
                    <div key={actionString} className="relative group">
                        <FrappeButton
                            onClick={() => onAction(actionString)}
                            variant="outline"
                            disabled={isLoading || blocked}
                            className={
                                blocked ? "opacity-50 cursor-not-allowed" : ""
                            }
                        >
                            {isLoading ? "Processing..." : actionString}
                        </FrappeButton>
                        {blocked && (
                            <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block z-50 w-max max-w-xs">
                                <div className="bg-zinc-900 text-white text-xs rounded px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                                    Project Number is required before
                                    forwarding.
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

const normalizeResponse = (raw: any): any[] => {
    if (!raw) return [];
    // shape: { message: { message: [ ... ] } }
    if (
        raw.message &&
        raw.message.message &&
        Array.isArray(raw.message.message)
    )
        return raw.message.message;
    if (raw.message && Array.isArray(raw.message)) return raw.message;
    if (Array.isArray(raw)) return raw;
    if (raw.data && Array.isArray(raw.data)) return raw.data;
    if (raw.results && Array.isArray(raw.results)) return raw.results;
    if (raw.message && raw.message.data && Array.isArray(raw.message.data))
        return raw.message.data;
    // Handle case where message is an object with data property
    if (raw.message && typeof raw.message === 'object' && raw.message.data && Array.isArray(raw.message.data))
        return raw.message.data;
    return [];
};

// --- Main Component ---
const ProjectDetailsOverview: React.FC<ProjectDetailsProps> = ({
    projectName: propProjectName,
    embedded = false,
    hideActions = false,
}) => {
    const { projectName: paramProjectName } = useParams<{
        projectName: string;
    }>();
    const projectName = propProjectName || paramProjectName;
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");
    const [activityViewType, setActivityViewType] = useState<"fund" | "sanction">("sanction");
    const activityStreamRef = useRef<ActivityStreamHandle>(null);
    const { currentUser } = useFrappeAuth();
    const { data, error, isLoading, mutate } = useFrappeGetDoc(
        "Project Registration",
        projectName ?? "",
        projectName ? undefined : null, // Use undefined to use default key, or null to pause
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            refreshInterval: 0, // Don't auto-refresh
            dedupingInterval: 60000, // Cache for 60 seconds
        },
    );
    const { data: fundingAgencyResult } = useFrappeGetCall<{
        message: Record<string, any>;
    }>(
        "frappe.client.get_value",
        data?.funding_agen
            ? {
                doctype: "fundingagency_",
                filters: data.funding_agen,
                fieldname: JSON.stringify([
                    "funding_agency_id",
                    "funding_agency_name",
                    "funding_agency_initials",
                    "funding_agency_type_1",
                    "origin_of_funding_agency",
                    "gstin_of_funding_agency",
                    "ministry_funding_agency",
                    "fundingagency_address",
                    "fundingagency_country",
                    "fundingagency_state",
                    "fundingagency_postalcode",
                ]),
            }
            : undefined,
        data?.funding_agen ? `funding-agency-${data.funding_agen}` : null,
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            refreshInterval: 0,
            dedupingInterval: 60000,
        },
    );
    const fundingAgencyData = fundingAgencyResult?.message;
    const { call: triggerWorkflowAction, loading: isActionLoading } =
        useFrappePostCall("rndopsapp.rndopsapp.api.handle_workflow_action");
    const { call: submitProjectRegistration } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.submit_project_registration",
    );
    const { call: submitSanction, loading: isSubmittingSanction } =
        useFrappePostCall(
            "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.submit_fund_sanction",
        );

    const { roles } = useUserRoles(currentUser ?? null);
    const isRnDStaff = roles.some(
        (r: string) =>
            r === "RnD Staff" ||
            r === "R&D Staff" ||
            r === "Research and Development Staff" ||
            r === "System Manager" ||
            r === "staff, RnD" ||
            r === "Hos, RnD (Head of Section, RnD)",
    );
    const isStaffRnDOnly = roles.includes("staff, RnD");
    // console.log("User Roles:", roles, "Is RnD Staff:", isRnDStaff);

    const {
        data: sanctionData,
        error: sanctionError,
        isLoading: sanctionIsLoading,
        mutate: refetchSanctions,
    } = useFrappeGetCall(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_sanctions_for_project",
        { project_name: projectName },
        projectName ? undefined : null,
        { revalidateOnFocus: false },
    );

    // Fetch Fund Received Data
    const fundQueryParams = useMemo(
        () => ({
            prjreg_title: data?.project_no || "",
            limit: 200,
            start: 0,
        }),
        [data?.project_no],
    );

    const {
        data: fundReceivedData,
        isLoading: isFundLoading,
        error: fundError,
    } = useFrappeGetCall<{
        message: {
            data: any[];
        };
    }>(
        "rndopsapp.rndopsapp.api.get_fund_received_by_prjreg",
        fundQueryParams,
        data?.project_no ? undefined : null,
        { revalidateOnFocus: false },
    );

    const { data: activityData } = useFrappeGetCall<{
        message: ActivityItem[];
    }>("rndopsapp.rndopsapp.api.get_project_activity", {
        doctype: "Project Registration",
        docname: projectName,
    });

    // --- Budget State ---
    const [isLedgerOpen, setIsLedgerOpen] = useState(false);
    const [commitHead, setCommitHead] = useState("Travel");
    const [commitAmount, setCommitAmount] = useState("");
    const [budgetData, setBudgetData] = useState<BudgetEntry[]>([]);
    const [manualCommitments, setManualCommitments] = useState<BudgetEntry[]>(
        [],
    ); // Track manual commitments
    const [sidebarComment, setSidebarComment] = useState("");
    const [selectedSanctionIndex, setSelectedSanctionIndex] = useState(0);
    const [activeLedgerTab, setActiveLedgerTab] = useState("All"); // Tab filter for ledger by head

    const sanctionActivityDocname = (() => {
        const sanctions = normalizeResponse(sanctionData);
        return sanctions[selectedSanctionIndex]?.name || null;
    })();

    const { data: sanctionActivityData } = useFrappeGetCall<{
        message: ActivityItem[];
    }>(
        "rndopsapp.rndopsapp.api.get_project_activity",
        sanctionActivityDocname
            ? { doctype: "Fund Sanction", docname: sanctionActivityDocname }
            : undefined,
    );

    const fundReceivedActivityDocname = (() => {
        const funds = normalizeResponse(fundReceivedData);
        return funds[0]?.name || null;
    })();

    const { data: fundReceivedActivityData } = useFrappeGetCall<{
        message: ActivityItem[];
    }>(
        "rndopsapp.rndopsapp.api.get_project_activity",
        fundReceivedActivityDocname
            ? { doctype: "Fund Received", docname: fundReceivedActivityDocname }
            : undefined,
    );

    // --- Modal State for Sanction Submit ---
    const [sanctionModalOpen, setSanctionModalOpen] = useState(false);
    const [selectedSanctionName, setSelectedSanctionName] = useState("");

    // --- Payment Modal State ---
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedCommitmentForPayment, setSelectedCommitmentForPayment] =
        useState<BudgetEntry | null>(null);
    const [paymentFormData, setPaymentFormData] = useState<Record<string, any>>(
        {},
    );
    const [paymentFieldDefs, setPaymentFieldDefs] = useState<any[]>([]);
    const [paymentLinkOptions, setPaymentLinkOptions] = useState<
        Record<string, any[]>
    >({});
    const [isPaymentSubmitting, setIsPaymentSubmitting] = useState(false);

    // Extract unique heads from budget data for tabs
    const ledgerHeadTabs = useMemo(() => {
        const heads = new Set<string>();
        budgetData.forEach((entry: any) => {
            const head = entry.head || entry.accountHead;
            if (head) heads.add(head);
        });
        return ["All", ...Array.from(heads).sort()];
    }, [budgetData]);

    // Filter budget data based on selected ledger tab
    const filteredLedgerData = useMemo(() => {
        if (activeLedgerTab === "All") return budgetData;
        return budgetData.filter((entry: any) => {
            const head = (entry.head || entry.accountHead || "")
                .trim()
                .toLowerCase();
            return head === activeLedgerTab.toLowerCase();
        });
    }, [budgetData, activeLedgerTab]);

    // --- LEDGER STATE & API ---
    const [ledgerTransactions, setLedgerTransactions] = useState<
        LedgerTransaction[]
    >([]);
    const [isLedgerLoading, setIsLedgerLoading] = useState(false);
    const [ledgerError, setLedgerError] = useState<string | null>(null);
    const [ledgerSortOrder, setLedgerSortOrder] = useState<"newest" | "oldest">(
        "oldest",
    );
    const [ledgerPage, setLedgerPage] = useState(1);
    const [ledgerPageSize, setLedgerPageSize] = useState(10);

    // Apply sorting to filtered data (fix for newest/oldest button issue)
    const sortedFilteredLedgerData = useMemo(() => {
        const sorted = [...filteredLedgerData].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            return ledgerSortOrder === "newest"
                ? dateB - dateA // Newest first
                : dateA - dateB; // Oldest first
        });
        return sorted;
    }, [filteredLedgerData, ledgerSortOrder]);

    // Set default commitHead when heads become available
    useEffect(() => {
        const availableHeads = ledgerHeadTabs.filter((h) => h !== "All");
        if (availableHeads.length > 0 && !availableHeads.includes(commitHead)) {
            setCommitHead(availableHeads[0]);
        }
    }, [ledgerHeadTabs]);

    // API call for adding comment
    const { call: addComment, loading: isAddingComment } = useFrappePostCall(
        "rndopsapp.rndopsapp.api.add_project_comment",
    );

    // Fetch Budget Heads from Frappe v2 API
    const [budgetHeadList, setBudgetHeadList] = useState<
        { name: string; id: number }[]
    >([]);

    // Track which heads have data (non-empty transactions)
    const [headsWithData, setHeadsWithData] = useState<Set<number>>(new Set());
    const [isCheckingHeads, setIsCheckingHeads] = useState(false);

    useEffect(() => {
        const fetchBudgetHeads = async () => {
            try {
                const response = await fetch(
                    '/api/resource/Budget%20Head?fields=["budget_head","id"]&order_by=id%20asc&limit_page_length=0',
                );
                const result = await response.json();
                console.log("[PDO] Budget Head API raw result:", result);
                console.log("[PDO] Budget Heads fetched:", result?.data?.length ?? 0, "records:", result?.data?.map((h: any) => `${h.budget_head}(id=${h.id})`));
                if (result?.data) {
                    setBudgetHeadList(
                        result.data.map((item: any) => ({
                            name: item.budget_head,
                            id: item.id,
                        })),
                    );
                }
            } catch (err) {
                console.error("[PDO] Failed to fetch Budget Heads:", err);
            }
        };
        fetchBudgetHeads();
    }, []);

    // Check which budget heads have data when entering ledger tab
    useEffect(() => {
        const checkHeadsWithData = async () => {
            if (!projectName || budgetHeadList.length === 0) return;

            const effectiveProjectNo = data?.project_no || projectName;
            console.log(`[PDO] checkHeadsWithData — project: "${effectiveProjectNo}", heads: ${budgetHeadList.length}, data?.project_no: "${data?.project_no}"`);

            setIsCheckingHeads(true);
            const headsSet = new Set<number>();

            try {
                // Check each head for data
                const promises = budgetHeadList.map(async (head) => {
                    const url = `/ledger-api/commit-payment-transactions?projectNumber=${effectiveProjectNo}&accountHeadId=${head.id}`;
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            const txns = await response.json();
                            const hasData = Array.isArray(txns) && txns.length > 0;
                            console.log(`[PDO] Head "${head.name}" (id=${head.id}): ${txns?.length ?? "err"} txns → ${hasData ? "HAS DATA" : "empty"}`);
                            if (hasData) {
                                headsSet.add(head.id);
                            }
                        } else {
                            console.warn(`[PDO] Head "${head.name}" (id=${head.id}): HTTP ${response.status}`);
                        }
                    } catch (err) {
                        console.error(`[PDO] Head "${head.name}" (id=${head.id}): fetch error`, err);
                    }
                });

                await Promise.all(promises);
                setHeadsWithData(headsSet);
                console.log("[PDO] headsWithData ids:", [...headsSet]);
            } catch (err) {
                console.error("[PDO] checkHeadsWithData failed:", err);
            } finally {
                setIsCheckingHeads(false);
            }
        };

        if (activeTab === "ledger") {
            checkHeadsWithData();
        }
    }, [activeTab, projectName, budgetHeadList, data?.project_no]);

    // Use budgetHeadList filtered to only heads with data for ledger tabs
    const ledgerHeads = useMemo(
        () => budgetHeadList.filter((head) => headsWithData.has(head.id)),
        [budgetHeadList, headsWithData],
    );

    // Track selected head by ID
    const [activeLedgerHeadId, setActiveLedgerHeadId] = useState<
        string | number
    >("");

    // Set default active Ledger Head once data is loaded
    useEffect(() => {
        if (ledgerHeads.length > 0 && !activeLedgerHeadId) {
            setActiveLedgerHeadId(ledgerHeads[0].id);
        }
    }, [ledgerHeads]);

    // Fetch Ledger Data when tab/head changes
    useEffect(() => {
        console.log(
            "Ledger useEffect - activeTab:",
            activeTab,
            "activeLedgerHeadId:",
            activeLedgerHeadId,
        );
        if (activeTab === "ledger" && activeLedgerHeadId) {
            fetchLedgerData(activeLedgerHeadId);
        }
    }, [projectName, activeLedgerHeadId]);

    const sortedTransactions = useMemo(() => {
        return [...ledgerTransactions].sort((a, b) => {
            const dateA = new Date(a.transactionDate || "").getTime();
            const dateB = new Date(b.transactionDate || "").getTime();
            return ledgerSortOrder === "newest" ? dateB - dateA : dateA - dateB;
        });
    }, [ledgerTransactions, ledgerSortOrder]);

    const fetchLedgerData = async (headId: string | number) => {
        setIsLedgerLoading(true);
        setLedgerError(null);
        try {
            // Use proxy to avoid CORS - /ledger-api proxies to http://172.16.117.39:18083/api
            const response = await fetch(
                `/ledger-api/commit-payment-transactions?projectNumber=${data?.project_no || projectName}&accountHeadId=${headId}`,
            );
            console.log(
                "Ledger API response status:",
                response,
                "for projectNumber:",
                projectName,
                "headId:",
                headId,
            );
            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText} `);
            }

            const result = await response.json();
            console.log(
                "Ledger API response data:",
                result,
                "for projectNumber:",
                projectName,
                "headId:",
                headId,
            );

            const rawData = Array.isArray(result) ? result : [];
            let runningPaymentBalance = 0;

            // Sort by date ascending to ensure accurate running balance
            const sortedData = [...rawData].sort(
                (a: any, b: any) =>
                    new Date(a.transactionDate).getTime() -
                    new Date(b.transactionDate).getTime(),
            );

            const calculatedData = sortedData.map((txn: any) => {
                const received = txn.fundReceivedAmount || 0;
                const paid = txn.paymentAmount || 0;
                runningPaymentBalance = runningPaymentBalance + received - paid;
                return {
                    ...txn,
                    paymentBalance: runningPaymentBalance,
                    // Map ledger API fields to budget entry structure
                    sl: txn.transactionId,
                    date: txn.transactionDate
                        ? new Date(txn.transactionDate).toLocaleDateString(
                            "en-IN",
                        )
                        : "",
                    particulars: txn.particulars || "",
                    ref: txn.refDetails || "",
                    received: received,
                    committed: txn.commitAmount || 0,
                    bmr: txn.bmr || "", // Use empty string for null
                    payment: paid,
                    commitableBalance: txn.commitableBalance || 0,
                    actualBalance: txn.balance || 0,
                    head: "", // Will be determined later
                    type: "transaction" as const,
                    moduleCode: txn.moduleCode,
                    frapAppId: txn.frapAppId,
                };
            });

            setLedgerTransactions(calculatedData);
        } finally {
            setIsLedgerLoading(false);
        }
    };

    // Process Fund Received Data and Manual Commitments into Budget Ledger
    useEffect(() => {
        const funds = normalizeResponse(fundReceivedData);
        let rawEntries: BudgetEntry[] = [];

        // 1. Process API Funds
        if (funds && funds.length > 0) {
            funds.forEach((fund: any) => {
                if (
                    fund.received_amt_breakup &&
                    Array.isArray(fund.received_amt_breakup)
                ) {
                    fund.received_amt_breakup.forEach((item: any) => {
                        rawEntries.push({
                            sl: 0, // Assigned later
                            date:
                                fund.transaction_date ||
                                fund.modified?.split(" ")[0] ||
                                "",
                            particulars: `Fund Received - ${item.account_head} `,
                            ref: fund.sanction_ref_no || fund.name,
                            received: item.amount_received,
                            committed: 0,
                            commitableBalance: 0, // Calc later
                            bmr: "",
                            payment: 0,
                            actualBalance: 0, // Calc later
                            type: "transaction",
                            accountHead: item.account_head,
                        } as BudgetEntry & { accountHead?: string });
                    });
                }
            });
        }

        // 2. Combine with Manual Commitments and Ledger Transactions
        // We assume chronological order: Funds first, then commitments.
        // You could sort by date here if 'manualCommitments' have dates interleaved with funds.
        // For now, appending manual commitments as per user workflow.
        const allRawEntries = [
            ...rawEntries,
            ...manualCommitments,
            ...ledgerTransactions,
        ];

        // 3. Calculate Running Totals

        const headFundTotals: Record<string, number> = {};
        const headCommitTotals: Record<string, number> = {};
        const headPaymentTotals: Record<string, number> = {};

        // 3. Calculate Running Totals
        let runningPaymentBalance = 0; // Global Payment Balance (Received - Paid)

        const calculatedEntries = allRawEntries.map((entry, idx) => {
            // Determine Head
            let head = (entry as any).head || (entry as any).accountHead;

            // Fallback parsing
            if (!head) {
                if (entry.particulars.startsWith("Commitment for ")) {
                    head = entry.particulars
                        .replace("Commitment for ", "")
                        .trim();
                } else if (entry.particulars.startsWith("Fund Received - ")) {
                    head = entry.particulars
                        .replace("Fund Received - ", "")
                        .trim();
                }
            }
            head = head || "Unspecified";

            if (entry.type === "transaction") {
                runningPaymentBalance += entry.received || 0;
                headFundTotals[head] =
                    (headFundTotals[head] || 0) + (entry.received || 0);
            } else if (entry.type === "commitment") {
                headCommitTotals[head] =
                    (headCommitTotals[head] || 0) + (entry.committed || 0);
            }

            // Track payments
            if (entry.payment) {
                runningPaymentBalance -= entry.payment;
                headPaymentTotals[head] =
                    (headPaymentTotals[head] || 0) + entry.payment;
            }

            const headActualBalance =
                (headFundTotals[head] || 0) - (headPaymentTotals[head] || 0);

            // Per-Head Commitable Balance = Received - Committed - Payment
            const currentHeadBalance =
                (headFundTotals[head] || 0) -
                (headCommitTotals[head] || 0) -
                (headPaymentTotals[head] || 0);

            return {
                ...entry,
                sl: idx + 1,
                paymentBalance: runningPaymentBalance, // Global Running Total (Received - Paid)
                actualBalance: runningPaymentBalance, // Global Running Total
                headActualBalance: headActualBalance, // Per-Head Actual Balance
                commitableBalance: currentHeadBalance, // Specific Head Balance
                head: head, // Persist resolved head
            };
        });

        setBudgetData(calculatedEntries);
    }, [
        JSON.stringify(fundReceivedData),
        manualCommitments,
        ledgerTransactions,
    ]);

    // Calculate balances based on selected Commit Head
    // Filter budget data for the selected head to calculate specific balance

    // Total project balances from Frappe API - for header display
    // Memoize params and options to prevent infinite re-renders
    const balanceParams = useMemo(
        () => ({ project_number: data?.project_no || "" }),
        [data?.project_no],
    );

    const { data: projectAmounts, isLoading: isBalanceLoading } =
        useFrappeGetCall<{
            message: {
                data: {
                    totalPaid: number;
                    availableCommitAmount: number; // This is the "Actual Balance"
                    availablePaymentAmount: number; // This is the "Commitable"
                };
            };
        }>(
            "rndopsapp.rndopsapp.commitPayment.get_project_available_amounts",
            balanceParams,
            data?.project_no ? undefined : null,
            {
                revalidateOnFocus: false,
                revalidateOnReconnect: false,
                dedupingInterval: 60000,
            },
        );

    // Extract balance values from API response
    // Note: useFrappeGetCall may unwrap 'message' automatically in some versions, so check both paths
    const projectData =
        (projectAmounts as any)?.message?.data ??
        (projectAmounts as any)?.data ??
        {};
    const actualBalance = projectData?.availableCommitAmount ?? 0;
    const commitableBalance = projectData?.availablePaymentAmount ?? 0;

    const handleCommit = () => {
        const amount = parseFloat(commitAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        const newEntry: BudgetEntry & { _id: number; head: string } = {
            sl: 0, // Recalculated in effect
            date: new Date().toLocaleDateString("en-GB").replace(/\//g, "."),
            particulars: `Commitment for ${commitHead}`,
            ref: "",
            received: 0,
            committed: amount,
            commitableBalance: 0, // Recalculated in effect
            bmr: "",
            payment: 0,
            paymentBalance: 0, // Recalculated in effect
            actualBalance: 0, // Recalculated in effect
            type: "commitment",
            head: commitHead,
            _id: Date.now(), // Unique ID for removal
        };

        setManualCommitments((prev) => [...prev, newEntry]);
        setCommitAmount("");
    };

    const handleRemoveLastCommit = () => {
        if (manualCommitments.length === 0) {
            alert("No commitments to remove.");
            return;
        }
        setManualCommitments((prev) => prev.slice(0, -1));
    };

    const handleSidebarCommentSubmit = async () => {
        if (!sidebarComment.trim()) return;
        try {
            await addComment({
                doctype: "Project Registration",
                docname: projectName,
                content: sidebarComment,
            });
            setSidebarComment("");
            // If the activity stream is currently mounted (tab is active), refresh it
            if (activeTab === "activity" && activityStreamRef.current) {
                activityStreamRef.current.refetch();
            } else {
                // If not on activity tab, we might want to switch to it or just let the user know
                // For now, let's just notify via a simple alert or toast if we had one,
                // but since we don't have a toast system ready, we'll just clear the input.
                // Optionally switch to activity tab:
                // setActiveTab("activity");
            }
        } catch (error) {
            console.error("Failed to add comment:", error);
            alert("Failed to submit comment. Please try again.");
        }
    };

    const handleSanctionSubmitClick = (sanctionName: string) => {
        setSelectedSanctionName(sanctionName);
        setSanctionModalOpen(true);
    };

    const handleConfirmSanctionSubmit = useCallback(
        async (comment: string) => {
            try {
                await submitSanction({ sanction_name: selectedSanctionName });

                // Add comment as activity if provided
                if (comment && comment.trim()) {
                    try {
                        await addComment({
                            doctype: "Fund Sanction",
                            docname: selectedSanctionName,
                            content: `[Submit] ${comment.trim()} `,
                        });
                    } catch (commentError) {
                        console.error("Error adding comment:", commentError);
                        // Don't fail the whole operation if comment fails
                    }
                }

                setSanctionModalOpen(false);
                refetchSanctions();
            } catch (error: any) {
                console.error("Error submitting sanction:", error);
                alert("Failed to submit sanction. Please try again.");
            }
        },
        [submitSanction, refetchSanctions, selectedSanctionName, addComment],
    );

    // --- Payment Modal Handlers ---
    const openPaymentModal = useCallback(
        async (row: BudgetEntry) => {
            setSelectedCommitmentForPayment(row);
            try {
                // Fetch payment field definitions from API
                const response = await fetch(
                    "/api/method/rndopsapp.rndopsapp.commitPayment.get_account_head_payment_fields",
                );
                const result = await response.json();
                if (result?.message) {
                    const { fields, prefill_data, link_options } =
                        result.message;
                    setPaymentFieldDefs(fields || []);
                    setPaymentLinkOptions(link_options || {});

                    // Prefill form data from the committed row
                    const accountHeadValue = budgetHeadList.find(
                        (bh) =>
                            bh.name.toLowerCase() ===
                            (
                                (row as any).head ||
                                (row as any).accountHead ||
                                ""
                            ).toLowerCase(),
                    );

                    setPaymentFormData({
                        ...prefill_data,
                        project_ref_number: projectName || "",
                        payment_amount: row.committed || 0,
                        budget_head:
                            accountHeadValue?.name || (row as any).head || "",
                        payment_bmr: row.bmr || "",
                        payment_date: new Date().toISOString().split("T")[0],
                        payment_particular: row.particulars || "",
                        commit_id: (row as any).transactionId || "",
                    });
                }
                setPaymentModalOpen(true);
            } catch (err) {
                console.error("Failed to fetch payment fields:", err);
                alert("Failed to load payment form. Please try again.");
            }
        },
        [projectName, budgetHeadList],
    );

    const handlePaymentFieldChange = (fieldname: string, value: any) => {
        setPaymentFormData((prev) => ({ ...prev, [fieldname]: value }));
    };

    const handleSubmitPayment = useCallback(async () => {
        if (!selectedCommitmentForPayment) return;
        setIsPaymentSubmitting(true);
        try {
            const response = await fetch(
                "/api/method/rndopsapp.rndopsapp.doctype.accountheadpayment.accountheadpayment.submit_payment_data",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    credentials: "include",
                    body: JSON.stringify({
                        doctype: "AccountHeadPayment",
                        name: "",
                        project_name:
                            paymentFormData.project_ref_number || projectName,
                        payment_amount: paymentFormData.payment_amount,
                        budget_head: paymentFormData.budget_head,
                        bmr: paymentFormData.payment_bmr,
                    }),
                },
            );
            const result = await response.json();
            if (result.exc || result.exception) {
                throw new Error(result.exc || result.exception);
            }
            // Success - close modal and refresh ledger
            setPaymentModalOpen(false);
            setSelectedCommitmentForPayment(null);
            setPaymentFormData({});
            // Refresh ledger data
            if (activeLedgerHeadId) {
                fetchLedgerData(activeLedgerHeadId);
            }
            alert("Payment submitted successfully!");
        } catch (err: any) {
            console.error("Payment submission failed:", err);
            alert(
                "Failed to submit payment: " + (err.message || "Unknown error"),
            );
        } finally {
            setIsPaymentSubmitting(false);
        }
    }, [
        selectedCommitmentForPayment,
        paymentFormData,
        projectName,
        activeLedgerHeadId,
    ]);

    const handleWorkflowAction = useCallback(
        (action: string) => {
            const apiCall =
                action.toLowerCase() === "submit"
                    ? submitProjectRegistration({ doc_data: projectName })
                    : triggerWorkflowAction({
                        doctype: "Project Registration",
                        docname: projectName,
                        action: action,
                    });
            apiCall
                .then(() => {
                    mutate();
                    activityStreamRef.current?.refetch();
                })
                .catch((err: any) =>
                    console.error(`Error during workflow action: `, err),
                );
        },
        [triggerWorkflowAction, submitProjectRegistration, mutate, projectName],
    );

    const isDocOwner = currentUser && data?.owner === currentUser;

    // --- Proposed Budget Breakup edit state ---
    type BudgetRow = {
        account_head: string;
        first_year_budget: number;
        second_year_budget: number;
        third_year_budget: number;
        fourth_year_budget: number;
        fifth_year_budget: number;
    };
    const [isEditingBudget, setIsEditingBudget] = useState(false);
    const [editBudgetRows, setEditBudgetRows] = useState<BudgetRow[]>([]);
    const [isSavingBudget, setIsSavingBudget] = useState(false);

    const { call: updateBudgetBreakup } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_registration.project_registration.update_proposed_budget_breakup",
    );

    const startEditBudget = () => {
        setEditBudgetRows(
            (data?.proposed_budget_breakup ?? []).map((row: any) => ({
                account_head: row.account_head ?? "",
                first_year_budget: row.first_year_budget ?? 0,
                second_year_budget: row.second_year_budget ?? 0,
                third_year_budget: row.third_year_budget ?? 0,
                fourth_year_budget: row.fourth_year_budget ?? 0,
                fifth_year_budget: row.fifth_year_budget ?? 0,
            })),
        );
        setIsEditingBudget(true);
    };

    const cancelEditBudget = () => {
        setIsEditingBudget(false);
        setEditBudgetRows([]);
    };

    const saveBudgetBreakup = async () => {
        setIsSavingBudget(true);
        try {
            await updateBudgetBreakup({
                docname: projectName,
                rows: editBudgetRows.map((r) => ({
                    account_head: r.account_head,
                    first_year_budget: r.first_year_budget,
                    second_year_budget: r.second_year_budget,
                    third_year_budget: r.third_year_budget,
                    fourth_year_budget: r.fourth_year_budget,
                    fifth_year_budget: r.fifth_year_budget,
                })),
            });
            await mutate();
            setIsEditingBudget(false);
            setEditBudgetRows([]);
        } catch (err) {
            console.error("Failed to update budget breakup:", err);
        } finally {
            setIsSavingBudget(false);
        }
    };

    // --- Sanctioned Budget Breakup edit state (per sanction) ---
    type SanctionBudgetRow = {
        account_head: string;
        first_year_budget: number;
        second_year_budget: number;
        third_year_budget: number;
        fourth_year_budget: number;
        fifth_year_budget: number;
    };
    const [editingSanctionBudgetName, setEditingSanctionBudgetName] = useState<
        string | null
    >(null);
    const [editSanctionBudgetRows, setEditSanctionBudgetRows] = useState<
        SanctionBudgetRow[]
    >([]);
    const [isSavingSanctionBudget, setIsSavingSanctionBudget] = useState(false);

    const { call: updateSanctionBudget } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.update_sanctioned_budget_breakup",
    );

    const startEditSanctionBudget = (sanction: any) => {
        setEditSanctionBudgetRows(
            (sanction.sanctioned_budget_breakup ?? []).map((r: any) => ({
                account_head: r.account_head ?? "",
                first_year_budget: parseFloat(r.first_year_budget) || 0,
                second_year_budget: parseFloat(r.second_year_budget) || 0,
                third_year_budget: parseFloat(r.third_year_budget) || 0,
                fourth_year_budget: parseFloat(r.fourth_year_budget) || 0,
                fifth_year_budget: parseFloat(r.fifth_year_budget) || 0,
            })),
        );
        setEditingSanctionBudgetName(sanction.name);
    };

    const cancelEditSanctionBudget = () => {
        setEditingSanctionBudgetName(null);
        setEditSanctionBudgetRows([]);
    };

    const saveSanctionBudget = async (sanctionName: string) => {
        setIsSavingSanctionBudget(true);
        try {
            await updateSanctionBudget({
                docname: sanctionName,
                rows: editSanctionBudgetRows.map((r) => ({
                    account_head: r.account_head,
                    first_year_budget: r.first_year_budget,
                    second_year_budget: r.second_year_budget,
                    third_year_budget: r.third_year_budget,
                    fourth_year_budget: r.fourth_year_budget,
                    fifth_year_budget: r.fifth_year_budget,
                })),
            });
            await refetchSanctions();
            setEditingSanctionBudgetName(null);
            setEditSanctionBudgetRows([]);
        } catch (err) {
            console.error("Failed to update sanctioned budget breakup:", err);
        } finally {
            setIsSavingSanctionBudget(false);
        }
    };

    const [searchParams, setSearchParams] = useSearchParams();
    const isCoProjectView = searchParams.get("coProject") === "1";
    const setProjectTabParam = (tabId: string) => {
        if (embedded) return;
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("tab", tabId);
        if (isCoProjectView) nextParams.set("coProject", "1");
        setSearchParams(nextParams);
    };

    useEffect(() => {
        if (embedded) return;
        const tabParam = searchParams.get("tab");
        if (isCoProjectView && tabParam === "quick-actions") {
            setActiveTab("overview");
            return;
        }
        if (tabParam) {
            setActiveTab(tabParam);
        } else if (isCoProjectView && activeTab === "quick-actions") {
            setActiveTab("overview");
        }
    }, [activeTab, embedded, isCoProjectView, searchParams]);

    const handleAddFunds = () =>
        navigate(
            `/add-fund-received/${projectName}/?project_no=${encodeURIComponent(data?.project_no || "")}`,
        );

    const activeYearCount = useMemo(() => {
        const rows = data?.proposed_budget_breakup;
        if (!rows?.length) return 1;
        const yearKeys = [
            "first_year_budget",
            "second_year_budget",
            "third_year_budget",
            "fourth_year_budget",
            "fifth_year_budget",
        ] as const;
        for (let i = yearKeys.length - 1; i >= 0; i--) {
            const total = rows.reduce(
                (sum: number, row: any) =>
                    sum + (parseFloat(row[yearKeys[i]]) || 0),
                0,
            );
            if (total > 0) return i + 1;
        }
        return 1;
    }, [data?.proposed_budget_breakup]);

    const handleAddSanctionDetails = () => {
        navigate(`/project-details-overview/${projectName}/add-fund-sanction`, {
            state: { activeYearCount },
        });
    };

    const tabs = [
        {
            id: "overview",
            label: "Overview",
            icon: FileTextIcon,
            activeClass: "bg-[#4F46E5] border-[#4F46E5] text-white shadow-sm",
            inactiveClass: "border-[#C7D2FE] bg-[#EEF2FF]/55 text-[#1E3A8A] hover:bg-[#EEF2FF] dark:border-[#4A6CF7]/30 dark:bg-[#4A6CF7]/10 dark:text-[#C7D2FE]",
            iconClass: "text-[#4A6CF7] dark:text-[#A5B4FC]",
        },
        {
            id: "sanction-details",
            label: "Sanction Details",
            icon: CreditCardIcon,
            activeClass: "bg-[#059669] border-[#059669] text-white shadow-sm",
            inactiveClass: "border-[#A7F3D0] bg-[#ECFDF5]/60 text-[#047857] hover:bg-[#ECFDF5] dark:border-[#10B981]/30 dark:bg-[#10B981]/10 dark:text-[#A7F3D0]",
            iconClass: "text-[#059669] dark:text-[#6EE7B7]",
        },
        {
            id: "ledger",
            label: "Ledger",
            icon: LedgerIcon,
            activeClass: "bg-[#EA580C] border-[#EA580C] text-white shadow-sm",
            inactiveClass: "border-[#FED7AA] bg-[#FFF7ED]/65 text-[#C2410C] hover:bg-[#FFF7ED] dark:border-[#F97316]/30 dark:bg-[#F97316]/10 dark:text-[#FED7AA]",
            iconClass: "text-[#EA580C] dark:text-[#FDBA74]",
        },
        ...(!embedded && !isCoProjectView
            ? [{
                id: "quick-actions",
                label: "Applications",
                icon: ZapIcon,
                activeClass: "bg-[#7C3AED] border-[#7C3AED] text-white shadow-sm",
                inactiveClass: "border-[#DDD6FE] bg-[#F5F3FF]/65 text-[#6D28D9] hover:bg-[#F5F3FF] dark:border-[#8B5CF6]/30 dark:bg-[#8B5CF6]/10 dark:text-[#DDD6FE]",
                iconClass: "text-[#7C3AED] dark:text-[#C4B5FD]",
            }]
            : []),

        {
            id: "activity",
            label: "Activity Log",
            icon: MessageSquareIcon,
            activeClass: "bg-[#6B7280] border-[#6B7280] text-white shadow-sm",
            inactiveClass: "border-[#E4E4E7] bg-white text-[#52525B] hover:bg-[#F4F4F5] dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#D4D4D8]",
            iconClass: "text-[#71717A] dark:text-[#A1A1AA]",
        },
        {
            id: "help",
            label: "Operation Guideline",
            icon: BookOpenIcon,
            activeClass: "bg-[#DC2626] border-[#DC2626] text-white shadow-sm",
            inactiveClass: "border-[#FECACA] bg-[#FEF2F2]/60 text-[#B91C1C] hover:bg-[#FEF2F2] dark:border-[#EF4444]/30 dark:bg-[#EF4444]/10 dark:text-[#FCA5A5]",
            iconClass: "text-[#DC2626] dark:text-[#F87171]",
        },
    ];

    const getMimeType = (fileName = "") => {
        if (fileName.endsWith(".pdf")) return "application/pdf";
        if (fileName.endsWith(".png")) return "image/png";
        if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg"))
            return "image/jpeg";
        return "application/octet-stream";
    };

    const getStatusBadgeClass = (status: string | undefined) => {
        switch (status?.toLowerCase()) {
            case "approved":
            case "completed":
                return "bg-green-100 text-green-800 border border-green-300";
            case "submitted":
            case "in_review":
                return "bg-yellow-100 text-yellow-800 border border-yellow-300";
            case "rejected":
            case "cancelled":
                return "bg-red-100 text-red-800 border border-red-300";
            case "draft":
                return "bg-blue-100 text-blue-800 border border-blue-300";
            default:
                return "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700";
        }
    };

    // Helper function to get budget head name from ID or name
    const getBudgetHeadName = (accountHeadValue: string | number): string => {
        // If it's already a string name (not a number), return it
        if (
            typeof accountHeadValue === "string" &&
            isNaN(Number(accountHeadValue))
        ) {
            return accountHeadValue;
        }
        // Otherwise, try to find the name from budgetHeadList
        const budgetHead = budgetHeadList.find(
            (bh) =>
                bh.id === Number(accountHeadValue) ||
                bh.name === accountHeadValue,
        );
        return budgetHead?.name || String(accountHeadValue);
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-screen">
                    <p className="text-sm font-semibold">
                        Loading Project Details...
                    </p>
                </div>
            );
        }
        // Show loading instead of error for transient failures
        if (error && !data) {
            return (
                <div className="flex flex-col items-center justify-center h-screen gap-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                    <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                        Loading Project Details...
                    </p>
                    <button
                        onClick={() => mutate()}
                        className="text-sm text-teal-600 hover:underline"
                    >
                        Click to retry
                    </button>
                </div>
            );
        }

        console.log("data:", data);

        return (
            <>
                <header className="mb-4 overflow-hidden rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm">
                    <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
                    <div className="px-5 py-4">
                        <div className="flex items-start justify-between flex-col xl:flex-row gap-4">
                            <div className="flex items-start gap-3 min-w-0">
                                {!embedded && (
                                    <button
                                        onClick={() => navigate(isCoProjectView ? "/co-projects" : "/projects-view")}
                                        aria-label="Back to projects"
                                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] hover:text-[#D97757] hover:border-[#D97757]/30 hover:bg-[#D97757]/10 transition-colors"
                                    >
                                        <ArrowLeftIcon className="h-4 w-4" />
                                    </button>
                                )}
                                <div className="min-w-0">
                                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                                        <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[#D97757]">
                                            Project Overview
                                        </span>
                                        <ProjectStatusBadge status={data?.workflow_state} />
                                    </div>
                                    <h1 className="font-sans text-[18px] font-extrabold tracking-normal text-[#3F3F46] dark:text-[#E4E4E7] leading-tight">
                                        {data?.project_title || "Project Details"}
                                    </h1>
                                    <p className="mt-0.5 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                                        ID: <span className="font-mono text-[#3F3F46] dark:text-[#E4E4E7]">{data?.project_no || projectName}</span>
                                    </p>
                                </div>
                            </div>
                            {!hideActions && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {(data?.workflow_state === "Approved" || data?.workflow_state === "Proposal Approved") && (
                                        <FrappeButton
                                            onClick={() => navigate(`/project-details-overview/${projectName}/proforma-invoice`)}
                                            variant="outline"
                                            aria-label="Proforma Invoice"
                                            className="h-8 px-3 text-[12px] flex items-center gap-1.5"
                                        >
                                            <FileTextIcon className="h-3.5 w-3.5" /> Pro Inv
                                        </FrappeButton>
                                    )}
                                    <WorkflowActions
                                        docname={projectName!}
                                        onAction={handleWorkflowAction}
                                        isLoading={isActionLoading}
                                        projectNo={data?.project_no}
                                        status={data?.workflow_state}
                                        isStaffRnD={isStaffRnDOnly}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Sanction Status Below Header */}
                {(() => {
                    if (isLoading || sanctionIsLoading) return null;

                    const sanctions = normalizeResponse(sanctionData);
                    const hasSanctionRecord = sanctions.length > 0;
                    const hasSanctionApproved = sanctions.some(
                        (s: any) =>
                            (s.sanction_workflow_status || "").toLowerCase() ===
                            "sanction approved",
                    );
                    const hasFundReceived = commitableBalance > 0 || actualBalance > 0;

                    if (!hasSanctionRecord) {
                        return (
                            <div className="px-4 mb-4">
                                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 text-xs font-bold">
                                        1
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                            No Fund Sanction Added
                                        </p>
                                        <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 leading-relaxed">
                                            Add a Fund Sanction to register the grant details from the funding agency.
                                            All application modules remain locked until the sanction is approved and funds are received.
                                        </p>
                                    </div>
                                    {!hideActions && (
                                    <button
                                        onClick={handleAddSanctionDetails}
                                        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                                    >
                                        Add Sanction
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    if (hasSanctionApproved && !hasFundReceived) {
                        return (
                            <div className="px-4 mb-4 flex flex-col md:flex-row gap-2">
                                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-700 md:flex-1">
                                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-300 text-xs font-bold">
                                        <CheckCircleIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                                            Sanction Approved
                                        </p>
                                        <p className="text-xs text-cyan-700 dark:text-cyan-300 mt-0.5 leading-relaxed">
                                            Fund Sanction has been approved successfully.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 md:flex-1">
                                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                                        2
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                                            Next Step: Record Fund Received
                                        </p>
                                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5 leading-relaxed">
                                            Record funds received to unlock all application modules.
                                        </p>
                                    </div>
                                    {!hideActions && (
                                    <button
                                        onClick={handleAddFunds}
                                        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                                    >
                                        Add Fund Received
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    if (hasSanctionApproved && hasFundReceived) {
                        return (
                            <div className="px-4 mb-4">
                                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700">
                                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-800 text-violet-700 dark:text-violet-300 text-xs font-bold">
                                        <CheckCircleIcon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">
                                            Funds Received
                                        </p>
                                        <p className="text-xs text-violet-700 dark:text-violet-300 mt-0.5 leading-relaxed">
                                            Fund has been recorded. You can add further funds or proceed with project operations.
                                        </p>
                                    </div>
                                    {!hideActions && (
                                    <button
                                        onClick={handleAddFunds}
                                        className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-semibold hover:bg-violet-700 transition-colors"
                                    >
                                        Add More Funds
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                    )}
                                </div>
                            </div>
                        );
                    }

                    return null;
                })()}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 border-t-2 border-[#4A6CF7]/35 pt-4 dark:border-[#818CF8]/35">
                    {/* Main Content Column */}
                    <div
                        className={cn(
                            "bg-white dark:bg-[#27272A] rounded-xl border border-[#D4D4D8] dark:border-[#52525B] shadow-sm overflow-hidden",
                            activeTab === "ledger" ? "lg:col-span-4" : "lg:col-span-3",
                        )}
                    >
                        <div className="border-b border-[#D4D4D8] dark:border-[#52525B] bg-[#FAFAF9] dark:bg-[#27272A]">
                            <nav className="flex items-center gap-1 p-2 overflow-x-auto" aria-label="Page tabs">
                                {tabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setActiveTab(tab.id);
                                            setProjectTabParam(tab.id);
                                        }}
                                        aria-selected={activeTab === tab.id}
                                        className={cn(
                                            "flex-shrink-0 flex h-8 items-center gap-1.5 px-2.5 font-bold text-[11px] uppercase tracking-wide rounded-lg border transition-all",
                                            activeTab === tab.id ? tab.activeClass : tab.inactiveClass,
                                        )}
                                    >
                                        <tab.icon className={cn("h-3.5 w-3.5", activeTab === tab.id ? "text-white" : tab.iconClass)} />{" "}
                                        {tab.label}
                                        {tab.id === "sanction-details" &&
                                            (() => {
                                                const draftSanctions =
                                                    normalizeResponse(
                                                        sanctionData,
                                                    ).filter(
                                                        (s: any) =>
                                                            (
                                                                s.sanction_workflow_status ||
                                                                ""
                                                            ).toLowerCase() ===
                                                            "draft",
                                                    ).length;
                                                const funds =
                                                    normalizeResponse(
                                                        fundReceivedData,
                                                    );
                                                const draftFunds = funds.filter(
                                                    (f: any) =>
                                                        (
                                                            f.workflow_state ||
                                                            ""
                                                        ).toLowerCase() ===
                                                        "draft",
                                                ).length;
                                                const totalDrafts =
                                                    draftSanctions + draftFunds;

                                                return totalDrafts > 0 ? (
                                                    <span className="ml-1.5 inline-flex items-center justify-center bg-red-100 text-red-600 text-[10px] font-bold h-4 w-4 rounded-full">
                                                        {totalDrafts}
                                                    </span>
                                                ) : null;
                                            })()}
                                    </button>
                                ))}
                            </nav>
                        </div>
                        <div className="bg-[#F4F4F5] dark:bg-[#18181B] p-4 md:p-5">
                            {/* Next-step guidance banners */}
                            {(() => {
                                // Don't render banners while data is still loading
                                if (isLoading || sanctionIsLoading) return null;

                                const projectApproved =
                                    (data?.workflow_state || "").toLowerCase() === "endorsement approved";
                                const sanctions = normalizeResponse(sanctionData);
                                const hasSanctionRecord = sanctions.length > 0;
                                const hasSanctionApproved = sanctions.some(
                                    (s: any) =>
                                        (s.sanction_workflow_status || "").toLowerCase() ===
                                        "sanction approved",
                                );
                                // Check if funds have been received by looking at balance
                                const hasFundReceived = commitableBalance > 0 || actualBalance > 0;

                                if (projectApproved && !hasSanctionRecord) {
                                    return (
                                        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
                                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 text-xs font-bold">
                                                1
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                                                    Next Step: Add a Fund Sanction
                                                </p>
                                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5 leading-relaxed">
                                                    Your project has been approved. Add a Fund Sanction to
                                                    register the grant details from the funding agency. All
                                                    application modules will remain locked until the sanction
                                                    is approved and funds are received.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setActiveTab("sanction-details");
                                                    setProjectTabParam("sanction-details");
                                                }}
                                                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors"
                                            >
                                                Go to Sanction
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                }

                                if (projectApproved && hasSanctionRecord && !hasSanctionApproved) {
                                    return (
                                        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700">
                                            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-300 text-xs font-bold">
                                                1
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                                                    Fund Sanction Pending Approval
                                                </p>
                                                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                                                    Your Fund Sanction is under review. Once approved, you can proceed to record funds received.
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setActiveTab("sanction-details");
                                                    setProjectTabParam("sanction-details");
                                                }}
                                                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors"
                                            >
                                                View Sanction
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                }

                                if (hasSanctionApproved && !hasFundReceived) {
                                    return null;
                                }

                                if (hasSanctionApproved && hasFundReceived) {
                                    return null;
                                }

                                return null;
                            })()}
                            {activeTab === "overview" && (
                                <div className="space-y-5">
                                    {/* ... existing overview content ... */}
                                    <SectionWrapper
                                        title="General Information"
                                        icon={FileTextIcon}
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                                            <FieldDisplay
                                                label="Project Type"
                                                value={data?.project_type}
                                                icon={FileTextIcon}
                                            />
                                            <FieldDisplay
                                                label="Project No"
                                                value={data?.project_no}
                                                icon={FileTextIcon}
                                            />
                                            <FieldDisplay
                                                label="Implementation Dept"
                                                value={
                                                    data?.implementation_department ? (
                                                        <DepartmentName
                                                            name={
                                                                data?.implementation_department
                                                            }
                                                        />
                                                    ) : null
                                                }
                                                icon={BuildingIcon}
                                            />
                                            <FieldDisplay
                                                label="Status"
                                                value={
                                                    data?.sanction_workflow_status
                                                }
                                                icon={TargetIcon}
                                            />
                                            <FieldDisplay
                                                label="Project Duration"
                                                value={`${data?.project_duration_months}m ${data?.project_duration_days || 0}d`}
                                                icon={CalendarIcon}
                                            />
                                            <FieldDisplay
                                                label="Start Date"
                                                value={data?.prj_start_date}
                                                icon={CalendarIcon}
                                            />
                                            <FieldDisplay
                                                label="End Date"
                                                value={data?.prj_end_date}
                                                icon={CalendarIcon}
                                            />
                                            <FieldDisplay
                                                label="International Travel"
                                                value={
                                                    data?.involves_international_travel
                                                }
                                                icon={PlaneIcon}
                                            />
                                            {data?.upload_proj_prop && (
                                                <div className="py-2">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                        <FileTextIcon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                                                        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                                                            Project Proposal
                                                        </p>
                                                    </div>
                                                    <a
                                                        href={`http://172.16.135.118:9000/prod-rnd-files/Project_Registration/${projectName}/attachments/${data.upload_proj_prop.split("/").pop()}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-sm font-medium text-[#D97757] hover:underline flex items-center gap-1"
                                                    >
                                                        <ExternalLinkIcon className="h-3 w-3" />{" "}
                                                        {data.upload_proj_prop
                                                            .split("/")
                                                            .pop()}
                                                    </a>
                                                </div>
                                            )}
                                            {data?.upload_supporting_docs
                                                ?.length > 0 && (
                                                    <div className="py-2 col-span-full">
                                                        <div className="flex items-center gap-1.5 mb-2">
                                                            <FileTextIcon className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                                                            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                                                                Upload Supporting
                                                                Docs ( Project
                                                                Proposal /
                                                                Invitation Letter)
                                                            </p>
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-sm border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden">
                                                                <thead className="bg-zinc-100 dark:bg-zinc-800">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300 w-8">
                                                                            No.
                                                                        </th>
                                                                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                                                            File
                                                                        </th>
                                                                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                                                            Description
                                                                        </th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {data.upload_supporting_docs.map(
                                                                        (
                                                                            row: any,
                                                                            idx: number,
                                                                        ) => {
                                                                            const filePath =
                                                                                row.project_file ||
                                                                                "";
                                                                            const fileName =
                                                                                filePath
                                                                                    .split(
                                                                                        "/",
                                                                                    )
                                                                                    .pop() ||
                                                                                filePath;
                                                                            const fileUrl =
                                                                                filePath
                                                                                    ? `http://172.16.135.118:9000/prod-rnd-files/Project_Registration/${projectName}/attachments/${filePath.split("/").pop()}`
                                                                                    : null;
                                                                            return (
                                                                                <tr
                                                                                    key={
                                                                                        idx
                                                                                    }
                                                                                    className="border-t border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                                                                                >
                                                                                    <td className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
                                                                                        {idx +
                                                                                            1}
                                                                                    </td>
                                                                                    <td className="px-3 py-2">
                                                                                        {fileUrl ? (
                                                                                            <a
                                                                                                href={
                                                                                                    fileUrl
                                                                                                }
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="text-[#D97757] hover:underline flex items-center gap-1 truncate max-w-xs"
                                                                                            >
                                                                                                <ExternalLinkIcon className="h-3 w-3 flex-shrink-0" />
                                                                                                <span className="truncate">
                                                                                                    {
                                                                                                        fileName
                                                                                                    }
                                                                                                </span>
                                                                                            </a>
                                                                                        ) : (
                                                                                            <span className="text-zinc-400">
                                                                                                —
                                                                                            </span>
                                                                                        )}
                                                                                    </td>
                                                                                    <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                                                                                        {row.file_description ||
                                                                                            "—"}
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        },
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                )}
                                        </div>
                                    </SectionWrapper>

                                    {/* Consultancy Details */}
                                    {data?.project_type === "Consultancy" && (
                                        <SectionWrapper
                                            title="Consultancy Details"
                                            icon={FileTextIcon}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                                                <FieldDisplay
                                                    label="Consultancy Category"
                                                    value={
                                                        data?.consultancy_category
                                                    }
                                                    icon={FileTextIcon}
                                                />
                                                <FieldDisplay
                                                    label="GSTIN"
                                                    value={
                                                        data?.consultancy_gstin
                                                    }
                                                    icon={FileTextIcon}
                                                />
                                                <FieldDisplay
                                                    label="GST Rate"
                                                    value={
                                                        data?.consultancy_gst_rate
                                                    }
                                                    icon={IndianRupeeIcon}
                                                />

                                                {data?.consultancy_category?.startsWith(
                                                    "Category D",
                                                ) && (
                                                        <>
                                                            <FieldDisplay
                                                                label="Category D Note"
                                                                value={
                                                                    data?.category_d_note
                                                                }
                                                                icon={FileTextIcon}
                                                            />
                                                            <FieldDisplay
                                                                label="Total Cost (Excl. GST)"
                                                                value={
                                                                    data?.cat_d_project_cost_excl_gst
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                            <FieldDisplay
                                                                label="Consultancy Fee"
                                                                value={
                                                                    data?.cat_d_consultancy_fee_input
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                            <FieldDisplay
                                                                label="Operational Expense (+OH)"
                                                                value={
                                                                    data?.operational_expense_input_inc_10_oh
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                            <FieldDisplay
                                                                label="Institute Share"
                                                                value={
                                                                    data?.cat_d_institute_share
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                            <FieldDisplay
                                                                label="Total Overhead"
                                                                value={
                                                                    data?.cat_d_total_overhead
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                            <FieldDisplay
                                                                label="GST Amount"
                                                                value={
                                                                    data?.cat_d_gst_amt
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                            <FieldDisplay
                                                                label="Grand Total"
                                                                value={
                                                                    data?.cat_d_grand_total_calc
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                        </>
                                                    )}

                                                {!data?.consultancy_category?.startsWith(
                                                    "Category D",
                                                ) &&
                                                    data?.consultancy_category && (
                                                        <>
                                                            <FieldDisplay
                                                                label="Category Note"
                                                                value={
                                                                    data?.category_e_note ||
                                                                    data?.category_t_note
                                                                }
                                                                icon={
                                                                    FileTextIcon
                                                                }
                                                            />
                                                            <FieldDisplay
                                                                label="Total Amount"
                                                                value={
                                                                    data?.cat_ef_total_amount
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                            <FieldDisplay
                                                                label="Honorarium"
                                                                value={
                                                                    data?.cat_ef_honorarium
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                            <FieldDisplay
                                                                label="Institute Share"
                                                                value={
                                                                    data?.cat_ef_institute_share
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                            <FieldDisplay
                                                                label="GST"
                                                                value={
                                                                    data?.cat_ef_gst
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                            <FieldDisplay
                                                                label="Grand Total"
                                                                value={
                                                                    data?.cat_ef_grand_total
                                                                }
                                                                icon={
                                                                    IndianRupeeIcon
                                                                }
                                                            />
                                                        </>
                                                    )}
                                            </div>
                                        </SectionWrapper>
                                    )}

                                    {/* Other Project Type */}
                                    {data?.project_type === "Other" && (
                                        <SectionWrapper
                                            title="Other Project Details"
                                            icon={FileTextIcon}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                                                <FieldDisplay
                                                    label="Other Project Type"
                                                    value={
                                                        data?.other_project_type_name
                                                    }
                                                    icon={FileTextIcon}
                                                />
                                            </div>
                                        </SectionWrapper>
                                    )}

                                    <SectionWrapper
                                        title="Funding Agency"
                                        icon={BuildingIcon}
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                                            <FieldDisplay
                                                label="Agency Name"
                                                value={
                                                    fundingAgencyData?.funding_agency_name
                                                }
                                                icon={BuildingIcon}
                                            />
                                            <FieldDisplay
                                                label="Agency ID"
                                                value={
                                                    fundingAgencyData?.funding_agency_id
                                                }
                                                icon={BuildingIcon}
                                            />
                                            <FieldDisplay
                                                label="Initials"
                                                value={
                                                    fundingAgencyData?.funding_agency_initials
                                                }
                                                icon={FileTextIcon}
                                            />
                                            <FieldDisplay
                                                label="Agency Type"
                                                value={
                                                    fundingAgencyData?.funding_agency_type_1 ??
                                                    data?.funding_agency_type
                                                }
                                                icon={UsersIcon}
                                            />
                                            <FieldDisplay
                                                label="Origin"
                                                value={
                                                    fundingAgencyData?.origin_of_funding_agency ??
                                                    data?.origin_of_funding_agency
                                                }
                                                icon={GlobeIcon}
                                            />
                                            <FieldDisplay
                                                label="GSTIN"
                                                value={
                                                    fundingAgencyData?.gstin_of_funding_agency
                                                }
                                                icon={CreditCardIcon}
                                            />
                                            <FieldDisplay
                                                label="Ministry"
                                                value={
                                                    fundingAgencyData?.ministry_funding_agency ??
                                                    data?.funding_agency_ministry
                                                }
                                                icon={BuildingIcon}
                                            />
                                            <FieldDisplay
                                                label="Scheme"
                                                value={
                                                    data?.funding_agency_schemes
                                                }
                                                icon={FileTextIcon}
                                            />
                                            <FieldDisplay
                                                label="Address"
                                                value={[
                                                    fundingAgencyData?.fundingagency_address ??
                                                    data?.address_street_village_locality,
                                                    fundingAgencyData?.fundingagency_state ??
                                                    data?.address_state,
                                                    fundingAgencyData?.fundingagency_country ??
                                                    data?.address_country,
                                                    fundingAgencyData?.fundingagency_postalcode ??
                                                    data?.address_postal_code,
                                                ]
                                                    .filter(Boolean)
                                                    .join(", ")}
                                                icon={MapPinIcon}
                                            />
                                        </div>
                                    </SectionWrapper>

                                    {/* Account Details */}
                                    {data?.is_the_account_type_pfms && (
                                        <SectionWrapper
                                            title="Account Details"
                                            icon={CreditCardIcon}
                                        >
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
                                                <FieldDisplay
                                                    label="Account Type"
                                                    value={data.is_the_account_type_pfms === "Yes" ? "PFMS" : "Bank Account"}
                                                    icon={CreditCardIcon}
                                                />
                                                {data.is_the_account_type_pfms === "Yes" && (
                                                    <>
                                                        <FieldDisplay
                                                            label="Scheme Name"
                                                            value={data.scheme_name}
                                                            icon={FileTextIcon}
                                                        />
                                                        <FieldDisplay
                                                            label="Scheme Number"
                                                            value={data.enter_scheme_number}
                                                            icon={FileTextIcon}
                                                        />
                                                    </>
                                                )}
                                                {data.is_the_account_type_pfms === "No" && (
                                                    <>
                                                        <FieldDisplay
                                                            label="Account Number"
                                                            value={data.account_number}
                                                            icon={CreditCardIcon}
                                                        />
                                                        <FieldDisplay
                                                            label="Bank Name"
                                                            value={data.bank_name}
                                                            icon={BuildingIcon}
                                                        />
                                                    </>
                                                )}
                                            </div>
                                        </SectionWrapper>
                                    )}

                                    <SectionWrapper
                                        title="Investigators"
                                        icon={UsersIcon}
                                    >
                                        <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 uppercase">
                                            Principal Investigator (PI)
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                                            <FieldDisplay
                                                label="Name"
                                                value={
                                                    data?.principal_investigator_name
                                                }
                                                icon={UserIcon}
                                            />
                                            <FieldDisplay
                                                label="Email"
                                                value={data?.pi_webmail}
                                                icon={MailIcon}
                                            />
                                            <FieldDisplay
                                                label="Employee ID"
                                                value={data?.pi_employee_id}
                                                icon={UserIcon}
                                            />
                                            <FieldDisplay
                                                label="Designation"
                                                value={data?.designation}
                                                icon={UsersIcon}
                                            />
                                            <FieldDisplay
                                                label="Department"
                                                value={
                                                    data?.applicant_department ? (
                                                        <DepartmentName
                                                            name={
                                                                data?.applicant_department
                                                            }
                                                        />
                                                    ) : null
                                                }
                                                icon={BuildingIcon}
                                            />
                                        </div>
                                    </SectionWrapper>
                                    {data?.is_additional_pi === "Yes" && (
                                        <TableDisplay
                                            label="Additional PIs"
                                            data={data?.additional_pi_table}
                                            columns={[
                                                {
                                                    fieldname: "pi_name",
                                                    label: "Name",
                                                },
                                                {
                                                    fieldname: "pi_designation",
                                                    label: "Designation",
                                                },
                                                {
                                                    fieldname: "pi_department",
                                                    label: "Department",
                                                    render: (v) => (
                                                        <DepartmentName
                                                            name={v}
                                                        />
                                                    ),
                                                },
                                                {
                                                    fieldname: "pi_email",
                                                    label: "Email",
                                                },
                                                {
                                                    fieldname: "pi_address",
                                                    label: "Address",
                                                },
                                                {
                                                    fieldname: "pi_contact",
                                                    label: "Contact",
                                                },
                                            ]}
                                            icon={UsersIcon}
                                        />
                                    )}
                                    {data?.has_co_pi === "Yes" && (
                                        <TableDisplay
                                            label="Co-Investigators"
                                            data={data?.co_investigator_table}
                                            columns={[
                                                {
                                                    fieldname: "copi_name",
                                                    label: "Name",
                                                },
                                                {
                                                    fieldname:
                                                        "copi_designation",
                                                    label: "Designation",
                                                },
                                                {
                                                    fieldname:
                                                        "copi_department",
                                                    label: "Department",
                                                    render: (v) => (
                                                        <DepartmentName
                                                            name={v}
                                                        />
                                                    ),
                                                },
                                                {
                                                    fieldname: "copi_email",
                                                    label: "Email",
                                                },
                                                {
                                                    fieldname: "copi_address",
                                                    label: "Address",
                                                },
                                                {
                                                    fieldname: "copi_contact",
                                                    label: "Contact",
                                                },
                                            ]}
                                            icon={UsersIcon}
                                        />
                                    )}

                                    {/* Enhanced Proposed Budget Breakup with Grand Total */}
                                    {data?.proposed_budget_breakup &&
                                        data.proposed_budget_breakup.length >
                                        0 && (
                                            <SectionWrapper
                                                title="Proposed Budget Breakup"
                                                icon={IndianRupeeIcon}
                                                action={
                                                    (isDocOwner || isRnDStaff) &&
                                                        !isEditingBudget ? (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-6 px-2 text-xs gap-1"
                                                            onClick={
                                                                startEditBudget
                                                            }
                                                        >
                                                            <Pencil className="h-3 w-3" />
                                                            Edit
                                                        </Button>
                                                    ) : isEditingBudget ? (
                                                        <div className="flex items-center gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-6 px-2 text-xs gap-1"
                                                                onClick={
                                                                    cancelEditBudget
                                                                }
                                                                disabled={
                                                                    isSavingBudget
                                                                }
                                                            >
                                                                <X className="h-3 w-3" />
                                                                Cancel
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                className="h-6 px-2 text-xs gap-1 bg-[#D97757] hover:bg-[#c4673e] text-white"
                                                                onClick={
                                                                    saveBudgetBreakup
                                                                }
                                                                disabled={
                                                                    isSavingBudget
                                                                }
                                                            >
                                                                <Save className="h-3 w-3" />
                                                                {isSavingBudget
                                                                    ? "Saving…"
                                                                    : "Save"}
                                                            </Button>
                                                        </div>
                                                    ) : null
                                                }
                                            >
                                                {isEditingBudget ? (
                                                    /* ---- Edit Mode ---- */
                                                    <div className="space-y-3">
                                                        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                                            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                                                                <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                                                    <tr>
                                                                        <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                                                            Budget
                                                                            Head
                                                                        </th>
                                                                        {(
                                                                            [
                                                                                "Year 1",
                                                                                "Year 2",
                                                                                "Year 3",
                                                                                "Year 4",
                                                                                "Year 5",
                                                                            ] as const
                                                                        ).map(
                                                                            (
                                                                                y,
                                                                            ) => (
                                                                                <th
                                                                                    key={
                                                                                        y
                                                                                    }
                                                                                    className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider"
                                                                                >
                                                                                    {
                                                                                        y
                                                                                    }
                                                                                </th>
                                                                            ),
                                                                        )}
                                                                        <th className="px-3 py-2" />
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                                                                    {editBudgetRows.map(
                                                                        (
                                                                            row,
                                                                            idx,
                                                                        ) => (
                                                                            <tr
                                                                                key={
                                                                                    idx
                                                                                }
                                                                            >
                                                                                <td className="px-2 py-1.5">
                                                                                    <select
                                                                                        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1 text-xs"
                                                                                        value={
                                                                                            row.account_head
                                                                                        }
                                                                                        onChange={(
                                                                                            e,
                                                                                        ) => {
                                                                                            const updated =
                                                                                                [
                                                                                                    ...editBudgetRows,
                                                                                                ];
                                                                                            updated[
                                                                                                idx
                                                                                            ] =
                                                                                            {
                                                                                                ...updated[
                                                                                                idx
                                                                                                ],
                                                                                                account_head:
                                                                                                    e
                                                                                                        .target
                                                                                                        .value,
                                                                                            };
                                                                                            setEditBudgetRows(
                                                                                                updated,
                                                                                            );
                                                                                        }}
                                                                                    >
                                                                                        <option value="">
                                                                                            —
                                                                                            Select
                                                                                            —
                                                                                        </option>
                                                                                        {budgetHeadList.map(
                                                                                            (
                                                                                                bh,
                                                                                            ) => (
                                                                                                <option
                                                                                                    key={
                                                                                                        bh.name
                                                                                                    }
                                                                                                    value={
                                                                                                        bh.name
                                                                                                    }
                                                                                                >
                                                                                                    {
                                                                                                        bh.name
                                                                                                    }
                                                                                                </option>
                                                                                            ),
                                                                                        )}
                                                                                    </select>
                                                                                </td>
                                                                                {(
                                                                                    [
                                                                                        "first_year_budget",
                                                                                        "second_year_budget",
                                                                                        "third_year_budget",
                                                                                        "fourth_year_budget",
                                                                                        "fifth_year_budget",
                                                                                    ] as const
                                                                                ).map(
                                                                                    (
                                                                                        field,
                                                                                    ) => (
                                                                                        <td
                                                                                            key={
                                                                                                field
                                                                                            }
                                                                                            className="px-2 py-1.5"
                                                                                        >
                                                                                            <input
                                                                                                type="text"
                                                                                                inputMode="numeric"
                                                                                                className="w-24 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1 text-xs text-right"
                                                                                                value={
                                                                                                    row[
                                                                                                    field
                                                                                                    ] ||
                                                                                                    ""
                                                                                                }
                                                                                                onChange={(
                                                                                                    e,
                                                                                                ) => {
                                                                                                    const updated =
                                                                                                        [
                                                                                                            ...editBudgetRows,
                                                                                                        ];
                                                                                                    updated[
                                                                                                        idx
                                                                                                    ] =
                                                                                                    {
                                                                                                        ...updated[
                                                                                                        idx
                                                                                                        ],
                                                                                                        [field]:
                                                                                                            Number(
                                                                                                                e
                                                                                                                    .target
                                                                                                                    .value,
                                                                                                            ),
                                                                                                    };
                                                                                                    setEditBudgetRows(
                                                                                                        updated,
                                                                                                    );
                                                                                                }}
                                                                                            />
                                                                                        </td>
                                                                                    ),
                                                                                )}
                                                                                <td className="px-2 py-1.5">
                                                                                    <button
                                                                                        type="button"
                                                                                        className="text-zinc-400 hover:text-red-500"
                                                                                        onClick={() =>
                                                                                            setEditBudgetRows(
                                                                                                editBudgetRows.filter(
                                                                                                    (
                                                                                                        _,
                                                                                                        i,
                                                                                                    ) =>
                                                                                                        i !==
                                                                                                        idx,
                                                                                                ),
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        ),
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-6 px-2 text-xs gap-1"
                                                            onClick={() =>
                                                                setEditBudgetRows(
                                                                    [
                                                                        ...editBudgetRows,
                                                                        {
                                                                            account_head:
                                                                                "",
                                                                            first_year_budget: 0,
                                                                            second_year_budget: 0,
                                                                            third_year_budget: 0,
                                                                            fourth_year_budget: 0,
                                                                            fifth_year_budget: 0,
                                                                        },
                                                                    ],
                                                                )
                                                            }
                                                        >
                                                            <Plus className="h-3 w-3" />
                                                            Add Row
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    /* ---- View Mode ---- */
                                                    (() => {
                                                        const totals = {
                                                            year1: data.proposed_budget_breakup.reduce(
                                                                (
                                                                    sum: number,
                                                                    row: any,
                                                                ) =>
                                                                    sum +
                                                                    (row.first_year_budget ||
                                                                        0),
                                                                0,
                                                            ),
                                                            year2: data.proposed_budget_breakup.reduce(
                                                                (
                                                                    sum: number,
                                                                    row: any,
                                                                ) =>
                                                                    sum +
                                                                    (row.second_year_budget ||
                                                                        0),
                                                                0,
                                                            ),
                                                            year3: data.proposed_budget_breakup.reduce(
                                                                (
                                                                    sum: number,
                                                                    row: any,
                                                                ) =>
                                                                    sum +
                                                                    (row.third_year_budget ||
                                                                        0),
                                                                0,
                                                            ),
                                                            year4: data.proposed_budget_breakup.reduce(
                                                                (
                                                                    sum: number,
                                                                    row: any,
                                                                ) =>
                                                                    sum +
                                                                    (row.fourth_year_budget ||
                                                                        0),
                                                                0,
                                                            ),
                                                            year5: data.proposed_budget_breakup.reduce(
                                                                (
                                                                    sum: number,
                                                                    row: any,
                                                                ) =>
                                                                    sum +
                                                                    (row.fifth_year_budget ||
                                                                        0),
                                                                0,
                                                            ),
                                                        };

                                                        return (
                                                            <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                                                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                                                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                                                        <tr>
                                                                            <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                                                                Budget
                                                                                Head
                                                                            </th>
                                                                            {totals.year1 >
                                                                                0 && (
                                                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                                                                        Year
                                                                                        1
                                                                                    </th>
                                                                                )}
                                                                            {totals.year2 >
                                                                                0 && (
                                                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                                                                        Year
                                                                                        2
                                                                                    </th>
                                                                                )}
                                                                            {totals.year3 >
                                                                                0 && (
                                                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                                                                        Year
                                                                                        3
                                                                                    </th>
                                                                                )}
                                                                            {totals.year4 >
                                                                                0 && (
                                                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                                                                        Year
                                                                                        4
                                                                                    </th>
                                                                                )}
                                                                            {totals.year5 >
                                                                                0 && (
                                                                                    <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                                                                        Year
                                                                                        5
                                                                                    </th>
                                                                                )}
                                                                            <th className="px-4 py-3 text-right text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                                                                                Total
                                                                            </th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                                                                        {data.proposed_budget_breakup.map(
                                                                            (
                                                                                row: any,
                                                                                index: number,
                                                                            ) => (
                                                                                <tr
                                                                                    key={
                                                                                        index
                                                                                    }
                                                                                    className="hover:bg-zinc-50 dark:bg-zinc-800/50"
                                                                                >
                                                                                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                                                                        {getBudgetHeadName(
                                                                                            row.account_head,
                                                                                        )}
                                                                                    </td>
                                                                                    {totals.year1 >
                                                                                        0 && (
                                                                                            <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 text-right whitespace-nowrap">
                                                                                                {(
                                                                                                    row.first_year_budget ||
                                                                                                    0
                                                                                                ).toLocaleString(
                                                                                                    "en-IN",
                                                                                                )}
                                                                                            </td>
                                                                                        )}
                                                                                    {totals.year2 >
                                                                                        0 && (
                                                                                            <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 text-right whitespace-nowrap">
                                                                                                {(
                                                                                                    row.second_year_budget ||
                                                                                                    0
                                                                                                ).toLocaleString(
                                                                                                    "en-IN",
                                                                                                )}
                                                                                            </td>
                                                                                        )}
                                                                                    {totals.year3 >
                                                                                        0 && (
                                                                                            <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 text-right whitespace-nowrap">
                                                                                                {(
                                                                                                    row.third_year_budget ||
                                                                                                    0
                                                                                                ).toLocaleString(
                                                                                                    "en-IN",
                                                                                                )}
                                                                                            </td>
                                                                                        )}
                                                                                    {totals.year4 >
                                                                                        0 && (
                                                                                            <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 text-right whitespace-nowrap">
                                                                                                {(
                                                                                                    row.fourth_year_budget ||
                                                                                                    0
                                                                                                ).toLocaleString(
                                                                                                    "en-IN",
                                                                                                )}
                                                                                            </td>
                                                                                        )}
                                                                                    {totals.year5 >
                                                                                        0 && (
                                                                                            <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300 text-right whitespace-nowrap">
                                                                                                {(
                                                                                                    row.fifth_year_budget ||
                                                                                                    0
                                                                                                ).toLocaleString(
                                                                                                    "en-IN",
                                                                                                )}
                                                                                            </td>
                                                                                        )}
                                                                                    <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">
                                                                                        {(
                                                                                            (row.first_year_budget ||
                                                                                                0) +
                                                                                            (row.second_year_budget ||
                                                                                                0) +
                                                                                            (row.third_year_budget ||
                                                                                                0) +
                                                                                            (row.fourth_year_budget ||
                                                                                                0) +
                                                                                            (row.fifth_year_budget ||
                                                                                                0)
                                                                                        ).toLocaleString(
                                                                                            "en-IN",
                                                                                        )}
                                                                                    </td>
                                                                                </tr>
                                                                            ),
                                                                        )}
                                                                    </tbody>
                                                                    <tfoot className="bg-zinc-100 dark:bg-zinc-800">
                                                                        <tr>
                                                                            <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                                                                GRAND
                                                                                TOTAL
                                                                            </td>
                                                                            {totals.year1 >
                                                                                0 && (
                                                                                    <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">
                                                                                        {totals.year1.toLocaleString(
                                                                                            "en-IN",
                                                                                        )}
                                                                                    </td>
                                                                                )}
                                                                            {totals.year2 >
                                                                                0 && (
                                                                                    <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">
                                                                                        {totals.year2.toLocaleString(
                                                                                            "en-IN",
                                                                                        )}
                                                                                    </td>
                                                                                )}
                                                                            {totals.year3 >
                                                                                0 && (
                                                                                    <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">
                                                                                        {totals.year3.toLocaleString(
                                                                                            "en-IN",
                                                                                        )}
                                                                                    </td>
                                                                                )}
                                                                            {totals.year4 >
                                                                                0 && (
                                                                                    <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">
                                                                                        {totals.year4.toLocaleString(
                                                                                            "en-IN",
                                                                                        )}
                                                                                    </td>
                                                                                )}
                                                                            {totals.year5 >
                                                                                0 && (
                                                                                    <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">
                                                                                        {totals.year5.toLocaleString(
                                                                                            "en-IN",
                                                                                        )}
                                                                                    </td>
                                                                                )}
                                                                            <td className="px-4 py-3 text-sm font-bold text-[#D97757] text-right whitespace-nowrap">
                                                                                ₹{" "}
                                                                                {(
                                                                                    data.total_budget_amount ||
                                                                                    data.proposed_budget_breakup.reduce(
                                                                                        (
                                                                                            sum: number,
                                                                                            row: any,
                                                                                        ) =>
                                                                                            sum +
                                                                                            (row.first_year_budget ||
                                                                                                0) +
                                                                                            (row.second_year_budget ||
                                                                                                0) +
                                                                                            (row.third_year_budget ||
                                                                                                0) +
                                                                                            (row.fourth_year_budget ||
                                                                                                0) +
                                                                                            (row.fifth_year_budget ||
                                                                                                0),
                                                                                        0,
                                                                                    )
                                                                                ).toLocaleString(
                                                                                    "en-IN",
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    </tfoot>
                                                                </table>
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                                {/* Display total_budget_amount from project data */}
                                                <div className="mt-4 p-4 bg-zinc-50 dark:bg-zinc-800 dark:bg-[#D97757]/20 rounded-lg flex justify-between items-center">
                                                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase">
                                                        Total Budget Amount
                                                        (from proposal)
                                                    </span>
                                                    <span className="text-xl font-bold text-[#D97757]">
                                                        ₹{" "}
                                                        {isEditingBudget
                                                            ? editBudgetRows
                                                                .reduce(
                                                                    (
                                                                        sum,
                                                                        r,
                                                                    ) =>
                                                                        sum +
                                                                        (r.first_year_budget ||
                                                                            0) +
                                                                        (r.second_year_budget ||
                                                                            0) +
                                                                        (r.third_year_budget ||
                                                                            0) +
                                                                        (r.fourth_year_budget ||
                                                                            0) +
                                                                        (r.fifth_year_budget ||
                                                                            0),
                                                                    0,
                                                                )
                                                                .toLocaleString(
                                                                    "en-IN",
                                                                )
                                                            : (
                                                                data.total_budget_amount ||
                                                                0
                                                            ).toLocaleString(
                                                                "en-IN",
                                                            )}
                                                    </span>
                                                </div>
                                            </SectionWrapper>
                                        )}
                                    {data?.equipment_checkbox === 1 && (
                                        <TableDisplay
                                            label="Proposed Equipment"
                                            data={
                                                data?.proposed_equipment_details
                                            }
                                            columns={[
                                                {
                                                    fieldname: "item_name",
                                                    label: "Equipment Name",
                                                },
                                                {
                                                    fieldname:
                                                        "equip_total_unit_cost",
                                                    label: "Cost",
                                                },
                                            ]}
                                            icon={ShoppingCartIcon}
                                        />
                                    )}
                                    {data?.manpower_checkbox === 1 && (
                                        <TableDisplay
                                            label="Proposed Manpower"
                                            data={
                                                data?.proposed_manpower_details
                                            }
                                            columns={[
                                                {
                                                    fieldname:
                                                        "designation_name",
                                                    label: "Position",
                                                },
                                                {
                                                    fieldname:
                                                        "manpower_salary",
                                                    label: "Salary",
                                                },
                                            ]}
                                            icon={UsersGroupIcon}
                                        />
                                    )}

                                    <HtmlContent
                                        title="Executive Summary"
                                        htmlString={data?.executive_summary}
                                        icon={FileTextIcon}
                                    />
                                    <HtmlContent
                                        title="Project Objective"
                                        htmlString={data?.project_objective}
                                        icon={TargetIcon}
                                    />
                                    <HtmlContent
                                        title="Project Deliverables"
                                        htmlString={data?.project_deliverables}
                                        icon={CheckCircleIcon}
                                    />

                                    <SectionWrapper
                                        title="Clearance Details"
                                        icon={ShieldIcon}
                                    >
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                                            <FieldDisplay
                                                label="Needs Committee Clearance"
                                                value={
                                                    data?.needs_committee_clearance
                                                }
                                                icon={ShieldIcon}
                                            />
                                            <FieldDisplay
                                                label="Committee"
                                                value={data?.committees}
                                                icon={UsersIcon}
                                            />
                                            <FieldDisplay
                                                label="Ethics Committee Details"
                                                value={
                                                    data?.ethics_committee_details
                                                }
                                                icon={FileTextIcon}
                                            />
                                            <FieldDisplay
                                                label="Biosafety Category"
                                                value={data?.biosafety_category}
                                                icon={ShieldIcon}
                                            />
                                            <FieldDisplay
                                                label="Needs Endorsement"
                                                value={
                                                    data?.need_endorsement_copy
                                                }
                                                icon={CheckCircleIcon}
                                            />
                                        </div>
                                    </SectionWrapper>
                                </div>
                            )}

                            {activeTab === "sanction-details" &&
                                (() => {
                                    const sanctions =
                                        normalizeResponse(sanctionData);
                                    return (
                                        <div className="space-y-5">
                                            {/* ... existing sanction details content ... */}
                                            {sanctionIsLoading && (
                                                <p>
                                                    Loading Sanction Details...
                                                </p>
                                            )}
                                            {sanctionError && (
                                                <p className="text-red-600">
                                                    Error:{" "}
                                                    {sanctionError.message}
                                                </p>
                                            )}

                                            {sanctions.length > 0 ? (
                                                <>
                                                    {/* Sanction Selector - only show if more than 1 sanction */}
                                                    {sanctions.length > 1 && (
                                                        <div className="flex items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                                                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                                                                Select Sanction:
                                                            </label>
                                                            <select
                                                                value={
                                                                    selectedSanctionIndex
                                                                }
                                                                onChange={(e) =>
                                                                    setSelectedSanctionIndex(
                                                                        Number(
                                                                            e
                                                                                .target
                                                                                .value,
                                                                        ),
                                                                    )
                                                                }
                                                                className="flex-1 max-w-md px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                                            >
                                                                {sanctions.map(
                                                                    (
                                                                        sanction: any,
                                                                        index: number,
                                                                    ) => (
                                                                        <option
                                                                            key={
                                                                                sanction.name
                                                                            }
                                                                            value={
                                                                                index
                                                                            }
                                                                        >
                                                                            {
                                                                                sanction.name
                                                                            }{" "}
                                                                            -{" "}
                                                                            {sanction.sanctioned_letter_no ||
                                                                                "No Letter No"}{" "}
                                                                            (
                                                                            {(
                                                                                sanction.total_sanctioned_amount ||
                                                                                0
                                                                            ).toLocaleString(
                                                                                "en-IN",
                                                                                {
                                                                                    style: "currency",
                                                                                    currency:
                                                                                        "INR",
                                                                                },
                                                                            )}
                                                                            )
                                                                        </option>
                                                                    ),
                                                                )}
                                                            </select>
                                                        </div>
                                                    )}

                                                    {/* Selected Sanction Details */}
                                                    {(() => {
                                                        const sanction =
                                                            sanctions[
                                                            selectedSanctionIndex
                                                            ];
                                                        if (!sanction)
                                                            return null;

                                                        const budgetColumnsAll =
                                                            [
                                                                {
                                                                    fieldname:
                                                                        "account_head",
                                                                    label: "Account Head",
                                                                },
                                                                {
                                                                    fieldname:
                                                                        "first_year_budget",
                                                                    label: "Year 1",
                                                                },
                                                                {
                                                                    fieldname:
                                                                        "second_year_budget",
                                                                    label: "Year 2",
                                                                },
                                                                {
                                                                    fieldname:
                                                                        "third_year_budget",
                                                                    label: "Year 3",
                                                                },
                                                                {
                                                                    fieldname:
                                                                        "fourth_year_budget",
                                                                    label: "Year 4",
                                                                },
                                                                {
                                                                    fieldname:
                                                                        "fifth_year_budget",
                                                                    label: "Year 5",
                                                                },
                                                            ];
                                                        // Filter to only show years that have data
                                                        const budgetColumns =
                                                            budgetColumnsAll.filter(
                                                                (c) => {
                                                                    if (
                                                                        c.fieldname ===
                                                                        "account_head"
                                                                    )
                                                                        return true;
                                                                    return (
                                                                        sanction.sanctioned_budget_breakup ||
                                                                        []
                                                                    ).some(
                                                                        (
                                                                            row: any,
                                                                        ) =>
                                                                            (parseFloat(
                                                                                row[
                                                                                c
                                                                                    .fieldname
                                                                                ],
                                                                            ) ||
                                                                                0) >
                                                                            0,
                                                                    );
                                                                },
                                                            );
                                                        const budgetYearFieldnames =
                                                            budgetColumns
                                                                .filter(
                                                                    (c) =>
                                                                        c.fieldname !==
                                                                        "account_head",
                                                                )
                                                                .map(
                                                                    (c) =>
                                                                        c.fieldname,
                                                                );
                                                        const columnTotals: {
                                                            [
                                                            key: string
                                                            ]: number;
                                                        } =
                                                            budgetYearFieldnames.reduce(
                                                                (
                                                                    totals: {
                                                                        [
                                                                        key: string
                                                                        ]: number;
                                                                    },
                                                                    fieldname,
                                                                ) => {
                                                                    totals[
                                                                        fieldname
                                                                    ] = (
                                                                        sanction.sanctioned_budget_breakup ||
                                                                        []
                                                                    ).reduce(
                                                                        (
                                                                            sum: number,
                                                                            row: any,
                                                                        ) => {
                                                                            return (
                                                                                sum +
                                                                                (parseFloat(
                                                                                    row[
                                                                                    fieldname
                                                                                    ],
                                                                                ) ||
                                                                                    0)
                                                                            );
                                                                        },
                                                                        0,
                                                                    );
                                                                    return totals;
                                                                },
                                                                {},
                                                            );
                                                        const grandTotal =
                                                            Object.values(
                                                                columnTotals,
                                                            ).reduce(
                                                                (
                                                                    sum: number,
                                                                    total: any,
                                                                ) =>
                                                                    sum + total,
                                                                0,
                                                            );
                                                        const isDraft =
                                                            sanction.sanction_workflow_status?.toLowerCase() ===
                                                            "draft";

                                                        return (
                                                            <FrappeCard className="space-y-5">
                                                                <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
                                                                    <div className="flex items-start justify-between gap-4 mb-3">
                                                                        <div className="flex-1">
                                                                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                                                                Sanction:{" "}
                                                                                {
                                                                                    sanction.name
                                                                                }
                                                                            </h3>
                                                                            <div className="text-sm text-[#6B7280] dark:text-zinc-400 mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                                                                                <span className="inline-flex items-center gap-1.5">
                                                                                    Status:{" "}
                                                                                    <span
                                                                                        className={cn(
                                                                                            "font-medium px-2.5 py-0.5 rounded-full text-xs",
                                                                                            getStatusBadgeClass(
                                                                                                sanction.sanction_workflow_status,
                                                                                            ),
                                                                                        )}
                                                                                    >
                                                                                        {sanction.sanction_workflow_status ||
                                                                                            "DRAFT"}
                                                                                    </span>
                                                                                </span>
                                                                                <span>
                                                                                    Letter
                                                                                    No:{" "}
                                                                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                                                                        {
                                                                                            sanction.sanctioned_letter_no
                                                                                        }
                                                                                    </span>
                                                                                </span>
                                                                                <span>
                                                                                    Date:{" "}
                                                                                    <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                                                                        {
                                                                                            sanction.sanctioned_letter_date
                                                                                        }
                                                                                    </span>
                                                                                </span>
                                                                                <span>
                                                                                    Amount:{" "}
                                                                                    <span className="font-semibold text-[#D97757]">
                                                                                        {(
                                                                                            sanction.total_sanctioned_amount ||
                                                                                            0
                                                                                        ).toLocaleString(
                                                                                            "en-IN",
                                                                                            {
                                                                                                style: "currency",
                                                                                                currency:
                                                                                                    "INR",
                                                                                            },
                                                                                        )}
                                                                                    </span>
                                                                                </span>
                                                                            </div>
                                                                        </div>

                                                                        {isDraft && (
                                                                            <div className="flex-shrink-0">
                                                                                <FrappeButton
                                                                                    onClick={() =>
                                                                                        handleSanctionSubmitClick(
                                                                                            sanction.name,
                                                                                        )
                                                                                    }
                                                                                    disabled={
                                                                                        isSubmittingSanction
                                                                                    }
                                                                                    aria-label="Submit sanction"
                                                                                >
                                                                                    <CheckCircleIcon className="h-4 w-4" />
                                                                                    {isSubmittingSanction
                                                                                        ? "Submitting..."
                                                                                        : "Submit"}
                                                                                </FrappeButton>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {isDraft && (
                                                                        <div className="flex items-start gap-3 p-4 border border-yellow-400 rounded-lg bg-[#FFFDF5] dark:bg-yellow-900/20 shadow-sm">
                                                                            <AlertCircleIcon className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5 drop-shadow-sm" />
                                                                            <div className="space-y-1">
                                                                                <p className="font-semibold text-yellow-800 tracking-wide text-base">
                                                                                    Draft
                                                                                    Document
                                                                                </p>
                                                                                <p className="text-sm text-yellow-700 leading-relaxed">
                                                                                    This
                                                                                    sanction
                                                                                    is
                                                                                    currently
                                                                                    in{" "}
                                                                                    <span className="font-medium">
                                                                                        draft
                                                                                        status
                                                                                    </span>

                                                                                    .
                                                                                    Please
                                                                                    review
                                                                                    and
                                                                                    submit
                                                                                    when
                                                                                    you
                                                                                    are
                                                                                    ready.
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {/* Sanctioned Budget Breakup */}
                                                                {(() => {
                                                                    const isEditingSB =
                                                                        editingSanctionBudgetName ===
                                                                        sanction.name;
                                                                    const isSanctionOwner =
                                                                        currentUser &&
                                                                        sanction.owner ===
                                                                        currentUser;
                                                                    const yearFields =
                                                                        [
                                                                            {
                                                                                key: "first_year_budget" as const,
                                                                                label: "Year 1",
                                                                            },
                                                                            {
                                                                                key: "second_year_budget" as const,
                                                                                label: "Year 2",
                                                                            },
                                                                            {
                                                                                key: "third_year_budget" as const,
                                                                                label: "Year 3",
                                                                            },
                                                                            {
                                                                                key: "fourth_year_budget" as const,
                                                                                label: "Year 4",
                                                                            },
                                                                            {
                                                                                key: "fifth_year_budget" as const,
                                                                                label: "Year 5",
                                                                            },
                                                                        ];
                                                                    const editLiveTotal =
                                                                        editSanctionBudgetRows.reduce(
                                                                            (
                                                                                s,
                                                                                r,
                                                                            ) =>
                                                                                s +
                                                                                r.first_year_budget +
                                                                                r.second_year_budget +
                                                                                r.third_year_budget +
                                                                                r.fourth_year_budget +
                                                                                r.fifth_year_budget,
                                                                            0,
                                                                        );

                                                                    return (
                                                                        <div>
                                                                            <div className="flex items-center justify-between mb-3">
                                                                                <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                                                                    Budget
                                                                                    Breakup
                                                                                </h4>
                                                                                {isSanctionOwner &&
                                                                                    !isEditingSB && (
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            className="h-6 px-2 text-xs gap-1"
                                                                                            onClick={() =>
                                                                                                startEditSanctionBudget(
                                                                                                    sanction,
                                                                                                )
                                                                                            }
                                                                                        >
                                                                                            <Pencil className="h-3 w-3" />
                                                                                            Edit
                                                                                        </Button>
                                                                                    )}
                                                                                {isEditingSB && (
                                                                                    <div className="flex items-center gap-1">
                                                                                        <Button
                                                                                            size="sm"
                                                                                            variant="outline"
                                                                                            className="h-6 px-2 text-xs gap-1"
                                                                                            onClick={
                                                                                                cancelEditSanctionBudget
                                                                                            }
                                                                                            disabled={
                                                                                                isSavingSanctionBudget
                                                                                            }
                                                                                        >
                                                                                            <X className="h-3 w-3" />
                                                                                            Cancel
                                                                                        </Button>
                                                                                        <Button
                                                                                            size="sm"
                                                                                            className="h-6 px-2 text-xs gap-1 bg-[#D97757] hover:bg-[#c4673e] text-white"
                                                                                            onClick={() =>
                                                                                                saveSanctionBudget(
                                                                                                    sanction.name,
                                                                                                )
                                                                                            }
                                                                                            disabled={
                                                                                                isSavingSanctionBudget
                                                                                            }
                                                                                        >
                                                                                            <Save className="h-3 w-3" />
                                                                                            {isSavingSanctionBudget
                                                                                                ? "Saving…"
                                                                                                : "Save"}
                                                                                        </Button>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {isEditingSB ? (
                                                                                <div className="space-y-3">
                                                                                    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                                                                        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
                                                                                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                                                                                <tr>
                                                                                                    <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                                                                                        Budget
                                                                                                        Head
                                                                                                    </th>
                                                                                                    {yearFields.map(
                                                                                                        (
                                                                                                            y,
                                                                                                        ) => (
                                                                                                            <th
                                                                                                                key={
                                                                                                                    y.key
                                                                                                                }
                                                                                                                className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider"
                                                                                                            >
                                                                                                                {
                                                                                                                    y.label
                                                                                                                }
                                                                                                            </th>
                                                                                                        ),
                                                                                                    )}
                                                                                                    <th className="px-3 py-2 text-right font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
                                                                                                        Total
                                                                                                    </th>
                                                                                                    <th className="px-3 py-2" />
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                                                                                                {editSanctionBudgetRows.map(
                                                                                                    (
                                                                                                        row,
                                                                                                        idx,
                                                                                                    ) => {
                                                                                                        const rowTotal =
                                                                                                            row.first_year_budget +
                                                                                                            row.second_year_budget +
                                                                                                            row.third_year_budget +
                                                                                                            row.fourth_year_budget +
                                                                                                            row.fifth_year_budget;
                                                                                                        return (
                                                                                                            <tr
                                                                                                                key={
                                                                                                                    idx
                                                                                                                }
                                                                                                            >
                                                                                                                <td className="px-2 py-1.5">
                                                                                                                    <select
                                                                                                                        className="w-full rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1 text-xs"
                                                                                                                        value={
                                                                                                                            row.account_head
                                                                                                                        }
                                                                                                                        onChange={(
                                                                                                                            e,
                                                                                                                        ) => {
                                                                                                                            const updated =
                                                                                                                                [
                                                                                                                                    ...editSanctionBudgetRows,
                                                                                                                                ];
                                                                                                                            updated[
                                                                                                                                idx
                                                                                                                            ] =
                                                                                                                            {
                                                                                                                                ...updated[
                                                                                                                                idx
                                                                                                                                ],
                                                                                                                                account_head:
                                                                                                                                    e
                                                                                                                                        .target
                                                                                                                                        .value,
                                                                                                                            };
                                                                                                                            setEditSanctionBudgetRows(
                                                                                                                                updated,
                                                                                                                            );
                                                                                                                        }}
                                                                                                                    >
                                                                                                                        <option value="">
                                                                                                                            —
                                                                                                                            Select
                                                                                                                            —
                                                                                                                        </option>
                                                                                                                        {budgetHeadList.map(
                                                                                                                            (
                                                                                                                                bh,
                                                                                                                            ) => (
                                                                                                                                <option
                                                                                                                                    key={
                                                                                                                                        bh.name
                                                                                                                                    }
                                                                                                                                    value={
                                                                                                                                        bh.name
                                                                                                                                    }
                                                                                                                                >
                                                                                                                                    {
                                                                                                                                        bh.name
                                                                                                                                    }
                                                                                                                                </option>
                                                                                                                            ),
                                                                                                                        )}
                                                                                                                    </select>
                                                                                                                </td>
                                                                                                                {yearFields.map(
                                                                                                                    (
                                                                                                                        y,
                                                                                                                    ) => (
                                                                                                                        <td
                                                                                                                            key={
                                                                                                                                y.key
                                                                                                                            }
                                                                                                                            className="px-2 py-1.5"
                                                                                                                        >
                                                                                                                            <input
                                                                                                                                type="text"
                                                                                                                                inputMode="numeric"
                                                                                                                                className="w-24 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-2 py-1 text-xs text-right"
                                                                                                                                value={
                                                                                                                                    row[
                                                                                                                                    y
                                                                                                                                        .key
                                                                                                                                    ] ||
                                                                                                                                    ""
                                                                                                                                }
                                                                                                                                onChange={(
                                                                                                                                    e,
                                                                                                                                ) => {
                                                                                                                                    const updated =
                                                                                                                                        [
                                                                                                                                            ...editSanctionBudgetRows,
                                                                                                                                        ];
                                                                                                                                    updated[
                                                                                                                                        idx
                                                                                                                                    ] =
                                                                                                                                    {
                                                                                                                                        ...updated[
                                                                                                                                        idx
                                                                                                                                        ],
                                                                                                                                        [y.key]:
                                                                                                                                            Number(
                                                                                                                                                e
                                                                                                                                                    .target
                                                                                                                                                    .value,
                                                                                                                                            ),
                                                                                                                                    };
                                                                                                                                    setEditSanctionBudgetRows(
                                                                                                                                        updated,
                                                                                                                                    );
                                                                                                                                }}
                                                                                                                            />
                                                                                                                        </td>
                                                                                                                    ),
                                                                                                                )}
                                                                                                                <td className="px-2 py-1.5 text-right text-xs font-semibold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                                                                                                                    {rowTotal.toLocaleString(
                                                                                                                        "en-IN",
                                                                                                                    )}
                                                                                                                </td>
                                                                                                                <td className="px-2 py-1.5">
                                                                                                                    <button
                                                                                                                        type="button"
                                                                                                                        className="text-zinc-400 hover:text-red-500"
                                                                                                                        onClick={() =>
                                                                                                                            setEditSanctionBudgetRows(
                                                                                                                                editSanctionBudgetRows.filter(
                                                                                                                                    (
                                                                                                                                        _,
                                                                                                                                        i,
                                                                                                                                    ) =>
                                                                                                                                        i !==
                                                                                                                                        idx,
                                                                                                                                ),
                                                                                                                            )
                                                                                                                        }
                                                                                                                    >
                                                                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                                                                    </button>
                                                                                                                </td>
                                                                                                            </tr>
                                                                                                        );
                                                                                                    },
                                                                                                )}
                                                                                            </tbody>
                                                                                            <tfoot className="bg-zinc-100 dark:bg-zinc-800">
                                                                                                <tr>
                                                                                                    <td className="px-3 py-2 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                                                                                        Total
                                                                                                    </td>
                                                                                                    {yearFields.map(
                                                                                                        (
                                                                                                            y,
                                                                                                        ) => (
                                                                                                            <td
                                                                                                                key={
                                                                                                                    y.key
                                                                                                                }
                                                                                                                className="px-3 py-2 text-xs font-bold text-zinc-900 dark:text-zinc-100 text-right"
                                                                                                            >
                                                                                                                {editSanctionBudgetRows
                                                                                                                    .reduce(
                                                                                                                        (
                                                                                                                            s,
                                                                                                                            r,
                                                                                                                        ) =>
                                                                                                                            s +
                                                                                                                            (r[
                                                                                                                                y
                                                                                                                                    .key
                                                                                                                            ] ||
                                                                                                                                0),
                                                                                                                        0,
                                                                                                                    )
                                                                                                                    .toLocaleString(
                                                                                                                        "en-IN",
                                                                                                                    )}
                                                                                                            </td>
                                                                                                        ),
                                                                                                    )}
                                                                                                    <td className="px-3 py-2 text-xs font-bold text-[#D97757] text-right">
                                                                                                        ₹{" "}
                                                                                                        {editLiveTotal.toLocaleString(
                                                                                                            "en-IN",
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td />
                                                                                                </tr>
                                                                                            </tfoot>
                                                                                        </table>
                                                                                    </div>
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="outline"
                                                                                        className="h-6 px-2 text-xs gap-1"
                                                                                        onClick={() =>
                                                                                            setEditSanctionBudgetRows(
                                                                                                [
                                                                                                    ...editSanctionBudgetRows,
                                                                                                    {
                                                                                                        account_head:
                                                                                                            "",
                                                                                                        first_year_budget: 0,
                                                                                                        second_year_budget: 0,
                                                                                                        third_year_budget: 0,
                                                                                                        fourth_year_budget: 0,
                                                                                                        fifth_year_budget: 0,
                                                                                                    },
                                                                                                ],
                                                                                            )
                                                                                        }
                                                                                    >
                                                                                        <Plus className="h-3 w-3" />
                                                                                        Add
                                                                                        Row
                                                                                    </Button>
                                                                                </div>
                                                                            ) : (
                                                                                sanction
                                                                                    .sanctioned_budget_breakup
                                                                                    ?.length >
                                                                                0 && (
                                                                                    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                                                                                        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                                                                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                                                                                <tr>
                                                                                                    {budgetColumns.map(
                                                                                                        (
                                                                                                            c,
                                                                                                        ) => (
                                                                                                            <th
                                                                                                                key={
                                                                                                                    c.fieldname
                                                                                                                }
                                                                                                                className={`px-4 py-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider ${c.fieldname === "account_head" ? "text-left" : "text-right"}`}
                                                                                                            >
                                                                                                                {
                                                                                                                    c.label
                                                                                                                }
                                                                                                            </th>
                                                                                                        ),
                                                                                                    )}
                                                                                                    <th className="px-4 py-3 text-right text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                                                                                                        Total
                                                                                                    </th>
                                                                                                </tr>
                                                                                            </thead>
                                                                                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-zinc-200 dark:divide-zinc-800">
                                                                                                {(
                                                                                                    sanction.sanctioned_budget_breakup ||
                                                                                                    []
                                                                                                ).map(
                                                                                                    (
                                                                                                        row: any,
                                                                                                        i: number,
                                                                                                    ) => {
                                                                                                        const rowTotal =
                                                                                                            budgetYearFieldnames.reduce(
                                                                                                                (
                                                                                                                    sum,
                                                                                                                    fieldname,
                                                                                                                ) =>
                                                                                                                    sum +
                                                                                                                    (parseFloat(
                                                                                                                        row[
                                                                                                                        fieldname
                                                                                                                        ],
                                                                                                                    ) ||
                                                                                                                        0),
                                                                                                                0,
                                                                                                            );
                                                                                                        return (
                                                                                                            <tr
                                                                                                                key={
                                                                                                                    i
                                                                                                                }
                                                                                                                className="hover:bg-zinc-50 dark:bg-zinc-800/50"
                                                                                                            >
                                                                                                                {budgetColumns.map(
                                                                                                                    (
                                                                                                                        c,
                                                                                                                    ) => (
                                                                                                                        <td
                                                                                                                            key={
                                                                                                                                c.fieldname
                                                                                                                            }
                                                                                                                            className={`px-4 py-3 text-sm whitespace-nowrap ${c.fieldname === "account_head" ? "text-zinc-900 dark:text-zinc-100 text-left" : "text-zinc-700 dark:text-zinc-300 text-right"}`}
                                                                                                                        >
                                                                                                                            {c.fieldname ===
                                                                                                                                "account_head"
                                                                                                                                ? row[
                                                                                                                                c
                                                                                                                                    .fieldname
                                                                                                                                ]
                                                                                                                                : (
                                                                                                                                    parseFloat(
                                                                                                                                        row[
                                                                                                                                        c
                                                                                                                                            .fieldname
                                                                                                                                        ],
                                                                                                                                    ) ||
                                                                                                                                    0
                                                                                                                                ).toLocaleString(
                                                                                                                                    "en-IN",
                                                                                                                                )}
                                                                                                                        </td>
                                                                                                                    ),
                                                                                                                )}
                                                                                                                <td className="px-4 py-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap">
                                                                                                                    {rowTotal.toLocaleString(
                                                                                                                        "en-IN",
                                                                                                                    )}
                                                                                                                </td>
                                                                                                            </tr>
                                                                                                        );
                                                                                                    },
                                                                                                )}
                                                                                            </tbody>
                                                                                            <tfoot className="bg-zinc-100 dark:bg-zinc-800">
                                                                                                <tr>
                                                                                                    <td className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                                                                                                        Total
                                                                                                    </td>
                                                                                                    {budgetYearFieldnames.map(
                                                                                                        (
                                                                                                            fieldname,
                                                                                                        ) => (
                                                                                                            <td
                                                                                                                key={
                                                                                                                    fieldname
                                                                                                                }
                                                                                                                className="px-4 py-3 text-sm font-bold text-zinc-900 dark:text-zinc-100 text-right whitespace-nowrap"
                                                                                                            >
                                                                                                                {columnTotals[
                                                                                                                    fieldname
                                                                                                                ].toLocaleString(
                                                                                                                    "en-IN",
                                                                                                                )}
                                                                                                            </td>
                                                                                                        ),
                                                                                                    )}
                                                                                                    <td className="px-4 py-3 text-sm font-bold text-[#D97757] text-right whitespace-nowrap">
                                                                                                        {grandTotal.toLocaleString(
                                                                                                            "en-IN",
                                                                                                        )}
                                                                                                    </td>
                                                                                                </tr>
                                                                                            </tfoot>
                                                                                        </table>
                                                                                    </div>
                                                                                )
                                                                            )}
                                                                        </div>
                                                                    );
                                                                })()}

                                                                {sanction
                                                                    .sanction_related_files
                                                                    ?.length >
                                                                    0 && (
                                                                        <div>
                                                                            <h4 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
                                                                                Attached
                                                                                Files
                                                                            </h4>
                                                                            <div className="space-y-2">
                                                                                {sanction.sanction_related_files.map(
                                                                                    (
                                                                                        file: any,
                                                                                        i: number,
                                                                                    ) => (
                                                                                        <div
                                                                                            key={
                                                                                                i
                                                                                            }
                                                                                            className="flex items-center justify-between gap-4 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                                                                                        >
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <p className="font-medium text-zinc-800 dark:text-zinc-200 text-sm truncate">
                                                                                                    {file.file_name ||
                                                                                                        file.sanction_file
                                                                                                            ?.split(
                                                                                                                "/",
                                                                                                            )
                                                                                                            .pop() ||
                                                                                                        "File"}
                                                                                                </p>
                                                                                                <p className="text-xs text-[#6B7280] dark:text-zinc-400">
                                                                                                    {
                                                                                                        file.description
                                                                                                    }
                                                                                                </p>
                                                                                            </div>
                                                                                            {file.sanction_file ? (
                                                                                                <a
                                                                                                    href={getFileUrl(
                                                                                                        file.sanction_file,
                                                                                                    )}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="frappe-btn frappe-btn-primary text-sm"
                                                                                                    aria-label={`View ${file.sanction_file?.split("/").pop()}`}
                                                                                                >
                                                                                                    <DownloadIcon className="h-4 w-4" />{" "}
                                                                                                    View
                                                                                                </a>
                                                                                            ) : file.file_data ? (
                                                                                                <a
                                                                                                    href={`data:${getMimeType(file.file_name)};base64,${file.file_data}`}
                                                                                                    download={
                                                                                                        file.file_name
                                                                                                    }
                                                                                                    className="frappe-btn frappe-btn-primary text-sm"
                                                                                                    aria-label={`Download ${file.file_name}`}
                                                                                                >
                                                                                                    <DownloadIcon className="h-4 w-4" />{" "}
                                                                                                    Download
                                                                                                </a>
                                                                                            ) : (
                                                                                                <span className="text-xs text-red-500">
                                                                                                    Could
                                                                                                    not
                                                                                                    load
                                                                                                </span>
                                                                                            )}
                                                                                        </div>
                                                                                    ),
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                            </FrappeCard>
                                                        );
                                                    })()}

                                                    {/* Consolidated Fund History Section - Show funds for selected sanction */}
                                                    <div className="mt-8">
                                                        <FundDetails
                                                            project_title={
                                                                projectName ||
                                                                ""
                                                            }
                                                            sanction_ref_no={
                                                                sanctions[
                                                                    selectedSanctionIndex
                                                                ]?.name
                                                            }
                                                        />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="flex flex-col items-center gap-5 py-14 px-6 rounded-xl border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20">
                                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-800">
                                                        <CreditCardIcon className="h-7 w-7 text-blue-600 dark:text-blue-300" />
                                                    </div>
                                                    <div className="text-center space-y-1.5 max-w-sm">
                                                        <p className="font-semibold text-blue-800 dark:text-blue-200">
                                                            No Fund Sanction Added Yet
                                                        </p>
                                                        <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                                                            Your project is approved. Add a Fund Sanction to register
                                                            the grant details from the funding agency. All application
                                                            modules remain locked until the sanction is approved and
                                                            funds are received.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={handleAddSanctionDetails}
                                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                                                    >
                                                        <PlusIcon className="w-4 h-4" />
                                                        Add Fund Sanction
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                            {/* Disbursal Tab Removed */}

                            {/* --- LEDGER TAB CONTENT --- */}
                            {activeTab === "ledger" && (
                                <div className="space-y-6">
                                    {/* Ledger Head Tabs */}
                                    {/* Ledger Head Tabs and Actions */}
                                    <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm p-3 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 min-w-0">
                                        <div className="flex flex-wrap gap-2 min-w-0">
                                            {isCheckingHeads ? (
                                                <div className="px-3 py-2 text-[13px] text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#D97757]"></div>
                                                    Checking account heads...
                                                </div>
                                            ) : ledgerHeads.length > 0 ? (
                                                ledgerHeads.map(
                                                    (head: {
                                                        name: string;
                                                        id: string | number;
                                                    }) => (
                                                        <button
                                                            key={head.id}
                                                            onClick={() =>
                                                                setActiveLedgerHeadId(
                                                                    head.id,
                                                                )
                                                            }
                                                            className={cn(
                                                                "px-3 py-2 rounded-xl text-[12px] font-bold transition-colors",
                                                                activeLedgerHeadId ===
                                                                    head.id
                                                                    ? "bg-blue-50 dark:bg-blue-950/20 text-[#2563EB] dark:text-blue-400"
                                                                    : "bg-[#FAFAF9] dark:bg-[#18181B] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#3F3F46] dark:hover:text-[#E4E4E7]",
                                                            )}
                                                        >
                                                            {head.name}
                                                        </button>
                                                    ),
                                                )
                                            ) : (
                                                <div className="px-3 py-2 text-[13px] text-[#71717A] dark:text-[#A1A1AA]">
                                                    No account heads with
                                                    transactions found
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() =>
                                                    setLedgerSortOrder(
                                                        (prev) =>
                                                            prev === "newest"
                                                                ? "oldest"
                                                                : "newest",
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 px-3 h-9 text-[12px] font-bold rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] text-[#71717A] dark:text-[#A1A1AA] hover:text-[#2563EB] transition-colors"
                                            >
                                                <ArrowUpDown className="w-3.5 h-3.5" />
                                                {ledgerSortOrder === "newest"
                                                    ? "Newest"
                                                    : "Oldest"}
                                            </button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-9 w-9 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                                                onClick={() =>
                                                    navigate(
                                                        `/project-ledger-full/${data?.project_no || projectName}`,
                                                    )
                                                }
                                                title="Open Full Ledger"
                                            >
                                                <ExternalLinkIcon className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Ledger Table */}
                                    <div className="bg-white dark:bg-[#27272A] rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] shadow-sm overflow-hidden min-h-[300px] min-w-0">
                                        {isLedgerLoading ? (
                                            <div className="flex flex-col items-center justify-center py-20">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D97757] mb-4"></div>
                                                <p className="text-zinc-500 dark:text-zinc-400">
                                                    Loading ledger...
                                                </p>
                                            </div>
                                        ) : ledgerError ? (
                                            <div className="flex flex-col items-center justify-center py-20">
                                                <p className="text-red-500 font-medium mb-2">
                                                    Failed to load data
                                                </p>
                                                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                                    {ledgerError}
                                                </p>
                                                <button
                                                    onClick={() =>
                                                        fetchLedgerData(
                                                            activeLedgerHeadId,
                                                        )
                                                    }
                                                    className="mt-4 text-[#D97757] hover:underline text-sm font-medium"
                                                >
                                                    Try Again
                                                </button>
                                            </div>
                                        ) : ledgerTransactions.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-20">
                                                <FileTextIcon className="h-10 w-10 text-zinc-300 dark:text-zinc-600 mb-3" />
                                                <p className="text-zinc-500 dark:text-zinc-400">
                                                    No transactions found
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="max-h-[70vh] overflow-y-auto p-1 min-w-0">
                                                <div className="hidden xl:grid grid-cols-[repeat(11,minmax(0,1fr))] rounded-t-lg bg-[#EEF2FF] dark:bg-blue-950/20 border border-[#C7D2FE] dark:border-blue-900/40 text-[10px] font-extrabold uppercase tracking-widest text-[#1E3A8A] dark:text-blue-200 overflow-hidden">
                                                    <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40">Date / TID</div>
                                                    <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40">Particulars</div>
                                                    <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40">Module</div>
                                                    <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40">App ID</div>
                                                    <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40">BMR</div>
                                                    <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40 text-right">Received</div>
                                                    <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40 text-right">Commit</div>
                                                    <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40 text-right">Commit Bal</div>
                                                    <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40 text-right">Paid</div>
                                                    <div className="px-1.5 py-1.5 border-r border-[#C7D2FE] dark:border-blue-900/40 text-right">Pay Bal</div>
                                                    <div className="px-1.5 py-1.5 text-center">Status</div>
                                                </div>
                                                {sortedTransactions.map((txn, idx) => (
                                                    <div
                                                        key={`${txn.transactionId}-${idx}`}
                                                        className="grid grid-cols-2 xl:grid-cols-[repeat(11,minmax(0,1fr))] items-center border-x border-b border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] hover:bg-[#FAFAF9] dark:hover:bg-[#18181B] min-w-0"
                                                    >
                                                        <div className="min-w-0 px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46]">
                                                            <div className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">{txn.transactionDate ? new Date(txn.transactionDate).toLocaleDateString("en-IN") : "-"}</div>
                                                            <div className="text-[10px] font-semibold text-[#A1A1AA] break-words leading-tight">TID {txn.transactionId || "-"}</div>
                                                        </div>
                                                        <div className="col-span-2 xl:col-span-1 min-w-0 px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46]">
                                                            <div className="text-[11px] font-bold text-[#3F3F46] dark:text-[#E4E4E7] break-words leading-tight">{txn.particulars || "-"}</div>
                                                            {txn.refDetails && <div className="text-[10px] font-medium text-[#71717A] dark:text-[#A1A1AA] break-words leading-tight">{txn.refDetails}</div>}
                                                        </div>
                                                        <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] break-words">{txn.moduleCode || "-"}</div>
                                                        <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] break-words">{txn.frapAppId || "-"}</div>
                                                        <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA] break-words">{txn.bmr || "-"}</div>
                                                        <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] xl:text-right font-extrabold text-emerald-700 break-words">{txn.fundReceivedAmount ? `₹${txn.fundReceivedAmount.toLocaleString("en-IN")}` : "-"}</div>
                                                        <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] xl:text-right font-extrabold text-orange-700 break-words">{txn.commitAmount ? `₹${txn.commitAmount.toLocaleString("en-IN")}` : "-"}</div>
                                                        <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] xl:text-right font-extrabold text-[#3F3F46] dark:text-[#E4E4E7] break-words">{txn.commitableBalance ? `₹${txn.commitableBalance.toLocaleString("en-IN")}` : "-"}</div>
                                                        <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] xl:text-right font-extrabold text-red-700 break-words">{txn.paymentAmount ? `₹${txn.paymentAmount.toLocaleString("en-IN")}` : "-"}</div>
                                                        <div className="px-1.5 py-1.5 xl:border-r border-[#E4E4E7] dark:border-[#3F3F46] text-[11px] xl:text-right font-extrabold text-[#2563EB] dark:text-blue-400 break-words">{txn.paymentBalance ? `₹${txn.paymentBalance.toLocaleString("en-IN")}` : "0"}</div>
                                                        <div className="px-1.5 py-1.5 xl:text-center">
                                                            <span className={cn(
                                                                "inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold",
                                                                txn.status === "PAID"
                                                                    ? "bg-emerald-50 text-emerald-700"
                                                                    : txn.status === "PARTIALLY_PAID"
                                                                        ? "bg-amber-50 text-amber-700"
                                                                        : txn.status === "PENDING"
                                                                            ? "bg-orange-50 text-orange-700"
                                                                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300",
                                                            )}>
                                                                {txn.status || "Completed"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {activeTab === "quick-actions" && (
                                <QuickActions
                                    projectName={projectName || ""}
                                    projectNo={data?.project_no}
                                    projectTitle={data?.title}
                                    onNavigate={navigate}
                                    embedded={embedded}
                                    hasSanction={normalizeResponse(sanctionData).some(
                                        (s) => (s.sanction_workflow_status || "").toLowerCase() === "sanction approved"
                                    )}
                                    hasFunds={commitableBalance > 0 || actualBalance > 0}
                                />
                            )}

                            {activeTab === "activity" && (
                                <ActivityStream
                                    ref={activityStreamRef}
                                    doctype="Project Registration"
                                    docname={projectName!}
                                />
                            )}

                            {activeTab === "help" && (() => {
                                const sanctions = normalizeResponse(sanctionData);
                                const hasSanctionRecord = sanctions.length > 0;
                                const hasSanctionApproved = sanctions.some(
                                    (s: any) => (s.sanction_workflow_status || "").toLowerCase() === "sanction approved"
                                );
                                const hasFundReceived = commitableBalance > 0 || actualBalance > 0;
                                const projectApproved = (data?.workflow_state || "").toLowerCase().includes("approved");
                                const currentStep = !projectApproved ? 0 : !hasSanctionRecord ? 1 : !hasSanctionApproved ? 2 : !hasFundReceived ? 3 : 4;

                                const steps = [
                                    {
                                        num: 1, title: "Project Proposal Approved", subtitle: "Reviewed and approved by R&D office",
                                        icon: CheckCircleIcon, color: "emerald",
                                        done: projectApproved, active: !projectApproved,
                                        description: "Your project registration has been reviewed and approved by the Head of Section and Dean R&D. This is the starting point for all financial operations.",
                                        action: null as (() => void) | null, actionLabel: null as string | null,
                                    },
                                    {
                                        num: 2, title: "Add Fund Sanction", subtitle: "Register grant details from funding agency",
                                        icon: CreditCardIcon, color: "blue",
                                        done: hasSanctionRecord, active: projectApproved && !hasSanctionRecord,
                                        description: "Add the fund sanction letter details from your funding agency (e.g., DST, SERB, MOES). This registers the total grant amount, sanction number, and budget heads. Once submitted, it goes through the R&D workflow for approval.",
                                        action: (projectApproved && !hasSanctionRecord ? handleAddSanctionDetails : null) as (() => void) | null,
                                        actionLabel: "Add Fund Sanction",
                                    },
                                    {
                                        num: 3, title: "Sanction Approval", subtitle: "Workflow review by R&D office",
                                        icon: ShieldIcon, color: "violet",
                                        done: hasSanctionApproved, active: hasSanctionRecord && !hasSanctionApproved,
                                        description: "The submitted Fund Sanction goes through the R&D approval pipeline — HoS R&D → Dean R&D. Once all approvals are complete, the sanction status becomes \"Sanction Approved\".",
                                        action: null as (() => void) | null, actionLabel: null as string | null,
                                    },
                                    {
                                        num: 4, title: "Add Fund Received", subtitle: "Record actual funds credited to account",
                                        icon: IndianRupeeIcon, color: "orange",
                                        done: hasFundReceived, active: hasSanctionApproved && !hasFundReceived,
                                        description: "Once the sanction is approved, record each installment of funds received from the funding agency. This updates your project balance and goes through the R&D workflow for verification.",
                                        action: (hasSanctionApproved && !hasFundReceived ? handleAddFunds : null) as (() => void) | null,
                                        actionLabel: "Add Fund Received",
                                    },
                                    {
                                        num: 5, title: "Applications Unlocked", subtitle: "All modules active — start spending",
                                        icon: UnlockIcon, color: "purple",
                                        done: hasFundReceived, active: hasFundReceived,
                                        description: "With an approved fund balance, all application modules are now unlocked: Travel, TA/DA Settlement, Reimbursement, Direct Purchase, Temporary Advance, Honorarium, and more.",
                                        action: (hasFundReceived ? () => { setActiveTab("quick-actions"); setProjectTabParam("quick-actions"); } : null) as (() => void) | null,
                                        actionLabel: "Go to Applications",
                                    },
                                ];

                                type ColorKey = "emerald" | "blue" | "violet" | "orange" | "purple";
                                const colorMap: Record<ColorKey, { bg: string; text: string; badge: string; btn: string; line: string; border: string }> = {
                                    emerald: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", btn: "bg-emerald-600 hover:bg-emerald-700 text-white", line: "bg-emerald-200 dark:bg-emerald-800", border: "border-emerald-200 dark:border-emerald-800/50" },
                                    blue:    { bg: "bg-blue-50 dark:bg-blue-900/20",       text: "text-blue-700 dark:text-blue-300",       badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",       btn: "bg-blue-600 hover:bg-blue-700 text-white",   line: "bg-blue-200 dark:bg-blue-800",   border: "border-blue-200 dark:border-blue-800/50" },
                                    violet:  { bg: "bg-violet-50 dark:bg-violet-900/20",   text: "text-violet-700 dark:text-violet-300",   badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", btn: "bg-violet-600 hover:bg-violet-700 text-white", line: "bg-violet-200 dark:bg-violet-800", border: "border-violet-200 dark:border-violet-800/50" },
                                    orange:  { bg: "bg-orange-50 dark:bg-orange-900/20",   text: "text-orange-700 dark:text-orange-300",   badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", btn: "bg-orange-600 hover:bg-orange-700 text-white", line: "bg-orange-200 dark:bg-orange-800", border: "border-orange-200 dark:border-orange-800/50" },
                                    purple:  { bg: "bg-purple-50 dark:bg-purple-900/20",   text: "text-purple-700 dark:text-purple-300",   badge: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300", btn: "bg-purple-600 hover:bg-purple-700 text-white", line: "bg-purple-200 dark:bg-purple-800", border: "border-purple-200 dark:border-purple-800/50" },
                                };

                                return (
                                    <div>
                                        {/* Header */}
                                        <div className="flex items-center gap-3 p-5 border-b border-zinc-100 dark:border-zinc-800">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/30">
                                                <BookOpenIcon className="w-4.5 h-4.5 text-cyan-600 dark:text-cyan-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Project Operations Guide</h2>
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400">Step-by-step walkthrough to unlock your project</p>
                                            </div>
                                            {currentStep >= 4 && (
                                                <span className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                                                    <CheckCircleIcon className="w-3.5 h-3.5" /> All set
                                                </span>
                                            )}
                                        </div>

                                        {/* Progress bar */}
                                        <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-xs text-zinc-500 dark:text-zinc-400">Progress</span>
                                                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{Math.min(currentStep, 4)} / 4 complete</span>
                                            </div>
                                            <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-emerald-500 transition-all duration-700"
                                                    style={{ width: `${Math.min((currentStep / 4) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </div>

                                        {/* Steps */}
                                        <div className="p-5 space-y-0">
                                            {steps.map((step, idx) => {
                                                const c = colorMap[step.color as ColorKey];
                                                const Icon = step.icon;
                                                const isDone = step.done;
                                                const isActive = step.active;
                                                const isLocked = !isDone && !isActive;
                                                const isLast = idx === steps.length - 1;

                                                return (
                                                    <div key={step.num} className="relative flex gap-4">
                                                        {/* Left column: icon + line */}
                                                        <div className="flex flex-col items-center shrink-0">
                                                            <div className={cn(
                                                                "h-8 w-8 flex items-center justify-center rounded-full border-2 z-10 bg-white dark:bg-zinc-900",
                                                                isDone && "border-emerald-400 dark:border-emerald-600",
                                                                isActive && c.border,
                                                                isLocked && "border-zinc-200 dark:border-zinc-700",
                                                            )}>
                                                                {isDone ? (
                                                                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                                                                ) : isActive ? (
                                                                    <Icon className={cn("w-3.5 h-3.5", c.text)} />
                                                                ) : (
                                                                    <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">{step.num}</span>
                                                                )}
                                                            </div>
                                                            {!isLast && (
                                                                <div className={cn(
                                                                    "w-0.5 flex-1 mt-0.5 mb-0.5 min-h-[20px]",
                                                                    isDone ? c.line : "bg-zinc-100 dark:bg-zinc-800"
                                                                )} />
                                                            )}
                                                        </div>

                                                        {/* Right column: card */}
                                                        <div className={cn(
                                                            "flex-1 min-w-0 rounded-xl border p-3.5 transition-all mb-3",
                                                            isDone && "border-emerald-100 dark:border-emerald-900/40 bg-white dark:bg-zinc-900",
                                                            isActive && cn(c.bg, c.border, "border shadow-sm"),
                                                            isLocked && "border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/20 opacity-50",
                                                        )}>
                                                            <div className="flex items-start justify-between gap-2 mb-0.5">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className={cn(
                                                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                                                        isDone ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                                                                        : isActive ? c.badge
                                                                        : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
                                                                    )}>Step {step.num}</span>
                                                                    <span className={cn(
                                                                        "text-sm font-semibold",
                                                                        isDone ? "text-emerald-800 dark:text-emerald-200"
                                                                        : isActive ? c.text
                                                                        : "text-zinc-400 dark:text-zinc-500"
                                                                    )}>{step.title}</span>
                                                                </div>
                                                                <span className="shrink-0 text-[10px] font-semibold">
                                                                    {isDone && <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5"><CheckCircleIcon className="w-3 h-3" /> Done</span>}
                                                                    {isActive && <span className={cn(c.text, "flex items-center gap-0.5")}><CircleDotIcon className="w-3 h-3 animate-pulse" /> Current</span>}
                                                                    {isLocked && <span className="text-zinc-300 dark:text-zinc-600 flex items-center gap-0.5"><LockIcon className="w-3 h-3" /> Locked</span>}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mb-1">{step.subtitle}</p>
                                                            {(isDone || isActive) && (
                                                                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mt-1.5">{step.description}</p>
                                                            )}
                                                            {isActive && step.action && (
                                                                <button
                                                                    onClick={step.action}
                                                                    className={cn("mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors", c.btn)}
                                                                >
                                                                    {step.actionLabel}
                                                                    <ArrowRightIcon className="w-3 h-3" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Right Sidebar Column */}
                    <aside
                        className={cn(
                            "lg:col-span-1 space-y-4 lg:sticky lg:top-28 lg:self-start",
                            activeTab === "ledger" && "hidden",
                        )}
                    >
                        <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20">
                                <div className="w-0.5 h-3 rounded-full bg-[#4A6CF7]" />
                                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#1E3A8A] dark:text-blue-200">
                                    Balances
                                </h3>
                            </div>
                            <div className="p-2 space-y-1.5">
                                <div className="rounded border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-2">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-[9px] font-bold uppercase text-blue-700 dark:text-blue-300">Commitable</span>
                                        <span className="text-[8px] font-medium text-blue-600 dark:text-blue-400">Available</span>
                                    </div>
                                    <div className="text-[16px] font-extrabold text-blue-900 dark:text-blue-100 mt-0.5 leading-tight">
                                        ₹ {commitableBalance.toLocaleString("en-IN", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </div>
                                </div>
                                <div className="rounded border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-2">
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-[9px] font-bold uppercase text-orange-700 dark:text-orange-300">Actual</span>
                                        <span className="text-[8px] font-medium text-orange-600 dark:text-orange-400">After Payments</span>
                                    </div>
                                    <div className="text-[16px] font-extrabold text-orange-900 dark:text-orange-100 mt-0.5 leading-tight">
                                        ₹ {actualBalance.toLocaleString("en-IN", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </div>
                                </div>
                                {commitableBalance !== actualBalance && (
                                    <div className="rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-2">
                                        <div className="text-[8px] font-bold text-amber-700 dark:text-amber-300">Difference</div>
                                        <div className="text-[14px] font-extrabold text-amber-900 dark:text-amber-100 mt-0.5 leading-tight">
                                            ₹ {(commitableBalance - actualBalance).toLocaleString("en-IN", {
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-white dark:bg-[#27272A] shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-[#C7D2FE] dark:border-blue-900/40 bg-[#EEF2FF] dark:bg-blue-950/20">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1 h-5 rounded-full bg-[#4A6CF7]" />
                                    <h3 className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[#1E3A8A] dark:text-blue-200">
                                        {activeTab === "sanction-details"
                                            ? "Latest Activity"
                                            : "Latest Activity (Project)"}
                                    </h3>
                                    {activeTab !== "sanction-details" && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setActiveTab("activity");
                                                setProjectTabParam("activity");
                                            }}
                                            className="ml-auto text-[10px] font-extrabold uppercase tracking-widest text-[#2563EB] hover:text-[#D97757]"
                                        >
                                            View All
                                        </button>
                                    )}
                                </div>
                                {activeTab === "sanction-details" && (
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setActivityViewType("sanction")}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors border",
                                                activityViewType === "sanction"
                                                    ? "bg-[#4A6CF7] text-white border-[#4A6CF7]"
                                                    : "bg-white dark:bg-[#18181B] text-[#4A6CF7] border-[#4A6CF7]/30 hover:bg-[#4A6CF7]/5"
                                            )}
                                        >
                                            Sanction
                                        </button>
                                        <button
                                            onClick={() => setActivityViewType("fund")}
                                            className={cn(
                                                "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors border",
                                                activityViewType === "fund"
                                                    ? "bg-[#4A6CF7] text-white border-[#4A6CF7]"
                                                    : "bg-white dark:bg-[#18181B] text-[#4A6CF7] border-[#4A6CF7]/30 hover:bg-[#4A6CF7]/5"
                                            )}
                                        >
                                            Fund
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                {(() => {
                                    const displayActivity = (activeTab === "sanction-details" && activityViewType === "fund")
                                        ? fundReceivedActivityData?.message
                                        : (activeTab === "sanction-details" && activityViewType === "sanction")
                                            ? sanctionActivityData?.message
                                            : activityData?.message;
                                    return displayActivity?.length ? (
                                        <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                                            {displayActivity
                                                .slice(0, 4)
                                                .map((activity, idx) => (
                                                    <div
                                                        key={`${activity.creation}-${idx}`}
                                                        className="rounded-xl border border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] p-3"
                                                    >
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="h-7 w-7 rounded-lg bg-[#EEF2FF] dark:bg-blue-950/20 border border-[#C7D2FE] dark:border-blue-900/40 flex items-center justify-center text-[11px] font-extrabold text-[#1E3A8A] dark:text-blue-200">
                                                                {activity.owner
                                                                    ?.charAt(0)
                                                                    .toUpperCase() ||
                                                                    "U"}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-[12px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">
                                                                    {activity.owner ||
                                                                        "Unknown User"}
                                                                </p>
                                                                <p className="text-[10px] font-medium text-[#A1A1AA]">
                                                                    {activity.creation
                                                                        ? new Date(
                                                                            activity.creation,
                                                                        ).toLocaleString()
                                                                        : ""}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div
                                                            className="line-clamp-2 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA] prose prose-sm max-w-none dark:prose-invert"
                                                            dangerouslySetInnerHTML={{
                                                                __html:
                                                                    activity.content ||
                                                                    "",
                                                            }}
                                                        />
                                                    </div>
                                                ))}
                                        </div>
                                    ) : (
                                        <div className="rounded-xl border border-dashed border-[#E4E4E7] dark:border-[#3F3F46] bg-[#FAFAF9] dark:bg-[#18181B] p-5 text-center">
                                            <p className="text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA]">
                                                No recent activity.
                                            </p>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* Section 2: Add Comment (Moved Up) */}
                        {/* <div className="frappe-widget">
              <h3 className="frappe-widget-title">Add Comment</h3>
              <textarea
                id="comment-box"
                className="frappe-textarea"
                rows={3}
                placeholder="Type your comment here..."
                value={sidebarComment}
                onChange={(e) => setSidebarComment(e.target.value)}
              />
              <button
                className="frappe-btn frappe-btn-primary w-full mt-3"
                onClick={handleSidebarCommentSubmit}
                disabled={isAddingComment}
                aria-label="Submit comment"
              >
                {isAddingComment ? "Submitting..." : "Submit Comment"}
              </button>
            </div> */}

                        {/* Section 3: Commits - Only visible on Application tab */}
                        {isRnDStaff && activeTab === "quick-actions" && (
                            <div className="frappe-widget">
                                <h3 className="frappe-widget-title">
                                    Make a Commitment
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label
                                            htmlFor="commit-head"
                                            className="frappe-label"
                                        >
                                            Budget Head
                                        </label>
                                        <select
                                            id="commit-head"
                                            className="frappe-select"
                                            value={commitHead}
                                            onChange={(e) =>
                                                setCommitHead(e.target.value)
                                            }
                                        >
                                            {ledgerHeadTabs
                                                .filter(
                                                    (head) => head !== "All",
                                                )
                                                .map((head) => (
                                                    <option
                                                        key={head}
                                                        value={head}
                                                    >
                                                        {head}
                                                    </option>
                                                ))}
                                        </select>
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                            Available:{" "}
                                            <span className="font-medium text-[#D97757]">
                                                {actualBalance.toLocaleString(
                                                    "en-IN",
                                                    {
                                                        style: "currency",
                                                        currency: "INR",
                                                    },
                                                )}
                                            </span>
                                        </p>
                                    </div>
                                    <div>
                                        <label
                                            htmlFor="commit-amount"
                                            className="frappe-label"
                                        >
                                            Amount (₹)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            id="commit-amount"
                                            title="Enter a positive amount in ₹"
                                            className="frappe-input"
                                            placeholder="e.g., 5000"
                                            value={commitAmount}
                                            onChange={(e) =>
                                                setCommitAmount(e.target.value)
                                            }
                                            onKeyDown={(e) => {
                                                if (
                                                    [
                                                        "e",
                                                        "E",
                                                        "+",
                                                        "-",
                                                    ].includes(e.key) ||
                                                    /[a-zA-Z]/.test(e.key)
                                                ) {
                                                    e.preventDefault();
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                        <button
                                            onClick={handleCommit}
                                            className="frappe-btn frappe-btn-primary flex-1"
                                        >
                                            Commit
                                        </button>
                                        <button
                                            onClick={handleRemoveLastCommit}
                                            className="frappe-btn frappe-btn-ghost"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                    {/* <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-2">
                    <button
                      onClick={() => setIsLedgerOpen(true)}
                      className="w-full text-center text-sm font-medium text-[#D97757] hover:text-[#D97757] hover:underline"
                    >
                      View Project Ledger
                    </button>
                  </div> */}
                                </div>
                            </div>
                        )}
                    </aside>
                </div>

                {/* Budget Ledger Modal */}
                {isLedgerOpen && (
                    <div
                        className="frappe-modal-backdrop"
                        onClick={() => setIsLedgerOpen(false)}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="modal-title"
                    >
                        <div
                            className="frappe-modal"
                            onClick={(e) => e.stopPropagation()}
                            style={{ maxWidth: "1200px", width: "95%" }}
                        >
                            <header className="frappe-modal-header">
                                <h2 id="modal-title">Project Budget Ledger</h2>
                                <button
                                    onClick={() => setIsLedgerOpen(false)}
                                    className="frappe-modal-close"
                                    aria-label="Close modal"
                                >
                                    ×
                                </button>
                            </header>
                            <div className="frappe-modal-body">
                                {/* Head-wise Tabs */}
                                <div className="mb-4 border-b border-zinc-200 dark:border-zinc-800">
                                    <nav
                                        className="flex flex-wrap gap-2"
                                        aria-label="Ledger tabs"
                                    >
                                        {ledgerHeadTabs.map((tab) => {
                                            const tabEntries =
                                                tab === "All"
                                                    ? budgetData
                                                    : budgetData.filter(
                                                        (e: any) =>
                                                            (
                                                                e.head ||
                                                                e.accountHead ||
                                                                ""
                                                            )
                                                                .trim()
                                                                .toLowerCase() ===
                                                            tab
                                                                .trim()
                                                                .toLowerCase(),
                                                    );
                                            // Use the last entry's commitableBalance for that head (running total already calculated)
                                            const lastEntryForHead =
                                                tabEntries.length > 0
                                                    ? tabEntries[
                                                    tabEntries.length - 1
                                                    ]
                                                    : null;
                                            const tabBalance =
                                                tab === "All"
                                                    ? tabEntries.reduce(
                                                        (acc, e) =>
                                                            acc +
                                                            (e.received ||
                                                                0) -
                                                            (e.committed ||
                                                                0) -
                                                            (e.payment || 0),
                                                        0,
                                                    )
                                                    : lastEntryForHead?.commitableBalance ||
                                                    0;
                                            return (
                                                <button
                                                    key={tab}
                                                    onClick={() =>
                                                        setActiveLedgerTab(tab)
                                                    }
                                                    className={cn(
                                                        "px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors border-b-2 flex flex-col items-start",
                                                        activeLedgerTab === tab
                                                            ? "border-[#D97757] text-[#D97757] bg-zinc-50 dark:bg-zinc-800 dark:bg-[#D97757]/20"
                                                            : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800/50",
                                                    )}
                                                >
                                                    <span className="flex items-center gap-2">
                                                        {tab}
                                                        <span
                                                            className={cn(
                                                                "px-1.5 py-0.5 text-xs rounded-full",
                                                                activeLedgerTab ===
                                                                    tab
                                                                    ? "bg-[#D97757] text-white"
                                                                    : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400",
                                                            )}
                                                        >
                                                            {tabEntries.length}
                                                        </span>
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            "text-xs font-bold mt-0.5",
                                                            tabBalance >= 0
                                                                ? "text-green-600"
                                                                : "text-red-600",
                                                        )}
                                                    >
                                                        ₹{" "}
                                                        {tabBalance.toLocaleString(
                                                            "en-IN",
                                                        )}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </nav>
                                </div>

                                {/* Summary for selected head */}
                                {activeLedgerTab !== "All" &&
                                    (() => {
                                        const lastEntry =
                                            filteredLedgerData.length > 0
                                                ? filteredLedgerData[
                                                filteredLedgerData.length -
                                                1
                                                ]
                                                : null;
                                        return (
                                            <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-wrap gap-6">
                                                <div>
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-semibold">
                                                        Total Received
                                                    </span>
                                                    <p className="text-sm font-bold text-green-600">
                                                        ₹{" "}
                                                        {filteredLedgerData
                                                            .reduce(
                                                                (acc, e) =>
                                                                    acc +
                                                                    (e.received ||
                                                                        0),
                                                                0,
                                                            )
                                                            .toLocaleString(
                                                                "en-IN",
                                                            )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-semibold">
                                                        Total Committed
                                                    </span>
                                                    <p className="text-sm font-bold text-red-600">
                                                        ₹{" "}
                                                        {filteredLedgerData
                                                            .reduce(
                                                                (acc, e) =>
                                                                    acc +
                                                                    (e.committed ||
                                                                        0),
                                                                0,
                                                            )
                                                            .toLocaleString(
                                                                "en-IN",
                                                            )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-zinc-500 dark:text-zinc-400 uppercase font-semibold">
                                                        Available Balance
                                                    </span>
                                                    <p className="text-sm font-bold text-[#D97757]">
                                                        ₹{" "}
                                                        {(
                                                            lastEntry?.commitableBalance ||
                                                            0
                                                        ).toLocaleString(
                                                            "en-IN",
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                <div className="overflow-x-auto">
                                    <table className="frappe-table">
                                        <thead>
                                            <tr>
                                                <th>TID</th>
                                                <th>Date</th>
                                                <th>Particulars</th>
                                                <th>BMR</th>
                                                <th>Module Name</th>
                                                <th>App ID</th>
                                                <th
                                                    style={{
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    Fund Received
                                                </th>
                                                <th
                                                    style={{
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    Commit Amt
                                                </th>
                                                <th
                                                    style={{
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    Commitable Bal
                                                </th>
                                                <th
                                                    style={{
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    Payment Amt
                                                </th>
                                                <th
                                                    style={{
                                                        textAlign: "right",
                                                    }}
                                                >
                                                    Payment Bal
                                                </th>
                                                <th>Status</th>
                                                <th>ACTIONS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedFilteredLedgerData.length ===
                                                0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={13}
                                                        className="text-center py-8 text-zinc-500 dark:text-zinc-400"
                                                    >
                                                        No entries found for{" "}
                                                        {activeLedgerTab}
                                                    </td>
                                                </tr>
                                            ) : (
                                                sortedFilteredLedgerData.map(
                                                    (row, index) => (
                                                        <tr key={index}>
                                                            <td>{row.sl}</td>
                                                            <td>{row.date}</td>
                                                            <td>
                                                                {
                                                                    row.particulars
                                                                }
                                                            </td>
                                                            <td>{row.bmr}</td>
                                                            <td>
                                                                {(row as any)
                                                                    .moduleCode ||
                                                                    "-"}
                                                            </td>
                                                            <td>
                                                                {(row as any)
                                                                    .frapAppId ||
                                                                    "-"}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    textAlign:
                                                                        "right",
                                                                }}
                                                                className={
                                                                    row.received
                                                                        ? "text-green-600 font-medium"
                                                                        : ""
                                                                }
                                                            >
                                                                {row.received
                                                                    ? row.received.toLocaleString(
                                                                        "en-IN",
                                                                    )
                                                                    : "-"}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    textAlign:
                                                                        "right",
                                                                }}
                                                                className={
                                                                    row.committed
                                                                        ? "text-red-600 font-medium"
                                                                        : ""
                                                                }
                                                            >
                                                                {row.committed
                                                                    ? row.committed.toLocaleString(
                                                                        "en-IN",
                                                                    )
                                                                    : "-"}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    textAlign:
                                                                        "right",
                                                                }}
                                                                className="font-semibold text-zinc-900 dark:text-zinc-100"
                                                            >
                                                                {row.commitableBalance?.toLocaleString(
                                                                    "en-IN",
                                                                )}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    textAlign:
                                                                        "right",
                                                                }}
                                                                className={
                                                                    row.payment
                                                                        ? "text-red-600 font-medium"
                                                                        : ""
                                                                }
                                                            >
                                                                {row.payment
                                                                    ? row.payment.toLocaleString(
                                                                        "en-IN",
                                                                    )
                                                                    : "-"}
                                                            </td>
                                                            <td
                                                                style={{
                                                                    textAlign:
                                                                        "right",
                                                                }}
                                                                className="font-semibold text-zinc-900 dark:text-zinc-100"
                                                            >
                                                                {activeLedgerTab ===
                                                                    "All"
                                                                    ? row.actualBalance?.toLocaleString(
                                                                        "en-IN",
                                                                    )
                                                                    : (
                                                                        row as any
                                                                    ).headActualBalance?.toLocaleString(
                                                                        "en-IN",
                                                                    )}
                                                            </td>
                                                            <td>
                                                                <span
                                                                    className={
                                                                        (
                                                                            row as any
                                                                        )
                                                                            .status ===
                                                                            "Paid"
                                                                            ? "text-green-600 font-medium"
                                                                            : (
                                                                                row as any
                                                                            )
                                                                                .status ===
                                                                                "Pending"
                                                                                ? "text-amber-600 font-medium"
                                                                                : ""
                                                                    }
                                                                >
                                                                    {(
                                                                        row as any
                                                                    ).status ||
                                                                        "-"}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                {row.committed >
                                                                    0 &&
                                                                    !row.payment &&
                                                                    // Restrict "Pay" button to RnD Staff roles
                                                                    isRnDStaff && (
                                                                        <button
                                                                            onClick={() =>
                                                                                openPaymentModal(
                                                                                    row,
                                                                                )
                                                                            }
                                                                            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#D97757] hover:bg-[#D97757] rounded-md shadow-sm transition-colors"
                                                                        >
                                                                            Pay
                                                                        </button>
                                                                    )}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    return (
        <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
            <main className="flex-1 w-full">{renderContent()}</main>

            {/* Sanction Submit Comment Modal */}
            <CommentModal
                isOpen={sanctionModalOpen}
                onClose={() => setSanctionModalOpen(false)}
                onSubmit={handleConfirmSanctionSubmit}
                action="Submit Sanction"
                isLoading={isSubmittingSanction}
            />

            {/* Payment Form Modal */}
            {paymentModalOpen && (
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
                    onClick={() => setPaymentModalOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                            <div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                    Record Payment
                                </h2>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                                    Submit payment for committed amount
                                </p>
                            </div>
                            <button
                                onClick={() => setPaymentModalOpen(false)}
                                className="p-2 hover:bg-zinc-200 dark:bg-zinc-700 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-auto p-6 space-y-4">
                            {paymentFieldDefs
                                .filter((f: any) => !f.hidden)
                                .map((field: any) => {
                                    const value =
                                        paymentFormData[field.fieldname] || "";
                                    const options =
                                        paymentLinkOptions[field.fieldname] ||
                                        [];

                                    if (field.fieldtype === "Section Break") {
                                        return (
                                            <div
                                                key={field.fieldname}
                                                className="pt-4 border-t border-zinc-200 dark:border-zinc-800 first:border-0 first:pt-0"
                                            >
                                                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wide">
                                                    {field.label}
                                                </h3>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={field.fieldname}>
                                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                                {field.label}{" "}
                                                {field.mandatory ? (
                                                    <span className="text-red-500">
                                                        *
                                                    </span>
                                                ) : (
                                                    ""
                                                )}
                                            </label>

                                            {/* Select for Select/Link fieldtypes */}
                                            {field.fieldtype === "Select" ||
                                                field.fieldtype === "Link" ? (
                                                <select
                                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                                    value={value}
                                                    onChange={(e) =>
                                                        handlePaymentFieldChange(
                                                            field.fieldname,
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={field.read_only}
                                                >
                                                    <option value="">
                                                        Select {field.label}...
                                                    </option>
                                                    {options.map((opt: any) => (
                                                        <option
                                                            key={opt.value}
                                                            value={opt.value}
                                                        >
                                                            {opt.label ||
                                                                opt.value}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : field.fieldtype === "Date" ? (
                                                <input
                                                    type="date"
                                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                                    value={value}
                                                    onChange={(e) =>
                                                        handlePaymentFieldChange(
                                                            field.fieldname,
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={field.read_only}
                                                />
                                            ) : field.fieldtype ===
                                                "Currency" ? (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    title="Enter a positive amount in ₹"
                                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                                    value={value}
                                                    onChange={(e) =>
                                                        handlePaymentFieldChange(
                                                            field.fieldname,
                                                            parseFloat(
                                                                e.target.value,
                                                            ) || 0,
                                                        )
                                                    }
                                                    disabled={field.read_only}
                                                    placeholder="0.00"
                                                    onKeyDown={(e) => {
                                                        if (
                                                            [
                                                                "e",
                                                                "E",
                                                                "+",
                                                                "-",
                                                            ].includes(e.key) ||
                                                            /[a-zA-Z]/.test(
                                                                e.key,
                                                            )
                                                        ) {
                                                            e.preventDefault();
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25 focus:border-[#D97757]"
                                                    value={value}
                                                    onChange={(e) =>
                                                        handlePaymentFieldChange(
                                                            field.fieldname,
                                                            e.target.value,
                                                        )
                                                    }
                                                    disabled={field.read_only}
                                                    placeholder={
                                                        field.description || ""
                                                    }
                                                />
                                            )}
                                            {field.description && (
                                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                                                    {field.description}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}

                            {/* Commitment Info */}
                            {selectedCommitmentForPayment && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <h4 className="text-sm font-semibold text-blue-800 mb-2">
                                        Commitment Details
                                    </h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div>
                                            <span className="text-blue-600">
                                                Particulars:
                                            </span>{" "}
                                            <span className="text-blue-900">
                                                {
                                                    selectedCommitmentForPayment.particulars
                                                }
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-blue-600">
                                                Committed:
                                            </span>{" "}
                                            <span className="font-bold text-blue-900">
                                                ₹
                                                {selectedCommitmentForPayment.committed?.toLocaleString(
                                                    "en-IN",
                                                )}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-blue-600">
                                                BMR:
                                            </span>{" "}
                                            <span className="text-blue-900">
                                                {selectedCommitmentForPayment.bmr ||
                                                    "-"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-blue-600">
                                                Head:
                                            </span>{" "}
                                            <span className="text-blue-900">
                                                {(
                                                    selectedCommitmentForPayment as any
                                                ).head || "-"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
                            <button
                                onClick={() => setPaymentModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:bg-zinc-800/50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitPayment}
                                disabled={isPaymentSubmitting}
                                className="px-4 py-2 text-sm font-medium text-white bg-[#D97757] rounded-lg hover:bg-[#D97757] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isPaymentSubmitting
                                    ? "Submitting..."
                                    : "Submit Payment"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetailsOverview;
