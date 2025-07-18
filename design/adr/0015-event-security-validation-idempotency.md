# ADR-0015: Event Security with Validation and Idempotency

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need to ensure the integrity and reliability of our event-driven architecture by preventing malformed events, duplicate processing, and unauthorized event publishing while maintaining high performance and system resilience.

## Decision Drivers

* Prevent duplicate event processing in distributed system
* Ensure event schema compliance across all publishers
* Maintain data integrity in event sourcing system
* Support for event replay and recovery scenarios
* Integration with existing EventBridge infrastructure
* Observability for event processing failures
* Performance requirements for high-volume event processing

## Considered Options

* **Option 1**: No event validation or idempotency controls
* **Option 2**: Event schema validation only
* **Option 3**: Idempotency controls only
* **Option 4**: Combined schema validation and idempotency
* **Option 5**: Custom event processing middleware

## Decision Outcome

Chosen option: **"Combined schema validation and idempotency"**, because it provides comprehensive event integrity while supporting our event sourcing requirements and maintaining system resilience against failures and replays.

### Implementation Details

**Event Schema Validation**:

**EventBridge Schema Registry**:
- Central schema registry for all event types
- AsyncAPI format for schema definitions
- Version control for schema evolution
- Automatic validation before event routing

**Schema Definition Example**:
```yaml
# AsyncAPI schema for ProjectCreated event
asyncapi: '2.6.0'
info:
  title: Project Management Events
  version: '1.0.0'

channels:
  project.created:
    description: Project creation events
    publish:
      message:
        name: ProjectCreated
        title: Project Created Event
        contentType: application/json
        payload:
          type: object
          required: [eventId, correlationId, timestamp, version, data]
          properties:
            eventId:
              type: string
              format: uuid
              description: Unique event identifier
            correlationId:
              type: string
              format: uuid
              description: Request correlation ID
            timestamp:
              type: string
              format: date-time
              description: Event creation timestamp
            version:
              type: string
              pattern: '^\\d+\\.\\d+$'
              description: Event schema version
            source:
              type: string
              enum: [project-management, template-management, ai-integration]
            eventType:
              type: string
              const: ProjectCreated
            data:
              type: object
              required: [projectId, name, description]
              properties:
                projectId:
                  type: string
                  format: uuid
                name:
                  type: string
                  minLength: 1
                  maxLength: 100
                description:
                  type: string
                  maxLength: 500
              additionalProperties: false
```

**Idempotency Implementation**:

**DynamoDB Idempotency Table**:
```
Table: EventIdempotency
Primary Key: eventId (String)
Attributes:
- processedAt: timestamp
- processorId: string (consumer identification)
- status: string (processing, completed, failed)
- ttl: number (24 hours for cleanup)
- correlationId: string (for debugging)
- retryCount: number
```

**Idempotency Check Pattern**:
```python
# Lambda function pattern for idempotency
import boto3
from datetime import datetime, timedelta

def check_and_mark_processed(event_id, processor_id):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('EventIdempotency')
    
    try:
        # Conditional put - fails if eventId already exists
        table.put_item(
            Item={
                'eventId': event_id,
                'processedAt': datetime.utcnow().isoformat(),
                'processorId': processor_id,
                'status': 'processing',
                'ttl': int((datetime.utcnow() + timedelta(hours=24)).timestamp())
            },
            ConditionExpression='attribute_not_exists(eventId)'
        )
        return True  # First time processing
    except ClientError as e:
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return False  # Already processed
        raise
```

