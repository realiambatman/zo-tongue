import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Layout } from "./components/Layout";
import { LandingPage } from "./components/LandingPage";
import ChatInterface from "./components/ChatInterface";
import TranslatorInterface from "./components/TranslatorInterface";
import StudyInterface from "./components/StudyInterface";
import SolverInterface from "./components/SolverInterface";
import { ProfilePage } from "./components/ProfilePage";
import { AdminPanel } from "./components/AdminPanel";
import { ServiceUnavailable } from "./components/ServiceUnavailable";
import { subscribeToMaintenanceMode } from "./services/dbService";

// Component to check maintenance mode
const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Subscribe to maintenance mode changes
    const unsubscribe = subscribeToMaintenanceMode((isEnabled) => {
      setIsMaintenanceMode(isEnabled);
    });

    return () => unsubscribe();
  }, []);

  // Allow admins to access admin panel even during maintenance
  const isAdmin = user?.email?.endsWith("@buildnbit.com") ?? false;
  const isAdminRoute = location.pathname === "/admin";

  // Show maintenance page if enabled, unless user is admin accessing admin panel
  if (isMaintenanceMode && !(isAdmin && isAdminRoute)) {
    return <ServiceUnavailable />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <MaintenanceGuard>
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
        </MaintenanceGuard>
      </Router>
    </AuthProvider>
  );
};

export default App;
