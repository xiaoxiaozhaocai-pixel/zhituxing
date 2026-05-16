# DESIGN.md

## 品牌与视觉方向
- 主色调：深蓝色系 (#0F172A → #1E293B)
- 参考风格：现代化SaaS产品（Notion、Linear质感）
- 气质：专业、科技、克制、不花哨

## Design Tokens

### 色彩
- 背景：#0F172A (最深) → #1E293B (深蓝) → #0B1120 (极深)
- 文字：白色为主，slate-400 为辅，slate-500 为弱
- 卡片：slate-800/50 + border-slate-700/50 + backdrop-blur-sm（毛玻璃）
- 渐变色：蓝→紫（from-blue-400 via-indigo-400 to-violet-400）

### 字体
- 字体族：system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif
- 无衬线体，不使用额外字体

### 间距与排版
- 行间距：leading-relaxed（1.625）
- 标题字号：Hero 4xl/6xl/7xl，Section标题 2xl/3xl

### 动效
- 淡入加载：fadeInUp 0.8s ease-out，多级延迟（0.15s递增）
- 功能卡片：hover translateY(-8px) + 深阴影 + 图标scale(1.1)
- CTA按钮：glow-pulse 发光脉冲 + hover scale(1.05)
- 浮动粒子：20个微小粒子，15-35s循环，opacity 0.03
- "更多"下拉：scale(0.95→1) + opacity过渡

### 背景纹理
- 网格：1px线，60px间距，opacity 0.03
- 光晕：indigo/violet/blue 圆形blur，低透明度
- 粒子：微小白色圆形，浮动动画

## 交互与状态
- 导航栏：深蓝背景页用透明→毛玻璃，白底页保持白底
- 卡片悬浮：边框变亮色 + 彩色阴影 + 微上浮
- 按钮：渐变背景 + hover透明度变化 + 阴影

## 导航结构
- 主导航5项：首页/岗位匹配/能力测评/学习路径/技能图谱
- "更多"下拉：AI职业规划/岗位百科/AI助手/会员中心/求职干货/使用流程/常见问题/联系我们
