import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CircleAlert, CircleCheck, Loader2 } from 'lucide-react';
import { FRAPPE_BASE_URL } from '@/utils/frappeUrl';
import { piInitials, PI_INITIALS_RE } from '@/utils/piInitials';

const API = `${FRAPPE_BASE_URL}/api/method/rndopsapp.rndopsapp.user_api.permanent_staff_api`;

type Option = { value: string; label: string };
type EmpState = { state: 'idle' | 'checking' | 'ok' | 'taken' | 'error'; message?: string };

interface Props {
  /** Institute email the applicant just signed in with (already verified by the login attempt). */
  email: string;
  /** Institute password; sent only to register_permanent_staff, never stored. */
  password: string;
  onBack: () => void;
  /** Called after the account is created. */
  onRegistered: () => void;
}

/** Pull a readable message out of a Frappe error body. */
function frappeError(data: any, fallback: string): string {
  try {
    if (data?._server_messages) {
      const msgs = JSON.parse(data._server_messages).map((m: string) => JSON.parse(m).message);
      if (msgs.length) return msgs.join(' ').replace(/<[^>]+>/g, '');
    }
  } catch { /* fall through */ }
  const exc: string | undefined = data?.exception;
  if (exc && exc.includes(':')) return exc.split(':').slice(1).join(':').trim();
  return data?.message && typeof data.message === 'string' ? data.message : fallback;
}

const inputCls =
  'h-11 w-full rounded-xl border border-[#C2CEDB] bg-white/75 px-3 text-[13px] font-medium text-[#243040] outline-none transition-colors placeholder:text-[#94A3B8] focus:border-[#F97316] focus:ring-[3px] focus:ring-[#F97316]/15 disabled:bg-[#F1F5F9] disabled:text-[#64748B] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7] dark:disabled:bg-[#27272A]';
const labelCls = 'text-[11px] font-bold uppercase tracking-[0.12em] text-[#243040] dark:text-[#E4E4E7]';

