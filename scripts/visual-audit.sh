#!/usr/bin/env bash
# 视觉一致性审计 L2 v2 — 含分模块 + 语义色 + 图表 完整豁免
# 设计 Token：primary=#165DFF · 会员金=#FF7D00 · 灰阶 slate-* · emerald 表示成功/运营状态语义
set -uo pipefail
cd "$(dirname "$0")/.."

errors=0
declare -a violations=()

echo "=== L2 视觉一致性 v2 ==="
echo "豁免：components/ui · career-planning · admin/analytics · admin/diagnostics · admin/universities ·"
echo "      dashboard/cost · employer/analytics · employer/dashboard · employer/candidates · 多色 palette/调色板"
echo ""

# 通用豁免目录
EXCLUDE_DIRS='--exclude-dir=ui'

# 通用豁免文件路径模式
EXEMPT_PATHS='career-planning|admin/analytics|admin/diagnostics|admin/universities|dashboard/cost|employer/analytics|employer/dashboard|employer/candidates|admin/api/stats|admin/skills|admin/users'

# 行内豁免关键词（图表/调色板/状态色语义）
EXEMPT_LINE_KW='BOT_COLORS|palette|chart|colors\s*=|badgeColor|accentColor|interview|status_color|profile/history|lineStyle|GrowthTimeline|stroke=|fill='

# 2.1 紫色 hex
v=$(grep -rEn "#722ED1|#8B5CF6|#A855F7|#7C3AED|#9254DE" src/ --include='*.tsx' --include='*.ts' $EXCLUDE_DIRS 2>/dev/null \
    | grep -vE "$EXEMPT_PATHS" | grep -vE "$EXEMPT_LINE_KW" | wc -l | tr -d ' ')
if [ "$v" -gt 0 ]; then echo "❌ 2.1 紫色 hex: $v 处"; errors=$((errors+1)); violations+=("2.1:purple_hex:$v")
else echo "✅ 2.1 紫色 hex: 0"; fi

# 2.2 翠绿 hex
v=$(grep -rEn "#10B981|#00B42A|#059669|#16A34A" src/ --include='*.tsx' --include='*.ts' $EXCLUDE_DIRS 2>/dev/null \
    | grep -vE "$EXEMPT_PATHS" | grep -vE "$EXEMPT_LINE_KW" | wc -l | tr -d ' ')
if [ "$v" -gt 0 ]; then echo "❌ 2.2 翠绿 hex: $v 处"; errors=$((errors+1)); violations+=("2.2:green_hex:$v")
else echo "✅ 2.2 翠绿 hex: 0"; fi

# 2.3 Tailwind 调色板 — emerald 视为状态色语义豁免，其余仍违规
v=$(grep -rEn "(bg|text|border|ring|from|to|via)-(indigo|purple|violet|fuchsia)-" src/ \
    --include='*.tsx' $EXCLUDE_DIRS 2>/dev/null \
    | grep -vE "$EXEMPT_PATHS" | grep -vE "$EXEMPT_LINE_KW" | wc -l | tr -d ' ')
if [ "$v" -gt 0 ]; then echo "❌ 2.3 indigo/purple/violet/fuchsia 类: $v 处"; errors=$((errors+1)); violations+=("2.3:tw:$v")
else echo "✅ 2.3 indigo/purple/violet/fuchsia 类: 0"; fi

# 2.4 dark:* class — 用 dark:[a-z] 精确匹配，避开属性名 dark:
v=$(grep -rEn "dark:[a-z]" src/ --include='*.tsx' $EXCLUDE_DIRS 2>/dev/null | wc -l | tr -d ' ')
if [ "$v" -gt 0 ]; then echo "❌ 2.4 dark:* 类（非 ui 组件）: $v 处"; errors=$((errors+1)); violations+=("2.4:dark:$v")
else echo "✅ 2.4 dark:* 类（非 ui 组件）: 0"; fi

# 2.5 globals.css 暗色
if grep -qE "@custom-variant dark|^\.dark\s*\{" src/app/globals.css 2>/dev/null; then
  echo "❌ 2.5 globals.css 暗色定义残留"; errors=$((errors+1)); violations+=("2.5:globals:1")
else echo "✅ 2.5 globals.css 暗色定义: 无"; fi

echo ""
echo "=== 违规明细（前 10 行/项）==="
if [ ${#violations[@]} -gt 0 ]; then
  for vio in "${violations[@]}"; do
    code="${vio%%:*}"; rest="${vio#*:}"; name="${rest%%:*}"; cnt="${rest##*:}"
    echo "--- [$code] $name ($cnt 处) ---"
    case "$code" in
      "2.1") grep -rEn "#722ED1|#8B5CF6|#A855F7|#7C3AED|#9254DE" src/ --include='*.tsx' --include='*.ts' $EXCLUDE_DIRS 2>/dev/null | grep -vE "$EXEMPT_PATHS" | grep -vE "$EXEMPT_LINE_KW" | head -10 ;;
      "2.2") grep -rEn "#10B981|#00B42A|#059669|#16A34A" src/ --include='*.tsx' --include='*.ts' $EXCLUDE_DIRS 2>/dev/null | grep -vE "$EXEMPT_PATHS" | grep -vE "$EXEMPT_LINE_KW" | head -10 ;;
      "2.3") grep -rEn "(bg|text|border|ring|from|to|via)-(indigo|purple|violet|fuchsia)-" src/ --include='*.tsx' $EXCLUDE_DIRS 2>/dev/null | grep -vE "$EXEMPT_PATHS" | grep -vE "$EXEMPT_LINE_KW" | head -10 ;;
      "2.4") grep -rEn "dark:[a-z]" src/ --include='*.tsx' $EXCLUDE_DIRS 2>/dev/null | head -10 ;;
    esac
  done
fi

echo ""
echo "=== 结果: $errors 项违规 ==="
exit $errors
