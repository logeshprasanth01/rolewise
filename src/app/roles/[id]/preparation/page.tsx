'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, AlertCircle, Check, Mic, Target } from 'lucide-react';
import { getPreparationItems, updatePreparationItemStatus } from '@/services/api';
import { PreparationItem, Role } from '@/types/database';
import { computeFitScore, fitBand, fitStatusKey, FIT_STATUS_META } from '@/lib/fit-score';

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_META: Record<string, { label: string; dot: string }> = {
  high: { label: 'High priority', dot: '#D97968' },
  medium: { label: 'Medium priority', dot: '#D9A35B' },
  low: { label: 'Low priority', dot: '#9A9B9E' },
};
// Gaps first inside the same priority.
const FIT_RANK: Record<string, number> = { not_demonstrated: 0, investigation: 1, transferable: 2, strong: 3 };

const INTERVIEW_TIPS = [
  'Pick 2–3 projects you can explain end to end',
  'Have one number per project: time saved, conversion, adoption',
  'Know what you would do differently, and why',
];

export default function PreparationPage() {
  const params = useParams();
  const roleId = params?.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [items, setItems] = useState<PreparationItem[]>([]);
  const [fitStatuses, setFitStatuses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        setFitStatuses(data.fitStatuses || []);
      } catch (err) {
        console.error('Error loading preparation items:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [roleId]);

  const ordered = useMemo(
    () =>
      [...items].sort((a, b) => {
        const p = (PRIORITY_RANK[(a.priority || '').toLowerCase()] ?? 1) - (PRIORITY_RANK[(b.priority || '').toLowerCase()] ?? 1);
        if (p !== 0) return p;
        return (
          (a.alignment_status ? FIT_RANK[fitStatusKey(a.alignment_status)] : 2) -
          (b.alignment_status ? FIT_RANK[fitStatusKey(b.alignment_status)] : 2)
        );
      }),
    [items]
  );

  const doneCount = items.filter((i) => i.status === 'completed').length;
  const nextUp = ordered.find((i) => i.status !== 'completed');
  const score = computeFitScore(fitStatuses);
  const band = fitBand(score);

  const toggleDone = async (item: PreparationItem) => {
    const next = item.status === 'completed' ? 'not_started' : 'completed';
    setSaveError(null);
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: next } : i)));
    try {
      await updatePreparationItemStatus(item.id, next);
    } catch (err) {
      console.error('[Prep] status update failed', err);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: item.status } : i)));
      setSaveError("Couldn't save that change. Check your connection and try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5" role="status" aria-live="polite">
        <div className="rw-processing-tile h-16 w-16 rounded-[18px] flex items-center justify-center" aria-hidden="true">
          <Target className="w-7 h-7 text-white" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#252525]">Loading your prep plan</p>
          <p className="mt-1 text-xs text-[#73757A]">Ordering focus areas by what matters most</p>
        </div>
        <div className="rw-boot-track h-[3px] w-40 rounded-full bg-[#252525]/10" aria-hidden="true">
          <span />
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="rounded-[24px] bg-white border border-[#E4E2DA] p-8 max-w-lg mx-auto text-center space-y-4 my-12">
        <AlertCircle className="w-6 h-6 mx-auto text-[#D97968]" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#252525]">Role not found</h2>
          <p className="text-xs text-[#73757A]">It may have been removed. Pick a job from your list.</p>
        </div>
        <Link href="/jobs" className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#252525] text-white text-xs font-semibold">
          Go to My Jobs <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[24px] bg-white border border-[#E4E2DA] p-8 max-w-lg mx-auto text-center space-y-4 my-12">
        <AlertCircle className="w-6 h-6 mx-auto text-[#D9A35B]" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#252525]">No prep plan yet</h2>
          <p className="text-xs text-[#73757A]">The plan is built from your role fit. Run the analysis again to create it.</p>
        </div>
        <Link href={`/roles/${role.id}/fit`} className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#252525] text-white text-xs sm:text-sm font-semibold">
          Go to role fit <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const pct = Math.round((doneCount / items.length) * 100);

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      <Link
        href={`/roles/${role.id}/fit`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#73757A] hover:text-[#252525] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Role fit</span>
      </Link>

      {/* HEADER */}
      <header className="mt-5 space-y-1.5">
        <p className="text-xs text-[#73757A]">
          {role.title} · {role.company}
        </p>
        <h1 className="text-2xl sm:text-[32px] font-bold text-[#252525] tracking-[-0.02em] leading-tight">
          Your interview prep plan
        </h1>
        <p className="text-sm text-[#55565A] max-w-xl">
          {items.length} focus areas from your role fit, in the order to tackle them. Mark each one as you prepare it.
        </p>
      </header>

      <div className="mt-7 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
        {/* PLAN */}
        <div className="space-y-4 min-w-0">
          {/* Progress */}
          <div className="rounded-[20px] bg-[#252525] text-white p-5 sm:p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-white/60">Progress</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">
                  {doneCount} <span className="text-white/50 font-semibold">of {items.length} prepared</span>
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-[#FFD84D]">{pct}%</p>
            </div>
            <div className="mt-4 h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
              <div className="h-full rounded-full bg-[#FFD84D] transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-4 text-xs text-white/70">
              {nextUp ? (
                <>
                  Next up: <span className="text-white font-medium">{nextUp.title}</span>
                </>
              ) : (
                <>All areas prepared. Time for a mock interview.</>
              )}
            </p>
            <Link
              href={`/roles/${role.id}/interview`}
              className="lg:hidden mt-4 flex w-full min-h-[44px] items-center justify-center gap-2 py-3 rounded-xl bg-[#FFD84D] text-[#252525] text-sm font-semibold"
            >
              <Mic className="w-4 h-4" />
              Start mock interview
            </Link>
          </div>

          {saveError && (
            <p role="alert" className="text-xs text-[#A4493A] bg-[#FFF0ED] border border-[#F6D8D1] rounded-xl px-3.5 py-2.5">
              {saveError}
            </p>
          )}

          {/* Items */}
          <ol className="space-y-3">
            {ordered.map((item, idx) => {
              const done = item.status === 'completed';
              const pr = PRIORITY_META[(item.priority || '').toLowerCase()] ?? PRIORITY_META.medium;
              const fit = item.alignment_status ? FIT_STATUS_META[fitStatusKey(item.alignment_status)] : null;
              const isNext = nextUp?.id === item.id;
              return (
                <li
                  key={item.id}
                  className={`group relative rounded-[20px] border bg-white p-5 sm:p-6 transition-all ${
                    isNext ? 'border-[#252525] shadow-[0_8px_24px_-14px_rgba(37,37,37,0.45)]' : 'border-[#E4E2DA]'
                  } ${done ? 'bg-[#FAF9F6]' : ''}`}
                >
                  <div className="flex gap-4">
                    <span
                      className={`shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold tabular-nums ${
                        done ? 'bg-[#5E9A6E] text-white' : isNext ? 'bg-[#FFD84D] text-[#252525]' : 'bg-[#F1EFE8] text-[#55565A]'
                      }`}
                      aria-hidden="true"
                    >
                      {done ? <Check className="w-4 h-4" strokeWidth={3} /> : String(idx + 1).padStart(2, '0')}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] font-medium">
                        <span className="inline-flex items-center gap-1.5 text-[#55565A]">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: pr.dot }} />
                          {pr.label}
                        </span>
                        {fit && (
                          <span className="rounded-full px-2 py-0.5" style={{ background: fit.bg, color: fit.fg }}>
                            Fit: {fit.label}
                          </span>
                        )}
                        {isNext && !done && <span className="text-[#252525] font-semibold">Start here</span>}
                      </div>

                      <h3 className={`mt-2 text-[15px] sm:text-base font-semibold leading-snug ${done ? 'text-[#73757A]' : 'text-[#252525]'}`}>
                        {item.title}
                      </h3>
                      <p className={`mt-1 text-sm leading-relaxed ${done ? 'text-[#9A9B9E]' : 'text-[#55565A]'}`}>
                        {item.description}
                      </p>

                      {item.requirement_text && (
                        <p className="mt-3 text-xs text-[#73757A] border-l-2 border-[#E4E2DA] pl-3 line-clamp-2">
                          <span className="text-[#9A9B9E]">From the job: </span>
                          {item.requirement_text}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDone(item)}
                          aria-pressed={done}
                          className={`touch-target inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                            done
                              ? 'bg-[#EEF7F0] text-[#3F7A52] hover:bg-[#E2F0E5]'
                              : 'bg-[#F3F2EE] text-[#252525] hover:bg-[#EAE8E1]'
                          }`}
                        >
                          <span
                            className={`flex h-4 w-4 items-center justify-center rounded-[5px] border ${
                              done ? 'bg-[#5E9A6E] border-[#5E9A6E]' : 'border-[#9A9B9E] bg-white'
                            }`}
                          >
                            {done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </span>
                          {done ? 'Prepared' : 'Mark as prepared'}
                        </button>
                        <Link
                          href={`/roles/${role.id}/interview`}
                          className="touch-target inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-[#55565A] hover:text-[#252525] hover:bg-[#F7F6F2] transition-colors"
                        >
                          Practice out loud <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        {/* SIDEBAR */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-[20px] bg-white border border-[#E4E2DA] p-5">
            <p className="text-xs text-[#73757A]">Role fit</p>
            {fitStatuses.length > 0 ? (
              <div className="mt-1 flex items-center gap-3">
                <span className="text-3xl font-bold tracking-[-0.03em] text-[#252525] tabular-nums">{score}%</span>
                <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: band.bg, color: band.fg }}>
                  {band.label}
                </span>
              </div>
            ) : (
              <p className="mt-1 text-sm text-[#55565A]">Not analysed yet</p>
            )}
            <Link href={`/roles/${role.id}/fit`} className="mt-2 inline-block text-xs font-medium text-[#55565A] underline underline-offset-2 hover:text-[#252525]">
              See requirement breakdown
            </Link>

            <div className="mt-5 pt-5 border-t border-[#EEECE6]">
              <Link
                href={`/roles/${role.id}/interview`}
                className="hidden lg:flex w-full min-h-[44px] items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#252525] hover:bg-[#3A3A3A] text-white text-sm font-semibold transition-colors"
              >
                <Mic className="w-4 h-4" />
                Start mock interview
              </Link>
              <p className="mt-2.5 hidden lg:block text-[11px] text-[#9A9B9E] text-center">
                Questions are based on this role and your resume
              </p>
            </div>
          </div>

          <div className="rounded-[20px] bg-white border border-[#E4E2DA] p-5">
            <p className="text-sm font-semibold text-[#252525]">Before the mock interview</p>
            <ul className="mt-3 space-y-2.5">
              {INTERVIEW_TIPS.map((tip, i) => (
                <li key={tip} className="flex gap-2.5 text-xs text-[#55565A] leading-relaxed">
                  <span className="shrink-0 text-[#9A9B9E] tabular-nums">{i + 1}.</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

    </div>
  );
}
