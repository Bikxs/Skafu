# ADR-0001: Core Serverless Event-Driven Architecture

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team  
**Supersedes**: ADR-0001 (AWS Serverless), ADR-0002 (Event-Driven), ADR-0005 (Shared Resources)

## Context and Problem Statement

We need to design a foundational architecture for the Skafu microservices scaffolding application that provides:
- Scalable infrastructure with minimal operational overhead
- Event-driven communication patterns for loose coupling
- Shared resources across multiple microservices
- Cost optimization for variable workloads
- Integration with AWS services for AI capabilities

## Decision Drivers

* Need rapid development and deployment cycles
* Requirement for auto-scaling based on demand
* Support for loose coupling between microservices
* Need for event sourcing and audit trails
* Integration with AWS AI services (Claude Code SDK via Bedrock)
* Minimal infrastructure management overhead
* Cost optimization for variable workloads
* Support for multiple event consumers per event type

## Considered Options

### Infrastructure Options
* Traditional EC2-based microservices with containers
* AWS Serverless with SAM framework
* Kubernetes-based container orchestration
* AWS App Runner for containerized services

### Communication Options
* Direct API calls between services
* Message queues (SQS) for service communication
* Amazon EventBridge for event-driven architecture
* Apache Kafka for event streaming

### Resource Sharing Options
* Duplicate resources per microservice
* Shared resources with cross-service access
* Hybrid approach with selective sharing

## Decision Outcome

Chosen options:
1. **AWS Serverless with SAM framework** for infrastructure
2. **Amazon EventBridge** for event-driven architecture
3. **Shared application resources** for common services

This combination provides the best balance of operational simplicity, cost efficiency, scalability, and AWS service integration.

### Implementation Details

**Core Architecture Components**:

```yaml
# Root SAM Template Structure
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Parameters:
  Environment:
    Type: String
    AllowedValues: [development, staging, production]

Resources:
  # Shared Infrastructure Stack
  SharedInfrastructure:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: shared/infrastructure/shared-resources.yaml
      Parameters:
        Environment: !Ref Environment
  
  # Domain Stacks
  ObservabilityDomain:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: domains/observability/template.yaml
      Parameters:
        EventBusName: !GetAtt SharedInfrastructure.Outputs.EventBusName
        ErrorBusName: !GetAtt SharedInfrastructure.Outputs.ErrorBusName
        UserPoolId: !GetAtt SharedInfrastructure.Outputs.UserPoolId
```

**Shared Resources**:
- **Single EventBridge Bus**: All domain events and cross-service communication
- **Error EventBridge Bus**: Centralized error handling and monitoring
- **Cognito User Pool**: Shared authentication across all services
- **API Gateway**: Single entry point with /api/v1 prefix
- **S3 Buckets**: Shared storage for templates and artifacts
- **CloudWatch Resources**: Centralized logging and monitoring
- **AWS Secrets Manager**: Shared secrets and configuration

**Event-Driven Architecture**:

**Event Flow Pattern**:
```
Command → API Gateway → Step Function → EventBridge PutEvents → Event Consumers
                              ↓
                        Event Store (DynamoDB)
```

**Event Structure Standard**:
```json
{
  "eventId": "uuid",
  "correlationId": "uuid", 
  "timestamp": "ISO-8601",
  "version": "1.0",
  "source": "domain.service",
  "eventType": "ResourceCreated",
  "data": {
    // Event-specific data
  },
  "metadata": {
    "userId": "string",
    "requestId": "string"
  }
}
```

**Event Categories**:
- **Domain Events**: Business-relevant state changes
- **Integration Events**: Cross-service coordination
- **System Events**: Infrastructure and operational events
- **Error Events**: Failures and exceptions (sent to ErrorBus)

**Serverless Components**:
- **AWS SAM**: Single SAM template with nested stacks per microservice
- **Lambda Functions**: Python-based for complex logic (minimal usage)
- **Step Functions Express**: Primary workflow orchestration
- **API Gateway**: REST endpoints for commands and observability
- **DynamoDB**: Event store and read models for CQRS
- **S3**: Template storage and static assets

### Deployment Strategy

1. **Infrastructure as Code**: All resources defined in SAM templates
2. **Nested Stacks**: Domain separation with shared resource access
3. **Environment Management**: Parameter files for dev/staging/prod
4. **CI/CD Integration**: GitHub Actions for automated deployments

### Resource Sharing Pattern

**Shared Resources Benefits**:
- Reduced AWS service limits consumption
- Simplified cross-service authentication
- Centralized monitoring and logging
- Cost optimization through resource reuse
- Consistent configuration across services

**Access Control**:
- IAM roles with minimal required permissions
- Resource policies for cross-service access
- Cognito groups for user authorization
- API Gateway resource policies

### Event Processing Guidelines

1. **Idempotency**: All event consumers must be idempotent
2. **Schema Evolution**: Use versioned events for backward compatibility
3. **Error Handling**: Failed events go to ErrorBus with correlation context
4. **Observability**: Include correlation IDs for distributed tracing
5. **Replay Capability**: Events can be replayed for recovery

### Consequences

**Good**:
* **Zero infrastructure management**: No servers to patch or maintain
* **Automatic scaling**: Pay-per-use with instant scaling
* **Cost optimization**: No idle resource costs, shared resource efficiency
* **Loose coupling**: Services can evolve independently via events
* **Audit trail**: Complete event history for compliance
* **AWS service integration**: Native integration with AWS services
* **Development velocity**: Rapid iteration and deployment cycles
* **Observability**: Centralized monitoring and error tracking

**Bad**:
* **Vendor lock-in**: Heavy dependence on AWS services
* **Learning curve**: Team needs AWS serverless and event-driven expertise
* **Debugging complexity**: Distributed system debugging challenges
* **Service limits**: AWS service quotas require management
* **Cold start latency**: Potential delays for infrequent invocations
* **Eventual consistency**: No immediate consistency guarantees
* **Message ordering**: No guaranteed event ordering without additional design

## Implementation Guidelines

1. **Configuration over Code**: Prefer Step Functions and AWS service integrations over custom Lambda code
2. **Event-First Design**: Design around events rather than synchronous APIs
3. **Security by Default**: IAM roles with minimal required permissions
4. **Observability First**: CloudWatch integration for all components
5. **Cost Awareness**: Monitor and optimize for cost efficiency

## More Information

* [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
* [Amazon EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)
* [AWS Well-Architected Serverless Lens](https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/)
* [Event-Driven Architecture Patterns](https://aws.amazon.com/event-driven-architecture/)
* Related ADRs: ADR-0002 (CQRS Event Sourcing), ADR-0003 (Observability), ADR-0004 (Security), ADR-0005 (Step Functions)