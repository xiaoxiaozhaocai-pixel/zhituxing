/**
 * 探活脚本：检查 gxrc 链接可用性并更新 url_status
 * 
 * 使用示例：
 * // pnpm tsx scripts/probe-gxrc-url-status.ts --dry-run --limit 10
 * // pnpm tsx scripts/probe-gxrc-url-status.ts --apply
 * 
 * 判定规则：
 * - 200 且最终 URL 不含 /NoPosition/ → alive
 * - 200 但最终 URL 含 /NoPosition/ → dead（已下架兜底页）
 * - 其他 → dead
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

// 并发限制
const CONCURRENT_LIMIT = 5;

/**
 * 探活单个 URL
 * @param url 要检查的 URL
 * @returns alive / dead / error
 */
async function probeUrl(url: string): Promise<'alive' | 'dead' | 'error'> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
    
    const response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow' as const,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    clearTimeout(timeoutId);
    
    // 检查最终 URL 是否包含 NoPosition
    const finalUrl = response.url;
    if (response.status === 200) {
      if (finalUrl.includes('/NoPosition/')) {
        return 'dead'; // 已下架兜底页
      }
      return 'alive';
    }
    
    return 'dead';
  } catch (error) {
    console.debug(`探活失败 ${url}:`, error instanceof Error ? error.message : error);
    return 'error';
  }
}

/**
 * 查询需要探活的记录
 */
async function fetchRecordsToProbe() {
  const query = new URLSearchParams({
    select: 'id,source_url',
    // 只查 gxrc 的真实记录（is_synthetic=false）
    source_url: 'like.https://www.gxrc.com/%',
    is_synthetic: 'eq.false',
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
 * 更新单条记录的 url_status
 */
async function updateRecord(id: number, urlStatus: string) {
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
      body: JSON.stringify({ url_status: urlStatus }),
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
  console.log(`=== gxrc 链接探活脚本 ===`);
  console.log(`模式: ${isDryRun ? '🔍 DRY RUN（不写库）' : '✏️ APPLY（真实更新）'}`);
  console.log(`限制: ${limit} 条`);
  console.log(`并发: ${CONCURRENT_LIMIT}\n`);
  
  // 1. 查询需要探活的记录
  console.log('查询需要探活的记录...');
  const records = await fetchRecordsToProbe();
  console.log(`找到 ${records.length} 条需要探活的 gxrc 记录\n`);
  
  if (records.length === 0) {
    console.log('没有需要探活的记录，退出');
    return;
  }
  
  // 2. 并发探活（限制并发数）
  console.log('=== 开始探活 ===');
  const results: Array<{
    id: number;
    url: string;
    status: 'alive' | 'dead' | 'error';
  }> = [];
  
  const semaphore = {
    running: 0,
    queue: records.slice(),
    resolve: null as (() => void) | null
  };
  
  const probeNext = async () => {
    if (semaphore.queue.length === 0 && semaphore.running === 0) {
      if (semaphore.resolve) semaphore.resolve();
      return;
    }
    
    while (semaphore.running < CONCURRENT_LIMIT && semaphore.queue.length > 0) {
      const record = semaphore.queue.shift()!;
      semaphore.running++;
      
      (async () => {
        const status = await probeUrl(record.source_url);
        results.push({
          id: record.id,
          url: record.source_url,
          status
        });
        
        semaphore.running--;
        probeNext();
      })();
    }
  };
  
  await new Promise<void>(resolve => {
    semaphore.resolve = resolve;
    probeNext();
  });
  
  // 3. 统计
  const aliveCount = results.filter(r => r.status === 'alive').length;
  const deadCount = results.filter(r => r.status === 'dead').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  // 4. 输出示例
  console.log('\n=== 探活结果示例 ===');
  console.log('✅ 存活链接:');
  const aliveSample = results.filter(r => r.status === 'alive').slice(0, 3);
  for (const r of aliveSample) {
    console.log(`   ID: ${r.id} - ${r.url}`);
  }
  
  console.log('\n❌ 失效链接:');
  const deadSample = results.filter(r => r.status === 'dead').slice(0, 3);
  for (const r of deadSample) {
    console.log(`   ID: ${r.id} - ${r.url}`);
  }
  
  console.log('\n⚠️ 探活失败:');
  const errorSample = results.filter(r => r.status === 'error').slice(0, 3);
  for (const r of errorSample) {
    console.log(`   ID: ${r.id} - ${r.url}`);
  }
  
  // 5. 汇总
  console.log('\n=== 汇总统计 ===');
  console.log(`总记录: ${records.length} 条`);
  console.log(`存活(alive): ${aliveCount} 条 (${((aliveCount / records.length) * 100).toFixed(1)}%)`);
  console.log(`失效(dead): ${deadCount} 条 (${((deadCount / records.length) * 100).toFixed(1)}%)`);
  console.log(`探活失败(error): ${errorCount} 条 (${((errorCount / records.length) * 100).toFixed(1)}%)`);
  console.log();
  
  // 6. 如果不是 dry-run，执行更新
  if (!isDryRun) {
    console.log('=== 开始更新数据库 ===');
    let updatedCount = 0;
    let errorCount = 0;
    
    // 只更新状态变化的记录（dead 或 alive）
    const toUpdate = results.filter(r => r.status !== 'error');
    
    for (const r of toUpdate) {
      try {
        await updateRecord(r.id, r.status);
        updatedCount++;
        if (updatedCount % 50 === 0) {
          console.log(`已更新: ${updatedCount}/${toUpdate.length}`);
        }
      } catch (error) {
        console.error(`更新记录 ${r.id} 失败:`, error);
        errorCount++;
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