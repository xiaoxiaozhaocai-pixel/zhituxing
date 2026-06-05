/**
 * 官方公开招聘API全量接入与JD自动同步服务
 * 数据来源：支持6大官方公开招聘API，每日自动增量更新
 * 
 * API列表：
 * 1. 国家24365就业平台（教育部官方）
 * 2. 中国公共招聘网（人社部官方）
 * 3. 广西人才网上
 * 4. 国聘网（央企/国企岗位）
 * 5. 中国研究生招聘网
 * 6. 广西高校毕业生就业网
 */

import { execSql } from '@/lib/exec-sql';

// 标准请求头
const REQUEST_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
  'Origin': 'https://zhitux.com',
  'Referer': 'https://zhitux.com'
};

// API配置接口
interface ApiConfig {
  id: string;
  name: string;
  url: string;
  params: (page: number) => Record<string, string | number>;
  source: string;
  enabled: boolean;
  pages: number;  // 每次同步拉取页数
}

// API配置 - 6大官方平台
const API_CONFIG: ApiConfig[] = [
  {
    id: 'ncss',
    name: '国家24365就业平台',
    url: 'https://job.ncss.cn/api/job/open/list',
    params: (page: number) => ({ pageNum: page, pageSize: 100, jobType: 1, education: 3 }),
    source: '国家24365就业平台',
    enabled: true,
    pages: 10
  },
  {
    id: 'mohrss',
    name: '中国公共招聘网',
    url: 'https://job.mohrss.gov.cn/api/job/search',
    params: (page: number) => ({ page: page, size: 100, jobType: '校招', education: '本科' }),
    source: '中国公共招聘网',
    enabled: true,
    pages: 10
  },
  {
    id: 'gxrc',
    name: '广西人才网上',
    url: 'https://www.gxrc.com/api/job/search',
    params: (page: number) => ({ page: page, size: 50, type: '校招', area: '广西' }),
    source: '广西人才网上',
    enabled: true,
    pages: 10
  },
  {
    id: 'iguopin',
    name: '国聘网',
    url: 'https://www.iguopin.com/api/job/list',
    params: (page: number) => ({ page: page, size: 100, jobType: '校招', education: '本科' }),
    source: '国聘网',
    enabled: true,
    pages: 10
  },
  {
    id: 'chinahr',
    name: '中国研究生招聘网',
    url: 'https://www.chinahr.com/api/job/search',
    params: (page: number) => ({ page: page, size: 100, type: '校招', education: '本科及以上' }),
    source: '中国研究生招聘网',
    enabled: true,
    pages: 10
  },
  {
    id: 'gxedu',
    name: '广西高校毕业生就业网',
    url: 'https://job.gxedu.gov.cn/api/job/list',
    params: (page: number) => ({ page: page, size: 50, type: '校招', area: '广西' }),
    source: '广西高校毕业生就业网',
    enabled: true,
    pages: 5
  }
];

// 同步结果类型
interface SyncResult {
  source_platform: string;
  total_fetched: number;
  success_count: number;
  fail_count: number;
  fail_reason: string | null;
  pages_completed: number;
  pages_total: number;
}

// 同步日志记录
interface SyncLogRecord {
  id?: number;
  sync_time?: string;
  source_platform: string;
  total_fetched: number;
  success_count: number;
  fail_count: number;
  fail_reason: string | null;
}

// 岗位记录格式
interface JobRecord {
  job_name: string;
  city: string;
  industry: string;
  company_type: string;
  salary_min: number | null;
  salary_max: number | null;
  skills: string;
  jd_content: string;
  source: string;
}

/**
 * 标准化公司类型
 */
function normalizeCompanyType(type: string): string {
  if (!type) return '民企';
  const t = type.toLowerCase();
  if (t.includes('国') || t.includes('央企') || t.includes('央企')) return '国企';
  if (t.includes('上市')) return '上市公司';
  if (t.includes('外') || t.includes('外资') || t.includes('独资')) return '外企';
  if (t.includes('事业')) return '事业单位';
  if (t.includes('合资')) return '合资企业';
  return '民企';
}

