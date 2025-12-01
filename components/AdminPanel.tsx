import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  subscribeToAllSessions,
  addMessageToSession,
  toggleAiPause,
  ChatSession,
} from "../services/dbService";
import { ChatMessage } from "../types";
import { MarkdownRenderer } from "./MarkdownRenderer";

export const AdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  const usersMap = userSessions.reduce((acc, session) => {
    const email = session.userEmail!;
    if (!acc[email]) {
      acc[email] = [];
    }
    acc[email].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  const uniqueUsers = Object.keys(usersMap)
    .map((email) => ({
      email,
      sessions: usersMap[email].sort((a, b) => b.lastUpdated - a.lastUpdated),
      lastActive: Math.max(...usersMap[email].map((s) => s.lastUpdated)),
    }))
    .sort((a, b) => b.lastActive - a.lastActive);

  useEffect(() => {
    let unsubscribe: () => void;

    if (isAdmin) {
      unsubscribe = subscribeToAllSessions((allSessions) => {
        setSessions(allSessions);
        setLoading(false);

        // Update selected session if it exists (for live updates)
        if (selectedSession) {
          const updated = allSessions.find((s) => s.id === selectedSession.id);
          if (updated) setSelectedSession(updated);
        }
      });
    } else {
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isAdmin, selectedSession?.id]); // Re-subscribe if needed, but mainly just handle updates

  // Scroll to bottom of chat when opening or updating
  useEffect(() => {
    if (selectedSession) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedSession?.messages]);

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
    <div className="min-h-screen bg-slate-50 pt-5 px-6 lg:px-8 pb-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="font-display text-4xl font-bold text-ink mb-2">
              System Overview
            </h1>
            <p className="text-ink-muted font-mono text-xs uppercase tracking-widest">
              Admin Dashboard • {sessions.length} Total Sessions
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-200px)] min-h-[600px]">
          {/* Sidebar: Users & Sessions */}
          <div className="lg:col-span-1 bg-white rounded-[2rem] shadow-card overflow-hidden border border-slate-100 flex flex-col h-full">
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
                        {usersMap[selectedUserEmail]?.length || 0} Sessions
                      </p>
                    </div>
                    {usersMap[selectedUserEmail]?.map((session) => (
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

          {/* Chat View */}
          <div className="lg:col-span-2 bg-white rounded-[2rem] shadow-card overflow-hidden border border-slate-100 flex flex-col h-full relative">
            {selectedSession ? (
              <>
                {/* Header */}
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div>
                    <h2 className="font-bold text-ink text-lg">
                      {selectedSession.userEmail || "Guest User"}
                    </h2>
                    <p className="text-xs text-slate-500 font-mono">
                      ID: {selectedSession.userId} • {selectedSession.language}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() =>
                        toggleAiPause(
                          selectedSession.id,
                          !selectedSession.isAiPaused
                        )
                      }
                      className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all border ${
                        selectedSession.isAiPaused
                          ? "bg-white text-ink border-slate-200 hover:bg-slate-50"
                          : "bg-ink text-white border-ink hover:bg-slate-800"
                      }`}
                    >
                      {selectedSession.isAiPaused ? "AI Paused" : "AI Active"}
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
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-canvas custom-scrollbar">
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
                        <div className="flex flex-col max-w-[85%]">
                          {/* Label */}
                          <span
                            className={`text-[10px] font-mono uppercase mb-1 ${
                              isIncoming
                                ? "text-left text-slate-400"
                                : "text-right text-accent"
                            }`}
                          >
                            {isIncoming
                              ? "User"
                              : msg.isAdminReply
                              ? "Admin (You)"
                              : "AI Model"}
                          </span>

                          {/* Bubble */}
                          <div
                            className={`px-5 py-4 text-sm leading-relaxed shadow-sm ${
                              isIncoming
                                ? "bg-white border border-slate-200 text-ink rounded-3xl rounded-bl-lg"
                                : msg.isAdminReply
                                ? "bg-indigo-600 text-white border border-indigo-500 rounded-3xl rounded-br-lg"
                                : "bg-slate-100 text-ink border border-slate-200 rounded-3xl rounded-br-lg"
                            }`}
                          >
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
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Input */}
                <div className="p-4 bg-white border-t border-slate-100">
                  <form
                    onSubmit={handleSendReply}
                    className="flex items-center gap-4"
                  >
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type a reply as Admin..."
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim()}
                      className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
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
    className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 mb-2 ${
      isSelected
        ? "bg-ink text-white shadow-lg"
        : "bg-white hover:bg-slate-100 text-ink border border-slate-100"
    }`}
  >
    <div className="flex justify-between items-start mb-2">
      <span
        className={`font-mono text-[10px] uppercase tracking-widest ${
          isSelected ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {session.language}
      </span>
      <span
        className={`text-[10px] ${
          isSelected ? "text-slate-400" : "text-slate-400"
        }`}
      >
        {new Date(session.lastUpdated).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
      </span>
    </div>
    <div className="font-bold text-sm mb-1 truncate">
      {session.title || "Chat Session"}
    </div>
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
