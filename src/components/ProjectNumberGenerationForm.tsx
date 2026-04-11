import React, { useState, useEffect, useMemo } from 'react';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { FrappeButton } from './ui/neo-brutalism';
import { CheckCircle } from 'lucide-react';

interface ProjectNumberGenerationFormProps {
    projectData: any;
    onSuccess?: () => void;
}

const InputField = ({ label, field, type = "text", options = [], formData, onChange, disabled = false, maxLength }: any) => {
    const inputClasses = `w-full text-sm p-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#D97757]/20 focus:border-[#D97757] ${disabled ? 'opacity-60 bg-zinc-100 dark:bg-zinc-800 cursor-not-allowed' : ''}`;
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
                    type={type}
                    value={formData[field]}
                    onChange={(e) => onChange(field, e.target.value)}
                    className={inputClasses}
                    disabled={disabled}
                    readOnly={disabled}
                    maxLength={maxLength}
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

/**
 * Generate department initials from department name.
 * E.g. "Civil Engineering" -> "CE", "Computer Science and Engineering" -> "CSE"
 */
const getDeptInitial = (deptName: string): string => {
    if (!deptName) return '';
    const wordsToIgnore = ['and', 'of', '&', 'for', 'in', 'the'];
    const parts = deptName.trim().split(/\s+/).filter(w => !wordsToIgnore.includes(w.toLowerCase()));
    return parts.map(p => p.charAt(0).toUpperCase()).join('').substring(0, 4);
};

export const ProjectNumberGenerationForm: React.FC<ProjectNumberGenerationFormProps> = ({ projectData, onSuccess }) => {
    const [formData, setFormData] = useState<any>({
        current_year1: new Date().getFullYear().toString().slice(-2),
        category: 'C',
        project_no: '0',
        select_department: '',
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

    // Fetch Departments for the Link field
    const { data: departmentData } = useFrappeGetCall<{ message: any[] }>(
        'frappe.client.get_list',
        {
            doctype: 'Department_prornd',
            fields: ['name', 'dept_initials', 'dept_name'],
            limit_page_length: 100
        }
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
            current_year1: new Date().getFullYear().toString().slice(-2),
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

    // Update dept_initial when department changes (only if prefill hasn't set it)
    useEffect(() => {
        if (prefillApplied) return;
        if (formData.select_department && departmentData?.message) {
            const selectedDept = departmentData.message.find((d: any) => d.name === formData.select_department);
            if (selectedDept) {
                const initial = selectedDept.dept_initials || getDeptInitial(selectedDept.dept_name || selectedDept.name);
                setFormData((prev: any) => ({ ...prev, dept_initial: initial }));
            }
        }
    }, [formData.select_department, departmentData, prefillApplied]);

    // Live preview of assembled project number
    const previewProjectNumber = useMemo(() => {
        const { current_year1, category, dept_initial, project_type, emp_id, emp_initial, project_no } = formData;
        if (!current_year1 && !category && !dept_initial && !project_type && !emp_id && !emp_initial && !project_no) return '';
        return `${current_year1 || ''}${category || ''}${dept_initial || ''}${project_type || ''}${emp_id || ''}${emp_initial || ''}${project_no || ''}`;
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
                    <InputField label="Year (YY)" field="current_year1" formData={formData} onChange={handleChange} disabled={isReadOnly} />
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
                    <select
                        value={formData.select_department}
                        onChange={(e) => handleChange('select_department', e.target.value)}
                        className={`w-full text-sm p-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none opacity-60 cursor-not-allowed`}
                        disabled={true}
                    >
                        <option value="">Select Department</option>
                        {departmentData?.message?.map((dept: any) => (
                            <option key={dept.name} value={dept.name}>{dept.dept_name || dept.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <InputField label="Dept Initial" field="dept_initial" formData={formData} onChange={handleChange} disabled={true} />
                    <InputField
                        label="Project Type"
                        field="project_type"
                        type="select"
                        options={[
                            { value: 'SP', label: 'SP' },
                            { value: 'CN', label: 'CN' },
                            { value: 'OT', label: 'OT' },
                            { value: 'PD', label: 'PD' },
                            { value: 'TT', label: 'TT' }
                        ]}
                        formData={formData} onChange={handleChange} disabled={isReadOnly}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <InputField label="Emp ID" field="emp_id" formData={formData} onChange={handleChange} disabled={isReadOnly} />
                    <InputField label="Emp Initial" field="emp_initial" formData={formData} onChange={handleChange} disabled={isReadOnly} />
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                    <InputField label="Project No (Auto/Manual)" field="project_no" formData={formData} onChange={handleChange} disabled={isReadOnly} maxLength={22} />
                    {previewProjectNumber && (
                        <div className="p-2 rounded-md bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-0.5">Preview</p>
                            <p className="text-sm font-mono font-semibold text-[#D97757]">{previewProjectNumber}</p>
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
