'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  Square,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  Award,
} from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import {
  getRole,
  transcribeAudio,
  generateInterviewQuestion,
  analyzeInterviewAnswer,
  getFinalInterviewFeedback,
  RolewiseApiError,
} from '@/services/api';
import { Role, CommunicationAnalysisResponse, FinalFeedbackOutput } from '@/types/database';

type InterviewFlowState = 'READY' | 'ANALYZING' | 'REVIEWED' | 'COMPLETED';

interface CompletedRound {
  questionNumber: number;
  question: string;
  competency: string;
  answerType: 'voice' | 'text';
  transcript: string;
  durationSeconds?: number;
  analysis: CommunicationAnalysisResponse;
}

interface QuestionErrorState {
  title: string;
  description: string;
  type: 'AUTH_ERROR' | 'ROLE_NOT_FOUND' | 'AI_GENERATION_ERROR';
}

interface StoredInterviewSession {
  roleId: string;
  questionNumber: number;
  currentQuestion: string;
  currentCompetency: string;
  answerText: string;
  lastRecordedDuration?: string;
  flowState: InterviewFlowState;
  completedRounds: CompletedRound[];
  currentAnalysis: CommunicationAnalysisResponse | null;
  pendingNext: { question: string; competency: string } | null;
  aiFinalFeedback: FinalFeedbackOutput | null;
}

const getStorageKey = (id: string) => `rolewise:interview:${id}`;

function loadStoredSession(id: string): StoredInterviewSession | null {
  if (typeof window === 'undefined' || !id) return null;
  try {
    const primaryKey = `rolewise:interview:${id}`;
    let raw = sessionStorage.getItem(primaryKey);
    if (!raw) {
      raw = sessionStorage.getItem(`rolewise-interview-${id}`);
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.roleId === id && parsed.currentQuestion) {
      return parsed;
    } else {
      // Discard stale or mismatched interview session
      console.warn('[AI INTERVIEW] Discarding stale interview session for role:', parsed?.roleId || id);
      sessionStorage.removeItem(primaryKey);
      sessionStorage.removeItem(`rolewise-interview-${id}`);
    }
  } catch (e) {
    console.warn('[InterviewPage] Failed to load stored session:', e);
  }
  return null;
}

function saveStoredSession(id: string, data: Partial<StoredInterviewSession>) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const existing = loadStoredSession(id) || ({} as StoredInterviewSession);
    const updated: StoredInterviewSession = {
      ...existing,
      ...data,
      roleId: id,
    };
    sessionStorage.setItem(getStorageKey(id), JSON.stringify(updated));
  } catch (e) {
    console.warn('[InterviewPage] Failed to save stored session:', e);
  }
}

