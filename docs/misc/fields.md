# RNDOPSAPP Doctype Fields Documentation

## Doctype: AccountHeadPayment

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_s2bj | Payments | Section Break |  |
| amended_from | Amended From | Link | AccountHeadPayment |
| payments_details_section | Payments Details | Section Break |  |
| project_ref_number | Project Ref Number | Link | Project Registration |
| budget_head | Account Head | Link | Budget Head |
| payment_date | Payment Date | Date |  |
| payment_particular | Payment Particular | Data |  |
| payment_reference_details | Payment Reference Details | Data |  |
| payment_amount | Payment Amount | Currency |  |
| payment_bmr | BMR | Data |  |
| payment_status | Payment Status | Select | PENDING PAID REJECTED RECTIFICATION |
| bank_transaction_number | Bank Transaction Number | Data |  |
| bank_transaction_date | Bank Transaction Date | Data |  |
| commit_id | Commit Id | Data |  |

---

## Doctype: Advance Settlement

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_sjmh |  | Section Break |  |
| amended_from | Amended From | Link | Advance Settlement |
| section_break_bcsq |  | Section Break |  |
| project_name | Project Name | Link | Project Registration |
| project_code | Project Code | Data |  |
| amount | Amount | Currency |  |
| date_and_time_of_advance | Date and Time of Advance | Datetime |  |
| temporary_advance_application | Temporary Advance Application | Link | Temporary Advance |
| bank_account_number | Bank Account Number | Data |  |
| account_head | Account Head | Data |  |
| bank_account_holders_name | Bank Account Holder's Name | Data |  |
| section_break_jamt |  | Section Break |  |
| total_amount | Total Amount (Rs.) | Currency |  |
| comment_section | Comment | Section Break |  |
| comment_if_any | Comment, If any | Data |  |
| declaration_section | DECLARATION | Section Break |  |
| declare_1 | I have enclosed  | Check |  |
| declare_2 | I have mentioned  | Check |  |
| declare_3 | I have certified  | Check |  |
| column_break_nfcd |  | Column Break |  |
| please_note | Please Note | HTML | <div class="right_body" style="text-align: justify;height: 395px;">     <p style="text-align: center;"><b>Please Note</b></p>     1. The settlement against this advance should be submitted within a period of 45 days from the date of advance drawn.<br><br>     2. The purchase process as placed on the webpage of II&amp;SI section (Intranet) may be followed.<br><br>     3. The item is to be purchased from the local market. The total amount at the time of settlement under no circumstances should exceed the approved amount of advance.<br><br>     4. Make sure that all purchases are made after approval of advance.<br><br>      <div id="popDiv" class="masterpopup">         Form Data Saved     </div> </div> |
| section_break_fpdq |  | Section Break |  |
| expenditure_details | Expenditure Details | Table | Expenditure Detail |

---

## Doctype: Budget Head

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| budget_head | Budget Head | Data |  |
| id | id | Int |  |

---

## Doctype: Commit

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_tyxt |  | Section Break |  |

---

## Doctype: D Consultancy Deposit Slip

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| consultancy_title | Consultancy Title | Data |  |
| category_d | Category | Data |  |
| principal_consultant | Principal Consultant | Link | User |
| client | Client | Data |  |
| funding_agency | Funding Agency | Link | fundingagency_ |
| gstin_of_funding_agency | GSTIN of Funding Agency | Data |  |
| iitg_invoice_no | IITG Invoice No.	 | Data |  |
| bank | Bank | Data |  |
| ecs_ac_no | ECS A/C No. | Data |  |
| ecs_dates | ECS Dates | Table | Deposit Slip ECS Date |
| section_break_mqkq | GST and Fee Calculations | Section Break |  |
| amount_inclusive_of_gst | Amount Inclusive of GST | Currency |  |
| igst_18_on_consultancy | IGST @18% on Consultancy Fee | Currency |  |
| amount_after_gst_tds | Amount after GST TDS @ 2% | Currency |  |
| total_cost_x | Total Cost X | Currency |  |
| consultancy_charge_y | Consultancy Charge (Y) | Currency |  |
| operational_charge_z | Operational Charge (Z) | Currency |  |
| column_break_fwob | COL 3 | Column Break |  |
| overhead_from_y_amount | Overhead from Y (10% * Y) Amount | Currency |  |
| overhead_from_z_amount | Overhead from Z (10% * Z) Amount | Currency |  |
| total_overhead_amount | Total Overhead ((10% * Y) + (10% * Z)) Amount | Currency |  |
| institute_share_amount | Institute Share (20% * Y) Amount | Currency |  |
| total_overhead_institute_share | Overhead + Institute Share | Currency |  |
| primary_details | Primary Details | Section Break |  |
| credit_distribution_section | Credit Distribution | Section Break |  |
| final_totals | Final Totals | Section Break |  |
| balance_consultancy_fee | Balance Consultancy Fee | Currency |  |
| balance_operation_charge | Balance Operation Charge | Currency |  |
| total_gst | Total GST | Currency |  |
| total_amount | Total Amount | Currency |  |
| col_1_column | COL 1 | Column Break |  |
| idf_amount | IDF | Currency |  |
| dpf_amount | DPF/CE | Currency |  |
| staff_welfare_amount | Staff welfare Amount | Currency |  |
| student_welfare_amount | Student welfare Amount | Currency |  |

---

## Doctype: Department_prornd

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| dept_id | Department Id | Data |  |
| dept_name | Department | Data |  |
| dept_head | Department Head | Link | User |
| dept_initials | Initials | Data |  |

---

## Doctype: Deposit slip

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_skcd |  | Section Break |  |
| amended_from | Amended From | Link | Deposit slip |
| primary_section | Primary Section | Section Break |  |
| category | Category | Select |  Research Research (Consultancy) D (Consultancy) E (Non Routine) T (Testing) Other Event |
| fund_received_ref | Fund Received Reference | Link | Fund Received |
| research_details_section | Research Project Details | Section Break |  |
| project_title | Project Title | Link | Project Registration |
| principal_investigator | Principal Investigator | Link | User |
| consultancy_details_section | Consultancy / Event Details | Section Break |  |
| consultancy_event_title | Consultancy / Event Title | Data |  |
| principal_consultant_organizer | Principal Consultant / Organizer | Link | User |
| financial_section | Client & Financials | Section Break |  |
| client | Client | Data |  |
| funding_agency | Funding Agency | Link | fundingagency_ |
| gstin_of_funding_agency | GSTIN of Funding Agency | Data |  |
| iitg_invoice_no | IITG Invoice No. | Data |  |
| bank | Bank | Data |  |
| amount_inclusive_of_gst | Amount Inclusive of GST | Currency |  |
| ecs_section | ECS Details | Section Break |  |
| ecs_acc_no | ECS A/C No.	 | Data |  |
| ecs_dates | ECS Dates | Table | Deposit Slip ECS Date |
| calculation_section | GST and Fee Calculations | Section Break |  |
| igst_18 | IGST @18% | Currency |  |
| cgst_9 | CGST @9% | Currency |  |
| sgst_9 | SGST @9% | Currency |  |
| consultancy_charge_y | Consultancy Charge (Y) | Currency |  |
| operational_charge_z | Operational Charge (Z) | Currency |  |
| overhead_amount | Overhead Amount | Currency |  |
| amount_after_gst_tds | Amount Received after GST TDS @ 2% | Currency |  |
| total_cost_x | Total Cost X | Currency |  |
| section_break_qnrm | Calculations | Section Break |  |
| overhead_from_z_multiplier | Overhead from Z Multiplier | Float |  |
| total_overhead_y_multiplier | Total Overhead Y Multiplier | Float |  |
| total_overhead_z_multiplier | Total Overhead Z Multiplier | Float |  |
| institute_share_multiplier | Institute Share Multiplier | Float |  |
| column_break_nfxa |  | Column Break |  |
| overhead_from_z_label | Overhead from Z Label | HTML |  |
| overhead_from_z_amount | Overhead from Z Amount | Currency |  |
| total_overhead_label | Total Overhead Label | HTML |  |
| total_overhead_amount | Total Overhead Amount | Currency |  |
| institute_share_label | Institute Share Label | HTML |  |
| institute_share_amount | Institute Share Amount | Currency |  |
| total_overhead_institute_share | Overhead + Institute Share | Currency |  |

---

## Doctype: Deposit Slip Credit Distribution

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| label | Label  | Data |  |
| recipient_name | Recipient Name (for PDF) | Date |  |
| percentage_of_overhead | % of Overhead | Float |  |
| amount | Amount  | Currency |  |

---

## Doctype: Deposit Slip ECS Date

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| ecs_date | ECS Date | Date |  |

---

## Doctype: Deposit Slip Project Credit

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| project_number | Project Number | Link | Project Registration |
| amount | Amount  | Currency |  |

---

## Doctype: Designation_prornd

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| designation_prornd | User_Designation | Data |  |

---

## Doctype: Details Of Honorarium

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| username | Username | Link | User |
| fullname | Full Name | Data |  |
| designation | Designation | Data |  |
| department | Department | Data |  |
| employee_roll_number | Employment ID / Roll No | Data |  |
| nature_of_work | Nature Of Work | Data |  |
| from_date | From Date | Date |  |
| to_date | To Date | Date |  |
| bank_acc_number | Bank Account Number | Data |  |
| ifsc_code | IFSC Code | Data |  |
| amount | Amount ( In Rupees ) | Currency |  |
| authority_approval_consent | Approval of the Competent Authority attached Yes/No | Select |  Yes No |

---

## Doctype: Direct Purchase

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_vtw2 |  | Section Break |  |
| section_break_jsdg |  | Section Break |  |
| account_head | Account Head | Select |  |
| table_gdxp | Details of Items to be purchased | Table | Items to be purchased |
| table_teqd | Purchase Committee | Table | Purchase Committee |
| file_upoload_section_section | File Upload Section | Section Break |  |
| upload_detailed_specification | Upload Detailed Specification | Attach |  |
| total_estimate | Total Estimate | Data |  |
| is_sanctioned | Were the above items sanctioned by the Funding Agency? | Select | Choose Option Yes No |
| comments_if_any | Comments (If Any) | Small Text |  |
| declaration_section | Declaration | Section Break |  |
| dec_1 |  For non sanctioned item, the PI will be responsible for any financial obligations that may arise. | Check |  |
| dec_2 |  All prices/ amounts mentioned in the form are in India Rupee (INR).  | Check |  |
| register_for | If you are doing this purchase for Self or other User | Select |  Self Other |
| amended_from | Amended From | Link | Direct Purchase |
| applicant_details_section | Applicant Details | Section Break |  |
| applicant_name | Applicant Name | Data |  |
| applicant_department | Applicant Department | Data |  |
| applicant_designation | Applicant Designation | Data |  |
| applying_for_section | Applying For | Section Break |  |
| applying_for_name | Name | Data |  |
| applying_for_department | Department | Data |  |
| applying_for_designation | Designation | Data |  |
| project_no | Project Number | Data |  |

---

## Doctype: Disbursal Detail

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| name_as_per_in_back_account | Name as per in bank account | Data |  |
| disbursal_employee_student | Employee/Student | Select | Employee Student |
| designation | Designation | Link | Designation_prornd |
| disbursal_employee_number_or_role_no | Emp. No./Role No | Data |  |
| disbursal_pdf_no_or_bank_account_no | PDF No./Bank account No. | Data |  |
| disbursal_amount | Amount to be Disbursed (Rs.) | Currency |  |
| disbursal_personal_share | Personal Share (70%)(Rs.) | Currency |  |
| disbursal_institute_share | Institute's Share (30%)(Rs.) | Currency |  |

---

## Doctype: Disbursal of Consultancy

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_tvd4 |  | Section Break |  |
| amended_from | Amended From | Link | Disbursal of Consultancy |
| section_break_mtlg |  | Section Break |  |
| pi_name | PI Name | Data |  |
| webmail_id | Webmail ID | Link | User |
| employee_id | Employee ID | Data |  |
| section_break_garo |  | Section Break |  |
| project_title | Project Title | Data |  |
| date_of_registration | Date of Registration | Date |  |
| date_of_completion | Date of Completion | Date |  |
| section_break_hfic |  | Section Break |  |
| total_amount_received | Total Amount Received | Currency |  |
| current_balance | Current Balance | Currency |  |
| disbursal_project_number | Project Number | Select | Select PDF |
| section_break_vaha |  | Section Break |  |
| details_of_disbursal | Details of Disbursal | Table | Disbursal Detail |
| section_break_xhma |  | Section Break |  |
| please_attach_a_copy_of_completion_report | Please Attach a Copy of Completion Report | Attach |  |
| disbursal_note |  | HTML | <span style="color: #006600;">                                 (PDF No.: Professional Development Fund No. of the Consultant/Employee to which the amount is to be credited)                                 <br><br><b>Note</b>: Tax to be deducted at source if disbursed to employee/consultant, but not if to student or to PDF.                                 </span> |
| section_break_vjlz |  | Section Break |  |
| disbursal_additional_documents | Additional Documents (Max 5 file can be uploaded) | Attach |  |
| institute_share_breakdown | Institute Share Breakdown (Calculated Fields) | Section Break |  |
| total_disbursal_amount | Total Disbursal Amount | Currency |  |
| total_institute_share | Total Institute Share | Currency |  |
| idf | IDF (40% of Inst. Share) | Currency |  |
| dpf | DPF (50% of Inst. Share) | Currency |  |
| staff_welfare_fund | Staff Welfare Fund (5%) | Currency |  |
| total_personal_share | Total Personal Share | Currency |  |
| section_break_lcud |  | Section Break |  |
| student_welfare_fund | Student Welfare Fund (5%) | Currency |  |

---

