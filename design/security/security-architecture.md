# Security Architecture

## Overview

The Skafu platform implements a comprehensive security architecture based on AWS best practices, zero-trust principles, and defense-in-depth strategies. This document outlines the security architecture across all domains and infrastructure components.

## Security Principles

### Core Security Tenets

1. **Zero Trust Architecture**
   - Never trust, always verify
   - Least privilege access
   - Continuous verification
   - Assume breach mentality

2. **Defense in Depth**
   - Multiple layers of security controls
   - Fail-safe defaults
   - Principle of least privilege
   - Regular security audits

3. **Privacy by Design**
   - Data minimization
   - Purpose limitation
   - Encryption by default
   - Audit trail requirements

4. **Compliance First**
   - SOC 2 Type II
   - ISO 27001 alignment
   - GDPR compliance
   - Industry-specific requirements

## Authentication Architecture

### Multi-Factor Authentication (MFA)

```yaml
Authentication Flow:
  Primary Factor:
    - Username/Password
    - Corporate SSO (SAML/OIDC)
    - GitHub OAuth
    - Google Workspace
  
  Secondary Factor:
    - SMS (Time-based)
    - TOTP (Google Authenticator, Authy)
    - Hardware Keys (YubiKey, WebAuthn)
    - Biometric (TouchID, FaceID)
  
  Risk-Based:
    - Device Trust Score
    - Location Analysis
    - Behavioral Patterns
    - Session Risk Assessment
```

### Identity Provider Integration

```typescript
// AWS Cognito User Pool Configuration
const userPoolConfig = {
  userPool: {
    selfSignUpEnabled: false,
    signInAliases: ['email', 'username'],
    mfa: 'REQUIRED',
    mfaSecondFactor: ['SMS', 'SOFTWARE_TOKEN'],
    passwordPolicy: {
      minimumLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
      temporaryPasswordValidityDays: 1,
    },
    accountRecovery: 'EMAIL_ONLY',
  },
  
  identityPool: {
    allowUnauthenticatedIdentities: false,
    supportedProviders: [
      'GitHub',
      'Google',
      'SAML',
      'OIDC',
    ],
  },
  
  advancedSecurity: {
    mode: 'ENFORCED',
    compromisedCredentialsRiskConfiguration: {
      actions: {
        eventAction: 'BLOCK',
      },
    },
    accountTakeoverRiskConfiguration: {
      actions: {
        highAction: { eventAction: 'BLOCK' },
        mediumAction: { eventAction: 'MFA_REQUIRED' },
        lowAction: { eventAction: 'NO_ACTION' },
      },
    },
  },
};
```

### Token Management

```typescript
// JWT Token Strategy
interface TokenStrategy {
  accessToken: {
    expiration: '15m';
    algorithm: 'RS256';
    issuer: 'https://auth.skafu.dev';
    audience: 'skafu-api';
    claims: {
      sub: string;        // User ID
      email: string;      // User email
      groups: string[];   // User groups
      permissions: string[]; // Granular permissions
      session_id: string; // Session identifier
      device_id: string;  // Device fingerprint
    };
  };
  
  refreshToken: {
    expiration: '7d';
    rotation: true;
    reuseGracePeriod: '30s';
    storage: 'encrypted-httponly-cookie';
  };
  
  sessionToken: {
    expiration: '24h';
    storage: 'server-side';
    invalidation: 'immediate';
  };
}
```

## Authorization Architecture

### Role-Based Access Control (RBAC)

```yaml
Role Hierarchy:
  SystemAdmin:
    description: "Full system administration"
    permissions: ["*"]
    inherits: []
  
  OrganizationAdmin:
    description: "Organization-level administration"
    permissions:
      - "org:*"
      - "project:*"
      - "user:manage"
      - "billing:view"
    inherits: []
  
  ProjectOwner:
    description: "Project ownership and management"
    permissions:
      - "project:manage"
      - "project:deploy"
      - "project:delete"
      - "template:use"
      - "ai:analyze"
    inherits: ["ProjectContributor"]
  
  ProjectContributor:
    description: "Project development access"
    permissions:
      - "project:read"
      - "project:write"
      - "template:use"
      - "github:read"
      - "logs:read"
    inherits: ["ProjectViewer"]
  
  ProjectViewer:
    description: "Read-only project access"
    permissions:
      - "project:read"
      - "metrics:read"
      - "logs:read"
    inherits: []
```

