import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Search, User, ShoppingBag, X } from 'lucide-react';

const GlobalSearch = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const modalRef = useRef(null);
  const navigate = useNavigate();

  // Listen for escape keys & click outsides
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Execute query search
  useEffect(() => {
    if (!query.trim()) {
      setCustomers([]);
      setOrders([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        // Run searches in parallel
        const [custRes, orderRes] = await Promise.all([
          api.get(`/api/customers?search=${query}&limit=5`),
          api.get(`/api/orders?search=${query}&limit=5`)
        ]);

        if (custRes.data.success) {
          setCustomers(custRes.data.data);
        }
        if (orderRes.data.success) {
          setOrders(orderRes.data.data);
        }
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce searches

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  if (!isOpen) return null;

  const handleSelectCustomer = (id) => {
    navigate(`/customers/${id}`);
    onClose();
    setQuery('');
  };

  const handleSelectOrder = (id) => {
    navigate(`/orders`); // Navigate to orders page
    onClose();
    setQuery('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-start justify-center pt-28 px-4 animate-fade-in">
      <div 
        ref={modalRef}
        className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 relative">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          <input
            autoFocus
            type="text"
            placeholder="Type customer name, phone, email or order product..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:ring-0"
          />
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Lists */}
        <div className="max-h-96 overflow-y-auto p-2">
          {loading && (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              <span className="inline-block animate-spin mr-2">⏳</span> Searching databases...
            </div>
          )}

          {!loading && !query.trim() && (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              Type something to search the safety database records.
            </div>
          )}

          {!loading && query.trim() && customers.length === 0 && orders.length === 0 && (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
              🔍 No results found matching your search.
            </div>
          )}

          {/* Customer Matches */}
          {customers.length > 0 && (
            <div className="mb-4">
              <h3 className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Customers</h3>
              <div className="space-y-1 mt-1">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCustomer(c.id)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 group transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-violet-600 dark:group-hover:text-violet-400 truncate">{c.name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{c.email} • {c.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Order Matches */}
          {orders.length > 0 && (
            <div>
              <h3 className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">Orders</h3>
              <div className="space-y-1 mt-1">
                {orders.map((o) => (
                  <button
                    key={o.id}
                    onClick={() => handleSelectOrder(o.id)}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-3 group transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 flex items-center justify-center">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">{o.product_name}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">Order #{o.id} • Customer: {o.customer_name} • Risk: {o.risk_score}%</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
