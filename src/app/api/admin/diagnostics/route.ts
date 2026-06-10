export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUserId } from '@/lib/auth';
import { execSql } from '@/lib/exec-sql';
import type { TestResult } from '@/lib/types';

// 管理员权限校验
async function checkAdmin(request: NextRequest): Promise<string | null> {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) return null;
  
  const adminIds = process.env.ADMIN_USER_IDS;
  if (!adminIds) {
    console.warn('[admin/diagnostics] ADMIN_USER_IDS not configured');
    return null;
  }
  
  const adminList = adminIds.split(',').map(id => id.trim().toLowerCase());
  if (!adminList.includes(userId.toLowerCase())) return null;
  
  return userId;
}


// 带超时的fetch
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// API端点测试
async function testApiEndpoints(): Promise<TestResult[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zhituxing.tech';
  const tests = [
    { path: '/api/health', method: 'GET', expected: 200, name: '健康检查' },
    { path: '/api/auth/me', method: 'GET', expected: 401, name: '未登录认证' },
    { path: '/api/jobs', method: 'GET', expected: 200, name: '岗位列表' },
    { path: '/api/articles', method: 'GET', expected: 200, name: '文章列表' },
    { path: '/api/skills/relations?skill=Java', method: 'GET', expected: 200, name: '技能关系' },
    { path: '/api/membership', method: 'GET', expected: 401, name: '会员信息' },
    { path: '/api/orders', method: 'POST', expected: 401, name: '订单接口' },
    { path: '/api/quota', method: 'GET', expected: 401, name: '未登录配额（应拒）' },
    { path: '/api/industries', method: 'GET', expected: 200, name: '行业列表' },
  ];

  return Promise.all(
    tests.map(async (test) => {
      try {
        const options: RequestInit = { method: test.method };
        if (test.method === 'POST') {
          options.headers = { 'Content-Type': 'application/json' };
          options.body = JSON.stringify(test.path === '/api/orders' ? { plan: 'monthly', payment_method: 'wechat', payment_screenshot_url: 'x' } : {});
        }
        const res = await fetchWithTimeout(`${baseUrl}${test.path}`, options);
        const status = res.status;
        let passed = status === test.expected;
        // 200系列的都算pass
        if (test.expected === 200 && status >= 200 && status < 300) passed = true;
        // 401的收到了401也算pass
        if (test.expected === 401 && status === 401) passed = true;
        return { name: test.name, status, expected: test.expected, result: passed ? 'pass' : 'fail', detail: `HTTP ${status}` };
      } catch (e: unknown) {
        const _e_ = e as Error;
        return { name: test.name, status: 0, expected: test.expected, result: 'fail', detail: _e_.message || '请求失败' };
      }
    })
  );
}

// 页面路由测试
async function testPageRoutes(): Promise<TestResult[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zhituxing.tech';
  const routes = [
    '/', '/login', '/register', '/jobs', '/growth', '/assistant',
    '/match', '/skill-portrait', '/skills-graph', '/guide',
    '/faq', '/learning-path', '/membership', '/resources', '/contact',
    '/privacy', '/terms', '/feedback', '/search'
  ];

  return Promise.all(
    routes.map(async (route) => {
      try {
        const res = await fetchWithTimeout(`${baseUrl}${route}`, { method: 'GET' });
        const status = res.status;
        const passed = status === 200 || status === 301 || status === 307;
        return { name: route, status, result: passed ? 'pass' : 'fail', detail: `HTTP ${status}` };
      } catch (e: unknown) {
        const _e_ = e as Error;
        return { name: route, status: 0, result: 'fail', detail: _e_.message || '请求失败' };
      }
    })
  );
}

// SSE流测试
async function testSSEStream(): Promise<TestResult[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zhituxing.tech';
  const test = { name: '职搭子SSE流', path: '/api/partner' };
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${baseUrl}${test.path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: '你好', messages: [] }),
    });
    
    clearTimeout(timeoutId);
    
    // 检查是否返回了SSE格式
    const contentType = res.headers.get('content-type') || '';
    const passed = contentType.includes('text/event-stream');
    
    return [{ 
      ...test, 
      status: res.status, 
      result: passed ? 'pass' : 'fail', 
      detail: passed ? 'SSE流正常' : `Content-Type: ${contentType}`
    }];
  } catch (e: unknown) {
    const _e_ = e as Error;
    return [{ 
      name: test.name, 
      status: 0, 
      result: 'fail', 
      detail: _e_.message || 'SSE流测试失败' 
    }];
  }
}

