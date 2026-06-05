-- 高校表（ToB Path A 核心）
CREATE TABLE IF NOT EXISTS universities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  contact_email TEXT,
  student_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 高校管理员关联（user_id 关联 auth.users，非 user_profiles）
-- ⚠️ 2026-06-05 修正：原 user_profiles(id) 为 bigint，改为 auth.users(id) UUID
CREATE TABLE IF NOT EXISTS university_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID REFERENCES universities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(university_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_universities_status ON universities(status);
CREATE INDEX IF NOT EXISTS idx_university_admins_user ON university_admins(user_id);

-- RLS
ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_admins ENABLE ROW LEVEL SECURITY;

-- 任何人可读高校列表
CREATE POLICY "universities_select_anon" ON universities FOR SELECT USING (true);

-- 高校管理员可写
CREATE POLICY "universities_insert_admin" ON universities FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM university_admins
    WHERE university_admins.university_id = universities.id
    AND university_admins.user_id = auth.uid()
  ));

CREATE POLICY "universities_update_admin" ON universities FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM university_admins
    WHERE university_admins.university_id = universities.id
    AND university_admins.user_id = auth.uid()
  ));

-- 高校管理员只能看自己的关联
CREATE POLICY "university_admins_select_own" ON university_admins FOR SELECT
  USING (auth.uid() = user_id);