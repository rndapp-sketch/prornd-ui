

import { safeStorage } from "@/lib/safeStorage";
import { FRAPPE_BASE_URL } from "@/utils/frappeUrl";
import React, { useState, useEffect, useRef } from 'react';
import { useFrappeAuth } from 'frappe-react-sdk';
import { DotMatrixCanvas } from '@/components/DotMatrixCanvas';

import {
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Users,
  BarChart3,
  BookOpen,
  Mail,
  LockKeyhole,
  CircleAlert,
  KeyRound,
  XCircle
} from 'lucide-react';

// Desktop is a fixed, non-scrolling single screen. When the window is shorter than the
// design height, the form column is scaled down to fit rather than made to scroll.
const SUPPORT_EMAIL = "ernd@iitg.ac.in"; // same query address used across the portal
const DESIGN_HEIGHT = 840;
const useFitScale = (designHeight: number) => {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () =>
      setScale(window.innerWidth >= 1024 ? Math.min(1, window.innerHeight / designHeight) : 1);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [designHeight]);
  return scale;
};


// Convex right edge of the photo: an ellipse centred on the left edge, widest a little below
// the middle (as in the brand mockup). Translucent bands are sized wider so they sit just outside.
const HERO_CURVE = "ellipse(100% 75% at 0% 55%)";

const dots = (rgb: string, alpha: number): React.CSSProperties => ({
  backgroundImage: `radial-gradient(circle, rgba(${rgb},${alpha}) 1.6px, transparent 2px)`,
  backgroundSize: "16px 16px",
});

// Letter-by-letter reveal. Each character is its own inline-block so it can animate; words stay
// unbreakable. The heading carries an aria-label, so screen readers get the plain text.
const HEADLINE_LINES = [
  { text: "Advancing the", gold: false },
  { text: "Frontiers of", gold: false },
  { text: "Global Research", gold: true },
];
const LETTER_STEP_MS = 38;
const LETTER_START_MS = 450;

const AnimatedHeadline: React.FC = () => {
  let index = 0;
  return (
    <>
      {HEADLINE_LINES.map(({ text, gold }) => (
        <span
          key={text}
          aria-hidden="true"
          className={`block ${gold ? "pl-gold text-[#F6A82A] [text-shadow:0_0_24px_rgba(246,168,42,0.4)]" : ""}`}
        >
          {text.split(" ").map((word, w) => (
            <span key={w} className="inline-block whitespace-nowrap">
              {word.split("").map((ch, c) => (
                <span key={c} className="pl-letter" style={{ animationDelay: `${LETTER_START_MS + index++ * LETTER_STEP_MS}ms` }}>
                  {ch}
                </span>
              ))}
              {w < text.split(" ").length - 1 && "\u00A0"}
            </span>
          ))}
        </span>
      ))}
    </>
  );
};

const HERO_FEATURES = [
  { icon: ShieldCheck, title: "SECURE", sub: "R&D OPERATIONS", tone: "text-[#F6BA24]" },
  { icon: Users, title: "COLLABORATIVE", sub: "RESEARCH ECOSYSTEM", tone: "text-sky-200" },
  { icon: BarChart3, title: "IMPACTFUL", sub: "GLOBAL RESEARCH", tone: "text-emerald-300" },
];

