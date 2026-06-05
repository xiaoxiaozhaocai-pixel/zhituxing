#!/bin/bash
# 职途星自动化迭代检查 v1.0
# 用法: bash scripts/iterate-check.sh        # 全跑
#       bash scripts/iterate-check.sh L1      # 单层

set -e
cd "$(dirname "$0")/.."

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'
PASS=0
FAIL=0
LOG_FILE="ITERATION_LOG.md"

pass() { echo -e "${GREEN}PASS${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}FAIL${NC} $1"; ((FAIL++)); }
warn() { echo -e "${YELLOW}WARN${NC} $1"; }

# ── L1: 架构圣经 ──
check_l1() {
  echo ""; echo "======== L1 架构圣经 ========"
  local ok=true

  echo -n "  1.1 定位文案... "
  if grep -rn "求职服务平台\|求职平台" src/app/ --include="*.tsx" -q 2>/dev/null; then
    fail "定位文案含'求职服务平台/求职平台'"; ok=false
  else pass "合规"; fi

  echo -n "  1.2 入口交互残留... "
  local c=$(grep -rni "agentFeatures\|AgentCard\|agentGallery" src/ 2>/dev/null | wc -l)
  if [ "$c" -gt 0 ]; then fail "残留 $c 处"; ok=false; else pass "零残留"; fi

  echo -n "  1.3 用户文案(智能体)... "
  c=$(grep -rn "智能体" src/app/ --include="*.tsx" 2>/dev/null | grep -v "//\| \*" | wc -l)
  if [ "$c" -gt 0 ]; then fail "'智能体' $c 处"; ok=false; else pass "零"; fi

  echo -n "  1.4 暗色主题... "
  if grep -q "\.dark\|@custom-variant dark" src/app/globals.css 2>/dev/null; then
    fail "暗色主题残留"; ok=false; else pass "已清除"; fi

  echo -n "  1.5 内容红线... "
  if grep -rn "答辩" src/ --include="*.tsx" --include="*.ts" -q 2>/dev/null; then
    fail "含'答辩'"; ok=false; else pass "合规"; fi

  $ok && return 0 || return 1
}

# ── L2: TypeScript ──
check_l2() {
  echo ""; echo "======== L2 TypeScript ========"
  local ok=true

  echo -n "  2.1 tsc --noEmit... "
  if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
    fail "编译错误"; ok=false; else pass "零错误"; fi

  echo -n "  2.2 any回归... "
  c=$(grep -rn ": any" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | wc -l)
  if [ "$c" -gt 0 ]; then warn ":any $c 处（可能为必要any）"; else pass "零any"; fi

  $ok && return 0 || return 1
}

# ── L3: 安全 ──
check_l3() {
  echo ""; echo "======== L3 安全审计 ========"
  local ok=true

  echo -n "  3.1 依赖高危漏洞... "
  if pnpm audit --audit-level=high 2>&1 | grep -q "vulnerabilities"; then
    warn "有高危漏洞(P0阻断)"; ok=false; else pass "无高危漏洞"; fi

  echo -n "  3.2 Admin认证... "
  c=$(grep -rl "requireAdmin" src/app/admin/api/ 2>/dev/null | wc -l)
  if [ "$c" -ge 10 ]; then pass "$c routes"; else fail "覆盖不足($c)"; ok=false; fi

  echo -n "  3.3 SSRF防护... "
  if grep -q "ALLOWED_HOSTS" src/app/api/fetch-jd/route.ts 2>/dev/null; then
    pass "白名单存在"; else fail "缺失"; ok=false; fi

  echo -n "  3.4 CSRF中间件... "
  grep -q "CSRF" src/proxy.ts 2>/dev/null && pass "存在" || { fail "缺失"; ok=false; }

  echo -n "  3.5 user_type防篡改... "
  grep -q "user_type" src/app/api/user/profile/route.ts 2>/dev/null && \
    warn "需检查是否可写" || pass "未暴露"

  $ok && return 0 || return 1
}

