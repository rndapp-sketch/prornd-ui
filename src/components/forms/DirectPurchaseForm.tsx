/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, UploadCloud } from 'lucide-react';

// --- Types ---

export type FieldType = "Data" | "Select" | "Attach" | "Table" | "Section Break" | "Column Break" | "Currency" | "Int" | "Float" | "Text" | "Check";

export interface LinkOption {
    value: string;
    label: string;
    [key: string]: any; // Additional metadata
}

export interface FieldDefinition {
    fieldname: string;
    label: string;
    fieldtype: FieldType;
    reqd?: boolean | number;
    hidden?: boolean | number;
    options?: string; // For multiline selects if not in link_options (e.g., "Option 1\nOption 2")
    read_only?: boolean | number;
    fields?: FieldDefinition[]; // For table columns
}

export interface DirectPurchasePayload {
    fields: FieldDefinition[];
    prefill_data: Record<string, any>;
    link_options: Record<string, LinkOption[]>;
    computation_rules?: any;
}

export interface DirectPurchaseFormProps {
    payload: DirectPurchasePayload;
    onSubmit: (data: any) => void;
    onCancel?: () => void;
}

// --- Helper Functions ---

const generateId = () => Math.random().toString(36).substr(2, 9);

const parseOptions = (optionsStr?: string): LinkOption[] => {
    if (!optionsStr) return [];
    return optionsStr.split('\n').filter(Boolean).map(opt => ({ value: opt, label: opt }));
};

const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

// --- Main Component ---

