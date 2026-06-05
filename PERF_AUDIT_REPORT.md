# 职途星性能审计报告

> 审计日期：2026-06-05 | 审计范围：全项目（Next.js 16 + React 19 + Tailwind CSS 4）

---

## 一、总体评估

| 维度 | 状态 | 评分 |
|------|------|------|
| Core Web Vitals 预期 | LCP 2-4s / FCP 1.5-3s | 🟡 中等 |
| JS Bundle 大小 | 预估首屏 ~350KB+ gzip | 🟡 偏大 |
| 图片优化 | 仅1处使用 next/image | 🔴 严重不足 |
| 字体加载 | 系统字体栈 + preconnect | 🟢 良好 |
| 代码分割 | 仅 InspectorWrapper 使用 dynamic() | 🔴 严重不足 |
| 流式渲染 | 6处使用 Suspense | 🟢 良好 |
| 静态生成 | 首页已 force-static | 🟢 良好 |

---

## 二、逐项诊断

### 🔴 P0 — 紧急修复（直接影响用户体验和Bundle大小）

#### P0-1：resume-builder 顶层静态导入重型库（html2canvas + jsPDF）

**文件**：`src/app/resume-builder/page.tsx:11-12`
**问题**：在文件顶部直接 `import html2canvas from 'html2canvas'` 和 `import jsPDF from 'jspdf'`，导致这两个库（合计 ~500KB gzip）被打包进 resume-builder 页面的主 bundle，即使用户仅浏览该页面、不导出 PDF 也会加载。
**影响**：resume-builder 页面 JS bundle 增大约 500KB，LCP 延迟 1-2 秒。
**优先级**：🔴 紧急

**优化方案**：改为动态导入，已在 `src/lib/dynamic-imports.ts` 中定义了辅助函数，直接使用即可。

#### P0-2：多处使用原生 `<img>` 标签，未用 `next/image` 优化

**文件**：
- `src/app/membership/page.tsx` — 2处 `<img>`（会员方案图片）
- `src/app/referrals/page.tsx` — 1处 `<img>`（公司Logo）
- `src/app/referrals/[id]/page.tsx` — 1处 `<img>`（公司Logo）
- `src/app/admin/universities/page.tsx` — 1处 `<img>`（高校Logo）
- `src/app/admin/universities/[id]/page.tsx` — 1处 `<img>`（高校Logo）
- `src/app/resources/[id]/page.tsx` — 3处 `<img>`（文章图片、头像）

**问题**：原生 `<img>` 标签无法享受 next/image 的自动 WebP/AVIF 转换、响应式 srcset、懒加载、placeholder 等优化。
**影响**：LCP 增加（大图未优化），CLS 增加（无 width/height），带宽浪费。
**优先级**：🔴 紧急

#### P0-3：drizzle-kit 误放在 dependencies 中

**文件**：`package.json`
**问题**：`drizzle-kit`（数据库迁移工具）被放在 `dependencies` 而非 `devDependencies`，导致生产构建时多安装 ~20MB 的无关依赖。
**影响**：node_modules 增大，CI/CD 安装时间增加，bundle 间接增大。
**优先级**：🔴 紧急

#### P0-4：Admin 全部页面无懒加载，影响首屏

**文件**：`src/app/admin/layout.tsx` 及其所有子页面
**问题**：所有 admin 页面都是 `'use client'`，且无任何 `dynamic()` 懒加载。Admin 在登录校验前就已经加载了全部 JS。同时 admin layout 本身是客户端组件，在服务端渲染时会执行完整 JS。
**影响**：虽然 admin 页面普通用户不访问，但 admin layout 里的 `useEffect` 和 `fetch` 会在每次导航时执行，影响 TTI。
**优先级**：🔴 紧急

---

### 🟡 P1 — 重要优化（SEO排名和用户体验）

#### P1-1：assistant/page.tsx 为巨型单体组件（1649行）

**文件**：`src/app/assistant/page.tsx`
**问题**：1649行单一文件，包含：
- 7个Bot的欢迎文案（共 ~80行）
- Bot配置数组（~150行）
- 完整的聊天逻辑（SSE流、消息管理、文件上传、dispatch card、登录弹窗等）
- 多个内联对话框组件

该文件是项目最大的页面，严重阻碍了 tree-shaking 和代码分割。
**影响**：assistant 页面的首屏 JS bundle 显著过大，TTI 增加。
**优先级**：🟡 重要

#### P1-2：HomeClient 使用 `<style jsx global>` 运行时 CSS-in-JS

**文件**：`src/app/HomeClient.tsx:127-154`
**问题**：在组件内部使用 `<style jsx global>` 定义了动画关键帧和骨架屏样式。Next.js + Tailwind CSS 4 项目使用 styled-jsx 是不必要的，增加了运行时 CSS 注入开销。
**影响**：首页渲染时需要运行时注入 CSS，FCP 延迟 ~50-100ms。
**优先级**：🟡 重要

#### P1-3：缺少根路由和 /admin 路由的 loading.tsx

**问题**：根路由（`/`）和 `/admin` 路由均无 `loading.tsx` 文件。虽然首页已静态生成，但 admin 路由在权限校验中会短暂白屏。
**影响**：admin 页面首次访问时无加载指示，体验不佳。
**优先级**：🟡 重要

