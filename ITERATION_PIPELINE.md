# 职途星自动化迭代管道 v1.0

> 创建：2026-06-05 | 每次迭代自动跑6层检查，全PASS才push部署

## 管道总览

```
迭代触发 → L1架构圣经 → L2 TypeScript → L3安全 → L4性能 → L5 SEO → L6构建 → L7冒烟 → 全PASS → push部署
                                ↓ 任一层FAIL
                         记录debt-log → 自动修复(可修复项) / 阻断(不可修复项)
```

## 6层检查明细

### L1 架构圣经 (ARCHITECTURE_BIBLE_CHECKLIST.md)
| # | 检查项 | 命令 | 来源 |
|---|--------|------|------|
| 1.1 | 定位文案 | `grep "求职服务平台\|求职平台" src/app/ -rn` | 圣经3.0 |
| 1.2 | 入口交互残留 | `grep "agentFeatures\|AgentCard\|agentGallery" src/ -rni` | 圣经3.0 |
| 1.3 | 用户文案"智能体" | `grep "智能体" src/app/ --include="*.tsx" -rn` | 圣经3.0 |
| 1.4 | 暗色主题 | `grep "\.dark\|@custom-variant dark" src/app/globals.css` | 圣经3.0 |
| 1.5 | 内容红线 | `grep "答辩" src/ -rn` | 圣经3.0 |

### L2 TypeScript 合规
| # | 检查项 | 命令 | 阈值 |
|---|--------|------|------|
| 2.1 | 零类型错误 | `npx tsc --noEmit` | 0 error |
| 2.2 | any回归 | `grep ": any" src/ --include="*.tsx" --include="*.ts" -rn` | 0 |

### L3 安全审计 (SECURITY_AUDIT_REPORT.md)
| # | 检查项 | 命令 | 来源 |
|---|--------|------|------|
| 3.1 | 依赖高危漏洞 | `pnpm audit --audit-level=high` | 安全报告 |
| 3.2 | Admin认证中间件 | `grep "requireAdmin" src/app/admin/api/ -rl \| wc -l` | P0-2 |
| 3.3 | SSRF域名白名单 | `grep "ALLOWED_DOMAINS" src/app/api/fetch-jd/route.ts` | P0-3 |
| 3.4 | CSRF中间件 | `test -f src/middleware.ts` | P0-4 |
| 3.5 | user_type防篡改 | `grep "user_type" src/app/api/user/profile/route.ts` | P0-1 |

### L4 性能基线 (PERF_AUDIT_REPORT.md)
| # | 检查项 | 命令 | 阈值 |
|---|--------|------|------|
| 4.1 | next/image | `grep "next/image" src/ --include="*.tsx" -r \| wc -l` | ≥10 |
| 4.2 | dynamic懒加载 | `grep "dynamic(" src/ --include="*.tsx" -r \| wc -l` | ≥3 |
| 4.3 | drizzle devDeps | `node -e "const p=require('./package.json');process.exit(p.devDependencies['drizzle-orm']?0:1)"` | 在devDeps |
| 4.4 | Suspense边界 | `grep "Suspense" src/ --include="*.tsx" -r \| wc -l` | ≥2 |

### L5 SEO/文案 (SEO_AUDIT_REPORT.md)
| # | 检查项 | 命令 | 来源 |
|---|--------|------|------|
| 5.1 | meta描述统一 | `grep "懂桂电学生的AI朋友——小职" src/app/layout.tsx` | P0 |
| 5.2 | metadataBase | `grep "metadataBase" src/app/layout.tsx` | P0 |
| 5.3 | viewport导出 | `grep "viewport" src/app/layout.tsx` | P0 |
| 5.4 | sitemap条目 | `curl -s https://zhituxing.tech/sitemap.xml \| grep -c "<loc>"` | ≥10 |
| 5.5 | 空alt | `grep 'alt=""' src/ --include="*.tsx" -rn \| grep -v "decoration\|presentation"` | 0 |

### L6 构建验证
| # | 检查项 | 命令 | 阈值 |
|---|--------|------|------|
| 6.1 | Next build | `npx next build 2>&1 \| tail -3` | success |
| 6.2 | ESLint | `npx next lint --max-warnings 0 2>&1` | 0 error |


### L7 冒烟测试 (scripts/smoke-test.sh)
| # | 检查项 | 命令 | 阈值 |
|---|--------|------|------|
| 7.1 | 核心页面12项 | ===== L7 冒烟测试: https://zhituxing.tech =====

  [0;32m✓[0m 首页
  [0;32m✓[0m 技能图谱
  [0;32m✓[0m 简历优化
  [0;32m✓[0m 技能画像
  [0;32m✓[0m 小职对话
  [0;32m✓[0m 搜索岗位
  [0;32m✓[0m 资源中心
  [0;32m✓[0m 职业规划
  [0;32m✓[0m robots.txt
  [0;32m✓[0m sitemap.xml
  [0;32m✓[0m 后台登录页
  [0;32m✓[0m API健康

[0;32mL7 冒烟测试: 全部通过 ✅[0m | 全部200 |
| 7.2 | 页面标题验证 | 同上（内置grep校验） | 关键词命中 |
| 7.3 | API健康 |  | 200 + "ok" |

## 失败处理

| 层 | P0阻断 | 自动修复 | 手动修复 | 记录debt-log |
|----|--------|---------|---------|-------------|
| L1 | ✅ | sed替换/删除 | — | ✅ |
| L2 | ✅ | — | 改类型 | ✅ |
| L3 | P0阻断/P1放行 | — | 改代码 | ✅ |
| L4 | ❌不阻断 | — | 渐进优化 | ✅ |
| L5 | ✅ | sed替换 | — | ✅ |
| L6 | ✅ | — | 修bug | ✅ |

## 日志格式 (ITERATION_LOG.md)

```markdown
## {日期} {时间} | commit: {sha}
| L1 架构圣经 | ✅ PASS | 0违规 |
| L2 TypeScript | ✅ PASS | 0 error |
| L3 安全审计 | ✅ PASS | 0 high vuln |
| L4 性能基线 | ✅ PASS | 4/4 |
| L5 SEO/文案 | ✅ PASS | 5/5 |
| L6 构建验证 | ✅ PASS | build ✓ |
```

> 关联：ARCHITECTURE_BIBLE_CHECKLIST.md | SOUL.md | 三份审计报告
