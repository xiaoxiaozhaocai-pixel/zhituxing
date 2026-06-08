-- Migration: 20260608_add_pgvector
-- 为 job_descriptions 表添加向量搜索能力
-- 依赖：Supabase pgvector 扩展（免费，CREATE EXTENSION 即可）

-- Step 1: 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Step 2: 为 job_descriptions 添加 embedding 列（1024维 → SiliconFlow BAAI bge-large-zh-v1.5（1024维））
ALTER TABLE job_descriptions
ADD COLUMN IF NOT EXISTS embedding extensions.vector(1024);

-- Step 3: 创建 HNSW 索引（生产级向量搜索索引，比 IVFFlat 更快）
-- 注意：pgvector 0.5+ 才支持 HNSW；Supabase 已升级至 0.5+
CREATE INDEX IF NOT EXISTS idx_jd_embedding_hnsw
ON job_descriptions
USING hnsw (embedding extensions.vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- Step 4: 添加 status 索引（embedding 脚本和匹配 API 按 status 筛选）
CREATE INDEX IF NOT EXISTS idx_jd_status_embedding
ON job_descriptions(status, id)
WHERE embedding IS NOT NULL;

-- Step 5: 注释
COMMENT ON COLUMN job_descriptions.embedding IS 'DeepSeek Embedding 向量（1024维），用于语义岗位匹配';
