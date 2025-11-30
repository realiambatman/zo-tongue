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
    <div className="font-sans text-ink">
      {/* The Website Landing Page is always rendered as the base */}
      <div className={activeMode ? 'hidden' : 'block'}>
         <LandingPage onNavigate={setActiveMode} />
      </div>

      {/* Tool Overlay - Active when a mode is selected */}
      {activeMode && (
        <div className="fixed inset-0 z-[100] bg-ink/40 backdrop-blur-md animate-in fade-in duration-300 flex flex-col items-center justify-center p-0 md:p-8">
          {/* Container for the App Tool */}
          <div className="w-full h-full md:h-[90vh] md:max-w-3xl bg-surface md:rounded-4xl shadow-2xl overflow-hidden flex flex-col relative ring-1 ring-black/5">
            
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
          
          {/* Desktop-only close button */}
          <button 
            onClick={handleBack}
            className="hidden md:flex absolute top-6 right-6 bg-surface/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-surface text-ink-muted hover:text-ink transition-all duration-300 hover:scale-105"
            title="Close Tool"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
