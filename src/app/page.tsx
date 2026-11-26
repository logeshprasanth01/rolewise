'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  FileText,
  Activity,
  Plus,
  ArrowRight,
  Mic,
  Video,
  ChevronRight,
  Layers,
  Clock,
  Compass,
  MessageSquare,
  Search,
  Send,
  CheckCircle2,
  Circle,
  CircleDot,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getInterviewHistory, getPreparationItems, getUserRoles } from '@/services/api';
import { timeAgo } from '@/lib/job-portals';
import { greeting, isAnalyzed, isActive, isFollowUpDue, followUpDate, formatDate, relativeDay, statusOf, todayISO, addDaysISO } from '@/lib/tracker';
import { StatusPill } from '@/components/tracker/StatusPill';
import { InterviewHistoryRecord, PreparationItem, Role } from '@/types/database';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { Mascot } from '@/components/brand/Mascot';
import { JobsInfographic } from '@/components/dashboard/JobsInfographic';

export default function DashboardPage() {
  const { userName } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [mockInterviews, setMockInterviews] = useState(0);
  const [history, setHistory] = useState<InterviewHistoryRecord[]>([]);
  const [hello, setHello] = useState('Hello');
  const [preparationStats, setPreparationStats] = useState({
    completed: 0,
    inProgress: 0,
    notStarted: 0,
  });
  /** Open prep tasks (in progress first, then by priority), for the "Up next" list. */
  const [upNext, setUpNext] = useState<(PreparationItem & { roleTitle: string })[]>([]);
  // On wide screens the card stretches to match the right column, so show as many tasks as fit
  // (whole rows only). On phones the card isn't stretched, so a fixed 4.
  const upNextRef = useRef<HTMLDivElement>(null);
  const [upNextFit, setUpNextFit] = useState(4);
  useEffect(() => {
    const el = upNextRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const wide = window.matchMedia('(min-width: 1024px)');
    const measure = () => {
      if (!wide.matches) return setUpNextFit(4);
      const row = el.querySelector('li')?.getBoundingClientRect().height || 57;
      setUpNextFit(Math.max(3, Math.floor(el.getBoundingClientRect().height / row)));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    wide.addEventListener('change', measure);
    return () => {
      ro.disconnect();
      wide.removeEventListener('change', measure);
    };
  }, [upNext.length]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setHello(greeting());
        const [userRoles, interviewHistory] = await Promise.all([getUserRoles(), getInterviewHistory()]);
        setRoles(userRoles);
        setRolesLoaded(true);
        setMockInterviews(interviewHistory.length);
        setHistory(interviewHistory);

        // Only roles with an AI prep plan have preparation items.
        const analyzedRoles = userRoles.filter(isAnalyzed);
        if (analyzedRoles.length === 0) {
          setPreparationStats({ completed: 0, inProgress: 0, notStarted: 0 });
          return;
        }

        const preparationByRole = await Promise.all(
          analyzedRoles.map((role) => getPreparationItems(role.id))
        );

        const nextStats = preparationByRole
          .flatMap((result) => result.items)
          .reduce(
            (stats, item) => {
              if (item.status === 'completed') stats.completed += 1;
              else if (item.status === 'in_progress') stats.inProgress += 1;
              else stats.notStarted += 1;
              return stats;
            },
            { completed: 0, inProgress: 0, notStarted: 0 }
          );

        setPreparationStats(nextStats);

        const rank = (i: PreparationItem) =>
          (i.status === 'in_progress' ? 0 : 10) + ({ high: 0, medium: 1, low: 2 }[String(i.priority).toLowerCase()] ?? 3);
        setUpNext(
          preparationByRole
            .flatMap((result, idx) =>
              result.items.map((item) => ({ ...item, roleTitle: analyzedRoles[idx].title || 'Role' }))
            )
            .filter((i) => i.status !== 'completed')
            .sort((a, b) => rank(a) - rank(b) || (a.order_index ?? 0) - (b.order_index ?? 0))
            .slice(0, 10)
        );
      } catch (err) {
        console.error('Error fetching dashboard preparation analytics:', err);
        setRolesLoaded(true);
      }
    }
    loadDashboardData();
  }, []);

  const today = todayISO();
  const activeJobCount = roles.filter(isActive).length;
  const interviewStage = roles.filter((r) => statusOf(r) === 'interview').length;
  const dueRoles = roles.filter((r) => isFollowUpDue(r, today));
  const soon = addDaysISO(today, 7);
  const upcomingInterviews = roles
    .filter((r) => r.interview_at && r.interview_at.slice(0, 10) >= today && r.interview_at.slice(0, 10) <= soon)
    .sort((a, b) => (a.interview_at || '').localeCompare(b.interview_at || ''));
  const todayItems = [
    ...upcomingInterviews.map((r) => ({ role: r, kind: 'interview' as const })),
    ...dueRoles.map((r) => ({ role: r, kind: 'follow' as const })),
  ].slice(0, 5);
  const prepRoles = roles.filter((r) => isAnalyzed(r) && isActive(r)).slice(0, 3);
  const nudge =
    dueRoles.length > 0
      ? { text: `${dueRoles.length} follow-up${dueRoles.length > 1 ? 's are' : ' is'} due today. A short note keeps you top of mind.`, cta: 'Open job tracker', href: '/jobs' }
      : prepRoles.length > 0
        ? { text: `One practice answer for ${prepRoles[0].title || 'your next role'} today?`, cta: 'Practise now', href: `/roles/${prepRoles[0].id}/interview` }
        : { text: 'Add a job and your resume, and I will map how well you fit.', cta: 'Add a job', href: '/jobs/new' };

  // Recent activity from real data only: jobs added, applications sent, mock interviews.
  const roleById = new Map(roles.map((r) => [r.id, r]));
  const activity = [
    ...history.map((h) => ({
      key: `iv-${h.id}`,
      at: h.completed_at || h.started_at || '',
      icon: Mic,
      tint: 'bg-[#EEF7F0] text-[#2F6B42]',
      title: `Mock interview${roleById.get(h.role_id || '')?.title ? ` · ${roleById.get(h.role_id || '')!.title}` : ''}`,
      note: `${h.questions_answered || 0} answer${h.questions_answered === 1 ? '' : 's'} reviewed`,
      href: '/feedback',
    })),
    ...roles
      .filter((r) => r.applied_at)
      .map((r) => ({
        key: `ap-${r.id}`,
        at: r.applied_at as string,
        icon: Send,
        tint: 'bg-[#FFF2B8] text-[#5C4A00]',
        title: `Applied to ${r.company || 'a company'}`,
        note: r.title || 'Job application',
        href: `/jobs/${r.id}`,
      })),
    ...roles
      .filter((r) => r.created_at)
      .map((r) => ({
        key: `add-${r.id}`,
        at: r.created_at as string,
        icon: Briefcase,
        tint: 'bg-[#F3EFE9] text-[#574F46]',
        title: `Added ${r.title || 'a job'}`,
        note: r.company || 'Job tracker',
        href: `/jobs/${r.id}`,
      })),
  ]
    .filter((a) => a.at)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 5);

  const prepTotal = preparationStats.completed + preparationStats.inProgress + preparationStats.notStarted;
  const prepDonePct = prepTotal ? Math.round((preparationStats.completed / prepTotal) * 100) : 0;

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* 1. HERO GREETING BANNER (Image 3) */}
      <section className="rw-gradient-hero relative overflow-hidden rounded-[26px] border border-[#E6E0D7] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-[0_8px_28px_rgba(26,23,20,0.06)]">
        <div className="space-y-1.5 z-10">
          <p className="text-sm font-medium text-[#6B6259]">{hello},</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1A1714] tracking-tight flex items-center gap-2">
            <span>{userName ? userName.split(' ')[0] : 'there'}</span>
          </h1>
          <p className="hidden pt-0.5 text-sm text-[#6B6259] sm:block">Prepare for the role. Not just the interview.</p>
          <div className="pr-24 pt-1 sm:hidden">
            <p className="text-sm text-[#5E554B]">{nudge.text}</p>
            <Link data-ui-sound="click" href={nudge.href} className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-semibold text-[#8A6A12]">
              {nudge.cta}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Mascot + next-step nudge */}
        <div className="absolute right-3 top-3 z-10 flex items-end gap-3 sm:static">
          <Link
            data-ui-sound="click"
            href={nudge.href}
            className="group relative mb-10 hidden max-w-[230px] rounded-2xl rounded-br-md border border-[#E6E0D7] bg-white/95 px-4 py-3 text-left shadow-[0_10px_30px_-12px_rgba(26,23,20,0.25)] backdrop-blur transition hover:border-[#1A1714]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1714] sm:block"
          >
            <p className="text-[13px] font-medium leading-snug text-[#1A1714]">{nudge.text}</p>
            <p className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-[#8A6A12] group-hover:underline">
              {nudge.cta}
              <ArrowRight className="h-3 w-3" aria-hidden />
            </p>
          </Link>
          <Mascot size={104} className="shrink-0 max-sm:h-auto max-sm:w-[76px]" />
        </div>
      </section>

      {/* 2. STAT SUMMARY COUNTERS (PRD: Truthful, no fake data) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link data-ui-sound="click"
          href="/jobs"
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#CFC7BC] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFE58A] text-[#1A1714] flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#1A1714]">{activeJobCount}</p>
              <p className="text-xs text-[#6B6259]">Active applications</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9A9086] group-hover:text-[#1A1714] transition-colors" />
        </Link>

        <Link data-ui-sound="click"
          href="/jobs?filter=interview"
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#CFC7BC] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF7F0] text-[#6FA77F] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#1A1714]">{interviewStage}</p>
              <p className="text-xs text-[#6B6259]">In interviews</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9A9086] group-hover:text-[#1A1714] transition-colors" />
        </Link>

        <Link data-ui-sound="click"
          href="/jobs?filter=due"
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#CFC7BC] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFE58A] text-[#1A1714] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#1A1714]">{dueRoles.length}</p>
              <p className="text-xs text-[#6B6259]">Follow-ups due</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9A9086] group-hover:text-[#1A1714] transition-colors" />
        </Link>

        <Link data-ui-sound="click"
          href="/feedback"
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#CFC7BC] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF5DF] text-[#D49A35] flex items-center justify-center">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#1A1714]">{mockInterviews}</p>
              <p className="text-xs text-[#6B6259]">Mock interviews</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9A9086] group-hover:text-[#1A1714] transition-colors" />
        </Link>
      </section>

      {/* 2b. JOBS TO APPLY — live openings for the person's target role */}
      {rolesLoaded && <JobsInfographic targetRole={roles.find(isActive)?.title || roles[0]?.title || undefined} />}

      {/* 3. MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 columns: today, next steps, preparation.
            Both columns stretch to the same height; the last card in each fills the rest, so no gaps. */}
        <div className="lg:col-span-2 flex flex-col gap-6 lg:[&>*:last-child]:flex-1">
          {/* Today: follow-ups and upcoming interviews from the tracker */}
          {roles.length > 0 ? (
            <div className="rolewise-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#1A1714]">Today</h2>
                  <p className="text-[13px] text-[#6B6259]">Follow-ups and interviews that need you</p>
                </div>
                <Link data-ui-sound="click" href="/jobs?add=1" className="touch-target inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#1A1714] text-white text-[13px] font-semibold">
                  <Plus className="w-4 h-4" /> Log an application
                </Link>
              </div>
              {todayItems.length === 0 ? (
                <p className="text-sm text-[#6B6259] rounded-xl border border-dashed border-[#E6E0D7] bg-white p-4">Nothing due today. Use the time to prep for your strongest lead.</p>
              ) : (
                <ul className="divide-y divide-[#E6E0D7]">
                  {todayItems.map(({ role, kind }) => (
                    <li key={`${kind}-${role.id}`}>
                      <Link href={`/jobs/${role.id}`} className="flex items-center gap-3 py-3">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${kind === 'interview' ? 'bg-[#E3EEF9] text-[#1F4E79]' : 'bg-[#FFF5DF] text-[#8A5A00]'}`}>
                          {kind === 'interview' ? <Mic className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[#1A1714] truncate">
                            {kind === 'interview' ? `Interview · ${role.company}` : `Follow up with ${role.company}`}
                          </span>
                          <span className="block text-[12px] text-[#6B6259] truncate">
                            {kind === 'interview'
                              ? new Date(role.interview_at as string).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
                              : `${role.title} · applied ${relativeDay(role.applied_at, today)}${followUpDate(role) ? ` · due ${formatDate(followUpDate(role))}` : ''}`}
                          </span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#9A9086] shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {dueRoles.length > todayItems.filter((t) => t.kind === 'follow').length && (
                <Link href="/jobs?filter=due" className="text-[13px] font-semibold text-[#1A1714] underline underline-offset-2">See all {dueRoles.length} follow-ups</Link>
              )}

              {prepRoles.length > 0 && (
                <div className="pt-2 space-y-2">
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#6B6259]">Prep in progress</h3>
                  {prepRoles.map((role) => (
                    <div key={role.id} className="p-3.5 rounded-xl border border-[#E6E0D7] bg-[#FAF8F4] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <Link href={`/jobs/${role.id}`} className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-[#1A1714] truncate">{role.title}</p>
                        <p className="text-[12px] text-[#6B6259] truncate flex items-center gap-2">{role.company} <StatusPill status={statusOf(role)} size="sm" /></p>
                      </Link>
                      <div className="flex gap-2">
                        <Link data-ui-sound="click" href={`/roles/${role.id}/preparation`} className="touch-target flex-1 sm:flex-none text-center px-3.5 py-2 rounded-lg bg-white border border-[#E6E0D7] text-[13px] font-semibold text-[#1A1714]">Prep plan</Link>
                        <Link data-ui-sound="click" href={`/roles/${role.id}/interview`} className="touch-target flex-1 sm:flex-none text-center px-3.5 py-2 rounded-lg bg-[#FFD84D] text-[#1A1714] text-[13px] font-semibold">Practise with Rowi</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rolewise-card p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#1A1714]">Get Started</h2>
                <p className="text-xs text-[#6B6259]">
                  Add a job and Rowi will build a preparation plan for that role.
                </p>
              </div>

              {/* Single primary action: the plus icon and label share one clickable button */}
              <div className="border-2 border-dashed border-[#E6E0D7] rounded-2xl p-6 sm:p-8 text-center space-y-4 bg-[#FFFFFF]/50">
                <p className="text-xs sm:text-sm text-[#6B6259] max-w-sm mx-auto">
                  Paste a job description to see how well you fit.
                </p>
                <Link
                  data-ui-sound="click"
                  href="/jobs/new"
                  aria-label="Add a job"
                  className="touch-target inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#1A1714] text-sm font-semibold transition-all shadow-[0_3px_0_rgba(26,23,20,0.12)] hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1714] focus-visible:ring-offset-2"
                >
                  <Plus className="w-5 h-5" strokeWidth={2.5} />
                  <span>Add a job</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Next steps for the most recent job (hidden until a job exists, so no made-up recommendations) */}
          {roles.length > 0 && (() => {
            const r = roles[0];
            const steps = [
              { href: `/roles/${r.id}/fit`, title: 'Review your role fit', note: 'See which requirements you meet', icon: Compass, tint: 'bg-[#FFE58A] text-[#1A1714]' },
              { href: `/roles/${r.id}/preparation`, title: 'Work through your prep plan', note: 'Built from your gaps', icon: Layers, tint: 'bg-[#FFF5DF] text-[#A06C0E]' },
              { href: `/roles/${r.id}/interview`, title: 'Mock interview with Rowi', note: 'Questions written for this role', icon: MessageSquare, tint: 'bg-[#EAF6F0] text-[#2F6B42]' },
              { href: `/find-jobs?q=${encodeURIComponent(r.title || '')}`, title: 'Find similar jobs', note: 'Live openings to apply for', icon: Search, tint: 'bg-[#F3EFE9] text-[#1A1714]' },
            ];
            return (
              <section className="rolewise-card p-5 sm:p-6 space-y-4" aria-labelledby="next-steps-heading">
                <div>
                  <h2 id="next-steps-heading" className="text-base font-semibold text-[#1A1714]">Next steps for {r.title}</h2>
                  <p className="text-[13px] text-[#6B6259]">Pick up where you left off on your most recent job.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {steps.map((st) => (
                    <Link key={st.href} data-ui-sound="click" href={st.href} className="p-3.5 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#C8B33E] transition-all flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${st.tint} flex items-center justify-center shrink-0`}>
                          <st.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#1A1714] truncate">{st.title}</p>
                          <p className="text-[11px] text-[#6B6259] truncate">{st.note}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[#9A9086] group-hover:text-[#1A1714] transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Functional preparation analytics — derived only from the user's real preparation items */}
          {roles.length > 0 && (
            <section className="rolewise-card p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#6B6259]" />
                    <h2 className="text-sm sm:text-base font-semibold text-[#1A1714]">Preparation progress</h2>
                  </div>
                  <p className="text-xs text-[#6B6259] mt-1">
                    Across your active roles.
                  </p>
                </div>
                <Link
                  data-ui-sound="click"
                  href="/preparation"
                  className="text-[11px] font-semibold text-[#6B6259] hover:text-[#1A1714] transition-colors shrink-0"
                >
                  View preparation →
                </Link>
              </div>

              {prepTotal === 0 ? (
                /* No prep plan yet: a real empty state instead of a 0-of-0 summary */
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <span className="w-14 h-14 rounded-full bg-[#FFF4CC] flex items-center justify-center" aria-hidden="true">
                    <Layers className="w-6 h-6 text-[#8A5A12]" />
                  </span>
                  <p className="mt-3 text-sm font-bold text-[#1A1714]">No prep plan yet</p>
                  <p className="mt-1 text-xs text-[#6B6259] max-w-[260px]">Analyse a job against your resume and we&apos;ll build a step-by-step plan.</p>
                  <Link
                    href={roles[0] ? `/jobs/new?roleId=${roles[0].id}` : '/jobs/new'}
                    data-ui-sound="click"
                    className="mt-4 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-[#1A1714] text-white text-xs font-semibold hover:bg-black"
                  >
                    Analyse a job <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
              ) : (
              <>
              {/* Summary: ring + one segmented bar */}
              <div className="flex items-center gap-5">
                <div className="relative w-[84px] h-[84px] shrink-0" role="img" aria-label={`${prepDonePct}% of ${prepTotal} preparation items completed`}>
                  <svg viewBox="0 0 84 84" className="w-full h-full -rotate-90">
                    <circle cx="42" cy="42" r="35" fill="none" stroke="#F3EFE9" strokeWidth="9" />
                    <circle
                      cx="42"
                      cy="42"
                      r="35"
                      fill="none"
                      stroke="#6FA77F"
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 35}
                      strokeDashoffset={2 * Math.PI * 35 * (1 - prepDonePct / 100)}
                      className="transition-[stroke-dashoffset] duration-700"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-[#1A1714] tabular-nums">{prepDonePct}%</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#1A1714]">
                    <span className="text-xl font-bold tabular-nums">{preparationStats.completed}</span>
                    <span className="text-[#6B6259]"> of {prepTotal} tasks done</span>
                  </p>
                  <div className="mt-2.5 flex h-2.5 gap-0.5 rounded-full overflow-hidden bg-[#F3EFE9]" aria-hidden="true">
                    {[
                      { v: preparationStats.completed, c: 'bg-[#6FA77F]' },
                      { v: preparationStats.inProgress, c: 'bg-[#E7B416]' },
                      { v: preparationStats.notStarted, c: 'bg-[#D9D2C8]' },
                    ].map((seg, i) =>
                      seg.v > 0 ? <span key={i} className={`${seg.c} h-full`} style={{ width: `${(seg.v / Math.max(prepTotal, 1)) * 100}%` }} /> : null
                    )}
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#6B6259]">
                    {[
                      { label: 'Done', v: preparationStats.completed, c: 'bg-[#6FA77F]' },
                      { label: 'In progress', v: preparationStats.inProgress, c: 'bg-[#E7B416]' },
                      { label: 'Not started', v: preparationStats.notStarted, c: 'bg-[#D9D2C8]' },
                    ].map((l) => (
                      <li key={l.label} className="inline-flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${l.c}`} aria-hidden="true" />
                        {l.label} <span className="font-semibold text-[#1A1714] tabular-nums">{l.v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Up next: the actual tasks, so the card is something to act on */}
              <div className="border-t border-[#F0ECE6] pt-4 flex-1 flex flex-col">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#9A9086]">Up next</h3>
                {upNext.length > 0 ? (
                  // lg: height 0 + flex-1 → takes the leftover space without making the card taller.
                  <div ref={upNextRef} className="mt-2 lg:h-0 lg:flex-1 lg:min-h-[171px] overflow-hidden">
                  <ul className="-mx-2 divide-y divide-[#F3EFE9]">
                    {upNext.slice(0, upNextFit).map((item) => {
                      const started = item.status === 'in_progress';
                      const priority = String(item.priority || '').toLowerCase();
                      return (
                        <li key={item.id}>
                          <Link
                            href={`/roles/${item.role_id}/preparation`}
                            data-ui-sound="click"
                            className="group flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[#FAF8F4] transition-colors"
                          >
                            {started ? (
                              <CircleDot className="w-4 h-4 text-[#C99A0E] shrink-0" aria-label="In progress" />
                            ) : (
                              <Circle className="w-4 h-4 text-[#CFC7BC] shrink-0" aria-label="Not started" />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-semibold text-[#1A1714] line-clamp-2 lg:line-clamp-1">{item.title}</span>
                              <span className="block text-[11px] text-[#6B6259] truncate">{item.roleTitle}</span>
                            </span>
                            {priority === 'high' && (
                              <span className="h-5 px-2 rounded-full bg-[#FFF0ED] text-[#C25E4D] text-[10px] font-semibold inline-flex items-center shrink-0">High</span>
                            )}
                            <ChevronRight className="w-4 h-4 text-[#B5ADA3] group-hover:text-[#1A1714] transition-colors shrink-0" aria-hidden="true" />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                    <CheckCircle2 className="w-8 h-8 text-[#6FA77F]" aria-hidden="true" />
                    <p className="mt-2 text-sm font-bold text-[#1A1714]">Every task is done</p>
                    <p className="mt-0.5 text-xs text-[#6B6259]">Keep sharp with a practice answer.</p>
                  </div>
                )}
              </div>
              </>
              )}
            </section>
          )}

        </div>

        {/* Right column: calendar, recent activity, practice */}
        <div className="flex flex-col gap-6 lg:[&>*:last-child]:flex-1">
          {/* Functional Calendar Widget (Requirements 1-11) */}
          <CalendarWidget roles={roles} />

          {/* Recent activity — real events only */}
          <section className="rolewise-card p-5 space-y-3" aria-labelledby="activity-heading">
            <div className="flex items-center justify-between">
              <h2 id="activity-heading" className="text-sm font-semibold text-[#1A1714] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#6B6259]" aria-hidden="true" /> Recent activity
              </h2>
              {activity.length > 0 && (
                <Link href="/jobs" className="text-[11px] font-semibold text-[#6B6259] hover:text-[#1A1714]">
                  Job tracker →
                </Link>
              )}
            </div>
            {activity.length === 0 ? (
              <div className="py-5 text-center space-y-1.5 border border-dashed border-[#E6E0D7] rounded-xl">
                <CheckCircle2 className="w-5 h-5 text-[#9A9086] mx-auto" aria-hidden="true" />
                <p className="text-xs font-semibold text-[#1A1714]">No activity yet</p>
                <p className="text-[11px] text-[#6B6259] max-w-[210px] mx-auto">Jobs you add, applications and mock interviews will show here.</p>
              </div>
            ) : (
              <ol className="relative">
                {activity.map((a, idx) => (
                  <li key={a.key} className="relative">
                    {idx < activity.length - 1 && <span className="absolute left-[15px] top-9 bottom-0 w-px bg-[#E6E0D7]" aria-hidden="true" />}
                    <Link href={a.href} className="flex items-start gap-3 py-2 rounded-lg hover:bg-[#FAF8F4] -mx-1.5 px-1.5 transition-colors">
                      <span className={`relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.tint}`}>
                        <a.icon className="w-3.5 h-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-[#1A1714] truncate">{a.title}</span>
                        <span className="block text-[11px] text-[#6B6259] truncate">{a.note}</span>
                      </span>
                      <span className="text-[11px] text-[#9A9086] shrink-0 pt-0.5 tabular-nums">{timeAgo(a.at)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Practice: general drills + feedback (replaces the old Quick Tips and General drills cards) */}
          <section className="rolewise-card p-5 flex flex-col gap-3" aria-labelledby="practice-heading">
            <div>
              <h2 id="practice-heading" className="text-sm font-semibold text-[#1A1714]">Practice with Rowi</h2>
              <p className="text-[11px] text-[#6B6259]">Short drills to build clear, confident answers.</p>
            </div>
            <ul className="space-y-2">
              {[
                { href: '/communication-practice/voice', icon: Mic, title: 'Voice practice', note: 'Clarity and conciseness feedback' },
                { href: '/communication-practice/video', icon: Video, title: 'Video practice', note: 'Camera, voice and content review' },
                { href: '/feedback', icon: MessageSquare, title: 'Review your feedback', note: 'See what to improve next' },
              ].map((d) => (
                <li key={d.href}>
                  <Link
                    data-ui-sound="click"
                    href={d.href}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#C8B33E] transition-colors group"
                  >
                    <span className="w-9 h-9 rounded-lg bg-[#FFE58A] text-[#1A1714] flex items-center justify-center shrink-0">
                      <d.icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-[#1A1714]">{d.title}</span>
                      <span className="block text-[11px] text-[#6B6259] truncate">{d.note}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#9A9086] group-hover:text-[#1A1714] shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-auto pt-1 text-[11px] text-[#6B6259] leading-snug">
              <span className="font-semibold text-[#1A1714]">Tip:</span> practise one answer a day. Small, regular reps add up.
            </p>
          </section>
        </div>
      </div>

    </div>
  );
}
