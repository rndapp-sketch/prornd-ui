import { useEffect, useState } from "react";
import { useFrappeAuth, useFrappeGetCall, useFrappePostCall } from "frappe-react-sdk";
import { RotateCcw } from "lucide-react";
import { putBackAPI } from "@/services/apiService";
import { CommentModal } from "@/components/CommentModal";
import { clearActivityLogCache } from "@/components/ActivityLog";
import { useUserRoles } from "@/components/UserRole";

// Workflow hierarchy, lowest level first. A put back may only go to a level
// strictly below the document's current state. States not listed are not ranked
// and are never filtered out by this list.
const STATE_HIERARCHY = [
    "Draft",
    "Pending Other PI",
    "Pending PI Approval",
    "Pending Mentor Approval",
    "Pending Head Approval",
    "Pending HoD Approval",
    "Pending Staff Approval",
    "Pending HoS Approval",
    "Pending RnD Approval",
    "Pending Associate Dean Approval",
    "Pending Dean Approval",
    "Pending Director Approval",
    "Approved",
    "Pending Staff Verification",
    "RDP-11 Verified",
    "Sanction Sheet Generated",
    "Sanction Sheet Printed",
    "Sanction Approved",
    "POGenerated",
];
const rank = (state: string) => STATE_HIERARCHY.indexOf(state);

// Highest approval level each role may put a document back to. Approval levels
// above it (up to "Approved") are hidden; the post-approval steps stay available.
const ROLE_CEILING: Record<string, string> = {
    "staff, RnD": "Pending Staff Approval",
    "Hos, RnD (Head of Section, RnD)": "Pending HoS Approval",
    "Dean, RnD": "Pending Dean Approval",
    Director: "Pending Director Approval",
};

const roleStatesCache = new Map<string, Promise<string[] | null>>();

// Show the level, not the workflow state: "Pending Staff Approval" -> "Staff", "Draft" -> "PI".
export const putBackLabel = (state: string) => {
    if (state === "Draft" || state === "Pending PI Approval") return "PI";
    const m = state.match(/^Pending (.+?)(?: Approval)?$/);
    return m ? m[1] : state;
};

/**
 * Universal "Put Back" for workflow action buttons. The backend returns only the
 * states below the document's current level, so a user can send a document back
 * to a lower level (e.g. staff -> PI / Head) but never above their own.
 */
