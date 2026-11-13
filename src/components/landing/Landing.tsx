'use client';
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Check,
  ChevronDown,
  FileText,
  Gauge,
  ListChecks,
  Menu,
  MessageSquare,
  Mic,
  ShieldCheck,
  Video,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { RolewiseLogo } from '@/components/brand/RolewiseLogo';

/* Free Unsplash photos, served from Unsplash's CDN at the size each slot needs. */
const photo = (id: string, w: number) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

const PHOTOS = {
  hero: '1573497620053-ea5300f94f21',
  videoCall: '1616587894289-86480e533129',
  resume: '1698047681432-006d2449c631',
  practice: '1758521541324-d304c5303fe5',
  interview: '1758520144437-f068ecaf0d83',
  cta: '1543269664-56d93c1b41a6',
};

const NAV = [
  { href: '#how', label: 'How it works' },
  { href: '#features', label: 'Features' },
  { href: '#practice', label: 'Practice' },
  { href: '#faq', label: 'FAQ' },
];

const ROLES = [
  'Product Designer',
  'Software Engineer',
  'Product Manager',
  'Data Analyst',
  'UX Researcher',
  'Marketing Manager',
  'Business Analyst',
  'Frontend Developer',
];

const STEPS = [
  { icon: Briefcase, title: 'Add the job', body: 'Paste the job description for the exact role you are going for.' },
  { icon: FileText, title: 'Add your resume', body: 'PDF or DOCX. Rolewise tells you how many words it read, so you know it really did.' },
  { icon: Gauge, title: 'See your fit', body: 'Every requirement is matched to your experience and rolled into one score you can trace.' },
  { icon: Mic, title: 'Prepare and practise', body: 'Work through a plan built from your gaps, then rehearse by text, voice or video.' },
];

const FEATURES = [
  {
    eyebrow: 'Role fit',
    title: 'One score, and exactly where it comes from',
    body: 'See how well you fit the role at a glance, then open any requirement to see the line in your resume that backs it, or the gap that needs work.',
    points: ['Strong, transferable, needs evidence or not shown', 'One bar segment per requirement', 'The formula is one click away'],
    image: '/landing/role-fit.webp',
    alt: 'Rolewise role fit page showing an 84% strong fit score and a requirement-by-requirement breakdown',
  },
  {
    eyebrow: 'Preparation plan',
    title: 'Your gaps, turned into a plan',
    body: 'Each weak requirement becomes a prep item, ordered by priority with gaps first. Mark items as prepared and watch the plan close.',
    points: ['Quotes the job requirement it came from', '"Start here" on the next item', 'Progress is saved'],
    image: '/landing/prep.webp',
    alt: 'Rolewise preparation plan with a progress card and numbered prep items',
  },
  {
    eyebrow: 'Mock interviews',
    title: 'Questions built from this job, not a generic list',
    body: 'Answer interview questions written for the role in front of you, and get feedback on relevance and structure for every answer.',
    points: ['Feedback on each answer', 'Clear progress while it reviews', 'Your answer is never lost if the AI is busy'],
    image: '/landing/dlg-review.webp',
    alt: 'Rolewise reviewing an interview answer with a stepped progress window',
  },
  {
    eyebrow: 'Job tracker',
    title: 'Every application in one place',
    body: 'Keep each role, its status and its follow-ups together, and jump from any job straight into its analysis and prep.',
    points: ['Status for every role', 'Follow-up reminders', 'Linked to analysis and prep'],
    image: '/landing/jobs.webp',
    alt: 'Rolewise job tracker listing applications with their status',
  },
];

const PRACTICE = [
  { icon: MessageSquare, title: 'Text', body: 'Type your answer and refine it before you say it out loud.' },
  { icon: Mic, title: 'Voice', body: 'Speak your answer. In Chrome and Edge it is transcribed as you talk, free.' },
  { icon: Video, title: 'Video', body: 'Record yourself on camera and review how you come across.' },
];

const PROMISES = [
  { title: 'We show our working', body: 'The fit score formula is public: strong 100%, transferable 60%, needs evidence 30%, not shown 0%.' },
  { title: 'We never fake your resume', body: 'If a file cannot be read, we say so and offer a manual option. No guessed text, no confident nonsense.' },
  { title: 'Your answers are safe', body: 'If AI feedback fails, your recording is kept. Retry the feedback or type your answer instead.' },
];

