import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';
import { 
  User, 
  ShieldAlert, 
  CheckSquare, 
  ShoppingBag, 
  Activity, 
  FileText,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Clock,
  AlertOctagon,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, showToast } = useAuth();
  
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [status, setStatus] = useState('active');
  const [notes, setNotes] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [allergiesRegistry, setAllergiesRegistry] = useState([]);
  const [preferencesRegistry, setPreferencesRegistry] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/customers/${id}`);
      if (res.data.success) {
        setCustomer(res.data.data);
        // Load into edit states
        setName(res.data.data.name);
        setEmail(res.data.data.email || '');
        setPhone(res.data.data.phone || '');
        setAddress(res.data.data.address || '');
        setDob(res.data.data.dob || '');
        setStatus(res.data.data.status || 'active');
        setNotes(res.data.data.notes || '');
        setSelectedAllergies(res.data.data.allergies.map(a => a.id));
        setSelectedPreferences(res.data.data.preferences.map(p => p.id));
      }
    } catch (err) {
      showToast('Failed to fetch customer profile details.', 'danger');
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
    fetchCustomerDetails();
    fetchRegistries();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.put(`/api/customers/${id}`, {
        name,
        email,
        phone,
        address,
        dob,
        notes,
        status,
        allergies: selectedAllergies,
        preferences: selectedPreferences
      });
      if (res.data.success) {
        showToast('Customer profile updated successfully.', 'success');
        setIsEditModalOpen(false);
        fetchCustomerDetails();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Update failed.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    try {
      const res = await api.delete(`/api/customers/${id}`);
      if (res.data.success) {
        showToast('Customer profile deleted successfully.', 'success');
        navigate('/customers');
      }
    } catch (err) {
      showToast('Failed to delete customer profile.', 'danger');
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-12" />
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="h-60 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  const tabs = [
    { id: 'profile', name: 'Profile Info', icon: User },
    { id: 'allergies', name: 'Allergies', icon: ShieldAlert },
    { id: 'dietary', name: 'Dietary Prefs', icon: CheckSquare },
    { id: 'orders', name: 'Order History', icon: ShoppingBag },
    { id: 'timeline', name: 'Activity Log', icon: Activity },
    { id: 'notes', name: 'Special Notes', icon: FileText }
  ];

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-350 dark:border-rose-900';
      case 'high': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-350 dark:border-amber-900';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-350 dark:border-blue-900';
      default: return 'bg-slate-100 text-slate-800 border-slate-250 dark:bg-slate-800 dark:text-slate-350';
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-5xl mx-auto">
      {/* Return button */}
      <button 
        onClick={() => navigate('/customers')}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Customer Directory</span>
      </button>

      {/* Profile Header Cards */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all duration-200">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-600 text-white font-bold flex items-center justify-center text-2xl shadow-lg shadow-violet-600/15">
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">{customer.name}</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                customer.status === 'active' 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-900' 
                  : 'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                <span className="capitalize">{customer.status}</span>
              </span>
              {customer.allergies?.length > 0 && (
                <span className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  ⚠️ {customer.allergies.length} Allergy Flag{customer.allergies.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Panel */}
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={handleDelete}
              className="px-3.5 py-2 border border-rose-200/50 hover:bg-rose-50 dark:border-rose-950 dark:hover:bg-rose-950/30 font-bold text-xs rounded-xl flex items-center gap-1.5 text-rose-600 hover:text-rose-700 dark:text-rose-450 transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-250 dark:border-slate-800 flex overflow-x-auto gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-4 text-xs font-bold transition-all flex items-center gap-2 border-b-2 shrink-0 ${
              activeTab === tab.id
                ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.name}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-premium min-h-80 transition-all">
        {/* Tab 1: Profile Info */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Contact & Profile Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Email Address</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{customer.email || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Phone Number</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{customer.phone || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Date of Birth</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{customer.dob || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Physical Address</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">{customer.address || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Profile Created</p>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">
                      {new Date(customer.created_at).toLocaleDateString()} at {new Date(customer.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Allergies */}
        {activeTab === 'allergies' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Customer Allergies safety registry</h3>
            {customer.allergies?.length === 0 ? (
              <p className="text-center text-slate-400 py-12 text-xs">🎉 No documented allergies linked to this profile.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customer.allergies?.map((allergy) => (
                  <div 
                    key={allergy.id}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/30 flex gap-3 items-start"
                  >
                    <ShieldAlert className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{allergy.allergy_name}</span>
                        <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border ${getSeverityColor(allergy.severity)}`}>
                          {allergy.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{allergy.description || 'No description provided.'}</p>
                      <div className="mt-3">
                        <span className="text-[9px] font-bold text-rose-600/70 dark:text-rose-450 uppercase tracking-wider block">Trigger Ingredients:</span>
                        <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5 italic">{allergy.trigger_ingredients || 'None specified'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Dietary Preferences */}
        {activeTab === 'dietary' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Dietary preferences mappings</h3>
            {customer.preferences?.length === 0 ? (
              <p className="text-center text-slate-400 py-12 text-xs">No dietary preferences registered for this profile.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {customer.preferences?.map((pref) => (
                  <div 
                    key={pref.id}
                    className="px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 text-center bg-violet-50/20 dark:bg-violet-950/10"
                  >
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{pref.preference_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Order History */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Past Dessert & Cake Orders</h3>
            {customer.orders?.length === 0 ? (
              <p className="text-center text-slate-400 py-12 text-xs">No orders recorded for this customer yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                      <th className="py-3">Order ID</th>
                      <th className="py-3">Product Name</th>
                      <th className="py-3">Ingredients</th>
                      <th className="py-3">Delivery Date</th>
                      <th className="py-3">Risk Level</th>
                      <th className="py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {customer.orders?.map((o) => (
                      <tr key={o.id} className="text-xs hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="py-4 font-bold text-slate-800 dark:text-slate-200">#{o.id}</td>
                        <td className="py-4 font-semibold text-slate-850 dark:text-slate-250">
                          {o.product_name}
                          <span className="text-[10px] text-slate-400 block mt-0.5">{o.category} • Qty {o.quantity}</span>
                        </td>
                        <td className="py-4 text-slate-500 max-w-xs truncate" title={o.ingredients}>
                          {o.ingredients}
                        </td>
                        <td className="py-4 text-slate-600 dark:text-slate-400">
                          {o.delivery_date ? new Date(o.delivery_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              o.risk_score >= 90 ? 'bg-rose-500' : o.risk_score >= 60 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`} />
                            <span className="font-bold">{o.risk_score}%</span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 capitalize">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Activity timeline */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Customer profile audit log</h3>
            {customer.activityTimeline?.length === 0 ? (
              <p className="text-center text-slate-400 py-12 text-xs font-semibold">No recent activity logged.</p>
            ) : (
              <div className="relative border-l border-slate-200 dark:border-slate-800 ml-3.5 space-y-6 py-2">
                {customer.activityTimeline?.map((log) => (
                  <div key={log.id} className="relative pl-7">
                    <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-violet-600 border-2 border-white dark:border-slate-900" />
                    <div>
                      <p className="text-xs font-bold text-slate-850 dark:text-slate-200">{log.action}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{log.details}</p>
                      <span className="text-[9px] text-slate-400 mt-1 block">
                        By {log.user_name} • {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Notes */}
        {activeTab === 'notes' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Internal Kitchen & Safety Notes</h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-150 dark:border-slate-800">
              <p className="text-xs text-slate-700 dark:text-slate-350 whitespace-pre-wrap leading-relaxed">
                {customer.notes || 'No notes compiled. Edit profile above to append safety restrictions or notes.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
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
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">Edit Customer Profile</h3>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Modify demographics, severity warnings, and diet plans.</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleUpdate} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Full Name *</label>
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
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
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Physical Address</label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                    />
                  </div>
                </div>

                {/* Link Allergies */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Link Allergies</label>
                  <div className="flex flex-wrap gap-2">
                    {allergiesRegistry.map((a) => (
                      <button
                        type="button"
                        key={a.id}
                        onClick={() => setSelectedAllergies(prev => 
                          prev.includes(a.id) ? prev.filter(id => id !== a.id) : [...prev, a.id]
                        )}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold uppercase transition-all flex items-center gap-1.5 ${
                          selectedAllergies.includes(a.id)
                            ? 'bg-rose-50 border-rose-350 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-350'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50'
                        }`}
                      >
                        {a.allergy_name}
                        {selectedAllergies.includes(a.id) && <span className="text-[10px]">✕</span>}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Link Dietary Preferences */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Link Dietary Preferences</label>
                  <div className="flex flex-wrap gap-2">
                    {preferencesRegistry.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setSelectedPreferences(prev => 
                          prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                        )}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all flex items-center gap-1.5 ${
                          selectedPreferences.includes(p.id)
                            ? 'bg-violet-50 border-violet-300 text-violet-750 dark:bg-violet-950/40 dark:border-violet-800 dark:text-violet-300'
                            : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 hover:bg-slate-50'
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
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all resize-none"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/15 transition-all"
                  >
                    {submitting ? 'Updating...' : 'Save Updates'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={executeDelete}
        title="Delete Customer Profile"
        message={`Are you absolutely sure you want to delete the profile of "${customer.name}"? This action is irreversible.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default CustomerDetail;
