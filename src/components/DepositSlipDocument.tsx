import React from 'react';

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
            subHeader: 'II&SI',
            recipient: 'AO (II&SI)',
            titlePrefix: 'Deposit of cheque to II&SI Account',
            titleType: 'Other Event No.',
            signatureLeft: 'JS (II&SI Cell)',
            signatureRight: 'HoS (II&SI Cell)'
        },
        consultancy_d: {
            subHeader: 'II&SI Cell',
            recipient: 'AO (II&SI Cell)',
            titlePrefix: 'Deposit to II&SI Account',
            titleType: 'Consultancy No.',
            signatureLeft: 'JS (II&SI Cell)',
            signatureRight: 'HoS (II&SI Cell)'
        },
        consultancy_e: {
            subHeader: 'II&SI Cell',
            recipient: 'AO (II&SI Cell)',
            titlePrefix: 'Deposit of Cheque to II&SI Account',
            titleType: 'Consultancy No.',
            signatureLeft: 'JS (II&SI Cell)',
            signatureRight: 'HoS (II&SI)'
        },
        consultancy_t: {
            subHeader: 'IIS & SI',
            recipient: 'JAO (R&D)',
            titlePrefix: 'Deposit of Draft to R&D Account',
            titleType: 'Consultancy No.',
            signatureLeft: 'Copy to: ' + (depositSlip.principal_investigator || '-'),
            signatureRight: 'HoS (IIS&SI)'
        },
        other_event: {
            subHeader: 'II&SI',
            recipient: 'AO (II&SI)',
            titlePrefix: 'Deposit of cheque to II&SI Account',
            titleType: 'Other Event No.',
            signatureLeft: 'JS (II&SI)',
            signatureRight: 'HoS (II&SI)'
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

        // DPF
        if (depositSlip.dpf_amount) {
            const dpfLabel = type === 'consultancy_d' || type === 'consultancy_e'
                ? 'DPF/CE (50% of Overhead Amount)'
                : type === 'consultancy_t'
                    ? 'DPF / CE'
                    : 'DPF / CLE (25% of Overhead Amount)';
            items.push({ label: dpfLabel, amount: depositSlip.dpf_amount });
        }

        // PDF Amount
        if (depositSlip.pdf_amount) {
            items.push({ label: 'PDF (12.5% of Overhead Amount)', amount: depositSlip.pdf_amount });
        }

        // PDF / Credit Distribution (if any custom distributions)
        if (depositSlip.credit_distribution && depositSlip.credit_distribution.length > 0) {
            depositSlip.credit_distribution.forEach((item: any) => {
                items.push({
                    label: `PDF/${item.label || item.recipient_name}`,
                    amount: item.amount || 0
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

        return items.map((item, idx) => (
            <tr key={idx}>
                <td className="border border-black p-1 text-center">({String.fromCharCode(97 + idx)})</td>
                <td className="border border-black p-1">{item.label}</td>
                <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(item.amount)}</td>
            </tr>
        ));
    };

    return (
        <div className="p-6 bg-white" style={{ fontFamily: '"Times New Roman", Times, serif', fontSize: '14px' }}>
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
                for {config.titleType}: {depositSlip.project_number || depositSlip.name}
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
                            {type === 'other_event' ? 'Event Title' : type.includes('consultancy') ? 'Consultancy Title' : 'Project Title'}
                        </td>
                        <td colSpan={2} className="border border-black p-1">{depositSlip.project_title || '-'}</td>
                    </tr>

                    {/* Row 2: Category (for consultancy types) */}
                    {type.includes('consultancy') && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">Category</td>
                            <td colSpan={2} className="border border-black p-1">{depositSlip.category || '-'}</td>
                        </tr>
                    )}

                    {/* Principal Investigator / Consultant / Organizer */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">
                            {type === 'other_event' ? 'Principal Organizer' : type.includes('consultancy') ? 'Principal Consultant' : 'Principal Investigator'}
                        </td>
                        <td colSpan={2} className="border border-black p-1">{depositSlip.principal_investigator || '-'}</td>
                    </tr>

                    {/* Client */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">Client</td>
                        <td colSpan={2} className="border border-black p-1">{depositSlip.client || '-'}</td>
                    </tr>

                    {/* Funding Agency */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">Funding Agency</td>
                        <td colSpan={2} className="border border-black p-1">{depositSlip.funding_agency || '-'}</td>
                    </tr>

                    {/* GSTIN */}
                    {(type.includes('consultancy') || type === 'other_event') && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">GSTIN No.</td>
                            <td colSpan={2} className="border border-black p-1">{depositSlip.gstin || '-'}</td>
                        </tr>
                    )}

                    {/* IITG Invoice No (for Consultancy E) */}
                    {type === 'consultancy_e' && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">IITG invoice No.</td>
                            <td colSpan={2} className="border border-black p-1">{depositSlip.invoice_no || '-'}</td>
                        </tr>
                    )}

                    {/* ECS Row */}
                    {depositSlip.ecs_account_number && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">ECS</td>
                            <td className="border border-black p-1 text-center">{depositSlip.ecs_account_number}</td>
                            <td className="border border-black p-1 text-center">
                                Dated: {depositSlip.ecs_dates_and_amount?.[0]?.ecs_date || '-'}
                            </td>
                        </tr>
                    )}

                    {/* Bank */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">Bank</td>
                        <td colSpan={2} className="border border-black p-1">{depositSlip.bank || '-'}</td>
                    </tr>

                    {/* Amount Inclusive of GST */}
                    <tr>
                        <td className="border border-black p-1 text-center">{getRowNum()}</td>
                        <td className="border border-black p-1">Amount Inclusive of GST towards Capital Component</td>
                        <td colSpan={2} className="border border-black p-1 text-right">
                            {formatCurrency(depositSlip.amount_inclusive_gst_capital || depositSlip.total_amount)}
                        </td>
                    </tr>

                    {/* CGST */}
                    {depositSlip.cgst_amount && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">CGST @ 9% on Total fees</td>
                            <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.cgst_amount)}</td>
                        </tr>
                    )}

                    {/* SGST */}
                    {depositSlip.sgst_amount && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">SGST @ 9% on Total fees</td>
                            <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.sgst_amount)}</td>
                        </tr>
                    )}

                    {/* IGST */}
                    {depositSlip.igst_amount && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">IGST @ 18% on {type.includes('consultancy') ? 'Consultancy' : 'Total'} Fee</td>
                            <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.igst_amount)}</td>
                        </tr>
                    )}

                    {/* Project Balance / Consultancy Fee */}
                    {depositSlip.balance_after_gst && (
                        <tr>
                            <td className="border border-black p-1 text-center">{getRowNum()}</td>
                            <td className="border border-black p-1">
                                {type === 'consultancy_d' ? 'Total cost X (Balance after deduction of GST)' :
                                    type === 'consultancy_e' ? 'Consultancy Fee X (Deducting GST)' :
                                        'Project Balance (Balance after deduction of GST)'}
                            </td>
                            <td colSpan={2} className="border border-black p-1 text-right">{formatCurrency(depositSlip.balance_after_gst)}</td>
                        </tr>
                    )}

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
                                type === 'consultancy_e' ? 'Overhead (0.3 * X)' :
                                    type === 'consultancy_t' ? 'Overhead (0.7 × X)' :
                                        'Overhead Amount @ 15% (inclusive)'}
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
                        <th colSpan={2} className="border border-black p-1 text-center bg-gray-100 font-bold">Account</th>
                        <th colSpan={2} className="border border-black p-1 text-center bg-gray-100 font-bold">Amount</th>
                    </tr>

                    {/* Credit Distribution Items */}
                    {renderCreditItems()}

                    {/* Total Row */}
                    <tr>
                        <th colSpan={2} className="border border-black p-1 text-center bg-gray-100 font-bold">Total</th>
                        <th colSpan={2} className="border border-black p-1 text-right bg-gray-100 font-bold">
                            {formatCurrency(depositSlip.grand_total || depositSlip.total_amount)}
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
                    Copy to: {depositSlip.principal_investigator || '-'}
                </div>
            )}
        </div>
    );
};

export default DepositSlipDocument;
