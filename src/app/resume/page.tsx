'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Upload,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  User,
  Briefcase,
  Layers,
  Edit3,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function ResumePage() {
  const { userName, session } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [manualSkills, setManualSkills] = useState(
    'User Research, Wireframing, Figma, Interactive Prototyping, Design Systems, Usability Testing, Cross-Functional Collaboration'
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#252525] tracking-tight">
          Resume & Candidate Experience
        </h1>
        <p className="text-xs sm:text-sm text-[#73757A]">
          Your background is used by ROLEWISE to connect with role requirements and generate authentic interview follow-up questions.
        </p>
      </section>

      {/* Candidate Profile Summary */}
      <div className="rolewise-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF2B8] text-[#252525] font-bold text-base flex items-center justify-center">
              {userName ? userName[0].toUpperCase() : 'L'}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#252525]">
                {userName || 'Logesh Prasanth'}
              </h2>
              <p className="text-xs text-[#73757A]">
                {session?.user?.email || 'logesh@rolewise.io'} · Product & UI/UX Design Specialist
              </p>
            </div>
          </div>

          <Link
            href="/jobs/new"
            className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-xs font-semibold shadow-xs"
          >
            <span>Analyze for a new role</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Experience Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Skills & Specializations */}
        <div className="rolewise-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#252525]" />
              <h3 className="text-sm font-semibold text-[#252525]">Key Skills & Specializations</h3>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-semibold text-[#252525] hover:underline inline-flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditing ? 'Save' : 'Edit'}</span>
            </button>
          </div>

          {isEditing ? (
            <textarea
              rows={4}
              value={manualSkills}
              onChange={(e) => setManualSkills(e.target.value)}
              className="w-full p-3 rounded-xl border border-[#D9D8D2] text-xs text-[#252525] focus:outline-none focus:border-[#252525]"
            />
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {manualSkills.split(',').map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-[#F3F2EE] border border-[#D9D8D2] text-xs font-medium text-[#252525]"
                >
                  {skill.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Upload Status Card */}
        <div className="rolewise-card p-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#6FA77F]" />
              <h3 className="text-sm font-semibold text-[#252525]">Uploaded Resume File</h3>
            </div>
            <p className="text-xs text-[#73757A] leading-relaxed">
              When you add a job, your uploaded resume text is automatically extracted and analyzed against the role description.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#EEF7F0] border border-[#DDEEDF] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#6FA77F] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Resume parsing active</span>
            </div>
            <Link
              href="/jobs/new"
              className="text-xs font-semibold text-[#6FA77F] hover:underline"
            >
              Upload update →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
