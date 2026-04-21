import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 管理员权限验证
async function verifyAdmin(request: NextRequest): Promise<{ valid: boolean }> {
  const adminId = request.headers.get('x-admin-id');
  
  if (!adminId) {
    return { valid: false };
  }
  
  return { valid: true };
}

// 获取所有职业规划报告列表（管理员）
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
    const userId = searchParams.get('user_id');
    const grade = searchParams.get('grade');
    const major = searchParams.get('major');
    const offset = (page - 1) * pageSize;

    // 构建查询条件
    let whereClause = '';
    const conditions: string[] = [];
    
    if (userId) {
      conditions.push(`r.user_id = '${userId}'`);
    }
    if (grade) {
      conditions.push(`r.grade = '${grade.replace(/'/g, "''")}'`);
    }
    if (major) {
      conditions.push(`r.major LIKE '%${major.replace(/'/g, "''")}%'`);
    }
    
    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // 获取总数
    const countResult = await execSql(`
      SELECT COUNT(*) as total 
      FROM career_planning_reports r
      ${whereClause}
    `);
    const total = (countResult as Array<{total: number}>)?.[0]?.total || 0;

    // 获取列表
    const listResult = await execSql(`
      SELECT 
        r.id, r.user_id, r.major, r.grade, r.city, r.is_latest, r.create_time,
        u.nickname as user_nickname, u.phone as user_phone
      FROM career_planning_reports r
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ORDER BY r.create_time DESC
      LIMIT ${pageSize} OFFSET ${offset}
    `);

    const list = (listResult as Array<Record<string, unknown>> || []).map((item) => ({
      id: item.id,
      user_id: item.user_id,
      user_nickname: item.user_nickname || '用户',
      user_phone: item.user_phone ? String(item.user_phone).replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '未知',
      major: item.major || '未填写',
      grade: item.grade,
      city: item.city || '全国',
      is_latest: item.is_latest,
      create_time: item.create_time
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
    console.error('获取报告列表失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取失败', data: null },
      { status: 500 }
    );
  }
}
