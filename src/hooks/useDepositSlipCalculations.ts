import { useEffect, useRef } from "react";

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
  depositSlipType: string,
) => {
  // Use refs to avoid dependency issues
  const formDataRef = useRef(formData);
  const lastSignatureRef = useRef("");

  // Keep ref in sync
  formDataRef.current = formData;

  // Build signature for comparison (only input fields that trigger calculation)
  const getSignature = (): string => {
    if (depositSlipType === "research_consultancy") {
      const amount = flt(formData.amount_inclusive_gst_capital);
      const multiplier = flt(formData.overhead_multiplier) || 15;

      // Signature includes table structure to trigger calc on Add/Remove/LabelChange
      // CRITICAL: Do NOT include calculated fields (amount, pdf_percentage) to avoid loops!
      const table = formData.credit_distribution || [];
      const tableSig = table
        .map((r: any) => {
          const label = r.label || "";
          const isPdf = label.toUpperCase().startsWith(RC_SHARE_LABEL_KEY);
          if (isPdf) return `P:${label}`; // Only track label existence for PDF
          return `O:${label}:${r.percentage_of_overhead}`; // Track user input % for others
        })
        .join("|");

      return `rc:${amount}:${multiplier}:${tableSig}`;
    } else if (depositSlipType === "d_consultancy") {
      // For D Consultancy, track ONLY the amount that triggers full recalculation
      // Do NOT track Y or Z in signature to allow user manual edits without interference
      const amount = flt(formData.amount_inclusive_of_gst);

      return `dc:${amount}`;
    } else if (depositSlipType === "t_testing") {
      const amount = flt(formData.amount_inclusive_of_gst);
      const cgst = flt(formData.cgst_9);
      const sgst = flt(formData.sgst_9);
      const multiplier = flt(formData.overhead_multiplier) || 0.7;

      // Similar logic for T-Testing
      const table = formData.credit_distribution || [];
      const tableSig = table
        .map((r: any) => `T:${r.percentage_of_overhead}`)
        .join("|");

      return `tt:${amount}:${cgst}:${sgst}:${multiplier}:${tableSig}`;
    } else if (depositSlipType === "research_deposit_slip") {
      // Research Deposit Slip - trigger on total_amount or overhead_amount changes
      // For DPF/PDF tables: only track row COUNT (percentages are auto-calculated, not user input)
      // For other tables: track user-editable percentages
      const total = flt(formData.total_amount);
      const overhead = flt(formData.overhead_amount);
      const childTableSigs = Object.keys(formData)
        .filter(
          (k) =>
            Array.isArray(formData[k]) &&
            formData[k].length > 0 &&
            typeof formData[k][0] === "object",
        )
        .map((k) => {
          const rows = formData[k];
          const sample = rows[0];
          // DPF/PDF tables have auto-split percentages — only track row count to avoid loops
          const isPdfDpf =
            "dpf_percentage" in sample || "pdf_percentage" in sample;
          if (isPdfDpf) {
            return `${k}:count:${rows.length}`;
          }
          const rowSig = rows
            .map((r: any) => {
              const pct = r.percentage_of_overhead ?? r.percentage ?? "";
              return `${pct}`;
            })
            .join(",");
          return `${k}:${rowSig}`;
        })
        .join("|");
      return `rds:${total}:${overhead}:${childTableSigs}`;
    } else if (depositSlipType === "e_non_routine") {
      const amount = flt(formData.amount_inclusive_of_gst);
      const incomeTaxTds = flt(formData.income_tax_tds);
      const gstTds2 = flt(formData.gst_tds_2);
      const cgst9 = flt(formData.cgst_9);
      const sgst9 = flt(formData.sgst_9);
      const igst18 = flt(formData.igst_18);
      const multiplier = flt(formData.overhead_multiplier) || 0.3;
      return `enr:${amount}:${incomeTaxTds}:${gstTds2}:${cgst9}:${sgst9}:${igst18}:${multiplier}`;
    }
    return "";
  };

  const currentSignature = getSignature();

  useEffect(() => {
    // Guard: unsupported type
    if (
      !["research_consultancy", "t_testing", "research_deposit_slip", "d_consultancy", "e_non_routine"].includes(
        depositSlipType,
      )
    ) {
      return;
    }

    // Guard: no change in inputs (Prevents Loop)
    if (currentSignature === lastSignatureRef.current) {
      return;
    }

    // Guard: skip if zero/empty inputs - BUT update last signature to avoid re-runs
    const data = formDataRef.current;
    if (
      depositSlipType === "research_consultancy" &&
      flt(data.amount_inclusive_gst_capital) <= 0
    ) {
      lastSignatureRef.current = currentSignature;
      return;
    }
    if (
      depositSlipType === "d_consultancy" &&
      flt(data.amount_inclusive_of_gst) <= 0
    ) {
      lastSignatureRef.current = currentSignature;
      return;
    }
    if (
      depositSlipType === "t_testing" &&
      flt(data.amount_inclusive_of_gst) <= 0
    ) {
      lastSignatureRef.current = currentSignature;
      return;
    }
    // Research Deposit Slip: allow calculation even if overhead is 0 (to reset fields)
    // Only skip if both values are empty
    if (
      depositSlipType === "research_deposit_slip" &&
      flt(data.total_amount) <= 0 &&
      flt(data.overhead_amount) <= 0
    ) {
      lastSignatureRef.current = currentSignature;
      return;
    }
    if (
      depositSlipType === "e_non_routine" &&
      flt(data.amount_inclusive_of_gst) <= 0
    ) {
      lastSignatureRef.current = currentSignature;
      return;
    }

    console.log(
      `useDepositSlipCalculations [${depositSlipType}]: Calculating...`,
    );

    // Update signature reference immediately
    lastSignatureRef.current = currentSignature;

    let updates: FormData = {};

    if (depositSlipType === "research_consultancy") {
      updates = calculateResearchConsultancy(data);
    } else if (depositSlipType === "d_consultancy") {
      updates = calculateDConsultancy(data);
    } else if (depositSlipType === "t_testing") {
      updates = calculateTTesting(data);
    } else if (depositSlipType === "research_deposit_slip") {
      updates = calculateResearchDeposit(data);
    } else if (depositSlipType === "e_non_routine") {
      updates = calculateENonRoutine(data);
    }

    setFormData((prev) => ({ ...prev, ...updates }));
  }, [currentSignature, depositSlipType, setFormData]);

  return null;
};

