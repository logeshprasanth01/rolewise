'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userName: string;
  signIn: (email: string, password?: string) => Promise<{ data?: { user?: User | null; session?: Session | null } | null; error: Error | null }>;
  signUp: (email: string, password?: string, fullName?: string) => Promise<{ data?: { user?: User | null; session?: Session | null } | null; error: Error | null }>;
  signOut: () => Promise<void>;
  openAuthModal: (mode?: 'signin' | 'signup' | unknown) => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup';
  setAuthModalMode: (mode: 'signin' | 'signup') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    const supabase = getSupabaseClient();

    // 1. Check active Supabase session
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!error && data?.session?.access_token) {
          setSession(data.session);
          setUser(data.session.user);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('rolewise_demo_user');
          }
        } else {
          setSession(null);
          setUser(null);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('[Rolewise] getSession notice:', err);
        setIsLoading(false);
      });

    // 2. Listen to real Supabase auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (currentSession?.access_token) {
        setSession(currentSession);
        setUser(currentSession.user ?? null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('rolewise_demo_user');
        }
      } else {
        setSession(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password?: string) => {
    const supabase = getSupabaseClient();
    try {
      if (password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        return { data, error };
      } else {
        const { data, error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });
        return { data, error };
      }
    } catch (err: unknown) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password?: string, fullName?: string) => {
    const supabase = getSupabaseClient();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: password || 'Candidate123!',
        options: {
          data: {
            full_name: fullName || 'User',
          },
        },
      });

      // Create profile in public.profiles using authenticated user ID
      if (data?.user) {
        try {
          await supabase
            .from('profiles')
            .upsert(
              {
                id: data.user.id,
                full_name: fullName || email.split('@')[0],
                email: data.user.email,
              },
              { onConflict: 'id' }
            );
        } catch (profileErr: unknown) {
          console.warn('[Rolewise] Profile sync notice:', profileErr);
        }
      }

      return { data, error };
    } catch (err: unknown) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('rolewise_demo_user');
    }
    const supabase = getSupabaseClient();
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setUser(null);
    setSession(null);
  };

  // Determine user display name
  const userName =
    user?.user_metadata?.full_name ||
    user?.email?.split('@')[0] ||
    '';

  const openAuthModal = (mode?: 'signin' | 'signup' | unknown) => {
    if (mode === 'signup' || mode === 'signin') {
      setAuthModalMode(mode);
    } else {
      setAuthModalMode('signin');
    }
    setIsAuthModalOpen(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        userName,
        signIn,
        signUp,
        signOut,
        openAuthModal,
        closeAuthModal: () => setIsAuthModalOpen(false),
        isAuthModalOpen,
        authModalMode,
        setAuthModalMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
