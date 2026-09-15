# Department & Account Head Fields — rndopsapp Module

All doctypes (parent and child tables) scanned for fields whose label contains
**"Department"** or **"Account Head" / "Budget Head"**.

Columns: `fieldname` · Label · Type · Options (Link target or Select choices)

---

## Doctypes with BOTH Department and Account Head fields

### Direct Purchase `[Parent]`

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `applicant_department` | Applicant Department | Data | — |
| Dept | `applying_for_department` | Department | Data | — |
| Acct | `account_head` | Account Head | Link | → Budget Head |

---

### Disbursal of Honorarium `[Parent]`

> Child tables embedded in this doctype:
> - `honorarium_table` via field `table_weoy` ("Details of Honorarium")

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `department_for` | Department | Data | — |
| Dept | `applicant_department` | Department | Data | — |
| Acct | `account_head` | Account Head | Link | → Budget Head |

---

### dp_po `[Parent]`

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `department` | Department | Data | — |
| Acct | `account_head` | Account Head | Data | — |

---

### Indent Cum Sanction Sheet `[Parent]`

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `icss_applicant_department__centre__section` | Applicant Department / Centre / Section | Link | → Department_prornd |
| Dept | `icss_applying_for_department_centre_section` | Appplying For Department / Centre / Section ¹ | Link | → Department_prornd |
| Acct | `icss_account_head` | Account Head | Link | → Budget Head |
| Acct | `icss_other_account_head` | Other Account Head (Specify) | Data | — |

> ¹ Typo in label — three `p`s in "Appplying".

---

### Indent General Form `[Parent]`

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `igf_department_centre_section` | Department / Centre / Section | Link | → Department_prornd |
| Acct | `igf_account_head` | Account Head | Select (overridden) | Consumable / Contingency / Equipments / Other |

> **Frontend override** — `igf_account_head` is defined as a Select in the Frappe doctype, but `IndentGeneralFormDetails.tsx` overrides it to `fieldtype: "Link", options: "Budget Head"` and injects `budgetHeadOptions` into `linkOptions`. This means `formData.igf_account_head` stores the Budget Head doc `name`, not a Select string.
>
> **Resolving to human-readable label** — To get the human-readable budget head name (which matches `headBalances` keys from `useProjectBudget`), look up the value in `linkOptions.igf_account_head`:
> ```ts
> const igfAccountHeadLabel =
>     linkOptions?.igf_account_head?.find((o) => o.value === formData.igf_account_head)?.label
>     || formData.igf_account_head || "";
> ```
> Pass `igfAccountHeadLabel` as `defaultBudgetHead` to `CommitPayment` so the correct head is auto-selected.
>
> **Department resolution** — `igf_department_centre_section` stores a Frappe auto-ID (e.g. `oti8os9ndm`). Resolve it to the human-readable `dept_name` via `frappe.client.get_value` against the `Department_prornd` doctype during the load function, then display `deptName` in the UI.

---

### Rate Contract `[Parent]`

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `other_pi_dept` | Department | Data | — |
| Acct | `account_head` | Account Head | Link | → Budget Head |

---

### Recruitment Adhoc Contractual `[Parent]`

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `upfa_department` | Department | Link | → Department_prornd |
| Acct | `account_head` | Account Head | Link | → Budget Head |

---

### Reimbursement `[Parent]`

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `applicant_department` | Department | Data | — ² |
| Dept | `reimbursement_for_department` | Department | Data | — |
| Acct | `account_head` | Account Head | Link | → Budget Head |

> ² Data field with `options` set to `Department_prornd` — likely a config artifact.

---

### TA DA Settlement `[Parent]`

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `ta_da_department_section` | Department/Section | Data | — |
| Acct | `ta_da_account_head` | Account Head from Travel | Data | — |

---

### Temporary Advance `[Parent]`

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `advance_for_department` | Department | Data | — |
| Dept | `applicant_department` | Department | Data | — |
| Acct | `account_head` | Account Head | Data | — |

---

### Top Up Fellowship `[Parent]`

> Child tables embedded in this doctype:
> - `Top Up Fellowship Student` via field `students` ("Students")

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `checkbox1` | "…duty by the Department / Center…" | Check | — |
| Acct | `account_head` | Account Head | Link | → Budget Head |

> Note: `checkbox1` is a consent checkbox whose label mentions "Department" — not a real department selector.

---

### Travel `[Parent]`

| Role | `fieldname` | Label | Type | Options |
|---|---|---|---|---|
| Dept | `department_travel` | Department | Link | → Department_prornd |
| Acct | `account_head_details_section` | Account Head Details | Section Break | — |
| Acct | `account_head` | Account Head | Link | → Budget Head |

