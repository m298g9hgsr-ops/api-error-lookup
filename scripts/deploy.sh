#!/usr/bin/env bash
# Deployment script for api-error-lookup
# Usage: ./scripts/deploy.sh [preview|production]

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

MODE="${1:-preview}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo -e "${BLUE}🚀 Deploying api-error-lookup (${MODE})...${NC}"
echo "Project: ${PROJECT_DIR}"

cd "${PROJECT_DIR}"

# 1. Pre-deployment checks
echo -e "\n${YELLOW}📋 Pre-deployment checks...${NC}"

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo -e "${RED}❌ Vercel CLI not found. Installing...${NC}"
    npm i -g vercel@latest
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Vercel. Please login...${NC}"
    vercel login
fi

# 2. Run tests
echo -e "\n${YELLOW}🧪 Running tests...${NC}"
npm run test
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed. Aborting deployment.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ All tests passed${NC}"

# 3. Type check
echo -e "\n${YELLOW}🔍 Type checking...${NC}"
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Type check failed. Aborting deployment.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Type check passed${NC}"

# 4. Build
echo -e "\n${YELLOW}🏗️  Building...${NC}"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Aborting deployment.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build successful${NC}"

# 5. Deploy to Vercel
echo -e "\n${YELLOW}☁️  Deploying to Vercel (${MODE})...${NC}"

if [ "${MODE}" = "production" ]; then
    vercel --prod --yes
else
    vercel --yes
fi

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}🎉 Deployment successful!${NC}"
    echo -e "${BLUE}📝 Don't forget to:${NC}"
    echo "  1. Verify environment variables in Vercel Dashboard"
    echo "  2. Configure Stripe webhook endpoint"
    echo "  3. Test production health check: /api/health"
    echo "  4. Monitor first real requests"
else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
fi