import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Plus, 
  UserPlus, 
  ChevronLeft, 
  ChevronRight, 
  X,
  AlertOctagon,
  Eye,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [allergiesRegistry, setAllergiesRegistry] = useState([]);
  const [preferencesRegistry, setPreferencesRegistry] = useState([]);
  
  // Search, Pagination & Filters
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Customer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const { showToast } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/customers?search=${search}&status=${status}&page=${page}&limit=8&sort=${sortField}&order=${sortOrder}`);
      if (res.data.success) {
        setCustomers(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      showToast('Failed to load customers database.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistries = async () => {
    try {
      const [allergyRes, prefRes] = await Promise.all([
        api.get('/api/allergies'),
        api.get('/api/allergies/dietary')
      ]);
      if (allergyRes.data.success) setAllergiesRegistry(allergyRes.data.data);
      if (prefRes.data.success) setPreferencesRegistry(prefRes.data.data);
    } catch (err) {
      console.error('Failed to load registries:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, status, page, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  useEffect(() => {
    fetchRegistries();
  }, []);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/customers', {
        name,
        email,
        phone,
        address,
        dob,
        notes,
        allergies: selectedAllergies,
        preferences: selectedPreferences
      });
      if (res.data.success) {
        showToast('Customer profile created successfully!', 'success');
        setIsModalOpen(false);
        // Reset states
        setName('');
        setEmail('');
        setPhone('');
        setAddress('');
        setDob('');
        setNotes('');
        setSelectedAllergies([]);
        setSelectedPreferences([]);
        fetchCustomers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create customer profile.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAllergy = (id) => {
    setSelectedAllergies(prev => 
      prev.includes(id) ? prev.filter(aId => aId !== id) : [...prev, id]
    );
  };

  const togglePreference = (id) => {
    setSelectedPreferences(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Customer Directory</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage customer safety files, allergies, and bakery order histories.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-center"
        >
          <UserPlus className="w-4.5 h-4.5" />
          <span>Add Customer Profile</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-premium">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customers by name, email, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium overflow-hidden">
        {loading ? (
          <div className="p-16 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="p-16 text-center text-slate-400 dark:text-slate-500">
            🔍 No customers found in directory.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('name')}>
                    Customer {sortField === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('email')}>
                    Contact Info {sortField === 'email' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4">Linked Allergies</th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('status')}>
                    Status {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('created_at')}>
                    Created Date {sortField === 'created_at' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {customers.map((c) => (
                  <tr 
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-all cursor-pointer text-sm"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center text-xs">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{c.name}</p>
                          <p className="text-[10px] text-slate-400">{c.dob ? `DOB: ${c.dob}` : 'No DOB'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-700 dark:text-slate-300">{c.email || '—'}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">{c.phone || '—'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {c.allergies?.length === 0 ? (
                          <span className="text-[10px] text-slate-400 font-medium">None</span>
                        ) : (
                          c.allergies?.map((a, i) => (
                            <span 
                              key={i}
                              className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                                a.severity === 'critical'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                  : a.severity === 'high'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {a.allergy_name}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        c.status === 'active'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-900'
                          : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span className="capitalize">{c.status}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-xs">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => navigate(`/customers/${c.id}`)}
                        className="px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 flex items-center justify-center gap-1 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-lg transition-all mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View file</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Showing {customers.length} customer records
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-350 flex items-center">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              disabled={page === pagination.totalPages}
              onClick={() => setPage(prev => Math.min(prev + 1, pagination.totalPages))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal - Add Customer */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base leading-tight">Create Customer profile</h3>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Link allergy safety triggers and dietary preferences.</p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateCustomer} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Full Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="Jane Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-850 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      placeholder="jane.doe@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="555-0123"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Physical Address</label>
                  <input
                    type="text"
                    placeholder="123 Sweet Tooth Lane, Baker City"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                  />
                </div>

                {/* Select Allergies */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Link Allergies</label>
                  <div className="flex flex-wrap gap-2">
                    {allergiesRegistry.map((a) => (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => toggleAllergy(a.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold uppercase transition-all flex items-center gap-1.5 ${
                          selectedAllergies.includes(a.id)
                            ? 'bg-rose-50 border-rose-350 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-350'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        {a.allergy_name}
                        {selectedAllergies.includes(a.id) && <span className="text-[10px]">✕</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Select Dietary Preferences */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Link Dietary Preferences</label>
                  <div className="flex flex-wrap gap-2">
                    {preferencesRegistry.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => togglePreference(p.id)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          selectedPreferences.includes(p.id)
                            ? 'bg-violet-50 border-violet-300 text-violet-750 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        {p.preference_name}
                        {selectedPreferences.includes(p.id) && <span className="text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Allergy Safety & Kitchen Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Provide additional details regarding allergic triggers, severity overrides, or decoration restrictions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all resize-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/15 transition-all"
                  >
                    {submitting ? 'Creating profile...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomerList;
