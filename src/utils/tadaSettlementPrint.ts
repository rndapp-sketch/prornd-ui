import tadaTemplate from "@/pages/printformat/ta_da_settlement_format.html?raw";

const fmtDate = (val: any): string => {
    if (!val) return "-";
    try {
        return new Date(val).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    } catch {
        return String(val);
    }
};

const fmtAmount = (val: any): string => {
    const n = Number(val) || 0;
    return `₹ ${n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
};

const esc = (val: any): string => {
    if (val === null || val === undefined || val === "") return "-";
    return String(val);
};

const yesNo = (val: any): string => (val ? "Yes" : "No");

function buildExpenseRowsHtml(rows: Array<Record<string, any>>): string {
    const filtered = (rows || []).filter(
        (r) => r.ta_da_expense_type_other_expense || r.ta_da_amount_other_expense,
    );

    if (!filtered.length) {
        return `<tr><td colspan="2" style="text-align:center;color:#888;">No other expenses recorded.</td></tr>`;
    }

    return filtered
        .map(
            (r) => `<tr>
                <td>${esc(r.ta_da_expense_type_other_expense)}</td>
                <td style="text-align:right;">${fmtAmount(r.ta_da_amount_other_expense)}</td>
            </tr>`,
        )
        .join("");
}

// conveyance_time is a Frappe Time field, stored as "HH:MM:SS" — trim the
// seconds for display.
const fmtTime = (val: any): string => {
    if (!val) return "-";
    const str = String(val);
    const match = str.match(/^(\d{1,2}):(\d{2})/);
    return match ? `${match[1]}:${match[2]}` : str;
};

const modeOfJourneyLabel = (row: Record<string, any>): string =>
    row.mode_of_journey === "Other" && row.mode_of_journey_other
        ? row.mode_of_journey_other
        : esc(row.mode_of_journey);

/**
 * "Particulars of Journey Used (from Station to Station)" — only printed when
 * the applicant marked it required and there's at least one row to show.
 */
function buildJourneyTableSection(
    journeyRequired: string,
    rows: Array<Record<string, any>>,
): string {
    if (journeyRequired !== "Yes") return "";
    const filtered = (rows || []).filter(
        (r) => r.departure_station || r.arrival_station || r.fare,
    );
    if (!filtered.length) return "";

    const body = filtered
        .map(
            (r) => `<tr>
                <td>${esc(r.departure_station)}</td>
                <td>${fmtDate(r.departure_date)}</td>
                <td>${esc(r.arrival_station)}</td>
                <td>${fmtDate(r.arrival_date)}</td>
                <td>${modeOfJourneyLabel(r)}</td>
                <td style="text-align:right;">${fmtAmount(r.fare)}</td>
                <td>${esc(r.ticket_pnr_no)}</td>
            </tr>`,
        )
        .join("");

    return `
    <div class="section-title">Particulars of Journey Used (from Station to Station)</div>
    <table class="expenses-table">
        <thead>
            <tr>
                <th>Departure Station</th>
                <th>Departure Date</th>
                <th>Arrival Station</th>
                <th>Arrival Date</th>
                <th>Mode of Journey</th>
                <th style="text-align:right;">Fare (INR)</th>
                <th>Ticket/PNR No.</th>
            </tr>
        </thead>
        <tbody>${body}</tbody>
    </table>`;
}

/**
 * "Particulars of Local Conveyance Used" — only printed when the applicant
 * marked it required and there's at least one row to show.
 */
function buildConveyanceTableSection(
    conveyanceRequired: string,
    rows: Array<Record<string, any>>,
): string {
    if (conveyanceRequired !== "Yes") return "";
    const filtered = (rows || []).filter(
        (r) => r.from_location || r.to_location || r.fare,
    );
    if (!filtered.length) return "";

    const body = filtered
        .map(
            (r) => `<tr>
                <td>${fmtDate(r.conveyance_date)}</td>
                <td>${fmtTime(r.conveyance_time)}</td>
                <td>${esc(r.from_location)}</td>
                <td>${esc(r.to_location)}</td>
                <td style="text-align:right;">${esc(r.distance_traveled_km)}</td>
                <td>${modeOfJourneyLabel(r)}</td>
                <td style="text-align:right;">${fmtAmount(r.fare)}</td>
            </tr>`,
        )
        .join("");

    return `
    <div class="section-title">Particulars of Local Conveyance Used</div>
    <table class="expenses-table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Time</th>
                <th>From</th>
                <th>To</th>
                <th style="text-align:right;">Distance (Kms)</th>
                <th>Mode of Journey</th>
                <th style="text-align:right;">Fare (INR)</th>
            </tr>
        </thead>
        <tbody>${body}</tbody>
    </table>`;
}

/**
 * "For Office Use" — staff, RnD's processed figures. Hidden on the on-screen
 * form for the applicant (unchanged — see ta-da-settlement-office-use-implementation.md),
 * and always included in the printed copy as blank cells — same as every
 * other section on this print (Amount Summary, Bank Details, etc.) is
 * always shown — but these figures are filled in by hand with a pen, so no
 * prefilled/computed value is ever printed here, even if one exists in the data.
 */
function buildOfficeUseSection(): string {
    return `
    <div class="section-title">For Office Use</div>
    <table class="info-table">
        <tr>
            <td class="label">Railways/Air/Steamer/Bus Fare</td>
            <td>&nbsp;</td>
            <td class="label">Road Mileage</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td class="label">Local Conveyance</td>
            <td>&nbsp;</td>
            <td class="label">Food Charges</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td class="label">Accommodation Charges</td>
            <td>&nbsp;</td>
            <td class="label">Registration Fee &amp; Other</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td class="label">Total Admissible Amount</td>
            <td colspan="3">&nbsp;</td>
        </tr>
        <tr>
            <td class="label">Less: Advance Paid to Applicant</td>
            <td colspan="3">&nbsp;</td>
        </tr>
        <tr>
            <td class="label">Net Amount</td>
            <td colspan="3">&nbsp;</td>
        </tr>
    </table>`;
}

/**
 * Builds the printable HTML for a TA/DA Settlement (applicant-facing copy).
 * Mirrors the letterhead layout used by the other *Print.ts generators in this
 * codebase (e.g. temporaryAdvancePrint.ts) for a consistent look across modules.
 */
export function generateTadaSettlementHtml(
    data: Record<string, any>,
    resolvedAccountHead = "",
    activityLogHtml = "",
): string {
    const html = tadaTemplate
        // Function replacer — raw HTML fetched from elsewhere (activity log
        // comments) and may contain "$" characters, which String.replace would
        // otherwise interpret as a pattern token.
        .replace("{{ACTIVITY_LOG_SECTION}}", () => activityLogHtml || "")
        .replace("{{DOC_REF}}", esc(data.name))
        .replace("{{DATE}}", fmtDate(data.creation))
        .replace("{{WORKFLOW_STATE}}", esc(data.workflow_state || "Draft"))
        .replace("{{APPLICANT_NAME}}", esc(data.ta_da_name))
        .replace("{{APPLICANT_WEBMAIL}}", esc(data.webmail_id))
        .replace("{{APPLICANT_DEPARTMENT}}", esc(data.ta_da_department_section))
        .replace("{{APPLICANT_DESIGNATION}}", esc(data.ta_da_designation))
        .replace("{{EMPLOYEE_NUMBER}}", esc(data.ta_da_employee_number))
        .replace("{{PROJECT_NUMBER}}", esc(data.project_no))
        .replace("{{CONTACT}}", esc(data.ta_da_contact))
        .replace("{{TRAVEL_APPLICATION}}", esc(data.ta_da_travel_application))
        .replace("{{ACCOUNT_HEAD}}", esc(resolvedAccountHead || data.ta_da_account_head))
        .replace("{{PURPOSE_OF_JOURNEY}}", esc(data.ta_da_purpose_of_journey))
        .replace("{{JOURNEY_PARTICULARS}}", esc(data.ta_da_journey_particulars))
        .replace("{{LOCAL_CONVEYANCE_USED}}", esc(data.ta_da_local_conveyance_used))
        .replace(
            "{{JOURNEY_TABLE_SECTION}}",
            buildJourneyTableSection(data.ta_da_journey_particulars, data.ta_da_journey_particulars_table),
        )
        .replace(
            "{{CONVEYANCE_TABLE_SECTION}}",
            buildConveyanceTableSection(data.ta_da_local_conveyance_used, data.ta_da_local_conveyance_table),
        )
        .replace("{{EXPENSE_ROWS}}", buildExpenseRowsHtml(data.ta_da_other_expenses_p))
        .replace("{{TOTAL_CLAIMED}}", fmtAmount(data.ta_da_total_claimed))
        .replace("{{ADVANCE_TAKEN}}", fmtAmount(data.ta_da_advance_taken))
        .replace("{{NET_CLAIMED}}", fmtAmount(data.ta_da_net_claimed))
        .replace("{{OFFICE_USE_SECTION}}", buildOfficeUseSection())
        .replace("{{BANK_ACCOUNT_HOLDER}}", esc(data.ta_da_bank_account_holder))
        .replace("{{BANK_ACCOUNT_NUMBER}}", esc(data.ta_da_bank_account_number))
        .replace("{{IFSC_CODE}}", esc(data.ta_da_ifsc_code))
        .replace("{{ADDITIONAL_COMMENT}}", esc(data.ta_da_additional_comment))
        .replace("{{DECL_DISTANCES}}", yesNo(data.ta_da_check))
        .replace("{{DECL_ENTITLED_CLASS}}", yesNo(data.ta_da_entitled_class))
        .replace("{{DECL_SHORTEST_ROUTE}}", yesNo(data.ta_da_shortest_route))
        .replace("{{DECL_NOT_PAID_ELSEWHERE}}", yesNo(data.ta_da_not_paid_elsewhere))
        .replace("{{FREE_TRANSPORT}}", esc(data.ta_da_free_transport))
        .replace("{{BOARDING_LODGING_STATUS}}", esc(data.boarding_and_lodging_status));

    return html;
}
