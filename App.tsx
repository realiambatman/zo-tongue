import React, { useState } from 'react';
import { AppMode } from './types';
import ChatInterface from './components/ChatInterface';
import TranslatorInterface from './components/TranslatorInterface';
import StudyInterface from './components/StudyInterface';
import SolverInterface from './components/SolverInterface';
import { LandingPage } from './components/LandingPage';

const App: React.FC = () => {
  const [activeMode, setActiveMode] = useState<AppMode | null>(null);

  const handleBack = () => {
    setActiveMode(null);
  };

  return (
    <div className="font-sans text-slate-900">
      {/* The Website Landing Page is always rendered as the base */}
      <div className={activeMode ? 'hidden' : 'block'}>
         <LandingPage onNavigate={setActiveMode} />
      </div>

      {/* Tool Overlay - Active when a mode is selected */}
      {activeMode && (
        <div className="fixed inset-0 z-[100] bg-slate-100/50 backdrop-blur-sm animate-in fade-in duration-200 flex flex-col items-center justify-center p-0 md:p-6">
           {/* Container for the App Tool */}
           <div className="w-full h-full md:h-[90vh] md:max-w-3xl bg-white md:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative ring-1 ring-black/5">
              
              {activeMode === AppMode.CHAT && (
                <ChatInterface onBack={handleBack} />
              )}
              
              {activeMode === AppMode.TRANSLATE && (
                <TranslatorInterface onBack={handleBack} />
              )}

              {activeMode === AppMode.STUDY && (
                <StudyInterface onBack={handleBack} />
              )}

              {activeMode === AppMode.SOLVER && (
                <SolverInterface onBack={handleBack} />
              )}
           </div>
           
           {/* Desktop-only close hint */}
           <button 
              onClick={handleBack}
              className="hidden md:flex absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-sm hover:bg-white text-slate-500"
              title="Close Tool"
           >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
           </button>
        </div>
      )}
    </div>
  );
};

export default App;