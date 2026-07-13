import React, { useState, useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { RefreshCw } from "lucide-react";

// Lazy load views for optimization and small bundle sizes
const Home = lazy(() => import("./pages/Home.tsx"));
const Directory = lazy(() => import("./pages/Directory.tsx"));
const MembershipCheck = lazy(() => import("./pages/MembershipCheck.tsx"));
const AccountClaim = lazy(() => import("./pages/AccountClaim.tsx"));
const Registration = lazy(() => import("./pages/Registration.tsx"));
const Login = lazy(() => import("./pages/Login.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const PrivacyNotice = lazy(() => import("./pages/PrivacyNotice.tsx"));
const AdminLogin = lazy(() => import("./pages/AdminLogin.tsx"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard.tsx"));
const AdminMembers = lazy(() => import("./pages/AdminMembers.tsx"));
const AdminClaims = lazy(() => import("./pages/AdminClaims.tsx"));
const AdminSessions = lazy(() => import("./pages/AdminSessions.tsx"));
const AdminSettings = lazy(() => import("./pages/AdminSettings.tsx"));
const Errors = lazy(() => import("./pages/Errors.tsx"));

// Scroll to top helper on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Validate session cookies on launch
  useEffect(() => {
    const validateSessions = async () => {
      try {
        // Check member session via API cookie
        const userRes = await fetch("/api/auth/session");
        const userData = await userRes.json();
        if (userData.authenticated) {
          setUser(userData.member);
        }

        // Check admin auth via localStorage (simple magic keyword approach)
        const adminAuth = localStorage.getItem("alikhwan_admin_auth");
        if (adminAuth === "true") {
          setIsAdmin(true);
        }
      } catch {
        // ignore
      } finally {
        setCheckingAuth(false);
      }
    };
    validateSessions();
  }, []);

  const handleAuthSuccess = (member: any) => {
    setUser(member);
    if (member.registrationSuccessMessage) {
      sessionStorage.setItem(
        "registrationSuccessMessage",
        member.registrationSuccessMessage,
      );
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleAdminAuthSuccess = () => {
    setIsAdmin(true);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("alikhwan_admin_auth");
  };

  // Render a full-page loading spinner while sessions are checking
  if (checkingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-brand-background">
        <RefreshCw className="w-8 h-8 text-brand-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-brand-muted">
          Memulakan e-Kariah...
        </p>
      </div>
    );
  }

  // Intercept and render offline screen if connection is lost
  if (isOffline) {
    return (
      <Suspense fallback={null}>
        <Errors type="offline" />
      </Suspense>
    );
  }

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ScrollToTop />
      <Suspense
        fallback={
          <div className="min-h-screen flex flex-col items-center justify-center bg-brand-background">
            <RefreshCw className="w-8 h-8 text-brand-primary animate-spin" />
          </div>
        }
      >
        <Routes>
          {/* Public Visitor Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/ahli" element={<Directory />} />
          <Route path="/semak-keahlian" element={<MembershipCheck />} />
          <Route path="/tuntut-akaun" element={<AccountClaim />} />
          <Route path="/notis-privasi" element={<PrivacyNotice />} />

          <Route
            path="/log-masuk"
            element={
              user ? (
                <Navigate to="/profil" replace />
              ) : (
                <Login onAuthSuccess={handleAuthSuccess} />
              )
            }
          />
          <Route
            path="/lupa-kata-laluan"
            element={
              user ? <Navigate to="/profil" replace /> : <ForgotPassword />
            }
          />
          <Route
            path="/daftar"
            element={
              user ? (
                <Navigate to="/profil" replace />
              ) : (
                <Registration onAuthSuccess={handleAuthSuccess} />
              )
            }
          />

          {/* Authenticated Member Profile Route */}
          <Route
            path="/profil"
            element={
              user ? (
                <Profile onLogoutSuccess={handleLogout} />
              ) : (
                <Navigate to="/log-masuk" replace />
              )
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/login"
            element={
              isAdmin ? (
                <Navigate to="/admin" replace />
              ) : (
                <AdminLogin onAdminAuthSuccess={handleAdminAuthSuccess} />
              )
            }
          />

          <Route
            path="/admin"
            element={
              isAdmin ? (
                <AdminDashboard onLogout={handleAdminLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/ahli"
            element={
              isAdmin ? (
                <AdminMembers key="all-members" onLogout={handleAdminLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/ahli/:memberId"
            element={
              isAdmin ? (
                <AdminMembers
                  key="member-details"
                  onLogout={handleAdminLogout}
                />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/pendaftaran"
            element={
              isAdmin ? (
                <AdminMembers
                  key="pending-members"
                  onLogout={handleAdminLogout}
                  initialStatus="pending"
                  pageTitle="Kelulusan Ahli"
                />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/tuntutan"
            element={
              isAdmin ? (
                <AdminClaims onLogout={handleAdminLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/sesi"
            element={
              isAdmin ? (
                <AdminSessions onLogout={handleAdminLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />
          <Route
            path="/admin/tetapan"
            element={
              isAdmin ? (
                <AdminSettings onLogout={handleAdminLogout} />
              ) : (
                <Navigate to="/admin/login" replace />
              )
            }
          />

          {/* 404 fallback */}
          <Route path="*" element={<Errors type="404" />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
