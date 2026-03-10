// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= new design

import React, { useState, useEffect, useCallback, memo, useRef } from "react";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
interface Field {
  fieldname: string;
  label: string | null;
  fieldtype: string;
  mandatory: boolean;
  read_only: boolean;
  hidden: boolean;
  options?: string | null;
  description?: string | null;
}

interface LinkOption {
  value: string;
  label: string;
}

interface FormData {
  [key: string]: any;
}

interface UniversalFormProps {
  fields: Field[];
  linkOptions: Record<string, LinkOption[]>;
  initialData?: FormData;
  onSubmit: (data: FormData) => Promise<void>;
  submitButtonText?: string;
  title?: string;
  sections?: SectionConfig[];
  isSubmitting?: boolean;
  customTableComponents?: Record<string, React.ComponentType<any>>;
}

interface SectionConfig {
  title: string;
  fields: string[];
  type?: "default" | "table";
  tableConfig?: TableConfig;
}

interface TableConfig {
  fieldname: string;
  columns: Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
  }>;
  newRowTemplate: Record<string, any>;
}

// --- STYLES & REUSABLE UI COMPONENTS (REFINED NEO-BRUTALISM) ---
const inputClasses =
  "w-full h-9 px-3 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-md text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 disabled:opacity-70 disabled:bg-zinc-100 dark:disabled:bg-zinc-700 read-only:bg-zinc-100 dark:read-only:bg-zinc-700 text-zinc-900 dark:text-zinc-100";

const FrappeCard = ({ children, className }: any) => (
  <div
    className={cn(
      "bg-white dark:bg-zinc-900 p-6 md:p-8 border border-zinc-300 dark:border-zinc-700 rounded-lg shadow-sm",
      className,
    )}
  >
    {children}
  </div>
);

const FrappeButton = ({
  children,
  onClick,
  disabled,
  className,
  type = "button",
}: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "px-5 py-2 border border-zinc-300 dark:border-zinc-600 rounded-lg font-bold text-zinc-900 dark:text-zinc-100 shadow-sm transition-all duration-150",
      "hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:-translate-y-0.5",
      "active:shadow-none active:translate-y-0",
      "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 disabled:bg-zinc-200 dark:disabled:bg-zinc-700",
      className,
    )}
  >
    {children}
  </button>
);

const NeoSection = ({ title, children }: any) => (
  <div className="space-y-4">
    <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight border-b border-zinc-300 dark:border-zinc-600 pb-2 uppercase">
      {title}
    </h2>
    {children}
  </div>
);

