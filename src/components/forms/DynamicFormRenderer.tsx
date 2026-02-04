import React, { memo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { isFieldVisible, isFieldMandatory, isFieldReadOnly as checkFieldReadOnly, evaluateExpression } from '@/utils/evalExpression';
import { ChildTableComponent, type ChildField } from './ChildTableComponent';

// --- TYPE DEFINITIONS ---
export interface FormField {
    fieldname: string;
    label: string | null;
    fieldtype: string;
    mandatory?: boolean | number;
    read_only?: boolean | number;
    hidden?: boolean | number;
    options?: string | null;
    description?: string | null;
    default?: any;
    depends_on?: string;
    mandatory_depends_on?: string;
    read_only_depends_on?: string;
    child_fields?: ChildField[];
}

export interface LinkOption {
    value: string;
    label: string;
}

export interface FormSection {
    title: string;
    fields: FormField[];
    collapsed?: boolean;
    depends_on?: string;
}

export interface DynamicFormRendererProps {
    fields: FormField[];
    formData: Record<string, any>;
    linkOptions: Record<string, LinkOption[]>;
    onChange: (fieldname: string, value: any) => void;
    onFileChange: (fieldname: string, file: File | null) => void;
    onTableRowChange: (tableName: string, rowIndex: number, fieldname: string, value: any) => void;
    onTableFileChange: (tableName: string, rowIndex: number, fieldname: string, file: File | null) => void;
    onAddTableRow: (tableName: string, newRow: Record<string, any>) => void;
    onDeleteTableRow: (tableName: string, rowIndex: number) => void;
    onFieldChangeWithSideEffects?: (fieldname: string, value: any) => void;
    readOnly?: boolean;
}

// --- STYLES ---
const inputClasses = "w-full h-12 px-4 bg-white border border-gray-200 rounded-xl text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-[rgba(14,165,164,0.18)] focus:border-[#0EA5A4] disabled:opacity-70 disabled:bg-gray-100 read-only:bg-gray-50";
const checkboxClasses = "size-5 shrink-0 appearance-none bg-white border border-gray-300 rounded checked:bg-[#0EA5A4] checked:border-[#0EA5A4] checked:bg-[url('data:image/svg+xml,%3csvg%20viewBox%3d%270%200%2016%2016%27%20fill%3d%27white%27%20xmlns%3d%27http%3a//www.w3.org/2000/svg%27%3e%3cpath%20d%3d%27M12.207%204.793a1%201%200%20010%201.414l-5%205a1%201%200%2001-1.414%200l-2-2a1%201%200%20011.414-1.414L6.5%209.086l4.293-4.293a1%201%200%20011.414%200z%27/%3e%3c/svg%3e')] bg-center bg-no-repeat cursor-pointer";

// --- MEMOIZED FORM FIELD COMPONENT ---
const MemoizedFormField = memo(({
    field,
    value,
    options,
    isMandatory,
    isReadOnly,
    onChange,
    onFileChange,
    onFieldChangeWithSideEffects,
}: {
    field: FormField;
    value: any;
    options?: LinkOption[];
    isMandatory: boolean;
    isReadOnly: boolean;
    onChange: (fieldname: string, value: any) => void;
    onFileChange: (fieldname: string, file: File | null) => void;
    onFieldChangeWithSideEffects?: (fieldname: string, value: any) => void;
}) => {
    if (!field.label) return null;

    const handleChange = (fieldname: string, val: any) => {
        if (onFieldChangeWithSideEffects) {
            onFieldChangeWithSideEffects(fieldname, val);
        } else {
            onChange(fieldname, val);
        }
    };

    const commonProps = {
        id: field.fieldname,
        name: field.fieldname,
        className: inputClasses,
        readOnly: isReadOnly,
        required: isMandatory,
        disabled: isReadOnly,
        value: value || '',
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            handleChange(field.fieldname, e.target.value),
    };

    const renderInput = () => {
        switch (field.fieldtype) {
            case 'Link':
                return (
                    <select {...commonProps}>
                        <option value="">Select...</option>
                        {(options || []).map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                );

            case 'Select':
                const selectOpts = field.options?.split('\n').filter(Boolean) || [];
                return (
                    <select {...commonProps}>
                        <option value="">Select...</option>
                        {selectOpts.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                );

            case 'Date':
                return <input type="date" {...commonProps} />;

            case 'Datetime':
                return <input type="datetime-local" {...commonProps} />;

            case 'Time':
                return <input type="time" {...commonProps} />;

            case 'Int':
                return <input type="number" step="1" {...commonProps} />;

            case 'Float':
                return <input type="number" step="any" {...commonProps} />;

            case 'Currency':
                return <input type="number" step="0.01" {...commonProps} />;

            case 'Check':
                return (
                    <label className="flex items-center gap-3 font-medium text-gray-900 cursor-pointer bg-gray-50 p-3 border border-gray-200 rounded-xl">
                        <input
                            type="checkbox"
                            className={checkboxClasses}
                            checked={!!value}
                            onChange={(e) => handleChange(field.fieldname, e.target.checked ? 1 : 0)}
                            disabled={isReadOnly}
                        />
                        <span>{field.label}</span>
                    </label>
                );

            case 'Small Text':
            case 'Text':
                return (
                    <textarea
                        {...commonProps}
                        rows={4}
                        className={cn(inputClasses, "h-auto py-3")}
                    />
                );

            case 'Text Editor':
                return (
                    <textarea
                        {...commonProps}
                        rows={6}
                        className={cn(inputClasses, "h-auto py-3")}
                    />
                );

            case 'Attach':
            case 'Attach Image':
                // If there's an existing file URL, show it as a link
                if (value && typeof value === 'string') {
                    const fileName = value.split('/').pop() || 'File';
                    return (
                        <div className="flex items-center gap-3">
                            <a
                                href={value}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 px-4 py-2 bg-[#E0F7F6] text-[#0EA5A4] rounded-xl hover:bg-[#0EA5A4] hover:text-white transition-colors font-medium"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                {fileName}
                            </a>
                            {!isReadOnly && (
                                <input
                                    type="file"
                                    id={field.fieldname}
                                    name={field.fieldname}
                                    className={cn(inputClasses, "py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-medium file:bg-gray-100 file:text-gray-600 hover:file:bg-gray-200 file:transition-colors")}
                                    onChange={(e) => onFileChange(field.fieldname, e.target.files?.[0] || null)}
                                    accept={field.fieldtype === 'Attach Image' ? 'image/*' : undefined}
                                />
                            )}
                        </div>
                    );
                }
                // No existing file, show file input (hidden in read-only mode)
                if (isReadOnly) {
                    return <div className="text-gray-400 italic">No file uploaded</div>;
                }
                return (
                    <input
                        type="file"
                        id={field.fieldname}
                        name={field.fieldname}
                        className={cn(inputClasses, "py-2 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:font-medium file:bg-[#E0F7F6] file:text-[#0EA5A4] hover:file:bg-[#0EA5A4] hover:file:text-white file:transition-colors")}
                        onChange={(e) => onFileChange(field.fieldname, e.target.files?.[0] || null)}
                        accept={field.fieldtype === 'Attach Image' ? 'image/*' : undefined}
                    />
                );

            case 'HTML':
                return (
                    <div
                        className="prose prose-sm max-w-none text-gray-900 p-4 bg-amber-50 border border-amber-200 rounded-xl"
                        dangerouslySetInnerHTML={{ __html: field.options || '' }}
                    />
                );

            case 'Read Only':
                return (
                    <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-700">
                        {value || '-'}
                    </div>
                );

            case 'Data':
            default:
                return <input type="text" {...commonProps} />;
        }
    };

    // Checkbox has its own label rendering
    if (field.fieldtype === 'Check') {
        return <div className="space-y-2">{renderInput()}</div>;
    }

    // HTML fields don't need a label
    if (field.fieldtype === 'HTML') {
        return <div className="col-span-full">{renderInput()}</div>;
    }

    return (
        <div className="space-y-2">
            <label htmlFor={field.fieldname} className="block font-medium text-gray-900">
                {field.label}
                {isMandatory && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderInput()}
            {field.description && (
                <p className="text-sm text-gray-600">{field.description}</p>
            )}
        </div>
    );
});

MemoizedFormField.displayName = 'MemoizedFormField';

// --- SECTION COMPONENT ---
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-4">
        {title && <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-3">{title}</h2>}
        {children}
    </div>
);

// --- MAIN DYNAMIC FORM RENDERER ---
export const DynamicFormRenderer: React.FC<DynamicFormRendererProps> = ({
    fields,
    formData,
    linkOptions,
    onChange,
    onFileChange,
    onTableRowChange,
    onTableFileChange,
    onAddTableRow,
    onDeleteTableRow,
    onFieldChangeWithSideEffects,
    readOnly = false,
}) => {
    // Group fields by sections
    const groupFieldsBySection = useCallback((): FormSection[] => {
        const sections: FormSection[] = [];
        let currentSection: FormSection | null = null;
        let sectionIndex = 0;

        for (const field of fields) {
            if (field.fieldtype === 'Section Break') {
                if (currentSection && currentSection.fields.length > 0) {
                    sections.push(currentSection);
                }
                sectionIndex++;
                // Use unique title or numbered fallback to avoid duplicates
                const sectionTitle = field.label || '';
                currentSection = {
                    title: sectionTitle,
                    fields: [],
                    depends_on: field.depends_on,
                };
            } else if (field.fieldtype === 'Column Break') {
                // Ignore column breaks for now
                continue;
            } else if (currentSection) {
                currentSection.fields.push(field);
            } else {
                // Fields before first section break - create initial section
                currentSection = { title: '', fields: [field] };
            }
        }

        if (currentSection && currentSection.fields.length > 0) {
            sections.push(currentSection);
        }

        // If no sections found, put all fields in one section
        if (sections.length === 0 && fields.length > 0) {
            sections.push({
                title: '',
                fields: fields.filter(f => f.fieldtype !== 'Section Break' && f.fieldtype !== 'Column Break'),
            });
        }

        return sections;
    }, [fields]);

    const sections = groupFieldsBySection();

    const renderField = (field: FormField) => {
        // Skip hidden fields
        if (!isFieldVisible(field, formData)) {
            return null;
        }

        const isMandatory = isFieldMandatory(field, formData);
        const fieldIsReadOnly = readOnly || checkFieldReadOnly(field, formData);

        // Handle Table fields
        if (field.fieldtype === 'Table' && field.child_fields) {
            return (
                <div key={field.fieldname} className="col-span-full">
                    <ChildTableComponent
                        tableName={field.fieldname}
                        label={field.label || undefined}
                        columns={field.child_fields}
                        tableData={formData[field.fieldname] || []}
                        onRowChange={onTableRowChange}
                        onFileChange={onTableFileChange}
                        onAddRow={onAddTableRow}
                        onDeleteRow={onDeleteTableRow}
                        readOnly={fieldIsReadOnly}
                    />
                </div>
            );
        }

        return (
            <MemoizedFormField
                key={field.fieldname}
                field={field}
                value={formData[field.fieldname]}
                options={linkOptions[field.options as string] || linkOptions[field.fieldname]}
                isMandatory={isMandatory}
                isReadOnly={fieldIsReadOnly}
                onChange={onChange}
                onFileChange={onFileChange}
                onFieldChangeWithSideEffects={onFieldChangeWithSideEffects}
            />
        );
    };

    // Import evaluateExpression for section visibility
    const isSectionVisible = (section: FormSection): boolean => {
        if (!section.depends_on) return true;
        return evaluateExpression(section.depends_on, formData);
    };

    return (
        <div className="space-y-12">
            {sections.map((section, idx) => {
                // Check if section should be visible
                if (!isSectionVisible(section)) {
                    return null;
                }

                // Check if there are any visible fields in this section
                const visibleFields = section.fields.filter(f => isFieldVisible(f, formData));
                if (visibleFields.length === 0 && !section.title) {
                    return null;
                }

                return (
                    <FormSection key={idx} title={section.title}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {section.fields.map(field => renderField(field))}
                        </div>
                    </FormSection>
                );
            })}
        </div>
    );
};

export default DynamicFormRenderer;
