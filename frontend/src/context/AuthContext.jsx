import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Toast Notification state
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          // Fetch logged in user profile
          const res = await api.get('/api/auth/me');
          if (res.data.success) {
            setUser(res.data.user);
          } else {
            logout();
          }
        } catch (err) {
          console.error('Session restoration failed:', err);
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.data.success) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
        showToast(`Welcome back, ${res.data.user.name}!`, 'success');
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check credentials.';
      showToast(msg, 'danger');
      return { success: false, error: msg };
    }
  };

  const register = async (name, email, password, role) => {
    try {
      const res = await api.post('/api/auth/register', { name, email, password, role });
      if (res.data.success) {
        showToast('Registration successful! You can now log in.', 'success');
        return { success: true };
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Try again.';
      showToast(msg, 'danger');
      return { success: false, error: msg };
    }
  };

  useEffect(() => {
    if (!token || !user) return;

    let timeoutId;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        logout('expired');
        window.location.href = '/login?expired=true';
      }, 30 * 60 * 1000);
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    
    resetTimer();

    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [token, user]);

  const logout = (reason = '') => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    if (reason === 'expired') {
      showToast('Session expired due to inactivity.', 'warning');
    } else {
      showToast('Logged out of session.', 'info');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, loading, login, register, logout, showToast, toasts, removeToast }}>
      {children}

      {/* Render Toast notifications in a fixed portal container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`pointer-events-auto p-4 rounded-xl shadow-lg border flex items-center justify-between cursor-pointer animate-slide-in transition-all duration-300 ${
              t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-300'
                : t.type === 'danger'
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-300'
                : t.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-300'
                : 'bg-white border-slate-200 text-slate-800 dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">
                {t.type === 'success' ? '✨' : t.type === 'danger' ? '🚨' : t.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <p className="text-sm font-medium">{t.message}</p>
            </div>
            <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-4 text-xs font-bold">✕</button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