// --- MEMOIZED FORM FIELD COMPONENT (WITH HTML RENDERING) ---
const MemoizedFormField = memo(({ field, value, options, onChange }: any) => {
  if (!field || field.hidden) return null;

  // Handle Section Break - render as a section header spanning full width
  if (field.fieldtype === "Section Break") {
    if (!field.label) return null; // Skip unnamed section breaks
    return (
      <div className="col-span-full pt-3 pb-1.5 border-b border-zinc-300 dark:border-zinc-700 mt-3 first:mt-0">
        <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">
          {field.label}
        </h3>
        {!!field.description && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            {field.description}
          </p>
        )}
      </div>
    );
  }

  // Handle Column Break - skip rendering
  if (field.fieldtype === "Column Break") {
    return null;
  }

  const commonProps = {
    id: field.fieldname,
    name: field.fieldname,
    className: inputClasses,
    readOnly: field.read_only,
    required: field.mandatory,
    disabled: field.read_only,
  };

  const renderInput = () => {
    switch (field.fieldtype) {
      case "HTML":
        return (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg min-h-[8rem]">
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-zinc-900 dark:text-zinc-100 font-bold"
              dangerouslySetInnerHTML={{ __html: field.options || value || "" }}
            />
          </div>
        );
      case "Link":
      case "Dynamic Link":
        return (
          <select
            {...commonProps}
            value={value || ""}
            onChange={(e) => onChange(field.fieldname, e.target.value)}
          >
            <option value="">Select...</option>
            {(options || []).map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case "Select":
        const selectOptions = field.options?.split("\n").filter(Boolean) || [];
        return (
          <select
            {...commonProps}
            value={value || ""}
            onChange={(e) => onChange(field.fieldname, e.target.value)}
          >
            <option value="">Select...</option>
            {selectOptions.map((opt: string) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );
      case "Date":
        return (
          <input
            type="date"
            {...commonProps}
            value={value || ""}
            onChange={(e) => onChange(field.fieldname, e.target.value)}
          />
        );
      case "Text Editor":
      case "Small Text":
      case "Long Text":
        return (
          <textarea
            {...commonProps}
            value={value || ""}
            onChange={(e) => onChange(field.fieldname, e.target.value)}
            rows={4}
            className={cn(inputClasses, "!h-auto py-3")}
          />
        );
      case "Attach":
        return (
          <input
            type="file"
            className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-zinc-200 dark:file:bg-zinc-700 file:text-zinc-900 dark:file:text-zinc-100 hover:file:bg-zinc-300 dark:hover:file:bg-zinc-600`}
            onChange={(e) =>
              onChange(field.fieldname, e.target.files?.[0] || null)
            }
          />
        );
      default:
        return (
          <input
            type="text"
            {...commonProps}
            value={value || ""}
            onChange={(e) => onChange(field.fieldname, e.target.value)}
            placeholder={`${field.label}...`}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      <label
        htmlFor={field.fieldname}
        className="block font-semibold text-zinc-700 dark:text-zinc-300 text-xs uppercase"
      >
        {field.label}
        {!!field.mandatory && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {!!field.description && (
        <p className="text-sm text-zinc-700 dark:text-zinc-300 font-bold font-mono mt-1">
          {field.description}
        </p>
      )}
    </div>
  );
});

// --- GENERIC TABLE COMPONENT (REFINED STYLING) ---
const MemoizedGenericTable = memo(
  ({
    title,
    tableName,
    columns,
    newRow,
    tableData,
    onRowChange,
    onAddRow,
    onDeleteRow,
  }: any) => {
    const renderCell = (col: any, row: any, i: number) => {
      if (
        col.type === "Link" ||
        col.type === "Dynamic Link" ||
        col.type === "Select"
      ) {
        return (
          <select
            className={`${inputClasses} !h-8 text-xs`}
            value={row[col.key] || ""}
            onChange={(e) => onRowChange(tableName, i, col.key, e.target.value)}
          >
            <option value="">Select...</option>
            {(col.options || []).map((opt: any) => {
              const val = typeof opt === "object" ? opt.value : opt;
              const lbl = typeof opt === "object" ? opt.label : opt;
              return (
                <option key={val} value={val}>
                  {lbl}
                </option>
              );
            })}
          </select>
        );
      }

      if (col.type === "Date") {
        return (
          <input
            type="date"
            className={`${inputClasses} !h-8 text-xs`}
            value={row[col.key] || ""}
            onChange={(e) => onRowChange(tableName, i, col.key, e.target.value)}
          />
        );
      }

      const type =
        col.type === "Currency" || col.type === "Float" || col.type === "Int"
          ? "number"
          : "text";
      return (
        <input
          type={type}
          className={`${inputClasses} !h-8 text-xs`}
          value={row[col.key] || ""}
          onChange={(e) => onRowChange(tableName, i, col.key, e.target.value)}
        />
      );
    };

    return (
      <NeoSection title={title}>
        <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
          <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-700">
            <thead className="bg-zinc-50 dark:bg-zinc-800/50">
              <tr>
                {[...columns, { key: "actions", label: "" }].map((c: any) => (
                  <th
                    key={c.key}
                    className="px-3 py-2 font-semibold text-zinc-600 dark:text-zinc-400 text-xs text-left uppercase tracking-wider"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900">
              {(tableData || []).map((row: any, i: number) => (
                <tr
                  key={row.id || i}
                  className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  {columns.map((col: any) => (
                    <td key={col.key} className="px-2 py-1.5 min-w-[140px]">
                      {renderCell(col, row, i)}
                    </td>
                  ))}
                  <td className="px-2 py-1.5 text-center w-[80px]">
                    <FrappeButton
                      onClick={() => onDeleteRow(tableName, i)}
                      className="!py-1 text-xs bg-red-50 border-red-200 hover:bg-red-100 text-red-600 w-full"
                    >
                      Delete
                    </FrappeButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <FrappeButton
          onClick={() => onAddRow(tableName, newRow)}
          className="mt-0 bg-[#D97757] hover:bg-[#c5684a] text-white border-[#D97757]/20"
        >
          Add Row
        </FrappeButton>
      </NeoSection>
    );
  },
);

// --- UNIVERSAL FORM RENDERER ---
export const FormRender: React.FC<
  UniversalFormProps & {
    noCard?: boolean;
    onCancel?: () => void;
    onFormChange?: (data: FormData) => void;
    hideActions?: boolean;
  }
> = ({
  fields,
  linkOptions,
  initialData = {},
  onSubmit,
  submitButtonText = "Submit",
  title = "Form",
  sections,
  isSubmitting = false,
  customTableComponents = {},
  noCard = false,
  onCancel,
  onFormChange,
  hideActions = false,
}) => {
    const [formData, setFormData] = useState<FormData>(initialData);

    // Track the last data we emitted to the parent (or received and accepted)
    const lastEmittedDataRef = useRef(initialData);
    // When true, the next formData change was caused by accepting parent data
    // and should NOT be re-emitted back to the parent (prevents loops).
    const suppressEmitRef = useRef(false);

    useEffect(() => {
      // Accept incoming initialData if it genuinely differs from what we last emitted.
      // This catches external updates (e.g., calculation hooks updating child tables).
      const incomingJson = JSON.stringify(initialData);
      const emittedJson = JSON.stringify(lastEmittedDataRef.current);
      if (incomingJson !== emittedJson) {
        suppressEmitRef.current = true; // Don't re-emit this back to parent
        setFormData(initialData);
        lastEmittedDataRef.current = initialData;
      }
    }, [initialData]);

    // Notify parent of changes
    useEffect(() => {
      // Skip emitting if this change came from accepting parent data
      if (suppressEmitRef.current) {
        suppressEmitRef.current = false;
        return;
      }
      if (onFormChange) {
        if (
          JSON.stringify(formData) !== JSON.stringify(lastEmittedDataRef.current)
        ) {
          lastEmittedDataRef.current = formData;
          onFormChange(formData);
        }
      }
    }, [formData, onFormChange]);

    const handleChange = useCallback((fieldname: string, value: any) => {
      setFormData((prev) => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleTableRowChange = useCallback(
      (tableName: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData((prev) => {
          const table = [...(prev[tableName] || [])];
          table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
          return { ...prev, [tableName]: table };
        });
      },
      [],
    );

    const handleFileChange = useCallback(
      (
        tableName: string,
        rowIndex: number,
        fieldname: string,
        file: File | null,
      ) => {
        setFormData((prev) => {
          const table = [...(prev[tableName] || [])];
          table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
          return { ...prev, [tableName]: table };
        });
      },
      [],
    );

    const addTableRow = useCallback((tableName: string, newRow: object) => {
      const newId = Date.now().toString();
      setFormData((prev) => ({
        ...prev,
        [tableName]: [...(prev[tableName] || []), { ...newRow, id: newId }],
      }));
    }, []);

    const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
      setFormData((prev) => ({
        ...prev,
        [tableName]: (prev[tableName] || []).filter(
          (_: any, i: number) => i !== rowIndex,
        ),
      }));
    }, []);

    const renderField = useCallback(
      (fieldname: string) => {
        const field = fields.find((f) => f.fieldname === fieldname);
        if (!field) return null;
        return (
          <MemoizedFormField
            key={field.fieldname}
            field={field}
            value={formData[field.fieldname]}
            options={linkOptions[field.fieldname]}
            onChange={handleChange}
          />
        );
      },
      [fields, formData, linkOptions, handleChange],
    );

    const handleSubmitClick = async () => {
      await onSubmit(formData);
    };

    const renderSection = (section: SectionConfig, index: number) => {
      if (section.type === "table" && section.tableConfig) {
        const CustomTable = customTableComponents[section.tableConfig.fieldname];
        if (CustomTable) {
          return (
            <CustomTable
              key={index}
              formData={formData}
              tableConfig={section.tableConfig}
              onRowChange={handleTableRowChange}
              onFileChange={handleFileChange}
              onAddRow={addTableRow}
              onDeleteRow={deleteTableRow}
            />
          );
        }
        return (
          <MemoizedGenericTable
            key={index}
            title={section.title}
            tableName={section.tableConfig.fieldname}
            columns={section.tableConfig.columns}
            newRow={section.tableConfig.newRowTemplate}
            tableData={formData[section.tableConfig.fieldname]}
            onRowChange={handleTableRowChange}
            onFileChange={handleFileChange}
            onAddRow={addTableRow}
            onDeleteRow={deleteTableRow}
          />
        );
      }

      return (
        <NeoSection key={index} title={section.title}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {section.fields.map((fieldname) => renderField(fieldname))}
          </div>
        </NeoSection>
      );
    };

    const Content = (
      <div className="space-y-6">
        {sections ? (
          sections.map((section, index) => renderSection(section, index))
        ) : (
          <NeoSection title={title}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fields.map((field) => renderField(field.fieldname))}
            </div>
          </NeoSection>
        )}
      </div>
    );

    return (
      <div>
        {noCard ? (
          Content
        ) : (
          <FrappeCard className="space-y-6">{Content}</FrappeCard>
        )}

        {!hideActions && (
          <div className="mt-8 flex justify-end gap-4">
            {onCancel && (
              <FrappeButton
                onClick={onCancel}
                variant="outline"
                className="border-red-200 text-red-700 hover:bg-red-50"
              >
                Cancel
              </FrappeButton>
            )}
            <FrappeButton
              onClick={handleSubmitClick}
              disabled={isSubmitting}
              className="bg-[#D97757] text-white hover:bg-[#0D9494] border-[#D97757]/20"
            >
              {isSubmitting ? "Submitting..." : submitButtonText}
            </FrappeButton>
          </div>
        )}
      </div>
    );
  };

export default FormRender;
