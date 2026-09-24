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
import { getUserRoles } from '@/services/api';
import { Role } from '@/types/database';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';

export default function DashboardPage() {
  const { userName } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const userRoles = await getUserRoles();
        setRoles(userRoles);
      } catch (err) {
        console.error('Error fetching dashboard roles:', err);
      }
    }
    loadDashboardData();
  }, []);

  const activeJobCount = roles.length;

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* 1. HERO GREETING BANNER (Image 3) */}
      <section className="relative overflow-hidden rounded-2xl bg-[#EEECFF]/60 border border-[#E0DCFE] p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-1.5 z-10">
          <p className="text-xs sm:text-sm font-medium text-[#667085]">Good morning,</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight flex items-center gap-2">
            <span>{userName ? userName.split(' ')[0] : 'Logesh'}</span>
            <span>👋</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#667085] pt-0.5">
            Prepare for the role. Not just the interview.
          </p>
        </div>

        {/* Hero Card Visual */}
        <div className="hidden sm:flex items-center gap-3 bg-white/90 backdrop-blur border border-[#E7E8EF] px-5 py-3.5 rounded-2xl shadow-xs z-10">
          <div className="space-y-0.5 text-xs font-semibold text-[#1F2937]">
            <p className="text-[#6D5DFB]">Practice</p>
            <p className="text-[#10B981]">Improve</p>
            <p className="text-[#1F2937]">Get Hired</p>
          </div>
          <div className="w-8 h-8 rounded-xl bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
      </section>

      {/* 2. STAT SUMMARY COUNTERS (PRD: Truthful, no fake data) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/jobs"
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#D0D5DD] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#1F2937]">{activeJobCount}</p>
              <p className="text-xs text-[#667085]">Active Jobs</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#1F2937] transition-colors" />
        </Link>

        <Link
          href={roles.length > 0 ? `/roles/${roles[0].id}/interview` : '/jobs/new'}
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#D0D5DD] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] text-[#10B981] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#1F2937]">0</p>
              <p className="text-xs text-[#667085]">Interviews</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#1F2937] transition-colors" />
        </Link>

        <Link
          href="/communication-practice"
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#D0D5DD] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#1F2937]">0</p>
              <p className="text-xs text-[#667085]">Practice Sessions</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#1F2937] transition-colors" />
        </Link>

        <Link
          href="/feedback"
          className="rolewise-card p-4 sm:p-5 flex items-center justify-between hover:border-[#D0D5DD] transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-bold text-[#1F2937]">0</p>
              <p className="text-xs text-[#667085]">Feedback Reports</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#1F2937] transition-colors" />
        </Link>
      </section>

      {/* 3. MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Jobs & Practice */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Job (if exists) or Get Started Empty State */}
          {roles.length > 0 ? (
            <div className="rolewise-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#1F2937]">Your Active Role</h2>
                  <p className="text-xs text-[#667085]">Currently connected job and preparation roadmap</p>
                </div>
                <Link
                  href="/jobs/new"
                  className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E7E8EF] hover:bg-[#F9FAFB] text-xs font-semibold text-[#1F2937] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Role</span>
                </Link>
              </div>

              {roles.map((role) => (
                <div
                  key={role.id}
                  className="p-4 rounded-xl border border-[#E7E8EF] bg-[#F7F7FB] flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-[#EEECFF] text-[#6D5DFB] text-[11px] font-semibold">
                      Target Role
                    </span>
                    <h3 className="text-sm sm:text-base font-semibold text-[#1F2937]">{role.title}</h3>
                    <p className="text-xs text-[#667085]">
                      {role.company} · {role.location || 'Remote'} · {role.workplace_type || 'Full-time'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/roles/${role.id}/fit`}
                      className="touch-target px-3.5 py-1.5 rounded-lg bg-white border border-[#E7E8EF] hover:border-[#6D5DFB] text-xs font-semibold text-[#1F2937] transition-all"
                    >
                      Role Fit
                    </Link>
                    <Link
                      href={`/roles/${role.id}/preparation`}
                      className="touch-target px-3.5 py-1.5 rounded-lg bg-white border border-[#E7E8EF] hover:border-[#6D5DFB] text-xs font-semibold text-[#1F2937] transition-all"
                    >
                      Preparation
                    </Link>
                    <Link
                      href={`/roles/${role.id}/interview`}
                      className="touch-target px-3.5 py-1.5 rounded-lg bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs font-semibold transition-all shadow-xs"
                    >
                      AI Interview →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rolewise-card p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#1F2937]">Get Started</h2>
                <p className="text-xs text-[#667085]">
                  Add a job role and let AI create a personalized preparation plan for you.
                </p>
              </div>

              {/* Dashed Dropzone Card */}
              <div className="border-2 border-dashed border-[#E7E8EF] rounded-2xl p-6 sm:p-8 text-center space-y-3 bg-[#F9FAFB]/50">
                <div className="w-12 h-12 rounded-full bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center mx-auto">
                  <Plus className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[#1F2937]">Add your first job</h3>
                  <p className="text-xs text-[#667085] max-w-sm mx-auto">
                    Paste a job description or upload role details to build your requirement fit.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/jobs/new"
                    className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>+ Add Job →</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Supporting Communication Practice (PRD: Voice & Video) */}
          <div className="rolewise-card p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#1F2937]">Communication Practice</h2>
              <p className="text-xs text-[#667085]">Build confidence with AI-powered practice.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Link
                href="/communication-practice/voice"
                className="p-4 rounded-xl border border-[#E7E8EF] hover:border-[#6D5DFB] bg-white transition-all group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center shrink-0">
                  <Mic className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-semibold text-[#1F2937] group-hover:text-[#6D5DFB] transition-colors flex items-center gap-1">
                    <span>Voice Practice</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-[#667085] leading-relaxed">
                    Record answers and receive observable clarity & conciseness feedback.
                  </p>
                </div>
              </Link>

              <Link
                href="/communication-practice/video"
                className="p-4 rounded-xl border border-[#E7E8EF] hover:border-[#6D5DFB] bg-white transition-all group flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-semibold text-[#1F2937] group-hover:text-[#6D5DFB] transition-colors flex items-center gap-1">
                    <span>Video Practice</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-[#667085] leading-relaxed">
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
              <Link
                href="/jobs/new"
                className="p-2.5 rounded-lg border border-[#E7E8EF] hover:border-[#6D5DFB] bg-[#F9FAFB] flex items-center justify-between text-[#1F2937] transition-all"
              >
                <span>Add a job to get personalized questions</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3]" />
              </Link>
              <Link
                href="/communication-practice"
                className="p-2.5 rounded-lg border border-[#E7E8EF] hover:border-[#6D5DFB] bg-[#F9FAFB] flex items-center justify-between text-[#1F2937] transition-all"
              >
                <span>Practice communication regularly</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3]" />
              </Link>
              <Link
                href="/feedback"
                className="p-2.5 rounded-lg border border-[#E7E8EF] hover:border-[#6D5DFB] bg-[#F9FAFB] flex items-center justify-between text-[#1F2937] transition-all"
              >
                <span>Review feedback and improve</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3]" />
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
            <h2 className="text-sm sm:text-base font-semibold text-[#1F2937]">Recommended for you</h2>
            <p className="text-xs text-[#667085]">
              Start with these key areas to improve your interview readiness.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/communication-practice"
              className="rolewise-card p-4 hover:border-[#6D5DFB] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1F2937] group-hover:text-[#6D5DFB] transition-colors">
                    System Design
                  </p>
                  <p className="text-[11px] text-[#667085]">High impact</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#1F2937] transition-colors shrink-0" />
            </Link>

            <Link
              href="/communication-practice/voice"
              className="rolewise-card p-4 hover:border-[#6D5DFB] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#EAF6F0] text-[#10B981] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1F2937] group-hover:text-[#6D5DFB] transition-colors">
                    Behavioral
                  </p>
                  <p className="text-[11px] text-[#667085]">Commonly asked</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#1F2937] transition-colors shrink-0" />
            </Link>

            <Link
              href="/communication-practice"
              className="rolewise-card p-4 hover:border-[#6D5DFB] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center shrink-0">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1F2937] group-hover:text-[#6D5DFB] transition-colors">
                    Product Sense
                  </p>
                  <p className="text-[11px] text-[#667085]">Role specific</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#1F2937] transition-colors shrink-0" />
            </Link>

            <Link
              href="/communication-practice"
              className="rolewise-card p-4 hover:border-[#6D5DFB] transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#1F2937] group-hover:text-[#6D5DFB] transition-colors">
                    Case Studies
                  </p>
                  <p className="text-[11px] text-[#667085]">Improve problem solving</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#98A2B3] group-hover:text-[#1F2937] transition-colors shrink-0" />
            </Link>
          </div>
        </section>

        {/* Right Column: Recent Activity (Truthful empty state per PRD) */}
        <section className="lg:col-span-1">
          <div className="rolewise-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#1F2937] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#667085]" />
                <span>Recent Activity</span>
              </span>
              <span className="text-[11px] text-[#98A2B3]">View all</span>
            </div>

            <div className="py-6 text-center space-y-2 border border-dashed border-[#E7E8EF] rounded-xl bg-[#F9FAFB]/50">
              <div className="w-8 h-8 rounded-full bg-[#F2F4F7] text-[#98A2B3] flex items-center justify-center mx-auto">
                <FileText className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-[#1F2937]">No activity yet</p>
                <p className="text-[11px] text-[#667085] max-w-[200px] mx-auto">
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
