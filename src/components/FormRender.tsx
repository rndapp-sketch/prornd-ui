// import React, { useState, useEffect, useCallback, memo } from 'react';
// import { cn } from '@/lib/utils';

// // --- TYPE DEFINITIONS ---
// interface Field {
//   fieldname: string;
//   label: string | null;
//   fieldtype: string;
//   mandatory: boolean;
//   read_only: boolean;
//   hidden: boolean;
//   options?: string | null;
//   description?: string | null;
// }

// interface LinkOption {
//   value: string;
//   label: string;
// }

// interface FormData {
//   [key: string]: any;
// }

// interface UniversalFormProps {
//   fields: Field[];
//   linkOptions: Record<string, LinkOption[]>;
//   initialData?: FormData;
//   onSubmit: (data: FormData) => Promise<void>;
//   submitButtonText?: string;
//   title?: string;
//   sections?: SectionConfig[];
//   isSubmitting?: boolean;
//   customTableComponents?: Record<string, React.ComponentType<any>>;
// }

// interface SectionConfig {
//   title: string;
//   fields: string[];
//   type?: 'default' | 'table';
//   tableConfig?: TableConfig;
// }

// interface TableConfig {
//   fieldname: string;
//   columns: Array<{
//     key: string;
//     label: string;
//     type: string;
//     options?: string[];
//   }>;
//   newRowTemplate: Record<string, any>;
// }

// // --- STYLES & REUSABLE UI COMPONENTS ---
// const inputClasses = "w-full h-12 px-4 bg-white border border-gray-200 rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200 read-only:bg-gray-200";

// const FrappeCard = ({ children, className }: any) => (
//   <div className={cn("bg-white p-6 md:p-8 border border-gray-200 rounded-md shadow-sm", className)}>
//     {children}
//   </div>
// );

// const FrappeButton = ({ children, onClick, disabled, className, type = "button" }: any) => (
//   <button
//     type={type}
//     onClick={onClick}
//     disabled={disabled}
//     className={cn("px-5 py-3 border border-gray-200 rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed", className)}
//   >
//     {children}
//   </button>
// );

// const NeoSection = ({ title, children }: any) => (
//   <div className="space-y-6">
//     <h2 className="text-2xl font-extrabold text-black uppercase tracking-tight border-b-2 border-black pb-3">
//       {title}
//     </h2>
//     {children}
//   </div>
// );

// // --- MEMOIZED FORM FIELD COMPONENT ---
// const MemoizedFormField = memo(({ field, value, options, onChange }: any) => {
//   if (!field || field.hidden) return null;

//   const commonProps = {
//     id: field.fieldname,
//     name: field.fieldname,
//     className: inputClasses,
//     readOnly: field.read_only,
//     required: field.mandatory,
//     disabled: field.read_only,
//   };

//   const renderInput = () => {
//     switch (field.fieldtype) {
//       // Link Fields
//       case "Link":
//         return (
//           <select
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           >
//             <option value="">Select...</option>
//             {(options || []).map((opt: any) => (
//               <option key={opt.value} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//         );

//       case "Dynamic Link":
//         return (
//           <select
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           >
//             <option value="">Select...</option>
//             {(options || []).map((opt: any) => (
//               <option key={opt.value} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//         );

//       case "Table MultiSelect":
//         return (
//           <select
//             {...commonProps}
//             multiple
//             value={Array.isArray(value) ? value : []}
//             onChange={e => onChange(field.fieldname, Array.from(e.target.selectedOptions, opt => opt.value))}
//           >
//             {(options || []).map((opt: any) => (
//               <option key={opt.value} value={opt.value}>
//                 {opt.label}
//               </option>
//             ))}
//           </select>
//         );

//       // Select Fields
//       case "Select":
//         const selectOptions = field.options?.split('\n') || [];
//         return (
//           <select
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           >
//             <option value="">Select...</option>
//             {selectOptions.map((opt: string) => (
//               <option key={opt} value={opt}>
//                 {opt}
//               </option>
//             ))}
//           </select>
//         );

