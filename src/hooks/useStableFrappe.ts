import { useFrappeGetDoc, useFrappeGetCall } from 'frappe-react-sdk';

// Custom wrapper hooks that disable revalidation on focus/reconnect
// This prevents the loading state from showing when switching windows

type SwrConfigOptions = {
    enabled?: boolean;
    revalidateOnFocus?: boolean;
    revalidateOnReconnect?: boolean;
    refreshInterval?: number;
    [key: string]: any;
};

/**
 * Wrapper around useFrappeGetDoc that disables revalidation on window focus
 * Use this instead of useFrappeGetDoc to prevent loading indicators when switching apps
 */
export function useStableFrappeGetDoc<T = any>(
    doctype: string,
    docname: string | null | undefined,
    options?: SwrConfigOptions
) {
    return useFrappeGetDoc<T>(doctype, docname ?? "", {
        ...options,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        enabled: options?.enabled !== undefined ? options.enabled : !!docname,
    });
}

/**
 * Wrapper around useFrappeGetCall that disables revalidation on window focus
 * Use this instead of useFrappeGetCall to prevent loading indicators when switching apps
 */
export function useStableFrappeGetCall<T = any>(
    method: string,
    params?: Record<string, any>,
    options?: SwrConfigOptions
) {
    return useFrappeGetCall<T>(method, params, {
        ...options,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    });
}