### Attribute-Based Access Control (ABAC)

```typescript
// ABAC Policy Engine
interface AccessPolicy {
  id: string;
  name: string;
  description: string;
  rules: PolicyRule[];
  effect: 'ALLOW' | 'DENY';
  priority: number;
}

interface PolicyRule {
  resource: {
    type: string;
    attributes: Record<string, any>;
  };
  subject: {
    type: string;
    attributes: Record<string, any>;
  };
  action: {
    type: string;
    attributes: Record<string, any>;
  };
  environment: {
    attributes: Record<string, any>;
  };
  condition: string; // CEL expression
}

// Example Policy
const projectAccessPolicy: AccessPolicy = {
  id: 'project-access-001',
  name: 'Project Access Control',
  description: 'Controls access to project resources',
  effect: 'ALLOW',
  priority: 100,
  rules: [
    {
      resource: {
        type: 'project',
        attributes: {
          id: 'project.id',
          organization: 'project.organization',
          environment: 'project.environment',
        },
      },
      subject: {
        type: 'user',
        attributes: {
          id: 'user.id',
          organization: 'user.organization',
          roles: 'user.roles',
        },
      },
      action: {
        type: 'read',
        attributes: {
          scope: 'action.scope',
        },
      },
      environment: {
        attributes: {
          time: 'request.time',
          ip: 'request.ip',
          mfa: 'session.mfa',
        },
      },
      condition: `
        subject.organization == resource.organization &&
        ('ProjectViewer' in subject.roles || 
         'ProjectContributor' in subject.roles ||
         'ProjectOwner' in subject.roles) &&
        environment.mfa == true
      `,
    },
  ],
};
```

### Permission Matrix

```yaml
Permissions:
  # Project Management
  project:create:
    description: "Create new projects"
    roles: ["ProjectOwner", "OrganizationAdmin"]
    conditions: ["organization_limit_check"]
  
  project:read:
    description: "View project details"
    roles: ["ProjectViewer", "ProjectContributor", "ProjectOwner"]
    conditions: ["project_membership"]
  
  project:write:
    description: "Modify project configuration"
    roles: ["ProjectContributor", "ProjectOwner"]
    conditions: ["project_membership", "mfa_verified"]
  
  project:deploy:
    description: "Deploy project to environments"
    roles: ["ProjectOwner"]
    conditions: ["project_ownership", "environment_approval"]
  
  project:delete:
    description: "Delete projects"
    roles: ["ProjectOwner", "OrganizationAdmin"]
    conditions: ["project_ownership", "delete_confirmation"]
  
  # Template Management
  template:use:
    description: "Use templates for project creation"
    roles: ["ProjectViewer", "ProjectContributor", "ProjectOwner"]
    conditions: ["template_access"]
  
  template:create:
    description: "Create new templates"
    roles: ["TemplateManager", "OrganizationAdmin"]
    conditions: ["template_quota_check"]
  
  template:publish:
    description: "Publish templates"
    roles: ["TemplateManager", "OrganizationAdmin"]
    conditions: ["template_validation"]
  
  # AI Integration
  ai:analyze:
    description: "Perform AI analysis"
    roles: ["ProjectContributor", "ProjectOwner"]
    conditions: ["ai_quota_check", "project_membership"]
  
  ai:generate:
    description: "Generate code using AI"
    roles: ["ProjectContributor", "ProjectOwner"]
    conditions: ["ai_quota_check", "project_membership"]
  
  # GitHub Integration
  github:read:
    description: "Read GitHub repositories"
    roles: ["ProjectViewer", "ProjectContributor", "ProjectOwner"]
    conditions: ["github_access_token"]
  
  github:write:
    description: "Write to GitHub repositories"
    roles: ["ProjectContributor", "ProjectOwner"]
    conditions: ["github_access_token", "repository_access"]
  
  # Observability
  metrics:read:
    description: "View metrics and monitoring data"
    roles: ["ProjectViewer", "ProjectContributor", "ProjectOwner"]
    conditions: ["project_membership"]
  
  logs:read:
    description: "Access log data"
    roles: ["ProjectViewer", "ProjectContributor", "ProjectOwner"]
    conditions: ["project_membership", "log_retention"]
  
  alerts:manage:
    description: "Manage alerts and notifications"
    roles: ["ProjectOwner", "OrganizationAdmin"]
    conditions: ["project_ownership"]
```

