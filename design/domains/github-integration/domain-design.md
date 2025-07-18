# GitHub Integration Domain Design

## Domain Overview

The GitHub Integration domain handles repository creation, workflow automation, and deployment management through GitHub API integration. This domain manages the complete lifecycle of GitHub repositories for generated projects, including repository setup, CI/CD workflows, and deployment automation.

## Business Context

### Domain Purpose
- **Repository Management**: Create and configure GitHub repositories for projects
- **Workflow Automation**: Set up CI/CD workflows and automation
- **Deployment Orchestration**: Manage deployment pipelines and environments
- **Branch Management**: Handle branching strategies and pull request workflows
- **Integration Management**: Manage webhooks, apps, and third-party integrations

### Key Business Rules
1. **Repository Uniqueness**: Each project must have a unique repository name within the organization
2. **Workflow Standards**: All repositories must follow standard CI/CD workflow patterns
3. **Security First**: All repositories must have security scanning and branch protection enabled
4. **Deployment Environments**: Support for development, staging, and production environments
5. **Audit Trail**: All repository changes must be tracked and logged

## Domain Model

### Aggregates and Entities

#### Repository Aggregate
```python
class Repository:
    def __init__(self, repository_id: str, project_id: str, name: str, organization: str):
        self.id = repository_id
        self.project_id = project_id
        self.name = name
        self.organization = organization
        self.full_name = f"{organization}/{name}"
        self.github_id = None
        self.clone_url = None
        self.ssh_url = None
        self.web_url = None
        self.default_branch = "main"
        self.visibility = RepositoryVisibility.PRIVATE
        self.status = RepositoryStatus.PENDING
        self.description = None
        self.topics = []
        self.workflows = []
        self.environments = []
        self.branch_protection = None
        self.webhooks = []
        self.secrets = {}
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
        self.events = []
    
    def create_repository(self, template_files: Dict[str, str], description: str = None) -> None:
        """Create GitHub repository with initial content"""
        if self.status != RepositoryStatus.PENDING:
            raise RepositoryAlreadyExistsError("Repository already exists")
        
        self.description = description
        self.status = RepositoryStatus.CREATING
        self.updated_at = datetime.utcnow()
        
        self._add_event(RepositoryCreationStarted(self.id, self.project_id, self.full_name))
    
    def repository_created(self, github_id: int, clone_url: str, ssh_url: str, web_url: str) -> None:
        """Mark repository as created with GitHub details"""
        if self.status != RepositoryStatus.CREATING:
            raise InvalidRepositoryStateError("Repository not in creating state")
        
        self.github_id = github_id
        self.clone_url = clone_url
        self.ssh_url = ssh_url
        self.web_url = web_url
        self.status = RepositoryStatus.CREATED
        self.updated_at = datetime.utcnow()
        
        self._add_event(RepositoryCreated(self.id, self.project_id, self.full_name, github_id))
    
    def add_workflow(self, workflow: Workflow) -> None:
        """Add CI/CD workflow to repository"""
        if self.status != RepositoryStatus.CREATED:
            raise InvalidRepositoryStateError("Repository must be created first")
        
        if any(w.name == workflow.name for w in self.workflows):
            raise DuplicateWorkflowError(f"Workflow {workflow.name} already exists")
        
        self.workflows.append(workflow)
        self.updated_at = datetime.utcnow()
        
        self._add_event(WorkflowAdded(self.id, self.project_id, workflow.name))
    
    def setup_environments(self, environments: List[Environment]) -> None:
        """Setup deployment environments"""
        if self.status != RepositoryStatus.CREATED:
            raise InvalidRepositoryStateError("Repository must be created first")
        
        self.environments = environments
        self.updated_at = datetime.utcnow()
        
        self._add_event(EnvironmentsConfigured(self.id, self.project_id, [env.name for env in environments]))
    
    def configure_branch_protection(self, protection_rules: BranchProtection) -> None:
        """Configure branch protection rules"""
        if self.status != RepositoryStatus.CREATED:
            raise InvalidRepositoryStateError("Repository must be created first")
        
        self.branch_protection = protection_rules
        self.updated_at = datetime.utcnow()
        
        self._add_event(BranchProtectionConfigured(self.id, self.project_id, self.default_branch))
    
    def add_webhook(self, webhook: Webhook) -> None:
        """Add webhook to repository"""
        if self.status != RepositoryStatus.CREATED:
            raise InvalidRepositoryStateError("Repository must be created first")
        
        self.webhooks.append(webhook)
        self.updated_at = datetime.utcnow()
        
        self._add_event(WebhookAdded(self.id, self.project_id, webhook.url))
    
    def set_secret(self, name: str, value: str) -> None:
        """Set repository secret"""
        if self.status != RepositoryStatus.CREATED:
            raise InvalidRepositoryStateError("Repository must be created first")
        
        self.secrets[name] = value
        self.updated_at = datetime.utcnow()
        
        self._add_event(SecretAdded(self.id, self.project_id, name))
    
    def trigger_deployment(self, environment: str, ref: str = None) -> str:
        """Trigger deployment to environment"""
        if self.status != RepositoryStatus.CREATED:
            raise InvalidRepositoryStateError("Repository must be created first")
        
        if not any(env.name == environment for env in self.environments):
            raise EnvironmentNotFoundError(f"Environment {environment} not found")
        
        deployment_id = str(uuid.uuid4())
        ref = ref or self.default_branch
        
        self._add_event(DeploymentTriggered(self.id, self.project_id, deployment_id, environment, ref))
        
        return deployment_id
    
    def _add_event(self, event: DomainEvent) -> None:
        """Add domain event"""
        self.events.append(event)

class Workflow:
    def __init__(self, name: str, workflow_type: str, template_path: str):
        self.name = name
        self.type = workflow_type  # 'ci', 'cd', 'security', 'quality'
        self.template_path = template_path
        self.triggers = []
        self.jobs = []
        self.environment_variables = {}
        self.secrets = []
        self.enabled = True
        self.created_at = datetime.utcnow()
    
    def add_trigger(self, trigger: WorkflowTrigger) -> None:
        """Add workflow trigger"""
        self.triggers.append(trigger)
    
    def add_job(self, job: WorkflowJob) -> None:
        """Add workflow job"""
        self.jobs.append(job)

class WorkflowTrigger:
    def __init__(self, event_type: str, branches: List[str] = None, paths: List[str] = None):
        self.event_type = event_type  # 'push', 'pull_request', 'schedule'
        self.branches = branches or []
        self.paths = paths or []
        self.schedule = None

class WorkflowJob:
    def __init__(self, name: str, runs_on: str):
        self.name = name
        self.runs_on = runs_on
        self.steps = []
        self.environment = None
        self.timeout_minutes = 30
        self.strategy = None

class Environment:
    def __init__(self, name: str, environment_type: str):
        self.name = name
        self.type = environment_type  # 'development', 'staging', 'production'
        self.protection_rules = []
        self.secrets = {}
        self.variables = {}
        self.deployment_branch_policy = None
        self.reviewers = []
        self.wait_timer = 0
        self.created_at = datetime.utcnow()

class BranchProtection:
    def __init__(self, branch: str):
        self.branch = branch
        self.required_status_checks = []
        self.enforce_admins = False
        self.required_pull_request_reviews = False
        self.required_approving_review_count = 1
        self.dismiss_stale_reviews = True
        self.require_code_owner_reviews = False
        self.allow_force_pushes = False
        self.allow_deletions = False
        self.restrictions = None

class Webhook:
    def __init__(self, url: str, events: List[str]):
        self.url = url
        self.events = events
        self.content_type = "application/json"
        self.secret = None
        self.ssl_verification = True
        self.active = True
        self.created_at = datetime.utcnow()

class RepositoryStatus(Enum):
    PENDING = "pending"
    CREATING = "creating"
    CREATED = "created"
    CONFIGURING = "configuring"
    CONFIGURED = "configured"
    FAILED = "failed"
    ARCHIVED = "archived"

class RepositoryVisibility(Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    INTERNAL = "internal"
```

