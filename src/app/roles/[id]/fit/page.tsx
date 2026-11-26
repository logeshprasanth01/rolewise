'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  FileCheck,
  ArrowLeftRight,
  Info,
  Loader2,
  Award,
  PenLine,
  FilePlus2,
  ScanSearch,
  ClipboardCheck,
  Check,
  Plus,
  ArrowUpRight,
} from 'lucide-react';
import { getRoleFit, invokeAnalyzeRole, getSupabaseClient } from '@/services/api';
import { ProcessingDialog } from '@/components/ui/ProcessingDialog';
import { computeFitScore, fitBand } from '@/lib/fit-score';
import { FitAnalysis, Role, RoleRequirement } from '@/types/database';
import { keywordReport, resumeChecks, shortRequirement } from '@/lib/get-noticed';
import { companyApplyLink } from '@/lib/job-portals';

type StatusKey = 'strong' | 'transferable' | 'investigation' | 'not_demonstrated';


function statusKey(status: string): StatusKey {
  const s = status.toLowerCase();
  if (s.includes('strong')) return 'strong';
  if (s.includes('transferable')) return 'transferable';
  if (s.includes('investigation')) return 'investigation';
  return 'not_demonstrated';
}

export default function RoleFitPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params?.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [requirements, setRequirements] = useState<RoleRequirement[]>([]);
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysis[]>([]);
  const [resumeText, setResumeText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  // Re-analysis progress: 0 load resume, 1 read role, 2 connect requirements, 3 refresh fit, 4 done
  const [retryStep, setRetryStep] = useState(0);

  // Expanded card tracking
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Active status filter
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tab, setTab] = useState<'requirements' | 'improve' | 'jobs'>('requirements');

  useEffect(() => {
    async function loadData() {
      if (!roleId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await getRoleFit(roleId);
        setRole(data.role);
        setRequirements(data.requirements || []);
        setFitAnalysis(data.fitAnalysis || []);

        // Resume text powers the keyword and quick checks in "How to get noticed".
        if (data.role?.resume_id) {
          getSupabaseClient()
            .from('resumes')
            .select('resume_text')
            .eq('id', data.role.resume_id)
            .maybeSingle()
            .then(({ data: r }) => setResumeText((r?.resume_text as string) || ''), () => undefined);
        }

        // Expand first two by default
        if (data.fitAnalysis && data.fitAnalysis.length > 0) {
          const initialExpanded: Record<string, boolean> = {};
          data.fitAnalysis.slice(0, 1).forEach((f) => {
            initialExpanded[f.id] = true;
          });
          setExpandedIds(initialExpanded);
        }
      } catch (err) {
        console.error('Error loading role fit:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [roleId]);

  const handleTryAgain = async () => {
    if (!role || isRetrying) return;
    setIsRetrying(true);
    setRetryError(null);
    setRetryStep(0);
    let connectTimer: ReturnType<typeof setTimeout> | undefined;

    try {
      let resumeText = '';
      let resumeFileName = 'candidate_resume.pdf';

      if (role.resume_id) {
        const supabase = getSupabaseClient();
        const { data: resume } = await supabase
          .from('resumes')
          .select('resume_text, file_name')
          .eq('id', role.resume_id)
          .maybeSingle();

        if (resume?.resume_text) {
          resumeText = resume.resume_text;
          resumeFileName = resume.file_name || resumeFileName;
        }
      }

      if (!resumeText || resumeText.trim().length < 20) {
        throw new Error('No candidate resume text found for this role. Please re-upload your resume or submit experience details.');
      }

      setRetryStep(1);
      // The analysis is one server call; step 3 is shown once it has been running a moment.
      connectTimer = setTimeout(() => setRetryStep((v) => (v === 1 ? 2 : v)), 1500);
      await invokeAnalyzeRole({
        roleId: role.id,
        jobDescription: role.job_description || `${role.title} at ${role.company}`,
        resumeText: resumeText.trim(),
        resumeFileName,
        resumeMimeType: 'application/pdf',
        jobTitle: role.title,
        company: role.company,
        location: role.location || undefined,
        workModel: role.workplace_type || undefined,
      });

      clearTimeout(connectTimer);
      setRetryStep(3);

      // Reload fresh role fit
      const data = await getRoleFit(roleId);
      setRetryStep(4);
      // Let the bar land on 100% before revealing the results.
      await new Promise((r) => setTimeout(r, 650));
      setRole(data.role);
      setRequirements(data.requirements || []);
      setFitAnalysis(data.fitAnalysis || []);
    } catch (err: unknown) {
      clearTimeout(connectTimer);
      console.error('[RoleFit] Re-analysis failed:', err);
      setRetryError(err instanceof Error ? err.message : 'Role analysis could not be completed.');
    } finally {
      setIsRetrying(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-5" role="status" aria-live="polite">
        <div className="rw-processing-tile h-16 w-16 rounded-[18px] flex items-center justify-center" aria-hidden="true">
          <div className="flex flex-col gap-[5px]">
            {[30, 30, 22].map((w, i) => (
              <div key={i} className="flex items-center gap-[5px]">
                <span className="h-[5px] w-[5px] rounded-full bg-white" />
                <span className="h-[5px] rounded-full bg-white" style={{ width: w }} />
              </div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#1A1714]">Loading your role fit</p>
          <p className="mt-1 text-xs text-[#6B6259]">Fetching requirements and evidence from your resume</p>
        </div>
        <div className="rw-boot-track h-[3px] w-40 rounded-full bg-[#1A1714]/10" aria-hidden="true">
          <span />
        </div>
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
          <h2 className="text-lg font-semibold text-[#1A1714]">Role context not found</h2>
          <p className="text-xs text-[#6B6259]">Add a job description to build requirement-level role fit.</p>
        </div>
        <Link
          href="/jobs/new"
          className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFD84D] text-[#1A1714] text-xs font-semibold"
        >
          <span>Add a job</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  // Part 5: If role analysis has no requirements/fit items or failed, show required retry state
  if (fitAnalysis.length === 0) {
    return (
      <div className="rolewise-card p-8 max-w-lg mx-auto text-center space-y-4 my-12 animate-in fade-in">
        <div className="w-12 h-12 rounded-full bg-[#FFF0ED] text-[#D97968] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#1A1714]">Role analysis couldn&apos;t be completed.</h2>
          <p className="text-xs text-[#6B6259]">
            Your job and experience are saved. Try analyzing again.{retryError ? ` (${retryError})` : ''}
          </p>
        </div>

        <ProcessingDialog
          open={isRetrying}
          title="Analyzing your role fit"
          subtitle={`${role.title} · ${role.company}`}
          steps={[
            { label: 'Loading your saved resume' },
            { label: 'Understanding the role' },
            { label: 'Connecting requirements to your experience' },
            { label: 'Updating your role fit' },
          ]}
          activeStep={Math.min(retryStep, 3)}
          complete={retryStep >= 4}
        />
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleTryAgain}
            disabled={isRetrying}
            className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A1714] hover:bg-[#E7C43E] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            {isRetrying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing role...</span>
              </>
            ) : (
              <>
                <span>Try again</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Count distribution across the 4 PRD statuses
  const counts = {
    total: fitAnalysis.length,
    strong: fitAnalysis.filter((f) => f.status.toLowerCase().includes('strong')).length,
    transferable: fitAnalysis.filter((f) => f.status.toLowerCase().includes('transferable')).length,
    investigation: fitAnalysis.filter((f) => f.status.toLowerCase().includes('investigation')).length,
    notDemonstrated: fitAnalysis.filter((f) => f.status.toLowerCase().includes('not demonstrated')).length,
  };

  // Fit score: equal weight per requirement, partial credit for related experience.
  const fitScore = computeFitScore(fitAnalysis.map((f) => f.status));
  const fitBandInfo = fitBand(fitScore);
  const countFor = (k: StatusKey) =>
    k === 'strong' ? counts.strong : k === 'transferable' ? counts.transferable : k === 'investigation' ? counts.investigation : counts.notDemonstrated;

  // "How to get noticed": built from this job's fit results and the resume, nothing invented.
  const titlesFor = (keys: StatusKey[]) =>
    fitAnalysis.filter((f) => keys.includes(statusKey(f.status))).map((f) => shortRequirement(f.requirement_title || ''));
  const strongTitles = titlesFor(['strong']);
  const leadTitles = (strongTitles.length ? strongTitles : titlesFor(['transferable'])).slice(0, 3);
  const rewordItems = fitAnalysis.filter((f) => statusKey(f.status) === 'transferable').slice(0, 3);
  const gapItems = titlesFor(['investigation', 'not_demonstrated']).slice(0, 3);
  const keywords = keywordReport(role.job_description || '', resumeText);
  const keywordTotal = keywords.found.length + keywords.missing.length;
  const checks = resumeChecks(resumeText, role.title);
  const apply = companyApplyLink(role.company, role.title, role.job_url);

  // Filtered requirements
  const filteredAnalysis = fitAnalysis.filter((item) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'strong') return item.status.toLowerCase().includes('strong');
    if (statusFilter === 'transferable') return item.status.toLowerCase().includes('transferable');
    if (statusFilter === 'investigation') return item.status.toLowerCase().includes('investigation');
    if (statusFilter === 'not_demonstrated') return item.status.toLowerCase().includes('not demonstrated');
    return true;
  });

  const TABS = [
    { id: 'requirements', label: 'Requirements', short: 'Requirements', count: counts.total },
    { id: 'improve', label: 'Improve your resume', short: 'Improve', count: undefined as number | undefined },
    { id: 'jobs', label: 'Similar jobs', short: 'Jobs', count: undefined as number | undefined },
  ] as const;

  const STAT_TILES: { key: StatusKey; label: string; icon: React.ElementType; bg: string; fg: string }[] = [
    { key: 'strong', label: 'Strong match', icon: CheckCircle2, bg: '#EEF7F0', fg: '#3F7A52' },
    { key: 'transferable', label: 'Related experience', icon: ArrowLeftRight, bg: '#FFF4CC', fg: '#7A5B00' },
    { key: 'investigation', label: 'Needs evidence', icon: HelpCircle, bg: '#FFF2D2', fg: '#8A5A12' },
    { key: 'not_demonstrated', label: 'Not shown', icon: AlertCircle, bg: '#FFF0ED', fg: '#A4493A' },
  ];

  const RING = 2 * Math.PI * 46;

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6259] hover:text-[#1A1714] transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>My jobs</span>
      </Link>

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-[#6B6259]">
            {role.company}
            {role.location ? ` · ${role.location}` : ''}
            {role.workplace_type ? ` · ${role.workplace_type}` : ''}
          </p>
          <h1 className="mt-1 text-2xl sm:text-[30px] font-bold text-[#1A1714] tracking-[-0.02em] leading-tight">{role.title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={apply.href}
            target="_blank"
            rel="noopener noreferrer"
            title={apply.label}
            className="touch-target inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#1A1714] text-[#1A1714] text-sm font-semibold transition-colors"
          >
            {apply.isDirect ? 'Apply' : 'Find to apply'}
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <Link
            href={`/roles/${role.id}/preparation`}
            className="touch-target inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#1A1714] hover:bg-[#3B342D] text-white text-sm font-semibold transition-colors"
          >
            Prepare for this role <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* SCORE AT A GLANCE */}
      <section aria-labelledby="fit-score-heading" className="rolewise-card p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Gauge */}
          <div className="flex items-center gap-5 md:pr-6 md:border-r md:border-[#E6E0D7]">
            <div className="relative w-[124px] h-[124px] shrink-0" role="img" aria-label={`Fit score ${fitScore}%, ${fitBandInfo.label}`}>
              <svg viewBox="0 0 108 108" className="w-full h-full -rotate-90">
                <circle cx="54" cy="54" r="46" fill="none" stroke="#F3EFE9" strokeWidth="10" />
                <circle
                  cx="54"
                  cy="54"
                  r="46"
                  fill="none"
                  stroke={fitBandInfo.fg}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={RING}
                  strokeDashoffset={RING * (1 - fitScore / 100)}
                  className="transition-[stroke-dashoffset] duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[34px] font-bold leading-none tracking-[-0.03em] text-[#1A1714] tabular-nums">
                  {fitScore}
                  <span className="text-base font-semibold text-[#6B6259]">%</span>
                </span>
              </div>
            </div>
            <div className="min-w-0">
              <p id="fit-score-heading" className="text-xs font-medium text-[#6B6259]">Your fit</p>
              <span className="mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: fitBandInfo.bg, color: fitBandInfo.fg }}>
                {fitBandInfo.label}
              </span>
              <p className="mt-2 text-[13px] text-[#1A1714] leading-snug">
                <strong className="tabular-nums">{counts.strong + counts.transferable}</strong> of <strong className="tabular-nums">{counts.total}</strong> requirements covered
              </p>
              <details className="group mt-1.5 text-[11px] text-[#6B6259]">
                <summary className="cursor-pointer list-none inline-flex items-center gap-1 font-medium hover:text-[#1A1714]">
                  <Info className="w-3 h-3" /> How it’s scored
                </summary>
                <p className="mt-1.5 max-w-[240px] leading-relaxed">
                  Each requirement counts equally: Strong 100%, Related 60%, Needs evidence 30%, Not shown 0%. It reflects your resume, not your ability.
                </p>
              </details>
            </div>
          </div>

          {/* Stat tiles = filters */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2.5" role="group" aria-label="Filter requirements by status">
            {STAT_TILES.map(({ key, label, icon: Icon, bg, fg }) => {
              const n = countFor(key);
              const active = statusFilter === key;
              return (
                <button
                  key={key}
                  type="button"
                  disabled={n === 0}
                  aria-pressed={active}
                  onClick={() => {
                    setStatusFilter(active ? 'all' : key);
                    setTab('requirements');
                  }}
                  className={`text-left rounded-2xl p-3.5 border transition-all cursor-pointer disabled:cursor-default ${
                    active ? 'border-[#1A1714] bg-white shadow-[0_2px_10px_rgba(26,23,20,0.08)]' : 'border-transparent hover:border-[#E6E0D7]'
                  } ${n === 0 ? 'opacity-55' : ''}`}
                  style={{ background: active ? undefined : bg }}
                >
                  <Icon className="w-4 h-4" style={{ color: fg }} aria-hidden="true" />
                  <p className="mt-2 text-2xl font-bold text-[#1A1714] tabular-nums leading-none">{n}</p>
                  <p className="mt-1 text-[11px] font-semibold" style={{ color: fg }}>{label}</p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* TABS */}
      <div role="tablist" aria-label="Role fit sections" className="flex gap-1 p-1 rounded-2xl bg-[#F3EFE9] w-full sm:w-fit overflow-x-auto">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={active}
              aria-controls={`panel-${t.id}`}
              onClick={() => setTab(t.id)}
              className={`flex-1 sm:flex-none shrink-0 h-10 px-3 sm:px-4 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                active ? 'bg-white text-[#1A1714] shadow-[0_1px_3px_rgba(26,23,20,0.12)]' : 'text-[#6B6259] hover:text-[#1A1714]'
              }`}
            >
              <span className="sm:hidden">{t.short}</span>
              <span className="hidden sm:inline">{t.label}</span>
              {typeof t.count === 'number' && <span className="text-xs font-normal text-[#9A9086] tabular-nums">{t.count}</span>}
            </button>
          );
        })}
      </div>

      {/* TAB: REQUIREMENTS */}
      {tab === 'requirements' && (
        <section id="panel-requirements" role="tabpanel" aria-labelledby="tab-requirements" className="space-y-2.5">
          {statusFilter !== 'all' && (
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-[#1A1714]">
                {STAT_TILES.find((t) => t.key === statusFilter)?.label} <span className="font-normal text-[#9A9086]">{filteredAnalysis.length}</span>
              </p>
              <button type="button" onClick={() => setStatusFilter('all')} className="text-xs font-semibold text-[#574F46] hover:text-[#1A1714] cursor-pointer">
                Show all
              </button>
            </div>
          )}
          {filteredAnalysis.map((item) => {
            const isExpanded = expandedIds[item.id];
            const meta = STAT_TILES.find((t) => t.key === statusKey(item.status))!;
            const Icon = meta.icon;
            return (
              <div key={item.id} className="rolewise-card overflow-hidden hover:border-[#DDD5CA] transition-colors">
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  aria-expanded={isExpanded}
                  className="w-full px-4 sm:px-5 py-3.5 flex items-center gap-3.5 text-left cursor-pointer"
                >
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: meta.bg }} title={meta.label}>
                    <Icon className="w-4 h-4" style={{ color: meta.fg }} aria-hidden="true" />
                    <span className="sr-only">{meta.label}:</span>
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-[#1A1714] leading-snug">{item.requirement_title || 'Core competency'}</span>
                    <span className="block text-[11px] font-semibold mt-0.5" style={{ color: meta.fg }}>{meta.label}</span>
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#9A9086] shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-4 pl-[62px] sm:pl-[70px] space-y-3 animate-in fade-in">
                    <p className="text-[13px] text-[#574F46] leading-relaxed">{item.explanation}</p>
                    {item.evidence && (
                      <blockquote className="flex gap-2 rounded-xl bg-[#FAF8F4] border border-[#E6E0D7] px-3.5 py-2.5">
                        <FileCheck className="w-3.5 h-3.5 text-[#6B6259] shrink-0 mt-0.5" aria-hidden="true" />
                        <p className="text-xs text-[#1A1714] leading-relaxed">
                          <span className="sr-only">From your resume: </span>“{item.evidence}”
                        </p>
                      </blockquote>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* TAB: IMPROVE YOUR RESUME */}
      {tab === 'improve' && (
        <section id="panel-improve" role="tabpanel" aria-labelledby="tab-improve" className="space-y-3">
          <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: Award, title: 'Lead with these', hint: 'Put them first in your summary.', items: leadTitles, tone: STAT_TILES[0], empty: 'No direct matches yet.' },
              { icon: PenLine, title: 'Reword these', hint: 'Use the job’s exact words.', items: rewordItems.map((f) => shortRequirement(f.requirement_title || '')), tone: STAT_TILES[1], empty: 'Nothing to reword.' },
              { icon: FilePlus2, title: 'Add proof for these', hint: 'A bullet, project or link.', items: gapItems, tone: STAT_TILES[3], empty: 'No gaps found.' },
            ].map(({ icon: Icon, title, hint, items, tone, empty }, i) => (
              <li key={title} className="rolewise-card p-4 sm:p-5 flex flex-col">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: tone.bg }} aria-hidden="true">
                    <Icon className="w-[18px] h-[18px]" style={{ color: tone.fg }} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold tracking-[0.1em] uppercase text-[#9A9086]">Step {i + 1}</p>
                    <h3 className="text-sm font-bold text-[#1A1714] leading-tight">{title}</h3>
                  </div>
                  {items.length > 0 && <span className="text-lg font-bold text-[#1A1714] tabular-nums">{items.length}</span>}
                </div>
                <p className="mt-2 text-xs text-[#6B6259]">{hint}</p>
                {items.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {items.map((t) => (
                      <li key={t} className="flex gap-2 text-xs text-[#1A1714] leading-snug">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: tone.fg }} aria-hidden="true" />
                        {t}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-[#3F7A52] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {empty}
                  </p>
                )}
              </li>
            ))}
          </ol>

          {(keywordTotal > 0 || checks.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {keywordTotal > 0 && (
                <div className="rolewise-card p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#F3EFE9] flex items-center justify-center shrink-0" aria-hidden="true">
                      <ScanSearch className="w-[18px] h-[18px] text-[#1A1714]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-[#1A1714]">Job keywords</h3>
                      <p className="text-[11px] text-[#6B6259]">Screening tools look for these.</p>
                    </div>
                    {resumeText && (
                      <p className="text-right">
                        <span className="text-lg font-bold text-[#1A1714] tabular-nums">{keywords.found.length}</span>
                        <span className="text-xs text-[#9A9086] tabular-nums">/{keywordTotal}</span>
                      </p>
                    )}
                  </div>
                  {resumeText && (
                    <div className="mt-3 h-2 rounded-full bg-[#F3EFE9] overflow-hidden" role="img" aria-label={`${keywords.found.length} of ${keywordTotal} keywords in your resume`}>
                      <div className="h-full rounded-full bg-[#6FA77F]" style={{ width: `${(keywords.found.length / keywordTotal) * 100}%` }} />
                    </div>
                  )}
                  <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Keywords">
                    {keywords.found.map((k) => (
                      <li key={k} className="inline-flex items-center gap-1 rounded-full bg-[#EEF7F0] text-[#2F6B42] px-2.5 py-1 text-[11px] font-semibold">
                        <Check className="w-3 h-3" aria-hidden="true" />
                        {k}
                        <span className="sr-only">(in your resume)</span>
                      </li>
                    ))}
                    {keywords.missing.map((k) => (
                      <li key={k} className="inline-flex items-center gap-1 rounded-full border border-dashed border-[#D9A35B] text-[#8A5A12] px-2.5 py-1 text-[11px] font-semibold">
                        <Plus className="w-3 h-3" aria-hidden="true" />
                        {k}
                        <span className="sr-only">(missing, add if true)</span>
                      </li>
                    ))}
                  </ul>
                  {keywords.missing.length > 0 && <p className="mt-2.5 text-[11px] text-[#6B6259]">Add missing ones only if they’re true for you.</p>}
                </div>
              )}

              {checks.length > 0 && (
                <div className="rolewise-card p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#F3EFE9] flex items-center justify-center shrink-0" aria-hidden="true">
                      <ClipboardCheck className="w-[18px] h-[18px] text-[#1A1714]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-[#1A1714]">Resume check</h3>
                      <p className="text-[11px] text-[#6B6259]">What recruiters notice first.</p>
                    </div>
                    <p className="text-right">
                      <span className="text-lg font-bold text-[#1A1714] tabular-nums">{checks.filter((c) => c.ok).length}</span>
                      <span className="text-xs text-[#9A9086] tabular-nums">/{checks.length}</span>
                    </p>
                  </div>
                  <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {checks.map((c) => (
                      <li key={c.id} className={`rounded-xl px-3 py-2.5 ${c.ok ? 'bg-[#F4FAF5]' : 'bg-[#FFF8EC]'}`}>
                        <p className="flex items-start gap-1.5 text-xs font-semibold text-[#1A1714] leading-snug">
                          {c.ok ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#5E9A6E] shrink-0 mt-px" aria-label="Good" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-[#C58A2B] shrink-0 mt-px" aria-label="Fix" />
                          )}
                          {c.title}
                        </p>
                        {!c.ok && <p className="mt-1 pl-5 text-[11px] text-[#6B6259] leading-snug">{c.detail}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* TAB: SIMILAR JOBS */}
      {tab === 'jobs' && (
        <section id="panel-jobs" role="tabpanel" aria-labelledby="tab-jobs">
          <SimilarJobs query={role.title} />
        </section>
      )}

      {/* NEXT STEP */}
      <div className="rounded-[22px] bg-[#1A1714] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold">Turn this into a prep plan</h2>
          <p className="text-xs text-white/65 mt-0.5">Practice the gaps before your interview.</p>
        </div>
        <Link
          href={`/roles/${role.id}/preparation`}
          className="touch-target inline-flex items-center justify-center gap-2 h-11 px-5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#1A1714] text-sm font-bold transition-colors"
        >
          Prepare for this role <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

/** Six live openings like this role, linking to the in-app job page. */
function SimilarJobs({ query }: { query: string }) {
  const [jobs, setJobs] = useState<{ id: string; title: string; company: string; logo: string | null; location: string; postedAt: string | null }[] | null>(null);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/jobs?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setJobs((d.jobs || []).slice(0, 6));
        setTotal(d.total || 0);
      })
      .catch(() => !cancelled && setJobs([]));
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (jobs === null) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 animate-pulse" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rolewise-card h-[72px]" />
        ))}
      </div>
    );
  }
  if (jobs.length === 0) {
    return <p className="rolewise-card p-5 text-sm text-[#6B6259]">No similar openings right now. Openings update every hour.</p>;
  }
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {jobs.map((j) => (
          <li key={j.id}>
            <Link
              href={`/find-jobs/job?id=${encodeURIComponent(j.id)}&q=${encodeURIComponent(query)}`}
              className="rolewise-card flex items-center gap-3 px-4 py-3 hover:border-[#CFC7BC] hover:shadow-[0_4px_14px_rgba(26,23,20,0.06)] transition-[border-color,box-shadow] group"
            >
              <span className="w-10 h-10 rounded-xl border border-[#E6E0D7] bg-[#FFF4CC] flex items-center justify-center overflow-hidden shrink-0 text-sm font-bold text-[#1A1714]" aria-hidden="true">
                {j.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={j.logo} alt="" className="w-full h-full object-contain bg-white" loading="lazy" />
                ) : (
                  j.company.charAt(0).toUpperCase()
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#1A1714] truncate">{j.title}</span>
                <span className="block text-[11px] text-[#6B6259] truncate">
                  {j.company} · {j.location}
                </span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-[#9A9086] group-hover:text-[#1A1714] shrink-0" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <Link href={`/find-jobs?q=${encodeURIComponent(query)}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A1714] hover:underline underline-offset-2">
        See all {total.toLocaleString('en-IN')} openings <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
