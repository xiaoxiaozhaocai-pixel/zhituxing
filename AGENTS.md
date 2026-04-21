# 职途星 - AI职业规划助手

## 项目概述

- **项目名称**: 职途星——你的AI职业规划助手
- **目标用户**: 全国所有专业的大学生/应届生（核心转化用户：大三、大四、研三求职人群）
- **核心价值**: 基于全行业真实招聘JD，提供「每月5次免费AI服务+低门槛会员无限次+增值付费服务」的一站式求职平台
- **主色调**: 蓝色(#165DFF)、橙色(#FF7D00)（会员/付费按钮强调色）、紫色(#722ED1)（职业规划功能强调色）

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── page.tsx        # 首页
│   │   ├── layout.tsx      # 全局布局
│   │   ├── jobs/           # 全行业岗位百科页面
│   │   ├── assistant/      # AI职业助手页面
│   │   ├── membership/     # 会员中心页面
│   │   ├── resources/      # 求职干货页面
│   │   ├── guide/           # 使用流程页面
│   │   ├── faq/             # 常见问题页面
│   │   ├── contact/         # 联系我们页面
│   │   ├── profile/         # 个人中心页面
│   │   ├── career-planning/ # 职业规划页面
│   │   └── admin/           # 后台管理页面
│   │       └── jd-sync/     # JD同步管理页面
│   ├── components/          # 自定义组件
│   │   ├── ui/              # Shadcn UI 组件库
│   │   ├── ProfileGuideBar.tsx        # 全局顶部引导条
│   │   ├── FirstVisitModal.tsx        # 首次访问弹窗
│   │   ├── GenerateGuideModal.tsx     # 生成前置引导弹窗
│   │   └── ProfileGuideProvider.tsx   # 引导组件整合提供者
│   ├── hooks/               # 自定义 Hooks
│   └── lib/                 # 工具库
│       └── jd-sync-service.ts         # JD同步服务
├── next.config.ts           # Next.js 配置
└── package.json            # 项目依赖管理
```

## 开发命令

```bash
pnpm install     # 安装依赖
pnpm dev         # 开发环境
pnpm build       # 生产构建
pnpm start       # 生产环境
pnpm lint        # ESLint检查
pnpm ts-check    # TypeScript类型检查
```

## API 接口清单

| 接口 | 方法 | 功能 |
|------|------|------|
| /api/auth/send-code | POST | 发送验证码 |
| /api/auth/register | POST | 用户注册 |
| /api/auth/login | POST | 用户登录 |
| /api/auth/logout | POST | 退出登录 |
| /api/auth/me | GET | 获取当前用户 |
| /api/user/profile | GET | 获取用户个人信息 |
| /api/chat | POST | AI智能体对话 |
| /api/career-planning/generate | POST | 生成职业规划报告 |
| /api/career-planning/my-reports | GET | 获取我的报告列表 |
| /api/career-planning/report/[id] | GET | 获取报告详情 |
| /api/jd-sync/sync | POST | 触发JD数据同步 |
| /api/admin/jd-sync/logs | GET | 获取同步日志列表 |
| /api/admin/jd-sync/trigger | POST | 手动触发同步 |

## JD同步管理功能

### 功能说明

1. **同步服务** (`src/lib/jd-sync-service.ts`)
   - 支持官方公开招聘API对接（24365就业平台、中国公共招聘网、广西人才网上）
   - 内置模拟数据用于演示
   - 自动去重逻辑避免重复数据
   - 同步日志记录

2. **后台管理页面** (`src/app/admin/jd-sync/page.tsx`)
   - 展示岗位总数、今日同步数、上次同步时间
   - 支持手动触发同步（官方API或模拟数据）
   - 同步日志列表查看
   - 数据来源说明

3. **数据库表**
   - `jd_sync_logs`: 同步日志表，记录每次同步的时间、来源、成功/失败数量

### 模拟数据

已内置15条模拟岗位数据，覆盖互联网、金融、制造、医疗、教育等行业，用于演示和测试。

## 个人信息引导全链路功能

### 组件说明

1. **ProfileGuideBar** - 全局顶部常驻引导条
   - 未完善个人信息用户访问任何页面时显示
   - 24小时隐藏逻辑(localStorage存储)
   - 紫色渐变背景，固定在顶部

2. **FirstVisitModal** - 首次访问弹窗引导
   - 用户首次访问网站时自动弹出
   - 展示4个核心优势
   - 点击"先随便看看"后显示顶部引导条

3. **GenerateGuideModal** - 职业规划生成前置引导
   - 点击生成规划前检查信息完善度
   - 未完善时弹出引导，提供两个选择

4. **ProfileGuideProvider** - 引导组件整合提供者
   - 统一管理所有引导组件状态
   - 检查用户登录状态和个人信息完善度
   - 在layout.tsx中包裹应用

## 环境变量

- `COZE_WORKSPACE_PATH`: 项目工作目录
- `COZE_PROJECT_DOMAIN_DEFAULT`: 对外访问域名
- `DEPLOY_RUN_PORT`: 服务监听端口 (5000)
- `COZE_PROJECT_ENV`: 开发环境 (DEV) 或生产环境 (PROD)
