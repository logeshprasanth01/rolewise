'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import {
  getSupabaseAnonKey,
  getSupabaseClient,
  setSupabaseAnonKey,
} from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  anonKey: string;
  userName: string;
  signIn: (email: string, password?: string) => Promise<{ data?: { user?: User | null; session?: Session | null } | null; error: Error | null }>;
  signUp: (email: string, password?: string, fullName?: string) => Promise<{ data?: { user?: User | null; session?: Session | null } | null; error: Error | null }>;
  signInWithDemo: (fullName?: string, email?: string) => void;
  signOut: () => Promise<void>;
  updateAnonKey: (key: string) => void;
  openAuthModal: (mode?: 'signin' | 'signup' | unknown) => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
  authModalMode: 'signin' | 'signup';
  setAuthModalMode: (mode: 'signin' | 'signup') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const demoUserJson = localStorage.getItem('rolewise_demo_user');
        if (demoUserJson) return JSON.parse(demoUserJson).user;
      } catch {
        // ignore
      }
    }
    return null;
  });
  const [session, setSession] = useState<Session | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const demoUserJson = localStorage.getItem('rolewise_demo_user');
        if (demoUserJson) return JSON.parse(demoUserJson).session;
      } catch {
        // ignore
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('rolewise_demo_user')) {
      return false;
    }
    return true;
  });
  const [anonKey, setAnonKeyState] = useState<string>(() => getSupabaseAnonKey());
  const [isConfigured, setIsConfigured] = useState<boolean>(() => {
    const k = getSupabaseAnonKey();
    return Boolean(k && k.trim().length > 15);
  });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');

  useEffect(() => {
    // If demo session exists, initial state is already set
    if (typeof window !== 'undefined' && localStorage.getItem('rolewise_demo_user')) {
      return;
    }

    const supabase = getSupabaseClient();

    // Check active session
    supabase.auth.getSession().then(({ data, error }) => {
      if (!error && data?.session) {
        setSession(data.session);
        setUser(data.session.user);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const updateAnonKey = (newKey: string) => {
    setSupabaseAnonKey(newKey);
    setAnonKeyState(newKey);
    setIsConfigured(Boolean(newKey && newKey.trim().length > 20));
  };

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

  const signInWithDemo = (fullName = 'Logesh Prasanth', email = 'logesh@rolewise.io') => {
    const mockUser: User = {
      id: 'demo-user-logesh',
      app_metadata: {},
      user_metadata: { full_name: fullName },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email,
    } as User;

    const mockSession: Session = {
      access_token: 'demo-access-token-rolewise-mvp',
      token_type: 'bearer',
      expires_in: 86400,
      refresh_token: 'demo-refresh-token',
      user: mockUser,
    } as Session;

    if (typeof window !== 'undefined') {
      localStorage.setItem('rolewise_demo_user', JSON.stringify({ user: mockUser, session: mockSession }));
    }

    setUser(mockUser);
    setSession(mockSession);
    setIsAuthModalOpen(false);
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
        isConfigured,
        anonKey,
        userName,
        signIn,
        signUp,
        signInWithDemo,
        signOut,
        updateAnonKey,
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
