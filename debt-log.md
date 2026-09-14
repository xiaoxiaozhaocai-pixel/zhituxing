# debt-log — 技术债台账

> 圣经机制（v3.1）：每次迭代违规自动修复并记录于此；巡检（L1-L7）与人工发现的违规/遗留均登记。
> 状态：✅已修复 / 🟡已豁免 / 🔴待处理

| 日期 | 层级 | 问题 | 处理 | 状态 |
|---|---|---|---|---|
| 2026-09-14 | L6.2 admin | universities/[id]/admins 三 handler 零鉴权直查库（管理员邮箱泄露面） | 补 requireAdmin（巡检新检查项首捕） | ✅ |
| 2026-09-14 | L3 安全 | js-yaml 2×high + hono 3×moderate CVE | override js-yaml≥3.15.2/≥4.3.2 + hono 4.13.7（9b4aefb） | ✅ |
| 2026-09-14 | L1 巡检 | 圣经 v3.1 新增 1.6/1.7/1.8 三条检查项 | 写入巡检工单，明晚 23:04 生效 | ✅ |
| 2026-09-14 | 代码健康 | console.log 142 处生产噪音/潜在泄露 | 批量清理（本次提交） | ✅ |
| 2026-09-13 | L6 admin | export/batch-import 读错 env 名 SUPABASE_SERVICE_KEY | 改 SUPABASE_SERVICE_ROLE_KEY 优先+旧名 fallback | ✅ |
| 2026-09-09 | 安全 | Dependabot 4 漏洞等上游补丁 | 跟踪上游发版 | 🟡 |
| 2026-09-13 | L6.4 admin | 两套 admin API 并存（app/admin/api/* vs 页面内联） | 待统一方案拍板后执行 | 🔴 |
