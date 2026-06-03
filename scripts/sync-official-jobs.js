/**
 * 官方JD同步脚本
 * 功能：从真实招聘网站同步JD数据到数据库
 * 数据源：广西人才网 gxrc.com（主）+ 国家24365平台（备）
 *
 * 使用方式：
 *   node scripts/sync-official-jobs.js --dry-run --limit 5
 *   node scripts/sync-official-jobs.js --apply --limit 100
 *   node scripts/sync-official-jobs.js --apply --source gxrc --limit 50
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('请设置环境变量 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run') || !args.includes('--apply');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : 100;
const sourceArg = args.find(a => a.startsWith('--source='));
const sourceFilter = sourceArg ? sourceArg.split('=')[1] : null;

const TIMEOUT_MS = 15000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(url, parseAsText = false) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    fetch(url, { signal: controller.signal })
      .then(res => {
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return parseAsText ? res.text() : res.json();
      })
      .then(resolve)
      .catch(err => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function stripHtml(text) {
  return text.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
}

function parseSalary(text) {
  if (!text) return { salaryMin: null, salaryMax: null, salaryRange: null };
  const t = text.replace(/,/g, '').trim();
  const rangeMatch = t.match(/(\d+)\s*[-~至到]\s*(\d+)/);
  if (rangeMatch) {
    return { salaryMin: parseInt(rangeMatch[1]), salaryMax: parseInt(rangeMatch[2]), salaryRange: t };
  }
  const singleMatch = t.match(/(\d+)/);
  if (singleMatch) {
    const v = parseInt(singleMatch[1]);
    return { salaryMin: Math.floor(v * 0.8), salaryMax: Math.floor(v * 1.2), salaryRange: t };
  }
  return { salaryMin: null, salaryMax: null, salaryRange: t || null };
}

/**
 * 从 GXRC 列表页抓取岗位详情 URL
 * 列表页格式：<a href="/JobDetail/xxx">...</a>
 */
async function fetchGxrcListUrls(pageNum = 1) {
  const urls = [];
  try {
    const html = await httpGet(`https://www.gxrc.com/jobSearch/result?page=${pageNum}`, true);
    const linkPattern = /<a[^>]*href="(\/JobDetail\/[^"]+)"[^>]*>/gi;
    let match;
    while ((match = linkPattern.exec(html)) !== null) {
      const url = 'https://www.gxrc.com' + match[1];
      if (!urls.includes(url)) urls.push(url);
    }
  } catch (e) {
    console.error(`获取 GXRC 列表页失败 (page ${pageNum}):`, e.message);
  }
  return urls;
}

/**
 * 从 GXRC 详情页解析 JD 数据
 * 用正则从 HTML 中提取结构化信息
 */
