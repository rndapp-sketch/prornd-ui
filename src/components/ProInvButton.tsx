import * as React from "react";
import { useFrappeGetCall } from "frappe-react-sdk";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { proformaInvoiceAPI } from "@/services/apiService";

const APPROVED_CLASS =
    "border-green-600 bg-green-600 text-white hover:border-green-700 hover:bg-green-700 hover:text-white dark:border-green-600 dark:bg-green-600 dark:text-white dark:hover:bg-green-700";

// "Pro Inv" button that turns green once the HoS has approved the project's
// Proforma Invoice. Goes through get_proforma_invoice rather than a doc list
// because the doctype is only readable by a few roles.
export default function ProInvButton({
    projectKey,
    className,
    children,
    ...props
}: React.ComponentProps<typeof Button> & { projectKey: string }) {
    // Same SWR key as ProInvForm, so the form and this button share one result.
    const { data } = useFrappeGetCall<{ message: { workflow_state?: string } | null }>(
        proformaInvoiceAPI.get,
        { project_no: projectKey },
        projectKey ? `proinv-proj-${projectKey}` : null,
        { revalidateOnFocus: false, revalidateOnMount: true },
    );
    const isApproved = data?.message?.workflow_state === "Approved";

    return (
        <Button
            variant="outline"
            className={cn(className, isApproved && APPROVED_CLASS)}
            title={isApproved ? "Proforma Invoice approved by HoS" : undefined}
            {...props}
        >
            {children}
        </Button>
    );
}
