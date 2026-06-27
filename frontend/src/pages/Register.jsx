import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cake, Mail, Lock, User, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const strengthScore = (hasMinLength ? 1 : 0) + (hasUppercase ? 1 : 0) + (hasNumber ? 1 : 0);
  const isPasswordValid = hasMinLength && hasUppercase && hasNumber;

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    setError('');
    setLoading(true);
    const result = await register(name, email, password, role);
    setLoading(false);
    if (result.success) {
      navigate('/login');
    } else {
      setError(result.error || 'Registration failed.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center px-4 relative transition-colors duration-200 overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-200/40 dark:bg-violet-950/20 blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-rose-100/40 dark:bg-rose-950/10 blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl relative z-10"
      >
        {/* Logo and Titles */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-violet-600 dark:bg-violet-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/25 mb-4">
            <Cake className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-tight">Create Account</h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold tracking-wide uppercase">Allergy & Dietary Safety Portal</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-450 text-xs font-medium text-center">
            🚨 {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                required
                type="text"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                required
                type="email"
                placeholder="jane@cakesandcrunches.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all"
              />
            </div>
            {password.length > 0 && (
              <div className="mt-2 space-y-2">
                {/* Strength Bar */}
                <div className="h-1.5 w-full bg-slate-250 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      strengthScore === 3 ? 'w-full bg-emerald-500' :
                      strengthScore === 2 ? 'w-2/3 bg-amber-500' :
                      'w-1/3 bg-rose-500'
                    }`}
                  />
                </div>
                {/* Label */}
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-slate-400 uppercase">Strength:</span>
                  <span className={
                    strengthScore === 3 ? 'text-emerald-500' :
                    strengthScore === 2 ? 'text-amber-500' :
                    'text-rose-500'
                  }>
                    {strengthScore === 3 ? 'STRONG' : strengthScore === 2 ? 'FAIR' : 'WEAK'}
                  </span>
                </div>
                {/* Hints */}
                <div className="grid grid-cols-1 gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className={hasMinLength ? 'text-emerald-500' : 'text-rose-500'}>
                      {hasMinLength ? '✓' : '✗'}
                    </span>
                    <span>Min 8 characters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={hasUppercase ? 'text-emerald-500' : 'text-rose-500'}>
                      {hasUppercase ? '✓' : '✗'}
                    </span>
                    <span>1 uppercase letter</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={hasNumber ? 'text-emerald-500' : 'text-rose-500'}>
                      {hasNumber ? '✓' : '✗'}
                    </span>
                    <span>1 number</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">System Access Role</label>
            <div className="relative">
              <UserCheck className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/25 focus:border-violet-600 transition-all appearance-none cursor-pointer"
              >
                <option value="staff">Staff (Kitchen/Orders Panel)</option>
                <option value="admin">Administrator (Reports/Overrides/Configs)</option>
              </select>
            </div>
          </div>

          {/* Register Button */}
          <button
            type="submit"
            disabled={loading || (password.length > 0 && !isPasswordValid)}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-450 dark:disabled:text-slate-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-violet-600/20 hover:shadow-violet-600/30 transition-all cursor-pointer mt-4 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                Creating account...
              </>
            ) : 'Register'}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 font-semibold">
          Already have an account?{' '}
          <Link to="/login" className="text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
