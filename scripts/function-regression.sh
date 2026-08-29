#!/bin/bash
# 职途星功能回归层（云端 CI 驱动）
# 定位：在 L1-L6(代码合规/静态) 与 L7(冒烟) 之外，做「功能级」回归——
#       核心用户页面可用性 + 核心API + 内容红线 + 前端残留检查。
# 目的：每次迭代 push 后自动跑，判断「这次改动是否影响用户可见功能 / 是否引入 bug / 是否踩红线」。
# 用法: bash scripts/function-regression.sh [base_url]
# 输出: 通过/失败 + P1(核心功能受损)/P2(合规/视觉) 分级

set -uo pipefail
BASE="${1:-https://zhituxing.tech}"
PASS=0; FAIL=0; P1=0; P2=0
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
BODY="/tmp/fr_body"

# 页面/API 可用性断言: page <label> <relative_url> <must_contain> <P1|P2>
page() {
  local label="$1" url="$2" must="$3" lvl="${4:-P1}"
  local code
  code=$(curl -sL -o "$BODY" -w "%{http_code}" -m 12 "$BASE$url" 2>/dev/null)
  if [ "$code" != "200" ]; then
    echo -e "  ${RED}✗${NC} [$lvl] $label → HTTP $code"; FAIL=$((FAIL+1)); [ "$lvl" = "P1" ] && P1=$((P1+1)) || P2=$((P2+1)); return
  fi
  if [ -n "$must" ] && ! grep -q "$must" "$BODY" 2>/dev/null; then
    echo -e "  ${RED}✗${NC} [$lvl] $label → 200 但缺「$must」"; FAIL=$((FAIL+1)); [ "$lvl" = "P1" ] && P1=$((P1+1)) || P2=$((P2+1)); return
  fi
  echo -e "  ${GREEN}✓${NC} [$lvl] $label"; PASS=$((PASS+1))
}

# 内容/合规断言（页面不含某元素，含则失败）: not_contain <label> <relative_url> <forbidden> <P1|P2>
not_contain() {
  local label="$1" url="$2" bad="$3" lvl="${4:-P2}"
  local code
  code=$(curl -sL -o "$BODY" -w "%{http_code}" -m 12 "$BASE$url" 2>/dev/null)
  if [ "$code" != "200" ]; then echo -e "  ${YELLOW}~${NC} [$lvl] $label 页面不可达(跳过)"; return; fi
  if grep -q "$bad" "$BODY" 2>/dev/null; then
    echo -e "  ${RED}✗${NC} [$lvl] $label 违规含「$bad」"; FAIL=$((FAIL+1)); [ "$lvl" = "P1" ] && P1=$((P1+1)) || P2=$((P2+1)); return
  fi
  echo -e "  ${GREEN}✓${NC} [$lvl] $label"; PASS=$((PASS+1))
}

echo ""
echo "======== 功能回归层: $BASE ========"
echo ""

# —— P0 核心用户页面可用性（P1: 访问失败即视为功能受损）——
echo "[P0] 核心用户页面可用性"
page "首页"            "/"            "职途星"
page "判断力内容库"    "/insights"     "判断力"
page "职业规划"        "/career-planning" "职业"
page "小职对话"        "/assistant"    "职途星"
page "简历优化"        "/resume-optimize" "简历"
page "岗位百科"        "/jobs"         "岗位"
page "学习路径"        "/learning-path" "路径"
page "会员中心"        "/membership"   "会员"
page "技能画像"        "/skill-portrait" "技能"
page "技能图谱"        "/skills-graph" "技能"
page "搜索岗位"        "/search"       "岗位"
page "干货库"          "/resources"    "资源"
page "常见问题"        "/faq"          "常见"
page "联系我们"        "/contact"      "联系"
page "高校合作"        "/university"   "高校"
page "企业服务"        "/enterprise"   "企业"
page "求职指南"        "/guide"        "职业"

# —— P1 核心公开 API ——
echo ""
echo "[P1] 核心公开 API"
page "API健康"         "/api/health"   "ok"

# —— P2 内容红线 / 残留（合规）——
echo ""
echo "[P2] 内容红线 / 前端残留"
not_contain "判断力内容库(禁答辩)" "/insights" "答辩"
not_contain "首页(data-inspector残留)" "/" "data-inspector"

echo ""
echo "===== 功能回归报告 ====="
echo -e "  通过 ${GREEN}${PASS}${NC}  |  失败 ${RED}${FAIL}${NC}  |  P1(核心功能受损) ${RED}${P1}${NC}  |  P2(合规/视觉) ${YELLOW}${P2}${NC}"
rm -f "$BODY"
if [ "$FAIL" -eq 0 ]; then
  echo -e "${GREEN}功能回归层: 全部通过 ✅${NC}"
  exit 0
else
  echo -e "${RED}功能回归层: 存在失败项，请排查 ❌${NC}"
  exit 1
fi