// =============================================================
// E NON-ROUTINE CALCULATIONS
// =============================================================
const ENR_DEFAULT_ROWS = [
  { label: "IDF", percentage_of_overhead: 40 },
  { label: "DPF (CE)", percentage_of_overhead: 50 },
  { label: "Student Welfare Fund", percentage_of_overhead: 5 },
  { label: "Staff Welfare Fund", percentage_of_overhead: 5 },
];

function calculateENonRoutine(formData: FormData): FormData {
  const amountInclGst = flt(formData.amount_inclusive_of_gst);
  const incomeTaxTds = flt(formData.income_tax_tds);
  const gstTds2 = flt(formData.gst_tds_2);
  const cgst9 = flt(formData.cgst_9);
  const sgst9 = flt(formData.sgst_9);
  const igst18 = flt(formData.igst_18);
  const multiplier = flt(formData.overhead_multiplier) || 0.3;

  // Step 1: Amount Actually Received
  const amountActuallyReceived = flt(amountInclGst - incomeTaxTds - gstTds2);

  // Step 2: Consultancy Fee X (after GST deduction)
  let consultancyFeeX: number;
  if (igst18 > 0) {
    consultancyFeeX = flt(amountActuallyReceived - igst18);
  } else {
    consultancyFeeX = flt(amountActuallyReceived - cgst9 - sgst9);
  }

  // Step 3: Overhead
  const overheadAmount = flt(multiplier * consultancyFeeX);

  // Step 4: credit_distribution — pre-fill if empty, always recalculate amounts
  const existingRows: any[] = Array.isArray(formData.credit_distribution) && formData.credit_distribution.length > 0
    ? formData.credit_distribution
    : ENR_DEFAULT_ROWS.map(r => ({ ...r }));

  const creditDistribution = existingRows.map((row: any) => ({
    ...row,
    amount: flt(overheadAmount * (flt(row.percentage_of_overhead) / 100)),
  }));

  // Step 5: Balance In Project & Total Budget
  // GST component: use IGST if non-zero, otherwise CGST+SGST
  const gstComponent = igst18 > 0 ? igst18 : flt(cgst9 + sgst9);
  const balanceInProject = flt(consultancyFeeX - overheadAmount);
  const creditSum = creditDistribution.reduce((s: number, r: any) => s + flt(r.amount), 0);
  const totalBudget = flt(creditSum + gstComponent + balanceInProject);

  return {
    overhead_multiplier: multiplier,
    amount_actually_received: amountActuallyReceived,
    consultancy_fee_x: consultancyFeeX,
    overhead_amount: overheadAmount,
    credit_distribution: creditDistribution,
    balance_in_project: balanceInProject,
    total_budget: totalBudget,
  };
}

