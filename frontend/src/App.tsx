import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './components/ui/Toast';
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const SignupPage = lazy(() => import('./pages/SignupPage').then(m => ({ default: m.SignupPage })));
const WelcomePage = lazy(() => import('./pages/WelcomePage').then(m => ({ default: m.WelcomePage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
import { DashboardLayout } from './components/dashboard/DashboardLayout';
const OverviewPage = lazy(() => import('./pages/OverviewPage').then(m => ({ default: m.OverviewPage })));
const CallsPage = lazy(() => import('./pages/CallsPage').then(m => ({ default: m.CallsPage })));
const SMSPage = lazy(() => import('./pages/SMSPage').then(m => ({ default: m.SMSPage })));
const ContactsPage = lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then(m => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/TermsPage').then(m => ({ default: m.TermsPage })));
const ContactPage = lazy(() => import('./pages/ContactPage').then(m => ({ default: m.ContactPage })));
const DemoPage = lazy(() => import('./pages/DemoPage').then(m => ({ default: m.DemoPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const BlogPage = lazy(() => import('./pages/BlogPage').then(m => ({ default: m.BlogPage })));
const CompareTalkmatePage = lazy(() => import('./pages/CompareTalkmatePage').then(m => ({ default: m.CompareTalkmatePage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then(m => ({ default: m.HelpPage })));
const ChangelogPage = lazy(() => import('./pages/ChangelogPage').then(m => ({ default: m.ChangelogPage })));
const StatusPage = lazy(() => import('./pages/StatusPage').then(m => ({ default: m.StatusPage })));
const IndustryPlumbersPage = lazy(() => import('./pages/industries/IndustryPlumbersPage').then(m => ({ default: m.IndustryPlumbersPage })));
const IndustryElectriciansPage = lazy(() => import('./pages/industries/IndustryElectriciansPage').then(m => ({ default: m.IndustryElectriciansPage })));
const IndustryBuildersPage = lazy(() => import('./pages/industries/IndustryBuildersPage').then(m => ({ default: m.IndustryBuildersPage })));

import { useEffect, useRef } from 'react';

function Spinner() {
  return (
    <div className="min-h-screen bg-[#080c14] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-lg" />
          <div className="relative w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg viewBox="0 0 32 32" className="w-6 h-6 fill-white"><path d="M18 5L9 18H16L14 27L23 14H16L18 5Z" /></svg>
          </div>
        </div>
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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

function FadeIn({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.opacity = '0';
    ref.current.style.transform = 'translateY(8px)';
    const raf = requestAnimationFrame(() => {
      if (!ref.current) return;
      ref.current.style.transition = 'opacity 220ms ease, transform 220ms ease';
      ref.current.style.opacity = '1';
      ref.current.style.transform = 'translateY(0)';
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  return <div ref={ref}>{children}</div>;
}

function AppRoutes() {
  const location = useLocation();
  return (
    <Routes location={location} key={location.pathname}>
      <Route path="/" element={<FadeIn><LandingPage /></FadeIn>} />
      <Route path="/privacy" element={<FadeIn><PrivacyPage /></FadeIn>} />
      <Route path="/terms" element={<FadeIn><TermsPage /></FadeIn>} />
      <Route path="/contact" element={<FadeIn><ContactPage /></FadeIn>} />
      <Route path="/demo" element={<FadeIn><DemoPage /></FadeIn>} />
      <Route path="/login" element={<PublicOnlyRoute><FadeIn><LoginPage /></FadeIn></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute><FadeIn><SignupPage /></FadeIn></PublicOnlyRoute>} />
      <Route path="/welcome" element={<ProtectedRoute><FadeIn><WelcomePage /></FadeIn></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><FadeIn><OnboardingPage /></FadeIn></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<OverviewPage />} />
        <Route path="calls" element={<CallsPage />} />
        <Route path="sms" element={<SMSPage />} />
        <Route path="contacts" element={<ContactsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="/about" element={<FadeIn><AboutPage /></FadeIn>} />
      <Route path="/blog" element={<FadeIn><BlogPage /></FadeIn>} />
      <Route path="/compare/talkmate" element={<FadeIn><CompareTalkmatePage /></FadeIn>} />
      <Route path="/help" element={<FadeIn><HelpPage /></FadeIn>} />
      <Route path="/changelog" element={<FadeIn><ChangelogPage /></FadeIn>} />
      <Route path="/status" element={<FadeIn><StatusPage /></FadeIn>} />
      <Route path="/industries/plumbers" element={<FadeIn><IndustryPlumbersPage /></FadeIn>} />
      <Route path="/industries/electricians" element={<FadeIn><IndustryElectriciansPage /></FadeIn>} />
      <Route path="/industries/builders" element={<FadeIn><IndustryBuildersPage /></FadeIn>} />
      <Route path="*" element={<FadeIn><NotFoundPage /></FadeIn>} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
