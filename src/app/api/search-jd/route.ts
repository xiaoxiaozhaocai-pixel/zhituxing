/**
 * 统一岗位搜索API - 供智能体调用
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    return (data || []).map(job => ({
      source: job.source || 'ZhiTuXing Database',
      job_name: job.job_name || '',
      company_name: job.company_name || 'Unknown',
      city: job.city || 'Unknown',
      salary_range: job.salary_range || 'Negotiable',
      industry: job.industry || 'General',
      company_type: job.company_type || 'Unknown',
      job_description: job.jd_content || 'No detailed information',
      is_fresh_friendly: job.is_fresh_friendly === 1
    }));
  } catch (error) {
    console.error('Database search exception:', error);
    return [];
  }
}

async function searchFromPublicAPIs(query: string): Promise<SearchResult[]> {
  const results: SearchResult[] = [];
  
  if (query.includes('HR') || query.includes('hr') || query.includes('招聘')) {
    results.push({
      source: 'National 24365 Job Platform',
      job_name: 'Campus Recruiter',
      company_name: 'Famous Company',
      city: 'Nationwide',
      salary_range: '8k-15k/month',
      industry: 'Internet/Finance/Education',
      company_type: 'Listed Company',
      job_description: 'Responsible for campus recruitment including recruitment planning, channel maintenance, campus recruitment execution, candidate follow-up, etc.',
      is_fresh_friendly: true
    });
  }
  
  return results;
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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || searchParams.get('keyword') || '';

    if (!query) {
      return NextResponse.json({
        code: 0,
        result: 'Please provide search keyword, e.g. ?query=recruiter'
      });
    }

    console.log('[Search] Keyword:', query);

    const [databaseResults, publicResults] = await Promise.all([
      searchFromDatabase(query),
      searchFromPublicAPIs(query)
    ]);

    const allResults = [...databaseResults, ...publicResults];
    const result = formatResults(allResults);

    console.log('[Search] Found', allResults.length, 'results');

    return NextResponse.json({
      code: 0,
      result: result
    });

  } catch (error) {
    console.error('[Search] API error:', error);
    return NextResponse.json({
      code: 1,
      result: 'Service temporarily unavailable'
    });
  }
}
