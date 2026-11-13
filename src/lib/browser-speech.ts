/**
 * Free, key-less speech-to-text using the browser's built-in recognizer
 * (Web Speech API: Chrome, Edge, Android Chrome; Safari partially).
 *
 * Recorders call startLiveTranscription() when recording starts and
 * stopLiveTranscription() when it stops. transcribeAudio() then uses the
 * captured text first and only falls back to the server when it's empty
 * (unsupported browser, no speech heard, permission denied).
 */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

type RecognitionCtor = new () => SpeechRecognitionLike;

let recognizer: SpeechRecognitionLike | null = null;
let wantRunning = false;
let finalParts: string[] = [];
let interimText = '';
let lastTranscript = '';
let endWaiters: (() => void)[] = [];
let pendingStop: Promise<string> | null = null;

function getCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isBrowserSpeechSupported(): boolean {
  return getCtor() !== null;
}

function currentText(): string {
  return [...finalParts, interimText].join(' ').replace(/\s+/g, ' ').trim();
}

/** Begin capturing speech. Safe to call when unsupported (no-op). */
export function startLiveTranscription(lang = 'en-US'): void {
  const Ctor = getCtor();
  lastTranscript = '';
  finalParts = [];
  interimText = '';
  if (!Ctor) return;

  try {
    recognizer?.abort();
  } catch {
    // ignore
  }

  const rec = new Ctor();
  rec.lang = lang;
  rec.continuous = true;
  rec.interimResults = true;
  rec.maxAlternatives = 1;

  rec.onresult = (event) => {
    if (recognizer !== rec) return;
    interimText = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      const text = result[0]?.transcript?.trim() || '';
      if (!text) continue;
      if (result.isFinal) finalParts.push(text);
      else interimText += ` ${text}`;
    }
  };
  rec.onerror = (event) => {
    // 'no-speech' / 'aborted' are normal; permission errors stop us for good.
    if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed') wantRunning = false;
  };
  rec.onend = () => {
    if (recognizer !== rec) return; // a newer session replaced this one
    // Chrome ends sessions after pauses; keep going while the user is still recording.
    if (wantRunning) {
      if (interimText.trim()) {
        finalParts.push(interimText.trim());
        interimText = '';
      }
      try {
        rec.start();
        return;
      } catch {
        // fall through to finish
      }
    }
    lastTranscript = currentText();
    const waiters = endWaiters;
    endWaiters = [];
    waiters.forEach((resolve) => resolve());
  };

  recognizer = rec;
  wantRunning = true;
  try {
    rec.start();
  } catch {
    wantRunning = false;
  }
}

/** Stop capturing and resolve with the transcript (empty string if nothing). */
export function stopLiveTranscription(): Promise<string> {
  const rec = recognizer;
  if (!rec || !wantRunning) {
    lastTranscript = lastTranscript || currentText();
    return Promise.resolve(lastTranscript);
  }
  wantRunning = false;
  pendingStop = new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      lastTranscript = lastTranscript || currentText();
      pendingStop = null;
      resolve(lastTranscript);
    };
    endWaiters.push(finish);
    // Final results can take a moment to arrive after stop(); don't wait forever.
    setTimeout(finish, 1500);
    try {
      rec.stop();
    } catch {
      finish();
    }
  });
  return pendingStop;
}

/** Like getLastBrowserTranscript, but waits for a stop that's still settling. */
export async function getBrowserTranscript(): Promise<string> {
  if (pendingStop) await pendingStop;
  return getLastBrowserTranscript();
}

/** Transcript of the most recent recording (kept until the next one starts, so retries reuse it). */
export function getLastBrowserTranscript(): string {
  return lastTranscript || currentText();
}

/** Discard the current capture (e.g. recording reset). */
export function cancelLiveTranscription(): void {
  wantRunning = false;
  finalParts = [];
  interimText = '';
  lastTranscript = '';
  const rec = recognizer;
  recognizer = null; // ignore any late events from the cancelled session
  try {
    rec?.abort();
  } catch {
    // ignore
  }
}
