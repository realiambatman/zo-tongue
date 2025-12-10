import React, { useState, useEffect, useRef, useCallback } from "react";
import { ChatMessage, SupportedLanguage } from "../types";
import {
  createChatSession,
  fetchServerTime,
  isDateTimeQuery,
  isCurrentEventsQuery,
} from "../services/geminiService";
import { LanguageSelector } from "./LanguageSelector";
import { Chat, Content } from "@google/genai";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { useAuth } from "../contexts/AuthContext";
import {
  createNewSession,
  saveChatSession,
  getSessionById,
  getUserSessions,
  subscribeToSession,
  fetchUserIP,
  ChatSession,
  generateChatTitle,
} from "../services/dbService";

import { useParams, useNavigate } from "react-router-dom";

// ... imports remain the same

export const ChatInterface: React.FC = () => {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const { user, signInWithGoogle, loading: authLoading } = useAuth();
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(
    SupportedLanguage.Paite
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false); // Keep for UI loading indicator
  const [isSearching, setIsSearching] = useState(false);
  const [processingMessages, setProcessingMessages] = useState<Set<string>>(
    new Set()
  ); // Track which messages are being processed
  const [serverDate, setServerDate] = useState<string>(""); // Cached server date/time
  const [isFetchingDate, setIsFetchingDate] = useState(false); // Track date fetch status

  // Use route param if available, otherwise null (new session)
  const [sessionId, setSessionId] = useState<string | null>(
    routeSessionId || null
  );
  const [isSessionLoading, setIsSessionLoading] = useState(!!routeSessionId);
  const [isAiPaused, setIsAiPaused] = useState(false);
  const [showSignInNudge, setShowSignInNudge] = useState(true);
  const [sarcasmMode, setSarcasmMode] = useState(false);
  const [sidebarSessions, setSidebarSessions] = useState<ChatSession[]>([]);
  // Default closed on mobile, open on desktop
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024; // lg breakpoint
    }
    return false; // Default to closed for SSR
  });
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] =
    useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const isCreatingSessionRef = useRef(false); // Prevent double creation
  const sessionIdRef = useRef<string | null>(null); // Track sessionId to avoid closure issues
  // Fallback ID for guests if Auth fails
  const [guestId] = useState(() => {
    const stored = localStorage.getItem("zotongue_guest_id");
    if (stored) return stored;
    const newId = "guest_" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("zotongue_guest_id", newId);
    return newId;
  });

  // Initialize server date on mount (similar to GovJobsPage pattern)
  useEffect(() => {
    const initializeServerDate = async () => {
      setIsFetchingDate(true);
      try {
        const date = await fetchServerTime();
        setServerDate(date);
      } catch (error) {
        console.warn(
          "Failed to fetch server time on mount, will retry when needed"
        );
        // Don't set serverDate, will use local time fallback
      } finally {
        setIsFetchingDate(false);
      }
    };
    initializeServerDate();
  }, []);

  // Initialize session: Load existing or create new
  useEffect(() => {
    const initSession = async () => {
      if (routeSessionId) {
        setIsSessionLoading(true);
        // Collapse sidebar when loading existing session
        setIsDesktopSidebarCollapsed(true);
        try {
          // Load existing session
          const session = await getSessionById(routeSessionId);
          if (session) {
            sessionIdRef.current = session.id; // Update ref immediately
            setSessionId(session.id); // Update state for active tab highlighting
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

      // Clear sessionId when navigating to new chat (no route param)
      if (!routeSessionId) {
        setSessionId(null);
        sessionIdRef.current = null;
      }

      // Default initialization - collapse sidebar for new chats too
      if (!sessionId && isInitialMount.current) {
        setIsDesktopSidebarCollapsed(true);
        initChat();
      }
      setIsSessionLoading(false);
    };

    initSession();
  }, [routeSessionId]);

  // Fetch sessions for sidebar
  useEffect(() => {
    const fetchSessions = async () => {
      if (user) {
        const sessions = await getUserSessions(user.uid);
        setSidebarSessions(sessions);
      } else if (guestId) {
        // Optional: Implement guest session fetching if needed,
        // but typically guests only have the current session in memory until saved.
        // For now, only show sidebar for logged in users or if we save guest sessions to DB.
        // If we want guests to see history, we need to query by guestId (userId).
        const sessions = await getUserSessions(guestId);
        setSidebarSessions(sessions);
      }
    };
    fetchSessions();
  }, [user, guestId, sessionId]); // Refresh when session changes (e.g. new title/message)

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

  // Keep sessionIdRef in sync with sessionId state
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Helper to create session lazily (only when first message is sent)
  // Note: Uses sessionIdRef to avoid closure issues with stale sessionId
  // Returns { id, isNew } to indicate if session was newly created
  const ensureSessionExists = useCallback(
    async (
      currentLanguage: SupportedLanguage
    ): Promise<{ id: string; isNew: boolean } | null> => {
      // Use ref to get the most current sessionId value
      if (sessionIdRef.current)
        return { id: sessionIdRef.current, isNew: false };
      if (routeSessionId) return { id: routeSessionId, isNew: false };
      if (isCreatingSessionRef.current) {
        // Wait a bit and check again if session was created
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (sessionIdRef.current)
          return { id: sessionIdRef.current, isNew: false };
        return null;
      }

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
          currentLanguage,
          user?.email || null,
          true,
          undefined,
          undefined,
          ipAddress
        );
        setSessionId(id);
        sessionIdRef.current = id; // Update ref immediately
        return { id, isNew: true };
      } catch (error) {
        console.error("Failed to create firestore session", error);
        return null;
      } finally {
        isCreatingSessionRef.current = false; // Always reset, success or failure
      }
    },
    [routeSessionId, user, guestId]
  );

  // Save messages to Firestore whenever they change (only if there are real messages)
  // Also saves when language changes to update the session language
  useEffect(() => {
    // Only save if there are actual user/model messages (not just system messages)
    const hasRealMessages = messages.some((m) => !m.isSystem);
    if (sessionId && hasRealMessages && !isSessionLoading) {
      // Generate title from messages, fallback to language-based title
      const generatedTitle = generateChatTitle(messages, selectedLanguage);

      const sessionUpdate: ChatSession = {
        id: sessionId,
        userId: user?.uid || guestId,
        userEmail: user?.email || null,
        title: generatedTitle,
        language: selectedLanguage,
        startTime: Date.now(),
        lastUpdated: Date.now(),
        messages: messages,
        isAnonymous: !user, // True if no user object (guest fallback)
      };
      saveChatSession(sessionUpdate);
    }
  }, [messages, sessionId, user, isSessionLoading, guestId, selectedLanguage]);

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
    if (isInitialMount.current && !routeSessionId) {
      initChat();
      isInitialMount.current = false;
    } else if (routeSessionId) {
      isInitialMount.current = false;
    }
  }, [initChat, routeSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // Allow sending multiple messages simultaneously - only check if input is empty or session exists
    if (!inputValue.trim() || !chatSessionRef.current) return;

    // Allow sending if user OR guestId is present
    if (!user && !guestId) {
      console.warn("Waiting for authentication...");
      return;
    }

    const userText = inputValue.trim();
    setInputValue("");

    const userMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: userText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setProcessingMessages((prev) => new Set(prev).add(userMsgId));
    setIsLoading(true); // Keep for overall loading indicator

    // Create session lazily on first real message (pass current language)
    const sessionResult = await ensureSessionExists(selectedLanguage);

    // Only save immediately if this is a NEWLY created session
    // (React state update for sessionId may not have completed yet)
    // For existing sessions, the regular save effect will handle it
    if (sessionResult?.isNew) {
      const generatedTitle = generateChatTitle([userMsg], selectedLanguage);
      saveChatSession({
        id: sessionResult.id,
        userId: user?.uid || guestId,
        userEmail: user?.email || null,
        title: generatedTitle,
        language: selectedLanguage,
        startTime: Date.now(),
        lastUpdated: Date.now(),
        messages: [userMsg],
        isAnonymous: !user,
      });
    }

    // If AI is paused (Admin active), skip generating response
    if (isAiPaused) {
      setProcessingMessages((prev) => {
        const next = new Set(prev);
        next.delete(userMsgId);
        return next;
      });
      setIsLoading(false);
      return;
    }

    // Detect if this is a date/time or current events query
    const needsServerTime = isDateTimeQuery(userText);
    const needsSearch = isCurrentEventsQuery(userText);

    let serverDateTime: string | undefined;
    if (needsServerTime) {
      // Always try to use cached serverDate first
      if (serverDate) {
        serverDateTime = serverDate;
      } else {
        // Fetch fresh if not cached (fallback scenario)
        setIsFetchingDate(true);
        try {
          const date = await fetchServerTime();
          setServerDate(date);
          serverDateTime = date;
        } catch (error) {
          console.warn(
            "Failed to fetch server time, using local time fallback"
          );
          // Generate a fallback date in IST format
          const now = new Date();
          const istOffset = 5.5 * 60 * 60 * 1000;
          const istTime = new Date(now.getTime() + istOffset);
          serverDateTime = istTime.toISOString().replace("Z", "+05:30");
        } finally {
          setIsFetchingDate(false);
        }
      }
    }

    // For current events or specific event queries, always enable search
    // This ensures accuracy when asking about specific events, people, or places
    const shouldUseSearch =
      needsSearch ||
      // Also enable search for queries about specific entities (likely current events)
      (userText.length > 15 &&
        (userText.match(
          /\b(about|regarding|tell me|explain|what|who|when|where)\s+(.*?)\b/i
        ) ||
          (userText.includes("?") && userText.length > 20)));

    // Show searching indicator if needed
    if (shouldUseSearch) {
      setIsSearching(true);
    }

    try {
      // Type assertion needed because our SecureChatSession extends Chat interface
      const resultStream = await (
        chatSessionRef.current as any
      ).sendMessageStream({
        message: userText,
        useSearch: shouldUseSearch,
        currentDateTime: serverDateTime,
      });

      // Create placeholder message for streaming response
      const botMsgId = (Date.now() + 1).toString();
      let fullResponseText = "";
      let finalUsage = undefined;
      let finalSources: Array<{ title: string; url: string }> | undefined =
        undefined;

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

        // Accumulate chunks (generator now yields only new characters)
        if (chunkText) {
          fullResponseText += chunkText;
        }

        if ((chunk as any).usageMetadata) {
          finalUsage = (chunk as any).usageMetadata;
        }

        if ((chunk as any).sources) {
          finalSources = (chunk as any).sources;
        }

        // Update the message with accumulated text
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === botMsgId ? { ...msg, text: fullResponseText } : msg
          )
        );
      }

      // Final update with usage metadata and sources
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
                sources: finalSources,
              }
            : msg
        )
      );

      // Clear searching indicator
      setIsSearching(false);
      // Remove from processing set
      setProcessingMessages((prev) => {
        const next = new Set(prev);
        next.delete(userMsgId);
        return next;
      });
      // Only set isLoading to false if no other messages are processing
      setProcessingMessages((current) => {
        if (current.size === 0) {
          setIsLoading(false);
        }
        return current;
      });
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
      setIsSearching(false);
      // Remove from processing set on error
      setProcessingMessages((prev) => {
        const next = new Set(prev);
        next.delete(userMsgId);
        if (next.size === 0) {
          setIsLoading(false);
        }
        return next;
      });
    }
  };

  // Prevent body scroll on mount
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.body.style.height = "100svh";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = "";
      document.body.style.height = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-50 px-2 sm:px-4 lg:px-8 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full min-h-0">
        <div
          className={`grid grid-cols-1 ${
            isSidebarOpen && isDesktopSidebarCollapsed
              ? "lg:grid-cols-[64px_1fr]"
              : "lg:grid-cols-4"
          } gap-2 sm:gap-4 lg:gap-8 flex-1 min-h-0 pb-2 sm:pb-4 lg:pb-8`}
        >
          {/* Mobile Backdrop */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Sidebar - Refined Admin Style */}
          <div
            className={`${
              isSidebarOpen
                ? isDesktopSidebarCollapsed
                  ? "lg:w-16"
                  : "lg:col-span-1 translate-x-0"
                : "lg:col-span-0 -translate-x-full lg:translate-x-0 lg:opacity-0 lg:pointer-events-none lg:hidden"
            } fixed lg:relative inset-y-0 left-0 w-[280px] sm:w-[320px] lg:w-auto z-50 lg:z-auto bg-white lg:rounded-[1.5rem] lg:rounded-[2rem] shadow-2xl lg:shadow-card overflow-hidden border border-slate-100 flex flex-col h-full transition-all duration-300 ease-in-out shrink-0`}
          >
            <div className="p-2 lg:p-3 flex-1 overflow-y-auto bg-slate-50/50">
              {/* Mobile Close Button */}
              <div className="flex items-center justify-between mb-4 lg:hidden">
                <h2 className="text-sm font-bold text-ink px-3">
                  Chat History
                </h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 text-slate-500 hover:text-ink transition-colors"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Desktop Collapse Button */}
              <div className="hidden lg:flex items-center justify-between mb-4">
                {!isDesktopSidebarCollapsed && (
                  <h2 className="text-sm font-bold text-ink px-3">
                    Chat History
                  </h2>
                )}
                <button
                  onClick={() =>
                    setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)
                  }
                  className="p-2 text-slate-500 hover:text-ink transition-colors ml-auto"
                  title={
                    isDesktopSidebarCollapsed
                      ? "Expand sidebar"
                      : "Collapse sidebar"
                  }
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    {isDesktopSidebarCollapsed ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    )}
                  </svg>
                </button>
              </div>

              {/* Show content on mobile when sidebar is open, or on desktop when not collapsed */}
              <div className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}>
                <button
                  onClick={() => {
                    navigate("/chat", { replace: true });
                    setSessionId(null);
                    setMessages([]);
                    chatSessionRef.current = null;
                    setIsDesktopSidebarCollapsed(true); // Collapse sidebar on desktop
                    // Only close on mobile, keep open on desktop
                    if (window.innerWidth < 1024) {
                      setIsSidebarOpen(false);
                    }
                  }}
                  className="flex items-center gap-3 w-full px-3 py-3 rounded-xl bg-white hover:bg-slate-50 text-ink border border-slate-100 transition-colors mb-4 shadow-sm"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  <span className="text-sm font-medium">New chat</span>
                </button>

                <div className="space-y-2">
                  <h3 className="px-3 text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">
                    Recent
                  </h3>
                  {sidebarSessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        navigate(`/chat/${session.id}`, { replace: true });
                        setIsDesktopSidebarCollapsed(true); // Collapse sidebar on desktop
                        // Only close on mobile, keep open on desktop
                        if (window.innerWidth < 1024) {
                          setIsSidebarOpen(false);
                        }
                      }}
                      className={`flex flex-col w-full px-3 py-2.5 rounded-xl text-left transition-all group ${
                        sessionId === session.id
                          ? "bg-ink text-white shadow-lg"
                          : "bg-white text-ink border border-slate-100 hover:bg-slate-50 hover:shadow-sm"
                      }`}
                    >
                      <div className="text-sm truncate w-full font-medium">
                        {session.title || "New Chat"}
                      </div>
                      <div
                        className={`text-[10px] truncate w-full mt-0.5 ${
                          sessionId === session.id
                            ? "text-slate-300"
                            : "text-slate-400"
                        }`}
                      >
                        {new Date(session.lastUpdated).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                  {sidebarSessions.length === 0 && (
                    <div className="px-3 text-slate-400 text-xs italic">
                      No history yet
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsed Desktop View - Show only icons when sidebar is open and collapsed */}
              {isDesktopSidebarCollapsed && isSidebarOpen && (
                <div className="hidden lg:flex flex-col items-center gap-2">
                  <button
                    onClick={() => {
                      navigate("/chat", { replace: true });
                      setSessionId(null);
                      setMessages([]);
                      chatSessionRef.current = null;
                      setIsDesktopSidebarCollapsed(true); // Keep collapsed when creating new chat
                    }}
                    className="p-2 rounded-xl bg-white hover:bg-slate-50 text-ink border border-slate-100 transition-colors shadow-sm"
                    title="New chat"
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
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </button>
                  {sidebarSessions.slice(0, 5).map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        navigate(`/chat/${session.id}`, { replace: true });
                        setIsDesktopSidebarCollapsed(true); // Keep collapsed when selecting chat
                      }}
                      className={`p-2 rounded-xl transition-all ${
                        sessionId === session.id
                          ? "bg-ink text-white shadow-lg"
                          : "bg-white text-ink border border-slate-100 hover:bg-slate-50"
                      }`}
                      title={session.title || "New Chat"}
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
                          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User Profile / Lower Sidebar - Show on mobile when sidebar is open, or on desktop when not collapsed */}
            <div className={isDesktopSidebarCollapsed ? "lg:hidden" : ""}>
              <div className="p-3 border-t border-slate-100 bg-white">
                {user ? (
                  <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer">
                    <div className="flex-1 overflow-hidden">
                      <div className="text-sm text-ink font-medium truncate">
                        {user.displayName || "User"}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        Free Plan
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => signInWithGoogle()}
                    className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors w-full text-left"
                  >
                    <div className="flex-1">
                      <div className="text-sm text-ink font-medium">Log in</div>
                      <div className="text-xs text-slate-500">
                        Save your chats
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div
            className={`${
              isSidebarOpen
                ? isDesktopSidebarCollapsed
                  ? ""
                  : "lg:col-span-3"
                : "lg:col-span-4"
            } bg-white rounded-[1.5rem] lg:rounded-[2rem] shadow-card overflow-hidden border border-slate-100 flex flex-col h-full min-h-0 relative`}
          >
            {/* Header - Admin Style */}
            <div className="p-4 lg:p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-3 shrink-0">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-ink transition-colors rounded-lg hover:bg-white"
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-base lg:text-lg font-bold text-ink truncate">
                  Native Chat
                </h2>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-[10px] lg:text-xs text-slate-500 font-mono uppercase tracking-widest truncate">
                    Speaking: {selectedLanguage}
                  </p>
                  {serverDate && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-white/80 border border-slate-200 rounded-full">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          isFetchingDate
                            ? "bg-amber-500 animate-pulse"
                            : "bg-emerald-500"
                        }`}
                      ></div>
                      <span className="text-[9px] font-mono text-slate-600">
                        {isFetchingDate
                          ? "SYNC..."
                          : new Date(serverDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
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
            </div>

            {/* Sign-in Nudge for Guests */}
            {user?.isAnonymous && showSignInNudge && (
              <div className="bg-indigo-50 px-4 lg:px-6 py-3 flex items-center justify-between border-b border-indigo-100">
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
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6 bg-canvas custom-scrollbar min-h-0 overscroll-contain">
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
                    <div className="flex flex-col max-w-[90%] lg:max-w-[85%]">
                      {/* Label */}
                      <span
                        className={`text-[9px] lg:text-[10px] font-mono uppercase mb-1 ${
                          msg.role === "user"
                            ? "text-right text-slate-400"
                            : "text-left text-accent"
                        }`}
                      >
                        {msg.role === "user"
                          ? "You"
                          : msg.isError
                          ? "Error"
                          : "AI"}
                      </span>

                      {/* Bubble */}
                      <div
                        className={`
                  px-4 lg:px-5 py-3 lg:py-4 text-sm leading-relaxed shadow-sm
                  ${
                    msg.role === "user"
                      ? "bg-white border border-slate-200 text-ink rounded-2xl lg:rounded-3xl rounded-br-lg"
                      : msg.isError
                      ? "bg-red-50 text-red-800 border border-red-100 rounded-2xl lg:rounded-3xl rounded-bl-lg"
                      : "bg-slate-100 text-ink border border-slate-200 rounded-2xl lg:rounded-3xl rounded-bl-lg"
                  }
                `}
                      >
                        {msg.role === "user" ? (
                          msg.text
                        ) : (
                          <MarkdownRenderer
                            content={msg.text}
                            className={
                              msg.isError ? "text-red-800 prose-red" : ""
                            }
                          />
                        )}
                      </div>
                      <span
                        className={`text-[10px] text-slate-300 mt-1 px-2 ${
                          msg.role === "user" ? "text-right" : "text-left"
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 px-2">
                          <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">
                            Sources:
                          </div>
                          <div className="flex flex-col gap-1">
                            {msg.sources.map((source, idx) => (
                              <a
                                key={idx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-indigo-600 hover:text-indigo-800 underline truncate"
                              >
                                {source.title || source.url}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {msg.usage &&
                        msg.role === "model" &&
                        !msg.isError &&
                        !msg.isAdminReply && (
                          <div className="mt-1 ml-2 font-mono text-[10px] text-slate-400 flex items-center gap-3">
                            <span>
                              {msg.usage.candidatesTokenCount || 0} output
                            </span>
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
                  <div className="flex flex-col max-w-[90%] lg:max-w-[85%]">
                    <span className="text-[9px] lg:text-[10px] font-mono uppercase mb-1 text-left text-accent">
                      AI
                    </span>
                    <div className="bg-slate-100 border border-slate-200 px-4 lg:px-5 py-3 lg:py-4 rounded-2xl lg:rounded-3xl rounded-bl-lg shadow-sm flex items-center gap-2">
                      {isSearching ? (
                        <div className="flex items-center gap-2">
                          <svg
                            className="w-4 h-4 text-indigo-600 animate-spin"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span className="text-[11px] text-indigo-600 font-medium">
                            Searching internet...
                          </span>
                        </div>
                      ) : (
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
                      )}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Admin Style */}
            <div className="p-3 lg:p-4 bg-white border-t border-slate-100 shrink-0">
              <form
                onSubmit={handleSendMessage}
                className="flex items-center gap-2 lg:gap-4"
              >
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={`Message in ${selectedLanguage}...`}
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
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
                  onClick={(e) => {
                    e.preventDefault();
                    handleSendMessage(e);
                  }}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-indigo-600 text-white px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl touch-manipulation"
                  style={{ touchAction: "manipulation" }}
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