### Value Objects

```python
class GitHubCredentials:
    def __init__(self, token: str, app_id: str = None, private_key: str = None):
        self.token = token
        self.app_id = app_id
        self.private_key = private_key
        self.token_type = "bearer"
    
    def is_app_authentication(self) -> bool:
        """Check if using GitHub App authentication"""
        return self.app_id is not None and self.private_key is not None

class RepositoryTemplate:
    def __init__(self, name: str, files: Dict[str, str]):
        self.name = name
        self.files = files
        self.description = None
        self.language = None
        self.gitignore_template = None
        self.license_template = None
        self.allow_squash_merge = True
        self.allow_merge_commit = True
        self.allow_rebase_merge = True
        self.delete_branch_on_merge = True
        self.has_issues = True
        self.has_projects = True
        self.has_wiki = False

class DeploymentConfig:
    def __init__(self, environment: str, branch: str):
        self.environment = environment
        self.branch = branch
        self.auto_deploy = False
        self.required_contexts = []
        self.payload = {}
        self.production_environment = False
        self.transient_environment = False
```

## Domain Services

### GitHub API Service

```python
class GitHubAPIService:
    def __init__(self):
        self.credentials = self._get_credentials()
        self.client = self._create_client()
        self.rate_limiter = RateLimiter()
    
    def create_repository(self, repository: Repository, template: RepositoryTemplate) -> Dict[str, Any]:
        """Create GitHub repository"""
        try:
            # Check rate limits
            self.rate_limiter.check_limit('repository_creation')
            
            # Create repository
            repo_data = {
                'name': repository.name,
                'description': repository.description,
                'private': repository.visibility == RepositoryVisibility.PRIVATE,
                'auto_init': True,
                'gitignore_template': template.gitignore_template,
                'license_template': template.license_template,
                'allow_squash_merge': template.allow_squash_merge,
                'allow_merge_commit': template.allow_merge_commit,
                'allow_rebase_merge': template.allow_rebase_merge,
                'delete_branch_on_merge': template.delete_branch_on_merge,
                'has_issues': template.has_issues,
                'has_projects': template.has_projects,
                'has_wiki': template.has_wiki
            }
            
            response = self.client.post(
                f'/orgs/{repository.organization}/repos',
                json=repo_data
            )
            
            repo_info = response.json()
            
            # Add initial files
            if template.files:
                self._add_initial_files(repo_info['full_name'], template.files)
            
            return {
                'github_id': repo_info['id'],
                'clone_url': repo_info['clone_url'],
                'ssh_url': repo_info['ssh_url'],
                'web_url': repo_info['html_url'],
                'default_branch': repo_info['default_branch']
            }
            
        except Exception as e:
            raise GitHubAPIError(f"Failed to create repository: {e}")
    
    def setup_workflows(self, repository: Repository) -> None:
        """Set up CI/CD workflows in repository"""
        try:
            for workflow in repository.workflows:
                workflow_content = self._generate_workflow_content(workflow)
                
                # Create workflow file
                self._create_file(
                    repository.full_name,
                    f'.github/workflows/{workflow.name}.yml',
                    workflow_content,
                    f'Add {workflow.name} workflow'
                )
                
        except Exception as e:
            raise GitHubAPIError(f"Failed to setup workflows: {e}")
    
    def configure_environments(self, repository: Repository) -> None:
        """Configure deployment environments"""
        try:
            for environment in repository.environments:
                env_data = {
                    'wait_timer': environment.wait_timer,
                    'reviewers': [{'type': 'User', 'id': reviewer} for reviewer in environment.reviewers],
                    'deployment_branch_policy': environment.deployment_branch_policy
                }
                
                # Create environment
                self.client.put(
                    f'/repos/{repository.full_name}/environments/{environment.name}',
                    json=env_data
                )
                
                # Set environment secrets
                for secret_name, secret_value in environment.secrets.items():
                    self._set_environment_secret(repository.full_name, environment.name, secret_name, secret_value)
                
                # Set environment variables
                for var_name, var_value in environment.variables.items():
                    self._set_environment_variable(repository.full_name, environment.name, var_name, var_value)
                    
        except Exception as e:
            raise GitHubAPIError(f"Failed to configure environments: {e}")
    
    def setup_branch_protection(self, repository: Repository) -> None:
        """Set up branch protection rules"""
        if not repository.branch_protection:
            return
        
        try:
            protection_data = {
                'required_status_checks': {
                    'strict': True,
                    'contexts': repository.branch_protection.required_status_checks
                },
                'enforce_admins': repository.branch_protection.enforce_admins,
                'required_pull_request_reviews': {
                    'required_approving_review_count': repository.branch_protection.required_approving_review_count,
                    'dismiss_stale_reviews': repository.branch_protection.dismiss_stale_reviews,
                    'require_code_owner_reviews': repository.branch_protection.require_code_owner_reviews
                },
                'allow_force_pushes': repository.branch_protection.allow_force_pushes,
                'allow_deletions': repository.branch_protection.allow_deletions
            }
            
            self.client.put(
                f'/repos/{repository.full_name}/branches/{repository.branch_protection.branch}/protection',
                json=protection_data
            )
            
        except Exception as e:
            raise GitHubAPIError(f"Failed to setup branch protection: {e}")
    
    def create_webhook(self, repository: Repository, webhook: Webhook) -> int:
        """Create webhook in repository"""
        try:
            webhook_data = {
                'config': {
                    'url': webhook.url,
                    'content_type': webhook.content_type,
                    'secret': webhook.secret,
                    'insecure_ssl': '0' if webhook.ssl_verification else '1'
                },
                'events': webhook.events,
                'active': webhook.active
            }
            
            response = self.client.post(
                f'/repos/{repository.full_name}/hooks',
                json=webhook_data
            )
            
            return response.json()['id']
            
        except Exception as e:
            raise GitHubAPIError(f"Failed to create webhook: {e}")
    
    def set_repository_secret(self, repository: Repository, name: str, value: str) -> None:
        """Set repository secret"""
        try:
            # Get repository public key
            key_response = self.client.get(f'/repos/{repository.full_name}/actions/secrets/public-key')
            public_key = key_response.json()
            
            # Encrypt secret value
            encrypted_value = self._encrypt_secret(value, public_key['key'])
            
            # Set secret
            secret_data = {
                'encrypted_value': encrypted_value,
                'key_id': public_key['key_id']
            }
            
            self.client.put(
                f'/repos/{repository.full_name}/actions/secrets/{name}',
                json=secret_data
            )
            
        except Exception as e:
            raise GitHubAPIError(f"Failed to set repository secret: {e}")
    
    def trigger_workflow(self, repository: Repository, workflow_name: str, ref: str, inputs: Dict[str, Any] = None) -> None:
        """Trigger workflow dispatch"""
        try:
            dispatch_data = {
                'ref': ref,
                'inputs': inputs or {}
            }
            
            self.client.post(
                f'/repos/{repository.full_name}/actions/workflows/{workflow_name}/dispatches',
                json=dispatch_data
            )
            
        except Exception as e:
            raise GitHubAPIError(f"Failed to trigger workflow: {e}")
    
    def create_deployment(self, repository: Repository, environment: str, ref: str, payload: Dict[str, Any] = None) -> str:
        """Create deployment"""
        try:
            deployment_data = {
                'ref': ref,
                'environment': environment,
                'payload': payload or {},
                'auto_merge': False,
                'required_contexts': []
            }
            
            response = self.client.post(
                f'/repos/{repository.full_name}/deployments',
                json=deployment_data
            )
            
            return str(response.json()['id'])
            
        except Exception as e:
            raise GitHubAPIError(f"Failed to create deployment: {e}")
    
    def _get_credentials(self) -> GitHubCredentials:
        """Get GitHub credentials from Secrets Manager"""
        secrets_client = boto3.client('secretsmanager')
        
        try:
            response = secrets_client.get_secret_value(
                SecretId='/prod/github-integration/token'
            )
            secret = json.loads(response['SecretString'])
            
            return GitHubCredentials(
                token=secret['token'],
                app_id=secret.get('app_id'),
                private_key=secret.get('private_key')
            )
        except Exception as e:
            raise GitHubAPIError(f"Failed to get GitHub credentials: {e}")
    
    def _create_client(self) -> object:
        """Create GitHub API client"""
        import requests
        
        class GitHubClient:
            def __init__(self, credentials: GitHubCredentials):
                self.credentials = credentials
                self.base_url = 'https://api.github.com'
                self.session = requests.Session()
                self.session.headers.update({
                    'Authorization': f'token {credentials.token}',
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Skafu-GitHub-Integration'
                })
            
            def get(self, path: str) -> requests.Response:
                response = self.session.get(f'{self.base_url}{path}')
                response.raise_for_status()
                return response
            
            def post(self, path: str, json: Dict[str, Any]) -> requests.Response:
                response = self.session.post(f'{self.base_url}{path}', json=json)
                response.raise_for_status()
                return response
            
            def put(self, path: str, json: Dict[str, Any]) -> requests.Response:
                response = self.session.put(f'{self.base_url}{path}', json=json)
                response.raise_for_status()
                return response
            
            def delete(self, path: str) -> requests.Response:
                response = self.session.delete(f'{self.base_url}{path}')
                response.raise_for_status()
                return response
        
        return GitHubClient(self.credentials)
    
    def _add_initial_files(self, repo_full_name: str, files: Dict[str, str]) -> None:
        """Add initial files to repository"""
        for file_path, content in files.items():
            self._create_file(repo_full_name, file_path, content, f'Add {file_path}')
    
    def _create_file(self, repo_full_name: str, path: str, content: str, message: str) -> None:
        """Create file in repository"""
        import base64
        
        file_data = {
            'message': message,
            'content': base64.b64encode(content.encode()).decode(),
            'branch': 'main'
        }
        
        self.client.put(f'/repos/{repo_full_name}/contents/{path}', json=file_data)
    
    def _generate_workflow_content(self, workflow: Workflow) -> str:
        """Generate workflow YAML content"""
        # This would generate the actual workflow YAML based on the workflow configuration
        # For now, returning a placeholder
        return f"""
name: {workflow.name}

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  {workflow.name.lower()}:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run {workflow.name}
        run: echo "Running {workflow.name}"
"""
    
    def _encrypt_secret(self, value: str, public_key: str) -> str:
        """Encrypt secret value using repository public key"""
        import base64
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import padding
        
        # Decode public key
        public_key_bytes = base64.b64decode(public_key)
        public_key_obj = serialization.load_der_public_key(public_key_bytes)
        
        # Encrypt value
        encrypted = public_key_obj.encrypt(
            value.encode(),
            padding.PKCS1v15()
        )
        
        return base64.b64encode(encrypted).decode()
    
    def _set_environment_secret(self, repo_full_name: str, environment: str, name: str, value: str) -> None:
        """Set environment secret"""
        # Get environment public key
        key_response = self.client.get(f'/repos/{repo_full_name}/environments/{environment}/secrets/public-key')
        public_key = key_response.json()
        
        # Encrypt secret value
        encrypted_value = self._encrypt_secret(value, public_key['key'])
        
        # Set secret
        secret_data = {
            'encrypted_value': encrypted_value,
            'key_id': public_key['key_id']
        }
        
        self.client.put(
            f'/repos/{repo_full_name}/environments/{environment}/secrets/{name}',
            json=secret_data
        )
    
    def _set_environment_variable(self, repo_full_name: str, environment: str, name: str, value: str) -> None:
        """Set environment variable"""
        var_data = {'value': value}
        
        self.client.put(
            f'/repos/{repo_full_name}/environments/{environment}/variables/{name}',
            json=var_data
        )
```

