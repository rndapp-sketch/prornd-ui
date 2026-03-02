import React, { useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    useFrappeGetDoc,
    useFrappePostCall,
    useFrappeAuth,
} from "frappe-react-sdk";
import { AppSidebar } from "../components/RndSidebar";
import {
    ArrowLeftIcon,
    FileTextIcon,
    UsersIcon,
    IndianRupeeIcon,
    ShieldIcon,
    CheckCircleIcon,
    BuildingIcon,
    UserIcon,
    MailIcon,
    GlobeIcon,
    TargetIcon,
    CalendarIcon,
    MapPinIcon,
    ShoppingCartIcon,
    UsersIcon as UsersGroupIcon,
    DownloadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Section Wrapper Component ---
const SectionWrapper = ({
    title,
    icon: Icon,
    children,
    className,
}: {
    title: string;
    icon: any;
    children: React.ReactNode;
    className?: string;
}) => (
    <div
        className={cn(
            "p-5 md:p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm",
            className
        )}
    >
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg">
                <Icon className="h-5 w-5 text-[#D97757]" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        </div>
        <div className="space-y-4">{children}</div>
    </div>
);

// --- FieldDisplay Component ---
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
        <div className="py-2">
            <div className="flex items-center gap-2 mb-1">
                {Icon && <Icon className="h-4 w-4 text-[#D97757]" />}
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {label}
                </p>
            </div>
            <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2 rounded-lg">
                {String(value)}
            </p>
        </div>
    );
};

// --- HtmlContent Component ---
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
                className="prose prose-sm max-w-none text-zinc-800 dark:text-zinc-200 leading-relaxed "
                dangerouslySetInnerHTML={{ __html: htmlString }}
            />
        </SectionWrapper>
    );
};