//       // Date and Time Fields
//       case "Date":
//         return (
//           <input
//             type="date"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           />
//         );

//       case "Date and Time":
//       case "DateTime":
//         return (
//           <input
//             type="datetime-local"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           />
//         );

//       case "Time":
//         return (
//           <input
//             type="time"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           />
//         );

//       case "Duration":
//         return (
//           <input
//             type="time"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           />
//         );

//       // Numeric Fields
//       case "Currency":
//       case "Float":
//         return (
//           <input
//             type="number"
//             step="0.01"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           />
//         );

//       case "Int":
//       case "Integer":
//         return (
//           <input
//             type="number"
//             step="1"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           />
//         );

//       case "Percent":
//         return (
//           <input
//             type="number"
//             step="0.01"
//             min="0"
//             max="100"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//             placeholder="0-100"
//           />
//         );

//       // Boolean Fields
//       case "Check":
//         return (
//           <input
//             type="checkbox"
//             {...commonProps}
//             checked={value || false}
//             onChange={e => onChange(field.fieldname, e.target.checked)}
//             className="h-6 w-6 border border-gray-200 rounded cursor-pointer"
//           />
//         );

//       // Text Fields
//       case "Data":
//       case "Text":
//         return (
//           <input
//             type="text"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           />
//         );

//       case "Email":
//         return (
//           <input
//             type="email"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           />
//         );

//       case "Phone":
//         return (
//           <input
//             type="tel"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           />
//         );

//       case "URL":
//         return (
//           <input
//             type="url"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           />
//         );

//       case "Password":
//         return (
//           <input
//             type="password"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//           />
//         );

//       case "Small Text":
//       case "Long Text":
//         return (
//           <textarea
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//             rows={4}
//             className={cn(inputClasses, "!h-auto")}
//           />
//         );

//       case "Text Editor":
//       case "Markdown Editor":
//         return (
//           <textarea
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//             rows={6}
//             className={cn(inputClasses, "!h-auto font-mono text-sm")}
//             placeholder={field.fieldtype === "Markdown Editor" ? "Enter markdown..." : "Enter HTML..."}
//           />
//         );

//       case "JSON":
//         return (
//           <textarea
//             {...commonProps}
//             value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//             rows={6}
//             className={cn(inputClasses, "!h-auto font-mono text-sm")}
//             placeholder="Enter JSON..."
//           />
//         );

//       case "Code":
//         return (
//           <textarea
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//             rows={8}
//             className={cn(inputClasses, "!h-auto font-mono text-sm")}
//             placeholder={`Enter ${field.options || 'code'}...`}
//           />
//         );

//       // File Fields
//       case "Attach":
//         return (
//           <input
//             type="file"
//             className={`${inputClasses} !h-11 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:font-bold file:bg-stone-200 hover:file:bg-stone-300`}
//             onChange={e => onChange(field.fieldname, e.target.files?.[0] || value)}
//             disabled={field.read_only}
//           />
//         );

//       case "Attach Image":
//         return (
//           <div>
//             <input
//               type="file"
//               accept="image/*"
//               className={`${inputClasses} !h-11 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:font-bold file:bg-stone-200 hover:file:bg-stone-300`}
//               onChange={e => onChange(field.fieldname, e.target.files?.[0] || value)}
//               disabled={field.read_only}
//             />
//             {value && typeof value === 'string' && (
//               <img src={value} alt="preview" className="mt-4 max-h-40 rounded-md border border-gray-200" />
//             )}
//           </div>
//         );

//       case "Image":
//         return value && typeof value === 'string' ? (
//           <img src={value} alt={field.label} className="max-h-60 rounded-md border border-gray-200" />
//         ) : (
//           <div className="text-gray-500 italic">No image</div>
//         );

//       case "Signature":
//         return (
//           <div className="border border-gray-200 rounded-md p-4 bg-gray-50">
//             <input
//               type="file"
//               accept="image/*"
//               className={`${inputClasses} !h-11 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:font-bold file:bg-stone-200 hover:file:bg-stone-300`}
//               onChange={e => onChange(field.fieldname, e.target.files?.[0] || value)}
//               disabled={field.read_only}
//             />
//             {value && (
//               <div className="mt-3 text-sm text-gray-600">Signature uploaded</div>
//             )}
//           </div>
//         );

