import { useEffect, useState } from "react";
import { Loader2, ShieldAlert, UserRoundCog } from "lucide-react";
import { useActingProfile } from "@/hooks/useActingProfile";
import { refreshActingProfiles, switchProfile, SWITCH_REQUEST_EVENT, type ActingErrorType } from "@/lib/actingProfile";

/**
 * Mounted once in the app shell. Hosts: the confirm modal for "Switch account" (opened with
 * requestSwitch(id) from the avatar menu, Profile page or header chip), the one-time dialog for
 * ProfileMismatch / DelegationEnded, and the end-time refresh.
 */
export default function ActingBanner() {
  const { active, profiles } = useActingProfile();
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: Event) => { setSwitchError(null); setPending((e as CustomEvent<string>).detail); };
    window.addEventListener(SWITCH_REQUEST_EVENT, h);
    return () => window.removeEventListener(SWITCH_REQUEST_EVENT, h);
  }, []);

  useEffect(() => {
    if (!pending || busy) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPending(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, busy]);

  const targetLabel = pending === "self" ? "My account" : profiles.find((p) => p.id === pending)?.label ?? "the selected account";
  const confirmSwitch = async () => {
    if (!pending) return;
    setBusy(true);
    setSwitchError(null);
    try {
      await switchProfile(pending); // navigates away on success
    } catch (e: any) {
      setSwitchError(e?.message || "Could not switch account.");
      setBusy(false);
      refreshActingProfiles();
    }
  };
  const [problem, setProblem] = useState<ActingErrorType | null>(null);

  useEffect(() => {
    const h = (e: Event) => setProblem((e as CustomEvent<ActingErrorType>).detail);
    window.addEventListener("acting-profile-error", h);
    return () => window.removeEventListener("acting-profile-error", h);
  }, []);

  // At the end time, refetch so the server's verdict (expired -> own profile) is picked up.
  useEffect(() => {
    if (!active?.valid_till) return;
    const ms = new Date(active.valid_till.replace(" ", "T")).getTime() - Date.now();
    if (isNaN(ms)) return;
    const t = setTimeout(async () => {
      await refreshActingProfiles();
      window.location.reload();
    }, Math.min(Math.max(ms, 0) + 1000, 2 ** 31 - 1));
    return () => clearTimeout(t);
  }, [active?.valid_till]);

  const switchModal = pending && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => !busy && setPending(null)}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="switch-account-title"
        className="w-full max-w-sm rounded-2xl border border-white/60 bg-white p-6 text-center shadow-2xl dark:border-white/10 dark:bg-[#27272A]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300">
          <UserRoundCog className="h-5 w-5" />
        </div>
        <h3 id="switch-account-title" className="text-[16px] font-bold text-[#243040] dark:text-[#E4E4E7]">Switch account</h3>
        <p className="mt-1 text-[13px] font-semibold text-[#6842D9] dark:text-violet-300">{targetLabel}</p>
        <p className="mt-2 text-[13px] text-[#52525B] dark:text-[#A1A1AA]">
          Switching account reloads the app. Any unsaved changes will be lost. Continue?
        </p>
        {switchError && <p className="mt-2 text-[12px] font-semibold text-red-600">{switchError}</p>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={() => setPending(null)}
            disabled={busy}
            className="h-10 flex-1 rounded-lg border border-zinc-300 text-[13px] font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-700/40"
          >
            Cancel
          </button>
          <button
            onClick={confirmSwitch}
            disabled={busy}
            autoFocus
            className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#6842D9] text-[13px] font-bold text-white hover:bg-[#5a37c4] disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}Continue
          </button>
        </div>
      </div>
    </div>
  );

  if (!problem) return <>{switchModal}</>;

  return (
    <>
    {switchModal}
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl dark:bg-[#27272A]">
        <ShieldAlert className="mx-auto mb-3 h-9 w-9 text-amber-500" />
        <h3 className="text-[16px] font-bold text-[#243040] dark:text-[#E4E4E7]">
          {problem === "DelegationEnded" ? "Delegation ended" : "Profile changed"}
        </h3>
        <p className="mt-2 text-[13px] text-[#52525B] dark:text-[#A1A1AA]">
          {problem === "DelegationEnded"
            ? "Your delegated role has expired or was revoked, and you are back on your own profile. The action was not performed."
            : "Your profile was changed in another tab or session. The action was not performed. The app will reload with your current profile; please repeat the action."}
        </p>
        <button onClick={() => window.location.reload()} className="mt-5 h-10 w-full rounded-lg bg-[#D97757] text-[13px] font-bold text-white hover:bg-[#c96b4e]">
          Reload
        </button>
      </div>
    </div>
    </>
  );
}
