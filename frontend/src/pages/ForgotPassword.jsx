import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Cake, Mail, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { showToast } = useAuth();

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/api/auth/forgot-password', { email });
      if (res.data.success) {
        setSent(true);
        showToast('Password recovery instructions sent!', 'success');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send recovery instructions.', 'danger');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 relative transition-colors duration-200 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-violet-200/40 dark:bg-violet-950/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-100/40 dark:bg-rose-950/10 blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 dark:bg-violet-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 mb-4">
            <Cake className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Recover Password</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold tracking-wide uppercase">Allergy & Dietary Safety Portal</p>
        </div>

        {sent ? (
          <div className="space-y-6 text-center">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400 text-xs font-medium">
              ✨ Recover link created successfully! Instructions sent to your email (simulated).
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal">
              For local testing, the password reset link has been printed directly to the **backend terminal window**. Copy that URL and open it in your browser.
            </p>
            <Link 
              to="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-violet-600 hover:text-violet-700 dark:text-violet-400"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-5">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed text-center mb-4">
              Enter your registered email below, and we'll compile a reset token links to verify your account safety.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  required
                  type="email"
                  placeholder="staff@cakesandcrunches.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  Sending Link...
                </>
              ) : 'Send Reset Link'}
            </button>

            <div className="text-center mt-6">
              <Link 
                to="/login"
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Login</span>
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
