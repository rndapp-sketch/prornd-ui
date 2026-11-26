import type { FormField } from "@/components/forms/DynamicFormRenderer";

/**
 * Short helper text shown under each Travel field (the form renderer prints `description` under a field).
 * Matched on the field's label, ignoring case, "*", "?" and apostrophes; a description the backend already
 * defines is never replaced.
 */
const norm = (s: string) => s.toLowerCase().replace(/[*?'’]/g, "").replace(/\s+/g, " ").trim();

const HINTS: Record<string, string> = {
    // Who and which project
    "applying for self or other": "Choose Self if you are travelling, or Other if you are applying for someone else.",
    "is this travel charged to another pis project": "Select Yes if another PI's project will pay; that PI picks the project and account head when approving.",
    "project title": "The project that pays for this travel.",
    "project number": "Filled in from the project you selected.",
    // Journey
    "type of visit": "Whether the visit is within India or abroad.",
    "nature of travel": "The kind of event, such as a conference, workshop, training or meeting.",
    "venue address of visit": "The place where the event is held.",
    "venue / address of visit": "The place where the event is held.",
    "organizing authority": "The institute or body that is organising the event.",
    "purpose of visit": "Why you are travelling, in a few words.",
    // Period
    "from date": "First day of the journey.",
    "to date": "Last day of the journey.",
    // Assistance
    "do you require financial assistance": "Select Yes if the Institute should pay for any part of this travel.",
    "do you need advance": "Select Yes to ask for an advance before you travel. A separate Advance Request form is needed.",
    "account head": "The budget head these expenses are charged to.",
    // Bank
    "bank account holders name": "Name exactly as it appears on the bank account.",
    "bank account number": "Account number the advance or reimbursement is paid into.",
    "ifsc code": "11-character branch code, for example SBIN0001234.",
    "mode of travel": "How you will travel, such as train, bus or flight.",
    // Estimate
    "travel estimate": "Expected cost of tickets and local travel, in rupees.",
    "registration fee": "Event or conference registration fee, in rupees.",
    "accommodation + food": "Expected stay and meals, in rupees.",
    "any other": "Any other expected cost, in rupees.",
    "total estimate": "Sum of all the estimates above; filled in automatically.",
    // Attachments
    "travel attachment": "Ticket, fare quotation or itinerary.",
    "registration attachment": "Registration receipt or invitation showing the fee.",
    "accommodation attachment": "Booking confirmation or quotation for the stay.",
    // Station leave
    "station leave required": "Select Yes if you will be away from the station and need leave.",
    "station leave from date": "First day of the station leave.",
    "station leave to date": "Last day of the station leave.",
    "station leave from session": "Forenoon or afternoon on the first day.",
    "station leave to session": "Forenoon or afternoon on the last day.",
    // Remarks
    "additional remarks if any": "Anything else the approvers should know.",
    "upload any supporting documents": "Invitation letter, programme or any other supporting file.",
};

// Section headings (Section Break fields) get a one-line description too
const SECTION_HINTS: Record<string, string> = {
    "apply for travel": "Who is travelling and which project pays for it.",
    "details of the journey": "Where you are going, why, and for how long.",
    "travel period": "The dates of your journey.",
    "assitance details": "Whether you need financial help or an advance.",
    "assistance details": "Whether you need financial help or an advance.",
    "account head details": "Which budget head the expenses are booked against.",
    "estimate of financial assistance": "Expected costs, with supporting files.",
    "station leave details": "Leave needed for the days you are away.",
};

export function withTravelHints(fields: FormField[]): FormField[] {
    return fields.map((f) => {
        if (f.description || !f.label) return f;
        const key = norm(f.label);
        const hint = f.fieldtype === "Section Break" ? SECTION_HINTS[key] : HINTS[key];
        return hint ? { ...f, description: hint } : f;
    });
}
