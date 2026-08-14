/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import {
  useFrappePostCall,
  useFrappeAuth,
  useFrappeGetCall,
} from "frappe-react-sdk";
import {
  DynamicFormRenderer,
  type FormField,
  type LinkOption,
} from "@/components/forms/DynamicFormRenderer";
import {
  icssAPI,
  proprietaryPurchaseAPI,
  standardizedPurchaseAPI,
  repairReplacementAPI,
  rateContractAPI,
  annualMaintenanceContractAPI,
  prepareFormDataForApi,
} from "@/services/apiService";
import {
  Loader2,
  ArrowLeft,
  Save,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  FolderOpen,
  X,
  CalendarIcon,
  FileSpreadsheetIcon as LedgerIcon,
  AlertCircle,
  Upload,
  FileText,
  ExternalLink,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import ProjectDetailsOverview from "@/pages/ProjectDetailsOverview";
import { useUserRoles } from "@/components/UserRole";
import { useProjectBudget } from "@/hooks/useProjectBudget";
import { ProjectLedgerModal } from "@/components/ProjectLedgerModal";
import { CommitPayment } from "@/components/CommitPayment";
import { POEditor } from "@/components/POEditor";
import { FloatingActivityLogButton } from "@/components/FloatingActivityLogButton";
import { getFileUrl } from "@/utils/fileUtils";
import { ErrorModal } from "../../components/ErrorModal";
import { parseFrappeError } from "../../utils/errorUtils";
import {
  generatePOHtml,
  getAmcPoGrandTotal,
  getAmcPoGstAmount,
  getAmcPoTotal,
  getDefaultTermsForIndentType,
  getPoIndentTypeDisplayName,
  getPoVariantCopy,
  isAnnualMaintenanceContractIndent,
} from "@/utils/IcssPoPrint";

// --- CLAUDE UI WRAPPERS ---
const FrappeCard = ({ children, className }: any) => (
  <Card
    className={cn(
      "border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#27272A] shadow-sm rounded-xl overflow-hidden",
      className,
    )}
  >
    <CardContent className="p-0">{children}</CardContent>
  </Card>
);

const FrappeButton = ({
  children,
  className,
  variant = "primary",
  ...props
}: any) => (
  <Button
    variant={
      variant === "primary"
        ? "default"
        : variant === "ghost"
          ? "ghost"
          : "outline"
    }
    className={cn(className)}
    {...props}
  >
    {children}
  </Button>
);

type StageStatus = "completed" | "in-progress" | "pending" | "rejected";


const toNumber = (value: any) => {
  if (value === undefined || value === null || value === "") return 0;
  if (typeof value === "number") return value;
  return Number(String(value).replace(/,/g, "")) || 0;
};

const roundCurrency = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const escapeHtml = (value: any) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getNumericAmount = (value: any) => {
  return toNumber(value);
};

const ICSS_PO_DRAFT_JSON_MARKER = "ICSS_PO_DRAFT_JSON:";

const appendIcssPoDraftSnapshot = (
  html: string,
  draft: Record<string, any>,
) => {
  try {
    const encodedDraft = encodeURIComponent(JSON.stringify(draft));
    return `${html}\n<!--${ICSS_PO_DRAFT_JSON_MARKER}${encodedDraft}--><div data-icss-po-draft-json="${encodedDraft}" style="display:none"></div>`;
  } catch {
    return html;
  }
};

const extractIcssPoDraftSnapshot = (html?: string | null) => {
  if (!html || typeof html !== "string") return null;
  const match =
    html.match(/<!--ICSS_PO_DRAFT_JSON:([\s\S]*?)-->/) ||
    html.match(/data-icss-po-draft-json="([^"]+)"/);
  if (!match?.[1]) return null;

  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
};

const getFrappeErrorMessage = (error: any, fallback: string) => {
  const serverMessages = [
    error?._server_messages,
    error?.response?._server_messages,
    error?.response?.data?._server_messages,
    error?.exception,
    error?.response?.exception,
    error?.response?.data?.exception,
    error?.message,
  ];

  for (const message of serverMessages) {
    if (!message) continue;

    if (typeof message === "string") {
      try {
        const parsed = JSON.parse(message);
        const parsedMessages = Array.isArray(parsed) ? parsed : [parsed];
        const firstMessage = parsedMessages
          .map((item) => {
            if (typeof item === "string") {
              try {
                return JSON.parse(item)?.message || item;
              } catch {
                return item;
              }
            }
            return item?.message;
          })
          .find(Boolean);
        if (firstMessage) return firstMessage;
      } catch {
        return message;
      }
    }
  }

  return fallback;
};

const isStandardizedIndentType = (indentType: any) => {
  const normalized = String(indentType || "")
    .trim()
    .toLowerCase();
  return (
    normalized.includes("standardized") ||
    normalized.includes("standerdized") ||
    normalized.includes("emergent")
  );
};

const getStandardizedGrandTotal = (data: Record<string, any>) => {
  const savedTotal = getNumericAmount(data.sp_grand_total);
  if (savedTotal > 0) return savedTotal;

  const hasStandardizedAmountFields = [
    "sp_total_basic_value",
    "sp_pack_and_frwd",
    "sp_freight",
    "sp_other_charges",
  ].some(
    (fieldname) =>
      data[fieldname] !== undefined &&
      data[fieldname] !== null &&
      data[fieldname] !== "",
  );

  if (!hasStandardizedAmountFields) return 0;

  return roundCurrency(
    getNumericAmount(data.sp_total_basic_value) +
    getNumericAmount(data.sp_pack_and_frwd) +
    getNumericAmount(data.sp_freight) +
    getNumericAmount(data.sp_other_charges),
  );
};

const TABLE_CHILD_FIELD_FALLBACKS: Record<
  string,
  Array<Record<string, any>>
> = {
  "ICSS Indent Cum Sanction Sheet Item": [
    { fieldname: "icss_item_name", label: "Item Name", fieldtype: "Data" },
    {
      fieldname: "icss_item_description",
      label: "Item Description",
      fieldtype: "Small Text",
    },
    {
      fieldname: "icss_justification",
      label: "Justification",
      fieldtype: "Small Text",
    },
    { fieldname: "icss_qty", label: "Quantity", fieldtype: "Float" },
    {
      fieldname: "icss_rate",
      label: "Estimated Rate (₹/item)",
      fieldtype: "Float",
    },
    {
      fieldname: "icss_discount_percent",
      label: "Discount (%)",
      fieldtype: "Float",
    },
    { fieldname: "icss_gst_percent", label: "GST (%)", fieldtype: "Float" },
    {
      fieldname: "icss_amount",
      label: "Estimated Amount (₹)",
      fieldtype: "Currency",
    },
  ],
  "Rate Contract Purchase Item Detail": [
    {
      fieldname: "item_description",
      label: "Item Description",
      fieldtype: "Small Text",
    },
    { fieldname: "cat_no", label: "Cat No.", fieldtype: "Data" },
    { fieldname: "page_no", label: "Page No.", fieldtype: "Int" },
    { fieldname: "unit_rate", label: "Unit Rate", fieldtype: "Currency" },
    { fieldname: "quantity", label: "Quantity", fieldtype: "Float" },
    {
      fieldname: "discount_percentage",
      label: "Discount (%)",
      fieldtype: "Float",
    },
    { fieldname: "gst_percentage", label: "GST (%)", fieldtype: "Float" },
    { fieldname: "amount", label: "Amount", fieldtype: "Currency" },
  ],
};

const attachMissingTableChildFields = (fields: FormField[] = []) =>
  fields.map((field) => {
    if (field.fieldtype !== "Table" || field.child_fields?.length) {
      return field;
    }

    const fallbackChildFields = field.options
      ? TABLE_CHILD_FIELD_FALLBACKS[field.options]
      : null;

    if (!fallbackChildFields?.length) {
      return field;
    }

    return {
      ...field,
      child_fields: fallbackChildFields as FormField["child_fields"],
    };
  });

const normalizeLinkOptionList = (options: any[] = []): LinkOption[] =>
  options
    .map((option) => {
      if (typeof option === "string") {
        return { value: option, label: option };
      }

      const value = option?.value ?? option?.name ?? "";
      const label = option?.label ?? option?.title ?? value;

      if (!value) return null;

      return {
        value: String(value),
        label: String(label || value),
      };
    })
    .filter(Boolean) as LinkOption[];

const mergeLinkOptionLists = (...optionLists: Array<any[] | undefined>) => {
  const optionMap = new Map<string, LinkOption>();

  optionLists.forEach((optionList) => {
    normalizeLinkOptionList(optionList || []).forEach((option) => {
      const existing = optionMap.get(option.value);
      optionMap.set(option.value, {
        value: option.value,
        label:
          option.label && option.label !== option.value
            ? option.label
            : existing?.label || option.label || option.value,
      });
    });
  });

  return Array.from(optionMap.values());
};

const getIcssApprovalAmount = (data: Record<string, any>) => {
  const totalFields = [
    "pp_grand_total",
    "sp_grand_total",
    "rr_grand_total",
    "amc_grand_total",
    "rate_contract_grand_total",
    "grand_total",
    "total_estimate",
  ];

  for (const fieldname of totalFields) {
    const amount = getNumericAmount(data[fieldname]);
    if (amount > 0) return amount;
  }

  const standardizedTotal = getStandardizedGrandTotal(data);
  if (standardizedTotal > 0) return standardizedTotal;

  return 0;
};

const getIcssPoCommitAmount = (
  poData: Record<string, any> | null,
  formData: Record<string, any>,
) => {
  if (
    poData &&
    isAnnualMaintenanceContractIndent(
      poData.po_source_indent_type || poData.indent_type,
    )
  ) {
    const amcPoGrandTotal = getAmcPoGrandTotal(poData);
    if (amcPoGrandTotal > 0) return amcPoGrandTotal;
  }

  const amountSources = [
    poData?.grand_total,
    poData?.ss_grand_total,
    poData?.amc_po_total_amount,
    formData.pp_grand_total,
    formData.sp_grand_total,
    formData.rr_grand_total,
    formData.amc_grand_total,
    formData.rate_contract_grand_total,
    formData.grand_total,
  ];

  for (const source of amountSources) {
    const amount = getNumericAmount(source);
    if (amount > 0) return amount;
  }

  return getIcssApprovalAmount(formData);
};

const isEquipmentAccountHead = (data: Record<string, any>) => {
  const accountHeadText = [
    data.icss_account_head,
    data.account_head,
    data.budget_head,
    data.icss_other_account_head,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return accountHeadText.includes("equipment");
};

const getIcssApprovalBranch = (
  currentState: string,
  data: Record<string, any>,
) => {
  if (currentState === "Pending Associate Dean")
    return "Pending Associate Dean";
  if (currentState === "Pending Dean Approval") return "Pending Dean Approval";

  const amount = getIcssApprovalAmount(data);
  return amount > 100000 ? "Pending Dean Approval" : "Pending Associate Dean";
};

const shouldShowDirectorStage = (
  currentState: string,
  data: Record<string, any>,
) => {
  if (currentState === "Pending Director Approval") return true;

  const amount = getIcssApprovalAmount(data);
  if (!amount) return false;

  return isEquipmentAccountHead(data) ? amount > 1000000 : amount > 300000;
};

const DIRECTOR_PDF_EXCLUDED_FIELDNAMES = new Set([
  "amended_from",
  "indent_cum_sanction_sheet_id",
  "project_no",
  "project_number",
  "project_ref",
  "project_name",
  "project_title",
  "icss_account_head",
  "icss_other_account_head",
  "account_head",
  "budget_head",
  "indent_type",
  "icss_signed_po_file",
  "director_approval_required",
  "send_to_director",
  "director_signed_pdf",
  "workflow_state",
]);

const DIRECTOR_PDF_EXCLUDED_LABELS = new Set([
  "amended from",
  "indent cum sanction sheet id",
  "project number",
  "project reference",
  "indent type",
  "signed po attachment",
]);

const SUBFORM_AUTOFILL_FIELDNAMES = new Set([
  "amended_from",
  "indent_cum_sanction_sheet_id",
  "project_no",
  "project_number",
  "project_ref",
  "indent_type",
]);

const SUBFORM_AUTOFILL_LABELS = new Set([
  "amended from",
  "indent cum sanction sheet id",
  "project number",
  "project reference",
  "indent type",
]);

const isHiddenSubformAutofillField = (field: FormField) => {
  const normalizedLabel = String(field.label || "")
    .replace(/\*/g, "")
    .trim()
    .toLowerCase();

  return (
    SUBFORM_AUTOFILL_FIELDNAMES.has(field.fieldname) ||
    SUBFORM_AUTOFILL_LABELS.has(normalizedLabel)
  );
};

const isDirectorPdfHiddenField = (field: FormField) => {
  const fieldname = String(field.fieldname || "");
  const normalizedLabel = String(field.label || "")
    .replace(/\*/g, "")
    .trim()
    .toLowerCase();

  return (
    DIRECTOR_PDF_EXCLUDED_FIELDNAMES.has(fieldname) ||
    DIRECTOR_PDF_EXCLUDED_LABELS.has(normalizedLabel) ||
    ["Column Break", "Tab Break"].includes(field.fieldtype)
  );
};

const getDirectorPdfFieldLabel = (field: FormField) => {
  if (field.fieldname === "sub_doctype_reference") {
    return "Indent Type";
  }

  if (field.fieldname === "html_tfhk") {
    return "PI Confirmation";
  }

  return field.label || field.fieldname;
};

const stripHtml = (value: any) =>
  String(value || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const getDirectorLinkLabel = (
  value: any,
  field?: FormField,
  linkOptions?: Record<string, LinkOption[]>,
) => {
  if (!value && value !== 0) return "";
  const stringValue = String(value);
  const candidateKeys = [
    field?.fieldname,
    typeof field?.options === "string" ? field.options : undefined,
    "User",
    "Department_prornd",
    "Budget Head",
    "department",
    "icss_applicant_department__centre__section",
    "icss_applying_for_department_centre_section",
    "icss_account_head",
    "account_head",
  ].filter(Boolean) as string[];

  for (const key of candidateKeys) {
    const match = (linkOptions?.[key] || []).find(
      (option) => String(option.value) === stringValue,
    );
    if (match?.label) return match.label;
  }

  const globalMatch = Object.values(linkOptions || {})
    .flat()
    .find((option) => String(option.value) === stringValue);

  return globalMatch?.label || stringValue;
};

const formatDirectorPdfValue = (
  value: any,
  field?: FormField,
  linkOptions?: Record<string, LinkOption[]>,
) => {
  if (value === undefined || value === null || value === "")
    return "Not provided";
  if (field?.fieldtype === "Check") return Number(value) ? "Yes" : "No";
  if (Array.isArray(value))
    return value.length ? `${value.length} row(s)` : "No rows";
  if (field?.fieldtype === "Link" || field?.fieldtype === "Dynamic Link") {
    return getDirectorLinkLabel(value, field, linkOptions);
  }

  const text = field?.fieldtype === "HTML" ? stripHtml(value) : String(value);
  return text.trim() || "Not provided";
};

const isSelfApplyingFor = (data: Record<string, any>) => {
  const value = String(
    data.self_other || data.icss_applying_for || data.applying_for || "",
  )
    .trim()
    .toLowerCase();
  return value === "self";
};

const isApplyingForSecondaryField = (field: FormField) => {
  const fieldname = String(field.fieldname || "").toLowerCase();
  const label = String(field.label || "").toLowerCase();
  return (
    fieldname.includes("applying_for_mail") ||
    fieldname.includes("applying_for_name") ||
    fieldname.includes("applying_for_department") ||
    fieldname.includes("applying_for_designation") ||
    label.includes("applying for webmail") ||
    label.includes("applying for name") ||
    label.includes("appplying for department") ||
    label.includes("applying for department") ||
    label.includes("applying for designation")
  );
};

const isApplyingForSection = (label: string) =>
  String(label || "")
    .trim()
    .toLowerCase() === "applying for";

const isProjectDetailsSection = (label: string) =>
  String(label || "")
    .trim()
    .toLowerCase() === "project details";

const isOtherAccountHeadField = (field: FormField) => {
  const fieldname = String(field.fieldname || "").toLowerCase();
  const label = String(field.label || "").toLowerCase();
  return (
    fieldname.includes("other_account_head") ||
    label.includes("other account head")
  );
};

const isOtherAccountHeadSelected = (data: Record<string, any>) => {
  const accountHead = String(
    data.icss_account_head || data.account_head || data.budget_head || "",
  )
    .trim()
    .toLowerCase();

  return accountHead === "other" || accountHead.includes("other");
};

const renderDirectorFieldRows = (
  fields: FormField[],
  data: Record<string, any>,
  title: string,
  linkOptions?: Record<string, LinkOption[]>,
) => {
  const rows: string[] = [];
  let pendingSection = "";
  const hideApplyingForDetails = isSelfApplyingFor(data);
  const hideOtherAccountHead = !isOtherAccountHeadSelected(data);

  fields.forEach((field) => {
    if (field.fieldtype === "Section Break") {
      pendingSection =
        (hideApplyingForDetails && isApplyingForSection(field.label || "")) ||
          isProjectDetailsSection(field.label || "")
          ? ""
          : field.label || "";
      return;
    }

    if (isDirectorPdfHiddenField(field) || field.fieldtype === "Table") {
      return;
    }

    if (hideApplyingForDetails && isApplyingForSecondaryField(field)) {
      return;
    }

    if (hideOtherAccountHead && isOtherAccountHeadField(field)) {
      return;
    }

    const value =
      field.fieldname === "sub_doctype_reference"
        ? getPoIndentTypeDisplayName(data.icss_indent_type || data.indent_type)
        : field.fieldtype === "HTML"
          ? field.options
          : data[field.fieldname];
    if (
      value === undefined &&
      field.fieldtype !== "HTML" &&
      field.fieldtype !== "Check"
    ) {
      return;
    }

    if (pendingSection) {
      rows.push(`
                <tr class="section-row">
                    <td colspan="2">${escapeHtml(pendingSection)}</td>
                </tr>
            `);
      pendingSection = "";
    }

    rows.push(`
            <tr>
                <td class="label-col">${escapeHtml(getDirectorPdfFieldLabel(field))}</td>
                <td>${escapeHtml(formatDirectorPdfValue(value, field, linkOptions))}</td>
            </tr>
        `);
  });

  if (!rows.length) return "";

  return `
        <div class="section-title">${escapeHtml(title)}</div>
        <table class="details-table">
            <thead>
                <tr>
                    <th>Field</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>${rows.join("")}</tbody>
        </table>
    `;
};

const renderDirectorTableField = (
  field: FormField,
  data: Record<string, any>,
  linkOptions?: Record<string, LinkOption[]>,
) => {
  if (field.fieldtype !== "Table" || isDirectorPdfHiddenField(field)) return "";

  const rows: any[] = Array.isArray(data[field.fieldname])
    ? data[field.fieldname]
    : [];
  if (!rows.length) return "";

  const childFields = (field.child_fields || []).filter(
    (childField: any) => !isDirectorPdfHiddenField(childField),
  );
  const fallbackKeys =
    childFields.length > 0
      ? []
      : Object.keys(rows[0] || {}).filter(
        (key) =>
          !key.startsWith("_") && !DIRECTOR_PDF_EXCLUDED_FIELDNAMES.has(key),
      );
  const columns = childFields.length
    ? childFields.map((childField: any) => ({
      key: childField.fieldname,
      label: childField.label || childField.fieldname,
      field: childField,
    }))
    : fallbackKeys.map((key) => ({
      key,
      label: key.replace(/_/g, " "),
      field: undefined,
    }));

  if (!columns.length) return "";

  return `
        <div class="section-title">${escapeHtml(field.label || field.fieldname)}</div>
        <table class="item-table">
            <thead>
                <tr>
                    <th>Sl No.</th>
                    ${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}
                </tr>
            </thead>
            <tbody>
                ${rows
      .map(
        (row, index) => `
                            <tr>
                                <td class="center">${index + 1}</td>
                                ${columns
            .map(
              (column) =>
                `<td>${escapeHtml(formatDirectorPdfValue(row?.[column.key], column.field as FormField | undefined, linkOptions))}</td>`,
            )
            .join("")}
                            </tr>
                        `,
      )
      .join("")}
            </tbody>
        </table>
    `;
};

const renderDirectorTableFields = (
  fields: FormField[],
  data: Record<string, any>,
  linkOptions?: Record<string, LinkOption[]>,
) =>
  fields
    .map((field) => renderDirectorTableField(field, data, linkOptions))
    .join("");

const buildDirectorApprovalPrintHtml = ({
  docname,
  formData,
  parentFields,
  childFields,
  currentUser,
  linkOptions,
}: {
  docname: string;
  formData: Record<string, any>;
  parentFields: FormField[];
  childFields: FormField[];
  currentUser?: string | null;
  linkOptions?: Record<string, LinkOption[]>;
}) => {
  const indentType = formData.icss_indent_type || formData.indent_type || "";
  const amount = getIcssApprovalAmount(formData);
  const generatedOn = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const indentTypeTitle =
    getPoIndentTypeDisplayName(indentType) || "Child Form Details";
  const parentDetails = renderDirectorFieldRows(
    parentFields,
    formData,
    "Indent Cum Sanction Sheet Details",
    linkOptions,
  );
  const childDetails = renderDirectorFieldRows(
    childFields,
    formData,
    indentTypeTitle,
    linkOptions,
  );
  const parentTables = renderDirectorTableFields(
    parentFields,
    formData,
    linkOptions,
  );
  const childTables = renderDirectorTableFields(
    childFields,
    formData,
    linkOptions,
  );

  return `<!doctype html>
<html>
<head>
    <meta charset="utf-8" />
    <title>ICSS Director Approval - ${escapeHtml(docname)}</title>
    <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            color: #1f2933;
            font-family: "Times New Roman", Georgia, serif;
            background: #f8fafc;
        }
        .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: #fff;
            padding: 16mm;
            position: relative;
        }
        .letterhead {
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 12px 14px;
            display: grid;
            grid-template-columns: 1fr 210px;
            gap: 16px;
            align-items: center;
            margin-bottom: 18px;
        }
        .brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .brand img { width: 64px; height: 64px; object-fit: contain; }
        .inst-en { font-size: 20px; font-weight: 700; line-height: 1.2; white-space: nowrap; }
        .inst-hi { font-size: 20px; font-weight: 700; line-height: 1.2; margin-top: 2px; }
        .section-name { font-size: 14px; font-weight: 700; color: #334155; margin-top: 4px; }
        .contact {
            border-left: 1px solid #cbd5e1;
            padding-left: 14px;
            font-size: 11px;
            line-height: 1.45;
            color: #334155;
        }
        .title {
            text-align: center;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: .08em;
            margin: 12px 0 4px;
            text-transform: uppercase;
        }
        .subtitle {
            text-align: center;
            font-size: 13px;
            color: #64748b;
            margin-bottom: 16px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px 14px;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 12px;
            margin-bottom: 16px;
            background: #f8fafc;
            font-size: 12px;
        }
        .summary strong { color: #0f172a; }
        .section-title {
            margin: 18px 0 8px;
            padding: 7px 10px;
            border-left: 4px solid #D97757;
            background: #f8fafc;
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .04em;
            color: #334155;
            page-break-after: avoid;
        }
        table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
        tr { page-break-inside: avoid; page-break-after: auto; }
        th {
            background: #e2e8f0;
            color: #0f172a;
            font-size: 11px;
            padding: 7px;
            border: 1px solid #cbd5e1;
            text-align: left;
        }
        td {
            font-size: 11px;
            line-height: 1.35;
            padding: 7px;
            border: 1px solid #dbe3ea;
            vertical-align: top;
            white-space: pre-wrap;
            word-break: break-word;
        }
        .section-row td {
            background: #f1f5f9;
            color: #334155;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: .04em;
        }
        .label-col { width: 34%; font-weight: 700; color: #334155; }
        .center { text-align: center; }
        .approval-note {
            margin-top: 18px;
            border: 1px solid #fed7aa;
            background: #fff7ed;
            color: #7c2d12;
            border-radius: 10px;
            padding: 10px 12px;
            font-size: 12px;
            line-height: 1.45;
        }
        .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
            margin-top: 36px;
            page-break-inside: avoid;
        }
        .signature-card {
            min-height: 132px;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            justify-content: flex-end;
            gap: 8px;
        }
        .sign-line { border-top: 1px solid #0f172a; padding-top: 8px; font-weight: 700; }
        .muted { color: #64748b; font-size: 11px; }
        @media print {
            body { background: #fff; }
            .page { width: auto; min-height: auto; padding: 0; }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="letterhead">
            <div class="brand">
                <img src="http://172.16.117.39:8000/files/IITG_logo.png" alt="IITG Logo" onerror="this.style.display='none'" />
                <div>
                    <div class="inst-en">Indian Institute of Technology Guwahati</div>
                    <div class="inst-hi">भारतीय प्रौद्योगिकी संस्थान गुवाहाटी</div>
                    <div class="section-name">Research &amp; Development Section</div>
                </div>
            </div>
            <div class="contact">
                <div><strong>Guwahati-781039, India</strong></div>
                <div><strong>Phone :</strong> +91-361-2583089</div>
                <div>+91-361-2582134</div>
                <div><strong>Email :</strong> rndadmin@iitg.ac.in</div>
                <div>${escapeHtml(currentUser || "")}</div>
            </div>
        </div>

        <div class="title">Director Approval Note</div>
        <div class="subtitle">Indent Cum Sanction Sheet</div>

        <div class="summary">
            <div><strong>Application ID:</strong> ${escapeHtml(docname || "Draft")}</div>
            <div><strong>Generated On:</strong> ${escapeHtml(generatedOn)}</div>
            <div><strong>Indent Type:</strong> ${escapeHtml(getPoIndentTypeDisplayName(indentType) || "Not provided")}</div>
            <div><strong>Project Number:</strong> ${escapeHtml(formData.project_no || formData.project_number || "Not provided")}</div>
            <div><strong>Project Reference:</strong> ${escapeHtml(formData.project_ref || "Not provided")}</div>
            <div><strong>Applicant:</strong> ${escapeHtml(formData.icss_applicant_name || formData.applicant_name || "Not provided")}</div>
            <div><strong>Account Head:</strong> ${escapeHtml(formData.icss_account_head || formData.account_head || "Not provided")}</div>
            <div><strong>Estimated / Grand Total:</strong> ₹ ${escapeHtml(amount ? amount.toLocaleString("en-IN") : "Not provided")}</div>
        </div>

        ${parentDetails}
        ${parentTables}
        ${childTables}
        ${childDetails}

        <div class="signature-section">
            <div class="signature-card">
                <div class="sign-line">Dean, R&amp;D</div>
                <div class="muted">Signature with date and seal</div>
            </div>
            <div class="signature-card">
                <div class="sign-line">Director</div>
                <div class="muted">Signature with date and seal</div>
            </div>
        </div>
    </div>
</body>
</html>`;
};

const buildIcssTimelineStages = (
  currentState: string,
  data: Record<string, any>,
): { label: string; status: StageStatus }[] => {
  const approvalBranch = getIcssApprovalBranch(currentState, data);
  const finalStage = "PO Delivered";
  const stages = [
    "Draft",
    "Pending Staff Approval",
    "Pending HoS Approval",
    approvalBranch,
    ...(shouldShowDirectorStage(currentState, data)
      ? ["Pending Director Approval"]
      : []),
    "Pending PO Generation",
    "PO Generated",
    finalStage,
  ];
  const isCompleted =
    currentState === "Approved" || currentState === "PO Delivered";
  const isRejected = currentState === "Rejected";
  let currentIdx = stages.findIndex((stage) => stage === currentState);

  if (currentIdx === -1) {
    currentIdx = currentState === "Draft" || !currentState ? 0 : 1;
  }

  return stages.map((stage, idx) => {
    if (isCompleted) return { label: stage, status: "completed" };
    if (isRejected) {
      if (idx < currentIdx) return { label: stage, status: "completed" };
      if (idx === currentIdx) return { label: "Rejected", status: "rejected" };
      return { label: stage, status: "pending" };
    }
    if (idx < currentIdx) return { label: stage, status: "completed" };
    if (idx === currentIdx) return { label: stage, status: "in-progress" };
    return { label: stage, status: "pending" };
  });
};

const WorkflowTimeline = ({
  currentState,
  formData,
}: {
  currentState: string;
  formData: Record<string, any>;
}) => {
  const stages = buildIcssTimelineStages(currentState || "Draft", formData);
  const completedCount = stages.filter((s) => s.status === "completed").length;
  const totalCount = stages.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);
  const activeStage = stages.find((s) => s.status === "in-progress");
  const isFinished = ["Approved", "PO Delivered"].includes(currentState);
  const isRejected = currentState === "Rejected";

  const nodeStyle = (status: StageStatus) => {
    if (status === "completed") return "bg-emerald-500 border-emerald-500 text-white";
    if (status === "in-progress") return "bg-[#D97757] border-[#D97757] text-white ring-4 ring-[#D97757]/20";
    if (status === "rejected") return "bg-red-500 border-red-500 text-white";
    return "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-600 text-zinc-400 dark:text-zinc-500";
  };

  const lineStyle = (status: StageStatus) =>
    status === "completed"
      ? "bg-emerald-400"
      : "bg-zinc-200 dark:bg-zinc-700";

  return (
    <FrappeCard>
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Workflow
            </h3>
            {isFinished && (
              <span className="text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full">
                Complete
              </span>
            )}
            {isRejected && (
              <span className="text-[10px] font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                Rejected
              </span>
            )}
            {activeStage && (
              <span className="text-[10px] font-semibold text-[#D97757] bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 px-2 py-0.5 rounded-full">
                {activeStage.label}
              </span>
            )}
          </div>
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 tabular-nums">
            {completedCount}/{totalCount} steps
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isRejected ? "bg-red-400" : isFinished ? "bg-emerald-500" : "bg-[#D97757]",
            )}
            style={{ width: `${isFinished ? 100 : progressPct}%` }}
          />
        </div>

        {/* Step track */}
        <div className="flex items-center overflow-x-auto pb-1 gap-0">
          {stages.map((stage, idx) => (
            <React.Fragment key={`${stage.label}-${idx}`}>
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center border-2 transition-all duration-200 text-[10px] font-bold",
                    nodeStyle(stage.status),
                  )}
                  title={stage.label}
                >
                  {stage.status === "completed" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : stage.status === "rejected" ? (
                    <XCircle className="w-3 h-3" />
                  ) : stage.status === "in-progress" ? (
                    <Clock className="w-3 h-3" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <p
                  className={cn(
                    "mt-1.5 text-center text-[10px] leading-tight w-[68px] px-0.5",
                    stage.status === "in-progress" && "font-bold text-[#D97757]",
                    stage.status === "completed" && "font-medium text-emerald-600 dark:text-emerald-400",
                    stage.status === "pending" && "text-zinc-400 dark:text-zinc-500",
                    stage.status === "rejected" && "font-bold text-red-500",
                  )}
                >
                  {stage.label}
                </p>
              </div>
              {idx < stages.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mb-4 min-w-[10px]",
                    lineStyle(stage.status),
                  )}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </FrappeCard>
  );
};


const getIcssVendorDetails = (
  data: Record<string, any>,
  indentType: string,
) => {
  switch (indentType) {
    case "Proprietary Purchase with Proprietary certificate from the OEM":
      return {
        vendorAddress: data.pp_supplier_details || "",
        vendorEmail: data.pp_supplier_email || "",
        payment: data.pp_mode_of_payment || "",
        delivery: data.pp_delivery_period || "",
        warranty: data.pp_warranty || "",
      };
    case "Standerdised/ Emergent Purchase":
      return {
        vendorAddress: data.sp_supplier_name_address || "",
        vendorEmail: data.sp_supplier_email || "",
        payment: data.sp_mode_of_payment || "",
        delivery: data.sp_delivery_period || "",
        warranty: data.sp_warranty || "",
      };
    case "Repair/ Repleacement":
      return {
        vendorAddress: data.icss_repair_vendor_details || "",
        vendorEmail: data.icss_repair_vendor_email || "",
        payment: "",
        delivery: "",
        warranty: "",
      };
    case "Annual Maintenance Contract":
      return {
        vendorAddress: data.icss_amc_service_provider || "",
        vendorEmail: data.icss_amc_service_provider_email || "",
        payment: data.icss_amc_payment_term || "",
        delivery: "",
        warranty: "",
      };
    case "Rate Contract Purchase":
      return {
        vendorAddress:
          data.vendor_address ||
          data.local_address ||
          data.principal_address ||
          data.select_vendor ||
          data.local_supplier ||
          data.principal_supplier ||
          "",
        vendorEmail: data.vendor_email || data.local_email || "",
        payment: "",
        delivery: "",
        warranty: "",
      };
    default:
      return {
        vendorAddress:
          data.pp_supplier_details ||
          data.sp_supplier_name_address ||
          data.icss_repair_vendor_details ||
          data.icss_amc_service_provider ||
          data.vendor_address ||
          "",
        vendorEmail:
          data.pp_supplier_email ||
          data.sp_supplier_email ||
          data.icss_repair_vendor_email ||
          data.icss_amc_service_provider_email ||
          data.vendor_email ||
          "",
        payment: "",
        delivery: "",
        warranty: "",
      };
  }
};

const mapIcssItemsToPoRows = (data: Record<string, any>) => {
  const sourceRows = Array.isArray(data.table_qanf)
    ? data.table_qanf
    : Array.isArray(data.details_of_items_to_be_purchased)
      ? data.details_of_items_to_be_purchased
      : Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.icss_items)
          ? data.icss_items
          : [];

  return sourceRows.map((row: any) => {
    const quantity = toNumber(row.icss_qty ?? row.quantity);
    const unitPrice = toNumber(row.icss_rate ?? row.unit_rate);
    const discountPercent = toNumber(
      row.icss_discount_percent ?? row.discount_percentage,
    );
    const gstPercent = toNumber(row.icss_gst_percent ?? row.gst_percentage);
    const base = quantity * unitPrice;
    const discountAmount = roundCurrency((base * discountPercent) / 100);
    const afterDiscount = base - discountAmount;
    const gstAmount = roundCurrency((afterDiscount * gstPercent) / 100);

    return {
      item_name: row.icss_item_name || row.item_name || "",
      item_description: row.icss_item_description || row.item_description || "",
      item_justification: row.icss_justification || row.justification || "",
      item_cat_no: row.cat_no || "",
      item_page_no: row.page_no || "",
      item_quantity: quantity ? String(quantity) : "",
      item_unit_price: unitPrice ? String(unitPrice) : "",
      item_discount_percent: discountPercent ? String(discountPercent) : "",
      item_gst_percent: gstPercent ? String(gstPercent) : "",
      item_discount: discountAmount ? String(discountAmount) : "",
      item_gst: gstAmount ? String(gstAmount) : "",
      dp_total_price:
        row.icss_amount != null
          ? String(row.icss_amount)
          : row.amount != null
            ? String(row.amount)
            : String(roundCurrency(afterDiscount + gstAmount)),
    };
  });
};

