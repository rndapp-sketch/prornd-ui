import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useFrappeGetCall } from "frappe-react-sdk";
import { ArrowRight, UsersRound } from "lucide-react";
import { getPendingTaskRoute } from "@/utils/applicationRoutes";

/**
 * Applications raised by project staff that are waiting on this PI, for the PI home page.
 *
 * Project staff leave the project number and account head to their PI, and the workflow
 * moves the form to "Pending PI Approval". get_pending_application finds these by the
 * applicant's User "piheadmentor_user_id" and tags them `project_staff`; this panel shows
 * just those. Hidden when there is nothing pending.
 */

interface PendingApplicationRecord {
    name: string;
    doctype: string;
    owner: string;
    creation: string;
    username?: string;
    project_staff?: number;
}

const detailsRoute = (doctype: string, name: string) => {
    if (doctype === "Indent Cum Sanction Sheet") return `/indent-cum-sanction-sheet/${name}`;
    if (doctype === "Indent General Form") return `/indent-general-form-details/${name}`;
    return getPendingTaskRoute(doctype, name);
};

export const ProjectStaffApprovalsAlert: React.FC = () => {
    const navigate = useNavigate();
    // Same call (and SWR key) as the "Pending Application (as PI)" page, so it is shared.
    const { data } = useFrappeGetCall<{ message?: { results?: PendingApplicationRecord[] } }>(
        "rndopsapp.rndopsapp.doctype.module_registry.module_registry.get_pending_application",
    );
    const items = React.useMemo(
        () => (data?.message?.results || []).filter((r) => r.project_staff),
        [data],
    );

    if (items.length === 0) return null;

    return (
        <section className="mb-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="mb-2 flex items-center gap-2">
                <UsersRound className="size-4 text-amber-700 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Project staff applications awaiting you ({items.length})
                </h3>
            </div>
            <p className="mb-2 text-xs text-amber-800 dark:text-amber-300">
                Select the project and account head on each application, then forward it.
            </p>
            <ul className="divide-y divide-amber-200/70 overflow-hidden rounded-md border border-amber-200/70 bg-white dark:divide-amber-900/40 dark:border-amber-900/40 dark:bg-zinc-900">
                {items.map((item) => (
                    <li key={`${item.doctype}-${item.name}`}>
                        <button
                            onClick={() => navigate(detailsRoute(item.doctype, item.name))}
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-amber-50 dark:hover:bg-amber-950/30"
                        >
                            <span className="w-40 shrink-0 font-semibold text-zinc-800 dark:text-zinc-100">{item.doctype}</span>
                            <span className="font-mono text-zinc-600 dark:text-zinc-400">{item.name}</span>
                            <span className="min-w-0 flex-1 truncate text-zinc-500 dark:text-zinc-400">
                                {item.username || item.owner}
                            </span>
                            <span className="shrink-0 text-zinc-400">{(item.creation || "").slice(0, 10)}</span>
                            <ArrowRight className="size-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
};

export default ProjectStaffApprovalsAlert;