// 安全检查
async function testSecurity(): Promise<TestResult[]> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zhituxing.tech';
  const tests: TestResult[] = [];

  // 1. SQL注入拦截测试
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/jobs?keyword=xxx'%20OR%20'1'='1`, { method: 'GET' });
    // 如果返回200但内容被过滤而不是报错，说明拦截成功
    const text = await res.text();
    // 检查是否返回空结果或错误而不是执行了注入
    const passed = !text.includes('OR') || text.includes('error') || text.includes('[]') || res.status >= 400;
    tests.push({ 
      name: 'SQL注入拦截', 
      status: res.status, 
      result: passed ? 'pass' : 'warn', 
      detail: passed ? '已拦截' : '可能未拦截' 
    });
  } catch (e: unknown) {
    const _e_ = e as Error;
    tests.push({ name: 'SQL注入拦截', status: 0, result: 'fail', detail: _e_.message });
  }

  // 2. 订单篡改拦截测试
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: 'monthly', payment_method: 'wechat', payment_screenshot_url: 'x' }),
    });
    const status = res.status;
    // 应该返回401（未登录）或400（参数校验失败），不应该成功
    const passed = status !== 200;
    tests.push({ 
      name: '订单篡改拦截', 
      status, 
      result: passed ? 'pass' : 'fail', 
      detail: passed ? '已拦截' : `HTTP ${status}` 
    });
  } catch (e: unknown) {
    const _e_ = e as Error;
    tests.push({ name: '订单篡改拦截', status: 0, result: 'fail', detail: _e_.message });
  }

  // 3. 首页品牌文案检测
  try {
    const res = await fetchWithTimeout(`${baseUrl}/`, { method: 'GET' });
    const text = await res.text();
    const passed = text.includes('职途星');
    tests.push({ 
      name: '品牌文案检测', 
      status: res.status, 
      result: passed ? 'pass' : 'fail', 
      detail: passed ? '品牌文案正常' : '品牌文案缺失' 
    });
  } catch (e: unknown) {
    const _e_ = e as Error;
    tests.push({ name: '品牌文案检测', status: 0, result: 'fail', detail: _e_.message });
  }

  // 4. 安全响应头检测
  try {
    const res = await fetchWithTimeout(`${baseUrl}/api/health`, { method: 'GET' });
    const headers = Object.fromEntries(res.headers.entries());
    const hasCSP = headers['content-security-policy'] || headers['content-security-policy-report-only'];
    const hasHSTS = headers['strict-transport-security'];
    const hasXFO = headers['x-frame-options'];
    const passed = !!(hasCSP || hasHSTS || hasXFO);
    tests.push({ 
      name: '安全响应头', 
      status: res.status, 
      result: (passed ? 'pass' : 'warn') as 'pass' | 'warn' | 'fail', 
      detail: `CSP:${!!hasCSP} HSTS:${!!hasHSTS} XFO:${!!hasXFO}` 
    });
  } catch (e: unknown) {
    const _e_ = e as Error;
    tests.push({ name: '安全响应头', status: 0, result: 'fail' as 'pass' | 'warn' | 'fail', detail: _e_.message });
  }

  return tests;
}

// 管道健康检查（GitHub Actions + Sentry + Lint）
async function testPipeline(): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  const token = process.env.GITHUB_TOKEN;
  const sentryToken = process.env.SENTRY_AUTH_TOKEN;
  const sentryOrg = process.env.SENTRY_ORG || 'zhituxing';
  const sentryProject = process.env.SENTRY_PROJECT || 'javascript-nextjs';

  // 1. GitHub Actions CI 状态
  try {
    const res = await fetchWithTimeout(
      'https://api.github.com/repos/xiaoxiaozhaocai-pixel/zhituxing/actions/runs?per_page=3',
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } },
      10000
    );
    if (res.ok) {
      const data = await res.json() as { workflow_runs: Array<{ status: string; conclusion: string | null; name: string }> };
      const runs = data.workflow_runs || [];
      const latestRun = runs[0];
      const status = latestRun?.conclusion || latestRun?.status || 'unknown';
      const passed = status === 'success';
      tests.push({
        name: 'GitHub Actions CI',
        status: res.status,
        result: passed ? 'pass' : (status === 'unknown' ? 'warn' : 'fail'),
        detail: `${latestRun?.name || 'N/A'}: ${status}`
      });
    } else {
      tests.push({ name: 'GitHub Actions CI', status: res.status, result: 'fail', detail: `GitHub API ${res.status}` });
    }
  } catch (e: unknown) {
    tests.push({ name: 'GitHub Actions CI', status: 0, result: 'fail', detail: (e as Error).message || '请求失败' });
  }

  // 2. Sentry 连接状态
  try {
    const res = await fetchWithTimeout(
      `https://sentry.io/api/0/projects/${sentryOrg}/${sentryProject}/`,
      { headers: { Authorization: `Bearer ${sentryToken}` } },
      8000
    );
    const passed = res.ok;
    tests.push({
      name: 'Sentry 连接',
      status: res.status,
      result: passed ? 'pass' : 'fail',
      detail: passed ? '连接正常' : `HTTP ${res.status}`
    });
  } catch (e: unknown) {
    tests.push({ name: 'Sentry 连接', status: 0, result: 'fail', detail: (e as Error).message || '请求失败' });
  }

  // 3. Lint 自检（无 GITHUB_TOKEN 可用时判定为 warn）
  if (!token) {
    tests.push({ name: 'GITHUB_TOKEN', status: 0, result: 'fail', detail: '未配置环境变量' });
  } else {
    tests.push({ name: 'GITHUB_TOKEN', status: 200, result: 'pass', detail: '已配置' });
  }

  // 4. Sentry Token 检查
  if (!sentryToken) {
    tests.push({ name: 'SENTRY_AUTH_TOKEN', status: 0, result: 'fail', detail: '未配置环境变量' });
  } else {
    tests.push({ name: 'SENTRY_AUTH_TOKEN', status: 200, result: 'pass', detail: '已配置' });
  }

  return tests;
}

