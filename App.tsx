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
import {
  subscribeToMaintenanceMode,
  getMaintenanceMode,
} from "./services/dbService";
import { isPlatformAdminEmail } from "./constants";

// Component to check maintenance mode
const MaintenanceGuard: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean | null>(
    null
  ); // null = loading
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;
    const apply = (isEnabled: boolean) => {
      if (isMounted) setIsMaintenanceMode(isEnabled);
    };

    // Real-time listener (primary path — updates all open tabs instantly)
    const unsubscribe = subscribeToMaintenanceMode(apply, (error) => {
      console.error("Maintenance listener failed:", error);
    });

    // One-shot fetch so first paint is not blocked waiting only on snapshot cold start
    getMaintenanceMode()
      .then(apply)
      .catch((error) => {
        console.error("Error checking maintenance mode:", error);
        apply(false);
      });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  // Always allow access to admin panel (let AdminPanel handle its own auth)
  const isAdminRoute = location.pathname === "/admin";

  const isAdmin =
    !authLoading && isPlatformAdminEmail(user?.email ?? null);

  // Always allow /admin route through - AdminPanel will handle its own authentication
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // Return null while checking maintenance mode
  if (isMaintenanceMode === null) {
    return null;
  }

  // Show maintenance page if enabled, unless user is admin
  if (isMaintenanceMode && !isAdmin) {
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