### Workflow Template Service

```python
class WorkflowTemplateService:
    def __init__(self):
        self.templates = {
            'ci': self._get_ci_template(),
            'cd': self._get_cd_template(),
            'security': self._get_security_template(),
            'quality': self._get_quality_template()
        }
    
    def get_workflow_template(self, workflow_type: str, project_config: Dict[str, Any]) -> str:
        """Get workflow template based on type and project configuration"""
        if workflow_type not in self.templates:
            raise WorkflowTemplateNotFoundError(f"Workflow template {workflow_type} not found")
        
        template = self.templates[workflow_type]
        return self._render_template(template, project_config)
    
    def _get_ci_template(self) -> str:
        """Get CI workflow template"""
        return """
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  AWS_REGION: {{ aws_region }}
  
jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup {{ runtime }}
        uses: actions/setup-{{ runtime_action }}@v4
        with:
          {{ runtime_version_key }}: '{{ runtime_version }}'
          cache: '{{ package_manager }}'
          
      - name: Install dependencies
        run: {{ install_command }}
        
      - name: Run linting
        run: {{ lint_command }}
        
      - name: Run type checking
        run: {{ typecheck_command }}
        
      - name: Run unit tests
        run: {{ test_command }}
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
          
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run CodeQL Analysis
        uses: github/codeql-action/init@v2
        with:
          languages: {{ languages }}
          
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        
      - name: Run dependency scan
        run: {{ dependency_scan_command }}
        
      - name: Run secret scanning
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
"""
    
    def _get_cd_template(self) -> str:
        """Get CD workflow template"""
        return """
name: CD Pipeline

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy to'
        required: true
        default: 'staging'
        type: choice
        options:
          - staging
          - production

env:
  AWS_REGION: {{ aws_region }}
  SAM_TEMPLATE: template.yaml

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup SAM CLI
        uses: aws-actions/setup-sam@v2
        
      - name: Build SAM application
        run: sam build --use-container
        
      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: sam-artifacts
          path: .aws-sam/build/
          
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
          path: .aws-sam/build/
          
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          
      - name: Deploy to staging
        run: |
          sam deploy \\
            --stack-name {{ project_name }}-staging \\
            --capabilities CAPABILITY_IAM \\
            --parameter-overrides \\
              Environment=staging \\
              Version=${{ github.sha }}
              
  deploy-production:
    runs-on: ubuntu-latest
    needs: [build, deploy-staging]
    if: github.ref == 'refs/heads/main'
    environment: production
    steps:
      - uses: actions/checkout@v4
      
      - name: Download build artifacts
        uses: actions/download-artifact@v4
        with:
          name: sam-artifacts
          path: .aws-sam/build/
          
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}
          
      - name: Deploy to production
        run: |
          sam deploy \\
            --stack-name {{ project_name }}-production \\
            --capabilities CAPABILITY_IAM \\
            --parameter-overrides \\
              Environment=production \\
              Version=${{ github.sha }}
"""
    
    def _get_security_template(self) -> str:
        """Get security workflow template"""
        return """
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 6 * * *'

jobs:
  security-analysis:
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      
    steps:
      - uses: actions/checkout@v4
      
      - name: Run CodeQL Analysis
        uses: github/codeql-action/init@v2
        with:
          languages: {{ languages }}
          
      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v2
        
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
          
      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
          
      - name: Run dependency scan
        run: {{ dependency_scan_command }}
        
      - name: Run secret scanning
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
"""
    
    def _get_quality_template(self) -> str:
        """Get quality workflow template"""
        return """
name: Quality Gate

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  quality-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup {{ runtime }}
        uses: actions/setup-{{ runtime_action }}@v4
        with:
          {{ runtime_version_key }}: '{{ runtime_version }}'
          cache: '{{ package_manager }}'
          
      - name: Install dependencies
        run: {{ install_command }}
        
      - name: Run linting
        run: {{ lint_command }}
        
      - name: Run type checking
        run: {{ typecheck_command }}
        
      - name: Run unit tests with coverage
        run: {{ test_with_coverage_command }}
        
      - name: Run integration tests
        run: {{ integration_test_command }}
        
      - name: Check test coverage
        run: {{ coverage_check_command }}
        
      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage.xml
          flags: unittests
          
      - name: Comment coverage on PR
        if: github.event_name == 'pull_request'
        uses: py-cov-action/python-coverage-comment-action@v3
        with:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
"""
    
    def _render_template(self, template: str, config: Dict[str, Any]) -> str:
        """Render template with configuration"""
        from jinja2 import Template
        
        jinja_template = Template(template)
        return jinja_template.render(**config)
```