const extractSavedIcssPoDraft = (data: Record<string, any>) => {
  const possibleJsonKeys = [
    "icss_po_data",
    "icss_po_data_json",
    "po_data",
    "po_data_json",
  ];

  for (const key of possibleJsonKeys) {
    const raw = data[key];
    if (!raw) continue;
    if (typeof raw === "object") return raw;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        // Ignore malformed json and fallback to flat fields
      }
    }
  }

  const hasFlatPoData = [
    "po_number",
    "po_date",
    "vendor_address",
    "quotation_no",
    "signee_name",
    "signee_designation",
    "amount_in_words",
    "terms_and_conditions",
  ].some((key) => Boolean(data[key]));

  if (!hasFlatPoData) return null;

  return {
    po_number: data.po_number || "",
    po_date: data.po_date || "",
    vendor_address: data.vendor_address || "",
    quotation_no: data.quotation_no || "",
    signee_name: data.signee_name || "",
    signee_designation: data.signee_designation || "",
    amount_in_words: data.amount_in_words || "",
    terms_and_conditions:
      data.terms_and_conditions ||
      data.additional_terms_and_conditions_if_any ||
      "",
  };
};

const hasSavedIcssPoDraft = (data: Record<string, any>) => {
  const jsonBackedFields = [
    data.icss_po_data,
    data.icss_po_data_json,
    data.po_data,
    data.po_data_json,
  ];

  if (
    jsonBackedFields.some((value) =>
      typeof value === "string" ? value.trim().length > 0 : !!value,
    )
  ) {
    return true;
  }

  const savedDraft = extractSavedIcssPoDraft(data);
  return Boolean(
    savedDraft?.po_number ||
    savedDraft?.po_date ||
    savedDraft?.quotation_no ||
    savedDraft?.signee_name ||
    savedDraft?.signee_designation ||
    savedDraft?.amount_in_words,
  );
};

const buildIcssPoPrefillSections = (
  data: Record<string, any>,
  indentType: string,
  totalAmount: number,
) => {
  const normalizedIndentType = String(indentType || "")
    .trim()
    .toLowerCase();
  const commonFields = [
    {
      label: "Applicant",
      value: data.icss_applicant_name || data.applicant_name || "",
    },
    {
      label: "Department",
      value:
        data.icss_applicant_department__centre__section ||
        data.department ||
        "",
    },
    {
      label: "Account Head",
      value:
        data.icss_account_head ||
        data.account_head ||
        data.icss_other_account_head ||
        "",
    },
    {
      label: "Funding Agency",
      value: data.funding_agency || data.project_title || "",
    },
    { label: "Project No.", value: data.project_no || data.project_code || "" },
    { label: "File No.", value: data.file_number || "" },
    { label: "Committed Grand Total", value: totalAmount || "" },
  ].filter(
    (field) =>
      field.value !== undefined && field.value !== null && field.value !== "",
  );

  let indentSpecificFields: { label: string; value: any }[] = [];
  let indentSpecificTitle = "Indent-Specific Details";

  if (normalizedIndentType.includes("proprietary")) {
    indentSpecificTitle = "Proprietary Purchase Details";
    indentSpecificFields = [
      { label: "Manufacturer", value: data.pp_manufacturer_name || "" },
      { label: "Supplier Details", value: data.pp_supplier_details || "" },
      { label: "Supplier Email", value: data.pp_supplier_email || "" },
      { label: "Payment Mode", value: data.pp_mode_of_payment || "" },
      { label: "Delivery Period", value: data.pp_delivery_period || "" },
      { label: "Warranty", value: data.pp_warranty || "" },
      {
        label: "Total Estimated Basic Value",
        value: data.pp_estimated_basic_value || "",
      },
      {
        label: "Packing and Forwarding",
        value: data.pp_pack_and_forward || "",
      },
      { label: "Freight", value: data.pp_freight || "" },
      { label: "Other Charges", value: data.pp_other_charges || "" },
      { label: "Grand Total", value: data.pp_grand_total || "" },
    ];
  } else if (isStandardizedIndentType(indentType)) {
    indentSpecificTitle = "Standardized Purchase Details";
    indentSpecificFields = [
      { label: "Manufacturer", value: data.sp_manufacturer_name || "" },
      {
        label: "Supplier Name / Address",
        value: data.sp_supplier_name_address || "",
      },
      { label: "Supplier Email", value: data.sp_supplier_email || "" },
      { label: "Reasons Not Accept", value: data.sp_reasons_not_accept || "" },
      { label: "Payment Mode", value: data.sp_mode_of_payment || "" },
      { label: "Delivery Period", value: data.sp_delivery_period || "" },
      { label: "Warranty", value: data.sp_warranty || "" },
      {
        label: "Total Estimated Basic Value",
        value: data.sp_total_basic_value || "",
      },
      {
        label: "Packing and Forwarding",
        value: data.sp_pack_and_frwd || "",
      },
      { label: "Freight", value: data.sp_freight || "" },
      { label: "Other Charges", value: data.sp_other_charges || "" },
      {
        label: "Grand Total",
        value: data.sp_grand_total || getStandardizedGrandTotal(data) || "",
      },
    ];
  } else if (normalizedIndentType.includes("repair")) {
    indentSpecificTitle = "Repair / Replacement Details";
    indentSpecificFields = [
      {
        label: "Repair Vendor Details",
        value: data.icss_repair_vendor_details || "",
      },
      {
        label: "Repair Vendor Email",
        value: data.icss_repair_vendor_email || "",
      },
      { label: "Repair Total", value: data.rr_grand_total || "" },
    ];
  } else if (
    normalizedIndentType.includes("annual maintenance contract") ||
    normalizedIndentType === "amc"
  ) {
    indentSpecificTitle = "AMC Details";
    indentSpecificFields = [
      {
        label: "Service Provider",
        value: data.icss_amc_service_provider || "",
      },
      {
        label: "Service Provider Email",
        value: data.icss_amc_service_provider_email || "",
      },
      {
        label: "AMC Payment Term",
        value: data.icss_amc_payment_term || "",
      },
      { label: "AMC Period", value: data.icss_amc_period || "" },
    ];
  } else if (normalizedIndentType.includes("rate contract")) {
    indentSpecificTitle = "Rate Contract Details";
    indentSpecificFields = [
      {
        label: "Application Type",
        value: data.select_form_type || "",
      },
      { label: "Item Type", value: data.item_type || "" },
      {
        label: "Principal Supplier",
        value: data.principal_supplier || "",
      },
      {
        label: "Principal Supplier Details",
        value: data.principal_address || "",
      },
      { label: "Agreement Number", value: data.agreement_no || "" },
      { label: "Local Supplier", value: data.local_supplier || "" },
      {
        label: "Local Supplier Details",
        value: data.local_address || "",
      },
      { label: "Local Supplier Email", value: data.local_email || "" },
      { label: "P4 Item Type", value: data.p4_item_type || "" },
      { label: "Selected Vendor", value: data.select_vendor || "" },
      { label: "Vendor Address", value: data.vendor_address || "" },
      { label: "Vendor Email", value: data.vendor_email || "" },
      { label: "Payment Mode / Terms", value: data.payment_mode || "" },
      { label: "Packing", value: data.rate_contract_packing || "" },
      { label: "Rate Contract Total", value: data.rate_contract_total || "" },
      {
        label: "Rate Contract Grand Total",
        value: data.rate_contract_grand_total || "",
      },
    ];
  }

  const filteredIndentSpecificFields = indentSpecificFields.filter(
    (field) =>
      field.value !== undefined && field.value !== null && field.value !== "",
  );

  return [
    { title: "Common ICSS Details", fields: commonFields },
    ...(filteredIndentSpecificFields.length
      ? [{ title: indentSpecificTitle, fields: filteredIndentSpecificFields }]
      : []),
  ];
};

const buildIcssPoChargeSummary = (
  data: Record<string, any>,
  indentType: string,
) => {
  const normalizedIndentType = String(indentType || "")
    .trim()
    .toLowerCase();

  if (normalizedIndentType.includes("proprietary")) {
    return [
      {
        label: "Total Estimated Basic Value",
        value: data.pp_estimated_basic_value || 0,
      },
      {
        label: "Add: Packing and Forwarding",
        value: data.pp_pack_and_forward || 0,
      },
      { label: "Add: Freight", value: data.pp_freight || 0 },
      { label: "Add: Other Charges", value: data.pp_other_charges || 0 },
      {
        label: "Grand Total",
        value: data.pp_grand_total || 0,
        emphasis: "strong",
      },
    ];
  }

  if (isStandardizedIndentType(indentType)) {
    return [
      {
        label: "Total Estimated Basic Value",
        value: data.sp_total_basic_value || 0,
      },
      {
        label: "Add: Packing and Forwarding",
        value: data.sp_pack_and_frwd || 0,
      },
      { label: "Add: Freight", value: data.sp_freight || 0 },
      { label: "Add: Other Charges", value: data.sp_other_charges || 0 },
      {
        label: "Grand Total",
        value: data.sp_grand_total || getStandardizedGrandTotal(data) || 0,
        emphasis: "strong",
      },
    ];
  }

  if (normalizedIndentType.includes("rate contract")) {
    return [
      { label: "Rate Contract Total", value: data.rate_contract_total || 0 },
      { label: "Add: Packing", value: data.rate_contract_packing || 0 },
      {
        label: "Grand Total",
        value: data.rate_contract_grand_total || 0,
        emphasis: "strong",
      },
    ];
  }

  if (
    normalizedIndentType.includes("annual maintenance contract") ||
    normalizedIndentType === "amc"
  ) {
    return [
      {
        label: "Grand Total",
        value: data.amc_grand_total || data.icss_amc_grand_total || 0,
        emphasis: "strong",
      },
    ];
  }

  if (normalizedIndentType.includes("repair")) {
    return [
      {
        label: "Grand Total",
        value: data.rr_grand_total || 0,
        emphasis: "strong",
      },
    ];
  }

  return [
    {
      label: "Grand Total",
      value: data.grand_total || data.total_estimate || 0,
      emphasis: "strong",
    },
  ];
};

const getIcssWorkflowSuccessMessage = (action: string, nextState?: string) => {
  const normalizedAction = String(action || "").toLowerCase();

  if (normalizedAction.includes("submit")) {
    return "Indent Cum Sanction Sheet submitted successfully!";
  }

  if (normalizedAction.includes("reject")) {
    return "Indent Cum Sanction Sheet rejected successfully!";
  }

  if (normalizedAction.includes("forward")) {
    return "Indent Cum Sanction Sheet forwarded successfully!";
  }

  if (normalizedAction.includes("approve")) {
    return nextState === "Approved"
      ? "Indent Cum Sanction Sheet approved successfully!"
      : "Indent Cum Sanction Sheet approved and forwarded successfully!";
  }

  if (
    normalizedAction.includes("generate") &&
    normalizedAction.includes("po")
  ) {
    return "Purchase Order generated successfully!";
  }

  return "Indent Cum Sanction Sheet updated successfully!";
};

const ALWAYS_READONLY_FIELDS = new Set([
  "icss_applicant_webmail_id",
  "icss_applicant_name",
]);

const IndentCumSanctionSheetForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editDocName = id || searchParams.get("edit");
  const projectParam = searchParams.get("project");
  const projectNoParam = searchParams.get("projectNo");
  const projectRefParam = searchParams.get("project_ref");
  const { currentUser } = useFrappeAuth();
  const { roles } = useUserRoles(currentUser ?? null);
  const isRnDStaff =
    roles?.some(
      (r: string) =>
        r === "RnD Staff" ||
        r === "R&D Staff" ||
        r === "Research and Development Staff" ||
        r === "System Manager" ||
        r === "staff, RnD" ||
        r === "Hos, RnD (Head of Section, RnD)",
    ) ?? false;
  const isDeanRnd =
    roles?.some((r: string) => r === "Dean, RnD" || r === "System Manager") ??
    false;

  // Core States
  const [baseFields, setBaseFields] = useState<FormField[]>([]);
  const [subFormFields, setSubFormFields] = useState<FormField[]>([]);
  const fields = React.useMemo(
    () => [...baseFields, ...subFormFields],
    [baseFields, subFormFields],
  );
  const [isEditMode, setIsEditMode] = useState(!editDocName);

  const displayBaseFields = React.useMemo(() => {
    return baseFields.map((field) => {
      if (field.fieldname === "icss_applicant_webmail_id") {
        return { ...field, fieldtype: "Data", read_only: 1 };
      }

      if (field.fieldname === "icss_applicant_name") {
        return { ...field, fieldtype: "Data", read_only: 1 };
      }

      if (
        field.fieldname === "icss_applying_for_mail" ||
        field.fieldname === "icss_applying_for_name"
      ) {
        return { ...field, options: field.fieldname };
      }

      // In edit mode, clear backend-supplied read_only from field and its child columns
      if (isEditMode && !ALWAYS_READONLY_FIELDS.has(field.fieldname)) {
        return {
          ...field,
          read_only: 0,
          child_fields: field.child_fields?.map((cf: any) => ({ ...cf, read_only: 0 })),
        };
      }

      return field;
    });
  }, [baseFields, isEditMode]);
  const [computationRules, setComputationRules] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [linkOptions, setLinkOptions] = useState<Record<string, any[]>>({});
  const displayLinkOptions = React.useMemo(() => {
    const baseUserOptions =
      linkOptions.User ||
      linkOptions.webmail_id ||
      linkOptions.icss_applicant_webmail_id ||
      linkOptions.icss_applicant_name ||
      [];
    const formUserOptions = [
      {
        value: formData.icss_applicant_webmail_id || formData.webmail_id || "",
        label: formData.applicant_name || formData.icss_applicant_name || "",
      },
      {
        value:
          formData.icss_applying_for_mail || formData.applying_for_mail || "",
        label:
          formData.applying_for_name || formData.icss_applying_for_name || "",
      },
    ].filter((option) => option.value);
    const userOptions = [...baseUserOptions];

    formUserOptions.forEach((option) => {
      const existingIndex = userOptions.findIndex(
        (userOption) => userOption.value === option.value,
      );
      const optionLabel = typeof option.label === "string" ? option.label : "";
      const cleanLabel =
        optionLabel && !optionLabel.includes("@") ? optionLabel : option.value;

      if (existingIndex >= 0) {
        userOptions[existingIndex] = {
          ...userOptions[existingIndex],
          label: cleanLabel || userOptions[existingIndex].label,
        };
      } else {
        userOptions.push({ value: option.value, label: cleanLabel });
      }
    });

    const webmailOptions = userOptions.map((option) => ({
      ...option,
      label: option.value,
    }));

    return {
      ...linkOptions,
      icss_applicant_webmail_id: webmailOptions,
      icss_applying_for_mail: webmailOptions,
      icss_applicant_name: userOptions,
      icss_applying_for_name: userOptions,
    };
  }, [formData, linkOptions]);
  const displaySubFormFields = React.useMemo(() => {
    const proprietaryManufacturer =
      formData.pp_manufacturer_name || "______________";
    const proprietarySupplier =
      formData.pp_supplier_details || "______________";
    const standardizedManufacturer =
      formData.sp_manufacturer_name ||
      formData.sp_supplier_name_address ||
      "______________";
    const standardizedReasons = formData.sp_reasons_not_accept || "";

    return subFormFields
      .filter((field) => !isHiddenSubformAutofillField(field))
      .map((field) => {
        if (field.fieldname === "html_tfhk") {
          return {
            ...field,
            options: `<p>Certified that to the best of our knowledge, the item indented is the proprietary item of M/s <strong>${escapeHtml(proprietaryManufacturer)}</strong> and is marketed by them/ their only authorized distributor M/s <strong>${escapeHtml(proprietarySupplier)}</strong> in India. To the best of our knowledge there is no other product available in the market that meets the specifications of this item. We shall be held responsible in case the certificate is found to be incorrect.</p>`,
          };
        }

        if (field.fieldname === "sp_dec_4") {
          return {
            ...field,
            options: `<p>Certified that the items indented are standardized items/spare parts found to be compatible to the existing sets of equipment. Hence, the required item is to be purchased only from M/s <strong>${escapeHtml(standardizedManufacturer)}</strong>. No other make or Model is acceptable for the following reasons:<br/>1. ${escapeHtml(standardizedReasons)}<br/>2. <br/>3. <br/>We shall be held responsible in case the certificate is found to be incorrect.</p>`,
          };
        }

        // In edit mode, clear backend-supplied read_only from field and its child columns
        if (isEditMode) {
          return {
            ...field,
            read_only: 0,
            child_fields: field.child_fields?.map((cf: any) => ({ ...cf, read_only: 0 })),
          };
        }

        return field;
      });
  }, [formData, isEditMode, subFormFields]);
  const linkOptionsRef = React.useRef<Record<string, any[]>>({});
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProjectViewLoading, setIsProjectViewLoading] = useState(false);
  const [prPreviewName, setPrPreviewName] = useState<string | null>(null);
  const [savedDocName, setSavedDocName] = useState<string | null>(
    editDocName || null,
  );
  const currentDocName = editDocName || savedDocName || "";
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isCommittedForGate, setIsCommittedForGate] = useState<boolean | null>(
    null,
  );
  const [isPoCommittedForGate, setIsPoCommittedForGate] = useState<
    boolean | null
  >(null);
  const [budgetHeadList, setBudgetHeadList] = useState<
    {
      docname: string;
      name: string;
      id: string;
    }[]
  >([]);
  const [showPoEditor, setShowPoEditor] = useState(false);
  const [poGenerationTab, setPoGenerationTab] = useState<"po" | "icss">("po");
  const [poDraftData, setPoDraftData] = useState<Record<string, any> | null>(
    null,
  );
  const [hasSavedPoDraft, setHasSavedPoDraft] = useState(false);
  const [isPoDraftDirty, setIsPoDraftDirty] = useState(false);
  const [isFetchingSavedPoDraft, setIsFetchingSavedPoDraft] = useState(false);
  const [savedPoDraftLoadError, setSavedPoDraftLoadError] = useState("");
  const [savedIcssPoDocName, setSavedIcssPoDocName] = useState("");
  const [savedIcssPoFormHtml, setSavedIcssPoFormHtml] = useState("");
  const [signedPoFileUrl, setSignedPoFileUrl] = useState("");
  const [isUploadingSignedPo, setIsUploadingSignedPo] = useState(false);
  const [isUpdatingDirectorFlag, setIsUpdatingDirectorFlag] = useState(false);
  const [hosRndSignatory, setHosRndSignatory] = useState<{
    name: string;
    designation: string;
  } | null>(null);
  const [checkedByUser, setCheckedByUser] = useState<{
    name: string;
    designation: string;
  }>({ name: "", designation: "" });
  const [rndAdminSignatory, setRndAdminSignatory] = useState<{
    name: string;
    designation: string;
  }>({ name: "", designation: "" });
  const poEditorRef = React.useRef<HTMLDivElement | null>(null);
  const signedPoInputRef = React.useRef<HTMLInputElement | null>(null);

  // Indent Type State
  const [selectedIndentType, setSelectedIndentType] = useState<string>("");
  const [isLoadingSubForm, setIsLoadingSubForm] = useState(false);

  // Workflow States
  const [workflowState, setWorkflowState] = useState<string>("Draft");
  const [availableActions, setAvailableActions] = useState<string[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [docStatus, setDocStatus] = useState<number>(0);
  const [errorModal, setErrorModal] = useState<{ open: boolean; title: string; message: string }>({ open: false, title: "Submission Failed", message: "" });
  const projectCode =
    formData.project_no ||
    formData.project_code ||
    projectNoParam ||
    projectParam ||
    "";

  // API Hooks
  const { call: getFieldsCall } = useFrappePostCall(icssAPI.getFields);
  const { call: getChildFieldsCall } = useFrappePostCall(
    icssAPI.getChildFields,
  );

  // Sub-form field metadata hooks (read-only, used to fetch field definitions per indent type)
  const { call: getProprietaryFields } = useFrappePostCall(
    proprietaryPurchaseAPI.getFields,
  );
  const { call: getStandardizedFields } = useFrappePostCall(
    standardizedPurchaseAPI.getFields,
  );
  const { call: getRepairFields } = useFrappePostCall(
    repairReplacementAPI.getFields,
  );
  const { call: getRateContractFields } = useFrappePostCall(
    rateContractAPI.getFields,
  );
  const { call: getAmcFields } = useFrappePostCall(
    annualMaintenanceContractAPI.getFields,
  );

  // All save/workflow/action operations route through parent ICSS APIs
  const { call: saveCall } = useFrappePostCall(icssAPI.save);
  const { call: saveCompositeCall } = useFrappePostCall(icssAPI.saveComposite);
  const { call: saveIcssPoDataCall } = useFrappePostCall(
    icssAPI.saveICSSPOData,
  );
  const { call: getActionsCall } = useFrappePostCall(
    icssAPI.getWorkflowActions,
  );
  const { call: performActionCall } = useFrappePostCall(icssAPI.performAction);
  const { call: fetchIcssPiProjects } = useFrappePostCall(icssAPI.getPiProjects);
  const { call: fetchIcssProjectHeads } = useFrappePostCall(icssAPI.getProjectAccountHeads);
  const [icssPiProjects, setIcssPiProjects] = React.useState<any[]>([]);
  const [icssPiHeads, setIcssPiHeads] = React.useState<any[]>([]);
  const [icssSelectedProject, setIcssSelectedProject] = React.useState("");
  const [icssSelectedHead, setIcssSelectedHead] = React.useState("");

  // Other-PI approval step: only the assigned PI charges one of their own projects.
  const isIcssPiStep =
    workflowState === "Pending Other PI" &&
    !!currentUser &&
    String(formData?.icss_other_pi_id || "").toLowerCase() === String(currentUser).toLowerCase();

  React.useEffect(() => {
    if (!isIcssPiStep) return;
    fetchIcssPiProjects({})
      .then((r: any) => setIcssPiProjects(r?.message || []))
      .catch(() => setIcssPiProjects([]));
  }, [isIcssPiStep]);

  React.useEffect(() => {
    setIcssSelectedHead("");
    if (!icssSelectedProject) { setIcssPiHeads([]); return; }
    fetchIcssProjectHeads({ project_name: icssSelectedProject })
      .then((r: any) => setIcssPiHeads(r?.message || []))
      .catch(() => setIcssPiHeads([]));
  }, [icssSelectedProject]);

  const { call: updateSendToDirectorCall } = useFrappePostCall(
    icssAPI.updateSendToDirector,
  );
  const { call: publishStagedCommitCall } = useFrappePostCall(
    "rndopsapp.rndopsapp.commitPayment.manually_publish_staged_commit",
  );
  const { call: getListCall } = useFrappePostCall("frappe.client.get_list");
  const { call: submitPayment, loading: isPaying } = useFrappePostCall(
    "rndopsapp.rndopsapp.commitPayment.submit_payment_data",
  );
  const { call: addComment } = useFrappePostCall(
    "rndopsapp.rndopsapp.api.add_project_comment",
  );

  const { call: getICSSUserDetails } = useFrappePostCall<{ message: any }>(
    icssAPI.getUserDetails,
  );
  const { call: fetchFrappeValue } = useFrappePostCall<{ message: any }>(
    "frappe.client.get_value",
  );

  // Rate Contract cascading dropdown hooks
  const { call: fetchPrincipalSuppliersByItemType } = useFrappePostCall<{
    message: any[];
  }>(rateContractAPI.getPrincipalSuppliersByItemType);
  const { call: fetchLocalSuppliersByPrincipal } = useFrappePostCall<{
    message: any[];
  }>(rateContractAPI.getLocalSuppliersByPrincipal);
  const { call: fetchPrincipalSupplierDetails } = useFrappePostCall<{
    message: any;
  }>(rateContractAPI.getPrincipalSupplierDetails);
  const { call: fetchLocalSupplierDetails } = useFrappePostCall<{
    message: any;
  }>(rateContractAPI.getLocalSupplierDetails);
  const { call: fetchVendorDetails } = useFrappePostCall<{ message: any }>(
    rateContractAPI.getVendorDetails,
  );
  const { call: fetchVendorsByP4ItemType } = useFrappePostCall<{
    message: any[];
  }>(rateContractAPI.getVendorsByP4ItemType);

  const {
    budgetData,
    heads: budgetHeads,
    actualBalance,
    commitableBalance,
  } = useProjectBudget(projectCode);
  const balanceApiParams = React.useMemo(
    () => ({ project_number: projectCode }),
    [projectCode],
  );
  const balanceApiOptions = React.useMemo(
    () => ({ revalidateOnFocus: false, isPaused: () => !projectCode }),
    [projectCode],
  );
  const { data: projectAmountsData } = useFrappeGetCall<{
    message: {
      status: string;
      data: {
        availableCommitAmount: number;
        availablePaymentAmount: number;
      };
    };
  }>(
    "rndopsapp.rndopsapp.commitPayment.get_project_available_amounts",
    balanceApiParams,
    balanceApiOptions,
  );

  useEffect(() => {
    linkOptionsRef.current = linkOptions;
  }, [linkOptions]);

  const projectAmountsResult =
    (projectAmountsData as any)?.message?.data ??
    (projectAmountsData as any)?.data ??
    {};
  const totalCommitableBalance =
    projectAmountsResult?.availablePaymentAmount ??
    projectAmountsResult?.availableCommitAmount ??
    0;
  const defaultCommitBudgetHead = React.useMemo(() => {
    const rawHead = String(
      formData.icss_account_head ||
      formData.account_head ||
      formData.budget_head ||
      formData.icss_other_account_head ||
      "",
    ).trim();

    if (!rawHead) return "";

    const normalizedRawHead = rawHead.toLowerCase();
    const directBudgetHeadMatch = budgetHeads.find(
      (head) => head.trim().toLowerCase() === normalizedRawHead,
    );

    if (directBudgetHeadMatch) {
      return directBudgetHeadMatch;
    }

    const budgetHeadMasterMatch = budgetHeadList.find(
      (head) =>
        head.docname.trim().toLowerCase() === normalizedRawHead ||
        head.id.trim().toLowerCase() === normalizedRawHead ||
        head.name.trim().toLowerCase() === normalizedRawHead,
    );

    if (budgetHeadMasterMatch) {
      return (
        budgetHeads.find(
          (head) =>
            head.trim().toLowerCase() ===
            budgetHeadMasterMatch.name.trim().toLowerCase(),
        ) || budgetHeadMasterMatch.name
      );
    }

    return rawHead;
  }, [
    budgetHeadList,
    budgetHeads,
    formData.account_head,
    formData.budget_head,
    formData.icss_account_head,
    formData.icss_other_account_head,
  ]);

  const linkedCommitment = budgetData.find(
    (entry) =>
      (entry.ref === currentDocName || entry.frapAppId === currentDocName) &&
      entry.type === "commitment",
  );
  const poCommitReferenceName = currentDocName || "";
  const previousIcssCommitment = React.useMemo(() => {
    const entries = budgetData.filter(
      (entry) =>
        entry.type === "commitment" &&
        (entry.ref === currentDocName || entry.frapAppId === currentDocName),
    );

    return (
      entries.find((entry) => entry.ref === currentDocName) ||
      entries.find((entry) => entry.frapAppId === currentDocName) ||
      null
    );
  }, [budgetData, currentDocName]);
  const previousIcssCommitmentTid = previousIcssCommitment?.transactionId
    ? String(previousIcssCommitment.transactionId)
    : "";
  const poCommitAmount = React.useMemo(
    () => getIcssPoCommitAmount(poDraftData, formData),
    [formData, poDraftData],
  );
  const isCommitted = !!linkedCommitment;
  const displayCommitment = linkedCommitment
    ? { head: linkedCommitment.head, committed: linkedCommitment.committed }
    : null;
  const showCommitSection =
    isRnDStaff &&
    !!currentDocName &&
    !!workflowState &&
    !["Draft", "Rejected", "Cancelled"].includes(workflowState);
  const commitRequired =
    workflowState === "Pending Staff Approval" &&
    isRnDStaff &&
    isCommittedForGate === false;
  const poCommitRequired =
    workflowState === "Pending PO Generation" &&
    isRnDStaff &&
    isPoCommittedForGate !== true;
  const poGenerateAction = React.useMemo(() => {
    if (workflowState !== "Pending PO Generation") return null;
    return (
      availableActions.find(
        (action) => /generate/i.test(action) && /po/i.test(action),
      ) ||
      availableActions.find((action) => /generate/i.test(action)) ||
      null
    );
  }, [availableActions, workflowState]);
  const filteredWorkflowActions = React.useMemo(
    () =>
      availableActions.filter((action) =>
        poGenerateAction ? action !== poGenerateAction : true,
      ),
    [availableActions, poGenerateAction],
  );
  const isPoDraftSaved = !!poDraftData && hasSavedPoDraft && !isPoDraftDirty;

  useEffect(() => {
    const fetchBudgetHeads = async () => {
      try {
        const response = await fetch(
          '/api/resource/Budget%20Head?fields=["name","budget_head","id"]&order_by=id%20asc&limit_page_length=0',
          { credentials: "include" },
        );
        const result = await response.json();
        if (result?.data) {
          setBudgetHeadList(
            result.data.map((item: any) => ({
              docname: String(item.name || ""),
              name: item.budget_head,
              id: String(item.id),
            })),
          );
        }
      } catch (error) {
        console.error("Failed to fetch budget heads for ICSS:", error);
      }
    };

    fetchBudgetHeads();
  }, []);

  useEffect(() => {
    if (linkedCommitment && !paymentAmount) {
      setPaymentAmount(String(linkedCommitment.committed));
    }
  }, [linkedCommitment, paymentAmount]);

  useEffect(() => {
    let isCancelled = false;

    const fetchCheckedByUser = async () => {
      if (!currentUser || ["Administrator", "Guest"].includes(currentUser)) {
        setCheckedByUser({ name: "", designation: "" });
        return;
      }

      try {
        const detailsResponse = await getICSSUserDetails({
          user_email: currentUser,
        });

        const details = detailsResponse?.message || {};
        if (isCancelled) return;

        setCheckedByUser({
          name:
            details.applicant_name ||
            details.full_name ||
            details.name ||
            details.user_name ||
            currentUser,
          designation: details.designation_name || details.designation || "",
        });
      } catch (error) {
        console.error("Failed to fetch checked-by user details:", error);
        if (!isCancelled) {
          setCheckedByUser({ name: currentUser, designation: "" });
        }
      }
    };

    const fetchHosRndSignatory = async () => {
      try {
        const roleResponse = await getListCall({
          doctype: "Has Role",
          filters: [
            ["role", "=", "Hos, RnD (Head of Section, RnD)"],
            ["parenttype", "=", "User"],
          ],
          fields: ["parent"],
          limit_page_length: 1,
        });

        const hosUserEmail =
          roleResponse?.message?.[0]?.parent ||
          roleResponse?.message?.[0]?.name;

        if (!hosUserEmail) return;

        const detailsResponse = await getICSSUserDetails({
          user_email: hosUserEmail,
        });

        const details = detailsResponse?.message || {};
        if (isCancelled) return;

        setHosRndSignatory({
          name:
            details.full_name ||
            details.name ||
            details.user_name ||
            hosUserEmail,
          designation:
            details.designation_name ||
            details.designation ||
            "Hos, RnD (Head of Section, RnD)",
        });
      } catch (error) {
        console.error("Failed to fetch HoS, RnD signatory details:", error);
      }
    };

    const fetchRndAdminSignatory = async () => {
      try {
        const detailsResponse = await getICSSUserDetails({
          user_email: "rndadmin@iitg.ac.in",
        });
        const details = detailsResponse?.message || {};
        if (isCancelled) return;
        setRndAdminSignatory({
          name: details.full_name || details.applicant_name || details.name || "rndadmin",
          designation: details.designation_name || details.designation || "",
        });
      } catch (error) {
        console.error("Failed to fetch rndadmin signatory details:", error);
      }
    };

    fetchCheckedByUser();
    fetchHosRndSignatory();
    fetchRndAdminSignatory();

    return () => {
      isCancelled = true;
    };
  }, [currentUser, getICSSUserDetails, getListCall]);

  // --- LEGACY UTILS ---
  const numberInWords = useCallback((number: number): string => {
    if (number < 0 || number > 999999999999) return "!!!";
    let num = number;
    const Gn = Math.floor(num / 10000000); /* Crore */
    num -= Gn * 10000000;
    const kn = Math.floor(num / 100000); /* lakhs */
    num -= kn * 100000;
    const Hn = Math.floor(num / 1000); /* thousand */
    num -= Hn * 1000;
    const Dn = Math.floor(num / 100);
    num = num % 100; /* Tens */
    const tn = Math.floor(num / 10);
    const one = Math.floor(num % 10);

    let res = "";
    if (Gn > 0) res += numberInWords(Gn) + " Crore";
    if (kn > 0) res += (res === "" ? "" : " ") + numberInWords(kn) + " Lakh";
    if (Hn > 0)
      res += (res === "" ? "" : " ") + numberInWords(Hn) + " Thousand";
    if (Dn > 0) res += (res === "" ? "" : " ") + numberInWords(Dn) + " Hundred";

    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    if (tn > 0 || one > 0) {
      if (res !== "") res += " and ";
      if (tn < 2) {
        res += ones[tn * 10 + one];
      } else {
        res += tens[tn];
        if (one > 0) res += "-" + ones[one];
      }
    }
    if (res === "") res = "Zero";
    return res;
  }, []);

  const convertAmountToWords = useCallback(
    (numStr: string | number): string => {
      const num = parseFloat(String(numStr));
      if (isNaN(num)) return "";
      const integerPart = Math.floor(num);
      let decimalPartStr = String(num.toFixed(2)).split(".")[1] || "00";
      let words = "Rupees " + numberInWords(integerPart) + " Only";
      if (decimalPartStr !== "00") {
        const digits = [
          "Zero",
          "One",
          "Two",
          "Three",
          "Four",
          "Five",
          "Six",
          "Seven",
          "Eight",
          "Nine",
        ];
        const p1 = digits[parseInt(decimalPartStr.charAt(0))];
        const p2 = digits[parseInt(decimalPartStr.charAt(1))];
        words =
          "Rupees " +
          numberInWords(integerPart) +
          " Point " +
          p1 +
          " " +
          p2 +
          " Paisa Only";
      }
      return words;
    },
    [numberInWords],
  );

  const flattenChildDocument = useCallback(
    (prefillData: Record<string, any> | null | undefined) => {
      if (
        !prefillData ||
        !prefillData.child_document ||
        typeof prefillData.child_document !== "object"
      ) {
        return prefillData || {};
      }

      const flatData: Record<string, any> = { ...prefillData };
      const childDocument = prefillData.child_document as Record<string, any>;

      Object.entries(childDocument).forEach(([key, value]) => {
        if (
          flatData[key] === undefined ||
          flatData[key] === null ||
          flatData[key] === ""
        ) {
          flatData[key] = value;
        }
      });

      return flatData;
    },
    [],
  );

  const getRealFieldNames = useCallback((fieldList: FormField[]) => {
    return fieldList
      .map((field) => field.fieldname)
      .filter(
        (fieldname): fieldname is string =>
          Boolean(fieldname) &&
          !fieldname.startsWith("section_break") &&
          !fieldname.startsWith("column_break"),
      );
  }, []);

  const resolveLinkOptionValue = useCallback(
    (fieldname: string, rawValue: any, fallbackKeys: string[] = []) => {
      if (!rawValue || typeof rawValue !== "string") {
        return rawValue;
      }

      const trimmedValue = rawValue.trim();
      if (!trimmedValue) {
        return "";
      }

      const currentLinkOptions = linkOptionsRef.current;
      const optionsForField = [
        ...(currentLinkOptions[fieldname] || []),
        ...fallbackKeys.flatMap((key) => currentLinkOptions[key] || []),
      ];

      const exactMatch = optionsForField.find(
        (option) => option.value === trimmedValue,
      );
      if (exactMatch) {
        return exactMatch.value;
      }

      const labelMatch = optionsForField.find(
        (option) =>
          option.label?.trim().toLowerCase() === trimmedValue.toLowerCase(),
      );
      if (labelMatch) {
        return labelMatch.value;
      }

      return trimmedValue;
    },
    [],
  );

  const resolveUserLinkValue = useCallback(
    (fieldname: string, rawValue: any) => {
      return resolveLinkOptionValue(fieldname, rawValue, [
        "User",
        "webmail_id",
      ]);
    },
    [resolveLinkOptionValue],
  );

  const resolveDepartmentLinkValue = useCallback(
    (fieldname: string, rawValue: any) => {
      return resolveLinkOptionValue(fieldname, rawValue, [
        "Department_prornd",
        "department",
        "icss_applicant_department__centre__section",
        "icss_applying_for_department_centre_section",
      ]);
    },
    [resolveLinkOptionValue],
  );

  const normalizeIcssFormData = useCallback(
    (rawData: Record<string, any>) => {
      const normalizedData = { ...rawData };

      const applicantWebmail =
        resolveUserLinkValue(
          "icss_applicant_webmail_id",
          normalizedData.icss_applicant_webmail_id,
        ) ||
        resolveUserLinkValue(
          "applicant_webmail_id",
          normalizedData.applicant_webmail_id,
        ) ||
        resolveUserLinkValue("webmail_id", normalizedData.webmail_id) ||
        "";

      const applyingForWebmail =
        resolveUserLinkValue(
          "icss_applying_for_mail",
          normalizedData.icss_applying_for_mail,
        ) ||
        resolveUserLinkValue(
          "applying_for_mail",
          normalizedData.applying_for_mail,
        ) ||
        "";

      const applicantNameValue = resolveUserLinkValue(
        "icss_applicant_name",
        normalizedData.icss_applicant_name || normalizedData.applicant_name,
      );
      const applyingForNameValue = resolveUserLinkValue(
        "icss_applying_for_name",
        normalizedData.icss_applying_for_name ||
        normalizedData.applying_for_name,
      );
      const isUserLinkValue = (value: any) =>
        typeof value === "string" && value.includes("@");

      if (applicantWebmail) {
        normalizedData.icss_applicant_webmail_id = applicantWebmail;
        normalizedData.webmail_id = applicantWebmail;
        normalizedData.icss_applicant_name =
          isUserLinkValue(applicantNameValue) || normalizedData.__for_save
            ? applicantWebmail
            : applicantNameValue ||
            normalizedData.applicant_name ||
            applicantWebmail;
      } else if (isUserLinkValue(applicantNameValue)) {
        normalizedData.icss_applicant_webmail_id = applicantNameValue;
        normalizedData.webmail_id = applicantNameValue;
        normalizedData.icss_applicant_name = applicantNameValue;
      }

      if (applyingForWebmail) {
        normalizedData.icss_applying_for_mail = applyingForWebmail;
        normalizedData.applying_for_mail = applyingForWebmail;
        normalizedData.icss_applying_for_name = isUserLinkValue(
          applyingForNameValue,
        )
          ? applyingForNameValue
          : applyingForWebmail;
      } else if (isUserLinkValue(applyingForNameValue)) {
        normalizedData.icss_applying_for_mail = applyingForNameValue;
        normalizedData.applying_for_mail = applyingForNameValue;
        normalizedData.icss_applying_for_name = applyingForNameValue;
      }

      const applicantDepartment = normalizedData.__for_save
        ? resolveDepartmentLinkValue(
          "icss_applicant_department__centre__section",
          normalizedData.icss_applicant_department__centre__section ||
          normalizedData.department,
        )
        : normalizedData.icss_applicant_department__centre__section ||
        normalizedData.department;

      if (applicantDepartment) {
        normalizedData.icss_applicant_department__centre__section =
          applicantDepartment;
        normalizedData.department = applicantDepartment;
      }

      if (
        normalizedData.designation &&
        !normalizedData.icss_applicant_designation
      ) {
        normalizedData.icss_applicant_designation = normalizedData.designation;
      }

      const applyingForDepartment = normalizedData.__for_save
        ? resolveDepartmentLinkValue(
          "icss_applying_for_department_centre_section",
          normalizedData.icss_applying_for_department_centre_section ||
          normalizedData.applying_for_department,
        )
        : normalizedData.icss_applying_for_department_centre_section ||
        normalizedData.applying_for_department;

      if (applyingForDepartment) {
        normalizedData.icss_applying_for_department_centre_section =
          applyingForDepartment;
        normalizedData.applying_for_department = applyingForDepartment;
      }

      if (
        normalizedData.applying_for_designation &&
        !normalizedData.icss_applying_for_designation
      ) {
        normalizedData.icss_applying_for_designation =
          normalizedData.applying_for_designation;
      }

      return normalizedData;
    },
    [resolveDepartmentLinkValue, resolveUserLinkValue],
  );

  const enrichApplicantDisplayData = useCallback(
    async (rawData: Record<string, any>) => {
      const data = { ...rawData };
      const applicantWebmail =
        data.icss_applicant_webmail_id ||
        data.webmail_id ||
        (typeof data.icss_applicant_name === "string" &&
          data.icss_applicant_name.includes("@")
          ? data.icss_applicant_name
          : "");

      if (
        !applicantWebmail ||
        ["Administrator", "Guest"].includes(applicantWebmail)
      ) {
        return data;
      }

      try {
        const res = await getICSSUserDetails({ user_email: applicantWebmail });
        const userDetails = res?.message || {};
        const applicantName =
          userDetails.applicant_name ||
          userDetails.full_name ||
          data.applicant_name;

        return {
          ...data,
          icss_applicant_webmail_id: applicantWebmail,
          webmail_id: applicantWebmail,
          icss_applicant_name:
            applicantName || data.applicant_name || applicantWebmail,
          applicant_name: applicantName || data.applicant_name,
          icss_applicant_department__centre__section:
            userDetails.department ||
            data.icss_applicant_department__centre__section,
          department: userDetails.department || data.department,
          icss_applicant_designation:
            userDetails.designation || data.icss_applicant_designation,
          designation: userDetails.designation || data.designation,
        };
      } catch (e) {
        console.error("Failed to fetch ICSS applicant display details", e);
        return data;
      }
    },
    [getICSSUserDetails],
  );

  const buildCompositePayload = useCallback(
    (preparedData: Record<string, any>) => {
      const parentFieldnames = new Set(getRealFieldNames(baseFields));
      const childFieldnames = new Set(getRealFieldNames(subFormFields));
      const tableFieldnames = new Set(
        [...baseFields, ...subFormFields]
          .filter((field) => field.fieldtype === "Table")
          .map((field) => field.fieldname),
      );

      const parent: Record<string, any> = {};
      const child: Record<string, any> = {};

      Object.entries(preparedData).forEach(([key, value]) => {
        if (parentFieldnames.has(key)) {
          parent[key] =
            tableFieldnames.has(key) && !Array.isArray(value) ? [] : value;
        } else if (childFieldnames.has(key)) {
          child[key] =
            tableFieldnames.has(key) && !Array.isArray(value) ? [] : value;
        }
      });

      child.indent_type =
        preparedData.indent_type ||
        preparedData.icss_indent_type ||
        selectedIndentType;

      baseFields.forEach((field) => {
        if (
          field.fieldtype === "Table" &&
          parent[field.fieldname] === undefined
        ) {
          parent[field.fieldname] = [];
        }
      });
      if (!Array.isArray(parent.icss_items)) {
        parent.icss_items = [];
      }

      subFormFields.forEach((field) => {
        if (
          field.fieldtype === "Table" &&
          child[field.fieldname] === undefined
        ) {
          child[field.fieldname] = [];
        }
      });

      const docName = savedDocName || editDocName;
      if (docName) {
        parent.name = docName;
        child.indent_cum_sanction_sheet_id =
          child.indent_cum_sanction_sheet_id || docName;
      }

      parent.icss_indent_type = selectedIndentType;
      child.project_no =
        child.project_no || parent.project_no || preparedData.project_no;
      child.project_ref =
        child.project_ref || parent.project_ref || preparedData.project_ref;
      child.indent_type =
        child.indent_type || parent.icss_indent_type || selectedIndentType;

      const childDoctypeMap: Record<string, string> = {
        "Proprietary Purchase with Proprietary certificate from the OEM":
          "proprietary_purchase",
        "Standerdised/ Emergent Purchase": "standerdized_purchase",
        "Repair/ Repleacement": "repair_replacement",
        "Annual Maintenance Contract": "AMC",
        "Rate Contract Purchase": "Rate Contract",
      };
      const childTableDefaults: Record<string, string[]> = {
        "Proprietary Purchase with Proprietary certificate from the OEM": [
          "table_qanf",
        ],
        "Standerdised/ Emergent Purchase": ["details_of_items_to_be_purchased"],
        "Rate Contract Purchase": ["items"],
      };

      if (childDoctypeMap[selectedIndentType] && !child.doctype) {
        child.doctype = childDoctypeMap[selectedIndentType];
      }
      (childTableDefaults[selectedIndentType] || []).forEach((fieldname) => {
        if (!Array.isArray(child[fieldname])) {
          child[fieldname] = [];
        }
      });

      if (preparedData.child_document?.name && !child.name) {
        child.name = preparedData.child_document.name;
      }
      if (preparedData.child_doctype && !child.doctype) {
        child.doctype = preparedData.child_doctype;
      }

      return { parent, child };
    },
    [
      baseFields,
      subFormFields,
      getRealFieldNames,
      savedDocName,
      editDocName,
      selectedIndentType,
    ],
  );

  const persistIcssData = useCallback(async () => {
    const currentProjectNo =
      formData.project_code ||
      projectNoParam ||
      projectParam ||
      formData.project_no;
    const currentProjectRef =
      formData.project_ref || searchParams.get("project_ref");

    const isNewDraft = !savedDocName && !editDocName;
    const currentUserFallback =
      isNewDraft &&
        currentUser &&
        !["Administrator", "Guest"].includes(currentUser)
        ? currentUser
        : "";

    const normalizedFormData = normalizeIcssFormData({
      ...formData,
      __for_save: true,
      icss_applicant_webmail_id:
        formData.icss_applicant_webmail_id ||
        formData.webmail_id ||
        currentUserFallback,
      webmail_id:
        formData.webmail_id ||
        formData.icss_applicant_webmail_id ||
        currentUserFallback,
      icss_applicant_name:
        formData.icss_applicant_name ||
        formData.webmail_id ||
        formData.icss_applicant_webmail_id ||
        currentUserFallback,
      icss_indent_type: selectedIndentType,
      indent_type: formData.indent_type || selectedIndentType,
      icss_items: Array.isArray(formData.icss_items) ? formData.icss_items : [],
      name: savedDocName || editDocName,
      project_no: currentProjectNo,
      project_ref: currentProjectRef,
    });
    delete normalizedFormData.__for_save;

    const preparedData = await prepareFormDataForApi(normalizedFormData);

    const compositePayload = buildCompositePayload(preparedData);

    try {
      const compositeResponse = await saveCompositeCall({
        data: compositePayload,
      });
      if (compositeResponse?.message?.status === "success") {
        return {
          response: compositeResponse,
          preparedData,
          docname: compositeResponse.message.docname,
        };
      }
      if (compositeResponse?.message?.status === "error") {
        return {
          response: compositeResponse,
          preparedData,
          docname: compositeResponse.message.docname,
        };
      }
      throw new Error(
        compositeResponse?.message?.message || "Composite save failed",
      );
    } catch (compositeError) {
      console.warn(
        "ICSS composite save failed, falling back to flat save.",
        compositeError,
      );
    }

    const flatResponse = await saveCall({ data: preparedData });
    return {
      response: flatResponse,
      preparedData,
      docname: flatResponse?.message?.docname,
    };
  }, [
    buildCompositePayload,
    currentUser,
    editDocName,
    formData,
    normalizeIcssFormData,
    projectNoParam,
    projectParam,
    saveCall,
    saveCompositeCall,
    savedDocName,
    searchParams,
    selectedIndentType,
  ]);

  // --- COMPUTATION ENGINE ---
  const applyComputations = useCallback(
    (data: any) => {
      if (!computationRules) return data;
      let newData = { ...data };

      try {
        // 1. apply row_calculations (e.g., amount = qty * rate)
        if (
          computationRules.row_calculations &&
          Array.isArray(computationRules.row_calculations)
        ) {
          computationRules.row_calculations.forEach((rule: any) => {
            const tableFieldname = rule.table || rule.table_fieldname;
            const targetField = rule.target || rule.target_field;
            if (tableFieldname && targetField && newData[tableFieldname]) {
              newData[tableFieldname] = newData[tableFieldname].map(
                (row: any) => {
                  let formula = rule.formula;
                  Object.keys(row).forEach((k) => {
                    const val =
                      row[k] !== undefined && row[k] !== null && row[k] !== ""
                        ? row[k]
                        : 0;
                    formula = formula.replace(
                      new RegExp(`\\b${k}\\b`, "g"),
                      val,
                    );
                  });
                  try {
                    const result = new Function(`return ${formula}`)();
                    return {
                      ...row,
                      [targetField]: isNaN(result) ? 0 : roundCurrency(result),
                    };
                  } catch (e) {
                    return row;
                  }
                },
              );
            }
          });
        }

        // 2. apply aggregations (e.g., basic_value = sum(amount))
        if (
          computationRules.aggregations &&
          Array.isArray(computationRules.aggregations)
        ) {
          computationRules.aggregations.forEach((rule: any) => {
            const tableFieldname = rule.table || rule.source_table;
            const sourceField = rule.field || rule.source_field;
            const targetField = rule.target || rule.target_field;
            const operation = rule.type || rule.operation;
            if (
              tableFieldname &&
              sourceField &&
              targetField &&
              newData[tableFieldname]
            ) {
              if (operation === "sum") {
                const sum = newData[tableFieldname].reduce(
                  (acc: number, row: any) =>
                    acc + (toNumber(row[sourceField]) || 0),
                  0,
                );
                newData[targetField] = roundCurrency(sum);
              }
            }
          });
        }

        // 3. apply computed_fields (e.g., grand_total = basic_value + (basic_value * gst / 100))
        if (
          computationRules.computed_fields &&
          Array.isArray(computationRules.computed_fields)
        ) {
          computationRules.computed_fields.forEach((rule: any) => {
            let formula = rule.formula;
            Object.keys(newData).forEach((k) => {
              if (typeof newData[k] !== "object") {
                const rawValue =
                  newData[k] !== undefined &&
                    newData[k] !== null &&
                    newData[k] !== ""
                    ? newData[k]
                    : 0;
                const val =
                  typeof rawValue === "number"
                    ? rawValue
                    : Number(String(rawValue).replace(/,/g, "")) || 0;
                formula = formula.replace(new RegExp(`\\b${k}\\b`, "g"), val);
              }
            });
            try {
              const result = new Function(`return ${formula}`)();
              newData[rule.target_field || rule.target] = isNaN(result)
                ? 0
                : roundCurrency(result);
            } catch (e) { }
          });
        }

        // 4. Legacy Word Conversions
        const finalTotal = newData.grand_total || newData.total_estimate;
        if (
          finalTotal !== undefined &&
          finalTotal !== null &&
          !isNaN(finalTotal)
        ) {
          const inWords = convertAmountToWords(finalTotal);
          if (
            "amount_in_words" in newData ||
            fields.find((f) => f.fieldname === "amount_in_words")
          )
            newData.amount_in_words = inWords;
          if (
            "grand_total_in_words" in newData ||
            fields.find((f) => f.fieldname === "grand_total_in_words")
          )
            newData.grand_total_in_words = inWords;
          if (
            "total_estimate_in_words" in newData ||
            fields.find((f) => f.fieldname === "total_estimate_in_words")
          )
            newData.total_estimate_in_words = inWords;
        }
      } catch (e) {
        console.error("Computation engine error:", e);
      }
      return newData;
    },
    [computationRules],
  );

  const applyIcssPurchaseCalculations = useCallback(
    (data: Record<string, any>) => {
      const next = { ...data };

      const calculateRows = (rows: any[] = []) =>
        rows.map((row) => {
          const base = toNumber(row.icss_qty) * toNumber(row.icss_rate);
          const afterDiscount =
            base - (base * toNumber(row.icss_discount_percent)) / 100;
          const amount =
            afterDiscount +
            (afterDiscount * toNumber(row.icss_gst_percent)) / 100;
          return {
            ...row,
            icss_amount: roundCurrency(amount),
          };
        });

      const hasProprietaryTotals =
        Array.isArray(next.table_qanf) ||
        [
          "pp_estimated_basic_value",
          "pp_pack_and_forward",
          "pp_freight",
          "pp_other_charges",
          "pp_grand_total",
        ].some((fieldname) => fieldname in next);
      const hasStandardizedTotals =
        Array.isArray(next.details_of_items_to_be_purchased) ||
        [
          "sp_total_basic_value",
          "sp_pack_and_frwd",
          "sp_freight",
          "sp_other_charges",
          "sp_grand_total",
        ].some((fieldname) => fieldname in next);

      if (hasProprietaryTotals) {
        next.table_qanf = calculateRows(next.table_qanf || []);
        const basicValue = roundCurrency(
          next.table_qanf.reduce(
            (sum: number, row: any) => sum + toNumber(row.icss_amount),
            0,
          ),
        );
        next.pp_estimated_basic_value = basicValue;
        const grandTotal = roundCurrency(
          basicValue +
          toNumber(next.pp_pack_and_forward) +
          toNumber(next.pp_freight) +
          toNumber(next.pp_other_charges),
        );
        next.pp_grand_total = grandTotal;
        next.amount_in_words = convertAmountToWords(grandTotal);
      }

      if (hasStandardizedTotals) {
        next.details_of_items_to_be_purchased = calculateRows(
          next.details_of_items_to_be_purchased || [],
        );
        const basicValue = roundCurrency(
          next.details_of_items_to_be_purchased.reduce(
            (sum: number, row: any) => sum + toNumber(row.icss_amount),
            0,
          ),
        );
        next.sp_total_basic_value = basicValue;
        const grandTotal = roundCurrency(
          basicValue +
          toNumber(next.sp_pack_and_frwd) +
          toNumber(next.sp_freight) +
          toNumber(next.sp_other_charges),
        );
        next.sp_grand_total = grandTotal;
        next.amount_in_words = convertAmountToWords(grandTotal);
      }

      if (
        ["rr_repair_expenditure", "rr_other_charges", "rr_grand_total"].some(
          (fieldname) => fieldname in next,
        )
      ) {
        const grandTotal = roundCurrency(
          toNumber(next.rr_repair_expenditure) +
          toNumber(next.rr_other_charges),
        );
        next.rr_grand_total = grandTotal;
        next.amount_in_words = convertAmountToWords(grandTotal);
      }

      if (
        [
          "basic_value_bv_of_the_po",
          "amc_value",
          "amc_other_charges",
          "amc_gst",
          "amc_grand_total",
        ].some((fieldname) => fieldname in next)
      ) {
        const basicValue = toNumber(next.basic_value_bv_of_the_po);
        const amcPercent = toNumber(next.amc_value);
        const amcValueAmount = (basicValue * amcPercent) / 100;
        const subtotal = amcValueAmount + toNumber(next.amc_other_charges);
        const gstAmount = (subtotal * toNumber(next.amc_gst)) / 100;
        const grandTotal = roundCurrency(subtotal + gstAmount);

        next.amc_grand_total = grandTotal;
        next.grand_total_in_words = convertAmountToWords(grandTotal);
        next.amount_in_words = convertAmountToWords(grandTotal);
      }

      return next;
    },
    [convertAmountToWords],
  );

  // All save/workflow/action operations route through parent ICSS controller.
  // Backend handles sub-doctype creation/update automatically via before_save hooks.

  // --- DATA FETCHING ---
  const fetchFormConfiguration = useCallback(
    async (docNameOverride?: string) => {
      setIsLoadingFields(true);
      try {
        const currentDocName = docNameOverride || editDocName || savedDocName;
        console.log(
          "Fetching ICSS config for:",
          currentDocName ? `Doc: ${currentDocName}` : "New Document",
        );

        const response = await getFieldsCall({ doc_name: currentDocName });
        if (response && response.message) {
          const {
            fields: fetchedFields,
            prefill_data,
            link_options,
          } = response.message;
          console.log("Fetched ICSS Fields:", fetchedFields?.length);

          const HIDDEN_FIELDS = [
            "amended_from",
            "section_break_e3vp",
            "column_break_mlei",
            "workflow_state",
            "director_approval_required",
            "send_to_director",
            "director_signed_pdf",
            "icss_signed_po_file",
          ];
          const filteredFields = (fetchedFields || []).filter(
            (f: any) => !HIDDEN_FIELDS.includes(f.fieldname),
          );

          setBaseFields(filteredFields);
          setLinkOptions(link_options || {});

          // Load all active principal suppliers so the dropdown isn't limited
          // to whatever subset the backend pre-packages in link_options.
          try {
            const principalRes = await getListCall({
              doctype: "Principal Supplier",
              fields: ["name", "principal_supplier_name"],
              filters: [["status", "=", "Active"]],
              limit_page_length: 0,
            });
            if (principalRes?.message?.length) {
              const allPrincipals = principalRes.message.map((r: any) => ({
                value: r.name,
                label: r.principal_supplier_name || r.name,
              }));
              setLinkOptions((prev) => ({
                ...prev,
                principal_supplier: mergeLinkOptionLists(prev.principal_supplier, allPrincipals),
              }));
            }
          } catch (e) {
            console.error("Failed to load all principal suppliers:", e);
          }

          if (response.message.computation_rules) {
            setComputationRules(response.message.computation_rules);
          }

          // Initialize Form Data
          if (currentDocName && prefill_data) {
            const normalizedData = normalizeIcssFormData({
              ...flattenChildDocument(prefill_data),
              indent_type:
                prefill_data.indent_type || prefill_data.icss_indent_type,
            });
            const enrichedData =
              await enrichApplicantDisplayData(normalizedData);
            setFormData(normalizeIcssFormData(enrichedData));
            setWorkflowState(prefill_data.workflow_state || "Draft");
            setDocStatus(prefill_data.docstatus || 0);
            if (prefill_data.icss_indent_type) {
              setSelectedIndentType(prefill_data.icss_indent_type);
            }
          } else if (!currentDocName) {
            const initialData: Record<string, any> = { ...prefill_data };

            // Auto-set current user
            if (
              currentUser &&
              !initialData.icss_applicant_webmail_id &&
              !initialData.webmail_id
            ) {
              initialData.icss_applicant_webmail_id = currentUser;
              initialData.webmail_id = currentUser;
              initialData.icss_applicant_name = currentUser;
            }
            if (initialData.icss_indent_type && !initialData.indent_type) {
              initialData.indent_type = initialData.icss_indent_type;
            }

            // Fetch piheadmentor_user_id for head field
            const applicantWebmail =
              initialData.icss_applicant_webmail_id || initialData.webmail_id;
            if (
              applicantWebmail &&
              !["Administrator", "Guest"].includes(applicantWebmail)
            ) {
              try {
                const headRes = await fetchFrappeValue({
                  doctype: "User",
                  filters: { name: applicantWebmail },
                  fieldname: "piheadmentor_user_id",
                });
                if (headRes?.message?.piheadmentor_user_id) {
                  initialData.head = headRes.message.piheadmentor_user_id;
                }
              } catch (e) {
                console.error("Failed to fetch head (piheadmentor_user_id)", e);
              }
            }

            // Prefill project_no and project_ref from URL
            const projectCode = projectNoParam || projectParam;
            if (projectCode) {
              if (!initialData.project_no) initialData.project_no = projectCode;
              if (!initialData.project_code)
                initialData.project_code = projectCode;

              try {
                const projectRes = await fetchFrappeValue({
                  doctype: "Project Registration",
                  filters: { project_no: projectCode },
                  fieldname: [
                    "implementation_department",
                    "project_title",
                    "name",
                  ],
                });
                if (projectRes?.message) {
                  if (
                    projectRes.message.implementation_department &&
                    !initialData.department
                  ) {
                    initialData.department =
                      projectRes.message.implementation_department;
                  }
                  if (
                    projectRes.message.project_title &&
                    !initialData.project_title
                  ) {
                    initialData.project_title =
                      projectRes.message.project_title;
                  }
                  // project_ref is the Frappe docname of the Project Registration
                  if (projectRes.message.name && !initialData.project_ref) {
                    initialData.project_ref = projectRes.message.name;
                  }
                }
              } catch (e) {
                console.error("Failed to fetch project details:", e);
              }
            }

            if (searchParams.get("other_pi") === "1") {
              initialData.icss_other_pi = "Other";
              initialData.project_ref = "";
              initialData.project_no = "";
            }

            const normalizedData = normalizeIcssFormData(initialData);
            const enrichedData =
              await enrichApplicantDisplayData(normalizedData);
            setFormData(normalizeIcssFormData(enrichedData));
            setWorkflowState("Draft");
            setDocStatus(0);
          }
        }
      } catch (error) {
        console.error("Error fetching ICSS form details:", error);
        alert("Failed to load form schema");
      } finally {
        setIsLoadingFields(false);
      }
    },
    [
      editDocName,
      savedDocName,
      getFieldsCall,
      currentUser,
      getICSSUserDetails,
      fetchFrappeValue,
      enrichApplicantDisplayData,
      normalizeIcssFormData,
      projectParam,
      projectNoParam,
      projectRefParam,
      flattenChildDocument,
    ],
  );

  // --- FETCH SUB-FORM CONFIGURATION ---
  const fetchSubFormConfiguration = useCallback(
    async (indentType: string) => {
      if (!indentType) {
        setSubFormFields([]);
        return;
      }

      const callMap: Record<string, any> = {
        "Proprietary Purchase with Proprietary certificate from the OEM":
          getProprietaryFields,
        "Standerdised/ Emergent Purchase": getStandardizedFields,
        "Repair/ Repleacement": getRepairFields,
        "Rate Contract Purchase": getRateContractFields,
        "Annual Maintenance Contract": getAmcFields,
      };

      const callToMake = callMap[indentType];
      if (!callToMake) {
        setSubFormFields([]);
        return;
      }

      setIsLoadingSubForm(true);
      try {
        const childDocname =
          formData.child_document?.name || formData.sub_doctype_reference || "";

        let response = null;

        try {
          response = await getChildFieldsCall({
            indent_type: indentType,
            child_docname: childDocname,
          });
        } catch (genericChildError) {
          console.warn(
            "Generic ICSS child field API failed, falling back to legacy child API.",
            genericChildError,
          );
        }

        if (!response?.message) {
          // Rate Contract needs project_name and project_no for its prefill in the legacy API
          const isRateContract = indentType === "Rate Contract Purchase";
          const callArgs = isRateContract
            ? {
              doc_name: childDocname,
              project_name:
                formData.project_no || projectNoParam || projectParam || "",
              project_no:
                formData.project_no || projectNoParam || projectParam || "",
            }
            : { doc_name: childDocname };
          response = await callToMake(callArgs);
        }

        if (response?.message) {
          const {
            fields: sfFields,
            link_options: sfLinks,
            computation_rules: sfRules,
            prefill_data: sfPrefill,
          } = response.message;
          if (sfFields) {
            setSubFormFields(attachMissingTableChildFields(sfFields));
          }
          if (sfLinks) setLinkOptions((prev) => ({ ...prev, ...sfLinks }));
          if (sfPrefill) {
            setFormData((prev) =>
              normalizeIcssFormData({
                ...prev,
                ...flattenChildDocument(sfPrefill),
                indent_type: indentType,
              }),
            );
          } else {
            setFormData((prev) =>
              normalizeIcssFormData({ ...prev, indent_type: indentType }),
            );
          }
          if (indentType === "Rate Contract Purchase") {
            const projectNo =
              formData.project_no || projectNoParam || projectParam || "";
            if (projectNo) {
              setFormData((prev) => ({
                ...prev,
                project_name: prev.project_name || projectNo,
              }));
            }
          }
          if (sfRules) {
            setComputationRules((prev: any) => {
              if (!prev) return sfRules;
              return {
                row_calculations: [
                  ...(prev.row_calculations || []),
                  ...(sfRules.row_calculations || []),
                ],
                aggregations: [
                  ...(prev.aggregations || []),
                  ...(sfRules.aggregations || []),
                ],
                computed_fields: [
                  ...(prev.computed_fields || []),
                  ...(sfRules.computed_fields || []),
                ],
              };
            });
          }
        }
      } catch (error) {
        console.error("Error fetching sub-form fields:", error);
      } finally {
        setIsLoadingSubForm(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      editDocName,
      savedDocName,
      formData.child_document,
      formData.project_no,
      formData.sub_doctype_reference,
      getChildFieldsCall,
      projectNoParam,
      projectParam,
      flattenChildDocument,
      normalizeIcssFormData,
    ],
  );

  const hydrateRateContractP3DisplayOptions = useCallback(async () => {
    if (selectedIndentType !== "Rate Contract Purchase") return;

    const selectedFormType = String(formData.select_form_type || "");
    const isP3Form =
      !selectedFormType || selectedFormType.toLowerCase().includes("p3");

    if (!isP3Form) return;

    const itemType = formData.item_type;
    const principalSupplier = formData.principal_supplier;
    const localSupplier = formData.local_supplier;

    if (!itemType && !principalSupplier && !localSupplier) return;

    try {
      let principalOptions: LinkOption[] = [];
      let localOptions: LinkOption[] = [];
      let pinnedPrincipalOption: LinkOption | null = null;
      let pinnedLocalOption: LinkOption | null = null;
      const hydratedValues: Record<string, any> = {};

      if (itemType) {
        const principalRes = await fetchPrincipalSuppliersByItemType({
          item_type: itemType,
        });
        principalOptions = normalizeLinkOptionList(principalRes?.message || []);
      }

      if (principalSupplier) {
        const [principalDocRes, localRes] = await Promise.all([
          fetchFrappeValue({
            doctype: "Principal Supplier",
            filters: { name: principalSupplier },
            fieldname: ["principal_supplier_name", "addres", "agreement_no"],
          }),
          fetchLocalSuppliersByPrincipal({
            principal_supplier: principalSupplier,
          }),
        ]);

        const principalDoc = principalDocRes?.message || {};
        pinnedPrincipalOption = {
          value: String(principalSupplier),
          label:
            principalDoc.principal_supplier_name || String(principalSupplier),
        };
        hydratedValues.principal_address = principalDoc.addres || "";
        hydratedValues.agreement_no = principalDoc.agreement_no || "";
        localOptions = normalizeLinkOptionList(localRes?.message || []);
      }

      if (localSupplier) {
        const localDocRes = await fetchFrappeValue({
          doctype: "Local Supplier Detail",
          filters: { name: localSupplier },
          fieldname: ["local_supplier_name", "address", "email"],
        });
        const localDoc = localDocRes?.message || {};
        pinnedLocalOption = {
          value: String(localSupplier),
          label: localDoc.local_supplier_name || String(localSupplier),
        };
        hydratedValues.local_address = localDoc.address || "";
        hydratedValues.local_email = localDoc.email || "";
      }

      setLinkOptions((prev) => ({
        ...prev,
        principal_supplier: mergeLinkOptionLists(
          prev.principal_supplier,
          principalOptions,
          pinnedPrincipalOption ? [pinnedPrincipalOption] : [],
        ),
        local_supplier: mergeLinkOptionLists(
          prev.local_supplier,
          localOptions,
          pinnedLocalOption ? [pinnedLocalOption] : [],
        ),
      }));

      if (Object.values(hydratedValues).some(Boolean)) {
        setFormData((prev) => {
          const missingValues = Object.fromEntries(
            Object.entries(hydratedValues).filter(
              ([key, value]) => !prev[key] && value,
            ),
          );

          if (Object.keys(missingValues).length === 0) {
            return prev;
          }

          return applyComputations({
            ...prev,
            ...missingValues,
          });
        });
      }
    } catch (error) {
      console.error(
        "Failed to hydrate Rate Contract P3 display options:",
        error,
      );
    }
  }, [
    applyComputations,
    fetchFrappeValue,
    fetchLocalSuppliersByPrincipal,
    fetchPrincipalSuppliersByItemType,
    formData.item_type,
    formData.local_supplier,
    formData.principal_supplier,
    formData.select_form_type,
    selectedIndentType,
  ]);

  useEffect(() => {
    hydrateRateContractP3DisplayOptions();
  }, [hydrateRateContractP3DisplayOptions]);

  // Directly pin the principal_supplier display label whenever the value is
  // known. Runs independently of the broader P3 hydration so the label is
  // always resolved even when the hydration fires before formData is loaded.
  const principalSupplierValue = formData.principal_supplier;
  useEffect(() => {
    if (
      selectedIndentType !== "Rate Contract Purchase" ||
      !principalSupplierValue
    )
      return;

    fetchFrappeValue({
      doctype: "Principal Supplier",
      filters: { name: principalSupplierValue },
      fieldname: ["principal_supplier_name"],
    })
      .then((res) => {
        const name = res?.message?.principal_supplier_name;
        if (name) {
          setLinkOptions((prev) => ({
            ...prev,
            principal_supplier: mergeLinkOptionLists(prev.principal_supplier, [
              { value: String(principalSupplierValue), label: name },
            ]),
          }));
        }
      })
      .catch(() => { });
  }, [selectedIndentType, principalSupplierValue, fetchFrappeValue]);

  const hydrateRateContractP4VendorList = useCallback(async () => {
    if (selectedIndentType !== "Rate Contract Purchase") return;

    const selectedFormType = String(formData.select_form_type || "");
    if (!selectedFormType.toLowerCase().includes("p4")) return;

    const p4ItemType = formData.p4_item_type;
    if (!p4ItemType) return;

    try {
      const vendorListRes = await fetchVendorsByP4ItemType({
        p4_item_type: p4ItemType,
      });
      if (vendorListRes?.message) {
        setLinkOptions((prev) => ({
          ...prev,
          select_vendor: normalizeLinkOptionList(vendorListRes.message),
        }));
      }
    } catch (error) {
      console.error("Failed to hydrate Rate Contract P4 vendor list:", error);
    }
  }, [
    fetchVendorsByP4ItemType,
    formData.p4_item_type,
    formData.select_form_type,
    selectedIndentType,
  ]);

  useEffect(() => {
    hydrateRateContractP4VendorList();
  }, [hydrateRateContractP4VendorList]);

  const hydrateRateContractP4VendorDetails = useCallback(async () => {
    if (selectedIndentType !== "Rate Contract Purchase") return;

    const selectedFormType = String(formData.select_form_type || "");
    if (!selectedFormType.toLowerCase().includes("p4")) return;

    const selectedVendor = formData.select_vendor;
    if (!selectedVendor || formData.vendor_address) return;

    try {
      const vendorDetailRes = await fetchVendorDetails({ vendor: selectedVendor });
      if (vendorDetailRes?.message) {
        setFormData((prev) =>
          applyComputations({
            ...prev,
            vendor_address: vendorDetailRes.message.vendor_address || prev.vendor_address || "",
            vendor_email: vendorDetailRes.message.vendor_email || prev.vendor_email || "",
          }),
        );
      }
    } catch (error) {
      console.error("Failed to hydrate Rate Contract P4 vendor details:", error);
    }
  }, [
    applyComputations,
    fetchVendorDetails,
    formData.select_form_type,
    formData.select_vendor,
    formData.vendor_address,
    selectedIndentType,
  ]);

  useEffect(() => {
    hydrateRateContractP4VendorDetails();
  }, [hydrateRateContractP4VendorDetails]);

  // Handle initial indent type fetch map
  useEffect(() => {
    let mounted = true;
    if (selectedIndentType) {
      fetchSubFormConfiguration(selectedIndentType)
        .then(() => {
          if (!mounted) return;
        })
        .catch((err) => {
          console.error("Subform fetch failed", err);
        });
    }
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndentType]);

  const fetchWorkflowActions = useCallback(
    async (docName: string) => {
      try {
        const response = await getActionsCall({ docname: docName });
        if (response && response.message) {
          setAvailableActions(response.message);
        }
      } catch (error) {
        console.error("Failed to fetch workflow actions:", error);
        setAvailableActions([]);
      }
    },
    [getActionsCall],
  );

  // Initial load
  useEffect(() => {
    fetchFormConfiguration();
  }, [fetchFormConfiguration]);

  // Fetch actions if document exists
  useEffect(() => {
    const docNameToUse = editDocName || savedDocName;
    if (docNameToUse) {
      fetchWorkflowActions(docNameToUse);
    }
  }, [editDocName, savedDocName, fetchWorkflowActions]);

  // --- FORM HANDLERS ---
  const handleFieldChange = useCallback(
    (fieldname: string, value: any) => {
      setFormData((prev) => {
        const next =
          fieldname === "icss_indent_type"
            ? { ...prev, icss_indent_type: value, indent_type: value }
            : { ...prev, [fieldname]: value };
        return applyIcssPurchaseCalculations(applyComputations(next));
      });

      // Track indent type changes
      if (fieldname === "icss_indent_type") {
        setSelectedIndentType(value || "");
      }
    },
    [applyComputations, applyIcssPurchaseCalculations],
  );

  const handleFieldChangeWithSideEffects = useCallback(
    async (fieldname: string, value: any) => {
      handleFieldChange(fieldname, value);

      // --- ICSS user fields ---
      if (
        fieldname === "icss_applicant_webmail_id" ||
        fieldname === "applicant_webmail_id" ||
        fieldname === "icss_applying_for_mail" ||
        fieldname === "applying_for_mail" ||
        fieldname === "webmail_id"
      ) {
        if (value && !["Administrator", "Guest"].includes(value)) {
          try {
            const res = await getICSSUserDetails({ user_email: value });
            if (res && res.message) {
              setFormData((prev) => {
                const next = { ...prev };
                const userName =
                  res.message.applicant_name || res.message.full_name;
                const userDepartment =
                  res.message.department || res.message.department_name;
                const userDesignation =
                  res.message.designation || res.message.designation_name;

                if (
                  fieldname === "icss_applying_for_mail" ||
                  fieldname === "applying_for_mail"
                ) {
                  next.icss_applying_for_mail = value;
                  next.applying_for_mail = value;
                  next.icss_applying_for_name = value;
                  next.applying_for_name = userName || prev.applying_for_name;
                  next.icss_applying_for_department_centre_section =
                    userDepartment ||
                    prev.icss_applying_for_department_centre_section;
                  next.applying_for_department =
                    userDepartment || prev.applying_for_department;
                  next.icss_applying_for_designation =
                    userDesignation || prev.icss_applying_for_designation;
                  next.applying_for_designation =
                    userDesignation || prev.applying_for_designation;
                } else {
                  next.icss_applicant_webmail_id = value;
                  next.webmail_id = value;
                  next.icss_applicant_name = userName || value;
                  next.applicant_name = userName || prev.applicant_name;
                  next.icss_applicant_department__centre__section =
                    userDepartment ||
                    prev.icss_applicant_department__centre__section;
                  next.department = userDepartment || prev.department;
                  next.icss_applicant_designation =
                    userDesignation || prev.icss_applicant_designation;
                  next.designation = userDesignation || prev.designation;
                }

                return applyComputations(next);
              });
            }
          } catch (e) {
            console.error("Failed to fetch user details", e);
          }
        }
        return;
      }

      // --- Rate Contract cascading fields ---
      try {
        switch (fieldname) {
          case "email_id":
            if (value && !["Administrator", "Guest"].includes(value)) {
              const res = await getICSSUserDetails({ user_email: value });
              if (res?.message) {
                const userDepartment =
                  res.message.department || res.message.department_name;
                const userDesignation =
                  res.message.designation || res.message.designation_name;
                setFormData((prev) =>
                  applyComputations({
                    ...prev,
                    [fieldname]: value,
                    indentor: value,
                    applicant_designation:
                      userDesignation || prev.applicant_designation,
                    applicant_department:
                      userDepartment || prev.applicant_department,
                  }),
                );
              }
            }
            break;

          case "item_type":
            if (value) {
              const res = await fetchPrincipalSuppliersByItemType({
                item_type: value,
              });
              if (res?.message)
                setLinkOptions((prev) => ({
                  ...prev,
                  principal_supplier: res.message,
                }));
            }
            setFormData((prev) =>
              applyComputations({
                ...prev,
                [fieldname]: value,
                principal_supplier: "",
                principal_address: "",
                agreement_no: "",
                local_supplier: "",
                local_address: "",
                local_email: "",
              }),
            );
            break;

          case "principal_supplier":
            if (value) {
              const [details, locals] = await Promise.all([
                fetchPrincipalSupplierDetails({ principal_supplier: value }),
                fetchLocalSuppliersByPrincipal({ principal_supplier: value }),
              ]);

              // Set principal fields immediately so they always populate even if
              // the local supplier fetch below fails.
              setFormData((prev) =>
                applyComputations({
                  ...prev,
                  [fieldname]: value,
                  principal_address: details?.message?.principal_address || "",
                  agreement_no: details?.message?.agreement_no || "",
                  local_supplier: "",
                  local_address: "",
                  local_email: "",
                }),
              );

              const localList = normalizeLinkOptionList(locals?.message || []);
              // Always replace local_supplier options — clears stale options from
              // a previously selected principal that had local suppliers.
              setLinkOptions((prev) => ({ ...prev, local_supplier: localList }));

              // Auto-select first local supplier. Done in a separate try so any
              // failure here doesn't wipe out the principal fields set above.
              const firstLocalId = localList[0]?.value || "";
              if (firstLocalId) {
                try {
                  const localRes = await fetchLocalSupplierDetails({
                    local_supplier: firstLocalId,
                  });
                  const localDoc = localRes?.message || {};
                  // local_supplier is a Data field — store the human-readable name.
                  // getLocalSuppliersByPrincipal returns label = local_supplier_name.
                  const localSupplierName =
                    localList[0]?.label && localList[0].label !== firstLocalId
                      ? localList[0].label
                      : localDoc.local_supplier_name || firstLocalId;
                  setFormData((prev) =>
                    applyComputations({
                      ...prev,
                      local_supplier: localSupplierName,
                      local_address: localDoc.local_address || "",
                      local_email: localDoc.local_email || "",
                    }),
                  );
                } catch (localErr) {
                  console.error("Failed to auto-fetch local supplier details:", localErr);
                }
              }
            } else {
              setFormData((prev) =>
                applyComputations({
                  ...prev,
                  [fieldname]: "",
                  principal_address: "",
                  agreement_no: "",
                  local_supplier: "",
                  local_address: "",
                  local_email: "",
                }),
              );
            }
            break;

          case "local_supplier":
            if (value) {
              // value is the Frappe doc ID; resolve the human-readable name
              // from linkOptions so the Data field stores the proper name.
              const localOpt = (linkOptions.local_supplier || []).find(
                (o) => o.value === value,
              );
              const localName = localOpt?.label && localOpt.label !== value
                ? localOpt.label
                : value;

              // Set name immediately so the field isn't blank while fetching.
              setFormData((prev) =>
                applyComputations({ ...prev, [fieldname]: localName }),
              );
              try {
                const res = await fetchLocalSupplierDetails({
                  local_supplier: value,
                });
                const details = res?.message || {};
                setFormData((prev) =>
                  applyComputations({
                    ...prev,
                    [fieldname]: localName,
                    local_address: details.local_address || "",
                    local_email: details.local_email || "",
                  }),
                );
              } catch {
                // name already set above; address/email stay blank
              }
            } else {
              setFormData((prev) =>
                applyComputations({
                  ...prev,
                  [fieldname]: "",
                  local_address: "",
                  local_email: "",
                }),
              );
            }
            break;

          case "p4_item_type":
            if (value) {
              const res = await fetchVendorsByP4ItemType({
                p4_item_type: value,
              });
              if (res?.message)
                setLinkOptions((prev) => ({
                  ...prev,
                  select_vendor: res.message,
                }));
            }
            setFormData((prev) =>
              applyComputations({
                ...prev,
                [fieldname]: value,
                select_vendor: "",
                vendor_address: "",
                vendor_email: "",
              }),
            );
            break;

          case "select_vendor":
            if (value) {
              const res = await fetchVendorDetails({ vendor: value });
              if (res?.message) {
                setFormData((prev) =>
                  applyComputations({
                    ...prev,
                    [fieldname]: value,
                    vendor_address: res.message.vendor_address || "",
                    vendor_email: res.message.vendor_email || "",
                  }),
                );
              }
            } else {
              setFormData((prev) =>
                applyComputations({
                  ...prev,
                  [fieldname]: "",
                  vendor_address: "",
                  vendor_email: "",
                }),
              );
            }
            break;

          case "select_form_type":
            if (value?.includes("P3")) {
              setFormData((prev) =>
                applyComputations({
                  ...prev,
                  [fieldname]: value,
                  p4_item_type: "",
                  select_vendor: "",
                  vendor_address: "",
                  vendor_email: "",
                  justification: "",
                }),
              );
            } else if (value?.includes("P4")) {
              setFormData((prev) =>
                applyComputations({
                  ...prev,
                  [fieldname]: value,
                  item_type: "",
                  principal_supplier: "",
                  principal_address: "",
                  agreement_no: "",
                  local_supplier: "",
                  local_address: "",
                  local_email: "",
                  certify_authorized_firm: 0,
                  certify_current_prices: 0,
                  certify_delivery_time: 0,
                }),
              );
            }
            break;

          default:
            break;
        }
      } catch (e) {
        console.error(`Rate Contract side effect error for ${fieldname}:`, e);
      }
    },
    [
      handleFieldChange,
      getICSSUserDetails,
      applyComputations,
      fetchPrincipalSuppliersByItemType,
      fetchPrincipalSupplierDetails,
      fetchLocalSuppliersByPrincipal,
      fetchLocalSupplierDetails,
      fetchVendorDetails,
      fetchVendorsByP4ItemType,
      fetchFrappeValue,
      linkOptions,
    ],
  );

  const handleFileChange = useCallback(
    (fieldname: string, file: File | null) => {
      setFormData((prev) => ({ ...prev, [fieldname]: file }));
    },
    [],
  );

  const handleTableRowChange = useCallback(
    (tableName: string, rowIndex: number, fieldname: string, value: any) => {
      setFormData((prev) => {
        const tableData = [...(prev[tableName] || [])];
        if (tableData[rowIndex]) {
          tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: value };
        }

        if (
          [
            "icss_qty",
            "icss_rate",
            "icss_discount_percent",
            "icss_gst_percent",
          ].includes(fieldname)
        ) {
          const row = tableData[rowIndex];
          const base = toNumber(row.icss_qty) * toNumber(row.icss_rate);
          const afterDiscount =
            base - (base * toNumber(row.icss_discount_percent)) / 100;
          tableData[rowIndex].icss_amount = roundCurrency(
            afterDiscount +
            (afterDiscount * toNumber(row.icss_gst_percent)) / 100,
          );
        }

        // Rate Contract row calculations
        if (
          [
            "unit_rate",
            "quantity",
            "discount_percentage",
            "gst_percentage",
          ].includes(fieldname)
        ) {
          const row = tableData[rowIndex];
          const unitRate = toNumber(row.unit_rate);
          const quantity = toNumber(row.quantity) || 1;
          const discount = toNumber(row.discount_percentage);
          const gst = toNumber(row.gst_percentage);
          const base = unitRate * quantity;
          const afterDiscount = base - base * (discount / 100);
          tableData[rowIndex].amount = roundCurrency(
            afterDiscount + afterDiscount * (gst / 100),
          );
        }

        let next = { ...prev, [tableName]: tableData };

        // Recalculate Rate Contract totals
        if (
          tableName === "rate_contract_items" ||
          tableData[0]?.amount !== undefined
        ) {
          const rcTotal = roundCurrency(
            tableData.reduce(
              (sum: number, r: any) => sum + (toNumber(r.amount) || 0),
              0,
            ),
          );
          const packing = toNumber(prev.rate_contract_packing);
          const grandTotal = Math.round(rcTotal + packing);
          next = {
            ...next,
            rate_contract_total: rcTotal,
            rate_contract_grand_total: grandTotal,
            amount_in_words: convertAmountToWords(grandTotal),
          };
        }

        return applyIcssPurchaseCalculations(applyComputations(next));
      });
    },
    [applyComputations, applyIcssPurchaseCalculations, convertAmountToWords],
  );

  const handleTableFileChange = useCallback(
    (
      tableName: string,
      rowIndex: number,
      fieldname: string,
      file: File | null,
    ) => {
      setFormData((prev) => {
        const tableData = [...(prev[tableName] || [])];
        if (tableData[rowIndex]) {
          tableData[rowIndex] = { ...tableData[rowIndex], [fieldname]: file };
        }
        return { ...prev, [tableName]: tableData };
      });
    },
    [],
  );

  const handleAddTableRow = useCallback(
    (tableName: string, newRow: Record<string, any>) => {
      setFormData((prev) => ({
        ...applyIcssPurchaseCalculations({
          ...prev,
          [tableName]: [...(prev[tableName] || []), newRow],
        }),
      }));
    },
    [applyIcssPurchaseCalculations],
  );

  const handleDeleteTableRow = useCallback(
    (tableName: string, rowIndex: number) => {
      setFormData((prev) =>
        applyIcssPurchaseCalculations({
          ...prev,
          [tableName]: (prev[tableName] || []).filter(
            (_: any, idx: number) => idx !== rowIndex,
          ),
        }),
      );
    },
    [applyIcssPurchaseCalculations],
  );

  // Recalculate Rate Contract grand total when packing charges change
  useEffect(() => {
    if (selectedIndentType !== "Rate Contract Purchase") return;
    const total = parseFloat(formData.rate_contract_total || 0);
    const packing = parseFloat(formData.rate_contract_packing || 0);
    const grandTotal = Math.round(total + packing);
    if (formData.rate_contract_grand_total !== grandTotal) {
      setFormData((prev) => ({
        ...prev,
        rate_contract_grand_total: grandTotal,
        amount_in_words: convertAmountToWords(grandTotal),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.rate_contract_packing,
    formData.rate_contract_total,
    selectedIndentType,
  ]);

  // --- PRE-SAVE VALIDATIONS (LEGACY) ---
  const runLegacyValidations = (data: any) => {
    // 1. Limited Tender limits
    const theTenderType = data.tender_type || data.type_of_tender || "";
    if (theTenderType.toString().toLowerCase() === "limited") {
      const estimate = data.total_estimate || data.grand_total || 0;
      if (estimate > 2500000) {
        alert(
          "Validation Failed: Estimate for Limited Tender cannot be greater than 25 Lakhs.",
        );
        return false;
      }
    }
    // 2. Direct Purchase limits
    const itemType = data.item_type || data.icss_indent_type || "";
    if (
      itemType.toString().toLowerCase().includes("direct") &&
      itemType.toString().toLowerCase().includes("purchase")
    ) {
      const total =
        data.grand_total ||
        data.direct_pur_grand_total ||
        data.total_estimate ||
        0;
      if (total > 250000) {
        // Not returning false here as old logic commented it out, just an alert warning
        // alert("Warning: Direct Purchase Indent amount typically should not exceed 2.5 Lakhs.");
      }
    }
    // 3. Unique Purchase Committee Members
    if (data.purchase_committee && Array.isArray(data.purchase_committee)) {
      const emails = data.purchase_committee
        .map((row: any) =>
          (row.webmail_id || row.webmail_id_pur_comm || "")
            .trim()
            .toLowerCase(),
        )
        .filter(Boolean);
      const uniqueEmails = new Set(emails);
      if (uniqueEmails.size < emails.length) {
        alert(
          "Validation Failed: Repeated person(s) found in the purchase committee table. Members must be unique.",
        );
        return false;
      }
    }
    return true;
  };

  // --- ACTIONS ---
  const handleSave = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      if (!runLegacyValidations(formData)) return;

      setIsSubmitting(true);
      try {
        const { response, docname } = await persistIcssData();

        if (response && response.message?.status === "success") {
          const newDocName = docname;
          alert("Indent Cum Sanction Sheet saved as draft successfully!");

          if (newDocName && !savedDocName && !editDocName) {
            setSavedDocName(newDocName);
            navigate(`/indent-cum-sanction-sheet/${newDocName}`, {
              replace: true,
            });
          }

          if (newDocName) {
            fetchWorkflowActions(newDocName);
          }
          await fetchFormConfiguration(
            newDocName || editDocName || savedDocName || undefined,
          );
        } else {
          setErrorModal({
            open: true,
            title: "Save Failed",
            message: parseFrappeError(response?.message),
          });
        }
      } catch (error: any) {
        console.error("Save error:", error);
        setErrorModal({
          open: true,
          title: "Save Failed",
          message: parseFrappeError(error),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      editDocName,
      fetchFormConfiguration,
      fetchWorkflowActions,
      formData,
      navigate,
      persistIcssData,
      savedDocName,
    ],
  );

  const handleWorkflowAction = async (action: string, comment?: string) => {
    const docNameToUse = savedDocName || editDocName;
    if (!runLegacyValidations(formData)) return;

    setIsActionLoading(true);
    try {
      let effectiveDocName = docNameToUse;

      // For new documents (no existing name), save first to create the doc before the action
      // For existing documents, skip the pre-save to avoid the backend creating a duplicate
      if (!docNameToUse) {
        const persisted = await persistIcssData();
        if (
          !persisted?.response?.message ||
          persisted.response.message.status !== "success"
        ) {
          setErrorModal({
            open: true,
            title: "Save Failed",
            message: parseFrappeError(persisted?.response?.message),
          });
          return;
        }
        effectiveDocName = persisted.docname || effectiveDocName;
        if (effectiveDocName) {
          setSavedDocName(effectiveDocName);
        }
      }

      if (!effectiveDocName) {
        alert("Please save the document first.");
        return;
      }

      const isPiForward =
        isIcssPiStep &&
        (action.toLowerCase().includes("forward") || action.toLowerCase().includes("approve"));
      if (isPiForward && (!icssSelectedProject || !icssSelectedHead)) {
        alert("Please select a project and account head before approving.");
        return;
      }

      const actionPayload: Record<string, any> = {
        docname: effectiveDocName,
        action: action,
      };
      if (isPiForward) {
        actionPayload.extra_data = JSON.stringify({
          project_name: icssSelectedProject,
          account_head: icssSelectedHead,
        });
      }
      const response = await performActionCall(actionPayload);

      if (
        response &&
        response.message &&
        response.message.status === "success"
      ) {
        const nextWorkflowState = response.message.workflow_state;
        if (comment?.trim()) {
          try {
            await addComment({
              doctype: "Indent Cum Sanction Sheet",
              docname: effectiveDocName,
              content: comment.trim(),
            });
          } catch {
            // comment failure is non-fatal
          }
        }
        alert(getIcssWorkflowSuccessMessage(action, nextWorkflowState));
        setWorkflowState(nextWorkflowState);
        setIsEditMode(false);
        await fetchFormConfiguration(effectiveDocName);
        fetchWorkflowActions(effectiveDocName);
      } else {
        setErrorModal({
          open: true,
          title: "Action Failed",
          message: parseFrappeError(response?.message),
        });
      }
    } catch (error: any) {
      console.error(`Workflow Action ${action} Error:`, error);
      setErrorModal({
        open: true,
        title: "Action Failed",
        message: parseFrappeError(error),
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleViewProject = async () => {
    const projectRef = formData.project_ref || projectRefParam;
    const projectNo =
      formData.project_no ||
      formData.project_code ||
      projectNoParam ||
      projectParam;

    if (projectRef) {
      setPrPreviewName(projectRef);
      return;
    }

    if (!projectNo) {
      alert("Project reference is not available for this ICSS.");
      return;
    }

    setIsProjectViewLoading(true);
    try {
      const params = new URLSearchParams({
        filters: JSON.stringify([["project_no", "=", projectNo]]),
        fields: JSON.stringify(["name"]),
        limit: "1",
      });
      const res = await fetch(
        `/api/resource/Project%20Registration?${params}`,
        {
          credentials: "include",
        },
      ).then((response) => response.json());
      const prName = (res?.data ?? res?.message ?? [])[0]?.name;

      if (prName) {
        setPrPreviewName(prName);
      } else {
        alert("Could not find the linked project for this ICSS.");
      }
    } catch (error) {
      console.error("Failed to open ICSS project", error);
      alert("Failed to open the linked project.");
    } finally {
      setIsProjectViewLoading(false);
    }
  };

  const handlePayment = async () => {
    if (
      !displayCommitment?.head ||
      !paymentAmount ||
      !currentDocName ||
      !projectCode
    ) {
      alert("Please ensure a commitment exists and enter a payment amount.");
      return;
    }

    try {
      await submitPayment({
        doctype: "Indent Cum Sanction Sheet",
        name: currentDocName,
        project_name: projectCode,
        payment_amount: parseFloat(paymentAmount),
        budget_head: displayCommitment.head,
        bmr: "",
      });
      alert("Payment recorded successfully!");
      setPaymentAmount("");
      window.location.reload();
    } catch (error: any) {
      console.error("ICSS payment failed:", error);
      setErrorModal({
        open: true,
        title: "Payment Failed",
        message: parseFrappeError(error),
      });
    }
  };

  const getLinkOptionLabel = useCallback(
    (fieldname: string, value: any) => {
      if (!value) return "";
      const stringValue = String(value);
      const matchedOption =
        (linkOptions[fieldname] || []).find(
          (option) => option.value === stringValue,
        ) ||
        Object.values(linkOptions)
          .flat()
          .find((option) => option.value === stringValue);

      return matchedOption?.label || stringValue;
    },
    [linkOptions],
  );

  const getBudgetHeadDisplayName = useCallback(
    (value: any) => {
      if (!value && value !== 0) return "";
      const stringValue = String(value);
      const normalizedValue = stringValue.trim().toLowerCase();
      const matchedHead = budgetHeadList.find(
        (head) =>
          head.docname.trim().toLowerCase() === normalizedValue ||
          head.id.trim().toLowerCase() === normalizedValue ||
          head.name.trim().toLowerCase() === normalizedValue,
      );

      return matchedHead?.name || stringValue;
    },
    [budgetHeadList],
  );

  const buildIcssPoSeed = useCallback(
    (data: Record<string, any>) => {
      const indentType =
        data.icss_indent_type || data.indent_type || selectedIndentType || "";
      const isRateContractPo = String(indentType)
        .toLowerCase()
        .includes("rate contract");
      const isStandardizedPo = isStandardizedIndentType(indentType);
      const isAmcPo = isAnnualMaintenanceContractIndent(indentType);
      const applicantDepartment =
        data.icss_applicant_department__centre__section ||
        data.department ||
        "";
      const accountHead =
        data.icss_account_head ||
        data.account_head ||
        data.icss_other_account_head ||
        "";
      const displayData = {
        ...data,
        icss_applicant_department__centre__section: getLinkOptionLabel(
          "icss_applicant_department__centre__section",
          applicantDepartment,
        ),
        department: getLinkOptionLabel("department", applicantDepartment),
        icss_account_head: getBudgetHeadDisplayName(accountHead),
        account_head: getBudgetHeadDisplayName(accountHead),
        principal_supplier: getLinkOptionLabel(
          "principal_supplier",
          data.principal_supplier,
        ),
        local_supplier: getLinkOptionLabel(
          "local_supplier",
          data.local_supplier,
        ),
        select_vendor: getLinkOptionLabel("select_vendor", data.select_vendor),
      };
      const vendorDetails = getIcssVendorDetails(displayData, indentType);
      const savedDraft = extractSavedIcssPoDraft(data) || {};
      const loggedInStaffEmail =
        currentUser && !["Administrator", "Guest"].includes(currentUser)
          ? currentUser
          : "";
      const totalAmount = getIcssApprovalAmount(data);
      const variantCopy = getPoVariantCopy(indentType);
      const prefillSections = buildIcssPoPrefillSections(
        displayData,
        indentType,
        totalAmount,
      );
      const chargeSummary = buildIcssPoChargeSummary(data, indentType);

      return {
        ...savedDraft,
        po_number: savedDraft.po_number || "",
        po_date: savedDraft.po_date || "",
        project_no: data.project_no || data.project_code || "",
        ss_applicant_name:
          data.icss_applicant_name || data.applicant_name || "",
        ss_department_for_purchase:
          displayData.icss_applicant_department__centre__section ||
          displayData.department ||
          applicantDepartment,
        ss_account_head:
          displayData.icss_account_head ||
          displayData.account_head ||
          accountHead,
        ss_account_head_label: getBudgetHeadDisplayName(accountHead),
        ss_funding_agency: data.funding_agency || data.project_title || "",
        ss_name_of_firms:
          savedDraft.ss_name_of_firms || vendorDetails.vendorAddress || "",
        ss_file_number: data.name || currentDocName || savedDraft.ss_file_number || data.file_number || "",
        ss_grand_total: totalAmount || "",
        vendor_address:
          data.vendor_address ||
          savedDraft.vendor_address ||
          vendorDetails.vendorAddress ||
          "",
        vendor_email:
          data.vendor_email ||
          savedDraft.vendor_email ||
          vendorDetails.vendorEmail ||
          "",
        quotation_no: savedDraft.quotation_no || "",
        signee_name: savedDraft.signee_name || rndAdminSignatory.name || checkedByUser.name || hosRndSignatory?.name || "",
        signee_designation:
          savedDraft.signee_designation || rndAdminSignatory.designation || checkedByUser.designation || hosRndSignatory?.designation || "",
        amount_in_words:
          savedDraft.amount_in_words ||
          convertAmountToWords(totalAmount) ||
          data.amount_in_words ||
          data.icss_amount_in_words,
        terms_and_conditions:
          getDefaultTermsForIndentType(indentType) ||
          savedDraft.terms_and_conditions ||
          data.po_terms_and_conditions ||
          data.additional_terms_and_conditions_if_any ||
          data.terms_and_conditions,
        po_intro_paragraph:
          savedDraft.po_intro_paragraph || variantCopy.introParagraph,
        po_header_note: savedDraft.po_header_note || variantCopy.headerNote,
        po_staff_email:
          savedDraft.po_staff_email ||
          data.po_staff_email ||
          loggedInStaffEmail,
        letterhead_user_email:
          savedDraft.letterhead_user_email ||
          data.letterhead_user_email ||
          savedDraft.po_staff_email ||
          data.po_staff_email ||
          loggedInStaffEmail,
        checked_by_name:
          savedDraft.checked_by_name ||
          data.checked_by_name ||
          checkedByUser.name ||
          loggedInStaffEmail,
        checked_by_designation:
          savedDraft.checked_by_designation ||
          data.checked_by_designation ||
          checkedByUser.designation ||
          "",
        po_prefill_sections:
          !isRateContractPo &&
            Array.isArray(savedDraft.po_prefill_sections) &&
            savedDraft.po_prefill_sections.length > 0
            ? savedDraft.po_prefill_sections
            : prefillSections,
        po_charge_summary:
          !isStandardizedPo &&
            Array.isArray(savedDraft.po_charge_summary) &&
            savedDraft.po_charge_summary.length > 0
            ? savedDraft.po_charge_summary
            : chargeSummary,
        po_payment_mode:
          savedDraft.po_payment_mode || vendorDetails.payment || "",
        additional_terms_and_conditions_if_any:
          data.additional_terms_and_conditions_if_any || "",
        ss_payment: savedDraft.ss_payment || vendorDetails.payment || "",
        ss_delivery: savedDraft.ss_delivery || vendorDetails.delivery || "",
        ss_warranty: savedDraft.ss_warranty || vendorDetails.warranty || "",
        select_form_type: data.select_form_type || "",
        item_type: data.item_type || "",
        principal_supplier: displayData.principal_supplier || "",
        principal_address: data.principal_address || "",
        agreement_no: data.agreement_no || "",
        local_supplier: displayData.local_supplier || "",
        local_address: data.local_address || "",
        local_email: data.local_email || "",
        p4_item_type: data.p4_item_type || "",
        select_vendor: displayData.select_vendor || "",
        indent_type: indentType,
        amc_po_table:
          isAmcPo && Array.isArray(savedDraft.amc_po_table)
            ? savedDraft.amc_po_table
            : [],
        table_bttk:
          Array.isArray(savedDraft.table_bttk) &&
            savedDraft.table_bttk.length > 0
            ? savedDraft.table_bttk
            : mapIcssItemsToPoRows(data),
        po_source_indent_type: indentType,
      };
    },
    [
      checkedByUser,
      convertAmountToWords,
      currentUser,
      getBudgetHeadDisplayName,
      getLinkOptionLabel,
      hosRndSignatory,
      rndAdminSignatory,
      selectedIndentType,
    ],
  );

  const fetchSavedIcssPoDraft = useCallback(async () => {
    if (!currentDocName) return null;

    setIsFetchingSavedPoDraft(true);
    setSavedPoDraftLoadError("");
    try {
      const filters = encodeURIComponent(
        JSON.stringify([["icss_number", "=", currentDocName]]),
      );
      const fields = encodeURIComponent(JSON.stringify(["name"]));
      const listResponse = await fetch(
        `/api/resource/ICSS_PO?filters=${filters}&fields=${fields}&order_by=modified%20desc&limit_page_length=1`,
        { credentials: "include" },
      );

      if (!listResponse.ok) {
        setSavedPoDraftLoadError(
          `Failed to load saved PO draft: ${listResponse.status} ${listResponse.statusText}`,
        );
        console.error(
          `Failed to fetch ICSS_PO list: ${listResponse.status} ${listResponse.statusText}`,
        );
        return null;
      }

      const listJson = await listResponse.json();
      const poDocName = listJson?.data?.[0]?.name;
      if (!poDocName) return null;
      setSavedIcssPoDocName(poDocName);

      const detailResponse = await fetch(
        `/api/resource/ICSS_PO/${encodeURIComponent(poDocName)}`,
        { credentials: "include" },
      );

      if (!detailResponse.ok) {
        setSavedPoDraftLoadError(
          `Failed to load saved PO draft details: ${detailResponse.status} ${detailResponse.statusText}`,
        );
        console.error(
          `Failed to fetch ICSS_PO detail: ${detailResponse.status} ${detailResponse.statusText}`,
        );
        return null;
      }

      const detailJson = await detailResponse.json();
      const poDoc = detailJson?.data || {};
      setSavedIcssPoFormHtml(poDoc.icss_po_form || "");
      const snapshot = extractIcssPoDraftSnapshot(poDoc.icss_po_form);

      return {
        ...(snapshot || {}),
        po_number: snapshot?.po_number ?? poDoc.po_number ?? "",
        po_date: snapshot?.po_date ?? poDoc.po_date ?? "",
        indent_type: snapshot?.indent_type ?? poDoc.indent_type ?? "",
        po_source_indent_type:
          snapshot?.po_source_indent_type ??
          poDoc.indent_type ??
          snapshot?.indent_type ??
          "",
        amc_po_table:
          snapshot?.amc_po_table ??
          (Array.isArray(poDoc.amc_po_table) ? poDoc.amc_po_table : []),
        add_of_gst_: snapshot?.add_of_gst_ ?? poDoc.add_of_gst_ ?? "",
        gst_amount: snapshot?.gst_amount ?? poDoc.gst_amount ?? "",
        grand_total: snapshot?.grand_total ?? poDoc.grand_total ?? "",
        ss_grand_total:
          snapshot?.ss_grand_total ??
          snapshot?.grand_total ??
          poDoc.grand_total ??
          "",
        _icss_po_name: poDocName,
      };
    } catch (error) {
      console.error("Failed to fetch saved ICSS PO draft:", error);
      setSavedPoDraftLoadError("Failed to load saved PO draft details.");
      return null;
    } finally {
      setIsFetchingSavedPoDraft(false);
    }
  }, [currentDocName]);

  const fetchSignedPoAttachment = useCallback(async () => {
    if (!currentDocName) return;

    try {
      const filters = encodeURIComponent(
        JSON.stringify([
          ["attached_to_doctype", "=", "Indent Cum Sanction Sheet"],
          ["attached_to_name", "=", currentDocName],
        ]),
      );
      const fields = encodeURIComponent(
        JSON.stringify(["name", "file_url", "file_name", "creation"]),
      );
      const response = await fetch(
        `/api/resource/File?filters=${filters}&fields=${fields}&order_by=creation%20desc&limit_page_length=10`,
        { credentials: "include" },
      );
      if (!response.ok) return;

      const json = await response.json();
      const files = Array.isArray(json?.data) ? json.data : [];
      const signedPoFile =
        files.find((file: any) =>
          String(file.file_name || "")
            .toLowerCase()
            .includes("signed"),
        ) || files[0];

      if (signedPoFile?.file_url) {
        setSignedPoFileUrl(signedPoFile.file_url);
      } else {
        setSignedPoFileUrl("");
      }
    } catch (error) {
      console.error("Failed to fetch signed PO attachment:", error);
    }
  }, [currentDocName]);

  const handleSignedPoUpload = useCallback(
    async (file: File) => {
      if (!currentDocName) {
        alert("Please save the ICSS document first.");
        return;
      }

      setIsUploadingSignedPo(true);
      try {
        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("doctype", "Indent Cum Sanction Sheet");
        uploadData.append("docname", currentDocName);
        uploadData.append("is_private", "1");
        uploadData.append("folder", "Home/Attachments");

        const uploadResponse = await fetch("/api/method/upload_file", {
          method: "POST",
          body: uploadData,
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        });

        const uploadJson = await uploadResponse.json().catch(() => ({}));
        if (!uploadResponse.ok) {
          const uploadError: any = new Error(
            uploadJson?.exception || "Failed to upload signed PO.",
          );
          uploadError._server_messages = uploadJson?._server_messages;
          throw uploadError;
        }

        const fileUrl = uploadJson?.message?.file_url || "";
        if (fileUrl) setSignedPoFileUrl(fileUrl);

        await fetchFormConfiguration(currentDocName);
        await fetchSignedPoAttachment();
        fetchWorkflowActions(currentDocName);
        setWorkflowState((prev) =>
          prev === "PO Generated" ? "PO Delivered" : prev,
        );
        alert("Signed PO uploaded successfully.");
      } catch (error: any) {
        console.error("Signed PO upload failed:", error);
        setErrorModal({
          open: true,
          title: "Upload Failed",
          message: parseFrappeError(error),
        });
      } finally {
        setIsUploadingSignedPo(false);
      }
    },
    [
      currentDocName,
      fetchFormConfiguration,
      fetchSignedPoAttachment,
      fetchWorkflowActions,
    ],
  );

  const syncPoDraftToFormData = useCallback(
    (poData: Record<string, any>) => {
      const loggedInStaffEmail =
        currentUser && !["Administrator", "Guest"].includes(currentUser)
          ? currentUser
          : "";
      const staffEmail =
        poData.letterhead_user_email ||
        poData.po_staff_email ||
        poData.staff_email ||
        loggedInStaffEmail;
      const nextPoData: Record<string, any> = {
        ...poData,
        po_staff_email: staffEmail,
        letterhead_user_email: staffEmail,
        checked_by_name:
          poData.checked_by_name || checkedByUser.name || staffEmail,
        checked_by_designation:
          poData.checked_by_designation || checkedByUser.designation || "",
      };

      setPoDraftData(nextPoData);
      setFormData((prev) => ({
        ...prev,
        po_number: nextPoData.po_number || "",
        po_date: nextPoData.po_date || "",
        vendor_address: nextPoData.vendor_address || "",
        quotation_no: nextPoData.quotation_no || "",
        signee_name: nextPoData.signee_name || "",
        signee_designation: nextPoData.signee_designation || "",
        amount_in_words: nextPoData.amount_in_words || "",
        terms_and_conditions: nextPoData.terms_and_conditions || "",
        po_intro_paragraph: nextPoData.po_intro_paragraph || "",
        po_header_note: nextPoData.po_header_note || "",
        po_payment_mode: nextPoData.po_payment_mode || "",
        po_staff_email: nextPoData.po_staff_email || "",
        letterhead_user_email: nextPoData.letterhead_user_email || "",
        checked_by_name: nextPoData.checked_by_name || "",
        checked_by_designation: nextPoData.checked_by_designation || "",
        po_data_json: JSON.stringify(nextPoData),
      }));
    },
    [checkedByUser, currentUser],
  );

  const handlePoEditorChange = useCallback(
    (nextPoData: Record<string, any>) => {
      setPoDraftData(nextPoData);
      setIsPoDraftDirty(true);
    },
    [],
  );

  const handleSavePoDraft = useCallback(
    async (poData: Record<string, any>) => {
      if (!currentDocName) {
        throw new Error("Please save the ICSS document first.");
      }

      const indentType =
        poData.indent_type ||
        poData.po_source_indent_type ||
        formData.icss_indent_type ||
        formData.indent_type ||
        selectedIndentType ||
        "";
      const rawAccountHead =
        formData.icss_account_head ||
        formData.account_head ||
        formData.icss_other_account_head ||
        poData.ss_account_head ||
        "";
      let accountHeadLabel = getBudgetHeadDisplayName(rawAccountHead);

      if (rawAccountHead && accountHeadLabel === String(rawAccountHead)) {
        try {
          const numericAccountHead = /^\d+$/.test(
            String(rawAccountHead).trim(),
          );
          const accountHeadRes = await fetchFrappeValue({
            doctype: "Budget Head",
            filters: numericAccountHead
              ? { id: Number(rawAccountHead) }
              : { name: rawAccountHead },
            fieldname: "budget_head",
          });
          accountHeadLabel =
            accountHeadRes?.message?.budget_head || accountHeadLabel;
        } catch (error) {
          console.error("Failed to resolve ICSS PO account head label:", error);
        }
      }

      const poDataForSave: Record<string, any> = {
        ...poData,
        indent_type: indentType,
        po_source_indent_type: poData.po_source_indent_type || indentType,
        ss_account_head_label: accountHeadLabel,
        po_staff_email:
          poData.po_staff_email ||
          poData.letterhead_user_email ||
          (currentUser && !["Administrator", "Guest"].includes(currentUser)
            ? currentUser
            : ""),
        letterhead_user_email:
          poData.letterhead_user_email ||
          poData.po_staff_email ||
          (currentUser && !["Administrator", "Guest"].includes(currentUser)
            ? currentUser
            : ""),
      };
      const isAmcPo = isAnnualMaintenanceContractIndent(indentType);
      const amcPoTotal = isAmcPo ? getAmcPoTotal(poDataForSave) : 0;
      if (isAmcPo && amcPoTotal > 0) {
        const gstAmount = getAmcPoGstAmount(poDataForSave);
        const grandTotal = getAmcPoGrandTotal(poDataForSave);
        poDataForSave.amc_po_total_amount = amcPoTotal;
        poDataForSave.gst_amount = gstAmount;
        poDataForSave.grand_total = grandTotal;
        poDataForSave.ss_grand_total = grandTotal;
        poDataForSave.amount_in_words = convertAmountToWords(grandTotal);
        poDataForSave.po_charge_summary = [
          {
            label: "Grand Total",
            value: grandTotal,
            emphasis: "strong",
          },
        ];
      }

      const icssPoFormHtml = appendIcssPoDraftSnapshot(
        generatePOHtml(poDataForSave),
        poDataForSave,
      );
      const icssPoPayload = {
        project_number:
          poData.project_no ||
          formData.project_no ||
          formData.project_code ||
          projectCode ||
          "",
        icss_number: currentDocName,
        indent_type: indentType,
        po_number: poData.po_number || "",
        po_date: poData.po_date || "",
        icss_po_form: icssPoFormHtml,
        ...(isAmcPo
          ? {
            amc_po_table: Array.isArray(poData.amc_po_table)
              ? poData.amc_po_table
              : [],
            add_of_gst_: poDataForSave.add_of_gst_ || "",
            gst_amount: poDataForSave.gst_amount || 0,
            grand_total: poDataForSave.grand_total || amcPoTotal,
          }
          : {}),
      };

      let icssPoResponse;
      try {
        const insertResponse = await fetch("/api/resource/ICSS_PO", {
          method: "POST",
          credentials: "include",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(icssPoPayload),
        });

        if (insertResponse.ok) {
          const insertJson = await insertResponse.json();
          icssPoResponse = {
            message: {
              status: "success",
              docname: insertJson?.data?.name,
            },
          };
        } else if (insertResponse.status === 403) {
          // Some production roles can save through the whitelisted API
          // but cannot insert ICSS_PO directly. Keep Save working, while
          // backend adds create-new support to the API.
          icssPoResponse = await saveIcssPoDataCall({
            ...icssPoPayload,
            amc_po_table: isAmcPo
              ? JSON.stringify((icssPoPayload as any).amc_po_table || [])
              : undefined,
          });
        } else {
          const errorJson = await insertResponse.json().catch(() => ({}));
          throw new Error(
            getFrappeErrorMessage(
              errorJson,
              `Failed to create ICSS_PO record: ${insertResponse.status} ${insertResponse.statusText}`,
            ),
          );
        }
      } catch (error) {
        throw new Error(
          getFrappeErrorMessage(error, "Failed to save ICSS PO data."),
        );
      }

      if (icssPoResponse?.message?.status === "error") {
        throw new Error(
          icssPoResponse.message.message || "Failed to save ICSS PO data.",
        );
      }

      syncPoDraftToFormData(poDataForSave);
      setSavedIcssPoDocName(icssPoResponse?.message?.docname || "");
      setSavedIcssPoFormHtml(icssPoFormHtml);
      setHasSavedPoDraft(true);
      setIsPoDraftDirty(false);
      return icssPoResponse;
    },
    [
      convertAmountToWords,
      currentDocName,
      currentUser,
      formData.icss_indent_type,
      formData.account_head,
      formData.indent_type,
      formData.icss_account_head,
      formData.icss_other_account_head,
      formData.project_code,
      formData.project_no,
      fetchFrappeValue,
      getBudgetHeadDisplayName,
      projectCode,
      saveIcssPoDataCall,
      selectedIndentType,
      syncPoDraftToFormData,
    ],
  );

  const handleGeneratePo = useCallback(async () => {
    if (!currentDocName) {
      throw new Error("Please save the ICSS document first.");
    }
    if (!poGenerateAction) {
      throw new Error("Generate PO action is not available.");
    }
    if (!poDraftData || !isPoDraftSaved) {
      throw new Error("Please save the PO draft before generating.");
    }
    if (isPoCommittedForGate !== true) {
      throw new Error("Please submit the PO commitment before generating PO.");
    }

    const response = await performActionCall({
      docname: currentDocName,
      action: poGenerateAction,
    });

    if (response?.message?.status !== "success") {
      throw new Error(response?.message?.message || "Failed to generate PO.");
    }

    const publishResponse = await publishStagedCommitCall({
      reference_name: currentDocName,
      reference_doctype: "Indent Cum Sanction Sheet",
    });
    if (publishResponse?.message?.status === "error") {
      throw new Error(
        publishResponse.message.message ||
        "PO generated, but failed to publish the staged PO commitment.",
      );
    }

    alert("PO generated successfully!");
    setShowPoEditor(false);
    setWorkflowState(response.message.workflow_state || "PO Generated");
    await fetchFormConfiguration(currentDocName);
    fetchWorkflowActions(currentDocName);
  }, [
    currentDocName,
    fetchFormConfiguration,
    fetchWorkflowActions,
    isPoCommittedForGate,
    isPoDraftSaved,
    poDraftData,
    performActionCall,
    poGenerateAction,
    publishStagedCommitCall,
  ]);

  const handleDownloadDirectorReviewPdf = useCallback(() => {
    if (!currentDocName) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to download the Director approval PDF.");
      return;
    }

    const applicantDepartment =
      formData.icss_applicant_department__centre__section ||
      formData.department ||
      "";
    const applyingForDepartment =
      formData.icss_applying_for_department_centre_section ||
      formData.applying_for_department ||
      "";
    const accountHead =
      formData.icss_account_head ||
      formData.account_head ||
      formData.icss_other_account_head ||
      "";
    const directorPrintData = {
      ...formData,
      icss_applicant_department__centre__section: getLinkOptionLabel(
        "icss_applicant_department__centre__section",
        applicantDepartment,
      ),
      department: getLinkOptionLabel("department", applicantDepartment),
      icss_applying_for_department_centre_section: getLinkOptionLabel(
        "icss_applying_for_department_centre_section",
        applyingForDepartment,
      ),
      applying_for_department: getLinkOptionLabel(
        "applying_for_department",
        applyingForDepartment,
      ),
      icss_account_head: getBudgetHeadDisplayName(accountHead),
      account_head: getBudgetHeadDisplayName(accountHead),
      principal_supplier: getLinkOptionLabel(
        "principal_supplier",
        formData.principal_supplier,
      ),
      local_supplier: getLinkOptionLabel(
        "local_supplier",
        formData.local_supplier,
      ),
      select_vendor: getLinkOptionLabel(
        "select_vendor",
        formData.select_vendor,
      ),
    };

    const html = buildDirectorApprovalPrintHtml({
      docname: currentDocName,
      formData: directorPrintData,
      parentFields: displayBaseFields,
      childFields: displaySubFormFields,
      currentUser,
      linkOptions: displayLinkOptions,
    });

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    window.setTimeout(() => {
      printWindow.print();
    }, 500);
  }, [
    currentDocName,
    currentUser,
    displayBaseFields,
    displayLinkOptions,
    displaySubFormFields,
    formData,
    getBudgetHeadDisplayName,
    getLinkOptionLabel,
  ]);

  const handleSendToDirectorApproval = useCallback(async () => {
    if (!currentDocName || isUpdatingDirectorFlag) return;

    setIsUpdatingDirectorFlag(true);
    try {
      const response = await updateSendToDirectorCall({
        docname: currentDocName,
        send_to_director: 1,
      });

      if (response?.message?.status === "error") {
        throw new Error(
          response.message.message || "Failed to mark for Director approval.",
        );
      }

      setFormData((prev) => ({ ...prev, send_to_director: 1 }));
      alert(
        "ICSS marked for Director approval. Staff can now upload the Director-signed PDF.",
      );
      await fetchFormConfiguration(currentDocName);
    } catch (error: any) {
      console.error("Failed to send ICSS for Director approval:", error);
      setErrorModal({
        open: true,
        title: "Failed to Send for Director Approval",
        message: parseFrappeError(error),
      });
    } finally {
      setIsUpdatingDirectorFlag(false);
    }
  }, [
    currentDocName,
    fetchFormConfiguration,
    isUpdatingDirectorFlag,
    updateSendToDirectorCall,
  ]);

  useEffect(() => {
    if (
      workflowState === "Pending PO Generation" &&
      currentDocName &&
      !poDraftData
    ) {
      const seed = buildIcssPoSeed(formData);
      const hasSavedDraft = hasSavedIcssPoDraft(formData);
      setPoDraftData(seed);
      setIsPoDraftDirty(false);
      setHasSavedPoDraft(hasSavedDraft);
    }
  }, [buildIcssPoSeed, currentDocName, formData, poDraftData, workflowState]);

  useEffect(() => {
    if (
      !["Pending PO Generation", "PO Generated", "Approved"].includes(
        workflowState || "",
      ) ||
      !currentDocName ||
      isPoDraftDirty
    ) {
      return;
    }

    let cancelled = false;
    fetchSavedIcssPoDraft().then((savedDraft) => {
      if (cancelled || !savedDraft) return;

      setPoDraftData((prev) => ({
        ...(prev || buildIcssPoSeed(formData)),
        ...savedDraft,
      }));
      setHasSavedPoDraft(true);
      setIsPoDraftDirty(false);
    });

    return () => {
      cancelled = true;
    };
  }, [
    buildIcssPoSeed,
    currentDocName,
    fetchSavedIcssPoDraft,
    formData,
    isPoDraftDirty,
    workflowState,
  ]);

  useEffect(() => {
    if (["PO Generated", "Approved"].includes(workflowState || "")) {
      fetchSignedPoAttachment();
    }
  }, [fetchSignedPoAttachment, workflowState]);

  useEffect(() => {
    if (!poDraftData) return;

    const nextSigneeName =
      poDraftData.signee_name || hosRndSignatory?.name || "";
    const nextSigneeDesignation =
      poDraftData.signee_designation || hosRndSignatory?.designation || "";
    const nextCheckedByName =
      poDraftData.checked_by_name ||
      checkedByUser.name ||
      poDraftData.po_staff_email ||
      poDraftData.letterhead_user_email ||
      "";
    const nextCheckedByDesignation =
      poDraftData.checked_by_designation || checkedByUser.designation || "";
    const nextAmountInWords =
      poDraftData.amount_in_words ||
      convertAmountToWords(
        poDraftData.ss_grand_total ||
        formData.pp_grand_total ||
        formData.sp_grand_total ||
        formData.rr_grand_total ||
        formData.amc_grand_total ||
        formData.rate_contract_grand_total ||
        formData.grand_total ||
        0,
      );

    if (
      nextSigneeName === poDraftData.signee_name &&
      nextSigneeDesignation === poDraftData.signee_designation &&
      nextCheckedByName === poDraftData.checked_by_name &&
      nextCheckedByDesignation === poDraftData.checked_by_designation &&
      nextAmountInWords === poDraftData.amount_in_words
    ) {
      return;
    }

    setPoDraftData((prev) =>
      prev
        ? {
          ...prev,
          signee_name: prev.signee_name || hosRndSignatory?.name || "",
          signee_designation:
            prev.signee_designation || hosRndSignatory?.designation || "",
          checked_by_name:
            prev.checked_by_name ||
            checkedByUser.name ||
            prev.po_staff_email ||
            prev.letterhead_user_email ||
            "",
          checked_by_designation:
            prev.checked_by_designation || checkedByUser.designation || "",
          amount_in_words:
            prev.amount_in_words ||
            convertAmountToWords(
              prev.ss_grand_total ||
              formData.pp_grand_total ||
              formData.sp_grand_total ||
              formData.rr_grand_total ||
              formData.amc_grand_total ||
              formData.rate_contract_grand_total ||
              formData.grand_total ||
              0,
            ),
        }
        : prev,
    );
  }, [
    checkedByUser,
    convertAmountToWords,
    formData,
    hosRndSignatory,
    poDraftData,
  ]);

  useEffect(() => {
    if (workflowState === "Pending PO Generation" && isRnDStaff) {
      setShowPoEditor(true);
      setPoGenerationTab("po");
      return;
    }

    setShowPoEditor(false);
    setPoGenerationTab("po");
  }, [isRnDStaff, workflowState]);

  useEffect(() => {
    if (workflowState !== "Pending PO Generation" || !isRnDStaff) {
      setIsPoCommittedForGate(null);
    }
  }, [isRnDStaff, workflowState]);

  useEffect(() => {
    if (!showPoEditor) return;

    const timer = window.setTimeout(() => {
      poEditorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);

    return () => window.clearTimeout(timer);
  }, [showPoEditor]);

  // --- RENDER HELPERS ---
  const isReadOnly =
    docStatus === 1 ||
    (workflowState !== "Draft" && workflowState !== "Pending") ||
    !isEditMode;
  const shouldUsePoGenerationTabs =
    workflowState === "Pending PO Generation" && isRnDStaff;
  const generatePoDisabledReason = !isPoDraftSaved
    ? "Save the PO draft to enable final generation"
    : poCommitRequired
      ? "Submit the PO commitment to enable final generation"
      : "Generate the final purchase order";
  const isAtDeanApproval = workflowState === "Pending Dean Approval";
  const sendToDirector = Boolean(Number(formData.send_to_director || 0));
  const directorSignedPdf = String(formData.director_signed_pdf || "").trim();
  const displayWorkflowState =
    signedPoFileUrl && workflowState === "PO Generated"
      ? "PO Delivered"
      : isAtDeanApproval && sendToDirector
        ? "Pending Director Approval"
        : workflowState;
  const isDirectorApprovalRequired =
    Boolean(Number(formData.director_approval_required || 0)) ||
    sendToDirector ||
    Boolean(directorSignedPdf) ||
    shouldShowDirectorStage(workflowState || "", formData);
  const showDirectorControls =
    isAtDeanApproval &&
    isDirectorApprovalRequired &&
    isDeanRnd &&
    Boolean(currentDocName);
  const directorApproveBlocked =
    isAtDeanApproval && isDirectorApprovalRequired && !directorSignedPdf;
  const handleConfirmAction = async () => {
    if (!pendingAction) return;
    const comment = actionComment;
    setPendingAction(null);
    setActionComment("");
    await handleWorkflowAction(pendingAction, comment);
  };

  const renderActionButtons = () => {
    if (workflowState === "Draft") {
      if (!isEditMode) {
        // For existing saved drafts, allow submitting without entering edit mode
        if (!currentDocName) return null;
        return (
          <button
            onClick={() => setPendingAction("Submit")}
            disabled={isSubmitting || isActionLoading}
            className={cn(
              "inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 shadow-sm",
              "bg-[#D97757] hover:bg-[#c66a4e] text-white border-transparent",
              (isSubmitting || isActionLoading) && "opacity-50 cursor-not-allowed",
            )}
          >
            <Send className="w-4 h-4 mr-2" />
            Submit
          </button>
        );
      }
      return (
        <>
          <FrappeButton
            variant="outline"
            onClick={handleSave}
            disabled={isSubmitting || isActionLoading}
            className="bg-white dark:bg-zinc-800 shadow-sm"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Draft
          </FrappeButton>

          <button
            onClick={() => setPendingAction("Submit")}
            disabled={isSubmitting || isActionLoading}
            className={cn(
              "inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 shadow-sm",
              "bg-[#D97757] hover:bg-[#c66a4e] text-white border-transparent",
              (isSubmitting || isActionLoading) && "opacity-50 cursor-not-allowed",
            )}
          >
            <Send className="w-4 h-4 mr-2" />
            Submit
          </button>
        </>
      );
    }

    if (!filteredWorkflowActions.length && !poGenerateAction) {
      return null;
    }

    const dropdownDisabled = isActionLoading || commitRequired;

    return (
      <>
        {isIcssPiStep && (
          <div className="w-full flex flex-col gap-2 p-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
              Approve against one of your projects
            </span>
            <div className="flex flex-col sm:flex-row gap-2 min-w-0 w-full">
              <select
                value={icssSelectedProject}
                onChange={(e) => setIcssSelectedProject(e.target.value)}
                className="min-w-0 w-full flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100"
              >
                <option value="">Select project…</option>
                {icssPiProjects.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <select
                value={icssSelectedHead}
                onChange={(e) => setIcssSelectedHead(e.target.value)}
                disabled={!icssSelectedProject}
                className="min-w-0 w-full flex-1 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
              >
                <option value="">Select account head…</option>
                {icssPiHeads.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        {commitRequired && (
          <div className="w-full text-xs p-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 font-medium">
            A commitment must be submitted before forwarding this application.
          </div>
        )}
        {filteredWorkflowActions.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowActionsDropdown((v) => !v)}
              disabled={dropdownDisabled}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all duration-200 shadow-sm",
                dropdownDisabled
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 border-zinc-200 dark:border-zinc-700 cursor-not-allowed"
                  : "bg-[#D97757] hover:bg-[#c66a4e] text-white border-transparent",
              )}
            >
              {isActionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Actions
              <ChevronDown className="w-4 h-4" />
            </button>

            {showActionsDropdown && !dropdownDisabled && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowActionsDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-lg overflow-hidden">
                  {filteredWorkflowActions.map((action) => {
                    const isApproveAction = action === "Approve";
                    const isDirectorBlocked = isApproveAction && directorApproveBlocked;
                    const disabledTitle = isDirectorBlocked
                      ? sendToDirector
                        ? "Awaiting Director-signed PDF upload by Staff"
                        : "Tick Send for Director Approval before approving"
                      : undefined;
                    return (
                      <button
                        key={action}
                        disabled={isDirectorBlocked}
                        title={disabledTitle}
                        onClick={() => {
                          setShowActionsDropdown(false);
                          setPendingAction(action);
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 text-left text-sm font-medium transition-colors",
                          isDirectorBlocked
                            ? "text-zinc-400 dark:text-zinc-500 cursor-not-allowed"
                            : action === "Approve"
                              ? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                              : action === "Reject"
                                ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700",
                        )}
                      >
                        {action}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </>
    );
  };

  if (isLoadingFields) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#D97757]" />
        <p className="text-zinc-500 font-medium">
          Loading form configuration...
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAF9] dark:bg-[#18181B] min-h-screen">
      <main className="max-w-8xl mx-auto p-4 md:p-8 w-full overflow-hidden">
        {/* Header */}
        <div className="mb-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
              </button>
              <div>
                <h1 className="text-2xl font-serif font-medium text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-3">
                  Indent Cum Sanction Sheet
                  {(editDocName || savedDocName) && (
                    <span
                      className={cn(
                        "text-xs font-sans px-2.5 py-1 rounded-full border",
                        ["Approved", "PO Delivered"].includes(
                          displayWorkflowState || "",
                        )
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50"
                          : displayWorkflowState === "Draft"
                            ? "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700"
                            : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50",
                      )}
                    >
                      {displayWorkflowState}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  {editDocName || savedDocName
                    ? `Application ID: ${editDocName || savedDocName}`
                    : "New Application"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              {showDirectorControls && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-100">
                  <FrappeButton
                    type="button"
                    variant="outline"
                    onClick={handleDownloadDirectorReviewPdf}
                    className="h-9 bg-white dark:bg-zinc-800"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Download PDF
                  </FrappeButton>

                  <label
                    className={cn(
                      "flex min-h-9 items-center gap-2 rounded-lg border px-3 font-medium transition-colors",
                      sendToDirector
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                        : "border-amber-200 bg-white dark:border-amber-800 dark:bg-zinc-900",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={sendToDirector}
                      disabled={sendToDirector || isUpdatingDirectorFlag}
                      onChange={(event) => {
                        if (event.target.checked) {
                          handleSendToDirectorApproval();
                        }
                      }}
                      className={cn(
                        "h-4 w-4",
                        sendToDirector
                          ? "accent-emerald-600"
                          : "accent-[#D97757]",
                      )}
                    />
                    {isUpdatingDirectorFlag
                      ? "Saving..."
                      : "Send for Director Approval"}
                  </label>

                  {directorSignedPdf ? (
                    <FrappeButton
                      type="button"
                      variant="outline"
                      onClick={() =>
                        window.open(
                          getFileUrl(directorSignedPdf),
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      className="h-9 bg-white dark:bg-zinc-800"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Director PDF
                    </FrappeButton>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                      Awaiting Director&apos;s Approval Upload
                    </span>
                  )}
                </div>
              )}
              {(formData.project_ref ||
                formData.project_no ||
                formData.project_code ||
                projectRefParam ||
                projectNoParam ||
                projectParam) && (
                  <FrappeButton
                    variant="outline"
                    onClick={handleViewProject}
                    disabled={isProjectViewLoading}
                    className="bg-white dark:bg-zinc-800 shadow-sm"
                  >
                    {isProjectViewLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <FolderOpen className="w-4 h-4 mr-2" />
                    )}
                    View Project
                  </FrappeButton>
                )}
              {workflowState === "Pending PO Generation" &&
                poGenerateAction &&
                isRnDStaff && (
                  <FrappeButton
                    type="button"
                    onClick={() => {
                      handleGeneratePo().catch((error) => {
                        console.error("PO generation failed:", error);
                        setErrorModal({
                          open: true,
                          title: "PO Generation Failed",
                          message: parseFrappeError(error),
                        });
                      });
                    }}
                    disabled={
                      !isPoDraftSaved || poCommitRequired || isActionLoading
                    }
                    title={generatePoDisabledReason}
                    className="bg-[#D97757] hover:opacity-90 text-white shadow-sm"
                  >
                    {isActionLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Generate PO
                  </FrappeButton>
                )}
              {workflowState === "Draft" && !isEditMode && currentDocName && (
                <FrappeButton
                  variant="outline"
                  onClick={() => setIsEditMode(true)}
                  className="bg-white dark:bg-zinc-800 shadow-sm"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </FrappeButton>
              )}
              {renderActionButtons()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {(editDocName || savedDocName) && (
              <WorkflowTimeline
                currentState={displayWorkflowState || "Draft"}
                formData={formData}
              />
            )}

            {shouldUsePoGenerationTabs && (
              <FrappeCard>
                <div className="p-2 flex flex-col sm:flex-row gap-2 bg-white dark:bg-zinc-900">
                  {[
                    {
                      key: "po",
                      label: "PO Generation",
                      description: "Enter and save purchase order details",
                    },
                    {
                      key: "icss",
                      label: "Approved Indent Cum Sanction Sheet",
                      description: "Click to view the approved form",
                    },
                  ].map((tab) => {
                    const isActive = poGenerationTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() =>
                          setPoGenerationTab(tab.key as "po" | "icss")
                        }
                        className={cn(
                          "flex-1 rounded-xl px-4 py-3 text-left transition-all border",
                          isActive
                            ? "bg-[#D97757] text-white border-[#D97757] shadow-sm"
                            : "bg-zinc-50 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800",
                        )}
                      >
                        <span className="block text-sm font-semibold">
                          {tab.label}
                        </span>
                        <span
                          className={cn(
                            "block text-xs mt-0.5",
                            isActive
                              ? "text-white/80"
                              : "text-zinc-500 dark:text-zinc-400",
                          )}
                        >
                          {tab.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </FrappeCard>
            )}

            {workflowState === "Pending PO Generation" &&
              showPoEditor &&
              poDraftData &&
              (!shouldUsePoGenerationTabs || poGenerationTab === "po") && (
                <div ref={poEditorRef}>
                  <FrappeCard>
                    <div className="border-b border-zinc-100 dark:border-zinc-800 px-8 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-5 bg-emerald-500 rounded-full" />
                        <div>
                          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                            Purchase Order Editor
                          </h2>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            Edit, save, and preview the ICSS purchase order
                            before final generation
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="p-8">
                      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                        {isFetchingSavedPoDraft
                          ? "Loading saved PO draft details..."
                          : isPoDraftSaved && !poCommitRequired
                            ? "PO draft saved and PO commitment staged. You can now use the header Generate PO button to move this ICSS to PO Generated."
                            : isPoDraftSaved
                              ? "PO draft is saved. You can still edit and save again, but submit the PO commitment to activate Generate PO."
                              : isPoDraftDirty
                                ? "You have unsaved PO changes. Save the PO draft before generating PO."
                                : "Save the PO draft and submit the PO commitment. The header Generate PO button will activate only after both are complete."}
                      </div>
                      {savedPoDraftLoadError && (
                        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                          {savedPoDraftLoadError}. If this says Forbidden,
                          backend needs to allow Staff/R&D to read saved ICSS_PO
                          data.
                        </div>
                      )}
                      <POEditor
                        ssData={poDraftData}
                        dpId={currentDocName}
                        isStaffRnD={isRnDStaff}
                        isPIReadOnly={false}
                        sourceLabel="ICSS"
                        isSaved={isPoDraftSaved}
                        isDirty={isPoDraftDirty}
                        onChange={handlePoEditorChange}
                        onSave={handleSavePoDraft}
                      />
                    </div>
                  </FrappeCard>
                </div>
              )}

            {isRnDStaff &&
              ["PO Generated", "Approved", "PO Delivered"].includes(
                workflowState || "",
              ) && (
                <FrappeCard>
                  <div className="border-b border-zinc-100 dark:border-zinc-800 px-8 py-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-5 bg-blue-500 rounded-full" />
                      <div>
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                          {isRnDStaff
                            ? "Generated Purchase Order"
                            : "Signed PO Attachment"}
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {isRnDStaff
                            ? `Review the submitted PO form stored in ICSS_PO${savedIcssPoDocName ? ` (${savedIcssPoDocName})` : ""}`
                            : "View the signed purchase order uploaded by R&D staff"}
                        </p>
                      </div>
                    </div>
                    {isRnDStaff && savedIcssPoFormHtml && (
                      <button
                        type="button"
                        onClick={() => {
                          const previewWindow = window.open("", "_blank");
                          if (previewWindow) {
                            previewWindow.document.write(savedIcssPoFormHtml);
                            previewWindow.document.close();
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open Full View
                      </button>
                    )}
                  </div>
                  <div className="p-8 space-y-5">
                    {isRnDStaff &&
                      (savedIcssPoFormHtml ? (
                        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-inner dark:border-zinc-800">
                          <iframe
                            title="Generated ICSS PO"
                            srcDoc={savedIcssPoFormHtml}
                            className="h-[720px] w-full bg-white"
                          />
                        </div>
                      ) : (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                          Generated PO form is not available yet. If this
                          remains empty, backend must expose/read `icss_po_form`
                          from ICSS_PO for this user.
                        </div>
                      ))}

                    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            Signed PO Attachment
                          </h3>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {isRnDStaff
                              ? "Upload the signed/generated PO. After successful upload, the form will attempt to move to Approved."
                              : "Only the signed PO attachment is shown on applicant/permanent employee side."}
                          </p>
                        </div>
                        {isRnDStaff && workflowState === "PO Generated" && (
                          <>
                            <input
                              ref={signedPoInputRef}
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) {
                                  handleSignedPoUpload(file);
                                }
                                event.target.value = "";
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => signedPoInputRef.current?.click()}
                              disabled={isUploadingSignedPo}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#D97757] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#c66a4e] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUploadingSignedPo ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Upload className="h-4 w-4" />
                              )}
                              {isUploadingSignedPo
                                ? "Uploading..."
                                : "Upload Signed PO"}
                            </button>
                          </>
                        )}
                      </div>
                      {signedPoFileUrl ? (
                        <a
                          href={getFileUrl(signedPoFileUrl)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                        >
                          <FileText className="h-4 w-4" />
                          View Uploaded Signed PO
                        </a>
                      ) : (
                        <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                          No signed PO file is attached yet.
                        </p>
                      )}
                    </div>
                  </div>
                </FrappeCard>
              )}

            {(!shouldUsePoGenerationTabs || poGenerationTab === "icss") && (
              <>
                {/* Base Parent Form */}
                <FrappeCard
                  className={cn(
                    workflowState === "Pending PO Generation" &&
                    "bg-slate-100/90 dark:bg-slate-900/50 border-slate-300 dark:border-slate-600 shadow-inner",
                  )}
                >
                  <div
                    className={cn(
                      "border-b border-zinc-100 dark:border-zinc-800 px-8 py-4 flex items-center gap-3",
                      workflowState === "Pending PO Generation" &&
                      "border-slate-300 dark:border-slate-600 bg-slate-200/80 dark:bg-slate-800/80",
                    )}
                  >
                    <div
                      className={cn(
                        "w-1 h-5 bg-[#D97757] rounded-full",
                        workflowState === "Pending PO Generation" &&
                        "bg-slate-600 dark:bg-slate-400",
                      )}
                    />
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                        Indent Cum Sanction Sheet
                      </h2>
                      {workflowState === "Pending PO Generation" && (
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5">
                          Reference form only. Enter and save PO details in the
                          Purchase Order Editor above.
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="p-8">
                    <DynamicFormRenderer
                      fields={displayBaseFields}
                      formData={formData}
                      linkOptions={displayLinkOptions}
                      onChange={handleFieldChange}
                      onFileChange={handleFileChange}
                      onTableRowChange={handleTableRowChange}
                      onTableFileChange={handleTableFileChange}
                      onAddTableRow={handleAddTableRow}
                      onDeleteTableRow={handleDeleteTableRow}
                      onFieldChangeWithSideEffects={
                        handleFieldChangeWithSideEffects
                      }
                      readOnly={isReadOnly}
                    />
                  </div>
                </FrappeCard>

                {/* Sub-Doctype Form — shown only when indent type is selected and fields exist (or loading) */}
                {selectedIndentType &&
                  (isLoadingSubForm || subFormFields.length > 0) && (
                    <FrappeCard
                      className={cn(
                        workflowState === "Pending PO Generation" &&
                        "bg-slate-100/90 dark:bg-slate-900/50 border-slate-300 dark:border-slate-600 shadow-inner",
                      )}
                    >
                      <div
                        className={cn(
                          "border-b border-zinc-100 dark:border-zinc-800 px-8 py-4 flex items-center justify-between",
                          workflowState === "Pending PO Generation" &&
                          "border-slate-300 dark:border-slate-600 bg-slate-200/80 dark:bg-slate-800/80",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-1 h-5 bg-blue-500 rounded-full",
                              workflowState === "Pending PO Generation" &&
                              "bg-slate-600 dark:bg-slate-400",
                            )}
                          />
                          <div>
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                              {selectedIndentType}
                            </h2>
                            {workflowState === "Pending PO Generation" && (
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
                                Reference child form only. Use the Purchase
                                Order Editor above for PO input.
                              </p>
                            )}
                          </div>
                        </div>
                        {isLoadingSubForm && (
                          <div className="flex items-center gap-2 text-xs text-zinc-400">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading fields...
                          </div>
                        )}
                      </div>
                      <div className="p-8">
                        {isLoadingSubForm ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-[#D97757]" />
                            <p className="text-sm text-zinc-500">
                              Loading {selectedIndentType} fields...
                            </p>
                          </div>
                        ) : subFormFields.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                              No additional fields for this indent type.
                            </p>
                            <p className="text-xs text-zinc-400 dark:text-zinc-500">
                              All required information is captured above.
                            </p>
                          </div>
                        ) : (
                          <DynamicFormRenderer
                            fields={displaySubFormFields}
                            formData={formData}
                            linkOptions={linkOptions}
                            onChange={handleFieldChange}
                            onFileChange={handleFileChange}
                            onTableRowChange={handleTableRowChange}
                            onTableFileChange={handleTableFileChange}
                            onAddTableRow={handleAddTableRow}
                            onDeleteTableRow={handleDeleteTableRow}
                            onFieldChangeWithSideEffects={
                              handleFieldChangeWithSideEffects
                            }
                            readOnly={isReadOnly}
                          />
                        )}
                      </div>
                    </FrappeCard>
                  )}
              </>
            )}
          </div>

          <aside className="lg:col-span-1 space-y-4">
            <FrappeCard>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {/* State badge row */}
                <div className="px-4 py-3 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider shrink-0">
                    State
                  </span>
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-full truncate max-w-[160px]",
                      workflowState === "Approved" || workflowState === "PO Delivered"
                        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : workflowState === "Rejected"
                          ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                          : workflowState === "Draft"
                            ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                            : "bg-orange-50 text-[#D97757] dark:bg-orange-900/20 dark:text-orange-400",
                    )}
                  >
                    {workflowState || "Draft"}
                  </span>
                </div>

                {/* Doc ID */}
                {currentDocName && (
                  <div className="px-4 py-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider shrink-0">
                      Doc ID
                    </span>
                    <span className="text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-300 truncate text-right">
                      {currentDocName}
                    </span>
                  </div>
                )}

                {/* Last modified */}
                {formData.modified && (
                  <div className="px-4 py-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider shrink-0">
                      Modified
                    </span>
                    <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                      <CalendarIcon className="w-3 h-3" />
                      {new Date(formData.modified).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}

                {/* Budget — only when projectCode exists */}
                {projectCode && (
                  <>
                    <div className="px-4 py-3 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider shrink-0">
                        Committable
                      </span>
                      <span className="text-sm font-bold text-[#D97757] tabular-nums">
                        ₹{Number(totalCommitableBalance || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="px-4 py-3 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider shrink-0">
                        Available
                      </span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        ₹{Number(actualBalance || 0).toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="px-4 py-3">
                      <button
                        onClick={() => setIsLedgerOpen(true)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[#D97757] text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <LedgerIcon className="w-3.5 h-3.5" />
                        View Ledger
                      </button>
                    </div>
                  </>
                )}
              </div>
            </FrappeCard>

            {isRnDStaff && !!currentDocName && workflowState === "Pending Staff Approval" && (
              <CommitPayment
                doctype="Indent Cum Sanction Sheet"
                docName={currentDocName}
                projectName={projectCode}
                budgetHeads={budgetHeads}
                defaultBudgetHead={defaultCommitBudgetHead}
                actualBalance={actualBalance}
                commitableBalance={commitableBalance}
                billAmount={getIcssApprovalAmount(formData) || undefined}
                triggerState="Pending PO Generation"
                onStagingStatusChange={(committed) =>
                  setIsCommittedForGate(committed)
                }
              />
            )}

            {["Pending PO Generation", "PO Generated", "Approved"].includes(
              workflowState || "",
            ) &&
              isRnDStaff &&
              currentDocName && (
                <CommitPayment
                  doctype="Indent Cum Sanction Sheet"
                  docName={currentDocName}
                  stagingReferenceName={poCommitReferenceName}
                  frapAppId={currentDocName}
                  projectName={projectCode}
                  budgetHeads={budgetHeads}
                  defaultBudgetHead={defaultCommitBudgetHead}
                  actualBalance={actualBalance}
                  commitableBalance={commitableBalance}
                  billAmount={poCommitAmount || undefined}
                  forcedRefDetails={previousIcssCommitmentTid || undefined}
                  includeBillAmount
                  moduleId={14}
                  triggerState="Pending PO Generation"
                  stagingStatuses={
                    workflowState === "Pending PO Generation"
                      ? ["PENDING_APPROVAL"]
                      : ["PUBLISHED", "PENDING_APPROVAL", "FAILED"]
                  }
                  requiredPayloadKeys={["bill_amount"]}
                  title={
                    workflowState === "Pending PO Generation"
                      ? "Make PO Commitment"
                      : "PO Commitment Details"
                  }
                  submitLabel="Submit PO Commitment"
                  description={
                    workflowState === "Pending PO Generation"
                      ? "This stages the PO-generation commitment first. Generate PO will publish the staged commitment after the PO draft is saved."
                      : "Committed amount captured during PO generation. This stays visible after PO is generated."
                  }
                  disabled={workflowState !== "Pending PO Generation"}
                  disabledReason="PO commitment is read-only after PO generation."
                  onStagingStatusChange={(committed) =>
                    setIsPoCommittedForGate(committed)
                  }
                />
              )}

            {showCommitSection && (
              <FrappeCard>
                <div className="p-5">
                  <h3 className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">
                    Record Payment
                  </h3>
                  {isCommitted ? (
                    <div className="space-y-4">
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-1">
                        <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide">
                          Linked Commitment
                        </p>
                        <div className="flex justify-between items-end gap-3">
                          <p className="text-sm font-medium text-blue-900">
                            {displayCommitment?.head}
                          </p>
                          <p className="text-lg font-bold text-blue-700">
                            ₹{" "}
                            {Number(
                              displayCommitment?.committed || 0,
                            ).toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Payment Amount (₹)
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#D97757]/25"
                          placeholder="e.g., 5000"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          max={displayCommitment?.committed}
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                          Max: ₹{" "}
                          {Number(
                            displayCommitment?.committed || 0,
                          ).toLocaleString("en-IN")}
                        </p>
                      </div>
                      <FrappeButton
                        className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                        onClick={handlePayment}
                        disabled={
                          isPaying ||
                          !paymentAmount ||
                          parseFloat(paymentAmount) >
                          (displayCommitment?.committed || 0)
                        }
                      >
                        {isPaying ? "Processing..." : "Submit Payment"}
                      </FrappeButton>
                    </div>
                  ) : (
                    <div className="text-center py-6 px-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
                      <div className="mx-auto w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center mb-3">
                        <AlertCircle className="w-5 h-5 text-zinc-400" />
                      </div>
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        Commitment Required
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Make a commitment above before recording payment.
                      </p>
                    </div>
                  )}
                </div>
              </FrappeCard>
            )}
          </aside>
        </div>
      </main>
      {projectCode && (
        <ProjectLedgerModal
          isOpen={isLedgerOpen}
          onClose={() => setIsLedgerOpen(false)}
          projectName={projectCode}
          budgetHeadList={budgetHeadList}
        />
      )}
      {/* Action confirmation dialog with optional comment */}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                Confirm: <span className="text-[#D97757]">{pendingAction}</span>
              </h3>
              <button
                onClick={() => { setPendingAction(null); setActionComment(""); }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                You are about to <strong className="text-zinc-700 dark:text-zinc-200">{pendingAction}</strong> this Indent Cum Sanction Sheet. Add an optional comment below.
              </p>
              <textarea
                rows={3}
                placeholder="Optional comment…"
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                className="w-full resize-none rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm text-zinc-700 dark:text-zinc-300 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#D97757]/30 focus:border-[#D97757] transition-colors"
              />
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
              <button
                onClick={() => { setPendingAction(null); setActionComment(""); }}
                className="px-4 py-2 rounded-lg text-sm font-medium border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isActionLoading}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors",
                  pendingAction === "Approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : pendingAction === "Reject"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-[#D97757] hover:opacity-90",
                  isActionLoading && "opacity-50 cursor-not-allowed",
                )}
              >
                {isActionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                ) : null}
                {pendingAction}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating activity log */}
      {currentDocName && (
        <FloatingActivityLogButton
          doctype="Indent Cum Sanction Sheet"
          docname={currentDocName}
        />
      )}

      {prPreviewName && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setPrPreviewName(null);
            }
          }}
        >
          <div className="relative flex-1 mx-auto my-4 w-full max-w-7xl flex flex-col bg-claude-bg dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#D97757]" />
                Project Registration Preview
                <span className="px-2 py-0.5 rounded-full text-xs bg-orange-50 dark:bg-zinc-800 text-[#D97757] font-mono border border-orange-100 dark:border-zinc-700">
                  {prPreviewName}
                </span>
              </span>
              <button
                onClick={() => setPrPreviewName(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                aria-label="Close project preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ProjectDetailsOverview projectName={prPreviewName} embedded />
            </div>
          </div>
        </div>
      )}

      <ErrorModal
        open={errorModal.open}
        title={errorModal.title}
        message={errorModal.message}
        onClose={() => setErrorModal((prev) => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default IndentCumSanctionSheetForm;
