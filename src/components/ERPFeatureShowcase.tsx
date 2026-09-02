import React, { useState, useEffect } from "react";
import {
  Receipt,
  Landmark,
  History,
  UserCheck,
  ShoppingCart,
  GitMerge,
  UserPlus,
  Plane,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Grid,
  X,
  CheckCircle2,
  Pause,
  Play,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";

import WhatsNewTicker from "./WhatsNewTicker";

export interface ERPFeature {
  id: string;
  category: string;
  title: string;
  shortSummary: string;
  details: string;
  highlights: string[];
  icon: React.ElementType;
  gradient: string;
  badgeBg: string;
  textColor: string;
}

export const ERP_FEATURES: ERPFeature[] = [
  {
    id: "ledger",
    category: "Finance & Ledger",
    title: "Live Project Ledger",
    shortSummary:
      "Real-time payment & commitment tracking with running balances.",
    details:
      "Every payment and commitment against each account head in real time, with running balances. Committed amounts show the moment they're raised, so nobody over-commits a head that already has a PO against it. No use of Excel for book keeping, no waiting for upload of Excel for project expenses to appear.",
    highlights: [
      "Real-Time Balances",
      "Zero Excel Dependencies",
      "PO Lock Prevention",
    ],
    icon: Receipt,
    gradient: "from-blue-600 via-indigo-600 to-sky-500",
    badgeBg: "bg-blue-500/15 text-blue-300 border-blue-400/30",
    textColor: "text-blue-300",
  },
  {
    id: "funding",
    category: "Grants & Receipts",
    title: "Funding: Sanction to Receipt",
    shortSummary:
      "Record sanctions, log instalments, generate 10 deposit-slip types.",
    details:
      "Record sanctions, log instalments as they arrive, generate the deposit slip matching how money actually came in — research, consultancy, testing, non-routine — with credit auto-distributed across projects. (10 deposit-slip types)",
    highlights: [
      "10 Deposit-Slip Types",
      "Auto Credit Distribution",
      "Inflow Categorization",
    ],
    icon: Landmark,
    gradient: "from-emerald-600 via-teal-600 to-cyan-500",
    badgeBg: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
    textColor: "text-emerald-300",
  },
  {
    id: "history",
    category: "Audit & History",
    title: "Module Activity History",
    shortSummary:
      "Complete application and activity history recorded per module.",
    details:
      "All activities performed from project stays in the project recorded to keep application history for each module individually.",
    highlights: [
      "Per-Module Audit Trail",
      "In-Project Records",
      "Full Module History",
    ],
    icon: History,
    gradient: "from-purple-600 via-violet-600 to-indigo-500",
    badgeBg: "bg-purple-500/15 text-purple-300 border-purple-400/30",
    textColor: "text-purple-300",
  },
  {
    id: "delegation",
    category: "Governance",
    title: "Self Delegation While Away",
    details:
      "Hand approval authority to a colleague for a fixed window. They act on your queue, attribution stays on both, access lapses automatically on the end date.",
    shortSummary:
      "Hand approval authority for a fixed window with dual attribution.",
    highlights: [
      "Fixed Window Delegation",
      "Dual Attribution",
      "Auto-Lapsing Access",
    ],
    icon: UserCheck,
    gradient: "from-amber-600 via-orange-600 to-yellow-500",
    badgeBg: "bg-amber-500/15 text-amber-300 border-amber-400/30",
    textColor: "text-amber-300",
  },
  {
    id: "purchasing",
    category: "Procurement",
    title: "End-to-End Purchasing",
    shortSummary: "Indent → quotation → purchase committee → order → delivery.",
    details:
      "Indent → quotation → purchase committee → order → delivery, all tracked against the sanctioned budget head so approvals and funds never drift apart. (NIQ, rate contract, PO, AMC) no confusion of what to do next the system enables next step application as one is processed.",
    highlights: ["Indent to Delivery", "Budget Head Bound", "Guided Next Step"],
    icon: ShoppingCart,
    gradient: "from-rose-600 via-pink-600 to-red-500",
    badgeBg: "bg-rose-500/15 text-rose-300 border-rose-400/30",
    textColor: "text-rose-300",
  },
  {
    id: "workflows",
    category: "Workflow Engine",
    title: "Intuitive Workflows & Form Movements",
    shortSummary:
      "Form flow movements and related application workflows depicted visually.",
    details:
      "Form flow movements and its related application work flows depicted in an intuitive way properly.",
    highlights: [
      "Visual Workflow Maps",
      "Intuitive Form Movement",
      "Clear Process Steps",
    ],
    icon: GitMerge,
    gradient: "from-cyan-600 via-blue-600 to-sky-500",
    badgeBg: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30",
    textColor: "text-cyan-300",
  },
  {
    id: "recruitment",
    category: "HR & Onboarding",
    title: "Recruitment & Onboarding",
    shortSummary:
      "Position → shortlist → selection report → appointment → joining.",
    details:
      "Position → applications → shortlist → selection committee report → appointment order, then joining and medical reports. All generated from data already captured.",
    highlights: [
      "Automated Recruitment",
      "Auto Appointment Orders",
      "Joining & Medical Reports",
    ],
    icon: UserPlus,
    gradient: "from-blue-600 via-cyan-600 to-teal-500",
    badgeBg: "bg-blue-500/15 text-blue-300 border-blue-400/30",
    textColor: "text-blue-300",
  },
  {
    id: "travel",
    category: "Travel & Claims",
    title: "Travel, Advances & Settlement",
    shortSummary:
      "Itemize journeys and incidentals on one claim, auto-reconciled.",
    details:
      "Request an advance, travel, settle it. Journeys, local conveyance and incidentals itemised on one claim, reconciled against what was advanced.",
    highlights: [
      "Single-Claim Settlement",
      "Itemized Incidentals",
      "Advance Reconciliation",
    ],
    icon: Plane,
    gradient: "from-indigo-600 via-sky-600 to-blue-500",
    badgeBg: "bg-indigo-500/15 text-indigo-300 border-indigo-400/30",
    textColor: "text-indigo-300",
  },
  {
    id: "dashboards",
    category: "Dashboards & Reports",
    title: "Role-Tailored Dashboards & Reports",
    shortSummary: "11 specialized role dashboards with easy report generation.",
    details:
      "A dashboard built for your role — Director sees institute-wide position, a PI sees their own projects and pending actions, R&D staff see the queue they process. (11 role dashboards) Easy report Generation",
    highlights: [
      "11 Role Dashboards",
      "Director & PI Views",
      "Easy Report Generation",
    ],
    icon: LayoutDashboard,
    gradient: "from-violet-600 via-purple-600 to-fuchsia-500",
    badgeBg: "bg-violet-500/15 text-violet-300 border-violet-400/30",
    textColor: "text-violet-300",
  },
];

interface ERPFeatureShowcaseProps {
  isModalOpen?: boolean;
  onOpenModal?: () => void;
  onCloseModal?: () => void;
}

export const ERPFeatureShowcase: React.FC<ERPFeatureShowcaseProps> = ({
  isModalOpen,
  onOpenModal,
  onCloseModal,
}) => {
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [internalShowModal, setInternalShowModal] = useState(false);
  const [progress, setProgress] = useState(0);

  const showModal = isModalOpen !== undefined ? isModalOpen : internalShowModal;

  const handleOpenModal = () => {
    if (onOpenModal) {
      onOpenModal();
    } else {
      setInternalShowModal(true);
    }
  };

  const handleCloseModal = () => {
    if (onCloseModal) {
      onCloseModal();
    } else {
      setInternalShowModal(false);
    }
  };

  // Timer auto-rotation for showcase
  useEffect(() => {
    if (isPaused || showModal) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveFeatureIndex((cur) => (cur + 1) % ERP_FEATURES.length);
          return 0;
        }
        return prev + 2; // ~5 second cycle per slide
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, showModal]);

  useEffect(() => {
    setProgress(0);
  }, [activeFeatureIndex]);

  const currentFeature = ERP_FEATURES[activeFeatureIndex];
  const IconComponent = currentFeature.icon;

  const handleNextFeature = () => {
    setActiveFeatureIndex((prev) => (prev + 1) % ERP_FEATURES.length);
  };

  const handlePrevFeature = () => {
    setActiveFeatureIndex(
      (prev) => (prev - 1 + ERP_FEATURES.length) % ERP_FEATURES.length
    );
  };

  return (
    <>
      {/* LEFT COLUMN: Campus Background + Modern ERP Feature Showcase */}
      <section className="relative hidden overflow-hidden lg:block">
        <img
          src="/rnd_login_bg.png"
          alt="IIT Guwahati campus"
          className="absolute inset-0 h-full w-full object-cover filter brightness-[0.85] contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061529]/95 via-[#0B1E38]/80 to-[#0F3C6F]/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-sky-400/20 via-blue-600/10 to-transparent pointer-events-none" />

        <div className="relative z-10 flex h-full flex-col justify-between p-7 xl:p-9">
          {/* Header branding */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-black uppercase tracking-[0.22em] text-blue-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  Indian Institute of Technology Guwahati
                </p>
                <p className="mt-0.5 text-[24px] xl:text-[28px] font-black tracking-tight text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] leading-tight">
                  Research & Development Cell
                </p>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-300 backdrop-blur-md shadow-lg">
                <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-300" />
                PRAGATI
              </div>
            </div>

            {/* What's New Ticker Banner for PIs */}
            <WhatsNewTicker />
          </div>

          {/* Spotlight Feature Showcase Hero Container */}
          <div
            className="my-auto max-w-2xl py-4"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Category tabs bar */}
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {ERP_FEATURES.map((feat, idx) => {
                const isActive = idx === activeFeatureIndex;
                return (
                  <button
                    key={feat.id}
                    onClick={() => setActiveFeatureIndex(idx)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-amber-400 text-[#0B1E38] shadow-md shadow-amber-400/20 scale-105"
                        : "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white backdrop-blur-xs"
                    }`}
                  >
                    {feat.category}
                  </button>
                );
              })}
            </div>

            {/* Main Animated Glassmorphic Feature Card */}
            <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-6 xl:p-7 backdrop-blur-xl shadow-2xl transition-all duration-300 hover:border-white/30">
              {/* Glow backdrop behind card */}
              <div
                className={`absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br ${currentFeature.gradient} opacity-25 blur-3xl transition-all duration-500`}
              />

              {/* Top card metadata */}
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-extrabold border ${currentFeature.badgeBg}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {currentFeature.category}
                  </span>
                  <span className="text-[11px] font-bold text-white/50">
                    Feature {activeFeatureIndex + 1} of {ERP_FEATURES.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] font-bold text-white/60">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 hover:bg-white/20 text-white/80 transition-colors"
                    title={
                      isPaused ? "Resume auto-rotation" : "Pause auto-rotation"
                    }
                  >
                    {isPaused ? (
                      <>
                        <Play className="h-3 w-3 text-amber-300" />
                        <span>Paused</span>
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3 text-sky-300" />
                        <span>Auto-playing</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Feature Header with Icon */}
              <div className="mb-4 flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${currentFeature.gradient} text-white shadow-lg shadow-black/30 ring-1 ring-white/20`}
                >
                  <IconComponent className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-[20px] xl:text-[22px] font-extrabold leading-snug text-white drop-shadow-sm">
                    {currentFeature.title}
                  </h3>
                  <p className="mt-0.5 text-[12px] font-semibold text-blue-200/90">
                    {currentFeature.shortSummary}
                  </p>
                </div>
              </div>

              {/* Review Text Body */}
              <div className="relative mb-5 rounded-xl border border-white/10 bg-slate-950/40 p-4 text-[13px] font-medium leading-relaxed text-white/90 backdrop-blur-md">
                <p className="italic">{currentFeature.details}</p>
              </div>

              {/* Feature Highlight Pills */}
              <div className="flex flex-wrap gap-2">
                {currentFeature.highlights.map((hl, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-amber-200/90 backdrop-blur-xs"
                  >
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    {hl}
                  </span>
                ))}
              </div>

              {/* Animated Timer Progress Line */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10">
                <div
                  className={`h-full bg-gradient-to-r ${currentFeature.gradient} transition-all duration-100 ease-linear`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Showcase Footer Controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevFeature}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
                  aria-label="Previous feature"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="ml-2 flex items-center gap-1.5">
                  {ERP_FEATURES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveFeatureIndex(i)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === activeFeatureIndex
                          ? "w-6 bg-amber-400"
                          : "w-2 bg-white/30 hover:bg-white/60"
                      }`}
                      aria-label={`Go to feature ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleNextFeature}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
                  aria-label="Next feature"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={handleOpenModal}
                className="group inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3.5 py-2 text-[12px] font-extrabold text-amber-300 backdrop-blur-md transition-all hover:border-amber-400 hover:bg-amber-400/30 hover:text-white shadow-lg"
              >
                <Grid className="h-4 w-4" />
                <span>View All 9 Key Capabilities</span>
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
            </div>
          </div>

          {/* Bottom branding footer */}
          <div className="flex items-center justify-between border-t border-white/10 pt-4 text-[12px] font-medium text-white/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>IIT Guwahati R&D Portal — Pragati</span>
            </div>
            <span>Pragati ERP Systems</span>
          </div>
        </div>
      </section>

      {/* ALL FEATURES OVERVIEW MODAL GRID */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 sm:p-6 backdrop-blur-md animate-in fade-in">
          <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-white/20 bg-[#0B1E38] text-white shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-5 sm:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-black shadow-md">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-[20px] font-extrabold tracking-tight text-white">
                    PRAGATI — Feature Highlights
                  </h2>
                  <p className="text-[12px] font-semibold text-blue-200/80">
                    Explore all 9 major system updates designed for seamless R&D
                    operations
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all hover:bg-white/20 hover:scale-110"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Grid */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {ERP_FEATURES.map((feature, index) => {
                  const FeatureIcon = feature.icon;
                  return (
                    <div
                      key={feature.id}
                      onClick={() => {
                        setActiveFeatureIndex(index);
                        handleCloseModal();
                      }}
                      className="group relative flex flex-col justify-between rounded-2xl border border-white/15 bg-white/5 p-5 backdrop-blur-md transition-all duration-300 hover:border-amber-400/50 hover:bg-white/10 hover:shadow-xl cursor-pointer"
                    >
                      <div>
                        {/* Header */}
                        <div className="mb-3 flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold border ${feature.badgeBg}`}
                          >
                            {feature.category}
                          </span>
                          <span className="text-[11px] font-bold text-white/40 group-hover:text-amber-300 transition-colors">
                            #{index + 1}
                          </span>
                        </div>

                        {/* Title */}
                        <div className="mb-2 flex items-center gap-2.5">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${feature.gradient} text-white shadow-md`}
                          >
                            <FeatureIcon className="h-4 w-4" />
                          </div>
                          <h3 className="text-[15px] font-extrabold text-white group-hover:text-amber-300 transition-colors leading-tight">
                            {feature.title}
                          </h3>
                        </div>

                        {/* Text */}
                        <p className="mb-4 text-[12px] font-normal leading-relaxed text-white/80">
                          {feature.details}
                        </p>
                      </div>

                      {/* Highlights */}
                      <div className="border-t border-white/10 pt-3">
                        <div className="flex flex-wrap gap-1.5">
                          {feature.highlights.map((hl, i) => (
                            <span
                              key={i}
                              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-blue-200"
                            >
                              {hl}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-white/10 px-6 py-4 bg-slate-950/50 text-[12px] font-medium text-white/70">
              <span>
                Select any card to view detailed spotlight on the left panel
              </span>
              <button
                onClick={handleCloseModal}
                className="rounded-xl bg-amber-400 px-5 py-2 text-[12px] font-extrabold text-slate-950 shadow-md transition-transform hover:bg-amber-300 hover:scale-105 active:scale-95"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ERPFeatureShowcase;