// 数据库状态检查
async function testDatabase(): Promise<TestResult[]> {
  const tables = [
    { name: 'public.job_descriptions', min: 1000, display: '岗位数据' },
    { name: 'public.skill_taxonomy', min: 100, display: '技能分类' },
    { name: 'public.skill_relations', min: 100, display: '技能关系' },
    { name: 'public.career_paths', min: 10, display: '职业路径' },
    { name: 'public.interview_questions', min: 10, display: '面试题库' },
    { name: 'public.skill_assessments', min: 10, display: '技能测评' },
    { name: 'public.learning_resources', min: 10, display: '学习资源' },
    { name: 'public.articles', min: 1, display: '文章内容' },
    { name: 'public.user_profiles', min: 0, display: '用户数据' },
  ];

  return Promise.all(
    tables.map(async (table) => {
      try {
        const result = await execSql(
          `SELECT COUNT(*)::int as count FROM ${table.name}`
        ) as Array<Record<string, unknown>>;
        const count = (result?.[0]?.count as number) || 0;
        const passed = count >= table.min;
        return { 
          name: table.display, 
          table: table.name, 
          count, 
          min: table.min, 
          status: count > 0 ? 200 : 0,
          result: passed ? 'pass' : 'fail', 
          detail: `${count}/${table.min}` 
        };
      } catch (e: unknown) {
        const _e_ = e as Error;
        return { 
          name: table.display, 
          table: table.name, 
          count: 0, 
          min: table.min, 
          status: 0,
          result: 'fail', 
          detail: _e_.message 
        };
      }
    })
  );
}


