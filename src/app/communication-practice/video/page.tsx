'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Video,
  Square,
  RotateCcw,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Mic,
  ArrowRight,
} from 'lucide-react';
import { transcribeAudio, analyzeInterviewAnswer, RolewiseApiError } from '@/services/api';
import { CommunicationAnalysisResponse } from '@/types/database';

type VideoState =
  | 'READY'
  | 'RECORDING'
  | 'RECORDED'
  | 'PROCESSING'
  | 'REVIEWED';

export default function VideoPracticePage() {
  const [flowState, setFlowState] = useState<VideoState>('READY');
  const [question] = useState<string>(
    'Tell me about a project you are proud of and the impact it had.'
  );
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CommunicationAnalysisResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const recordedBlobRef = useRef<Blob | null>(null);

  // Format seconds to mm:ss format
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Teardown camera and audio stream
  const stopStream = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      mediaStreamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      stopStream();
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [stopStream, recordedVideoUrl]);

  // Initialize live camera preview
  const initCamera = useCallback(async () => {
    setIsPermissionDenied(false);
    setPermissionError(null);

    if (
      typeof window === 'undefined' ||
      !navigator?.mediaDevices?.getUserMedia ||
      typeof window.MediaRecorder === 'undefined'
    ) {
      setIsPermissionDenied(true);
      setPermissionError('Camera and microphone access is required for video practice.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      mediaStreamRef.current = stream;

      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

      return true;
    } catch (err: unknown) {
      console.warn('[VideoPractice] getUserMedia failed:', err);
      setIsPermissionDenied(true);
      if (err instanceof DOMException && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError')) {
        setPermissionError('Camera and microphone access was denied. Please allow camera access in browser settings.');
      } else {
        setPermissionError('Could not start camera preview. Please check your camera connection.');
      }
      return false;
    }
  }, []);

  // Automatically start preview when on READY state
  useEffect(() => {
    let active = true;
    if (flowState === 'READY') {
      const timer = setTimeout(() => {
        if (active) {
          void initCamera();
        }
      }, 0);
      return () => {
        active = false;
        clearTimeout(timer);
      };
    }
  }, [flowState, initCamera]);

  // Start video recording
  const handleStartRecording = async () => {
    setErrorMessage(null);

    // If stream not active, request stream
    if (!mediaStreamRef.current || !mediaStreamRef.current.active) {
      const ok = await initCamera();
      if (!ok) return;
    }

    const stream = mediaStreamRef.current;
    if (!stream) return;

    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      mimeType = 'video/webm;codecs=vp8,opus';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    }

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.start(250);
    startTimeRef.current = Date.now();
    setDurationSeconds(0);
    setFlowState('RECORDING');

    timerIntervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setDurationSeconds(elapsed);
    }, 500);
  };

  // Stop video recording
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const elapsed = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));
    setDurationSeconds(elapsed);

    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') {
      stopStream();
      setFlowState('READY');
      return;
    }

    recorder.onstop = () => {
      const mime = recorder.mimeType || 'video/webm';
      const blob = new Blob(chunksRef.current, { type: mime });
      recordedBlobRef.current = blob;
      const url = URL.createObjectURL(blob);
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
      setRecordedVideoUrl(url);
      stopStream();
      setFlowState('RECORDED');
    };

    try {
      recorder.stop();
    } catch {
      stopStream();
      setFlowState('READY');
    }
  };

  // Re-record
  const handleReRecord = () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
      setRecordedVideoUrl(null);
    }
    recordedBlobRef.current = null;
    setAnalysis(null);
    setErrorMessage(null);
    setDurationSeconds(0);
    setFlowState('READY');
  };

  // Submit recorded video for observable communication analysis
  const handleSubmitRecording = async () => {
    const videoBlob = recordedBlobRef.current;
    if (!videoBlob) {
      setErrorMessage("No recorded video found. Please re-record.");
      return;
    }

    setFlowState('PROCESSING');
    setErrorMessage(null);

    // 1. Transcribe audio from recorded stream
    let transcriptText = '';
    try {
      const transRes = await transcribeAudio(videoBlob, durationSeconds);
      transcriptText = transRes.transcript;
    } catch (err: unknown) {
      console.warn('[VideoPractice] Transcription notice:', err);
      setErrorMessage('Your recording was captured, but AI feedback is temporarily unavailable.');
      setFlowState('RECORDED');
      return;
    }

    if (!transcriptText || !transcriptText.trim()) {
      setErrorMessage("No clear speech detected in recording. Please speak louder and try again.");
      setFlowState('RECORDED');
      return;
    }

    // 2. Perform observable communication evaluation
    try {
      const analysisResult = await analyzeInterviewAnswer({
        question,
        transcript: transcriptText.trim(),
      });
      setAnalysis(analysisResult);
      setFlowState('REVIEWED');
    } catch (err: unknown) {
      console.error('[VideoPractice] Analysis error:', err);
      setErrorMessage('Your recording was captured, but AI feedback is temporarily unavailable.');
      setFlowState('RECORDED');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Back breadcrumb */}
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
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EAF6F0] text-[#4E9B76] text-xs font-semibold">
          <Video className="w-3.5 h-3.5" />
          <span>Video Practice</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1F2937] tracking-tight">
          Video Communication Practice
        </h1>
      </section>

      {/* Permission Denied Notice */}
      {isPermissionDenied && (
        <div className="p-4 rounded-xl bg-[#FFF0ED] border border-[#FBD2CB] text-[#E87967] text-xs sm:text-sm space-y-2 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Camera and microphone access is required for video practice.</p>
              <p className="text-xs mt-0.5 text-[#1F2937]">
                {permissionError || 'Please allow camera and microphone permissions in your browser to record your answer.'}
              </p>
            </div>
          </div>
          <div className="pt-1 flex items-center gap-3">
            <button
              type="button"
              onClick={initCamera}
              className="touch-target px-3 py-1.5 rounded-lg bg-white border border-[#E87967]/40 text-[#E87967] hover:bg-[#FFF0ED] text-xs font-medium transition-colors cursor-pointer"
            >
              Try again
            </button>
            <Link
              href="/communication-practice/voice"
              className="touch-target px-3 py-1.5 rounded-lg bg-[#1F2937] text-white hover:bg-black text-xs font-medium transition-colors"
            >
              Switch to Voice Practice
            </Link>
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
              onClick={handleSubmitRecording}
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
          </div>
        </div>
      )}

      {/* Question Card (Requirement 19) */}
      <section className="rolewise-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EAF6F0] text-[#4E9B76]">
            <Sparkles className="w-3.5 h-3.5" />
            Question 1
          </span>
        </div>

        <h2 className="text-base sm:text-lg font-semibold text-[#1F2937] leading-relaxed">
          &ldquo;{question}&rdquo;
        </h2>
        <p className="text-xs text-[#667085]">
          Look directly at the camera. Focus on structuring your answer: situation, action taken, and measurable impact.
        </p>
      </section>

      {/* LIVE CAMERA & RECORDING PREVIEW (Requirement 19 & 22) */}
      {(flowState === 'READY' || flowState === 'RECORDING') && (
        <div className="rolewise-card p-4 sm:p-6 space-y-4 text-center">
          <div className="relative aspect-video max-h-72 sm:max-h-80 w-full rounded-2xl overflow-hidden bg-black mx-auto shadow-inner flex items-center justify-center">
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />

            {/* Recording badge overlay */}
            {flowState === 'RECORDING' && (
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 backdrop-blur text-white text-xs font-mono font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E87967] animate-pulse" />
                <span>REC {formatTime(durationSeconds)}</span>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="pt-2 flex justify-center">
            {flowState === 'READY' ? (
              <button
                type="button"
                onClick={handleStartRecording}
                disabled={isPermissionDenied}
                className="touch-target inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-sm font-medium transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Video className="w-5 h-5" />
                <span>Start recording</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopRecording}
                className="touch-target inline-flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-xl bg-[#E87967] hover:bg-[#D96B5A] text-white text-sm font-medium transition-colors shadow-sm cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
                <span>Stop recording ({formatTime(durationSeconds)})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* STATE: RECORDED (Review before submitting - Requirement 19) */}
      {flowState === 'RECORDED' && (
        <div className="rolewise-card p-4 sm:p-6 space-y-5 text-center animate-in fade-in">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF6F0] text-[#4E9B76] text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Video recording captured ({formatTime(durationSeconds)})</span>
            </div>
            <h3 className="text-sm font-semibold text-[#1F2937] pt-2">Review your video</h3>
            <p className="text-xs text-[#667085]">
              Play back your response to check delivery, pacing, and clarity.
            </p>
          </div>

          {recordedVideoUrl && (
            <div className="aspect-video max-h-72 sm:max-h-80 w-full rounded-2xl overflow-hidden bg-black mx-auto shadow-sm">
              <video
                controls
                src={recordedVideoUrl}
                className="w-full h-full object-contain"
              />
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
              onClick={handleSubmitRecording}
              className="touch-target inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-sm font-medium transition-colors shadow-sm cursor-pointer"
            >
              <span>Submit for feedback</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STATE: PROCESSING */}
      {flowState === 'PROCESSING' && (
        <div className="rolewise-card p-8 space-y-3 text-center animate-in fade-in">
          <Loader2 className="w-6 h-6 animate-spin text-[#252525] mx-auto" />
          <h3 className="text-sm font-semibold text-[#1F2937]">Analyzing your communication...</h3>
          <p className="text-xs text-[#667085]">
            Evaluating clarity, structure, specificity, conciseness, and key actions described.
          </p>
        </div>
      )}

      {/* STATE: REVIEWED (Requirement 20 - Observable feedback only) */}
      {flowState === 'REVIEWED' && analysis && (
        <div className="space-y-6 animate-in fade-in">
          <div className="rolewise-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#4E9B76] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Communication Delivery Review
              </span>
              <button
                type="button"
                onClick={handleReRecord}
                className="text-xs text-[#252525] font-medium hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Practice another take</span>
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

            {/* Qualitative Pattern Grid (Observable only, no biometric/facial claims) */}
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
              className="touch-target inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD84D] hover:bg-[#E7C43E] text-[#252525] text-xs sm:text-sm font-medium transition-colors shadow-sm cursor-pointer"
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
