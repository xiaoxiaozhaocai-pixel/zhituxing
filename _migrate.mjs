import { createClient } from '@supabase/supabase-js';

const url = 'https://gpwekhlltsvoalmqzjyv.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc1Nzc0NiwiZXhwIjoyMDkyMzMzNzQ2fQ.-hP6eVgWEUsYkM9pyVkXPT9bMP_ek30_wgOeZ0PL1X4';
const supabase = createClient(url, key);

async function migrate() {
  const sql1 = `CREATE TABLE IF NOT EXISTS employer_job_posts (
    id BIGSERIAL PRIMARY KEY,
    employer_id UUID NOT NULL,
    job_title TEXT NOT NULL,
    description TEXT,
    required_hard_skills JSONB DEFAULT '[]'::jsonb,
    required_soft_skills JSONB DEFAULT '[]'::jsonb,
    target_grade TEXT,
    target_major TEXT,
    target_school TEXT,
    target_cities JSONB DEFAULT '[]'::jsonb,
    target_industry TEXT,
    min_completeness INTEGER DEFAULT 0,
    min_assessment INTEGER DEFAULT 0,
    has_internship_required TEXT DEFAULT 'any',
    graduation_year TEXT,
    auto_push BOOLEAN DEFAULT false,
    push_frequency TEXT DEFAULT 'weekly',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`;
  const r1 = await supabase.rpc('exec_sql', { query: sql1 });
  console.log('Step 1 (create job_posts):', JSON.stringify(r1.error || r1.data));

  const sql2 = `CREATE TABLE IF NOT EXISTS employer_job_matches (
    id BIGSERIAL PRIMARY KEY,
    job_post_id BIGINT NOT NULL,
    candidate_user_id UUID NOT NULL,
    match_score NUMERIC(5,2) NOT NULL,
    matched_at TIMESTAMPTZ DEFAULT NOW(),
    is_viewed BOOLEAN DEFAULT false,
    is_notified BOOLEAN DEFAULT false,
    notes TEXT,
    UNIQUE(job_post_id, candidate_user_id)
  )`;
  const r2 = await supabase.rpc('exec_sql', { query: sql2 });
  console.log('Step 2 (create job_matches):', JSON.stringify(r2.error || r2.data));

  const idx1 = `CREATE INDEX IF NOT EXISTS idx_job_posts_employer ON employer_job_posts(employer_id)`;
  console.log('idx1:', JSON.stringify((await supabase.rpc('exec_sql', { query: idx1 })).error));
  const idx2 = `CREATE INDEX IF NOT EXISTS idx_job_matches_post ON employer_job_matches(job_post_id)`;
  console.log('idx2:', JSON.stringify((await supabase.rpc('exec_sql', { query: idx2 })).error));
  const idx3 = `CREATE INDEX IF NOT EXISTS idx_job_matches_score ON employer_job_matches(match_score DESC)`;
  console.log('idx3:', JSON.stringify((await supabase.rpc('exec_sql', { query: idx3 })).error));

  const verify = await supabase.rpc('exec_sql', {
    query: `SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('employer_job_posts','employer_job_matches')`
  });
  console.log('Verify:', JSON.stringify(verify.data || verify.error));
}

migrate().catch(console.error);
