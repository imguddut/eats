import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onOpenAuth: () => void;
}

export default function ProtectedRoute({ children, onOpenAuth }: ProtectedRouteProps) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div id="protected-route-loading" className="flex-grow flex flex-col items-center justify-center p-8 bg-brand-bg min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-brand-card border-t-rose-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-semibold text-brand-text-sec animate-pulse">Checking your credentials...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div id="protected-route-restricted" className="flex-grow flex items-center justify-center p-4 bg-brand-bg md:p-8 min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md overflow-hidden rounded-3xl bg-brand-bg-sec border border-brand-card shadow-2xl p-6 md:p-8 text-center flex flex-col items-center gap-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
            <ShieldAlert size={32} />
          </div>

          <div className="space-y-2">
            <h2 className="font-display text-2xl font-black tracking-tight text-brand-text">Access Restricted</h2>
            <p className="text-sm text-brand-text-sec font-semibold leading-relaxed">
              Please sign in to access this feature. Only verified customer accounts can view their cart, checkout, orders, or profile.
            </p>
          </div>

          <button
            onClick={onOpenAuth}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#ef4444] to-[#f43f5e] hover:from-[#e11d48] hover:to-[#db2777] text-white font-bold shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <KeyRound size={18} />
            <span>Sign In to Your Account</span>
          </button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}
