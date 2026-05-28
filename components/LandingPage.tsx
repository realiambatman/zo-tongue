import React, { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { AppMode } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { isPlatformAdminEmail } from "../constants";
import { SignInModal } from "./SignInModal";
// Removed useNavigate import as we use window.location for SSR-like feel

// RevealText Component for animated text
interface RevealTextProps {
  children: React.ReactNode;
  className?: string;
}

const RevealText: React.FC<RevealTextProps> = ({ children, className }) => {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-100px" }}
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      <motion.span
        className="inline-block"
        variants={{
          hidden: { opacity: 0, y: 50, rotateX: 20 },
          visible: {
            opacity: 1,
            y: 0,
            rotateX: 0,
            transition: { duration: 0.8, ease: [0.2, 0.65, 0.3, 0.9] },
          },
        }}
      >
        {children}
      </motion.span>
    </motion.div>
  );
};

export const LandingPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const onProfile = () => (window.location.href = "/profile");
  const onAdmin = () => (window.location.href = "/admin");

  // Navigation helper function
  const onNavigate = (mode: AppMode) => {
    const routes: Record<AppMode, string> = {
      [AppMode.CHAT]: "/chat",
      [AppMode.TRANSLATE]: "/translate",
      [AppMode.STUDY]: "/study",
      [AppMode.SOLVER]: "/solver",
    };
    window.location.href = routes[mode] || "/chat";
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isSignInModalOpen, setIsSignInModalOpen] = useState(false);
  // Use rotation matrix for world-space rotations (avoids gimbal lock)
  // Initial tilt: approximately rotateY(-30deg) * rotateX(-20deg) for a nice angled view
  const [rotationMatrix, setRotationMatrix] = useState<number[][]>([
    [0.866, 0.171, -0.47],
    [0, 0.94, 0.342],
    [0.5, -0.296, 0.814],
  ]);
  const cubeRef = React.useRef<HTMLDivElement>(null);
  const { user, signInWithGoogle, signOut } = useAuth();

  // Matrix multiplication helper
  const multiplyMatrices = (a: number[][], b: number[][]): number[][] => {
    const result: number[][] = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        result[i][j] =
          a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
      }
    }
    return result;
  };

  // Create rotation matrix for Y axis (horizontal drag - world space)
  const createRotationY = (angleDeg: number): number[][] => {
    const rad = (angleDeg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
      [c, 0, s],
      [0, 1, 0],
      [-s, 0, c],
    ];
  };

  // Create rotation matrix for X axis (vertical drag - world space)
  const createRotationX = (angleDeg: number): number[][] => {
    const rad = (angleDeg * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return [
      [1, 0, 0],
      [0, c, -s],
      [0, s, c],
    ];
  };

  // Convert rotation matrix to CSS matrix3d string
  const toMatrix3d = (m: number[][]): string => {
    return `matrix3d(${m[0][0]}, ${m[1][0]}, ${m[2][0]}, 0, ${m[0][1]}, ${m[1][1]}, ${m[2][1]}, 0, ${m[0][2]}, ${m[1][2]}, ${m[2][2]}, 0, 0, 0, 0, 1)`;
  };

  // Auto-rotation effect
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      if (!isDragging) {
        setRotationMatrix((prev) => {
          const rotY = createRotationY(0.2);
          return multiplyMatrices(rotY, prev);
        });
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    setLastMousePos({ x: clientX, y: clientY });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;

    const clientX =
      "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY =
      "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    const deltaX = clientX - lastMousePos.x;
    const deltaY = clientY - lastMousePos.y;

    const sensitivity = 0.5;

    setRotationMatrix((prev) => {
      // Apply rotations in world space by pre-multiplying
      const rotY = createRotationY(deltaX * sensitivity);
      const rotX = createRotationX(-deltaY * sensitivity);
      // Order: rotY * rotX * prev (world space rotations)
      return multiplyMatrices(rotY, multiplyMatrices(rotX, prev));
    });

    setLastMousePos({ x: clientX, y: clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  // Helper to check if user is admin (matches AdminPanel logic)
  const isAdmin = isPlatformAdminEmail(user?.email ?? null);
  // Helper to check if user is a registered user (not anonymous)
  const isRegistered = user && !user.isAnonymous;

  const tools = [
    {
      mode: AppMode.CHAT,
      title: "Native Chat",
      description:
        "Fluent conversation in Paite, Thadou, Hmar, Mizo, and more native languages.",
      cta: "Start Chatting",
      icon: (
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
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
    {
      mode: AppMode.TRANSLATE,
      title: "Deep Translate",
      description:
        "High-accuracy bidirectional translation between English and local dialects.",
      cta: "Translate Now",
      icon: (
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
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>
      ),
    },
    {
      mode: AppMode.STUDY,
      title: "Study Companion",
      description:
        "Paste any text to get instant summaries and AI-generated quiz questions.",
      cta: "Start Learning",
      icon: (
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
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
      ),
    },
    {
      mode: AppMode.SOLVER,
      title: "Smart Solver",
      description:
        "Stuck on a problem? Snap a photo and get detailed step-by-step solutions.",
      cta: "Solve Now",
      icon: (
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
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col">
      {/* ========================================
          NAVIGATION - Minimal & Clean
          ======================================== */}
      {/* Navigation handled by global Layout/Navbar */}

      {/* Mobile Side Panel (Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Drawer */}
          <div className="absolute right-0 top-0 bottom-0 w-[80%] max-w-xs bg-surface shadow-2xl p-8 flex flex-col animate-in slide-in-from-right duration-300">
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
                className="p-2 -mr-2 text-ink-muted hover:text-ink"
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
              {isRegistered && (
                <button
                  onClick={() => {
                    onProfile();
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left font-display text-2xl font-bold text-ink hover:text-accent transition-colors"
                >
                  Profile
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => {
                    onAdmin();
                    setIsMobileMenuOpen(false);
                  }}
                  className="text-left font-display text-2xl font-bold text-ink hover:text-accent transition-colors"
                >
                  Admin
                </button>
              )}
              <a
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-left font-display text-2xl font-bold text-ink hover:text-accent transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-left font-display text-2xl font-bold text-ink hover:text-accent transition-colors"
              >
                How it Works
              </a>
              <a
                href="#about"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-left font-display text-2xl font-bold text-ink hover:text-accent transition-colors"
              >
                About
              </a>
            </div>

            <div className="mt-auto pt-8 border-t border-slate-100 flex flex-col gap-4">
              {isRegistered ? (
                <>
                  <button
                    onClick={() => {
                      window.location.href = "/chat";
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full bg-ink text-white px-6 py-4 rounded-full text-sm font-bold uppercase tracking-wider hover:bg-slate-800 transition-all"
                  >
                    Launch App
                  </button>
                  <button
                    onClick={() => {
                      signOut();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-center text-red-500 font-mono text-xs uppercase tracking-widest hover:text-red-600"
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

      {/* ========================================
          HERO SECTION - Cinematic & Immersive (Sticky/Fixed for Parallax)
          ======================================== */}
      <div className="sticky top-0 z-0 w-full h-[100dvh] sm:h-screen min-h-[600px] sm:min-h-[700px]">
        <section className="absolute inset-0 bg-slate-300 overflow-hidden flex flex-col justify-center pt-20 sm:pt-20 pb-24 sm:pb-24">
          {/* Atmospheric Background - static orbs for smooth scrolling */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Soft gradient orbs - no animation for smooth scroll */}
            <div className="absolute -top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full bg-accent/5 blur-[80px] md:bg-accent/3 md:blur-[120px]"></div>
            <div className="absolute top-1/4 -right-1/4 w-[70%] h-[70%] rounded-full bg-indigo-500/5 blur-[60px] md:w-[50%] md:h-[50%] md:bg-indigo-400/3 md:blur-[100px]"></div>
            <div className="absolute -bottom-1/4 left-1/3 w-[60%] h-[60%] rounded-full bg-violet-500/5 blur-[80px] md:w-[40%] md:h-[40%] md:bg-violet-500/3"></div>

            {/* Mobile gradient mesh - static */}
            <div className="absolute inset-0 opacity-20 md:hidden bg-[radial-gradient(circle_at_50%_50%,rgba(76,29,149,0.1),transparent_70%)]"></div>

            {/* Subtle grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03] md:opacity-[0.02]"
              style={{
                backgroundImage: `linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px)`,
                backgroundSize: "40px 40px",
              }}
            ></div>

            {/* Large Decorative Text - Hero Background - Animated */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-[0.03]">
              <h1 className="text-[20vw] sm:text-[25vw] md:text-[18vw] font-display font-bold leading-none tracking-tighter text-slate-900 whitespace-nowrap">
                ZOTONGUE
              </h1>
            </div>

            {/* Scroll Down Indicator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 1.5, duration: 0.8 }}
              className="absolute bottom-32 left-[44%] md:left-[50%] -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-slow md:bottom-12"
            >
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
                Scroll
              </span>
              <svg
                className="w-5 h-5 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </motion.div>
          </div>

          <div className="relative max-w-[1400px] mx-auto px-6 sm:px-6 lg:px-12 pt-0 pb-24 lg:pt-32 lg:pb-40 w-full">
            <div className="flex flex-col lg:flex-row items-center gap-8 sm:gap-10 lg:gap-16 mb-0 lg:mb-0">
              {/* Text Content */}
              <div className="w-full lg:w-1/2 text-center lg:text-left space-y-4 sm:space-y-0">
                {/* Main Headline - Large, Bold, Swiss Style with Animation */}
                <RevealText className="text-[12vw] sm:text-[11vw] md:text-[10vw] lg:text-[8vw] font-display font-bold tracking-tighter leading-[0.95] sm:leading-[0.85] lg:leading-[0.75] uppercase text-ink mb-4 sm:mb-6 md:mb-8">
                  Master
                  <br />
                  <span className="text-transparent stroke-text bg-clip-text bg-gradient-to-r from-white via-white/50 to-transparent">
                    Languages
                  </span>
                  <br />
                  Effortlessly
                </RevealText>

                {/* Subtitle - Adjusted for Swiss Grid alignment with Animation */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                  className="flex flex-col md:flex-row gap-8 items-start md:items-center max-w-2xl"
                >
                  <p className="text-sm sm:text-base lg:text-xl text-slate-600 md:text-slate-700 max-w-md mx-auto lg:mx-0 leading-relaxed font-light mb-6 sm:mb-8 md:mb-12 border-l-0 md:border-l border-slate-300 pl-0 md:pl-6 text-center md:text-left px-2 sm:px-0">
                    The most advanced AI platform for the Zo language family.
                    Seamlessly bridge English with Paite, Thadou, Hmar, Mizo,
                    and more.
                  </p>
                </motion.div>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1, duration: 0.8 }}
                  className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 w-full sm:w-auto px-2 sm:px-0"
                >
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => (window.location.href = "/chat")}
                    className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-ink text-white rounded-full font-semibold text-sm hover:bg-slate-800 transition-all duration-300 hover:shadow-xl hover:shadow-slate-900/10 flex items-center justify-center gap-2"
                  >
                    Start Chatting
                    <svg
                      className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 8l4 4m0 0l-4 4m4-4H3"
                      />
                    </svg>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => (window.location.href = "/solver")}
                    className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-slate-100 text-ink border border-slate-200 rounded-full font-semibold text-sm hover:bg-white hover:border-slate-300 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4 text-accent"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Visual Solver
                  </motion.button>
                </motion.div>
              </div>

              {/* 3D Graphic Element - Refined for Digital Swiss */}
              <div
                className={`hidden lg:flex w-1/2 items-center justify-center relative h-[500px] perspective-1000 transition-all duration-1000 delay-300 ${
                  isLoaded
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
              >
                {/* Floating Cube - Interactive */}
                <div
                  className="relative w-80 h-80 perspective-1000 z-20 cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleMouseDown}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={handleMouseUp}
                >
                  <div
                    className="relative w-full h-full transform-style-3d transition-transform duration-75 ease-linear"
                    style={{
                      transform: toMatrix3d(rotationMatrix),
                    }}
                  >
                    {/* Front - Chat (Abstract Network Bubble) */}
                    <div
                      className="absolute inset-0 bg-slate-900 border border-white/20 rounded-3xl flex items-center justify-center shadow-2xl backface-hidden select-none"
                      style={{
                        transform: "translateZ(160px)",
                        backfaceVisibility: "hidden",
                      }}
                    >
                      <svg
                        className="w-32 h-32 text-white stroke-[1.5]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7.5 8.25h9m-9 3.75h9m-9 3.75h9m1.8-11.25a3 3 0 11-6 0 3 3 0 016 0z"
                          className="opacity-0"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"
                        />
                        <circle
                          cx="8"
                          cy="11.5"
                          r="1.5"
                          fill="currentColor"
                          className="animate-pulse"
                        />
                        <circle
                          cx="12"
                          cy="11.5"
                          r="1.5"
                          fill="currentColor"
                          className="animate-pulse delay-100"
                        />
                        <circle
                          cx="16"
                          cy="11.5"
                          r="1.5"
                          fill="currentColor"
                          className="animate-pulse delay-200"
                        />
                      </svg>
                    </div>
                    {/* Back - Translate (Abstract Cycles) */}
                    <div
                      className="absolute inset-0 bg-white border border-slate-200/20 rounded-3xl flex items-center justify-center shadow-2xl backface-hidden"
                      style={{
                        transform: "rotateY(180deg) translateZ(160px)",
                        backfaceVisibility: "hidden",
                      }}
                    >
                      <svg
                        className="w-32 h-32 text-slate-900 stroke-[1.5]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 9l3-3 3 3"
                          className="opacity-50"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 15l-3 3-3-3"
                          className="opacity-50"
                        />
                      </svg>
                    </div>
                    {/* Right - Study (Abstract Data Book) */}
                    <div
                      className="absolute inset-0 bg-slate-800 border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl backface-hidden"
                      style={{
                        transform: "rotateY(90deg) translateZ(160px)",
                        backfaceVisibility: "hidden",
                      }}
                    >
                      <svg
                        className="w-32 h-32 text-white stroke-[1.5]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 3v15"
                          className="opacity-50"
                        />
                        <circle
                          cx="12"
                          cy="6"
                          r="2"
                          fill="currentColor"
                          className="animate-ping"
                        />
                      </svg>
                    </div>
                    {/* Left - Solver (Abstract Lens/Focus) */}
                    <div
                      className="absolute inset-0 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-center shadow-2xl backface-hidden"
                      style={{
                        transform: "rotateY(-90deg) translateZ(160px)",
                        backfaceVisibility: "hidden",
                      }}
                    >
                      <svg
                        className="w-32 h-32 text-indigo-600 stroke-[1.5]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 3h6v6H3z"
                          className="opacity-20"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 3h6v6h-6z"
                          className="opacity-20"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 15h6v6H3z"
                          className="opacity-20"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 15h6v6h-6z"
                          className="opacity-20"
                        />
                        <circle cx="12" cy="12" r="4" strokeWidth="2" />
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v-3m0 14v-3m-4-4H5m14 0h-3"
                        />
                      </svg>
                    </div>
                    {/* Top - Decorative */}
                    <div
                      className="absolute inset-0 bg-slate-900 border border-white/10 rounded-3xl flex items-center justify-center backface-hidden"
                      style={{
                        transform: "rotateX(90deg) translateZ(160px)",
                        backfaceVisibility: "hidden",
                      }}
                    ></div>
                    {/* Bottom - Decorative */}
                    <div
                      className="absolute inset-0 bg-slate-900 border border-white/10 rounded-3xl flex items-center justify-center backface-hidden"
                      style={{
                        transform: "rotateX(-90deg) translateZ(160px)",
                        backfaceVisibility: "hidden",
                      }}
                    ></div>
                  </div>
                </div>

                {/* Minimal Orbiting Elements - outside 3D context, always behind */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                  <div className="absolute w-[450px] h-[450px] border border-white/10 rounded-full animate-spin-slow"></div>
                  <div className="absolute w-[580px] h-[580px] border border-white/5 rounded-full animate-spin-reverse-slow"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Curved Bottom Edge - Organic Connection */}
          {/* <div className="absolute bottom-0 left-0 right-0 h-10 bg-canvas rounded-t-[4rem] z-20"></div> */}
        </section>
      </div>

      {/* ========================================
          FEATURES SECTION - Magazine Grid
          ======================================== */}
      <div className="relative z-10 bg-canvas rounded-t-[4rem] mt-[-40px] pt-10 overflow-hidden">
        <section id="features" className="py-3 relative z-10">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
            {/* Section Header - Aligned Left for Editorial Feel */}
            <div className="max-w-2xl mb-24">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-px w-12 bg-accent"></div>
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
                  Our Suite
                </span>
              </div>
              <h2 className="font-display text-6xl md:text-7xl font-bold text-ink tracking-tighter leading-[0.9] mb-8">
                Tools for
                <br />
                Connection
              </h2>
              <p className="text-xl text-ink-muted font-light leading-relaxed max-w-xl border-l border-slate-200 pl-6">
                Everything you need to understand, learn, and communicate in
                Native languages.
              </p>
            </div>

            {/* Features Grid - Asymmetric Magazine Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              {/* Primary Feature - Chat */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => (window.location.href = "/chat")}
                className="lg:col-span-7 group relative bg-white rounded-[2.5rem] p-10 lg:p-16 overflow-hidden border border-slate-100 shadow-card hover:shadow-2xl transition-all duration-700 ease-out-expo cursor-pointer h-[500px] flex flex-col justify-between"
              >
                <div className="relative z-10">
                  <span className="inline-block px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-xs font-mono uppercase tracking-widest text-slate-500 mb-6 group-hover:bg-ink group-hover:text-white transition-colors duration-500">
                    Flagship
                  </span>
                  <h3 className="font-display text-4xl lg:text-5xl font-bold text-ink mb-6 leading-tight group-hover:translate-x-2 transition-transform duration-500">
                    Native Chat<span className="text-accent">.</span>
                  </h3>
                  <p className="text-lg text-slate-500 font-light leading-relaxed max-w-md group-hover:text-slate-600 transition-colors">
                    Fluent, nuance-aware conversation in Paite, Thadou, Hmar,
                    Mizo, and more.
                  </p>
                </div>

                {/* Visual Decoration */}
                <div className="absolute bottom-0 right-0 w-3/4 h-3/4 bg-gradient-to-tl from-slate-50 to-transparent rounded-tl-[100%] opacity-50 group-hover:scale-110 transition-transform duration-700 ease-out-expo pointer-events-none"></div>
                <div className="absolute -bottom-10 -right-10 w-64 h-64 text-slate-100 group-hover:text-slate-200 transition-colors duration-500">
                  {tools[0].icon}
                </div>

                {/* Action */}
                <div className="relative z-10 flex items-center gap-3 text-ink font-bold text-sm uppercase tracking-wider group-hover:gap-5 transition-all duration-500">
                  Start Chatting
                  <div className="w-8 h-px bg-ink group-hover:w-16 transition-all duration-500"></div>
                </div>
              </motion.div>

              {/* Secondary Column */}
              <div className="lg:col-span-5 flex flex-col gap-8">
                {/* Translate Feature */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => (window.location.href = "/translate")}
                  className="group flex-1 bg-slate-900 rounded-[2.5rem] p-10 border border-slate-800 shadow-card hover:shadow-2xl transition-all duration-500 ease-out-expo cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[50px] rounded-full group-hover:bg-accent/20 transition-colors duration-500"></div>

                  <div className="relative z-10 h-full flex flex-col justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-500">
                      {tools[1].icon}
                    </div>
                    <h3 className="font-display text-3xl font-bold text-white mb-3">
                      Deep Translate
                    </h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                      Bidirectional accuracy for local dialects.
                    </p>
                    <span className="text-white text-xs font-mono uppercase tracking-widest border-b border-white/20 pb-1 inline-block group-hover:border-white transition-colors">
                      Try Now
                    </span>
                  </div>
                </motion.div>

                {/* Study Feature */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => (window.location.href = "/study")}
                  className="group flex-1 bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-card hover:shadow-2xl transition-all duration-500 ease-out-expo cursor-pointer relative overflow-hidden"
                >
                  <div className="relative z-10 h-full flex flex-col justify-center">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-ink mb-6 group-hover:bg-ink group-hover:text-white transition-all duration-500">
                      {tools[2].icon}
                    </div>
                    <h3 className="font-display text-3xl font-bold text-ink mb-3">
                      Study Companion
                    </h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-6">
                      Instant summaries & AI quizzes.
                    </p>
                    <span className="text-ink text-xs font-mono uppercase tracking-widest border-b border-slate-200 pb-1 inline-block group-hover:border-ink transition-colors">
                      Learn More
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Bottom Full Width - Solver */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.3 }}
                whileHover={{ scale: 1.01 }}
                onClick={() => (window.location.href = "/solver")}
                className="lg:col-span-12 group relative bg-slate-50 rounded-[2.5rem] p-10 lg:p-14 border border-slate-200 overflow-hidden cursor-pointer hover:bg-white hover:shadow-2xl transition-all duration-700 ease-out-expo flex flex-col md:flex-row items-center gap-10"
              >
                <div className="md:w-1/2 relative z-10">
                  <span className="text-accent font-mono text-xs uppercase tracking-widest mb-4 block">
                    Visual Intelligence
                  </span>
                  <h3 className="font-display text-4xl font-bold text-ink mb-4">
                    Smart Solver
                  </h3>
                  <p className="text-slate-500 text-lg leading-relaxed max-w-md mb-8">
                    Stuck on a problem? Snap a photo and get detailed
                    step-by-step solutions instantly.
                  </p>
                  <button className="bg-ink text-white px-8 py-3 rounded-full text-sm font-semibold group-hover:bg-accent transition-colors duration-300">
                    Open Camera
                  </button>
                </div>
                <div className="md:w-1/2 flex justify-center relative">
                  {/* Abstract Camera Graphic */}
                  <div className="w-64 h-64 relative">
                    <div className="absolute inset-0 border-2 border-slate-200 rounded-full animate-spin-slow"></div>
                    <div className="absolute inset-4 border border-slate-300 rounded-full animate-spin-reverse-slow opacity-50"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-slate-300 group-hover:text-accent transition-colors duration-500 transform group-hover:scale-110">
                      {React.cloneElement(
                        tools[3].icon as React.ReactElement<any>,
                        {
                          className: "w-24 h-24",
                        }
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ========================================
          HOW IT WORKS SECTION - Swiss Connector
          ======================================== */}
        <section
          id="how-it-works"
          className="py-32 bg-surface border-y border-slate-100 overflow-hidden"
        >
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              {/* Left Content - Sticky Feel */}
              <div className="relative z-10">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="inline-flex items-center gap-3 mb-8"
                >
                  <span className="w-12 h-px bg-ink"></span>
                  <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink">
                    Workflow
                  </span>
                </motion.div>
                <RevealText className="text-6xl font-display font-bold text-ink tracking-tighter leading-[0.95] mb-8">
                  Seamless
                  <br />
                  Integration<span className="text-accent">.</span>
                </RevealText>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3, duration: 0.8 }}
                  className="text-xl text-slate-500 font-light leading-relaxed max-w-md mb-12"
                >
                  Designed for instant utility. No complex setups, just pure
                  linguistic power at your fingertips.
                </motion.p>
                <button
                  onClick={() => (window.location.href = "/chat")}
                  className="group bg-slate-50 border border-slate-200 text-ink px-8 py-4 rounded-full font-semibold text-sm hover:bg-ink hover:text-white hover:border-ink transition-all duration-300 flex items-center gap-2"
                >
                  Try it Now
                  <svg
                    className="w-4 h-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </button>
              </div>

              {/* Right - Vertical Timeline Cards */}
              <div className="relative space-y-6">
                {/* Connecting Line */}
                <div className="absolute left-8 top-8 bottom-8 w-px bg-slate-100 z-0"></div>

                {[
                  {
                    num: "01",
                    title: "Select Tool",
                    desc: "Choose Chat, Translate, Study, or Solver.",
                  },
                  {
                    num: "02",
                    title: "Input Content",
                    desc: "Type text, speak, or upload an image.",
                  },
                  {
                    num: "03",
                    title: "Instant Results",
                    desc: "Get AI-powered insights in seconds.",
                  },
                ].map((step, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    className="relative z-10 group bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:shadow-card-hover hover:border-slate-200 hover:-translate-x-2 transition-all duration-500 cursor-default flex items-center gap-6"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-ink group-hover:border-ink transition-colors duration-500">
                      <span className="font-display font-bold text-xl text-slate-400 group-hover:text-white transition-colors duration-500">
                        {step.num}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-display text-xl font-bold text-ink mb-1">
                        {step.title}
                      </h3>
                      <p className="text-slate-500 text-sm font-light">
                        {step.desc}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ========================================
          ABOUT SECTION - Minimalist Editorial
          ======================================== */}
        <section id="about" className="py-40 bg-canvas relative">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-12 text-center">
            <div className="inline-block mb-12">
              <span className="font-mono text-xs uppercase tracking-[0.3em] text-slate-400 border-b border-slate-200 pb-2">
                Our Mission
              </span>
            </div>

            <h2 className="font-display text-5xl md:text-7xl font-bold text-ink tracking-tight mb-12 leading-[1.1]">
              "Preserving heritage through the lens of{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-emerald-500">
                modern intelligence
              </span>
              ."
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left border-t border-slate-200 pt-12">
              <div>
                <h4 className="font-bold text-ink mb-4">Community First</h4>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Built specifically for Native dialects, ensuring cultural
                  nuance is never lost in translation.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-ink mb-4">Innovation at Heart</h4>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Harnessing the latest advances in artificial intelligence and
                  language technology to bring meaningful solutions for every
                  generation.
                </p>
              </div>
              <div>
                <h4 className="font-bold text-ink mb-4">Education Focused</h4>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Tools designed not just to solve problems, but to explain the
                  'why' and 'how' behind them.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================
          FOOTER - Architectural Index
          ======================================== */}
        <footer className="bg-ink pt-0 pb-0 relative overflow-hidden">
          {/* Marquee Strip */}
          <div className="bg-accent py-3 overflow-hidden">
            <div className="animate-marquee flex">
              <span className="text-white font-mono text-sm font-bold tracking-widest mx-4">
                PAITE • THADOU • HMAR • MIZO • KOM • SIMTE • VAIPHEI • ZOU •
                GANGTE •
              </span>
              <span className="text-white font-mono text-sm font-bold tracking-widest mx-4">
                PAITE • THADOU • HMAR • MIZO • KOM • SIMTE • VAIPHEI • ZOU •
                GANGTE •
              </span>
              <span className="text-white font-mono text-sm font-bold tracking-widest mx-4">
                PAITE • THADOU • HMAR • MIZO • KOM • SIMTE • VAIPHEI • ZOU •
                GANGTE •
              </span>
              <span className="text-white font-mono text-sm font-bold tracking-widest mx-4">
                PAITE • THADOU • HMAR • MIZO • KOM • SIMTE • VAIPHEI • ZOU •
                GANGTE •
              </span>
              <span className="text-white font-mono text-sm font-bold tracking-widest mx-4">
                PAITE • THADOU • HMAR • MIZO • KOM • SIMTE • VAIPHEI • ZOU •
                GANGTE •
              </span>
              <span className="text-white font-mono text-sm font-bold tracking-widest mx-4">
                PAITE • THADOU • HMAR • MIZO • KOM • SIMTE • VAIPHEI • ZOU •
                GANGTE •
              </span>
            </div>
          </div>

          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 py-20 lg:py-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
              {/* Left - Brand & Manifesto */}
              <div className="flex flex-col justify-between h-full">
                <div>
                  {/* Footer Logo - Custom SVG */}
                  <div className="relative w-12 h-12 mb-8">
                    <div className="absolute inset-0 bg-gradient-to-br from-accent to-violet-600 rounded-xl rotate-6 opacity-50 blur-[1px]"></div>
                    <div className="absolute inset-0 bg-white rounded-xl -rotate-3 border border-white/10 flex items-center justify-center overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-100 to-white opacity-50"></div>
                      <svg
                        className="relative z-10 w-7 h-7 text-ink drop-shadow-sm transform translate-y-[1px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M20.5 5H7C5.89543 5 5 5.89543 5 7V7.5C5 8.05228 5.44772 8.5 6 8.5H16.1716L6.29289 18.3787C5.90237 18.7692 6.17905 19.4369 6.73132 19.4369H19.5C20.6046 19.4369 21.5 18.5414 21.5 17.4369V16.9369C21.5 16.3846 21.0523 15.9369 20.5 15.9369H10.3284L20.2071 6.05823C20.5976 5.66771 20.3209 5 19.7687 5H20.5Z"
                          fill="url(#z-gradient-footer)"
                        />
                        <defs>
                          <linearGradient
                            id="z-gradient-footer"
                            x1="5"
                            y1="5"
                            x2="21.5"
                            y2="19.5"
                            gradientUnits="userSpaceOnUse"
                          >
                            <stop stopColor="#0f172a" />
                            <stop offset="1" stopColor="#334155" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>
                  <h3 className="font-display text-4xl lg:text-5xl font-bold text-white leading-tight mb-8">
                    Bridging worlds,
                    <br />
                    one word at a time.
                  </h3>
                  <p className="text-slate-400 text-lg font-light max-w-md leading-relaxed">
                    The first comprehensive AI platform dedicated to the
                    preservation and evolution of the Zo languages.
                  </p>
                </div>

                <div className="mt-12 lg:mt-0">
                  <h4 className="text-white font-mono text-xs uppercase tracking-widest mb-6">
                    Connect
                  </h4>
                  <div className="flex gap-4">
                    {/* Social Icons */}
                    <a
                      href="#"
                      className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white hover:text-ink transition-all duration-300"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                      </svg>
                    </a>
                    <a
                      href="#"
                      className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:bg-white hover:text-ink transition-all duration-300"
                    >
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Right - Big Index Links */}
              <div className="flex flex-col gap-2 mt-12 lg:mt-0">
                <h4 className="text-slate-500 font-mono text-xs uppercase tracking-widest mb-6 border-b border-slate-800 pb-4">
                  Index
                </h4>
                {[
                  { label: "Native Chat", mode: AppMode.CHAT, num: "01" },
                  {
                    label: "Deep Translate",
                    mode: AppMode.TRANSLATE,
                    num: "02",
                  },
                  { label: "Study Companion", mode: AppMode.STUDY, num: "03" },
                  { label: "Visual Solver", mode: AppMode.SOLVER, num: "04" },
                ].map((item) => (
                  <button
                    key={item.mode}
                    onClick={() => onNavigate(item.mode)}
                    className="group flex items-baseline justify-between py-6 border-b border-slate-800 hover:border-white/30 transition-colors duration-500"
                  >
                    <span className="font-display text-3xl lg:text-5xl font-bold text-slate-400 group-hover:text-white transition-colors duration-300 text-left">
                      {item.label}
                    </span>
                    <span className="font-mono text-xs text-slate-600 group-hover:text-accent transition-colors duration-300">
                      ({item.num})
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Sign In Modal */}
      <SignInModal
        isOpen={isSignInModalOpen}
        onClose={() => setIsSignInModalOpen(false)}
      />
    </div>
  );
};
