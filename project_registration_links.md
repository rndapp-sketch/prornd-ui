# Project Registration — Linked DocTypes Report

**Scanned:** `/home/prornd/frappe-dev/prornd/apps/rndopsapp/rndopsapp/rndopsapp/doctype`  
**Target DocType:** `Project Registration`  
**Source:** JSON metadata + live MariaDB (`tabDocField`) verified  
**Date:** 2026-04-20

---

## ✅ Section 1 — Direct Links (Confirmed in Database)

These DocTypes have a formal `Link` field whose `options` is exactly **`Project Registration`**.  
The **PR Field Being Mapped** column shows which field of `Project Registration` the linking DocType stores or fetches from.

> [!NOTE]
> In Frappe, a `Link` field always stores the **`name`** (document ID / autoname) of the target record.  
> `Project Registration` uses autoname format: `{YYYY}{MM}{DD}{01}{fund_agen_initials}{######}` (e.g. `202507300DIIT000001`)  
> Any `fetch_from` fields then pull additional PR fields (like `project_no`, `project_type`, etc.) automatically.

| # | Linking DocType | Link Field Name | Link Label | PR Field Stored (name) | Fetched PR Fields (fetch_from) | Is Direct Link |
|---|----------------|----------------|------------|------------------------|-------------------------------|----------------|
| 1 | **AccountHeadPayment** | `project_ref_number` | Project Ref Number | `name` (PR document ID) | — | ✅ Yes |
| 2 | **Advance Settlement** | `project_name` | Project Name | `name` (PR document ID) | — | ✅ Yes |
| 3 | **Deposit slip** | `project_title` | Project Title | `name` (PR document ID) | — | ✅ Yes |
| 4 | **Deposit Slip Project Credit** | `project_number` | Project Number | `name` (PR document ID) | — | ✅ Yes |
| 5 | **Disbursement of Honorarium** | `project_number` | Project Number | `name` (PR document ID) | — | ✅ Yes |
| 6 | **E Non Routine Deposit Slip** | `project_title` | Project Title | `name` (PR document ID) | — | ✅ Yes |
| 7 | **Fund Received** | `prjreg_title` | Project Title | `name` (PR document ID) | — | ✅ Yes |
| 8 | **Fund Sanction** | `project_proposal` | Project Registered | `name` (PR document ID) | `project_type` → `project_type_linked` | ✅ Yes |
| 9 | **Indent Cum Sanction Sheet** | `project_ref` | Project Reference | `name` (PR document ID) | — | ✅ Yes |
| 10 | **Indent General Form** | `igf_project_title` | Project Title | `name` (PR document ID) | `project_no` → `igf_project_code` | ✅ Yes |
| 11 | **Loan Request** | `project_name` | Project Title | `name` (PR document ID) | `project_no` → `project_number` | ✅ Yes |
| 12 | **myProjects** | `project_proposal` | Project Proposal | `name` (PR document ID) | `other_project_type_name` → `principal_investigator` | ✅ Yes |
| 13 | **payments** | `project_id` | Project Id | `name` (PR document ID) | — | ✅ Yes |
| 14 | **Project Extension** | `project_ref` | Select project reference number | `name` (PR document ID) | `project_no` → `prj_num` | ✅ Yes |
| 15 | **Project Registration** | `amended_from` | Amended From | `name` (PR document ID) | — | ✅ Yes (self-ref) |
| 16 | **proprietary_purchase** | `project_ref` | Project Reference | `name` (PR document ID) | — | ✅ Yes |
| 17 | **Rate Contract** | `project_number` | Project Number | `name` (PR document ID) | — | ✅ Yes |
| 18 | **Reimbursement** | `project_name` | Project Name | `name` (PR document ID) | — | ✅ Yes |
| 19 | **Research Consultancy Deposit Slip** | `project_title` | Project Title | `name` (PR document ID) | `project_no` → `project_number`; `consultancy_gstin` → `gstin_of_funding_agency`; `pi_userid` → `principal_investigator` | ✅ Yes |
| 20 | **Research Deposit Slip** | `project_title` | Project Title | `name` (PR document ID) | `project_no` → `project_no`; `funding_agen` → `funding_agency` | ✅ Yes |
| 21 | **standerdized_purchase** | `project_ref` | Project Reference | `name` (PR document ID) | — | ✅ Yes |
| 22 | **T Testing Deposit Slip** | `project_title` | Project Title | `name` (PR document ID) | — | ✅ Yes |
| 23 | **Travel** | `travel_project_title` | Auto selected project Title | `name` (PR document ID) | — | ✅ Yes |
| 24 | **UC Request** | `project_id` | Select Project | `name` (PR document ID) | — | ✅ Yes |

---

### PR Fields Referenced via `fetch_from` (from Direct Links)

This sub-table shows exactly which **Project Registration fields** are being pulled into linked DocTypes:

| Linked DocType | Link Field | `fetch_from` Expression | PR Field Fetched | Stored In (Local Field) | Local Label |
|---------------|-----------|------------------------|-----------------|-------------------------|-------------|
| Fund Sanction | `project_proposal` | `project_proposal.project_type` | `project_type` | `project_type_linked` | Project Type |
| Indent General Form | `igf_project_title` | `igf_project_title.project_no` | `project_no` | `igf_project_code` | Project Code |
| Loan Request | `project_name` | `project_name.project_no` | `project_no` | `project_number` | Project Number |
| myProjects | `project_proposal` | `project_proposal.other_project_type_name` | `other_project_type_name` | `principal_investigator` | Principal Investigator |
| Project Extension | `project_ref` | `project_ref.project_no` | `project_no` | `prj_num` | Project Number |
| Research Consultancy Deposit Slip | `project_title` | `project_title.project_no` | `project_no` | `project_number` | Project Number |
| Research Consultancy Deposit Slip | `project_title` | `project_title.consultancy_gstin` | `consultancy_gstin` | `gstin_of_funding_agency` | GSTIN of Funding Agency |
| Research Consultancy Deposit Slip | `project_title` | `project_title.pi_userid` | `pi_userid` | `principal_investigator` | Principal Investigator |
| Research Deposit Slip | `project_title` | `project_title.project_no` | `project_no` | `project_no` | Project No |
| Research Deposit Slip | `project_title` | `project_title.funding_agen` | `funding_agen` | `funding_agency` | Funding Agency |

---

## ⚠️ Section 2 — Indirect / Partial Links (Data Fields Storing PR Identifiers)

These DocTypes store Project Registration identifiers as plain `Data` fields — **no Frappe FK enforcement**, populated programmatically or manually.

| # | DocType | Field Name | Field Type | PR Field It Stores | Is Direct Link | Notes |
|---|---------|-----------|------------|--------------------|----------------|-------|
| 1 | **Advance Settlement** | `project_code` | Data | `project_no` (PR project number) | ❌ No | Companion to `project_name` Link; stores PR's `project_no` |
| 2 | **Direct Purchase** | `project_no` | Data | `project_no` | ❌ No | Stores PR project number directly |
| 3 | **Disbursal of Honorarium** | `project_name` | Data | PR `name` or title (string copy) | ❌ No | Plain Data, no FK |
| 4 | **Disbursal of Honorarium** | `project_no` | Data | `project_no` | ❌ No | Name pattern match |
| 5 | **Endorsement Data** | `project_no` | Data | `project_no` | ❌ No | Name pattern match |
| 6 | **Extension Of Tenure Of Appointment** | `project_number` | Data | `project_no` | ❌ No | Label = "Project No." |
| 7 | **Indent Cum Sanction Sheet** | `project_no` | Data | `project_no` | ❌ No | Companion read-only display; populated from `project_ref` Link |
| 8 | **Indent General Form** | `igf_project_code` | Data | `project_no` (via fetch_from) | ❌ No | Auto-filled via `igf_project_title.project_no` |
| 9 | **Loan Request** | `project_number` | Data | `project_no` (via fetch_from) | ❌ No | Anomaly: has `options=Project Registration` but type=Data; fetched via `project_name.project_no` |
| 10 | **P_11 Form** | `project_no` | Data | `project_no` | ❌ No | Name pattern match |
| 11 | **proprietary_purchase** | `project_no` | Data | `project_no` | ❌ No | Companion to `project_ref` Link |
| 12 | **Recruitment Adhoc Contractual** | `upfa_project_code` | Data | `project_no` | ❌ No | Copied from linked PR; upfa prefix = unified project fetch area |
| 13 | **Reimbursement** | `project_number` | Data | `project_no` | ❌ No | Anomaly: `options=Project Registration` but type=Data |
| 14 | **repair_replacement** | `project_no` | Data | `project_no` | ❌ No | Name pattern match |
| 15 | **repair_replacement** | `project_ref` | Data | PR `name` or code | ❌ No | Despite name, is plain Data (not a Link) |
| 16 | **Research Consultancy Deposit Slip** | `project_number` | Data | `project_no` (via fetch_from) | ❌ No | Auto-filled via `project_title.project_no` |
| 17 | **Research Deposit Slip** | `project_no` | Data | `project_no` (via fetch_from) | ❌ No | Auto-filled via `project_title.project_no` |
| 18 | **sanction_sheet** | `project_no` | Data | `project_no` | ❌ No | Name pattern match |
| 19 | **Selection Committee Report** | `project_name` | Data | PR title (string) | ❌ No | Fetched via `interview_id.upfa_project_title` (indirect chain) |
| 20 | **Selection Committee Report** | `project_number` | Data | `project_no` | ❌ No | Plain Data |
| 21 | **standerdized_purchase** | `project_no` | Data | `project_no` | ❌ No | Companion to `project_ref` Link |
| 22 | **TA DA Settlement** | `project_no` | Data | `travel_project_number` from Travel (which fetches from PR) | ❌ No | Indirect chain: `ta_da_travel_application.travel_project_number` |
| 23 | **Temporary Advance** | `project_code` | Data | `project_no` | ❌ No | Name pattern match |
| 24 | **Temporary Advance** | `project_name` | Data | PR title (string) | ❌ No | Plain Data |
| 25 | **Travel** | `travel_project_number` | Data | `project_no` | ❌ No | Companion to `travel_project_title` Link field |

