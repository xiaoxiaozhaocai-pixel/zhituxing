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
