import {
  AnalyzeAnswerInput,
  AnalyzeAnswerOutput,
  SupportedAIProvider,
  SupportedSTTProvider,
  TranscriptionOutput,
} from './types';

export class AIProviderUnavailableError extends Error {
  constructor(message = 'AI feedback is temporarily unavailable.') {
    super(message);
    this.name = 'AIProviderUnavailableError';
  }
}

export class STTProviderUnavailableError extends Error {
  constructor(message = 'Transcription service is temporarily unavailable.') {
    super(message);
    this.name = 'STTProviderUnavailableError';
  }
}

/**
 * Resolves active AI reasoning provider based on configuration and available keys.
 * Defaults to free providers for demo/portfolio usage.
 */
export function getActiveAIProvider(): {
  provider: SupportedAIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  const configured = (process.env.AI_PROVIDER || '').toLowerCase() as SupportedAIProvider;

  // 1. OpenRouter (Primary provider for Rolewise)
  if (configured === 'openrouter' || (!configured && process.env.OPENROUTER_API_KEY)) {
    return {
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseUrl: 'https://openrouter.ai/api/v1',
      model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
    };
  }

  // 2. Groq (Free tier, fast)
  if (configured === 'groq' || (!configured && process.env.GROQ_API_KEY)) {
    return {
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY || '',
      baseUrl: 'https://api.groq.com/openai/v1',
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    };
  }

  // 3. Google Gemini (Free tier via Google AI Studio)
  if (configured === 'gemini' || (!configured && process.env.GEMINI_API_KEY)) {
    return {
      provider: 'gemini',
      apiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    };
  }

  // 4. Local Ollama (Zero-cost local instance)
  if (configured === 'ollama' || (!configured && process.env.LOCAL_AI_BASE_URL)) {
    return {
      provider: 'ollama',
      apiKey: 'ollama',
      baseUrl: process.env.LOCAL_AI_BASE_URL || 'http://localhost:11434/v1',
      model: process.env.LOCAL_AI_MODEL || 'llama3.2',
    };
  }

  // Default fallback pointer to OpenRouter
  return {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
  };
}

/**
 * Resolves active Speech-to-Text provider based on configuration.
 */
export function getActiveSTTProvider(): {
  provider: SupportedSTTProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
} {
  const configured = (process.env.STT_PROVIDER || '').toLowerCase() as SupportedSTTProvider;

  // 1. OpenRouter Whisper (Primary STT provider for Rolewise)
  if (configured === 'openrouter' || (!configured && process.env.OPENROUTER_API_KEY)) {
    return {
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || '',
      baseUrl: 'https://openrouter.ai/api/v1/audio/transcriptions',
      model: process.env.OPENROUTER_STT_MODEL || 'openai/whisper-1',
    };
  }

  // 2. Groq Whisper (Free tier, fast)
  if (configured === 'groq' || (!configured && process.env.GROQ_API_KEY)) {
    return {
      provider: 'groq',
      apiKey: process.env.GROQ_API_KEY || '',
      baseUrl: 'https://api.groq.com/openai/v1/audio/transcriptions',
      model: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo',
    };
  }

  // Default fallback pointer to OpenRouter
  return {
    provider: 'openrouter',
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseUrl: 'https://openrouter.ai/api/v1/audio/transcriptions',
    model: 'openai/whisper-1',
  };
}

/**
 * Transcribes audio blob using the configured STT provider.
 * Keeps all API keys server-side.
 */
export async function transcribeAudioWithProvider(
  audioBlob: Blob,
  durationSeconds: number
): Promise<TranscriptionOutput> {
  const stt = getActiveSTTProvider();

  if (!stt.apiKey) {
    console.warn(`[STT Provider] No API key configured for STT provider: ${stt.provider}`);
    throw new STTProviderUnavailableError(
      'AI transcription is temporarily unavailable. Please try again.'
    );
  }

  const mimeType = audioBlob.type || 'audio/webm';
  let fileExtension = 'webm';
  if (mimeType.includes('mp4')) fileExtension = 'mp4';
  else if (mimeType.includes('wav')) fileExtension = 'wav';
  else if (mimeType.includes('ogg')) fileExtension = 'ogg';
  else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) fileExtension = 'mp3';
  else if (mimeType.includes('m4a')) fileExtension = 'm4a';
  else if (mimeType.includes('flac')) fileExtension = 'flac';
  else if (mimeType.includes('aac')) fileExtension = 'aac';

  // For OpenRouter, attempt JSON format with input_audio first
  if (stt.provider === 'openrouter') {
    try {
      const arrayBuf = await audioBlob.arrayBuffer();
      const base64Data = Buffer.from(arrayBuf).toString('base64');

      const jsonRes = await fetch(stt.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${stt.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://rolewise.app',
          'X-Title': 'Rolewise Voice Practice',
        },
        body: JSON.stringify({
          model: stt.model,
          input_audio: {
            data: base64Data,
            format: fileExtension,
          },
          language: 'en',
        }),
      });

      if (jsonRes.ok) {
        const jsonResult = await jsonRes.json();
        const transcriptText = (jsonResult?.text || jsonResult?.transcript || '').trim();
        if (transcriptText) {
          return {
            transcript: transcriptText,
            duration_seconds: durationSeconds,
          };
        }
      } else {
        const errText = await jsonRes.text();
        console.warn(`[OpenRouter STT JSON] Status ${jsonRes.status}:`, errText);
      }
    } catch (jsonErr) {
      console.warn('[OpenRouter STT JSON failed, trying multipart]', jsonErr);
    }
  }

  // Multipart form data
  const formData = new FormData();
  formData.append('file', audioBlob, `speech_recording.${fileExtension}`);
  formData.append('model', stt.model);
  formData.append('language', 'en');
  formData.append('response_format', 'json');

  try {
    const res = await fetch(stt.baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stt.apiKey}`,
        'HTTP-Referer': 'https://rolewise.app',
        'X-Title': 'Rolewise Voice Practice',
      },
      body: formData,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[STT Provider ${stt.provider}] Error ${res.status}:`, errorText);
      throw new STTProviderUnavailableError('AI transcription is temporarily unavailable. Please try again.');
    }

    const data = await res.json();
    const transcript = (data?.text || data?.transcript || '').trim();

    if (!transcript) {
      throw new Error("Couldn't understand the recording. Please try again.");
    }

    return {
      transcript,
      duration_seconds: durationSeconds,
    };
  } catch (err: unknown) {
    if (err instanceof STTProviderUnavailableError) throw err;
    console.error(`[STT Provider ${stt.provider}] Transcription failed:`, err);
    throw new STTProviderUnavailableError('AI transcription is temporarily unavailable. Please try again.');
  }
}

