import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  subscribeToAllSessions,
  subscribeToAllUsers,
  addMessageToSession,
  toggleAiPause,
  ChatSession,
  UserProfile,
} from "../services/dbService";
import { ChatMessage, SessionType } from "../types";
import { MarkdownRenderer } from "./MarkdownRenderer";

import { useNavigate } from "react-router-dom";

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();
  const onBack = () => navigate('/');

  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"users" | "guests" | "active">(
    "users"
  );
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(
    null
  );
  const [replyText, setReplyText] = useState("");
  const [tick, setTick] = useState(0); // To force re-render for active tab

  // Admin check: Allow access if email ends with @buildnbit.com
  const isAdmin = user?.email?.endsWith("@buildnbit.com") ?? false;

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
      (s) => Date.now() - s.lastUpdated < 30000 // 30 seconds activity window
    )
    .sort((a, b) => b.lastUpdated - a.lastUpdated);

  // Group user sessions by email
  const sessionsByEmail = userSessions.reduce((acc, session) => {
    const email = session.userEmail!;
    if (!acc[email]) {
      acc[email] = [];
    }
    acc[email].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  // Create unified user list
  const allDisplayUsers = users.map((user) => {
    const userSessions = sessionsByEmail[user.email] || [];
    return {
      email: user.email,
      displayName: user.displayName,
      sessions: userSessions.sort((a, b) => b.lastUpdated - a.lastUpdated),
      lastActive: Math.max(
        user.lastLogin,
        ...(userSessions.map((s) => s.lastUpdated) || [0])
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
          (a, b) => b.lastUpdated - a.lastUpdated
        ),
        lastActive: Math.max(
          ...sessionsByEmail[email].map((s) => s.lastUpdated)
        ),
      });
    }
  });

  const uniqueUsers = allDisplayUsers.sort(
    (a, b) => b.lastActive - a.lastActive
  );

  useEffect(() => {
    let unsubscribeSessions: () => void;
    let unsubscribeUsers: () => void;

    if (isAdmin) {
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
    } else {
      setLoading(false);
    }

    return () => {
      if (unsubscribeSessions) unsubscribeSessions();
      if (unsubscribeUsers) unsubscribeUsers();
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <p className="text-ink-muted">Access Denied</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-50 px-4 sm:px-6 lg:px-8 flex flex-col overflow-hidden">
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
                            !selectedSession.isAiPaused
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
                        <div className="flex flex-col max-w-[90%] lg:max-w-[85%]">
                          {/* Label */}
                          <span
                            className={`text-[9px] lg:text-[10px] font-mono uppercase mb-1 ${
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
