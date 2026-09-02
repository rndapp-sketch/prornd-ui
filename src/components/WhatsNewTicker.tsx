import React from "react";
import { Sparkles, Bell } from "lucide-react";

export interface WhatsNewTickerProps {
  items?: string[];
  className?: string;
}

const DEFAULT_PI_FEATURES = [
  "Self Delegation of approval authority while away",
  "Substitute PI assignment & approval workflow",
  "Co-PI & Other PI approval & project access controls",
  "Leave application integration with auto-delegation",
  "User delegation queue with dual attribution logging",
  "Instant Email & in-app status notification alerts",
  "Real-Time PO lock prevention & live budget head balances",
  "10 Deposit-slip types with auto credit distribution",
];

export const WhatsNewTicker: React.FC<WhatsNewTickerProps> = ({
  items = DEFAULT_PI_FEATURES,
  className = "",
}) => {
  return (
    <div className={`my-3 w-full overflow-hidden ${className}`}>
      {/* Ticker Container with badge and scrolling banner */}
      <div className="relative flex items-center overflow-hidden rounded-xl border border-amber-400/25 bg-slate-950/60 p-1.5 backdrop-blur-md shadow-lg shadow-black/40">
        {/* Left fixed badge */}
        <div className="z-20 flex shrink-0 items-center gap-1.5 rounded-lg bg-gradient-to-r from-amber-500/30 to-orange-500/30 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-300 border border-amber-400/40 shadow-sm">
          <Bell className="h-3.5 w-3.5 animate-bounce text-amber-400" />
          <span className="whitespace-nowrap">What's New</span>
        </div>

        {/* Left & Right gradient fade masks */}
        <div className="pointer-events-none absolute left-[125px] top-0 bottom-0 z-10 w-6 bg-gradient-to-r from-[#061529]/90 to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-8 bg-gradient-to-l from-[#061529]/90 to-transparent" />

        {/* Marquee ticker content track */}
        <div className="relative flex min-w-0 flex-1 overflow-hidden pl-3">
          <div className="flex w-max animate-[ticker_40s_linear_infinite] hover:[animation-play-state:paused] items-center will-change-transform">
            {/* Track 1 (Primary) */}
            <div className="flex shrink-0 items-center gap-6 pr-6">
              {items.map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 ring-2 ring-amber-400/40" />
                  <span className="text-[12px] font-semibold tracking-wide text-blue-100/90 hover:text-amber-300 transition-colors">
                    {feature}
                  </span>
                  <Sparkles className="ml-1 h-3 w-3 text-amber-400/60 shrink-0" />
                </div>
              ))}
            </div>

            {/* Track 2 (Identical Clone for 100% Seamless Looping) */}
            <div
              className="flex shrink-0 items-center gap-6 pr-6"
              aria-hidden="true"
            >
              {items.map((feature, idx) => (
                <div
                  key={`dup-${idx}`}
                  className="flex items-center gap-2 shrink-0"
                >
                  <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 ring-2 ring-amber-400/40" />
                  <span className="text-[12px] font-semibold tracking-wide text-blue-100/90 hover:text-amber-300 transition-colors">
                    {feature}
                  </span>
                  <Sparkles className="ml-1 h-3 w-3 text-amber-400/60 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hardware-accelerated 60fps keyframe animation */}
      <style>{`
        @keyframes ticker {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default WhatsNewTicker;
