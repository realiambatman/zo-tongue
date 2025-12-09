import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { LandingPage } from "./components/LandingPage";
import ChatInterface from "./components/ChatInterface";
import TranslatorInterface from "./components/TranslatorInterface";
import StudyInterface from "./components/StudyInterface";
import SolverInterface from "./components/SolverInterface";
import { ProfilePage } from "./components/ProfilePage";
import { AdminPanel } from "./components/AdminPanel";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <LandingPage />
              </Layout>
            }
          />
          <Route path="/chat" element={<ChatInterface />} />
          <Route path="/chat/:sessionId" element={<ChatInterface />} />
          <Route path="/translate" element={<TranslatorInterface />} />
          <Route path="/study" element={<StudyInterface />} />
          <Route path="/solver" element={<SolverInterface />} />
          <Route
            path="/profile"
            element={
              <Layout>
                <ProfilePage
                  onNavigate={(mode) => {
                    const routes: Record<string, string> = {
                      CHAT: "/chat",
                      TRANSLATE: "/translate",
                      STUDY: "/study",
                      SOLVER: "/solver",
                    };
                    window.location.href = routes[mode] || "/chat";
                  }}
                  onSelectSession={(sessionId) => {
                    window.location.href = `/chat/${sessionId}`;
                  }}
                />
              </Layout>
            }
          />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
