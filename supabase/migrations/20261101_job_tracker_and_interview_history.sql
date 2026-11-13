-- Migration: 20261101_job_tracker_and_interview_history.sql
-- Additive only: turns `roles` into a job-application tracker and adds the
-- interview history tables the app already writes to. Nothing is renamed or dropped.

-- 1. Application tracking fields on roles
ALTER TABLE public.roles
  ADD COLUMN IF NOT EXISTS application_status TEXT NOT NULL DEFAULT 'saved',
  ADD COLUMN IF NOT EXISTS applied_at DATE,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS job_url TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS next_follow_up DATE,
  ADD COLUMN IF NOT EXISTS interview_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'roles_application_status_check') THEN
    ALTER TABLE public.roles ADD CONSTRAINT roles_application_status_check
      CHECK (application_status IN ('saved','applied','screening','interview','offer','rejected','withdrawn'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS roles_user_status_idx ON public.roles (user_id, application_status);

-- 2. Application timeline
CREATE TABLE IF NOT EXISTS public.application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'note',   -- 'status' | 'note' | 'follow_up' | 'created'
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS application_events_role_idx ON public.application_events (role_id, created_at DESC);
ALTER TABLE public.application_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own application events" ON public.application_events;
CREATE POLICY "Users manage their own application events"
  ON public.application_events FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Interview history (schema from 20260922_create_interview_tables.sql, plus result columns)
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS questions_answered INT,
  ADD COLUMN IF NOT EXISTS rounds JSONB,
  ADD COLUMN IF NOT EXISTS final_feedback JSONB;

CREATE TABLE IF NOT EXISTS public.interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  competency TEXT NOT NULL,
  sequence INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.interview_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.interview_questions(id) ON DELETE CASCADE,
  answer TEXT NOT NULL,
  feedback JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own interviews" ON public.interviews;
CREATE POLICY "Users manage their own interviews"
  ON public.interviews FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage questions for their interviews" ON public.interview_questions;
CREATE POLICY "Users manage questions for their interviews"
  ON public.interview_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.interviews i WHERE i.id = interview_questions.interview_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.interviews i WHERE i.id = interview_questions.interview_id AND i.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users manage answers for their interviews" ON public.interview_answers;
CREATE POLICY "Users manage answers for their interviews"
  ON public.interview_answers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.interviews i WHERE i.id = interview_answers.interview_id AND i.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.interviews i WHERE i.id = interview_answers.interview_id AND i.user_id = auth.uid()));
