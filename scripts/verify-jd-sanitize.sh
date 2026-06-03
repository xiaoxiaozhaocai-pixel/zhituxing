#!/usr/bin/env bash
# JD 脱敏验证脚本
# 用法：./scripts/verify-jd-sanitize.sh [base_url]
# 默认 base_url=https://zhituxing.zeabur.app

set -e
BASE=${1:-https://zhituxing.zeabur.app}
SENSITIVE='source_url|source_platform|raw_jd'

declare -a ENDPOINTS=(
  "/api/jobs?page=1&pageSize=2"
  "/api/jobs/list?limit=2"
  "/api/match?limit=2"
  "/api/search-jd?keyword=运营&limit=2"
)

fail=0
for ep in "${ENDPOINTS[@]}"; do
  echo "=== $ep ==="
  resp=$(curl -s -m 15 "${BASE}${ep}")
  if echo "$resp" | grep -E "\"($SENSITIVE)\"" > /dev/null; then
    echo "❌ FAIL: 响应里发现敏感字段"
    echo "$resp" | head -c 300
    echo ""
    fail=$((fail+1))
  else
    echo "✅ PASS"
  fi
done

if [ $fail -gt 0 ]; then
  echo ""
  echo "❌ 总共 $fail 个接口未通过脱敏验证"
  exit 1
fi
echo ""
echo "🎉 全部接口脱敏验证通过"
