# 架构圣经检查清单

> 每次迭代自动跑，5条全部通过才部署。违规项自动修复并记录 debt-log。

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
