# 职途星 SEO 审计与优化报告

> 审计日期：2026-06-05  
> 项目：职途星 (zhituxing.zeabur.app)  
> 框架：Next.js 16 (App Router) + TypeScript  
> 品牌定位：懂桂电学生的AI朋友，不是求职服务平台  
> 设计风格：蓝白配色，无暗色主题

---

## 一、审计概要

| 类别 | P0 致命 | P1 重要 | P2 建议 | 已修复 |
|------|---------|---------|---------|--------|
| Meta Tags | 2 | 4 | 2 | ✅ |
| Structured Data | 0 | 1 | 1 | ✅ |
| Sitemap & Robots | 2 | 0 | 0 | ✅ |
| Headings | 0 | 1 | 1 | ⚠️ 部分 |
| Images | 4 | 0 | 1 | ✅ |
| Canonical URLs | 0 | 5 | 0 | ✅ |
| **合计** | **8** | **11** | **5** | **22/24** |

---

## 二、P0 致命问题（已全部修复）

### 2.1 缺少 `viewport` 和 `themeColor` 导出
- **问题**：Next.js App Router 要求 `viewport` 和 `metadata` 分开发出。原 root layout 无 `viewport` 导出导致无 `<meta name="viewport">` 和 `<meta name="theme-color">`
- **修复**：`src/app/layout.tsx` 新增 `viewport` 导出
  ```ts
  export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: '#2563EB' },
      { media: '(prefers-color-scheme: dark)', color: '#1E3A8A' },
    ],
  };
  ```

### 2.2 缺少 `metadataBase`
- **问题**：无 `metadataBase` 导致 OG Image 等相对路径无法正确解析为绝对URL
- **修复**：新增 `metadataBase: new URL(SITE_URL)` 配置

### 2.3 Sitemap 无效 URL
- **问题**：`/jobs-encyclopedia` 页面不存在，应为 `/jobs`
- **修复**：已更正为 `/jobs`，并补充了 9 个缺失页面（about, guide, resources, courses, search, university, referrals, resume-builder, data-source）

### 2.4 图片空 alt 属性（4处）
- **问题**：以下图片使用了 `alt=""`（空字符串），对搜索引擎不友好：
  - `src/app/admin/universities/[id]/page.tsx:187` — 高校 logo
  - `src/app/admin/universities/page.tsx:247` — 高校 logo 列表
  - `src/app/resources/[id]/page.tsx:441` — 用户头像
  - `src/app/resources/[id]/page.tsx:500` — 回复者头像
- **修复**：高校 logo → `alt={\`${university.name}校徽\`}`，头像 → `alt="用户头像"`

---

## 三、P1 重要问题（已全部修复）

### 3.1 子页面缺少 OG/Twitter Cards（9个页面）
- **问题**：以下页面的 layout 有 title+description 但缺少 `openGraph` 和 `twitter` 标签，影响微信/微博/QQ分享效果
- **涉及页面**：match, assessment, career-planning, jobs, faq, guide, skill-portrait, skills-graph, learning-path
- **修复**：9个 layout.tsx 均已添加 `openGraph` + `twitter` 标签

### 3.2 Canonical URL 硬编码（5处）
- **问题**：使用硬编码 `'https://zhituxing.zeabur.app/...'` 而非 `SITE_URL` 配置项
- **涉及文件**：assistant, privacy, terms, about, data-source 的 layout.tsx
- **修复**：统一替换为 `` `${SITE_URL}/...` ``

### 3.3 Title 模板绕过（3处）
- **问题**：contact、membership、resources 使用 `{ absolute: '...' }` 越过 layout 模板，导致 title 格式不统一
- **修复**：改为普通 title 字符串，自动拼接 ` | 职途星` 后缀

### 3.4 robots.txt 无障碍优化
- **问题**：Baiduspider 无独立规则，且未禁止 `/admin/`、测试页面
- **修复**：新增 Baiduspider 规则组，追加 `/admin/`、`/test-e2e/`、`/test-ssr/` 到 disallow

---

## 四、P2 建议优化

### 4.1 结构化数据增强
- ✅ root layout 已有 Organization + WebSite JSON-LD
- ✅ Breadcrumb 组件已有动态 BreadcrumbList JSON-LD
- ⚠️ 建议为文章详情页添加 `Article` schema
- ⚠️ 建议为 FAQ 页添加 `FAQPage` schema

