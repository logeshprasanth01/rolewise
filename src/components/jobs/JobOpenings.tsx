'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Briefcase, CheckCircle2, Clock, Loader2, MapPin, Search, Wallet, X } from 'lucide-react';
import { quickAddJob } from '@/services/api';
import { portalLinks, timeAgo } from '@/lib/job-portals';
import { todayISO } from '@/lib/tracker';

interface OpenJob {
  id: string;
  title: string;
  company: string;
  logo: string | null;
  location: string;
  city: string | null;
  remote: boolean;
  type: string;
  department: string;
  domain: string;
  postedAt: string | null;
  url: string;
  source: 'Company careers' | 'Himalayas' | 'Jobicy';
  sourceUrl: string | null;
  salary: string | null;
}

interface FeedResponse {
  jobs: OpenJob[];
  total: number;
  page: number;
  hasMore: boolean;
  companies: number;
  relaxed: boolean;
  relaxedDomain: string | null;
  domainCounts: Record<string, number>;
}

type TrackState = 'idle' | 'asking' | 'saving' | 'saved' | 'applied' | 'error';

const DOMAINS = ['Engineering', 'Design', 'Product', 'Data & AI', 'Marketing', 'Sales', 'Customer Success', 'Operations', 'Finance & Legal', 'People & HR', 'Other'];
const CITIES = ['All India', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Remote'];
const CITY_KEY = 'rw-job-city';

const LOGO_TINTS = ['#FFE58A', '#E3EEF9', '#EEF7F0', '#F3EFE9', '#FFF0ED', '#EFEAE3', '#E8F0FF'];
function tintFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return LOGO_TINTS[h % LOGO_TINTS.length];
}

interface JobOpeningsProps {
  /** Starting search, e.g. the role title. Empty shows every open job. */
  defaultQuery?: string;
  title?: string;
  subtitle?: string;
  /** "h1" on the Find Jobs page, "h2" when embedded. */
  as?: 'h1' | 'h2';
  /** One-tap searches, e.g. the roles already in the tracker. */
  quickQueries?: string[];
}