## Doctype: Disbursal of Honorarium

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_n74s |  | Section Break |  |
| amended_from | Amended From | Data |  |
| applying_for_self_or_other | Applying for self or other | Select |  Self Other |
| applicant_details_section | Applicant Details | Section Break |  |
| webmail_id | Webmail Id | Link | User |
| name_of_applicant | Name of Applicant | Data |  |
| designation_of_applicant | Designation of Applicant | Data |  |
| section_break_jlmp |  | Section Break |  |
| account_head | Account Head | Link | Budget Head |
| section_break_wgvl |  | Section Break |  |
| table_weoy | Details of Honorarium | Table | honorarium_table |
| approval_comp_authority | If Approval of competent authority attached for each beneficiary | Select |  Yes No |
| total_amount | Total Amount | Data |  |
| rules_and_conditions_section | Rules and Conditions | Section Break |  |
| rules |  | HTML | <span style="color: #006600;">                                     1. For payment of honorarium to PhD students availing institute fellowship approval of the <strong>Dean of Academic Affairs</strong> is required.                                     <br>                                     2. For payment of honorarium to staff other than facilities and outsider from the institute the approval of the <strong>Competent Authority</strong> is required.                                     <br>                                     3. The honorarium is disbursed at the request of the Project Investigator. However, if there is any objection from the funding agency the full amount is to be refunded by PI.                                 </span> |
| attached_approvals | Please attach merged copy of all approvals | Attach |  |
| additional_documents | Additional Documents | Attach |  |
| reference_application_number | Reference Application Number | Data |  |
| applying_for_section | Applying For | Section Break |  |
| webmail_id_for | Webmail Id | Link | User |
| name_of_applicant_for | Name of Applicant | Data |  |
| designation_of_applicant_for | Designation of Applicant | Data |  |
| department_for | Department | Data |  |
| project_no | Project Number | Data |  |
| applicant_department | Department | Data |  |

---

## Doctype: Disbursement of Honorarium

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_fbfc |  | Section Break |  |
| amended_from | Amended From | Link | Disbursement of Honorarium |
| section_break_gmuz |  | Section Break |  |
| webmail_id | Webmail ID | Link | User |
| pi_name | PI Name | Data |  |
| emp_id | Employee ID | Data |  |
| section_break_jwgb |  | Section Break |  |
| project_number | Project Number | Link | Project Registration |
| account_head | Account Head | Link | Budget Head |
| section_break_redp |  | Section Break |  |
| honorarium_details | Details of Honorarium | Table | Details Of Honorarium |
| total_disbursal_amount | Total Amount ( In Rupees ) | Currency |  |
| section_break_wvqm |  | Section Break |  |
| honorarium_declaration |  | HTML | <span style="color: #006600;">                                     1. For payment of honorarium to PhD students availing institute fellowship approval of the <strong>Dean of Academic Affairs</strong> is required.                                     <br>                                     2. For payment of honorarium to staff other than facilities and outsider from the institute the approval of the <strong>Competent Authority</strong> is required.                                     <br>                                     3. The honorarium is disbursed at the request of the Project Investigator. However, if there is any objection from the funding agency the full amount is to be refunded by PI.                                 </span> |
| honorarium_attachments | Please Attach merged Copy of All Approvals | Attach |  |

---

## Doctype: DPF Credit Distribution

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| select_dpf_dept_center_school | Select (Department/Center/School) | Link | Department_prornd |
| dpf_amount | DPF Amount | Currency |  |
| column_break_jppg |  | Column Break |  |
| section_break_uwvr |  | Section Break |  |
| department_id | Department Id | Data |  |
| dpf_percentage | DPF % age | Float |  |
| section_break_asxf |  | Section Break |  |
| column_break_bemq |  | Column Break |  |

---

## Doctype: E Non Routine Deposit Slip

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| project_title | Project Title | Link | Project Registration |
| principal_investigator | Principal Investigator | Link | User |
| client | Client | Data |  |
| funding_agency | Funding Agency | Data |  |
| gstin_of_funding_agency | GSTIN of Funding Agency | Data |  |
| ecs_ac_no | ECS A/C No. | Data |  |
| ecs_dates | ECS Dates | Table | Deposit Slip ECS Date |
| bank | Bank | Data |  |
| calculations_section | Calculations | Section Break |  |
| amount_inclusive_of_gst | Amount Inclusive of GST | Currency |  |
| igst_18 | IGST @18% | Currency |  |
| consultancy_fee_x | Consultancy Fee X | Currency |  |
| overhead_multiplier | Overhead Multiplier | Float |  |
| overhead_label | Overhead Label | HTML |  |
| overhead_amount | Overhead Amount | Currency |  |
| credit_distribution_section | Credit Distribution | Section Break |  |
| credit_distribution | Credit as follows | Table | Deposit Slip Credit Distribution |
| additional_project_credits | Additional Credits | Table | Deposit Slip Project Credit |
| totals_section | Totals | Section Break |  |
| total_gst | Total GST | Currency |  |
| total_budget | Total Budget | Currency |  |

---

## Doctype: Email OTP__

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| otp_core_information_section_u_r | OTP Core Information | Section Break |  |
| email_u_r | Email Address | Data |  |
| universal_user_u_r | Universal User | Link | Universal User__ |
| otp_u_r | OTP | Data |  |
| otp_hash_u_r | OTP Hash | Data |  |
| purpose_u_r | Purpose | Select |  Registration Login Password Reset |
| expiry_time_u_r | OTP Expiry Time | Datetime |  |
| last_sent_at_u_r | Last Sent At | Datetime |  |
| is_verified_u_r | Is Verified | Check |  |
| verified_at_u_r | Verified At | Datetime |  |
| is_expired_u_r | Is Expired | Check |  |
| security_and_control_section_u_r | Security and Control | Section Break |  |
| otp_attempts_u_r | OTP Attempts | Int |  |
| resent_count_u_r | Resent Count | Int |  |
| naming_series | Naming Series | Select | U_R_E_OTP.##### |

---

## Doctype: EmployeeClass_prornd

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| empclass_name | Employee Class Name | Data |  |
| workflow_path | Workflow Path | Select | HoD Path Senior Staff Path |

---

## Doctype: Expenditure Detail

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| expenditure_date | Date | Date |  |
| vendors_name | Vendors Name | Data |  |
| particulars | Particulars | Data |  |
| amount_in_rs | Amount (Rs.) | Currency |  |
| attachments_optional | Attachments (Optional) | Attach |  |

---

## Doctype: Extension Of Tenure Of Appointment

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_9pd2 | Extension Of Tenure Of Appointment | Section Break |  |
| amended_from | Amended From | Link | Extension Of Tenure Of Appointment |
| project_title | Project name | Small Text |  |
| project_number | Project No.  | Data |  |
| completion_date | Date of Completion Of Project  | Date |  |
| ps_name | Name  | Small Text |  |
| emp_id | Employee ID  | Small Text |  |
| ps_designation | Designation  | Small Text |  |
| department | Please Select your Department | Link | Department_prornd |
| doj | Initial Date of Joining  | Small Text |  |
| expiry_date | Date of Expiry of Tenure | Small Text |  |
| last_ext_date | Date of Last Extension Applied | Small Text |  |
| no_of_months_worked | No. of month worked | Small Text |  |
| ext_sought | Period Of Extension Sought (Month)  | Int |  |
| basic_pay | Current Basic pay | Int |  |

---

## Doctype: Fund Received

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_jgcd | Reference Details | Section Break |  |
| amended_from | Amended From | Link | Fund Received |
| section_break_qyal | Received Amount & Invoice | Section Break |  |
| fund_received_amt | Fund Received Amount | Currency |  |
| bank_account | Bank Account Number | Data |  |
| section_break_hchd | Transaction & Budget Breakups | Section Break |  |
| gst_invoice_issued | Is GST Invoice Issued? | Select |  Yes No |
| invoice_no | Invoice Number | Data |  |
| fund_transactions | Sanction Transaction Details | Table | Project Fund Transaction |
| received_amt_breakup | Budget Breakup of the Received Amount | Table | Project Received Budget |
| prjreg_title | Project Title | Link | Project Registration |
| document_upload | Upload Supporting Document | Attach |  |
| fund_received_ref_number | Fund Received Ref No. | Data |  |

---

## Doctype: Fund Sanction

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_c67m |  | Section Break |  |
| amended_from | Amended From | Link | Fund Sanction |
| section_break_edqq |  | Section Break |  |
| total_sanctioned_amount | Total sanctioned Amount (₹) | Currency |  |
| sanctioned_letter_no | Sanctioned Letter No. | Data |  |
| sanctioned_letter_date | Date of Sanctioned Letter | Date |  |
| sanctioned_budget_breakup | Total Budget Break-up | Table | Project Sanctioned Budget |
| section_break_wzqv |  | Section Break |  |
| sanction_related_files | Upload Sanction Related Files | Table | Project Sanction File |
| have_fund_details | Have You Received Fund?  | Select | Yes No |
| section_break_gmpc |  | Section Break |  |
| is_gst_invoice_issued | is GST Invoice Issued? | Select |  Yes No |
| invoice_details | Invoice No : | Data |  |
| amount_received | Amount Received (₹) : | Currency |  |
| fund_transactions | Transactions Detail | Table | Project Fund Transaction |
| iitg_bank_account_number | IITG Bank Account Number where amount has been transfered : | Data |  |
| received_amount_breakup | Budget Breakup of the Received Amount  | Table | Project Received Budget |
| project_proposal | Project Registered | Link | Project Registration |
| project_type_linked | Project Type | Select |  |
| refnum_prj_num | Ref Number (Project Registration) | Data |  |
| sanction_workflow_status | Workflow Status | Data |  |

---

## Doctype: honorarium_table

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| name1 | Name | Data |  |
| designation | Designation | Data |  |
| department_section | Department/ Section | Data |  |
| emp_id | Employee Id | Data |  |
| nature_of_work | Nature of Work | Data |  |
| from | From | Date |  |
| to | To | Date |  |
| bank_account_number | Bank account Number | Data |  |
| ifsc_code | IFSC Code | Data |  |
| amount | Amount (In Rs.) | Data |  |

---

## Doctype: ICSS Indent Cum Sanction Sheet Item

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| icss_item_name | Item Name | Data |  |
| icss_item_description | Item Description | Small Text |  |
| icss_justification | Justification | Small Text |  |
| icss_qty | Quantity | Float |  |
| icss_rate | Estimated Rate (₹/item) | Float |  |
| icss_discount_percent | Discount (%) | Float |  |
| icss_gst_percent | GST (%) | Float |  |
| icss_amount | Estimated Amount (₹) | Currency |  |

---

## Doctype: ICSS Standardized Reason Item

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| icss_reason | Reason | Data | <style>     .grid .grid-row-checkbox {         display: none !important;     } </style> |

---

## Doctype: IGF Purchase Committee Detail

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| igf_member_name | Name | Data |  |
| igf_designation | Designation | Select |  PI CO-IP Member |
| igf_webmail_id | Webmail ID | Data | User |

---

## Doctype: IGF Purchase Item Detail

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| igf_item_name | Item Name | Data |  |
| igf_item_description | Item Description | Small Text |  |
| igf_justification | Justification | Small Text |  |
| igf_quantity | Quantity | Int |  |
| igf_estimated_rate | Estimated Rate (price / item in Rs.) | Currency |  |
| igf_estimated_amount | Estimated Amount (total price in Rs.) | Currency |  |

---

## Doctype: IGF Vendor Detail

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| igf_vendor_name | Vendor Name | Data |  |
| igf_address_line_1 | Address Line 1 | Data |  |
| igf_address_line_2 | Address Line 2 | Data |  |
| igf_address_line_3 | Address Line 3 | Data |  |
| igf_contact_no | Contact No. | Data |  |
| igf_email_address | E-mail Address | Data | Email |

---

