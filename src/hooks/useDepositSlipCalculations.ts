import { useEffect, useRef } from 'react';

// =============================================================
// SHARED HELPER
// =============================================================
const flt = (value: any, precision: number = 2): number => {
    const num = parseFloat(value) || 0;
    return Math.round(num * Math.pow(10, precision)) / Math.pow(10, precision);
};

interface FormData {
    [key: string]: any;
}

// =============================================================
// RESEARCH CONSULTANCY CONFIGURATION
// =============================================================
const RC_SHARE_POOL_PERCENT = 25.0;
const RC_SHARE_LABEL_KEY = "PDF";
const RC_PCT_IDF = 40.0;
const RC_PCT_DPF = 25.0;
const RC_PCT_STAFF_WELFARE = 5.0;
const RC_PCT_STUDENT_WELFARE = 5.0;

// =============================================================
// MAIN HOOK
// =============================================================
export const useDepositSlipCalculations = (
    formData: FormData,
    setFormData: React.Dispatch<React.SetStateAction<FormData>>,
    depositSlipType: string
) => {
    // Use refs to avoid dependency issues
    const formDataRef = useRef(formData);
    const lastSignatureRef = useRef('');

    // Keep ref in sync
    formDataRef.current = formData;

    // Build signature for comparison (only input fields that trigger calculation)
    const getSignature = (): string => {
        if (depositSlipType === 'research_consultancy') {
            const amount = flt(formData.amount_inclusive_gst_capital);
            const multiplier = flt(formData.overhead_multiplier) || 15;

            // Signature includes table structure to trigger calc on Add/Remove/LabelChange
            // CRITICAL: Do NOT include calculated fields (amount, pdf_percentage) to avoid loops!
            const table = formData.credit_distribution || [];
            const tableSig = table.map((r: any) => {
                const label = r.label || '';
                const isPdf = label.toUpperCase().startsWith(RC_SHARE_LABEL_KEY);
                if (isPdf) return `P:${label}`; // Only track label existence for PDF
                return `O:${label}:${r.percentage_of_overhead}`; // Track user input % for others
            }).join('|');

            return `rc:${amount}:${multiplier}:${tableSig}`;
        } else if (depositSlipType === 't_testing') {
            const amount = flt(formData.amount_inclusive_of_gst);
            const cgst = flt(formData.cgst_9);
            const sgst = flt(formData.sgst_9);
            const multiplier = flt(formData.overhead_multiplier) || 0.7;

            // Similar logic for T-Testing
            const table = formData.credit_distribution || [];
            const tableSig = table.map((r: any) => `T:${r.percentage_of_overhead}`).join('|');

            return `tt:${amount}:${cgst}:${sgst}:${multiplier}:${tableSig}`;
        } else if (depositSlipType === 'research_deposit_slip') {
            // Research Deposit Slip - trigger on total_amount or overhead_amount changes
            const total = flt(formData.total_amount);
            const overhead = flt(formData.overhead_amount);
            return `rds:${total}:${overhead}`;
        }
        return '';
    };

    const currentSignature = getSignature();

    useEffect(() => {
        // Guard: unsupported type
        if (!['research_consultancy', 't_testing', 'research_deposit_slip'].includes(depositSlipType)) {
            return;
        }

        // Guard: no change in inputs (Prevents Loop)
        if (currentSignature === lastSignatureRef.current) {
            return;
        }

        // Guard: skip if zero/empty inputs - BUT update last signature to avoid re-runs
        const data = formDataRef.current;
        if (depositSlipType === 'research_consultancy' && flt(data.amount_inclusive_gst_capital) <= 0) {
            lastSignatureRef.current = currentSignature;
            return;
        }
        if (depositSlipType === 't_testing' && flt(data.amount_inclusive_of_gst) <= 0) {
            lastSignatureRef.current = currentSignature;
            return;
        }
        // Research Deposit Slip: allow calculation even if overhead is 0 (to reset fields)
        // Only skip if both values are empty
        if (depositSlipType === 'research_deposit_slip' && flt(data.total_amount) <= 0 && flt(data.overhead_amount) <= 0) {
            lastSignatureRef.current = currentSignature;
            return;
        }

        console.log(`useDepositSlipCalculations [${depositSlipType}]: Calculating...`);

        // Update signature reference immediately
        lastSignatureRef.current = currentSignature;

        let updates: FormData = {};

        if (depositSlipType === 'research_consultancy') {
            updates = calculateResearchConsultancy(data);
        } else if (depositSlipType === 't_testing') {
            updates = calculateTTesting(data);
        } else if (depositSlipType === 'research_deposit_slip') {
            updates = calculateResearchDeposit(data);
        }

        setFormData(prev => ({ ...prev, ...updates }));

    }, [currentSignature, depositSlipType, setFormData]);

    return null;
};

// =============================================================
// RESEARCH CONSULTANCY CALCULATIONS
// =============================================================
function calculateResearchConsultancy(formData: FormData): FormData {
    const totalInclusive = flt(formData.amount_inclusive_gst_capital);
    const multiplier = flt(formData.overhead_multiplier) || 15;

    const projectBalance = totalInclusive / 1.18;
    const cgst = projectBalance * 0.09;
    const sgst = projectBalance * 0.09;
    const overheadAmount = projectBalance * (multiplier / (100 + multiplier));
    const projectAmount = projectBalance - overheadAmount;
    const idfAmt = overheadAmount * (RC_PCT_IDF / 100);
    const dpfAmt = overheadAmount * (RC_PCT_DPF / 100);
    const staffAmt = overheadAmount * (RC_PCT_STAFF_WELFARE / 100);
    const studentAmt = overheadAmount * (RC_PCT_STUDENT_WELFARE / 100);

    // Handle credit distribution
    const currentDist = formData.credit_distribution || [];
    let updatedDist = [...currentDist];

    if (currentDist.length > 0) {
        const poolIndices: number[] = [];
        updatedDist = currentDist.map((row: any, i: number) => {
            if (row.label && row.label.toUpperCase().startsWith(RC_SHARE_LABEL_KEY)) {
                poolIndices.push(i);
                return row;
            } else if (row.percentage_of_overhead) {
                return { ...row, amount: flt(overheadAmount * (row.percentage_of_overhead / 100)) };
            }
            return row;
        });

        if (poolIndices.length > 0) {
            const sharePercentage = RC_SHARE_POOL_PERCENT / poolIndices.length;
            const shareAmount = overheadAmount * (sharePercentage / 100);
            poolIndices.forEach(i => {
                updatedDist[i] = {
                    ...updatedDist[i],
                    percentage_of_overhead: flt(sharePercentage),
                    amount: flt(shareAmount)
                };
            });
        }
    }

    return {
        project_balance_after_gst: flt(projectBalance),
        cgst_9: flt(cgst),
        sgst_9: flt(sgst),
        total_gst: flt(cgst + sgst),
        total_budget: flt(totalInclusive),
        overhead_amount: flt(overheadAmount),
        prj_amount: flt(projectAmount),
        idf_amount: flt(idfAmt),
        dpf_cle_amount: flt(dpfAmt),
        staff_welfare_amount: flt(staffAmt),
        student_welfare_amount: flt(studentAmt),
        credit_distribution: updatedDist,

        // Ensure multiplier field is set if missing (default logic)
        overhead_multiplier: multiplier
    };
}

// =============================================================
// T TESTING CALCULATIONS
// =============================================================
function calculateTTesting(formData: FormData): FormData {
    const amountInclGst = flt(formData.amount_inclusive_of_gst);
    const cgst = flt(formData.cgst_9);
    const sgst = flt(formData.sgst_9);

    // T-Testing usually has fixed overhead or different logic, but using script logic:
    const multiplier = flt(formData.overhead_multiplier) || 0.7; // 70%?

    // Based on provided logic in original script (if any), but assuming standard:
    // If input was "Amount", then GST is calculated backward or forward?

    // NOTE: The previous script for T-Testing wasn't fully visible, but using previous logic:
    const totalGst = cgst + sgst;
    // Assuming 'amount_inclusive_of_gst' is the Grand Total
    const feeX = amountInclGst - totalGst;
    const overheadAmount = feeX * multiplier;

    // Handle credit distribution
    const currentDist = formData.credit_distribution || [];
    let updatedDist = currentDist;

    if (currentDist.length > 0) {
        updatedDist = currentDist.map((row: any) => {
            if (row.percentage_of_overhead) {
                const percent = flt(row.percentage_of_overhead) / 100;
                return { ...row, amount: flt(overheadAmount * percent) };
            }
            return row;
        });
    }

    return {
        consultancy_fee_x: flt(feeX),
        overhead_amount: flt(overheadAmount),
        total_gst: flt(totalGst),
        total_budget: flt(amountInclGst),
        credit_distribution: updatedDist,
    };
}

// =============================================================
// RESEARCH DEPOSIT SLIP CALCULATIONS
// Based on Frappe client script logic:
// - IDF: 40% of overhead
// - DPF: 25% of overhead  
// - PDF: 25% of overhead
// - Staff Welfare: 5% of overhead
// - Student Welfare: 5% of overhead
// - Project Balance: total - overhead
// - Grand Total: overhead + project balance (= total)
// =============================================================
function calculateResearchDeposit(formData: FormData): FormData {
    const total = flt(formData.total_amount);
    const overhead = flt(formData.overhead_amount);

    if (overhead > 0) {
        const idfAmt = overhead * 0.40;         // 40% of overhead
        const dpfAmt = overhead * 0.25;         // 25% of overhead
        const pdfAmt = overhead * 0.25;         // 25% of overhead
        const staffWelfare = overhead * 0.05;   // 5% of overhead
        const studentWelfare = overhead * 0.05; // 5% of overhead

        const projectBalance = total - overhead;
        const grandTotal = overhead + projectBalance; // Equals total

        return {
            idf_amount: flt(idfAmt),
            dpf_amount: flt(dpfAmt),
            pdf_amount: flt(pdfAmt),
            staff_welfare_amount: flt(staffWelfare),
            student_welfare_fund: flt(studentWelfare).toFixed(2), // Data field, stored as string
            project_account_balance: flt(projectBalance),
            grand_total: flt(grandTotal)
        };
    } else {
        // Reset all calculated fields when overhead is 0
        return {
            idf_amount: 0,
            dpf_amount: 0,
            pdf_amount: 0,
            staff_welfare_amount: 0,
            student_welfare_fund: '0',
            project_account_balance: flt(total), // When no overhead, balance = total
            grand_total: flt(total)
        };
    }
}
