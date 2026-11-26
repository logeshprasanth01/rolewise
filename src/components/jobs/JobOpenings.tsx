'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Briefcase, CheckCircle2, Clock, Loader2, MapPin, Search, SlidersHorizontal, Wallet, X } from 'lucide-react';
import { quickAddJob } from '@/services/api';
import { timeAgo } from '@/lib/job-portals';
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

interface Filters {
  sort: 'relevant' | 'recent';
  posted: '' | '1' | '7' | '30';
  level: '' | 'intern' | 'entry' | 'mid' | 'senior' | 'lead';
  work: '' | 'onsite' | 'remote';
  city: string;
  domain: string;
}

const DEFAULT_FILTERS: Filters = { sort: 'relevant', posted: '', level: '', work: '', city: '', domain: '' };

const SORT_OPTIONS: { value: Filters['sort']; label: string }[] = [
  { value: 'relevant', label: 'Most relevant' },
  { value: 'recent', label: 'Most recent' },
];
const POSTED_OPTIONS: { value: Filters['posted']; label: string }[] = [
  { value: '', label: 'Any time' },
  { value: '1', label: 'Past 24 hours' },
  { value: '7', label: 'Past week' },
  { value: '30', label: 'Past month' },
];
const LEVEL_OPTIONS: { value: Filters['level']; label: string }[] = [
  { value: '', label: 'Any level' },
  { value: 'intern', label: 'Internship' },
  { value: 'entry', label: 'Entry level' },
  { value: 'mid', label: 'Mid level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead / Manager' },
];
const WORK_OPTIONS: { value: Filters['work']; label: string }[] = [
  { value: '', label: 'Any' },
  { value: 'onsite', label: 'On-site / Hybrid' },
  { value: 'remote', label: 'Remote' },
];
const CITIES = ['Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Kolkata', 'Ahmedabad', 'Coimbatore', 'Kochi'];
const DOMAINS = ['Engineering', 'Design', 'Product', 'Data & AI', 'Marketing', 'Sales', 'Customer Success', 'Operations', 'Finance & Legal', 'People & HR', 'Other'];
const CITY_KEY = 'rw-job-city';

const LOGO_TINTS = ['#FFE58A', '#E3EEF9', '#EEF7F0', '#F3EFE9', '#FFF0ED', '#EFEAE3', '#E8F0FF'];
function tintFor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return LOGO_TINTS[h % LOGO_TINTS.length];
}

function buildUrl(query: string, f: Filters, page: number) {
  const p = new URLSearchParams({ page: String(page) });
  if (query.trim()) p.set('q', query.trim());
  if (f.city) p.set('city', f.city);
  if (f.domain) p.set('domain', f.domain);
  if (f.work) p.set('work', f.work);
  if (f.level) p.set('level', f.level);
  if (f.posted) p.set('posted', f.posted);
  if (f.sort !== 'relevant') p.set('sort', f.sort);
  return `/api/jobs?${p.toString()}`;
}

/** Chips for the filters that are switched on (sort isn't a filter, so it has no chip). */
function activeChips(f: Filters): { key: keyof Filters; label: string }[] {
  const chips: { key: keyof Filters; label: string }[] = [];
  if (f.posted) chips.push({ key: 'posted', label: POSTED_OPTIONS.find((o) => o.value === f.posted)!.label });
  if (f.level) chips.push({ key: 'level', label: LEVEL_OPTIONS.find((o) => o.value === f.level)!.label });
  if (f.work) chips.push({ key: 'work', label: WORK_OPTIONS.find((o) => o.value === f.work)!.label });
  if (f.city) chips.push({ key: 'city', label: f.city });
  if (f.domain) chips.push({ key: 'domain', label: f.domain });
  return chips;
}

interface JobOpeningsProps {
  /** Starting search, e.g. the role title. Empty shows every open job. */
  defaultQuery?: string;
  title?: string;
  subtitle?: string;
  /** "h1" on the Find Jobs page, "h2" when embedded. */
  as?: 'h1' | 'h2';
  /** Suggested searches shown when the search box is focused, e.g. roles in the tracker. */
  quickQueries?: string[];
}

