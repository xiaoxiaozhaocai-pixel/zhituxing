#!/bin/bash
# L7 冒烟测试 - 关键页面可用性验证
# 用法: bash scripts/smoke-test.sh [base_url]
set -euo pipefail

BASE="${1:-https://zhituxing.tech}"
FAIL=0
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

check() {
  local label="$1" url="$2" expect_code="$3" grep_str="${4:-}"
  local code
  # —L 跟随重定向（如 /assistant → 登录页）
  code=$(curl -sL -o /tmp/smoke_tmp -w "%{http_code}" -m 10 "$url" 2>/dev/null)
  if [ "$code" != "$expect_code" ]; then
    echo -e "  ${RED}✗${NC} $label → HTTP $code (expected $expect_code)"
    FAIL=1; return
  fi
  if [ -n "$grep_str" ]; then
    if ! grep -q "$grep_str" /tmp/smoke_tmp 2>/dev/null; then
      echo -e "  ${RED}✗${NC} $label → 200 but missing \"$grep_str\""
      FAIL=1; return
    fi
  fi
  echo -e "  ${GREEN}✓${NC} $label"
}

echo "===== L7 冒烟测试: $BASE ====="
echo ""

# P0: 核心页面
check "首页"              "$BASE/"                        200 "职途星"
check "技能图谱"          "$BASE/skills-graph"            200 "技能"
check "简历优化"          "$BASE/resume-optimize"         200 "简历"
check "技能画像"          "$BASE/skill-portrait"          200 "技能"
check "小职对话"          "$BASE/assistant"               200 "职途星"
check "搜索岗位"          "$BASE/search"                  200 "岗位"
check "资源中心"          "$BASE/resources"               200 "资源"
check "职业规划"          "$BASE/career-planning"         200 "职业"

# P1: 静态资源
check "robots.txt"        "$BASE/robots.txt"              200 ""
check "sitemap.xml"       "$BASE/sitemap.xml"             200 ""

# P2: 后台（静态页面，client-side渲染）
check "后台登录页"        "$BASE/admin/login"             200 ""

# P3: API健康检查
check "API健康"           "$BASE/api/health"              200 "ok"

echo ""
if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}L7 冒烟测试: 全部通过 ✅${NC}"
  rm -f /tmp/smoke_tmp
  exit 0
else
  echo -e "${RED}L7 冒烟测试: 有失败项 ❌${NC}"
  rm -f /tmp/smoke_tmp
  exit 1
fi
