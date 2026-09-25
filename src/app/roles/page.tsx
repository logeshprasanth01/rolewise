'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRoles } from '@/services/api';
import { Loader2 } from 'lucide-react';

export default function RolesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirect() {
      try {
        const roles = await getUserRoles();
        if (roles && roles.length > 0) {
          router.replace(`/roles/${roles[0].id}/interview`);
        } else {
          router.replace('/jobs/new');
        }
      } catch {
        router.replace('/jobs/new');
      }
    }
    redirect();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-[#73757A]">
      <Loader2 className="w-6 h-6 animate-spin text-[#252525]" />
      <p className="text-xs sm:text-sm">Connecting to your role interview session...</p>
    </div>
  );
}
