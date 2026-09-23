-- Migration: 20260922_create_voice_interview_tables.sql
-- Description: Create tables for Real Voice Interview and AI Communication Practice with Row Level Security (RLS)

-- 1. Table: interview_sessions
CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2. Table: interview_questions
CREATE TABLE IF NOT EXISTS public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_number INT NOT NULL DEFAULT 1,
  question TEXT NOT NULL,
  competency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table: interview_answers
CREATE TABLE IF NOT EXISTS public.interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.interview_questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_type TEXT NOT NULL DEFAULT 'voice', -- 'voice', 'text'
  audio_path TEXT,
  transcript TEXT NOT NULL,
  duration_seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Table: interview_feedback
CREATE TABLE IF NOT EXISTS public.interview_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID REFERENCES public.interview_answers(id) ON DELETE CASCADE,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  improvements JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  communication_feedback JSONB NOT NULL DEFAULT '{}'::jsonb,
  follow_up_needed BOOLEAN NOT NULL DEFAULT FALSE,
  follow_up_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view their own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can insert their own interview sessions" ON public.interview_sessions;
DROP POLICY IF EXISTS "Users can update their own interview sessions" ON public.interview_sessions;

DROP POLICY IF EXISTS "Users can view questions for their interview sessions" ON public.interview_questions;
DROP POLICY IF EXISTS "Users can insert questions for their interview sessions" ON public.interview_questions;

DROP POLICY IF EXISTS "Users can view answers for their interview sessions" ON public.interview_answers;
DROP POLICY IF EXISTS "Users can insert answers for their interview sessions" ON public.interview_answers;

DROP POLICY IF EXISTS "Users can view feedback for their interview answers" ON public.interview_feedback;
DROP POLICY IF EXISTS "Users can insert feedback for their interview answers" ON public.interview_feedback;

-- RLS Policies for interview_sessions
CREATE POLICY "Users can view their own interview sessions"
  ON public.interview_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interview sessions"
  ON public.interview_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interview sessions"
  ON public.interview_sessions FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for interview_questions
CREATE POLICY "Users can view questions for their interview sessions"
  ON public.interview_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE interview_sessions.id = interview_questions.session_id
        AND interview_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert questions for their interview sessions"
  ON public.interview_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interview_sessions
      WHERE interview_sessions.id = interview_questions.session_id
        AND interview_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for interview_answers
CREATE POLICY "Users can view answers for their interview sessions"
  ON public.interview_answers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert answers for their interview sessions"
  ON public.interview_answers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for interview_feedback
CREATE POLICY "Users can view feedback for their interview answers"
  ON public.interview_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_answers
      WHERE interview_answers.id = interview_feedback.answer_id
        AND interview_answers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert feedback for their interview answers"
  ON public.interview_feedback FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interview_answers
      WHERE interview_answers.id = interview_feedback.answer_id
        AND interview_answers.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_interview_sessions_role_user ON public.interview_sessions (role_id, user_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_session ON public.interview_questions (session_id, question_number);
CREATE INDEX IF NOT EXISTS idx_interview_answers_session_question ON public.interview_answers (session_id, question_id);
CREATE INDEX IF NOT EXISTS idx_interview_feedback_answer ON public.interview_feedback (answer_id);