## Data Security

### Encryption Strategy

```yaml
Encryption at Rest:
  Database:
    provider: "AWS RDS"
    encryption: "AES-256"
    key_management: "AWS KMS"
    key_rotation: "annual"
    backup_encryption: "enabled"
  
  S3 Storage:
    provider: "AWS S3"
    encryption: "AES-256"
    key_management: "AWS KMS"
    bucket_versioning: "enabled"
    access_logging: "enabled"
  
  Lambda Environment:
    provider: "AWS Lambda"
    encryption: "AES-256"
    key_management: "AWS KMS"
    environment_variables: "encrypted"
  
  EBS Volumes:
    provider: "AWS EBS"
    encryption: "AES-256"
    key_management: "AWS KMS"
    snapshot_encryption: "enabled"

Encryption in Transit:
  API Communication:
    protocol: "TLS 1.3"
    cipher_suites: "ECDHE-RSA-AES256-GCM-SHA384"
    certificate_authority: "AWS Certificate Manager"
    hsts_enabled: true
    certificate_transparency: true
  
  Internal Communication:
    protocol: "TLS 1.3"
    mutual_auth: true
    service_mesh: "AWS App Mesh"
    certificate_rotation: "monthly"
  
  Database Connections:
    protocol: "TLS 1.3"
    certificate_validation: "required"
    connection_encryption: "forced"
  
  Message Queues:
    provider: "AWS SQS"
    encryption: "AES-256"
    key_management: "AWS KMS"
    message_retention: "14 days"
```

### Key Management

```typescript
// AWS KMS Key Management
interface KeyManagementStrategy {
  masterKeys: {
    application: {
      keyId: 'arn:aws:kms:us-east-1:account:key/app-master-key';
      rotation: 'annual';
      usage: 'ENCRYPT_DECRYPT';
      policy: 'application-key-policy';
    };
    database: {
      keyId: 'arn:aws:kms:us-east-1:account:key/db-master-key';
      rotation: 'annual';
      usage: 'ENCRYPT_DECRYPT';
      policy: 'database-key-policy';
    };
    secrets: {
      keyId: 'arn:aws:kms:us-east-1:account:key/secrets-master-key';
      rotation: 'quarterly';
      usage: 'ENCRYPT_DECRYPT';
      policy: 'secrets-key-policy';
    };
  };
  
  dataKeys: {
    generation: 'on-demand';
    caching: 'enabled';
    cacheTtl: '1h';
    algorithm: 'AES-256';
  };
  
  keyPolicies: {
    leastPrivilege: true;
    crossAccount: false;
    auditLogging: true;
    keyUsageAuditing: true;
  };
}
```

### Secrets Management

```typescript
// AWS Secrets Manager Integration
interface SecretsManagementStrategy {
  secrets: {
    databaseCredentials: {
      secretId: 'skafu/database/credentials';
      rotation: 'monthly';
      autoRotation: true;
      rotationLambda: 'skafu-db-rotation';
    };
    apiKeys: {
      secretId: 'skafu/api/keys';
      rotation: 'quarterly';
      autoRotation: false;
      versionStaging: ['AWSCURRENT', 'AWSPENDING'];
    };
    githubTokens: {
      secretId: 'skafu/github/tokens';
      rotation: 'on-demand';
      autoRotation: false;
      encryption: 'KMS';
    };
  };
  
  accessPatterns: {
    lambda: 'IAM_ROLE';
    ecs: 'IAM_ROLE';
    rds: 'IAM_DATABASE_AUTHENTICATION';
    crossAccount: 'RESOURCE_POLICY';
  };
  
  monitoring: {
    accessLogging: true;
    unusedSecrets: 'alert';
    rotationFailures: 'alert';
    auditTrail: 'cloudtrail';
  };
}
```

