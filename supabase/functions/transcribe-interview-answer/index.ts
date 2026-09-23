// Supabase Edge Function: transcribe-interview-answer
// Powered by OpenRouter Speech-to-Text (openai/whisper-1)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encode as encodeBase64 } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractAudioFormat(mimeType: string, filename?: string): string {
  const cleanMime = (mimeType || '').toLowerCase().split(';')[0].trim();
  if (cleanMime.includes('webm')) return 'webm';
  if (cleanMime.includes('wav')) return 'wav';
  if (cleanMime.includes('mp3') || cleanMime.includes('mpeg')) return 'mp3';
  if (cleanMime.includes('ogg')) return 'ogg';
  if (cleanMime.includes('flac')) return 'flac';
  if (cleanMime.includes('m4a')) return 'm4a';
  if (cleanMime.includes('aac')) return 'aac';
  if (cleanMime.includes('mp4')) return 'mp4';

  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext && ['webm', 'wav', 'mp3', 'ogg', 'flac', 'm4a', 'aac', 'mp4'].includes(ext)) {
      return ext;
    }
  }
  return 'webm';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');

    if (!openrouterKey || !openrouterKey.trim()) {
      console.error('[transcribe-interview-answer] OPENROUTER_API_KEY is not configured in Edge Function secrets');
      return new Response(
        JSON.stringify({
          error: 'AI transcription is temporarily unavailable. Please try again.',
          code: 'AI_PROVIDER_ERROR',
          details: 'OPENROUTER_API_KEY is not configured in Supabase Edge Function secrets',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = req.headers.get('content-type') || '';
    let arrayBuffer: ArrayBuffer | null = null;
    let audioFormat = 'webm';
    let durationSeconds = 0;
    let rawMimeType = 'audio/webm';

    if (contentType.includes('application/json')) {
      const jsonBody = await req.json().catch(() => ({}));
      const base64Data = jsonBody.audio_base64 || jsonBody.data || '';
      audioFormat = jsonBody.format || 'webm';
      durationSeconds = Math.round(Number(jsonBody.duration_seconds || 0));

      if (!base64Data) {
        return new Response(
          JSON.stringify({ error: 'No audio data provided. Please record your answer first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Convert base64 to binary
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      // Multipart form data
      const formData = await req.formData();
      const audioFile = formData.get('audio') as Blob | null;
      const durationParam = formData.get('duration_seconds');
      durationSeconds = durationParam ? Math.round(Number(durationParam)) : 0;

      if (!audioFile) {
        return new Response(
          JSON.stringify({ error: 'No audio file provided. Please record your answer first.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      rawMimeType = audioFile.type || 'audio/webm';
      audioFormat = extractAudioFormat(rawMimeType, (audioFile as File).name);
      arrayBuffer = await audioFile.arrayBuffer();
    }

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return new Response(
        JSON.stringify({ error: 'Audio recording is empty. Please record your answer again.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const audioBase64 = encodeBase64(arrayBuffer);
    console.log(`[transcribe-interview-answer] Audio ready: format=${audioFormat}, bytes=${arrayBuffer.byteLength}`);

    let transcript = '';
    let jsonErrorDetail = '';
    let multipartErrorDetail = '';

    // Method 1: OpenRouter transcription with JSON body (input_audio)
    try {
      const jsonReqPayload = {
        model: 'openai/whisper-1',
        input_audio: {
          data: audioBase64,
          format: audioFormat,
        },
        language: 'en',
      };

      console.log(`[transcribe-interview-answer] Sending JSON request to OpenRouter (model: openai/whisper-1, format: ${audioFormat}, base64Len: ${audioBase64.length})`);

      const openrouterRes = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openrouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://rolewise.app',
          'X-Title': 'Rolewise Voice Practice',
        },
        body: JSON.stringify(jsonReqPayload),
      });

      if (openrouterRes.ok) {
        const data = await openrouterRes.json();
        transcript = (data?.text || data?.transcript || '').trim();
      } else {
        const errorText = await openrouterRes.text();
        jsonErrorDetail = `JSON (${openrouterRes.status}): ${errorText}`;
        console.error('[transcribe-interview-answer] OpenRouter JSON error:', jsonErrorDetail);
      }
    } catch (err: unknown) {
      jsonErrorDetail = `JSON Exception: ${err instanceof Error ? err.message : String(err)}`;
      console.error('[transcribe-interview-answer] JSON exception:', jsonErrorDetail);
    }

    // Method 2: Multipart fallback to OpenRouter transcription endpoint
    if (!transcript) {
      try {
        const multipartBody = new FormData();
        const blobUpload = new Blob([arrayBuffer], { type: rawMimeType });
        multipartBody.append('file', blobUpload, `audio_recording.${audioFormat}`);
        multipartBody.append('model', 'openai/whisper-1');
        multipartBody.append('language', 'en');

        console.log(`[transcribe-interview-answer] Sending Multipart request to OpenRouter (model: openai/whisper-1, format: ${audioFormat})`);

        const openrouterMultipartRes = await fetch('https://openrouter.ai/api/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openrouterKey}`,
            'HTTP-Referer': 'https://rolewise.app',
            'X-Title': 'Rolewise Voice Practice',
          },
          body: multipartBody,
        });

        if (openrouterMultipartRes.ok) {
          const data = await openrouterMultipartRes.json();
          transcript = (data?.text || data?.transcript || '').trim();
        } else {
          const errorText = await openrouterMultipartRes.text();
          multipartErrorDetail = `Multipart (${openrouterMultipartRes.status}): ${errorText}`;
          console.error('[transcribe-interview-answer] OpenRouter Multipart error:', multipartErrorDetail);
        }
      } catch (multipartErr: unknown) {
        multipartErrorDetail = `Multipart Exception: ${multipartErr instanceof Error ? multipartErr.message : String(multipartErr)}`;
        console.error('[transcribe-interview-answer] Multipart exception:', multipartErrorDetail);
      }
    }

    // Method 3: Chat completions with input_audio fallback
    let chatAudioErrorDetail = '';
    if (!transcript) {
      const audioChatCandidateModels = [
        'google/gemini-2.0-flash-exp:free',
        'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
        'thinkingmachines/inkling-small:free',
      ];

      for (const audioModel of audioChatCandidateModels) {
        try {
          console.log(`[transcribe-interview-answer] Trying chat/completions input_audio with model: ${audioModel}`);
          const chatRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${openrouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://rolewise.app',
              'X-Title': 'Rolewise Voice Practice',
            },
            body: JSON.stringify({
              model: audioModel,
              messages: [
                {
                  role: 'user',
                  content: [
                    { type: 'text', text: 'Transcribe the following spoken audio verbatim. Output only the transcript text, with no extra conversational text or formatting.' },
                    {
                      type: 'input_audio',
                      input_audio: {
                        data: audioBase64,
                        format: audioFormat,
                      },
                    },
                  ],
                },
              ],
            }),
          });

          if (chatRes.ok) {
            const chatData = await chatRes.json();
            const textContent = chatData.choices?.[0]?.message?.content;
            if (textContent && typeof textContent === 'string' && textContent.trim()) {
              transcript = textContent.trim();
              console.log(`[transcribe-interview-answer] Chat audio transcription succeeded with model ${audioModel}:`, transcript);
              break;
            }
          } else {
            const chatErrText = await chatRes.text();
            chatAudioErrorDetail = `ChatAudio (${audioModel} - ${chatRes.status}): ${chatErrText}`;
            console.warn(`[transcribe-interview-answer] ${chatAudioErrorDetail}`);
          }
        } catch (chatErr) {
          chatAudioErrorDetail = `ChatAudio Exception: ${chatErr instanceof Error ? chatErr.message : String(chatErr)}`;
          console.warn(`[transcribe-interview-answer] ${chatAudioErrorDetail}`);
        }
      }
    }

    if (!transcript) {
      const combinedDetails = `[${jsonErrorDetail}] | [${multipartErrorDetail}]`;
      console.error('[transcribe-interview-answer] All OpenRouter transcription attempts failed:', combinedDetails);
      return new Response(
        JSON.stringify({
          error: 'AI transcription is temporarily unavailable. Please try again.',
          code: 'AI_TRANSCRIPTION_ERROR',
          details: combinedDetails,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        transcript,
        duration_seconds: durationSeconds,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown transcription error';
    console.error('[transcribe-interview-answer] Uncaught server error:', err);
    return new Response(
      JSON.stringify({
        error: 'AI transcription is temporarily unavailable. Please try again.',
        code: 'AI_TRANSCRIPTION_ERROR',
        details: message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
