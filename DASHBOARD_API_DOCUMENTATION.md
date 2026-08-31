# Dashboard API Documentation

Module: [`rndopsapp/dashboard.py`](../../rndopsapp/dashboard.py)

This file exposes five whitelisted API methods that power the Director, Head-of-Department
(HoD), Principal Investigator (PI) and a generic department dashboard. All of them read from
the real `Project Registration` / `Fund Sanction` / `Department_prornd` / `fundingagency_`
schema — no fabricated doctypes or fields.

> **No artificial limits in the API responses.** List fields such as `recent_projects`,
> `top_funding_agencies`, `top_funded_projects`, `funding_sources`, `project_status_by_year`,
> `pending_approvals`, `recent_submissions`, and `recent_updates` return the **full** dataset —
> there is no `LIMIT`/slice cap in the code. The JSON samples below are shortened to a few
> illustrative rows purely for readability of this document; the live response contains every
> matching row (e.g. `recent_projects` returns all 556 non-draft projects, not just the newest
> 10). The two exceptions are `department_distribution` and `funding_source_breakdown`, which
> intentionally group the long tail into a single `"Other Departments"` / `"Others"` row per
> the original spec — their counts still sum to `total_projects`, so no data is lost, just
> aggregated.

---

## 1. Core Business Rules (single source of truth)

