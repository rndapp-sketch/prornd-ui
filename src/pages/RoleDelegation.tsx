import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Clock, Loader2, ShieldCheck, UserCheck, Users } from "lucide-react";
import { useFrappeAuth, useFrappePostCall } from "frappe-react-sdk";
import { AutocompleteEmail } from "@/components/AutocompleteEmail";
import { cn } from "@/lib/utils";
import { delegateUserAPI } from "@/services/apiService";
import { useActingProfile } from "@/hooks/useActingProfile";
import {
  createRoleDelegation, getRoleDelegations, revokeRoleDelegation, type RoleGrant,
} from "@/lib/actingProfile";
import "@/pages/dashboards/projectStaffDashboard.css";

type UserOption = { label: string; value: string; full_name?: string; email?: string };

// Same look as the Delegate User tab (psd-* theme tokens).
const inputClasses =
  "h-10 rounded-lg border border-[var(--psd-border)] bg-[var(--psd-surface)] px-3 text-[13px] font-medium text-[var(--psd-heading)] outline-none transition-colors focus:border-[var(--psd-primary)] focus:ring-[3px] focus:ring-[var(--psd-primary)]/15 placeholder:text-[var(--psd-muted)]";
const cardClasses = "psd-card !rounded-xl";
const labelClasses = "mb-1 block text-[11px] font-bold uppercase tracking-wider text-[var(--psd-body)]";

// <input type="datetime-local"> gives "YYYY-MM-DDTHH:mm"; the API wants "YYYY-MM-DD HH:mm:ss".
const toServer = (v: string) => (v ? `${v.replace("T", " ")}:00` : "");

const STATE_STYLE: Record<RoleGrant["state"], string> = {
  active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  scheduled: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  expired: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  revoked: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
};

const SummaryCard = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) => (
  <div className={cn(cardClasses, "flex items-center gap-3 border-l-[3px] border-r-[3px] !border-l-[var(--psd-primary)] !border-r-[var(--psd-primary)] px-3 py-2")}>
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
      <Icon className="h-[18px] w-[18px]" />
    </div>
    <div>
      <div className="text-[19px] font-bold leading-tight tabular-nums text-[var(--psd-heading)]">{value}</div>
      <div className="text-[10.5px] font-bold uppercase tracking-wide text-[var(--psd-body)]">{label}</div>
    </div>
  </div>
);

const Badge = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full border border-[var(--psd-primary)]/30 bg-[var(--psd-primary-light)] px-2 py-0.5 text-[10.5px] font-bold text-[var(--psd-primary)]">
    {children}
  </span>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="rounded-lg border border-dashed border-[var(--psd-border)] px-3 py-8 text-center text-[12px] font-semibold text-[var(--psd-muted)]">{label}</div>
);

const CardHeader = ({ title, subtitle, icon: Icon, accent = "accent" }: { title: string; subtitle?: string; icon?: React.ElementType; accent?: "accent" | "primary" }) => (
  <div className={cn("border-b border-l-[3px] border-b-[var(--psd-border)] bg-[var(--psd-bg)] px-4 py-2.5", accent === "primary" ? "border-l-[var(--psd-primary)]" : "border-l-[var(--psd-accent)]")}>
    <h2 className="flex items-center gap-2 text-[13px] font-bold text-[var(--psd-heading)]">
      {Icon && <Icon className="h-4 w-4 text-[var(--psd-primary)]" />}
      {title}
    </h2>
    {subtitle && <p className="text-[11.5px] text-[var(--psd-body)]">{subtitle}</p>}
  </div>
);

