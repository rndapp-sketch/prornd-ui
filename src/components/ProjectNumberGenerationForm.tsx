import React, { useState, useEffect, useMemo } from 'react';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { FrappeButton } from './ui/neo-brutalism';
import { CheckCircle } from 'lucide-react';

interface ProjectNumberGenerationFormProps {
    projectData: any;
    onSuccess?: () => void;
}

const InputField = ({ label, field, type = "text", options = [], formData, onChange, disabled = false, maxLength, fixedLength }: any) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const pendingCursor = React.useRef<number | null>(null);

    // Restore cursor after React re-renders the controlled input value
    React.useLayoutEffect(() => {
        if (pendingCursor.current !== null && inputRef.current) {
            inputRef.current.setSelectionRange(pendingCursor.current, pendingCursor.current);
            pendingCursor.current = null;
        }
    });

    const inputClasses = `w-full text-sm p-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] ${disabled ? 'opacity-60 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed' : ''}`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!fixedLength) {
            onChange(field, e.target.value);
            return;
        }
        const input = e.target;
        const rawCursor = input.selectionStart ?? input.value.length;
        const rawValue = input.value.toUpperCase();

        // Strip X placeholders so we can re-pad correctly, then count
        // how many X's appeared before the cursor to adjust it back
        const xsBeforeCursor = (rawValue.substring(0, rawCursor).match(/X/g) || []).length;
        const stripped = rawValue.replace(/X/g, '');
        const trimmed = stripped.substring(0, fixedLength);
        const padded = trimmed.padEnd(fixedLength, 'X');

        pendingCursor.current = Math.min(rawCursor - xsBeforeCursor, trimmed.length);
        onChange(field, padded);
    };

    return (
        <div className="space-y-1">
            <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
            {type === 'select' ? (
                <select
                    value={formData[field]}
                    onChange={(e) => onChange(field, e.target.value)}
                    className={inputClasses}
                    disabled={disabled}
                >
                    {options.map((opt: any) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
            ) : (
                <input
                    ref={inputRef}
                    type={type}
                    value={formData[field]}
                    onChange={handleChange}
                    className={inputClasses}
                    disabled={disabled}
                    readOnly={disabled}
                    maxLength={fixedLength ? undefined : maxLength}
                />
            )}
        </div>
    );
};

/**
 * Generate employee initials from full name.
 * Takes first letter of each name part, padded to 4 chars.
 * E.g. "Rahul Kumar Singh" -> "RKS" -> "xRKS"
 */
const getEmpInitial = (fullName: string): string => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    const initials = parts.map(p => p.charAt(0).toUpperCase()).join('');
    return initials.toUpperCase().padStart(4, 'x').slice(-4);
};