## Doctype: Indent Cum Sanction Sheet

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_lysy |  | Section Break |  |
| amended_from | Amended From | Link | Indent Cum Sanction Sheet |
| icss_purchase_indent_cum_sanction_sheet_form | Applicant Details | Section Break |  |
| icss_project_details_section | Project Details | Section Break |  |
| icss_account_head | Account Head | Select |  Consumable Contingency Equipment Other |
| icss_other_account_head | Other Account Head (Specify) | Data |  |
| section_break_mibz |  | Section Break |  |
| icss_indent_type | Indent Type | Select |  Proprietary Purchase with Proprietary certificate from the OEM Standerdised/ Emergent Purchase Repair/ Repleacement Annual Maintenance Contract Rate Contract Purchase |
| icss_picssg | PURCHASE INDENT-CUM-SANCTION SHEET GENERAL | Section Break |  |
| icss_item_type | Item Type | Select |  Proprietary Item(s) Standardized Item(s) Direct Purchase(Less than 100000) |
| icss_proprietary_details | Proprietary Items(s) Purchase Details | Section Break |  |
| icss_proprietary_manufacturer | Manufacturer Name | Data |  |
| icss_standardized_details | Standardized Items(s) Purchase Details | Section Break |  |
| icss_standardized_manufacturer | Manufacturer Name | Data |  |
| icss_standardized_reasons | Reasons for not accepting other make/model | Table | ICSS Standardized Reason Item |
| icss_direct_purchase |  | Section Break |  |
| icss_direct_purchase_details | Enter the Direct Purchase Items(s) Purchase Details below | HTML | <div style="font-weight: 600; font-size: 14px; margin-top: 8px;">     Enter the Direct Purchase Item(s) Purchase Details below </div> |
| icss_items | Details of Items to be purchased | Table | ICSS Indent Cum Sanction Sheet Item |
| icss_total_basic_value | Total Estd. Basic Value | Currency |  |
| icss_packing_charges | Add: Packing and Forwarding | Currency |  |
| icss_freight_charges | Add: Freight | Currency |  |
| icss_other_charges | Add: Other Charges | Currency |  |
| icss_grand_total | Grand Total | Currency |  |
| icss_amount_in_words | Amount in Words | Data |  |
| icss_terms_conditions | Terms & Conditions | Section Break |  |
| icss_mode_of_payment | Mode of Payment | Data |  |
| icss_delivery_period | Delivery Period | Data |  |
| icss_warranty_details | Warranty etc. | Small Text |  |
| icss_supplier_name_address | Supplier Name & Address | Small Text |  |
| icss_supplier_email | Supplier Email ID | Data | Email |
| icss_indenter_contact | Indenter Contact Number | Data |  |
| icss_funding_agency_sanctioned | Were the above items sanctioned by the Funding Agency? | Select |  Yes No |
| icss_file_upload_section | File Upload Section | Section Break |  |
| icss_proprietary_certificate | Upload Proprietary Certificate | Attach |  |
| icss_quotation | Upload Quotation | Attach |  |
| icss_declaration_sanctioned_section |  | Section Break |  |
| icss_declaration_sanctioned_text | Declaration Text | HTML | <p><b>DECLARATION</b></p> <p>All prices/ amounts mentioned in the form are in India Rupee (INR).</p>  <p><b>Proprietary Item(s)</b></p> <p> Certified that to the best of our knowledge, the item indented is the proprietary item of M/s ____________ and is marketed by them / their only authorized distributor M/s ____________ in India. To the best of our knowledge there is no other product available in the market that meets the specifications of this item. We shall be held responsible in case the certificate is found to be incorrect. </p>  |
| icss_declaration_sanctioned_accept | I agree to the above declaration | Check |  |
| icss_declaration_nonsanctioned_section | Label DECLARATION | Section Break |  |
| icss_declaration_nonsanctioned_text | Declaration Text | HTML | <p><b>DECLARATION</b></p> <p> For non sanctioned item, the PI will be responsible for any financial obligations that may arise. </p>  <p>All prices/ amounts mentioned in the form are in India Rupee (INR).</p>  <p><b>Proprietary Item(s)</b></p> <p> Certified that to the best of our knowledge, the item indented is the proprietary item of M/s ____________ and is marketed by them / their only authorized distributor M/s ____________ in India. To the best of our knowledge there is no other product available in the market that meets the specifications of this item. We shall be held responsible in case the certificate is found to be incorrect. </p>  |
| icss_declaration_nonsanctioned_accept | I agree to the above declaration | Check |  |
| icss_original_purchase_order | Upload Original Purchase Order(s) | Attach |  |
| icss_repair_section | PURCHASE INDENT-CUM-SANCTION SHEET REPAIR | Section Break |  |
| po_no_under_which_the_item_was_purchased | P.O. No. under which the item was purchased | Data |  |
| icss_repair_item_name | Item/s Name | Data |  |
| icss_repair_justification | Justification / Purpose (Please attach separate sheet if needed) | Small Text |  |
| icss_repair_dimension_weight | Dimension & Weight of the item/s after packing | Data |  |
| icss_repair_under_warranty | Item currently under warranty period | Select |  Yes No |
| icss_repair_vendor_details | Details of Vendor to whom item is proposed to be sent | Small Text |  |
| icss_repair_vendor_email | Vendor Email ID | Data | Email |
| icss_repair_indenter_contact | Indenter Contact Number (10 digits only) | Data |  |
| icss_repair_carrier | Proposed Carrier | Data |  |
| icss_repair_expenditure | Repair Expenditure | Currency |  |
| icss_repair_other_charges | Add: Other Charges (Freight, Custom Duty, etc.) | Currency |  |
| icss_repair_grand_total | Grand Total | Currency |  |
| icss_repair_mode_of_payment | Mode of Payment | Data |  |
| icss_repair_file_upload_section | File Upload Section | Section Break |  |
| icss_repair_upload_po | Upload Original Purchase Order | Attach |  |
| icss_repair_upload_service_report | Upload Service Report | Attach |  |
| icss_repair_declaration_section | DECLARATION | Section Break |  |
| icss_repair_declaration_text |  | HTML | All prices/ amounts mentioned in the form are in India Rupee (INR). |
| icss_repair_declaration_checkbox | I agree to the above declaration | Check |  |
| icss_items_section |  | Section Break |  |
| icss_terms_conditions_section |  | Column Break |  |
| icss_upload_estimate | Upload Estimate | Attach |  |
| icss_repair_grand_total_amount_in_word | Grand Total Amount in Word | Data |  |
| icss_amc_section | PURCHASE INDENT-CUM-SANCTION SHEET AMC | Section Break |  |
| icss_amc_po_number | Original P.O. Number / Reference | Data |  |
| icss_amc_po_date | Dated | Date |  |
| icss_amc_basic_value | Basic Value (BV) of the PO | Currency |  |
| icss_amc_equipment_section | Details of Equipments to be serviced | Section Break |  |
| icss_amc_equipment_name | Name of the Equipment | Data |  |
| icss_amc_equipment_model | Model No. / Sl. No | Data |  |
| icss_amc_installation_date | Date of Installation | Date |  |
| icss_amc_duration | Duration of AMC (Years) | Int |  |
| icss_amc_value | Value of AMC | Currency |  |
| icss_amc_other_charges | Add: Other Charges | Currency |  |
| icss_amc_gst_percent | Add: GST (%) | Float |  |
| icss_amc_grand_total | Grand Total | Currency |  |
| icss_amc_amount_in_words | Amount in Words | Data |  |
| icss_amc_service_provider_section | AMC SERVICE PROVIDER DETAILS | Section Break |  |
| icss_amc_proposal_no | Proposal / Quotation No | Data |  |
| icss_amc_proposal_date | Proposal Dated | Data |  |
| icss_amc_service_provider | Name of Service Provider | Data |  |
| icss_amc_service_provider_contact | Contact Number | Data |  |
| icss_amc_service_provider_email | Email ID | Data | Email |
| icss_amc_indenter_contact | Indenter Contact Number | Data |  |
| icss_amc_payment_term | Term of Payment | Select |  After Completion of Work Advance |
| icss_amc_previous_service_satisfactory | Whether the services rendered during the previous year have been satisfactory or not | Small Text |  |
| icss_amc_file_upload_section | AMC FILE UPLOAD SECTION | Section Break |  |
| icss_amc_upload_estimate | Upload Estimate | Attach |  |
| icss_amc_upload_proposal | Upload Proposal | Attach |  |
| icss_amc_upload_po | Upload Original Purchase Order | Attach |  |
| icss_amc_declaration_section | AMC DECLARATION SECTION | Section Break |  |
| icss_amc_declaration | Declaration | Check |  |
| icss_applicant_webmail_id | Webmail ID | Link | User |
| icss_applicant_name | Applicant Name | Link | User |
| icss_applicant_department__centre__section | Applicant Department / Centre / Section | Link | Department_prornd |
| icss_applicant_designation | Applicant Designation | Data |  |
| applying_for_section | Applying For | Section Break |  |
| icss_applying_for_mail | Applying for Webmail ID | Link | User |
| icss_applying_for_name | Applying for Name | Link | User |
| icss_applying_for_department_centre_section | Appplying For Department / Centre / Section | Link | Department_prornd |
| icss_applying_for_designation | Applying For Designation | Data |  |

---

## Doctype: Indent General Form

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_bu6z |  | Section Break |  |
| amended_from | Amended From | Link | Indent General Form |
| igf_purchase_general_form | Purchase General Form | Section Break |  |
| igf_webmail_id | webmail_Id | Link | User |
| igf_indenter | Indenter | Data |  |
| igf_indenter_designation | Indenter Designation | Data |  |
| igf_webmail_user_id | Webmail User ID | Data |  |
| igf_indenter_details | Indenter Details | Column Break |  |
| section_break_nvnk |  | Section Break |  |
| igf_project_code | Project Code | Data |  |
| igf_project_title | Project Title | Link | Project Registration |
| igf_account_head | Account Head | Select |  Consumable Contingency Equipment Other |
| igf_employee_code | Employee Code | Data |  |
| igf_department_centre_section | Department / Centre / Section | Link | Department_prornd |
| igf_project_details | Project Details | Column Break |  |
| details_of_items_to_be_purchased_section | DETAILS OF ITEMS TO BE PURCHASED | Section Break |  |
| igf_items | Details of Items to be Purchased | Table | IGF Purchase Item Detail |
| igf_total_estimate | Total Estimate | Currency |  |
| igf_sanctioned_by_agency | Were the above items sanctioned by the Funding Agency? | Select | Yes No |
| igf_details_of_vendors | DETAILS OF VENDORS | Section Break |  |
| igf_vendors | Details of Vendors | Table | IGF Vendor Detail |
| igf_purchase_committee | PURCHASE COMMITTEE (Minimum 3 members) | Section Break |  |
| igf_committee_members | Purchase Committee | Table | IGF Purchase Committee Detail |
| igf_committee_note |  | HTML | <p style="font-size: 12px; color: #555; margin-top: 6px;">   <b>*Note:</b>   If the member is from outside, his/her email id should be provided.   Otherwise, the webmail ID excluding the part   <code>@iitg.ac.in</code> should be provided. </p>  |
| igf_tender_details | Tender Details | Section Break |  |
| igf_tender_type | Tender Type | Select |  Limited Tender Open Tender |
| igf_number_of_bids | Number of Bids | Select |  Single Bid (combined technical and price bids) Double Bid (separate technical and price bids) |
| igf_file_upload_section | FILE UPLOAD SECTION | Section Break |  |
| igf_upload_detailed_specification | Upload Detailed Specification | Attach |  |
| igf_upload_vendor_list | Upload Vendor List | Attach |  |
| igf_declaration_section | DECLARATION | Section Break |  |
| igf_declaration_text | For non sanctioned item, the PI will be responsible for any financial obligations that may arise. | Check |   <p style="font-size: 13px;">   All prices / amounts mentioned in the form are in Indian Rupee (INR). </p>  |
| igf_decl_inr_confirmation | All prices / amounts mentioned in the form are in Indian Rupee (INR). | Check |  |

---

## Doctype: IPR Invention Disclosure

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_dpw7 |  | Section Break |  |
| amended_from | Amended From | Link | IPR Invention Disclosure |
| section_break_tdrs |  | Section Break |  |
| ipr_header | INVENTION DISCLOSURE FORM | HTML |                      <p id="heading-panel"><b>The inventor is requested to fill up the following form while submitting an application for filling a patent by Indian Institute of Technology  Guwahati.</b></p>                     <br>                     <hr id="hr-thick">                     <div style="text-decoration: none;font-weight: bolder;">                                          </div>                  |
| section_break_lfbi |  | Section Break |  |
| ipr_date | Date of Submission | Date | today |
| title_of_project_invention | Title of Project / Invention | Data |  |
| section_break_bulh |  | Section Break |  |
| note_for_coinventors |  | HTML | <p>[Note: Please include the names of all co-inventors, Co-inventors include any individual who has conceived or contributed to an essential element of the invention, either independently or jointly with others, during the evolution of the technology or reduction to practice]</p> |
| coinventors_detail | Name of the inventors including faculty, students and staff: | Table | Project Co-Investigator |
| section_break_pxzu |  | Section Break |  |
| source_of_funding | Source of Funding | Select |  Institute Funding Industry Funded Government Aided Consultancy with Contractual Agreement Consultancy without Contractual Agreement Other |
| other_source_of_funding |  | Data |  |
| is_work_bound | Is the work bound by any agreement/contract/MOU? | Select |  Yes No |
| other_is_work_bound |  | Data |  |

---

## Doctype: ipr_student_coinventor_details

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| student_coinventors | Details of students/ staff who participated in the invention but are not inventors: | Section Break |  |
| ipr_name | Name | Data |  |
| ipr_degree | Degree registered for | Data |  |
| ipr_department | Department | Link | Department_prornd |
| ipr_st_rollnumber | Roll No | Data |  |
| ipr_st_email | Email | Data |  |
| ipr_st_home_address | Home Address | Small Text |  |

---

## Doctype: Items to be purchased

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| itemname | Item Name | Data |  |
| itemdesciption | Item Description | Data |  |
| justification | Justification | Data |  |
| quantity | Quantity | Int |  |
| estimatedprice | Estimated Rate (price / item in Rs.) | Currency |  |
| estimated_amount_total_price_in_rs | Estimated Amount (total price in Rs.) | Currency |  |

---

## Doctype: Local Supplier Detail

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| local_supplier_name | Local Supplier Name | Data |  |
| address | Address | Small Text |  |
| email | Email | Data |  |
| discount | Discount | Data |  |

---

## Doctype: manish

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| manish | manish | Data |  |

---

## Doctype: Module Registry

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| doctype_name | Doctypes | Table | Module Registry Item |
| page_name | Page | Data |  |

---

## Doctype: Module Registry Item

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| doctype_name | Doctype Name | Link | DocType |
| mod_vis | Visibilty | Check |  |

---

## Doctype: myProjects

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_qbrq |  | Section Break |  |
| amended_from | Amended From | Link | myProjects |
| section_break_nebz |  | Section Break |  |
| project_title | Project Title | Data |  |
| project_id | Project ID | Data |  |
| status | Project Status | Select | Open Completed On Hold |
| project_proposal | Project Proposal | Link | Project Registration |
| principal_investigator | Principal Investigator | Link | User |
| department | Department | Link | Department_prornd |

---

## Doctype: Other Event Deposit Slip

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| event_title | Event Title | Data |  |
| principal_organizer | Principal Organizer | Link | User |
| client | Client | Data |  |
| funding_agency | Funding Agency | Data |  |
| gstin_no | GSTIN No. | Data |  |
| ecs_ac_no | ECS A/C No. | Data |  |
| ecs_dates | ECS Dates | Table | Deposit Slip ECS Date |
| bank | Bank | Data |  |
| fee_calculations_section | Fee Calculations | Section Break |  |
| amount_inclusive_of_gst | Amount Inclusive of GST | Currency |  |
| gst_multiplier | GST Multiplier | Float |  |
| gst_on_total_fees_label | GST on Total Fees Label | HTML |  |
| gst_amount | GST Amount | Currency |  |
| training_fee | Training Fee | Currency |  |
| overhead_amount | Overhead Amount | Currency |  |
| credit_distribution_section | Credit Distribution | Section Break |  |
| credit_distribution | Credit as follows | Table | Deposit Slip Credit Distribution |
| additional_project_credits | Additional Project Credits | Table | Deposit Slip Project Credit |
| totals_section | Totals | Section Break |  |
| gst_final | GST (Final) | Currency |  |
| total | Total | Currency |  |

---

