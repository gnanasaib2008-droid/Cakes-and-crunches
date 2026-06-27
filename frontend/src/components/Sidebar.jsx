import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  ShieldAlert, 
  FileSpreadsheet, 
  LogOut, 
  History,
  Sun,
  Moon,
  Cake,
  Menu,
  X
} from 'lucide-react';

export const SidebarToggle = ({ sidebarOpen, setSidebarOpen }) => {
  return (
    <button
      onClick={() => setSidebarOpen(!sidebarOpen)}
      className="p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer mr-2 lg:hidden"
      title="Toggle Navigation"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
};

const Sidebar = ({ isDarkMode, setIsDarkMode, sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [screenSize, setScreenSize] = useState('desktop');
  const [stats, setStats] = useState({ pendingOrders: 0, unreadAlerts: 0 });

  // Auto-detect screen size
  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const tabletQuery = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
    
    const handleScreenResize = () => {
      if (mobileQuery.matches) {
        setScreenSize('mobile');
      } else if (tabletQuery.matches) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleScreenResize();
    mobileQuery.addEventListener('change', handleScreenResize);
    tabletQuery.addEventListener('change', handleScreenResize);
    
    return () => {
      mobileQuery.removeEventListener('change', handleScreenResize);
      tabletQuery.removeEventListener('change', handleScreenResize);
    };
  }, []);

  // Fetch stats for order and alert count badges
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/api/dashboard/stats');
        if (res.data.success) {
          setStats(res.data.data);
        }
      } catch (err) {
        console.error('Sidebar stats fetch failed:', err);
      }
    };

    if (user) {
      fetchStats();
      const interval = setInterval(fetchStats, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close sidebar on mobile when location path changes
  useEffect(() => {
    if (screenSize === 'mobile') {
      setSidebarOpen(false);
    }
  }, [location.pathname, screenSize]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin', 'staff'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['admin', 'staff'] },
    { name: 'Orders', path: '/orders', icon: ShoppingBag, roles: ['admin', 'staff'] },
    { name: 'Allergy Registry', path: '/allergies', icon: ShieldAlert, roles: ['admin', 'staff'] },
    { name: 'Reports', path: '/reports', icon: FileSpreadsheet, roles: ['admin'] },
    { name: 'Audit Logs', path: '/audit', icon: History, roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const isCollapsed = screenSize === 'tablet';
  const isMobile = screenSize === 'mobile';

  // CSS classes depending on sidebar state and size
  const sidebarWidthClass = isMobile 
    ? `w-64 fixed z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}` 
    : isCollapsed ? 'w-20' : 'w-64';

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`${sidebarWidthClass} bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 transition-all duration-300`}>
        {/* Sidebar Header Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-9 h-9 rounded-xl bg-violet-600 dark:bg-violet-500 flex items-center justify-center text-white shadow-md shadow-violet-500/20 shrink-0">
              <Cake className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                Cakes & Crunches
              </span>
            )}
          </div>

          {/* Close button for mobile drawer */}
          {isMobile && (
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation items list */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const hasBadge = (item.name === 'Orders' && stats.pendingOrders > 0) || 
                             (item.name === 'Allergy Registry' && stats.unreadAlerts > 0);
            const badgeCount = item.name === 'Orders' ? stats.pendingOrders : stats.unreadAlerts;

            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-650/15'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-900/60'
                  }`
                }
                title={isCollapsed ? item.name : undefined}
              >
                <div className="relative shrink-0">
                  <item.icon className="w-5 h-5" />
                  {/* Small badge dot on icon if collapsed */}
                  {isCollapsed && hasBadge && (
                    <span className={`absolute -top-1 -right-1.5 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center text-white border border-slate-100 dark:border-slate-950 ${
                      item.name === 'Orders' ? 'bg-violet-650' : 'bg-rose-500'
                    }`}>
                      {badgeCount}
                    </span>
                  )}
                </div>

                {!isCollapsed && (
                  <>
                    <span className="truncate">{item.name}</span>
                    {/* Badge next to item label if expanded */}
                    {hasBadge && (
                      <span className={`ml-auto px-2 py-0.5 text-[10px] font-black rounded-full ${
                        item.name === 'Orders' 
                          ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/80 dark:text-violet-300' 
                          : 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300'
                      }`}>
                        {badgeCount}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Profile and Settings Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3 mb-4 px-2 truncate">
            <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-bold flex items-center justify-center text-sm shadow-sm border border-violet-200/50 dark:border-violet-800/50 shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{user?.name}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 capitalize font-medium">{user?.role} Access</p>
              </div>
            )}
          </div>

          <div className={`flex ${isCollapsed ? 'flex-col gap-2' : 'gap-1.5'}`}>
            <button
              onClick={toggleDarkMode}
              className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center transition-all duration-200 cursor-pointer"
              title="Toggle Theme"
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
            </button>

            <button
              onClick={logout}
              className="flex-1 py-2 rounded-xl border border-rose-200/60 dark:border-rose-950/40 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 hover:text-rose-700 dark:text-rose-400 flex items-center justify-center gap-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer"
              title={isCollapsed ? 'Logout' : undefined}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
