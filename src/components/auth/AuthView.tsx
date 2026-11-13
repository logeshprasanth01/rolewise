'use client';

import React, { useEffect, useRef, useState } from 'react';
/* eslint-disable @next/next/no-img-element */
import {
  FileText,
  ListChecks,
  Mic,
  Target,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase/client';
import type { Provider } from '@supabase/supabase-js';
import { useAuth } from '@/context/AuthContext';
import { playUiSound } from '@/lib/ui-sound';
import Link from 'next/link';
import { RolewiseLogo } from '@/components/brand/RolewiseLogo';
import { GlossyIcon } from '@/components/brand/GlossyIcon';

export const AuthView: React.FC = () => {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const glowHostRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const host = glowHostRef.current;
    const glow = glowRef.current;
    if (!host || !glow) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = host.getBoundingClientRect();
        glow.style.setProperty('--gx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(2)}%`);
        glow.style.setProperty('--gy', `${(((e.clientY - r.top) / r.height) * 100).toFixed(2)}%`);
        glow.dataset.active = 'true';
      });
    };
    const onLeave = () => {
      glow.dataset.active = 'false';
    };
    host.addEventListener('pointermove', onMove);
    host.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  // Read ?mode=signup after hydration so server and client render the same first frame.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (new URLSearchParams(window.location.search).get('mode') === 'signup') setMode('signup');
    });
    return () => cancelAnimationFrame(id);
  }, []);
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
          playUiSound('success');
        }
      } else {
        const { data, error } = await signUp(email.trim(), password, fullName.trim() || undefined);
        if (error) {
          setErrorMessage(error.message || 'Could not create account. Please try again.');
        } else if (data?.session) {
          setSuccessMessage('Account created! Entering workspace...');
          playUiSound('success');
        } else {
          // If Supabase didn't issue an immediate session, attempt signIn
          const { error: signInErr } = await signIn(email.trim(), password);
          if (signInErr) {
            setSuccessMessage('Account created! Please check your email to verify your account, or sign in.');
            playUiSound('success');
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
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F3F2EE]">
      {/* LEFT VISUAL PANEL: white, with the hero photo and glossy icons; a light yellow glow follows the pointer */}
      <div
        ref={glowHostRef}
        className="relative hidden w-full flex-col overflow-hidden border-r border-[#E4E2DA] bg-white p-10 lg:flex lg:w-[50%] xl:p-14"
      >
        <div ref={glowRef} className="rwa-glow" aria-hidden />

        <Link href="/welcome" aria-label="Rolewise home" className="relative z-10 block w-[150px]">
          <RolewiseLogo />
        </Link>

        <div className="relative z-10 my-auto pt-10">
          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="overflow-hidden rounded-[28px] border border-[#E4E2DA] bg-[#F3F2EE] shadow-[0_30px_60px_-30px_rgba(37,37,37,0.35)]">
              <img
                src="https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&w=1200&q=80"
                alt=""
                aria-hidden
                className="block aspect-[16/11] w-full object-cover"
              />
            </div>
            <div className="pointer-events-none absolute -left-8 top-[30%] rwl-float" aria-hidden>
              <GlossyIcon icon={FileText} tone="yellow" shape="hex" size={76} className="rw-tilt-l" />
            </div>
            <div className="pointer-events-none absolute -right-6 -top-8 rwl-float rwl-float-b" aria-hidden>
              <GlossyIcon icon={Target} tone="coral" shape="squircle" size={64} className="rw-tilt-r" />
            </div>
            <div className="pointer-events-none absolute -right-8 top-[48%] rwl-float rwl-float-c" aria-hidden>
              <GlossyIcon icon={Mic} tone="ink" shape="hex" size={70} />
            </div>
            <div className="pointer-events-none absolute left-[38%] -top-10 rwl-float rwl-float-c" aria-hidden>
              <GlossyIcon icon={ListChecks} tone="green" shape="squircle" size={56} className="rw-tilt-r" />
            </div>
          </div>

          <p className="mx-auto mt-12 max-w-[560px] text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-[#252525] [text-wrap:balance]">
            Prepare for the role, not just the interview.
          </p>
          <p className="mx-auto mt-2 max-w-[560px] text-[15px] text-[#5E6065]">Free during early access.</p>
        </div>
      </div>

      {/* RIGHT AUTH FORM SURFACE */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16">
        <div className="w-full max-w-[420px] space-y-7">
          <Link href="/welcome" aria-label="Rolewise home" className="block w-[140px] lg:hidden">
            <RolewiseLogo />
          </Link>
          {/* Header */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#252525] tracking-tight">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-sm text-[#73757A]">
              {mode === 'signin'
                ? 'Sign in to continue preparing.'
                : 'Free during early access.'}
            </p>
          </div>

          {/* Error / Success Banners */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FFF0ED] border border-[#F6D8D1] text-xs sm:text-sm text-[#D97968] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-xl bg-[#EEF7F0] border border-[#DDEEDF] text-xs sm:text-sm text-[#6FA77F] flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#252525]">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#73757A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="rw-input w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#D9D8D2] text-sm text-[#252525] placeholder:text-[#9A9B9E] focus:outline-none focus:ring-2 focus:ring-[#252525]/20 focus:border-[#252525] transition-all bg-white"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#252525]">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#73757A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="rw-input w-full pl-10 pr-3.5 py-3 rounded-xl border border-[#D9D8D2] text-sm text-[#252525] placeholder:text-[#9A9B9E] focus:outline-none focus:ring-2 focus:ring-[#252525]/20 focus:border-[#252525] transition-all bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#252525]">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#73757A] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="rw-input w-full pl-10 pr-11 py-3 rounded-xl border border-[#D9D8D2] text-sm text-[#252525] placeholder:text-[#9A9B9E] focus:outline-none focus:ring-2 focus:ring-[#252525]/20 focus:border-[#252525] transition-all bg-white"
                />
                <button data-ui-sound="click"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#73757A] hover:text-[#252525] transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot Password */}
            {mode === 'signin' && (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-[#73757A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rw-input w-4 h-4 rounded text-[#252525] border-[#D9D8D2] focus:ring-[#252525]"
                  />
                  <span>Remember me</span>
                </label>
                <button data-ui-sound="click"
                  type="button"
                  onClick={() => {
                    setErrorMessage('Password reset instructions will be sent to your email.');
                  }}
                  className="text-[#252525] hover:underline font-medium"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2">
              <button data-ui-sound="click"
                type="submit"
                disabled={isLoading}
                className="w-full touch-target h-12 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-sm font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
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
            <div className="w-full border-t border-[#D9D8D2]" />
            <span className="absolute bg-[#F3F2EE] px-3 text-xs text-[#73757A]">or</span>
          </div>

          {/* Social Auth Actions */}
          <div className="space-y-2.5">
            <button data-ui-sound="click"
              type="button"
              onClick={() => handleSocialAuth('Google')}
              disabled={isLoading || socialLoading !== null}
              className="w-full touch-target h-11 rounded-xl bg-white border border-[#D9D8D2] hover:bg-[#FAF9F4] text-xs sm:text-sm font-medium text-[#252525] transition-all flex items-center justify-center gap-2.5 shadow-2xs disabled:opacity-60 cursor-pointer"
            >
              {socialLoading === 'Google' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#73757A]" />
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

            <button data-ui-sound="click"
              type="button"
              onClick={() => handleSocialAuth('LinkedIn')}
              disabled={isLoading || socialLoading !== null}
              className="w-full touch-target h-11 rounded-xl bg-white border border-[#D9D8D2] hover:bg-[#FAF9F4] text-xs sm:text-sm font-medium text-[#252525] transition-all flex items-center justify-center gap-2.5 shadow-2xs disabled:opacity-60 cursor-pointer"
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
          <div className="text-center text-xs text-[#73757A]">
            {mode === 'signin' ? (
              <p>
                Don&apos;t have an account?{' '}
                <button data-ui-sound="click"
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                  }}
                  className="text-[#252525] font-semibold hover:underline"
                >
                  Sign up
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button data-ui-sound="click"
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                  }}
                  className="text-[#252525] font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          {/* Terms Notice */}
          <p className="text-[11px] text-[#9A9B9E] text-center leading-relaxed">
            By continuing, you agree to our{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-[#252525]">Terms</Link> and{' '}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-[#252525]">Privacy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};
