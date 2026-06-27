import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Cake, 
  ShoppingBag, 
  ArrowLeft, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle,
  Lock,
  Plus,
  Search,
  Calendar,
  MapPin,
  ClipboardList
} from 'lucide-react';
import { motion } from 'framer-motion';

const OrderOnline = () => {
  const { showToast } = useAuth();
  
  // Lookup states
  const [phoneInput, setPhoneInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerFile, setSelectedCustomerFile] = useState(null);
  
  // Order details
  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('Cake');
  const [tags, setTags] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // --- AI Recipe Parsing State ---
  const [aiDescription, setAiDescription] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState(null);

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

  const navigate = useNavigate();

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

  // Check if a topping ingredient is forbidden due to allergies (Disabled at source)
  const isIngredientAllergen = (ingredientWord) => {
    if (!selectedCustomerFile) return false;
    const word = ingredientWord.toLowerCase().trim();

    for (const allergy of selectedCustomerFile.allergies) {
      const triggers = (allergy.trigger_ingredients || '')
        .toLowerCase()
        .split(',')
        .map(t => t.trim());
      if (triggers.some(t => word.includes(t) || t.includes(word))) {
        return true;
      }
    }
    return false;
  };

  const isIngredientDietaryViolation = (ingredientWord) => {
    if (!selectedCustomerFile || !selectedCustomerFile.preferences) return false;
    const word = ingredientWord.toLowerCase().trim();

    for (const pref of selectedCustomerFile.preferences) {
      const forbiddenList = (pref.forbidden_ingredients || '')
        .toLowerCase()
        .split(',')
        .map(f => f.trim())
        .filter(Boolean);
      if (forbiddenList.length > 0) {
        if (forbiddenList.some(item => word.includes(item.toLowerCase()) || item.toLowerCase().includes(word))) {
          return true;
        }
      }
    }
    return false;
  };

  const handleToppingToggle = (toppingKey, ingredientWord) => {
    const isNowActive = !activeToppings[toppingKey];
    setActiveToppings(prev => ({ ...prev, [toppingKey]: isNowActive }));

    if (isNowActive) {
      setTags(prev => [...prev, ingredientWord]);
    } else {
      setTags(prev => prev.filter(t => t.toLowerCase() !== ingredientWord.toLowerCase()));
    }
  };

  const handlePhoneLookup = async (e) => {
    e.preventDefault();
    if (!phoneInput.trim()) {
      showToast('Please enter your registered phone number.', 'warning');
      return;
    }
    setLookupLoading(true);
    try {
      const res = await api.get(`/api/customers/lookup?phone=${phoneInput.trim()}`);
      if (res.data.success) {
        setSelectedCustomerId(res.data.data.id);
        setSelectedCustomerFile(res.data.data);
        showToast(`Welcome back, ${res.data.data.name}! Allergy warnings loaded.`, 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'No profile found with this phone number. Please contact us to register.', 'danger');
      setSelectedCustomerId('');
      setSelectedCustomerFile(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleAIParse = async () => {
    if (!aiDescription.trim()) return;
    setAiLoading(true);
    try {
      // In the online portal, since the customer doesn't have a staff login token, we'll need to make sure they can call it.
      // Wait, is /api/ai/parse-ingredients protected by authenticateToken? Yes!
      // But wait! Customers don't have a login JWT token.
      // If we protect it, we should let them bypass or we should pass the customer's phone lookup info? No, it's easier to make the route public or bypass auth for AI parsing if needed, OR we can let public users use it too by removing authenticateToken from that route in ai.js!
      // Yes, making the AI parsing route public is much cleaner because customers placing orders online also want to use the AI extraction assistant. Let's make it public!
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

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (tags.length === 0) {
      showToast('Please select at least one ingredient topping for your cake customizer.', 'warning');
      return;
    }
    if (!deliveryDate) {
      showToast('Please select a delivery target date.', 'warning');
      return;
    }
    if (!deliveryAddress.trim()) {
      showToast('Please specify a delivery address.', 'warning');
      return;
    }
    setSubmitting(true);

    try {
      const res = await api.post('/api/orders', {
        customer_id: selectedCustomerId,
        product_name: productName || `Customized ${category}`,
        category,
        ingredients: tags.join(', '),
        quantity: parseInt(quantity) || 1,
        delivery_date: deliveryDate,
        notes: `Customer online self-order. Visual template color: ${cakeColor}. Shape: ${cakeShape}. Layers: ${cakeTiers}.\nDelivery Address: ${deliveryAddress}.\nSpecial Instructions: ${specialInstructions}`
      });

      if (res.data.success) {
        setPlacedOrderId(res.data.orderId);
        setOrderPlaced(true);
        showToast('Cake order placed successfully!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Error placing online order.', 'danger');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col px-4 py-8 relative transition-colors duration-200 overflow-x-hidden">
      {/* Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-250/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-100/20 blur-[120px] pointer-events-none" />

      <div className="max-w-5xl w-full mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative z-10 flex-1 flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 dark:bg-violet-500 flex items-center justify-center text-white shadow-md">
              <Cake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm tracking-tight leading-tight">Cakes & Crunches</h2>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold tracking-wide uppercase">Online Order Desk</span>
            </div>
          </div>
          <Link 
            to="/login"
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs rounded-xl flex items-center gap-1.5 text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Staff Portal Login</span>
          </Link>
        </div>

        {orderPlaced ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto space-y-4"
          >
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl shadow-sm animate-bounce">
              🎉
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Order Placed Successfully!</h3>
            <p className="text-xs text-slate-500 dark:text-slate-450 leading-relaxed">
              Your customized cake has been registered as order **#{placedOrderId}**. 
              Our kitchen decorators will review your safety parameters prior to preparation.
            </p>
            <button
              onClick={() => { setOrderPlaced(false); resetCakeBuilder(); setSelectedCustomerId(''); }}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Order Another Cake
            </button>
          </motion.div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-8">
            
            {/* Left Column: Form & Selector */}
            <form onSubmit={handleOrderSubmit} className="flex-1 space-y-5">
              {!selectedCustomerId ? (
                <div className="space-y-3 p-5 bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-350 uppercase tracking-wider block">Access Your Customer Profile</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Enter registered phone number..."
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handlePhoneLookup}
                      disabled={lookupLoading}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {lookupLoading ? 'Checking...' : 'Verify Profile'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    🔒 We protect your privacy. Only phone number verification loads profile allergy limits.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-emerald-50/50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900 rounded-2xl flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide block">Active Session Profile</span>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mt-1 block">
                      Welcome, {selectedCustomerFile.name}!
                    </span>
                    {(selectedCustomerFile.allergies?.length > 0 || selectedCustomerFile.preferences?.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {selectedCustomerFile.allergies?.map((a, i) => (
                          <span key={i} className="text-[9px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-md">
                            ⚠️ {a.allergy_name}
                          </span>
                        ))}
                        {selectedCustomerFile.preferences?.map((p, i) => (
                          <span key={i} className="text-[9px] font-bold uppercase bg-violet-100 text-violet-850 dark:bg-violet-950 dark:text-violet-300 border border-violet-200 dark:border-violet-900 px-2 py-0.5 rounded-md">
                            🌱 {p.preference_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedCustomerId(''); setSelectedCustomerFile(null); setPhoneInput(''); resetCakeBuilder(); setTags([]); }}
                    className="px-3 py-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Change Profile
                  </button>
                </div>
              )}

              {selectedCustomerId && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Give your Cake a name</label>
                      <input
                        type="text"
                        placeholder="My Awesome Birthday Cake"
                        value={productName}
                        onChange={(e) => setProductName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Dessert Type</label>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Quantity (1 - 20)</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(20, parseInt(e.target.value) || 1)))}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Delivery Target Date</label>
                      <input
                        type="date"
                        required
                        min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Delivery Address *</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        required
                        type="text"
                        placeholder="123 Sweet Lane, Frosting Hills"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Special Requests / Piping instructions</label>
                    <div className="relative">
                      <ClipboardList className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <textarea
                        rows={2}
                        placeholder="E.g., Piping message, height, icing style, eggless base..."
                        value={specialInstructions}
                        onChange={(e) => setSpecialInstructions(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all resize-none"
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
                        disabled={aiLoading || !aiDescription.trim()}
                        className="px-3 py-1.5 bg-violet-650 hover:bg-violet-750 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all cursor-pointer"
                      >
                        {aiLoading ? 'AI Parsing...' : '🪄 Extract Ingredients'}
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Describe the customized recipe you want. E.g., 'Vanilla cake with chocolate sprinkles, hazelnuts, and strawberry syrup topping...'"
                      value={aiDescription}
                      onChange={(e) => setAiDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-850 dark:text-slate-100 text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all resize-none"
                    />
                  </div>

                  {/* Selected toppings pills */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block">Custom Cake Recipe tags</label>
                    <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/20 rounded-xl min-h-16 flex flex-wrap gap-2">
                      {tags.length === 0 ? (
                        <span className="text-xs text-slate-400 dark:text-slate-500 self-center">Use the builder on the right to add toppings!</span>
                      ) : (
                        tags.map((tag, idx) => (
                          <span 
                            key={idx}
                            className="px-2.5 py-1 bg-violet-50 text-violet-800 dark:bg-violet-950/30 dark:text-violet-300 border border-violet-200 dark:border-violet-850 rounded-lg text-xs font-semibold animate-pulse"
                          >
                            {tag}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || tags.length === 0}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Placing Order...' : 'Confirm & Place Online Order'}
                  </button>
                </motion.div>
              )}
            </form>

            {/* Right Column: 2D Cake Customizer with Allergy Block Checks */}
            <div className="w-full lg:w-96 flex flex-col gap-5">
              
              {/* 2D Preview Box */}
              <div className="h-44 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-end p-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-200/20 to-transparent pointer-events-none" />
                <div className="w-48 h-2.5 bg-slate-350 dark:bg-slate-700 rounded-full mb-1 flex items-center justify-center shadow-sm" />
                
                {/* Layer 1 (Bottom) */}
                <div 
                  className={`h-9 border border-black/5 flex items-center justify-center transition-all duration-300 relative ${
                    cakeShape === 'round' ? 'rounded-t-2xl' : 'rounded-t-md'
                  }`}
                  style={{ 
                    width: '140px', 
                    backgroundColor: cakeColor, 
                    marginBottom: '1px',
                    boxShadow: `0 4px 10px rgba(0,0,0,0.08)`
                  }}
                >
                  {activeToppings.strawberries && <span className="absolute -top-1 left-4 text-[8px]">🍓</span>}
                  {activeToppings.chocolate && <span className="absolute -top-1.5 left-12 text-[8px]">🍫</span>}
                </div>

                {/* Layer 2 (Middle) */}
                {cakeTiers >= 2 && (
                  <div 
                    className={`h-8 border border-black/5 flex items-center justify-center transition-all duration-300 relative ${
                      cakeShape === 'round' ? 'rounded-t-xl' : 'rounded-t-md'
                    }`}
                    style={{ 
                      width: '100px', 
                      backgroundColor: cakeColor, 
                      marginBottom: '1px',
                      boxShadow: `0 4px 8px rgba(0,0,0,0.08)`
                    }}
                  >
                    {activeToppings.strawberries && <span className="absolute -top-1 left-3 text-[8px]">🍓</span>}
                    {activeToppings.chocolate && <span className="absolute -top-1.5 left-10 text-[8px]">🍫</span>}
                  </div>
                )}

                {/* Layer 3 (Top) */}
                {cakeTiers >= 3 && (
                  <div 
                    className={`h-7 border border-black/5 flex items-center justify-center transition-all duration-300 relative ${
                      cakeShape === 'round' ? 'rounded-t-lg' : 'rounded-t-md'
                    }`}
                    style={{ 
                      width: '70px', 
                      backgroundColor: cakeColor,
                      boxShadow: `0 4px 6px rgba(0,0,0,0.08)`
                    }}
                  >
                    {activeToppings.strawberries && <span className="absolute -top-1 left-2 text-[8px]">🍓</span>}
                    {activeToppings.chocolate && <span className="absolute -top-1.5 left-6 text-[8px]">🍫</span>}
                  </div>
                )}
              </div>

              {/* Toggles */}
              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium space-y-4">
                
                {/* Layers and Shape selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Cake Layers</label>
                    <div className="flex border border-slate-205 dark:border-slate-800 rounded-lg overflow-hidden mt-1">
                      {[1, 2, 3].map((t) => (
                        <button
                          type="button"
                          disabled={!selectedCustomerId}
                          key={t}
                          onClick={() => setCakeTiers(t)}
                          className={`flex-1 py-1.5 text-xs font-bold transition-all ${
                            cakeTiers === t 
                              ? 'bg-violet-600 text-white' 
                              : 'text-slate-650 hover:bg-slate-100 dark:hover:bg-slate-800'
                          } disabled:opacity-40`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Base Shape</label>
                    <div className="flex border border-slate-205 dark:border-slate-800 rounded-lg overflow-hidden mt-1">
                      {['round', 'square'].map((s) => (
                        <button
                          type="button"
                          disabled={!selectedCustomerId}
                          key={s}
                          onClick={() => setCakeShape(s)}
                          className={`flex-1 py-1.5 text-xs font-bold transition-all capitalize ${
                            cakeShape === s 
                              ? 'bg-violet-600 text-white' 
                              : 'text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800'
                          } disabled:opacity-40`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Flavor Color Picker */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Icing Template Color</label>
                  <div className="flex gap-2 mt-1 bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-150 dark:border-slate-800">
                    {[
                      { val: '#f472b6', name: 'Strawberry', color: 'bg-pink-400' },
                      { val: '#78350f', name: 'Chocolate', color: 'bg-amber-900' },
                      { val: '#fef08a', name: 'Lemon', color: 'bg-yellow-200' },
                      { val: '#bfdbfe', name: 'Blueberry', color: 'bg-blue-200' },
                      { val: '#ffffff', name: 'Vanilla', color: 'bg-white border border-slate-205' }
                    ].map((c) => (
                      <button
                        type="button"
                        disabled={!selectedCustomerId}
                        key={c.val}
                        onClick={() => setCakeColor(c.val)}
                        className={`w-6 h-6 rounded-full transition-all flex items-center justify-center ${c.color} ${
                          cakeColor === c.val ? 'ring-2 ring-violet-500 scale-110 shadow-sm' : 'hover:scale-105'
                        } disabled:opacity-40`}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>

                {/* Custom Toppings with Live Allergy Locks */}
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Select Recipe Toppings</label>
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
                    ].map((top) => {
                      const isAllergen = isIngredientAllergen(top.word);
                      const isDietViolated = isIngredientDietaryViolation(top.word);
                      const isLocked = isAllergen || isDietViolated;

                      return (
                        <button
                          type="button"
                          disabled={!selectedCustomerId || isLocked}
                          key={top.key}
                          onClick={() => handleToppingToggle(top.key, top.word)}
                          className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-bold text-left transition-all flex items-center justify-between ${
                            activeToppings[top.key]
                              ? 'bg-violet-600 text-white border-violet-650'
                              : isAllergen
                              ? 'bg-rose-50/50 text-rose-450 border-rose-200/50 cursor-not-allowed dark:bg-rose-950/20 dark:border-rose-950 dark:text-rose-600'
                              : isDietViolated
                              ? 'bg-amber-50/50 text-amber-700 border-amber-200/50 cursor-not-allowed dark:bg-amber-950/20 dark:border-amber-950 dark:text-amber-500'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-350 dark:border-slate-800'
                          } disabled:opacity-50`}
                        >
                          <span>{top.label}</span>
                          {isLocked && <Lock className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                  {selectedCustomerFile && (selectedCustomerFile.allergies?.length > 0 || selectedCustomerFile.preferences?.length > 0) && (
                    <div className="mt-3 p-2 bg-rose-50/50 border border-rose-100 rounded-lg text-[9px] font-semibold text-rose-800 dark:bg-rose-950/20 dark:border-rose-900 dark:text-rose-450">
                      🚨 Toppings are locked if they trigger profile allergen warnings (red) or violate dietary preferences (orange).
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default OrderOnline;
