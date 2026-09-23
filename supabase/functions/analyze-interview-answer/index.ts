// Supabase Edge Function: analyze-interview-answer
// Deno runtime
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const openrouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const groqKey = Deno.env.get('GROQ_API_KEY');
    const geminiKey = Deno.env.get('GEMINI_API_KEY');

    let endpoint = 'https://openrouter.ai/api/v1/chat/completions';
    let apiKey = openrouterKey;
    let model = 'openrouter/free';

    if (!openrouterKey && groqKey) {
      endpoint = 'https://api.groq.com/openai/v1/chat/completions';
      apiKey = groqKey;
      model = 'llama-3.3-70b-versatile';
    } else if (!openrouterKey && geminiKey) {
      endpoint = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
      apiKey = geminiKey;
      model = 'gemini-1.5-flash';
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'AI feedback is temporarily unavailable.',
          details: 'No AI provider API key configured.',
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      question,
      transcript,
      previousQuestions = [],
      previousAnswers = [],
    } = await req.json();

    if (!transcript) {
      return new Response(
        JSON.stringify({ error: 'Transcript is required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are an expert communication coach and technical interviewer evaluating an interview response.
Evaluate the candidate's answer strictly based on communication quality and answer content:
1. Does the answer directly address the question?
2. Is the explanation clear?
3. Is the answer structured (Situation -> Action -> Result)?
4. Does the candidate give a concrete example?
5. Does the candidate explain their personal actions?
6. Does the candidate explain the outcome?
7. Is the answer unnecessarily long?
8. Are there obvious filler words in the transcript?

CRITICAL RULES:
- Do NOT judge personality, intelligence, or hiring probability.
- Do NOT create numerical scores.
- Return valid JSON:
{
  "strengths": ["string"],
  "improvements": ["string"],
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

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://rolewise.app',
        'X-Title': 'Rolewise Communication Analysis',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: JSON.stringify({
              question,
              transcript,
              previousQuestions,
              previousAnswers,
            }),
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return new Response(
        JSON.stringify({
          error: 'AI feedback is temporarily unavailable.',
          details: errorText,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);

    return new Response(
      JSON.stringify(parsed),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: 'AI feedback is temporarily unavailable.',
        details: message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
