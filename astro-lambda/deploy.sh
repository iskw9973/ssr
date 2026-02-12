#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Astro SSR Lambda Deployment ==="

# Step 1: Build Astro app
echo ""
echo "[1/3] Building Astro app..."
cd "$PROJECT_ROOT/astro-app"
pnpm install
pnpm build

# Step 2: Install CDK dependencies
echo ""
echo "[2/3] Installing CDK dependencies..."
cd "$SCRIPT_DIR"
pnpm install

# Step 3: CDK deploy
echo ""
echo "[3/3] Deploying CDK stacks..."
pnpm cdk deploy --all --require-approval broadening

echo ""
echo "=== Deployment complete! ==="
