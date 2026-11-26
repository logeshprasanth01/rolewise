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
  ChevronUp,
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
import { JobOpenings } from '@/components/jobs/JobOpenings';

type StatusKey = 'strong' | 'transferable' | 'investigation' | 'not_demonstrated';

const STATUS_META: Record<StatusKey, { label: string; color: string }> = {
  strong: { label: 'Strong', color: '#5E9A6E' },
  transferable: { label: 'Transferable', color: '#E8C23A' },
  investigation: { label: 'Needs more evidence', color: '#D9A35B' },
  not_demonstrated: { label: 'Not shown', color: '#D97968' },
};

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
  const STATUS_ORDER: StatusKey[] = ['strong', 'transferable', 'investigation', 'not_demonstrated'];
  const sortedForBar = [...fitAnalysis].sort(
    (x, y) => STATUS_ORDER.indexOf(statusKey(x.status)) - STATUS_ORDER.indexOf(statusKey(y.status))
  );
  const gapTitles = sortedForBar
    .filter((f) => statusKey(f.status) !== 'strong' && statusKey(f.status) !== 'transferable')
    .slice(0, 2)
    .map((f) => (f.requirement_title || 'this requirement').replace(/\.$/, ''));
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

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s.includes('strong')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EEF7F0] text-[#6FA77F] text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Strong</span>
        </span>
      );
    }
    if (s.includes('transferable')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFE58A] text-[#1A1714] text-xs font-semibold">
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Transferable</span>
        </span>
      );
    }
    if (s.includes('investigation')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFF2D2] text-[#C58A2B] text-xs font-semibold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Needs more evidence</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFF0ED] text-[#D97968] text-xs font-semibold">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Not shown</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Back Breadcrumb */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B6259] hover:text-[#1A1714] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Jobs</span>
      </Link>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <p className="text-xs text-[#6B6259]">
            {role.company}
            {role.location ? ` · ${role.location}` : ''}
            {role.workplace_type ? ` · ${role.workplace_type}` : ''}
          </p>
          <h1 className="text-2xl sm:text-[32px] font-bold text-[#1A1714] tracking-[-0.02em] leading-tight">
            {role.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href={apply.href}
            target="_blank"
            rel="noopener noreferrer"
            title={apply.label}
            className="touch-target inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E6E0D7] bg-white hover:border-[#1A1714] text-[#1A1714] text-xs sm:text-sm font-semibold transition-colors"
          >
            <span>{apply.isDirect ? 'Apply for this job' : 'Find this job to apply'}</span>
            <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
          <Link
            href={`/roles/${role.id}/preparation`}
            className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A1714] hover:bg-[#3B342D] text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            <span>Prepare for this role</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* FIT SCORE */}
      <section aria-labelledby="fit-score-heading" className="rounded-[24px] bg-white border border-[#E6E0D7] p-5 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10">
          <div className="shrink-0">
            <p id="fit-score-heading" className="text-xs font-medium text-[#6B6259]">Your fit for this role</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-[56px] sm:text-[64px] font-bold leading-none tracking-[-0.04em] text-[#1A1714] tabular-nums">
                {fitScore}
              </span>
              <span className="text-2xl font-semibold text-[#6B6259]">%</span>
            </div>
            <span
              className="mt-3 inline-block rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{ background: fitBandInfo.bg, color: fitBandInfo.fg }}
            >
              {fitBandInfo.label}
            </span>
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <p className="text-sm sm:text-[15px] text-[#1A1714] leading-relaxed">
              Your resume backs <strong>{counts.strong} of {counts.total}</strong> requirements directly
              {counts.transferable > 0 && <> and <strong>{counts.transferable}</strong> through related experience</>}.
              {gapTitles.length > 0 ? (
                <>
                  {' '}To close the gap, prepare examples for{' '}
                  {gapTitles.map((t, i) => (
                    <React.Fragment key={t}>
                      {i > 0 && ' and '}
                      <strong>{t}</strong>
                    </React.Fragment>
                  ))}
                  .
                </>
              ) : (
                <> No gaps found in what you shared.</>
              )}
            </p>

            {/* One segment per requirement, coloured by status */}
            <div>
              <div className="flex h-3 w-full gap-[3px]" role="img" aria-label={`${counts.strong} strong, ${counts.transferable} transferable, ${counts.investigation} need more evidence, ${counts.notDemonstrated} not shown`}>
                {sortedForBar.map((item) => (
                  <span
                    key={item.id}
                    title={item.requirement_title || ''}
                    className="h-full flex-1 first:rounded-l-full last:rounded-r-full transition-opacity"
                    style={{
                      background: STATUS_META[statusKey(item.status)].color,
                      opacity: statusFilter === 'all' || statusFilter === statusKey(item.status) ? 1 : 0.25,
                    }}
                  />
                ))}
              </div>

              {/* Legend doubles as the filter */}
              <div className="mt-3 flex flex-wrap gap-x-1 gap-y-1" role="group" aria-label="Filter requirements">
                {(['strong', 'transferable', 'investigation', 'not_demonstrated'] as const).map((key) => {
                  const n = countFor(key);
                  const active = statusFilter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={n === 0}
                      aria-pressed={active}
                      onClick={() => setStatusFilter(active ? 'all' : key)}
                      className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors disabled:opacity-40 disabled:cursor-default cursor-pointer ${
                        active ? 'bg-[#FAF8F4] text-[#1A1714] font-semibold' : 'text-[#574F46] hover:bg-[#FAF8F5]'
                      }`}
                    >
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: STATUS_META[key].color }} />
                      <span>{STATUS_META[key].label}</span>
                      <span className="tabular-nums text-[#9A9086]">{n}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <details className="group text-xs text-[#6B6259]">
              <summary className="cursor-pointer list-none inline-flex items-center gap-1 font-medium text-[#574F46] hover:text-[#1A1714]">
                <Info className="w-3.5 h-3.5" />
                How this score is calculated
                <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-2 max-w-xl leading-relaxed space-y-1.5">
                <p>
                  Each requirement in the job description counts equally. Strong = 100%, Transferable = 60%,
                  Needs more evidence = 30%, Not shown = 0%. The score is the average.
                </p>
                <p>
                  It measures what your resume shows, not what you can do. &ldquo;Not shown&rdquo; only means
                  we couldn&apos;t find it in what you uploaded &mdash; adding it can raise your score.
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>


      {/* HOW TO GET NOTICED */}
      <section aria-labelledby="get-noticed-heading" className="space-y-4">
        <div>
          <h2 id="get-noticed-heading" className="text-lg sm:text-xl font-bold text-[#1A1714] tracking-[-0.01em]">
            How to get noticed for this role
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#6B6259] max-w-2xl">
            Recruiters skim a resume before they read it. Do these before you apply. Each one comes from this job and your resume.
          </p>
        </div>

        <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              icon: Award,
              title: 'Lead with your proof',
              why: strongTitles.length
                ? 'These match the job directly. Put them in your resume summary and the first lines of your cover note.'
                : 'Nothing matches directly yet, so open with your closest related experience.',
              items: leadTitles,
              empty: 'Add the job description again to see your strongest matches.',
            },
            {
              icon: PenLine,
              title: 'Say it in their words',
              why: 'You have related experience. Rewrite these bullets using the job’s own wording so the link is obvious.',
              items: rewordItems.map((f) => shortRequirement(f.requirement_title || '')),
              empty: 'Nothing to reword. Your matches already use the job’s language.',
            },
            {
              icon: FilePlus2,
              title: 'Fill the gaps',
              why: 'Not visible in your resume. If you have done it, add a bullet, project or portfolio link. If not, prepare how you would learn it.',
              items: gapItems,
              empty: 'No gaps found in what you shared.',
            },
          ].map(({ icon: Icon, title, why, items, empty }, i) => (
            <li key={title} className="rounded-[20px] bg-white border border-[#E6E0D7] p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-xl bg-[#FFF4CC] text-[#1A1714] flex items-center justify-center shrink-0" aria-hidden="true">
                  <Icon className="w-[18px] h-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#9A9086]">Step {i + 1}</p>
                  <h3 className="text-sm font-bold text-[#1A1714] leading-tight">{title}</h3>
                </div>
              </div>
              <p className="text-xs text-[#574F46] leading-relaxed">{why}</p>
              {items.length > 0 ? (
                <ul className="space-y-1.5">
                  {items.map((t) => (
                    <li key={t} className="text-xs text-[#1A1714] leading-snug rounded-lg bg-[#FAF8F4] px-2.5 py-2">
                      {t}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-[#2F6B42] mt-auto flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {empty}
                </p>
              )}
            </li>
          ))}
        </ol>

        {(keywordTotal > 0 || checks.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {keywordTotal > 0 && (
              <div className="rounded-[20px] bg-white border border-[#E6E0D7] p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-[#FAF8F4] text-[#1A1714] flex items-center justify-center shrink-0" aria-hidden="true">
                      <ScanSearch className="w-[18px] h-[18px]" />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-[#1A1714]">Keywords from this job</h3>
                      <p className="text-[11px] text-[#6B6259]">Many companies filter resumes by these words first.</p>
                    </div>
                  </div>
                  {resumeText && (
                    <span className="shrink-0 text-xs font-semibold text-[#1A1714] tabular-nums">
                      {keywords.found.length} of {keywordTotal}
                    </span>
                  )}
                </div>
                {resumeText ? (
                  <>
                    <ul className="flex flex-wrap gap-1.5" aria-label="Keywords in your resume and missing from it">
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
                          <span className="sr-only">(missing from your resume)</span>
                        </li>
                      ))}
                    </ul>
                    {keywords.missing.length > 0 && (
                      <p className="text-[11px] text-[#6B6259]">Add the dashed ones to your resume only where they are true for you.</p>
                    )}
                  </>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {[...keywords.found, ...keywords.missing].map((k) => (
                      <li key={k} className="rounded-full bg-[#FAF8F4] border border-[#E6E0D7] text-[#574F46] px-2.5 py-1 text-[11px] font-semibold">{k}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {checks.length > 0 && (
              <div className="rounded-[20px] bg-white border border-[#E6E0D7] p-5 space-y-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-9 h-9 rounded-xl bg-[#FAF8F4] text-[#1A1714] flex items-center justify-center shrink-0" aria-hidden="true">
                    <ClipboardCheck className="w-[18px] h-[18px]" />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1714]">Resume quick check</h3>
                    <p className="text-[11px] text-[#6B6259]">What a recruiter notices in the first skim.</p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {checks.map((c) => (
                    <li key={c.id} className="flex items-start gap-2.5">
                      {c.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-[#5E9A6E] shrink-0 mt-0.5" aria-label="Looks good" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-[#D9A35B] shrink-0 mt-0.5" aria-label="Fix this" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#1A1714]">{c.title}</p>
                        <p className="text-[11px] text-[#6B6259] leading-relaxed">{c.detail}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      {/* LIST HEADER */}
      <div className="flex items-center justify-between pt-2">
        <h2 className="text-sm font-semibold text-[#1A1714]">
          {statusFilter === 'all' ? 'All requirements' : STATUS_META[statusFilter as StatusKey].label}
          <span className="ml-1.5 font-normal text-[#9A9086]">{filteredAnalysis.length}</span>
        </h2>
        {statusFilter !== 'all' && (
          <button type="button" onClick={() => setStatusFilter('all')} className="text-xs font-medium text-[#574F46] hover:text-[#1A1714] cursor-pointer">
            Show all
          </button>
        )}
      </div>

      {/* EXPANDABLE REQUIREMENT CARDS (PRD Requirement 4) */}
      <div className="space-y-3.5">
        {filteredAnalysis.map((item) => {
          const isExpanded = expandedIds[item.id];
          return (
            <div
              key={item.id}
              className="rolewise-card overflow-hidden transition-all hover:border-[#DDD5CA]"
            >
              {/* Card Header / Summary Clickable */}
              <div
                onClick={() => toggleExpand(item.id)}
                className="p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-[#FFFFFF]/50 transition-colors"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(item.status)}
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#1A1714] leading-snug">
                    {item.requirement_title || 'Core Competency'}
                  </h3>
                </div>

                <div className="shrink-0 flex items-center gap-2 text-xs font-medium text-[#6B6259]">
                  <span className="hidden sm:inline">{isExpanded ? 'Hide evidence' : 'View evidence'}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#6B6259]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#6B6259]" />
                  )}
                </div>
              </div>

              {/* Expandable Content (Explanation + Evidence) */}
              {isExpanded && (
                <div className="p-5 pt-0 border-t border-[#E6E0D7] bg-[#FAF8F4]/40 space-y-4 animate-in fade-in">
                  {/* Qualitative Explanation */}
                  <div className="space-y-1 pt-3">
                    <p className="text-xs font-semibold text-[#1A1714]">Why</p>
                    <p className="text-xs sm:text-sm text-[#574F46] leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>

                  {/* Concrete Candidate Evidence Quote */}
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-white border border-[#E6E0D7]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1714]">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>From your resume</span>
                    </div>
                    <p className="text-xs text-[#1A1714] leading-relaxed font-sans italic">
                      &ldquo;{item.evidence || 'No direct evidence provided in candidate resume.'}&rdquo;
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* JOBS TO APPLY FOR */}
      <div className="pt-4">
        <JobOpenings
          defaultQuery={role.title}
          title="Jobs to apply for"
        />
      </div>

      {/* BOTTOM CTA BAR */}
      <div className="rolewise-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1A1714]">Ready to turn findings into preparation?</h3>
          <p className="text-xs text-[#6B6259]">
            Target areas needing investigation or practice before your interview.
          </p>
        </div>

        <Link
          href={`/roles/${role.id}/preparation`}
          className="touch-target inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#1A1714] hover:bg-[#E7C43E] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
        >
          <span>Prepare for this role</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