---

## 🔑 Project Registration Fields Summary (Most Mapped)

| PR Field | Field Type | Description | Referenced By |
|----------|-----------|-------------|---------------|
| `name` (autoname) | Data | Primary document ID — format: `YYYYMMDDnFUND######` | All 24 direct Link fields |
| `project_no` | Data | Human-readable project number (assigned internally) | 10+ DocTypes via `fetch_from` or direct Data fields |
| `project_type` | Select | Research / Consultancy / Other | `Fund Sanction` → `project_type_linked` |
| `consultancy_gstin` | Data | GSTIN of funding agency | `Research Consultancy Deposit Slip` → `gstin_of_funding_agency` |
| `pi_userid` | Link (User) | Principal Investigator user | `Research Consultancy Deposit Slip` → `principal_investigator` |
| `funding_agen` | Link | Funding agency reference | `Research Deposit Slip` → `funding_agency` |
| `other_project_type_name` | Data | Custom project type name | `myProjects` → `principal_investigator` (mismatch — likely a bug) |

---

## 🔴 Notable Anomalies

| Issue | DocType | Field | Detail |
|-------|---------|-------|--------|
| `Data` field with `options = 'Project Registration'` | Loan Request | `project_number` | fieldtype=Data but options=Project Registration — no FK enforcement |
| `Data` field with `options = 'Project Registration'` | Reimbursement | `project_number` | Same anomaly |
| Mismatched fetch_from label | myProjects | `principal_investigator` | Fetches `other_project_type_name` from PR but stores it as "Principal Investigator" — likely a design bug |
| `project_ref` as plain Data | repair_replacement | `project_ref` | Name suggests Link, but is plain Data — no FK enforcement |
| Self-referential Link | Project Registration | `amended_from` | Standard Frappe amendment field |

---

## 📊 Summary Count

| Category | Count |
|----------|-------|
| DocTypes with **Direct Links** (DB confirmed) | **24** |
| Unique PR fields referenced via `fetch_from` | **6** (`project_no`, `project_type`, `consultancy_gstin`, `pi_userid`, `funding_agen`, `other_project_type_name`) |
| DocTypes with **Indirect Data references only** | **14 additional** |
| Anomalous `Data` fields with `options=Project Registration` | **2** |
| Total DocTypes with any PR relationship | **35** |

---

## 🗂️ Consolidated Alphabetical Index

| DocType | Direct Link Field | PR Field Stored | Fetched PR Fields | Indirect Data Fields |
|---------|------------------|----------------|-------------------|---------------------|
| AccountHeadPayment | `project_ref_number` | `name` | — | — |
| Advance Settlement | `project_name` | `name` | — | `project_code` → `project_no` |
| Deposit slip | `project_title` | `name` | — | — |
| Deposit Slip Project Credit | `project_number` | `name` | — | — |
| Direct Purchase | — | — | — | `project_no` |
| Disbursal of Honorarium | — | — | — | `project_name`, `project_no` |
| Disbursement of Honorarium | `project_number` | `name` | — | — |
| E Non Routine Deposit Slip | `project_title` | `name` | — | — |
| Endorsement Data | — | — | — | `project_no` |
| Extension Of Tenure Of Appointment | — | — | — | `project_number` |
| Fund Received | `prjreg_title` | `name` | — | — |
| Fund Sanction | `project_proposal` | `name` | `project_type` | — |
| Indent Cum Sanction Sheet | `project_ref` | `name` | — | `project_no` |
| Indent General Form | `igf_project_title` | `name` | `project_no` | `igf_project_code` |
| Loan Request | `project_name` | `name` | `project_no` | `project_number` (Data anomaly) |
| myProjects | `project_proposal` | `name` | `other_project_type_name` | — |
| P_11 Form | — | — | — | `project_no` |
| payments | `project_id` | `name` | — | — |
| Project Extension | `project_ref` | `name` | `project_no` | — |
| Project Registration | `amended_from` | `name` (self) | — | — |
| proprietary_purchase | `project_ref` | `name` | — | `project_no` |
| Rate Contract | `project_number` | `name` | — | — |
| Recruitment Adhoc Contractual | — | — | — | `upfa_project_code` |
| Reimbursement | `project_name` | `name` | — | `project_number` (Data anomaly) |
| repair_replacement | — | — | — | `project_no`, `project_ref` |
| Research Consultancy Deposit Slip | `project_title` | `name` | `project_no`, `consultancy_gstin`, `pi_userid` | `project_number` |
| Research Deposit Slip | `project_title` | `name` | `project_no`, `funding_agen` | `project_no` |
| sanction_sheet | — | — | — | `project_no` |
| Selection Committee Report | — | — | — | `project_name`, `project_number` |
| standerdized_purchase | `project_ref` | `name` | — | `project_no` |
| T Testing Deposit Slip | `project_title` | `name` | — | — |
| TA DA Settlement | — | — | — | `project_no` (via Travel chain) |
| Temporary Advance | — | — | — | `project_code`, `project_name` |
| Travel | `travel_project_title` | `name` | — | `travel_project_number` |
| UC Request | `project_id` | `name` | — | — |
