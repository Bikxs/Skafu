# ADR-0002: Event-Driven Architecture with EventBridge

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need to design communication patterns between microservices that support loose coupling, scalability, and eventually consistent systems while enabling complex business workflows and audit trails.

## Decision Drivers

* Need for loose coupling between microservices
* Support for event sourcing and audit trails
* Asynchronous processing capabilities
* Integration with AWS services
* Observability and debugging requirements
* Support for event replay and recovery
* Need for multiple event consumers per event type

## Considered Options

* **Option 1**: Direct API calls between services
* **Option 2**: Message queues (SQS) for service communication
* **Option 3**: Amazon EventBridge for event-driven architecture
* **Option 4**: Apache Kafka for event streaming
* **Option 5**: AWS SNS for pub/sub messaging

## Decision Outcome

Chosen option: **"Amazon EventBridge for event-driven architecture"**, because it provides native AWS integration, powerful routing capabilities, and excellent observability while supporting our event sourcing requirements.

### Implementation Details

**Event Bus Architecture**:
- **Main EventBridge Bus**: All domain events and cross-service communication
- **ErrorBus**: Separate EventBridge bus for error events and monitoring
- **Custom Event Routing**: Rules-based routing to appropriate consumers
- **Schema Registry**: EventBridge schema registry for event validation

**Event Flow Pattern**:
```
Command → API Gateway → Step Function → EventBridge PutEvents → Consumers
```

**Event Structure**:
```json
{
  "eventId": "uuid",
  "correlationId": "uuid", 
  "timestamp": "ISO-8601",
  "version": "1.0",
  "source": "domain.service",
  "eventType": "ProjectCreated",
  "data": {...},
  "metadata": {...}
}
```

**Event Categories**:
- **Domain Events**: Business-relevant state changes
- **Integration Events**: Cross-service coordination
- **System Events**: Infrastructure and operational events
- **Error Events**: Failures and exceptions (sent to ErrorBus)

### Consequences

**Good**:
* **Loose coupling**: Services can evolve independently
* **Scalability**: Automatic scaling of event processing
* **Replay capability**: Events can be replayed for recovery
* **Multiple consumers**: Same event can trigger multiple actions
* **Native AWS integration**: Works seamlessly with Lambda, Step Functions
* **Schema validation**: Built-in event schema validation
* **Observability**: CloudWatch integration for monitoring
* **Cost effective**: Pay per published event

**Bad**:
* **Eventual consistency**: No immediate consistency guarantees
* **Complexity**: Debugging distributed event flows can be challenging
* **Message ordering**: No guaranteed event ordering without additional design
* **Error handling**: Requires sophisticated error handling patterns
* **Vendor lock-in**: AWS-specific event bus implementation

## Event Types by Domain

### Project Management
- `ProjectCreated`, `ProjectUpdated`, `ProjectDeleted`
- `ServiceAdded`, `ServiceRemoved`, `ServiceUpdated`

### Template Management  
- `TemplateUploaded`, `TemplateUpdated`, `TemplateDeleted`
- `TemplateValidated`, `TemplateRendered`

### GitHub Integration
- `RepositoryCreated`, `PullRequestCreated`, `DeploymentCompleted`
- `BranchProtectionAdded`, `WebhookConfigured`

### AI Integration
- `RequirementAnalyzed`, `CodeGenerated`, `ReviewCompleted`
- `ConversationStarted`, `ConversationCompleted`

### Error Events (ErrorBus)
- `StepFunctionFailed`, `LambdaError`, `ValidationFailed`
- `IntegrationError`, `TimeoutError`

## Event Sourcing Integration

Events serve dual purposes:
1. **Communication**: Inter-service messaging via EventBridge
2. **State Storage**: Persisted to DynamoDB event store for audit and replay

## Implementation Guidelines

1. **Idempotency**: All event consumers must be idempotent
2. **Schema Evolution**: Use versioned events for backward compatibility  
3. **Error Handling**: Failed events go to ErrorBus with correlation context
4. **Observability**: Include correlation IDs for distributed tracing
5. **Validation**: Use EventBridge Schema Registry for event validation

## More Information

* [Amazon EventBridge Documentation](https://docs.aws.amazon.com/eventbridge/)
* [Event-Driven Architecture Patterns](https://aws.amazon.com/event-driven-architecture/)
* Related ADRs: ADR-0003 (CQRS Event Sourcing), ADR-0010 (Error Bus), ADR-0015 (Event Security)