'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  ArrowRight,
  Layers,
  Bot,
  MapPin,
  Clock,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { getUserRoles } from '@/services/api';
import { Role } from '@/types/database';

export default function MyJobsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoles() {
      try {
        const data = await getUserRoles();
        setRoles(data);
      } catch (err) {
        console.error('Error loading roles:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRoles();
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight">My Jobs</h1>
          <p className="text-xs sm:text-sm text-[#667085]">
            Manage your target job opportunities and access role-specific preparation plans.
          </p>
        </div>

        <Link
          href="/jobs/new"
          className="touch-target inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add new job</span>
        </Link>
      </div>

      {/* Roles List */}
      {roles.length > 0 ? (
        <div className="space-y-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="rolewise-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-[#D0D5DD] transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-[#EEECFF] text-[#6D5DFB] text-[11px] font-semibold">
                    Target Opportunity
                  </span>
                  <span className="text-xs text-[#667085]">
                    Added {role.created_at ? new Date(role.created_at).toLocaleDateString() : 'Recently'}
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-[#1F2937]">{role.title}</h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-[#667085]">
                  <span className="font-semibold text-[#1F2937]">{role.company}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#98A2B3]" />
                    {role.location || 'Remote'}
                  </span>
                  <span>·</span>
                  <span>{role.workplace_type || 'Full-time'}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <Link
                  href={`/roles/${role.id}/fit`}
                  className="touch-target px-3.5 py-2 rounded-xl bg-white border border-[#E7E8EF] hover:border-[#6D5DFB] text-xs font-semibold text-[#1F2937] transition-all"
                >
                  View Fit
                </Link>
                <Link
                  href={`/roles/${role.id}/preparation`}
                  className="touch-target px-3.5 py-2 rounded-xl bg-white border border-[#E7E8EF] hover:border-[#6D5DFB] text-xs font-semibold text-[#1F2937] transition-all"
                >
                  Preparation Plan
                </Link>
                <Link
                  href={`/roles/${role.id}/interview`}
                  className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs font-semibold transition-all shadow-xs"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Start Interview</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rolewise-card p-10 text-center space-y-4 max-w-lg mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center mx-auto">
            <Briefcase className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[#1F2937]">No jobs added yet</h3>
            <p className="text-xs text-[#667085]">
              Give ROLEWISE your target role and experience to begin personalized interview preparation.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/jobs/new"
              className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add your first job</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
