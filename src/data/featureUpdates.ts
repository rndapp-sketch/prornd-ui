export type FeatureStatus = "live" | "frontend-only" | "in-progress";

export interface FeatureUpdate {
    id: string;
    title: string;
    date: string;
    status: FeatureStatus;
    tags: string[];
    summary: string;
    highlights: string[];
    note?: string;
}

export const featureUpdates: FeatureUpdate[] = [
    {
        id: "student-profile",
        title: "Student Profile & Add Student",
        date: "2026-08-28",
        status: "live",
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
        status: "live",
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
        status: "live",
        tags: ["Applications", "Search"],
        summary: "Look up any application and see exactly where it stands.",
        highlights: [
            "Search for any application and check its current status",
            "See who it's currently pending with",
            "View its full history in one place",
        ],
    },
];
