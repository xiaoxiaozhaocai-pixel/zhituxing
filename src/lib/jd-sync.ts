/**
 * JD 同步核心库
 * 提取自 scripts/sync-official-jobs.js，供脚本和 cron route 共用
 */

import { getSupabaseAdmin } from '@/lib/supabase';

export interface JdSyncOptions {
  limit?: number;
  dryRun?: boolean;
  source?: 'gxrc' | 'ncss';
}

export interface JdSyncResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: { url: string; reason: string }[];
}

const TIMEOUT_MS = 15000;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function httpGet(url: string, parseAsText = false): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return parseAsText ? res.text() : res.json();
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

function parseSalary(text: string | null): { salaryMin: number | null; salaryMax: number | null; salaryRange: string | null } {
  if (!text) return { salaryMin: null, salaryMax: null, salaryRange: null };
  const t = text.replace(/,/g, '').trim();
  const rangeMatch = t.match(/(\d+)\s*[-~至到]\s*(\d+)/);
  if (rangeMatch) {
    return { salaryMin: parseInt(rangeMatch[1]!)!, salaryMax: parseInt(rangeMatch[2]!), salaryRange: t };
  }
  const singleMatch = t.match(/(\d+)/);
  if (singleMatch) {
    const v = parseInt(singleMatch[1]!)!;
    return { salaryMin: Math.floor(v * 0.8), salaryMax: Math.floor(v * 1.2), salaryRange: t };
  }
  return { salaryMin: null, salaryMax: null, salaryRange: t || null };
}

async function fetchGxrcListUrls(pageNum = 1): Promise<string[]> {
  const urls: string[] = [];
  try {
    const html: string = await httpGet(`https://www.gxrc.com/jobSearch/result?page=${pageNum}`, true);
    const linkPattern = /<a[^>]*href="(\/JobDetail\/[^"]+)"[^>]*>/gi;
    let match;
    while ((match = linkPattern.exec(html)) !== null) {
      const url = 'https://www.gxrc.com' + match[1];
      if (!urls.includes(url)) urls.push(url);
    }
  } catch (e) {
    console.error(`获取 GXRC 列表页失败 (page ${pageNum}):`, (e as Error).message);
  }
  return urls;
}

