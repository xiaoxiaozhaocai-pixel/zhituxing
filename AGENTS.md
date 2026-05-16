# 职途星 · 项目开发指南

## 项目概况
- **项目名**：职途星 — 全行业全岗位AI模拟甄选与职业能力发展平台
- **技术栈**：Next.js + React + TypeScript + Supabase PostgreSQL + Coze API + shadcn/ui + Tailwind CSS
- **架构**：三层架构 — 数据层(Supabase) → 算法层(Coze工作流) → 交互层(Next.js前端)

## Supabase 数据库（9张核心表）
1. `skill_taxonomy` — 技能分类表（技能名、类别、领域、别名）
2. `user_profiles` — 用户画像表（user_id、user_type[free/member]、人格类型、专业、年级、求职意向、技能等）
3. `assessment_results` — 测评结果表（用户技能评分、维度得分、推荐岗位）
4. `skill_job_match` — 技能岗位匹配表（匹配度、技能缺口、薪资范围）
5. `interview_results` — 面试结果表（面试维度评分、综合得分、改进建议）
6. `career_plans` — 职业规划表（目标岗位、学习路径、阶段计划）
7. `skill_relations` — 技能关系图谱（co_occur/prerequisite/similar/career_path 四种关系）
8. `user_skills` — 用户技能画像（技能等级、掌握程度）
9. `skill_progress` — 技能进度追踪（学习状态、完成百分比）

## Coze 智能体（6个）— 全部已对接 stream_run API ✅
| 智能体 | stream_run 环境变量前缀 | 功能 | 数据闭环 | API路由 |
|---|---|---|---|---|
| 职搭子 | COZE_JOBS_* | HR岗位JD助手 | JD→skill_job_match | /api/search-jd (POST) |
| AI模拟面试官 | COZE_INTERVIEW_* | 模拟面试 | 面试→interview_results | /api/interview (POST) |
| 考研就业决策助手 | COZE_DECISION_* | 考研vs就业决策 | 决策→career_plans | /api/chat (botType=decision) |
| AI职业规划师 | COZE_CAREER_* | 职业生涯规划 | 规划→career_plans | /api/career-planning/stream (POST) |
| 专业能力测评助手 | COZE_ASSESSMENT_* | 能力测评 | 测评→assessment_results | /api/assessment (POST) |
| 胜任力评估助手 | COZE_COMPETENCY_* | 胜任力评估（仅会员） | 评估→skill_job_match | /api/competency (POST) |

每个智能体的 stream_run 配置包含3个环境变量：`{PREFIX}_API_URL`、`{PREFIX}_PROJECT_ID`、`{PREFIX}_API_TOKEN`
回退机制：stream_run 失败时，chat/interview 路由会回退到标准 Coze Bot API (api.coze.cn/v3/chat)

## SSE 流式解析规范
Coze 智能体返回的流式文本中可能包含结构化数据标记：
- 开始标记：`<<DATA:type=xxx>>`（xxx可以是 interview_result、career_plan、jd_match、skill_assessment 等）
- 结束标记：`<<END>>`
- 中间内容是 JSON 格式的结构化数据

解析规则：
1. 逐chunk累积到buffer
2. 用正则匹配 `<<DATA:type=(\w+)>>` 和 `<<END>>`
3. 匹配到就提取中间的JSON，通过 `event: structured_data` SSE事件推送给前端
4. 普通文本照常通过 `event: message` 转发
5. 大模型可能修改标记格式，需容错处理（如多余空格、大小写变化）

## 数据保存规则
SSE解析出结构化数据后，根据type存入对应的Supabase表：
- interview_result → interview_results 表
- career_plan → career_plans 表
- jd_match → skill_job_match 表
- skill_assessment → assessment_results 表

保存时需带上 user_id 和 created_at。

## user_type 权限控制
- 调用Coze API时必须在 `custom_variables` 里传入 `user_type`（值从 user_profiles 表查）
- user_type 为 free 时，智能体限制输出深度和功能
- user_type 为 member 时，智能体开放全部功能

## 当前开发阶段：阶段一 MVP
需要完成的任务（按顺序）：

### 任务1：改造 chat/route.ts ✅ 已完成
- 用户验证改查 user_profiles 表（不再查 users 表），同时查出 user_type
- 调用Coze API时传入 custom_variables: { user_type }
- 修复流式传输（不要先读完整响应再转发，改为边读边转发）
- 添加SSE解析器，解析 <<DATA>> 标记，结构化数据通过 event: structured_data 推送，同时存入Supabase对应表

### 任务2：改造 interview/route.ts ✅ 已完成
- 同样传入 user_type
- 添加SSE解析器
- 面试结果存入 interview_results 表

### 任务3：改造 career-planning/stream/route.ts ✅ 已完成
- 同样传入 user_type
- 添加SSE解析器
- 规划结果存入 career_plans 表

### 任务4：改造 search-jd/route.ts ✅ 已完成
- 同样传入 user_type
- 添加SSE解析器
- JD匹配结果存入 skill_job_match 表

### 任务5：创建数据卡片组件 ✅ 已完成
- src/components/cards/InterviewResultCard.tsx — 面试结果卡片
- src/components/cards/CareerPlanCard.tsx — 职业规划卡片
- src/components/cards/JdMatchCard.tsx — 岗位匹配卡片
- src/components/cards/SkillAssessmentCard.tsx — 技能测评卡片
- 前端监听 event: structured_data 事件，解析JSON后渲染对应卡片

## 编码规范
- 所有API路由使用 Edge Runtime
- Supabase客户端：前端用 @supabase/supabase-js 的 createClient + anon key，服务端用 service_role key
- SQL查询用 execSql 工具函数
- 错误处理要有fallback（Coze不可用时返回预设回复）
- 环境变量：NEXT_PUBLIC_ 前缀的暴露前端，其余仅服务端
