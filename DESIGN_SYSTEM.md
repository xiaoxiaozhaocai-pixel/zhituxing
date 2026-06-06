# 职途星 2026 设计系统 v3.0

> 最后更新：2026-06-06 | 绑定 commit `8d9a659`

## 核心哲学

**「清爽、可信、有温度」** — 大学生求职不应有压迫感，界面应该像一位耐心的朋友。

## 颜色系统

| Token | 值 | 用途 |
|-------|------|------|
| `--primary` | `#165DFF` | 主色，CTA按钮，链接，选中态 |
| Primary Light | `#3D7FFF` | 渐变终点，hover 态 |
| 会员强调 | `#FF7D00` | 会员按钮、会员标识 |
| 文字主 | `#1E293B` (slate-800) | 标题、正文 |
| 文字辅 | `#64748B` (slate-500) | 描述文字 |
| 文字弱 | `#94A3B8` (slate-400) | 辅助信息 |
| 背景 | `#FFFFFF` | 主背景 |
| 背景灰 | `#F8FAFC` (slate-50) | 分区背景 |
| 背景蓝 | `#EEF2FF` (indigo-50) | 品牌色分区 |

## 设计模式

### 玻璃态 (Glassmorphism)
```css
.glass          /* 半透明玻璃 — 导航栏默认态 */
.glass-strong   /* 强玻璃 — 导航栏滚动态、下拉面板 */
.glass-card     /* 轻薄玻璃 — 卡片、标签 */
```
使用场景：导航栏、下拉菜单、悬浮卡片、快捷面板

### Bento Grid
```css
.bento-grid     /* 响应式网格容器 */
.bento-card     /* 卡片单元（含 hover 光斑效果） */
.bento-card.bento-featured /* 大卡片（跨2列2行） */
```
使用场景：功能展示、内容聚合、Dashboard

### 有机装饰 (Organic Blobs)
```css
.blob-primary   /* 蓝色光斑 */
.blob-accent    /* 紫色光斑 */
.blob-warm      /* 橙色光斑 */
```
用法：绝对定位在 Hero/区域背景，`pointer-events-none`

### 渐变按钮
```css
.btn-gradient   /* 主按钮：蓝→浅蓝渐变 + 阴影 */
.btn-member     /* 会员按钮：橙→暖橙渐变 + 阴影 */
```

### 动画
```css
.anim-up        /* 淡入上移 0.6s */
.anim-up-d1~d5  /* 带延迟的淡入上移 */
.hover-lift     /* hover 上浮 4px */
.animate-pulse-ring /* 呼吸光环（小职按钮） */
```

## 视觉规范

### 圆角
- 按钮：`rounded-xl` (0.75rem) 或 `rounded-2xl` (1rem)
- 卡片：`rounded-2xl` (1rem) 或 `rounded-3xl` (1.5rem)
- 输入框：`rounded-xl`
- Tag/徽章：`rounded-full`

### 阴影
- 卡片 hover：`shadow-[0_20px_40px_-12px_rgba(0,0,0,0.08)]`
- 按钮：`shadow-[0_4px_14px_rgba(22,93,255,0.25)]`
- 导航栏：`shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)]`

### 间距
- 页面段：`section-padding` (6rem) / `section-padding-sm` (4rem)
- 卡片内边距：`p-5` 到 `p-8`
- 卡片间距：`gap-5` (1.25rem)

### 字体
- 标题：`font-extrabold` + `heading-tight` (letter-spacing: -0.025em)
- Hero 大标题：`heading-display` (letter-spacing: -0.035em, weight 800)
- 正文：`text-sm` ~ `text-base`，行高 relaxed
- 渐变标题：`text-gradient` (蓝→紫) 或 `text-gradient-warm` (橙→红)

## 组件设计原则

1. **导航栏**：玻璃态，浅色背景，选中态用浅蓝底色+蓝文字（非反色）
2. **卡片**：白底 + 极浅边框 + hover 上浮 + 光斑效果
3. **CTA 区**：深色渐变背景 + 白色按钮，底部页面前最后一段
4. **Footer**：深色 `#0F172A` (slate-900)，5 列网格
5. **图标**：渐变方块容器（`rounded-xl`）+ 白色图标

## 禁止事项

- ❌ 暗色主题（已从 globals.css 移除 `@custom-variant dark`）
- ❌ 过大的阴影（> 24px blur 需设计 review）
- ❌ 纯黑色文字（用 `#1E293B` 替代 `#000`）
- ❌ 超过 3 种颜色的渐变
- ❌ 动画时长超过 0.6s（除非特殊场景）
- ❌ 用户可见文案中使用「智能体」

## 落地检查清单

每次 UI 改动后检查：
- [ ] 色值是否使用 Design Token（非硬编码）
- [ ] 卡片是否有 hover 效果
- [ ] 按钮是否使用 `.btn-gradient` 或 `.btn-member`
- [ ] 移动端是否测试（375px 宽度）
- [ ] 焦点样式是否可见（WCAG 2.1 AA）
