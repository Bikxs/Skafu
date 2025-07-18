# ADR-0005: Shared Application Resources

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need to decide how to organize AWS resources across microservices - whether each service should have its own isolated resources or share common infrastructure components like authentication, event buses, and storage.

## Decision Drivers

* Need for consistent authentication across all services
* Cost optimization for shared infrastructure
* Operational simplicity and reduced management overhead
* Security and access control requirements
* Service isolation vs integration trade-offs
* Deployment and environment management complexity

## Considered Options

* **Option 1**: Completely isolated resources per microservice
* **Option 2**: Shared application-level resources with service-specific data
* **Option 3**: Hybrid approach with some shared, some isolated resources
* **Option 4**: Multi-tenant infrastructure with logical separation
* **Option 5**: Separate environments with shared resources within each environment

## Decision Outcome

Chosen option: **"Shared application-level resources with service-specific data"**, because it provides the best balance of operational simplicity, cost efficiency, and security while enabling easier cross-service integration.

### Implementation Details

**Shared Resources (Application Level)**:

**Authentication & Authorization**:
- **Single Cognito User Pool**: Shared across all microservices
- **App Clients**: Service-specific app clients with appropriate scopes
- **User Groups**: Role-based groups (Admin, Developer, Viewer)
- **Identity Pool**: For federated authentication if needed

**Event Infrastructure**:
- **Primary EventBridge Bus**: All domain events and inter-service communication
- **ErrorBus**: Centralized error event collection and monitoring
- **Event Rules**: Service-specific rules for event routing
- **Dead Letter Queues**: Shared DLQ infrastructure per service

**Storage**:
- **S3 Bucket**: Single bucket with prefix-based organization
  - `/templates/` - Jinja2 templates
  - `/artifacts/` - Generated code and packages  
  - `/logs/` - Application logs and audit trails
  - `/backups/` - System backups
- **Bucket Policies**: IAM-based access control per service prefix

**Monitoring & Observability**:
- **CloudWatch Log Groups**: Shared log groups with service prefixes
- **CloudWatch Metrics**: Shared custom metrics namespace
- **X-Ray**: Single tracing configuration
- **SNS Topics**: Shared notification infrastructure

**Service-Specific Resources**:

**Data Storage**:
- **DynamoDB Tables**: Each service manages its own tables
- **Event Store**: Service-specific tables for event sourcing
- **Read Models**: Service-optimized tables via Amplify Gen2

**Compute**:
- **Lambda Functions**: Service-specific functions
- **Step Functions**: Service-specific workflows
- **API Gateway**: Service-specific API stages

### Resource Organization Pattern

```
Application Level (Shared):
├── cognito-user-pool
├── eventbridge-main-bus
├── eventbridge-error-bus  
├── s3-bucket-application
├── cloudwatch-logs
└── sns-notifications

Service Level (Project Management):
├── dynamodb-project-events
├── dynamodb-project-read-models
├── lambda-project-functions
├── stepfunctions-project-workflows
└── apigateway-project-api

Service Level (Template Management):
├── dynamodb-template-events
├── dynamodb-template-read-models
├── lambda-template-functions
├── stepfunctions-template-workflows
└── apigateway-template-api
```

### Access Control Strategy

**IAM Roles per Service**:
- Service-specific execution roles with minimal permissions
- Cross-service permissions only for event publishing/consuming
- Shared resource access through resource-based policies

**Cognito Integration**:
- Single user pool but service-specific authorization logic
- JWT tokens validated by each service's API Gateway authorizer
- Custom claims for fine-grained permissions

**S3 Bucket Policies**:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "TemplateServiceAccess",
      "Effect": "Allow",
      "Principal": {"AWS": "arn:aws:iam::account:role/TemplateServiceRole"},
      "Action": ["s3:GetObject", "s3:PutObject"],
      "Resource": "arn:aws:s3:::skafu-application/templates/*"
    }
  ]
}
```

### Consequences

**Good**:
* **Operational simplicity**: Single Cognito user pool, single event bus to manage
* **Cost optimization**: Shared infrastructure reduces per-service costs
* **Consistent authentication**: Users authenticate once across all services
* **Event integration**: Natural cross-service communication via shared EventBridge
* **Monitoring consolidation**: Centralized logging and metrics collection
* **Backup simplification**: Single backup strategy for shared resources

**Bad**:
* **Blast radius**: Shared resource failure affects all services
* **Coupling**: Services become dependent on shared infrastructure
* **Scaling limitations**: Shared resources may become bottlenecks
* **Security considerations**: Cross-service access requires careful IAM design
* **Environment isolation**: More complex to isolate dev/staging/prod
* **Migration complexity**: Harder to extract services to separate systems

## Environment Strategy

**Development Environment**:
- Shared resources with "dev" prefix/suffix
- Cost-optimized configurations
- Relaxed security for development velocity

**Staging Environment**:
- Production-like shared resources
- Full integration testing capabilities
- Production security configurations

**Production Environment**:
- High-availability shared resources
- Multi-AZ deployments for critical components
- Enhanced monitoring and alerting

## Implementation Guidelines

1. **Resource Naming**: Clear naming convention with environment and purpose
2. **IAM Principle of Least Privilege**: Minimal cross-service permissions
3. **Monitoring**: Comprehensive monitoring of shared resource health
4. **Backup Strategy**: Regular backups of shared resource configurations
5. **Disaster Recovery**: Documented procedures for shared resource recovery

## Migration Considerations

**Future Service Extraction**:
- Design service boundaries to minimize shared resource dependencies
- Document cross-service dependencies for future refactoring
- Consider service mesh patterns for eventual microservice independence

**Scaling Strategies**:
- Monitor shared resource utilization
- Plan for resource splitting when bottlenecks emerge
- Design event patterns to support future service isolation

## More Information

* [AWS Multi-Service Architecture Patterns](https://aws.amazon.com/microservices/)
* [Cognito Multi-Service Integration](https://docs.aws.amazon.com/cognito/)
* [EventBridge Cross-Service Patterns](https://docs.aws.amazon.com/eventbridge/)
* Related ADRs: ADR-0001 (AWS Serverless), ADR-0002 (Event-Driven), ADR-0016 (Secrets Manager)