'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getUserRoles } from '@/services/api';
import { JobOpenings } from '@/components/jobs/JobOpenings';

/** Find Jobs: every open role across fields, with one-tap shortcuts to the roles in the tracker. */
export default function FindJobsPage() {
  return (
    <Suspense fallback={null}>
      <FindJobs />
    </Suspense>
  );
}

/** ?q= and ?city= (from dashboard links) set the starting search. */
function FindJobs() {
  const params = useSearchParams();
  const [targets, setTargets] = useState<string[]>([]);

  useEffect(() => {
    getUserRoles()
      .then((roles) => {
        setTargets([...new Set(roles.map((r) => (r.title || r.job_title || '').trim()).filter(Boolean))].slice(0, 6));
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="max-w-[1160px] mx-auto animate-in fade-in duration-300 pb-16">
      <JobOpenings
        as="h1"
        title="Find jobs"
        subtitle="Real openings in every field, updated hourly. Apply opens the original posting."
        quickQueries={targets}
        defaultQuery={params.get('q') || ''}
        initialCity={params.get('city') || undefined}
      />
    </div>
  );
}