export const DirectPurchaseForm: React.FC<DirectPurchaseFormProps> = ({ payload, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState<Record<string, any>>(payload.prefill_data || {});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [fileData, setFileData] = useState<Record<string, { file: File, base64: string }>>({});



    // --- Handlers ---

    const handleFieldChange = useCallback((fieldname: string, value: any) => {
        setFormData(prev => {
            const newData = { ...prev, [fieldname]: value };

            // Auto-population logic for generic parent fields
            if (fieldname === 'register_for' || fieldname === 'applying_for_name') {
                const registerFor = fieldname === 'register_for' ? value : prev['register_for'];
                const applyingFor = fieldname === 'applying_for_name' ? value : prev['applying_for_name'];

                if (registerFor === 'Other' && applyingFor) {
                    const match = payload.link_options['applying_for_name']?.find(opt => opt.value === applyingFor);
                    if (match) {
                        newData['department'] = match.department || newData['department'];
                        newData['designation'] = match.designation || newData['designation'];
                    }
                }
            }

            return newData;
        });
    }, [payload.link_options]);

    const handleFileChange = useCallback(async (fieldname: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            try {
                const base64 = await getBase64(file);
                setFileData(prev => ({ ...prev, [fieldname]: { file, base64 } }));
                handleFieldChange(fieldname, base64); // Also store string in form data as attachment indicator
            } catch (err) {
                console.error("File reading error", err);
            }
        }
    }, [handleFieldChange]);

    const handleTableRowChange = useCallback((tablename: string, rowIndex: number, fieldname: string, value: any) => {
        setFormData(prev => {
            const tableRows = [...(prev[tablename] || [])];
            if (!tableRows[rowIndex]) return prev;

            const updatedRow = { ...tableRows[rowIndex], [fieldname]: value };

            // table_gdxp specific row computation
            if (tablename === 'table_gdxp') {
                if (fieldname === 'quantity' || fieldname === 'estimatedprice') {
                    const qty = Number(updatedRow.quantity) || 0;
                    const price = Number(updatedRow.estimatedprice) || 0;
                    updatedRow.estimated_amount_total_price_in_rs = qty * price;
                }
            }

            // table_teqd specific auto-population
            if (tablename === 'table_teqd' && fieldname === 'webmail_id') {
                const options = payload.link_options['webmail_id'] || [];
                const match = options.find(opt => opt.value === value);
                if (match) {
                    updatedRow.pc_name = match.full_name || match.label;
                    updatedRow.designation = match.designation_name;
                }
            }

            tableRows[rowIndex] = updatedRow;
            return { ...prev, [tablename]: tableRows };
        });
    }, [payload.link_options]);

    const handleAddRow = useCallback((tablename: string, count = 1) => {
        setFormData(prev => {
            const tableRows = [...(prev[tablename] || [])];
            for (let i = 0; i < count; i++) {
                tableRows.push({ _id: generateId() });
            }
            return { ...prev, [tablename]: tableRows };
        });
    }, []);

    const handleRemoveRow = useCallback((tablename: string, rowIndex: number) => {
        setFormData(prev => {
            const tableRows = [...(prev[tablename] || [])];
            tableRows.splice(rowIndex, 1);
            return { ...prev, [tablename]: tableRows };
        });
    }, []);

    // --- Effects for Global Computations & Visibility ---

    // Total Estimate Computation
    useEffect(() => {
        const tableGdxp = formData['table_gdxp'] || [];
        const totalEstimate = tableGdxp.reduce((acc: number, row: any) => acc + (Number(row.estimated_amount_total_price_in_rs) || 0), 0);

        if (formData['total_estimate'] !== totalEstimate) {
            setFormData(prev => ({ ...prev, total_estimate: totalEstimate }));
        }
    }, [formData['table_gdxp']]);

    // Conditional Purchase Committee (table_teqd) Visibility & Row Management
    useEffect(() => {
        const totalEstimate = Number(formData['total_estimate']) || 0;
        const isPcVisible = totalEstimate > 200000;

        setFormData(prev => {
            const newData = { ...prev };
            const currentRows = newData['table_teqd'] || [];

            if (isPcVisible) {
                if (currentRows.length === 0) {
                    // Add 3 empty rows when it becomes visible per requirement
                    newData['table_teqd'] = [
                        { _id: generateId() },
                        { _id: generateId() },
                        { _id: generateId() }
                    ];
                }
            } else {
                if (currentRows.length > 0) {
                    // Clear out existing rows to prevent saving stale data
                    newData['table_teqd'] = [];
                }
            }
            return newData;
        });
    }, [formData['total_estimate']]);


    // --- Validation and Submit ---

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: Record<string, string> = {};

        // Basic required fields validation based on standard metadata
        payload.fields.forEach(f => {
            if (!['Section Break', 'Column Break'].includes(f.fieldtype) && !f.hidden && f.reqd && !formData[f.fieldname]) {
                newErrors[f.fieldname] = `This field is required.`;
            }
        });

        // Specific Form Validation for Purchase Committee
        const totalEstimate = Number(formData['total_estimate']) || 0;
        if (totalEstimate > 200000) {
            const pcRows = formData['table_teqd'] || [];
            const completeRows = pcRows.filter((row: any) => row.webmail_id && row.pc_name);
            if (completeRows.length < 3) {
                newErrors['table_teqd'] = 'Purchase Committee requires at least 3 completely filled members when Total Estimate > 200000.';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // Strip hidden fields before dispatching (if required)
        const finalPayload = { ...formData };
        payload.fields.forEach(f => {
            // Check conditional hidden if applicable. We are doing standard hidden property right now.
            if (f.hidden) {
                delete finalPayload[f.fieldname];
            }
        });

        // Do not submit table_teqd if total estimate <= 200000
        if (totalEstimate <= 200000) {
            finalPayload['table_teqd'] = [];
        }

        // Final cleanup of internal react unique identifiers
        const cleanedPayload = JSON.parse(JSON.stringify(finalPayload));
        Object.keys(cleanedPayload).forEach(key => {
            if (Array.isArray(cleanedPayload[key])) {
                cleanedPayload[key] = cleanedPayload[key].map((row: any) => {
                    const { _id, ...rest } = row;
                    return rest;
                });
            }
        });

        onSubmit(cleanedPayload);
    };

    // --- Renderers ---

    const renderField = (field: FieldDefinition, value: any, onChange: (val: any) => void) => {
        if (field.hidden) return null;

        const options = payload.link_options[field.fieldname] || parseOptions(field.options);

        switch (field.fieldtype) {
            case 'Data':
            case 'Int':
            case 'Float':
            case 'Currency':
            case 'Text':
                return (
                    <div className="flex flex-col gap-2" key={field.fieldname}>
                        <Label htmlFor={field.fieldname} className="text-sm font-medium">{field.label} {field.reqd && <span className="text-red-500">*</span>}</Label>
                        <Input
                            id={field.fieldname}
                            readOnly={!!field.read_only}
                            type={['Int', 'Float', 'Currency'].includes(field.fieldtype) ? 'number' : 'text'}
                            value={value || ''}
                            onChange={(e) => onChange(e.target.value)}
                            className={errors[field.fieldname] ? 'border-red-500' : ''}
                        />
                        {errors[field.fieldname] && <span className="text-xs text-red-500">{errors[field.fieldname]}</span>}
                    </div>
                );

            case 'Select':
                return (
                    <div className="flex flex-col gap-2" key={field.fieldname}>
                        <Label htmlFor={field.fieldname} className="text-sm font-medium">{field.label} {field.reqd && <span className="text-red-500">*</span>}</Label>
                        <Select
                            value={value || ''}
                            onValueChange={onChange}
                            disabled={!!field.read_only}
                        >
                            <SelectTrigger className={errors[field.fieldname] ? 'border-red-500' : ''}>
                                <SelectValue placeholder={`Select ${field.label}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map((opt, i) => (
                                    <SelectItem key={i} value={opt.value}>
                                        {opt.label || opt.value}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors[field.fieldname] && <span className="text-xs text-red-500">{errors[field.fieldname]}</span>}
                    </div>
                );

            case 'Attach':
                return (
                    <div className="flex flex-col gap-2" key={field.fieldname}>
                        <Label htmlFor={field.fieldname} className="text-sm font-medium">{field.label} {field.reqd && <span className="text-red-500">*</span>}</Label>
                        <div className="flex items-center gap-4">
                            <Button type="button" variant="outline" className="relative cursor-pointer">
                                <UploadCloud className="mr-2 h-4 w-4" />
                                Upload File
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => handleFileChange(field.fieldname, e)}
                                    disabled={!!field.read_only}
                                />
                            </Button>
                            {fileData[field.fieldname]?.file && (
                                <span className="text-sm text-gray-600 font-medium">
                                    {fileData[field.fieldname].file.name}
                                </span>
                            )}
                        </div>
                    </div>
                );

            case 'Check':
                return (
                    <div className="flex items-center gap-2 mt-6" key={field.fieldname}>
                        <input
                            type="checkbox"
                            id={field.fieldname}
                            checked={!!value}
                            onChange={(e) => onChange(e.target.checked)}
                            disabled={!!field.read_only}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <Label htmlFor={field.fieldname} className="text-sm font-medium cursor-pointer">{field.label}</Label>
                    </div>
                );

            default:
                return null;
        }
    };

    const renderTable = (field: FieldDefinition) => {
        // Visibility constraint explicitly for table_teqd
        if (field.fieldname === 'table_teqd' && (Number(formData['total_estimate']) || 0) <= 200000) {
            return null;
        }

        const columns = field.fields || [];
        const rows = formData[field.fieldname] || [];

        return (
            <div key={field.fieldname} className="my-8 w-full border rounded-lg overflow-hidden bg-white shadow-sm">
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-lg">{field.label}</h3>
                    {!field.read_only && (
                        <Button type="button" variant="outline" size="sm" onClick={() => handleAddRow(field.fieldname)}>
                            <Plus className="mr-2 h-4 w-4" /> Add Row
                        </Button>
                    )}
                </div>

                {errors[field.fieldname] && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm border-b font-medium">
                        {errors[field.fieldname]}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map(col => (
                                    <TableHead key={col.fieldname} className="min-w-[150px]">{col.label}</TableHead>
                                ))}
                                {!field.read_only && <TableHead className="w-[80px]">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {rows.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={columns.length + 1} className="text-center py-6 text-gray-500">
                                        No items added. Click 'Add Row' to begin.
                                    </TableCell>
                                </TableRow>
                            ) : rows.map((row: any, rowIndex: number) => (
                                <TableRow key={row._id || rowIndex}>
                                    {columns.map(col => (
                                        <TableCell key={col.fieldname} className="align-top py-3">
                                            {renderField(
                                                { ...col, label: '' }, // Hide label inside table cells
                                                row[col.fieldname],
                                                (val) => handleTableRowChange(field.fieldname, rowIndex, col.fieldname, val)
                                            )}
                                        </TableCell>
                                    ))}
                                    {!field.read_only && (
                                        <TableCell className="align-top py-3">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleRemoveRow(field.fieldname, rowIndex)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </div>
        );
    };

    // --- Layout Render ---

    // Build a basic layout engine supporting sections
    const sections: { title: string; elements: React.ReactNode[] }[] = [];
    let currentSectionTitle = 'General Details';
    let currentSectionElements: React.ReactNode[] = [];

    payload.fields.forEach(field => {
        if (field.fieldtype === 'Section Break') {
            if (currentSectionElements.length > 0) {
                sections.push({ title: currentSectionTitle, elements: currentSectionElements });
            }
            currentSectionTitle = field.label || 'Details';
            currentSectionElements = [];
        } else if (field.fieldtype === 'Table') {
            currentSectionElements.push(renderTable(field));
        } else if (field.fieldtype !== 'Column Break') {
            currentSectionElements.push(
                renderField(field, formData[field.fieldname], (val) => handleFieldChange(field.fieldname, val))
            );
        }
    });

    if (currentSectionElements.length > 0) {
        sections.push({ title: currentSectionTitle, elements: currentSectionElements });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
            {sections.map((section, idx) => (
                <Card key={idx} className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50 border-b">
                        <CardTitle className="text-xl font-semibold text-slate-800">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-start">
                            {section.elements.map((el, i) => (
                                <div key={i} className={React.isValidElement(el) && el.type === 'div' && (el.props as any).className?.includes('my-8') ? 'col-span-1 md:col-span-2' : ''}>
                                    {el}
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            ))}

            <div className="sticky bottom-0 bg-white/80 backdrop-blur-md p-4 border-t flex justify-end gap-3 z-10 shadow-lg">
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel} className="w-32">
                        Cancel
                    </Button>
                )}
                <Button type="submit" className="w-40 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                    Submit Purchase
                </Button>
            </div>
        </form>
    );
};
