import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { 
  Users, 
  ShoppingBag, 
  AlertOctagon, 
  TrendingUp, 
  DollarSign,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area
} from 'recharts';
import { motion } from 'framer-motion';

// Chart color constants
const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'];

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [summaryRes, ordersRes] = await Promise.all([
        api.get('/api/dashboard/summary'),
        api.get('/api/orders?limit=100') // Fetch upcoming orders
      ]);

      if (summaryRes.data.success) {
        setData(summaryRes.data.data);
      }
      if (ordersRes.data.success) {
        setOrders(ordersRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleSocketUpdate = () => {
      fetchDashboardData();
    };

    socket.on('order_created', handleSocketUpdate);
    socket.on('order_updated', handleSocketUpdate);
    socket.on('order_deleted', handleSocketUpdate);

    return () => {
      socket.off('order_created', handleSocketUpdate);
      socket.off('order_updated', handleSocketUpdate);
      socket.off('order_deleted', handleSocketUpdate);
    };
  }, [socket]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        </div>
      </div>
    );
  }

  const { kpis, charts, recentAlerts } = data || {
    kpis: { totalCustomers: 0, activeCustomers: 0, highRiskCustomers: 0, todayOrders: 0, weeklyOrders: 0, allergyAlerts: 0, revenueSummary: 0 },
    charts: { allergyDistribution: [], dietaryStats: [], monthlyOrders: [], customerGrowth: [] },
    recentAlerts: []
  };

  const cardItems = [
    { title: 'Total Customers', value: kpis.totalCustomers, desc: 'Registered in database', icon: Users, color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/40' },
    { title: 'Active Profiles', value: kpis.activeCustomers, desc: 'Currently active status', icon: Users, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40' },
    { title: 'High Allergy Risks', value: kpis.highRiskCustomers, desc: 'Critical/High severity allergy mappings', icon: ShieldAlert, color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40' },
    { title: 'Open Alerts', value: kpis.allergyAlerts, desc: 'Unread engine conflict logs', icon: AlertOctagon, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40' },
    { title: "Today's Orders", value: kpis.todayOrders, desc: 'Dessert orders today', icon: ShoppingBag, color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40' },
    { title: 'Weekly Orders', value: kpis.weeklyOrders, desc: 'Orders in last 7 days', icon: TrendingUp, color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40' },
    { title: 'Est. Revenue', value: `$${kpis.revenueSummary.toLocaleString()}`, desc: 'Sales summary (orders non-cancelled)', icon: DollarSign, color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40' },
  ];

  // --- Generate 7-Day Safety Schedule Calendar Strip ---
  const generateSafetyCalendar = () => {
    const calendarDays = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD

      // Filter orders scheduled for delivery on this day
      const dayOrders = orders.filter(o => o.delivery_date === dateStr);
      const criticalCount = dayOrders.filter(o => o.risk_score >= 90).length;
      const warningCount = dayOrders.filter(o => o.risk_score >= 30 && o.risk_score < 90).length;
      const totalCount = dayOrders.length;

      let statusType = 'empty'; // 'empty', 'safe', 'warning', 'critical'
      if (criticalCount > 0) statusType = 'critical';
      else if (warningCount > 0) statusType = 'warning';
      else if (totalCount > 0) statusType = 'safe';

      calendarDays.push({
        dateStr,
        dayName: weekdays[d.getDay()],
        dateNum: d.getDate(),
        monthName: months[d.getMonth()],
        totalCount,
        criticalCount,
        warningCount,
        statusType
      });
    }
    return calendarDays;
  };

  const calendarDays = generateSafetyCalendar();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Cakes & Crunches Dashboard</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Real-time allergy alerts, order safety, and dietary stats.</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        {cardItems.map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 shadow-premium flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{item.title}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">{item.value}</p>
              <p className="text-[10px] text-slate-450 mt-1 truncate">{item.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Safety Schedule Calendar Widget */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-violet-600" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Kitchen Safety Schedule Calendar</h3>
        </div>
        <p className="text-xs text-slate-550 dark:text-slate-400 max-w-2xl leading-relaxed">
          Bakers: Check tomorrow's cross-contamination risks before preparing baking sheets. **Red Days** indicate critical allergen recipes (peanuts, tree nuts).
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-7 gap-3.5 mt-4">
          {calendarDays.map((day, idx) => {
            let tileBg = 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400';
            let statusBadge = (
              <span className="inline-flex items-center gap-1 text-[9px] text-slate-450 font-bold uppercase mt-2">
                <CheckCircle2 className="w-3 h-3 text-slate-400" /> No Orders
              </span>
            );

            if (day.statusType === 'critical') {
              tileBg = 'bg-rose-50/60 border-rose-300 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-350 shadow-glow-rose ring-1 ring-rose-450/20';
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[9px] text-rose-700 font-extrabold uppercase mt-2 animate-pulse">
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-600" /> Hazard Bake
                </span>
              );
            } else if (day.statusType === 'warning') {
              tileBg = 'bg-amber-50/60 border-amber-300 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300 shadow-glow-amber';
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[9px] text-amber-700 font-bold uppercase mt-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Alert Match
                </span>
              );
            } else if (day.statusType === 'safe') {
              tileBg = 'bg-emerald-50/60 border-emerald-300 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300';
              statusBadge = (
                <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 font-bold uppercase mt-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Clear Run
                </span>
              );
            }

            return (
              <div 
                key={idx}
                className={`p-4 rounded-2xl border flex flex-col items-center justify-between text-center transition-all ${tileBg}`}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{day.dayName}</span>
                  <p className="text-2xl font-extrabold tracking-tight mt-1">{day.dateNum}</p>
                  <span className="text-[10px] font-bold text-slate-400">{day.monthName}</span>
                </div>

                <div className="mt-3 flex flex-col items-center">
                  <span className="text-[10px] font-bold text-slate-650 dark:text-slate-350">{day.totalCount} Order{day.totalCount === 1 ? '' : 's'}</span>
                  {statusBadge}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Allergy Distribution Pie */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-premium flex flex-col h-96">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-wider">Top Allergy Distribution</h3>
          <div className="flex-1">
            {charts.allergyDistribution.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No allergy data registered yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.allergyDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {charts.allergyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Dietary Preferences Trends */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-premium flex flex-col h-96">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-wider">Dietary Preferences Demographics</h3>
          <div className="flex-1">
            {charts.dietaryStats.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No dietary preferences linked yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.dietaryStats}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.4)' }} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 3: Monthly Orders Area */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-premium flex flex-col h-96">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-wider">Monthly Order Analytics</h3>
          <div className="flex-1">
            {charts.monthlyOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No orders recorded in previous months.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={charts.monthlyOrders}>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" fillOpacity={0.15} fill="url(#colorUv)" strokeWidth={2.5} />
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 4: Customer Registration growth */}
        <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-premium flex flex-col h-96">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6 uppercase tracking-wider">Customer Registry Growth</h3>
          <div className="flex-1">
            {charts.customerGrowth.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">No customers registered in recent months.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.customerGrowth}>
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="count" fill="#10b981" radius={[8, 8, 0, 0]} barSize={35} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Bottom recent warnings log */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4 uppercase tracking-wider">Active Allergy engine Alerts</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {recentAlerts.length === 0 ? (
            <p className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">🎉 Safety is clear. No active allergy conflict alerts.</p>
          ) : (
            recentAlerts.map((alert) => (
              <div key={alert.id} className="py-3.5 flex items-start justify-between gap-4">
                <div className="flex gap-3 items-start">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                    alert.severity === 'critical' 
                      ? 'bg-rose-500 animate-ping' 
                      : alert.severity === 'warning' 
                      ? 'bg-amber-500' 
                      : 'bg-sky-500'
                  }`} />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-205">
                      {alert.customer_name} • Order: {alert.product_name || 'N/A'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">{alert.message}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                    alert.severity === 'critical' 
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' 
                      : alert.severity === 'warning'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-305'
                      : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                  }`}>
                    {alert.severity}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-2">{new Date(alert.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
