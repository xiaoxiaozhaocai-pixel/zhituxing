/**
 * 付费引导文案模板 — 会员体系 v2
 * 免费用户触发付费功能时，不直接拒绝，而是展示价值预览 + 引导付费
 */

import type { FeatureType } from '@/lib/quota';

export interface PaymentGuide {
  /** 功能价值一句话描述 */
  value: string;
  /** 触发限制时展示的引导文案 */
  paywall: string;
}

export const PAYMENT_GUIDES: Record<FeatureType, PaymentGuide> = {
  career_planning: {
    value: 'AI帮你梳理职业方向，匹配适合岗位',
    paywall: `🎯 职业规划免费额度已用完～

但小职已经帮你分析了初步方向，开通会员解锁全部能力：

✅ 完整职业路径规划
✅ 技能差距诊断
✅ 行业前景对比
✅ 个性化成长路线图

💎 ¥9.9/月，无限次使用`,
  },
  interview: {
    value: '真实校招面试模拟，4轮流程+STAR反馈',
    paywall: `🎯 模拟面试3次免费额度已用完～

开通会员解锁无限面试：

✅ 简历初筛→HR面→业务面→高管终面
✅ STAR法则面试反馈
✅ 针对性改进建议

💎 ¥9.9/月，随时练习`,
  },
  assessment: {
    value: '专业能力测评，定位你的真实水平',
    paywall: `🎯 能力测评5次免费额度已用完～

开通会员解锁：

✅ 不限次数专业测评
✅ 多维度技能雷达图
✅ 对标岗位能力差距分析

💎 ¥9.9/月`,
  },
  competency: {
    value: '岗位胜任力精准匹配，看看你和目标岗位差在哪',
    paywall: `🔒 胜任力分析是会员专属功能～

它能帮你：
✅ 岗位JD vs 你的技能精准对比
✅ 多维度胜任力雷达图
✅ 补齐差距的学习路径

💎 ¥9.9/月解锁`,
  },
  decision: {
    value: '数据驱动考研vs就业决策，不靠感觉',
    paywall: `🎯 求职决策3次免费额度已用完～

开通会员解锁：

✅ 不限次数考研vs就业对比
✅ 行业薪资数据支撑
✅ 个人化时间线规划

💎 ¥9.9/月`,
  },
  resume_optimize: {
    value: 'AI简历诊断+智能优化，通过率提升显著',
    paywall: `🔒 简历优化是会员专属功能～

它能帮你：
✅ AI诊断简历47个问题点
✅ STAR法则智能重写
✅ JD匹配度评分
✅ 一键优化建议

💎 ¥9.9/月解锁`,
  },
};
