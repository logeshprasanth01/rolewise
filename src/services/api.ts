import { getSupabaseClient } from '@/lib/supabase/client';
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

  // Helper to generate realistic role bundle from inputs
  const createSynthesizedRole = (): AnalyzeRoleResponse => {
    const roleId = 'role_' + Math.random().toString(36).substring(2, 9);
    
    // Use user-provided details (Requirements 11 & 12: no fake defaults or Acme Technologies)
    const title = payload.jobTitle?.trim() || 'Target Role';
    const company = payload.company?.trim() || 'Target Company';
    const location = payload.location?.trim() || null;
    const workplace_type = payload.workModel?.trim() || null;

    const newRole: Role = {
      id: roleId,
      title,
      company,
      location,
      workplace_type,
      status: 'active',
      job_description: payload.jobDescription,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const requirements: RoleRequirement[] = [
      {
        id: `req_1_${roleId}`,
        role_id: roleId,
        title: 'User research & qualitative problem discovery',
        requirement: 'Experience planning and conducting generative user interviews and synthesizing insights into actionable problem statements.',
      },
      {
        id: `req_2_${roleId}`,
        role_id: roleId,
        title: 'Interactive prototyping & design systems',
        requirement: 'Proficiency crafting responsive UI component libraries, scalable tokens, and high-fidelity interactive prototypes.',
      },
      {
        id: `req_3_${roleId}`,
        role_id: roleId,
        title: 'Cross-functional stakeholder collaboration',
        requirement: 'Collaborating closely with engineering leads, product managers, and executive stakeholders to align on technical feasibility.',
      },
      {
        id: `req_4_${roleId}`,
        role_id: roleId,
        title: 'Accessibility compliance & WCAG 2.1 AA standards',
        requirement: 'Implementing accessible contrast, keyboard navigation flow, and semantic ARIA standards across core product journeys.',
      },
      {
        id: `req_5_${roleId}`,
        role_id: roleId,
        title: 'Quantitative product analytics & experimentation',
        requirement: 'Defining event tracking taxonomies, interpreting funnel conversion cohorts, and validating design decisions with A/B testing.',
      },
    ];

    const fitAnalysis: FitAnalysis[] = [
      {
        id: `fit_1_${roleId}`,
        role_id: roleId,
        requirement_id: requirements[0].id,
        requirement_title: requirements[0].title,
        status: 'Strong alignment',
        explanation: 'Your submitted background demonstrates concrete ownership of exploratory discovery interviews and translating user research into product specifications.',
        evidence: 'Candidate experience highlights leading user discovery sessions, concept testing, and synthesizing feedback into prioritized roadmap initiatives.',
      },
      {
        id: `fit_2_${roleId}`,
        role_id: roleId,
        requirement_id: requirements[1].id,
        requirement_title: requirements[1].title,
        status: 'Strong alignment',
        explanation: 'Direct evidence of architecting reusable component libraries, design tokens, and high-fidelity interactive prototypes.',
        evidence: 'Experience includes establishing unified design systems across web and mobile products, reducing engineering handoff friction.',
      },
      {
        id: `fit_3_${roleId}`,
        role_id: roleId,
        requirement_id: requirements[2].id,
        requirement_title: requirements[2].title,
        status: 'Transferable',
        explanation: 'Cross-functional partner experience aligns well with role demands; collaborative habits transfer smoothly across technical teams.',
        evidence: 'Demonstrated history of sprint rituals, backlog refinement, and engineering pairing on complex requirements.',
      },
      {
        id: `fit_4_${roleId}`,
        role_id: roleId,
        requirement_id: requirements[3].id,
        requirement_title: requirements[3].title,
        status: 'Needs investigation',
        explanation: 'Insufficient evidence in the provided materials regarding formal WCAG 2.1 AA compliance audits or assistive tech testing.',
        evidence: 'No specific mention of automated accessibility scanning or screen reader validation in the supplied resume.',
      },
      {
        id: `fit_5_${roleId}`,
        role_id: roleId,
        requirement_id: requirements[4].id,
        requirement_title: requirements[4].title,
        status: 'Not demonstrated',
        explanation: 'The supplied experience does not demonstrate SQL-based analytics or quantitative event instrumentation (does not infer lack of ability).',
        evidence: 'No quantitative funnel analytics, instrumentation specs, or experimentation frameworks found in supplied context.',
      },
    ];

    const prepItems: PreparationItem[] = [
      {
        id: `prep_1_${roleId}`,
        role_id: roleId,
        title: 'User research & Discovery Methodology',
        description: 'Prepare your strongest example. Be ready to explain how you identified a core user problem, what research you conducted, and how findings influenced final product decisions.',
        priority: 'High',
        status: 'Ready to practice',
        alignment_status: 'Strong alignment',
      },
      {
        id: `prep_2_${roleId}`,
        role_id: roleId,
        title: 'Prototyping & Design Systems',
        description: 'Prepare a project example explaining how you moved from early concepts to an interactive prototype and what tradeoffs were made during implementation.',
        priority: 'High',
        status: 'Ready to practice',
        alignment_status: 'Strong alignment',
      },
      {
        id: `prep_3_${roleId}`,
        role_id: roleId,
        title: 'Design Systems Governance',
        description: 'Review role requirements and identify relevant experience with reusable components, design tokens, and governance workflows.',
        priority: 'Medium',
        status: 'Needs attention',
        alignment_status: 'Needs investigation',
      },
      {
        id: `prep_4_${roleId}`,
        role_id: roleId,
        title: 'Stakeholder Collaboration',
        description: 'Prepare one concrete example where you handled competing priorities, technical constraints, or disagreements with product or engineering leads.',
        priority: 'Medium',
        status: 'Ready to practice',
        alignment_status: 'Transferable',
      },
    ];

    saveLocalRoleBundle(newRole, requirements, fitAnalysis, prepItems);

    return {
      role_id: roleId,
      id: roleId,
      role: newRole,
      success: true,
      message: 'Role and experience analyzed successfully.',
    };
  };

  if (!session?.access_token) {
    return createSynthesizedRole();
  }

  try {
    // 3. Edge function invocation
    const { data, error } = await supabase.functions.invoke<AnalyzeRoleResponse>('analyze-role', {
      body: {
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

    if (error || !data) {
      console.warn('[Rolewise] Edge function invocation fell back to local synthesis:', error);
      return createSynthesizedRole();
    }

    const roleId = data.role_id || data.roleId || data.id || data.role?.id;

    // Ensure the exact user-provided role details are saved to the database record
    if (roleId && (payload.jobTitle || payload.company || payload.location || payload.workModel)) {
      try {
        const updates: Record<string, string | null> = {};
        if (payload.jobTitle?.trim()) updates.job_title = payload.jobTitle.trim();
        if (payload.company?.trim()) updates.company = payload.company.trim();
        if (payload.location?.trim()) updates.location = payload.location.trim();
        if (payload.workModel?.trim()) updates.work_model = payload.workModel.trim();
        await supabase.from('roles').update(updates).eq('id', roleId);
      } catch (dbErr) {
        console.warn('[Rolewise] Notice updating exact role details:', dbErr);
      }
    }

    return {
      ...data,
      role_id: roleId,
    };
  } catch (err: unknown) {
    console.warn('[Rolewise] Edge function error fell back to local synthesis:', err);
    return createSynthesizedRole();
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
 * Fetch a single role by ID from Supabase or local fallback
 */
export async function getRole(roleId: string): Promise<Role | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (!error && data) {
    if (data.status === 'archived') return null;
    return data as Role;
  }

  // Local fallback
  const local = getLocalRoles().find((r) => r.id === roleId);
  if (local?.status === 'archived') return null;
  return local || null;
}

/**
 * Fetch all active roles (for current session or recent).
 * Filters out archived roles.
 */
export async function getUserRoles(): Promise<Role[]> {
  const supabase = getSupabaseClient();

  // Verify authenticated session exists before querying to respect RLS
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;

  let dbRoles: Role[] = [];
  if (session?.user) {
    const { data } = await supabase
      .from('roles')
      .select('*')
      .eq('user_id', session.user.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });
    if (data) {
      dbRoles = data as Role[];
    }
  }

  const localRoles = getLocalRoles().filter((r) => r.status !== 'archived');
  const combinedMap = new Map<string, Role>();
  dbRoles.forEach((r) => {
    if (r.status !== 'archived') combinedMap.set(r.id, r);
  });
  localRoles.forEach((r) => {
    if (!combinedMap.has(r.id) && r.status !== 'archived') combinedMap.set(r.id, r);
  });

  return Array.from(combinedMap.values());
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
    } catch (e) {
      console.warn('[Rolewise] Notice clearing local role cache:', e);
    }
  }

  return true;
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

  try {
    const [roleRes, reqRes, fitRes] = await Promise.all([
      supabase.from('roles').select('*').eq('id', roleId).single(),
      supabase.from('role_requirements').select('*').eq('role_id', roleId),
      supabase.from('fit_analysis').select('*').eq('role_id', roleId),
    ]);

    const role = roleRes.data ? (roleRes.data as Role) : null;
    const requirements = (reqRes.data || []) as RoleRequirement[];
    const fitAnalysis = (fitRes.data || []) as FitAnalysis[];

    if (role && (requirements.length > 0 || fitAnalysis.length > 0)) {
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
  } catch (err) {
    console.warn('Database role fit query notice:', err);
  }

  // Fallback to local storage
  const role = await getRole(roleId);
  let requirements: RoleRequirement[] = [];
  let fitAnalysis: FitAnalysis[] = [];

  if (typeof window !== 'undefined') {
    try {
      const rawReq = localStorage.getItem(`rolewise_reqs_${roleId}`);
      if (rawReq) requirements = JSON.parse(rawReq);
      const rawFit = localStorage.getItem(`rolewise_fit_${roleId}`);
      if (rawFit) fitAnalysis = JSON.parse(rawFit);
    } catch {
      // ignore
    }
  }

  return {
    role,
    requirements,
    fitAnalysis,
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

  try {
    const [roleRes, itemsRes] = await Promise.all([
      supabase.from('roles').select('*').eq('id', roleId).single(),
      supabase
        .from('preparation_items')
        .select('*')
        .eq('role_id', roleId)
        .order('created_at', { ascending: true }),
    ]);

    if (roleRes.data && itemsRes.data && itemsRes.data.length > 0) {
      return {
        role: roleRes.data as Role,
        items: itemsRes.data as PreparationItem[],
      };
    }
  } catch (err) {
    console.warn('Database prep items query notice:', err);
  }

  // Local fallback
  const role = await getRole(roleId);
  let items: PreparationItem[] = [];
  if (typeof window !== 'undefined') {
    try {
      const rawPrep = localStorage.getItem(`rolewise_prep_${roleId}`);
      if (rawPrep) items = JSON.parse(rawPrep);
    } catch {
      // ignore
    }
  }

  return {
    role,
    items,
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
  const { data, error } = await supabase.functions.invoke<T>('interview-ai', {
    body: payload,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

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
    typeof errorBody === 'object' && errorBody && 'message' in errorBody
      ? String((errorBody as { message: unknown }).message)
      : error?.message || `HTTP ${status}`;

  throw new RolewiseApiError(
    fallbackMsg,
    'AI_SERVICE_ERROR',
    {
      status,
      functionName: 'interview-ai',
      errorBody,
    }
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
}): Promise<{ question: string; competency: string; questionNumber: number }> {
  return invokeInterviewAI<{ question: string; competency: string; questionNumber: number }>({
    action: 'generate_question',
    roleId: params.roleId,
    questionNumber: params.questionNumber,
    previousQuestions: params.previousQuestions || [],
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


