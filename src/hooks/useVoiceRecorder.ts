'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseVoiceRecorderReturn {
  isRecording: boolean;
  isPermissionDenied: boolean;
  permissionError: string | null;
  durationSeconds: number;
  formattedDuration: string;
  audioBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => Promise<{ blob: Blob; durationSeconds: number; audioUrl: string } | null>;
  resetRecording: () => void;
  clearPermissionError: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPermissionDenied, setIsPermissionDenied] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const audioUrlRef = useRef<string | null>(null);

  // Format seconds to mm:ss format (e.g. 00:12)
  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Teardown stream tracks
  const stopStreamTracks = useCallback(() => {
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      audioStreamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      stopStreamTracks();
      if (audioUrlRef.current) {
        URL.revokeObjectURL(audioUrlRef.current);
      }
    };
  }, [stopStreamTracks]);

  const clearPermissionError = useCallback(() => {
    setIsPermissionDenied(false);
    setPermissionError(null);
  }, []);

  const resetRecording = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    stopStreamTracks();
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsRecording(false);
    setDurationSeconds(0);
    setAudioBlob(null);
    setAudioUrl(null);
  }, [stopStreamTracks]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    resetRecording();
    clearPermissionError();

    // Check if browser supports getUserMedia
    if (
      typeof window === 'undefined' ||
      !navigator?.mediaDevices?.getUserMedia ||
      typeof window.MediaRecorder === 'undefined'
    ) {
      setIsPermissionDenied(true);
      setPermissionError('Microphone access is required for voice practice.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      audioStreamRef.current = stream;

      // Select supported audio mime type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        mimeType = 'audio/ogg';
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(250); // collect data every 250ms chunks
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      setDurationSeconds(0);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
        setDurationSeconds(elapsed);
      }, 500);

      return true;
    } catch (err: unknown) {
      console.warn('[useVoiceRecorder] getUserMedia failed:', err);
      setIsPermissionDenied(true);

      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setPermissionError('Microphone access is required for voice practice.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setPermissionError("We couldn't find an available microphone.");
        } else {
          setPermissionError('Microphone access is required for voice practice.');
        }
      } else {
        setPermissionError('Microphone access is required for voice practice.');
      }

      setIsRecording(false);
      return false;
    }
  }, [clearPermissionError, resetRecording]);

  const stopRecording = useCallback((): Promise<{ blob: Blob; durationSeconds: number; audioUrl: string } | null> => {
    return new Promise((resolve) => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }

      const elapsed = Math.max(1, Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
      setDurationSeconds(elapsed);

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setIsRecording(false);
        stopStreamTracks();
        resolve(null);
        return;
      }

      recorder.onstop = () => {
        try {
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          if (audioUrlRef.current) {
            URL.revokeObjectURL(audioUrlRef.current);
          }
          audioUrlRef.current = url;
          setAudioBlob(blob);
          setAudioUrl(url);
          setIsRecording(false);
          stopStreamTracks();
          resolve({ blob, durationSeconds: elapsed, audioUrl: url });
        } catch (err) {
          console.error('[useVoiceRecorder] Error creating audio blob on stop:', err);
          setIsRecording(false);
          stopStreamTracks();
          resolve(null);
        }
      };

      try {
        recorder.stop();
      } catch (err) {
        console.error('[useVoiceRecorder] Error calling recorder.stop():', err);
        setIsRecording(false);
        stopStreamTracks();
        resolve(null);
      }
    });
  }, [stopStreamTracks]);

  return {
    isRecording,
    isPermissionDenied,
    permissionError,
    durationSeconds,
    formattedDuration: formatTime(durationSeconds),
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    resetRecording,
    clearPermissionError,
  };
}
