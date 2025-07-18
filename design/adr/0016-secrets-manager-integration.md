# ADR-0016: AWS Secrets Manager Integration

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need a secure, scalable solution for managing sensitive configuration data including API keys, database credentials, encryption keys, and third-party service tokens across our serverless microservices architecture.

## Decision Drivers

* Security best practices for secret storage and access
* Integration with AWS Lambda and Step Functions
* Automatic rotation capabilities for long-lived secrets
* Audit trail for secret access
* Cost-effective secret management
* Support for different secret types and formats
* Integration with existing IAM and observability systems

## Considered Options

* **Option 1**: Environment variables with basic encryption
* **Option 2**: AWS Systems Manager Parameter Store
* **Option 3**: AWS Secrets Manager
* **Option 4**: Third-party secret management solution
* **Option 5**: Hybrid approach with multiple secret stores

## Decision Outcome

Chosen option: **"AWS Secrets Manager"**, because it provides comprehensive secret management with automatic rotation, detailed audit logging, and excellent integration with our serverless architecture while maintaining cost-effectiveness for our use case.

### Implementation Details

**Secret Organization Strategy**:

**Naming Convention**:
```
/{environment}/{service}/{secret-type}/{secret-name}
```

**Examples**:
- `/prod/github-integration/api-token/personal-access-token`
- `/prod/claude-sdk/api-key/anthropic-key`
- `/prod/cognito/app-client/secret`
- `/staging/template-management/encryption-key/template-key`

**Secret Categories**:

**Third-Party API Keys**:
```json
{
  "name": "/prod/github-integration/api-token/personal-access-token",
  "description": "GitHub Personal Access Token for repository operations",
  "secretString": {
    "token": "ghp_xxxxxxxxxxxx",
    "username": "github-user",
    "permissions": ["repo", "admin:repo_hook"]
  }
}
```

**Service Credentials**:
```json
{
  "name": "/prod/claude-sdk/api-key/anthropic-key", 
  "description": "Anthropic Claude API key for AI integration",
  "secretString": {
    "apiKey": "sk-ant-xxxxxxxxxxxx",
    "baseUrl": "https://api.anthropic.com",
    "model": "claude-3-sonnet-20240229"
  }
}
```

**Encryption Keys**:
```json
{
  "name": "/prod/template-management/encryption-key/template-key",
  "description": "AES key for template field encryption",
  "secretBinary": "base64-encoded-key"
}
```

**Lambda Integration Pattern**:

**Shared Lambda Layer**:
```python
# shared_secrets.py
import boto3
import json
from functools import lru_cache

class SecretsManager:
    def __init__(self):
        self.client = boto3.client('secretsmanager')
    
    @lru_cache(maxsize=10)
    def get_secret(self, secret_name):
        """Get secret with caching for Lambda container reuse"""
        try:
            response = self.client.get_secret_value(SecretId=secret_name)
            return json.loads(response['SecretString'])
        except Exception as e:
            print(f"Error retrieving secret {secret_name}: {e}")
            raise
    
    def get_github_token(self, environment='prod'):
        secret_name = f"/{environment}/github-integration/api-token/personal-access-token"
        secret = self.get_secret(secret_name)
        return secret['token']
    
    def get_claude_config(self, environment='prod'):
        secret_name = f"/{environment}/claude-sdk/api-key/anthropic-key"
        return self.get_secret(secret_name)

# Usage in Lambda functions
secrets = SecretsManager()

def lambda_handler(event, context):
    github_token = secrets.get_github_token()
    claude_config = secrets.get_claude_config()
    # Use secrets...
```

**Step Functions Integration**:
```json
{
  "Comment": "Step Function with Secrets Manager",
  "StartAt": "GetSecrets",
  "States": {
    "GetSecrets": {
      "Type": "Task",
      "Resource": "arn:aws:states:::aws-sdk:secretsmanager:getSecretValue",
      "Parameters": {
        "SecretId": "/prod/github-integration/api-token/personal-access-token"
      },
      "ResultPath": "$.secrets.github",
      "Next": "ProcessWithSecrets"
    },
    "ProcessWithSecrets": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "process-with-github-api",
        "Payload": {
          "data.$": "$.data",
          "githubToken.$": "$.secrets.github.SecretString"
        }
      },
      "End": true
    }
  }
}
```

### IAM Integration