async function parseGxrcDetail(url) {
  try {
    const html = await httpGet(url, true);

    const getMeta = (name) => {
      const p = new RegExp(`<meta[^>]*name=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i');
      const m = html.match(p);
      return m ? m[1] : '';
    };
    const getOg = (prop) => {
      const p = new RegExp(`<meta[^>]*property=["']${prop}["'][^>]*content=["']([^"']+)["']`, 'i');
      const m = html.match(p);
      return m ? m[1] : '';
    };

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = titleMatch ? stripHtml(titleMatch[1]) : '';
    const desc = getOg('og:description') || getMeta('description');

    let jobTitle = rawTitle.replace(/-广西人才网.*$/i, '').replace(/_/g, ' ').trim();
    let company = '';
    if (jobTitle.includes('_')) {
      const parts = jobTitle.split('_');
      company = parts[parts.length - 1].trim();
      jobTitle = parts.slice(0, -1).join('_').trim();
    }
    if (!company) {
      const cm = html.match(/<span[^>]*class="[^"]*com-name[^"]*"[^>]*>([^<]+)<\/span>/i)
        || html.match(/公司名[：:]\s*([^<>\n]{2,30})/)
        || html.match(/companyName["']?\s*[:=]\s*["']([^"']+)["']/i);
      if (cm) company = cm[1].trim();
    }

    const cityMatch = desc.match(/(?:地点|工作地点|地区)[：:]\s*([^,，\s]{2,6}(?:市|县|区))/)
      || html.match(/(?:地点|工作地点)[：:]\s*([^<>\n]{2,10})/);
    const city = cityMatch ? cityMatch[1].trim() : '';

    const salaryPatterns = [
      /薪资[：:]\s*([^<>\n]{3,20})/,
      /salary["']?\s*[:=]\s*["']([^"']+)["']/i,
      /(?:月薪|薪资范围)[：:]\s*([^<>\n]{3,20})/
    ];
    let salaryRange = null;
    for (const p of salaryPatterns) {
      const m = html.match(p);
      if (m) { salaryRange = m[1].trim(); break; }
    }

    const industryMatch = desc.match(/(?:行业|所属行业)[：:]\s*([^,，\s]{2,10})/)
      || html.match(/industry["']?\s*[:=]\s*["']([^"']+)["']/i);
    const industry = industryMatch ? industryMatch[1].trim() : '';

    const expMatch = desc.match(/(?:经验|工作经验)[：:]\s*([^,，\s]{1,10})/);
    const experience = expMatch ? expMatch[1].trim() : '';

    const eduMatch = desc.match(/(?:学历|学历要求)[：:]\s*([^,，\s]{1,10})/);
    const education = eduMatch ? eduMatch[1].trim() : '';

    const respMatch = html.match(/(?:岗位职责|工作职责|职位描述|任职要求)[：:]*\s*([\s\S]{50,2000}?)(?:<\/div>|<\/p>|<\/section>|<hr|<\/dd>)/i);
    let responsibilities = respMatch ? stripHtml(respMatch[1]).substring(0, 2000).trim() : '';

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
      responsibilities: responsibilities || desc.substring(0, 1000) || '',
      hard_skills: hardSkillsStr,
      source_platform: 'gxrc',
      is_synthetic: false,
      url_status: 'alive',
    };
  } catch (e) {
    console.error(`解析 GXRC 详情失败 (${url}):`, e.message);
    return { source_url: url, _error: e.message };
  }
}

/**
 * GXRC 主采集流程
 */
async function syncFromGxrc(limitPerRun) {
  console.log('\n========== 开始同步广西人才网 (gxrc.com) ==========');

  const allUrls = [];
  let page = 1;
  while (allUrls.length < limitPerRun && page <= 5) {
    const pageUrls = await fetchGxrcListUrls(page);
    console.log(`列表页 ${page}: 获取到 ${pageUrls.length} 个 URL`);
    allUrls.push(...pageUrls);
    if (pageUrls.length === 0) break;
    page++;
    await sleep(500);
  }

  const urls = allUrls.slice(0, limitPerRun);
  if (urls.length === 0) {
    console.log('未获取到任何岗位 URL');
    return { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };
  }

  console.log(`共获取 ${urls.length} 个唯一 URL，开始解析详情...`);

  const results = { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };
  const insertJobs = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`[${i + 1}/${urls.length}] 解析: ${url}`);
    const job = await parseGxrcDetail(url);

    if (job._error) {
      results.errors.push({ url, reason: job._error });
      continue;
    }
    if (!job.job_title) {
      results.errors.push({ url, reason: '无法解析岗位名' });
      continue;
    }

    results.fetched++;
    insertJobs.push(job);
    await sleep(300);
  }

  if (insertJobs.length === 0) {
    console.log('没有可落库的岗位数据');
    return results;
  }

  console.log(`\n=== 落库概要 ===`);
  console.log(`采集成功: ${results.fetched} 条`);
  console.log(`失败: ${results.errors.length} 条`);

  if (isDryRun) {
    console.log('\n⚠️  DRY RUN 模式，跳过数据库写入');
    console.log('示例数据（前3条）:');
    for (let i = 0; i < Math.min(3, insertJobs.length); i++) {
      const j = insertJobs[i];
      console.log(`  ${i + 1}. ${j.job_title} @ ${j.company || '(未知)'} | ${j.city} | ${j.salary_range || '(面议)'}`);
    }
    return results;
  }

  console.log('\n=== 开始写入数据库 ===');
  for (const job of insertJobs) {
    try {
      const checkResp = await fetch(
        `${SUPABASE_URL}/rest/v1/job_descriptions?select=id&source_url=eq.${encodeURIComponent(job.source_url)}&limit=1`,
        {
          headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` },
        }
      );
      const existing = await checkResp.json();

      if (existing && existing.length > 0) {
        const resp = await fetch(
          `${SUPABASE_URL}/rest/v1/job_descriptions?id=eq.${existing[0].id}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
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
            }),
          }
        );
        if (resp.ok) { results.updated++; } else { results.errors.push({ url: job.source_url, reason: `更新失败: ${resp.status}` }); }
        console.log(`  ✅ 更新: ${job.job_title} @ ${job.company}`);
      } else {
        const resp = await fetch(
          `${SUPABASE_URL}/rest/v1/job_descriptions`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              ...job,
              created_at: new Date().toISOString(),
            }),
          }
        );
        if (resp.ok) { results.inserted++; } else { results.errors.push({ url: job.source_url, reason: `插入失败: ${resp.status}` }); }
        console.log(`  ✅ 插入: ${job.job_title} @ ${job.company}`);
      }
    } catch (e) {
      results.errors.push({ url: job.source_url, reason: e.message });
      console.error(`  ❌ 写入失败: ${job.source_url}:`, e.message);
    }
    await sleep(200);
  }

  console.log(`\n写入完成: 新增 ${results.inserted}, 更新 ${results.updated}`);
  return results;
}

