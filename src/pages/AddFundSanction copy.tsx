
//  error hiding tables




import React, { useState, useEffect, useRef, type JSX } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AppSidebar } from "../components/RndSidebar";
import useUserRoleCheck from "../components/UserRoleCheck";
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk';
import { useFrappeGetDoc } from 'frappe-react-sdk'; // <-- IMPORT THIS
import { ArrowLeftIcon } from "lucide-react";

import { cn } from '@/lib/utils';

interface Field {
    fieldname: string;
    label: string;
    fieldtype: string;
    default?: any;
    mandatory: boolean;
    read_only: boolean;
    hidden: boolean;
    description?: string;
    options?: string;
}

interface LinkOption {
    value: string;
    label: string;
}

interface FundSanctionFormResponse {
    message: {
        fields: Field[];
        link_options: { [key: string]: LinkOption[] };
    }
}

const AddFundSanction: React.FC = () => {
    const [fields, setFields] = useState<Field[]>([]);
    const [linkOptions, setLinkOptions] = useState<{ [key: string]: LinkOption[] }>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isPermanentEmployee = useUserRoleCheck();
    const stableArgs = React.useMemo(() => ({}), []);

    // Use refs to store table rows - this doesn't trigger re-render
    const tableRowsRef = useRef({
        sanctioned_budget_breakup: [] as string[],
        sanction_related_files: [] as string[],
        fund_transactions: [] as string[],
        received_amount_breakup: [] as string[]
    });

    const navigate = useNavigate();
    
    // 1. Get the project name from the URL
    const { projectName } = useParams<{ projectName: string }>();

    // 2. Fetch the project's data using the project name
    // This defines the 'data' variable that was previously causing the error
    const { data, isLoading, error } = useFrappeGetDoc(
        "Project Registration",
        projectName ?? "",
        { enabled: !!projectName } 
    );
    

    const containerRef = useRef<{ [key: string]: HTMLElement | null }>({});
    const forceUpdateRef = useRef(0);
    const [, setForceUpdate] = useState(0);

    const { data: formData, error: formError } = useFrappeGetCall<FundSanctionFormResponse>(
        'rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.get_fund_sanction_form_data',
        stableArgs,
        undefined,
        { revalidateOnFocus: false, revalidateIfStale: false }
    );

    useEffect(() => {
        if (formData?.message) {
            setFields(formData.message.fields || []);
            setLinkOptions(formData.message.link_options || {});
            setLoading(false);
        }
    }, [formData]);

    useEffect(() => {
        if (formError) {
            console.error('Error loading form data:', formError);
            setLoading(false);
        }
    }, [formError]);

    const { call: submitForm, result: submitResult, error: submitError } = useFrappePostCall('rndopsapp.rndopsapp.doctype.fund_sanction.fund_sanction.save_fund_sanction_data');

    useEffect(() => {
        if (submitResult) {
            alert('Fund Sanction submitted successfully!');
            setIsSubmitting(false);
        }
        if (submitError) {
            alert(`Submission error: ${submitError.message}`);
            setIsSubmitting(false);
        }
    }, [submitResult, submitError]);

    const generateId = () => `row_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const addTableRow = (tableName: keyof typeof tableRowsRef.current) => {
    tableRowsRef.current[tableName].push(generateId());
    renderTableRows(tableName);
};
const removeTableRow = (tableName: keyof typeof tableRowsRef.current, id: string) => {
    tableRowsRef.current[tableName] = tableRowsRef.current[tableName].filter(rowId => rowId !== id);
    const row = containerRef.current[tableName]?.querySelector(`[data-id="${id}"]`)?.closest('tr');
    if (row) row.remove();

    // Reindex remaining rows (optional)
    const allRows = containerRef.current[tableName]?.querySelectorAll('tr');
    allRows?.forEach((tr, i) => {
        const firstCell = tr.querySelector('td');
        if (firstCell) firstCell.textContent = String(i + 1);
    });
};
const renderTableRows = (tableName: keyof typeof tableRowsRef.current) => {
    const container = containerRef.current[tableName];
    if (!container) return;

    // Clear "no data" placeholder row if present
    const placeholder = container.querySelector('.no-data-row');
    if (placeholder) placeholder.remove();

    const rows = tableRowsRef.current[tableName];
    const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]";

    // Get the last added rowId (only render that)
    const rowId = rows[rows.length - 1];
    if (!rowId) return;

    let newRow = document.createElement("tr");
    const index = rows.length;

    if (tableName === 'sanctioned_budget_breakup') {
        newRow.innerHTML = `
            <td class="border-2 border-black p-2">${index}</td>
            <td class="border-2 border-black p-2"><input type="text" name="sanctioned_account_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="sanctioned_year1_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="sanctioned_year2_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="sanctioned_year3_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="sanctioned_year4_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="sanctioned_year5_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2 bg-gray-100 font-bold">₹ 0</td>
            <td class="border-2 border-black p-2">
                <button type="button" class="text-red-600 font-bold delete-btn" data-table="${tableName}" data-id="${rowId}">X</button>
            </td>
        `;
    } else if (tableName === 'sanction_related_files') {
        newRow.innerHTML = `
            <td class="border-2 border-black p-2">${index}</td>
            <td class="border-2 border-black p-2"><input type="file" name="file_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="text" name="file_desc_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2">
                <button type="button" class="text-red-600 font-bold delete-btn" data-table="${tableName}" data-id="${rowId}">X</button>
            </td>
        `;
    } else if (tableName === 'fund_transactions') {
        newRow.innerHTML = `
            <td class="border-2 border-black p-2">${index}</td>
            <td class="border-2 border-black p-2"><input type="text" name="fund_trans_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="date" name="fund_date_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="fund_amount_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2">
                <button type="button" class="text-red-600 font-bold delete-btn" data-table="${tableName}" data-id="${rowId}">X</button>
            </td>
        `;
    } else if (tableName === 'received_amount_breakup') {
        newRow.innerHTML = `
            <td class="border-2 border-black p-2">${index}</td>
            <td class="border-2 border-black p-2"><input type="text" name="received_account_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="number" name="received_amount_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="text" name="received_year_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2"><input type="text" name="received_remarks_${rowId}" class="${inputClasses}" /></td>
            <td class="border-2 border-black p-2">
                <button type="button" class="text-red-600 font-bold delete-btn" data-table="${tableName}" data-id="${rowId}">X</button>
            </td>
        `;
    }

    // Append only the new row
    container.appendChild(newRow);

    // Attach delete button
    const delBtn = newRow.querySelector('.delete-btn');
    if (delBtn) {
        delBtn.addEventListener('click', () => {
            removeTableRow(tableName, rowId);
        });
    }
};


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const formElement = e.currentTarget;
            const formData = new FormData(formElement);

            // Get table data
            const sanctionedBudgetData = tableRowsRef.current.sanctioned_budget_breakup.map(rowId => {
                const year1 = (formData.get(`sanctioned_year1_${rowId}`) as string) || '';
                const year2 = (formData.get(`sanctioned_year2_${rowId}`) as string) || '';
                const year3 = (formData.get(`sanctioned_year3_${rowId}`) as string) || '';
                const year4 = (formData.get(`sanctioned_year4_${rowId}`) as string) || '';
                const year5 = (formData.get(`sanctioned_year5_${rowId}`) as string) || '';
                return {
                    account_head: formData.get(`sanctioned_account_${rowId}`),
                    year1: year1 ? Number(year1) : undefined,
                    year2: year2 ? Number(year2) : undefined,
                    year3: year3 ? Number(year3) : undefined,
                    year4: year4 ? Number(year4) : undefined,
                    year5: year5 ? Number(year5) : undefined,
                };
            });

            const fundTransactionData = tableRowsRef.current.fund_transactions.map(rowId => ({
                transaction_number: formData.get(`fund_trans_${rowId}`),
                date: formData.get(`fund_date_${rowId}`),
                amount: formData.get(`fund_amount_${rowId}`) ? Number(formData.get(`fund_amount_${rowId}`)) : undefined,
            }));

            const receivedAmountData = tableRowsRef.current.received_amount_breakup.map(rowId => ({
                account_head: formData.get(`received_account_${rowId}`),
                amount_received: formData.get(`received_amount_${rowId}`) ? Number(formData.get(`received_amount_${rowId}`)) : undefined,
                budget_year: formData.get(`received_year_${rowId}`),
                remarks: formData.get(`received_remarks_${rowId}`),
            }));

            const fileMetadata: { description: string }[] = [];
            const filesData: { [key: string]: any } = {};
            tableRowsRef.current.sanction_related_files.forEach((rowId, index) => {
                const file = (formData.get(`file_${rowId}`) as File) || null;
                const desc = formData.get(`file_desc_${rowId}`);
                if (file) {
                    filesData[`file_${index}`] = file;
                }
                fileMetadata.push({ description: desc as string });
            });

            const submitData: { [key: string]: any } = {};
            
            fields.forEach(field => {
                if (field.fieldtype !== 'Table') {
                    submitData[field.fieldname] = formData.get(field.fieldname);
                }
            });

            submitData.sanctioned_budget_breakup = JSON.stringify(sanctionedBudgetData);
            submitData.fund_transactions = JSON.stringify(fundTransactionData);
            submitData.received_amount_breakup = JSON.stringify(receivedAmountData);
            submitData.sanction_related_files_meta = JSON.stringify(fileMetadata);

            const finalFormData = new FormData();
            Object.entries(submitData).forEach(([key, value]) => {
                finalFormData.append(key, String(value));
            });
            Object.entries(filesData).forEach(([key, file]) => {
                finalFormData.append(key, file);
            });

const submitObject: { [key: string]: any } = {};
finalFormData.forEach((value, key) => {
    submitObject[key] = value;
});

// ✅ Log before submitting
console.group("🚀 Fund Sanction Form Data Preview");
console.log("Submit Object:", submitObject);
console.log("Table Data:", {
    sanctionedBudgetData,
    fundTransactionData,
    receivedAmountData,
    fileMetadata,
});
console.groupEnd();
            await submitForm({ form_data: submitObject });
        } catch (error) {
            console.error('Submission error:', error);
            setIsSubmitting(false);
        }
    };

const renderFormField = (field: Field) => {
  // Skip rendering input if field is hidden
  if (field.hidden) return null;

  const inputClasses =
    "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE] disabled:opacity-70 disabled:bg-gray-200";

  switch (field.fieldtype) {
    case "Link":
      return (
        <select
          name={field.fieldname}
          className={inputClasses}
          required={field.mandatory}
          disabled={field.read_only}
          defaultValue={field.default || ""}
        >
          {(linkOptions[field.fieldname] || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );

    case "Date":
      return (
        <input
          type="date"
          name={field.fieldname}
          className={inputClasses}
          required={field.mandatory}
          disabled={field.read_only}
          defaultValue={field.default || ""}
        />
      );

    case "Currency":
    case "Float":
    case "Int":
      return (
        <input
          type="number"
          name={field.fieldname}
          className={inputClasses}
          required={field.mandatory}
          disabled={field.read_only}
          defaultValue={field.default || ""}
          step={field.fieldtype === "Int" ? "1" : "0.01"}
        />
      );

    case "Select":
      return (
        <select
          name={field.fieldname}
          className={inputClasses}
          required={field.mandatory}
          disabled={field.read_only}
          defaultValue={field.default || ""}
        >
          {field.options
            ?.split("\n")
            .filter((opt) => opt.trim() !== "")
            .map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
        </select>
      );

    case "Text Editor":
    case "Text":
      return (
        <textarea
          name={field.fieldname}
          className="w-full min-h-[100px] px-4 py-3 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]"
          required={field.mandatory}
          disabled={field.read_only}
          defaultValue={field.default || ""}
        />
      );

    default:
      return (
        <input
          type="text"
          name={field.fieldname}
          className={inputClasses}
          required={field.mandatory}
          disabled={field.read_only}
          defaultValue={field.default || ""}
        />
      );
  }
};







    const mainFormFields = fields.filter(field => field.fieldtype !== 'Table');
    const inputClasses = "w-full h-12 px-4 bg-white border-2 border-black rounded-md font-mono shadow-[2px_2px_0px_rgba(0,0,0,0.25)] focus:outline-none focus:ring-2 focus:ring-[#90A4AE]";

    const NeoButton = ({ children, onClick, disabled, type = "button" }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; type?: "button" | "submit" }) => (
        <button 
            type={type}
            onClick={onClick}
            disabled={disabled}
            className="px-5 py-3 border-2 border-black rounded-md font-semibold text-black shadow-[2px_2px_0px_rgba(0,0,0,0.25)] transition-all hover:shadow-[1px_1px_0px_rgba(0,0,0,0.25)] hover:translate-x-[1px] hover:translate-y-[1px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50"
        >
            {children}
        </button>
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC]">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#90A4AE]"></div>
                    <p className="mt-4 text-2xl font-bold">LOADING FORM...</p>
                </div>
            </div>
        );
    }

    if (formError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FDFCEC] p-4">
                <div className="text-center p-4 max-w-2xl">
                    <p className="text-2xl font-bold text-red-600">Error Loading Form</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FDFCEC]">
            <AppSidebar isPermanentEmployee={!!isPermanentEmployee} />
            <main className="flex-1 p-4 md:p-8 w-full overflow-hidden bg-[#FDFCEC]">
               {/* --- PROJECT CONTEXT HEADER --- */}
                <header className="mb-8 p-4 bg-white border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                    <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                // This is the key change: navigate(-1) goes to the previous page in history
                                onClick={() => navigate(-1)}
                                className="p-3 bg-white border-2 border-black rounded-md hover:bg-[#90A4AE] active:translate-y-1 transition-transform"
                            >
                                <ArrowLeftIcon className="h-6 w-6" />
                            </button>
                            <div>
                                {/* This part correctly displays the project info */}
                                <h1 className="text-3xl font-extrabold text-black">{data?.project_title || "Project Details"}</h1>
                                <p className="text-gray-700 font-mono mt-1">
                                    ID: {projectName} | Status:
                                    <span className="font-bold text-black">{data?.workflow_state || "Draft"}</span>
                                </p>
                            </div>
                        </div>
                        {/* No action buttons are needed on the form page itself */}
                    </div>
                </header>
                <header className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-black tracking-tight uppercase">
                        Add Fund Sanction
                    </h1>
                </header>

                <form onSubmit={handleSubmit} encType="multipart/form-data">
                    <div className="bg-white p-6 md:p-8 border-2 border-black rounded-md shadow-[4px_4px_0px_rgba(0,0,0,0.25)]">
                        <div className="space-y-12">
                            {/* Main Form Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* {mainFormFields.map(field => (
                                    <div key={field.fieldname} className={field.fieldtype.includes('Text') ? 'md:col-span-2' : ''}>
                                        <label className="block font-bold text-black text-lg mb-2">
                                            {field.label} {field.mandatory && <span className="text-red-500">*</span>}
                                        </label>
                                        {field.description && <p className="text-sm text-gray-700 font-mono mt-1 mb-2">{field.description}</p>}
                                        {renderFormField(field)}
                                    </div>
                                ))} */}
                                {mainFormFields
                                  .filter(field => !field.hidden) // ✅ hide hidden fields entirely
                                  .map(field => (
                                    <div key={field.fieldname} className={field.fieldtype.includes('Text') ? 'md:col-span-2' : ''}>
                                      {/* Render label only once */}
                                      {!field.hidden && (
                                        <label className="block font-bold text-black text-lg mb-2">
                                          {field.label} {field.mandatory && <span className="text-red-500">*</span>}
                                        </label>
                                      )}
                                      {field.description && !field.hidden && (
                                        <p className="text-sm text-gray-700 font-mono mt-1 mb-2">{field.description}</p>
                                      )}
                                      {renderFormField(field)}
                                    </div>
                                  ))}
                            </div>

                           

{/* === TABLE SECTIONS === */}
{/* We'll hide them if Frappe marks them hidden */}

{/* Total Budget Break-up Table */}
{!fields.find(f => f.fieldname === "sanctioned_budget_breakup" && f.hidden) && (
  <div className="overflow-x-auto">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-black">Total Budget Break-up</h2>
      <NeoButton onClick={() => addTableRow("sanctioned_budget_breakup")}>
        Add Row
      </NeoButton>
    </div>
    <table className="w-full min-w-[900px] border-collapse border-2 border-black">
      <thead className="bg-gray-100">
        <tr>
          {[
            "No.",
            "Account Head",
            "1st Year",
            "2nd Year",
            "3rd Year",
            "4th Year",
            "5th Year",
            "Total",
            "Delete",
          ].map(h => (
            <th key={h} className="border-2 border-black p-2 text-left">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody
        ref={el => {
          if (el) containerRef.current["sanctioned_budget_breakup"] = el;
        }}
      >
        {tableRowsRef.current.sanctioned_budget_breakup.length === 0 && (
          <tr>
            <td colSpan={9} className="text-center p-4"></td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)}

{/* Upload Sanction Related Files */}
{!fields.find(f => f.fieldname === "sanction_related_files" && f.hidden) && (
  <div className="overflow-x-auto">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-black">
        Upload Sanction Related Files
      </h2>
      <NeoButton onClick={() => addTableRow("sanction_related_files")}>
        Add Row
      </NeoButton>
    </div>
    <table className="w-full border-collapse border-2 border-black">
      <thead className="bg-gray-100">
        <tr>
          <th className="border-2 border-black p-2 text-left">No.</th>
          <th className="border-2 border-black p-2 text-left">File</th>
          <th className="border-2 border-black p-2 text-left">Description</th>
          <th className="border-2 border-black p-2 text-left">Delete</th>
        </tr>
      </thead>
      <tbody
        ref={el => {
          if (el) containerRef.current["sanction_related_files"] = el;
        }}
      >
        {tableRowsRef.current.sanction_related_files.length === 0 && (
          <tr>
            <td colSpan={4} className="text-center p-4"></td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)}

{/* Sanction Transactions Details */}
{!fields.find(f => f.fieldname === "fund_transactions" && f.hidden) && (
  <div className="overflow-x-auto">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-black">
        Sanction Transactions Details
      </h2>
      <NeoButton onClick={() => addTableRow("fund_transactions")}>
        Add Row
      </NeoButton>
    </div>
    <table className="w-full border-collapse border-2 border-black">
      <thead className="bg-gray-100">
        <tr>
          <th className="border-2 border-black p-2 text-left">No.</th>
          <th className="border-2 border-black p-2 text-left">
            Transaction Number
          </th>
          <th className="border-2 border-black p-2 text-left">Date</th>
          <th className="border-2 border-black p-2 text-left">Amount (₹)</th>
          <th className="border-2 border-black p-2 text-left">Delete</th>
        </tr>
      </thead>
      <tbody
        ref={el => {
          if (el) containerRef.current["fund_transactions"] = el;
        }}
      >
        {tableRowsRef.current.fund_transactions.length === 0 && (
          <tr>
            <td colSpan={5} className="text-center p-4"></td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)}

{/* Budget Breakup of Received Amount */}
{!fields.find(f => f.fieldname === "received_amount_breakup" && f.hidden) && (
  <div className="overflow-x-auto">
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-2xl font-bold text-black">
        Budget Breakup of Received Amount
      </h2>
      <NeoButton onClick={() => addTableRow("received_amount_breakup")}>
        Add Row
      </NeoButton>
    </div>
    <table className="w-full border-collapse border-2 border-black">
      <thead className="bg-gray-100">
        <tr>
          <th className="border-2 border-black p-2 text-left">No.</th>
          <th className="border-2 border-black p-2 text-left">Account Head</th>
          <th className="border-2 border-black p-2 text-left">
            Amount Received (₹)
          </th>
          <th className="border-2 border-black p-2 text-left">Budget Year</th>
          <th className="border-2 border-black p-2 text-left">Remarks</th>
          <th className="border-2 border-black p-2 text-left">Delete</th>
        </tr>
      </thead>
      <tbody
        ref={el => {
          if (el) containerRef.current["received_amount_breakup"] = el;
        }}
      >
        {tableRowsRef.current.received_amount_breakup.length === 0 && (
          <tr>
            <td colSpan={6} className="text-center p-4">.</td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
)}



                        </div>
                    </div>

                    <div className="mt-8 flex justify-end">
                        <NeoButton type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'SUBMITTING...' : 'Submit Fund Sanction'}
                        </NeoButton>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default AddFundSanction;