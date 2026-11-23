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
 * Timeouts are short so a slow provider hands over to the local fallback quickly.
 */
async function callGemini(key: string, systemPrompt: string, userPrompt: string, overrideModel?: string): Promise<any> {
  const models = overrideModel ? [overrideModel] : ['gemini-3.6-flash', 'gemini-flash-lite-latest'];
  const timeouts = [9000, 7000];
  let lastStatus = 503;
  let lastMessage = 'Gemini service is temporarily unavailable.';

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      console.log('[AI Interview] Gemini request started (' + model + ')');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeouts[i] ?? 7000);
      const res = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
          }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeoutId);
      const raw = await res.text();
      lastStatus = res.status;
      if (!res.ok) {
        let msg = raw;
        try { const parsed = JSON.parse(raw); msg = parsed.error?.message || parsed.message || raw; } catch {}
        lastMessage = msg;
        console.warn('[AI Interview] Gemini ' + model + ' returned ' + res.status);
        if (res.status === 401 || res.status === 403) throw new ProviderError(res.status, msg);
        if (res.status === 429 && /quota|free_tier|generate_content/i.test(msg)) break;
        continue;
      }
      const data = JSON.parse(raw);
      const content = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? '').join('').trim();
      if (!content) { lastStatus = 502; lastMessage = 'Gemini returned an empty response.'; continue; }
      let parsed: any;
      try { parsed = JSON.parse(content); }
      catch {
        let cleaned = content.replace(/^\s*\`\`\`json\s*/, '').replace(/^\s*\`\`\`\s*/, '').replace(/\`\`\`\s*$/, '').trim();
        parsed = JSON.parse(cleaned);
      }
      return parsed;
    } catch (err: unknown) {
      if (err instanceof ProviderError) throw err;
      lastMessage = err instanceof Error ? err.message : String(err);
      console.warn('[AI Interview] Gemini attempt failed:', lastMessage);
    }
  }
  throw new ProviderError(lastStatus, lastMessage);
}

/**
 * Turns a raw job requirement into a short, speakable topic.
 * "5+ years of experience in product or service design with a strong portfolio…" -> "product or service design"
 */
function shortTopic(requirement: string): string {
  let t = String(requirement || '').trim().replace(/\s+/g, ' ');
  t = t.replace(/^(minimum of |at least |min\.? )?\d+\s*\+?\s*(-\s*\d+\s*)?(years?|yrs?)( of)?( professional| hands-on| relevant| proven)?( work)?( experience)?\s*(in|with|of|as|doing)?\s*/i, '');
  t = t.replace(/^(strong |proven |solid |deep |excellent |good |demonstrated |hands-on )?(experience|knowledge|understanding|proficiency|expertise|skills?|ability)\s+(in|with|of|to)\s+/i, '');
  t = t.split(/\s+(including|such as|and a|, and|;|\()\s*/i)[0];
  const withParts = t.split(/\s+with\s+/i);
  if (withParts.length > 1 && withParts[0].split(' ').length >= 3) t = withParts[0];
  t = t.split(/[,;.]/)[0].trim();
  const words = t.split(' ');
  if (words.length > 8) t = words.slice(0, 8).join(' ');
  t = t.replace(/^(a|an|the)\s+/i, '');
  if (!t) return 'the core work of this role';
  const gerunds: Record<string, string> = {
    collaborate: 'collaborating', work: 'working', partner: 'partnering', lead: 'leading', drive: 'driving',
    design: 'designing', build: 'building', create: 'creating', conduct: 'conducting', develop: 'developing',
    manage: 'managing', own: 'owning', translate: 'translating', deliver: 'delivering', communicate: 'communicating',
    maintain: 'maintaining', support: 'supporting', define: 'defining', present: 'presenting', run: 'running',
  };
  const [first, ...rest] = t.split(' ');
  const g = gerunds[first.toLowerCase()];
  if (g) return [g, ...rest].join(' ');
  const keepCase = /^[A-Z]{2,}|^(Figma|Sketch|Adobe|Framer|React|Jira|Miro|Notion|Webflow|Python|Java|Google|Android|iOS)/.test(first);
  return keepCase ? t : t.charAt(0).toLowerCase() + t.slice(1);
}

function titleCase(s: string): string {
  const words = s.split(' ').slice(0, 4);
  while (words.length > 1 && /^(to|and|or|of|in|with|for|the|a|an)$/i.test(words[words.length - 1])) words.pop();
  return words.map((w) => (w.length > 2 && !/^(and|for|the|with)$/i.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w)).join(' ');
}

function buildNextQuestion(roleTitle: string, requirements: string[], questionNumber: number, previousQuestions: string[] = []): { question: string; competency: string; questionNumber: number } {
  const topics = requirements.length ? requirements.map(shortTopic) : [
    'problem solving and product thinking',
    'collaboration with stakeholders',
    'design decisions and trade-offs',
    'handling feedback and iteration',
    'measuring outcomes'
  ];
  const idx = Math.max(1, questionNumber) - 1;
  const topic = topics[idx % topics.length];
  const templates = [
    'Tell me about a recent project that involved {topic}. What was the problem, what did you do yourself, and what changed?',
    'What is a tough call you have made around {topic}? Which options did you weigh, and why did you pick the one you did?',
    'Walk me through a time when {topic} needed buy-in from another team. Where did you disagree, and how did you settle it?',
    'Tell me about a time your first approach to {topic} did not work. What made you change direction, and what did you do next?',
    'How do you know when your work on {topic} has succeeded? Give me one example and how you measured it.'
  ];
  const usedTopics = previousQuestions.map((q) => q.toLowerCase());
  const score = (candidate: string) => {
    const n = candidate.toLowerCase();
    return usedTopics.reduce((sum, prev) => sum + (n.includes(prev.slice(0, 45)) || prev.includes(n.slice(0, 45)) ? 1 : 0), 0);
  };
  let question = templates[idx % templates.length].replace('{topic}', topic);
  if (score(question) > 0 || previousQuestions.some((q) => q.toLowerCase().trim() === question.toLowerCase().trim())) {
    const alternatives = templates.map(t => t.replace('{topic}', topic)).filter(q => !previousQuestions.some(p => p.toLowerCase().trim() === q.toLowerCase().trim()));
    question = alternatives[alternatives.length - 1] || 'Give me a different real example involving ' + topic + ': the decision, your part in it, and the outcome.';
  }
  return { question, competency: titleCase(topic), questionNumber };
}

function fallbackQuestion(roleTitle: string, requirements: string[], questionNumber: number, previousQuestions: string[] = []) {
  const q = buildNextQuestion(roleTitle, requirements, questionNumber, previousQuestions);
  return { ...q, fallback: true };
}

function fallbackAnswerAnalysis(question: string, transcript: string, questionNumber: number, roleTitle: string, requirements: string[] = [], previousQuestions: string[] = []) {
  const text = transcript.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const hasExample = /\b(for example|for instance|worked on|designed|built|created|led|implemented|during|when i|at my previous|in my role)\b/i.test(text);
  const hasAction = /\b(i |i'|my |led|created|designed|built|implemented|improved|managed|worked|decided|analyzed|tested)\b/i.test(text);
  const hasOutcome = /\b(result|outcome|increased|reduced|improved|achieved|delivered|impact|which helped|led to|resulted in)\b/i.test(text);
  const hasChallenge = /\b(challenge|problem|issue|constraint|difficult|complex|blocker)\b/i.test(text);
  const hasDecision = /\b(decided|decision|chose|trade[- ]?off|because|reason|considered)\b/i.test(text);
  const strengths: string[] = [];
  const improvements: string[] = [];

  if (words.length >= 45) strengths.push('Your response gives enough context to understand your approach.');
  else improvements.push('Add a little more context so the interviewer can understand the situation.');
  if (hasAction) strengths.push('You explain actions you personally took.');
  else improvements.push('Make your personal contribution clearer by explaining what you did.');
  if (hasExample) strengths.push('You support the answer with a concrete experience.');
  else improvements.push('Use one specific project or real example instead of staying general.');
  if (hasChallenge) strengths.push('You identify the challenge or constraint involved.');
  if (hasDecision) strengths.push('You explain at least part of the reasoning behind your decision.');
  if (hasOutcome) strengths.push('You connect your actions to an outcome or impact.');
  else improvements.push('End with the outcome or impact of your work.');
  if (!strengths.length) strengths.push('You addressed the question and provided a starting point for your response.');
  if (!improvements.length) improvements.push('Keep the answer specific and concise, and connect your decisions to the result.');

  const next = questionNumber < 5 ? buildNextQuestion(roleTitle, requirements, questionNumber + 1, [...previousQuestions, question]) : null;
  return {
    strengths: strengths.slice(0, 3),
    improvements: improvements.slice(0, 3),
    missing_elements: hasOutcome ? [] : ['A specific outcome or result'],
    communication_feedback: {
      clarity: words.length >= 35 ? 'Strong' : 'Needs more detail',
      structure: hasChallenge && hasAction && hasOutcome ? 'Strong' : 'Developing',
      specificity: hasExample ? 'Strong' : 'Developing',
      conciseness: words.length <= 180 ? 'Strong' : 'Developing'
    },
    follow_up_needed: false,
    follow_up_reason: '',
    next_question: next ? next.question : null,
    next_question_competency: next ? next.competency : null,
    next_question_number: next ? next.questionNumber : null,
    fallback: true,
    fallback_reason: 'AI feedback was temporarily unavailable; feedback was generated from the submitted answer.'
  };
}

function fallbackFinalFeedback(answers: any[]) {
  const texts = answers.map((a: any) => String(a?.transcript || a?.answer || '')).filter(Boolean);
  const combined = texts.join(' ');
  const words = combined.split(/\s+/).filter(Boolean);
  const hasExamples = texts.filter(t => /\b(for example|for instance|worked on|designed|built|created|led|implemented)\b/i.test(t)).length;
  const outcomeCount = texts.filter(t => /\b(result|outcome|increased|reduced|improved|achieved|delivered|impact|led to|resulted in)\b/i.test(t)).length;
  return {
    strengths: [
      texts.length >= 4 ? 'You maintained practice across multiple interview questions.' : 'You completed the interview practice.',
      hasExamples >= 2 ? 'Several responses used concrete examples from your experience.' : 'Your responses provide a foundation that can be strengthened with more concrete examples.',
      outcomeCount >= Math.max(1, Math.ceil(texts.length / 2)) ? 'You regularly connected your actions to outcomes.' : 'You practiced explaining your experience in the context of the target role.'
    ],
    areas_to_improve: [
      outcomeCount < texts.length ? 'Make the outcome or impact explicit at the end of each project story.' : 'Keep outcomes concise and specific.',
      hasExamples < texts.length ? 'Use a concrete example whenever the question asks about past experience.' : 'Keep examples focused on your personal contribution.',
      'Use a consistent situation → action → outcome structure when answering experience-based questions.'
    ],
    communication: {
      clarity: words.length >= 180 ? 'Strong' : 'Developing',
      structure: outcomeCount >= 2 ? 'Developing to Strong' : 'Developing',
      specificity: hasExamples >= 2 ? 'Strong' : 'Developing',
      conciseness: words.length <= 900 ? 'Strong' : 'Developing'
    },
    practice_exercises: [
      'Practice one two-minute project story with a clear situation, action, and outcome.',
      'Practice a role-specific question and make your personal contribution explicit.',
      'Practice ending each answer with a concrete result or learning.'
    ],
    fallback: true
  };
}

/** Keeps model output readable even if it ignores the phrasing rules. */
function tidyQuestion(result: any, roleTitle: string, requirements: string[], questionNumber: number, previousQuestions: string[]) {
  if (!result || typeof result !== 'object') return result;
  const q = String(result.question || '');
  const copiesRequirement = requirements.some((r) => r.length > 30 && q.toLowerCase().includes(r.toLowerCase().slice(0, 40)));
  const mentionsYears = /\d+\s*\+?\s*years? of experience/i.test(q);
  if (!q || copiesRequirement || mentionsYears) {
    return { ...buildNextQuestion(roleTitle, requirements, questionNumber, previousQuestions), tidied: true };
  }
  const comp = String(result.competency || '');
  if (comp.split(' ').length > 5) result.competency = titleCase(shortTopic(comp));
  return result;
}

const PHRASING_RULES = `- Sound like a friendly senior interviewer talking out loud: one or two plain sentences, under 35 words.
- Never copy a requirement word for word, never mention a number of years of experience, and never list several requirements in one question.
- "competency" is a short label of 2 to 4 words, for example "User Research" or "Design Systems".`;

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });


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


    const geminiKey = Deno.env.get('GEMINI_API_KEY')?.trim() || '';

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


    if (!action) return json({ error: 'Action parameter is required' }, 400);

    // Database client (using service role key if available for safe, fast lookups)
    const db = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : authClient;

    let roleTitle = 'Specialist';
    let companyName = 'Target Company';
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
        return json({ error: 'Role not found' }, 404);
      }


      roleTitle = roleRes.data.job_title || roleRes.data.title || roleTitle;
      companyName = roleRes.data.company || companyName;

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
${PHRASING_RULES}
- Return ONLY valid JSON:
{
  "question": "Specific, realistic interview question",
  "competency": "Short competency label",
  "questionNumber": ${Number(questionNumber)}
}`;

      const userPrompt = `Generate Question ${Number(questionNumber)} for candidate for ${roleTitle} at ${companyName}.
${previousQuestions.length > 0 ? `Do not repeat or overlap with previous questions: ${JSON.stringify(previousQuestions)}` : 'This is the first interview question.'}`;

      let result;
      try {
        if (!geminiKey) throw new Error('Gemini unavailable');
        result = await callGemini(geminiKey, systemPrompt, userPrompt, testModel);
        result = tidyQuestion(result, roleTitle, requirementsList, Number(questionNumber), previousQuestions);
      } catch (err) {
        console.warn('[AI Interview] question generation fallback:', err);
        result = fallbackQuestion(roleTitle, requirementsList, Number(questionNumber), previousQuestions);
      }
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

If question number is less than 5, next_question MUST contain the next distinct interview question. If question number is 5 or greater, next_question MUST be null.
Rules for next_question:
${PHRASING_RULES}

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
  "next_question": "string or null",
  "next_competency": "Short competency label or null"
}`;

      const userPrompt = JSON.stringify({
        question,
        transcript,
        previousQuestions,
        previousAnswers,
        questionNumber,
      });

      let result;
      try {
        if (!geminiKey) throw new Error('Gemini unavailable');
        result = await callGemini(geminiKey, systemPrompt, userPrompt);
      } catch (err) {
        console.warn('[AI Interview] answer analysis fallback:', err);
        result = fallbackAnswerAnalysis(question, transcript, Number(questionNumber), roleTitle, requirementsList, previousQuestions);
      }
      if (Number(questionNumber) < 5) {
        const next = result && typeof result === 'object' ? result.next_question : null;
        const nextIsRobotic = typeof next === 'string' && (/\d+\s*\+?\s*years? of experience/i.test(next) ||
          requirementsList.some((r) => r.length > 30 && next.toLowerCase().includes(r.toLowerCase().slice(0, 40))));
        if (!next || nextIsRobotic) {
          const generatedNext = buildNextQuestion(roleTitle, requirementsList, Number(questionNumber) + 1, [...previousQuestions, question]);
          result = {
            ...result,
            next_question: generatedNext.question,
            next_question_competency: generatedNext.competency,
            next_competency: generatedNext.competency,
            next_question_number: generatedNext.questionNumber,
          };
        }
      } else if (result && typeof result === 'object') {
        result = { ...result, next_question: null, next_question_number: null };
      }
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

      let result;
      try {
        if (!geminiKey) throw new Error('Gemini unavailable');
        result = await callGemini(geminiKey, systemPrompt, JSON.stringify({ answers }));
      } catch (err) {
        console.warn('[AI Interview] final feedback fallback:', err);
        result = fallbackFinalFeedback(answers);
      }
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
