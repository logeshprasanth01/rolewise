'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseClient } from '@/lib/supabase/client';
import { syncUserProfile } from '@/services/api';

function AuthCallbackContent() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('Completing sign-in...');

  useEffect(() => {
    let isCancelled = false;

    async function handleAuthCallback() {
      const supabase = getSupabaseClient();

      if (typeof window === 'undefined') return;

      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const errorParam = url.searchParams.get('error');
      const errorDesc = url.searchParams.get('error_description');

      // Check if OAuth provider returned an error or user cancelled
      if (errorParam) {
        console.warn('[Rolewise] OAuth callback error:', errorParam, errorDesc);
        const isUserCancellation =
          errorParam === 'access_denied' ||
          errorDesc?.toLowerCase().includes('user denied') ||
          errorDesc?.toLowerCase().includes('cancel');

        if (!isCancelled) {
          router.replace(isUserCancellation ? '/auth?error=access_denied' : '/auth?error=oauth_failed');
        }
        return;
      }

      // 1. If PKCE authorization code is present, exchange it for a session
      if (code) {
        try {
          setStatusMessage('Verifying credentials...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            console.error('[Rolewise] OAuth exchange error:', error.message);
            if (!isCancelled) {
              router.replace('/auth?error=oauth_failed');
            }
            return;
          }

          if (data?.session?.user) {
            setStatusMessage('Setting up workspace...');
            await syncUserProfile(data.session.user);
            if (!isCancelled) {
              router.replace('/dashboard');
            }
            return;
          }
        } catch (exchangeErr) {
          console.error('[Rolewise] OAuth exchange exception:', exchangeErr);
          if (!isCancelled) {
            router.replace('/auth?error=oauth_failed');
          }
          return;
        }
      }

      // 2. Check if a valid session already exists or was detected from URL
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          await syncUserProfile(session.user);
          if (!isCancelled) {
            router.replace('/dashboard');
          }
          return;
        }
      } catch (sessErr) {
        console.warn('[Rolewise] getSession check in callback:', sessErr);
      }

      // 3. Listen to auth state changes as fallback
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          subscription.unsubscribe();
          await syncUserProfile(session.user);
          if (!isCancelled) {
            router.replace('/dashboard');
          }
        }
      });

      // 4. Safety timeout: If no session can be established within 6 seconds, return to /auth
      const timer = setTimeout(() => {
        subscription.unsubscribe();
        if (!isCancelled) {
          console.warn('[Rolewise] OAuth callback timed out waiting for session');
          router.replace('/auth?error=oauth_failed');
        }
      }, 6000);

      return () => {
        subscription.unsubscribe();
        clearTimeout(timer);
      };
    }

    handleAuthCallback();

    return () => {
      isCancelled = true;
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F7F7FB] flex flex-col items-center justify-center gap-3 text-[#667085]">
      <div className="w-10 h-10 rounded-2xl bg-[#6D5DFB] flex items-center justify-center text-white font-bold text-lg shadow-sm animate-pulse">
        R
      </div>
      <p className="text-xs font-medium tracking-wide">{statusMessage}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F7FB] flex flex-col items-center justify-center gap-3 text-[#667085]">
          <div className="w-10 h-10 rounded-2xl bg-[#6D5DFB] flex items-center justify-center text-white font-bold text-lg shadow-sm animate-pulse">
            R
          </div>
          <p className="text-xs font-medium tracking-wide">Completing sign-in...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
