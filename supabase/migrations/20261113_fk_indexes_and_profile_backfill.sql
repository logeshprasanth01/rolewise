-- Migration: 20261113_fk_indexes_and_profile_backfill.sql
-- Additive only. Not yet applied to production: run it from the Supabase SQL editor
-- (or `supabase db push`) when you're ready.

-- 1. Covering indexes for foreign keys flagged by the Supabase performance advisor
CREATE INDEX IF NOT EXISTS application_events_user_id_idx ON public.application_events (user_id);
CREATE INDEX IF NOT EXISTS fit_analysis_requirement_id_idx ON public.fit_analysis (requirement_id);
CREATE INDEX IF NOT EXISTS interview_answers_interview_id_idx ON public.interview_answers (interview_id);
CREATE INDEX IF NOT EXISTS interview_answers_question_id_idx ON public.interview_answers (question_id);
CREATE INDEX IF NOT EXISTS interview_questions_interview_id_idx ON public.interview_questions (interview_id);
CREATE INDEX IF NOT EXISTS interviews_role_id_idx ON public.interviews (role_id);
CREATE INDEX IF NOT EXISTS interviews_user_id_idx ON public.interviews (user_id);
CREATE INDEX IF NOT EXISTS preparation_items_requirement_id_idx ON public.preparation_items (requirement_id);

-- 2. Backfill profiles that never saved (the client sent a non-existent `email` column).
--    Optional: the app now creates a profile on each user's next sign-in anyway.
INSERT INTO public.profiles (id, full_name, avatar_url)
SELECT u.id,
       COALESCE(NULLIF(u.raw_user_meta_data->>'full_name',''), NULLIF(u.raw_user_meta_data->>'name',''), split_part(u.email, '@', 1), 'Candidate'),
       COALESCE(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture')
FROM auth.users u
ON CONFLICT (id) DO NOTHING;
