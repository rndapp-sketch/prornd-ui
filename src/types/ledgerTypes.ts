export interface CommitRecord {
    transactionCommitNumber: number | null;
    projectNumber: string;
    accountHeadId: number;
    transactionReceivedRefNumber: number;
    commitDate: string;
    commitParticular: string;
    refDetails: string;
    commitAmount: number;
    status: 'COMMITTED' | 'SETTLED' | 'PARTIALLY_PAID' | 'OVERPAYMENT' | 'PENDING';
    billAmount: number | null;
    moduleId: string | null;
    frapAppId: string | null;
    /** Set client-side when merging project and overhead commits; their ids collide. */
    source?: 'project' | 'overhead';
}

/** What a settlement commit actually nets to once the advance paid against its parent is offset. */
export interface SettlementNet {
    bill: number;
    paidAcrossChain: number;
    /** bill − paidAcrossChain; negative means the excess advance is recovered from the applicant. */
    net: number;
}

export interface LedgerPaymentRecord {
    // Helper interface for payments returned by the ledger API, if different from the Frappe one.
    // Based on "Get payments by account head ID", assuming it returns similar structure or we might need to adjust.
    // For now, I'll define it based on common fields or generic structure until I see the response.
    // But primarily we need the CommitRecord for the "Pending Commits" list.
    transactionPaymentNumber?: number;
    projectNumber?: string;
    accountHeadId?: number;
    paymentAmount?: number;
    paymentDate?: string;
    paymentParticulars?: string;
    // Add other fields as discovered
}
