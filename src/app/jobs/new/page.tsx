'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  ChevronDown,
  Search,
  Check,
  Plus,
} from 'lucide-react';
import { extractResumeText } from '@/lib/extractor';
import { invokeAnalyzeRole, getSupabaseClient } from '@/services/api';

// Common job roles (Requirement 1)
const JOB_TITLE_OPTIONS = [
  'Product Designer',
  'UX Designer',
  'UI/UX Designer',
  'UI Designer',
  'User Experience Designer',
  'Product Manager',
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'Data Analyst',
  'Data Scientist',
  'Business Analyst',
  'Marketing Manager',
  'Graphic Designer',
  'Video Editor',
  'Other',
];

// Popular / suggested companies (Requirement 2)
const COMPANY_OPTIONS = [
  'Google',
  'Microsoft',
  'Amazon',
  'Apple',
  'Meta',
  'Adobe',
  'Accenture',
  'Deloitte',
  'IBM',
  'Infosys',
  'TCS',
  'Wipro',
  'Cognizant',
  'Zoho',
  'Freshworks',
  'Other company',
];

// Location options (Requirement 3)
const LOCATION_OPTIONS = ['Remote', 'Hybrid', 'On-site', 'Other'];

// Work model options (Requirement 4)
const WORK_MODEL_OPTIONS = [
  'Full-time',
  'Part-time',
  'Contract',
  'Freelance',
  'Internship',
  'Temporary',
  'Other',
];

interface SearchableDropdownProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (val: string) => void;
  options: string[];
  placeholder: string;
  searchPlaceholder?: string;
  otherOptionLabel?: string;
  customInputPlaceholder?: string;
}

