/**
 * /api/job-analysis — 单岗位深度分析（独立路由，2026-06-13 重设计 v2 并行版）
 *
 * v2 改动（17:42 主人需求"控制感"）：
 * - 入参增加 dimension（company/daily/salary/skills/apply）→ 5 选 1
 * - 前端发 5 路并行请求，用户得到独立 5 个 Card 而非一长篇
 * - 单维度 prompt 收紧 → input 短 + 响应快 + 单维度内容更精
 *
 * 入参：POST { jobId, dimension }    出参：SSE 流（DeepSeek 标准 chunk + [DONE]）
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { checkFeatureAccess } from '@/lib/quota';
import { jsonError, parseRequestBody, ErrorCode } from '@/lib/api-contracts/_shared';
import { getUserInfoFromRequest, getUserProfileContext } from '@/lib/coze-stream';
import { createDeepSeekRAGStream } from '@/lib/rag-utils';
import { getSupabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
};

const DIMENSIONS = ['company', 'daily', 'salary', 'skills', 'apply'] as const;
type Dimension = typeof DIMENSIONS[number];

const JobAnalysisRequestSchema = z.object({
  jobId: z.string().min(1, 'jobId 不能为空'),
  dimension: z.enum(DIMENSIONS),
});

const DIMENSION_TASK: Record<Dimension, string> = {
  company:
    '【任务】聚焦"公司基本面"维度，输出 200-300 字：\n' +
    '① 公司规模与行业地位（头部/腰部/初创）；② 业务模式与盈利情况；③ 口碑（含负面，如裁员/加班/HR 风评）；④ 近期重大动态（融资/上市/合并/危机）。\n' +
    '信息不足处明确说"建议在企查查/天眼查/小红书自查"，不编造。',
  daily:
    '【任务】聚焦"岗位实际做什么"维度，输出 200-300 字：\n' +
    '重点辨别"画饼"vs"真实工作内容"。把岗位描述里的"参与某战略""推动数字化转型""赋能业务"等宏大叙事，翻译成桂电学生能理解的真实日常（如"做表格""跑流程""协调会议""背 KPI"）。\n' +
    '指出 JD 里夸张/含糊的部分。这岗位每天 8 小时实际在干什么？',
  salary:
    '【任务】聚焦"薪资水平"维度，输出 200-300 字：\n' +
    '对比基准：① 该城市同类岗位市场价；② 桂电 2027 届毕业生平均水平；③ 该行业薪资梯度。\n' +
    '把现金/五险一金/股权/补贴/奖金拆开看。点出"看起来高但实际怎么样"或"基本工资一般但隐性福利好"的真实情况。',
  skills:
    '【任务】聚焦"技能差距"维度，逐条比对【用户已有技能】vs【岗位要求】，输出 200-350 字：\n' +
    '- ✅ 已具备：明确指出哪条匹配\n' +
    '- ⚠️ 部分具备：指出缺口和最快补法（具体到某课程/某项目）\n' +
    '- ❌ 完全缺失：判断是否 deal-breaker；如非硬性，给出 1-2 个月内可补齐的最短路径\n' +
    '没有用户画像时，仅基于桂电大三人力管理 + 健康经历给出通用 gap 分析。',
  apply:
    '【任务】聚焦"投递建议"维度，输出 200-350 字。已知约束：用户 2027 年 7 月毕业（大三下→大四），学校提供 4 个月实习窗口（可异地坐班深圳/上海/北京等），常驻桂林。\n' +
    '- 时间窗适配：这岗位招的是校招/实习/社招？2026 年 6 月这个时间点投合不合适？\n' +
    '- 桂林距离实操：从桂林到岗位所在城市的高铁时间、搬迁成本、能否周末通勤？\n' +
    '- 实习坐班可行性：4 个月窗口能否 cover 该岗位的实习要求？面试形式（线上/线下）能否走通？\n' +
    '- 投递性价比：建议优先冲刺 / 测竞争力 / 保底 / 不投？给一句话决策。\n' +
    '- 简历红线：投这岗位时哪些经历必须重点写、哪些绝对不能写。',
};

function buildAnalysisPrompt(
  job: Record<string, unknown>,
  userContext: string,
  dimension: Dimension,
): string {
  const jobTitle = (job.job_title as string) || '未知岗位';
  const company = (job.company_name as string) || (job.company as string) || '未知公司';
  const city = (job.city as string) || '不限';
  const salary = (job.salary_range as string) || '面议';
  const education = (job.education as string) || '不限';
  const experience = (job.experience as string) || '不限';
  const industry = (job.industry as string) || '综合';
  const freshFriendly = job.fresh_graduate_friendly ? '是' : '否';
  const hardSkills = Array.isArray(job.hard_skills) ? (job.hard_skills as unknown[]).join('、') : '未注明';
  const softSkills = Array.isArray(job.soft_skills) ? (job.soft_skills as unknown[]).join('、') : '未注明';
  const responsibilities = ((job.responsibilities as string) || (job.raw_jd as string) || '').slice(0, 2500);

  const userBlock = userContext
    ? '【用户画像 — 平台自动注入，请基于此分析对该用户而言的价值，禁止重新询问用户背景】\n' + userContext + '\n\n---\n\n'
    : '';

  return userBlock +
    '你是职途星 AI 求职助手「小职」，为桂林电子科技大学（桂电）大三学生提供单岗位深度分析。当前你只负责一个维度，请聚焦该维度即可。\n\n' +
    '【输出格式】\n' +
    '- 直接输出正文，使用自然 Markdown（短段落、必要时用 - 列表 / 加粗），不要再加大标题。\n' +
    '- 事实优先、坦诚直接、不空话不套话、不开场寒暄、不结尾祝顺利。\n' +
    '- 信息不足时坦诚说"公开信息有限，建议核实 XX"，禁止编造具体数据。\n\n' +
    '【待分析岗位】\n' +
    '- 岗位名称：' + jobTitle + '\n' +
    '- 公司：' + company + '\n' +
    '- 城市：' + city + '\n' +
    '- 行业：' + industry + '\n' +
    '- 薪资范围：' + salary + '\n' +
    '- 学历要求：' + education + ' ｜ 经验要求：' + experience + ' ｜ 应届友好：' + freshFriendly + '\n' +
    '- 硬技能要求：' + hardSkills + '\n' +
    '- 软技能要求：' + softSkills + '\n' +
    '- 岗位描述（节选 2500 字内）：\n' + (responsibilities || '（数据库未收录详细岗位描述）') + '\n\n' +
    '---\n\n' +
    DIMENSION_TASK[dimension] + '\n\n' +
    '请直接输出正文，不要任何前言。';
}

export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserInfoFromRequest(request);
    const userId = userInfo?.userId;
    if (!userId) {
      return jsonError(ErrorCode.UNAUTHORIZED, '请先登录后再使用 AI 深度分析');
    }

    const parsed = await parseRequestBody(request, JobAnalysisRequestSchema);
    if (!parsed.ok) return parsed.response;
    const { jobId, dimension } = parsed.data;

    const access = await checkFeatureAccess(userId, 'career_planning');
    if (!access.allowed) {
      return jsonError(ErrorCode.QUOTA_EXCEEDED, access.reason || '配额已用完');
    }

    const supabase = getSupabaseAdmin();
    const { data: job, error: jobErr } = await supabase
      .from('job_descriptions')
      .select('*')
      .eq('id', jobId)
      .single();
    if (jobErr || !job) {
      return jsonError(ErrorCode.NOT_FOUND, '该岗位不存在或已下架');
    }

    const userContext = await getUserProfileContext(userId);
    const systemPrompt = buildAnalysisPrompt(job, userContext || '', dimension);
    const triggerMessage = '请按照系统指令完成该维度的深度分析。';

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`[job-analysis] DeepSeek stream timeout 60s, dim=${dimension}`);
      timeoutController.abort();
    }, 60000);
    if (request.signal) {
      request.signal.addEventListener('abort', () => {
        console.log(`[job-analysis] Client disconnected, dim=${dimension}`);
        timeoutController.abort();
      }, { once: true });
    }

    const baseStream = createDeepSeekRAGStream(systemPrompt, triggerMessage, [], timeoutController.signal);

    const wrapped = new ReadableStream({
      async start(controller) {
        const reader = baseStream.getReader();
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) {
          console.error(`[job-analysis] stream error dim=${dimension}:`, e);
        } finally {
          clearTimeout(timeoutId);
          controller.close();
        }
      },
    });

    return new Response(wrapped, { headers: SSE_HEADERS });
  } catch (e) {
    console.error('[job-analysis] fatal error:', e);
    return jsonError(ErrorCode.INTERNAL_ERROR, '深度分析服务暂时不可用，请稍后重试');
  }
}