/**
 * 标准化城市名称
 */
function normalizeCity(city: string): string {
  if (!city) return '';
  return city.replace(/省|市|自治区|壮族|回族|维吾尔|壮族自治区|回族自治区|维吾尔自治区/g, '').trim().split(',')[0];
}

/**
 * 解析薪资范围
 */
function parseSalary(salaryStr: string | null): { min: number | null; max: number | null } {
  if (!salaryStr) return { min: null, max: null };
  
  const str = salaryStr.toLowerCase();
  let min: number | null = null;
  let max: number | null = null;
  
  // 匹配格式：8000-12000 或 8k-12k 或 8000~12000
  const match = str.match(/(\d+)[k万]?\s*[-~]\s*(\d+)[k万]?/);
  if (match) {
    let minVal = parseInt(match[1]);
    let maxVal = parseInt(match[2]);
    
    // 如果是k单位，转换为元
    if (str.includes('k')) {
      minVal *= 1000;
      maxVal *= 1000;
    }
    // 如果薪资以"万"为单位
    else if (str.includes('万')) {
      minVal *= 10000;
      maxVal *= 10000;
    }
    // 如果薪资小于1000，按月薪处理
    else if (minVal < 1000) {
      minVal *= 1000;
      maxVal *= 1000;
    }
    
    min = Math.floor(minVal);
    max = Math.floor(maxVal);
  }
  
  return { min, max };
}

/**
 * 检查岗位是否已存在（去重 - 三重判断）
 */
async function isJobExists(jobName: string, companyName: string, city: string): Promise<boolean> {
  try {
    const sql = `
      SELECT COUNT(*) as cnt FROM jobs 
      WHERE job_name = '${jobName.replace(/'/g, "''")}' 
      AND company_type = '${companyName.replace(/'/g, "''")}' 
      AND city = '${city.replace(/'/g, "''")}'
    `;
    const result = await execSql(sql) as Array<{ cnt: number }>;
    return (result[0]?.cnt || 0) > 0;
  } catch {
    return false;
  }
}

/**
 * 插入岗位数据
 */
async function insertJob(job: JobRecord): Promise<boolean> {
  try {
    const sql = `
      INSERT INTO jobs (
        job_name, industry, city, company_type,
        salary_min, salary_max, skills, jd_content,
        is_fresh_friendly, created_at, source
      ) VALUES (
        '${job.job_name.replace(/'/g, "''")}',
        '${job.industry.replace(/'/g, "''")}',
        '${job.city.replace(/'/g, "''")}',
        '${job.company_type.replace(/'/g, "''")}',
        ${job.salary_min ?? 'NULL'},
        ${job.salary_max ?? 'NULL'},
        '${job.skills.replace(/'/g, "''")}',
        '${job.jd_content.replace(/'/g, "''")}',
        1,
        NOW(),
        '${job.source.replace(/'/g, "''")}'
      )
    `;
    await execSql(sql);
    return true;
  } catch (error) {
    console.error('插入岗位失败:', error);
    return false;
  }
}

/**
 * 记录同步日志
 */
async function saveSyncLog(result: SyncResult): Promise<void> {
  try {
    const failReason = result.fail_reason ? `'${result.fail_reason.replace(/'/g, "''")}'` : 'NULL';
    const sql = `
      INSERT INTO jd_sync_logs (
        sync_time, source_platform, total_fetched, success_count, fail_count, fail_reason
      ) VALUES (
        NOW(),
        '${result.source_platform.replace(/'/g, "''")}',
        ${result.total_fetched},
        ${result.success_count},
        ${result.fail_count},
        ${failReason}
      )
    `;
    await execSql(sql);
  } catch (error) {
    console.error('保存同步日志失败:', error);
  }
}

/**
 * 从指定API拉取数据
 */