**Service-Specific IAM Policies**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": [
        "arn:aws:secretsmanager:region:account:secret:/prod/github-integration/*",
        "arn:aws:secretsmanager:region:account:secret:/staging/github-integration/*"
      ],
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-east-1"
        }
      }
    }
  ]
}
```

**Cross-Service Secret Access**:
- Minimal cross-service access
- Explicit resource ARNs (no wildcards)
- Environment-based restrictions
- Time-based access controls where needed

### Rotation Strategy

**Automatic Rotation**:
```python
# Rotation Lambda for GitHub tokens
def lambda_handler(event, context):
    secret_arn = event['SecretId']
    token = event['Token']
    step = event['Step']
    
    if step == 'createSecret':
        # Generate new GitHub token
        new_token = github_api.create_token()
        return {'SecretString': json.dumps({'token': new_token})}
    
    elif step == 'setSecret':
        # Update secret with new token
        secrets_client.update_secret(
            SecretId=secret_arn,
            SecretString=json.dumps({'token': token})
        )
    
    elif step == 'testSecret':
        # Test new token works
        github_api.test_token(token)
    
    elif step == 'finishSecret':
        # Mark rotation complete
        pass
```

**Rotation Schedule**:
- GitHub tokens: 90 days
- Claude API keys: Manual rotation (when needed)
- Encryption keys: 365 days
- Database credentials: 30 days (if applicable)

### Observability Integration

**CloudWatch Metrics**:
- Secret retrieval frequency
- Rotation success/failure rates
- Access denied events
- Cross-service access patterns

**Audit Logging**:
```python
def audit_secret_access(secret_name, service_name, operation):
    cloudwatch_logs.put_log_events(
        logGroupName='/aws/lambda/secret-audit',
        logStreamName=datetime.now().strftime('%Y/%m/%d'),
        logEvents=[{
            'timestamp': int(time.time() * 1000),
            'message': json.dumps({
                'secretName': secret_name,
                'serviceName': service_name,
                'operation': operation,
                'timestamp': datetime.utcnow().isoformat(),
                'requestId': context.aws_request_id
            })
        }]
    )
```

**Integration with Observability API**:
- Expose secret metadata (not values) via `/api/observability/secrets`
- Show rotation status and last access times
- Alert on failed rotations or suspicious access patterns

### Consequences

**Good**:
* **Security**: Centralized, encrypted secret storage with access controls
* **Audit trail**: Complete logging of secret access and modifications
* **Automatic rotation**: Reduces risk from long-lived credentials
* **Integration**: Native AWS service integration with Lambda and Step Functions
* **Versioning**: Automatic versioning of secret changes
* **Recovery**: Previous secret versions available for rollback
* **Cost-effective**: Pay per secret per month, reasonable for our scale

**Bad**:
* **Latency**: Additional network call for secret retrieval (~10-50ms)
* **Complexity**: More complex than environment variables
* **Cost**: Higher cost than Parameter Store for simple values
* **Dependency**: External dependency that could fail
* **Rate limits**: API rate limits for high-frequency access
* **Regional**: Secrets are region-specific (need replication for DR)

## Error Handling

**Secret Retrieval Failures**:
- Exponential backoff retry logic
- Fallback to cached values (with TTL)
- Circuit breaker pattern for persistent failures
- Graceful degradation where possible

**Rotation Failures**:
- Automatic rollback to previous version
- Alert operations team
- Manual intervention procedures documented
- Testing of rollback procedures

## Cost Optimization

**Caching Strategy**:
- Lambda container-level caching
- TTL-based cache invalidation
- Minimize API calls through smart caching

**Secret Consolidation**:
- Group related secrets where appropriate
- Avoid creating secrets for non-sensitive data
- Regular review of secret usage patterns

## Implementation Guidelines

1. **Principle of Least Privilege**: Minimal IAM permissions per service
2. **Environment Separation**: Strict environment isolation for secrets
3. **Naming Convention**: Consistent, hierarchical naming
4. **Documentation**: Document secret purpose and rotation schedule
5. **Testing**: Test secret rotation and failure scenarios

## Migration Strategy

**From Environment Variables**:
1. Identify sensitive environment variables
2. Create corresponding secrets in Secrets Manager
3. Update Lambda functions to use Secrets Manager
4. Remove environment variables
5. Test thoroughly in staging environment

## More Information

* [AWS Secrets Manager Documentation](https://docs.aws.amazon.com/secretsmanager/)
* [Lambda Best Practices for Secrets](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
* [Secret Rotation Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html)
* Related ADRs: ADR-0001 (AWS Serverless), ADR-0017 (Security Monitoring), ADR-0013 (Observability API)