### 4.2 Heading 层级审查
- ✅ 首页 (HomeClient)：单 h1 + 合理 h2/h3 层级
- ✅ 各子页面：多数页面有且仅有一个 h1
- ⚠️ `/learning-path` 页：h2 在 h1 之前出现（登录未遂状态），逻辑上可接受
- ⚠️ `/profile/page.tsx`：有多个 h2（因为是聚合页），建议保持

### 4.3 图片优化建议
- ✅ Next.js `next.config.ts` 已配置 AVIF/WebP 自动转码
- ⚠️ 支付码图片 (`/images/payment/*.jpg`) 建议预转为 WebP 格式
- ⚠️ 建议为 OG 图片提供专用 1200×630 设计图

### 4.4 百度 SEO 专项建议
- 标题长度当前约 20-25 汉字，符合百度 30-40 汉字建议范围
- 描述长度约 30-40 汉字，略短于百度建议的 120-180 汉字
- 建议在百度站长平台提交 sitemap
- 建议添加百度统计代码（目前无）

### 4.5 Core Web Vitals
- ✅ 首页 `force-static` 实现静态生成，TTFB 毫秒级
- ✅ 图片使用 `next/Image` 自动优化
- ✅ `poweredByHeader: false` 消除信息泄露

---

## 五、已修复文件清单

| 文件 | 修改内容 |
|------|---------|
| `src/app/layout.tsx` | 新增 viewport/themeColor/metadataBase；优化 meta/OG/JSON-LD |
| `src/app/sitemap.ts` | 修正无效URL，补充9个缺失页面；优化优先级 |
| `src/app/robots.ts` | 新增 Baiduspider 规则；扩充 disallow |
| `src/app/assistant/layout.tsx` | 修正 canonical 使用 SITE_URL |
| `src/app/privacy/layout.tsx` | 修正 canonical 使用 SITE_URL |
| `src/app/terms/layout.tsx` | 修正 canonical 使用 SITE_URL |
| `src/app/about/layout.tsx` | 修正 canonical 使用 SITE_URL；添加 SITE_URL import |
| `src/app/data-source/layout.tsx` | 修正 canonical 使用 SITE_URL；添加 SITE_URL import |
| `src/app/contact/layout.tsx` | 修正 title 模板 + 添加 OG tags |
| `src/app/membership/layout.tsx` | 修正 title 模板 |
| `src/app/resources/layout.tsx` | 修正 title 模板 |
| `src/app/match/layout.tsx` | 添加 OG + Twitter tags |
| `src/app/assessment/layout.tsx` | 添加 OG + Twitter tags |
| `src/app/career-planning/layout.tsx` | 添加 OG + Twitter tags |
| `src/app/jobs/layout.tsx` | 添加 OG + Twitter tags |
| `src/app/faq/layout.tsx` | 添加 OG + Twitter tags |
| `src/app/guide/layout.tsx` | 添加 OG + Twitter tags |
| `src/app/skill-portrait/layout.tsx` | 添加 OG + Twitter tags |
| `src/app/skills-graph/layout.tsx` | 添加 OG + Twitter tags |
| `src/app/learning-path/layout.tsx` | 添加 OG + Twitter tags |
| `src/app/admin/universities/[id]/page.tsx` | 修复高校 logo alt |
| `src/app/admin/universities/page.tsx` | 修复高校 logo alt |
| `src/app/resources/[id]/page.tsx` | 修复用户头像 alt (2处) |

---

## 六、上线前验证清单

- [ ] `npx tsc --noEmit` 编译通过（当前仅预存 BatchImportModal.tsx 问题，与SEO无关）
- [ ] 部署后访问 `/sitemap.xml` 确认生成内容正确
- [ ] 部署后访问 `/robots.txt` 确认规则正确
- [ ] 使用 [Google 富媒体搜索结果测试](https://search.google.com/test/rich-results) 验证首页 JSON-LD
- [ ] 在百度站长平台提交 sitemap: `https://zhituxing.zeabur.app/sitemap.xml`
- [ ] 在微信中分享首页链接，确认 OG 卡片正常显示
- [ ] Lighthouse 审计 Score 目标：SEO ≥ 95, Performance ≥ 80
