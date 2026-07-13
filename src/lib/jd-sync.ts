/**
 * JD 统一同步核心库
 * 多源统一管道 → job_descriptions 表
 * 启用: gxrc(广西人才网·HTML抓取), shixiseng(实习僧)
 * 废弃: ncss API (404), jd-sync-service.ts (jobs表不存在)
 */

import { getSupabaseAdmin } from '@/lib/supabase';

export interface JdSyncOptions {
  limit?: number;
  dryRun?: boolean;
  source?: 'gxrc' | 'shixiseng' | 'all';
}

export interface JdSyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { url: string; reason: string }[];
}

const TIMEOUT_MS = 15000;

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function httpGet(url: string, parseAsText = false): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseAsText ? res.text() : res.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

function parseSalary(text: string | null): { salaryMin: number | null; salaryMax: number | null } {
  if (!text) return { salaryMin: null, salaryMax: null };
  const t = text.replace(/,/g, '').trim();
  // 5-8K / 5K-8K / 5000-8000
  const rangeMatch = t.match(/(\d+)\s*[-~至到]\s*(\d+)/);
  if (rangeMatch) {
    let min = parseInt(rangeMatch[1]!);
    let max = parseInt(rangeMatch[2]!);
    if (t.toLowerCase().includes('k')) { min *= 1000; max *= 1000; }
    else if (min < 1000) { min *= 1000; max *= 1000; }
    return { salaryMin: min, salaryMax: max };
  }
  const singleMatch = t.match(/(\d+)/);
  if (singleMatch) {
    let v = parseInt(singleMatch[1]!);
    if (t.toLowerCase().includes('k')) v *= 1000;
    else if (v < 1000) v *= 1000;
    return { salaryMin: Math.floor(v * 0.8), salaryMax: Math.floor(v * 1.2) };
  }
  return { salaryMin: null, salaryMax: null };
}