function clearStoredSession(id: string) {
  if (typeof window === 'undefined' || !id) return;
  try {
    sessionStorage.removeItem(`rolewise:interview:${id}`);
    sessionStorage.removeItem(`rolewise-interview-${id}`);
  } catch (e) {
    console.warn('[InterviewPage] Failed to clear stored session:', e);
  }
}

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const { session, isLoading: isAuthLoading } = useAuth();

  const roleId = params?.id as string;

  // Session & question state restored immediately from sessionStorage if available (Requirements 5 & 6)
  const [role, setRole] = useState<Role | null>(null);
  const [isRoleNotFound, setIsRoleNotFound] = useState<boolean>(false);

  const [questionNumber, setQuestionNumber] = useState<number>(() => {
    const saved = loadStoredSession(roleId);
    return saved?.questionNumber || 1;
  });
  const [currentQuestion, setCurrentQuestion] = useState<string>(() => {
    const saved = loadStoredSession(roleId);
    return saved?.currentQuestion || '';
  });
  const [currentCompetency, setCurrentCompetency] = useState<string>(() => {
    const saved = loadStoredSession(roleId);
    return saved?.currentCompetency || '';
  });
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState<boolean>(false);
  const [questionTimeoutOccurred, setQuestionTimeoutOccurred] = useState<boolean>(false);
  const [questionError, setQuestionError] = useState<QuestionErrorState | null>(null);

  // Single Unified Answer State
  const [answerText, setAnswerText] = useState<string>(() => {
    const saved = loadStoredSession(roleId);
    return saved?.answerText || '';
  });
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Recording & Playback State
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [lastRecordedDuration, setLastRecordedDuration] = useState<string>(() => {
    const saved = loadStoredSession(roleId);
    return saved?.lastRecordedDuration || '';
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const recordedBlobRef = useRef<{ blob: Blob; durationSeconds: number; audioUrl: string } | null>(null);

  // Transcription State
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [transcriptionError, setTranscriptionError] = useState<boolean>(false);

  // Flow & Evaluation State
  const [flowState, setFlowState] = useState<InterviewFlowState>(() => {
    const saved = loadStoredSession(roleId);
    return saved?.flowState || 'READY';
  });
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<CommunicationAnalysisResponse | null>(() => {
    const saved = loadStoredSession(roleId);
    return saved?.currentAnalysis || null;
  });
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Completed rounds & Final Feedback
  const [completedRounds, setCompletedRounds] = useState<CompletedRound[]>(() => {
    const saved = loadStoredSession(roleId);
    return saved?.completedRounds || [];
  });
  const [aiFinalFeedback, setAiFinalFeedback] = useState<FinalFeedbackOutput | null>(() => {
    const saved = loadStoredSession(roleId);
    return saved?.aiFinalFeedback || null;
  });

  // Preloaded Next Question
  const [pendingNext, setPendingNext] = useState<{
    question: string;
    competency: string;
  } | null>(() => {
    const saved = loadStoredSession(roleId);
    return saved?.pendingNext || null;
  });

  // Loading Session: false immediately if session is already restored (Requirement 7)
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(() => {
    const saved = loadStoredSession(roleId);
    return !saved?.currentQuestion;
  });

  // Lifecycle guards to prevent duplicate execution (Requirements 1, 2, 3, 13, 14)
  const initializedRef = useRef<boolean>(false);
  const isGeneratingRef = useRef<boolean>(false);
  const activeRequestIdRef = useRef<string>('');
  const questionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Total questions in an interview session
  const totalQuestions = 5;

  // Voice recorder hook (decoupled from AI and auth)
  const {
    isRecording,
    isPermissionDenied,
    permissionError,
    formattedDuration,
    startRecording,
    stopRecording,
    resetRecording,
    clearPermissionError,
  } = useVoiceRecorder();

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (questionTimeoutRef.current) {
        clearTimeout(questionTimeoutRef.current);
      }
    };
  }, []);

  // Fetch question with 15-second client timeout & guaranteed loading resolution
  const fetchFirstQuestion = useCallback(
    async (overrideRole?: Role) => {
      if (!roleId) return;

      // Guard against duplicate concurrent calls
      if (isGeneratingRef.current) {
        console.log('[AI INTERVIEW] already generating question, skipping duplicate invocation');
        return;
      }
      isGeneratingRef.current = true;

      const activeRole = overrideRole || role;

      console.log('[AI Interview] start');
      console.log(`[AI Interview] roleId: ${roleId}`);
      console.log(`[AI Interview] authenticated user: ${session?.user?.id ? 'present' : 'missing'}`);

      setIsGeneratingQuestion(true);
      setQuestionTimeoutOccurred(false);
      setQuestionError(null);

      if (questionTimeoutRef.current) {
        clearTimeout(questionTimeoutRef.current);
      }

      let hasTimedOut = false;
      questionTimeoutRef.current = setTimeout(() => {
        hasTimedOut = true;
        console.warn('[AI Interview] request exceeded 25s timeout');
        setIsGeneratingQuestion(false);
        isGeneratingRef.current = false;
        setQuestionTimeoutOccurred(true);
        setQuestionError({
          title: "AI question generation couldn't be completed.",
          description: 'The request took longer than expected. Please try again.',
          type: 'AI_GENERATION_ERROR',
        });
      }, 25000);

      try {
        console.log('[AI Interview] role loaded');
        console.log('[AI Interview] Gemini request started');

        const generated = await generateInterviewQuestion({
          roleId,
          questionNumber: 1,
          previousQuestions: [],
          roleTitle: activeRole?.title,
          companyName: activeRole?.company,
        });

        if (hasTimedOut) {
          console.warn('[AI Interview] received response after timeout, ignoring late response');
          return;
        }

        console.log('[AI Interview] Gemini response received');

        // Safely validate and parse question and competency
        let parsedQuestion = '';
        let parsedCompetency = 'Role Competency';

        if (typeof generated === 'string') {
          try {
            const parsedObj = JSON.parse(generated);
            parsedQuestion = parsedObj.question || parsedObj.questionText || generated;
            parsedCompetency = parsedObj.competency || 'Role Competency';
          } catch {
            parsedQuestion = generated;
          }
        } else if (generated && typeof generated === 'object') {
          const genObj = generated as Record<string, unknown>;
          parsedQuestion = String(genObj.question || genObj.questionText || genObj.content || '');
          if (genObj.competency) {
            parsedCompetency = String(genObj.competency);
          }
        }

        console.log('[AI Interview] question parsed', {
          hasQuestion: Boolean(parsedQuestion),
          competency: parsedCompetency,
        });

        if (!parsedQuestion || !parsedQuestion.trim()) {
          throw new Error('Received an empty question from interview-ai');
        }

        setCurrentQuestion(parsedQuestion);
        setCurrentCompetency(parsedCompetency);

        saveStoredSession(roleId, {
          currentQuestion: parsedQuestion,
          currentCompetency: parsedCompetency,
          questionNumber: 1,
          flowState: 'READY',
        });

        console.log('[AI Interview] complete');
      } catch (err: unknown) {
        if (hasTimedOut) return;
        
        let status = 500;
        let errorName = 'Error';
        let errorMessage = 'Unknown error';
        let responseBody: unknown = null;

        if (err instanceof RolewiseApiError) {
          status = err.status || 500;
          errorName = err.name;
          errorMessage = err.message;
          responseBody = err.details;
        } else if (err instanceof Error) {
          errorName = err.name;
          errorMessage = err.message;
        }

        // Sanitized development logging per Requirement 12
        console.error('[AI Interview] generation failed', {
          status,
          errorName,
          errorMessage,
          responseBody,
        });

        const isAuth =
          (err instanceof RolewiseApiError && err.code === 'AUTH_ERROR') ||
          (err instanceof Error && /sign in|session|unauthorized|jwt|401/i.test(err.message));

        const isNotFound =
          (err instanceof RolewiseApiError && (err.code === 'NOT_FOUND' || err.status === 404)) ||
          (err instanceof Error && /not found|404/i.test(err.message));

        if (isAuth) {
          setQuestionError({
            title: 'Your session has expired. Please sign in again.',
            description: 'Sign in to your account to practice your interview.',
            type: 'AUTH_ERROR',
          });
        } else if (isNotFound) {
          setIsRoleNotFound(true);
          setQuestionError({
            title: 'Role not found',
            description: 'Please select an active role from My Jobs.',
            type: 'ROLE_NOT_FOUND',
          });
        } else {
          setQuestionError({
            title: "AI question generation couldn't be completed.",
            description: errorMessage || 'Please try again.',
            type: 'AI_GENERATION_ERROR',
          });
        }
      } finally {
        if (questionTimeoutRef.current) {
          clearTimeout(questionTimeoutRef.current);
          questionTimeoutRef.current = null;
        }
        setIsLoadingSession(false);
        setIsGeneratingQuestion(false);
        isGeneratingRef.current = false;
      }
    },
    [roleId, role, session?.access_token, session?.user]
  );

  // Initial mount: initialize interview session cleanly (StrictMode compatible, session preserved)
  useEffect(() => {
    if (isAuthLoading) return;

    if (!session?.access_token) {
      router.replace('/auth');
      return;
    }

    if (!roleId) return;

    // Guard against repeated re-initialization on tab switch / window focus
    if (initializedRef.current) {
      return;
    }

    let isCancelled = false;

    async function init() {
      try {
        console.log(`[AI INTERVIEW] route roleId: ${roleId}`);
        console.log(`[AI INTERVIEW] authenticated user: ${session?.user?.id || 'none'}`);
        console.log('[AI INTERVIEW] loading role: started');

        const fetchedRole = await getRole(roleId);
        const roleFound = Boolean(fetchedRole && fetchedRole.status !== 'archived');
        console.log(`[AI INTERVIEW] role found: ${roleFound}`);

        if (isCancelled) return;

        if (!roleFound || !fetchedRole) {
          setRole(null);
          setIsRoleNotFound(true);
          setIsLoadingSession(false);
          setIsGeneratingQuestion(false);
          isGeneratingRef.current = false;
          clearStoredSession(roleId);
          setQuestionError({
            title: 'Role not found',
            description: 'Please select an active role from My Jobs.',
            type: 'ROLE_NOT_FOUND',
          });
          return;
        }

        setIsRoleNotFound(false);
        setRole(fetchedRole);

        // Check whether an existing valid interview state exists in sessionStorage for this role
        const saved = loadStoredSession(roleId);
        if (saved?.currentQuestion && saved.currentQuestion.trim()) {
          console.log('[AI INTERVIEW] restoring existing session from storage', {
            questionNumber: saved.questionNumber || 1,
          });
          setCurrentQuestion(saved.currentQuestion);
          setCurrentCompetency(saved.currentCompetency || '');
          setQuestionNumber(saved.questionNumber || 1);
          setAnswerText(saved.answerText || '');
          setFlowState(saved.flowState || 'READY');
          setCompletedRounds(saved.completedRounds || []);
          setCurrentAnalysis(saved.currentAnalysis || null);
          setPendingNext(saved.pendingNext || null);
          setAiFinalFeedback(saved.aiFinalFeedback || null);
          if (saved.lastRecordedDuration) {
            setLastRecordedDuration(saved.lastRecordedDuration);
          }
          setIsLoadingSession(false);
          setIsGeneratingQuestion(false);
          initializedRef.current = true;
          return;
        }

        // Clean up incomplete / invalid stored session
        if (saved && !saved.currentQuestion) {
          console.warn('[AI INTERVIEW] found incomplete stored session without question, resetting question state');
          clearStoredSession(roleId);
        }

        setIsLoadingSession(false);
        initializedRef.current = true;

        // Preload Question 1
        await fetchFirstQuestion(fetchedRole);
      } catch (err) {
        console.error('[AI INTERVIEW] error during session setup:', err);
        if (!isCancelled) {
          setIsRoleNotFound(true);
          setIsLoadingSession(false);
          setIsGeneratingQuestion(false);
          isGeneratingRef.current = false;
          setQuestionError({
            title: 'Role not found',
            description: 'Please select an active role from My Jobs.',
            type: 'ROLE_NOT_FOUND',
          });
        }
      }
    }

    init();

    return () => {
      // In dev mode (React Strict Mode), if unmounted before init completes, allow remount to run
      if (!initializedRef.current) {
        isCancelled = true;
      }
    };
  }, [roleId, isAuthLoading, router, session?.access_token, fetchFirstQuestion]);

  // Handle Start Recording (Requirement 2 & 3: Decoupled client-side recording)
  const handleStartRecording = async () => {
    setGeneralError(null);
    clearPermissionError();
    setTranscriptionError(false);

    const success = await startRecording();
    if (!success) {
      return;
    }
  };

  // Perform transcription asynchronously without blocking browser recording (Requirements 3, 6, 7)
  const runTranscription = async (blob: Blob, durationSeconds: number) => {
    setIsTranscribing(true);
    setTranscriptionError(false);

    try {
      const response = await transcribeAudio(blob, durationSeconds);
      if (response?.transcript && response.transcript.trim()) {
        setAnswerText((prev) => {
          const trimmed = prev.trim();
          const next = trimmed ? `${trimmed} ${response.transcript.trim()}` : response.transcript.trim();
          saveStoredSession(roleId, { answerText: next });
          return next;
        });
      }
    } catch (err: unknown) {
      console.error('[InterviewPage] Transcription error:', err);
      // Keep recording available; flag transcription failure (Requirement 7)
      setTranscriptionError(true);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle Stop Recording
  const handleStopRecording = async () => {
    const recorded = await stopRecording();
    if (!recorded || !recorded.blob) {
      return;
    }

    recordedBlobRef.current = recorded;
    setRecordedAudioUrl(recorded.audioUrl);
    setLastRecordedDuration(formattedDuration);
    saveStoredSession(roleId, { lastRecordedDuration: formattedDuration });

    // Run transcription in background
    runTranscription(recorded.blob, recorded.durationSeconds);
  };

  // Audio Playback toggle
  const handleTogglePlayAudio = () => {
    if (!audioPlayerRef.current || !recordedAudioUrl) return;

    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch((err) => {
          console.warn('Playback error:', err);
          setIsPlayingAudio(false);
        });
    }
  };

  // Discard / Clear recording
  const handleDiscardRecording = () => {
    resetRecording();
    recordedBlobRef.current = null;
    setRecordedAudioUrl(null);
    setLastRecordedDuration('');
    setTranscriptionError(false);
    setIsPlayingAudio(false);
    saveStoredSession(roleId, { lastRecordedDuration: '' });
  };

  // Retry transcription with preserved audio blob (Requirement 7)
  const handleRetryTranscription = () => {
    if (recordedBlobRef.current) {
      runTranscription(recordedBlobRef.current.blob, recordedBlobRef.current.durationSeconds);
    }
  };

  // Retry Question Generation
  const handleRetryQuestionGeneration = () => {
    isGeneratingRef.current = false;
    fetchFirstQuestion();
  };

  // Submit Answer for AI Analysis (Requirement 1, 11, 18)
  const handleContinueWithAnswer = async () => {
    if (!answerText.trim() || isAnalyzing || isRecording) return;

    setIsAnalyzing(true);
    setFlowState('ANALYZING');
    setGeneralError(null);
    saveStoredSession(roleId, { flowState: 'ANALYZING', answerText });

    const previousAnswers = completedRounds.map((r) => r.transcript);
    const type: 'voice' | 'text' = recordedBlobRef.current ? 'voice' : 'text';

    try {
      const analysisResult = await analyzeInterviewAnswer({
        roleId,
        question: currentQuestion,
        transcript: answerText.trim(),
        previousAnswers,
      });

      setCurrentAnalysis(analysisResult);

      const newRound: CompletedRound = {
        questionNumber,
        question: currentQuestion,
        competency: currentCompetency,
        answerType: type,
        transcript: answerText.trim(),
        durationSeconds: recordedBlobRef.current?.durationSeconds,
        analysis: analysisResult,
      };

      const nextCompleted = [...completedRounds, newRound];
      setCompletedRounds(nextCompleted);

      // Preload next question from backend analysis response (Requirement 11)
      const nextStaged = analysisResult.next_question
        ? {
            question: analysisResult.next_question,
            competency: analysisResult.next_competency || currentCompetency,
          }
        : null;

      setPendingNext(nextStaged);
      setFlowState('REVIEWED');

      saveStoredSession(roleId, {
        flowState: 'REVIEWED',
        currentAnalysis: analysisResult,
        completedRounds: nextCompleted,
        pendingNext: nextStaged,
      });
    } catch (err: unknown) {
      console.error('Answer analysis error:', err);
      const msg =
        err instanceof Error
          ? err.message
          : 'AI feedback is temporarily unavailable. Please try again.';
      setGeneralError(msg);
      setFlowState('READY');
      saveStoredSession(roleId, { flowState: 'READY' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Continue to Next Question or Final Feedback
  const handleContinueInterview = async () => {
    if (questionNumber >= totalQuestions || !pendingNext) {
      setFlowState('COMPLETED');
      saveStoredSession(roleId, { flowState: 'COMPLETED' });
      try {
        const finalRes = await getFinalInterviewFeedback({
          roleId,
          answers: completedRounds.map((r) => ({
            question: r.question,
            transcript: r.transcript,
            analysis: r.analysis,
          })),
        });
        setAiFinalFeedback(finalRes);
        saveStoredSession(roleId, { aiFinalFeedback: finalRes });
      } catch (err) {
        console.warn('[InterviewPage] Final feedback synthesis notice:', err);
      }
      return;
    }

    const nextQNum = questionNumber + 1;
    const nextQ = pendingNext.question;
    const nextComp = pendingNext.competency;

    setQuestionNumber(nextQNum);
    setCurrentQuestion(nextQ);
    setCurrentCompetency(nextComp);
    setPendingNext(null);
    setCurrentAnalysis(null);
    setAnswerText('');
    resetRecording();
    recordedBlobRef.current = null;
    setRecordedAudioUrl(null);
    setLastRecordedDuration('');
    setTranscriptionError(false);
    setGeneralError(null);
    setFlowState('READY');

    saveStoredSession(roleId, {
      questionNumber: nextQNum,
      currentQuestion: nextQ,
      currentCompetency: nextComp,
      pendingNext: null,
      currentAnalysis: null,
      answerText: '',
      flowState: 'READY',
      lastRecordedDuration: '',
    });
  };

  // Practice again (restart session)
  const handlePracticeAgain = () => {
    clearStoredSession(roleId);
    initializedRef.current = false;
    isGeneratingRef.current = false;
    activeRequestIdRef.current = '';

    setQuestionNumber(1);
    setCurrentQuestion('');
    setCurrentCompetency('');
    setPendingNext(null);
    setCurrentAnalysis(null);
    setAiFinalFeedback(null);
    setCompletedRounds([]);
    setAnswerText('');
    resetRecording();
    recordedBlobRef.current = null;
    setRecordedAudioUrl(null);
    setLastRecordedDuration('');
    setTranscriptionError(false);
    setGeneralError(null);
    setFlowState('READY');
    fetchFirstQuestion();
  };

  // Only show the initial setup loader if we truly have NO question or session yet (Requirements 7, 8, 20)
  const hasExistingSession = Boolean(currentQuestion || completedRounds.length > 0);
  if ((isAuthLoading || isLoadingSession) && !hasExistingSession && !questionError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-[#667085]">
        <Loader2 className="w-7 h-7 animate-spin text-[#252525]" />
        <p className="text-sm font-medium">Setting up interview session…</p>
      </div>
    );
  }

  if (!session?.access_token) {
    return null;
  }

  if (isRoleNotFound || (!role && !hasExistingSession)) {
    return (
      <div className="space-y-6 max-w-xl mx-auto py-12 text-center animate-in fade-in">
        <div className="rolewise-card p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF0ED] text-[#E87967] flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-[#1F2937]">Role not found</h2>
            <p className="text-sm text-[#667085]">Please select an active role from My Jobs.</p>
          </div>
          <div className="pt-2">
            <Link
              href="/jobs"
              className="touch-target inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#252525] hover:bg-[#E7C43E] text-white text-sm font-medium transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to My Jobs</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // FINAL FEEDBACK VIEW
  if (flowState === 'COMPLETED') {
    const allStrengths = completedRounds.flatMap((r) => r.analysis.strengths).slice(0, 4);
    const allImprovements = completedRounds.flatMap((r) => r.analysis.improvements).slice(0, 4);

    const clarityCount = completedRounds.filter(
      (r) => r.analysis.communication_feedback.clarity === 'Strong'
    ).length;
    const structureCount = completedRounds.filter(
      (r) => r.analysis.communication_feedback.structure === 'Strong'
    ).length;
    const specificityCount = completedRounds.filter(
      (r) => r.analysis.communication_feedback.specificity === 'Strong'
    ).length;
    const concisenessCount = completedRounds.filter(
      (r) => r.analysis.communication_feedback.conciseness === 'Strong'
    ).length;

    const claritySummary =
      clarityCount >= completedRounds.length / 2
        ? 'Direct and articulate throughout responses. Thoughts were expressed with conviction and minimal hesitation.'
        : 'Ideas were conveyed, but periodically drifted into tangential details before returning to the core question.';

    const structureSummary =
      structureCount >= completedRounds.length / 2
        ? 'Consistent logical framing across answers. Clear progression from problem context to action to resolution.'
        : 'Tendency to jump directly into actions without establishing baseline constraints and stakeholder situation.';

    const specificitySummary =
      specificityCount >= completedRounds.length / 2
        ? 'Concrete details were highlighted effectively, referencing explicit tools, constraints, and methodologies.'
        : 'Answers relied more on general principles than granular examples. Ground responses in tangible project artifacts.';

    const concisenessSummary =
      concisenessCount >= completedRounds.length / 2
        ? 'Paced and concise delivery. Avoided rambling and kept responses focused on key contributions.'
        : 'Answers were occasionally verbose. Practice condensing background context and focusing on direct outcomes.';

    const finalStrengths =
      aiFinalFeedback?.strengths && aiFinalFeedback.strengths.length > 0
        ? aiFinalFeedback.strengths
        : allStrengths;

    const finalImprovements =
      aiFinalFeedback?.areas_to_improve && aiFinalFeedback.areas_to_improve.length > 0
        ? aiFinalFeedback.areas_to_improve
        : allImprovements;

    const finalClarity = aiFinalFeedback?.communication?.clarity || claritySummary;
    const finalStructure = aiFinalFeedback?.communication?.structure || structureSummary;
    const finalSpecificity = aiFinalFeedback?.communication?.specificity || specificitySummary;
    const finalConciseness = aiFinalFeedback?.communication?.conciseness || concisenessSummary;
    const finalExercises =
      aiFinalFeedback?.practice_exercises && aiFinalFeedback.practice_exercises.length > 0
        ? aiFinalFeedback.practice_exercises
        : null;

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <Link
            href={`/roles/${roleId}/preparation`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] hover:text-[#1F2937] transition-colors touch-target"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to preparation</span>
          </Link>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EAF6F0] text-[#4E9B76] border border-[#C6EBD7]">
            Session Completed
          </span>
        </div>

        <section className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-[#667085]">
            <span className="font-semibold text-[#1F2937]">{role?.title || 'Target Role'}</span>
            {role?.company && (
              <>
                <span>·</span>
                <span>{role.company}</span>
              </>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1F2937] tracking-tight">
            Your interview feedback
          </h1>
          <p className="text-xs sm:text-sm text-[#667085]">
            Communication practice review based on your spoken and written responses.
          </p>
        </section>

        <div className="space-y-4">
          <div className="rolewise-card p-6 space-y-3">
            <h2 className="text-sm font-semibold text-[#1F2937] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4E9B76]" />
              <span>What went well</span>
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-[#1F2937]">
              {finalStrengths.length > 0 ? (
                finalStrengths.map((strength, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#4E9B76] font-bold">✓</span>
                    <span>{strength}</span>
                  </li>
                ))
              ) : (
                <li className="text-[#667085]">
                  Demonstrated role familiarity and communicated your experience.
                </li>
              )}
            </ul>
          </div>

          <div className="rolewise-card p-6 space-y-3">
            <h2 className="text-sm font-semibold text-[#1F2937] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#C58A2B]" />
              <span>What to improve</span>
            </h2>
            <ul className="space-y-2 text-xs sm:text-sm text-[#1F2937]">
              {finalImprovements.length > 0 ? (
                finalImprovements.map((improvement, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#C58A2B] font-bold">•</span>
                    <span>{improvement}</span>
                  </li>
                ))
              ) : (
                <li className="text-[#667085]">
                  Continue practicing structuring actions and articulating measurable outcomes.
                </li>
              )}
            </ul>
          </div>

          <div className="rolewise-card p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#1F2937]">Communication patterns</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] space-y-1">
                <span className="text-xs font-semibold text-[#1F2937]">Clarity</span>
                <p className="text-xs text-[#667085] leading-relaxed">{finalClarity}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] space-y-1">
                <span className="text-xs font-semibold text-[#1F2937]">Structure</span>
                <p className="text-xs text-[#667085] leading-relaxed">{finalStructure}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] space-y-1">
                <span className="text-xs font-semibold text-[#1F2937]">Specificity</span>
                <p className="text-xs text-[#667085] leading-relaxed">{finalSpecificity}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] space-y-1">
                <span className="text-xs font-semibold text-[#1F2937]">Conciseness</span>
                <p className="text-xs text-[#667085] leading-relaxed">{finalConciseness}</p>
              </div>
            </div>
          </div>

          <div className="rolewise-card p-6 space-y-3 bg-[#FFF2B8]/30 border-[#D8D4FD]">
            <h2 className="text-sm font-semibold text-[#252525] flex items-center gap-2">
              <Award className="w-4 h-4" />
              <span>Practice next</span>
            </h2>
            <div className="space-y-2.5 text-xs sm:text-sm text-[#1F2937]">
              {finalExercises ? (
                finalExercises.map((exercise, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-white border border-[#D8D4FD]/60">
                    <p className="font-semibold text-xs text-[#252525]">
                      {idx + 1}. Recommended Drill
                    </p>
                    <p className="text-xs text-[#667085] mt-0.5 leading-relaxed">{exercise}</p>
                  </div>
                ))
              ) : (
                <>
                  <div className="p-3 rounded-xl bg-white border border-[#D8D4FD]/60">
                    <p className="font-semibold text-xs text-[#252525]">
                      1. Behavioral Structure Exercise
                    </p>
                    <p className="text-xs text-[#667085] mt-0.5 leading-relaxed">
                      Practice answering behavioral questions using:{' '}
                      <strong>Situation → Action → Result</strong>. Ensure your Action receives 60%
                      of your answer time.
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-[#D8D4FD]/60">
                    <p className="font-semibold text-xs text-[#252525]">
                      2. Measurable Outcome Drill
                    </p>
                    <p className="text-xs text-[#667085] mt-0.5 leading-relaxed">
                      For every project scenario, prepare one metric of success (e.g., user
                      completion rate, latency reduction, cross-team adoption).
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handlePracticeAgain}
              className="w-full sm:w-1/2 touch-target inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#252525] hover:bg-[#E7C43E] text-white text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practice again</span>
            </button>

            <Link
              href={`/roles/${roleId}/preparation`}
              className="w-full sm:w-1/2 touch-target inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-[#F7F7FB] text-[#1F2937] border border-[#E7E8EF] text-sm font-medium transition-colors shadow-sm"
            >
              <span>Back to preparation</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE INTERVIEW FLOW
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Hidden Audio Player for recording preview */}
      {recordedAudioUrl && (
        <audio
          ref={audioPlayerRef}
          src={recordedAudioUrl}
          onEnded={() => setIsPlayingAudio(false)}
          onPause={() => setIsPlayingAudio(false)}
          className="hidden"
        />
      )}

      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <Link
          href={`/roles/${roleId}/preparation`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] hover:text-[#1F2937] transition-colors touch-target"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Exit to preparation</span>
        </Link>

        {/* Progress Counter */}
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFF2B8] text-[#252525] border border-[#D8D4FD]">
          Question {questionNumber} of {totalQuestions}
        </span>
      </div>

      {/* Role Header */}
      <section className="space-y-1">
        <div className="flex items-center gap-2 text-xs font-medium text-[#667085]">
          <span className="font-semibold text-[#1F2937]">{role?.title || 'Target Role'}</span>
          {role?.company && (
            <>
              <span>·</span>
              <span>{role.company}</span>
            </>
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1F2937] tracking-tight">
          AI Interview
        </h1>
      </section>

      {/* Microphone Permission Notice (Requirement 5) */}
      {isPermissionDenied && (
        <div className="p-4 rounded-xl bg-[#FFF0ED] border border-[#FBD2CB] text-[#E87967] text-xs sm:text-sm space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Microphone notice</p>
              <p className="text-xs mt-0.5 text-[#1F2937]">
                {permissionError ||
                  'Microphone access is blocked. Allow microphone access in your browser settings and try again.'}
              </p>
            </div>
          </div>
          <div className="pt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={handleStartRecording}
              className="touch-target px-3 py-1.5 rounded-lg bg-white border border-[#E87967]/40 text-[#E87967] hover:bg-[#FFF0ED] text-xs font-medium transition-colors cursor-pointer"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                clearPermissionError();
                textareaRef.current?.focus();
              }}
              className="touch-target px-3 py-1.5 rounded-lg bg-[#1F2937] text-white hover:bg-black text-xs font-medium transition-colors cursor-pointer"
            >
              Type answer
            </button>
          </div>
        </div>
      )}

      {/* General Error Notice */}
      {generalError && (
        <div className="p-4 rounded-xl bg-[#FFF0ED] border border-[#FBD2CB] text-[#E87967] text-xs sm:text-sm space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Notice</p>
              <p className="text-xs mt-0.5 text-[#1F2937]">{generalError}</p>
            </div>
          </div>
          <div className="pt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleContinueWithAnswer()}
              className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E87967]/40 text-[#E87967] hover:bg-[#FFF0ED] text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry submission</span>
            </button>
          </div>
        </div>
      )}

      {/* QUESTION CARD (Requirements 8, 9, 10, 12, 20) */}
      <section className="rolewise-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFF2B8] text-[#252525] border border-[#D8D4FD]">
            <Sparkles className="w-3.5 h-3.5" />
            {currentCompetency || 'Role Competency'}
          </span>
          <span className="text-xs text-[#667085]">
            Question {questionNumber} of {totalQuestions}
          </span>
        </div>

        {/* State A: Question Loading Skeleton (Requirement 8) */}
        {isGeneratingQuestion && !questionTimeoutOccurred && !questionError && (
          <div className="space-y-3 py-1 animate-in fade-in">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-medium text-[#252525]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {questionNumber === 1
                    ? 'Generating your first question'
                    : 'Generating next question'}
                </span>
              </div>
              <p className="text-xs text-[#667085]">Based on this role and your experience...</p>
            </div>
            {/* Animated Skeleton Placeholder */}
            <div className="space-y-2 pt-1 animate-pulse">
              <div className="h-4 bg-[#FFF2B8] rounded-md w-11/12" />
              <div className="h-4 bg-[#FFF2B8]/60 rounded-md w-4/5" />
            </div>
          </div>
        )}

        {/* State B: Timeout Message (Requirement 9) */}
        {questionTimeoutOccurred && !currentQuestion && !questionError && (
          <div className="p-3.5 rounded-xl bg-[#FFF0ED]/40 border border-[#FBD2CB] space-y-2.5 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#E87967] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#E87967]">
                  Question generation is taking longer than expected.
                </p>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  Synthesizing questions based on role requirements is taking a bit longer. You can
                  try again safely.
                </p>
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={handleRetryQuestionGeneration}
                className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#E7C43E] text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try again</span>
              </button>
            </div>
          </div>
        )}

        {/* State C: Question Error (Requirement 12) */}
        {questionError && !currentQuestion && (
          <div className="p-3.5 rounded-xl bg-[#FFF0ED]/40 border border-[#FBD2CB] space-y-2.5 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#E87967] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#E87967]">{questionError.title}</p>
                <p className="text-[11px] text-[#667085] mt-0.5">{questionError.description}</p>
              </div>
            </div>
            <div>
              {questionError.type === 'AUTH_ERROR' ? (
                <Link
                  href="/auth"
                  className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#E7C43E] text-white text-xs font-medium transition-colors shadow-sm"
                >
                  <span>Sign in again</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              ) : questionError.type === 'ROLE_NOT_FOUND' ? (
                <Link
                  href="/jobs"
                  className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#E7C43E] text-white text-xs font-medium transition-colors shadow-sm"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to My Jobs</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleRetryQuestionGeneration}
                  className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#252525] hover:bg-[#E7C43E] text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Try again</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* State D: Question Displayed */}
        {currentQuestion && (
          <h2 className="text-base sm:text-lg font-semibold text-[#1F2937] leading-relaxed">
            &ldquo;{currentQuestion}&rdquo;
          </h2>
        )}

        <p className="text-xs text-[#667085] pt-1">
          Answer naturally. ROLEWISE will evaluate both your response and how you communicate it.
        </p>
      </section>

      {/* UNIFIED ANSWER CARD (Requirements 1, 2, 6, 7, 13, 14, 15, 18, 19, 20) */}
      <section className="rolewise-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[#1F2937]">Answer your question</h3>
          <span className="text-xs text-[#667085]">{answerText.length} characters</span>
        </div>

        {/* Textarea container with embedded bottom-right microphone */}
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={5}
            value={answerText}
            onChange={(e) => {
              const val = e.target.value;
              setAnswerText(val);
              saveStoredSession(roleId, { answerText: val });
            }}
            placeholder="Type your answer here, or tap the microphone to speak..."
            disabled={isRecording || isAnalyzing}
            className={`w-full p-4 pr-16 pb-12 rounded-xl border border-[#E7E8EF] text-xs sm:text-sm text-[#1F2937] placeholder:text-[#667085]/60 focus:outline-none focus:border-[#252525] bg-white transition-colors resize-y leading-relaxed font-normal min-h-[140px] ${
              isRecording ? 'bg-[#FFF0ED]/10 border-[#FBD2CB]' : ''
            }`}
          />

          {/* Embedded Microphone Button (Requirement 2 & 13) */}
          <div className="absolute bottom-3 right-3">
            {isRecording ? (
              <button
                type="button"
                onClick={handleStopRecording}
                title="Stop recording"
                aria-label="Stop recording"
                className="touch-target w-11 h-11 rounded-full bg-[#E87967] hover:bg-[#D96B5A] text-white flex items-center justify-center shadow-md ring-4 ring-[#FBD2CB] animate-pulse cursor-pointer transition-all"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartRecording}
                title="Tap microphone to speak"
                aria-label="Tap microphone to speak"
                className="touch-target w-11 h-11 rounded-full bg-[#FFF2B8] hover:bg-[#E0DCFE] text-[#252525] flex items-center justify-center shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Live Recording State (Requirement 2 & 13) */}
        {isRecording && (
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#FFF0ED] border border-[#FBD2CB] animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E87967] animate-pulse" />
              <span className="text-xs font-semibold text-[#E87967]">
                🔴 Recording · {formattedDuration}
              </span>
            </div>
            <button
              type="button"
              onClick={handleStopRecording}
              className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E87967] hover:bg-[#D96B5A] text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          </div>
        )}

        {/* Captured Recording & Audio Playback (Requirements 2, 3, 6, 13) */}
        {recordedAudioUrl && !isRecording && (
          <div className="p-3.5 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#EAF6F0] text-[#4E9B76] flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#1F2937]">
                  Recording captured · {lastRecordedDuration || formattedDuration}
                </p>
                {isTranscribing ? (
                  <p className="text-[11px] text-[#252525] flex items-center gap-1.5 mt-0.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Transcribing your answer...</span>
                  </p>
                ) : transcriptionError ? (
                  <p className="text-[11px] text-[#E87967] mt-0.5">
                    Transcription temporarily unavailable
                  </p>
                ) : (
                  <p className="text-[11px] text-[#4E9B76] mt-0.5">
                    Transcript added to answer box
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleTogglePlayAudio}
                className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E7E8EF] hover:bg-white text-xs font-medium text-[#1F2937] transition-colors shadow-2xs cursor-pointer"
              >
                {isPlayingAudio ? (
                  <>
                    <Pause className="w-3.5 h-3.5 text-[#252525]" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-[#252525]" />
                    <span>Listen</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleDiscardRecording}
                className="touch-target text-xs text-[#667085] hover:text-[#E87967] px-2.5 py-1.5 transition-colors cursor-pointer"
                title="Discard recording"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Transcription Error Banner (Requirement 7) */}
        {transcriptionError && (
          <div className="p-3.5 rounded-xl bg-[#FFF0ED] border border-[#FBD2CB] space-y-2 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[#E87967] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-[#E87967]">
                  Your recording was captured, but transcription is temporarily unavailable.
                </p>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  You can listen to your recording, retry transcription, or type your answer.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTogglePlayAudio}
                className="touch-target inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#FBD2CB] text-[#1F2937] text-xs font-medium hover:bg-[#FFF0ED] transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current text-[#252525]" />
                <span>Listen</span>
              </button>
              <button
                type="button"
                onClick={handleRetryTranscription}
                className="touch-target inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#FBD2CB] text-[#1F2937] text-xs font-medium hover:bg-[#FFF0ED] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try transcription again</span>
              </button>
              <button
                type="button"
                onClick={() => textareaRef.current?.focus()}
                className="touch-target inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#E7E8EF] text-[#667085] text-xs font-medium hover:text-[#1F2937] transition-colors cursor-pointer"
              >
                <span>Type answer</span>
              </button>
            </div>
          </div>
        )}

        {/* Card Footer: Helper copy & Primary CTA (Requirement 13) */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#E7E8EF]/60">
          <p className="text-xs text-[#667085] text-center sm:text-left">
            Prefer speaking? Your recorded answer can be transcribed automatically.
          </p>

          <button
            type="button"
            onClick={handleContinueWithAnswer}
            disabled={!answerText.trim() || isAnalyzing || isRecording}
            className={`w-full sm:w-auto touch-target inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors shadow-sm ${
              answerText.trim() && !isAnalyzing && !isRecording
                ? 'bg-[#252525] hover:bg-[#E7C43E] text-white cursor-pointer'
                : 'bg-[#E7E8EF] text-[#667085] cursor-not-allowed opacity-80'
            }`}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing answer...</span>
              </>
            ) : (
              <>
                <span>Continue with answer</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </section>

      {/* STATE: ANALYZING LOADING (Requirement 11) */}
      {isAnalyzing && (
        <div className="rolewise-card p-8 space-y-3 text-center animate-in fade-in">
          <Loader2 className="w-6 h-6 animate-spin text-[#252525] mx-auto" />
          <h3 className="text-sm font-semibold text-[#1F2937]">
            Analyzing communication quality…
          </h3>
          <p className="text-xs text-[#667085]">
            Evaluating relevance, clarity, structure, and outcome alignment.
          </p>
        </div>
      )}

      {/* STATE: REVIEWED ANSWER FEEDBACK */}
      {flowState === 'REVIEWED' && currentAnalysis && (
        <div className="space-y-4 animate-in fade-in">
          <section className="rolewise-card p-6 space-y-4 border-[#4E9B76]/30 bg-[#EAF6F0]/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#4E9B76]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Answer reviewed</span>
            </div>

            {/* What worked */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-[#1F2937]">What worked</span>
              <ul className="space-y-1 text-xs text-[#1F2937]">
                {currentAnalysis.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#4E9B76] font-bold">✓</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Improve */}
            <div className="space-y-1.5 pt-1 border-t border-[#E7E8EF]">
              <span className="text-xs font-semibold text-[#1F2937]">Improve</span>
              <ul className="space-y-1 text-xs text-[#1F2937]">
                {currentAnalysis.improvements.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#C58A2B] font-bold">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Communication dimensions */}
            <div className="space-y-2 pt-1 border-t border-[#E7E8EF]">
              <span className="text-xs font-semibold text-[#1F2937]">Communication</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E8EF] space-y-0.5">
                  <span className="text-[#667085] text-[11px]">Clarity</span>
                  <p className="font-semibold text-[#1F2937]">
                    {currentAnalysis.communication_feedback.clarity}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E8EF] space-y-0.5">
                  <span className="text-[#667085] text-[11px]">Structure</span>
                  <p className="font-semibold text-[#1F2937]">
                    {currentAnalysis.communication_feedback.structure}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E8EF] space-y-0.5">
                  <span className="text-[#667085] text-[11px]">Specificity</span>
                  <p className="font-semibold text-[#1F2937]">
                    {currentAnalysis.communication_feedback.specificity}
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-[#E7E8EF] space-y-0.5">
                  <span className="text-[#667085] text-[11px]">Conciseness</span>
                  <p className="font-semibold text-[#1F2937]">
                    {currentAnalysis.communication_feedback.conciseness}
                  </p>
                </div>
              </div>
            </div>

            {/* Continue interview button */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={handleContinueInterview}
                className="touch-target w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#252525] hover:bg-[#E7C43E] text-white text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
              >
                <span>
                  {questionNumber >= totalQuestions ? 'View feedback' : 'Continue interview →'}
                </span>
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
