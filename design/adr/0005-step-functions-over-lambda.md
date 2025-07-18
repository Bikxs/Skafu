# ADR-0005: Step Functions Over Lambda Code (Configuration Over Code)

**Status**: 🟢 Accepted  
**Date**: 2025-01-18  
**Deciders**: Development Team

## Context and Problem Statement

We need to implement command processing workflows that are maintainable, observable, and can handle complex business logic while minimizing custom code maintenance overhead and maximizing system reliability.

## Decision Drivers

* Preference for configuration over custom code
* Need for visual workflow representation
* Requirement for robust error handling and retry logic
* Integration with AWS services (EventBridge, DynamoDB, S3)
* Observability and debugging requirements
* Maintainability by team members with varying skill levels
* Cost optimization for workflow execution

## Considered Options

* **Option 1**: Lambda functions for all command processing
* **Option 2**: Step Functions Express Workflows with minimal Lambda
* **Option 3**: Hybrid approach with both Step Functions and Lambda
* **Option 4**: AWS AppFlow for data processing workflows
* **Option 5**: Custom workflow engine in Lambda

## Decision Outcome

Chosen option: **"Step Functions Express Workflows with minimal Lambda"**, because it provides excellent observability, built-in error handling, visual workflow representation, and reduces custom code maintenance while offering superior integration with AWS services.

### Implementation Details

**Step Functions Usage Strategy**:
- **Express Workflows**: For high-volume, short-duration command processing
- **Fire-and-forget Pattern**: Workflows complete after publishing events
- **Native Integrations**: Prefer AWS service integrations over Lambda calls
- **Lambda Only For**: Complex logic requiring Claude SDK or custom processing

**Workflow Patterns**:

**Standard Command Flow**:
```json
{
  "Comment": "Project Creation Workflow",
  "StartAt": "ValidateInput",
  "States": {
    "ValidateInput": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "validate-project-input"
      },
      "Next": "StoreEvent"
    },
    "StoreEvent": {
      "Type": "Task", 
      "Resource": "arn:aws:states:::dynamodb:putItem",
      "Parameters": {
        "TableName": "EventStore",
        "Item": {
          "aggregateId": {"S.$": "$.projectId"},
          "eventType": {"S": "ProjectCreated"},
          "eventData": {"S.$": "States.JsonToString($.projectData)"}
        }
      },
      "Next": "PublishEvent"
    },
    "PublishEvent": {
      "Type": "Task",
      "Resource": "arn:aws:states:::events:putEvents",
      "Parameters": {
        "Entries": [{
          "Source": "project-management",
          "DetailType": "ProjectCreated",
          "Detail.$": "$"
        }]
      },
      "End": true
    }
  }
}
```

**Error Handling Pattern**:
```json
{
  "ValidateInput": {
    "Type": "Task",
    "Resource": "arn:aws:states:::lambda:invoke",
    "Retry": [
      {
        "ErrorEquals": ["States.TaskFailed"],
        "IntervalSeconds": 2,
        "MaxAttempts": 3,
        "BackoffRate": 2.0
      }
    ],
    "Catch": [
      {
        "ErrorEquals": ["States.ALL"],
        "Next": "PublishError",
        "ResultPath": "$.error"
      }
    ]
  },
  "PublishError": {
    "Type": "Task",
    "Resource": "arn:aws:states:::events:putEvents",
    "Parameters": {
      "Entries": [{
        "EventBusName": "ErrorBus",
        "Source": "step-functions",
        "DetailType": "WorkflowFailed",
        "Detail": {
          "workflowName.$": "$$.StateMachine.Name",
          "executionArn.$": "$$.Execution.Name",
          "error.$": "$.error",
          "correlationId.$": "$.correlationId"
        }
      }]
    },
    "End": true
  }
}
```

### Lambda Usage Guidelines

**Use Lambda Only For**:
- Claude Code SDK integration
- Complex data transformations
- Third-party API integrations (GitHub)
- Custom validation logic that can't be expressed in Step Functions
- Cryptographic operations

**Avoid Lambda For**:
- Simple data manipulation (use Step Functions intrinsic functions)
- AWS service integrations (use direct integrations)
- Basic validation (use JSON Schema validation)
- Event publishing (use EventBridge integration)
- Data storage operations (use DynamoDB integration)

### Consequences

**Good**:
* **Visual workflows**: Step Functions console provides clear workflow visualization
* **Built-in error handling**: Retry, catch, and timeout logic without custom code
* **Observability**: Detailed execution history and CloudWatch integration
* **Reduced maintenance**: Less custom code to test and maintain
* **AWS service integration**: Direct integrations without wrapper code
* **Cost optimization**: Express workflows are cost-effective for high volume
* **Parallel execution**: Built-in parallel processing capabilities
* **State management**: Automatic state passing between workflow steps

**Bad**:
* **Learning curve**: Team needs to understand Step Functions DSL
* **Debugging limitations**: Limited debugging compared to code-based solutions
* **Vendor lock-in**: AWS-specific workflow definitions
* **Complex logic limitations**: Some complex logic still requires Lambda
* **Cold start overhead**: Still affected by Lambda cold starts for custom functions
* **State size limits**: 256KB limit on state data size

## Workflow Design Patterns

### Command Processing Workflows
Each domain has standardized workflow patterns:

1. **Input Validation**: JSON Schema or Lambda validation
2. **Business Logic**: Step Functions orchestration + minimal Lambda
3. **Event Storage**: Direct DynamoDB integration
4. **Event Publishing**: Direct EventBridge integration
5. **Error Handling**: Standardized error workflow

### Integration Workflows
For external service integration:

1. **Authentication**: Secrets Manager integration
2. **API Calls**: Lambda for complex API interactions
3. **Response Processing**: Step Functions data transformation
4. **Event Publishing**: Results as domain events

### Monitoring and Alerting
- CloudWatch metrics for all workflow executions
- Failed execution alerts to ErrorBus
- Performance metrics for optimization
- Cost tracking per workflow type

## Implementation Guidelines

1. **Workflow Naming**: Descriptive names following domain-verb pattern
2. **State Naming**: Clear, business-meaningful state names
3. **Error Handling**: Every workflow must handle errors gracefully
4. **Documentation**: Comment field in every workflow definition
5. **Testing**: Integration tests for complete workflow execution

## Performance Considerations

**Express Workflows**:
- Start execution time: ~25ms
- State transition time: ~25ms per state
- Maximum execution time: 5 minutes
- Cost: $1.00 per 1 million requests

**Optimization Strategies**:
- Minimize number of states
- Use parallel execution where possible
- Combine simple operations into single states
- Cache frequently accessed data

## More Information

* [AWS Step Functions Documentation](https://docs.aws.amazon.com/step-functions/)
* [Step Functions Best Practices](https://docs.aws.amazon.com/step-functions/latest/dg/bp-welcome.html)
* [Express Workflows Guide](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-express-workflows.html)
* Related ADRs: ADR-0001 (AWS Serverless), ADR-0002 (Event-Driven Architecture), ADR-0010 (Error Bus)