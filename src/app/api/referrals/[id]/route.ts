import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取内推详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 获取内推详情
    const result = await execSql(
      `SELECT 
        id, title, company, logo_url, position, location, salary,
        requirements, benefits, contact_name, contact_email, contact_wechat,
        is_verified, is_featured, views, applies_count, expires_at, created_at
       FROM referrals
       WHERE id = '${id}' AND is_active = TRUE`
    );

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: '内推不存在或已下架' },
        { status: 404 }
      );
    }

    // 增加浏览量
    await execSql(
      `UPDATE referrals SET views = views + 1 WHERE id = '${id}'`
    );

    const referral = result[0] as {
      id: string;
      title: string;
      company: string;
      logo_url: string | null;
      position: string;
      location: string | null;
      salary: string | null;
      requirements: string | null;
      benefits: string | null;
      contact_name: string | null;
      contact_email: string | null;
      contact_wechat: string | null;
      is_verified: boolean;
      is_featured: boolean;
      views: number;
      applies_count: number;
      expires_at: string | null;
      created_at: string;
    };

    return NextResponse.json({
      success: true,
      data: {
        id: referral.id,
        title: referral.title,
        company: referral.company,
        logoUrl: referral.logo_url,
        position: referral.position,
        location: referral.location,
        salary: referral.salary,
        requirements: referral.requirements,
        benefits: referral.benefits,
        contactName: referral.contact_name,
        contactEmail: referral.contact_email,
        contactWechat: referral.contact_wechat,
        isVerified: referral.is_verified,
        isFeatured: referral.is_featured,
        views: referral.views + 1,
        appliesCount: referral.applies_count,
        expiresAt: referral.expires_at,
        createdAt: referral.created_at
      }
    });

  } catch (error) {
    console.error('获取内推详情失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}

// 申请内推
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = request.headers.get('x-user-id');
    const { resumeUrl, coverLetter } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 检查是否已申请
    const existResult = await execSql(
      `SELECT id FROM referral_applications WHERE referral_id = '${id}' AND user_id = '${userId}'`
    );

    if (existResult && existResult.length > 0) {
      return NextResponse.json(
        { error: '您已申请过该内推' },
        { status: 400 }
      );
    }

    // 创建申请
    const result = await execSql(
      `INSERT INTO referral_applications (referral_id, user_id, resume_url, cover_letter)
       VALUES ('${id}', '${userId}', ${resumeUrl ? `'${resumeUrl}'` : 'NULL'}, ${coverLetter ? `'${coverLetter.replace(/'/g, "''")}'` : 'NULL'})
       RETURNING id, created_at`
    );

    // 更新申请数
    await execSql(
      `UPDATE referrals SET applies_count = applies_count + 1 WHERE id = '${id}'`
    );

    return NextResponse.json({
      success: true,
      message: '申请成功，内推人将尽快处理',
      data: {
        id: (result?.[0] as { id: string })?.id
      }
    });

  } catch (error) {
    console.error('申请内推失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
