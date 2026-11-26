'use client';

import React, { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Building2, MapPin, TrendingUp } from 'lucide-react';
import { timeAgo } from '@/lib/job-portals';
import { CompanyLogo } from '@/components/jobs/CompanyLogo';

interface MiniJob {
  id: string;
  title: string;
  company: string;
  logo: string | null;
  location: string;
  postedAt: string | null;
}

interface Feed {
  jobs: MiniJob[];
  total: number;
  companies: number;
  cityCounts: Record<string, number>;
  levelCounts: Record<string, number>;
  workCounts: Record<string, number>;
  postedCounts: Record<string, number>;
  dailyCounts?: number[];
}

/** Ordinal ramp, internship → lead (light → ink). Validated: adjacent ΔE ≥ 15; values are always printed beside it. */
const LEVELS = [
  { key: 'intern', label: 'Internship', color: '#FFEDAD' },
  { key: 'entry', label: 'Entry', color: '#EBAF1A' },
  { key: 'mid', label: 'Mid', color: '#A06C0E' },
  { key: 'senior', label: 'Senior', color: '#5A4116' },
  { key: 'lead', label: 'Lead', color: '#1A1714' },
];

const fmt = (n: number) => n.toLocaleString('en-IN');

function dayLabel(daysAgo: number) {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/**
 * Dashboard infographic: live openings for the person's target role — volume and hiring trend,
 * where the jobs are, the experience mix, and the newest openings. Data comes from /api/jobs.
 */
export function JobsInfographic({ targetRole }: { targetRole?: string }) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [scope, setScope] = useState<string>(targetRole || '');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = (q: string) =>
      fetch(`/api/jobs?sort=recent${q ? `&q=${encodeURIComponent(q)}` : ''}`).then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json() as Promise<Feed>;
      });
    (async () => {
      try {
        let data = await load(targetRole || '');
        let used = targetRole || '';
        // Too few openings for the exact role → show the whole market instead of a thin chart.
        if (targetRole && data.total < 8) {
          data = await load('');
          used = '';
        }
        if (!cancelled) {
          setFeed(data);
          setScope(used);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetRole]);

  if (failed) return null;

  const q = scope ? `q=${encodeURIComponent(scope)}` : '';
  const findHref = (extra = '') => `/find-jobs${q || extra ? `?${[q, extra].filter(Boolean).join('&')}` : ''}`;

  return (
    <section aria-labelledby="jobs-infographic-heading" className="rolewise-card overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 px-5 sm:px-6 pt-5 sm:pt-6">
        <div>
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#8A6A12]">Jobs to apply</p>
          <h2 id="jobs-infographic-heading" className="mt-1 text-lg sm:text-xl font-bold text-[#1A1714] tracking-[-0.01em]">
            {feed ? (scope ? <>Open roles for {scope}</> : 'Open roles across India') : 'Open roles'}
          </h2>
        </div>
        <Link
          href={findHref()}
          data-ui-sound="click"
          className="self-start sm:self-auto inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#1A1714] hover:bg-[#3B342D] text-white text-sm font-semibold transition-colors"
        >
          Explore jobs <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </Link>
      </div>

      {!feed ? (
        <Skeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 p-5 sm:p-6">
            <HeadlinePanel feed={feed} />
            <CitiesPanel feed={feed} hrefFor={(city) => findHref(`city=${encodeURIComponent(city)}`)} />
            <MixPanel feed={feed} />
          </div>
          <FreshPicks jobs={feed.jobs.slice(0, 3)} scope={scope} />
        </>
      )}
    </section>
  );
}

/* ---------------- Headline + 14-day trend ---------------- */

function HeadlinePanel({ feed }: { feed: Feed }) {
  const week = feed.postedCounts['7'] || 0;
  const today = feed.postedCounts['1'] || 0;
  return (
    <div className="lg:col-span-5 relative overflow-hidden rounded-[20px] bg-[#1A1714] text-white p-5 sm:p-6 flex flex-col">
      {/* soft brand glow */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 w-64 h-64 rounded-full bg-[#FFD84D]/15 blur-3xl" />
      <p className="relative text-xs font-medium text-white/60">Open right now</p>
      <div className="relative mt-1 flex items-end gap-3 flex-wrap">
        <p className="text-[44px] sm:text-[52px] leading-none font-bold tracking-[-0.03em] tabular-nums">{fmt(feed.total)}</p>
        <p className="mb-1.5 text-sm text-white/70">
          jobs at <span className="font-semibold text-white">{fmt(feed.companies)}</span> companies
        </p>
      </div>
      <div className="relative mt-3 flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-[#FFD84D] text-[#1A1714] text-xs font-bold tabular-nums">
          <TrendingUp className="w-3 h-3" aria-hidden="true" />+{fmt(week)} this week
        </span>
        {today > 0 && (
          <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-white/10 text-white/85 text-xs font-semibold tabular-nums">
            {fmt(today)} today
          </span>
        )}
      </div>
      <TrendChart daily={feed.dailyCounts || []} />
    </div>
  );
}

function TrendChart({ daily }: { daily: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId().replace(/:/g, '');
  if (daily.length < 2) return null;

  const W = 320;
  const H = 96;
  const PAD_TOP = 10;
  const max = Math.max(1, ...daily);
  const x = (i: number) => (i / (daily.length - 1)) * W;
  const y = (v: number) => PAD_TOP + (1 - v / max) * (H - PAD_TOP - 4);
  const line = daily.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;
  const last = daily.length - 1;
  const active = hover ?? last;
  const daysAgo = (i: number) => last - i;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - box.left) / box.width) * last);
    setHover(Math.max(0, Math.min(last, i)));
  };

  return (
    <figure className="relative mt-auto pt-5">
      <figcaption className="flex items-center justify-between text-[11px] text-white/55 mb-2">
        <span>New openings per day</span>
        <span className="tabular-nums" aria-live="polite">
          <span className="text-white font-semibold">{daily[active]}</span> on {dayLabel(daysAgo(active))}
        </span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24 overflow-visible" role="img" aria-label={`New openings per day over the last 14 days, from ${daily[0]} to ${daily[last]}.`}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD84D" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FFD84D" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* recessive baseline */}
        <line x1="0" x2={W} y1={H} y2={H} stroke="rgba(255,255,255,0.14)" strokeWidth="1" />
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke="#FFD84D" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hover !== null && <line x1={x(active)} x2={x(active)} y1={0} y2={H} stroke="rgba(255,255,255,0.35)" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
        <circle cx={x(active)} cy={y(daily[active])} r="4.5" fill="#FFD84D" stroke="#1A1714" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <rect
          x="0"
          y="0"
          width={W}
          height={H}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
          style={{ cursor: 'crosshair' }}
        />
      </svg>
      <div className="mt-1.5 flex justify-between text-[10px] text-white/45 tabular-nums" aria-hidden="true">
        <span>{dayLabel(last)}</span>
        <span>Today</span>
      </div>
      {/* Table view for screen readers */}
      <table className="sr-only">
        <caption>New openings per day</caption>
        <tbody>
          {daily.map((v, i) => (
            <tr key={i}>
              <th scope="row">{dayLabel(daysAgo(i))}</th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/* ---------------- Where they're hiring ---------------- */

function CitiesPanel({ feed, hrefFor }: { feed: Feed; hrefFor: (city: string) => string }) {
  const rows = Object.entries(feed.cityCounts)
    .filter(([c]) => c !== 'Remote')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const remote = feed.workCounts.remote || 0;
  const max = Math.max(1, ...rows.map((r) => r[1]), remote);

  return (
    <div className="lg:col-span-4 rounded-[20px] border border-[#E6E0D7] bg-[#FDFCFA] p-5">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-[#8A6A12]" aria-hidden="true" />
        <h3 className="text-sm font-bold text-[#1A1714]">Where they’re hiring</h3>
      </div>
      {rows.length === 0 && remote === 0 ? (
        <p className="mt-4 text-xs text-[#6B6259]">No city data yet.</p>
      ) : (
        <ul className="mt-4 space-y-2.5">
          {[...rows, ...(remote ? [['Remote', remote] as [string, number]] : [])].map(([city, n], i) => (
            <li key={city}>
              <Link
                href={hrefFor(city)}
                title={`${fmt(n)} openings in ${city}`}
                className="group grid grid-cols-[84px_1fr_auto] items-center gap-3 rounded-lg -mx-1.5 px-1.5 py-1 hover:bg-[#F3EFE9] transition-colors"
              >
                <span className={`text-xs truncate ${i === 0 ? 'font-semibold text-[#1A1714]' : 'text-[#574F46]'}`}>{city}</span>
                <span className="h-2.5 rounded-full bg-[#F3EFE9] overflow-hidden" aria-hidden="true">
                  <span
                    className={`block h-full rounded-r-full ${city === 'Remote' ? 'bg-[#A06C0E]' : 'bg-[#EBAF1A]'} group-hover:brightness-95 transition-[width] duration-700 ease-out`}
                    style={{ width: `${Math.max(4, (n / max) * 100)}%` }}
                  />
                </span>
                <span className="text-xs font-semibold text-[#1A1714] tabular-nums w-10 text-right">{fmt(n)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ---------------- Experience mix ---------------- */

function MixPanel({ feed }: { feed: Feed }) {
  const parts = LEVELS.map((l) => ({ ...l, n: feed.levelCounts[l.key] || 0 }));
  const sum = Math.max(1, parts.reduce((a, b) => a + b.n, 0));
  const pct = (n: number) => Math.round((n / sum) * 100);
  const early = (feed.levelCounts.intern || 0) + (feed.levelCounts.entry || 0);

  return (
    <div className="lg:col-span-3 rounded-[20px] border border-[#E6E0D7] bg-[#FDFCFA] p-5 flex flex-col">
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-[#8A6A12]" aria-hidden="true" />
        <h3 className="text-sm font-bold text-[#1A1714]">Experience mix</h3>
      </div>

      {/* Stacked bar, 2px surface gaps between segments */}
      <div className="mt-4 flex h-3 w-full gap-[2px]" role="img" aria-label={parts.map((p) => `${p.label} ${p.n}`).join(', ')}>
        {parts
          .filter((p) => p.n > 0)
          .map((p, i, arr) => (
            <span
              key={p.key}
              title={`${p.label}: ${fmt(p.n)} (${pct(p.n)}%)`}
              className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === arr.length - 1 ? 'rounded-r-full' : ''}`}
              style={{ width: `${(p.n / sum) * 100}%`, background: p.color, minWidth: 3 }}
            />
          ))}
      </div>

      <ul className="mt-3.5 space-y-1.5">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-[3px] shrink-0 ring-1 ring-inset ring-black/5" style={{ background: p.color }} aria-hidden="true" />
            <span className="text-[#574F46] flex-1">{p.label}</span>
            <span className="font-semibold text-[#1A1714] tabular-nums">{fmt(p.n)}</span>
            <span className="text-[#9A9086] tabular-nums w-8 text-right">{pct(p.n)}%</span>
          </li>
        ))}
      </ul>

      <WorkSplit onsite={feed.workCounts.onsite || 0} remote={feed.workCounts.remote || 0} />

      <p className="mt-auto pt-3 text-[11px] text-[#6B6259] leading-snug">
        <span className="font-semibold text-[#1A1714] tabular-nums">{fmt(early)}</span> open to freshers and early-career.
      </p>
    </div>
  );
}

function WorkSplit({ onsite, remote }: { onsite: number; remote: number }) {
  const total = onsite + remote;
  if (!total) return null;
  const parts = [
    { label: 'On-site / Hybrid', n: onsite, color: '#EBAF1A' },
    { label: 'Remote', n: remote, color: '#5A4116' },
  ];
  return (
    <div className="mt-4 pt-3.5 border-t border-[#E6E0D7]">
      <p className="text-xs font-semibold text-[#1A1714]">Work type</p>
      <div className="mt-2 flex h-2.5 w-full gap-[2px]" role="img" aria-label={parts.map((p) => `${p.label} ${p.n}`).join(', ')}>
        {parts
          .filter((p) => p.n > 0)
          .map((p, i, arr) => (
            <span
              key={p.label}
              title={`${p.label}: ${fmt(p.n)}`}
              className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === arr.length - 1 ? 'rounded-r-full' : ''}`}
              style={{ width: `${(p.n / total) * 100}%`, background: p.color, minWidth: 3 }}
            />
          ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
        {parts.map((p) => (
          <li key={p.label} className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-[2px]" style={{ background: p.color }} aria-hidden="true" />
            <span className="text-[#574F46]">{p.label}</span>
            <span className="font-semibold text-[#1A1714] tabular-nums">{Math.round((p.n / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------- Newest openings ---------------- */

function FreshPicks({ jobs, scope }: { jobs: MiniJob[]; scope: string }) {
  if (!jobs.length) return null;
  return (
    <div className="border-t border-[#E6E0D7] bg-[#FAF8F4] px-5 sm:px-6 py-4">
      <p className="text-xs font-semibold text-[#574F46] mb-2.5">Fresh openings</p>
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {jobs.map((j) => (
          <li key={j.id}>
            <Link
              href={`/find-jobs/job?id=${encodeURIComponent(j.id)}${scope ? `&q=${encodeURIComponent(scope)}` : ''}`}
              className="group flex items-center gap-3 rounded-xl bg-white border border-[#E6E0D7] px-3 py-2.5 hover:border-[#CFC7BC] hover:shadow-[0_4px_14px_rgba(26,23,20,0.06)] transition-[border-color,box-shadow] h-full"
            >
              <CompanyLogo company={j.company} logo={j.logo} className="w-9 h-9 rounded-lg text-xs" />
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-semibold text-[#1A1714] truncate">{j.title}</span>
                <span className="block text-[11px] text-[#6B6259] truncate">
                  {j.company} · {j.location}
                  {j.postedAt ? ` · ${timeAgo(j.postedAt)}` : ''}
                </span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-[#9A9086] group-hover:text-[#1A1714] shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-5 sm:p-6 animate-pulse" aria-hidden="true">
      <div className="lg:col-span-5 h-60 rounded-[20px] bg-[#EFEAE3]" />
      <div className="lg:col-span-4 h-60 rounded-[20px] bg-[#F3EFE9]" />
      <div className="lg:col-span-3 h-60 rounded-[20px] bg-[#F3EFE9]" />
    </div>
  );
}
