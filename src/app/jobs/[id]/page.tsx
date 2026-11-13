'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ExternalLink,
  Sparkles,
  Target,
  ListChecks,
  Bot,
  BellRing,
  Copy,
  Check,
  Loader2,
  Trash2,
  CalendarClock,
  PartyPopper,
  Send,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  addApplicationNote,
  getApplicationEvents,
  getRole,
  removeRole,
  updateApplication,
  type ApplicationPatch,
} from '@/services/api';
import type { ApplicationEvent, ApplicationStatus, Role } from '@/types/database';
import {
  PIPELINE_PATH,
  SOURCES,
  STATUS_META,
  addDaysISO,
  followUpDate,
  formatDate,
  isAnalyzed,
  isFollowUpDue,
  relativeDay,
  statusOf,
  todayISO,
} from '@/lib/tracker';
import { StatusPill } from '@/components/tracker/StatusPill';
import { useAuth } from '@/context/AuthContext';

function toLocalInput(ts: string | null | undefined) {
  if (!ts) return '';
  const d = new Date(ts);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params?.id as string;
  const { userName } = useAuth();
  const today = todayISO();

  const [role, setRole] = useState<Role | null>(null);
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [form, setForm] = useState<ApplicationPatch>({});
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    const r = await getRole(roleId);
    if (!r) {
      setNotFound(true);
      setIsLoading(false);
      return;
    }
    setRole(r);
    setForm({
      applied_at: r.applied_at || '',
      source: r.source || '',
      contact_name: r.contact_name || '',
      contact_email: r.contact_email || '',
      job_url: r.job_url || '',
      next_follow_up: r.next_follow_up || '',
      interview_at: toLocalInput(r.interview_at),
      notes: r.notes || '',
    });
    setEvents(await getApplicationEvents(roleId));
    setIsLoading(false);
  };

  useEffect(() => {
    // Data fetch on mount; state is only set after the request resolves.
    // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
    if (roleId) load();
  }, [roleId]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const status = role ? statusOf(role) : 'saved';
  const due = role ? isFollowUpDue(role, today) : false;
  const fu = role ? followUpDate(role) : null;

  const followUpEmail = useMemo(() => {
    if (!role) return '';
    const first = (userName || '').split(' ')[0] || '';
    return `Subject: Following up – ${role.title} application\n\nHi${role.contact_name ? ` ${role.contact_name.split(' ')[0]}` : ''},\n\nI applied for the ${role.title} role at ${role.company}${role.applied_at ? ` on ${formatDate(role.applied_at)}` : ''} and wanted to follow up. I'm still very interested and would be glad to share more about my work or walk you through a case study.\n\nThank you for your time,\n${userName || first}`;
  }, [role, userName]);

  const apply = async (patch: ApplicationPatch, msg: string, eventNote?: string) => {
    if (!role) return;
    setIsSaving(true);
    try {
      const updated = await updateApplication(role, patch, eventNote);
      setRole(updated);
      setEvents(await getApplicationEvents(role.id));
      setToast({ text: msg, type: 'success' });
    } catch (err) {
      setToast({ text: err instanceof Error ? err.message : 'Not saved.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const setStatus = (s: ApplicationStatus) => {
    if (s === status) return;
    apply({ application_status: s }, `Moved to ${STATUS_META[s].label}.`);
  };

  const saveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const patch: ApplicationPatch = {
      applied_at: form.applied_at || null,
      source: form.source || null,
      contact_name: form.contact_name?.trim() || null,
      contact_email: form.contact_email?.trim() || null,
      job_url: form.job_url?.trim() || null,
      next_follow_up: form.next_follow_up || null,
      interview_at: form.interview_at ? new Date(form.interview_at).toISOString() : null,
      notes: form.notes?.trim() || null,
    };
    apply(patch, 'Details saved.');
  };

  const markFollowedUp = () =>
    apply({ next_follow_up: addDaysISO(today, 7) }, 'Logged. Next reminder in 7 days.', 'Followed up');

  const copyFollowUp = async () => {
    try {
      await navigator.clipboard.writeText(followUpEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast({ text: 'Copy not allowed here. Select the text instead.', type: 'error' });
    }
  };

  const submitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role || !note.trim()) return;
    try {
      await addApplicationNote(role.id, note);
      setNote('');
      setEvents(await getApplicationEvents(role.id));
    } catch (err) {
      setToast({ text: err instanceof Error ? err.message : 'Note not saved.', type: 'error' });
    }
  };

  const handleRemove = async () => {
    if (!role) return;
    setIsSaving(true);
    try {
      await removeRole(role.id);
      router.push('/jobs');
    } catch {
      setIsSaving(false);
      setToast({ text: "Couldn't remove this job.", type: 'error' });
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-3">
        <div className="h-8 w-32 rounded-lg bg-[#E6E5DF] animate-pulse" />
        <div className="h-36 rounded-[26px] bg-[#FAF9F4] border border-[#D9D8D2] animate-pulse" />
        <div className="h-48 rounded-[26px] bg-[#FAF9F4] border border-[#D9D8D2] animate-pulse" />
      </div>
    );
  }

  if (notFound || !role) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <h1 className="text-lg font-bold text-[#252525]">This job isn’t in your tracker</h1>
        <p className="text-sm text-[#73757A]">It may have been removed.</p>
        <Link href="/jobs" className="inline-flex items-center gap-1.5 h-11 px-4 rounded-xl bg-[#252525] text-white text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to Job Tracker
        </Link>
      </div>
    );
  }

  const field = 'w-full h-11 px-3 rounded-xl bg-white border border-[#D9D8D2] text-[15px] text-[#252525] outline-none focus:border-[#252525]';
  const label = 'text-xs font-semibold text-[#4A4B4F]';
  const card = 'rounded-[22px] bg-[#FAF9F4] border border-[#D9D8D2] p-4 sm:p-5';
  const stepIndex = PIPELINE_PATH.indexOf(status);
  const closed = status === 'rejected' || status === 'withdrawn';

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-16 animate-in fade-in duration-300">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#73757A] hover:text-[#252525]">
        <ArrowLeft className="w-4 h-4" /> Job Tracker
      </Link>

      {/* Header */}
      <section className={card}>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white border border-[#D9D8D2] flex items-center justify-center text-lg font-bold text-[#252525] shrink-0" aria-hidden="true">
            {role.company.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-[#252525] tracking-tight leading-tight">{role.title}</h1>
            <p className="text-sm text-[#73757A] mt-0.5">
              {role.company}
              {role.location ? ` · ${role.location}` : ''}
              {role.work_model && role.work_model !== 'Full-time' ? ` · ${role.work_model}` : ''}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <StatusPill status={status} />
              {role.applied_at && status !== 'saved' && (
                <span className="text-[13px] text-[#73757A]">Applied {formatDate(role.applied_at)} ({relativeDay(role.applied_at, today)})</span>
              )}
            </div>
          </div>
        </div>
        {role.job_url && (
          <a href={role.job_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#252525] underline underline-offset-2">
            View job post <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Stepper */}
        <div className="mt-4 -mx-1 overflow-x-auto [scrollbar-width:none]">
          <ol className="flex items-center gap-1 px-1 w-max sm:w-full">
            {PIPELINE_PATH.map((s, i) => {
              const done = !closed && stepIndex >= i;
              const current = status === s;
              return (
                <li key={s} className="flex items-center gap-1 sm:flex-1">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => setStatus(s)}
                    aria-current={current ? 'step' : undefined}
                    className={`h-10 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors w-full ${current ? 'bg-[#252525] text-white border-[#252525]' : done ? 'bg-[#FFF2B8] text-[#5C4A00] border-[#F0DE8A]' : 'bg-white text-[#73757A] border-[#D9D8D2] hover:border-[#9A9B9E]'}`}
                  >
                    {STATUS_META[s].label}
                  </button>
                  {i < PIPELINE_PATH.length - 1 && <span className={`hidden sm:block h-px w-3 ${done ? 'bg-[#E0B400]' : 'bg-[#D9D8D2]'}`} aria-hidden="true" />}
                </li>
              );
            })}
          </ol>
        </div>
        <div className="mt-2 flex gap-3 text-[13px]">
          <button type="button" onClick={() => setStatus('rejected')} className={`font-semibold ${status === 'rejected' ? 'text-[#8F3B2E]' : 'text-[#9A9B9E] hover:text-[#8F3B2E]'}`}>
            {status === 'rejected' ? '● Rejected' : 'Mark rejected'}
          </button>
          <button type="button" onClick={() => setStatus('withdrawn')} className={`font-semibold ${status === 'withdrawn' ? 'text-[#4A4B4F]' : 'text-[#9A9B9E] hover:text-[#4A4B4F]'}`}>
            {status === 'withdrawn' ? '● Withdrawn' : 'Withdraw'}
          </button>
        </div>
      </section>

      {/* Next step */}
      <section className={`${card} ${due ? 'bg-[#FFF5DF] border-[#F0D9A6]' : ''}`} aria-labelledby="next-step">
        <h2 id="next-step" className="text-xs font-bold uppercase tracking-[0.08em] text-[#73757A]">Next step</h2>
        {status === 'saved' && (
          <div className="mt-2 space-y-3">
            <p className="text-[15px] text-[#252525]">You haven’t applied yet. When you send it, mark it applied and Rolewise will remind you to follow up in 7 days.</p>
            <button type="button" onClick={() => setStatus('applied')} className="h-11 px-4 rounded-xl bg-[#252525] text-white text-sm font-semibold inline-flex items-center gap-2">
              <Send className="w-4 h-4" /> I’ve applied today
            </button>
          </div>
        )}
        {(status === 'applied' || status === 'screening') && (
          <div className="mt-2 space-y-3">
            <p className="text-[15px] text-[#252525] flex items-start gap-2">
              <BellRing className={`w-4 h-4 mt-0.5 shrink-0 ${due ? 'text-[#8A5A00]' : 'text-[#9A9B9E]'}`} />
              {due
                ? `Follow-up is due${fu && fu !== today ? ` since ${formatDate(fu)}` : ' today'}. A short, polite nudge keeps you on their radar.`
                : fu
                  ? `No reply yet. Follow up on ${formatDate(fu)} if you haven’t heard back.`
                  : 'Add the date you applied so Rolewise can time your follow-up.'}
            </p>
            {due && (
              <>
                <pre className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#252525] bg-white border border-[#E6D3A8] rounded-xl p-3 font-sans select-all">{followUpEmail}</pre>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={copyFollowUp} className="h-11 px-4 rounded-xl bg-white border border-[#D9D8D2] text-sm font-semibold inline-flex items-center gap-2">
                    {copied ? <Check className="w-4 h-4 text-[#2F6B42]" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy follow-up'}
                  </button>
                  <button type="button" onClick={markFollowedUp} disabled={isSaving} className="h-11 px-4 rounded-xl bg-[#252525] text-white text-sm font-semibold">
                    I’ve followed up
                  </button>
                </div>
                {role.contact_email && <p className="text-[13px] text-[#73757A]">Send to <span className="font-semibold text-[#252525] select-all">{role.contact_email}</span></p>}
              </>
            )}
          </div>
        )}
        {status === 'interview' && (
          <div className="mt-2 space-y-3">
            <p className="text-[15px] text-[#252525] flex items-start gap-2">
              <CalendarClock className="w-4 h-4 mt-0.5 shrink-0 text-[#1F4E79]" />
              {role.interview_at
                ? `Interview on ${new Date(role.interview_at).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}. Run a practice round before it.`
                : 'Add the interview date below, then run a practice round for this role.'}
            </p>
            <Link href={isAnalyzed(role) ? `/roles/${role.id}/interview` : `/jobs/new?roleId=${role.id}`} className="h-11 px-4 rounded-xl bg-[#FFD84D] text-[#252525] text-sm font-bold inline-flex items-center gap-2">
              <Bot className="w-4 h-4" /> {isAnalyzed(role) ? 'Practice this interview' : 'Build interview prep first'}
            </Link>
          </div>
        )}
        {status === 'offer' && (
          <p className="mt-2 text-[15px] text-[#252525] flex items-start gap-2">
            <PartyPopper className="w-4 h-4 mt-0.5 shrink-0 text-[#2F6B42]" /> You got an offer. Note the deadline and terms below so nothing slips.
          </p>
        )}
        {closed && (
          <p className="mt-2 text-[15px] text-[#252525]">This one is closed. Add a note on what you learned; it helps the next application.</p>
        )}
      </section>

      {/* Prep */}
      <section className={card} aria-labelledby="prep">
        <h2 id="prep" className="text-xs font-bold uppercase tracking-[0.08em] text-[#73757A]">Interview prep for this role</h2>
        {isAnalyzed(role) ? (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { href: `/roles/${role.id}/fit`, label: 'Role fit', icon: Target },
              { href: `/roles/${role.id}/preparation`, label: 'Prep plan', icon: ListChecks },
              { href: `/roles/${role.id}/interview`, label: 'Rowi interview', icon: Bot },
            ].map(({ href, label: l, icon: Icon }) => (
              <Link key={href} href={href} className="rounded-2xl bg-white border border-[#D9D8D2] hover:border-[#252525] p-3 flex flex-col items-center gap-1.5 text-center transition-colors">
                <Icon className="w-5 h-5 text-[#252525]" />
                <span className="text-[13px] font-semibold text-[#252525]">{l}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <p className="text-[15px] text-[#252525]">Paste the job description and your resume. Rolewise maps your experience to each requirement and builds a prep plan and mock interview.</p>
            <Link href={`/jobs/new?roleId=${role.id}`} className="h-11 px-4 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-sm font-bold inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Build my prep plan
            </Link>
          </div>
        )}
      </section>

      {/* Details */}
      <form onSubmit={saveDetails} className={`${card} space-y-4`} aria-labelledby="details">
        <h2 id="details" className="text-xs font-bold uppercase tracking-[0.08em] text-[#73757A]">Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="d-applied" className={label}>Applied on</label>
            <input id="d-applied" type="date" className={field} value={form.applied_at || ''} onChange={(e) => setForm({ ...form, applied_at: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="d-source" className={label}>Found via</label>
            <select id="d-source" className={field} value={form.source || ''} onChange={(e) => setForm({ ...form, source: e.target.value })}>
              <option value="">Not set</option>
              {SOURCES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="d-cname" className={label}>Contact name</label>
            <input id="d-cname" className={field} value={form.contact_name || ''} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} placeholder="Recruiter or hiring manager" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="d-cemail" className={label}>Contact email</label>
            <input id="d-cemail" type="email" inputMode="email" className={field} value={form.contact_email || ''} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="d-url" className={label}>Job post link</label>
            <input id="d-url" type="url" inputMode="url" className={field} value={form.job_url || ''} onChange={(e) => setForm({ ...form, job_url: e.target.value })} placeholder="https://" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="d-follow" className={label}>Next follow-up</label>
            <input id="d-follow" type="date" className={field} value={form.next_follow_up || ''} onChange={(e) => setForm({ ...form, next_follow_up: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="d-int" className={label}>Interview date</label>
            <input id="d-int" type="datetime-local" className={field} value={form.interview_at || ''} onChange={(e) => setForm({ ...form, interview_at: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="d-notes" className={label}>Notes</label>
            <textarea id="d-notes" rows={3} className={`${field} h-auto py-2.5`} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Salary range, team, what they asked…" />
          </div>
        </div>
        <button type="submit" disabled={isSaving} className="h-11 px-5 rounded-xl bg-[#252525] text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60">
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />} Save details
        </button>
      </form>

      {/* Timeline */}
      <section className={card} aria-labelledby="timeline">
        <h2 id="timeline" className="text-xs font-bold uppercase tracking-[0.08em] text-[#73757A]">Timeline</h2>
        <form onSubmit={submitNote} className="mt-3 flex gap-2">
          <label htmlFor="t-note" className="sr-only">Add a note</label>
          <input id="t-note" className={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note, e.g. HR called, asked for portfolio" />
          <button type="submit" disabled={!note.trim()} className="h-11 px-4 rounded-xl bg-white border border-[#D9D8D2] text-sm font-semibold disabled:opacity-50 shrink-0">Add</button>
        </form>
        <ol className="mt-4 space-y-3">
          {events.map((ev) => (
            <li key={ev.id} className="flex gap-3">
              <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ background: ev.to_status ? STATUS_META[ev.to_status as ApplicationStatus]?.dot || '#9A9B9E' : '#9A9B9E' }} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-[14px] text-[#252525]">
                  {ev.event_type === 'created' && `Added as ${STATUS_META[(ev.to_status || 'saved') as ApplicationStatus]?.label || ev.to_status}`}
                  {ev.event_type === 'status' && `Moved to ${STATUS_META[(ev.to_status || 'saved') as ApplicationStatus]?.label || ev.to_status}`}
                  {ev.event_type !== 'created' && ev.event_type !== 'status' && (ev.note || 'Note')}
                  {(ev.event_type === 'created' || ev.event_type === 'status') && ev.note ? ` · ${ev.note}` : ''}
                </p>
                <p className="text-[12px] text-[#9A9B9E]">{new Date(ev.created_at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</p>
              </div>
            </li>
          ))}
          <li className="flex gap-3">
            <span className="mt-1.5 w-2 h-2 rounded-full bg-[#D9D8D2] shrink-0" aria-hidden="true" />
            <p className="text-[13px] text-[#9A9B9E]">Added to Rolewise {formatDate(role.created_at)}</p>
          </li>
        </ol>
      </section>

      {/* Remove */}
      <div className="pt-1">
        {confirmRemove ? (
          <div className="rounded-2xl border border-[#FECDCA] bg-[#FFF0ED] p-4 space-y-3">
            <p className="text-sm text-[#8F3B2E] font-medium">Remove {role.title} at {role.company}? Its prep plan is removed too.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setConfirmRemove(false)} className="h-10 px-4 rounded-xl bg-white border border-[#D9D8D2] text-sm font-semibold">Keep it</button>
              <button type="button" onClick={handleRemove} disabled={isSaving} className="h-10 px-4 rounded-xl bg-[#C85C4D] text-white text-sm font-semibold">Remove job</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmRemove(true)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#9A9B9E] hover:text-[#C85C4D]">
            <Trash2 className="w-3.5 h-3.5" /> Remove from tracker
          </button>
        )}
      </div>

      {toast && (
        <div role="status" aria-live="polite" className={`fixed left-4 right-4 sm:left-auto sm:right-6 bottom-[calc(84px+env(safe-area-inset-bottom))] lg:bottom-6 z-[70] sm:max-w-sm px-4 py-3 rounded-xl border bg-white shadow-lg text-sm font-medium flex items-center gap-2.5 ${toast.type === 'success' ? 'border-[#DDEEDF] text-[#2F6B42]' : 'border-[#FECDCA] text-[#A94B3F]'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