## Network Security

### VPC Architecture

```yaml
VPC Configuration:
  Primary VPC:
    cidr: "10.0.0.0/16"
    availability_zones: 3
    nat_gateways: 3
    vpc_endpoints: ["S3", "DynamoDB", "KMS", "Secrets Manager"]
  
  Subnet Strategy:
    public_subnets:
      - "10.0.1.0/24"  # ALB, NAT Gateway
      - "10.0.2.0/24"  # ALB, NAT Gateway
      - "10.0.3.0/24"  # ALB, NAT Gateway
    
    private_subnets:
      - "10.0.11.0/24" # Application Layer
      - "10.0.12.0/24" # Application Layer
      - "10.0.13.0/24" # Application Layer
    
    database_subnets:
      - "10.0.21.0/24" # Database Layer
      - "10.0.22.0/24" # Database Layer
      - "10.0.23.0/24" # Database Layer

Security Groups:
  ALB Security Group:
    ingress:
      - port: 443
        protocol: TCP
        source: "0.0.0.0/0"
        description: "HTTPS from internet"
      - port: 80
        protocol: TCP
        source: "0.0.0.0/0"
        description: "HTTP redirect to HTTPS"
    egress:
      - port: 8080
        protocol: TCP
        source: "app-security-group"
        description: "Forward to application"
  
  Application Security Group:
    ingress:
      - port: 8080
        protocol: TCP
        source: "alb-security-group"
        description: "From ALB"
    egress:
      - port: 443
        protocol: TCP
        source: "0.0.0.0/0"
        description: "HTTPS to internet"
      - port: 5432
        protocol: TCP
        source: "db-security-group"
        description: "Database connection"
  
  Database Security Group:
    ingress:
      - port: 5432
        protocol: TCP
        source: "app-security-group"
        description: "From application"
    egress: []
```

### Web Application Firewall (WAF)

```yaml
WAF Configuration:
  AWS WAF v2:
    scope: "CLOUDFRONT"
    default_action: "ALLOW"
    
    rules:
      - name: "RateLimitRule"
        priority: 1
        action: "BLOCK"
        statement:
          rate_based_statement:
            limit: 2000
            aggregate_key_type: "IP"
            scope_down_statement:
              geo_match_statement:
                country_codes: ["US", "CA", "GB", "DE", "FR", "JP"]
      
      - name: "SQLInjectionRule"
        priority: 2
        action: "BLOCK"
        statement:
          managed_rule_group_statement:
            vendor_name: "AWS"
            name: "AWSManagedRulesKnownBadInputsRuleSet"
      
      - name: "XSSRule"
        priority: 3
        action: "BLOCK"
        statement:
          managed_rule_group_statement:
            vendor_name: "AWS"
            name: "AWSManagedRulesCommonRuleSet"
      
      - name: "BotControlRule"
        priority: 4
        action: "BLOCK"
        statement:
          managed_rule_group_statement:
            vendor_name: "AWS"
            name: "AWSManagedRulesBotControlRuleSet"
    
    logging:
      log_destination: "arn:aws:logs:us-east-1:account:log-group:waf-logs"
      redacted_fields: ["authorization", "cookie"]
```

## API Security

### API Gateway Security

