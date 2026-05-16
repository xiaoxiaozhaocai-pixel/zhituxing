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
阶段二已全部完成 ✅：匹配算法 + 6个API路由 + 4个新页面 + 会员体系。

## 阶段二目标
从"能对话"升级为"有数据价值"——实现量化匹配、结构化页面、会员体系。✅ 已完成

---

## 任务1：匹配算法TypeScript版（P0） ✅ 已完成

文件：`src/lib/matching-algorithm.ts`，4个核心函数：

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

## 任务2：6个新API路由（P0） ✅ 已完成

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

## 任务3：4个新页面（P0） ✅ 已完成

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

## 任务4：会员功能（P1） ✅ 已完成

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

## 执行顺序（已全部完成 ✅）
1. ✅ 任务1（匹配算法）— src/lib/matching-algorithm.ts
2. ✅ 任务2（API路由）— 6个新路由全部创建
3. ✅ 任务3（页面）— 4个新页面 + 导航入口
4. ✅ 任务4（会员）— 会员状态管理 + 付费墙 + 权限控制
5. ✅ AGENTS.md 已更新标记完成状态

---

# 阶段三执行手册

## 当前状态
✅ 阶段一MVP：Supabase建表 + API改造 + SSE解析 + 6个智能体对接 + 端到端测试通过
✅ 阶段二进阶：匹配算法(760行) + 6个API路由 + 5张新表 + 4个新页面 + 会员功能
✅ 阶段三：行为埋点 + 相似用户推荐 + 管理后台

## 阶段三目标
用户行为数据采集 → 相似用户推荐算法 → 管理后台数据看板，形成"数据飞轮"

---

## 任务1：行为埋点工具（P0）

### 文件
- 新建 `src/lib/analytics/tracker.ts`
- 修改各页面组件添加埋点调用

### 规格
创建统一的行为埋点工具类 `AnalyticsTracker`，提供：
```
AnalyticsTracker.track(event, properties?)
```

事件类型枚举：
- `page_view` — 页面浏览
- `chat_send` — 发送对话消息
- `match_view` — 查看匹配结果
- `assessment_start` / `assessment_complete` — 开始/完成测评
- `learning_path_view` — 查看学习路径
- `skill_graph_explore` — 浏览技能图谱
- `paywall_show` / `paywall_convert` — 付费墙展示/转化
- `interview_start` / `interview_complete` — 面试开始/完成

核心逻辑：
- 自动附带 user_id、membership_type、timestamp、session_id
- 调用 /api/analytics POST 接口上报（阶段二已创建）
- 本地队列缓冲，批量上报（每5条或3秒flush一次）
- 页面关闭前（beforeunload）强制flush
- 离线时存入 localStorage，上线后补报

### 需要添加埋点的页面
- `src/app/assistant/page.tsx` — chat_send
- `src/app/match/page.tsx` — match_view
- `src/app/assessment/page.tsx` — assessment_start/complete
- `src/app/learning-path/page.tsx` — learning_path_view
- `src/app/skills-graph/page.tsx` — skill_graph_explore

---

## 任务2：相似用户推荐算法（P0）

### 文件
- 新建 `src/lib/similar-users-algorithm.ts`
- 新建 `src/app/api/similar-users/route.ts`

### 算法规格
输入：当前用户ID
输出：相似用户列表（最多10个），每个包含：相似度分数、共同技能、推荐理由

算法步骤：
1. 从 user_skills 表获取当前用户的技能向量
2. 从 user_profiles 表获取同专业/同职业方向的用户候选集
3. 计算技能向量余弦相似度
4. 按相似度降序排列，返回 Top 10
5. 附带推荐理由（如"你们都掌握了Python和数据分析"）

### API路由
- `GET /api/similar-users`
- 请求：需要登录（x-user-id header）
- 响应：`{ similar_users: [{ user_id, similarity, shared_skills, reason }] }`

---

## 任务3：管理后台布局 + JD数据管理页（P1）

### 文件
- 新建 `src/app/admin/layout.tsx` — 管理后台布局（左侧边栏导航）
- 新建 `src/app/admin/jd/page.tsx`

### 布局设计
- 左侧固定侧边栏：Logo + 导航项（JD管理/用户看板/技能管理/行为看板）
- 右侧内容区域
- 顶部：当前页面标题 + 管理员信息

### JD管理页功能
- JD列表表格：分页、搜索、按行业/城市/薪资筛选
- 单条JD详情查看：技能要求、薪资范围、来源、状态
- JD状态管理：启用/禁用/标记过期
- 批量操作：批量启用/禁用
- 数据统计卡片：JD总数、本周新增、热门技能Top 10

### 权限
- 仅 admin 用户可访问，前端路由守卫 + 后端API校验

---

## 任务4：管理后台 — 用户数据看板（P1）

### 文件
- 新建 `src/app/admin/users/page.tsx`

### 页面功能
- 用户统计卡片：总用户数、会员数、会员转化率、本周新增
- 用户列表表格：分页、搜索、按会员状态/专业/年级筛选
- 单用户详情抽屉：画像、技能、测评历史、匹配记录
- 用户增长趋势图：近30天每日新增用户（折线图）

---

## 任务5：管理后台 — 技能关系图管理（P1）

### 文件
- 新建 `src/app/admin/skills/page.tsx`

### 页面功能
- 技能分类管理：skill_taxonomy 表的增删改查
- 技能关系管理：skill_relations 表的增删改查（前置/共现/相似/职业路径4种关系）
- 可视化预览：右侧小窗展示选中技能的关系图（力导向图）
- 批量导入：支持CSV格式批量导入技能关系

---

## 任务6：管理后台 — 行为数据看板（P1）

### 文件
- 新建 `src/app/admin/analytics/page.tsx`

### 页面功能
- 核心指标卡片：DAU、对话次数、测评完成率、付费转化率
- 行为事件分布图：各事件类型占比（饼图）
- 用户行为漏斗：注册→首次对话→首次测评→付费（漏斗图）
- 行为趋势图：近30天各事件每日数量（多折线图）
- 热门页面排行：页面浏览量Top 10

---

## 执行顺序
1. 任务1：行为埋点工具 → 先有数据采集能力
2. 任务2：相似用户推荐算法 → 核心推荐能力
3. 任务3：管理后台布局 + JD管理
4. 任务4：用户看板
5. 任务5：技能图管理
6. 任务6：行为看板

每个任务完成后告知，再给下一个任务。

## 注意事项
- 管理后台所有页面需要 admin 权限守卫
- 行为埋点不能影响页面性能，必须异步上报
- 相似用户推荐算法是纯函数，不直接操作数据库
- 管理后台使用 shadcn/ui 的 Table/Card/Chart 组件，保持深蓝主色调
- 所有新API路由复用 src/lib/coze-stream.ts 中的公共函数
