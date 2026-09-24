import { getSupabaseClient } from '@/lib/supabase/client';
export { getSupabaseClient };
import type { User } from '@supabase/supabase-js';
import {
  AnalyzeRolePayload,
  AnalyzeRoleResponse,
  FitAnalysis,
  PreparationItem,
  Profile,
  Role,
  RoleRequirement,
  VoiceTranscriptionResponse,
  CommunicationAnalysisPayload,
  CommunicationAnalysisResponse,
  FinalFeedbackOutput,
} from '@/types/database';

export class RolewiseApiError extends Error {
  code: string;
  status?: number;
  details?: unknown;

  constructor(message: string, code = 'API_ERROR', details?: unknown, status?: number) {
    super(message);
    this.name = 'RolewiseApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

function normalizeRole(r: Record<string, unknown>): Role {
  const jobTitle = (r.job_title as string) || (r.title as string) || 'Target Role';
  const workModel = (r.work_model as string) || (r.workplace_type as string) || 'Full-time';
  return {
    ...r,
    id: String(r.id),
    title: jobTitle,
    job_title: jobTitle,
    company: (r.company as string) || 'Target Company',
    location: (r.location as string) || null,
    workplace_type: workModel,
    work_model: workModel,
    status: (r.status as string) || 'ready',
    job_description: (r.job_description as string) || '',
    created_at: (r.created_at as string) || new Date().toISOString(),
    updated_at: (r.updated_at as string) || new Date().toISOString(),
  } as Role;
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
    throw new RolewiseApiError('You must be signed in to analyze a job role.', 'AUTH_ERROR');
  }

  // Safe request logging (Part 3 requirement)
  console.log('[Rolewise] analyze-role context', {
    hasJobDescription: Boolean(payload.jobDescription && payload.jobDescription.trim().length > 0),
    jobDescriptionLength: payload.jobDescription.length,
    hasResumeText: Boolean(payload.resumeText && payload.resumeText.trim().length > 0),
    resumeTextLength: payload.resumeText?.length ?? 0,
  });

  try {
    // 3. Edge function invocation
    const { data, error } = await supabase.functions.invoke<AnalyzeRoleResponse>('analyze-role', {
      body: {
        roleId: payload.roleId,
        resumeId: payload.resumeId,
        jobDescription: payload.jobDescription.trim(),
        resumeText: payload.resumeText.trim(),
        resumeFileName: payload.resumeFileName || 'resume.pdf',
        resumeMimeType: payload.resumeMimeType || 'application/pdf',
        jobTitle: payload.jobTitle?.trim(),
        company: payload.company?.trim(),
        location: payload.location?.trim(),
        workModel: payload.workModel?.trim(),
      },
    });

    if (error) {
      let status = 500;
      let errorBody: Record<string, unknown> | null = null;
      let detailedMessage = error.message;

      if ('context' in error && error.context) {
        const ctx = error.context as Response;
        status = ctx.status || status;
        try {
          errorBody = (await ctx.clone().json()) as Record<string, unknown>;
          detailedMessage =
            (errorBody?.detail as string) ||
            (errorBody?.message as string) ||
            (errorBody?.error as string) ||
            detailedMessage;
        } catch {
          try {
            detailedMessage = (await ctx.clone().text()) || detailedMessage;
          } catch {
            // ignore
          }
        }
      }

      console.error('[Rolewise] analyze-role response', {
        status,
        errorName: error.name,
        errorMessage: detailedMessage,
        sanitizedResponseBody: errorBody,
      });

      throw new RolewiseApiError(
        detailedMessage || 'Failed to analyze job role on server.',
        'SERVER_ERROR',
        errorBody || error,
        status
      );
    }

    if (!data) {
      throw new RolewiseApiError(
        'Empty response received from role analysis service.',
        'SERVER_ERROR'
      );
    }

    console.log('[Rolewise] analyze-role response', {
      status: 200,
      roleId: data.role_id || data.id,
      success: true,
    });

    const roleId = data.role_id || data.roleId || data.id || data.role?.id;

    return {
      ...data,
      role_id: roleId,
    };
  } catch (err: unknown) {
    if (err instanceof RolewiseApiError) throw err;
    throw new RolewiseApiError(
      err instanceof Error ? err.message : 'Error analyzing job role.',
      'SERVER_ERROR',
      err
    );
  }
}

// Helper for local storage role persistence
function getLocalRoles(): Role[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('rolewise_local_roles');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalRole(role: Role) {
  if (typeof window === 'undefined') return;
  try {
    const roles = getLocalRoles().filter((r) => r.id !== role.id);
    localStorage.setItem('rolewise_local_roles', JSON.stringify([role, ...roles]));
  } catch (err) {
    console.warn('Failed to save role locally:', err);
  }
}

export function saveLocalRoleBundle(
  role: Role,
  requirements: RoleRequirement[],
  fitAnalysis: FitAnalysis[],
  prepItems: PreparationItem[]
) {
  saveLocalRole(role);
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`rolewise_reqs_${role.id}`, JSON.stringify(requirements));
    localStorage.setItem(`rolewise_fit_${role.id}`, JSON.stringify(fitAnalysis));
    localStorage.setItem(`rolewise_prep_${role.id}`, JSON.stringify(prepItems));
  } catch (err) {
    console.warn('Failed to save role bundle locally:', err);
  }
}

