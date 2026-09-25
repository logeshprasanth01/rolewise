'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Mic,
  Square,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Keyboard,
  ArrowRight,
} from 'lucide-react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { transcribeAudio, analyzeInterviewAnswer, RolewiseApiError } from '@/services/api';
import { CommunicationAnalysisResponse } from '@/types/database';

type PracticeState =
  | 'READY'
  | 'RECORDING'
  | 'RECORDED'
  | 'PROCESSING'
  | 'REVIEWED'
  | 'TYPING';

export default function VoicePracticePage() {
  const [flowState, setFlowState] = useState<PracticeState>('READY');
  const [question] = useState<string>(
    'Tell me about a challenging situation you handled and what you learned from it.'
  );
  const [typedAnswer, setTypedAnswer] = useState<string>('');
  const [analysis, setAnalysis] = useState<CommunicationAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const recordedRef = useRef<{ blob: Blob; durationSeconds: number; audioUrl: string } | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const transcriptRef = useRef<string | null>(null);

  const handleStart = async () => {
    setErrorMessage(null);
    clearPermissionError();
    const ok = await startRecording();
    if (ok) {
      setFlowState('RECORDING');
    }
  };

  const handleStop = async () => {
    const res = await stopRecording();
    if (!res || !res.blob) {
      setErrorMessage("Couldn't capture audio. Please try again.");
      setFlowState('READY');
      return;
    }
    recordedRef.current = res;
    setRecordedAudioUrl(res.audioUrl);
    transcriptRef.current = null;
    setFlowState('RECORDED');
  };

  const handleReRecord = () => {
    resetRecording();
    recordedRef.current = null;
    setRecordedAudioUrl(null);
    transcriptRef.current = null;
    setErrorMessage(null);
    setFlowState('READY');
  };

  const handleAnalyze = async (answerText?: string) => {
    setFlowState('PROCESSING');
    setErrorMessage(null);

    let textToAnalyze = answerText || transcriptRef.current || '';

    // If voice and no transcript yet, transcribe first
    if (!textToAnalyze && recordedRef.current?.blob) {
      try {
        const transRes = await transcribeAudio(
          recordedRef.current.blob,
          recordedRef.current.durationSeconds
        );
        textToAnalyze = transRes.transcript;
        transcriptRef.current = transRes.transcript;
      } catch (err: unknown) {
        console.error('Transcription notice:', err);
        setErrorMessage(
          'AI transcription is temporarily unavailable. Please try again.'
        );
        setFlowState('RECORDED');
        return;
      }
    }

    if (!textToAnalyze.trim()) {
      setErrorMessage('No response text detected. Please try recording again.');
      setFlowState('RECORDED');
      return;
    }

    try {
      const result = await analyzeInterviewAnswer({
        question,
        transcript: textToAnalyze.trim(),
      });
      setAnalysis(result);
      setFlowState('REVIEWED');
    } catch (err: unknown) {
      console.error('Analysis error:', err);
      setErrorMessage(
        'Your recording was captured, but AI feedback is temporarily unavailable.'
      );
      setFlowState('RECORDED');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Breadcrumb Navigation */}
      <div>
        <Link
          href="/communication-practice"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] hover:text-[#1F2937] transition-colors touch-target"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Communication Practice</span>
        </Link>
      </div>

      {/* Header */}
      <section className="space-y-1">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF2B8] text-[#252525] text-xs font-semibold">
          <Mic className="w-3.5 h-3.5" />
          <span>Voice Practice</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1F2937] tracking-tight">
          General Interview Question
        </h1>
      </section>

      {/* Permission Denied Notice */}
      {isPermissionDenied && (
        <div className="p-4 rounded-xl bg-[#FFF0ED] border border-[#FBD2CB] text-[#E87967] text-xs sm:text-sm space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Microphone access is required for voice practice.</p>
              <p className="text-xs mt-0.5 text-[#1F2937]">
                {permissionError || 'Please allow microphone access in your browser to practice speaking your answers.'}
              </p>
            </div>
          </div>
          <div className="pt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={handleStart}
              className="touch-target px-3 py-1.5 rounded-lg bg-white border border-[#E87967]/40 text-[#E87967] hover:bg-[#FFF0ED] text-xs font-medium transition-colors"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => {
                clearPermissionError();
                setFlowState('TYPING');
              }}
              className="touch-target px-3 py-1.5 rounded-lg bg-[#1F2937] text-white hover:bg-black text-xs font-medium transition-colors"
            >
              Type answer instead
            </button>
          </div>
        </div>
      )}

      {/* General Error Notice */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-[#FFF0ED] border border-[#FBD2CB] text-[#E87967] text-xs sm:text-sm space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{errorMessage}</p>
            </div>
          </div>
          <div className="pt-1 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => handleAnalyze()}
              className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E87967]/40 text-[#E87967] hover:bg-[#FFF0ED] text-xs font-medium transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry AI analysis</span>
            </button>
            <button
              type="button"
              onClick={handleReRecord}
              className="touch-target inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#E7E8EF] text-[#1F2937] hover:bg-[#F7F7FB] text-xs font-medium transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Practice again</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setFlowState('TYPING');
              }}
              className="touch-target px-3 py-1.5 rounded-lg bg-white border border-[#E7E8EF] text-[#1F2937] hover:bg-[#F7F7FB] text-xs font-medium transition-colors cursor-pointer"
            >
              Type answer
            </button>
          </div>
        </div>
      )}

      {/* Prompt Card */}
      <section className="rolewise-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FFF2B8] text-[#252525]">
            <Sparkles className="w-3.5 h-3.5" />
            General Interview Communication
          </span>
        </div>

        <h2 className="text-base sm:text-lg font-semibold text-[#1F2937] leading-relaxed">
          &ldquo;{question}&rdquo;
        </h2>
        <p className="text-xs text-[#667085]">
          Focus on a clear structure: describe the situation, the actions you took, and what you learned.
        </p>
      </section>

      {/* STATE 1: READY */}
      {flowState === 'READY' && (
        <div className="rolewise-card p-8 space-y-6 text-center animate-in fade-in">
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-sm font-semibold text-[#1F2937]">Answer by voice</h3>
            <p className="text-xs text-[#667085]">
              Speak clearly into your microphone as if in a live conversation.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleStart}
              className="touch-target inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Mic className="w-5 h-5" />
              <span>Start recording</span>
            </button>

            <button
              type="button"
              onClick={() => {
                clearPermissionError();
                setFlowState('TYPING');
              }}
              className="text-xs text-[#667085] hover:text-[#1F2937] transition-colors underline pt-2 cursor-pointer"
            >
              Type instead
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: RECORDING */}
      {flowState === 'RECORDING' && (
        <div className="rolewise-card p-8 space-y-6 text-center animate-in fade-in">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#FFF0ED] border border-[#FBD2CB] text-[#E87967]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E87967] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider">Recording...</span>
            </div>

            <div className="text-3xl font-mono font-semibold text-[#1F2937]">
              {formattedDuration}
            </div>

            <p className="text-xs text-[#667085]">
              Speaking now. Click stop when you have completed your answer.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleStop}
              className="touch-target inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#E87967] hover:bg-[#D96B5A] text-white text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop recording</span>
            </button>
          </div>
        </div>
      )}

      {/* STATE 3: RECORDED (Review audio before AI analysis) */}
      {flowState === 'RECORDED' && (
        <div className="rolewise-card p-6 space-y-5 text-center animate-in fade-in">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF6F0] text-[#4E9B76] text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Recording captured ({formattedDuration})</span>
            </div>
            <h3 className="text-sm font-semibold text-[#1F2937] pt-2">Listen to your response</h3>
            <p className="text-xs text-[#667085]">
              Review your recording before getting communication feedback.
            </p>
          </div>

          {recordedAudioUrl && (
            <div className="max-w-md mx-auto pt-1">
              <audio controls src={recordedAudioUrl} className="w-full h-10 rounded-xl" />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleReRecord}
              className="touch-target inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-[#E7E8EF] hover:bg-[#F7F7FB] text-[#1F2937] text-sm font-medium transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-[#667085]" />
              <span>Re-record</span>
            </button>

            <button
              type="button"
              onClick={() => handleAnalyze()}
              className="touch-target inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <span>Get feedback</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STATE 4: PROCESSING */}
      {flowState === 'PROCESSING' && (
        <div className="rolewise-card p-8 space-y-3 text-center animate-in fade-in">
          <Loader2 className="w-6 h-6 animate-spin text-[#252525] mx-auto" />
          <h3 className="text-sm font-semibold text-[#1F2937]">Analyzing your communication...</h3>
          <p className="text-xs text-[#667085]">
            Evaluating clarity, structure, conciseness, and key talking points.
          </p>
        </div>
      )}

      {/* STATE 5: TYPING */}
      {flowState === 'TYPING' && (
        <div className="rolewise-card p-6 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <label htmlFor="voice-practice-type" className="text-xs font-semibold text-[#1F2937]">
              Type your answer
            </label>
            <button
              type="button"
              onClick={() => {
                clearPermissionError();
                setFlowState('READY');
              }}
              className="text-xs text-[#252525] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record with voice instead</span>
            </button>
          </div>

          <textarea
            id="voice-practice-type"
            rows={5}
            value={typedAnswer}
            onChange={(e) => setTypedAnswer(e.target.value)}
            placeholder="Type your answer to this question..."
            className="w-full p-4 rounded-xl border border-[#E7E8EF] text-sm text-[#1F2937] placeholder:text-[#667085]/60 focus:outline-none focus:border-[#252525] bg-white transition-colors resize-y leading-relaxed"
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              disabled={!typedAnswer.trim()}
              onClick={() => handleAnalyze(typedAnswer)}
              className="touch-target inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            >
              <span>Submit answer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STATE 6: REVIEWED (Analysis Result) */}
      {flowState === 'REVIEWED' && analysis && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rolewise-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4E9B76] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Communication Feedback
              </span>
              <button
                type="button"
                onClick={handleReRecord}
                className="text-xs text-[#252525] font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Practice another answer</span>
              </button>
            </div>

            {/* Strengths */}
            {analysis.strengths && analysis.strengths.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                  What you did well
                </h4>
                <ul className="space-y-1.5 text-xs sm:text-sm text-[#1F2937]">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4E9B76] mt-2 flex-shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Improvements */}
            {analysis.improvements && analysis.improvements.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[#E7E8EF]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#667085]">
                  Ways to sharpen delivery
                </h4>
                <ul className="space-y-1.5 text-xs sm:text-sm text-[#1F2937]">
                  {analysis.improvements.map((imp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#C58A2B] mt-2 flex-shrink-0" />
                      <span>{imp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Qualitative Pattern Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E7E8EF]">
              <div className="p-3 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] text-center">
                <p className="text-xs text-[#667085]">Clarity</p>
                <p className="text-xs font-semibold text-[#1F2937] mt-0.5">
                  {analysis.communication_feedback?.clarity || 'Observable'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] text-center">
                <p className="text-xs text-[#667085]">Structure</p>
                <p className="text-xs font-semibold text-[#1F2937] mt-0.5">
                  {analysis.communication_feedback?.structure || 'Observable'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] text-center">
                <p className="text-xs text-[#667085]">Specificity</p>
                <p className="text-xs font-semibold text-[#1F2937] mt-0.5">
                  {analysis.communication_feedback?.specificity || 'Observable'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[#F7F7FB] border border-[#E7E8EF] text-center">
                <p className="text-xs text-[#667085]">Conciseness</p>
                <p className="text-xs font-semibold text-[#1F2937] mt-0.5">
                  {analysis.communication_feedback?.conciseness || 'Observable'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Link
              href="/communication-practice"
              className="text-xs text-[#667085] hover:text-[#1F2937] touch-target"
            >
              ← Back to Practice Hub
            </Link>
            <button
              type="button"
              onClick={handleReRecord}
              className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-xs sm:text-sm font-medium transition-colors shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practice again</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
