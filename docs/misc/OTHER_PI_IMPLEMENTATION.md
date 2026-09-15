# "Other PI" (Project of Another PI) — Implementation

Last updated: 2026-08-13

Covers both repositories:

- **Backend** — `rndapp-sketch/rndopsapp`, branch `Sumits-Changes`
  (`9faa04e`, `868a536`)
- **Frontend** — `rndapp-sketch/prornd-ui`, branch `other-pi-v0.7`
  (`29a3d4e`, `e8d86d3`, `59bb840`), based on live `mythos_fable_v0.7` (`3d7a1f8`)

---

## 1. The concept

Taken from the ProMAn module documentation (`Travel_Faculty_Leave_Module.pdf`,
`Purchase_General_Indent_Module.pdf`, `Purchase_Indent_Cum_Sanction_Sheet.pdf`,
`Rate_Contract_Purchase.pdf`, `Reimbursement_Module.pdf`), where the flow is
called **"Project of other PI"**.

An applicant raises a form but the money comes from a project owned by a
**different PI**. Therefore:

1. The applicant **does not** choose the project or account head — they cannot,
   it is not their project.
2. The applicant only flags *"charged to another PI's project"* and **names that PI**.
3. The form is routed to that PI **first**, ahead of the normal chain.
4. That PI selects **one of their own projects + its account head**, then
   **Forwards** (or **Puts Back** / **Rejects**).
5. The charge lands on the PI's project and the form continues down the normal
   approval chain.

The ProMAn docs define this for **five** modules only: Travel, Reimbursement,
Indent General Form, Indent Cum Sanction Sheet, Rate Contract. Direct Purchase,
Temporary Advance and Disbursal have **no** Other-PI variant in the docs, and
correctly have none in the code.

### Two independent questions on the same form

These are frequently confused. They are unrelated:

| Question on screen | Field (Travel) | Controls |
|---|---|---|
| "Applying for self or other?" | `if_traveler` | **Who travels / who it is for** — descriptive only, no workflow effect |
| "Is this travel charged to another PI's project?" | `travel_other_pi` | **Whose project pays** — drives the entire Other-PI routing |

Only the second one hides the project fields and re-routes the workflow.

---

## 2. Field model

Each module has a Select flag + a Link to the designated PI.

| Module | Flag field | PI field | Waits in state |
|---|---|---|---|
| Travel | `travel_other_pi` | `travel_other_pi_id` | `Pending Other PI` |
| Indent General Form | `igf_other_pi` | `igf_other_pi_id` | `Pending Other PI` |
| Indent Cum Sanction Sheet | `icss_other_pi` | `icss_other_pi_id` | `Pending Other PI` |
| Rate Contract | `rc_other_pi` | `other_pi_email` | `Pending Other PI` |
| Reimbursement | `self_other` | `reimbursement_for_id` | `Pending PI Approval` |

Travel additionally has **`travel_head_approver_id`** (Link → User, hidden,
read-only) — see §6.

### Hiding the applicant's project / account head

When the flag is `Other`, the applicant's project fields must disappear —
otherwise a project number pre-filled from `?project=` lingers and is submitted.
Implemented with `depends_on` on the doctype (so it is enforced by the
metadata, not by any one form):

```json
"depends_on": "eval:doc.travel_other_pi != \"Other\""
```

| Module | Fields hidden when "Other" |
|---|---|
| Travel | `travel_project_title`, `travel_project_number`, `account_head` |
| IGF | `igf_project_title`, `igf_project_code` |
| ICSS | `project_ref`, `project_no`, `icss_account_head` |
| Rate Contract | `project_number`, `account_head` |
| Reimbursement | `project_name`, `project_number`, `account_head` |

**Note — IGF is deliberately different.** `igf_account_head` is *not* a project
budget head; it is the expense **category** (`Consumable / Contingency /
Equipments / Other`) which drives the director-approval threshold. It is the
applicant's to choose and stays visible.

**Mandatory flags must be conditional too.** A hidden field that is still
`reqd = 1` makes the form unsubmittable. Reimbursement's `account_head` had
exactly this bug; it now uses:

