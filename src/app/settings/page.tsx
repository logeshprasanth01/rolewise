'use client';

import React, { useState } from 'react';
import {
  User,
  Mic,
  Video,
  Shield,
  CheckCircle2,
  AlertCircle,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function SettingsPage() {
  const { userName, session, signOut } = useAuth();
  const [micTested, setMicTested] = useState<boolean | null>(null);
  const [cameraTested, setCameraTested] = useState<boolean | null>(null);

  const handleTestMic = async () => {
    try {
      if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        setMicTested(true);
      } else {
        setMicTested(false);
      }
    } catch {
      setMicTested(false);
    }
  };

  const handleTestCamera = async () => {
    try {
      if (typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((t) => t.stop());
        setCameraTested(true);
      } else {
        setCameraTested(false);
      }
    } catch {
      setCameraTested(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight">
          Settings & Preferences
        </h1>
        <p className="text-xs sm:text-sm text-[#667085]">
          Manage your account and device permissions for interview practice sessions.
        </p>
      </section>

      {/* Account Profile Card */}
      <div className="rolewise-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-[#252525]" />
          <h2 className="text-sm font-semibold text-[#1F2937]">Account Information</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="space-y-1">
            <span className="text-[#667085]">Full Name</span>
            <p className="font-semibold text-sm text-[#1F2937]">{userName || 'Candidate'}</p>
          </div>
          <div className="space-y-1">
            <span className="text-[#667085]">Email Address</span>
            <p className="font-semibold text-sm text-[#1F2937]">{session?.user?.email || 'candidate@rolewise.io'}</p>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E7E8EF] flex items-center justify-between">
          <span className="text-xs text-[#667085]">Signed in as authenticated candidate</span>
          <button
            onClick={() => signOut()}
            className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#FCDAD5] text-[#E87967] hover:bg-[#FFF0ED] text-xs font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Device Permissions Check */}
      <div className="rolewise-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-[#252525]" />
          <h2 className="text-sm font-semibold text-[#1F2937]">Audio & Video Permissions</h2>
        </div>
        <p className="text-xs text-[#667085] leading-relaxed">
          Communication practice relies on standard browser media APIs. You can verify your microphone and camera permissions below.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleTestMic}
            className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E8EF] hover:bg-[#F9FAFB] text-xs font-semibold text-[#1F2937] transition-all shadow-xs cursor-pointer"
          >
            <Mic className="w-3.5 h-3.5 text-[#252525]" />
            <span>Test Microphone Permission</span>
          </button>

          {micTested === true && (
            <span className="inline-flex items-center gap-1 text-xs text-[#4E9B76] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Microphone available</span>
            </span>
          )}

          {micTested === false && (
            <span className="inline-flex items-center gap-1 text-xs text-[#E87967] font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Permission denied or unavailable</span>
            </span>
          )}

          <button
            type="button"
            onClick={handleTestCamera}
            className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E8EF] hover:bg-[#F9FAFB] text-xs font-semibold text-[#1F2937] transition-all shadow-xs cursor-pointer"
          >
            <Video className="w-3.5 h-3.5 text-[#252525]" />
            <span>Test Camera Permission</span>
          </button>

          {cameraTested === true && (
            <span className="inline-flex items-center gap-1 text-xs text-[#4E9B76] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Camera available</span>
            </span>
          )}

          {cameraTested === false && (
            <span className="inline-flex items-center gap-1 text-xs text-[#E87967] font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Permission denied or unavailable</span>
            </span>
          )}
        </div>
      </div>

      {/* Privacy & Workspace Security */}
      <div className="rolewise-card p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#252525]" />
          <h2 className="text-sm font-semibold text-[#1F2937]">Privacy & Workspace Security</h2>
        </div>
        <p className="text-xs text-[#667085] leading-relaxed">
          ROLEWISE keeps your job descriptions, resume details, and interview practice recordings private and tied exclusively to your authenticated account.
        </p>
      </div>
    </div>
  );
}
