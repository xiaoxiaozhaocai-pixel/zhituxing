# 项目上下文：职途星——你的AI职业规划助手

### 项目概述

- **项目名称**: 职途星——你的AI职业规划助手
- **目标用户**: 全国所有专业的大学生/应届生（核心转化用户：大三、大四、研三求职人群）
- **核心价值**: 基于全行业真实招聘JD，提供「每月5次免费AI服务+低门槛会员无限次+增值付费服务」的一站式求职平台
- **主色调**: 蓝色(#165DFF)、橙色(#FF7D00)（会员/付费按钮强调色）

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   │   ├── page.tsx        # 首页
│   │   ├── layout.tsx      # 全局布局
│   │   ├── jobs/           # 全行业岗位百科页面
│   │   ├── assistant/      # AI职业助手页面
│   │   ├── membership/     # 会员中心页面
│   │   ├── resources/      # 求职干货页面
│   │   ├── guide/          # 使用流程页面
│   │   ├── faq/            # 常见问题页面
│   │   ├── contact/        # 联系我们页面
│   │   └── profile/        # 个人中心页面
│   ├── components/         # 自定义组件
│   │   ├── Navbar.tsx      # 全局导航栏
│   │   ├── Footer.tsx      # 底部版权栏
│   │   ├── FreeQuotaBadge.tsx  # 浮动免费额度提示
│   │   └── ui/             # Shadcn UI 组件库
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   └── utils.ts        # 通用工具函数 (cn)
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 页面清单与功能

### 核心页面
1. **首页** (`/`) - Banner、核心功能区、热门岗位标签、AI智能体展示、用户评价、裂变推广横幅
2. **全行业岗位百科** (`/jobs`) - 岗位筛选、岗位列表、分页、右侧广告位
3. **AI职业助手** (`/assistant`) - 快捷提问、智能体对话区、免费额度管理
4. **会员中心** (`/membership`) - 会员特权展示、套餐选择、支付流程

### 辅助页面
5. **求职干货** (`/resources`) - 干货分类、资源列表
6. **使用流程** (`/guide`) - 3步使用说明
7. **常见问题** (`/faq`) - FAQ折叠面板
8. **联系我们** (`/contact`) - 联系表单、联系方式

### 个人中心
9. **个人中心** (`/profile`) - 用户信息、功能菜单
10. **我的邀请** (`/profile/invite`) - 邀请奖励、邀请记录、提现规则

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## Supabase 数据库配置

### 数据库表结构

```sql
-- 用户表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  password VARCHAR(255),
  nickname VARCHAR(100),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 验证码表
CREATE TABLE verification_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_verification_codes_phone ON verification_codes(phone);
```

### RPC函数

```sql
CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS TEXT AS
$$
DECLARE
  result TEXT;
  row_data RECORD;
  is_select BOOLEAN;
BEGIN
  is_select := upper(substring(query from 1 for 6)) = 'SELECT';
  
  IF is_select THEN
    result := '[';
    FOR row_data IN EXECUTE query LOOP
      IF result != '[' THEN
        result := result || ',';
      END IF;
      result := result || row_to_json(row_data)::TEXT;
    END LOOP;
    result := result || ']';
  ELSE
    EXECUTE query;
    result := '[{"affected": true}]';
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### RLS策略

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on users" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on verification_codes" ON verification_codes FOR ALL USING (true) WITH CHECK (true);
```

### 环境变量

使用 Coze 平台提供的 Supabase 配置：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## API 接口清单

| 接口 | 方法 | 功能 |
|------|------|------|
| /api/auth/send-code | POST | 发送验证码 |
| /api/auth/register | POST | 用户注册 |
| /api/auth/login | POST | 用户登录 |
| /api/auth/logout | POST | 退出登录 |
| /api/auth/me | GET | 获取当前用户 |
| /api/chat | POST | AI智能体对话 |

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**
- 主色调：蓝色(#165DFF)、橙色(#FF7D00)（会员/付费按钮强调色）
- 圆角：8px
- 交互效果：hover时背景色加深+轻微上浮+阴影加深，过渡时间0.3s