export function JobOpenings({ defaultQuery = '', title = 'Jobs to apply for', subtitle, as = 'h2', quickQueries = [] }: JobOpeningsProps) {
  const [query, setQuery] = useState(defaultQuery);
  const [draft, setDraft] = useState(defaultQuery);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const city = typeof window !== 'undefined' ? window.localStorage.getItem(CITY_KEY) || '' : '';
      return { ...DEFAULT_FILTERS, city: CITIES.includes(city) ? city : '' };
    } catch {
      return DEFAULT_FILTERS;
    }
  });
  const [panelOpen, setPanelOpen] = useState(false);

  const key = buildUrl(query, filters, 1);
  const [feed, setFeed] = useState<(FeedResponse & { key: string }) | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [track, setTrack] = useState<Record<string, TrackState>>({});

  const current = feed && feed.key === key ? feed : null;
  const loading = !current && failedKey !== key;
  const failed = failedKey === key;

  useEffect(() => {
    let cancelled = false;
    fetch(key)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<FeedResponse>;
      })
      .then((data) => {
        if (!cancelled) setFeed({ ...data, key });
      })
      .catch(() => {
        if (!cancelled) setFailedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  const applyFilters = (next: Filters) => {
    setFilters(next);
    try {
      window.localStorage.setItem(CITY_KEY, next.city);
    } catch {
      // storage unavailable
    }
  };

  const loadMore = async () => {
    if (!current || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await fetch(buildUrl(query, filters, current.page + 1));
      const data = (await r.json()) as FeedResponse;
      setFeed((f) => (f && f.key === key ? { ...data, key, jobs: [...f.jobs, ...data.jobs] } : f));
    } catch {
      // keep what is shown
    } finally {
      setLoadingMore(false);
    }
  };

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

  const chips = activeChips(filters);
  const Heading = as;
  const suggestions = quickQueries.filter((q) => q && q !== query);

  return (
    <section aria-labelledby="job-openings-heading" className="space-y-4">
      <div>
        <Heading
          id="job-openings-heading"
          className={as === 'h1' ? 'text-2xl sm:text-[32px] font-bold text-[#1A1714] tracking-[-0.02em] leading-tight' : 'text-lg sm:text-xl font-bold text-[#1A1714] tracking-[-0.01em]'}
        >
          {title}
        </Heading>
        {subtitle !== '' && (
          <p className="mt-1 text-xs sm:text-sm text-[#6B6259] max-w-2xl">
            {subtitle ?? 'Real openings from company career pages and remote job boards. Apply opens the original posting.'}
          </p>
        )}
      </div>

      {/* SEARCH + FILTERS */}
      <div className="space-y-2.5">
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setSuggestOpen(false);
            setQuery(draft.trim());
          }}
          className="flex gap-2"
        >
          <div className="relative flex-1 min-w-0">
            <label htmlFor="job-query" className="sr-only">Search jobs by role, skill or company</label>
            <div className="flex items-center gap-2 h-12 px-3.5 rounded-xl border border-[#E6E0D7] bg-white focus-within:border-[#1A1714] focus-within:ring-2 focus-within:ring-[#1A1714]/15">
              <Search className="w-4 h-4 text-[#9A9086] shrink-0" aria-hidden="true" />
              <input
                id="job-query"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onFocus={() => setSuggestOpen(true)}
                onBlur={() => setSuggestOpen(false)}
                placeholder="Search role, skill or company"
                autoComplete="off"
                className="w-full min-w-0 bg-transparent outline-none text-sm text-[#1A1714] placeholder:text-[#9A9086]"
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
            {suggestOpen && !draft && suggestions.length > 0 && (
              <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-[#E6E0D7] bg-white shadow-lg p-1.5" role="listbox" aria-label="Your roles">
                <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold text-[#9A9086]">Your roles</p>
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    role="option"
                    aria-selected={false}
                    // mousedown so it runs before the input's blur closes the list
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDraft(q);
                      setQuery(q);
                      setSuggestOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-2 rounded-lg text-sm text-[#1A1714] hover:bg-[#FAF8F4] flex items-center gap-2 cursor-pointer"
                  >
                    <Briefcase className="w-3.5 h-3.5 text-[#9A9086]" aria-hidden="true" />
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-haspopup="dialog"
            aria-label={chips.length ? `Filters, ${chips.length} on` : 'Filters'}
            className={`h-12 px-3.5 sm:px-4 rounded-xl border text-sm font-semibold inline-flex items-center gap-2 shrink-0 cursor-pointer transition-colors ${
              chips.length ? 'bg-[#1A1714] border-[#1A1714] text-white' : 'bg-white border-[#E6E0D7] text-[#1A1714] hover:border-[#1A1714]'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline" aria-hidden="true">Filters</span>
            {chips.length > 0 && (
              <span aria-hidden="true" className="min-w-5 h-5 px-1 rounded-full bg-[#FFD84D] text-[#1A1714] text-[11px] font-bold inline-flex items-center justify-center">
                {chips.length}
              </span>
            )}
          </button>
        </form>

        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters">
            {chips.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => applyFilters({ ...filters, [c.key]: DEFAULT_FILTERS[c.key] })}
                className="h-8 pl-3 pr-2 rounded-full bg-[#FAF8F4] border border-[#E6E0D7] hover:border-[#1A1714] text-xs font-semibold text-[#1A1714] inline-flex items-center gap-1 cursor-pointer"
              >
                {c.label}
                <X className="w-3 h-3 text-[#6B6259]" aria-hidden="true" />
                <span className="sr-only">Remove filter</span>
              </button>
            ))}
            <button type="button" onClick={() => applyFilters({ ...DEFAULT_FILTERS, sort: filters.sort })} className="h-8 px-2 text-xs font-semibold text-[#6B6259] hover:text-[#1A1714] cursor-pointer">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* RESULTS */}
      <div aria-live="polite" aria-busy={loading}>
        {current && (
          <div className="mb-2.5 flex items-baseline justify-between gap-3">
            <p className="text-sm text-[#6B6259]">
              <span className="font-semibold text-[#1A1714]">{current.total.toLocaleString('en-IN')} jobs</span>
              {query ? <> for “{query}”</> : null}
            </p>
            <p className="text-xs text-[#9A9086] shrink-0">{filters.sort === 'recent' ? 'Most recent first' : 'Best match first'}</p>
          </div>
        )}
        {current?.relaxed && (
          <p className="mb-2.5 text-xs text-[#8A5A12]">No openings titled “{query}” right now, so these are other {current.relaxedDomain} roles.</p>
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
                    {state === 'asking' ? (
                      <AppliedPrompt onYes={() => saveToTracker(job, 'applied')} onNo={() => setTrack((t) => ({ ...t, [job.id]: 'idle' }))} />
                    ) : (
                    <>
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
                    </>
                    )}
                  </div>
                </div>

                <div className="sm:hidden mt-3 flex items-center justify-end gap-2">
                  {state === 'asking' ? (
                    <AppliedPrompt onYes={() => saveToTracker(job, 'applied')} onNo={() => setTrack((t) => ({ ...t, [job.id]: 'idle' }))} />
                  ) : (
                  <>
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
                  </>
                  )}
                </div>

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
            <p className="text-sm font-semibold text-[#1A1714]">{failed ? 'Jobs couldn’t load right now' : 'No jobs match your search'}</p>
            <p className="text-xs text-[#6B6259] mt-1">{failed ? 'Please try again in a minute.' : 'Try a shorter search or remove a filter.'}</p>
            {!failed && chips.length > 0 && (
              <button type="button" onClick={() => applyFilters({ ...DEFAULT_FILTERS, sort: filters.sort })} className="mt-3 h-9 px-4 rounded-lg border border-[#E6E0D7] bg-white text-xs font-semibold text-[#1A1714] hover:border-[#1A1714] cursor-pointer">
                Clear filters
              </button>
            )}
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

      {panelOpen && (
        <FilterPanel
          query={query}
          initial={filters}
          onClose={() => setPanelOpen(false)}
          onApply={(f) => {
            applyFilters(f);
            setPanelOpen(false);
          }}
        />
      )}
    </section>
  );
}

/* ---------------- LinkedIn-style "All filters" panel ---------------- */

function FilterPanel({ query, initial, onClose, onApply }: { query: string; initial: Filters; onClose: () => void; onApply: (f: Filters) => void }) {
  const [draft, setDraft] = useState<Filters>(initial);
  const [preview, setPreview] = useState<{ key: string; total: number; domainCounts: Record<string, number> } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const previewKey = buildUrl(query, { ...draft, domain: '' }, 1);
  const totalKey = buildUrl(query, draft, 1);

  // Live result count for the button, like "Show 120 results".
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      Promise.all([fetch(totalKey).then((r) => r.json()), totalKey === previewKey ? null : fetch(previewKey).then((r) => r.json())])
        .then(([withDomain, withoutDomain]: [FeedResponse, FeedResponse | null]) => {
          if (cancelled) return;
          setPreview({ key: totalKey, total: withDomain.total, domainCounts: (withoutDomain || withDomain).domainCounts });
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [totalKey, previewKey]);

  // Dialog basics: Escape closes, focus moves in and stays in, page doesn't scroll behind.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input');
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const counts = preview?.domainCounts || {};
  const total = preview?.key === totalKey ? preview.total : null;

  return (
    <div className="fixed inset-0 z-[80]">
      <button type="button" aria-label="Close filters" onClick={onClose} className="absolute inset-0 bg-[#1A1714]/30 backdrop-blur-[1px] cursor-default" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-title"
        className="absolute bg-white flex flex-col shadow-[0_0_40px_rgba(26,23,20,0.18)] inset-x-0 bottom-0 top-12 rounded-t-[24px] sm:inset-y-0 sm:right-0 sm:left-auto sm:top-0 sm:w-[440px] sm:rounded-none sm:rounded-l-[24px] animate-in slide-in-from-bottom sm:slide-in-from-right duration-200"
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-[#E6E0D7] shrink-0">
          <h2 id="filters-title" className="text-base font-bold text-[#1A1714]">All filters</h2>
          <button type="button" onClick={onClose} aria-label="Close filters" className="w-10 h-10 rounded-full flex items-center justify-center text-[#6B6259] hover:bg-[#FAF8F4] hover:text-[#1A1714] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-2 divide-y divide-[#E6E0D7]">
          <FilterGroup label="Sort by" name="sort" options={SORT_OPTIONS} value={draft.sort} onChange={(v) => set('sort', v)} />
          <FilterGroup label="Date posted" name="posted" options={POSTED_OPTIONS} value={draft.posted} onChange={(v) => set('posted', v)} />
          <FilterGroup label="Experience level" name="level" options={LEVEL_OPTIONS} value={draft.level} onChange={(v) => set('level', v)} />
          <FilterGroup label="Work type" name="work" options={WORK_OPTIONS} value={draft.work} onChange={(v) => set('work', v)} />
          <FilterGroup
            label="Location"
            name="city"
            options={[{ value: '', label: 'All India' }, ...CITIES.map((c) => ({ value: c, label: c }))]}
            value={draft.city}
            onChange={(v) => set('city', v)}
          />
          <FilterGroup
            label="Field"
            name="domain"
            options={[
              { value: '', label: 'All fields' },
              ...DOMAINS.filter((d) => (counts[d] || 0) > 0 || draft.domain === d).map((d) => ({ value: d, label: d, count: counts[d] || 0 })),
            ]}
            value={draft.domain}
            onChange={(v) => set('domain', v)}
          />
        </div>

        <div className="shrink-0 border-t border-[#E6E0D7] px-5 py-3.5 flex items-center justify-between gap-3 pb-[max(14px,env(safe-area-inset-bottom))]">
          <button type="button" onClick={() => setDraft({ ...DEFAULT_FILTERS })} className="h-11 px-3 text-sm font-semibold text-[#574F46] hover:text-[#1A1714] cursor-pointer">
            Reset
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="h-11 px-6 rounded-xl bg-[#1A1714] hover:bg-[#3B342D] text-white text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
          >
            {total === null ? 'Show results' : total === 0 ? 'No results' : `Show ${total.toLocaleString('en-IN')} results`}
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  name,
  options,
  value,
  onChange,
}: {
  label: string;
  name: string;
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="py-4">
      <p id={`filter-${name}`} className="text-sm font-semibold text-[#1A1714] mb-2.5">{label}</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby={`filter-${name}`}>
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={`${name}-${o.value || 'any'}`}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`h-9 px-3 rounded-full text-xs font-semibold border transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                active ? 'bg-[#1A1714] text-white border-[#1A1714]' : 'bg-white text-[#574F46] border-[#E6E0D7] hover:border-[#1A1714]/50'
              }`}
            >
              {active && <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />}
              {o.label}
              {typeof o.count === 'number' && <span className={`tabular-nums ${active ? 'text-white/70' : 'text-[#9A9086]'}`}>{o.count}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Shown in place of Save / Apply right after Apply is clicked. */
function AppliedPrompt({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Did you apply?">
      <span className="text-xs font-semibold text-[#1A1714] mr-1">Did you apply?</span>
      <button type="button" onClick={onYes} className="h-10 max-sm:h-11 px-4 rounded-xl bg-[#1A1714] hover:bg-[#3B342D] text-white text-xs font-semibold cursor-pointer">
        Yes
      </button>
      <button type="button" onClick={onNo} className="h-10 max-sm:h-11 px-4 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#1A1714] text-xs font-semibold text-[#1A1714] cursor-pointer">
        No
      </button>
    </div>
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
