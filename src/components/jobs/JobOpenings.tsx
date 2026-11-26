'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Bookmark,
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Laptop,
  Loader2,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
} from 'lucide-react';
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

type Counts = Record<string, number>;

interface FeedResponse {
  jobs: OpenJob[];
  total: number;
  page: number;
  hasMore: boolean;
  companies: number;
  relaxed: boolean;
  relaxedDomain: string | null;
  domainCounts: Counts;
  cityCounts: Counts;
  levelCounts: Counts;
  workCounts: Counts;
  postedCounts: Counts;
}

type FacetCounts = Pick<FeedResponse, 'domainCounts' | 'cityCounts' | 'levelCounts' | 'workCounts' | 'postedCounts'>;
const NO_COUNTS: FacetCounts = { domainCounts: {}, cityCounts: {}, levelCounts: {}, workCounts: {}, postedCounts: {} };

type TrackState = 'idle' | 'saving' | 'saved' | 'applied' | 'error';

interface Filters {
  sort: 'relevant' | 'recent';
  posted: '' | '1' | '7' | '30';
  level: '' | 'early' | 'intern' | 'entry' | 'mid' | 'senior' | 'lead';
  work: '' | 'onsite' | 'remote';
  city: string;
  domain: string;
}

const DEFAULT_FILTERS: Filters = { sort: 'relevant', posted: '', level: '', work: '', city: '', domain: '' };

const LEVELS: { value: Filters['level']; label: string }[] = [
  { value: 'intern', label: 'Internship' },
  { value: 'entry', label: 'Entry level' },
  { value: 'mid', label: 'Mid level' },
  { value: 'senior', label: 'Senior' },
  { value: 'lead', label: 'Lead / Manager' },
];
const POSTED: { value: Filters['posted']; label: string }[] = [
  { value: '1', label: 'Past 24 hours' },
  { value: '7', label: 'Past week' },
  { value: '30', label: 'Past month' },
];
const WORK: { value: Filters['work']; label: string }[] = [
  { value: 'onsite', label: 'On-site / Hybrid' },
  { value: 'remote', label: 'Remote' },
];
const CITIES = ['Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR', 'Kolkata', 'Ahmedabad', 'Coimbatore', 'Kochi'];
const DOMAINS = ['Engineering', 'Design', 'Product', 'Data & AI', 'Marketing', 'Sales', 'Customer Success', 'Operations', 'Finance & Legal', 'People & HR', 'Other'];
/** Top tabs, like UXHack's All / Design / Product. Every other field is in the Field section. */
const FIELD_TABS = ['', 'Design', 'Product', 'Engineering'];
const CITY_KEY = 'rw-job-city';
const PAGE_SIZE = 20;

/** One-tap shortcuts above the list, each with a live count. */
const PRESETS: { id: string; label: string; icon: React.ElementType; patch: Partial<Filters>; count: (c: FacetCounts) => number }[] = [
  { id: 'early', label: 'Early career', icon: GraduationCap, patch: { level: 'early' }, count: (c) => c.levelCounts.early || 0 },
  { id: 'remote', label: 'Remote', icon: Laptop, patch: { work: 'remote' }, count: (c) => c.workCounts.remote || 0 },
  { id: 'week', label: 'Posted this week', icon: CalendarClock, patch: { posted: '7' }, count: (c) => c.postedCounts['7'] || 0 },
  { id: 'lead', label: 'Lead roles', icon: Users, patch: { level: 'lead' }, count: (c) => c.levelCounts.lead || 0 },
];

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

const levelLabel = (v: Filters['level']) => (v === 'early' ? 'Early career' : LEVELS.find((o) => o.value === v)?.label || '');

