import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { OverviewPage } from './pages/OverviewPage';
import { CallsPage } from './pages/CallsPage';
import { SMSPage } from './pages/SMSPage';
import { ContactsPage } from './pages/ContactsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useEffect, useRef } from 'react';

function Spinner() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center blue-glow animate-pulse">
          <svg viewBox="0 0 32 32" className="w-5 h-5 fill-white">
            <path d="M18 5L9 18H16L14 27L23 14H16L18 5Z" />
          </svg>
        </div>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Animated wrapper that fades in on route change
function AnimatedPage({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.opacity = '0';
      ref.current.style.transform = 'translateY(8px)';
      const raf = requestAnimationFrame(() => {
        if (ref.current) {
          ref.current.style.transition = 'opacity 220ms ease, transform 220ms ease';
          ref.current.style.opacity = '1';
          ref.current.style.transform = 'translateY(0)';
        }
      });
      return () => cancelAnimationFrame(raf);
    }
  }, []);
  return <div ref={ref}>{children}</div>;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<AnimatedPage><LandingPage /></AnimatedPage>} />

      <Route path="/login" element={
        <PublicOnlyRoute>
          <AnimatedPage><LoginPage /></AnimatedPage>
        </PublicOnlyRoute>
      } />
      <Route path="/signup" element={
        <PublicOnlyRoute>
          <AnimatedPage><SignupPage /></AnimatedPage>
        </PublicOnlyRoute>
      } />

      <Route path="/onboarding" element={
        <ProtectedRoute>
          <AnimatedPage><OnboardingPage /></AnimatedPage>
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardLayout /></ProtectedRoute>
      }>
        <Route index element={<OverviewPage />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="sms" element={<SMSPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
