'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Sparkles, ClipboardList, ChevronRight, BellRing, Briefcase, X, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { getUserRoles, updateApplication, removeRole } from '@/services/api';
import type { ApplicationStatus, Role } from '@/types/database';
import {
  APPLICATION_STATUSES,
  STATUS_META,
  addDaysISO,
  followUpDate,
  formatDate,
  isActive,
  isAnalyzed,
  isFollowUpDue,
  relativeDay,
  statusOf,
  todayISO,
} from '@/lib/tracker';
import { StatusPill } from '@/components/tracker/StatusPill';
import { QuickAddSheet } from '@/components/tracker/QuickAddSheet';

type Filter = 'all' | 'due' | 'closed' | ApplicationStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'due', label: 'Follow up' },
  { key: 'saved', label: 'Saved' },
  { key: 'applied', label: 'Applied' },
  { key: 'screening', label: 'Screening' },
  { key: 'interview', label: 'Interview' },
  { key: 'offer', label: 'Offer' },
  { key: 'closed', label: 'Closed' },
];

function matchesFilter(role: Role, filter: Filter, today: string) {
  const s = statusOf(role);
  if (filter === 'all') return true;
  if (filter === 'due') return isFollowUpDue(role, today);
  if (filter === 'closed') return s === 'rejected' || s === 'withdrawn';
  return s === filter;
}

