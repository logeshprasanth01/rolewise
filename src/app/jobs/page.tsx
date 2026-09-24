'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Plus,
  ArrowRight,
  Bot,
  MapPin,
  Trash2,
  MoreHorizontal,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { getUserRoles, removeRole } from '@/services/api';
import { Role } from '@/types/database';

export default function MyJobsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Overflow menu state (tracks which role's menu is open)
  const [openMenuRoleId, setOpenMenuRoleId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Deletion confirmation modal state
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Non-blocking toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

  // Close overflow menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuRoleId(null);
      }
    };
    if (openMenuRoleId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuRoleId]);

  // Support Escape key to close modal or menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!isDeleting) {
          setRoleToDelete(null);
          setOpenMenuRoleId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting]);

  // Auto-dismiss toast feedback
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleConfirmDelete = async () => {
    if (!roleToDelete || isDeleting) return;
    setIsDeleting(true);

    try {
      await removeRole(roleToDelete.id);
      setRoles((prev) => prev.filter((r) => r.id !== roleToDelete.id));
      setToastMessage({ text: 'Job removed.', type: 'success' });
      setRoleToDelete(null);
    } catch (err) {
      console.error('[Rolewise] Error removing role:', err);
      setToastMessage({ text: "Couldn't remove this job. Please try again.", type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

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

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="rolewise-card p-6 space-y-4 animate-pulse">
              <div className="h-4 bg-[#E7E8EF] rounded-md w-36" />
              <div className="h-6 bg-[#E7E8EF] rounded-md w-64" />
              <div className="h-4 bg-[#E7E8EF] rounded-md w-48" />
            </div>
          ))}
        </div>
      ) : roles.length > 0 ? (
        /* Roles List */
        <div className="space-y-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="rolewise-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-[#D0D5DD] transition-all relative"
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

                {/* Overflow menu for Remove Job */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenMenuRoleId(openMenuRoleId === role.id ? null : role.id)}
                    aria-label="More actions"
                    aria-expanded={openMenuRoleId === role.id}
                    className="touch-target w-9 h-9 rounded-xl bg-white border border-[#E7E8EF] hover:border-[#D0D5DD] hover:bg-[#F9FAFB] text-[#667085] hover:text-[#1F2937] transition-all flex items-center justify-center cursor-pointer shadow-2xs"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {openMenuRoleId === role.id && (
                    <div
                      ref={menuRef}
                      className="absolute right-0 top-full mt-1.5 w-40 bg-white border border-[#E7E8EF] rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-150"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setOpenMenuRoleId(null);
                          setRoleToDelete(role);
                        }}
                        aria-label="Remove job"
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove job</span>
                      </button>
                    </div>
                  )}
                </div>
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
              Add a job to start building your role-specific preparation plan.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/jobs/new"
              className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add new job</span>
            </Link>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {roleToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-job-title"
          onClick={() => !isDeleting && setRoleToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-[#E7E8EF] shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEE4E2] text-[#D92D20] flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setRoleToDelete(null)}
                disabled={isDeleting}
                aria-label="Close dialog"
                className="text-[#98A2B3] hover:text-[#1F2937] p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              <h2 id="remove-job-title" className="text-lg font-bold text-[#1F2937] tracking-tight">
                Remove this job?
              </h2>
              <p className="text-sm font-medium text-[#344054]">
                {roleToDelete.company
                  ? `Are you sure you want to remove ${roleToDelete.title} at ${roleToDelete.company}?`
                  : `Are you sure you want to remove ${roleToDelete.title}?`}
              </p>
              <p className="text-xs text-[#667085] leading-relaxed">
                This will remove the job from My Jobs and its role-specific preparation data.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRoleToDelete(null)}
                disabled={isDeleting}
                className="touch-target px-4 py-2.5 rounded-xl bg-white border border-[#E7E8EF] hover:bg-[#F9FAFB] text-xs font-semibold text-[#344054] transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="touch-target inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <span>Remove job</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking feedback toast */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm px-4 py-3 rounded-xl shadow-lg border text-xs sm:text-sm font-medium flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-white border-[#A6F4C5] text-[#067647] shadow-emerald-500/10'
              : 'bg-white border-[#FECDCA] text-[#B42318] shadow-rose-500/10'
          }`}
          role="status"
          aria-live="polite"
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#12B76A] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#F04438] shrink-0" />
          )}
          <span className="flex-1">{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-current opacity-60 hover:opacity-100 p-0.5 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