export const ProjectNumberGenerationForm: React.FC<ProjectNumberGenerationFormProps> = ({ projectData, onSuccess }) => {
    const currentYear = new Date().getFullYear();
    const fiscalYear = `${String(currentYear).slice(-2)}${String(currentYear + 1).slice(-2)}`;
    const [formData, setFormData] = useState<any>({
        current_year1: fiscalYear,
        category: 'C',
        project_no: '0',
        select_department: '',
        dept_name: '',
        dept_initial: '',
        project_type: 'SP',
        emp_id: '',
        emp_initial: ''
    });
    const [isGenerated, setIsGenerated] = useState(false);
    const [prefillApplied, setPrefillApplied] = useState(false);

    const { call: saveProjectNumber, loading: isSaving } = useFrappePostCall(
        "rndopsapp.rndopsapp.doctype.project_number_generation.project_number_generation.save_project_number_generation_data"
    );


    // Use a custom cache key containing the modified timestamp so it fetches absolutely fresh data
    const refreshKey = projectData?.name ? `project_number_gen_${projectData.name}_${projectData.modified || ''}` : null;
    const { data: prefillResponse, mutate: refreshPrefill } = useFrappeGetCall<{ message: any }>(
        'rndopsapp.rndopsapp.doctype.project_number_generation.project_number_generation.get_project_number_generation_fields',
        projectData?.name ? { doc_name: projectData.name } : undefined,
        refreshKey
    );
    console.log("prefillResponse", prefillResponse);

    // Reset prefill flag any time the project modified timestamp changes to allow fresh backend data
    useEffect(() => {
        if (projectData?.name) {
            setPrefillApplied(false);
            refreshPrefill(); // Force network refetch whenever the component mounts for this project
        }
    }, [projectData?.name, projectData?.modified, refreshPrefill]);
    // Check if project number is already generated
    const alreadyGenerated = useMemo(() => {
        if (!projectData) return false;
        return !!(projectData.project_no && projectData.project_no !== '0' && projectData.project_no.trim() !== '');
    }, [projectData]);

    const isReadOnly = isGenerated || alreadyGenerated;

    // Apply backend prefill first (takes priority over local computation)
    useEffect(() => {
        if (prefillApplied || !prefillResponse?.message?.prefill_data) return;
        const prefill = prefillResponse.message.prefill_data;
        setFormData((prev: any) => ({
            ...prev,
            ...(prefill.current_year1 && { current_year1: prefill.current_year1 }),
            ...(prefill.category && { category: prefill.category }),
            ...(prefill.project_no && { project_no: prefill.project_no }),
            ...(prefill.select_department && { select_department: prefill.select_department }),
            ...(prefill.dept_name && { dept_name: prefill.dept_name }),
            ...(prefill.dept_initial && { dept_initial: prefill.dept_initial }),
            ...(prefill.project_type && { project_type: prefill.project_type }),
            ...(prefill.emp_id && { emp_id: prefill.emp_id }),
            ...(prefill.emp_initial && { emp_initial: prefill.emp_initial }),
        }));
        setPrefillApplied(true);
    }, [prefillResponse, prefillApplied]);

    // Fallback local prefill from projectData (only if backend prefill hasn't applied)
    useEffect(() => {
        if (prefillApplied || !projectData) return;
        const newFormData: any = {
            current_year1: fiscalYear,
            category: 'C',
            project_no: '0',
            select_department: '',
            dept_initial: '',
            project_type: 'SP',
            emp_id: '',
            emp_initial: ''
        };

        // Category: map from project_type
        if (projectData.project_type === 'Consultancy') {
            newFormData.category = 'C';
        } else if (projectData.project_type === 'Research') {
            newFormData.category = 'R';
        } else {
            newFormData.category = 'O';
        }

        // Department
        if (projectData.implementation_department) {
            newFormData.select_department = projectData.implementation_department;
        }

        // Emp ID: from PI employee ID
        if (projectData.pi_employee_id) {
            newFormData.emp_id = projectData.pi_employee_id;
        }

        // Emp Initial: calculated from PI name
        if (projectData.principal_investigator_name) {
            newFormData.emp_initial = getEmpInitial(projectData.principal_investigator_name);
        }

        // Project No: from existing project_no if available
        if (projectData.project_no && projectData.project_no !== '0') {
            newFormData.project_no = projectData.project_no;
        }

        // Project Type mapping
        if (projectData.project_type === 'Research') {
            newFormData.project_type = 'SP';
        } else if (projectData.project_type === 'Consultancy') {
            newFormData.project_type = 'CN';
        } else if (projectData.project_type === 'Testing') {
            newFormData.project_type = 'TT';
        }

        setFormData(newFormData);
    }, [projectData, prefillApplied]);


    // Live preview — always computed from current formData so it reacts to field changes
    const previewSegments = useMemo(() => {
        const { current_year1, category, dept_initial, emp_id, emp_initial, project_no } = formData;
        const part1 = `${current_year1 || ''}${category || ''}`;
        const part2 = project_no || '';
        const part3 = `${dept_initial || ''}${emp_id || ''}${emp_initial || ''}`;
        return { part1, part2, part3, full: [part1, part2, part3].filter(Boolean).join('-') };
    }, [formData]);

    const handleChange = (field: string, value: any) => {
        if (isReadOnly) return;
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };


    const handleSubmit = async () => {
        if (isReadOnly) return;
        try {
            const response = await saveProjectNumber({
                data: formData,
                projrefno: projectData.name
            });
            if (response?.message?.status === 'success') {
                setIsGenerated(true);
                alert("Project Number Generated Successfully");
                if (onSuccess) onSuccess();
            } else {
                alert(response?.message?.message || "Failed to save");
            }
        } catch (error: any) {
            console.error("Error saving project number:", error);
            alert(error.message || "An error occurred");
        }
    };

    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-between">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Project Number Generation</h3>
                {isReadOnly && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Generated
                    </span>
                )}
            </div>
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <InputField label="Year (YY)" field="current_year1" formData={formData} onChange={handleChange} disabled={isReadOnly} fixedLength={4} />
                    <InputField
                        label="Category"
                        field="category"
                        type="select"
                        options={[{ value: 'C', label: 'C' }, { value: 'R', label: 'R' }, { value: 'O', label: 'O' }]}
                        formData={formData} onChange={handleChange} disabled={isReadOnly}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Department</label>
                    <input
                        type="text"
                        value={formData.dept_name || ''}
                        readOnly
                        className="w-full text-sm p-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 opacity-60 cursor-not-allowed"
                    />
                </div>

                <div>
                    <InputField label="Dept Initial" field="dept_initial" formData={formData} onChange={handleChange} disabled={true} fixedLength={4} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <InputField label="Emp ID" field="emp_id" formData={formData} onChange={handleChange} disabled={isReadOnly} fixedLength={4} />
                    <InputField label="Emp Initial" field="emp_initial" formData={formData} onChange={handleChange} disabled={isReadOnly} fixedLength={4} />
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                    <InputField label="Project No." field="project_no" formData={formData} onChange={handleChange} disabled={isReadOnly} fixedLength={4} />
                    {previewSegments.full && (
                        <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">Preview</p>
                            <p className="font-mono font-bold text-base tracking-wide">
                                <span className="text-[#D97757]">{previewSegments.part1}</span>
                                <span className="text-zinc-400 dark:text-zinc-500">-</span>
                                <span className="text-[#D97757]">{previewSegments.part2}</span>
                                <span className="text-zinc-400 dark:text-zinc-500">-</span>
                                <span className="text-[#D97757]">{previewSegments.part3}</span>
                            </p>
                        </div>
                    )}
                </div>

                {!isReadOnly && (
                    <FrappeButton
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="w-full justify-center bg-[#D97757] hover:bg-[#D97757] text-white"
                    >
                        {isSaving ? "Generating..." : "Generate Project Number"}
                    </FrappeButton>
                )}
            </div>
        </div>
    );
};
