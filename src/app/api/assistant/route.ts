import { NextRequest, NextResponse } from 'next/server';
import { helpAsText } from '@/lib/assistant-kb';

export const runtime = 'nodejs';

type Msg = { role: 'user' | 'assistant'; content: string };

const MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

// Light per-instance rate limit: 20 requests per minute per IP.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  return list.length > 20;
}

const SYSTEM = `You are Rowi, the friendly prep-buddy mascot inside Rolewise, an interview preparation app.
Rolewise helps someone prepare for one specific job: they add the job description and their resume, Rolewise maps each requirement to their experience with a fit score, builds a prep plan for the gaps, runs mock interviews by text, voice and video, and tracks applications.

Rules:
- Answer only about using Rolewise and preparing for interviews. For anything else, say briefly that you can help with Rolewise and interview prep.
- Be short: 1 to 4 sentences, plain words, no markdown headings.
- Only state product facts from the reference below. If you are not sure, say so and suggest where to look.
- Never invent features, prices, numbers or policies.

Reference:
${helpAsText()}`;

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anon';
  if (limited(ip)) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const body = (await req.json().catch(() => ({}))) as { messages?: Msg[] };
  const messages = (body.messages ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1200) }));
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  for (const model of MODELS) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({ model, temperature: 0.4, max_tokens: 300, messages: [{ role: 'system', content: SYSTEM }, ...messages] }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const reply: string | undefined = data?.choices?.[0]?.message?.content?.trim();
      if (reply) return NextResponse.json({ reply });
    } catch {
      // try the next model
    }
  }
  return NextResponse.json({ error: 'unavailable' }, { status: 502 });
}
