/**
 * 统一岗位搜索API
 * 供智能体调用，也支持前端直接搜索
 * 
 * 优先使用扣子编程 stream_run API
 * 回退到标准 Coze Bot API
 * 最终回退到数据库搜索
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getUserInfoFromRequest,
  callCozeStreamApi,
  createCozeSSEStream,
  callWorkflowStreamApi,
  createWorkflowSSEStream,
  createTextStream,
  getWorkflowConfig,
} from '@/lib/coze-stream';

export const runtime = 'edge';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
};

interface SearchResult {
  source: string;
  job_name: string;
  company_name: string;
  city: string;
  salary_range: string;
  industry: string;
  company_type: string;
  job_description: string;
  is_fresh_friendly: boolean;
}

async function searchFromDatabase(query: string): Promise<SearchResult[]> {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('job_name, company_name, city, salary_range, industry, company_type, jd_content, is_fresh_friendly, source')
      .or('job_name.ilike.%' + query + '%,company_name.ilike.%' + query + '%,city.ilike.%' + query + '%')
      .limit(20);

    if (error) {
      console.error('Database search error:', error);
      return [];
    }

    return (data || []).map((job: Record<string, unknown>) => ({
      source: (job.source as string) || 'ZhiTuXing Database',
      job_name: (job.job_name as string) || '',
      company_name: (job.company_name as string) || 'Unknown',
      city: (job.city as string) || 'Unknown',
      salary_range: (job.salary_range as string) || 'Negotiable',
      industry: (job.industry as string) || 'General',
      company_type: (job.company_type as string) || 'Unknown',
      job_description: (job.jd_content as string) || 'No detailed information',
      is_fresh_friendly: job.is_fresh_friendly === 1,
    }));
  } catch (error) {
    console.error('Database search exception:', error);
    return [];
  }
}

function formatResults(jobs: SearchResult[]): string {
  if (jobs.length === 0) {
    return 'No matching job descriptions found';
  }

  const lines: string[] = [];
  lines.push('Found ' + jobs.length + ' relevant positions:\n');

  jobs.forEach((job, index) => {
    lines.push('[Position ' + (index + 1) + ']');
    lines.push('Job Title: ' + job.job_name);
    lines.push('Company: ' + job.company_name);
    lines.push('City: ' + job.city);
    lines.push('Salary: ' + job.salary_range);
    lines.push('Industry: ' + job.industry);
    lines.push('Company Type: ' + job.company_type);
    lines.push('Fresh Graduate Friendly: ' + (job.is_fresh_friendly ? 'Yes' : 'No'));
    lines.push('Description: ' + job.job_description);
    lines.push('Source: ' + job.source);
    lines.push('');
  });

  return lines.join('\n');
}

function getDbFallback(message: string): Promise<string> {
  return searchFromDatabase(message).then(results => {
    if (results.length > 0) return formatResults(results);
    return `未找到与「${message}」相关的岗位信息。请尝试其他关键词。`;
  });
}

// GET: 供智能体工具调用（直接搜索数据库）
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || searchParams.get('keyword') || '';

    if (!query) {
      return NextResponse.json({
        code: 0,
        result: 'Please provide search keyword, e.g. ?query=recruiter',
      });
    }

    console.log('[Search] Keyword:', query);

    const databaseResults = await searchFromDatabase(query);
    const result = formatResults(databaseResults);

    console.log('[Search] Found', databaseResults.length, 'results');

    return NextResponse.json({ code: 0, result });
  } catch (error) {
    console.error('[Search] API error:', error);
    return NextResponse.json({
      code: 1,
      result: 'Service temporarily unavailable',
    });
  }
}

// POST: 供前端直接调用职搭子智能体
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversationId } = body;

    if (!message || typeof message !== 'string') {
      return new Response(
        JSON.stringify({ error: '搜索内容不能为空' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. 用户验证
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId || null;
    const userType = userInfo?.userType || 'free';

    const fallbackText = await getDbFallback(message);

    // ===========================
    // 优先尝试 stream_run API
    // ===========================
    const workflowConfig = getWorkflowConfig('jobs');

    if (workflowConfig) {
      console.log('[search-jd] Using stream_run API');
      try {
        const workflowResponse = await callWorkflowStreamApi({
          botType: 'jobs',
          message,
          userContext: '',
        });

        if (workflowResponse.ok) {
          const stream = createWorkflowSSEStream({
            workflowResponse,
            userId,
            botType: 'jobs',
            fallbackText,
          });
          return new Response(stream, { headers: SSE_HEADERS });
        } else {
          console.log(`[search-jd] stream_run returned ${workflowResponse.status}, falling back`);
        }
      } catch (err) {
        console.error('[search-jd] stream_run error:', err);
      }
    }

    // ===========================
    // 回退到标准 Coze Bot API
    // ===========================
    const botId = process.env.COZE_BOT_ID_JOBS || '';
    const apiKey = process.env.COZE_API_KEY;

    if (!apiKey || !botId) {
      return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
    }

    const cozeResponse = await callCozeStreamApi({
      botId,
      message,
      userType,
      conversationId,
    });

    if (!cozeResponse.ok) {
      console.error('Coze API error:', cozeResponse.status);
      return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
    }

    const contentType = cozeResponse.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errorData = await cozeResponse.json();
      console.error('Coze API JSON error:', errorData);
      return new Response(createTextStream(fallbackText), { headers: SSE_HEADERS });
    }

    // 创建 SSE 流（jd_match 类型存入 skill_job_match 表）
    const stream = createCozeSSEStream({
      cozeResponse,
      userId,
      botType: 'jobs',
      fallbackText,
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error) {
    console.error('Search-JD API Error:', error);
    return NextResponse.json(
      { code: 500, message: '搜索失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}
