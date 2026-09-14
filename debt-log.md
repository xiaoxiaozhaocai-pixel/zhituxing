# debt-log — 技术债台账

> 圣经机制（v3.1）：每次迭代违规自动修复并记录于此；巡检（L1-L7）与人工发现的违规/遗留均登记。
> 状态：✅已修复 / 🟡已豁免 / ✅ 已清待处理

| 日期 | 层级 | 问题 | 处理 | 状态 |
|---|---|---|---|---|
| 2026-09-14 | L6.2 admin | universities/[id]/admins 三 handler 零鉴权直查库（管理员邮箱泄露面） | 补 requireAdmin（巡检新检查项首捕） | ✅ |
| 2026-09-14 | L3 安全 | js-yaml 2×high + hono 3×moderate CVE | override js-yaml≥3.15.2/≥4.3.2 + hono 4.13.7（9b4aefb） | ✅ |
| 2026-09-14 | L1 巡检 | 圣经 v3.1 新增 1.6/1.7/1.8 三条检查项 | 写入巡检工单，明晚 23:04 生效 | ✅ |
| 2026-09-14 | 代码健康 | console.log 142 处生产噪音/潜在泄露 | 批量清理（本次提交） | ✅ |
| 2026-09-13 | L6 admin | export/batch-import 读错 env 名 SUPABASE_SERVICE_KEY | 改 SUPABASE_SERVICE_ROLE_KEY 优先+旧名 fallback | ✅ |
| 2026-09-09 | 安全 | Dependabot 4 漏洞等上游补丁 | 跟踪上游发版 | 🟡 |
| 2026-09-13 | L6.4 admin | ~~两套 admin API~~（9-14 已统一至 /admin/api/*，16 端点鉴权齐 requireAdmin） 并存（app/admin/api/* vs 页面内联） | 待统一方案拍板后执行 | ✅ 已清 |
| 2026-09-14 | `as any` 19 处残留（supabase 查询转型为主） | 🟡 P2 | 正解=`supabase gen types typescript` 生成 DB 类型统一替换，手工补性价比低 |
| 2026-09-14 | /api/cron/jd-sync 由 Zeabur cron 外部触发（CRON_SECRET 鉴权），仓库内零引用属正常，死路由扫描豁免 | ✅ 已登记 |
| 2026-09-14 | chat/page.tsx 仍 1958 行：JSX 770 行可再拆 Header/消息列表/输入区，props 钻取多、回归风险中，留待下次专项 | 🟡 P2 | 本轮已抽 359 行工具+卡片组件 |
| 2026-09-14 | 死路由 13 个已删除（invite/generate+my-invites、jd/recommend、resume/conversation+refine、similar-users、courses、subscriptions×2、university、user/assessments、chat/session/[id]、migrate-profile-columns） | ✅ 已清 | 备份在 职途星/代码/dead-routes-backup-20260914/ |
| 2026-09-14 | SQL 字符串拼接风险（jd/[id]、orders 等 admin 路由历史风格） | 🟡 P2 | 无注入入口实证（值均服务端生成），统一改参数化查询留专项 |