/**
 * Fetch a single role by ID strictly from Supabase for the authenticated user.
 * Confirms ownership (user_id = session.user.id) and active status (status != 'archived').
 * Never uses stale fallback/local roles.
 */
export async function getRole(roleId: string): Promise<Role | null> {
  if (!roleId || typeof roleId !== 'string') return null;
  const supabase = getSupabaseClient();

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session?.user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .eq('user_id', session.user.id)
    .neq('status', 'archived')
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return normalizeRole(data as Record<string, unknown>);
}

/**
 * Fetch all active roles for the current authenticated user.
 * Filters out archived roles.
 * Never merges stale or synthetic local roles.
 */
export async function getUserRoles(): Promise<Role[]> {
  const supabase = getSupabaseClient();

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (!session?.user?.id) {
    return [];
  }

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('user_id', session.user.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as Record<string, unknown>[]).map(normalizeRole);
}

/**
 * Removes / archives a role from the database.
 * Scoped to authenticated user's ID for ownership security.
 */
export async function removeRole(roleId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  if (session?.user) {
    const { error } = await supabase
      .from('roles')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', roleId)
      .eq('user_id', session.user.id);

    if (error) {
      console.error('[Rolewise] Failed to archive role in Supabase:', error.message);
      throw new RolewiseApiError("Couldn't remove this job. Please try again.", 'DATABASE_ERROR', error);
    }
  }

  // Also remove from local fallback storage and caches
  if (typeof window !== 'undefined') {
    try {
      const localRoles = getLocalRoles().filter((r) => r.id !== roleId);
      localStorage.setItem('rolewise_local_roles', JSON.stringify(localRoles));

      localStorage.removeItem(`rolewise_reqs_${roleId}`);
      localStorage.removeItem(`rolewise_fit_${roleId}`);
      localStorage.removeItem(`rolewise_prep_${roleId}`);
      sessionStorage.removeItem(`rolewise-interview-${roleId}`);
      sessionStorage.removeItem(`rolewise:interview:${roleId}`);
    } catch (e) {
      console.warn('[Rolewise] Notice clearing local role cache:', e);
    }
  }

  return true;
}

/**
 * Fetch Role Fit data (role_requirements + fit_analysis) strictly from Supabase.
 * Scoped strictly to the role and authenticated user.
 * No hardcoded or generic fallback content.
 */
export async function getRoleFit(roleId: string): Promise<{
  role: Role | null;
  requirements: RoleRequirement[];
  fitAnalysis: FitAnalysis[];
}> {
  const role = await getRole(roleId);
  if (!role) {
    return {
      role: null,
      requirements: [],
      fitAnalysis: [],
    };
  }

  const supabase = getSupabaseClient();

  try {
    const [reqRes, fitRes] = await Promise.all([
      supabase.from('role_requirements').select('*').eq('role_id', roleId).order('created_at', { ascending: true }),
      supabase.from('fit_analysis').select('*').eq('role_id', roleId).order('created_at', { ascending: true }),
    ]);

    const requirements = (reqRes.data || []) as RoleRequirement[];
    const fitAnalysis = (fitRes.data || []) as FitAnalysis[];

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
  } catch (err) {
    console.error('[Rolewise] Database getRoleFit error:', err);
    return {
      role,
      requirements: [],
      fitAnalysis: [],
    };
  }
}