async function fetchFromApi(config: ApiConfig): Promise<SyncResult> {
  const result: SyncResult = {
    source_platform: config.name,
    total_fetched: 0,
    success_count: 0,
    fail_count: 0,
    fail_reason: null,
    pages_completed: 0,
    pages_total: config.pages
  };

  console.log(`[${config.name}] 开始同步，预计 ${config.pages} 页...`);

  for (let page = 1; page <= config.pages; page++) {
    try {
      const params = config.params(page);
      const queryString = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      
      const url = `${config.url}${config.url.includes('?') ? '&' : '?'}${queryString}`;
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: REQUEST_HEADERS,
        signal: controller.signal
      });
      
      clearTimeout(timeout);

      if (!response.ok) {
        console.log(`[${config.name}] 第${page}页请求失败: HTTP ${response.status}`);
        result.fail_count += 10;
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();
      
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(text) as Record<string, unknown>;
      } catch {
        console.log(`[${config.name}] 第${page}页 JSON解析失败`);
        result.fail_count += 10;
        continue;
      }

      // 解析API返回的数据
      const items = extractJobItems(data, config.id);
      
      if (!items || items.length === 0) {
        console.log(`[${config.name}] 第${page}页无数据，停止分页`);
        break;
      }

      result.total_fetched += items.length;

      for (const rawItem of items) {
        const item = rawItem as unknown as Record<string, string | undefined | null>;
        // 过滤极端无效数据
        if (!item.job_name || (!item.job_desc && !item.salary)) {
          result.fail_count++;
          continue;
        }

        // 三重去重检查
        const exists = await isJobExists(
          (item.job_name || '') + (config.id === 'ncss' ? '(校招)' : ''),
          item.company_name || '未知公司',
          normalizeCity(item.city || item.work_place || '')
        );

        if (exists) {
          result.fail_count++;
          continue;
        }

        // 解析薪资
        const salary = parseSalary(item.salary || item.salary_range || item.salary_min || '');

        // 提取技能标签
        const skills = extractSkills(item.skills || item.skill_require || item.require || '', 5);

        const job: JobRecord = {
          job_name: (item.job_name || item.position_name || '未知岗位') + (config.id === 'ncss' ? '(校招)' : ''),
          city: normalizeCity(item.city || item.work_place || item.workPlace || '未知城市'),
          industry: item.industry || item.industry_name || item.industryName || '互联网/IT',
          company_type: normalizeCompanyType(item.company_type || item.companyType || item.company_type || ''),
          salary_min: salary.min,
          salary_max: salary.max,
          skills: skills,
          jd_content: (item.job_desc || item.jd_content || item.description || item.job_content || '').substring(0, 500),
          source: config.source
        };

        const inserted = await insertJob(job);
        if (inserted) {
          result.success_count++;
        } else {
          result.fail_count++;
        }
      }

      result.pages_completed++;
      console.log(`[${config.name}] 第${page}/${config.pages}页完成，成功:${result.success_count}，失败:${result.fail_count}`);

    } catch (error: unknown) {
      const _error_ = error as Error;
      console.log(`[${config.name}] 第${page}页请求异常: ${_error_.message}`);
      result.fail_count += 10;
    }
  }

  if (result.total_fetched === 0 && result.fail_count > 0) {
    result.fail_reason = `API请求失败或无数据返回`;
  }

  return result;
}

/**
 * 从API响应中提取岗位数据（适配不同API格式）
 */
// API响应数据递归类型（用于extractJobItems处理嵌套JSON）
interface ApiResponseData {
  [key: string]: unknown;
  data?: ApiResponseData | unknown[];
  result?: ApiResponseData | unknown[];
  list?: unknown[];
  jobs?: unknown[];
}

