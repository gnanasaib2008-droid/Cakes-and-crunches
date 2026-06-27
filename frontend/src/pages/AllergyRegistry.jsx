import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldAlert, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckSquare, 
  X,
  AlertOctagon,
  BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/ConfirmModal';

const AllergyRegistry = () => {
  const [allergies, setAllergies] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals & Forms State
  const [isAllergyModalOpen, setIsAllergyModalOpen] = useState(false);
  const [editingAllergyId, setEditingAllergyId] = useState(null);
  const [allergyName, setAllergyName] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [description, setDescription] = useState('');
  const [triggers, setTriggers] = useState('');

  const [isPrefModalOpen, setIsPrefModalOpen] = useState(false);
  const [editingPrefId, setEditingPrefId] = useState(null);
  const [prefName, setPrefName] = useState('');
  const [forbiddenIngredients, setForbiddenIngredients] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const { user, showToast } = useAuth();
  const isAdmin = user?.role === 'admin';

  const fetchData = async () => {
    setLoading(true);
    try {
      const [allergyRes, prefRes] = await Promise.all([
        api.get('/api/allergies'),
        api.get('/api/allergies/dietary')
      ]);
      if (allergyRes.data.success) setAllergies(allergyRes.data.data);
      if (prefRes.data.success) setPreferences(prefRes.data.data);
    } catch (err) {
      showToast('Failed to load safety registry parameters.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAllergySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAllergyId) {
        // Edit Allergy
        const res = await api.put(`/api/allergies/${editingAllergyId}`, {
          allergy_name: allergyName,
          severity,
          description,
          trigger_ingredients: triggers
        });
        if (res.data.success) {
          showToast('Allergy category updated successfully!', 'success');
        }
      } else {
        // Create Allergy
        const res = await api.post('/api/allergies', {
          allergy_name: allergyName,
          severity,
          description,
          trigger_ingredients: triggers
        });
        if (res.data.success) {
          showToast('New allergy category registered!', 'success');
        }
      }
      setIsAllergyModalOpen(false);
      resetAllergyForm();
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'danger');
    }
  };

  const handleEditAllergy = (allergy) => {
    setEditingAllergyId(allergy.id);
    setAllergyName(allergy.allergy_name);
    setSeverity(allergy.severity);
    setDescription(allergy.description || '');
    setTriggers(allergy.trigger_ingredients || '');
    setIsAllergyModalOpen(true);
  };

  const handleDeleteAllergy = (id, name) => {
    setDeleteTarget({ type: 'allergy', id, name });
    setIsDeleteModalOpen(true);
  };

  const resetAllergyForm = () => {
    setEditingAllergyId(null);
    setAllergyName('');
    setSeverity('medium');
    setDescription('');
    setTriggers('');
  };

  const handlePrefSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPrefId) {
        // Edit Dietary Preference
        const res = await api.put(`/api/allergies/dietary/${editingPrefId}`, {
          preference_name: prefName,
          forbidden_ingredients: forbiddenIngredients
        });
        if (res.data.success) {
          showToast('Dietary preference category updated!', 'success');
        }
      } else {
        // Create Dietary Preference
        const res = await api.post('/api/allergies/dietary', {
          preference_name: prefName,
          forbidden_ingredients: forbiddenIngredients
        });
        if (res.data.success) {
          showToast('New dietary preference category registered!', 'success');
        }
      }
      setIsPrefModalOpen(false);
      resetPrefForm();
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'danger');
    }
  };

  const handleEditPref = (pref) => {
    setEditingPrefId(pref.id);
    setPrefName(pref.preference_name);
    setForbiddenIngredients(pref.forbidden_ingredients || '');
    setIsPrefModalOpen(true);
  };

  const resetPrefForm = () => {
    setEditingPrefId(null);
    setPrefName('');
    setForbiddenIngredients('');
  };

  const handleDeletePref = (id, name) => {
    setDeleteTarget({ type: 'pref', id, name });
    setIsDeleteModalOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === 'allergy') {
        const res = await api.delete(`/api/allergies/${deleteTarget.id}`);
        if (res.data.success) {
          showToast('Allergy registry category removed.', 'success');
          fetchData();
        }
      } else if (deleteTarget.type === 'pref') {
        const res = await api.delete(`/api/allergies/dietary/${deleteTarget.id}`);
        if (res.data.success) {
          showToast('Dietary preference category removed.', 'success');
          fetchData();
        }
      }
    } catch (err) {
      showToast(`Failed to delete ${deleteTarget.type === 'allergy' ? 'allergy category' : 'dietary preference'}.`, 'danger');
    }
    setDeleteTarget(null);
  };

  const getSeverityBadgeColor = (sev) => {
    switch (sev.toLowerCase()) {
      case 'critical': return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900';
      case 'high': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-350 dark:border-blue-900';
      default: return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-850 dark:text-slate-350';
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-md w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Safety Parameter Registry</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Configure allergen triggers, severities, and target dietary standards for the AI safety scans.</p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button
              onClick={() => { resetAllergyForm(); setIsAllergyModalOpen(true); }}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 transition-all flex items-center gap-2 cursor-pointer self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Add Allergy Category</span>
            </button>
            <button
              onClick={() => setIsPrefModalOpen(true)}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-300 font-bold text-sm rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer self-start"
            >
              <Plus className="w-4 h-4" />
              <span>Add Diet Type</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Allergies vs Dietary Preferences */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Allergy Cards Registry */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Allergy Trigger Registry</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allergies.map((a) => (
              <div 
                key={a.id}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{a.allergy_name}</span>
                    <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getSeverityBadgeColor(a.severity)}`}>
                      {a.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal line-clamp-3">{a.description || 'No description logged.'}</p>
                  <div className="mt-4">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Triggers Match Array:</span>
                    <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-1 italic leading-normal">{a.trigger_ingredients || '—'}</p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex justify-end gap-1.5 mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      onClick={() => handleEditAllergy(a)}
                      className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-lg transition-all"
                      title="Edit Allergy"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteAllergy(a.id, a.allergy_name)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                      title="Delete Allergy"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Dietary Preferences */}
        <div className="space-y-4">
          <div className="p-4 border border-slate-205 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl flex items-center gap-3">
            <CheckSquare className="w-5 h-5 text-violet-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Dietary Preferences Types</span>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium space-y-3">
            {preferences.map((p) => (
              <div 
                key={p.id}
                className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col justify-between gap-3.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-200">{p.preference_name}</span>
                  </div>
                  <div className="mt-2.5">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Forbidden Ingredients:</span>
                    <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 mt-0.5 italic leading-normal">{p.forbidden_ingredients || '—'}</p>
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex justify-end gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                    <button
                      onClick={() => handleEditPref(p)}
                      className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-lg transition-all"
                      title="Edit Preference"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletePref(p.id, p.preference_name)}
                      className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-all"
                      title="Remove Preference"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal - Add/Edit Allergy */}
      <AnimatePresence>
        {isAllergyModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">
                  {editingAllergyId ? 'Edit Allergy Category' : 'Register New Allergy Category'}
                </h3>
                <button 
                  onClick={() => setIsAllergyModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-650"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAllergySubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Allergy Name *</label>
                    <input
                      required
                      type="text"
                      placeholder="Peanuts"
                      value={allergyName}
                      onChange={(e) => setAllergyName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Severity Warning Level *</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all cursor-pointer"
                    >
                      <option value="low">Low Risk</option>
                      <option value="medium">Medium Risk</option>
                      <option value="high">High Risk</option>
                      <option value="critical">Critical (Approval Required)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Trigger Ingredients *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Enter lowercased matched tokens separated by commas (e.g. peanut, arachis, peanut butter, monkeys nut)"
                    value={triggers}
                    onChange={(e) => setTriggers(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all resize-none"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    💡 The AI safety engine compares order recipe lists against this array to identify conflict matches.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Severity/Description Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Describe allergen warnings, medical symptoms, or processing precautions..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all resize-none"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAllergyModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/15 transition-all"
                  >
                    Save Category
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - Add/Edit Dietary Preference */}
      <AnimatePresence>
        {isPrefModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">
                  {editingPrefId ? 'Edit Diet Standard' : 'Register Diet Standard'}
                </h3>
                <button 
                  onClick={() => { setIsPrefModalOpen(false); resetPrefForm(); }}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handlePrefSubmit} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Diet/Preference Name *</label>
                  <input
                    required
                    type="text"
                    placeholder="Sugar-Free, Halal, Keto"
                    value={prefName}
                    onChange={(e) => setPrefName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Forbidden Ingredients</label>
                  <textarea
                    rows={2.5}
                    placeholder="Enter lowercased forbidden tokens separated by commas (e.g. potato, onion, garlic)"
                    value={forbiddenIngredients}
                    onChange={(e) => setForbiddenIngredients(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all resize-none"
                  />
                  <p className="text-[10px] text-slate-400 leading-normal">
                    💡 Comma-separated list of ingredients that violate this dietary preference.
                  </p>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setIsPrefModalOpen(false); resetPrefForm(); }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/15 transition-all"
                  >
                    Save Preference
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setDeleteTarget(null); }}
        onConfirm={executeDelete}
        title={deleteTarget?.type === 'allergy' ? 'Delete Allergy Category' : 'Delete Dietary Preference'}
        message={
          deleteTarget?.type === 'allergy' 
            ? `Are you sure you want to delete the allergy registry category "${deleteTarget.name}"? This will unlink it from all customer files.`
            : `Are you sure you want to delete the dietary preference "${deleteTarget?.name}"?`
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default AllergyRegistry;
