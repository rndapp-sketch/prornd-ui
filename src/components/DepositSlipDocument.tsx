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
    // When true, disables all live formula recompute (dVal below always shows the stored value)
    // and makes every field — including normally-derived totals — independently editable. Plain
    // `editable` alone keeps the old behavior: driver fields (Y, Z, GST...) are editable and
    // derived totals live-recompute from them as you type.
    forceEdit?: boolean;
    onFieldChange?: (field: string, value: string) => void;
}

// Keeps free-form typing (partial "-", trailing ".") while capping to 2 decimal places.
const sanitizeDecimalInput = (raw: string): string => {
    let v = raw.replace(/[^0-9.-]/g, '');
    const negative = v.startsWith('-');
    v = v.replace(/-/g, '');
    if (negative) v = '-' + v;
    const firstDot = v.indexOf('.');
    if (firstDot !== -1) {
        v = v.slice(0, firstDot + 1) + v.slice(firstDot + 1).replace(/\./g, '');
    }
    const dotIdx = v.indexOf('.');
    if (dotIdx !== -1 && v.length - dotIdx - 1 > 2) {
        v = v.slice(0, dotIdx + 3);
    }
    return v;
};

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
            type="text"
            inputMode={numeric ? 'decimal' : undefined}
            value={value ?? ''}
            onChange={(e) => onChange?.(field, numeric ? sanitizeDecimalInput(e.target.value) : e.target.value)}
            // A focused <input type="number"> lets the mouse/trackpad scroll wheel silently
            // increment/decrement its value in Chrome/Firefox — blur on wheel so scrolling the
            // page never mutates the field.
            onWheel={(e) => e.currentTarget.blur()}
            className={`w-full bg-orange-50 dark:bg-orange-900/20 border border-dashed border-[#D97757] rounded px-1 py-0.5 text-sm outline-none focus:border-solid [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${align === 'right' ? 'text-right' : 'text-left'}`}
        />
    );
};

