import React from "react";

export const ServiceUnavailable: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-50 animate-gradient-shift"></div>

      {/* Floating orbs for visual interest */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-200/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent-light/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Icon/Logo */}
        <div className="mb-8 flex justify-center">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-accent to-indigo-500 rounded-3xl rotate-6 opacity-20 blur-xl"></div>
            <div className="relative bg-white rounded-2xl p-6 shadow-2xl border border-slate-200">
              <svg
                className="w-12 h-12 text-accent"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-black text-ink leading-tight">
            Service
            <br />
            <span className="bg-gradient-to-r from-accent to-indigo-500 bg-clip-text text-transparent">
              Unavailable
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-ink-muted font-medium max-w-xl mx-auto leading-relaxed">
            We're currently performing maintenance to improve your experience.
            <br />
            Please check back soon.
          </p>

          {/* Status indicator */}
          <div className="flex items-center justify-center gap-3 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-slate-200 shadow-sm">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-mono uppercase tracking-widest text-slate-600">
                Maintenance Mode
              </span>
            </div>
          </div>

          {/* Decorative elements */}
          <div className="pt-12 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-accent/30 rounded-full animate-bounce"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: "1.4s",
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-shift {
          background-size: 200% 200%;
          animation: gradient-shift 15s ease infinite;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  );
};
