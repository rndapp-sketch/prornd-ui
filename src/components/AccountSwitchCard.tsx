import { Check, UserRoundCog } from "lucide-react";
import { Link } from "react-router-dom";
import { useActingProfile } from "@/hooks/useActingProfile";
import { requestSwitch } from "@/lib/actingProfile";

/** Profile-page card: accounts that were assigned to this user, with a Switch button. */
export default function AccountSwitchCard() {
  const { enabled, current, profiles, isActing } = useActingProfile();
  if (!enabled) return null;

  const assigned = profiles.filter((p) => p.id !== "self");
  const choose = (id: string) => { if (id !== current) requestSwitch(id); };

  const Row = ({ id, title, sub }: { id: string; title: string; sub?: string }) => (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold">{title}</p>
        {sub && <p className="truncate text-[11.5px] text-zinc-500">{sub}</p>}
      </div>
      {current === id ? (
        <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-600"><Check className="h-4 w-4" />Current</span>
      ) : (
        <button type="button" onClick={() => choose(id)}
          className="flex h-8 items-center gap-1.5 rounded-md bg-[#D97757] px-3 text-[12px] font-bold text-white hover:bg-[#c96b4e]">
          Switch
        </button>
      )}
    </div>
  );

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-[#27272A]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-[13px] font-extrabold uppercase tracking-wide"><UserRoundCog className="h-4 w-4" />Switch account</h2>
        <Link to="/delegate-user?tab=account" className="text-[12px] font-semibold text-[#D97757] hover:underline">Give access to my account</Link>
      </div>
      {assigned.length === 0 && !isActing ? (
        <p className="text-[12.5px] text-zinc-500">No one has given you access to their account.</p>
      ) : (
        <div className="space-y-2">
          <Row id="self" title="My account" />
          {assigned.map((p) => (
            <Row key={p.id} id={p.id} title={p.label}
              sub={`${(p.roles ?? []).join(", ")}${p.valid_till ? ` · until ${p.valid_till}` : ""}`} />
          ))}
        </div>
      )}
    </div>
  );
}
