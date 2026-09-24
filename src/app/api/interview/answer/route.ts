import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { analyzeAnswerAndGenerateNext } from '@/lib/interview-engine';
import {
  FitAnalysis,
  PreparationItem,
  Role,
  RoleRequirement,
} from '@/types/database';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dktjtnjkrmrxvksjizwn.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { interviewId, questionId, answer, currentQuestion, competency, sequence, roleId } = body;

    if (!interviewId || !questionId || !answer) {
      return NextResponse.json(
        { error: 'interviewId, questionId, and answer are required.' },
        { status: 400 }
      );
    }

    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    });

    // 1. Fetch Role context
    if (!roleId) {
      return NextResponse.json({ error: 'roleId is required.' }, { status: 400 });
    }

    const { data: roleData } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (!roleData) {
      return NextResponse.json({ error: `Role not found for ID: ${roleId}` }, { status: 404 });
    }

    const role: Role = roleData;
    const targetRoleId = roleId;

    const [reqRes, fitRes, prepRes] = await Promise.all([
      supabase.from('role_requirements').select('*').eq('role_id', targetRoleId),
      supabase.from('fit_analysis').select('*').eq('role_id', targetRoleId),
      supabase.from('preparation_items').select('*').eq('role_id', targetRoleId),
    ]);

    const requirements = (reqRes.data || []) as RoleRequirement[];
    const fitAnalysis = (fitRes.data || []) as FitAnalysis[];
    const preparationItems: PreparationItem[] = (prepRes.data || []) as PreparationItem[];

    // 2. Evaluate answer and synthesize next question
    const result = await analyzeAnswerAndGenerateNext({
      context: {
        role,
        requirements,
        fitAnalysis,
        preparationItems,
      },
      currentQuestion: currentQuestion || 'Core competency evaluation question.',
      competency: competency || 'Design Systems',
      answer,
      questionSequence: sequence || 1,
    });

    // 3. Attempt to save answer to Supabase if table exists
    try {
      if (interviewId.length === 36 && questionId.length === 36) {
        await supabase.from('interview_answers').insert({
          interview_id: interviewId,
          question_id: questionId,
          answer,
          feedback: result.feedback,
        });

        if (result.nextQuestion) {
          await supabase.from('interview_questions').insert({
            interview_id: interviewId,
            question: result.nextQuestion.question,
            competency: result.nextQuestion.competency,
            sequence: (sequence || 1) + 1,
          });
        }
      }
    } catch {
      // Continue if schema migration is pending
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error('Error in /api/interview/answer:', err);
    const message = err instanceof Error ? err.message : 'Failed to analyze interview answer.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
