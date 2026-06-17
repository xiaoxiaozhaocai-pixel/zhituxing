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
echo -n "1.3 智能体文案... "; grep -q "智能体" src/app/ --include="*.tsx" -rn 2>/dev/null && echo "❌ FAIL" && ((errors++)) || echo "✅ PASS"
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
