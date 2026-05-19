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

# ========== 构建时环境变量 ==========
# Coze 构建阶段不注入环境变量，需要手动设置 NEXT_PUBLIC_* 变量
# 注意：SERVICE_ROLE_KEY 绝不能放在这里，仅运行时注入
export NEXT_PUBLIC_SUPABASE_URL="https://gpwekhlltsvoalmqzjyv.supabase.co"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdwd2VraGxsdHN2b2FsbXF6anl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NTc3NDYsImV4cCI6MjA5MjMzMzc0Nn0.mYAEZo9kp_caWYzXexCBIrpFF7soCAG1stuqGWjJILQ"
echo "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set for build"
# ==========================================

NODE_OPTIONS='--max-old-space-size=2048' pnpm next build

# ========== Standalone 静态文件复制 ==========
# standalone 模式需要手动复制 static 和 public 目录
echo "Copying static files for standalone mode..."

# 找到 standalone 目录（server.js 所在目录）
STANDALONE_DIR=$(find .next/standalone -name "server.js" -type f | grep -v node_modules | head -1 | xargs dirname)

if [ -n "$STANDALONE_DIR" ]; then
  echo "Standalone directory: $STANDALONE_DIR"
  
  # 复制 .next/static 到 standalone/.next/static
  if [ -d ".next/static" ]; then
    mkdir -p "$STANDALONE_DIR/.next/static"
    cp -r .next/static/* "$STANDALONE_DIR/.next/static/"
    echo "✓ Copied .next/static"
  fi
  
  # 复制 public 到 standalone/public
  if [ -d "public" ]; then
    cp -r public "$STANDALONE_DIR/"
    echo "✓ Copied public"
  fi
else
  echo "WARNING: standalone directory not found!"
fi
# ==========================================

echo "Build completed successfully!"