### Rate Limiting Service

```python
class RateLimiter:
    def __init__(self):
        self.redis_client = redis.Redis(host=os.environ.get('REDIS_HOST', 'localhost'))
        self.limits = {
            'repository_creation': {'limit': 10, 'window': 3600},  # 10 repos per hour
            'workflow_trigger': {'limit': 100, 'window': 3600},   # 100 triggers per hour
            'api_call': {'limit': 5000, 'window': 3600}           # 5000 calls per hour
        }
    
    def check_limit(self, operation: str, user_id: str = None) -> bool:
        """Check if operation is within rate limits"""
        if operation not in self.limits:
            return True
        
        key = f"rate_limit:{operation}:{user_id or 'global'}"
        limit_config = self.limits[operation]
        
        try:
            current = self.redis_client.get(key)
            if current is None:
                self.redis_client.setex(key, limit_config['window'], 1)
                return True
            
            if int(current) >= limit_config['limit']:
                return False
            
            self.redis_client.incr(key)
            return True
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return True  # Allow operation if rate limit check fails
    
    def get_remaining_calls(self, operation: str, user_id: str = None) -> int:
        """Get remaining calls for operation"""
        if operation not in self.limits:
            return float('inf')
        
        key = f"rate_limit:{operation}:{user_id or 'global'}"
        limit_config = self.limits[operation]
        
        try:
            current = self.redis_client.get(key)
            if current is None:
                return limit_config['limit']
            
            return max(0, limit_config['limit'] - int(current))
        except Exception as e:
            logger.error(f"Failed to get remaining calls: {e}")
            return limit_config['limit']
```

