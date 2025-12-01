import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { getUserSessions, ChatSession } from "../services/dbService";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ProfilePageProps {
  onNavigate: (mode: string) => void;
  onSelectSession?: (sessionId: string) => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  onNavigate,
  onSelectSession,
}) => {
  const { user, signInWithGoogle } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      if (user) {
        const userSessions = await getUserSessions(user.uid);
        setSessions(userSessions);
      }
      setLoading(false);
    };
    fetchSessions();
  }, [user]);

  return (
    <div className="min-h-screen bg-canvas pt-24 px-6 lg:px-8 pb-20">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div>
            <h1 className="font-display text-5xl font-bold text-ink mb-4 tracking-tight">
              Your Archives
            </h1>
            <p className="text-ink-muted text-lg font-light">
              {user?.isAnonymous
                ? "Guest Session History"
                : `History for ${user?.email}`}
            </p>
          </div>
          {user?.isAnonymous && (
            <button
              onClick={signInWithGoogle}
              className="bg-ink text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-slate-800 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              Sign in to Sync
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-0"></div>
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-150 mx-1"></div>
            <div className="w-2 h-2 bg-accent rounded-full animate-bounce delay-300"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-slate-200 rounded-3xl bg-slate-50">
            <p className="text-ink-muted font-light">No chat history found.</p>
            <button
              onClick={() => onNavigate("CHAT")}
              className="mt-4 text-accent font-mono text-xs uppercase tracking-widest hover:underline"
            >
              Start a new conversation
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession?.(session.id)}
                className="bg-white border border-slate-100 rounded-3xl p-8 shadow-card hover:shadow-card-hover transition-all duration-500 group cursor-pointer"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="font-mono text-xs uppercase tracking-widest text-accent mb-2 block">
                      {session.language}
                    </span>
                    <h3 className="font-display text-2xl font-bold text-ink group-hover:text-accent transition-colors">
                      {session.title}
                    </h3>
                  </div>
                  <span className="text-slate-400 text-xs font-mono">
                    {new Date(session.lastUpdated).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-slate-500 text-sm line-clamp-3 font-light leading-relaxed">
                  {session.messages.length > 0
                    ? session.messages[session.messages.length - 1].text
                    : "No messages"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
