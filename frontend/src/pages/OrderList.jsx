import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Check,
  Hammer,
  Play,
  CheckCircle,
  Truck,
  Eye,
  Clock,
  Edit2,
  Trash2,
  ChevronDown,
  FileText,
  FileUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import ConfirmModal from '../components/ConfirmModal';
import { generateInvoicePDF } from '../utils/invoiceGenerator';

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Search, Pagination & Filters
  const [search, setSearch] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Sorting
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc');

  // New Order Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerFile, setSelectedCustomerFile] = useState(null);
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Cake');
  const [ingredientsText, setIngredientsText] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // --- AI Recipe Parsing State ---
  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  // --- Pricing & Editing State ---
  const [unitPrice, setUnitPrice] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);

  // --- Deletion State ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);

  // --- Baker Signature Sign-Off State ---
  const [isBakerSigModalOpen, setIsBakerSigModalOpen] = useState(false);
  const [sigOrderId, setSigOrderId] = useState(null);
  const [sigStatus, setSigStatus] = useState('');
  const [bakerName, setBakerName] = useState('');

  // --- Collapsible Rows & Checklists ---
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());
  const [checklists, setChecklists] = useState({});

  // --- Photo Mockup & Annotations ---
  const [mockupImageSrc, setMockupImageSrc] = useState('');
  const [pins, setPins] = useState([]);
  const [tempPin, setTempPin] = useState(null);
  const [pinDesc, setPinDesc] = useState('');

  // --- Premium UI States ---
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  
  // 2D Cake Builder States
  const [cakeShape, setCakeShape] = useState('round');
  const [cakeTiers, setCakeTiers] = useState(1);
  const [cakeColor, setCakeColor] = useState('#f472b6'); // Pink default
  const [activeToppings, setActiveToppings] = useState({
    peanuts: false,
    strawberries: false,
    chocolate: false,
    milk: false,
    walnuts: false,
    gelatin: false,
    egg: false,
    flour: false
  });

  // Real-time engine warning stats
  const [engineReport, setEngineReport] = useState({
    score: 0,
    level: 'none',
    allergies: [],
    dietary: [],
    explanation: 'No safety issues detected.'
  });

  const { user, showToast } = useAuth();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setSearch(searchTerm);
      setPage(1);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/orders?search=${search}&status=${status}&page=${page}&limit=8&sort=${sortField}&order=${sortOrder}`);
      if (res.data.success) {
        setOrders(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (err) {
      showToast('Failed to load orders database.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllCustomersForDropdown = async () => {
    try {
      const res = await api.get('/api/customers?limit=100');
      if (res.data.success) {
        setCustomers(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [search, status, page, sortField, sortOrder]);

  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;
    
    const handleSocketUpdate = () => {
      fetchOrders();
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
    fetchAllCustomersForDropdown();
  }, []);

  // Fetch full customer allergy profiles on dropdown select
  useEffect(() => {
    if (!selectedCustomerId) {
      setSelectedCustomerFile(null);
      setTags([]);
      resetCakeBuilder();
      return;
    }
    const fetchFile = async () => {
      try {
        const res = await api.get(`/api/customers/${selectedCustomerId}`);
        if (res.data.success) {
          setSelectedCustomerFile(res.data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchFile();
  }, [selectedCustomerId]);

  const resetCakeBuilder = () => {
    setCakeShape('round');
    setCakeTiers(1);
    setCakeColor('#f472b6');
    setActiveToppings({
      peanuts: false,
      strawberries: false,
      chocolate: false,
      milk: false,
      walnuts: false,
      gelatin: false,
      egg: false,
      flour: false
    });
  };

  // Sync tags array into raw ingredients comma text
  useEffect(() => {
    setIngredientsText(tags.join(', '));
  }, [tags]);

  // Run Real-Time Client-Side Allergy Detection Engine
  useEffect(() => {
    if (!selectedCustomerFile || tags.length === 0) {
      setEngineReport({
        score: 0,
        level: 'none',
        allergies: [],
        dietary: [],
        explanation: 'No safety issues detected.'
      });
      return;
    }

    const allergyConflicts = [];
    const dietaryViolations = [];
    let maxAllergyScore = 0;
    let hasCriticalAllergy = false;

    // Check allergies
    for (const allergy of selectedCustomerFile.allergies) {
      const triggers = (allergy.trigger_ingredients || '')
        .toLowerCase()
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const matched = [];
      for (const tag of tags) {
        const normTag = tag.toLowerCase().trim();
        for (const trig of triggers) {
          if (normTag.includes(trig) || trig.includes(normTag)) {
            if (!matched.includes(trig)) matched.push(trig);
          }
        }
      }

      if (matched.length > 0) {
        let score = 0;
        switch (allergy.severity.toLowerCase()) {
          case 'critical': score = 95; hasCriticalAllergy = true; break;
          case 'high': score = 80; break;
          case 'medium': score = 50; break;
          case 'low': score = 20; break;
        }
        maxAllergyScore = Math.max(maxAllergyScore, score);
        allergyConflicts.push({ name: allergy.allergy_name, severity: allergy.severity, matched });
      }
    }

    // Check dietary
    let prefPoints = 0;
    for (const pref of selectedCustomerFile.preferences) {
      const forbiddenList = (pref.forbidden_ingredients || '')
        .toLowerCase()
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);

      if (forbiddenList.length > 0) {
        const violated = [];
        for (const tag of tags) {
          const normTag = tag.toLowerCase().trim();
          for (const forb of forbiddenList) {
            if (normTag.includes(forb) || forb.includes(normTag)) {
              if (!violated.includes(normTag)) violated.push(normTag);
            }
          }
        }
        if (violated.length > 0) {
          prefPoints += 20;
          dietaryViolations.push({ name: pref.preference_name, violated });
        }
      }
    }

    let score = Math.max(maxAllergyScore, prefPoints);
    if (hasCriticalAllergy) score = Math.max(score, 95);
    score = Math.min(score, 100);

    let level = 'none';
    if (score >= 90) level = 'critical';
    else if (score >= 60) level = 'high';
    else if (score >= 30) level = 'medium';
    else if (score > 0) level = 'low';

    let explanation = '';
    if (allergyConflicts.length > 0) {
      explanation += `🚨 Allergy matches: ${allergyConflicts.map(a => `${a.name} (${a.severity})`).join(', ')}. `;
    }
    if (dietaryViolations.length > 0) {
      explanation += `⚠️ Preference violations: ${dietaryViolations.map(d => `${d.name} by "${d.violated.join(', ')}"`).join(', ')}. `;
    }
    if (!explanation) explanation = 'All ingredients clear. Safe to bake.';

    setEngineReport({
      score,
      level,
      allergies: allergyConflicts,
      dietary: dietaryViolations,
      explanation
    });

  }, [tags, selectedCustomerFile]);

  // Handle addition of tags/pills
  const addTag = (text) => {
    const trimmed = text.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const removeTag = (indexToRemove) => {
    setTags(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  // Sync Topping selection from 2D Builder into Tags List
  const handleToppingToggle = (toppingKey, ingredientWord) => {
    const isNowActive = !activeToppings[toppingKey];
    setActiveToppings(prev => ({ ...prev, [toppingKey]: isNowActive }));

    if (isNowActive) {
      addTag(ingredientWord);
    } else {
      setTags(prev => prev.filter(t => t.toLowerCase() !== ingredientWord.toLowerCase()));
    }
  };

  // Check tag diagnostic class for coloring
  const getTagColorClass = (tag) => {
    if (!selectedCustomerFile) return 'bg-slate-100 border-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700';
    const normTag = tag.toLowerCase().trim();

    // Check Allergen
    for (const allergy of selectedCustomerFile.allergies) {
      const triggers = (allergy.trigger_ingredients || '')
        .toLowerCase()
        .split(',')
        .map(t => t.trim());
      if (triggers.some(t => normTag.includes(t) || t.includes(normTag))) {
        return 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300 shadow-glow-rose';
      }
    }

    // Check Dietary Preference Violation
    for (const pref of selectedCustomerFile.preferences) {
      const forbiddenList = (pref.forbidden_ingredients || '')
        .toLowerCase()
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);
      if (forbiddenList.length > 0 && forbiddenList.some(f => normTag.includes(f) || f.includes(normTag))) {
        return 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-300 shadow-glow-amber';
      }
    }

    return 'bg-violet-50 border-violet-250 text-violet-800 dark:bg-violet-950/20 dark:text-violet-300 dark:border-violet-850';
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if (tags.length === 0) {
      showToast('Please specify ingredients for the cake order.', 'warning');
      return;
    }
    setSubmitting(true);

    try {
      let finalNotes = notes;
      if (mockupImageSrc) {
        const metadata = {
          mockupImage: mockupImageSrc,
          pins: pins
        };
        finalNotes = notes + `\n\n__MOCKUP_METADATA__:${JSON.stringify(metadata)}`;
      }

      const payload = {
        customer_id: selectedCustomerId,
        product_name: productName,
        category,
        ingredients: ingredientsText,
        quantity,
        delivery_date: deliveryDate,
        notes: finalNotes,
        unit_price: parseFloat(unitPrice) || 0
      };

      let res;
      if (editingOrder) {
        res = await api.put(`/api/orders/${editingOrder.id}`, payload);
      } else {
        res = await api.post('/api/orders', payload);
      }

      if (res.data.success) {
        const report = res.data.safetyReport;
        if (editingOrder) {
          if (report?.requiresApproval) {
            showToast('🚨 Order updated but blocked. Requires Admin approval override!', 'warning');
          } else {
            showToast('Order updated successfully!', 'success');
          }
        } else {
          if (report?.requiresApproval) {
            showToast('🚨 Order placed but blocked. Requires Admin approval override!', 'warning');
          } else {
            showToast('Order registered successfully!', 'success');
          }
        }
        setIsModalOpen(false);
        resetForm();
        fetchOrders();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save order.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (orderId) => {
    try {
      const res = await api.put(`/api/orders/${orderId}/approve`);
      if (res.data.success) {
        showToast(`Order #${orderId} has been approved for baking!`, 'success');
        fetchOrders();
      }
    } catch (err) {
      showToast('Failed to approve order.', 'danger');
    }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    if (newStatus === 'completed' || newStatus === 'delivered') {
      const checklist = checklists[orderId] || {};
      const allChecked = checklist.sanit && checklist.tools && checklist.hands && checklist.ingred;
      if (!allChecked) {
        showToast('⚠️ Blocked: All 4 sanitation checklist items must be verified before completing/delivering order.', 'warning');
        return;
      }
    }

    try {
      const res = await api.put(`/api/orders/${orderId}/status`, { status: newStatus });
      if (res.data.success) {
        showToast(`Order status updated to ${newStatus}.`, 'success');
        
        const orderObj = orders.find(o => o.id === orderId);
        if (orderObj) {
          showToast(`📱 SMS status notification sent to ${orderObj.customer_name}!`, 'success');
        }
        fetchOrders();
      }
    } catch (err) {
      if (err.response?.data?.requiresBakerSignature) {
        setSigOrderId(orderId);
        setSigStatus(newStatus);
        setIsBakerSigModalOpen(true);
      } else {
        showToast(err.response?.data?.message || 'Failed to update order status.', 'danger');
      }
    }
  };

  const submitBakerSignature = async (e) => {
    e.preventDefault();
    if (!bakerName.trim()) return;
    try {
      const res = await api.put(`/api/orders/${sigOrderId}/status`, {
        status: sigStatus,
        baker_signature: bakerName.trim()
      });
      if (res.data.success) {
        showToast(`Order status updated to ${sigStatus} with Baker Signature!`, 'success');
        setIsBakerSigModalOpen(false);
        setBakerName('');
        setSigOrderId(null);
        setSigStatus('');
        fetchOrders();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to sign off order.', 'danger');
    }
  };

  const handleEditClick = (o) => {
    setEditingOrder(o);
    setSelectedCustomerId(o.customer_id);
    setProductName(o.product_name);
    setCategory(o.category || 'Cake');
    const ingTags = o.ingredients ? o.ingredients.split(',').map(t => t.trim()).filter(Boolean) : [];
    setTags(ingTags);
    setQuantity(o.quantity || 1);
    setDeliveryDate(o.delivery_date ? o.delivery_date.split('T')[0] : '');
    setUnitPrice(o.unit_price || '');
    
    const meta = parseMockupMetadata(o.notes);
    if (meta) {
      setNotes(meta.notes || '');
      setMockupImageSrc(meta.mockupImage || '');
      setPins(meta.pins || []);
    } else {
      setNotes(o.notes || '');
      setMockupImageSrc('');
      setPins([]);
    }
    setTempPin(null);

    const active = {
      peanuts: ingTags.some(t => t.toLowerCase().includes('peanut')),
      strawberries: ingTags.some(t => t.toLowerCase().includes('strawberry')),
      chocolate: ingTags.some(t => t.toLowerCase().includes('chocolate')),
      milk: ingTags.some(t => t.toLowerCase().includes('milk')),
      walnuts: ingTags.some(t => t.toLowerCase().includes('walnut')),
      gelatin: ingTags.some(t => t.toLowerCase().includes('gelatin')),
      egg: ingTags.some(t => t.toLowerCase().includes('egg')),
      flour: ingTags.some(t => t.toLowerCase().includes('flour'))
    };
    setActiveToppings(active);
    
    setIsModalOpen(true);
  };

  const executeDeleteOrder = async () => {
    if (!orderToDeleteId) return;
    try {
      const res = await api.delete(`/api/orders/${orderToDeleteId}`);
      if (res.data.success) {
        showToast('Order deleted successfully.', 'success');
        fetchOrders();
      }
    } catch (err) {
      showToast('Failed to delete order.', 'danger');
    }
  };

  const handleAIParse = async () => {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    try {
      const res = await api.post('/api/ai/parse-ingredients', { text: aiDescription });
      if (res.data.success) {
        const extracted = res.data.ingredients
          .split(',')
          .map(i => i.trim())
          .filter(Boolean);
        
        if (extracted.length > 0) {
          setTags(prev => {
            const next = [...prev];
            extracted.forEach(item => {
              if (!next.includes(item)) next.push(item);
            });
            return next;
          });
          showToast(`AI successfully extracted ${extracted.length} ingredients!`, 'success');
        } else {
          showToast('AI could not find any ingredients in description.', 'warning');
        }
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'AI parsing failed.', 'danger');
    } finally {
      setAiLoading(false);
    }
  };

  const resetForm = () => {
    setEditingOrder(null);
    setSelectedCustomerId('');
    setProductName('');
    setCategory('Cake');
    setTags([]);
    setIngredientsText('');
    setQuantity(1);
    setDeliveryDate('');
    setNotes('');
    setUnitPrice('');
    setMockupImageSrc('');
    setPins([]);
    setTempPin(null);
    setPinDesc('');
    setAiDescription('');
    resetCakeBuilder();
  };

  const toggleExpandOrder = (id) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMockupUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setMockupImageSrc(reader.result);
      setPins([]);
      setTempPin(null);
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTempPin({ x, y });
    setPinDesc('');
  };

  const savePin = () => {
    if (!tempPin || !pinDesc.trim()) return;
    setPins(prev => [...prev, { x: tempPin.x, y: tempPin.y, desc: pinDesc.trim() }]);
    setTempPin(null);
    setPinDesc('');
  };

  const parseMockupMetadata = (notesStr) => {
    if (!notesStr) return null;
    const marker = '\n\n__MOCKUP_METADATA__:';
    const index = notesStr.indexOf(marker);
    if (index === -1) return null;
    
    try {
      const jsonStr = notesStr.substring(index + marker.length);
      const mainNotes = notesStr.substring(0, index);
      const data = JSON.parse(jsonStr);
      return {
        notes: mainNotes,
        mockupImage: data.mockupImage,
        pins: data.pins
      };
    } catch (err) {
      console.error('Failed to parse mockup metadata', err);
      return null;
    }
  };

  const renderPinsOverlay = (order) => {
    const meta = parseMockupMetadata(order.notes);
    if (!meta || !meta.mockupImage) return null;

    return (
      <div className="space-y-3 mt-3">
        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mockup Design & Annotations (Hover Pins)</h5>
        <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-w-[240px]">
          <img src={meta.mockupImage} alt="Order Mockup" className="w-full h-auto select-none" />
          {meta.pins && meta.pins.map((pin, idx) => (
            <div
              key={idx}
              className="absolute w-4.5 h-4.5 bg-violet-600 border border-white text-[8px] font-bold text-white rounded-full flex items-center justify-center -translate-x-1/2 -translate-y-1/2 shadow-lg group cursor-pointer"
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
            >
              {idx + 1}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-950 text-white text-[10px] py-1 px-2 rounded-lg shadow-md whitespace-nowrap z-50">
                {pin.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getRiskBadgeColor = (score) => {
    if (score >= 90) return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200';
    if (score >= 60) return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-250';
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200';
  };

  // --- Status Stepper Configurations ---
  const getStatusStepIndex = (statusStr) => {
    switch (statusStr.toLowerCase()) {
      case 'pending': return 0;
      case 'in_progress': return 1;
      case 'completed': return 2;
      case 'delivered': return 3;
      default: return -1; // Cancelled
    }
  };

  const renderProgressStepper = (order) => {
    const steps = [
      { name: 'Pending', icon: Clock },
      { name: 'Baking', icon: Hammer },
      { name: 'Finished', icon: CheckCircle },
      { name: 'Delivered', icon: Truck }
    ];

    const currentIdx = getStatusStepIndex(order.status);
    const isBlocked = order.approved_by_admin === 0;

    if (order.status === 'cancelled') {
      return (
        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-rose-50 text-rose-800 dark:bg-rose-950/30">
          ❌ Cancelled
        </span>
      );
    }

    return (
      <div className="flex items-center gap-1 mt-1">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCompleted = idx <= currentIdx;
          const isCurrent = idx === currentIdx;

          let circleColor = 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600';
          if (isCompleted) {
            circleColor = 'bg-violet-100 text-violet-750 dark:bg-violet-950 dark:text-violet-300';
          }
          if (isCurrent) {
            circleColor = isBlocked 
              ? 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400 animate-pulse shadow-glow-rose ring-2 ring-rose-400'
              : 'bg-violet-600 text-white shadow-glow-violet ring-2 ring-violet-400';
          }

          return (
            <React.Fragment key={idx}>
              {/* Step circle */}
              <div 
                className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${circleColor}`}
                title={step.name}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              {/* Connector line */}
              {idx < steps.length - 1 && (
                <div className={`h-0.5 w-4 rounded transition-all ${
                  idx < currentIdx 
                    ? 'bg-violet-500' 
                    : 'bg-slate-200 dark:bg-slate-800'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Order Desk</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage cake customizations, track deliveries, and run allergy safety audits.</p>
        </div>
        <button
          onClick={() => { resetCakeBuilder(); setIsModalOpen(true); }}
          className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/10 hover:shadow-violet-600/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-center"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>New Cake Order</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-premium">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search orders by customer or dessert name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-950/50 text-slate-850 dark:text-slate-100 text-sm focus:outline-none"
          />
        </div>
        <div className="w-full md:w-48">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 text-sm focus:outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl shadow-premium overflow-hidden">
        {loading ? (
          <div className="p-16 space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-16 text-center text-slate-400 dark:text-slate-500">
            🔍 No orders found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-4 py-4 w-10"></th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('id')}>
                    Order ID {sortField === 'id' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('customer_name')}>
                    Customer {sortField === 'customer_name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('product_name')}>
                    Product details {sortField === 'product_name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4">Ingredients</th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('delivery_date')}>
                    Delivery Date {sortField === 'delivery_date' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('total_price')}>
                    Price {sortField === 'total_price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('risk_score')}>
                    Risk Audit {sortField === 'risk_score' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="px-6 py-4 cursor-pointer select-none hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('status')}>
                    Status Progress / Action {sortField === 'status' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((o) => {
                  const isExpanded = expandedOrderIds.has(o.id);
                  return (
                    <React.Fragment key={o.id}>
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-all text-sm">
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => toggleExpandOrder(o.id)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all cursor-pointer"
                          >
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                          </button>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">#{o.id}</td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{o.customer_name}</p>
                          <p className="text-[10px] text-slate-450 mt-0.5">{o.customer_phone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-250">{o.product_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{o.category} • Qty {o.quantity}</p>
                        </td>
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={o.ingredients}>
                          {o.ingredients}
                        </td>
                        <td className="px-6 py-4 text-slate-650 dark:text-slate-400">
                          {o.delivery_date ? new Date(o.delivery_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-800 dark:text-slate-200">${(o.total_price || 0).toFixed(2)}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">${(o.unit_price || 0).toFixed(2)} each</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getRiskBadgeColor(o.risk_score)}`}>
                            {o.risk_score >= 90 ? <AlertOctagon className="w-3.5 h-3.5 animate-pulse" /> : o.risk_score >= 60 ? <AlertTriangle className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                            <span>{o.risk_score}% Risk</span>
                          </div>
                          {o.approved_by_admin === 0 ? (
                            <span className="block text-[9px] text-rose-600 font-extrabold uppercase mt-1">🚨 Blocked Override</span>
                          ) : o.risk_score >= 80 && (
                            <span className="block text-[9px] text-emerald-600 font-extrabold uppercase mt-1">🔓 Approved Override</span>
                          )}
                          {o.baker_signature && (
                            <div className="mt-1.5 p-1 bg-violet-50 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/60 rounded text-[9px] font-semibold text-violet-850 dark:text-violet-300 leading-tight">
                              👨‍🍳 Baker Sign-Off: {o.baker_signature}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            {renderProgressStepper(o)}

                            <div className="flex items-center gap-2 mt-2">
                              {o.approved_by_admin === 0 && user?.role === 'admin' && (
                                <button
                                  onClick={() => handleApprove(o.id)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Approve Override</span>
                                </button>
                              )}

                              <select
                                disabled={o.approved_by_admin === 0}
                                value={o.status}
                                onChange={(e) => handleStatusChange(o.id, e.target.value)}
                                className="px-2 py-1 bg-slate-50 border border-slate-205 dark:bg-slate-800 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-350 focus:outline-none cursor-pointer disabled:opacity-40"
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>

                              {/* Edit & Delete Action Buttons */}
                              <button
                                onClick={() => handleEditClick(o)}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-850 dark:hover:text-slate-200 rounded-lg transition-all cursor-pointer"
                                title="Edit Order"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {user?.role === 'admin' && (
                                <button
                                  onClick={() => { setOrderToDeleteId(o.id); setIsDeleteModalOpen(true); }}
                                  className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-all cursor-pointer"
                                  title="Delete Order"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* Collapsible Expanded Panel */}
                      {isExpanded && (
                        <tr className="bg-slate-50/20 dark:bg-slate-950/20">
                          <td colSpan={9} className="px-8 py-5 border-b border-slate-100 dark:border-slate-800">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {/* Sanitation Checklist Gated Panel */}
                              <div className="space-y-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">🚧 Kitchen Prep Sanitation Checklist</h4>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                    (checklists[o.id]?.sanit && checklists[o.id]?.tools && checklists[o.id]?.hands && checklists[o.id]?.ingred)
                                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                  }`}>
                                    Status: {((checklists[o.id]?.sanit && checklists[o.id]?.tools && checklists[o.id]?.hands && checklists[o.id]?.ingred) ? '🔓 Ready' : '🔒 Blocked')}
                                  </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {[
                                    { key: 'sanit', label: '🧼 Workstation Sanitized' },
                                    { key: 'tools', label: '🍽️ Allergen Tools Separated' },
                                    { key: 'hands', label: '🧤 Hands Cleaned & Gloved' },
                                    { key: 'ingred', label: '🔍 Ingredients Cross-checked' }
                                  ].map((item) => (
                                    <label key={item.key} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-950/30 cursor-pointer transition-all select-none">
                                      <input
                                        type="checkbox"
                                        checked={!!checklists[o.id]?.[item.key]}
                                        onChange={(e) => {
                                          const isChecked = e.target.checked;
                                          setChecklists(prev => ({
                                            ...prev,
                                            [o.id]: {
                                              ...(prev[o.id] || { sanit: false, tools: false, hands: false, ingred: false }),
                                              [item.key]: isChecked
                                            }
                                          }));
                                        }}
                                        className="w-4 h-4 rounded text-violet-600 focus:ring-violet-500/30 cursor-pointer"
                                      />
                                      <span className={`text-xs font-semibold ${checklists[o.id]?.[item.key] ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}>
                                        {item.label}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* Operations detail panel */}
                              <div className="space-y-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
                                <div className="space-y-3">
                                  <h4 className="text-[11px] font-extrabold text-slate-600 dark:text-slate-400 uppercase tracking-wider">📋 Operations Details</h4>
                                  <div className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                                    <p><strong>Piping/Kitchen Notes:</strong> {parseMockupMetadata(o.notes)?.notes || o.notes || 'None provided.'}</p>
                                    {o.risk_explanation && (
                                      <p><strong>Safety Log:</strong> <span className="italic">{o.risk_explanation}</span></p>
                                    )}
                                  </div>
                                  {renderPinsOverlay(o)}
                                </div>

                                <div className="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 mt-3">
                                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    📱 SMS Dispatch: Active status tracking
                                  </span>
                                  <button
                                    onClick={() => generateInvoicePDF(o)}
                                    className="px-3.5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Download Invoice</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 flex items-center justify-between">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Showing {orders.length} order files
          </span>
          <div className="flex gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage(prev => Math.max(prev - 1, 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-40 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center">
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

      {/* Modal - New Order Form */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] shadow-glow-violet"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-base">
                    {editingOrder ? 'Edit Cake Order Details' : 'New Cake Customization & Order'}
                  </h3>
                  <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">
                    {editingOrder ? 'Modify pricing, quantities, delivery dates, or mockup pins.' : 'Design cake tiers visually, select color templates, and verify allergy scans.'}
                  </p>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* 3-Column Body: Inputs | 2D Customizer | AI Diagnostics */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
                
                {/* Column 1: Core Order Form */}
                <form onSubmit={handleCreateOrder} className="flex-1 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Select Customer Profile *</label>
                    <select
                      required
                      disabled={!!editingOrder}
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <option value="">-- Choose Profile --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Product Name *</label>
                      <input
                        required
                        type="text"
                        placeholder="Peanut Butter Brownie Cake"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Category</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all cursor-pointer"
                      >
                        <option value="Cake">Cake</option>
                        <option value="Cupcake">Cupcake</option>
                        <option value="Pastry">Pastry</option>
                        <option value="Pie">Pie</option>
                        <option value="Cookie">Cookie</option>
                      </select>
                    </div>
                  </div>

                  {/* Visual Tag Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Recipe Ingredients *</label>
                    <div className="p-2 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 rounded-xl flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-violet-500/25 focus-within:border-violet-600 min-h-24">
                      {tags.map((tag, idx) => (
                        <span 
                          key={idx}
                          className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${getTagColorClass(tag)}`}
                        >
                          <span>{tag}</span>
                          <button 
                            type="button" 
                            onClick={() => removeTag(idx)}
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                      <input
                        disabled={!selectedCustomerId}
                        type="text"
                        placeholder={selectedCustomerId ? "Type ingredient and hit Enter..." : "⚠️ Choose Customer Profile first"}
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagInputKeyDown}
                        className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-100 text-sm p-1 placeholder-slate-400"
                      />
                    </div>
                  </div>

                  {/* AI Recipe Parsing Assistant */}
                  <div className="space-y-2 border border-violet-100 dark:border-violet-900 bg-violet-50/10 dark:bg-violet-950/10 p-4 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">AI Recipe Parsing (Gemini)</label>
                      <button
                        type="button"
                        onClick={handleAIParse}
                        disabled={aiLoading || !aiDescription.trim() || !selectedCustomerId}
                        className="px-3 py-1.5 bg-violet-650 hover:bg-violet-750 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        {aiLoading ? 'AI Parsing...' : '🪄 Extract Ingredients'}
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      disabled={!selectedCustomerId}
                      placeholder={selectedCustomerId ? "E.g., 'A 3-tier chocolate cake with walnuts, eggs, and dairy cream frosting...'" : "⚠️ Choose Customer Profile first"}
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-850 dark:text-slate-100 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Delivery Target Date</label>
                      <input
                        type="date"
                        required
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Unit Price ($) *</label>
                      <input
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="29.99"
                        value={unitPrice}
                        onChange={(e) => setUnitPrice(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Estimated Total</label>
                      <div className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm font-extrabold flex items-center justify-between">
                        <span>$ {((parseFloat(unitPrice) || 0) * quantity).toFixed(2)}</span>
                        <span className="text-[10px] font-normal text-slate-400">({quantity} x ${parseFloat(unitPrice) || 0})</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Kitchen Instructions</label>
                    <textarea
                      rows={2}
                      placeholder="Add custom piping messages, height requirements..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all resize-none"
                    />
                  </div>

                  {/* Mockup Upload and Annotation Canvas */}
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Cake Mockup Design (Upload & Annotate)</label>
                    <div className="flex items-center gap-3">
                      <label className="px-4 py-2 border border-dashed border-slate-300 dark:border-slate-700 hover:border-violet-500 rounded-xl text-xs font-semibold text-slate-500 hover:text-violet-600 transition-all cursor-pointer flex items-center gap-1.5 bg-slate-50/50 dark:bg-slate-950/20">
                        <FileUp className="w-4 h-4" />
                        <span>Upload Reference Mockup Photo</span>
                        <input
                          type="file"
                          disabled={!selectedCustomerId}
                          accept="image/*"
                          onChange={handleMockupUpload}
                          className="hidden"
                        />
                      </label>
                      {mockupImageSrc && (
                        <button
                          type="button"
                          onClick={() => { setMockupImageSrc(''); setPins([]); setTempPin(null); }}
                          className="text-xs text-rose-500 hover:text-rose-700 font-bold"
                        >
                          Clear Image
                        </button>
                      )}
                    </div>

                    {mockupImageSrc && (
                      <div className="space-y-3 bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl">
                        <div className="text-[10px] font-bold text-slate-400 uppercase">Click image below to drop custom pins:</div>
                        <div 
                          className="relative border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden cursor-crosshair max-w-sm mx-auto shadow-sm"
                          onClick={handleCanvasClick}
                        >
                          <img src={mockupImageSrc} alt="Mockup Upload Preview" className="w-full h-auto select-none" />
                          {pins.map((pin, idx) => (
                            <div
                              key={idx}
                              className="absolute w-5 h-5 bg-violet-600 border-2 border-white text-[9px] font-bold text-white rounded-full flex items-center justify-center -translate-x-1/2 -translate-y-1/2 shadow-lg"
                              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                              title={pin.desc}
                            >
                              {idx + 1}
                            </div>
                          ))}
                          {tempPin && (
                            <div
                              className="absolute w-5 h-5 bg-amber-500 border-2 border-white text-[9px] font-bold text-white rounded-full flex items-center justify-center -translate-x-1/2 -translate-y-1/2 shadow-lg animate-ping"
                              style={{ left: `${tempPin.x}%`, top: `${tempPin.y}%` }}
                            />
                          )}
                        </div>

                        {/* Annotating temporary pin */}
                        {tempPin && (
                          <div className="flex gap-2 items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-850 shadow-sm max-w-md mx-auto">
                            <span className="text-xs font-extrabold text-violet-600 shrink-0">Pin #{pins.length + 1} Note:</span>
                            <input
                              type="text"
                              placeholder="E.g., Piping color, frosting style, sprinkles..."
                              value={pinDesc}
                              onChange={(e) => setPinDesc(e.target.value)}
                              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-55 dark:bg-slate-950 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={savePin}
                              className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] rounded-lg shadow cursor-pointer shrink-0"
                            >
                              Add Pin
                            </button>
                          </div>
                        )}

                        {pins.length > 0 && (
                          <div className="space-y-1.5 max-h-28 overflow-y-auto bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-250 dark:border-slate-850 shadow-sm max-w-md mx-auto">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide border-b border-slate-100 dark:border-slate-800 pb-1 mb-1">Placed Annotations:</div>
                            {pins.map((pin, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs text-slate-650 dark:text-slate-350">
                                <span><strong>Pin {idx + 1}:</strong> {pin.desc}</span>
                                <button
                                  type="button"
                                  onClick={() => setPins(prev => prev.filter((_, i) => i !== idx))}
                                  className="text-rose-500 hover:text-rose-700 font-bold ml-3 text-[10px]"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setIsModalOpen(false); resetForm(); }}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-5 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/15 transition-all"
                    >
                      {submitting ? 'Processing...' : editingOrder ? 'Save Changes' : 'Place Order'}
                    </button>
                  </div>
                </form>

                {/* Column 2: 2D Interactive Cake Visual Builder */}
                <div className="w-full lg:w-80 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">2D Cake Visual Builder</h4>
                  
                  {/* Visual stacked layers preview */}
                  <div className="h-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl relative flex flex-col items-center justify-end p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-100/30 to-transparent dark:from-slate-900/10 pointer-events-none" />
                    
                    {/* Cake stand */}
                    <div className="w-48 h-2.5 bg-slate-350 dark:bg-slate-700 rounded-full mb-1 flex items-center justify-center shadow-sm" />
                    
                    {/* Tier 1 (Bottom layer) */}
                    <div 
                      className={`h-9 border border-black/5 flex items-center justify-center transition-all duration-300 relative ${
                        cakeShape === 'round' ? 'rounded-t-2xl' : 'rounded-t-md'
                      }`}
                      style={{ 
                        width: '140px', 
                        backgroundColor: cakeColor, 
                        marginBottom: '1px',
                        boxShadow: `0 4px 10px rgba(0,0,0,0.08), inset 0 2px 4px rgba(255,255,255,0.2)`
                      }}
                    >
                      {/* Little topping dot overlays */}
                      {activeToppings.strawberries && <span className="absolute -top-1 left-4 text-[8px]">🍓</span>}
                      {activeToppings.chocolate && <span className="absolute -top-1.5 left-12 text-[8px]">🍫</span>}
                      {activeToppings.peanuts && <span className="absolute -top-1 left-24 text-[8px]">🥜</span>}
                    </div>

                    {/* Tier 2 (Middle layer) */}
                    {cakeTiers >= 2 && (
                      <div 
                        className={`h-8 border border-black/5 flex items-center justify-center transition-all duration-300 relative ${
                          cakeShape === 'round' ? 'rounded-t-xl' : 'rounded-t-md'
                        }`}
                        style={{ 
                          width: '100px', 
                          backgroundColor: cakeColor, 
                          marginBottom: '1px',
                          boxShadow: `0 4px 8px rgba(0,0,0,0.08), inset 0 2px 4px rgba(255,255,255,0.2)`
                        }}
                      >
                        {activeToppings.strawberries && <span className="absolute -top-1 left-3 text-[8px]">🍓</span>}
                        {activeToppings.chocolate && <span className="absolute -top-1.5 left-10 text-[8px]">🍫</span>}
                        {activeToppings.peanuts && <span className="absolute -top-1 left-16 text-[8px]">🥜</span>}
                      </div>
                    )}

                    {/* Tier 3 (Top layer) */}
                    {cakeTiers >= 3 && (
                      <div 
                        className={`h-7 border border-black/5 flex items-center justify-center transition-all duration-300 relative ${
                          cakeShape === 'round' ? 'rounded-t-lg' : 'rounded-t-md'
                        }`}
                        style={{ 
                          width: '70px', 
                          backgroundColor: cakeColor,
                          boxShadow: `0 4px 6px rgba(0,0,0,0.08), inset 0 2px 4px rgba(255,255,255,0.2)`
                        }}
                      >
                        {activeToppings.strawberries && <span className="absolute -top-1 left-2 text-[8px]">🍓</span>}
                        {activeToppings.chocolate && <span className="absolute -top-1.5 left-6 text-[8px]">🍫</span>}
                        {activeToppings.peanuts && <span className="absolute -top-1 left-10 text-[8px]">🥜</span>}
                      </div>
                    )}
                  </div>

                  {/* Builder Controllers */}
                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                    
                    {/* Tiers & Shape Toggle */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Layers</label>
                        <div className="flex border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden mt-1 bg-white dark:bg-slate-900">
                          {[1, 2, 3].map((t) => (
                            <button
                              type="button"
                              key={t}
                              onClick={() => setCakeTiers(t)}
                              className={`flex-1 py-1.5 text-xs font-bold transition-all ${
                                cakeTiers === t 
                                  ? 'bg-violet-600 text-white' 
                                  : 'text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Shape</label>
                        <div className="flex border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden mt-1 bg-white dark:bg-slate-900">
                          {['round', 'square'].map((s) => (
                            <button
                              type="button"
                              key={s}
                              onClick={() => setCakeShape(s)}
                              className={`flex-1 py-1.5 text-xs font-bold transition-all capitalize ${
                                cakeShape === s 
                                  ? 'bg-violet-600 text-white' 
                                  : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Flavor / Color Templates */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Color Icing (Flavor)</label>
                      <div className="flex gap-2.5 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl">
                        {[
                          { val: '#f472b6', name: 'Strawberry', color: 'bg-pink-400' },
                          { val: '#78350f', name: 'Chocolate', color: 'bg-amber-900' },
                          { val: '#fef08a', name: 'Lemon', color: 'bg-yellow-200' },
                          { val: '#bfdbfe', name: 'Blueberry', color: 'bg-blue-200' },
                          { val: '#ffffff', name: 'Vanilla', color: 'bg-white border border-slate-200' }
                        ].map((c) => (
                          <button
                            type="button"
                            key={c.val}
                            onClick={() => setCakeColor(c.val)}
                            className={`w-6.5 h-6.5 rounded-full transition-all flex items-center justify-center ${c.color} ${
                              cakeColor === c.val ? 'ring-2 ring-violet-500 scale-110 shadow-md' : 'hover:scale-105'
                            }`}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Toppings Toggles */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Cake Toppings (Syncs Ingredients)</label>
                      <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                        {[
                          { key: 'peanuts', label: '🥜 Peanuts', word: 'peanut' },
                          { key: 'strawberries', label: '🍓 Strawberries', word: 'strawberry' },
                          { key: 'chocolate', label: '🍫 Chocolate', word: 'chocolate' },
                          { key: 'milk', label: '🥛 Dairy Milk', word: 'milk' },
                          { key: 'walnuts', label: '🌰 Walnuts', word: 'walnut' },
                          { key: 'gelatin', label: '🍧 Gelatin', word: 'gelatin' },
                          { key: 'egg', label: '🥚 Yolk Egg', word: 'egg' },
                          { key: 'flour', label: '🌾 Flour Wheat', word: 'flour' }
                        ].map((top) => (
                          <button
                            type="button"
                            disabled={!selectedCustomerId}
                            key={top.key}
                            onClick={() => handleToppingToggle(top.key, top.word)}
                            className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-bold text-left transition-all cursor-pointer ${
                              activeToppings[top.key]
                                ? 'bg-violet-600 text-white border-violet-650'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800'
                            } disabled:opacity-40`}
                          >
                            {top.label}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Column 3: Live AI Safety Scan Diagnostics */}
                <div className="w-full lg:w-72 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Allergy Safety Scan</h4>

                  {!selectedCustomerFile ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      <ShoppingBag className="w-8 h-8 text-slate-300 mb-2 animate-bounce" />
                      <p className="text-[11px] text-slate-400">Select a customer profile to launch the real-time allergy engine checks.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1 flex flex-col">
                      {/* Customer Profile Mini */}
                      <div className="p-3 bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl shadow-sm">
                        <span className="text-[9px] font-bold text-slate-400 block uppercase">Active Profile</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-1 block">{selectedCustomerFile.name}</span>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedCustomerFile.allergies.map((a, i) => (
                            <span key={i} className="text-[8px] font-extrabold uppercase bg-rose-50 text-rose-800 border border-rose-100 px-1.5 py-0.5 rounded shadow-sm">
                              {a.allergy_name}
                            </span>
                          ))}
                          {selectedCustomerFile.preferences.map((p, i) => (
                            <span key={i} className="text-[8px] font-extrabold uppercase bg-violet-50 text-violet-800 border border-violet-100 px-1.5 py-0.5 rounded shadow-sm">
                              {p.preference_name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Diagnostic Score Board */}
                      <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-300 ${
                        engineReport.score >= 90
                          ? 'bg-rose-50 border-rose-250 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-350 shadow-glow-rose'
                          : engineReport.score >= 30
                          ? 'bg-amber-50 border-amber-250 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-300 shadow-glow-amber'
                          : 'bg-emerald-50 border-emerald-250 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900 dark:text-emerald-300'
                      }`}>
                        <span className="text-[10px] font-bold uppercase tracking-wider">Risk Diagnostic Score</span>
                        <span className="text-4xl font-extrabold mt-2 tracking-tighter">{engineReport.score}%</span>
                        <span className="text-[10px] font-bold uppercase mt-2 tracking-wide block">
                          Level: {engineReport.level}
                        </span>
                      </div>

                      {/* Explanation Warning Board */}
                      <div className="flex-1 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-y-auto text-xs leading-normal">
                        <p className="font-bold text-slate-800 dark:text-slate-200 mb-1.5">Engine Report Details:</p>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">{engineReport.explanation}</p>
                        {engineReport.score >= 90 && (
                          <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-[10px] font-semibold text-rose-800 dark:bg-rose-950 dark:border-rose-900 dark:text-rose-450 leading-relaxed shadow-sm">
                            🚨 CRITICAL WARNING: Ordering this dessert violates critical safety thresholds. Order requires Admin supervisor approval overrides before bakery release!
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => { setIsDeleteModalOpen(false); setOrderToDelete(null); }}
        onConfirm={executeDeleteOrder}
        title="Delete Cake Order"
        message="Are you absolutely sure you want to delete this custom cake order? This action is permanent and will remove all audit logs and design sheets."
        confirmText="Delete Order"
        cancelText="Cancel"
        variant="danger"
      />

      {/* Modal - Baker Double-Signature Sign-Off */}
      <AnimatePresence>
        {isBakerSigModalOpen && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-extrabold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wider">Baker Safety Sign-Off</h3>
                <button 
                  onClick={() => { setIsBakerSigModalOpen(false); setBakerName(''); }}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={submitBakerSignature} className="p-6 space-y-4">
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-105 dark:border-rose-900/60 rounded-xl text-rose-800 dark:text-rose-350 text-xs flex gap-2.5">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-450" />
                  <div className="space-y-1">
                    <p className="font-bold">Double-Signature Verification</p>
                    <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-450">This order contains high-risk allergens. By signing your name, you confirm you have cleaned the workspace, sanitized tools, and verified that all ingredients are completely free from cross-contamination.</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Baker Signature (Full Name) *</label>
                  <input
                    required
                    type="text"
                    placeholder="Enter your name to sign"
                    value={bakerName}
                    onChange={(e) => setBakerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/25 focus:border-rose-600 transition-all font-medium"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => { setIsBakerSigModalOpen(false); setBakerName(''); }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/15 transition-all cursor-pointer"
                  >
                    Verify & Sign Off
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

export default OrderList;