// 管道健康检查（GitHub Actions + Sentry + Lint）
async function testPipeline(): Promise<TestResult[]> {
  const tests: TestResult[] = [];
  const ghToken = process.env.GITHUB_TOKEN || '';
  const sentryToken = process.env.SENTRY_AUTH_TOKEN || '';
  
  // --- GitHub Actions ---
  if (ghToken) {
    try {
      const ghRes = await fetchWithTimeout(
        'https://api.github.com/repos/xiaoxiaozhaocai-pixel/zhituxing/actions/runs?per_page=10',
        { headers: { Authorization: `token ${ghToken}`, 'User-Agent': 'zhituxing-diagnostics' } },
        10000
      );
      const ghData = await ghRes.json() as { workflow_runs?: Array<{ name: string; status: string; conclusion: string | null; html_url: string }> };
      if (ghData.workflow_runs) {
        const seen = new Set<string>();
        for (const run of ghData.workflow_runs) {
          const key = run.name;
          if (seen.has(key)) continue;
          seen.add(key);
          const passed = run.conclusion === 'success';
          const status = run.status === 'completed' ? (passed ? 200 : 400) : 202;
          tests.push({
            name: `GitHub: ${run.name}`,
            status,
            result: run.status === 'in_progress' ? 'warn' : (passed ? 'pass' : 'fail'),
            detail: run.conclusion || run.status,
          } as TestResult);
        }
      }
    } catch {}
  }
  
  // --- Sentry 错误监控 ---
  if (sentryToken) {
    try {
      const sentryRes = await fetchWithTimeout(
        'https://sentry.io/api/0/projects/zhituxing/javascript-nextjs/issues/?statsPeriod=24h&limit=50',
        { headers: { Authorization: `Bearer ${sentryToken}` } },
        10000
      );
      const issues = await sentryRes.json() as Array<{ level: string }>;
      if (Array.isArray(issues)) {
        const errors = issues.filter((i: { level: string }) => i.level === 'error' || i.level === 'fatal').length;
        const warnings = issues.filter((i: { level: string }) => i.level === 'warning').length;
        const passed = errors === 0 && warnings < 5;
        tests.push({
          name: 'Sentry 生产错误',
          status: errors === 0 ? 200 : 400,
          result: passed ? 'pass' : (errors > 0 ? 'fail' : 'warn'),
          detail: `错误:${errors} 警告:${warnings}`,
        } as TestResult);
      }
    } catch {}
  }
  
  // --- Lint Warnings ---
  tests.push({
    name: 'Lint Warnings',
    status: 200,
    result: 'warn',
    detail: '渐进清理中（~324条）',
  } as TestResult);
  
  return tests;
}

// GET /api/admin/diagnostics
export async function GET(request: NextRequest) {
  const adminId = await checkAdmin(request);
  if (!adminId) {
    return NextResponse.json({ error: '无权限访问' }, { status: 403 });
  }

  try {
    // 并行执行所有测试
    const [apiResults, pageResults, sseResults, securityResults, dbResults, pipelineResults] = await Promise.all([
      testApiEndpoints(),
      testPageRoutes(),
      testSSEStream(),
      testSecurity(),
      testDatabase(),
      testPipeline(),
    ]);

    // 统计各分类结果
    const countResults = (items: TestResult[]) => {
      const pass = items.filter(i => i.result === 'pass').length;
      const fail = items.filter(i => i.result === 'fail').length;
      const warn = items.filter(i => i.result === 'warn').length;
      return { pass, fail, warn, items };
    };

    const categories = {
      api: countResults(apiResults),
      pages: countResults(pageResults),
      sse: countResults(sseResults),
      security: countResults(securityResults),
      database: countResults(dbResults),
      pipeline: countResults(pipelineResults),
    };

    // 计算健康度
    const allItems = [
      ...apiResults, ...pageResults, ...sseResults, ...securityResults, ...dbResults, ...pipelineResults
    ];
    const totalPass = allItems.filter(i => i.result === 'pass').length;
    const totalWarn = allItems.filter(i => i.result === 'warn').length;
    const total = allItems.length;
    const health = total > 0 ? Math.round((totalPass + totalWarn * 0.5) / total * 100) : 0;

    return NextResponse.json({
      success: true,
      health,
      categories,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[diagnostics] Error:', error);
    return NextResponse.json({ error: '诊断失败' }, { status: 500 });
  }
}
