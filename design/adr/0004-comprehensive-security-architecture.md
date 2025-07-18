# ADR-0004: Comprehensive Security Architecture

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team  
**Supersedes**: ADR-0014 (API Security), ADR-0015 (Event Security), ADR-0016 (Secrets Manager), ADR-0017 (Security Monitoring), ADR-0018 (Code Security)

## Context and Problem Statement

We need a comprehensive security strategy that:
- Protects API endpoints from malicious requests and attacks
- Ensures event integrity and prevents duplicate processing
- Manages secrets and sensitive configuration securely
- Provides real-time security monitoring and threat detection
- Implements code security scanning in the development pipeline
- Maintains compliance with security best practices
- Integrates seamlessly with our serverless architecture

## Decision Drivers

* Protection against OWASP Top 10 vulnerabilities
* Data validation at multiple layers
* Secure secrets management across environments
* Real-time threat detection and response
* Compliance monitoring and audit trails
* Automated security scanning in CI/CD
* Defense in depth security strategy
* Minimal performance impact on legitimate requests
* Integration with AWS security services

## Considered Options

### API Security Options
* Basic API Gateway security only
* Request validation only with OpenAPI schemas
* AWS WAF only without request validation
* Combined request validation and AWS WAF
* Third-party API security solution

### Event Security Options
* No event validation or idempotency controls
* Event schema validation only
* Idempotency controls only
* Combined schema validation and idempotency

### Secrets Management Options
* Environment variables only
* AWS Systems Manager Parameter Store
* AWS Secrets Manager
* HashiCorp Vault
* Kubernetes Secrets (if using EKS)

### Security Monitoring Options
* AWS Security Hub + GuardDuty only
* Third-party SIEM solution
* Custom security monitoring
* AWS native services + custom analytics

### Code Security Options
* Manual security reviews only
* GitHub native security scanning
* Third-party scanning tools
* Comprehensive scanning pipeline

## Decision Outcome

Chosen options:
1. **Combined request validation and AWS WAF** for API security
2. **Combined schema validation and idempotency** for event security
3. **AWS Secrets Manager** for secrets management
4. **AWS Security Hub + GuardDuty + Custom analytics** for monitoring
5. **Comprehensive scanning pipeline** for code security

This combination provides defense in depth with AWS-native integration while maintaining flexibility for custom requirements.

### Implementation Details

**Security Architecture Overview**:

```
┌─────────────────────────────────────────────────────────────┐
│                    External Traffic                          │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     AWS WAF                                  │
│  • SQL Injection Protection  • Rate Limiting                 │
│  • XSS Protection           • Geo Blocking                   │
│  • Custom Rules             • IP Reputation                  │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  API Gateway                                 │
│  • Request Validation       • API Keys                       │
│  • Cognito Authorization    • Throttling                     │
│  • OpenAPI Schema          • CORS                           │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                Lambda Functions                              │
│  • Input Validation         • Secrets Manager                │
│  • JWT Verification         • Least Privilege IAM            │
│  • Business Logic          • Error Handling                  │
└─────────────────────────┬───────────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  EventBridge                                 │
│  • Schema Validation        • Event Signing                  │
│  • Idempotency Keys        • Access Control                  │
└─────────────────────────┴───────────────────────────────────┘
```

**1. API Security Layer**:

**WAF Configuration**:
```yaml
WebACL:
  Type: AWS::WAFv2::WebACL
  Properties:
    Scope: REGIONAL
    DefaultAction:
      Allow: {}
    Rules:
      # AWS Managed Rules
      - Name: AWSManagedRulesCommonRuleSet
        Priority: 1
        Statement:
          ManagedRuleGroupStatement:
            VendorName: AWS
            Name: AWSManagedRulesCommonRuleSet
        OverrideAction:
          None: {}
        VisibilityConfig:
          SampledRequestsEnabled: true
          CloudWatchMetricsEnabled: true
          MetricName: CommonRuleSetMetric
      
      # SQL Injection Protection
      - Name: AWSManagedRulesSQLiRuleSet
        Priority: 2
        Statement:
          ManagedRuleGroupStatement:
            VendorName: AWS
            Name: AWSManagedRulesSQLiRuleSet
      
      # Rate Limiting
      - Name: RateLimitRule
        Priority: 3
        Statement:
          RateBasedStatement:
            Limit: 2000  # Requests per 5 minutes
            AggregateKeyType: IP
        Action:
          Block: {}
      
      # Custom Rules for API Protection
      - Name: APIProtectionRule
        Priority: 4
        Statement:
          ByteMatchStatement:
            SearchString: "../"
            FieldToMatch:
              UriPath: {}
            TextTransformations:
              - Priority: 0
                Type: URL_DECODE
        Action:
          Block: {}
```

