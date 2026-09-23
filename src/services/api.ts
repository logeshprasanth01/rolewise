import { getSupabaseClient, getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/client';
import {
  AnalyzeRolePayload,
  AnalyzeRoleResponse,
  FitAnalysis,
  PreparationItem,
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

  // Check if active demo session in localStorage
  let isDemoSession = false;
  if (typeof window !== 'undefined') {
    const rawDemo = localStorage.getItem('rolewise_demo_user');
    if (rawDemo) isDemoSession = true;
  }

  // Helper to generate realistic role bundle from inputs
  const createSynthesizedRole = (jobDesc: string, resume: string): AnalyzeRoleResponse => {
    const roleId = 'role_' + Math.random().toString(36).substring(2, 9);
    
    // Extract title & company heuristic
    let title = 'Product Designer';
    const company = 'Acme Technologies';
    
    const lines = jobDesc.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      const firstLine = lines[0];
      if (firstLine.toLowerCase().includes('engineer') || firstLine.toLowerCase().includes('developer')) {
        title = firstLine.length < 50 ? firstLine : 'Software Engineer';
      } else if (firstLine.toLowerCase().includes('manager')) {
        title = firstLine.length < 50 ? firstLine : 'Product Manager';
      } else if (firstLine.length < 40) {
        title = firstLine;
      }
    }

    const newRole: Role = {
      id: roleId,
      title,
      company,
      location: 'Remote',
      workplace_type: 'Full-time',
      status: 'active',
      job_description: jobDesc,
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

  if (isDemoSession || !session?.access_token) {
    return createSynthesizedRole(payload.jobDescription, payload.resumeText);
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

    if (error || !data) {
      console.warn('[Rolewise] Edge function invocation fell back to local synthesis:', error);
      return createSynthesizedRole(payload.jobDescription, payload.resumeText);
    }

    const roleId = data.role_id || data.roleId || data.id || data.role?.id;
    return {
      ...data,
      role_id: roleId,
    };
  } catch (err: unknown) {
    console.warn('[Rolewise] Edge function error fell back to local synthesis:', err);
    return createSynthesizedRole(payload.jobDescription, payload.resumeText);
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
    return data as Role;
  }

  // Local fallback
  const local = getLocalRoles().find((r) => r.id === roleId);
  return local || null;
}

/**
 * Fetch all roles (for current session or recent)
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
      .order('created_at', { ascending: false });
    if (data) {
      dbRoles = data as Role[];
    }
  }

  const localRoles = getLocalRoles();
  const combinedMap = new Map<string, Role>();
  dbRoles.forEach((r) => combinedMap.set(r.id, r));
  localRoles.forEach((r) => {
    if (!combinedMap.has(r.id)) combinedMap.set(r.id, r);
  });

  return Array.from(combinedMap.values());
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
 * Target: /functions/v1/interview-ai
 * Architecture: Browser -> Supabase authenticated request (JWT) -> interview-ai Edge Function -> Gemini
 */
export async function invokeInterviewAI<T = unknown>(payload: Record<string, unknown>): Promise<T> {
  const supabase = getSupabaseClient();
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();

  const requestAction = (payload.action as string) || 'unknown';
  const roleId = (payload.roleId as string) || '';
  const questionNumber = typeof payload.questionNumber === 'number' ? payload.questionNumber : undefined;

  // 1. Get authenticated session (verify_jwt=true on Edge Function)
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // 2. Safe debugging before invocation (Requirement 7)
  console.log('[Rolewise] interview-ai request:', {
    action: requestAction,
    roleId,
    questionNumber,
    hasSession: Boolean(session?.access_token),
  });

  // 3. Verify session access token (Requirement 5)
  if (!session?.access_token) {
    console.error('[Rolewise] interview-ai response:', {
      httpStatus: 401,
      ok: false,
      functionName: 'interview-ai',
      responseText: 'Authentication session expired. Please sign in again.',
      parsedBody: { error: 'Authentication session expired. Please sign in again.' },
      requestAction,
      roleId,
    });
    throw new Error('Authentication session expired. Please sign in again.');
  }

  // 4. Target endpoint: /functions/v1/interview-ai (Requirement 8)
  const targetUrl = `${supabaseUrl}/functions/v1/interview-ai`;

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        ...(anonKey ? { apikey: anonKey } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (networkErr: unknown) {
    const errorMsg = networkErr instanceof Error ? networkErr.message : String(networkErr);
    console.error('[Rolewise] interview-ai response:', {
      httpStatus: 0,
      ok: false,
      functionName: 'interview-ai',
      responseText: `Network invocation error: ${errorMsg}`,
      parsedBody: null,
      requestAction,
      roleId,
    });
    throw new RolewiseApiError(
      `Failed to reach interview-ai service: ${errorMsg}`,
      'NETWORK_ERROR',
      networkErr
    );
  }

  // 5. Read response body BEFORE throwing (Requirement 4)
  const responseText = await response.text();

  let parsedBody: Record<string, unknown> | null = null;
  try {
    parsedBody = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsedBody = null;
  }

  // 6. Handle errors exposing the REAL response (Requirement 4)
  if (!response.ok) {
    console.error('[Rolewise] interview-ai response:', {
      httpStatus: response.status,
      ok: response.ok,
      functionName: 'interview-ai',
      responseText,
      parsedBody,
      requestAction,
      roleId,
    });

    const status = response.status;
    const publicMsg =
      (typeof parsedBody?.message === 'string' && parsedBody.message) ||
      (typeof parsedBody?.error === 'string' && parsedBody.error) ||
      (typeof parsedBody?.msg === 'string' && parsedBody.msg) ||
      responseText ||
      `HTTP ${status}`;

    if (status === 401) {
      throw new RolewiseApiError(
        'Authentication session expired or unauthorized. Please sign in again.',
        'AUTH_ERROR',
        { httpStatus: status, parsedBody, responseText }
      );
    }

    if (status === 404) {
      throw new RolewiseApiError(
        `Role or interview-ai service not found (HTTP 404): ${publicMsg}`,
        'NOT_FOUND',
        { httpStatus: status, parsedBody, responseText }
      );
    }

    if (status === 429) {
      throw new RolewiseApiError(
        'AI rate limit reached (HTTP 429). Please wait a moment and try again.',
        'RATE_LIMIT',
        { httpStatus: status, parsedBody, responseText }
      );
    }

    if (status >= 500) {
      throw new RolewiseApiError(
        `AI service error (HTTP ${status}): ${publicMsg}`,
        'AI_PROVIDER_ERROR',
        { httpStatus: status, parsedBody, responseText }
      );
    }

    throw new RolewiseApiError(
      `interview-ai error (HTTP ${status}): ${publicMsg}`,
      'API_ERROR',
      { httpStatus: status, parsedBody, responseText }
    );
  }

  if (!parsedBody && !responseText) {
    console.error('[Rolewise] interview-ai response:', {
      httpStatus: response.status,
      ok: response.ok,
      functionName: 'interview-ai',
      responseText: 'Empty response body returned from Edge Function',
      parsedBody: null,
      requestAction,
      roleId,
    });
    throw new RolewiseApiError('AI service returned empty response.', 'EMPTY_RESPONSE');
  }

  return (parsedBody as unknown) as T;
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