// --- TableDisplay Component ---
const TableDisplay = ({
    label,
    data,
    columns,
    icon: Icon,
}: {
    label: string;
    data: any[] | undefined;
    columns: { fieldname: string; label: string; type?: string }[];
    icon?: any;
}) => {
    if (!data || data.length === 0) return null;
    return (
        <SectionWrapper title={label} icon={Icon}>
            <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                        <tr className="divide-x divide-zinc-200 dark:divide-zinc-800">
                            {columns.map((col) => (
                                <th
                                    key={col.fieldname}
                                    className="px-4 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300"
                                >
                                    {col.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                        {data.map((row, index) => (
                            <tr
                                key={index}
                                className="divide-x divide-zinc-200 dark:divide-zinc-800 hover:bg-zinc-50 dark:bg-zinc-800/50/50"
                            >
                                {columns.map((col) => (
                                    <td
                                        key={col.fieldname}
                                        className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100"
                                    >
                                        {col.type === "file" ? (
                                            row[col.fieldname] ? (
                                                <a
                                                    href={row[col.fieldname]}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-2 text-blue-600 underline hover:text-blue-800"
                                                >
                                                    <DownloadIcon className="h-4 w-4" /> View File
                                                </a>
                                            ) : (
                                                "No File"
                                            )
                                        ) : (
                                            row[col.fieldname]
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </SectionWrapper>
    );
};

// --- FrappeButton Component ---
const FrappeButton = ({
    children,
    className,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button
        className={cn(
            "inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-medium text-sm transition-all duration-150",
            "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-[rgba(217,119,87,0.18)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            className
        )}
        {...props}
    >
        {children}
    </button>
);

// --- Main Component ---
const ProjectProposalDetails: React.FC = () => {
    const { name } = useParams<{ name: string }>();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState("overview");
    const { currentUser } = useFrappeAuth();

    const {
        data,
        error,
        isLoading,
        mutate,
    } = useFrappeGetDoc("Project Proposal", name || "");

    const {
        call: submitForm,
        loading: isSubmitting,
    } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_proposal.project_proposal.submit_project_proposal"
    );

    const handleSubmit = useCallback(async () => {
        if (!data) return;
        try {
            // We send the existing data as the doc to submit.
            // The API likely expects the full doc structure or at least the name.
            // Based on ProjectProposal.tsx, it sends { doc: data }.
            await submitForm({ docname: name });
            mutate(); // Refresh data to reflect new status
            alert("Project Proposal Submitted Successfully!");
        } catch (err: any) {
            console.error("Submission error:", err);
            alert(`Submission failed: ${err.message}`);
        }
    }, [data, submitForm, mutate]);

    const tabs = [
        { id: "overview", label: "Overview", icon: FileTextIcon },
        { id: "investigators", label: "Investigators", icon: UsersIcon },
        { id: "budget", label: "Budget", icon: IndianRupeeIcon },
        { id: "clearance", label: "Clearance", icon: ShieldIcon },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-zinc-200 dark:border-zinc-800 border-t-[#90A4AE] mx-auto"></div>
                    <p className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        LOADING PROPOSAL...
                    </p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-claude-bg">
                <div className="text-center">
                    <p className="mt-4 text-2xl font-bold text-red-600">
                        Error loading proposal or not found.
                    </p>
                    <FrappeButton onClick={() => navigate(-1)} className="mt-4 bg-white dark:bg-zinc-900">
                        Go Back
                    </FrappeButton>
                </div>
            </div>
        );
    }

    const isDraft = data.workflow_state === "Draft";
    const isOwner = data.owner === currentUser;

    return (
        <div className="bg-claude-bg min-h-screen">
            <AppSidebar />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden">
                <header className="mb-8 p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:bg-zinc-800/50  transition-transform"
                            >
                                <ArrowLeftIcon className="h-6 w-6" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
                                    Endorsement Details
                                </h1>
                                <p className="text-zinc-700 dark:text-zinc-300  mt-1">
                                    ID: {name} | Status:{" "}
                                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                                        {data.workflow_state || "Draft"}
                                    </span>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <FrappeButton
                                onClick={() => window.open(`/endorsement-certificate/${name}`, '_blank')}
                                className="bg-blue-600 text-white hover:bg-blue-700 border-blue-800 flex items-center gap-2"
                            >
                                <FileTextIcon className="h-5 w-5" />
                                Generate Endorsement
                            </FrappeButton>
                            {isDraft && isOwner && (
                                <FrappeButton
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    className="bg-[#D97757] text-white hover:bg-[#81C784] flex items-center gap-2"
                                >
                                    <CheckCircleIcon className="h-5 w-5" />
                                    {isSubmitting ? "Submitting..." : "Submit Proposal"}
                                </FrappeButton>
                            )}
                        </div>
                    </div>
                </header>

                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                    <div className="border-b border-zinc-200 dark:border-zinc-800 p-4">
                        <nav className="flex gap-1" aria-label="Tabs">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-2 py-3 px-5 font-semibold text-sm rounded-t-xl border border-b-0 transition-all",
                                        activeTab === tab.id
                                            ? "bg-white dark:bg-zinc-900 text-[#D97757] border-zinc-200 dark:border-zinc-800 shadow-sm"
                                            : "bg-zinc-50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 border-transparent hover:text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:bg-zinc-800"
                                    )}
                                >
                                    <tab.icon className="h-4 w-4" /> {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="bg-claude-bg p-6 md:p-8">
                        {activeTab === "overview" && (
                            <div className="space-y-8">
                                <SectionWrapper title="General Information" icon={FileTextIcon}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                                        <FieldDisplay
                                            label="Project Title"
                                            value={data.project_title}
                                            icon={FileTextIcon}
                                        />
                                        <FieldDisplay
                                            label="Project Type"
                                            value={data.project_type}
                                            icon={TargetIcon}
                                        />
                                        {data.project_type === "Consultancy" && (
                                            <FieldDisplay
                                                label="Category"
                                                value={data.consultancy_category}
                                                icon={TargetIcon}
                                            />
                                        )}
                                        {data.project_type === "Other" && (
                                            <FieldDisplay
                                                label="Type Name"
                                                value={data.other_project_type_name}
                                                icon={TargetIcon}
                                            />
                                        )}
                                        <FieldDisplay
                                            label="Implementation Dept"
                                            value={data.implementation_department}
                                            icon={BuildingIcon}
                                        />
                                        <FieldDisplay
                                            label="Duration"
                                            value={
                                                data.project_type !== "Consultancy"
                                                    ? `${data.project_duration_months} Months`
                                                    : `${data.project_duration_days} Days`
                                            }
                                            icon={CalendarIcon}
                                        />
                                        <FieldDisplay
                                            label="Proposal File"
                                            value={
                                                data.upload_proj_prop ? (
                                                    <a
                                                        href={data.upload_proj_prop}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-blue-600 underline"
                                                    >
                                                        View File
                                                    </a>
                                                ) : null
                                            }
                                            icon={DownloadIcon}
                                        />
                                    </div>
                                </SectionWrapper>

                                {data.project_type === "Research" && (
                                    <>
                                        <SectionWrapper title="Funding Details" icon={IndianRupeeIcon}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                                                <FieldDisplay
                                                    label="Agency"
                                                    value={data.funding_agen}
                                                    icon={BuildingIcon}
                                                />
                                                <FieldDisplay
                                                    label="Schemes"
                                                    value={data.funding_agency_schemes}
                                                    icon={FileTextIcon}
                                                />
                                                <FieldDisplay
                                                    label="Type"
                                                    value={data.funding_agency_type}
                                                    icon={TargetIcon}
                                                />
                                                <FieldDisplay
                                                    label="Origin"
                                                    value={data.origin_of_funding_agency}
                                                    icon={GlobeIcon}
                                                />
                                                <FieldDisplay
                                                    label="Ministry"
                                                    value={data.funding_agency_ministry}
                                                    icon={BuildingIcon}
                                                />
                                            </div>
                                        </SectionWrapper>
                                        <SectionWrapper title="Agency Address" icon={MapPinIcon}>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                                                <FieldDisplay
                                                    label="Address"
                                                    value={data.address_street_village_locality}
                                                    icon={MapPinIcon}
                                                />
                                                <FieldDisplay
                                                    label="State"
                                                    value={data.address_state}
                                                    icon={MapPinIcon}
                                                />
                                                <FieldDisplay
                                                    label="Postal Code"
                                                    value={data.address_postal_code}
                                                    icon={MapPinIcon}
                                                />
                                                <FieldDisplay
                                                    label="Country"
                                                    value={data.address_country}
                                                    icon={GlobeIcon}
                                                />
                                            </div>
                                        </SectionWrapper>
                                    </>
                                )}

                                <HtmlContent
                                    title="Executive Summary"
                                    htmlString={data.executive_summary}
                                    icon={FileTextIcon}
                                />
                                <HtmlContent
                                    title="Project Objective"
                                    htmlString={data.project_objective}
                                    icon={TargetIcon}
                                />
                                <HtmlContent
                                    title="Project Deliverables"
                                    htmlString={data.project_deliverables}
                                    icon={CheckCircleIcon}
                                />
                            </div>
                        )}

                        {activeTab === "investigators" && (
                            <div className="space-y-8">
                                <SectionWrapper title="Principal Investigator" icon={UserIcon}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                                        <FieldDisplay
                                            label="Name"
                                            value={data.principal_investigator_name}
                                            icon={UserIcon}
                                        />
                                        <FieldDisplay
                                            label="Email"
                                            value={data.pi_webmail}
                                            icon={MailIcon}
                                        />
                                        <FieldDisplay
                                            label="Employee ID"
                                            value={data.pi_employee_id}
                                            icon={UserIcon}
                                        />
                                        <FieldDisplay
                                            label="Designation"
                                            value={data.designation}
                                            icon={UsersIcon}
                                        />
                                        <FieldDisplay
                                            label="Department"
                                            value={data.applicant_department}
                                            icon={BuildingIcon}
                                        />
                                    </div>
                                </SectionWrapper>

                                {data.is_additional_pi === "Yes" && (
                                    <TableDisplay
                                        label="Additional PIs"
                                        data={data.additional_pi_table}
                                        columns={[
                                            { fieldname: "pi_name", label: "Name" },
                                            { fieldname: "pi_designation", label: "Designation" },
                                            { fieldname: "pi_email", label: "Email" },
                                        ]}
                                        icon={UsersGroupIcon}
                                    />
                                )}

                                {data.has_co_pi === "Yes" && (
                                    <TableDisplay
                                        label="Co-Investigators"
                                        data={data.co_investigator_table}
                                        columns={[
                                            { fieldname: "copi_name", label: "Name" },
                                            { fieldname: "copi_designation", label: "Designation" },
                                            { fieldname: "copi_email", label: "Email" },
                                        ]}
                                        icon={UsersGroupIcon}
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === "budget" && (
                            <div className="space-y-8">
                                {/* Budget Breakup Table - Custom rendering for dynamic years */}
                                <SectionWrapper title="Proposed Budget Breakup" icon={IndianRupeeIcon}>
                                    <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                                        <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                                            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                                                <tr className="divide-x divide-zinc-200 dark:divide-zinc-800">
                                                    <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100  tracking-wider">
                                                        Account Head
                                                    </th>
                                                    {/* Assuming we can determine max years from the first row or data */}
                                                    {data.proposed_budget_breakup &&
                                                        data.proposed_budget_breakup.length > 0 &&
                                                        (data.proposed_budget_breakup[0].years || []).map(
                                                            (_: any, i: number) => (
                                                                <th
                                                                    key={i}
                                                                    className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100  tracking-wider"
                                                                >
                                                                    Year {i + 1}
                                                                </th>
                                                            )
                                                        )}
                                                    <th className="px-4 py-3 text-left text-sm font-bold text-zinc-900 dark:text-zinc-100  tracking-wider">
                                                        Total
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                                                {(data.proposed_budget_breakup || []).map(
                                                    (row: any, index: number) => {
                                                        const years = row.years || [];
                                                        const rowTotal = years.reduce(
                                                            (sum: number, val: any) => sum + Number(val || 0),
                                                            0
                                                        );
                                                        return (
                                                            <tr
                                                                key={index}
                                                                className="divide-x divide-zinc-200 dark:divide-zinc-800 hover:bg-zinc-50 dark:bg-zinc-800/50"
                                                            >
                                                                <td className="px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 ">
                                                                    {row.account_head}
                                                                </td>
                                                                {years.map((val: any, i: number) => (
                                                                    <td
                                                                        key={i}
                                                                        className="px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 "
                                                                    >
                                                                        {Number(val).toFixed(2)}
                                                                    </td>
                                                                ))}
                                                                <td className="px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200  font-bold">
                                                                    {rowTotal.toFixed(2)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    }
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </SectionWrapper>

                                {data.equipment_checkbox === 1 && (
                                    <TableDisplay
                                        label="Proposed Equipment"
                                        data={data.proposed_equipment_details}
                                        columns={[
                                            { fieldname: "item_name", label: "Equipment Name" },
                                            { fieldname: "equip_unit_cost", label: "Cost (₹)" },
                                        ]}
                                        icon={ShoppingCartIcon}
                                    />
                                )}

                                {data.manpower_checkbox === 1 && (
                                    <TableDisplay
                                        label="Proposed Manpower"
                                        data={data.proposed_manpower_details}
                                        columns={[
                                            { fieldname: "designation_name", label: "Position" },
                                            { fieldname: "manpower_salary", label: "Salary (₹)" },
                                        ]}
                                        icon={UsersIcon}
                                    />
                                )}
                            </div>
                        )}

                        {activeTab === "clearance" && (
                            <div className="space-y-8">
                                <SectionWrapper title="Clearance Details" icon={ShieldIcon}>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2 divide-y md:divide-y-0">
                                        <FieldDisplay
                                            label="Needs Clearance"
                                            value={data.needs_committee_clearance}
                                            icon={ShieldIcon}
                                        />
                                        {data.needs_committee_clearance === "Yes" && (
                                            <>
                                                <FieldDisplay
                                                    label="Committee"
                                                    value={data.committees}
                                                    icon={UsersIcon}
                                                />
                                                {data.committees === "Other" && (
                                                    <FieldDisplay
                                                        label="Other Committee"
                                                        value={data.other_committee_specify}
                                                        icon={UsersIcon}
                                                    />
                                                )}
                                                {data.committees === "Ethics Committee" && (
                                                    <>
                                                        <FieldDisplay
                                                            label="Ethics Details"
                                                            value={data.ethics_committee_details}
                                                            icon={FileTextIcon}
                                                        />
                                                        <FieldDisplay
                                                            label="Other Details"
                                                            value={data.ethics_other_details}
                                                            icon={FileTextIcon}
                                                        />
                                                    </>
                                                )}
                                                {data.committees === "Biosafety Committee" && (
                                                    <FieldDisplay
                                                        label="Biosafety Category"
                                                        value={data.biosafety_category}
                                                        icon={ShieldIcon}
                                                    />
                                                )}
                                            </>
                                        )}
                                    </div>
                                </SectionWrapper>
                                {data.committees === "Biosafety Committee" && (
                                    <HtmlContent
                                        title="Declaration"
                                        htmlString={data.declaration_html}
                                        icon={FileTextIcon}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ProjectProposalDetails;
