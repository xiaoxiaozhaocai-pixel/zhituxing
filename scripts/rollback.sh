#!/bin/bash
# P2 快速回滚：回退到上一个 commit 并强制推送
set -euo pipefail

cd "$(dirname "$0")/.."

echo "当前 HEAD: $(git log --oneline -1)"
echo "上一个:    $(git log --oneline -2 | tail -1)"

if [ "${1:-}" != "--confirm" ]; then
  echo ""
  echo "⚠️  这将回退到上一个commit并强制推送。"
  echo "   确认执行: bash scripts/rollback.sh --confirm"
  exit 0
fi

# 回退一个 commit
git reset --hard HEAD~1
git push --force origin main
echo "✅ 已回滚到: $(git log --oneline -1)"
