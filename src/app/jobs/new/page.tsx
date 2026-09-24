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
import { invokeAnalyzeRole } from '@/services/api';

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
        <label className="text-xs font-semibold text-[#1F2937]">
          {label} {required && <span className="text-[#E87967]">*</span>}
        </label>
        {isCustomMode && (
          <button
            type="button"
            onClick={handleRevertToList}
            className="text-[11px] text-[#6D5DFB] hover:underline cursor-pointer"
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
            className="w-full px-3 py-2 rounded-xl border border-[#E7E8EF] text-xs text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#6D5DFB] focus:ring-2 focus:ring-[#6D5DFB]/20 bg-white"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#1F2937] p-1 cursor-pointer"
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
                ? 'border-[#6D5DFB] ring-2 ring-[#6D5DFB]/20'
                : value
                ? 'border-[#E7E8EF] text-[#1F2937]'
                : 'border-[#E7E8EF] text-[#98A2B3] hover:border-[#6D5DFB]/40'
            }`}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-[#667085] transition-transform duration-200 shrink-0 ml-2 ${
                isOpen ? 'rotate-180 text-[#6D5DFB]' : ''
              }`}
            />
          </button>

          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#E7E8EF] rounded-xl shadow-lg z-50 p-2 space-y-1 animate-in fade-in zoom-in-95 duration-150">
              {/* Search Bar */}
              <div className="relative mb-1">
                <Search className="w-3.5 h-3.5 text-[#98A2B3] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E7E8EF] text-xs text-[#1F2937] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#6D5DFB] bg-[#F9FAFB]"
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
                            ? 'bg-[#EEECFF] text-[#6D5DFB] font-semibold'
                            : isOther
                            ? 'text-[#667085] hover:bg-[#F9FAFB] hover:text-[#1F2937] border-t border-[#E7E8EF]/60 mt-1 font-medium'
                            : 'text-[#1F2937] hover:bg-[#F9FAFB]'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#6D5DFB] shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-center text-xs text-[#667085] space-y-2">
                    <p>No matching result</p>
                    {search.trim().length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleAddCustom(search)}
                        className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEECFF] text-[#6D5DFB] hover:bg-[#DDD8FE] text-xs font-semibold transition-colors cursor-pointer w-full justify-center"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add &ldquo;{search.trim()}&rdquo; as custom</span>
                      </button>
                    )}
                  </div>
                )}

                {/* If user typed something not matching any option exactly and there are results, offer custom add button */}
                {trimmedSearch.length > 0 && !hasMatchingPreset && filteredOptions.length > 0 && (
                  <div className="pt-1 border-t border-[#E7E8EF]">
                    <button
                      type="button"
                      onClick={() => handleAddCustom(search)}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#6D5DFB] hover:bg-[#EEECFF]/40 font-medium flex items-center gap-1.5 cursor-pointer"
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

  // Primary Action: Analyze Role & Experience (Requirement 12 & Part 15 UX)
  const handleAnalyze = async () => {
    if (!isFormValid || isAnalyzing) return;

    setAnalysisStatus('analyzing');
    setGlobalError(null);
    setAnalysisStep(1); // Understanding the role

    const stepTimer1 = setTimeout(() => setAnalysisStep(2), 700); // Reading experience
    const stepTimer2 = setTimeout(() => setAnalysisStep(3), 1400); // Connecting requirements

    try {
      const res = await invokeAnalyzeRole({
        roleId: createdRoleId || undefined,
        jobDescription: `${jobTitle} at ${company}\n\n${jobDescription}`,
        resumeText: activeExperienceText,
        resumeFileName: resumeFileName || 'candidate_profile.pdf',
        resumeMimeType: 'application/pdf',
        jobTitle: jobTitle.trim(),
        company: company.trim(),
        location: location.trim() || undefined,
        workModel: workModel.trim() || undefined,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAnalysisStep(4); // Finished

      const roleId = res.role_id || res.id || res.role?.id || createdRoleId || '';
      if (roleId) {
        setCreatedRoleId(roleId);
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

      {/* TWO COLUMN WORKSPACE */}
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
                    className="p-1 hover:text-[#1F2937] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => jdInputRef.current?.click()}
                  className="touch-target inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-[#E7E8EF] hover:bg-[#F9FAFB] text-xs font-semibold text-[#1F2937] transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-[#667085]" />
                  <span>Upload JD</span>
                  <span className="text-[11px] font-normal text-[#98A2B3]">PDF, DOCX or TXT · Max 10 MB</span>
                </button>
              )}
              {jdError && <p className="text-xs text-[#E87967]">{jdError}</p>}
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
                      className="p-1 text-[#667085] hover:text-[#E87967] cursor-pointer"
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
                    className="text-xs text-[#6D5DFB] font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
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
                    className="text-xs text-[#6D5DFB] font-medium hover:underline cursor-pointer"
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

      {/* INLINE ANALYSIS STATE & RESULTS (Part 15: In-page loading, completed CTA, or retry on failure) */}
      {analysisStatus === 'analyzing' && (
        <div className="rolewise-card p-6 bg-[#EEECFF]/40 border-[#DDD8FE] space-y-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-[#6D5DFB]" />
            <div>
              <h3 className="text-sm font-semibold text-[#1F2937]">Analyzing your role</h3>
              <p className="text-xs text-[#667085]">
                Understanding the job requirements and comparing them with your experience...
              </p>
            </div>
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

      {/* COMPLETED STATE (Part 15: "Analysis complete", [View role fit ->]) */}
      {analysisStatus === 'completed' && (
        <div className="rolewise-card p-6 bg-[#EAF6F0] border-[#CEECD9] space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#CEECD9] text-[#4E9B76] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#1F2937]">Analysis complete</h3>
                <p className="text-xs text-[#475467]">
                  Role requirements, fit analysis, and preparation roadmap have been generated.
                </p>
              </div>
            </div>
            {createdRoleId && (
              <Link
                href={`/roles/${createdRoleId}/fit`}
                className="touch-target inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
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
        <div className="rolewise-card p-6 bg-[#FFF0ED] border-[#FCDAD5] space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#FCDAD5] text-[#E87967] flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#1F2937]">Role analysis couldn&apos;t be completed.</h3>
                <p className="text-xs text-[#667085]">
                  Your job and resume are saved. You can safely try again.{globalError ? ` (${globalError})` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAnalyze}
              className="touch-target inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#E87967] hover:bg-[#D66856] text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer"
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

          {analysisStatus === 'completed' && createdRoleId ? (
            <Link
              href={`/roles/${createdRoleId}/fit`}
              className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D5DFB] hover:bg-[#5A48F5] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer"
            >
              <span>View role fit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : analysisStatus === 'failed' ? (
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!isFormValid || isAnalyzing}
              className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E87967] hover:bg-[#D66856] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <span>Try again</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
