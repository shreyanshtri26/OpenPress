import { useEffect, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useIdleTimer } from 'react-idle-timer';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import { KanbanProvider } from './context/KanbanContext';
import { UserProvider, UserContext } from './context/UserContext';
import { registerServiceWorker } from './utils/registerServiceWorker';
import { watchRepublishJob } from './helpers/republishAllCampaignPages';
import LoginPage from './pages/login';
import SignupPage from './pages/signup';
import MediaPage from './pages/media';
import LibraryPage from './pages/library';
import AllStoriesPage from './pages/all_stories';
import DashboardPage from './pages/dashboard';
import DashboardReviewPage from './pages/dashboard/review';
import DashboardEditorMediaPage from './pages/dashboard/editor/media';
import DashboardJournalistMediaPage from './pages/dashboard/journalist/media';
import DashboardMediaPage from './pages/dashboard/media';
import SignalsPage from './pages/signals';
import WiresPage from './pages/wires';
import SettingsPage from './pages/settings';
import ForgotPasswordPage from './pages/auth/forgot-password';
import AnalyticsPage from './pages/analytics';
import QueriesPage from './pages/queries';
import ResearchPage from './pages/research';
import NotFoundPage from './pages/404';
import BuildPage from './pages/build';

import CampaignsIndexPage from './pages/campaigns/index';
import CampaignDetailPage from './pages/campaigns/detail';
import ContactInquiriesPage from './pages/contact_inquiries';
import SurveysPage from './pages/surveys/index';
import SurveyViewPage from './pages/survey/view';
import { useRouter } from './hooks/useRouter';

function IdleTimerWrapper({ children }) {
  const router = useRouter();
  const { logout, user } = useContext(UserContext);
  // const IDLE_TIMEOUT = 90 * 60 * 1000;
  const IDLE_TIMEOUT = 9 * 60 * 60 * 1000; // 9 hours

  const handleLogout = () => {
    if (typeof window !== 'undefined' && router.pathname !== '/login') {
      localStorage.setItem('lastRoute', router.asPath);
    }

    logout();
    router.push('/login');
  };

  const onIdle = () => {
    if (user) {
      handleLogout();
    }
  };

  useIdleTimer({
    onIdle,
    timeout: IDLE_TIMEOUT,
    throttle: 500,
    events: [
      'mousemove',
      'keydown',
      'wheel',
      'DOMMouseScroll',
      'mousewheel',
      'mousedown',
      'touchstart',
      'touchmove',
      'MSPointerDown',
      'MSPointerMove',
      'visibilitychange',
    ],
  });

  useEffect(() => {
    if (!user) return;

    let lastTime = Date.now();

    const checkActivity = setInterval(() => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastTime;
      // if (timeDiff > 2 * 60 * 1000) {
      if (timeDiff > 9 * 60 * 60 * 1000) { // 9 hours
        handleLogout();
      }

      lastTime = currentTime;
    }, 60 * 1000);

    return () => clearInterval(checkActivity);
  }, [user, router]);

  // Show a publish job that is already running (started here, in Page Studio, or by a teammate).
  useEffect(() => {
    if (user?.token) watchRepublishJob(user.token);
  }, [user?.token]);

  return <>{children}</>;
}

function RootRedirect() {
  const { user, loading } = useContext(UserContext);
  if (loading) return null;
  return <Navigate to={user ? '/dashboard' : '/login'} replace />;
}

export default function App() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return (
    <HelmetProvider>
      <UserProvider>
        <KanbanProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <IdleTimerWrapper>
              <Toaster position="top-center" reverseOrder={false} />
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/media" element={<LibraryPage />} />
                <Route path="/library" element={<LibraryPage />} />
                <Route path="/legacy-media" element={<MediaPage />} />
                <Route path="/all_stories" element={<AllStoriesPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/dashboard/review/:id" element={<DashboardReviewPage />} />
                <Route path="/dashboard/editor/media" element={<DashboardEditorMediaPage />} />
                <Route path="/dashboard/journalist/media" element={<DashboardJournalistMediaPage />} />
                <Route path="/dashboard/media" element={<DashboardMediaPage />} />
                <Route path="/wires" element={<WiresPage />} />
                <Route path="/signals" element={<WiresPage />} />
                <Route path="/research" element={<ResearchPage />} />
                <Route path="/queries" element={<ResearchPage />} />
                <Route path="/contact_inquiries" element={<ContactInquiriesPage />} />
                <Route path="/build" element={<BuildPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/campaign-hub" element={<CampaignsIndexPage />} />
                <Route path="/campaign-hub/detail" element={<CampaignDetailPage />} />
                <Route path="/campaigns" element={<CampaignsIndexPage />} />
                <Route path="/campaigns/detail" element={<CampaignDetailPage />} />
                <Route path="/surveys" element={<SurveysPage />} />
                <Route path="/survey/s/:surveyId" element={<SurveyViewPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </IdleTimerWrapper>
          </BrowserRouter>
        </KanbanProvider>
      </UserProvider>
    </HelmetProvider>
  );
}
