/**
 * 岗位JD搜索API - 供智能体调用
 * 返回格式化的岗位信息，匹配智能体工具的返回格式
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || searchParams.get('keyword') || '';

    if (!query) {
      return NextResponse.json({
        code: 0,
        result: '请提供搜索关键词'
      });
    }

    // 搜索岗位（模糊匹配岗位名称、企业名称、城市）
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .select('job_name, company_name, city, salary_range, industry, company_type, jd_content, is_fresh_friendly')
      .or(`job_name.ilike.%${query}%,company_name.ilike.%${query}%,city.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error('搜索失败:', error);
      return NextResponse.json({
        code: 1,
        result: `搜索失败: ${error.message}`
      });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({
        code: 0,
        result: '未找到匹配的岗位JD'
      });
    }

    // 格式化输出
    const formattedJobs = data.map((job, index) => {
      return `
【岗位${index + 1}】
📌 岗位名称：${job.job_name}
🏢 企业名称：${job.company_name}
📍 工作城市：${job.city}
💰 薪资范围：${job.salary_range || '面议'}
🏭 行业类型：${job.industry || '未分类'}
🏢 企业类型：${job.company_type || '未知'}
👔 应届友好：${job.is_fresh_friendly === 1 ? '✅ 是' : '❌ 否'}
📝 岗位描述：${job.jd_content || '暂无详细信息'}
`.trim();
    });

    const result = `找到 ${data.length} 个相关岗位：\n\n${formattedJobs.join('\n\n')}`;

    return NextResponse.json({
      code: 0,
      result: result
    });

  } catch (error) {
    console.error('API错误:', error);
    return NextResponse.json({
      code: 1,
      result: `服务暂时不可用: ${error instanceof Error ? error.message : '未知错误'}`
    });
  }
}
