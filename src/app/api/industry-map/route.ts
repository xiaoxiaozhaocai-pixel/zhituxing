import { NextResponse } from 'next/server';
import { INDUSTRY_MAP } from '@/lib/industry-map/data';

/**
 * GET /api/industry-map
 * 返回行业地图聚合数据（公司卡片 / 岗位面经聚合 / 省份聚合）。
 * 数据来自面经库 5 场真实面经，已脱敏聚合，守四真。
 */
export async function GET() {
  return NextResponse.json(INDUSTRY_MAP);
}
