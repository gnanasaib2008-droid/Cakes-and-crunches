import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Users, 
  ShieldAlert, 
  CheckSquare, 
  ShoppingBag,
  History,
  Calendar,
  ChevronDown,
  ArrowUpDown
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import html2pdf from 'html2pdf.js';

const Reports = () => {
  const [reportType, setReportType] = useState('customers'); // 'customers', 'allergies', 'dietary', 'orders', 'risk'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useAuth();

  // Date filters & sorting states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');

  const renderSortHeader = (label, field) => {
    const isSorted = sortField === field;
    return (
      <th 
        onClick={() => handleSort(field)} 
        className="px-4 py-3 cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors"
      >
        <div className="flex items-center gap-1">
          <span>{label}</span>
          <ArrowUpDown className={`w-3 h-3 transition-opacity ${isSorted ? 'text-violet-600 dark:text-violet-400 opacity-100' : 'text-slate-400 opacity-40'}`} />
        </div>
      </th>
    );
  };

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/reports/summary?type=${reportType}&start_date=${startDate}&end_date=${endDate}&sort=${sortField}&order=${sortOrder}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      showToast('Failed to compile report table data.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [reportType, startDate, endDate, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handlePrint = () => {
    const element = document.getElementById('report-sheet-doc');
    const opt = {
      margin:       12,
      filename:     `executive_report_${reportType}_${Date.now()}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };
    html2pdf().from(element).set(opt).save();
    showToast('Generating report PDF document export...', 'success');
  };

  const handleExportCSV = () => {
    const url = `/api/reports/export/${reportType}?start_date=${startDate}&end_date=${endDate}&sort=${sortField}&order=${sortOrder}`;
    window.open(url, '_blank');
    showToast(`Downloading CSV export for ${reportType} report.`, 'success');
  };

  const renderCharts = () => {
    if (data.length === 0) return null;

    if (reportType === 'customers') {
      const activeCount = data.filter(c => c.status === 'active').length;
      const inactiveCount = data.filter(c => c.status !== 'active').length;
      const chartData = [
        { name: 'Active Profiles', value: activeCount, color: '#10b981' },
        { name: 'Inactive Profiles', value: inactiveCount, color: '#94a3b8' }
      ];

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-slate-50 dark:bg-slate-950/20 p-6 border border-slate-200 dark:border-slate-800 rounded-3xl mb-6 print:hidden">
          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350">Status Distribution</h4>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Breakdown of customer account active ratios.</p>
          </div>
          <div className="h-44 w-full flex justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} customers`, 'Count']} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (reportType === 'orders') {
      const safeCount = data.filter(o => o.risk_score < 30).length;
      const warningCount = data.filter(o => o.risk_score >= 30 && o.risk_score < 90).length;
      const criticalCount = data.filter(o => o.risk_score >= 90).length;

      const chartData = [
        { name: 'Safe (0-30%)', count: safeCount, fill: '#10b981' },
        { name: 'Warning (30-90%)', count: warningCount, fill: '#f59e0b' },
        { name: 'Critical (90%+)', count: criticalCount, fill: '#ef4444' }
      ];

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-slate-50 dark:bg-slate-950/20 p-6 border border-slate-200 dark:border-slate-800 rounded-3xl mb-6 print:hidden">
          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350">Allergy Risk Audit Breakdown</h4>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Histogram grouping recipe orders by risk metrics.</p>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip formatter={(value) => [`${value} orders`, 'Count']} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (reportType === 'risk') {
      const createCount = data.filter(r => r.action === 'ORDER_CREATE').length;
      const approveCount = data.filter(r => r.action === 'ORDER_APPROVE_OVERRIDE').length;
      const otherCount = data.filter(r => r.action !== 'ORDER_CREATE' && r.action !== 'ORDER_APPROVE_OVERRIDE').length;

      const chartData = [
        { name: 'Create Order', count: createCount, fill: '#8b5cf6' },
        { name: 'Approve Override', count: approveCount, fill: '#10b981' },
        { name: 'Other logs', count: otherCount, fill: '#6366f1' }
      ];

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center bg-slate-50 dark:bg-slate-950/20 p-6 border border-slate-200 dark:border-slate-800 rounded-3xl mb-6 print:hidden">
          <div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-350">Safety Overrides Audit</h4>
            <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">Frequency analysis of safety override actions.</p>
          </div>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip formatter={(value) => [`${value} occurrences`, 'Count']} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    return null;
  };

  const reportOptions = [
    { id: 'customers', name: 'Customer Profiles', icon: Users, desc: 'Registered customer demographics and active mapping summaries.' },
    { id: 'allergies', name: 'Allergies Registry', icon: ShieldAlert, desc: 'Registered allergy triggers and customer frequencies.' },
    { id: 'dietary', name: 'Dietary Preferences', icon: CheckSquare, desc: 'Popularity and trends of diet restrictions (Vegan, Jain, etc.).' },
    { id: 'orders', name: 'Order Logs', icon: ShoppingBag, desc: 'Complete historical logs of products, ingredients, and risk scores.' },
    { id: 'risk', name: 'Safety Overrides & Risk Logs', icon: History, desc: 'Audited log histories of critical overrides, allergy triggers, and edits.' },
  ];

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto print:p-0 transition-colors duration-200">
      
      {/* Hide during browser print */}
      <div className="print:hidden space-y-6">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Executive Report Center</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Generate, audit, print, and export safety logs and bakery data sheets.</p>
        </div>

        {/* Report Tabs Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
          {reportOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => { setReportType(opt.id); setSortField('id'); setSortOrder('desc'); }}
              className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-32 transition-all hover:-translate-y-0.5 cursor-pointer ${
                reportType === opt.id
                  ? 'bg-violet-50 border-violet-300 text-violet-700 dark:bg-violet-950/40 dark:border-violet-850 dark:text-violet-300 shadow-md'
                  : 'bg-white border-slate-205 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800/80 shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0">
                <opt.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold truncate">{opt.name}</p>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 line-clamp-2 leading-tight font-medium">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Date Filters & Action Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm">
          {/* Date Range Inputs */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-450" />
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Filters</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-450 uppercase font-bold">Start:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs text-slate-805 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-455 uppercase font-bold">End:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-xs text-slate-805 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500/25 transition-all"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex gap-2 self-end md:self-auto">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV Sheet</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Report PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Report Sheet Layout */}
      <div id="report-sheet-doc" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-premium overflow-hidden p-6 print:border-0 print:shadow-none">
        
        {/* Document Header for Printing */}
        <div className="mb-6 flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {reportType.toUpperCase()} STATEMENT SHEET
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Cakes & Crunches Bakery Allergy Profile System</p>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Generated Date</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">{new Date().toLocaleString()}</span>
          </div>
        </div>

        {!loading && renderCharts()}

        {loading ? (
          <div className="p-16 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            No report data found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Render table based on reportType */}
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-950/40 text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">
                  {reportType === 'customers' && (
                    <>
                      {renderSortHeader('ID', 'id')}
                      {renderSortHeader('Customer Name', 'name')}
                      {renderSortHeader('Email Address', 'email')}
                      {renderSortHeader('Phone', 'phone')}
                      {renderSortHeader('Allergy Flags', 'allergy_count')}
                      {renderSortHeader('Diet Preferences', 'preference_count')}
                      {renderSortHeader('Status', 'status')}
                    </>
                  )}
                  {reportType === 'allergies' && (
                    <>
                      {renderSortHeader('ID', 'id')}
                      {renderSortHeader('Allergy Name', 'allergy_name')}
                      {renderSortHeader('Severity Level', 'severity')}
                      <th className="px-4 py-3">Active Triggers</th>
                      {renderSortHeader('Customers Mapped', 'customer_count')}
                    </>
                  )}
                  {reportType === 'dietary' && (
                    <>
                      {renderSortHeader('Preference ID', 'id')}
                      {renderSortHeader('Preference Name', 'preference_name')}
                      {renderSortHeader('Customers Mapped', 'customer_count')}
                    </>
                  )}
                  {reportType === 'orders' && (
                    <>
                      {renderSortHeader('Order ID', 'id')}
                      {renderSortHeader('Customer', 'customer_name')}
                      {renderSortHeader('Product Name', 'product_name')}
                      <th className="px-4 py-3">Ingredients</th>
                      {renderSortHeader('Qty', 'quantity')}
                      {renderSortHeader('Target Delivery', 'delivery_date')}
                      {renderSortHeader('Safety Risk Score', 'risk_score')}
                      {renderSortHeader('Status', 'status')}
                    </>
                  )}
                  {reportType === 'risk' && (
                    <>
                      {renderSortHeader('Audit ID', 'id')}
                      {renderSortHeader('Triggered By', 'user_name')}
                      {renderSortHeader('Action Type', 'action')}
                      <th className="px-4 py-3">Details</th>
                      {renderSortHeader('Timestamp', 'created_at')}
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    {reportType === 'customers' && (
                      <>
                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">#{row.id}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-850 dark:text-slate-250">{row.name}</td>
                        <td className="px-4 py-3.5 text-slate-500">{row.email || '—'}</td>
                        <td className="px-4 py-3.5 text-slate-500">{row.phone || '—'}</td>
                        <td className="px-4 py-3.5 font-bold text-rose-600">{row.allergy_count}</td>
                        <td className="px-4 py-3.5 font-bold text-violet-600">{row.preference_count}</td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border capitalize ${
                            row.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-650'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </>
                    )}
                    {reportType === 'allergies' && (
                      <>
                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">#{row.id}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-850 dark:text-slate-250">{row.allergy_name}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                            row.severity === 'critical' ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {row.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate" title={row.trigger_ingredients}>
                          {row.trigger_ingredients}
                        </td>
                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-205">{row.customer_count}</td>
                      </>
                    )}
                    {reportType === 'dietary' && (
                      <>
                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-205">#{row.id}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{row.preference_name}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-205">{row.customer_count}</td>
                      </>
                    )}
                    {reportType === 'orders' && (
                      <>
                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-202">#{row.id}</td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800 dark:text-slate-200">{row.customer_name}</td>
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-300">{row.product_name}</td>
                        <td className="px-4 py-3.5 text-slate-500 max-w-xs truncate" title={row.ingredients}>{row.ingredients}</td>
                        <td className="px-4 py-3.5 text-slate-500">{row.quantity}</td>
                        <td className="px-4 py-3.5 text-slate-550">{row.delivery_date ? new Date(row.delivery_date).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-250">
                          {row.risk_score}% {row.approved_by_admin ? ' (Approved)' : ''}
                        </td>
                        <td className="px-4 py-3.5 capitalize text-slate-650">{row.status}</td>
                      </>
                    )}
                    {reportType === 'risk' && (
                      <>
                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">#{row.id}</td>
                        <td className="px-4 py-3.5 text-slate-700 dark:text-slate-350">{row.user_name}</td>
                        <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-250">{row.action}</td>
                        <td className="px-4 py-3.5 text-slate-500 leading-normal">{row.details}</td>
                        <td className="px-4 py-3.5 text-slate-500">{new Date(row.created_at).toLocaleString()}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
