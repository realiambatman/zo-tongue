import React, { useState, useRef, useEffect } from "react";
import { SupportedLanguage, SessionType } from "../types";
import { solveMultimodal } from "../services/geminiService";
import { LanguageSelector } from "./LanguageSelector";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useAuth } from "../contexts/AuthContext";
import { createNewSession, addMessageToSession } from "../services/dbService";

import { useNavigate } from "react-router-dom";

// ... other imports

export const SolverInterface: React.FC = () => {
  const navigate = useNavigate();
  const onBack = () => navigate("/");

  const { user } = useAuth();
  const [targetLang, setTargetLang] = useState<SupportedLanguage>(
    SupportedLanguage.Paite
  );
  const [input, setInput] = useState("");
  const [image, setImage] = useState<{ data: string; mime: string } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [usage, setUsage] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const isCreatingSessionRef = useRef(false); // Prevent double creation
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Guest ID logic
  const [guestId] = useState(() => {
    const stored = localStorage.getItem("zotongue_guest_id");
    if (stored) return stored;
    const newId = "guest_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("zotongue_guest_id", newId);
    return newId;
  });

  // Helper to create session lazily (only when first problem is solved)
  const ensureSessionExists = async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (isCreatingSessionRef.current) return null;

    const effectiveUserId = user?.uid || guestId;
    if (!effectiveUserId) return null;

    isCreatingSessionRef.current = true;
    try {
      const id = await createNewSession(
        effectiveUserId,
        targetLang,
        user?.email || null,
        !user,
        SessionType.SOLVER,
        "Solver Session"
      );
      setSessionId(id);
      return id;
    } catch (e) {
      console.error("Failed to create solver session", e);
      isCreatingSessionRef.current = false;
      return null;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(",")[1];
      setImage({
        data: base64Data,
        mime: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSolve = async () => {
    if (!input.trim() && !image) return;

    setIsLoading(true);
    setResult("");
    setUsage(null);

    try {
      // Allow image-only submissions - use default prompt if image exists but no text
      const questionText = input.trim() || (image ? "Solve this problem" : "");
      const response = await solveMultimodal(
        image?.data || null,
        image?.mime || null,
        questionText,
        targetLang
      );
      setResult(response.text);
      setUsage(response.usage);

      // Try to save to session, but don't fail if it doesn't work (e.g., Firebase Storage not configured)
      try {
        const currentSessionId = await ensureSessionExists();
        if (currentSessionId) {
          const timestamp = Date.now();
          await addMessageToSession(currentSessionId, {
            id: timestamp.toString(),
            role: "user",
            text: `[Solve in ${targetLang}] ${input || "(Image Uploaded)"}`,
            timestamp: timestamp,
          });
          await addMessageToSession(currentSessionId, {
            id: (timestamp + 1).toString(),
            role: "model",
            text: response.text,
            timestamp: timestamp + 1,
            usage: response.usage,
            ...(response.thoughts?.trim() && {
              thoughts: response.thoughts.trim(),
            }),
          });
        }
      } catch (saveError) {
        // Log but don't fail - solving worked, saving is optional
        console.warn(
          "Failed to save to session (this is okay if Firebase Storage is not configured):",
          saveError
        );
      }
    } catch (e) {
      setResult("Sorry, something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setTimeout(() => {
      if (!textareaRef.current?.matches(":focus")) {
        setIsEditing(false);
      }
    }, 200);
  };

  const handleInputFocus = () => {
    setIsEditing(true);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleRenderedClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(input.length, input.length);
      }
    }, 0);
  };

  // Normalize LaTeX syntax
  const normalizeMathSyntax = (text: string): string => {
    let normalized = text.replace(/\\\(/g, "$").replace(/\\\)/g, "$");
    normalized = normalized.replace(/\\\[/g, "$$").replace(/\\\]/g, "$$");
    return normalized;
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
        <div className="flex-1">
          <h2 className="font-display text-lg font-bold text-ink">
            Smart Solver
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted mt-0.5">
            Visual Problem Solving
          </p>
        </div>
        <div className="w-44">
          <LanguageSelector
            selected={targetLang}
            onChange={setTargetLang}
            label="Answer Language"
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar min-h-0">
        {/* Image Input Area */}
        <div className="space-y-3">
          <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
            Problem Image (Optional)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`
              relative w-full h-52 rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden flex flex-col items-center justify-center
                    ${
                      image
                        ? "border-accent bg-ink"
                        : "border-slate-200 bg-surface hover:bg-slate-50 hover:border-accent/50"
                    }
                `}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              capture="environment"
            />

            {image ? (
              <>
                <img
                  src={`data:${image.mime};base64,${image.data}`}
                  alt="Preview"
                  className="h-full w-full object-contain opacity-90"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors duration-300">
                  <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center p-6">
                <div className="w-14 h-14 bg-accent-light text-accent rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-7 h-7"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
                <p className="text-ink font-medium text-sm mb-1">
                  Tap to take photo or upload
                </p>
                <p className="text-ink-muted text-xs">
                  Supports Math, MCQ, Diagrams
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Text Input */}
        <div className="space-y-3">
          <label className="block font-mono text-[10px] uppercase tracking-[0.15em] text-ink-muted">
            Question / Context
          </label>
          <div className="relative w-full min-h-[120px] bg-surface rounded-2xl border border-slate-200 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20 transition-all duration-300 shadow-card">
            {/* Rendered markdown view */}
            {input.trim() && (
              <div
                ref={inputRef}
                onClick={handleRenderedClick}
                className={`p-5 text-[15px] text-ink leading-relaxed min-h-[120px] ${
                  isEditing ? "hidden" : "block cursor-text"
                }`}
              >
                <MarkdownRenderer
                  content={normalizeMathSyntax(input)}
                  className="text-ink prose-sm max-w-none"
                />
              </div>
            )}
            {/* Textarea for editing */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Type your question here... Use $ for inline math (e.g., $x^2$) or $$ for block equations"
              className={`w-full p-5 bg-surface text-[15px] text-ink placeholder-ink-muted/50 leading-relaxed resize-none outline-none min-h-[120px] rounded-2xl ${
                isEditing || !input.trim() ? "block" : "hidden"
              }`}
            />
          </div>
        </div>

        {/* Result Area */}
        {result && (
          <div className="bg-accent-light rounded-3xl shadow-card border border-accent/10 overflow-hidden animate-enter">
            <div className="px-5 py-4 bg-accent/5 border-b border-accent/10 flex items-center gap-3">
              <div className="w-8 h-8 bg-accent/10 rounded-xl flex items-center justify-center text-accent">
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
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="font-display font-bold text-accent text-sm">
                Solution
              </h3>
            </div>
            <div className="p-5 bg-surface">
              <MarkdownRenderer
                content={result}
                className="text-ink prose-indigo"
              />
            </div>
            {usage && (
              <div className="px-5 py-4 border-t border-accent/10 bg-accent/5 font-mono text-[10px] text-accent/70 flex items-center gap-4">
                <span>{usage.candidatesTokenCount || 0} output</span>
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

      {/* Solve Button - Fixed at bottom like ChatInterface */}
      <div className="p-5 bg-canvas border-t border-slate-100 shrink-0">
        <button
          onClick={handleSolve}
          disabled={isLoading || (!input.trim() && !image)}
          className="flex items-center justify-center w-full py-4 bg-accent text-white rounded-2xl shadow-lg shadow-accent/20 hover:bg-accent-hover disabled:opacity-40 disabled:bg-slate-300 transition-all duration-300 disabled:cursor-not-allowed font-semibold text-[15px]"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            "Solve Problem"
          )}
        </button>
      </div>
    </div>
  );
};

export default SolverInterface;
