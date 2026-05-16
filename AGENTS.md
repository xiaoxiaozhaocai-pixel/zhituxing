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

---

# 阶段二执行手册

## 当前状态
阶段一MVP已完成：Supabase建表+API改造+SSE解析+数据卡片+智能体对接+端到端测试通过。

## 阶段二目标
从"能对话"升级为"有数据价值"——实现量化匹配、结构化页面、会员体系。

---

## 任务1：匹配算法TypeScript版（P0）

创建 `src/lib/match-algorithm.ts`，实现以下算法：

### 1.1 技能匹配度计算
- 输入：用户技能列表(user_skills) + 目标岗位JD(jd_library/skill_job_match)
- 算法：匹配度 = (已匹配技能数 / 岗位要求技能数) × 100
- 输出：match_score, matched_skills, gap_skills

### 1.2 技能缺口分析
- 输入：gap_skills + skill_relations表
- 算法：对每个缺口技能，查skill_relations找prerequisite关系，生成学习路径
- 输出：learning_path（按prerequisite排序的技能学习顺序）

### 1.3 薪资范围估算
- 输入：匹配度 + 岗位JD中的薪资范围
- 算法：根据匹配度在薪资范围的低位和高位之间插值
- 输出：estimated_salary_min, estimated_salary_max

### 1.4 竞争力百分位
- 输入：用户匹配度 + 同岗位其他用户的匹配度（assessment_results表）
- 算法：percentile = 排名/总人数 × 100
- 输出：percentile_rank

---

## 任务2：6个新API路由（P0）

### 2.1 `/api/match` (POST)
- 功能：根据用户技能匹配岗位
- 输入：user_id, target_position（可选）
- 流程：查user_skills → 查jd_library/skill_job_match → 调匹配算法 → 返回匹配结果
- 输出：匹配岗位列表（按match_score降序），每个含match_score, gap_skills, estimated_salary

### 2.2 `/api/skills/relations` (GET)
- 功能：查询技能关系图谱
- 输入：skill_name, relation_type（co_occur/prerequisite/similar/career_path）
- 流程：查skill_relations表
- 输出：关联技能列表+关系类型+权重

### 2.3 `/api/user/profile` (GET)
- 功能：获取用户完整画像
- 输入：user_id
- 流程：查user_profiles + user_skills + 最近的assessment_results
- 输出：完整用户画像JSON

### 2.4 `/api/assessment` (POST)
- 功能：触发能力测评并返回结果
- 输入：user_id, target_position
- 流程：调用Coze测评智能体 → 解析SSE → 存assessment_results → 返回结果
- 输出：测评维度评分+百分位+短板+提升建议

### 2.5 `/api/jd/search` (GET)
- 功能：搜索JD库
- 输入：keyword, city, salary_range, industry
- 流程：查jd_library表，支持全文搜索
- 输出：JD列表（含技能要求、薪资、匹配度）

### 2.6 `/api/analytics` (POST)
- 功能：上报用户行为数据
- 输入：user_id, event_type, event_data
- 流程：写入行为日志表（后续阶段三用）
- 输出：success/fail

---

## 任务3：4个新页面（P0）

### 3.1 匹配结果页 `/match`
- 调用 /api/match 获取数据
- 展示：匹配岗位卡片列表（JdMatchCard组件复用）
- 支持按匹配度/薪资/城市筛选
- 点击岗位卡片展开详情（技能缺口+学习建议）

### 3.2 测评详情页 `/assessment`
- 调用 /api/assessment 触发测评
- 展示：SkillAssessmentCard + 各维度详细分析
- 历史测评对比（2次以上时显示成长曲线）

### 3.3 学习路径页 `/learning-path`
- 调用 /api/skills/relations 获取技能关系
- 展示：技能学习路线图（按prerequisite排序的时间线）
- 每个技能节点显示：当前水平→目标水平→推荐资源
- 集成career_plans表中的学习计划

### 3.4 技能关系图页 `/skill-graph`
- 调用 /api/skills/relations 获取关系数据
- 展示：交互式技能关系网络图（可用简单SVG或Canvas绘制）
- 4种关系用不同颜色/线型区分：co_occur(蓝)、prerequisite(绿)、similar(橙)、career_path(紫)
- 点击节点展开技能详情

---

## 任务4：会员功能（P1）

### 4.1 会员状态管理
- user_profiles表的user_type字段：free / member
- 前端通过 /api/auth/me 获取user_type
- 全局context提供会员状态

### 4.2 付费墙组件
- 创建 `src/components/PaywallCard.tsx`
- 免费用户访问会员功能时弹出付费引导
- 展示：会员权益列表+价格+开通按钮

### 4.3 功能权限控制
- 免费用户：每日3次对话、基础岗位查询、无法查看技能图谱
- 会员用户：无限对话、完整匹配分析、技能图谱、学习路径、测评报告下载
- 在API Route层做权限拦截，非会员返回403+升级提示

---

## 执行顺序
1. 先做任务1（匹配算法）— 这是任务2的基础
2. 再做任务2（API路由）— 这是任务3的基础
3. 然后做任务3（页面）— 前端展示
4. 最后做任务4（会员）— 需要前面的功能都就位
5. 每个任务完成后更新AGENTS.md标记完成状态
