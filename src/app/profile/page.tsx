'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Shield,
  CheckCircle2,
  LogOut,
  Mail,
  Calendar,
} from 'lucide-react';

export default function ProfilePage() {
  const {
    user,
    session,
    userName,
    signOut,
    openAuthModal,
  } = useAuth();

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#252525] tracking-tight">
          Profile & Account
        </h1>
        <p className="text-sm text-[#73757A]">
          Manage your personal account and interview preparation workspace.
        </p>
      </section>

      {/* Account Card */}
      <section className="rolewise-card p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF2B8] text-[#252525] flex items-center justify-center font-bold text-xl shadow-sm">
            {userName ? userName[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#252525]">
              {userName || 'Candidate'}
            </h2>
            <p className="text-xs sm:text-sm text-[#73757A] flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-[#9A9B9E]" />
              {user?.email || 'Not signed in'}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#D9D8D2] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#6FA77F]">
            <CheckCircle2 className="w-4 h-4" />
            <span>{session ? 'Account active & verified' : 'Guest session'}</span>
          </div>

          {session ? (
            <button
              onClick={signOut}
              className="touch-target inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#D97968] hover:bg-[#FFF0ED] border border-[#F6D8D1] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('signin')}
              className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#FFD84D] text-[#252525] hover:bg-[#E7C43E] transition-colors shadow-sm"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In / Create Account</span>
            </button>
          )}
        </div>
      </section>

      {/* Workspace & Security Card */}
      <section className="rolewise-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-[#252525] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#252525]" />
              <span>Workspace & Privacy</span>
            </h3>
            <p className="text-xs text-[#73757A]">
              Your preparation data and practice recordings are protected.
            </p>
          </div>

          <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-[#EEF7F0] text-[#6FA77F] border-[#DDEEDF]">
            Protected
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F3F2EE] border border-[#D9D8D2] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#73757A]">Account Status</span>
            <span className="text-[#252525] font-medium">
              {session ? 'Active' : 'Unauthenticated'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#73757A]">Workspace Plan</span>
            <span className="text-[#252525] font-medium">Rolewise Standard</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#73757A]">Practice Recordings</span>
            <span className="text-[#252525] font-medium">Securely stored</span>
          </div>
        </div>

        <p className="text-xs text-[#73757A] leading-relaxed pt-1">
          ROLEWISE keeps your job descriptions, resume data, and interview practice recordings private and tied exclusively to your account.
        </p>
      </section>
    </div>
  );
}