## Doctype: P_11 Form

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_yafk |  | Section Break |  |
| amended_from | Amended From | Link | P_11 Form |
| the_purchase_committe_recommends_purchase_of_the_items_from_ms | The Purchase committe recommends purchase of the items from M/s | Data |  |
| quotation_recieved_for_purchase_of_the__items_from_ms | Quotation recieved for purchase of the  items from M/s | Data |  |
| details_of_the_items_to_be_purchased_section | DETAILS OF THE ITEMS TO BE PURCHASED | Section Break |  |
| currency | Quoted price in Currency | Data |  |
| table_hsrb |  | Table | p_11_item_table |
| section_break_vvmh |  | Section Break |  |
| total_basic_value | Total Basic Value | Data |  |
| packing_and_forwarding | Add: Packing and Forwarding (Including GST) | Data |  |
| freight | Add: Freight | Data |  |
| other_charges | Add: Other Charges | Data |  |
| grand_total | Grand Total | Data |  |
| declaration | Certified that we the undersigned, members of the purchase committee are jointly. | Check |  |

---

## Doctype: p_11_item_table

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| item_name | Item Name | Data |  |
| item_make | Make | Data |  |
| item_model | Model | Data |  |
| item_description | Item Description | Data |  |
| item_quantity | Quantity | Data |  |
| item_unit_price | Unit Rate (Price) | Data |  |
| item_discount | Discount if any(In amount) | Data |  |
| item_gst | GST (In amount) - GST Exemption is not applicable in Consultancy Projects. Verify with vendor and provide actual GST | Data |  |
| dp_total_price | Total Amount (total price) | Data |  |

---

## Doctype: Particulars of Items Reimbursement

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| particulars_of_items_section | Particulars of Items | Section Break |  |
| r_date | Date | Date |  |
| vendors_name | Vendor's Name | Data |  |
| particulars | Particulars | Data |  |
| amount | Amount | Data |  |
| uploads | Uploads | Attach |  |

---

## Doctype: payments

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| project_id | Project Id | Link | Project Registration |
| section_break_bzzs |  | Section Break |  |
| applicant | Applicant | Data |  |
| application_type | Application Type | Data |  |
| bmr_no | BMR Number | Data |  |
| description | Description | Data |  |
| verify_fund_available | Fund Availability is verified | Check |  |
| button_qzwd |  | Button |  |

---

## Doctype: PDF Credit Distribution

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| select_copi_id | Select PI for PDF distribution | Link | User |
| pdf_amount | PDF Amount | Currency |  |
| section_break_eupw |  | Section Break |  |
| column_break_skqk |  | Column Break |  |
| employee_id | Employee Id | Data |  |
| pdf_percentage | PDF % age | Currency |  |

---

## Doctype: Personal Experience__

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| organization_u_r | Organization | Data |  |
| employment_type_u_r | Employment Type | Select |  Full-time Contract Internship Freelance |
| designation_u_r | Designation | Data |  |
| from_date_u_r | From Date | Date | YYYY |
| to_date_u_r | To Date  | Date |  |
| exp_certificate_u_r | Experience Certificate | Attach |  |
| currently_working_u_r | Currently Working  | Check |  |
| department_u_r | Department (Optional) | Data |  |
| total_experience_u_r | Total Experience | Int |  |
| nature_of_work__responsibilities_u_r | Nature of Work / Responsibilities | Small Text |  |

---

## Doctype: Personal Qualification__

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| level_u_r | Level  | Select |  10th 12th Diploma Bachelor Master PhD |
| course_name_u_r | Course Name | Data |  |
| specialization_u_r |  Specialization | Data |  |
| institution_u_r | Institution | Data |  |
| university_u_r | Board/University | Data |  |
| year_of_passing_u_r | Year Passing | Int |  |
| result_type_u_r | Result Type | Select |  Percentage CGPA Grade |
| score_u_r | Score/Division | Select |  Percentage CGPA Grade |
| certificate_file_u_r | Certificate | Attach |  |

---

## Doctype: Principal Supplier

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| principal_supplier_name | Principal Supplier | Data |  |
| addres | Address | Small Text |  |
| item_type | Item Type | Select |  Chemicals Glassware Plasticware Mixed Catalogue Custom Services Filtration Accessories UPS Batteries HP Printer Cartridges Gas Refilling Copier Papers UPS and Transformers |
| agreement_no | Agreement No | Data |  |
| email | Email | Data |  |
| status | Status | Select | Active Inactive |
| local_suppliers_section_section | Local Suppliers Section | Section Break |  |
| local_suppliers | Local Suppliers | Table | Local Supplier Detail |

---

## Doctype: Project Additional PI

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| pi_name | Name of PI | Data |  |
| pi_email | E-mail | Link | User |
| pi_designation | Designation | Data |  |
| pi_address | Institute / Address | Data |  |
| pi_contact | Contact Number | Data |  |
| pi_department | Department | Data |  |

---

## Doctype: Project Co-Investigator

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| copi_name | Name of PI | Data |  |
| copi_email | E-mail | Link | User |
| copi_designation | Designation | Data |  |
| copi_address | Institute/Address | Small Text |  |
| copi_contact | Contact Number | Data |  |
| copi_department | Department | Data |  |

---

## Doctype: Project Extension

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_sfpw |  | Section Break |  |
| amended_from | Amended From | Link | Project Extension |
| section_break_zlkb |  | Section Break |  |
| project_ref | Select project reference number | Link | Project Registration |
| section_break_bigy |  | Section Break |  |
| applicant_name | Name of the applicant | Data |  |
| email_id | Email id | Link | User |
| prj_num | Project Number | Data |  |
| prj_end_date | End Date of the project | Date |  |
| prj_extended_till_date | Project extended till | Date |  |
| project_extension_heading | Apply Project Extension | Heading |  |

---

## Doctype: project_fund_recive_details

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_pu6b |  | Section Break |  |

---

## Doctype: Project Fund Transaction

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| transaction_number | Transaction Number (UTR No) | Data |  |
| transaction_date | Date | Date |  |
| amount | Amount (₹) | Currency |  |
| attachment | Upload File | Attach |  |

---

## Doctype: Project Number Generation

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| dept_initial | Dept Initial | Data |  |
| category | Category | Select |  C R O |
| emp_id | Emp Id | Data |  |
| emp_initial | Emp Initial | Data |  |
| project_no | Project No. | Data |  |
| current_year1 | Current Year | Data | YY |
| project_type | Project Type | Select |  SP CN OT PD TT |
| select_department | Select Department | Link | Department_prornd |

---

## Doctype: Project Proposal

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_fliv |  | Section Break |  |
| amended_from | Amended From | Link | Project Proposal |
| pi_webmail | If you are registering this project on behalf of other, please enter the email Id of the Principal Investigator | Link | User |
| project_type | Project Type | Select |  Research Consultancy Other |
| section_break_lxre |  | Section Break |  |
| project_title | Project Title | Data |  |
| project_objective | Objective of the Project | Text |  |
| project_deliverables | Deliverables of the Project | Text |  |
| executive_summary | Executive Summary | Text |  |
| upload_proj_prop | Upload Project Proposal | Attach |  |
| section_break_ujap |  | Section Break |  |
| funding_agen | Select Funding Agency | Link | fundingagency_ |
| funding_agency_schemes | Name of the Research Scheme if applicable | Small Text |  |
| column_break_ghbn |  | Column Break |  |
| funding_agency_type | Select Type of Funding Agency | Data |  |
| origin_of_funding_agency | Origin of Funding | Data |  |
| funding_agency_ministry | Ministry | Data |  |
| column_break_zivq |  | Column Break |  |
| address_country | Country | Data | Country |
| address_street_village_locality | Street/Locality Address | Data |  |
| address_state | State | Data |  |
| address_postal_code | Postal Code | Data |  |
| section_break_hlwm |  | Section Break |  |
| implementation_department | Department/Centre where the project will be implemented | Link | Department_prornd |
| consultancy_category | Consultancy Category | Select |  Category D : Technology Transfer / Research Based Category E : Non-Routine Category F : Routine / Testing |
| other_project_type_name | *Mention the (Other Project Type) | Data |  |
| involves_international_travel | Does this project involve international travel? | Select |  Yes No |
| project_duration_months | Duration of the Project (in Months) | Int |  |
| project_duration_days | Number of Days | Int |  |
| project_description | Project Description | Tab Break |  |
| collaborators | Collaborators | Tab Break |  |
| section_break_nlcs | Collaborators | Section Break |  |
| column_break_xgox |  | Column Break |  |
| applicant_type | Applicant Type Id | Link | EmployeeClass_prornd |
| applicant_type_label | Applicant type Name | Data |  |
| section_break_b1jp |  | Section Break |  |
| pi_employee_id | Employee ID of Principal Investigator : | Data |  |
| principal_investigator_name | Name of the Principal Investigator : | Data |  |
| designation | Designation | Data | User |
| applicant_department | Department of Applicant | Link | Department_prornd |
| pi_userid | Webmail of PI | Link | User |
| department_head | Department Head | Link | User |
| head_approver | Head Approver | Link | User |
| column_break_oyet |  | Column Break |  |
| is_additional_pi | Does this project has additional PI? | Select | Yes No |
| additional_pi_table | Details of Additional Principal Investigator(s) | Table | Project Additional PI |
| has_co_pi | Does this project has Co-PI? | Select | Yes No |
| co_investigator_table | Details of Additional Co-Principal Investigator(s) | Table | Project Co-Investigator |
| proposed_budget | Proposed Budget | Tab Break |  |
| budget_proposal_details_section | Budget Details | Section Break |  |
| proposed_budget_breakup | Proposed Budget Break-up | Table | Project Sanctioned Budget |
| section_break_cmno |  | Section Break |  |
| total_first_year_budget | Total 1st year | Currency |  |
| column_break_ifom |  | Column Break |  |
| total_second_year_budget | Total 2nd year | Currency |  |
| column_break_asvd |  | Column Break |  |
| total_third_year_budget | Total 3rd year | Currency |  |
| column_break_zrfq |  | Column Break |  |
| total_fourth_year_budget | Total 4th year | Currency |  |
| column_break_gqta |  | Column Break |  |
| total_fifth_year_budget | Total 5th year | Currency |  |
| column_break_qkyv |  | Column Break |  |
| grand_total_proposal | Grand Total | Currency |  |
| section_break_ekxj |  | Section Break |  |
| total_budget_amount | Total budget amount | Currency |  |
| section_break_teuq |  | Section Break |  |
| check_project_heads | Select the check box to fill the details of project heads | Heading |  |
| equipment_checkbox | Equipment | Check |  |
| manpower_checkbox | Manpower | Check |  |
| proposed_equipment_details | Equipment Details | Table | project_registration_equipment_details |
| proposed_manpower_details | Manpower Details | Table | project_registration_manpower_details |
| committee_clearance | Committee Clearance | Tab Break |  |
| needs_committee_clearance | Does this project need clearance from any committee? | Select |  Yes No |
| section_break_alya |  | Section Break |  |
| clearance_section | Clearance Section | Column Break |  |
| committees | Select Committees: | Select |  Ethics Committee Biosafety Committee Animal Ethics Committee Other |
| other_committee_specify |  | Data |  |
| ethics_committee_details | Select Ethics Committee Clearance(s) | Select | rDNA GMO Transgenic Plants Other |
| ethics_other_details | Specify Other Ethics Details | Data |  |
| biosafety_category | Biosafety Category: | Select | Category I Category II Category III |
| declaration_html | I Accept the above Declaration | Check |  |
| endorsement_prj | Endorsement | Tab Break |  |
| endorsement_status | Endorsement Status | Select | Draft Pending Approval Approved Rejected Put Back |
| approver_signature | Approver Signature | Signature |  |
| approver_name | Approver Name | Data |  |
| approver_date | Approver Date | Datetime |  |
| edited_endorsement_content | Edited Endorsement Content | Text Editor |  |
| fund_agen_initials | Funding Agency Initials | Data |  |
| workflow_status_display | Workflow Status Display | Data |  |
| column_break_okkl |  | Column Break |  |
| column_break_pqgw |  | Column Break |  |
| column_break_svle |  | Column Break |  |

---

## Doctype: Project Received Budget

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| account_head | Account Head. | Link | Budget Head |
| amount_received | Amount Received (₹) | Currency |  |
| remarks | Remarks | Small Text |  |

---