function extractJobItems(data: Record<string, unknown>, apiId: string): Record<string, unknown>[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  if (!d) return [];

  const getArr = (v: unknown): Record<string, unknown>[] =>
    (Array.isArray(v) ? v : []) as Record<string, unknown>[];

  switch (apiId) {
    case 'ncss':
      if (d.data?.list) return getArr(d.data.list);
      if (d.data?.jobs) return getArr(d.data.jobs);
      if (d.data) return getArr(d.data);
      return [];

    case 'mohrss':
      if (d.data?.list) return getArr(d.data.list);
      if (d.data?.jobs) return getArr(d.data.jobs);
      if (d.result?.data) return getArr(d.result.data);
      if (d.data) return getArr(d.data);
      return [];

    case 'gxrc':
      if (d.data?.list) return getArr(d.data.list);
      if (d.data?.jobs) return getArr(d.data.jobs);
      if (d.result) return getArr(d.result);
      if (d.data) return getArr(d.data);
      return [];

    case 'iguopin':
      if (d.data?.list) return getArr(d.data.list);
      if (d.data?.jobs) return getArr(d.data.jobs);
      if (d.result?.data) return getArr(d.result.data);
      if (d.data) return getArr(d.data);
      return [];

    case 'chinahr':
      if (d.data?.list) return getArr(d.data.list);
      if (d.data?.jobs) return getArr(d.data.jobs);
      if (d.result) return getArr(d.result);
      if (d.data) return getArr(d.data);
      return [];

    case 'gxedu':
      if (d.data?.list) return getArr(d.data.list);
      if (d.data) return getArr(d.data);
      return [];

    default:
      if (d.data) return getArr(d.data);
      if (d.result) return getArr(d.result);
      return [];
  }
}

/**
 * 提取技能标签
 */
function extractSkills(skillsText: string, maxCount: number): string {
  if (!skillsText) return '';
  
  // 常见技能关键词
  const commonSkills = [
    'Java', 'Python', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby',
    'React', 'Vue', 'Angular', 'Node.js', 'Spring', 'Django', 'Flask', 'Express',
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Kafka',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Jenkins', 'Git', 'GitLab', 'GitHub',
    'HTML', 'CSS', 'Sass', 'Less', 'Webpack', 'Vite',
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'NLP',
    'Agile', 'Scrum', 'DevOps', 'CI/CD', 'Linux', 'Nginx',
    '产品设计', '项目管理', '数据分析', 'SQL', 'Excel', 'PowerBI', 'Tableau',
    'UI设计', 'UX设计', 'Figma', 'Sketch', 'Photoshop', 'Illustrator',
    'PPT', 'Word', '文案写作', '内容运营', '用户运营', '活动策划',
    '沟通协调', '团队合作', '问题解决', '学习能力', '逻辑思维'
  ];

  const found: string[] = [];
  const textLower = skillsText.toLowerCase();

  for (const skill of commonSkills) {
    if (found.length >= maxCount) break;
    if (textLower.includes(skill.toLowerCase())) {
      found.push(skill);
    }
  }

  // 如果没有匹配到，返回原文前100字
  return found.length > 0 ? found.join(',') : skillsText.substring(0, 100);
}

/**
 * 从模拟数据生成岗位（演示用）
 */
