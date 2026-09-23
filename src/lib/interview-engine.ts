import {
  AnswerFeedback,
  FitAnalysis,
  PreparationItem,
  Role,
  RoleRequirement,
} from '@/types/database';

import { getActiveAIProvider } from '@/lib/ai/providers';

interface InterviewContext {
  role: Role;
  requirements: RoleRequirement[];
  fitAnalysis: FitAnalysis[];
  preparationItems: PreparationItem[];
  resumeText?: string | null;
}

/**
 * Generates the first interview question rooted in the real role context.
 */
export async function generateFirstQuestion(context: InterviewContext): Promise<{
  question: string;
  competency: string;
}> {
  const { role, fitAnalysis, preparationItems } = context;

  const ai = getActiveAIProvider();
  if (ai.apiKey) {
    try {
      const prompt = `You are a Principal Hiring Manager conducting an in-depth interview for the role of "${role.title}" at "${role.company}".
Job context:
- Workplace: ${role.workplace_type || 'On-site'}, Location: ${role.location || 'USA'}
- Key Requirements: ${context.requirements.map((r) => r.requirement || r.title).join('; ')}
- Fit Highlights: ${fitAnalysis.map((f) => `${f.requirement_title || 'Area'}: ${f.status} (${f.explanation})`).join('; ')}
- Targeted Prep Focus: ${preparationItems.map((p) => `${p.title}: ${p.description}`).join('; ')}
- Candidate Resume Extract: ${context.resumeText?.slice(0, 800) || 'Experienced professional in this discipline.'}

Generate the very first interview question. It must be highly specific to this company and role, not generic. Focus on a critical competency that addresses their key requirement.
Respond in valid JSON:
{
  "competency": "Competency Name",
  "question": "Detailed question..."
}`;

      const res = await fetch(`${ai.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ai.apiKey}`,
        },
        body: JSON.stringify({
          model: ai.model,
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        if (parsed.question && parsed.competency) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[InterviewEngine] AI call failed, using role context synthesis:', err);
    }
  }

  // Fallback / Standalone Dynamic Context Synthesis:
  // Identify highest priority preparation item or "Needs investigation" / "Transferable" area
  const highPriorityItem =
    preparationItems.find((p) => p.priority.toLowerCase() === 'high') ||
    preparationItems[0];

  const targetCompetency = highPriorityItem?.title || 'Core Role Competency';

  let questionText = '';
  const normComp = targetCompetency.toLowerCase();

  if (normComp.includes('design system') || normComp.includes('system') || normComp.includes('architecture') || normComp.includes('consistency')) {
    questionText = `Tell me about a project where you created or maintained consistency across multiple screens or user flows. What decisions did you make?`;
  } else if (normComp.includes('user research') || normComp.includes('research') || normComp.includes('usability') || normComp.includes('feedback')) {
    questionText = `Tell me about a project where you had to make design decisions based on user feedback. What did you learn and what changed?`;
  } else if (normComp.includes('stakeholder') || normComp.includes('collaboration') || normComp.includes('trade-off') || normComp.includes('cross-functional')) {
    questionText = `Can you walk me through a situation where you had to navigate differing opinions or trade-offs between engineering, product, and design? How did you approach the discussion and reach alignment?`;
  } else {
    questionText = `Tell me about a recent project where you applied ${targetCompetency} to solve a complex challenge. What specific actions did you take, and what was the outcome?`;
  }

  return {
    competency: targetCompetency,
    question: questionText,
  };
}

/**
 * Analyzes candidate's response and generates targeted 5-point feedback and the next follow-up question.
 */
export async function analyzeAnswerAndGenerateNext(params: {
  context: InterviewContext;
  currentQuestion: string;
  competency: string;
  answer: string;
  questionSequence: number;
}): Promise<{
  feedback: AnswerFeedback;
  nextQuestion: {
    questionId: string;
    question: string;
    competency: string;
  } | null;
}> {
  const { context, currentQuestion, competency, answer, questionSequence } = params;
  const { role, preparationItems } = context;

  // Check if OPENROUTER_API_KEY is available
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const prompt = `You are an elite Interview Coach evaluating a candidate's response for the position of "${role.title}" at "${role.company}".
Interview Question: "${currentQuestion}" (Competency: "${competency}")
Candidate Answer: "${answer}"

Job Context & Requirements:
${context.requirements.map((r) => r.requirement).join('; ')}

Analyze the candidate's answer constructively across 5 specific dimensions:
1. relevance (Did they directly answer the question prompt?)
2. specificity (Were actions concrete rather than vague generalizations?)
3. evidence (Did they provide tangible examples or data?)
4. outcome (Did they articulate measurable user/business impact?)
5. roleAlignment (How well does this answer align with expectations for ${role.title} at ${role.company}?)

Also generate a follow-up interview question (Question #${questionSequence + 1}) exploring another preparation area from: ${preparationItems.map((p) => p.title).join(', ')}.
If 4 questions have been answered, nextQuestion can be null.

Respond in valid JSON:
{
  "feedback": {
    "relevance": "...",
    "specificity": "...",
    "evidence": "...",
    "outcome": "...",
    "roleAlignment": "..."
  },
  "nextQuestion": {
    "competency": "...",
    "question": "..."
  }
}`;

      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://rolewise.app',
          'X-Title': 'Rolewise Interview Engine',
        },
        body: JSON.stringify({
          model: 'openrouter/free',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const parsed = JSON.parse(data.choices[0].message.content);
        if (parsed.feedback) {
          return {
            feedback: parsed.feedback,
            nextQuestion: parsed.nextQuestion
              ? {
                  questionId: `q-${Date.now()}`,
                  question: parsed.nextQuestion.question,
                  competency: parsed.nextQuestion.competency,
                }
              : null,
          };
        }
      }
    } catch (err) {
      console.warn('[InterviewEngine] OpenRouter answer evaluation failed, using dynamic analysis:', err);
    }
  }

  // Dynamic Rule-Based Analysis Engine:
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  const hasNumbers = /\d+%|\d+\s*(users|teams|projects|days|months|weeks|increase|decrease|growth)/i.test(answer);
  const hasFirstPersonActions = /\b(I led|I designed|I built|I facilitated|I initiated|I structured|I established|I proposed)\b/i.test(answer);
  const mentionsMetrics = /\b(result|outcome|impact|improved|reduced|increased|delivered|achieved)\b/i.test(answer);

  // 1. Relevance
  let relevance = '';
  if (wordCount < 25) {
    relevance = 'Your answer is brief. Address the prompt directly with a complete situation and background context.';
  } else {
    relevance = `Strong focus on the ${competency} prompt. You addressed the core scenario asked by the interviewer.`;
  }

  // 2. Specificity
  let specificity = '';
  if (hasFirstPersonActions) {
    specificity = 'High specificity: You clearly differentiated your personal contributions and explicit technical/design decisions.';
  } else {
    specificity = 'Moderate specificity: Clarify the exact actions YOU took versus what the wider team handled.';
  }

  // 3. Evidence
  let evidence = '';
  if (hasNumbers || answer.length > 250) {
    evidence = 'Solid evidence demonstrated: Included concrete project context and tangible working artifacts.';
  } else {
    evidence = 'Incorporate more granular evidence: Mention specific tools (e.g. Figma tokens, user interview cohorts) or baseline constraints.';
  }

  // 4. Outcome
  let outcome = '';
  if (mentionsMetrics && hasNumbers) {
    outcome = 'Excellent: You articulated clear, quantified results and post-launch user or operational impact.';
  } else {
    outcome = 'Opportunity for growth: Conclude your answer by stating the measurable result (e.g., metric lift, latency reduction, team adoption rate).';
  }

  // 5. Role Alignment
  const roleAlignment = `Aligns closely with the standards expected for a ${role.title} at ${role.company}. Emphasizes customer-centricity and cross-functional rigor.`;

  // Select next competency from preparationItems or fitAnalysis
  const remainingPrep = preparationItems.filter(
    (p) => p.title.toLowerCase() !== competency.toLowerCase()
  );

  let nextQuestion: { questionId: string; question: string; competency: string } | null = null;

  if (questionSequence < 4 && remainingPrep.length > 0) {
    const nextItem = remainingPrep[(questionSequence - 1) % remainingPrep.length];
    const nextComp = nextItem.title;
    const nextId = `q-${Date.now()}`;

    let nextText = '';
    const normNext = nextComp.toLowerCase();

    if (normNext.includes('stakeholder') || normNext.includes('collaboration')) {
      nextText = `Building on that, let's explore stakeholder dynamics at ${role.company}. Can you describe a project where executive leadership requested last-minute scope changes? How did you manage expectations without burning team momentum?`;
    } else if (normNext.includes('research') || normNext.includes('testing')) {
      nextText = `Customer trust is core to ${role.company}. Walk me through a time when user usability feedback revealed a fundamental flaw right before a release. How did you prioritize what to fix?`;
    } else if (normNext.includes('systems') || normNext.includes('scale')) {
      nextText = `Given ${role.company}'s global scale, how do you approach accessibility (WCAG) and internationalization in your design deliverables?`;
    } else {
      nextText = `Continuing our evaluation of ${role.title} competencies: In terms of ${nextComp}, what is the most complex challenge you have solved, and what lessons did you apply to subsequent projects?`;
    }

    nextQuestion = {
      questionId: nextId,
      question: nextText,
      competency: nextComp,
    };
  }

  return {
    feedback: {
      relevance,
      specificity,
      evidence,
      outcome,
      roleAlignment,
    },
    nextQuestion,
  };
}
