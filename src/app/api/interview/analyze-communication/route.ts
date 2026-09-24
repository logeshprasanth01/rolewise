import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  analyzeCommunicationWithProvider,
  AIProviderUnavailableError,
  getActiveAIProvider,
} from '@/lib/ai/providers';

export const runtime = 'nodejs';

/**
 * AI Communication & Answer Quality Analysis Endpoint.
 * Powered by a provider abstraction (defaulting to free providers like Groq).
 * Keeps all API keys strictly server-side.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      roleId,
      question,
      transcript,
      previousQuestions = [],
      previousAnswers = [],
    } = body;

    if (!transcript || !transcript.trim()) {
      return NextResponse.json(
        { error: 'Transcript is required for communication analysis.' },
        { status: 400 }
      );
    }

    if (!question) {
      return NextResponse.json(
        { error: 'Question context is required.' },
        { status: 400 }
      );
    }

    const activeAI = getActiveAIProvider();
    if (!activeAI.apiKey) {
      return NextResponse.json(
        {
          error: 'AI feedback is temporarily unavailable.',
          details: `Provider ${activeAI.provider} requires ${
            activeAI.provider === 'groq' ? 'GROQ_API_KEY' : 'API key'
          } to be set in environment.`,
          code: 'AI_KEY_MISSING',
          provider: activeAI.provider,
        },
        { status: 503 }
      );
    }

    // Fetch target role context from Supabase
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    let roleTitle = 'Specialist';
    let companyName = 'Target Organization';
    let requirementsList: string[] = [];
    let preparationItemsList: string[] = [];
    let candidateExperience: string | null = null;

    if (roleId) {
      const { data: roleData } = await supabase.from('roles').select('*').eq('id', roleId).maybeSingle();

      if (roleData) {
        roleTitle = roleData.job_title || roleData.title || roleTitle;
        companyName = roleData.company || companyName;

        const [reqRes, prepRes, resumeRes] = await Promise.all([
          supabase.from('role_requirements').select('requirement, title').eq('role_id', roleId),
          supabase.from('preparation_items').select('title, description').eq('role_id', roleId),
          roleData.resume_id
            ? supabase.from('resumes').select('resume_text').eq('id', roleData.resume_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        if (reqRes.data && reqRes.data.length > 0) {
          requirementsList = reqRes.data.map((r) => r.requirement || r.title).filter(Boolean);
        }
        if (prepRes.data && prepRes.data.length > 0) {
          preparationItemsList = prepRes.data.map((p) => `${p.title}: ${p.description}`).filter(Boolean);
        }
        if (resumeRes.data?.resume_text) {
          candidateExperience = resumeRes.data.resume_text;
        }
      }
    }

    const result = await analyzeCommunicationWithProvider({
      role: {
        title: roleTitle,
        company: companyName,
      },
      requirements: requirementsList,
      candidateExperience,
      question,
      transcript: transcript.trim(),
      previousQuestions,
      previousAnswers,
      preparationItems: preparationItemsList,
    });

    return NextResponse.json({
      ...result,
      provider: activeAI.provider,
    });
  } catch (error: unknown) {
    console.error('[Analyze Communication API] Error:', error);

    if (error instanceof AIProviderUnavailableError) {
      return NextResponse.json(
        {
          error: 'AI feedback is temporarily unavailable.',
          details: error.message,
        },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown analysis error';
    return NextResponse.json(
      {
        error: 'AI feedback is temporarily unavailable.',
        details: message,
      },
      { status: 500 }
    );
  }
}
