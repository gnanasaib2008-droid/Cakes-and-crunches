import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Bell, Search, AlertTriangle, AlertOctagon, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SidebarToggle } from './Sidebar';

const Header = ({ onSearchClick, sidebarOpen, setSidebarOpen }) => {
  const [alerts, setAlerts] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchAlerts = async () => {
    try {
      const res = await api.get('/api/dashboard/alerts');
      if (res.data.success) {
        const fetchedAlerts = res.data.data;
        // Check if there are newly arrived critical alerts to trigger a browser notification
        if (alerts.length > 0) {
          const previousUnreadIds = alerts.filter(a => a.status === 'unread').map(a => a.id);
          const newCriticalAlerts = fetchedAlerts.filter(
            a => a.status === 'unread' && a.severity === 'critical' && !previousUnreadIds.includes(a.id)
          );
          if (newCriticalAlerts.length > 0) {
            newCriticalAlerts.forEach(a => {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(`🚨 Critical Allergy Alert: ${a.customer_name}`, {
                  body: a.message,
                  tag: `alert-${a.id}`
                });
              }
            });
          }
        }
        setAlerts(fetchedAlerts);
      }
    } catch (err) {
      console.error('Failed to load alerts in header:', err);
    }
  };

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [alerts]);

  // Request browser notification permissions on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = alerts.filter(a => a.status === 'unread').length;

  const handleDismiss = async (e, id) => {
    e.stopPropagation();
    try {
      const res = await api.put(`/api/dashboard/alerts/${id}/dismiss`);
      if (res.data.success) {
        // Optimistically update alert state
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'read' } : a));
      }
    } catch (err) {
      console.error('Dismiss failed:', err);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      const unreadAlerts = alerts.filter(a => a.status === 'unread');
      if (unreadAlerts.length === 0) return;

      await Promise.all(
        unreadAlerts.map(a => api.put(`/api/dashboard/alerts/${a.id}/dismiss`))
      );
      setAlerts(prev => prev.map(a => ({ ...a, status: 'read' })));
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  };

  const handleAlertClick = (alert) => {
    setDropdownOpen(false);
    navigate(`/customers/${alert.customer_id}?tab=timeline`);
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md sticky top-0 z-40 flex items-center justify-between px-4 lg:px-8 transition-colors duration-200">
      {/* Sidebar Toggle & Search Bar Activator */}
      <div className="flex items-center">
        <SidebarToggle sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <button 
          onClick={onSearchClick}
          className="w-48 sm:w-80 h-9 px-3 bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-800/80 rounded-xl text-slate-400 hover:text-slate-500 dark:text-slate-500 dark:hover:text-slate-400 flex items-center justify-between border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50 transition-all text-xs font-medium cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Quick search...</span>
          </span>
          <kbd className="hidden sm:inline-block bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-[10px] font-mono shadow-sm">⌘K</kbd>
        </button>
      </div>

      {/* Right Tools */}
      <div className="flex items-center gap-4">
        {/* Notification Bell Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200/60 dark:bg-slate-800 dark:hover:bg-slate-700/60 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center relative transition-all cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-rose-650 text-[9px] font-black text-white flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-2 z-50 overflow-hidden">
              <div className="flex items-center justify-between p-3 border-b border-slate-100 dark:border-slate-800 mb-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Alert Center</span>
                  <span className="text-[10px] text-slate-400">
                    {unreadCount} Open Alert{unreadCount === 1 ? '' : 's'}
                  </span>
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-black text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 cursor-pointer"
                  >
                    Mark All Read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto space-y-1.5 p-1">
                {alerts.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                    🎉 No active alerts or allergy conflicts!
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => handleAlertClick(alert)}
                      className={`p-3 rounded-xl border flex gap-3 items-start transition-all cursor-pointer ${
                        alert.status === 'unread'
                          ? 'bg-slate-50 border-slate-200 dark:bg-slate-800/40 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                          : 'bg-white border-transparent text-slate-500 dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800/20'
                      }`}
                    >
                      <div className="mt-0.5">
                        {alert.severity === 'critical' ? (
                          <AlertOctagon className="w-4 h-4 text-rose-650" />
                        ) : (
                          <AlertTriangle className={`w-4 h-4 ${alert.severity === 'warning' ? 'text-amber-500' : 'text-sky-500'}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{alert.customer_name}</span>
                          <span className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                            alert.severity === 'critical'
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : alert.severity === 'warning'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                          }`}>
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-655 dark:text-slate-400 mt-1 leading-normal line-clamp-2">{alert.message}</p>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-2 block">
                          {new Date(alert.created_at).toLocaleDateString()} at {new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {alert.status === 'unread' && (
                        <button
                          onClick={(e) => handleDismiss(e, alert.id)}
                          className="w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center hover:text-emerald-600 dark:hover:text-emerald-400 transition-all self-center cursor-pointer"
                          title="Mark Read"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Role Badge */}
        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/50 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 capitalize">
          {user?.role} Mode
        </span>
      </div>
    </header>
  );
};

export default Header;
