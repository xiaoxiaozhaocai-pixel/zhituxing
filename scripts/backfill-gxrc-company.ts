/**
 * 数据回填脚本：从 raw_jd 字段提取广西人才网公司名
 * 
 * 使用示例：
 * // pnpm tsx scripts/backfill-gxrc-company.ts --dry-run --limit 5
 * // pnpm tsx scripts/backfill-gxrc-company.ts --apply
 * 
 * 原理：gxrc title 格式：{职位名}_{公司名} - 广西人才网
 * 从 raw_jd 中提取 <title> 标签内容，按 _ 分割后取最后一段
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('请设置环境变量 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 解析命令行参数
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--apply');
const limitArg = args.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 1000;

/**
 * 从 raw_jd 中提取公司名
 * @param rawJd HTML 文本
 * @returns 公司名，提取失败返回 null
 */
function extractCompany(rawJd: string): string | null {
  if (!rawJd) return null;
  
  // 匹配 <title>...</title>
  const titleMatch = rawJd.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (!titleMatch) return null;
  
  const title = titleMatch[1].trim();
  
  // 检查是否包含"广西人才网"
  if (!title.includes('广西人才网')) return null;
  
  // 格式：职位名_公司名 - 广西人才网
  // 先移除 "- 广西人才网" 部分
  const withoutSuffix = title.replace(/-[\s\S]*广西人才网[\s\S]*$/i, '').trim();
  
  // 按 _ 分割
  const parts = withoutSuffix.split('_');
  
  // 取最后一段作为公司名
  if (parts.length >= 2) {
    const company = parts[parts.length - 1].trim();
    // 过滤太短或太长的结果
    if (company.length >= 2 && company.length <= 50) {
      // 过滤明显不是公司名的内容
      if (!['招聘', '求职', '人才', '简历', '工作'].includes(company)) {
        return company;
      }
    }
  }
  
  return null;
}

/**
 * 查询需要回填的记录
 */
async function fetchRecordsToFill() {
  const query = new URLSearchParams({
    select: 'id,job_title,company,raw_jd',
    // 只查 gxrc 的记录，且 company 为空或 null
    source_url: 'like.https://www.gxrc.com/%',
    or: 'company.is.null,company.eq.',
    limit: String(limit)
  });
  
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/job_descriptions?${query}`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`查询失败: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * 更新单条记录
 */
async function updateRecord(id: number, company: string) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/job_descriptions?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ company }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`更新记录 ${id} 失败: ${response.status}`);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log(`=== 广西人才网公司名回填脚本 ===`);
  console.log(`模式: ${isDryRun ? '🔍 DRY RUN（不写库）' : '✏️ APPLY（真实更新）'}`);
  console.log(`限制: ${limit} 条\n`);
  
  // 1. 查询需要回填的记录
  console.log('查询需要回填的记录...');
  const records = await fetchRecordsToFill();
  console.log(`找到 ${records.length} 条 company 为空的 gxrc 记录\n`);
  
  if (records.length === 0) {
    console.log('没有需要回填的记录，退出');
    return;
  }
  
  // 2. 提取公司名
  const results = records.map(record => {
    const company = extractCompany(record.raw_jd);
    return {
      id: record.id,
      jobTitle: record.job_title,
      rawCompany: record.company,
      extractedCompany: company,
      success: !!company
    };
  });
  
  // 3. 统计
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  // 4. 输出示例
  console.log('=== 提取结果示例 ===');
  const sampleCount = Math.min(5, results.length);
  for (let i = 0; i < sampleCount; i++) {
    const r = results[i];
    console.log(`${r.success ? '✅' : '❌'} ID: ${r.id}`);
    console.log(`   职位: ${r.jobTitle}`);
    console.log(`   提取: ${r.extractedCompany || '失败'}`);
    console.log();
  }
  
  // 5. 输出失败记录
  if (failCount > 0) {
    console.log('=== 提取失败记录 ===');
    const failures = results.filter(r => !r.success);
    for (const r of failures.slice(0, 10)) {
      console.log(`❌ ID: ${r.id}, 职位: ${r.jobTitle}`);
    }
    if (failures.length > 10) {
      console.log(`... 还有 ${failures.length - 10} 条失败记录`);
    }
    console.log();
  }
  
  // 6. 汇总
  console.log('=== 汇总统计 ===');
  console.log(`总记录: ${records.length} 条`);
  console.log(`提取成功: ${successCount} 条`);
  console.log(`提取失败: ${failCount} 条`);
  console.log();
  
  // 7. 如果不是 dry-run，执行更新
  if (!isDryRun) {
    console.log('=== 开始更新数据库 ===');
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const r of results) {
      if (r.success) {
        try {
          await updateRecord(r.id, r.extractedCompany!);
          updatedCount++;
          if (updatedCount % 50 === 0) {
            console.log(`已更新: ${updatedCount}/${successCount}`);
          }
        } catch (error) {
          console.error(`更新记录 ${r.id} 失败:`, error);
          errorCount++;
        }
      }
    }
    
    console.log('\n=== 更新完成 ===');
    console.log(`成功更新: ${updatedCount} 条`);
    console.log(`更新失败: ${errorCount} 条`);
  } else {
    console.log('⚠️  DRY RUN 模式，跳过数据库更新');
    console.log('如需真实更新，请使用 --apply 参数');
  }
}

main().catch(console.error);