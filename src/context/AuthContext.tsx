import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';
import { Customer } from '../types';
import { AuthService, AuthError } from '../services/AuthService';
import { CustomerApi } from '../services/CustomerApi';
import { ProfileService } from '../services/ProfileService';
import { initFirebasePersistence } from '../firebase';

interface AuthContextType {
  // User state
  currentUser: Customer | null;
  firebaseUser: User | null;
  isAuthenticated: boolean;
  
  // Loading & Error states
  isInitializing: boolean;
  isLoading: boolean;
  loading: boolean; // Aliased to (isInitializing || isLoading) for 100% backward compatibility
  error: string | null;
  errorCode: string | null;

  // Authentication methods
  signUp: (customerData: Omit<Customer, 'customerId' | 'createdAt'> & { password?: string }) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPhoneOtp: (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier) => Promise<ConfirmationResult>;
  verifyPhoneOtp: (confirmationResult: ConfirmationResult, otpCode: string, extraData?: Partial<Customer>) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  updateProfile: (updatedData: Partial<Customer>) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Customer | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);

  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Backward compatible loading boolean & authentication check
  const loading = isInitializing || isLoading;
  const isAuthenticated = Boolean(currentUser && firebaseUser);

  const clearError = () => {
    setError(null);
    setErrorCode(null);
  };

  const handleCatchError = (err: unknown, defaultMessage: string) => {
    if (err instanceof AuthError) {
      setError(err.message);
      setErrorCode(err.code);
    } else if (err instanceof Error) {
      setError(err.message);
      setErrorCode(null);
    } else {
      setError(defaultMessage);
      setErrorCode(null);
    }
  };

  // Session restoration via onAuthStateChanged (Single Source of Truth)
  useEffect(() => {
    let isMounted = true;

    async function setupAuth() {
      if (!AuthService.isConfigured()) {
        console.warn("[AuthContext] Firebase is not configured with valid credentials. Skipping session restoration.");
        if (isMounted) {
          setIsInitializing(false);
        }
        return () => {};
      }

      try {
        await initFirebasePersistence();
      } catch (err) {
        console.error("[AuthContext] Failed to initialize persistence:", err);
      }

      try {
        const unsubscribe = AuthService.onAuthChange(async (user) => {
          if (!isMounted) return;
          setFirebaseUser(user);

          if (user) {
            try {
              const customerProfile = await ProfileService.syncCustomerProfile(user);
              if (isMounted) {
                setCurrentUser(customerProfile);
              }
            } catch (err) {
              console.error("[AuthContext] Profile sync error on auth change:", err);
              if (isMounted) {
                setCurrentUser(null);
              }
            }
          } else {
            if (isMounted) {
              setCurrentUser(null);
            }
          }

          if (isMounted) {
            setIsInitializing(false);
          }
        });

        return unsubscribe;
      } catch (err) {
        console.error("[AuthContext] Error setting up onAuthChange listener:", err);
        if (isMounted) {
          setIsInitializing(false);
        }
        return () => {};
      }
    }

    const unsubscribePromise = setupAuth();

    // Fallback safeguard timer to guarantee initialization completes within 1.5 seconds regardless of network
    const fallbackTimeout = setTimeout(() => {
      if (isMounted && isInitializing) {
        setIsInitializing(false);
      }
    }, 1500);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimeout);
      unsubscribePromise.then((unsub) => {
        if (unsub) unsub();
      });
    };
  }, []);

  // Email & Password Signup
  const signUp = async (customerData: Omit<Customer, 'customerId' | 'createdAt'> & { password?: string }) => {
    if (!AuthService.isConfigured()) {
      throw new Error("Firebase Authentication is not configured. Please add VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID to your .env file.");
    }

    setIsLoading(true);
    clearError();
    try {
      const emailClean = customerData.email.toLowerCase().trim();
      const password = customerData.password || '';

      // 1. Firebase Auth Signup
      const user = await AuthService.signUpWithEmail(emailClean, password);

      // 2. Sync Customer Profile to Google Sheets
      const customerProfile = await ProfileService.syncCustomerProfile(user, customerData);
      setCurrentUser(customerProfile);
    } catch (err: unknown) {
      console.error("[AuthContext] SignUp Error:", err);
      handleCatchError(err, "Registration failed. Please try again.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Email & Password Sign In
  const signIn = async (emailOrPhone: string, password: string) => {
    if (!AuthService.isConfigured()) {
      throw new Error("Firebase Authentication is not configured. Please add VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID to your .env file.");
    }

    setIsLoading(true);
    clearError();
    try {
      const inputClean = emailOrPhone.toLowerCase().trim();

      // 1. Firebase Auth Login
      const user = await AuthService.signInWithEmail(inputClean, password);

      // 2. Sync Customer Profile from Google Sheets
      const customerProfile = await ProfileService.syncCustomerProfile(user);
      setCurrentUser(customerProfile);
    } catch (err: unknown) {
      console.error("[AuthContext] SignIn Error:", err);
      handleCatchError(err, "Sign in failed. Please check your credentials.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Google Sign In
  const signInWithGoogle = async () => {
    if (!AuthService.isConfigured()) {
      throw new Error("Firebase Authentication is not configured. Please add VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID to your .env file.");
    }

    setIsLoading(true);
    clearError();
    try {
      // 1. Firebase Google Popup Sign-in
      const user = await AuthService.signInWithGoogle();

      // 2. Sync Customer Profile
      const customerProfile = await ProfileService.syncCustomerProfile(user);
      setCurrentUser(customerProfile);
    } catch (err: unknown) {
      console.error("[AuthContext] Google Sign-In Error:", err);
      handleCatchError(err, "Google Sign-In failed.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Send Phone OTP
  const sendPhoneOtp = async (phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> => {
    if (!AuthService.isConfigured()) {
      throw new Error("Firebase Authentication is not configured. Please add VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID to your .env file.");
    }

    setIsLoading(true);
    clearError();
    try {
      return await AuthService.sendPhoneOtp(phoneNumber, recaptchaVerifier);
    } catch (err: unknown) {
      console.error("[AuthContext] Send Phone OTP Error:", err);
      handleCatchError(err, "Failed to send OTP.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Verify Phone OTP
  const verifyPhoneOtp = async (confirmationResult: ConfirmationResult, otpCode: string, extraData?: Partial<Customer>) => {
    if (!AuthService.isConfigured()) {
      throw new Error("Firebase Authentication is not configured. Please add VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID to your .env file.");
    }

    setIsLoading(true);
    clearError();
    try {
      const user = await AuthService.verifyPhoneOtp(confirmationResult, otpCode);

      // Sync Customer Profile
      const customerProfile = await ProfileService.syncCustomerProfile(user, extraData);
      setCurrentUser(customerProfile);
    } catch (err: unknown) {
      console.error("[AuthContext] Verify Phone OTP Error:", err);
      handleCatchError(err, "Invalid OTP code.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Reset
  const resetPassword = async (email: string) => {
    if (!AuthService.isConfigured()) {
      throw new Error("Firebase Authentication is not configured. Please add VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID to your .env file.");
    }

    setIsLoading(true);
    clearError();
    try {
      await AuthService.sendPasswordReset(email);
    } catch (err: unknown) {
      console.error("[AuthContext] Reset Password Error:", err);
      handleCatchError(err, "Failed to send password reset email.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Resend Email Verification (Placeholder for API contract compatibility)
  const resendVerification = async () => {
    clearError();
    throw new Error("Email verification is managed via Firebase Console.");
  };

  // Logout Flow - Single source of truth via Firebase signOut()
  const logout = async () => {
    setIsLoading(true);
    try {
      if (AuthService.isConfigured() && firebaseUser) {
        await AuthService.logoutUser();
      }
      // onAuthStateChanged(null) triggers automatically to clear state
      window.dispatchEvent(new Event('arwaeatsin_logout'));
    } catch (err: unknown) {
      console.error("[AuthContext] Logout Error:", err);
      handleCatchError(err, "Failed to log out.");
    } finally {
      setIsLoading(false);
    }
  };

  // Backend-First Profile Updates
  const updateProfile = async (updatedData: Partial<Customer>) => {
    if (!currentUser || !currentUser.firebaseUid) {
      throw new Error("No authenticated customer profile available.");
    }

    setIsLoading(true);
    clearError();
    try {
      // 1. Send update request to Google Sheets backend first
      const res = await CustomerApi.updateCustomer({
        firebaseUid: currentUser.firebaseUid,
        name: updatedData.name,
        phone: updatedData.phone,
        address: updatedData.address,
        city: updatedData.city,
        pincode: updatedData.pincode
      });

      // 2. Only update local Context state upon backend success
      if (res && res.success && res.customer) {
        setCurrentUser(res.customer);
      } else {
        throw new Error(res?.message || "Failed to update profile on backend.");
      }
    } catch (err: unknown) {
      console.error("[AuthContext] Update Profile Error:", err);
      handleCatchError(err, "Failed to update profile.");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        isAuthenticated,
        isInitializing,
        isLoading,
        loading,
        error,
        errorCode,
        signUp,
        signIn,
        signInWithGoogle,
        sendPhoneOtp,
        verifyPhoneOtp,
        logout,
        resetPassword,
        resendVerification,
        updateProfile,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