function SearchableDropdown({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Search...',
  otherOptionLabel = 'Other',
  customInputPlaceholder = 'Enter custom value...',
}: SearchableDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Focus custom input when entering custom mode
  useEffect(() => {
    if (isCustomMode && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [isCustomMode]);

  const handleSelectOption = (opt: string) => {
    if (opt === otherOptionLabel) {
      setIsCustomMode(true);
      onChange('');
      setIsOpen(false);
      setSearch('');
    } else {
      onChange(opt);
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleAddCustom = (customVal: string) => {
    onChange(customVal.trim());
    setIsCustomMode(true);
    setIsOpen(false);
    setSearch('');
  };

  const handleRevertToList = () => {
    setIsCustomMode(false);
    onChange('');
    setIsOpen(true);
  };

  // Filtered options based on search query
  const trimmedSearch = search.trim().toLowerCase();
  const filteredOptions = options.filter((opt) => {
    if (opt === otherOptionLabel) return true; // keep "Other" visible
    return opt.toLowerCase().includes(trimmedSearch);
  });

  const hasMatchingPreset = options.some(
    (opt) => opt.toLowerCase() === trimmedSearch && opt !== otherOptionLabel.toLowerCase()
  );

  return (
    <div ref={dropdownRef} className="space-y-1 relative">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-[#252525]">
          {label} {required && <span className="text-[#D97968]">*</span>}
        </label>
        {isCustomMode && (
          <button
            type="button"
            onClick={handleRevertToList}
            className="text-[11px] text-[#252525] hover:underline cursor-pointer"
          >
            ← Choose from list
          </button>
        )}
      </div>

      {isCustomMode ? (
        <div className="relative">
          <input
            ref={customInputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={customInputPlaceholder}
            className="w-full px-3 py-2 rounded-xl border border-[#D9D8D2] text-xs text-[#252525] placeholder:text-[#9A9B9E] focus:outline-none focus:border-[#252525] focus:ring-2 focus:ring-[#252525]/20 bg-white"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9A9B9E] hover:text-[#252525] p-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full touch-target px-3.5 py-2.5 rounded-xl border text-xs text-left flex items-center justify-between transition-colors bg-white cursor-pointer ${
              isOpen
                ? 'border-[#252525] ring-2 ring-[#252525]/20'
                : value
                ? 'border-[#D9D8D2] text-[#252525]'
                : 'border-[#D9D8D2] text-[#9A9B9E] hover:border-[#252525]/40'
            }`}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#73757A] transition-transform duration-200 shrink-0 ml-2 ${
                isOpen ? 'rotate-180 text-[#252525]' : ''
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D9D8D2] rounded-xl shadow-lg z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              {/* Search Bar */}
              <div className="relative mb-1">
                <Search className="w-3.5 h-3.5 text-[#9A9B9E] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#D9D8D2] text-xs text-[#252525] placeholder:text-[#9A9B9E] focus:outline-none focus:border-[#252525] bg-[#FAF9F4]"
                />
              </div>

              {/* Options List */}
              <div className="max-h-52 overflow-y-auto space-y-0.5 pr-0.5">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const isSelected = value === opt;
                    const isOther = opt === otherOptionLabel;
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#FFF2B8] text-[#252525] font-semibold'
                            : isOther
                            ? 'text-[#73757A] hover:bg-[#FAF9F4] hover:text-[#252525] border-t border-[#D9D8D2]/60 mt-1 font-medium'
                            : 'text-[#252525] hover:bg-[#FAF9F4]'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#252525] shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-[#73757A] space-y-2">
                    <p>No matching result</p>
                    {search.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleAddCustom(search)}
                        className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FFF2B8] text-[#252525] hover:bg-[#FFF2B8] text-xs font-semibold transition-colors cursor-pointer w-full justify-center"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add &ldquo;{search.trim()}&rdquo; as custom</span>
                      </button>
                    )}
                  </div>
                )}

                {/* If user typed something not matching any option exactly and there are results, offer custom add button */}
                {trimmedSearch.length > 0 && !hasMatchingPreset && filteredOptions.length > 0 && (
                  <div className="pt-1 border-t border-[#D9D8D2]">
                    <button
                      type="button"
                      onClick={() => handleAddCustom(search)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#252525] hover:bg-[#FFF2B8]/40 font-medium flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add &ldquo;{search.trim()}&rdquo; as custom</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AddJobPage() {
  const router = useRouter();

  // Form State: strictly start completely empty (Requirement 5 & 11)
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [workModel, setWorkModel] = useState('');

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
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'analyzing' | 'completed' | 'failed'>('idle');
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [createdRoleId, setCreatedRoleId] = useState<string | null>(null);
  const [createdResumeId, setCreatedResumeId] = useState<string | null>(null);

  const resumeInputRef = useRef<HTMLInputElement>(null);
  const jdInputRef = useRef<HTMLInputElement>(null);

  const isAnalyzing = analysisStatus === 'analyzing';

  // Validation: Required = jobTitle, company, jobDescription, activeExperience (Requirement 9)
  const activeExperienceText = isManualExperience ? manualExperienceText : resumeText;
  const isFormValid =
    jobTitle.trim().length > 0 &&
    company.trim().length > 0 &&
    jobDescription.trim().length >= 20 &&
    activeExperienceText.trim().length >= 20;

  // Handle Resume Upload
  const handleResumeFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset pre-created resume id if new file selected
    setCreatedResumeId(null);

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
      if (!text || text.trim().length === 0) {
        throw new Error('Could not extract text from the uploaded file.');
      }
      setResumeText(text);
      setResumeUploadState('uploaded');
      console.log('[Rolewise] resume extraction', {
        resumeId: 'pending',
        resumeFileName: file.name,
        hasResumeText: Boolean(text),
        resumeTextLength: text.length,
      });
    } catch (err: unknown) {
      setResumeUploadState('error');
      setResumeError(
        err instanceof Error ? err.message : 'Could not extract text from the uploaded resume.'
      );
      console.error('[Rolewise] resume extraction error:', err);
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

  // Primary Action: Analyze Role & Experience (Sequence: Auth -> Resume -> Role -> AI Analysis)
  const handleAnalyze = async () => {
    if (!isFormValid || isAnalyzing) return;

    setAnalysisStatus('analyzing');
    setGlobalError(null);
    setAnalysisStep(1); // Understanding the role

    const stepTimer1 = setTimeout(() => setAnalysisStep(2), 700); // Reading experience
    const stepTimer2 = setTimeout(() => setAnalysisStep(3), 1400); // Connecting requirements

    try {
      // 1. Authenticate user
      const supabase = getSupabaseClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;

      if (sessionError || !user) {
        clearTimeout(stepTimer1);
        clearTimeout(stepTimer2);
        setAnalysisStatus('failed');
        setGlobalError('You must be signed in to add a job.');
        return;
      }

      const fileName = resumeFileName || (isManualExperience ? 'manual_experience.txt' : 'candidate_resume.pdf');

      // Safe logging before resume persistence (Requirement 5)
      console.log('[Rolewise] resume persistence context', {
        authenticated: Boolean(user),
        userIdPresent: Boolean(user?.id),
        fileNamePresent: Boolean(fileName),
        resumeTextPresent: Boolean(activeExperienceText && activeExperienceText.trim().length > 0),
        resumeTextLength: activeExperienceText?.length ?? 0,
      });

      // 2. Create or reuse resume record (Requirement 10 & 11)
      let resumeId = createdResumeId;
      if (!resumeId) {
        const { data: resumeRow, error: resumeInsertError } = await supabase
          .from('resumes')
          .insert({
            user_id: user.id,
            file_name: fileName,
            file_path: null,
            mime_type: isManualExperience ? 'text/plain' : 'application/pdf',
            resume_text: activeExperienceText.trim(),
          })
          .select('id')
          .single();

        if (resumeInsertError || !resumeRow) {
          console.error('[Rolewise] resume insert failed', {
            code: resumeInsertError?.code,
            message: resumeInsertError?.message,
            details: resumeInsertError?.details,
            hint: resumeInsertError?.hint,
          });
          clearTimeout(stepTimer1);
          clearTimeout(stepTimer2);
          setAnalysisStatus('failed');
          setGlobalError("Your resume couldn't be saved. Your uploaded file is still available. Please try again.");
          return;
        }

        resumeId = resumeRow.id;
        setCreatedResumeId(resumeId);

        console.log('[Rolewise] resume extraction', {
          resumeId,
          resumeFileName: fileName,
          hasResumeText: Boolean(activeExperienceText && activeExperienceText.trim().length > 0),
          resumeTextLength: activeExperienceText?.length ?? 0,
        });
      }

      // 3. Create or reuse role record using resume_id (Requirement 10 & 11)
      let roleId = createdRoleId;
      if (!roleId) {
        const { data: roleRow, error: roleInsertError } = await supabase
          .from('roles')
          .insert({
            user_id: user.id,
            job_title: jobTitle.trim(),
            company: company.trim(),
            location: location.trim() || null,
            work_model: workModel.trim() || null,
            job_description: `${jobTitle} at ${company}\n\n${jobDescription}`.trim(),
            resume_id: resumeId,
            status: 'analyzing',
          })
          .select('id')
          .single();

        if (roleInsertError || !roleRow) {
          console.error('[Rolewise] role insert failed', {
            code: roleInsertError?.code,
            message: roleInsertError?.message,
            details: roleInsertError?.details,
            hint: roleInsertError?.hint,
          });
          clearTimeout(stepTimer1);
          clearTimeout(stepTimer2);
          setAnalysisStatus('failed');
          setGlobalError("Your job couldn't be saved. Please try again.");
          return;
        }

        roleId = roleRow.id;
        setCreatedRoleId(roleId);
      }

      // 4. Run role analysis via analyze-role edge function
      const res = await invokeAnalyzeRole({
        roleId: roleId || undefined,
        resumeId: resumeId || undefined,
        jobDescription: `${jobTitle} at ${company}\n\n${jobDescription}`,
        resumeText: activeExperienceText,
        resumeFileName: fileName,
        resumeMimeType: isManualExperience ? 'text/plain' : 'application/pdf',
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        location: location.trim() || undefined,
        workModel: workModel.trim() || undefined,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAnalysisStep(4); // Finished

      const finalRoleId = res.role_id || res.id || res.role?.id || roleId;
      if (finalRoleId) {
        setCreatedRoleId(finalRoleId);
      }
      setAnalysisStatus('completed');
    } catch (err: unknown) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAnalysisStatus('failed');
      const msg = err instanceof Error ? err.message : 'Unable to complete role analysis. Please try again.';
      setGlobalError(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* Breadcrumb Back */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#73757A] hover:text-[#252525] transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to My Jobs</span>
      </Link>

      {/* Header */}
      <section className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#252525] tracking-tight">Add a job</h1>
        <p className="text-sm sm:text-base text-[#73757A]">
          Give ROLEWISE the role and your experience. We&apos;ll connect the two to build your preparation plan.
        </p>
      </section>

      {/* Global Error Banner */}
      {globalError && (
        <div className="p-4 rounded-xl bg-[#FFF0ED] border border-[#F6D8D1] text-xs sm:text-sm text-[#D97968] flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {/* TWO COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT CARD: Job Description */}
        <div className="rolewise-card p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FFF2B8] text-[#252525] flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[#252525]">Job description</h2>
                <p className="text-xs text-[#73757A]">Paste the job description or upload the role details.</p>
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
                className="w-full p-3.5 rounded-xl border border-[#D9D8D2] text-xs sm:text-sm text-[#252525] placeholder:text-[#9A9B9E] focus:outline-none focus:ring-2 focus:ring-[#252525]/20 focus:border-[#252525] transition-all bg-white resize-y"
              />
              <div className="flex items-center justify-between text-[11px] text-[#9A9B9E]">
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
                <div className="p-2.5 rounded-xl bg-[#EEF7F0] border border-[#DDEEDF] flex items-center justify-between text-xs text-[#6FA77F]">
                  <span className="font-medium truncate max-w-[200px]">JD: {jdFileName}</span>
                  <button
                    onClick={() => {
                      setJdUploadState('idle');
                      setJdFileName('');
                    }}
                    className="p-1 hover:text-[#252525] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => jdInputRef.current?.click()}
                  className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#D9D8D2] hover:bg-[#FAF9F4] text-xs font-semibold text-[#252525] transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#73757A]" />
                  <span>Upload JD</span>
                  <span className="text-[11px] font-normal text-[#9A9B9E]">PDF, DOCX or TXT · Max 10 MB</span>
                </button>
              )}
              {jdError && <p className="text-xs text-[#D97968]">{jdError}</p>}
            </div>

            {/* Metadata Fields: Searchable Selectors (Requirements 1, 2, 3, 4, 5, 6, 7, 8, 10, 13) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* Job title */}
              <SearchableDropdown
                label="Job title"
                required
                value={jobTitle}
                onChange={setJobTitle}
                options={JOB_TITLE_OPTIONS}
                placeholder="Select a job title"
                searchPlaceholder="Search job titles..."
                otherOptionLabel="Other"
                customInputPlaceholder="Enter your job title..."
              />

              {/* Company */}
              <SearchableDropdown
                label="Company"
                required
                value={company}
                onChange={setCompany}
                options={COMPANY_OPTIONS}
                placeholder="Search or select a company"
                searchPlaceholder="Search companies..."
                otherOptionLabel="Other company"
                customInputPlaceholder="Enter company name..."
              />

              {/* Location */}
              <SearchableDropdown
                label="Location"
                value={location}
                onChange={setLocation}
                options={LOCATION_OPTIONS}
                placeholder="Select location"
                searchPlaceholder="Search location..."
                otherOptionLabel="Other"
                customInputPlaceholder="Enter location (e.g. San Francisco, CA)..."
              />

              {/* Work model */}
              <SearchableDropdown
                label="Work model"
                value={workModel}
                onChange={setWorkModel}
                options={WORK_MODEL_OPTIONS}
                placeholder="Select work model"
                searchPlaceholder="Search work model..."
                otherOptionLabel="Other"
                customInputPlaceholder="Enter work model..."
              />
            </div>
          </div>
        </div>

        {/* RIGHT CARD: Candidate Experience */}
        <div className="rolewise-card p-6 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FFF2B8] text-[#252525] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-semibold text-[#252525]">Your experience</h2>
                <p className="text-xs text-[#73757A]">
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
                  <div className="p-4 rounded-xl bg-[#EEF7F0] border border-[#DDEEDF] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-5 h-5 text-[#6FA77F]" />
                      <div>
                        <p className="text-xs font-semibold text-[#252525]">{resumeFileName}</p>
                        <p className="text-[11px] text-[#6FA77F]">Resume uploaded & text extracted successfully</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResumeUploadState('idle');
                        setResumeFileName('');
                        setResumeText('');
                      }}
                      className="p-1 text-[#73757A] hover:text-[#D97968] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => resumeInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                      resumeUploadState === 'uploading'
                        ? 'border-[#252525] bg-[#FFF2B8]/30'
                        : resumeUploadState === 'error'
                        ? 'border-[#F6D8D1] bg-[#FFF0ED]/40'
                        : 'border-[#D9D8D2] hover:border-[#252525] bg-[#FAF9F4]/40'
                    }`}
                  >
                    {resumeUploadState === 'uploading' ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-[#252525]" />
                        <p className="text-xs font-semibold text-[#252525]">Extracting resume content...</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-full bg-[#FFF2B8] text-[#252525] flex items-center justify-center mx-auto">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-[#252525]">Upload your resume</p>
                          <p className="text-[11px] text-[#73757A]">PDF or DOCX · Max 10 MB</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {resumeError && <p className="text-xs text-[#D97968]">{resumeError}</p>}

                {/* Toggle to manual mode */}
                <div className="pt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setIsManualExperience(true)}
                    className="text-xs text-[#252525] font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
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
                  <label className="text-xs font-semibold text-[#252525]">Manual Experience</label>
                  <button
                    type="button"
                    onClick={() => setIsManualExperience(false)}
                    className="text-xs text-[#252525] font-medium hover:underline cursor-pointer"
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
                  className="w-full p-3.5 rounded-xl border border-[#D9D8D2] text-xs sm:text-sm text-[#252525] placeholder:text-[#9A9B9E] focus:outline-none focus:ring-2 focus:ring-[#252525]/20 focus:border-[#252525] transition-all bg-white resize-y"
                />
                <div className="flex items-center justify-between text-[11px] text-[#9A9B9E]">
                  <span>Include roles, key skills, and notable project achievements</span>
                  <span>{manualExperienceText.length}/3000</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* INLINE ANALYSIS STATE & RESULTS (Part 15: In-page loading, completed CTA, or retry on failure) */}
      {analysisStatus === 'analyzing' && (
        <div className="rolewise-card p-6 bg-[#FFF2B8]/40 border-[#FFF2B8] space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#252525]" />
            <div>
              <h3 className="text-sm font-semibold text-[#252525]">Analyzing your role</h3>
              <p className="text-xs text-[#73757A]">
                Understanding the job requirements and comparing them with your experience...
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div
              className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                analysisStep >= 1
                  ? 'bg-white border-[#252525] text-[#252525]'
                  : 'bg-white/50 border-[#D9D8D2] text-[#9A9B9E]'
              }`}
            >
              {analysisStep > 1 ? (
                <CheckCircle2 className="w-4 h-4 text-[#6FA77F]" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-[#FFD84D] text-[#252525] text-[10px] flex items-center justify-center font-bold">
                  1
                </span>
              )}
              <span>Understanding the role</span>
            </div>

            <div
              className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                analysisStep >= 2
                  ? 'bg-white border-[#252525] text-[#252525]'
                  : 'bg-white/50 border-[#D9D8D2] text-[#9A9B9E]'
              }`}
            >
              {analysisStep > 2 ? (
                <CheckCircle2 className="w-4 h-4 text-[#6FA77F]" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-[#FFD84D] text-[#252525] text-[10px] flex items-center justify-center font-bold">
                  2
                </span>
              )}
              <span>Reading your experience</span>
            </div>

            <div
              className={`p-3 rounded-xl border transition-all flex items-center gap-2 ${
                analysisStep >= 3
                  ? 'bg-white border-[#252525] text-[#252525]'
                  : 'bg-white/50 border-[#D9D8D2] text-[#9A9B9E]'
              }`}
            >
              {analysisStep >= 4 ? (
                <CheckCircle2 className="w-4 h-4 text-[#6FA77F]" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-[#FFD84D] text-[#252525] text-[10px] flex items-center justify-center font-bold">
                  3
                </span>
              )}
              <span>Connecting requirements</span>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETED STATE (Part 15: "Analysis complete", [View role fit ->]) */}
      {analysisStatus === 'completed' && (
        <div className="rolewise-card p-6 bg-[#EEF7F0] border-[#DDEEDF] space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#DDEEDF] text-[#6FA77F] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#252525]">Analysis complete</h3>
                <p className="text-xs text-[#55565A]">
                  Role requirements, fit analysis, and preparation roadmap have been generated.
                </p>
              </div>
            </div>
            {createdRoleId && (
              <Link
                href={`/roles/${createdRoleId}/fit`}
                className="touch-target inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
              >
                <span>View role fit</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* FAILED STATE (Part 15: "Role analysis couldn't be completed. Your job and resume are saved.", [Try again]) */}
      {analysisStatus === 'failed' && (
        <div className="rolewise-card p-6 bg-[#FFF0ED] border-[#F6D8D1] space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#F6D8D1] text-[#D97968] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#252525]">Role analysis couldn&apos;t be completed.</h3>
                <p className="text-xs text-[#73757A]">
                  Your job and resume are saved. You can safely try again.{globalError ? ` (${globalError})` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              className="touch-target inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#D97968] hover:bg-[#C96555] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
            >
              <span>Try again</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM ACTION BAR */}
      <div className="rolewise-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Info callout */}
        <div className="flex items-center gap-2.5 text-xs text-[#73757A]">
          <div className="w-7 h-7 rounded-lg bg-[#FFF2B8] text-[#252525] flex items-center justify-center shrink-0">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <p className="font-semibold text-[#252525]">Why ROLEWISE needs this</p>
            <p className="text-[11px] text-[#73757A]">
              Your job description tells us what the role requires. Your experience tells us where your background connects.
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 justify-end shrink-0">
          <Link
            href="/jobs"
            className="touch-target px-4 py-2.5 rounded-xl border border-[#D9D8D2] hover:bg-[#FAF9F4] text-xs sm:text-sm font-semibold text-[#73757A] transition-colors"
          >
            Cancel
          </Link>

          {analysisStatus === 'completed' && createdRoleId ? (
            <Link
              href={`/roles/${createdRoleId}/fit`}
              className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <span>View role fit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : analysisStatus === 'failed' ? (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!isFormValid || isAnalyzing}
              className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D97968] hover:bg-[#C96555] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <span>Try again</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!isFormValid || isAnalyzing}
              className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-xs sm:text-sm font-semibold transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
          )}
        </div>
      </div>
    </div>
  );
}
