import React, { useState, useRef } from "react";
import { SupportedLanguage } from "../types";
import { solveMultimodal } from "../services/geminiService";
import { LanguageSelector } from "./LanguageSelector";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface SolverInterfaceProps {
  onBack: () => void;
}

const SolverInterface: React.FC<SolverInterfaceProps> = ({ onBack }) => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
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
      const response = await solveMultimodal(
        image?.data || null,
        image?.mime || null,
        input,
        targetLang
      );
      setResult(response.text);
      setUsage(response.usage);
    } catch (e) {
      setResult("Sorry, something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    // Delay to allow click events to register
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
      // Move cursor to end
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(input.length, input.length);
      }
    }, 0);
  };

  // Normalize LaTeX syntax: convert \( to $ and \[ to $$
  const normalizeMathSyntax = (text: string): string => {
    // Replace \( with $ and \) with $
    let normalized = text.replace(/\\\(/g, "$").replace(/\\\)/g, "$");
    // Replace \[ with $$ and \] with $$
    normalized = normalized.replace(/\\\[/g, "$$").replace(/\\\]/g, "$$");
    return normalized;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center sticky top-0 z-20 shadow-[0_2px_10px_rgba(0,0,0,0.03)] shrink-0">
        <button
          onClick={onBack}
          className="p-2 -ml-2 mr-2 rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors"
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
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h2 className="text-lg font-bold text-slate-800">Smart Solver</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-5">
        {/* Controls */}
        <div className="flex justify-end">
          <div className="w-48">
            <LanguageSelector
              selected={targetLang}
              onChange={setTargetLang}
              label="Answer Language"
            />
          </div>
        </div>

        {/* Image Input Area */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Problem Image (Optional)
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`
                    relative w-full h-48 rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden flex flex-col items-center justify-center
                    ${
                      image
                        ? "border-violet-400 bg-slate-900"
                        : "border-slate-300 bg-white hover:bg-slate-50 hover:border-violet-300"
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
                  className="h-full w-full object-contain opacity-80"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/40 transition-colors">
                  <div className="bg-white/20 backdrop-blur-md p-2 rounded-full">
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
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-violet-50 text-violet-500 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6"
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
                </div>
                <p className="text-slate-600 font-medium text-sm">
                  Tap to take photo or upload
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  Supports Math, MCQ, Diagrams
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Text Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Question / Context
          </label>
          <div className="relative w-full min-h-[100px] bg-white rounded-xl border border-slate-200 focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500 transition-all shadow-sm">
            {/* Always show rendered markdown when there's content */}
            {input.trim() && (
              <div
                ref={inputRef}
                onClick={handleRenderedClick}
                className={`p-4 text-sm text-slate-800 leading-relaxed min-h-[100px] ${
                  isEditing ? "hidden" : "block cursor-text"
                }`}
              >
                <MarkdownRenderer
                  content={normalizeMathSyntax(input)}
                  className="text-slate-800 prose-sm max-w-none"
                />
              </div>
            )}
            {/* Textarea for editing - always present but hidden when showing rendered */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder="Type your question here... Use $ for inline math (e.g., $x^2$) or $$ for block equations (e.g., $$E=mc^2$$)"
              className={`w-full p-4 bg-white text-sm text-slate-800 placeholder-slate-400 leading-relaxed resize-none outline-none min-h-[100px] ${
                isEditing || !input.trim() ? "block" : "hidden"
              }`}
            />
          </div>
        </div>

        {/* Result Area */}
        {result && (
          <div className="bg-violet-50 border border-violet-100 rounded-2xl p-5 animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 mb-3 text-violet-800 border-b border-violet-200/50 pb-2">
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
              <h3 className="font-bold text-sm uppercase tracking-wide">
                Solution
              </h3>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <MarkdownRenderer
                content={result}
                className="text-slate-800 prose-violet"
              />
            </div>
            {usage && (
              <div className="mt-3 pt-3 border-t border-violet-200/50 text-xs text-violet-600 flex items-center gap-3">
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
      <div className="p-4 bg-white border-t border-slate-200 shrink-0 md:bg-transparent md:border-none z-30">
        <button
          onClick={handleSolve}
          disabled={isLoading || (!input.trim() && !image)}
          className="flex items-center justify-center w-full py-4 bg-violet-600 text-white rounded-xl shadow-lg shadow-violet-200 hover:bg-violet-700 disabled:opacity-50 disabled:bg-slate-400 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <span className="font-bold">Solve Problem</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default SolverInterface;
