


// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= new design



import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { cn } from '@/lib/utils';

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
  type?: 'default' | 'table';
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
const inputClasses = "w-full h-12 px-4 bg-white border border-gray-400 rounded-lg font-mono shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-100 text-black font-bold";

const FrappeCard = ({ children, className }: any) => (
  <div className={cn("bg-white p-6 md:p-8 border border-gray-300 rounded-lg shadow-sm", className)}>
    {children}
  </div>
);

const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: any) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={cn("px-5 py-2.5 border border-gray-300 rounded-lg font-bold text-black shadow-sm transition-all duration-150",
      "hover:bg-gray-100 hover:-translate-y-0.5",
      "active:shadow-none active:translate-y-0",
      "disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 disabled:bg-gray-200", className)}
  >
    {children}
  </button>
);

const NeoSection = ({ title, children }: any) => (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-black tracking-tight border-b-2 border-black pb-3 uppercase">
      {title}
    </h2>
    {children}
  </div>
);

// --- MEMOIZED FORM FIELD COMPONENT (WITH HTML RENDERING) ---
const MemoizedFormField = memo(({ field, value, options, onChange }: any) => {
  if (!field || field.hidden) return null;

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
          <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg min-h-[8rem]">
            <div className="prose prose-sm max-w-none text-black font-bold" dangerouslySetInnerHTML={{ __html: field.options || value || "" }} />
          </div>
        );
      case "Link":
      case "Dynamic Link":
        return (
          <select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}>
            <option value="">Select...</option>
            {(options || []).map((opt: any) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        );
      case "Select":
        const selectOptions = field.options?.split('\n').filter(Boolean) || [];
        return (
          <select {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)}>
            <option value="">Select...</option>
            {selectOptions.map((opt: string) => (<option key={opt} value={opt}>{opt}</option>))}
          </select>
        );
      case "Date":
        return <input type="date" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} />;
      case "Text Editor":
      case "Small Text":
      case "Long Text":
        return (
          <textarea {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} rows={4} className={cn(inputClasses, "!h-auto py-3")} />
        );
      case "Attach":
        return (
          <input type="file" className={`${inputClasses} p-2.5 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-gray-200 file:text-black hover:file:bg-gray-300`} onChange={e => onChange(field.fieldname, e.target.files?.[0] || null)} />
        );
      default:
        return (
          <input type="text" {...commonProps} value={value || ''} onChange={e => onChange(field.fieldname, e.target.value)} placeholder={`${field.label}...`} />
        );
    }
  };

  return (
    <div className='space-y-2'>
      <label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">
        {field.label}
        {!!field.mandatory && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {!!field.description && (
        <p className="text-sm text-gray-900 font-bold font-mono mt-1">{field.description}</p>
      )}
    </div>
  );
});

