import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function normalizeMime(value: string | null | undefined) {
  const base = (value || 'audio/webm').split(';')[0].trim().toLowerCase();
  const supported = new Set([
    'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg',
    'audio/flac', 'audio/mpeg', 'audio/m4a', 'audio/l16', 'audio/opus',
    'audio/alaw', 'audio/mulaw', 'audio/webm',
  ]);
  return supported.has(base) ? base : 'audio/webm';
}

async function uploadToGemini(key: string, bytes: ArrayBuffer, mimeType: string) {
  const start = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(bytes.byteLength),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: `rolewise-audio-${Date.now()}.webm` } }),
  });

  if (!start.ok) {
    const raw = await start.text();
    throw new Error(`Gemini file upload initialization failed (${start.status}): ${raw.slice(0, 500)}`);
  }

  const uploadUrl = start.headers.get('x-goog-upload-url') || start.headers.get('X-Goog-Upload-URL');
  if (!uploadUrl) throw new Error('Gemini did not return an upload URL.');

  const upload = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(bytes.byteLength),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
      'Content-Type': mimeType,
    },
    body: bytes,
  });

  if (!upload.ok) {
    const raw = await upload.text();
    throw new Error(`Gemini audio upload failed (${upload.status}): ${raw.slice(0, 500)}`);
  }

  const data = await upload.json();
  const uri = data.file?.uri;
  if (!uri) throw new Error('Gemini upload returned no file URI.');
  return uri;
}