## Doctype: Project Registration

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_nlcs | Collaborators | Section Break |  |
| amended_from | Amended From | Link | Project Registration |
| collaborators | Collaborators | Tab Break |  |
| section_break_ncjw |  | Section Break |  |
| pi_webmail | If you are registering this project on behalf of other, please enter the email Id of the Principal Investigator | Link | User |
| pi_employee_id | Employee ID of Principal Investigator : | Data |  |
| principal_investigator_name | Name of the Principal Investigator : | Data |  |
| project_description | Project Description | Tab Break |  |
| project_title | Project Title | Data |  |
| project_objective | Objective of the Project | Text |  |
| project_deliverables | Deliverables of the Project | Text |  |
| executive_summary | Executive Summary | Text |  |
| implementation_department | Department/Centre where the project will be implemented | Link | Department_prornd |
| multi_department_section |  | Section Break |  |
| project_type | Project Type | Select |  Research Consultancy Other |
| consultancy_category | Consultancy Category | Select |  Category D : Technology Transfer / Research Based Category T : Routine / Testing Category E : Non-Routine |
| proposed_budget | Proposed Budget | Tab Break |  |
| funding_agency_type | Select Type of Funding Agency | Data |  |
| funding_agency_type_other | Please specify the Other type of funding agency | Data |  |
| committee_clearance | Committee Clearance | Tab Break |  |
| needs_committee_clearance | Does this project need clearance from any committee? | Select | Yes No |
| clearance_section | Clearance Section | Section Break |  |
| committees | Select Committees: | Select |  Ethics Committee Biosafety Committee Animal Ethics Committee Other |
| other_committee_specify |  | Data |  |
| need_endorsement_copy | Do you need endorsement copy? | Select | Yes No |
| have_sanction_details | Do you have Sanctioned Details? (if you have ,Which will allow you to go next step of Project Registration) | Select | Yes No |
| sanction_details |  | Section Break |  |
| total_sanctioned_amount | Total sanctioned Amount (₹) | Currency |  |
| sanctioned_budget_breakup | Total Budget Break-up | Table | Project Sanctioned Budget |
| fund_received_section |  | Section Break |  |
| is_gst_invoice_issued | is GST Invoice Issued? | Select |  Yes No |
| invoice_details | Invoice Details : | Data |  |
| amount_received | Amount Received (₹) : | Currency |  |
| fund_transactions | Sanction Transactions Details | Table | Project Fund Transaction |
| iitg_bank_account_number | IITG Bank Account Number where amount has been transfered : | Data |  |
| received_amount_breakup | Budget Breakup of the Received Amount  | Table | Project Received Budget |
| designation | Designation | Data | User |
| additional_pi_table | Details of Additional Principal Investigator(s) | Table | Project Additional PI |
| has_co_pi | Does this project has Co-PI? | Select | Yes No |
| co_investigator_table | Details of Additional Co-Principal Investigator(s) | Table | Project Co-Investigator |
| other_project_type_name | *Mention the (Other Project Type) | Data |  |
| project_duration_months | Duration of the Project (in Months) | Int |  |
| project_duration_days | Number of Days | Int |  |
| involves_international_travel | Does this project involve international travel? | Select |  Yes No |
| funding_agency_other | Please specify the Other funding agency | Data |  |
| total_budget_amount | Total budget amount | Currency |  |
| biosafety_category | Biosafety Category: | Select | Category I Category II Category III |
| sanctioned_letter_no | Sanctioned Letter No. | Data |  |
| sanctioned_letter_date | Date of Sanctioned Letter | Date |  |
| sanction_related_files | Upload Sanction Related Files | Table | Project Sanction File |
| have_fund_details | Have You Received Fund? (if you have received fund ,Which will allow you to go next step of Project Registration.) | Select | Yes No |
| applicant_type | Applicant Type Id | Link | EmployeeClass_prornd |
| research_fields_section | Research Calculations | Section Break |  |
| overhead_research | Overhead (15% of the gross amount) | Currency |  |
| budget_including_overhead_research | Budget including overhead (in Rupees) | Currency |  |
| service_tax_research | Goods & Service Tax | Currency |  |
| grand_total_research | Grand Total | Currency |  |
| overhead_percentage_research | Overhead Percentage (%) | Percent |  |
| ethics_committee_details | Select Ethics Committee Clearance(s) | Select | rDNA GMO Transgenic Plants Other |
| ethics_other_details | Specify Other Ethics Details | Data |  |
| column_break_xjtz |  | Column Break |  |
| declaration_html | I Accept the above Declaration | Check |  |
| endorsement_prj | Endorsement | Tab Break |  |
| applicant_department | Department of Applicant | Link | Department_prornd |
| department_head | Department Head | Link | User |
| head_approver | Head Approver | Link | User |
| applicant_type_label | Applicant type Name | Data |  |
| column_break_oxoo |  | Column Break |  |
| sanction_detail_tab | Sanction Details | Tab Break |  |
| fund_received_tab | Fund Received | Tab Break |  |
| section_break_lqfe | Funding Agency Details | Section Break |  |
| upload_proj_prop | Upload Project Proposal | Attach |  |
| proj_details | Project Details | Section Break |  |
| column_break_lufi |  | Column Break |  |
| budget_proposal_details_section | Budget Details | Section Break |  |
| proposed_budget_breakup | Proposed Budget Break-up | Table | Project Sanctioned Budget |
| check_project_heads | Select the check box to fill the details of project heads | Heading |  |
| equipment_checkbox | Equipment | Check |  |
| manpower_checkbox | Manpower | Check |  |
| proposed_equipment_details | Equipment Details | Table | project_registration_equipment_details |
| proposed_manpower_details | Manpower Details | Table | project_registration_manpower_details |
| nature_funding_agency_non_govt | Nature of Funding Agency | Select |  Reliance Airtel TCS |
| is_additional_pi | Does this project has additional PI? | Select | Yes No |
| select_funding_agency | Select Funding Agency | Select |  DST DBT CSIR ICMR SERB UGC DRDO ISRO AICTE |
| total_first_year_budget | Total 1st year | Currency |  |
| total_second_year_budget | Total 2nd year | Currency |  |
| total_third_year_budget | Total 3rd year | Currency |  |
| total_fourth_year_budget | Total 4th year | Currency |  |
| total_fifth_year_budget | Total 5th year | Currency |  |
| grand_total_proposal | Grand Total | Currency |  |
| section_break_zalt |  | Section Break |  |
| column_break_mmop |  | Column Break |  |
| column_break_rqyu |  | Column Break |  |
| column_break_wygt |  | Column Break |  |
| column_break_nesv |  | Column Break |  |
| section_break_qtll |  | Section Break |  |
| section_break_ufyb |  | Section Break |  |
| column_break_guud |  | Column Break |  |
| text_editor_zwfu | Create your Endorsement | Text Editor |  |
| section_break_sqjc |  | Section Break |  |
| funding_agen | Select Funding Agency | Link | fundingagency_ |
| funding_agency_schemes | Name of the Research Scheme if applicable | Small Text |  |
| column_break_xgsj |  | Column Break |  |
| section_break_uure |  | Section Break |  |
| total_first_year_budget_1 | Total 1st year | Currency |  |
| column_break_dxvf |  | Column Break |  |
| total_second_year_budget_1 | Total 2nd year | Currency |  |
| column_break_jnms |  | Column Break |  |
| total_third_year_budget_1 | Total 3rd year | Currency |  |
| column_break_mvpo |  | Column Break |  |
| total_fourth_year_budget_1 | Total 4th year | Currency |  |
| column_break_nodq |  | Column Break |  |
| total_fifth_year_budget_1 | Total 5th year | Currency |  |
| column_break_eezb |  | Column Break |  |
| grand_total_proposal_1 | Grand Total | Currency |  |
| section_break_oexx |  | Section Break |  |
| origin_of_funding_agency | Origin of Funding | Data |  |
| address_country | Country | Data | Country |
| address_street_village_locality | Street/Locality Address | Data |  |
| address_state | State | Data |  |
| address_postal_code | Postal Code | Data |  |
| funding_agency_ministry | Ministry | Data |  |
| column_break_gtum |  | Column Break |  |
| add_funding_agency_button | Add New FundingAgency | Button |  |
| pi_userid | Webmail of PI | Link | User |
| project_no | Project No. | Data |  |
| my_projects | MyProjects | Link | myProjects |
| fund_agen_initials | Funding Agency Initials | Data |  |
| prj_start_date | Project Start Date | Date |  |
| prj_end_date | Project End Date | Date |  |
| consultancy_calc_section | Consultancy Calculations | Section Break |  |
| consultancy_gstin | GSTIN Number | Data |  |
| consultancy_gst_rate | GST @ % * | Float |  |
| sec_cat_d_inputs | Category D (Technology Transfer/Research) | Section Break |  |
| cat_d_grand_total_input | Grand Total Amount (Inclusive of GST) * | Currency |  |
| cat_d_project_cost_excl_gst | Total Project Cost (Excluding GST) | Currency |  |
| cat_d_consultancy_fee_input | Consultancy Fee/ Honorarium/ Chair Professorship Input * | Currency |  |
| operational_expense_input_inc_10_oh | Operational Expense Input (Contingency/Consumable/Equipment/Travel/Manpower, etc)  | Currency |  |
| sec_cat_d_breakup | Category D Budget Break-up | Section Break |  |
| cat_d_cf_base | Consultancy Fee/Honorarium (Base) | Currency |  |
| cat_d_oe_base | Operational Expenses (Base) | Currency |  |
| cat_d_total_overhead | Total Overhead | Currency |  |
| cat_d_institute_share | Institute Share | Currency |  |
| cat_d_gst_amt | GST Amount | Currency |  |
| cat_d_grand_total_calc | Grand Total (Calculated) | Currency |  |
| sec_cat_ef_breakup | Category T/E Breakdown | Section Break |  |
| cat_ef_total_amount | Total Amount (Excluding GST) * | Currency |  |
| col_break_ef | Breakup Details | Column Break |  |
| cat_ef_honorarium | Honorarium (0.3 * TE) | Currency |  |
| cat_ef_institute_share | Institute Share (0.7 * TE) | Currency |  |
| cat_ef_gst | GST Amount | Currency |  |
| cat_ef_grand_total | Grand Total | Currency |  |
| category_d_note |  | HTML | <div style="color:#0000ff;"><b>Consultancy Type</b><br>                                         <b>Category D: Technology Transfer</b><br>                                         The project is Research Based Consultancy and the minimum duration is 1 year (12 months). The consultancy fee should be less than 30% of the total project cost.                                         </div> |
| category_e_note |  | HTML | <div style="color:#0000ff;"><b>Consultancy Type</b><br>                                         <b>Category E: Non-routine</b><br>                                         The project requires expert advertise and there is no restriction on consultancy fee.<br>                                         </div> |
| category_t_note |  | HTML | <div style="color:#0000ff;"><b>Consultancy Type</b><br>                                         <b>Category T: Routine/Testing</b><br>                                         The project is category T based.<br>                                         </div> |
| gstin_number | GSTIN number | Data |  |
| funding_agency_id | Funding agency id | Data |  |
| for_office_use_only_section | For office use only  | Section Break |  |
| section_break_vwve |  | Section Break |  |
| add_new_funding_agency_details | Add New Funding Agency | Button | fundingagency_ |

---

## Doctype: project_registration_equipment_details

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| item_name | Item Name | Data |  |
| item_description | Item Description | Data |  |
| item_quantity | Item Quantity | Data |  |
| equip_unit_cost | Unit Cost | Currency |  |
| equip_total_unit_cost | Total Unit Cost | Currency |  |

---

## Doctype: project_registration_manpower_details

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| designation_name | Designation Name | Data |  |
| vacancies | Number of Posts | Data |  |
| manpower_salary | Salary | Currency |  |

---

## Doctype: project_sanction_details

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_j1v6 |  | Section Break |  |
| amended_from | Amended From | Link | project_sanction_details |
| total_sanction_amount | Total sanctioned Amount (₹) | Currency |  |
| sanction_letter_no | Sanctioned Letter No. | Data |  |
| sanction_letter_date | Date of Sanctioned Letter | Date |  |
| sanction_budget_breakup | Total Budget Break-up | Table | Project Sanctioned Budget |
| section_break_lvia |  | Section Break |  |
| total_first_year_budget_1 | Total 1st year | Currency |  |
| column_break_jucn |  | Column Break |  |
| total_second_year_budget_1 | Total 2nd year | Currency |  |
| column_break_eeme |  | Column Break |  |
| total_third_year_budget_1 | Total 3rd year | Currency |  |
| column_break_eahd |  | Column Break |  |
| total_fourth_year_budget_1 | Total 4th year | Currency |  |
| column_break_edfr |  | Column Break |  |
| total_fifth_year_budget_1 | Total 5th year | Currency |  |
| column_break_tceb |  | Column Break |  |
| grand_total_proposal_1 | Grand Total | Currency |  |
| section_break_paht |  | Section Break |  |
| sanction_related_file | Upload Sanction Related Files | Table | Project Sanction File |
| have_fund_detail | Have You Received Fund? (if you have received fund ,Which will allow you to go next step of Project Registration.) | Select | Yes No |

---

## Doctype: Project Sanction File

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| sanction_file | File | Attach |  |
| description | Description | Data |  |

---

## Doctype: Project Sanctioned Budget

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| account_head | Account Head | Data |  |
| budget_breakup_details_section | Budget Breakup details | Section Break |  |
| total_proposal_of_heads | Total | Currency |  |
| first_year_budget | 1st Year | Currency |  |
| second_year_budget | 2nd Year | Currency |  |
| third_year_budget | 3rd Year | Currency |  |
| fourth_year_budget | 4th Year | Currency |  |
| fifth_year_budget | 5th Year | Currency |  |
| is_total_row | Is Total Row | Check |  |

---

## Doctype: Project Staff Resignation

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_qaov |  | Section Break |  |
| amended_from | Amended From | Link | Project Staff Resignation |
| section_break_hxwy |  | Section Break |  |
| applicant_emp_id | Employee ID | Data |  |
| applicant_prj_num | Project No. | Data |  |
| applicant_designation | Designation | Data |  |
| applicant_department | Department / Centre / Section | Data |  |
| resignation_date | Date of Resignation | Date |  |
| reason | Reason | Small Text |  |
| applicant_name | Name | Data |  |
| applicant_email_id | Email Id | Link | User |

---

## Doctype: Project Supporting Document

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| description | Description | Data |  |
| attachment | File Upload | Attach |  |
| upload_date | Upload Date | Date |  |

---

## Doctype: proposed budget breakup

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| budget_breakup_section | Budget breakup | Section Break |  |
| budget_of_year | Budget year | Select |  1st 2nd 3rd 4th 5th 6th 7th 8th 9th 10th |
| proposed_budget_breakup | Proposed Budget breakup | Table | Project Sanctioned Budget |
| column_break_pqte |  | Column Break |  |

---

## Doctype: proprietary_purchase

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_6sgc |  | Section Break |  |
| amended_from | Amended From | Link | proprietary_purchase |
| project_no | project_no | Data |  |
| project_ref | project_ref | Data |  |
| proprietary_itemss_purchase_details_section | Proprietary Items(s) Purchase Details | Section Break |  |
| pp_manufacturer_name | Manufacturer Name | Data |  |
| table_qanf | Details of Items to be purchased: | Table | ICSS Indent Cum Sanction Sheet Item |
| pp_estimated_basic_value | Total Estimated Basic Value | Data |  |
| pp_pack_and_forward | Add: Packing and Forwarding | Data |  |
| pp_freight | Add: Freight | Data |  |
| pp_other_charges | Add: Other Charges | Data |  |
| pp_grand_total | Grand Total | Data |  |
| terms_and_conditions | Terms and Conditions | Section Break |  |
| pp_mode_of_payment | Mode of Payment | Data |  |
| pp_delivery_period | Delivery Period | Data |  |
| pp_warranty | Warranty | Data |  |
| pp_supplier_details | Supplier Name & Address | Data |  |
| pp_supplier_email | Supplier Email Id | Data |  |
| pp_indenter_contact_number | Indenter Contact Number | Data |  |
| pp_sanctioned_by_funding_agency | Were the above items sanctioned by the Funding Agency? | Select |  Yes No |
| file_upload_section_section | File Upload Section | Section Break |  |
| pp_proprietary_certificate | Upload Proprietary Certificate | Attach |  |
| pp_upload_quotation | Upload Quotation | Attach |  |
| declaration_section | Declaration | Section Break |  |
| pp_dec_1 |  For non sanctioned item, the PI will be responsible for any financial obligations that may arise. | Check |  |
| pp_dec_2 |  All prices/ amounts mentioned in the form are in India Rupee (INR). | Check |  |
| pp_dec_3 |  Proprietary Item(s) | Check |  |
| html_tfhk |  | HTML | <p>Certified that to the best of our knowledge, the item indented is the proprietary item of M/s ______________  and is marketed by them/ their only authorized distributor M/s _______________  in India. To the best of our knowledge there is no other product available in the market that meets the specifications of this item. We shall be held responsible in case the certificate is found to be incorrect. </p><p></p> |

