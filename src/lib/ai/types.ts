export type SupportedAIProvider = 'openrouter' | 'groq' | 'gemini' | 'ollama' | 'openai';
export type SupportedSTTProvider = 'openrouter' | 'groq' | 'openai' | 'huggingface';

export interface CommunicationFeedbackScores {
  clarity: 'Strong' | 'Developing' | 'Needs more detail' | string;
  structure: 'Strong' | 'Developing' | 'Needs more detail' | string;
  specificity: 'Strong' | 'Developing' | 'Needs more detail' | string;
  conciseness: 'Strong' | 'Developing' | 'Needs more detail' | string;
}

export interface AnalyzeAnswerInput {
  role: {
    title: string;
    company: string;
    workplace_type?: string | null;
    location?: string | null;
  };
  requirements: string[];
  candidateExperience?: string | null;
  question: string;
  transcript: string;
  previousQuestions?: string[];
  previousAnswers?: string[];
  preparationItems?: string[];
}

export interface AnalyzeAnswerOutput {
  strengths: string[];
  improvements: string[];
  missing_elements: string[];
  communication_feedback: CommunicationFeedbackScores;
  follow_up_needed: boolean;
  follow_up_reason?: string;
  next_question: string | null;
  next_competency?: string;
}

export interface TranscriptionOutput {
  transcript: string;
  duration_seconds: number;
}
