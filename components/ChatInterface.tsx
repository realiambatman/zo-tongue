import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage, SupportedLanguage } from "../types";
import { createChatSession } from "../services/geminiService";
import { LanguageSelector } from "./LanguageSelector";
import { INITIAL_CHAT_MESSAGE } from "../constants";
import { Chat, Content } from "@google/genai";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useAuth } from "../contexts/AuthContext";
import {
  createNewSession,
  saveChatSession,
  ChatSession,
  getSessionById,
  subscribeToSession,
  fetchUserIP,
} from "../services/dbService";

interface ChatInterfaceProps {
  onBack: () => void;
  initialSessionId?: string | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onBack,
  initialSessionId,
}) => {
  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    SupportedLanguage.Paite
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(
    initialSessionId || null
  );
  const [isSessionLoading, setIsSessionLoading] = useState(!!initialSessionId);
  const [isAiPaused, setIsAiPaused] = useState(false);
  const [showSignInNudge, setShowSignInNudge] = useState(true);
  const [sarcasmMode, setSarcasmMode] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const isCreatingSessionRef = useRef(false); // Prevent double creation
  // Fallback ID for guests if Auth fails
  const [guestId] = useState(() => {
    const stored = localStorage.getItem("zotongue_guest_id");
    if (stored) return stored;
    const newId = "guest_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("zotongue_guest_id", newId);
    return newId;
  });

  // Initialize session: Load existing or create new
  useEffect(() => {
    const initSession = async () => {
      if (initialSessionId) {
        setIsSessionLoading(true);
        try {
          // Load existing session
          const session = await getSessionById(initialSessionId);
          if (session) {
            setSessionId(session.id);
            // Important: Set messages first to prevent race conditions with language switch
            setMessages(session.messages);
            setSelectedLanguage(session.language);

            // Reconstruct chat history for the Gemini model
            const history: Content[] = session.messages
              .filter((m) => !m.isSystem && !m.isError)
              .map((m) => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.text }],
              }));

            chatSessionRef.current = createChatSession(
              session.language,
              history,
              sarcasmMode
            );
          }
        } catch (error) {
          console.error("Failed to load session:", error);
        } finally {
          setIsSessionLoading(false);
        }
        return;
      }

      // Default initialization
      if (!sessionId && isInitialMount.current) {
        initChat();
      }
      setIsSessionLoading(false);
    };

    initSession();
  }, [initialSessionId]);

  // Real-time subscription to session updates
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const streamMessageText = (msgId: string, fullText: string) => {
    let currentIndex = 0;
    // Faster typing for longer messages
    const speed = fullText.length > 100 ? 10 : 20;

    const interval = setInterval(() => {
      currentIndex += 2; // 2 chars at a time for snappiness
      if (currentIndex > fullText.length) currentIndex = fullText.length;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, text: fullText.substring(0, currentIndex) }
            : m
        )
      );

      if (currentIndex >= fullText.length) {
        clearInterval(interval);
      }
    }, speed);
  };

  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = subscribeToSession(sessionId, (session) => {
      if (session) {
        setIsAiPaused(session.isAiPaused || false);

        const newDbMessages = session.messages;
        const currentMessages = messagesRef.current;

        // Initial load: just set messages, don't animate history
        if (currentMessages.length === 0 && newDbMessages.length > 0) {
          setMessages(newDbMessages);
          return;
        }

        // Identify truly new messages (not present in local state by ID)
        const addedMessages = newDbMessages.filter(
          (dbMsg) => !currentMessages.some((curr) => curr.id === dbMsg.id)
        );

        if (addedMessages.length > 0) {
          // Handle new messages
          addedMessages.forEach((newMsg) => {
            if (newMsg.role === "model") {
              // Add with empty text first to prepare for streaming
              setMessages((prev) => [...prev, { ...newMsg, text: "" }]);
              // Start streaming
              streamMessageText(newMsg.id, newMsg.text);
            } else {
              // User messages (e.g. from another device) appear instantly
              setMessages((prev) => [...prev, newMsg]);
            }
          });
        } else if (newDbMessages.length !== currentMessages.length) {
          // Handle deletions or other non-additive changes
          setMessages(newDbMessages);
        }
      }
    });

    return () => unsubscribe();
  }, [sessionId]);

  // Helper to create session lazily (only when first message is sent)
  const ensureSessionExists = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    if (initialSessionId) return initialSessionId;
    if (isCreatingSessionRef.current) return null;

    const effectiveUserId = user?.uid || guestId;
    if (!effectiveUserId) return null;

    isCreatingSessionRef.current = true;
    try {
      const isGuest = !user;
      let ipAddress: string | null = null;
      if (isGuest) {
        ipAddress = await fetchUserIP();
      }

      const id = await createNewSession(
        effectiveUserId,
        selectedLanguage,
        user?.email || null,
        true,
        undefined,
        undefined,
        ipAddress
      );
      setSessionId(id);
      return id;
    } catch (error) {
      console.error("Failed to create firestore session", error);
      isCreatingSessionRef.current = false;
      return null;
    }
  }, [sessionId, initialSessionId, user, guestId, selectedLanguage]);

  // Save messages to Firestore whenever they change (only if there are real messages)
  useEffect(() => {
    // Only save if there are actual user/model messages (not just system messages)
    const hasRealMessages = messages.some((m) => !m.isSystem);
    if (sessionId && hasRealMessages && !isSessionLoading) {
      const sessionUpdate: ChatSession = {
        id: sessionId,
        userId: user?.uid || guestId,
        userEmail: user?.email || null,
        title: `Chat in ${selectedLanguage}`,
        language: selectedLanguage,
        startTime: Date.now(),
        lastUpdated: Date.now(),
        messages: messages,
        isAnonymous: !user, // True if no user object (guest fallback)
      };
      saveChatSession(sessionUpdate);
    }
  }, [messages, sessionId, user, isSessionLoading, guestId]);

  const initChat = useCallback(() => {
    chatSessionRef.current = createChatSession(
      selectedLanguage,
      undefined,
      sarcasmMode
    );
    setMessages([]); // Start with empty chat
  }, [sarcasmMode]); // Reinit when sarcasm changes

  // Handle sarcasm mode toggle
  const prevSarcasmRef = useRef(false);
  useEffect(() => {
    if (prevSarcasmRef.current === sarcasmMode) return;

    const toggleSarcasm = async () => {
      const systemMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "model",
        text: sarcasmMode
          ? "🙄 Sarcasm mode ON. Brace yourself..."
          : "Sarcasm mode OFF. Back to being helpful 😇",
        timestamp: Date.now(),
        isSystem: true,
      };
      setMessages((prev) => [...prev, systemMsg]);

      if (chatSessionRef.current) {
        try {
          const currentHistory = await chatSessionRef.current.getHistory();
          chatSessionRef.current = createChatSession(
            selectedLanguage,
            currentHistory,
            sarcasmMode
          );
        } catch (e) {
          chatSessionRef.current = createChatSession(
            selectedLanguage,
            undefined,
            sarcasmMode
          );
        }
      } else {
        chatSessionRef.current = createChatSession(
          selectedLanguage,
          undefined,
          sarcasmMode
        );
      }
    };

    toggleSarcasm();
    prevSarcasmRef.current = sarcasmMode;
  }, [sarcasmMode, selectedLanguage]);

  // Handle language change
  const prevLanguageRef = useRef(selectedLanguage);

  useEffect(() => {
    // Only run if language ACTUALLY changed
    if (prevLanguageRef.current === selectedLanguage) return;

    const switchLanguage = async () => {
      // Add visual system message
      const systemMsg: ChatMessage = {
        id: Date.now().toString(),
        role: "model",
        text: `Chat language changed to ${selectedLanguage}`,
        timestamp: Date.now(),
        isSystem: true,
      };
      setMessages((prev) => [...prev, systemMsg]);

      // Re-initialize with history for context
      if (chatSessionRef.current) {
        try {
          const currentHistory = await chatSessionRef.current.getHistory();
          chatSessionRef.current = createChatSession(
            selectedLanguage,
            currentHistory,
            sarcasmMode
          );
        } catch (e) {
          chatSessionRef.current = createChatSession(
            selectedLanguage,
            undefined,
            sarcasmMode
          );
        }
      } else {
        chatSessionRef.current = createChatSession(
          selectedLanguage,
          undefined,
          sarcasmMode
        );
      }
    };

    switchLanguage();
    prevLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    if (isInitialMount.current && !initialSessionId) {
      initChat();
      isInitialMount.current = false;
    } else if (initialSessionId) {
      isInitialMount.current = false;
    }
  }, [initChat, initialSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading || !chatSessionRef.current) return;

    // Allow sending if user OR guestId is present
    if (!user && !guestId) {
      console.warn("Waiting for authentication...");
      return;
    }

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

    // Create session lazily on first real message
    await ensureSessionExists();

    // If AI is paused (Admin active), skip generating response
    if (isAiPaused) {
      setIsLoading(false);
      return;
    }

    try {
      const resultStream = await chatSessionRef.current.sendMessageStream({
        message: userText,
      });

      // Create placeholder message for streaming response
      const botMsgId = (Date.now() + 1).toString();
      let fullResponseText = "";
      let finalUsage = undefined;

      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          role: "model",
          text: "", // Start empty
          timestamp: Date.now(),
        },
      ]);

      for await (const chunk of resultStream) {
        const chunkText = chunk.text || ""; // Safely access text
        fullResponseText += chunkText;

        if (chunk.usageMetadata) {
          finalUsage = chunk.usageMetadata;
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId ? { ...msg, text: fullResponseText } : msg
          )
        );
      }

      // Final update with usage metadata
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === botMsgId
            ? {
                ...msg,
                isError: fullResponseText.includes(
                  "That is not the selected language"
                ),
                usage: finalUsage
                  ? {
                      thoughtsTokenCount: finalUsage.thoughtsTokenCount,
                      candidatesTokenCount: finalUsage.candidatesTokenCount,
                      promptTokenCount: finalUsage.promptTokenCount,
                      totalTokenCount: finalUsage.totalTokenCount,
                    }
                  : undefined,
              }
            : msg
        )
      );
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
        <div className="flex items-center gap-3">
          {/* Sarcasm Toggle - Professional Switch */}
          <div
            onClick={() => setSarcasmMode(!sarcasmMode)}
            className="flex items-center gap-2 cursor-pointer group"
            title={sarcasmMode ? "Turn off sarcasm" : "Turn on sarcasm"}
          >
            <span className="text-[11px] font-medium text-ink-muted hidden sm:block">
              {sarcasmMode ? "Sass" : "Nice"}
            </span>
            <div
              className={`
              relative w-12 h-6 rounded-full transition-all duration-300 
              ${
                sarcasmMode
                  ? "bg-gradient-to-r from-orange-400 to-amber-500 shadow-[0_0_12px_rgba(251,146,60,0.4)]"
                  : "bg-slate-200 group-hover:bg-slate-300"
              }
            `}
            >
              <div
                className={`
                absolute top-0.5 w-5 h-5 rounded-full transition-all duration-300 flex items-center justify-center text-xs
                ${
                  sarcasmMode
                    ? "left-6 bg-white shadow-md"
                    : "left-0.5 bg-white shadow-sm"
                }
              `}
              >
                {sarcasmMode ? "😏" : "😇"}
              </div>
            </div>
          </div>
          <div className="w-36">
            <LanguageSelector
              selected={selectedLanguage}
              onChange={setSelectedLanguage}
            />
          </div>
        </div>
      </header>

      {/* Sign-in Nudge for Guests */}
      {user?.isAnonymous && showSignInNudge && (
        <div className="bg-indigo-50 px-4 py-3 flex items-center justify-between">
          <p className="text-indigo-900 text-xs font-medium">
            Sign in to save your chat history permanently.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => signInWithGoogle()}
              className="text-indigo-700 hover:text-indigo-900 text-xs font-bold underline"
            >
              Sign In
            </button>
            <button
              onClick={() => setShowSignInNudge(false)}
              className="text-indigo-400 hover:text-indigo-600"
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
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {messages.map((msg, index) => {
          if (msg.isSystem) {
            return (
              <div
                key={msg.id}
                className="flex w-full justify-center opacity-0 animate-enter"
                style={{
                  animationDelay: `${index * 50}ms`,
                  animationFillMode: "forwards",
                }}
              >
                <span className="px-3 py-1 bg-slate-50 text-ink-muted/60 text-[10px] font-mono uppercase tracking-widest rounded-full border border-slate-100">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex w-full opacity-0 animate-enter ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: "forwards",
              }}
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
                {msg.usage &&
                  msg.role === "model" &&
                  !msg.isError &&
                  !msg.isAdminReply && (
                    <div className="mt-2 ml-2 font-mono text-[10px] text-ink-muted flex items-center gap-3">
                      <span>{msg.usage.candidatesTokenCount || 0} output</span>
                      {msg.usage.thoughtsTokenCount &&
                        msg.usage.thoughtsTokenCount > 0 && (
                          <span className="text-accent">
                            • {msg.usage.thoughtsTokenCount} thoughts
                          </span>
                        )}
                      {msg.usage.totalTokenCount && (
                        <span>• {msg.usage.totalTokenCount} total</span>
                      )}
                    </div>
                  )}
              </div>
            </div>
          );
        })}

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
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            data-lpignore="true"
            data-form-type="other"
            name="chat-input"
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
