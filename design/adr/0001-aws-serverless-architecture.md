# ADR-0001: AWS Serverless Architecture with SAM

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need to choose an infrastructure architecture for the Skafu microservices scaffolding application that can scale efficiently, minimize operational overhead, and integrate well with AWS services for AI capabilities and event processing.

## Decision Drivers

* Need rapid development and deployment cycles
* Requirement for auto-scaling based on demand
* Cost optimization for variable workloads
* Integration with AWS AI services (Claude Code SDK via Bedrock)
* Minimal infrastructure management overhead
* Support for event-driven architecture
* Need for consistent deployment across environments

## Considered Options

* **Option 1**: Traditional EC2-based microservices with containers
* **Option 2**: AWS Serverless with SAM framework
* **Option 3**: Kubernetes-based container orchestration
* **Option 4**: AWS App Runner for containerized services

## Decision Outcome

Chosen option: **"AWS Serverless with SAM framework"**, because it provides the best balance of operational simplicity, cost efficiency, and AWS service integration for our use case.

### Implementation Details

**Architecture Components**:
- **AWS SAM**: Single SAM template with nested stacks per microservice
- **Lambda Functions**: Python-based for complex logic (minimal usage)
- **Step Functions Express**: Primary workflow orchestration
- **API Gateway**: REST endpoints for commands and observability
- **EventBridge**: Event bus for inter-service communication
- **DynamoDB**: Event store for event sourcing (via Amplify Gen2)
- **S3**: Template storage and static assets
- **Cognito**: Authentication and user management

**Deployment Strategy**:
- Single root SAM template
- Nested stacks for each microservice domain
- Environment-specific parameter files
- Infrastructure as Code for all resources

### Consequences

**Good**:
* **Zero infrastructure management**: No servers to patch or maintain
* **Automatic scaling**: Pay-per-use with instant scaling
* **Cost optimization**: No idle resource costs
* **Fast cold starts**: Step Functions reduce Lambda cold start impact
* **AWS service integration**: Native integration with EventBridge, Cognito, etc.
* **Development velocity**: Rapid iteration and deployment cycles
* **Consistent environments**: Infrastructure as Code ensures consistency

**Bad**:
* **Vendor lock-in**: Heavy dependence on AWS services
* **Learning curve**: Team needs AWS serverless expertise
* **Debugging complexity**: Distributed system debugging challenges
* **Service limits**: AWS service quotas may require management
* **Cold start latency**: Potential delays for infrequent Lambda invocations

## Implementation Guidelines

1. **Configuration over Code**: Prefer Step Functions and AWS service integrations over custom Lambda code
2. **Shared Resources**: Single EventBridge, Cognito UserPool, and S3 bucket across all services
3. **Observability First**: CloudWatch integration for all components
4. **Security by Default**: IAM roles with minimal required permissions

## More Information

* [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
* [AWS Well-Architected Serverless Lens](https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/)
* Related ADRs: ADR-0002 (Event-Driven Architecture), ADR-0007 (Step Functions Over Lambda)