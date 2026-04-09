import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  subscribeToAllSessions,
  subscribeToAllUsers,
  addMessageToSession,
  toggleAiPause,
  deleteChatSession,
  deleteMessageFromSession,
  subscribeToMaintenanceMode,
  setMaintenanceMode,
  ChatSession,
  UserProfile,
} from "../services/dbService";
import { ChatMessage, SessionType, SupportedLanguage } from "../types";
import { MarkdownRenderer } from "./MarkdownRenderer";

import { useNavigate } from "react-router-dom";

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const onBack = () => navigate("/");

  const { user, loading: authLoading, signInWithGoogle } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"users" | "guests" | "active">(
    "users",
  );
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(
    null,
  );
  const [replyText, setReplyText] = useState("");
  const [tick, setTick] = useState(0); // To force re-render for active tab
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLanguage, setExportLanguage] = useState<string>("All");
  const [exportFormat, setExportFormat] = useState<"messages" | "sft">(
    "messages",
  );

  const getWordCount = (text: string): number =>
    text.trim().split(/\s+/).filter(Boolean).length;

  const isRefusalLine = (text: string): boolean => {
    const t = text.trim().toLowerCase();
    if (!t) return false;

    // Common refusal patterns when user asks in wrong language.
    const refusalPatterns = [
      /i can(?:not|'t)?\s+(?:answer|respond|help).*language/,
      /please\s+(?:ask|write|speak).*(?:in|using).*(?:language|english|paite|thadou|hmar|vaiphei|mizo|zou|kom|gangte)/,
      /only\s+(?:support|respond|answer).*(?:language|english|paite|thadou|hmar|vaiphei|mizo|zou|kom|gangte)/,
      /selected language/,
      /wrong language/,
      /language mismatch/,
      /cannot process.*language/,
    ];

    return refusalPatterns.some((pattern) => pattern.test(t));
  };

  const isErrorLikeLine = (text: string): boolean => {
    const t = text.trim().toLowerCase();
    if (!t) return false;
    const errorPatterns = [
      /encountered an error/,
      /an error occurred/,
      /^error[:\s]/,
      /something went wrong/,
      /failed to (?:generate|respond|process|fetch)/,
      /please try again/,
      /network error/,
      /timed out/,
    ];
    return errorPatterns.some((pattern) => pattern.test(t));
  };

  const normalizeTranslationLabel = (text: string): string => {
    // Convert prefixes like: [English -> Paite] some text
    const m = text.trim().match(/^\[([^\]]+?)\s*->\s*([^\]]+?)\]\s*(.*)$/);
    if (!m) {
      // Convert generic bracketed prefixes like: [Solve in Paite] question
      const generic = text.trim().match(/^\[([^\]]+)\]\s*(.*)$/);
      if (!generic) return text;
      const label = generic[1].trim();
      const rest = generic[2].trim();
      return rest ? `${label}: ${rest}` : label;
    }
    const from = m[1].trim();
    const to = m[2].trim();
    const rest = m[3].trim();
    return rest
      ? `Translate from ${from} to ${to}: ${rest}`
      : `Translate from ${from} to ${to}`;
  };

  const isContextlessTranslatePrompt = (text: string): boolean => {
    const t = text.trim().toLowerCase();
    if (!t) return true;

    // Direct command with only target language and no source payload.
    const bareTranslateCommands = [
      /^translate\s+(?:to|in|into)\s+[a-z]+(?:\s+[a-z]+)?[.!?]*$/,
      /^translate\s+this\s+(?:to|in|into)\s+[a-z]+(?:\s+[a-z]+)?[.!?]*$/,
      /^can you translate(?:\s+this)?\s+(?:to|in|into)\s+[a-z]+(?:\s+[a-z]+)?[.!?]*$/,
    ];
    if (bareTranslateCommands.some((pattern) => pattern.test(t))) {
      return true;
    }

    // Has translate intent but no obvious source content marker.
    const hasTranslateIntent =
      /translate/.test(t) ||
      /convert/.test(t) ||
      /^in\s+[a-z]+(?:\s+[a-z]+)?[.!?]*$/.test(t);
    if (!hasTranslateIntent) return false;

    const hasPayloadMarker =
      /:/.test(t) ||
      /["'“”‘’]/.test(t) ||
      /\b(where|what|how|who|when|why)\b/.test(t) ||
      /\bjustice\b|\blove\b|\bhospital\b|\bsentence\b/.test(t);

    return !hasPayloadMarker && getWordCount(t) <= 6;
  };

  const downloadSFTData = () => {
    const sessionsToExport = sessions.filter(
      (s) => exportLanguage === "All" || s.language === exportLanguage,
    );

    const langSlug = exportLanguage.toLowerCase().replace(/\s+/g, "_");
    const dateSlug = new Date().toISOString().slice(0, 10);

    if (exportFormat === "messages") {
      const lines: string[] = [];
      const addLanguageHeaderIfNeeded = (language: string) => {
        if (exportLanguage !== "All") return;
        lines.push(
          JSON.stringify({ comment: `=== Language: ${language} ===` }),
        );
      };

      const sessionsByLanguage = [...sessionsToExport].sort((a, b) =>
        (a.language || "").localeCompare(b.language || ""),
      );
      let currentLanguageHeader = "";

      sessionsByLanguage.forEach((session) => {
        if (
          exportLanguage === "All" &&
          session.language !== currentLanguageHeader
        ) {
          currentLanguageHeader = session.language;
          addLanguageHeaderIfNeeded(session.language);
        }

        const messages: { role: "user" | "assistant"; content: string }[] = [];
        const msgs = session.messages;
        for (let i = 0; i < msgs.length - 1; i++) {
          const currentMsg = msgs[i];
          const nextMsg = msgs[i + 1];

          if (
            currentMsg.role !== "user" ||
            currentMsg.isSystem ||
            currentMsg.isError ||
            (nextMsg.role !== "model" && !nextMsg.isAdminReply) ||
            nextMsg.isError
          ) {
            continue;
          }

          const userText = normalizeTranslationLabel(
            (currentMsg.text || "").trim(),
          );
          const assistantText = normalizeTranslationLabel(
            (nextMsg.text || "").trim(),
          );

          if (!userText || !assistantText) continue;
          if (isErrorLikeLine(userText) || isErrorLikeLine(assistantText))
            continue;
          if (isRefusalLine(assistantText)) continue;
          if (isContextlessTranslatePrompt(userText)) {
            continue;
          }

          // Solver: text-only + skip generic short user prompts.
          if (
            session.type === SessionType.SOLVER &&
            getWordCount(userText) < 30
          ) {
            continue;
          }

          messages.push({ role: "user", content: userText });
          messages.push({ role: "assistant", content: assistantText });
        }

        const assistantCount = messages.filter(
          (m) => m.role === "assistant",
        ).length;
        if (messages.length > 0 && assistantCount >= 1) {
          lines.push(JSON.stringify({ messages }));
        }
      });

      const jsonlContent = lines.join("\n");
      const blob = new Blob([jsonlContent], {
        type: "application/jsonlines",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chat_messages_${langSlug}_${dateSlug}.jsonl`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExportModal(false);
      return;
    }

    const sftData: { instruction: string; input: string; output: string }[] =
      [];
    const sftLines: string[] = [];
    const sessionsByLanguage = [...sessionsToExport].sort((a, b) =>
      (a.language || "").localeCompare(b.language || ""),
    );
    let currentLanguageHeader = "";

    sessionsByLanguage.forEach((session) => {
      if (
        exportLanguage === "All" &&
        session.language !== currentLanguageHeader
      ) {
        currentLanguageHeader = session.language;
        sftLines.push(
          JSON.stringify({ comment: `=== Language: ${session.language} ===` }),
        );
      }

      const msgs = session.messages;
      for (let i = 0; i < msgs.length - 1; i++) {
        const currentMsg = msgs[i];
        const nextMsg = msgs[i + 1];

        if (
          currentMsg.role === "user" &&
          !currentMsg.isSystem &&
          !currentMsg.isError &&
          (nextMsg.role === "model" || nextMsg.isAdminReply) &&
          !nextMsg.isError
        ) {
          const userText = normalizeTranslationLabel(
            (currentMsg.text || "").trim(),
          );
          if (!userText) continue;
          if (
            session.type === SessionType.SOLVER &&
            getWordCount(userText) < 30
          ) {
            continue;
          }
          if (isContextlessTranslatePrompt(userText)) {
            continue;
          }
          const outputText = normalizeTranslationLabel(
            (nextMsg.text || "").trim(),
          );
          if (!outputText || isRefusalLine(outputText)) continue;
          if (isErrorLikeLine(userText) || isErrorLikeLine(outputText))
            continue;

          sftData.push({
            instruction: userText,
            input: "",
            output: outputText,
          });
        }
      }

      if (sftData.length > 0) {
        sftLines.push(...sftData.map((item) => JSON.stringify(item)));
        sftData.length = 0;
      }
    });

    const jsonlContent = sftLines.join("\n");
    const blob = new Blob([jsonlContent], {
      type: "application/jsonlines",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sft_data_${langSlug}_${dateSlug}.jsonl`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  // Admin check: Allow access if email ends with @buildnbit.com
  // Only check after auth has finished loading to prevent false "Access Denied" flash
  const isAdmin = authLoading
    ? null
    : (user?.email?.endsWith("@buildnbit.com") ?? false);

  // Force re-render every 5 seconds to update "active" status
  useEffect(() => {
    if (activeTab === "active") {
      const interval = setInterval(() => setTick((t) => t + 1), 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Derived data
  const guestSessions = sessions.filter((s) => !s.userEmail);
  const userSessions = sessions.filter((s) => s.userEmail);
  const activeSessions = sessions
    .filter(
      (s) => Date.now() - s.lastUpdated < 30000, // 30 seconds activity window
    )
    .sort((a, b) => b.lastUpdated - a.lastUpdated);

  // Group user sessions by email
  const sessionsByEmail = userSessions.reduce(
    (acc, session) => {
      const email = session.userEmail!;
      if (!acc[email]) {
        acc[email] = [];
      }
      acc[email].push(session);
      return acc;
    },
    {} as Record<string, ChatSession[]>,
  );

  // Create unified user list
  const allDisplayUsers = users.map((user) => {
    const userSessions = sessionsByEmail[user.email] || [];
    return {
      email: user.email,
      displayName: user.displayName,
      sessions: userSessions.sort((a, b) => b.lastUpdated - a.lastUpdated),
      lastActive: Math.max(
        user.lastLogin,
        ...(userSessions.map((s) => s.lastUpdated) || [0]),
      ),
    };
  });

  // Add users who have sessions but NO user profile (legacy/edge case)
  const registeredEmails = new Set(users.map((u) => u.email));
  Object.keys(sessionsByEmail).forEach((email) => {
    if (!registeredEmails.has(email)) {
      allDisplayUsers.push({
        email,
        displayName: null,
        sessions: sessionsByEmail[email].sort(
          (a, b) => b.lastUpdated - a.lastUpdated,
        ),
        lastActive: Math.max(
          ...sessionsByEmail[email].map((s) => s.lastUpdated),
        ),
      });
    }
  });

  const uniqueUsers = allDisplayUsers.sort(
    (a, b) => b.lastActive - a.lastActive,
  );

  // Prevent body scroll on mount (mobile viewport fix)
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

  useEffect(() => {
    let unsubscribeSessions: () => void;
    let unsubscribeUsers: () => void;
    let unsubscribeMaintenance: () => void;

    // Only proceed if auth has finished loading and user is confirmed admin
    if (isAdmin === true) {
      unsubscribeSessions = subscribeToAllSessions((allSessions) => {
        setSessions(allSessions);
        setLoading(false);

        // Update selected session if it exists (for live updates)
        if (selectedSession) {
          const updated = allSessions.find((s) => s.id === selectedSession.id);
          if (updated) setSelectedSession(updated);
        }
      });

      unsubscribeUsers = subscribeToAllUsers((allUsers) => {
        setUsers(allUsers);
      });

      unsubscribeMaintenance = subscribeToMaintenanceMode((isEnabled) => {
        setIsMaintenanceMode(isEnabled);
      });
    } else if (isAdmin === false) {
      // Auth finished but user is not admin
      setLoading(false);
    }
    // If isAdmin is null, we're still loading, so don't do anything

    return () => {
      if (unsubscribeSessions) unsubscribeSessions();
      if (unsubscribeUsers) unsubscribeUsers();
      if (unsubscribeMaintenance) unsubscribeMaintenance();
    };
  }, [isAdmin, selectedSession?.id]); // Re-subscribe if needed, but mainly just handle updates

  // Scroll logic: Chat -> Bottom, Others -> Top
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedSession) {
      // Small delay to ensure layout is rendered, especially on mobile
      const timer = setTimeout(() => {
        if (
          !selectedSession.type ||
          selectedSession.type === SessionType.CHAT
        ) {
          // Chat: Scroll messages container to bottom
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTo({
              top: messagesContainerRef.current.scrollHeight,
              behavior: "smooth",
            });
          }
        } else {
          // Solver/Study/Translate: Scroll to top to see Input/Context
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = 0;
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [selectedSession?.id]); // Only run on session switch, not every message update (to allow manual scrolling)

  // Auto-scroll for Chat ONLY on new messages (live updates)
  useEffect(() => {
    if (
      selectedSession &&
      (!selectedSession.type || selectedSession.type === SessionType.CHAT)
    ) {
      // Scroll the container, not the element itself
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
    }
  }, [selectedSession?.messages.length]); // Trigger on message count change

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession || !replyText.trim()) return;

    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "model", // Acting as the model/assistant
      text: replyText.trim(),
      timestamp: Date.now(),
      isAdminReply: true, // Flag to indicate human admin
    };

    try {
      await addMessageToSession(selectedSession.id, newMessage);
      setReplyText("");
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert("Failed to send reply");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this entire chat session? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await deleteChatSession(sessionId);
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      alert("Failed to delete session");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedSession) return;

    if (
      !confirm(
        "Are you sure you want to delete this message? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      await deleteMessageFromSession(selectedSession.id, messageId);
    } catch (error) {
      console.error("Failed to delete message:", error);
      alert("Failed to delete message");
    }
  };

  // Show loading state while auth is checking
  if (authLoading || isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-ink border-t-transparent rounded-full animate-spin"></div>
          <p className="text-ink-muted">Checking access...</p>
        </div>
      </div>
    );
  }

  // Show access denied or sign-in prompt only after auth has finished loading
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <div className="max-w-md mx-auto px-4 text-center">
          {!user ? (
            // Not logged in - show sign-in option
            <div className="space-y-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h1 className="font-display text-2xl font-bold text-ink mb-2">
                Sign In Required
              </h1>
              <p className="text-ink-muted mb-6">
                Please sign in with your Google account to access the admin
                panel.
              </p>
              <button
                onClick={signInWithGoogle}
                className="w-full bg-ink text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>
              <button
                onClick={onBack}
                className="mt-4 text-ink-muted hover:text-ink text-sm underline"
              >
                Go back to home
              </button>
            </div>
          ) : (
            // Logged in but not admin
            <div className="space-y-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="font-display text-2xl font-bold text-ink mb-2">
                Access Denied
              </h1>
              <p className="text-ink-muted mb-2">
                You need an admin account to access this panel.
              </p>
              <p className="text-sm text-slate-400 mb-6">
                Admin access requires an email ending with{" "}
                <code className="bg-slate-100 px-2 py-1 rounded text-xs">
                  @buildnbit.com
                </code>
              </p>
              <p className="text-xs text-slate-400 mb-4">
                Currently signed in as: <br />
                <span className="font-mono text-ink">{user.email}</span>
              </p>
              <button
                onClick={onBack}
                className="w-full bg-slate-100 text-ink px-6 py-3 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Go back to home
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 px-4 sm:px-6 lg:px-8 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        {/* Header - Hidden on mobile when viewing a session */}
        <div
          className={`py-5 lg:py-8 flex justify-between items-center shrink-0 ${
            selectedSession ? "hidden lg:flex" : "flex"
          }`}
        >
          <div>
            <h1 className="font-display text-2xl sm:text-4xl font-bold text-ink mb-2">
              System Overview
            </h1>
            <p className="text-ink-muted font-mono text-[10px] sm:text-xs uppercase tracking-widest">
              Admin Dashboard • {sessions.length} Total Sessions
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Maintenance Mode Toggle */}
            <div className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-slate-200 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Maintenance
              </span>
              <button
                onClick={async () => {
                  const newValue = !isMaintenanceMode;
                  try {
                    await setMaintenanceMode(newValue, user?.email || "admin");
                    setIsMaintenanceMode(newValue);
                  } catch (error) {
                    console.error("Failed to toggle maintenance mode:", error);
                    alert("Failed to toggle maintenance mode");
                  }
                }}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                  isMaintenanceMode ? "bg-red-500" : "bg-slate-200"
                }`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300 ${
                    isMaintenanceMode ? "left-6" : "left-0.5"
                  }`}
                ></div>
              </button>
              <span
                className={`text-xs font-bold ${
                  isMaintenanceMode ? "text-red-600" : "text-slate-400"
                }`}
              >
                {isMaintenanceMode ? "ON" : "OFF"}
              </span>
            </div>

            {/* Export Button */}
            <button
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 bg-white rounded-xl px-4 py-2 border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
              title="Export SFT Data"
            >
              <svg
                className="w-5 h-5 text-indigo-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 hidden sm:inline">
                Export
              </span>
            </button>

            {/* Mobile close button */}
            {onBack && (
              <button
                onClick={onBack}
                className="lg:hidden p-2 bg-white rounded-full shadow-sm border border-slate-200 text-slate-500 hover:text-ink transition-colors"
                title="Close"
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
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 flex-1 min-h-0 pb-4 lg:pb-8">
          {/* Sidebar: Users & Sessions - Hidden on mobile when session is selected */}
          <div
            className={`lg:col-span-1 bg-white rounded-[1.5rem] lg:rounded-[2rem] shadow-card overflow-hidden border border-slate-100 flex flex-col h-full ${
              selectedSession ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => {
                  setActiveTab("users");
                  setSelectedUserEmail(null);
                }}
                className={`flex-1 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "users"
                    ? "bg-white text-ink border-b-2 border-ink"
                    : "bg-slate-50 text-slate-400 hover:text-ink"
                }`}
              >
                Users
              </button>
              <button
                onClick={() => {
                  setActiveTab("guests");
                  setSelectedUserEmail(null);
                }}
                className={`flex-1 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors ${
                  activeTab === "guests"
                    ? "bg-white text-ink border-b-2 border-ink"
                    : "bg-slate-50 text-slate-400 hover:text-ink"
                }`}
              >
                Guests
              </button>
              <button
                onClick={() => {
                  setActiveTab("active");
                  setSelectedUserEmail(null);
                }}
                className={`flex-1 py-4 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-2 ${
                  activeTab === "active"
                    ? "bg-white text-ink border-b-2 border-ink"
                    : "bg-slate-50 text-slate-400 hover:text-ink"
                }`}
              >
                Active
                {activeSessions.length > 0 && (
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                )}
              </button>
            </div>

            {/* Content Area */}
            <div className="overflow-y-auto flex-1 p-2 space-y-2 bg-slate-50/50">
              {activeTab === "active" ? (
                // Active Tab
                activeSessions.length > 0 ? (
                  activeSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      isSelected={selectedSession?.id === session.id}
                      onClick={() => setSelectedSession(session)}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 text-xs font-mono">
                    No active sessions
                  </div>
                )
              ) : activeTab === "users" ? (
                selectedUserEmail ? (
                  // Level 2: Specific User's Sessions
                  <>
                    <button
                      onClick={() => setSelectedUserEmail(null)}
                      className="w-full text-left px-4 py-3 mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-ink flex items-center gap-2"
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
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                      Back to Users
                    </button>
                    <div className="px-4 py-2 bg-indigo-50 rounded-xl mb-4 mx-2">
                      <p className="text-xs font-bold text-indigo-900">
                        {selectedUserEmail}
                      </p>
                      <p className="text-[10px] text-indigo-700/70">
                        {uniqueUsers.find((u) => u.email === selectedUserEmail)
                          ?.sessions.length || 0}{" "}
                        Sessions
                      </p>
                    </div>
                    {uniqueUsers
                      .find((u) => u.email === selectedUserEmail)
                      ?.sessions.map((session) => (
                        <SessionCard
                          key={session.id}
                          session={session}
                          isSelected={selectedSession?.id === session.id}
                          onClick={() => setSelectedSession(session)}
                        />
                      ))}
                  </>
                ) : (
                  // Level 1: List of Unique Users
                  uniqueUsers.map((user) => (
                    <div
                      key={user.email}
                      onClick={() => setSelectedUserEmail(user.email)}
                      className="p-4 bg-white rounded-2xl border border-slate-100 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-sm text-ink group-hover:text-indigo-600 transition-colors truncate max-w-[180px]">
                          {user.email}
                        </span>
                        <span className="px-2 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500">
                          {user.sessions.length}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Last active:{" "}
                        {new Date(user.lastActive).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )
              ) : (
                // Guests Tab: List all guest sessions
                guestSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    isSelected={selectedSession?.id === session.id}
                    onClick={() => setSelectedSession(session)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Chat View - Full screen on mobile when session selected */}
          <div
            className={`lg:col-span-2 bg-white rounded-[1.5rem] lg:rounded-[2rem] shadow-card overflow-hidden border border-slate-100 flex flex-col h-full relative ${
              selectedSession ? "flex" : "hidden lg:flex"
            }`}
          >
            {selectedSession ? (
              <>
                {/* Header */}
                <div className="p-4 lg:p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-3 shrink-0">
                  {/* Back button for mobile */}
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-ink transition-colors"
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
                  <div className="flex-1 min-w-0">
                    <h2 className="font-bold text-ink text-base lg:text-lg truncate">
                      {selectedSession.userEmail || "Guest User"}
                    </h2>
                    <p className="text-[10px] lg:text-xs text-slate-500 font-mono truncate">
                      ID: {selectedSession.userId} • {selectedSession.language}
                      {selectedSession.ipAddress &&
                        ` • IP: ${selectedSession.ipAddress}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 lg:gap-4 shrink-0">
                    {(!selectedSession.type ||
                      selectedSession.type === SessionType.CHAT) && (
                      <button
                        onClick={() =>
                          toggleAiPause(
                            selectedSession.id,
                            !selectedSession.isAiPaused,
                          )
                        }
                        className={`px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-[9px] lg:text-[10px] font-bold uppercase tracking-wider lg:tracking-widest transition-all border ${
                          selectedSession.isAiPaused
                            ? "bg-white text-ink border-slate-200 hover:bg-slate-50"
                            : "bg-ink text-white border-ink hover:bg-slate-800"
                        }`}
                      >
                        {selectedSession.isAiPaused ? "AI Off" : "AI On"}
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteSession(selectedSession.id)}
                      className="px-3 lg:px-4 py-1.5 lg:py-2 rounded-full text-[9px] lg:text-[10px] font-bold uppercase tracking-wider lg:tracking-widest transition-all border bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                      title="Delete entire chat session"
                    >
                      Delete Chat
                    </button>
                    <span
                      className={`w-3 h-3 rounded-full ${
                        selectedSession.isAnonymous
                          ? "bg-amber-400"
                          : "bg-emerald-500"
                      }`}
                      title={
                        selectedSession.isAnonymous ? "Anonymous" : "Registered"
                      }
                    ></span>
                  </div>
                </div>

                {/* Messages */}
                <div
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 lg:space-y-6 bg-canvas custom-scrollbar min-h-0"
                >
                  {selectedSession.messages.map((msg) => {
                    // Admin perspective:
                    // User messages are "incoming" (left)
                    // AI/Admin messages are "outgoing" (right)
                    const isIncoming = msg.role === "user";

                    return (
                      <div
                        key={msg.id}
                        className={`flex w-full ${
                          isIncoming ? "justify-start" : "justify-end"
                        }`}
                      >
                        <div className="flex flex-col max-w-[90%] lg:max-w-[85%] group">
                          {/* Label with delete button */}
                          <div
                            className={`flex items-center gap-2 mb-1 ${
                              isIncoming ? "justify-start" : "justify-end"
                            }`}
                          >
                            <span
                              className={`text-[9px] lg:text-[10px] font-mono uppercase ${
                                isIncoming
                                  ? "text-left text-slate-400"
                                  : "text-right text-accent"
                              }`}
                            >
                              {isIncoming
                                ? "User"
                                : msg.isAdminReply
                                  ? "Admin"
                                  : "AI"}
                            </span>
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                              title="Delete this message"
                            >
                              <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>

                          {/* Bubble */}
                          <div
                            className={`px-4 lg:px-5 py-3 lg:py-4 text-sm leading-relaxed shadow-sm ${
                              isIncoming
                                ? "bg-white border border-slate-200 text-ink rounded-2xl lg:rounded-3xl rounded-bl-lg"
                                : msg.isAdminReply
                                  ? "bg-indigo-600 text-white border border-indigo-500 rounded-2xl lg:rounded-3xl rounded-br-lg"
                                  : "bg-slate-100 text-ink border border-slate-200 rounded-2xl lg:rounded-3xl rounded-br-lg"
                            }`}
                          >
                            {msg.image && (
                              <div className="mb-3">
                                <img
                                  src={msg.image}
                                  alt="Attached"
                                  className="rounded-xl border border-slate-200 max-h-64 object-contain bg-slate-50"
                                />
                              </div>
                            )}
                            {msg.role === "user" || msg.isAdminReply ? (
                              msg.text
                            ) : (
                              <MarkdownRenderer content={msg.text} />
                            )}
                          </div>
                          <span
                            className={`text-[10px] text-slate-300 mt-1 px-2 ${
                              isIncoming ? "text-left" : "text-right"
                            }`}
                          >
                            {new Date(msg.timestamp).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input - Only for Chat Sessions */}
                {(!selectedSession.type ||
                  selectedSession.type === SessionType.CHAT) && (
                  <div className="p-3 lg:p-4 bg-white border-t border-slate-100 shrink-0">
                    <form
                      onSubmit={handleSendReply}
                      className="flex items-center gap-2 lg:gap-4"
                    >
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Reply as Admin..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 lg:px-4 py-2.5 lg:py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={!replyText.trim()}
                        className="bg-indigo-600 text-white px-4 lg:px-6 py-2.5 lg:py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                )}
              </>
            ) : (
              <div className="hidden lg:flex flex-1 flex-col items-center justify-center text-slate-400">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <p>Select a session to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-ink mb-4">
              Export training data
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              <strong>Chat messages</strong>: one JSON object per line with{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">
                messages
              </code>{" "}
              (user / assistant). Includes chat, translate, study, and solver
              sessions.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              <strong>SFT</strong>: one row per user→assistant pair;{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">
                instruction
              </code>{" "}
              is the user turn (no system prompt);{" "}
              <code className="text-xs bg-slate-100 px-1 rounded">input</code>{" "}
              is left empty for now.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Format
              </label>
              <select
                value={exportFormat}
                onChange={(e) =>
                  setExportFormat(e.target.value as "messages" | "sft")
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="messages">Chat messages (JSONL)</option>
                <option value="sft">
                  SFT instruction / input / output (JSONL)
                </option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Language filter
              </label>
              <select
                value={exportLanguage}
                onChange={(e) => setExportLanguage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="All">All Languages</option>
                {Object.values(SupportedLanguage).map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={downloadSFTData}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
              >
                Download JSONL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Component for Session Cards
const SessionCard: React.FC<{
  session: ChatSession;
  isSelected: boolean;
  onClick: () => void;
}> = ({ session, isSelected, onClick }) => (
  <div
    onClick={onClick}
    className={`p-3 lg:p-4 rounded-xl lg:rounded-2xl cursor-pointer transition-all duration-200 mb-2 active:scale-[0.98] ${
      isSelected
        ? "bg-ink text-white shadow-lg"
        : "bg-white hover:bg-slate-100 text-ink border border-slate-100"
    }`}
  >
    <div className="flex justify-between items-start mb-2">
      <div className="flex items-center gap-2">
        {(!session.type || session.type === SessionType.CHAT) && (
          <svg
            className="w-3 h-3 text-indigo-400"
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
        )}
        {session.type === SessionType.TRANSLATE && (
          <svg
            className="w-3 h-3 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
        )}
        {session.type === SessionType.STUDY && (
          <svg
            className="w-3 h-3 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        )}
        {session.type === SessionType.SOLVER && (
          <svg
            className="w-3 h-3 text-rose-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        )}
        <span
          className={`font-mono text-[10px] uppercase tracking-widest ${
            isSelected ? "text-slate-400" : "text-slate-500"
          }`}
        >
          {session.language}
        </span>
      </div>
      <span
        className={`text-[10px] ${
          isSelected ? "text-slate-400" : "text-slate-400"
        }`}
      >
        {new Date(session.lastUpdated).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })}
      </span>
    </div>
    <div className="font-bold text-sm mb-1 truncate">
      {session.title || "Chat Session"}
    </div>
    {/* Show IP for guest sessions */}
    {session.isAnonymous && session.ipAddress && (
      <div
        className={`text-[10px] font-mono mb-1 flex items-center gap-1 ${
          isSelected ? "text-slate-400" : "text-slate-400"
        }`}
      >
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
          />
        </svg>
        {session.ipAddress}
      </div>
    )}
    <div
      className={`text-xs truncate ${
        isSelected ? "text-slate-300" : "text-slate-500"
      }`}
    >
      {session.messages.length > 0
        ? session.messages[session.messages.length - 1].text
        : "No messages"}
    </div>
  </div>
);