// =============================================================
// RESEARCH CONSULTANCY CALCULATIONS
// =============================================================
function calculateResearchConsultancy(formData: FormData): FormData {
  const totalInclusive = flt(formData.amount_inclusive_gst_capital);
  const multiplier = flt(formData.overhead_multiplier) || 15;

  const projectBalance = flt(totalInclusive / 1.18);
  const cgst = flt(projectBalance * 0.09);
  const sgst = flt(projectBalance * 0.09);
  const overheadAmount = flt(projectBalance * (multiplier / (100 + multiplier)));
  const projectAmount = flt(projectBalance - overheadAmount);
  const idfAmt = flt(overheadAmount * (RC_PCT_IDF / 100));
  const dpfAmt = flt(overheadAmount * (RC_PCT_DPF / 100));
  const staffAmt = flt(overheadAmount * (RC_PCT_STAFF_WELFARE / 100));
  const studentAmt = flt(overheadAmount * (RC_PCT_STUDENT_WELFARE / 100));

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
        return {
          ...row,
          amount: flt(overheadAmount * (row.percentage_of_overhead / 100)),
        };
      }
      return row;
    });

    if (poolIndices.length > 0) {
      const sharePercentage = RC_SHARE_POOL_PERCENT / poolIndices.length;
      const shareAmount = overheadAmount * (sharePercentage / 100);
      poolIndices.forEach((i) => {
        updatedDist[i] = {
          ...updatedDist[i],
          percentage_of_overhead: flt(sharePercentage),
          amount: flt(shareAmount),
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
    overhead_multiplier: multiplier,
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

  // Recalculate amounts in any child table rows that have percentage fields.
  // This handles (B) DPF Credit Distribution and (C) PDF Credit Distribution tables
  // whose row amounts depend on overhead_amount.
  const childTableUpdates: FormData = {};
  for (const key of Object.keys(formData)) {
    const val = formData[key];
    if (!Array.isArray(val) || val.length === 0 || typeof val[0] !== "object")
      continue;

    // Check if rows have a percentage-like field paired with an amount-like field
    const sample = val[0];
    const pctField =
      "dpf_percentage" in sample
        ? "dpf_percentage"
        : "pdf_percentage" in sample
          ? "pdf_percentage"
          : "percentage_of_overhead" in sample
            ? "percentage_of_overhead"
            : "percentage" in sample
              ? "percentage"
              : null;
    const amtField =
      "dpf_amount" in sample
        ? "dpf_amount"
        : "pdf_amount" in sample
          ? "pdf_amount"
          : "amount" in sample
            ? "amount"
            : null;

    if (pctField && amtField) {
      const isPdfDpf =
        pctField === "dpf_percentage" || pctField === "pdf_percentage";
      if (isPdfDpf) {
        // Auto-split 25% pool evenly across all rows
        const POOL = 25;
        const n = val.length;
        const splitPct = n > 0 ? flt(POOL / n) : 0;
        let remaining = flt(POOL);
        childTableUpdates[key] = val.map((row: any, i: number) => {
          const isLast = i === n - 1;
          const pct = isLast ? remaining : splitPct;
          remaining = flt(remaining - pct);
          return {
            ...row,
            [pctField]: pct,
            [amtField]: flt(overhead * (pct / 100)),
          };
        });
      } else {
        childTableUpdates[key] = val.map((row: any) => {
          const pct = flt(row[pctField]);
          return { ...row, [amtField]: flt(overhead * (pct / 100)) };
        });
      }
    }
  }

  if (overhead > 0) {
    const idfAmt = overhead * 0.4; // 40% of overhead
    const dpfAmt = overhead * 0.25; // 25% of overhead
    const pdfAmt = overhead * 0.25; // 25% of overhead
    const staffWelfare = overhead * 0.05; // 5% of overhead
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
      grand_total: flt(grandTotal),
      ...childTableUpdates,
    };
  } else {
    // Reset all calculated fields when overhead is 0
    // Also zero out child table amounts
    const zeroedTables: FormData = {};
    for (const [key, rows] of Object.entries(childTableUpdates)) {
      const sample = (rows as any[])[0];
      const amtField =
        "dpf_amount" in sample
          ? "dpf_amount"
          : "pdf_amount" in sample
            ? "pdf_amount"
            : "amount" in sample
              ? "amount"
              : null;
      if (amtField) {
        zeroedTables[key] = (rows as any[]).map((row: any) => ({
          ...row,
          [amtField]: 0,
        }));
      }
    }

    return {
      idf_amount: 0,
      dpf_amount: 0,
      pdf_amount: 0,
      staff_welfare_amount: 0,
      student_welfare_fund: "0",
      project_account_balance: flt(total), // When no overhead, balance = total
      grand_total: flt(total),
      ...zeroedTables,
    };
  }
}

// =============================================================
// D CONSULTANCY CALCULATIONS (Frappe Backend Logic)
// =============================================================
function calculateDConsultancy(formData: FormData): FormData {
  const amountInclGst = flt(formData.amount_inclusive_of_gst);

  if (amountInclGst <= 0) {
    return {
      igst_18_on_consultancy: 0,
      amount_after_gst_tds: 0,
      total_cost_x: 0,
      consultancy_charge_y: 0,
      operational_charge_z: 0,
      overhead_from_y_amount: 0,
      overhead_from_z_amount: 0,
      total_overhead_amount: 0,
      institute_share_amount: 0,
      total_overhead_institute_share: 0,
      idf_percentage: 40,
      idf_amount: 0,
      dpf_amount: 0,
      staff_welfare_amount: 0,
      student_welfare_amount: 0,
      balance_consultancy_fee: 0,
      balance_operation_charge: 0,
      total_gst: 0,
      total_amount: 0,
    };
  }

  // === GST CALCULATIONS ===
  const taxableAmount = flt(amountInclGst / 1.18);
  const igstAmount = flt(taxableAmount * 0.18);
  const tdsAmount = Math.round(taxableAmount * 0.02);
  const amountAfterTds = flt(amountInclGst - tdsAmount);
  const totalCostX = flt(amountAfterTds - igstAmount);

  // === Y AND Z SPLIT ===
  const chargeY = flt(totalCostX * 0.30);
  const chargeZ = flt(totalCostX - chargeY);

  // === OVERHEAD AND DISTRIBUTION CALCULATIONS ===
  const overheadFromY = flt(chargeY * 0.1);
  const overheadFromZ = flt(chargeZ * 0.1);
  const totalOverhead = flt(overheadFromY + overheadFromZ);
  const instituteShare = flt(chargeY * 0.2);
  const totalOverheadAndShare = flt(totalOverhead + instituteShare);

  // === CREDIT DISTRIBUTION ===
  // IDF percentage defaults to 40% (user-editable)
  const idfPercentage = flt(formData.idf_percentage) || 40;
  const idfAmt = flt(totalOverheadAndShare * (idfPercentage / 100));

  // Staff and Student welfare are FIXED at 5% each
  const staffWelfareAmt = flt(totalOverheadAndShare * 0.05);
  const studentWelfareAmt = flt(totalOverheadAndShare * 0.05);

  // DPF total is calculated based on user-entered row percentages
  // Total DPF = 100% - IDF% - Staff 5% - Student 5%
  const totalDpfPercentage = flt(100 - idfPercentage - 5 - 5);
  const dpfAmt = flt(totalOverheadAndShare * (totalDpfPercentage / 100));

  // === UPDATE DPF CHILD TABLE (Similar to Research Consultancy) ===
  const currentDpfDist = formData.dpf_credit_distributions || [];
  let updatedDpfDist = [...currentDpfDist];

  if (currentDpfDist.length > 0) {
    updatedDpfDist = currentDpfDist.map((row: any) => {
      const rowPercentage = flt(row.dpf_percentage || 0);
      const rowAmount = flt(totalOverheadAndShare * (rowPercentage / 100));
      return {
        ...row,
        dpf_amount: rowAmount,
      };
    });
  }

  // === FINAL BALANCES ===
  const balanceConsultancyFee = flt(chargeY - overheadFromY - instituteShare);
  const balanceOperationCharge = flt(chargeZ - overheadFromZ);
  const totalGst = igstAmount;
  const totalAmount = amountAfterTds;

  return {
    igst_18_on_consultancy: igstAmount,
    amount_after_gst_tds: amountAfterTds,
    total_cost_x: totalCostX,
    consultancy_charge_y: chargeY,
    operational_charge_z: chargeZ,
    overhead_from_y_amount: overheadFromY,
    overhead_from_z_amount: overheadFromZ,
    total_overhead_amount: totalOverhead,
    institute_share_amount: instituteShare,
    total_overhead_institute_share: totalOverheadAndShare,
    idf_percentage: idfPercentage,
    idf_amount: idfAmt,
    dpf_amount: dpfAmt,
    staff_welfare_amount: staffWelfareAmt,
    student_welfare_amount: studentWelfareAmt,
    balance_consultancy_fee: balanceConsultancyFee,
    balance_operation_charge: balanceOperationCharge,
    total_gst: totalGst,
    total_amount: totalAmount,
    dpf_credit_distributions: updatedDpfDist,
  };
}
