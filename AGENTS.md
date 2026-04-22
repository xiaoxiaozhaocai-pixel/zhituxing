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
| /api/jd/submit | POST | 提交用户上传的JD |
| /api/jd/submit | GET | 获取我的JD提交记录 |

## 上传JD领会员功能

### 功能说明

1. **专属页面** (`/upload-jd-reward`)
   - 核心钩子：上传3条真实校招JD，免费领9.9元终身会员
   - 实时进度条展示上传状态
   - 支持粘贴文本上传
   - Tab切换：上传入口 + 历史记录
   - 审核标准说明
   - 常见问题（折叠面板）

2. **奖励规则**
   - 新用户：上传3条审核通过的JD，自动开通终身会员
   - 已有月度会员：上传3条审核通过，额外获得6个月时长
   - 已有终身会员：不重复发放

3. **数据库表**
   - `jd_submissions`: 用户上传JD记录表
   - `users.is_lifetime_member`: 终身会员标识
   - `users.jd_reward_granted`: JD奖励发放标识

4. **页面入口**
   - 岗位百科页面右上角："上传JD领会员"按钮
   - 个人中心侧边栏："上传JD领会员"入口

## JD同步管理功能

### 功能说明

1. **同步服务** (`src/lib/jd-sync-service.ts`)
   - 支持6大官方公开招聘API对接
   - 内置模拟数据用于演示
   - 自动去重逻辑（job_name + company_name + city三重判断）
   - 同步日志记录

2. **支持的官方招聘平台**
   - 国家24365就业平台（教育部官方）
   - 中国公共招聘网（人社部官方）
   - 广西人才网上（广西本地）
   - 国聘网（央企/国企岗位）
   - 中国研究生招聘网（含本科+研究生校招）
   - 广西高校毕业生就业网（广西本地专属）

3. **后台管理页面** (`src/app/admin/jd-sync/page.tsx`)
   - 展示岗位总数、今日新增、目标进度
   - 支持全量同步和单平台同步
   - 平台数据统计图表
   - 同步日志详情（可展开查看）
   - 同步进度条

4. **数据库表**
   - `jd_sync_logs`: 同步日志表，记录每次同步的时间、来源、成功/失败数量
   - `jobs.source`: 新增字段，记录岗位数据来源平台

5. **模拟数据**
   - 已内置10条模拟岗位数据，覆盖互联网、金融、制造、医疗、教育等行业

## 职业规划智能体API

### API接口

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/career-planning/stream` | POST | 流式生成职业规划报告 |

### 环境变量配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `CAREER_AGENT_TOKEN` | Coze平台认证Token | `Bearer xxx` |
| `CAREER_AGENT_PROJECT_ID` | Coze项目ID | `7631200707550609418` |

### 功能特性

- **流式输出**：通过SSE协议实现打字机效果
- **智能适配**：根据用户输入（专业、年级、城市）生成个性化报告
- **降级处理**：未配置Token时自动使用内置模拟数据进行演示

## 模拟面试智能体API

### API接口

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/interview` | POST | 模拟面试对话 |
| `/api/interview?action=intro` | GET | 获取面试开场白 |

### 环境变量配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `INTERVIEW_AGENT_TOKEN` | Coze平台认证Token | `Bearer xxx` |
| `INTERVIEW_AGENT_PROJECT_ID` | Coze项目ID | `7631218260822097954` |

### 功能特性

- **流式输出**：通过SSE协议实现打字机效果
- **智能追问**：根据用户岗位自动调整面试问题
- **降级处理**：未配置Token时自动使用内置模拟数据进行演示

## 职搭子智能体API