**Request Validation**:
```yaml
# OpenAPI validation schema
components:
  schemas:
    CreateProjectRequest:
      type: object
      required:
        - name
        - description
      properties:
        name:
          type: string
          minLength: 3
          maxLength: 50
          pattern: '^[a-zA-Z0-9-_]+$'
        description:
          type: string
          maxLength: 500
        tags:
          type: array
          maxItems: 10
          items:
            type: string
            pattern: '^[a-zA-Z0-9]+$'
      additionalProperties: false

  securitySchemes:
    CognitoUserPool:
      type: apiKey
      name: Authorization
      in: header
      x-amazon-apigateway-authtype: cognito_user_pools
```

**Lambda Input Validation**:
```python
from typing import Dict, Any
from jsonschema import validate, ValidationError
from functools import wraps

def validate_input(schema: Dict[str, Any]):
    """Decorator for input validation"""
    def decorator(func):
        @wraps(func)
        def wrapper(event, context):
            try:
                # Parse and validate request body
                body = json.loads(event.get('body', '{}'))
                validate(instance=body, schema=schema)
                
                # Additional security checks
                if contains_sql_injection(body):
                    raise ValidationError("Potential SQL injection detected")
                
                if contains_xss(body):
                    raise ValidationError("Potential XSS detected")
                
                # Call original function
                return func(event, context)
                
            except ValidationError as e:
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'Validation error',
                        'message': str(e)
                    })
                }
        return wrapper
    return decorator

# Usage
@validate_input(CREATE_PROJECT_SCHEMA)
def create_project_handler(event, context):
    # Business logic here
    pass
```

**2. Event Security Layer**:

**Event Schema Validation**:
```yaml
# EventBridge schema registry
ProjectCreatedSchema:
  Type: AWS::EventSchemas::Schema
  Properties:
    RegistryName: skafu-events
    SchemaName: ProjectCreated
    Type: OpenApi3
    Content: |
      {
        "openapi": "3.0.0",
        "info": {
          "version": "1.0.0",
          "title": "ProjectCreated"
        },
        "components": {
          "schemas": {
            "ProjectCreated": {
              "type": "object",
              "required": ["projectId", "name", "timestamp"],
              "properties": {
                "projectId": {
                  "type": "string",
                  "format": "uuid"
                },
                "name": {
                  "type": "string",
                  "minLength": 3,
                  "maxLength": 50
                },
                "timestamp": {
                  "type": "string",
                  "format": "date-time"
                }
              }
            }
          }
        }
      }
```

**Idempotency Implementation**:
```python
class IdempotencyHandler:
    def __init__(self, table_name: str):
        self.dynamodb = boto3.resource('dynamodb')
        self.table = self.dynamodb.Table(table_name)
    
    def process_idempotent(self, idempotency_key: str, ttl_seconds: int = 86400):
        """Decorator for idempotent processing"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Check if already processed
                try:
                    response = self.table.get_item(
                        Key={'idempotencyKey': idempotency_key}
                    )
                    
                    if 'Item' in response:
                        # Already processed, return cached result
                        return response['Item']['result']
                    
                except Exception:
                    # Continue if check fails
                    pass
                
                # Process the request
                result = func(*args, **kwargs)
                
                # Store result with TTL
                try:
                    self.table.put_item(
                        Item={
                            'idempotencyKey': idempotency_key,
                            'result': result,
                            'timestamp': datetime.utcnow().isoformat(),
                            'ttl': int(time.time()) + ttl_seconds
                        },
                        ConditionExpression='attribute_not_exists(idempotencyKey)'
                    )
                except self.dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
                    # Another process beat us to it
                    response = self.table.get_item(
                        Key={'idempotencyKey': idempotency_key}
                    )
                    return response['Item']['result']
                
                return result
            return wrapper
        return decorator

# Usage in event handler
@idempotency_handler.process_idempotent(
    idempotency_key=event['detail']['eventId']
)
def handle_event(event):
    # Process event
    pass
```

