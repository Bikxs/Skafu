#!/bin/bash

# LTVBD (Lint Test Validate Build Deploy) Script for Skafu Backend
# Must be run from implementation/ directory

set -e  # Exit immediately if a command exits with a non-zero status

# Default configuration
INCLUDE_SLOW_TESTS=false
VERBOSE_MODE=false

# Help function
show_help() {
    echo "LTVBD (Lint Test Validate Build Deploy) Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --include-slow, -s    Include slow-running tests (marked with @pytest.mark.slow)"
    echo "  --verbose, -v         Show full output from all commands (default: concise)"
    echo "  --help, -h           Show this help message"
    echo ""
    echo "By default, slow tests are excluded and output is concise for faster execution."
    echo "Total execution time: ~10s (fast) vs ~25s (with slow tests)"
}

# ANSI Color Codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_step() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

print_success() {
    print_status $GREEN "✅ SUCCESS: $1"
}

print_error() {
    print_status $RED "❌ ERROR: $1"
}

print_progress() {
    print_status $YELLOW "🔄 $1"
}

# Function to check if we're in the correct directory
check_directory() {
    if [[ ! -f "template.yaml" ]] || [[ ! -f "samconfig.toml" ]]; then
        print_error "This script must be run from implementation/ directory"
        print_error "Expected files: template.yaml, samconfig.toml"
        exit 1
    fi
}

# Function to check if required tools are installed
check_dependencies() {
    print_progress "Checking required dependencies"
    
    # Check if pylint is installed
    if ! command -v pylint &> /dev/null; then
        print_error "pylint is not installed"
        print_status $YELLOW "Install with: pip install -r requirements-dev.txt"
        exit 1
    fi
    
    # Check if sam is installed
    if ! command -v sam &> /dev/null; then
        print_error "AWS SAM CLI is not installed"
        print_status $YELLOW "Install from: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
        exit 1
    fi
    
    print_success "All dependencies are available"
}

# Function to run a command and handle errors
run_command() {
    local description=$1
    local command=$2
    
    print_progress "$description"
    
    if eval "$command"; then
        print_success "$description completed"
        return 0
    else
        print_error "$description failed"
        exit 1
    fi
}

