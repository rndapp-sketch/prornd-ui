/**
 * Workflow Utilities
 * 
 * Provides dynamic styling for workflow states and actions.
 * Fetches workflow configuration from backend for consistent styling across components.
 */

import { useFrappeGetCall } from 'frappe-react-sdk';
import { useMemo } from 'react';

// --- TYPE DEFINITIONS ---
export interface WorkflowState {
    state: string;
    doc_status: number;
    style: string; // e.g., 'Primary', 'Success', 'Danger', 'Warning', 'Info'
}

export interface WorkflowAction {
    action: string;
    state: string;
    next_state: string;
    allowed: string;
}

export interface WorkflowConfig {
    states: WorkflowState[];
    transitions: WorkflowAction[];
}

// --- STYLE MAPPINGS ---
// Frappe workflow state styles mapped to Tailwind classes

// Status badge styles (for displaying current state)
const STATE_STYLE_MAP: Record<string, { badge: string; text: string; border: string }> = {
    'Primary': {
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        text: 'text-blue-700',
        border: 'border-blue-300'
    },
    'Success': {
        badge: 'bg-green-100 text-green-800 border-green-200',
        text: 'text-green-700',
        border: 'border-green-300'
    },
    'Danger': {
        badge: 'bg-red-100 text-red-800 border-red-200',
        text: 'text-red-700',
        border: 'border-red-300'
    },
    'Warning': {
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        text: 'text-amber-700',
        border: 'border-amber-300'
    },
    'Info': {
        badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
        text: 'text-cyan-700',
        border: 'border-cyan-300'
    },
    'Inverse': {
        badge: 'bg-gray-800 text-white border-gray-700',
        text: 'text-gray-900',
        border: 'border-gray-600'
    },
    'Default': {
        badge: 'bg-gray-100 text-gray-800 border-gray-200',
        text: 'text-gray-600',
        border: 'border-gray-300'
    }
};

// Action button styles based on action type keywords
const ACTION_STYLE_MAP: Record<string, { button: string; hover: string }> = {
    'approve': { button: 'bg-green-600 text-white', hover: 'hover:bg-green-700' },
    'submit': { button: 'bg-blue-600 text-white', hover: 'hover:bg-blue-700' },
    'reject': { button: 'bg-red-600 text-white', hover: 'hover:bg-red-700' },
    'cancel': { button: 'bg-red-500 text-white', hover: 'hover:bg-red-600' },
    'return': { button: 'bg-amber-600 text-white', hover: 'hover:bg-amber-700' },
    'revise': { button: 'bg-amber-500 text-white', hover: 'hover:bg-amber-600' },
    'forward': { button: 'bg-teal-600 text-white', hover: 'hover:bg-teal-700' },
    'recommend': { button: 'bg-purple-600 text-white', hover: 'hover:bg-purple-700' },
    'default': { button: 'bg-[#0EA5A4] text-white', hover: 'hover:bg-[#0D9494]' }
};

// --- UTILITY FUNCTIONS ---

/**
 * Get badge style for a workflow state
 */
export const getStateBadgeStyle = (
    state: string,
    stateConfig?: WorkflowState[]
): string => {
    // Try to find in config first
    if (stateConfig) {
        const config = stateConfig.find(s => s.state === state);
        if (config?.style) {
            return STATE_STYLE_MAP[config.style]?.badge || STATE_STYLE_MAP.Default.badge;
        }
    }

    // Fallback to keyword matching
    const lowerState = state?.toLowerCase() || '';

    if (lowerState.includes('approved') || lowerState.includes('complete') || lowerState.includes('success')) {
        return STATE_STYLE_MAP.Success.badge;
    }
    if (lowerState.includes('reject') || lowerState.includes('cancel') || lowerState.includes('failed')) {
        return STATE_STYLE_MAP.Danger.badge;
    }
    if (lowerState.includes('pending') || lowerState.includes('review') || lowerState.includes('waiting')) {
        return STATE_STYLE_MAP.Warning.badge;
    }
    if (lowerState.includes('submit') || lowerState.includes('progress')) {
        return STATE_STYLE_MAP.Primary.badge;
    }
    if (lowerState.includes('draft')) {
        return STATE_STYLE_MAP.Info.badge;
    }

    return STATE_STYLE_MAP.Default.badge;
};

/**
 * Get button style for a workflow action
 */
export const getActionButtonStyle = (action: string): string => {
    const lowerAction = action?.toLowerCase() || '';

    for (const [keyword, styles] of Object.entries(ACTION_STYLE_MAP)) {
        if (keyword !== 'default' && lowerAction.includes(keyword)) {
            return `${styles.button} ${styles.hover}`;
        }
    }

    return `${ACTION_STYLE_MAP.default.button} ${ACTION_STYLE_MAP.default.hover}`;
};

// --- REACT HOOKS ---

/**
 * Hook to fetch workflow configuration for a doctype
 */
export const useWorkflowConfig = (doctype: string) => {
    const { data: _workflowData, isLoading, error } = useFrappeGetCall<{ message: WorkflowConfig }>(
        'frappe.client.get_list',
        {
            doctype: 'Workflow',
            filters: { document_type: doctype, is_active: 1 },
            fields: ['name'],
            limit_page_length: 1
        },
        doctype ? undefined : null
    );

    // For now, we return empty config and use fallback keyword matching
    // In future, this can be expanded to fetch full workflow states
    return {
        config: null as WorkflowConfig | null,
        isLoading,
        error
    };
};

/**
 * Hook to get dynamic status badge component props
 */
export const useStatusBadge = (doctype: string) => {
    const { config } = useWorkflowConfig(doctype);

    const getStatusStyle = useMemo(() => {
        return (status: string) => getStateBadgeStyle(status, config?.states);
    }, [config]);

    return { getStatusStyle };
};

/**
 * Hook to get dynamic action button component props
 */
export const useActionStyles = () => {
    const getButtonStyle = useMemo(() => {
        return (action: string) => getActionButtonStyle(action);
    }, []);

    return { getButtonStyle };
};

export default {
    getStateBadgeStyle,
    getActionButtonStyle,
    useWorkflowConfig,
    useStatusBadge,
    useActionStyles
};