/**
 * Fetch Preparation Items for a role strictly from Supabase.
 * Scoped strictly to the role and authenticated user.
 * No hardcoded or generic fallback content.
 */
export async function getPreparationItems(roleId: string): Promise<{
  role: Role | null;
  items: PreparationItem[];
}> {
  const role = await getRole(roleId);
  if (!role) {
    return {
      role: null,
      items: [],
    };
  }

  const supabase = getSupabaseClient();

  try {
    const itemsRes = await supabase
      .from('preparation_items')
      .select('*')
      .eq('role_id', roleId)
      .order('created_at', { ascending: true });

    return {
      role,
      items: (itemsRes.data || []) as PreparationItem[],
    };
  } catch (err) {
    console.error('[Rolewise] Database getPreparationItems error:', err);
    return {
      role,
      items: [],
    };
  }
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
 * Local fallback question generator for interview practice when provider is unavailable.
 */
function generateFallbackQuestion(payload: Record<string, unknown>): {
  question: string;
  competency: string;
  questionNumber: number;
  fallback: true;
} {
  const qNum =
    typeof payload.questionNumber === 'number' && payload.questionNumber > 0
      ? payload.questionNumber
      : 1;

  const roleTitle =
    typeof payload.roleTitle === 'string' && payload.roleTitle.trim()
      ? payload.roleTitle.trim()
      : '';
  const companyName =
    typeof payload.companyName === 'string' && payload.companyName.trim()
      ? payload.companyName.trim()
      : '';

  const target = roleTitle
    ? companyName
      ? `${roleTitle} at ${companyName}`
      : roleTitle
    : 'this role';

  const questionBank = [
    {
      question: `Can you walk me through your relevant background and how your hands-on experience prepares you for the responsibilities of ${target}?`,
      competency: 'Role Alignment & Experience',
    },
    {
      question: `Describe a complex technical or project challenge you tackled recently in your work. What specific constraints or trade-offs did you navigate, and what was the outcome?`,
      competency: 'Technical Problem Solving',
    },
    {
      question: `Tell me about a situation where you had to balance competing priorities, tight timelines, or technical debt while maintaining quality. How did you decide what to prioritize?`,
      competency: 'Execution & Prioritization',
    },
    {
      question: `Can you describe a scenario where you had to collaborate with a cross-functional partner or resolve a disagreement on an architectural decision? How did you build alignment?`,
      competency: 'Stakeholder Communication',
    },
    {
      question: `Reflecting on a recent major initiative you delivered, what is one key decision or approach you would change in hindsight, and what did you learn from the experience?`,
      competency: 'Continuous Learning & Impact',
    },
  ];

  const previousQuestions = Array.isArray(payload.previousQuestions)
    ? (payload.previousQuestions as string[])
    : [];

  const found =
    questionBank.find(
      (item) =>
        !previousQuestions.some(
          (pq) =>
            typeof pq === 'string' &&
            pq.toLowerCase().includes(item.competency.toLowerCase())
        )
    ) || questionBank[(qNum - 1) % questionBank.length];

  return {
    question: found.question,
    competency: found.competency,
    questionNumber: qNum,
    fallback: true,
  };
}

/**
 * Local fallback answer analysis evaluating the candidate's actual transcript.
 * Never uses fake candidate information; evaluates real transcript metrics.
 */
function generateFallbackAnalysis(payload: Record<string, unknown>): CommunicationAnalysisResponse {
  const transcript = typeof payload.transcript === 'string' ? payload.transcript.trim() : '';
  const words = transcript ? transcript.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  const strengths: string[] = [];
  const improvements: string[] = [];
  const missingElements: string[] = [];

  // Evaluate candidate's actual answer content
  if (wordCount >= 50) {
    strengths.push(
      'Delivered a comprehensive response that provided substantial context and walked through the situation systematically.'
    );
  } else if (wordCount >= 20) {
    strengths.push(
      'Clear, focused response that directly addressed the core question without unnecessary filler.'
    );
  } else if (wordCount > 0) {
    strengths.push('Provided a direct initial response to the question prompt.');
  } else {
    strengths.push('Completed answer submission for the question round.');
  }

  // Check for action verbs indicating ownership in the actual transcript
  const actionRegex =
    /\b(built|designed|implemented|led|managed|created|developed|analyzed|solved|delivered|improved|optimized|coordinated|refactored|launched|automated|architected)\b/i;
  if (actionRegex.test(transcript)) {
    strengths.push(
      'Demonstrated direct ownership and agency by emphasizing specific actions taken throughout the initiative.'
    );
  } else if (wordCount >= 30) {
    strengths.push(
      'Maintained consistent professional framing and logical progression of ideas.'
    );
  }

  // Check for metrics or quantifiable outcomes in the actual transcript
  const metricsRegex =
    /\b(\d+|%|percent|scale|users|latency|revenue|growth|reduced|increased|doubled|timeline|saving|budget)\b/i;
  if (metricsRegex.test(transcript)) {
    strengths.push(
      'Effectively grounded the narrative with concrete indicators or measurable outcomes.'
    );
  } else {
    strengths.push(
      'Communicated clearly with an authentic, conversational delivery tone.'
    );
  }

  // Actionable improvements based on the user's actual transcript
  if (!metricsRegex.test(transcript)) {
    improvements.push(
      'Incorporate quantifiable metrics or measurable business outcomes (e.g., percentages, scale, or team efficiency gains) to reinforce the impact of your actions.'
    );
  }

  if (wordCount < 35) {
    improvements.push(
      'Elaborate further on the specific technical methodology, constraints faced, or steps you personally orchestrated.'
    );
  } else if (wordCount > 180) {
    improvements.push(
      'Practice concise delivery by distilling background context and concluding promptly on key results.'
    );
  } else {
    improvements.push(
      'Structure the narrative explicitly with the STAR framework (Situation, Task, Action, Result) to make each phase unmistakable.'
    );
  }

  // Missing elements
  if (!metricsRegex.test(transcript)) {
    missingElements.push('Quantifiable metrics or tangible outcomes demonstrating measurable success.');
  }
  const challengesRegex =
    /\b(challenge|difficulty|tradeoff|constraint|risk|problem|obstacle|bottleneck)\b/i;
  if (!challengesRegex.test(transcript)) {
    missingElements.push('Explicit discussion of constraints, technical risks, or trade-offs navigated.');
  }
  if (missingElements.length === 0) {
    missingElements.push('Longer-term reflections or organizational learnings gained following the project.');
  }

  // Communication dimensions evaluated from actual transcript properties
  const hasMultiSentence = (transcript.match(/[.!?]/g) || []).length >= 2;
  const clarity = wordCount >= 30 ? 'Strong' : wordCount >= 15 ? 'Developing' : 'Needs more detail';
  const structure =
    hasMultiSentence && wordCount >= 25 ? 'Strong' : wordCount >= 15 ? 'Developing' : 'Needs more detail';
  const specificity =
    metricsRegex.test(transcript) || actionRegex.test(transcript)
      ? 'Strong'
      : wordCount >= 20
        ? 'Developing'
        : 'Needs more detail';
  const conciseness = wordCount >= 20 && wordCount <= 160 ? 'Strong' : 'Developing';

  const answerQuality: 'strong' | 'developing' | 'needs_work' =
    wordCount >= 40 && (actionRegex.test(transcript) || metricsRegex.test(transcript))
      ? 'strong'
      : wordCount >= 20
        ? 'developing'
        : 'needs_work';

  return {
    answer_quality: answerQuality,
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 2),
    missing_elements: missingElements.slice(0, 2),
    communication_feedback: {
      clarity,
      structure,
      specificity,
      conciseness,
    },
    follow_up_needed: false,
    follow_up_reason: '',
    next_question: null,
    fallback: true,
  };
}