Every endpoint that classifies a project's status uses the same definitions, derived from
`Project Registration`'s actual `docstatus` field and the live `pending_approval_prjReg`
workflow (checked directly against the site's `tabWorkflow Document State` records):

| Bucket | Definition |
|---|---|
| **Draft** | `docstatus = 0`, **or** `docstatus = 1` with `workflow_state` still literally `"Draft"` (a data inconsistency where the document was submitted but its workflow label never advanced). Never counted in any dashboard total. |
| **Needs Correction** | `workflow_state` starting with `"Needs Correction"` (the workflow's `(PE)` / `(IR)` / `(PS)` / `(Head)` variants) — kicked back for revision. Excluded from the Director/HoD aggregate views; surfaced (not dropped) on the PI's own dashboard since the PI needs to act on it. |
| **Rejected / Cancelled** | `docstatus = 2`. Excluded from Director/HoD totals; tracked as its own `rejected_projects` bucket on the PI dashboard instead of being silently dropped. |
| **Ongoing** | Non-draft, non-rejected project with at least one **submitted** (`docstatus = 1`) `Fund Sanction` record whose `project_proposal` link points at it. **Fund Sanction is the only signal used** — the separate `Fund Received` doctype is a later step in the money trail and is deliberately not used to decide status. Multiple Fund Sanction rows (multi-year sanctions, amendments) are deduped via `SELECT DISTINCT project_proposal`, so a project is never double-counted. |
| **Submitted / Pending Sanction** | Every other non-draft, non-rejected, non-"Needs Correction" project — still moving through the approval workflow, or `Approved` but with no Fund Sanction yet. |

This gives the invariant used throughout:

```
total_projects = submitted_projects + ongoing_projects
```

### Key field reference

| Concept | DocType | Field |
|---|---|---|
| Project identifier | `Project Registration` | `name` |
| Project title | `Project Registration` | `project_title` |
| Workflow status | `Project Registration` | `workflow_state` |
| Submission state | `Project Registration` | `docstatus` (0=Draft, 1=Submitted, 2=Rejected) |
| Department | `Project Registration` | `implementation_department` → links to `Department_prornd.name`; display label is `Department_prornd.dept_name` |
| Funding agency | `Project Registration` | `funding_agen` → links to `fundingagency_.name`; display label is `fundingagency_.funding_agency_name` (falls back to the raw `funding_agen` value, then to `"Missing Funding Agency Name"`) |
| Principal Investigator | `Project Registration` | `principal_investigator_name` (display), `pi_webmail` (identity/login) |
| Registration date | `Project Registration` | `creation` |
| Fund Sanction linkage | `Fund Sanction` | `project_proposal` (Link → `Project Registration`), `docstatus = 1` = submitted sanction |
| Sanctioned amount | `Fund Sanction` | `total_sanctioned_amount`, `amount_received`, `have_fund_details` |

---

## 2. How to Call

All methods are Frappe whitelisted endpoints, reachable at:

```
POST/GET {site}/api/method/rndopsapp.dashboard.<method_name>
```

### cURL (session-cookie auth)

```bash
curl "https://<site>/api/method/rndopsapp.dashboard.get_director_dashboard_data" \
  -H "Cookie: sid=<session_id>"
```

### cURL (API key/secret auth)

```bash
curl "https://<site>/api/method/rndopsapp.dashboard.get_head_dashboard_data?user_email=hod@iitg.ac.in&department=Civil%20Engineering" \
  -H "Authorization: token <api_key>:<api_secret>"
```

### From client-side JS (Frappe desk/portal)

```js
frappe.call({
  method: "rndopsapp.dashboard.get_pi_dashboard_data",
  args: { user: "adutta@iitg.ac.in" },
  callback: (r) => console.log(r.message)
});
```

### From the bench console (server-side testing)

```bash
bench --site <site> execute rndopsapp.dashboard.get_director_dashboard_data
```

---

## 3. `get_director_dashboard_data`

**Purpose:** Institute-wide analytics for the Director's dashboard — the canonical
implementation of the Project Status / Top Funding Agencies / Department Distribution /
Funding Source Breakdown spec.

**Auth:** `@frappe.whitelist()` — requires a logged-in session.
**Method:** `GET` / `POST`
**Params:** none

### Request

```bash
curl "https://<site>/api/method/rndopsapp.dashboard.get_director_dashboard_data" \
  -H "Cookie: sid=<session_id>"
```

### Response (a few rows shown per list; live response is unlimited — see note above)

```json
{
  "total_projects": 556,
  "submitted_projects": 188,
  "ongoing_projects": 368,
  "status_breakdown": { "active": 368, "pending_sanction": 188 },
  "project_overview": {
    "total_projects": 556,
    "research_projects": 288,
    "consultancy_projects": 263,
    "submitted_projects": 188,
    "submitted_project_nos": ["2026032601000009", "2026032701SERB000014", "... (all 188)"],
    "ongoing_projects": 368,
    "ongoing_project_nos": ["2026032501000006", "2026032501SERB000007", "... (all 368)"],
    "total_staff_count": 1657
  },
  "top_funding_agencies": [
    { "name": "ANRF - (Anusandhan National Research Foundation)", "count": 91, "percentage": 16 },
    { "name": "SERB", "count": 54, "percentage": 10 },
    { "name": "Missing Funding Agency Name", "count": 42, "percentage": 8 },
    "... (all 182 distinct agencies, no cap)"
  ],
  "funding_source_breakdown": [
    { "name": "ANRF - (Anusandhan National Research Foundation)", "count": 91 },
    { "name": "SERB", "count": 54 },
    { "name": "Missing Funding Agency Name", "count": 42 },
    { "name": "Others", "count": 302 },
    { "name": "DBT - Department of Biotechnology", "count": 23 },
    { "name": "Department Of Science and Technology", "count": 23 },
    { "name": "ISRO", "count": 21 }
  ],
  "department_distribution": [
    { "name": "Civil Engineering", "count": 241 },
    { "name": "Computer Science and Engineering", "count": 37 },
    { "name": "Mechanical Engineering", "count": 32 },
    "... (top 10 individually)",
    { "name": "Other Departments", "count": 84 }
  ],
  "funding_analytics": {
    "total_allocation": 1933046669.6,
    "utilized": 0.0,
    "remaining": 1933046669.6,
    "sanction_by_fy": [
      { "fy": "2026-27", "total_amount": 582104319.6 },
      { "fy": "2025-26", "total_amount": 496896367.0 },
      "... (all fiscal years with a sanction, no cap)"
    ]
  },
  "ipr_analytics": { "total_patents_filed": 0 },
  "international_collaboration": { "active_agencies": 1 },
  "proposal_analytics": { "total_proposals": 0, "proposed_budget_total": 0.0 },
  "project_status_by_year": [
    { "year": "2026", "submitted": 157, "ongoing": 290, "completed": 6 },
    "... (all years present in the data, no cap)"
  ],
  "funding_sources": [
    { "name": "ANRF - (Anusandhan National Research Foundation)", "value": 91 },
    "... (all 180 distinct sources, no cap)"
  ],
  "top_funded_projects": [
    {
      "project_id": "2026042201DIT000378",
      "project_title": "\"SWASTHA Smart Wearable Advanced nanoSensing Technologies in Healthcare ASICs\"",
      "pi_name": "Akshai Shelke",
      "department": "Centre for Nanotechnology",
      "total_budget_amount": 290000000.0
    },
    "... (every project with a budget amount set, no cap)"
  ],
  "recent_projects": [
    {
      "project_id": "2026082401002940",
      "project_title": "Third party quality assurance of project at 'Swagota Square', A.B.C., G.S. Road, Guwahati",
      "project_name": "Third party quality assurance of project at 'Swagota Square', A.B.C., G.S. Road, Guwahati",
      "pi_name": "Laishram Boeing",
      "principal_investigator": "Laishram Boeing",
      "department": "Civil Engineering",
      "creation": "2026-08-24 16:54:04.823967",
      "status": "Submitted",
      "is_new": true
    },
    "... (all 556 non-draft projects, newest first, no cap)"
  ]
}
```

### Field notes

- `top_funding_agencies[].percentage` = `round(count / total_projects * 100)` — a whole
  number, e.g. `16` not `16.37`. The list itself is unlimited (all distinct agencies).
- `funding_source_breakdown` shows the top 7 agencies individually plus a synthetic
  `"Others"` row combining the rest. A real funding agency in the data happens to be
  literally named **"Others"** — its count is merged into the synthetic row rather than
  producing a duplicate key.
- `department_distribution` shows the top 10 departments plus `"Other Departments"`.
  `sum(department_distribution[].count) === total_projects` always.
- `recent_projects` returns every non-draft project, newest first — no `LIMIT`.
  `is_new` is `true` if the project was created in the last 7 days.
- `top_funded_projects` currently has no status filter (`WHERE total_budget_amount IS NOT NULL`
  only) — it can include Draft/Rejected projects and therefore may return more rows than
  `total_projects`. Flagged, not yet changed pending confirmation.
- Verified invariants on live data: `total_projects == submitted_projects + ongoing_projects`,
  `sum(department_distribution) == total_projects`, `sum(funding_source_breakdown) == total_projects`,
  no duplicate names in `funding_source_breakdown`.

---

## 4. `get_head_dashboard_data`

**Purpose:** Department-level analytics for a Head of Department — project overview, PI-wise
breakdown, fund analytics, and proposal stats, scoped to one department.

**Auth:** `@frappe.whitelist(allow_guest=True)`
**Method:** `GET` / `POST`

| Param | Type | Required | Description |
|---|---|---|---|
| `user_email` | string | yes | Email of the requesting user (used to resolve `user_data` and, as a fallback, the department). |
| `department` | string | yes | Either the `Department_prornd.dept_name` label or its `name` (ID). Resolved against both. |

### Request

```bash
curl "https://<site>/api/method/rndopsapp.dashboard.get_head_dashboard_data?user_email=okramjimmy@gmail.com&department=Civil%20Engineering"
```

### Response (one PI, one project shown; live response includes every PI and every one of their projects)

```json
{
  "department": { "id": "otho2cn3vc", "name": "Civil Engineering" },
  "user_data": { "full_name": "Okram RAJ", "roles": ["project staff"] },
  "project_overview": {
    "total_projects": 241,
    "submitted_projects": 65,
    "ongoing_projects": 170,
    "completed_projects": 6,
    "research_projects": 26,
    "consultancy_projects": 215,
    "total_staff": 6
  },
  "pi_wise_projects": [
    {
      "pi_email": "adutta@iitg.ac.in",
      "pi_name": "Anjan Dutta",
      "project_count": 59,
      "projects": [
        {
          "project_id": "2026082401002928",
          "project_title": "Proof Check of Pump House Building at T6P1",
          "project_type": "Consultancy",
          "status": "submitted",
          "prj_start_date": null,
          "prj_end_date": null,
          "creation": "2026-08-24 15:19:33.389640"
        },
        "... (all 59 of this PI's projects)"
      ]
    },
    "... (all 32 PIs in the department, each with their full project list — no cap)"
  ],
  "fund_analytics": {
    "total_allocation": 268206370.4,
    "utilized_amount": 0.0,
    "available_funds": 268206370.4,
    "utilization_rate": 0.0
  },
  "proposal_analytics": {
    "total_proposals": 0,
    "draft_proposals": 0,
    "submitted_proposals": 0,
    "cancelled_proposals": 0,
    "pending_hod_approval": 0,
    "proposed_budget_total": 0
  }
}
```

### Field notes

- `project_overview.status` per project comes from a 3-way `CASE`: **completed** (past
  `prj_end_date`) takes priority over **ongoing** (has a submitted Fund Sanction), which
  takes priority over **submitted** (everything else). So here:
  `total_projects = submitted_projects + ongoing_projects + completed_projects`.
- Ongoing is decided by Fund Sanction alone — the earlier version of this endpoint also
  checked the `Fund Received` doctype, which has been removed for consistency with the
  Director Dashboard's single source of truth.
- `pi_wise_projects` is sorted by project count descending, and every PI/project is
  included — no `LIMIT`.
- `_debug_departments` (all `Department_prornd` rows, for verifying the resolved `department`
  id) is also returned by the live endpoint but omitted here for brevity.

---

## 5. `get_pi_dashboard_data`

**Purpose:** A Principal Investigator's own dashboard — their project mix, financial
summary, and recent activity.

**Auth:** `@frappe.whitelist()` — requires login. Returns `{}` for a Guest session.
**Method:** `GET` / `POST`

| Param | Type | Required | Description |
|---|---|---|---|
| `user` | string | no | PI's email (`pi_webmail`). Defaults to `frappe.session.user` if omitted. |

### Request

```bash
curl "https://<site>/api/method/rndopsapp.dashboard.get_pi_dashboard_data?user=adutta@iitg.ac.in" \
  -H "Cookie: sid=<session_id>"
```

### Response (real data — this endpoint's payload is already small)

```json
{
  "project_overview": {
    "total_projects": 59,
    "draft_projects": 0,
    "rejected_projects": 0,
    "ongoing_projects": 52,
    "completion_rate": 88,
    "pending_review": 7,
    "active_staff": 0
  },
  "financial_summary": {
    "total_allocation": 15272740.4,
    "utilized": 0.0,
    "available": 15272740.4,
    "pending_requests": 0.0,
    "financial_year": "2023-24",
    "utilization_rate": 0
  },
  "recent_updates": [
    { "title": "Anjan Dutta logged in", "meta": "2026-08-24", "type": "system" },
    "... (every Activity Log entry for this user, no cap — can be a long list)"
  ]
}
```

### Field notes

- `project_overview.ongoing_projects` is now genuinely Fund-Sanction-based (a prior bug
  labeled `Approved` projects as `pending_review` and everything else as `ongoing_projects`,
  never checking Fund Sanction at all — that has been fixed).
- `pending_review` includes projects still moving through the workflow, `Approved` projects
  awaiting sanction, **and** "Needs Correction" projects — unlike the Director/HoD views,
  a PI needs to see and act on their own "Needs Correction" items rather than have them
  disappear.
- `rejected_projects` is a new field — previously Rejected projects were silently dropped
  from every count.
- Invariant: `total_projects = draft_projects + rejected_projects + ongoing_projects + pending_review`.
- `completion_rate = round(ongoing_projects / total_projects * 100)`.
- `financial_summary.pending_requests` sums `docstatus=0` amounts owned by this user across
  `Reimbursement`, `Temporary Advance`, `Direct Purchase` (whichever of those doctypes exist
  and expose an amount field).
- `recent_updates` is unlimited — every `Activity Log` row for the user, no `LIMIT 3` cap.

---

## 6. `get_dashboard_data`

**Purpose:** Generic `(user_email, department)` dashboard — legacy response shape, now
rebuilt on real data.

> **History:** the original implementation queried `Approval Request` and `Department Budget`
> — neither DocType exists anywhere in this codebase — plus the generic core `Project`
> doctype (unused; this app models R&D projects as `Project Registration`). It crashed on
> every call and had no callers anywhere in the app. It has been rebuilt on top of
> [`get_head_dashboard_data`](#4-get_head_dashboard_data), which already implements this
> exact `(user_email, department)` contract against the real schema — so this endpoint now
> returns real, live data in the old shape instead of throwing, with no duplicate queries.

**Auth:** `@frappe.whitelist(allow_guest=True)`
**Method:** `GET` / `POST`

| Param | Type | Required | Description |
|---|---|---|---|
| `user_email` | string | yes | User's email. |
| `department` | string | yes | Department label or ID (same resolution as `get_head_dashboard_data`). |

### Request

```bash
curl "https://<site>/api/method/rndopsapp.dashboard.get_dashboard_data?user_email=adutta@iitg.ac.in&department=Civil%20Engineering"
```

### Response (a few rows shown; live response is unlimited)

```json
{
  "user_data": { "full_name": "Anjan Dutta", "roles": ["Permanent Employee", "All_ProRnd_User"] },
  "pending_approvals": [
    {
      "title": "Proof Check of Pump House Building at T6P1",
      "description": "Proof Check of Pump House Building at T6P1",
      "request_type": "Consultancy",
      "creation": "2026-08-24 15:19:33.389640"
    },
    "... (all 65 submitted projects in the department, no cap)"
  ],
  "recent_submissions": [
    {
      "title": "Proof Check of Pump House Building at T6P1",
      "request_type": "Consultancy",
      "status": "Pending Head Approval",
      "creation": "2026-08-24 15:19:33.389640"
    },
    "... (all 59 of this user's submissions, no cap)"
  ],
  "department_projects": [
    {
      "project_name": "Proof Check of Pump House Building at T6P1",
      "status": "submitted",
      "principal_investigator": "Anjan Dutta",
      "start_date": null,
      "end_date": null,
      "completion_date": null
    },
    "... (all 241 department projects)"
  ],
  "project_analytics": {
    "total_projects": 241,
    "active_pis": 32,
    "completed_this_year": 6
  },
  "fund_analytics": {
    "total_allocation": 268206370.4,
    "utilized_amount": 0.0,
    "available_funds": 268206370.4,
    "utilization_rate": 0.0
  }
}
```

### Field notes

- `pending_approvals` = this department's projects still in the `submitted` bucket (all of
  them, flattened from `get_head_dashboard_data`'s `pi_wise_projects`, so no extra query is
  issued).
- `recent_submissions` = this specific user's own `Project Registration` rows in the
  department, most recent first, with the real `workflow_state` as `status`.
- `project_analytics.active_pis` = distinct PIs with at least one project in the department
  (derived, not a separate query).
- `fund_analytics` is identical to `get_head_dashboard_data`'s `fund_analytics` for the
  same department.
- The legacy `pending_requests_amount` field (previously sourced from the nonexistent
  `Department Budget` doctype) has been dropped rather than fabricated — there is no real
  department-level "pending requests" figure in the current schema.

---

## 7. `get_role_based_project_counts`

**Purpose:** Per-user project counts, grouped by role (Independent Researcher, Inspired
Faculty, Principal Investigator, Permanent Employee), department, and employee class.

**Auth:** `@frappe.whitelist(allow_guest=True)`
**Method:** `GET` / `POST`
**Params:** none

### Request

```bash
curl "https://<site>/api/method/rndopsapp.dashboard.get_role_based_project_counts"
```

### Response (a few rows shown; live response has 283 rows, no cap)

```json
[
  {
    "user_email": "adutta@iitg.ac.in",
    "user_name": "Anjan Dutta",
    "role": "P - Permanent Employee",
    "implementation_department": "Civil Engineering",
    "user_department": "Civil Engineering",
    "project_count": 57
  },
  {
    "user_email": "amitsh@iitg.ac.in",
    "user_name": "Amit Balasaheb",
    "role": "P - Permanent Employee",
    "implementation_department": "Civil Engineering",
    "user_department": "Civil Engineering",
    "project_count": 33
  }
]
```

### Field notes

- Filters on `applicant_type IN ('6i6gphpk2s', '6mcdqaqti2', '7orhr5qb5t', '5r4emiig95')`
  (the doctype IDs for IR / IF / PI / Permanent Employee `EmployeeClass_prornd` records)
  and `docstatus < 2` — **this intentionally includes Draft projects** (`docstatus = 0`),
  unlike every other endpoint in this module. This is a deliberate difference: it's a
  workload/role census (how many projects has this person registered, including
  in-progress drafts), not a project-status report, so it was left as-is rather than
  folded into the Draft-exclusion rule used elsewhere.
- Sorted by `role ASC, project_count DESC`. Returns every matching row, no `LIMIT`.

---

## 8. Change Log

| Change | Endpoint(s) |
|---|---|
| Fixed a name collision where a real funding agency literally named `"Others"` produced a duplicate row alongside the synthetic "remaining agencies" bucket | `get_director_dashboard_data` |
| Changed `top_funding_agencies[].percentage` from a 2-decimal float to a rounded integer | `get_director_dashboard_data` |
| Excluded `docstatus=1` records mislabeled `workflow_state="Draft"` and any `"Needs Correction (*)"` state from all project-status counts | `get_director_dashboard_data`, `get_head_dashboard_data` |
| Removed the `Fund Received` OR-condition from the Ongoing determination — Fund Sanction is now the sole signal, matching the Director Dashboard | `get_head_dashboard_data` |
| Fixed an inverted status-classification bug (`Approved` projects were labeled `pending_review`; everything else `docstatus=1` was labeled `ongoing_projects` without ever checking Fund Sanction) | `get_pi_dashboard_data` |
| Added a `rejected_projects` bucket instead of silently dropping Rejected (`docstatus=2`) projects from every count | `get_pi_dashboard_data` |
| Rebuilt on real data — previously referenced `Approval Request` and `Department Budget` DocTypes that don't exist anywhere in the codebase, and crashed on every call | `get_dashboard_data` |
| Fixed `frappe.utils.get_year_end` (doesn't exist) → `frappe.utils.get_year_ending` (the real function) | `get_dashboard_data` |
| Escaped a raw `%` inside a `LIKE 'Needs Correction%'` pattern to `%%`, since `frappe.db.sql()` performs Python `%`-style parameter substitution and a bare `%` collides with it when the query also takes `%s` params | `get_director_dashboard_data`, `get_head_dashboard_data` |
| Removed every artificial `LIMIT`/slice cap (`top_funding_agencies`, `recent_projects`, `top_funded_projects`, `funding_sources`, `project_status_by_year`, `sanction_by_fy`, `pending_approvals`, `recent_submissions`, `recent_updates`) — all now return the full dataset. `department_distribution` and `funding_source_breakdown` keep their intentional top-N + catch-all grouping since that's part of the original spec and their sums still equal `total_projects` | `get_director_dashboard_data`, `get_dashboard_data`, `get_pi_dashboard_data` |
