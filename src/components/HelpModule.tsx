import React from 'react';
import { HelpCircle, ArrowLeft, PlayCircle, FileText, MonitorPlay, ArrowRight, X, Mail } from 'lucide-react';

interface HelpModuleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModule: React.FC<HelpModuleProps> = ({ isOpen, onClose }) => {
  const [currentView, setCurrentView] = React.useState<'menu' | 'interactive_list' | 'video_list' | 'pdf_list' | 'scribe'>('menu');
  const [currentScribeUrl, setCurrentScribeUrl] = React.useState('');
  const [currentScribeTitle, setCurrentScribeTitle] = React.useState('');
  const [isLoadingIframe, setIsLoadingIframe] = React.useState(true);
  const [loadingProgress, setLoadingProgress] = React.useState(0);

  React.useEffect(() => {
    if (currentScribeUrl) {
      setIsLoadingIframe(true);
      setLoadingProgress(0);
      
      // Calculate duration based on tutorial complexity and type
      let durationMs = 5000;
      if (currentScribeTitle.includes("Register a New Research Project") && currentScribeUrl.includes("as=video")) {
        durationMs = 20000;
      }
      const intervalMs = durationMs / 100; // Spread 100% across the total duration
      
      const interval = setInterval(() => {
        setLoadingProgress((prev) => {
          if (prev >= 99) return 99;
          return prev + 1;
        });
      }, intervalMs);

      const timer = setTimeout(() => {
        clearInterval(interval);
        setLoadingProgress(100);
        setTimeout(() => {
          setIsLoadingIframe(false);
        }, 400); // Wait briefly to show 100%
      }, durationMs);

      return () => {
        clearInterval(interval);
        clearTimeout(timer);
      };
    }
  }, [currentScribeUrl]);

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset view when opened
      setCurrentView('menu');
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const closeManual = () => {
    onClose();
    setCurrentView('menu');
    setCurrentScribeUrl('');
    setCurrentScribeTitle('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-zinc-950/50 dark:bg-black/70 backdrop-blur-sm" onClick={closeManual} />

      {/* Single Card Container */}
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-zinc-950 rounded-2xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col border border-slate-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">

        {/* Card Header - Title + Close */}
        <div className="px-6 sm:px-8 py-5 border-b border-slate-200 dark:border-zinc-800 bg-gradient-to-r from-slate-800 to-slate-900 dark:from-zinc-900 dark:to-zinc-950 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            {currentView !== 'menu' && (
              <button 
                onClick={() => {
                  if (currentView === 'scribe') {
                    if (currentScribeUrl.includes('as=scrollable')) setCurrentView('pdf_list');
                    else if (currentScribeUrl.includes('as=video')) setCurrentView('video_list');
                    else setCurrentView('interactive_list');
                  }
                  else setCurrentView('menu');
                }} 
                className="mr-2 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              >
                <ArrowLeft className="size-5" />
              </button>
            )}
            <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center ring-1 ring-white/20 shrink-0">
              <HelpCircle className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-none">
                {currentView === 'menu' ? "Support & Resources" 
                 : currentView === 'video_list' ? "Video Tutorials" 
                 : currentView === 'pdf_list' ? "PDF Guides" 
                 : currentView === 'interactive_list' ? "Interactive Guides" 
                 : currentView === 'scribe' ? currentScribeTitle 
                 : "New Project Registration Manual"}
              </h1>
              <p className="text-[11px] text-slate-300 dark:text-slate-400 mt-1 font-medium">
                {currentView === 'menu' ? "Select a guide to help you through the process" 
                 : currentView === 'video_list' ? "Select a video tutorial to view" 
                 : currentView === 'pdf_list' ? "Select a PDF guide to view" 
                 : currentView === 'interactive_list' ? "Select an interactive guide to view" 
                 : currentView === 'scribe' ? "Interactive walkthrough" 
                 : "Step-by-step guide for Endorsement & Project Registration"}
              </p>
            </div>
          </div>
          <button
            onClick={closeManual}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        {currentView === 'menu' ? (
          <div className="flex-1 p-6 sm:p-10 flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-900 min-h-[400px] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
              {/* Video Card */}
              <button
                onClick={() => setCurrentView('video_list')}
                className="group flex flex-col items-center text-center gap-4 p-8 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-rose-200 dark:hover:border-rose-900/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="size-16 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <PlayCircle className="size-8 text-rose-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Video Tutorial</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Watch a comprehensive walkthrough of the entire process.</p>
                </div>
              </button>

              {/* PDF Card */}
              <button
                onClick={() => setCurrentView('pdf_list')}
                className="group flex flex-col items-center text-center gap-4 p-8 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="size-16 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <FileText className="size-8 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">PDF Guide</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Download the detailed instruction manual for offline reading.</p>
                </div>
              </button>

              {/* Interactive Card */}
              <button
                onClick={() => setCurrentView('interactive_list')}
                className="group flex flex-col items-center text-center gap-4 p-8 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="size-16 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <MonitorPlay className="size-8 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-2">Interactive Guide</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Follow a step-by-step interactive manual built into the app.</p>
                </div>
              </button>
            </div>
          </div>
        ) : currentView === 'video_list' ? (
          <div className="flex-1 p-6 sm:p-10 flex flex-col bg-slate-50 dark:bg-zinc-900 min-h-[400px] overflow-y-auto">
            <div className="w-full max-w-4xl mx-auto space-y-4">
              <button
                onClick={() => {
                  setCurrentScribeTitle("How to Generate an Endorsement");
                  setCurrentScribeUrl("https://scribehow.com/embed/Step_by_step_process_of_Generating_an_Endorsement_from_the_PI_Dashboard__ANcI3ldZSmKbQV_wfXl9Ww?as=video");
                  setCurrentView('scribe');
                }}
                className="group w-full flex items-center justify-between p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-rose-200 dark:hover:border-rose-900/50 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <PlayCircle className="size-7 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">How to Generate an Endorsement</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Step-by-step interactive video walkthrough</p>
                  </div>
                </div>
                <ArrowRight className="size-5 text-slate-400 group-hover:text-rose-500 transition-colors hidden sm:block" />
              </button>

              <button
                onClick={() => {
                  setCurrentScribeTitle("How to Register a New Research Project");
                  setCurrentScribeUrl("https://scribehow.com/embed/How_to_Register_a_New_Research_Project__wwQ8oruSRWqRBPwFQI8dNg?as=video");
                  setCurrentView('scribe');
                }}
                className="group w-full flex items-center justify-between p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-rose-200 dark:hover:border-rose-900/50 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <PlayCircle className="size-7 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">How to Register a New Research Project</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Step-by-step interactive video walkthrough</p>
                  </div>
                </div>
                <ArrowRight className="size-5 text-slate-400 group-hover:text-rose-500 transition-colors hidden sm:block" />
              </button>
            </div>
          </div>
        ) : currentView === 'pdf_list' ? (
          <div className="flex-1 p-6 sm:p-10 flex flex-col bg-slate-50 dark:bg-zinc-900 min-h-[400px] overflow-y-auto">
            <div className="w-full max-w-4xl mx-auto space-y-4">
              <button
                onClick={() => {
                  setCurrentScribeTitle("How to Generate an Endorsement");
                  setCurrentScribeUrl("https://scribehow.com/embed/Step_by_step_process_of_Generating_an_Endorsement_from_the_PI_Dashboard__ANcI3ldZSmKbQV_wfXl9Ww?as=scrollable");
                  setCurrentView('scribe');
                }}
                className="group w-full flex items-center justify-between p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <FileText className="size-7 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">How to Generate an Endorsement</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Step-by-step interactive slide presentation</p>
                  </div>
                </div>
                <ArrowRight className="size-5 text-slate-400 group-hover:text-blue-500 transition-colors hidden sm:block" />
              </button>

              <button
                onClick={() => {
                  setCurrentScribeTitle("How to Register a New Research Project");
                  setCurrentScribeUrl("https://scribehow.com/embed/How_to_Register_a_New_Research_Project__wwQ8oruSRWqRBPwFQI8dNg?as=scrollable");
                  setCurrentView('scribe');
                }}
                className="group w-full flex items-center justify-between p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900/50 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <FileText className="size-7 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">How to Register a New Research Project</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Step-by-step interactive slide presentation</p>
                  </div>
                </div>
                <ArrowRight className="size-5 text-slate-400 group-hover:text-blue-500 transition-colors hidden sm:block" />
              </button>
            </div>
          </div>
        ) : currentView === 'interactive_list' ? (
          <div className="flex-1 p-6 sm:p-10 flex flex-col bg-slate-50 dark:bg-zinc-900 min-h-[400px] overflow-y-auto">
            <div className="w-full max-w-4xl mx-auto space-y-4">
              <button
                onClick={() => {
                  setCurrentScribeTitle("How to Generate an Endorsement");
                  setCurrentScribeUrl("https://scribehow.com/embed/Step_by_step_process_of_Generating_an_Endorsement_from_the_PI_Dashboard__ANcI3ldZSmKbQV_wfXl9Ww");
                  setCurrentView('scribe');
                }}
                className="group w-full flex items-center justify-between p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <MonitorPlay className="size-7 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">How to Generate an Endorsement</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Step-by-step interactive click-through guide</p>
                  </div>
                </div>
                <ArrowRight className="size-5 text-slate-400 group-hover:text-indigo-500 transition-colors hidden sm:block" />
              </button>

              <button
                onClick={() => {
                  setCurrentScribeTitle("How to Register a New Research Project");
                  setCurrentScribeUrl("https://scribehow.com/embed/How_to_Register_a_New_Research_Project__wwQ8oruSRWqRBPwFQI8dNg");
                  setCurrentView('scribe');
                }}
                className="group w-full flex items-center justify-between p-6 bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all duration-300 text-left"
              >
                <div className="flex items-center gap-5">
                  <div className="size-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0">
                    <MonitorPlay className="size-7 text-indigo-500" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">How to Register a New Research Project</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Step-by-step interactive click-through guide</p>
                  </div>
                </div>
                <ArrowRight className="size-5 text-slate-400 group-hover:text-indigo-500 transition-colors hidden sm:block" />
              </button>
            </div>
          </div>
        ) : currentView === 'scribe' ? (
          <div className="flex-1 w-full bg-slate-50 dark:bg-zinc-900 overflow-hidden relative min-h-[500px]">
            {isLoadingIframe && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 dark:bg-zinc-900/80 backdrop-blur-sm z-10">
                <div className="relative flex items-center justify-center mb-6">
                  {/* Outer glowing ring */}
                  <div className="absolute inset-0 rounded-full blur-xl bg-indigo-500/30 animate-pulse"></div>
                  {/* Spinner */}
                  <div className="relative size-16 border-4 border-indigo-100 dark:border-indigo-900/50 rounded-full animate-spin">
                    <div className="absolute -top-[4px] -left-[4px] size-16 border-4 border-transparent border-t-indigo-600 dark:border-t-indigo-400 rounded-full"></div>
                  </div>
                  {/* Inner pulse */}
                  <div className="absolute size-6 bg-indigo-500 dark:bg-indigo-400 rounded-full animate-pulse opacity-80"></div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-1 tracking-tight">Loading Interactive Content</h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse mb-6">Preparing your document walkthrough...</p>
                <div className="w-64">
                  <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2">
                    <span className="uppercase tracking-widest">Initialization</span>
                    <span className="tabular-nums">{loadingProgress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-75 ease-linear"
                      style={{ width: `${loadingProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
            <iframe 
              src={currentScribeUrl} 
              allow="fullscreen" 
              className={`absolute left-0 w-full transition-opacity duration-500 ${isLoadingIframe ? 'opacity-0' : 'opacity-100'}`}
              style={{ 
                top: '-56px',
                height: 'calc(100% + 110px)',
                border: 0 
              }}
            ></iframe>
          </div>
        ) : null}
        
        {/* Card Footer */}
        <div className="px-6 sm:px-8 py-3 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/50 flex items-center justify-center shrink-0">
          <div className="inline-flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <Mail className="size-3" />
            <span>For assistance, reach out to</span>
            <a href="mailto:proman@iitg.ac.in" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-semibold transition-colors">
              proman@iitg.ac.in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
