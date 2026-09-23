'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { X, Mail, Lock, User, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function isRateLimitError(error: unknown): boolean {
  if (!error) return false;
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  const status = (error as { status?: number })?.status;
  const code = String((error as { code?: string })?.code || '').toLowerCase();

  return (
    status === 429 ||
    code === 'over_email_send_rate_limit' ||
    msg.includes('rate limit') ||
    msg.includes('over_email_send_rate_limit') ||
    msg.includes('too many requests') ||
    msg.includes('429')
  );
}

function isExistingUserError(error: unknown): boolean {
  if (!error) return false;
  const msg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    msg.includes('user already registered') ||
    msg.includes('already exists') ||
    msg.includes('identity already exists')
  );
}

function translateAuthError(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid email or password')
  ) {
    return 'Email or password is incorrect.';
  }
  if (isExistingUserError(error)) {
    return 'An account with this email may already exist.';
  }
  if (lower.includes('password should be at least') || lower.includes('weak password')) {
    return 'Please choose a stronger password (minimum 6 characters).';
  }
  if (
    lower.includes('valid email') ||
    lower.includes('invalid email') ||
    lower.includes('email format')
  ) {
    return 'Enter a valid email address.';
  }
  if (isRateLimitError(error)) {
    return 'Email verification is temporarily unavailable. Please wait a little while and try again.';
  }
  if (
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('failed to fetch') ||
    lower.includes('connection')
  ) {
    return 'Unable to reach the server. Please check your connection.';
  }

  return 'Something went wrong. Please try again.';
}

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    user,
    session,
    signIn,
    signUp,
    signOut,
    authModalMode,
    setAuthModalMode,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showForgotNotice, setShowForgotNotice] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isEmailConfirmationPending, setIsEmailConfirmationPending] = useState(false);
  const [isExistingUser, setIsExistingUser] = useState(false);

  // Sync mode with context
  useEffect(() => {
    if (authModalMode) {
      setMode(authModalMode);
    }
  }, [authModalMode]);

  // Reset state on open/close
  useEffect(() => {
    if (isAuthModalOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setShowForgotNotice(false);
      setIsRateLimited(false);
      setIsEmailConfirmationPending(false);
      setIsExistingUser(false);
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setAuthModalMode?.(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowForgotNotice(false);
    setIsRateLimited(false);
    setIsEmailConfirmationPending(false);
    setIsExistingUser(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setErrorMsg('Enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsExistingUser(false);

    try {
      const { error } = await signIn(trimmedEmail, password);
      if (error) {
        setErrorMsg(translateAuthError(error));
      } else {
        setSuccessMsg('Welcome back! Signed in successfully.');
        setTimeout(() => {
          closeAuthModal();
        }, 700);
      }
    } catch (err: unknown) {
      setErrorMsg(translateAuthError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!trimmedEmail) {
      setErrorMsg('Please enter your email address.');
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setErrorMsg('Enter a valid email address.');
      return;
    }
    if (!password || password.trim().length < 6) {
      setErrorMsg('Please enter a valid password (minimum 6 characters).');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsRateLimited(false);
    setIsExistingUser(false);

    try {
      const { data, error } = await signUp(trimmedEmail, password, trimmedName);

      if (error) {
        if (isRateLimitError(error)) {
          // Distinct Rate-Limit Error Handling
          setIsRateLimited(true);
        } else if (isExistingUserError(error)) {
          // Existing User Handling
          setIsExistingUser(true);
          setErrorMsg('An account with this email may already exist.');
        } else {
          setErrorMsg(translateAuthError(error));
        }
      } else {
        if (data?.session) {
          // Instant session (email confirmation off)
          setSuccessMsg('Welcome to ROLEWISE! Account created.');
          setTimeout(() => {
            closeAuthModal();
          }, 800);
        } else {
          // Confirmation email dispatched
          setIsEmailConfirmationPending(true);
        }
      }
    } catch (err: unknown) {
      if (isRateLimitError(err)) {
        setIsRateLimited(true);
      } else {
        setErrorMsg(translateAuthError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setShowForgotNotice(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[3px] transition-all animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) {
          closeAuthModal();
        }
      }}
    >
      <div className="bg-white rounded-[20px] border border-[#E7E8EF] shadow-2xl max-w-[440px] w-full p-6 sm:p-8 relative animate-in fade-in zoom-in-95 duration-200">
        {/* Subtle Close Button */}
        <button
          onClick={closeAuthModal}
          disabled={isLoading}
          className="absolute top-5 right-5 text-[#667085] hover:text-[#1F2937] p-1.5 rounded-full hover:bg-[#F7F7FB] transition-colors touch-target disabled:opacity-40"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header & Branding */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#6D5DFB] flex items-center justify-center text-white font-bold text-xs shadow-sm">
              R
            </div>
            <span className="font-semibold text-xs tracking-wider text-[#6D5DFB] uppercase">
              ROLEWISE
            </span>
          </div>

          {session ? (
            <div>
              <h2 className="text-xl font-bold text-[#1F2937] tracking-tight">Your Account</h2>
              <p className="text-sm text-[#667085] mt-1">Manage your active ROLEWISE session.</p>
            </div>
          ) : isRateLimited ? (
            <div>
              <h2 className="text-xl font-bold text-[#1F2937] tracking-tight">
                Verification Unavailable
              </h2>
              <p className="text-sm text-[#667085] mt-1">
                Email verification is temporarily paused.
              </p>
            </div>
          ) : isEmailConfirmationPending ? (
            <div>
              <h2 className="text-2xl font-bold text-[#1F2937] tracking-tight">Account created</h2>
              <p className="text-sm text-[#667085] mt-1">
                Check your email to verify your account before signing in.
              </p>
            </div>
          ) : mode === 'signin' ? (
            <div>
              <h2 className="text-2xl font-bold text-[#1F2937] tracking-tight">Welcome back</h2>
              <p className="text-sm text-[#667085] mt-1">
                Sign in to continue preparing for your next role.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-[#1F2937] tracking-tight">
                Create your account
              </h2>
              <p className="text-sm text-[#667085] mt-1">
                Start preparing for the role you actually want.
              </p>
            </div>
          )}
        </div>

        {/* State 1: Rate Limit Error State */}
        {isRateLimited ? (
          <div className="space-y-5 animate-in fade-in">
            <div className="p-4 rounded-xl bg-[#FFF5DF] border border-[#FCE6BD] text-[#C58A2B] space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <p className="font-semibold text-sm">
                  Email verification is temporarily unavailable.
                </p>
              </div>
              <p className="text-xs leading-relaxed text-[#7A5416]">
                Please wait a while before trying again. If you already have an account, you can sign in directly.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => setIsRateLimited(false)}
                className="w-full py-2.5 sm:py-3 bg-white hover:bg-[#F7F7FB] text-[#1F2937] text-sm font-semibold rounded-xl border border-[#E7E8EF] transition-all touch-target"
              >
                Try again later
              </button>
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="w-full py-2.5 sm:py-3 bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-sm font-semibold rounded-xl transition-all shadow-sm touch-target"
              >
                Back to sign in
              </button>
            </div>
          </div>
        ) : isEmailConfirmationPending ? (
          /* State 2: Email Confirmation Sent Screen */
          <div className="space-y-5 animate-in fade-in">
            <div className="p-4 rounded-xl bg-[#EAF6F0] border border-[#CEEBDF] text-[#4E9B76] space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="font-semibold text-sm">Account created successfully.</p>
              </div>
              <p className="text-xs text-[#2E6B4F] leading-relaxed">
                Check your email to verify your account before signing in.
              </p>
            </div>

            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="w-full py-2.5 sm:py-3 bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-sm font-semibold rounded-xl transition-all shadow-sm touch-target"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          /* State 3: Normal Sign In or Sign Up Form */
          <>
            {/* Error Alert Banner */}
            {errorMsg && (
              <div className="mb-4 p-3.5 rounded-xl text-xs sm:text-sm bg-[#FFF0ED] text-[#E87967] border border-[#FBD2CB] space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
                {isExistingUser && (
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="text-xs font-semibold text-[#6D5DFB] hover:underline block pt-0.5"
                  >
                    Sign in instead →
                  </button>
                )}
              </div>
            )}

            {/* Success Alert Banner */}
            {successMsg && (
              <div className="mb-4 p-3.5 rounded-xl text-xs sm:text-sm bg-[#EAF6F0] text-[#4E9B76] border border-[#CEEBDF] flex items-center gap-2.5 font-medium animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Active User Session */}
            {session ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-full bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center font-bold text-sm">
                    {user?.email ? user.email[0].toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#667085]">Signed in as</p>
                    <p className="text-sm font-semibold text-[#1F2937] truncate">{user?.email}</p>
                    <p className="text-xs text-[#4E9B76] mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Ready to prepare
                    </p>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await signOut();
                    switchMode('signin');
                  }}
                  className="w-full py-2.5 text-sm font-medium text-[#E87967] hover:bg-[#FFF0ED] border border-[#FBD2CB] rounded-xl transition-colors touch-target"
                >
                  Sign out
                </button>
              </div>
            ) : mode === 'signin' ? (
              /* Sign In Form */
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      autoFocus
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E7E8EF] bg-white text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#6D5DFB] focus:ring-1 focus:ring-[#6D5DFB] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#1F2937]">Password</label>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-[#6D5DFB] hover:underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E7E8EF] bg-white text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#6D5DFB] focus:ring-1 focus:ring-[#6D5DFB] transition-all"
                    />
                  </div>
                </div>

                {showForgotNotice && (
                  <div className="p-3 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] text-xs text-[#667085] animate-in fade-in">
                    Enter your email address above to check password recovery or contact support.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 sm:py-3 bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed touch-target flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </button>

                <div className="pt-2 text-center text-xs text-[#667085]">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-semibold text-[#6D5DFB] hover:underline transition-colors"
                  >
                    Create account
                  </button>
                </div>
              </form>
            ) : (
              /* Sign Up Form */
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your name"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E7E8EF] bg-white text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#6D5DFB] focus:ring-1 focus:ring-[#6D5DFB] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E7E8EF] bg-white text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#6D5DFB] focus:ring-1 focus:ring-[#6D5DFB] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F2937] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-[#E7E8EF] bg-white text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#6D5DFB] focus:ring-1 focus:ring-[#6D5DFB] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 sm:py-3 bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-sm font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed touch-target flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Creating account...' : 'Create account'}
                </button>

                <div className="pt-2 text-center text-xs text-[#667085]">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-semibold text-[#6D5DFB] hover:underline transition-colors"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};
