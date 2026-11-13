'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  FileText,
  Activity,
  Star,
  Plus,
  ArrowRight,
  Mic,
  Video,
  ChevronRight,
  Sparkles,
  Layers,
  Clock,
  Compass,
  TrendingUp,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getInterviewHistory, getPreparationItems, getUserRoles } from '@/services/api';
import { greeting, isAnalyzed, isActive, isFollowUpDue, followUpDate, formatDate, relativeDay, statusOf, todayISO, addDaysISO } from '@/lib/tracker';
import { StatusPill } from '@/components/tracker/StatusPill';
import { Role } from '@/types/database';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';

export default function DashboardPage() {
  const { userName } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [mockInterviews, setMockInterviews] = useState(0);
  const [hello, setHello] = useState('Hello');
  const [preparationStats, setPreparationStats] = useState({
    completed: 0,
    inProgress: 0,
    notStarted: 0,
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setHello(greeting());
        const [userRoles, history] = await Promise.all([getUserRoles(), getInterviewHistory()]);
        setRoles(userRoles);
        setMockInterviews(history.length);

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
      } catch (err) {
        console.error('Error fetching dashboard preparation analytics:', err);
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

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* 1. HERO GREETING BANNER (Image 3) */}
      <section className="rw-gradient-hero relative overflow-hidden rounded-[26px] border border-[#D9D8D2] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 shadow-[0_8px_28px_rgba(37,37,37,0.06)]">
        <div className="space-y-1.5 z-10">
          <p className="text-sm font-medium text-[#73757A]">{hello},</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#252525] tracking-tight flex items-center gap-2">
            <span>{userName ? userName.split(' ')[0] : 'there'}</span>
          </h1>
          <p className="text-sm text-[#73757A] pt-0.5">
            {dueRoles.length > 0
              ? `${dueRoles.length} follow-up${dueRoles.length > 1 ? 's' : ''} due today. Small nudges get replies.`
              : 'Prepare for the role. Not just the interview.'}
          </p>
        </div>

        {/* Hero Card Visual */}
        <div className="hidden sm:flex items-center gap-3 bg-white/90 backdrop-blur border border-[#D9D8D2] px-5 py-3.5 rounded-2xl shadow-xs z-10">
          <div className="space-y-0.5 text-xs font-semibold text-[#252525]">
            <p className="text-[#252525]">Practice</p>
            <p className="text-[#6FA77F]">Improve</p>
            <p className="text-[#252525]">Get Hired</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#FFF2B8] text-[#252525] flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* 2. STAT SUMMARY COUNTERS (PRD: Truthful, no fake data) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link data-ui-sound="click"
          href="/jobs"
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#C9C7BE] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF2B8] text-[#252525] flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#252525]">{activeJobCount}</p>
              <p className="text-xs text-[#73757A]">Active applications</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9A9B9E] group-hover:text-[#252525] transition-colors" />
        </Link>

        <Link data-ui-sound="click"
          href="/jobs?filter=interview"
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#C9C7BE] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEF7F0] text-[#6FA77F] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#252525]">{interviewStage}</p>
              <p className="text-xs text-[#73757A]">In interviews</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9A9B9E] group-hover:text-[#252525] transition-colors" />
        </Link>

        <Link data-ui-sound="click"
          href="/jobs?filter=due"
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#C9C7BE] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF2B8] text-[#252525] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#252525]">{dueRoles.length}</p>
              <p className="text-xs text-[#73757A]">Follow-ups due</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9A9B9E] group-hover:text-[#252525] transition-colors" />
        </Link>

        <Link data-ui-sound="click"
          href="/feedback"
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#C9C7BE] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF5DF] text-[#D49A35] flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#252525]">{mockInterviews}</p>
              <p className="text-xs text-[#73757A]">Mock interviews</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9A9B9E] group-hover:text-[#252525] transition-colors" />
        </Link>
      </section>

      {/* 3. MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Jobs & Practice */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today: follow-ups and upcoming interviews from the tracker */}
          {roles.length > 0 ? (
            <div className="rolewise-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[#252525]">Today</h2>
                  <p className="text-[13px] text-[#73757A]">Follow-ups and interviews that need you</p>
                </div>
                <Link data-ui-sound="click" href="/jobs?add=1" className="touch-target inline-flex items-center gap-1.5 h-10 px-3.5 rounded-xl bg-[#252525] text-white text-[13px] font-semibold">
                  <Plus className="w-4 h-4" /> Log application
                </Link>
              </div>
              {todayItems.length === 0 ? (
                <p className="text-sm text-[#73757A] rounded-xl bg-[#F3F2EE] p-4">Nothing due today. Use the time to prep for your strongest lead.</p>
              ) : (
                <ul className="divide-y divide-[#E6E5DF]">
                  {todayItems.map(({ role, kind }) => (
                    <li key={`${kind}-${role.id}`}>
                      <Link href={`/jobs/${role.id}`} className="flex items-center gap-3 py-3">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${kind === 'interview' ? 'bg-[#E3EEF9] text-[#1F4E79]' : 'bg-[#FFF5DF] text-[#8A5A00]'}`}>
                          {kind === 'interview' ? <Mic className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-[#252525] truncate">
                            {kind === 'interview' ? `Interview · ${role.company}` : `Follow up with ${role.company}`}
                          </span>
                          <span className="block text-[12px] text-[#73757A] truncate">
                            {kind === 'interview'
                              ? new Date(role.interview_at as string).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
                              : `${role.title} · applied ${relativeDay(role.applied_at, today)}${followUpDate(role) ? ` · due ${formatDate(followUpDate(role))}` : ''}`}
                          </span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#9A9B9E] shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {dueRoles.length > todayItems.filter((t) => t.kind === 'follow').length && (
                <Link href="/jobs?filter=due" className="text-[13px] font-semibold text-[#252525] underline underline-offset-2">See all {dueRoles.length} follow-ups</Link>
              )}

              {prepRoles.length > 0 && (
                <div className="pt-2 space-y-2">
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#73757A]">Prep in progress</h3>
                  {prepRoles.map((role) => (
                    <div key={role.id} className="p-3.5 rounded-xl border border-[#D9D8D2] bg-[#F3F2EE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <Link href={`/jobs/${role.id}`} className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-[#252525] truncate">{role.title}</p>
                        <p className="text-[12px] text-[#73757A] truncate flex items-center gap-2">{role.company} <StatusPill status={statusOf(role)} size="sm" /></p>
                      </Link>
                      <div className="flex gap-2">
                        <Link data-ui-sound="click" href={`/roles/${role.id}/preparation`} className="touch-target flex-1 sm:flex-none text-center px-3.5 py-2 rounded-lg bg-white border border-[#D9D8D2] text-[13px] font-semibold text-[#252525]">Prep plan</Link>
                        <Link data-ui-sound="click" href={`/roles/${role.id}/interview`} className="touch-target flex-1 sm:flex-none text-center px-3.5 py-2 rounded-lg bg-[#FFD84D] text-[#252525] text-[13px] font-semibold">AI interview</Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rolewise-card p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#252525]">Get Started</h2>
                <p className="text-xs text-[#73757A]">
                  Add a job role and let AI create a personalized preparation plan for you.
                </p>
              </div>

              {/* Single primary action: the plus icon and label share one clickable button */}
              <div className="border-2 border-dashed border-[#D9D8D2] rounded-2xl p-6 sm:p-8 text-center space-y-4 bg-[#FAF9F4]/50">
                <p className="text-xs sm:text-sm text-[#73757A] max-w-sm mx-auto">
                  Paste a job description or upload role details to build your requirement fit.
                </p>
                <Link
                  data-ui-sound="click"
                  href="/jobs/new"
                  aria-label="Add a job"
                  className="touch-target inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-sm font-semibold transition-all shadow-[0_3px_0_rgba(37,37,37,0.12)] hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#252525] focus-visible:ring-offset-2"
                >
                  <Plus className="w-5 h-5" strokeWidth={2.5} />
                  <span>Add Job</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Functional preparation analytics — derived only from the user's real preparation items */}
          {roles.length > 0 && (
            <section className="rolewise-card p-5 sm:p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#73757A]" />
                    <h2 className="text-sm sm:text-base font-semibold text-[#252525]">Preparation progress</h2>
                  </div>
                  <p className="text-xs text-[#73757A] mt-1">
                    Your current preparation items across active roles.
                  </p>
                </div>
                <Link
                  data-ui-sound="click"
                  href="/preparation"
                  className="text-[11px] font-semibold text-[#73757A] hover:text-[#252525] transition-colors shrink-0"
                >
                  View preparation →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-5 items-center">
                <div className="space-y-3">
                  {[
                    { label: 'Completed', value: preparationStats.completed, track: 'bg-[#E7F2EA]', fill: 'bg-[#6FA77F]' },
                    { label: 'In progress', value: preparationStats.inProgress, track: 'bg-[#FFF2B8]', fill: 'bg-[#D49A35]' },
                    { label: 'Not started', value: preparationStats.notStarted, track: 'bg-[#ECEDEF]', fill: 'bg-[#9A9B9E]' },
                  ].map((item) => {
                    const total =
                      preparationStats.completed +
                      preparationStats.inProgress +
                      preparationStats.notStarted;
                    const width = total > 0 ? Math.max((item.value / total) * 100, item.value > 0 ? 8 : 0) : 0;

                    return (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-medium text-[#73757A]">{item.label}</span>
                          <span className="font-semibold text-[#252525]">{item.value}</span>
                        </div>
                        <div className={`h-2.5 rounded-full ${item.track}`} aria-hidden="true">
                          <div
                            className={`h-full rounded-full ${item.fill} transition-all duration-500`}
                            style={{ width: `${width}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="w-full sm:w-[132px] h-[132px] rounded-[22px] bg-[#FFFBEF] border border-[#E8E3CE] flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-[#252525]">
                    {preparationStats.completed + preparationStats.inProgress + preparationStats.notStarted}
                  </span>
                  <span className="text-[10px] font-medium text-[#73757A] text-center leading-tight px-3">
                    preparation items
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Supporting Communication Practice (PRD: Voice & Video) */}
          <div className="rolewise-card p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#252525]">Communication Practice</h2>
              <p className="text-xs text-[#73757A]">Build confidence with AI-powered practice.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Link data-ui-sound="click"
                href="/communication-practice/voice"
                className="p-4 rounded-xl border border-[#D9D8D2] hover:border-[#C8B33E] bg-white transition-all group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FFF2B8] text-[#252525] flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-semibold text-[#252525] group-hover:text-[#252525] transition-colors flex items-center gap-1">
                    <span>Voice Practice</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-[#73757A] leading-relaxed">
                    Record answers and receive observable clarity & conciseness feedback.
                  </p>
                </div>
              </Link>

              <Link data-ui-sound="click"
                href="/communication-practice/video"
                className="p-4 rounded-xl border border-[#D9D8D2] hover:border-[#C8B33E] bg-white transition-all group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FFF2B8] text-[#252525] flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-semibold text-[#252525] group-hover:text-[#252525] transition-colors flex items-center gap-1">
                    <span>Video Practice</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-[#73757A] leading-relaxed">
                    Practice with camera & microphone recording with structured content review.
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column: Calendar, Quick Tips, Recent Activity */}
        <div className="space-y-6">
          {/* Functional Calendar Widget (Requirements 1-11) */}
          <CalendarWidget roles={roles} />

          {/* Quick Tips */}
          <div className="rolewise-card p-5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#C58A2B]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Quick Tips</span>
            </div>

            <div className="space-y-2 text-xs">
              <Link data-ui-sound="click"
                href="/communication-practice"
                className="p-2.5 rounded-lg border border-[#D9D8D2] hover:border-[#C8B33E] bg-[#FAF9F4] flex items-center justify-between text-[#252525] transition-all"
              >
                <span>Practice communication regularly</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#9A9B9E]" />
              </Link>
              <Link data-ui-sound="click"
                href="/feedback"
                className="p-2.5 rounded-lg border border-[#D9D8D2] hover:border-[#C8B33E] bg-[#FAF9F4] flex items-center justify-between text-[#252525] transition-all"
              >
                <span>Review feedback and improve</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#9A9B9E]" />
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* 4. LOWER DASHBOARD: RECOMMENDED FOR YOU (2x2 GRID) & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Recommended for you (2 x 2 Card Grid) */}
        <section className="lg:col-span-2 space-y-3">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-semibold text-[#252525]">Recommended for you</h2>
            <p className="text-xs text-[#73757A]">
              Start with these key areas to improve your interview readiness.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link data-ui-sound="click"
              href="/communication-practice"
              className="rolewise-card p-4 hover:border-[#C8B33E] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFF2B8] text-[#252525] flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#252525] group-hover:text-[#252525] transition-colors">
                    System Design
                  </p>
                  <p className="text-[11px] text-[#73757A]">High impact</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9A9B9E] group-hover:text-[#252525] transition-colors shrink-0" />
            </Link>

            <Link data-ui-sound="click"
              href="/communication-practice/voice"
              className="rolewise-card p-4 hover:border-[#C8B33E] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EAF6F0] text-[#6FA77F] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#252525] group-hover:text-[#252525] transition-colors">
                    Behavioral
                  </p>
                  <p className="text-[11px] text-[#73757A]">Commonly asked</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9A9B9E] group-hover:text-[#252525] transition-colors shrink-0" />
            </Link>

            <Link data-ui-sound="click"
              href="/communication-practice"
              className="rolewise-card p-4 hover:border-[#C8B33E] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFF2B8] text-[#252525] flex items-center justify-center shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#252525] group-hover:text-[#252525] transition-colors">
                    Product Sense
                  </p>
                  <p className="text-[11px] text-[#73757A]">Role specific</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9A9B9E] group-hover:text-[#252525] transition-colors shrink-0" />
            </Link>

            <Link data-ui-sound="click"
              href="/communication-practice"
              className="rolewise-card p-4 hover:border-[#C8B33E] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFF5DF] text-[#D49A35] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#252525] group-hover:text-[#252525] transition-colors">
                    Case Studies
                  </p>
                  <p className="text-[11px] text-[#73757A]">Improve problem solving</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9A9B9E] group-hover:text-[#252525] transition-colors shrink-0" />
            </Link>
          </div>
        </section>

        {/* Right Column: Recent Activity (Truthful empty state per PRD) */}
        <section className="lg:col-span-1">
          <div className="rolewise-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#252525] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#73757A]" />
                <span>Recent Activity</span>
              </span>
              <span className="text-[11px] text-[#9A9B9E]">View all</span>
            </div>

            <div className="py-6 text-center space-y-2 border border-dashed border-[#D9D8D2] rounded-xl bg-[#FAF9F4]/50">
              <div className="w-8 h-8 rounded-full bg-[#F2F4F7] text-[#9A9B9E] flex items-center justify-center mx-auto">
                <FileText className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-[#252525]">No activity yet</p>
                <p className="text-[11px] text-[#73757A] max-w-[200px] mx-auto">
                  Your practice sessions, interviews and feedback will appear here.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
