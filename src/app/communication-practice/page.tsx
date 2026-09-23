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
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <section className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EEECFF] text-[#6D5DFB] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>General Practice Hub</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1F2937] tracking-tight">
          Communication Practice
        </h1>
        <p className="text-sm sm:text-base text-[#667085] leading-relaxed">
          Build confidence by practicing how you communicate, not just what you know.
        </p>

        {/* Dynamic Context Header (Requirement 18) */}
        <div className="pt-2">
          {activeRole ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E7E8EF] text-xs sm:text-sm text-[#1F2937]">
              <Briefcase className="w-4 h-4 text-[#6D5DFB]" />
              <span className="text-[#667085]">Practice for:</span>
              <span className="font-semibold text-[#1F2937]">{activeRole.title}</span>
              <span>·</span>
              <span className="font-medium text-[#667085]">{activeRole.company}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#E7E8EF] text-xs sm:text-sm text-[#667085]">
              <Sparkles className="w-4 h-4 text-[#6D5DFB]" />
              <span>Practice general interview communication</span>
            </div>
          )}
        </div>
      </section>

      {/* Practice Modes Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Mode 1: Voice Practice */}
        <div className="rolewise-card p-6 flex flex-col justify-between space-y-6 hover:border-[#D0D5DD] transition-all">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center">
              <Mic className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-[#1F2937]">Voice Practice</h2>
              <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
                Answer interview questions using your microphone. Hear your playback and analyze your clarity, structure, and conciseness.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs text-[#667085]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4E9B76]" />
                <span>Real microphone recording with playback review</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4E9B76]" />
                <span>Observable communication analysis</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E7E8EF]">
            <Link
              href="/communication-practice/voice"
              className="touch-target w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-sm font-medium transition-colors shadow-sm"
            >
              <span>Start Voice Practice</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Mode 2: Video Practice */}
        <div className="rolewise-card p-6 flex flex-col justify-between space-y-6 hover:border-[#D0D5DD] transition-all">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EAF6F0] text-[#4E9B76] flex items-center justify-center">
              <Video className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-semibold text-[#1F2937]">Video Practice</h2>
              <p className="text-xs sm:text-sm text-[#667085] leading-relaxed">
                Practice answering on camera with real-time video preview. Review your live delivery and evaluate the structure of your response.
              </p>
            </div>

            <div className="space-y-2 pt-2 text-xs text-[#667085]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4E9B76]" />
                <span>Live camera preview + MediaRecorder</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4E9B76]" />
                <span>Recording review before optional submission</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E7E8EF]">
            <Link
              href="/communication-practice/video"
              className="touch-target w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#1F2937] hover:bg-black text-white text-sm font-medium transition-colors shadow-sm"
            >
              <span>Start Video Practice</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Trust & Safety Notice */}
      <div className="p-4 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] flex items-start gap-3 text-xs text-[#667085]">
        <HelpCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#6D5DFB]" />
        <p className="leading-relaxed">
          <strong>Privacy first:</strong> Camera and microphone streams are processed directly in your browser. Rolewise evaluates observable communication characteristics (clarity, structure, conciseness) and never creates speculative psychological scores or biometric assumptions.
        </p>
      </div>
    </div>
  );
}
