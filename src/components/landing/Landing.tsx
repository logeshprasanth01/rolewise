'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  type LucideIcon,
  ArrowRight,
  Briefcase,
  Gauge,
  ListChecks,
  ShieldCheck,
  Target,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Info,
  Lock,
  Menu,
  MessageSquare,
  Mic,
  RotateCcw,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RolewiseLogo } from '@/components/brand/RolewiseLogo';
import { Mascot } from '@/components/brand/Mascot';
import { GlossyIcon, type GlossyShape, type GlossyTone } from '@/components/brand/GlossyIcon';
import { CtaIllustration } from '@/components/landing/CtaIllustration';

/* Photos: Unsplash. */
const photo = (id: string, w: number) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const PHOTOS = {
  videoCall: '1616587894289-86480e533129',
  resume: '1698047681432-006d2449c631',
  practice: '1758521541324-d304c5303fe5',
  interview: '1758520144437-f068ecaf0d83',
};

const NAV = [
  { href: '#product', label: 'Product' },
  { href: '#fit', label: 'Fit score' },
  { href: '#practice', label: 'Practice' },
  { href: '#start', label: 'Getting started' },
  { href: '#faq', label: 'FAQ' },
];

type TabId = 'fit' | 'prep' | 'interview' | 'tracker';

const QUICK_NAV: { icon: string; label: string; tab: TabId | 'practice' }[] = [
  { icon: 'bullseye', label: 'Role fit', tab: 'fit' },
  { icon: 'clipboard', label: 'Prep plan', tab: 'prep' },
  { icon: 'speech-balloon', label: 'Mock interview', tab: 'interview' },
  { icon: 'microphone', label: 'Voice practice', tab: 'practice' },
  { icon: 'video-camera', label: 'Video practice', tab: 'practice' },
  { icon: 'briefcase', label: 'Job tracker', tab: 'tracker' },
];

const TABS: {
  id: TabId;
  label: string;
  icon: string;
  title: string;
  body: string;
  points: string[];
  image: string;
  alt: string;
  tint: string;
}[] = [
  {
    id: 'fit',
    label: 'Role fit',
    icon: 'bullseye',
    title: 'See how well you fit, requirement by requirement',
    body: 'One score for the role, with every requirement matched to the line in your resume that backs it, or marked as a gap.',
    points: ['Strong, transferable, needs evidence or not shown', 'The legend doubles as a filter', 'The formula is one click away'],
    image: '/landing/role-fit.webp',
    alt: 'Role fit page showing an 84% strong fit and a breakdown of each requirement',
    tint: 'from-[#FFF3C2] to-[#FFE07A]',
  },
  {
    id: 'prep',
    label: 'Prep plan',
    icon: 'clipboard',
    title: 'Your gaps become a plan you can finish',
    body: 'Each weak requirement turns into a prep item, ordered with gaps first. Mark items as prepared and the plan keeps your place.',
    points: ['Quotes the job requirement it came from', '"Start here" on the next item', 'Progress is saved to your account'],
    image: '/landing/prep.webp',
    alt: 'Preparation plan with a progress card and numbered prep items',
    tint: 'from-[#E4F1E7] to-[#BFDFC7]',
  },
  {
    id: 'interview',
    label: 'Mock interview',
    icon: 'speech-balloon',
    title: 'Questions written for this job',
    body: 'Practise with interview questions built from the job description, and get feedback on relevance and structure for each answer.',
    points: ['Feedback on every answer', 'Clear progress while it reviews', 'Your answer is kept if the AI is busy'],
    image: '/landing/dlg-review.webp',
    alt: 'Rolewise reviewing an answer with a stepped progress window',
    tint: 'from-[#FBE6E1] to-[#F2C4B9]',
  },
  {
    id: 'tracker',
    label: 'Job tracker',
    icon: 'briefcase',
    title: 'Every application, with its prep attached',
    body: 'Track each role and its status in one board, and jump from any job straight into its fit analysis and plan.',
    points: ['A status for every role', 'Follow-up reminders', 'Linked to analysis and prep'],
    image: '/landing/jobs.webp',
    alt: 'Job tracker listing applications with their status',
    tint: 'from-[#F7EBD3] to-[#EBCB8E]',
  },
];