// Soft, static decoration around the photo/form boundary (translucent blues, a warm gold
// disc, sparkle). Transparency only, so it works over the light and dark canvases.
const BoundaryDecor: React.FC = () => (
  <>
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[5] hidden overflow-hidden lg:block">
      {/* Layer C: oversized, feathered curved layers sweeping upper-centre to lower-centre */}
      <div
        className="absolute left-[40%] top-[-26%] h-[92%] w-[46%] rotate-[14deg] dark:hidden"
        style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(216,232,248,0.48) 0%, rgba(216,232,248,0.48) 52%, rgba(216,232,248,0) 100%)" }}
      />
      <div
        className="absolute left-[46%] top-[30%] h-[100%] w-[50%] -rotate-[16deg] dark:hidden"
        style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(243,247,252,0.48) 0%, rgba(243,247,252,0.48) 52%, rgba(243,247,252,0) 100%)" }}
      />
      <div
        className="absolute left-[52%] top-[-30%] h-[80%] w-[60%] dark:hidden"
        style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(243,247,252,0.9), rgba(243,247,252,0) 70%)" }}
      />
      {/* Layer D: restrained ambient highlights */}
      <div
        className="absolute left-[40%] top-[-6%] h-[46%] w-[28%] dark:hidden"
        style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,182,41,0.20), rgba(255,182,41,0) 70%)" }}
      />
      <div
        className="absolute left-[44%] top-[64%] h-[44%] w-[28%] dark:hidden"
        style={{ background: "radial-gradient(ellipse 50% 50% at 50% 50%, rgba(22,139,224,0.12), rgba(22,139,224,0) 70%)" }}
      />
      <div
        className="absolute left-[60%] top-[62%] aspect-square w-[24%] rounded-full"
        style={{ background: "radial-gradient(circle at 40% 40%, rgba(255,190,90,0.34), rgba(249,115,22,0.10) 60%, transparent 70%)" }}
      />
      <div
        className="absolute left-[64%] top-[-14%] aspect-square w-[44%] rounded-full"
        style={{ background: "radial-gradient(circle at 50% 60%, rgba(255,255,255,0.75), rgba(255,255,255,0) 68%)" }}
      />
      <div
        className="absolute right-[-7%] top-[-12%] aspect-square w-[30%] rounded-full"
        style={{ background: "radial-gradient(circle at 40% 60%, rgba(120,190,235,0.28), rgba(120,190,235,0) 70%)", border: "1px solid rgba(120,190,235,0.25)" }}
      />
      <div
        className="absolute bottom-[-14%] right-[-4%] aspect-square w-[26%] rounded-full"
        style={{ background: "radial-gradient(circle at 40% 40%, rgba(150,198,236,0.28), rgba(150,198,236,0) 70%)", border: "1px solid rgba(150,198,236,0.22)" }}
      />
    </div>
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-72 overflow-hidden lg:hidden">
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 70% 60% at 85% 0%, rgba(120,190,235,0.25), transparent 70%)" }}
      />
      <div
        className="absolute -right-24 -top-24 aspect-square w-72 rounded-full border border-transparent"
        style={{ borderLeftColor: "rgba(249,115,22,0.5)", borderBottomColor: "rgba(73,169,232,0.25)" }}
      />
    </div>
  </>
);

const LOGIN_STYLES = `
@keyframes pl-ken-burns { from { transform: scale(1.05); } to { transform: scale(1); } }
@keyframes pl-badge-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pl-letter-in { from { opacity: 0; transform: translateY(0.55em); filter: blur(6px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
.pl-letter {
  display: inline-block;
  animation: pl-letter-in 0.55s cubic-bezier(0.25, 1, 0.5, 1) backwards;
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s ease, text-shadow 0.2s ease;
  cursor: default;
}
.pl-letter:hover { transform: translateY(-7px) scale(1.1); color: #F6BA24; text-shadow: 0 6px 18px rgba(246, 186, 36, 0.55); }
.pl-gold .pl-letter:hover { color: #FFFFFF; text-shadow: 0 6px 18px rgba(255, 255, 255, 0.55); }
.pl-hero-img { animation: pl-ken-burns 1.5s cubic-bezier(0.25, 1, 0.5, 1) both; transform-origin: center; }
.pl-badge {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.25);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  transition: all 0.4s ease;
  animation: pl-badge-in 0.6s cubic-bezier(0.25, 1, 0.5, 1) backwards;
}
.pl-badge:hover { background: rgba(255, 255, 255, 0.18); border-color: rgba(255, 255, 255, 0.4); transform: translateY(-4px); }
.pl-cta {
  background: linear-gradient(90deg, #E14A16 0%, #EB721E 30%, #F09427 62%, #EC9831 100%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.pl-cta:hover:not(:disabled) {
  background: linear-gradient(90deg, #EB5A22 0%, #F2802A 30%, #F6A03A 62%, #F2A63E 100%);
  transform: translateY(-2px);
  box-shadow: 0 10px 20px -5px rgba(240, 74, 18, 0.45);
}
.pl-cta:active:not(:disabled) { transform: translateY(0) scale(0.98); }
@media (prefers-reduced-motion: reduce) {
  .pl-hero-img, .pl-badge, .pl-letter { animation: none; }
  .pl-letter:hover { transform: none; }
  .pl-badge, .pl-cta { transition: none; }
}
`;