//       case "Barcode":
//         return (
//           <input
//             type="text"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//             placeholder="Barcode will be generated"
//           />
//         );

//       // Color Field
//       case "Color":
//         return (
//           <input
//             type="color"
//             {...commonProps}
//             value={value || '#000000'}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//             className="w-full h-12 border border-gray-200 rounded-md cursor-pointer"
//           />
//         );

//       // Rating Field
//       case "Rating":
//         const ratingCount = parseInt(field.options?.split('\n')[0] || '5');
//         return (
//           <div className="flex gap-2">
//             {Array.from({ length: ratingCount }, (_, i) => (
//               <button
//                 key={i}
//                 type="button"
//                 onClick={() => onChange(field.fieldname, i + 1)}
//                 className={cn("text-3xl transition-all", 
//                   i + 1 <= (value || 0) ? 'text-yellow-400' : 'text-gray-300'
//                 )}
//               >
//                 ★
//               </button>
//             ))}
//           </div>
//         );

//       // Read Only & Display Fields
//       case "Read Only":
//       case "HTML":
//         return (
//           <div className="p-4 bg-gray-50 border border-gray-200 rounded-md text-gray-700">
//             {field.fieldtype === "HTML" ? (
//               <div dangerouslySetInnerHTML={{ __html: field.options || value }} />
//             ) : (
//               value || 'N/A'
//             )}
//           </div>
//         );

//       case "Geolocation":
//         return (
//           <input
//             type="text"
//             {...commonProps}
//             value={typeof value === 'string' ? value : JSON.stringify(value)}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//             placeholder='GeoJSON (e.g., {"type":"Point","coordinates":[0,0]})'
//           />
//         );

//       // Default for unsupported field types
//       default:
//         return (
//           <input
//             type="text"
//             {...commonProps}
//             value={value || ''}
//             onChange={e => onChange(field.fieldname, e.target.value)}
//             placeholder={`${field.fieldtype} field`}
//           />
//         );
//     }
//   };

//   return (
//     <div className='space-y-2'>
//       <label htmlFor={field.fieldname} className="block font-bold text-black text-lg uppercase">
//         {field.label}
//         {field.mandatory && <span className="text-red-500">*</span>}
//       </label>
//       {renderInput()}
//       {field.description && (
//         <p className="text-sm text-gray-600 italic">{field.description}</p>
//       )}
//     </div>
//   );
// });