---

## Doctype: Purchase Committee

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| webmail_id | Webmail Id | Link | User |
| pc_name | Name | Data |  |
| designation | Designation | Data |  |

---

## Doctype: Rate Contract

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_jmgm |  | Section Break |  |
| amended_from | Amended From | Link | Rate Contract |
| section_break_ivll |  | Section Break |  |
| select_form_type | Select Form Type | Select | Select P3 (CHEMICALS/GLASSWARE/PLASTIC WARE UNDER RC) P4 (UPS, UPS BATTERY, HP PRINTER CARTRIDGES,GAS,FURNITURE ETC. UNDER RC) |
| indentor | Indentor | Data | User |
| email_id | Email ID | Link | User |
| applicant_designation | Designation | Data |  |
| applicant_department | Department / Centre / Section | Data |  |
| project_number | Project Number | Link | Project Registration |
| section_break_eyku | Form Types | Section Break |  |
| undertaking |  | Column Break |  |
| header_undertaking |  | HTML | <b>INDENTER/ARC FIRM'S DETAILS &amp; UNDERTAKING BY THE INDENTER:</b> |
| subheader_undertaking |  | HTML | <p>The items as per the details, are required  for my teaching/ research (or as the case may be) purpose                      and these items are available with: (Please mention here the name of the firm as per ARC circular)</p> |
| section_break_rdkv |  | Section Break |  |
| section_break_xbyh |  | Section Break |  |
| column_break_febn |  | Column Break |  |
| rate_contract_total | Rate Contract Total | Currency |  |
| rate_contract_packing | Packing/Freight Etc. | Currency |  |
| amount_in_words | Amount in Words | Small Text |  |
| items | Items | Table | Rate Contract Purchase Item Detail |
| rate_contract_grand_total | Grand Total | Currency |  |
| section_break_jkzq |  | Section Break |  |
| justification | Justification | Small Text |  |
| select_vendor | Select Vendor | Link | Principal Supplier |
| account_head | Account Head | Link | Budget Head |
| p3_section_break | Particulars of ARC (P3) | Section Break |  |
| item_type | Item Type | Select |  Chemicals Glassware Plasticware Filtration Custom Services Mixed Catalogue Gas Refilling |
| principal_supplier | Principal Supplier | Link | Principal Supplier |
| local_supplier | Select Local Supplier | Link | Local Supplier Detail |
| certify_authorized_firm | Certified that the items are for my experiments and procured from the authorized firm only. | Check |  |
| certify_current_prices | Certified that Cat No, Page No and Prices are furnished as per CURRENT APPLICABLE PRICE LIST. | Check |  |
| certify_delivery_time | The materials are to be delivered within two weeks from the date of issue of purchase order. | Check |  |
| principal_address | Principal Supplier Details | Small Text |  |
| agreement_no | Agreement Number | Data |  |
| local_address | Local Supplier Details | Small Text |  |
| local_email | Local Supplier Email | Data |  |
| p4_item_type | Select P4 Item Type | Select |  UPS Batteries HP Printer Cartridges Gas Refilling Copier Papers UPS and Transformers Furniture |
| vendor_address | Vendor Address | Small Text |  |
| vendor_email | Vendor Email | Data |  |
| other_account_head |  | Data |  |
| section_break_piwc |  | Section Break |  |
| section_break_zlko |  | Section Break |  |
| other_pi_email | Webmail-ID of other PI | Link | User |
| name_other_pi | Name of other PI | Data |  |
| is_project_of_other_pi | Is Project of other PI? | Select |  Yes No |
| employee_class | Employee Class | Data |  |
| emp_class_other_pi | Employee class other pi | Data |  |
| other_pi_dept | Department | Data |  |
| pi_head_mentor_user_id | PI/Head/Mentor User Id | Select |  |
| piheadmentor_user_id_other_pi | PI/Head/Mentor User Id (Other PI) | Select |  |
| current_approver | Current Approver | Link | User |

---

## Doctype: Rate Contract Purchase Item Detail

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| item_description | Item Description | Small Text |  |
| cat_no | Cat No. | Data |  |
| page_no | Page No. | Int |  |
| unit_rate | Unit Rate | Currency |  |
| quantity | Quantity | Float |  |
| discount_percentage | Discount (%) | Percent |  |
| gst_percentage | GST (%) | Percent |  |
| amount | Amount | Currency |  |

---

## Doctype: Recruitment Adhoc Contractual

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_e3vp |  | Section Break |  |
| amended_from | Amended From | Link | Recruitment Adhoc Contractual |
| upfa_appointment_section | Appointment Details | Section Break |  |
| upfa_appointment_type | Type of Appointment | Select |  Adhoc Contractual |
| upfa_project_section | Project Details | Section Break |  |
| upfa_project_title | Project Title | Data |  |
| upfa_project_code | Project Code | Data |  |
| upfa_department | Department | Link | Department_prornd |
| upfa_project_duration | Project Duration | Data |  |
| upfa_financial_section | Financial & Interview Details | Section Break |  |
| upfa_funds_sanctioned | Funds Sanctioned for Staff | Currency |  |
| upfa_funds_received | Funds Received for Staff | Currency |  |
| upfa_interview_date | Date of Interview | Date |  |
| upfa_interview_time | Time of Interview | Time |  |
| upfa_interview_venue | Venue | Data |  |
| upfa_pi_contact | PI Contact Number | Data |  |
| details_of_posts_section | Details of Posts | Section Break |  |
| upfa_post_details |  | Table | Unified Project Post Details |
| upfa_selection_committee_section | Selection Committee | Section Break |  |
| upfa_selection_committee |  Members: Minimum 3 selections should be made (PI & Convener and 2 experts). Chairperson will be selected by DoRnD.  | Table | Unified Selection Committee Member |
| upfa_declaration_section | Declaration | Section Break |  |
| upfa_declaration_pi | 	PI will be the convener of the selection committee  | Check |  |
| upfa_declaration_any |  	Any two faculty members of the institute will be expert members | Check |  |
| upfa_declaration_if | If required, as per the funding agency, external members should be part of selection committee  | Check |  |
| upfa_declaration_advertisement | Advertisement cost required for this recruitment shall be incurred from project as selected by me in this application | Check |  |
| column_break_mlei |  | Column Break |  |
| section_break_kbuv |  | Section Break |  |
| head | Head | Data |  |
| webmail_id | Webmail ID | Link | User |

---

## Doctype: Reimbursement

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_tgxi | Bank Details | Section Break |  |
| bank_name | Bank Name | Data |  |
| ifsc_code | IFSC Code | Data |  |
| project_number | Project Number | Data | Project Registration |
| account_head | Account Head | Link | Budget Head |
| comment | Comment | Small Text |  |
| table_bosk | Particulars of Items | Table | Particulars of Items Reimbursement |
| applying_for_section | Applying for | Section Break |  |
| applicant_details_section | Applicant Details | Section Break |  |
| applicant_department | Department  | Data | Department_prornd |
| applicant_designation | Designation | Data |  |
| project_and_item_details_section | Project and Item Details | Section Break |  |
| project_name | Project Name | Link | Project Registration |
| declarations | Declarations | Section Break |  |
| dec1 | None of the items are purchased or under rate contract. | Check |  |
| dec2 | The items purchased were approved by the funding agency. | Check |  |
| dec3 | "I, am personally satisfied that goods purchased. | Check |  |
| dec4 | I stock entered the items, and entered the stock entry details on the reverse side of the cash memo/ money receipt with my signature.  | Check |  |
| account_holder_name | Account Holder Name | Data |  |
| rules |  | Column Break |  |
| rules_content |  | HTML | <li> Maximum Limit ₹ 25000, Not applicable for rate contract items.</li> <li> Splitting the bill applying for reimbursement for the same item is not allowed.</li>  |
| amended_from | Amended From | Link | Reimbursement |
| other_head |  | Data |  |
| reimbursement_for_id | PI Webmail Id | Link | User |
| reimbursement_for_department | Department | Data |  |
| reimbursement_for_designation | Designation | Data |  |
| applicant_webmail | Webmail Id | Link | User |
| bank_account_number | Bank Account Number | Data |  |
| self_other | Applying for self or other? | Select |  Self Other |
| section_break_ujss |  | Section Break |  |

---

## Doctype: Research Consultancy Deposit Slip

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| primary_details | Primary Details | Section Break |  |
| project_title | Project Title | Link | Project Registration |
| principal_investigator | Principal Investigator | Data |  |
| client | Client | Data |  |
| funding_agency | Funding Agency | Link | fundingagency_ |
| gstin_of_funding_agency | GSTIN of Funding Agency | Data |  |
| ecs_ac_no | ECS A/C No. | Data |  |
| ecs_dates | ECS Dates | Table | Deposit Slip ECS Date |
| bank | Bank | Data |  |
| calculations_section | Calculations | Section Break |  |
| amount_inclusive_gst_capital | Amount Inclusive of GST toward (Capital Component) | Currency |  |
| cgst_9 | CGST @9% on Consultancy Fee | Currency |  |
| sgst_9 | SGST @9% on Consultancy Fee | Currency |  |
| project_balance_after_gst | Project Balance (Balance after Deduction of IGST) | Currency |  |
| overhead_amount | Overhead Amount 15% (inclusive) | Currency |  |
| credit_distribution_section | Credit Distribution | Section Break |  |
| credit_distribution | Credit as follows | Table | Deposit Slip Credit Distribution |
| section_break_ahgv |  | Section Break |  |
| total_gst | Total GST | Currency |  |
| total_budget | Total Budget | Currency |  |
| section_break_pouq |  | Section Break |  |
| column_break_zjki |  | Column Break |  |
| section_break_stia |  | Section Break |  |
| idf_amount | IDF | Data |  |
| dpf_cle_amount | DPF/CLE | Data |  |
| staff_welfare_amount | Staff welfare Amount | Data |  |
| student_welfare_amount | Student welfare Amount | Data |  |
| project_number | Project Number | Data |  |
| section_break_ytjt |  | Section Break |  |
| column_break_yrxt |  | Column Break |  |
| prj_amount | Amount | Currency |  |
| column_break_aedd |  | Column Break |  |
| fund_received_ref | Fund Received Ref | Data |  |
| workflow_state | Workflow State | Data |  |

---

## Doctype: Research Deposit Slip

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| principal_investigator | Principal Investigator | Link | User |
| project_details_section | Project Details | Section Break |  |
| project_title | Project Title | Link | Project Registration |
| funding_agency | Funding Agency | Link | fundingagency_ |
| deposit_date | Deposit Date | Date |  |
| payment_information_section | Payment Information | Section Break |  |
| total_amount | Total Deposit Amount | Currency |  |
| overhead_amount | Overhead Amount | Currency |  |
| ecs_scheme_no | ECS / Scheme No | Data |  |
| bank_name | Bank Name | Data |  |
| credit_distribution_section | Credit Distribution | Section Break |  |
| idf_amount | IDF Amount | Currency |  |
| ecs_date | ECS Date | Table | Deposit Slip ECS Date |
| account_number | Account Number | Data |  |
| staff_welfare_amount | Staff Welfare Fund Amount | Currency |  |
| student_welfare_fund | Student Welfare Fund Copy | Data |  |
| final_totals_section | Final Totals | Section Break |  |
| project_no | Project No | Data |  |
| column_break_jomq |  | Column Break |  |
| project_account_balance | Project Balance | Currency |  |
| section_break_yhjm | Total | Section Break |  |
| grand_total | Grand Total | Currency |  |
| column_break_qoje |  | Column Break |  |
| column_break_okfi |  | Column Break |  |
| workflow_state | Workflow State | Data |  |
| fund_received_ref | Fund Received Ref | Data |  |
| section_break_cvry |  | Section Break |  |
| section_break_tlgk |  | Section Break |  |
| section_break_vltb |  | Section Break |  |
| pdf_credit_distribution | (C) PDF Credit Distribution | Table | PDF Credit Distribution |
| dpf_credits |  | Column Break |  |
| dpf_credit_distributions | (B) DPF Credit Distribution | Table | DPF Credit Distribution |
| idf_percentage | (A) IDF % age | Float |  |
| column_break_mwte |  | Column Break |  |
| section_break_pzxp |  | Section Break |  |
| staff_welfare_fund_percent | (D) Staff Welfare Fund %age | Float |  |
| student_welfare_fund_percent | (E) Student Welfare Fund | Float |  |
| column_break_ztan |  | Column Break |  |
| column_break_duag |  | Column Break |  |

---

