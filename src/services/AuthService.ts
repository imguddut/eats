import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User,
  ConfirmationResult,
  RecaptchaVerifier
} from 'firebase/auth';
import { auth, googleProvider, isFirebaseConfigured } from '../firebase';

/**
 * Custom AuthError class preserving both Firebase error code and user-friendly message
 */
export class AuthError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}

/**
 * Interface representing standard Firebase Auth error objects
 */
export interface FirebaseErrorLike {
  code?: string;
  message?: string;
}

/**
 * Friendly error message translator for Firebase Authentication error codes
 */
export function getFriendlyAuthErrorMessage(errorCode: string, fallbackMessage?: string): string {
  switch (errorCode) {
    case 'auth/configuration-not-found':
      return 'Authentication provider not enabled in Firebase Console. Please open Firebase Console -> Authentication -> Sign-in method, enable Email/Password, Google, or Phone provider, and add localhost to Authorized Domains.';
    case 'auth/operation-not-allowed':
      return 'SMS sending is restricted for this region or provider is disabled. Please open Firebase Console -> Authentication -> Settings -> SMS Region Policy and enable India (+91), or add your number under "Phone numbers for testing".';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please log in.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/too-many-requests':
      return 'Too many unsuccessful attempts. Please try again later.';
    case 'auth/invalid-verification-code':
      return 'Invalid verification code. Please check the OTP and try again.';
    case 'auth/code-expired':
      return 'OTP verification code has expired. Please request a new code.';
    case 'auth/invalid-phone-number':
      return 'Please enter a valid 10-digit mobile phone number.';
    case 'auth/network-request-failed':
      return 'Network connection failed. Please check your internet connection.';
    default:
      return fallbackMessage || 'Authentication operation failed. Please try again.';
  }
}

function handleAuthError(err: unknown): never {
  const fbErr = err as FirebaseErrorLike;
  const code = fbErr?.code || 'auth/unknown';
  const message = getFriendlyAuthErrorMessage(code, fbErr?.message);
  throw new AuthError(code, message);
}

export const AuthService = {
  /**
   * Check if live Firebase configuration is active
   */
  isConfigured(): boolean {
    return isFirebaseConfigured;
  },

  /**
   * Sign up with Email and Password
   */
  async signUpWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      return userCredential.user;
    } catch (err: unknown) {
      handleAuthError(err);
    }
  },

  /**
   * Sign in with Email and Password
   */
  async signInWithEmail(email: string, password: string): Promise<User> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return userCredential.user;
    } catch (err: unknown) {
      handleAuthError(err);
    }
  },

  /**
   * Sign in with Google Popup
   */
  async signInWithGoogle(): Promise<User> {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      return userCredential.user;
    } catch (err: unknown) {
      handleAuthError(err);
    }
  },

  /**
   * Send Phone OTP using RecaptchaVerifier
   */
  async sendPhoneOtp(phoneNumber: string, recaptchaVerifier: RecaptchaVerifier): Promise<ConfirmationResult> {
    try {
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+91${formattedPhone.replace(/\D/g, '')}`;
      }
      return await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
    } catch (err: unknown) {
      handleAuthError(err);
    }
  },

  /**
   * Verify OTP Code using ConfirmationResult
   */
  async verifyPhoneOtp(confirmationResult: ConfirmationResult, otpCode: string): Promise<User> {
    try {
      const userCredential = await confirmationResult.confirm(otpCode.trim());
      return userCredential.user;
    } catch (err: unknown) {
      handleAuthError(err);
    }
  },

  /**
   * Send Password Reset Email
   */
  async sendPasswordReset(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err: unknown) {
      handleAuthError(err);
    }
  },

  /**
   * Sign out current user
   */
  async logoutUser(): Promise<void> {
    try {
      await signOut(auth);
    } catch (err: unknown) {
      console.error("[AuthService] Logout error:", err);
      handleAuthError(err);
    }
  },

  /**
   * Listen to Firebase auth state changes
   */
  onAuthChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Get current active Firebase user
   */
  getCurrentUser(): User | null {
    return auth.currentUser;
  }
};
