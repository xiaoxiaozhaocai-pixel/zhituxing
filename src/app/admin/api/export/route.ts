import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';

// 获取Supabase客户端
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
}

// 导出用户数据
async function exportUsers(supabase: SupabaseClient, dateRange?: { start: string; end: string }) {
  let query = supabase
    .from('user_profiles')
    .select('user_id, nickname, phone, created_at, membership_tier, membership_expires_at, major')
    .order('created_at', { ascending: false });

  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start);
  }
  if (dateRange?.end) {
    query = query.lte('created_at', dateRange.end + 'T23:59:59');
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map((user: Record<string, unknown>) => ({
    '用户ID': user.user_id,
    '用户名': user.nickname || '-',
    '手机号': user.phone || '-',
    '注册时间': user.created_at,
    '会员状态': user.membership_tier === 'lifetime' ? '终身会员' : (user.membership_tier && user.membership_tier !== 'free') ? '月度会员' : '普通用户',
    '会员到期时间': user.membership_expires_at || '-',
    '是否完善信息': user.major ? '是' : '否'
  }));
}

// 导出会员数据
async function exportMembers(supabase: SupabaseClient, dateRange?: { start: string; end: string }) {
  let query = supabase
    .from('user_profiles')
    .select('user_id, nickname, phone, membership_tier, membership_expires_at, created_at')
    .not('membership_tier', 'is', null).neq('membership_tier', 'free')
    .order('created_at', { ascending: false });

  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start);
  }
  if (dateRange?.end) {
    query = query.lte('created_at', dateRange.end + 'T23:59:59');
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map((user: Record<string, unknown>) => ({
    '用户ID': user.user_id,
    '用户名': user.nickname || '-',
    '手机号': user.phone || '-',
    '会员类型': user.membership_tier === 'lifetime' ? '终身会员' : '月度会员',
    '开始时间': user.created_at,
    '到期时间': user.membership_expires_at || '永久',
    '注册时间': user.created_at
  }));
}

// 导出岗位数据
async function exportJobs(supabase: SupabaseClient, dateRange?: { start: string; end: string }) {
  let query = supabase
    .from('job_descriptions')
    .select('id, job_title, company, city, salary_range, source_platform, created_at')
    .order('created_at', { ascending: false });

  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start);
  }
  if (dateRange?.end) {
    query = query.lte('created_at', dateRange.end + 'T23:59:59');
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map((job: Record<string, unknown>) => ({
    'ID': job.id,
    '岗位名称': job.job_title,
    '公司名称': job.company,
    '城市': job.city || '-',
    '薪资范围': job.salary_range || '-',
    '来源平台': job.source_platform || 'ZhiTuXing',
    '创建时间': job.created_at
  }));
}

// 导出文章数据
async function exportArticles(supabase: SupabaseClient, dateRange?: { start: string; end: string }) {
  let query = supabase
    .from('articles')
    .select('id, title, category, tags, views, created_at')
    .order('created_at', { ascending: false });

  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start);
  }
  if (dateRange?.end) {
    query = query.lte('created_at', dateRange.end + 'T23:59:59');
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map((article: Record<string, unknown>) => ({
    'ID': article.id,
    '标题': article.title,
    '分类': article.category || '-',
    '标签': article.tags || '-',
    '浏览量': article.views || 0,
    '创建时间': article.created_at
  }));
}

// 导出订单数据
async function exportOrders(supabase: SupabaseClient, dateRange?: { start: string; end: string }) {
  let query = supabase
    .from('membership_orders')
    .select('id, user_id, plan, amount, created_at')
    .order('created_at', { ascending: false });

  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start);
  }
  if (dateRange?.end) {
    query = query.lte('created_at', dateRange.end + 'T23:59:59');
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map((order: Record<string, unknown>) => ({
    '订单号': order.id,
    '用户ID': order.user_id,
    '商品类型': order.plan === 'monthly' ? '月度会员' : order.plan === 'lifetime' ? '终身会员' : order.plan,
    '金额': `¥${order.amount}`,
    '支付状态': '已支付', // membership_orders 仅记录已生效订单
    '创建时间': order.created_at
  }));
}

// 生成CSV内容
function generateCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0] ?? {});
  const rows = data.map(row => 
    headers.map(header => {
      const value = row[header] || '';
      // 处理包含逗号、引号的值
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );
  
  return [headers.join(','), ...rows].join('\n');
}

// 生成Excel文件（简化的xlsx格式，这里用CSV代替）
function generateExcel(data: Record<string, unknown>[], filename: string): { filename: string; content: string } {
  return {
    filename: `${filename}.csv`,
    content: generateCSV(data)
  };
}

export async function POST(request: NextRequest) {
  const _authCheck = requireAdmin(request);
  if (_authCheck) return _authCheck;
  try {

    const body = await request.json();
    const { type, dateRange } = body;

    const supabase = getSupabaseClient();
    const files: { filename: string; content: string }[] = [];

    switch (type) {
      case 'users':
        const users = await exportUsers(supabase, dateRange);
        files.push(generateExcel(users, '用户数据'));
        break;
        
      case 'members':
        const members = await exportMembers(supabase, dateRange);
        files.push(generateExcel(members, '会员数据'));
        break;
        
      case 'jobs':
        const jobs = await exportJobs(supabase, dateRange);
        files.push(generateExcel(jobs, '岗位数据'));
        break;
        
      case 'articles':
        const articles = await exportArticles(supabase, dateRange);
        files.push(generateExcel(articles, '文章数据'));
        break;
        
      case 'orders':
        const orders = await exportOrders(supabase, dateRange);
        files.push(generateExcel(orders, '订单数据'));
        break;
        
      case 'all':
        const [allUsers, allMembers, allJobs, allArticles, allOrders] = await Promise.all([
          exportUsers(supabase, dateRange),
          exportMembers(supabase, dateRange),
          exportJobs(supabase, dateRange),
          exportArticles(supabase, dateRange),
          exportOrders(supabase, dateRange)
        ]);
        files.push(generateExcel(allUsers, '1_用户数据'));
        files.push(generateExcel(allMembers, '2_会员数据'));
        files.push(generateExcel(allJobs, '3_岗位数据'));
        files.push(generateExcel(allArticles, '4_文章数据'));
        files.push(generateExcel(allOrders, '5_订单数据'));
        break;
        
      default:
        return NextResponse.json({ code: 400, message: '无效的导出类型' }, { status: 400 });
    }

    // 返回文件列表（实际应用中应该上传到存储服务并返回下载链接）
    const fileNames = files.map(f => f.filename);

    return NextResponse.json({
      code: 200,
      message: `成功生成 ${files.length} 个文件`,
      data: {
        files: fileNames,
        // 实际应用中这里应该返回下载URL
        // 这里简单返回提示信息
      }
    });

  } catch (error: unknown) {
    const _error_ = error as Error;
    console.error('Export error:', error);
    return NextResponse.json({
      code: 500,
      message: `导出失败: ${_error_.message}`
    }, { status: 500 });
  }
}
