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
}

// Helper to format currency
const formatCurrency = (amount: number | undefined | null) => {
    return `₹ ${(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

export const DepositSlipDocument: React.FC<DepositSlipDocumentProps> = ({ depositSlip, type = 'research_rnd' }) => {
    const config = getDepositTypeConfig(type, depositSlip);

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
                    ? `${label} / ${recipient} (${pct}%)`
                    : `${label} (${pct}%)`;
                items.push({ label: displayLabel, amount: parseFloat(item.amount) || 0 });
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
                                ? (depositSlip.event_title || '-')
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
                                    ? (depositSlip.category_e || depositSlip.category || '-')
                                    : (depositSlip.category_d || depositSlip.category || '-')}
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
                                {depositSlip.gstin_of_funding_agency || depositSlip.gstin || depositSlip.gstin_no || '-'}
                            </td>
                        </tr>
                    )}

                    {/* IITG Invoice No — only D Consultancy has this field */}
                    {type === 'consultancy_d' && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">IITG invoice No.</td>
                            <td colSpan={2} className="border border-black p-1">
                                {depositSlip.iitg_invoice_no || depositSlip.invoice_no || '-'}
                            </td>
                        </tr>
                    )}

                    {/* ECS Row */}
                    {(depositSlip.ecs_account_number || depositSlip.ecs_scheme_no || depositSlip.ecs_ac_no) && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">ECS</td>
                            <td className="border border-black p-1 text-center">{depositSlip.ecs_account_number || depositSlip.ecs_scheme_no || depositSlip.ecs_ac_no}</td>
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
                            {depositSlip.bank || depositSlip.bank_name || '-'}
                        </td>
                    </tr>

                    {/* Amount Inclusive of GST */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">Amount Inclusive of GST towards Capital Component</td>
                        <td colSpan={2} className="border border-black p-1 text-right">
                            {formatCurrency(
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
                                <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.income_tax_tds)}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">GST TDS</td>
                                <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.gst_tds)}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">Amount Actually Received In Bank A/C</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {formatCurrency(
                                        (parseFloat(depositSlip.amount_inclusive_of_gst || depositSlip.amount_inclusive_gst_capital || depositSlip.total_amount || 0)) -
                                        (parseFloat(depositSlip.income_tax_tds || 0) + parseFloat(depositSlip.gst_tds || 0))
                                    )}
                                </td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">CGST @ 9% on Total fees</td>
                                <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.cgst_amount || depositSlip.cgst || depositSlip.cgst_9)}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">SGST @ 9% on Total fees</td>
                                <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.sgst_amount || depositSlip.sgst || depositSlip.sgst_9)}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1">IGST @ 18% on Consultancy Fee</td>
                                <td colSpan={2} className="border border-black p-1 text-right">
                                    {formatCurrency(depositSlip.igst_18 || depositSlip.igst_amount || depositSlip.igst)}
                                </td>
                            </tr>
                        </>
                    )}

                    {/* Consultancy Fee X / Project Balance after GST */}
                    {(depositSlip.consultancy_fee_x || depositSlip.balance_after_gst) ? (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">
                                {type === 'consultancy_d' ? 'Total cost X (Balance after deduction of GST)' :
                                    (type === 'consultancy_e' || type === 'consultancy_t') ? 'Consultancy Fee X (Deducting GST)' :
                                        'Project Balance (Balance after deduction of GST)'}
                            </td>
                            <td colSpan={2} className="border border-black p-1 text-right">
                                {formatCurrency(depositSlip.consultancy_fee_x || depositSlip.balance_after_gst)}
                            </td>
                        </tr>
                    ) : null}

                    {/* Consultancy Charge Y (for Consultancy D) */}
                    {type === 'consultancy_d' && depositSlip.consultancy_charge && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">Consultancy Charge (Y)</td>
                            <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.consultancy_charge)}</td>
                        </tr>
                    )}

                    {/* Operational Charge Z (for Consultancy D) */}
                    {type === 'consultancy_d' && depositSlip.operational_charge && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">Operational Charge (Z)</td>
                            <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.operational_charge)}</td>
                        </tr>
                    )}

                    {/* Overhead Amount */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">
                            {type === 'consultancy_d' ? 'Total Overhead (0.1 * Y + 0.1 * Z)' :
                                (type === 'consultancy_e' || type === 'consultancy_t')
                                    ? `Overhead (${depositSlip.overhead_multiplier ?? (type === 'consultancy_t' ? 0.7 : 0.1)} × X)`
                                    : 'Overhead Amount @ 15% (inclusive)'}
                        </td>
                        <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.overhead_amount)}</td>
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
                    {type === 'consultancy_e' && (() => {
                        const amtInclusive = parseFloat(depositSlip.amount_inclusive_of_gst || depositSlip.amount_inclusive_gst_capital || depositSlip.total_amount || 0);
                        const tds = parseFloat(depositSlip.income_tax_tds || 0) + parseFloat(depositSlip.gst_tds || 0);
                        const amtReceived = amtInclusive - tds;
                        const igstVal = parseFloat(depositSlip.igst_18 || depositSlip.igst_amount || depositSlip.igst || 0);
                        const cgstVal = parseFloat(depositSlip.cgst_amount || depositSlip.cgst || depositSlip.cgst_9 || 0);
                        const sgstVal = parseFloat(depositSlip.sgst_amount || depositSlip.sgst || depositSlip.sgst_9 || 0);
                        const consultancyFeeX = parseFloat(depositSlip.consultancy_fee_x || 0) ||
                            (igstVal > 0 ? amtReceived - igstVal : cgstVal > 0 || sgstVal > 0 ? amtReceived - (cgstVal + sgstVal) : amtReceived);
                        const balanceInProject = consultancyFeeX - parseFloat(depositSlip.overhead_amount || 0);
                        return (
                            <tr>
                                <td className="border border-black p-1 text-center">{getRowNum()}</td>
                                <td className="border border-black p-1 font-bold">Balance In Project</td>
                                <td colSpan={2} className="border border-black p-1 text-right font-bold">{formatCurrency(balanceInProject)}</td>
                            </tr>
                        );
                    })()}

                    {/* Total Row — sum credit items; fall back to total_budget / total_amount */}
                    <tr>
                        <th colSpan={2} className="border border-black p-1 text-center bg-zinc-100 dark:bg-zinc-800 font-bold">Total</th>
                        <th colSpan={2} className="border border-black p-1 text-right bg-zinc-100 dark:bg-zinc-800 font-bold">
                            {formatCurrency(
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
                {depositSlip.note || 'Kindly arrange to deposit the GST'}
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


