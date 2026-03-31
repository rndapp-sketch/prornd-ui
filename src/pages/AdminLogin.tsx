import React, { useState, useEffect, useRef } from 'react';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  LogIn,
  Search,
  UserCheck,
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
      const res = await fetch('/api/method/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usr: 'prorndadmin', pwd: password }),
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
        fields: JSON.stringify(['name', 'full_name', 'username']),
        limit: '10',
        search_term: query,
      });
      const res = await fetch(`/api/resource/User?${params}`, {
        credentials: 'include',
        headers: { 'X-Frappe-CSRF-Token': getCookie('X-Frappe-CSRF-Token') },
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions((data.data as UserSuggestion[]) ?? []);
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
    <div className="flex w-full min-h-screen bg-[#F0EDE4] dark:bg-zinc-900 items-center justify-center font-sans">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap');
        .font-serif { font-family: 'Instrument Serif', serif; }
        .font-sans { font-family: 'Inter', sans-serif; }
      `}</style>

      <div className="w-full max-w-sm mx-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex mb-5 p-3 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
            <ShieldAlert className="w-10 h-10 text-[#D97757]" />
          </div>
          <h1 className="text-zinc-900 dark:text-zinc-100 text-3xl font-serif font-medium leading-tight">
            {phase === 'password' ? 'Admin Access' : 'Select User'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1.5 text-sm">
            {phase === 'password'
              ? 'Enter the ProRND admin password to continue.'
              : 'Enter the username or email of the user to log in as.'}
          </p>
        </div>

        {/* Phase 1: Password */}
        {phase === 'password' && (
          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-zinc-700 dark:text-zinc-300 text-sm font-medium block">
                Admin Password
              </label>
              <div className="relative shadow-sm rounded-lg">
                <input
                  autoFocus
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 h-11 pl-4 pr-12 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all"
                  placeholder="Enter admin password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPhase1Error(null); }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {phase1Error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {phase1Error}
              </div>
            )}

            <button
              type="submit"
              disabled={phase1Loading}
              className={`w-full bg-[#D97757] hover:bg-[#c56a4c] text-white h-11 rounded-lg font-medium text-base tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 group ${phase1Loading ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              {phase1Loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Phase 2: Impersonate */}
        {phase === 'impersonate' && (
          <form onSubmit={handleImpersonate} className="space-y-5">
            <div className="space-y-1.5 relative">
              <label className="text-zinc-700 dark:text-zinc-300 text-sm font-medium block">
                Username or Email
              </label>
              <div className="relative shadow-sm rounded-lg">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none">
                  <Search size={16} />
                </div>
                <input
                  ref={inputRef}
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 h-11 pl-9 pr-4 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 transition-all"
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
                    <div className="w-4 h-4 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {/* Autocomplete dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden">
                  {suggestions.map((user) => (
                    <button
                      key={user.name}
                      type="button"
                      onMouseDown={() => selectSuggestion(user)}
                      className="w-full px-4 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex flex-col gap-0.5"
                    >
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {user.full_name || user.username || user.name}
                      </span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">{user.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {phase2Error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {phase2Error}
              </div>
            )}

            <button
              type="submit"
              disabled={phase2Loading}
              className={`w-full bg-[#D97757] hover:bg-[#c56a4c] text-white h-11 rounded-lg font-medium text-base tracking-wide transition-all shadow-sm flex items-center justify-center gap-2 group ${phase2Loading ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              {phase2Loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Logging in as user...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Login as User</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => { setPhase('password'); setTargetUser(''); setPhase2Error(null); }}
              className="w-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 text-sm font-medium transition-colors"
            >
              ← Back
            </button>
          </form>
        )}

        <p className="mt-10 text-center text-[10px] text-zinc-400 uppercase tracking-[0.2em]">
          Restricted access — authorised personnel only
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;
