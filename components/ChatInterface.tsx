import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, SupportedLanguage } from '../types';
import { createChatSession } from '../services/geminiService';
import { LanguageSelector } from './LanguageSelector';
import { INITIAL_CHAT_MESSAGE } from '../constants';
import { Chat, GenerateContentResponse } from "@google/genai";
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatInterfaceProps {
  onBack: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onBack }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(SupportedLanguage.Paite);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initChat = useCallback(() => {
    chatSessionRef.current = createChatSession(selectedLanguage);
    setMessages([{
      id: 'init',
      role: 'model',
      text: INITIAL_CHAT_MESSAGE(selectedLanguage),
      timestamp: Date.now()
    }]);
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
    setInputValue('');
    
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result: GenerateContentResponse = await chatSessionRef.current.sendMessage({
          message: userText
      });
      const responseText = result.text || "I couldn't generate a response.";

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
        isError: responseText.includes("That is not the selected language"),
        usage: result.usageMetadata ? {
          thoughtsTokenCount: result.usageMetadata.thoughtsTokenCount,
          candidatesTokenCount: result.usageMetadata.candidatesTokenCount,
          promptTokenCount: result.usageMetadata.promptTokenCount,
          totalTokenCount: result.usageMetadata.totalTokenCount,
        } : undefined,
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat error", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Sorry, I encountered an error connecting to the server.",
        timestamp: Date.now(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 w-full">
      {/* App-like Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 flex items-center sticky top-0 z-20 shadow-[0_2px_10px_rgba(0,0,0,0.03)] shrink-0">
        <button 
          onClick={onBack}
          className="p-2 -ml-2 mr-2 rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-900 leading-tight">Native Chat</h2>
          <p className="text-xs text-slate-500 font-medium">Speaking: {selectedLanguage}</p>
        </div>
        <div className="w-36">
            <LanguageSelector 
                selected={selectedLanguage} 
                onChange={setSelectedLanguage}
            />
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50 scroll-smooth">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className="flex flex-col">
              <div
                className={`
                  max-w-[85%] px-5 py-3.5 rounded-2xl shadow-sm text-[15px] leading-relaxed
                  ${msg.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-br-sm prose-invert' 
                    : msg.isError 
                      ? 'bg-red-50 text-red-800 border border-red-100 rounded-bl-sm'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
                  }
                `}
              >
                 <MarkdownRenderer 
                    content={msg.text} 
                    className={msg.role === 'user' ? 'text-white prose-invert' : 'text-slate-800'}
                 />
              </div>
              {msg.usage && msg.role === 'model' && !msg.isError && (
                <div className="mt-1 ml-1 text-xs text-slate-400 flex items-center gap-2">
                  <span>Tokens: {msg.usage.candidatesTokenCount || 0} output</span>
                  {msg.usage.thoughtsTokenCount && msg.usage.thoughtsTokenCount > 0 && (
                    <span>• {msg.usage.thoughtsTokenCount} thoughts</span>
                  )}
                  {msg.usage.totalTokenCount && (
                    <span>• {msg.usage.totalTokenCount} total</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start w-full">
             <div className="bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <form onSubmit={handleSendMessage} className="relative flex items-center shadow-sm rounded-2xl bg-slate-50 border border-slate-200 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-brand-500 transition-all">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={`Message in ${selectedLanguage}...`}
            className="w-full pl-4 pr-12 py-3.5 bg-transparent border-none focus:ring-0 text-slate-800 placeholder-slate-400"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !inputValue.trim()}
            className="absolute right-2 p-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:bg-slate-300 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatInterface;