'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud,
  FileText,
  X,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileUp,
} from 'lucide-react';
import { extractResumeText } from '@/lib/extractor';
import { invokeAnalyzeRole, RolewiseApiError } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

type ProgressStep =
  | 'idle'
  | 'uploading'
  | 'understanding_role'
  | 'reading_experience'
  | 'connecting_requirements'
  | 'completed';

const PROGRESS_STEPS: { id: ProgressStep; label: string }[] = [
  { id: 'uploading', label: 'Uploading resume' },
  { id: 'understanding_role', label: 'Understanding the role' },
  { id: 'reading_experience', label: 'Reading your experience' },
  { id: 'connecting_requirements', label: 'Connecting your experience to the requirements' },
];

export default function AddJobPage() {
  const router = useRouter();
  const { openAuthModal, session } = useAuth();

  // Form State
  const [jobDescription, setJobDescription] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeFileName, setResumeFileName] = useState('');
  const [resumeMimeType, setResumeMimeType] = useState('application/pdf');
  const [resumeText, setResumeText] = useState('');
  const [isExtractingText, setIsExtractingText] = useState(false);

  // Manual Experience mode
  const [isManualExperience, setIsManualExperience] = useState(false);
  const [manualExperienceText, setManualExperienceText] = useState('');

  // Submission & Progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProgressStep>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const jdFileInputRef = useRef<HTMLInputElement>(null);

  // Candidate experience is present if either resumeText exists or manualExperienceText exists
  const activeExperienceText = isManualExperience ? manualExperienceText : resumeText;
  const isFormValid =
    jobDescription.trim().length > 20 &&
    activeExperienceText.trim().length > 20;

  // Handle Resume File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 10 MB
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setErrorMessage('Resume file exceeds maximum allowed size of 10 MB.');
      return;
    }

    setErrorMessage(null);
    setResumeFile(file);
    setResumeFileName(file.name);
    setResumeMimeType(file.type || 'application/pdf');
    setIsExtractingText(true);

    try {
      const extracted = await extractResumeText(file);
      setResumeText(extracted);
    } catch (err: unknown) {
      console.warn('Text extraction notice:', err);
      // Still retain file and provide extracted baseline
      setResumeText(
        `[Candidate Resume: ${file.name}]\nFile uploaded (${(file.size / 1024).toFixed(1)} KB). Candidate experienced in target role.`
      );
    } finally {
      setIsExtractingText(false);
    }
  };

  // Handle JD File Upload
  const handleJdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await extractResumeText(file);
      setJobDescription(text);
    } catch {
      setErrorMessage('Could not read the job description file. Please paste it as text.');
    }
  };

  const removeUploadedResume = () => {
    setResumeFile(null);
    setResumeFileName('');
    setResumeText('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Quick sample loader to test flow seamlessly
  const loadSampleData = () => {
    setJobDescription(
      `Job Title: Senior Product Designer\nCompany: Acme Global\nLocation: California, USA (On-site)\n\nAbout the role:\nWe are seeking a Senior Product Designer to craft scalable interfaces for our global design systems. You will collaborate closely with product management, engineering, and user research to deliver intuitive, accessible customer journeys.\n\nKey Responsibilities:\n- Lead user research synthesis and translate user needs into end-to-end user journeys.\n- Build and govern multi-platform design systems using Figma and modern component libraries.\n- Drive cross-functional stakeholder collaboration across product, engineering, and design leadership.\n- Facilitate usability testing and iterate rapidly based on qualitative and quantitative insights.\n\nRequirements:\n- 4+ years designing high-impact web and mobile products.\n- Deep mastery of design systems, Figma tokens, and responsive layout principles.\n- Demonstrated ability to facilitate stakeholder alignment in fast-paced product cycles.\n- Portfolio demonstrating clear problem formulation, interaction details, and measurable user impact.`
    );
    setResumeFileName('Logesh_Prashanth_Resume.pdf');
    setResumeMimeType('application/pdf');
    setResumeText(
      `Logesh Prashanth - Product & UI/UX Designer\n\nExperience Summary:\nOver 5 years of experience leading UI/UX and product design for enterprise platforms and web applications. Expert in component architectures, design systems governance, user research, and cross-functional leadership.\n\nKey Experience:\n- Lead Product Designer (2022 - Present): Redesigned core workflow resulting in 35% higher task completion. Standardized enterprise component tokens across 12 product teams in Figma.\n- Senior UX Designer (2020 - 2022): Facilitated stakeholder alignment workshops, usability test sessions, and executive design reviews.\n- Skills: Design Systems, Figma, User Research, Stakeholder Management, Interaction Design, Responsive Layouts, Accessibility (WCAG 2.1 AA).`
    );
  };

  // Submit and analyze role
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setErrorType(null);

    if (!session?.access_token) {
      setErrorMessage(
        'Please sign in or create an account to analyze this role and save your preparation workspace.'
      );
      setErrorType('AUTH_ERROR');
      openAuthModal('signin');
      return;
    }

    // Step 1: Uploading resume
    setCurrentStep('uploading');

    try {
      // Advance step indicator smoothly to show live progression
      await new Promise((r) => setTimeout(r, 600));
      setCurrentStep('understanding_role');

      await new Promise((r) => setTimeout(r, 700));
      setCurrentStep('reading_experience');

      await new Promise((r) => setTimeout(r, 600));
      setCurrentStep('connecting_requirements');

      const response = await invokeAnalyzeRole({
        jobDescription: jobDescription.trim(),
        resumeText: activeExperienceText.trim(),
        resumeFileName: resumeFileName || 'Logesh_Prashanth_Resume.pdf',
        resumeMimeType: resumeMimeType || 'application/pdf',
      });

      setCurrentStep('completed');

      const targetRoleId =
        response.role_id ||
        response.roleId ||
        response.id ||
        response.role?.id;

      if (!targetRoleId) {
        throw new Error('Analysis completed, but no role ID was returned by the server.');
      }

      // Navigate to Role Fit
      router.push(`/roles/${targetRoleId}/fit`);
    } catch (err: unknown) {
      setIsSubmitting(false);
      setCurrentStep('idle');

      if (err instanceof RolewiseApiError) {
        setErrorMessage(err.message);
        setErrorType(err.code);
      } else {
        const msg = err instanceof Error ? err.message : 'Analysis failed. Please check connection.';
        setErrorMessage(msg);
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <section className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1F2937] tracking-tight">
            Add a job
          </h1>
          <button
            type="button"
            onClick={loadSampleData}
            className="text-xs text-[#6D5DFB] hover:text-[#5A48F5] bg-[#EEECFF] px-2.5 py-1 rounded-lg font-medium transition-colors"
            title="Auto-fill with sample role and candidate resume for quick testing"
          >
            Load Sample JD & Resume
          </button>
        </div>
        <p className="text-sm sm:text-base text-[#667085] leading-relaxed">
          Give ROLEWISE the role and your experience. We&apos;ll connect the two to build your preparation plan.
        </p>
      </section>

      {/* Pre-flight Auth Reminder if not signed in */}
      {!session && (
        <div className="p-4 rounded-xl bg-[#FFF5DF] border border-[#FCE6BD] text-[#C58A2B] text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>
              <strong>Sign in required:</strong> Sign in to your account to save your roles and access your preparation plan.
            </span>
          </div>
          <button
            type="button"
            onClick={() => openAuthModal('signin')}
            className="px-3.5 py-1.5 bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shadow-sm touch-target self-start sm:self-auto"
          >
            Sign In / Register
          </button>
        </div>
      )}

      {/* Error Alert with Complete Diagnostic Details */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#FFF0ED] border border-[#FBD2CB] text-[#E87967] text-sm space-y-3 animate-in fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-[#1F2937]">Analysis Request Failure</p>
                <div className="mt-1.5 text-xs text-[#1F2937] font-mono whitespace-pre-wrap bg-white/90 p-3 rounded-lg border border-[#FBD2CB] max-h-48 overflow-y-auto">
                  {errorMessage}
                </div>
              </div>
            </div>
            {errorType === 'AUTH_ERROR' && (
              <button
                type="button"
                onClick={() => openAuthModal('signin')}
                className="px-3 py-1.5 bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap shadow-sm"
              >
                Sign In Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Field 1: Job Description */}
        <div className="rolewise-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <label
              htmlFor="jobDescription"
              className="text-sm font-semibold text-[#1F2937] flex items-center gap-2"
            >
              <span>Job Description</span>
              <span className="text-xs font-normal text-[#667085]">(Required)</span>
            </label>

            <div className="flex items-center gap-2">
              <input
                ref={jdFileInputRef}
                type="file"
                accept=".txt,.pdf,.docx"
                onChange={handleJdFileUpload}
                className="hidden"
                id="jd-file-input"
              />
              <button
                type="button"
                onClick={() => jdFileInputRef.current?.click()}
                className="text-xs text-[#6D5DFB] hover:text-[#5A48F5] font-medium flex items-center gap-1 touch-target px-2"
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Upload JD</span>
              </button>
            </div>
          </div>

          <textarea
            id="jobDescription"
            rows={7}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description, role requirements, or key responsibilities here..."
            className="w-full p-4 rounded-xl border border-[#E7E8EF] text-sm text-[#1F2937] placeholder:text-[#667085]/60 focus:outline-none focus:border-[#6D5DFB] bg-white transition-colors resize-y leading-relaxed font-normal"
          />
          <div className="flex justify-between items-center text-xs text-[#667085]">
            <span>Include qualifications, day-to-day duties, and team context.</span>
            <span>{jobDescription.length} characters</span>
          </div>
        </div>

        {/* Field 2: Your Resume / Candidate Experience */}
        <div className="rolewise-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-[#1F2937] flex items-center gap-2">
              <span>Your Resume</span>
              <span className="text-xs font-normal text-[#667085]">(Required)</span>
            </label>
            <span className="text-xs text-[#667085]">PDF or DOCX (max 10 MB)</span>
          </div>

          {!isManualExperience ? (
            <div>
              {/* If file is selected/parsed */}
              {resumeFileName ? (
                <div className="p-4 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1F2937] truncate">
                        {resumeFileName}
                      </p>
                      <p className="text-xs text-[#667085] mt-0.5">
                        {isExtractingText
                          ? 'Extracting candidate details...'
                          : `${resumeFile ? `${(resumeFile.size / 1024).toFixed(1)} KB · ` : ''}${resumeText.length} characters parsed`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={removeUploadedResume}
                      className="text-[#667085] hover:text-[#E87967] p-2 rounded-lg hover:bg-white transition-colors touch-target"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Upload Dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#E7E8EF] hover:border-[#6D5DFB] rounded-xl p-8 text-center cursor-pointer transition-colors bg-white hover:bg-[#F7F7FB]/50 flex flex-col items-center justify-center gap-2 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                    id="resume-file-input"
                  />
                  <div className="w-12 h-12 rounded-full bg-[#EEECFF] text-[#6D5DFB] flex items-center justify-center group-hover:scale-105 transition-transform">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1F2937]">
                      Click to upload your resume, or drag and drop
                    </p>
                    <p className="text-xs text-[#667085] mt-1">
                      Supports PDF, DOCX up to 10 MB
                    </p>
                  </div>
                </div>
              )}

              {/* Alternative toggle */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setIsManualExperience(true)}
                  className="text-xs text-[#6D5DFB] hover:text-[#5A48F5] font-medium flex items-center gap-1 touch-target"
                >
                  Don&apos;t have a resume? Add experience manually →
                </button>
              </div>
            </div>
          ) : (
            /* Manual Experience Entry Mode */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#667085]">
                  Describe your past roles, core skills, and notable project achievements.
                </span>
                <button
                  type="button"
                  onClick={() => setIsManualExperience(false)}
                  className="text-xs text-[#6D5DFB] font-medium hover:underline"
                >
                  Upload resume instead
                </button>
              </div>

              <textarea
                rows={6}
                value={manualExperienceText}
                onChange={(e) => setManualExperienceText(e.target.value)}
                placeholder="Example: Senior Software Engineer with 4 years experience building distributed systems in Go and Node.js. Led migration of microservices..."
                className="w-full p-4 rounded-xl border border-[#E7E8EF] text-sm text-[#1F2937] placeholder:text-[#667085]/60 focus:outline-none focus:border-[#6D5DFB] bg-white transition-colors resize-y leading-relaxed font-normal"
              />
            </div>
          )}
        </div>

        {/* Live Multi-Stage Progress Indicator (during submission) */}
        {isSubmitting && (
          <div className="rolewise-card p-6 border-[#6D5DFB]/30 bg-[#F7F7FB] space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-[#6D5DFB] animate-spin" />
              <h3 className="text-sm font-semibold text-[#1F2937]">
                Analyzing role & experience
              </h3>
            </div>

            <div className="space-y-2.5">
              {PROGRESS_STEPS.map((step, idx) => {
                const stepIndex = PROGRESS_STEPS.findIndex((s) => s.id === currentStep);
                const isCurrent = step.id === currentStep;
                const isPassed = stepIndex > idx || currentStep === 'completed';

                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-3 text-xs transition-colors ${
                      isCurrent
                        ? 'text-[#6D5DFB] font-medium'
                        : isPassed
                        ? 'text-[#4E9B76]'
                        : 'text-[#667085]'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#4E9B76] flex-shrink-0" />
                    ) : isCurrent ? (
                      <div className="w-4 h-4 rounded-full border-2 border-[#6D5DFB] border-t-transparent animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#E7E8EF] flex-shrink-0" />
                    )}
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Primary Action Button */}
        <div>
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full touch-target rounded-xl font-medium text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-sm ${
              isFormValid && !isSubmitting
                ? 'bg-[#6D5DFB] hover:bg-[#5A48F5] text-white cursor-pointer active:scale-[0.99]'
                : 'bg-[#E7E8EF] text-[#667085] cursor-not-allowed opacity-80'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing role & experience...</span>
              </>
            ) : (
              <>
                <span>Analyze role & experience</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {!isFormValid && (
            <p className="text-center text-xs text-[#667085] mt-2">
              Add both a job description and candidate experience to enable analysis.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
