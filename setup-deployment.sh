#!/bin/bash

# 🚀 Auraa Luxury - Complete Deployment Setup Script
# This script prepares everything for GitHub + Vercel deployment

echo "🚀 Auraa Luxury Deployment Setup"
echo "================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Step 1: Validate local environment
print_step "Step 1: Validating local environment"

if [ ! -f "frontend/package.json" ]; then
    print_error "frontend/package.json not found!"
    exit 1
fi

if [ ! -f ".github/workflows/deploy.yml" ]; then
    print_error "GitHub workflow file not found!"
    exit 1
fi

print_success "Local files validated"

# Step 2: Test build
print_step "Step 2: Testing frontend build"

cd frontend
if npm run build > build.log 2>&1; then
    BUILD_SIZE=$(du -sh build | cut -f1)
    print_success "Build successful! Size: $BUILD_SIZE"
else
    print_error "Build failed! Check build.log for details"
    tail -20 build.log
    exit 1
fi
cd ..

# Step 3: Validate JSON files
print_step "Step 3: Validating JSON configuration files"

for file in "frontend/package.json" "vercel.json" "frontend/vercel.json"; do
    if [ -f "$file" ]; then
        if python3 -c "import json; json.load(open('$file'))" 2>/dev/null; then
            print_success "$file is valid JSON"
        else
            print_error "$file has invalid JSON syntax"
            exit 1
        fi
    fi
done

# Step 4: Environment check
print_step "Step 4: Checking environment configuration"

if grep -q "https://auraa-luxury-store.onrender.com" frontend/.env; then
    print_success "Backend URL configured correctly"
else
    print_warning "Backend URL may need verification"
fi

# Step 5: Generate deployment checklist
print_step "Step 5: Generating deployment checklist"

cat > DEPLOYMENT_CHECKLIST.md << 'EOL'
# 🚀 Deployment Checklist

## ✅ Completed (Automated)
- [x] Frontend build test passes
- [x] JSON files validated
- [x] GitHub Actions workflow configured
- [x] Vercel configuration files ready
- [x] Dependencies resolved

## 🔧 Manual Steps Required

### 1. GitHub Secrets (Required)
```
Repository: yasoo2/auraa-luxury-store
Settings → Secrets and variables → Actions

Add these secrets:
REACT_APP_BACKEND_URL = https://auraa-luxury-store.onrender.com
VERCEL_DEPLOY_HOOK = [Get from Vercel - Step 2 below]
```

### 2. Vercel Deploy Hook (Required)
```
1. Go to Vercel Dashboard
2. Project: auraa-luxury-store
3. Settings → Git → Deploy Hooks
4. Create Hook:
   - Name: prod-on-merge
   - Branch: main
5. Copy the generated URL
6. Add to GitHub Secret: VERCEL_DEPLOY_HOOK
```

### 3. Vercel Project Settings (Verify)
```
Settings → General:
- Framework Preset: Create React App
- Root Directory: frontend (if monorepo)
- Build Command: npm run build
- Output Directory: build
- Install Command: npm ci
- Node.js Version: 20.x

Environment Variables:
- REACT_APP_BACKEND_URL = https://auraa-luxury-store.onrender.com
```

### 4. Test Pipeline
```
1. Create small change (e.g., edit README.md)
2. Commit and push to main branch
3. Check GitHub Actions tab for workflow execution
4. Check Vercel Deployments for new deployment
5. Verify production domain updates
```

## 🎯 Expected Flow
```
Code Change → Push to main → GitHub Actions → Vercel Deploy Hook → Build & Deploy → Live Site
```

## 📞 Support Commands
```bash
# Test build locally
cd frontend && npm run build

# Validate JSON
python3 -c "import json; json.load(open('frontend/package.json'))"

# Check workflow syntax
cat .github/workflows/deploy.yml
```

---
**Status:** Ready for manual setup completion
**Next:** Complete GitHub Secrets and Vercel Deploy Hook setup
EOL

print_success "Deployment checklist created: DEPLOYMENT_CHECKLIST.md"

# Final summary
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
print_success "All automated preparations completed successfully"
print_warning "Manual steps required: GitHub Secrets + Vercel Deploy Hook"
print_step "Next: Follow DEPLOYMENT_CHECKLIST.md for manual setup"
echo ""
echo "🔗 Quick Links:"
echo "• GitHub Repo: https://github.com/yasoo2/auraa-luxury-store"
echo "• Vercel Dashboard: https://vercel.com/dashboard"
echo "• Actions: https://github.com/yasoo2/auraa-luxury-store/actions"
echo ""