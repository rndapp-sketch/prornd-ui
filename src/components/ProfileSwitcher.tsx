import { useEffect } from "react";
import { Check, UserRoundCog } from "lucide-react";
import { DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { useActingProfile } from "@/hooks/useActingProfile";
import { refreshActingProfiles, requestSwitch } from "@/lib/actingProfile";

const fmtEnd = (s?: string) => {
  if (!s) return "";
  const d = new Date(s.replace(" ", "T"));
  return isNaN(+d) ? s : d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

/**
 * "Switch account" section for the EXISTING avatar dropdown (no new header chrome).
 * Renders nothing unless the user has a delegated profile or is acting as one. The session
 * user stays the same; the server swaps the effective roles and the app reloads its menus,
 * dashboard and data for them.
 */
export default function ProfileSwitchMenuSection() {
  const { enabled, current, profiles, isActing } = useActingProfile();

  // Refresh when the menu mounts (it mounts when the dropdown opens).
  useEffect(() => { if (enabled) refreshActingProfiles(); }, [enabled]);

  if (!enabled || (profiles.length <= 1 && !isActing)) return null;

  const choose = (id: string) => { if (id !== current) requestSwitch(id); };

  const own = profiles.find((p) => p.id === "self") ?? { id: "self", label: "My account" };
  const delegated = profiles.filter((p) => p.id !== "self");

  return (
    <div className="border-b border-[#F4F4F5] p-1.5 dark:border-[#3F3F46]">
      <DropdownMenuLabel className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
        <UserRoundCog className="h-3 w-3" />Switch account
      </DropdownMenuLabel>
      {[{ ...own, label: own.id === "self" ? "My account" : own.label }, ...delegated].map((p) => (
        <DropdownMenuItem
          key={p.id}
          onSelect={(e) => { e.preventDefault(); choose(p.id); }}
          className="flex cursor-pointer items-start justify-between gap-2 rounded-lg px-3 py-2 text-[13px] font-medium"
        >
          <div className="min-w-0">
            <p className="truncate">{p.label}</p>
            {p.id !== "self" && (
              <p className="text-[11px] text-[#71717A]">{(p.roles ?? []).join(", ")}{p.valid_till ? ` · until ${fmtEnd(p.valid_till)}` : ""}</p>
            )}
          </div>
          {current === p.id && <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />}
        </DropdownMenuItem>
      ))}
    </div>
  );
}
