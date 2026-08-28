import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  LogIn,
  Search,
  UserCheck,
  KeyRound,
  CircleAlert,
} from 'lucide-react';

// Helper: read a cookie by name (CSRF token is not httpOnly in Frappe)
function getCookie(name: string): string {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : '';
}

type Phase = 'password' | 'impersonate';

interface UserSuggestion {
  name: string;
  full_name: string;
  username: string;
}

const AdminLogin: React.FC = () => {
  // Phase 1
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phase1Error, setPhase1Error] = useState<string | null>(null);
  const [phase1Loading, setPhase1Loading] = useState(false);

  // Phase 2
  const [phase, setPhase] = useState<Phase>('password');
  const [targetUser, setTargetUser] = useState('');
  const [phase2Error, setPhase2Error] = useState<string | null>(null);
  const [phase2Loading, setPhase2Loading] = useState(false);
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === 'impersonate') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [phase]);

  // Phase 1: Admin login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhase1Error(null);

    if (!password.trim()) {
      setPhase1Error('Please enter the admin password.');
      return;
    }

    setPhase1Loading(true);
    try {
      let clientIp = '';
      try {
        const isLocal = (ip: string) =>
          ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.') || ip.startsWith('169.254.');

        clientIp = await Promise.race([
          new Promise<string>((resolve) => {
            const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
            const localIPs: string[] = [];
            const reflexiveIPs: string[] = [];
            pc.createDataChannel('');
            pc.createOffer()
              .then((o) => {  return pc.setLocalDescription(o); })
              .catch((err) => {  resolve(''); });
            pc.onicecandidate = (evt) => {
              if (!evt.candidate) return;
              const m = evt.candidate.candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
              if (!m) return;
              const ip = m[1];
              if (isLocal(ip)) {  localIPs.push(ip); }
              else {  reflexiveIPs.push(ip); }
            };
            pc.onicegatheringstatechange = () => {
              if (pc.iceGatheringState === 'complete') {
                const chosen = localIPs[0] || reflexiveIPs[0] || '';
                resolve(chosen);
                pc.close();
              }
            };
          }),
          new Promise<string>((resolve) => setTimeout(() => {
            resolve('');
          }, 3000)),
        ]);
      } catch (err) {
      }

      const res = await fetch('/api/method/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usr: 'prorndadmin', pwd: password, client_ip: clientIp }),
      });

      const data = await res.json();

      if (!res.ok || data.message === 'Invalid login credentials') {
        const excType = data.exc_type ?? '';
        if (res.status === 401 || excType === 'AuthenticationError') {
          setPhase1Error('Invalid admin credentials.');
        } else if (res.status === 423) {
          setPhase1Error('Too many failed attempts. Please wait 60 seconds.');
        } else {
          setPhase1Error(data.message ?? 'Login failed. Please try again.');
        }
        setPhase1Loading(false);
        return;
      }

      // Success — move to impersonation screen
      setPhase('impersonate');
      setPhase1Loading(false);
    } catch {
      setPhase1Error('Network error. Please check your connection.');
      setPhase1Loading(false);
    }
  };

  // Search users (requires prorndadmin session)
  const searchUsers = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      return;
    }
    setSearchLoading(true);
    try {
      const params = new URLSearchParams({
        filters: JSON.stringify([['enabled', '=', 1]]),
        or_filters: JSON.stringify([
          ['name', 'like', `%${query}%`],
          ['full_name', 'like', `%${query}%`],
          ['username', 'like', `%${query}%`],
        ]),
        fields: JSON.stringify(['name', 'full_name', 'username']),
        limit: '10',
      });
      const res = await fetch(`/api/resource/User?${params}`, {
        credentials: 'include',
        headers: { 'X-Frappe-CSRF-Token': getCookie('X-Frappe-CSRF-Token') },
      });
      if (res.ok) {
        const data = await res.json();
        const results = (data.data as UserSuggestion[]) ?? [];
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      }
    } catch {
      // silently fail — autocomplete is optional
    }
    setSearchLoading(false);
  };

  const handleTargetUserChange = (value: string) => {
    setTargetUser(value);
    setPhase2Error(null);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchUsers(value), 300);
  };

  // Phase 2: Impersonate
  const handleImpersonate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhase2Error(null);
    setShowSuggestions(false);

    const target = targetUser.trim();
    if (!target) {
      setPhase2Error('Please enter a username or email.');
      return;
    }

    setPhase2Loading(true);
    try {
      const csrf = getCookie('X-Frappe-CSRF-Token');
      const res = await fetch('/api/method/rndopsapp.external_auth.impersonate_user', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': csrf,
        },
        body: JSON.stringify({ target_user: target }),
      });

      if (res.ok) {
        // Session cookie is now the target user's — full reload clears all state
        window.location.href = '/dashboard';
        return;
      }

      const data = await res.json();
      const excType = data.exc_type ?? '';

      if (res.status === 404 || excType === 'DoesNotExistError') {
        setPhase2Error('User not found. Check the username or email and try again.');
      } else if (res.status === 417 || excType === 'ValidationError') {
        setPhase2Error('This user account is disabled.');
      } else if (res.status === 403 || excType === 'PermissionError') {
        setPhase2Error('Not authorized. Only prorndadmin can impersonate users.');
      } else {
        setPhase2Error(data.message ?? 'Impersonation failed. Please try again.');
      }
    } catch {
      setPhase2Error('Network error. Please check your connection.');
    }
    setPhase2Loading(false);
  };

  const selectSuggestion = (user: UserSuggestion) => {
    setTargetUser(user.name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="flex h-screen w-full items-center justify-center overflow-hidden bg-[#FAFAF9] px-5 font-sans text-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="bg-gradient-to-b from-[#0F3C6F] via-[#092647] to-[#061931] bg-clip-text text-[24px] font-black uppercase tracking-wider text-transparent drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] dark:from-[#93C5FD] dark:via-[#5B9AE0] dark:to-[#3D7BC7]">
              PRAGATI R&D
            </span>
            <span className="h-5 w-px bg-gradient-to-b from-transparent via-[#0F3C6F]/30 to-transparent dark:via-white/25" />
            <span className="bg-gradient-to-b from-[#B85436] via-[#96432A] to-[#7A361F] bg-clip-text text-[16px] font-bold tracking-wide text-transparent drop-shadow-[0_1px_1px_rgba(255,255,255,0.4)] dark:from-[#E88B6A] dark:via-[#D97757] dark:to-[#B85436]">
              IIT Guwahati
            </span>
          </div>
          <img src={`${import.meta.env.BASE_URL}IITG_Large_Logo.gif`} alt="IIT Guwahati" className="h-14 w-auto object-contain" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
          <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
          <div className="px-6 py-6 sm:px-7">
            <div className="mb-6 text-center">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#E4E4E7] bg-[#FAFAF9] dark:border-[#3F3F46] dark:bg-[#18181B]">
                <ShieldAlert className="h-6 w-6 text-[#D97757]" />
              </div>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#71717A] dark:text-[#A1A1AA]">Restricted Access</p>
              <h2 className="mt-1 text-[20px] font-extrabold leading-tight tracking-normal text-[#3F3F46] dark:text-[#E4E4E7]">
                {phase === 'password' ? 'Admin Access' : 'Select User'}
              </h2>
              <p className="mt-1 text-[12px] font-medium text-[#71717A] dark:text-[#A1A1AA]">
                {phase === 'password'
                  ? 'Enter the ProRND admin password to continue.'
                  : 'Enter the username or email of the user to log in as.'}
              </p>
            </div>

            {/* Phase 1: Password */}
            {phase === 'password' && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#E4E4E7]">
                    Admin Password
                  </label>
                  <div className="relative overflow-hidden rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] transition-colors focus-within:border-[#4A6CF7] focus-within:ring-[3px] focus-within:ring-[#4A6CF7]/12 dark:border-[#3F3F46] dark:bg-[#18181B]">
                    <div className="absolute inset-y-0 left-0 flex w-10 items-center justify-center border-r border-[#E4E4E7] text-[#71717A] dark:border-[#3F3F46] dark:text-[#A1A1AA]">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <input
                      autoFocus
                      className="h-11 w-full bg-transparent pl-12 pr-12 text-[12px] font-semibold text-[#3F3F46] outline-none placeholder:text-[#A1A1AA] dark:text-[#E4E4E7]"
                      placeholder="Enter admin password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPhase1Error(null); }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#3F3F46]"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {phase1Error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{phase1Error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={phase1Loading}
                  className={`group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#D97757] text-[12px] font-extrabold text-white shadow-sm transition-all hover:bg-[#c96b4e] hover:shadow-md focus:outline-none focus:ring-[3px] focus:ring-[#D97757]/25 ${phase1Loading ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                  {phase1Loading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Authenticating
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Continue
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Phase 2: Impersonate */}
            {phase === 'impersonate' && (
              <form onSubmit={handleImpersonate} className="space-y-4">
                <div className="relative space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#E4E4E7]">
                    Username or Email
                  </label>
                  <div className="relative overflow-hidden rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] transition-colors focus-within:border-[#4A6CF7] focus-within:ring-[3px] focus-within:ring-[#4A6CF7]/12 dark:border-[#3F3F46] dark:bg-[#18181B]">
                    <div className="absolute inset-y-0 left-0 flex w-10 items-center justify-center border-r border-[#E4E4E7] text-[#71717A] dark:border-[#3F3F46] dark:text-[#A1A1AA]">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      ref={inputRef}
                      className="h-11 w-full bg-transparent pl-12 pr-4 text-[12px] font-semibold text-[#3F3F46] outline-none placeholder:text-[#A1A1AA] dark:text-[#E4E4E7]"
                      placeholder="e.g. okjimmy or okjimmy@rnd.iitg.ac.in"
                      type="text"
                      value={targetUser}
                      onChange={(e) => handleTargetUserChange(e.target.value)}
                      onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      autoComplete="off"
                    />
                    {searchLoading && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 rounded-full border-2 border-[#E4E4E7] border-t-[#71717A] animate-spin dark:border-[#3F3F46] dark:border-t-[#A1A1AA]" />
                      </div>
                    )}
                  </div>

                  {/* Autocomplete dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute z-50 w-full overflow-hidden rounded-lg border border-[#E4E4E7] bg-white shadow-lg dark:border-[#3F3F46] dark:bg-[#27272A]">
                      {suggestions.map((user) => (
                        <button
                          key={user.name}
                          type="button"
                          onMouseDown={() => selectSuggestion(user)}
                          className="flex w-full flex-col gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-[#FAFAF9] dark:hover:bg-[#3F3F46]"
                        >
                          <span className="text-[12px] font-semibold text-[#3F3F46] dark:text-[#E4E4E7]">
                            {user.full_name || user.username || user.name}
                          </span>
                          <span className="text-[11px] text-[#71717A] dark:text-[#A1A1AA]">{user.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {phase2Error && (
                  <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                    <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{phase2Error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={phase2Loading}
                  className={`group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#D97757] text-[12px] font-extrabold text-white shadow-sm transition-all hover:bg-[#c96b4e] hover:shadow-md focus:outline-none focus:ring-[3px] focus:ring-[#D97757]/25 ${phase2Loading ? 'cursor-not-allowed opacity-80' : ''}`}
                >
                  {phase2Loading ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Logging in as user
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      Login as User
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setPhase('password'); setTargetUser(''); setPhase2Error(null); }}
                  className="w-full text-center text-[11px] font-bold text-[#71717A] transition-colors hover:text-[#D97757] dark:text-[#A1A1AA]"
                >
                  ← Back
                </button>
              </form>
            )}
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#A1A1AA] dark:text-[#71717A]">
          Restricted access — authorised personnel only
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
