import React, { useState, useEffect } from 'react';
import { ProjectTitle } from './ProjectTitle';
import { FundingAgencyName } from './FundingAgencyName';
import { UserFullName } from './UserFullName';

const ProjectNo: React.FC<{ projectId?: string }> = ({ projectId }) => {
    const [projectNo, setProjectNo] = useState<string>('');
    const [loading, setLoading] = useState(!!projectId);

    useEffect(() => {
        if (!projectId) return;
        fetch(`/api/v2/document/Project Registration/${encodeURIComponent(projectId)}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(json => { if (json?.data?.project_no) setProjectNo(json.data.project_no); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [projectId]);

    if (loading) return <span className="opacity-50 italic text-sm">Loading...</span>;
    return <span>{projectNo || projectId || '-'}</span>;
};

interface DepositSlipDocumentProps {
    depositSlip: any;
    type?: 'research_rnd' | 'consultancy_research' | 'consultancy_d' | 'consultancy_e' | 'consultancy_t' | 'other_event';
    editable?: boolean;
    onFieldChange?: (field: string, value: string) => void;
}

// Inline editable cell — falls back to plain text when not in edit mode
const EditableCell: React.FC<{
    value: any;
    field: string;
    editable?: boolean;
    onChange?: (field: string, value: string) => void;
    numeric?: boolean;
    align?: 'left' | 'right';
}> = ({ value, field, editable, onChange, numeric, align = 'left' }) => {
    if (!editable) return <>{(value === undefined || value === null || value === '') ? '-' : value}</>;
    return (
        <input
            type={numeric ? 'number' : 'text'}
            step={numeric ? '0.01' : undefined}
            value={value ?? ''}
            onChange={(e) => onChange?.(field, e.target.value)}
            className={`w-full bg-orange-50 dark:bg-orange-900/20 border border-dashed border-[#D97757] rounded px-1 py-0.5 text-sm outline-none focus:border-solid ${align === 'right' ? 'text-right' : 'text-left'}`}
        />
    );
};

// Helper to format currency
const formatCurrency = (amount: number | undefined | null) => {
    return `₹ ${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const flt = (v: any) => parseFloat(v) || 0;

// E Non Routine Deposit Slip — mirrors calculateENonRoutine() in useDepositSlipCalculations.ts
// so the print view (and edits made there) reflect the same GST/overhead formula used at
// creation time, instead of showing stale/independently-typed values.
export const computeENonRoutine = (depositSlip: any) => {
    const amountInclGst = flt(depositSlip.amount_inclusive_of_gst ?? depositSlip.amount_inclusive_gst_capital ?? depositSlip.total_amount);
    const incomeTaxTds = flt(depositSlip.income_tax_tds);
    const gstTds = flt(depositSlip.gst_tds_2 ?? depositSlip.gst_tds);
    const cgst = flt(depositSlip.cgst_9 ?? depositSlip.cgst_amount ?? depositSlip.cgst);
    const sgst = flt(depositSlip.sgst_9 ?? depositSlip.sgst_amount ?? depositSlip.sgst);
    const igst = flt(depositSlip.igst_18 ?? depositSlip.igst_amount ?? depositSlip.igst);
    const multiplier = flt(depositSlip.overhead_multiplier) || 0.3;

    const amountActuallyReceived = amountInclGst - incomeTaxTds - gstTds;
    const consultancyFeeX = igst > 0 ? amountActuallyReceived - igst : amountActuallyReceived - cgst - sgst;
    const overheadAmount = multiplier * consultancyFeeX;
    const gstComponent = igst > 0 ? igst : cgst + sgst;
    const balanceInProject = consultancyFeeX - overheadAmount;

    return { amountActuallyReceived, consultancyFeeX, overheadAmount, gstComponent, balanceInProject };
};

// Helper to format date
const formatDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

// Get deposit type configuration
const getDepositTypeConfig = (type: string, depositSlip: any) => {
    const configs: Record<string, {
        subHeader: string;
        recipient: string;
        titlePrefix: string;
        titleType: string;
        signatureLeft: string;
        signatureRight: string;
    }> = {
        research_rnd: {
            subHeader: 'Research & Development',
            recipient: 'R&D Accounts',
            titlePrefix: 'Deposit of Draft to R&D Account',
            titleType: 'Project No.',
            signatureLeft: 'Superintendent (R&D)',
            signatureRight: 'HoS, Research & Development'
        },
        consultancy_research: {
            subHeader: 'R&D',
            recipient: 'AO (R&D)',
            titlePrefix: 'Deposit of cheque to R&D Account',
            titleType: 'Other Event No.',
            signatureLeft: 'JS (R&D Cell)',
            signatureRight: 'HoS (RnD)'
        },
        consultancy_d: {
            subHeader: 'R&D Cell',
            recipient: 'AO (R&D Cell)',
            titlePrefix: 'Deposit to R&D Account',
            titleType: 'Consultancy No.',
            signatureLeft: 'JS (R&D Cell)',
            signatureRight: 'HoS (RnD)'
        },
        consultancy_e: {
            subHeader: 'R&D Cell',
            recipient: 'AO (R&D Cell)',
            titlePrefix: 'Deposit of Cheque to R&D Account',
            titleType: 'Consultancy No.',
            signatureLeft: 'JS (R&D Cell)',
            signatureRight: 'HoS (RnD)'
        },
        consultancy_t: {
            subHeader: 'IIS & SI',
            recipient: 'JAO (R&D)',
            titlePrefix: 'Deposit of Draft to R&D Account',
            titleType: 'Consultancy No.',
            signatureLeft: 'Copy to: ' + (depositSlip.principal_investigator || '-'),
            signatureRight: 'HoS (RnD)'
        },
        other_event: {
            subHeader: 'R&D',
            recipient: 'AO (R&D)',
            titlePrefix: 'Deposit of cheque to R&D Account',
            titleType: 'Other Event No.',
            signatureLeft: 'JS (R&D)',
            signatureRight: 'HoS (RnD)'
        }
    };
    return configs[type] || configs.research_rnd;
};

export const DepositSlipDocument: React.FC<DepositSlipDocumentProps> = ({ depositSlip, type = 'research_rnd', editable = false, onFieldChange }) => {
    const config = getDepositTypeConfig(type, depositSlip);
    const enr = type === 'consultancy_e' ? computeENonRoutine(depositSlip) : null;

    // Determine row counter
    let rowNum = 0;
    const getRowNum = () => {
        rowNum++;
        return rowNum.toString().padStart(2, '0');
    };

    // Render credit distribution items with letters
    const renderCreditItems = () => {
        const items: { label: string; amount: number }[] = [];

        // IDF
        if (depositSlip.idf_amount) {
            items.push({ label: 'IDF (40% of Overhead Amount)', amount: depositSlip.idf_amount });
        }

        // DPF — child table (Research deposit slip)
        if (Array.isArray(depositSlip.dpf_credit_distributions) && depositSlip.dpf_credit_distributions.length > 0) {
            depositSlip.dpf_credit_distributions.forEach((item: any) => {
                const dept = item.select_dept || item.department || item.dept_name || '';
                const pct = item.dpf_percentage || item.percentage || 0;
                const amount = parseFloat(item.dpf_amount) || parseFloat(item.amount) || 0;
                const deptSuffix = dept ? ` - ${dept}` : '';
                items.push({
                    label: `DPF (${pct}% of Overhead Amount)${deptSuffix}`,
                    amount,
                });
            });
        }

        // DPF — scalar fallback (other deposit slip types)
        if (!Array.isArray(depositSlip.dpf_credit_distributions) || depositSlip.dpf_credit_distributions.length === 0) {
            if (depositSlip.dpf_amount) {
                const dpfLabel = type === 'consultancy_d' || type === 'consultancy_e'
                    ? 'DPF/CE (50% of Overhead Amount)'
                    : type === 'consultancy_t'
                        ? 'DPF / CE'
                        : 'DPF / CLE (25% of Overhead Amount)';
                items.push({ label: dpfLabel, amount: depositSlip.dpf_amount });
            }
        }

        // credit_distribution child table (used by E Non Routine, T Testing, etc.)
        if (Array.isArray(depositSlip.credit_distribution) && depositSlip.credit_distribution.length > 0) {
            depositSlip.credit_distribution.forEach((item: any) => {
                const pct = item.percentage_of_overhead || item.percentage || 0;
                let label = (item.label || item.recipient_name || 'PDF').trim();
                // Strip trailing date strings (e.g., "IDF / 2026-07-02" → "IDF")
                label = label.replace(/\s*\/\s*\d{4}-\d{2}-\d{2}.*/, '').trim();
                const recipient = (item.recipient_name || '').trim();
                const isDateString = /^\d{4}-\d{2}-\d{2}/.test(recipient);
                const displayLabel = recipient && recipient !== label && !isDateString
                    ? `${label} / ${recipient} (${pct}% of Overhead Amount)`
                    : `${label} (${pct}% of Overhead Amount)`;
                // For E Non Routine, keep each row's amount in sync with the live-recomputed
                // overhead (see computeENonRoutine) instead of the possibly-stale stored value.
                const amount = enr ? enr.overheadAmount * (pct / 100) : parseFloat(item.amount) || 0;
                items.push({ label: displayLabel, amount });
            });
        }

        // pdf_credit_distribution child table (used by Research / D Consultancy types)
        if (Array.isArray(depositSlip.pdf_credit_distribution) && depositSlip.pdf_credit_distribution.length > 0) {
            depositSlip.pdf_credit_distribution.forEach((item: any) => {
                const percentage = item.pdf_percentage || 0;
                const amount = item.pdf_amount || 0;
                const recipientName = item.recipient_name || item.select_copi_id || item.employee_id || '';
                const labelSuffix = recipientName ? ` - ${recipientName}` : '';
                items.push({
                    label: `PDF (${percentage}% of Overhead Amount)${labelSuffix}`,
                    amount: amount,
                });
            });
        }

        // Staff Welfare
        if (depositSlip.staff_welfare_amount) {
            items.push({
                label: `Staff welfare Amount (5% of Overhead Amount)`,
                amount: depositSlip.staff_welfare_amount
            });
        }

        // Student Welfare - use the correct field name
        const studentWelfare = depositSlip.student_welfare_amount || parseFloat(depositSlip.student_welfare_fund) || 0;
        if (studentWelfare > 0) {
            items.push({
                label: `Student welfare Amount (5% of Overhead Amount)`,
                amount: studentWelfare
            });
        }

        // Project Account Balance (credit to project)
        if (depositSlip.project_account_balance) {
            const projectLabel = depositSlip.project_no || depositSlip.project_title || 'Project Account';
            items.push({
                label: projectLabel,
                amount: depositSlip.project_account_balance
            });
        }

        // additional_project_credits child table (used by Other Event Deposit Slip)
        if (Array.isArray(depositSlip.additional_project_credits) && depositSlip.additional_project_credits.length > 0) {
            depositSlip.additional_project_credits.forEach((item: any) => {
                const label = item.project_no || item.project_name || item.label || 'Project Credit';
                items.push({ label, amount: parseFloat(item.amount) || 0 });
            });
        }

        // Other Event Deposit Slip — license fee + GST breakdown
        if (type === 'other_event' && items.length === 0) {
            const licenseFee = parseFloat(depositSlip.training_fee) || 0;
            const gst = parseFloat(depositSlip.gst_final) || parseFloat(depositSlip.gst_amount) || 0;
            if (licenseFee > 0) items.push({ label: 'License Fee', amount: licenseFee });
            if (gst > 0) items.push({ label: 'GST Amount', amount: gst });
        }

        console.log("depositSlip:", depositSlip)
        return items.map((item, idx) => (
            <tr key={idx}>
                <td className="border border-black p-1 text-center">({String.fromCharCode(97 + idx)})</td>
                <td className="border border-black p-1">{item.label}</td>
                <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(item.amount)}</td>
            </tr>
        ));
    };

    return (
        <div className="p-6 bg-white dark:bg-zinc-900" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '14px' }}>
            {/* Header */}
            <div className="text-center mb-3">
                <div className="text-xl font-bold uppercase">Indian Institute of Technology Guwahati</div>
                <div className="text-lg font-bold">{config.subHeader}</div>
            </div>

            {/* Top Info */}
            <div className="flex justify-between text-sm mb-3">
                <div>
                    To<br />
                    {config.recipient}
                </div>
                <div className="text-right">
                    {depositSlip.name}<br />
                    Date: {formatDate(depositSlip.creation)}
                </div>
            </div>

            {/* Title */}
            <div className="text-center font-bold mb-4">
                <span className="underline">{config.titlePrefix}</span><br />
                for {config.titleType}: {type === 'other_event'
                    ? (depositSlip.project_no || depositSlip.project_registration || depositSlip.name || '-')
                    : <ProjectNo projectId={depositSlip.project_title || depositSlip.research_project} />
                }
            </div>

            {/* Main Table */}
            <table className="w-full border-collapse text-sm mb-3" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                    <col style={{ width: '7%' }} />
                    <col style={{ width: '43%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '25%' }} />
                </colgroup>
                <tbody>
                    {/* Row 1: Project/Event/Consultancy Title */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">
                            {type === 'other_event' ? 'Event Title' : type === 'consultancy_d' ? 'Consultancy Title' : 'Project Title'}
                        </td>
                        <td colSpan={2} className="border border-black p-1">
                            {type === 'other_event'
                                ? <EditableCell value={depositSlip.event_title} field="event_title" editable={editable} onChange={onFieldChange} />
                                : <ProjectTitle
                                    projectId={depositSlip.project_title || depositSlip.consultancy_title}
                                    fallbackTitle={depositSlip.project_title || depositSlip.consultancy_title}
                                />
                            }
                        </td>
                    </tr>

                    {/* Row 2: Category — D uses category_d, E uses category_e, T has none */}
                    {(type === 'consultancy_d' || type === 'consultancy_e') && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">Category</td>
                            <td colSpan={2} className="border border-black p-1">
                                {type === 'consultancy_e'
                                    ? <EditableCell value={depositSlip.category_e ?? depositSlip.category} field="category_e" editable={editable} onChange={onFieldChange} />
                                    : <EditableCell value={depositSlip.category_d ?? depositSlip.category} field="category_d" editable={editable} onChange={onFieldChange} />}
                            </td>
                        </tr>
                    )}

                    {/* Principal Investigator / Consultant / Organizer */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">
                            {type === 'other_event' ? 'Principal Organizer'
                                : type === 'consultancy_d' ? 'Principal Consultant'
                                    : 'Principal Investigator'}
                        </td>
                        <td colSpan={2} className="border border-black p-1">
                            {type === 'other_event'
                                ? <UserFullName email={depositSlip.principal_organizer} showEmail />
                                : <UserFullName email={depositSlip.principal_investigator || depositSlip.principal_consultant} showEmail />
                            }
                        </td>
                    </tr>

                    {/* Client */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">Client</td>
                        <td colSpan={2} className="border border-black p-1">
                            {depositSlip.funding_agency
                                ? <FundingAgencyName value={depositSlip.funding_agency} />
                                : (depositSlip.client || '-')}
                        </td>
                    </tr>

                    {/* Funding Agency */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">Funding Agency</td>
                        <td colSpan={2} className="border border-black p-1">
                            {depositSlip.funding_agency
                                ? <FundingAgencyName value={depositSlip.funding_agency} />
                                : '-'}
                        </td>
                    </tr>

                    {/* GSTIN */}
                    {(type.includes('consultancy') || type === 'other_event') && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">GSTIN No.</td>
                            <td colSpan={2} className="border border-black p-1">
                                <EditableCell value={depositSlip.gstin_of_funding_agency ?? depositSlip.gstin ?? depositSlip.gstin_no} field="gstin_of_funding_agency" editable={editable} onChange={onFieldChange} />
                            </td>
                        </tr>
                    )}

                    {/* IITG Invoice No — only D Consultancy has this field */}
                    {type === 'consultancy_d' && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">IITG invoice No.</td>
                            <td colSpan={2} className="border border-black p-1">
                                <EditableCell value={depositSlip.iitg_invoice_no ?? depositSlip.invoice_no} field="iitg_invoice_no" editable={editable} onChange={onFieldChange} />
                            </td>
                        </tr>
                    )}

                    {/* ECS Row */}
                    {(editable || depositSlip.ecs_account_number || depositSlip.ecs_scheme_no || depositSlip.ecs_ac_no) && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">ECS</td>
                            <td className="border border-black p-1 text-center">
                                <EditableCell value={depositSlip.ecs_account_number ?? depositSlip.ecs_scheme_no ?? depositSlip.ecs_ac_no} field="ecs_account_number" editable={editable} onChange={onFieldChange} />
                            </td>
                            <td className="border border-black p-1 text-center">
                                Dated: {
                                    depositSlip.ecs_dates_and_amount?.[0]?.ecs_date
                                        ? formatDate(depositSlip.ecs_dates_and_amount[0].ecs_date)
                                        : depositSlip.ecs_date?.[0]?.ecs_date
                                            ? formatDate(depositSlip.ecs_date[0].ecs_date)
                                            : depositSlip.ecs_dates?.[0]?.ecs_date
                                                ? formatDate(depositSlip.ecs_dates[0].ecs_date)
                                                : '-'
                                }
                            </td>
                        </tr>
                    )}

                    {/* Bank */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">Bank</td>
                        <td colSpan={2} className="border border-black p-1">
                            <EditableCell value={depositSlip.bank ?? depositSlip.bank_name} field="bank" editable={editable} onChange={onFieldChange} />
                        </td>
                    </tr>

                    {/* Amount Inclusive of GST */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">Amount Inclusive of GST towards Capital Component</td>
                        <td colSpan={2} className="border border-black p-1 text-right">
                            {editable
                                ? <EditableCell
                                    value={depositSlip.amount_inclusive_of_gst ?? depositSlip.amount_inclusive_gst_capital ?? depositSlip.total_amount}
                                    field="amount_inclusive_of_gst"
                                    editable={editable}
                                    onChange={onFieldChange}
                                    numeric
                                    align="right"
                                />
                                : formatCurrency(
                                    depositSlip.amount_inclusive_of_gst ||
                                    depositSlip.amount_inclusive_gst_capital ||
                                    depositSlip.total_amount
                                )}
                        </td>
                    </tr>

                    {/* E Non-Routine only: Income Tax TDS, GST TDS, Amount Actually Received, CGST, SGST, IGST */}
                    {type === 'consultancy_e' && (
                        <>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Income Tax TDS</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.income_tax_tds} field="income_tax_tds" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.income_tax_tds)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">GST TDS</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.gst_tds_2 ?? depositSlip.gst_tds} field="gst_tds_2" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.gst_tds_2 ?? depositSlip.gst_tds)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Amount Actually Received In Bank A/C</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {formatCurrency(enr!.amountActuallyReceived)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">CGST @ 9%</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.cgst_9 ?? depositSlip.cgst_amount ?? depositSlip.cgst} field="cgst_9" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.cgst_9 ?? depositSlip.cgst_amount ?? depositSlip.cgst)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">SGST @ 9%</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.sgst_9 ?? depositSlip.sgst_amount ?? depositSlip.sgst} field="sgst_9" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.sgst_9 ?? depositSlip.sgst_amount ?? depositSlip.sgst)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">IGST @ 18%</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.igst_18 ?? depositSlip.igst_amount ?? depositSlip.igst} field="igst_18" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.igst_18 ?? depositSlip.igst_amount ?? depositSlip.igst)}
                                </td>
                            </tr>
                        </>
                    )}

                    {/* Consultancy Fee X / Project Balance after GST */}
                    {(type === 'consultancy_e' || depositSlip.consultancy_fee_x || depositSlip.balance_after_gst) ? (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">
                                {type === 'consultancy_d' ? 'Total cost X (Balance after deduction of GST)' :
                                    (type === 'consultancy_e' || type === 'consultancy_t') ? 'Consultancy Fee X (Deducting GST)' :
                                        'Project Balance (Balance after deduction of GST)'}
                            </td>
                            <td colSpan={2} className="border border-black p-1 text-right">
                                {type === 'consultancy_e'
                                    // Derived from Amount Inclusive of GST, TDS and CGST/SGST/IGST above —
                                    // always computed live rather than edited directly, so it can't drift
                                    // out of sync with those inputs (see computeENonRoutine).
                                    ? formatCurrency(enr!.consultancyFeeX)
                                    : editable
                                        ? <EditableCell
                                            value={depositSlip.consultancy_fee_x ?? depositSlip.balance_after_gst}
                                            field={depositSlip.consultancy_fee_x !== undefined ? 'consultancy_fee_x' : 'balance_after_gst'}
                                            editable
                                            onChange={onFieldChange}
                                            numeric
                                            align="right"
                                        />
                                        : formatCurrency(depositSlip.consultancy_fee_x || depositSlip.balance_after_gst)}
                            </td>
                        </tr>
                    ) : null}

                    {/* Consultancy Charge Y (for Consultancy D) */}
                    {type === 'consultancy_d' && (editable || depositSlip.consultancy_charge) && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">Consultancy Charge (Y)</td>
                            <td colSpan={2} className="border border-black p-1 text-right">
                                {editable
                                    ? <EditableCell value={depositSlip.consultancy_charge} field="consultancy_charge" editable onChange={onFieldChange} numeric align="right" />
                                    : formatCurrency(depositSlip.consultancy_charge)}
                            </td>
                        </tr>
                    )}

                    {/* Operational Charge Z (for Consultancy D) */}
                    {type === 'consultancy_d' && (editable || depositSlip.operational_charge) && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">Operational Charge (Z)</td>
                            <td colSpan={2} className="border border-black p-1 text-right">
                                {editable
                                    ? <EditableCell value={depositSlip.operational_charge} field="operational_charge" editable onChange={onFieldChange} numeric align="right" />
                                    : formatCurrency(depositSlip.operational_charge)}
                            </td>
                        </tr>
                    )}

                    {/* Overhead Amount */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">
                            {type === 'consultancy_d' ? 'Total Overhead (0.1 * Y + 0.1 * Z)' :
                                (type === 'consultancy_e' || type === 'consultancy_t')
                                    ? `Overhead (${depositSlip.overhead_multiplier ?? (type === 'consultancy_t' ? 0.7 : 0.3)} × X)`
                                    : 'Overhead Amount @ 15% (inclusive)'}
                        </td>
                        <td colSpan={2} className="border border-black p-1 text-right">
                            {type === 'consultancy_e'
                                ? formatCurrency(enr!.overheadAmount)
                                : editable
                                    ? <EditableCell value={depositSlip.overhead_amount} field="overhead_amount" editable onChange={onFieldChange} numeric align="right" />
                                    : formatCurrency(depositSlip.overhead_amount)}
                        </td>
                    </tr>

                    {/* Institute Share (for Consultancy D) */}
                    {type === 'consultancy_d' && depositSlip.institute_share && (
                        <>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Institute Share (0.2 * Y)</td>
                                <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.institute_share)}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Overhead + Institute Share</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {formatCurrency((depositSlip.overhead_amount || 0) + (depositSlip.institute_share || 0))}
                                </td>
                            </tr>
                        </>
                    )}

                    {/* Credit Header */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td colSpan={3} className="border border-black p-1"><strong>Credit as follows:</strong></td>
                    </tr>

                    {/* Account / Amount Header */}
                    <tr>
                        <th colSpan={2} className="border border-black p-1 text-center bg-zinc-100 dark:bg-zinc-800 font-bold">Account</th>
                        <th colSpan={2} className="border border-black p-1 text-center bg-zinc-100 dark:bg-zinc-800 font-bold">Amount</th>
                    </tr>

                    {/* Credit Distribution Items */}
                    {renderCreditItems()}

                    {/* Balance In Project — E Non-Routine only */}
                    {type === 'consultancy_e' && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1 font-bold">Balance In Project</td>
                            <td colSpan={2} className="border border-black p-1 text-right font-bold">{formatCurrency(enr!.balanceInProject)}</td>
                        </tr>
                    )}

                    {/* Total Row — sum credit items; fall back to total_budget / total_amount */}
                    <tr>
                        <th colSpan={2} className="border border-black p-1 text-center bg-zinc-100 dark:bg-zinc-800 font-bold">Total</th>
                        <th colSpan={2} className="border border-black p-1 text-right bg-zinc-100 dark:bg-zinc-800 font-bold">
                            {enr
                                ? formatCurrency(
                                    (depositSlip.credit_distribution || []).reduce(
                                        (s: number, r: any) => s + enr.overheadAmount * ((r.percentage_of_overhead || r.percentage || 0) / 100),
                                        0,
                                    ) + enr.gstComponent + enr.balanceInProject,
                                )
                                : formatCurrency(
                                    depositSlip.total_budget ||
                                    depositSlip.grand_total ||
                                    depositSlip.total_amount ||
                                    [
                                        ...(depositSlip.credit_distribution || []),
                                        ...(depositSlip.pdf_credit_distribution || []),
                                        ...(depositSlip.additional_project_credits || []),
                                    ].reduce((s: number, r: any) => s + (parseFloat(r.amount) || 0), 0) ||
                                    depositSlip.total ||
                                    depositSlip.overhead_amount
                                )}
                        </th>
                    </tr>
                </tbody>
            </table>

            {/* Note */}
            <div className="text-sm mb-4 font-bold">
                {editable
                    ? <EditableCell value={depositSlip.note ?? 'Kindly arrange to deposit the GST'} field="note" editable onChange={onFieldChange} />
                    : (depositSlip.note || 'Kindly arrange to deposit the GST')}
            </div>

            {/* Signature Section */}
            <div className="flex justify-between mt-8 text-sm">
                <div className="text-left">
                    _______________________<br />
                    <strong>{config.signatureLeft}</strong>
                </div>
                <div className="text-right">
                    _______________________<br />
                    <strong>{config.signatureRight}</strong>
                </div>
            </div>

            {/* Copy To (if not already in signature) */}
            {type !== 'consultancy_t' && (
                <div className="text-sm mt-4">
                    Copy to: {
                        type === 'other_event'
                            ? (depositSlip.principal_organizer || '-')
                            : (depositSlip.principal_investigator || '-')
                    }
                </div>
            )}
        </div>
    );
};

export default DepositSlipDocument;



// -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=