/** Filters that are on (sort isn't a filter). */
function activeChips(f: Filters): { key: keyof Filters; label: string }[] {
  const chips: { key: keyof Filters; label: string }[] = [];
  if (f.domain) chips.push({ key: 'domain', label: f.domain });
  if (f.level) chips.push({ key: 'level', label: levelLabel(f.level) });
  if (f.city) chips.push({ key: 'city', label: f.city });
  if (f.work) chips.push({ key: 'work', label: WORK.find((o) => o.value === f.work)!.label });
  if (f.posted) chips.push({ key: 'posted', label: POSTED.find((o) => o.value === f.posted)!.label });
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
  const [filters, setFilters] = useState<Filters>(() => {
    try {
      const city = typeof window !== 'undefined' ? window.localStorage.getItem(CITY_KEY) || '' : '';
      return { ...DEFAULT_FILTERS, city: CITIES.includes(city) ? city : '' };
    } catch {
      return DEFAULT_FILTERS;
    }
  });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [page, setPage] = useState(1);
  const listTopRef = useRef<HTMLDivElement>(null);

  const key = buildUrl(query, filters, page);
  const [feed, setFeed] = useState<(FeedResponse & { key: string }) | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [track, setTrack] = useState<Record<string, TrackState>>({});

  const current = feed && feed.key === key ? feed : null;
  const loading = !current && failedKey !== key;
  const failed = failedKey === key;
  // Keep the last counts on screen while new results load, so numbers don't flicker to zero.
  const counts: FacetCounts = feed ? { ...NO_COUNTS, ...feed } : NO_COUNTS;

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

  const search = (q: string) => {
    setQuery(q);
    setPage(1);
  };
  const goToPage = (n: number) => {
    setPage(n);
    // Bring the top of the list into view, below the sticky header.
    const top = listTopRef.current ? listTopRef.current.getBoundingClientRect().top + window.scrollY - 96 : 0;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  };

  const applyFilters = (next: Filters) => {
    setFilters(next);
    setPage(1);
    try {
      window.localStorage.setItem(CITY_KEY, next.city);
    } catch {
      // storage unavailable
    }
  };
  const patch = (p: Partial<Filters>) => applyFilters({ ...filters, ...p });
  const clearAll = () => applyFilters({ ...DEFAULT_FILTERS, sort: filters.sort });

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
  const allCount = Object.values(counts.domainCounts).reduce((a, b) => a + b, 0);

  return (
    <section aria-labelledby="job-openings-heading" className="space-y-5">
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

      <div className="lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6 lg:items-start">
        {/* LEFT: search + filters (desktop) */}
        <aside aria-label="Search and filters" className="hidden lg:block sticky top-24 rolewise-card p-4 max-h-[calc(100dvh-7.5rem)] overflow-y-auto">
          <FieldTabs value={filters.domain} counts={counts.domainCounts} allCount={allCount} onChange={(d) => patch({ domain: d })} />
          <div className="mt-3">
            <SearchBox initial={query} onSearch={search} suggestions={quickQueries} />
          </div>
          <div className="mt-2">
            <FilterSections filters={filters} counts={counts} onChange={patch} />
          </div>
          {chips.length > 0 && (
            <button type="button" onClick={clearAll} className="mt-3 text-xs font-semibold text-[#6B6259] hover:text-[#1A1714] underline underline-offset-2 cursor-pointer">
              Clear all filters
            </button>
          )}
        </aside>

        {/* RIGHT: shortcuts, count, sort, list */}
        <div className="min-w-0" ref={listTopRef}>
          {/* Phone / tablet: search + Filters button */}
          <div className="lg:hidden flex gap-2 mb-3">
            <div className="flex-1 min-w-0">
              <SearchBox initial={query} onSearch={search} suggestions={quickQueries} />
            </div>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              aria-haspopup="dialog"
              aria-label={chips.length ? `Filters, ${chips.length} on` : 'Filters'}
              className={`h-11 px-3.5 rounded-xl border text-sm font-semibold inline-flex items-center gap-2 shrink-0 cursor-pointer ${
                chips.length ? 'bg-[#1A1714] border-[#1A1714] text-white' : 'bg-white border-[#E6E0D7] text-[#1A1714]'
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
          </div>

          {/* Quick filters with counts */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Quick filters">
            {PRESETS.map((p) => {
              const on = Object.entries(p.patch).every(([k, v]) => filters[k as keyof Filters] === v);
              const n = p.count(counts);
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => patch(on ? Object.fromEntries(Object.keys(p.patch).map((k) => [k, DEFAULT_FILTERS[k as keyof Filters]])) : p.patch)}
                  className={`shrink-0 h-10 px-3.5 rounded-full border text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                    on ? 'bg-[#1A1714] border-[#1A1714] text-white' : 'bg-white border-[#E6E0D7] text-[#1A1714] hover:border-[#1A1714]/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  {p.label}
                  {feed && <span className={`tabular-nums font-normal ${on ? 'text-white/70' : 'text-[#9A9086]'}`}>{n}</span>}
                </button>
              );
            })}
          </div>

          {/* Active filters as removable chips (phones; the sidebar shows them on desktop) */}
          {chips.length > 0 && (
            <div className="lg:hidden mt-2.5 flex flex-wrap items-center gap-1.5" aria-label="Active filters">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => patch({ [c.key]: DEFAULT_FILTERS[c.key] } as Partial<Filters>)}
                  className="h-8 pl-3 pr-2 rounded-full bg-[#FAF8F4] border border-[#E6E0D7] text-xs font-semibold text-[#1A1714] inline-flex items-center gap-1 cursor-pointer"
                >
                  {c.label}
                  <X className="w-3 h-3 text-[#6B6259]" aria-hidden="true" />
                  <span className="sr-only">Remove filter</span>
                </button>
              ))}
              <button type="button" onClick={clearAll} className="h-8 px-2 text-xs font-semibold text-[#6B6259] cursor-pointer">
                Clear all
              </button>
            </div>
          )}

          {/* Count + sort */}
          <div className="mt-3 mb-2.5 flex items-center justify-between gap-3 min-h-9">
            <p className="text-sm text-[#6B6259]" aria-live="polite">
              {current ? (
                <>
                  <span className="font-semibold text-[#1A1714]">{current.total.toLocaleString('en-IN')} jobs</span>
                  {query ? <> for “{query}”</> : null}
                </>
              ) : (
                <span className="sr-only">Loading jobs</span>
              )}
            </p>
            <label className="relative inline-flex items-center text-xs text-[#6B6259] shrink-0">
              <span className="sr-only">Sort jobs</span>
              <select
                value={filters.sort}
                onChange={(e) => patch({ sort: e.target.value as Filters['sort'] })}
                className="appearance-none h-9 pl-3 pr-8 rounded-lg bg-transparent hover:bg-white border border-transparent hover:border-[#E6E0D7] text-sm font-semibold text-[#1A1714] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#1A1714]/20"
              >
                <option value="relevant">Best match</option>
                <option value="recent">Most recent</option>
              </select>
              <ChevronDown className="w-4 h-4 absolute right-2 pointer-events-none text-[#6B6259]" aria-hidden="true" />
            </label>
          </div>

          {current?.relaxed && (
            <p className="mb-2.5 text-xs text-[#8A5A12]">No openings titled “{query}” right now, so these are other {current.relaxedDomain} roles.</p>
          )}

          <ul className="space-y-2.5" aria-busy={loading}>
            {loading &&
              [0, 1, 2, 3].map((i) => (
                <li key={i} className="rolewise-card p-4 flex items-center gap-3 animate-pulse" aria-hidden="true">
                  <div className="w-12 h-12 rounded-xl bg-[#F3EFE9]" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 rounded bg-[#F3EFE9]" />
                    <div className="h-2.5 w-1/3 rounded bg-[#F3EFE9]" />
                  </div>
                </li>
              ))}

            {current?.jobs.map((job) => {
              const state = track[job.id] || 'idle';
              const href = `/find-jobs/job?id=${encodeURIComponent(job.id)}${query ? `&q=${encodeURIComponent(query)}` : ''}`;
              return (
                <li key={job.id} className="relative rolewise-card p-4 sm:p-5 hover:border-[#CFC7BC] hover:shadow-[0_6px_24px_rgba(26,23,20,0.06)] transition-[border-color,box-shadow]">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div
                      className="w-12 h-12 rounded-xl border border-[#E6E0D7] flex items-center justify-center overflow-hidden shrink-0 text-base font-bold text-[#1A1714]"
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
                      <h3 className="text-sm sm:text-[15px] font-semibold text-[#1A1714] leading-snug pr-14">
                        {/* The whole card opens the job page (stretched link). */}
                        <Link href={href} className="after:absolute after:inset-0 after:rounded-[inherit] focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-[#1A1714]/30">
                          {job.title}
                        </Link>
                      </h3>
                      <p className="text-xs mt-0.5">
                        <span className="font-semibold text-[#1A1714]">{job.company}</span>
                        <span className="text-[#9A9086]"> · {job.domain}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6B6259]">
                        <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" aria-hidden="true" />{job.location}</span>
                        {job.type && <span className="inline-flex items-center gap-1"><Briefcase className="w-3 h-3" aria-hidden="true" />{job.type}</span>}
                        {job.salary && <span className="inline-flex items-center gap-1"><Wallet className="w-3 h-3" aria-hidden="true" />{job.salary}</span>}
                      </div>
                      {state === 'saved' && (
                        <p className="relative z-10 mt-2 text-[11px] text-[#2F6B42] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Saved ·{' '}
                          <Link href="/jobs" className="font-semibold underline underline-offset-2">Open tracker</Link>
                        </p>
                      )}
                      {state === 'error' && <p className="relative z-10 mt-2 text-[11px] text-[#A4493A]">Couldn’t save. Try again.</p>}
                    </div>

                    <div className="absolute top-4 right-4 sm:top-5 sm:right-5 flex flex-col items-end gap-2">
                      {job.postedAt && <span className="text-[11px] text-[#9A9086] tabular-nums">{timeAgo(job.postedAt).replace(' ago', '')}</span>}
                    </div>
                    {state !== 'saved' && (
                      <button
                        type="button"
                        onClick={() => saveToTracker(job, 'saved')}
                        disabled={state === 'saving'}
                        aria-label={`Save ${job.title} at ${job.company}`}
                        className="relative z-10 self-end shrink-0 w-10 h-10 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#1A1714] text-[#1A1714] inline-flex items-center justify-center disabled:opacity-60 cursor-pointer"
                      >
                        {state === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Bookmark className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {(failed || (current && current.total === 0)) && (
            <div className="rounded-2xl border border-dashed border-[#DDD5CA] bg-white/60 p-6 text-center">
              <p className="text-sm font-semibold text-[#1A1714]">{failed ? 'Jobs couldn’t load right now' : 'No jobs match your search'}</p>
              <p className="text-xs text-[#6B6259] mt-1">{failed ? 'Please try again in a minute.' : 'Try a shorter search or remove a filter.'}</p>
              {!failed && chips.length > 0 && (
                <button type="button" onClick={clearAll} className="mt-3 h-9 px-4 rounded-lg border border-[#E6E0D7] bg-white text-xs font-semibold text-[#1A1714] hover:border-[#1A1714] cursor-pointer">
                  Clear filters
                </button>
              )}
            </div>
          )}

          {current && current.total > PAGE_SIZE && (
            <Pagination page={page} totalPages={Math.ceil(current.total / PAGE_SIZE)} onChange={goToPage} />
          )}
        </div>
      </div>

      {sheetOpen && (
        <FilterSheet
          query={query}
          initial={filters}
          onClose={() => setSheetOpen(false)}
          onApply={(f) => {
            applyFilters(f);
            setSheetOpen(false);
          }}
        />
      )}
    </section>
  );
}

/* ---------------- Search ---------------- */

function SearchBox({ initial, onSearch, suggestions }: { initial: string; onSearch: (q: string) => void; suggestions: string[] }) {
  const [draft, setDraft] = useState(initial);
  const [open, setOpen] = useState(false);
  const list = suggestions.filter((q) => q && q !== initial);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        setOpen(false);
        onSearch(draft.trim());
      }}
      className="relative"
    >
      <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-[#E6E0D7] bg-white focus-within:border-[#1A1714] focus-within:ring-2 focus-within:ring-[#1A1714]/15">
        <Search className="w-4 h-4 text-[#9A9086] shrink-0" aria-hidden="true" />
        <input
          type="search"
          aria-label="Search jobs by role, skill or company"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder="Search role, skill or company"
          autoComplete="off"
          enterKeyHint="search"
          className="w-full min-w-0 bg-transparent outline-none text-sm text-[#1A1714] placeholder:text-[#9A9086] [&::-webkit-search-cancel-button]:hidden"
        />
        {draft && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setDraft('');
              onSearch('');
            }}
            className="text-[#9A9086] hover:text-[#1A1714] p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {open && !draft && list.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 rounded-xl border border-[#E6E0D7] bg-white shadow-lg p-1.5">
          <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold text-[#9A9086]">Your roles</p>
          {list.map((q) => (
            <button
              key={q}
              type="button"
              // mousedown so it runs before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                setDraft(q);
                onSearch(q);
                setOpen(false);
              }}
              className="w-full text-left px-2.5 py-2 rounded-lg text-sm text-[#1A1714] hover:bg-[#FAF8F4] flex items-center gap-2 cursor-pointer"
            >
              <Briefcase className="w-3.5 h-3.5 text-[#9A9086]" aria-hidden="true" />
              {q}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}

/* ---------------- Filters ---------------- */

function FieldTabs({ value, counts, allCount, onChange }: { value: string; counts: Counts; allCount: number; onChange: (d: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Field">
      {FIELD_TABS.map((d) => {
        const active = value === d;
        const n = d ? counts[d] : allCount;
        return (
          <button
            key={d || 'all'}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(d)}
            className={`h-9 px-3.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
              active ? 'bg-[#1A1714] text-white border-[#1A1714]' : 'bg-white text-[#574F46] border-[#E6E0D7] hover:border-[#1A1714]/50'
            }`}
            title={typeof n === 'number' ? `${n} jobs` : undefined}
          >
            {d || 'All'}
          </button>
        );
      })}
    </div>
  );
}

function FilterSections({ filters, counts, onChange }: { filters: Filters; counts: FacetCounts; onChange: (p: Partial<Filters>) => void }) {
  const cities = [...CITIES].sort((a, b) => (counts.cityCounts[b] || 0) - (counts.cityCounts[a] || 0));
  return (
    <div className="divide-y divide-[#E6E0D7]">
      <Section title="Experience" value={filters.level ? levelLabel(filters.level) : 'All experience levels'}>
        <Option label="All experience levels" active={!filters.level} onClick={() => onChange({ level: '' })} />
        <Option label="Early career" hint="Internship + entry level" count={counts.levelCounts.early} active={filters.level === 'early'} onClick={() => onChange({ level: 'early' })} />
        {LEVELS.map((o) => (
          <Option key={o.value} label={o.label} count={counts.levelCounts[o.value]} active={filters.level === o.value} onClick={() => onChange({ level: o.value })} />
        ))}
      </Section>

      <Section title="Location" value={filters.city || 'All India'}>
        <Option label="All India" active={!filters.city} onClick={() => onChange({ city: '' })} />
        {cities.map((c) => (
          <Option key={c} label={c} count={counts.cityCounts[c]} active={filters.city === c} onClick={() => onChange({ city: c })} hideIfZero />
        ))}
      </Section>

      <Section title="Work type" value={filters.work ? WORK.find((o) => o.value === filters.work)!.label : 'Any'}>
        <Option label="Any" active={!filters.work} onClick={() => onChange({ work: '' })} />
        {WORK.map((o) => (
          <Option key={o.value} label={o.label} count={counts.workCounts[o.value]} active={filters.work === o.value} onClick={() => onChange({ work: o.value })} />
        ))}
      </Section>

      <Section title="Date posted" value={filters.posted ? POSTED.find((o) => o.value === filters.posted)!.label : 'Any time'}>
        <Option label="Any time" active={!filters.posted} onClick={() => onChange({ posted: '' })} />
        {POSTED.map((o) => (
          <Option key={o.value} label={o.label} count={counts.postedCounts[o.value]} active={filters.posted === o.value} onClick={() => onChange({ posted: o.value })} />
        ))}
      </Section>

      <Section title="Field" value={filters.domain || 'All fields'}>
        <Option label="All fields" active={!filters.domain} onClick={() => onChange({ domain: '' })} />
        {DOMAINS.map((d) => (
          <Option key={d} label={d} count={counts.domainCounts[d]} active={filters.domain === d} onClick={() => onChange({ domain: d })} hideIfZero />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, value, children }: { title: string; value: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = `filter-${title.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="py-1">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 py-2.5 text-left cursor-pointer group"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[#1A1714]">{title}</span>
          <span className="block text-xs text-[#6B6259] truncate">{value}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-[#6B6259] group-hover:text-[#1A1714] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div id={id} role="radiogroup" aria-label={title} className="pb-2 space-y-0.5">
          {children}
        </div>
      )}
    </div>
  );
}

function Option({ label, hint, count, active, onClick, hideIfZero }: { label: string; hint?: string; count?: number; active: boolean; onClick: () => void; hideIfZero?: boolean }) {
  if (hideIfZero && !active && !count) return null;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={`w-full min-h-9 px-2.5 py-1.5 rounded-lg flex items-center gap-2 text-left text-[13px] cursor-pointer transition-colors ${
        active ? 'bg-[#FFF4CC] text-[#1A1714] font-semibold' : 'text-[#574F46] hover:bg-[#FAF8F4]'
      }`}
    >
      <span className={`w-4 h-4 shrink-0 flex items-center justify-center ${active ? '' : 'opacity-0'}`} aria-hidden="true">
        <Check className="w-3.5 h-3.5" />
      </span>
      <span className="flex-1 min-w-0">
        {label}
        {hint && <span className="block text-[11px] font-normal text-[#9A9086]">{hint}</span>}
      </span>
      {typeof count === 'number' && <span className="text-[11px] font-normal text-[#9A9086] tabular-nums">{count}</span>}
    </button>
  );
}

/* ---------------- Phone filter sheet ---------------- */

function FilterSheet({ query, initial, onClose, onApply }: { query: string; initial: Filters; onClose: () => void; onApply: (f: Filters) => void }) {
  const [draft, setDraft] = useState<Filters>(initial);
  const [preview, setPreview] = useState<(FeedResponse & { key: string }) | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const draftKey = buildUrl(query, draft, 1);

  // Live counts and "Show N jobs" for the choices in the sheet.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(draftKey)
        .then((r) => r.json() as Promise<FeedResponse>)
        .then((data) => {
          if (!cancelled) setPreview({ ...data, key: draftKey });
        })
        .catch(() => undefined);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [draftKey]);

  // Dialog basics: Escape closes, focus moves in and stays in, page doesn't scroll behind.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select');
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

  const counts: FacetCounts = preview ? { ...NO_COUNTS, ...preview } : NO_COUNTS;
  const total = preview?.key === draftKey ? preview.total : null;
  const allCount = Object.values(counts.domainCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 z-[80] lg:hidden">
      <button type="button" aria-label="Close filters" onClick={onClose} className="absolute inset-0 bg-[#1A1714]/30 cursor-default" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="filters-title"
        className="absolute inset-x-0 bottom-0 top-12 bg-white rounded-t-[24px] flex flex-col shadow-[0_-10px_40px_rgba(26,23,20,0.18)] animate-in slide-in-from-bottom duration-200"
      >
        <div className="flex items-center justify-between px-5 h-14 border-b border-[#E6E0D7] shrink-0">
          <h2 id="filters-title" className="text-base font-bold text-[#1A1714]">Filters</h2>
          <button type="button" onClick={onClose} aria-label="Close filters" className="w-10 h-10 rounded-full flex items-center justify-center text-[#6B6259] hover:bg-[#FAF8F4] cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <FieldTabs value={draft.domain} counts={counts.domainCounts} allCount={allCount} onChange={(d) => setDraft((f) => ({ ...f, domain: d }))} />
          <div className="mt-2">
            <FilterSections filters={draft} counts={counts} onChange={(p) => setDraft((f) => ({ ...f, ...p }))} />
          </div>
        </div>
        <div className="shrink-0 border-t border-[#E6E0D7] px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] flex items-center justify-between gap-3">
          <button type="button" onClick={() => setDraft({ ...DEFAULT_FILTERS, sort: draft.sort })} className="h-11 px-2 text-sm font-semibold text-[#574F46] cursor-pointer">
            Reset
          </button>
          <button type="button" onClick={() => onApply(draft)} className="h-11 px-6 rounded-xl bg-[#1A1714] text-white text-sm font-semibold cursor-pointer">
            {total === null ? 'Show jobs' : total === 0 ? 'No jobs' : `Show ${total.toLocaleString('en-IN')} jobs`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Pagination ---------------- */

/** 1 … 4 5 6 … 51 — first, last, and the pages around the current one. */
function pageList(page: number, total: number): (number | '…')[] {
  const pages = new Set([1, total, page - 1, page, page + 1].filter((n) => n >= 1 && n <= total));
  if (page <= 3) [2, 3, 4].forEach((n) => n <= total && pages.add(n));
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach((n) => n >= 1 && pages.add(n));
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push('…');
    out.push(n);
  });
  return out;
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (n: number) => void }) {
  const btn = 'h-10 min-w-10 px-2 rounded-xl text-sm font-semibold inline-flex items-center justify-center transition-colors';
  return (
    <nav aria-label="Job pages" className="mt-5 flex items-center justify-center gap-1 sm:gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className={`${btn} border border-[#E6E0D7] bg-white text-[#1A1714] hover:border-[#1A1714] disabled:opacity-40 disabled:hover:border-[#E6E0D7] disabled:cursor-not-allowed cursor-pointer`}
      >
        <ChevronLeft className="w-4 h-4" aria-hidden="true" />
      </button>
      {pageList(page, totalPages).map((n, i) =>
        n === '…' ? (
          <span key={`gap-${i}`} className="w-6 text-center text-sm text-[#9A9086]" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            aria-label={`Page ${n}`}
            aria-current={n === page ? 'page' : undefined}
            className={`${btn} cursor-pointer ${n === page ? 'bg-[#1A1714] text-white' : 'text-[#574F46] hover:bg-white hover:text-[#1A1714]'}`}
          >
            {n}
          </button>
        )
      )}
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className={`${btn} border border-[#E6E0D7] bg-white text-[#1A1714] hover:border-[#1A1714] disabled:opacity-40 disabled:hover:border-[#E6E0D7] disabled:cursor-not-allowed cursor-pointer`}
      >
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </button>
    </nav>
  );
}


