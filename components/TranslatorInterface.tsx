import React, { useState } from 'react';
import { SupportedLanguage } from '../types';
import { translateText } from '../services/geminiService';
import { LanguageSelector } from './LanguageSelector';

interface TranslatorInterfaceProps {
  onBack: () => void;
}

const TranslatorInterface: React.FC<TranslatorInterfaceProps> = ({ onBack }) => {
  const [sourceLang, setSourceLang] = useState<SupportedLanguage>(SupportedLanguage.Paite);
  const [targetLang, setTargetLang] = useState<SupportedLanguage>(SupportedLanguage.English);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [usage, setUsage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInput(output);
    setOutput(input);
    setError(null);
  };

  const handleTranslate = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setOutput('');
    setUsage(null);

    try {
        const result = await translateText(input, sourceLang, targetLang);
        
        if (result.text.startsWith("Error:")) {
            setError(result.text);
        } else {
            setOutput(result.text);
            setUsage(result.usage);
        }
    } catch (e) {
        setError("Translation failed. Please try again.");
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
        <h2 className="text-lg font-bold text-slate-900">Deep Translator</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Language Controls */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between gap-2">
             <div className="flex-1">
                 <LanguageSelector selected={sourceLang} onChange={setSourceLang} label="From" />
             </div>
             <button 
                onClick={handleSwap}
                className="mt-5 p-2 rounded-full bg-slate-50 text-brand-600 hover:bg-brand-50 border border-slate-200 transition-all"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
             </button>
             <div className="flex-1">
                <LanguageSelector selected={targetLang} onChange={setTargetLang} label="To" exclude={sourceLang} />
             </div>
          </div>
        </div>

        {/* Input Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col min-h-[160px]">
            <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{sourceLang}</span>
                {input.length > 0 && (
                    <button onClick={() => setInput('')} className="text-slate-400 hover:text-slate-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter text..."
                className="flex-1 w-full p-4 text-lg resize-none border-none focus:ring-0 placeholder-slate-300 bg-white text-slate-900"
                spellCheck={false}
            />
        </div>

        {/* Output Card */}
        <div className="bg-brand-50 rounded-2xl shadow-sm border border-brand-100 overflow-hidden flex flex-col min-h-[160px]">
             <div className="px-4 py-2 bg-brand-100/50 border-b border-brand-100 flex justify-between items-center">
                <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">{targetLang}</span>
                {output && !isLoading && (
                    <button 
                        onClick={() => navigator.clipboard.writeText(output)}
                        className="text-brand-600 hover:text-brand-800"
                        title="Copy"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                )}
            </div>
            <div className="flex-1 p-4 relative">
                {isLoading ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
                    </div>
                ) : error ? (
                    <div className="flex items-start space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                         <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">{error}</span>
                    </div>
                ) : (
                    <>
                        <p className={`text-lg leading-relaxed ${output ? 'text-brand-900' : 'text-brand-300 italic'}`}>
                            {output || 'Translation...'}
                        </p>
                        {usage && output && (
                            <div className="mt-3 pt-3 border-t border-brand-100 text-xs text-brand-600 flex items-center gap-3">
                                <span>Tokens: {usage.candidatesTokenCount || 0} output</span>
                                {usage.thoughtsTokenCount && usage.thoughtsTokenCount > 0 && (
                                    <span>• {usage.thoughtsTokenCount} thoughts</span>
                                )}
                                {usage.totalTokenCount && (
                                    <span>• {usage.totalTokenCount} total</span>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0 md:bg-transparent md:border-none">
        <button
            onClick={handleTranslate}
            disabled={isLoading || !input.trim()}
            className="flex items-center justify-center w-full py-4 bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-200 hover:bg-brand-700 disabled:opacity-50 disabled:bg-slate-400 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
            <span className="font-bold">Translate Text</span>
        </button>
      </div>
    </div>
  );
};

export default TranslatorInterface;