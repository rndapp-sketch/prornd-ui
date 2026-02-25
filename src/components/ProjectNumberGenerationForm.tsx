import React, { useState, useEffect } from 'react';
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { FrappeButton } from './ui/neo-brutalism';
import { DepartmentName } from './DepartmentName';

interface ProjectNumberGenerationFormProps {
    projectData: any;
    onSuccess?: () => void;
}

const InputField = ({ label, field, type = "text", options = [], formData, onChange }: any) => (
    <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</label>
        {type === 'select' ? (
            <select
                value={formData[field]}
                onChange={(e) => onChange(field, e.target.value)}
                className="w-full text-sm p-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/20 focus:border-[#0EA5A4]"
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
                className="w-full text-sm p-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/20 focus:border-[#0EA5A4]"
            />
        )}
    </div>
);

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

    useEffect(() => {
        if (projectData) {
            // Map Project Registration fields to Form fields
            const newFormData = { ...formData };

            // 1. Year: defaults to current year suffix, already set.

            // 2. Category: Default 'C' (Consultancy?) or map if available.
            // If project_type is Consultancy, maybe 'C'? User didn't specify mapping rules, so keeping default or user manual input.
            if (projectData.project_type === 'Consultancy' || projectData.project_type === 'Testing' || projectData.project_type === 'Training') {
                // Adjust logic if known. For now, let user select.
            }

            // 4. Department: Map from implementation_department or similar
            if (projectData.implementation_department) {
                // Find matching department to get ID if needed, or if implementation_department is the Link name
                newFormData.select_department = projectData.implementation_department;
            }

            // 6. Emp ID & Initial: From Coordinator/PI
            if (projectData.co_investigator_profile && projectData.co_investigator_profile.length > 0) {
                // Try to find PI
                const pi = projectData.co_investigator_profile.find((p: any) => p.role === 'Principal Investigator') || projectData.co_investigator_profile[0];
                if (pi) {
                    newFormData.emp_id = pi.employee_id || '';
                    // Initial calculation: Taking first letters? Or strictly from user profile? 
                    // The backend script does: emp_initial.toString().toUpperCase().padStart(4, 'x').slice(-4)
                    // We'll let user input/verify.
                }
            } else if (projectData.owner_details) {
                // Fallback to owner if available
                // newFormData.emp_id = ...
            }

            setFormData(newFormData);
        }
    }, [projectData]);

    // Update dept_initial when department changes
    useEffect(() => {
        if (formData.select_department && departmentData?.message) {
            const selectedDept = departmentData.message.find((d: any) => d.name === formData.select_department);
            if (selectedDept && selectedDept.dept_initials) {
                setFormData((prev: any) => ({ ...prev, dept_initial: selectedDept.dept_initials }));
            }
        }
    }, [formData.select_department, departmentData]);

    const handleChange = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        try {
            const response = await saveProjectNumber({
                data: formData,
                projrefno: projectData.name
            });
            if (response?.message?.status === 'success') {
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
            </div>
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                    <InputField label="Year (YY)" field="current_year1" formData={formData} onChange={handleChange} />
                    <InputField
                        label="Category"
                        field="category"
                        type="select"
                        options={[{ value: 'C', label: 'C' }, { value: 'R', label: 'R' }, { value: 'O', label: 'O' }]}
                        formData={formData} onChange={handleChange}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Department</label>
                    <select
                        value={formData.select_department}
                        onChange={(e) => handleChange('select_department', e.target.value)}
                        className="w-full text-sm p-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-900 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]/20 focus:border-[#0EA5A4]"
                    >
                        <option value="">Select Department</option>
                        {departmentData?.message?.map((dept: any) => (
                            <option key={dept.name} value={dept.name}>{dept.dept_name || dept.name}</option>
                        ))}
                    </select>
                    {formData.select_department && (
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 flex items-center gap-1">
                            Current: <DepartmentName name={formData.select_department} />
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <InputField label="Dept Initial" field="dept_initial" formData={formData} onChange={handleChange} />
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
                        formData={formData} onChange={handleChange}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <InputField label="Emp ID" field="emp_id" formData={formData} onChange={handleChange} />
                    <InputField label="Emp Initial" field="emp_initial" formData={formData} onChange={handleChange} />
                </div>

                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <InputField label="Project No (Auto/Manual)" field="project_no" formData={formData} onChange={handleChange} />
                </div>

                <FrappeButton
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className="w-full justify-center bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white"
                >
                    {isSaving ? "Generating..." : "Generate Project Number"}
                </FrappeButton>
            </div>
        </div>
    );
};
