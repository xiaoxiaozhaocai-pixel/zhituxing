-- Migration: 20260608_match_jobs_rpc
-- pgvector 语义搜索 RPC 函数
-- 用于 matching-service.ts 调用

-- match_jobs: 按余弦相似度搜索最匹配的 JD
CREATE OR REPLACE FUNCTION match_jobs(
  query_embedding extensions.vector(1024),
  match_limit INTEGER DEFAULT 20,
  industry_filter TEXT DEFAULT NULL,
  city_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  job_title TEXT,
  industry TEXT,
  city TEXT,
  salary_range TEXT,
  education TEXT,
  experience TEXT,
  responsibilities TEXT,
  skills TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jd.id,
    jd.job_title,
    jd.industry,
    jd.city,
    jd.salary_range,
    jd.education,
    jd.experience,
    jd.responsibilities,
    jd.skills,
    1 - (jd.embedding <=> query_embedding) AS similarity
  FROM job_descriptions jd
  WHERE jd.status = 'parsed'
    AND jd.embedding IS NOT NULL
    AND (industry_filter IS NULL OR jd.industry ILIKE '%' || industry_filter || '%')
    AND (city_filter IS NULL OR jd.city ILIKE '%' || city_filter || '%')
  ORDER BY jd.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;
