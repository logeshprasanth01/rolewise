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

async function getAvailableGeminiModels(key: string): Promise<string[]> {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': key },
    });
    if (res.ok) {
      const data = await res.json();
      const list = (data.models || [])
        .filter((m: { name?: string; supportedGenerationMethods?: string[] }) => {
          const name = (m.name || '').replace(/^models\//, '');
          if (name.includes('1.5') || name.includes('legacy')) return false;
          const methods = m.supportedGenerationMethods || [];
          return methods.includes('generateContent');
        })
        .map((m: { name?: string }) => (m.name || '').replace(/^models\//, ''));

      if (list.length > 0) {
        list.sort((a: string, b: string) => {
          const score = (name: string) => {
            if (name === 'gemini-2.5-flash-lite') return 1;
            if (name === 'gemini-2.5-flash') return 2;
            if (name.includes('flash-lite')) return 3;
            if (name.includes('flash')) return 4;
            return 10;
          };
          return score(a) - score(b);
        });
        return list;
      }
    }
  } catch (err) {
    console.warn('[interview-ai] Error querying available models:', err);
  }

  return ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash'];
}

async function callGemini(key: string, systemPrompt: string, userPrompt: string): Promise<any> {
  const models = await getAvailableGeminiModels(key);
  let lastStatus = 503;
  let lastMessage = 'Gemini service is temporarily unavailable.';

  for (const model of models) {
    try {
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
            generationConfig: { responseMimeType: 'application/json' },
          }),
        },
      );

      const raw = await res.text();
      lastStatus = res.status;

      if (!res.ok) {
        let msg = raw;
        try {
          const parsed = JSON.parse(raw);
          msg = parsed.error?.message || parsed.message || raw;
        } catch {}
        lastMessage = msg;

        if (res.status === 401 || res.status === 403) {
          throw new ProviderError(res.status, `API/auth configuration error (${res.status}): ${msg}`);
        }
        if (res.status === 404) {
          continue;
        }
        if ([429, 500, 502, 503, 504].includes(res.status)) continue;
        throw new ProviderError(res.status, msg);
      }

      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        throw new ProviderError(502, 'Invalid response from Gemini.');
      }

      const content = data.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text ?? '')
        .join('')
        .trim();

      if (!content) {
        lastStatus = 502;
        lastMessage = 'Gemini returned an empty response.';
        continue;
      }

      try {
        return JSON.parse(content);
      } catch {
        lastStatus = 502;
        lastMessage = 'Gemini returned invalid JSON.';
      }
    } catch (err) {
      if (err instanceof ProviderError && (err.status === 401 || err.status === 403)) {
        throw err;
      }
      lastMessage = err instanceof Error ? err.message : String(err);
    }
  }

  throw new ProviderError(lastStatus, lastMessage);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: 'Unauthorized' }, 401);

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
    } = body;

    if (!action) return json({ error: 'Action parameter is required' }, 400);

    let roleTitle = 'Specialist';
    let companyName = 'Target Company';
    let jobDescription = '';
    let requirementsList: string[] = [];
    let preparationItemsList: string[] = [];
    let fitAnalysisList: string[] = [];
    let candidateExperience = '';

    if (roleId) {
      const [roleRes, reqRes, prepRes, fitRes] = await Promise.all([
        supabase.from('roles').select('*').eq('id', roleId).maybeSingle(),
        supabase.from('role_requirements').select('requirement, category').eq('role_id', roleId),
        supabase.from('preparation_items').select('title, description, priority').eq('role_id', roleId),
        supabase.from('fit_analysis').select('status, explanation').eq('role_id', roleId),
      ]);

      if (!roleRes.data || roleRes.data.status === 'archived') return json({ error: 'Role not found' }, 404);

      roleTitle = roleRes.data.job_title || roleTitle;
      companyName = roleRes.data.company || companyName;
      jobDescription = roleRes.data.job_description || '';

      if (roleRes.data.resume_id) {
        const { data: resumeData } = await supabase
          .from('resumes')
          .select('resume_text')
          .eq('id', roleRes.data.resume_id)
          .maybeSingle();
        candidateExperience = resumeData?.resume_text?.slice(0, 4000) || '';
      }

      requirementsList = (reqRes.data ?? [])
        .map((r: any) => r.requirement || '')
        .filter(Boolean);

      preparationItemsList = (prepRes.data ?? [])
        .map((p: any) => `${p.title}: ${p.description || ''}`)
        .filter(Boolean);

      fitAnalysisList = (fitRes.data ?? [])
        .map((f: any) => `${f.status}: ${f.explanation || ''}`)
        .filter(Boolean);
    }

    if (action === 'generate_question') {
      const systemPrompt = `You are an experienced interviewer conducting a realistic interview for the role "${roleTitle}" at "${companyName}".

Target Role Requirements:
${requirementsList.length ? requirementsList.map(r => `- ${r}`).join('\n') : '- Core professional competency and problem solving'}

Job Description:
${jobDescription.slice(0, 3500)}

Candidate Experience:
${candidateExperience || 'No resume evidence was supplied.'}

Preparation Areas:
${preparationItemsList.length ? preparationItemsList.map(p => `- ${p}`).join('\n') : '- Communication, problem solving, role competency'}

Role Fit:
${fitAnalysisList.length ? fitAnalysisList.map(f => `- ${f}`).join('\n') : '- Review the supplied experience against the role.'}

Rules:
- Generate a new role-specific question; never use a hardcoded question.
- Do not assume the candidate worked at the target company.
- Ground the question in the actual role requirements and candidate experience when evidence exists.
- Avoid repeating previous questions.
- Prefer a realistic interviewer question that can be answered from the candidate's own experience.
- Return only valid JSON.

Schema:
{
  "question": "string",
  "competency": "string",
  "questionNumber": ${Number(questionNumber)}
}`;

      const userPrompt = JSON.stringify({
        questionNumber,
        previousQuestions,
        roleTitle,
        companyName,
      });

      return json(await callGemini(geminiKey, systemPrompt, userPrompt));
    }

    if (action === 'analyze_answer') {
      if (!transcript.trim()) return json({ error: 'Transcript is required' }, 400);

      const systemPrompt = `You are an expert interviewer and communication coach evaluating an interview response for the target role "${roleTitle}" at "${companyName}".

Target Role Requirements:
${requirementsList.length ? requirementsList.map(r => `- ${r}`).join('\n') : '- Core professional competency and domain alignment'}

Job Description Context:
${jobDescription.slice(0, 2000)}

Candidate Context:
${candidateExperience || 'Candidate profile on file.'}

Evaluation Objective:
Evaluate how well the candidate's answer addresses the specific question and demonstrates the competency and skills required for this role.
Evaluate only observable answer/content qualities:
- relevance to the specific question and target role
- clarity and structure
- specificity and concrete evidence from experience
- personal actions and ownership
- measurable outcome/result
- conciseness
- obvious filler-word patterns when present in the transcript

Do not judge intelligence, personality, mental state, confidence, or hiring probability.
Do not create numerical scores.

If the answer is incomplete, suggest a targeted follow-up question.
If it is complete, suggest a dynamic next question targeting another relevant role requirement.
If question number is 5 or greater, next_question must be null.

Return only valid JSON:
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

      return json(await callGemini(geminiKey, systemPrompt, userPrompt));
    }

    if (action === 'final_feedback') {
      const systemPrompt = `You are an expert communication coach reviewing a completed interview for the role "${roleTitle}" at "${companyName}".

Target Role Requirements:
${requirementsList.length ? requirementsList.map(r => `- ${r}`).join('\n') : '- Core professional competency'}

Job Description Context:
${jobDescription.slice(0, 1500)}

Use only the actual answers supplied and evaluate alignment with this specific role.
Give qualitative feedback on:
- clarity
- structure
- specificity and concrete evidence
- conciseness
- role alignment and outcomes

Do not provide readiness scores, hiring probability, personality judgments, or intelligence judgments.

Return only valid JSON:
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

      return json(await callGemini(geminiKey, systemPrompt, JSON.stringify({ answers })));
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (err) {
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

    console.error('[interview-ai] execution failure', err);
    return json(
      { error: 'The AI service is temporarily unavailable. Please try again.', code: 'AI_PROVIDER_ERROR' },
      503,
    );
  }
});