type Status = 'strong' | 'transferable' | 'evidence' | 'missing';
const STATUS: Record<Status, { label: string; weight: number; color: string; chip: string }> = {
  strong: { label: 'Strong', weight: 1, color: '#6FA77F', chip: 'bg-[#6FA77F]/15 text-[#3F7A50]' },
  transferable: { label: 'Transferable', weight: 0.6, color: '#D49A35', chip: 'bg-[#D49A35]/15 text-[#8A5F14]' },
  evidence: { label: 'Needs evidence', weight: 0.3, color: '#A3A4AA', chip: 'bg-[#73757A]/12 text-[#55575C]' },
  missing: { label: 'Not shown', weight: 0, color: '#D97968', chip: 'bg-[#D97968]/15 text-[#A2483A]' },
};
const STATUS_ORDER: Status[] = ['strong', 'transferable', 'evidence', 'missing'];

const SAMPLE_REQS: { text: string; status: Status }[] = [
  { text: '3+ years designing digital products', status: 'strong' },
  { text: 'End-to-end process, research to prototype', status: 'strong' },
  { text: 'Design systems in Figma', status: 'strong' },
  { text: 'Working closely with engineers', status: 'transferable' },
  { text: 'Designing for accessibility at scale', status: 'missing' },
];

const FIRST_TEN = [
  {
    icon: 'page-facing-up',
    title: 'Have two things ready',
    body: 'The job description as text, and your resume as a PDF or DOCX exported from Word, Google Docs or Canva.',
    tip: 'Scanned or photographed resume? Add your experience by hand instead.',
  },
  {
    icon: 'bullseye',
    title: 'Add the job and your resume',
    body: 'You will see "Resume read · N words" when it worked, so you know your real experience is being used.',
    tip: 'Fewer than 40 readable words means the file could not be read.',
  },
  {
    icon: 'chart-increasing',
    title: 'Read your fit',
    body: 'Start with the requirements marked "Not shown". They are the questions most likely to catch you out.',
    tip: '"Not shown" means we could not find it, not that you cannot do it.',
  },
  {
    icon: 'microphone',
    title: 'Prepare, then practise',
    body: 'Work through your plan in order, then answer one mock question out loud.',
    tip: 'Short on time? One practice answer on your top gap is the best ten minutes you can spend.',
  },
];

const FAQS = [
  {
    q: 'What do I need to get started?',
    a: 'A job description for the role you want and your resume as a PDF or DOCX. If your resume is a scanned image, you can add your experience manually.',
  },
  {
    q: 'How is the fit score calculated?',
    a: 'Each requirement counts equally. Strong evidence counts 100%, transferable experience 60%, needs more evidence 30% and not shown 0%. You can try it in the fit score section above.',
  },
  {
    q: 'What happens to my resume?',
    a: 'It is saved to your account and sent to our AI only to match it against the jobs you add.',
  },
  {
    q: 'Which browsers support voice practice?',
    a: 'Voice and video practice work in modern browsers. Live, free transcription while you speak works in Chrome and Edge; in other browsers your recording is transcribed on our server after you stop.',
  },
  {
    q: 'Can I prepare for more than one job?',
    a: 'Yes. Every job gets its own fit analysis, preparation plan and mock interviews, and the job tracker keeps them together.',
  },
];

/* ------------------------------------------------------------------ */

function useCta() {
  const { session } = useAuth();
  return session ? { href: '/', label: 'Open your dashboard' } : { href: '/auth?mode=signup', label: 'Start preparing' };
}