async function fetchFromMockData(source: string): Promise<SyncResult> {
  const MOCK_JOBS = [
    { job_name: '前端开发工程师(校招)', city: '深圳', industry: '互联网/IT', company_type: '上市公司', salary_min: 15000, salary_max: 25000, skills: 'React,Vue,TypeScript', jd_content: '负责公司前端架构设计与开发，参与技术选型' },
    { job_name: '后端开发工程师(校招)', city: '杭州', industry: '互联网/IT', company_type: '上市公司', salary_min: 18000, salary_max: 30000, skills: 'Java,Spring Cloud,MySQL', jd_content: '负责核心业务系统后端开发与维护' },
    { job_name: '产品经理(校招)', city: '北京', industry: '互联网/IT', company_type: '上市公司', salary_min: 20000, salary_max: 35000, skills: '产品设计,数据分析,用户研究', jd_content: '负责产品规划与需求管理' },
    { job_name: '数据分析师(校招)', city: '上海', industry: '互联网/IT', company_type: '上市公司', salary_min: 15000, salary_max: 25000, skills: 'Python,SQL,Tableau', jd_content: '分析业务数据，提供决策支持' },
    { job_name: '算法工程师(校招)', city: '北京', industry: '人工智能', company_type: '上市公司', salary_min: 25000, salary_max: 45000, skills: 'Python,TensorFlow,机器学习', jd_content: '负责AI算法研发与落地' },
    { job_name: '测试工程师(校招)', city: '深圳', industry: '通信设备', company_type: '国企', salary_min: 12000, salary_max: 20000, skills: '自动化测试,Selenium,Python', jd_content: '负责产品质量保障' },
    { job_name: '运营专员(校招)', city: '北京', industry: '电商', company_type: '上市公司', salary_min: 10000, salary_max: 18000, skills: '活动策划,数据分析,用户运营', jd_content: '负责平台运营活动策划与执行' },
    { job_name: 'HR管培生(校招)', city: '上海', industry: '金融', company_type: '上市公司', salary_min: 12000, salary_max: 18000, skills: '人力资源,沟通协调', jd_content: '人力资源岗位轮岗培养' },
    { job_name: '机械工程师(校招)', city: '深圳', industry: '制造', company_type: '上市公司', salary_min: 10000, salary_max: 18000, skills: 'SolidWorks,AutoCAD,机械原理', jd_content: '负责产品机械结构设计' },
    { job_name: '医药代表(校招)', city: '上海', industry: '医疗健康', company_type: '上市公司', salary_min: 8000, salary_max: 15000, skills: '医药知识,沟通销售', jd_content: '负责药品推广与客户维护' }
  ];

  const result: SyncResult = {
    source_platform: source,
    total_fetched: MOCK_JOBS.length,
    success_count: 0,
    fail_count: 0,
    fail_reason: null,
    pages_completed: 1,
    pages_total: 1
  };

  for (const mockJob of MOCK_JOBS) {
    const exists = await isJobExists(mockJob.job_name, mockJob.company_type, mockJob.city);
    if (exists) {
      result.fail_count++;
      continue;
    }

    const inserted = await insertJob({
      ...mockJob,
      source: source
    });
    if (inserted) {
      result.success_count++;
    } else {
      result.fail_count++;
    }
  }

  return result;
}

/**
 * 主同步函数 - 执行全量同步
 */