const FAQS = [
  {
    q: 'What do I need to get started?',
    a: 'A job description for the role you want and your resume as a PDF or DOCX. If your resume is a scanned image, you can add your experience manually.',
  },
  {
    q: 'How is the fit score calculated?',
    a: 'Each requirement counts equally. Strong evidence counts 100%, transferable experience 60%, needs more evidence 30% and not shown 0%. "Not shown" means we could not find it in what you uploaded, not that you cannot do it.',
  },
  {
    q: 'Can I prepare for more than one job?',
    a: 'Yes. Every job gets its own fit analysis, preparation plan and mock interviews, and the job tracker keeps them together.',
  },
  {
    q: 'Which browsers support voice practice?',
    a: 'Voice and video practice work in modern browsers. Live, free transcription works in Chrome and Edge; in other browsers your recording is transcribed on our server instead.',
  },
];

function useCta() {
  const { session } = useAuth();
  return session
    ? { href: '/', label: 'Open your dashboard' }
    : { href: '/auth?mode=signup', label: 'Get started' };
}

function PrimaryButton({ className = '' }: { className?: string }) {
  const cta = useCta();
  return (
    <Link
      href={cta.href}
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full bg-[#FFD84D] px-6 text-[15px] font-semibold text-[#252525] shadow-[0_1px_0_rgba(0,0,0,0.08)] transition hover:bg-[#F5CC3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-offset-2 ${className}`}
    >
      {cta.label}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}

function BrowserFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#D9D8D2] bg-[#FAF9F4] shadow-[0_30px_60px_-30px_rgba(37,37,37,0.35)]">
      <div className="flex items-center gap-1.5 border-b border-[#E4E2DA] px-4 py-3" aria-hidden>
        <span className="h-2.5 w-2.5 rounded-full bg-[#D97968]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#D49A35]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#6FA77F]" />
        <span className="ml-3 h-5 flex-1 max-w-[260px] rounded-full bg-[#EDECE6]" />
      </div>
      <img src={src} alt={alt} loading="lazy" className="block aspect-[16/10] w-full object-cover object-top" />
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="divide-y divide-[#D9D8D2] border-y border-[#D9D8D2]">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`faq-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex min-h-[64px] w-full items-center justify-between gap-6 py-5 text-left text-lg font-semibold text-[#252525] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD84D]"
            >
              {item.q}
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-[#73757A] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
            <div id={`faq-${i}`} hidden={!isOpen} className="pb-6 pr-10 text-[16px] leading-relaxed text-[#5E6065]">
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { session } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#F3F2EE] text-[#252525] [scroll-behavior:smooth]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-[#252525] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>

      {/* Header */}
      <header
        className={`sticky top-0 z-50 transition-colors ${
          scrolled ? 'border-b border-[#E4E2DA] bg-[#F3F2EE]/90 backdrop-blur' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-[1200px] items-center justify-between px-5 md:px-8">
          <Link href="/welcome" aria-label="Rolewise home" className="block w-[150px]">
            <RolewiseLogo />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-[15px] font-medium text-[#4A4C51] hover:text-[#252525]">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 lg:flex">
            {!session && (
              <Link href="/auth" className="px-3 py-2 text-[15px] font-medium text-[#252525] hover:underline">
                Sign in
              </Link>
            )}
            <PrimaryButton className="min-h-[44px] px-5 text-[14px]" />
          </div>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#D9D8D2] lg:hidden"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-[#E4E2DA] bg-[#F3F2EE] px-5 pb-6 pt-2 lg:hidden">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className="block border-b border-[#E4E2DA] py-4 text-[17px] font-medium"
              >
                {n.label}
              </a>
            ))}
            <div className="mt-5 flex flex-col gap-3">
              {!session && (
                <Link href="/auth" className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-[#252525] font-medium">
                  Sign in
                </Link>
              )}
              <PrimaryButton />
            </div>
          </div>
        )}
      </header>

      <main id="main">
        {/* Hero */}
        <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 pb-20 pt-10 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28 lg:pt-16">
          <div>
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D9D8D2] bg-[#FAF9F4] px-3.5 py-1.5 text-[13px] font-medium text-[#4A4C51]">
              <span className="h-2 w-2 rounded-full bg-[#FFD84D]" aria-hidden />
              AI interview preparation, one role at a time
            </p>
            <h1 className="text-[44px] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[56px] lg:text-[68px]">
              Prepare for the role,{' '}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">not just</span>
                <span className="absolute inset-x-0 bottom-[0.08em] z-0 h-[0.32em] rounded-sm bg-[#FFD84D]" aria-hidden />
              </span>{' '}
              the interview.
            </h1>
            <p className="mt-6 max-w-[520px] text-[18px] leading-relaxed text-[#5E6065]">
              Add the job and your resume. Rolewise shows how well you fit every requirement, turns your gaps into a
              preparation plan, and lets you rehearse with mock interviews built for that exact role.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <PrimaryButton />
              <a
                href="#how"
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-[#252525]/80 px-6 text-[15px] font-medium hover:bg-[#252525] hover:text-white"
              >
                See how it works
              </a>
            </div>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[#5E6065]">
              {['Works with any job description', 'PDF or DOCX resumes', 'Text, voice and video practice'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#6FA77F]" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-[560px]">
            <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-[#FFD84D]/70 blur-3xl" aria-hidden />
            <div className="relative overflow-hidden rounded-[28px] bg-[#252525]">
              <img
                src={photo(PHOTOS.hero, 1100)}
                alt="A candidate talking through her experience across a table"
                className="aspect-[4/5] w-full object-cover sm:aspect-[5/5]"
              />
            </div>

            {/* Floating fit card */}
            <div className="absolute -left-4 bottom-10 w-[240px] rounded-2xl border border-[#E4E2DA] bg-[#FAF9F4] p-4 shadow-[0_24px_48px_-20px_rgba(37,37,37,0.45)] sm:-left-10 sm:w-[270px]">
              <p className="text-[12px] font-medium text-[#73757A]">Your fit for Product Designer</p>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-[40px] font-semibold leading-none tracking-tight">84%</span>
                <span className="mb-1 rounded-full bg-[#6FA77F]/15 px-2 py-0.5 text-[12px] font-semibold text-[#3F7A50]">
                  Strong fit
                </span>
              </div>
              <div className="mt-3 flex h-2 gap-[3px] overflow-hidden rounded-full" aria-hidden>
                {['#6FA77F', '#6FA77F', '#6FA77F', '#6FA77F', '#6FA77F', '#D49A35', '#D97968'].map((c, i) => (
                  <span key={i} className="flex-1" style={{ background: c }} />
                ))}
              </div>
              <p className="mt-3 text-[12px] leading-snug text-[#5E6065]">5 of 7 requirements backed directly by your resume.</p>
            </div>

            {/* Floating prep chip */}
            <div className="absolute -right-3 top-8 flex items-center gap-3 rounded-2xl bg-[#252525] px-4 py-3 text-white shadow-[0_24px_48px_-20px_rgba(0,0,0,0.6)] sm:-right-8">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFD84D] text-[#252525]">
                <ListChecks className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <p className="text-[13px] font-semibold">1 of 4 prepared</p>
                <p className="text-[11px] text-white/60">Next: accessibility story</p>
              </div>
            </div>
          </div>
        </section>

        {/* Role strip */}
        <section aria-label="Roles people prepare for" className="border-y border-[#E4E2DA] bg-[#FAF9F4] py-6">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 md:flex-row md:items-center md:px-8">
            <p className="shrink-0 text-[14px] font-medium text-[#73757A]">Built for any role, like</p>
            <ul className="flex flex-wrap gap-2">
              {ROLES.map((r) => (
                <li key={r} className="rounded-full border border-[#D9D8D2] px-3.5 py-1.5 text-[14px] font-medium text-[#4A4C51]">
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Statement */}
        <section className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 lg:py-32">
          <p className="max-w-[980px] text-[30px] font-medium leading-[1.2] tracking-[-0.02em] text-[#252525] sm:text-[40px] lg:text-[48px]">
            Most interview prep is generic.{' '}
            <span className="text-[#9A9CA1]">
              Your interview isn&apos;t. It is one job description, one team, and one set of requirements you either
              can back up, or need to prepare for.
            </span>
          </p>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 bg-[#252525] py-24 text-white lg:py-28">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div>
                <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[#FFD84D]">How it works</p>
                <h2 className="mt-3 max-w-[560px] text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
                  From job post to ready, in four steps
                </h2>
              </div>
              <p className="max-w-[380px] text-[16px] leading-relaxed text-white/65">
                Every step uses the job you added, so nothing you practise is wasted on a role you are not going for.
              </p>
            </div>
            <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="rounded-3xl border border-white/10 bg-white/[0.04] p-7">
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFD84D] text-[#252525]">
                      <s.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="text-[14px] font-medium text-white/40">0{i + 1}</span>
                  </div>
                  <h3 className="mt-8 text-[21px] font-semibold">{s.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-white/65">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-24 mx-auto max-w-[1200px] px-5 py-24 md:px-8 lg:py-32">
          <div className="max-w-[640px]">
            <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[#8A7417]">Features</p>
            <h2 className="mt-3 text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
              Everything you need for one role, in one place
            </h2>
          </div>
          <div className="mt-16 flex flex-col gap-24 lg:gap-32">
            {FEATURES.map((f, i) => (
              <article key={f.title} className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
                <div className={i % 2 ? 'lg:order-2' : ''}>
                  <p className="text-[14px] font-semibold text-[#8A7417]">
                    0{i + 1} · {f.eyebrow}
                  </p>
                  <h3 className="mt-3 text-[30px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[34px]">{f.title}</h3>
                  <p className="mt-4 text-[17px] leading-relaxed text-[#5E6065]">{f.body}</p>
                  <ul className="mt-6 space-y-3">
                    {f.points.map((p) => (
                      <li key={p} className="flex items-start gap-3 text-[15px] text-[#3A3C40]">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#FFD84D]">
                          <Check className="h-3 w-3" aria-hidden />
                        </span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`relative ${i % 2 ? 'lg:order-1' : ''}`}>
                  <div
                    className={`absolute inset-0 -z-0 translate-y-6 rounded-[32px] ${i % 2 ? '-translate-x-6' : 'translate-x-6'} bg-[#E9E6DA]`}
                    aria-hidden
                  />
                  <div className="relative">
                    <BrowserFrame src={f.image} alt={f.alt} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Practice */}
        <section id="practice" className="scroll-mt-24 bg-[#FAF9F4] py-24 lg:py-28">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 md:px-8 lg:grid-cols-2 lg:gap-16">
            <div className="relative">
              <img
                src={photo(PHOTOS.videoCall, 1000)}
                alt="A man practising an interview answer on a video call"
                loading="lazy"
                className="aspect-[4/3] w-full rounded-[28px] object-cover"
              />
              <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 rounded-2xl bg-[#252525]/90 px-4 py-3 text-white backdrop-blur sm:right-auto">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#D97968] opacity-60 motion-reduce:hidden" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#D97968]" />
                </span>
                <p className="text-[14px]">
                  Recording · <span className="text-white/60">transcribing as you speak</span>
                </p>
              </div>
            </div>
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[#8A7417]">Practice</p>
              <h2 className="mt-3 text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
                Rehearse the way you will actually answer
              </h2>
              <p className="mt-5 text-[17px] leading-relaxed text-[#5E6065]">
                Saying an answer out loud is different from knowing it. Practise in the format that feels hardest, and get
                feedback against what this role is asking for.
              </p>
              <div className="mt-8 grid gap-3">
                {PRACTICE.map((p) => (
                  <div key={p.title} className="flex items-start gap-4 rounded-2xl border border-[#E4E2DA] bg-[#F3F2EE] p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#252525] text-[#FFD84D]">
                      <p.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-[17px] font-semibold">{p.title}</h3>
                      <p className="mt-1 text-[15px] leading-relaxed text-[#5E6065]">{p.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Photo moments */}
        <section className="mx-auto max-w-[1200px] px-5 py-24 md:px-8 lg:py-32">
          <h2 className="max-w-[720px] text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
            Built around the moments that decide an interview
          </h2>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { id: PHOTOS.resume, alt: 'A recruiter reading a resume', title: 'Your resume, read properly', body: 'Rolewise reads it the way a recruiter would: requirement by requirement.' },
              { id: PHOTOS.practice, alt: 'A woman practising on a video call at home', title: 'Practice that feels real', body: 'Rehearse on camera or out loud until the answer feels like yours.' },
              { id: PHOTOS.interview, alt: 'A candidate in an interview with a hiring manager', title: 'Walk in ready', body: 'Know your strongest examples and the gaps you have already prepared for.' },
            ].map((c) => (
              <figure key={c.title} className="group">
                <div className="overflow-hidden rounded-[24px]">
                  <img
                    src={photo(c.id, 800)}
                    alt={c.alt}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
                  />
                </div>
                <figcaption className="mt-5">
                  <h3 className="text-[20px] font-semibold">{c.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[#5E6065]">{c.body}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Promises */}
        <section className="bg-[#252525] py-24 text-white lg:py-28">
          <div className="mx-auto grid max-w-[1200px] gap-12 px-5 md:px-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFD84D] text-[#252525]">
                <ShieldCheck className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="mt-6 text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
                AI you can check
              </h2>
              <p className="mt-4 max-w-[400px] text-[17px] leading-relaxed text-white/65">
                A preparation tool is only useful if you can trust what it tells you. These are the rules Rolewise is built on.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {PROMISES.map((p, i) => (
                <div key={p.title} className="flex gap-5 rounded-3xl border border-white/10 bg-white/[0.04] p-7">
                  <span className="text-[28px] font-light text-[#FFD84D]">0{i + 1}</span>
                  <div>
                    <h3 className="text-[19px] font-semibold">{p.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-white/65">{p.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mobile */}
        <section className="overflow-hidden py-24 lg:py-28">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 md:px-8 lg:grid-cols-2">
            <div>
              <p className="text-[14px] font-semibold uppercase tracking-[0.14em] text-[#8A7417]">On your phone</p>
              <h2 className="mt-3 text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">
                Five spare minutes before the call? Use them.
              </h2>
              <p className="mt-5 max-w-[460px] text-[17px] leading-relaxed text-[#5E6065]">
                Check your fit, tick off a prep item or run one more practice answer from your phone. Same plan, same
                progress.
              </p>
            </div>
            <div className="flex justify-center gap-4 sm:gap-6">
              {[
                { src: '/landing/m-role-fit.webp', alt: 'Role fit on mobile', cls: 'mt-12' },
                { src: '/landing/m-prep.webp', alt: 'Preparation plan on mobile', cls: '' },
              ].map((p) => (
                <div
                  key={p.src}
                  className={`w-[46%] max-w-[250px] rounded-[38px] bg-gradient-to-b from-[#3A3B40] to-[#1C1C1F] p-[7px] shadow-[0_40px_70px_-30px_rgba(37,37,37,0.55)] ${p.cls}`}
                >
                  <img src={p.src} alt={p.alt} loading="lazy" className="block aspect-[1170/2532] w-full rounded-[32px] object-cover" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 mx-auto grid max-w-[1200px] gap-12 px-5 pb-24 md:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:pb-32">
          <h2 className="text-[36px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[44px]">Questions, answered</h2>
          <Faq />
        </section>

        {/* CTA */}
        <section className="px-5 pb-10 md:px-8">
          <div className="mx-auto grid max-w-[1200px] overflow-hidden rounded-[32px] bg-[#FFD84D] lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-10 sm:p-14 lg:p-16">
              <h2 className="max-w-[520px] text-[38px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#252525] sm:text-[52px]">
                Your next interview is for one role. Prepare for that one.
              </h2>
              <p className="mt-5 max-w-[440px] text-[17px] leading-relaxed text-[#4A3F12]">
                Add the job, add your resume, and see where you stand in minutes.
              </p>
              <div className="mt-9">
                <SecondaryDarkCta />
              </div>
            </div>
            <img
              src={photo(PHOTOS.cta, 900)}
              alt="A smiling candidate holding a tablet"
              loading="lazy"
              className="h-72 w-full object-cover lg:h-full"
            />
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-[1200px] px-5 pb-10 pt-10 md:px-8">
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
                <li><a href="#how" className="hover:text-[#252525]">How it works</a></li>
                <li><a href="#features" className="hover:text-[#252525]">Features</a></li>
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
                <li><a href="#faq" className="hover:text-[#252525]">FAQ</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-2 text-[13px] text-[#8A8C91] sm:flex-row">
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

function SecondaryDarkCta() {
  const cta = useCta();
  return (
    <Link
      href={cta.href}
      className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-[#252525] px-7 text-[16px] font-semibold text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFD84D]"
    >
      {cta.label}
      <ArrowRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
