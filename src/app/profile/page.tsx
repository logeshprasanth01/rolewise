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
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1F2937] tracking-tight">
          Profile & Account
        </h1>
        <p className="text-sm text-[#667085]">
          Manage your personal account and interview preparation workspace.
        </p>
      </section>

      {/* Account Card */}
      <section className="rolewise-card p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center font-bold text-xl shadow-sm">
            {userName ? userName[0].toUpperCase() : 'U'}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[#1F2937]">
              {userName || 'Candidate'}
            </h2>
            <p className="text-xs sm:text-sm text-[#667085] flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-[#98A2B3]" />
              {user?.email || 'Not signed in'}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-[#E7E8EF] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#4E9B76]">
            <CheckCircle2 className="w-4 h-4" />
            <span>{session ? 'Account active & verified' : 'Guest session'}</span>
          </div>

          {session ? (
            <button
              onClick={signOut}
              className="touch-target inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium text-[#E87967] hover:bg-[#FFF0ED] border border-[#FBD2CB] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={() => openAuthModal('signin')}
              className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#6D5DFB] text-white hover:bg-[#5A48F5] transition-colors shadow-sm"
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
            <h3 className="text-base font-semibold text-[#1F2937] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#6D5DFB]" />
              <span>Workspace & Privacy</span>
            </h3>
            <p className="text-xs text-[#667085]">
              Your preparation data and practice recordings are protected.
            </p>
          </div>

          <span className="text-xs px-2.5 py-1 rounded-full font-medium border bg-[#EAF6F0] text-[#4E9B76] border-[#CEEBDF]">
            Protected
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[#667085]">Account Status</span>
            <span className="text-[#1F2937] font-medium">
              {session ? 'Active' : 'Unauthenticated'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#667085]">Workspace Plan</span>
            <span className="text-[#6D5DFB] font-medium">Rolewise Standard</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[#667085]">Practice Recordings</span>
            <span className="text-[#1F2937] font-medium">Securely stored</span>
          </div>
        </div>

        <p className="text-xs text-[#667085] leading-relaxed pt-1">
          ROLEWISE keeps your job descriptions, resume data, and interview practice recordings private and tied exclusively to your account.
        </p>
      </section>
    </div>
  );
}
