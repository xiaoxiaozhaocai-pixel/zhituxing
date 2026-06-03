/**
 * /api/membership Zod 契约
 *
 * 端点：
 * - GET /api/membership   取当前用户会员状态（包含配额聚合）
 *
 * 历史 dead bug（本次治理）：
 *   1. 旧响应用 { code:200, data:{ user_type, membership_type, ... } } (snake_case + code 字段)
 *      但 MembershipContext.refresh() 读 json.success + data.membershipType/isMember/...
 *      → 整个 Context 状态永远停在 free，所有 useMembership() 调用方（learning-path/assessment/skills-graph/Navbar）会员永远显示付费墙
 *   2. MembershipContext.upgrade() POST /api/membership 但 API 根本没有 POST handler（405），永远返 false
 *      → PaywallModal 套餐点击点了无效，需配套改为跳转 /membership 真实下单流程
 *
 * 治理方案：
 *   - GET 响应统一 camelCase，并暴露 isMember/membershipPlan 派生字段供前端直接消费
 *   - MembershipContext 删除 upgrade 死代码，仅保留 refresh + 状态展示
 *   - POST 不再保留，开通会员走 /api/orders 真实流程
 */
import { z } from 'zod';

/** 会员类型：free | monthly | semester | annual | lifetime，向后兼容用 string */
export const MembershipDataSchema = z.object({
  /** 用户原始类型（free / monthly / semester / annual / lifetime） */
  userType: z.string(),
  /** = userType 别名（兼容旧字段命名） */
  membershipType: z.string(),
  /** 当前生效套餐 key（非 free && !isExpired 时同 userType；free 或已过期时 null） */
  membershipPlan: z.string().nullable(),
  /** 是否为有效会员（userType !== 'free' && !isExpired） */
  isMember: z.boolean(),
  /** 是否已过期（lifetime 永不过期） */
  isExpired: z.boolean(),
  /** 会员到期时间 ISO 字符串（lifetime / free 时 null） */
  membershipExpiresAt: z.string().nullable(),
  monthlyQuota: z.number(),
  usedQuota: z.number(),
  remainingQuota: z.number(),
  interviewQuota: z.number(),
  assessmentQuota: z.number(),
});
export type MembershipData = z.infer<typeof MembershipDataSchema>;
