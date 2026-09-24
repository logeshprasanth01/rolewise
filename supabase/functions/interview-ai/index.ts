import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

class ProviderError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Fast Gemini caller with timeout protection and verified candidate models.
 */
async function callGemini(key: string, systemPrompt: string, userPrompt: string, overrideModel?: string): Promise<any> {
  const candidateModels = overrideModel
    ? [{ name: overrideModel, tb: undefined }, { name: 'gemini-3.6-flash', tb: 0 }, { name: 'gemini-3-flash-preview', tb: undefined }]
    : [
        { name: 'gemini-3.6-flash', tb: 0 },
        { name: 'gemini-3-flash-preview', tb: undefined },
        { name: 'gemini-flash-lite-latest', tb: undefined },
      ];
  let lastStatus = 503;
  let lastMessage = 'Gemini service is temporarily unavailable.';

  for (const candidate of candidateModels) {
    const model = candidate.name;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[AI Interview] Gemini request started (${model}, attempt ${attempt})`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const genConfig: any = {
          responseMimeType: 'application/json',
          temperature: 0.3,
        };
        if (candidate.tb !== undefined) {
          genConfig.thinkingConfig = { thinkingBudget: candidate.tb };
        }

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': key,
            },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
              generationConfig: genConfig,
            }),
            signal: controller.signal,
          },
        );
        clearTimeout(timeoutId);

        const raw = await res.text();
        lastStatus = res.status;

        if (!res.ok) {
          let msg = raw;
          try {
            const parsed = JSON.parse(raw);
            msg = parsed.error?.message || parsed.message || raw;
          } catch {}
          lastMessage = msg;
          console.warn(`[AI Interview] Gemini model ${model} error (${res.status}): ${msg}`);

          if (res.status === 401 || res.status === 403) {
            throw new ProviderError(res.status, `API/auth configuration error (${res.status}): ${msg}`);
          }
          if (res.status === 503 && attempt === 1) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          break;
        }

        console.log('[AI Interview] Gemini response received');

        let data: any;
        try {
          data = JSON.parse(raw);
        } catch {
          lastStatus = 502;
          lastMessage = 'Invalid JSON response from Gemini.';
          break;
        }

        const content = data.candidates?.[0]?.content?.parts
          ?.map((p: any) => p.text ?? '')
          .join('')
          .trim();

        if (!content) {
          lastStatus = 502;
          lastMessage = 'Gemini returned an empty response.';
          break;
        }

        let parsed: any;
        try {
          parsed = JSON.parse(content);
        } catch {
          let cleaned = content;
          if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
          else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
          if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
          parsed = JSON.parse(cleaned.trim());
        }

        console.log('[AI Interview] question parsed');
        return parsed;
      } catch (err: unknown) {
        if (err instanceof ProviderError && (err.status === 401 || err.status === 403)) {
          throw err;
        }
        lastMessage = err instanceof Error ? err.message : String(err);
        console.warn(`[AI Interview] Attempt with model ${model} notice:`, lastMessage);
        break;
      }
    }
  }

  throw new ProviderError(lastStatus, lastMessage);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  console.log('[AI Interview] start');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized: Missing Authorization header.' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userError } = await authClient.auth.getUser(token);
    if (userError || !user) {
      console.error('[AI Interview] auth check failed:', userError);
      return json({ error: 'Unauthorized: Invalid Supabase user session.' }, 401);
    }

    console.log('[AI Interview] authenticated user');

    const geminiKey = Deno.env.get('GEMINI_API_KEY')?.trim();
    if (!geminiKey) return json({ error: 'AI feedback is temporarily unavailable.' }, 503);

    const body = await req.json().catch(() => ({}));
    const {
      action,
      roleId,
      questionNumber = 1,
      question = '',
      transcript = '',
      previousAnswers = [],
      answers = [],
      previousQuestions = [],
      testModel,
    } = body;

    console.log(`[AI Interview] roleId: ${roleId || 'none'}`);

    if (!action) return json({ error: 'Action parameter is required' }, 400);

    // Database client (using service role key if available for safe, fast lookups)
    const db = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : authClient;

    let roleTitle = 'Specialist';
    let companyName = 'Target Company';
    let jobDescription = '';
    let requirementsList: string[] = [];
    let preparationItemsList: string[] = [];
    let fitAnalysisList: string[] = [];
    let candidateExperience = '';

    if (roleId) {
      const [roleRes, reqRes, prepRes, fitRes] = await Promise.all([
        db.from('roles').select('*').eq('id', roleId).eq('user_id', user.id).maybeSingle(),
        db.from('role_requirements').select('requirement, category, importance').eq('role_id', roleId),
        db.from('preparation_items').select('title, description, priority').eq('role_id', roleId),
        db.from('fit_analysis').select('status, explanation, evidence').eq('role_id', roleId),
      ]);

      if (!roleRes.data || roleRes.data.status === 'archived') {
        console.warn('[AI Interview] role not found or archived for authenticated user');
        return json({ error: 'Role not found' }, 404);
      }

      console.log('[AI Interview] role loaded');
      console.log('[AI Interview] requirements loaded');
      console.log('[AI Interview] fit analysis loaded');
      console.log('[AI Interview] preparation loaded');

      roleTitle = roleRes.data.job_title || roleRes.data.title || roleTitle;
      companyName = roleRes.data.company || companyName;
      jobDescription = roleRes.data.job_description || '';

      if (roleRes.data.resume_id) {
        const { data: resumeData } = await db
          .from('resumes')
          .select('resume_text')
          .eq('id', roleRes.data.resume_id)
          .maybeSingle();

        if (resumeData?.resume_text) {
          candidateExperience = resumeData.resume_text.slice(0, 4000);
        }
      }

      console.log('[AI Interview] resume loaded');

      requirementsList = (reqRes.data ?? [])
        .map((r: any) => r.requirement || '')
        .filter(Boolean);

      preparationItemsList = (prepRes.data ?? [])
        .map((p: any) => `${p.title}: ${p.description || ''}`)
        .filter(Boolean);

      fitAnalysisList = (fitRes.data ?? [])
        .map((f: any) => `${f.status}: ${f.explanation || ''}${f.evidence ? ` (Evidence: ${f.evidence})` : ''}`)
        .filter(Boolean);
    }

    if (action === 'generate_question') {
      const systemPrompt = `You are an experienced interviewer conducting a realistic interview for the target role "${roleTitle}" at "${companyName}".

Target Role Requirements (Ground your question in these):
${requirementsList.length ? requirementsList.slice(0, 6).map(r => `- ${r}`).join('\n') : '- Professional competency and problem solving'}

Role Fit Context:
${fitAnalysisList.length ? fitAnalysisList.slice(0, 6).map(f => `- ${f}`).join('\n') : '- Evaluated candidate experience'}

Candidate Experience Evidence:
${candidateExperience || 'Candidate profile on file.'}

Preparation Focus:
${preparationItemsList.length ? preparationItemsList.slice(0, 5).map(p => `- ${p}`).join('\n') : '- Role competency and communication'}

Rules:
- Generate Question ${Number(questionNumber)} of 5.
- The question must be specific to "${roleTitle}" at "${companyName}" and directly probe one of the target role requirements.
- Never use a generic placeholder question (e.g. do not say "Tell me about yourself").
- Ground the question in the candidate's actual experience and the role's requirements.
- Return ONLY valid JSON:
{
  "question": "Specific, realistic interview question",
  "competency": "Target competency name (e.g., Design Systems, User Research, Technical Architecture)",
  "questionNumber": ${Number(questionNumber)}
}`;

      const userPrompt = `Generate Question ${Number(questionNumber)} for candidate for ${roleTitle} at ${companyName}.
${previousQuestions.length > 0 ? `Do not repeat or overlap with previous questions: ${JSON.stringify(previousQuestions)}` : 'This is the first interview question.'}`;

      const result = await callGemini(geminiKey, systemPrompt, userPrompt, testModel);
      console.log('[AI Interview] complete');
      return json(result);
    }

    if (action === 'analyze_answer') {
      if (!transcript.trim()) return json({ error: 'Transcript is required' }, 400);

      const systemPrompt = `You are an expert interviewer and communication coach evaluating an interview response for the target role "${roleTitle}" at "${companyName}".

Target Role Requirements:
${requirementsList.length ? requirementsList.slice(0, 6).map(r => `- ${r}`).join('\n') : '- Core professional competency'}

Candidate Context:
${candidateExperience || 'Candidate profile on file.'}

Evaluation Objective:
Evaluate how well the candidate's answer addresses the question and demonstrates the competency for this role.
Evaluate observable answer qualities:
- relevance to the specific question and target role
- clarity and structure
- specificity and concrete evidence from experience
- personal actions and ownership
- measurable outcome/result
- conciseness

Do not judge personality, confidence, or hiring probability. No numerical scores.

If question number is 5 or greater, next_question must be null.

Return ONLY valid JSON:
{
  "strengths": ["string"],
  "improvements": ["string"],
  "missing_elements": ["string"],
  "communication_feedback": {
    "clarity": "Strong | Developing | Needs more detail",
    "structure": "Strong | Developing | Needs more detail",
    "specificity": "Strong | Developing | Needs more detail",
    "conciseness": "Strong | Developing | Needs more detail"
  },
  "follow_up_needed": true,
  "follow_up_reason": "string",
  "next_question": "string or null"
}`;

      const userPrompt = JSON.stringify({
        question,
        transcript,
        previousQuestions,
        previousAnswers,
        questionNumber,
      });

      const result = await callGemini(geminiKey, systemPrompt, userPrompt);
      console.log('[AI Interview] complete');
      return json(result);
    }

    if (action === 'final_feedback') {
      const systemPrompt = `You are an expert communication coach reviewing a completed interview for "${roleTitle}" at "${companyName}".

Target Role Requirements:
${requirementsList.length ? requirementsList.slice(0, 6).map(r => `- ${r}`).join('\n') : '- Core professional competency'}

Evaluate qualitative communication:
- clarity
- structure
- specificity and concrete evidence
- conciseness
- role alignment

Do not provide numerical scores or hiring probabilities.

Return ONLY valid JSON:
{
  "strengths": ["string", "string", "string"],
  "areas_to_improve": ["string", "string"],
  "communication": {
    "clarity": "string",
    "structure": "string",
    "specificity": "string",
    "conciseness": "string"
  },
  "practice_exercises": ["string", "string"]
}`;

      const result = await callGemini(geminiKey, systemPrompt, JSON.stringify({ answers }));
      console.log('[AI Interview] complete');
      return json(result);
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err: unknown) {
    if (err instanceof ProviderError) {
      const publicMessage =
        err.status === 429
          ? 'AI feedback is temporarily unavailable. Please try again shortly.'
          : err.status >= 500
            ? 'The AI service is temporarily unavailable. Please try again.'
            : 'We could not process this request. Please try again.';

      return json(
        {
          error: publicMessage,
          code: err.status === 429 ? 'AI_RATE_LIMITED' : 'AI_PROVIDER_ERROR',
        },
        err.status >= 400 && err.status < 600 ? err.status : 503,
      );
    }

    console.error('[AI Interview] execution failure', err);
    return json(
      { error: 'The AI service is temporarily unavailable. Please try again.', code: 'AI_PROVIDER_ERROR' },
      503,
    );
  }
});