// // --- GENERIC TABLE COMPONENT ---
// const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
//   <NeoSection title={title}>
//     <div className="overflow-x-auto border border-gray-200 rounded-md">
//       <table className="min-w-full divide-y-2 divide-gray-100">
//         <thead className="bg-gray-50">
//           <tr className="divide-x-2 divide-gray-100">
//             {[...columns, { key: 'actions', label: '' }].map((c: any) => (
//               <th key={c.key} className="p-3 font-semibold text-gray-700 text-sm text-left text-sm">
//                 {c.label}
//               </th>
//             ))}
//           </tr>
//         </thead>
//         <tbody className="divide-y-2 divide-gray-100 bg-white">
//           {(tableData || []).map((row: any, i: number) => (
//             <tr key={row.id || i} className="divide-x-2 divide-gray-100">
//               {columns.map((col: any) => (
//                 <td key={col.key} className="p-2">
//                   {col.type === 'select' ? (
//                     <select
//                       className={`${inputClasses} !h-11`}
//                       value={row[col.key] || ''}
//                       onChange={e => onRowChange(tableName, i, col.key, e.target.value)}
//                     >
//                       <option value="">Select...</option>
//                       {col.options?.map((opt: string) => (
//                         <option key={opt} value={opt}>
//                           {opt}
//                         </option>
//                       ))}
//                     </select>
//                   ) : col.type === 'file' || col.type === 'Attach' ? (
//                     <input
//                       type="file"
//                       className={`${inputClasses} !h-11 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:font-bold file:bg-stone-200 hover:file:bg-stone-300`}
//                       onChange={e => onFileChange(tableName, i, col.key, e.target.files?.[0] || null)}
//                     />
//                   ) : col.type === 'number' || col.type === 'Currency' || col.type === 'Float' ? (
//                     <input
//                       type="number"
//                       step="0.01"
//                       className={`${inputClasses} !h-11`}
//                       value={row[col.key] || ''}
//                       onChange={e => onRowChange(tableName, i, col.key, e.target.value)}
//                     />
//                   ) : col.type === 'date' || col.type === 'Date' ? (
//                     <input
//                       type="date"
//                       className={`${inputClasses} !h-11`}
//                       value={row[col.key] || ''}
//                       onChange={e => onRowChange(tableName, i, col.key, e.target.value)}
//                     />
//                   ) : (
//                     <input
//                       type="text"
//                       className={`${inputClasses} !h-11`}
//                       value={row[col.key] || ''}
//                       onChange={e => onRowChange(tableName, i, col.key, e.target.value)}
//                     />
//                   )}
//                 </td>
//               ))}
//               <td className="p-2 text-center">
//                 <FrappeButton
//                   onClick={() => onDeleteRow(tableName, i)}
//                   className="!bg-red-200 hover:!bg-red-300 !py-2 text-sm"
//                 >
//                   Delete
//                 </FrappeButton>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//     <FrappeButton onClick={() => onAddRow(tableName, newRow)} className="bg-[#A5D6A7] mt-4">
//       Add Row
//     </FrappeButton>
//   </NeoSection>
// ));

// // --- UNIVERSAL FORM RENDERER ---
// export const FormRender: React.FC<UniversalFormProps> = ({
//   fields,
//   linkOptions,
//   initialData = {},
//   onSubmit,
//   submitButtonText = 'Submit',
//   title = 'Form',
//   sections,
//   isSubmitting = false,
//   customTableComponents = {},
// }) => {
//   const [formData, setFormData] = useState<FormData>(initialData);

//   useEffect(() => {
//     setFormData(initialData);
//   }, [initialData]);

//   const handleChange = useCallback((fieldname: string, value: any) => {
//     setFormData(prev => ({ ...prev, [fieldname]: value }));
//   }, []);

//   const handleTableRowChange = useCallback((tableName: string, rowIndex: number, fieldname: string, value: any) => {
//     setFormData(prev => {
//       const table = [...(prev[tableName] || [])];
//       table[rowIndex] = { ...table[rowIndex], [fieldname]: value };
//       return { ...prev, [tableName]: table };
//     });
//   }, []);

//   const handleFileChange = useCallback((tableName: string, rowIndex: number, fieldname: string, file: File | null) => {
//     setFormData(prev => {
//       const table = [...(prev[tableName] || [])];
//       table[rowIndex] = { ...table[rowIndex], [fieldname]: file };
//       return { ...prev, [tableName]: table };
//     });
//   }, []);

//   const addTableRow = useCallback((tableName: string, newRow: object) => {
//     const newId = Date.now().toString();
//     setFormData(prev => ({
//       ...prev,
//       [tableName]: [...(prev[tableName] || []), { ...newRow, id: newId }]
//     }));
//   }, []);

//   const deleteTableRow = useCallback((tableName: string, rowIndex: number) => {
//     setFormData(prev => ({
//       ...prev,
//       [tableName]: (prev[tableName] || []).filter((_: any, i: number) => i !== rowIndex)
//     }));
//   }, []);

//   const renderField = useCallback((fieldname: string) => {
//     const field = fields.find(f => f.fieldname === fieldname);
//     if (!field) return null;
//     return (
//       <MemoizedFormField
//         key={field.fieldname}
//         field={field}
//         value={formData[field.fieldname]}
//         options={linkOptions[field.fieldname]}
//         onChange={handleChange}
//       />
//     );
//   }, [fields, formData, linkOptions, handleChange]);

//   const handleSubmitClick = async () => {
//     await onSubmit(formData);
//   };

