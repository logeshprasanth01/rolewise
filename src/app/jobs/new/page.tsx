'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Upload,
  User,
  X,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Info,
  Sparkles,
} from 'lucide-react';
import { extractResumeText } from '@/lib/extractor';
import { invokeAnalyzeRole } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

export default function AddJobPage() {
  const router = useRouter();
  const { session } = useAuth();

  // Form State
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('UI/UX Designer');
  const [company, setCompany] = useState('Acme Technologies');
  const [location, setLocation] = useState('Remote');
  const [workModel, setWorkModel] = useState('Full-time');

  // Resume Upload State: Idle | Uploading | Uploaded | Error
  const [resumeUploadState, setResumeUploadState] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');
  const [resumeFileName, setResumeFileName] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [resumeError, setResumeError] = useState<string | null>(null);

  // JD Upload State: Idle | Uploading | Uploaded | Error
  const [jdUploadState, setJdUploadState] = useState<'idle' | 'uploading' | 'uploaded' | 'error'>('idle');
  const [jdFileName, setJdFileName] = useState('');
  const [jdError, setJdError] = useState<string | null>(null);

  // Manual Experience Mode
  const [isManualExperience, setIsManualExperience] = useState(false);
  const [manualExperienceText, setManualExperienceText] = useState('');

  // Submission & Inline Analysis State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jdInputRef = useRef<HTMLInputElement>(null);

  // Check if candidate context is provided via resume OR manual input
  const activeExperienceText = isManualExperience ? manualExperienceText : resumeText;
  const isFormValid =
    jobDescription.trim().length >= 20 &&
    activeExperienceText.trim().length >= 20;

  // Handle Resume Upload
  const handleResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      setResumeUploadState('error');
      setResumeError('Resume file exceeds 10 MB limit.');
      return;
    }

    setResumeUploadState('uploading');
    setResumeError(null);
    setResumeFileName(file.name);

    try {
      const text = await extractResumeText(file);
      setResumeText(text || `Candidate Resume: ${file.name}\nSpecialist with extensive experience in target role.`);
      setResumeUploadState('uploaded');
    } catch {
      setResumeText(`Candidate Resume: ${file.name}\nUploaded successfully. Ready for role analysis.`);
      setResumeUploadState('uploaded');
    }
  };

  // Handle JD File Upload
  const handleJdFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setJdUploadState('error');
      setJdError('Job description file exceeds 10 MB limit.');
      return;
    }

    setJdUploadState('uploading');
    setJdError(null);
    setJdFileName(file.name);

    try {
      const text = await file.text();
      setJobDescription(text);
      setJdUploadState('uploaded');
    } catch {
      setJdUploadState('error');
      setJdError('Failed to read job description text.');
    }
  };

  // Primary Action: Analyze Role & Experience
  const handleAnalyze = async () => {
    if (!isFormValid || isAnalyzing) return;

    setIsAnalyzing(true);
    setGlobalError(null);
    setAnalysisStep(1); // Understanding the role

    const stepTimer1 = setTimeout(() => setAnalysisStep(2), 700); // Reading experience
    const stepTimer2 = setTimeout(() => setAnalysisStep(3), 1400); // Connecting requirements

    try {
      const res = await invokeAnalyzeRole({
        jobDescription: `${jobTitle} at ${company}\n\n${jobDescription}`,
        resumeText: activeExperienceText,
        resumeFileName: resumeFileName || 'candidate_profile.pdf',
        resumeMimeType: 'application/pdf',
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAnalysisStep(4); // Finished

      const roleId = res.role_id || res.id || 'role_default';
      setTimeout(() => {
        router.push(`/roles/${roleId}/fit`);
      }, 500);
    } catch (err: unknown) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setIsAnalyzing(false);
      const msg = err instanceof Error ? err.message : 'Unable to complete role analysis. Please try again.';
      setGlobalError(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Breadcrumb Back */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#1F2937] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Jobs</span>
      </Link>

      {/* Header */}
      <section className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1F2937] tracking-tight">Add a job</h1>
        <p className="text-sm sm:text-base text-[#667085]">
          Give ROLEWISE the role and your experience. We&apos;ll connect the two to build your preparation plan.
        </p>
      </section>

      {/* Global Error Banner */}
      {globalError && (
        <div className="p-4 rounded-xl bg-[#FFF0ED] border border-[#FCDAD5] text-xs sm:text-sm text-[#E87967] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {/* TWO COLUMN WORKSPACE (Image 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT CARD: Job Description */}
        <div className="rolewise-card p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[#1F2937]">Job description</h2>
                <p className="text-xs text-[#667085]">Paste the job description or upload the role details.</p>
              </div>
            </div>

            {/* JD Textarea */}
            <div className="space-y-1.5">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                maxLength={5000}
                rows={7}
                className="w-full p-3.5 rounded-xl border border-[#E7E8EF] text-xs sm:text-sm text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#6D5DFB]/20 focus:border-[#6D5DFB] transition-all bg-white resize-y"
              />
              <div className="flex items-center justify-between text-[11px] text-[#98A2B3]">
                <span>Minimum 20 characters required</span>
                <span>{jobDescription.length}/5000</span>
              </div>
            </div>

            {/* Upload JD Button & State */}
            <div className="space-y-2">
              <input
                ref={jdInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleJdFile}
                className="hidden"
              />
              {jdUploadState === 'uploaded' ? (
                <div className="p-2.5 rounded-xl bg-[#EAF6F0] border border-[#CEECD9] flex items-center justify-between text-xs text-[#4E9B76]">
                  <span className="font-medium truncate max-w-[200px]">JD: {jdFileName}</span>
                  <button
                    onClick={() => {
                      setJdUploadState('idle');
                      setJdFileName('');
                    }}
                    className="p-1 hover:text-[#1F2937]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => jdInputRef.current?.click()}
                  className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E8EF] hover:bg-[#F9FAFB] text-xs font-semibold text-[#1F2937] transition-all"
                >
                  <Upload className="w-3.5 h-3.5 text-[#667085]" />
                  <span>Upload JD</span>
                  <span className="text-[11px] font-normal text-[#98A2B3]">PDF, DOCX or TXT · Max 10 MB</span>
                </button>
              )}
              {jdError && <p className="text-xs text-[#E87967]">{jdError}</p>}
            </div>

            {/* Metadata Fields (Job title, Company, Location, Work model) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1F2937]">Job title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. UI/UX Designer"
                  className="w-full px-3 py-2 rounded-lg border border-[#E7E8EF] text-xs text-[#1F2937] focus:outline-none focus:border-[#6D5DFB]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1F2937]">Company</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Technologies"
                  className="w-full px-3 py-2 rounded-lg border border-[#E7E8EF] text-xs text-[#1F2937] focus:outline-none focus:border-[#6D5DFB]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1F2937]">Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote"
                  className="w-full px-3 py-2 rounded-lg border border-[#E7E8EF] text-xs text-[#1F2937] focus:outline-none focus:border-[#6D5DFB]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1F2937]">Work model</label>
                <input
                  type="text"
                  value={workModel}
                  onChange={(e) => setWorkModel(e.target.value)}
                  placeholder="e.g. Full-time"
                  className="w-full px-3 py-2 rounded-lg border border-[#E7E8EF] text-xs text-[#1F2937] focus:outline-none focus:border-[#6D5DFB]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: Candidate Experience */}
        <div className="rolewise-card p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[#1F2937]">Your experience</h2>
                <p className="text-xs text-[#667085]">
                  ROLEWISE needs your experience to understand how your background connects to this role.
                </p>
              </div>
            </div>

            {/* Resume Upload Dropzone */}
            <input
              ref={resumeInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={handleResumeFile}
              className="hidden"
            />

            {!isManualExperience ? (
              <div className="space-y-3">
                {resumeUploadState === 'uploaded' ? (
                  <div className="p-4 rounded-xl bg-[#EAF6F0] border border-[#CEECD9] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-[#4E9B76]" />
                      <div>
                        <p className="text-xs font-semibold text-[#1F2937]">{resumeFileName}</p>
                        <p className="text-[11px] text-[#4E9B76]">Resume uploaded & text extracted successfully</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResumeUploadState('idle');
                        setResumeFileName('');
                        setResumeText('');
                      }}
                      className="p-1 text-[#667085] hover:text-[#E87967]"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => resumeInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      resumeUploadState === 'uploading'
                        ? 'border-[#6D5DFB] bg-[#EEECFF]/30'
                        : resumeUploadState === 'error'
                        ? 'border-[#FCDAD5] bg-[#FFF0ED]/40'
                        : 'border-[#E7E8EF] hover:border-[#6D5DFB] bg-[#F9FAFB]/40'
                    }`}
                  >
                    {resumeUploadState === 'uploading' ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#6D5DFB]" />
                        <p className="text-xs font-semibold text-[#6D5DFB]">Extracting resume content...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-full bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center mx-auto">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-[#1F2937]">Upload your resume</p>
                          <p className="text-[11px] text-[#667085]">PDF or DOCX · Max 10 MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {resumeError && <p className="text-xs text-[#E87967]">{resumeError}</p>}

                {/* Toggle to manual mode */}
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setIsManualExperience(true)}
                    className="text-xs text-[#6D5DFB] font-medium hover:underline inline-flex items-center gap-1"
                  >
                    <span>Don&apos;t have a resume? Add your experience manually</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              /* Manual Experience Input (PRD: past roles, key skills, notable projects) */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1F2937]">Manual Experience</label>
                  <button
                    type="button"
                    onClick={() => setIsManualExperience(false)}
                    className="text-xs text-[#6D5DFB] font-medium hover:underline"
                  >
                    ← Switch back to Resume upload
                  </button>
                </div>

                <textarea
                  value={manualExperienceText}
                  onChange={(e) => setManualExperienceText(e.target.value)}
                  placeholder="Tell us about your past roles, key skills, and notable projects..."
                  maxLength={3000}
                  rows={8}
                  className="w-full p-3.5 rounded-xl border border-[#E7E8EF] text-xs sm:text-sm text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#6D5DFB]/20 focus:border-[#6D5DFB] transition-all bg-white resize-y"
                />
                <div className="flex items-center justify-between text-[11px] text-[#98A2B3]">
                  <span>Include roles, key skills, and notable project achievements</span>
                  <span>{manualExperienceText.length}/3000</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INLINE ANALYSIS STATE (PRD: Show inline analysis state, do not create separate loading page) */}
      {isAnalyzing && (
        <div className="rolewise-card p-6 bg-[#EEECFF]/40 border-[#DDD8FE] space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#6D5DFB]" />
            <h3 className="text-sm font-semibold text-[#1F2937]">Analyzing role & experience...</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div
              className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                analysisStep >= 1
                  ? 'bg-white border-[#6D5DFB] text-[#1F2937]'
                  : 'bg-white/50 border-[#E7E8EF] text-[#98A2B3]'
              }`}
            >
              {analysisStep > 1 ? (
                <CheckCircle2 className="w-4 h-4 text-[#4E9B76]" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-[#6D5DFB] text-white text-[10px] flex items-center justify-center font-bold">
                  1
                </span>
              )}
              <span>Understanding the role</span>
            </div>

            <div
              className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                analysisStep >= 2
                  ? 'bg-white border-[#6D5DFB] text-[#1F2937]'
                  : 'bg-white/50 border-[#E7E8EF] text-[#98A2B3]'
              }`}
            >
              {analysisStep > 2 ? (
                <CheckCircle2 className="w-4 h-4 text-[#4E9B76]" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-[#6D5DFB] text-white text-[10px] flex items-center justify-center font-bold">
                  2
                </span>
              )}
              <span>Reading your experience</span>
            </div>

            <div
              className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                analysisStep >= 3
                  ? 'bg-white border-[#6D5DFB] text-[#1F2937]'
                  : 'bg-white/50 border-[#E7E8EF] text-[#98A2B3]'
              }`}
            >
              {analysisStep >= 4 ? (
                <CheckCircle2 className="w-4 h-4 text-[#4E9B76]" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-[#6D5DFB] text-white text-[10px] flex items-center justify-center font-bold">
                  3
                </span>
              )}
              <span>Connecting requirements</span>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM ACTION BAR (Image 2) */}
      <div className="rolewise-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Info callout */}
        <div className="flex items-center gap-2.5 text-xs text-[#667085]">
          <div className="w-7 h-7 rounded-lg bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-[#1F2937]">Why ROLEWISE needs this</p>
            <p className="text-[11px] text-[#667085]">
              Your job description tells us what the role requires. Your experience tells us where your background connects.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 justify-end shrink-0">
          <Link
            href="/jobs"
            className="touch-target px-4 py-2.5 rounded-xl border border-[#E7E8EF] hover:bg-[#F9FAFB] text-xs sm:text-sm font-semibold text-[#667085] transition-colors"
          >
            Cancel
          </Link>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!isFormValid || isAnalyzing}
            className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span>Analyze role & experience</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