/**
 * NCSS 国家平台（保留为备用数据源）
 */
async function syncFromNcss() {
  console.log('\n========== 尝试同步国家24365就业平台 ==========');

  try {
    const data = await httpGet('https://job.ncss.cn/api/job/open/list?pageNum=1&pageSize=20&jobType=1&education=3');

    if (!data || !data.data || !data.data.list) {
      console.log('国家24365平台无数据或接口不可达');
      return { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };
    }

    const jobs = data.data.list;
    console.log(`获取到 ${jobs.length} 条数据`);

    const results = { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };
    const insertJobs = [];

    for (const raw of jobs) {
      const jobTitle = raw.jobName || raw.job_name || '';
      const city = (raw.cityName || raw.city_name || '').replace(/[省市]$/, '');
      const industry = raw.industryName || raw.industry_name || '';
      const salaryStr = raw.salary || raw.salary_range || '';
      const { salaryMin, salaryMax } = parseSalary(salaryStr);
      const skills = (raw.skillRequire || raw.skills || '').split(/[,，、]/).slice(0, 5).join(',');
      const jdContent = (raw.jobDesc || raw.jd_content || raw.job_duty || '').substring(0, 2000);
      const sourceUrl = `https://job.ncss.cn/job/${raw.id || raw.jobId || ''}`;

      if (!jobTitle) continue;

      results.fetched++;
      insertJobs.push({
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
      });
    }

    if (!isDryRun && insertJobs.length > 0) {
      for (const job of insertJobs.slice(0, limit)) {
        try {
          const checkResp = await fetch(
            `${SUPABASE_URL}/rest/v1/job_descriptions?select=id&source_url=eq.${encodeURIComponent(job.source_url)}&limit=1`,
            { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
          );
          const existing = await checkResp.json();
          if (existing && existing.length > 0) {
            await fetch(`${SUPABASE_URL}/rest/v1/job_descriptions?id=eq.${existing[0].id}`, {
              method: 'PATCH',
              headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
              body: JSON.stringify({ ...job, is_synthetic: false, url_status: 'alive' }),
            });
            results.updated++;
          } else {
            await fetch(`${SUPABASE_URL}/rest/v1/job_descriptions`, {
              method: 'POST',
              headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
              body: JSON.stringify({ ...job, created_at: new Date().toISOString() }),
            });
            results.inserted++;
          }
        } catch (e) {
          results.errors.push({ url: job.source_url, reason: e.message });
        }
        await sleep(100);
      }
    }

    return results;
  } catch (error) {
    console.error('国家24365平台同步失败:', error.message);
    return { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [{ url: 'ncss', reason: error.message }] };
  }
}

async function main() {
  console.log('===========================================');
  console.log('  职途星 - 官方JD同步脚本');
  console.log('  执行时间:', new Date().toLocaleString('zh-CN'));
  console.log(`  模式: ${isDryRun ? '🔍 DRY RUN' : '✏️ APPLY'}`);
  console.log(`  限制: ${limit} 条`);
  if (sourceFilter) console.log(`  数据源: ${sourceFilter}`);
  console.log('===========================================');

  let gxrcResult = { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };
  let ncssResult = { fetched: 0, inserted: 0, updated: 0, skipped: 0, errors: [] };

  if (!sourceFilter || sourceFilter === 'gxrc') {
    gxrcResult = await syncFromGxrc(limit);
  }
  if (!sourceFilter || sourceFilter === 'ncss') {
    ncssResult = await syncFromNcss();
  }

  const totalFetched = gxrcResult.fetched + ncssResult.fetched;
  const totalInserted = gxrcResult.inserted + ncssResult.inserted;
  const totalUpdated = gxrcResult.updated + ncssResult.updated;
  const totalErrors = gxrcResult.errors.length + ncssResult.errors.length;

  console.log('\n========== 同步汇总 ==========');
  console.log(`GXRC:  采集 ${gxrcResult.fetched} | 新增 ${gxrcResult.inserted} | 更新 ${gxrcResult.updated} | 错误 ${gxrcResult.errors.length}`);
  console.log(`NCSS:  采集 ${ncssResult.fetched} | 新增 ${ncssResult.inserted} | 更新 ${ncssResult.updated} | 错误 ${ncssResult.errors.length}`);
  console.log(`总计:  采集 ${totalFetched} | 新增 ${totalInserted} | 更新 ${totalUpdated} | 错误 ${totalErrors}`);
  if (isDryRun) {
    console.log('\n⚠️  DRY RUN 模式，以上为预览数据，未实际写入');
    console.log('如需真实更新，请使用 --apply 参数');
  }
  console.log('==============================\n');
}

main().catch(console.error);