## Doctype: sanction_sheet

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_qbod |  | Section Break |  |
| amended_from | Amended From | Link | sanction_sheet |
| applicant_column | Applicant  | Column Break |  |
| ss_file_number | File Number | Data |  |
| ss_applicant_name | Applicant Name | Data |  |
| ss_year_period_of_sanction | Year/ Period of Sanction | Data |  |
| ss_department_for_purchase | Name of Department/ Centre placing indents for purchase | Data |  |
| ss_account_head | Head of account to which expenditure is debitable | Data |  |
| ss_funding_agency | Funding Agency | Data |  |
| ss_funds_allocated | Funds allocated under the head (INR) | Data |  |
| ss_balance_available | Balance available (exclusive of this sanction) (INR) | Data |  |
| ss_actual_expenditure | Actual expenditure under the head of account as on date (INR) | Data |  |
| ss_name_of_firms | Name of Firms | Data |  |
| brief_details_of_the_purchase_currency_section | BRIEF DETAILS OF THE PURCHASE (Currency) | Section Break |  |
| table_bttk |  | Table | p_11_item_table |
| section_break_lqsb |  | Section Break |  |
| ss_total_es_basic_value | Total Estimated Basic Value | Data |  |
| ss_pack_forward | Add- Packing and Forwarding (including GST) | Data |  |
| ss_freight | Add- Freight | Data |  |
| ss_other_charges | Add- Other Charges (from applicant) | Data |  |
| ss_grand_total | Grand Total (Currency) | Data |  |
| ss_other_charges_from | Add- Other Charges (Currency) (from) | Data |  |
| small_text_adcz | Remarks | Small Text |  |
| section_refer |  Reference to indents / recommendations from dept. TERMS & CONDITIONS | Section Break |  |
| html_qjfs |  | HTML | <li>Approved indent at A</li> <li>Purchase Committee recommenddation at B</li> |
| ss_warranty | Warranty | Data |  |
| ss_delivery | Delivery | Data |  |
| ss_payment | Payment | Data |  |
| additional_terms_and_conditions_if_any | Additional Terms and Conditions (if any) | Small Text |  |
| declaration_section | DECLARATION | Section Break |  |
| html_dqce |  | HTML | <p>Purchase made under direct procurement of the purchase committee up to 10 lakhs by submission of quotation(s).</p> <p>Principal Investigator</p>  <p>HoS (II&amp;SI)</p>  <p>Assoc. Dean, R&amp;D</p> |

---

## Doctype: sanction_sheet_details_of_purchase

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_ll8g |  | Section Break |  |
| amended_from | Amended From | Link | sanction_sheet_details_of_purchase |

---

## Doctype: standerdized_purchase

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_imwr |  | Section Break |  |
| amended_from | Amended From | Link | standerdized_purchase |
| project_no | project_no | Data |  |
| project_ref | project_ref | Data |  |
| standardized_item_details | Standardized Item(s) Purchase Details | Section Break |  |
| sp_manufacturer_name | Manufacturer Name | Data |  |
| sp_reasons_not_accept | Reasons for not accepting other make or model | Small Text |  |
| details_of_items_to_be_purchased | Details of Items to be purchased | Table | ICSS Indent Cum Sanction Sheet Item |
| sp_total_basic_value | Total Estd. Basic Value | Data |  |
| sp_pack_and_frwd | Add: Packing and Forwarding | Data |  |
| sp_freight | Add: Freight | Data |  |
| sp_other_charges | Add: Other Charges | Data |  |
| sp_grand_total | Grand Total | Data |  |
| terms_and_conditions | Terms and Conditions | Section Break |  |
| sp_mode_of_payment | Mode of Payment | Data |  |
| sp_delivery_period | Delivery Period | Data |  |
| sp_warranty | Warranty | Data |  |
| sp_supplier_name_address | Supplier Name & Address | Data |  |
| sp_supplier_email | Supplier Email Id | Data |  |
| sp_contact_number | Intender Contact Number | Data |  |
| were_the_above_items_sanctioned_by_the_funding_agency | Were the above items sanctioned by the funding agency | Select |  Yes No |
| file_upload_section | File Upload Section | Section Break |  |
| sp_original_puchase_order | Upload Original Purchase Order(s) | Attach |  |
| attach_ykvy |  | Attach |  |
| sp_deaclaration | Declaration | Section Break |  |
| sp_dec_1 |  For non sanctioned item, the PI will be responsible for any financial obligations that may arise. | Check |  |
| sp_dec_2 |  All prices/ amounts mentioned in the form are in India Rupee (INR). | Check |  |
| sp_dec_3 | Standerdised Item(s) | Check |  |
| sp_dec_4 |  | HTML | <p>Certified that the items indented are standardized items/spare parts found to be compatible to the existing sets of equipment. Hence, the required item is to be purchased only from M/s   No other make or Model is acceptable for the following reasons: 1.   2.   3.   We shall be held responsible in case the certificate is found to be incorrect.</p> |

---

## Doctype: T Testing Deposit Slip

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| project_title | Project Title | Link | Project Registration |
| principal_investigator | Principal Investigator | Link | User |
| client | Client | Data |  |
| gstin_of_funding_agency | Funding Agency | Data |  |
| ecs_ac_no | ECS A/C No. | Data |  |
| ecs_dates | ECS Dates | Table | Deposit Slip ECS Date |
| bank | Bank | Data |  |
| calculations_section | Calculations | Section Break |  |
| amount_inclusive_of_gst | Amount Inclusive of GST | Currency |  |
| cgst_9 | CGST @9% | Currency |  |
| sgst_9 | SGST @9% | Currency |  |
| consultancy_fee_x | Consultancy Fee X | Currency |  |
| overhead_multiplier | Overhead Multiplier | Float |  |
| overhead_label | Overhead Label | HTML |  |
| overhead_amount | Overhead Amount | Currency |  |
| credit_distribution_section | Credit Distribution | Section Break |  |
| totals_section | Totals | Section Break |  |
| total_gst | Total GST | Currency |  |
| total_budget | Total Budget | Currency |  |
| idf_t_testing_fee | (a.) IDF | Data |  |
| dpf_t_testing_fee | (b.) DPF/CE | Data |  |
| staff_welfare_t_testing_fund | (c.) Staff Welfare fund | Data |  |
| student_welfare_t_testing_fund | (d.) Student Welfare fund | Data |  |

---

## Doctype: TA DA Other Expense

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| ta_da_expense_type_other_expense | Expense Type | Select | Registration Fee Hotel/Lodging Charges Food Charges Other Charges |
| ta_da_amount_other_expense | Amount (INR) | Currency |  |
| ta_da_proof_other_expense | Proof | Attach |  |

---

## Doctype: TA DA Settlement

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_zj8y |  | Section Break |  |
| amended_from | Amended From | Link | TA DA Settlement |
| section_break_orsk |  | Section Break |  |
| ta_da_travel_application | Select Travel Application | Link | Travel |
| section_break_gvbr |  | Section Break |  |
| ta_da_name | Name | Data |  |
| ta_da_designation | Designation | Data |  |
| ta_da_department_section | Department/Section | Data |  |
| ta_da_employee_number | Employee Number | Data |  |
| ta_da_contact | Contact No. | Int |  |
| ta_da_ifsc_code | IFSC Code | Int |  |
| ta_da_scale_of_pay | Scale Of Pay | Int |  |
| ta_da_bank_account_number | Bank account number | Data |  |
| ta_da_bank_account_holder | Bank Account Holder's Name | Data |  |
| section_break_ynqx |  | Section Break |  |
| ta_da_purpose_of_journey | Purpose of Journey | Small Text |  |
| ta_da_journey_particulars | Particulars of Journey Used (From Station to Station) | Select | Yes No |
| ta_da_local_conveyance_used | Particulars of Local Conveyance Used | Select | Yes No |
| other_expenses_attach_proof_mandatory_section | Other Expenses (Attach Proof Mandatory) | Section Break |  |
| ta_da_other_expenses_p | Other Expenses | Table | TA DA Other Expense |
| ta_da_amount_summary_fields | Amount Summary Fields | Section Break |  |
| ta_da_total_claimed | Total Amount Claimed (INR) | Currency |  |
| ta_da_advance_taken | Advance Taken (INR) | Currency |  |
| ta_da_net_claimed | Net Amount Claimed (INR) | Currency |  |
| comment_section_section | Comment Section | Section Break |  |
| ta_da_comment | Comment | Small Text |  |
| ta_da_additional_comment | Comment, If any | Small Text |  |
| declaration_and_certification_section | I Do hereby Clarify that, | Section Break |  |
| ta_da_check | Distances shown are correct | Check |  |
| ta_da_entitled_class | Traveled in entitled class | Check |  |
| ta_da_shortest_route | Journey by shortest route | Check |  |
| ta_da_not_paid_elsewhere | Claim not paid elsewhere | Check |  |
| ta_da_free_transport | Free Transport Availed | Select |  I have availed any free transport of this Institute or anyone else for the journeys for which claims have been made. I have not availed any free transport of this Institute or anyone else for the journeys for which claims have been made. |
| webmail_id | Webmail Id | Data |  |
| boarding_and_lodging_status | Boarding and Lodging Status | Select |  I was treated as a guest of a Government / an Institution and was allowed free boarding and / or lodging at the expenses of that Government/ the Institution visited. I was treated as a guest of a Government / an Institution and was allowed free boarding and / or lodging at the expenses of that Government/ the Institution visited. I was not treated as a guest of a Government / an Institution and was allowed free boarding and / or lodging at the expenses of that Government/ the Institution visited. I was not treated as a guest of a Govemment / an Institution and was not allowed free boarding and / or lodging at the expenses of that Government/ the Institution visited. |
| project_no | Project Number | Data |  |

---

## Doctype: Temporary Advance

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| advance_for_id | Webmail Id | Link | User |
| advance_for_department | Department | Data |  |
| advance_for_designation | Designation  | Data |  |
| applicant_details | Applicant Details | Section Break |  |
| applicant_webmail | Webmail Id | Link | User |
| applicant_department | Department | Data |  |
| applicant_designation | Designation | Data |  |
| bank_details_section | Bank Details | Section Break |  |
| bank_name | Bank Name | Data |  |
| account | Account Holder Name | Data |  |
| bank_account_number | Bank Account Number | Data |  |
| ifsc_code | IFSC Code | Data |  |
| project_and_amount_details_section | Project and Amount Details | Section Break |  |
| project_code | Project Code | Data |  |
| project_name | Project Name | Data |  |
| account_head | Account Head | Data |  |
| amount | Amount | Currency |  |
| amount_in_words | Amount in words | Data |  |
| justification | Purpose/ Justification | Small Text |  |
| documents | Supporting documents | Attach |  |
| comments | Comments | Small Text |  |
| section_applying_for | Applying For | Section Break |  |
| amended_from | Amended From | Link | Temporary Advance |
| declaration_settlement | I am aware of the rule that temporary advance should be settled within 45 days from the date the advance amount is transferred. | Check |  |
| section_break_hqxl | Declarations | Section Break |  |
| declaration_rate_contract | Declaration Rate Contract | Check |  |
| other_applicant_category | Other Applicant Category (Empclass) | Data |  |
| applicant_category | Applicant Category (Empclass) | Data |  |
| applying_for_select | Are you applying this for someone? | Select |  Yes No |
| section_break_ueiu |  | Section Break |  |
| pi_mentor_user | PI/Mentor User | Link | User |

---

## Doctype: Top Up Fellowship

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_d4hp |  | Section Break |  |
| amended_from | Amended From | Link | Top Up Fellowship |
| application_for_part_time_employment_of_students_section | Application for Part Time Employment of Students   | Section Break |  |
| name_of_student | Name of the Student | Small Text |  |
| roll_number | Roll Number | Small Text |  |
| dept_centre | Department / Centre (where student is currently enrolled) | Link | Department_prornd |
| contact_number | Contact Number | Small Text |  |
| account_number | Bank Account No. | Small Text |  |
| bank_name | Bank Name | Small Text |  |
| ifsc | IFSC Code | Small Text |  |
| branch_code | Bank Branch Code | Small Text |  |
| account_holder_name | Account Holder Name | Small Text |  |
| programme | Select Programme | Data |  |
| webmail | Webmail ID | Data |  |
| declaration_section | DECLARATION | Section Break |  |
| checkbox1 | I hereby promise that I will perform the assigned teaching assistantship duty by the Department / Center without any compromise.  | Check |  |
| checkbox2 | I will ensure that there will not be any compromise in my academic and research performance.  | Check |  |
| checkbox3 | This part-time employment can be cancelled by the competent authority without giving any notice period.  | Check |  |
| pi_webmail | Webmail ID of Supervisor/ Faculty Adviser | Data |  |
| details_of_supervisor_section | Details of Supervisor | Section Break |  |

---

