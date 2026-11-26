'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Bookmark, BookmarkCheck, Briefcase, CalendarDays, CheckCircle2, Link2, Loader2, MapPin, Share2, Target, Wallet } from 'lucide-react';
import { quickAddJob } from '@/services/api';
import { keywordReport } from '@/lib/get-noticed';
import { todayISO } from '@/lib/tracker';

interface JobDetail {
  id: string;
  title: string;
  company: string;
  logo: string | null;
  location: string;
  remote: boolean;
  type: string;
  domain: string;
  level: string;
  postedAt: string | null;
  url: string;
  source: string;
  sourceUrl: string | null;
  salary: string | null;
  descriptionHtml: string;
  descriptionText: string;
}

interface SimilarJob {
  id: string;
  title: string;
  company: string;
  logo: string | null;
  location: string;
  type: string;
}

const LEVEL_LABEL: Record<string, string> = {
  intern: 'Internship',
  entry: 'Entry level',
  mid: 'Mid level',
  senior: 'Senior',
  lead: 'Lead / Manager',
};

type Track = 'idle' | 'asking' | 'saving' | 'saved' | 'applied' | 'error';

const TINTS = ['#FFE58A', '#E3EEF9', '#EEF7F0', '#F3EFE9', '#FFF0ED', '#EFEAE3', '#E8F0FF'];
const tintFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
};

/** "3-5 years", "4+ years", "minimum 2 years" → "3–5 yrs", "4+ yrs", "2+ yrs". */
function experienceFrom(text: string): string | null {
  const t = text.replace(/\s+/g, ' ');
  const range = t.match(/(\d{1,2})\s*(?:-|–|to)\s*(\d{1,2})\+?\s*(?:years|yrs)/i);
  if (range && +range[1] < +range[2] && +range[2] <= 30) return `${range[1]}–${range[2]} yrs`;
  const plus = t.match(/(\d{1,2})\s*\+\s*(?:years|yrs)/i) || t.match(/(?:minimum|at least|min\.?)\s*(?:of\s*)?(\d{1,2})\s*(?:years|yrs)/i);
  if (plus && +plus[1] <= 30) return `${plus[1]}+ yrs`;
  return null;
}

