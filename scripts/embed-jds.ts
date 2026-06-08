/**
 * JD 批量向量化脚本 v2
 * 
 * 支持多 provider：SiliconFlow / DeepSeek / 火山引擎
 * 默认使用 SiliconFlow (BAAI/bge-large-zh-v1.5, 免费 tier)
 */

import { createClient } from '@supabase/supabase-js';

// ============================================================
// Provider 配置
// ============================================================

type EmbeddingProvider = 'siliconflow' | 'deepseek' | 'volcengine';

interface ProviderConfig {
  url: string;
  model: string;
  apiKey: string;
  headers: (apiKey: string) => Record<string, string>;
}

const PROVIDERS: Record<EmbeddingProvider, Omit<ProviderConfig, 'apiKey'>> = {
  siliconflow: {
    url: 'https://api.siliconflow.cn/v1/embeddings',
    model: 'BAAI/bge-large-zh-v1.5',
    headers: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
  },
  deepseek: {
    url: 'https://api.deepseek.com/v1/embeddings',
    model: 'deepseek-embedding',
    headers: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
  },
  volcengine: {
    url: 'https://ark.cn-beijing.volces.com/api/v3/embeddings',
    model: 'doubao-embedding',
    headers: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    }),
  },
};

// ============================================================
// 配置
// ============================================================

const PROVIDER: EmbeddingProvider = (process.env.EMBEDDING_PROVIDER as EmbeddingProvider) || 'siliconflow';
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || process.env.SILICONFLOW_API_KEY || process.env.DEEPSEEK_API_KEY || '';
const providerConfig = { ...PROVIDERS[PROVIDER], apiKey: EMBEDDING_API_KEY };

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.COZE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || process.env.COZE_SUPABASE_SERVICE_ROLE_KEY || '';

const BATCH_SIZE = 20;
const DELAY_MS = 500;

// ============================================================
// 工具函数
// ============================================================

function buildJDText(jd: Record<string, unknown>): string {
  const parts: string[] = [];
  if (jd.job_title) parts.push(`岗位：${jd.job_title}`);
  if (jd.industry) parts.push(`行业：${jd.industry}`);
  if (jd.responsibilities) parts.push(`职责：${String(jd.responsibilities).slice(0, 800)}`);
  if (jd.hard_skills) parts.push(`硬技能：${JSON.stringify(jd.hard_skills).slice(0, 500)}`);
  if (jd.major_require) parts.push(`专业要求：${String(jd.major_require).slice(0, 300)}`);
  return parts.join('\n');
}

async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  const response = await fetch(providerConfig.url, {
    method: 'POST',
    headers: providerConfig.headers(providerConfig.apiKey),
    body: JSON.stringify({
      model: providerConfig.model,
      input: texts,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  return (data.data || []).map((item: { embedding: number[] }) => item.embedding);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log('=== JD 向量化脚本 v2 ===');
  console.log(`Provider: ${PROVIDER} | Model: ${providerConfig.model}\n`);

  if (!EMBEDDING_API_KEY) {
    console.error(`❌ 缺少 EMBEDDING_API_KEY 环境变量（provider=${PROVIDER}）`);
    console.error('   SiliconFlow: https://cloud.siliconflow.cn 注册获取免费 key');
    console.error('   火山引擎:   https://console.volcengine.com/ark 获取 AK/SK');
    process.exit(1);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ 缺少 Supabase 环境变量');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  console.log('📋 查询待向量化 JD...');
  const { data: jds, error, count } = await supabase
    .from('job_descriptions')
    .select('id, job_title, industry, responsibilities, hard_skills, major_require', { count: 'exact' })
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

  let processed = 0;
  let failed = 0;

  for (let i = 0; i < (jds?.length || 0); i += BATCH_SIZE) {
    const batch = jds!.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil((jds?.length || 0) / BATCH_SIZE);

    console.log(`🔄 批次 ${batchNum}/${totalBatches} (${batch.length} 条)...`);

    try {
      const texts = batch.map(jd => buildJDText(jd));
      const embeddings = await getEmbeddingsBatch(texts);

      for (let idx = 0; idx < batch.length; idx++) {
        const embedding = embeddings[idx];
        if (!embedding || embedding.length === 0) {
          console.warn(`  ⚠️ JD ${batch[idx].id} embedding 为空，跳过`);
          failed++;
          continue;
        }

        const { error: updateErr } = await supabase
          .from('job_descriptions')
          .update({ embedding })
          .eq('id', batch[idx].id);

        if (updateErr) {
          console.error(`  ❌ JD ${batch[idx].id} 更新失败: ${updateErr.message}`);
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