**3. Secrets Management**:

```yaml
# Secrets Manager configuration
DatabaseSecret:
  Type: AWS::SecretsManager::Secret
  Properties:
    Name: !Sub '${AWS::StackName}-database-credentials'
    Description: Database connection credentials
    SecretString: !Sub |
      {
        "username": "${DatabaseUsername}",
        "password": "${DatabasePassword}",
        "engine": "postgres",
        "host": "${DatabaseEndpoint}",
        "port": 5432,
        "dbname": "${DatabaseName}"
      }
    KmsKeyId: !Ref SecretsKMSKey

# Lambda function access
LambdaExecutionRole:
  Type: AWS::IAM::Role
  Properties:
    Policies:
      - PolicyName: SecretsAccess
        PolicyDocument:
          Statement:
            - Effect: Allow
              Action:
                - secretsmanager:GetSecretValue
              Resource: !Ref DatabaseSecret
              Condition:
                StringEquals:
                  secretsmanager:VersionStage: AWSCURRENT
```

**Secrets Usage in Lambda**:
```python
import boto3
from functools import lru_cache

class SecretsManager:
    def __init__(self):
        self.client = boto3.client('secretsmanager')
        self._cache = {}
    
    @lru_cache(maxsize=32)
    def get_secret(self, secret_name: str) -> Dict[str, Any]:
        """Get secret with caching"""
        try:
            response = self.client.get_secret_value(SecretId=secret_name)
            secret_string = response['SecretString']
            return json.loads(secret_string)
        except Exception as e:
            logger.error(f"Failed to retrieve secret: {e}")
            raise
    
    def get_database_credentials(self) -> Dict[str, str]:
        """Get database credentials"""
        return self.get_secret('skafu-database-credentials')

# Usage
secrets = SecretsManager()
db_creds = secrets.get_database_credentials()
```

**4. Security Monitoring**:

```yaml
# Security monitoring configuration
SecurityHub:
  Type: AWS::SecurityHub::Hub
  Properties:
    Tags:
      - Key: Project
        Value: Skafu

GuardDutyDetector:
  Type: AWS::GuardDuty::Detector
  Properties:
    Enable: true
    FindingPublishingFrequency: FIFTEEN_MINUTES

# Custom security analytics
SecurityAnalyticsFunction:
  Type: AWS::Serverless::Function
  Properties:
    Events:
      GuardDutyFindings:
        Type: EventBridgeRule
        Properties:
          Pattern:
            source: ["aws.guardduty"]
            detail-type: ["GuardDuty Finding"]
      SecurityHubFindings:
        Type: EventBridgeRule
        Properties:
          Pattern:
            source: ["aws.securityhub"]
```

**Security Analytics Implementation**:
```python
def security_analytics_handler(event, context):
    """Process security findings"""
    finding = event['detail']
    
    # Determine severity and required action
    severity = finding.get('Severity', {}).get('Label', 'MEDIUM')
    finding_type = finding.get('Type', 'Unknown')
    
    # Enhanced analysis
    risk_score = calculate_risk_score(finding)
    recommended_actions = get_recommended_actions(finding_type, severity)
    
    # Store in analytics table
    analytics_table.put_item(
        Item={
            'findingId': finding['Id'],
            'timestamp': datetime.utcnow().isoformat(),
            'severity': severity,
            'riskScore': risk_score,
            'findingType': finding_type,
            'resourceArn': finding.get('ResourceArn'),
            'recommendedActions': recommended_actions,
            'status': 'ACTIVE'
        }
    )
    
    # Critical findings trigger immediate response
    if severity == 'CRITICAL' or risk_score > 0.8:
        trigger_incident_response(finding)
```

**5. Code Security Scanning**:

```yaml
# GitHub Actions security workflow
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      # Dependency scanning
      - name: Run Snyk
        uses: snyk/actions/python@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
      
      # SAST scanning
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: >-
            p/security-audit
            p/python
            p/owasp-top-ten
      
      # Container scanning
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      # Infrastructure scanning
      - name: Run Checkov
        uses: bridgecrewio/checkov-action@master
        with:
          directory: ./infrastructure
          framework: cloudformation
      
      # Upload results to Security Hub
      - name: Upload to Security Hub
        run: |
          aws securityhub batch-import-findings \
            --findings file://security-findings.json
```