> Note: `account_head_details_section` is a Section Break header, not a data field.

---

## Doctypes with Department fields only

### Department_prornd `[Parent]`

> Master doctype — referenced by most Department Link fields across the module.

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `dept_id` | Department Id | Data | — |
| `dept_name` | Department | Data | — |
| `dept_head` | Department Head | Link | → User |

---

### Details Of Honorarium `[Child Table]`

> **Parent:** Disbursement of Honorarium → field `honorarium_details` ("Details of Honorarium")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `department` | Department | Data | — |

---

### Disbursement of Honorarium `[Parent]`

> Child tables embedded in this doctype:
> - `Details Of Honorarium` via field `honorarium_details` ("Details of Honorarium")

*(Department fields: none · Account Head only — see Account Head section below)*

---

### DPF Credit Distribution `[Child Table]`

> **Parents:**
> - D Consultancy Deposit Slip → field `dpf_credit_distributions` ("(B) DPF Credit Distribution")
> - Research Deposit Slip → field `dpf_credit_distributions` ("(B) DPF Credit Distribution")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `select_dpf_dept_center_school` | Select (Department/Center/School) | Link | → Department_prornd |
| `department_id` | Department Id | Data | — |

---

### Extension Of Tenure Of Appointment `[Parent]`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `department` | Please Select your Department | Link | → Department_prornd |

---

### honorarium_table `[Child Table]`

> **Parent:** Disbursal of Honorarium → field `table_weoy` ("Details of Honorarium")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `department_section` | Department/ Section | Data | — |

---

### Institution Details `[Child Table]`

> **Parent:** Universal Registration__ → field `institution_details_u_r` ("Institution Details")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `department_u_r` | Department | Data | — |

---

### ipr_student_coinventor_details `[Child Table]`

> **Parent:** Not referenced by any Table field found in the module *(orphaned or referenced externally)*.

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `ipr_department` | Department | Link | → Department_prornd |

---

### Leave Data `[Parent]`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `department` | Department | Data | — |

---

### Loan Request `[Parent]`

> Child tables embedded in this doctype:
> - `Loan Amount Accounthead Breakup` via field `account_head_fund_breakup` ("Fund Breakup")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `loan_for_department` | Department | Data | — |
| `applicant_department` | Department | Data | — |

---

### myProjects `[Parent]`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `department` | Department | Link | → Department_prornd |

---

### Personal Experience__ `[Child Table]`

> **Parent:** Universal Registration__ → field `experiences_u_r` ("Experience")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `department_u_r` | Department (Optional) | Data | — |

---

### Project Additional PI `[Child Table]`

> **Parents:**
> - Project Proposal → field `additional_pi_table` ("Details of Additional Principal Investigator(s)")
> - Project Registration → field `additional_pi_table` ("Details of Additional Principal Investigator(s)")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `pi_department` | Department | Data | — |

---

### Project Co-Investigator `[Child Table]`

> **Parents:**
> - IPR Invention Disclosure → field `coinventors_detail` ("Name of the inventors including faculty, students and staff:")
> - Project Proposal → field `co_investigator_table` ("Details of Additional Co-Principal Investigator(s)")
> - Project Registration → field `co_investigator_table` ("Details of Additional Co-Principal Investigator(s)")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `copi_department` | Department | Data | — |

---

### Project Number Generation `[Parent]`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `select_department` | Select Department | Link | → Department_prornd |

---

### Project Proposal `[Parent]`

> Child tables embedded in this doctype:
> - `Project Additional PI` via field `additional_pi_table`
> - `Project Co-Investigator` via field `co_investigator_table`
> - `Project Sanctioned Budget` via field `proposed_budget_breakup` ("Proposed Budget Break-up")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `implementation_department` | Department/Centre where the project will be implemented | Link | → Department_prornd |
| `applicant_department` | Department of Applicant | Link | → Department_prornd |
| `department_head` | Department Head | Link | → User |

---

### Project Registration `[Parent]`

> Child tables embedded in this doctype:
> - `Project Additional PI` via field `additional_pi_table`
> - `Project Co-Investigator` via field `co_investigator_table`
> - `Project Received Budget` via field `received_amount_breakup`
> - `Project Sanctioned Budget` via field `sanctioned_budget_breakup` and `proposed_budget_breakup`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `implementation_department` | Department/Centre where the project will be implemented | Link | → Department_prornd |
| `applicant_department` | Department of Applicant | Link | → Department_prornd |
| `department_head` | Department Head | Link | → User |

