# 架构圣经检查清单 v3.1

> 当前版本 v3.1（2026-09-14）。每次迭代自动跑，各层全部通过才部署。违规项自动修复并记录 debt-log。

## 检查项

| # | 检查项 | 命令 | 来源 |
|---|--------|------|------|
| 1.1 | 定位文案：禁"求职服务平台/求职平台" | `grep "求职服务平台\|求职平台" src/app/ -rn` | 圣经3.0 |
| 1.2 | 入口交互残留：禁agentFeatures/AgentCard/agentGallery | `grep "agentFeatures\|AgentCard\|agentGallery" src/ -rni` | 圣经3.0 |
| 1.3 | 用户可见文案禁"智能体" | `grep "智能体" src/app/ --include="*.tsx" -rn` | 圣经3.0 |
| 1.4 | 禁暗色主题 | `grep "\.dark\|@custom-variant dark" src/app/globals.css` | 圣经3.0 |
| 1.5 | 内容红线：禁"答辩" | `grep "答辩" src/ -rn` | 圣经3.0 |

## 运行

```bash
# 一键检查
bash -c '
errors=0
echo "=== L1 架构圣经 ==="
echo -n "1.1 定位文案... "; grep -q "求职服务平台\|求职平台" src/app/ -rn 2>/dev/null && echo "❌ FAIL" && ((errors++)) || echo "✅ PASS"
echo -n "1.2 入口交互... "; grep -q "agentFeatures\|AgentCard\|agentGallery" src/ -rni 2>/dev/null && echo "❌ FAIL" && ((errors++)) || echo "✅ PASS"
echo -n "1.3 智能体文案... "; result=$(grep "智能体" src/app/ src/components/ --include="*.tsx" -rn 2>/dev/null | grep -vE "^\s*//|/\*|\*\/|comment|Note:"); if [ -n "$result" ]; then echo "❌ FAIL" && ((errors++)); else echo "✅ PASS"; fi
echo -n "1.4 暗色主题... "; grep -q "\.dark\|@custom-variant dark" src/app/globals.css 2>/dev/null && echo "❌ FAIL" && ((errors++)) || echo "✅ PASS"
echo -n "1.5 内容红线... "; grep -q "答辩" src/ -rn 2>/dev/null && echo "❌ FAIL" && ((errors++)) || echo "✅ PASS"
echo "结果: $errors 项违规"
exit $errors
'
```

---

## L2 视觉一致性（v2026-06-13）

> 设计 Token：primary `#165DFF`·会员金 `#FF7D00`·灰阶 slate-* · 蓝白底 · 禁暗色

| # | 检查项 | 命令 | 来源 |
|---|--------|------|------|
| 2.1 | 紫色硬编码（非主题色） | `grep -rE "#722ED1\|#8B5CF6\|#A855F7\|#7C3AED" src/` | 圣经3.0 |
| 2.2 | 翠绿硬编码（非状态色） | `grep -rE "#10B981\|#00B42A\|#059669\|#16A34A" src/` | 圣经3.0 |
| 2.3 | indigo/purple/emerald/violet/fuchsia Tailwind 类 | `grep -rE "(bg\|text\|border)-(indigo\|purple\|emerald)-" src/` | 圣经3.0 |
| 2.4 | dark:* Tailwind class | `grep -r "dark:" src/ --include="*.tsx"` | 圣经3.0 |
| 2.5 | globals.css 暗色定义 | `grep -E "@custom-variant dark\|^\.dark\s*\{" src/app/globals.css` | 圣经3.0 |

### 已知豁免（白名单）— v2 v2026-06-13

**目录豁免：**
- `src/components/ui/*` — shadcn/ui 默认 dark: 结构，主题层关闭后不生效，保留组件可移植性
- `src/app/career-planning/**` — 子模块独立紫主题 #722ED1，作为视觉锚点与主蓝形成层级
- `src/app/admin/analytics/**` · `admin/diagnostics/**` · `admin/universities/**` · `admin/skills/**` · `admin/users/**` · `admin/api/stats/**` — 仪表板多色图表 / 状态语义
- `src/app/dashboard/cost/**` — BOT_COLORS 多色折线
- `src/app/employer/analytics/**` · `employer/dashboard/**` · `employer/candidates/**` — 雇主端匹配度色阶 / 状态语义

**2026-08-28 用户拍板豁免（L1.5待重审）：**
- `src/app/HomeClient.tsx` — 主界面5核心链路入口卡渐变 `from-blue-500 to-indigo-600 / from-violet-500 to-purple-600`，属M1主入口收敛视觉，先豁免不强制改，后续再审
- `src/app/match/page.tsx` — 组态匹配「双维错位诊断」展示区块 `border-indigo-100/bg-indigo-50/40/text-indigo-700`，诊断语义色，先豁免不强制改，后续再审
**行内关键词豁免：**
- `BOT_COLORS` `palette` `chart` `colors =` — 多色调色板
- `accentColor` `badgeColor` `lineStyle` `stroke=` `fill=` — 图表组件入参
- `interview` `status_color` `GrowthTimeline` — 业务状态色（面试通过=绿、运营中=绿）

