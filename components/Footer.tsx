import React from "react";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-800 py-8 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
           <span className="font-bold text-white">ZoTongue AI</span>
           <span>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6">
           <a href="#" className="hover:text-white transition-colors">Privacy</a>
           <a href="#" className="hover:text-white transition-colors">Terms</a>
           <a href="#" className="hover:text-white transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
};
