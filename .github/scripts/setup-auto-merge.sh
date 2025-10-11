#!/bin/bash
# Setup Auto-merge Configuration Script for Auraa Luxury
# This script configures local git settings for optimal auto-merge behavior

set -e  # Exit on error

echo "🚀 Setting up auto-merge configuration for Auraa Luxury..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository! Please run this script from the project root."
    exit 1
fi

print_status "Configuring git settings for auto-merge..."

# Configure merge drivers
print_status "Setting up merge drivers..."
git config merge.ours.driver true
git config merge.ours.name "Always use our version during merge"

# Configure merge strategies for different file types
print_status "Configuring merge strategies..."

# Set default merge strategy
git config merge.tool vimdiff  # Fallback for complex conflicts
git config merge.conflictstyle diff3  # Better conflict markers

# Configure user identity for automation (fallback)
if [[ -z "$(git config user.name)" ]]; then
    print_warning "No git user.name configured, setting default..."
    git config user.name "Auraa Developer"
fi

if [[ -z "$(git config user.email)" ]]; then
    print_warning "No git user.email configured, setting default..."
    git config user.email "dev@auraa-luxury.com"
fi

# Configure push settings for better automation
print_status "Configuring push settings..."
git config push.default simple
git config push.autoSetupRemote true

# Configure pull settings
git config pull.rebase false  # Prefer merge commits for clarity

# Configure branch settings
print_status "Configuring branch settings..."
git config branch.autosetupmerge always
git config branch.autosetuprebase never

# Configure diff and merge tools
print_status "Configuring diff and merge tools..."
git config diff.tool vimdiff
git config difftool.prompt false
git config mergetool.prompt false

# Set up aliases for common auto-merge operations
print_status "Setting up git aliases..."

git config alias.auto-merge '!f() { 
    echo "🤖 Starting auto-merge process..."; 
    git fetch origin;
    if git merge origin/main -X theirs --no-edit; then 
        echo "✅ Auto-merge successful"; 
    else 
        echo "⚠️ Conflicts detected, applying resolution rules...";
        for f in package-lock.json yarn.lock pnpm-lock.yaml; do 
            if [ -f "$f" ] && git ls-files -u | grep -q "$f"; then
                echo "Resolving $f (keeping local version)";
                git checkout --ours -- "$f";
                git add "$f";
            fi;
        done;
        if git ls-files -u | grep -q .; then
            echo "❌ Manual conflicts remain:";
            git ls-files -u;
            exit 1;
        fi;
        git commit -m "chore: auto-resolve merge conflicts";
        echo "✅ Conflicts resolved automatically";
    fi;
}; f'

git config alias.smart-merge '!f() {
    branch=${1:-main};
    echo "🧠 Smart merging from $branch...";
    git fetch origin;
    git merge origin/$branch -X theirs;
}; f'

git config alias.fix-lockfiles '!f() {
    echo "🔧 Fixing lockfile conflicts...";
    for f in package-lock.json yarn.lock pnpm-lock.yaml; do
        if [ -f "$f" ] && git ls-files -u | grep -q "$f"; then
            echo "Fixing $f";
            git checkout --ours -- "$f";
            git add "$f";
        fi;
    done;
    echo "✅ Lockfiles fixed";
}; f'

# Configure rerere (reuse recorded resolution)
print_status "Enabling rerere for conflict resolution learning..."
git config rerere.enabled true
git config rerere.autoUpdate true

# Configure core settings for better automation
print_status "Configuring core git settings..."
git config core.autocrlf false  # Prevent CRLF issues
git config core.filemode false  # Ignore file permission changes
git config core.ignorecase false  # Be case sensitive

# Configure remote settings
print_status "Configuring remote settings..."
git config remote.origin.prune true  # Auto-prune deleted remote branches

# Set up hooks directory (if not exists)
if [ ! -d ".git/hooks" ]; then
    mkdir -p .git/hooks
fi

# Create pre-merge-commit hook for validation
print_status "Setting up git hooks..."
cat > .git/hooks/pre-merge-commit << 'EOF'
#!/bin/bash
# Pre-merge commit hook for auto-merge validation

echo "🔍 Validating merge commit..."

# Check for unresolved conflicts
if git ls-files -u | grep -q .; then
    echo "❌ Unresolved conflicts detected!"
    git ls-files -u
    exit 1
fi

# Check for large files (>10MB)
large_files=$(find . -type f -size +10M -not -path "./.git/*" -not -path "./node_modules/*" 2>/dev/null)
if [ -n "$large_files" ]; then
    echo "⚠️ Large files detected:"
    echo "$large_files"
    echo "Consider using Git LFS for large files"
fi

# Check for sensitive data patterns
if grep -r -i "password\|secret\|key.*=" --include="*.js" --include="*.ts" --include="*.json" . 2>/dev/null | grep -v node_modules | grep -v ".git" | head -5; then
    echo "⚠️ Potential sensitive data detected. Please review before committing."
fi

echo "✅ Pre-merge validation passed"
EOF

chmod +x .git/hooks/pre-merge-commit

# Create post-merge hook for cleanup
cat > .git/hooks/post-merge << 'EOF'
#!/bin/bash
# Post-merge hook for cleanup and notifications

echo "🧹 Running post-merge cleanup..."

# Reinstall dependencies if lockfiles changed
if git diff HEAD@{1} --name-only | grep -q "package-lock.json\|yarn.lock\|pnpm-lock.yaml"; then
    echo "📦 Lockfiles changed, dependencies may need reinstallation"
    echo "Run: npm install or yarn install in frontend/ and backend/"
fi

# Clear any merge backup files
find . -name "*.orig" -delete 2>/dev/null || true

echo "✅ Post-merge cleanup completed"
EOF

chmod +x .git/hooks/post-merge

print_status "Git configuration completed successfully!"

# Display configured settings
echo ""
echo "📋 Current auto-merge configuration:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

git config --list | grep -E "(merge\.|alias\.|rerere\.|user\.)" | sort

echo ""
echo "🎯 Available commands:"
echo "  git auto-merge     - Automatically merge main with conflict resolution"
echo "  git smart-merge    - Smart merge from specified branch"
echo "  git fix-lockfiles  - Resolve lockfile conflicts"

echo ""
print_status "Setup complete! Your repository is now configured for optimal auto-merge behavior."
print_warning "Remember to push your changes and create PRs to trigger the automated CI/CD pipeline."

# Test configuration
echo ""
echo "🧪 Testing configuration..."
if git config --get merge.ours.driver >/dev/null; then
    print_status "Merge drivers configured correctly"
else
    print_error "Merge driver configuration failed"
    exit 1
fi

if [ -f ".gitattributes" ]; then
    print_status ".gitattributes file exists"
else
    print_warning ".gitattributes file not found - lockfile merge rules may not work"
fi

if [ -f ".github/workflows/auto-resolve-and-ci.yml" ]; then
    print_status "GitHub Actions workflow configured"
else
    print_warning "GitHub Actions workflow not found"
fi

print_status "All checks passed! 🎉"