export default function JobTrackerPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteJob = async (role: Role) => {
    setDeletingId(role.id);
    try {
      await removeRole(role.id);
      setRoles((prev) => prev.filter((r) => r.id !== role.id));
      setToast({ text: `${role.title} removed.`, type: 'success' });
    } catch {
      setToast({ text: "Couldn't delete this job. Please try again.", type: 'error' });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };
  const today = todayISO();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    getUserRoles()
      .then((data) => {
        setRoles(data);
        // Deep links from the header search, dashboard and notifications.
        const q = params.get('q');
        const f = params.get('filter') as Filter | null;
        if (q) setQuery(q);
        if (f && FILTERS.some((x) => x.key === f)) setFilter(f);
        if (params.get('add') === '1') setSheetOpen(true);
      })
      .catch((err) => console.error('Error loading jobs:', err))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const stats = useMemo(() => {
    const applied = roles.filter((r) => statusOf(r) !== 'saved');
    const responded = applied.filter((r) => ['screening', 'interview', 'offer', 'rejected'].includes(statusOf(r)));
    const weekAgo = addDaysISO(today, -7);
    return {
      active: roles.filter(isActive).length,
      thisWeek: applied.filter((r) => r.applied_at && r.applied_at >= weekAgo).length,
      responseRate: applied.length ? Math.round((responded.length / applied.length) * 100) : 0,
      hasApplied: applied.length > 0,
      due: roles.filter((r) => isFollowUpDue(r, today)).length,
      interviews: roles.filter((r) => statusOf(r) === 'interview').length,
    };
  }, [roles, today]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    FILTERS.forEach((f) => (c[f.key] = roles.filter((r) => matchesFilter(r, f.key, today)).length));
    return c;
  }, [roles, today]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles
      .filter((r) => matchesFilter(r, filter, today))
      .filter((r) => !q || `${r.title} ${r.company} ${r.source || ''} ${r.contact_email || ''}`.toLowerCase().includes(q))
      .sort((a, b) => {
        // Due follow-ups first, then most recent activity.
        const ad = isFollowUpDue(a, today) ? 1 : 0;
        const bd = isFollowUpDue(b, today) ? 1 : 0;
        if (ad !== bd) return bd - ad;
        const ak = a.applied_at || a.created_at || '';
        const bk = b.applied_at || b.created_at || '';
        return bk.localeCompare(ak);
      });
  }, [roles, filter, query, today]);

  const changeStatus = async (role: Role, next: ApplicationStatus) => {
    const prev = roles;
    setRoles((rs) => rs.map((r) => (r.id === role.id ? { ...r, application_status: next } : r)));
    try {
      const updated = await updateApplication(role, { application_status: next });
      setRoles((rs) => rs.map((r) => (r.id === role.id ? updated : r)));
      setToast({ text: `${role.company} moved to ${STATUS_META[next].label}.`, type: 'success' });
    } catch (err) {
      setRoles(prev);
      setToast({ text: err instanceof Error ? err.message : 'Status not saved.', type: 'error' });
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-16 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-[26px] sm:text-3xl font-bold text-[#1A1714] tracking-tight">Job Tracker</h1>
          <p className="text-sm text-[#6B6259]">
            {isLoading ? 'Loading your applications…' : `${stats.active} active · ${stats.interviews} in interviews`}
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-1.5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              data-ui-sound="click"
              title="Already applied somewhere? Log it to track follow-ups."
              className="touch-target flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-11 px-3 sm:px-4 rounded-xl bg-white border border-[#E6E0D7] hover:border-[#1A1714] text-[13px] sm:text-sm font-semibold text-[#1A1714] whitespace-nowrap transition-colors"
            >
              <ClipboardList className="hidden sm:block w-4 h-4" /> Log an application
            </button>
            <Link
              href="/jobs/new"
              className="touch-target flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-sm font-bold text-[#1A1714] transition-colors"
            >
              <Plus className="w-4 h-4" /> Add a job
            </Link>
          </div>
          <p className="text-[11px] text-[#6B6259]">Add a job to get a fit score and prep plan. Already applied? Log it to track follow-ups.</p>
        </div>
      </header>

      {/* Summary */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5" aria-label="Summary">
        {[
          { label: 'Active', value: stats.active, sub: 'not closed' },
          { label: 'This week', value: stats.thisWeek, sub: 'applications sent' },
          { label: 'Response rate', value: stats.hasApplied ? `${stats.responseRate}%` : '–', sub: stats.hasApplied ? 'heard back' : 'after your first application' },
          { label: 'Follow-ups due', value: stats.due, sub: 'tap to see', due: stats.due > 0, onClick: () => setFilter('due') },
        ].map((s) => {
          const body = (
            <>
              <p className="text-[12px] font-semibold text-[#6B6259]">{s.label}</p>
              <p className="text-2xl font-bold text-[#1A1714] tabular-nums leading-tight">{isLoading ? '–' : s.value}</p>
              <p className="text-[11px] text-[#9A9086]">{s.sub}</p>
            </>
          );
          const cls = `rounded-2xl border p-3.5 text-left ${s.due ? 'bg-[#FFF5DF] border-[#F0D9A6]' : 'bg-[#FFFFFF] border-[#E6E0D7]'}`;
          return s.onClick ? (
            <button key={s.label} type="button" onClick={s.onClick} className={`${cls} hover:border-[#1A1714] transition-colors`}>{body}</button>
          ) : (
            <div key={s.label} className={cls}>{body}</div>
          );
        })}
      </section>

      {/* Search + filters */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 h-12 px-3.5 rounded-2xl bg-white border border-[#E6E0D7] focus-within:border-[#1A1714] transition-colors">
          <Search className="w-4 h-4 text-[#9A9086] shrink-0" />
          <label htmlFor="job-search" className="sr-only">Search jobs</label>
          <input
            id="job-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company, role or contact"
            className="flex-1 bg-transparent outline-none text-[15px] text-[#1A1714] placeholder:text-[#9A9086]"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="w-8 h-8 flex items-center justify-center text-[#9A9086] hover:text-[#1A1714]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0 overflow-x-auto [scrollbar-width:none]">
          <div className="flex gap-2 w-max" role="tablist" aria-label="Filter by stage">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(f.key)}
                  className={`h-9 px-3.5 rounded-full text-[13px] font-semibold whitespace-nowrap border transition-colors ${active ? 'bg-[#1A1714] text-white border-[#1A1714]' : 'bg-[#FFFFFF] text-[#4D453C] border-[#E6E0D7] hover:border-[#9A9086]'}`}
                >
                  {f.label}
                  <span className={`ml-1.5 tabular-nums ${active ? 'text-white/70' : 'text-[#9A9086]'}`}>{counts[f.key] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* List */}
      {isLoading ? (
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-[92px] rounded-2xl bg-[#FFFFFF] border border-[#E6E0D7] animate-pulse" />
          ))}
        </div>
      ) : roles.length === 0 ? (
        <div className="rounded-[26px] bg-[#FFFFFF] border border-[#E6E0D7] p-8 sm:p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFE58A] flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6 text-[#1A1714]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#1A1714]">Start your tracker</h2>
            <p className="text-sm text-[#6B6259] max-w-sm mx-auto">
              Log every application here. Rolewise reminds you when to follow up and builds an interview plan for the ones that move forward.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Link href="/jobs/new" className="touch-target inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-sm font-bold text-[#1A1714]">
              <Plus className="w-4 h-4" /> Add a job
            </Link>
            <button type="button" onClick={() => setSheetOpen(true)} className="text-xs font-semibold text-[#6B6259] underline underline-offset-2 hover:text-[#1A1714]">
              Already applied? Log an application
            </button>
          </div>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl bg-[#FFFFFF] border border-dashed border-[#E6E0D7] p-8 text-center">
          <p className="text-sm font-semibold text-[#1A1714]">
            {filter === 'due' ? 'No follow-ups due. You’re on top of it.' : 'Nothing matches this view.'}
          </p>
          <button type="button" onClick={() => { setFilter('all'); setQuery(''); }} className="mt-2 text-[13px] font-semibold text-[#6B6259] underline underline-offset-2">
            Show all jobs
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((role) => {
            const s = statusOf(role);
            const due = isFollowUpDue(role, today);
            const fu = followUpDate(role);
            return (
              <li key={role.id} className={`relative rounded-2xl border bg-[#FFFFFF] transition-colors hover:border-[#9A9086] ${due ? 'border-[#F0D9A6]' : 'border-[#E6E0D7]'}`}>
                <Link href={`/jobs/${role.id}`} className="flex items-start gap-3 p-3.5 sm:p-4 pr-10">
                  <div className="w-11 h-11 rounded-xl bg-white border border-[#E6E0D7] flex items-center justify-center text-[15px] font-bold text-[#1A1714] shrink-0" aria-hidden="true">
                    {(role.company || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-[15px] font-semibold text-[#1A1714] leading-snug truncate">{role.title}</p>
                    <p className="text-[13px] text-[#6B6259] truncate">
                      {role.company}
                      {role.source ? ` · ${role.source}` : ''}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <StatusPill status={s} size="sm" />
                      {role.applied_at && s !== 'saved' && (
                        <span className="text-[12px] text-[#6B6259]">Applied {relativeDay(role.applied_at, today)}</span>
                      )}
                      {due && fu && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FFF5DF] text-[#8A5A00] text-[11px] font-semibold">
                          <BellRing className="w-3 h-3" /> Follow up {fu === today ? 'today' : `since ${formatDate(fu)}`}
                        </span>
                      )}
                      {s === 'interview' && role.interview_at && (
                        <span className="text-[12px] font-semibold text-[#1F4E79]">Interview {formatDate(role.interview_at)}</span>
                      )}
                      {isAnalyzed(role) && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2F6B42]">
                          <Sparkles className="w-3 h-3" /> Prep plan ready
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                <ChevronRight className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9A9086] pointer-events-none" aria-hidden="true" />
                <div className="border-t border-[#E6E0D7] px-3.5 sm:px-4 py-2 flex items-center gap-2">
                  <label htmlFor={`st-${role.id}`} className="text-[12px] text-[#6B6259]">Stage</label>
                  <select
                    id={`st-${role.id}`}
                    value={s}
                    onChange={(e) => changeStatus(role, e.target.value as ApplicationStatus)}
                    className="h-9 pl-2.5 pr-7 rounded-lg bg-white border border-[#E6E0D7] text-[13px] font-semibold text-[#1A1714] outline-none focus:border-[#1A1714]"
                  >
                    {APPLICATION_STATUSES.map((st) => (
                      <option key={st} value={st}>{STATUS_META[st].label}</option>
                    ))}
                  </select>
                  {role.contact_email && (
                    <span className="hidden sm:inline ml-auto text-[12px] text-[#9A9086] truncate max-w-[35%]">{role.contact_email}</span>
                  )}
                  {confirmDeleteId === role.id ? (
                    <div className={`flex items-center gap-1.5 ${role.contact_email ? 'sm:ml-3' : ''} ml-auto`} role="group" aria-label={`Confirm deleting ${role.title}`}>
                      <span className="hidden sm:inline text-[12px] text-[#6B6259]">Delete this job?</span>
                      <button
                        type="button"
                        onClick={() => deleteJob(role)}
                        disabled={deletingId === role.id}
                        className="h-9 px-3 rounded-lg bg-[#B84F3D] text-white text-[13px] font-semibold disabled:opacity-60"
                      >
                        {deletingId === role.id ? 'Deleting…' : 'Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="h-9 px-3 rounded-lg border border-[#E6E0D7] bg-white text-[13px] font-semibold text-[#1A1714]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(role.id)}
                      aria-label={`Delete ${role.title} at ${role.company}`}
                      className={`${role.contact_email ? 'sm:ml-3' : ''} ml-auto h-9 px-2.5 inline-flex items-center gap-1.5 rounded-lg text-[13px] font-semibold text-[#6B6259] hover:text-[#B84F3D] hover:bg-[#FFF0ED] transition-colors`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Mobile floating action */}
      <Link
        href="/jobs/new"
        aria-label="Add a job"
        className="lg:hidden fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-40 w-14 h-14 rounded-2xl bg-[#1A1714] text-white shadow-[0_10px_24px_rgba(26,23,20,0.28)] flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </Link>

      <QuickAddSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onAdded={(role) => {
          setRoles((rs) => [role, ...rs]);
          setFilter('all');
          setToast({ text: `${role.company} added to your tracker.`, type: 'success' });
        }}
      />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed left-4 right-4 sm:left-auto sm:right-6 bottom-[calc(84px+env(safe-area-inset-bottom))] lg:bottom-6 z-[70] sm:max-w-sm px-4 py-3 rounded-xl border bg-white shadow-lg text-sm font-medium flex items-center gap-2.5 ${toast.type === 'success' ? 'border-[#DDEEDF] text-[#2F6B42]' : 'border-[#FECDCA] text-[#A94B3F]'}`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