async function parseGxrcDetail(url: string): Promise<Record<string, unknown>> {
  try {
    const html: string = await httpGet(url, true);

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? stripHtml(titleMatch[1]!) : '';

    let jobTitle = rawTitle.replace(/-广西人才网.*$/i, '').replace(/_/g, ' ').trim();
    let company = '';
    if (jobTitle.includes('_')) {
      const parts = jobTitle.split('_');
      company = parts[parts.length - 1]!.trim();
      jobTitle = parts.slice(0, -1).join('_').trim();
    }
    if (!company) {
      const cm = html.match(/<span[^>]*class="[^"]*com-name[^"]*"[^>]*>([^<]+)<\/span>/i)
        || html.match(/公司名[：:]\s*([^<>\n]{2,30})/)
        || html.match(/companyName["']?\s*[:=]\s*["']([^"']+)["']/i);
      if (cm) company = cm[1]!.trim();
    }

    const cityMatch = html.match(/(?:地点|工作地点|地区)[：:]\s*([^,，\s]{2,6}(?:市|县|区))/)
      || html.match(/(?:地点|工作地点)[：:]\s*([^<>\n]{2,10})/);
    const city = cityMatch ? cityMatch[1]!.trim() : '';

    const salaryPatterns = [
      /薪资[：:]\s*([^<>\n]{3,20})/,
      /salary["']?\s*[:=]\s*["']([^"']+)["']/i,
      /(?:月薪|薪资范围)[：:]\s*([^<>\n]{3,20})/,
    ];
    let salaryRange: string | null = null;
    for (const p of salaryPatterns) {
      const m = html.match(p);
      if (m) { salaryRange = m[1]!.trim(); break; }
    }

    const industryMatch = html.match(/(?:行业|所属行业)[：:]\s*([^,，\s]{2,10})/);
    const industry = industryMatch ? industryMatch[1]!.trim() : '';

    const expMatch = html.match(/(?:经验|工作经验)[：:]\s*([^,，\s]{1,10})/);
    const experience = expMatch ? expMatch[1]!.trim() : '';

    const eduMatch = html.match(/(?:学历|学历要求)[：:]\s*([^,，\s]{1,10})/);
    const education = eduMatch ? eduMatch[1]!.trim() : '';

    const respMatch = html.match(/(?:岗位职责|工作职责|职位描述|任职要求)[：:]*\s*([\s\S]{50,2000}?)(?:<\/div>|<\/p>|<\/section>|<hr|<\/dd>)/i);
    let responsibilities = respMatch ? stripHtml(respMatch[1]!).substring(0!, 2000).trim() : '';

    const bodyText = stripHtml(html);
    const skillKeywords = ['Python', 'Java', 'JavaScript', 'TypeScript', 'React', 'Vue',
      'Node.js', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Docker', 'Kubernetes',
      'Linux', 'Git', 'AWS', 'Azure', 'AI', '机器学习', '数据分析', 'PHP', 'Go', 'Rust',
      'C++', 'C#', '.NET', 'Spring', 'Django', 'Flask', 'HTML', 'CSS', 'Excel', 'Word',
      '项目管理', '沟通', '团队', '领导力', '英语', '日语'];
    const foundSkills = skillKeywords.filter(k =>
      bodyText.toLowerCase().includes(k.toLowerCase())
    );
    const hardSkillsStr = foundSkills.length > 0 ? foundSkills.join(',') : '';

    const { salaryMin, salaryMax } = parseSalary(salaryRange);

    return {
      source_url: url,
      job_title: jobTitle || rawTitle.substring(0, 100) || '',
      company: company || '',
      industry: industry || '',
      city: city || '',
      salary_range: salaryRange || '',
      salary_min: salaryMin,
      salary_max: salaryMax,
      education: education || '',
      experience: experience || '',
      responsibilities: responsibilities || '',
      hard_skills: hardSkillsStr,
      source_platform: 'gxrc',
      is_synthetic: false,
      url_status: 'alive',
    };
  } catch (e) {
    console.error(`解析 GXRC 详情失败 (${url}):`, (e as Error).message);
    return { source_url: url, _error: (e as Error).message };
  }
}

export async function syncOfficialJobs(opts: JdSyncOptions = {}): Promise<JdSyncResult> {
  const limit = opts.limit ?? 100;
  const dryRun = opts.dryRun ?? true;
  const source = opts.source ?? 'gxrc';
  const supabase = getSupabaseAdmin();

  const result: JdSyncResult = { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };

  if (source === 'gxrc') {
    console.log('开始同步广西人才网 (gxrc.com)...');

    const allUrls: string[] = [];
    let page = 1;
    while (allUrls.length < limit && page <= 5) {
      const pageUrls = await fetchGxrcListUrls(page);
      console.log(`列表页 ${page}: 获取到 ${pageUrls.length} 个 URL`);
      allUrls.push(...pageUrls);
      if (pageUrls.length === 0) break;
      page++;
      await sleep(500);
    }

    const urls = allUrls.slice(0, limit);
    if (urls.length === 0) {
      console.log('未获取到任何岗位 URL');
      return result;
    }

    console.log(`共获取 ${urls.length} 个唯一 URL，开始解析详情...`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[${i + 1}/${urls.length}] 解析: ${url}`);
      const job = await parseGxrcDetail(url!)!;

      if (job._error) {
        result.errors.push({ url: url!, reason: String(job._error) });
        continue;
      }
      if (!job.job_title) {
        result.errors.push({ url: url!, reason: '无法解析岗位名' });
        continue;
      }

      result.fetched++;

      if (dryRun) {
        result.skipped++;
        continue;
      }

      try {
        const { data: existing } = await supabase
          .from('job_descriptions')
          .select('id')
          .eq('source_url', url)
          .limit(1)
          .maybeSingle();

        if (existing) {
          const { error: updateError } = await supabase
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

          if (updateError) {
            result.errors.push({ url: url!, reason: `更新失败: ${updateError.message}` });
          } else {
            result.updated++;
            console.log(`  ✅ 更新: ${job.job_title} @ ${job.company}`);
          }
        } else {
          const { error: insertError } = await supabase
            .from('job_descriptions')
            .insert({
              ...job,
              created_at: new Date().toISOString(),
            });

          if (insertError) {
            result.errors.push({ url: url!, reason: `插入失败: ${insertError.message}` });
          } else {
            result.inserted++;
            console.log(`  ✅ 插入: ${job.job_title} @ ${job.company}`);
          }
        }
      } catch (e) {
        result.errors.push({ url: url!, reason: (e as Error).message });
        console.error(`  ❌ 写入失败: ${url}:`, (e as Error).message);
      }
      await sleep(200);
    }
  }

  if (source === 'ncss') {
    console.log('开始同步国家24365平台...');
    try {
      const data = await httpGet('https://job.ncss.cn/api/job/open/list?pageNum=1&pageSize=20&jobType=1&education=3');

      if (!data || !data.data || !data.data.list) {
        console.log('国家24365平台无数据或接口不可达');
        return result;
      }

      const jobs = data.data.list;
      console.log(`获取到 ${jobs.length} 条数据`);

      for (const raw of jobs.slice(0, limit)) {
        const jobTitle = raw.jobName || raw.job_name || '';
        if (!jobTitle) continue;

        const city = (raw.cityName || raw.city_name || '').replace(/[省市]$/, '');
        const industry = raw.industryName || raw.industry_name || '';
        const salaryStr = raw.salary || raw.salary_range || '';
        const { salaryMin, salaryMax } = parseSalary(salaryStr);
        const skills = (raw.skillRequire || raw.skills || '').split(/[,，、]/).slice(0, 5).join(',');
        const jdContent = (raw.jobDesc || raw.jd_content || raw.job_duty || '').substring(0, 2000);
        const sourceUrl = `https://job.ncss.cn/job/${raw.id || raw.jobId || ''}`;

        result.fetched++;

        if (dryRun) {
          result.skipped++;
          continue;
        }

        const jobData = {
          source_url: sourceUrl,
          job_title: jobTitle,
          company: raw.companyName || raw.company_name || '',
          industry: industry || '',
          city: city || '',
          salary_range: salaryStr,
          salary_min: salaryMin,
          salary_max: salaryMax,
          education: '本科',
          experience: '',
          responsibilities: jdContent,
          hard_skills: skills,
          source_platform: 'ncss',
          is_synthetic: false,
          url_status: 'alive',
        };

        try {
          const { data: existing } = await supabase
            .from('job_descriptions')
            .select('id')
            .eq('source_url', sourceUrl)
            .limit(1)
            .maybeSingle();

          if (existing) {
            await supabase.from('job_descriptions').update(jobData).eq('id', existing.id);
            result.updated++;
          } else {
            await supabase.from('job_descriptions').insert({ ...jobData, created_at: new Date().toISOString() });
            result.inserted++;
          }
        } catch (e) {
          result.errors.push({ url: sourceUrl, reason: (e as Error).message });
        }
        await sleep(100);
      }
    } catch (e) {
      console.error('国家24365平台同步失败:', (e as Error).message);
      result.errors.push({ url: 'ncss', reason: (e as Error).message });
    }
  }

  console.log(`同步完成: 采集 ${result.fetched} | 新增 ${result.inserted} | 更新 ${result.updated} | 跳过 ${result.skipped} | 错误 ${result.errors.length}`);
  return result;
}