/**
 * Local fallback final feedback synthesis using the candidate's actual answers.
 */
function generateFallbackFinalFeedback(payload: Record<string, unknown>): FinalFeedbackOutput {
  const answers = Array.isArray(payload.answers)
    ? (payload.answers as Array<{
        question?: string;
        transcript?: string;
        analysis?: CommunicationAnalysisResponse;
      }>)
    : [];

  const roundStrengths: string[] = [];
  const roundImprovements: string[] = [];
  let strongClarityCount = 0;
  let strongStructureCount = 0;
  let strongSpecificityCount = 0;
  let strongConcisenessCount = 0;

  for (const item of answers) {
    if (item.analysis?.strengths) {
      roundStrengths.push(...item.analysis.strengths);
    }
    if (item.analysis?.improvements) {
      roundImprovements.push(...item.analysis.improvements);
    }
    const comm = item.analysis?.communication_feedback;
    if (comm?.clarity === 'Strong') strongClarityCount++;
    if (comm?.structure === 'Strong') strongStructureCount++;
    if (comm?.specificity === 'Strong') strongSpecificityCount++;
    if (comm?.conciseness === 'Strong') strongConcisenessCount++;
  }

  const uniqueStrengths = Array.from(new Set(roundStrengths));
  const uniqueImprovements = Array.from(new Set(roundImprovements));
  const totalRounds = Math.max(answers.length, 1);

  const claritySummary =
    strongClarityCount >= totalRounds / 2
      ? 'Direct and articulate throughout responses. Ideas were communicated clearly with confident, steady delivery.'
      : 'Ideas were conveyed, with occasional digressions before returning to the central question.';

  const structureSummary =
    strongStructureCount >= totalRounds / 2
      ? 'Consistent logical framing across answers. Maintained a clear progression from context to action to resolution.'
      : 'Tendency to jump directly into implementation without establishing initial context and stakeholder constraints.';

  const specificitySummary =
    strongSpecificityCount >= totalRounds / 2
      ? 'Concrete details were highlighted effectively, referencing explicit tools, decisions, and outcomes.'
      : 'Answers relied more on general descriptions. Grounding responses in specific metrics and artifacts will strengthen impact.';

  const concisenessSummary =
    strongConcisenessCount >= totalRounds / 2
      ? 'Paced and concise delivery. Avoided rambling and kept responses focused on core contributions.'
      : 'Responses occasionally became verbose. Practice condensing background context to highlight final results.';

  const strengths =
    uniqueStrengths.length >= 2
      ? uniqueStrengths.slice(0, 4)
      : [
          'Demonstrated relevant practical knowledge and communicated project experiences authentically.',
          'Maintained a constructive, professional tone and stayed focused on the competencies addressed.',
          'Exhibited clear ownership when describing personal responsibilities and project deliverables.',
        ];

  const areasToImprove =
    uniqueImprovements.length >= 2
      ? uniqueImprovements.slice(0, 4)
      : [
          'Quantify outcomes more consistently by incorporating specific metrics, performance numbers, or timeline savings.',
          'Adopt the STAR (Situation, Task, Action, Result) storytelling framework to make every narrative response crisp.',
          'Explicitly highlight trade-offs and alternative solutions evaluated before arriving at your final decision.',
        ];

  const practiceExercises = [
    'Practice delivering 2-minute STAR responses focusing specifically on quantifiable metrics and outcomes.',
    'Prepare 2-3 deep-dive examples covering architectural trade-offs, technical constraints, and risk mitigation.',
    'Rehearse executive summary introductions that clearly state the problem and the end result upfront.',
  ];

  return {
    strengths,
    areas_to_improve: areasToImprove,
    communication: {
      clarity: claritySummary,
      structure: structureSummary,
      specificity: specificitySummary,
      conciseness: concisenessSummary,
    },
    practice_exercises: practiceExercises,
    fallback: true,
  };
}

