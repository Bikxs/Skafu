# ADR-0012: GitHub Actions CI/CD

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need a CI/CD pipeline solution that integrates seamlessly with our GitHub-based source control, supports our AWS serverless architecture, provides fast feedback cycles, and enables automated testing, security scanning, and deployment workflows.

## Decision Drivers

* Integration with GitHub repositories for source control
* Support for AWS SAM deployments and serverless architecture
* Fast build and deployment cycles for rapid development
* Automated testing and quality gates
* Security scanning and vulnerability detection
* Cost-effective solution for development and deployment
* Team familiarity and ease of setup
* Support for multiple environments (dev, staging, production)

## Considered Options

* **Option 1**: AWS CodePipeline + CodeBuild
* **Option 2**: GitHub Actions (native GitHub CI/CD)
* **Option 3**: Jenkins with AWS integration
* **Option 4**: GitLab CI/CD
* **Option 5**: CircleCI with AWS deployment

## Decision Outcome

Chosen option: **"GitHub Actions"**, because it provides native GitHub integration, excellent AWS support, cost-effective pricing, and comprehensive ecosystem while maintaining simplicity and fast feedback cycles.

### Implementation Details

**Workflow Architecture**:
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: us-east-1
  SAM_TEMPLATE: template.yaml
  STACK_NAME: skafu-${{ github.ref_name }}

jobs:
  # Quality Gates
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
          cache: 'pip'
          
      - name: Install dependencies
        run: |
          npm install
          pip install -r requirements.txt
          
      - name: Run linting
        run: |
          npm run lint
          ruff check .
          
      - name: Run type checking
        run: |
          npm run type-check
          mypy .
          
      - name: Run unit tests
        run: |
          npm run test:unit
          pytest tests/unit/ --cov=src --cov-report=xml
          
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
          flags: unittests

  # Security Scanning
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run CodeQL Analysis
        uses: github/codeql-action/init@v2
        with:
          languages: javascript, python
          
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        
      - name: Run Dependency Scan
        run: |
          npm audit --audit-level=high
          pip-audit --requirement requirements.txt
          
      - name: Run Secret Scanning
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD

  # Build and Package
  build:
    runs-on: ubuntu-latest
    needs: [quality-gates, security-scan]
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup SAM CLI
        uses: aws-actions/setup-sam@v2
        with:
          use-installer: true
          
      - name: Build SAM application
        run: |
          sam build --use-container
          
      - name: Package application
        run: |
          sam package \
            --s3-bucket ${{ secrets.SAM_ARTIFACTS_BUCKET }} \
            --s3-prefix ${{ github.sha }} \
            --output-template-file packaged-template.yaml
            
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: sam-artifacts
          path: |
            packaged-template.yaml
            .aws-sam/build/

  # Deploy to Development
  deploy-dev:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    environment: development
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: sam-artifacts
          
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          
      - name: Deploy to development
        run: |
          sam deploy \
            --template-file packaged-template.yaml \
            --stack-name ${{ env.STACK_NAME }} \
            --capabilities CAPABILITY_IAM \
            --parameter-overrides \
              Environment=development \
              Version=${{ github.sha }}
              
      - name: Run integration tests
        run: |
          npm run test:integration
          
      - name: Run E2E tests
        run: |
          npm run test:e2e

  # Deploy to Staging
  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: sam-artifacts
          
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          
      - name: Deploy to staging
        run: |
          sam deploy \
            --template-file packaged-template.yaml \
            --stack-name ${{ env.STACK_NAME }} \
            --capabilities CAPABILITY_IAM \
            --parameter-overrides \
              Environment=staging \
              Version=${{ github.sha }}
              
      - name: Run staging tests
        run: |
          npm run test:staging
          
      - name: Performance testing
        run: |
          npm run test:performance

  # Deploy to Production
  deploy-production:
    runs-on: ubuntu-latest
    needs: [deploy-staging]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: sam-artifacts
          
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          
      - name: Deploy to production
        run: |
          sam deploy \
            --template-file packaged-template.yaml \
            --stack-name ${{ env.STACK_NAME }} \
            --capabilities CAPABILITY_IAM \
            --parameter-overrides \
              Environment=production \
              Version=${{ github.sha }}
              
      - name: Run smoke tests
        run: |
          npm run test:smoke
          
      - name: Monitor deployment
        run: |
          npm run monitor:deployment
```

**Frontend Deployment Workflow**:
```yaml
# .github/workflows/frontend-deploy.yml
name: Frontend Deployment

on:
  push:
    branches: [main, develop]
    paths: ['frontend/**']

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
          
      - name: Install dependencies
        working-directory: frontend
        run: npm ci
        
      - name: Run tests
        working-directory: frontend
        run: |
          npm run test:unit
          npm run test:integration
          
      - name: Build application
        working-directory: frontend
        run: npm run build
        
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          
      - name: Deploy with Amplify
        working-directory: frontend
        run: |
          npx @aws-amplify/cli@latest configure --amplify-config ./amplify.json
          npx @aws-amplify/cli@latest publish --yes
```

### Environment Management

**Environment Configuration**:
```yaml
# .github/environments/development.yml
name: development
deployment_branch_policy:
  protected_branches: false
  custom_branch_policies: true
  custom_branches:
    - develop
secrets:
  AWS_ACCESS_KEY_ID: ${{ secrets.DEV_AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.DEV_AWS_SECRET_ACCESS_KEY }}
variables:
  ENVIRONMENT: development
  LOG_LEVEL: DEBUG
  
# .github/environments/production.yml
name: production
deployment_branch_policy:
  protected_branches: true
  custom_branch_policies: false
