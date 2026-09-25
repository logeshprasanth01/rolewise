'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Search,
  Sparkles,
  Info,
  Loader2,
} from 'lucide-react';
import { getRoleFit, invokeAnalyzeRole, getSupabaseClient } from '@/services/api';
import { FitAnalysis, Role, RoleRequirement } from '@/types/database';

export default function RoleFitPage() {
  const params = useParams();
  const router = useRouter();
  const roleId = params?.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [requirements, setRequirements] = useState<RoleRequirement[]>([]);
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

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

        // Expand first two by default
        if (data.fitAnalysis && data.fitAnalysis.length > 0) {
          const initialExpanded: Record<string, boolean> = {};
          data.fitAnalysis.slice(0, 2).forEach((f) => {
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

      // Reload fresh role fit
      const data = await getRoleFit(roleId);
      setRole(data.role);
      setRequirements(data.requirements || []);
      setFitAnalysis(data.fitAnalysis || []);
    } catch (err: unknown) {
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-[#667085]">
        <Loader2 className="w-6 h-6 animate-spin text-[#252525]" />
        <p className="text-xs sm:text-sm">Connecting your experience to role requirements...</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="rolewise-card p-8 max-w-lg mx-auto text-center space-y-4 my-12">
        <div className="w-12 h-12 rounded-full bg-[#FFF0ED] text-[#E87967] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#1F2937]">Role context not found</h2>
          <p className="text-xs text-[#667085]">Add a job description to build requirement-level role fit.</p>
        </div>
        <Link
          href="/jobs/new"
          className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFD84D] text-[#252525] text-xs font-semibold"
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
        <div className="w-12 h-12 rounded-full bg-[#FFF0ED] text-[#E87967] flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-[#1F2937]">Role analysis couldn&apos;t be completed.</h2>
          <p className="text-xs text-[#667085]">
            Your job and experience are saved. Try analyzing again.{retryError ? ` (${retryError})` : ''}
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleTryAgain}
            disabled={isRetrying}
            className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#252525] hover:bg-[#E7C43E] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#EAF6F0] text-[#4E9B76] text-xs font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Strong alignment</span>
        </span>
      );
    }
    if (s.includes('transferable')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFF2B8] text-[#252525] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Transferable</span>
        </span>
      );
    }
    if (s.includes('investigation')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFF5DF] text-[#C58A2B] text-xs font-semibold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Needs investigation</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FFF0ED] text-[#E87967] text-xs font-semibold">
        <AlertCircle className="w-3.5 h-3.5" />
        <span>Not demonstrated</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Back Breadcrumb */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#1F2937] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Jobs</span>
      </Link>

      {/* HEADER SECTION (PRD: Your fit for this role + actual title, company, role context) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#FFF2B8] text-[#252525] text-xs font-semibold">
              Requirement Analysis
            </span>
            <span className="text-xs text-[#667085]">
              {role.company} · {role.location || 'Remote'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight">
            Your fit for this role
          </h1>
          <p className="text-xs sm:text-sm text-[#667085]">
            Target Role: <strong className="text-[#1F2937]">{role.title}</strong> at {role.company}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="shrink-0">
          <Link
            href={`/roles/${role.id}/preparation`}
            className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#252525] hover:bg-[#E7C43E] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <span>Prepare for this role</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* STATUS BREAKDOWN PILLS (NO numerical fit scores per PRD!) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter(statusFilter === 'strong' ? 'all' : 'strong')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'strong'
              ? 'bg-[#EAF6F0] border-[#4E9B76]'
              : 'bg-white border-[#E7E8EF] hover:border-[#4E9B76]'
          }`}
        >
          <p className="text-xs font-semibold text-[#4E9B76]">Strong alignment</p>
          <p className="text-lg font-bold text-[#1F2937]">{counts.strong}</p>
          <p className="text-[11px] text-[#667085]">Demonstrated experience</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'transferable' ? 'all' : 'transferable')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'transferable'
              ? 'bg-[#FFF2B8] border-[#252525]'
              : 'bg-white border-[#E7E8EF] hover:border-[#252525]'
          }`}
        >
          <p className="text-xs font-semibold text-[#252525]">Transferable</p>
          <p className="text-lg font-bold text-[#1F2937]">{counts.transferable}</p>
          <p className="text-[11px] text-[#667085]">Related competencies</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'investigation' ? 'all' : 'investigation')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'investigation'
              ? 'bg-[#FFF5DF] border-[#C58A2B]'
              : 'bg-white border-[#E7E8EF] hover:border-[#C58A2B]'
          }`}
        >
          <p className="text-xs font-semibold text-[#C58A2B]">Needs investigation</p>
          <p className="text-lg font-bold text-[#1F2937]">{counts.investigation}</p>
          <p className="text-[11px] text-[#667085]">Insufficient evidence</p>
        </button>

        <button
          onClick={() => setStatusFilter(statusFilter === 'not_demonstrated' ? 'all' : 'not_demonstrated')}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            statusFilter === 'not_demonstrated'
              ? 'bg-[#FFF0ED] border-[#E87967]'
              : 'bg-white border-[#E7E8EF] hover:border-[#E87967]'
          }`}
        >
          <p className="text-xs font-semibold text-[#E87967]">Not demonstrated</p>
          <p className="text-lg font-bold text-[#1F2937]">{counts.notDemonstrated}</p>
          <p className="text-[11px] text-[#667085]">Missing from context</p>
        </button>
      </div>

      {/* PRD SCOPE GUIDANCE BANNER (Strict rule: Explain statuses humanely) */}
      <div className="p-3.5 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] flex items-start gap-3 text-xs text-[#667085]">
        <Info className="w-4 h-4 text-[#252525] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#1F2937]">How ROLEWISE analyzes your fit: </span>
          <span>
            “Needs investigation” signifies insufficient evidence in the provided materials. “Not demonstrated” means the supplied experience does not mention the requirement. ROLEWISE does not infer a lack of ability from missing evidence.
          </span>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="flex items-center justify-between border-b border-[#E7E8EF] pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#1F2937] text-white'
                : 'text-[#667085] hover:text-[#1F2937] hover:bg-white'
            }`}
          >
            All Requirements ({counts.total})
          </button>
          <button
            onClick={() => setStatusFilter('strong')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'strong'
                ? 'bg-[#4E9B76] text-white'
                : 'text-[#667085] hover:text-[#4E9B76] hover:bg-white'
            }`}
          >
            Strong Alignment ({counts.strong})
          </button>
          <button
            onClick={() => setStatusFilter('transferable')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'transferable'
                ? 'bg-[#FFD84D] text-[#252525]'
                : 'text-[#667085] hover:text-[#252525] hover:bg-white'
            }`}
          >
            Transferable ({counts.transferable})
          </button>
          <button
            onClick={() => setStatusFilter('investigation')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'investigation'
                ? 'bg-[#C58A2B] text-white'
                : 'text-[#667085] hover:text-[#C58A2B] hover:bg-white'
            }`}
          >
            Needs Investigation ({counts.investigation})
          </button>
          <button
            onClick={() => setStatusFilter('not_demonstrated')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === 'not_demonstrated'
                ? 'bg-[#E87967] text-white'
                : 'text-[#667085] hover:text-[#E87967] hover:bg-white'
            }`}
          >
            Not Demonstrated ({counts.notDemonstrated})
          </button>
        </div>
      </div>

      {/* EXPANDABLE REQUIREMENT CARDS (PRD Requirement 4) */}
      <div className="space-y-3.5">
        {filteredAnalysis.map((item) => {
          const isExpanded = expandedIds[item.id];
          return (
            <div
              key={item.id}
              className="rolewise-card overflow-hidden transition-all hover:border-[#D0D5DD]"
            >
              {/* Card Header / Summary Clickable */}
              <div
                onClick={() => toggleExpand(item.id)}
                className="p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-[#F9FAFB]/50 transition-colors"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(item.status)}
                    <span className="text-[11px] text-[#98A2B3]">Role Requirement</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-[#1F2937] leading-snug">
                    {item.requirement_title || 'Core Competency'}
                  </h3>
                </div>

                <div className="shrink-0 flex items-center gap-2 text-xs font-medium text-[#667085]">
                  <span className="hidden sm:inline">{isExpanded ? 'Hide evidence' : 'View evidence'}</span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#667085]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#667085]" />
                  )}
                </div>
              </div>

              {/* Expandable Content (Explanation + Evidence) */}
              {isExpanded && (
                <div className="p-5 pt-0 border-t border-[#E7E8EF] bg-[#F7F7FB]/40 space-y-4 animate-in fade-in">
                  {/* Qualitative Explanation */}
                  <div className="space-y-1 pt-3">
                    <p className="text-xs font-semibold text-[#1F2937] uppercase tracking-wider">
                      Analysis & Context
                    </p>
                    <p className="text-xs sm:text-sm text-[#475467] leading-relaxed">
                      {item.explanation}
                    </p>
                  </div>

                  {/* Concrete Candidate Evidence Quote */}
                  <div className="space-y-1.5 p-3.5 rounded-xl bg-white border border-[#E7E8EF]">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#252525]">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Candidate Evidence in Supplied Background</span>
                    </div>
                    <p className="text-xs text-[#1F2937] leading-relaxed font-sans italic">
                      &ldquo;{item.evidence || 'No direct evidence provided in candidate resume.'}&rdquo;
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* BOTTOM CTA BAR */}
      <div className="rolewise-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[#1F2937]">Ready to turn findings into preparation?</h3>
          <p className="text-xs text-[#667085]">
            Target areas needing investigation or practice before your interview.
          </p>
        </div>

        <Link
          href={`/roles/${role.id}/preparation`}
          className="touch-target inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#252525] hover:bg-[#E7C43E] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
        >
          <span>Prepare for this role</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
