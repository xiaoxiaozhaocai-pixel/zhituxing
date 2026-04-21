import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 管理员权限验证
async function verifyAdmin(request: NextRequest): Promise<{ valid: boolean; adminId?: string; adminName?: string }> {
  const adminId = request.headers.get('x-admin-id');
  const adminName = request.headers.get('x-admin-name');
  
  if (!adminId) {
    return { valid: false };
  }
  
  return { valid: true, adminId, adminName: adminName || '管理员' };
}

// 获取待审核JD列表
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdmin(request);
    if (!auth.valid) {
      return NextResponse.json(
        { code: 403, message: '无权限访问', data: null },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status') || '0'; // 默认只查待审核
    const offset = (page - 1) * pageSize;

    // 构建查询
    let whereClause = '';
    if (status !== 'all') {
      whereClause = `WHERE s.status = '${status}'`;
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total FROM jd_submissions s ${whereClause}
    `);
    const total = (countResult as Array<{total: number}>)?.[0]?.total || 0;

    // 获取列表（包含用户信息）
    const listResult = await execSql(`
      SELECT 
        s.id, s.job_name, s.industry, s.city, s.company_name, s.company_type,
        s.salary_min, s.salary_max, s.skills, s.jd_content,
        s.status, s.reject_reason, s.create_time, s.update_time,
        u.nickname as user_nickname, u.phone as user_phone
      FROM jd_submissions s
      LEFT JOIN users u ON s.user_id = u.id
      ${whereClause}
      ORDER BY s.create_time ASC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    // 状态映射
    const statusMap: Record<number, string> = {
      0: '待审核',
      1: '已通过',
      2: '已驳回'
    };

    const list = (listResult as Array<Record<string, unknown>> || []).map((item) => ({
      id: item.id,
      job_name: item.job_name,
      industry: item.industry,
      city: item.city,
      company_name: item.company_name,
      company_type: item.company_type,
      salary_min: item.salary_min,
      salary_max: item.salary_max,
      skills: item.skills,
      jd_content: item.jd_content,
      status: item.status,
      status_text: statusMap[item.status as number] || '未知',
      reject_reason: item.reject_reason,
      create_time: item.create_time,
      update_time: item.update_time,
      user_nickname: item.user_nickname || '用户',
      user_phone: item.user_phone ? String(item.user_phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未知'
    }));

    return NextResponse.json({
      code: 200,
      message: 'success',
      data: {
        list,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error('获取审核列表失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取失败', data: null },
      { status: 500 }
    );
  }
}
