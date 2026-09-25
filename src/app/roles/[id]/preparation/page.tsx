'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Bot,
  Lightbulb,
  CheckSquare,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { getPreparationItems } from '@/services/api';
import { PreparationItem, Role } from '@/types/database';

export default function PreparationPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params?.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [items, setItems] = useState<PreparationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!roleId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getPreparationItems(roleId);
        setRole(data.role);
        setItems(data.items || []);
      } catch (err) {
        console.error('Error loading preparation items:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [roleId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-[#73757A]">
        <Loader2 className="w-6 h-6 animate-spin text-[#252525]" />
        <p className="text-xs sm:text-sm">Building your role preparation roadmap...</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="rolewise-card p-8 max-w-lg mx-auto text-center space-y-4 my-12">
        <div className="w-12 h-12 rounded-full bg-[#FFF0ED] text-[#D97968] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#252525]">Role not found</h2>
          <p className="text-xs text-[#73757A]">Return to your jobs list to begin preparing.</p>
        </div>
        <Link
          href="/jobs"
          className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFD84D] text-[#252525] text-xs font-semibold"
        >
          <span>Return to My Jobs</span>
          <ArrowRight className="w-3.5 h-3.5 pointer-events-none shrink-0" />
        </Link>
      </div>
    );
  }

  const getStatusBadge = (status?: string, alignment?: string) => {
    const combined = `${status || ''} ${alignment || ''}`.toLowerCase();
    if (combined.includes('attention') || combined.includes('not demonstrated')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFF0ED] text-[#D97968] text-[11px] font-semibold">
          <AlertCircle className="w-3 h-3" />
          <span>Needs attention</span>
        </span>
      );
    }
    if (combined.includes('investigation')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFF2D2] text-[#C58A2B] text-[11px] font-semibold">
          <HelpCircle className="w-3 h-3" />
          <span>Needs investigation</span>
        </span>
      );
    }
    if (combined.includes('transferable')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#FFF2B8] text-[#252525] text-[11px] font-semibold">
          <Sparkles className="w-3 h-3" />
          <span>Transferable</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#EEF7F0] text-[#6FA77F] text-[11px] font-semibold">
        <CheckCircle2 className="w-3 h-3" />
        <span>Strong alignment</span>
      </span>
    );
  };

  const getActionBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('attention') || s.includes('investigate')) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C58A2B]">
          <span>Investigate</span>
          <ArrowRight className="w-3.5 h-3.5 pointer-events-none shrink-0" />
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#252525]">
        <span>Practice</span>
        <ArrowRight className="w-3.5 h-3.5 pointer-events-none shrink-0" />
      </span>
    );
  };

  // Derive dynamic focus areas from the actual preparation items
  const highPriorityItem = items.find(
    (i) =>
      i.priority?.toLowerCase() === 'high' ||
      i.alignment_status?.toLowerCase().includes('investigation') ||
      i.alignment_status?.toLowerCase().includes('attention')
  ) || items[0];

  const practiceItem = items.find(
    (i) =>
      i !== highPriorityItem &&
      (i.alignment_status?.toLowerCase().includes('transferable') ||
        i.priority?.toLowerCase() === 'medium')
  ) || items[1] || items[0];

  const strengthItem = items.find(
    (i) =>
      i !== highPriorityItem &&
      i !== practiceItem &&
      (i.alignment_status?.toLowerCase().includes('strong') ||
        i.priority?.toLowerCase() === 'low')
  ) || items[2] || items[1];

  const focusAreas = [
    highPriorityItem ? { label: 'Needs Attention', item: highPriorityItem, color: 'text-[#D97968]', bg: 'bg-[#FFF0ED]', border: 'border-[#F6D8D1]' } : null,
    practiceItem && practiceItem.id !== highPriorityItem?.id ? { label: 'Practice & Frame', item: practiceItem, color: 'text-[#252525]', bg: 'bg-[#FFF2B8]', border: 'border-[#FFF2B8]' } : null,
    strengthItem && strengthItem.id !== highPriorityItem?.id && strengthItem.id !== practiceItem?.id ? { label: 'Key Strength', item: strengthItem, color: 'text-[#6FA77F]', bg: 'bg-[#EEF7F0]', border: 'border-[#DDEEDF]' } : null,
  ].filter(Boolean) as { label: string; item: PreparationItem; color: string; bg: string; border: string }[];

  if (items.length === 0) {
    return (
      <div className="rolewise-card p-8 max-w-lg mx-auto text-center space-y-4 my-12 animate-in fade-in">
        <div className="w-12 h-12 rounded-full bg-[#FFF0ED] text-[#D97968] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#252525]">Role preparation couldn&apos;t be loaded.</h2>
          <p className="text-xs text-[#73757A]">
            Role analysis may still be processing or requires re-analysis.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href={`/roles/${role.id}/fit`}
            className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#252525] hover:bg-[#E7C43E] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <span>Go to Role Fit</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Breadcrumb Back */}
      <Link
        href={`/roles/${role.id}/fit`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#73757A] hover:text-[#252525] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Role Fit</span>
      </Link>

      {/* HEADER SECTION (PRD Requirement 5) */}
      <section className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#252525] tracking-tight">
          Prepare for your interview
        </h1>
        <p className="text-xs sm:text-sm text-[#73757A]">
          Focus on the areas that matter most for{' '}
          <strong className="text-[#252525]">{role.title}</strong> at {role.company}.
        </p>
      </section>

      {/* TWO COLUMN PREPARATION LAYOUT (Image 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Preparation Area Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-[#73757A] uppercase tracking-wider">
              {items.length} Preparation Areas Identified
            </span>
          </div>

          {items.map((item) => (
            <div
              key={item.id}
              className="rolewise-card p-5 space-y-3.5 hover:border-[#D0D5DD] transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {getStatusBadge(item.status, item.alignment_status)}
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-[#6FA77F]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready to practice</span>
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-semibold text-[#252525]">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#55565A] leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#D9D8D2] flex items-center justify-between">
                <span className="text-[11px] text-[#9A9B9E]">Derived from role fit findings</span>
                <Link
                  href={`/roles/${role.id}/interview`}
                  className="touch-target inline-flex items-center gap-1 text-xs font-semibold text-[#252525] hover:text-[#303234] transition-colors select-none cursor-pointer"
                >
                  {getActionBadge(item.status)}
                </Link>
              </div>
            </div>
          ))}

          {/* Practical Tip Callout */}
          <div className="p-4 rounded-xl bg-[#FFF2B8]/60 border border-[#FFF2B8] flex items-start gap-3 text-xs text-[#252525]">
            <Lightbulb className="w-4 h-4 text-[#252525] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-semibold">Preparation Strategy: </span>
              <span className="text-[#55565A]">
                Focus on the areas marked for practice or investigation to feel more confident during your AI interview session.
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Target Role, Primary Actions, Checklist */}
        <div className="space-y-5">
          {/* Target Role Pill */}
          <div className="rolewise-card p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFF2B8] text-[#252525] flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-semibold text-[#252525] truncate">{role.title}</h3>
                <p className="text-xs text-[#73757A] truncate">{role.company}</p>
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="pt-2 space-y-2">
              <Link
                href={`/roles/${role.id}/interview`}
                className="w-full touch-target inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#252525] hover:bg-[#E7C43E] text-white text-xs sm:text-sm font-semibold transition-all shadow-sm"
              >
                <span>Start AI interview</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href={`/roles/${role.id}/fit`}
                className="w-full touch-target inline-flex items-center justify-center py-2.5 px-4 rounded-xl border border-[#D9D8D2] hover:bg-[#FAF9F4] text-xs font-semibold text-[#73757A] transition-colors"
              >
                Back to role fit
              </Link>
            </div>
          </div>

          {/* Dynamic Interview Focus Summary */}
          {focusAreas.length > 0 && (
            <div className="rolewise-card p-5 space-y-3">
              <h4 className="text-xs font-semibold text-[#252525] uppercase tracking-wider">
                Interview Focus
              </h4>
              <div className="space-y-2 text-xs">
                {focusAreas.map((f, idx) => (
                  <div
                    key={f.item.id || idx}
                    className={`p-2.5 rounded-lg ${f.bg} border ${f.border} flex items-center justify-between`}
                  >
                    <div>
                      <p className={`text-[10px] uppercase font-semibold ${f.color}`}>{f.label}</p>
                      <p className="font-semibold text-[#252525] truncate max-w-[200px]">{f.item.title}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Before Your Interview Checklist (Image 5) */}
          <div className="rolewise-card p-5 space-y-3">
            <h4 className="text-xs font-semibold text-[#252525] flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-[#252525]" />
              <span>Before your interview</span>
            </h4>

            <ul className="space-y-2.5 text-xs text-[#55565A]">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#252525] shrink-0 mt-0.5" />
                <span>Review your strongest project examples</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#252525] shrink-0 mt-0.5" />
                <span>Prepare specific outcomes and quantifiable impact</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#252525] shrink-0 mt-0.5" />
                <span>Clarify identified experience gaps</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#252525] shrink-0 mt-0.5" />
                <span>Practice explaining your design decisions</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#252525] shrink-0 mt-0.5" />
                <span>Take a mock interview with voice or typed answers</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
