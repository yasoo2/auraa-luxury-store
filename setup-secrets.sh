#!/bin/bash
# GitHub Secrets Setup Script
# This script will help add secrets to GitHub repository

echo "🔧 GitHub Secrets Setup for Auraa Luxury"
echo "========================================"
echo ""

# Check if GitHub CLI is available
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Please install it first:"
    echo "   https://cli.github.com/"
    echo ""
    echo "🔄 Alternative: Add secrets manually via GitHub web interface"
    echo "   Go to: https://github.com/YOUR_USERNAME/auraa-luxury-store/settings/secrets/actions"
    exit 1
fi

echo "📋 Required secrets for full CI/CD:"
echo "1. REACT_APP_BACKEND_URL (Required)"
echo "2. VERCEL_TOKEN (Optional - for auto-deploy)"
echo "3. VERCEL_ORG_ID (Optional - for auto-deploy)" 
echo "4. VERCEL_PROJECT_ID (Optional - for auto-deploy)"
echo "5. RENDER_DEPLOY_HOOK (Optional - for backend auto-deploy)"
echo ""

# Function to add secret
add_secret() {
    local secret_name=$1
    local secret_value=$2
    
    if [ -n "$secret_value" ]; then
        echo "➕ Adding $secret_name..."
        echo "$secret_value" | gh secret set "$secret_name"
        if [ $? -eq 0 ]; then
            echo "✅ $secret_name added successfully"
        else
            echo "❌ Failed to add $secret_name"
        fi
    else
        echo "⚠️  Skipping $secret_name (empty value)"
    fi
    echo ""
}

# Read secrets from .env.secrets file
if [ -f ".env.secrets" ]; then
    echo "📖 Reading secrets from .env.secrets file..."
    source .env.secrets
    
    add_secret "REACT_APP_BACKEND_URL" "$REACT_APP_BACKEND_URL"
    add_secret "VERCEL_TOKEN" "$VERCEL_TOKEN" 
    add_secret "VERCEL_ORG_ID" "$VERCEL_ORG_ID"
    add_secret "VERCEL_PROJECT_ID" "$VERCEL_PROJECT_ID"
    add_secret "RENDER_DEPLOY_HOOK" "$RENDER_DEPLOY_HOOK"
else
    echo "❌ .env.secrets file not found"
    echo "📝 Please create .env.secrets file with your secrets first"
fi

echo "🎉 Setup complete! Check GitHub Actions tab for workflows."
echo "🔗 Actions URL: https://github.com/YOUR_USERNAME/auraa-luxury-store/actions"