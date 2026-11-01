'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import type { ApplicationStatus, Role } from '@/types/database';
import { quickAddJob } from '@/services/api';
import { SOURCES, STATUS_META, todayISO } from '@/lib/tracker';

const QUICK_STATUSES: ApplicationStatus[] = ['saved', 'applied', 'screening', 'interview'];

interface QuickAddSheetProps {
  open: boolean;
  onClose: () => void;
  onAdded: (role: Role) => void;
}

/** Bottom sheet on phones, centered dialog on larger screens. Logs an application in a few seconds. */
export function QuickAddSheet({ open, onClose, onAdded }: QuickAddSheetProps) {
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [status, setStatus] = useState<ApplicationStatus>('applied');
  const [appliedAt, setAppliedAt] = useState(todayISO());
  const [source, setSource] = useState('LinkedIn');
  const [contact, setContact] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => titleRef.current?.focus(), 120);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !isSaving && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, isSaving, onClose]);

  const reset = () => {
    setJobTitle('');
    setCompany('');
    setStatus('applied');
    setAppliedAt(todayISO());
    setContact('');
    setJobUrl('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobTitle.trim() || !company.trim()) {
      setError('Add the role and the company.');
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const role = await quickAddJob({
        job_title: jobTitle,
        company,
        application_status: status,
        applied_at: status === 'saved' ? null : appliedAt,
        source,
        contact_email: contact,
        job_url: jobUrl,
      });
      onAdded(role);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "This job couldn't be saved.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  const field = 'w-full h-12 px-3.5 rounded-xl bg-white border border-[#D9D8D2] text-[15px] text-[#252525] placeholder:text-[#9A9B9E] outline-none focus:border-[#252525] transition-colors';
  const label = 'text-xs font-semibold text-[#4A4B4F]';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="quick-add-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-[#252525]/35 backdrop-blur-[2px]" onClick={() => !isSaving && onClose()} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-[#FAF9F4] rounded-t-[26px] sm:rounded-[26px] border border-[#D9D8D2] shadow-[0_-12px_40px_rgba(37,37,37,0.18)] px-5 pt-3 pb-[max(20px,env(safe-area-inset-bottom))] sm:p-6 animate-rw-pop"
      >
        <div className="sm:hidden mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#D9D8D2]" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="quick-add-title" className="text-lg font-bold text-[#252525] tracking-tight">Log an application</h2>
            <p className="text-[13px] text-[#73757A]">Takes 10 seconds. Run the AI fit analysis later from the job page.</p>
          </div>
          <button type="button" onClick={() => { setError(null); onClose(); }} aria-label="Close" className="touch-target w-10 h-10 rounded-full border border-[#D9D8D2] flex items-center justify-center text-[#73757A] hover:text-[#252525] shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="qa-title" className={label}>Role</label>
            <input id="qa-title" ref={titleRef} className={field} placeholder="Senior UI/UX Designer" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} autoComplete="off" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="qa-company" className={label}>Company</label>
            <input id="qa-company" className={field} placeholder="Appsrow" value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
          </div>

          <fieldset className="space-y-1.5">
            <legend className={label}>Where is it at?</legend>
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl bg-[#EFEEE8]">
              {QUICK_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  aria-pressed={status === s}
                  className={`h-10 rounded-xl text-[13px] font-semibold transition-all ${status === s ? 'bg-white text-[#252525] shadow-[0_2px_8px_rgba(37,37,37,0.10)]' : 'text-[#73757A]'}`}
                >
                  {STATUS_META[s].label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            {status !== 'saved' && (
              <div className="space-y-1.5">
                <label htmlFor="qa-date" className={label}>Applied on</label>
                <input id="qa-date" type="date" className={field} value={appliedAt} max={todayISO()} onChange={(e) => setAppliedAt(e.target.value)} />
              </div>
            )}
            <div className={`space-y-1.5 ${status === 'saved' ? 'col-span-2' : ''}`}>
              <label htmlFor="qa-source" className={label}>Found via</label>
              <select id="qa-source" className={field} value={source} onChange={(e) => setSource(e.target.value)}>
                {SOURCES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <details className="group rounded-2xl border border-[#D9D8D2] bg-white">
            <summary className="list-none cursor-pointer px-4 h-12 flex items-center justify-between text-[13px] font-semibold text-[#4A4B4F]">
              Contact and job link <span className="text-[#9A9B9E] font-medium">optional</span>
            </summary>
            <div className="px-4 pb-4 space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="qa-contact" className={label}>Recruiter email</label>
                <input id="qa-contact" type="email" inputMode="email" className={field} placeholder="hr@company.com" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="qa-url" className={label}>Job post link</label>
                <input id="qa-url" type="url" inputMode="url" className={field} placeholder="https://" value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} />
              </div>
            </div>
          </details>

          {error && <p className="text-[13px] font-medium text-[#A94B3F]" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={isSaving}
            data-ui-sound="success"
            className="w-full h-12 rounded-2xl bg-[#252525] text-white text-[15px] font-semibold flex items-center justify-center gap-2 hover:bg-[#3A3A3A] disabled:opacity-60 transition-colors"
          >
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Add to tracker'}
          </button>
        </div>
      </form>
    </div>
  );
}
