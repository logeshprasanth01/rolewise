import { FunctionsHttpError } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  AnalyzeRolePayload,
  AnalyzeRoleResponse,
  AnswerInterviewResponse,
  FitAnalysis,
  PreparationItem,
  Role,
  RoleRequirement,
  StartInterviewResponse,
  VoiceTranscriptionResponse,
  CommunicationAnalysisPayload,
  CommunicationAnalysisResponse,
  FinalFeedbackOutput,
} from '@/types/database';

export class RolewiseApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'RolewiseApiError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Invokes the Supabase Edge Function: analyze-role
 */
export async function invokeAnalyzeRole(
  payload: AnalyzeRolePayload
): Promise<AnalyzeRoleResponse> {
  const supabase = getSupabaseClient();

  // 1. Validation check
  if (!payload.jobDescription || payload.jobDescription.trim().length === 0) {
    throw new RolewiseApiError('Job description cannot be empty.', 'VALIDATION_ERROR');
  }

  if (!payload.resumeText || payload.resumeText.trim().length === 0) {
    throw new RolewiseApiError('Candidate resume or experience is required.', 'VALIDATION_ERROR');
  }

  // 2. Authentication check
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw new RolewiseApiError(
      `Session error: ${sessionError.message}`,
      'AUTH_ERROR',
      sessionError
    );
  }

  const session = sessionData?.session;
  if (!session?.access_token) {
    throw new RolewiseApiError(
      'Please sign in to analyze this role and build your personalized preparation workspace.',
      'AUTH_ERROR',
      { httpStatus: 401, error: 'No active session' }
    );
  }

  try {
    // 3. Edge function invocation
    const { data, error } = await supabase.functions.invoke<AnalyzeRoleResponse>('analyze-role', {
      body: {
        jobDescription: payload.jobDescription.trim(),
        resumeText: payload.resumeText.trim(),
        resumeFileName: payload.resumeFileName || 'resume.pdf',
        resumeMimeType: payload.resumeMimeType || 'application/pdf',
      },
    });

    if (error) {
      let httpStatus: number | string = 'Unknown';
      let errorBody: unknown = null;

      if (error instanceof FunctionsHttpError && error.context) {
        httpStatus = error.context.status;
        try {
          errorBody = await error.context.json();
        } catch {
          try {
            errorBody = await error.context.text();
          } catch {}
        }
      }

      const fullDetails = {
        httpStatus,
        errorMessage: error.message,
        errorName: error.name,
        responseBody: errorBody,
      };

      console.error('[Rolewise] Complete analyze-role error response:', fullDetails);

      const formattedBody =
        typeof errorBody === 'object' && errorBody !== null
          ? JSON.stringify(errorBody, null, 2)
          : String(errorBody || error.message);

      if (httpStatus === 401 || formattedBody.includes('Unauthorized')) {
        throw new RolewiseApiError(
          'Your session has expired or you are not signed in. Please sign in to continue.',
          'AUTH_ERROR',
          fullDetails
        );
      }

      throw new RolewiseApiError(
        `Edge Function Error (HTTP ${httpStatus}): ${formattedBody}`,
        'FUNCTION_ERROR',
        fullDetails
      );
    }

    if (!data) {
      throw new RolewiseApiError(
        'Empty response received from analysis engine. Please try again.',
        'EMPTY_RESPONSE'
      );
    }

    // Extract role_id from potential schema shapes
    const roleId = data.role_id || data.roleId || data.id || data.role?.id;
    if (!roleId) {
      console.warn('[Rolewise] Edge function response did not contain explicit role_id:', data);
    }

    return {
      ...data,
      role_id: roleId,
    };
  } catch (err: unknown) {
    if (err instanceof RolewiseApiError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : 'Network error or function unreachable.';
    throw new RolewiseApiError(message, 'NETWORK_ERROR', err);
  }
}

/**
 * Fetch a single role by ID from Supabase
 */
export async function getRole(roleId: string): Promise<Role | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (error) {
    console.error(`[Rolewise] Error fetching role ${roleId}:`, error);
    return null;
  }

  return data as Role;
}

/**
 * Fetch all roles (for current session or recent)
 */
export async function getUserRoles(): Promise<Role[]> {
  const supabase = getSupabaseClient();

  // Verify authenticated session exists before querying to respect RLS
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session?.user) {
    // Unauthenticated state: return empty list cleanly without violating RLS policies
    return [];
  }

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Rolewise] Error fetching roles:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return [];
  }

  return (data || []) as Role[];
}

/**
 * Fetch Role Fit data (role_requirements + fit_analysis)
 */