```yaml
API Gateway Configuration:
  Security:
    authentication:
      - type: "AWS_IAM"
        description: "Service-to-service authentication"
      - type: "COGNITO_USER_POOLS"
        description: "User authentication"
      - type: "LAMBDA_AUTHORIZER"
        description: "Custom authorization logic"
    
    throttling:
      burst_limit: 5000
      rate_limit: 2000
      per_client_throttling: true
    
    validation:
      request_validation: true
      response_validation: true
      model_validation: true
    
    cors:
      allow_origins: ["https://app.skafu.dev"]
      allow_methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
      allow_headers: ["Content-Type", "Authorization", "X-Requested-With"]
      allow_credentials: true
      max_age: 86400
    
    logging:
      access_logging: true
      execution_logging: true
      log_level: "INFO"
      data_trace: false
```

### Input Validation

```typescript
// Request Validation Schema
interface RequestValidation {
  headers: {
    'content-type': {
      required: true;
      values: ['application/json'];
    };
    'authorization': {
      required: true;
      pattern: '^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_.+/=]*$';
    };
    'x-api-key': {
      required: false;
      pattern: '^[A-Za-z0-9]{32}$';
    };
  };
  
  body: {
    maxSize: '1MB';
    required: true;
    schema: 'request-schema.json';
  };
  
  queryParameters: {
    sanitization: true;
    maxLength: 100;
    encoding: 'URL';
  };
  
  pathParameters: {
    validation: true;
    pattern: '^[A-Za-z0-9-_]+$';
  };
}

// Response Security Headers
interface SecurityHeaders {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload';
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'";
  'X-Content-Type-Options': 'nosniff';
  'X-Frame-Options': 'DENY';
  'X-XSS-Protection': '1; mode=block';
  'Referrer-Policy': 'strict-origin-when-cross-origin';
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()';
}
```

## Compliance and Auditing

### Audit Logging

```yaml
Audit Configuration:
  AWS CloudTrail:
    enabled: true
    multi_region: true
    include_global_service_events: true
    is_multi_region_trail: true
    enable_log_file_validation: true
    
    event_selectors:
      - read_write_type: "All"
        include_management_events: true
        data_resources:
          - type: "AWS::S3::Object"
            values: ["arn:aws:s3:::skafu-*/*"]
          - type: "AWS::Lambda::Function"
            values: ["arn:aws:lambda:*:*:function:skafu-*"]
    
    insight_selectors:
      - insight_type: "ApiCallRateInsight"
      - insight_type: "ApiErrorRateInsight"
  
  Application Audit:
    events:
      - user_authentication
      - user_authorization
      - project_creation
      - project_modification
      - project_deletion
      - template_usage
      - ai_analysis_requests
      - github_integration_access
      - configuration_changes
      - security_events
    
    retention:
      cloudwatch_logs: "1 year"
      s3_archive: "7 years"
      compliance_archive: "permanent"
    
    alerting:
      suspicious_activity: "immediate"
      failed_authentication: "5 minutes"
      privilege_escalation: "immediate"
      data_access_anomaly: "15 minutes"
```

### Compliance Frameworks

```yaml
SOC 2 Type II:
  controls:
    - security_principle: "Implemented"
    - availability_principle: "Implemented"
    - processing_integrity: "Implemented"
    - confidentiality_principle: "Implemented"
    - privacy_principle: "Implemented"
  
  evidence:
    - access_control_matrix
    - encryption_documentation
    - incident_response_procedures
    - vulnerability_management
    - change_management_procedures
    - monitoring_and_logging
    - vendor_management
    - business_continuity_plan

ISO 27001:
  domains:
    - information_security_policies
    - organization_information_security
    - human_resource_security
    - asset_management
    - access_control
    - cryptography
    - physical_environmental_security
    - operations_security
    - communications_security
    - system_acquisition_development_maintenance
    - supplier_relationships
    - incident_management
    - business_continuity_management
    - compliance

GDPR:
  requirements:
    - lawful_basis_for_processing
    - consent_management
    - data_subject_rights
    - data_protection_by_design
    - data_protection_impact_assessments
    - data_breach_notification
    - privacy_notices
    - data_retention_policies
    - cross_border_data_transfers
    - vendor_data_processing_agreements
```

## Incident Response

### Security Event Classification

