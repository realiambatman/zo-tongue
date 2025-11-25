import React from "react";
import { AppMode } from "../types";

interface LandingPageProps {
  onNavigate: (mode: AppMode) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <div className="w-8 h-8 bg-gradient-to-br from-brand-600 to-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/20">
                Z
              </div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">
                ZoTongue<span className="text-brand-600">AI</span>
              </span>
            </div>
            <div className="hidden md:flex space-x-8">
              <a
                href="#features"
                className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
              >
                How it Works
              </a>
              <a
                href="#about"
                className="text-sm font-medium text-slate-600 hover:text-brand-600 transition-colors"
              >
                About
              </a>
            </div>
            <button
              onClick={() => onNavigate(AppMode.CHAT)}
              className="bg-slate-900 text-white px-4 py-2 rounded-full text-xs font-semibold hover:bg-slate-800 transition-all transform hover:-translate-y-0.5 shadow-sm"
            >
              Launch App
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-900 pt-16 pb-24 lg:pt-24 lg:pb-32">
        {/* Abstract Background Shapes - Toned Down */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full bg-brand-600/10 blur-[100px] animate-pulse"></div>
          <div className="absolute top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-violet-600/10 blur-[100px] animate-float"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center">
          {/* Text Content */}
          <div className="w-full lg:w-1/2 text-center lg:text-left z-10">
            {/* <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-brand-300 text-[10px] font-semibold tracking-wide uppercase mb-6 backdrop-blur-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse"></span>
              Powered by Gemini 3.0 Pro
            </div> */}
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-5">
              Master Languages, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-violet-400">
                Effortlessly.
              </span>
            </h1>
            <p className="mt-4 text-base lg:text-lg text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
              The most advanced AI platform for the Zo language family.
              Seamlessly bridge English with Paite, Thadou, Hmar, Mizo, and
              more.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center lg:justify-start gap-3">
              <button
                onClick={() => onNavigate(AppMode.CHAT)}
                className="px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-brand-600/20 hover:bg-brand-500 transition-all transform hover:-translate-y-0.5"
              >
                Start Chatting
              </button>
              <button
                onClick={() => onNavigate(AppMode.SOLVER)}
                className="group px-6 py-3 bg-white/5 backdrop-blur-sm text-white border border-white/10 rounded-xl font-semibold text-sm hover:bg-white/10 transition-all flex items-center justify-center"
              >
                <svg
                  className="w-4 h-4 mr-2 text-violet-400 group-hover:text-violet-300"
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
              </button>
            </div>
          </div>

          {/* 3D Graphic */}
          <div className="hidden lg:flex w-1/2 items-center justify-center relative h-[400px] perspective-1000">
            {/* CSS 3D Cube Construction */}
            <div className="relative w-64 h-64 transform-style-3d animate-rotate-3d">
              {/* Front */}
              <div
                className="absolute inset-0 bg-gradient-to-tr from-brand-600/10 to-brand-400/10 border border-brand-400/20 backdrop-blur-sm rounded-2xl transform translate-z-[128px]"
                style={{ transform: "translateZ(128px)" }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl filter drop-shadow-lg opacity-90">
                    💬
                  </span>
                </div>
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 bg-gradient-to-tr from-violet-600/10 to-violet-400/10 border border-violet-400/20 backdrop-blur-sm rounded-2xl transform translate-z-[-128px] rotate-y-180"
                style={{ transform: "translateZ(-128px) rotateY(180deg)" }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl filter drop-shadow-lg opacity-90">
                    🔄
                  </span>
                </div>
              </div>
              {/* Right */}
              <div
                className="absolute inset-0 bg-gradient-to-tr from-emerald-600/10 to-emerald-400/10 border border-emerald-400/20 backdrop-blur-sm rounded-2xl transform rotate-y-90 translate-z-[128px]"
                style={{ transform: "rotateY(90deg) translateZ(128px)" }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl filter drop-shadow-lg opacity-90">
                    🎓
                  </span>
                </div>
              </div>
              {/* Left */}
              <div
                className="absolute inset-0 bg-gradient-to-tr from-sky-600/10 to-sky-400/10 border border-sky-400/20 backdrop-blur-sm rounded-2xl transform rotate-y-[-90deg] translate-z-[128px]"
                style={{ transform: "rotateY(-90deg) translateZ(128px)" }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-6xl filter drop-shadow-lg opacity-90">
                    📸
                  </span>
                </div>
              </div>
              {/* Top */}
              <div
                className="absolute inset-0 bg-white/5 border border-white/5 backdrop-blur-sm rounded-2xl transform rotate-x-90 translate-z-[128px]"
                style={{ transform: "rotateX(90deg) translateZ(128px)" }}
              ></div>
              {/* Bottom */}
              <div
                className="absolute inset-0 bg-white/5 border border-white/5 backdrop-blur-sm rounded-2xl transform rotate-x-[-90deg] translate-z-[128px]"
                style={{ transform: "rotateX(-90deg) translateZ(128px)" }}
              ></div>
            </div>

            {/* Orbiting Elements */}
            <div className="absolute w-[380px] h-[380px] border border-dashed border-brand-500/10 rounded-full animate-spin-slow"></div>
            <div className="absolute w-[500px] h-[500px] border border-dashed border-violet-500/10 rounded-full animate-spin-reverse-slow"></div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-brand-600 font-bold tracking-widest uppercase text-[10px] mb-2 block">
              Our Suite
            </span>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Tools designed for connection.
            </h2>
            <p className="text-slate-600 text-base">
              Everything you need to understand, learn, and communicate in
              Kuki-Chin-Mizo languages.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Feature 1 */}
            <div
              onClick={() => onNavigate(AppMode.CHAT)}
              className="group bg-white rounded-xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.05)] border border-slate-100 transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center mb-4 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">
                Native Chat
              </h4>
              <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-grow">
                Fluent conversation in Paite, Thadou, Hmar, Mizo, and more.
              </p>
              <div className="flex items-center text-brand-600 text-xs font-bold uppercase tracking-wide">
                Try Chat{" "}
                <svg
                  className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1"
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
              </div>
            </div>

            {/* Feature 2 */}
            <div
              onClick={() => onNavigate(AppMode.TRANSLATE)}
              className="group bg-white rounded-xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.05)] border border-slate-100 transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                  />
                </svg>
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">
                Deep Translate
              </h4>
              <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-grow">
                High-accuracy bidirectional translation between English and
                local dialects.
              </p>
              <div className="flex items-center text-indigo-600 text-xs font-bold uppercase tracking-wide">
                Translate{" "}
                <svg
                  className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1"
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
              </div>
            </div>

            {/* Feature 3 */}
            <div
              onClick={() => onNavigate(AppMode.STUDY)}
              className="group bg-white rounded-xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.05)] border border-slate-100 transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">
                Study Companion
              </h4>
              <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-grow">
                Paste any text to get instant summaries and generated quiz
                questions.
              </p>
              <div className="flex items-center text-emerald-600 text-xs font-bold uppercase tracking-wide">
                Start Learning{" "}
                <svg
                  className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1"
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
              </div>
            </div>

            {/* Feature 4 */}
            <div
              onClick={() => onNavigate(AppMode.SOLVER)}
              className="group bg-white rounded-xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.05)] border border-slate-100 transition-all duration-300 cursor-pointer flex flex-col hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center mb-4 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h4 className="text-base font-bold text-slate-900 mb-2">
                Smart Solver
              </h4>
              <p className="text-slate-500 text-sm leading-relaxed mb-4 flex-grow">
                Stuck on a problem? Snap a photo and get detailed step-by-step
                help.
              </p>
              <div className="flex items-center text-violet-600 text-xs font-bold uppercase tracking-wide">
                Solve Now{" "}
                <svg
                  className="w-3 h-3 ml-1 transition-transform group-hover:translate-x-1"
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div
        id="how-it-works"
        className="py-16 bg-white border-t border-slate-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
            <p className="text-slate-500 mt-2 text-sm">
              Three simple steps to bridge the gap.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* Connecting Line for Desktop */}
            <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-0.5 bg-slate-100 -z-10"></div>

            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-white border-4 border-slate-50 rounded-full flex items-center justify-center mb-5 shadow-sm relative z-10">
                <span className="text-xl font-bold text-brand-500">1</span>
              </div>
              <h3 className="font-bold text-base mb-2">Choose your Tool</h3>
              <p className="text-slate-500 text-sm px-4">
                Select Chat, Translate, Study, or Solve from our dashboard.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-white border-4 border-slate-50 rounded-full flex items-center justify-center mb-5 shadow-sm relative z-10">
                <span className="text-xl font-bold text-brand-500">2</span>
              </div>
              <h3 className="font-bold text-base mb-2">Select Language</h3>
              <p className="text-slate-500 text-sm px-4">
                Pick between Paite, Thadou, Hmar, and more.
              </p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-white border-4 border-slate-50 rounded-full flex items-center justify-center mb-5 shadow-sm relative z-10">
                <span className="text-xl font-bold text-brand-500">3</span>
              </div>
              <h3 className="font-bold text-base mb-2">Get Instant Results</h3>
              <p className="text-slate-500 text-sm px-4">
                Let Gemini 3 Pro analyze and respond in real-time.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-900 py-12 mt-auto text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            {/* Brand Column */}
            <div className="col-span-1 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-gradient-to-br from-brand-600 to-brand-500 rounded-lg flex items-center justify-center text-white font-bold text-base">
                  Z
                </div>
                <span className="text-base font-bold text-white tracking-tight">
                  ZoTongue<span className="text-brand-500">AI</span>
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed mb-6 text-xs">
                Empowering the Kuki-Chin-Mizo communities with cutting-edge
                artificial intelligence to preserve language and foster
                education.
              </p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <span className="sr-only">Twitter</span>
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
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <span className="sr-only">GitHub</span>
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

            {/* Links Columns */}
            <div>
              <h3 className="text-white font-semibold mb-3 uppercase tracking-wider text-[10px]">
                Platform
              </h3>
              <ul className="space-y-2">
                <li>
                  <button
                    onClick={() => onNavigate(AppMode.CHAT)}
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Native Chat
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate(AppMode.TRANSLATE)}
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Translator
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate(AppMode.STUDY)}
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Study Companion
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigate(AppMode.SOLVER)}
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Visual Solver
                  </button>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-3 uppercase tracking-wider text-[10px]">
                Resources
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Language Support
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Community Forum
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-3 uppercase tracking-wider text-[10px]">
                Company
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Legal
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="text-slate-400 hover:text-brand-400 transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-xs">
              © 2024 ZoTongue AI. All rights reserved.
            </p>
            <div className="flex gap-6 text-slate-500 text-xs">
              <a href="#" className="hover:text-white">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
