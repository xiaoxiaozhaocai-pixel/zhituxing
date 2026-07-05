# 小职前端设计系统（职途星）

## 技术栈
- Next.js (App Router) + React + TypeScript
- Tailwind CSS（样式框架）
- Radix UI（基础组件库，@radix-ui/react-*）
- shadcn/ui 风格组件封装
- Supabase（后端/BaaS）
- Zeabur 部署

## 设计 Token（globals.css）
| Token | 值 | 用途 |
|-------|-----|------|
| `--primary` | `#165DFF` | 品牌蓝 |
| `--ring` | `#165DFF` | 聚焦环 |
| 会员金 | `#FF7D00` | 会员/付费标识 |
| 背景 | `#f8fafd→white→#f0f5ff/40` | 页面渐变 |
| 按钮渐变 | `from-[#165DFF] to-[#3D7FFF]` | 主按钮 |
| 圆角 | `--radius: 0.625rem` | 基础圆角 |

## 可用组件
- Radix UI 基础组件 + shadcn/ui 封装
- 自定义组件在 `src/components/ui/`
- 布局：Navbar / Footer / ToastProvider
- 卡片：bento-card / glass-card
- 按钮：btn-gradient / btn-member

## 设计规范
- **蓝白配色**，禁用暗色主题（`.dark` 和 `@custom-variant dark` 须从 globals.css 移除）
- **术语**：用户可见文案禁用"智能体"，统一用"功能/能力/小职"
- **毛玻璃**：`.glass` / `.glass-strong` / `.glass-card`
- **动画**：`.anim-up` / `.anim-scale` / `.hover-lift` / `.animate-pulse-ring`
- **页面入口**：首页主入口是小职对话窗口，禁止智能体卡片画廊

## SEO
- meta description: `"懂桂电学生的AI朋友——小职，陪你走好求职每一步"`
- 内容红线：禁写"答辩"；禁写未主人批准的项目/经历

## 计划中的升级方向
详见项目文件中的 `page-agent+astryx_实施计划.md`
- GUI Agent 自然语言操控页面（page-agent 文本化DOM技术）
- 设计系统 Token 标准化升级