## Domain Events

### Event Definitions

```python
class RepositoryCreationStarted(DomainEvent):
    def __init__(self, repository_id: str, project_id: str, repository_name: str):
        super().__init__()
        self.repository_id = repository_id
        self.project_id = project_id
        self.repository_name = repository_name

class RepositoryCreated(DomainEvent):
    def __init__(self, repository_id: str, project_id: str, repository_name: str, github_id: int):
        super().__init__()
        self.repository_id = repository_id
        self.project_id = project_id
        self.repository_name = repository_name
        self.github_id = github_id

class WorkflowAdded(DomainEvent):
    def __init__(self, repository_id: str, project_id: str, workflow_name: str):
        super().__init__()
        self.repository_id = repository_id
        self.project_id = project_id
        self.workflow_name = workflow_name

class EnvironmentsConfigured(DomainEvent):
    def __init__(self, repository_id: str, project_id: str, environment_names: List[str]):
        super().__init__()
        self.repository_id = repository_id
        self.project_id = project_id
        self.environment_names = environment_names

class BranchProtectionConfigured(DomainEvent):
    def __init__(self, repository_id: str, project_id: str, branch: str):
        super().__init__()
        self.repository_id = repository_id
        self.project_id = project_id
        self.branch = branch

class WebhookAdded(DomainEvent):
    def __init__(self, repository_id: str, project_id: str, webhook_url: str):
        super().__init__()
        self.repository_id = repository_id
        self.project_id = project_id
        self.webhook_url = webhook_url

class SecretAdded(DomainEvent):
    def __init__(self, repository_id: str, project_id: str, secret_name: str):
        super().__init__()
        self.repository_id = repository_id
        self.project_id = project_id
        self.secret_name = secret_name

class DeploymentTriggered(DomainEvent):
    def __init__(self, repository_id: str, project_id: str, deployment_id: str, environment: str, ref: str):
        super().__init__()
        self.repository_id = repository_id
        self.project_id = project_id
        self.deployment_id = deployment_id
        self.environment = environment
        self.ref = ref

class WorkflowTriggered(DomainEvent):
    def __init__(self, repository_id: str, project_id: str, workflow_name: str, ref: str):
        super().__init__()
        self.repository_id = repository_id
        self.project_id = project_id
        self.workflow_name = workflow_name
        self.ref = ref

class DeploymentCompleted(DomainEvent):
    def __init__(self, repository_id: str, project_id: str, deployment_id: str, environment: str, status: str):
        super().__init__()
        self.repository_id = repository_id
        self.project_id = project_id
        self.deployment_id = deployment_id
        self.environment = environment
        self.status = status

class DeploymentFailed(DomainEvent):
    def __init__(self, repository_id: str, project_id: str, deployment_id: str, environment: str, error_message: str):
        super().__init__()
        self.repository_id = repository_id
        self.project_id = project_id
        self.deployment_id = deployment_id
        self.environment = environment
        self.error_message = error_message
```