// --- GENERIC TABLE COMPONENT (REFINED STYLING) ---
const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => {
  const renderCell = (col: any, row: any, i: number) => {
    if (col.type === 'Link' || col.type === 'Dynamic Link' || col.type === 'Select') {
      return (
        <select
          className={`${inputClasses} !h-11`}
          value={row[col.key] || ''}
          onChange={e => onRowChange(tableName, i, col.key, e.target.value)}
        >
          <option value="">Select...</option>
          {(col.options || []).map((opt: any) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return <option key={val} value={val}>{lbl}</option>;
          })}
        </select>
      );
    }

    if (col.type === 'Date') {
      return (
        <input
          type="date"
          className={`${inputClasses} !h-11`}
          value={row[col.key] || ''}
          onChange={e => onRowChange(tableName, i, col.key, e.target.value)}
        />
      );
    }

    const type = (col.type === 'Currency' || col.type === 'Float' || col.type === 'Int') ? 'number' : 'text';
    const step = col.type === 'Int' ? "1" : "0.01";

    return (
      <input
        type={type}
        step={type === 'number' ? step : undefined}
        className={`${inputClasses} !h-11`}
        value={row[col.key] || ''}
        onChange={e => onRowChange(tableName, i, col.key, e.target.value)}
      />
    );
  };

  return (
    <NeoSection title={title}>
      <div className="overflow-x-auto border border-gray-300 rounded-lg">
        <table className="min-w-full divide-y-2 divide-black">
          <thead className="bg-gray-100">
            <tr className="divide-x-2 divide-black">
              {[...columns, { key: 'actions', label: '' }].map((c: any) => (
                <th key={c.key} className="p-3 font-bold text-black text-sm text-left uppercase">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-black bg-white">
            {(tableData || []).map((row: any, i: number) => (
              <tr key={row.id || i} className="divide-x-2 divide-black hover:bg-gray-50 transition-colors duration-150">
                {columns.map((col: any) => (
                  <td key={col.key} className="p-2 min-w-[150px]">
                    {renderCell(col, row, i)}
                  </td>
                ))}
                <td className="p-2 text-center w-[100px]">
                  <FrappeButton onClick={() => onDeleteRow(tableName, i)} className="!py-2 text-sm bg-red-50 border-red-200 hover:bg-red-100 text-red-700 w-full">
                    Delete
                  </FrappeButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FrappeButton onClick={() => onAddRow(tableName, newRow)} className="mt-4 bg-[#A5D6A7] hover:bg-[#8BC34A] border-[#8BC34A]/20">
        Add Row
      </FrappeButton>
    </NeoSection>
  );
});

// --- UNIVERSAL FORM RENDERER ---
export const FormRender: React.FC<UniversalFormProps & {
  noCard?: boolean;
  onCancel?: () => void;
  onFormChange?: (data: FormData) => void;
  hideActions?: boolean;
}> = ({
  fields,
  linkOptions,
  initialData = {},
  onSubmit,
  submitButtonText = 'Submit',
  title = 'Form',
  sections,
  isSubmitting = false,
  customTableComponents = {},
  noCard = false,
  onCancel,
  onFormChange,
  hideActions = false
}) => {
    const [formData, setFormData] = useState<FormData>(initialData);

    // Track the last data we emitted to the parent (or received and accepted)
    // This helps distinguish between "echo" updates from parent (which we ignore)
    // and real external updates (which we accept)
    const lastEmittedDataRef = useRef(initialData);

    useEffect(() => {
      // If incoming initialData matches what we last knew/emitted, it's likely an echo from parent re-render.
      // We only update if it's genuinely different content (external update or reset).
      if (JSON.stringify(initialData) !== JSON.stringify(lastEmittedDataRef.current)) {
        setFormData(initialData);
        lastEmittedDataRef.current = initialData;
      }
    }, [initialData]);

    // Notify parent of changes
    useEffect(() => {
      if (onFormChange) {
        // Only emit if formData has actually changed from what we last thought it was
        if (JSON.stringify(formData) !== JSON.stringify(lastEmittedDataRef.current)) {
          lastEmittedDataRef.current = formData;
          onFormChange(formData);
        }
      }
    }, [formData, onFormChange]);

    const handleChange = useCallback((fieldname: string, value: any) => {
      setFormData(prev => ({ ...prev, [fieldname]: value }));
    }, []);

    const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
      setFormData(prev => {
        const table = [...(prev[tableName] || [])];
        table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
        return { ...prev, [tableName]: table };
      });
    }, []);

    const handleFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
      setFormData(prev => {
        const table = [...(prev[tableName] || [])];
        table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
        return { ...prev, [tableName]: table };
      });
    }, []);

    const addTableRow = useCallback((tableName: string, newRow: object) => {
      const newId = Date.now().toString();
      setFormData(prev => ({
        ...prev,
        [tableName]: [...(prev[tableName] || []), { ...newRow, id: newId }]
      }));
    }, []);

    const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
      setFormData(prev => ({
        ...prev,
        [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex)
      }));
    }, []);

    const renderField = useCallback((fieldname: string) => {
      const field = fields.find(f => f.fieldname === fieldname);
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
    }, [fields, formData, linkOptions, handleChange]);

    const handleSubmitClick = async () => {
      await onSubmit(formData);
    };

    const renderSection = (section: SectionConfig, index: number) => {
      if (section.type === 'table' && section.tableConfig) {
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {section.fields.map(fieldname => renderField(fieldname))}
          </div>
        </NeoSection>
      );
    };

    const Content = (
      <div className="space-y-12">
        {sections ? (
          sections.map((section, index) => renderSection(section, index))
        ) : (
          <NeoSection title={title}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {fields.map(field => renderField(field.fieldname))}
            </div>
          </NeoSection>
        )}
      </div>
    );

    return (
      <div>
        {noCard ? Content : <FrappeCard className="space-y-12">{Content}</FrappeCard>}

        {!hideActions && (
          <div className="mt-8 flex justify-end gap-4">
            {onCancel && (
              <FrappeButton onClick={onCancel} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
                Cancel
              </FrappeButton>
            )}
            <FrappeButton onClick={handleSubmitClick} disabled={isSubmitting} className="bg-[#0EA5A4] text-white hover:bg-[#0D9494] border-[#0D9494]/20">
              {isSubmitting ? 'Submitting...' : submitButtonText}
            </FrappeButton>
          </div>
        )}
      </div>
    );
  };

export default FormRender;