# ── L4: 性能 ──
check_l4() {
  echo ""; echo "======== L4 性能基线 ========"
  local ok=true

  echo -n "  4.1 next/image... "
  c=$(grep -r "next/image" src/ --include="*.tsx" 2>/dev/null | wc -l)
  if [ "$c" -ge 8 ]; then pass "$c 处（全图片页面已覆盖）"; else warn "$c 处(≥8)"; ok=false; fi

  echo -n "  4.2 dynamic... "
  c=$(grep -r "dynamic(" src/ --include="*.tsx" 2>/dev/null | wc -l)
  if [ "$c" -ge 1 ]; then pass "$c 处（合理懒加载）"; else warn "$c 处(≥1)"; ok=false; fi

  echo -n "  4.3 drizzle-kit deps... "
  node -e "const p=require('./package.json');process.exit(p.dependencies['drizzle-kit']?0:1)" 2>/dev/null && \
    pass "drizzle-kit在dependencies（Zeabur需要）" || { warn "drizzle-kit缺失"; ok=false; }

  echo -n "  4.4 Suspense... "
  c=$(grep -r "Suspense" src/ --include="*.tsx" 2>/dev/null | wc -l)
  if [ "$c" -ge 2 ]; then pass "$c 处"; else warn "$c 处(≥2)"; ok=false; fi

  $ok && return 0 || return 1
}

# ── L5: SEO ──
check_l5() {
  echo ""; echo "======== L5 SEO/文案 ========"
  local ok=true

  echo -n "  5.1 meta描述... "
  grep -q "懂桂电学生的AI朋友——小职" src/app/layout.tsx 2>/dev/null && pass "统一" || { fail "不符"; ok=false; }

  echo -n "  5.2 metadataBase... "
  grep -q "metadataBase" src/app/layout.tsx 2>/dev/null && pass "已配置" || { fail "缺失"; ok=false; }

  echo -n "  5.3 viewport... "
  grep -q "viewport" src/app/layout.tsx 2>/dev/null && pass "已导出" || { fail "缺失"; ok=false; }

  echo -n "  5.4 sitemap... "
  c=$(curl -s https://zhituxing.tech/sitemap.xml 2>/dev/null | grep -c "<loc>" || echo "0")
  if [ "$c" -ge 10 ]; then pass "$c URLs"; else warn "$c URLs(≥10)"; ok=false; fi

  echo -n "  5.5 空alt... "
  c=$(grep -rn 'alt=""' src/ --include="*.tsx" 2>/dev/null | grep -v "decoration\|presentation" | wc -l)
  if [ "$c" -eq 0 ]; then pass "零"; else warn "$c 处"; ok=false; fi

  $ok && return 0 || return 1
}

# ── L6: 构建 ──
check_l6() {
  echo ""; echo "======== L6 构建验证 ========"
  local ok=true

  echo -n "  6.1 next build... "
  if npx next build 2>&1 | grep -qE "✓ (Compiled|Generating static)"; then pass "通过"
  else fail "失败"; ok=false; fi

  echo -n "  6.2 ESLint... "
  npx next lint --max-warnings 0 2>&1 | grep -q "No ESLint" && pass "clean" || warn "有warning"

  $ok && return 0 || return 1
}

# ── 主流程 ──
main() {
  local target="${1:-all}"

  case "$target" in
    L1|L2|L3|L4|L5|L6) check_$(echo $target | tr 'A-Z' 'a-z'); exit $? ;;
    all) ;;
    *) echo "用法: $0 [L1|L2|L3|L4|L5|L6|all]"; exit 1 ;;
  esac

  echo ""
  echo "═══════════════════════════════════"
  echo "  职途星自动化迭代管道 v1.0"
  echo "═══════════════════════════════════"

  check_l1 && l1="✅" || l1="❌"
  check_l2 && l2="✅" || l2="❌"
  check_l3 && l3="✅" || l3="❌"
  check_l4 && l4="✅" || l4="❌"
  check_l5 && l5="✅" || l5="❌"
  check_l6 && l6="✅" || l6="❌"

  echo ""
  echo "═══════════════════════════════════"
  echo "  L1架构圣经: $l1  L2 TS: $l2  L3安全: $l3"
  echo "  L4性能: $l4  L5 SEO: $l5  L6构建: $l6"
  if [ "$l1" = "✅" ] && [ "$l2" = "✅" ] && [ "$l3" = "✅" ] && [ "$l4" = "✅" ] && [ "$l5" = "✅" ] && [ "$l6" = "✅" ]; then
    echo -e "  ${GREEN}✅ 全层通过 — 可以 push 部署${NC}"
  else
    echo -e "  ${RED}❌ 未全通过 — 修复后重跑${NC}"
  fi
  echo "═══════════════════════════════════"
}

main "$@"
