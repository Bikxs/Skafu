#!/bin/bash

# LTVBD (Lint Test Validate Build Deploy) Script for Skafu Backend
# Must be run from implementation/ directory

set -e  # Exit immediately if a command exits with a non-zero status

# Default configuration
INCLUDE_SLOW_TESTS=false

# Help function
show_help() {
    echo "LTVBD (Lint Test Validate Build Deploy) Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --include-slow, -s    Include slow-running tests (marked with @pytest.mark.slow)"
    echo "  --help, -h           Show this help message"
    echo ""
    echo "By default, slow tests are excluded for faster execution."
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
    run_command "Running pylint linter" "pylint domains/observability/backend/functions/*/src/ shared/libraries/python/skafu_shared/ --score=yes --fail-under=9.9999"
    
    # Step 2: SAM Validate with Lint
    print_step "Step 2: SAM Template Validation"
    run_command "Validating SAM template" "sam validate --lint"
    
    # Step 3: Backend Tests (excluding performance tests for speed)
    print_step "Step 3: Backend Tests (Unit + Integration)"
    
    # Run tests for each function individually to handle relative imports
    print_progress "Running tests for each function individually"
    
    # Find all function directories
    FUNCTION_DIRS=($(find domains/observability/backend/functions -mindepth 1 -maxdepth 1 -type d | sort))
    
    for func_dir in "${FUNCTION_DIRS[@]}"; do
        if [[ -d "$func_dir/tests" ]]; then
            func_name=$(basename "$func_dir")
            print_progress "Running tests for $func_name"
            
            # Change to function directory and run tests
            pushd "$func_dir" > /dev/null
            
            if [[ "$INCLUDE_SLOW_TESTS" == "true" ]]; then
                PYTEST_CMD="PYTEST_CURRENT_TEST=1 python3 -m pytest tests/ -v --tb=short"
            else
                PYTEST_CMD="PYTEST_CURRENT_TEST=1 python3 -m pytest tests/ -v --tb=short -m 'not slow'"
            fi
            
            if ! eval "$PYTEST_CMD"; then
                popd > /dev/null
                print_error "Tests failed for $func_name"
                exit 1
            fi
            
            popd > /dev/null
            print_success "Tests passed for $func_name"
        fi
    done
    
    print_success "All function tests completed"
    
    # Step 4: SAM Build
    print_step "Step 4: SAM Build"
    run_command "Building SAM application" "sam build"
    
    # Step 5: SAM Deploy
    print_step "Step 5: SAM Deploy"
    run_command "Deploying SAM application" "sam deploy"
    
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
