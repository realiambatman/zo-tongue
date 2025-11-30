import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage, SupportedLanguage } from "../types";
import { createChatSession } from "../services/geminiService";
import { LanguageSelector } from "./LanguageSelector";
import { INITIAL_CHAT_MESSAGE } from "../constants";
import { Chat, GenerateContentResponse } from "@google/genai";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ChatInterfaceProps {
  onBack: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBack }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    SupportedLanguage.Paite
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initChat = useCallback(() => {
    chatSessionRef.current = createChatSession(selectedLanguage);
    setMessages([
      {
        id: "init",
        role: "model",
        text: INITIAL_CHAT_MESSAGE(selectedLanguage),
        timestamp: Date.now(),
      },
    ]);
  }, [selectedLanguage]);

  useEffect(() => {
    initChat();
  }, [initChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading || !chatSessionRef.current) return;

    const userText = inputValue.trim();
    setInputValue("");

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result: GenerateContentResponse =
        await chatSessionRef.current.sendMessage({
          message: userText,
        });
      const responseText = result.text || "I couldn't generate a response.";

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: responseText,
        timestamp: Date.now(),
        isError: responseText.includes("That is not the selected language"),
        usage: result.usageMetadata
          ? {
              thoughtsTokenCount: result.usageMetadata.thoughtsTokenCount,
              candidatesTokenCount: result.usageMetadata.candidatesTokenCount,
              promptTokenCount: result.usageMetadata.promptTokenCount,
              totalTokenCount: result.usageMetadata.totalTokenCount,
            }
          : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat error", error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: "model",
          text: "Sorry, I encountered an error connecting to the server.",
          timestamp: Date.now(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-canvas w-full">
      {/* Header - Clean & Minimal */}
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
          <h2 className="font-display text-lg font-bold text-ink leading-tight">
            Native Chat
          </h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted mt-0.5">
            Speaking: {selectedLanguage}
          </p>
        </div>
        <div className="w-36">
          <LanguageSelector
            selected={selectedLanguage}
            onChange={setSelectedLanguage}
          />
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            className={`flex w-full animate-enter ${
              msg.role === "user" ? "justify-end" : "justify-start"
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex flex-col max-w-[85%]">
              <div
                className={`
                  px-5 py-4 text-[15px] leading-relaxed shadow-card
                  ${
                    msg.role === "user"
                      ? "bg-ink text-white rounded-3xl rounded-br-lg user-message-text"
                      : msg.isError
                      ? "bg-red-50 text-red-800 border border-red-100 rounded-3xl rounded-bl-lg"
                      : "bg-surface text-ink border border-slate-100 rounded-3xl rounded-bl-lg"
                  }
                `}
              >
                {msg.role === "user" ? (
                  msg.text
                ) : (
                  <MarkdownRenderer
                    content={msg.text}
                    className={msg.isError ? "text-red-800 prose-red" : ""}
                  />
                )}
              </div>
              {msg.usage && msg.role === "model" && !msg.isError && (
                <div className="mt-2 ml-2 font-mono text-[10px] text-ink-muted flex items-center gap-3">
                  <span>{msg.usage.candidatesTokenCount || 0} output</span>
                  {msg.usage.thoughtsTokenCount &&
                    msg.usage.thoughtsTokenCount > 0 && (
                      <span className="text-accent">• {msg.usage.thoughtsTokenCount} thoughts</span>
                    )}
                  {msg.usage.totalTokenCount && (
                    <span>• {msg.usage.totalTokenCount} total</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-start w-full">
            <div className="bg-surface border border-slate-100 px-5 py-4 rounded-3xl rounded-bl-lg shadow-card flex items-center gap-2">
              <div className="flex gap-1.5">
                <div
                  className="w-2 h-2 bg-accent rounded-full animate-bounce"
                  style={{ animationDelay: "0ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-accent rounded-full animate-bounce"
                  style={{ animationDelay: "150ms" }}
                ></div>
                <div
                  className="w-2 h-2 bg-accent rounded-full animate-bounce"
                  style={{ animationDelay: "300ms" }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Refined */}
      <div className="p-5 bg-surface border-t border-slate-100 shrink-0">
        <form
          onSubmit={handleSendMessage}
          className="relative flex items-center bg-slate-50 rounded-2xl border border-slate-200 focus-within:ring-2 focus-within:ring-accent/20 focus-within:border-accent transition-all duration-300"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Message in ${selectedLanguage}...`}
            className="w-full pl-5 pr-14 py-4 bg-transparent border-none focus:ring-0 focus:outline-none text-ink placeholder-ink-muted text-[15px]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 p-3 bg-ink text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 disabled:bg-slate-300 transition-all duration-300 disabled:cursor-not-allowed"
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
                d="M5 12h14M12 5l7 7-7 7"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;
