export type FitStatus =
  | 'Strong alignment'
  | 'Transferable'
  | 'Needs investigation'
  | 'Not demonstrated';

export type PreparationPriority = 'High' | 'Medium' | 'Low';

export interface Profile {
  id: string;
  full_name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  created_at?: string;
}

export interface Role {
  id: string;
  user_id?: string | null;
  title: string;
  job_title?: string;
  company: string;
  location?: string | null;
  workplace_type?: string | null;
  work_model?: string | null;
  status?: string | null;
  resume_id?: string | null;
  job_description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ResumeRecord {
  id: string;
  user_id?: string | null;
  role_id?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  resume_text?: string | null;
  created_at?: string;
}

export interface RoleRequirement {
  id: string;
  role_id: string;
  requirement: string;
  title?: string;
  category?: string | null;
  created_at?: string;
}

export interface FitAnalysis {
  id: string;
  role_id: string;
  requirement_id?: string | null;
  requirement_title?: string | null;
  status: FitStatus | string;
  explanation: string;
  evidence?: string | null;
  created_at?: string;
  // Joined or composite requirement details
  requirement_detail?: RoleRequirement | null;
}

export interface PreparationItem {
  id: string;
  role_id: string;
  requirement_id?: string | null;
  title: string;
  description: string;
  priority: PreparationPriority | string;
  status?: string;
  alignment_status?: FitStatus | string;
  order_index?: number;
  created_at?: string;
}

export interface AnalyzeRolePayload {
  roleId?: string | null;
  resumeId?: string | null;
  jobDescription: string;
  resumeText: string;
  resumeFileName: string;
  resumeMimeType: string;
  jobTitle?: string;
  company?: string;
  location?: string;
  workModel?: string;
}

export interface AnalyzeRoleResponse {
  role_id?: string;
  roleId?: string;
  id?: string;
  role?: {
    id: string;
    title?: string;
    company?: string;
  };
  message?: string;
  success?: boolean;
}

// AI Interview Types
export interface Interview {
  id: string;
  role_id: string;
  user_id?: string | null;
  status: 'in_progress' | 'completed' | string;
  started_at: string;
  completed_at?: string | null;
}

export interface InterviewQuestion {
  id: string;
  interview_id: string;
  question: string;
  competency: string;
  sequence: number;
  created_at?: string;
}

export interface AnswerFeedback {
  relevance: string;
  specificity: string;
  evidence: string;
  outcome: string;
  roleAlignment: string;
  summary?: string;
}

export interface InterviewAnswer {
  id: string;
  question_id: string;
  interview_id: string;
  answer: string;
  feedback: AnswerFeedback;
  created_at?: string;
}

export interface StartInterviewResponse {
  interviewId: string;
  questionId: string;
  question: string;
  competency: string;
}

export interface AnswerInterviewPayload {
  interviewId: string;
  questionId: string;
  answer: string;
}

export interface AnswerInterviewResponse {
  feedback: AnswerFeedback;
  nextQuestion?: {
    questionId: string;
    question: string;
    competency: string;
  } | null;
}

// Real Voice Interview & Communication Practice Types
export interface InterviewSession {
  id: string;
  role_id: string;
  user_id?: string | null;
  status: 'in_progress' | 'completed' | 'abandoned';
  started_at: string;
  completed_at?: string | null;
}

export interface InterviewQuestionRecord {
  id: string;
  session_id: string;
  question_number: number;
  question: string;
  competency: string;
  created_at?: string;
}

export interface InterviewAnswerRecord {
  id: string;
  session_id: string;
  question_id: string;
  user_id?: string | null;
  answer_type: 'voice' | 'text';
  audio_path?: string | null;
  transcript: string;
  duration_seconds?: number | null;
  created_at?: string;
}

export interface CommunicationFeedbackDetails {
  clarity: 'Strong' | 'Developing' | 'Needs more detail' | string;
  structure: 'Strong' | 'Developing' | 'Needs more detail' | string;
  specificity: 'Strong' | 'Developing' | 'Needs more detail' | string;
  conciseness: 'Strong' | 'Developing' | 'Needs more detail' | string;
}

export interface InterviewFeedbackRecord {
  id: string;
  answer_id: string;
  answer_quality?: 'strong' | 'developing' | 'needs_work';
  strengths: string[];
  improvements: string[];
  missing_elements: string[];
  communication_feedback: CommunicationFeedbackDetails;
  follow_up_needed: boolean;
  follow_up_reason?: string | null;
  created_at?: string;
}

export interface VoiceTranscriptionResponse {
  transcript: string;
  duration_seconds: number;
}

export interface CommunicationAnalysisPayload {
  roleId: string;
  question: string;
  transcript: string;
  previousQuestions: string[];
  previousAnswers: string[];
}

export interface CommunicationAnalysisResponse {
  answer_quality: 'strong' | 'developing' | 'needs_work';
  strengths: string[];
  improvements: string[];
  missing_elements: string[];
  communication_feedback: {
    clarity: string;
    structure: string;
    specificity: string;
    conciseness: string;
  };
  follow_up_needed: boolean;
  follow_up_reason?: string;
  next_question?: string;
  next_competency?: string;
  question_number?: number;
}

export interface FinalFeedbackOutput {
  strengths: string[];
  areas_to_improve: string[];
  communication: {
    clarity: string;
    structure: string;
    specificity: string;
    conciseness: string;
  };
  practice_exercises: string[];
}


