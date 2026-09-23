'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  Plus,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserRoles, getPreparationItems } from '@/services/api';
import { Role, PreparationItem } from '@/types/database';
import { StatusBadge } from '@/components/ui/StatusBadge';

export default function DashboardPage() {
  const { userName } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [prepItems, setPrepItems] = useState<PreparationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setIsLoading(true);
      try {
        const data = await getUserRoles();
        setRoles(data);

        if (data.length > 0) {
          const prepRes = await getPreparationItems(data[0].id);
          setPrepItems(prepRes.items || []);
        }
      } catch (err) {
        console.error('Error loading roles on dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // Primary active role: if roles exist in Supabase, use the latest real role
  const latestRole = roles.length > 0 ? roles[0] : null;

  // 1. EMPTY DASHBOARD FOR NEW USER (Requirement 11)
  if (!isLoading && roles.length === 0) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300 max-w-2xl">
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6D5DFB] uppercase tracking-wider">
            <span>ROLEWISE COCKPIT</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1F2937] tracking-tight">
            Good morning, {userName || 'there'}.
          </h1>
          <div className="pt-1">
            <p className="text-xl font-medium text-[#1F2937]">
              Prepare for the role.
            </p>
            <p className="text-lg font-normal text-[#667085]">
              Not just the interview.
            </p>
          </div>
        </section>

        <div className="rolewise-card p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-[#1F2937]">
              Your workspace is ready.
            </h3>
            <p className="text-sm text-[#667085] leading-relaxed">
              Add a job to start understanding your fit and building a personalized preparation plan.
            </p>
          </div>

          <div>
            <Link
              href="/jobs/new"
              className="touch-target inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add your first job</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. DASHBOARD AFTER A REAL JOB EXISTS (Requirement 12)
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Greeting */}
      <section className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium text-[#667085] uppercase tracking-wider">
          <span>ROLEWISE COCKPIT</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1F2937] tracking-tight">
          Good morning, {userName || 'there'}.
        </h1>
        <p className="text-sm text-[#667085]">
          Here is where you stand with your current role preparation.
        </p>
      </section>

      {latestRole && (
        <>
          {/* Section: Your next interview */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                Your next interview
              </h2>
              <span className="text-xs text-[#667085] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Active Target
              </span>
            </div>

            <div className="rolewise-card p-6 transition-all hover:border-[#D0D5DD]">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center font-bold text-sm">
                      {(latestRole.company || latestRole.title || 'RO').slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1F2937] leading-tight">
                        {latestRole.title}
                      </h3>
                      <p className="text-sm font-medium text-[#667085]">{latestRole.company}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#667085] pt-1">
                    {latestRole.workplace_type && (
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="w-3.5 h-3.5 text-[#667085]" />
                        {latestRole.workplace_type}
                      </span>
                    )}
                    {latestRole.location && (
                      <>
                        {latestRole.workplace_type && <span>·</span>}
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#667085]" />
                          {latestRole.location}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start">
                  <StatusBadge status={latestRole.status || 'Preparing'} />
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-[#E7E8EF] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-[#1F2937]">
                  <span className="font-semibold text-[#6D5DFB]">Preparation</span>
                  <span className="text-[#667085]">
                    {prepItems.length > 0 ? `${prepItems.length} targeted focus areas` : 'Tailored to this role'}
                  </span>
                </div>

                <Link
                  href={`/roles/${latestRole.id}/preparation`}
                  className="touch-target inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-sm font-medium transition-colors shadow-sm"
                >
                  <span>Continue preparation</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* Section: Up next */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                Up next
              </h2>
            </div>

            <div className="rolewise-card p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#EEECFF] text-[#6D5DFB]">
                      {prepItems[0]?.priority || 'Focus'}
                    </span>
                    <h3 className="text-base font-semibold text-[#1F2937]">
                      {prepItems[0]?.title || 'AI Interview Practice'}
                    </h3>
                  </div>
                  <p className="text-sm text-[#667085]">
                    {prepItems[0]?.description || `Practice responses tailored to ${latestRole.title} at ${latestRole.company}`}
                  </p>
                </div>

                <Link
                  href={`/roles/${latestRole.id}/interview`}
                  className="touch-target inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#EEECFF] hover:bg-[#E2DEFD] text-[#6D5DFB] text-sm font-medium transition-colors"
                >
                  <span>Practice</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* Section: Recent activity (Strictly real data only, no fake records) */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
              Recent activity
            </h2>

            <div className="rolewise-card p-5 text-sm text-[#667085]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#F7F7FB] border border-[#E7E8EF] text-[#667085] flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-medium text-[#1F2937]">Practice sessions tracked here</p>
                  <p className="text-xs text-[#667085]">Complete an interview or communication practice session to log your feedback history.</p>
                </div>
              </div>
            </div>
          </section>

          {/* All Analyzed Roles from Database */}
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                Your Analyzed Roles ({roles.length})
              </h2>
              <Link
                href="/jobs/new"
                className="text-xs text-[#6D5DFB] font-medium hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add another
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {roles.map((r) => (
                <div key={r.id} className="rolewise-card p-5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-sm text-[#1F2937]">{r.title}</h4>
                      <StatusBadge status={r.status || 'Active'} size="sm" />
                    </div>
                    <p className="text-xs text-[#667085]">{r.company}</p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#E7E8EF] flex items-center justify-between text-xs">
                    <Link
                      href={`/roles/${r.id}/fit`}
                      className="text-[#6D5DFB] font-medium hover:underline flex items-center gap-1 touch-target"
                    >
                      View Fit <ArrowRight className="w-3 h-3" />
                    </Link>
                    <Link
                      href={`/roles/${r.id}/preparation`}
                      className="text-[#1F2937] font-medium hover:text-[#6D5DFB] touch-target"
                    >
                      Preparation
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