export default function RoleDelegation() {
  const { currentUser } = useFrappeAuth();
  const { isActing } = useActingProfile();
  const { call: searchUsers } = useFrappePostCall<{ message: UserOption[] }>(delegateUserAPI.searchUsers);

  const [given, setGiven] = useState<RoleGrant[]>([]);
  const [received, setReceived] = useState<RoleGrant[]>([]);
  const [delegable, setDelegable] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [delegateEmail, setDelegateEmail] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(true); // description is open by default
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const r = await getRoleDelegations();
      setGiven(r.given ?? []);
      setReceived(r.received ?? []);
      const d = r.delegable_roles ?? [];
      setDelegable(d);
      // Only one role can be given: tick it for the user.
      if (d.length === 1) setRoles(d);
    } catch (e: any) {
      setLoadError(e?.message || "Could not load role delegations.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Same user list as the Delegate User tab; the server decides who is eligible and rejects others on create.
  useEffect(() => {
    searchUsers({ query: "" }).then((r) => setUserOptions(r?.message ?? [])).catch(() => setUserOptions([]));
  }, [searchUsers]);

  const activeGiven = useMemo(() => given.filter((g) => g.state === "active" || g.state === "scheduled").length, [given]);
  const activeReceived = useMemo(() => received.filter((g) => g.state === "active").length, [received]);

  if (isActing) {
    return <div className="p-6 text-[14px] font-semibold text-zinc-600 dark:text-zinc-300">Role delegation is not available while acting on a delegated profile. Switch back to your own profile first.</div>;
  }

  const canSubmit = !!delegateEmail && roles.length > 0 && !!from && !!to && !!reason.trim() && !saving;

  const create = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setMsg(null);
    try {
      await createRoleDelegation({ delegate: delegateEmail, roles, from_datetime: toServer(from), to_datetime: toServer(to), reason: reason.trim() });
      setMsg({ ok: true, text: "Access given." });
      setDelegateEmail(""); setRoles(delegable.length === 1 ? delegable : []); setFrom(""); setTo(""); setReason("");
      load();
    } catch (e: any) {
      setMsg({ ok: false, text: e?.message || "Could not create the delegation." });
    } finally {
      setSaving(false);
    }
  };

  const revoke = async (g: RoleGrant) => {
    if (!window.confirm(`Revoke ${g.roles.join(", ")} access given to ${g.delegate_name || g.delegate}?`)) return;
    try { await revokeRoleDelegation(g.name); load(); } catch (e: any) { setMsg({ ok: false, text: e?.message || "Could not revoke." }); }
  };

  const GrantCard = ({ g, who, canRevoke }: { g: RoleGrant; who: "delegate" | "delegator"; canRevoke?: boolean }) => (
    <div className="rounded-xl border border-[var(--psd-border)] bg-[var(--psd-surface)] p-2.5">
      <div className="flex items-start gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--psd-primary-light)] text-[var(--psd-primary)]">
          <UserCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-bold text-[var(--psd-heading)]">
                {who === "delegate" ? g.delegate_name || g.delegate : g.delegator_name || g.delegator}
              </div>
              <div className="truncate text-[10.5px] font-semibold text-[var(--psd-body)]">{who === "delegate" ? g.delegate : g.delegator}</div>
            </div>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold capitalize", STATE_STYLE[g.state])}>{g.state}</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {g.roles.map((r) => <Badge key={r}>{r}</Badge>)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-[var(--psd-body)]">
            <Clock className="h-3 w-3" />{g.from_datetime} → {g.to_datetime}
          </div>
          {g.reason && <div className="mt-1 text-[11px] text-[var(--psd-body)]" title={g.reason}>{g.reason}</div>}
          {canRevoke && (g.state === "active" || g.state === "scheduled") && (
            <button onClick={() => revoke(g)} className="mt-2 rounded-md border border-[var(--psd-returned)]/40 px-2.5 py-1 text-[11.5px] font-bold text-[#C02B3D] hover:bg-[var(--psd-returned-bg)] dark:text-rose-300">
              Revoke
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="psd-root space-y-2.5">
      <header className="psd-hero relative overflow-hidden rounded-lg border-[2.5px] border-transparent [background:linear-gradient(var(--psd-surface),var(--psd-surface))_padding-box,linear-gradient(135deg,#6842D9,#4775E8,#0DA875,#F59E0B,#F47721)_border-box]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#6842D9] to-[#4775E8] text-white shadow-sm">
              <ShieldCheck className="size-4" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-bold uppercase leading-none tracking-[0.16em] text-[var(--psd-body)]">Delegation</div>
              <h1 className="mt-0.5 text-[16px] font-bold leading-tight tracking-[-0.01em] text-[var(--psd-heading)]">Delegate Account Access</h1>
            </div>
          </div>
          <p className="hidden max-w-xl text-xs text-[var(--psd-body)] lg:block">
            Give another user access to your account while you are away. They pick your account under Switch account in the avatar menu, work with the access you chose, and can switch back any time.
          </p>
          <div className="rounded-lg border border-[var(--psd-info)]/30 bg-[var(--psd-info-bg)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--psd-info)]">
            Signed in as {currentUser}
          </div>
        </div>
      </header>

      <section className="rounded-xl border border-l-[3px] border-r-[3px] border-sky-200 border-l-sky-500 border-r-sky-500 bg-sky-50 px-4 py-2.5 text-[12px] leading-relaxed text-sky-900 dark:border-sky-900/50 dark:border-l-sky-400 dark:border-r-sky-400 dark:bg-sky-950/30 dark:text-sky-100">
        <button
          type="button"
          onClick={() => setAboutOpen((o) => !o)}
          aria-expanded={aboutOpen}
          className="flex w-full items-center justify-between gap-2 text-left"
        >
          <h2 className="text-[12.5px] font-bold">About Delegate Account Access</h2>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", aboutOpen ? "rotate-180" : "")} />
        </button>
        {aboutOpen && (<div className="mt-1">
        <p>
          Use this when you will be away and someone else must act on your approvals. It gives another user the roles you choose, for a fixed period,
          so they can work with your account&apos;s access without knowing your password.
        </p>
        <ul className="mt-2 list-disc space-y-0.5 pl-5">
          <li><b>How it works:</b> pick the user, tick the roles to give, set the start and end time and a reason, then press Give access.</li>
          <li><b>Switching:</b> the user picks your account under <i>Switch account</i> in the avatar menu or on their Profile page. The app then loads the menus, dashboard and pending tasks for that role, and a banner at the top shows whose account they are acting as. They can switch back at any time.</li>
          <li><b>Who is recorded:</b> they still sign in with their own login. Anything they approve is recorded under their own name, together with the role they acted as.</li>
          <li><b>Limits:</b> you can only give roles you hold yourself, and access you received from someone else cannot be passed on. It works only between the start and end times, and it stops on its own when the period ends.</li>
          <li><b>Ending early:</b> press Revoke on a grant under Access Given. The delegate&apos;s next action is rejected and they return to their own profile.</li>
          <li><b>Not available while acting:</b> you cannot give or revoke access while you are switched into someone else&apos;s account.</li>
        </ul>
        <p className="mt-2 text-[11.5px] opacity-80">
          This is different from the <i>Delegate User</i> tab, which only shares your projects and applications and does not hand over approval authority.
        </p>
        </div>)}
      </section>

      {loading && <p className="flex items-center gap-2 text-[13px] text-[var(--psd-body)]"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>}
      {(loadError || msg) && (
        <div
          className={cn(
            "rounded-xl border px-3.5 py-2 text-[12.5px] font-semibold",
            loadError || (msg && !msg.ok)
              ? "border-[var(--psd-returned)]/40 bg-[var(--psd-returned-bg)] text-[#C02B3D] dark:text-rose-300"
              : "border-[var(--psd-approved)]/40 bg-[var(--psd-approved-bg)] text-[#0A8A60] dark:text-emerald-300",
          )}
        >
          {loadError || msg?.text}
        </div>
      )}

      {!loading && !loadError && (
        <>
          <section className="grid gap-2.5 md:grid-cols-3">
            <SummaryCard icon={Users} label="Access Given (active)" value={activeGiven} />
            <SummaryCard icon={UserCheck} label="Access Received (active)" value={activeReceived} />
            <SummaryCard icon={ShieldCheck} label="Roles You Can Give" value={delegable.length} />
          </section>

          <section className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-2.5">
              <div className={cn(cardClasses, "overflow-hidden")}>
                <CardHeader
                  title="Give Access to My Account"
                  subtitle="Pick a user, choose which of your roles to give, then set the period."
                />
                {delegable.length === 0 ? (
                  <div className="p-4">
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300">
                      {given.length > 0 || received.length > 0
                        ? "You can only give access to roles you hold yourself. Access you received from someone else cannot be passed on to another user."
                        : "You have no access that can be given from your account."}
                    </p>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                      <div>
                        <label className={labelClasses}>Give access to user</label>
                        <AutocompleteEmail
                          options={userOptions}
                          value={delegateEmail}
                          onChange={setDelegateEmail}
                          className={inputClasses}
                          variant="psd"
                          placeholder="Search user by name or email"
                          searchByLabel
                          showAllOnFocus
                          strictMatch
                        />
                      </div>
                      <div>
                        <label className={labelClasses}>Access (roles)</label>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {delegable.map((r) => (
                            <label key={r} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                              roles.includes(r) ? "border-[var(--psd-primary)] bg-[var(--psd-primary-light)] text-[var(--psd-primary)]" : "border-[var(--psd-border)] bg-[var(--psd-surface)] text-[var(--psd-heading)] hover:border-[var(--psd-primary)]/50")}>
                              <input type="checkbox" className="h-4 w-4 accent-[#6842D9]" checked={roles.includes(r)}
                                onChange={(e) => setRoles(e.target.checked ? [...roles, r] : roles.filter((x) => x !== r))} />
                              {r}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={labelClasses}>Valid from</label>
                        <input type="datetime-local" className={cn(inputClasses, "w-full")} value={from} onChange={(e) => setFrom(e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClasses}>Valid to</label>
                        <input type="datetime-local" className={cn(inputClasses, "w-full")} value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className={labelClasses}>Reason</label>
                      <textarea className={cn(inputClasses, "h-20 w-full py-2")} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you giving access?" />
                    </div>
                    <div className="mt-4 flex justify-end border-t border-[var(--psd-border)] pt-3">
                      <button
                        onClick={create}
                        disabled={!canSubmit}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--psd-primary)] px-5 text-[12.5px] font-bold text-white shadow-sm transition-all hover:bg-[var(--psd-primary-hover)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        Give access
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-2.5">
              <div className={cn(cardClasses, "h-fit overflow-hidden")}>
                <CardHeader title="Access Given" subtitle="Click Revoke to end access early." icon={Users} accent="primary" />
                <div className="max-h-[22rem] space-y-2 overflow-y-auto p-3">
                  {given.length === 0 ? <EmptyState label="You have not given access to anyone" /> : given.map((g) => <GrantCard key={g.name} g={g} who="delegate" canRevoke />)}
                </div>
              </div>
              <div className={cn(cardClasses, "h-fit overflow-hidden")}>
                <CardHeader title="Access Received" subtitle="Accounts others have given you. Switch to them from the avatar menu or your Profile page." icon={UserCheck} accent="primary" />
                <div className="max-h-[22rem] space-y-2 overflow-y-auto p-3">
                  {received.length === 0 ? <EmptyState label="No one has given you access" /> : received.map((g) => <GrantCard key={g.name} g={g} who="delegator" />)}
                </div>
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
