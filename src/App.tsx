import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import OrganizationSelector from "./pages/OrganizationSelector";
import JoinOrganization from "./pages/JoinOrganization";
import Settings from "./pages/Settings";
import OrganizationSettings from "./pages/OrganizationSettings";
import { ToastProvider } from "./components/Toast";

const hasValidOrganization = () => {
  const orgId = localStorage.getItem("organizationId");
  return !!orgId && orgId !== "0" && orgId !== "null" && Number(orgId) > 0;
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    !!localStorage.getItem("token"),
  );
  const [hasOrganization, setHasOrganization] = useState<boolean>(
    hasValidOrganization(),
  );
  const [isPersonalMode, setIsPersonalMode] = useState<boolean>(
    localStorage.getItem("personalMode") === "true",
  );

  useEffect(() => {
    const applyTheme = () => {
      const theme = localStorage.getItem("theme") || "light";
      if (theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
    };

    applyTheme();

    const handleThemeStorage = (event: StorageEvent) => {
      if (event.key === "theme") {
        applyTheme();
      }
    };

    window.addEventListener("storage", handleThemeStorage);
    return () => window.removeEventListener("storage", handleThemeStorage);
  }, []);

  useEffect(() => {
    const checkAuth = () => setIsAuthenticated(!!localStorage.getItem("token"));
    const checkOrg = () => setHasOrganization(hasValidOrganization());
    const checkPersonalMode = () =>
      setIsPersonalMode(localStorage.getItem("personalMode") === "true");
    window.addEventListener("auth-change", checkAuth);
    window.addEventListener("org-change", checkOrg);
    window.addEventListener("personal-mode-change", checkPersonalMode);
    return () => {
      window.removeEventListener("auth-change", checkAuth);
      window.removeEventListener("org-change", checkOrg);
      window.removeEventListener("personal-mode-change", checkPersonalMode);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    localStorage.removeItem("organizationId");
    localStorage.removeItem("organizationName");
    localStorage.removeItem("userRole");
    localStorage.removeItem("personalMode");
    setIsAuthenticated(false);
    setHasOrganization(false);
    setIsPersonalMode(false);
    window.dispatchEvent(new Event("auth-change"));
    window.dispatchEvent(new Event("org-change"));
    window.dispatchEvent(new Event("personal-mode-change"));
  };

  // Force re-check of state on any route change
  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem("token"));
    setHasOrganization(hasValidOrganization());
    setIsPersonalMode(localStorage.getItem("personalMode") === "true");
  }, []);

  return (
    <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route
            path="/login"
            element={
              <Login
                setAuth={() => {
                  setIsAuthenticated(true);
                  setHasOrganization(hasValidOrganization());
                  setIsPersonalMode(
                    localStorage.getItem("personalMode") === "true",
                  );
                }}
              />
            }
          />
          <Route
            path="/register"
            element={
              <Register
                setAuth={() => {
                  setIsAuthenticated(true);
                  setHasOrganization(hasValidOrganization());
                  setIsPersonalMode(
                    localStorage.getItem("personalMode") === "true",
                  );
                }}
              />
            }
          />

          {/* OAuth Callback */}
          <Route
            path="/login/oauth2/code/:provider"
            element={
              <Login
                setAuth={() => {
                  setIsAuthenticated(true);
                  setHasOrganization(hasValidOrganization());
                  setIsPersonalMode(
                    localStorage.getItem("personalMode") === "true",
                  );
                }}
              />
            }
          />

          {/* Organization Routes */}
          <Route path="/join/:inviteCode" element={<JoinOrganization />} />

          {/* Protected Routes */}
          <Route
            path="/select-org"
            element={
              isAuthenticated ? (
                <OrganizationSelector />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/settings"
            element={isAuthenticated ? <Settings /> : <Navigate to="/login" />}
          />
          <Route
            path="/organization-settings"
            element={
              isAuthenticated && hasOrganization ? (
                <OrganizationSettings />
              ) : isAuthenticated ? (
                <Navigate to="/select-org" />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/"
            element={
              !isAuthenticated ? (
                <Navigate to="/login" />
              ) : !hasOrganization && !isPersonalMode ? (
                <Navigate to="/select-org" />
              ) : (
                <Dashboard
                  onLogout={handleLogout}
                  isPersonalMode={isPersonalMode}
                />
              )
            }
          />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