async function transcribeWithGeminiFlash(key: string, bytes: ArrayBuffer, mimeType: string) {
  // Use Gemini's standard audio-understanding endpoint as a fallback. This avoids
  // relying exclusively on the currently overloaded gemini-3.5-transcribe model.
  const view = new Uint8Array(bytes);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < view.length; offset += chunkSize) {
    binary += String.fromCharCode(...view.subarray(offset, Math.min(offset + chunkSize, view.length)));
  }
  const audioBase64 = btoa(binary);
  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'x-goog-api-key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: 'Transcribe the spoken audio exactly in English. Return only the words spoken. Do not summarize, explain, or add labels.' },
            { inline_data: { mime_type: mimeType, data: audioBase64 } },
          ],
        }],
        generationConfig: { temperature: 0 },
      }),
    },
  );
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Gemini Flash transcription failed (${response.status}): ${raw.slice(0, 500)}`);
  }
  const data = JSON.parse(raw);
  const transcript = (data.candidates?.[0]?.content?.parts || [])
    .map((part: { text?: string }) => part.text || '')
    .join(' ')
    .trim();
  if (!transcript) throw new Error('Gemini Flash returned no transcript.');
  return transcript;
}

async function transcribeWithFallbackProvider(
  provider: 'groq' | 'openrouter',
  key: string,
  bytes: ArrayBuffer,
  mimeType: string,
) {
  const endpoint = provider === 'groq'
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://openrouter.ai/api/v1/audio/transcriptions';
  const model = provider === 'groq' ? 'whisper-large-v3-turbo' : 'openai/whisper-1';
  const form = new FormData();
  const extension = mimeType.includes('wav') ? 'wav'
    : mimeType.includes('mp4') ? 'mp4'
    : mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3'
    : mimeType.includes('ogg') ? 'ogg'
    : mimeType.includes('m4a') ? 'm4a'
    : 'webm';
  form.append('file', new Blob([bytes], { type: mimeType }), `rolewise-answer.${extension}`);
  form.append('model', model);
  form.append('response_format', 'json');
  form.append('language', 'en');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      ...(provider === 'openrouter' ? {
        'HTTP-Referer': 'https://rolewise.app',
        'X-Title': 'Rolewise Voice Practice',
      } : {}),
    },
    body: form,
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`${provider} transcription failed (${response.status}): ${raw.slice(0, 400)}`);
  const data = JSON.parse(raw);
  const transcript = String(data.text || data.transcript || '').trim();
  if (!transcript) throw new Error(`${provider} returned no transcript.`);
  return { transcript, model };
}

async function transcribe(key: string, uri: string, mimeType: string) {
  // Keep the request minimal and aligned with Google's current REST example.
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
    method: 'POST',
    headers: {
      'x-goog-api-key': key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gemini-3.5-transcribe',
      input: [{ type: 'audio', uri, mime_type: mimeType }],
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    let message = raw;
    try {
      const parsed = JSON.parse(raw);
      message = parsed.error?.message || parsed.message || raw;
    } catch {}
    throw new Error(`Gemini transcription failed (${response.status}): ${message.slice(0, 800)}`);
  }

  const data = JSON.parse(raw);
  const transcript = String(data.output_text || '').trim();
  if (!transcript) throw new Error('Gemini returned no transcript.');
  return transcript;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const key = Deno.env.get('GEMINI_API_KEY')?.trim();
    if (!key) return json({
      success: false,
      error: 'Transcription is temporarily unavailable.',
      code: 'AI_TRANSCRIPTION_CONFIG',
    }, 503);

    let bytes: ArrayBuffer;
    let mimeType = 'audio/webm';
    let durationSeconds = 0;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      let encoded = String(body.audio_base64 || body.data || '').trim();
      if (encoded.startsWith('data:')) encoded = encoded.slice(encoded.indexOf(',') + 1);
      if (!encoded) throw new Error('No audio data provided.');

      const binary = atob(encoded);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
      bytes = array.buffer;
      mimeType = normalizeMime(body.mime_type || body.mimeType);
      durationSeconds = Number(body.duration_seconds || 0);
    } else {
      const form = await req.formData();
      const file = form.get('audio');
      if (!(file instanceof File)) throw new Error('No audio file provided.');
      bytes = await file.arrayBuffer();
      mimeType = normalizeMime(file.type);
      durationSeconds = Number(form.get('duration_seconds') || 0);
    }

    if (!bytes.byteLength) throw new Error('Audio recording is empty.');
    if (bytes.byteLength > 25 * 1024 * 1024) throw new Error('Audio recording is too large.');

    console.log('[transcribe-interview-answer] received', {
      bytes: bytes.byteLength,
      mimeType,
      durationSeconds,
    });

    // Try the existing Gemini key with the general audio-capable Flash model first.
    // This avoids the overloaded dedicated transcription model and needs no extra secret.
    const attempts: string[] = [];
    try {
      const transcript = await transcribeWithGeminiFlash(key, bytes, mimeType);
      console.log('[transcribe-interview-answer] transcription succeeded', { provider: 'gemini-2.5-flash' });
      return json({ success: true, transcript, duration_seconds: Math.round(durationSeconds), model: 'gemini-2.5-flash', provider: 'gemini' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      attempts.push(message);
      console.warn('[transcribe-interview-answer] Gemini Flash fallback failed', message);
    }

    // If Flash is unavailable, try configured dedicated speech-to-text providers.
    const groqKey = Deno.env.get('GROQ_API_KEY')?.trim();
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')?.trim();

    if (groqKey) {
      try {
        const result = await transcribeWithFallbackProvider('groq', groqKey, bytes, mimeType);
        console.log('[transcribe-interview-answer] transcription succeeded', { provider: 'groq' });
        return json({ success: true, transcript: result.transcript, duration_seconds: Math.round(durationSeconds), model: result.model, provider: 'groq' });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        attempts.push(message);
        console.warn('[transcribe-interview-answer] Groq fallback failed', message);
      }
    } else {
      console.warn('[transcribe-interview-answer] GROQ_API_KEY is not configured');
    }

    if (openRouterKey) {
      try {
        const result = await transcribeWithFallbackProvider('openrouter', openRouterKey, bytes, mimeType);
        console.log('[transcribe-interview-answer] transcription succeeded', { provider: 'openrouter' });
        return json({ success: true, transcript: result.transcript, duration_seconds: Math.round(durationSeconds), model: result.model, provider: 'openrouter' });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        attempts.push(message);
        console.warn('[transcribe-interview-answer] OpenRouter fallback failed', message);
      }
    } else {
      console.warn('[transcribe-interview-answer] OPENROUTER_API_KEY is not configured');
    }

    try {
      const fileUri = await uploadToGemini(key, bytes, mimeType);
      const transcript = await transcribe(key, fileUri, mimeType);
      console.log('[transcribe-interview-answer] transcription succeeded', { provider: 'gemini' });
      return json({ success: true, transcript, duration_seconds: Math.round(durationSeconds), model: 'gemini-3.5-transcribe', provider: 'gemini' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      attempts.push(message);
      console.error('[transcribe-interview-answer] all configured providers failed', attempts);
      throw new Error(attempts.join(' | '));
    }
  } catch (err) {
    console.error('[transcribe-interview-answer] failed', err);
    const message = err instanceof Error ? err.message : String(err);
    const status = /\(429\)/.test(message) ? 429 : 503;

    return json({
      success: false,
      error: 'Your recording was captured, but transcription is temporarily unavailable.',
      code: status === 429 ? 'AI_TRANSCRIPTION_RATE_LIMITED' : 'AI_TRANSCRIPTION_ERROR',
    }, status);
  }
});