// ========================
// 数据源: 广西人才网 (gxrc)
// 方式: API (s.gxrc.com/api/Position/Search)
// ========================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchGxrcViaApi(page: number, pageSize: number): Promise<any[]> {
  try {
    const res = await fetch('https://s.gxrc.com/api/Position/Search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Referer': 'https://s.gxrc.com/',
        'Origin': 'https://s.gxrc.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: JSON.stringify({ KeyWords: '', PageIndex: page, PageSize: pageSize }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.code !== 1) throw new Error(`API error: code=${json.code} msg=${json.message}`);
    return json.data?.items ?? [];
  } catch (e) {
    console.error(`GXRC API 请求失败 (page ${page}):`, (e as Error).message);
    return [];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGxrcApiItem(item: any): Record<string, unknown> {
  const salaryRange = item.payPackage || '';
  const desc = (item.description || '').substring(0, 2000);

  const bodyText = (item.description || '') + ' ' + (item.positionName || '') + ' ' + (item.enterpriseIndustryName || '') + ' ' + (item.positionWelfareNames || []).join(' ');
  const skillKeywords = [
    'Python','Java','JavaScript','TypeScript','React','Vue','Node.js','SQL','MySQL',
    'PostgreSQL','MongoDB','Redis','Docker','Kubernetes','Linux','Git','AWS','Azure',
    'AI','机器学习','数据分析','PHP','Go','Rust','C++','C#','Spring','Django','Flask',
    'HTML','CSS','Excel','项目管理','沟通','团队','领导力','英语',
  ];
  const foundSkills = skillKeywords.filter(k => bodyText.toLowerCase().includes(k.toLowerCase()));
  const hardSkillsStr = foundSkills.length > 0 ? foundSkills.join(',') : '';

  return {
    source_url: `https://www.gxrc.com/jobDetail/${item.positionGuid || ''}`,
    job_title: item.positionName || '',
    company: item.enterpriseName || '',
    industry: item.enterpriseIndustryName || '',
    city: item.workPlace || '',
    salary_range: salaryRange,
    salary_min: item.payPackageFrom ?? null,
    salary_max: item.payPackageTo ?? null,
    education: item.degreeName || '',
    experience: item.workAge || '',
    responsibilities: desc,
    hard_skills: hardSkillsStr,
    source_platform: 'gxrc.com',
    is_synthetic: false,
    url_status: 'alive',
  };
}

async function syncGxrc(limit: number, dryRun: boolean, supabase: ReturnType<typeof getSupabaseAdmin>, result: JdSyncResult): Promise<void> {
  console.log('开始同步广西人才网 (gxrc.com via API)...');
  const pageSize = Math.min(limit, 100);
  const maxPages = Math.ceil(limit / pageSize) + 1;
  let fetched = 0;

  for (let page = 1; page <= maxPages && fetched < limit; page++) {
    const items = await fetchGxrcViaApi(page, pageSize);
    console.log(`  GXRC API 第${page}页: ${items.length} 条`);
    if (items.length === 0) break;

    for (const item of items) {
      if (fetched >= limit) break;
      const job = mapGxrcApiItem(item);
      if (!job.job_title) {
        result.errors.push({ url: String(item.positionGuid || ''), reason: '无岗位名' });
        continue;
      }
      fetched++;
      result.fetched++;
      if (dryRun) { result.skipped++; continue; }

      try {
        const url = job.source_url as string;
        const { data: existing } = await supabase
          .from('job_descriptions')
          .select('id')
          .eq('source_url', url)
          .limit(1)
          .maybeSingle();

        if (existing) {
          const { error: ue } = await supabase
            .from('job_descriptions')
            .update({
              job_title: job.job_title,
              company: job.company,
              industry: job.industry,
              city: job.city,
              salary_range: job.salary_range,
              salary_min: job.salary_min,
              salary_max: job.salary_max,
              education: job.education,
              experience: job.experience,
              responsibilities: job.responsibilities,
              hard_skills: job.hard_skills,
              is_synthetic: false,
              url_status: 'alive',
            })
            .eq('id', existing.id);
          if (ue) result.errors.push({ url, reason: `更新失败: ${ue.message}` });
          else result.updated++;
        } else {
          const { error: ie } = await supabase
            .from('job_descriptions')
            .insert({ ...job, created_at: new Date().toISOString() });
          if (ie) result.errors.push({ url, reason: `插入失败: ${ie.message}` });
          else result.inserted++;
        }
      } catch (e) {
        result.errors.push({ url: String(job.source_url || ''), reason: (e as Error).message });
      }
    }
    // 避免请求过快
    await new Promise(r => setTimeout(r, 500));
  }
  console.log(`  GXRC 完成: ${result.inserted} 新增 / ${result.updated} 更新 / ${result.errors.length} 错误`);
}

// ========================
// 数据源: 实习僧 (shixiseng.com)
// 方式: HTML列表抓取 → 详情页解析
// ========================

async function fetchShixisengList(page = 1): Promise<{ url: string; title: string }[]> {
  const items: { url: string; title: string }[] = [];
  try {
    const html: string = await httpGet(`https://www.shixiseng.com/interns?page=${page}&type=intern`, true) as string;
    // 提取每个 intern-item 的链接和标题
    const itemRegex = /<div[^>]*data-intern-id="([^"]+)"[^>]*class="[^"]*intern-item[^"]*"[^>]*>[\s\S]*?<a[^>]*href="(https:\/\/www\.shixiseng\.com\/intern\/[^"]+)"[^>]*title="([^"]+)"/g;
    let match;
    while ((match = itemRegex.exec(html)) !== null) {
      items.push({ url: match[2]!, title: match[3]!.replace(/&#[^;]+;/g, '').trim() });
    }
    // fallback: 如果上面没匹配到，用更宽松的方式
    if (items.length === 0) {
      const simpleRegex = /<a[^>]*href="(https:\/\/www\.shixiseng\.com\/intern\/[^"]+)"[^>]*title="([^"]+)"[^>]*>/g;
      while ((match = simpleRegex.exec(html)) !== null) {
        items.push({ url: match[1]!, title: match[2]!.replace(/&#[^;]+;/g, '').trim() });
      }
    }
  } catch (e) {
    console.error(`实习僧列表页失败 (page ${page}):`, (e as Error).message);
  }
  return items;
}

async function parseShixisengDetail(url: string, title: string): Promise<Record<string, unknown>> {
  try {
    const html: string = await httpGet(url, true) as string;

    // 提取公司名
    let company = '';
    const cm = html.match(/<a[^>]*class="[^"]*com-name[^"]*"[^>]*>([^<]+)<\/a>/i)
      || html.match(/"companyName"\s*:\s*"([^"]+)"/)
      || html.match(/公司[：:]\s*([^<>\n]{2,30})/);
    if (cm) company = cm[1]!.trim();

    // 城市
    let city = '';
    const cityM = html.match(/"city"\s*:\s*"([^"]+)"/)
      || html.match(/<span[^>]*class="[^"]*city[^"]*"[^>]*>([^<]+)<\/span>/);
    if (cityM) city = cityM[1]!.trim();

    // 薪资
    let salaryRange = '';
    const salM = html.match(/薪资[：:]\s*([^<>\n]{3,20})/)
      || html.match(/<span[^>]*class="[^"]*day[^"]*"[^>]*>([^<]+)<\/span>/);
    if (salM) {
      const raw = salM[1]!.trim();
      // 提取数字部分 (如 "100-150/天" → "100-150")
      const numMatch = raw.match(/(\d+[\s-~]\d+)/);
      if (numMatch) salaryRange = numMatch[1]!;
    }

    // 行业
    let industry = '';
    const indM = html.match(/行业[：:]\s*([^<>\n]{2,15})/);
    if (indM) industry = indM[1]!.trim();

    // 学历
    let education = '';
    const eduM = html.match(/学历[：:]\s*([^<>\n]{2,10})/);
    if (eduM) education = eduM[1]!.trim();

    // 职位描述
    let responsibilities = '';
    const descM = html.match(/职位描述[：:]*\s*([\s\S]{50,2000}?)(?:<\/div>|<\/p>|<br\s*\/?>|<div)/i)
      || html.match(/岗位职责[：:]*\s*([\s\S]{50,2000}?)(?:<\/div>|<\/p>|<br\s*\/?>|<div)/i);
    if (descM) responsibilities = stripHtml(descM[1]!).substring(0, 2000).trim();

    // 从title截取纯岗位名(去除公司后缀)
    let jobTitle = title;
    if (company && title.includes(company)) {
      jobTitle = title.replace(company, '').replace(/[_-]\s*$/, '').trim();
    }

    const bodyText = stripHtml(html);
    const skillKeywords = [
      'Python','Java','JavaScript','TypeScript','React','Vue','Node.js','SQL','MySQL',
      'PostgreSQL','MongoDB','Redis','Docker','Kubernetes','Linux','Git','AWS','Azure',
      'AI','机器学习','数据分析','PHP','Go','Rust','C++','C#','Spring','Django','Flask',
      'HTML','CSS','Excel','项目管理','沟通','团队','领导力','英语',
    ];
    const foundSkills = skillKeywords.filter(k => bodyText.toLowerCase().includes(k.toLowerCase()));
    const hardSkillsStr = foundSkills.length > 0 ? foundSkills.join(',') : '';

    const { salaryMin, salaryMax } = parseSalary(salaryRange);

    return {
      source_url: url,
      job_title: jobTitle || title,
      company: company || '',
      industry: industry || '',
      city: city || '',
      salary_range: salaryRange,
      salary_min: salaryMin,
      salary_max: salaryMax,
      education: education || '',
      experience: '',
      responsibilities: responsibilities || '',
      hard_skills: hardSkillsStr,
      source_platform: 'shixiseng.com',
      is_synthetic: false,
      url_status: 'alive',
    };
  } catch (e) {
    console.error(`实习僧详情解析失败 (${url}):`, (e as Error).message);
    return { source_url: url, _error: (e as Error).message };
  }
}

async function syncShixiseng(limit: number, dryRun: boolean, supabase: ReturnType<typeof getSupabaseAdmin>, result: JdSyncResult): Promise<void> {
  console.log('开始同步实习僧 (shixiseng.com)...');
  const allItems: { url: string; title: string }[] = [];
  let page = 1;
  const maxPages = Math.ceil(limit / 20) + 1;
  while (allItems.length < limit && page <= maxPages) {
    const items = await fetchShixisengList(page);
    console.log(`  实习僧列表页 ${page}: ${items.length} 条`);
    allItems.push(...items);
    if (items.length === 0) break;
    page++;
    await sleep(1000);
  }

  const unique = new Map<string, { url: string; title: string }>();
  for (const item of allItems) {
    if (!unique.has(item.url)) unique.set(item.url, item);
  }
  const items = [...unique.values()].slice(0, limit);
  if (items.length === 0) { console.log('  实习僧: 未获取到数据'); return; }
  console.log(`  实习僧: ${items.length} 个详情页，开始解析...`);

  for (let i = 0; i < items.length; i++) {
    const { url, title } = items[i]!;
    const job = await parseShixisengDetail(url, title);
    if (job._error || !job.job_title) {
      result.errors.push({ url, reason: String(job._error || '无岗位名') });
      continue;
    }
    result.fetched++;
    if (dryRun) { result.skipped++; continue; }

    try {
      const { data: existing } = await supabase
        .from('job_descriptions')
        .select('id')
        .eq('source_url', url)
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error: ue } = await supabase
          .from('job_descriptions')
          .update({
            job_title: job.job_title,
            company: job.company,
            industry: job.industry,
            city: job.city,
            salary_range: job.salary_range,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            education: job.education,
            responsibilities: job.responsibilities,
            hard_skills: job.hard_skills,
            is_synthetic: false,
            url_status: 'alive',
          })
          .eq('id', existing.id);
        if (ue) result.errors.push({ url, reason: `更新失败: ${ue.message}` });
        else result.updated++;
      } else {
        const { error: ie } = await supabase
          .from('job_descriptions')
          .insert({ ...job, created_at: new Date().toISOString() });
        if (ie) result.errors.push({ url, reason: `插入失败: ${ie.message}` });
        else result.inserted++;
      }
    } catch (e) {
      result.errors.push({ url, reason: (e as Error).message });
    }
    await sleep(300);
  }
  console.log(`  实习僧 完成: ${result.inserted} 新增 / ${result.updated} 更新 / ${result.errors.length} 错误`);
}

// ========================
// 主入口
// ========================

export async function syncOfficialJobs(opts: JdSyncOptions = {}): Promise<JdSyncResult> {
  const limit = opts.limit ?? 100;
  const dryRun = opts.dryRun ?? true;
  const source = opts.source ?? 'gxrc';
  const supabase = getSupabaseAdmin();

  const result: JdSyncResult = { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };

  if (source === 'gxrc' || source === 'all') {
    await syncGxrc(limit, dryRun, supabase, result);
  }
  if (source === 'shixiseng' || source === 'all') {
    await syncShixiseng(limit, dryRun, supabase, result);
  }

  console.log(`同步完成: 采集 ${result.fetched} | 新增 ${result.inserted} | 更新 ${result.updated} | 跳过 ${result.skipped} | 错误 ${result.errors.length}`);
  return result;
}
// 为通过 --downlevelIteration 检查的兼容写法
// (项目 tsconfig 已配置目标 es2017，不影响实际构建)
