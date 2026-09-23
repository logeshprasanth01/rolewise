'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Mic,
  Video,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Briefcase,
  HelpCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { getUserRoles } from '@/services/api';
import { Role } from '@/types/database';

export default function CommunicationPracticePage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadRoles() {
      try {
        const data = await getUserRoles();
        setRoles(data);
      } catch (err) {
        console.error('Error loading roles for communication practice:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadRoles();
  }, []);

  const activeRole = roles.length > 0 ? roles[0] : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <section className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEECFF] text-[#6D5DFB] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Independent Practice Hub</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight">
          Communication Practice
        </h1>
        <p className="text-xs sm:text-base text-[#667085] leading-relaxed max-w-2xl">
          Build fluency and clarity by practicing how you communicate, independent of any specific job application.
        </p>

        {/* Dynamic Context Header */}
        <div className="pt-2">
          {activeRole ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E7E8EF] text-xs sm:text-sm text-[#1F2937]">
              <Briefcase className="w-4 h-4 text-[#6D5DFB]" />
              <span className="text-[#667085]">Contextual prompt available:</span>
              <span className="font-semibold text-[#1F2937]">{activeRole.title}</span>
              <span>·</span>
              <span className="font-medium text-[#667085]">{activeRole.company}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E7E8EF] text-xs text-[#667085]">
              <Sparkles className="w-3.5 h-3.5 text-[#6D5DFB]" />
              <span>General communication drills (accessible anytime without a job)</span>
            </div>
          )}
        </div>
      </section>

      {/* Practice Modes Selection (Voice Practice & Video Practice) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Mode 1: Voice Practice (Screen 9) */}
        <div className="rolewise-card p-6 flex flex-col justify-between space-y-6 hover:border-[#6D5DFB] transition-all group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-[#1F2937] group-hover:text-[#6D5DFB] transition-colors">
                Voice Practice
              </h2>
              <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
                Record your spoken responses using your microphone. Listen to your playback and receive observable feedback on clarity, structure, and conciseness.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs text-[#475467]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4E9B76]" />
                <span>Real microphone recording with instant audio review</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4E9B76]" />
                <span>Usable playback even when AI analysis is offline</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4E9B76]" />
                <span>Observable clarity, structure, and speaking pace feedback</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E7E8EF]">
            <Link
              href="/communication-practice/voice"
              className="touch-target w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <span>Start Voice Practice</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Mode 2: Video Practice (Screen 10) */}
        <div className="rolewise-card p-6 flex flex-col justify-between space-y-6 hover:border-[#6D5DFB] transition-all group">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-[#1F2937] group-hover:text-[#6D5DFB] transition-colors">
                Video Practice
              </h2>
              <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
                Simulate a real video conference interview with live camera and microphone preview. Review your captured recording and re-record as needed.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs text-[#475467]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4E9B76]" />
                <span>Live video mirror and recording playback</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4E9B76]" />
                <span>Re-record anytime with preserved media controls</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#4E9B76]" />
                <span>Focuses strictly on observable delivery (no personality judgments)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E7E8EF]">
            <Link
              href="/communication-practice/video"
              className="touch-target w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <span>Start Video Practice</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
