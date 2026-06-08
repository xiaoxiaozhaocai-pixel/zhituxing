/**
 * JD 批量向量化脚本
 * 
 * 用途：P1 匹配层第一步 —— 为 job_descriptions 表已有 JD 生成 embedding
 * 
 * 使用方式：
 *   npx tsx scripts/embed-jds.ts
 * 
 * 环境变量（在 Zeabur 或本地 .env 配置）：
 *   DEEPSEEK_API_KEY    — DeepSeek API Key（embedding 模型：deepseek-embedding）
 *   SUPABASE_URL         — Supabase 项目 URL
 *   SUPABASE_SERVICE_ROLE_KEY — Service Role Key（绕过 RLS）
 * 
 * 成本估算：
 *   deepseek-embedding 定价 ¥0.1/百万 token
 *   每条 JD ≈ 200-500 token → 万条 JD ≈ ¥0.5-1
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// 配置
// ============================================================

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_EMBEDDING_URL = 'https://api.deepseek.com/v1/embeddings';
const DEEPSEEK_EMBEDDING_MODEL = 'deepseek-embedding';  // 1536维

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';

const BATCH_SIZE = 20;       // 每批处理的 JD 数（DeepSeek embedding API 支持批量）
const DELAY_MS = 500;        // 批次间延迟，避免限流
const MAX_RETRIES = 3;       // 单条重试次数

// ============================================================
// 工具函数
// ============================================================

/** 拼接 JD 文本用于 embedding */
function buildJDText(jd: Record<string, unknown>): string {
  const parts: string[] = [];
  if (jd.job_title) parts.push(`岗位：${jd.job_title}`);
  if (jd.industry) parts.push(`行业：${jd.industry}`);
  if (jd.responsibilities) parts.push(`职责：${String(jd.responsibilities).slice(0, 800)}`);
  if (jd.requirements) parts.push(`要求：${String(jd.requirements).slice(0, 500)}`);
  return parts.join('\n');
}

/** 调用 DeepSeek Embedding API */
async function getEmbedding(text: string): Promise<number[]> {
  const response = await fetch(DEEPSEEK_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  return data.data?.[0]?.embedding || [];
}

/** 批量调用 DeepSeek Embedding API */
async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const response = await fetch(DEEPSEEK_EMBEDDING_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_EMBEDDING_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Batch embedding API error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  return (data.data || []).map((item: { embedding: number[] }) => item.embedding);
}

/** 带重试的 embedding 获取 */
async function getEmbeddingWithRetry(text: string, retries = MAX_RETRIES): Promise<number[]> {
  for (let i = 0; i < retries; i++) {
    try {
      return await getEmbedding(text);
    } catch (err) {
      if (i === retries - 1) throw err;
      console.warn(`  Retry ${i + 1}/${retries}...`);
      await sleep(2000 * (i + 1));
    }
  }
  return [];
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('=== JD 向量化脚本 ===\n');

  // 检查环境变量
  if (!DEEPSEEK_API_KEY) {
    console.error('❌ 缺少 DEEPSEEK_API_KEY 环境变量');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ 缺少 Supabase 环境变量');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. 查询需要向量化的 JD（status=parsed 且 embedding 为空）
  console.log('📋 查询待向量化 JD...');
  
  const { data: jds, error, count } = await supabase
    .from('job_descriptions')
    .select('id, job_title, industry, responsibilities, requirements', { count: 'exact' })
    .eq('status', 'parsed')
    .is('embedding', null)
    .limit(10000);

  if (error) {
    console.error('❌ 查询失败:', error.message);
    process.exit(1);
  }

  const total = count || jds?.length || 0;
  console.log(`   共 ${total} 条 JD 待向量化\n`);

  if (total === 0) {
    console.log('✅ 所有 JD 已向量化完成');
    return;
  }

  // 2. 分批处理
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < (jds?.length || 0); i += BATCH_SIZE) {
    const batch = jds!.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil((jds?.length || 0) / BATCH_SIZE);

    console.log(`🔄 批次 ${batchNum}/${totalBatches} (${batch.length} 条)...`);

    try {
      // 批量生成 embedding
      const texts = batch.map(jd => buildJDText(jd));
      const embeddings = await getEmbeddingsBatch(texts);

      // 批量更新 Supabase
      const updates = batch.map((jd, idx) => ({
        id: jd.id,
        embedding: embeddings[idx],
      }));

      // 逐条 upsert（Supabase vector 类型不支持批量 upsert）
      for (const update of updates) {
        if (!update.embedding || update.embedding.length === 0) {
          console.warn(`  ⚠️ JD ${update.id} embedding 为空，跳过`);
          failed++;
          continue;
        }

        const { error: updateErr } = await supabase
          .from('job_descriptions')
          .update({ embedding: update.embedding })
          .eq('id', update.id);

        if (updateErr) {
          console.error(`  ❌ JD ${update.id} 更新失败: ${updateErr.message}`);
          failed++;
        } else {
          processed++;
        }
      }

      console.log(`   ✅ 已完成 ${processed + failed}/${total}`);
    } catch (err) {
      console.error(`  ❌ 批次 ${batchNum} 失败:`, err);
      failed += batch.length;
    }

    // 批次间延迟
    if (i + BATCH_SIZE < (jds?.length || 0)) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n=== 完成 ===`);
  console.log(`✅ 成功: ${processed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📊 总计: ${total}`);
}

main().catch(console.error);