export async function syncAllPlatforms(useMock: boolean = false): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  console.log('='.repeat(50));
  console.log('开始JD同步任务...');
  console.log('='.repeat(50));

  if (useMock) {
    // 使用模拟数据
    console.log('使用模拟数据演示...');
    const mockResult = await fetchFromMockData('模拟数据源');
    results.push(mockResult);
    await saveSyncLog(mockResult);
    console.log(`模拟数据: 成功导入 ${mockResult.success_count} 条`);
  } else {
    // 遍历所有启用的API
    for (const config of API_CONFIG) {
      if (!config.enabled) {
        console.log(`[${config.name}] 已禁用，跳过`);
        continue;
      }

      try {
        const result = await fetchFromApi(config);
        results.push(result);
        await saveSyncLog(result);
        
        console.log(`[${config.name}] 同步完成: 总计${result.total_fetched}条, 成功${result.success_count}条, 失败${result.fail_count}条`);
      } catch (error: unknown) {
        const _error_ = error as Error;
        console.error(`[${config.name}] 同步异常:`, _error_.message);
        const errorResult: SyncResult = {
          source_platform: config.name,
          total_fetched: 0,
          success_count: 0,
          fail_count: 0,
          fail_reason: _error_.message,
          pages_completed: 0,
          pages_total: config.pages
        };
        results.push(errorResult);
        await saveSyncLog(errorResult);
      }

      // API请求间隔，避免被限流
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // 汇总统计
  const totalFetched = results.reduce((sum, r) => sum + r.total_fetched, 0);
  const totalSuccess = results.reduce((sum, r) => sum + r.success_count, 0);
  const totalFail = results.reduce((sum, r) => sum + r.fail_count, 0);

  console.log('='.repeat(50));
  console.log(`JD同步任务完成！总计: ${totalFetched}条, 成功: ${totalSuccess}条, 失败: ${totalFail}条`);
  console.log('='.repeat(50));

  return results;
}

/**
 * 单平台同步
 */
export async function syncSinglePlatform(platformId: string): Promise<SyncResult> {
  const config = API_CONFIG.find(c => c.id === platformId);
  
  if (!config) {
    return {
      source_platform: platformId,
      total_fetched: 0,
      success_count: 0,
      fail_count: 0,
      fail_reason: `未找到平台配置: ${platformId}`,
      pages_completed: 0,
      pages_total: 0
    };
  }

  const result = await fetchFromApi(config);
  await saveSyncLog(result);
  
  return result;
}

/**
 * 获取同步日志
 */
export async function getSyncLogs(limit: number = 50, offset: number = 0): Promise<{ list: SyncLogRecord[]; total: number }> {
  try {
    const logs = await execSql(`
      SELECT id, sync_time, source_platform, total_fetched, success_count, fail_count, fail_reason 
      FROM jd_sync_logs 
      ORDER BY sync_time DESC 
      LIMIT ${limit} OFFSET ${offset}
    `) as SyncLogRecord[];

    const countResult = await execSql(`SELECT COUNT(*) as total FROM jd_sync_logs`) as Array<{ total: number }>;
    
    return {
      list: logs,
      total: countResult[0]?.total || 0
    };
  } catch {
    return { list: [], total: 0 };
  }
}

/**
 * 获取最后一次同步状态
 */
export async function getLastSyncStatus(): Promise<SyncLogRecord | null> {
  try {
    const logs = await execSql(`
      SELECT id, sync_time, source_platform, total_fetched, success_count, fail_count, fail_reason 
      FROM jd_sync_logs 
      ORDER BY sync_time DESC 
      LIMIT 1
    `) as SyncLogRecord[];
    return logs[0] || null;
  } catch {
    return null;
  }
}

/**
 * 获取各平台数据统计
 */
export async function getPlatformStats(): Promise<Record<string, number>> {
  try {
    const result = await execSql(`
      SELECT source_platform, SUM(success_count) as total 
      FROM jd_sync_logs 
      GROUP BY source_platform
      ORDER BY total DESC
    `) as Array<{ source_platform: string; total: number }>;
    
    const stats: Record<string, number> = {};
    for (const row of result) {
      stats[row.source_platform] = row.total;
    }
    return stats;
  } catch {
    return {};
  }
}

/**
 * 获取岗位总数统计
 */
export async function getJobsStats(): Promise<{ total: number; today: number; bySource: Record<string, number> }> {
  try {
    // 总数
    const totalResult = await execSql(`SELECT COUNT(*) as cnt FROM jobs`) as Array<{ cnt: number }>;
    const total = totalResult[0]?.cnt || 0;

    // 今日新增
    const today = new Date().toISOString().slice(0, 10);
    const todayResult = await execSql(`
      SELECT COUNT(*) as cnt FROM jobs WHERE created_at >= '${today}'
    `) as Array<{ cnt: number }>;
    const todayCount = todayResult[0]?.cnt || 0;

    // 按来源统计
    const sourceResult = await execSql(`
      SELECT source, COUNT(*) as cnt 
      FROM jobs 
      WHERE source IS NOT NULL AND source != ''
      GROUP BY source
      ORDER BY cnt DESC
    `) as Array<{ source: string; cnt: number }>;
    
    const bySource: Record<string, number> = {};
    for (const row of sourceResult) {
      bySource[row.source] = row.cnt;
    }

    return { total, today: todayCount, bySource };
  } catch {
    return { total: 0, today: 0, bySource: {} };
  }
}
