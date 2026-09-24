'use client';

import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Layers,
  Code2,
  Palette,
  Laptop,
  Loader2,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Provider } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';

export const AuthView: React.FC = () => {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      const errDesc = params.get('error_description');

      if (err) {
        if (
          err === 'access_denied' ||
          errDesc?.toLowerCase().includes('user denied') ||
          errDesc?.toLowerCase().includes('cancel')
        ) {
          return 'Sign-in was cancelled. Please try again when ready.';
        } else if (err === 'google_failed') {
          return 'Google sign-in could not be completed. Please try again.';
        } else if (err === 'linkedin_failed') {
          return 'LinkedIn sign-in could not be completed. Please try again.';
        } else {
          return 'Sign-in could not be completed. Please try again.';
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
    return null;
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          setErrorMessage(error.message || 'Invalid login credentials. Please check your email and password.');
        } else {
          setSuccessMessage('Signed in successfully! Entering workspace...');
        }
      } else {
        const { data, error } = await signUp(email.trim(), password, fullName.trim() || undefined);
        if (error) {
          setErrorMessage(error.message || 'Could not create account. Please try again.');
        } else if (data?.session) {
          setSuccessMessage('Account created! Entering workspace...');
        } else {
          // If Supabase didn't issue an immediate session, attempt signIn
          const { error: signInErr } = await signIn(email.trim(), password);
          if (signInErr) {
            setSuccessMessage('Account created! Please check your email to verify your account, or sign in.');
          } else {
            setSuccessMessage('Account created! Entering workspace...');
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during authentication.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const [socialLoading, setSocialLoading] = useState<'Google' | 'LinkedIn' | null>(null);

  const handleSocialAuth = async (provider: 'Google' | 'LinkedIn') => {
    if (socialLoading || isLoading) return;
    setSocialLoading(provider);
    setErrorMessage(null);
    setSuccessMessage(null);

    const callbackUrl =
      typeof window !== 'undefined'
        ? `${window.location.origin}/auth/callback`
        : '/auth/callback';

    try {
      const supabase = getSupabaseClient();
      let error: { message: string } | null = null;

      if (provider === 'Google') {
        const res = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: callbackUrl,
          },
        });
        error = res.error;
      } else {
        // LinkedIn OpenID Connect (primary)
        const res = await supabase.auth.signInWithOAuth({
          provider: 'linkedin_oidc',
          options: {
            redirectTo: callbackUrl,
          },
        });
        error = res.error;

        // Fallback to legacy 'linkedin' provider if 'linkedin_oidc' is unconfigured
        if (
          error &&
          (error.message.toLowerCase().includes('not enabled') ||
            error.message.toLowerCase().includes('unsupported provider'))
        ) {
          const fallbackRes = await supabase.auth.signInWithOAuth({
            provider: 'linkedin' as Provider,
            options: {
              redirectTo: callbackUrl,
            },
          });
          if (!fallbackRes.error) {
            error = null;
          } else {
            error = fallbackRes.error;
          }
        }
      }

      if (error) {
        console.error(`[Rolewise] ${provider} OAuth error:`, error.message);
        const isNotEnabled =
          error.message.toLowerCase().includes('not enabled') ||
          error.message.toLowerCase().includes('unsupported provider') ||
          error.message.toLowerCase().includes('invalid provider');

        if (isNotEnabled) {
          setErrorMessage(
            `${provider} sign-in is not enabled in your Supabase project. Please configure ${provider} provider in the Supabase dashboard.`
          );
        } else {
          setErrorMessage(`${provider} sign-in could not be completed. Please try again.`);
        }
        setSocialLoading(null);
      }
    } catch (err: unknown) {
      console.error(`[Rolewise] ${provider} OAuth exception:`, err);
      setErrorMessage(`${provider} sign-in could not be completed. Please try again.`);
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F7F7FB]">
      {/* LEFT SHOWCASE PANEL (Desktop 1440px / Tablet 1024px) */}
      <div className="w-full lg:w-[48%] bg-white border-b lg:border-b-0 lg:border-r border-[#E7E8EF] p-8 sm:p-12 lg:p-16 flex flex-col justify-between relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#EEECFF] rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#EAF6F0] rounded-full blur-3xl opacity-40 -ml-20 -mb-20 pointer-events-none" />

        {/* Brand Header */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-2xl bg-[#6D5DFB] flex items-center justify-center text-white font-bold text-lg shadow-sm">
            R
          </div>
          <span className="font-bold text-xl tracking-tight text-[#1F2937]">ROLEWISE</span>
        </div>

        {/* Center Hero Content */}
        <div className="my-10 sm:my-14 relative z-10 space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-[#1F2937] leading-[1.2] tracking-tight">
              Get Interview Ready <br />
              <span className="text-[#6D5DFB]">for your next role</span>
            </h1>
            <p className="text-base sm:text-lg font-medium text-[#667085]">
              Practice · Improve · Get Hired
            </p>
          </div>

          {/* Interactive Role Badges Graphic */}
          <div className="pt-4 pb-2">
            <div className="bg-[#F7F7FB] border border-[#E7E8EF] rounded-2xl p-6 sm:p-8 space-y-5 relative">
              <div className="flex items-center justify-between text-xs font-semibold text-[#667085] uppercase tracking-wider">
                <span>Targeted Role Preparation</span>
                <span className="text-[#6D5DFB]">AI Powered</span>
              </div>

              {/* Floating Role Badges */}
              <div className="flex flex-wrap gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E7E8EF] text-xs font-semibold text-[#1F2937] shadow-xs">
                  <Palette className="w-3.5 h-3.5 text-[#6D5DFB]" />
                  UI/UX Designer
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E7E8EF] text-xs font-semibold text-[#1F2937] shadow-xs">
                  <Layers className="w-3.5 h-3.5 text-[#4E9B76]" />
                  Product Designer
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E7E8EF] text-xs font-semibold text-[#1F2937] shadow-xs">
                  <Code2 className="w-3.5 h-3.5 text-[#6D5DFB]" />
                  Software Engineer
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E7E8EF] text-xs font-semibold text-[#1F2937] shadow-xs">
                  <Briefcase className="w-3.5 h-3.5 text-[#C58A2B]" />
                  Product Manager
                </span>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#E7E8EF] text-xs font-semibold text-[#1F2937] shadow-xs">
                  <Laptop className="w-3.5 h-3.5 text-[#667085]" />
                  Marketing Designer
                </span>
              </div>

              {/* Tagline Box */}
              <div className="pt-2 border-t border-[#E7E8EF] flex items-center justify-between text-xs text-[#667085]">
                <span>“Prepare for the role. Not just the interview.”</span>
                <span className="text-[#4E9B76] font-semibold">2026 SaaS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-[#667085]">
          <CheckCircle2 className="w-4 h-4 text-[#4E9B76]" />
          <span>Qualitative assessment without arbitrary readiness scores</span>
        </div>
      </div>

      {/* RIGHT AUTH FORM SURFACE */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-[440px] space-y-7">
          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight">
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-sm text-[#667085]">
              {mode === 'signin'
                ? 'Sign in to access your role-specific preparation.'
                : 'Join ROLEWISE to connect your experience to role requirements.'}
            </p>
          </div>

          {/* Error / Success Banners */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FFF0ED] border border-[#FCDAD5] text-xs sm:text-sm text-[#E87967] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-[#EAF6F0] border border-[#CEECD9] text-xs sm:text-sm text-[#4E9B76] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#1F2937]">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#E7E8EF] text-sm text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#6D5DFB]/20 focus:border-[#6D5DFB] transition-all bg-white"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1F2937]">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#E7E8EF] text-sm text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#6D5DFB]/20 focus:border-[#6D5DFB] transition-all bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#1F2937]">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-[#E7E8EF] text-sm text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#6D5DFB]/20 focus:border-[#6D5DFB] transition-all bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#667085] hover:text-[#1F2937] transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot Password */}
            {mode === 'signin' && (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-[#667085] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#6D5DFB] border-[#E7E8EF] focus:ring-[#6D5DFB]"
                  />
                  <span>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('Password reset instructions will be sent to your email.');
                  }}
                  className="text-[#6D5DFB] hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full touch-target h-12 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isLoading ? (
                  <span>Processing...</span>
                ) : (
                  <span>{mode === 'signin' ? 'Login' : 'Create Account'}</span>
                )}
              </button>
            </div>
          </form>

          {/* Social Separator */}
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-[#E7E8EF]" />
            <span className="absolute bg-[#F7F7FB] px-3 text-xs text-[#667085]">or</span>
          </div>

          {/* Social Auth Actions */}
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => handleSocialAuth('Google')}
              disabled={isLoading || socialLoading !== null}
              className="w-full touch-target h-11 rounded-xl bg-white border border-[#E7E8EF] hover:bg-[#F9FAFB] text-xs sm:text-sm font-medium text-[#1F2937] transition-all flex items-center justify-center gap-2.5 shadow-2xs disabled:opacity-60 cursor-pointer"
            >
              {socialLoading === 'Google' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#667085]" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSocialAuth('LinkedIn')}
              disabled={isLoading || socialLoading !== null}
              className="w-full touch-target h-11 rounded-xl bg-white border border-[#E7E8EF] hover:bg-[#F9FAFB] text-xs sm:text-sm font-medium text-[#1F2937] transition-all flex items-center justify-center gap-2.5 shadow-2xs disabled:opacity-60 cursor-pointer"
            >
              {socialLoading === 'LinkedIn' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#0A66C2]" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-[#0A66C2]" viewBox="0 0 24 24">
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                  <span>Continue with LinkedIn</span>
                </>
              )}
            </button>
          </div>

          {/* Toggle Sign In / Create Account */}
          <div className="text-center text-xs text-[#667085]">
            {mode === 'signin' ? (
              <p>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                  }}
                  className="text-[#6D5DFB] font-semibold hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                  }}
                  className="text-[#6D5DFB] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          {/* Terms Notice */}
          <p className="text-[11px] text-[#98A2B3] text-center leading-relaxed">
            By continuing, you agree to our{' '}
            <span className="underline cursor-pointer">Terms of Service</span> and{' '}
            <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
};
