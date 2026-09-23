'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { getPreparationItems } from '@/services/api';
import { PreparationItem, Role } from '@/types/database';
import { PriorityBadge, StatusBadge } from '@/components/ui/StatusBadge';

export default function PreparationPage() {
  const params = useParams();
  const roleId = params?.id as string;

  const [role, setRole] = useState<Role | null>(null);
  const [items, setItems] = useState<PreparationItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadPrepItems() {
      if (!roleId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await getPreparationItems(roleId);
        if (res.role) {
          setRole(res.role);
          setItems(res.items || []);
        } else {
          setRole(null);
          setItems([]);
        }
      } catch (err) {
        console.error('Error loading preparation items:', err);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadPrepItems();
  }, [roleId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-[#667085]">
        <Loader2 className="w-6 h-6 animate-spin text-[#6D5DFB]" />
        <p className="text-sm">Loading preparation items...</p>
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Back breadcrumb */}
      <div>
        <Link
          href={`/roles/${roleId}/fit`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] hover:text-[#1F2937] transition-colors touch-target"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Role Fit</span>
        </Link>
      </div>

      {/* Header */}
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
          Prepare for your interview
        </h1>
        <p className="text-sm sm:text-base text-[#667085]">
          Focus on the areas that matter most for this role.
        </p>
      </section>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#FFF0ED] border border-[#FBD2CB] text-[#E87967] text-sm flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Unable to start interview</p>
              <p className="mt-0.5 text-xs text-[#E87967]">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-[#E87967] hover:text-[#1F2937] p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preparation Cards List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
            Targeted Focus Areas ({items.length})
          </h2>
          <span className="text-xs text-[#667085]">
            Ordered by strategic impact
          </span>
        </div>

        {items.length === 0 ? (
          <div className="rolewise-card p-6 text-center text-[#667085] text-sm">
            No preparation items identified for this role yet. You can still practice with the AI interview below.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="rolewise-card p-6 transition-all hover:border-[#D0D5DD] space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-[#1F2937]">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={item.priority} />
                    <StatusBadge status={item.alignment_status || item.status || 'Transferable'} size="sm" />
                  </div>
                </div>

                <p className="text-sm text-[#1F2937] leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Primary CTA */}
      <div className="rolewise-card p-6 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h4 className="text-sm font-semibold text-[#1F2937]">
            Ready to test your responses?
          </h4>
          <p className="text-xs text-[#667085]">
            Practice live responses tailored to these {role.company ? `${role.company} ` : ''}requirements.
          </p>
        </div>

        <Link
          href={`/roles/${roleId}/interview`}
          className="w-full sm:w-auto touch-target inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-sm font-medium transition-colors shadow-sm cursor-pointer"
        >
          <span>Start AI interview</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
