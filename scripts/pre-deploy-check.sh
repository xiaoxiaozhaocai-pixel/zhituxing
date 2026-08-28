#!/bin/bash
# P2 预发布验证：部署后自动跑关键检查，不通过则触发回滚
set -euo pipefail

SITE="${1:-https://zhituxing.tech}"
FAIL=0

echo "===== 预发布验证: $SITE ====="

# 1. 基础健康
echo -n "健康检查... "
if curl -sf -m10 "$SITE/api/health" > /dev/null 2>&1; then
  echo "✅"
else
  echo "❌"
  FAIL=1
fi

# 2. 首页可访问（落临时文件再 grep，避免 set -euo pipefail 下 curl|grep -q 的 SIGPIPE 误报）
echo -n "首页... "
if curl -sfL -m10 "$SITE/" -o /tmp/ztx_predeploy_home.html && grep -q "职途星" /tmp/ztx_predeploy_home.html; then
  echo "✅"
else
  echo "❌"
  FAIL=1
fi

# 3. 关键功能页
for page in skills-graph resume-optimize assistant search; do
  echo -n "/$page... "
  if curl -sfL -o /dev/null -m10 "$SITE/$page"; then
    echo "✅"
  else
    echo "❌"
    FAIL=1
  fi
done

# 4. 后台鉴权
echo -n "后台登录页... "
if curl -sfL -o /dev/null -m10 "$SITE/admin/login"; then
  echo "✅"
else
  echo "❌"
  FAIL=1
fi

echo ""
if [ $FAIL -eq 0 ]; then
  echo "预发布验证: 全部通过 ✅"
  exit 0
else
  echo "预发布验证: $FAIL 项失败 ❌ — 建议回滚"
  exit 1
fi