function CtaButton({ variant = 'yellow', className = '' }: { variant?: 'yellow' | 'ink'; className?: string }) {
  const cta = useCta();
  const styles =
    variant === 'yellow'
      ? 'bg-[#FFD84D] text-[#252525] hover:bg-[#FFE27A] shadow-[0_10px_30px_-10px_rgba(255,216,77,0.7)] focus-visible:ring-[#252525] focus-visible:ring-offset-white'
      : 'bg-[#252525] text-white hover:bg-black focus-visible:ring-[#252525]';
  return (
    <Link
      href={cta.href}
      className={`group inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles} ${className}`}
    >
      {cta.label}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

const LINE_ICONS: Record<string, LucideIcon> = {
  bullseye: Target,
  clipboard: ListChecks,
  'speech-balloon': MessageSquare,
  microphone: Mic,
  'video-camera': Video,
  briefcase: Briefcase,
  'page-facing-up': FileText,
  'chart-increasing': Gauge,
  shield: ShieldCheck,
};

/** Flat line icon, optionally in a rounded tile. 3D tiles are reserved for the hero. */
function LineIcon({ name, size = 48, tone = 'ink' }: { name: string; size?: number; tone?: 'ink' | 'yellow' | 'bare' }) {
  const Icon = LINE_ICONS[name] ?? CheckCircle2;
  if (tone === 'bare') return <Icon className="h-[18px] w-[18px]" aria-hidden />;
  const cls = tone === 'yellow' ? 'bg-[#FFD84D] text-[#252525]' : 'bg-[#252525] text-[#FFD84D]';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-[30%] ${cls}`} style={{ width: size, height: size }} aria-hidden>
      <Icon style={{ width: size * 0.46, height: size * 0.46 }} strokeWidth={2} />
    </span>
  );
}

function BrowserFrame({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-[#FAF9F4] shadow-[0_40px_80px_-30px_rgba(37,37,37,0.45)]">
      <div className="flex items-center gap-1.5 border-b border-[#E4E2DA] bg-[#FAF9F4] px-4 py-2.5" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-[#D97968]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#D49A35]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#6FA77F]" />
        <span className="ml-3 h-5 max-w-[240px] flex-1 rounded-full bg-[#EDECE6]" />
      </div>
      <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} className="block aspect-[16/10] w-full object-cover object-top" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

const FLOATERS: { icon: LucideIcon; tone: GlossyTone; shape: GlossyShape; cls: string; depth: string; size: number; float: string; tilt: string }[] = [
  { icon: FileText, tone: 'yellow', shape: 'hex', cls: 'left-[-7%] top-[30%]', depth: '-18px', size: 78, float: '', tilt: 'rw-tilt-l' },
  { icon: Target, tone: 'coral', shape: 'squircle', cls: 'right-[-4%] top-[-10%]', depth: '22px', size: 66, float: 'rwl-float-b', tilt: 'rw-tilt-r' },
  { icon: Mic, tone: 'ink', shape: 'hex', cls: 'right-[-7%] top-[40%]', depth: '-26px', size: 72, float: 'rwl-float-c', tilt: '' },
  { icon: ListChecks, tone: 'green', shape: 'squircle', cls: 'left-[38%] top-[-13%]', depth: '30px', size: 58, float: 'rwl-float-c', tilt: 'rw-tilt-r' },
  { icon: MessageSquare, tone: 'cream', shape: 'hex', cls: 'left-[2%] top-[-11%]', depth: '14px', size: 52, float: 'rwl-float-b', tilt: 'rw-tilt-l' },
]

function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { session } = useAuth();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', String(((e.clientX - r.left) / r.width - 0.5) * 2));
        el.style.setProperty('--my', String(((e.clientY - r.top) / r.height - 0.5) * 2));
      });
    };
    el.addEventListener('pointermove', onMove);
    return () => {
      el.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={ref} className="rwl-hero-bg relative overflow-hidden pt-[72px] text-white">
      <div className="rwl-grid-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid max-w-[1240px] items-center gap-16 px-5 pb-28 pt-14 md:px-8 lg:grid-cols-[1fr_1.08fr] lg:gap-10 lg:pb-36 lg:pt-20">
        <div>
          <h1 className="rwl-enter text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] [text-wrap:balance] sm:text-[58px] lg:text-[68px]">
            Prepare for the role, not just the interview.
          </h1>
          <p className="rwl-enter mt-6 max-w-[520px] text-[18px] leading-relaxed text-white/75 [animation-delay:120ms]">
            Add a job and your resume. Rolewise shows how well you fit each requirement, turns the gaps into a prep plan, and
            runs mock interviews written for that exact role.
          </p>
          <div className="rwl-enter mt-9 flex flex-col gap-3 [animation-delay:220ms] sm:flex-row sm:items-center">
            <CtaButton />
            <a
              href="#fit"
              className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-7 text-[15px] font-medium backdrop-blur transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Try the fit score
            </a>
          </div>
          <p className="rwl-enter mt-6 flex items-start gap-2 text-[14px] text-white/65 [animation-delay:300ms]">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#FFD84D]" aria-hidden />
            {session
              ? 'You are signed in. Pick up where you left off.'
              : 'About 10 minutes to your first fit score. Sign up with Google, LinkedIn or email.'}
          </p>
        </div>

        <div className="rwl-enter relative mx-auto w-full max-w-[640px] [animation-delay:180ms]">
          <div className="rwl-parallax relative" style={{ ['--depth' as string]: '8px' }}>
            <BrowserFrame src="/landing/role-fit.webp" alt="Rolewise role fit page with an 84% strong fit score" eager />
          </div>

          <div
            className="rwl-parallax absolute -bottom-10 -left-3 w-[230px] rounded-2xl border border-white/40 bg-white/85 p-4 text-[#252525] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.55)] backdrop-blur-md sm:-left-10 sm:w-[260px]"
            style={{ ['--depth' as string]: '-14px' }}
          >
            <p className="text-[12px] font-medium text-[#5E6065]">Your fit for Product Designer</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-[38px] font-semibold leading-none tracking-tight tabular-nums">84%</span>
              <span className="mb-1 rounded-full bg-[#6FA77F]/15 px-2 py-0.5 text-[12px] font-semibold text-[#3F7A50]">Strong fit</span>
            </div>
            <div className="mt-3 flex h-2 gap-[3px] overflow-hidden rounded-full" aria-hidden>
              {['#6FA77F', '#6FA77F', '#6FA77F', '#6FA77F', '#6FA77F', '#D49A35', '#D97968'].map((c, i) => (
                <span key={i} className="flex-1" style={{ background: c }} />
              ))}
            </div>
          </div>

          {FLOATERS.map((f, i) => (
            <div
              key={i}
              className={`rwl-parallax pointer-events-none absolute hidden sm:block ${f.cls}`}
              style={{ ['--depth' as string]: f.depth }}
              aria-hidden
            >
              <div className={`rwl-float ${f.float}`}>
                <GlossyIcon icon={f.icon} tone={f.tone} shape={f.shape} size={f.size} className={f.tilt} />
              </div>
            </div>
          ))}

          <div className="rwl-parallax absolute -bottom-14 right-[2%] sm:-bottom-16 sm:right-[6%]" style={{ ['--depth' as string]: '-10px' }}>
            <Mascot size={118} title="Rolewise prep buddy waving hello" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Product tabs                                                        */
/* ------------------------------------------------------------------ */

function ProductTabs({ active, setActive }: { active: TabId; setActive: (t: TabId) => void }) {
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const next = (i + (e.key === 'ArrowRight' ? 1 : -1) + TABS.length) % TABS.length;
    setActive(TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="product" className="mx-auto max-w-[1240px] scroll-mt-20 px-5 py-24 md:px-8 lg:py-28">
      <h2 className="max-w-[720px] text-[36px] font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-[46px]">
        Everything for one role, from first read to final answer
      </h2>

      <div role="tablist" aria-label="Rolewise features" className="mt-10 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
        {TABS.map((t, i) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => setActive(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`flex min-h-[48px] shrink-0 items-center gap-2.5 rounded-full border px-4 pr-5 text-[15px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-offset-2 ${
                on ? 'border-[#252525] bg-[#252525] text-white' : 'border-[#D9D8D2] bg-[#FAF9F4] text-[#3A3C40] hover:border-[#252525]/40'
              }`}
            >
              <LineIcon name={t.icon} tone="bare" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        key={tab.id}
        role="tabpanel"
        id={`panel-${tab.id}`}
        aria-labelledby={`tab-${tab.id}`}
        className={`rwl-fade mt-6 grid items-center gap-10 overflow-hidden rounded-[32px] bg-gradient-to-br ${tab.tint} p-6 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14 lg:p-14`}
      >
        <div>
          <LineIcon name={tab.icon} size={52} />
          <h3 className="mt-6 text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#252525] [text-wrap:balance] sm:text-[34px]">
            {tab.title}
          </h3>
          <p className="mt-4 text-[17px] leading-relaxed text-[#3F3A2E]">{tab.body}</p>
          <ul className="mt-6 space-y-3">
            {tab.points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] font-medium text-[#252525]">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        </div>
        <BrowserFrame src={tab.image} alt={tab.alt} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive fit score                                               */
/* ------------------------------------------------------------------ */

function useAnimatedNumber(target: number) {
  const [value, setValue] = useState(target);
  const current = useRef(target);
  useEffect(() => {
    const start = current.current;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let id = 0;
    if (reduce || start === target) {
      id = requestAnimationFrame(() => {
        current.current = target;
        setValue(target);
      });
      return () => cancelAnimationFrame(id);
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 600);
      const v = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 4)));
      current.current = v;
      setValue(v);
      if (p < 1) id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [target]);
  return value;
}

function bandFor(score: number) {
  if (score >= 80) return { label: 'Strong fit', cls: 'bg-[#6FA77F]/15 text-[#3F7A50]' };
  if (score >= 60) return { label: 'Good fit', cls: 'bg-[#6FA77F]/12 text-[#3F7A50]' };
  if (score >= 40) return { label: 'Partial fit', cls: 'bg-[#D49A35]/15 text-[#8A5F14]' };
  return { label: 'Stretch role', cls: 'bg-[#D97968]/15 text-[#A2483A]' };
}

function FitSimulator() {
  const [reqs, setReqs] = useState(SAMPLE_REQS);
  const score = useMemo(() => Math.round((reqs.reduce((s, r) => s + STATUS[r.status].weight, 0) / reqs.length) * 100), [reqs]);
  const shown = useAnimatedNumber(score);
  const band = bandFor(score);
  const counts = STATUS_ORDER.map((s) => reqs.filter((r) => r.status === s).length);
  const gaps = reqs.filter((r) => r.status === 'missing' || r.status === 'evidence');

  const cycle = (i: number) =>
    setReqs((prev) => prev.map((r, j) => (j === i ? { ...r, status: STATUS_ORDER[(STATUS_ORDER.indexOf(r.status) + 1) % 4] } : r)));

  return (
    <section id="fit" className="scroll-mt-20 bg-[#252525] py-24 text-white lg:py-28">
      <div className="mx-auto grid max-w-[1240px] gap-12 px-5 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <LineIcon name="chart-increasing" size={52} tone="yellow" />
          <h2 className="mt-6 text-[36px] font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-[46px]">
            A score you can check yourself
          </h2>
          <p className="mt-5 max-w-[440px] text-[17px] leading-relaxed text-white/70">
            Tap a requirement to change how well your resume backs it, and watch the score follow. This is the formula Rolewise
            uses, so your own score will never be a mystery.
          </p>
          <dl className="mt-8 grid max-w-[440px] grid-cols-1 gap-3 min-[420px]:grid-cols-2">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: STATUS[s].color }} aria-hidden />
                <dt className="text-[14px] text-white/80">{STATUS[s].label}</dt>
                <dd className="ml-auto text-[14px] font-semibold tabular-nums">{Math.round(STATUS[s].weight * 100)}%</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-[28px] bg-[#FAF9F4] p-6 text-[#252525] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[14px] font-medium text-[#5E6065]">Sample role: Product Designer</p>
              <div className="mt-1 flex items-end gap-3">
                <span className="text-[64px] font-semibold leading-none tracking-[-0.04em] tabular-nums" aria-hidden>
                  {shown}%
                </span>
                <span className={`mb-2 rounded-full px-2.5 py-1 text-[13px] font-semibold ${band.cls}`}>{band.label}</span>
              </div>
              <p className="sr-only" aria-live="polite">
                Fit score {score} percent, {band.label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReqs(SAMPLE_REQS)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#D9D8D2] px-4 text-[14px] font-medium text-[#3A3C40] hover:border-[#252525]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525]"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Reset
            </button>
          </div>

          <div className="mt-5 flex h-3 gap-[3px] overflow-hidden rounded-full" aria-hidden>
            {STATUS_ORDER.map((s, i) => (
              <span key={s} className="rwl-seg" style={{ flexGrow: counts[i], flexBasis: 0, background: STATUS[s].color }} />
            ))}
          </div>

          <ul className="mt-6 space-y-2.5">
            {reqs.map((r, i) => (
              <li key={r.text}>
                <button
                  type="button"
                  onClick={() => cycle(i)}
                  aria-label={`${r.text}: ${STATUS[r.status].label}. Activate to change.`}
                  className="flex min-h-[56px] w-full items-center gap-3 rounded-2xl border border-[#E4E2DA] bg-white px-4 py-3 text-left transition hover:border-[#252525]/30 hover:shadow-[0_8px_20px_-12px_rgba(37,37,37,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525]"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS[r.status].color }} aria-hidden />
                  <span className="flex-1 text-[15px] font-medium">{r.text}</span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold ${STATUS[r.status].chip}`}>
                    {STATUS[r.status].label}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-2xl bg-[#FFF6D1] p-4">
            <p className="flex items-start gap-2.5 text-[14px] leading-relaxed text-[#4A3F12]">
              <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {gaps.length === 0
                ? 'Every requirement is backed. Your prep plan would focus on sharpening your strongest stories.'
                : `Your prep plan would start with: ${gaps.map((g) => g.text.toLowerCase()).join('; ')}.`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Practice modes, with a live browser check                          */
/* ------------------------------------------------------------------ */

type Mode = 'text' | 'voice' | 'video';
const MODES: { id: Mode; label: string; icon: typeof Mic; body: string }[] = [
  { id: 'text', label: 'Text', icon: MessageSquare, body: 'Type your answer and shape it before you say it out loud. Best for a first draft of a story.' },
  { id: 'voice', label: 'Voice', icon: Mic, body: 'Say your answer out loud. Rolewise writes down what you say and reviews it against the role.' },
  { id: 'video', label: 'Video', icon: Video, body: 'Record yourself on camera to see how you come across, then get the same answer feedback.' },
];

function useSpeechSupport() {
  const [support, setSupport] = useState<'unknown' | 'live' | 'server'>('unknown');
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const id = requestAnimationFrame(() => setSupport(w.SpeechRecognition || w.webkitSpeechRecognition ? 'live' : 'server'));
    return () => cancelAnimationFrame(id);
  }, []);
  return support;
}

function Practice() {
  const [mode, setMode] = useState<Mode>('voice');
  const support = useSpeechSupport();
  const m = MODES.find((x) => x.id === mode) ?? MODES[1];

  return (
    <section id="practice" className="mx-auto max-w-[1240px] scroll-mt-20 px-5 py-24 md:px-8 lg:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="relative">
          <img
            src={photo(PHOTOS.videoCall, 1000)}
            alt="A man practising an interview answer on a video call"
            loading="lazy"
            className="aspect-[4/3] w-full rounded-[28px] bg-[#E9E7DF] object-cover"
          />
          <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-2xl border border-white/20 bg-[#252525]/85 px-4 py-3 text-white backdrop-blur sm:right-auto">
            <span className="relative flex h-3 w-3" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D97968] opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#D97968]" />
            </span>
            <p className="text-[14px]">
              {mode === 'text' ? 'Drafting' : 'Recording'}:{' '}
              <span className="text-white/70">{mode === 'text' ? 'take as long as you need' : 'your answer is kept even if feedback fails'}</span>
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-[36px] font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-[46px]">
            Rehearse the way you will actually answer
          </h2>
          <p className="mt-5 text-[17px] leading-relaxed text-[#5E6065]">
            Knowing an answer and saying it are different skills. Pick the format that feels hardest.
          </p>

          <div role="radiogroup" aria-label="Practice mode" className="mt-8 grid grid-cols-3 gap-1.5 rounded-2xl bg-[#E9E7DF] p-1.5">
            {MODES.map((x) => {
              const on = x.id === mode;
              return (
                <button
                  key={x.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setMode(x.id)}
                  className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] ${
                    on ? 'bg-[#FAF9F4] text-[#252525] shadow-[0_4px_14px_-6px_rgba(37,37,37,0.35)]' : 'text-[#5E6065] hover:text-[#252525]'
                  }`}
                >
                  <x.icon className="h-4 w-4" aria-hidden />
                  {x.label}
                </button>
              );
            })}
          </div>

          <div key={mode} className="rwl-fade mt-5 rounded-2xl border border-[#E4E2DA] bg-[#FAF9F4] p-6" aria-live="polite">
            <p className="text-[16px] leading-relaxed text-[#3A3C40]">{m.body}</p>
            {mode !== 'text' && support !== 'unknown' && (
              <p
                className={`mt-4 flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-[14px] leading-relaxed ${
                  support === 'live' ? 'bg-[#6FA77F]/12 text-[#2F5E3D]' : 'bg-[#D49A35]/12 text-[#6E4A0E]'
                }`}
              >
                {support === 'live' ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
                {support === 'live'
                  ? 'Good news: this browser writes down your answer live, for free, while you speak.'
                  : 'This browser cannot transcribe live, so your recording is transcribed after you stop. For live transcription, use Chrome or Edge.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* First ten minutes, moments, trust, FAQ                              */
/* ------------------------------------------------------------------ */

function FirstTen() {
  return (
    <section id="start" className="scroll-mt-20 bg-[#FAF9F4] py-24 lg:py-28">
      <div className="mx-auto max-w-[1240px] px-5 md:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <h2 className="max-w-[620px] text-[36px] font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-[46px]">
            Your first ten minutes, so nothing trips you up
          </h2>
          <p className="max-w-[420px] text-[16px] leading-relaxed text-[#5E6065]">The places people usually get stuck, answered before you get there.</p>
        </div>
        <ol className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {FIRST_TEN.map((s, i) => (
            <li key={s.title} className="flex flex-col rounded-[24px] border border-[#E4E2DA] bg-white p-6">
              <div className="flex items-start justify-between">
                <LineIcon name={s.icon} size={48} />
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#252525] text-[13px] font-semibold text-[#FFD84D]">
                  <span className="sr-only">Step </span>
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-6 text-[19px] font-semibold">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-[#5E6065]">{s.body}</p>
              <p className="mt-auto flex items-start gap-2 pt-5 text-[13px] leading-snug text-[#6E5A12]">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {s.tip}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Moments() {
  const items = [
    { id: PHOTOS.resume, alt: 'A recruiter reading a resume', icon: 'magnifying-glass-tilted-left', title: 'Your resume, read properly', body: 'Matched the way a recruiter reads it: one requirement at a time.', tint: 'bg-[#FFF3C2]' },
    { id: PHOTOS.practice, alt: 'A woman practising on a video call at home', icon: 'microphone', title: 'Practice that feels real', body: 'Say it out loud until the answer sounds like you.', tint: 'bg-[#E4F1E7]' },
    { id: PHOTOS.interview, alt: 'A candidate in an interview with a hiring manager', icon: 'trophy', title: 'Walk in ready', body: 'Know your strongest stories and the gaps you have already prepared for.', tint: 'bg-[#FBE6E1]' },
  ];
  return (
    <section className="mx-auto max-w-[1240px] px-5 py-24 md:px-8 lg:py-28">
      <h2 className="max-w-[680px] text-[36px] font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-[46px]">
        Built for the moments that decide an interview
      </h2>
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {items.map((c) => (
          <figure key={c.title} className={`overflow-hidden rounded-[28px] ${c.tint}`}>
            <img src={photo(c.id, 800)} alt={c.alt} loading="lazy" className="aspect-[4/3] w-full bg-black/5 object-cover" />
            <figcaption className="p-6">
              <h3 className="text-[20px] font-semibold">{c.title}</h3>
              <p className="mt-1.5 text-[15px] leading-relaxed text-[#4A4C51]">{c.body}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function Trust() {
  const items = [
    { icon: Lock, title: 'Your resume stays yours', body: 'Saved to your account and used only to match the jobs you add.' },
    { icon: FileText, title: 'No guessed resume text', body: 'If a file cannot be read, Rolewise says so and offers a manual option.' },
    { icon: CheckCircle2, title: 'Answers are never lost', body: 'If AI feedback fails, your recording is kept. Retry, or type the answer instead.' },
  ];
  return (
    <section className="rwl-hero-bg relative overflow-hidden py-24 text-white lg:py-28">
      <div className="rwl-grid-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative mx-auto grid max-w-[1240px] items-center gap-12 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <LineIcon name="shield" size={52} tone="yellow" />
          <h2 className="mt-6 text-[36px] font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance] sm:text-[46px]">
            AI you can trust with your next job
          </h2>
          <p className="mt-4 max-w-[400px] text-[17px] leading-relaxed text-white/70">
            Preparation only helps if what it tells you is true. These rules are built into the product.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {items.map((p) => (
            <div key={p.title} className="flex gap-4 rounded-3xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-sm">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#FFD84D] text-[#252525]">
                <p.icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-[18px] font-semibold">{p.title}</h3>
                <p className="mt-1 text-[15px] leading-relaxed text-white/70">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto grid max-w-[1240px] scroll-mt-20 gap-12 px-5 py-24 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
      <div>
        <h2 className="text-[36px] font-semibold leading-[1.08] tracking-[-0.025em] sm:text-[46px]">Questions, answered</h2>
      </div>
      <div className="divide-y divide-[#D9D8D2] border-y border-[#D9D8D2]">
        {FAQS.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex min-h-[64px] w-full items-center justify-between gap-6 py-5 text-left text-[18px] font-semibold text-[#252525] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525]"
                >
                  {item.q}
                  <ChevronDown className={`h-5 w-5 shrink-0 text-[#73757A] transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden />
                </button>
              </h3>
              <div id={`faq-${i}`} hidden={!isOpen} className="pb-6 pr-10 text-[16px] leading-relaxed text-[#5E6065]">
                {item.a}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [tab, setTab] = useState<TabId>('fit');
  const { session } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = (target: TabId | 'practice') => {
    if (target !== 'practice') setTab(target);
    document.getElementById(target === 'practice' ? 'practice' : 'product')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="rwl min-h-screen w-full bg-[#F3F2EE] text-[#252525] [scroll-behavior:smooth]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#FFD84D] focus:px-4 focus:py-2 focus:text-[#252525]"
      >
        Skip to content
      </a>

      <header
        className={`fixed inset-x-0 top-0 z-50 border-b border-[#E4E2DA] bg-white transition-shadow duration-300 ${
          scrolled ? 'shadow-[0_8px_24px_-18px_rgba(37,37,37,0.35)]' : ''
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-[1240px] items-center justify-between px-5 md:px-8">
          <Link href="/welcome" aria-label="Rolewise home" className="block w-[150px]">
            <RolewiseLogo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-md text-[15px] font-medium text-[#4A4C51] transition-colors hover:text-[#252525] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-offset-4"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 lg:flex">
            {!session && (
              <Link
                href="/auth"
                className="inline-flex min-h-[44px] items-center rounded-full border border-[#252525]/80 px-5 text-[14px] font-medium text-[#252525] transition hover:bg-[#252525] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-offset-2"
              >
                Sign in
              </Link>
            )}
            <CtaButton className="min-h-[44px] px-5 text-[14px] shadow-none" />
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D9D8D2] text-[#252525] lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-[#E4E2DA] px-5 pb-6 pt-2 lg:hidden">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="block border-b border-[#E4E2DA] py-4 text-[17px] font-medium">
                {n.label}
              </a>
            ))}
            <div className="mt-5 flex flex-col gap-3">
              {!session && (
                <Link href="/auth" className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#252525] font-medium">
                  Sign in
                </Link>
              )}
              <CtaButton variant="ink" />
            </div>
          </div>
        )}
      </header>

      <main id="main">
        <Hero />

        <section aria-label="Jump to a feature" className="relative z-10 mx-auto -mt-12 max-w-[1240px] px-5 md:px-8">
          <div className="rounded-[28px] border border-[#E4E2DA] bg-[#FAF9F4] p-3 shadow-[0_30px_60px_-30px_rgba(37,37,37,0.35)]">
            <p className="px-3 pb-2 pt-1 text-[15px] font-medium text-[#5E6065]">What do you want to work on?</p>
            <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-6">
              {QUICK_NAV.map((q) => (
                <li key={q.label}>
                  <button
                    type="button"
                    onClick={() => goTo(q.tab)}
                    className="group flex min-h-[64px] w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[15px] font-semibold transition hover:bg-white hover:shadow-[0_10px_24px_-14px_rgba(37,37,37,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525]"
                  >
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F3F2EE] text-[#252525] transition-colors group-hover:bg-[#FFD84D]"><LineIcon name={q.icon} tone="bare" /></span>
                    {q.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <ProductTabs active={tab} setActive={setTab} />
        <FitSimulator />
        <Practice />
        <FirstTen />
        <Moments />
        <Trust />
        <Faq />

        <section className="px-5 pb-12 md:px-8">
          <div className="rwl-cta-bg relative mx-auto max-w-[1240px] overflow-hidden rounded-[36px] px-8 py-14 sm:px-14 lg:px-20 lg:py-20">
            <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-white/30 blur-3xl" aria-hidden />
            <div className="relative grid items-center gap-10 lg:grid-cols-[1.3fr_0.7fr]">
              <div>
                <h2 className="max-w-[620px] text-[38px] font-semibold leading-[1.04] tracking-[-0.035em] text-[#252525] [text-wrap:balance] sm:text-[56px]">
                  Your next interview is for one role. Prepare for that one.
                </h2>
                <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-[#4A3F12]">
                  Add the job, add your resume, and see where you stand in about ten minutes.
                </p>
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <CtaButton variant="ink" />
                  <a
                    href="#start"
                    className="inline-flex min-h-[50px] items-center justify-center rounded-full border border-[#252525]/30 px-7 text-[15px] font-medium text-[#252525] hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525]"
                  >
                    What you need first
                  </a>
                </div>
              </div>
              <div className="relative mx-auto hidden w-full max-w-[380px] lg:block">
                <CtaIllustration />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-[1240px] px-5 pb-10 pt-6 md:px-8">
        <div className="flex flex-col justify-between gap-8 border-t border-[#D9D8D2] pt-10 md:flex-row md:items-start">
          <div className="max-w-[300px]">
            <div className="w-[140px]">
              <RolewiseLogo />
            </div>
            <p className="mt-4 text-[14px] leading-relaxed text-[#73757A]">Prepare for the role, not just the interview.</p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-[14px] sm:grid-cols-3">
            <div>
              <p className="font-semibold">Product</p>
              <ul className="mt-3 space-y-2 text-[#5E6065]">
                <li><a href="#product" className="hover:text-[#252525]">Features</a></li>
                <li><a href="#fit" className="hover:text-[#252525]">Fit score</a></li>
                <li><a href="#practice" className="hover:text-[#252525]">Practice</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Account</p>
              <ul className="mt-3 space-y-2 text-[#5E6065]">
                <li><Link href="/auth" className="hover:text-[#252525]">Sign in</Link></li>
                <li><Link href="/auth?mode=signup" className="hover:text-[#252525]">Create account</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold">Help</p>
              <ul className="mt-3 space-y-2 text-[#5E6065]">
                <li><a href="#start" className="hover:text-[#252525]">Getting started</a></li>
                <li><a href="#faq" className="hover:text-[#252525]">FAQ</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-2 text-[13px] text-[#73757A] sm:flex-row">
          <p>© {new Date().getFullYear()} Rolewise</p>
          <p>
            Photos from{' '}
            <a href="https://unsplash.com" className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline" rel="noreferrer" target="_blank">
              Unsplash <ArrowUpRight className="h-3 w-3" aria-hidden />
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