---

### Project Staff Details `[Parent]`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `ps_department` | Department | Data | — |

---

### Project Staff Resignation `[Parent]`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `applicant_department` | Department / Centre / Section | Data | — |

---

### sanction_sheet `[Parent]`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `ss_department_for_purchase` | Name of Department/ Centre placing indents for purchase | Data | — |

---

### Selection Committee Report `[Parent]`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `upfa_department` | Department | Link | → Department_prornd |

---

### Top Up Fellowship Student `[Child Table]`

> **Parent:** Top Up Fellowship → field `students` ("Students")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `dept_centre` | Department / Centre | Link | → Department_prornd |

---

### Utility Assignment `[Parent]`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `user_department` | Department | Read Only | — |

---

## Doctypes with Account / Budget Head fields only

### AccountHeadPayment `[Parent]`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `budget_head` | Account Head | Link | → Budget Head |

---

### Advance Settlement `[Parent]`

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `account_head` | Account Head | Data | — |

---

### Budget Head `[Parent]`

> Master doctype — referenced by most Account Head Link fields across the module.

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `budget_head` | Budget Head | Data | — |
| `specify_the_budget_head` | Specify the Budget Head | Data | — |

---

### Disbursement of Honorarium `[Parent]`

> Child tables embedded in this doctype:
> - `Details Of Honorarium` via field `honorarium_details` ("Details of Honorarium")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `account_head` | Account Head | Link | → Budget Head |

---

### Loan Amount Accounthead Breakup `[Child Table]`

> **Parent:** Loan Request → field `account_head_fund_breakup` ("Fund Breakup")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `budget_head` | Account Head | Link | → Budget Head |

---

### Po Commit Adjustment `[Parent]`

> Child tables embedded in this doctype:
> - `Settlement Accounts` via field `settlement_accounts` ("Settlement Accounts")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `account_head` | Account Head | Link | → Budget Head |

---

### Project Received Budget `[Child Table]`

> **Parents:**
> - Fund Received → field `received_amt_breakup` ("Budget Breakup of the Received Amount")
> - Fund Sanction → field `received_amount_breakup` ("Budget Breakup of the Received Amount")
> - Project Registration → field `received_amount_breakup` ("Budget Breakup of the Received Amount")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `account_head` | Account Head. | Link | → Budget Head |

---

### Project Sanctioned Budget `[Child Table]`

> **Parents:**
> - Fund Sanction → field `sanctioned_budget_breakup` ("Total Budget Break-up")
> - Project Proposal → field `proposed_budget_breakup` ("Proposed Budget Break-up")
> - Project Registration → field `sanctioned_budget_breakup` and `proposed_budget_breakup`
> - project_sanction_details → field `sanction_budget_breakup` ("Total Budget Break-up")
> - proposed budget breakup → field `proposed_budget_breakup` ("Proposed Budget breakup")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `account_head` | Account Head | Data | — |

---

### Settlement Accounts `[Child Table]`

> **Parent:** Po Commit Adjustment → field `settlement_accounts` ("Settlement Accounts")

| `fieldname` | Label | Type | Options |
|---|---|---|---|
| `account_head` | Account Head | Link | → Budget Head |

---

## Summary

| Category | Count |
|---|---|
| Doctypes with **both** department + account head | 12 |
| Doctypes with **department fields only** | 20 |
| Doctypes with **account/budget head fields only** | 9 |
| **Total doctypes with either field** | **41** |

| Child Table | Parent Doctype(s) |
|---|---|
| Details Of Honorarium | Disbursement of Honorarium |
| DPF Credit Distribution | D Consultancy Deposit Slip · Research Deposit Slip |
| honorarium_table | Disbursal of Honorarium |
| Institution Details | Universal Registration__ |
| ipr_student_coinventor_details | *(not referenced — possibly orphaned)* |
| Loan Amount Accounthead Breakup | Loan Request |
| Personal Experience__ | Universal Registration__ |
| Project Additional PI | Project Proposal · Project Registration |
| Project Co-Investigator | IPR Invention Disclosure · Project Proposal · Project Registration |
| Project Received Budget | Fund Received · Fund Sanction · Project Registration |
| Project Sanctioned Budget | Fund Sanction · Project Proposal · Project Registration · project_sanction_details · proposed budget breakup |
| Settlement Accounts | Po Commit Adjustment |
| Top Up Fellowship Student | Top Up Fellowship |

---

*Generated: 2026-06-30 · Source: rndopsapp doctype JSON definitions*
