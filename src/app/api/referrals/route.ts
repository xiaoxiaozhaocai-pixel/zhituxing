import { NextRequest, NextResponse } from 'next/server';
import { execSql } from '@/lib/exec-sql';

// 获取内推列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get('location');
    const keyword = searchParams.get('keyword');
    const featured = searchParams.get('featured');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let whereClause = `WHERE is_active = TRUE`;
    
    if (location) {
      whereClause += ` AND location LIKE '%${location}%'`;
    }
    
    if (keyword) {
      whereClause += ` AND (title LIKE '%${keyword}%' OR company LIKE '%${keyword}%' OR position LIKE '%${keyword}%')`;
    }
    
    if (featured === 'true') {
      whereClause += ` AND is_featured = TRUE`;
    }

    const result = await execSql(
      `SELECT 
        id, title, company, logo_url, position, location, salary,
        requirements, benefits, is_verified, is_featured, views, 
        applies_count, expires_at, created_at
       FROM referrals
       ${whereClause}
       ORDER BY is_featured DESC, created_at DESC
       LIMIT ${limit} OFFSET ${offset}`
    );

    // 获取总数
    const countResult = await execSql(
      `SELECT COUNT(*) as total FROM referrals ${whereClause}`
    );
    const total = countResult && countResult.length > 0 
      ? parseInt((countResult[0] as { total: string }).total) || 0 
      : 0;

    // 获取热门城市
    const cityResult = await execSql(
      `SELECT DISTINCT location FROM referrals WHERE is_active = TRUE AND location IS NOT NULL LIMIT 20`
    );
    const cities = (cityResult || []).map((r: unknown) => (r as { location: string }).location).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: {
        referrals: (result || []).map((r: unknown) => {
          const referral = r as {
            id: string;
            title: string;
            company: string;
            logo_url: string | null;
            position: string;
            location: string | null;
            salary: string | null;
            requirements: string | null;
            benefits: string | null;
            is_verified: boolean;
            is_featured: boolean;
            views: number;
            applies_count: number;
            expires_at: string | null;
            created_at: string;
          };
          return {
            id: referral.id,
            title: referral.title,
            company: referral.company,
            logoUrl: referral.logo_url,
            position: referral.position,
            location: referral.location,
            salary: referral.salary,
            requirements: referral.requirements,
            benefits: referral.benefits,
            isVerified: referral.is_verified,
            isFeatured: referral.is_featured,
            views: referral.views,
            appliesCount: referral.applies_count,
            expiresAt: referral.expires_at,
            createdAt: referral.created_at
          };
        }),
        total,
        cities
      }
    });

  } catch (error) {
    console.error('获取内推列表失败:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