//   const renderSection = (section: SectionConfig, index: number) => {
//     if (section.type === 'table' && section.tableConfig) {
//       const CustomTable = customTableComponents[section.tableConfig.fieldname];
//       if (CustomTable) {
//         return (
//           <CustomTable
//             key={index}
//             formData={formData}
//             tableConfig={section.tableConfig}
//             onRowChange={handleTableRowChange}
//             onFileChange={handleFileChange}
//             onAddRow={addTableRow}
//             onDeleteRow={deleteTableRow}
//           />
//         );
//       }
//       return (
//         <MemoizedGenericTable
//           key={index}
//           title={section.title}
//           tableName={section.tableConfig.fieldname}
//           columns={section.tableConfig.columns}
//           newRow={section.tableConfig.newRowTemplate}
//           tableData={formData[section.tableConfig.fieldname]}
//           onRowChange={handleTableRowChange}
//           onFileChange={handleFileChange}
//           onAddRow={addTableRow}
//           onDeleteRow={deleteTableRow}
//         />
//       );
//     }

//     return (
//       <NeoSection key={index} title={section.title}>
//         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//           {section.fields.map(fieldname => renderField(fieldname))}
//         </div>
//       </NeoSection>
//     );
//   };

//   return (
//     <div>
//       <FrappeCard className="space-y-12">
//         {sections ? (
//           sections.map((section, index) => renderSection(section, index))
//         ) : (
//           <NeoSection title={title}>
//             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
//               {fields.map(field => renderField(field.fieldname))}
//             </div>
//           </NeoSection>
//         )}
//       </FrappeCard>
//       <div className="mt-8 flex justify-end">
//         <FrappeButton onClick={handleSubmitClick} disabled={isSubmitting} className="bg-green-300">
//           {isSubmitting ? 'Submitting...' : submitButtonText}
//         </FrappeButton>
//       </div>
//     </div>
//   );
// };

// export default FormRender;




// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-= new design



import React, { useState, useEffect, useCallback, memo } from 'react';
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
        {field.mandatory && <span className="text-red-500 ml-1">*</span>}
      </label>
      {renderInput()}
      {field.description && (
        <p className="text-sm text-gray-900 font-bold font-mono mt-1">{field.description}</p>
      )}
    </div>
  );
});

// --- GENERIC TABLE COMPONENT (REFINED STYLING) ---
const MemoizedGenericTable = memo(({ title, tableName, columns, newRow, tableData, onRowChange, onFileChange, onAddRow, onDeleteRow }: any) => (
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
                <td key={col.key} className="p-2">
                  <input type={col.type || 'text'} className={`${inputClasses} !h-11`} value={row[col.key] || ''} onChange={e => onRowChange(tableName, i, col.key, e.target.value)} />
                </td>
              ))}
              <td className="p-2 text-center">
                <FrappeButton onClick={() => onDeleteRow(tableName, i)} className="!py-2 text-sm bg-red-50 border-red-200 hover:bg-red-100 text-red-700">
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
));

// --- UNIVERSAL FORM RENDERER ---
export const FormRender: React.FC<UniversalFormProps> = ({
  fields,
  linkOptions,
  initialData = {},
  onSubmit,
  submitButtonText = 'Submit',
  title = 'Form',
  sections,
  isSubmitting = false,
  customTableComponents = {},
}) => {
  const [formData, setFormData] = useState<FormData>(initialData);

  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

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

  return (
    <div>
      <FrappeCard className="space-y-12">
        {sections ? (
          sections.map((section, index) => renderSection(section, index))
        ) : (
          <NeoSection title={title}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {fields.map(field => renderField(field.fieldname))}
            </div>
          </NeoSection>
        )}
      </FrappeCard>
      <div className="mt-8 flex justify-end">
        <FrappeButton onClick={handleSubmitClick} disabled={isSubmitting} className="bg-[#0EA5A4] text-white hover:bg-[#0D9494] border-[#0D9494]/20">
          {isSubmitting ? 'Submitting...' : submitButtonText}
        </FrappeButton>
      </div>
    </div>
  );
};

export default FormRender;