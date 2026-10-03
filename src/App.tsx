import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navbar } from './components/Navbar';
import { BottomNavigation } from './components/BottomNavigation';
import { Toast } from './components/Toast';
import type { ToastMessage } from './components/Toast';

import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { ActivityPage } from './pages/ActivityPage';
import { StatusPage } from './pages/StatusPage';
import { SettingsPage } from './pages/SettingsPage';
import { getDeviceStatus } from './services/deviceService';

const MainLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [deviceStatusLabel, setDeviceStatusLabel] = useState<'Online' | 'Offline' | 'Device Status Unavailable' | 'Checking...'>('Checking...');

  useEffect(() => {
    let isMounted = true;

    const refreshDeviceStatus = async () => {
      try {
        const status = await getDeviceStatus();
        if (isMounted) {
          setDeviceStatusLabel(status.esp8266);
        }
      } catch {
        if (isMounted) {
          setDeviceStatusLabel('Device Status Unavailable');
        }
      }
    };

    refreshDeviceStatus();
    const intervalId = window.setInterval(refreshDeviceStatus, 5000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const handleShowToast = (newToast: ToastMessage) => {
    setToast(newToast);
  };

  // Derive active tab from pathname
  const currentTab = location.pathname.substring(1) || 'dashboard';

  const handleSelectTab = (tab: string) => {
    navigate(`/${tab}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0f19] text-slate-400 text-sm">
        Loading Smart Home Automation...
      </div>
    );
  }

  // Unauthenticated routing
  if (!user) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <LoginPage
              onNavigateToRegister={() => navigate('/register')}
              onSuccess={() => navigate('/dashboard')}
            />
          }
        />
        <Route
          path="/register"
          element={
            <RegisterPage
              onNavigateToLogin={() => navigate('/login')}
              onSuccess={() => navigate('/dashboard')}
            />
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Authenticated routing
  return (
    <div className="min-h-screen flex flex-col bg-[#0b0f19] text-slate-100 selection:bg-cyan-500 selection:text-slate-950 transition-colors">
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        deviceStatus={deviceStatusLabel}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Routes>
          <Route
            path="/dashboard"
            element={
              <DashboardPage
                onShowToast={handleShowToast}
                onNavigateTab={handleSelectTab}
              />
            }
          />
          <Route path="/activity" element={<ActivityPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/settings" element={<SettingsPage onShowToast={handleShowToast} />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      <BottomNavigation currentTab={currentTab} onSelectTab={handleSelectTab} />

      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