```json
"reqd": 0,
"mandatory_depends_on": "eval:doc.self_other==\"Self\""
```

> Any change to a doctype `.json` requires
> `bench --site <site> reload-doctype "<Doctype>"` (or `migrate`) **and**
> `bench --site <site> clear-cache`. Editing the file alone does not change the
> running form — field metadata is served from the database.

---

## 3. Workflow

`Pending Other PI` is a real workflow state with its own transitions. For Travel
it was missing entirely (the controller expected it, so submitting threw
*"Submit action is not available"*); it is added idempotently by the patch
**`rndopsapp/patchs/add_travel_other_pi_workflow.py`**, registered in
`patches.txt`.

```
Draft            --Submit (travel_other_pi == "Other")--> Pending Other PI
Pending Other PI --Forward-->                             Pending Head Approval
Pending Other PI --Put Back-->                            Draft
Pending Other PI --Reject-->                              Rejected
```

The existing `Draft → Submit` transitions are guarded with
`doc.travel_other_pi != "Other"` so the normal and Other-PI paths never both match.

Downstream differs per module, per the ProMAn docs:

- **Travel** → `Pending Head Approval` (Travel's documented flow keeps the HoD step)
- **IGF / ICSS / Rate Contract** → `Pending Staff Approval` (their documented
  Other-PI flow skips the HoD for PS/IR/Permanent Employee)

---

## 4. Controller logic

Same shape in every module (`travel.py`, `indent_general_form.py`,
`indent_cum_sanction_sheet.py`, `rate_contract.py`, `reimbursement.py`).

**a) Submit routing** — flag set, PI named, route to the PI:

```python
if (doc.get("travel_other_pi") or "").strip() == "Other":
    if not doc.get("travel_other_pi_id"):
        frappe.throw(_("Please select the Other PI before submitting."))
    next_state = "Pending Other PI"
```

**b) Scoped to the assigned PI** — role permission alone is not enough, since
every PI holds `Permanent Employee`:

```python
if current_state == "Pending Other PI":
    is_system_manager = "System Manager" in frappe.get_roles(frappe.session.user)
    assigned_pi = (doc.get("travel_other_pi_id") or "").lower()
    if not is_system_manager and assigned_pi != (frappe.session.user or "").lower():
        frappe.throw(_("You are not authorised to act on this travel application."))
```

**c) Ownership-validated project + head on Forward/Approve** — the PI may only
charge a project they own, with a head valid for it:

```python
project_name = extra_data.get("project_name")
account_head = extra_data.get("account_head")
owns = next((p for p in get_pi_projects() if p.get("value") == project_name), None)
if not owns:
    frappe.throw(_("Selected project does not belong to you."))
valid_heads = {h["value"].lower() for h in get_project_account_heads(project_name)}
if account_head.lower() not in valid_heads:
    frappe.throw(_("Selected account head is not valid for this project."))
doc.travel_project_title  = project_name
doc.travel_project_number = owns.get("project_no")
doc.account_head          = bh_name
```

**d) Assignment + notification** — the form is assigned (ToDo) to the PI on
submit and released when they act, so it appears in their task list:
`_assign_travel_to_other_pi()` / `_clear_other_pi_assignment()`.

**e) ICSS Put Back** — ICSS drives put-backs from `ICSS_PUT_BACK_RULES`
(not workflow transitions), so `Pending Other PI` was added there with targets
`["PI", "Requestor"]`, plus the assigned-PI guard inside `put_back_icss()`
(that path returns before the normal guard).

### Whitelisted endpoints used by the UI

| Endpoint | Purpose |
|---|---|
| `travel.get_travel_pi_projects` | projects owned by the session PI |
| `travel.get_travel_project_account_heads` | account heads for a project |
| `reimbursement.get_pi_projects` / `get_project_account_heads` | shared by ICSS, IGF, Reimbursement |

The UI sends the choice as `extra_data` on the workflow action:

```json
{ "project_name": "...", "project_number": "...", "account_head": "..." }
```

