import React from "react";
import {
    CheckCircle2,
    Circle,
    Clock3,
    FileBadge,
    FileCheck2,
    Landmark,
    ListChecks,
    ReceiptIndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";

type LifecycleStage = "endorsement" | "registration" | "approval" | "sanction" | "fund";

export interface ProjectLifecycleGuideProps {
    workflowState?: string;
    projectType?: string;
    isApprovedEndorsement?: boolean;
    missingEndorsementFields?: string[];
    isEndorsementReady?: boolean;
    hasSanction?: boolean;
    hasFundReceived?: boolean;
    compact?: boolean;
    registrationActionLabel?: string;
    onEndorsementClick?: () => void;
    onRegisterClick?: () => void;
    onAddSanctionClick?: () => void;
    onAddFundReceivedClick?: () => void;
}

const stages: {
    id: LifecycleStage;
    label: string;
    description: string;
    Icon: React.ElementType;
}[] = [
    {
        id: "endorsement",
        label: "Optional Endorsement",
        description: "Use only when a certificate is needed for this project.",
        Icon: FileBadge,
    },
    {
        id: "registration",
        label: "Registration",
        description: "Complete all project details and submit the project.",
        Icon: FileCheck2,
    },
    {
        id: "approval",
        label: "Approval",
        description: "Project registration moves through approval workflow.",
        Icon: CheckCircle2,
    },
    {
        id: "sanction",
        label: "Fund Sanction",
        description: "Add sanction letter, date, amount, budget breakup, and files.",
        Icon: Landmark,
    },
    {
        id: "fund",
        label: "Fund Received",
        description: "Record received installments against the approved sanction.",
        Icon: ReceiptIndianRupee,
    },
];

const isConsultancy = (projectType?: string) =>
    projectType?.toLowerCase() === "consultancy";

const getGuideState = ({
    workflowState,
    projectType,
    isApprovedEndorsement,
    isEndorsementReady,
    hasSanction,
    hasFundReceived,
}: ProjectLifecycleGuideProps) => {
    const state = workflowState || "Draft";
    const consultancy = isConsultancy(projectType);
    const endorsementApproved = isApprovedEndorsement || state === "Endorsement Approved";
    const registrationApproved = state === "Approved" || state === "Proposal Approved";

    if (hasFundReceived) {
        return {
            active: "fund" as LifecycleStage,
            title: "Fund received is recorded",
            message: "This project has reached the fund received stage. Review the fund record for installment and sanction details.",
        };
    }

    if (hasSanction) {
        return {
            active: "fund" as LifecycleStage,
            title: "Next step: add fund received",
            message: "A fund sanction is approved. Record the received amount or installment against that sanction.",
        };
    }

    if (registrationApproved) {
        return {
            active: "sanction" as LifecycleStage,
            title: "Next step: add fund sanction",
            message: "Project Registration is approved. Add sanction letter details, sanctioned amount, budget breakup, and supporting files.",
        };
    }

    if (endorsementApproved) {
        return {
            active: "registration" as LifecycleStage,
            title: "Endorsement approved, registration can continue",
            message: "Complete all registration sections, save if needed, and submit the full project for approval.",
        };
    }

    if (state?.toLowerCase().includes("endorsement") && state?.toLowerCase().includes("pending")) {
        return {
            active: "endorsement" as LifecycleStage,
            title: "Endorsement submitted",
            message: "The certificate has been submitted. You may still complete the project registration details while it is under review.",
        };
    }

    return {
        active: "registration" as LifecycleStage,
        title: "Complete project registration",
        message: consultancy
            ? "Consultancy projects can be registered directly. Fill the required sections, save draft if needed, and submit the project."
            : "Endorsement is optional. Fill the project sections and submit registration; generate endorsement only when this project needs a certificate.",
    };
};

export const ProjectLifecycleGuide: React.FC<ProjectLifecycleGuideProps> = (props) => {
    const {
        workflowState,
        projectType,
        missingEndorsementFields = [],
        isEndorsementReady,
        hasSanction,
        hasFundReceived,
        compact,
        registrationActionLabel = "Register Project",
        onEndorsementClick,
        onRegisterClick,
        onAddSanctionClick,
        onAddFundReceivedClick,
    } = props;

    const guide = getGuideState(props);
    const activeIndex = stages.findIndex((stage) => stage.id === guide.active);
    const consultancy = isConsultancy(projectType);
    const showOptionalEndorsement = !!onEndorsementClick && !consultancy && guide.active !== "sanction" && guide.active !== "fund";

    const action = (() => {
        if (guide.active === "registration" && onRegisterClick) {
            return { label: registrationActionLabel, onClick: onRegisterClick, disabled: false };
        }
        if (guide.active === "sanction" && onAddSanctionClick) {
            return { label: "Add Fund Sanction", onClick: onAddSanctionClick, disabled: false };
        }
        if (guide.active === "fund" && onAddFundReceivedClick && hasSanction && !hasFundReceived) {
            return { label: "Add Fund Received", onClick: onAddFundReceivedClick, disabled: false };
        }
        return null;
    })();

    return (
        <section className="overflow-hidden rounded-2xl border border-[#D4D4D8] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
            <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
            <div className={cn("space-y-4 p-4 sm:p-5", compact && "space-y-3 p-4")}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#D97757]">
                                Project Flow Guide
                            </span>
                            {workflowState && (
                                <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[10px] font-bold text-[#52525B] dark:bg-[#18181B] dark:text-[#D4D4D8]">
                                    {workflowState}
                                </span>
                            )}
                            {projectType && (
                                <span className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[10px] font-bold text-[#1E3A8A] dark:bg-[#4A6CF7]/15 dark:text-[#C7D2FE]">
                                    {projectType}
                                </span>
                            )}
                        </div>
                        <h2 className="text-[16px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                            {guide.title}
                        </h2>
                        <p className="mt-1 max-w-3xl text-[12px] font-medium leading-relaxed text-[#71717A] dark:text-[#A1A1AA]">
                            {guide.message}
                        </p>
                    </div>
                    {action && (
                        <button
                            type="button"
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#4A6CF7] px-3 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-sm transition-all hover:bg-[#3558E8] disabled:cursor-not-allowed disabled:bg-[#E4E4E7] disabled:text-[#71717A] dark:disabled:bg-[#3F3F46] dark:disabled:text-[#A1A1AA]"
                        >
                            {action.label}
                        </button>
                    )}
                </div>

                {!compact && (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] p-4 dark:border-[#3F3F46] dark:bg-[#18181B]">
                            <div className="mb-2 flex items-center gap-2">
                                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EEF2FF] text-[#4A6CF7] dark:bg-[#4A6CF7]/15 dark:text-[#A5B4FC]">
                                    <ListChecks className="h-3.5 w-3.5" />
                                </span>
                                <h3 className="text-[12px] font-extrabold uppercase tracking-wide text-[#3F3F46] dark:text-[#E4E4E7]">
                                    What to do on this page
                                </h3>
                            </div>
                            <div className="space-y-2 text-[12px] font-medium leading-relaxed text-[#52525B] dark:text-[#D4D4D8]">
                                <p>1. Fill Project Description, PI/Co-PI details, Proposed Budget, Clearance, and Sanction/Fund details if available.</p>
                                <p>2. Use Save As Draft when details are incomplete.</p>
                                <p>3. Use Register Project on the final step when the form is ready for approval.</p>
                            </div>
                        </div>

                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
                            <div className="mb-2 flex items-center gap-2">
                                <FileBadge className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                                <h3 className="text-[12px] font-extrabold uppercase tracking-wide text-amber-900 dark:text-amber-200">
                                    Endorsement note
                                </h3>
                            </div>
                            <p className="text-[12px] font-medium leading-relaxed text-amber-900 dark:text-amber-200">
                                Endorsement is not compulsory for every project. Generate it only when the project or office process needs an endorsement certificate.
                            </p>
                            {showOptionalEndorsement && (
                                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <button
                                        type="button"
                                        onClick={onEndorsementClick}
                                        disabled={!isEndorsementReady}
                                        className="inline-flex h-8 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-[11px] font-extrabold uppercase tracking-wide text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200 dark:hover:bg-amber-900/30"
                                    >
                                        {isEndorsementReady ? "Generate Endorsement" : "Endorsement Fields Missing"}
                                    </button>
                                    {!isEndorsementReady && missingEndorsementFields.length > 0 && (
                                        <span className="text-[10px] font-semibold leading-snug text-amber-800 dark:text-amber-300">
                                            Needed only for endorsement: {missingEndorsementFields.join(", ")}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {!compact && (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                        {stages.map(({ id, label, description, Icon }, index) => {
                            const isOptional = id === "endorsement" && !consultancy;
                            const isDone = !isOptional && (index < activeIndex || (id === "endorsement" && consultancy));
                            const isActive = id === guide.active;
                            const StepIcon = isDone ? CheckCircle2 : isActive ? Clock3 : Circle;
                            return (
                                <div
                                    key={id}
                                    className={cn(
                                        "min-w-0 rounded-xl border p-3 transition-colors",
                                        isActive
                                            ? "border-[#4A6CF7] bg-[#EEF2FF] dark:border-[#818CF8] dark:bg-[#4A6CF7]/15"
                                            : isDone
                                                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-950/20"
                                                : "border-[#E4E4E7] bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#18181B]",
                                    )}
                                >
                                    <div className="mb-2 flex items-center justify-between gap-2">
                                        <span
                                            className={cn(
                                                "flex h-7 w-7 items-center justify-center rounded-lg",
                                                isActive
                                                    ? "bg-[#4A6CF7] text-white"
                                                    : isDone
                                                        ? "bg-emerald-500 text-white"
                                                        : "bg-white text-[#71717A] ring-1 ring-[#E4E4E7] dark:bg-[#27272A] dark:text-[#A1A1AA] dark:ring-[#3F3F46]",
                                            )}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                        </span>
                                        <StepIcon
                                            className={cn(
                                                "h-4 w-4",
                                                isActive && "text-[#4A6CF7] dark:text-[#A5B4FC]",
                                                isDone && "text-emerald-600 dark:text-emerald-400",
                                                !isActive && !isDone && "text-[#A1A1AA]",
                                            )}
                                        />
                                    </div>
                                    <h3 className="truncate text-[12px] font-extrabold text-[#3F3F46] dark:text-[#E4E4E7]">
                                        {label}
                                    </h3>
                                    {isOptional && (
                                        <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                            Not compulsory
                                        </span>
                                    )}
                                    <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-snug text-[#71717A] dark:text-[#A1A1AA]">
                                        {description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>
        </section>
    );
};

export default ProjectLifecycleGuide;