### API接口

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/partner` | POST | 职搭子对话 |

### 集成位置

- **全行业岗位百科页面** (`/jobs`)：页面右上角有「问职搭子」按钮，点击弹出对话窗口
- 用户可在浏览岗位时直接咨询岗位相关问题

### 功能特性

- **流式输出**：通过SSE协议实现打字机效果
- **智能回复**：根据用户问题类型自动调整回复内容（岗位JD解读、薪资对比、求职建议等）
- **降级处理**：未配置Token时自动使用内置模拟数据进行演示

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

## 权限体系（V3 - 极简版）

### 核心原则
- **AI职业规划100%免费**：无任何次数限制，完整报告、PDF下载全部免费
- **会员统一一口价：9.9元/月**：一次付费，直接解锁全部功能
- **免费额度精简**：AI模拟面试仅3次免费机会

### 功能权限明细

| 功能 | 免费用户 | 9.9元会员 |
|------|----------|----------|
| AI职业规划 | 无限次完整版 | +每月自动复盘报告 |
| AI模拟面试 | 3次免费机会 | 无限次全流程 |
| 能力测评 | 仅基础2项结果 | 完整6维报告+排名 |
| 胜任力评估 | 不可用 | 无限次+雷达图 |
| 考研就业决策 | 仅基础版 | 完整版 |
| 岗位百科 | 无限次免费 | 无限次免费 |
| 求职干货 | 无限下载 | 无限下载 |
| 求职大礼包 | 不可用 | 可下载 |

### 会员定价
- **月度会员**：9.9元/月，一次付费解锁全部功能
- **终身会员**：9.9元一次性（首1000名），永久解锁全部功能

### 求职大礼包
- 学长学姐上岸简历模板
- 校招内推码（持续更新）
- 行测+专业笔试真题

### 配额数据结构

```typescript
interface QuotaInfo {
  career_planning: { remaining: number; unlimited: boolean };
  interview: { remaining: number; unlimited: boolean; reset_time?: string };
  assessment: { remaining: number; unlimited: boolean; reset_time?: string };
  competency: { is_member_only: boolean; requires_report: boolean };
  decision: { remaining: number; unlimited: boolean };
  is_member: boolean;
  member_type: string;
  member_expire_time: string | null;
}
```

### 数据库字段

| 字段 | 类型 | 说明 |
|------|------|------|
| interview_quota | INTEGER | 模拟面试剩余次数，默认3 |
| interview_quota_reset_time | TIMESTAMP | 配额重置时间（每月1日） |
| assessment_quota | INTEGER | 能力测评剩余次数，默认1 |
| assessment_quota_reset_time | TIMESTAMP | 配额重置时间 |

## 环境变量

- `COZE_WORKSPACE_PATH`: 项目工作目录
- `COZE_PROJECT_DOMAIN_DEFAULT`: 对外访问域名
- `DEPLOY_RUN_PORT`: 服务监听端口 (5000)
- `COZE_PROJECT_ENV`: 开发环境 (DEV) 或生产环境 (PROD)

## 管理员后台高频功能（V2扩展）

### 1. 奖励发放管理

**页面**: `/admin/rewards`

**功能说明**:
- 展示所有奖励发放记录（成功/失败/待处理）
- 今日失败告警提示
- 支持按状态筛选
- 手动补发奖励功能

**API接口**:
| 接口 | 方法 | 功能 |
|------|------|------|
| /admin/api/rewards | GET | 获取奖励发放记录列表 |
| /admin/api/rewards | POST | 手动发放奖励 |
| /admin/api/rewards | PUT | 更新奖励状态 |

**奖励类型**:
- `lifetime`: 终身会员
- `monthly`: 月度会员
- `bonus_months`: 额外月数

**数据库表**: `jd_reward_records`

### 2. 站内信管理

**页面**: `/admin/notifications`

**功能说明**:
- 发送站内信通知（系统通知/活动通知/私信）
- 支持全体用户、指定会员、单个用户发送
- 发送记录查询
- 删除通知功能

**API接口**:
| 接口 | 方法 | 功能 |
|------|------|------|
| /admin/api/notifications | GET | 获取站内信列表 |
| /admin/api/notifications | POST | 发送站内信 |
| /admin/api/notifications | DELETE | 删除站内信 |

**发送对象类型**:
- `all`: 全体用户
- `members`: 仅会员用户
- `single`: 指定用户ID

**数据库表**: `notifications`

### 3. 回收站功能

**页面**: `/admin/recycle`

**功能说明**:
- 展示已删除内容（JD/文章/公告）
- 7天自动过期删除
- 即将过期告警提示
- 恢复功能（还原到原位置）
- 永久删除功能

**API接口**:
| 接口 | 方法 | 功能 |
|------|------|------|
| /admin/api/recycle | GET | 获取回收站列表 |
| /admin/api/recycle | POST | 恢复或永久删除 |

**支持的类型**: `jobs`, `articles`, `announcements`

**数据库表**: `recycle_bin`

### 4. 数据导出功能

**页面**: `/admin/export`

**功能说明**:
- 导出用户数据
- 导出会员数据
- 导出岗位数据
- 导出文章数据
- 导出订单数据
- 全量数据导出
- 支持时间范围筛选
- CSV格式导出

**API接口**:
| 接口 | 方法 | 功能 |
|------|------|------|
| /admin/api/export | POST | 导出数据 |

**导出类型**: `users`, `members`, `jobs`, `articles`, `orders`, `all`

### 5. 用户拉黑功能

**API接口** (扩展自 /admin/api/users):
| 接口 | 方法 | 功能 |
|------|------|------|
| /admin/api/users | GET | 获取用户列表（含拉黑状态） |
| /admin/api/users | POST | 拉黑/取消拉黑用户 |

**拉黑字段**:
- `users.is_blacklisted`: 是否拉黑
- `users.ban_reason`: 拉黑原因
- `users.banned_at`: 拉黑时间

### 6. 后台侧边栏菜单

```
数据看板 → /admin
JD审核 → /admin/jd-review
JD管理 → /admin/jobs
同步任务 → /admin/sync
奖励发放 → /admin/rewards
站内信 → /admin/notifications
用户管理 → /admin/users
回收站 → /admin/recycle
内容管理 → /admin/content
数据导出 → /admin/export
操作日志 → /admin/logs
系统设置 → /admin/settings
```
