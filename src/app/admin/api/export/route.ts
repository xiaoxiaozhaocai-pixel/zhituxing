import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

// 获取Supabase客户端
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';
  return createClient(supabaseUrl, supabaseKey);
}

// 简单的管理员验证
async function verifyAdmin(request: NextRequest) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;
  const expectedToken = process.env.ADMIN_TOKEN || 'admin_token_for_zhituxing';
  return adminToken === expectedToken;
}

// 导出用户数据
async function exportUsers(supabase: any, dateRange?: { start: string; end: string }) {
  let query = supabase
    .from('users')
    .select('id, username, phone, created_at, is_member, is_lifetime_member, member_expire_time, profile_completed')
    .order('created_at', { ascending: false });

  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start);
  }
  if (dateRange?.end) {
    query = query.lte('created_at', dateRange.end + 'T23:59:59');
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map((user: any) => ({
    '用户ID': user.id,
    '用户名': user.username || '-',
    '手机号': user.phone || '-',
    '注册时间': user.created_at,
    '会员状态': user.is_lifetime_member ? '终身会员' : user.is_member ? '月度会员' : '普通用户',
    '会员到期时间': user.member_expire_time || '-',
    '是否完善信息': user.profile_completed ? '是' : '否'
  }));
}

// 导出会员数据
async function exportMembers(supabase: any, dateRange?: { start: string; end: string }) {
  let query = supabase
    .from('users')
    .select('id, username, phone, is_member, is_lifetime_member, member_expire_time, created_at')
    .or('is_member.eq.true,is_lifetime_member.eq.true')
    .order('created_at', { ascending: false });

  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start);
  }
  if (dateRange?.end) {
    query = query.lte('created_at', dateRange.end + 'T23:59:59');
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map((user: any) => ({
    '用户ID': user.id,
    '用户名': user.username || '-',
    '手机号': user.phone || '-',
    '会员类型': user.is_lifetime_member ? '终身会员' : '月度会员',
    '开始时间': user.created_at,
    '到期时间': user.member_expire_time || '永久',
    '注册时间': user.created_at
  }));
}

// 导出岗位数据
async function exportJobs(supabase: any, dateRange?: { start: string; end: string }) {
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
  
  return (data || []).map((job: any) => ({
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
async function exportArticles(supabase: any, dateRange?: { start: string; end: string }) {
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
  
  return (data || []).map((article: any) => ({
    'ID': article.id,
    '标题': article.title,
    '分类': article.category || '-',
    '标签': article.tags || '-',
    '浏览量': article.views || 0,
    '创建时间': article.created_at
  }));
}

// 导出订单数据
async function exportOrders(supabase: any, dateRange?: { start: string; end: string }) {
  let query = supabase
    .from('orders')
    .select('id, user_id, product_type, amount, status, created_at')
    .order('created_at', { ascending: false });

  if (dateRange?.start) {
    query = query.gte('created_at', dateRange.start);
  }
  if (dateRange?.end) {
    query = query.lte('created_at', dateRange.end + 'T23:59:59');
  }

  const { data, error } = await query;
  
  if (error) throw error;
  
  return (data || []).map((order: any) => ({
    '订单号': order.id,
    '用户ID': order.user_id,
    '商品类型': order.product_type === 'monthly' ? '月度会员' : order.product_type === 'lifetime' ? '终身会员' : order.product_type,
    '金额': `¥${order.amount}`,
    '支付状态': order.status === 'paid' ? '已支付' : order.status === 'pending' ? '待支付' : '已退款',
    '创建时间': order.created_at
  }));
}

// 生成CSV内容
function generateCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
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
function generateExcel(data: any[], filename: string): { filename: string; content: string } {
  return {
    filename: `${filename}.csv`,
    content: generateCSV(data)
  };
}

export async function POST(request: NextRequest) {
  try {
    // 验证管理员
    if (!await verifyAdmin(request)) {
      return NextResponse.json({ code: 401, message: '未授权' }, { status: 401 });
    }

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
