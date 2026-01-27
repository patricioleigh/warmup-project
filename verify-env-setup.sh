#!/bin/bash
# =============================================================================
# Environment Setup Verification Script
# =============================================================================
# This script checks if your environment is properly configured
# Run: bash verify-env-setup.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🔍 Environment Setup Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

ERRORS=0
WARNINGS=0

# Function to print status
print_status() {
    local status=$1
    local message=$2
    
    if [ "$status" = "ok" ]; then
        echo -e "${GREEN}✓${NC} $message"
    elif [ "$status" = "warn" ]; then
        echo -e "${YELLOW}⚠${NC} $message"
        ((WARNINGS++))
    elif [ "$status" = "error" ]; then
        echo -e "${RED}✗${NC} $message"
        ((ERRORS++))
    else
        echo -e "${BLUE}ℹ${NC} $message"
    fi
}

# Function to check if file exists
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        print_status "ok" "$description exists: $file"
        return 0
    else
        print_status "error" "$description missing: $file"
        return 1
    fi
}

# Function to check environment variable in file
check_env_var() {
    local file=$1
    local var=$2
    local min_length=${3:-1}
    
    if [ ! -f "$file" ]; then
        return 1
    fi
    
    if grep -q "^${var}=" "$file"; then
        local value=$(grep "^${var}=" "$file" | cut -d '=' -f2-)
        
        # Check if it's a placeholder or example value
        if echo "$value" | grep -qi "change.*me\|your.*secret\|example\|placeholder"; then
            print_status "warn" "$var in $file is still using placeholder value"
            return 2
        elif [ ${#value} -lt $min_length ]; then
            print_status "warn" "$var in $file is too short (min: $min_length chars)"
            return 2
        else
            print_status "ok" "$var is set in $file"
            return 0
        fi
    else
        print_status "warn" "$var not found in $file"
        return 1
    fi
}

echo "📄 Checking .env.example files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file ".env.example" "Root .env.example"
check_file "server/.env.example" "Server .env.example"
check_file "client/.env.example" "Client .env.example"
echo ""

echo "🔐 Checking actual .env files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check root .env (for Docker)
if check_file ".env" "Root .env"; then
    check_env_var ".env" "JWT_SECRET" 16
fi

# Check server .env
if check_file "server/.env" "Server .env"; then
    check_env_var "server/.env" "NODE_ENV"
    check_env_var "server/.env" "MONGO_URI" 10
    check_env_var "server/.env" "REDIS_URL" 10
    check_env_var "server/.env" "JWT_SECRET" 16
fi

# Check client .env.local
if [ -f "client/.env.local" ]; then
    print_status "ok" "Client .env.local exists"
    check_env_var "client/.env.local" "NEXT_PUBLIC_API_BASE"
elif [ -f "client/.env" ]; then
    print_status "warn" "Client uses .env instead of .env.local (Next.js convention)"
else
    print_status "error" "Client .env.local missing"
fi
echo ""

echo "🤖 Checking GitHub Actions workflows..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file ".github/workflows/backend-tests.yml" "Backend tests workflow"
check_file ".github/workflows/frontend-tests.yml" "Frontend tests workflow"
check_file ".github/workflows/docker-integration.yml" "Docker integration workflow"
check_file ".github/workflows/ci.yml" "Main CI workflow"
echo ""

echo "📚 Checking documentation..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
check_file "README.md" "Main README"
check_file "docs/ENVIRONMENT.md" "Environment guide"
check_file "docs/ENVIRONMENT-QUICKREF.md" "Environment quick reference"
check_file "docs/CI-CD.md" "CI/CD guide"
check_file "docs/SETUP-SUMMARY.md" "Setup summary"
echo ""

echo "🐳 Checking Docker services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if Docker is running
if command -v docker &> /dev/null; then
    print_status "ok" "Docker is installed"
    
    if docker info &> /dev/null 2>&1; then
        print_status "ok" "Docker is running"
        
        # Check for running services
        if docker ps --format '{{.Names}}' | grep -q "warmup-mongo"; then
            print_status "ok" "MongoDB container is running"
        else
            print_status "warn" "MongoDB container not running (run: docker compose up mongo -d)"
        fi
        
        if docker ps --format '{{.Names}}' | grep -q "warmup-redis"; then
            print_status "ok" "Redis container is running"
        else
            print_status "warn" "Redis container not running (run: docker compose up redis -d)"
        fi
    else
        print_status "warn" "Docker is not running"
    fi
else
    print_status "warn" "Docker is not installed"
fi
echo ""

echo "🔍 Checking .gitignore configurations..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if .env files are properly ignored
if grep -q "^\.env$" .gitignore; then
    print_status "ok" ".env files are ignored in root .gitignore"
else
    print_status "error" ".env not found in root .gitignore"
fi

if grep -q "!\.env\.example" .gitignore; then
    print_status "ok" ".env.example is tracked (exception in .gitignore)"
else
    print_status "warn" ".env.example exception not found in .gitignore"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  📊 Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your environment is properly configured."
    echo "You can start the application with: docker compose up -d"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNINGS warning(s) found${NC}"
    echo ""
    echo "Your environment has some warnings but should work."
    echo "Review the warnings above to improve your setup."
    exit 0
else
    echo -e "${RED}✗ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
    echo ""
    echo "Please fix the errors above before starting the application."
    echo ""
    echo "Quick fixes:"
    echo "  1. Copy .env files:      cp .env.example .env"
    echo "  2. Generate JWT secret:  openssl rand -base64 32"
    echo "  3. Edit .env files and replace placeholder values"
    echo ""
    echo "See docs/ENVIRONMENT-QUICKREF.md for detailed setup instructions."
    exit 1
fi
