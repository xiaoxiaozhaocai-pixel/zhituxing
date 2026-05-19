#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

PORT=5000
DEPLOY_RUN_PORT="${DEPLOY_RUN_PORT:-$PORT}"

cd "${COZE_WORKSPACE_PATH}"

echo "Starting Next.js standalone server on port ${DEPLOY_RUN_PORT}..."

# Standalone 模式 - 查找项目根目录下的 server.js（排除 node_modules 内的）
STANDALONE_SERVER=$(find .next/standalone -name "server.js" -type f | grep -v node_modules | head -1)

if [ -z "$STANDALONE_SERVER" ]; then
  echo "ERROR: standalone server.js not found!"
  echo "Falling back to next start..."
  PORT=${DEPLOY_RUN_PORT} pnpm next start
else
  STANDALONE_DIR=$(dirname "$STANDALONE_SERVER")
  echo "Found standalone server at: $STANDALONE_SERVER"
  cd "$STANDALONE_DIR"
  PORT=${DEPLOY_RUN_PORT} node server.js
fi
