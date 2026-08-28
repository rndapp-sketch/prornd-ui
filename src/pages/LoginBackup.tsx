

import React, { useState, useEffect, useRef } from 'react';
import { useFrappeAuth } from 'frappe-react-sdk';

import {
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  LifeBuoy,
  BookOpen,
  Mail,
  LockKeyhole,
  Landmark,
  CircleAlert,
  KeyRound
} from 'lucide-react';

const Login: React.FC = () => {
  // --- LOGIC: Configuration & State ---
  const DOMAINS = [
    'iitg.ac.in', // Removed @ for the select value to match the visual design logic
    'iisi.iitg.ac.in',
    'rnd.iitg.ac.in',
  ];
  const DOMAIN_STORAGE_KEY = 'rndops_default_domain';

  const getSavedDomain = (): string => {
    const d = localStorage.getItem(DOMAIN_STORAGE_KEY);
    // Strip '@' if stored with it, to match the select values
    const cleanD = d ? d.replace('@', '') : '';
    return DOMAINS.includes(cleanD) ? cleanD : DOMAINS[0];
  };

  const [username, setUsername] = useState('');
  const [domain, setDomain] = useState<string>(getSavedDomain());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { currentUser, logout } = useFrappeAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(!!currentUser);

  // Resolve client IP in the background on mount so submit has no extra delay
  const clientIpRef = useRef('');
  useEffect(() => {
    const isLocal = (ip: string) =>
      ip.startsWith('10.') || ip.startsWith('172.') || ip.startsWith('192.168.') || ip.startsWith('169.254.');
    Promise.race([
      new Promise<string>((resolve) => {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        const localIPs: string[] = [];
        const reflexiveIPs: string[] = [];
        pc.createDataChannel('');
        pc.createOffer().then((o) => pc.setLocalDescription(o)).catch(() => resolve(''));
        pc.onicecandidate = (evt) => {
          if (!evt.candidate) return;
          const m = evt.candidate.candidate.match(/(\d{1,3}(?:\.\d{1,3}){3})/);
          if (!m) return;
          if (isLocal(m[1])) localIPs.push(m[1]); else reflexiveIPs.push(m[1]);
        };
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') { resolve(localIPs[0] || reflexiveIPs[0] || ''); pc.close(); }
        };
      }),
      new Promise<string>((resolve) => setTimeout(() => resolve(''), 3000)),
    ]).then((ip) => { clientIpRef.current = ip; }).catch(() => {});
  }, []);

  // --- LOGIC: Effects ---
  useEffect(() => {
    if (currentUser) {
      window.location.href = '/dashboard'; // Redirect with full reload to reset all SWR caches
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem(DOMAIN_STORAGE_KEY, domain);
  }, [domain]);

  // --- LOGIC: Handlers ---
  const handleSubmit = async () => {
    setError(null);

    if (!username.trim()) {
      setError('Please enter your username.');
      return;
    }

    setIsLoading(true);

    // Construct full username: user + @ + domain
    const fullUsername = `${username}@${domain}`;

    let attempt = 0;
    const maxAttempts = 3;

    while (attempt < maxAttempts) {
      try {
        attempt++;
        const res = await fetch('/api/method/login', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usr: fullUsername, pwd: password, client_ip: clientIpRef.current }),
        });
        const data = await res.json();
        if (!res.ok || data.message === 'Invalid login credentials') {
          const exc = data.exc_type ?? '';
          if (res.status === 401 || exc === 'AuthenticationError') throw { message: 'Invalid username or password.', exc_type: 'AuthenticationError' };
          if (res.status === 423) throw { message: 'Too many failed attempts. Please wait 60 seconds.', exc_type: 'RateLimited' };
          throw { message: data.message || 'Login failed. Please try again.' };
        }
        localStorage.setItem(DOMAIN_STORAGE_KEY, domain);
        window.location.href = '/dashboard';
        return;
      } catch (err: any) {

        // If it's the last attempt, show error
        if (attempt === maxAttempts) {
          let message = err.message || 'An unexpected error occurred.';
          if (message === 'There was an error while logging in') {
            message = 'Network error or server unavailable. Please try again.';
          }
          setError(message);
          setIsLoading(false);
        } else {
          // If error is clearly "Invalid login credentials", do not retry
          if (err.message === 'Invalid username or password.' || err.exc_type === 'AuthenticationError') {
            setError('Invalid username or password.');
            setIsLoading(false);
            break;
          }
          // Wait before retrying (exponential backoff or fixed)
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
  };

  // If logged in, show a minimal loading/redirect state or the "Already Logged In" view
  // (Keeping your original logic of showing a logged-in state if needed, though usually we just redirect)
  if (isLoggedIn) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[#FAFAF9] px-6 font-sans dark:bg-[#18181B]">
        <div className="w-full max-w-sm rounded-2xl border border-[#E4E4E7] bg-white p-6 text-center shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
          <p className="mb-4 text-[15px] font-bold text-[#3F3F46] dark:text-[#E4E4E7]">Welcome, {currentUser}</p>
          <button
            onClick={() => {
              logout().then(() => setIsLoggedIn(false));
            }}
            className="h-10 rounded-lg bg-[#D97757] px-5 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-[#c96b4e]"
          >
            Log out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] font-sans text-[#3F3F46] dark:bg-[#18181B] dark:text-[#E4E4E7]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.08fr)_minmax(430px,0.92fr)]">
        <section className="relative hidden overflow-hidden lg:block">
          <img
            src={`${import.meta.env.BASE_URL}rnd_login_bg.png`}
            alt="IIT Guwahati campus"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-[#18181B]/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#18181B]/90 via-[#18181B]/28 to-[#1E3A8A]/18" />

          <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-10">
            <div className="flex items-center gap-6 sm:gap-7">
              <div className="flex items-center justify-center flex-shrink-0">
                <img src={`${import.meta.env.BASE_URL}pragati_rnd_logo.png`} alt="PRAGATI R&D Logo" className="h-28 sm:h-36 w-auto object-contain filter brightness-115 contrast-110 drop-shadow-2xl" />
              </div>
              <div>
                <p className="text-[15px] sm:text-[17px] font-black uppercase tracking-[0.22em] text-white/95">Indian Institute of Technology Guwahati</p>
                <p className="mt-2 text-[30px] sm:text-[38px] font-black tracking-tight text-white leading-none drop-shadow">PRAGATI - R&D Cell</p>
              </div>
            </div>

            <div className="max-w-2xl pb-4">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/12 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure R&D Operations
              </div>
              <h1 className="max-w-2xl text-[36px] font-extrabold leading-[1.08] tracking-normal text-white xl:text-[44px]">
                Advancing the Frontiers of Global Research
              </h1>
              <p className="mt-4 max-w-2xl text-[14px] font-medium leading-7 text-white/78">
                The heartbeat of innovation. Empowering our scholarly community with seamless management, robust resources, and world-class administrative support.
              </p>
            </div>
          </div>
        </section>

        <main className="relative flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />

          <div className="w-full max-w-[440px]">
            <div className="mb-7 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 items-center justify-center">
                  <img src={`${import.meta.env.BASE_URL}pragati_rnd_logo.png`} alt="PRAGATI R&D Logo" className="h-9 w-auto object-contain filter brightness-110 contrast-105" />
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0F3C6F] dark:text-[#93C5FD]">PRAGATI R&D</p>
                  <p className="text-[12px] font-bold text-[#71717A] dark:text-[#A1A1AA]">IIT Guwahati</p>
                </div>
              </div>
              <div className="hidden h-10 items-center rounded-lg border border-[#E4E4E7] bg-white px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[#71717A] shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A] dark:text-[#A1A1AA] sm:flex">
                <Landmark className="mr-2 h-3.5 w-3.5 text-[#2563EB]" />
                R&D Cell
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-sm dark:border-[#3F3F46] dark:bg-[#27272A]">
              <div className="h-[3px] bg-gradient-to-r from-[#4A6CF7] via-[#2563EB] to-[#D97757]" />
              <div className="px-6 py-6 sm:px-7">
                <div className="mb-6">
                  <div className="mb-4 inline-flex items-center justify-center">
                    <img src={`${import.meta.env.BASE_URL}pragati_rnd_logo.png`} alt="PRAGATI R&D Logo" className="h-14 w-auto object-contain filter brightness-110 contrast-105" />
                  </div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#71717A] dark:text-[#A1A1AA]">Authorized Access</p>
                  <h2 className="mt-1 text-[20px] font-extrabold leading-tight tracking-normal text-[#3F3F46] dark:text-[#E4E4E7]">
                    Sign in to PRAGATI R&D Portal
                  </h2>
                </div>

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit();
                  }}
                >
                  <div className="space-y-1.5">
                    <label htmlFor="username" className="text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#E4E4E7]">
                      Institute Email
                    </label>
                    <div className="flex min-w-0 overflow-hidden rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] transition-colors focus-within:border-[#4A6CF7] focus-within:ring-[3px] focus-within:ring-[#4A6CF7]/12 dark:border-[#3F3F46] dark:bg-[#18181B]">
                      <div className="flex w-10 shrink-0 items-center justify-center border-r border-[#E4E4E7] text-[#71717A] dark:border-[#3F3F46] dark:text-[#A1A1AA]">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="username"
                        className="h-11 min-w-0 flex-1 bg-transparent px-3 text-[12px] font-semibold text-[#3F3F46] outline-none placeholder:text-[#A1A1AA] dark:text-[#E4E4E7]"
                        placeholder="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                      <div className="flex items-center border-l border-[#E4E4E7] pl-3 text-[12px] font-bold text-[#71717A] dark:border-[#3F3F46] dark:text-[#A1A1AA]">@</div>
                      <select
                        className="h-11 max-w-[154px] bg-transparent px-2 text-[11px] font-bold text-[#3F3F46] outline-none dark:text-[#E4E4E7]"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        aria-label="Email domain"
                      >
                        {DOMAINS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="text-[11px] font-bold uppercase tracking-widest text-[#3F3F46] dark:text-[#E4E4E7]">
                        Password
                      </label>
                      <a className="text-[11px] font-bold text-[#D97757] transition-colors hover:text-[#b85f45]" href="#">
                        Forgot?
                      </a>
                    </div>
                    <div className="relative overflow-hidden rounded-lg border border-[#E4E4E7] bg-[#FAFAF9] transition-colors focus-within:border-[#4A6CF7] focus-within:ring-[3px] focus-within:ring-[#4A6CF7]/12 dark:border-[#3F3F46] dark:bg-[#18181B]">
                      <div className="absolute inset-y-0 left-0 flex w-10 items-center justify-center border-r border-[#E4E4E7] text-[#71717A] dark:border-[#3F3F46] dark:text-[#A1A1AA]">
                        <LockKeyhole className="h-4 w-4" />
                      </div>
                      <input
                        id="password"
                        className="h-11 w-full bg-transparent pl-12 pr-12 text-[12px] font-semibold text-[#3F3F46] outline-none placeholder:text-[#A1A1AA] dark:text-[#E4E4E7]"
                        placeholder="Enter password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] dark:text-[#A1A1AA] dark:hover:bg-[#3F3F46]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[12px] font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#D97757] text-[12px] font-extrabold text-white shadow-sm transition-all hover:bg-[#c96b4e] hover:shadow-md focus:outline-none focus:ring-[3px] focus:ring-[#D97757]/25 ${isLoading ? 'cursor-not-allowed opacity-80' : ''}`}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Signing in
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>
              </div>

              <div className="border-t border-[#E4E4E7] bg-[#FAFAF9] px-6 py-4 dark:border-[#3F3F46] dark:bg-[#18181B] sm:px-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-[#71717A] dark:text-[#A1A1AA]">
                    <KeyRound className="h-3.5 w-3.5 text-[#10B981]" />
                    Secure institute login
                  </div>
                  <div className="flex items-center gap-4">
                    <a className="flex items-center gap-1.5 text-[11px] font-bold text-[#71717A] transition-colors hover:text-[#D97757] dark:text-[#A1A1AA]" href="#">
                      <LifeBuoy className="h-3.5 w-3.5" />
                      Support
                    </a>
                    <a className="flex items-center gap-1.5 text-[11px] font-bold text-[#71717A] transition-colors hover:text-[#D97757] dark:text-[#A1A1AA]" href={`${import.meta.env.BASE_URL}User_manual/User_manual.pdf`}>
                      <BookOpen className="h-3.5 w-3.5" />
                      Manual
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-[#A1A1AA] dark:text-[#71717A]">
              © 2026 Research & Development Cell, IIT Guwahati
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