**Security Headers and CORS**:
```python
def add_security_headers(response: Dict[str, Any]) -> Dict[str, Any]:
    """Add security headers to API response"""
    headers = response.get('headers', {})
    
    headers.update({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Content-Security-Policy': "default-src 'self'",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    })
    
    response['headers'] = headers
    return response
```

### Security Monitoring Dashboard

**Custom Dashboard Data**:
```typescript
// Security dashboard component
function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics>();
  
  useEffect(() => {
    const fetchSecurityMetrics = async () => {
      const [findings, wafMetrics, authMetrics] = await Promise.all([
        apiClient.get('/api/observability/security/findings'),
        apiClient.get('/api/observability/security/waf'),
        apiClient.get('/api/observability/security/auth')
      ]);
      
      setMetrics({
        criticalFindings: findings.data.critical,
        blockedRequests: wafMetrics.data.blocked,
        failedLogins: authMetrics.data.failed,
        activeThreatActors: findings.data.threatActors
      });
    };
    
    fetchSecurityMetrics();
    const interval = setInterval(fetchSecurityMetrics, 60000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <Container>
      <Header variant="h1">Security Operations Center</Header>
      <Grid>
        <MetricCard
          title="Critical Findings"
          value={metrics?.criticalFindings || 0}
          trend={metrics?.criticalTrend}
          status={metrics?.criticalFindings > 0 ? 'error' : 'success'}
        />
        {/* Additional security metrics */}
      </Grid>
    </Container>
  );
}
```

### Incident Response Automation

```python
def trigger_incident_response(finding: Dict[str, Any]):
    """Automated incident response"""
    
    incident = {
        'title': f"Security Incident: {finding['Title']}",
        'severity': finding['Severity']['Label'],
        'description': finding['Description'],
        'affectedResources': finding.get('Resources', []),
        'timestamp': datetime.utcnow().isoformat()
    }
    
    # Create incident ticket
    response = create_incident_ticket(incident)
    
    # Notify security team
    notify_security_team(incident, response['ticketId'])
    
    # Automated remediation for known issues
    if finding['Type'] in AUTOMATED_REMEDIATION_TYPES:
        execute_remediation(finding)
    
    # Update incident status
    update_incident_status(response['ticketId'], 'IN_PROGRESS')
```

### Consequences

**Good**:
* **Defense in depth**: Multiple security layers protect against various threats
* **Automated detection**: Real-time threat identification and response
* **Compliance ready**: Meets security compliance requirements
* **Least privilege**: Fine-grained access control throughout
* **Audit trail**: Complete security event history
* **Shift left security**: Security integrated into development pipeline
* **Cost effective**: Leverages AWS native services efficiently
* **Scalable security**: Grows with application needs

**Bad**:
* **Complexity**: Multiple security services to configure and maintain
* **Learning curve**: Team needs security expertise across services
* **False positives**: Security tools may generate noise
* **Performance impact**: Security checks add latency
* **Cost overhead**: Security services add operational costs
* **Integration effort**: Requires careful integration planning
* **Maintenance burden**: Security rules need regular updates

## Implementation Guidelines

1. **Security First**: Consider security implications in all decisions
2. **Least Privilege**: Grant minimum required permissions
3. **Defense in Depth**: Implement multiple security layers
4. **Continuous Monitoring**: Monitor security metrics continuously
5. **Incident Response**: Have clear incident response procedures
6. **Regular Updates**: Keep security rules and patterns current
7. **Security Training**: Ensure team has security awareness
8. **Compliance Tracking**: Monitor compliance requirements

## More Information

* [AWS Security Best Practices](https://aws.amazon.com/architecture/security-identity-compliance/)
* [AWS WAF Documentation](https://docs.aws.amazon.com/waf/)
* [AWS Security Hub Documentation](https://docs.aws.amazon.com/securityhub/)
* [OWASP Top 10](https://owasp.org/www-project-top-ten/)
* [AWS Well-Architected Security Pillar](https://docs.aws.amazon.com/wellarchitected/latest/security-pillar/)
* Related ADRs: ADR-0001 (Core Architecture), ADR-0003 (Observability)