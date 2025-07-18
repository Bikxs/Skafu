# ADR-0003: CQRS with Event Sourcing and DynamoDB Event Store

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need to design a data architecture that supports complex business logic, provides complete audit trails, enables temporal queries, and scales with high read/write loads while maintaining consistency for command operations and optimized read models.

## Decision Drivers

* Need for complete audit trail of all system changes
* Requirement for complex business logic separation
* High read/write performance requirements
* Support for event replay and system recovery
* Regulatory compliance and audit requirements
* Need for optimized read models vs write models
* Integration with event-driven architecture

## Considered Options

* **Option 1**: Traditional CRUD with single database model
* **Option 2**: CQRS without event sourcing
* **Option 3**: CQRS with event sourcing using DynamoDB
* **Option 4**: CQRS with event sourcing using purpose-built event store
* **Option 5**: Event sourcing only (no CQRS separation)

## Decision Outcome

Chosen option: **"CQRS with event sourcing using DynamoDB"**, because it provides complete audit trails, excellent scalability, and integrates well with our AWS serverless architecture while leveraging Amplify Gen2 for optimized read models.

### Implementation Details

**Architecture Components**:

**Command Side (Write Model)**:
- **API Gateway**: REST endpoints for commands
- **Step Functions**: Command processing and validation
- **DynamoDB Event Store**: Immutable event storage
- **EventBridge**: Event publication for integration

**Query Side (Read Model)**:
- **Amplify Gen2**: Auto-generates AppSync GraphQL API
- **DynamoDB Read Models**: Optimized for query patterns (managed by Amplify)
- **Real-time Subscriptions**: WebSocket connections via AppSync
- **Data Projections**: Event-driven read model updates

**Event Store Schema (DynamoDB)**:
```
Primary Key: aggregateId (partition key)
Sort Key: eventSequence (sort key)
Attributes:
- eventId: uuid
- eventType: string
- eventData: JSON
- correlationId: uuid
- timestamp: ISO-8601
- version: string
- metadata: JSON
```

**Read Model Updates**:
```
EventBridge Event → Lambda Function → DynamoDB Read Model Update
                                  → AppSync Subscription Notification
```

### Data Flow Patterns

**Command Flow**:
1. Frontend sends command via API Gateway
2. Step Function validates and processes command
3. Step Function stores event in event store
4. Step Function publishes event to EventBridge
5. Event consumers update read models

**Query Flow**:
1. Frontend queries via Amplify Data API
2. AppSync resolves from optimized read models
3. Real-time updates via GraphQL subscriptions

### Consequences

**Good**:
* **Complete audit trail**: Every state change is preserved
* **Temporal queries**: Can reconstruct state at any point in time
* **Scalability**: Independent scaling of read and write operations
* **Performance**: Optimized read models for specific query patterns
* **Recovery**: System state can be rebuilt from events
* **Integration**: Events naturally integrate with event-driven architecture
* **Compliance**: Immutable audit log meets regulatory requirements
* **Real-time updates**: Automatic UI updates via subscriptions

**Bad**:
* **Complexity**: Higher conceptual and implementation complexity
* **Eventually consistent**: Read models may lag behind events
* **Storage overhead**: Events and read models require more storage
* **Event versioning**: Schema evolution requires careful planning
* **Query limitations**: Some queries may require multiple read models
* **Debugging complexity**: Distributed state reconstruction for debugging

## Domain Aggregate Design

### Project Aggregate
**Events**: `ProjectCreated`, `ServiceAdded`, `ServiceRemoved`, `ProjectConfigurationChanged`
**Read Models**: Project list, project details, service topology

### Template Aggregate  
**Events**: `TemplateUploaded`, `TemplateValidated`, `TemplateParametersChanged`
**Read Models**: Template catalog, template details, usage statistics

### User Aggregate
**Events**: `UserRegistered`, `UserProfileUpdated`, `UserPermissionsChanged`
**Read Models**: User profiles, permission matrix

## Event Store Operations

**Append Events**: New events always appended (never updated)
**Read Events**: Query by aggregate ID with optional sequence range
**Snapshots**: Periodic snapshots for performance optimization
**Archival**: Old events archived to S3 for long-term retention

## Read Model Projections

**Implementation**: Lambda functions triggered by EventBridge events
**Idempotency**: Event sequence numbers prevent duplicate processing
**Error Handling**: Failed projections retry with exponential backoff
**Monitoring**: CloudWatch metrics for projection lag and errors

## Implementation Guidelines

1. **Aggregate Boundaries**: Design aggregates around business consistency boundaries
2. **Event Naming**: Use past-tense, business-meaningful event names
3. **Event Immutability**: Events are immutable once stored
4. **Projection Design**: Create read models optimized for specific query patterns
5. **Error Recovery**: Design for replay and recovery scenarios

## More Information

* [CQRS Pattern Documentation](https://docs.microsoft.com/en-us/azure/architecture/patterns/cqrs)
* [Event Sourcing Pattern](https://martinfowler.com/eaaDev/EventSourcing.html)
* [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
* Related ADRs: ADR-0002 (Event-Driven Architecture), ADR-0004 (Amplify Gen2)