export default function PermanentStaffRegistration({ email, password, onBack, onRegistered }: Props) {
  const [departments, setDepartments] = useState<Option[]>([]);
  const [designations, setDesignations] = useState<Option[]>([]);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');

  const [head, setHead] = useState<{ user: string; full_name: string } | null>(null);
  const [headLoading, setHeadLoading] = useState(false);
  const [emp, setEmp] = useState<EmpState>({ state: 'idle' });
  const [pi, setPi] = useState('');
  const [piTouched, setPiTouched] = useState(false); // true once the user types their own value
  const [piState, setPiState] = useState<EmpState>({ state: 'idle' });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown options
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}.get_permanent_staff_registration_options`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setDepartments(d?.message?.departments ?? []);
        setDesignations(d?.message?.designations ?? []);
      })
      .catch(() => !cancelled && setOptionsError('Could not load departments and designations. Please go back and try again.'));
    return () => { cancelled = true; };
  }, []);

  // Department head auto-fill (read-only). Many departments have no head; that is allowed.
  useEffect(() => {
    setHead(null);
    if (!department) return;
    let cancelled = false;
    setHeadLoading(true);
    fetch(`${API}.get_department_head?department=${encodeURIComponent(department)}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => !cancelled && setHead(d?.message?.data?.user ? d.message.data : null))
      .catch(() => !cancelled && setHead(null))
      .finally(() => !cancelled && setHeadLoading(false));
    return () => { cancelled = true; };
  }, [department]);

  // Realtime Employee ID duplicate check, debounced 400 ms
  useEffect(() => {
    const id = employeeId.trim();
    if (!id) { setEmp({ state: 'idle' }); return; }
    setEmp({ state: 'checking' });
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`${API}.check_employee_id?employee_id=${encodeURIComponent(id)}`, { credentials: 'include' })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          const m = d?.message;
          if (m?.available) setEmp({ state: 'ok', message: m.message });
          else if (m) setEmp({ state: 'taken', message: m.message });
          else setEmp({ state: 'error', message: frappeError(d, 'Could not check Employee ID.') });
        })
        .catch(() => !cancelled && setEmp({ state: 'error', message: 'Could not check Employee ID.' }));
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [employeeId]);

  const checkPi = async (v: string): Promise<{ available: boolean; message: string } | null> => {
    try {
      const r = await fetch(`${API}.check_pi_initials?pi_initials=${encodeURIComponent(v)}`, { credentials: 'include' });
      const d = await r.json();
      return d?.message ? { available: !!d.message.available, message: d.message.message } : null;
    } catch { return null; }
  };

  // Suggest PI initials from the name, trying the next candidate while the value is taken.
  useEffect(() => {
    if (piTouched) return;
    if (!firstName.trim()) { setPi(''); setPiState({ state: 'idle' }); return; }
    let cancelled = false;
    setPiState({ state: 'checking' });
    const t = setTimeout(async () => {
      for (let attempt = 0; ; attempt++) {
        const cand = piInitials(firstName, lastName, attempt, middleName);
        if (!cand) {
          if (!cancelled) { setPi(''); setPiState({ state: 'taken', message: 'No free suggestion. Please type your own 4-letter initials.' }); }
          return;
        }
        const r = await checkPi(cand);
        if (cancelled) return;
        if (!r) { setPi(cand); setPiState({ state: 'error', message: 'Could not check PI Initials.' }); return; }
        if (r.available) { setPi(cand); setPiState({ state: 'ok', message: r.message }); return; }
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [firstName, middleName, lastName, piTouched]);

  // Manually typed PI initials: validate the format locally, then check with the server.
  useEffect(() => {
    if (!piTouched) return;
    if (!pi) { setPiState({ state: 'taken', message: 'PI Initials are required.' }); return; }
    if (!PI_INITIALS_RE.test(pi)) { setPiState({ state: 'taken', message: 'Use exactly 4 characters: letters A-Z (the last may be a digit).' }); return; }
    let cancelled = false;
    setPiState({ state: 'checking' });
    const t = setTimeout(async () => {
      const r = await checkPi(pi);
      if (cancelled) return;
      if (!r) setPiState({ state: 'error', message: 'Could not check PI Initials.' });
      else setPiState({ state: r.available ? 'ok' : 'taken', message: r.message });
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [pi, piTouched]);

  const canSubmit = useMemo(
    () => !!firstName.trim() && !!employeeId.trim() && !!department && !!designation && emp.state === 'ok' && piState.state === 'ok' && !submitting,
    [firstName, employeeId, department, designation, emp.state, piState.state, submitting],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`${API}.register_permanent_staff`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          first_name: firstName.trim(),
          middle_name: middleName.trim(),
          last_name: lastName.trim(),
          employee_id: employeeId.trim(),
          department_name: department,
          designation_name: designation,
          pi_initials: pi,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(frappeError(data, 'Registration failed. Please try again.'));
        return;
      }
      onRegistered();
    } catch {
      setError('Network error or server unavailable. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      className="space-y-3.5"
      onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
    >
      <div className="text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#64748B] dark:text-[#A1A1AA]">First time here</p>
        <h2
          className="mt-1.5 text-[20px] font-bold leading-tight text-[#243040] dark:text-[#E4E4E7]"
          style={{ fontFamily: "'Playfair Display', 'Merriweather', Georgia, 'Times New Roman', serif" }}
        >
          Register as Permanent Staff
        </h2>
        <p className="mt-1 text-[12px] text-[#64748B] dark:text-[#A1A1AA]">
          Your institute login is valid but you have no PRAGATI account yet.
        </p>
      </div>

      <div className="space-y-1">
        <label className={labelCls}>Institute Email</label>
        <input className={inputCls} value={email} disabled readOnly />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <label htmlFor="ps-first" className={labelCls}>First name *</label>
          <input id="ps-first" className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
        </div>
        <div className="space-y-1">
          <label htmlFor="ps-middle" className={labelCls}>Middle</label>
          <input id="ps-middle" className={inputCls} value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
        </div>
        <div className="space-y-1">
          <label htmlFor="ps-last" className={labelCls}>Last</label>
          <input id="ps-last" className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor="ps-pi" className={labelCls}>PI Initials *</label>
        <input
          id="ps-pi"
          className={`${inputCls} uppercase tracking-[0.2em]`}
          value={pi}
          maxLength={4}
          placeholder="Auto-suggested from your name"
          onChange={(e) => { setPiTouched(true); setPi(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); }}
        />
        {piState.state === 'checking' && (
          <p className="flex items-center gap-1 text-[11px] text-[#64748B]"><Loader2 className="h-3 w-3 animate-spin" />Checking…</p>
        )}
        {piState.state === 'ok' && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><CircleCheck className="h-3 w-3" />{piState.message}</p>
        )}
        {(piState.state === 'taken' || piState.state === 'error') && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-red-600"><CircleAlert className="h-3 w-3" />{piState.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="ps-emp" className={labelCls}>Employee ID *</label>
        <input id="ps-emp" className={inputCls} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
        {emp.state === 'checking' && (
          <p className="flex items-center gap-1 text-[11px] text-[#64748B]"><Loader2 className="h-3 w-3 animate-spin" />Checking…</p>
        )}
        {emp.state === 'ok' && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><CircleCheck className="h-3 w-3" />{emp.message}</p>
        )}
        {(emp.state === 'taken' || emp.state === 'error') && (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-red-600"><CircleAlert className="h-3 w-3" />{emp.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <label htmlFor="ps-dept" className={labelCls}>Department *</label>
        <select id="ps-dept" className={inputCls} value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">Select department</option>
          {departments.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      <div className="space-y-1">
        <label className={labelCls}>Head of Department</label>
        <input
          className={inputCls}
          disabled
          readOnly
          value={headLoading ? 'Loading…' : head ? `${head.full_name} (${head.user})` : ''}
          placeholder={department ? 'No head recorded for this department' : 'Select a department first'}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="ps-desig" className={labelCls}>Designation *</label>
        <select id="ps-desig" className={inputCls} value={designation} onChange={(e) => setDesignation(e.target.value)}>
          <option value="">Select designation</option>
          {designations.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      {(error || optionsError) && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error || optionsError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="pl-cta flex h-[50px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white shadow-[0_8px_22px_-6px_rgba(234,88,12,0.55)] focus:outline-none focus:ring-[3px] focus:ring-[#F97316]/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? (<><Loader2 className="h-4 w-4 animate-spin" />Registering</>) : 'Register'}
      </button>

      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="flex w-full items-center justify-center gap-1.5 text-[12px] font-semibold text-[#64748B] transition-colors hover:text-[#EA580C]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />Back to sign in
      </button>
    </form>
  );
}
