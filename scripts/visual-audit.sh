#!/usr/bin/env bash
# 视觉一致性审计 — L2 检查
# 设计 Token：primary=#165DFF · 会员金=#FF7D00 · 灰阶 slate-* · 禁暗色 · 禁紫绿
set -uo pipefail

cd "$(dirname "$0")/.."

errors=0
declare -a violations=()

# 颜色用 awk，避免 set -e 触发 grep 无匹配退出
count_grep() {
  # $1 pattern, $2... extra paths/options
  grep -rE "$@" 2>/dev/null | wc -l | tr -d ' '
}

echo "=== L2 视觉一致性 ==="

# 2.1 紫色硬编码（设计 Token 中无紫）
v=$(count_grep "#722ED1|#8B5CF6|#A855F7|#7C3AED" src/ --include='*.tsx' --include='*.ts' --include='*.css')
if [ "$v" -gt 0 ]; then
  echo "❌ 2.1 紫色硬编码: $v 处"
  errors=$((errors+1))
  violations+=("2.1:purple:$v")
else
  echo "✅ 2.1 紫色硬编码: 0"
fi

# 2.2 翠绿硬编码（设计 Token 中无绿）
v=$(count_grep "#10B981|#00B42A|#059669|#16A34A" src/ --include='*.tsx' --include='*.ts' --include='*.css')
if [ "$v" -gt 0 ]; then
  echo "❌ 2.2 翠绿硬编码: $v 处"
  errors=$((errors+1))
  violations+=("2.2:green:$v")
else
  echo "✅ 2.2 翠绿硬编码: 0"
fi

# 2.3 Tailwind 暖色/冷色非主题类（indigo/purple/emerald/violet/fuchsia）
v=$(count_grep "(bg|text|border|ring|from|to|via)-(indigo|purple|emerald|violet|fuchsia)-" src/ --include='*.tsx')
if [ "$v" -gt 0 ]; then
  echo "❌ 2.3 indigo/purple/emerald 类: $v 处"
  errors=$((errors+1))
  violations+=("2.3:tailwind_palette:$v")
else
  echo "✅ 2.3 indigo/purple/emerald 类: 0"
fi

# 2.4 dark: 暗色 Tailwind class
v=$(count_grep "dark:" src/ --include='*.tsx')
if [ "$v" -gt 0 ]; then
  echo "❌ 2.4 dark:* 类: $v 处"
  errors=$((errors+1))
  violations+=("2.4:dark_class:$v")
else
  echo "✅ 2.4 dark:* 类: 0"
fi

# 2.5 globals.css 暗色定义
if grep -qE "@custom-variant dark|^\.dark\s*\{" src/app/globals.css 2>/dev/null; then
  echo "❌ 2.5 globals.css 暗色定义残留"
  errors=$((errors+1))
  violations+=("2.5:globals_dark:1")
else
  echo "✅ 2.5 globals.css 暗色定义: 无"
fi

echo ""
echo "=== 违规明细（前 20 行）==="
if [ ${#violations[@]} -gt 0 ]; then
  for vio in "${violations[@]}"; do
    code="${vio%%:*}"
    rest="${vio#*:}"
    name="${rest%%:*}"
    cnt="${rest##*:}"
    echo "--- [$code] $name ($cnt 处) ---"
    case "$code" in
      "2.1") grep -rEn "#722ED1|#8B5CF6|#A855F7|#7C3AED" src/ --include='*.tsx' --include='*.ts' --include='*.css' 2>/dev/null | head -5 ;;
      "2.2") grep -rEn "#10B981|#00B42A|#059669|#16A34A" src/ --include='*.tsx' --include='*.ts' --include='*.css' 2>/dev/null | head -5 ;;
      "2.3") grep -rEn "(bg|text|border|ring|from|to|via)-(indigo|purple|emerald|violet|fuchsia)-" src/ --include='*.tsx' 2>/dev/null | head -5 ;;
      "2.4") grep -rEn "dark:" src/ --include='*.tsx' 2>/dev/null | head -5 ;;
    esac
  done
fi

echo ""
echo "=== 结果: $errors 项违规 ==="
exit $errors