/**
 * Invokes the 'interview-ai' Supabase Edge Function directly.
 * Target: Supabase Edge Function: interview-ai
 * Architecture: Browser -> Supabase authenticated request (JWT) -> interview-ai Edge Function -> Gemini
 */
export async function invokeInterviewAI<T = unknown>(payload: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseClient();

  // 1. Retrieve current Supabase session (TASK 4 & 8)
  const {
    data: { session: initialSession },
    error: sessionError,
  } = await supabase.auth.getSession();

  let session = initialSession;

  // 2. Check for stale session and refresh before invocation if expired (TASK 8)
  const nowSec = Math.floor(Date.now() / 1000);
  if (session?.expires_at && session.expires_at <= nowSec + 30) {
    try {
      const {
        data: { session: refreshedSession },
        error: refreshError,
      } = await supabase.auth.refreshSession();

      if (!refreshError && refreshedSession?.access_token) {
        session = refreshedSession;
      }
    } catch (refreshErr) {
      console.warn('[Rolewise] Session refresh notice:', refreshErr);
    }
  }

  // 3. Log session diagnostics (TASK 4 - NEVER log the access token itself)
  console.log('[Rolewise] interview-ai session:', {
    hasSession: Boolean(session),
    hasAccessToken: Boolean(session?.access_token),
    userId: session?.user?.id ?? null,
    expiresAt: session?.expires_at ?? null,
    sessionError: sessionError?.message ?? null,
  });

  // 4. Verify session access token exists before making request (TASK 4)
  if (!session?.access_token) {
    throw new RolewiseApiError(
      'Please sign in to practice your AI interview and save your progress.',
      'AUTH_ERROR',
      {
        status: 401,
        functionName: 'interview-ai',
      }
    );
  }

  // 5. Invoke interview-ai Edge Function forwarding user access token (TASK 2 & 5)
  let data: T | null = null;
  let error: (Error & { context?: Response }) | null = null;

  try {
    const res = await supabase.functions.invoke<T>('interview-ai', {
      body: payload,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    data = res.data;
    error = res.error as (Error & { context?: Response }) | null;
  } catch (invokeErr: unknown) {
    console.error('[Rolewise] interview-ai invocation threw error:', invokeErr);
    error =
      invokeErr instanceof Error
        ? (invokeErr as Error & { context?: Response })
        : new Error(String(invokeErr));
  }

  if (!error && data) {
    return data;
  }

  // 6. Log the actual Supabase function error (TASK 2)
  console.error('[Rolewise] interview-ai raw result:', {
    hasData: Boolean(data),
    data,
    hasError: Boolean(error),
    errorName: error?.name,
    errorMessage: error?.message,
    error,
  });

  console.error('[Rolewise] interview-ai error context:', {
    context: error?.context,
    contextType: error?.context?.constructor?.name,
  });

  // 7. Read error.context when available (TASK 3 - read body only once)
  let errorBody: unknown = null;
  let status = 500;

  if (error?.context instanceof Response) {
    status = error.context.status || status;
    try {
      const responseText = await error.context.text();
      try {
        errorBody = JSON.parse(responseText);
      } catch {
        errorBody = responseText;
      }
    } catch (readErr) {
      errorBody = { readError: String(readErr) };
    }
  }

  console.error('[Rolewise] interview-ai HTTP response:', {
    status: error?.context?.status ?? status,
    statusText: error?.context?.statusText,
    errorBody,
  });

  console.error('[Rolewise] interview-ai failure details:', {
    httpStatus: status,
    responseBody: errorBody,
    errorName: error?.name,
    errorMessage: error?.message,
    requestAction: payload.action,
    roleId: payload.roleId,
  });

  // Intercept 5xx and 429 errors for interview actions to guarantee uninterrupted practice
  const action = typeof payload.action === 'string' ? payload.action : '';
  const isInterviewAction =
    action === 'generate_question' ||
    action === 'analyze_answer' ||
    action === 'final_feedback';

  if ((status >= 500 || status === 429 || !data) && isInterviewAction) {
    console.warn(
      `[Rolewise] interview-ai provider unavailable (status ${status}). Returning local fallback for action "${action}".`
    );
    if (action === 'generate_question') {
      return generateFallbackQuestion(payload) as unknown as T;
    }
    if (action === 'analyze_answer') {
      return generateFallbackAnalysis(payload) as unknown as T;
    }
    if (action === 'final_feedback') {
      return generateFallbackFinalFeedback(payload) as unknown as T;
    }
  }

  // 8. Preserved user-facing error handling (TASK 16)
  if (status === 401) {
    throw new RolewiseApiError(
      'Please sign in to practice your AI interview and save your progress.',
      'AUTH_ERROR',
      {
        status: 401,
        functionName: 'interview-ai',
        errorBody,
      }
    );
  }

  if (status === 429) {
    throw new RolewiseApiError(
      'AI feedback is temporarily unavailable. Please try again shortly.',
      'RATE_LIMIT',
      {
        status: 429,
        functionName: 'interview-ai',
        errorBody,
      }
    );
  }

  if (status >= 500) {
    throw new RolewiseApiError(
      'The AI service is temporarily unavailable. Please try again.',
      'AI_SERVICE_ERROR',
      {
        status,
        functionName: 'interview-ai',
        errorBody,
      }
    );
  }

  const fallbackMsg =
    typeof errorBody === 'object' && errorBody && 'error' in errorBody
      ? String((errorBody as { error: unknown }).error)
      : typeof errorBody === 'object' && errorBody && 'message' in errorBody
        ? String((errorBody as { message: unknown }).message)
        : error?.message || `HTTP ${status}`;

  if (status === 404) {
    throw new RolewiseApiError(
      fallbackMsg || 'Role not found. Please select an active role from My Jobs.',
      'NOT_FOUND',
      {
        status: 404,
        functionName: 'interview-ai',
        errorBody,
      },
      404
    );
  }

  throw new RolewiseApiError(
    fallbackMsg,
    'AI_SERVICE_ERROR',
    {
      status,
      functionName: 'interview-ai',
      errorBody,
    },
    status
  );
}

/**
 * Generate a dynamic interview question using interview-ai Edge Function.
 */
export async function generateInterviewQuestion(params: {
  roleId: string;
  sessionId?: string;
  questionNumber: number;
  previousQuestions?: string[];
  roleTitle?: string;
  companyName?: string;
}): Promise<{ question: string; competency: string; questionNumber: number; fallback?: boolean }> {
  return invokeInterviewAI<{ question: string; competency: string; questionNumber: number; fallback?: boolean }>({
    action: 'generate_question',
    roleId: params.roleId,
    questionNumber: params.questionNumber,
    previousQuestions: params.previousQuestions || [],
    ...(params.roleTitle ? { roleTitle: params.roleTitle } : {}),
    ...(params.companyName ? { companyName: params.companyName } : {}),
    ...(params.sessionId ? { sessionId: params.sessionId } : {}),
  });
}

/**
 * Analyze candidate answer and get dynamic follow-up using interview-ai Edge Function.
 */
export async function analyzeInterviewAnswer(params: {
  roleId?: string;
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
 * Get final interview qualitative feedback using interview-ai Edge Function.
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

/**
 * Synchronizes the authenticated user with public.profiles.
 * Reuses existing profile without duplicate entries.
 * Enriches full_name and avatar_url from OAuth user metadata when available.
 */
export async function syncUserProfile(user: User): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const meta = (user.user_metadata || {}) as Record<string, unknown>;

  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.given_name === 'string' && typeof meta.family_name === 'string'
      ? `${meta.given_name} ${meta.family_name}`
      : null) ||
    user.email?.split('@')[0] ||
    'Candidate';

  const avatarUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null;

  try {
    const { data: existing, error: selectErr } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (selectErr && selectErr.code !== 'PGRST116') {
      console.warn('[Rolewise] Profile lookup notice:', selectErr.message);
    }

    if (!existing) {
      const { data: inserted, error: insertErr } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          full_name: fullName,
          email: user.email,
          avatar_url: avatarUrl,
        })
        .select()
        .single();

      if (insertErr) {
        console.warn('[Rolewise] Profile insert notice:', insertErr.message);
      }
      return (inserted as Profile) || null;
    } else {
      const updates: Record<string, unknown> = {};
      if (!existing.full_name && fullName) updates.full_name = fullName;
      if (!existing.avatar_url && avatarUrl) updates.avatar_url = avatarUrl;
      if (!existing.email && user.email) updates.email = user.email;

      if (Object.keys(updates).length > 0) {
        const { data: updated } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select()
          .single();
        return (updated as Profile) || (existing as Profile);
      }
      return existing as Profile;
    }
  } catch (err) {
    console.warn('[Rolewise] Profile sync error:', err);
    return null;
  }
}

/**
 * Fetch profile by user ID.
 */
export async function getUserProfile(userId: string): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Rolewise] getUserProfile notice:', error.message);
      return null;
    }
    return (data as Profile) || null;
  } catch (err) {
    console.warn('[Rolewise] getUserProfile exception:', err);
    return null;
  }
}


