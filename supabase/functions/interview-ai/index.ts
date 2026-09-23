// Supabase Edge Function: interview-ai
// Powered by OpenRouter free model router (openrouter/free)
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify authenticated Supabase user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Read and verify OpenRouter API key
    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const isConfigured = Boolean(openrouterKey && openrouterKey.trim().length > 0);
    console.log(`OPENROUTER_API_KEY configured: ${isConfigured}`);

    if (!isConfigured) {
      console.error('[interview-ai] OPENROUTER_API_KEY is not configured in Edge Function secrets');
      return new Response(
        JSON.stringify({
          error: 'AI_PROVIDER_ERROR',
          provider: 'openrouter',
          status: 500,
          message: 'OPENROUTER_API_KEY is not configured in Supabase Edge Function secrets',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse input
    const body = await req.json().catch(() => ({}));
    const {
      action,
      roleId,
      questionNumber = 1,
      question,
      transcript,
      previousAnswers = [],
      answers = [],
    } = body;

    if (!action) {
      return new Response(
        JSON.stringify({ error: 'Action parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Retrieve authenticated user's role context from Supabase (respecting RLS)
    let roleTitle = 'Specialist';
    let companyName = 'Target Company';
    let jobDescription = '';
    let requirementsList: string[] = [];
    let preparationItemsList: string[] = [];
    let fitAnalysisList: string[] = [];
    let candidateExperience = '';

    if (roleId) {
      const [roleRes, reqRes, prepRes, fitRes] = await Promise.all([
        supabaseClient.from('roles').select('*').eq('id', roleId).maybeSingle(),
        supabaseClient.from('role_requirements').select('requirement, title, category').eq('role_id', roleId),
        supabaseClient.from('preparation_items').select('title, description, priority').eq('role_id', roleId),
        supabaseClient.from('fit_analysis').select('status, explanation').eq('role_id', roleId),
      ]);

      if (roleRes.data) {
        roleTitle = roleRes.data.job_title || roleRes.data.title || roleTitle;
        companyName = roleRes.data.company || companyName;
        jobDescription = roleRes.data.job_description || '';

        if (roleRes.data.resume_id) {
          const { data: resumeData } = await supabaseClient
            .from('resumes')
            .select('resume_text')
            .eq('id', roleRes.data.resume_id)
            .maybeSingle();
          if (resumeData?.resume_text) {
            candidateExperience = resumeData.resume_text.slice(0, 1000);
          }
        }
      }

      if (reqRes.data && reqRes.data.length > 0) {
        requirementsList = reqRes.data.map((r: { requirement?: string; title?: string }) => r.requirement || r.title || '').filter(Boolean);
      }
      if (prepRes.data && prepRes.data.length > 0) {
        preparationItemsList = prepRes.data.map((p: { title?: string; description?: string }) => `${p.title}: ${p.description}`).filter(Boolean);
      }
      if (fitRes.data && fitRes.data.length > 0) {
        fitAnalysisList = fitRes.data.map((f: { status?: string; explanation?: string }) => `${f.status}: ${f.explanation}`).filter(Boolean);
      }
    }

    // Helper to invoke OpenRouter with openrouter/free
    async function callOpenRouter(systemPrompt: string, userPrompt: string) {
      const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      const model = 'openrouter/free';

      console.log(`[interview-ai] Calling OpenRouter endpoint: ${endpoint} with model: ${model}`);

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openrouterKey}`,
          'HTTP-Referer': 'https://rolewise.app',
          'X-Title': 'Rolewise AI Interview',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.6,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[interview-ai] OpenRouter API error:', res.status, errorText);
        let parsedMessage = errorText;
        try {
          const errObj = JSON.parse(errorText);
          parsedMessage = errObj.error?.message || errObj.message || errorText;
        } catch {
          // keep errorText
        }
        throw new ProviderError(res.status, parsedMessage);
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        console.error('[interview-ai] OpenRouter returned empty choices');
        throw new ProviderError(502, 'OpenRouter returned empty choices in completion response');
      }

      try {
        return JSON.parse(content);
      } catch (e) {
        throw new ProviderError(502, `Failed to parse OpenRouter response as JSON: ${(e as Error).message}`);
      }
    }

    // ACTION 1: generate_question
    if (action === 'generate_question') {
      const systemPrompt = `You are an experienced interviewer conducting a realistic interview for the role of "${roleTitle}" at "${companyName}".

Target Role Requirements:
${requirementsList.length > 0 ? requirementsList.map((r) => `- ${r}`).join('\n') : '- Professional domain competency and problem solving'}

${jobDescription ? `Job Description:\n${jobDescription.slice(0, 1000)}\n` : ''}
Candidate Experience Summary:
${candidateExperience || 'Experienced professional in this discipline'}

Preparation Areas:
${preparationItemsList.length > 0 ? preparationItemsList.map((p) => `- ${p}`).join('\n') : '- Problem solving, communication, leadership'}

Role Fit Context:
${fitAnalysisList.length > 0 ? fitAnalysisList.map((f) => `- ${f}`).join('\n') : '- Alignment on core requirements'}

CRITICAL GUIDELINES FOR QUESTION GENERATION:
- Do NOT use a fixed or hard-coded question list.
- Start with a candidate-experience question rather than assuming they have already worked at ${companyName}.
- BAD: "At ${companyName}, scaling design consistency across high-velocity teams is paramount..." (Incorrectly assumes prior experience at ${companyName}).
- BETTER: "Tell me about a project where you created or maintained consistency across multiple screens or user flows. What decisions did you make?"
- Ground the question in real requirements and candidate experience.

Return ONLY valid JSON matching this schema:
{
  "question": "string",
  "competency": "string",
  "questionNumber": ${questionNumber}
}`;

      const userPrompt = JSON.stringify({
        jobTitle: roleTitle,
        company: companyName,
        questionNumber,
      });

      const parsed = await callOpenRouter(systemPrompt, userPrompt);
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION 2: analyze_answer
    if (action === 'analyze_answer') {
      if (!transcript || !transcript.trim()) {
        return new Response(
          JSON.stringify({ error: 'Transcript is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const systemPrompt = `You are an expert communication coach and technical interviewer evaluating an interview response for "${roleTitle}" at "${companyName}".

Target Role Requirements:
${requirementsList.map((r) => `- ${r}`).join('\n')}

EVALUATION CRITERIA (Observable communication characteristics only):
- relevance (Did the candidate answer the question?)
- clarity (Is the explanation clear?)
- structure (Is the answer structured, e.g. Situation -> Action -> Result?)
- specificity (Does the candidate give concrete examples rather than vague claims?)
- actions taken (Does the candidate explain their personal actions?)
- outcome/result (Does the candidate explain the measurable outcome or impact?)
- conciseness (Is the answer concise or unnecessarily rambling?)
- observable filler-word patterns when available

CRITICAL RULES:
- Do NOT evaluate intelligence, personality, mental state, psychological confidence, or hiring probability.
- Do NOT create numerical scores.
- DYNAMIC FOLLOW-UP:
  - If the answer lacks an important element (e.g. candidate explains a design or technical project but omits the outcome):
    Set "follow_up_needed": true, provide "follow_up_reason", and generate a targeted follow-up question (e.g. "What was the outcome of that design change, and how did you measure whether it worked?").
  - If the answer is sufficiently complete:
    Set "follow_up_needed": false, and generate a dynamic next question exploring another relevant competency.
- If question 5 or greater, set next_question to null.

Return ONLY valid JSON:
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
  "next_question": "string"
}`;

      const userPrompt = JSON.stringify({
        question,
        transcript,
        previousAnswers,
      });

      const parsed = await callOpenRouter(systemPrompt, userPrompt);
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ACTION 3: final_feedback
    if (action === 'final_feedback') {
      const systemPrompt = `You are an expert communication coach evaluating the candidate's complete interview session for the role of "${roleTitle}" at "${companyName}".

Target Role Requirements:
${requirementsList.map((r) => `- ${r}`).join('\n')}

Review the completed rounds and synthesize overall qualitative feedback based on actual answers given.

CRITICAL RULES:
- No readiness score.
- No hiring probability.
- No fake confidence score.
- Observable communication characteristics only.

Return ONLY valid JSON matching this schema:
{
  "strengths": ["string", "string", "string"],
  "areas_to_improve": ["string", "string"],
  "communication": {
    "clarity": "Qualitative summary of clarity across answers",
    "structure": "Qualitative summary of logical structure",
    "specificity": "Qualitative summary of evidence and concrete examples",
    "conciseness": "Qualitative summary of pacing and conciseness"
  },
  "practice_exercises": [
    "Concrete exercise 1 based on actual weaknesses",
    "Concrete exercise 2 based on actual weaknesses"
  ]
}`;

      const userPrompt = JSON.stringify({ answers });
      const parsed = await callOpenRouter(systemPrompt, userPrompt);
      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    if (err instanceof ProviderError) {
      return new Response(
        JSON.stringify({
          error: 'AI_PROVIDER_ERROR',
          provider: 'openrouter',
          status: err.status,
          message: err.message,
        }),
        { status: err.status >= 400 && err.status < 600 ? err.status : 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.error('[interview-ai] Execution failure:', err);
    return new Response(
      JSON.stringify({
        error: 'AI_PROVIDER_ERROR',
        provider: 'openrouter',
        status: 500,
        message: err instanceof Error ? err.message : 'Internal execution failure',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
