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

echo "Building the Next.js project with standalone output..."
NODE_OPTIONS='--max-old-space-size=2048' pnpm next build

echo "Build completed successfully!"
