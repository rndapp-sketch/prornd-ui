import React from "react";
import { useFrappeAuth, useFrappeGetCall } from "frappe-react-sdk";
import { CancellationStatusBanner } from "./CancellationStatusBanner";

/** Cancellation state of an application; `hasPending` means workflow movement must be locked. */
export function useCancellationLock(doctype: string, name?: string | null) {
    const { data } = useFrappeGetCall<{
        message: { has_pending: boolean; has_cancellation: boolean; cancellation_requests: any[] };
    }>(
        "rndopsapp.rndopsapp.cancellation_api.get_cancellation_status",
        { reference_doctype: doctype, reference_name: name },
        name ? undefined : null,
    );
    return {
        hasPending: !!data?.message?.has_pending,
        hasCancellation: !!data?.message?.has_cancellation,
        requests: data?.message?.cancellation_requests ?? [],
    };
}

/** Self-contained banner: renders nothing unless the application has a cancellation request. */
export const CancellationLockBanner: React.FC<{ doctype: string; name?: string | null }> = ({ doctype, name }) => {
    const { currentUser } = useFrappeAuth();
    const { hasCancellation, requests } = useCancellationLock(doctype, name);
    if (!hasCancellation) return null;
    return (
        <div className="my-3">
            <CancellationStatusBanner requests={requests} currentUser={currentUser} />
        </div>
    );
};

/** Wraps a workflow action-button component so it renders nothing while a cancellation is pending. */
export function withCancellationLock<P extends object>(
    Component: React.ComponentType<P>,
    doctype: string,
    getName: (props: P) => string | undefined,
): React.FC<P> {
    const Locked: React.FC<P> = (props) => {
        const { hasPending } = useCancellationLock(doctype, getName(props));
        if (hasPending) return null;
        return <Component {...props} />;
    };
    return Locked;
}
