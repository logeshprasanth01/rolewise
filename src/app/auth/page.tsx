'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthView } from '@/components/auth/AuthView';

export default function AuthPage() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && session?.access_token) {
      router.replace('/');
    }
  }, [session, isLoading, router]);

  return <AuthView />;
}