export async function getRoleFit(roleId: string): Promise<{
  role: Role | null;
  requirements: RoleRequirement[];
  fitAnalysis: FitAnalysis[];
}> {
  const supabase = getSupabaseClient();

  const [roleRes, reqRes, fitRes] = await Promise.all([
    supabase.from('roles').select('*').eq('id', roleId).single(),
    supabase.from('role_requirements').select('*').eq('role_id', roleId),
    supabase.from('fit_analysis').select('*').eq('role_id', roleId),
  ]);

  const role = roleRes.data ? (roleRes.data as Role) : null;
  const requirements = (reqRes.data || []) as RoleRequirement[];
  const fitAnalysis = (fitRes.data || []) as FitAnalysis[];

  // Join fit analysis with requirement title if stored separately
  const pairedFitAnalysis = fitAnalysis.map((item) => {
    const matchingReq = requirements.find((r) => r.id === item.requirement_id);
    return {
      ...item,
      requirement_title:
        item.requirement_title ||
        matchingReq?.requirement ||
        matchingReq?.title ||
        'Role Requirement',
      requirement_detail: matchingReq || null,
    };
  });

  return {
    role,
    requirements,
    fitAnalysis: pairedFitAnalysis,
  };
}

/**
 * Fetch Preparation Items for a role
 */
export async function getPreparationItems(roleId: string): Promise<{
  role: Role | null;
  items: PreparationItem[];
}> {
  const supabase = getSupabaseClient();

  const [roleRes, itemsRes] = await Promise.all([
    supabase.from('roles').select('*').eq('id', roleId).single(),
    supabase
      .from('preparation_items')
      .select('*')
      .eq('role_id', roleId)
      .order('created_at', { ascending: true }),
  ]);

  return {
    role: roleRes.data ? (roleRes.data as Role) : null,
    items: (itemsRes.data || []) as PreparationItem[],
  };
}



/**
 * Transcribe recorded audio blob using transcribe-interview-answer Edge Function or /api/interview/transcribe.
 * Server-side OpenRouter Whisper (openai/whisper-1) is used.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  durationSeconds: number
): Promise<VoiceTranscriptionResponse> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token || '';

  const mimeType = audioBlob.type || 'audio/webm';
  let fileExt = 'webm';
  if (mimeType.includes('wav')) fileExt = 'wav';
  else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) fileExt = 'mp3';
  else if (mimeType.includes('ogg')) fileExt = 'ogg';
  else if (mimeType.includes('m4a')) fileExt = 'm4a';
  else if (mimeType.includes('flac')) fileExt = 'flac';
  else if (mimeType.includes('aac')) fileExt = 'aac';
  else if (mimeType.includes('mp4')) fileExt = 'mp4';

  const formData = new FormData();
  formData.append('audio', audioBlob, `answer.${fileExt}`);
  formData.append('duration_seconds', String(durationSeconds));

  // 1. Try Supabase Edge Function first
  try {
    const { data, error } = await supabase.functions.invoke<VoiceTranscriptionResponse>(
      'transcribe-interview-answer',
      {
        body: formData,
      }
    );

    if (!error && data?.transcript) {
      return data;
    }

    if (error) {
      console.error('[Rolewise] transcribe-interview-answer Edge Function error:', error);
      let errorBody: Record<string, unknown> | null = null;
      let status = 500;

      if ('context' in error && error.context) {
        const ctx = error.context as Response;
        status = ctx.status || status;
        try {
          errorBody = (await ctx.clone().json()) as Record<string, unknown>;
        } catch {
          // ignore
        }
      }

      if (status === 503 || errorBody?.code === 'AI_PROVIDER_ERROR' || errorBody?.code === 'AI_TRANSCRIPTION_ERROR') {
        throw new RolewiseApiError(
          'AI transcription is temporarily unavailable. Please try again.',
          'AI_TRANSCRIPTION_ERROR',
          errorBody || error
        );
      }
    }
  } catch (err: unknown) {
    if (err instanceof RolewiseApiError) throw err;
    // Edge function network error or fallback; try Next.js API route
  }

  // 2. Next.js server route fallback
  try {
    const res = await fetch('/api/interview/transcribe', {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    const responseJson = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (
        res.status === 503 ||
        responseJson.code === 'AI_TRANSCRIPTION_ERROR' ||
        responseJson.code === 'AI_PROVIDER_ERROR' ||
        responseJson.error?.includes('AI transcription is temporarily unavailable')
      ) {
        throw new RolewiseApiError(
          'AI transcription is temporarily unavailable. Please try again.',
          'AI_TRANSCRIPTION_ERROR',
          responseJson
        );
      }

      throw new RolewiseApiError(
        responseJson.error || "Couldn't understand the recording. Please try again.",
        'AI_TRANSCRIPTION_ERROR',
        responseJson
      );
    }

    if (!responseJson.transcript) {
      throw new RolewiseApiError(
        "Couldn't understand the recording. Please try again.",
        'EMPTY_TRANSCRIPT'
      );
    }

    return responseJson as VoiceTranscriptionResponse;
  } catch (err: unknown) {
    if (err instanceof RolewiseApiError) throw err;
    const msg = err instanceof Error ? err.message : "Couldn't understand the recording. Please try again.";
    throw new RolewiseApiError(msg, 'AI_TRANSCRIPTION_ERROR', err);
  }
}

/**
 * Analyze communication quality and content using analyze-interview-answer Edge Function or /api/interview/analyze-communication.
 */
