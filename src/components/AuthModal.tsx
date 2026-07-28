import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Phone, MapPin, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Customer } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
}

export type AuthMode = 'login' | 'register' | 'forgot';

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const { signUp, signIn, signInWithGoogle, resetPassword, currentUser, isLoading: isAuthLoading, error: authContextError, clearError } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Arwal');
  const [pincode, setPincode] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & loading states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Handle ESC key listener for modal accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Sync authContextError to local error state
  useEffect(() => {
    if (authContextError) {
      setErrorMsg(authContextError);
    }
  }, [authContextError]);

  const resetState = () => {
    setEmail('');
    setPassword('');
    setName('');
    setPhone('');
    setAddress('');
    setPincode('');
    setErrorMsg('');
    setSuccessMsg('');
    setMode('login');
    clearError();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const finishAuthSuccess = (userObj: Customer | null) => {
    if (userObj) {
      onSuccess(userObj);
    }
    setTimeout(() => {
      handleClose();
    }, 600);
  };

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const validatePhone = (phoneStr: string) => {
    return /^[0-9]{10}$/.test(phoneStr);
  };

  // Google Sign In Action
  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await signInWithGoogle();
      setSuccessMsg('Google Sign-In successful! Logging you in...');
      finishAuthSuccess(currentUser);
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMsg(errObj.message || 'Google Sign-In failed.');
    } finally {
      setLoading(false);
    }
  };

  // Form Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    clearError();

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    try {
      if (mode === 'login') {
        if (!trimmedEmail || !trimmedPassword) {
          setErrorMsg('Email Address and Password are required.');
          return;
        }

        if (!validateEmail(trimmedEmail)) {
          setErrorMsg('Please enter a valid email address.');
          return;
        }

        setLoading(true);
        await signIn(trimmedEmail, trimmedPassword);
        setSuccessMsg('Successfully logged in! Redirecting...');
        finishAuthSuccess(currentUser);
      } else if (mode === 'register') {
        const trimmedName = name.trim();
        const trimmedPhone = phone.trim();
        const trimmedAddress = address.trim();
        const trimmedCity = city.trim();
        const trimmedPincode = pincode.trim();

        if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedPassword || !trimmedAddress || !trimmedPincode) {
          setErrorMsg('All fields marked with * are required.');
          return;
        }

        if (!validateEmail(trimmedEmail)) {
          setErrorMsg('Please enter a valid email address.');
          return;
        }

        if (!validatePhone(trimmedPhone)) {
          setErrorMsg('Please enter a valid 10-digit phone number.');
          return;
        }

        if (trimmedPassword.length < 6) {
          setErrorMsg('Password must be at least 6 characters long.');
          return;
        }

        if (!/^[0-9]{6}$/.test(trimmedPincode)) {
          setErrorMsg('Pincode must be exactly 6 digits.');
          return;
        }

        setLoading(true);
        await signUp({
          name: trimmedName,
          email: trimmedEmail,
          password: trimmedPassword,
          phone: trimmedPhone,
          address: trimmedAddress,
          city: trimmedCity,
          pincode: trimmedPincode,
        });
        setSuccessMsg('Registration successful! Logging you in...');
        finishAuthSuccess(currentUser);
      } else if (mode === 'forgot') {
        if (!trimmedEmail) {
          setErrorMsg('Please enter your registered email address.');
          return;
        }

        if (!validateEmail(trimmedEmail)) {
          setErrorMsg('Please enter a valid email address.');
          return;
        }

        setLoading(true);
        await resetPassword(trimmedEmail);
        setSuccessMsg('Password reset link sent to your email. Please check your inbox.');
        setTimeout(() => {
          setMode('login');
          setSuccessMsg('');
        }, 4000);
      }
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMsg(errObj.message || 'Authentication operation failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isBusy = loading || isAuthLoading;

  return (
    <AnimatePresence>
      <div
        id="auth-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-bg/80 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <motion.div
          id="auth-modal-content"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-brand-bg border border-brand-card/80 p-6 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Close Button */}
          <button
            id="auth-modal-close"
            onClick={handleClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-brand-card/50 text-brand-text transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>

          {/* Heading */}
          <div id="auth-modal-header" className="text-center mb-6">
            <h2 id="auth-modal-title" className="font-display text-2xl font-black text-[#ef4444] mb-1">
              {mode === 'login' && 'Welcome Back'}
              {mode === 'register' && 'Join ArwalEats'}
              {mode === 'forgot' && 'Reset Password'}
            </h2>
            <p id="auth-modal-subtitle" className="text-sm text-brand-text-sec font-medium">
              {mode === 'login' && 'Log in to order hot, fresh, fast delivery'}
              {mode === 'register' && 'Create your customer profile to start ordering'}
              {mode === 'forgot' && 'Enter your email to receive a password reset link'}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div id="auth-modal-tabs" className="flex rounded-2xl bg-brand-card/40 p-1 mb-6 border border-brand-card/50">
            <button
              id="auth-tab-login"
              type="button"
              onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'login' ? 'bg-[#ef4444] text-white shadow-md' : 'text-brand-text-sec hover:text-brand-text'
              }`}
            >
              Sign In
            </button>
            <button
              id="auth-tab-register"
              type="button"
              onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                mode === 'register' ? 'bg-[#ef4444] text-white shadow-md' : 'text-brand-text-sec hover:text-brand-text'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Banners */}
          {errorMsg && (
            <div id="auth-modal-error" className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs font-semibold text-rose-500 flex items-start gap-2">
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div id="auth-modal-success" className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs font-semibold text-emerald-400 flex items-start gap-2">
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Content */}
          <form id="auth-modal-form" onSubmit={handleSubmit} className="space-y-4">
            {/* GOOGLE SIGN IN BUTTON */}
            {(mode === 'login' || mode === 'register') && (
              <>
                <button
                  id="auth-btn-google"
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isBusy}
                  className="w-full py-3.5 px-4 rounded-2xl bg-white text-gray-800 font-bold border border-gray-200 shadow-md hover:bg-gray-50 flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="flex items-center my-4">
                  <div className="flex-1 border-t border-brand-card/60" />
                  <span className="px-3 text-[11px] font-bold text-brand-text-sec uppercase">or with email</span>
                  <div className="flex-1 border-t border-brand-card/60" />
                </div>
              </>
            )}

            {/* REGISTER EXTRA FIELDS */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 text-brand-text-sec" size={18} />
                  <input
                    id="auth-input-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                    disabled={isBusy}
                    className="w-full pl-10 pr-4 py-3 bg-brand-card/30 border border-brand-card rounded-2xl text-sm font-semibold text-brand-text focus:outline-none focus:border-[#ef4444]"
                  />
                </div>
              </div>
            )}

            {/* EMAIL INPUT */}
            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 text-brand-text-sec" size={18} />
                  <input
                    id="auth-input-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    required
                    disabled={isBusy}
                    className="w-full pl-10 pr-4 py-3 bg-brand-card/30 border border-brand-card rounded-2xl text-sm font-semibold text-brand-text focus:outline-none focus:border-[#ef4444]"
                  />
                </div>
              </div>
            )}

            {/* REGISTER PHONE FIELD */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-bold text-brand-text mb-1">Mobile Phone Number *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-xs font-bold text-brand-text-sec">+91</span>
                  <input
                    id="auth-input-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="9876543210"
                    maxLength={10}
                    required
                    disabled={isBusy}
                    className="w-full pl-12 pr-4 py-3 bg-brand-card/30 border border-brand-card rounded-2xl text-sm font-semibold text-brand-text focus:outline-none focus:border-[#ef4444]"
                  />
                </div>
              </div>
            )}

            {/* PASSWORD INPUT */}
            {(mode === 'login' || mode === 'register') && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-brand-text">Password *</label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="text-xs font-bold text-[#ef4444] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 text-brand-text-sec" size={18} />
                  <input
                    id="auth-input-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isBusy}
                    className="w-full pl-10 pr-10 py-3 bg-brand-card/30 border border-brand-card rounded-2xl text-sm font-semibold text-brand-text focus:outline-none focus:border-[#ef4444]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-brand-text-sec hover:text-brand-text cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {/* REGISTER ADDRESS & PINCODE */}
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-brand-text mb-1">Delivery Address *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-3.5 text-brand-text-sec" size={18} />
                    <input
                      id="auth-input-address"
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Flat, House no., Area, Landmark"
                      required
                      disabled={isBusy}
                      className="w-full pl-10 pr-4 py-3 bg-brand-card/30 border border-brand-card rounded-2xl text-sm font-semibold text-brand-text focus:outline-none focus:border-[#ef4444]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-brand-text mb-1">City</label>
                    <input
                      id="auth-input-city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled
                      className="w-full px-4 py-3 bg-brand-card/20 border border-brand-card/40 rounded-2xl text-sm font-semibold text-brand-text-sec cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-text mb-1">Pincode *</label>
                    <input
                      id="auth-input-pincode"
                      type="text"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="804401"
                      maxLength={6}
                      required
                      disabled={isBusy}
                      className="w-full px-4 py-3 bg-brand-card/30 border border-brand-card rounded-2xl text-sm font-semibold text-brand-text focus:outline-none focus:border-[#ef4444]"
                    />
                  </div>
                </div>
              </>
            )}

            {/* SUBMIT BUTTON */}
            <button
              id="auth-btn-submit"
              type="submit"
              disabled={isBusy}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#ef4444] to-[#f43f5e] hover:from-[#e11d48] hover:to-[#db2777] text-white font-bold shadow-xl shadow-rose-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-4"
            >
              {isBusy ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'register' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                </span>
              )}
            </button>
          </form>

          {/* BACK TO LOGIN FOOTER LINK */}
          {mode === 'forgot' && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs font-bold text-[#ef4444] hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
