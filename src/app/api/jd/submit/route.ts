import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

// 提交JD
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { code: 401, message: '请先登录', data: null },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      job_name,
      industry,
      city,
      company_name,
      company_type,
      salary_min,
      salary_max,
      skills,
      jd_content
    } = body;

    // 验证必填字段
    if (!job_name || !company_name || !jd_content) {
      return NextResponse.json(
        { code: 400, message: '岗位名称、企业名称和JD内容为必填项', data: null },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // 检查是否已存在相同的JD（防止重复上传）
    const { data: existing } = await supabase
      .from('jd_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('job_name', job_name)
      .eq('company_name', company_name)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { code: 400, message: '该JD已上传，请勿重复提交', data: null },
        { status: 400 }
      );
    }

    // 插入数据库
    const { data: result, error: insertError } = await supabase
      .from('jd_submissions')
      .insert({
        user_id: userId,
        job_name,
        industry: industry || null,
        city: city || null,
        company_name,
        company_type: company_type || null,
        salary_min: salary_min || null,
        salary_max: salary_max || null,
        skills: skills || null,
        jd_content,
        status: 0
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('插入JD失败:', insertError);
      return NextResponse.json(
        { code: 500, message: '提交失败，请稍后重试', data: null },
        { status: 500 }
      );
    }

    const submissionId = result?.id;

    // 检查是否满足奖励条件（累计3条审核通过）
    await checkAndGrantReward(userId);

    return NextResponse.json({
      code: 200,
      message: '提交成功！审核通过后，我们会自动为你发放会员奖励',
      data: {
        id: submissionId
      }
    });

  } catch (error) {
    console.error('提交JD失败:', error);
    return NextResponse.json(
      { code: 500, message: '提交失败，请稍后重试', data: null },
      { status: 500 }
    );
  }
}

// 获取我的提交记录
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        { code: 401, message: '请先登录', data: null },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const status = searchParams.get('status');
    const offset = (page - 1) * pageSize;

    const supabase = getSupabaseAdmin();

    // 构建查询
    let query = supabase
      .from('jd_submissions')
      .select('id, job_name, industry, city, company_name, company_type, salary_min, salary_max, skills, status, reject_reason, reward_granted, created_at, reviewed_at', { count: 'exact' })
      .eq('user_id', userId);

    if (status !== null && status !== '') {
      query = query.eq('status', status);
    }

    // 获取列表
    const { data: submissions, count: total, error: queryError } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (queryError) {
      console.error('查询JD列表失败:', queryError);
    }

    // 获取审核通过的总数（用于计算进度）
    const { count: approvedCount } = await supabase
      .from('jd_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 1)
      .eq('reward_granted', false);

    // 获取用户会员状态
    const { data: user } = await supabase
      .from('users')
      .select('member_type, member_expire_time, is_lifetime_member')
      .eq('id', userId)
      .maybeSingle();

    return NextResponse.json({
      code: 200,
      data: {
        list: submissions || [],
        pagination: {
          page,
          pageSize,
          total: total || 0
        },
        progress: {
          approved: approvedCount || 0,
          required: 3,
          remaining: Math.max(0, 3 - (approvedCount || 0)),
          isComplete: (approvedCount || 0) >= 3,
          isLifetimeMember: user?.is_lifetime_member || false,
          currentReward: (approvedCount || 0) >= 3 ? '终身会员' : ((approvedCount || 0) >= 3 ? `${approvedCount}/3` : null)
        },
        memberStatus: {
          isMember: !!user?.member_type || user?.is_lifetime_member,
          isLifetimeMember: user?.is_lifetime_member || false,
          memberType: user?.member_type || null,
          expireTime: user?.member_expire_time
        }
      }
    });

  } catch (error) {
    console.error('获取提交记录失败:', error);
    return NextResponse.json(
      { code: 500, message: '获取失败', data: null },
      { status: 500 }
    );
  }
}

// 检查并发放奖励
async function checkAndGrantReward(userId: string) {
  try {
    const supabase = getSupabaseAdmin();

    // 检查审核通过的JD数量（未领取奖励的）
    const { count: approvedCount } = await supabase
      .from('jd_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 1)
      .eq('reward_granted', false);

    // 获取用户会员状态
    const { data: user } = await supabase
      .from('users')
      .select('member_type, is_lifetime_member')
      .eq('id', userId)
      .maybeSingle();

    // 如果已有终身会员，不再发放
    if (user?.is_lifetime_member) {
      return;
    }

    // 检查是否满足奖励条件（3条审核通过）
    if ((approvedCount || 0) >= 3) {
      // 标记所有已审核的JD为已发放奖励
      await supabase
        .from('jd_submissions')
        .update({ reward_granted: true })
        .eq('user_id', userId)
        .eq('status', 1);

      // 如果用户已有月度会员，延长6个月
      if (user?.member_type) {
        const { error: rpcError } = await supabase.rpc('extend_membership', {
          p_user_id: userId,
          p_months: 6
        });
        
        if (rpcError) {
          // 如果 RPC 不存在，直接更新
          await supabase
            .from('users')
            .update({ 
              member_expire_time: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString() 
            })
            .eq('id', userId);
        }
      } else {
        // 开通终身会员
        await supabase
          .from('users')
          .update({
            is_lifetime_member: true,
            member_type: 'lifetime',
            member_expire_time: '2099-12-31 23:59:59'
          })
          .eq('id', userId);
      }

      // 更新配额表
      await supabase
        .from('user_quotas')
        .upsert({
          user_id: userId,
          member_type: 'lifetime',
          quota: -1,
          used_quota: 0,
          member_expires_at: '2099-12-31 23:59:59'
        }, { onConflict: 'user_id' });
    }
  } catch (error) {
    console.error('检查奖励失败:', error);
  }
}
