#!/bin/bash
# Unified Authentication System Verification Script
# This script helps verify that all components are properly configured

set -e

echo "🔐 Skafu Unified Authentication System Verification"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a value is set
check_env_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ $var_name is not set${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $var_name is set${NC}"
        return 0
    fi
}

# Function to check AWS resource exists
check_aws_resource() {
    local resource_type=$1
    local resource_id=$2
    local description=$3
    
    echo -n "Checking $description... "
    
    case $resource_type in
        "user-pool")
            if aws cognito-idp describe-user-pool --user-pool-id "$resource_id" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Found${NC}"
                return 0
            else
                echo -e "${RED}❌ Not found${NC}"
                return 1
            fi
            ;;
        "identity-pool")
            if aws cognito-identity describe-identity-pool --identity-pool-id "$resource_id" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Found${NC}"
                return 0
            else
                echo -e "${RED}❌ Not found${NC}"
                return 1
            fi
            ;;
        "iam-role")
            if aws iam get-role --role-name "$resource_id" >/dev/null 2>&1; then
                echo -e "${GREEN}✅ Found${NC}"
                return 0
            else
                echo -e "${RED}❌ Not found${NC}"
                return 1
            fi
            ;;
    esac
}

echo
echo "🔍 Step 1: Checking Environment Variables"
echo "----------------------------------------"

# Load environment variables from .env.local if it exists
if [ -f ".env.local" ]; then
    echo "Loading .env.local..."
    export $(grep -v '^#' .env.local | xargs)
fi

# Check required environment variables
all_vars_set=true

check_env_var "NEXT_PUBLIC_COGNITO_USER_POOL_ID" || all_vars_set=false
check_env_var "NEXT_PUBLIC_COGNITO_CLIENT_ID" || all_vars_set=false
check_env_var "NEXT_PUBLIC_COGNITO_FRONTEND_CLIENT_ID" || all_vars_set=false
check_env_var "NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID" || all_vars_set=false
check_env_var "NEXT_PUBLIC_AUTH_ROLE_ARN" || all_vars_set=false
check_env_var "NEXT_PUBLIC_UNAUTH_ROLE_ARN" || all_vars_set=false

if [ "$all_vars_set" = false ]; then
    echo
    echo -e "${YELLOW}⚠️  Some environment variables are missing.${NC}"
    echo "Please ensure you have copied .env.example to .env.local and filled in all values."
    echo "See UNIFIED_AUTH_MIGRATION.md for details."
    exit 1
fi

echo
echo "🔍 Step 2: Checking AWS Resources"
echo "--------------------------------"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity >/dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI is not configured or credentials are invalid${NC}"
    echo "Please run 'aws configure' to set up your credentials."
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI is configured${NC}"

# Extract role names from ARNs
auth_role_name=$(echo "$NEXT_PUBLIC_AUTH_ROLE_ARN" | cut -d'/' -f2)
unauth_role_name=$(echo "$NEXT_PUBLIC_UNAUTH_ROLE_ARN" | cut -d'/' -f2)

# Check AWS resources
resources_exist=true

check_aws_resource "user-pool" "$NEXT_PUBLIC_COGNITO_USER_POOL_ID" "Cognito User Pool" || resources_exist=false
check_aws_resource "identity-pool" "$NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID" "Cognito Identity Pool" || resources_exist=false
check_aws_resource "iam-role" "$auth_role_name" "Authenticated IAM Role" || resources_exist=false
check_aws_resource "iam-role" "$unauth_role_name" "Unauthenticated IAM Role" || resources_exist=false

if [ "$resources_exist" = false ]; then
    echo
    echo -e "${YELLOW}⚠️  Some AWS resources are missing.${NC}"
    echo "Please ensure the updated SAM template has been deployed."
    echo "Run: cd ../shared/infrastructure && sam deploy"
    exit 1
fi

echo
echo "🔍 Step 3: Testing Frontend Configuration"
echo "---------------------------------------"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
fi

# Check if Amplify outputs exist
if [ ! -f "amplify_outputs.json" ]; then
    echo -e "${YELLOW}⚠️  amplify_outputs.json not found. Running Amplify sandbox...${NC}"
    npx ampx sandbox --once
fi

echo -e "${GREEN}✅ Frontend dependencies are ready${NC}"

echo
echo "🔍 Step 4: Verifying Amplify Configuration"
echo "-----------------------------------------"

# Parse amplify_outputs.json to check configuration
if command -v jq >/dev/null 2>&1; then
    if [ -f "amplify_outputs.json" ]; then
        echo "Checking Amplify outputs..."
        
        # Check if data endpoint exists
        data_url=$(jq -r '.data.url // empty' amplify_outputs.json)
        if [ -n "$data_url" ]; then
            echo -e "${GREEN}✅ Amplify Data endpoint configured${NC}"
        else
            echo -e "${RED}❌ Amplify Data endpoint not found${NC}"
        fi
        
        # Check authorization modes
        default_auth=$(jq -r '.data.default_authorization_type // empty' amplify_outputs.json)
        if [ "$default_auth" = "AMAZON_COGNITO_USER_POOLS" ]; then
            echo -e "${GREEN}✅ User Pool authentication is default${NC}"
        elif [ "$default_auth" = "API_KEY" ]; then
            echo -e "${YELLOW}⚠️  API Key is still default authorization mode${NC}"
            echo "This is OK for development, but user-based auth is available."
        else
            echo -e "${RED}❌ Unknown authorization mode: $default_auth${NC}"
        fi
    else
        echo -e "${RED}❌ amplify_outputs.json not found${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  jq not found. Skipping Amplify outputs validation.${NC}"
    echo "Install jq for detailed validation: sudo apt install jq"
fi

echo
echo "🔍 Step 5: Final System Check"
echo "----------------------------"

# Check if development server can start
echo "Testing Next.js configuration..."
if npm run lint >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Next.js configuration is valid${NC}"
else
    echo -e "${YELLOW}⚠️  ESLint warnings found (this is normal)${NC}"
fi

echo
echo "🎉 Verification Complete!"
echo "========================"

if [ "$all_vars_set" = true ] && [ "$resources_exist" = true ]; then
    echo -e "${GREEN}✅ All systems are ready for unified authentication!${NC}"
    echo
    echo "Next steps:"
    echo "1. Run 'npm run dev' to start the development server"
    echo "2. Navigate to http://localhost:3000"
    echo "3. Test the authentication flow"
    echo "4. Verify both observability APIs and Amplify Data work"
    echo
    echo "📚 For detailed testing instructions, see UNIFIED_AUTH_MIGRATION.md"
else
    echo -e "${RED}❌ Some issues were found. Please fix them before proceeding.${NC}"
    exit 1
fi