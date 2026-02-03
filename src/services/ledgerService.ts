import type { CommitRecord } from '../types/ledgerTypes';

const LEDGER_API_BASE = '/ledger-api';

/**
 * Service to interact with the external Ledger/Go API service.
 * Proxied via /ledger-api in vite.config.ts
 */
export const ledgerService = {
    /**
     * Get payments by account head ID
     * Endpoint: /api/account-head-payments/account-head/{accountHeadId}
     */
    getPaymentsByAccountHead: async (accountHeadId: number | string) => {
        const response = await fetch(`${LEDGER_API_BASE}/account-head-payments/account-head/${accountHeadId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch payments for account head ${accountHeadId}`);
        }
        return await response.json();
    },

    /**
     * Get commits by status
     * Endpoint: /api/account-head-commit/by-status/{status}
     * Statuses: SETTLED, PARTIALLY_PAID, OVERPAYMENT, COMMITTED, PENDING
     */
    getCommitsByStatus: async (status: string): Promise<CommitRecord[]> => {
        const response = await fetch(`${LEDGER_API_BASE}/account-head-commit/by-status/${status}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch commits with status ${status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    },

    /**
     * Get commits by account head ID
     * Endpoint: /api/account-head-commit/by-account-head/{accountHeadId}
     */
    getCommitsByAccountHead: async (accountHeadId: number | string): Promise<CommitRecord[]> => {
        const response = await fetch(`${LEDGER_API_BASE}/account-head-commit/by-account-head/${accountHeadId}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch commits for account head ${accountHeadId}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    },

    /**
     * Get commits by account head ID and status
     * Endpoint: /api/account-head-commit/by-account-head/{accountHeadId}/status/{status}
     */
    getCommitsByAccountHeadAndStatus: async (accountHeadId: number | string, status: string): Promise<CommitRecord[]> => {
        const response = await fetch(`${LEDGER_API_BASE}/account-head-commit/by-account-head/${accountHeadId}/status/${status}`);
        if (!response.ok) {
            throw new Error(`Failed to fetch commits for account head ${accountHeadId} and status ${status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    }
};
