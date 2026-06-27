import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger' // 'danger' | 'warning'
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <Trash2 className="w-6 h-6 text-rose-600 dark:text-rose-400" />,
      iconBg: 'bg-rose-100 dark:bg-rose-950/30',
      button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20',
    },
    warning: {
      icon: <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-100 dark:bg-amber-950/30',
      button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 confirm-modal-overlay">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-5 flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl ${styles.iconBg} flex items-center justify-center shrink-0`}>
              {styles.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-extrabold text-slate-800 dark:text-slate-100 text-sm">{title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{message}</p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              onClick={() => { onConfirm(); onClose(); }}
              className={`px-4 py-2 ${styles.button} text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer`}
            >
              {confirmText}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmModal;
