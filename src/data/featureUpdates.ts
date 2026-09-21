export type FeatureStatus = "live" | "frontend-only" | "in-progress";

/** Colour of the entry's dot and accent bar on the timeline. Falls back to the status colour. */
export type FeatureAccent =
    | "indigo"
    | "violet"
    | "fuchsia"
    | "pink"
    | "rose"
    | "orange"
    | "amber"
    | "lime"
    | "emerald"
    | "teal"
    | "cyan"
    | "sky";

export interface FeatureUpdate {
    id: string;
    title: string;
    /** YYYY-MM-DD */
    date: string;
    /** HH:mm, 24-hour, IST. Optional: shown only when the time is known. */
    time?: string;
    status: FeatureStatus;
    accent?: FeatureAccent;
    tags: string[];
    summary: string;
    highlights: string[];
    note?: string;
}

export const featureUpdates: FeatureUpdate[] = [
    {
        id: "employee-id-card",
        title: "Employee ID Card",
        date: "2026-09-21",
        time: "10:38",
        status: "live",
        accent: "indigo",
        tags: ["ID Card", "Project Staff", "HR"],
        summary: "Project staff can request their Employee ID Card in the portal, and HR can verify it and produce the printable card.",
        highlights: [
            "Request your ID card from your dashboard, with your details pre-filled from your staff record",
            "Pick your Designation and Department from searchable lists",
            "HR verifies the request or sends it back with a comment, and you are alerted when it is returned, verified or generated",
            "HR generates the front-and-back card as PNG, PDF or a ZIP download",
        ],
    },
    {
        id: "secure-attachments",
        title: "Secure Attachment Access",
        date: "2026-09-21",
        time: "09:03",
        status: "live",
        accent: "teal",
        tags: ["Attachments", "Security"],
        summary: "Uploaded files now open through the portal instead of directly from file storage.",
        highlights: [
            "You need to be logged in to open an attachment",
            "Access follows the permissions of the document the file belongs to",
            "PDFs and images open in the browser; other file types download",
        ],
    },
    {
        id: "selection-committee-report",
        title: "Selection Committee Report",
        date: "2026-09-21",
        time: "11:10",
        status: "live",
        accent: "violet",
        tags: ["Selection Committee", "Print"],
        summary: "The report page is tidier and its printout is more reliable.",
        highlights: [
            "Download PDF is laid out so the sidebar and header no longer affect the printed pages",
            "Only one Activity Log button now, instead of two overlapping ones",
            "A comment is required for every action: Submit, Approve, Reject, Recommend and Send for Director Approval",
        ],
    },
    {
        id: "overhead-funds",
        title: "Personal & Departmental Development Funds",
        date: "2026-09-20",
        time: "19:22",
        status: "live",
        accent: "orange",
        tags: ["Projects", "Funds", "Overhead"],
        summary: "Overhead funds now appear as projects, so they can be spent from and approved like any other project.",
        highlights: [
            "Faculty see their Personal Development Fund and department heads see their Departmental Development Fund, under a new Overhead tab",
            "Applications such as Travel, Reimbursement, Indent and Direct Purchase can be raised against them, with the account head fixed to Overhead",
            "Balance, ledger and payments come from the accounts service; there are no sanction, loan or fund-received steps for these funds",
            "R&D approvers get an Overhead tab in Pending Task and Task Registry",
        ],
    },
    {
        id: "tada-advance-taken",
        title: "TA/DA Settlement: Advance Taken",
        date: "2026-09-20",
        time: "19:22",
        status: "live",
        accent: "sky",
        tags: ["Travel", "TA/DA"],
        summary: "A settlement no longer shows an advance you never took.",
        highlights: [
            "Advance Taken is now 0 unless the Travel application asked for an advance",
            "Previously the trip estimate could be filled in even when no advance was requested, making it look like you owed money back",
        ],
    },
    {
        id: "deposit-slips-fund-received",
        title: "Deposit Slips & Fund Received",
        date: "2026-09-18",
        time: "12:57",
        status: "live",
        accent: "emerald",
        tags: ["Deposit Slip", "Fund Received"],
        summary: "Deposit slips match the physical slip more closely, and Fund Received is easier to work with.",
        highlights: [
            "D Consultancy deposit slips now have IT TDS, GST TDS, Amount Actually Received and Other Deductions fields, and paise are no longer lost to rounding",
            "HoS can edit every line item on a deposit slip",
            "Research Consultancy and D Consultancy deposit slips no longer auto-calculate amounts (D Consultancy keeps two derived totals)",
            "Fund Received shows the real validation error, has a searchable Project Number in Additional Credits, and finds deposit slips with a damaged reference",
        ],
    },
    {
        id: "comments-activity-log",
        title: "Required Comments & Activity Log",
        date: "2026-09-16",
        time: "17:01",
        status: "live",
        accent: "pink",
        tags: ["Workflow", "Comments", "Activity Log"],
        summary: "Comments on workflow actions are now saved consistently and shown in the Activity Log.",
        highlights: [
            "Every action popup (submit, approve, reject, forward, put back) requires a comment before you can confirm",
            "Comments appear as normal comments in the Activity Log, not mixed into workflow updates",
            "The Activity Log has a Comments / All filter, with Comments shown first",
            "A floating Activity Log button is now on Project Staff Resignation, Project Staff Joining and Fund Received",
            "Project Staff Resignation actions no longer fail when a comment is sent",
        ],
    },
    {
        id: "pending-task-task-registry",
        title: "Pending Task & Task Registry",
        date: "2026-09-16",
        time: "00:35",
        status: "live",
        accent: "cyan",
        tags: ["Pending Task", "Task Registry"],
        summary: "Both pages load faster and are easier to navigate.",
        highlights: [
            "Tasks are sorted into Research, Consultancy and Others by the server, so the pages load faster",
            "A new module filter shows how many tasks each module has",
            "Task Registry keeps your tab, filters and search in the address, so going back keeps your place",
            "Top Up Fellowship can be printed from Task Registry using the real print format",
        ],
    },
    {
        id: "salary-module",
        title: "Salary Module Updates",
        date: "2026-09-11",
        time: "10:57",
        status: "live",
        accent: "amber",
        tags: ["Salary", "Payroll"],
        summary: "More control over payroll, and fewer ways to pay the wrong person.",
        highlights: [
            "Basic salary is editable, and the change flows through pro-rata basic, P-Tax, gross and net pay, exports and the payslip",
            "Research and Consultancy payrolls are separate tabs, so the payment register can no longer mix the two",
            "Tenure gaps and months worked are shown, and the BMR confirmation uses gross pay",
            "IFSC code and scheme number are in the exports, and a project number is highlighted once its salary is marked Paid",
            "The Processed tab keeps every detail captured at commit time, and P-Tax slabs now match the Assam rates",
        ],
    },
    {
        id: "leave-balance-for-approvers",
        title: "Leave Module: Applicant's Leave Balance",
        date: "2026-09-11",
        time: "13:14",
        status: "live",
        accent: "rose",
        tags: ["Leave", "Approvals"],
        summary: "Approvers can see the applicant's leave balance before deciding.",
        highlights: [
            "Every approver in the Leave Module chain sees the balance before, the leave applied and the balance after",
            "Project Staff Resignation cards in Pending Applications now open the resignation form",
        ],
    },
    {
        id: "printable-forms",
        title: "Printable Forms",
        date: "2026-08-30",
        time: "14:10",
        status: "live",
        accent: "fuchsia",
        tags: ["Print", "PDF"],
        summary: "More forms can be printed or saved as a PDF.",
        highlights: [
            "Loan Request, Top-Up Fellowship, Recruitment Adhoc Contractual and Advance Settlement now have print and PDF options",
        ],
    },
    {
        id: "student-profile",
        title: "Student Profile & Add Student",
        date: "2026-08-28",
        status: "live",
        accent: "lime",
        tags: ["Student", "Profile"],
        summary: "Students now have their own profile in the portal.",
        highlights: [
            "PIs can add a student to their project",
            "Students fill in their own profile details",
            "Students see their profile information on their Profile page",
            "Students can now apply for applications under their assigned project",
        ],
    },
    {
        id: "other-pi",
        title: "Other-PI",
        date: "2026-08-27",
        time: "14:15",
        status: "live",
        accent: "violet",
        tags: ["Other-PI"],
        summary: "Requests can be sent to another PI for approval instead of your own.",
        highlights: [
            "Works across Travel, Reimbursement, Indent Forms and Direct Purchase",
            "Easier search when picking the other PI",
            "The other PI can approve a request directly against one of their own projects",
            "Direct Purchase is now included in this flow",
        ],
    },
    {
        id: "cancellation-status",
        title: "Cancellation Status & Requests Tracking",
        date: "2026-08-21",
        status: "live",
        accent: "rose",
        tags: ["Cancellation", "Workflow"],
        summary: "See exactly where your cancellation requests stand, at every step.",
        highlights: [
            "Clear status: requested, cancelled, or rejected",
            "A dedicated tab listing all the cancellation requests you've raised",
            "See who a request is with, and why it was accepted or rejected",
        ],
    },
    {
        id: "track-application",
        title: "Track Application",
        date: "2026-08-27",
        time: "09:48",
        status: "live",
        accent: "indigo",
        tags: ["Applications", "Search"],
        summary: "Look up any application and see exactly where it stands.",
        highlights: [
            "Search for any application and check its current status",
            "See who it's currently pending with",
            "View its full history in one place",
        ],
    },
];
