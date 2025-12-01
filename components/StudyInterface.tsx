import React, { useState, useEffect } from 'react';
import { SupportedLanguage, StudyData, SessionType } from '../types';
import { generateStudyMaterial } from '../services/geminiService';
import { LanguageSelector } from './LanguageSelector';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useAuth } from '../contexts/AuthContext';
import { createNewSession, addMessageToSession } from '../services/dbService';

interface StudyInterfaceProps {
  onBack: () => void;
}

const StudyInterface: React.FC<StudyInterfaceProps> = ({ onBack }) => {
  const { user, loading: authLoading } = useAuth();
  const [targetLang, setTargetLang] = useState<SupportedLanguage>(SupportedLanguage.Paite);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<StudyData | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Guest ID logic
  const [guestId] = useState(() => {
    const stored = localStorage.getItem("zotongue_guest_id");
    if (stored) return stored;
    const newId = "guest_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("zotongue_guest_id", newId);
    return newId;
  });

  // Initialize Session
  useEffect(() => {
    const initSession = async () => {
      if (authLoading) return;
      if (sessionId) return;

      const effectiveUserId = user?.uid || guestId;
      if (effectiveUserId) {
        try {
          const id = await createNewSession(
            effectiveUserId,
            targetLang,
            user?.email || null,
            !user,
            SessionType.STUDY,
            "Study Session"
          );
          setSessionId(id);
        } catch (e) {
          console.error("Failed to create study session", e);
        }
      }
    };
    initSession();
  }, [user, guestId, authLoading, sessionId]);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setResult(null);
    setUsage(null);

    try {
        const response = await generateStudyMaterial(input, targetLang);
        setResult(response.data);
        setUsage(response.usage);

        // Save to DB
        if (sessionId) {
          const timestamp = Date.now();
          // User Input
          await addMessageToSession(sessionId, {
            id: timestamp.toString(),
            role: 'user',
            text: `[Generate Study Material in ${targetLang}] ${input}`,
            timestamp: timestamp,
          });

          // Format Output as Markdown for storage
          const formattedOutput = `**Summary:**\n${response.data.summary}\n\n**Questions:**\n${response.data.questions.map((q, i) => `${i+1}. ${q.question}\n   *Answer: ${q.answer}*`).join('\n')}`;

          await addMessageToSession(sessionId, {
            id: (timestamp + 1).toString(),
            role: 'model',
            text: formattedOutput,
            timestamp: timestamp + 1,
            usage: response.usage
          });
        }
    } catch (e) {
        setError("Failed to generate study materials. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-canvas w-full">
      {/* Header */}
      <header className="bg-surface border-b border-slate-100 px-5 py-4 flex items-center sticky top-0 z-20 shrink-0">
        <button 
          onClick={onBack}
          className="p-2.5 -ml-2 mr-3 rounded-xl text-ink-muted hover:text-ink hover:bg-slate-50 transition-all duration-300"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="font-display text-lg font-bold text-ink">Study Companion</h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted mt-0.5">
            AI-Powered Learning
          </p>
      </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 pb-28 space-y-5 custom-scrollbar">
        
        {/* Input Section */}
        <div className="bg-surface p-5 rounded-3xl shadow-card border border-slate-100 space-y-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted mb-1">
                Paste Paragraph / Text
              </label>
              <p className="text-ink-muted text-xs">
                Enter any text to generate summaries and questions
              </p>
            </div>
            <div className="w-44 shrink-0">
                    <LanguageSelector selected={targetLang} onChange={setTargetLang} label="Output Language" />
                </div>
            </div>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
            placeholder="Paste any text here to generate a summary and study questions..."
            className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 focus:border-accent focus:ring-2 focus:ring-accent/20 min-h-[140px] text-[15px] leading-relaxed resize-none transition-all duration-300 text-ink placeholder-ink-muted/50 focus:outline-none"
            />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 flex flex-col items-center justify-center text-accent space-y-4">
            <div className="w-10 h-10 border-2 border-accent/20 border-t-accent rounded-full animate-spin"></div>
            <p className="font-mono text-sm animate-pulse tracking-wide">Analyzing text & generating questions...</p>
             </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-5 rounded-2xl text-sm text-center flex items-center justify-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
                 {error}
             </div>
        )}

        {/* Results Section */}
        {result && (
          <div className="space-y-6 animate-enter">
                {/* Summary Card */}
            <div className="bg-success-light rounded-3xl shadow-card border border-success/10 overflow-hidden">
              <div className="px-5 py-4 bg-success/5 border-b border-success/10 flex items-center gap-3">
                <div className="w-8 h-8 bg-success/10 rounded-xl flex items-center justify-center text-success">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                </div>
                <h3 className="font-display font-bold text-success text-sm">Summary & Explanation</h3>
                    </div>
              <div className="p-5">
                <MarkdownRenderer content={result.summary} className="text-ink prose-emerald" />
                    </div>
                </div>

                {/* Q&A Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-ink-muted">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                </div>
                <h3 className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">Study Questions</h3>
                    </div>
                    
                    {result.questions.map((qa, idx) => (
                <div 
                  key={idx} 
                  className="bg-surface rounded-2xl border border-slate-100 shadow-card overflow-hidden animate-enter"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="p-5 bg-surface border-b border-slate-50">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 bg-accent-light text-accent rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <p className="font-semibold text-ink text-[15px] leading-relaxed pt-0.5">{qa.question}</p>
                    </div>
                  </div>
                  <div className="p-5 bg-slate-50/50">
                    <div className="flex items-start gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-ink-muted pt-1 shrink-0">Answer:</span>
                      <div className="text-ink-muted text-sm leading-relaxed">
                        <MarkdownRenderer content={qa.answer} />
                      </div>
                             </div>
                             </div>
                        </div>
                    ))}
                </div>

            {/* Usage Stats */}
                {usage && (
              <div className="pt-4 border-t border-slate-100 font-mono text-[10px] text-ink-muted flex items-center gap-4">
                <span>{usage.candidatesTokenCount || 0} output</span>
                    {usage.thoughtsTokenCount && usage.thoughtsTokenCount > 0 && (
                  <span className="text-accent">• {usage.thoughtsTokenCount} thoughts</span>
                    )}
                    {usage.totalTokenCount && (
                      <span>• {usage.totalTokenCount} total</span>
                    )}
                  </div>
                )}
            </div>
        )}
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-canvas via-canvas to-transparent pt-10">
        <button
            onClick={handleGenerate}
            disabled={isLoading || !input.trim()}
          className="flex items-center justify-center w-full py-4 bg-success text-white rounded-2xl shadow-lg hover:bg-emerald-700 disabled:opacity-40 disabled:bg-slate-300 transition-all duration-300 disabled:cursor-not-allowed font-semibold text-[15px]"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            'Generate Study Aid'
          )}
        </button>
      </div>
    </div>
  );
};

export default StudyInterface;
