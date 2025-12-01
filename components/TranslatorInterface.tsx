import React, { useState, useEffect, useRef } from "react";
import { SupportedLanguage, SessionType, ChatMessage } from "../types";
import { translateText } from "../services/geminiService";
import { LanguageSelector } from "./LanguageSelector";
import { useAuth } from "../contexts/AuthContext";
import { createNewSession, addMessageToSession } from "../services/dbService";

interface TranslatorInterfaceProps {
  onBack: () => void;
}

const TranslatorInterface: React.FC<TranslatorInterfaceProps> = ({
  onBack,
}) => {
  const { user, loading: authLoading } = useAuth();
  const [sourceLang, setSourceLang] = useState<SupportedLanguage>(
    SupportedLanguage.Paite
  );
  const [targetLang, setTargetLang] = useState<SupportedLanguage>(
    SupportedLanguage.English
  );
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [usage, setUsage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
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
            sourceLang, // Initial language
            user?.email || null,
            !user, // Anonymous if no user
            SessionType.TRANSLATE,
            "Translation Session"
          );
          setSessionId(id);
        } catch (e) {
          console.error("Failed to create translation session", e);
        }
      }
    };
    initSession();
  }, [user, guestId, authLoading, sessionId]);

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
    setOutput("");
    setUsage(null);

    try {
      const result = await translateText(input, sourceLang, targetLang);

      if (result.text.startsWith("Error:")) {
        setError(result.text);
      } else {
        setOutput(result.text);
        setUsage(result.usage);

        // Save to DB
        if (sessionId) {
          const timestamp = Date.now();
          // User message (Input)
          await addMessageToSession(sessionId, {
            id: timestamp.toString(),
            role: "user",
            text: `[${sourceLang} -> ${targetLang}] ${input}`,
            timestamp: timestamp,
          });

          // Model message (Output)
          await addMessageToSession(sessionId, {
            id: (timestamp + 1).toString(),
            role: "model",
            text: result.text,
            timestamp: timestamp + 1,
            usage: result.usage,
          });
        }
      }
    } catch (e) {
      setError("Translation failed. Please try again.");
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <div>
          <h2 className="font-display text-lg font-bold text-ink">
            Deep Translator
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted mt-0.5">
            Bidirectional Translation
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 pb-28 space-y-5 custom-scrollbar">
        {/* Language Controls Card */}
        <div className="bg-surface p-5 rounded-3xl shadow-card border border-slate-100">
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
              <LanguageSelector
                selected={sourceLang}
                onChange={setSourceLang}
                label="From"
              />
            </div>
            <button
              onClick={handleSwap}
              className="mb-1 p-3 rounded-xl bg-slate-50 text-accent hover:bg-accent-light border border-slate-200 hover:border-accent/30 transition-all duration-300 hover:scale-105"
            >
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
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            </button>
            <div className="flex-1">
              <LanguageSelector
                selected={targetLang}
                onChange={setTargetLang}
                label="To"
                exclude={sourceLang}
              />
            </div>
          </div>
        </div>

        {/* Input Card */}
        <div className="bg-surface rounded-3xl shadow-card border border-slate-100 overflow-hidden flex flex-col min-h-[180px]">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
              {sourceLang}
            </span>
            {input.length > 0 && (
              <button
                onClick={() => setInput("")}
                className="text-ink-muted hover:text-ink p-1 rounded-lg hover:bg-slate-100 transition-colors duration-200"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter text to translate..."
            className="flex-1 w-full p-5 text-[15px] leading-relaxed resize-none border-none focus:ring-0 focus:outline-none placeholder-ink-muted/50 bg-surface text-ink"
            spellCheck={false}
          />
        </div>

        {/* Output Card */}
        <div className="bg-accent-light rounded-3xl shadow-card border border-accent/10 overflow-hidden flex flex-col min-h-[180px]">
          <div className="px-5 py-3 bg-accent/5 border-b border-accent/10 flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-accent">
              {targetLang}
            </span>
            {output && !isLoading && (
              <button
                onClick={() => navigator.clipboard.writeText(output)}
                className="text-accent hover:text-accent-hover p-1 rounded-lg hover:bg-accent/10 transition-colors duration-200"
                title="Copy"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              </button>
            )}
          </div>
          <div className="flex-1 p-5 relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-accent/20 border-t-accent rounded-full animate-spin"></div>
              </div>
            ) : error ? (
              <div className="flex items-start gap-3 text-red-600 bg-red-50 p-4 rounded-2xl border border-red-100">
                <svg
                  className="w-5 h-5 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            ) : (
              <>
                <p
                  className={`text-[15px] leading-relaxed ${
                    output ? "text-ink" : "text-accent/40 italic"
                  }`}
                >
                  {output || "Translation will appear here..."}
                </p>
                {usage && output && (
                  <div className="mt-4 pt-4 border-t border-accent/10 font-mono text-[10px] text-accent/70 flex items-center gap-4">
                    <span>{usage.candidatesTokenCount || 0} output</span>
                    {usage.thoughtsTokenCount &&
                      usage.thoughtsTokenCount > 0 && (
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
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-canvas via-canvas to-transparent pt-10">
        <button
          onClick={handleTranslate}
          disabled={isLoading || !input.trim()}
          className="flex items-center justify-center w-full py-4 bg-ink text-white rounded-2xl shadow-lg hover:bg-slate-800 disabled:opacity-40 disabled:bg-slate-300 transition-all duration-300 disabled:cursor-not-allowed font-semibold text-[15px]"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            "Translate Text"
          )}
        </button>
      </div>
    </div>
  );
};

export default TranslatorInterface;