function postedLabel(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Posted ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/** One job with its full description, like UXHack's job page. Only Apply leaves Rolewise. */
export default function JobDetailPage() {
  return (
    <Suspense fallback={null}>
      <JobDetailRoute />
    </Suspense>
  );
}

/** Remount per job, so opening a similar job starts fresh. */
function JobDetailRoute() {
  const params = useSearchParams();
  const id = params.get('id');
  return <JobDetailView key={id || 'none'} id={id} q={params.get('q') || ''} />;
}

function JobDetailView({ id, q }: { id: string | null; q: string }) {
  const router = useRouter();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>(id ? 'loading' : 'missing');
  const [similar, setSimilar] = useState<SimilarJob[] | null>(null);
  const [track, setTrack] = useState<Track>('idle');
  const [fitLoading, setFitLoading] = useState(false);
  const [fitError, setFitError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/jobs/detail?id=${encodeURIComponent(id)}&q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { job: JobDetail }) => {
        if (cancelled) return;
        setJob(d.job);
        setState('ready');
        // Similar openings: same field, similar title.
        const words = d.job.title.replace(/\(.*?\)/g, '').split(/[^A-Za-z/]+/).filter((w) => w.length > 2 && !/^(senior|junior|lead|staff|principal|manager|ii|iii)$/i.test(w)).slice(0, 3).join(' ');
        return fetch(`/api/jobs?q=${encodeURIComponent(words)}&domain=${encodeURIComponent(d.job.domain)}`)
          .then((r) => r.json())
          .then((list: { jobs: SimilarJob[] }) => {
            if (!cancelled) setSimilar(list.jobs.filter((j) => j.id !== d.job.id).slice(0, 5));
          });
      })
      .catch(() => {
        if (!cancelled) setState('missing');
      });
    return () => {
      cancelled = true;
    };
    // Re-runs when a similar job is opened (same page, new ?id=).
  }, [id, q]);

  const skills = useMemo(() => {
    if (!job) return [];
    const r = keywordReport(job.descriptionText, '');
    return [...r.found, ...r.missing].filter((k) => !['Communication', 'Cross-functional teams', 'Stakeholder management'].includes(k)).slice(0, 10);
  }, [job]);
  const experience = useMemo(() => (job ? experienceFrom(job.descriptionText) : null), [job]);

  const trackerSource = (s: string) => (s === 'Company careers' ? 'Company site' : ['LinkedIn', 'Naukri', 'Indeed'].includes(s) ? s : 'Other');

  const save = async (status: 'saved' | 'applied') => {
    if (!job) return;
    setTrack('saving');
    try {
      await quickAddJob({
        job_title: job.title,
        company: job.company,
        application_status: status,
        applied_at: status === 'applied' ? todayISO() : null,
        source: trackerSource(job.source),
        job_url: job.url,
        location: job.location,
        work_model: job.type || null,
        job_description: job.descriptionText,
        notes: `Found in Rolewise Find Jobs (${job.source})`,
      });
      setTrack(status);
    } catch {
      setTrack('error');
    }
  };

  /** Save the job with its description, then open Rolewise's fit analysis for it. */
  const checkFit = async () => {
    if (!job) return;
    setFitLoading(true);
    setFitError(null);
    try {
      const role = await quickAddJob({
        job_title: job.title,
        company: job.company,
        application_status: 'saved',
        source: trackerSource(job.source),
        job_url: job.url,
        location: job.location,
        work_model: job.type || null,
        job_description: job.descriptionText,
        notes: `Found in Rolewise Find Jobs (${job.source})`,
      });
      router.push(`/jobs/new?roleId=${role.id}`);
    } catch {
      setFitError('Couldn’t start the fit check. Please try again.');
      setFitLoading(false);
    }
  };

  const share = async () => {
    if (!job) return;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${job.title} at ${job.company}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // share sheet closed
    }
  };

  if (state === 'loading') {
    return (
      <div className="max-w-6xl mx-auto space-y-4 animate-pulse" aria-busy="true">
        <div className="h-4 w-28 rounded bg-[#EFEAE3]" />
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 space-y-4 lg:space-y-0">
          <div className="space-y-4">
            <div className="rolewise-card p-7 space-y-3">
              <div className="h-14 w-14 rounded-xl bg-[#F3EFE9]" />
              <div className="h-5 w-1/2 rounded bg-[#F3EFE9]" />
              <div className="h-3 w-1/3 rounded bg-[#F3EFE9]" />
              <div className="h-12 w-full rounded-xl bg-[#F3EFE9]" />
            </div>
            <div className="rolewise-card p-7 space-y-2.5">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-3 rounded bg-[#F3EFE9]" style={{ width: `${92 - i * 7}%` }} />
              ))}
            </div>
          </div>
          <div className="rolewise-card h-80" />
        </div>
      </div>
    );
  }

  if (state === 'missing' || !job) {
    return (
      <div className="max-w-xl mx-auto text-center rolewise-card p-8 space-y-3">
        <h1 className="text-lg font-bold text-[#1A1714]">This job is no longer listed</h1>
        <p className="text-sm text-[#6B6259]">The company may have closed it. Openings update every hour.</p>
        <Link href="/find-jobs" className="inline-flex h-11 px-5 rounded-xl bg-[#1A1714] text-white text-sm font-semibold items-center">
          Browse open jobs
        </Link>
      </div>
    );
  }

  const meta = [
    { icon: MapPin, text: job.location },
    job.type ? { icon: Briefcase, text: job.type } : null,
    job.salary ? { icon: Wallet, text: job.salary } : null,
    postedLabel(job.postedAt) ? { icon: CalendarDays, text: postedLabel(job.postedAt)! } : null,
  ].filter(Boolean) as { icon: React.ElementType; text: string }[];

  const isSaved = track === 'saved' || track === 'applied';

  return (
    <div className="max-w-6xl mx-auto pb-28 sm:pb-12 animate-in fade-in duration-300">
      <button
        type="button"
        // Going back keeps the list exactly as it was (search, filters, page).
        onClick={() => (window.history.length > 1 ? router.back() : router.push('/find-jobs'))}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#574F46] hover:text-[#1A1714] mb-4 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to all jobs
      </button>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-5 lg:items-start space-y-4 lg:space-y-0">
        <div className="space-y-4 min-w-0">
          {/* HEADER */}
          <header className="rolewise-card p-5 sm:p-8">
            <div className="flex items-start gap-4 sm:gap-5">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-[#E6E0D7] flex items-center justify-center overflow-hidden shrink-0 text-xl font-bold text-[#1A1714]"
                style={{ background: job.logo ? '#FFFFFF' : tintFor(job.company) }}
                aria-hidden="true"
              >
                {job.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={job.logo} alt="" className="w-full h-full object-contain" />
                ) : (
                  job.company.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-[26px] font-bold text-[#1A1714] tracking-[-0.015em] leading-tight">{job.title}</h1>
                <p className="mt-1.5 text-sm sm:text-base">
                  <span className="font-semibold text-[#1A1714]">{job.company}</span>
                  <span className="text-[#9A9086]"> · {job.domain}</span>
                </p>
                <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs sm:text-sm text-[#574F46]">
                  {meta.map(({ icon: Icon, text }) => (
                    <li key={text} className="inline-flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5 text-[#9A9086]" aria-hidden="true" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* ACTIONS: only Apply leaves Rolewise */}
            <div className="hidden sm:flex items-center gap-3 mt-7">
              {track === 'asking' ? (
                <AppliedPrompt onYes={() => save('applied')} onNo={() => setTrack('idle')} />
              ) : (
                <>
                  <ApplyLink url={job.url} onClick={() => track === 'idle' && setTrack('asking')} className="flex-1 max-w-[460px]" />
                  <button
                    type="button"
                    onClick={() => !isSaved && save('saved')}
                    disabled={track === 'saving'}
                    aria-pressed={isSaved}
                    className="h-12 w-36 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#1A1714] text-sm font-semibold text-[#1A1714] inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                  >
                    {track === 'saving' ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : isSaved ? <BookmarkCheck className="w-4 h-4" aria-hidden="true" /> : <Bookmark className="w-4 h-4" aria-hidden="true" />}
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={share}
                    className="h-12 w-36 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#1A1714] text-sm font-semibold text-[#1A1714] inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {shared ? <Link2 className="w-4 h-4" aria-hidden="true" /> : <Share2 className="w-4 h-4" aria-hidden="true" />}
                    {shared ? 'Link copied' : 'Share'}
                  </button>
                </>
              )}
            </div>
            <Status track={track} fitError={fitError} />
          </header>

          {/* JOB DESCRIPTION */}
          <article className="rolewise-card p-5 sm:p-8" aria-labelledby="jd-heading">
            <h2 id="jd-heading" className="text-xs font-bold tracking-[0.12em] uppercase text-[#574F46]">Job description</h2>

            {(experience || LEVEL_LABEL[job.level] || job.remote) && (
              <dl className="mt-4 flex flex-wrap gap-2.5">
                {experience && <Fact label="Experience" value={experience} />}
                {LEVEL_LABEL[job.level] && <Fact label="Level" value={LEVEL_LABEL[job.level]} />}
                <Fact label="Work type" value={job.remote ? 'Remote' : 'On-site / Hybrid'} />
              </dl>
            )}

            {job.descriptionHtml ? (
              <div className="rw-jd mt-5" dangerouslySetInnerHTML={{ __html: job.descriptionHtml }} />
            ) : (
              <p className="mt-4 text-sm text-[#6B6259]">The full description is on the company’s posting. Use Apply to read it there.</p>
            )}

            {skills.length > 0 && (
              <div className="mt-7">
                <h3 className="text-xs font-bold tracking-[0.12em] uppercase text-[#574F46]">Skills</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {skills.map((k) => (
                    <li key={k} className="rounded-full bg-[#FFF4CC] text-[#5C4A00] px-3 py-1 text-xs font-semibold">
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-7 pt-4 border-t border-[#E6E0D7] text-[11px] text-[#9A9086]">
              {job.source === 'Company careers' ? (
                <>From {job.company}’s careers page. Apply opens their official posting.</>
              ) : (
                <>
                  Listing via{' '}
                  <a href={job.sourceUrl || job.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[#1A1714]">
                    {job.source}
                  </a>
                  .
                </>
              )}
            </p>
          </article>
        </div>

        {/* RIGHT COLUMN */}
        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="rolewise-card p-5" aria-labelledby="fit-heading">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-[#FFF4CC] flex items-center justify-center shrink-0" aria-hidden="true">
                <Target className="w-5 h-5 text-[#1A1714]" />
              </span>
              <div>
                <h2 id="fit-heading" className="text-sm font-bold text-[#1A1714]">Check your fit before you apply</h2>
                <p className="mt-1 text-xs text-[#6B6259] leading-relaxed">See what to lead with and what to fix, then get a prep plan.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={checkFit}
              disabled={fitLoading}
              className="mt-4 w-full h-11 rounded-xl bg-[#1A1714] hover:bg-[#3B342D] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {fitLoading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              Check my fit
            </button>
          </section>

          <section className="rolewise-card overflow-hidden" aria-labelledby="similar-heading">
            <h2 id="similar-heading" className="px-5 pt-5 pb-2 text-sm font-semibold text-[#1A1714]">Jobs you might be interested in</h2>
            {similar === null ? (
              <div className="px-5 pb-5 space-y-3 animate-pulse" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#F3EFE9]" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 w-3/4 rounded bg-[#F3EFE9]" />
                      <div className="h-2.5 w-1/2 rounded bg-[#F3EFE9]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : similar.length === 0 ? (
              <p className="px-5 pb-5 text-xs text-[#6B6259]">No similar openings right now.</p>
            ) : (
              <ul className="divide-y divide-[#E6E0D7]">
                {similar.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/find-jobs/job?id=${encodeURIComponent(s.id)}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                      onClick={() => window.scrollTo({ top: 0 })}
                      className="flex gap-3 px-5 py-4 hover:bg-[#FAF8F4] transition-colors"
                    >
                      <span
                        className="w-11 h-11 rounded-xl border border-[#E6E0D7] flex items-center justify-center overflow-hidden shrink-0 text-sm font-bold text-[#1A1714]"
                        style={{ background: s.logo ? '#FFFFFF' : tintFor(s.company) }}
                        aria-hidden="true"
                      >
                        {s.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.logo} alt="" className="w-full h-full object-contain" loading="lazy" />
                        ) : (
                          s.company.charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-[#1A1714] leading-snug">{s.title}</span>
                        <span className="block text-xs text-[#574F46] mt-1">{s.company}</span>
                        <span className="mt-1 flex items-center gap-1 text-[11px] text-[#6B6259]">
                          <MapPin className="w-3 h-3" aria-hidden="true" />
                          {s.location}
                        </span>
                        {s.type && (
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-[#6B6259]">
                            <Briefcase className="w-3 h-3" aria-hidden="true" />
                            {s.type}
                          </span>
                        )}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {/* PHONE: sticky actions above the bottom nav */}
      <div className="sm:hidden fixed inset-x-0 bottom-[64px] z-40 bg-white/95 backdrop-blur border-t border-[#E6E0D7] px-4 py-3 flex items-center gap-2">
        {track === 'asking' ? (
          <div className="w-full flex justify-end">
            <AppliedPrompt onYes={() => save('applied')} onNo={() => setTrack('idle')} />
          </div>
        ) : (
          <>
            <ApplyLink url={job.url} onClick={() => track === 'idle' && setTrack('asking')} className="flex-1" />
            <button
              type="button"
              onClick={() => !isSaved && save('saved')}
              aria-label={isSaved ? 'Saved' : 'Save job'}
              className="h-12 w-12 rounded-xl border border-[#E6E0D7] bg-white text-[#1A1714] inline-flex items-center justify-center cursor-pointer"
            >
              {isSaved ? <BookmarkCheck className="w-5 h-5" aria-hidden="true" /> : <Bookmark className="w-5 h-5" aria-hidden="true" />}
            </button>
            <button type="button" onClick={share} aria-label="Share job" className="h-12 w-12 rounded-xl border border-[#E6E0D7] bg-white text-[#1A1714] inline-flex items-center justify-center cursor-pointer">
              <Share2 className="w-5 h-5" aria-hidden="true" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ApplyLink({ url, onClick, className = '' }: { url: string; onClick: () => void; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`h-12 px-6 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#1A1714] text-sm font-bold inline-flex items-center justify-center gap-2 ${className}`}
    >
      Apply <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
      <span className="sr-only">on the company’s site (opens in a new tab)</span>
    </a>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#FAF8F4] border border-[#E6E0D7] px-4 py-2.5">
      <dt className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#6B6259]">{label}</dt>
      <dd className="text-sm font-semibold text-[#1A1714] mt-0.5">{value}</dd>
    </div>
  );
}

function Status({ track, fitError }: { track: Track; fitError: string | null }) {
  if (fitError) return <p className="mt-3 text-xs text-[#A4493A]">{fitError}</p>;
  if (track === 'saved' || track === 'applied')
    return (
      <p className="mt-3 text-xs text-[#2F6B42] flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
        {track === 'applied' ? 'Marked as applied in your Job Tracker.' : 'Saved to your Job Tracker.'}{' '}
        <Link href="/jobs" className="font-semibold underline underline-offset-2">Open tracker</Link>
      </p>
    );
  if (track === 'error') return <p className="mt-3 text-xs text-[#A4493A]">Couldn’t save this job. Please try again.</p>;
  return null;
}

function AppliedPrompt({ onYes, onNo }: { onYes: () => void; onNo: () => void }) {
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Did you apply?">
      <span className="text-sm font-semibold text-[#1A1714] mr-1">Did you apply?</span>
      <button type="button" onClick={onYes} className="h-11 px-5 rounded-xl bg-[#1A1714] hover:bg-[#3B342D] text-white text-sm font-semibold cursor-pointer">
        Yes
      </button>
      <button type="button" onClick={onNo} className="h-11 px-5 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#1A1714] text-sm font-semibold text-[#1A1714] cursor-pointer">
        No
      </button>
    </div>
  );
}
