'use client';

import React, { useEffect, useState } from 'react';
import { getUserRoles } from '@/services/api';
import { JobOpenings } from '@/components/jobs/JobOpenings';

/** Find Jobs: every open role across fields, with one-tap shortcuts to the roles in the tracker. */
export default function FindJobsPage() {
  const [targets, setTargets] = useState<string[]>([]);

  useEffect(() => {
    getUserRoles()
      .then((roles) => {
        setTargets([...new Set(roles.map((r) => (r.title || r.job_title || '').trim()).filter(Boolean))].slice(0, 6));
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      <JobOpenings
        as="h1"
        title="Find jobs"
        subtitle="Real openings in every field, from company career pages and remote job boards. Updated every hour. Apply opens the original posting, then track it here."
        quickQueries={targets}
      />
    </div>
  );
}