#### P1-4：大型 admin 页面无代码分割

**文件**：
- `admin/skills/page.tsx` (667行)
- `admin/jd-sync/page.tsx` (589行)
- `admin/orders/page.tsx` (567行)
- `admin/jd-review/page.tsx` (527行)
- `admin/jd/page.tsx` (520行)
- `admin/users/page.tsx` (508行)

**问题**：6个超过500行的 admin 页面都直接作为 page.tsx 导出，无 dynamic() 懒加载。
**影响**：第一次访问 admin 任一页面时加载所有这些页面的代码。
**优先级**：🟡 重要

---

### 🟢 P2 — 建议优化（锦上添花）

#### P2-1：@aws-sdk 包体积大

**文件**：`package.json`
**问题**：`@aws-sdk/client-s3` 和 `@aws-sdk/lib-storage` 合计约 2MB+，但可能只在特定功能中使用（如文件上传到S3）。
**影响**：如果未使用动态导入，会增大所有页面的 bundle。
**优先级**：🟢 建议

#### P2-2：lucide-react 图标按需导入检查

**文件**：多个文件
**问题**：lucide-react 虽然已在 `optimizePackageImports` 中，但部分页面导入了大量图标（assistant/page.tsx 导入了16个图标，HomeClient 导入了12个）。应确保每个导入的图标都被实际使用。
**优先级**：🟢 建议

#### P2-3：Navbar.tsx 可拆分为服务端组件 + 客户端岛屿

**文件**：`src/components/Navbar.tsx` (359行)
**问题**：Navbar 使用 `'use client'` 包含导航链接和认证状态。静态导航链接部分可以提取为服务端组件，仅认证状态部分保持客户端。
**优先级**：🟢 建议

#### P2-4：CookieConsent.tsx 体积偏大

**文件**：`src/components/CookieConsent.tsx` (317行)
**问题**：Cookie 同意横幅317行，包含大量文案和动画逻辑。应使用 `dynamic()` 懒加载，仅在用户未同意时展示。
**优先级**：🟢 建议

#### P2-5：建议添加 next/font 优化中文字体子集

**文件**：`src/app/globals.css`
**问题**：当前使用系统字体栈（PingFang SC 等），虽然对中文场景合理，但可考虑使用 `next/font/local` + 子集化常用字来减少 FOIT。
**优先级**：🟢 建议

---

## 三、优化优先级排序

| # | 优化项 | 预期效果 | 工作量 | 优先级 |
|---|--------|----------|--------|--------|
| 1 | resume-builder 动态导入 html2canvas/jsPDF | JS -500KB | 15min | 🔴 P0 |
| 2 | 替换 `<img>` 为 next/image | LCP -0.5~1s | 30min | 🔴 P0 |
| 3 | drizzle-kit → devDependencies | node_modules -20MB | 2min | 🔴 P0 |
| 4 | Admin 页面懒加载 | 首屏 JS -200KB | 30min | 🔴 P0 |
| 5 | 拆分 assistant/page.tsx | TTI -1~2s | 2h | 🟡 P1 |
| 6 | HomeClient 样式迁移到 globals.css | FCP -50ms | 20min | 🟡 P1 |
| 7 | 添加 loading.tsx | 感知性能提升 | 10min | 🟡 P1 |
| 8 | Admin 大页面代码分割 | 按需加载 | 1h | 🟡 P1 |

---

## 四、附录

### A. 当前已有的优化措施（亮点）

1. ✅ `next.config.ts` 已配置 `optimizePackageImports`（lucide-react, recharts, @radix-ui/*）
2. ✅ `next.config.ts` 已配置图片格式优化（AVIF + WebP）、响应式尺寸
3. ✅ `next.config.ts` 已配置生产环境 `removeConsole`
4. ✅ `next.config.ts` 已配置 `poweredByHeader: false`
5. ✅ 首页已使用 `force-static` 静态生成 + Server Component 包装
6. ✅ `dynamic-imports.ts` 已提供 jspdf/html2canvas/xlsx 的动态导入辅助函数
7. ✅ `FileImportModule.tsx` 已对 mammoth/pdf-parse 使用动态导入
8. ✅ `BatchImportModal.tsx` 已对 xlsx 使用动态导入
9. ✅ PDF 生成组件已使用 `loadHtml2Canvas()` 动态导入
10. ✅ assistant 页面已使用 Suspense 包裹

### B. 文件大小 Top 10（page.tsx）

| 文件 | 行数 |
|------|------|
| assistant/page.tsx | 1649 |
| profile/page.tsx | 1431 |
| profile/info/page.tsx | 1406 |
| skill-portrait/page.tsx | 1387 |
| jobs/page.tsx | 1154 |
| auth/page.tsx | 758 |
| career-planning/page.tsx | 750 |
| admin/skills/page.tsx | 667 |
| admin/jd-sync/page.tsx | 589 |
| admin/orders/page.tsx | 567 |

### C. next/image 使用情况

项目中仅 **1个文件** 使用了 `next/image`（`admin/orders/page.tsx`），其余所有 `<img>` 标签均为原生 HTML 标签。