---

## 5. PI picker

`_get_permanent_employee_options()` (in `reimbursement.py`, reused by all
modules) lists enabled users holding the **Permanent Employee** role.

Labels **must include the email**:

```python
u["label"] = f"{full_name} ({u['value']})"
```

Two accounts existed with the identical display name *"Sanasam Ranbir Singh"*
(`ranbir@iitg.ac.in`, a PI, and `adornd@iitg.ac.in`, a role account). The picker
showed both as the same text, so an applicant selected the wrong PI and the form
went to someone who was not a PI at all.

Note `DynamicFormRenderer` **merges** options keyed by doctype (`User`) with
options keyed by fieldname, so a form that loads all users into `linkOptions.User`
re-introduces non-PI users into the picker. Disambiguating the label is what
makes this safe; IGF's own user list got the same treatment.

---

## 6. Head routing (Travel only)

Travel's documented Other-PI flow is `P → Other PI → HoD → Staff → HoS → Dean`.
The question is *whose* HoD — and originally it was the **applicant's**, even
though the money now comes from the other PI's project.

Fixed by resolving the funding PI's department head at the moment the PI forwards:

```python
def _resolve_dept_head(user_id):
    dept = frappe.db.get_value("User", user_id, "department_name")
    return frappe.db.get_value("Department_prornd", dept, "dept_head")

doc.travel_head_approver_id = _resolve_dept_head(doc.get("travel_other_pi_id"))
```

That head is then assigned/notified, and two places honour the override:

- `perform_travel_action` — only the designated head may act at
  `Pending Head Approval` (no-op when the field is empty, i.e. normal flow).
- `module_registry.get_pending_task` — the pending list previously filtered
  Travel by `department_travel` (the applicant's department). It now prefers
  `travel_head_approver_id` when set, falling back to department otherwise.

---

## 7. Where a PI sees the work

`Pending Task` is **not** shown to Permanent Employees (replaced by
`Pending Application`), so a PI needs other surfaces:

**a) Pending Application** (`get_pending_application`) — extended beyond Leave
Module to return forms parked with the current user as the designated PI:

```python
other_pi_sources = {
    "Travel":                    ("travel_other_pi_id", "Pending Other PI",   "applicant_name_travel"),
    "Indent General Form":       ("igf_other_pi_id",    "Pending Other PI",   "igf_indenter"),
    "Indent Cum Sanction Sheet": ("icss_other_pi_id",   "Pending Other PI",   "icss_applicant_name"),
    "Reimbursement":             ("reimbursement_for_id","Pending PI Approval","applicant_webmail"),
}
```

Each row carries its `doctype`, and `PendingApplication.tsx` routes it to that
module's own detail page.

**b) "Other PI" tab** (`/other-pi` → `OtherPIView.tsx`) — a registry across all
four modules, scoped so each person sees only what concerns them:

```ts
filters:   [["travel_other_pi", "=", "Other"]],
orFilters: [["owner", "=", currentUser], ["travel_other_pi_id", "=", currentUser]],
```

i.e. **forms I raised** OR **forms charged to me**. Field names must match the
doctype exactly — querying a non-existent field makes Frappe return **HTTP 417**
and the section silently renders empty:

| Module | Applicant fields |
|---|---|
| Travel | `applicant_name_travel`, `webmail_id_travel` |
| IGF | `igf_indenter`, `igf_webmail_id` |
| ICSS | `icss_applicant_name`, `icss_applicant_webmail_id` |
| Reimbursement | `applicant_webmail`, `reimbursement_for_id` |

---

## 8. Approval UI

The PI needs two dropdowns (project, account head) before Forward.

**Travel** — the selectors live in **`TravelDetails.tsx`** as a full-width panel
in the page body, *not* in `PageHeader`. They were originally inside the header
next to the action buttons, where the project select stretched the row and the
account-head select was pushed out of view. `TravelDetails` owns the state and
passes the selection down; `TravelActionButtons` validates and attaches
`extra_data`:

