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
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight">
          Resume & Candidate Experience
        </h1>
        <p className="text-xs sm:text-sm text-[#667085]">
          Your background is used by ROLEWISE to connect with role requirements and generate authentic interview follow-up questions.
        </p>
      </section>

      {/* Candidate Profile Summary */}
      <div className="rolewise-card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#EEECFF] text-[#6D5DFB] font-bold text-base flex items-center justify-center">
              {userName ? userName[0].toUpperCase() : 'L'}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1F2937]">
                {userName || 'Logesh Prasanth'}
              </h2>
              <p className="text-xs text-[#667085]">
                {session?.user?.email || 'logesh@rolewise.io'} · Product & UI/UX Design Specialist
              </p>
            </div>
          </div>

          <Link
            href="/jobs/new"
            className="touch-target inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs font-semibold shadow-xs"
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
              <Sparkles className="w-4 h-4 text-[#6D5DFB]" />
              <h3 className="text-sm font-semibold text-[#1F2937]">Key Skills & Specializations</h3>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-xs font-semibold text-[#6D5DFB] hover:underline inline-flex items-center gap-1"
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
              className="w-full p-3 rounded-xl border border-[#E7E8EF] text-xs text-[#1F2937] focus:outline-none focus:border-[#6D5DFB]"
            />
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {manualSkills.split(',').map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1.5 rounded-lg bg-[#F7F7FB] border border-[#E7E8EF] text-xs font-medium text-[#1F2937]"
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
              <FileText className="w-4 h-4 text-[#4E9B76]" />
              <h3 className="text-sm font-semibold text-[#1F2937]">Uploaded Resume File</h3>
            </div>
            <p className="text-xs text-[#667085] leading-relaxed">
              When you add a job, your uploaded resume text is automatically extracted and analyzed against the role description.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#EAF6F0] border border-[#CEECD9] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-[#4E9B76] font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Resume parsing active</span>
            </div>
            <Link
              href="/jobs/new"
              className="text-xs font-semibold text-[#4E9B76] hover:underline"
            >
              Upload update →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