/**
 * Analyzes interview answer communication quality using the configured AI reasoning provider.
 * Strictly non-judgmental, focused on observable communication behaviors.
 */
export async function analyzeCommunicationWithProvider(
  input: AnalyzeAnswerInput
): Promise<AnalyzeAnswerOutput> {
  const ai = getActiveAIProvider();

  if (!ai.apiKey) {
    console.warn(`[AI Provider] No API key configured for AI provider: ${ai.provider}`);
    throw new AIProviderUnavailableError('AI feedback is temporarily unavailable.');
  }

  const {
    role,
    requirements,
    candidateExperience,
    question,
    transcript,
    previousQuestions = [],
    previousAnswers = [],
    preparationItems = [],
  } = input;

  const systemPrompt = `You are an elite communication coach and technical interviewer evaluating an interview response for "${role.title}" at "${role.company}".

Target Role Requirements:
${requirements.length > 0 ? requirements.map((r) => `- ${r}`).join('\n') : '- Professional domain competency'}

Candidate Experience Summary:
${candidateExperience ? candidateExperience.slice(0, 500) : 'Experienced candidate in the domain'}

Preparation Areas:
${preparationItems.length > 0 ? preparationItems.map((p) => `- ${p}`).join('\n') : '- User empathy, technical depth, stakeholder alignment'}

EVALUATION CRITERIA (Observable communication traits only):
1. Does the answer directly address the question?
2. Is the explanation clear and free of confusing jargon?
3. Is the answer structured (e.g. Situation -> Action -> Result)?
4. Does the candidate give a concrete example rather than vague generalities?
5. Does the candidate clearly explain their personal actions?
6. Does the candidate articulate the tangible outcome/impact?
7. Is the answer concise or unnecessarily rambling?
8. Are there notable filler words in the transcript?

CRITICAL CONSTRAINTS:
- Do NOT judge personality or psychological traits.
- Do NOT make claims about intelligence, mental state, or hiring probability.
- Do NOT generate numerical scores or percentages.
- Determine if a follow-up question is needed:
  - If a key outcome was omitted or the candidate's personal contribution was unclear, set follow_up_needed: true, and write a focused follow-up question.
  - If the answer is strong, set follow_up_needed: false, and generate a dynamic next question exploring another relevant competency from the role requirements.
- Return ONLY valid JSON matching this schema:
{
  "strengths": ["string", "string"],
  "improvements": ["string", "string"],
  "missing_elements": ["string"],
  "communication_feedback": {
    "clarity": "Strong" | "Developing" | "Needs more detail",
    "structure": "Strong" | "Developing" | "Needs more detail",
    "specificity": "Strong" | "Developing" | "Needs more detail",
    "conciseness": "Strong" | "Developing" | "Needs more detail"
  },
  "follow_up_needed": boolean,
  "follow_up_reason": "string",
  "next_question": "string",
  "next_competency": "string"
}`;

  const userPayload = JSON.stringify({
    question,
    transcript,
    previous_questions: previousQuestions,
    previous_answers: previousAnswers,
  });

  try {
    const res = await fetch(`${ai.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ai.apiKey}`,
      },
      body: JSON.stringify({
        model: ai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPayload },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[AI Provider ${ai.provider}] Error ${res.status}:`, errText);
      throw new AIProviderUnavailableError('AI feedback is temporarily unavailable.');
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new AIProviderUnavailableError('AI feedback is temporarily unavailable.');
    }

    const parsed = JSON.parse(content);

    return {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['Communicated relevant domain context.'],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ['Consider highlighting the measurable outcome.'],
      missing_elements: Array.isArray(parsed.missing_elements) ? parsed.missing_elements : [],
      communication_feedback: {
        clarity: parsed.communication_feedback?.clarity || 'Developing',
        structure: parsed.communication_feedback?.structure || 'Developing',
        specificity: parsed.communication_feedback?.specificity || 'Needs more detail',
        conciseness: parsed.communication_feedback?.conciseness || 'Developing',
      },
      follow_up_needed: Boolean(parsed.follow_up_needed),
      follow_up_reason: parsed.follow_up_reason || '',
      next_question: parsed.next_question || null,
      next_competency: parsed.next_competency || 'Role Execution',
    };
  } catch (err: unknown) {
    if (err instanceof AIProviderUnavailableError) throw err;
    console.error(`[AI Provider ${ai.provider}] Call failed:`, err);
    throw new AIProviderUnavailableError('AI feedback is temporarily unavailable.');
  }
}
