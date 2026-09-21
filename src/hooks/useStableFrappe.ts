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
    // Options go in the 4th (SWR config) argument. The 3rd argument is the SWR cache
    // key — passing an options object there makes every caller share one cache entry.
    const { enabled = !!docname, ...swrOptions } = options ?? {};
    return useFrappeGetDoc<T>(doctype, docname ?? "", enabled ? undefined : null, {
        ...swrOptions,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
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
    // `enabled: false` disables the request via a null SWR key (see useStableFrappeGetDoc).
    const { enabled = true, ...swrOptions } = options ?? {};
    return useFrappeGetCall<T>(method, params, enabled ? undefined : null, {
        ...swrOptions,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
    });
}
