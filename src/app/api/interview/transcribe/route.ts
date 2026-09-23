import { NextRequest, NextResponse } from 'next/server';
import {
  transcribeAudioWithProvider,
  STTProviderUnavailableError,
  getActiveSTTProvider,
} from '@/lib/ai/providers';

export const runtime = 'nodejs';

/**
 * Speech-to-text audio transcription endpoint with provider abstraction.
 * Supports free providers (e.g. Groq Whisper) and keeps provider keys strictly server-side.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob | null;
    const durationParam = formData.get('duration_seconds');
    const durationSeconds = durationParam ? Math.round(Number(durationParam)) : 0;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided. Please record your answer first.' },
        { status: 400 }
      );
    }

    const activeSTT = getActiveSTTProvider();
    if (!activeSTT.apiKey) {
      return NextResponse.json(
        {
          error: `Transcription service is not configured. Please set ${
            activeSTT.provider === 'groq' ? 'GROQ_API_KEY' : 'API key'
          } in server environment.`,
          code: 'STT_KEY_MISSING',
          provider: activeSTT.provider,
        },
        { status: 503 }
      );
    }

    const result = await transcribeAudioWithProvider(audioFile, durationSeconds);

    return NextResponse.json({
      transcript: result.transcript,
      duration_seconds: result.duration_seconds,
      provider: activeSTT.provider,
    });
  } catch (error: unknown) {
    console.error('[Transcribe API] Error:', error);

    if (error instanceof STTProviderUnavailableError) {
      return NextResponse.json(
        {
          error: "Couldn't understand the recording. Please try again.",
          details: error.message,
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : "Couldn't understand the recording. Please try again.";
    return NextResponse.json(
      {
        error: "Couldn't understand the recording. Please try again.",
        details: message,
      },
      { status: 500 }
    );
  }
}
