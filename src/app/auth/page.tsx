'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { AuthView } from '@/components/auth/AuthView';

function AuthContent() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && session?.access_token) {
      router.replace('/dashboard');
    }
  }, [session, isLoading, router]);

  return <AuthView />;
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  );
}

