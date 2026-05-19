#!/bin/bash
set -Eeuo pipefail

# ========== 环境诊断 ==========
echo "========== 环境诊断 =========="
echo "Node version:"
node -v
echo "PNPM version:"
pnpm -v
echo "Disk space:"
df -h /
echo "Memory:"
free -m 2>/dev/null || echo "free command not available"
echo "Environment variables:"
echo "NODE_ENV=${NODE_ENV:-not set}"
echo "COZE_PROJECT_ENV=${COZE_PROJECT_ENV:-not set}"
echo "=========================================="

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --loglevel error

echo "Building the Next.js project..."

# ========== 构建时环境变量 ==========
# Coze 构建阶段不注入环境变量，需要手动设置 NEXT_PUBLIC_* 变量
# 注意：SERVICE_ROLE_KEY 绝不能放在这里，仅运行时注入
# ANON_KEY 从环境变量读取，不再硬编码
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  export NEXT_PUBLIC_SUPABASE_URL="https://gpwekhlltsvoalmqzjyv.supabase.co"
fi
if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "WARNING: NEXT_PUBLIC_SUPABASE_ANON_KEY is not set, build may fail"
fi
echo "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY configured for build"
# ==========================================

NODE_OPTIONS='--max-old-space-size=2048' pnpm next build

echo "Build completed successfully!"