## Application Services

### GitHub Integration Service

```python
class GitHubIntegrationService:
    def __init__(self, github_api: GitHubAPIService, workflow_templates: WorkflowTemplateService, 
                 repository_repo: RepositoryRepository):
        self.github_api = github_api
        self.workflow_templates = workflow_templates
        self.repository_repo = repository_repo
    
    def create_project_repository(self, project_id: str, repository_name: str, 
                                organization: str, template_files: Dict[str, str],
                                project_config: Dict[str, Any]) -> str:
        """Create GitHub repository for project"""
        repository_id = str(uuid.uuid4())
        
        # Create repository aggregate
        repository = Repository(repository_id, project_id, repository_name, organization)
        
        # Create repository template
        template = RepositoryTemplate(repository_name, template_files)
        template.gitignore_template = project_config.get('gitignore_template', 'Python')
        template.license_template = project_config.get('license_template', 'MIT')
        
        # Start repository creation
        repository.create_repository(template_files, project_config.get('description'))
        
        try:
            # Create repository on GitHub
            repo_info = self.github_api.create_repository(repository, template)
            
            # Update repository with GitHub details
            repository.repository_created(
                repo_info['github_id'],
                repo_info['clone_url'],
                repo_info['ssh_url'],
                repo_info['web_url']
            )
            
            # Setup workflows
            self._setup_standard_workflows(repository, project_config)
            
            # Setup environments
            self._setup_environments(repository, project_config)
            
            # Setup branch protection
            self._setup_branch_protection(repository, project_config)
            
            # Setup webhooks
            self._setup_webhooks(repository, project_config)
            
            # Setup secrets
            self._setup_secrets(repository, project_config)
            
            # Save repository
            self.repository_repo.save(repository)
            
            return repository_id
            
        except Exception as e:
            repository.status = RepositoryStatus.FAILED
            self.repository_repo.save(repository)
            raise
    
    def trigger_deployment(self, repository_id: str, environment: str, ref: str = None) -> str:
        """Trigger deployment to environment"""
        repository = self.repository_repo.get(repository_id)
        
        # Create deployment
        deployment_id = self.github_api.create_deployment(repository, environment, ref or 'main')
        
        # Trigger workflow
        self.github_api.trigger_workflow(repository, 'cd', ref or 'main', {
            'environment': environment,
            'deployment_id': deployment_id
        })
        
        return deployment_id
    
    def get_repository_status(self, repository_id: str) -> Dict[str, Any]:
        """Get repository status and information"""
        repository = self.repository_repo.get(repository_id)
        
        return {
            'id': repository.id,
            'project_id': repository.project_id,
            'name': repository.name,
            'full_name': repository.full_name,
            'status': repository.status.value,
            'web_url': repository.web_url,
            'clone_url': repository.clone_url,
            'workflows': [w.name for w in repository.workflows],
            'environments': [e.name for e in repository.environments],
            'created_at': repository.created_at.isoformat(),
            'updated_at': repository.updated_at.isoformat()
        }
    
    def _setup_standard_workflows(self, repository: Repository, project_config: Dict[str, Any]) -> None:
        """Setup standard CI/CD workflows"""
        # CI Workflow
        ci_workflow = Workflow('ci', 'ci', '.github/workflows/ci.yml')
        ci_workflow.add_trigger(WorkflowTrigger('push', ['main', 'develop']))
        ci_workflow.add_trigger(WorkflowTrigger('pull_request', ['main']))
        repository.add_workflow(ci_workflow)
        
        # CD Workflow
        cd_workflow = Workflow('cd', 'cd', '.github/workflows/cd.yml')
        cd_workflow.add_trigger(WorkflowTrigger('push', ['main']))
        repository.add_workflow(cd_workflow)
        
        # Security Workflow
        security_workflow = Workflow('security', 'security', '.github/workflows/security.yml')
        security_workflow.add_trigger(WorkflowTrigger('push', ['main', 'develop']))
        security_workflow.add_trigger(WorkflowTrigger('pull_request', ['main']))
        repository.add_workflow(security_workflow)
        
        # Setup workflows on GitHub
        self.github_api.setup_workflows(repository)
    
    def _setup_environments(self, repository: Repository, project_config: Dict[str, Any]) -> None:
        """Setup deployment environments"""
        # Development environment
        dev_env = Environment('development', 'development')
        dev_env.deployment_branch_policy = {'protected_branches': False, 'custom_branches': True}
        
        # Staging environment
        staging_env = Environment('staging', 'staging')
        staging_env.deployment_branch_policy = {'protected_branches': True, 'custom_branches': False}
        
        # Production environment
        prod_env = Environment('production', 'production')
        prod_env.deployment_branch_policy = {'protected_branches': True, 'custom_branches': False}
        prod_env.reviewers = project_config.get('production_reviewers', [])
        prod_env.wait_timer = 5  # 5 minutes wait time
        
        repository.setup_environments([dev_env, staging_env, prod_env])
        
        # Configure environments on GitHub
        self.github_api.configure_environments(repository)
    
    def _setup_branch_protection(self, repository: Repository, project_config: Dict[str, Any]) -> None:
        """Setup branch protection rules"""
        branch_protection = BranchProtection('main')
        branch_protection.required_status_checks = ['ci', 'security']
        branch_protection.required_pull_request_reviews = True
        branch_protection.required_approving_review_count = 2
        branch_protection.dismiss_stale_reviews = True
        branch_protection.enforce_admins = True
        
        repository.configure_branch_protection(branch_protection)
        
        # Setup branch protection on GitHub
        self.github_api.setup_branch_protection(repository)
    
    def _setup_webhooks(self, repository: Repository, project_config: Dict[str, Any]) -> None:
        """Setup webhooks for integration"""
        webhook_url = project_config.get('webhook_url')
        if webhook_url:
            webhook = Webhook(webhook_url, ['push', 'pull_request', 'deployment'])
            webhook.secret = project_config.get('webhook_secret')
            
            repository.add_webhook(webhook)
            
            # Create webhook on GitHub
            self.github_api.create_webhook(repository, webhook)
    
    def _setup_secrets(self, repository: Repository, project_config: Dict[str, Any]) -> None:
        """Setup repository secrets"""
        secrets = project_config.get('secrets', {})
        
        for secret_name, secret_value in secrets.items():
            repository.set_secret(secret_name, secret_value)
            
            # Set secret on GitHub
            self.github_api.set_repository_secret(repository, secret_name, secret_value)
```

This GitHub Integration domain design provides comprehensive repository management, workflow automation, and deployment orchestration capabilities while maintaining proper domain boundaries and event-driven integration with other system components.