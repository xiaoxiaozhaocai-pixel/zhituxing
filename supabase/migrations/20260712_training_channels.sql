-- Migration: 企业定制培养通道
-- P5.4 企业定制培养通道
-- 包含 employer_training_tracks（培养通道定义）和 training_track_students（学生参与记录）

CREATE TABLE IF NOT EXISTS public.employer_training_tracks (
  id BIGSERIAL PRIMARY KEY,
  employer_id uuid NOT NULL REFERENCES public.employer_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_skills TEXT[],    -- 培养目标技能列表
  target_grades TEXT[],     -- 目标年级
  duration_weeks INT,
  stages JSONB,            -- 培养阶段安排
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.training_track_students (
  id BIGSERIAL PRIMARY KEY,
  track_id BIGINT NOT NULL REFERENCES public.employer_training_tracks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'invited' CHECK (status IN ('invited','accepted','active','completed','withdrawn')),
  stage_progress JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.employer_training_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_track_students ENABLE ROW LEVEL SECURITY;

-- RLS policies: 雇主只能看到自己的培养通道
DROP POLICY IF EXISTS "Employers view own training tracks" ON public.employer_training_tracks;
CREATE POLICY "Employers view own training tracks"
  ON public.employer_training_tracks FOR ALL
  USING (employer_id = auth.uid());

-- RLS policies for students
DROP POLICY IF EXISTS "Employers manage track students" ON public.training_track_students;
CREATE POLICY "Employers manage track students"
  ON public.training_track_students FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.employer_training_tracks
      WHERE id = training_track_students.track_id
      AND employer_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_training_tracks_employer ON public.employer_training_tracks(employer_id);
CREATE INDEX IF NOT EXISTS idx_track_students_track ON public.training_track_students(track_id);
CREATE INDEX IF NOT EXISTS idx_track_students_user ON public.training_track_students(user_id);