export function JobOpenings({ defaultQuery = '', title = 'Jobs to apply for', subtitle, as = 'h2', quickQueries = [] }: JobOpeningsProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [draft, setDraft] = useState(defaultQuery);
  const [domain, setDomain] = useState<string | null>(null);
  const [city, setCity] = useState<string>(() => {
    try {
      return (typeof window !== 'undefined' && window.localStorage.getItem(CITY_KEY)) || 'All India';
    } catch {
      return 'All India';
    }
  });
  const key = `${query}|${city}|${domain ?? ''}`;
  const [feed, setFeed] = useState<(FeedResponse & { key: string }) | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [track, setTrack] = useState<Record<string, TrackState>>({});

  const loading = feed?.key !== key && failedKey !== key;
  const failed = failedKey === key;
  const current = feed && feed.key === key ? feed : null;

  const urlFor = (page: number) => {
    const p = new URLSearchParams({ page: String(page) });
    if (query.trim()) p.set('q', query.trim());
    if (city && city !== 'All India') p.set('city', city);
    if (domain) p.set('domain', domain);
    return `/api/jobs?${p.toString()}`;
  };

  useEffect(() => {
    let cancelled = false;
    const k = key;
    fetch(urlFor(1))
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<FeedResponse>;
      })
      .then((data) => {
        if (!cancelled) setFeed({ ...data, key: k });
      })
      .catch(() => {
        if (!cancelled) setFailedKey(k);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loadMore = async () => {
    if (!current || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await fetch(urlFor(current.page + 1));
      const data = (await r.json()) as FeedResponse;
      setFeed((f) => (f && f.key === key ? { ...data, key, jobs: [...f.jobs, ...data.jobs] } : f));
    } catch {
      // keep what is shown
    } finally {
      setLoadingMore(false);
    }
  };

  const chooseCity = (c: string) => {
    setCity(c);
    try {
      window.localStorage.setItem(CITY_KEY, c);
    } catch {
      // storage unavailable
    }
  };

  const portals = useMemo(() => portalLinks(query || 'jobs', city === 'All India' ? 'India' : city), [query, city]);

  const saveToTracker = async (job: OpenJob, status: 'saved' | 'applied') => {
    setTrack((t) => ({ ...t, [job.id]: 'saving' }));
    try {
      await quickAddJob({
        job_title: job.title,
        company: job.company,
        application_status: status,
        applied_at: status === 'applied' ? todayISO() : null,
        source: job.source === 'Company careers' ? 'Company site' : 'Other',
        job_url: job.url,
        location: job.location,
        work_model: job.type || null,
        notes: `Found in Rolewise Find Jobs (${job.source})`,
      });
      setTrack((t) => ({ ...t, [job.id]: status }));
    } catch {
      setTrack((t) => ({ ...t, [job.id]: 'error' }));
    }
  };

  const Heading = as;
  // Keep the last counts visible while a new filter loads, so the chips don't jump.
  const counts = current?.domainCounts || feed?.domainCounts || {};
  const allCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <section aria-labelledby="job-openings-heading" className="space-y-5">
      <div>
        <Heading
          id="job-openings-heading"
          className={as === 'h1' ? 'text-2xl sm:text-[32px] font-bold text-[#1A1714] tracking-[-0.02em] leading-tight' : 'text-lg sm:text-xl font-bold text-[#1A1714] tracking-[-0.01em]'}
        >
          {title}
        </Heading>
        <p className="mt-1 text-xs sm:text-sm text-[#6B6259] max-w-2xl">
          {subtitle ?? 'Real openings from company career pages and remote job boards, updated every hour. Apply opens the original posting.'}
        </p>
      </div>

      {/* FILTERS */}
      <div className="rolewise-card p-4 sm:p-5 space-y-4">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(draft.trim());
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <label htmlFor="job-query" className="sr-only">Search jobs by role, skill or company</label>
          <div className="flex-1 flex items-center gap-2 h-11 px-3.5 rounded-xl border border-[#E6E0D7] bg-white focus-within:border-[#1A1714] focus-within:ring-2 focus-within:ring-[#1A1714]/15">
            <Search className="w-4 h-4 text-[#9A9086] shrink-0" aria-hidden="true" />
            <input
              id="job-query"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Role, skill or company, e.g. Data Analyst, React, Swiggy"
              className="w-full bg-transparent outline-none text-sm text-[#1A1714] placeholder:text-[#9A9086]"
            />
            {draft && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setDraft('');
                  setQuery('');
                }}
                className="text-[#9A9086] hover:text-[#1A1714] p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button type="submit" className="h-11 px-5 rounded-xl bg-[#1A1714] hover:bg-[#3B342D] text-white text-sm font-semibold cursor-pointer">
            Search
          </button>
        </form>

        {quickQueries.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 sm:flex-wrap sm:overflow-visible" aria-label="Your roles">
            <span className="text-[11px] font-semibold text-[#6B6259] shrink-0 mr-0.5">Your roles:</span>
            {['', ...quickQueries].map((t) => {
              const active = t === query;
              return (
                <button
                  key={t || 'all'}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setDraft(t);
                    setQuery(t);
                  }}
                  className={`shrink-0 h-8 px-3 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                    active ? 'bg-[#FAF8F4] border-[#1A1714] text-[#1A1714]' : 'bg-white border-[#E6E0D7] text-[#574F46] hover:border-[#1A1714]/40'
                  }`}
                >
                  {t || 'All jobs'}
                </button>
              );
            })}
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-[#1A1714] mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> Location
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 sm:flex-wrap sm:overflow-visible" role="radiogroup" aria-label="Location">
            {CITIES.map((c) => {
              const active = city === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => chooseCity(c)}
                  className={`shrink-0 h-9 px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    active ? 'bg-[#1A1714] text-white border-[#1A1714]' : 'bg-white text-[#574F46] border-[#E6E0D7] hover:border-[#1A1714]/40'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-[#1A1714] mb-2 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5" aria-hidden="true" /> Field
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 sm:flex-wrap sm:overflow-visible" role="radiogroup" aria-label="Field">
            {[null, ...DOMAINS].map((d) => {
              const active = domain === d;
              const n = d ? counts[d] || 0 : allCount;
              if (d && n === 0 && !active && feed) return null;
              return (
                <button
                  key={d ?? 'all'}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setDomain(d)}
                  className={`shrink-0 h-9 px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                    active ? 'bg-[#FFD84D] text-[#1A1714] border-[#FFD84D]' : 'bg-white text-[#574F46] border-[#E6E0D7] hover:border-[#1A1714]/40'
                  }`}
                >
                  {d ?? 'All fields'}
                  {feed && <span className={`tabular-nums ${active ? 'text-[#5C4A00]' : 'text-[#9A9086]'}`}>{n}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RESULTS */}
      <div aria-live="polite" aria-busy={loading}>
        {current && (
          <div className="mb-3 space-y-1">
            <p className="text-sm font-semibold text-[#1A1714]">
              {current.total.toLocaleString('en-IN')} {current.total === 1 ? 'opening' : 'openings'}
              <span className="font-normal text-[#6B6259]">
                {' '}at {current.companies} {current.companies === 1 ? 'company' : 'companies'}
                {query ? <> for “{query}”</> : null}
                {city !== 'All India' ? <> · {city}</> : null}
              </span>
            </p>
            {current.relaxed && (
              <p className="text-xs text-[#8A5A12]">
                No openings titled “{query}” right now, so these are other {current.relaxedDomain} roles.
              </p>
            )}
          </div>
        )}

        <ul className="space-y-2.5">
          {loading &&
            [0, 1, 2, 3].map((i) => (
              <li key={i} className="rolewise-card p-4 flex items-center gap-3 animate-pulse" aria-hidden="true">
                <div className="w-11 h-11 rounded-xl bg-[#F3EFE9]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 rounded bg-[#F3EFE9]" />
                  <div className="h-2.5 w-1/3 rounded bg-[#F3EFE9]" />
                </div>
              </li>
            ))}

          {current?.jobs.map((job) => {
            const state = track[job.id] || 'idle';
            const onApply = () => {
              if (state === 'idle') setTrack((t) => ({ ...t, [job.id]: 'asking' }));
            };
            return (
              <li key={job.id} className="rolewise-card p-4 sm:p-5 hover:border-[#CFC7BC] transition-colors">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div
                    className="w-11 h-11 rounded-xl border border-[#E6E0D7] flex items-center justify-center overflow-hidden shrink-0 text-sm font-bold text-[#1A1714]"
                    style={{ background: job.logo ? '#FFFFFF' : tintFor(job.company) }}
                    aria-hidden="true"
                  >
                    {job.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={job.logo} alt="" className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      job.company.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm sm:text-[15px] font-semibold text-[#1A1714] leading-snug">
                      <a href={job.url} target="_blank" rel="noopener noreferrer" onClick={onApply} className="hover:underline underline-offset-2">
                        {job.title}
                      </a>
                    </h3>
                    <p className="text-xs text-[#574F46] mt-0.5">{job.company}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B6259]">
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" />{job.location}</span>
                      {job.type && <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" aria-hidden="true" />{job.type}</span>}
                      {job.salary && <span className="inline-flex items-center gap-1"><Wallet className="w-3 h-3" aria-hidden="true" />{job.salary}</span>}
                      {job.postedAt && <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" />{timeAgo(job.postedAt)}</span>}
                      <span className="rounded-full bg-[#FAF8F4] border border-[#E6E0D7] px-2 py-0.5 text-[10px] font-semibold text-[#574F46]">{job.domain}</span>
                    </div>
                    {job.source !== 'Company careers' && (
                      <p className="mt-1.5 text-[10px] text-[#9A9086]">
                        via{' '}
                        <a
                          href={job.sourceUrl || (job.source === 'Himalayas' ? 'https://himalayas.app/jobs' : 'https://jobicy.com')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline underline-offset-2 hover:text-[#1A1714]"
                        >
                          {job.source}
                        </a>
                      </p>
                    )}
                  </div>

                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <SaveButton state={state} onSave={() => saveToTracker(job, 'saved')} />
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onApply}
                      className="h-10 px-4 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#1A1714] text-xs font-bold inline-flex items-center gap-1.5"
                    >
                      Apply <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="sr-only">for {job.title} at {job.company} (opens in a new tab)</span>
                    </a>
                  </div>
                </div>

                <div className="sm:hidden mt-3 flex items-center gap-2">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onApply}
                    className="flex-1 h-11 rounded-xl bg-[#FFD84D] text-[#1A1714] text-sm font-bold inline-flex items-center justify-center gap-1.5"
                  >
                    Apply <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
                  </a>
                  <SaveButton state={state} onSave={() => saveToTracker(job, 'saved')} />
                </div>

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
              </li>
            );
          })}
        </ul>

        {(failed || (current && current.total === 0)) && (
          <div className="rounded-2xl border border-dashed border-[#DDD5CA] bg-white/60 p-6 text-center">
            <p className="text-sm font-semibold text-[#1A1714]">{failed ? 'Jobs couldn’t load right now' : 'No openings match these filters'}</p>
            <p className="text-xs text-[#6B6259] mt-1">
              {failed ? 'Please try again in a minute, or search the job sites below.' : 'Try another location or field, a shorter search, or the job sites below.'}
            </p>
          </div>
        )}

        {current?.hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="h-11 px-5 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#1A1714] text-sm font-semibold text-[#1A1714] inline-flex items-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Show more jobs
              <span className="text-[#9A9086] font-normal tabular-nums">
                {current.jobs.length} of {current.total.toLocaleString('en-IN')}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* MORE PLACES TO LOOK */}
      <div className="rounded-2xl bg-white border border-[#E6E0D7] p-4 sm:p-5">
        <p className="text-sm font-semibold text-[#1A1714]">Didn’t find it? Search more job sites</p>
        <p className="text-xs text-[#6B6259] mt-0.5">
          Opens a ready-made search{query ? <> for “{query}”</> : null} in {city === 'All India' ? 'India' : city}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {portals.map((p) => (
            <a
              key={p.id}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="h-9 px-3 rounded-full border border-[#E6E0D7] hover:border-[#1A1714] text-xs font-semibold text-[#1A1714] inline-flex items-center gap-1.5"
            >
              {p.name}
              <ArrowUpRight className="w-3 h-3 text-[#9A9086]" aria-hidden="true" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function SaveButton({ state, onSave }: { state: TrackState; onSave: () => void }) {
  if (state === 'saved' || state === 'applied') return null;
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={state === 'saving'}
      className="h-10 px-3.5 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#1A1714] text-xs font-semibold text-[#1A1714] inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer max-sm:h-11 max-sm:px-4"
    >
      {state === 'saving' ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />}
      Save
    </button>
  );
}
