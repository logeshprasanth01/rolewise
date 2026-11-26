'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  MapPin,
  Search,
  Wallet,
} from 'lucide-react';
import { quickAddJob } from '@/services/api';
import { JOB_LOCATIONS, portalLinks, timeAgo } from '@/lib/job-portals';
import { todayISO } from '@/lib/tracker';

interface OpenJob {
  id: string;
  title: string;
  company: string;
  logo: string | null;
  location: string;
  type: string;
  level: string;
  postedAt: string | null;
  url: string;
  salary: string | null;
  excerpt: string;
}

type TrackState = 'idle' | 'asking' | 'saving' | 'saved' | 'applied' | 'error';

const LOCATION_KEY = 'rw-job-location';

interface JobOpeningsProps {
  /** Role to search for, e.g. "UI/UX Designer". */
  defaultQuery: string;
  /** Show the search field so the person can change the role. */
  editable?: boolean;
  /** Heading level text. */
  title?: string;
  subtitle?: string;
}

export function JobOpenings({ defaultQuery, editable = false, title = 'Jobs to apply for', subtitle }: JobOpeningsProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [draft, setDraft] = useState(defaultQuery);
  // Remembered between visits. This component only renders after sign-in, on the client.
  const [location, setLocation] = useState<string>(() => {
    try {
      return (typeof window !== 'undefined' && window.localStorage.getItem(LOCATION_KEY)) || 'India';
    } catch {
      return 'India';
    }
  });
  // Results are keyed by the query they belong to, so "loading" is simply "no results for this query yet".
  const [result, setResult] = useState<{ query: string; jobs: OpenJob[]; failed: boolean } | null>(null);
  const [track, setTrack] = useState<Record<string, TrackState>>({});
  const loading = result?.query !== query;
  const jobs = loading ? null : result?.jobs ?? null;
  const failed = !loading && !!result?.failed;

  const chooseLocation = (loc: string) => {
    setLocation(loc);
    try {
      window.localStorage.setItem(LOCATION_KEY, loc);
    } catch {
      // storage unavailable
    }
  };

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    fetch(`/api/jobs?q=${encodeURIComponent(query.trim())}`)
      .then((r) => r.json())
      .then((data: { jobs?: OpenJob[]; error?: string }) => {
        if (!cancelled) setResult({ query, jobs: data.jobs || [], failed: Boolean(data.error) });
      })
      .catch(() => {
        if (!cancelled) setResult({ query, jobs: [], failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const portals = useMemo(() => portalLinks(query, location), [query, location]);

  const saveToTracker = async (job: OpenJob, status: 'saved' | 'applied') => {
    setTrack((t) => ({ ...t, [job.id]: 'saving' }));
    try {
      await quickAddJob({
        job_title: job.title,
        company: job.company,
        application_status: status,
        applied_at: status === 'applied' ? todayISO() : null,
        source: 'Other',
        job_url: job.url,
        location: job.location,
        work_model: job.type || null,
        notes: 'Found in Rolewise job search (via Jobicy)',
      });
      setTrack((t) => ({ ...t, [job.id]: status }));
    } catch {
      setTrack((t) => ({ ...t, [job.id]: 'error' }));
    }
  };

  return (
    <section aria-labelledby="job-openings-heading" className="space-y-5">
      <div>
        <div>
          <h2 id="job-openings-heading" className="text-lg sm:text-xl font-bold text-[#1A1714] tracking-[-0.01em]">
            {title}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#6B6259] max-w-2xl">
            {subtitle ?? <>Openings for <strong className="text-[#1A1714]">{query}</strong>. Apply takes you to the original job page.</>}
          </p>
        </div>
      </div>

      {/* Controls: role (optional) + location */}
      <div className="rolewise-card p-4 sm:p-5 space-y-4">
        {editable && (
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) setQuery(draft.trim());
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <label htmlFor="job-query" className="sr-only">Role to search for</label>
            <div className="flex-1 flex items-center gap-2 h-11 px-3.5 rounded-xl border border-[#E6E0D7] bg-white focus-within:border-[#1A1714] focus-within:ring-2 focus-within:ring-[#1A1714]/15">
              <Search className="w-4 h-4 text-[#9A9086] shrink-0" aria-hidden="true" />
              <input
                id="job-query"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Role, e.g. Product Designer"
                className="w-full bg-transparent outline-none text-sm text-[#1A1714] placeholder:text-[#9A9086]"
              />
            </div>
            <button type="submit" className="h-11 px-5 rounded-xl bg-[#1A1714] hover:bg-[#3B342D] text-white text-sm font-semibold cursor-pointer">
              Search jobs
            </button>
          </form>
        )}

        <div>
          <p className="text-xs font-semibold text-[#1A1714] mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> Where do you want to work?
          </p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Job location">
            {JOB_LOCATIONS.map((loc) => {
              const active = location === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => chooseLocation(loc)}
                  className={`h-9 px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    active ? 'bg-[#1A1714] text-white border-[#1A1714]' : 'bg-white text-[#574F46] border-[#E6E0D7] hover:border-[#1A1714]/40'
                  }`}
                >
                  {loc}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Job portals, pre-filled */}
      <div>
        <h3 className="text-sm font-semibold text-[#1A1714] flex items-center gap-1.5">
          <Globe className="w-4 h-4" aria-hidden="true" /> Search on job portals
        </h3>
        <p className="text-xs text-[#6B6259] mt-0.5">Opens a search for “{query}” in {location}. Most roles in India are posted here.</p>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {portals.map((p) => (
            <li key={p.id}>
              <a
                href={p.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-2xl border border-[#E6E0D7] bg-white p-3 hover:border-[#1A1714] transition-colors"
              >
                <span className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-[#1A1714] shrink-0" style={{ background: p.tint }} aria-hidden="true">
                  {p.name.charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-[#1A1714] truncate">{p.name}</span>
                  <span className="block text-[11px] text-[#6B6259] truncate">{p.hint}</span>
                </span>
                <ArrowUpRight className="w-4 h-4 text-[#9A9086] group-hover:text-[#1A1714] shrink-0" aria-hidden="true" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Live remote openings */}
      <div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#1A1714] flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" aria-hidden="true" /> Remote openings right now
              {jobs && jobs.length > 0 && <span className="font-normal text-[#9A9086]">{jobs.length}</span>}
            </h3>
            <p className="text-xs text-[#6B6259] mt-0.5">Live listings, refreshed every hour.</p>
          </div>
        </div>

        <div className="mt-3 space-y-2.5" aria-live="polite" aria-busy={loading}>
          {loading &&
            [0, 1, 2].map((i) => (
              <div key={i} className="rolewise-card p-4 flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-xl bg-[#F3EFE9]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded bg-[#F3EFE9]" />
                  <div className="h-2.5 w-1/3 rounded bg-[#F3EFE9]" />
                </div>
              </div>
            ))}

          {!loading && jobs && jobs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#DDD5CA] bg-white/60 p-5 text-center">
              <p className="text-sm font-semibold text-[#1A1714]">
                {failed ? 'Live openings couldn’t load right now' : `No remote “${query}” openings this week`}
              </p>
              <p className="text-xs text-[#6B6259] mt-1">Use the job portals above — they have the most roles in India.</p>
            </div>
          )}

          {!loading &&
            jobs?.map((job) => {
              const state = track[job.id] || 'idle';
              const meta = [job.type, job.level].filter(Boolean).join(' · ');
              return (
                <article key={job.id} className="rolewise-card p-4 sm:p-5 hover:border-[#DDD5CA] transition-colors">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="w-11 h-11 rounded-xl border border-[#E6E0D7] bg-white flex items-center justify-center overflow-hidden shrink-0">
                      {job.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={job.logo} alt="" className="w-full h-full object-contain" loading="lazy" />
                      ) : (
                        <Building2 className="w-5 h-5 text-[#9A9086]" aria-hidden="true" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm sm:text-[15px] font-semibold text-[#1A1714] leading-snug">{job.title}</h4>
                      <p className="text-xs text-[#574F46] mt-0.5">{job.company}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B6259]">
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" />{job.location}</span>
                        {meta && <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" aria-hidden="true" />{meta}</span>}
                        {job.salary && <span className="inline-flex items-center gap-1"><Wallet className="w-3 h-3" aria-hidden="true" />{job.salary}</span>}
                        {job.postedAt && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" />{timeAgo(job.postedAt)}</span>}
                      </div>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 shrink-0">
                      <TrackButtons state={state} onSave={() => saveToTracker(job, 'saved')} />
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => state === 'idle' && setTrack((t) => ({ ...t, [job.id]: 'asking' }))}
                        className="h-10 px-4 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#1A1714] text-xs font-bold inline-flex items-center gap-1.5"
                      >
                        Apply <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                        <span className="sr-only">for {job.title} at {job.company} (opens in a new tab)</span>
                      </a>
                    </div>
                  </div>

                  {/* Phone: actions under the card */}
                  <div className="sm:hidden mt-3 flex items-center gap-2">
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => state === 'idle' && setTrack((t) => ({ ...t, [job.id]: 'asking' }))}
                      className="flex-1 h-11 rounded-xl bg-[#FFD84D] text-[#1A1714] text-sm font-bold inline-flex items-center justify-center gap-1.5"
                    >
                      Apply <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                    </a>
                    <TrackButtons state={state} onSave={() => saveToTracker(job, 'saved')} />
                  </div>

                  {/* After Apply: one tap to log it in the tracker */}
                  {state === 'asking' && (
                    <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-[#FAF8F4] border border-[#E6E0D7] px-3.5 py-2.5">
                      <p className="text-xs text-[#1A1714]">Did you apply? Track it so Rolewise reminds you to follow up.</p>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => saveToTracker(job, 'applied')} className="h-9 px-3 rounded-lg bg-[#1A1714] text-white text-xs font-semibold cursor-pointer">
                          Yes, mark as applied
                        </button>
                        <button type="button" onClick={() => setTrack((t) => ({ ...t, [job.id]: 'idle' }))} className="h-9 px-3 rounded-lg text-xs font-semibold text-[#574F46] hover:bg-white cursor-pointer">
                          Not yet
                        </button>
                      </div>
                    </div>
                  )}
                  {(state === 'saved' || state === 'applied') && (
                    <p className="mt-3 text-xs text-[#2F6B42] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      {state === 'applied' ? 'Marked as applied in your Job Tracker.' : 'Saved to your Job Tracker.'}{' '}
                      <Link href="/jobs" className="font-semibold underline underline-offset-2">Open tracker</Link>
                    </p>
                  )}
                  {state === 'error' && <p className="mt-3 text-xs text-[#A4493A]">Couldn’t save this job. Please try again.</p>}
                </article>
              );
            })}

          {!loading && jobs && jobs.length > 0 && (
            <p className="text-[11px] text-[#9A9086]">
              Remote listings from{' '}
              <a href="https://jobicy.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#1A1714]">
                Jobicy
              </a>
              . Apply opens the original posting.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function TrackButtons({ state, onSave }: { state: TrackState; onSave: () => void }) {
  if (state === 'saved' || state === 'applied') return null;
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={state === 'saving'}
      className="h-10 sm:h-10 px-3.5 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#1A1714] text-xs font-semibold text-[#1A1714] inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer max-sm:h-11 max-sm:px-4"
    >
      {state === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />}
      Save
    </button>
  );
}
