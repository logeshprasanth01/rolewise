'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  HelpCircle,
  FileCheck,
  ArrowLeft,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getRoleFit } from '@/services/api';
import { FitAnalysis, Role } from '@/types/database';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function RoleFitPage() {
  const params = useParams();
  const roleId = params?.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      if (!roleId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await getRoleFit(roleId);
        if (res.role) {
          setRole(res.role);
          setFitAnalysis(res.fitAnalysis || []);
        } else {
          setRole(null);
          setFitAnalysis([]);
        }
      } catch (err: unknown) {
        console.error('Error loading role fit:', err);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [roleId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-[#667085]">
        <Loader2 className="w-6 h-6 animate-spin text-[#6D5DFB]" />
        <p className="text-sm">Loading role fit analysis...</p>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="space-y-6 max-w-xl mx-auto py-12 text-center animate-in fade-in">
        <div className="rolewise-card p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0ED] text-[#E87967] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-[#1F2937]">Role not found</h2>
            <p className="text-sm text-[#667085]">
              Return to your roles and select a valid role.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="touch-target inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-sm font-medium transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate summary counts
  const totalAnalyzed = fitAnalysis.length;
  const strongCount = fitAnalysis.filter((f) =>
    f.status.toLowerCase().includes('strong') || f.status.toLowerCase().includes('align')
  ).length;
  const transferableCount = fitAnalysis.filter((f) =>
    f.status.toLowerCase().includes('transferable')
  ).length;
  const needsInvestigationCount = fitAnalysis.filter((f) =>
    f.status.toLowerCase().includes('investigation') || f.status.toLowerCase().includes('needs')
  ).length;

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Back breadcrumb */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] hover:text-[#1F2937] transition-colors touch-target"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Page Header */}
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-medium text-[#667085]">
          <span className="font-semibold text-[#1F2937]">{role.title}</span>
          {role.company && (
            <>
              <span>·</span>
              <span>{role.company}</span>
            </>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1F2937] tracking-tight">
          Your fit for this role
        </h1>
        <p className="text-sm sm:text-base text-[#667085]">
          Here&apos;s how your experience connects to what this role requires.
        </p>
      </section>

      {/* Summary Chips (No numeric fit score, pure objective count) */}
      <section className="rolewise-card p-5 bg-white flex flex-wrap items-center gap-3">
        <div className="px-3 py-1.5 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] text-xs sm:text-sm font-medium text-[#1F2937]">
          <strong>{totalAnalyzed}</strong> requirements analyzed
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-[#EAF6F0] border border-[#CEEBDF] text-xs sm:text-sm font-medium text-[#4E9B76]">
          <strong>{strongCount}</strong> aligned
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-[#EEECFF] border border-[#D8D4FD] text-xs sm:text-sm font-medium text-[#6D5DFB]">
          <strong>{transferableCount}</strong> transferable
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-[#FFF5DF] border border-[#FCE6BD] text-xs sm:text-sm font-medium text-[#C58A2B]">
          <strong>{needsInvestigationCount}</strong> needs investigation
        </div>
      </section>

      {/* Note about Needs Investigation */}
      <div className="px-4 py-3 rounded-xl bg-[#FFFDF7] border border-[#FCE6BD] text-xs text-[#C58A2B] flex items-start gap-2.5">
        <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Note on preparation:</strong> &ldquo;Needs investigation&rdquo; means there is insufficient evidence in your resume or profile. It is <em>not</em> a failure—it points directly to where you should articulate relevant stories during your interview.
        </p>
      </div>

      {/* Requirements List */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
          Requirements Breakdown
        </h2>

        {fitAnalysis.length === 0 ? (
          <div className="rolewise-card p-6 text-center text-[#667085] text-sm">
            No requirement fit breakdown available yet for this role.
          </div>
        ) : (
          <div className="space-y-4">
            {fitAnalysis.map((item, index) => (
              <div
                key={item.id || index}
                className="rolewise-card p-6 transition-all hover:border-[#D0D5DD] space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#1F2937] leading-snug">
                    {item.requirement_title || item.requirement_detail?.requirement || `Requirement ${index + 1}`}
                  </h3>
                  <div className="self-start">
                    <StatusBadge status={item.status} />
                  </div>
                </div>

                {/* Explanation */}
                <div className="space-y-1 text-sm text-[#1F2937] leading-relaxed">
                  <p>{item.explanation}</p>
                </div>

                {/* Evidence if present */}
                {item.evidence && (
                  <div className="pt-3 border-t border-[#E7E8EF] space-y-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#667085] flex items-center gap-1.5">
                      <FileCheck className="w-3.5 h-3.5 text-[#4E9B76]" />
                      Evidence from candidate profile
                    </span>
                    <p className="text-xs sm:text-sm text-[#667085] italic pl-5">
                      &ldquo;{item.evidence}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bottom Action to Preparation */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs text-[#667085]">
          Ready to build focused talking points for these requirements?
        </p>
        <Link
          href={`/roles/${roleId}/preparation`}
          className="w-full sm:w-auto touch-target inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-sm font-medium transition-colors shadow-sm"
        >
          <span>Continue to Preparation</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