export const usePutBack = (
    doctype: string,
    docname: string | undefined,
    onDone?: () => void,
) => {
    const { currentUser } = useFrappeAuth();
    const { data, mutate } = useFrappeGetCall<{
        message: { status: string; states?: string[] };
    }>(docname ? putBackAPI.getStates : (null as unknown as string), { doctype, docname: docname ?? "" });
    const { call: setState, loading } = useFrappePostCall<{
        message: { status: string; message?: string };
    }>(putBackAPI.setState);
    const { data: traceData } = useFrappeGetCall<{ message: any }>(
        docname ? putBackAPI.getHistoryTrace : (null as unknown as string),
        { doctype, docname: docname ?? "" },
    );
    const { call: fetchRoleStates } = useFrappePostCall<{
        message: { status: string; states?: string[] };
    }>(putBackAPI.getStatesForRole);
    const { call: addComment } = useFrappePostCall("rndopsapp.rndopsapp.api.add_project_comment");

    const { data: stateData } = useFrappeGetCall<{ message: { workflow_state?: string } }>(
        docname ? "frappe.client.get_value" : (null as unknown as string),
        { doctype, filters: docname ?? "", fieldname: "workflow_state" },
    );
    const currentState = stateData?.message?.workflow_state || "";

    // States the user's roles are allowed to put back to (null = unavailable, don't restrict).
    const { roles } = useUserRoles(currentUser ?? null);
    const rolesKey = [...roles].sort().join("|");
    const [roleStates, setRoleStates] = useState<string[] | null>(null);
    useEffect(() => {
        if (!roles.length) return;
        let cancelled = false;
        Promise.all(
            roles.map((role: string) => {
                const key = `${doctype}::${role}`;
                if (!roleStatesCache.has(key)) {
                    roleStatesCache.set(
                        key,
                        fetchRoleStates({ doctype, role })
                            .then((res) => (res?.message?.status === "success" ? res.message.states || [] : null))
                            .catch(() => null),
                    );
                }
                return roleStatesCache.get(key)!;
            }),
        ).then((lists) => {
            if (cancelled) return;
            const ok = lists.filter((l): l is string[] => l !== null);
            setRoleStates(ok.length ? [...new Set(ok.flat())] : null);
        });
        return () => {
            cancelled = true;
        };
    }, [doctype, rolesKey]);

    const [target, setTarget] = useState<string | null>(null);

    const currentRank = rank(currentState);
    const ceilings = roles.filter((r: string) => r in ROLE_CEILING).map((r: string) => rank(ROLE_CEILING[r]));
    const ceiling = ceilings.length ? Math.max(...ceilings) : -1;
    const approvedRank = rank("Approved");
    // Nearest level below the current state first, following the workflow hierarchy.
    // Targets are the states the document actually passed through, from the workflow history
    // trace. Only when the trace returns nothing do we fall back to the document's own
    // transitions and the user's roles.
    const traceMsg = traceData?.message;
    const traceHops: any[] = Array.isArray(traceMsg)
        ? traceMsg
        : traceMsg?.hops ?? traceMsg?.trace ?? traceMsg?.history ?? traceMsg?.transitions ?? traceMsg?.steps ?? [];
    const traced = [
        traceMsg?.started_from_state,
        ...traceHops.map((h) => h?.from_state ?? h?.from ?? h?.state),
    ].filter((st): st is string => typeof st === "string" && !!st);
    const candidates = traced.length
        ? [...new Set(traced)]
        : [
              ...new Set([
                  ...(data?.message?.status === "success" ? data.message.states || [] : []),
                  ...(roleStates ?? []),
              ]),
          ];
    // Nothing sits below Draft, and until the current state has loaded nothing can be
    // ranked against it — offer no put back in either case.
    const states = (!currentState || currentState === "Draft" ? [] : candidates)
        .filter(
            (st) =>
                !(currentRank >= 0 && rank(st) >= currentRank) &&
                !(ceiling >= 0 && rank(st) > ceiling && rank(st) < approvedRank) &&
                // only approval levels (PI, Head, Staff, HoS, Dean...) — not post-approval steps
                !(rank(st) >= approvedRank),
        )
        .sort((a, b) => rank(b) - rank(a))
        // Draft and Pending PI Approval both read "PI" — list each level once.
        .filter((st, i, arr) => arr.findIndex((o) => putBackLabel(o) === putBackLabel(st)) === i);

    const confirm = async (comment: string) => {
        if (!target || !docname) return;
        try {
            const res = await setState({
                doctype,
                docname,
                state: target,
                username: currentUser || "",
                comment,
            });
            if (res?.message?.status !== "success") {
                alert(res?.message?.message || "Put Back failed");
                return;
            }
            if (comment.trim()) {
                try {
                    await addComment({ doctype, docname, content: comment.trim() });
                } catch {
                    // comment failure is non-fatal
                }
            }
            clearActivityLogCache(doctype, docname);
            setTarget(null);
            mutate();
            onDone?.();
        } catch {
            alert("An error occurred while putting the document back.");
        }
    };

    /** Dropdown section; render inside the actions menu. `onPick` should close the menu. */
    const menu = (onPick?: () => void, showDivider = true) =>
        states.length > 0 ? (
            <>
                {showDivider && <div className="h-px bg-zinc-100 dark:bg-zinc-700 mx-3" />}
                <div className="px-4 pt-2 pb-1 text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                    Put Back
                </div>
                {states.map((st) => (
                    <button
                        key={st}
                        onClick={() => {
                            onPick?.();
                            setTarget(st);
                        }}
                        disabled={loading}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] font-semibold text-left transition-colors disabled:cursor-not-allowed text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Put to {putBackLabel(st)}
                    </button>
                ))}
            </>
        ) : null;

    const modal = (
        <CommentModal
            isOpen={!!target}
            onClose={() => setTarget(null)}
            onSubmit={confirm}
            action={`Put to ${target ? putBackLabel(target) : ""}`}
            isLoading={loading}
        />
    );

    return { hasPutBack: states.length > 0, states, begin: setTarget, loading, menu, modal };
};
