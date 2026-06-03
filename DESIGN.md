# DESIGN.md

## 品牌与视觉方向
- 主色调：深蓝头 + 白身体（经典SaaS蓝白风格）
- 参考风格：Stripe、Notion 质感
- 气质：专业、清爽、可信、克制

## Design Tokens

### 色彩
- 导航栏：深蓝渐变 #1E40AF → #1E3A8A，白色文字/图标
- 页面背景：白色 #FFFFFF 或极浅灰 #F8FAFC
- 卡片/容器：白色背景 + shadow-sm + rounded-xl
- 文字主色：深灰 #1E293B
- 次要文字：浅灰 #64748B
- 弱文字：#94A3B8
- 边框/分割线：极浅灰 #E2E8F0
- 渐变色：蓝→紫（from-blue-600 via-indigo-500 to-violet-500）
- 功能色：橙色（岗位）、紫色（测评）、绿色（规划）、蓝色（主操作）

### 字体
- 字体族：system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif
- 无衬线体，不使用额外字体

### 间距与排版
- 行间距：leading-relaxed（1.625）
- 标题字号：Hero 4xl/6xl/7xl，Section标题 2xl/3xl

### 动效
- 淡入加载：fadeInUp 0.8s ease-out，多级延迟（0.15s递增）
- 功能卡片：hover translateY(-8px) + 深阴影 + 图标scale(1.1)
- CTA按钮：渐变背景 + hover scale(1.05) + 阴影增强
- "更多"下拉：scale(0.95→1) + opacity过渡

### 管理后台
- 侧边栏：深蓝渐变（#1E40AF → #1E3A8A），白色文字
- 内容区：白色背景 #FFFFFF
- 卡片/表格：白底 + border-[#E2E8F0] + shadow-sm

## 交互与状态
- 导航栏：固定顶部，深蓝渐变背景，白色文字
- 卡片悬浮：阴影加深 + 微上浮（-8px）
- 按钮：蓝底白字 / 渐变背景 + hover亮度变化 + 阴影

## 导航结构
- 主导航5项：首页/岗位匹配/能力测评/学习路径/技能图谱
- "更多"下拉：AI职业规划/岗位百科/AI助手/会员中心/求职干货/使用流程/常见问题/联系我们
