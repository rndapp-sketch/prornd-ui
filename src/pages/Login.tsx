// import React, { useState, useEffect } from 'react';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import Footer from '@/components/ui/Footer';
// import '../index.css';
// import { useFrappeAuth } from 'frappe-react-sdk';
// import { useNavigate } from 'react-router';
// // import { AppSidebar } from '@/components/rndSidebar';
// import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';

// const Login: React.FC = () => {
//   const DOMAINS = [
//     '@iitg.ac.in',
//     '@iisi.iitg.ac.in',
//     '@rnd.iitg.ac.in',
//   ];
//   const DOMAIN_STORAGE_KEY = 'rndops_default_domain';

//   const getSavedDomain = (): string => {
//     const d = localStorage.getItem(DOMAIN_STORAGE_KEY);
//     return DOMAINS.includes(d ?? '') ? (d as string) : DOMAINS[0];
//   };

//   const [username, setUsername] = useState('');
//   // ← initialise from localStorage
//   const [domain, setDomain] = useState<string>(getSavedDomain());
//   const [password, setPassword] = useState('');

//   const { currentUser, login, logout } = useFrappeAuth();
//   const [isLoggedIn, setIsLoggedIn] = useState(!!currentUser);
//   const navigate = useNavigate();
//   const [error, setError] = useState<string | null>(null);


//   // useEffect(() => {
//   //   if (currentUser) {
//   //     logout().then(() => {
//   //       setIsLoggedIn(false);
//   //       console.log('Session cleared on login page load.');
//   //     });
//   //   }
//   // }, [currentUser, logout]);

//   useEffect(() => {
//     if (currentUser) {
//       console.log('Login successful');
//       navigate('/dashboard');
//     }
//   }, [currentUser, navigate]);

//   // useEffect(() => {
//   //   const savedDomain = localStorage.getItem(DOMAIN_STORAGE_KEY);
//   //   if (savedDomain && DOMAINS.includes(savedDomain)) {
//   //     setDomain(savedDomain);
//   //   }
//   // }, []);

//   useEffect(() => {
//     localStorage.setItem(DOMAIN_STORAGE_KEY, domain);
//   }, [domain]);


//   const handleSubmit = async () => {
//     setError(null);

//     if (!username.trim()) {
//       setError('Please enter your username.');
//       return;
//     }

//     const fullUsername = `${username}${domain}`;

//     try {
//       await login({ username: fullUsername, password });
//       // Save the domain for next time
//       localStorage.setItem(DOMAIN_STORAGE_KEY, domain);
//     } catch (err: any) {
//       console.error('Login failed:', err);
//       setError(err.message || 'An unexpected error occurred.');
//     }
//   };



//   // const handleSubmit = () => {
//   //   setError(null);
//   //   login({ username, password })
//   //     .catch((err) => {
//   //       console.error('Login failed:', err);
//   //       setError(err.message || 'An unexpected error occurred.');
//   //     });
//   // };

//   return (
//     <SidebarProvider>
//       <div className="w-full h-screen bg-[#F0F4F8] flex flex-col justify-between items-center overflow-hidden">
//         {isLoggedIn ? (
//           <>
//             <div className="w-full flex justify-between items-center p-4 bg-white border-b border-gray-200 shadow-sm">
//               <img
//                 src="/frontend/rndops_Logo.svg"
//                 alt="R&D Operations Logo"
//                 className="w-[166px] h-[60px]"
//               />
//               <div className="flex items-center gap-4">
//                 <SidebarTrigger />
//                 <span className="text-[#6B7280]">Welcome, {currentUser}</span>
//                 <Button
//                   className="h-10 px-4 rounded-full bg-[#0EA5A4] hover:bg-[#0D9494] text-white font-medium"
//                   onClick={() => {
//                     logout().then(() => {
//                       setIsLoggedIn(false);
//                       navigate('/login');
//                     });
//                   }}
//                 >
//                   Log out
//                 </Button>
//               </div>
//             </div>
//           </>
//         ) : (
//           <div className="w-[480px] flex flex-col justify-start items-center gap-10 my-auto p-10 bg-white border border-gray-200 rounded-2xl shadow-sm">
//             <div className="w-full flex flex-col items-center gap-4">
//               <img
//                 src="/rndops_Logo.svg"
//                 alt="R&D Operations Logo"
//                 className="w-[180px] h-auto"
//               />
//               <div className="text-lg font-medium text-gray-700">
//                 Research and Development Cell
//               </div>
//             </div>

