#!/bin/bash

echo "🚀 Tracy Talks Health - Render Deployment Script"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git repository not initialized${NC}"
    echo "Initializing git repository..."
    git init
    echo ""
fi

# Add all files
echo -e "${BLUE}📦 Adding files to git...${NC}"
git add .

# Check if there are changes to commit
if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✓ No new changes to commit${NC}"
else
    # Commit changes
    echo -e "${BLUE}💾 Committing changes...${NC}"
    git commit -m "Deploy to Render - $(date +'%Y-%m-%d %H:%M:%S')"
    echo ""
fi

# Check if remote exists
if ! git remote | grep -q "origin"; then
    echo -e "${YELLOW}⚠️  No git remote configured${NC}"
    echo ""
    echo "Please create a GitHub repository and run:"
    echo -e "${BLUE}git remote add origin https://github.com/YOUR_USERNAME/tracytalks-health.git${NC}"
    echo -e "${BLUE}git branch -M main${NC}"
    echo -e "${BLUE}git push -u origin main${NC}"
    echo ""
    echo "Then follow the deployment guide in DEPLOYMENT-RENDER.md"
    exit 1
fi

# Push to GitHub
echo -e "${BLUE}🚀 Pushing to GitHub...${NC}"
git push origin main

echo ""
echo -e "${GREEN}✓ Code pushed to GitHub successfully!${NC}"
echo ""
echo "📋 Next Steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Create PostgreSQL database (free tier)"
echo "3. Create Web Service and connect your GitHub repo"
echo "4. Follow the guide in DEPLOYMENT-RENDER.md"
echo ""
echo "📖 Full deployment guide: DEPLOYMENT-RENDER.md"