// Helper to format currency
const formatCurrency = (amount: number | undefined | null) => {
    return `₹ ${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Same, but rounded to whole rupees (no paise) — used for the D Consultancy credit distribution rows
const formatCurrencyWhole = (amount: number | undefined | null) => {
    return `₹ ${Math.round(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const flt = (v: any) => parseFloat(v) || 0;

// Rounds to 2 decimal places at each step, matching flt() in useDepositSlipCalculations.ts —
// without this, chained floating-point math drifts from the value the backend actually stored.
const round2 = (v: number) => Math.round(v * 100) / 100;

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

// D Consultancy Deposit Slip — mirrors calculateDConsultancy() in useDepositSlipCalculations.ts.
// D Consultancy has NO auto calculation except these two derived totals; every other field
// (Y/Z split, overhead, institute share, IDF/DPF/welfare, balances, GST components, TDS,
// deductions) is manual entry and is read straight off depositSlip in the JSX below.
export const computeDConsultancy = (depositSlip: any) => {
    const amountInclGst = flt(depositSlip.amount_inclusive_of_gst);
    const incomeTaxTds = flt(depositSlip.income_tax_tds);
    const gstTds = flt(depositSlip.amount_after_gst_tds);
    const otherDeductions = flt(depositSlip.other_deductions);
    const amountActuallyReceivedInBank = round2(amountInclGst - incomeTaxTds - gstTds - otherDeductions);

    const igst = flt(depositSlip.igst_18_on_consultancy);
    const cgst = flt(depositSlip.cgst_9_of_consultancy_fee);
    const sgst = flt(depositSlip.sgst_9_of_consultancy_fee);
    const totalGst = round2(igst + cgst + sgst);

    return {
        incomeTaxTds, gstTds, otherDeductions, amountActuallyReceivedInBank,
        igst, cgst, sgst, totalGst,
    };
};

// Research Consultancy Deposit Slip has no auto calculation — every field
// (GST components, overhead, IDF/DPF/welfare, TDS, deductions) is manual entry.

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

export const DepositSlipDocument: React.FC<DepositSlipDocumentProps> = ({ depositSlip, type = 'research_rnd', editable = false, forceEdit = false, onFieldChange }) => {
    const config = getDepositTypeConfig(type, depositSlip);
    const enr = type === 'consultancy_e' ? computeENonRoutine(depositSlip) : null;
    const dc = type === 'consultancy_d' ? computeDConsultancy(depositSlip) : null;
    const rc = type === 'consultancy_research';

    // Determine row counter
    let rowNum = 0;
    const getRowNum = () => {
        rowNum++;
        return rowNum.toString().padStart(2, '0');
    };

    // Render credit distribution items with letters
    const renderCreditItems = () => {
        const items: { label: string; amount: number; whole?: boolean; editableField?: string }[] = [];

        // IDF — manual entry for D Consultancy (no auto calculation)
        if (dc) {
            items.push({ label: `IDF (${depositSlip.idf_percentage ?? 40}% of Overhead + Institute Share)`, amount: flt(depositSlip.idf_amount), whole: true, editableField: editable ? 'idf_amount' : undefined });
        } else if (depositSlip.idf_amount) {
            items.push({ label: 'IDF (40% of Overhead Amount)', amount: depositSlip.idf_amount, editableField: forceEdit ? 'idf_amount' : undefined });
        }

        // DPF — child table (Research deposit slip). For D Consultancy each row's amount is
        // manual entry (no auto calculation) — show the doc's own stored per-row amount.
        if (Array.isArray(depositSlip.dpf_credit_distributions) && depositSlip.dpf_credit_distributions.length > 0) {
            depositSlip.dpf_credit_distributions.forEach((item: any) => {
                const dept = item.select_dept || item.department || item.dept_name || '';
                const pct = item.dpf_percentage || item.percentage || 0;
                const amount = parseFloat(item.dpf_amount) || parseFloat(item.amount) || 0;
                const deptSuffix = dept ? ` - ${dept}` : '';
                items.push({
                    label: `DPF (${pct}% of Overhead Amount)${deptSuffix}`,
                    amount,
                    whole: !!dc,
                    editableField: (dc ? editable : forceEdit) && item.name ? `dpf_credit_distributions.${item.name}.dpf_amount` : undefined,
                });
            });
        }

        // DPF — scalar fallback (other deposit slip types)
        if (!Array.isArray(depositSlip.dpf_credit_distributions) || depositSlip.dpf_credit_distributions.length === 0) {
            // Research Consultancy stores this under dpf_cle_amount, not dpf_amount — manual
            // entry, so just show whichever field the doc actually has.
            const dpfAmountValue = depositSlip.dpf_amount ?? depositSlip.dpf_cle_amount;
            if (dpfAmountValue) {
                const dpfLabel = type === 'consultancy_d' || type === 'consultancy_e'
                    ? 'DPF/CE (50% of Overhead Amount)'
                    : type === 'consultancy_t'
                        ? 'DPF / CE'
                        : 'DPF / CLE (25% of Overhead Amount)';
                items.push({
                    label: dpfLabel,
                    amount: dpfAmountValue,
                    editableField: (forceEdit || (rc && editable)) ? (depositSlip.dpf_amount !== undefined ? 'dpf_amount' : 'dpf_cle_amount') : undefined,
                });
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
                // Prefer the row's stored amount — that's what was actually recorded/credited
                // at submission time, and can legitimately differ from a fresh recompute (e.g.
                // a manual override, or a backend formula tweak after this record was saved).
                // Only fall back to the live overhead-based formula (see computeENonRoutine)
                // when the row has no stored amount at all (e.g. a brand-new, unsaved record).
                // Edit mode keeps the same fallback so a direct edit to this cell is never
                // overwritten by the formula while typing.
                const liveAmount = enr ? enr.overheadAmount * (pct / 100) : 0;
                const hasStoredAmount = item.amount !== undefined && item.amount !== null && item.amount !== '';
                const amount = enr
                    ? (forceEdit
                        ? flt(item.amount)
                        : hasStoredAmount
                            ? flt(item.amount)
                            : liveAmount)
                    : (parseFloat(item.amount) || 0);
                items.push({
                    label: displayLabel,
                    amount,
                    editableField: (enr || forceEdit) && item.name ? `credit_distribution.${item.name}.amount` : undefined,
                });
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
                    editableField: forceEdit && item.name ? `pdf_credit_distribution.${item.name}.pdf_amount` : undefined,
                });
            });
        }

        // Staff Welfare
        if (dc) {
            items.push({ label: `Staff welfare Amount (5% of Overhead + Institute Share)`, amount: flt(depositSlip.staff_welfare_amount), whole: true, editableField: editable ? 'staff_welfare_amount' : undefined });
        } else if (depositSlip.staff_welfare_amount) {
            items.push({
                label: `Staff welfare Amount (5% of Overhead Amount)`,
                amount: depositSlip.staff_welfare_amount,
                editableField: forceEdit ? 'staff_welfare_amount' : undefined,
            });
        }

        // Student Welfare - use the correct field name
        if (dc) {
            items.push({ label: `Student welfare Amount (5% of Overhead + Institute Share)`, amount: flt(depositSlip.student_welfare_amount), whole: true, editableField: editable ? 'student_welfare_amount' : undefined });
        }
        const studentWelfare = dc ? 0 : (depositSlip.student_welfare_amount || parseFloat(depositSlip.student_welfare_fund) || 0);
        if (studentWelfare > 0) {
            items.push({
                label: `Student welfare Amount (5% of Overhead Amount)`,
                amount: studentWelfare,
                editableField: forceEdit
                    ? (depositSlip.student_welfare_amount ? 'student_welfare_amount' : 'student_welfare_fund')
                    : undefined,
            });
        }

        // Project Account Balance (credit to project)
        if (depositSlip.project_account_balance) {
            const projectLabel = depositSlip.project_no || depositSlip.project_title || 'Project Account';
            items.push({
                label: projectLabel,
                amount: depositSlip.project_account_balance,
                editableField: forceEdit ? 'project_account_balance' : undefined,
            });
        }

        // additional_project_credits child table (used by Other Event Deposit Slip)
        if (Array.isArray(depositSlip.additional_project_credits) && depositSlip.additional_project_credits.length > 0) {
            depositSlip.additional_project_credits.forEach((item: any) => {
                const label = item.project_no || item.project_name || item.label || 'Project Credit';
                items.push({
                    label,
                    amount: parseFloat(item.amount) || 0,
                    editableField: forceEdit && item.name ? `additional_project_credits.${item.name}.amount` : undefined,
                });
            });
        }

        // Other Event Deposit Slip — license fee + GST breakdown
        if (type === 'other_event' && (items.length === 0 || forceEdit)) {
            const licenseFee = parseFloat(depositSlip.training_fee) || 0;
            const gst = parseFloat(depositSlip.gst_final) || parseFloat(depositSlip.gst_amount) || 0;
            if (licenseFee > 0 || forceEdit) {
                items.push({ label: 'License Fee', amount: licenseFee, editableField: forceEdit ? 'training_fee' : undefined });
            }
            if (gst > 0 || forceEdit) {
                items.push({ label: 'GST Amount', amount: gst, editableField: forceEdit ? 'gst_final' : undefined });
            }
        }

        return items.map((item, idx) => (
            <tr key={idx}>
                <td className="border border-black p-1 text-center">({String.fromCharCode(97 + idx)})</td>
                <td className="border border-black p-1">{item.label}</td>
                <td colSpan={2} className="border border-black p-1 text-right">
                    {editable && item.editableField
                        ? <EditableCell value={item.amount} field={item.editableField} editable onChange={onFieldChange} numeric align="right" />
                        : (item.whole ? formatCurrencyWhole(item.amount) : formatCurrency(item.amount))}
                </td>
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

                    {/* Research Consultancy only: IT TDS, GST TDS, Amount Actually Received, CGST, SGST, IGST — all manual entry */}
                    {rc && (
                        <>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">IT TDS</td>
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
                                        ? <EditableCell value={depositSlip.gst_tds__2 ?? depositSlip.gst_tds_2 ?? depositSlip.gst_tds} field="gst_tds__2" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.gst_tds__2 ?? depositSlip.gst_tds_2 ?? depositSlip.gst_tds)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Amount Actually Received</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.amount_actually_received} field="amount_actually_received" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.amount_actually_received)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">CGST @9%</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.cgst_9} field="cgst_9" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.cgst_9)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">SGST @9%</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.sgst_9} field="sgst_9" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.sgst_9)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">IGST @18%</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.igst_18 ?? depositSlip.igst_amount ?? depositSlip.igst} field="igst_18" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.igst_18 ?? depositSlip.igst_amount ?? depositSlip.igst)}
                                </td>
                            </tr>
                        </>
                    )}

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
                                    {editable
                                        ? <EditableCell value={depositSlip.amount_actually_received ?? enr!.amountActuallyReceived} field="amount_actually_received" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(enr!.amountActuallyReceived)}
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

                    {/* D Consultancy only: Income Tax TDS, GST TDS, Other Deductions — manual
                        entry. "Ammount actually received in bank account" is the one row here
                        that's auto-calculated (Amount Inclusive of GST − the three deductions). */}
                    {type === 'consultancy_d' && dc && (
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
                                        ? <EditableCell value={depositSlip.amount_after_gst_tds} field="amount_after_gst_tds" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.amount_after_gst_tds)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Other Deductions</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.other_deductions} field="other_deductions" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.other_deductions)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Ammount actually received in bank account
                                    <span className="block text-xs text-zinc-500">Auto: Amount Inclusive of GST − Income Tax TDS − GST TDS − Other Deductions</span>
                                </td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {formatCurrency(dc.amountActuallyReceivedInBank)}
                                </td>
                            </tr>
                        </>
                    )}

                    {/* Consultancy Fee X / Project Balance after GST — not shown for Consultancy D, which has its own full breakdown below */}
                    {(type !== 'consultancy_d' && (type === 'consultancy_e' || depositSlip.consultancy_fee_x || depositSlip.balance_after_gst)) ? (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">
                                {(type === 'consultancy_e' || type === 'consultancy_t') ? 'Consultancy Fee X (Deducting GST)' :
                                    'Project Balance (Balance after deduction of GST)'}
                            </td>
                            <td colSpan={2} className="border border-black p-1 text-right">
                                {type === 'consultancy_e'
                                    ? (editable
                                        ? <EditableCell value={depositSlip.consultancy_fee_x ?? enr!.consultancyFeeX} field="consultancy_fee_x" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(enr!.consultancyFeeX))
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

                    {/* Consultancy D — GST / Y / Z / overhead breakdown, matching the
                        D Consultancy Deposit Slip doctype fields. All manual entry (no auto
                        calculation) except Total GST further below. */}
                    {type === 'consultancy_d' && dc && (
                        <>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">IGST @18% on Consultancy Fee</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.igst_18_on_consultancy} field="igst_18_on_consultancy" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(dc.igst)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">CGST @9% of Consultancy Fee</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.cgst_9_of_consultancy_fee} field="cgst_9_of_consultancy_fee" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(dc.cgst)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">SGST @9% of Consultancy Fee</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.sgst_9_of_consultancy_fee} field="sgst_9_of_consultancy_fee" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(dc.sgst)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Total Cost (X)
                                    <span className="block text-xs text-zinc-500">Balance after GST deduction from amount received</span>
                                </td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.total_cost_x} field="total_cost_x" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(depositSlip.total_cost_x)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Consultancy Charge (Y)</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.consultancy_charge_y} field="consultancy_charge_y" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(depositSlip.consultancy_charge_y)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Operational Charge (Z)</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.operational_charge_z} field="operational_charge_z" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(depositSlip.operational_charge_z)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Overhead from Y (10% × Y)</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.overhead_from_y_amount} field="overhead_from_y_amount" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(depositSlip.overhead_from_y_amount)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Overhead from Z (10% × Z)</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.overhead_from_z_amount} field="overhead_from_z_amount" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(depositSlip.overhead_from_z_amount)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Institute Share (20% × Y)</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.institute_share_amount} field="institute_share_amount" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(depositSlip.institute_share_amount)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Total Overhead (10% × Y + 10% × Z)</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.total_overhead_amount} field="total_overhead_amount" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(depositSlip.total_overhead_amount)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1 font-bold">Total Overhead + Institute Share</td>
                                <td colSpan={2} className="border border-black p-1 text-right font-bold">
                                    {editable
                                        ? <EditableCell value={depositSlip.total_overhead_institute_share} field="total_overhead_institute_share" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(depositSlip.total_overhead_institute_share)}
                                </td>
                            </tr>
                        </>
                    )}

                    {/* Overhead Amount — non-D types only (D shows its own breakdown above) */}
                    {type !== 'consultancy_d' && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">
                                {(type === 'consultancy_e' || type === 'consultancy_t')
                                    ? `Overhead (${depositSlip.overhead_multiplier ?? (type === 'consultancy_t' ? 0.7 : 0.3)} × X)`
                                    : 'Overhead Amount @ 15% (inclusive)'}
                            </td>
                            <td colSpan={2} className="border border-black p-1 text-right">
                                {type === 'consultancy_e'
                                    ? (editable
                                        ? <EditableCell value={depositSlip.overhead_amount ?? enr!.overheadAmount} field="overhead_amount" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.overhead_amount ?? enr!.overheadAmount))
                                    : editable
                                        ? <EditableCell value={depositSlip.overhead_amount} field="overhead_amount" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrency(depositSlip.overhead_amount)}
                            </td>
                        </tr>
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
                            <td colSpan={2} className="border border-black p-1 text-right font-bold">
                                {editable
                                    ? <EditableCell value={depositSlip.balance_in_project ?? enr!.balanceInProject} field="balance_in_project" editable onChange={onFieldChange} numeric align="right" />
                                    : formatCurrency(depositSlip.balance_in_project ?? enr!.balanceInProject)}
                            </td>
                        </tr>
                    )}

                    {/* Final Totals — Consultancy D only */}
                    {type === 'consultancy_d' && dc && (
                        <>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Balance Consultancy Fee</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.balance_consultancy_fee} field="balance_consultancy_fee" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(depositSlip.balance_consultancy_fee)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Balance Operation Charge</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {editable
                                        ? <EditableCell value={depositSlip.balance_operation_charge} field="balance_operation_charge" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(depositSlip.balance_operation_charge)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Total GST
                                    <span className="block text-xs text-zinc-500">Auto: IGST @18% + CGST @9% + SGST @9% of Consultancy Fee</span>
                                </td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {formatCurrencyWhole(dc.totalGst)}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1 font-bold">Total Amount</td>
                                <td colSpan={2} className="border border-black p-1 text-right font-bold">
                                    {editable
                                        ? <EditableCell value={depositSlip.total_amount} field="total_amount" editable onChange={onFieldChange} numeric align="right" />
                                        : formatCurrencyWhole(depositSlip.total_amount)}
                                </td>
                            </tr>
                        </>
                    )}

                    {/* Total Row — sum credit items; fall back to total_budget / total_amount.
                        Consultancy D shows its own "Total Amount" row above instead. */}
                    {type !== 'consultancy_d' && (
                        <tr>
                            <th colSpan={2} className="border border-black p-1 text-center bg-zinc-100 dark:bg-zinc-800 font-bold">Total</th>
                            <th colSpan={2} className="border border-black p-1 text-right bg-zinc-100 dark:bg-zinc-800 font-bold">
                                {forceEdit
                                    ? <EditableCell
                                        value={
                                            depositSlip.total_budget ??
                                            depositSlip.grand_total ??
                                            depositSlip.total_amount ??
                                            depositSlip.total ??
                                            depositSlip.overhead_amount ??
                                            0
                                        }
                                        field="total_budget"
                                        editable
                                        onChange={onFieldChange}
                                        numeric
                                        align="right"
                                    />
                                    : enr
                                        ? (editable
                                            ? <EditableCell
                                                value={depositSlip.total_budget ?? (
                                                    (depositSlip.credit_distribution || []).reduce(
                                                        (s: number, r: any) => s + enr.overheadAmount * ((r.percentage_of_overhead || r.percentage || 0) / 100),
                                                        0,
                                                    ) + enr.gstComponent + enr.balanceInProject
                                                )}
                                                field="total_budget"
                                                editable
                                                onChange={onFieldChange}
                                                numeric
                                                align="right"
                                            />
                                            : formatCurrency(
                                                depositSlip.total_budget ??
                                                    depositSlip.grand_total ??
                                                    (depositSlip.credit_distribution || []).reduce(
                                                        (s: number, r: any) => s + enr.overheadAmount * ((r.percentage_of_overhead || r.percentage || 0) / 100),
                                                        0,
                                                    ) + enr.gstComponent + enr.balanceInProject,
                                            ))
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
                    )}
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