const Login: React.FC = () => {
  const fitScale = useFitScale(DESIGN_HEIGHT);
  // --- LOGIC: Configuration & State ---
  const DOMAINS = [
    'iitg.ac.in', // Removed @ for the select value to match the visual design logic
    'iisi.iitg.ac.in',
    'rnd.iitg.ac.in',
  ];
  const DOMAIN_STORAGE_KEY = 'rndops_default_domain';

  const getSavedDomain = (): string => {
    const d = safeStorage.getItem(DOMAIN_STORAGE_KEY);
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
    safeStorage.setItem(DOMAIN_STORAGE_KEY, domain);
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
        const res = await fetch(`${FRAPPE_BASE_URL}/api/method/login`, {
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
        safeStorage.setItem(DOMAIN_STORAGE_KEY, domain);
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

  const pill =
    "flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-[#243040] dark:border-[#3F3F46] dark:bg-[#18181B] dark:text-[#A1A1AA]";

  return (
    <div className="min-h-screen bg-[#D3E1EE] font-sans text-[#243040] dark:bg-[#18181B] dark:text-[#E4E4E7] lg:h-screen lg:overflow-hidden">
      <style>{LOGIN_STYLES}</style>
      <div className="relative grid min-h-screen bg-gradient-to-br from-[#D8E5F1] via-[#CEDDEC] to-[#C3D4E6] dark:from-[#18181B] dark:via-[#18181B] dark:to-[#1E2530] lg:h-screen lg:grid-cols-[62%_minmax(0,1fr)]">
        {/* ---------------- Hero ---------------- */}
        <section className="relative z-[1] hidden lg:block">
          {/* Translucent curved bands just outside the photo's edge */}
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-[118%]"
            style={{ clipPath: HERO_CURVE, background: "linear-gradient(90deg, rgba(190,214,236,0.55), rgba(190,214,236,0.12))" }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-[108%]"
            style={{ clipPath: HERO_CURVE, background: "linear-gradient(90deg, rgba(255,255,255,0.75), rgba(255,255,255,0.3))" }}
          />
          {/* Layer A: the photograph + a deep-blue tint (left and lower) matching the mockup's depth */}
          <div className="absolute inset-0 overflow-hidden" style={{ clipPath: HERO_CURVE }}>
            {/* WebP (~250 KB) first; the original 2.6 MB PNG stays as a fallback */}
            <picture>
              <source srcSet={`${import.meta.env.BASE_URL}rnd_login_bg.webp`} type="image/webp" />
              <img
                src={`${import.meta.env.BASE_URL}rnd_login_bg.png`}
                alt="IIT Guwahati campus"
                fetchPriority="high"
                decoding="async"
                className="pl-hero-img absolute inset-0 h-full w-full object-cover saturate-[1.18] contrast-[1.05]"
              />
            </picture>
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(90deg, rgba(10,42,84,0.5) 0%, rgba(10,42,84,0.26) 45%, rgba(10,42,84,0) 85%)" }}
            />
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0A2A54]/40 to-transparent" />
          </div>
          {/* Accents over the photo */}
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="none"
          >
            <path d="M640 0 C 790 110, 930 300, 960 540" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            <path d="M690 0 C 830 100, 960 290, 985 540" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <path d="M0 790 C 110 800, 170 880, 168 1000" fill="none" stroke="#F97316" strokeOpacity="0.9" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </svg>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-[84%] top-[14%] aspect-square w-[9%] rounded-full"
            style={{ background: "radial-gradient(circle at 35% 35%, rgba(240,172,64,0.8), rgba(240,150,50,0.45))" }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute left-[70%] top-[12%] h-[14%] w-[13%]" style={dots("255,255,255", 0.9)} />
          <div aria-hidden="true" className="pointer-events-none absolute left-[81%] top-[77%] h-[11%] w-[12%]" style={dots("255,255,255", 0.9)} />

          {/* Content */}
          <div className="relative z-10 flex h-full flex-col justify-between py-[5.5vh] pl-[4.6vw] pr-[20%]">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.3em] text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.7)]">
                Indian Institute of Technology Guwahati
              </p>
              <p className="mt-1.5 text-[27px] font-extrabold tracking-tight text-[#F6BA24] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] leading-tight">
                Research & Development Cell
              </p>
            </div>

            <div>
              <h1
                aria-label="Advancing the Frontiers of Global Research"
                className="text-[40px] font-bold leading-[1.06] tracking-normal text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] xl:text-[52px]"
                style={{ fontFamily: "'Playfair Display', 'Merriweather', Georgia, 'Times New Roman', serif" }}
              >
                <AnimatedHeadline />
              </h1>
              <p className="mt-4 max-w-[420px] text-[14px] font-medium leading-7 text-white [text-shadow:0_1px_3px_rgba(0,20,50,0.85),0_0_12px_rgba(0,20,50,0.6)]">
                The heartbeat of innovation. Empowering our scholarly community with seamless management, robust resources, and world-class administrative support.
              </p>

              <div className="mt-9 flex items-center gap-5 [text-shadow:0_1px_3px_rgba(0,20,50,0.9),0_0_10px_rgba(0,20,50,0.6)] [@media(max-height:820px)]:hidden">
                {HERO_FEATURES.map(({ icon: Icon, title, sub, tone }, i) => (
                  <React.Fragment key={title}>
                    {i > 0 && <span className="h-9 w-px bg-white/30" />}
                    <div className="flex items-center gap-2.5">
                      <Icon className={`h-7 w-7 ${tone}`} strokeWidth={1.5} />
                      <div className="leading-tight">
                        <p className="text-[11px] font-bold tracking-[0.12em] text-white">{title}</p>
                        <p className="text-[9px] font-medium tracking-[0.1em] text-white/85">{sub}</p>
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="grid max-w-[560px] grid-cols-3 gap-4">
              {HERO_FEATURES.map(({ icon: Icon, title, sub, tone }, i) => (
                <div
                  key={title}
                  className="pl-badge flex flex-col items-center rounded-2xl px-2 py-5 text-center shadow-[0_8px_24px_rgba(7,60,120,0.25)]"
                  style={{ animationDelay: `${300 + i * 150}ms` }}
                >
                  <Icon className={`mb-3 h-11 w-11 ${tone}`} strokeWidth={1.3} />
                  <p className="text-[14px] font-extrabold tracking-wide text-white">{title}</p>
                  <p className="mt-1 text-[10.5px] font-medium tracking-wide text-white/85">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <DotMatrixCanvas className="pointer-events-none absolute inset-y-0 right-0 z-[4] hidden h-full w-[40%] lg:block" />
        <BoundaryDecor />

        {/* ---------------- Form column ---------------- */}
        <main className="relative z-10 flex min-h-screen items-center justify-center px-5 py-8 sm:px-8 lg:h-screen lg:py-0">
          <div
            className="w-full max-w-[500px]"
            style={fitScale < 1 ? { transform: `scale(${fitScale})`, transformOrigin: "center" } : undefined}
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <span className="text-[27px] font-black uppercase tracking-tight text-[#36485F] dark:text-[#93C5FD]">
                  PRAGATI R&D
                </span>
                <span className="h-6 w-px bg-[#36485F]/25 dark:bg-white/25" />
                <span className="text-[19px] font-extrabold tracking-tight text-[#F47B20]">IIT Guwahati</span>
              </div>
              <img src={`${import.meta.env.BASE_URL}IITG_Large_Logo.gif`} alt="IIT Guwahati" className="h-[72px] w-auto object-contain" />
            </div>

            <div className="overflow-hidden rounded-[22px] border border-white/90 bg-white/[0.72] shadow-[0_18px_55px_rgba(31,65,105,0.12)] backdrop-blur-[18px] dark:border-white/10 dark:bg-[#27272A]/60 dark:shadow-[0_28px_70px_-14px_rgba(0,0,0,0.6)]">
              <div className="px-7 pb-5 pt-5">
                <div className="mb-5 text-center">
                  <div className="mb-3 flex items-center justify-center">
                    <img src={`${import.meta.env.BASE_URL}pragati_rnd_logo.png`} alt="PRAGATI R&D Logo" className="h-[104px] w-auto object-contain dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.95)] dark:brightness-125 dark:contrast-110" />
                  </div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#64748B] dark:text-[#A1A1AA]">Authorized Access</p>
                  <h2
                    className="mt-1.5 text-[22px] font-bold leading-tight text-[#243040] dark:text-[#E4E4E7]"
                    style={{ fontFamily: "'Playfair Display', 'Merriweather', Georgia, 'Times New Roman', serif" }}
                  >
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
                    <label htmlFor="username" className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#243040] dark:text-[#E4E4E7]">
                      Institute Email
                    </label>
                    <div className="flex min-w-0 overflow-hidden rounded-xl border border-[#C2CEDB] bg-white/75 transition-colors focus-within:border-[#F97316] focus-within:ring-[3px] focus-within:ring-[#F97316]/15 dark:border-[#3F3F46] dark:bg-[#18181B]">
                      <div className="flex w-12 shrink-0 items-center justify-center border-r border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] dark:border-[#3F3F46] dark:bg-transparent dark:text-[#A1A1AA]">
                        <Mail className="h-[18px] w-[18px]" />
                      </div>
                      <input
                        id="username"
                        className="h-[50px] min-w-0 flex-1 bg-transparent px-3 text-[13px] font-medium text-[#243040] outline-none placeholder:text-[#94A3B8] dark:text-[#E4E4E7]"
                        placeholder="username"
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                      />
                      <div className="flex items-center border-l border-[#E2E8F0] pl-3 text-[13px] font-bold text-[#64748B] dark:border-[#3F3F46] dark:text-[#A1A1AA]">@</div>
                      <select
                        className="h-[50px] max-w-[154px] bg-transparent px-2 text-[12px] font-bold text-[#243040] outline-none dark:text-[#E4E4E7]"
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
                      <label htmlFor="password" className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#243040] dark:text-[#E4E4E7]">
                        Password
                      </label>
                    </div>
                    <div className="relative overflow-hidden rounded-xl border border-[#C2CEDB] bg-white/75 transition-colors focus-within:border-[#F97316] focus-within:ring-[3px] focus-within:ring-[#F97316]/15 dark:border-[#3F3F46] dark:bg-[#18181B]">
                      <div className="absolute inset-y-0 left-0 flex w-12 items-center justify-center border-r border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] dark:border-[#3F3F46] dark:bg-transparent dark:text-[#A1A1AA]">
                        <LockKeyhole className="h-[18px] w-[18px]" />
                      </div>
                      <input
                        id="password"
                        className="h-[50px] w-full bg-transparent pl-16 pr-12 text-[13px] font-medium text-[#243040] outline-none placeholder:text-[#94A3B8] dark:text-[#E4E4E7]"
                        placeholder="Enter password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#64748B] transition-colors hover:bg-[#F1F5F9] hover:text-[#243040] dark:text-[#A1A1AA] dark:hover:bg-[#3F3F46]"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
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
                    className={`pl-cta group flex h-[54px] w-full items-center justify-center gap-2 rounded-xl text-[15px] font-bold text-white shadow-[0_8px_22px_-6px_rgba(234,88,12,0.55)] focus:outline-none focus:ring-[3px] focus:ring-[#F97316]/30 ${isLoading ? 'cursor-not-allowed opacity-80' : ''}`}
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Signing in
                      </>
                    ) : (
                      <>
                        Sign in
                        <ArrowRight className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mb-3 mt-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#94A3B8]">
                  <span className="h-px flex-1 bg-[#E2E8F0] dark:bg-[#3F3F46]" />
                  Or
                  <span className="h-px flex-1 bg-[#E2E8F0] dark:bg-[#3F3F46]" />
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className={pill}>
                    <KeyRound className="h-3.5 w-3.5 text-[#10B981]" />
                    Secure institute login
                  </span>
                  <a
                    className={`${pill} transition-colors hover:border-[#F97316] hover:text-[#EA580C]`}
                    href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('PRAGATI R&D Portal - Support')}`}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Support
                  </a>
                  <a
                    className={`${pill} transition-colors hover:border-[#F97316] hover:text-[#EA580C]`}
                    href={`${import.meta.env.BASE_URL}User_manual/User_manual.pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    User Manual
                  </a>
                </div>
              </div>
            </div>

            <p className="mt-5 text-center text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#94A3B8] dark:text-[#71717A]">
              © 2026 Research & Development Cell, IIT Guwahati
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Login;
