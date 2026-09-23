-- Migration: 20260922_create_interview_tables.sql
-- Description: Create tables for AI Interview module with Row Level Security (RLS)

-- 1. Table: interviews
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2. Table: interview_questions
CREATE TABLE IF NOT EXISTS public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  competency TEXT NOT NULL,
  sequence INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Table: interview_answers
CREATE TABLE IF NOT EXISTS public.interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.interview_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  feedback JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for interviews
CREATE POLICY "Users can view their own interviews"
  ON public.interviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interviews"
  ON public.interviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interviews"
  ON public.interviews FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for interview_questions
CREATE POLICY "Users can view questions for their interviews"
  ON public.interview_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = interview_questions.interview_id
        AND interviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert questions for their interviews"
  ON public.interview_questions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = interview_questions.interview_id
        AND interviews.user_id = auth.uid()
    )
  );

-- RLS Policies for interview_answers
CREATE POLICY "Users can view answers for their interviews"
  ON public.interview_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = interview_answers.interview_id
        AND interviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert answers for their interviews"
  ON public.interview_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = interview_answers.interview_id
        AND interviews.user_id = auth.uid()
    )
  );

-- Indexes for optimal lookup
CREATE INDEX IF NOT EXISTS idx_interviews_role_user ON public.interviews (role_id, user_id);
CREATE INDEX IF NOT EXISTS idx_interview_questions_interview ON public.interview_questions (interview_id, sequence);
CREATE INDEX IF NOT EXISTS idx_interview_answers_interview_question ON public.interview_answers (interview_id, question_id);