export async function analyzeCommunication(
  payload: CommunicationAnalysisPayload
): Promise<CommunicationAnalysisResponse> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token || '';

  // 1. Try Supabase Edge Function first
  try {
    const { data, error } = await supabase.functions.invoke<CommunicationAnalysisResponse>(
      'analyze-interview-answer',
      {
        body: payload,
      }
    );

    if (!error && data?.communication_feedback) {
      return data;
    }

    if (error) {
      console.error('[Rolewise] analyze-interview-answer Edge Function error:', error);
      throw new RolewiseApiError(
        'Your recording was captured, but AI feedback is temporarily unavailable.',
        'AI_FEEDBACK_ERROR',
        error
      );
    }
  } catch (err: unknown) {
    if (err instanceof RolewiseApiError) throw err;
    // Fall back to Next.js API route
  }

  // 2. Next.js server route fallback
  try {
    const res = await fetch('/api/interview/analyze-communication', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const responseJson = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new RolewiseApiError(
        'Your recording was captured, but AI feedback is temporarily unavailable.',
        'AI_FEEDBACK_ERROR',
        responseJson
      );
    }

    return responseJson as CommunicationAnalysisResponse;
  } catch (err: unknown) {
    if (err instanceof RolewiseApiError) throw err;
    const msg = err instanceof Error ? err.message : "Your recording was captured, but AI feedback is temporarily unavailable.";
    throw new RolewiseApiError(msg, 'AI_FEEDBACK_ERROR', err);
  }
}

/**
 * Invokes the 'interview-ai' Supabase Edge Function directly
 * powered by OpenRouter in the remote Supabase project dktjtnjkrmrxvksjizwn.
 */
export async function invokeInterviewAI<T = unknown>(payload: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseClient();

  // Primary and ONLY endpoint: Supabase Edge Function: interview-ai
  const { data, error } = await supabase.functions.invoke<T>('interview-ai', {
    body: payload,
  });

  if (!error && data) {
    return data;
  }

  if (error) {
    console.error('[Rolewise] interview-ai Edge Function error:', error);
    let errorBody: Record<string, unknown> | null = null;
    let status = 500;

    if ('context' in error && error.context) {
      const ctx = error.context as Response;
      status = ctx.status || status;
      try {
        errorBody = (await ctx.clone().json()) as Record<string, unknown>;
      } catch {
        try {
          const txt = await ctx.clone().text();
          errorBody = { raw: txt };
        } catch {
          // ignore
        }
      }
    }

    console.error('[Rolewise] Complete interview-ai error response:', {
      httpStatus: status,
      functionName: 'interview-ai',
      errorBody,
    });

    if (status === 401) {
      throw new RolewiseApiError(
        'Please sign in to practice your AI interview and save your progress.',
        'AUTH_ERROR',
        { status: 401, functionName: 'interview-ai', errorBody }
      );
    }

    if (status === 404) {
      throw new RolewiseApiError(
        `Supabase Edge Function 'interview-ai' not found (HTTP 404). Function must be deployed to Supabase project dktjtnjkrmrxvksjizwn.`,
        'AI_PROVIDER_ERROR',
        { status: 404, functionName: 'interview-ai', errorBody }
      );
    }

    if (errorBody?.error === 'AI_PROVIDER_ERROR') {
      const provMsg = String(errorBody.message || 'Unknown OpenRouter error');
      throw new RolewiseApiError(
        `OpenRouter Error (${errorBody.status || status}): ${provMsg}`,
        'AI_PROVIDER_ERROR',
        errorBody
      );
    }

    throw new RolewiseApiError(
      `interview-ai error (HTTP ${status}): ${String(errorBody?.message || error.message)}`,
      'AI_PROVIDER_ERROR',
      errorBody
    );
  }

  throw new RolewiseApiError('AI service returned empty response.', 'EMPTY_RESPONSE');
}

/**
 * Generate a dynamic interview question using interview-ai (OpenRouter openrouter/free).
 */
export async function generateInterviewQuestion(params: {
  roleId: string;
  sessionId?: string;
  questionNumber: number;
}): Promise<{ question: string; competency: string; questionNumber: number }> {
  return invokeInterviewAI<{ question: string; competency: string; questionNumber: number }>({
    action: 'generate_question',
    ...params,
  });
}

/**
 * Analyze candidate answer and get dynamic follow-up using interview-ai (OpenRouter openrouter/free).
 */
export async function analyzeInterviewAnswer(params: {
  roleId: string;
  sessionId?: string;
  question: string;
  transcript: string;
  previousAnswers?: string[];
}): Promise<CommunicationAnalysisResponse> {
  return invokeInterviewAI<CommunicationAnalysisResponse>({
    action: 'analyze_answer',
    ...params,
  });
}

/**
 * Get final interview qualitative feedback using interview-ai (OpenRouter openrouter/free).
 */
export async function getFinalInterviewFeedback(params: {
  roleId: string;
  sessionId?: string;
  answers: Array<{
    question: string;
    transcript: string;
    analysis?: CommunicationAnalysisResponse;
  }>;
}): Promise<FinalFeedbackOutput> {
  return invokeInterviewAI<FinalFeedbackOutput>({
    action: 'final_feedback',
    ...params,
  });
}


