import { useCallback } from "react";
import { useFrappePostCall } from "frappe-react-sdk";
import { clearActivityLogCache } from "@/components/ActivityLog";

/**
 * Persists the note a user typed in a workflow-action dialog as a real comment, so it shows in the
 * Activity Log. Most doctypes' perform-action endpoints ignore the inline `comment`, so callers post it
 * here after the action succeeds. Resolves to false (never throws) when the comment could not be saved.
 */
export function useActionComment() {
    const { call } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");
    return useCallback(
        async (doctype: string, docname: string, comment: string): Promise<boolean> => {
            const content = comment.trim();
            if (!content) return true;
            try {
                await call({ doctype, docname, content });
                clearActivityLogCache(doctype, docname);
                return true;
            } catch (error) {
                console.error("add_project_comment failed", error);
                return false;
            }
        },
        [call],
    );
}