```yaml
Security Event Levels:
  Critical (P0):
    - Data breach
    - Ransomware attack
    - Privilege escalation
    - Service account compromise
    - Multi-factor authentication bypass
    response_time: "15 minutes"
    escalation: "immediate"
  
  High (P1):
    - Unauthorized access attempt
    - Malware detection
    - DDoS attack
    - Insider threat indicator
    - Compliance violation
    response_time: "1 hour"
    escalation: "within 2 hours"
  
  Medium (P2):
    - Policy violation
    - Suspicious user behavior
    - Failed authentication spike
    - Vulnerability exploitation attempt
    - Certificate expiration
    response_time: "4 hours"
    escalation: "within 24 hours"
  
  Low (P3):
    - Information gathering
    - Port scanning
    - Brute force attempts
    - Policy drift
    - Configuration anomaly
    response_time: "24 hours"
    escalation: "within 72 hours"
```

### Response Procedures

```yaml
Incident Response Workflow:
  Detection:
    - Automated monitoring alerts
    - User reports
    - Threat intelligence feeds
    - Security tool alerts
    - Audit log analysis
  
  Analysis:
    - Event correlation
    - Impact assessment
    - Root cause analysis
    - Threat attribution
    - Evidence collection
  
  Containment:
    - Isolate affected systems
    - Preserve evidence
    - Prevent lateral movement
    - Maintain business continuity
    - Communicate with stakeholders
  
  Eradication:
    - Remove malicious artifacts
    - Patch vulnerabilities
    - Update security controls
    - Strengthen monitoring
    - Implement additional safeguards
  
  Recovery:
    - Restore systems from clean backups
    - Validate system integrity
    - Monitor for reinfection
    - Gradual service restoration
    - User communication
  
  Lessons Learned:
    - Post-incident review
    - Process improvements
    - Control enhancements
    - Documentation updates
    - Training updates
```

## Security Monitoring

### Threat Detection

```yaml
Detection Mechanisms:
  AWS GuardDuty:
    enabled: true
    threat_intelligence: true
    malware_protection: true
    findings_publishing: "SecurityHub"
    
    detections:
      - reconnaissance_attacks
      - instance_compromise
      - account_compromise
      - bucket_compromise
      - malware_detection
      - cryptocurrency_mining
      - backdoor_communication
  
  AWS Security Hub:
    enabled: true
    auto_enable_standards: true
    standards:
      - "AWS Foundational Security Standard"
      - "CIS AWS Foundations Benchmark"
      - "PCI DSS"
    
    integrations:
      - GuardDuty
      - Inspector
      - Macie
      - Config
      - IAM Access Analyzer
  
  Custom Detection:
    failed_login_attempts:
      threshold: 5
      window: "5 minutes"
      action: "account_lockout"
    
    privilege_escalation:
      events: ["AssumeRole", "AttachUserPolicy", "CreateRole"]
      correlation: true
      action: "immediate_alert"
    
    data_access_anomaly:
      baseline: "30 days"
      threshold: "3 standard deviations"
      action: "investigation"
```

### Security Metrics

```yaml
Key Security Metrics:
  Authentication:
    - failed_login_rate
    - mfa_adoption_rate
    - session_duration
    - concurrent_sessions
    - password_strength_score
  
  Authorization:
    - privilege_escalation_attempts
    - unauthorized_access_attempts
    - role_assignment_changes
    - permission_modifications
    - policy_violations
  
  Data Protection:
    - encryption_coverage
    - data_classification_compliance
    - access_pattern_anomalies
    - data_retention_compliance
    - backup_integrity_score
  
  Incident Response:
    - mean_time_to_detection
    - mean_time_to_response
    - mean_time_to_recovery
    - incident_recurrence_rate
    - false_positive_rate
  
  Compliance:
    - control_effectiveness
    - audit_findings
    - compliance_score
    - policy_adherence
    - training_completion_rate
```

This comprehensive security architecture provides multiple layers of protection while maintaining usability and compliance requirements. The implementation follows AWS best practices and industry standards for enterprise security.