```tsx
<TravelActionButtons
    workflowState={formData.workflow_state}
    otherPiId={formData.travel_other_pi_id}
    otherPiProject={otherPiProject}
    otherPiHead={otherPiHead}
    otherPiProjects={otherPiProjects}
/>
```

**Reimbursement** — same pattern inside `ReimbursementWorkflowActions`
(`PendingTaskDetails.tsx`), gated on:

```ts
const isPiStep =
    workflowState === "Pending PI Approval" &&
    (reimbursementForId || "").toLowerCase() === currentUser.toLowerCase();
```

---

## 9. Cancellation requests

`Cancellation Request` rows at `Pending Head Approval` were visible to **every**
head for any doctype lacking a head field (Reimbursement, IGF, ICSS, Direct
Purchase, Temporary Advance) — the filter checked `head` / `head_approver` /
`department_head` / `dept_head`, found none, and fell through without filtering.

Now scoped by the applicant's department, matching either the Link id or the
readable name (doctypes store it both ways):

```python
dept_field_map = {
    "Travel":                    "department_travel",
    "Reimbursement":             "applicant_department",
    "Indent General Form":       "igf_department_centre_section",
    "Indent Cum Sanction Sheet": "icss_applicant_department__centre__section",
    "Direct Purchase":           "applicant_department",
    "Temporary Advance":         "applicant_department",
}
```

Verified: a Reimbursement cancellation went from visible to *hodbio + hodcse +
hodphy* down to **hodcse only** (the applicant's actual department head).

---

## 10. Testing

Accounts: applicant = a Permanent Employee (e.g. `chaudhary@iitg.ac.in`),
Other PI = a **different** Permanent Employee who owns projects
(e.g. `ranbir@iitg.ac.in`). Act from the module's **own detail page**, not the
pending-task list.

1. As applicant, open the form (e.g. `/travel`).
2. Set **"Is this charged to another PI's project?" → Other**.
   → project/account-head fields disappear; **Other PI Webmail Id** becomes required.
3. Select the PI **by email** (labels show `Name (email)`), fill the rest, Submit.
   → state is `Pending Other PI` (`Pending PI Approval` for Reimbursement).
4. As that PI: the form appears in **Pending Application** and the **Other PI** tab.
   Open it, choose **your** project + account head, **Actions → Forward**.
   → moves to `Pending Head Approval` (Travel) or `Pending Staff Approval`
   (IGF/ICSS/RC), and the project/account head are now **the PI's**.
5. Negative check: another Permanent Employee cannot see or act on it.

For the Travel head re-pointing to be visible, the Other PI must be in a
**different department** from the applicant — otherwise both resolve to the same
HoD.

---

## 11. Known gaps

| Item | Status |
|---|---|
| **Rate Contract** | Backend complete and the most faithful to the docs, but the form is **removed from the portal** (no route/sidebar entry; `RateContractForm.tsx` is orphaned). Its cancellations are also unscoped — it is listed in `head_field_map` as `current_approver`, a field the doctype does not have. |
| **IGF class coverage** | Other-PI is wired for **Permanent Employee only**. The docs also define PS → PI → Other PI, IR → Other PI, and IF → Other PI → HoD, plus a ₹1 lakh → Associate Dean tier that IGF's workflow lacks entirely. |
| **ICSS / Rate Contract vs docs** | Their controllers send every class straight to `Pending Staff Approval`, which is correct for PS/IR/Permanent Employee but drops the **HoD step the docs require for Inspire Faculty**. |
| **Reimbursement scope** | Docs restrict Other-PI to Faculty; the implementation also allows IR and project staff, and skips the documented DPF/CPF/Design-Head intermediate approver. |
| **Form Cancellation** | `get_my_applications` is strictly `owner`-scoped, and creating a cancellation rejects non-owners. The designated Other PI therefore cannot cancel a form charged to their project (they can still Reject/Put Back while it is with them). Intentional for now. |
| **Base mismatch** | The frontend branch is built on live `v0.7`; the backend branch descends from `94ef118` while live runs `4a78e07`. Reconcile before deploying. |