//             <div className="w-full flex flex-col items-center gap-8">
//               <form
//                 onSubmit={(e) => {
//                   e.preventDefault();
//                   handleSubmit();
//                 }}
//                 className="w-full flex flex-col items-center gap-5"
//               >
//                 <div className="flex flex-col gap-1.5 w-full">
//                   <label className="frappe-label">Username</label>

//                   <div className="flex gap-2">
//                     <Input
//                       placeholder="Enter your username"
//                       value={username}
//                       onChange={(e) => setUsername(e.target.value)}
//                       className="frappe-input flex-1"
//                     />

//                     <select
//                       value={domain}
//                       onChange={(e) => setDomain(e.target.value)}
//                       className="h-9 px-3 rounded-md border border-gray-300 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0EA5A4]"
//                     >
//                       {DOMAINS.map((d) => (
//                         <option key={d} value={d}>
//                           {d}
//                         </option>
//                       ))}
//                     </select>
//                   </div>
//                 </div>

//                 <div className="flex flex-col gap-1.5 w-full">
//                   <label className="frappe-label" htmlFor="password">Password</label>
//                   <Input
//                     id="password"
//                     type="password"
//                     placeholder="Enter your password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     className="frappe-input"
//                   />
//                 </div>
//                 <Button
//                   type="submit"
//                   className="w-full h-11 mt-2 bg-[#0EA5A4] text-white font-medium text-base rounded-full hover:bg-[#0D9494] shadow-sm transition-all duration-150"
//                 >
//                   Log In
//                 </Button>
//               </form>

//               <div className="flex items-center gap-3 text-sm">
//                 <a
//                   href="#"
//                   className="font-medium text-[#0EA5A4] hover:underline underline-offset-2"
//                 >
//                   Forgot password?
//                 </a>
//                 <span className="text-gray-300">|</span>
//                 <span className="text-[#6B7280]">
//                   Reset here.
//                 </span>
//               </div>
//               {error && (
//                 <div className="w-full p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
//                   {error}
//                 </div>
//               )}
//             </div>
//           </div>
//         )
//         }

//         <Footer />
//       </div >
//     </SidebarProvider >
//   );
// };

// export default Login;





//  new login design _-=-=-=-=-=-=-=-=-=-=-



