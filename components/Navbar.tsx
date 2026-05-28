import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SignInModal } from "./SignInModal";
import { useAuth } from "../contexts/AuthContext";
import { isPlatformAdminEmail } from "../constants";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLandingPage = location.pathname === "/";

  // Helper to check if user is admin (matches AdminPanel logic)
  const isAdmin = isPlatformAdminEmail(user?.email ?? null);
  // Helper to check if user is a registered user (not anonymous)
  const isRegistered = user && !user.isAnonymous;

  useEffect(() => {
    if (!isLandingPage) {
      setIsScrolled(true);
      return;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state

    return () => window.removeEventListener("scroll", handleScroll);
  }, [isLandingPage]);

  const navItems = [
    {
      label: "Home",
      description: "Return to the landing page",
      path: "/",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: "Chat",
      description: "Native language conversation",
      path: "/chat",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
    },
    {
      label: "Translate",
      description: "Bidirectional translation",
      path: "/translate",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
      ),
    },
    {
      label: "Study",
      description: "AI-powered study materials",
      path: "/study",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
    },
    {
      label: "Solver",
      description: "Visual problem solver",
      path: "/solver",
      icon: (
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <>
      <nav
        className={cn(
          "fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b",
          isScrolled || !isLandingPage
            ? "bg-white border-slate-200 shadow-sm"
            : "bg-transparent border-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="flex items-center gap-3 cursor-pointer group"
            >
              {/* Icon Mark */}
              <div className="relative w-10 h-10 flex items-center justify-center perspective-500 group-hover:scale-110 transition-transform duration-500">
                {/* Back Glow Layer - Only visible when scrolled */}
                <div
                  className={cn(
                    "absolute inset-0 bg-gradient-to-br from-accent to-violet-600 rounded-xl rotate-6 group-hover:rotate-12 transition-all duration-500 ease-out-expo shadow-lg shadow-indigo-500/20 blur-[1px]",
                    isScrolled || !isLandingPage ? "opacity-100" : "opacity-0"
                  )}
                ></div>
                {/* Main Block */}
                <div className="absolute inset-0 bg-ink rounded-xl -rotate-3 group-hover:rotate-0 transition-transform duration-500 ease-out-expo border border-white/10 flex items-center justify-center overflow-hidden">
                  {/* Internal Shine */}
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
                  {/* The Z - Custom SVG */}
                  <svg
                    className="relative z-10 w-6 h-6 text-white drop-shadow-md transform translate-y-[1px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M20.5 5H7C5.89543 5 5 5.89543 5 7V7.5C5 8.05228 5.44772 8.5 6 8.5H16.1716L6.29289 18.3787C5.90237 18.7692 6.17905 19.4369 6.73132 19.4369H19.5C20.6046 19.4369 21.5 18.5414 21.5 17.4369V16.9369C21.5 16.3846 21.0523 15.9369 20.5 15.9369H10.3284L20.2071 6.05823C20.5976 5.66771 20.3209 5 19.7687 5H20.5Z"
                      fill="url(#z-gradient)"
                    />
                    <defs>
                      <linearGradient
                        id="z-gradient"
                        x1="5"
                        y1="5"
                        x2="21.5"
                        y2="19.5"
                        gradientUnits="userSpaceOnUse"
                      >
                        <stop stopColor="white" />
                        <stop offset="1" stopColor="#e2e8f0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </div>
              {/* Logotype */}
              <div className="flex flex-col">
                <span className="font-display text-xl font-black tracking-tighter leading-none text-ink">
                  ZO
                  <span className="font-medium text-slate-600">TONGUE</span>
                </span>
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.3em] text-accent leading-none mt-1">
                  AI Platform
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1 bg-slate-100/50 backdrop-blur-md p-1 rounded-xl border border-slate-200/60">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <div key={item.path} className="relative group">
                    <a
                      href={item.path}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                        isActive
                          ? "bg-white text-ink shadow-sm ring-1 ring-black/5"
                          : "text-slate-600 hover:text-ink hover:bg-white/50"
                      )}
                    >
                      {item.icon}
                      {item.label}
                    </a>
                    {/* Hover Tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
                      {item.description}
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                    </div>
                  </div>
                );
              })}
              {isAdmin && (
                <div className="relative group">
                  <a
                    href="/admin"
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                      location.pathname === "/admin"
                        ? "bg-white text-ink shadow-sm ring-1 ring-black/5"
                        : "text-slate-600 hover:text-ink hover:bg-white/50"
                    )}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                    Admin
                  </a>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 shadow-lg">
                    Admin dashboard
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center gap-3">
              {isRegistered ? (
                <>
                  <Link
                    to="/profile"
                    className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg bg-ink text-white hover:bg-slate-800"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsSignInModalOpen(true)}
                    className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setIsSignInModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-lg bg-ink text-white hover:bg-slate-800"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>

            {/* Mobile Menu Button (Hamburger) */}
            <button
              className="md:hidden p-2 text-ink"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Side Panel (Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Drawer */}
          <div className="absolute right-0 top-0 bottom-0 w-[80%] max-w-xs bg-white shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-12">
              {/* Mobile Logo */}
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-accent to-violet-600 rounded-xl rotate-3 opacity-80"></div>
                  <div className="absolute inset-0 bg-ink rounded-xl -rotate-2 border border-white/10 flex items-center justify-center overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/10 to-transparent opacity-50"></div>
                    <svg
                      className="relative z-10 w-6 h-6 text-white drop-shadow-md transform translate-y-[1px]"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M20.5 5H7C5.89543 5 5 5.89543 5 7V7.5C5 8.05228 5.44772 8.5 6 8.5H16.1716L6.29289 18.3787C5.90237 18.7692 6.17905 19.4369 6.73132 19.4369H19.5C20.6046 19.4369 21.5 18.5414 21.5 17.4369V16.9369C21.5 16.3846 21.0523 15.9369 20.5 15.9369H10.3284L20.2071 6.05823C20.5976 5.66771 20.3209 5 19.7687 5H20.5Z"
                        fill="url(#z-gradient-mobile)"
                      />
                      <defs>
                        <linearGradient
                          id="z-gradient-mobile"
                          x1="5"
                          y1="5"
                          x2="21.5"
                          y2="19.5"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="white" />
                          <stop offset="1" stopColor="#e2e8f0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-xl font-black tracking-tighter text-ink leading-none">
                    ZO<span className="font-medium text-slate-600">TONGUE</span>
                  </span>
                  <span className="text-[0.6rem] font-bold uppercase tracking-[0.25em] text-accent leading-none mt-0.5">
                    AI Platform
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-ink"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex flex-col gap-6 flex-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <a
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "text-left font-display text-2xl font-bold transition-colors",
                      isActive ? "text-ink" : "text-slate-600 hover:text-ink"
                    )}
                  >
                    {item.label}
                  </a>
                );
              })}
              {isAdmin && (
                <a
                  href="/admin"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "text-left font-display text-2xl font-bold transition-colors",
                    location.pathname === "/admin"
                      ? "text-ink"
                      : "text-slate-600 hover:text-ink"
                  )}
                >
                  Admin
                </a>
              )}
            </div>

            <div className="mt-auto pt-8 border-t border-slate-100 flex flex-col gap-4">
              {isRegistered ? (
                <>
                  <Link
                    to="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-full bg-white text-ink border border-slate-300 px-6 py-4 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-slate-50 transition-all text-center"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-ink text-white px-6 py-4 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-slate-800 transition-all"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setIsSignInModalOpen(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-ink text-white px-6 py-4 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-slate-800 transition-all"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </>
  );
};
