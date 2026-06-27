import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import GlobalSearch from './components/GlobalSearch';
import ErrorBoundary from './components/ErrorBoundary';

// Pages - Eagerly loaded
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Pages - Lazy loaded
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CustomerList = lazy(() => import('./pages/CustomerList'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const OrderList = lazy(() => import('./pages/OrderList'));
const AllergyRegistry = lazy(() => import('./pages/AllergyRegistry'));
const Reports = lazy(() => import('./pages/Reports'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const OrderOnline = lazy(() => import('./pages/OrderOnline'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Protected Route Wrapper
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center">
        <span className="w-8 h-8 border-4 border-violet-600/30 border-t-violet-600 rounded-full animate-spin" />
        <span className="text-xs font-semibold mt-4 text-slate-450 dark:text-slate-500 uppercase tracking-widest">Verifying Session Security...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const MainLayout = ({ children, isDarkMode, setIsDarkMode, sidebarOpen, setSidebarOpen }) => {
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcut for Cmd+K / Ctrl+K search modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-150 transition-colors duration-250">
      <Sidebar isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onSearchClick={() => setSearchOpen(true)} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto pb-16">
          {children}
        </main>
      </div>

      <GlobalSearch isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize theme from storage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <SocketProvider>
            <Suspense fallback={
              <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center">
                <span className="w-8 h-8 border-4 border-violet-600/30 border-t-violet-600 rounded-full animate-spin" />
                <span className="text-xs font-semibold mt-4 text-slate-450 dark:text-slate-500 uppercase tracking-widest text-center">Loading Page Component...</span>
              </div>
            }>
              <Routes>
                {/* Public route */}
                <Route path="/order-online" element={<OrderOnline />} />

                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                {/* Core App Layout Protected Routes */}
                <Route path="/" element={
                  <ProtectedRoute>
                    <MainLayout isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                } />

                <Route path="/customers" element={
                  <ProtectedRoute>
                    <MainLayout isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <CustomerList />
                    </MainLayout>
                  </ProtectedRoute>
                } />

                <Route path="/customers/:id" element={
                  <ProtectedRoute>
                    <MainLayout isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <CustomerDetail />
                    </MainLayout>
                  </ProtectedRoute>
                } />

                <Route path="/orders" element={
                  <ProtectedRoute>
                    <MainLayout isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <OrderList />
                    </MainLayout>
                  </ProtectedRoute>
                } />

                <Route path="/allergies" element={
                  <ProtectedRoute>
                    <MainLayout isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <AllergyRegistry />
                    </MainLayout>
                  </ProtectedRoute>
                } />

                {/* Admin Restricted Routes */}
                <Route path="/reports" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <MainLayout isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <Reports />
                    </MainLayout>
                  </ProtectedRoute>
                } />

                <Route path="/audit" element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <MainLayout isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>
                      <AuditLogs />
                    </MainLayout>
                  </ProtectedRoute>
                } />

                {/* Fallback */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </SocketProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