**Step Functions Integration**:
```json
{
  "Comment": "Event Processing with Idempotency",
  "StartAt": "CheckIdempotency",
  "States": {
    "CheckIdempotency": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "check-event-idempotency",
        "Payload": {
          "eventId.$": "$.detail.eventId",
          "processorId": "project-processor"
        }
      },
      "Next": "IsNewEvent"
    },
    "IsNewEvent": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.Payload.isNew",
          "BooleanEquals": true,
          "Next": "ProcessEvent"
        }
      ],
      "Default": "SkipProcessing"
    },
    "ProcessEvent": {
      "Type": "Task",
      "Resource": "arn:aws:states:::dynamodb:updateItem",
      "Parameters": {
        "TableName": "ProjectReadModel",
        "Key": {
          "projectId": {"S.$": "$.detail.data.projectId"}
        },
        "UpdateExpression": "SET #name = :name, #desc = :desc",
        "ExpressionAttributeNames": {
          "#name": "name",
          "#desc": "description"
        },
        "ExpressionAttributeValues": {
          ":name": {"S.$": "$.detail.data.name"},
          ":desc": {"S.$": "$.detail.data.description"}
        }
      },
      "Next": "MarkCompleted"
    },
    "MarkCompleted": {
      "Type": "Task",
      "Resource": "arn:aws:states:::dynamodb:updateItem",
      "Parameters": {
        "TableName": "EventIdempotency",
        "Key": {
          "eventId": {"S.$": "$.detail.eventId"}
        },
        "UpdateExpression": "SET #status = :status",
        "ExpressionAttributeNames": {
          "#status": "status"
        },
        "ExpressionAttributeValues": {
          ":status": {"S": "completed"}
        }
      },
      "End": true
    },
    "SkipProcessing": {
      "Type": "Pass",
      "Result": "Event already processed",
      "End": true
    }
  }
}
```

### Event Structure Standardization

**Mandatory Event Fields**:
```json
{
  "eventId": "uuid-v4",
  "correlationId": "uuid-v4", 
  "timestamp": "2025-01-18T10:30:00Z",
  "version": "1.0",
  "source": "domain.service",
  "eventType": "DomainEventName",
  "data": {...},
  "metadata": {
    "userId": "user-id",
    "userAgent": "application-info",
    "requestId": "api-gateway-request-id"
  }
}
```

**Correlation ID Propagation**:
- Generated at API Gateway entry point
- Propagated through all Step Functions
- Included in all published events
- Used for distributed tracing

### Error Handling

**Schema Validation Failures**:
- Invalid events sent to Dead Letter Queue
- Error events published to ErrorBus
- Detailed validation errors logged to CloudWatch

**Idempotency Failures**:
- DynamoDB operation failures logged
- Retry logic with exponential backoff
- Manual intervention procedures documented

**Processing Failures**:
- Failed events remain in "processing" state
- Cleanup job marks stale processing events as failed
- Failed events can be manually reprocessed

### Consequences

**Good**:
* **Data integrity**: Guaranteed exactly-once processing semantics
* **Schema compliance**: All events conform to defined schemas
* **System resilience**: Handles duplicate events gracefully
* **Debugging support**: Correlation IDs enable distributed tracing
* **Recovery capability**: Failed events can be identified and reprocessed
* **Performance**: DynamoDB provides fast idempotency checks
* **Observability**: Rich metrics on event processing and failures

**Bad**:
* **Complexity**: Additional infrastructure for idempotency management
* **Latency**: Extra DynamoDB check adds ~5-10ms per event
* **Storage costs**: Idempotency table requires additional storage
* **Maintenance**: Schema registry and idempotency logic require maintenance
* **False negatives**: Network failures may cause duplicate processing
* **Cleanup required**: TTL-based cleanup of idempotency records

## Schema Evolution Strategy

**Backward Compatibility**:
- New optional fields only
- No removal of existing fields
- Type changes through versioned events

**Version Management**:
- Semantic versioning for schemas
- Multiple schema versions supported simultaneously
- Migration path for breaking changes

**Testing**:
- Schema validation in CI/CD pipeline
- Event replay testing with new schemas
- Compatibility testing across versions

## Monitoring and Alerting

**Key Metrics**:
- Event validation failure rate
- Duplicate event detection rate
- Idempotency check latency
- Schema registry health

**Alerts**:
- High validation failure rate (>1%)
- Idempotency table errors
- Schema registry unavailability
- Processing lag indicators

## Implementation Guidelines

1. **Event Design**: Use business-meaningful event names and data
2. **Schema Strictness**: Prefer strict schemas with clear validation rules
3. **Correlation Tracking**: Always include correlation IDs
4. **Error Recovery**: Design for replay and recovery scenarios
5. **Testing**: Comprehensive testing of duplicate event scenarios

## More Information

* [EventBridge Schema Registry](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-schemas.html)
* [AsyncAPI Specification](https://www.asyncapi.com/)
* [Idempotency Patterns](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/)
* Related ADRs: ADR-0002 (Event-Driven Architecture), ADR-0003 (Event Sourcing), ADR-0010 (Error Bus)