protection_rules:
  - type: required_reviewers
    required_reviewers: 2
  - type: wait_timer
    wait_timer: 5
secrets:
  AWS_ACCESS_KEY_ID: ${{ secrets.PROD_AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.PROD_AWS_SECRET_ACCESS_KEY }}
variables:
  ENVIRONMENT: production
  LOG_LEVEL: INFO
```

### Quality Gates Integration

**Pre-commit Hooks**:
```yaml
# .github/workflows/pr-validation.yml
name: PR Validation

on:
  pull_request:
    branches: [main, develop]

jobs:
  validate-pr:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          
      - name: Validate commit messages
        run: |
          npm install -g @commitlint/cli @commitlint/config-conventional
          commitlint --from HEAD~1 --to HEAD --verbose
          
      - name: Check for breaking changes
        run: |
          # Check if any breaking changes in API contracts
          npx swagger-diff contracts/commands/project-management-api.yaml
          
      - name: Run architectural tests
        run: |
          npm run test:architecture
          
      - name: Validate ADR compliance
        run: |
          # Check if new ADRs follow template
          ./scripts/validate-adrs.sh
```

### Monitoring and Notifications

**Slack Integration**:
```yaml
# Add to workflow jobs
      - name: Notify Slack on failure
        if: failure()
        uses: 8398a7/action-slack@v3
        with:
          status: failure
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
          
      - name: Notify Slack on success
        if: success()
        uses: 8398a7/action-slack@v3
        with:
          status: success
          channel: '#deployments'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

**Deployment Metrics**:
```yaml
      - name: Record deployment metrics
        run: |
          # Send metrics to CloudWatch
          aws cloudwatch put-metric-data \
            --namespace "Skafu/Deployments" \
            --metric-data \
              MetricName=DeploymentSuccess,Value=1,Unit=Count \
              MetricName=DeploymentDuration,Value=${{ steps.deploy.outputs.duration }},Unit=Seconds
```

### Consequences

**Good**:
* **Native Integration**: Seamless GitHub integration with no additional setup
* **Cost Effective**: 2,000 minutes/month free, competitive pricing
* **AWS Support**: Excellent AWS actions and SAM CLI integration
* **Security**: Built-in security scanning with CodeQL and dependency checks
* **Flexibility**: Rich ecosystem of community actions
* **Environments**: Built-in environment protection and approval workflows
* **Monitoring**: Comprehensive logging and monitoring capabilities
* **Parallel Execution**: Efficient parallel job execution

**Bad**:
* **GitHub Dependency**: Tied to GitHub platform and its availability
* **Resource Limits**: Limited to GitHub-hosted runners unless self-hosted
* **Complexity**: Can become complex for sophisticated workflows
* **Vendor Lock**: Locked into GitHub Actions ecosystem
* **Learning Curve**: Team needs to learn GitHub Actions syntax and patterns
* **Debugging**: Limited debugging capabilities for complex workflows

## Branch Strategy Integration

**GitFlow Integration**:
```yaml
# Branch protection rules
branches:
  main:
    protection:
      required_status_checks:
        - quality-gates
        - security-scan
        - build
      required_pull_request_reviews:
        required_approving_review_count: 2
        dismiss_stale_reviews: true
      enforce_admins: true
      
  develop:
    protection:
      required_status_checks:
        - quality-gates
        - security-scan
      required_pull_request_reviews:
        required_approving_review_count: 1
```

**Feature Branch Workflow**:
```yaml
# .github/workflows/feature-branch.yml
name: Feature Branch Validation

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  validate-feature:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run quality gates
        run: |
          npm run lint
          npm run test:unit
          
      - name: Build feature
        run: |
          sam build --use-container
          
      - name: Deploy to feature environment
        if: github.event.pull_request.draft == false
        run: |
          sam deploy \
            --stack-name skafu-feature-${{ github.event.number }} \
            --capabilities CAPABILITY_IAM \
            --parameter-overrides Environment=feature
```

## Performance Optimization

**Caching Strategy**:
```yaml
      - name: Cache dependencies
        uses: actions/cache@v3
        with:
          path: |
            ~/.npm
            ~/.cache/pip
            ~/.cache/pre-commit
            .aws-sam/cache
          key: ${{ runner.os }}-deps-${{ hashFiles('**/package-lock.json', '**/requirements.txt') }}
          restore-keys: |
            ${{ runner.os }}-deps-
```

**Matrix Builds**:
```yaml
  test-matrix:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
        python-version: [3.9, 3.10]
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - name: Setup Python ${{ matrix.python-version }}
        uses: actions/setup-python@v4
        with:
          python-version: ${{ matrix.python-version }}
      - name: Run tests
        run: |
          npm test
          pytest
```

## Implementation Guidelines

1. **Workflow Design**: Keep workflows focused and modular
2. **Security**: Use secrets for sensitive data, never commit credentials
3. **Testing**: Implement comprehensive testing at each stage
4. **Monitoring**: Monitor deployment success and system health
5. **Documentation**: Document workflow steps and dependencies

## Integration with Other Systems

**With SAM**: Native SAM CLI integration for serverless deployments
**With Amplify**: Amplify CLI integration for frontend deployments  
**With AWS**: AWS actions for credential management and service integration
**With Slack**: Notification integration for deployment status
**With Monitoring**: CloudWatch integration for deployment metrics

## More Information

* [GitHub Actions Documentation](https://docs.github.com/en/actions)
* [AWS Actions for GitHub](https://github.com/aws-actions)
* [SAM CLI GitHub Actions](https://github.com/aws-actions/setup-sam)
* Related ADRs: ADR-0001 (AWS Serverless), ADR-0018 (Code Security)