import React, { useState, useEffect } from 'react';
import { useFrappeAuth } from 'frappe-react-sdk';
import { useNavigate } from 'react-router';
import {
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Share2,
  Globe,
  LifeBuoy,
  BookOpen
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

  const { currentUser, login, logout } = useFrappeAuth();
  const [isLoggedIn, setIsLoggedIn] = useState(!!currentUser);
  const navigate = useNavigate();

  // --- LOGIC: Effects ---
  useEffect(() => {
    if (currentUser) {
      console.log('Login successful');
      navigate('/dashboard'); // Redirect to your dashboard route
    }
  }, [currentUser, navigate]);

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

    // Construct full username: user + @ + domain
    const fullUsername = `${username}@${domain}`;

    try {
      await login({ username: fullUsername, password });
      localStorage.setItem(DOMAIN_STORAGE_KEY, domain);
    } catch (err: any) {
      console.error('Login failed:', err);
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  // If logged in, show a minimal loading/redirect state or the "Already Logged In" view
  // (Keeping your original logic of showing a logged-in state if needed, though usually we just redirect)
  if (isLoggedIn) {
    return (
      <div className="w-full h-screen flex flex-col justify-center items-center bg-gray-50">
        <p className="text-lg text-gray-700 mb-4">Welcome, {currentUser}</p>
        <button
          onClick={() => {
            logout().then(() => setIsLoggedIn(false));
          }}
          className="px-6 py-2 bg-[#0EA5A4] text-white rounded-full hover:bg-[#0D9494]"
        >
          Log out
        </button>
      </div>
    );
  }

  return (
    // --- DESIGN: New Layout ---
    <div className="flex w-full min-h-screen bg-white dark:bg-[#1c1f22] overflow-hidden font-sans text-slate-900">
      {/* Load Fonts Helper */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Noto+Sans:wght@400;500;700&display=swap');
        .font-display { font-family: 'Space Grotesk', sans-serif; }
        .font-sans { font-family: 'Noto Sans', sans-serif; }
      `}</style>

      {/* LEFT SIDE: Branding & Visuals */}
      <div className="hidden lg:flex lg:w-3/5 xl:w-2/3 relative">
        <div
          className="absolute inset-0 bg-cover bg-center grayscale-[30%]"
          style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuAsmXNBCwoFt2ZVE2rERhzUEx6jMNgHxL9ZavGs-inWU0rf_T8SGmxQ8MnuflvyuSJp1gBUZ2trI25uMQykmuUYnQTz7Jj7l-ZpsV7jvBUm2g-tJxqQSmODel_BqQHIWJhXhr0QG_20kZi1om7lRq-KgtRPjKhLvQPqmQ7e7DVEmxjdIUYJSiTiIC-71DmFyKtce3f3sN2_pQ2m7KZkryMYl52ctEIdcemlgOomobTnHiou7dsVQWA_i1x0CL_L5lLh1nvZy1cOYJay)' }}
        ></div>
        <div className="absolute inset-0 bg-[#0EA5A4]/70 mix-blend-multiply"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20"></div>

        <div className="relative z-10 flex flex-col justify-between p-16 w-full text-white">
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
              <img
                alt="IITG Logo"
                className="h-16 w-auto brightness-0 invert"
                src="/IITG_Logo.svg"
              />
            </div>
            <div>
              <p className="text-2xl font-display font-bold tracking-tight">Indian Institute of Technology Guwahati</p>
              <p className="text-sm uppercase tracking-[0.3em] font-medium opacity-90">Research & Development Cell</p>
            </div>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-6xl font-display font-bold leading-tight mb-6">Advancing the Frontiers of Global Research</h2>
            <p className="text-xl text-white/90 leading-relaxed font-light">
              The heartbeat of innovation. Empowering our scholarly community with seamless management, robust resources, and world-class administrative support.
            </p>
          </div>

          <div className="flex items-center gap-12 text-sm font-semibold tracking-wide">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6" />
              <span>SECURE PORTAL</span>
            </div>
            <div className="flex items-center gap-3">
              <Share2 className="w-6 h-6" />
              <span>CENTRALIZED OPERATIONS</span>
            </div>
            <div className="flex items-center gap-3">
              <Globe className="w-6 h-6" />
              <span>GLOBAL IMPACT</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form */}
      <div className="w-full lg:w-2/5 xl:w-1/3 bg-white dark:bg-[#1c1f22] flex flex-col p-8 md:p-16 xl:p-20 overflow-y-auto">
        <div className="my-auto">
          <div className="mb-10 text-center lg:text-left">
            <div className="inline-flex mb-6 p-4 bg-[#0EA5A4]/5 rounded-2xl border border-[#0EA5A4]/10">
              {/* Using your local logo from original code if available, else falling back to online one */}
              <img
                src="/rndops_Logo.svg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://lh3.googleusercontent.com/aida-public/AB6AXuCCi_nci94VTTlFyOlryhdaWN1U9NhI0iX_pq-xmvMiBDuPVLZOU7Bc12KCP0L7Hdg90IwLWwfejBCAjFiI5Hu-r1y3s5eCycOzAzpUFUh9Aapw6wqssWSK6UjjBFFxpd3ipbZXPQFvOzVwNROkWWJrXvE4thT01TO2XAXpl9PCxWFvk5uxrHjLbsdH4vkTiVfuqINyCe2zcLNwV6LayK9Ta1vg5MUvIXSgdTcboBNmaAZ5fVC4qaxUCV4o80NzcebuEkNC3mtbFJzH"
                }}
                alt="R&D Cell Logo"
                className="h-16 w-auto"
              />
            </div>
            <h1 className="text-[#111818] dark:text-white text-3xl font-display font-bold leading-tight">
              R&D Portal Login
            </h1>
            <p className="text-slate-500 dark:text-gray-400 mt-2 text-sm">
              Research & Development Cell, IIT Guwahati
            </p>
          </div>

          <form
            className="space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-[#111818] dark:text-gray-200 text-sm font-semibold block">Institute Email ID</label>
              <div className="flex items-stretch group">
                <input
                  className="flex-[1.5] min-w-0 rounded-l-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#2c3136] h-12 px-4 text-base focus:outline-none focus:ring-1 focus:ring-[#0EA5A4] focus:border-[#0EA5A4] transition-all"
                  placeholder="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <div className="flex items-center justify-center bg-slate-50 dark:bg-[#343a40] border-y border-slate-200 dark:border-gray-700 px-3 text-slate-400">
                  <span className="text-sm font-medium">@</span>
                </div>
                <select
                  className="flex-1 min-w-0 rounded-r-lg border border-l-0 border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-[#343a40] h-12 px-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-[#0EA5A4] cursor-pointer text-slate-600 dark:text-gray-300"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                >
                  {DOMAINS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[#111818] dark:text-gray-200 text-sm font-semibold">Password</label>
              </div>
              <div className="relative">
                <input
                  className="w-full rounded-lg border border-slate-200 dark:border-gray-700 bg-white dark:bg-[#2c3136] h-12 pl-4 pr-12 text-base focus:outline-none focus:ring-1 focus:ring-[#0EA5A4] focus:border-[#0EA5A4] transition-all"
                  placeholder="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#0EA5A4] transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <div className="flex justify-end">
                <a className="text-xs font-semibold text-[#0EA5A4] hover:underline transition-all" href="#">Forgot password?</a>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full bg-[#0EA5A4] hover:bg-[#0c8e8d] text-white h-12 rounded-lg font-bold text-base tracking-wide transition-all shadow-lg shadow-[#0EA5A4]/20 flex items-center justify-center gap-2 group"
              >
                <span>Sign In</span>
                <ArrowRight className="w-[18px] group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </form>

          {/* Footer / Links */}
          <div className="mt-10 pt-8 border-t border-slate-100 dark:border-gray-800">
            <div className="flex flex-col gap-5">
              <p className="text-slate-400 text-xs leading-relaxed">
                Authorized access only. By logging in, you agree to the Institute's digital security policies. For technical assistance, reach out to R&D IT Services.
              </p>
              <div className="flex items-center gap-6">
                <a className="text-xs font-semibold text-slate-600 dark:text-gray-400 hover:text-[#0EA5A4] transition-colors flex items-center gap-1.5" href="#">
                  <LifeBuoy className="w-[18px]" />
                  Support Desk
                </a>
                <a className="text-xs font-semibold text-slate-600 dark:text-gray-400 hover:text-[#0EA5A4] transition-colors flex items-center gap-1.5" href="#">
                  <BookOpen className="w-[18px]" />
                  User Manual
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto pt-10 text-center lg:text-left">
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-medium">
            © 2026 Research & Development Cell, IIT Guwahati. All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;