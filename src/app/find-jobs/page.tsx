'use client';

import React, { useEffect, useState } from 'react';
import { getUserRoles } from '@/services/api';
import { JobOpenings } from '@/components/jobs/JobOpenings';

/** Find jobs: openings for the roles the person is already targeting in their tracker. */
export default function FindJobsPage() {
  const [targets, setTargets] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getUserRoles()
      .then((roles) => {
        const titles = [...new Set(roles.map((r) => (r.title || r.job_title || '').trim()).filter(Boolean))].slice(0, 6);
        setTargets(titles);
        setQuery(titles[0] || 'Product Designer');
      })
      .catch(() => setQuery('Product Designer'))
      .finally(() => setReady(true));
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      <header className="space-y-1.5">
        <h1 className="text-2xl sm:text-[32px] font-bold text-[#1A1714] tracking-[-0.02em] leading-tight">Find jobs</h1>
        <p className="text-sm text-[#6B6259] max-w-2xl">
          Openings for the roles you are preparing for. Apply on the original site, then track it here so you remember to follow up.
        </p>
      </header>

      {targets.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-[#1A1714] mb-2">Your target roles</p>
          <div className="flex flex-wrap gap-1.5">
            {targets.map((t) => {
              const active = t === query;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setQuery(t)}
                  className={`h-9 px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    active ? 'bg-[#FFD84D] border-[#FFD84D] text-[#1A1714]' : 'bg-white border-[#E6E0D7] text-[#574F46] hover:border-[#1A1714]/40'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {ready && (
        <JobOpenings
          key={query}
          defaultQuery={query}
          editable
          title="Search openings"
          subtitle="Pick a location, then search on the portals or apply to a live remote opening."
        />
      )}
    </div>
  );
}