# Main execution
main() {
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --include-slow|-s)
                INCLUDE_SLOW_TESTS=true
                shift
                ;;
            --verbose|-v)
                VERBOSE_MODE=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                echo "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done

    print_step "Backend - Test, Validate, Build, Deploy"
    
    # Check if we're in the correct directory
    check_directory
    
    # Check if required dependencies are installed
    check_dependencies
    
    # Step 1: Python Linting with pylint
    print_step "Step 1: Python Linting"
    
    if [[ "$VERBOSE_MODE" == "true" ]]; then
        run_command "Running pylint linter" "pylint domains/observability/backend/functions/*/src/ shared/libraries/python/skafu_shared/ --score=yes --fail-under=9.9999"
    else
        print_progress "Running pylint linter"
        
        PYLINT_OUTPUT=$(pylint domains/observability/backend/functions/*/src/ shared/libraries/python/skafu_shared/ --score=yes --fail-under=9.9999 2>&1)
        if [ $? -eq 0 ]; then
            # Extract and show only the score
            SCORE=$(echo "$PYLINT_OUTPUT" | grep "Your code has been rated at" | tail -1)
            echo "  $SCORE"
            print_success "Running pylint linter completed"
        else
            echo "$PYLINT_OUTPUT"
            print_error "Running pylint linter failed"
            exit 1
        fi
    fi
    
    # Step 2: SAM Validate with Lint
    print_step "Step 2: SAM Template Validation"
    
    if [[ "$VERBOSE_MODE" == "true" ]]; then
        run_command "Validating SAM template" "sam validate --lint"
    else
        print_progress "Validating SAM template"
        
        if sam validate --lint > /dev/null 2>&1; then
            print_success "Validating SAM template completed"
        else
            print_error "Validating SAM template failed"
            sam validate --lint
            exit 1
        fi
    fi
    
    # Step 3: Backend Tests (excluding performance tests for speed)
    print_step "Step 3: Backend Tests (Unit + Integration)"
    
    # Run tests for each function individually to handle relative imports
    print_progress "Running tests for each function individually"
    
    # Find all function directories
    FUNCTION_DIRS=($(find domains/observability/backend/functions -mindepth 1 -maxdepth 1 -type d | sort))
    TOTAL_TESTS=0
    PASSED_TESTS=0
    
    for func_dir in "${FUNCTION_DIRS[@]}"; do
        if [[ -d "$func_dir/tests" ]]; then
            func_name=$(basename "$func_dir")
            
            # Change to function directory and run tests
            pushd "$func_dir" > /dev/null
            
            if [[ "$INCLUDE_SLOW_TESTS" == "true" ]]; then
                PYTEST_CMD="PYTEST_CURRENT_TEST=1 python3 -m pytest tests/ -q --tb=line"
            else
                PYTEST_CMD="PYTEST_CURRENT_TEST=1 python3 -m pytest tests/ -q --tb=line -m 'not slow'"
            fi
            
            TEST_OUTPUT=$(eval "$PYTEST_CMD" 2>&1)
            if [ $? -eq 0 ]; then
                # Extract test count from output
                TEST_COUNT=$(echo "$TEST_OUTPUT" | grep -E "^[0-9]+ passed" | cut -d' ' -f1)
                if [[ -n "$TEST_COUNT" ]]; then
                    TOTAL_TESTS=$((TOTAL_TESTS + TEST_COUNT))
                    PASSED_TESTS=$((PASSED_TESTS + TEST_COUNT))
                fi
                echo "  ✅ $func_name: $TEST_COUNT tests passed"
            else
                popd > /dev/null
                echo "$TEST_OUTPUT"
                print_error "Tests failed for $func_name"
                exit 1
            fi
            
            popd > /dev/null
        fi
    done
    
    echo "  📊 Total: $PASSED_TESTS/$TOTAL_TESTS tests passed"
    
    print_success "All function tests completed"
    
    # Step 4: SAM Build
    print_step "Step 4: SAM Build"
    
    if [[ "$VERBOSE_MODE" == "true" ]]; then
        run_command "Building SAM application" "sam build"
    else
        print_progress "Building SAM application"
        
        BUILD_OUTPUT=$(sam build 2>&1)
        if [ $? -eq 0 ]; then
            # Show only success summary
            echo "$BUILD_OUTPUT" | grep -E "(Build Succeeded|Built Artifacts|Built Template)" | head -3
            print_success "Building SAM application completed"
        else
            echo "$BUILD_OUTPUT"
            print_error "Building SAM application failed"
            exit 1
        fi
    fi
    
    # Step 5: SAM Deploy
    print_step "Step 5: SAM Deploy"
    
    if [[ "$VERBOSE_MODE" == "true" ]]; then
        run_command "Deploying SAM application" "sam deploy"
    else
        print_progress "Deploying SAM application"
        
        DEPLOY_OUTPUT=$(sam deploy 2>&1)
        if [ $? -eq 0 ]; then
            # Show only key deployment info and outputs
            echo "$DEPLOY_OUTPUT" | grep -E "(Stack name|Region|Capabilities)" | head -3
            echo "  ..."
            echo "$DEPLOY_OUTPUT" | grep -A 20 "CloudFormation outputs from deployed stack"
            print_success "Deploying SAM application completed"
        else
            echo "$DEPLOY_OUTPUT"
            print_error "Deploying SAM application failed"
            exit 1
        fi
    fi
    
    # Final Success Message
    echo -e "\n${GREEN}🎉 All steps completed successfully!${NC}"
    echo -e "${GREEN}✅ Linting passed${NC}"
    echo -e "${GREEN}✅ Template validation passed${NC}"
    echo -e "${GREEN}✅ All tests passed${NC}"
    echo -e "${GREEN}✅ Build completed${NC}"
    echo -e "${GREEN}✅ Deployment completed${NC}"
}

# Run main function
main "$@"
