'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bot, ChevronDown, MessageSquare, ThumbsUp, Wrench, Dumbbell } from 'lucide-react';
import { getInterviewHistory, getUserRoles } from '@/services/api';
import type { CommunicationAnalysisResponse, InterviewHistoryRecord, Role } from '@/types/database';
import { isAnalyzed } from '@/lib/tracker';

const LEVEL_STYLE: Record<string, { bg: string; fg: string }> = {
  strong: { bg: '#EEF7F0', fg: '#2F6B42' },
  developing: { bg: '#FFF5DF', fg: '#8A5A00' },
  'needs more detail': { bg: '#FFF0ED', fg: '#8F3B2E' },
};

function Level({ value }: { value?: string }) {
  if (!value) return null;
  const style = LEVEL_STYLE[value.toLowerCase()] || { bg: '#EFEEE8', fg: '#4A4B4F' };
  return (
    <span className="px-2 py-0.5 rounded-full text-[12px] font-semibold" style={{ background: style.bg, color: style.fg }}>
      {value}
    </span>
  );
}

export default function FeedbackPage() {
  const [history, setHistory] = useState<InterviewHistoryRecord[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([getInterviewHistory(), getUserRoles()])
      .then(([h, r]) => {
        setHistory(h);
        setRoles(r);
        if (h.length) setSelectedId(h[0].id);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const roleById = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r])), [roles]);
  const selected = history.find((h) => h.id === selectedId) || null;
  const practiceRole = roles.find(isAnalyzed);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-3">
        <div className="h-9 w-56 rounded-lg bg-[#E6E5DF] animate-pulse" />
        <div className="h-64 rounded-[26px] bg-[#FAF9F4] border border-[#D9D8D2] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-16 animate-in fade-in duration-300">
      <header className="space-y-1">
        <h1 className="text-[26px] sm:text-3xl font-bold text-[#252525] tracking-tight">Interview Feedback</h1>
        <p className="text-sm text-[#73757A]">Feedback from your mock interviews with Rowi, saved after each session.</p>
      </header>

      {history.length === 0 ? (
        <section className="rounded-[26px] bg-[#FAF9F4] border border-[#D9D8D2] p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF2B8] flex items-center justify-center mx-auto">
            <MessageSquare className="w-6 h-6 text-[#252525]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#252525]">No mock interviews yet</h2>
            <p className="text-sm text-[#73757A] max-w-sm mx-auto">
              Finish a mock interview with Rowi for one of your jobs and your answers, strengths and what to work on will appear here.
            </p>
          </div>
          <Link
            href={practiceRole ? `/roles/${practiceRole.id}/interview` : '/jobs'}
            className="touch-target inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-sm font-bold text-[#252525]"
          >
            <Bot className="w-4 h-4" /> {practiceRole ? `Practice for ${practiceRole.company}` : 'Pick a job to practice'}
          </Link>
        </section>
      ) : (
        <>
          {/* Session picker */}
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto [scrollbar-width:none]">
            <div className="flex gap-2 w-max">
              {history.map((h) => {
                const role = h.role_id ? roleById[h.role_id] : null;
                const active = h.id === selectedId;
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setSelectedId(h.id)}
                    className={`text-left rounded-2xl border px-3.5 py-2.5 min-w-[180px] transition-colors ${active ? 'bg-[#252525] border-[#252525] text-white' : 'bg-[#FAF9F4] border-[#D9D8D2] text-[#252525] hover:border-[#9A9B9E]'}`}
                  >
                    <span className="block text-[13px] font-semibold truncate">{role ? role.company : 'Removed job'}</span>
                    <span className={`block text-[12px] ${active ? 'text-white/70' : 'text-[#73757A]'}`}>
                      {new Date(h.completed_at || h.started_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} · {h.questions_answered ?? h.rounds?.length ?? 0} answers
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <article className="space-y-4">
              {(() => {
                const role = selected.role_id ? roleById[selected.role_id] : null;
                const f = selected.final_feedback;
                return (
                  <>
                    <section className="rounded-[22px] bg-[#FAF9F4] border border-[#D9D8D2] p-4 sm:p-5">
                      <p className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#73757A]">Mock interview</p>
                      <h2 className="text-lg sm:text-xl font-bold text-[#252525] mt-1">{role ? `${role.title} · ${role.company}` : 'Interview session'}</h2>
                      {role && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Link href={`/roles/${role.id}/interview`} className="h-10 px-4 rounded-xl bg-[#FFD84D] text-[13px] font-bold text-[#252525] inline-flex items-center gap-1.5">
                            <Bot className="w-4 h-4" /> Practice again
                          </Link>
                          <Link href={`/jobs/${role.id}`} className="h-10 px-4 rounded-xl bg-white border border-[#D9D8D2] text-[13px] font-semibold text-[#252525] inline-flex items-center">
                            Open job
                          </Link>
                        </div>
                      )}
                    </section>

                    {f ? (
                      <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-[22px] bg-[#FAF9F4] border border-[#D9D8D2] p-4 sm:p-5">
                          <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2"><ThumbsUp className="w-4 h-4 text-[#2F6B42]" /> What worked</h3>
                          <ul className="mt-2 space-y-2 text-[14px] text-[#252525] list-disc pl-5">{f.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
                        </div>
                        <div className="rounded-[22px] bg-[#FAF9F4] border border-[#D9D8D2] p-4 sm:p-5">
                          <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2"><Wrench className="w-4 h-4 text-[#8A5A00]" /> Work on next</h3>
                          <ul className="mt-2 space-y-2 text-[14px] text-[#252525] list-disc pl-5">{f.areas_to_improve.map((x, i) => <li key={i}>{x}</li>)}</ul>
                        </div>
                        <div className="rounded-[22px] bg-[#FAF9F4] border border-[#D9D8D2] p-4 sm:p-5">
                          <h3 className="text-sm font-bold text-[#252525]">Communication</h3>
                          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                            {(['clarity', 'structure', 'specificity', 'conciseness'] as const).map((k) => (
                              <div key={k} className="flex items-center justify-between gap-2">
                                <dt className="capitalize text-[#73757A]">{k}</dt>
                                <dd><Level value={f.communication?.[k]} /></dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        <div className="rounded-[22px] bg-[#FAF9F4] border border-[#D9D8D2] p-4 sm:p-5">
                          <h3 className="text-sm font-bold text-[#252525] flex items-center gap-2"><Dumbbell className="w-4 h-4" /> Practice exercises</h3>
                          <ul className="mt-2 space-y-2 text-[14px] text-[#252525] list-disc pl-5">{f.practice_exercises.map((x, i) => <li key={i}>{x}</li>)}</ul>
                        </div>
                      </section>
                    ) : (
                      <p className="text-sm text-[#73757A] rounded-xl bg-[#F3F2EE] p-4">The overall summary wasn’t generated for this session. Your answer-by-answer feedback is below.</p>
                    )}

                    {selected.rounds && selected.rounds.length > 0 && (
                      <section className="space-y-2">
                        <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#73757A]">Your answers</h3>
                        {selected.rounds.map((r, i) => {
                          const a = r.analysis as CommunicationAnalysisResponse | undefined;
                          return (
                            <details key={i} className="group rounded-2xl bg-[#FAF9F4] border border-[#D9D8D2]">
                              <summary className="list-none cursor-pointer p-4 flex items-start gap-3">
                                <span className="w-7 h-7 rounded-lg bg-white border border-[#D9D8D2] flex items-center justify-center text-[13px] font-bold shrink-0">{i + 1}</span>
                                <span className="flex-1 text-[14px] font-semibold text-[#252525]">{r.question}</span>
                                <ChevronDown className="w-4 h-4 text-[#9A9B9E] mt-0.5 transition-transform group-open:rotate-180" />
                              </summary>
                              <div className="px-4 pb-4 space-y-3 text-[14px]">
                                <p className="text-[#4A4B4F] whitespace-pre-wrap bg-white rounded-xl border border-[#E6E5DF] p-3">{r.transcript || 'No answer recorded.'}</p>
                                {a?.strengths?.length ? <p><span className="font-semibold text-[#2F6B42]">Strong: </span>{a.strengths.join(' ')}</p> : null}
                                {a?.improvements?.length ? <p><span className="font-semibold text-[#8A5A00]">Improve: </span>{a.improvements.join(' ')}</p> : null}
                                {a?.missing_elements?.length ? <p><span className="font-semibold text-[#8F3B2E]">Missing: </span>{a.missing_elements.join(' ')}</p> : null}
                              </div>
                            </details>
                          );
                        })}
                      </section>
                    )}
                  </>
                );
              })()}
            </article>
          )}
        </>
      )}
    </div>
  );
}