**真违规视为：** 主功能页（如 learning-path / skill-portrait / match / profile / assistant）随手用 indigo/purple/violet/fuchsia/翠绿，无明确语义且偏离主蓝/会员金 token

### 运行

```bash
bash scripts/visual-audit.sh
```

---

## L3 法律红线（v2026-06-17 新增）

> **缘起**：2026-06-17 战略组评审，CCO 指出"行业 5 年回报预期"触《证券法》160 条+《证券投资顾问业务暂行规定》第 7 条无牌荐股红线。职途星无证券业务牌照，**任何产品形态、UI 文案、营销话术、Prompt 输出**都不得触碰投资建议边界。

### 3.1 禁止词（命中即视为违规）

| # | 禁止词 | 检查范围 | 来源 |
|---|--------|---------|------|
| 3.1.1 | 行业回报预期 / 投资预期 / 收益预测 / 投资建议 / 投资顾问 | `src/` 全代码库（含 prompt） | CCO 6/17 |
| 3.1.2 | 行业评估报告 / 价值评估报告 / 含金量评分 / 公平性得分 / 行业打分 | `src/` 全代码库 + 营销文案 | CCO 6/17 |
| 3.1.3 | 5 年回报 / 长期年化 / 行业 ETF（作为产品输出） | `src/` 全代码库 | CCO 6/17 |

### 3.2 允许做（合规边界内）

- ✅ 展示**客观公开数据**：人均薪酬、人均利润、股权分散度、年报披露的薪酬利润比
- ✅ 提供**计算公式与数据来源链接**让用户自查
- ✅ 小职话术：**只给变量、不给结论**（"你可以查 A 公司年报里'人均薪酬/净利润'比"）
- ✅ 数据源白名单：上市公司年报（公开）/ 国家统计局 / 招股书

### 3.3 数据源黑名单

| 数据源 | 风险 | 判定 |
|---|---|---|
| 脉脉评分 | 用户分享数据，需三重授权（微博诉脉脉案） | ❌ 弃用 |
| 看准网评分 | 同上 + 大众点评诉百度案 323 万判赔先例 | ❌ 弃用 |
| 雪球用户讨论 | 二次加工=投资建议 | ❌ 弃用 |

### 3.4 一键检查

```bash
bash -c '
errors=0
echo "=== L3 法律红线 ==="
echo -n "3.1.1 投资词汇... "; grep -rE "回报预期|投资预期|收益预测|投资建议|投资顾问" src/ 2>/dev/null && echo "❌ FAIL" && ((errors++)) || echo "✅ PASS"
echo -n "3.1.2 评估打分... "; grep -rE "行业评估报告|价值评估报告|含金量评分|公平性得分|行业打分" src/ 2>/dev/null && echo "❌ FAIL" && ((errors++)) || echo "✅ PASS"
echo -n "3.1.3 回报预测... "; grep -rE "5\s*年回报|长期年化|行业\s*ETF" src/ 2>/dev/null && echo "❌ FAIL" && ((errors++)) || echo "✅ PASS"
echo "结果: $errors 项违规"
exit $errors
'
```

### 3.5 责任与追溯

- 任何 PR 触碰禁止词必须 CCO 二次评审
- 违规默认 block 部署，不走 debt-log（区别于 L1/L2）
- 修订或解除红线需主人书面授权 + ARCHITECTURE_BIBLE_CHECKLIST 版本递增

### 3.6 平台红线：禁自动投递（v3.1 2026-09-14 新增）

- **缘起**：竞品 UP 求职（小柚）提供代投递/网申填表且已变现（2026-09-09 竞品情报），评估后拍板不做。
- **红线**：任何形态的自动/代操作第三方招聘平台——自动投递、模拟登录网申、批量填表——一律禁止。涉及第三方平台 ToS 与计算机信息系统操作边界，法律风险不可控。
- **允许**：岗位聚合展示、跳转链接、用户手动投递的辅助（提醒、清单、话术、跟踪记录）。

---

## L4 视觉/排版巡检（上线前 · 人工+模型审美，v2026-08-29 新增）

> **为什么**：L2 只做"颜色/grep 合规"，查不到间距/对齐/层级/对比度/密集度等**需要审美判断的软问题**。此类问题此前靠用户提醒才发现（2026-08-28 视觉/排版暴露大量不合理项），现固化为**每次改版上线前的主动环节**，不依赖用户提醒。

### 4.1 触发时机
- 每次部署/改版后、上线验收前，**必须**执行一次视觉巡检。
- 由主 Agent 主动触发，不依赖用户提醒。

