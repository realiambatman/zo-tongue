import React, { useState } from 'react';
import { SupportedLanguage, StudyData } from '../types';
import { generateStudyMaterial } from '../services/geminiService';
import { LanguageSelector } from './LanguageSelector';
import { MarkdownRenderer } from './MarkdownRenderer';

interface StudyInterfaceProps {
  onBack: () => void;
}

const StudyInterface: React.FC<StudyInterfaceProps> = ({ onBack }) => {
  const [targetLang, setTargetLang] = useState<SupportedLanguage>(SupportedLanguage.Paite);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<StudyData | null>(null);
  const [usage, setUsage] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (e) {
        setError("Failed to generate study materials. Please try again.");
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center sticky top-0 z-20 shadow-[0_2px_10px_rgba(0,0,0,0.03)] shrink-0">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 mr-2 rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-slate-800">Study Companion</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-5">
        
        {/* Input Section */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
            <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paste Paragraph / Text</label>
                <div className="w-40">
                    <LanguageSelector selected={targetLang} onChange={setTargetLang} label="Output Language" />
                </div>
            </div>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste any text here to generate a summary and questions..."
                className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 min-h-[120px] text-sm leading-relaxed resize-none transition-all text-slate-800 placeholder-slate-400"
            />
        </div>

        {/* Results Section */}
        {isLoading && (
             <div className="py-12 flex flex-col items-center justify-center text-emerald-600 space-y-3">
                 <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500"></div>
                 <p className="text-sm font-medium animate-pulse">Analyzing text & generating questions...</p>
             </div>
        )}

        {error && (
             <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm text-center">
                 {error}
             </div>
        )}

        {result && (
            <div className="space-y-5 animate-in slide-in-from-bottom-4 duration-500">
                {/* Summary Card */}
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-4 py-3 bg-emerald-100/50 border-b border-emerald-100 flex items-center gap-2">
                        <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                        </svg>
                        <h3 className="font-bold text-emerald-900 text-sm">Summary & Explanation</h3>
                    </div>
                    <div className="p-5 text-emerald-900 leading-relaxed text-[15px]">
                         <MarkdownRenderer content={result.summary} className="text-emerald-900 prose-emerald" />
                    </div>
                </div>

                {/* Q&A Section */}
                <div className="space-y-3">
                    <div className="px-1 flex items-center gap-2 text-slate-400">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-xs font-bold uppercase tracking-wider">Study Questions</h3>
                    </div>
                    
                    {result.questions.map((qa, idx) => (
                        <div key={idx} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
                             <div className="p-4 bg-white border-b border-slate-50">
                                 <p className="font-semibold text-slate-800 text-[15px]">Q: {qa.question}</p>
                             </div>
                             <div className="p-4 bg-slate-50/50 text-slate-600 text-sm leading-relaxed">
                                 <span className="font-bold text-slate-400 text-xs uppercase mr-1">Answer:</span>
                                 <MarkdownRenderer content={qa.answer} className="inline-block align-top" />
                             </div>
                        </div>
                    ))}
                </div>
                {usage && (
                  <div className="mt-5 pt-4 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-3">
                    <span>Tokens: {usage.candidatesTokenCount || 0} output</span>
                    {usage.thoughtsTokenCount && usage.thoughtsTokenCount > 0 && (
                      <span>• {usage.thoughtsTokenCount} thoughts</span>
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
      <div className="p-4 bg-white border-t border-slate-200 shrink-0 md:bg-transparent md:border-none">
        <button
            onClick={handleGenerate}
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center w-full py-4 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-50 disabled:bg-slate-400 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
            <span className="font-bold">Generate Study Aid</span>
        </button>
      </div>
    </div>
  );
};

export default StudyInterface;