## Doctype: Travel

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_oqr2 |  | Section Break |  |
| amended_from | Amended From | Link | Travel |
| applicant_name_travel | Name of the Applicant | Data |  |
| webmail_id_travel | webmail_Id | Link | User |
| department_travel | Department | Link | Department_prornd |
| designation_travel | Designation of the applicant | Data |  |
| details_travel | Details of the Journey | Section Break |  |
| visit_type_travel | Type Of Visit | Select |  Conference Field Visit Other |
| if_traveler | Applying for self or other?  | Select |  Self Other |
| other_traveler | Name of the traveler | Link | User |
| other_traveler_address | Designation and full address of traveler | Data |  |
| specify_type_of_visit | Specify Type of Visit | Data |  |
| nature_of_travel | Nature of Travel | Select |  Local National International |
| venue_address | Venue / Address of Visit | Small Text |  |
| travel_period_section | Travel Period | Section Break |  |
| from_date | From Date | Date |  |
| to_date | To Date | Date |  |
| organizing_authority | Organizing Authority | Small Text |  |
| purpose_of_visit | Purpose of Visit | Small Text |  |
| account_heads_section | Assitance Details | Section Break |  |
| travel_head | Travel | Check |  |
| contingency_head | Contingency | Check |  |
| travel_project_number | Auto selected project Number | Data |  |
| travel_project_title | Auto selected project Title | Link | Project Registration |
| travel_financial_assistance | Do you require financial assistance? | Select |  Yes No |
| travel_mode_of_travel | Mode of Travel | Select | By Air By Train By Road |
| section_break_jfah |  | Section Break |  |
| travel_special_casual_leave | Special Casual Leave (R&D Section) | Select |  Required Not Required |
| travel_leave_from_date | Leave Period – From Date | Date |  |
| travel_leave_to_date | Leave Period – To Date | Date |  |
| station_leave_details_section |  | Section Break |  |
| travel_station_leave_from_date | Station Leave From Date | Date |  |
| travel_station_leave_from_session | Station Leave (From Session) | Select | Full Day Forenoon Afternoon |
| travel_station_leave_to_date | Station Leave To Date | Date |  |
| travel_station_leave_to_session | Station Leave (To Session) | Select | Full Day Forenoon Afternoon |
| section_break_zlyp | Are you currently holding any additional administrative or academic responsibility? | Section Break |  |
| travel_additional_responsibility | Examples include HOD, HOC, HOS, Warden, Chairman of a Committee, or similar roles. | Select | Yes No |
| travel_additional_responsibility_details | Please provide details of the position(s) held | Small Text |  |
| arrangement_for_classes_during_the_proposed_leave_section | Arrangement for Classes During the Proposed Leave | Section Break |  |
| travel_classes_arrangement | Number of Classes | Int |  |
| comments__remarks_if_any_section | Comments / Remarks (if any) | Section Break |  |
| travel_comment_if_any | Additional Remarks (if any) | Small Text |  |
| travel_declaration_section | DECLARATION | Section Break |  |
| declaration_section |  | Column Break |  |
| travel_declaration_text | Declaration Text | HTML | <p> I hereby certify that my participation in the above-mentioned conference/workshop/seminar is in the interest of teaching and research at this Institute. I further confirm that suitable arrangements will be made to fulfill my academic and research responsibilities during the period of my leave/absence. </p>  <p> I also certify that the proposed travel has a direct relevance to the Project for which financial support is being sought. It is requested that permission for attending the event, grant of leave, and financial assistance may kindly be accorded. </p>  <p> I declare that the travel and related expenses claimed herein have not been, and will not be, claimed from any other source. </p>  |
| travel_declaration_accepted | I hereby accept and agree to the above declaration | Check |  |
| trvel_leave_balance_section | Apply for Travel  | Section Break |  |
| travel_right_column |  | Column Break |  |
| travel_leave_balance_html | Leave Balance | HTML | <div style="border:1px solid #d1d8dd; padding:10px; border-radius:6px;">     <strong>Special Casual Leave (SCL)</strong><br>     <span>30 days remaining</span> </div>  |
| travel_supporting_documents | Supporting Documents | Attach |  |
| bank_details_section | Temporary Advance and Bank Details for this Travel | Section Break |  |
| bank_account_holder | Bank Account Holder's Name | Data |  |
| bank_account_number | Bank account number | Data |  |
| ifsc_code | IFSC Code | Data |  |
| est_travel_amt | Travel Estimate | Currency |  |
| est_travel_file | Travel Attachment | Attach |  |
| sec_break_est_2 | ESTIMATE OF FINANCIAL ASSISTANCE | Section Break |  |
| est_reg_amt | Registration Fee | Currency |  |
| col_break_est_2 |  | Column Break |  |
| est_reg_file | Registration Attachment | Attach |  |
| est_accom_amt | Accommodation + Food | Currency |  |
| est_accom_file | Accommodation Attachment | Attach |  |
| est_other_amt | Any other | Currency |  |
| est_other_desc | Specify Other | Data |  |
| total_estimate | Total Estimate | Currency |  |
| est_validation_html | Validation Message | HTML |  |
| column_break_skdw |  | Column Break |  |
| section_break_tfys | Special Casual Leave | Section Break |  |
| column_break_xrfg |  | Column Break |  |
| column_break_yzkt |  | Column Break |  |
| column_break_yptc |  | Column Break |  |
| traveler_webmail_id | Traveler Webmail Id | Link | User |
| section_break_lroa | Applicant Details | Section Break |  |
| section_break_lgbn |  | Section Break |  |
| leave_balance_head |  | HTML | <h3 class="right-top-heading" style="color:#006600; font-weight: bolder; font-size: 20px; margin-top:25px;">Your Leave Balance</h3> |
| account_head_details_section | Account Head Details | Section Break |  |
| station_leave_required_section | Station Leave Details | Section Break |  |
| station_leave_required | Station Leave Required | Select |  Required Not Required |
| alternative_arrangement | Alternative Arrangement | Text |  |
| other_acc_head | Other | Check |  |
| specify_other_acc_head | Specify that Other Account Head Detail | Data |  |
| column_break_tewx |  | Column Break |  |
| column_break_anji |  | Column Break |  |
| do_you_need_advance | Do you need Advance? | Select |  Yes No |

---

## Doctype: UC Request

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_vjtv |  | Section Break |  |
| amended_from | Amended From | Link | UC Request |
| uc_request | Apply Request for Utilization Certificate | Section Break |  |
| project_id | Select Project | Link | Project Registration |
| application_details_section | Application Details | Section Break |  |
| pi_name | Name of the applicant | Small Text |  |
| uc_type | Select UC Type | Select |  Revised UC Intermediate UC Final UC Audited UC |
| total_sanction_amount | Total Sanctioned Amount | Float |  |
| uc_upload | FILE UPLOAD SECTION | Section Break |  |
| prev_uc | Upload Previous UC (if applicable) | Attach |  |
| uc_format | Upload Format (if applicable) | Attach |  |
| uc_comment | Comment | Section Break |  |
| uc_comment_if_any | Comment, If any | Small Text |  |

---

## Doctype: Unified Project Post Details

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| upfa_designation | Project Staff Designation | Data |  |
| upfa_vacancies | Number of Vacancies | Int |  |
| upfa_basic_pay | Basic Pay Recommended | Currency |  |
| upfa_hra_percent | HRA Percentage | Select |  18% 16% 20% |
| upfa_medical_required | Medical Required | Check |  |
| upfa_total_amount | Total Amount | Currency |  |
| upfa_duration_months | Duration (Months) | Int |  |
| upfa_qualification | Qualification | Small Text |  |
| upfa_justification | Justification | Small Text |  |

---

## Doctype: Unified Selection Committee Member

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| webmail_id__email | Webmail ID / Email | Link | User |
| upfa_member_name | Name | Data |  |
| upfa_member_designation | Designation | Select |  PI & Convener Expert Member External Expart |

---

## Doctype: Universal Address__

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| address_type_u_r | Address Type  | Select |  Permanent Current Registered Postal Branch Factory |
| address_line_1_u_r | House/Building  | Data |  |
| address_line_2_u_r | Street/Locality  | Data |  |
| landmark_u_r | Landmark | Data |  |
| pincode_u_r | PIN Code | Data |  |
| district_u_r | District | Data |  |
| city_u_r | City | Data |  |
| state_u_r | State | Data |  |
| is_same_as_permanent_u_r | Is Current/Same | Check |  |

---

## Doctype: Universal Bank Details__

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| beneficiary_name_u_r | Beneficiary Name | Data |  |
| account_number_u_r | Account Number | Data |  |
| confirm_account_number_u_r | Confirm Account No. | Data |  |
| ifsc_code_u_r | IFSC Code | Data |  |
| bank_name_u_r | Bank Name | Data |  |
| branch_name_u_r | Branch Name | Data |  |
| account_type_u_r | Account Type | Select |  Savings Current Salary NRE NRO OD CC |
| is_primary_u_r | Is Primary | Check |  |
| attachment_u_r | Cancelled Cheque | Attach Image |  |
| bank_passbook_front_page_u_r | Bank Passbook Front Page | Attach Image |  |

---

## Doctype: Universal Documents__

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| document_name_u_r | Document Name | Data |  |
| document_type_u_r | Document Type | Select |  Identity Legal Tax Certificate Experience |
| id_number_u_r | ID Number | Data |  |
| file_u_r | Document File | Attach |  |
| expiry_date_u_r | Expiry Date | Date |  |

---

## Doctype: Universal Registration__

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| section_break_ih7c |  | Section Break |  |
| amended_from | Amended From | Link | Universal Registration__ |
| classification_and__status_section | Classification and  Status | Section Break |  |
| address_details | Addresses | Table | Universal Address__ |
| contact_designation | Contact Designation | Data |  |
| profile_type_u_r | Profile Type | Select |  Individual / Personal Organization |
| organization_sub_type_u_r | Org Sub-Type | Select |  Vendor Institution Company Funding Agency Govt Body Local Supplier Principle Supplier |
| full_name_u_r | Full Name | Data |  |
| guardian_name_u_r | Parent/Guardian | Data |  |
| dob_u_r | Date of Birth | Date |  |
| gender_u_r | Gender | Select |  Male Female Other |
| nationality_u_r | Nationality | Data |  |
| mobile_number_u_r | Mobile Number | Phone |  |
| email_address_u_r | Email Address | Data |  |
| qualifications_u_r | Qualifications | Table | Personal Qualification__ |
| experiences_u_r | Experience | Table | Personal Experience__ |
| org_name_u_r | Organization Name | Data |  |
| est_date_u_r | Incorporation Date | Data |  |
| nature_of_business_u_r | Nature of Business | Small Text |  |
| website_u_r | Website | Data |  |
| contact_person_u_r | Contact Person Name | Data |  |
| org_contact_number_u_r | Contact Phone | Data |  |
| org_address_details_u_r | Registered Address | Table | Universal Address__ |
| bank_details_u_r | Bank Details | Table | Universal Bank Details__ |
| uploaded_documents_u_r | Uploaded Docs | Table | Universal Documents__ |
| personal_information_section_u_r | Personal Information | Section Break |  |
| personal_history_section_u_r | Personal History | Section Break |  |
| organization_basic_details_section_u_r | Organization Basic Details | Section Break |  |
| financial_and_documents_common_section_u_r | Financial and Documents (Common) | Section Break |  |
| whatsapp_number_u_r | Whatsapp Number | Phone |  |
| same_as_mobile_number_u_r | Same as mobile number. | Check |  |
| alternate_mobile_number_u_r | Alternate Mobile Number | Phone |  |
| organization_mobile_number_u_r | Mobile Number | Phone |  |
| email_oraganization__contact_person_u_r | Email (Oraganization / Contact Person) | Data |  |
| type_of_business_u_r | Type of Business | Select |  Supply Works Service Others |
| other_business_type_u_r | Other Business | Data |  |
| nature_of_org | Nature of Org | Select |  Proprietorship Partnership Company Registered |
| gst_status_u_r | GST Status | Select |  |
| pan_number_org_u_r | PAN Number (Org.) | Data |  |
| other_registration_u_r | Other Registration | Data |  |
| decl_info_true_u_r | Info Declaration | Check |  |
| signatory_name_u_r | Signatory Name | Data |  |
| signatory_designation_u_r | Designation | Attach Image |  |
| date_of_signing_u_r | Date of Signing | Date |  |
| vendor_declarations_and_signatory_section_u_r | Vendor Declarations and Signatory | Section Break |  |
| vendor_profile_and_statutory_section_u_r |  Vendor Profile and Statutory | Section Break |  |
| gst_number_u_r | GST Number | Data |  |
| overhead_percentage_u_r | Overhead % | Percent |  |
| discount_percentage_u_r | Discount % | Percent |  |
| agreement_number_u_r | Agreement No | Data |  |
| compliance_and_sub_type_logic_section_u_r | Compliance and Sub Type Logic | Section Break |  |
| universal_user_u_r | Universal User | Link | Universal User__ |
| naming_series | Naming Series | Select | UNIREG-.##### |

---

## Doctype: Universal User__

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| identity_information_section_u_r | Identity Information | Section Break |  |
| full_name_u_r | Full Name | Data |  |
| email_u_r | Email Address | Data |  |
| profile_type_u_r | Profile Type | Select | Individual Organization |
| username_u_r | Username | Data |  |
| is_email_verified_u_r | Is Email Verified | Check |  |
| email_verification_section_u_r | Email Verification | Section Break |  |
| password_section_u_r | Password & Security | Section Break |  |
| password_hash_u_r | Password Hash | Data |  |
| password_salt_u_r | Password Salt | Data |  |
| password_set_on_u_r | Password Set On | Datetime |  |
| is_password_set_u_r | Is Password Set | Check |  |
| system_mapping_section_u_r | System Mapping (Internal Only) | Section Break |  |
| auth_user_id_u_r | Auth User ID | Data |  |
| status_u_r | Account Status | Select | Active Inactive Suspended |
| is_auth_enabled_u_r | Is Auth Enabled | Check |  |
| auth_created_on_u_r | Auth Created On | Datetime |  |
| audit_section_u_r | Audit Information | Section Break |  |
| created_by_ip_u_r | Created By IP | Data |  |
| last_login_at_u_r | Last Login At | Datetime |  |

---

## Doctype: Utility Access

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| utility_name | Page Name | Data |  |
| is_assigned | Is Assigned | Check |  |
| utility_description | Utility Description | Small Text |  |
| utility_type | Utility Type | Select |  utilities staff travel advance purchase projects recruitment upload Monthly Attendance profile disbursal noc salary search |
| page_url | Page URL | Data |  |
| module_name_rndops | Module Name | Link | Module Def |

---

## Doctype: Utility Assignment

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| assignment_type | Assignment Type | Select | Select Employee Class based Profile based Employee ID based |
| user | User | Link | User |
| role_profile | Role Profile | Select |  All_ProRnd_User Senior Staff System Manager Independent Researcher Permanent Employee staff, RnD Hos, RnD (Head of Section, RnD) Mentor head_approver_1 project staff Dean, RnD |
| employee_class | Employee Class | Link | EmployeeClass_prornd |
| utilities | Utilities | Table | Utility Access |
| section_utilities |  | Section Break |  |
| update_assignments_button | Update Assignments | Button |  |
| section_break_hlgw |  | Section Break |  |
| section_break_aggi |  | Section Break |  |
| user_full_name | Name | Read Only |  |
| column_break_cxgo |  | Column Break |  |
| user_department | Department | Read Only |  |
| user_designation | Designation | Read Only |  |

---

## Doctype: Workflow Status Permission

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| title | title | Data |  |
| workflow | workflow | Link | Workflow |
| mappings | mappings | Table | Workflow Status Permission Item |
| enabled | enabled | Check |  |

---

## Doctype: Workflow Status Permission Item

| Field Name | Label | Field Type | Options (Link/Child Table) |
|------------|-------|-----------|----------------------------|
| status_name | status name | Data |  |
| role | role | Link | Role |
| user | user | Link | User |
| note | note | Data |  |
| section_break_ptxm |  | Section Break |  |

---