### 4.2 巡检维度（逐项过一遍）
| # | 维度 | 判断要点 |
|---|------|---------|
| 4.2.1 | 间距/留白 | 卡片间 padding/margin 是否一致、过挤或过空 |
| 4.2.2 | 对齐 | 同模块内元素是否对齐、基线是否统一 |
| 4.2.3 | 层级 | 标题/正文/按钮视觉层级是否清晰，有无打架 |
| 4.2.4 | 对比度 | 前景文字与背景对比是否足够（可读性） |
| 4.2.5 | 信息密度 | 是否过密/过疏、信息失衡 |
| 4.2.6 | 字号/字重 | 是否层级分明、体量协调 |
| 4.2.7 | 模块冲突 | 相邻模块视觉是否冲突、语义是否错位 |
| 4.2.8 | 响应式 | 移动端/窄屏是否错位、溢出 |
| 4.2.9 | 蓝白 token 一致性 | 是否偏离主蓝 #165DFF / 会员金 #FF7D00 / 灰阶 |

### 4.3 执行方式
1. 打开线上关键页（首页 / career-planning / match / profile 等）查看渲染效果或截图。
2. 主 Agent 按 4.2 维度做审美审查，**列出问题清单**（含页面/元素/具体问题/建议）。
3. 能确认的问题当场修复；需权衡的标注后提交主人。
4. 全部处理完 → 本轮视为通过，否则不验收。

### 4.4 输出
- 视觉巡检结果：问题清单（是否全部处理），不写进线上。

---

## L5 形象与交互规范（v3.1 2026-09-14 新增）

> **缘起**：2026-09-13 3D 小职接入。第一版放 HERO 首屏大展示位被主人否决（"肯定是取代悬浮窗就行了，点开聊天框后挂在聊天框旁边"），重构为悬浮窗体系（对标豆包模式：人格化形象 + 悬浮球常驻一键呼出）。为防未来迭代回退，固化为规范。

| # | 规范 | 内容 |
|---|------|------|
| 5.1 | 3D 交互形态锁定 | 收起态=3D 悬浮球（92×104px + xz-float 浮动动画 + 椭圆投影）；展开态=聊天框左上角探头挂件（76×88px，pointer-events-none 不挡交互）。**禁止 HERO/首屏大展示位**——9-13 已推翻一次，不许回潮 |
| 5.2 | 移动端降级强制 | `matchMedia("(min-width: 768px)")` 不满足时不 import model-viewer chunk、不下载 glb，降级 2D 表情图。CSS 隐藏不阻止资源下载，必须 JS 条件渲染 |
| 5.3 | 3D 资产规范 | glb 必须经 `@gltf-transform/cli optimize --compress meshopt --texture-compress webp --texture-size 1024` 压缩后上线，单文件 <600KB（当前 510KB）；必须配 poster 加载占位图 |
| 5.4 | model-viewer 集成 | dynamic import 双保险不进 SSR + `declare module 'react'` JSX 类型声明；小尺寸场景禁 auto-rotate（眩晕）与 camera-controls（点击需冒泡给展开按钮） |
| 5.5 | 表情系统 | 小职 bot prompt 在 Coze 侧托管不可代码修改，情绪由前端 `EMOTION_RULES` 关键词判断（优先级 joy→sad→angry→happy），SSE 流结束触发，8s 回落 idle。新表情接入：webp 入 `/avatars/emotions/` + `EMOTION_IMGS` 注册 + 规则追加 |

---

## L6 管理后台规范（v3.1 2026-09-14 新增）

> **缘起**：2026-09-13 admin 后台全量启用（15 API 全绿 + 单登录优化），过程中的踩坑与安全决策固化。

| # | 规范 | 内容 |
|---|------|------|
| 6.1 | 单登录链路 | admin_token cookie（值=ADMIN_TOKEN env）→ proxy.ts /admin 前置放行 → 各 API `requireAdmin` 兜底。主站登录（sb-token）与 admin 登录完全分离；**sb-token 对 admin API 无防线价值**（任何注册用户都持有，9-13 已验证） |
| 6.2 | 新增 API 强制校验 | 新增 `/admin/api/*` 一律 import `requireAdmin` 并在 handler 首行校验；`/admin/api/login` 除外。禁止裸 route 直查数据库 |
| 6.3 | env 命名 | 服务端 Supabase key 统一读 `SUPABASE_SERVICE_ROLE_KEY`（兼容旧名 `SUPABASE_SERVICE_KEY` fallback）；新代码禁止引入第三种变量名 |
| 6.4 | 待统一项（登记） | 两套 admin API 实现（`src/app/admin/api/*` 与 admin 页面内联调用）长期需统一——待主人拍板后执行（9-13 登记） |
| 6.5 | 凭据管理 | `/admin/login` 走 admins 表 bcrypt 校验；管理员密码定期更换 |

---

## 版本历史

- **v3.0**：L1 五条定位/文案/主题红线定稿
- **L2 视觉一致性**：2026-06-13
- **L3 法律红线**：2026-06-17（CCO 证券合规评审）
- **L4 视觉/排版巡检**：2026-08-29
- **v3.1（2026-09-14）**：新增 L5 形象与交互规范（3D 悬浮窗体系/移动端降级/表情系统）、L6 管理后台规范（单登录/requireAdmin/env 命名）、L3.6 禁自动投递平台红线；L2 豁免清单无变更（9-14 巡检 L1 全绿）
