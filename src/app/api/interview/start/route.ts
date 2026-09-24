import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateFirstQuestion } from '@/lib/interview-engine';
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
    const { roleId } = body;

    if (!roleId) {
      return NextResponse.json({ error: 'roleId is required.' }, { status: 400 });
    }

    // Extract authorization header
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    // Authenticate user via Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      },
    });

    let userId: string | null = null;
    if (token) {
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    // 1. Fetch Role
    const { data: roleData } = await supabase
      .from('roles')
      .select('*')
      .eq('id', roleId)
      .single();

    if (!roleData) {
      return NextResponse.json({ error: `Role not found for ID: ${roleId}` }, { status: 404 });
    }

    const role: Role = roleData;

    // 2. Fetch Requirements, Fit, Prep Items, Resume (via roles.resume_id)
    const [reqRes, fitRes, prepRes, resumeRes] = await Promise.all([
      supabase.from('role_requirements').select('*').eq('role_id', roleId),
      supabase.from('fit_analysis').select('*').eq('role_id', roleId),
      supabase.from('preparation_items').select('*').eq('role_id', roleId),
      roleData.resume_id
        ? supabase.from('resumes').select('resume_text').eq('id', roleData.resume_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const requirements = (reqRes.data || []) as RoleRequirement[];
    const fitAnalysis = (fitRes.data || []) as FitAnalysis[];
    const preparationItems: PreparationItem[] = (prepRes.data || []) as PreparationItem[];

    const resumeText = resumeRes.data?.resume_text || null;

    // 3. Generate first question using role context
    const generated = await generateFirstQuestion({
      role,
      requirements,
      fitAnalysis,
      preparationItems,
      resumeText,
    });

    const interviewId = `int-${Date.now()}`;
    const questionId = `q-${Date.now()}`;

    // 4. Attempt to persist interview to Supabase if table exists
    try {
      const { data: dbInterview } = await supabase
        .from('interviews')
        .insert({
          role_id: roleId.includes('-') && roleId.length === 36 ? roleId : null,
          user_id: userId,
          status: 'in_progress',
        })
        .select()
        .single();

      if (dbInterview?.id) {
        await supabase.from('interview_questions').insert({
          interview_id: dbInterview.id,
          question: generated.question,
          competency: generated.competency,
          sequence: 1,
        });
      }
    } catch {
      // If table migration is pending in user's Supabase instance, continue with generated session
    }

    return NextResponse.json({
      interviewId,
      questionId,
      question: generated.question,
      competency: generated.competency,
    });
  } catch (err: unknown) {
    console.error('Error in /api/interview/start:', err);
    const message = err instanceof Error ? err.message : 'Failed to start interview.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
