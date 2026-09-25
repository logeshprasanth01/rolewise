'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  RotateCcw,
  ArrowRight,
  Briefcase,
  HelpCircle,
  FileText,
  Sparkles,
  MessageSquare,
  Bot,
} from 'lucide-react';
import { getUserRoles } from '@/services/api';
import { Role } from '@/types/database';

export default function FeedbackPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [activeRole, setActiveRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const userRoles = await getUserRoles();
        setRoles(userRoles);
        if (userRoles.length > 0) {
          setActiveRole(userRoles[0]);
        }
      } catch (err) {
        console.error('Error loading roles on feedback page:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-7 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <section className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF2B8] text-[#252525] text-xs font-semibold">
          <Clock className="w-3.5 h-3.5" />
          <span>Qualitative Review</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight">
          Interview Feedback
        </h1>
        <p className="text-xs sm:text-sm text-[#667085]">
          Response-specific qualitative feedback focused on observable communication and content quality.
        </p>
      </section>

      {/* Target Role Context Pill if roles exist */}
      {activeRole && (
        <div className="p-3.5 rounded-xl bg-white border border-[#E7E8EF] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FFF2B8] text-[#252525] flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#1F2937]">{activeRole.title}</p>
              <p className="text-[11px] text-[#667085]">{activeRole.company}</p>
            </div>
          </div>

          <Link
            href={`/roles/${activeRole.id}/interview`}
            className="touch-target inline-flex items-center gap-1 text-xs font-semibold text-[#252525] hover:text-[#E7C43E]"
          >
            <span>Practice this role again</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* THREE CORE PRD FEEDBACK SECTIONS */}
      <div className="space-y-5">
        {/* 1. What Went Well (Sage Green) */}
        <div className="rolewise-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#4E9B76]">
            <CheckCircle2 className="w-5 h-5" />
            <h2 className="text-base text-[#1F2937] font-semibold">What went well</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-[#EAF6F0]/60 border border-[#CEECD9] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#4E9B76]">
                <span>✓</span>
                <span>Clear Situational Context</span>
              </div>
              <p className="text-[#475467] text-xs leading-relaxed">
                You framed project constraints early and explicitly highlighted your exact ownership role within the team.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#EAF6F0]/60 border border-[#CEECD9] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#4E9B76]">
                <span>✓</span>
                <span>Concrete Action Details</span>
              </div>
              <p className="text-[#475467] text-xs leading-relaxed">
                Rather than generic buzzwords, you detailed specific methods used: user discovery interviews, token taxonomies, and iterative feedback loops.
              </p>
            </div>
          </div>
        </div>

        {/* 2. What Could Improve (Amber / Coral) */}
        <div className="rolewise-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#C58A2B]">
            <AlertCircle className="w-5 h-5" />
            <h2 className="text-base text-[#1F2937] font-semibold">What could improve</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div className="p-3.5 rounded-xl bg-[#FFF5DF]/60 border border-[#FBE0A6] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#C58A2B]">
                <span>•</span>
                <span>Quantify Final Outcomes</span>
              </div>
              <p className="text-[#475467] text-xs leading-relaxed">
                Connect the successful launch to measurable business or user metrics (e.g. conversion lift, reduction in design system tickets, or engineer adoption rates).
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#FFF5DF]/60 border border-[#FBE0A6] space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-[#C58A2B]">
                <span>•</span>
                <span>Trim Introductory Backstory</span>
              </div>
              <p className="text-[#475467] text-xs leading-relaxed">
                Spend less time on company background setup and move directly to the core challenge and your specific decisions within the first 30 seconds.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Practice Next (Actionable drills) */}
        <div className="rolewise-card p-6 space-y-4 bg-[#FFF2B8]/30 border-[#DDD8FE]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#252525]">
            <Award className="w-5 h-5" />
            <h2 className="text-base text-[#1F2937] font-semibold">Practice next</h2>
          </div>

          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-white border border-[#DDD8FE] space-y-1">
              <p className="text-xs font-semibold text-[#252525]">1. Outcome Articulation Drill</p>
              <p className="text-xs text-[#475467] leading-relaxed">
                Prepare a dedicated 20-second summary answering: <em>&ldquo;What changed in the business or for the user because this work was completed?&rdquo;</em>
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white border border-[#DDD8FE] space-y-1">
              <p className="text-xs font-semibold text-[#252525]">2. Stakeholder Tradeoff Narrative</p>
              <p className="text-xs text-[#475467] leading-relaxed">
                Practice explaining a moment of pushback between engineering constraints and design ambition, detailing how you navigated the compromise.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. OBSERVABLE QUALITY BREAKDOWN (PRD: Relevance, Clarity, Structure, Specificity, Actions, Outcome, Conciseness) */}
      <section className="rolewise-card p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#1F2937]">Observable Quality Breakdown</h2>
          <p className="text-xs text-[#667085]">
            Evaluated solely on observable communication and content indicators without arbitrary readiness percentages or hiring predictions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-[#E7E8EF] bg-[#F9FAFB] space-y-1">
            <span className="text-xs font-semibold text-[#1F2937]">Relevance</span>
            <p className="text-xs text-[#667085]">Strong alignment with targeted job requirements and question prompt.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-[#E7E8EF] bg-[#F9FAFB] space-y-1">
            <span className="text-xs font-semibold text-[#1F2937]">Clarity</span>
            <p className="text-xs text-[#667085]">Natural cadence, articulated key technical terms, minimal verbal fillers.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-[#E7E8EF] bg-[#F9FAFB] space-y-1">
            <span className="text-xs font-semibold text-[#1F2937]">Structure</span>
            <p className="text-xs text-[#667085]">Effective STAR progression (Situation, Task, Action, Result).</p>
          </div>

          <div className="p-3.5 rounded-xl border border-[#E7E8EF] bg-[#F9FAFB] space-y-1">
            <span className="text-xs font-semibold text-[#1F2937]">Specificity</span>
            <p className="text-xs text-[#667085]">References real tools, component hierarchies, and sprint interactions.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-[#E7E8EF] bg-[#F9FAFB] space-y-1">
            <span className="text-xs font-semibold text-[#1F2937]">Actions</span>
            <p className="text-xs text-[#667085]">Distinguishes individual contribution from broader team activities.</p>
          </div>

          <div className="p-3.5 rounded-xl border border-[#E7E8EF] bg-[#F9FAFB] space-y-1">
            <span className="text-xs font-semibold text-[#1F2937]">Conciseness</span>
            <p className="text-xs text-[#667085]">Focused answer completed within 90-120 seconds target range.</p>
          </div>
        </div>
      </section>

      {/* BOTTOM ACTION BAR (PRD Primary action: Practice again →) */}
      <div className="rolewise-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1F2937]">Ready to apply feedback?</h3>
          <p className="text-xs text-[#667085]">
            Repetition builds fluency and helps solidify structured answer delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/communication-practice"
            className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#E7E8EF] hover:bg-[#F9FAFB] text-xs font-semibold text-[#1F2937] transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Communication Practice</span>
          </Link>

          <Link
            href={activeRole ? `/roles/${activeRole.id}/interview` : '/jobs/new'}
            className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Practice again</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
